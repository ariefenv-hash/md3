// ==================== app-usage.test.js — #96 一期 应用前台使用时长统计（v11.08 · R109） ====================
//
// 覆盖：
//   · aosp/app-usage.js 纯逻辑真跑：常量（KEY/滚动 7 天/会话 4h 钳制/日桶 24h 上限）/
//     clampUsageMs 归一（垃圾/负数/布尔防御）/ usageDayKey 本地日键 / recordUsageOpen
//     （opens+1 + 在途幂等）/ recordUsageClose（累计 + 孤儿 no-op + SESSION_CAP 冻结）/
//     usageAppSwitch（close from + open to + 同应用防双计）/ pruneUsageDays 滚动归档 /
//     topUsageApps 排序（ms 降序→opens 降序→appId 字典序稳定）/ usageTotalMs 汇总 /
//     parse·serialize codec（垃圾防御 + 往返一致 + 跨午夜归桶口径）
//   · createUsageStore store 工厂（storage 注入隔离单测）：appOpened 单前台模型
//     （先闭合其他悬挂会话）/ persist 落盘 / 重初始化往返 / 观测面
//   · 接线锚：app-window.js（静态导入 + 开/闭两喂入点 + __usageStore 观测面）/
//     settings.js（页 36 模板锚 + 模块导入）/ settings-two-pane.js（一级入口行 idx 36）/
//     icons-aosp.js（topWellbeing 自创注记）/ settings-wellbeing.js（渲染面 + pageIdx 36）
//   · 回归锚：recent-apps recordAppOpened 上限 8 原值 / app-window-closed 广播原句 /
//     appnotif 页 35 零触碰 / channelStore 真源键未改写 / battery-health 电池核零触碰

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APP_USAGE_KEY, USAGE_SCHEMA_VERSION, USAGE_MAX_DAYS, SESSION_CAP_MS, DAY_MS_CAP,
  RANKING_LIMIT, APP_ID_MAX, USAGE_DEFAULTS, USAGE_COUNTER_KINDS,
  clampUsageMs, usageDayKey, normalizeUsageState,
  recordUsageOpen, recordUsageClose, usageAppSwitch, pruneUsageDays,
  topUsageApps, usageTotalMs, parseUsageState, serializeUsageState,
  createUsageStore, recordDeviceEvent,
} from '../ios-desktop/js/aosp/app-usage.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIN = readFileSync(join(ROOT, 'ios-desktop/js/app-window.js'), 'utf-8');
const SET = readFileSync(join(ROOT, 'ios-desktop/js/apps/settings.js'), 'utf-8');
const TPN = readFileSync(join(ROOT, 'ios-desktop/js/apps/settings-two-pane.js'), 'utf-8');
const ICONS = readFileSync(join(ROOT, 'ios-desktop/js/icons-aosp.js'), 'utf-8');
const WB = readFileSync(join(ROOT, 'ios-desktop/js/apps/settings-wellbeing.js'), 'utf-8');
const RA = readFileSync(join(ROOT, 'ios-desktop/js/recent-apps.js'), 'utf-8');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));

/** 跨时区稳定时刻：任取非零毫秒（日键断言以镜像构造为准，不硬编码时区日期） */
const T0 = 1730000000000;

describe('v11.08 #96 常量（UsageStats 口径）', () => {
  it('真源键 / schema 版本 / 滚动 7 天 / 会话 4h 钳制 / 日桶 24h 上限', () => {
    expect(APP_USAGE_KEY).toBe('ios-desktop:app-usage-v1');
    expect(USAGE_SCHEMA_VERSION).toBe(1);
    expect(USAGE_MAX_DAYS).toBe(7);
    expect(SESSION_CAP_MS).toBe(4 * 60 * 60 * 1000);
    expect(DAY_MS_CAP).toBe(24 * 60 * 60 * 1000);
    expect(RANKING_LIMIT).toBe(8);
    expect(APP_ID_MAX).toBe(64);
  });
  it('USAGE_DEFAULTS 冻结空形态（days/open/counters 解耦）', () => {
    expect(USAGE_DEFAULTS).toEqual({ version: 1, days: {}, open: {}, counters: {} });
    expect(Object.isFrozen(USAGE_DEFAULTS)).toBe(true);
  });
  it('USAGE_COUNTER_KINDS 两类冻结（#96 二期：解锁/通知）', () => {
    expect(USAGE_COUNTER_KINDS).toEqual({ UNLOCK: 'unlock', NOTIFY: 'notify' });
    expect(Object.isFrozen(USAGE_COUNTER_KINDS)).toBe(true);
  });
});

describe('v11.08 #96 clampUsageMs 归一', () => {
  it('垃圾/负数/布尔 → 0；小数 → floor；上限钳制', () => {
    expect(clampUsageMs(undefined)).toBe(0);
    expect(clampUsageMs(null)).toBe(0);
    expect(clampUsageMs('junk')).toBe(0);
    expect(clampUsageMs(-5)).toBe(0);
    expect(clampUsageMs(true)).toBe(0); // boolean 防御（Number(true)=1 不得漂移，#100 同款）
    expect(clampUsageMs(1500.9)).toBe(1500);
    expect(clampUsageMs(DAY_MS_CAP + 9999)).toBe(DAY_MS_CAP);
    expect(clampUsageMs(999, 100)).toBe(100); // 自定义 cap
  });
});

describe('v11.08 #96 usageDayKey 本地日键', () => {
  it('固定 ts → 镜像构造本地日期（时区无关）+ 非法 ts 兜底不抛', () => {
    const d = new Date(T0);
    const expectKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(usageDayKey(T0)).toBe(expectKey);
    expect(usageDayKey(T0)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(usageDayKey(NaN)).toMatch(/^\d{4}-\d{2}-\d{2}$/); // 非法 → 当日兜底
  });
});

describe('v11.08 #96 recordUsageOpen / recordUsageClose（事件对计账）', () => {
  it('开=opens+1+在途起算；重复开幂等不双计', () => {
    let s = recordUsageOpen(null, 'clock', T0);
    expect(s.open.clock).toBe(T0);
    expect(s.days[usageDayKey(T0)].clock.opens).toBe(1);
    s = recordUsageOpen(s, 'clock', T0 + 500); // 在途幂等
    expect(s.open.clock).toBe(T0);
    expect(s.days[usageDayKey(T0)].clock.opens).toBe(1);
  });
  it('闭=时长累计进闭合日桶；孤儿 close no-op', () => {
    let s = recordUsageOpen(null, 'clock', T0);
    const before = JSON.stringify(s);
    s = recordUsageClose(s, 'music', T0 + 1000); // 孤儿（无在途会话）
    expect(JSON.stringify(s)).toBe(before);
    s = recordUsageClose(s, 'clock', T0 + 60000);
    expect(s.days[usageDayKey(T0 + 60000)].clock.ms).toBe(60000);
    expect(s.open.clock).toBeUndefined();
    const again = recordUsageClose(s, 'clock', T0 + 90000); // 已闭合，无会话
    expect(again.days[usageDayKey(T0 + 60000)].clock.ms).toBe(60000); // 不双计
  });
  it('SESSION_CAP_MS 冻结：close 丢失悬挂兜底（10h 会话只计 4h）', () => {
    let s = recordUsageOpen(null, 'clock', T0);
    s = recordUsageClose(s, 'clock', T0 + SESSION_CAP_MS + 6 * 3600 * 1000);
    expect(s.days[usageDayKey(T0 + SESSION_CAP_MS + 6 * 3600 * 1000)].clock.ms).toBe(SESSION_CAP_MS);
  });
  it('垃圾入参防御：空 appId / 垃圾 ts / 垃圾 state 均不抛不脏写', () => {
    expect(() => recordUsageOpen(null, '', T0)).not.toThrow();
    expect(() => recordUsageOpen(null, 'clock', NaN)).not.toThrow();
    expect(() => recordUsageClose('garbage', 'clock', T0)).not.toThrow();
    const s = recordUsageOpen({ days: 'junk', open: null }, 'clock', T0); // 脏 state 归一兜底
    expect(s.open.clock).toBe(T0);
  });
});

describe('v11.08 #96 usageAppSwitch（单前台切换）', () => {
  it('close from + open to；同应用防双计；跨午夜 ms 归闭合日 / opens 归打开日', () => {
    let s = recordUsageOpen(null, 'a', T0);
    s = usageAppSwitch(s, 'a', 'b', T0 + 10 * 60000);
    expect(s.open.b).toBe(T0 + 10 * 60000);
    expect(s.open.a).toBeUndefined();
    expect(s.days[usageDayKey(T0 + 10 * 60000)].a.ms).toBe(10 * 60000);
    // 同应用：from===to 不关不重开（opens 不涨，days 无增量——幂等形态）
    const snap = JSON.stringify(s);
    s = usageAppSwitch(s, 'b', 'b', T0 + 20 * 60000);
    expect(s.open.b).toBe(T0 + 10 * 60000);
    expect(s.days[usageDayKey(T0 + 10 * 60000)].b.opens).toBe(1);
    expect(JSON.stringify(s)).toBe(snap);
    // 跨午夜：opens 归打开日桶，ms 归闭合日桶（事件流归桶近似口径；3h < SESSION_CAP 免钳制干扰）
    const d0 = new Date(T0);
    const nextMid = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + 1).getTime();
    const openTs = nextMid - 2 * 3600 * 1000, closeTs = nextMid + 3600 * 1000;
    expect(usageDayKey(openTs)).not.toBe(usageDayKey(closeTs)); // 前置：确跨本地午夜
    let t = recordUsageOpen(null, 'c', openTs);
    t = recordUsageClose(t, 'c', closeTs);
    expect(t.days[usageDayKey(openTs)].c.opens).toBe(1);
    expect(t.days[usageDayKey(closeTs)].c.ms).toBe(3 * 3600 * 1000);
  });
});

describe('v11.08 #96 pruneUsageDays 滚动归档', () => {
  it('保留最新 7 天日桶；open 表不随归档丢弃', () => {
    let s = { version: 1, days: {}, open: {} };
    for (let i = 0; i < 9; i++) {
      const dk = usageDayKey(T0 + i * 24 * 3600 * 1000);
      s = { ...s, days: { ...s.days, [dk]: { app: { ms: (i + 1) * 1000, opens: 1 } } } };
    }
    s = { ...s, open: { app: T0 + 8 * 24 * 3600 * 1000 } };
    const p = pruneUsageDays(s);
    expect(Object.keys(p.days).length).toBe(7);
    expect(p.days[usageDayKey(T0)]).toBeUndefined(); // 最旧桶剔除
    expect(p.open.app).toBeDefined(); // 在途会话保留
  });
});

describe('v11.08 #96 topUsageApps / usageTotalMs', () => {
  it('ms 降序 → opens 降序 → appId 字典序稳定；limit 钳制', () => {
    const dk = usageDayKey(T0);
    const s = {
      version: 1, open: {},
      days: { [dk]: { 'b-app': { ms: 3000, opens: 1 }, 'a-app': { ms: 5000, opens: 2 }, 'c-app': { ms: 3000, opens: 3 }, 'd-app': { ms: 3000, opens: 3 } } },
    };
    const rows = topUsageApps(s, dk);
    expect(rows.map(r => r.appId)).toEqual(['a-app', 'c-app', 'd-app', 'b-app']); // ms 降序→opens 降序→字典序
    expect(topUsageApps(s, dk, 2).length).toBe(2);
    expect(topUsageApps(s, 'not-a-day')).toEqual([]); // 非法日键 → 当日兜底（fixture 当日桶空 → 空排行）
  });
  it('汇总 = rows 求和；垃圾 rows 防御', () => {
    expect(usageTotalMs([{ ms: 1000 }, { ms: 250.9 }, { ms: 'junk' }, null])).toBe(1250);
    expect(usageTotalMs('junk')).toBe(0);
    expect(usageTotalMs([])).toBe(0);
  });
});

describe('v11.08 #96 parse·serialize codec', () => {
  it('垃圾字符串/数组 → 默认；往返一致；越界键剔除', () => {
    expect(parseUsageState('garbage')).toEqual({ version: 1, days: {}, open: {}, counters: {} });
    expect(parseUsageState(['x'])).toEqual({ version: 1, days: {}, open: {}, counters: {} });
    const s = recordUsageClose(recordUsageOpen(null, 'clock', T0), 'clock', T0 + 60000);
    const rt = parseUsageState(serializeUsageState(s));
    expect(rt.days[usageDayKey(T0)].clock).toEqual({ ms: 60000, opens: 1 });
    const dirty = parseUsageState({ version: 1, days: { 'bad-key': { x: { ms: 1 } } }, open: { y: 'junk' } });
    expect(dirty.days['bad-key']).toBeUndefined();
    expect(dirty.open.y).toBeUndefined();
  });
});

describe('v11.08 #96 createUsageStore（storage 注入隔离）', () => {
  function mockStorage() {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
  }
  it('appOpened 单前台模型：先闭合其他悬挂会话再开新', () => {
    const st = mockStorage();
    const store = createUsageStore({ storage: st });
    store.appOpened('a', T0);
    store.appOpened('b', T0 + 60000); // a 未显式 close → 单前台兜底闭合
    store.appClosed('b', T0 + 120000);
    const dk = usageDayKey(T0 + 120000);
    const rows = store.dayTotals(dk);
    const a = rows.find(r => r.appId === 'a');
    const b = rows.find(r => r.appId === 'b');
    expect(a.ms).toBe(60000);
    expect(b.ms).toBe(60000);
    expect(rows[0].appId).toBe('a'); // 平序字典序
  });
  it('persist 落盘 + 重初始化往返（损坏存档走默认）', () => {
    const st = mockStorage();
    const store = createUsageStore({ storage: st });
    store.appOpened('clock', T0);
    store.appClosed('clock', T0 + 30000);
    expect(st.getItem(APP_USAGE_KEY)).toBeTruthy();
    const store2 = createUsageStore({ storage: st });
    expect(store2.dayTotals(usageDayKey(T0))[0].ms).toBe(30000);
    st.setItem(APP_USAGE_KEY, '{broken');
    expect(createUsageStore({ storage: st }).getState().days).toEqual({});
  });
});

describe('v11.08 #96 二期 recordDeviceEvent（解锁/通知计数）', () => {
  it('unlock/notify 分类计数归日桶；垃圾 kind/ts no-op；上限锧 9999', () => {
    let s = recordDeviceEvent(null, 'unlock', T0);
    s = recordDeviceEvent(s, 'unlock', T0 + 1000);
    s = recordDeviceEvent(s, 'notify', T0 + 2000);
    s = recordDeviceEvent(s, 'junk', T0 + 3000); // 非法 kind
    s = recordDeviceEvent(s, 'unlock', NaN); // 非法 ts
    const dk = usageDayKey(T0);
    expect(s.counters[dk]).toEqual({ unlock: 2, notify: 1 });
    let c = { version: 1, days: {}, open: {}, counters: { [dk]: { unlock: 9998, notify: 0 } } };
    c = recordDeviceEvent(c, 'unlock', T0);
    c = recordDeviceEvent(c, 'unlock', T0);
    expect(c.counters[dk].unlock).toBe(9999); // 上限锧住
    // 开/闭事件后 counters 必须保留（v11.08 实抓的 recordUsageOpen 漏 counters 缺口回归锚）
    let t = recordDeviceEvent(null, 'unlock', T0);
    t = recordUsageOpen(t, 'clock', T0);
    t = recordUsageClose(t, 'clock', T0 + 60000);
    t = usageAppSwitch(t, null, 'music', T0 + 61000);
    expect(t.counters[dk].unlock).toBe(1);
  });
  it('codec 往返含 counters + prune 滚动含 counters + store deviceEvent/dayCounters', () => {
    let s = recordDeviceEvent(null, 'unlock', T0);
    const dk = usageDayKey(T0);
    expect(parseUsageState(serializeUsageState(s)).counters[dk].unlock).toBe(1);
    let multi = { version: 1, days: {}, open: {}, counters: {} };
    for (let i = 0; i < 9; i++) {
      const k = usageDayKey(T0 + i * 24 * 3600 * 1000);
      multi = { ...multi, counters: { ...multi.counters, [k]: { unlock: i + 1, notify: 0 } } };
    }
    const p = pruneUsageDays(multi);
    expect(Object.keys(p.counters).length).toBe(7);
    expect(p.counters[usageDayKey(T0)]).toBeUndefined();
    const store = createUsageStore({ storage: { getItem: () => null, setItem: () => {} } });
    store.deviceEvent('unlock', T0);
    store.deviceEvent('unlock', T0 + 100);
    store.deviceEvent('notify', T0 + 200);
    expect(store.dayCounters(dk)).toEqual({ unlock: 2, notify: 1 });
    expect(store.dayCounters('not-a-day')).toEqual({ unlock: 0, notify: 0 }); // 非法日键 → 当日兑底空
  });
  it('接线锚：lock-screen 双解锁沿 + instantUnlock 零计账注记 + notifications 闸后计账', () => {
    const LS = readFileSync(join(ROOT, 'ios-desktop/js/lock-screen.js'), 'utf-8');
    const NT = readFileSync(join(ROOT, 'ios-desktop/js/notifications.js'), 'utf-8');
    expect(LS).toContain("import { usageStore } from './aosp/app-usage.js';");
    expect(LS.match(/usageStore\.deviceEvent\('unlock'\)/g).length).toBe(2); // completeUnlock + unlockAndOpen
    expect(LS).toContain('instantUnlock');
    expect(LS).toContain('零计账');
    expect(NT).toContain("import { usageStore } from './aosp/app-usage.js';");
    expect(NT).toContain("usageStore.deviceEvent('notify')");
    expect(NT.indexOf('deliveryGate(channelImp).enqueue) return')).toBeLessThan(NT.indexOf("usageStore.deviceEvent('notify')")); // 闸后计账序
  });
  it('UI 锚：统计卡双锚 + dayCounters 消费', () => {
    expect(SET).toContain('data-test="wellbeing-stat-unlocks"');
    expect(SET).toContain('data-test="wellbeing-stat-notifs"');
    expect(SET).toContain('id="wellbeingUnlocks"');
    expect(SET).toContain('id="wellbeingNotifs"');
    expect(WB).toContain('usageStore.dayCounters(dayKey)');
  });
});

describe('v11.08 #96 接线锚（接线面源码锚）', () => {
  it('app-window：静态导入 + 开/闭两喂入点 + __usageStore 观测面', () => {
    expect(WIN).toContain("import { usageStore } from './aosp/app-usage.js';");
    expect(WIN).toContain('usageStore.appOpened(app.id)');
    expect(WIN).toContain('usageStore.appClosed(closedAppId)');
    expect(WIN).toContain('window.__usageStore = usageStore');
  });
  it('settings：页 36 模板锚（环形卡/排行/空态/口径注记）+ 模块导入', () => {
    expect(SET).toContain("title: '数字健康'");
    expect(SET).toContain('data-test="wellbeing-ring-card"');
    expect(SET).toContain('id="wellbeingRanking"');
    expect(SET).toContain('data-test="wellbeing-empty"');
    expect(SET).toContain('data-test="wellbeing-note"');
    expect(SET).toContain("import './settings-wellbeing.js';");
    expect(SET).toContain('@media (max-width: 480px)'); // 准入②断点
  });
  it('settings-two-pane 一级入口行（idx 36 / kw 别名 / AOSP 位次 accounts 后）', () => {
    const i = TPN.indexOf("{ key: 'wellbeing'");
    expect(i).toBeGreaterThan(-1);
    expect(TPN.indexOf("{ key: 'accounts'")).toBeLessThan(i);
    expect(TPN.indexOf("{ key: 'system'")).toBeGreaterThan(i);
    expect(TPN.slice(i, i + 220)).toContain('idx: 36');
    expect(TPN.slice(i, i + 260)).toContain('数字健康');
  });
  it('icons-aosp：topWellbeing 自创注记在场（非 AOSP 权威源标注）', () => {
    expect(ICONS).toContain('topWellbeing:');
    expect(ICONS).toContain('未逐 path 实证'); // 自创纪律标注
  });
  it('settings-wellbeing：渲染面 pageIdx 36 + Monet 零裸色 + esc 转义', () => {
    expect(WB).toContain('pageIdx === 36');
    expect(WB).toContain('var(--md-h,215)'); // 分色 hue 锚
    const WB_NOFALLBACK = WB.replace(/var\([^)]*\)/g, ''); // var() 回退值豁免（全库 fallback 惯例）
    expect(WB_NOFALLBACK).not.toMatch(/#[0-9a-fA-F]{3,6}\b/); // 准入①零裸色（裸 hex 全禁）
    expect(WB).toContain('function esc(');
    expect(WB).toContain('formatUsageMs');
  });
});

describe('v11.08 #96 回归锚（既有面零触碰）', () => {
  it('recent-apps recordAppOpened 上限 8 原值（#68 验收）', () => {
    expect(RA).toContain('recentAppsList.length > 8');
    expect(RA).toContain('export function recordAppOpened');
  });
  it('app-window-closed 广播原句在位（mini-window 依赖信号）', () => {
    expect(WIN).toContain("new CustomEvent('app-window-closed', { detail: { appId: closedAppId } })");
  });
  it('appnotif 页 35 零触碰（v11.08 交付面）+ channelStore 真源键未改写', () => {
    expect(SET).toContain('window.pushSubPage && window.pushSubPage(35)');
    expect(SET).toContain("import './settings-appnotif.js';");
    const NC = readFileSync(join(ROOT, 'ios-desktop/js/aosp/notification-channel.js'), 'utf-8');
    expect(NC).toContain("CHANNEL_STORAGE_KEY = 'ios-desktop:notification-channels'");
  });
  it('battery-health 电池核零触碰（v10.23 交付面）', () => {
    const BH = readFileSync(join(ROOT, 'ios-desktop/js/aosp/battery-health.js'), 'utf-8');
    expect(BH).toContain("BATTERY_HEALTH_KEY = 'ios-desktop:battery-health-v1'");
  });
});

describe('v11.08 #96 版本锚', () => {
  it('pkg 11.8.0（roll-version 单一真源）', () => {
    expect(PKG.version).toBe('11.8.0');
  });
});
