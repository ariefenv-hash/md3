// ==================== folder.js — 桌面文件夹功能 (MD3 + 原位展开/收缩 + 内部编辑与拖拽) ====================
//
// 核心亮点:
//   1. 编辑模式下点击文件夹正常打开，文件夹内图标继承抖动编辑态
//   2. 文件夹打开时，从原文件夹图标位置平滑飞入屏幕中央
//   3. 拖拽应用移出文件夹时，文件夹无缝平滑缩放归位回桌面，遮罩透明化呈现底层桌面
//   4. 文件夹关闭时，从中央平滑几何缩回原文件夹图标位置

import { state, savePagesApps } from './state.js';
import { dom } from './dom.js';
import { createDynamicIconHTML } from './dynamic-icons.js';
import { getAppIconSVG } from './app-icons.js';
import { bindIconEvents, bindFolderIconEvents } from './drag-reorder.js';
import { renderDesktopPages } from './desktop.js';
import { demoteCurrentAppToClosingActor } from './app-window.js';

let folderCounter = 0;
export let currentOpenedFolder = null;
export let currentOpenedFolderEl = null;
export let originFolderRect = null;

/** 创建一个新文件夹对象 */
export function createFolder(slot) {
  folderCounter++;
  return {
    id: `folder_${Date.now()}_${folderCounter}`,
    name: '文件夹',
    type: 'folder',
    apps: [],
    slot,
  };
}

/** 判断 app 对象是否是文件夹 */
export function isFolder(app) {
  return app && app.type === 'folder';
}

/**
 * 渲染文件夹图标到桌面网格中
 * @returns {HTMLElement} 文件夹 DOM 元素
 */
export function createFolderElement(folder, pageIdx, itemIdx) {
  const div = document.createElement('div');
  div.className = 'app-folder' + (state.isEditMode ? ' jiggling' : '');
  div.dataset.page = pageIdx;
  div.dataset.index = itemIdx;
  div.dataset.id = folder.id;
  div.dataset.slot = folder.slot ?? 0;

  const row = Math.floor((folder.slot ?? 0) / 4) + 1;
  const col = ((folder.slot ?? 0) % 4) + 1;
  div.style.gridArea = `${row} / ${col}`;

  // 生成 3×3 缩略图（最多显示前 9 个应用的图标）
  const thumbs = folder.apps.slice(0, 9);
  let thumbsHTML = '';
  for (let i = 0; i < 9; i++) {
    if (i < thumbs.length) {
      const app = thumbs[i];
      if (app.type === 'clock') {
        thumbsHTML += `<div class="folder-thumb">${createDynamicIconHTML('clock', false)}</div>`;
      } else if (app.type === 'calendar') {
        thumbsHTML += `<div class="folder-thumb">${createDynamicIconHTML('calendar', false)}</div>`;
      } else {
        thumbsHTML += `<div class="folder-thumb">${getAppIconSVG(app.id)}</div>`;
      }
    } else {
      thumbsHTML += `<div class="folder-thumb empty"></div>`;
    }
  }

  div.innerHTML = `
    <div class="folder-icon">${thumbsHTML}</div>
    <span>${folder.name}</span>
  `;

  // 点击展开文件夹（无论是否处于编辑模式均可正常打开）
  div.addEventListener('click', (e) => {
    if (state.iconDragState || state.isDragging) return;
    e.stopPropagation();
    openFolder(folder, div);
  });

  // 编辑模式下绑定文件夹自身的拖拽移动
  bindIconEvents(div, folder);

  return div;
}

/** 渲染文件夹网格内容（供 openFolder 与 reopenFolderForReturn 共用） */
function renderFolderGrid(folder) {
  dom.folderGrid.innerHTML = '';

  folder.apps.forEach((app, idx) => {
    const div = document.createElement('div');
    div.className = 'app-icon' + (state.isEditMode ? ' jiggling' : '');
    div.dataset.folderIdx = idx;
    div.dataset.appId = app.id;
    div.dataset.id = app.id;

    let boxContent = '';
    if (app.type === 'clock' || app.type === 'calendar') {
      boxContent = createDynamicIconHTML(app.type, false);
    } else {
      boxContent = getAppIconSVG(app.id);
    }

    div.innerHTML = `
      <div class="icon-box">${boxContent}</div>
      <span>${app.name}</span>
    `;

    // 绑定文件夹内部图标点击、长按抖动与拖拽（支持拖出到桌面）
    bindFolderIconEvents(div, app, folder);

    dom.folderGrid.appendChild(div);
  });
}

/** 打开文件夹浮层 (从原位平滑几何形变飞入中央) */
export function openFolder(folder, sourceEl = null) {
  if (state.currentApp && (state.isOpen || state.isClosing)) {
    demoteCurrentAppToClosingActor();
  }

  currentOpenedFolder = folder;
  const folderEl = sourceEl || document.querySelector(`[data-id="${folder.id}"]`);
  currentOpenedFolderEl = folderEl;

  const rect = folderEl ? folderEl.getBoundingClientRect() : null;
  originFolderRect = rect;

  dom.folderTitle.textContent = folder.name;
  dom.folderTitle.dataset.folderId = folder.id;
  dom.folderTitle.style.cursor = 'pointer';
  dom.folderTitle.onclick = () => renameFolder(folder);

  renderFolderGrid(folder);

  // 重置 overlay 状态
  dom.folderOverlay.style.background = '';
  dom.folderOverlay.style.backdropFilter = '';
  dom.folderOverlay.style.webkitBackdropFilter = '';
  dom.folderOverlay.style.pointerEvents = 'auto';
  dom.folderOverlay.style.opacity = '';
  dom.folderOverlay.style.transition = '';

  const panel = dom.folderOverlay.querySelector('.folder-panel');
  if (panel && rect && rect.width > 0) {
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    const folderCX = rect.left + rect.width / 2;
    const folderCY = rect.top + rect.height / 2;
    const initTx = folderCX - screenCX;
    const initTy = folderCY - screenCY;
    const initScale = 0.2;

    panel.style.transition = 'none';
    panel.style.transform = `translate3d(${initTx.toFixed(1)}px, ${initTy.toFixed(1)}px, 0) scale(${initScale.toFixed(3)})`;
    panel.style.opacity = '0';
    panel.style.borderRadius = '36px';

    dom.folderOverlay.classList.add('active');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel.style.transition = 'transform 0.32s cubic-bezier(0.2, 0.95, 0.25, 1.05), opacity 0.22s ease, border-radius 0.3s ease';
        panel.style.transform = 'translate3d(0, 0, 0) scale(1)';
        panel.style.opacity = '1';
        panel.style.borderRadius = '28px';
      });
    });
  } else {
    dom.folderOverlay.classList.add('active');
  }
}

/** 重命名文件夹 */
function renameFolder(folder) {
  const newName = prompt('文件夹名称', folder.name);
  if (newName && newName.trim()) {
    folder.name = newName.trim();
    savePagesApps();
    dom.folderTitle.textContent = folder.name;
    renderDesktopPages();
  }
}

/** 当图标被拖出文件夹边界时，将文件夹面板平滑缩放归位回桌面 */
export function shrinkFolderToDesktop(onComplete = null) {
  if (!dom.folderOverlay.classList.contains('active')) return;

  const panel = dom.folderOverlay.querySelector('.folder-panel');
  const folderEl = currentOpenedFolderEl || (currentOpenedFolder ? document.querySelector(`[data-id="${currentOpenedFolder.id}"]`) : null);
  const rect = folderEl ? folderEl.getBoundingClientRect() : originFolderRect;

  // 立即将 overlay 遮罩设为透明且不阻拦底层桌面触控，使底层桌面完全可见
  dom.folderOverlay.style.background = 'transparent';
  dom.folderOverlay.style.backdropFilter = 'none';
  dom.folderOverlay.style.webkitBackdropFilter = 'none';
  dom.folderOverlay.style.pointerEvents = 'none';

  if (panel && rect && rect.width > 0) {
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    const folderCX = rect.left + rect.width / 2;
    const folderCY = rect.top + rect.height / 2;
    const targetTx = folderCX - screenCX;
    const targetTy = folderCY - screenCY;
    const targetScale = 0.2;

    panel.style.transition = 'transform 0.24s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease, border-radius 0.22s ease';
    panel.style.transform = `translate3d(${targetTx.toFixed(1)}px, ${targetTy.toFixed(1)}px, 0) scale(${targetScale.toFixed(3)})`;
    panel.style.opacity = '0';
    panel.style.borderRadius = '36px';

    setTimeout(() => {
      dom.folderOverlay.classList.remove('active');
      dom.folderOverlay.style.background = '';
      dom.folderOverlay.style.backdropFilter = '';
      dom.folderOverlay.style.webkitBackdropFilter = '';
      dom.folderOverlay.style.pointerEvents = 'auto';
      panel.style.transition = '';
      panel.style.transform = '';
      panel.style.opacity = '';
      if (onComplete) onComplete();
    }, 240);
  } else {
    dom.folderOverlay.classList.remove('active');
    if (onComplete) onComplete();
  }
}

/** 关闭文件夹浮层 */
export function closeFolder(immediate = false) {
  if (!dom.folderOverlay.classList.contains('active')) return;

  const panel = dom.folderOverlay.querySelector('.folder-panel');
  const folderEl = currentOpenedFolderEl || (currentOpenedFolder ? document.querySelector(`[data-id="${currentOpenedFolder.id}"]`) : null);
  const rect = folderEl ? folderEl.getBoundingClientRect() : originFolderRect;

  if (immediate) {
    dom.folderOverlay.classList.remove('active');
    dom.folderOverlay.style.background = '';
    dom.folderOverlay.style.backdropFilter = '';
    dom.folderOverlay.style.webkitBackdropFilter = '';
    dom.folderOverlay.style.pointerEvents = 'auto';
    if (panel) {
      panel.style.transition = '';
      panel.style.transform = '';
      panel.style.opacity = '';
    }
    currentOpenedFolder = null;
    currentOpenedFolderEl = null;
    originFolderRect = null;
    return;
  }

  if (panel && rect && rect.width > 0) {
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    const folderCX = rect.left + rect.width / 2;
    const folderCY = rect.top + rect.height / 2;
    const targetTx = folderCX - screenCX;
    const targetTy = folderCY - screenCY;
    const targetScale = 0.2;

    panel.style.transition = 'transform 0.26s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease, border-radius 0.24s ease';
    panel.style.transform = `translate3d(${targetTx.toFixed(1)}px, ${targetTy.toFixed(1)}px, 0) scale(${targetScale.toFixed(3)})`;
    panel.style.opacity = '0';
    panel.style.borderRadius = '36px';

    dom.folderOverlay.style.transition = 'opacity 0.24s ease';
    dom.folderOverlay.style.opacity = '0';

    setTimeout(() => {
      dom.folderOverlay.classList.remove('active');
      dom.folderOverlay.style.opacity = '';
      dom.folderOverlay.style.transition = '';
      dom.folderOverlay.style.background = '';
      dom.folderOverlay.style.backdropFilter = '';
      dom.folderOverlay.style.webkitBackdropFilter = '';
      dom.folderOverlay.style.pointerEvents = 'auto';
      panel.style.transition = '';
      panel.style.transform = '';
      panel.style.opacity = '';
      currentOpenedFolder = null;
      currentOpenedFolderEl = null;
      originFolderRect = null;
    }, 260);
  } else {
    dom.folderOverlay.classList.remove('active');
    currentOpenedFolder = null;
    currentOpenedFolderEl = null;
    originFolderRect = null;
  }
}

/**
 * 无动画恢复文件夹浮层（应用"归还文件夹"专用）
 * closeApp 检测到当前应用归属于某桌面文件夹时调用：立即以完全展开态重建浮层，
 * 供应用窗口缩回面板内该应用图标原位；浮层交由关闭动画逐帧接管（遮罩随进度淡入）
 * @param {Object} folder - 应用所属文件夹对象
 * @param {string|null} focusAppId - 需滚动到可视区的应用（长列表文件夹内图标可能被滚出面板）
 */
export function reopenFolderForReturn(folder, focusAppId = null) {
  currentOpenedFolder = folder;
  const folderEl = document.querySelector(`.app-folder[data-id="${folder.id}"]`);
  currentOpenedFolderEl = folderEl;
  originFolderRect = folderEl ? folderEl.getBoundingClientRect() : null;

  dom.folderTitle.textContent = folder.name;
  dom.folderTitle.dataset.folderId = folder.id;
  dom.folderTitle.style.cursor = 'pointer';
  dom.folderTitle.onclick = () => renameFolder(folder);

  renderFolderGrid(folder);

  dom.folderOverlay.classList.add('active');
  dom.folderOverlay.style.background = '';
  dom.folderOverlay.style.backdropFilter = '';
  dom.folderOverlay.style.webkitBackdropFilter = '';
  // 逐帧样式即将由关闭动画接管：禁用 CSS 过渡，避免落后于弹簧驱动
  dom.folderOverlay.style.transition = 'none';
  dom.folderOverlay.style.pointerEvents = 'none';

  const panel = dom.folderOverlay.querySelector('.folder-panel');
  if (panel) {
    panel.style.transition = 'none';
    panel.style.transform = 'scale(1)';
    panel.style.opacity = '1';
  }

  if (focusAppId) {
    const icon = dom.folderGrid.querySelector(`.app-icon[data-id="${focusAppId}"]`);
    if (icon && icon.scrollIntoView) icon.scrollIntoView({ block: 'nearest' });
  }
}

/**
 * 检查并自动解散单应用/空文件夹
 * 当文件夹内仅剩 1 个应用时：自动解散该文件夹，将剩余应用直接放回桌面原文件夹位置，删除文件夹容器状态与DOM
 * @param {Object} folder - 待检测的文件夹对象
 * @returns {boolean} 是否触发了解散
 */
export function dissolveFolderIfSingle(folder) {
  if (!folder || !folder.apps) return false;

  if (folder.apps.length === 1) {
    const remainingApp = folder.apps[0];
    const pageIdx = state.pagesApps.findIndex((p) => p.some((a) => a.id === folder.id));
    if (pageIdx !== -1) {
      const folderSlot = folder.slot ?? 0;
      remainingApp.slot = folderSlot;

      // 用剩余单应用替换原文件夹位置
      state.pagesApps[pageIdx] = state.pagesApps[pageIdx].map((a) => (a.id === folder.id ? remainingApp : a));

      if (currentOpenedFolder && currentOpenedFolder.id === folder.id) {
        closeFolder(true);
      }
      savePagesApps();
      return true;
    }
  } else if (folder.apps.length === 0) {
    const pageIdx = state.pagesApps.findIndex((p) => p.some((a) => a.id === folder.id));
    if (pageIdx !== -1) {
      state.pagesApps[pageIdx] = state.pagesApps[pageIdx].filter((a) => a.id !== folder.id);
      if (currentOpenedFolder && currentOpenedFolder.id === folder.id) {
        closeFolder(true);
      }
      savePagesApps();
      return true;
    }
  }
  return false;
}

/** 初始化文件夹浮层事件 */
export function initFolder() {
  dom.folderOverlay.addEventListener('click', (e) => {
    if (e.target === dom.folderOverlay) {
      closeFolder();
    }
  });
}

