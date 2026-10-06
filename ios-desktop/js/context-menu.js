// ==================== context-menu.js — MD3 原生应用长按快捷气泡菜单 (App Shortcuts) ====================

import { initialApps } from './apps-data.js';
import { openApp } from './app-window.js';
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
