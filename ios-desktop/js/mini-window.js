// ==================== mini-window.js — 真小窗（Freeform Floating Window，v7.57 多开版） ====================
//
// v7.53 初版：单实例浮动小窗 —— 可拖拽移动、三向拖拽调整宽高（长宽尺寸真实可调），
// 应用实例原地接管（salvage）：全屏 → 小窗内容不重载；小窗 → 全屏从小窗矩形展开。
// v7.57（issue #8）：升级多开 —— 多个小窗同时驻留桌面，完整层级/焦点语义：
//   · 同应用重复请求 → 已有小窗轻弹提示并置顶（不重复创建）
//   · 不同应用 → 新开小窗（级联偏移防完全重叠），不波及既有小窗
//   · 点击任意小窗置顶（z-index 递增 + 焦点态样式），非顶层小窗 header 自动变淡
//   · 并发上限 MINI_WINDOW_MAX（4）：超限时自动按「最早打开」顺序收起（LRU），
//     语义等同 iOS 画中画替换 —— 桌面不塞满，最新内容优先
//   · 关闭/展开/销毁/实例回收全部按 appId 精确路由，互不误伤
//
// Apple Design 纪律映射：
//   · 原则 2  1:1 跟随 —— Pointer Events + setPointerCapture，拖拽保留抓取偏移，
//     指针出界仍持续追踪；同时维护位置/时间戳历史供释放速度计算
//   · 原则 4  弹簧参数 —— 移动/重定位使用苹果画中画实测值（damping 1.0 / response 0.4）
//   · 原则 5  速度继承 —— 松手时把指针释放速度作为弹簧初速传入，无接缝
//   · 原则 9  橡皮筋 —— 越界渐进阻力（0.55 常数），绝不硬停
//   · 原则 11 帧间平滑 —— 位移走 transform，尺寸走 width/height（resize 必须 reflow，
//     但拖拽中每帧仅一次写入；rAF 合帧）—— v7.57 起 rAF 句柄随实例走（多窗并行动画）
//   · 原则 14 减弱动态 —— prefers-reduced-motion：弹簧退化为直接落位
//
// 实例托管纪律：与 page-stack 的 __actorHosted 同模式 —— wrapper.__miniHosted = true
// 时 renderPageStack 不隐藏、bg-freeze 经 pinLiveApp 保持实时运行（多开天然兼容：
// pinnedLiveIds 是集合，每窗一 id 各自钉住）。

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
// v7.57：同时驻留的小窗上限（手机视口 300×220 基准下 4 个已可铺满可用区；
// 超限按最早打开顺序自动收起 —— LRU 替换语义，桌面永不满溢）
export const MINI_WINDOW_MAX = 4;
// v7.57：置顶 z-index 步进基线（.mini-window 静态 z=590；置顶从 591 起递增，
// 与 dock/overlay 层（≥600）保持隔离）
const Z_BASE = 590;
const Z_STEP = 1;

const minis = new Map();        // appId -> MiniState（v7.57 多开注册表）
const pendingTakeovers = new Set(); // v7.57：全屏接管等待中的 appId 集合
let miniTopZ = Z_BASE;          // 当前最顶层小窗的 z-index（点击置顶递增）
let reducedMotion = false;

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

// ==================== 焦点 / 层级（v7.57 多开） ====================

/** 置顶某小窗：z-index 递增 + .is-back 焦点样式刷新（幂等） */
function bringToFront(m) {
  if (!m) return;
  miniTopZ += Z_STEP;
  m.el.style.zIndex = String(miniTopZ);
  minis.forEach((other) => {
    if (!other.el) return;
    other.el.classList.toggle('is-back', other !== m);
  });
}

/** 最顶层小窗（无参桥返回值；打开顺序即插入序，z 最高者赢） */
function topMini() {
  let best = null;
  minis.forEach((m) => {
    if (!best) { best = m; return; }
    const a = parseInt(m.el && m.el.style.zIndex || '0', 10) || 0;
    const b = parseInt(best.el && best.el.style.zIndex || '0', 10) || 0;
    if (a >= b) best = m;
  });
  return best;
}

/** LRU 收起：关闭最早打开（Map 插入序首个）的小窗，给新窗腾位 */
function evictOldest() {
  const first = minis.keys().next();
  if (first.done) return;
  closeMiniWindow({ appId: first.value, destroy: true });
}

// ==================== DOM ====================

const CLOSE_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const EXPAND_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H3v6M15 21h6v-6M3 15v6h6M21 9V3h-6"/></svg>';
// v7.62：Android 16 自由窗口三件套补全 —— minimize（收起到任务栏芯片）
const MIN_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>';

function buildMiniEl(app) {
  const el = document.createElement('div');
  // v7.57：多开 —— 移除单例硬编码 id="miniWindow"，改 data-app-id 路由
  el.className = 'mini-window';
  el.dataset.appId = app.id;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', `${app.name} 小窗`);
  el.innerHTML =
    `<div class="mini-header">`
    // v7.61：子页导航返回键（推入子页后显示；小窗窄格局不走全局页栈）
    + `<button class="mini-btn" data-act="back" aria-label="返回" title="返回" style="display:none">`
    + `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>`
    + `<span class="mini-badge">${getAppIconSVG(app.id)}</span>`
    + `<span class="mini-title">${app.name}</span>`
    + `<button class="mini-btn" data-act="minimize" aria-label="最小化" title="最小化">${MIN_ICON}</button>`
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
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    // v7.57：点击任意位置即置顶（多开焦点语义）—— capture 前置，拖拽/按钮均覆盖
    const m = minis.get(app.id);
    if (m) bringToFront(m);
  });
  el.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  return el;
}

function ensureMiniState(appId, fromRect) {
  const app = initialApps.find((a) => a && a.id === appId);
  if (!app) return null;
  const wrapper = ensureAppInstance(appId);
  if (!wrapper) return null;

  const b = bounds();
  // v7.57：级联入场 —— 第 n 个小窗向右下偏移 n×24px（模 5 回绕），多窗不全重叠
  const cascade = (minis.size % 5) * 24;
  let w = DEFAULT_W, h = DEFAULT_H, x = 0, y = 0;
  if (fromRect && fromRect.width > MINI_MIN_W * 0.6 && fromRect.height > MINI_MIN_H * 0.6) {
    // 从来源矩形（图标/卡片）派生初始位置，尺寸仍用默认
    x = Math.round(fromRect.left + fromRect.width / 2 - w / 2 + cascade);
    y = Math.round(fromRect.top + fromRect.height / 2 - h / 2 + cascade);
  } else {
    x = b.maxX - w - EDGE_MARGIN * 2 + cascade;
    y = b.maxY - h - EDGE_MARGIN * 2 + cascade;
  }
  x = hardClampPos(x, b.minX, Math.max(b.minX, b.maxX - w));
  y = hardClampPos(y, b.minY, Math.max(b.minY, b.maxY - h));
  w = Math.min(w, b.maxW);
  h = Math.min(h, b.maxH);

  const el = buildMiniEl(app);
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  el.style.zIndex = String(miniTopZ + 1);
  document.body.appendChild(el);

  const m = {
    appId,
    app,
    wrapper,
    el,
    bodyEl: el.querySelector('.mini-body'),
    backBtn: el.querySelector('[data-act="back"]'),
    titleEl: el.querySelector('.mini-title'),
    navStack: [0],   // v7.61：小窗内子页栈（根页 0；全屏接管的现场由 renderPageStack 重写，不继承）
    minimized: false, // v7.62：最小化态（收起到底部恢复芯片）
    x, y, w, h,
    posSpring: new Spring2D(MOVE_PARAMS, x, y, 0, 0),
    wSpring: new Spring({ ...RESIZE_PARAMS, initialValue: w }),
    hSpring: new Spring({ ...RESIZE_PARAMS, initialValue: h }),
    settled: true,
    rafId: 0,           // v7.57：rAF 句柄随实例走（多窗并行动画互不干扰）
    openedAt: Date.now(),
  };
  minis.set(appId, m);

  // 接管实例
  wrapper.__miniHosted = true;
  m.bodyEl.appendChild(wrapper);
  pinLiveApp(appId);
  ensureMiniPagePoses(m); // v7.61：全新实例无页栈位姿（全叠层显示最后一页）→ 初始化根页

  // 控制按钮（v7.57：闭包捕获自身 state，按 appId 精确路由）
  el.querySelector('[data-act="back"]').addEventListener('click', (e) => {
    e.stopPropagation();
    miniNavPop(m);
  });
  el.querySelector('[data-act="minimize"]').addEventListener('click', (e) => {
    e.stopPropagation();
    minimizeMiniWindow(m.appId);
  });
  el.querySelector('[data-act="expand"]').addEventListener('click', (e) => {
    e.stopPropagation();
    takeoverToFullscreen(m.appId);
  });
  el.querySelector('[data-act="close"]').addEventListener('click', (e) => {
    e.stopPropagation();
    closeMiniWindow({ appId: m.appId, destroy: true });
  });

  bindDrag(m);
  bindResize(m);
  bringToFront(m);

  // 入场：材质化到达（原则 12）—— 缩放 + 透明度，弹簧语言与系统一致
  el.classList.add('mini-enter');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('mini-enter')));
  return m;
}

// ==================== v7.61 小窗内子页导航 ====================
// 全局 pushSubPage 只服务 state.currentApp（全屏页栈）；小窗实例点击设置行等
// 二级导航入口时静默失败（currentApp 非该应用 → 直接 return），用户感知为
// 「小窗里点不进二级菜单」。这里为小窗实例提供独立的轻量页栈：
// 位姿语义与 renderPageStack 完全同款（活动 / 压暗 / 右侧隐藏三态），返回键在 header。

const MINI_NAV_MS = 240;
const MINI_NAV_EASE = 'cubic-bezier(0.2, 0, 0, 1)';

function miniPageIdxOf(el) {
  const id = el.id || '';
  const i = parseInt(id.slice(id.lastIndexOf('-') + 1), 10);
  return Number.isNaN(i) ? -1 : i;
}

/** 全新实例页面元素无任何页栈位姿（绝对定位全叠层，末页盖首页）→ 初始化根页可见 */
function ensureMiniPagePoses(m) {
  if (!m || !m.wrapper) return;
  m.wrapper.querySelectorAll('.app-page').forEach((p) => {
    if (p.dataset.tpHosted === '1') return;           // 双栏托管页不归小窗管
    if (p.style.transform && p.style.transform !== '') return; // 已有现场（全屏接管）→ 保留
    const idx = miniPageIdxOf(p);
    if (idx === 0) {
      p.style.transform = 'translate3d(0, 0, 0) scale(1)';
      p.style.opacity = '1';
      p.style.pointerEvents = 'auto';
      p.style.zIndex = '2';
    } else {
      p.style.transform = 'translate3d(100%, 0, 0)';
      p.style.opacity = '0';
      p.style.pointerEvents = 'none';
      p.style.zIndex = '3';
    }
  });
}

function miniPagesOf(m) {
  return m && m.wrapper ? Array.from(m.wrapper.querySelectorAll('.app-page')) : [];
}

function miniPageByIdx(m, idx) {
  return miniPagesOf(m).find((p) => miniPageIdxOf(p) === idx) || null;
}

/** 小窗内推入子页（返回 false = 无此页，调用方可回落全局路径） */
function miniNavPage(m, pageIdx) {
  if (!m || !m.wrapper) return false;
  const target = miniPageByIdx(m, pageIdx);
  if (!target || target.dataset.tpHosted === '1') return false;
  const curIdx = m.navStack[m.navStack.length - 1];
  if (curIdx === pageIdx) return true;
  const curEl = miniPageByIdx(m, curIdx);

  target.style.transition = 'none';
  target.style.transform = 'translate3d(100%, 0, 0)';
  target.style.opacity = '1';
  target.style.zIndex = '2';
  target.style.pointerEvents = 'auto';
  void target.offsetWidth; // 强制重排：先落右侧预备位姿再起过渡
  target.style.transition = `transform ${MINI_NAV_MS}ms ${MINI_NAV_EASE}`;
  target.style.transform = 'translate3d(0, 0, 0) scale(1)';
  if (curEl) {
    curEl.style.transition = `filter ${MINI_NAV_MS}ms linear`;
    curEl.style.transform = 'translate3d(0, 0, 0) scale(1)';
    curEl.style.opacity = '1';
    curEl.style.filter = 'brightness(0.65)';
    curEl.style.pointerEvents = 'none';
    curEl.style.zIndex = '1';
  }
  m.navStack.push(pageIdx);
  updateMiniNavHeader(m);
  return true;
}

/** 小窗内弹出子页（header 返回键入口） */
function miniNavPop(m) {
  if (!m || !m.navStack || m.navStack.length <= 1) return false;
  const curIdx = m.navStack.pop();
  const curEl = miniPageByIdx(m, curIdx);
  const prevEl = miniPageByIdx(m, m.navStack[m.navStack.length - 1]);
  if (curEl) {
    curEl.style.transition = `transform ${MINI_NAV_MS}ms ${MINI_NAV_EASE}`;
    curEl.style.transform = 'translate3d(100%, 0, 0)';
    curEl.style.opacity = '0';
    curEl.style.pointerEvents = 'none';
    curEl.style.zIndex = '3';
  }
  if (prevEl) {
    prevEl.style.transition = 'none';
    prevEl.style.transform = 'translate3d(0, 0, 0) scale(1)';
    prevEl.style.opacity = '1';
    prevEl.style.zIndex = '2';
    prevEl.style.pointerEvents = 'auto';
    void prevEl.offsetWidth;
    prevEl.style.transition = `filter ${MINI_NAV_MS}ms linear`;
    prevEl.style.filter = '';
  }
  updateMiniNavHeader(m);
  return true;
}

/** header 返回键显隐 + 标题跟随（根页 = 应用名，子页 = 页标题） */
function updateMiniNavHeader(m) {
  if (!m || !m.el) return;
  const deep = m.navStack.length > 1;
  if (m.backBtn) m.backBtn.style.display = deep ? 'flex' : 'none';
  if (m.titleEl && m.app) {
    const page = m.app.pages && m.app.pages[m.navStack[m.navStack.length - 1]];
    m.titleEl.textContent = deep && page && page.title ? page.title : m.app.name;
  }
}

// ==================== 入口 ====================

/**
 * 打开小窗（v7.57 多开：同应用置顶去重，不同应用级联新开，超限 LRU 收起）。
 * @param {string} appId
 * @param {{ fromRect?: ScreenRect }} [opts]
 * @returns {boolean} 是否成功
 */
export function enterMiniWindow(appId, opts = null) {
  trackReducedMotion();
  if (!appId) return false;

  // 已在显示：轻弹提示（原则 1：即时反馈）+ 置顶，不重复创建
  const existing = minis.get(appId);
  if (existing) {
    bringToFront(existing);
    if (existing.el) {
      existing.el.classList.remove('mini-flash');
      void existing.el.offsetWidth;
      existing.el.classList.add('mini-flash');
    }
    return true;
  }

  // v7.57：并发上限 —— 超出 MINI_WINDOW_MAX 按「最早打开」顺序自动收起（LRU 替换）
  if (minis.size >= MINI_WINDOW_MAX) evictOldest();

  const fromRect = opts && opts.fromRect;

  const app = initialApps.find((a) => a && a.id === appId);
  if (!app) return false;

  // 情形 A：应用正在全屏展示（或正在关闭动画中）→ 全屏接管路径：
  // 小窗先空壳入场，正常 closeApp 收窗动画播放完毕后（app-window-closed）
  // 再把实例元素搬进小窗 —— 关窗动画期间内容全程可见不跳变
  if (state.currentApp && state.currentApp.id === appId && (state.isOpen || state.isClosing)) {
    pendingTakeovers.add(appId);
    ensureMiniStateShell(appId, fromRect);
    try { closeApp(); } catch (e) {
      // 收窗失败兜底：直接搬运（罕见；内容可能闪一下但不丢状态）
      pendingTakeovers.delete(appId);
      const wrapper = ensureAppInstance(appId);
      const m = minis.get(appId);
      if (wrapper && m) moveWrapperIntoMini(m, wrapper);
    }
    return true;
  }

  // 情形 B：应用未打开 / 实例在后台休眠 → 立即接管
  return !!ensureMiniState(appId, fromRect);
}

/** 情形 A 的空壳小窗（实例稍后搬入） */
function ensureMiniStateShell(appId, fromRect) {
  const m = ensureMiniState(appId, fromRect);
  if (m && minis.get(appId) === m) {
    // 搬运前先把实例退回 pageStack 暂存：关窗动画期实例必须留在窗口内随窗收缩
    //（appendChild 回原位，绝不能 removeChild 孤儿化 —— 关窗动画内容全程可见）
    const wrapper = m.wrapper;
    try { dom.pageStack.appendChild(wrapper); } catch (e) {}
    wrapper.__miniHosted = true; // 期间 renderPageStack 不得隐藏它（关窗终点会调用）
    m.wrapper = null;            // 搬运在 app-window-closed 回调完成
  }
  return !!m;
}

/** 把实例搬进小窗（关窗动画终点调用） */
function moveWrapperIntoMini(m, wrapper) {
  if (!m || !wrapper) return;
  wrapper.__miniHosted = true;
  wrapper.style.display = 'block';
  m.bodyEl.appendChild(wrapper);
  m.wrapper = wrapper;
  pinLiveApp(m.appId);
  try { renderPageStackGuard(); } catch (e) {}
}

/** page-stack 重扫兜底（保持小窗实例可见；动态 import 防环） */
function renderPageStackGuard() {
  import('./page-stack.js').then((m) => { try { m.renderPageStack(); } catch (e) {} }).catch(() => {});
}

// ==================== v7.62 最小化 / 恢复（Android 16 自由窗口三件套补全） ====================
// 真机语义：最小化把自由窗口收进任务栏；本项目对齐为「左下角悬浮恢复芯片」——
// 点击芯片弹簧还原原位原尺寸，实例与页栈现场全程保留（与 desktop windowing 同构）。

const MINI_MINIMIZE_MS = 240;

/** 恢复芯片宿主（固定左下、导航条上方，多枚纵向堆叠） */
function ensureMiniChipsHost() {
  let host = document.getElementById('miniRestoreDock');
  if (!host) {
    host = document.createElement('div');
    host.id = 'miniRestoreDock';
    document.body.appendChild(host);
  }
  return host;
}

function removeMiniChip(appId) {
  const chip = document.querySelector(`.mini-restore-chip[data-chip-app-id="${appId}"]`);
  if (chip) chip.remove();
  const host = document.getElementById('miniRestoreDock');
  if (host && !host.children.length) host.remove();
}

/** 最小化：缩放退场到左下角 → 隐藏窗体 + 建恢复芯片（实例/页栈现场无损保留） */
export function minimizeMiniWindow(appId) {
  const m = minis.get(appId);
  if (!m || m.minimized) return false;
  m.minimized = true;
  if (m.rafId) { cancelAnimationFrame(m.rafId); m.rafId = 0; }
  const el = m.el;
  el.classList.add('mini-minimizing');
  if (navigator.vibrate) navigator.vibrate(14);
  setTimeout(() => {
    el.style.display = 'none';
    el.classList.remove('mini-minimizing');
    // 恢复芯片：应用图标 + 名称提示（动态文本走 textContent）
    const host = ensureMiniChipsHost();
    if (!host.querySelector(`.mini-restore-chip[data-chip-app-id="${appId}"]`)) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'mini-restore-chip';
      chip.dataset.chipAppId = appId;
      chip.setAttribute('aria-label', `还原 ${m.app.name} 小窗`);
      chip.title = m.app.name || appId;
      chip.innerHTML = getAppIconSVG(appId);
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        restoreMiniWindow(appId);
      });
      host.appendChild(chip);
    }
    try { window.dispatchEvent(new CustomEvent('mini-window-changed', { detail: { appId, active: false, minimized: true } })); } catch (err) {}
  }, MINI_MINIMIZE_MS);
  return true;
}

/** 恢复：从芯片矩形弹簧还原原位原尺寸（重用入场材质化语言） */
export function restoreMiniWindow(appId) {
  const m = minis.get(appId);
  if (!m || !m.minimized) return false;
  m.minimized = false;
  removeMiniChip(appId);
  const el = m.el;
  el.style.display = '';
  el.classList.add('mini-enter');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('mini-enter')));
  bringToFront(m);
  if (navigator.vibrate) navigator.vibrate(10);
  try { window.dispatchEvent(new CustomEvent('mini-window-changed', { detail: { appId, active: true, minimized: false } })); } catch (err) {}
  return true;
}

// ==================== 退出 ====================

/**
 * 关闭小窗（v7.57：按 appId 精确路由；不带 appId = 全部关闭，保持旧「收起」语义兼容）。
 * @param {{ appId?: string, destroy?: boolean }} [opts] destroy=true 时连同应用实例一起销毁
 */
export function closeMiniWindow(opts = null) {
  const destroy = !!(opts && opts.destroy);
  const appId = opts && opts.appId;
  const targets = appId ? [minis.get(appId)] : Array.from(minis.values());
  targets.forEach((m) => { if (m) closeOne(m, destroy); });
}

/** 关闭单个小窗（内部路由终点） */
function closeOne(m, destroy) {
  if (!m || !minis.has(m.appId)) return;
  minis.delete(m.appId);
  unpinLiveApp(m.appId);
  removeMiniChip(m.appId); // v7.62：最小化中关闭 → 同步摘除恢复芯片
  if (m.rafId) { cancelAnimationFrame(m.rafId); m.rafId = 0; }
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
  // 焦点样式刷新（被关窗口可能正是顶层）
  const top = topMini();
  if (top) bringToFront(top);
  try { window.dispatchEvent(new CustomEvent('mini-window-changed', { detail: { appId: m.appId, active: false } })); } catch (e) {}
}

/**
 * 小窗 → 全屏（v7.57：按 appId 路由）：实例原地归还 pageStack，
 * 从小窗当前矩形弹簧展开（原则 7 空间一致性）。
 * openApp 的前置守卫也会走这里（用户点桌面图标/搜索/Dock 的同应用）。
 * @param {string} appId
 * @param {ScreenRect|null} [customRect=null]
 * @returns {boolean}
 */
export function takeoverToFullscreen(appId, customRect = null) {
  const m = minis.get(appId);
  if (!m) return false;
  const idx = initialApps.findIndex((a) => a && a.id === appId);
  if (idx === -1) { closeMiniWindow({ appId, destroy: true }); return false; }

  const rect = (customRect && customRect.width > 0) ? customRect : {
    left: m.x, top: m.y, width: m.w, height: m.h,
  };

  // 归还实例（在 openApp 之前 —— renderPageStack 需要在 pageStack 里找到它）
  const wrapper = m.wrapper;
  if (wrapper) {
    wrapper.__miniHosted = false;
    try { dom.pageStack.appendChild(wrapper); } catch (e) {}
  }
  minis.delete(appId);
  unpinLiveApp(appId);
  removeMiniChip(appId); // v7.62：从最小化态接管全屏 → 同步摘除恢复芯片
  if (m.rafId) { cancelAnimationFrame(m.rafId); m.rafId = 0; }
  if (m.el) m.el.remove();
  const top = topMini();
  if (top) bringToFront(top);
  try { window.dispatchEvent(new CustomEvent('mini-window-changed', { detail: { appId, active: false } })); } catch (e) {}

  // 从小窗矩形展开全屏（内容温热，无启动屏）
  openApp(idx, null, rect, { skipMiniCheck: true });
  return true;
}

// ==================== 拖拽移动（原则 2/4/5/9） ====================

function bindDrag(m) {
  const header = m.el.querySelector('.mini-header');
  let drag = null;

  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.mini-btn')) return; // 按钮不触发拖拽
    const cur = minis.get(m.appId);
    if (!cur || cur !== m) return;
    e.preventDefault();
    try { header.setPointerCapture(e.pointerId); } catch (err) {}
    drag = {
      id: e.pointerId,
      grabDX: e.clientX - m.x, // 保留抓取偏移（原则 2：元素贴住手指原位）
      grabDY: e.clientY - m.y,
      history: [{ x: e.clientX, y: e.clientY, t: performance.now() }],
    };
    header.classList.add('dragging');
  });

  header.addEventListener('pointermove', (e) => {
    if (!drag || !m || e.pointerId !== drag.id) return;
    if (minis.get(m.appId) !== m) return;
    const now = performance.now();
    drag.history.push({ x: e.clientX, y: e.clientY, t: now });
    if (drag.history.length > 6) drag.history.shift();

    const nx = softClampPos(e.clientX - drag.grabDX, bounds().minX - m.w + 60, bounds().maxX - 60);
    const ny = softClampPos(e.clientY - drag.grabDY, bounds().minY, bounds().maxY - HEADER_H);
    m.x = nx; m.y = ny;
    m.posSpring.reconfigure(MOVE_PARAMS);
    m.posSpring.x.x = nx; m.posSpring.y.x = ny;
    m.el.style.transform = `translate3d(${nx.toFixed(1)}px, ${ny.toFixed(1)}px, 0)`;
  });

  const endDrag = (e) => {
    if (!drag || !m || e.pointerId !== drag.id) return;
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
    if (minis.get(m.appId) !== m) return;
    // 吸附目标：完整进入视口
    const b = bounds();
    const tx = hardClampPos(m.x, b.minX, Math.max(b.minX, b.maxX - m.w));
    const ty = hardClampPos(m.y, b.minY, Math.max(b.minY, b.maxY - m.h));
    startSettle(m, tx, ty, vx, vy);
  };
  header.addEventListener('pointerup', endDrag);
  header.addEventListener('pointercancel', endDrag);
}

/** 松手弹簧回弹（速度继承 + 橡皮筋归位）—— v7.57：rAF 随实例走 */
function startSettle(m, tx, ty, vx, vy) {
  if (!m || minis.get(m.appId) !== m) return;
  m.settled = false;
  m.posSpring.reconfigure(MOVE_PARAMS);
  // 从当前屏幕值开始（原则 3：中断无缝），携带释放速度
  m.posSpring.x.x = m.x; m.posSpring.y.x = m.y;
  m.posSpring.setTarget(tx, ty, vx, vy);
  if (reducedMotion) {
    m.x = tx; m.y = ty;
    m.el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    m.settled = true;
    return;
  }
  if (m.rafId) cancelAnimationFrame(m.rafId);
  let last = performance.now();
  const step = (now) => {
    if (!m || minis.get(m.appId) !== m) return;   // 已关闭/被替换 → 动画终止
    if (m.settled) return;
    const dt = Math.min(32, now - last) / 1000;
    last = now;
    m.posSpring.update(dt);
    const px = m.posSpring.px, py = m.posSpring.py;
    m.x = px; m.y = py;
    m.el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
    if (m.posSpring.isSettled(0.1, 4)) {
      m.x = tx; m.y = ty;
      m.el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      m.settled = true;
      return;
    }
    m.rafId = requestAnimationFrame(step);
  };
  m.rafId = requestAnimationFrame(step);
}

// ==================== 三向尺寸调整（原则 2/9） ====================

function bindResize(m) {
  m.el.querySelectorAll('.mini-grip').forEach((grip) => {
    let rz = null;
    grip.addEventListener('pointerdown', (e) => {
      if (minis.get(m.appId) !== m) return;
      e.preventDefault();
      e.stopPropagation();
      try { grip.setPointerCapture(e.pointerId); } catch (err) {}
      rz = {
        id: e.pointerId,
        dir: grip.getAttribute('data-dir'),
        startX: e.clientX,
        startY: e.clientY,
        startW: m.w,
        startH: m.h,
      };
      grip.classList.add('active');
    });
    grip.addEventListener('pointermove', (e) => {
      if (!rz || !m || e.pointerId !== rz.id) return;
      if (minis.get(m.appId) !== m) return;
      const b = bounds();
      const dx = e.clientX - rz.startX;
      const dy = e.clientY - rz.startY;
      if (rz.dir === 'se' || rz.dir === 'e') {
        m.w = softClampSize(rz.startW + dx, MINI_MIN_W, b.maxW);
      }
      if (rz.dir === 'se' || rz.dir === 's') {
        m.h = softClampSize(rz.startH + dy, MINI_MIN_H, b.maxH);
      }
      applySize(m);
    });
    const end = (e) => {
      if (!rz || !m || e.pointerId !== rz.id) return;
      grip.classList.remove('active');
      rz = null;
      if (minis.get(m.appId) !== m) return;
      // 松手：尺寸弹簧从当前值回弹到合法区间（无过冲，原则 4）
      const b = bounds();
      const tw = hardClampPos(m.w, MINI_MIN_W, b.maxW);
      const th = hardClampPos(m.h, MINI_MIN_H, b.maxH);
      m.wSpring.x = m.w; m.hSpring.x = m.h;
      m.wSpring.setTarget(tw, null);
      m.hSpring.setTarget(th, null);
      if (reducedMotion) {
        m.w = tw; m.h = th; applySize(m);
        return;
      }
      if (m.rafId) cancelAnimationFrame(m.rafId);
      let last = performance.now();
      const step = (now) => {
        if (!m || minis.get(m.appId) !== m) return; // 已关闭 → 终止
        const dt = Math.min(32, now - last) / 1000;
        last = now;
        m.wSpring.update(dt);
        m.hSpring.update(dt);
        m.w = m.wSpring.x;
        m.h = m.hSpring.x;
        applySize(m);
        if (m.wSpring.isSettled(0.1, 4) && m.hSpring.isSettled(0.1, 4)) {
          m.w = tw; m.h = th; applySize(m);
          return;
        }
        m.rafId = requestAnimationFrame(step);
      };
      m.rafId = requestAnimationFrame(step);
    };
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  });
}

function applySize(m) {
  if (!m || !m.el) return;
  m.el.style.width = `${m.w.toFixed(1)}px`;
  m.el.style.height = `${m.h.toFixed(1)}px`;
}

// ==================== 系统接线 ====================

/** 应用实例被外部销毁（多任务划卡/清空/卸载/分屏进入）→ 对应小窗跟随关闭 */
function onInstanceDestroyed(e) {
  const appId = e && e.detail && e.detail.appId;
  if (appId && minis.has(appId)) {
    const m = minis.get(appId);
    if (m.wrapper) m.wrapper.__miniHosted = false;
    closeMiniWindow({ appId, destroy: false });
  }
}

/** 关窗动画完成 → 搬运实例（全屏接管路径；v7.57：按 appId 路由） */
function onAppWindowClosed(e) {
  const appId = e && e.detail && e.detail.appId;
  if (!appId || !pendingTakeovers.has(appId)) return;
  pendingTakeovers.delete(appId);
  const wrapper = document.getElementById(`app-instance-${appId}`);
  const m = minis.get(appId);
  if (wrapper && m) moveWrapperIntoMini(m, wrapper);
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
  // v7.57：__miniWindowOpen 保持签名；__miniWindow(appId?) —— 带 appId 查指定小窗，
  // 无参返回最顶层（旧单例调用形态兼容）。expandToFullscreen 闭包捕获自身 appId，
  // openApp 守卫无需改动即可按正确小窗升级全屏。
  window.__miniWindowOpen = (appId, fromRect) => enterMiniWindow(appId, { fromRect });
  window.__miniWindow = (appId) => {
    const m = appId ? minis.get(appId) : topMini();
    return m ? {
      appId: m.appId,
      rect: () => ({ left: m.x, top: m.y, width: m.w, height: m.h }),
      expandToFullscreen: (rect) => takeoverToFullscreen(m.appId, rect || null),
    } : null;
  };
  // v7.57：多开调试/设置桥（数量、清单）
  window.__miniWindowAll = () => Array.from(minis.values()).map((m) => m.appId);
  // v7.61：小窗内子页导航桥（settings-two-pane 等实例上下文入口使用）。
  // 返回 false = 无小窗 / 无此页，调用方回落全局页栈路径
  window.__miniNav = (appId, pageIdx) => {
    const m = minis.get(appId);
    return m ? miniNavPage(m, pageIdx) : false;
  };

  // 视口变化：全部小窗收回视口内（旋转/分栏）
  window.addEventListener('resize', () => {
    if (!minis.size) return;
    minis.forEach((m) => {
      const b = bounds();
      const tx = hardClampPos(m.x, b.minX, Math.max(b.minX, b.maxX - m.w));
      const ty = hardClampPos(m.y, b.minY, Math.max(b.minY, b.maxY - m.h));
      m.w = Math.min(m.w, b.maxW);
      m.h = Math.min(m.h, b.maxH);
      applySize(m);
      startSettle(m, tx, ty, 0, 0);
    });
  });
}
