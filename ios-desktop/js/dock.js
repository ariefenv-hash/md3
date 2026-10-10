// ==================== dock.js — 桌面 Dock 栏（v7.56） ====================
//
// 职责：
//   1. 常驻 Dock：固定应用（≤6，设置可调数量）+ 平板尺寸右侧「最近打开应用」槽（≤3）
//   2. macOS 神奇放大 1:1（可选开关）：Apple 余弦曲线 + 悬停图标锚定水平回流
//      （邻居让位、Dock 变宽拥抱内容）+ 名称气泡 + 进出场落定
//   3. 与 desktop-prefs / recent-apps / app-window 的接线（数量变更 / 最近列表 / 开窗）
//
// 设计纪律（Apple Design 17 原则映射）：
//   · 原则 1 即时反馈 —— 图标 ：active 即刻缩放，无 transition 等待
//   · 原则 3 可中断 —— 放大跟随指针逐帧重算，任意时刻反向移动立即反向缩放
//   · 原则 11 帧间平滑 —— 只动 transform，rAF 节流，will-change 提示
//   · 原则 12 毛玻璃 —— backdrop-filter 浮层材质，亮边捕捉光线
//   · 原则 14 减弱动态 —— prefers-reduced-motion 下整条效果链禁用

import { state } from './state.js';
import { initialApps } from './apps-data.js';
import { getAppIconSVG } from './app-icons.js';
import { openApp } from './app-window.js';
import { getRecentAppsList } from './recent-apps.js';
import {
  getDesktopPrefs, isTabletSize, DOCK_MAX, DOCK_RECENTS_MAX,
} from './desktop-prefs.js';

const DOCK_KEY = 'ios-desktop:dock-items';
const LONG_PRESS_MS = 480;

/** 默认 Dock 播种（首次启用时）：电话 / 相机 / 信息 / 浏览器
 *  v7.56 修正：信息应用真实 id 是 'msg'（apps/messages.js），旧值 'messages'
 *  不存在 → 首次播种被渲染层静默剪掉，默认 Dock 只剩 3 个应用。 */
const DEFAULT_DOCK_IDS = ['phone', 'camera', 'msg', 'safari'];

/** @type {string[]} 应用 id 有序数组（≤ DOCK_MAX） */
let dockItems = loadDockItems();
let dockEl = null;
let itemsEl = null;
let recentsEl = null;
let reducedMotion = false;

function loadDockItems() {
  try {
    const raw = localStorage.getItem(DOCK_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const ids = arr.filter((id) => typeof id === 'string' && id).slice(0, DOCK_MAX);
        // 去重保序
        return Array.from(new Set(ids));
      }
    }
  } catch (e) { /* 损坏档 → 播种默认 */ }
  return DEFAULT_DOCK_IDS.slice();
}

function persistDockItems() {
  try {
    localStorage.setItem(DOCK_KEY, JSON.stringify(dockItems));
  } catch (e) { /* 会话内有效 */ }
}

// ==================== 公共 API（设置页 / 长按菜单 / context-menu 接线） ====================

export function getDockItems() {
  return dockItems.slice();
}

/** 添加到 Dock（去重；满 6 拒绝）。返回是否成功 */
export function addToDock(appId) {
  if (!appId || typeof appId !== 'string') return false;
  if (dockItems.indexOf(appId) !== -1) return false;
  if (dockItems.length >= DOCK_MAX) return false;
  dockItems.push(appId);
  persistDockItems();
  renderDock();
  return true;
}

/** 从 Dock 移除。返回是否命中 */
export function removeFromDock(appId) {
  const idx = dockItems.indexOf(appId);
  if (idx === -1) return false;
  dockItems.splice(idx, 1);
  persistDockItems();
  renderDock();
  return true;
}

// ==================== macOS 神奇放大：纯函数（测试守护，v7.56 1:1 逆向） ====================

/** 影响半径系数 —— 1:1 逆向双源一致：BuildUI 110px/40px 图标 = 2.75 */
export const MAGNIFY_RANGE_K = 2.75;
/** 默认最大放大倍率 —— macOS 系统设置默认档观感 / BuildUI SCALE = 2.25 */
export const MAGNIFY_MAX_SCALE = 2.25;

/**
 * 指针距离 → 图标缩放（Apple Dock 原版全余弦曲线）。
 * size = min + (max − min) × (1 + cos θ)/2，θ = π × dist/range（Juankpro 逆向：
 * 线性递进会产生抖动，Apple 实测路径为余弦；距离一律取「静止位」中心，避免反馈自激）。
 * @param {number} dist      图标静止中心到指针的水平距离 px
 * @param {number} iconSize  图标基准尺寸 px（作用域半径 = range 系数 × size）
 * @param {{ range?: number, maxScale?: number }} [opts]
 * @returns {number} 1..maxScale
 */
export function magnifyScale(dist, iconSize, opts = null) {
  const range = ((opts && opts.range) != null ? opts.range : MAGNIFY_RANGE_K) * iconSize;
  const maxScale = ((opts && opts.maxScale) != null ? opts.maxScale : MAGNIFY_MAX_SCALE);
  if (!(maxScale > 1)) return 1;
  if (!(dist >= 0) || dist >= range) return 1;
  const c = Math.cos((dist / range) * Math.PI); // 1 中心 → −1 边缘
  return 1 + (maxScale - 1) * ((1 + c) / 2);
}

/**
 * 水平回流布局：悬停图标锚定原位，邻居按放大宽度向两侧让位（macOS 语义 ——
 * 悬停图标始终钉在指针下方，整条 Dock 变宽）。
 * @param {number[]} scales 每个图标的缩放（magnifyScale 的输出，可含强度插值）
 * @param {number} w        图标基准宽 px
 * @param {number[]} gaps   gaps[i] = 图标 i 与 i+1 的静止间距 px（长度 n−1；
 *                          分隔线两侧间距由真实测量给出，不再假设均匀）
 * @returns {{ dx: number[], delta: number, span: number, hovered: number }}
 *   dx[i]    第 i 个图标水平位移（相对静止位；悬停图标恒 0）
 *   delta    内容左延伸相对「图标 0 静止左缘」的偏移（bar 拥抱偏移用）
 *   span     放大后内容总宽 = n×w + Σgaps + Σextra
 *   hovered  最大缩放图标的下标
 */
export function spreadLayout(scales, w, gaps) {
  const n = scales.length;
  if (!n) return { dx: [], delta: 0, span: 0, hovered: -1 };
  const g = (i) => (gaps && gaps[i] != null ? gaps[i] : 10);
  let hovered = 0;
  for (let i = 1; i < n; i++) if (scales[i] > scales[hovered]) hovered = i;
  const widths = scales.map((s) => w * s);
  const rest = new Array(n);
  rest[0] = w / 2;
  for (let i = 1; i < n; i++) rest[i] = rest[i - 1] + w + g(i - 1);
  const centers = new Array(n);
  centers[hovered] = rest[hovered];
  for (let i = hovered + 1; i < n; i++) {
    centers[i] = centers[i - 1] + widths[i - 1] / 2 + g(i - 1) + widths[i] / 2;
  }
  for (let i = hovered - 1; i >= 0; i--) {
    centers[i] = centers[i + 1] - widths[i + 1] / 2 - g(i) - widths[i] / 2;
  }
  const dx = centers.map((c, i) => c - rest[i]);
  const left = centers[0] - widths[0] / 2;
  const span = centers[n - 1] + widths[n - 1] / 2 - left;
  return { dx, delta: left, span, hovered };
}

// ==================== 渲染 ====================

function appById(id) {
  for (let i = 0; i < initialApps.length; i++) {
    if (initialApps[i] && initialApps[i].id === id) return initialApps[i];
  }
  return null;
}

/** 最近应用候选：排除已固定在 Dock 的应用与当前打开应用，最多 DOCK_RECENTS_MAX */
function recentCandidates() {
  const prefs = getDesktopPrefs();
  const pinned = new Set(dockItems);
  const list = getRecentAppsList() || [];
  const out = [];
  for (const id of list) {
    if (out.length >= DOCK_RECENTS_MAX) break;
    if (pinned.has(id)) continue;
    if (state.currentApp && state.currentApp.id === id) continue;
    if (!appById(id)) continue;
    out.push(id);
  }
  return prefs.dockRecents ? out : [];
}

/** 构建/刷新 Dock DOM（幂等：元素常驻，仅重填内容） */
export function renderDock() {
  if (!dockEl || !dockEl.isConnected) return;
  const prefs = getDesktopPrefs();
  const showRecents = isTabletSize() && prefs.dockRecents;
  const recents = showRecents ? recentCandidates() : [];

  // 固定区：按 dockCount 截取展示（store 仍保留最多 6 个，降档不丢记忆）
  const visible = dockItems.slice(0, Math.max(0, prefs.dockCount | 0));
  // 容量语义修正：dockCount 收紧后隐藏的条目若被用户再扩容应重现 —— store 不裁剪

  let html = visible.map((id) => {
    const app = appById(id);
    if (!app) return ''; // 已卸载应用在渲染层跳过（store 由刷新路径清理）
    return `<button class="dock-app-icon" data-id="${id}" data-name="${app.name}" aria-label="${app.name}" title="${app.name}">`
      + `<span class="dock-icon-box">${getAppIconSVG(id)}</span></button>`;
  }).join('');

  if (showRecents && recents.length) {
    html += '<span class="dock-sep" aria-hidden="true"></span>';
    html += recents.map((id) => {
      const app = appById(id);
      return `<button class="dock-app-icon dock-recent-icon" data-id="${id}" data-name="${app.name}" aria-label="最近：${app.name}" title="${app.name}">`
        + `<span class="dock-icon-box">${getAppIconSVG(id)}</span></button>`;
    }).join('');
  }
  if (!html) {
    // 全空（如用户把 Dock 数量设为 1 又移除了唯一应用）：显示占位提示
    html = '<span class="dock-empty-hint">长按桌面应用图标可添加到 Dock</span>';
  }

  // v7.55：重建前接力「开窗来源图标」引用 —— 从 Dock 打开应用时
  // state.currentIconEl 指向本栏按钮，而本栏用 innerHTML 整体重建（最近应用
  // 列表变化 / 视口跨断点 / 偏好变更都会触发），重建后旧引用即成游离节点，
  // 关闭归巢因此退化为桌面同名图标（用户报告：Dock 打开的窗口关回去落到
  // 桌面而非 Dock）。重建后把引用接力到同 id 的活按钮，保证引用始终连在
  // 文档上（popHomeIcon / 关窗重校准 / 快速承接全部受益）。
  const relayIconEl = (state.currentIconEl && itemsEl.contains(state.currentIconEl))
    ? state.currentIconEl : null;
  const relayId = relayIconEl ? relayIconEl.getAttribute('data-id') : null;
  itemsEl.innerHTML = html;
  if (relayId) {
    const freshBtn = itemsEl.querySelector(`.dock-app-icon[data-id="${relayId}"]`);
    if (freshBtn) state.currentIconEl = freshBtn;
  }

  // 已卸载应用从 store 清理（渲染层跳过后这里静默修剪）
  const alive = visible.filter((id) => appById(id));
  if (alive.length !== dockItems.length) {
    dockItems = dockItems.filter((id) => appById(id));
    persistDockItems();
  }

  // 分区显隐
  dockEl.classList.toggle('no-recents', !(showRecents && recents.length));
  // will-change 提示仅在效果开启时挂（原则 11：不常驻占合成层）
  dockEl.classList.toggle('mac-effect', !!(prefs.dockMacEffect && !reducedMotion));
  // 效果被关闭（或跨入 reduced-motion）→ 立即清理残留内联样式
  if (!dockEl.classList.contains('mac-effect')) magCleanup();
  // 重建后静止位缓存失效；若指针仍悬停，下一帧以新 DOM 重测重渲（v7.56）
  magInvalidate();
}

// ==================== 交互 ====================

function onDockTap(iconBtn) {
  if (state.isEditMode) return; // 编辑态图标抖动期不开窗（与桌面语义一致）
  const id = iconBtn.getAttribute('data-id');
  const idx = initialApps.findIndex((a) => a.id === id);
  if (idx === -1) {
    // 应用已卸载：清理出 Dock 并提示
    removeFromDock(id);
    return;
  }
  openApp(idx, iconBtn);
}

/** 长按 Dock 图标 → 移除（带触感与吐司反馈；比隐藏菜单更直接） */
function onDockLongPress(iconBtn) {
  if (state.isEditMode) return;
  const id = iconBtn.getAttribute('data-id');
  const app = appById(id);
  if (!app) return;
  removeFromDock(id);
  if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
  if (window.showSystemToast) window.showSystemToast('已从 Dock 移除「' + app.name + '」');
}

// ==================== macOS 神奇放大：帧引擎（v7.56 1:1） ====================
//
// 三层结构：
//   纯函数  magnifyScale（Apple 余弦曲线）+ spreadLayout（悬停锚定水平回流）
//   帧引擎  magFrame —— 进出场强度渐变（进场 ≈80ms / 离场 ≈170ms 落定），
//           追踪期零滞后逐帧重算，可中断可反向（原则 3）
//   渲染面  图标 box scale + 按钮 translateX（回流让位）+ bar 宽度/位移
//           （变宽拥抱内容）+ 名称气泡。距离一律取静止位中心缓存，杜绝反馈自激。

let magRafId = 0;        // 帧句柄
let magActive = false;   // 指针在 Dock 交互区内（含放大图标上方的头部余量）
let magIntensity = 0;    // 进出场强度 0..1
let magX = 0;            // 最近指针 x（离场冻结后继续用于落定渲染）
let magLastT = 0;        // 上一帧时间戳（真实时距算强度）
let magRest = null;      // [{ btn, left, w, cx }] 静止位缓存（恒等变换下测量）
let magBarW = 0;         // 静止 bar 宽缓存
let magBarRect = null;   // 当前帧 bar 屏幕矩形（document 级跟踪判界用）
let magDocBound = false; // document 级跟踪监听是否已挂
let tipEl = null;        // 悬停名称气泡

/** 清空全部效果内联样式（图标位移/缩放、bar 宽度/位移/transition、气泡） */
function magClearStyles() {
  if (!dockEl || !itemsEl) return;
  itemsEl.querySelectorAll('.dock-app-icon').forEach((b) => {
    b.style.transform = '';
    const box = b.querySelector('.dock-icon-box');
    if (box) box.style.transform = '';
  });
  dockEl.style.width = '';
  dockEl.style.maxWidth = '';
  dockEl.style.transform = '';
  dockEl.style.transition = '';
  if (tipEl) tipEl.classList.remove('show');
}

/** 静止位失效：重建/改偏好/跨断点后调用；若效果在场下一帧重测重渲 */
function magInvalidate() {
  magRest = null;
  if (magActive || magIntensity > 0) magEnsureLoop();
}

/** 恒等变换下测量静止位（先清样式再量，保证读数即静止布局） */
function magMeasure() {
  if (!dockEl || !itemsEl) return false;
  const btns = itemsEl.querySelectorAll('.dock-app-icon');
  if (!btns.length) return false;
  magClearStyles();
  magRest = [];
  btns.forEach((b) => {
    const r = b.getBoundingClientRect();
    const w = r.width || 54;
    magRest.push({ btn: b, left: r.left, w, cx: r.left + w / 2 });
  });
  magBarW = dockEl.offsetWidth || dockEl.getBoundingClientRect().width || 0;
  return true;
}

function magEnsureLoop() {
  if (!magRafId) magRafId = requestAnimationFrame(magFrame);
}

/** 指针进入 bar：engage + 挂 document 级跟踪（放大图标高出 bar，普通 leave 会误判离场） */
function magEngage(e) {
  if (!dockEl || !dockEl.classList.contains('mac-effect')) return;
  magX = e.clientX;
  magActive = true;
  magRest = null; // 进入即以恒等态重测（上轮落定已清理，此处兜底）
  magLastT = 0;
  if (!magDocBound) {
    magDocBound = true;
    document.addEventListener('pointermove', magDocMove, { passive: true });
  }
  magEnsureLoop();
}

/** document 级跟踪：bar 矩形外扩判界（上方 150px 容纳放大图标与气泡，横向 ±24 容差） */
function magDocMove(e) {
  if (!dockEl || !dockEl.classList.contains('mac-effect')) { magDisengage(); return; }
  const r = magBarRect || dockEl.getBoundingClientRect();
  const within = e.clientX >= r.left - 24 && e.clientX <= r.right + 24
    && e.clientY >= r.top - 150 && e.clientY <= r.bottom + 24;
  magX = e.clientX;
  if (within) {
    magActive = true;
    magEnsureLoop();
  } else {
    magDisengage();
  }
}

/** 指针离开交互区 / 触屏抬手：停止追踪，强度渐落（落定后 magCleanup） */
function magDisengage() {
  magActive = false;
  if (magIntensity > 0) magEnsureLoop();
}

function magFrame(t) {
  magRafId = 0;
  if (!dockEl || !dockEl.classList.contains('mac-effect')) { magCleanup(); return; }
  const dt = magLastT ? Math.max(0, Math.min(64, t - magLastT)) : 16.7; // 钳位：回拨帧不放大强度
  magLastT = t;
  // 进场快、离场缓 —— macOS 的落定手感（真实时距指数趋近，原则 3 可中断）
  const tau = magActive ? 80 : 170;
  const target = magActive ? 1 : 0;
  magIntensity += (target - magIntensity) * (1 - Math.exp(-dt / tau));
  if (Math.abs(target - magIntensity) < 0.002) magIntensity = target;
  if (magIntensity <= 0 && !magActive) { magCleanup(); return; }
  magRender();
  const settled = magActive ? magIntensity >= 1 : magIntensity <= 0;
  if (!settled) magRafId = requestAnimationFrame(magFrame); // 落定前逐帧推进
}

function magRender() {
  if (!magRest && !magMeasure()) return;
  const prefs = getDesktopPrefs();
  const maxS = Math.max(1.2, Math.min(2.8, Number(prefs.dockMagnify) || MAGNIFY_MAX_SCALE));
  const W = magRest[0].w || 54;
  const gaps = [];
  for (let i = 1; i < magRest.length; i++) {
    gaps.push(Math.max(0, magRest[i].left - magRest[i - 1].left - magRest[i - 1].w));
  }
  // 缩放 = 1 + (曲线值 − 1) × 强度（进出场整体插值；追踪期强度 1 零滞后）
  const scales = magRest.map((r) => {
    const raw = magnifyScale(Math.abs(magX - r.cx), W, { maxScale: maxS });
    return 1 + (raw - 1) * magIntensity;
  });
  const layout = spreadLayout(scales, W, gaps);
  for (let i = 0; i < magRest.length; i++) {
    const entry = magRest[i];
    const box = entry.btn.querySelector('.dock-icon-box');
    if (box) box.style.transform = scales[i] > 1.0005 ? `scale(${scales[i].toFixed(4)})` : '';
    entry.btn.style.transform = Math.abs(layout.dx[i]) > 0.05
      ? `translateX(${layout.dx[i].toFixed(2)}px)` : '';
  }
  // bar 拥抱内容：宽度随内容总宽生长（≤96vw 封顶、不低于静止宽），位移使
  // 悬停图标保持在指针下方（其静止位 ≈ 指针位置）
  const padL = 12, padR = 12;
  const vw = document.documentElement.clientWidth || window.innerWidth || 0;
  let barW = layout.span + padL + padR;
  if (vw > 0) barW = Math.min(barW, Math.max(220, Math.round(vw * 0.96)));
  if (magBarW > 0) barW = Math.max(barW, magBarW);
  const barLeft = magRest[0].left + layout.delta - padL;
  const shift = barLeft - vw / 2 + barW / 2;
  dockEl.style.transition = 'none';
  dockEl.style.width = barW.toFixed(2) + 'px';
  dockEl.style.maxWidth = barW.toFixed(2) + 'px';
  dockEl.style.transform = `translateX(-50%) translateX(${shift.toFixed(2)}px)`;
  magBarRect = dockEl.getBoundingClientRect(); // 本帧判界缓存（写后一读，每帧一次）
  magTip(layout, scales);
}

/** 名称气泡（macOS Dock tooltip 1:1）：跟随悬停图标，底边随放大高度抬升 */
function magTip(layout, scales) {
  if (!tipEl) return;
  const h = layout.hovered;
  const sc = h >= 0 ? scales[h] : 1;
  const ok = h >= 0 && sc > 1.12 && magIntensity > 0.5 && magRest && magRest[h];
  if (!ok) { tipEl.classList.remove('show'); return; }
  const entry = magRest[h];
  tipEl.textContent = entry.btn.getAttribute('data-name') || entry.btn.title || '';
  const barLeft = magRest[0].left + layout.delta - 12;
  tipEl.style.left = (entry.cx + layout.dx[h] - barLeft).toFixed(1) + 'px';
  const W = magRest[0].w || 54;
  tipEl.style.bottom = Math.round(10 + W * sc + 8) + 'px'; // 图标顶(10+W×sc) + 8 间隙
  tipEl.classList.add('show');
}

/** 完全清理：清样式 + 摘 document 跟踪 + 复位状态 */
function magCleanup() {
  if (magRafId) { cancelAnimationFrame(magRafId); magRafId = 0; }
  magActive = false;
  magIntensity = 0;
  magLastT = 0;
  magRest = null;
  magBarRect = null;
  if (magDocBound) {
    magDocBound = false;
    document.removeEventListener('pointermove', magDocMove);
  }
  magClearStyles();
}

function trackReducedMotion() {
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reducedMotion = false; }
}

// ==================== 初始化 ====================

export function initDock() {
  trackReducedMotion();
  try {
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => trackReducedMotion();
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  } catch (e) { /* 老引擎忽略 */ }

  dockEl = document.createElement('div');
  dockEl.className = 'dock-bar';
  dockEl.id = 'dockBar';
  dockEl.setAttribute('role', 'toolbar');
  dockEl.setAttribute('aria-label', 'Dock');
  dockEl.innerHTML = '<div class="dock-items"></div>';
  itemsEl = dockEl.querySelector('.dock-items');
  // 悬停名称气泡（macOS Dock tooltip 1:1，v7.56）
  tipEl = document.createElement('div');
  tipEl.className = 'dock-tip';
  tipEl.setAttribute('aria-hidden', 'true');
  dockEl.appendChild(tipEl);
  document.body.appendChild(dockEl);

  // 委托交互
  let lpTimer = 0, lpFired = false;
  itemsEl.addEventListener('click', (e) => {
    if (lpFired) { lpFired = false; return; } // 长按后吞 click
    const btn = e.target && e.target.closest ? e.target.closest('.dock-app-icon') : null;
    if (btn) onDockTap(btn);
  });
  itemsEl.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const btn = e.target && e.target.closest ? e.target.closest('.dock-app-icon') : null;
    if (!btn) return;
    lpFired = false;
    clearTimeout(lpTimer);
    lpTimer = setTimeout(() => {
      lpFired = true;
      onDockLongPress(btn);
    }, LONG_PRESS_MS);
  });
  const cancelLP = () => { clearTimeout(lpTimer); };
  itemsEl.addEventListener('pointermove', () => {
    // 长按位移取消（放大追踪已上移到 bar 级 + document 级，见下方挂载）
    if (lpTimer) cancelLP();
  });
  itemsEl.addEventListener('pointerup', cancelLP);
  itemsEl.addEventListener('pointercancel', cancelLP);
  itemsEl.addEventListener('pointerleave', cancelLP);

  // ===== macOS 放大追踪挂载（v7.56） =====
  // bar 级进入（覆盖内边距死区）→ engage；随后由 document 级 magDocMove 判界
  // （bar 上方 150px 余量容纳放大图标与气泡，横向 ±24 容差，仿 macOS 离场迟滞）；
  // 触屏/笔抬手即落定（无 hover 语义），鼠标 click 不落定（指针仍在悬停）。
  dockEl.addEventListener('pointerenter', magEngage);
  dockEl.addEventListener('pointerup', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') magDisengage();
  });
  dockEl.addEventListener('pointercancel', () => magDisengage());

  // 偏好变更（数量/开关/效果开关）→ 重渲染
  window.addEventListener('desktop-prefs-changed', () => {
    renderDock();
    syncDockSpace();
  });
  // 视口跨平板断点 → 最近应用槽显隐变化
  window.addEventListener('resize', () => {
    renderDock();
  }, { passive: true });

  document.body.classList.add('dock-on');
  renderDock();
  syncDockSpace();
}

/**
 * Dock 占位空间同步：搜索胶囊 / 分页圆点 / 网格底边距通过 CSS 变量让位，
 * 不重启任何布局引擎（纯 CSS 变量级联）。
 */
export function syncDockSpace() {
  const prefs = getDesktopPrefs();
  const on = !!(prefs.dockEnabled && dockEl && dockEl.isConnected);
  document.body.classList.toggle('dock-on', on);
  // 无条目可显示时收回占位（CSS 变量为 0）
  const visibleCount = Math.min(dockItems.length, prefs.dockCount);
  const recents = on && isTabletSize() && prefs.dockRecents ? recentCandidates().length : 0;
  const hasContent = on && (visibleCount > 0 || recents > 0);
  document.documentElement.style.setProperty('--dock-space', hasContent ? '88px' : '0px');
}

// 最近应用列表变化 → 最近槽内容更新（recordAppOpened 后由 recent-apps 广播）
if (typeof window !== 'undefined') {
  window.addEventListener('dock-refresh-requested', () => {
    renderDock();
    syncDockSpace();
  });
}
