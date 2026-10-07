// ==================== dock.js — 桌面 Dock 栏（v7.53） ====================
//
// 职责：
//   1. 常驻 Dock：固定应用（≤6，设置可调数量）+ 平板尺寸右侧「最近打开应用」槽（≤3）
//   2. macOS 神奇放大效果（可选开关）：指针邻近余弦衰减缩放，纯 transform + rAF
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

/** 默认 Dock 播种（首次启用时）：电话 / 相机 / 信息 / 浏览器 */
const DEFAULT_DOCK_IDS = ['phone', 'camera', 'messages', 'safari'];

/** @type {string[]} 应用 id 有序数组（≤ DOCK_MAX） */
let dockItems = loadDockItems();
let dockEl = null;
let itemsEl = null;
let recentsEl = null;
let rafId = 0;
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

// ==================== macOS 神奇放大：纯函数（测试守护） ====================

/**
 * 指针距离 → 图标缩放（macOS Dock 曲线的余弦衰减近似）。
 * @param {number} dist      图标中心到指针的水平距离 px
 * @param {number} iconSize  图标基准尺寸 px（作用域半径 = range 系数 × size）
 * @param {{ range?: number, maxScale?: number, power?: number }} [opts]
 * @returns {number} 1..maxScale
 */
export function magnifyScale(dist, iconSize, opts = null) {
  const range = ((opts && opts.range) != null ? opts.range : 2.4) * iconSize;
  const maxScale = ((opts && opts.maxScale) != null ? opts.maxScale : 1.5);
  const power = ((opts && opts.power) != null ? opts.power : 1.4);
  if (!(dist >= 0) || dist >= range) return 1;
  const t = Math.cos((dist / range) * Math.PI / 2); // 1 中心 → 0 边缘
  return 1 + (maxScale - 1) * Math.pow(t, power);
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
    return `<button class="dock-app-icon" data-id="${id}" aria-label="${app.name}" title="${app.name}">`
      + `<span class="dock-icon-box">${getAppIconSVG(id)}</span></button>`;
  }).join('');

  if (showRecents && recents.length) {
    html += '<span class="dock-sep" aria-hidden="true"></span>';
    html += recents.map((id) => {
      const app = appById(id);
      return `<button class="dock-app-icon dock-recent-icon" data-id="${id}" aria-label="最近：${app.name}" title="${app.name}">`
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

/** macOS 神奇放大：指针邻近逐帧重算（可中断，反向即反向） */
function applyMacEffect(clientX) {
  if (!itemsEl) return;
  const icons = itemsEl.querySelectorAll('.dock-app-icon');
  if (!icons.length) return;
  if (rafId) return; // 帧合帧：同帧多次 move 只算一次
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    if (!dockEl || !dockEl.classList.contains('mac-effect')) return;
    icons.forEach((el) => {
      const box = el.querySelector('.dock-icon-box');
      if (!box) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const scale = magnifyScale(Math.abs(clientX - cx), r.width || 54);
      // transform-origin: bottom center（macOS 站在地面上放大）
      box.style.transform = scale === 1 ? '' : `scale(${scale.toFixed(3)})`;
    });
  });
}

function resetMacEffect() {
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  if (!itemsEl) return;
  itemsEl.querySelectorAll('.dock-icon-box').forEach((box) => { box.style.transform = ''; });
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
  itemsEl.addEventListener('pointermove', (e) => {
    // 指针邻近放大（触屏拖动同样生效）+ 长按位移取消
    if (lpTimer) cancelLP();
    if (dockEl.classList.contains('mac-effect')) applyMacEffect(e.clientX);
  });
  itemsEl.addEventListener('pointerup', cancelLP);
  itemsEl.addEventListener('pointercancel', cancelLP);
  itemsEl.addEventListener('pointerleave', () => { cancelLP(); resetMacEffect(); });

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
