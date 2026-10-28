// ==================== taskbar-transient.js — Transient Taskbar 悬浮任务栏（#74，#72 二期） ====================
//
// 职责（议题 §四 执行计划 一期+二期+三期）：
//   1. 应用全屏（state.isOpen）+ 平板断点（≥768）+ 常驻任务栏已收纳（无栏在场）时，
//      底部上滑越过唤出阈值（taskbar-thresholds 公式：短边/80×4.5）→ 浮出圆角悬浮栏
//      （AOSP TaskbarUnstashInputConsumer.unstash 同构）
//   2. 跟手阻尼：唤出后继续上滑走 OverScroll.dampedScroll 语义映射（dampedScroll 渐近不越阈）
//   3. 三条收起路径：5s 无交互自动收起（NO_TOUCH_TIMEOUT_TO_STASH_MS）/ 栏内下滑 24dp 或
//      快速甩动（TaskbarStashViaTouchController）/ 点栏外立即收起（ACTION_DOWN outside）
//   4. 自动隐藏挂起标志位（TaskbarAutohideSuspendController）：TOUCHING/DRAGGING/
//      TRANSIENT_TASKBAR/IN_LAUNCHER
//   5. 悬浮视觉：完整圆角浮栏（非贴底矩形）、离底 24dp、最小宽 150dp、图标 57dp、
//      内边距 12dp、1dp 描边、阴影 blur 40 / 距离 10（TaskbarBackgroundRenderer 同构）
//   6. 内容：固定应用（getDockItems 单源，#72 数据层复用零新造）+ All Apps 按钮
//      （translation_x_offset=8dp）→ openAllApps 触发 #73 平板浮层
//   7. 首次引导（taskbar_edu_standalone 语义）：本地存标记只弹一次
//
// 纪律：
//   · 手势仲裁：本板为**观察者**——capture 阶段监听、零 preventDefault/stopPropagation，
//     不打断 gestures.js/nav-bar.js 既有链路；唯一切入点 = 释放段仲裁
//     （window.__tbTransientClaim，gestures.js BOTTOM 释放分支读取，见该文件 v8.62 块）
//   · 与 #72 常驻栏互让：常驻栏展开在场时悬浮栏不武装；常驻栏收纳态的底部中央
//     316dp×24px 触碰区仍归 #72（bottom-touch 即时唤出常驻栏，既有锚不破坏）
//   · 位置动效走 spring.js（417ms 整定参数复用 taskbar-core STASH_SPRING_*，不经 CSS transition）
//   · 图标 alpha：unstash 150ms / stash 50ms（源码双时长，CSS transition 承载——
//     与 taskbar.css 指示条 opacity 同纪律，位置量纲仍归弹簧）

import { state } from './state.js';
import { initialApps } from './apps-data.js';
import { getAppIconSVG } from './app-icons.js';
import { openApp } from './app-window.js';
import { openAllApps } from './all-apps.js';
import { getDockItems } from './dock.js';
import { getDesktopPrefs, isTabletSize } from './desktop-prefs.js';
import { Spring } from './spring.js';
import {
  STASH_SPRING_STIFFNESS, STASH_SPRING_DAMPING, STASH_SPRING_INITIAL_VELOCITY_DP_PER_S,
  NO_TOUCH_TIMEOUT_TO_STASH_MS, TRANSIENT_TASKBAR_ICON_SIZE,
  TRANSIENT_TASKBAR_BOTTOM_MARGIN, TASKBAR_UNSTASH_INPUT_AREA,
} from './taskbar-core.js';
import {
  taskbarThresholds, unstashDecision, stashSwipeDecision, outsideStashDecision,
  followProgress, followBackgroundAlpha, transientArmed,
  FLAG_AUTOHIDE_SUSPEND_DRAGGING, FLAG_AUTOHIDE_SUSPEND_TOUCHING,
  FLAG_AUTOHIDE_SUSPEND_IN_LAUNCHER, FLAG_AUTOHIDE_SUSPEND_TRANSIENT_TASKBAR,
  isAutohideSuspended,
} from './taskbar-thresholds.js';

// ---- 几何常量（§1.6 实测原值 + 推导注明） ----
/** transient_taskbar_padding —— 悬浮栏内边距 */
export const TRANSIENT_TASKBAR_PADDING = 12;
/** 悬浮栏高 = 图标 57 + 2×12 内边距（quickstep transient_taskbar_height 同量级；按议题给定值推导 81） */
export const TRANSIENT_BAR_HEIGHT = TRANSIENT_TASKBAR_ICON_SIZE + 2 * TRANSIENT_TASKBAR_PADDING;
/** 收起位隐藏偏移（栏高 + 底距 + 12 缓冲，保证完全出视口） */
const HIDE_OFFSET = TRANSIENT_BAR_HEIGHT + TRANSIENT_TASKBAR_BOTTOM_MARGIN + 12;
/** 底部手势起始带高（与 gestures.js BOTTOM 75px 命中对齐） */
const BOTTOM_BAND = 75;
/** 首次引导展示时长 */
const EDU_SHOW_MS = 3500;
/** 首次引导 localStorage 键 */
const EDU_KEY = 'md3.tbTransientEdu';

let rootEl = null;    // .tb-transient（承载 data-* 状态 + edu 提示）
let barEl = null;     // .tbt-bar（悬浮栏本体）
let appsEl = null;    // .tbt-apps（固定应用区）
let allAppsBtnEl = null;
let eduEl = null;     // .tbt-edu（首次引导提示）

/** 内部简写别名（事件回调闭包用；stashTransient 为提升的函数声明，此处绑定安全） */
const stash = (reason) => stashTransient(reason);

let openFlag = false;        // 悬浮栏是否展开（含动画中）
let spring = null;           // 进度 p：0=收起 1=展开
let rafId = 0;
let suspendFlags = 0;        // TaskbarAutohideSuspendController 位集
let stashTimer = 0;          // 5s 无交互自动收起
let eduDone = false;

// ---- 阈值缓存（resize/断点变化时重算 —— DoD「跨 768px 断点 resize 阈值重算」） ----
let thr = { nav: 0, appWindow: 0, homeOverview: 0, catchUp: 0 };
let shortSide = 0;

// ---- 手势轨道 ----
// unstash 轨道：底部上滑（armed 态）；fired = 已越过 nav 阈值（唤出已触发）
let track = null;
// 栏内轨道：悬浮栏展开时的栏内下滑收起轨道
let barTrack = null;
// 释放段仲裁信物（gestures.js BOTTOM 释放分支读取消费）
// 结构 {state:'armed'|'fired', at:epoch-ms}；3s 新鲜度 + 下次轨道建立时覆盖

function appIndexById(id) {
  return initialApps.findIndex((a) => a.id === id);
}
function appById(id) {
  return initialApps.find((a) => a.id === id) || null;
}

// ==================== 阈值重算与在场同步 ====================

export function recomputeThresholds() {
  shortSide = Math.min(window.innerWidth || 0, window.innerHeight || 0);
  thr = taskbarThresholds(shortSide);
  if (rootEl) {
    rootEl.setAttribute('data-short-side', String(shortSide));
    rootEl.setAttribute('data-nav-threshold', String(thr.nav));
    rootEl.setAttribute('data-app-window-threshold', String(thr.appWindow));
  }
  return thr;
}

/** 常驻任务栏（#72）是否展开在场（悬浮栏武装的反前提） */
function persistentExpanded() {
  const tb = document.getElementById('taskbar');
  if (!tb || !tb.isConnected) return false;
  if (tb.classList.contains('hidden') || tb.classList.contains('tb-fully-hidden')) return false;
  if (tb.classList.contains('stashed')) return false;
  return document.body.classList.contains('taskbar-on');
}

function allAppsActive() {
  const el = document.getElementById('allAppsOverlay');
  return !!(el && el.classList.contains('active'));
}

function currentContext() {
  const prefs = getDesktopPrefs();
  return {
    isTablet: isTabletSize(),
    taskbarEnabled: !!(prefs && prefs.taskbarEnabled),
    inApp: !!state.isOpen,
    allAppsOpen: allAppsActive(),
    locked: document.body.classList.contains('is-locked'),
    persistentExpanded: persistentExpanded(),
  };
}

function armedNow() {
  return transientArmed(currentContext());
}

function recentsActive() {
  const el = document.getElementById('recentAppsOverlay');
  return !!(el && el.classList.contains('active'));
}

/** 悬浮栏在场语境失守（应用关闭/All Apps/概览/锁屏/断点离开/常驻栏展开）→ 立即收起 */
export function syncPresence() {
  if (!rootEl || !rootEl.isConnected) return false;
  const ctx = currentContext();
  const armed = transientArmed(ctx);
  rootEl.setAttribute('data-armed', armed ? '1' : '0');
  if (!armed && openFlag) stash('context-lost');
  if (ctx.locked) { /* 锁屏：栏随 context-lost 收起 + edu 不弹 */ }
  else if (armed && !openFlag && !eduDone) maybeShowEdu();
  recomputeSuspend();
  return armed;
}

// ==================== 挂起标志位（recompute 式：全量重算防泄漏） ====================

function recomputeSuspend() {
  let f = 0;
  if (openFlag) f |= FLAG_AUTOHIDE_SUSPEND_TRANSIENT_TASKBAR;
  if (!state.isOpen) f |= FLAG_AUTOHIDE_SUSPEND_IN_LAUNCHER;
  if (track) f |= FLAG_AUTOHIDE_SUSPEND_TOUCHING;
  if (track && track.fired) f |= FLAG_AUTOHIDE_SUSPEND_DRAGGING;
  suspendFlags = f;
  if (rootEl) rootEl.setAttribute('data-suspend-flags', String(f));
  return f;
}

// ==================== 渲染 ====================

function iconBtnHTML(id) {
  const app = appById(id);
  const name = app ? app.name : id;
  return `<button type="button" class="tbt-icon" data-id="${id}" aria-label="${name}">` +
    `<span class="tbt-icon-img">${getAppIconSVG(id)}</span></button>`;
}

export function renderApps() {
  if (!appsEl || !appsEl.isConnected) return;
  // 固定应用单源 = getDockItems（#72 数据层复用，议题 §二「不重复造数据层」）
  const fixed = getDockItems().filter((id) => appIndexById(id) !== -1);
  appsEl.innerHTML = fixed.map((id) => iconBtnHTML(id)).join('');
  rootEl.setAttribute('data-app-count', String(fixed.length));
}

function ensureSpring() {
  if (!spring) {
    spring = new Spring({
      mass: 1, stiffness: STASH_SPRING_STIFFNESS, damping: STASH_SPRING_DAMPING,
      initialValue: 0, initialVelocity: 0,
    });
  }
  return spring;
}

/** 按 spring 进度写帧（p：0 收起 → 1 展开；bgAlpha 覆写跟手阶段背景 alpha） */
function applyFrame(p, bgAlpha) {
  if (!barEl) return;
  barEl.style.transform = `translateX(-50%) translateY(${((1 - p) * HIDE_OFFSET).toFixed(2)}px)`;
  const a = bgAlpha != null ? bgAlpha : p;
  barEl.style.setProperty('--tbt-bg-alpha', a.toFixed(3));
}

function startLoop() {
  if (rafId) return;
  const tick = () => {
    rafId = 0;
    if (!spring || !barEl || !rootEl || !rootEl.isConnected) return;
    spring.update(1 / 60); // happy-dom/低帧率环境固定步进；浏览器 rAF 实时
    const p = spring.x;
    const target = spring.target;
    applyFrame(p);
    const settled = target >= 0.5 ? (p >= 0.995) : (p <= 0.005);
    if (!settled) rafId = requestAnimationFrame(tick);
    else {
      // 落定终态写死，防残影
      applyFrame(target >= 0.5 ? 1 : 0, target >= 0.5 ? 1 : 0);
    }
  };
  rafId = requestAnimationFrame(tick);
}

// ==================== 开/收（417ms 弹簧 + 400dp/s 初速接力） ====================

function armAutoStashTimer() {
  disarmAutoStashTimer();
  stashTimer = setTimeout(() => {
    stashTimer = 0;
    stash('auto-timeout'); // NO_TOUCH_TIMEOUT_TO_STASH_MS=5000 原值
  }, NO_TOUCH_TIMEOUT_TO_STASH_MS);
}
function disarmAutoStashTimer() {
  if (stashTimer) { clearTimeout(stashTimer); stashTimer = 0; }
}

/** 唤出展开（reason: swipe/hover/test） */
export function openTransient(reason) {
  if (!rootEl || !rootEl.isConnected) return false;
  renderApps();
  openFlag = true;
  rootEl.classList.add('open');
  rootEl.setAttribute('data-open', '1');
  rootEl.setAttribute('data-open-reason', reason || '');
  const sp = ensureSpring();
  // 初速接力：400dp/s ÷ 隐藏偏移（进度量纲映射，与 #72 同式）
  const v = STASH_SPRING_INITIAL_VELOCITY_DP_PER_S / HIDE_OFFSET;
  sp.setTarget(1, v);
  startLoop();
  armAutoStashTimer();
  recomputeSuspend();
  return true;
}

/** 收起（reason: auto-timeout/swipe-down/fling-down/outside-tap/context-lost/app-launch/test） */
export function stashTransient(reason) {
  if (!rootEl || !rootEl.isConnected) return false;
  disarmAutoStashTimer();
  openFlag = false;
  rootEl.classList.remove('open');
  rootEl.setAttribute('data-open', '0');
  rootEl.setAttribute('data-stash-reason', reason || '');
  const sp = ensureSpring();
  const v = STASH_SPRING_INITIAL_VELOCITY_DP_PER_S / HIDE_OFFSET;
  sp.setTarget(0, -v);
  startLoop();
  recomputeSuspend();
  return true;
}

// ==================== 首次引导（taskbar_edu_standalone 语义，只弹一次） ====================

function maybeShowEdu() {
  if (eduDone) return;
  eduDone = true;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(EDU_KEY)) return;
    if (localStorage) localStorage.setItem(EDU_KEY, '1');
  } catch (e) { /* 隐私模式静默 */ }
  if (!eduEl) return;
  eduEl.classList.add('show');
  setTimeout(() => { if (eduEl) eduEl.classList.remove('show'); }, EDU_SHOW_MS);
}

// ==================== 手势链路（观察者纪律：capture + passive，零打断既有链） ====================

function barRect() {
  if (!barEl) return null;
  const r = barEl.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}

/** #72 常驻栏收纳态的 bottom-touch 触碰区（中央 316dp × 底缘 24px）——悬浮栏让位 */
function inPersistentDeferZone(x, y) {
  const tb = document.getElementById('taskbar');
  if (!tb || !tb.isConnected || !tb.classList.contains('stashed')) return false;
  const w = window.innerWidth || 0;
  const cx = w / 2;
  const half = Math.min(TASKBAR_UNSTASH_INPUT_AREA, w) / 2;
  const inBand = x >= cx - half && x <= cx + half;
  const inEdge = (window.innerHeight || 0) - y <= 24;
  return inBand && inEdge;
}

function onDown(e) {
  if (!rootEl || !rootEl.isConnected) return;
  if (document.body.classList.contains('is-locked')) return;
  const x = e.clientX, y = e.clientY;
  // 悬浮栏展开：栏外点按 → 立即收起（ACTION_DOWN outside 语义）；栏内 → 下滑收起轨道
  if (openFlag) {
    armAutoStashTimer(); // 任意触摸重置 5s（NO_TOUCH 语义）
    const out = outsideStashDecision({ x, y, rect: barRect() });
    if (out.stashed) { stash('outside-tap'); }
    else if (!barTrack && !track) {
      barTrack = { id: e.pointerId, y0: y, lastY: y, lastT: performance.now(), vy: 0, maxDy: 0 };
    }
    return;
  }
  // 武装判定 + 底部手势带 + #72 让位区
  if (!armedNow()) return;
  if (y <= (window.innerHeight || 0) - BOTTOM_BAND) return;
  if (inPersistentDeferZone(x, y)) return;
  barTrack = null; // 收起态不可能有栏内轨道；pointerup 丢失时自愈清残留
  // 旧轨道自愈覆盖：pointerup 丢失（iframe 吞事件等）时新按下重开轨道，不残留死锁
  track = { id: e.pointerId, y0: y, lastY: y, lastT: performance.now(), vy: 0, fired: false };
  // 释放段仲裁信物：armed 状态先登记（gestures.js BOTTOM 释放分支读取；
  // 量纲 = performance.now，与 gestures.js 侧新鲜度比较一致）
  try { window.__tbTransientClaim = { state: 'armed', at: performance.now() }; } catch (err) { /* 非浏览器 */ }
  recomputeSuspend();
}

function onMove(e) {
  if (!rootEl || !rootEl.isConnected) return;
  const now = performance.now();
  // ---- 栏内下滑收起轨道（TaskbarStashViaTouchController：栏内下滑 ≥24dp 即收） ----
  if (barTrack && e.pointerId === barTrack.id) {
    const dt = Math.max(1, now - barTrack.lastT);
    barTrack.vy = ((e.clientY - barTrack.lastY) / dt) * 1000; // 向下为正
    barTrack.lastY = e.clientY;
    barTrack.lastT = now;
    const dy = e.clientY - barTrack.y0;
    if (dy > barTrack.maxDy) barTrack.maxDy = dy;
    const d = stashSwipeDecision({ dy: barTrack.maxDy, velocityY: 0 });
    if (d.stashed) { barTrack = null; stash('swipe-down'); }
    return;
  }
  // ---- 底部上滑唤出轨道（TaskbarUnstashInputConsumer ACTION_MOVE 同构） ----
  if (!track || e.pointerId !== track.id) return;
  const dt = Math.max(1, now - track.lastT);
  track.vy = ((e.clientY - track.lastY) / dt) * 1000; // 向下为正（上滑为负）
  track.lastY = e.clientY;
  track.lastT = now;
  const dY = e.clientY - track.y0; // 源码同号：上滑为负
  if (!track.fired) {
    // md3 无扩展边缘 slop 区语义 → inExtendedSlop 恒 false（刻意偏离已注明）
    const d = unstashDecision({ dy: dY, threshold: thr.nav, alreadyFired: false, inExtendedSlop: false });
    if (d.fired) {
      track.fired = true;
      try { window.__tbTransientClaim = { state: 'fired', at: performance.now() }; } catch (err) { /* 非浏览器 */ }
      openTransient('swipe');
      recomputeSuspend();
    }
  }
  if (track && track.fired) {
    // 唤出后继续上滑 → 阻尼跟手（OverScroll.dampedScroll 语义）：进度渐近 1 不越阈
    const absDy = -dY;
    const p = followProgress(absDy, thr.nav);
    const sp = ensureSpring();
    sp.x = Math.max(sp.x, p); // 外部直写（spring 惰性重锚续解）；只进不退防回缩抖动
    applyFrame(sp.x, followBackgroundAlpha(absDy));
  }
}

function onUp(e) {
  if (!rootEl || !rootEl.isConnected) return;
  // ---- 栏内轨道松指：下滑不足 24dp 但快速甩动 → 收起 ----
  if (barTrack && e.pointerId === barTrack.id) {
    const d = stashSwipeDecision({ dy: barTrack.maxDy, velocityY: barTrack.vy });
    barTrack = null;
    if (d.stashed) stash(d.reason || 'fling-down');
    return;
  }
  // ---- 唤出轨道松指：未达阈值 → 轨道作废；已达 → 弹簧补完展开 + 5s 计时 ----
  if (track && e.pointerId === track.id) {
    const fired = track.fired;
    const vyUp = -track.vy; // 向上为正
    track = null;
    recomputeSuspend();
    if (fired) {
      const sp = ensureSpring();
      // 松指速度接力：向上速度 → 进度增速（量纲 = px/s ÷ 隐藏偏移），负回退钳 0
      sp.setTarget(1, Math.max(0, vyUp / HIDE_OFFSET));
      startLoop();
      armAutoStashTimer();
    }
  }
}

// ==================== 初始化 ====================

export function initTransientTaskbar() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('taskbar-transient')) return;

  rootEl = document.createElement('div');
  rootEl.className = 'tb-transient';
  rootEl.id = 'taskbar-transient';
  rootEl.setAttribute('data-open', '0');
  rootEl.setAttribute('data-suspend-flags', '0');
  rootEl.innerHTML =
    `<div class="tbt-bar" role="toolbar" aria-label="悬浮任务栏">` +
      `<div class="tbt-apps"></div>` +
      `<button type="button" class="tbt-allapps" aria-label="All Apps">` +
        `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">` +
          `<circle cx="7" cy="7" r="2.1" fill="currentColor"/><circle cx="12" cy="7" r="2.1" fill="currentColor"/><circle cx="17" cy="7" r="2.1" fill="currentColor"/>` +
          `<circle cx="7" cy="12" r="2.1" fill="currentColor"/><circle cx="12" cy="12" r="2.1" fill="currentColor"/><circle cx="17" cy="12" r="2.1" fill="currentColor"/>` +
          `<circle cx="7" cy="17" r="2.1" fill="currentColor"/><circle cx="12" cy="17" r="2.1" fill="currentColor"/><circle cx="17" cy="17" r="2.1" fill="currentColor"/>` +
        `</svg>` +
      `</button>` +
    `</div>` +
    `<div class="tbt-edu" role="status">从底部上滑唤出任务栏</div>`;
  barEl = rootEl.querySelector('.tbt-bar');
  appsEl = rootEl.querySelector('.tbt-apps');
  allAppsBtnEl = rootEl.querySelector('.tbt-allapps');
  eduEl = rootEl.querySelector('.tbt-edu');
  document.body.appendChild(rootEl);

  // ---- 图标点击开窗（#72 数据层链路复用）+ 开窗即收（悬浮栏瞬时语义） ----
  appsEl.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('.tbt-icon') : null;
    if (!btn || !btn.isConnected) return;
    const idx = appIndexById(btn.getAttribute('data-id'));
    stashTransient('app-launch');
    if (idx !== -1) openApp(idx, btn);
  });
  // ---- All Apps → #73 平板浮层（all-apps-changed → syncPresence 收起悬浮栏） ----
  allAppsBtnEl.addEventListener('click', () => {
    stashTransient('all-apps-launch');
    openAllApps('taskbar-transient');
  });

  // ---- 手势三件套（capture + passive 观察者：零 preventDefault/stopPropagation） ----
  window.addEventListener('pointerdown', onDown, { capture: true, passive: true });
  window.addEventListener('pointermove', onMove, { capture: true, passive: true });
  window.addEventListener('pointerup', onUp, { capture: true, passive: true });
  window.addEventListener('pointercancel', onUp, { capture: true, passive: true });

  // ---- 在场同步事件面（resize 先重算阈值再同步 —— DoD「跨 768px 断点 resize 阈值重算」） ----
  const onResize = () => { recomputeThresholds(); syncPresence(); };
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('desktop-prefs-changed', syncPresence);
  window.addEventListener('taskbar-changed', syncPresence); // #72 常驻栏在场切换
  window.addEventListener('all-apps-changed', syncPresence);
  document.addEventListener('app-window-closed', syncPresence);
  try {
    const mo = new MutationObserver(() => syncPresence());
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  } catch (err) { /* 老引擎忽略 */ }
  // 概览层开关（recent-apps 无全局事件 → 观察 active 类）
  try {
    const recentsEl = document.getElementById('recentAppsOverlay');
    if (recentsEl) {
      const mo2 = new MutationObserver(() => syncPresence());
      mo2.observe(recentsEl, { attributes: true, attributeFilter: ['class'] });
    }
  } catch (err) { /* 老引擎忽略 */ }

  // ---- 释放段仲裁桥（gestures.js BOTTOM 释放分支读取；阈值单源 taskbar-thresholds） ----
  try {
    window.__tbTransientThresholds = (shortSidePx) => taskbarThresholds(shortSidePx);
  } catch (err) { /* 非浏览器环境静默 */ }

  recomputeThresholds();
  syncPresence();
}

// ==================== 测试/E2E 钩子 ====================

/** 场景钩子（tests/e2e 专用；生产零依赖） */
export function __transientTestHooks() {
  return {
    get el() { return rootEl; },
    get barEl() { return barEl; },
    get openFlag() { return openFlag; },
    get springP() { return spring ? spring.x : 0; },
    get springTarget() { return spring ? spring.target : -1; },
    get suspendFlags() { return suspendFlags; },
    get suspended() { return isAutohideSuspended(suspendFlags); },
    get thresholds() { return thr; },
    get shortSide() { return shortSide; },
    get track() { return track; },
    get barTrack() { return barTrack; },
    get armed() { return armedNow(); },
    get stashTimerArmed() { return !!stashTimer; },
    openTransient,
    stashTransient,
    syncPresence,
    recomputeThresholds,
    renderApps,
    barRect,
    context: currentContext,
  };
}
