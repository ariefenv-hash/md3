// @ts-check
// ==================== utils.js — 通用工具函数 ====================
// TS 渐进迁移（批次五）：本文件已开启严格类型检查（@ts-check）

import { state } from './state.js';

/**
 * 将 t 从 [e0, e1] 区间平滑映射到 [0, 1]，使用 Hermite 插值。
 * 端点语义：t = e0 → 0，t = e1 → 1（与 e0/e1 大小顺序无关）；区间外钳制。
 * @param {number} t 输入值
 * @param {number} e0 区间端点（映射到 0）
 * @param {number} e1 区间端点（映射到 1）
 * @returns {number}
 */
export function smoothstep(t, e0, e1) {
  t = Math.max(0, Math.min(1, (t - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * 将 v 钳制到 [min, max]。
 * @param {number} v
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * 桌面网格列数（与 desktop.css 断点严格一致）：
 *   - 宽度 >= 768px（平板/PC）：6 列 × 4 行
 *   - 手机横屏（高度 <= 520px 且横置）：6 列 × 4 行
 *   - 其余（手机竖屏）：4 列 × 6 行
 * 三种布局容量均为 24 格，slot 数据无需迁移。
 * v7.53：设置 › 桌面与 Dock 的显式列数档位（4/5/6）优先于响应式断点；
 * 'auto' 维持上表。全部调用方（desktop / drag-reorder / initResponsiveGrid）
 * 经由此单一真源取值，保证网格语义全局一致。
 * @returns {4 | 5 | 6}
 */
export function getGridColumns() {
  // 延迟取 prefs：desktop-prefs 只依赖 state.js，无环；动态 require 风格的
  // 静态 import 会在 utils 的众多下游模块求值前多一层链，仍安全
  try {
    // eslint-disable-next-line no-undef
    if (typeof globalThis.__effGridCols === 'function') return globalThis.__effGridCols();
  } catch (e) { /* 降级走响应式 */ }
  const w = window.innerWidth || 400;
  const h = window.innerHeight || 800;
  if (w >= 768) return 6;
  if (h <= 520 && w > h) return 6;
  return 4;
}

/**
 * 屏幕矩形。
 * @typedef {Object} ScreenRect
 * @property {number} left
 * @property {number} top
 * @property {number} width
 * @property {number} height
 */

/**
 * 获取图标的 .icon-box 元素在视口中的屏幕矩形（带高精分页对齐与景深缩放隔离）。
 * @param {HTMLElement | null} el 图标根元素（.app-icon / .app-folder；异常调用路径可能传空）
 * @returns {ScreenRect}
 */
export function getIconRect(el) {
  /** @type {ScreenRect} */
  const fallback = {
    left: window.innerWidth / 2 - 29,
    top: window.innerHeight / 2 - 29,
    width: 58,
    height: 58,
  };
  if (!el || typeof el.querySelector !== 'function') return fallback;
  // v7.55：Dock 图标按钮（.dock-app-icon）的内层是 .dock-icon-box —— 旧选择器
  // 不识别它导致测量退化为整个按钮矩形（含内边距），从 Dock 开窗/关窗归巢的
  // 起止点偏离图标字形中心。与 .icon-box / .folder-icon 同列识别。
  const box = el.querySelector('.icon-box') || el.querySelector('.dock-icon-box') || el.querySelector('.folder-icon') || el;

  const desktop = document.getElementById('desktop');
  const desktopSlider = document.getElementById('desktopSlider');

  // 1. 如果该图标属于某个特定分页 (e.g. dataset.page)，确保该分页当前处于对齐状态
  const pageGrid = /** @type {HTMLElement | null} */ (el.closest('.page-grid'));
  if (pageGrid && pageGrid.dataset.page !== undefined && desktopSlider) {
    const targetPage = parseInt(pageGrid.dataset.page, 10);
    if (!isNaN(targetPage) && state.currentPage !== targetPage) {
      state.currentPage = targetPage;
      desktopSlider.style.transition = 'none';
      desktopSlider.style.transform = `translate3d(${-targetPage * 100}vw, 0, 0)`;
      const pageDots = document.getElementById('pageDots');
      if (pageDots) {
        Array.from(pageDots.children).forEach((dot, idx) => {
          dot.classList.toggle('active', idx === targetPage);
        });
      }
    }
  }

  // 2. 仅临时重置 #desktop 的景深缩放 (scale 0.95) 与 el 自身的 :active 缩放，严禁触碰 desktopSlider 的分页偏移
  const prevDesktopTransform = desktop ? desktop.style.transform : '';
  const prevDesktopTransition = desktop ? desktop.style.transition : '';
  if (desktop && (desktop.style.transform || desktop.style.transition)) {
    desktop.style.setProperty('transform', 'none', 'important');
    desktop.style.setProperty('transition', 'none', 'important');
  }

  const prevElTransform = el.style.transform;
  const prevElTransition = el.style.transition;
  el.style.setProperty('transform', 'none', 'important');
  el.style.setProperty('transition', 'none', 'important');

  // 3. 执行高精度屏幕绝对物理坐标测量
  const rect = box.getBoundingClientRect();

  // 4. 立即恢复原有样式
  el.style.transform = prevElTransform;
  el.style.transition = prevElTransition;
  if (desktop) {
    desktop.style.transform = prevDesktopTransform;
    desktop.style.transition = prevDesktopTransition;
  }

  if (rect.width === 0 || rect.height === 0) return fallback;
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width || 58,
    height: rect.height || 58,
  };
}
