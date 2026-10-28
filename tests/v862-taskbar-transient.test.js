// ==================== v862-taskbar-transient.test.js — #74 Transient Taskbar（#72 二期） ====================
//
// 覆盖（#74 DoD 逐条）：
//   · 纯函数核（taskbar-thresholds）：TaskbarThresholdUtils 阈值公式（短边/80 → dp → ×倍率，
//     自适应非硬编码 40dp）/ OverScroll.dampedScroll 阻尼语义 / unstashDecision 唤出方向距离判定 /
//     stashSwipeDecision 栏内下滑-甩动判定 / outsideStashDecision 栏外点按判定 /
//     followBackgroundAlpha 慢速阈值 alpha / transientArmed 在场武装判定
//   · 挂起标志位（TaskbarAutohideSuspendController）：位值与 lineage-24.0 一致 + hasAnyFlag 语义
//   · 场景 DOM：武装语境矩阵（桌面/常驻展开/常驻收纳/锁屏/All Apps/断点）/ 开收弹簧
//     （417ms 整定 + 400dp/s 初速）/ 5s 无交互自动收起（fake timers）/ 栏外点按立即收起
//     （真实 window 捕获派发链）/ 底部上滑唤出轨道（方向+距离）/ resize 阈值重算 /
//     edu 首次引导只弹一次 / 固定区数据单源（getDockItems）
//   · 接线锚：main.js 引入+初始化（initTaskbar 之后）/ index.html 样式链接 /
//     gestures.js 释放段仲裁块在册 / 数值原值锚（57/24/12/150/81/847/4.5/10/18/30/24/288/500/316）

import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bootDesktop, setScreenSize } from './scenario-helpers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');

// scheduleRender / 弹簧 rAF 走定时器驱动（happy-dom）—— DOM 断言前等一帧落定
const tick = () => new Promise((r) => setTimeout(r, 80));

let core;   // taskbar-core（#72 既有锚）
let th;     // taskbar-thresholds（#74 纯函数核）
let tt;     // taskbar-transient（#74 DOM 板）
let tb;     // taskbar.js（#72 常驻栏 hooks，制造常驻收纳态）
let W;
let hooks;
let tbHooks;

beforeAll(async () => {
  W = await bootDesktop(); // 手机断点 412×915 引导（main.js 全链含 initTransientTaskbar）
  W.__lockTest.instantUnlock();
  try { W.localStorage.removeItem('md3.tbTransientEdu'); } catch (e) { /* 忽略 */ }
  core = await import('../ios-desktop/js/taskbar-core.js');
  th = await import('../ios-desktop/js/taskbar-thresholds.js');
  tt = await import('../ios-desktop/js/taskbar-transient.js');
  tb = await import('../ios-desktop/js/taskbar.js');
  hooks = tt.__transientTestHooks();
  tbHooks = tb.__taskbarTestHooks();
});

// ==================== A. 阈值公式（TaskbarThresholdUtils 同构） ====================

describe('A1. computeTaskbarThreshold —— 短边/80 → dp → ×倍率（自适应公式）', () => {
  test('短边 800（1280×800 平板横屏）：nav=45 / appWindow=100 / homeOverview=180 / catchUp=300', () => {
    expect(th.taskbarThresholds(800)).toEqual({ nav: 45, appWindow: 100, homeOverview: 180, catchUp: 300 });
  });
  test('短边 768（1024×768）：nav=43（43.2 round）/ appWindow=96 / homeOverview=173（172.8）/ catchUp=288', () => {
    expect(th.taskbarThresholds(768)).toEqual({ nav: 43, appWindow: 96, homeOverview: 173, catchUp: 288 });
  });
  test('短边 412（手机竖屏）：nav=23 / appWindow=52 / homeOverview=93 / catchUp=155', () => {
    expect(th.taskbarThresholds(412)).toEqual({ nav: 23, appWindow: 52, homeOverview: 93, catchUp: 155 });
  });
  test('自适应性质：屏幕短边越大阈值越大（非 40dp 死值 —— 议题 §一.3 陷阱条款）', () => {
    const a = th.taskbarThresholds(600);
    const b = th.taskbarThresholds(1200);
    expect(b.nav).toBeGreaterThan(a.nav);
    expect(b.appWindow).toBeGreaterThan(a.appWindow);
    expect(b.homeOverview).toBeGreaterThan(a.homeOverview);
    expect(b.catchUp).toBeGreaterThan(a.catchUp);
  });
  test('基准数据点仅存档对照（40/88/156/264 为两台平板反推数据点，非生效值）', () => {
    expect(th.TASKBAR_THRESHOLD_BASELINE_DP).toEqual({ nav: 40, appWindow: 88, homeOverview: 156, catchUp: 264 });
    // 生效值 ≠ 数据点：短边 800 时 nav=45 ≠ 40
    expect(th.taskbarThresholds(800).nav).not.toBe(40);
  });
  test('SCREEN_UNITS=1/80 与倍率表原值（4.5/10/18/30）', () => {
    expect(th.TASKBAR_THRESHOLD_SCREEN_UNITS).toBe(1 / 80);
    expect(th.TASKBAR_THRESHOLD_MULTIPLIERS).toEqual({ nav: 4.5, appWindow: 10, homeOverview: 18, catchUp: 30 });
  });
  test('密度参数路径：stable≠density 时公式仍闭环（px→dp→px 往返）', () => {
    // stable=160, density=320 → thisDp 翻倍 → 阈值翻倍（dpiFromPx/dpToPx 往返同构验证）
    expect(th.computeTaskbarThreshold(800, 4.5, { density: 320 })).toBe(90);
    expect(th.computeTaskbarThreshold(800, 4.5, { stableDensity: 320 })).toBe(23); // 减半 → 22.5 → 23? 800/80=10→dp 10×(160/320)=5→px 5×(160/160)=5→5×4.5=22.5→round 23
  });
  test('零/负/非法输入返回 0（未布局防线）', () => {
    expect(th.computeTaskbarThreshold(0, 4.5)).toBe(0);
    expect(th.computeTaskbarThreshold(-100, 4.5)).toBe(0);
    expect(th.computeTaskbarThreshold(NaN, 4.5)).toBe(0);
  });
});

// ==================== B. 阻尼与 alpha（OverScroll.dampedScroll 语义） ====================

describe('B1. dampedScroll / followProgress / followBackgroundAlpha', () => {
  test('dampedScroll：d(0)=0、保号、渐近不越阈（d(∞)→max）', () => {
    expect(th.dampedScroll(0, 43)).toBe(0);
    expect(th.dampedScroll(-10, 43)).toBeLessThan(0);
    expect(th.dampedScroll(10, 43)).toBeGreaterThan(0);
    expect(th.dampedScroll(1e9, 43)).toBeCloseTo(43, 0); // 渐近上限
    expect(th.dampedScroll(1e9, 43)).toBeLessThanOrEqual(43);
  });
  test('dampedScroll：d=max 恰为半阈（max·max/(max+max)）', () => {
    expect(th.dampedScroll(43, 43)).toBeCloseTo(21.5, 5);
  });
  test('followProgress：单调、钳制 [0,1)、阈值处 = 0.5', () => {
    expect(th.followProgress(0, 43)).toBe(0);
    expect(th.followProgress(43, 43)).toBeCloseTo(0.5, 5);
    expect(th.followProgress(86, 43)).toBeGreaterThan(th.followProgress(43, 43));
    expect(th.followProgress(1e9, 43)).toBeLessThanOrEqual(1);
    expect(th.followProgress(100, 0)).toBe(0); // 零阈值防线
  });
  test('followBackgroundAlpha：慢速阈值 288 量纲、0→0、≥288→1', () => {
    expect(th.followBackgroundAlpha(0)).toBe(0);
    expect(th.followBackgroundAlpha(144)).toBeCloseTo(0.5, 5);
    expect(th.followBackgroundAlpha(288)).toBe(1);
    expect(th.followBackgroundAlpha(1000)).toBe(1);
    expect(Math.abs(th.TASKBAR_SLOW_VELOCITY_Y_THRESHOLD)).toBe(288);
  });
});

// ==================== C. 判定纯函数（§1.4 唤出 / §1.5 收起） ====================

describe('C1. unstashDecision（TaskbarUnstashInputConsumer ACTION_MOVE 同构）', () => {
  test('方向：dY<0（上滑）且 |dY|≥阈值 → fired', () => {
    expect(th.unstashDecision({ dy: -45, threshold: 43 }).fired).toBe(true);
  });
  test('方向不符：dY>0（下滑）不 fired', () => {
    expect(th.unstashDecision({ dy: 45, threshold: 43 }).fired).toBe(false);
  });
  test('距离不足：|dY|<阈值不 fired；恰等于阈值 fired（>= 语义）', () => {
    expect(th.unstashDecision({ dy: -42, threshold: 43 }).fired).toBe(false);
    expect(th.unstashDecision({ dy: -43, threshold: 43 }).fired).toBe(true);
  });
  test('扩展 slop 区不触发（isInExtendedSlopRegion 同构）+ 已触发过不重复', () => {
    expect(th.unstashDecision({ dy: -100, threshold: 43, inExtendedSlop: true }).fired).toBe(false);
    expect(th.unstashDecision({ dy: -100, threshold: 43, alreadyFired: true }).fired).toBe(false);
  });
});

describe('C2. stashSwipeDecision（TaskbarStashViaTouchController 同构）', () => {
  test('下滑 ≥24dp（taskbar_to_nav_threshold）→ swipe-down', () => {
    expect(th.stashSwipeDecision({ dy: 24 })).toEqual({ stashed: true, reason: 'swipe-down' });
    expect(th.stashSwipeDecision({ dy: 23 }).stashed).toBe(false);
    expect(th.TASKBAR_TO_NAV_THRESHOLD).toBe(24);
  });
  test('快速下滑甩动 ≥288px/s → fling-down（复用 slow_velocity 量纲，偏离已注明）', () => {
    expect(th.stashSwipeDecision({ dy: 5, velocityY: 288 })).toEqual({ stashed: true, reason: 'fling-down' });
    expect(th.stashSwipeDecision({ dy: 5, velocityY: 287 }).stashed).toBe(false);
    expect(th.TASKBAR_FLING_DOWN_VELOCITY).toBe(288);
  });
  test('慢速小幅移动不收起', () => {
    expect(th.stashSwipeDecision({ dy: 10, velocityY: 100 })).toEqual({ stashed: false, reason: '' });
  });
});

describe('C3. outsideStashDecision（ACTION_DOWN outside 语义）', () => {
  test('栏外点按 → 立即收起；栏内不收起；rect 缺失不误收', () => {
    const rect = { left: 500, top: 600, right: 700, bottom: 700 };
    expect(th.outsideStashDecision({ x: 100, y: 400, rect }).stashed).toBe(true);
    expect(th.outsideStashDecision({ x: 600, y: 650, rect }).stashed).toBe(false);
    expect(th.outsideStashDecision({ x: 600, y: 650, rect: null }).stashed).toBe(false);
  });
});

describe('C4. transientArmed（在场武装判定）', () => {
  const base = { isTablet: true, taskbarEnabled: true, inApp: true, allAppsOpen: false, locked: false, persistentExpanded: false };
  test('全条件满足 → true', () => {
    expect(th.transientArmed(base)).toBe(true);
  });
  test('任一条件缺失 → false（桌面态/常驻展开/锁屏/All Apps/手机断点/开关关）', () => {
    expect(th.transientArmed({ ...base, inApp: false })).toBe(false);            // 桌面态（常驻栏在场）
    expect(th.transientArmed({ ...base, persistentExpanded: true })).toBe(false); // 常驻栏展开在场
    expect(th.transientArmed({ ...base, locked: true })).toBe(false);
    expect(th.transientArmed({ ...base, allAppsOpen: true })).toBe(false);
    expect(th.transientArmed({ ...base, isTablet: false })).toBe(false);
    expect(th.transientArmed({ ...base, taskbarEnabled: false })).toBe(false);
    expect(th.transientArmed(null)).toBe(false);
  });
});

// ==================== D. 挂起标志位（TaskbarAutohideSuspendController） ====================

describe('D1. 自动隐藏挂起标志位（位值与 lineage-24.0 一致）', () => {
  test('位值：FULLSCREEN 1<<0 / DRAGGING 1<<1 / TOUCHING 1<<2 / EDU_OPEN 1<<3 / IN_LAUNCHER 1<<4 / TRANSIENT_TASKBAR 1<<5', () => {
    expect(th.FLAG_AUTOHIDE_SUSPEND_FULLSCREEN).toBe(1 << 0);
    expect(th.FLAG_AUTOHIDE_SUSPEND_DRAGGING).toBe(1 << 1);
    expect(th.FLAG_AUTOHIDE_SUSPEND_TOUCHING).toBe(1 << 2);
    expect(th.FLAG_AUTOHIDE_SUSPEND_EDU_OPEN).toBe(1 << 3);
    expect(th.FLAG_AUTOHIDE_SUSPEND_IN_LAUNCHER).toBe(1 << 4);
    expect(th.FLAG_AUTOHIDE_SUSPEND_TRANSIENT_TASKBAR).toBe(1 << 5);
  });
  test('isAutohideSuspended：任一挂起位即挂起（hasAnyFlag 同构）、0 不挂起', () => {
    expect(th.isAutohideSuspended(0)).toBe(false);
    for (const bit of [
      th.FLAG_AUTOHIDE_SUSPEND_FULLSCREEN, th.FLAG_AUTOHIDE_SUSPEND_DRAGGING,
      th.FLAG_AUTOHIDE_SUSPEND_TOUCHING, th.FLAG_AUTOHIDE_SUSPEND_EDU_OPEN,
      th.FLAG_AUTOHIDE_SUSPEND_IN_LAUNCHER, th.FLAG_AUTOHIDE_SUSPEND_TRANSIENT_TASKBAR,
    ]) {
      expect(th.isAutohideSuspended(bit)).toBe(true);
    }
    expect(th.isAutohideSuspended(th.FLAG_AUTOHIDE_SUSPEND_TOUCHING | th.FLAG_AUTOHIDE_SUSPEND_DRAGGING)).toBe(true);
  });
});

// ==================== E. 场景 DOM（bootDesktop 全链 + hooks） ====================

describe('E1. 武装语境矩阵（真实语境 → armed）', () => {
  beforeAll(async () => {
    setScreenSize(1280, 800); // 平板横屏
    W.dispatchEvent(new W.Event('resize'));
    await tick();
  });

  test('桌面态（非应用内）→ 不武装（常驻栏在场）', () => {
    W.__state.isOpen = false;
    tbHooks.evaluateStash();
    expect(hooks.armed).toBe(false);
    expect(hooks.el.getAttribute('data-armed')).toBe('0');
  });
  test('应用内 + 常驻栏展开 → 不武装（AOSP isTaskbarPresentInApps=false 反前提）', async () => {
    W.__state.isOpen = true;
    W.__state.currentApp = { id: 'calc' };
    tbHooks.unstash('reset'); // 清 AUTO 位 → 常驻栏展开
    await tick();
    expect(tbHooks.el.classList.contains('stashed')).toBe(false);
    expect(hooks.armed).toBe(false);
  });
  test('应用内 + 常驻栏收纳（5s AUTO 语义）→ 武装', async () => {
    tbHooks.forceStash(true); // AUTO 位 → 常驻栏收纳（真实 5s 后的稳态）
    hooks.syncPresence(); // data-armed 投影刷新（armedNow 本身为即时计算，_attr 为同步点投影）
    await tick();
    expect(tbHooks.el.classList.contains('stashed')).toBe(true);
    expect(hooks.armed).toBe(true);
    expect(hooks.el.getAttribute('data-armed')).toBe('1');
  });
  test('锁屏 → 不武装', async () => {
    W.document.body.classList.add('is-locked');
    expect(hooks.armed).toBe(false);
    W.document.body.classList.remove('is-locked');
    await tick();
  });
  test('手机断点（<768）→ 不武装；回到平板断点恢复', async () => {
    setScreenSize(412, 915);
    W.dispatchEvent(new W.Event('resize'));
    await tick();
    expect(hooks.armed).toBe(false);
    setScreenSize(1280, 800);
    W.dispatchEvent(new W.Event('resize'));
    await tick();
    expect(hooks.armed).toBe(true);
  });
  test('开关关闭（taskbarEnabled=false）→ 不武装；恢复后重武装', async () => {
    W.__desktopPrefs.set('taskbarEnabled', false);
    await tick();
    expect(hooks.armed).toBe(false);
    W.__desktopPrefs.set('taskbarEnabled', true);
    await tick();
    expect(hooks.armed).toBe(true);
  });
});

describe('E2. 开/收弹簧与 5s 自动收起（417ms 整定 + 400dp/s 初速）', () => {
  beforeAll(async () => {
    setScreenSize(1280, 800);
    W.dispatchEvent(new W.Event('resize'));
    W.__state.isOpen = true;
    W.__state.currentApp = { id: 'calc' };
    tbHooks.forceStash(true);
    await tick();
  });
  afterAll(async () => {
    hooks.stashTransient('cleanup');
    W.__state.isOpen = false;
    W.__state.currentApp = null;
    tbHooks.evaluateStash(); // 清 AUTO 位 + 计时器，防泄漏
    await tick();
  });

  test('openTransient：data-open=1 + 弹簧目标 1 + TRANSIENT_TASKBAR 挂起位 + 5s 计时在场', () => {
    expect(hooks.openTransient('test')).toBe(true);
    expect(hooks.openFlag).toBe(true);
    expect(hooks.el.getAttribute('data-open')).toBe('1');
    expect(hooks.springTarget).toBe(1);
    expect(hooks.suspendFlags & th.FLAG_AUTOHIDE_SUSPEND_TRANSIENT_TASKBAR).toBeTruthy();
    expect(hooks.stashTimerArmed).toBe(true);
  });
  test('5s 无交互自动收起（NO_TOUCH_TIMEOUT_TO_STASH_MS=5000 原值，fake timers）', () => {
    vi.useFakeTimers();
    try {
      hooks.openTransient('test-fake'); // 重开 → 重置 5s 计时
      expect(hooks.stashTimerArmed).toBe(true);
      vi.advanceTimersByTime(4999);
      expect(hooks.openFlag).toBe(true); // 4999ms 未到点
      vi.advanceTimersByTime(1);
      expect(hooks.openFlag).toBe(false); // 5000ms 整点收起
      expect(hooks.springTarget).toBe(0);
      expect(hooks.el.getAttribute('data-open')).toBe('0');
      expect(hooks.el.getAttribute('data-stash-reason')).toBe('auto-timeout');
      expect(hooks.stashTimerArmed).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
  test('收起后挂起位复位（TRANSIENT_TASKBAR 清除）', async () => {
    hooks.openTransient('test');
    await tick();
    hooks.stashTransient('test');
    await tick();
    expect(hooks.suspendFlags & th.FLAG_AUTOHIDE_SUSPEND_TRANSIENT_TASKBAR).toBe(0);
  });
  test('固定区数据单源 getDockItems（#72 复用零新造）≥4 项', () => {
    hooks.renderApps();
    const ids = [...hooks.el.querySelectorAll('.tbt-icon')].map((b) => b.getAttribute('data-id'));
    expect(ids.length).toBeGreaterThanOrEqual(4);
    expect(ids).toContain('phone');
    expect(hooks.el.getAttribute('data-app-count')).toBe(String(ids.length));
  });
});

describe('E3. 真实派发链（window 捕获监听：唤出轨道 + 栏外点按收起）', () => {
  beforeAll(async () => {
    setScreenSize(1280, 800);
    W.dispatchEvent(new W.Event('resize'));
    W.__state.isOpen = true;
    W.__state.currentApp = { id: 'calc' };
    tbHooks.forceStash(true);
    await tick();
  });
  afterAll(async () => {
    hooks.stashTransient('cleanup');
    await tick();
  });

  test('底部上滑越过 nav 阈值 → 唤出（方向+距离真实派发）', async () => {
    const PE = W.PointerEvent || W.MouseEvent;
    const y0 = 795; // 底部手势带（800-75=725 以下）
    W.dispatchEvent(new PE('pointerdown', { pointerId: 7, clientX: 150, clientY: y0, bubbles: true }));
    expect(hooks.track).toBeTruthy(); // 轨道建立
    expect(hooks.track.fired).toBe(false);
    // 分步上滑 60px（> nav 45，< appWindow 100 —— DoD「不超 app_window 阈值」段内）
    for (let i = 1; i <= 6; i++) {
      W.dispatchEvent(new PE('pointermove', { pointerId: 7, clientX: 150, clientY: y0 - i * 10, bubbles: true }));
    }
    expect(hooks.track.fired).toBe(true);
    expect(hooks.openFlag).toBe(true); // 唤出已触发
    expect(hooks.suspendFlags & th.FLAG_AUTOHIDE_SUSPEND_DRAGGING).toBeTruthy();
    W.dispatchEvent(new PE('pointerup', { pointerId: 7, clientX: 150, clientY: y0 - 60, bubbles: true }));
    expect(hooks.openFlag).toBe(true); // 松手后弹簧补完展开
    expect(hooks.springTarget).toBe(1);
    await tick();
  });
  test('未达阈值上滑（< nav 45px）→ 不唤出', async () => {
    hooks.stashTransient('reset');
    await tick();
    const PE = W.PointerEvent || W.MouseEvent;
    const y0 = 795;
    W.dispatchEvent(new PE('pointerdown', { pointerId: 8, clientX: 150, clientY: y0, bubbles: true }));
    W.dispatchEvent(new PE('pointermove', { pointerId: 8, clientX: 150, clientY: y0 - 30, bubbles: true }));
    W.dispatchEvent(new PE('pointerup', { pointerId: 8, clientX: 150, clientY: y0 - 30, bubbles: true }));
    expect(hooks.openFlag).toBe(false);
  });
  test('下滑方向（dY>0）永不唤出', async () => {
    const PE = W.PointerEvent || W.MouseEvent;
    W.dispatchEvent(new PE('pointerdown', { pointerId: 9, clientX: 150, clientY: 730, bubbles: true }));
    W.dispatchEvent(new PE('pointermove', { pointerId: 9, clientX: 150, clientY: 730 + 200, bubbles: true }));
    W.dispatchEvent(new PE('pointerup', { pointerId: 9, clientX: 150, clientY: 930, bubbles: true }));
    expect(hooks.openFlag).toBe(false);
  });
  test('栏外点按 → 立即收起（ACTION_DOWN outside）', async () => {
    hooks.openTransient('test');
    await tick();
    expect(hooks.openFlag).toBe(true);
    const PE = W.PointerEvent || W.MouseEvent;
    W.dispatchEvent(new PE('pointerdown', { pointerId: 10, clientX: 100, clientY: 300, bubbles: true }));
    expect(hooks.openFlag).toBe(false);
    expect(hooks.el.getAttribute('data-stash-reason')).toBe('outside-tap');
  });
  test('resize 阈值重算（data-short-side / data-nav-threshold 随断点更新）', async () => {
    setScreenSize(1024, 768);
    W.dispatchEvent(new W.Event('resize'));
    await tick();
    expect(hooks.el.getAttribute('data-short-side')).toBe('768');
    expect(hooks.el.getAttribute('data-nav-threshold')).toBe('43'); // round(768/80×4.5)
    expect(hooks.el.getAttribute('data-app-window-threshold')).toBe('96');
    setScreenSize(1280, 800);
    W.dispatchEvent(new W.Event('resize'));
    await tick();
    expect(hooks.el.getAttribute('data-short-side')).toBe('800');
    expect(hooks.el.getAttribute('data-nav-threshold')).toBe('45');
  });
});

describe('E4. 首次引导（taskbar_edu_standalone 语义·只弹一次）', () => {
  beforeAll(async () => {
    setScreenSize(1280, 800);
    W.dispatchEvent(new W.Event('resize'));
    W.__state.isOpen = true;
    W.__state.currentApp = { id: 'calc' };
    tbHooks.forceStash(true);
  });

  test('首次武装（E1 开关恢复用例已消费）→ localStorage 标记已写入', async () => {
    // 首次 armed syncPresence 已在 E1「开关恢复重武装」发生：eduDone 消费 + 标记落盘
    expect(W.localStorage.getItem('md3.tbTransientEdu')).toBe('1');
  });
  test('标记/eduDone 已消费 → 后续武装不再弹出（只弹一次）', async () => {
    hooks.el.querySelector('.tbt-edu').classList.remove('show');
    hooks.stashTransient('reset');
    await tick();
    hooks.syncPresence();
    await tick();
    expect(hooks.el.querySelector('.tbt-edu').classList.contains('show')).toBe(false);
  });
});

// ==================== F. 接线锚与原值锚 ====================

describe('F. 接线锚与原值锚', () => {
  test('main.js：initTransientTaskbar 引入 + 初始化（initTaskbar 之后）', () => {
    const m = src('ios-desktop/js/main.js');
    expect(m).toContain("import { initTransientTaskbar } from './taskbar-transient.js'");
    expect(m.indexOf('initTaskbar();')).toBeGreaterThan(-1);
    expect(m.indexOf('initTransientTaskbar();')).toBeGreaterThan(m.indexOf('initTaskbar();'));
  });
  test('index.html：taskbar-transient.css 样式链接在册', () => {
    expect(src('ios-desktop/index.html')).toContain('css/taskbar-transient.css');
  });
  test('gestures.js：释放段仲裁块在册（claim 读取 + app_window 阈值 + 回弹）', () => {
    const g = src('ios-desktop/js/gestures.js');
    expect(g).toContain('__tbTransientClaim');
    expect(g).toContain('__tbTransientThresholds');
    expect(g).toContain('appWindowThr');
  });
  test('taskbar-transient.js：#72 数据层/弹簧参数单源引用（不重复造数据层）', () => {
    const t = src('ios-desktop/js/taskbar-transient.js');
    expect(t).toContain("from './taskbar-core.js'");
    expect(t).toContain('STASH_SPRING_STIFFNESS');
    expect(t).toContain('NO_TOUCH_TIMEOUT_TO_STASH_MS');
    expect(t).toContain("from './dock.js'"); // getDockItems 单源
    expect(t).toContain('getDockItems()');
  });
  test('弹簧纪律：位置动效不经 CSS transition（html.no-anim 不杀动效）', () => {
    const t = src('ios-desktop/js/taskbar-transient.js');
    expect(t).not.toContain('style.transition');
    const c = src('ios-desktop/css/taskbar-transient.css');
    // CSS transition 仅承载图标 alpha（与 taskbar.css 指示条同纪律），位置量纲归弹簧
    expect(c).toContain('transition: opacity');
    expect(c).not.toMatch(/\.tbt-bar\s*{[^}]*transition:\s*transform/);
  });
  test('观察者纪律：手势三件套 capture + passive、零 preventDefault/stopPropagation 调用', () => {
    const t = src('ios-desktop/js/taskbar-transient.js');
    expect(t).toContain("capture: true, passive: true");
    expect(t).not.toMatch(/\.\s*preventDefault\s*\(/);
    expect(t).not.toMatch(/\.\s*stopPropagation\s*\(/);
  });
  test('原值锚：57/24/12/150/81/847/400dp·s⁻¹（§1.6 实测值在册）', () => {
    expect(core.TRANSIENT_TASKBAR_ICON_SIZE).toBe(57);
    expect(core.TRANSIENT_TASKBAR_BOTTOM_MARGIN).toBe(24);
    expect(tt.TRANSIENT_TASKBAR_PADDING).toBe(12);
    expect(tt.TRANSIENT_BAR_HEIGHT).toBe(81); // 57 + 2×12
    const c = src('ios-desktop/css/taskbar-transient.css');
    expect(c).toContain('bottom: 24px');
    expect(c).toContain('min-width: 150px');
    expect(c).toContain('z-index: 847');
    expect(c).toContain('margin-left: 8px'); // all_apps_button_translation_x_offset
    expect(th.TASKBAR_UNSTASH_INPUT_AREA_DP).toBe(316);
    expect(th.HOVER_TASKBAR_UNSTASH_TIMEOUT).toBe(500);
  });
  test('层级锚：847 高于常驻手柄 846/常驻栏 845/分屏 760/小窗 590，低于 All Apps 浮层 848/shade 850', () => {
    const c = src('ios-desktop/css/taskbar-transient.css');
    expect(c).toContain('z-index: 847');
    const tbCss = src('ios-desktop/css/taskbar.css');
    expect(tbCss).toContain('z-index: 845');
    const aaCss = src('ios-desktop/css/all-apps.css');
    expect(aaCss).toMatch(/z-index:\s*848/);
  });
});
