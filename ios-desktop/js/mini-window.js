// ==================== mini-window.js — 真小窗（Freeform Floating Window，v7.53） ====================
//
// 职责：单实例浮动小窗 —— 可拖拽移动、三向拖拽调整宽高（长宽尺寸真实可调），
// 应用实例原地接管（salvage）：全屏 → 小窗内容不重载；小窗 → 全屏从小窗矩形展开。
//
// Apple Design 纪律映射：
//   · 原则 2  1:1 跟随 —— Pointer Events + setPointerCapture，拖拽保留抓取偏移，
//     指针出界仍持续追踪；同时维护位置/时间戳历史供释放速度计算
//   · 原则 4  弹簧参数 —— 移动/重定位使用苹果画中画实测值（damping 1.0 / response 0.4）
//   · 原则 5  速度继承 —— 松手时把指针释放速度作为弹簧初速传入，无接缝
//   · 原则 9  橡皮筋 —— 越界渐进阻力（0.55 常数），绝不硬停
//   · 原则 11 帧间平滑 —— 位移走 transform，尺寸走 width/height（resize 必须 reflow，
//     但拖拽中每帧仅一次写入；rAF 合帧）
//   · 原则 14 减弱动态 —— prefers-reduced-motion：弹簧退化为直接落位
//
// 实例托管纪律：与 page-stack 的 __actorHosted 同模式 —— wrapper.__miniHosted = true
// 时 renderPageStack 不隐藏、bg-freeze 经 pinLiveApp 保持实时运行。

import { state } from './state.js';
import { dom } from './dom.js';
import { initialApps } from './apps-data.js';
import { openApp, closeApp } from './app-window.js';
import { ensureAppInstance, destroyAppInstance } from './page-stack.js';
import { pinLiveApp, unpinLiveApp } from './bg-freeze.js';
import { Spring2D, Spring, makeSpringParams } from './spring.js';
import { getAppIconSVG } from './app-icons.js';
import { MINI_MIN_W, MINI_MIN_H } from './desktop-prefs.js';

// Apple 画中画/重定位实测弹簧参数（Designing Fluid Interfaces 参数表）
const MOVE_PARAMS = makeSpringParams(0.4, 1.0, 1);
// 尺寸回弹：稍快、无过冲
const RESIZE_PARAMS = makeSpringParams(0.3, 1.0, 1);

const DEFAULT_W = 300;
const DEFAULT_H = 220;
const EDGE_MARGIN = 8;
const HEADER_H = 40;

let mini = null;            // 活动小窗状态
let pendingTakeover = null; // 全屏接管等待：{ appId }
let reducedMotion = false;
let rafId = 0;

function trackReducedMotion() {
  try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (e) { reducedMotion = false; }
}

/** 视口边界（含安全边距） */
function bounds() {
  const w = window.innerWidth || 360;
  const h = window.innerHeight || 720;
  return {
    minX: EDGE_MARGIN,
    minY: EDGE_MARGIN,
    maxX: w - EDGE_MARGIN,
    maxY: h - EDGE_MARGIN,
    maxW: Math.max(MINI_MIN_W, w - EDGE_MARGIN * 2),
    maxH: Math.max(MINI_MIN_H, h - EDGE_MARGIN * 2),
  };
}

/**
 * 橡皮筋（Apple 原则 9，0.55 常数近似）：
 * 超出越多跟随越少 —— 「响应了，但没有更多空间」
 */
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** 位移的边界软约束：界内 1:1，界外橡皮筋 */
export function softClampPos(v, lo, hi) {
  if (v < lo) return lo - rubberband(lo - v, 120);
  if (v > hi) return hi + rubberband(v - hi, 120);
  return v;
}

/** 尺寸的边界软约束（拖拽期阻尼，松手弹簧回弹） */
export function softClampSize(v, lo, hi) {
  if (v < lo) return lo - rubberband(lo - v, 60);
  if (v > hi) return hi + rubberband(v - hi, 60);
  return v;
}

/** 硬落位边界（弹簧目标值） */
function hardClampPos(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// ==================== DOM ====================

const CLOSE_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const EXPAND_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H3v6M15 21h6v-6M3 15v6h6M21 9V3h-6"/></svg>';

function buildMiniEl(app) {
  const el = document.createElement('div');
  el.className = 'mini-window';
  el.id = 'miniWindow';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', `${app.name} 小窗`);
  el.innerHTML =
    `<div class="mini-header">`
    + `<span class="mini-badge">${getAppIconSVG(app.id)}</span>`
    + `<span class="mini-title">${app.name}</span>`
    + `<button class="mini-btn" data-act="expand" aria-label="展开全屏" title="全屏">${EXPAND_ICON}</button>`
    + `<button class="mini-btn" data-act="close" aria-label="关闭小窗" title="关闭">${CLOSE_ICON}</button>`
    + `</div>`
    + `<div class="mini-body"></div>`
    + `<div class="mini-grip mini-grip-se" data-dir="se" aria-hidden="true"></div>`
    + `<div class="mini-grip mini-grip-e" data-dir="e" aria-hidden="true"></div>`
    + `<div class="mini-grip mini-grip-s" data-dir="s" aria-hidden="true"></div>`;
  // 手势隔离：阻断向 document 冒泡（桌面手势/触控调度器不介入小窗内部交互）。
  // 注意必须冒泡阶段而非捕获 —— 捕获阶段 stopPropagation 会阻断事件下沉到
  // header/grip 子元素，拖拽/缩放全部失效。
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  return el;
}

function ensureMiniState(appId, fromRect) {
  const app = initialApps.find((a) => a && a.id === appId);
  if (!app) return null;
  const wrapper = ensureAppInstance(appId);
  if (!wrapper) return null;

  const b = bounds();
  let w = DEFAULT_W, h = DEFAULT_H, x = 0, y = 0;
  if (fromRect && fromRect.width > MINI_MIN_W * 0.6 && fromRect.height > MINI_MIN_H * 0.6) {
    // 从来源矩形（图标/卡片）派生初始位置，尺寸仍用默认
    x = Math.round(fromRect.left + fromRect.width / 2 - w / 2);
    y = Math.round(fromRect.top + fromRect.height / 2 - h / 2);
  } else {
    x = b.maxX - w - EDGE_MARGIN * 2;
    y = b.maxY - h - EDGE_MARGIN * 2;
  }
  x = hardClampPos(x, b.minX, Math.max(b.minX, b.maxX - w));
  y = hardClampPos(y, b.minY, Math.max(b.minY, b.maxY - h));
  w = Math.min(w, b.maxW);
  h = Math.min(h, b.maxH);

  const el = buildMiniEl(app);
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  document.body.appendChild(el);

  mini = {
    appId,
    app,
    wrapper,
    el,
    bodyEl: el.querySelector('.mini-body'),
    x, y, w, h,
    posSpring: new Spring2D(MOVE_PARAMS, x, y, 0, 0),
    wSpring: new Spring({ ...RESIZE_PARAMS, initialValue: w }),
    hSpring: new Spring({ ...RESIZE_PARAMS, initialValue: h }),
    settled: true,
  };

  // 接管实例
  wrapper.__miniHosted = true;
  mini.bodyEl.appendChild(wrapper);
  pinLiveApp(appId);

  // 控制按钮
  el.querySelector('[data-act="expand"]').addEventListener('click', (e) => {
    e.stopPropagation();
    takeoverToFullscreen();
  });
  el.querySelector('[data-act="close"]').addEventListener('click', (e) => {
    e.stopPropagation();
    closeMiniWindow({ destroy: true });
  });

  bindDrag(el);
  bindResize(el);

  // 入场：材质化到达（原则 12）—— 缩放 + 透明度，弹簧语言与系统一致
  el.classList.add('mini-enter');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('mini-enter')));
  return mini;
}

// ==================== 入口 ====================

/**
 * 打开小窗。
 * @param {string} appId
 * @param {{ fromRect?: ScreenRect }} [opts]
 * @returns {boolean} 是否成功
 */
export function enterMiniWindow(appId, opts = null) {
  trackReducedMotion();
  if (!appId) return false;
  if (mini) {
    if (mini.appId === appId) {
      // 已在显示：轻弹提示（原则 1：即时反馈）
      if (mini.el) {
        mini.el.classList.remove('mini-flash');
        void mini.el.offsetWidth;
        mini.el.classList.add('mini-flash');
      }
      return true;
    }
    closeMiniWindow({ destroy: true });
  }
  const fromRect = opts && opts.fromRect;

  const app = initialApps.find((a) => a && a.id === appId);
  if (!app) return false;

  // 情形 A：应用正在全屏展示（或正在关闭动画中）→ 全屏接管路径：
  // 小窗先空壳入场，正常 closeApp 收窗动画播放完毕后（app-window-closed）
  // 再把实例元素搬进小窗 —— 关窗动画期间内容全程可见不跳变
  if (state.currentApp && state.currentApp.id === appId && (state.isOpen || state.isClosing)) {
    pendingTakeover = { appId };
    ensureMiniStateShell(appId, fromRect);
    try { closeApp(); } catch (e) {
      // 收窗失败兜底：直接搬运（罕见；内容可能闪一下但不丢状态）
      pendingTakeover = null;
      const wrapper = ensureAppInstance(appId);
      if (wrapper) moveWrapperIntoMini(wrapper);
    }
    return true;
  }

  // 情形 B：应用未打开 / 实例在后台休眠 → 立即接管
  return !!ensureMiniState(appId, fromRect);
}

/** 情形 A 的空壳小窗（实例稍后搬入） */
function ensureMiniStateShell(appId, fromRect) {
  const ok = !!ensureMiniState(appId, fromRect);
  if (ok && mini) {
    // 搬运前先把实例退回 pageStack 暂存：关窗动画期实例必须留在窗口内随窗收缩
    //（appendChild 回原位，绝不能 removeChild 孤儿化 —— 关窗动画内容全程可见）
    const wrapper = mini.wrapper;
    try { dom.pageStack.appendChild(wrapper); } catch (e) {}
    wrapper.__miniHosted = true; // 期间 renderPageStack 不得隐藏它（关窗终点会调用）
    mini.wrapper = null;         // 搬运在 app-window-closed 回调完成
  }
  return ok;
}

/** 把实例搬进小窗（关窗动画终点调用） */
function moveWrapperIntoMini(wrapper) {
  if (!mini || !wrapper) return;
  wrapper.__miniHosted = true;
  wrapper.style.display = 'block';
  mini.bodyEl.appendChild(wrapper);
  mini.wrapper = wrapper;
  pinLiveApp(mini.appId);
  try { renderPageStackGuard(); } catch (e) {}
}

/** page-stack 重扫兜底（保持小窗实例可见；动态 import 防环） */
function renderPageStackGuard() {
  import('./page-stack.js').then((m) => { try { m.renderPageStack(); } catch (e) {} }).catch(() => {});
}

// ==================== 退出 ====================

/**
 * 关闭小窗。
 * @param {{ destroy?: boolean }} [opts] destroy=true 时连同应用实例一起销毁
 */
export function closeMiniWindow(opts = null) {
  if (!mini) return;
  const m = mini;
  const destroy = !!(opts && opts.destroy);
  unpinLiveApp(m.appId);
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  if (m.el && m.el.parentNode) {
    m.el.classList.add('mini-exit');
    const el = m.el;
    setTimeout(() => { try { el.remove(); } catch (e) {} }, 220);
  }
  if (destroy && m.wrapper) {
    // 实例在小窗体内：先归还 pageStack 再销毁（destroyAppInstance 按全局 id 查询）
    const wrapper = m.wrapper;
    wrapper.__miniHosted = false;
    try { dom.pageStack.appendChild(wrapper); } catch (e) {}
    try { destroyAppInstance(m.appId); } catch (e) {}
  }
  mini = null;
  try { window.dispatchEvent(new CustomEvent('mini-window-changed', { detail: { appId: m.appId, active: false } })); } catch (e) {}
}

/**
 * 小窗 → 全屏：实例原地归还 pageStack，从小窗当前矩形弹簧展开（原则 7 空间一致性）。
 * openApp 的前置守卫也会走这里（用户点桌面图标/搜索/Dock 的同应用）。
 */
export function takeoverToFullscreen(customRect = null) {
  if (!mini) return false;
  const m = mini;
  const idx = initialApps.findIndex((a) => a && a.id === m.appId);
  if (idx === -1) { closeMiniWindow({ destroy: true }); return false; }

  const rect = (customRect && customRect.width > 0) ? customRect : {
    left: m.x, top: m.y, width: m.w, height: m.h,
  };

  // 归还实例（在 openApp 之前 —— renderPageStack 需要在 pageStack 里找到它）
  const wrapper = m.wrapper;
  if (wrapper) {
    wrapper.__miniHosted = false;
    try { dom.pageStack.appendChild(wrapper); } catch (e) {}
  }
  unpinLiveApp(m.appId);
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  if (m.el) m.el.remove();
  mini = null;
  try { window.dispatchEvent(new CustomEvent('mini-window-changed', { detail: { appId: m.appId, active: false } })); } catch (e) {}

  // 从小窗矩形展开全屏（内容温热，无启动屏）
  openApp(idx, null, rect, { skipMiniCheck: true });
  return true;
}

// ==================== 拖拽移动（原则 2/4/5/9） ====================

function bindDrag(el) {
  const header = el.querySelector('.mini-header');
  let drag = null;

  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.mini-btn')) return; // 按钮不触发拖拽
    if (!mini) return;
    e.preventDefault();
    try { header.setPointerCapture(e.pointerId); } catch (err) {}
    drag = {
      id: e.pointerId,
      grabDX: e.clientX - mini.x, // 保留抓取偏移（原则 2：元素贴住手指原位）
      grabDY: e.clientY - mini.y,
      history: [{ x: e.clientX, y: e.clientY, t: performance.now() }],
    };
    header.classList.add('dragging');
  });

  header.addEventListener('pointermove', (e) => {
    if (!drag || !mini || e.pointerId !== drag.id) return;
    const now = performance.now();
    drag.history.push({ x: e.clientX, y: e.clientY, t: now });
    if (drag.history.length > 6) drag.history.shift();

    const nx = softClampPos(e.clientX - drag.grabDX, bounds().minX - mini.w + 60, bounds().maxX - 60);
    const ny = softClampPos(e.clientY - drag.grabDY, bounds().minY, bounds().maxY - HEADER_H);
    mini.x = nx; mini.y = ny;
    mini.posSpring.reconfigure(MOVE_PARAMS);
    mini.posSpring.x.x = nx; mini.posSpring.y.x = ny;
    mini.el.style.transform = `translate3d(${nx.toFixed(1)}px, ${ny.toFixed(1)}px, 0)`;
  });

  const endDrag = (e) => {
    if (!drag || !mini || e.pointerId !== drag.id) return;
    header.classList.remove('dragging');
    // 释放速度：最近两个采样点的瞬时速度（px/s）（原则 5）
    const h = drag.history;
    let vx = 0, vy = 0;
    if (h.length >= 2) {
      const a = h[h.length - 2], b = h[h.length - 1];
      const dt = Math.max(1, b.t - a.t);
      vx = ((b.x - a.x) / dt) * 1000;
      vy = ((b.y - a.y) / dt) * 1000;
    }
    drag = null;
    // 吸附目标：完整进入视口
    const b = bounds();
    const tx = hardClampPos(mini.x, b.minX, Math.max(b.minX, b.maxX - mini.w));
    const ty = hardClampPos(mini.y, b.minY, Math.max(b.minY, b.maxY - mini.h));
    startSettle(tx, ty, vx, vy);
  };
  header.addEventListener('pointerup', endDrag);
  header.addEventListener('pointercancel', endDrag);
}

/** 松手弹簧回弹（速度继承 + 橡皮筋归位） */
function startSettle(tx, ty, vx, vy) {
  if (!mini) return;
  mini.settled = false;
  mini.posSpring.reconfigure(MOVE_PARAMS);
  // 从当前屏幕值开始（原则 3：中断无缝），携带释放速度
  mini.posSpring.x.x = mini.x; mini.posSpring.y.x = mini.y;
  mini.posSpring.setTarget(tx, ty, vx, vy);
  if (reducedMotion) {
    mini.x = tx; mini.y = ty;
    mini.el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    mini.settled = true;
    return;
  }
  if (rafId) cancelAnimationFrame(rafId);
  let last = performance.now();
  const step = (now) => {
    if (!mini || mini.settled) return;
    const dt = Math.min(32, now - last) / 1000;
    last = now;
    mini.posSpring.update(dt);
    const px = mini.posSpring.px, py = mini.posSpring.py;
    mini.x = px; mini.y = py;
    mini.el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
    if (mini.posSpring.isSettled(0.1, 4)) {
      mini.x = tx; mini.y = ty;
      mini.el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      mini.settled = true;
      return;
    }
    rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
}

// ==================== 三向尺寸调整（原则 2/9） ====================

function bindResize(el) {
  el.querySelectorAll('.mini-grip').forEach((grip) => {
    let rz = null;
    grip.addEventListener('pointerdown', (e) => {
      if (!mini) return;
      e.preventDefault();
      e.stopPropagation();
      try { grip.setPointerCapture(e.pointerId); } catch (err) {}
      rz = {
        id: e.pointerId,
        dir: grip.getAttribute('data-dir'),
        startX: e.clientX,
        startY: e.clientY,
        startW: mini.w,
        startH: mini.h,
      };
      grip.classList.add('active');
    });
    grip.addEventListener('pointermove', (e) => {
      if (!rz || !mini || e.pointerId !== rz.id) return;
      const b = bounds();
      const dx = e.clientX - rz.startX;
      const dy = e.clientY - rz.startY;
      if (rz.dir === 'se' || rz.dir === 'e') {
        mini.w = softClampSize(rz.startW + dx, MINI_MIN_W, b.maxW);
      }
      if (rz.dir === 'se' || rz.dir === 's') {
        mini.h = softClampSize(rz.startH + dy, MINI_MIN_H, b.maxH);
      }
      applySize();
    });
    const end = (e) => {
      if (!rz || !mini || e.pointerId !== rz.id) return;
      grip.classList.remove('active');
      rz = null;
      // 松手：尺寸弹簧从当前值回弹到合法区间（无过冲，原则 4）
      const b = bounds();
      const tw = hardClampPos(mini.w, MINI_MIN_W, b.maxW);
      const th = hardClampPos(mini.h, MINI_MIN_H, b.maxH);
      mini.wSpring.x = mini.w; mini.hSpring.x = mini.h;
      mini.wSpring.setTarget(tw, null);
      mini.hSpring.setTarget(th, null);
      if (reducedMotion) {
        mini.w = tw; mini.h = th; applySize();
        return;
      }
      if (rafId) cancelAnimationFrame(rafId);
      let last = performance.now();
      const step = (now) => {
        if (!mini) return;
        const dt = Math.min(32, now - last) / 1000;
        last = now;
        mini.wSpring.update(dt);
        mini.hSpring.update(dt);
        mini.w = mini.wSpring.x;
        mini.h = mini.hSpring.x;
        applySize();
        if (mini.wSpring.isSettled(0.1, 4) && mini.hSpring.isSettled(0.1, 4)) {
          mini.w = tw; mini.h = th; applySize();
          return;
        }
        rafId = requestAnimationFrame(step);
      };
      rafId = requestAnimationFrame(step);
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  });
}

function applySize() {
  if (!mini || !mini.el) return;
  mini.el.style.width = `${mini.w.toFixed(1)}px`;
  mini.el.style.height = `${mini.h.toFixed(1)}px`;
}

// ==================== 系统接线 ====================

/** 应用实例被外部销毁（多任务划卡/清空/卸载/分屏进入）→ 小窗跟随关闭 */
function onInstanceDestroyed(e) {
  const appId = e && e.detail && e.detail.appId;
  if (mini && appId && mini.appId === appId) {
    if (mini.wrapper) mini.wrapper.__miniHosted = false;
    unpinLiveApp(mini.appId);
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    if (mini.el) mini.el.remove();
    mini = null;
    try { window.dispatchEvent(new CustomEvent('mini-window-changed', { detail: { appId, active: false } })); } catch (err) {}
  }
}

/** 关窗动画完成 → 搬运实例（全屏接管路径） */
function onAppWindowClosed(e) {
  const appId = e && e.detail && e.detail.appId;
  if (!pendingTakeover || !appId || pendingTakeover.appId !== appId) return;
  pendingTakeover = null;
  const wrapper = document.getElementById(`app-instance-${appId}`);
  if (wrapper && mini) moveWrapperIntoMini(wrapper);
}

export function initMiniWindow() {
  trackReducedMotion();
  try {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => trackReducedMotion();
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  } catch (e) { /* 老引擎忽略 */ }

  document.addEventListener('app-instance-destroyed', onInstanceDestroyed);
  document.addEventListener('app-window-closed', onAppWindowClosed);

  // window 桥：openApp 前置守卫 / context-menu / 手势层使用
  window.__miniWindowOpen = (appId, fromRect) => enterMiniWindow(appId, { fromRect });
  window.__miniWindow = () => mini ? {
    appId: mini.appId,
    rect: () => ({ left: mini.x, top: mini.y, width: mini.w, height: mini.h }),
    expandToFullscreen: (rect) => takeoverToFullscreen(rect || null),
  } : null;

  // 视口变化：小窗收回视口内（旋转/分栏）
  window.addEventListener('resize', () => {
    if (!mini) return;
    const b = bounds();
    const tx = hardClampPos(mini.x, b.minX, Math.max(b.minX, b.maxX - mini.w));
    const ty = hardClampPos(mini.y, b.minY, Math.max(b.minY, b.maxY - mini.h));
    mini.w = Math.min(mini.w, b.maxW);
    mini.h = Math.min(mini.h, b.maxH);
    applySize();
    startSettle(tx, ty, 0, 0);
  });
}
