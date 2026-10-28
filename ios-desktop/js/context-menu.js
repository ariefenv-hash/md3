// ==================== context-menu.js — MD3 原生应用长按快捷气泡菜单 (App Shortcuts) ====================
//
// #75 二期（§1.7）：开合时序升级为 ArrowPopup U+ 一套（JS 逐帧编排 + TimedValue 打断协议）——
//   开：容器 fade 83ms / settle 200ms（Overshoot 落位）/ 子项 83ms 阶梯
//   关：容器 fade 233ms / 子项 150ms 起淡（83ms 淡出）
//   连续打断：关场中途重开（或反向）从当前进度接管（剩余时长语义），#39 类「快点丢动画」根治。
//   折叠：SHORTCUT_COLLAPSE_THRESHOLD=6 —— 快捷方式超过 6 条折叠进「更多快捷方式」行。
// CSS 所有权变更：transform/opacity 过渡由本文件逐帧驱动，pixel-features.css 不再持有过渡。

import { initialApps } from './apps-data.js';
import { openApp } from './app-window.js';
// v7.53：Dock 快捷增删（长按桌面图标 → 菜单直达）
// DOCK_MAX 的单一真源在 desktop-prefs.js（dock.js 只 import 不 re-export）
import { getDockItems, addToDock, removeFromDock } from './dock.js';
import { DOCK_MAX } from './desktop-prefs.js';
import { ICONS } from './icons.js';
import { getAppIconSVG } from './app-icons.js';
import { enterEditMode } from './drag-reorder.js';
// #75 二期（§1.7）：ArrowPopup U+ 时序原值 + 折叠阈值（单一真源 aosp/popup-timings.js）
import { U_TIMINGS, SHORTCUT_COLLAPSE_THRESHOLD, foldShortcuts, openSchedule, closeSchedule } from './aosp/popup-timings.js';
// #75 二期：定时轴引擎（v8.63 AOSP 打断协议落地）直接复用 —— 菜单开合即 InterruptibleInOutAnimator 语义
import { TimedValue } from './animation-presets.js';
import { EMPHASIZED_ACCELERATE, cubicBezier } from './aosp/interpolators.js';

let menuEl = null;
let currentApp = null;
let currentIconEl = null;

// ---------- #75 二期：U+ 开合编排引擎 ----------
const OVERSHOOT = cubicBezier(0.34, 1.56, 0.64, 1); // OvershootInterpolator(tension≈2) 语义近似（议题未给曲线原值，偏离注明）
const LINEAR = (t) => t;

// { mode:'open'|'close', fade, settle, children:[{eng,armAt,armed,target}], childEls, raf }
let menuAnim = null;
let menuLastTs = 0; // 真实 dt 驱动（与 split-screen RK4 同纪律 —— 固定步长/rAF 在 120Hz/high-dom 高频帧下会倍速）

function applyMenuVisuals() {
  if (!menuEl || !menuAnim) return;
  menuEl.style.opacity = menuAnim.fade.x.toFixed(3);
  // U+ OPEN_OVERSHOOT_DURATION_U 语义：settle 以轻微过冲落位（0.85 → ~1.02 → 1.0）
  const sc = 0.85 + 0.15 * OVERSHOOT(menuAnim.settle.x);
  menuEl.style.transform = `scale(${sc.toFixed(4)})`;
  menuEl.style.transformOrigin = 'top center';
  menuAnim.children.forEach((c, i) => {
    const row = menuAnim.childEls[i];
    if (row) row.style.opacity = c.eng.x.toFixed(3);
  });
}

/** 子项阶梯装载：到 armAt 才 setTarget（TimedValue 惰性锚定 —— 空闲→全新满时长） */
function armChildren(now) {
  if (!menuAnim) return;
  for (const c of menuAnim.children) {
    if (!c.armed && now >= c.armAt) {
      c.armed = true;
      c.eng.setTarget(c.target);
    }
  }
}

function tickMenu(ts) {
  if (!menuAnim) return;
  const now = performance.now();
  armChildren(now);
  let dt = menuLastTs ? (ts - menuLastTs) / 1000 : 1 / 120;
  menuLastTs = ts;
  if (dt > 0.25) dt = 0.25; // 与 RK4 循环同钳制（标签页切回防大步跳变）
  menuAnim.fade.update(dt);
  menuAnim.settle.update(dt);
  for (const c of menuAnim.children) c.eng.update(dt);
  applyMenuVisuals();
  const done = menuAnim.fade.isSettled() && menuAnim.settle.isSettled() &&
    menuAnim.children.every((c) => !c.armed || c.eng.isSettled());
  if (done) {
    const mode = menuAnim.mode;
    menuAnim.raf = null;
    if (mode === 'close') {
      menuAnim = null;
      if (menuEl) {
        menuEl.classList.remove('active');
        menuEl.style.opacity = '';
        menuEl.style.transform = '';
        menuEl.style.pointerEvents = '';
      }
    }
    return;
  }
  menuAnim.raf = requestAnimationFrame(tickMenu);
}

/**
 * 启动/切换开合编排。在飞重入（开↔关）时复用引擎原位 reconfigure + setTarget：
 * TimedValue 打断协议自动按「剩余时长」接管，位置连续零跳变（#39 类根治）。
 */
function startMenuAnim(mode) {
  if (!menuEl) return;
  const childEls = Array.from(menuEl.querySelectorAll('.menu-item'));
  const sched = mode === 'open'
    ? openSchedule(true, childEls.length)
    : closeSchedule(true, childEls.length);
  const now = performance.now();
  const prev = menuAnim;
  if (prev && prev.raf) cancelAnimationFrame(prev.raf);

  const fadeDesc = mode === 'open'
    ? { durationMs: U_TIMINGS.openFadeDuration, interpolator: LINEAR }
    : { durationMs: U_TIMINGS.closeDuration, interpolator: EMPHASIZED_ACCELERATE };
  const settleDesc = mode === 'open'
    ? { durationMs: U_TIMINGS.openDuration, interpolator: OVERSHOOT }
    : { durationMs: U_TIMINGS.closeDuration, interpolator: EMPHASIZED_ACCELERATE };

  const fade = prev ? prev.fade : new TimedValue({ ...fadeDesc, initialValue: 0 });
  const settle = prev ? prev.settle : new TimedValue({ ...settleDesc, initialValue: 0 });
  fade.reconfigure(fadeDesc);
  settle.reconfigure(settleDesc);
  fade.setTarget(mode === 'open' ? 1 : 0);
  settle.setTarget(mode === 'open' ? 1 : 0);

  const children = childEls.map((el, i) => {
    const s = sched.children[i] || { delay: 0, duration: U_TIMINGS.openChildFadeDuration };
    const eng = prev && prev.children[i]
      ? prev.children[i].eng
      : new TimedValue({ durationMs: s.duration, interpolator: LINEAR, initialValue: prev ? 1 : 0 });
    eng.reconfigure({ durationMs: s.duration, interpolator: LINEAR });
    return { eng, armAt: now + s.delay, armed: false, target: mode === 'open' ? 1 : 0 };
  });

  menuAnim = { mode, fade, settle, children, childEls, raf: null };
  menuLastTs = 0; // 重启时间轴锚（首帧用默认小步长，防跨会话大 dt）
  if (!menuAnim.raf) menuAnim.raf = requestAnimationFrame(tickMenu);
}

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

/**
 * 显示特定应用的快捷菜单
 * #75 二期：快捷方式 = 内置 APP_SHORTCUTS + window.__APP_SHORTCUTS_EXTRA[app.id] 扩展点
 *（pkg 应用/测试可注册），总数 > SHORTCUT_COLLAPSE_THRESHOLD(6) 折叠进「更多快捷方式」行
 */
export function showContextMenu(app, iconEl, x, y) {
  if (!menuEl || !app) return;

  currentApp = app;
  currentIconEl = iconEl;
  const appIdx = initialApps.findIndex(a => a.id === app.id);
  const extra = (typeof window !== 'undefined' && window.__APP_SHORTCUTS_EXTRA && window.__APP_SHORTCUTS_EXTRA[app.id]) || [];
  const allShortcuts = [...(APP_SHORTCUTS[app.id] || []), ...extra];
  let expandedShortcuts = false;
  // v7.53：Dock 归属态决定菜单项文案；小窗入口在小窗引擎就绪后展示
  const inDock = getDockItems().indexOf(app.id) !== -1;
  const miniReady = typeof window !== 'undefined' && typeof window.__miniWindowOpen === 'function';

  const renderShortcutList = () => {
    const fold = foldShortcuts(allShortcuts, SHORTCUT_COLLAPSE_THRESHOLD);
    const shown = expandedShortcuts
      ? allShortcuts.map((s, idx) => [s, idx])
      : fold.visible.map((s) => [s, allShortcuts.indexOf(s)]);
    return `
      ${shown.map(([s, idx]) => `
        <div class="menu-item shortcut-item" data-shortcut-idx="${idx}">
          <span class="menu-item-icon">${s.icon}</span>
          <span class="menu-item-text">${s.title}</span>
        </div>
      `).join('')}
      ${!expandedShortcuts && fold.hasFoldRow ? `
        <div class="menu-item shortcut-fold-row" role="button" aria-label="展开更多快捷方式">
          <span class="menu-item-icon">${ICONS.launch}</span>
          <span class="menu-item-text">更多快捷方式（${fold.foldedCount}）</span>
        </div>` : ''}
    `;
  };

  menuEl.innerHTML = `
    <div class="menu-header">
      <div class="menu-header-icon">${getAppIconSVG(app.id)}</div>
      <div class="menu-header-title">${app.name}</div>
    </div>

    ${allShortcuts.length > 0 ? `
      <div class="menu-shortcuts-list">
        ${renderShortcutList()}
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

  // 绑定事件（折叠行展开后需重绑 —— 抽成具名函数）
  const bindShortcutEvents = () => {
    menuEl.querySelectorAll('.shortcut-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        closeContextMenu();
        const sIdx = parseInt(item.dataset.shortcutIdx, 10);
        if (allShortcuts[sIdx] && allShortcuts[sIdx].action) {
          allShortcuts[sIdx].action(appIdx, iconEl);
        }
      });
    });
    const foldRow = menuEl.querySelector('.shortcut-fold-row');
    if (foldRow) {
      foldRow.addEventListener('click', (e) => {
        e.stopPropagation();
        expandedShortcuts = true;
        const listEl = menuEl.querySelector('.menu-shortcuts-list');
        if (listEl) {
          listEl.innerHTML = renderShortcutList();
          bindShortcutEvents();
        }
      });
    }
  };
  bindShortcutEvents();

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

  // #75 二期：U+ 开场编排（同步置初态防首帧闪现；旧 CSS 过渡已移除，所有权归 JS）
  menuEl.style.pointerEvents = '';
  menuEl.style.opacity = '0';
  menuEl.style.transform = 'scale(0.85)';
  startMenuAnim('open');

  if (navigator.vibrate) navigator.vibrate([15, 30, 15]);
}

/** 关闭快捷菜单 —— #75 二期：U+ 收场编排（233ms 容器 + 150ms 起淡子项），淡出期不可交互 */
export function closeContextMenu() {
  if (!menuEl || !menuEl.classList.contains('active')) return;
  if (menuAnim && menuAnim.mode === 'close') return; // 已在关场（打断重入由 open 路径接管）
  menuEl.style.pointerEvents = 'none';
  startMenuAnim('close');
}
