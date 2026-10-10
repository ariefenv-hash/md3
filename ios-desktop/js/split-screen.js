// ==================== split-screen.js — 真正的双应用分屏（复用 RK4 弹簧物理引擎） ====================
//
// 设计要点:
//   1. 双窗格各自持有独立 Spring2D(位置) + Spring(缩放)，与 app-window.js 的 Closing Actor
//      完全同一套 RK4 物理内核 —— 两个窗口从各自多任务卡片“指哪打哪”并行展开/闭合，互不阻塞
//   2. 中间隔离带支持拖拽调整比例：拖拽期间 1:1 跟手，释放后交给比例弹簧接管（携带释放速度
//      回弹收敛，靠近中线自动吸附），双击轨道回中；横屏左右分屏 / 竖屏上下分屏，随旋转自动切换
//   3. 退出分屏时两窗格并行弹簧飞回各自桌面图标（实时重校准位置），落地前广播 APP_CLOSE
//      生命周期事件（见 page-stack.js），iframe 子应用自行清理定时器，杜绝内存泄漏
//   4. 入口：多任务后台 → 点「分屏」→ 点选另一张卡片组成分屏（防同应用配对）；
//      桌面组合图标托盘轻点 → restoreFromGroup 从图标位置展开（split-groups.js）
//   5. v7.32 性能四连：① 拖拽/比例弹簧期窗格内 iframe 尺寸冻结（子文档零 reflow，
//      弹簧收敛后一次性解冻）② 窗格几何写入脏检查 + 量化（不变不写，style recalc 最小化）
//      ③ 静止分屏 rAF 零空转（旧实现 phase='open' 后循环永转）④ 状态栏高度/可用高度
//      会话级快照（热路径零布局读取）+ 上滑退出 nudge rAF 帧合并
//   6. v7.33 分屏组合：home/上滑快划不再解散 —— combineExit 以组合形式向中心缩放退出，
//      配对保存为桌面组合图标（多组共存）；多任务挂起/恢复由 display:none 硬切改为
//      分屏↔合并卡片组的连续缩放飞行（指哪打哪）；退出动画期提前广播 APP_CLOSE，
//      子应用计时器即刻静止，主线程零争抢全连丝滑

import { state } from './state.js';
import { initialApps } from './apps-data.js';
import { Spring, Spring2D, makeSpringParams } from './spring.js';
import { curOpenParams, curCloseParams } from './animation-presets.js';
import { clamp, smoothstep } from './utils.js';
import { getAppIconSVG } from './app-icons.js';
import { createDynamicIconHTML } from './dynamic-icons.js';
import { broadcastAppClose, destroyAppInstance, reactivateScripts, releaseAppListeners } from './page-stack.js';
import { closeApp } from './app-window.js';
import { setLiveApps } from './bg-freeze.js';
import { saveSplitGroup, getChipRect, buildPairIconHTML } from './split-groups.js';

// ---------- 常量 ----------
const GAP_PX = 8;                              // 两窗格间视觉间隙（隔离带宽度）
const MIN_RATIO = 0.08, MAX_RATIO = 0.92;      // 分隔带动态拖拽比例约束
const DISMISS_UPPER_THRESHOLD = 0.80;           // 超过 80%：上方/左方应用比例占大头，下方/右方解散
const DISMISS_LOWER_THRESHOLD = 0.20;           // 低于 20%：下方/右方应用比例占大头，上方/左方解散
const OPEN_SPRING = makeSpringParams(0.32, 0.98, 1);   // 分屏展开：快速收敛、一步到位
const CLOSE_SPRING = makeSpringParams(0.28, 1.02, 1); // 退出分屏：零过冲、无回弹
const RATIO_SPRING = makeSpringParams(0.22, 0.98, 1); // 分隔带释放回弹：轻快利落
const SETTLE_POS_EPS = 0.0015, SETTLE_VEL_EPS = 0.02;
const GRACE_REMOVE_MS = 260;                   // 关闭动画后广播宽限（> page-stack 220ms）
const COMBINE_END_SCALE = 0.055;               // v7.33 组合缩退终点比例（全屏 → ~21px 幽灵胶囊）
const GHOST_SIZE = 48;                         // 组合幽灵尺寸（与托盘 chip 同规格）
const COMBINE_SPRING = makeSpringParams(0.30, 1.0, 1);  // 组合缩退：零过冲聚拢
const FLY_SPRING = makeSpringParams(0.30, 1.0, 1);      // 挂起/恢复连续缩放飞行
// ==================== v7.62 Android 16 QPR1 90:10 分屏 ====================
// 真机语义（Android Authority / AA 实测报道 1:1）：
//   · 90:10 模式下一侧最大化、另一侧最小化成条；轻点小窗 → 两应用互换大小窗
//   · 互换由比例弹簧接管（与拖拽释放同一条 RATIO_SPRING 回弹链路，动画连续）
//   · 入口：分隔带把手长按 480ms 进入 / 再长按退出（回到对半）
const RATIO_9010 = 0.90;                       // 进入 90:10 时的目标比例（大侧）
const SWAP_ZONE_HI = 0.72;                     // ratio ≥ 此值 → 小窗格（Pane 1）呈现互换提示
const SWAP_ZONE_LO = 0.28;                     // ratio ≤ 此值 → 小窗格（Pane 0）呈现互换提示
const DIVIDER_LONG_PRESS_MS = 480;             // 把手长按阈值（与 QS 1×1 蓝牙长按同规格）

// ---------- 模块状态 ----------
let overlayEl = null;    // #splitScreenOverlay
let dividerEl = null;    // .split-divider
let session = null;      // { axis, ratio, ratioSpring, panes[], phase, rafId, drag, sb, usable, contentFrozen }
let pickSourceAppId = null; // 分屏配对模式：第一张选定的卡片
// v7.53 隐藏会话（组合退场保活）：combineExit 后窗格 DOM 与实况内容原地保留
//（display:none），后台卡片预览可实时取样（bug①修复），点图标/组合卡秒恢复（bug②）
let parked = null;       // { overlay, session, aId, bId }

// v7.32 上滑退出跟手：nudge 事件率直写改 rAF 帧合并（与 v7.31 快速切换同纪律）
let pendingNudgeDy = 0;
let nudgeRafId = 0;
// v7.33 当前 nudge 抬起量（px）：dismiss 组合时折叠进缩退动画起点，消除瞬时归位跳变
let curNudgeLift = 0;

// ==================== v7.32 窗格内容（iframe）冻结 ====================

/** 冻结窗格内 iframe 尺寸：拖拽与比例弹簧期间窗格外壳照常 relayout（div 布局成本
 *  极低），但子文档停止逐帧 reflow/repaint —— 120Hz 拖拽 × 2 窗格的子文档连锁
 *  重排是分屏最大性能黑洞；内容由窗格 overflow:hidden 裁切（真实安卓拖动观感）。 */
function freezePanesContent() {
  if (!session || session.contentFrozen) return;
  session.contentFrozen = true;
  for (const p of session.panes) {
    for (const f of p.el.querySelectorAll('iframe')) {
      f.style.width = f.offsetWidth + 'px';
      f.style.height = f.offsetHeight + 'px';
    }
  }
}

/** 解冻：iframe 尺寸交还 100% 自适应 —— 一次性 resize 到最终几何（弹簧收敛后调用） */
function unfreezePanesContent() {
  if (!session || !session.contentFrozen) return;
  session.contentFrozen = false;
  for (const p of session.panes) {
    for (const f of p.el.querySelectorAll('iframe')) {
      f.style.width = '100%';
      f.style.height = '100%';
    }
  }
}

// ---------- 小工具 ----------
function findApp(appId) {
  return initialApps.find((a) => a.id === appId) || null;
}

function toast(msg) {
  if (window.showSystemToast) window.showSystemToast(msg);
}

/** 实时查找应用在当前桌面上的图标矩形（退出分屏“指哪打哪”归巢目标） */
function findDesktopIconRect(appId) {
  const el = document.querySelector(`.app-icon[data-id="${appId}"]`);
  if (el) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return r;
  }
  return null;
}

// ==================== 分屏配对模式（由 recent-apps.js 驱动） ====================

/** 进入配对模式：记录第一张卡片对应的应用 */
export function enterPickMode(sourceAppId) {
  pickSourceAppId = sourceAppId || null;
  return pickSourceAppId;
}

/** 取消配对模式（关闭多任务/再次点分屏按钮时调用） */
export function cancelPickMode() {
  pickSourceAppId = null;
}

/**
 * 处理配对模式下点选的卡片。
 * @returns {Object|null} 合法配对返回分屏载荷 {appAId, appBId, rectA, rectB}；否则返回 null（内部已 toast 提示）
 */
export function handleCardPick(appId, cardEl) {
  const sourceId = pickSourceAppId;
  cancelPickMode();
  if (!sourceId) return null;
  if (appId === sourceId) {
    toast('请选择另一个不同的应用进行分屏');
    return null;
  }
  const appA = findApp(sourceId);
  const appB = findApp(appId);
  if (!appA || !appB) {
    toast('该应用暂不支持分屏');
    return null;
  }
  const cardA = document.querySelector(`.recent-app-card[data-app-id="${sourceId}"]`);
  if (!cardEl || !cardA) {
    toast('无法获取卡片位置，请重试');
    return null;
  }
  return {
    appAId: sourceId,
    appBId: appId,
    rectA: cardA.getBoundingClientRect(),
    rectB: cardEl.getBoundingClientRect(),
    replaceActive: true, // v7.35：配对选择可顶替在场会话（旧会话静默组合保存）
  };
}

// ==================== 窗格构建 ====================

function buildPaneShell(app) {
  const el = document.createElement('div');
  el.className = 'split-pane';
  // 应用总线标记：分屏窗格不经过 page-stack 的 app-instance-wrapper，
  // 用 data-bus-app-id 让 app-bus.js 能向窗格内 iframe 定向投递跨应用消息
  el.setAttribute('data-bus-app-id', app.id);
  el.innerHTML = `
    <div class="app-header"><span class="split-pane-title">${app.name}</span></div>
    <div class="app-body"><div class="page-stack"><div class="app-page split-pane-page"></div></div></div>
  `;
  return el;
}

/** 挂载应用第一页内容并重激活内联脚本（与 page-stack.js 同机制） */
function mountPaneContent(paneEl, app) {
  const pageEl = paneEl.querySelector('.split-pane-page');
  const page = app.pages && app.pages[0];
  if (page && typeof page.content === 'string' && page.content.length) {
    pageEl.innerHTML = page.content;
    reactivateScripts(pageEl);
  } else {
    const iconHTML = app.type ? createDynamicIconHTML(app.type, false) : getAppIconSVG(app.id);
    pageEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;">
      <div style="width:72px;height:72px;">${iconHTML}</div></div>`;
  }
  // 向新挂载的 iframe 注入 MD3 动态色彩（onload 后由 iframeAppContent 内联回调持续同步）
  paneEl.querySelectorAll('iframe').forEach((iframe) => {
    if (window.__syncIframeApp) window.__syncIframeApp(iframe);
  });
}

// ==================== 布局 ====================

function computeAxis() {
  return window.innerWidth >= window.innerHeight ? 'x' : 'y';
}

/** 主状态栏高度（px）。分屏窗格从其下缘开始铺，避免与系统状态栏双层叠压；
 *  实时量取元素以兼容 safe-area-inset，量不到时回落 42px 设计值。元素引用缓存，
 *  断链（重建）时自动重查 —— 拖拽热路径每事件调用不再触发 querySelector。 */
let statusBarElCache = null;
function statusBarH() {
  if (!statusBarElCache || !statusBarElCache.isConnected) {
    statusBarElCache = document.querySelector('.status-bar');
  }
  const h = statusBarElCache ? statusBarElCache.getBoundingClientRect().height : 0;
  return h > 10 ? h : 42;
}

function paneRects(axis, ratio, sb, usable) {
  const W = window.innerWidth, H = window.innerHeight, half = GAP_PX / 2;
  const SB = sb;                               // v7.32：会话级快照（热路径零布局读取）
  if (axis === 'x') {
    return [
      { left: 0, top: SB, width: Math.max(W * ratio - half, 40), height: usable },
      { left: W * ratio + half, top: SB, width: Math.max(W * (1 - ratio) - half, 40), height: usable },
    ];
  }
  return [
    { left: 0, top: SB, width: W, height: Math.max(usable * ratio - half, 40) },
    { left: 0, top: SB + usable * ratio + half, width: W, height: Math.max(usable * (1 - ratio) - half, 40) },
  ];
}

function applyPaneRect(pane, rect) {
  pane.rect = rect;
  const s = pane.el.style;
  // v7.32 脏检查 + 0.25px 量化：值不变不写 —— axis-x 拖拽期 top/height 全程零写入，
  // axis-y 拖拽期 left/width 全程零写入；高频 relayout 的 style recalc 触发面最小化
  const L = Math.round(rect.left * 4) / 4 + 'px';
  const T = Math.round(rect.top * 4) / 4 + 'px';
  const W = Math.round(rect.width * 4) / 4 + 'px';
  const H = Math.round(rect.height * 4) / 4 + 'px';
  const c = pane._geo || (pane._geo = {});
  if (c.L !== L) { s.left = L; c.L = L; }
  if (c.T !== T) { s.top = T; c.T = T; }
  if (c.W !== W) { s.width = W; c.W = W; }
  if (c.H !== H) { s.height = H; c.H = H; }
}

function applyDividerLayout() {
  if (!session || !dividerEl) return;
  // v7.32：几何写入同享脏检查 + 量化纪律（axis-x 拖拽期 top 恒不变零写入）
  if (session.axis === 'x') {
    dividerEl.classList.add('axis-x');
    dividerEl.classList.remove('axis-y');
    const L = Math.round(window.innerWidth * session.ratio * 4) / 4 + 'px';
    const T = Math.round(session.sb * 4) / 4 + 'px';
    const c = dividerEl._geo || (dividerEl._geo = {});
    if (c.L !== L) { dividerEl.style.left = L; c.L = L; }
    if (c.T !== T) { dividerEl.style.top = T; c.T = T; }
  } else {
    dividerEl.classList.add('axis-y');
    dividerEl.classList.remove('axis-x');
    const T = Math.round((session.sb + session.usable * session.ratio) * 4) / 4 + 'px';
    const c = dividerEl._geo || (dividerEl._geo = {});
    if (c.L !== '0px') { dividerEl.style.left = '0px'; c.L = '0px'; }
    if (c.T !== T) { dividerEl.style.top = T; c.T = T; }
  }
}

/** v7.32：视口几何会话级快照（状态栏高度/可用高度）—— enterSplit 与旋转时刷新，
 *  热路径（逐帧 relayout）不再触发任何 getBoundingClientRect 布局读取 */
function refreshViewportSnapshot() {
  if (!session) return;
  const SB = statusBarH();
  session.sb = SB;
  session.usable = Math.max(window.innerHeight - SB, 80);
}

function relayout() {
  if (!session) return;
  const rects = paneRects(session.axis, session.ratio, session.sb, session.usable);
  applyPaneRect(session.panes[0], rects[0]);
  applyPaneRect(session.panes[1], rects[1]);
  applyDividerLayout();
  syncSwapOverlays(); // v7.62：90:10 互换提示随比例越区同步挂载/卸载
}

// ==================== v7.62 90:10 点击互换 ====================

/** 按比例区间同步小窗格互换提示层的挂载/卸载（relayout 热路径调用，全量幂等） */
function syncSwapOverlays() {
  if (!session || session.phase !== 'open' || !overlayEl) return;
  const inSwapZone = !session.drag.active &&
    (session.ratio >= SWAP_ZONE_HI || session.ratio <= SWAP_ZONE_LO);
  const smallIdx = session.ratio > 0.5 ? 1 : 0;
  for (let i = 0; i < 2; i++) {
    const pane = session.panes[i];
    if (!pane || !pane.el) continue;
    const want = inSwapZone && i === smallIdx;
    const has = !!(pane.swapHint && pane.swapHint.isConnected);
    if (want && !has) attachSwapHint(pane);
    else if (!want && has) {
      pane.swapHint.remove();
      pane.swapHint = null;
    }
  }
}

/** 给小窗格挂互换提示层：应用图标 + 名称 + 「轻点互换」角标（覆盖在 iframe 之上） */
function attachSwapHint(pane) {
  const hint = document.createElement('div');
  hint.className = 'pane-swap-hint';
  hint.innerHTML = `
    <span class="pane-swap-icon">${getAppIconSVG(pane.app.id)}</span>
    <span class="pane-swap-name"></span>
    <span class="pane-swap-tip">轻点互换</span>
  `;
  hint.querySelector('.pane-swap-name').textContent = pane.app.name || pane.app.id; // 动态文本走 textContent
  hint.addEventListener('click', (e) => {
    e.stopPropagation();
    swap9010();
  });
  pane.el.appendChild(hint);
  pane.swapHint = hint;
}

/** 互换大小窗：目标比例 = 当前比例的镜像（1 - ratio），由比例弹簧平滑完成动画 */
function swap9010() {
  if (!session || session.phase !== 'open' || session.drag.active) return;
  const target = clamp(1 - session.ratio, MIN_RATIO + 0.02, MAX_RATIO - 0.02);
  session.ratioSpring.x = session.ratio;
  session.ratioSpring.v = 0;
  session.ratioSpring.target = target;
  startSessionLoop();
  if (navigator.vibrate) navigator.vibrate(18);
}

/** 进入 / 退出 90:10 模式（分隔带把手长按触发）：大侧压到 0.90，再长按回对半 */
function toggle9010() {
  if (!session || session.phase !== 'open' || session.drag.active) return;
  if (session.in9010) {
    session.in9010 = false;
    session.ratioSpring.x = session.ratio;
    session.ratioSpring.v = 0;
    session.ratioSpring.target = 0.5;
    startSessionLoop();
    toast('已恢复对半分屏');
  } else {
    session.in9010 = true;
    const target = session.ratio >= 0.5 ? RATIO_9010 : 1 - RATIO_9010;
    session.ratioSpring.x = session.ratio;
    session.ratioSpring.v = 0;
    session.ratioSpring.target = target;
    startSessionLoop();
    toast('已进入 90:10 分屏 · 轻点小窗可互换');
  }
  if (navigator.vibrate) navigator.vibrate(22);
}

// ==================== RK4 物理渲染循环 ====================

/** 单窗格逐帧渲染 —— 与 app-window.js 的 render() 同一套几何模型：
 *  渲染缩放 = A + (1-A)*prog（A 为源/归巢矩形相对窗格矩形的缩放比），
 *  中心点 = 窗格矩形中心 + posSpring 偏移；展开 A=源卡片比(prog 0→1)，
 *  关闭 A=图标比(prog 1→0)，两阶段共用同一公式，物理连续无缝。 */
function renderPane(pane) {
  const s = pane.el.style;
  const prog = clamp(pane.scaleSpring.x, 0, 1);

  const scx = Math.max(pane.scaleAX + (1 - pane.scaleAX) * prog, 0.0001);
  const scy = Math.max(pane.scaleAY + (1 - pane.scaleAY) * prog, 0.0001);

  const rect = pane.rect;
  // 核心几何修正：窗格已有绝对定位 (rect.left, rect.top)，transform-origin 为中心，
  // 位移平移量严谨等于 posSpring 相对自身中心的目标偏移量 (px, py)，
  // 彻底消除由于减去 window.innerWidth/2 导致的百像素错位漂移与落定瞬时闪现
  const tx = pane.posSpring.px;
  const ty = pane.posSpring.py;

  // 3D 透视微偏转（与主窗口同曲线：源于源点/归巢点在屏幕中的相对位置）
  const screenCX = window.innerWidth / 2, screenCY = window.innerHeight / 2;
  const normX = screenCX > 0 ? (pane.originCX - screenCX) / screenCX : 0;
  const normY = screenCY > 0 ? (pane.originCY - screenCY) / screenCY : 0;
  const tiltEnvelope = Math.sin(Math.PI * clamp(prog, 0, 1));
  const MAX_TILT = pane.originW > 120 ? 2.5 : 5.5;
  const rotX = -normY * MAX_TILT * tiltEnvelope;
  const rotY = normX * MAX_TILT * tiltEnvelope;

  // 圆角平滑连续转换（多任务卡片 28px / 桌面图标 16px -> 分屏窗格 24px）
  const baseR = pane.originW > 120 ? 28 : 16;
  const targetR = 24;
  const visualR = baseR + (targetR - baseR) * smoothstep(prog, 0, 1);
  const rx = visualR / Math.max(scx, 0.001);
  const ry = visualR / Math.max(scy, 0.001);

  s.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${scx.toFixed(5)}, ${scy.toFixed(5)}) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
  const rQx = Math.round(rx * 2) / 2;
  const rQy = Math.round(ry * 2) / 2;
  if (rQx !== pane._lastRQx || rQy !== pane._lastRQy) {
    s.borderRadius = `${rQx.toFixed(1)}px / ${rQy.toFixed(1)}px`;
    pane._lastRQx = rQx;
    pane._lastRQy = rQy;
  }
  // 关闭末端渐隐（展开即显，与主窗口关闭曲线一致）—— v7.32 脏检查：同值不重写
  const op = pane.closing ? smoothstep(prog, 0.004, 0.16).toFixed(3) : '1';
  if (op !== pane._lastOp) { s.opacity = op; pane._lastOp = op; }
}

function startSessionLoop() {
  if (!session || session.rafId) return;
  const STEP = 1 / 120;
  const MAX_SUBSTEPS = 30;
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    if (!session) return;
    let rawDt = (now - last) / 1000;
    last = now;
    if (rawDt > 0.25) rawDt = 0.25;
    accumulator += rawDt;

    let steps = 0;
    while (accumulator >= STEP && steps < MAX_SUBSTEPS) {
      for (const p of session.panes) {
        p.posSpring.update(STEP);
        p.scaleSpring.update(STEP);
      }
      if (!session.drag.active) session.ratioSpring.update(STEP);
      accumulator -= STEP;
      steps++;
    }
    if (accumulator >= STEP) accumulator = 0;

    // 比例弹簧驱动布局（拖拽期间由手势 1:1 接管，循环跳过避免相互对抗）
    if (!session.drag.active) {
      const r = clamp(session.ratioSpring.x, MIN_RATIO, MAX_RATIO);
      if (Math.abs(r - session.ratio) > 0.0002) {
        session.ratio = r;
        relayout();
      }
    }

    // 平滑组合质感：在展开阶段随着两窗格靠拢组合，中央分隔线与把手自适应平滑浮现
    if (session.phase === 'opening' && dividerEl) {
      const minProg = Math.min(
        clamp(session.panes[0]?.scaleSpring.x || 0, 0, 1),
        clamp(session.panes[1]?.scaleSpring.x || 0, 0, 1)
      );
      const divProg = clamp((minProg - 0.35) / 0.65, 0, 1);
      dividerEl.style.opacity = divProg.toFixed(3);
      const divScale = (0.75 + 0.25 * divProg).toFixed(3);
      if (session.axis === 'x') {
        dividerEl.style.transform = `scaleY(${divScale})`;
      } else {
        dividerEl.style.transform = `scaleX(${divScale})`;
      }
    }

    let allSettled = true;
    for (const p of session.panes) {
      const settled = p.posSpring.isSettled(SETTLE_POS_EPS, SETTLE_VEL_EPS) &&
                      p.scaleSpring.isSettled(SETTLE_POS_EPS * 10, SETTLE_VEL_EPS);
      if (!settled) allSettled = false;
      // 稳态窗格（phase='open' 且已落定）：几何完全由 left/top/width/height（relayout）表达。
      // 绝不能再走 renderPane —— 它会把开/关动画用的 transform
      //（“窗格中心-屏幕中心”平移 + 源点缩放）重新挂回元素，
      // 使两窗格从分隔带两侧整体漂移开（拖拽调比例后分家的根因：
      // endDrag 重启弹簧循环时 phase 已是 'open'，落定清样式的分支永不触发）。
      if (session.phase === 'open' && p.settled) {
        if (p.el.style.transform || p.el.style.borderRadius || p.el.style.opacity) {
          p.el.style.transform = '';
          p.el.style.borderRadius = '';
          p.el.style.opacity = '';
        }
        continue;
      }
      renderPane(p);
    }

    // 相位交接：全部弹簧收敛才落定/收尾（与主循环 finishAnim 同哲学）
    if (allSettled) {
      if (session.phase === 'opening') {
        session.phase = 'open';
        session.panes.forEach((p) => {
          p.settled = true;
          p.el.classList.add('settled');
          // 落定即清除逐帧内联样式，交还静态渲染（由于数学模型已修正，此处偏差为严格 0px，绝无跳动闪烁）
          p.el.style.transform = '';
          p.el.style.borderRadius = '';
          p.el.style.opacity = '';
        });
        if (overlayEl) overlayEl.classList.add('phase-open');
        if (dividerEl) {
          dividerEl.style.opacity = '';
          dividerEl.style.transform = '';
        }
        stopSessionLoop();
        return;
      }
      if (session.phase === 'closing') {
        finishClose();
        return;
      }
      // v7.32：静止分屏 rAF 零空转 —— 旧实现在 phase='open'（回中/释放比例弹簧
      // 跑完后）循环永不停止，每帧空跑物理积分与 settled 检查（耗电 + 主线程抢占）；
      // 现比例弹簧一并收敛即停循环，并解冻窗格内容（iframe 一次 resize 到最终几何）
      if (session.phase === 'open' && session.ratioSpring.isSettled(2e-4, 2e-3)) {
        unfreezePanesContent();
        stopSessionLoop();
        return;
      }
    }

    session.rafId = requestAnimationFrame(frame);
  }

  session.rafId = requestAnimationFrame(frame);
}

function stopSessionLoop() {
  if (session && session.rafId) {
    cancelAnimationFrame(session.rafId);
    session.rafId = null;
  }
}

// ==================== 进入 / 退出分屏 ====================

/**
 * 进入分屏。
 * @param {Object} payload { appAId, appBId, rectA, rectB, ratio? } — 多任务配对模式产出，
 *        或 split-groups 托盘恢复（rectA = rectB = 组合图标矩形，ratio = 退出时比例）
 * @returns {boolean} 是否成功进入
 */
export function enterSplit(payload) {
  if (!payload) return false;
  if (session) {
    // v7.35：从多任务切换到另一组分屏（pair 卡点击/配对选择）时，旧会话静默组合保存让位
    //（Android 16 语义：后台切换不丢配对）；combineExit 静默路径全同步，让位后无残留
    if (payload.replaceActive) {
      combineExit({ silent: true });
    } else {
      toast('已处于分屏模式');
      return false;
    }
  }
  // v7.53：隐藏会话在场 —— 同配对直接恢复（窗格实况内容零重载，秒开）；
  // 异配对销毁让位（内存守卫：同时至多一个隐藏会话）
  if (parked) {
    const samePair = (parked.aId === payload.appAId && parked.bId === payload.appBId) ||
      (parked.aId === payload.appBId && parked.bId === payload.appAId);
    if (samePair && payload.rectA) {
      return revealParked(payload.rectA);
    }
    destroyParked();
  }
  const appA = findApp(payload.appAId);
  const appB = findApp(payload.appBId);
  if (!appA || !appB || !payload.rectA || !payload.rectB) {
    toast('应用不存在，无法分屏');
    return false;
  }

  // 主窗口若仍有应用在场：按原物理动画退场，与分屏展开并行互不阻塞
  if (state.isOpen || state.isClosing) {
    try { closeApp(0, 0, 0); } catch (e) { /* 退场失败不阻塞分屏 */ }
  }
  // 清掉两应用的常驻实例：避免主窗口 iframe 与分屏窗格 iframe 双实例并存
  try { destroyAppInstance(appA.id); } catch (e) {}
  try { destroyAppInstance(appB.id); } catch (e) {}

  const axis = computeAxis();
  // v7.33：支持恢复保存的比例（托盘组合图标展开时还原用户偏好布局）
  const ratio = clamp(typeof payload.ratio === 'number' ? payload.ratio : 0.5, MIN_RATIO, MAX_RATIO);

  overlayEl = document.createElement('div');
  overlayEl.id = 'splitScreenOverlay';
  const backdrop = document.createElement('div');
  backdrop.className = 'split-backdrop';
  overlayEl.appendChild(backdrop);

  session = {
    axis,
    ratio,
    ratioSpring: new Spring({ ...RATIO_SPRING, initialValue: ratio, initialVelocity: 0 }),
    panes: [],
    phase: 'opening',
    rafId: null,
    drag: { active: false },
    sb: 0,
    usable: 0,
    contentFrozen: false,
  };
  refreshViewportSnapshot(); // v7.32：状态栏/可用高度快照（热路径零布局读取）
  const rects = paneRects(axis, ratio, session.sb, session.usable);

  [[appA, payload.rectA, rects[0]], [appB, payload.rectB, rects[1]]].forEach(([app, srcRect, rect]) => {
    const el = buildPaneShell(app);
    overlayEl.appendChild(el);
    const pane = {
      el,
      app,
      rect,
      settled: false,
      closing: false,
      posSpring: new Spring2D(curOpenParams(), 0, 0, 0, 0),
      scaleSpring: new Spring({ ...curOpenParams(), initialValue: 0, initialVelocity: 0 }),
      // 动画源点（“指哪打哪”）：源卡片中心与尺寸
      originCX: srcRect.left + srcRect.width / 2,
      originCY: srcRect.top + srcRect.height / 2,
      originW: srcRect.width,
      scaleAX: Math.max(srcRect.width / rect.width, 0.0001),
      scaleAY: Math.max(srcRect.height / rect.height, 0.0001),
    };
    // 初始物理状态：中心在源卡片处、缩放为源卡片尺寸（第 0 帧即位）
    pane.posSpring.x.x = pane.originCX - (rect.left + rect.width / 2);
    pane.posSpring.y.x = pane.originCY - (rect.top + rect.height / 2);
    pane.posSpring.x.target = 0;
    pane.posSpring.y.target = 0;
    pane.scaleSpring.target = 1;
    applyPaneRect(pane, rect);
    session.panes.push(pane);
  });

  // 中间隔离带：轨道 + ✕ 把手
  dividerEl = document.createElement('div');
  dividerEl.className = session.axis === 'x' ? 'split-divider axis-x' : 'split-divider axis-y';
  dividerEl.innerHTML = `
    <div class="split-divider-track"></div>
    <div class="split-divider-handle" aria-label="调节分屏比例">
      <div class="split-divider-pill"></div>
    </div>
  `;
  overlayEl.appendChild(dividerEl);
  bindDividerEvents();

  applyDividerLayout();

  // 消除首帧闪现：同步挂载内容并即时执行第 0 帧物理渲染
  // 确保元素在 append 到 DOM 的瞬刻，其尺寸、位置、圆角与源卡片 100% 严丝合缝
  session.panes.forEach((p) => {
    mountPaneContent(p.el, p.app);
    renderPane(p);
  });

  // 立即激活浮层，免除延迟添加 active 带来的 1 帧空白闪烁
  overlayEl.classList.add('active');
  document.body.appendChild(overlayEl);

  // 智能冻结策略：分屏对双方保持运行，其余后台实例冻结（bg-freeze.js）
  try { setLiveApps([appA.id, appB.id]); } catch (e) {}

  startSessionLoop();

  if (navigator.vibrate) navigator.vibrate([12, 24, 12]);
  window.addEventListener('resize', onViewportChange, { passive: true });

  // 记入多任务历史（动态导入避免静态循环依赖）
  import('./recent-apps.js').then((m) => {
    m.recordAppOpened(appA.id);
    m.recordAppOpened(appB.id);
  }).catch(() => {});

  setTimeout(() => { if (session) toast('已进入分屏 · 拖动分隔带调整比例，拖到边缘可全屏展开'); }, 420);
  return true;
}

/** 退出分屏（真解散）：两窗格并行弹簧飞回各自桌面图标（实时重校准），落地后广播 APP_CLOSE 并摘除
 *  v7.33 opts.instant：跳过飞行动画直接收尾（浮层已隐藏时使用，如多任务内销毁卡片组） */
export function exitSplit(opts = {}) {
  if (!session || session.phase === 'closing') return;
  if (opts.instant) {
    finishClose({ instant: true });
    return;
  }
  // 复位上滑跟手的浮层位移/过渡，窗格从真实几何位置飞回图标
  if (overlayEl) { overlayEl.style.transition = ''; overlayEl.style.transform = ''; }
  // 尚未展开完成：直接快速收尾（分隔带尚未可交互，此为兜底路径）
  if (session.phase === 'opening') {
    finishClose();
    return;
  }
  session.phase = 'closing';
  // fix(P3)：进入 closing 时清除拖拽态 —— 防拖拽中触发退出后，松手的 endDrag
  // 再推进弹簧/二次解散（双保险，endDrag 内也有相位守卫）
  session.drag.active = false;
  if (overlayEl) overlayEl.classList.remove('phase-open');
  stopSessionLoop();

  for (const p of session.panes) {
    p.closing = true;
    p.settled = false;
    p.el.classList.remove('settled');

    // 归巢目标实时重校准：优先桌面真实图标，退化到屏幕内安全位置
    const home = findDesktopIconRect(p.app.id);
    const homeCX = home ? home.left + home.width / 2 : window.innerWidth / 2;
    const homeCY = home ? home.top + home.height / 2 : window.innerHeight * 0.82;
    const homeW2 = home ? home.width : 58;
    const homeH2 = home ? home.height : 58;
    p.originCX = homeCX;
    p.originCY = homeCY;
    p.originW = homeW2;

    // 缩放重映射：当前渲染缩放（静止态恒为 1）无损换算到“图标比”语义，物理连续零跳变
    const A2x = homeW2 / p.rect.width;
    const A2y = homeH2 / p.rect.height;
    const curScaleX = p.scaleAX + (1 - p.scaleAX) * clamp(p.scaleSpring.x, 0, 1);
    const curScaleY = p.scaleAY + (1 - p.scaleAY) * clamp(p.scaleSpring.x, 0, 1);
    p.scaleAX = A2x;
    p.scaleAY = A2y;
    p.scaleSpring.x = clamp((curScaleX - A2x) / Math.max(1 - A2x, 1e-4), 0, 1);
    void curScaleY; // 单弹簧驱动双轴：静止态重映射两轴反解值恒等，无需分别处理
    p.scaleSpring.target = 0;

    // 位置：当前绝对中心 = 窗格中心 + 0 偏移（静止态），目标改为图标中心
    p.posSpring.x.x = 0;
    p.posSpring.y.x = 0;
    p.posSpring.x.target = homeCX - (p.rect.left + p.rect.width / 2);
    p.posSpring.y.target = homeCY - (p.rect.top + p.rect.height / 2);

    p.posSpring.reconfigure(curCloseParams());
    p.scaleSpring.reconfigure(curCloseParams());
  }

  if (navigator.vibrate) navigator.vibrate(12);
  startSessionLoop();
}

/** 关闭收尾：广播生命周期 → 宽限后整体摘除（与 page-stack.js 同宽限哲学）
 *  v7.33 opts：{ instant } 立即摘除（组合/隐藏路径已提前广播）；{ quiet } 不弹退出 toast；
 *  { broadcastDone } 跳过重复广播（combineExit 已在动画起点广播） */
function finishClose(opts = {}) {
  stopSessionLoop();
  if (session) unfreezePanesContent(); // v7.32：冻结态退场兜底（清内联尺寸，overlay 即将摘除）
  const panes = session ? session.panes : [];
  const overlay = overlayEl;
  if (!opts.broadcastDone) {
    panes.forEach((p) => {
      broadcastAppClose(p.el);
      // 窗格内联脚本可能登记了 document 级监听/订阅：与实例销毁同语义集中退订
      // （onlyIfNoInstance：分屏期间若同名应用已被全屏重开，则保留其登记）
      releaseAppListeners(p.app.id, { onlyIfNoInstance: true });
    });
  }
  // 分屏退出后无前台应用：全部后台实例按策略冻结（媒体豁免不变）
  try { setLiveApps([]); } catch (e) {}
  window.removeEventListener('resize', onViewportChange);
  if (overlay) {
    overlay.classList.remove('active');
    overlay.classList.remove('combining');
    overlay.style.transform = '';
    overlay.style.transformOrigin = '';
    if (opts.instant) {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    } else {
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, GRACE_REMOVE_MS);
    }
  }
  overlayEl = null;
  dividerEl = null;
  session = null;
  if (!opts.quiet) toast('已退出分屏');
}

/** 旋转 / 视口变化：切换分屏方向并按当前比例重排（静止态几何即时适配） */
function onViewportChange() {
  if (!session) return;
  session.axis = computeAxis();
  refreshViewportSnapshot();  // v7.32：旋转后重快照（状态栏高度/可用高度可能变化）
  unfreezePanesContent();    // 旋转后内容立即恢复自适应（一次性 resize 到新几何）
  relayout();
}

// ==================== v7.33 分屏组合：combineExit / restoreFromGroup / 连续挂起恢复 ====================

function reducedMotion() {
  return typeof matchMedia !== 'undefined' &&
    matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 目标矩形 → 全屏浮层的 origin(0,0) 变换（等比缩放 + 居中贴合，宽高比失配时中心对齐） */
function rectToOverlayTransform(rect) {
  const W = window.innerWidth, H = window.innerHeight;
  const s = Math.max(rect.width / W, 0.02);
  return {
    s,
    tx: rect.left + (rect.width - W * s) / 2,
    ty: rect.top + (rect.height - H * s) / 2,
  };
}

// ---------- 通用浮层飞行（挂起/恢复：translate + scale 三通道弹簧，逐帧单次写入） ----------

let flyRafId = 0;
let activeFlyTag = null; // null | 'suspend' | 'resume' —— combineExit 判「恢复中被打断」用

function cancelFlyOverlay() {
  if (flyRafId) { cancelAnimationFrame(flyRafId); flyRafId = 0; }
  activeFlyTag = null;
}

function runOverlayFly(overlay, s0, s1, tx0, ty0, tx1, ty1, tag, done) {
  cancelFlyOverlay();
  activeFlyTag = tag;
  overlay.style.transition = '';
  overlay.style.transformOrigin = '0 0';
  overlay.style.transform = `translate(${tx0.toFixed(2)}px, ${ty0.toFixed(2)}px) scale(${s0.toFixed(4)})`;

  const sSpring = new Spring({ ...FLY_SPRING, initialValue: s0, initialVelocity: 0 });
  sSpring.target = s1;
  const tSpring = new Spring2D(FLY_SPRING, tx0, ty0, 0, 0);
  tSpring.setTarget(tx1, ty1);

  const STEP = 1 / 120, MAX_SUBSTEPS = 30;
  let acc = 0, last = performance.now();

  function frame(now) {
    let rawDt = (now - last) / 1000;
    last = now;
    if (rawDt > 0.25) rawDt = 0.25;
    acc += rawDt;
    let steps = 0;
    while (acc >= STEP && steps < MAX_SUBSTEPS) {
      sSpring.update(STEP);
      tSpring.update(STEP);
      acc -= STEP;
      steps++;
    }
    if (acc >= STEP) acc = 0;

    overlay.style.transform =
      `translate(${tSpring.x.x.toFixed(2)}px, ${tSpring.y.x.toFixed(2)}px) scale(${sSpring.x.toFixed(4)})`;

    if (sSpring.isSettled(6e-4, 0.008) && tSpring.isSettled(0.02, 0.05)) {
      overlay.style.transform = `translate(${tx1.toFixed(2)}px, ${ty1.toFixed(2)}px) scale(${s1.toFixed(4)})`;
      activeFlyTag = null;
      flyRafId = 0;
      if (done) done();
      return;
    }
    flyRafId = requestAnimationFrame(frame);
  }
  flyRafId = requestAnimationFrame(frame);
}

// ---------- 组合缩退（向中心聚拢 + 幽灵胶囊交叉淡入 + 落地飞往托盘） ----------

let combineRafId = 0;
function cancelCombineFly() {
  if (combineRafId) { cancelAnimationFrame(combineRafId); combineRafId = 0; }
  const g = document.getElementById('splitCombineGhost');
  if (g) g.remove();
}

/** 整块浮层（双窗格 + 隔离带）作为单一变换层向屏幕中心缩放：
 *  nudge 抬起量随比例折叠归零（起点零跳变）；窗格过半后幽灵双图标胶囊交叉淡入；
 *  每帧至多一次 transform 写入 + 幽灵透明度脏检查 —— 全程纯合成器属性 */
function startCombineFly(lift0, aId, bId, onDone) {
  const overlay = overlayEl;
  if (!overlay) { if (onDone) onDone(); return; }

  const ghost = document.createElement('div');
  ghost.id = 'splitCombineGhost';
  ghost.className = 'split-group-chip'; // 复用托盘 chip 视觉（同语言）
  ghost.style.transform = 'translate(-50%, -50%)';
  ghost.innerHTML = buildPairIconHTML(aId, bId);
  document.body.appendChild(ghost);

  if (reducedMotion()) {
    overlay.style.display = 'none';
    ghost.remove();
    if (onDone) onDone();
    return;
  }

  overlay.style.transition = '';
  overlay.style.transformOrigin = '50% 50%';
  const sSpring = new Spring({ ...COMBINE_SPRING, initialValue: 1, initialVelocity: 0 });
  sSpring.target = COMBINE_END_SCALE;

  let lastOp = '0';
  const STEP = 1 / 120, MAX_SUBSTEPS = 30;
  let acc = 0, last = performance.now();

  function frame(now) {
    let rawDt = (now - last) / 1000;
    last = now;
    if (rawDt > 0.25) rawDt = 0.25;
    acc += rawDt;
    let steps = 0;
    while (acc >= STEP && steps < MAX_SUBSTEPS) { sSpring.update(STEP); acc -= STEP; steps++; }
    if (acc >= STEP) acc = 0;

    const s = Math.max(sSpring.x, COMBINE_END_SCALE);
    overlay.style.transform = `translateY(${(-lift0 * s).toFixed(2)}px) scale(${s.toFixed(4)})`;

    // 幽灵在窗格缩到过半后交叉淡入（两窗格视觉上「合进」双图标胶囊）
    const t = 1 - (s - COMBINE_END_SCALE) / (1 - COMBINE_END_SCALE);
    const op = clamp((t - 0.42) / 0.38, 0, 1).toFixed(3);
    if (op !== lastOp) { ghost.style.opacity = op; lastOp = op; }

    if (sSpring.isSettled(6e-4, 0.008)) {
      overlay.style.display = 'none';
      flyGhostToChip(ghost, aId, bId);
      combineRafId = 0;
      if (onDone) onDone();
      return;
    }
    combineRafId = requestAnimationFrame(frame);
  }
  cancelCombineFly();
  combineRafId = requestAnimationFrame(frame);
}

/** 幽灵从屏幕中心飞往托盘组合图标（单 transform 过渡，落地由真实 chip 无缝接替） */
function flyGhostToChip(ghost, aId, bId) {
  const id = [aId, bId].sort().join('|');
  const rect = getChipRect(id);
  if (!rect) { ghost.remove(); return; }
  const dx = (rect.left + rect.width / 2) - window.innerWidth / 2;
  const dy = (rect.top + rect.height / 2) - window.innerHeight / 2;
  const sc = rect.width / GHOST_SIZE;
  ghost.style.transition = 'transform 0.32s cubic-bezier(0.22, 0.9, 0.26, 1)';
  ghost.style.transform =
    `translate(calc(-50% + ${dx.toFixed(1)}px), calc(-50% + ${dy.toFixed(1)}px)) scale(${sc.toFixed(3)})`;
  setTimeout(() => ghost.remove(), 340);
}

/**
 * v7.33 组合式退出：向上轻划 / home / 其它应用顶替分屏时调用。
 * 分屏不解散 —— 以组合形式向中心缩放退出，配对保存为桌面组合图标（多组共存、去重刷新）。
 * @param {Object} opts
 *   silent   浮层已隐藏（挂起中/被顶替/恢复飞行被打断）时静默保存 + 即时收尾
 *   foldLift 手势抬起量（px）折叠进缩退起点，消除瞬时归位跳变
 */
export function combineExit(opts = {}) {
  if (!session || session.phase === 'closing') return;
  const aId = session.panes[0].app.id;
  const bId = session.panes[1].app.id;
  const ratio = session.ratio;
  const axis = session.axis;

  // 保存到后台 App Pair 多组分屏持久化池
  saveSplitGroup(aId, bId, ratio, axis);

  // 记录到后台历史（确保两个应用都登记在后台卡片池中）
  import('./recent-apps.js').then((m) => {
    m.recordAppOpened(aId);
    m.recordAppOpened(bId);
  }).catch(() => {});

  // v7.35：挂起态（多任务覆盖在后）无可视连续性，恢复飞行中被打断时 rAF 通道仍在逐帧
  // 写 transform 与 CSS 过渡相互对抗 —— 两种情形统一走静默即时收尾
  const suspended = !!(overlayEl && overlayEl.classList.contains('session-suspended'));
  if (opts.silent || suspended || session.phase === 'opening' || !overlayEl) {
    cancelFlyOverlay();
    cancelCombineFly();
    curNudgeLift = 0; // v7.35：复位抬起量（旧版在此丢失 → 下次挂起起点 -lift px 跳变）
    if (overlayEl) overlayEl.classList.remove('session-suspended');
    // v7.53：组合退场改为「隐藏会话保活」—— 窗格实况内容原地保留，后台卡片预览
    // 实时取样（bug①修复），再次进入秒恢复（bug②修复）；替代原 finishClose 销毁
    parkSession();
    toast('已保存分屏组合 · 可在多任务后台查看与切换');
    return;
  }

  session.phase = 'closing';
  // fix(P3)：进入 closing 时清除拖拽态（同 exitSplit）
  session.drag.active = false;
  stopSessionLoop();
  curNudgeLift = 0; // 抬起量已由浮层整体缩退接管，复位防残留到下一会话
  cancelFlyOverlay(); // 终止在途的挂起/恢复 rAF 飞行，交由 CSS 过渡独占驱动
  overlayEl.classList.remove('phase-open');
  overlayEl.classList.add('combining');

  // 提前广播生命周期
  session.panes.forEach((p) => {
    broadcastAppClose(p.el);
    releaseAppListeners(p.app.id, { onlyIfNoInstance: true });
  });

  // 优雅向屏幕下方微缩沉降淡出，平滑收缩进入后台任务池
  overlayEl.style.transition = 'transform 0.38s cubic-bezier(0.18, 0.98, 0.28, 1), opacity 0.30s cubic-bezier(0.4, 0, 1, 1)';
  overlayEl.style.transformOrigin = '50% 65%';
  overlayEl.style.transform = 'scale(0.80) translateY(48px)';
  overlayEl.style.opacity = '0';

  setTimeout(() => {
    // v7.53：缩退动画终点 → 隐藏会话保活（替代 finishClose 销毁）：复位内联过渡后
    // display:none 驻留，窗格内容持续运行
    overlayEl.style.transition = '';
    overlayEl.style.transform = '';
    overlayEl.style.transformOrigin = '';
    overlayEl.style.opacity = '';
    parkSession();
    toast('已保存分屏组合 · 可在多任务后台查看与切换');
  }, 380);
}

/** v7.33 从桌面组合图标恢复分屏：两窗格自图标位置「指哪打哪」展开，还原保存比例 */
export function restoreFromGroup(group, fromRect) {
  if (!group || !group.aId || !group.bId) return false;
  if (session) {
    toast('已处于分屏模式');
    return false;
  }
  // v7.53：同配对的隐藏会话在场 → 直接恢复保活会话（实况内容零重载）
  if (parked) {
    const samePair = (parked.aId === group.aId && parked.bId === group.bId) ||
      (parked.aId === group.bId && parked.bId === group.aId);
    if (samePair) return revealParked(fromRect);
    destroyParked();
  }
  const rect = (fromRect && fromRect.width > 0)
    ? fromRect
    : (getChipRect(group.id) || {
        left: window.innerWidth / 2 - 24,
        top: window.innerHeight / 2 - 24,
        width: 48,
        height: 48,
      });
  return enterSplit({
    appAId: group.aId,
    appBId: group.bId,
    rectA: rect,
    rectB: rect,
    ratio: group.ratio,
  });
}

// ==================== v7.53 隐藏会话：保活 / 恢复 / 销毁 ====================

/**
 * 当前活跃会话 → 隐藏会话（park）：窗格 DOM/实况内容原地保留（display:none），
 * 广播与退订一律跳过（与 finishClose 的根本差异），setLiveApps 不清空 ——
 * 后台期间窗格内容持续运行，卡片预览与恢复后画面零脱节。
 */
function parkSession() {
  if (!session || !overlayEl) return;
  const aId = session.panes[0].app.id;
  const bId = session.panes[1].app.id;
  destroyParked(); // 内存守卫：仅保一个隐藏会话，新组合顶替旧组合
  const overlay = overlayEl;
  stopSessionLoop();
  cancelFlyOverlay();
  cancelCombineFly();
  try { unfreezePanesContent(); } catch (e) {} // 清拖拽期冻结内联（恢复后内容自适应）
  session.drag.active = false;
  overlay.classList.remove('session-suspended', 'combining', 'phase-open');
  overlay.classList.add('session-parked'); // display:none（split-screen.css）
  overlay.style.transition = '';
  overlay.style.transform = '';
  overlay.style.transformOrigin = '';
  overlay.style.opacity = '';
  window.removeEventListener('resize', onViewportChange);
  parked = { overlay, session, aId, bId };
  session = null;
  overlayEl = null;
  dividerEl = null;
}

/** 销毁隐藏会话（全量退场语义：广播 + 退订 + 摘除；多任务销毁组合卡/清空后台时调用） */
export function destroyParked() {
  if (!parked) return;
  const p = parked;
  parked = null;
  try {
    p.session.panes.forEach((pane) => {
      broadcastAppClose(pane.el);
      releaseAppListeners(pane.app.id, { onlyIfNoInstance: true });
    });
  } catch (e) {}
  // 隐藏窗格已随销毁退场：重扫冻结策略（媒体豁免不变）
  try { setLiveApps([]); } catch (e) {}
  if (p.overlay && p.overlay.parentNode) p.overlay.parentNode.removeChild(p.overlay);
}

/** 隐藏会话恢复：display:none → 全屏，从来源矩形弹簧飞回（可中断，同挂起恢复通道） */
export function revealParked(fromRect) {
  if (!parked || session) return false;
  const p = parked;
  parked = null;
  session = p.session;
  overlayEl = p.overlay;
  dividerEl = overlayEl.querySelector('.split-divider');
  overlayEl.classList.remove('session-parked');
  session.phase = 'open';
  refreshViewportSnapshot();
  try { relayout(); } catch (e) {} // 隐藏期间视口可能变化：按当前比例重排
  window.addEventListener('resize', onViewportChange, { passive: true });
  try { setLiveApps([p.aId, p.bId]); } catch (e) {}
  const rect = (fromRect && fromRect.width >= 40 && fromRect.height >= 40) ? fromRect : null;
  if (rect && !reducedMotion() && !session.drag.active) {
    overlayEl.classList.add('combining');
    const { s, tx, ty } = rectToOverlayTransform(rect);
    runOverlayFly(overlayEl, s, 1, tx, ty, 0, 0, 'resume', () => {
      overlayEl.classList.remove('combining');
      overlayEl.style.transform = '';
      overlayEl.style.transformOrigin = '';
    });
  } else {
    overlayEl.style.transform = '';
    overlayEl.style.transformOrigin = '';
  }
  startSessionLoop();
  return true;
}

// ==================== 分隔带手势 ====================

/**
 * 拖拽过界吸附全屏并解散分屏：
 * 当上下/左右比例拖过设定阈值时，自动将比例占大头的应用平滑扩满全屏，另一应用顺势淡出退场。
 * @param {number} winIndex - 获胜应用的窗格索引（0 为上/左，1 为下/右）
 */
function expandToFullScreenAndDismiss(winIndex) {
  if (!session) return;
  const winPane = session.panes[winIndex];
  const losePane = session.panes[1 - winIndex];
  if (!winPane || !losePane) {
    exitSplit();
    return;
  }
  const winApp = winPane.app;
  const loseApp = losePane.app;

  if (navigator.vibrate) navigator.vibrate([16, 28]);
  toast(`已将「${winApp.name}」全屏展开`);

  stopSessionLoop();

  // 1. 分隔条快速淡出
  if (dividerEl) {
    dividerEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    dividerEl.style.opacity = '0';
    dividerEl.style.transform = 'scale(0.8)';
  }

  // 2. 较小应用沿拖拽方向顺势淡出退出（transform/opacity 纯合成器通道）
  losePane.el.classList.remove('settled'); // 恢复 will-change + 撤 paint 包含，交回合成器
  losePane.el.style.transition = 'opacity 0.24s cubic-bezier(0.4, 0, 1, 1), transform 0.24s ease';
  losePane.el.style.opacity = '0';
  const shift = session.axis === 'x'
    ? (winIndex === 0 ? 'translateX(35px)' : 'translateX(-35px)')
    : (winIndex === 0 ? 'translateY(35px)' : 'translateY(-35px)');
  losePane.el.style.transform = `scale(0.92) ${shift}`;

  // 3. 获胜应用扩满全屏：v7.35 重写为纯 transform 通道 ——
  //    旧实现 transition:all + left/top/width/height 逐帧重排 flex 子树（settled 后
  //    contain 解除、header/内容逐帧 layout，实测 14 帧 >32ms）；窗格几何保持冻结，
  //    以 origin(0,0) + translate(-left,-top) + scale(W/w, H/h) 一步飞向全屏矩形，
  //    iframe 冻结快照随窗格整体缩放（真机快切同观感），零重排零 reflow。
  //    非等比缩放与 v7.33 组合卡「分身展开」同一视觉语法，终点由 openApp 无缝接管。
  winPane.el.classList.remove('settled');
  {
    const rect = winPane.rect; // 会话几何快照（v7.32 纪律：零布局读取）
    const sX = window.innerWidth / Math.max(rect.width, 1);
    const sY = window.innerHeight / Math.max(rect.height, 1);
    winPane.el.style.transformOrigin = '0 0';
    winPane.el.style.transition = 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.28s ease, opacity 0.28s ease';
    winPane.el.style.transform =
      `translate(${(-rect.left).toFixed(2)}px, ${(-rect.top).toFixed(2)}px) scale(${sX.toFixed(5)}, ${sY.toFixed(5)})`;
    winPane.el.style.borderRadius = '0px';
    winPane.el.style.opacity = '1';
  }

  // 4. 将此分屏组以 0.5 基础比例保存至后台 App Pair 历史（供后续后台多任务直接调取）
  try {
    saveSplitGroup(session.panes[0].app.id, session.panes[1].app.id, 0.5, session.axis);
  } catch (e) {}

  setTimeout(async () => {
    try { destroyAppInstance(loseApp.id); } catch (e) {}
    // v7.35：先 await 模块就绪再摘浮层 —— 未缓存时（冷启动直达分屏）零黑帧；
    // 已缓存时为微任务，finishClose 与 openApp 同任务落地零闪断
    let m = null;
    try { m = await import('./app-window.js'); } catch (e) {}
    finishClose({ instant: true, quiet: true });
    if (m) {
      const idx = initialApps.findIndex(a => a.id === winApp.id);
      if (idx !== -1) {
        m.openApp(idx, null, {
          left: 0,
          top: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        }, { instant: true, skipSplitRestore: true }); // v7.53：拖带展开=显式全屏意图，不走组合恢复
      }
    }
  }, 270);
}

function bindDividerEvents() {
  let startP = 0, lastP = 0, lastT = 0, dragV = 0, moved = false;
  // 拖拽热路径缓存（pointerdown 时快照，拖拽中不变）：避免每事件读布局
  let cachedDim = 0, cachedSB = 0;
  // relayout 按帧合并：高频 pointermove 只写一次布局
  let relayoutRafId = 0;
  const flushRelayout = () => {
    if (relayoutRafId) { cancelAnimationFrame(relayoutRafId); relayoutRafId = 0; }
    relayout();
  };
  const scheduleRelayout = () => {
    if (relayoutRafId) return;
    relayoutRafId = requestAnimationFrame(() => {
      relayoutRafId = 0;
      relayout();
    });
  };

  dividerEl.addEventListener('pointerdown', (e) => {
    if (!session || session.phase !== 'open') return;
    e.preventDefault();
    try { dividerEl.setPointerCapture(e.pointerId); } catch (err) {}
    session.drag.active = true;
    moved = false;
    dragV = 0;
    lastT = performance.now();
    startP = lastP = session.axis === 'x' ? e.clientX : e.clientY;
    cachedDim = session.axis === 'x' ? window.innerWidth : window.innerHeight;
    cachedSB = statusBarH();
    stopSessionLoop(); // 拖拽期间暂停弹簧循环，手势 1:1 接管
    freezePanesContent(); // 拖拽期冻结窗格内 iframe
    // v7.62：把手长按 → 90:10 分屏（按住不动 480ms 触发；一旦移动即取消）
    session._lpFired = false;
    clearTimeout(session._lpTimer);
    session._lpTimer = setTimeout(() => {
      if (!session || session.phase !== 'open' || moved) return;
      session._lpFired = true;
      // 长按成立 → 退出拖拽态（pointerdown 曾置 drag.active + 冻结 iframe），
      // 否则 toggle9010 的拖拽守卫会吞掉本次触发、且子文档仍处冻结
      session.drag.active = false;
      unfreezePanesContent();
      toggle9010();
    }, DIVIDER_LONG_PRESS_MS);
  });

  dividerEl.addEventListener('pointermove', (e) => {
    if (!session || !session.drag.active) return;
    const cur = session.axis === 'x' ? e.clientX : e.clientY;
    if (Math.abs(cur - startP) > 5) {
      moved = true;
      // v7.62：已位移即取消长按计时（长按只在按住不动时成立）
      if (session._lpTimer) { clearTimeout(session._lpTimer); session._lpTimer = 0; }
    }
    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    dragV = 0.8 * dragV + 0.2 * ((cur - lastP) / dt); // px/ms，指数平滑
    lastT = now;
    lastP = cur;
    const rawRatio = (cur - cachedSB) / Math.max(cachedDim - cachedSB, 80);
    const ratio = clamp(rawRatio, MIN_RATIO, MAX_RATIO);
    if (ratio !== session.ratio) {
      session.ratio = ratio;
      scheduleRelayout();

      // 阈值预警视觉动态：越靠近全屏触发点，被压缩的一方渐隐提示即将全屏
      if (session.ratio > DISMISS_UPPER_THRESHOLD) {
        const factor = clamp((session.ratio - DISMISS_UPPER_THRESHOLD) / 0.12, 0, 1);
        session.panes[1].el.style.opacity = (1 - factor * 0.55).toFixed(3);
        session.panes[0].el.style.opacity = '1';
      } else if (session.ratio < DISMISS_LOWER_THRESHOLD) {
        const factor = clamp((DISMISS_LOWER_THRESHOLD - session.ratio) / 0.12, 0, 1);
        session.panes[0].el.style.opacity = (1 - factor * 0.55).toFixed(3);
        session.panes[1].el.style.opacity = '1';
      } else {
        session.panes[0].el.style.opacity = '1';
        session.panes[1].el.style.opacity = '1';
      }
    }
  });

  const endDrag = (e) => {
    if (!session || !session.drag.active) return;
    // fix(P3)：closing 相位守卫 —— 退分屏/合并（exitSplit/combineExit）已进入 closing
    // 动画时松手，旧实现只查 drag.active，会再次 expandToFullScreenAndDismiss 或重启
    // 弹簧循环，与退场动画抢写。直接丢弃本次拖拽收尾。
    if (session.phase === 'closing') { session.drag.active = false; return; }
    session.drag.active = false;
    flushRelayout();
    stopSessionLoop();

    const dim = session.axis === 'x' ? window.innerWidth : window.innerHeight;
    const vRatioPerSec = clamp((dragV / dim) * 1000, -6, 6);

    // 核心判定：当上下的比例超过特定阈值（或带有向该方向的甩动手势）时，
    // 按照哪个比例大，自动把那个应用放到全屏，并且解散分屏！
    const isUpperDismiss = session.ratio >= DISMISS_UPPER_THRESHOLD || (session.ratio > 0.68 && vRatioPerSec > 1.2);
    const isLowerDismiss = session.ratio <= DISMISS_LOWER_THRESHOLD || (session.ratio < 0.32 && vRatioPerSec < -1.2);

    if (isUpperDismiss) {
      // 上方/左侧应用（Pane 0）比例大 -> App A 扩满全屏，App B 退出解散分屏
      expandToFullScreenAndDismiss(0);
      return;
    }

    if (isLowerDismiss) {
      // 下方/右侧应用（Pane 1）比例大 -> App B 扩满全屏，App A 退出解散分屏
      expandToFullScreenAndDismiss(1);
      return;
    }

    // 恢复不透明度
    session.panes[0].el.style.opacity = '1';
    session.panes[1].el.style.opacity = '1';

    if (!moved) {
      // v7.62：长按已触发 90:10 → 松手不回中，保持弹簧目标
      if (session._lpFired) {
        session._lpFired = false;
        if (session._lpTimer) { clearTimeout(session._lpTimer); session._lpTimer = 0; }
        startSessionLoop();
        return;
      }
      // 轻点把手/双击轨道：平滑比例回中 (0.5)，绝不触发退出；同时退出 90:10 语义
      session.in9010 = false;
      session.ratioSpring.x = session.ratio;
      session.ratioSpring.v = 0;
      session.ratioSpring.target = 0.5;
      startSessionLoop();
      return;
    }

    // 正常分屏区间释放：比例弹簧接管阻尼回弹，靠近中线自动吸附
    session.ratioSpring.x = session.ratio;
    session.ratioSpring.v = vRatioPerSec;
    session.ratioSpring.target = Math.abs(session.ratio - 0.5) < 0.05 ? 0.5 : clamp(session.ratio, 0.24, 0.76);
    startSessionLoop();
  };

  dividerEl.addEventListener('pointerup', endDrag);
  dividerEl.addEventListener('pointercancel', endDrag);
}

// ==================== 调试暴露口 / 跨模块桥 ====================
if (typeof window !== 'undefined') {
  window.__splitDebug = () => session ? {
    phase: session.phase,
    axis: session.axis,
    ratio: Number(session.ratio.toFixed(3)),
    in9010: !!session.in9010,          // v7.62：90:10 模式探针
    panes: session.panes.map((p) => ({ app: p.app.id, settled: p.settled, swapHint: !!(p.swapHint && p.swapHint.isConnected) })),
    rafRunning: !!session.rafId,            // v7.32：静止零空转探针（落定后应恒 false）
    contentFrozen: !!session.contentFrozen, // v7.32：iframe 冻结态探针（拖拽期 true / 落定 false）
  } : null;

  // 多任务合并卡片组 / 挂起恢复 所需的同步信息（避免动态导入的异步闪烁）
  window.__splitInfo = () => {
    if (session) return {
      active: true,
      appAId: session.panes[0].app.id,
      appBId: session.panes[1].app.id,
      axis: session.axis,
      ratio: session.ratio,
      phase: session.phase,
    };
    // v7.53：隐藏会话在场时同样上报（多任务后台渲染组合卡实时预览需探测窗格）
    if (parked) return {
      active: false,
      parked: true,
      appAId: parked.aId,
      appBId: parked.bId,
      ratio: parked.session.ratio,
      axis: parked.session.axis,
    };
    return { active: false };
  };

  // 挂起 / 恢复会话（多任务覆盖在分屏之上时调用；会话与窗格状态无损保留）
  // v7.33：display:none 硬切 → 连续缩放飞行 —— 挂起 = 实况分屏缩进合并卡片组矩形
  //（settle 瞬时交接静态预览，零交叉淡入零重影）；恢复 = 从卡片矩形弹簧飞回全屏
  window.__splitSuspend = (targetRect, onDone) => {
    if (!overlayEl) { if (onDone) onDone(); return; }
    // 已处于挂起态（罕见竞态：多任务重开早于恢复）—— 幂等早退，避免 display:none 上盲跑飞行
    if (overlayEl.classList.contains('session-suspended')) { if (onDone) onDone(); return; }
    const rect = (targetRect && targetRect.width >= 40 && targetRect.height >= 40) ? targetRect : null;
    if (!session || !rect || session.phase !== 'open' || session.drag.active || reducedMotion()) {
      // 兜底：无可行矩形/动画受限 → 旧式即时隐去
      cancelFlyOverlay();
      overlayEl.style.transform = '';
      overlayEl.style.transformOrigin = '';
      overlayEl.classList.add('session-suspended');
      if (onDone) onDone();
      return;
    }
    overlayEl.classList.add('combining');
    const lift0 = clamp(curNudgeLift, 0, 130);
    curNudgeLift = 0;
    const { s, tx, ty } = rectToOverlayTransform(rect);
    runOverlayFly(overlayEl, 1, s, 0, -lift0, tx, ty, 'suspend', () => {
      overlayEl.classList.add('session-suspended'); // display:none：实况→卡片静态预览瞬时交接
      overlayEl.classList.remove('combining');
      overlayEl.style.transform = '';
      overlayEl.style.transformOrigin = '';
      if (onDone) onDone();
    });
  };
  window.__splitResume = (fromRect) => {
    if (!overlayEl) return;
    overlayEl.classList.remove('session-suspended');
    const rect = (fromRect && fromRect.width >= 40 && fromRect.height >= 40) ? fromRect : null;
    if (rect && session && session.phase === 'open' && !session.drag.active && !reducedMotion()) {
      overlayEl.classList.add('combining');
      const { s, tx, ty } = rectToOverlayTransform(rect);
      runOverlayFly(overlayEl, s, 1, tx, ty, 0, 0, 'resume', () => {
        overlayEl.classList.remove('combining');
        overlayEl.style.transform = '';
        overlayEl.style.transformOrigin = '';
      });
    } else {
      overlayEl.style.transform = '';
      overlayEl.style.transformOrigin = '';
    }
  };

  // 底部上滑手势桥（gestures.js 分屏通道）：跟手 → 松手组合退出 / 回弹
  // v7.32：nudge 改 rAF 帧合并 —— pointermove 事件率（可达 120Hz+）只更新 pending，
  // transform 每帧至多写一次（永远取最新值）；rebound/dismiss 先 flush 防旧帧闪现
  // v7.33：dismiss 语义升级为「组合退出」—— 抬起量折叠进缩退起点（零跳变），
  // 配对保存为桌面组合图标；dismissSilently 供其它应用顶替分屏时静默保存
  const flushNudge = () => {
    if (nudgeRafId) { cancelAnimationFrame(nudgeRafId); nudgeRafId = 0; }
  };
  window.__splitGestures = {
    active: () => !!session,
    nudge: (dy) => {
      if (!overlayEl) return;
      pendingNudgeDy = dy;
      if (nudgeRafId) return;
      nudgeRafId = requestAnimationFrame(() => {
        nudgeRafId = 0;
        if (!overlayEl) return;
        const lift = clamp(Math.max(0, pendingNudgeDy) * 0.32, 0, 130);
        curNudgeLift = lift; // v7.33：记录当前抬起量，dismiss 组合时折叠进缩退起点
        overlayEl.style.transform = `translateY(${-lift.toFixed(1)}px)`;
      });
    },
    rebound: () => {
      flushNudge();
      curNudgeLift = 0;
      if (!overlayEl) return;
      overlayEl.style.transition = 'transform 0.32s cubic-bezier(0.2, 0.9, 0.3, 1)';
      overlayEl.style.transform = '';
      setTimeout(() => { if (overlayEl) overlayEl.style.transition = ''; }, 340);
    },
    dismiss: () => {
      flushNudge();
      // 抬起量交接给 combineExit 折叠（缩退中随比例归零），不清 transform —— 起点零跳变
      combineExit();
    },
    dismissSilently: () => {
      flushNudge();
      curNudgeLift = 0;
      combineExit({ silent: true });
    },
  };

  // E2E / 手动体验通道：桌面控制台直接进出分屏与组合（agent-browser 验证用）
  window.__splitE2E = {
    enter: (aId, bId, ratio) => {
      const r = {
        left: window.innerWidth / 2 - 24,
        top: window.innerHeight / 2 - 24,
        width: 48,
        height: 48,
      };
      return enterSplit({ appAId: aId, appBId: bId, rectA: r, rectB: r, ratio });
    },
    combine: () => combineExit(),
    exit: () => exitSplit(),
    parked: () => !!parked,
  };

  // ==================== v7.53 跨模块桥 ====================
  // ① 分屏恢复守卫（openApp 前置守卫调用）：应用属于隐藏会话/保存组合 → 恢复组合
  window.__splitRestoreForApp = (appId, fromRect) => {
    if (!appId) return false;
    if (parked && (parked.aId === appId || parked.bId === appId)) {
      return revealParked(fromRect);
    }
    if (session) return false; // 活跃会话已由上层 dismiss 语义处理
    let group = null;
    try {
      const raw = JSON.parse(localStorage.getItem('ios-desktop:split-groups') || '[]');
      if (Array.isArray(raw)) group = raw.find((g) => g && (g.aId === appId || g.bId === appId));
    } catch (e) {}
    if (!group) return false;
    // 双方应用必须仍存在（卸载后的陈旧组合顺手清理，不阻塞全屏打开）
    if (!findApp(group.aId) || !findApp(group.bId)) {
      import('./split-groups.js').then((m) => { try { m.removeSplitGroup(group.id); } catch (e) {} }).catch(() => {});
      return false;
    }
    return restoreFromGroup(group, fromRect);
  };
  // ② 分屏窗格实况源（recent-preview 组合卡预览取样；活跃与隐藏会话都可探）
  window.__splitPaneLiveSource = (appId) => {
    const root = (session && overlayEl) ? overlayEl : (parked ? parked.overlay : null);
    if (!root || !appId) return null;
    try { return root.querySelector(`.split-pane[data-bus-app-id="${appId}"]`); } catch (e) { return null; }
  };
  // ③ 销毁隐藏会话（多任务销毁组合卡 / 清空全部后台）
  window.__splitDestroyParked = () => destroyParked();
  window.__splitHasParked = () => !!parked;
}
