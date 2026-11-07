// ==================== v232-ci-race-regression.test.js — #232 CI 三连红复盘回归 ====================
//
// 覆盖（#232 验收清单逐条落为自动化断言）：
//   ① 根因 1（run 438 收尾 Unhandled）：main.js resize/orientationchange 防抖定时器
//      teardown 竞态 guard + desktop.js double-rAF 缺席守卫（源码锚 + 行为）
//   ② 根因 2（run 440/442 v864 S4）：场景层确定性化（去真实时间窗口绝对值断言），
//      「未瞬跳归零 + 逐帧连续衰减」严格语义改由确定性引擎层逐帧回归承接
//   ③ 纪律：不采用 vitest retry 掩盖（源码锚）
//
// 取值纪律：时序常量单一真源 aosp/popup-timings.js / interpolators.js；引擎与
// context-menu.js startMenuAnim('open'|'close') 同参同路径，零复制产品实现。

import { describe, test, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { IIOAnimator } from '../ios-desktop/js/aosp/interruptible-in-out-animator.js';
import { EMPHASIZED_ACCELERATE } from '../ios-desktop/js/aosp/interpolators.js';
import { U_TIMINGS } from '../ios-desktop/js/aosp/popup-timings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(join(__dirname, '..', p), 'utf8');
const MAIN_SRC = () => R('ios-desktop/js/main.js');
const DESKTOP_SRC = () => R('ios-desktop/js/desktop.js');
const S4_SRC = () => R('tests/v864-split-popup-timings.test.js');
const VITEST_CFG = () => R('vitest.config.js');

// 与 context-menu.js startMenuAnim 的 fade 通道逐字同参（LINEAR 为文件内本地定义）
const LINEAR = (t) => t;
const DT = 1 / 120; // 与 tickMenu 首帧默认步长同量纲（秒），确定性推进

function buildMenuFade() {
  return new IIOAnimator({
    durationMs: U_TIMINGS.openFadeDuration,       // 83 —— OPEN_FADE_DURATION_U
    outDurationMs: U_TIMINGS.closeDuration,       // 233 —— CLOSE_DURATION_U
    interpolator: LINEAR,
    outInterpolator: EMPHASIZED_ACCELERATE,
    initialValue: 0,
  });
}

/** 开场推进到中段（约 40ms / 83ms 半程），再反向关，返回逐帧采样序列。 */
function openMidThenClose() {
  const fade = buildMenuFade();
  fade.in();
  for (let i = 0; i < 5; i++) fade.update(DT); // 5 × 8.33ms ≈ 41.7ms
  const oOpen = fade.progress;
  fade.out();                                  // 立即反向（同 closeContextMenu 路径）
  const o1 = fade.progress;                     // 动作后即刻采点（同步、零跳变）
  const samples = [];
  for (let i = 0; i < 40; i++) {
    fade.update(DT);
    samples.push(fade.progress);
  }
  return { oOpen, o1, samples, end: fade.progress, fade };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------- ① 根因 1：收尾定时器竞态 guard（源码锚） ----------
describe('#232 · 根因 1：resize/orientationchange teardown 竞态（run 438）', () => {
  test('A1 main.js：环境存活探测 + 回调入口 guard + 两路定时器均有可清理句柄', () => {
    const s = MAIN_SRC();
    expect(s).toContain('function isDomEnvironmentAlive()');
    expect(s).toContain("typeof document !== 'undefined'");
    expect(s).toContain("typeof requestAnimationFrame !== 'undefined'");
    expect(s).toContain('if (!isDomEnvironmentAlive()) return;');
    // 旧实现：orientationchange 是裸 setTimeout 无句柄（比 resize 更晚 fire、无法清理）
    expect(s).toContain('let orientationDebounceTimer = null;');
    expect(s).toContain('if (orientationDebounceTimer) clearTimeout(orientationDebounceTimer);');
    expect(s).toContain('orientationDebounceTimer = setTimeout(rebalanceViewportLayout, 200);');
    // 环境已拆兜底：catch 内仅当环境仍存活才重抛（不吞产品错误）
    expect(s).toContain('if (isDomEnvironmentAlive()) throw e;');
  });

  test('A2 desktop.js：double-rAF 缺席守卫 + 同步恢复过渡（真实浏览器路径不变）', () => {
    const s = DESKTOP_SRC();
    expect(s).toContain("typeof requestAnimationFrame === 'undefined'");
    expect(s).toContain("dom.desktopSlider.style.transition = '';");
    // double-rAF 本体仍在（真实浏览器恒走此路径，120Hz 贴帧边界语义未改）
    expect(s).toContain('requestAnimationFrame(() => requestAnimationFrame(() => {');
  });

  test('A3 行为：rAF 缺席（模拟 teardown）时 switchDesktopPage(...,false) 不抛错且过渡同步恢复', async () => {
    // 先按正常环境完成模块加载（import 链可能触碰 rAF），再 stub 掉全局 rAF 模拟
    // happy-dom 已拆环境 —— 正是 run 438 堆栈里 double-rAF 抛 ReferenceError 的条件。
    const { dom } = await import('../ios-desktop/js/dom.js');
    const { state } = await import('../ios-desktop/js/state.js');
    const { switchDesktopPage } = await import('../ios-desktop/js/desktop.js');

    const fakeEl = () => ({
      style: { transition: 'sentinel', transform: '' },
      children: [],
      classList: { toggle() {} },
      setAttribute() {},
    });
    dom.desktopSlider = fakeEl();
    dom.pageDots = fakeEl();
    const savedPages = state.pagesApps;
    state.pagesApps = [[]];

    vi.stubGlobal('requestAnimationFrame', undefined);
    try {
      expect(typeof requestAnimationFrame).toBe('undefined');
      expect(() => switchDesktopPage(0, false)).not.toThrow();
      // guard 分支：无帧可贴 → 同步直接恢复过渡（不留 'none' 冻结态）
      expect(dom.desktopSlider.style.transition).toBe('');
      expect(dom.desktopSlider.style.transform).toBe('translate3d(0vw, 0, 0)');
    } finally {
      state.pagesApps = savedPages;
      vi.unstubAllGlobals();
    }
  });

  test('A4 纪律：vitest 配置未启用 retry（#232「不采用 vitest retry 掩盖」）', () => {
    const cfg = VITEST_CFG();
    expect(cfg).not.toMatch(/\bretry\s*:/);
    expect(cfg).not.toMatch(/\bretries\s*:/);
  });
});

// ---------- ② 根因 2：S4 场景层确定性化（源码锚） ----------
describe('#232 · 根因 2：v864 S4 去真实时间窗口绝对值（run 440/442）', () => {
  test('B1 S4 不再断言「60ms 窗口内 o2 > 0」绝对值（flake 根因已移除）', () => {
    const s = S4_SRC();
    expect(s).not.toContain('toBeGreaterThan(0);    // 未瞬跳归零');
    expect(s).not.toMatch(/expect\(o2\)\.toBeGreaterThan\(0\)/);
    expect(s).toContain('const o2 = raw2 === \'\' ? 0 : parseFloat(raw2);');
    expect(s).toContain('expect(o2).toBeLessThan(o1);');
    expect(s).toContain('expect(o2).toBeGreaterThanOrEqual(0);');
    expect(s).toContain('#232 确定性化');
  });

  test('B2 严格语义已迁移到确定性引擎层回归（本文件 C 组）', () => {
    const s = S4_SRC();
    expect(s).toContain('v232-ci-race-regression.test.js');
  });
});

// ---------- ③ 确定性引擎层：连续衰减 / 未瞬跳归零逐帧回归 ----------
describe('#232 · 确定性引擎层：开到中段反向关的连续衰减语义（零真实时钟依赖）', () => {
  test('C1 打断接管：out() 后即刻 progress 零跳变（|o1 - oOpen| < 0.25）', () => {
    const { oOpen, o1 } = openMidThenClose();
    expect(oOpen).toBeGreaterThan(0.05);  // 确在开场中段（非起点/终点）
    expect(oOpen).toBeLessThan(0.95);
    expect(Math.abs(o1 - oOpen)).toBeLessThan(0.25);
    expect(o1).toBe(oOpen);              // 反向触发不改当前值（Launcher3 接续语义）
  });

  test('C2 连续衰减：逐帧单调不增，且首步严格下降', () => {
    const { o1, samples } = openMidThenClose();
    expect(samples[0]).toBeLessThan(o1);
    for (let i = 1; i < samples.length; i++) {
      // EMPHASIZED_ACCELERATE 单调，逐帧不得出现回升（重置/跳变即挂）
      expect(samples[i]).toBeLessThanOrEqual(samples[i - 1] + 1e-9);
    }
  });

  test('C3 未瞬跳归零：存在 0 < p < o1 的中间态（S4 场景层退役的语义在此补回）', () => {
    const { o1, samples } = openMidThenClose();
    const mids = samples.filter((v) => v > 0 && v < o1);
    expect(mids.length).toBeGreaterThan(0);
    expect(samples[0]).toBeGreaterThan(0);
  });

  test('C4 收场收敛：确定性推进后 progress 归 0（无残留、无卡死）', () => {
    const { end, fade } = openMidThenClose();
    expect(end).toBe(0);
    expect(fade.isSettled()).toBe(true);
    expect(fade.direction).toBe('out');
  });

  test('C5 确定性：重复 5 轮逐帧序列逐值完全一致（与 CPU 负载/runner 时序无关）', () => {
    const baseline = openMidThenClose();
    for (let k = 0; k < 5; k++) {
      const cur = openMidThenClose();
      expect(cur.oOpen).toBe(baseline.oOpen);
      expect(cur.o1).toBe(baseline.o1);
      expect(cur.samples).toEqual(baseline.samples);
      expect(cur.end).toBe(baseline.end);
    }
  });

  test('C6 时序真源：83 / 233 开合不对称与 U+ 规格一致（防重锚漂移）', () => {
    // 常量由 popup-timings.js 单一真源提供，避免本文件另立字面量
    expect(U_TIMINGS.openFadeDuration).toBe(83);   // OPEN_FADE_DURATION_U
    expect(U_TIMINGS.closeDuration).toBe(233);     // CLOSE_DURATION_U
    expect(U_TIMINGS.openFadeDuration).toBeLessThan(U_TIMINGS.closeDuration);
  });
});
