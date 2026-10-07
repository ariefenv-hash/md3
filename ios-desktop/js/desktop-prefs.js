// ==================== desktop-prefs.js — 桌面偏好单一真源（v7.53） ====================
//
// 职责：
//   1. 网格行列 / Dock 行为 的用户偏好存取（localStorage 持久化 + 档位校验）
//   2. 有效网格规格计算（'auto' → 响应式断点；显式档位 → 用户覆盖）
//   3. 容量缩减时的全局重排（reflow：超容量条目按页序顺延，保证 slot 永不越界）
//
// 模块纪律：本文件只 import state.js（pagesApps + savePagesApps），
// 绝不 import desktop.js / utils.js —— utils.getGridColumns 反向依赖本模块，
// 反向 import 会成环。本文件内的 clamp 为内联实现（避免 utils 依赖）。

import { state, savePagesApps } from './state.js';

const PREFS_KEY = 'ios-desktop:desktop-prefs';

/** 网格列数档位（'auto' = 跟随响应式断点 4/6 列） */
export const GRID_COL_CHOICES = [4, 5, 6];
/** 网格行数档位（'auto' = 跟随 CSS 断点 6/4 行） */
export const GRID_ROW_CHOICES = [4, 5, 6, 7];
/** Dock 图标数量硬上限（用户需求明确限定） */
export const DOCK_MAX = 6;
/** 平板 Dock 右侧「最近打开应用」槽位上限 */
export const DOCK_RECENTS_MAX = 3;
/** 平板判定断点 —— 与 getGridColumns 的 6 列档同源（≥768px） */
export const TABLET_MIN_WIDTH = 768;

/** 小窗尺寸边界（mini-window.js 与设置页共用） */
export const MINI_MIN_W = 200;
export const MINI_MIN_H = 150;

/** 内联 clamp（避免 utils 依赖成环） */
function clampNum(v, lo, hi) {
  v = Number(v);
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

/**
 * 桌面偏好形状：
 * @typedef {Object} DesktopPrefs
 * @property {'auto'|4|5|6} cols            图标列数（auto = 响应式）
 * @property {'auto'|4|5|6|7} rows          图标行数（auto = 响应式）
 * @property {boolean} dockEnabled          Dock 启用
 * @property {number} dockCount             Dock 图标数量 1..6
 * @property {boolean} dockRecents          平板尺寸 Dock 右侧最近应用槽（≤3）
 * @property {boolean} dockMacEffect        Dock macOS 神奇放大效果
 */

function defaultPrefs() {
  return {
    cols: 'auto',
    rows: 'auto',
    dockEnabled: true,
    dockCount: 4,
    dockRecents: true,
    dockMacEffect: false,
  };
}

/** @type {DesktopPrefs} */
let prefs = loadPrefs();

function loadPrefs() {
  const d = defaultPrefs();
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return d;
    const p = JSON.parse(raw) || {};
    const out = d;
    if (p.cols === 'auto' || GRID_COL_CHOICES.indexOf(p.cols) !== -1) out.cols = p.cols;
    if (p.rows === 'auto' || GRID_ROW_CHOICES.indexOf(p.rows) !== -1) out.rows = p.rows;
    if (typeof p.dockEnabled === 'boolean') out.dockEnabled = p.dockEnabled;
    if (p.dockCount != null) out.dockCount = clampNum(Math.round(p.dockCount), 1, DOCK_MAX);
    if (typeof p.dockRecents === 'boolean') out.dockRecents = p.dockRecents;
    if (typeof p.dockMacEffect === 'boolean') out.dockMacEffect = p.dockMacEffect;
    return out;
  } catch (e) {
    return d;
  }
}

function persist() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (e) { /* 隐私模式等：偏好降级为会话内有效 */ }
}

/** 只读快照 */
export function getDesktopPrefs() {
  return { ...prefs };
}

/**
 * 当前视口下的响应式列数（与 utils.getGridColumns 原逻辑一致）。
 * 用户显式档位优先于此值。
 */
function responsiveCols() {
  const w = window.innerWidth || 400;
  const h = window.innerHeight || 800;
  if (w >= 768) return 6;
  if (h <= 520 && w > h) return 6;
  return 4;
}

/** 当前视口下的响应式行数（CSS 断点：竖屏 6 行，平板/横屏 4 行） */
function responsiveRows() {
  const w = window.innerWidth || 400;
  if (w >= 768) return 4;
  const h = window.innerHeight || 800;
  if (h <= 520 && w > h) return 4;
  return 6;
}

/** 有效列数：显式档位优先，'auto' 回落响应式 */
export function effGridCols() {
  return prefs.cols === 'auto' ? responsiveCols() : prefs.cols;
}

/** 有效行数：显式档位优先，'auto' 回落响应式 */
export function effGridRows() {
  return prefs.rows === 'auto' ? responsiveRows() : prefs.rows;
}

/** 单页容量 = 有效列 × 有效行 */
export function gridCapacity() {
  return effGridCols() * effGridRows();
}

/** 平板尺寸判定（Dock 最近应用槽的显示条件） */
export function isTabletSize() {
  return (window.innerWidth || 0) >= TABLET_MIN_WIDTH;
}

/**
 * 写入单项偏好并落盘；返回是否生效（非法值静默拒绝）。
 * 涉及网格容量的变更会自动触发全局重排（reflowPagesForCapacity），
 * 并广播 'desktop-prefs-changed'（desktop.js / dock.js 监听重渲染）。
 * @param {keyof DesktopPrefs} key
 * @param {any} value
 * @param {{ silent?: boolean }} [opts]
 */
export function setDesktopPref(key, value, opts = {}) {
  let gridChanged = false;
  switch (key) {
    case 'cols':
      if (value !== 'auto' && GRID_COL_CHOICES.indexOf(value) === -1) return false;
      if (prefs.cols !== value) { prefs.cols = value; gridChanged = true; }
      break;
    case 'rows':
      if (value !== 'auto' && GRID_ROW_CHOICES.indexOf(value) === -1) return false;
      if (prefs.rows !== value) { prefs.rows = value; gridChanged = true; }
      break;
    case 'dockEnabled':
      if (typeof value !== 'boolean') return false;
      if (prefs.dockEnabled !== value) { prefs.dockEnabled = value; gridChanged = true; }
      break;
    case 'dockCount': {
      const n = clampNum(Math.round(value), 1, DOCK_MAX);
      if (prefs.dockCount !== n) { prefs.dockCount = n; gridChanged = true; }
      break;
    }
    case 'dockRecents':
      if (typeof value !== 'boolean') return false;
      prefs.dockRecents = value;
      break;
    case 'dockMacEffect':
      if (typeof value !== 'boolean') return false;
      prefs.dockMacEffect = value;
      break;
    default:
      return false;
  }
  persist();
  if (gridChanged) reflowPagesForCapacity();
  if (!opts.silent) {
    try {
      window.dispatchEvent(new CustomEvent('desktop-prefs-changed', {
        detail: { key, value, gridChanged },
      }));
    } catch (e) { /* 非浏览器环境（测试）静默 */ }
  }
  return true;
}

/**
 * 容量缩减重排：按页序遍历全部条目（保持顺序、文件夹整体不拆），
 * 每页装满 capacity 后余量顺延下一页；溢出新建尾页。
 * 顺序即当前 slot 排序，用户既有的跨页摆放次序完全保留。
 */
export function reflowPagesForCapacity() {
  const cap = gridCapacity();
  if (!cap || cap < 1) return false;
  const flat = [];
  for (const page of state.pagesApps) {
    // 页内按现有 slot 排序，保证重排后相对次序不变
    const sorted = page.slice().sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
    for (const item of sorted) flat.push(item);
  }
  const pages = [];
  for (let i = 0; i < flat.length; i += cap) {
    const chunk = flat.slice(i, i + cap).map((item, j) => ({ ...item, slot: j }));
    pages.push(chunk);
  }
  if (!pages.length) pages.push([]);
  state.pagesApps = pages;
  if (state.currentPage >= pages.length) state.currentPage = pages.length - 1;
  savePagesApps();
  return true;
}

// 调试/测试暴露口
if (typeof window !== 'undefined') {
  window.__desktopPrefsInternal = {
    reload: () => { prefs = loadPrefs(); return getDesktopPrefs(); },
  };
  // utils.getGridColumns 的取值桥：模块加载即注册（main.js 的 import 求值顺序里
  // desktop-prefs 先于任何桌面渲染被拉起即可）。避免 utils → prefs 静态 import
  // 造成的深层求值链，桥接失败时 getGridColumns 自动回落响应式断点。
  globalThis.__effGridCols = effGridCols;
}
