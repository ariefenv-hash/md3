// ==================== taskbar.js — 平板任务栏 Taskbar（#72，Launcher3 lineage-24.0 对标） ====================
//
// 职责（议题 §五 执行计划 一期+二期）：
//   1. 平板断点（≥768px，isTabletSize）底部常驻任务栏 = 固定应用 + 运行中应用（指示条）
//      + All Apps 入口 + 导航三键（返回/Home/概览）+ 溢出菜单；<768px 回退 Dock，两态互斥
//   2. 收纳状态机（taskbar-core 纯函数核 + JS 弹簧）：应用内 5s 无触摸自动收纳（5000ms 原值）、
//      417ms 收纳弹簧（scale 0.5）、220×4dp 手柄（悬浮 1.1 提示 / 点击 / 上滑唤出）
//   3. 容量治理：calculateMaxNumIcons 按容器宽动态算上限，超出项进溢出面板不丢项
//   4. 设置 ›「桌面与 Dock」开关（desktop-prefs 单源持久化，默认开）
//
// 纪律：
//   · 几何全按 #72 §1.4/§1.5 实测原值（56 栏高/48 触控/12 间距/44 导航/16 圆角/220×4 手柄）
//   · 收纳动效走 spring.js（与 m3-controls 同纪律，不经 CSS transition，html.no-anim 不杀动效）
//   · 导航三键语义与 nav-bar.js sysBack/sysHome/sysRecents 同序（页内返回 > 模块返回 > iframe PB > 关窗）
//   · 与 Dock 互斥：body.taskbar-on 时 Dock 隐藏（dock.js 监听 taskbar-changed 同步占位）

import { state } from './state.js';
import { initialApps } from './apps-data.js';
import { getAppIconSVG } from './app-icons.js';
import { openApp, closeApp } from './app-window.js';
import { getRecentAppsList, openRecentApps, closeRecentApps } from './recent-apps.js';
import { openAllApps } from './all-apps.js';
import { popSubPage } from './page-stack.js';
import { getActivePBTarget, pbSend } from './iframe-pb.js';
import { getActiveModuleBack } from './module-back.js';
import { Spring } from './spring.js';
import { getDesktopPrefs, isTabletSize } from './desktop-prefs.js';
import { getDockItems } from './dock.js';
import {
  TASKBAR_FRAME_HEIGHT, TASKBAR_NAV_BUTTONS_SIZE,
  STASHED_TASKBAR_SCALE, UNSTASHED_TASKBAR_HANDLE_HINT_SCALE,
  NO_TOUCH_TIMEOUT_TO_STASH_MS, STASH_SPRING_INITIAL_VELOCITY_DP_PER_S,
  STASH_SPRING_STIFFNESS, STASH_SPRING_DAMPING,
  TRANSIENT_TASKBAR_STASH_DURATION, TASKBAR_STASHED_HANDLE_WIDTH, TASKBAR_STASHED_HANDLE_HEIGHT,
  computeStash, calculateMaxNumIcons, partitionApps, runningProjection,
} from './taskbar-core.js';

let taskbarEl = null;
let viewEl = null;        // .taskbar-view（图标区，收纳时整体下沉+图标缩放）
let fixedEl = null;       // .taskbar-fixed
let runningEl = null;     // .taskbar-running
let overflowBtnEl = null; // .taskbar-overflow-btn（溢出把手）
let allAppsBtnEl = null;  // .taskbar-allapps
let panelEl = null;       // .taskbar-overflow（溢出面板）
let handleEl = null;      // .taskbar-handle（收纳手柄 220×4）

/** 打开中的应用 id 集（recordAppOpened 广播加入 / app-window-closed 移除） */
const openSet = new Set();
/** 5s 无触摸自动收纳是否已触发（FLAG_STASHED_IN_APP_AUTO 的 md3 侧承载） */
let autoStashFired = false;
let autoStashTimer = 0;
let allAppsOpenFlag = false;

// ---- 收纳弹簧（进度 p：0=展开 1=收纳；解析闭式解，任意帧率无累积误差） ----
let stashSpring = null;
let springRafId = 0;

function ensureSpring() {
  if (!stashSpring) {
    stashSpring = new Spring({
      mass: 1, stiffness: STASH_SPRING_STIFFNESS, damping: STASH_SPRING_DAMPING,
      initialValue: 0, initialVelocity: 0,
    });
  }
  return stashSpring;
}

/** 应用名/id → initialApps 索引（与 dock.js 同链路开窗） */
function appIndexById(id) {
  return initialApps.findIndex((a) => a.id === id);
}
function appById(id) {
  return initialApps.find((a) => a.id === id) || null;
}

// ==================== 渲染 ====================

function iconBtnHTML(id, running) {
  const app = appById(id);
  const name = app ? app.name : id;
  return `<button type="button" class="taskbar-icon${running ? ' is-running' : ''}" data-id="${id}" aria-label="${name}">` +
    `<span class="taskbar-icon-img">${getAppIconSVG(id)}</span>` +
    `<span class="taskbar-indicator" aria-hidden="true"></span>` +
    `</button>`;
}

function renderIcons() {
  if (!taskbarEl || !taskbarEl.isConnected) return;
  const fixed = getDockItems().filter((id) => appIndexById(id) !== -1);
  const running = runningProjection(getRecentAppsList(), openSet, fixed);

  // 容量：TaskbarView.calculateMaxNumIcons 同构。trackW = .taskbar-apps 实宽
  // （导航三键为兄弟节点已天然排除；All Apps 按钮是 view 的子节点但不在 apps 内）。
  // 未布局回退（happy-dom/隐藏态）按 视口宽 − 导航区(3×44+12+8) − 栏 padding(24)
  // − All Apps(48) − view gap(8) 推算。保留区 = All Apps(48) + 溢出把手(36) +
  // 内容区左右 padding(24)。
  const appsEl = taskbarEl.querySelector('.taskbar-apps');
  let trackW = appsEl ? (appsEl.clientWidth || 0) : 0;
  if (!trackW) {
    trackW = Math.max(0, (window.innerWidth || 0)
      - (3 * TASKBAR_NAV_BUTTONS_SIZE + 2 * 6 + 8) - 24 - 48 - 8);
  }
  const reservedW = 48 + 36 + 24;
  const maxIcons = calculateMaxNumIcons(trackW, { reservedW });
  const merged = fixed.concat(running);
  const { visible, overflow } = partitionApps(merged, maxIcons);

  const visFixed = visible.filter((id) => fixed.indexOf(id) !== -1);
  const visRunning = visible.filter((id) => fixed.indexOf(id) === -1);

  // 指示条语义：AOSP 任务栏对「运行中的应用」一律打点（固定/运行区皆然）
  if (fixedEl) fixedEl.innerHTML = visFixed.map((id) => iconBtnHTML(id, openSet.has(id))).join('');
  if (runningEl) runningEl.innerHTML = visRunning.map((id) => iconBtnHTML(id, true)).join('');
  // 固定/运行分界线（taskbar_divider.xml 语义）：仅两侧都有内容时在场
  const hasDivider = visFixed.length > 0 && visRunning.length > 0;
  if (runningEl) runningEl.classList.toggle('with-divider', hasDivider);

  // 溢出：把手显隐 + 面板全量重画（溢出项不丢弃）
  if (overflowBtnEl) overflowBtnEl.hidden = overflow.length === 0;
  if (overflowBtnEl) overflowBtnEl.setAttribute('data-count', String(overflow.length));
  if (panelEl) {
    panelEl.innerHTML = overflow.map((id) => {
      const app = appById(id);
      const name = app ? app.name : id;
      return `<button type="button" class="taskbar-overflow-item" data-id="${id}" role="menuitem">` +
        `<span class="taskbar-overflow-icon">${getAppIconSVG(id)}</span><span class="taskbar-overflow-name">${name}</span>` +
        `</button>`;
    }).join('');
  }
  if (overflow.length === 0) closeOverflowPanel();
  taskbarEl.setAttribute('data-max-icons', String(maxIcons));
}

function closeOverflowPanel() {
  if (panelEl) panelEl.classList.remove('open');
  if (overflowBtnEl) overflowBtnEl.setAttribute('aria-expanded', 'false');
}

// ==================== 收纳状态机（evaluate → apply） ====================

function recentsActive() {
  const el = document.getElementById('recentAppsOverlay');
  return !!(el && el.classList.contains('active'));
}

function currentContext() {
  return {
    inApp: !!state.isOpen,
    autoStash: autoStashFired,
    allAppsOpen: allAppsOpenFlag,
    locked: document.body.classList.contains('is-locked'),
    overviewOpen: recentsActive(),
  };
}

function evaluateStash() {
  if (!taskbarEl || !taskbarEl.isConnected) return;
  const ctx = currentContext();
  const { flags, stashed } = computeStash(ctx);
  taskbarEl.setAttribute('data-stash-flags', String(flags));
  // 锁屏/dream → 整体隐藏（含手柄）；其余场景走收纳/展开双态
  taskbarEl.classList.toggle('tb-fully-hidden', !!(ctx.locked));
  applyStash(stashed, flags);
  // 应用内且未收纳 → 5s 无触摸自动收纳计时（NO_TOUCH_TIMEOUT_TO_STASH_MS 原值）
  if (ctx.inApp && !stashed && !ctx.locked && !allAppsOpenFlag) armAutoStash();
  else disarmAutoStash();
}

function armAutoStash() {
  disarmAutoStash();
  autoStashTimer = setTimeout(() => {
    autoStashTimer = 0;
    autoStashFired = true;
    evaluateStash();
  }, NO_TOUCH_TIMEOUT_TO_STASH_MS);
}
function disarmAutoStash() {
  if (autoStashTimer) { clearTimeout(autoStashTimer); autoStashTimer = 0; }
}

/** 收纳/展开应用（JS 弹簧驱动 transform，不写 transition；417ms 整定 + 400dp/s 初速） */
function applyStash(stashed, flags) {
  if (!taskbarEl) return;
  const wasStashed = taskbarEl.classList.contains('stashed');
  taskbarEl.classList.toggle('stashed', !!stashed);
  taskbarEl.setAttribute('data-stashed', stashed ? '1' : '0');
  if (!viewEl) return;
  const spring = ensureSpring();
  if (wasStashed !== !!stashed) {
    // 初速接力：transient_taskbar_stash_spring_velocity_dp_per_s=400dp/s，
    // 进度量纲映射 = 400 / 栏高56（一个栏高 ≈ 进度 1.0）
    const v = STASH_SPRING_INITIAL_VELOCITY_DP_PER_S / TASKBAR_FRAME_HEIGHT;
    spring.setTarget(stashed ? 1 : 0, stashed ? v : -v);
    startSpringLoop();
  }
  taskbarEl.setAttribute('data-scale-target', stashed ? String(STASHED_TASKBAR_SCALE) : '1');
}

function startSpringLoop() {
  if (springRafId) return;
  const barH = TASKBAR_FRAME_HEIGHT;
  const tick = () => {
    springRafId = 0;
    if (!stashSpring || !viewEl || !taskbarEl || !taskbarEl.isConnected) return;
    stashSpring.update(1 / 60); // happy-dom/低帧率环境固定步进；浏览器 rAF 实时
    const p = stashSpring.x;
    const stashed = taskbarEl.classList.contains('stashed');
    // 视图整体下沉隐藏 + 图标按 STASHED_TASKBAR_SCALE=0.5 缩放（源码同值）
    viewEl.style.transform = `translateY(${(p * (barH + 10)).toFixed(2)}px)`;
    viewEl.style.opacity = String(1 - p);
    viewEl.style.setProperty('--tb-icon-scale', String((1 - p * (1 - STASHED_TASKBAR_SCALE)).toFixed(4)));
    if (handleEl) {
      handleEl.style.opacity = String(p);
      handleEl.style.transform = `translateX(-50%) translateY(${((1 - p) * 24).toFixed(2)}px) scale(${stashed ? UNSTASHED_TASKBAR_HANDLE_HINT_SCALE : 1})`;
    }
    const settled = stashed ? (p >= 0.995) : (p <= 0.005);
    if (!settled) springRafId = requestAnimationFrame(tick);
    else {
      // 落定终态写死，防残影
      viewEl.style.transform = stashed ? `translateY(${barH + 10}px)` : 'translateY(0px)';
      viewEl.style.opacity = stashed ? '0' : '1';
      viewEl.style.setProperty('--tb-icon-scale', stashed ? String(STASHED_TASKBAR_SCALE) : '1');
      if (handleEl) {
        handleEl.style.opacity = stashed ? '1' : '0';
        handleEl.style.transform = stashed ? 'translateX(-50%) translateY(0px)' : 'translateX(-50%) translateY(24px)';
      }
    }
  };
  springRafId = requestAnimationFrame(tick);
}

/** 解收纳（手柄悬浮/点击/上滑 或 底部解收纳区触摸） */
function unstash(reason) {
  autoStashFired = false;
  if (taskbarEl) {
    // 强制清 AUTO 位再评估（417ms 量级回弹展开）
    const ctx = currentContext();
    ctx.autoStash = false;
    const { flags, stashed } = computeStash(ctx);
    taskbarEl.setAttribute('data-stash-flags', String(flags));
    taskbarEl.setAttribute('data-stashed', stashed ? '1' : '0');
    applyStash(stashed, flags);
    taskbarEl.setAttribute('data-unstash-reason', reason || '');
  }
  if (state.isOpen) armAutoStash(); // 重新计时 5s（源码 NO_TOUCH 语义）
}

// ==================== 导航三键（与 nav-bar.js sysBack/sysHome/sysRecents 同序同语义） ====================

function sysBack() {
  const recentsEl = document.getElementById('recentAppsOverlay');
  if (recentsEl && recentsEl.classList.contains('active')) { closeRecentApps(); return; }
  if (state.isOpen) {
    if (state.navHistory.length > 1) { popSubPage(); return; } // 宿主子页返回
    const mb = getActiveModuleBack();
    if (mb) { mb.triggerBack(); return; }
    const pb = getActivePBTarget();
    if (pb && pb.canBack) { pbSend(pb.win, { type: 'PB_TRIGGER_BACK' }); return; }
    popSubPage(); return; // 根页则关闭应用
  }
}

function sysHome() {
  const recentsEl = document.getElementById('recentAppsOverlay');
  if (recentsEl && recentsEl.classList.contains('active')) {
    closeRecentApps({ resumeSuspended: false }); // v7.63：Home = 回桌面，挂起实例保留
  }
  if (state.isOpen) { closeApp(0, 0, 0); return; }
  const split = window.__splitGestures;
  if (split && split.active()) { split.dismiss(); return; }
}

function sysRecents() {
  const recentsEl = document.getElementById('recentAppsOverlay');
  if (recentsEl && recentsEl.classList.contains('active')) { closeRecentApps(); return; }
  openRecentApps(state.currentApp ? state.currentApp.id : null);
}

// ==================== 在场同步（断点/开关互斥） ====================

function syncPresence() {
  const prefs = getDesktopPrefs();
  const on = !!(prefs.taskbarEnabled && isTabletSize());
  document.body.classList.toggle('taskbar-on', on);
  document.documentElement.style.setProperty('--taskbar-space', on ? '68px' : '0px');
  if (taskbarEl) taskbarEl.classList.toggle('hidden', !on);
  try {
    window.dispatchEvent(new CustomEvent('taskbar-changed', { detail: { active: on } }));
  } catch (e) { /* 非浏览器环境静默 */ }
  if (on) { renderIcons(); evaluateStash(); }
  return on;
}

// ==================== 初始化 ====================

export function initTaskbar() {
  if (typeof document === 'undefined') return;
  taskbarEl = document.createElement('div');
  taskbarEl.className = 'taskbar hidden';
  taskbarEl.id = 'taskbar';
  taskbarEl.setAttribute('role', 'toolbar');
  taskbarEl.setAttribute('aria-label', 'Taskbar');
  taskbarEl.innerHTML =
    `<div class="taskbar-view">` +
      `<div class="taskbar-apps">` +
        `<div class="taskbar-fixed"></div>` +
        `<div class="taskbar-running"></div>` +
        `<button type="button" class="taskbar-overflow-btn" hidden aria-haspopup="menu" aria-expanded="false" aria-label="更多应用">` +
          `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="5" r="1.9" fill="currentColor"/><circle cx="12" cy="12" r="1.9" fill="currentColor"/><circle cx="12" cy="19" r="1.9" fill="currentColor"/></svg>` +
        `</button>` +
      `</div>` +
      `<button type="button" class="taskbar-allapps" aria-label="All Apps">` +
        `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="7" cy="7" r="2.1" fill="currentColor"/><circle cx="12" cy="7" r="2.1" fill="currentColor"/><circle cx="17" cy="7" r="2.1" fill="currentColor"/><circle cx="7" cy="12" r="2.1" fill="currentColor"/><circle cx="12" cy="12" r="2.1" fill="currentColor"/><circle cx="17" cy="12" r="2.1" fill="currentColor"/><circle cx="7" cy="17" r="2.1" fill="currentColor"/><circle cx="12" cy="17" r="2.1" fill="currentColor"/><circle cx="17" cy="17" r="2.1" fill="currentColor"/></svg>` +
      `</button>` +
      `<div class="taskbar-overflow" role="menu" aria-label="溢出应用"></div>` +
    `</div>` +
    `<div class="taskbar-navbuttons">` +
      `<button type="button" class="taskbar-nav-btn" data-nav="back" aria-label="返回">` +
        `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M15 5 L8 12 L15 19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>` +
      `</button>` +
      `<button type="button" class="taskbar-nav-btn" data-nav="home" aria-label="主屏幕">` +
        `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>` +
      `</button>` +
      `<button type="button" class="taskbar-nav-btn" data-nav="recents" aria-label="概览">` +
        `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="5.5" y="5.5" width="13" height="13" rx="2.4" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>` +
      `</button>` +
    `</div>` +
    `<button type="button" class="taskbar-handle" aria-label="展开任务栏"></button>`;
  viewEl = taskbarEl.querySelector('.taskbar-view');
  fixedEl = taskbarEl.querySelector('.taskbar-fixed');
  runningEl = taskbarEl.querySelector('.taskbar-running');
  overflowBtnEl = taskbarEl.querySelector('.taskbar-overflow-btn');
  allAppsBtnEl = taskbarEl.querySelector('.taskbar-allapps');
  panelEl = taskbarEl.querySelector('.taskbar-overflow');
  handleEl = taskbarEl.querySelector('.taskbar-handle');
  document.body.appendChild(taskbarEl);

  // ---- 图标点击开窗（与 dock.js onDockTap 同链路：initialApps 索引 → openApp） ----
  viewEl.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('.taskbar-icon') : null;
    if (btn && btn.isConnected) {
      const id = btn.getAttribute('data-id');
      const idx = appIndexById(id);
      if (idx === -1) { renderIcons(); return; }
      closeOverflowPanel();
      openApp(idx, btn);
      return;
    }
    const ovi = e.target && e.target.closest ? e.target.closest('.taskbar-overflow-item') : null;
    if (ovi && ovi.isConnected) {
      const idx = appIndexById(ovi.getAttribute('data-id'));
      closeOverflowPanel();
      if (idx !== -1) openApp(idx, ovi);
      return;
    }
    if (e.target && e.target.closest && e.target.closest('.taskbar-overflow-btn')) {
      if (panelEl) {
        const open = panelEl.classList.toggle('open');
        overflowBtnEl.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      return;
    }
    if (e.target && e.target.closest && e.target.closest('.taskbar-allapps')) {
      closeOverflowPanel();
      openAllApps('taskbar');
      return;
    }
    if (!e.target.closest || !e.target.closest('.taskbar-overflow')) closeOverflowPanel();
  });

  // ---- 溢出面板：点击外部关闭 ----
  document.addEventListener('click', (e) => {
    if (!panelEl || !panelEl.classList.contains('open')) return;
    if (e.target && e.target.closest && !e.target.closest('.taskbar-overflow') && !e.target.closest('.taskbar-overflow-btn')) {
      closeOverflowPanel();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOverflowPanel();
  });

  // ---- 导航三键 ----
  taskbarEl.querySelector('.taskbar-navbuttons').addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('.taskbar-nav-btn') : null;
    if (!btn) return;
    const nav = btn.getAttribute('data-nav');
    if (nav === 'back') sysBack();
    else if (nav === 'home') sysHome();
    else if (nav === 'recents') sysRecents();
  });

  // ---- 手柄：悬浮唤出（UNSTASHED_TASKBAR_HANDLE_HINT_SCALE=1.1 悬停提示走 CSS）/ 点击 / 上滑 ----
  handleEl.addEventListener('pointerenter', () => { if (!state.isOpen || autoStashFired) unstash('hover'); });
  handleEl.addEventListener('click', () => unstash('tap'));
  let handleSwipe = null;
  handleEl.addEventListener('pointerdown', (e) => {
    handleSwipe = { y: e.clientY, fired: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!handleSwipe || handleSwipe.fired) return;
    if (handleSwipe.y - e.clientY > 16) { handleSwipe.fired = true; unstash('swipe'); }
  }, { passive: true });
  window.addEventListener('pointerup', () => { handleSwipe = null; }, { passive: true });

  // ---- 收纳后：底部解收纳区触摸唤出（taskbar_unstash_input_area=316dp 中心区） ----
  document.addEventListener('pointerdown', (e) => {
    // 任意触摸重置 5s 无触摸计时（源码 NO_TOUCH_TIMEOUT_TO_STASH_MS 语义）
    if (state.isOpen && !autoStashFired) armAutoStash();
    // 底部中央解收纳区（316dp 宽 × 底缘死区带）触摸 → 唤出
    if (taskbarEl && taskbarEl.classList.contains('stashed')) {
      const w = window.innerWidth || 0;
      const cx = w / 2, half = Math.min(316, w) / 2;
      const inBand = e.clientX >= cx - half && e.clientX <= cx + half;
      const inEdge = (window.innerHeight || 0) - e.clientY <= 24;
      if (inBand && inEdge) unstash('bottom-touch');
    }
  }, true);

  // ---- 事件接线 ----
  window.addEventListener('desktop-prefs-changed', syncPresence);
  window.addEventListener('resize', syncPresence, { passive: true });
  window.addEventListener('dock-refresh-requested', (e) => {
    // recordAppOpened 广播（recent-apps 单源）：进入打开中集合 + 重画运行区
    const appId = e && e.detail && e.detail.appId;
    if (appId) openSet.add(appId);
    renderIcons();
    evaluateStash();
  });
  document.addEventListener('app-window-closed', (e) => {
    const appId = e && e.detail && e.detail.appId;
    if (appId) openSet.delete(appId);
    autoStashFired = false; // 离开应用 → 清 AUTO 位（回到常驻态）
    renderIcons();
    evaluateStash();
  });
  window.addEventListener('all-apps-changed', (e) => {
    allAppsOpenFlag = !!(e && e.detail && e.detail.open);
    evaluateStash(); // All Apps 全屏覆盖 → FLAG_STASHED_IN_TASKBAR_ALL_APPS 收纳
  });

  // 锁屏类名观察（body.is-locked → FLAG_TASKBAR_HIDDEN 整体隐藏）
  try {
    const mo = new MutationObserver(() => evaluateStash());
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  } catch (err) { /* 老引擎忽略 */ }

  syncPresence();
}

// ==================== 测试/E2E 钩子 ====================

/** 场景钩子（tests/e2e 专用；生产零依赖） */
export function __taskbarTestHooks() {
  return {
    get el() { return taskbarEl; },
    get openSet() { return openSet; },
    get autoStashFired() { return autoStashFired; },
    syncPresence,
    renderIcons,
    evaluateStash,
    unstash,
    forceStash(fire) {
      autoStashFired = !!fire;
      evaluateStash();
    },
    stashProgress() { return stashSpring ? stashSpring.x : 0; },
    springTarget() { return stashSpring ? stashSpring.target : 0; },
  };
}


