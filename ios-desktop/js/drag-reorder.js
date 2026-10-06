// ==================== drag-reorder.js — 桌面与文件夹双向实时拖拽、避让让位与物理磁性落位 ====================
//
// 核心架构:
//   1. 100% 稳定的标准 Click 事件分发 (桌面与文件夹内均可快速打开应用)
//   2. 编辑模式下点击文件夹可正常打开，文件夹内图标继承抖动
//   3. 编辑模式下即触即拖（微动立即启动），彻底消除拖拽失效
//   4. 文件夹内部拖拽图标带有真实几何坐标让位避让效果 (Folder Live Displacement)
//   5. 拖出文件夹面板时，文件夹自动平滑缩放归位桌面，无缝转化为桌面拖拽并触发桌面实时避让
//   6. 悬停 0.5s 智能文件夹判定 (加入/合成) + 边缘自动翻页 + 磁性平滑落位

import { state, savePagesApps } from './state.js';
import { dom } from './dom.js';
import { clamp, getGridColumns } from './utils.js';
import { openApp } from './app-window.js';
import { initialApps } from './apps-data.js';
import { renderDesktopPages, switchDesktopPage, cleanupEmptyPages } from './desktop.js';
import { createFolder, isFolder, shrinkFolderToDesktop, openFolder, dissolveFolderIfSingle } from './folder.js';

const HOVER_FOLDER_THRESHOLD_MS = 500; // 悬停 0.5 秒判定加入/合成文件夹

/**
 * fix(audit-A): 槽位几何统一走响应式网格 —— 旧实现四处硬编码 4 列×6 行的槽位数学，
 * 而 getGridColumns() 在 ≥768px（平板/PC）与手机横屏返回 6 列×4 行（CSS 断点同源），
 * 导致宽屏桌面拖拽落位完全错乱：第 5/6 列不可达（col 钉死 0-3）、落点指示器与
 * 实际落位错位、让位位移距离按错误格宽计算（实测 1024px 屏拖至第 5 列落到第 3 列）。
 * 两种档位总容量均为 24 格，slot 数据无需迁移。
 */
function gridCellMetrics(grid) {
  const cols = getGridColumns();
  const rows = 24 / cols;
  const rect = grid.getBoundingClientRect();
  return { cols, rows, cellW: rect.width / cols, cellH: rect.height / rows };
}

let dropIndicatorEl = null;
let folderHoverTimer = null;
let currentFolderCandidate = null;

/** 进入桌面图标抖动编辑模式 */
export function enterEditMode() {
  state.isEditMode = true;
  document.querySelectorAll('.app-icon, .app-folder').forEach((el) => {
    el.classList.add('jiggling');
  });
  if (navigator.vibrate) navigator.vibrate(40);
}

/** 退出桌面图标编辑模式 */
export function exitEditMode() {
  state.isEditMode = false;
  // 健壮性：编辑拖拽若异常中断（pointercancel / 焦点丢失），iconDragState 可能残留，
  // 残留会连带锁死桌面滑动手势 —— 退出编辑模式时一并清空
  state.iconDragState = null;
  document.querySelectorAll('.app-icon, .app-folder').forEach((el) => {
    el.classList.remove('jiggling');
  });
  renderDesktopPages();
}

// ==================== 桌面图标事件绑定 ====================

export function bindIconEvents(el, app) {
  let startX = 0;
  let startY = 0;
  let hasMovedFar = false;
  let isDraggingThis = false;

  // 1. 移除按钮点击（仅编辑模式）
  const badge = el.querySelector('.remove-badge');
  if (badge) {
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const pageIdx = parseInt(badge.dataset.page, 10);
      removeAppFromDesktop(pageIdx, app.id);
    });
    badge.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
  }

  // 2. 标准点击事件
  let lastTapHandledTime = 0;

  const triggerOpen = () => {
    const now = performance.now();
    if (now - lastTapHandledTime < 300) return;
    lastTapHandledTime = now;
    const initialIdx = initialApps.findIndex((a) => a.id === app.id);
    if (initialIdx !== -1) {
      openApp(initialIdx, el);
    }
  };

  el.addEventListener('click', (e) => {
    if (state.iconDragState || hasMovedFar) return;
    if (isFolder(app)) {
      // 文件夹在任何模式下均由自身的 click 处理打开
      return;
    }
    if (state.isEditMode) return;
    e.stopPropagation();
    triggerOpen();
  });

  // 3. PointerDown: 按下反馈与长按计时
  let pointerDownTime = 0;
  const onPointerDown = (e) => {
    if ((state.isOpen && !state.isClosing) || state.iconDragState) return;
    if (e.target.closest('.remove-badge')) return;

    startX = e.clientX;
    startY = e.clientY;
    pointerDownTime = performance.now();
    hasMovedFar = false;
    isDraggingThis = false;

    if (!state.isEditMode) {
      el.style.transform = 'scale(0.92)';
      el.style.transition = 'transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)';
    }

    if (state.isEditMode) {
      state.longPressTimer = setTimeout(() => {
        if (!state.iconDragState) {
          isDraggingThis = true;
          startDraggingIcon(el, app, startX, startY);
        }
      }, 60);
    } else {
      state.longPressTimer = setTimeout(() => {
        if (!hasMovedFar && !state.iconDragState) {
          enterEditMode();
          isDraggingThis = true;
          startDraggingIcon(el, app, startX, startY);
        }
      }, 380);
    }
  };

  const onPointerMove = (e) => {
    const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
    if (state.isEditMode) {
      // 编辑模式下，轻微滑动即立即启动拖拽，无缝响应
      if (dist > 4 && !isDraggingThis && !state.iconDragState) {
        if (state.longPressTimer) {
          clearTimeout(state.longPressTimer);
          state.longPressTimer = null;
        }
        isDraggingThis = true;
        startDraggingIcon(el, app, e.clientX, e.clientY);
      }
    } else {
      // 正常模式下，移动超过 8px 则视为普通轻扫，取消长按
      if (dist > 8) {
        hasMovedFar = true;
        if (!isDraggingThis && state.longPressTimer) {
          clearTimeout(state.longPressTimer);
          state.longPressTimer = null;
        }
        if (el.style.transform) el.style.transform = '';
      }
    }
  };

  const onPointerUp = (e) => {
    const pressDuration = performance.now() - pointerDownTime;
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    if (!state.isEditMode && el.style.transform) {
      el.style.transform = '';
    }

    // 零延迟响应：在返回动画过渡期或正常轻触且未移动时，直接触发打开
    if (!state.isEditMode && !hasMovedFar && !isDraggingThis && !state.iconDragState && !isFolder(app) && pressDuration < 350) {
      if (state.isClosing || (state.isOpen && state.scaleSpring.x < 0.96)) {
        triggerOpen();
      }
    }
  };

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);

  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!state.isEditMode) {
      import('./context-menu.js').then(m => m.showContextMenu(app, el, e.clientX, e.clientY));
    }
  });
}

// ==================== 文件夹内部图标事件绑定 ====================

export function bindFolderIconEvents(el, app, folder) {
  let startX = 0;
  let startY = 0;
  let hasMovedFar = false;
  let isDraggingThis = false;

  // 1. 点击启动应用
  let lastTapHandledTime = 0;
  const triggerOpen = () => {
    const now = performance.now();
    if (now - lastTapHandledTime < 300) return;
    lastTapHandledTime = now;
    const initialIdx = initialApps.findIndex((a) => a.id === app.id);
    if (initialIdx !== -1) {
      openApp(initialIdx, el);
    }
  };

  el.addEventListener('click', (e) => {
    if (state.iconDragState || hasMovedFar) return;
    if (state.isEditMode) return;
    e.stopPropagation();
    triggerOpen();
  });

  // 2. 文件夹内长按/编辑模式拖拽
  let pointerDownTime = 0;
  const onPointerDown = (e) => {
    if ((state.isOpen && !state.isClosing) || state.iconDragState) return;
    startX = e.clientX;
    startY = e.clientY;
    pointerDownTime = performance.now();
    hasMovedFar = false;
    isDraggingThis = false;

    if (!state.isEditMode) {
      el.style.transform = 'scale(0.92)';
      el.style.transition = 'transform 0.16s cubic-bezier(0.2, 0.8, 0.2, 1)';
    }

    if (state.isEditMode) {
      state.longPressTimer = setTimeout(() => {
        if (!state.iconDragState) {
          isDraggingThis = true;
          startDraggingFolderIcon(el, app, folder, startX, startY);
        }
      }, 60);
    } else {
      state.longPressTimer = setTimeout(() => {
        if (!hasMovedFar && !state.iconDragState) {
          enterEditMode();
          isDraggingThis = true;
          startDraggingFolderIcon(el, app, folder, startX, startY);
        }
      }, 380);
    }
  };

  const onPointerMove = (e) => {
    const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
    if (state.isEditMode) {
      // 编辑模式下，轻微滑动即立即启动拖拽
      if (dist > 4 && !isDraggingThis && !state.iconDragState) {
        if (state.longPressTimer) {
          clearTimeout(state.longPressTimer);
          state.longPressTimer = null;
        }
        isDraggingThis = true;
        startDraggingFolderIcon(el, app, folder, e.clientX, e.clientY);
      }
    } else {
      if (dist > 8) {
        hasMovedFar = true;
        if (!isDraggingThis && state.longPressTimer) {
          clearTimeout(state.longPressTimer);
          state.longPressTimer = null;
        }
        if (el.style.transform) el.style.transform = '';
      }
    }
  };

  const onPointerUp = () => {
    const pressDuration = performance.now() - pointerDownTime;
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    if (!state.isEditMode && el.style.transform) {
      el.style.transform = '';
    }

    if (!state.isEditMode && !hasMovedFar && !isDraggingThis && !state.iconDragState && pressDuration < 350) {
      if (state.isClosing || (state.isOpen && state.scaleSpring.x < 0.96)) {
        triggerOpen();
      }
    }
  };

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);
}

// ==================== 拖拽启动器 (桌面 & 文件夹) ====================

function startDraggingIcon(el, app, startX, startY) {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const pageIdx = parseInt(el.dataset.page, 10) || 0;
  const slot = parseInt(el.dataset.slot, 10) || 0;

  const clone = el.cloneNode(true);
  clone.classList.add('dragging-active');
  const badgeInClone = clone.querySelector('.remove-badge');
  if (badgeInClone) badgeInClone.remove();

  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.left = `0px`;
  clone.style.top = `0px`;
  clone.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0) scale(1.15)`;
  document.body.appendChild(clone);

  el.classList.add('placeholder');

  state.iconDragState = {
    mode: 'desktop', // 'desktop' | 'folder'
    source: 'desktop',
    originalPage: pageIdx,
    originalSlot: slot,
    targetPage: pageIdx,
    targetSlot: slot,
    app,
    element: clone,
    placeholderEl: el,
    offsetX: startX - rect.left,
    offsetY: startY - rect.top,
    lastX: startX,
    lastY: startY,
    prevMoveX: startX,
    prevMoveY: startY,
    smoothVx: 0,
    smoothVy: 0,
    isAddToFolder: false,
    targetFolder: null,
    isCreateFolder: false,
    targetApp: null,
  };

  window.addEventListener('pointermove', onDragPointerMove, { passive: false });
  window.addEventListener('pointerup', onDragPointerUp);
  window.addEventListener('pointercancel', onDragPointerUp);
}

function startDraggingFolderIcon(el, app, folder, startX, startY) {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const folderIdx = parseInt(el.dataset.folderIdx, 10) || 0;

  const clone = el.cloneNode(true);
  clone.classList.add('dragging-active');
  clone.style.width = `${rect.width}px`;
  clone.style.height = `${rect.height}px`;
  clone.style.left = `0px`;
  clone.style.top = `0px`;
  clone.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0) scale(1.15)`;
  document.body.appendChild(clone);

  el.classList.add('placeholder');

  state.iconDragState = {
    mode: 'folder', // 开始处于文件夹内部模式
    source: 'folder',
    folder,
    folderIdx,
    targetFolderIdx: folderIdx,
    originalPage: state.currentPage,
    targetPage: state.currentPage,
    targetSlot: folder.slot ?? 0,
    app,
    element: clone,
    placeholderEl: el,
    offsetX: startX - rect.left,
    offsetY: startY - rect.top,
    lastX: startX,
    lastY: startY,
    prevMoveX: startX,
    prevMoveY: startY,
    smoothVx: 0,
    smoothVy: 0,
    isAddToFolder: false,
    targetFolder: null,
    isCreateFolder: false,
    targetApp: null,
  };

  window.addEventListener('pointermove', onDragPointerMove, { passive: false });
  window.addEventListener('pointerup', onDragPointerUp);
  window.addEventListener('pointercancel', onDragPointerUp);
}

// ==================== 拖拽移动与实时让位流 ====================

// 槽位/避让/边缘翻页检测按帧合并：pointermove 事件率可达 120Hz+，
// 而这部分每次都读布局（grid/panel gBCR、文件夹子项逐个 gBCR）；
// 拖拽随行 transform 仍逐事件写入（纯合成器属性，保证 1:1 跟手）。
let slotCheckRafId = 0;

function scheduleSlotCheck() {
  if (slotCheckRafId) return;
  slotCheckRafId = requestAnimationFrame(() => {
    slotCheckRafId = 0;
    const ds = state.iconDragState;
    if (ds && ds.pendingCheckX != null && ds.pendingCheckY != null) {
      updateDragTargets(ds.pendingCheckX, ds.pendingCheckY, ds);
    }
  });
}

/** 落标前同步执行待处理的槽位检测（防末帧滞后导致落在旧槽位） */
function flushSlotCheck() {
  if (slotCheckRafId) {
    cancelAnimationFrame(slotCheckRafId);
    slotCheckRafId = 0;
  }
  const ds = state.iconDragState;
  if (ds && ds.pendingCheckX != null && ds.pendingCheckY != null) {
    updateDragTargets(ds.pendingCheckX, ds.pendingCheckY, ds);
  }
}

function onDragPointerMove(e) {
  if (!state.iconDragState) return;
  if (e.cancelable) e.preventDefault();

  const x = e.clientX;
  const y = e.clientY;
  const ds = state.iconDragState;

  // 1. 物理速度与 3D 倾斜
  const vx = x - ds.prevMoveX;
  const vy = y - ds.prevMoveY;
  ds.prevMoveX = x;
  ds.prevMoveY = y;
  ds.smoothVx = ds.smoothVx * 0.6 + vx * 0.4;
  ds.smoothVy = ds.smoothVy * 0.6 + vy * 0.4;

  const tiltZ = clamp(ds.smoothVx * 0.4, -14, 14);
  const tiltX = clamp(-ds.smoothVy * 0.35, -12, 12);
  const tiltY = clamp(ds.smoothVx * 0.35, -12, 12);

  ds.lastX = x;
  ds.lastY = y;

  const curX = x - ds.offsetX;
  const curY = y - ds.offsetY;

  // 2. 实时精准跟随（纯合成器属性，逐事件写入）
  ds.element.style.transform = `translate3d(${curX.toFixed(1)}px, ${curY.toFixed(1)}px, 0) scale(1.15) rotateZ(${tiltZ.toFixed(1)}deg) rotateX(${tiltX.toFixed(1)}deg) rotateY(${tiltY.toFixed(1)}deg)`;

  // 3. 槽位/避让/翻页检测：按帧合并执行（读布局部分），取最新坐标
  ds.pendingCheckX = x;
  ds.pendingCheckY = y;
  scheduleSlotCheck();
}

/** 槽位重算 + 实时避让 + 边缘翻页（由 rAF 合帧或落标 flush 调用） */
function updateDragTargets(x, y, ds) {
  // 1. 文件夹内部拖拽逻辑
  if (ds.mode === 'folder') {
    const panel = dom.folderOverlay.querySelector('.folder-panel');
    if (panel) {
      const panelRect = panel.getBoundingClientRect();
      const PADDING = 12;

      // 判断手指是否已移出文件夹面板范围
      const isOutsidePanel =
        x < panelRect.left - PADDING ||
        x > panelRect.right + PADDING ||
        y < panelRect.top - PADDING ||
        y > panelRect.bottom + PADDING;

      if (isOutsidePanel) {
        // 移出文件夹！文件夹平滑收起缩回桌面，无缝切换为桌面级拖拽
        if (navigator.vibrate) navigator.vibrate(30);
        ds.mode = 'desktop';
        clearFolderIconShifts();
        shrinkFolderToDesktop();

        // 切换到桌面网格并计算初始桌面槽位
        const currentGrid = dom.desktopSlider.children[state.currentPage];
        if (currentGrid) {
          const gridRect = currentGrid.getBoundingClientRect();
          const gm = gridCellMetrics(currentGrid); // fix(audit-A): 响应式列数
          const col = clamp(Math.floor((x - gridRect.left) / gm.cellW), 0, gm.cols - 1);
          const row = clamp(Math.floor((y - gridRect.top) / gm.cellH), 0, gm.rows - 1);
          ds.targetSlot = clamp(row * gm.cols + col, 0, 23);
          showDropIndicator(currentGrid, ds.targetSlot);
          handleLiveDisplacement(currentGrid, ds);
        }
        return;
      }

      // 仍在文件夹内部：计算内部网格槽位并实时避让
      handleFolderLiveDisplacement(x, y, ds);
      return;
    }
  }

  // 2. 桌面模式拖拽逻辑
  const currentGrid = dom.desktopSlider.children[state.currentPage];
  if (currentGrid) {
    const gridRect = currentGrid.getBoundingClientRect();
    const gm = gridCellMetrics(currentGrid); // fix(audit-A): 响应式列数

    const col = clamp(Math.floor((x - gridRect.left) / gm.cellW), 0, gm.cols - 1);
    const row = clamp(Math.floor((y - gridRect.top) / gm.cellH), 0, gm.rows - 1);
    const targetSlot = clamp(row * gm.cols + col, 0, 23);

    const prevTargetSlot = ds.targetSlot;
    const prevTargetPage = ds.targetPage;

    ds.targetPage = state.currentPage;
    ds.targetSlot = targetSlot;

    if (prevTargetSlot !== targetSlot || prevTargetPage !== state.currentPage) {
      showDropIndicator(currentGrid, targetSlot);
      handleLiveDisplacement(currentGrid, ds);
    }
  }

  // 3. 桌面边缘翻页
  checkEdgeAutoPaging(x, y);
}

// ==================== 文件夹内部实时避让 ====================

function handleFolderLiveDisplacement(x, y, ds) {
  const grid = dom.folderGrid;
  if (!grid || !ds.folder || !ds.folder.apps) return;

  const children = Array.from(grid.querySelectorAll('.app-icon'));
  if (children.length === 0) return;

  // 通过寻找与手指中心点最近的子项，计算最精准的目标槽位
  let closestIdx = 0;
  let minDist = Infinity;

  children.forEach((child, idx) => {
    const rect = child.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < minDist) {
      minDist = dist;
      closestIdx = idx;
    }
  });

  const newTargetIdx = clamp(closestIdx, 0, ds.folder.apps.length - 1);

  if (ds.targetFolderIdx !== newTargetIdx) {
    ds.targetFolderIdx = newTargetIdx;
    applyFolderIconShifts(grid, ds.folderIdx, newTargetIdx);
  }
}

function applyFolderIconShifts(grid, origIdx, destIdx) {
  const children = Array.from(grid.querySelectorAll('.app-icon'));
  if (children.length === 0) return;

  children.forEach((child) => {
    if (child.classList.contains('placeholder')) return;
    const idx = parseInt(child.dataset.folderIdx, 10);
    let visualIdx = idx;

    if (origIdx < destIdx) {
      if (idx > origIdx && idx <= destIdx) visualIdx = idx - 1;
    } else if (origIdx > destIdx) {
      if (idx >= destIdx && idx < origIdx) visualIdx = idx + 1;
    }

    const currentEl = children[idx];
    const targetEl = children[visualIdx];

    if (currentEl && targetEl && idx !== visualIdx) {
      const dx = targetEl.offsetLeft - currentEl.offsetLeft;
      const dy = targetEl.offsetTop - currentEl.offsetTop;
      // v7.51 issue#7：让位位移写独立 translate 属性而非 transform —— 编辑模式下
      // .jiggling 的 CSS 动画（transform）在层叠中压过内联 transform，旧写法让位完全不可见；
      // 独立 translate 属性与动画 transform 自动合成，晃动与让位同时生效（iOS 真实行为）
      child.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
    } else {
      child.style.translate = '';
    }
  });
}

function clearFolderIconShifts() {
  if (!dom.folderGrid) return;
  dom.folderGrid.querySelectorAll('.app-icon').forEach((child) => {
    child.style.translate = '';
    child.style.transform = '';
  });
}

// ==================== 桌面实时避让 ====================

function handleLiveDisplacement(grid, ds) {
  clearFolderCandidate();
  ds.isAddToFolder = false;
  ds.targetFolder = null;
  ds.isCreateFolder = false;
  ds.targetApp = null;

  const pageApps = state.pagesApps[ds.targetPage] || [];
  const occupier = pageApps.find((a) => a.slot === ds.targetSlot && a.id !== ds.app.id);

  if (occupier && !isFolder(ds.app)) {
    if (isFolder(occupier)) {
      folderHoverTimer = setTimeout(() => {
        if (state.iconDragState && state.iconDragState.targetSlot === ds.targetSlot && state.iconDragState.targetPage === ds.targetPage) {
          ds.isAddToFolder = true;
          ds.targetFolder = occupier;
          setFolderCandidate(grid, occupier.id);
        }
      }, HOVER_FOLDER_THRESHOLD_MS);
    } else {
      folderHoverTimer = setTimeout(() => {
        if (state.iconDragState && state.iconDragState.targetSlot === ds.targetSlot && state.iconDragState.targetPage === ds.targetPage) {
          ds.isCreateFolder = true;
          ds.targetApp = occupier;
          setFolderCandidate(grid, occupier.id);
        }
      }, HOVER_FOLDER_THRESHOLD_MS);
    }
  }

  applyDynamicIconShifts(grid, ds);
}

function applyDynamicIconShifts(grid, ds) {
  // fix(audit-A): 让位位移按响应式格宽/格高计算（旧 /4 /6 硬编码在 6 列桌面位移距离错误）
  const cols = getGridColumns();
  const cellW = grid.clientWidth / cols;
  const cellH = grid.clientHeight / (24 / cols);
  const isSamePage = ds.source === 'desktop' && ds.originalPage === ds.targetPage;

  for (const child of grid.children) {
    if (!child.dataset || !child.dataset.id || child.classList.contains('placeholder') || child === dropIndicatorEl) {
      continue;
    }
    const id = child.dataset.id;
    if (id === ds.app.id) continue;

    const slot = parseInt(child.dataset.slot, 10);
    let targetVisualSlot = slot;

    if (ds.isAddToFolder || ds.isCreateFolder) {
      child.style.translate = '';
      child.style.transform = '';
      continue;
    }

    if (isSamePage) {
      const orig = ds.originalSlot;
      const dest = ds.targetSlot;
      if (orig < dest) {
        if (slot > orig && slot <= dest) {
          targetVisualSlot = slot - 1;
        }
      } else if (orig > dest) {
        if (slot >= dest && slot < orig) {
          targetVisualSlot = slot + 1;
        }
      }
    } else {
      // 跨页或来自文件夹移出：slot >= targetSlot 的应用后移 1 格
      if (slot >= ds.targetSlot) {
        targetVisualSlot = slot + 1;
      }
    }

    const cols = getGridColumns();
    const origCol = slot % cols;
    const origRow = Math.floor(slot / cols);
    const destCol = targetVisualSlot % cols;
    const destRow = Math.floor(targetVisualSlot / cols);

    const dx = (destCol - origCol) * cellW;
    const dy = (destRow - origRow) * cellH;

    if (dx !== 0 || dy !== 0) {
      // v7.51 issue#7：同 applyFolderIconShifts —— translate 属性与 jiggle 动画合成，
      // 让位过渡由 .app-icon 的 transition: translate 驱动（2.html 参考实现同款手感）
      child.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
    } else {
      child.style.translate = '';
    }
  }
}

function clearDynamicIconShifts() {
  const currentGrid = dom.desktopSlider.children[state.currentPage];
  if (!currentGrid) return;
  for (const child of currentGrid.children) {
    if (child.style) {
      child.style.translate = '';
      child.style.transform = '';
    }
  }
}

function setFolderCandidate(grid, appId) {
  clearFolderCandidate();
  for (const child of grid.children) {
    if (child.dataset && child.dataset.id === appId) {
      child.classList.add('folder-candidate');
      currentFolderCandidate = child;
      if (navigator.vibrate) navigator.vibrate(25);
      break;
    }
  }
}

function clearFolderCandidate() {
  if (folderHoverTimer) {
    clearTimeout(folderHoverTimer);
    folderHoverTimer = null;
  }
  if (currentFolderCandidate) {
    currentFolderCandidate.classList.remove('folder-candidate');
    currentFolderCandidate = null;
  }
}

function showDropIndicator(grid, slot) {
  if (!dropIndicatorEl) {
    dropIndicatorEl = document.createElement('div');
    dropIndicatorEl.className = 'drop-indicator';
  }
  if (dropIndicatorEl.parentNode !== grid) {
    if (dropIndicatorEl.parentNode) dropIndicatorEl.parentNode.removeChild(dropIndicatorEl);
    grid.appendChild(dropIndicatorEl);
  }
  const cols = getGridColumns();
  const row = Math.floor(slot / cols) + 1;
  const col = (slot % cols) + 1;
  dropIndicatorEl.style.gridArea = `${row} / ${col}`;
}

function hideDropIndicator() {
  if (dropIndicatorEl && dropIndicatorEl.parentNode) {
    dropIndicatorEl.parentNode.removeChild(dropIndicatorEl);
  }
}

function checkEdgeAutoPaging(clientX, clientY) {
  const edgeWidth = 48;
  const screenW = window.innerWidth;

  if (clientX < edgeWidth && state.currentPage > 0) {
    dom.edgeLeft.classList.add('active');
    if (!state.edgePagingTimer) {
      state.edgePagingTimer = setTimeout(() => {
        clearDynamicIconShifts();
        hideDropIndicator();
        switchDesktopPage(state.currentPage - 1);
        state.edgePagingTimer = null;
        updateTargetOnNewPage(clientX, clientY);
      }, 300);
    }
  } else if (clientX > screenW - edgeWidth) {
    dom.edgeRight.classList.add('active');
    if (!state.edgePagingTimer) {
      state.edgePagingTimer = setTimeout(() => {
        clearDynamicIconShifts();
        hideDropIndicator();
        if (state.currentPage === state.pagesApps.length - 1) {
          state.pagesApps.push([]);
        }
        switchDesktopPage(state.currentPage + 1);
        state.edgePagingTimer = null;
        updateTargetOnNewPage(clientX, clientY);
      }, 300);
    }
  } else {
    dom.edgeLeft.classList.remove('active');
    dom.edgeRight.classList.remove('active');
    if (state.edgePagingTimer) {
      clearTimeout(state.edgePagingTimer);
      state.edgePagingTimer = null;
    }
  }
}

function updateTargetOnNewPage(clientX, clientY) {
  if (!state.iconDragState) return;
  dom.edgeLeft.classList.remove('active');
  dom.edgeRight.classList.remove('active');
  state.iconDragState.targetPage = state.currentPage;

  const grid = dom.desktopSlider.children[state.currentPage];
  if (grid) {
    const gridRect = grid.getBoundingClientRect();
    const gm = gridCellMetrics(grid); // fix(audit-A): 响应式列数
    const col = clamp(Math.floor((clientX - gridRect.left) / gm.cellW), 0, gm.cols - 1);
    const row = clamp(Math.floor((clientY - gridRect.top) / gm.cellH), 0, gm.rows - 1);
    state.iconDragState.targetSlot = clamp(row * gm.cols + col, 0, 23);
    showDropIndicator(grid, state.iconDragState.targetSlot);
    handleLiveDisplacement(grid, state.iconDragState);
  }
}

// ==================== 放置与落位 ====================

function performPlacement() {
  const ds = state.iconDragState;

  // 1. 文件夹内排序释放
  if (ds.mode === 'folder') {
    const { folder, folderIdx, targetFolderIdx } = ds;
    if (folderIdx !== targetFolderIdx) {
      const item = folder.apps.splice(folderIdx, 1)[0];
      folder.apps.splice(targetFolderIdx, 0, item);
      folder.apps.forEach((a, i) => (a.slot = i));
      savePagesApps();
    }
    return;
  }

  // 2. 从文件夹移出到桌面释放
  if (ds.source === 'folder' && ds.mode === 'desktop') {
    const { folder, app, targetPage, targetSlot, isAddToFolder, targetFolder, isCreateFolder, targetApp } = ds;

    // 从原文件夹中剔除
    const fIdx = folder.apps.findIndex((a) => a.id === app.id);
    if (fIdx !== -1) folder.apps.splice(fIdx, 1);
    folder.apps.forEach((a, i) => (a.slot = i));

    // 加入已有文件夹
    if (isAddToFolder && targetFolder) {
      app.slot = targetFolder.apps.length;
      targetFolder.apps.push(app);
    } else if (isCreateFolder && targetApp) {
      // 合成新文件夹
      const targetApps = state.pagesApps[targetPage];
      const targetAppIdx = targetApps.findIndex((a) => a.id === targetApp.id);
      if (targetAppIdx !== -1) {
        const newFolder = createFolder(targetSlot);
        newFolder.apps.push({ ...targetApp, slot: 0 });
        newFolder.apps.push({ ...app, slot: 1 });
        targetApps.splice(targetAppIdx, 1);
        targetApps.push(newFolder);
      }
    } else {
      // 插入桌面网格并排位
      const targetApps = state.pagesApps[targetPage];
      const occupierIdx = targetApps.findIndex((a) => a.slot === targetSlot);
      if (occupierIdx !== -1) {
        for (const item of targetApps) {
          if (item.slot >= targetSlot) item.slot += 1;
        }
      }
      app.slot = targetSlot;
      targetApps.push(app);
    }

    // 若原文件夹仅剩 1 个应用或变空，自动解散并将剩余应用放回桌面原文件夹位置
    dissolveFolderIfSingle(folder);
    savePagesApps();
    return;
  }

  // 3. 桌面图标拖拽释放
  const { originalPage, originalSlot, targetPage, targetSlot, app, isAddToFolder, targetFolder, isCreateFolder, targetApp } = ds;
  const origIdx = state.pagesApps[originalPage].findIndex((a) => a.id === app.id);
  if (origIdx === -1) return;

  if (isAddToFolder && targetFolder) {
    state.pagesApps[originalPage].splice(origIdx, 1);
    app.slot = targetFolder.apps.length;
    targetFolder.apps.push(app);
    savePagesApps();
    return;
  }

  if (isCreateFolder && targetApp) {
    const targetApps = state.pagesApps[targetPage];
    const targetAppIdx = targetApps.findIndex((a) => a.id === targetApp.id);
    if (targetAppIdx !== -1) {
      const folder = createFolder(targetSlot);
      folder.apps.push({ ...targetApp, slot: 0 });
      folder.apps.push({ ...app, slot: 1 });
      targetApps.splice(targetAppIdx, 1);
      const appOrigIdx = state.pagesApps[originalPage].findIndex((a) => a.id === app.id);
      if (appOrigIdx !== -1) state.pagesApps[originalPage].splice(appOrigIdx, 1);
      targetApps.push(folder);
      savePagesApps();
      return;
    }
  }

  if (originalPage === targetPage && originalSlot === targetSlot) return;

  if (originalPage === targetPage) {
    const pageApps = state.pagesApps[targetPage];
    const occupierIdx = pageApps.findIndex((a) => a.slot === targetSlot && a.id !== app.id);
    if (occupierIdx !== -1) {
      if (originalSlot < targetSlot) {
        for (const item of pageApps) {
          if (item.id !== app.id && item.slot > originalSlot && item.slot <= targetSlot) {
            item.slot -= 1;
          }
        }
      } else {
        for (const item of pageApps) {
          if (item.id !== app.id && item.slot >= targetSlot && item.slot < originalSlot) {
            item.slot += 1;
          }
        }
      }
    }
    app.slot = targetSlot;
  } else {
    const targetApps = state.pagesApps[targetPage];
    const occupierIdx = targetApps.findIndex((a) => a.slot === targetSlot);
    if (occupierIdx !== -1) {
      for (const item of targetApps) {
        if (item.slot >= targetSlot) item.slot += 1;
      }
    }
    state.pagesApps[originalPage].splice(origIdx, 1);
    app.slot = targetSlot;
    targetApps.push(app);
  }
  savePagesApps();
}

function onDragPointerUp() {
  if (!state.iconDragState) return;

  flushSlotCheck(); // 先同步完成待处理的槽位检测，防末帧滞后落错槽位

  if (state.edgePagingTimer) {
    clearTimeout(state.edgePagingTimer);
    state.edgePagingTimer = null;
  }

  const ds = state.iconDragState;
  const clone = ds.element;
  const wasAddToFolder = ds.isAddToFolder;
  const wasCreateFolder = ds.isCreateFolder;
  const targetFolderId = ds.targetFolder ? ds.targetFolder.id : null;
  const isFolderMode = ds.mode === 'folder';

  clearFolderCandidate();
  clearDynamicIconShifts();
  clearFolderIconShifts();

  dom.edgeLeft.classList.remove('active');
  dom.edgeRight.classList.remove('active');

  window.removeEventListener('pointermove', onDragPointerMove);
  window.removeEventListener('pointerup', onDragPointerUp);
  window.removeEventListener('pointercancel', onDragPointerUp);

  performPlacement();
  hideDropIndicator();

  // 如果仍处于文件夹内部模式释放
  if (isFolderMode) {
    openFolder(ds.folder);
    const targetItemEl = dom.folderGrid.children[ds.targetFolderIdx];
    if (targetItemEl) {
      const rect = targetItemEl.getBoundingClientRect();
      clone.style.transition = 'transform 0.24s cubic-bezier(0.2, 0.95, 0.25, 1.05)';
      clone.style.transform = `translate3d(${rect.left.toFixed(1)}px, ${rect.top.toFixed(1)}px, 0) scale(1)`;
      setTimeout(() => {
        if (clone.parentNode) clone.parentNode.removeChild(clone);
        state.iconDragState = null;
      }, 240);
      return;
    }
    if (clone.parentNode) clone.parentNode.removeChild(clone);
    state.iconDragState = null;
    return;
  }

  // 桌面模式渲染
  renderDesktopPages();

  // 吸入文件夹动画
  if (wasAddToFolder || wasCreateFolder) {
    const targetEl = targetFolderId
      ? document.querySelector(`[data-id="${targetFolderId}"]`)
      : document.querySelector(`[data-slot="${ds.targetSlot}"]`);

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      clone.style.transition = 'transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease';
      clone.style.transform = `translate3d(${rect.left.toFixed(1)}px, ${rect.top.toFixed(1)}px, 0) scale(0.3)`;
      clone.style.opacity = '0';
    } else {
      clone.style.transition = 'opacity 0.2s ease';
      clone.style.opacity = '0';
    }

    setTimeout(() => {
      if (clone.parentNode) clone.parentNode.removeChild(clone);
      cleanupEmptyPages();
      state.iconDragState = null;
    }, 240);
    return;
  }

  // 桌面平滑落位与微回弹动画
  const newGrid = dom.desktopSlider.children[ds.targetPage];
  let targetEl = null;
  if (newGrid) {
    for (const child of newGrid.children) {
      if (child.dataset && child.dataset.id === ds.app.id) {
        targetEl = child;
        break;
      }
    }
  }

  if (targetEl) {
    const rect = targetEl.getBoundingClientRect();
    targetEl.style.visibility = 'hidden';

    clone.style.transition = 'transform 0.26s cubic-bezier(0.2, 0.95, 0.25, 1.05)';
    clone.style.transform = `translate3d(${rect.left.toFixed(1)}px, ${rect.top.toFixed(1)}px, 0) scale(1) rotate(0deg)`;

    setTimeout(() => {
      if (clone.parentNode) clone.parentNode.removeChild(clone);
      targetEl.style.visibility = '';
      targetEl.classList.add('landing-settle');
      if (navigator.vibrate) navigator.vibrate(15);
      setTimeout(() => targetEl.classList.remove('landing-settle'), 300);

      cleanupEmptyPages();
      state.iconDragState = null;
    }, 260);
  } else {
    if (clone.parentNode) clone.parentNode.removeChild(clone);
    cleanupEmptyPages();
    state.iconDragState = null;
  }
}

// ==================== 编辑模式：移除与恢复 ====================

export function removeAppFromDesktop(pageIdx, appId) {
  const page = state.pagesApps[pageIdx];
  if (!page) return;

  const idx = page.findIndex((a) => a.id === appId);
  if (idx === -1) return;

  const removed = page.splice(idx, 1)[0];

  if (!state.removedApps) state.removedApps = [];
  state.removedApps.push(removed);

  try {
    localStorage.setItem('ios-desktop:removed-apps', JSON.stringify(state.removedApps));
  } catch (e) {}

  savePagesApps();
  renderDesktopPages();
}

export function restoreApp(appId) {
  if (!state.removedApps) return;
  const idx = state.removedApps.findIndex((a) => a.id === appId);
  if (idx === -1) return;

  const app = state.removedApps.splice(idx, 1)[0];

  // 放回最后一页的第一个空槽；整页已满（24 格）则新开一页，
  // 避免与现有图标同槽重叠导致"看起来没恢复"
  let lastPage = state.pagesApps[state.pagesApps.length - 1];
  const used = new Set(lastPage.map((a) => a.slot ?? 0));
  let slot = 0;
  while (slot < 24 && used.has(slot)) slot++;
  if (slot >= 24) {
    lastPage = [];
    state.pagesApps.push(lastPage);
    slot = 0;
  }
  app.slot = slot;
  lastPage.push(app);

  try {
    localStorage.setItem('ios-desktop:removed-apps', JSON.stringify(state.removedApps));
  } catch (e) {}

  savePagesApps();
  renderDesktopPages();
}
