// ==================== v235-ci-teardown-timers.test.js — #235 CI 门禁红根因回归 ====================
//
// 背景（CI run#447 实锤，head=ffa50362/v10.35）：4956 用例全绿但 widget-board.js:438
// 模块级 1s 时钟 setInterval 在 happy-dom 环境拆除后触发 —— ReferenceError: document is
// not defined → Vitest Unhandled Error → 进程 exit 1 → Check comment claims 被连坐 skipped
// → build-and-deploy skipped → Pages 零部署。#232（v10.34）已修 main.js 防抖定时器 +
// desktop.js 双 rAF 两站，本议题把同族「pending-at-teardown 定时器」逐站清零：
//   · widget-board.js  clockTimer(1s) / scheduleTimer(60s) / pressTimer(380ms×2)
//   · at-a-glance.js   cityTimer(30s)
//   · focus.js         timer(1s)
//   · lock-screen.js   10s 锁屏时钟
//   · quick-settings.js zen 规则(60s) / recordTimerInterval(1s)
//   · volume-dialog.js hintTimer(500ms)
//   · main.js          顶层 1200ms 壁纸刷新 setTimeout（第三位点，run#491/#502 实锤：
//                      window is not defined @ main.js:236 → 同连坐链；v10.90 修）
//   · main.js          __tryUnlockAnim 500ms 上锁 setTimeout（同族位点，v10.90 同律）
// （m3e.js 看门狗自带 stopped/isConnected 自清为既有范例；recent-apps.js recordTick 回调
//  不触全局、video-wallpaper.js 看门狗全闭包面 —— 均不在 document 触碰族，本版不动）
//
// 覆盖：
//   A. 源码锚：九站守卫在位（typeof document === 'undefined' 先行返回，v232 同款范式）
//   B. 行为复现：boot 后模拟 teardown（document 全局移除 + rAF 帧死亡——真实 teardown
//      语义：Node 定时器仍发、rAF 不再执行），跨过一个 1s 时钟 tick 零 Unhandled
//      （修复前此场景必现 ReferenceError/TypeError → run 红；C 组配置锚见文件尾）
//   C. deploy.yml 配置锚：cancel-in-progress: false（修复项④）+ gate-alert 告警 job
//      （修复项③，issues: write）
//
// 教训沿袭：v232（teardown rAF 竞态同族）/ v858（boot 先于模块 import）/ v859（widget 场景 boot）。

import { describe, test, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bootDesktop } from './scenario-helpers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');

let W;

beforeAll(async () => {
  // boot 先于断言（state.js←main.js 启动链依赖完整引导序，v858/v859 同纪律）
  W = await bootDesktop();
  W.__lockTest.instantUnlock();
});

// ==================== A. 源码锚：九站守卫在位 ====================

describe('A. teardown 守卫源码锚（#232 typeof 守卫同族纪律）', () => {
  test('widget-board.js：clockTimer 1s 时钟守卫在位（run#447 实红站点）', () => {
    const s = src('ios-desktop/js/widget-board.js');
    expect(s).toContain("clockTimer = setInterval(() => {");
    expect(s).toMatch(/clockTimer = setInterval\(\(\) => \{\s*\n[^\}]*?if \(typeof document === 'undefined'\) \{ clearInterval\(clockTimer\); clockTimer = null; return; \}/);
  });

  test('widget-board.js：scheduleTimer 60s 日程轮询守卫在位', () => {
    const s = src('ios-desktop/js/widget-board.js');
    expect(s).toMatch(/scheduleTimer = setInterval\(\(\) => \{\s*\n[^\}]*?if \(typeof document === 'undefined'\) \{ clearInterval\(scheduleTimer\); scheduleTimer = null; return; \}/);
  });

  test('widget-board.js：pressTimer 两处长按守卫在位', () => {
    const s = src('ios-desktop/js/widget-board.js');
    const guards = s.match(/if \(typeof document === 'undefined'\) return;/g) || [];
    expect(guards.length).toBeGreaterThanOrEqual(2);
  });

  test('at-a-glance.js：cityTimer 30s 城市时钟守卫在位', () => {
    const s = src('ios-desktop/js/at-a-glance.js');
    expect(s).toMatch(/cityTimer = setInterval\(\(\) => \{\s*\n[^\}]*?if \(typeof document === 'undefined'\) \{ clearInterval\(cityTimer\); cityTimer = null; return; \}/);
  });

  test('focus.js：1s 专注 tick 守卫在位', () => {
    const s = src('ios-desktop/js/focus.js');
    expect(s).toMatch(/timer = setInterval\(\(\) => \{\s*\n[^\}]*?if \(typeof document === 'undefined'\) \{ clearInterval\(timer\); timer = null; return; \}/);
  });

  test('lock-screen.js：10s 锁屏时钟守卫在位（v837 刷新链序不破）', () => {
    const s = src('ios-desktop/js/lock-screen.js');
    expect(s).toMatch(/setInterval\(\(\) => \{\s*\n\s*if \(typeof document === 'undefined'\) return;\s*\n\s*refreshClock\(\);\s*\n\s*\}, 10000\)/);
  });

  test('quick-settings.js：zen 60s 规则 tick 守卫在位', () => {
    const s = src('ios-desktop/js/quick-settings.js');
    expect(s).toMatch(/setInterval\(\(\) => \{\s*\n\s*if \(typeof document === 'undefined'\) return;\s*\n\s*zenEvalRulesTick\(\);\s*\n\s*\}, 60000\)/);
  });

  test('quick-settings.js：recordTimerInterval 1s 录屏计时守卫在位', () => {
    const s = src('ios-desktop/js/quick-settings.js');
    expect(s).toMatch(/recordTimerInterval = setInterval\(\(\) => \{\s*\n[^\}]*?if \(typeof document === 'undefined'\) \{ clearInterval\(recordTimerInterval\); recordTimerInterval = null; return; \}/);
  });

  test('volume-dialog.js：hintTimer 500ms 静音提示轮询守卫在位', () => {
    const s = src('ios-desktop/js/volume-dialog.js');
    expect(s).toMatch(/hintTimer = setInterval\(\(\) => \{\s*\n[^\}]*?if \(typeof document === 'undefined'\) \{ clearInterval\(hintTimer\); hintTimer = null; return; \}/);
  });

  test('m3e.js：看门狗自清范式仍在（既有范例回归锚，本版未触碰）', () => {
    const s = src('ios-desktop/js/m3e.js');
    expect(s).toContain('if (stopped || !el.isConnected) { stopped = true; teardownWatchdog(); return; }');
  });

  test('main.js：顶层 1200ms 壁纸刷新回调守卫在位（run#491/#502 实红第三位点）', () => {
    const s = src('ios-desktop/js/main.js');
    expect(s).toMatch(/setTimeout\(\(\) => \{\s*\n\s*\/\/ #232 第三位点[\s\S]*?if \(typeof window === 'undefined' \|\| typeof document === 'undefined'\) return;\s*\n\s*if \(window\.__lockTest/);
  });

  test('main.js：__tryUnlockAnim 500ms 上锁回调守卫在位（同族位点，v10.90 同律）', () => {
    const s = src('ios-desktop/js/main.js');
    expect(s).toMatch(/setTimeout\(\(\) => \{\s*\n\s*\/\/ #232 同族守卫[\s\S]*?if \(typeof window === 'undefined' \|\| typeof document === 'undefined'\) return;\s*\n\s*lockNow\(\);\s*\n\s*\}, 500\)/);
  });
});

// ==================== B. 行为复现：teardown 后跨 tick 零 Unhandled ====================

describe('B. teardown 模拟（CI run#447 复现口径）', () => {
  test('document 全局移除 + rAF 帧死亡后，跨过一个 1s 时钟 tick 零 Unhandled Error', async () => {
    // 真实 vitest happy-dom teardown 语义：document/window 全局被移除，但 Node 层
    // setInterval/setTimeout 仍会触发；rAF 帧队列死亡（不再执行、也不再排程）。
    // 本测试用 stubGlobal 等价模拟：document=undefined + rAF=no-op（帧死亡，#232
    // desktop.js 的 typeof rAF 守卫不受影响——其检测 undefined，no-op 函数仍为函数，
    // 但帧回调永不执行，与 teardown 一致）。
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('requestAnimationFrame', () => 0);
    // 跨过一个完整 1s 时钟 tick（修复前：widget-board clockTimer 回调抛
    // TypeError/ReferenceError → Vitest Unhandled Error → run exit 1）
    await new Promise((r) => setTimeout(r, 1150));
    vi.unstubAllGlobals();
    // 走到这里即无 Unhandled（任何 teardown 窗口抛出都会让 run 红——与 CI 同判定口径）
    expect(W).toBeTruthy();
  });

  test('run#502 口径：window/document 双亡后跨 1.3s 覆盖 1200ms 壁纸刷新延迟窗零 Unhandled', async () => {
    // CI run#502（head=d0f34e0f）实锤：v64-heads-up 文件环境拆除后，main.js 顶层 1200ms
    // 壁纸刷新 setTimeout 仍在 Node 层触发 —— 真实 teardown 语义是 window 与 document
    // 双双移除（崩点在 window.__lockTest 处，先于 document 触碰），故本测 stub 双亡等价
    // 模拟，跨过 1.3s 覆盖 1200ms 延迟窗口。修复前此场景必现 ReferenceError → run 红。
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('requestAnimationFrame', () => 0);
    await new Promise((r) => setTimeout(r, 1300));
    vi.unstubAllGlobals();
    expect(W).toBeTruthy();
  });
});

// ==================== C. deploy.yml 配置锚（修复项③④落地在库） ====================

describe('C. deploy.yml 配置锚', () => {
  const yml = () => src('.github/workflows/deploy.yml');

  test('修复项④：cancel-in-progress: false（排队语义，终态收敛最新提交）', () => {
    expect(yml()).toContain('cancel-in-progress: false');
    expect(yml()).not.toContain('cancel-in-progress: true');
  });

  test('修复项③：gate-alert 告警 job 在位（failure + push 触发，issues: write）', () => {
    const y = yml();
    expect(y).toContain('gate-alert:');
    expect(y).toMatch(/if: failure\(\) && github\.event_name == 'push'/);
    expect(y).toContain('issues: write');
    expect(y).toContain('actions/github-script@v7');
    expect(y).toContain('issue_number: 18');
  });

  test('修复项②：claims 门禁步仍在 test job（不得因告警 job 增设而被移除）', () => {
    const y = yml();
    expect(y).toContain('Check comment claims (#149)');
    expect(y).toContain('node scripts/check-comment-claims.mjs');
  });
});
