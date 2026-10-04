// ==================== performance.js — 系统性能调度、渲染节流与全局快捷键 ====================

import { state } from './state.js';
import { dom } from './dom.js';
import { closePullPanels } from './pull-down-gesture.js';
import { closeApp } from './app-window.js';
import { mediaService } from './media-service.js';
import { switchDesktopPage } from './desktop.js';
import { openSearchDialog } from './search-service.js';

/** 初始化全局键盘快捷键与硬件加速 */
export function initPerformanceAndShortcuts() {
  // 1. 开启图层硬件加速与文本抗锯齿
  document.body.style.textRendering = 'optimizeLegibility';
  document.documentElement.style.webkitFontSmoothing = 'antialiased';

  // 2. 键盘全局快捷键
  window.addEventListener('keydown', (e) => {
    // 避免在输入框中触发快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') {
        e.target.blur();
      }
      return;
    }

    // A. Escape 键：层级关闭
    if (e.key === 'Escape') {
      const searchOverlay = document.getElementById('pixelSearchOverlay');
      if (searchOverlay && searchOverlay.classList.contains('active')) {
        searchOverlay.classList.remove('active');
        return;
      }
      const themeOverlay = document.getElementById('themePickerOverlay');
      if (themeOverlay && themeOverlay.classList.contains('active')) {
        // v7.8：走缩放退场动画（与进场镜像），无桥时兜底立即回收
        if (window.__closeThemePickerAnimated) window.__closeThemePickerAnimated();
        else themeOverlay.classList.remove('active');
        return;
      }
      const recentOverlay = document.getElementById('recentAppsOverlay');
      if (recentOverlay && recentOverlay.classList.contains('active')) {
        // v7.9：走 closeRecentApps 桥（复位分屏配对/恢复挂起会话/清理动画 rAF），
        // 不再裸删 active class 留下状态残留
        if (window.__closeRecentApps) window.__closeRecentApps();
        else recentOverlay.classList.remove('active');
        return;
      }
      const pullOverlay = document.getElementById('pullPanelsOverlay');
      if (pullOverlay && pullOverlay.classList.contains('active')) {
        closePullPanels();
        return;
      }
      const contextMenu = document.getElementById('appContextMenu');
      if (contextMenu && contextMenu.classList.contains('active')) {
        contextMenu.classList.remove('active');
        return;
      }
      if (state.isOpen) {
        closeApp(0, -600, -2);
        return;
      }
    }

    // B. Ctrl/Cmd + K 或 '/' 打开全局搜索
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' || e.key === '/') {
      e.preventDefault();
      openSearchDialog();
      return;
    }

    // C. 空格键快速播放/暂停音频 (当未在应用内时)
    if (e.code === 'Space' && !state.isOpen) {
      e.preventDefault();
      mediaService.togglePlay();
      return;
    }

    // D. 左右方向键切换桌面分页
    if (!state.isOpen) {
      if (e.key === 'ArrowLeft') {
        switchDesktopPage(state.currentPage - 1);
      } else if (e.key === 'ArrowRight') {
        switchDesktopPage(state.currentPage + 1);
      }
    }
  });

  // 3. 内存与背景 iframe 挂起优化
  document.addEventListener('visibilitychange', () => {
    const isHidden = document.hidden;
    document.querySelectorAll('iframe').forEach((iframe) => {
      try {
        iframe.contentWindow.postMessage({
          type: 'SYSTEM_VISIBILITY_CHANGE',
          hidden: isHidden
        }, '*');
      } catch (err) {}
    });
  });
}
