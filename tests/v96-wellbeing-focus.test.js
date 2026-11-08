// ==================== v96-wellbeing-focus.test.js — #96 三期 应用计时器 + 专注模式（v10.81 · R110） ====================
//
// 覆盖：
//   · aosp/wellbeing-focus.js 纯逻辑真跑：常量（KEY/schema/限时上限 1440/清单上限 64）/
//     clampLimitMin 归一（垃圾/负数/布尔→0=floor/上限钳制）/ normalizeWellbeingState
//     （limits 逐项钳制零值剔除 + focusApps 去空去重保序截断 + focusActive 严格 true）/
//     setAppLimit 纯函数（0=清除）/ setFocusApps 纯函数 / setFocusActive 纯函数 /
//     pausedReason 判定链（focus 优先于 timer / 无限时 null / 垃圾 appId null / 布尔防御）/
//     remainingMs（无限时 -1 哨兵 / 正剩余 / 到限 0）/ codec 往返 + 垃圾兜底
//   · createWellbeingStore store 工厂（storage 注入隔离单测）：persist 落盘 / 重初始化往返 /
//     focusApps 快照副本防外部 mutation / limitOf / limits 快照
//   · 接线锚：app-window.js（静态导入 + usedTodayMs 口径 + openApp 前置守卫 + 到期沿
//     usedBeforeClose 闭账前快照 + __wellbeingStore 观测面）/ settings.js（页 36 三期
//     双卡锚 + 开关 + 注记三模式分层裁决）/ settings-wellbeing.js（渲染面 + 档位轮转 +
//     change 委托链）
//   · 回归锚：usageStore 真源键未改写 / focus.js 番茄钟语义未触碰（FOCUS_MIN 25/
//     BREAK_MIN 5）/ profiles.js 快照键未改写 / appnotif 页 35 零触碰
//   · 版本锚：pkg 10.81.0

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WELLBEING_FOCUS_KEY, WELLBEING_FOCUS_SCHEMA_VERSION, APP_LIMIT_MAX_MIN,
  FOCUS_APPS_MAX, WB_APP_ID_MAX, WELLBEING_FOCUS_DEFAULTS,
  clampLimitMin, normalizeWellbeingState,
  setAppLimit, setFocusApps, setFocusActive,
  pausedReason, remainingMs,
  parseWellbeingState, serializeWellbeingState, createWellbeingStore,
} from '../ios-desktop/js/aosp/wellbeing-focus.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');
const WIN = read('ios-desktop/js/app-window.js');
const SET = read('ios-desktop/js/apps/settings.js');
const WB = read('ios-desktop/js/apps/settings-wellbeing.js');
const PKG = JSON.parse(read('package.json'));

/** 极简 storage 桩（注入隔离单测） */
function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('v10.81 #96 三期 常量与冻结形态', () => {
  it('KEY/schema/限时上限/清单上限冻结常量', () => {
    expect(WELLBEING_FOCUS_KEY).toBe('ios-desktop:wellbeing-focus-v1');
    expect(WELLBEING_FOCUS_SCHEMA_VERSION).toBe(1);
    expect(APP_LIMIT_MAX_MIN).toBe(1440);
    expect(FOCUS_APPS_MAX).toBe(64);
    expect(WB_APP_ID_MAX).toBe(64);
  });
  it('WELLBEING_FOCUS_DEFAULTS 冻结默认形态（limits/focusApps/focusActive）', () => {
    expect(WELLBEING_FOCUS_DEFAULTS).toEqual({ version: 1, limits: {}, focusApps: [], focusActive: false });
    expect(Object.isFrozen(WELLBEING_FOCUS_DEFAULTS)).toBe(true);
  });
});

describe('v10.81 #96 三期 clampLimitMin / normalize 归一', () => {
  it('clampLimitMin：垃圾/负数/布尔→0；小数 floor；超上限钳制 1440；1440 放行', () => {
    expect(clampLimitMin('abc')).toBe(0);
    expect(clampLimitMin(-5)).toBe(0);
    expect(clampLimitMin(true)).toBe(0); // Number(true)=1 不得漂移
    expect(clampLimitMin(false)).toBe(0);
    expect(clampLimitMin(NaN)).toBe(0);
    expect(clampLimitMin(15.9)).toBe(15);
    expect(clampLimitMin(9999)).toBe(1440);
    expect(clampLimitMin(1440)).toBe(1440);
  });
  it('normalize：字符串 JSON / 垃圾对象 / 数组 → 默认形态', () => {
    const ok = normalizeWellbeingState(JSON.stringify({ limits: { a: 15 }, focusApps: ['a'], focusActive: true }));
    expect(ok).toEqual({ version: 1, limits: { a: 15 }, focusApps: ['a'], focusActive: true });
    expect(normalizeWellbeingState('garbage{')).toEqual({ version: 1, limits: {}, focusApps: [], focusActive: false });
    expect(normalizeWellbeingState([1, 2])).toEqual({ version: 1, limits: {}, focusApps: [], focusActive: false });
    expect(normalizeWellbeingState(null).focusActive).toBe(false);
  });
  it('normalize：limits 逐项钳制（0/非法剔除）+ focusApps 去空去重保序 + 截断 64 + focusActive 严格 true', () => {
    const n = normalizeWellbeingState({ limits: { a: 15, b: 0, c: 'junk', d: 9999 }, focusApps: ['x', '', 'x', 'y'], focusActive: 'yes' });
    expect(n.limits).toEqual({ a: 15, d: 1440 });
    expect(n.focusApps).toEqual(['x', 'y']);
    expect(n.focusActive).toBe(false); // 'yes' truthy 不漂移
    const capped = normalizeWellbeingState({ focusApps: Array.from({ length: 70 }, (_, i) => `app${i}`) });
    expect(capped.focusApps.length).toBe(64);
    expect(capped.focusApps[63]).toBe('app63');
  });
});

describe('v10.81 #96 三期 纯函数真跑', () => {
  it('setAppLimit：设限 + 0 清除 + 垃圾 appId no-op + 不 mutation 入参', () => {
    const base = { version: 1, limits: {}, focusApps: ['k'], focusActive: false };
    const s1 = setAppLimit(base, 'clock_app', 30);
    expect(s1.limits).toEqual({ clock_app: 30 });
    expect(s1.focusApps).toEqual(['k']); // 其他字段保留
    expect(base.limits).toEqual({}); // 纯函数：入参零 mutation
    const s2 = setAppLimit(s1, 'clock_app', 0);
    expect(s2.limits).toEqual({});
    expect(setAppLimit(base, '', 30)).toEqual({ version: 1, limits: {}, focusApps: ['k'], focusActive: false });
    const s3 = setAppLimit(base, 'a', 9999);
    expect(s3.limits).toEqual({ a: 1440 });
  });
  it('setFocusApps：全量替换去重保序 + 垃圾清单归空 + 截断', () => {
    const base = { version: 1, limits: { a: 15 }, focusApps: ['a'], focusActive: true };
    const s1 = setFocusApps(base, ['b', 'a', 'b', '', 'c']);
    expect(s1.focusApps).toEqual(['b', 'a', 'c']);
    expect(s1.limits).toEqual({ a: 15 }); // limits 零触碰
    expect(s1.focusActive).toBe(true);
    expect(setFocusApps(base, 'junk').focusApps).toEqual([]);
    expect(setFocusApps(base, null).focusApps).toEqual([]);
  });
  it('setFocusActive：严格 boolean 归一', () => {
    const base = { version: 1, limits: {}, focusApps: ['a'], focusActive: false };
    expect(setFocusActive(base, true).focusActive).toBe(true);
    expect(setFocusActive(base, 1).focusActive).toBe(false);
    expect(setFocusActive(base, 'on').focusActive).toBe(false);
    expect(setFocusActive(base, false).focusApps).toEqual(['a']);
  });
});

describe('v10.81 #96 三期 pausedReason 判定链 / remainingMs', () => {
  const S = { version: 1, limits: { clock_app: 30, music: 15 }, focusApps: ['music'], focusActive: false };
  it('未配置应用 / 垃圾 appId → null', () => {
    expect(pausedReason(S, 'other_app', 0)).toBe(null);
    expect(pausedReason(S, '', 99999)).toBe(null);
  });
  it('timer：限时内 null / 到限 timer / 布尔 usedMs 防御 0 不误判', () => {
    expect(pausedReason(S, 'clock_app', 29 * 60000)).toBe(null);
    expect(pausedReason(S, 'clock_app', 30 * 60000)).toBe('timer'); // 恰好到限即暂停
    expect(pausedReason(S, 'clock_app', 31 * 60000 + 5)).toBe('timer');
    expect(pausedReason(S, 'clock_app', true)).toBe(null); // 布尔→0 不误判到限
  });
  it('focus：开关关不拦 / 开关开清单命中 focus / 不在清单走 timer 裁决', () => {
    expect(pausedReason(S, 'music', 0)).toBe(null); // focusActive false
    const S_ON = { ...S, focusActive: true };
    expect(pausedReason(S_ON, 'music', 0)).toBe('focus');
    expect(pausedReason(S_ON, 'clock_app', 29 * 60000)).toBe(null);
    expect(pausedReason(S_ON, 'clock_app', 30 * 60000)).toBe('timer');
  });
  it('focus 优先于 timer（判定顺序在录）', () => {
    const S_ON = { version: 1, limits: { music: 15 }, focusApps: ['music'], focusActive: true };
    expect(pausedReason(S_ON, 'music', 60 * 60000)).toBe('focus');
  });
  it('remainingMs：无限时 -1 哨兵 / 正剩余 / 到限 0 / 垃圾防御', () => {
    expect(remainingMs(S, 'other_app', 0)).toBe(-1);
    expect(remainingMs(S, 'clock_app', 10 * 60000)).toBe(20 * 60000);
    expect(remainingMs(S, 'clock_app', 30 * 60000)).toBe(0);
    expect(remainingMs(S, 'clock_app', 45 * 60000)).toBe(0);
    expect(remainingMs(S, '', 0)).toBe(-1);
    expect(remainingMs(S, 'clock_app', true)).toBe(30 * 60000); // 布尔→0
  });
});

describe('v10.81 #96 三期 codec 往返', () => {
  it('serialize→parse 往返一致 + 垃圾兜底', () => {
    const s = { version: 1, limits: { a: 15, b: 1440 }, focusApps: ['x', 'y'], focusActive: true };
    const back = parseWellbeingState(serializeWellbeingState(s));
    expect(back).toEqual(s);
    expect(parseWellbeingState('not json{{').focusActive).toBe(false);
    expect(parseWellbeingState(serializeWellbeingState(null)).limits).toEqual({});
  });
});

describe('v10.81 #96 三期 store 工厂（storage 注入隔离）', () => {
  it('setLimit/setFocusApps/setFocusActive 提交持久化 + 重初始化往返', () => {
    const st = memStorage();
    const store = createWellbeingStore({ storage: st });
    store.setLimit('clock_app', 30);
    store.setFocusApps(['music']);
    store.setFocusActive(true);
    expect(store.getState()).toEqual({ version: 1, limits: { clock_app: 30 }, focusApps: ['music'], focusActive: true });
    const store2 = createWellbeingStore({ storage: st }); // 模拟重载：同 storage 重初始化
    expect(store2.limitOf('clock_app')).toBe(30);
    expect(store2.focusApps()).toEqual(['music']);
    expect(store2.focusActive()).toBe(true);
    expect(store2.pausedReason('clock_app', 30 * 60000)).toBe('timer');
    expect(store2.remainingMs('clock_app', 5 * 60000)).toBe(25 * 60000);
  });
  it('focusApps()/limits() 快照副本——外部 mutation 不触真源', () => {
    const store = createWellbeingStore({ storage: memStorage() });
    store.setFocusApps(['a', 'b']);
    const snap = store.focusApps();
    snap.push('hacked');
    snap.length = 0;
    expect(store.focusApps()).toEqual(['a', 'b']);
    const lim = store.limits();
    lim.a = 999;
    expect(store.limitOf('a')).toBe(0);
  });
  it('setLimit 0 = 清除 + 损坏存档走默认', () => {
    const st = memStorage();
    const store = createWellbeingStore({ storage: st });
    store.setLimit('a', 15);
    expect(store.limitOf('a')).toBe(15);
    store.setLimit('a', 0);
    expect(store.limitOf('a')).toBe(0);
    st.setItem(WELLBEING_FOCUS_KEY, 'corrupted{{');
    expect(createWellbeingStore({ storage: st }).focusActive()).toBe(false);
  });
});

describe('v10.81 #96 三期 接线锚', () => {
  it('app-window.js：静态导入 + usedTodayMs 口径 + openApp 前置守卫 + __wellbeingStore 观测面', () => {
    expect(WIN).toContain("import { wellbeingStore } from './aosp/wellbeing-focus.js';");
    expect(WIN).toContain('window.__wellbeingStore = wellbeingStore');
    expect(WIN).toContain('function usedTodayMs(appId)');
    expect(WIN).toContain('wellbeingStore.pausedReason(app.id, usedTodayMs(app.id))');
    expect(WIN).toContain('「${app.name}」已暂停（专注模式）');
    expect(WIN).toContain('「${app.name}」今日限时已用完，已暂停至次日');
  });
  it('app-window.js：到期沿闭账前快照（usedBeforeClose 基线 + 前后双判）', () => {
    expect(WIN).toContain('const usedBeforeClose = closedAppId ? usedTodayMs(closedAppId) : 0;');
    expect(WIN).toContain("reasonAfter === 'timer' && wellbeingStore.pausedReason(closedAppId, usedBeforeClose) !== 'timer'");
  });
  it('settings.js：页 36 三期双卡锚 + 开关 + 注记三模式分层裁决', () => {
    expect(SET).toContain('data-test="wellbeing-focus-card"');
    expect(SET).toContain('data-test="wellbeing-focus-switch"');
    expect(SET).toContain('id="wellbeingFocusApps"');
    expect(SET).toContain('data-test="wellbeing-timers-card"');
    expect(SET).toContain('id="wellbeingTimers"');
    expect(SET).toContain('三模式分层裁决');
  });
  it('settings-wellbeing.js：wellbeingStore 导入 + 双区块渲染 + 档位轮转 + change 委托链', () => {
    expect(WB).toContain("import { wellbeingStore } from '../aosp/wellbeing-focus.js';");
    expect(WB).toContain('function renderFocusBlock()');
    expect(WB).toContain('function renderTimersBlock()');
    expect(WB).toContain('TIMER_PRESETS = [0, 15, 30, 60, 120]');
    expect(WB).toContain("e.target.id === 'wellbeingFocusSwitch'");
    expect(WB).toContain('data-test="wellbeing-focus-chip"');
    expect(WB).toContain('data-test="wellbeing-timer-btn"');
    expect(WB).toContain('data-test="wellbeing-paused-tag"');
    expect(WB).toContain("wellbeingStore.setFocusActive(e.target.checked === true)");
  });
});

describe('v10.81 #96 三期 回归锚（既有面零触碰）', () => {
  it('usageStore 真源键未改写（#96 一期交付面）', () => {
    const AU = read('ios-desktop/js/aosp/app-usage.js');
    expect(AU).toContain("APP_USAGE_KEY = 'ios-desktop:app-usage-v1'");
  });
  it('focus.js 番茄钟语义未触碰（三模式分层裁决：会话级 DND 循环保留）', () => {
    const F = read('ios-desktop/js/focus.js');
    expect(F).toContain('const FOCUS_MIN = 25;');
    expect(F).toContain('const BREAK_MIN = 5;');
    expect(F).toContain('window.__focus');
  });
  it('profiles.js 快照键未改写（外观域零耦合）', () => {
    const P = read('ios-desktop/js/profiles.js');
    expect(P).toContain("const PROFILES_KEY = 'ios-desktop:profiles';");
  });
  it('appnotif 页 35 零触碰（v10.24 交付面）', () => {
    expect(SET).toContain('window.pushSubPage && window.pushSubPage(35)');
  });
});

describe('v10.81 #96 三期 版本锚', () => {
  it('pkg 10.81.0（roll-version 单一真源）', () => {
    expect(PKG.version).toBe('10.81.0');
  });
});
