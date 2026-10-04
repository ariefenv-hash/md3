// ==================== dom.js — DOM 引用注册表 ====================
//
// 所有模块通过 dom 对象访问共享 DOM 节点，
// 由 main.js 在 DOMContentLoaded 后统一初始化。

export const dom = {};

/** 收集所有共享 DOM 引用，在 main.js 中调用 */
export function initDOM() {
  dom.desktopSlider       = document.getElementById('desktopSlider');
  dom.pageDots            = document.getElementById('pageDots');
  dom.appWindow           = document.getElementById('appWindow');
  dom.windowShadowLayer   = document.getElementById('windowShadowLayer');
  // v7.17：液态玻璃边缘高光合成层（替代 --glass-glow 变量驱动的 ::after）
  dom.windowGlowLayer     = document.getElementById('windowGlowLayer');
  dom.appLaunchScreen     = document.getElementById('appLaunchScreen');
  dom.launchIconContainer = document.getElementById('launchIconContainer');
  dom.appTitle            = document.getElementById('appTitle');
  dom.pageStack           = document.getElementById('pageStack');
  dom.desktop             = document.getElementById('desktop');
  dom.stage               = document.getElementById('stage');
  dom.header              = dom.appWindow ? dom.appWindow.querySelector('.app-header') : null;
  dom.gesture             = dom.appWindow ? dom.appWindow.querySelector('.gesture-bar') : null;
  dom.gestureBarContainer = document.getElementById('gestureBarContainer');
  dom.backBtn             = document.getElementById('backBtn');
  dom.clock               = document.getElementById('clock');
  dom.statusBar           = document.getElementById('statusBar');
  dom.appWindowStatusBar  = document.getElementById('appWindowStatusBar');
  dom.triggerZone         = document.getElementById('triggerZone');
  dom.edgeLeft            = document.getElementById('edgeLeft');
  dom.edgeRight           = document.getElementById('edgeRight');
  dom.wallpaperInput      = document.getElementById('wallpaperInput');
  dom.fontInput           = document.getElementById('fontInput');
  dom.folderOverlay       = document.getElementById('folderOverlay');
  dom.folderTitle         = document.getElementById('folderTitle');
  dom.folderGrid          = document.getElementById('folderGrid');
  dom.pullPanelsOverlay   = document.getElementById('pullPanelsOverlay');
  dom.pullPanelsSlider    = document.getElementById('pullPanelsSlider');
}
