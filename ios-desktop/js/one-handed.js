// ==================== one-handed.js — AOSP OneHanded DOM 面 · 单手模式（#204） ====================
//
// 纯逻辑在 aosp/one-handed.js（OneHandedController/State/TimeoutHandler/TouchHandler 同构）；
// 本文件是 DOM 面：根容器变换 / 超时计时 / 触摸退出 / 触发通道接线。
//
// 【AOSP 机制对照（main 实锚）】
//   · 屏幕变换：DisplayArea translateY(offset=40%)，600ms 动画
//     （config_one_handed_translate_animation_duration=600；曲线 web 裁决 md tokens.decel
//     三正典 [0.05,0.7,0.1,1]，motion.js 禁手写贝塞尔纪律）
//   · 状态栏/QS 不随迁：AOSP 迁移的是 DisplayArea（应用层），SystemUI 窗口恒全屏——
//     md3 落地 #desktop（z-index:1）下移，状态栏/dual-shade（更高 z 的 fixed 覆盖层）不动，
//     下拉 QS/通知面照常全屏 ✓（#204 验收 4）
//   · 退出三通道（TouchHandler + TimeoutHandler）：上滑导航条 / 点外部区域（y < bounds.top）
//     / 超时自动退出（默认 MEDIUM 8s，触摸内部区域 resetTimer——L87-90）
//   · 触发：导航条下拉（swipe_down_to_enter）/ QS 磁贴（OneHandedTile active=已进入态）
//
// 【web 落地裁决（在录）】
//   · bounds.top = 显示高度 × 0.40（迁移后 DisplayArea 顶；外部区域 = 顶带空隙）
//   · 大屏禁用：canEnterOneHanded 收 innerWidth（600px 断点，TABLET_MIN_WIDTH 同款）；
//     QS 编辑器目录同步隐藏 one_handed（quick-settings.js 侧）
//   · 磁贴 active 同源：'one-handed-changed' CustomEvent → quick-settings.js 同步
//     activeTiles 里 one_handed.active 并 refreshTilePill（零 import，事件解耦）
//   · setTimeout 由本文件承担（纯逻辑只算语义）；超时档位持久化 localStorage
//     one_handed_timeout_v1（0/4/8/12 秒档，AOSP Settings.Secure.ONE_HANDED_MODE_TIMEOUT 同构）
//   · 窗口钩子 window.__oneHanded（showSystemToast/monetReroll 同款零 import 惯例）：
//     quick-settings 磁贴 click / nav-bar 手势消费

import {
  STATE_NONE, STATE_ENTERING, STATE_ACTIVE, STATE_EXITING,
  CONFIG_ONE_HANDED_TRANSLATE_ANIMATION_DURATION,
  canEnterOneHanded, createOneHandedState, createOneHandedTouchHandler,
  offsetForHeight, resolveTimeoutSeconds, shouldScheduleTimeout, timeoutExpiresAt,
} from './aosp/one-handed.js';

const TIMEOUT_STORAGE_KEY = 'one_handed_timeout_v1';
const DESKTOP_ROOT_ID = 'desktop';
/** 过渡落定等待（600ms config 值；transitionend 在后台标签页不可靠，定时器兜底） */
const TRANSITION_SETTLE_MS = CONFIG_ONE_HANDED_TRANSLATE_ANIMATION_DURATION;

let state = null;
let touch = null;
let timeoutTimer = 0;
let settleTimer = 0;
let timeoutSeconds = 8; // 默认 MEDIUM（resolveTimeoutSeconds 兜底）

function readTimeoutSetting() {
  try {
    const raw = (typeof localStorage !== 'undefined') && localStorage.getItem(TIMEOUT_STORAGE_KEY);
    if (raw == null) return 8;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 8;
  } catch (err) { return 8; }
}

function dispatchChanged() {
  try {
    window.dispatchEvent(new CustomEvent('one-handed-changed', {
      detail: { state: state.getState(), active: state.isInOneHanded() },
    }));
  } catch (err) { /* 非浏览器环境静默 */ }
}

/** 迁移后 bounds.top = 显示高度 × offset（40%） */
function boundsTop() {
  return offsetForHeight(window.innerHeight || 0);
}

function clearTimers() {
  if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = 0; }
  if (settleTimer) { clearTimeout(settleTimer); settleTimer = 0; }
}

/** 超时调度（TimeoutHandler.scheduleTimeout 语义：NEVER 零调度） */
function scheduleTimeout() {
  if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = 0; }
  if (!shouldScheduleTimeout(timeoutSeconds)) return;
  timeoutTimer = setTimeout(() => {
    timeoutTimer = 0;
    exit('timeout');
  }, resolveTimeoutSeconds(timeoutSeconds) * 1000);
}

/** 触摸内部区域 resetTimer（TimeoutHandler.resetTimer 语义） */
function resetTimeout() {
  if (state.getState() !== STATE_ACTIVE) return;
  if (!shouldScheduleTimeout(timeoutSeconds)) return;
  if (timeoutTimer) clearTimeout(timeoutTimer);
  timeoutTimer = setTimeout(() => {
    timeoutTimer = 0;
    exit('timeout');
  }, resolveTimeoutSeconds(timeoutSeconds) * 1000);
}

function applyTransform(on) {
  const root = document.getElementById(DESKTOP_ROOT_ID);
  if (!root) return;
  root.style.transition = `transform ${TRANSITION_SETTLE_MS}ms cubic-bezier(0.05, 0.7, 0.1, 1)`;
  if (on) {
    root.style.transform = `translateY(${offsetForHeight(window.innerHeight || 0)}px)`;
  } else {
    root.style.transform = '';
  }
}

/**
 * 进入单手模式（OneHandedController.startOneHanded 语义）
 * @param {{ source?: string }} [opts] source: 'tile'|'navbar_swipe'|'api'（UiEventLogger 语义留痕）
 * @returns {boolean} 是否接受
 */
export function enter(opts = {}) {
  if (!state) return false;
  const verdict = canEnterOneHanded({
    enabled: true,
    screenWidthPx: window.innerWidth || 0,
    transitioning: state.isTransitioning(),
  });
  if (!verdict.ok) {
    // 大屏禁用 / 过渡互斥：静默拒绝（AOSP canStartOneHanded false 同语义）
    return false;
  }
  if (state.getState() !== STATE_NONE) return false;
  if (!state.transitionTo(STATE_ENTERING)) return false;
  applyTransform(true);
  settleTimer = setTimeout(() => {
    settleTimer = 0;
    state.transitionTo(STATE_ACTIVE);
    scheduleTimeout();
    dispatchChanged();
  }, TRANSITION_SETTLE_MS);
  dispatchChanged();
  return true;
}

/**
 * 退出单手模式（OneHandedController.stopOneHanded 语义）
 * @param {string} [reason] 'tile'|'navbar_swipe'|'outside_touch'|'timeout'|'api'
 * @returns {boolean}
 */
export function exit(reason = 'api') {
  if (!state) return false;
  if (state.getState() !== STATE_ACTIVE && state.getState() !== STATE_ENTERING) return false;
  if (timeoutTimer) { clearTimeout(timeoutTimer); timeoutTimer = 0; }
  if (settleTimer) { clearTimeout(settleTimer); settleTimer = 0; }
  state.transitionTo(STATE_EXITING);
  applyTransform(false);
  settleTimer = setTimeout(() => {
    settleTimer = 0;
    state.transitionTo(STATE_NONE);
    touch.resetStopGate();
    dispatchChanged();
  }, TRANSITION_SETTLE_MS);
  void reason; // 留痕参数（UiEventLogger 语义，非首版必需）
  dispatchChanged();
  return true;
}

/** 磁贴/手势 toggle 入口 */
export function toggle() {
  if (state && (state.isInOneHanded() || state.getState() === STATE_ENTERING)) exit('tile');
  else enter({ source: 'tile' });
}

/** 全局触摸监听（TouchHandler InputMonitor 同构：active 态时消费全屏指针） */
function onPointer(ev) {
  if (!state || state.getState() !== STATE_ACTIVE) return;
  const top = boundsTop();
  const action = ev.type === 'pointerdown' ? 'down'
    : ev.type === 'pointermove' ? 'move'
      : ev.type === 'pointerup' ? 'up' : 'cancel';
  const result = touch.consume(action, ev.clientY, top);
  if (result.resetTimer) resetTimeout();
  if (result.stop) exit('outside_touch');
}

/** 初始化（main.js initXXX 惯例；幂等） */
export function initOneHanded() {
  if (state) return;
  state = createOneHandedState();
  touch = createOneHandedTouchHandler();
  timeoutSeconds = readTimeoutSetting();
  window.addEventListener('pointerdown', onPointer, true);
  window.addEventListener('pointermove', onPointer, true);
  window.addEventListener('pointerup', onPointer, true);
  window.addEventListener('pointercancel', onPointer, true);
  // 窗口钩子（showSystemToast 同款零 import 惯例）：quick-settings / nav-bar / e2e 消费
  window.__oneHanded = {
    enter: () => enter({ source: 'api' }),
    exit: () => exit('api'),
    toggle,
    isIn: () => !!(state && state.isInOneHanded()),
    state: () => (state ? state.getState() : STATE_NONE),
    setStateForTest: (s) => { if (state) state.setState(s); },
    getTimeoutSeconds: () => timeoutSeconds,
  };
}

/** 模块级导出状态常量（quick-settings 同源消费用） */
export { STATE_NONE, STATE_ENTERING, STATE_ACTIVE, STATE_EXITING, timeoutExpiresAt };
