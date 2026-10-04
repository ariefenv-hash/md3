// ==================== gestures.js — 全局手势系统 ====================
//
// 支持三种手势:
//   1. BOTTOM  — 从屏幕底部上滑 → 关闭应用
//   2. EDGE_LEFT  — 从左边缘右滑 → 返回上级 / 关闭应用
//   3. EDGE_RIGHT — 从右边缘左滑 → 返回上级 / 关闭应用

import { state } from './state.js';
import { dom } from './dom.js';
import {
  BOTTOM_TRIGGER,
  EDGE_TRIGGER_WIDTH,
  MIN_PREVIEW_SCALE,
  MAX_DRAG_RATIO,
  DISMISS_DIST_RATIO,
  DISMISS_VEL,
  FLICK_VEL,
  VEL_SCALE,
  SCALE_VEL_SCALE,
  MAX_INITIAL_VEL,
} from './config.js';
import { clamp } from './utils.js';
import { initialApps } from './apps-data.js';
import { getAppIconSVG } from './app-icons.js';
import { createDynamicIconHTML } from './dynamic-icons.js';
import { startLoop, openApp, closeApp, isParallelAnimationActive, retargetRadialField, scheduleGestureRender, flushGestureRender, clearPendingSwitchRebound } from './app-window.js';
import { openRecentApps, getRecentAppsList } from './recent-apps.js';
import { OPEN_PARAMS } from './spring.js';
import { popSubPage } from './page-stack.js';
import { isPullPanelsActive } from './pull-down-gesture.js';
import { findActiveOverlayBack } from './overlay-registry.js';
// v7.28 预览式返回：iframe 应用 PB 路由 + 模块应用页内返回消费器
import { getActivePBTarget, pbSend } from './iframe-pb.js';
import { getActiveModuleBack } from './module-back.js';

let dragStartTime = 0;
let isRecentPauseTriggered = false;
// 分屏会话期间主窗口关闭，底部上滑走独立的分屏退出通道（跟手 → 松手退出/回弹）
let splitDragMode = false;
// v7.6：边缘手势命中 page-like 全屏页 —— 本次拖拽不驱动窗口，交给注册表 def 接管
// v7.8：具体浮层改查注册表（overlay-registry.js），gestures 不再认识任何具体 overlay
let overlayBackDrag = false;
let ovBack = null;
// v7.28 页内预览返回拖拽目标：{kind:'iframe', win} | {kind:'module', def}
let pbDrag = null;

// ==================== v7.23 底部横滑快速切换（Quick Switch） ====================
//
// 底部手势区左右轻滑 → 直接切换至相邻（上一/下一）后台应用，无需经过多任务卡片。
// 与既有体系的关系：
//   · 纯桌面（无应用/无分屏）：横滑 = 唤起最近应用（qs 独立于 state.drag 接管）；
//   · 应用内：BOTTOM 拖拽的横向分支（起判后转入 qs，竖向语义让位）；
//   · 三键导航栏：fusion 模式检测到横向主导同样委托 qs（两套底部交互一个引擎）；
//   · 旧应用降级 Closing Actor 缩向屏幕侧缘（demote exitTo），新应用自对侧
//     放大入场（openApp customRect）—— 与放射场/genie 同族连续动画语言。

const QUICK_SWITCH = {
  ENGAGE_PX: 32,     // 横向起判位移（px）
  DOMINANCE: 1.45,    // 横向主导比（|dx| > |dy| × 此值才起判）
  COMMIT_PX: 62,      // 提交位移阈值
  COMMIT_VEL: 520,    // 提交速度阈值（px/s）
  DRAG_GAIN: 0.42,    // 跟手增益（阻尼）
  FAR_CROSS: 160,     // 全增益段宽度
  FAR_GAIN: 0.16,     // 超出全增益段后的追加增益（深水区阻尼）
};

const qs = {
  active: false,
  moved: false,      // 是否已收到跟手 move（未移动的布防 400ms 自动撤除，防会话泄漏）
  armTimer: 0,
  fromDesktop: false,
  fromBottomDrag: false,
  dir: 1,          // 1 = 右滑（上一应用，新应用自左侧入场）；-1 = 左滑
  startX: 0, startY: 0, lastX: 0, lastT: 0, vx: 0, lastTx: 0,
  hintEl: null,
  // v7.31 流畅度：DOM 写入按帧合并（与 scheduleGestureRender 同纪律）。
  // 高频 pointermove 只更新状态与待落帧 pend；transform/浮层透明度每帧至多写一次。
  rafId: 0, pend: null, lastOpacity: -1,
  // v7.31：提示浮层目标解析缓存 —— 列表在手势期不变，仅方向翻转时重解析
  hintDir: 0,
  // 接管瞬间抓取偏移（grab offset）：从 BOTTOM 竖向拖拽转入时窗口已被拖缩/横移，
  // qs 曲线值与真实视位的差量在此捕获，随横移进度衰减归零 —— 零跳变接管
  grabInit: false, grabOffsetX: 0, grabOffsetScale: 0,
};

// prefers-reduced-motion：快速切换仅保留平移（去 3D 偏转/缩放装饰）
let qsReducedMotion = false;
try {
  if (typeof matchMedia === 'function') {
    const _qrm = matchMedia('(prefers-reduced-motion: reduce)');
    qsReducedMotion = !!_qrm.matches;
    _qrm.addEventListener?.('change', (e) => { qsReducedMotion = !!e.matches; });
  }
} catch (e) { /* 无障碍查询不可用：按常规动效处理 */ }

/** v7.36：窗口「视觉在场」判定 —— cardZoom 挂起通道落定后窗口摘类隐去
 *  （state.isOpen 保持 true 的挂起语义，见 app-window runOverlayFly 落定回调），
 *  但用户看到的是桌面；横滑手势在此态必须按桌面语义处理（唤起 list[0]），
 *  否则被误判为「应用内横滑」切到 list[at±1]（实测：关闭 msg 后桌面横滑
 *  唤起 camera 而非 msg）。以 DOM .open 类为视觉真源，覆盖挂起落定前后
 *  一切竞态窗口：飞行在途 .open 仍在 → 应用内；落定摘类 → 桌面。 */
function isWindowVisiblyOpen() {
  return !!(dom.appWindow && dom.appWindow.classList.contains('open'));
}

/** 快速切换全局资格（锁屏/下拉面板/多任务/分屏/退场中均不可用；
 *  开/关动画在途不可用 —— 但底部拖拽自身驱动的窗口缩放不算失稳：
 *  横滑起判前竖向路径已把窗口拖缩（dragDist 含横向分量），这是拖拽的合法中间态） */
function quickSwitchEligible() {
  if (document.body.classList.contains('is-locked')) return false;
  if (isPullPanelsActive()) return false;
  const recentsEl = document.getElementById('recentAppsOverlay');
  if (recentsEl && recentsEl.classList.contains('active')) return false;
  if (typeof window !== 'undefined' && window.__splitInfo && window.__splitInfo().active) return false;
  if (state.isClosing) return false;
  // 正在进行中的 BOTTOM 拖拽是合法宿主（应用内横滑从它转入）；其它拖拽不可打断
  const hostedByBottomDrag = state.drag.active && state.gestureType === 'BOTTOM';
  if (state.isDragging && !hostedByBottomDrag) return false;
  // 开/关弹簧动画在途：窗口位姿未稳定，横移反馈会与 render 循环打架；
  // BOTTOM 拖拽自身驱动的缩放不算失稳（接管时用 grab 偏移无缝衔接）
  // v7.36：挂起隐去态（窗口不可见、isOpen=true 残留、scale≈卡片比例）
  // 不算失稳 —— 等同桌面，横滑应可用
  if (state.isOpen && isWindowVisiblyOpen() && !hostedByBottomDrag && Math.abs(state.scaleSpring.x - 1) > 0.02) return false;
  return true;
}

/** 解析横滑方向对应的切换目标（上一/下一/最近应用） */
function resolveQuickSwitchTarget(dir) {
  const list = getRecentAppsList();
  if (!list.length) return null;
  // v7.36：挂起隐去态（isOpen=true 残留但窗口已摘类）按桌面语义 —— 唤起 list[0]
  if (!state.isOpen || !state.currentApp || !isWindowVisiblyOpen()) {
    // 纯桌面：唤起最近应用
    const appId = list[0];
    const idx = initialApps.findIndex((a) => a.id === appId);
    return idx === -1 ? null : { appId, idx, entryFromLeft: dir > 0 };
  }
  const curIdx = list.indexOf(state.currentApp.id);
  const at = curIdx === -1 ? 0 : curIdx;
  const targetId = dir > 0 ? list[at + 1] : list[at - 1];
  if (!targetId) return null; // 已到列表边缘
  const idx = initialApps.findIndex((a) => a.id === targetId);
  if (idx === -1) return null;
  return { appId: targetId, idx, entryFromLeft: dir > 0 };
}

/** 边缘态图标（已到应用列表边缘时的占位矢量） */
const QS_EDGE_ICON = `<svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="color:var(--md-on-surface-variant,#9a9b9e);"><path d="M14 8 30 24 14 40"/></svg>`;

/** 懒建并复用横滑提示浮层 */
function ensureQuickSwitchHint() {
  if (qs.hintEl && qs.hintEl.isConnected) return qs.hintEl;
  const el = document.createElement('div');
  el.id = 'quickSwitchHint';
  el.className = 'quick-switch-hint';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="qsh-card">
      <div class="qsh-icon" data-app=""></div>
      <div class="qsh-meta">
        <div class="qsh-label"></div>
        <div class="qsh-name"></div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  qs.hintEl = el;
  return el;
}

/** 更新提示浮层（目标应用/边缘态；强度渐现在 rAF 落帧时写入）
 *  v7.31：目标解析仅在同一手势首次与方向翻转时执行（recent 列表手势期不变），
 *  每帧省去 getRecentAppsList + 双 findIndex；标签/图标 DOM 同步只在目标变化时发生 */
function updateQuickSwitchHint() {
  if (qs.dir === qs.hintDir && qs.hintEl && qs.hintEl.isConnected) return;
  qs.hintDir = qs.dir;
  const target = resolveQuickSwitchTarget(qs.dir);
  const el = ensureQuickSwitchHint();
  el.classList.remove('leaving');
  el.classList.toggle('from-left', qs.dir > 0);
  el.classList.toggle('edge', !target);
  const iconEl = el.querySelector('.qsh-icon');
  const labelEl = el.querySelector('.qsh-label');
  const nameEl = el.querySelector('.qsh-name');
  if (target) {
    const app = initialApps[target.idx];
    if (iconEl.dataset.app !== target.appId) {
      iconEl.innerHTML = app.type ? createDynamicIconHTML(app.type, false) : getAppIconSVG(target.appId);
      iconEl.dataset.app = target.appId;
    }
    labelEl.textContent = qs.fromDesktop ? '最近应用' : (qs.dir > 0 ? '上一应用' : '下一应用');
    nameEl.textContent = app ? app.name : target.appId;
  } else {
    if (iconEl.dataset.app !== '__edge__') {
      iconEl.innerHTML = QS_EDGE_ICON;
      iconEl.dataset.app = '__edge__';
    }
    labelEl.textContent = '';
    nameEl.textContent = '已到应用列表边缘';
  }
}

/** 收尾浮层：淡出后移除（保持 DOM 干净，下次懒重建）
 *  v7.31：过渡只挂在 .leaving 类上 —— 基态无 transition，跟手期的逐帧透明度
 *  写入不再每帧重启过渡（此前浮层永远处于过渡中段 + backdrop-filter 反复失效，
 *  是横滑拖拽期抖动的主源之一） */
function hideQuickSwitchHint() {
  const el = qs.hintEl;
  qs.hintEl = null;
  qs.hintDir = 0;      // 下次手势重新解析目标
  qs.lastOpacity = -1; // 透明度写入去重缓存复位
  if (!el) return;
  el.classList.add('leaving');
  el.style.opacity = '0';
  setTimeout(() => { try { el.remove(); } catch (e) {} }, 240);
}

/** v7.31：待落帧视觉写入（每帧至多一次，永远取最新值） */
function applyQuickSwitchVisual() {
  if (!qs.pend) return;
  const v = qs.pend;
  qs.pend = null;
  if (!qs.fromDesktop && dom.appWindow) {
    const tf = qsReducedMotion
      ? `translate3d(${v.tx.toFixed(1)}px, 0px, 0px)`
      : `translate3d(${v.tx.toFixed(1)}px, 0px, 0px) rotateY(${(-qs.dir * 2.4 * v.prog).toFixed(2)}deg) scale(${v.scale.toFixed(3)})`;
    dom.appWindow.style.transform = tf;
  }
  if (qs.hintEl) {
    const op = Math.round(v.opacity * 100) / 100;
    if (op !== qs.lastOpacity) {
      qs.hintEl.style.opacity = op.toFixed(2);
      qs.lastOpacity = op;
    }
  }
}

/** v7.31：立即落帧（提交/回弹前调用，从真实视位接力零偏差） */
function flushQuickSwitchVisual() {
  if (qs.rafId) { cancelAnimationFrame(qs.rafId); qs.rafId = 0; }
  if (qs.pend) applyQuickSwitchVisual();
}

/**
 * 快速切换开始（独立接管 or 从 BOTTOM 拖拽转入）。
 * @returns {boolean} 是否成功接管（未接管时调用方继续原手势流程）
 */
export function beginQuickSwitch(x, y) {
  if (qs.active) return true; // 已接管中（window 级与导航栏 fusion 双入口并发）：幂等
  if (!quickSwitchEligible()) return false;
  qs.active = true;
  qs.fromDesktop = !state.isOpen || !isWindowVisiblyOpen(); // v7.36：挂起隐去态 = 桌面语义
  qs.fromBottomDrag = state.gestureType === 'BOTTOM_SWITCH' || state.drag.active;
  qs.dir = 1;
  qs.startX = x; qs.startY = y;
  qs.lastX = x; qs.lastT = performance.now();
  qs.vx = 0; qs.lastTx = 0;
  qs.moved = false;
  qs.grabInit = false; qs.grabOffsetX = 0; qs.grabOffsetScale = 0;
  qs.rafId = 0; qs.pend = null; qs.lastOpacity = -1; qs.hintDir = 0; // v7.31 帧合并状态复位
  clearPendingSwitchRebound(); // 回弹残留清零（此刻窗口应回到稳定态被接管）
  if (dom.gestureBarContainer) dom.gestureBarContainer.classList.add('switching');
  if (navigator.vibrate) navigator.vibrate(6);
  // 布防超时：begin 后始终未收到跟手 move（合成事件只投 pointerdown、
  // move/up 被 mouseDown/isDragging 门卫丢弃的一类泄漏路径）→ 400ms 自动撤防，
  // 杜绝陈旧 qs 会话吞掉后续底部手势
  clearTimeout(qs.armTimer);
  qs.armTimer = setTimeout(() => {
    if (qs.active && !qs.moved) cancelQuickSwitch();
  }, 400);
  return true;
}

/** 竖向主导出现时快速切换自行撤场：交还原手势语义
 *  （导航栏 fusion 的竖向上滑 / 应用内 BOTTOM 拖拽各自继续） */
function cancelQuickSwitch() {
  if (!qs.active) return;
  qs.active = false;
  clearTimeout(qs.armTimer);
  flushQuickSwitchVisual(); // v7.31：先落帧再交还原手势（竖向拖拽从真实视位续接）
  if (dom.gestureBarContainer) dom.gestureBarContainer.classList.remove('switching');
  hideQuickSwitchHint();
  if (dom.appWindow && !qs.fromDesktop && qs.lastTx !== 0) {
    dom.appWindow.style.transition = 'transform 0.3s cubic-bezier(0.22, 1.05, 0.28, 1)';
    dom.appWindow.style.transform = 'translate3d(0px, 0px, 0px)';
    setTimeout(() => {
      if (dom.appWindow && dom.appWindow.style.transition) {
        dom.appWindow.style.transition = '';
        if (!qs.active) dom.appWindow.style.transform = '';
      }
    }, 340);
  }
  // 从 BOTTOM 拖拽转入的：交还给竖向拖拽语义（drag 状态全程未动，无缝续接）
  if (state.gestureType === 'BOTTOM_SWITCH') state.gestureType = 'BOTTOM';
}

/** 快速切换跟手更新（窗口横移 + 3D 微偏转 + 提示浮层）
 *  接管瞬间：从竖向拖拽的当前视位无缝衔接（grab 偏移随横移衰减归零） */
export function moveQuickSwitch(x, y) {
  if (!qs.active) return;
  if (!qs.moved) {
    qs.moved = true;
    clearTimeout(qs.armTimer);
  }
  const dx = x - qs.startX;
  const dy = y - qs.startY;
  // 竖向主导出现（起判后又折返向上）：不是快速切换 —— 自行撤场交还原手势语义
  if (Math.abs(dy) > 28 && Math.abs(dy) > Math.abs(dx) * 1.2) {
    cancelQuickSwitch();
    return;
  }
  const now = performance.now();
  const dtMs = Math.max(1, now - qs.lastT);
  // v7.31：速度 EMA 时间归一（τ=50ms，α=1-e^(-dt/τ)）—— 60/120Hz 事件率下
  // 平滑一致，甩动提交阈值（COMMIT_VEL）不再随设备采样率漂移
  const alpha = 1 - Math.exp(-dtMs / 50);
  qs.vx += alpha * (((x - qs.lastX) / dtMs) * 1000 - qs.vx);
  qs.lastX = x; qs.lastT = now;
  qs.dir = dx >= 0 ? 1 : -1;
  const ax = Math.abs(dx);
  const near = Math.min(ax, QUICK_SWITCH.FAR_CROSS) * QUICK_SWITCH.DRAG_GAIN;
  const far = Math.max(0, ax - QUICK_SWITCH.FAR_CROSS) * QUICK_SWITCH.FAR_GAIN;
  let tx = Math.sign(dx) * (near + far);
  const prog = clamp(Math.abs(tx) / 110, 0, 1);
  let scale = qsReducedMotion ? 1 : 1 - 0.012 * prog;

  if (!qs.fromDesktop) {
    if (!qs.grabInit) {
      // 首帧捕获差量：qs 曲线在当前 dx 的值 vs 竖向拖拽留下的真实视位
      // （窗口视觉横移 = 窗口中心 − 屏幕中心 = iconCX + posSpring.px − W/2）
      qs.grabInit = true;
      const visualTx = (state.iconCX + state.posSpring.px) - window.innerWidth / 2;
      qs.grabOffsetX = visualTx - tx;
      qs.grabOffsetScale = state.scaleSpring.x - scale;
    }
    const decay = clamp(1 - Math.max(0, ax - QUICK_SWITCH.ENGAGE_PX) / 150, 0, 1);
    tx += qs.grabOffsetX * decay;
    scale = Math.max(0.05, scale + qs.grabOffsetScale * decay);
    qs.lastTx = tx;
  }
  // v7.31 流畅度：DOM 写入按帧合并 —— 状态即时更新，transform 与浮层透明度
  // 每帧至多写一次（永远取最新值；与 scheduleGestureRender 同一纪律）
  const hintProg = clamp(ax / 130, 0, 1);
  qs.pend = { tx, scale, prog, opacity: 0.25 + 0.75 * hintProg };
  if (!qs.rafId) {
    qs.rafId = requestAnimationFrame(() => {
      qs.rafId = 0;
      applyQuickSwitchVisual();
    });
  }
  updateQuickSwitchHint();
}

/**
 * 快速切换结束：提交切换（旧应用横向缩出 + 新应用对侧放大入场）或回弹。
 */
export function endQuickSwitch() {
  if (!qs.active) return;
  qs.active = false;
  clearTimeout(qs.armTimer);
  flushQuickSwitchVisual(); // v7.31：先落最后一帧，提交/回弹从真实视位接力零偏差
  if (dom.gestureBarContainer) dom.gestureBarContainer.classList.remove('switching');
  hideQuickSwitchHint();

  const dx = qs.lastX - qs.startX;
  const dir = dx >= 0 ? 1 : -1;
  const committed = Math.abs(dx) > QUICK_SWITCH.COMMIT_PX || Math.abs(qs.vx) > QUICK_SWITCH.COMMIT_VEL;
  const target = resolveQuickSwitchTarget(dir);

  // 点击穿透抑制：横滑释放不应被当作对桌面图标/应用内容的轻点
  state.lastGestureMoved = true;
  state.lastGestureEndedAt = performance.now();

  if (committed && target) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const rw = Math.round(W * 0.52);
    const rh = Math.round(H * 0.52);
    const top = Math.round((H - rh) / 2);
    // 新应用入场源：对侧半屏矩形（中心留在视口裕量内，过 isValidSourceRect）
    const entryRect = target.entryFromLeft
      ? { left: -Math.round(W * 0.30), top, width: rw, height: rh }
      : { left: Math.round(W * 0.78), top, width: rw, height: rh };
    // 旧应用退场终点：滑出方向的屏外矩形（isFiniteRect 允许视口外）
    const exitRect = target.entryFromLeft
      ? { left: Math.round(W * 1.10), top, width: rw, height: rh }
      : { left: -Math.round(W * 0.62), top, width: rw, height: rh };
    if (navigator.vibrate) navigator.vibrate(12);
    openApp(target.idx, null, entryRect, {
      prevExitRect: exitRect,
      prevOffsetX: qs.fromDesktop ? 0 : qs.lastTx,
    });
    return;
  }

  // 回弹（未达阈值 / 已到边缘）：CSS 过渡归位，动画语言与弹簧回弹同族
  if (committed && !target && navigator.vibrate) navigator.vibrate([8, 34]);
  if (dom.appWindow && !qs.fromDesktop && qs.lastTx !== 0) {
    dom.appWindow.style.transition = 'transform 0.36s cubic-bezier(0.22, 1.05, 0.28, 1)';
    dom.appWindow.style.transform = 'translate3d(0px, 0px, 0px)';
    setTimeout(() => {
      if (dom.appWindow && dom.appWindow.style.transition) {
        dom.appWindow.style.transition = '';
        dom.appWindow.style.transform = '';
      }
    }, 400);
  } else if (dom.appWindow && !qs.fromDesktop) {
    dom.appWindow.style.transition = '';
    dom.appWindow.style.transform = '';
  }
}

// ==================== 手势记录 ====================

function recordHistory(x, y, t) {
  state.drag.history.push({ x, y, t });
  if (state.drag.history.length > 6) state.drag.history.shift();
}

function getReleaseVelocity() {
  const h = state.drag.history;
  if (h.length < 2) return { vx: 0, vy: 0 };

  let vx = 0, vy = 0, w = 0;
  for (let i = h.length - 1; i > 0; i--) {
    const dt = (h[i].t - h[i - 1].t) / 1000;
    if (dt <= 0) continue;
    vx += (h[i].x - h[i - 1].x) / dt;
    vy += (h[i].y - h[i - 1].y) / dt;
    w++;
  }
  if (!w) return { vx: 0, vy: 0 };
  return { vx: vx / w, vy: vy / w };
}

// ==================== 共享判定（分屏通道与主通道同阈值） ====================

/** 向上轻划/停顿 → 唤出多任务预触发（只触发一次；含触觉反馈） */
function maybeTriggerRecentsPause(upwardDy, maxDy) {
  if (isRecentPauseTriggered) return;
  const elapsed = performance.now() - dragStartTime;
  if (upwardDy <= 40 || upwardDy >= maxDy) return;
  const { vx, vy } = getReleaseVelocity();
  const curSpeed = Math.hypot(vx, vy);
  // 向上轻划并减速/停顿，或者平缓上滑超过阈值，灵敏唤起后台多任务
  if ((elapsed > 110 && curSpeed < 450) || elapsed > 200 || (upwardDy > 50 && vy > -180)) {
    isRecentPauseTriggered = true;
    if (navigator.vibrate) navigator.vibrate([15, 35]);
  }
}

/** 统一 dismissal 判定：距离达标 / 速度达标 / 向上甩动 / 明显上滑位移 */
function shouldDismissGesture(dragDist, speed, vy, upwardDy) {
  const distThresh = window.innerHeight * DISMISS_DIST_RATIO;
  return dragDist > distThresh ||
    speed > DISMISS_VEL ||
    vy < -FLICK_VEL ||
    (upwardDy > 35 && vy < -120) ||
    upwardDy > 90;
}

// ==================== 手势开始 ====================

export function onDown(x, y, forcedType = null) {
  // 锁屏状态下屏蔽一切窗口手势（锁屏层有自己的上滑解锁手势）
  if (document.body.classList.contains('is-locked')) return;
  // 下拉状态栏/通知栏激活或正在交互时，防止干扰底层桌面
  if (isPullPanelsActive()) return;

  // v7.23：新手势入口先清快速切换回弹残留（残留 transition 会让后续逐帧
  // render 的 transform 写入被过渡滞后一帧，跟手感断裂）
  if (!qs.active) clearPendingSwitchRebound();

  // v7.23：纯桌面（无应用/无分屏/无壁纸菜单）的底部横滑 → 快速切换（唤起最近应用）。
  // 此路径下 state.drag 不激活（原 onDown 在此早退），qs 独立接管后续 move/up。
  // 底部来源两种：手势条容器强制 BOTTOM（应用内该容器才可见）；桌面态手势条随
  // appWindow 隐藏，只剩 window 级 mousedown/touchstart 的底部 75px 命中（forcedType=null）。
  const qsBottomZone = forcedType === 'BOTTOM' ||
    (!forcedType && y > window.innerHeight - 75);
  if (qsBottomZone && (!state.isOpen || !isWindowVisiblyOpen()) && !state.isClosing && !state.isDragging) {
    const tpOverlayEl = document.getElementById('themePickerOverlay');
    const tpMenuOpen = !!(tpOverlayEl && tpOverlayEl.classList.contains('active'));
    const splitActive = !!(typeof window !== 'undefined' && window.__splitInfo && window.__splitInfo().active);
    if (!tpMenuOpen && !splitActive && beginQuickSwitch(x, y)) return;
  }

  // v7.6：壁纸菜单打开时，边缘手势语义改为「关闭壁纸菜单」（拖拽跟手跳过，提交即回收）
  overlayBackDrag = false;
  ovBack = null;

  const winW = window.innerWidth;
  const winH = window.innerHeight;

  // ---------- 分屏态底部上滑：跟手抬起分屏浮层，松手退出分屏 / 唤出多任务 ----------
  if (!state.isOpen || state.isClosing || state.isDragging) {
    // v7.7-B：壁纸菜单打开时（桌面上下文、无前台应用）边缘手势必须继续可用——
    // 语义为「交互式预览返回关闭菜单」。此前此分支直接 return，边缘手势在
    // 桌面态完全失效（v7.6 的菜单拦截因此成为死代码，用户怎么滑都关不掉）。
    const tpOverlayEl = document.getElementById('themePickerOverlay');
    const tpMenuOpen = !!(tpOverlayEl && tpOverlayEl.classList.contains('active'));
    if (!(tpMenuOpen && !state.isDragging && !state.isClosing)) {
      const splitBridge = (typeof window !== 'undefined') ? window.__splitGestures : null;
      if (state.isDragging || state.isClosing || !splitBridge || !splitBridge.active()) return;
      if (forcedType !== 'BOTTOM' && y <= winH - 75) return;
      if (splitDragMode) return;
      splitDragMode = true;
      state.gestureType = 'BOTTOM';
      dragStartTime = performance.now();
      isRecentPauseTriggered = false;
      state.drag = {
        active: true,
        startX: x,
        startY: y,
        offsetX: 0,
        offsetY: 0,
        history: [{ x, y, t: performance.now() }],
      };
      state.isDragging = true;
      if (navigator.vibrate) navigator.vibrate(8);
      return;
    }
  }

  if (forcedType) {
    state.gestureType = forcedType;
  } else if (y > winH - 75) {
    state.gestureType = 'BOTTOM';
  } else if (x < EDGE_TRIGGER_WIDTH) {
    state.gestureType = 'EDGE_LEFT';
  } else if (x > winW - EDGE_TRIGGER_WIDTH) {
    state.gestureType = 'EDGE_RIGHT';
  } else if (y > winH - BOTTOM_TRIGGER) {
    state.gestureType = 'BOTTOM';
  } else {
    return;
  }

  // v7.8：边缘手势遭遇 page-like 全屏页 —— 查注册表接管（整页跟手滑出，透出桌面）
  if (state.gestureType === 'EDGE_LEFT' || state.gestureType === 'EDGE_RIGHT') {
    ovBack = findActiveOverlayBack();
    overlayBackDrag = !!ovBack;
    if (overlayBackDrag) {
      ovBack.beginGesture(state.gestureType === 'EDGE_LEFT' ? 1 : -1);
    } else if (state.navHistory.length <= 1) {
      // v7.28 预览式返回：宿主子页让位后，页内返回目标接管（模块消费器 > iframe PB；
      // canBack=true 才接管，根层语义（缩窗关闭）不受影响）
      const mb = getActiveModuleBack();
      if (mb && typeof mb.beginGesture === 'function') {
        pbDrag = { kind: 'module', def: mb };
        mb.beginGesture();
      } else {
        const pb = getActivePBTarget();
        if (pb && pb.canBack) {
          pbDrag = { kind: 'iframe', win: pb.win };
          pbSend(pb.win, { type: 'PB_GESTURE', phase: 'begin' });
        }
      }
    }
  }

  const curCX = state.iconCX + state.posSpring.px;
  const curCY = state.iconCY + state.posSpring.py;

  dragStartTime = performance.now();
  isRecentPauseTriggered = false;

  state.drag = {
    active: true,
    startX: x,
    startY: y,
    offsetX: curCX - x,
    offsetY: curCY - y,
    history: [{ x, y, t: performance.now() }],
    // 子页面边缘拖拽的起始进度（若正在返回动画中接管，从当前弹簧位置继续跟手）
    startSubP: state.navHistory.length > 1 ? clamp(state.subpageSpring.x, 0, 1) : 1,
  };
  state.isDragging = true;

  // 禁用 iframe 捕获，使拖拽在沙箱应用上保持 120 FPS 丝滑追踪
  if (dom.appWindow) dom.appWindow.classList.add('dragging');

  // 显示视觉反馈
  if (state.gestureType === 'BOTTOM') dom.triggerZone.classList.add('active');
  else if (state.gestureType === 'EDGE_LEFT') dom.edgeLeft.classList.add('active');
  else if (state.gestureType === 'EDGE_RIGHT') dom.edgeRight.classList.add('active');

  // 停止当前动画 — 但并行 Closing Actor / 放射场仍在飞行时保持循环运行，避免在飞动画被冻结
  if (state.rafId && !isParallelAnimationActive()) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
}

// ==================== 手势移动 ====================

export function onMove(x, y) {
  // v7.23：快速切换跟手路由（qs 独立接管时 state.drag 未激活，需在此先行）
  if (qs.active) { moveQuickSwitch(x, y); return; }
  if (isPullPanelsActive()) {
    if (state.drag.active) {
      state.drag.active = false;
      state.isDragging = false;
      dom.triggerZone.classList.remove('active');
      dom.edgeLeft.classList.remove('active');
      dom.edgeRight.classList.remove('active');
      // v7.28：拖拽被打断 —— 页内返回手势同步取消，避免子应用滞留在手势态
      if (pbDrag) {
        if (pbDrag.kind === 'iframe') pbSend(pbDrag.win, { type: 'PB_GESTURE', phase: 'end', commit: false, vx: 0 });
        else if (typeof pbDrag.def.endGesture === 'function') pbDrag.def.endGesture(false, 0);
        pbDrag = null;
      }
    }
    return;
  }
  if (!state.drag.active) return;
  recordHistory(x, y, performance.now());

  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  // ---------- 分屏态底部拖拽：浮层跟手抬起 + 停顿唤出多任务 ----------
  if (splitDragMode && state.gestureType === 'BOTTOM') {
    const upwardDy = state.drag.startY - y;
    maybeTriggerRecentsPause(upwardDy, window.innerHeight * 0.7);

    if (window.__splitGestures) window.__splitGestures.nudge(upwardDy);
    return;
  }

  // ---------- 底部拖拽 → 缩放关闭 / 停顿唤出多任务 ----------
  if (state.gestureType === 'BOTTOM') {
    // v7.23：横向起判 —— 底部左右轻滑转入快速切换（竖向关闭/多任务语义让位）。
    // 起判前先落定可能在途的竖向手势渲染帧，再写入横移 transform，杜绝首帧覆写闪烁
    if (!qs.active) {
      const dx0 = x - state.drag.startX;
      const dy0 = state.drag.startY - y;
      if (
        Math.abs(dx0) > QUICK_SWITCH.ENGAGE_PX &&
        Math.abs(dx0) > Math.abs(dy0) * QUICK_SWITCH.DOMINANCE &&
        !isRecentPauseTriggered &&
        quickSwitchEligible()
      ) {
        flushGestureRender(); // 清掉竖向阶段排程中的渲染帧（此刻视觉 ≈ 全屏，无跳变）
        dom.triggerZone.classList.remove('active');
        if (beginQuickSwitch(state.drag.startX, state.drag.startY)) {
          state.gestureType = 'BOTTOM_SWITCH';
          moveQuickSwitch(x, y);
          return;
        }
      }
    }

    const fingerCX = x + state.drag.offsetX;
    const fingerCY = y + state.drag.offsetY;

    const dragDist = Math.hypot(x - state.drag.startX, y - state.drag.startY);
    const upwardDy = state.drag.startY - y;
    const maxDrag = screenH * MAX_DRAG_RATIO;
    const rawP = 1 - dragDist / maxDrag;
    const p = clamp(rawP, -0.3, 1.2);

    // 监测上滑停顿 (Swipe Up and Pause -> Recents Multitasking)
    maybeTriggerRecentsPause(upwardDy, screenH * 0.7);
    if (isRecentPauseTriggered) dom.triggerZone.classList.add('holding-recents');

    // 直接设置弹簧位置（手动追踪）
    state.posSpring.x.x = fingerCX - state.iconCX;
    state.posSpring.x.v = 0;
    state.posSpring.x.target = fingerCX - state.iconCX;
    state.posSpring.y.x = fingerCY - state.iconCY;
    state.posSpring.y.v = 0;
    state.posSpring.y.target = fingerCY - state.iconCY;
    state.scaleSpring.x = p;
    state.scaleSpring.v = 0;
    state.scaleSpring.target = p;

    // 放射场与拖拽进度 1:1 同步跟手（释放后由弹簧接管）；DOM 写入按帧合并
    scheduleGestureRender(p, fingerCX, fingerCY, { syncRadial: true });
    return;
  }

  // ---------- 边缘拖拽 → 返回上级 / 关闭 ----------
  if (state.gestureType === 'EDGE_LEFT' || state.gestureType === 'EDGE_RIGHT') {
    // v7.8：page-like 全屏页交互式返回 —— 传原始投影位移，1:1/橡皮筋映射由 def 内部处理
    if (overlayBackDrag && ovBack) {
      const rawDxTp = state.gestureType === 'EDGE_LEFT'
        ? (x - state.drag.startX)
        : (state.drag.startX - x);
      ovBack.progressGesture(rawDxTp);
      return;
    }
    // v7.28 页内预览返回跟手转发（原始投影位移，1:1 映射由接收方处理）
    if (pbDrag) {
      const rawDxPb = state.gestureType === 'EDGE_LEFT'
        ? (x - state.drag.startX)
        : (state.drag.startX - x);
      if (pbDrag.kind === 'iframe') pbSend(pbDrag.win, { type: 'PB_GESTURE', phase: 'progress', dx: rawDxPb });
      else if (typeof pbDrag.def.progressGesture === 'function') pbDrag.def.progressGesture(rawDxPb);
      return;
    }
    const rawDx = state.gestureType === 'EDGE_LEFT'
      ? (x - state.drag.startX)
      : (state.drag.startX - x);
    const clampedDx = Math.max(0, rawDx);

    if (state.navHistory.length > 1) {
      // 子页面间滑动 — 进度写入弹簧（拖拽期循环跳过弹簧积分，松手后由同一弹簧无缝接管）
      const progress = clamp(clampedDx / (screenW * 0.85), 0, 1);
      const subP = clamp(state.drag.startSubP - progress, 0, 1);
      state.popInProgress = false; // 拖拽接管进行中的返回
      state.subpageSpring.x = subP;
      state.subpageSpring.v = 0;
      state.subpageSpring.target = subP;
      scheduleGestureRender(0, 0, 0, { forceSub: true, main: false });
    } else {
      // 根页面边缘滑动 → 协调缩放至图标方向
      const pullRatio = clampedDx / (screenW * 0.5);
      const p = clamp(1 - pullRatio * 0.35, 0.65, 1.0);

      const targetX = screenW / 2 + (x - state.drag.startX) * 0.3;
      const targetY = screenH / 2 + (y - state.drag.startY) * 0.15;

      state.posSpring.x.x = targetX - state.iconCX;
      state.posSpring.y.x = targetY - state.iconCY;
      state.scaleSpring.x = p;

      scheduleGestureRender(p, targetX, targetY, { syncRadial: true });
    }
  }
}

// ==================== 手势结束 ====================

export function onUp() {
  if (dom.appWindow) dom.appWindow.classList.remove('dragging');

  // v7.23：快速切换收尾（先于 drag 状态机 —— qs 可独立于 drag 存在，
  // 如纯桌面横滑唤起最近应用；提交/回弹逻辑全部在 endQuickSwitch 内）
  if (qs.active) endQuickSwitch();

  if (!state.drag.active) return;
  state.drag.active = false;
  state.isDragging = false;

  dom.triggerZone.classList.remove('active');
  dom.edgeLeft.classList.remove('active');
  dom.edgeRight.classList.remove('active');

  // 手势期渲染按帧合并：先落最后一帧再交接物理，弹簧初值与画面零偏差
  // v7.23：BOTTOM_SWITCH 路径不交接弹簧（横移反馈由 qs 直管，
  // flush 会把窗口写回全屏 transform 覆盖回弹起点）
  if (state.gestureType !== 'BOTTOM_SWITCH') flushGestureRender();

  const { vx, vy } = getReleaseVelocity();
  const speed = Math.hypot(vx, vy);
  const last = state.drag.history[state.drag.history.length - 1] || { x: 0, y: 0 };
  const first = state.drag.history[0] || last;
  const dragDist = Math.hypot(last.x - first.x, last.y - first.y);
  const upwardDy = first.y - last.y;

  // 记录本次手势是否带位移：供触控分发器识别"拖拽收尾的 click"（如上滑关闭应用
  // 后的释放事件），避免被误判为对桌面图标的轻点而误开应用
  state.lastGestureMoved = dragDist > 12;
  state.lastGestureEndedAt = performance.now();

  // ---------- 分屏态底部手势结束 ----------
  if (splitDragMode && state.gestureType === 'BOTTOM') {
    splitDragMode = false;
    state.gestureType = 'NONE';

    // 停顿触发后台多任务（多任务打开时分屏会自动挂起，合并卡片组可见）
    if (isRecentPauseTriggered) {
      isRecentPauseTriggered = false;
      openRecentApps();
      return;
    }

    if (window.__splitGestures) {
      if (shouldDismissGesture(dragDist, speed, vy, upwardDy)) window.__splitGestures.dismiss();
      else window.__splitGestures.rebound();
    }
    return;
  }

  // ---------- v7.23 底部横滑快速切换（已由顶部 qs 收尾处理提交/回弹） ----------
  if (state.gestureType === 'BOTTOM_SWITCH') {
    state.gestureType = 'NONE';
    return;
  }

  // ---------- 底部手势结束 ----------
  if (state.gestureType === 'BOTTOM') {
    dom.triggerZone.classList.remove('holding-recents');

    // 向上轻划或停顿触发后台多任务
    if (isRecentPauseTriggered || (state.isOpen && upwardDy > 50 && vy > -300 && speed < 520)) {
      isRecentPauseTriggered = false;
      const currentAppId = state.currentApp ? state.currentApp.id : null;
      openRecentApps(currentAppId);
      state.gestureType = 'NONE';
      return;
    }

    // 灵敏判定：距离达标、速度达标、向上快速甩动(flick)、或明显上滑位移
    if (shouldDismissGesture(dragDist, speed, vy, upwardDy)) {
      // 传递真实物理速度矢量给弹簧，保证非线性动力学无缝接续
      const springVx = clamp(vx * VEL_SCALE, -MAX_INITIAL_VEL, MAX_INITIAL_VEL);
      const springVy = clamp(vy * VEL_SCALE, -MAX_INITIAL_VEL, MAX_INITIAL_VEL);
      const scaleVel = clamp(-speed * SCALE_VEL_SCALE, -10, 0);
      closeApp(springVx, springVy, scaleVel);
    } else {
      // 回弹到全屏
      const targetX = window.innerWidth / 2 - state.iconCX;
      const targetY = window.innerHeight / 2 - state.iconCY;
      state.posSpring.setTarget(targetX, targetY, vx * 0.2, vy * 0.2);
      state.scaleSpring.setTarget(1, speed * 0.002);
      retargetRadialField(1);
      startLoop(OPEN_PARAMS);
    }
    state.gestureType = 'NONE';
    return;
  }

  // ---------- 边缘手势结束 ----------
  if (state.gestureType === 'EDGE_LEFT' || state.gestureType === 'EDGE_RIGHT') {
    // v7.8：page-like 全屏页交互式返回 —— 位移过半或速度达标提交，否则回弹（速度接力）
    if (ovBack) {
      overlayBackDrag = false;
      const rawDxOv = state.gestureType === 'EDGE_LEFT'
        ? (last.x - first.x)
        : (first.x - last.x);
      const screenWOv = window.innerWidth;
      const isCommitOv = rawDxOv > screenWOv * 0.5 || (speed > 400 && rawDxOv > 30);
      // 提交方向投影释放速度：EDGE_LEFT 提交方向 = +x，EDGE_RIGHT = -x
      const vRel = state.gestureType === 'EDGE_LEFT' ? vx : -vx;
      if (isCommitOv) ovBack.commitGesture(vRel);
      else ovBack.cancelGesture(vRel);
      ovBack = null;
      state.gestureType = 'NONE';
      return;
    }
    // v7.28 页内预览返回收尾：提交判定阈值与全系统一致（位移 25% 屏宽 / 速度 400px/s + 30px）
    if (pbDrag) {
      const rawDxPb = state.gestureType === 'EDGE_LEFT'
        ? (last.x - first.x)
        : (first.x - last.x);
      const screenWPb = window.innerWidth;
      const isCommitPb = rawDxPb > screenWPb * 0.25 || (speed > 400 && rawDxPb > 30);
      const vRelPb = state.gestureType === 'EDGE_LEFT' ? vx : -vx;
      if (pbDrag.kind === 'iframe') {
        pbSend(pbDrag.win, { type: 'PB_GESTURE', phase: 'end', commit: isCommitPb, vx: vRelPb });
      } else if (typeof pbDrag.def.endGesture === 'function') {
        pbDrag.def.endGesture(isCommitPb, vRelPb);
      }
      pbDrag = null;
      state.gestureType = 'NONE';
      return;
    }
    const rawDx = state.gestureType === 'EDGE_LEFT'
      ? (last.x - first.x)
      : (first.x - last.x);
    const screenW = window.innerWidth;
    const isCommit = rawDx > screenW * 0.25 || (speed > 400 && rawDx > 30);

    if (state.navHistory.length > 1) {
      // 子页面导航 — 统一弹簧物理：提交 = 带释放速度弹出到上级；取消 = 带释放速度回弹
      // （速度换算：页面右移 1 屏宽 = 进度减少 1，dSubP/dt = -effVx/screenW）
      const effVx = state.gestureType === 'EDGE_LEFT' ? vx : -vx; // 朝弹出方向为正
      const springV = clamp(-effVx / screenW, -4, 4);
      if (isCommit) {
        popSubPage(springV);
      } else {
        state.popInProgress = false;
        state.subpageSpring.setTarget(1, springV);
        startLoop();
      }
    } else {
      // 根页面：关闭或回弹
      if (isCommit) {
        closeApp(vx * 0.2, vy * 0.2, -speed * 0.002);
      } else {
        const targetX = window.innerWidth / 2 - state.iconCX;
        const targetY = window.innerHeight / 2 - state.iconCY;
        state.posSpring.setTarget(targetX, targetY, 0, 0);
        state.scaleSpring.setTarget(1, 0);
        retargetRadialField(1);
        startLoop(OPEN_PARAMS);
      }
    }
    state.gestureType = 'NONE';
  }
}

/** 初始化底部手势条高优先级事件监听器 */
export function initGestures() {
  const container = dom.gestureBarContainer || document.getElementById('gestureBarContainer');
  if (!container) return;

  // v7.23 调试钩子：快速切换判定内部状态透视（不影响生产逻辑）
  if (typeof window !== 'undefined' && !window.__qsDebug) {
    window.__qsDebug = () => ({
      active: qs.active,
      eligible: quickSwitchEligible(),
      gestureType: state.gestureType,
      dragActive: state.drag.active,
      isDragging: state.isDragging,
      isClosing: state.isClosing,
      isOpen: state.isOpen,
      scale: Number(state.scaleSpring.x.toFixed(4)),
      recentPause: isRecentPauseTriggered,
      pullPanels: isPullPanelsActive(),
      recentsActive: !!(document.getElementById('recentAppsOverlay') || {}).classList?.contains?.('active')
        || !!(document.getElementById('recentAppsOverlay') && document.getElementById('recentAppsOverlay').classList.contains('active')),
    });
  }

  container.addEventListener('pointerdown', (e) => {
    // 注意：这里不能 preventDefault —— 取消 pointerdown 会抑制后续整条鼠标兼容事件链
    // （mousedown/mousemove/mouseup 全部不再派发），鼠标拖拽会卡死在 dragging 状态。
    // 文本选择已由容器上的 user-select:none 兜底，无需 preventDefault。
    onDown(e.clientX, e.clientY, 'BOTTOM');
  });

  container.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      e.preventDefault();
      e.stopPropagation();
      onDown(e.touches[0].clientX, e.touches[0].clientY, 'BOTTOM');
    }
  }, { passive: false });
}
