// ==================== v10.67 #226 时钟加载顺序韧性回归（R116 窗） ====================
// 填补 #226 点名的「模块图耦合盲区」：既有 7 个时钟测试全是源码字符串断言 + 纯逻辑注入，
// 不加载真实模块图 → stopwatch.mjs:11 顶层直读 window.__clockCore.Stopwatch 致整条 ESM 图
// 崩塌的事故模式零覆盖。本文件用真实动态 import（happy-dom + 万能元素桩）补四层：
//   T1 core 缺失时模块图可加载（求值期零抛出——原 L11 硬读的直接回归锚）
//   T2 core 缺失时域动作优雅降级（tSW/rSW/rLap/stopwatchTick 零抛出，等入口遮罩重试）
//   T3 core 就绪后功能零回归（真实 clock-core.Stopwatch/addLap/fastestSlowestLaps 全链）
//   T4 入口契约静态锚（app.mjs ensureClockCore/showClockCoreError/bootClock 在位）
// 注：真实页面加载（Chromium 无 pageerror + 闹钟渲染 + 注入失败遮罩 + 重试恢复）
//     由 scripts/e2e-v1033-clock-resilience.mjs 承担（#226 要求④⑤，#139 根壳入口教训）。
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const CORE = read('ios-desktop/js/clock-core.js');
const buildCore = () => new Function('window', CORE + '\n;return window.__clockCore;')({});

/* 万能元素桩：写操作入 store、未知方法调用零副作用——app.mjs 顶层监听器 + 启动序列
   （rA/initWorld/initAlarmEditor/initBedtime）对真实 DOM 的全部触碰在此吸收。
   registry 按 id 复用同一实例，测试可回读 innerText/innerHTML 断言。 */
const registry = new Map();
const stubEl = () => {
  const store = {};
  const noop = () => {};
  const el = new Proxy(function () {}, {
    get(t, p) {
      if (p === 'classList') return { add: noop, remove: noop, toggle: noop, contains: () => false };
      if (p === 'style') return new Proxy({}, { get: () => noop, set: () => true, apply: () => noop });
      if (p === 'dataset') return {};
      if (p === 'value') return store[p] ?? '';
      if (p === 'checked') return store[p] ?? false;
      if (p === 'innerText' || p === 'innerHTML' || p === 'textContent') return store[p] ?? '';
      if (p === 'offsetWidth' || p === 'offsetHeight') return 0;
      if (typeof p === 'string' && p in store) return store[p];
      return noop;
    },
    set(t, p, v) { store[p] = v; return true; },
    apply() { return stubEl(); }
  });
  return el;
};
const installStubDom = () => {
  registry.clear();
  document.getElementById = (id) => { if (!registry.has(id)) registry.set(id, stubEl()); return registry.get(id); };
  document.createElement = () => stubEl();
  document.querySelector = () => null;
  document.querySelectorAll = () => [];
  document.body.appendChild = () => {};
  document.head.appendChild = () => {};
  document.documentElement.style.setProperty = () => {};
  document.documentElement.style.removeProperty = () => {};
  globalThis.requestAnimationFrame = () => 1; /* 启动序列可走，主循环不实际起帧（测试确定性） */
};
const $id = (id) => registry.get(id);

beforeAll(() => { vi.stubGlobal('setInterval', () => 0); /* initCalAgenda 30s 轮询不挂事件循环 */ });

describe('v10.67 · #226 时钟加载顺序韧性（真实模块图动态 import）', () => {
  it('T1 core 缺失时整条模块图可加载——求值期零抛出（原 stopwatch.mjs:11 硬读回归锚）', async () => {
    installStubDom();
    window.__clockCore = undefined;
    vi.resetModules();
    const mod = await import('../ios-desktop/apps/clock-app/stopwatch.mjs');
    expect(mod.swActions['sw-toggle']).toBeTypeOf('function');
    expect(mod.fSW(65000)).toBe('01:05.00');
  });

  it('T2 core 缺失时域动作优雅降级——四入口全零抛出，等待入口遮罩重试', async () => {
    installStubDom();
    window.__clockCore = undefined;
    vi.resetModules();
    const mod = await import('../ios-desktop/apps/clock-app/stopwatch.mjs');
    expect(() => mod.swActions['sw-toggle']()).not.toThrow();
    expect(() => mod.swActions['sw-lap']()).not.toThrow();
    expect(() => mod.swActions['sw-reset']()).not.toThrow();
    expect(() => mod.stopwatchTick()).not.toThrow();
  });

  it('T3 core 就绪后秒表功能零回归——真实 Stopwatch/addLap/fastestSlowestLaps 全链', async () => {
    installStubDom();
    window.__clockCore = buildCore();
    expect(window.__clockCore.Stopwatch).toBeTypeOf('function');
    vi.resetModules();
    const mod = await import('../ios-desktop/apps/clock-app/stopwatch.mjs');
    mod.swActions['sw-toggle'](); /* 开始 */
    expect($id('swMainBtn').innerText).toBe('停止');
    mod.stopwatchTick();
    expect(String($id('swDisplay').innerText)).toMatch(/^\d{2}:\d{2}\.\d{2}$/);
    mod.swActions['sw-lap'](); /* 计一圈 */
    expect(String($id('swLapsCarousel').innerHTML)).toContain('lap-card-item');
    mod.swActions['sw-toggle'](); /* 停止 */
    expect($id('swMainBtn').innerText).toBe('开始');
    mod.swActions['sw-reset'](); /* 重置 */
    expect($id('swDisplay').innerText).toBe('00:00.00');
    expect(String($id('swLapsCarousel').innerHTML)).toBe('');
    window.__appClosed = true; /* 停主循环意愿登记（礼貌退出） */
  });

  it('T4 入口契约静态锚——app.mjs ensureClockCore/showClockCoreError/bootClock 与门面双形态在位', () => {
    const app = read('ios-desktop/apps/clock-app/app.mjs');
    expect(app).toContain('const ensureClockCore=async()=>{');
    expect(app).toContain('const showClockCoreError=()=>{');
    expect(app).toContain('bootClock();');
    expect(app).toContain("s.src=CLOCK_CORE_SRC");
    const facade = read('ios-desktop/js/clock-core.mjs');
    expect(facade).toContain('export const getClockCore');
    expect(facade).toContain('export const ensureClockCore');
    const coreSrc = read('ios-desktop/js/clock-core.js');
    expect(coreSrc).toContain('window.__clockCore = {');
    expect(coreSrc).not.toContain('export ');
  });
});
