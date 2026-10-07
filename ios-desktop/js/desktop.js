// ==================== desktop.js — 桌面分页渲染与切换 ====================

import { state } from './state.js';
import { dom } from './dom.js';
import { clamp, getGridColumns } from './utils.js';
// v7.53：网格行列用户档位单一真源（effGridCols/Rows 已含响应式回落）
import { effGridCols, effGridRows } from './desktop-prefs.js';
import { createDynamicIconHTML } from './dynamic-icons.js';
import { getAppIconSVG } from './app-icons.js';
import { bindIconEvents } from './drag-reorder.js';
import { openApp } from './app-window.js';
import { initialApps } from './apps-data.js';
import { isFolder, createFolderElement } from './folder.js';

/**
 * 重新渲染所有桌面分页（网格 + 圆点）。
 * 每次数据变更（重排、增删页）后调用。
 */
export function renderDesktopPages() {
  dom.desktopSlider.innerHTML = '';
  dom.pageDots.innerHTML = '';

  state.pagesApps.forEach((pageAppsList, pageIdx) => {
    const grid = document.createElement('div');
    grid.className = 'page-grid';
    grid.dataset.page = pageIdx;
    // v7.53：行列模板由偏好单一真源驱动（'auto' 档内部已按视口断点回落），
    // 内联样式覆盖 CSS 断点 —— 设置页改行列立即全页生效
    grid.style.gridTemplateColumns = `repeat(${effGridCols()}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${effGridRows()}, 1fr)`;

    pageAppsList.forEach((app, itemIdx) => {
      // 文件夹使用专门的渲染逻辑
      if (isFolder(app)) {
        const folderEl = createFolderElement(app, pageIdx, itemIdx);
        if (state.isEditMode) folderEl.classList.add('jiggling');
        grid.appendChild(folderEl);
        return;
      }

      const div = document.createElement('div');
      div.className = 'app-icon' + (state.isEditMode ? ' jiggling' : '');
      div.dataset.page = pageIdx;
      div.dataset.index = itemIdx;
      div.dataset.id = app.id;
      div.dataset.slot = app.slot ?? 0;
      // a11y：图标可聚焦、可用 Enter/Space 激活，屏幕阅读器播报应用名
      div.setAttribute('role', 'button');
      div.setAttribute('tabindex', '0');
      div.setAttribute('aria-label', `${app.name}应用`);

      const cols = getGridColumns();
      const row = Math.floor((app.slot ?? 0) / cols) + 1;
      const col = ((app.slot ?? 0) % cols) + 1;
      div.style.gridArea = `${row} / ${col}`;

      // v7.52：安装包应用优先用包内图标（customIcon —— 内联 SVG 矢量或 dataURL <img>）；
      // 动态图标类型其次；内置应用仍走 APP_ICONS 静态表
      const boxContent = app.customIcon
        ? app.customIcon
        : app.type
          ? createDynamicIconHTML(app.type, false)
          : getAppIconSVG(app.id);

      div.innerHTML = `
        <div class="icon-box">
          ${boxContent}
        </div>
        <span>${app.name}</span>
        <div class="remove-badge" data-id="${app.id}" data-page="${pageIdx}">×</div>
      `;

      bindIconEvents(div, app);
      // 键盘激活（与点按同路径：openAppByData）
      div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!state.isEditMode && !state.isOpen) openAppByData(pageIdx, itemIdx, div);
        }
      });
      grid.appendChild(div);
    });

    dom.desktopSlider.appendChild(grid);

    const dot = document.createElement('div');
    dot.className = 'dot' + (pageIdx === state.currentPage ? ' active' : '');
    dom.pageDots.appendChild(dot);
  });

  // 页面圆点为纯装饰性位置指示（页切换有方向键/滑动可达），对读屏隐藏避免噪音
  dom.pageDots.setAttribute('aria-hidden', 'true');

  switchDesktopPage(state.currentPage, false);
}

/** 切换到指定分页 */
export function switchDesktopPage(pageIdx, animate = true) {
  state.currentPage = clamp(pageIdx, 0, state.pagesApps.length - 1);

  if (!animate) {
    dom.desktopSlider.style.transition = 'none';
    // double-rAF 确保无过渡位移先落帧再恢复 CSS 过渡
    // （比 setTimeout 更贴帧边界，120Hz 屏上不会提前恢复造成回闪）
    requestAnimationFrame(() => requestAnimationFrame(() => {
      dom.desktopSlider.style.transition = '';
    }));
  }
  dom.desktopSlider.style.transform = `translate3d(${-state.currentPage * 100}vw, 0, 0)`;

  Array.from(dom.pageDots.children).forEach((dot, idx) => {
    dot.classList.toggle('active', idx === state.currentPage);
  });
}

// ==================== 桌面跟手滑动（Live Pager）====================
// 升级：分页从「松手后一次性跳转」升级为 Android 原生级「1:1 跟手 + 速度吸附」：
//   · 拖拽期间 transition 关闭，位移 1:1 映射到 slider transform（纯合成器，零重排）
//   · 越界橡皮筋阻尼（0.35），松手按「位移 + 释放速度」综合判定吸附目标页
//   · 吸附飞行中再次按下 → 从当前 CSS 插值矩阵无缝接管，绝不跳变（消灭闪屏感）
const livePager = {
  active: false,
  basePageF: 0,   // 按下那一刻的浮点页坐标
  pageF: 0,       // 当前浮点页坐标
  startX: 0,
  lastX: 0,
  lastT: 0,
  velX: 0,        // 平滑后的水平速度 px/ms
  winW: 0,
  seeded: false,  // 速度采样已建立基准（首帧跳过，见 moveLiveSwipe）
};

/** 读取 slider 当前 computed transform 的 X 分量（飞行中 = CSS 过渡的实时插值） */
function readSliderTx() {
  const t = getComputedStyle(dom.desktopSlider).transform;
  if (!t || t === 'none') return 0;
  // 注意：必须用 matrix(?:3d)? —— 写成 matrix3d? 会解析成「matrix3 + 可选d」，
  // 永远匹配不到 2D 的 matrix(...)，导致从第 2 页起滑 / 飞行中接管时基点归零跳变
  const m = t.match(/matrix(?:3d)?\(([^)]+)\)/);
  if (!m) return 0;
  const parts = m[1].split(',').map(parseFloat);
  // matrix3d(a1..a16): tx 是第 13 个分量；matrix(a..f): tx 是第 5 个分量
  if (parts.length >= 16) return parts[12];
  return parts.length >= 6 ? parts[4] : 0;
}

/**
 * 开始跟手滑动。clientX 传「手势起点」（非当前点），保证位移从 0 起算全程 1:1。
 * 若上一段吸附动画仍在飞行，从插值矩阵换算当前浮点页坐标无缝续接。
 */
export function beginLiveSwipe(startClientX) {
  const winW = window.innerWidth || 1;
  const tx = readSliderTx();
  livePager.active = true;
  livePager.winW = winW;
  livePager.basePageF = -tx / winW;
  livePager.pageF = livePager.basePageF;
  livePager.startX = startClientX;
  livePager.lastX = startClientX;
  livePager.lastT = performance.now();
  livePager.velX = 0;
  livePager.seeded = false;
  dom.desktopSlider.style.transition = 'none';
}

/**
 * 跟手移动：dx 1:1 映射，越界施加 0.35 橡皮筋阻尼。
 * 速度采样首帧只建立基准：越阈帧 begin/move 同步连发（main.js 两调用在同一事件内），
 * dt 被 1ms 下限兜底，会把越阈前累计位移计成虚假高速尖峰（如 -7px/ms），
 * 导致「慢速短拖 + 快速松手」被误判成轻甩翻页（场景测试抓出，第 2 帧起才是真实采样）。
 */
export function moveLiveSwipe(clientX) {
  if (!livePager.active) return;
  const now = performance.now();
  const dt = Math.max(1, now - livePager.lastT);
  if (livePager.seeded) {
    const instV = (clientX - livePager.lastX) / dt;
    livePager.velX = livePager.velX * 0.65 + instV * 0.35;
  }
  livePager.seeded = true;
  livePager.lastX = clientX;
  livePager.lastT = now;

  const maxPage = Math.max(0, state.pagesApps.length - 1);
  let pageF = livePager.basePageF - (clientX - livePager.startX) / livePager.winW;
  if (pageF < 0) pageF *= 0.35;
  else if (pageF > maxPage) pageF = maxPage + (pageF - maxPage) * 0.35;

  livePager.pageF = pageF;
  dom.desktopSlider.style.transform = `translate3d(${(-pageF * livePager.winW).toFixed(1)}px, 0, 0)`;
}

/**
 * 松手吸附：位移过半 或 甩动速度达标 都翻页；
 * 交还 CSS transition 完成吸附动画，transform 最终落回 100vw 基准形式。
 */
export function settleLiveSwipe() {
  if (!livePager.active) return;
  livePager.active = false;

  const winW = livePager.winW;
  const maxPage = Math.max(0, state.pagesApps.length - 1);
  // 速度惯性投影：以当前页坐标为基准外推 ~140ms 惯性位移
  const projected = livePager.pageF - (livePager.velX * 140) / winW;
  const target = Math.round(clamp(projected, 0, maxPage));

  state.currentPage = clamp(target, 0, maxPage);
  dom.desktopSlider.style.transition = '';
  switchDesktopPage(state.currentPage, true);
}

export function isLiveSwipeActive() {
  return livePager.active;
}

/** 自动清理尾部空白页 */
export function cleanupEmptyPages() {
  for (let i = state.pagesApps.length - 1; i > 0; i--) {
    if (state.pagesApps[i].length === 0) {
      state.pagesApps.splice(i, 1);
    } else {
      break;
    }
  }
  if (state.currentPage >= state.pagesApps.length) {
    state.currentPage = state.pagesApps.length - 1;
  }
  renderDesktopPages();
}

/** 通过分页索引 + 页内索引打开应用 */
export function openAppByData(pageIdx, appIdx, iconEl) {
  const appData = state.pagesApps[pageIdx][appIdx];
  if (!appData) return;

  // 用 initialApps 中的原始数据打开（保证 pages 引用一致）
  const initialIdx = initialApps.findIndex((a) => a.id === appData.id);
  if (initialIdx !== -1) {
    openApp(initialIdx, iconEl);
  }
}

/**
 * 响应式网格：旋转/缩放窗口导致列数档位变化（4 列 ↔ 6 列）时重渲染桌面。
 * 档位不变时不动（避免移动端地址栏收起等微 resize 抖动重排）。
 * v7.53：同时监听桌面偏好变更（用户在设置改行列/Dock 开关）→ 立即重渲染。
 */
export function initResponsiveGrid() {
  let lastCols = getGridColumns();
  let timer = null;
  const check = () => {
    timer = null;
    const cols = getGridColumns();
    if (cols !== lastCols) {
      lastCols = cols;
      renderDesktopPages();
    }
  };
  window.addEventListener('resize', () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(check, 220);
  }, { passive: true });
  // v7.53：用户档位变更（含容量重排完成后）由 prefs 模块广播；行列内联模板在
  // renderDesktopPages 内重写，这里只负责重渲染
  window.addEventListener('desktop-prefs-changed', (e) => {
    if (e && e.detail && e.detail.gridChanged) renderDesktopPages();
  });
}
