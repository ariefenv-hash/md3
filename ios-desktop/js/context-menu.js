// ==================== context-menu.js — MD3 原生应用长按快捷气泡菜单 (App Shortcuts) ====================

import { initialApps } from './apps-data.js';
import { openApp } from './app-window.js';
// v7.53：Dock 快捷增删（长按桌面图标 → 菜单直达）
// DOCK_MAX 的单一真源在 desktop-prefs.js（dock.js 只 import 不 re-export）
import { getDockItems, addToDock, removeFromDock } from './dock.js';
import { DOCK_MAX } from './desktop-prefs.js';
import { ICONS } from './icons.js';
import { getAppIconSVG } from './app-icons.js';
import { enterEditMode } from './drag-reorder.js';

let menuEl = null;
let currentApp = null;
let currentIconEl = null;

// 特定应用的定制快捷动作
const APP_SHORTCUTS = {
  msg: [
    { title: '快速会话', icon: ICONS.chat, action: (idx, el) => openApp(idx, el) },
    { title: '角色切换', icon: ICONS.auto_awesome, action: (idx, el) => {
      openApp(idx, el);
      setTimeout(() => {
        const iframe = document.querySelector('.page-iframe');
        if (iframe) iframe.contentWindow.postMessage({ type: 'QUICK_SWITCH_ROLE' }, '*');
      }, 500);
    }}
  ],
  camera: [
    { title: '自拍模式', icon: ICONS.photo_camera, action: (idx, el) => openApp(idx, el) },
    { title: '录制视频', icon: ICONS.videocam, action: (idx, el) => openApp(idx, el) }
  ],
  settings: [
    { title: '壁纸与样式', icon: ICONS.palette, action: () => {
      if (window.openThemePicker) window.openThemePicker();
    }}
    // v7.48：移除「电池健康」快捷项 —— action 只是打开设置主页（无直达），
    // 用户实测判定无实际用处（issue 反馈）
  ],
  notes: [
    { title: '新建便签', icon: ICONS.edit, action: (idx, el) => openApp(idx, el) }
  ],
  calculator: [
    { title: '即时计算', icon: ICONS.calculator, action: (idx, el) => openApp(idx, el) }
  ]
};

/** 初始化应用快捷菜单 */
export function initContextMenu() {
  createMenuDOM();

  // 点击外部关闭
  window.addEventListener('pointerdown', (e) => {
    if (menuEl && menuEl.classList.contains('active') && !menuEl.contains(e.target)) {
      closeContextMenu();
    }
  });
}

function createMenuDOM() {
  menuEl = document.createElement('div');
  menuEl.id = 'appContextMenu';
  menuEl.className = 'app-context-menu';
  document.body.appendChild(menuEl);
}

/** 显示特定应用的快捷菜单 */
export function showContextMenu(app, iconEl, x, y) {
  if (!menuEl || !app) return;

  currentApp = app;
  currentIconEl = iconEl;
  const appIdx = initialApps.findIndex(a => a.id === app.id);
  const shortcuts = APP_SHORTCUTS[app.id] || [];
  // v7.53：Dock 归属态决定菜单项文案；小窗入口在小窗引擎就绪后展示
  const inDock = getDockItems().indexOf(app.id) !== -1;
  const miniReady = typeof window !== 'undefined' && typeof window.__miniWindowOpen === 'function';

  menuEl.innerHTML = `
    <div class="menu-header">
      <div class="menu-header-icon">${getAppIconSVG(app.id)}</div>
      <div class="menu-header-title">${app.name}</div>
    </div>

    ${shortcuts.length > 0 ? `
      <div class="menu-shortcuts-list">
        ${shortcuts.map((s, idx) => `
          <div class="menu-item shortcut-item" data-shortcut-idx="${idx}">
            <span class="menu-item-icon">${s.icon}</span>
            <span class="menu-item-text">${s.title}</span>
          </div>
        `).join('')}
      </div>
      <div class="menu-divider"></div>
    ` : ''}

    <div class="menu-system-actions">
      <div class="menu-item action-open">
        <span class="menu-item-icon">${ICONS.launch}</span>
        <span class="menu-item-text">打开应用</span>
      </div>
      ${miniReady ? `
      <div class="menu-item action-mini">
        <span class="menu-item-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="15" rx="2.5"/><rect x="12.5" y="11.5" width="8" height="6.5" rx="1.5" fill="currentColor" stroke="none"/></svg>
        </span>
        <span class="menu-item-text">以小窗打开</span>
      </div>` : ''}
      <div class="menu-item action-dock ${inDock ? 'dock-remove' : 'dock-add'}">
        <span class="menu-item-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="15" width="18" height="6" rx="2"/><rect x="5" y="3" width="4" height="4" rx="1"/><rect x="10" y="3" width="4" height="4" rx="1"/><rect x="15" y="3" width="4" height="4" rx="1"/></svg>
        </span>
        <span class="menu-item-text">${inDock ? '从 Dock 移除' : '添加到 Dock'}</span>
      </div>
      <div class="menu-item action-edit">
        <span class="menu-item-icon">${ICONS.edit}</span>
        <span class="menu-item-text">编辑主屏幕 (重排图标)</span>
      </div>
    </div>
  `;

  // 绑定事件
  menuEl.querySelectorAll('.shortcut-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      closeContextMenu();
      const sIdx = parseInt(item.dataset.shortcutIdx, 10);
      if (shortcuts[sIdx] && shortcuts[sIdx].action) {
        shortcuts[sIdx].action(appIdx, iconEl);
      }
    });
  });

  menuEl.querySelector('.action-open').addEventListener('click', (e) => {
    e.stopPropagation();
    closeContextMenu();
    openApp(appIdx, iconEl);
  });

  // v7.53：小窗打开（mini-window 未就绪时菜单项不渲染，此分支仅为双保险）
  const miniItem = menuEl.querySelector('.action-mini');
  if (miniItem) {
    miniItem.addEventListener('click', (e) => {
      e.stopPropagation();
      closeContextMenu();
      try { window.__miniWindowOpen(app.id, null); } catch (err) {}
    });
  }

  // v7.53：Dock 增删（满员提示 / 移除即时反馈）
  const dockItem = menuEl.querySelector('.action-dock');
  if (dockItem) {
    dockItem.addEventListener('click', (e) => {
      e.stopPropagation();
      const removing = dockItem.classList.contains('dock-remove');
      closeContextMenu();
      if (removing) {
        removeFromDock(app.id);
        if (window.showSystemToast) window.showSystemToast('已从 Dock 移除「' + app.name + '」');
      } else if (addToDock(app.id)) {
        if (window.showSystemToast) window.showSystemToast('已添加「' + app.name + '」到 Dock');
      } else if (getDockItems().length >= DOCK_MAX) {
        if (window.showSystemToast) window.showSystemToast('Dock 已满（最多 ' + DOCK_MAX + ' 个），长按 Dock 图标可移除');
      }
    });
  }

  menuEl.querySelector('.action-edit').addEventListener('click', (e) => {
    e.stopPropagation();
    closeContextMenu();
    enterEditMode();
  });

  // 定位计算 (防溢出屏幕边缘)
  menuEl.style.visibility = 'hidden';
  menuEl.classList.add('active');

  const menuW = 200;
  const menuH = menuEl.offsetHeight || 180;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  let left = x - menuW / 2;
  let top = y - menuH - 12;

  if (top < 60) top = y + 20;
  if (left < 16) left = 16;
  if (left + menuW > screenW - 16) left = screenW - menuW - 16;

  menuEl.style.left = `${left}px`;
  menuEl.style.top = `${top}px`;
  menuEl.style.visibility = 'visible';

  if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
}

/** 关闭快捷菜单 */
export function closeContextMenu() {
  if (menuEl) {
    menuEl.classList.remove('active');
  }
}
