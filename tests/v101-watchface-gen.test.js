// ==================== v101-watchface-gen.test.js — #101 AI 生成锁屏表盘参数化生成器（v10.49 · R110 加餐） ====================
//
// 覆盖：
//   · aosp/watchface-generator.js 纯逻辑真跑：常量（KEY/维度注册表冻结/缺省脸冻结）/
//     mulberry32 确定性（同 seed 同序列）/ generateFaceConfig（确定性复现 + 锁定维度
//     保留 + 越界锁定忽略 + 垃圾 seed 兜底 0）/ sanitizeConfig 三护栏固定序
//     （outline→weight 500 / glow→非 tight / gradient→非 offset，修正账在录）/
//     buildCustomFaceStyle（字重/字距/hue Monet 派生/三装饰层片段）/ buildCustomFaceHTML
//     （small 单行 / large 三布局态 / data-test 锚）/ dimensionValueLabel 反查 /
//     normalizeGenState（逐维钳制越界回落 + locks 合法键值过滤）/ serialize codec 往返
//   · createWatchfaceGenStore store 工厂（storage 注入隔离单测）：reroll 锁定保留 +
//     未锁定重掷 + 持久化 + 重初始化往返 + toggleLock 开合 + generateWithSeed 直调面 +
//     getConfig/getLocks 快照副本
//   · 接线锚：clock-faces.js（第 5 脸注册 + buildFaceHTML custom 分支委托 +
//     GEN_DEFAULT_CONFIG 兜底）/ lock-screen.js（customConfig 喂入）+ aod-ui.js（同款）/
//     theme-engine.js（面板容器 + reroll 链 + 锁定 chip 链 + custom 预览喂参）
//   · 回归锚：v20 注册表重锚（五脸在册）+ LOCK_CLOCK_FACE_KEY 真源键未改写 +
//     setLockClockFace 桥链未触碰
//   · 版本锚：pkg 10.49.0

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WATCHFACE_GEN_KEY, WATCHFACE_GEN_SCHEMA_VERSION, GEN_DIMENSIONS, GEN_DEFAULT_CONFIG,
  GEN_CONSTRAINTS, mulberry32, generateFaceConfig, sanitizeConfig,
  buildCustomFaceStyle, buildCustomFaceHTML, dimensionValueLabel,
  normalizeGenState, serializeGenState, createWatchfaceGenStore,
} from '../ios-desktop/js/aosp/watchface-generator.js';
import { CLOCK_FACES, buildFaceHTML } from '../ios-desktop/js/aosp/clock-faces.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');
const CF = read('ios-desktop/js/aosp/clock-faces.js');
const LS = read('ios-desktop/js/lock-screen.js');
const AOD = read('ios-desktop/js/aod-ui.js');
const TE = read('ios-desktop/js/theme-engine.js');
const PKG = JSON.parse(read('package.json'));

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('v10.49 #101 常量与维度注册表', () => {
  it('KEY/schema/五维度注册表冻结（layout/weight/tracking/hueShift/decor）', () => {
    expect(WATCHFACE_GEN_KEY).toBe('ios-desktop:watchface-gen-v1');
    expect(WATCHFACE_GEN_SCHEMA_VERSION).toBe(1);
    expect(GEN_DIMENSIONS.map((d) => d.key)).toEqual(['layout', 'weight', 'tracking', 'hueShift', 'decor']);
    expect(Object.isFrozen(GEN_DIMENSIONS)).toBe(true);
    GEN_DIMENSIONS.forEach((d) => expect(Object.isFrozen(d)).toBe(true));
  });
  it('GEN_DEFAULT_CONFIG 冻结缺省脸（seed 0 确定性）', () => {
    expect(GEN_DEFAULT_CONFIG).toEqual({ seed: 0, layout: 'stacked', weight: 700, tracking: 'normal', hueShift: 0, decor: 'none' });
    expect(Object.isFrozen(GEN_DEFAULT_CONFIG)).toBe(true);
  });
});

describe('v10.49 #101 mulberry32 / generateFaceConfig 确定性', () => {
  it('同 seed 同序列（可复现基座）+ 不同 seed 异序列', () => {
    const a1 = mulberry32(42); const a2 = mulberry32(42); const b = mulberry32(43);
    const seqA1 = [a1(), a1(), a1()]; const seqA2 = [a2(), a2(), a2()]; const seqB = [b(), b(), b()];
    expect(seqA1).toEqual(seqA2);
    expect(seqA1).not.toEqual(seqB);
    seqA1.forEach((v) => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); });
  });
  it('generateFaceConfig：同 seed 同 locked 同输出 + 无锁定全维随机产出合法值', () => {
    const c1 = generateFaceConfig(123, {});
    const c2 = generateFaceConfig(123, {});
    expect(c1).toEqual(c2);
    for (const dim of GEN_DIMENSIONS) {
      expect(dim.options.indexOf(c1[dim.key])).toBeGreaterThanOrEqual(0);
    }
    expect(c1.seed).toBe(123);
  });
  it('锁定维度保留 + 越界锁定忽略（走随机）+ 垃圾 seed 兜底 0', () => {
    const locked = generateFaceConfig(7, { weight: 900, layout: 'inline', junk: 'x', tracking: 'bogus' });
    expect(locked.weight).toBe(900);
    expect(locked.layout).toBe('inline');
    expect(locked.tracking).not.toBe('bogus'); // 越界锁定忽略 → 随机合法值
    expect(GEN_DIMENSIONS.find((d) => d.key === 'tracking').options.indexOf(locked.tracking)).toBeGreaterThanOrEqual(0);
    expect(generateFaceConfig('abc', {}).seed).toBe(0);
    expect(generateFaceConfig(-5, {}).seed).toBe(0);
  });
});

describe('v10.49 #101 sanitizeConfig 可用性护栏（固定序 C1→C2→C3）', () => {
  it('C1 outline+细字 → weight 500；C2 glow+tight → normal；C3 gradient+offset → stacked', () => {
    const r1 = sanitizeConfig({ seed: 1, layout: 'stacked', weight: 300, tracking: 'normal', hueShift: 0, decor: 'outline' });
    expect(r1.config.weight).toBe(500);
    expect(r1.fixes).toEqual([GEN_CONSTRAINTS[0]]);
    const r2 = sanitizeConfig({ seed: 1, layout: 'stacked', weight: 700, tracking: 'tight', hueShift: 0, decor: 'glow' });
    expect(r2.config.tracking).toBe('normal');
    expect(r2.fixes).toEqual([GEN_CONSTRAINTS[1]]);
    const r3 = sanitizeConfig({ seed: 1, layout: 'offset', weight: 700, tracking: 'normal', hueShift: 0, decor: 'gradient' });
    expect(r3.config.layout).toBe('stacked');
    expect(r3.fixes).toEqual([GEN_CONSTRAINTS[2]]);
  });
  it('合法组合零修正 + 生成面跨护栏（generateFaceConfig 产物恒过护栏）', () => {
    expect(sanitizeConfig({ seed: 1, layout: 'stacked', weight: 700, tracking: 'normal', hueShift: 0, decor: 'none' }).fixes).toEqual([]);
    for (let s = 0; s < 60; s++) {
      const cfg = generateFaceConfig(s, {});
      const re = sanitizeConfig(cfg);
      expect(re.fixes).toEqual([]); // 生成面已过护栏 → 再洗零修正
    }
  });
});

describe('v10.49 #101 buildCustomFaceStyle / buildCustomFaceHTML', () => {
  it('样式片段：字重/字距/Monet hue 派生零裸色/三装饰层', () => {
    expect(buildCustomFaceStyle({ weight: 900, tracking: 'wide', hueShift: 210, decor: 'none' }))
      .toContain('font-weight:900');
    expect(buildCustomFaceStyle({ weight: 700, tracking: 'tight', hueShift: 0, decor: 'none' }))
      .toContain('letter-spacing:-0.02em');
    expect(buildCustomFaceStyle({ weight: 700, tracking: 'normal', hueShift: 210, decor: 'none' }))
      .toContain('hsl(calc(var(--md-h,215) + 210)'); // Monet 派生（wellbeing ringColor 同款零裸色）
    expect(buildCustomFaceStyle({ weight: 700, tracking: 'normal', hueShift: 0, decor: 'outline' }))
      .toContain('-webkit-text-stroke');
    expect(buildCustomFaceStyle({ weight: 700, tracking: 'normal', hueShift: 0, decor: 'glow' }))
      .toContain('text-shadow');
    expect(buildCustomFaceStyle({ weight: 700, tracking: 'normal', hueShift: 0, decor: 'gradient' }))
      .toContain('background-clip:text');
  });
  it('HTML：small 单行 / large 三布局态 / data-test 锚 / 垃圾 config 兜底缺省脸', () => {
    const d = new Date(2026, 0, 1, 10, 8);
    expect(buildCustomFaceHTML(GEN_DEFAULT_CONFIG, { date: d, size: 'small' })).toContain('10:08');
    const largeStacked = buildCustomFaceHTML({ ...GEN_DEFAULT_CONFIG, layout: 'stacked' }, { date: d, size: 'large' });
    expect(largeStacked).toContain('flex-direction:column');
    expect(buildCustomFaceHTML({ ...GEN_DEFAULT_CONFIG, layout: 'inline' }, { date: d, size: 'large' })).toContain('10:08');
    expect(buildCustomFaceHTML({ ...GEN_DEFAULT_CONFIG, layout: 'offset' }, { date: d, size: 'large' })).toContain('translateX(18px)');
    expect(buildCustomFaceHTML(GEN_DEFAULT_CONFIG, { date: d, size: 'small' })).toContain('data-test="watchface-custom"');
    expect(buildCustomFaceHTML(null, { date: d, size: 'small' })).toContain('10:08'); // 兜底缺省脸
  });
  it('dimensionValueLabel 反查（面板 chip 用户可见名）', () => {
    expect(dimensionValueLabel('weight', 900)).toBe('字重 900');
    expect(dimensionValueLabel('hueShift', 30)).toBe('色相 +30°');
    expect(dimensionValueLabel('layout', 'stacked')).toBe('双行堆叠');
    expect(dimensionValueLabel('tracking', 'wide')).toBe('宽松');
    expect(dimensionValueLabel('decor', 'glow')).toBe('光晕');
    expect(dimensionValueLabel('junk', 'x')).toBe('x');
  });
});

describe('v10.49 #101 normalize / codec / store 工厂', () => {
  it('normalize：逐维钳制越界回落 + locks 合法键值过滤 + 垃圾兜底', () => {
    const n = normalizeGenState({ config: { seed: 5, layout: 'bogus', weight: 999, decor: 'glow' }, locks: { weight: 700, decor: 'bogus' } });
    expect(n.config.layout).toBe('stacked'); // 越界回落缺省
    expect(n.config.weight).toBe(700); // 999 不在取值域 → 缺省
    expect(n.config.decor).toBe('glow');
    expect(n.locks).toEqual({ weight: 700 }); // 非法锁定剔除
    expect(normalizeGenState('garbage{').config).toEqual(GEN_DEFAULT_CONFIG);
    expect(normalizeGenState([1]).locks).toEqual({});
  });
  it('serialize→normalize 往返一致', () => {
    const s = { version: 1, config: { seed: 9, layout: 'inline', weight: 500, tracking: 'wide', hueShift: 180, decor: 'outline' }, locks: { layout: 'inline' } };
    expect(normalizeGenState(JSON.parse(serializeGenState(s)))).toEqual(s);
  });
  it('store：reroll 锁定保留 + 未锁定重掷 + 持久化往返 + toggleLock 开合', () => {
    const st = memStorage();
    const store = createWatchfaceGenStore({ storage: st });
    store.generateWithSeed(100);
    const cfg0 = store.getConfig();
    store.toggleLock('weight', true);
    store.toggleLock('layout', true);
    expect(store.getLocks()).toEqual({ weight: cfg0.weight, layout: cfg0.layout });
    store.reroll();
    const cfg1 = store.getConfig();
    expect(cfg1.weight).toBe(cfg0.weight); // 锁定保留
    expect(cfg1.layout).toBe(cfg0.layout);
    expect(cfg1.seed).not.toBe(cfg0.seed); // 未锁定域重掷（新 seed）
    const store2 = createWatchfaceGenStore({ storage: st }); // 重载往返
    expect(store2.getConfig()).toEqual(cfg1);
    expect(store2.getLocks()).toEqual({ weight: cfg0.weight, layout: cfg0.layout });
    store2.toggleLock('weight', false);
    expect(store2.getLocks()).toEqual({ layout: cfg0.layout });
    expect(store2.getConfig().weight).toBe(cfg0.weight); // 解锁不改变当前值，仅影响下次重掷
  });
  it('store：generateWithSeed 直调面确定性 + 损坏存档走默认', () => {
    const store = createWatchfaceGenStore({ storage: memStorage() });
    store.generateWithSeed(42);
    expect(store.getConfig()).toEqual(generateFaceConfig(42, {}));
    const st2 = memStorage();
    st2.setItem(WATCHFACE_GEN_KEY, 'corrupted{{');
    expect(createWatchfaceGenStore({ storage: st2 }).getConfig()).toEqual(GEN_DEFAULT_CONFIG);
  });
});

describe('v10.49 #101 接线锚', () => {
  it('clock-faces.js：第 5 脸注册 + buildFaceHTML custom 分支委托 + 兜底缺省脸', () => {
    expect(CLOCK_FACES.map((f) => f.id)).toEqual(['double', 'expressive', 'analog', 'minimal', 'custom']);
    expect(CF).toContain("import { buildCustomFaceHTML, GEN_DEFAULT_CONFIG } from './watchface-generator.js';");
    expect(CF).toContain("buildCustomFaceHTML(opts.customConfig || GEN_DEFAULT_CONFIG, { date: d, size })");
    expect(CF).toContain("{ id: 'custom', label: 'AI 生成'");
    const html = buildFaceHTML(CLOCK_FACES[4], { date: new Date(2026, 0, 1, 10, 8), size: 'small' });
    expect(html).toContain('data-face="custom"');
    expect(html).toContain('data-test="watchface-custom"');
  });
  it('lock-screen.js + aod-ui.js：customConfig 喂入（opts 显式数据流）', () => {
    expect(LS).toContain("import { watchfaceGenStore } from './aosp/watchface-generator.js';");
    expect(LS).toContain('customConfig: watchfaceGenStore.getConfig()');
    expect(AOD).toContain("import { watchfaceGenStore } from './aosp/watchface-generator.js';");
    expect(AOD).toContain('customConfig: watchfaceGenStore.getConfig()');
  });
  it('theme-engine.js：面板容器 + reroll 链（生成即应用 custom 脸）+ 锁定 chip 链 + custom 预览喂参', () => {
    expect(TE).toContain("import { watchfaceGenStore, GEN_DIMENSIONS, dimensionValueLabel } from './aosp/watchface-generator.js';");
    expect(TE).toContain('id="watchfaceGenPanel"');
    expect(TE).toContain('data-test="watchface-gen-btn"');
    expect(TE).toContain('watchfaceGenStore.toggleLock(key, !wasLocked)');
    expect(TE).toContain("watchfaceGenStore.reroll()");
    expect(TE).toContain("window.__lockClockFaces.setFace('custom')");
    expect(TE).toContain("customConfig: f.id === 'custom' ? watchfaceGenStore.getConfig() : null");
  });
});

describe('v10.49 #101 回归锚（既有面零触碰）', () => {
  it('v20 注册表重锚在位（五脸）+ LOCK_CLOCK_FACE_KEY 真源键未改写', () => {
    expect(CF).toContain("LOCK_CLOCK_FACE_KEY = 'ios-desktop:lock-clock-face-v1'");
    expect(CF).toContain("CLOCK_FONT_KEY = 'ios-desktop:clock-font-v1'");
  });
  it('lock-screen setLockClockFace 桥链未触碰（theme-engine 零 import 解耦纪律保持）', () => {
    expect(LS).toContain('export function setLockClockFace(id, persist = true)');
    expect(TE).toContain('window.__lockClockFaces.setFace(id)');
  });
});

describe('v10.49 #101 版本锚', () => {
  it('pkg 10.49.0（roll-version 单一真源）', () => {
    expect(PKG.version).toBe('10.49.0');
  });
});
