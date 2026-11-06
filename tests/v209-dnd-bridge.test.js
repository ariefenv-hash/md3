// ==================== v209-dnd-bridge.test.js — #209 宿主 DND 桥 + 睡眠模式静音+灰度（v10.22 · R106 窗） ====================
//
// 覆盖：
//   · aosp/zen-mode.js 纯逻辑真跑：externalSources 外部来源登记表（session-only）/ clearExternalSources
//     manual override 逃生通道 / externalEffects ZenDeviceEffects 位并集 / isZenActive
//     manual ∪ external 扩容 / normalize 载入清洗（跨会话残留不复活）/ overlay 灰度位合成
//   · 接线锚：quick-settings.js setDndExternalSource + applyDndEffective 生效面抽离 +
//     DND_SET/DND_GET 宿主消息面 + __zenDebug 观测面 + dnd-changed 翻转事件；main.js
//     注入模板 dnd face（set/get）+ dnd-changed → app-bus dnd/changed 广播桥；pkg-sdk.js 双面统一
//   · bedtime.mjs：进/出窗边沿 dndSet('bedtime',{grayscale:true}) + 禁用路径兜底释放（窗内被关不悬挂）
//   · 回归锚：#198 既有语义零触碰（setManual 单一 manual 写点、overlay id、dnd-mode-active 保持）

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ZEN_DEVICE_EFFECT, ZEN_STORAGE_KEY,
  deviceEffectsOverlayStyle, defaultZenState, normalizeZenState, createZenStore,
  zenStore, isZenActive,
} from '../ios-desktop/js/aosp/zen-mode.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZEN = readFileSync(join(ROOT, 'ios-desktop/js/aosp/zen-mode.js'), 'utf-8');
const QS = readFileSync(join(ROOT, 'ios-desktop/js/quick-settings.js'), 'utf-8');
const MAIN = readFileSync(join(ROOT, 'ios-desktop/js/main.js'), 'utf-8');
const PKG = readFileSync(join(ROOT, 'ios-desktop/js/pkg-sdk.js'), 'utf-8');
const BED = readFileSync(join(ROOT, 'ios-desktop/apps/clock-app/bedtime.mjs'), 'utf-8');

// —— 内存 storage 桩（v198 同款，工厂隔离测试用） ——
function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

const D = ZEN_DEVICE_EFFECT;

describe('v10.22 #209 externalSources 外部来源登记表（工厂隔离）', () => {
  it('登记 {bedtime,{effects}} 形态落表；manualActive 保持 false（外部源零写 manual——手动意图零覆盖）', () => {
    const s = createZenStore({ storage: memStorage() });
    s.setExternalSource('bedtime', { active: true, effects: D.GRAYSCALE });
    expect(s.getState().externalSources).toEqual({ bedtime: { effects: D.GRAYSCALE } });
    expect(s.getState().manualActive).toBe(false);
    expect(s.getState().ruleDriven).toBe(false);
  });
  it('注销清条目；空串/null id no-op 不落表', () => {
    const s = createZenStore({ storage: memStorage() });
    s.setExternalSource('bedtime', { active: true, effects: 1 });
    s.setExternalSource('bedtime', { active: false, effects: 0 });
    expect(s.getState().externalSources).toEqual({});
    s.setExternalSource('', { active: true, effects: 1 });
    s.setExternalSource(null, { active: true, effects: 1 });
    expect(s.getState().externalSources).toEqual({});
  });
  it('externalEffects 位并集：两源两位 → OR；注销其一 → 减位', () => {
    const s = createZenStore({ storage: memStorage() });
    s.setExternalSource('bedtime', { active: true, effects: D.GRAYSCALE });
    s.setExternalSource('other-app', { active: true, effects: D.NIGHT_LIGHT });
    expect(s.externalEffects()).toBe(D.GRAYSCALE | D.NIGHT_LIGHT);
    s.setExternalSource('other-app', { active: false });
    expect(s.externalEffects()).toBe(D.GRAYSCALE);
  });
  it('clearExternalSources 全清（manual override 逃生通道语义：一次关断不悬挂任何来源）', () => {
    const s = createZenStore({ storage: memStorage() });
    s.setExternalSource('bedtime', { active: true, effects: D.GRAYSCALE });
    s.setExternalSource('focus', { active: true, effects: 0 });
    s.clearExternalSources();
    expect(s.getState().externalSources).toEqual({});
    expect(s.externalEffects()).toBe(0);
  });
  it('session-only：外部来源不持久化（persist→新工厂 load 登记表空）；用户 deviceEffects 位照常持久化', () => {
    const st = memStorage();
    const s = createZenStore({ storage: st });
    s.setExternalSource('bedtime', { active: true, effects: D.GRAYSCALE });
    s.setDeviceEffects(D.DIM_WALLPAPER);
    s.persist();
    const s2 = createZenStore({ storage: st });
    expect(s2.getState().externalSources).toEqual({});
    expect(s2.getState().deviceEffects).toBe(D.DIM_WALLPAPER);
  });
  it('normalizeZenState：存档内 externalSources 垃圾数据载入即清洗（跨会话残留不复活「看不见的勿扰」）', () => {
    const raw = { ...defaultZenState(), externalSources: { bedtime: { effects: 1 } }, version: 1 };
    const out = normalizeZenState(raw);
    expect(out.externalSources).toEqual({});
    // 合法存档不受影响
    const ok = normalizeZenState({ version: 1, manualActive: true });
    expect(ok.manualActive).toBe(true);
  });
});

describe('v10.22 #209 isZenActive 扩容：manual ∪ external（单例真跑，用后复位）', () => {
  beforeEach(() => {
    zenStore.clearExternalSources();
    zenStore.setManual(false);
  });
  afterAll(() => {
    zenStore.clearExternalSources();
    zenStore.setManual(false);
  });
  it('外部源激活 + manual false → 生效 true（AOSP 规则激活期 zen 保持）；注销 → false', () => {
    zenStore.setExternalSource('bedtime', { active: true, effects: 0 });
    expect(isZenActive()).toBe(true);
    zenStore.setExternalSource('bedtime', { active: false });
    expect(isZenActive()).toBe(false);
  });
  it('manual true → 生效 true；进窗不触碰 manual 真值（出窗回落 manual 语义的前置）', () => {
    zenStore.setManual(true);
    zenStore.setExternalSource('bedtime', { active: true, effects: 0 });
    expect(isZenActive()).toBe(true);
    expect(zenStore.getState().manualActive).toBe(true); // 外部源零写
    zenStore.setExternalSource('bedtime', { active: false });
    expect(isZenActive()).toBe(true); // 出窗回落 manual 真值——手动开启零覆盖
  });
  it('逃生通道链：外部激活 → clearExternalSources（模拟 setDndActive(false) 手动关）→ 生效 false', () => {
    zenStore.setExternalSource('bedtime', { active: true, effects: D.GRAYSCALE });
    expect(isZenActive()).toBe(true);
    zenStore.clearExternalSources(); // setDndActive(false) 的手动 override 清登记步
    expect(isZenActive()).toBe(false);
  });
});

describe('v10.22 #209 overlay 灰度位合成（用户位 ∪ 外部位，同一 #zen-device-effects overlay）', () => {
  it('外部 GRAYSCALE 单位 → backdrop-filter grayscale(1)（#198 通道复用零新渲染层）', () => {
    const st = deviceEffectsOverlayStyle(D.GRAYSCALE);
    expect(st.backdropFilter).toBe('grayscale(1)');
  });
  it('用户 NIGHT_LIGHT ∪ 外部 GRAYSCALE → 同帧双效（暖罩 + 灰度并存）', () => {
    const st = deviceEffectsOverlayStyle(D.NIGHT_LIGHT | D.GRAYSCALE);
    expect(st.backdropFilter).toBe('grayscale(1)');
    expect(st.background).toBe('rgba(255,147,41,0.14)');
  });
  it('位并集去重：用户已配 GRAYSCALE + 外部 GRAYSCALE → 单一 grayscale(1) 不叠加', () => {
    const st = deviceEffectsOverlayStyle(D.GRAYSCALE | D.GRAYSCALE);
    expect(st.backdropFilter).toBe('grayscale(1)');
  });
});

describe('v10.22 #209 接线锚（源码锚）', () => {
  it('quick-settings.js：setDndExternalSource 出口 + applyDndEffective 生效面抽离 + 灰度并集消费', () => {
    expect(QS).toContain('export function setDndExternalSource');
    expect(QS).toContain('function applyDndEffective');
    expect(QS).toContain('zenStore.externalEffects()'); // overlay 位并集消费
    expect(QS).toContain('zenStore.clearExternalSources()'); // 手动关清登记（逃生通道）
    expect(QS).toContain("dnd-changed"); // 翻转事件（main.js 桥接 app-bus）
  });
  it('quick-settings.js：DND_SET/DND_GET 宿主消息面 + __zenDebug 观测面', () => {
    expect(QS).toContain("d.type === 'DND_SET'");
    expect(QS).toContain("d.type === 'DND_GET'");
    expect(QS).toContain("type: 'DND_RESULT'");
    expect(QS).toContain('ZEN_DEVICE_EFFECT.GRAYSCALE'); // {grayscale:true} 语义别名落位
    expect(QS).toContain('externalSources: () => zenStore.getState().externalSources');
    expect(QS).toContain('setExternal: (id, on, effects)');
  });
  it('main.js：注入模板 dnd face（set/get）+ dnd-changed → app-bus dnd/changed 广播桥', () => {
    expect(MAIN).toContain("type: 'DND_SET'");
    expect(MAIN).toContain("type: 'DND_GET'");
    expect(MAIN).toContain("=== 'DND_RESULT'"); // main.js 为接收端（宿主回包在 quick-settings.js）
    expect(MAIN).toContain("broadcastSystem('dnd/changed'");
    expect(MAIN).toContain("addEventListener('dnd-changed'");
    expect(MAIN).toContain('initAppBus'); // 总线基座仍在位
  });
  it('pkg-sdk.js：__system.dnd 双面统一（v7.19 notify 同款纪律）', () => {
    expect(PKG).toContain('__system.dnd');
    expect(PKG).toContain("type: 'DND_SET'");
    expect(PKG).toContain("bridgeRequest('DND_GET', 'DND_RESULT'");
  });
  it('bedtime.mjs：进/出窗边沿 dndSet（source=bedtime + grayscale 别名）+ 禁用路径兜底释放', () => {
    expect(BED).toContain("s.dnd.set(on,'bedtime',{grayscale:true})");
    expect(BED).toContain('dndSet(true);'); // 进窗边沿（静音）
    expect(BED).toContain('dndSet(false);'); // 出窗边沿 + 禁用路径（解除）
    expect(BED).toContain('if(btInWindow){btInWindow=false;dndSet(false);}'); // 窗内被关不悬挂
  });
  it('zen-mode.js：isZenActive 联合判定源锚（manual ∪ externalSources）', () => {
    expect(ZEN).toMatch(/!!s\.manualActive \|\| Object\.keys\(s\.externalSources/);
  });
});

describe('v10.22 #209 回归锚（#198 既有语义零触碰）', () => {
  it('setManual 仍是 manual 唯一真源写点；dnd-mode-active / zen-device-effects 语义保持', () => {
    expect(QS).toContain('zenStore.setManual(!!active)');
    expect(QS).toContain("dnd-mode-active");
    expect(QS).toContain('zen-device-effects');
  });
  it('evalRules 自动关断路径不再误触手动写点（applyDndEffective 直用）', () => {
    expect(QS).toMatch(/if \(res\.changed\) applyDndEffective\(\{ silent: true \}\)/);
    expect(QS).not.toMatch(/setDndActive\(zenStore\.getState\(\)\.manualActive/); // 旧写法退役
  });
  it('外部来源仅 session：persist 全态序列化可含运行时登记，但 load 必清洗（normalize 外部来源恒空）', () => {
    const st = memStorage();
    const s = createZenStore({ storage: st });
    s.setExternalSource('bedtime', { active: true, effects: 1 });
    s.setDeviceEffects(D.GRAYSCALE);
    s.persist();
    const saved = JSON.parse(st.getItem(ZEN_STORAGE_KEY));
    expect(saved.deviceEffects).toBe(D.GRAYSCALE);
    const reloaded = createZenStore({ storage: st });
    expect(reloaded.getState().externalSources).toEqual({}); // session-only 契约在清洗端
    expect(isZenActive()).toBe(false); // 重载后不复活登记表（单例不受污染）
  });
});
