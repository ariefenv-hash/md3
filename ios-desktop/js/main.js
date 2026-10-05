// ==================== main.js — 入口：初始化 DOM、绑定事件、启动渲染 ====================

import { dom, initDOM } from './dom.js';
import { state } from './state.js';
import { renderDesktopPages, initResponsiveGrid, beginLiveSwipe, moveLiveSwipe, settleLiveSwipe } from './desktop.js';
import { updateDynamicIcons, updateClock } from './dynamic-icons.js';
import {
  initWallpaper, triggerWallpaperSelect, triggerFontSelect,
  getWallpaperPushURL, getFontURL, getFontName, getHue, getPalette,
  restoreWallpaper, restoreFont,
} from './wallpaper.js';
import { onDown, onMove, onUp, initGestures } from './gestures.js';
import { popSubPage, pushSubPage } from './page-stack.js';
import { initFolder } from './folder.js';
import { restoreApp, exitEditMode, removeAppFromDesktop } from './drag-reorder.js';
import { switchDesktopPage } from './desktop.js';
import { initStatusBar } from './status-bar.js';
import { initQuickSettings, renderQuickSettingsGrid } from './quick-settings.js';
import { initNotifications } from './notifications.js';
import { initPullDownGesture, isPullPanelsActive } from './pull-down-gesture.js';
import { initPerformanceAndShortcuts } from './performance.js';
import { initSearchService, rebuildSearchIndex } from './search-service.js';
import { initAtAGlance } from './at-a-glance.js';
import { initContextMenu } from './context-menu.js';
import { initThemeEngine, getCurrentThemeHue, applyThemeHue } from './theme-engine.js';
import { initRecentApps, openRecentApps } from './recent-apps.js';
import { initSplitGroups } from './split-groups.js'; // v7.33：分屏组合托盘（多组持久化 + 桌面组合图标）
import { syncIframeTheme } from './iframe-app.js';
import { getProceduralSnapshotURL } from './procedural-wallpaper.js';
import { initLockScreen, getUnlockAnimStyle, setUnlockAnimStyle, lockNow } from './lock-screen.js';
import { closeApp } from './app-window.js';
import { showSystemToast } from './quick-settings.js';
import { initThemeMode } from './theme-mode.js';
import { initVideoWallpaper } from './video-wallpaper.js';
import { refreshBlurSnapshot } from './desktop-blur.js';
import { initAppBus, flushPendingForIframe } from './app-bus.js';
import { initPermissions } from './permissions.js';
import { initialApps } from './apps-data.js';
import { initSoundHaptics } from './sound-haptics.js';
import { initProfiles } from './profiles.js';
import './m3-controls.js';
import { initFocus } from './focus.js';
import { initStorageStats } from './storage-stats.js';
import { initDevOptions } from './dev-options.js';
import { initVfs } from './vfs.js';
import { initClipboard } from './clipboard.js';
// v7.19 应用互联：系统分享面板 + 应用深链路由（SHARE_OPEN / OPEN_APP）
import { initShareSheet } from './share-sheet.js';
import { initNavBar } from './nav-bar.js';
// v7.28 预览式返回：iframe 应用 PB 状态记账入口（投递路由见 iframe-pb.js / gestures.js）
import { handlePBMessage } from './iframe-pb.js';
import { registerModuleBack } from './module-back.js';
// v7.41（Issue #4 采纳）：AOSP 滚动体验（Stretch/Glow + FastScroller）与 M3E 点击涟漪
import { initScrollFx } from './scroll-fx.js';
import { initRippleFx } from './ripple-fx.js';
// files 模块应用页内返回消费器（目录上行 + 手势卡式；实例桥 __filesPB 由应用实例
// IIFE 暴露 —— 注册放宿主侧 main.js：应用定义文件不 import 依赖 state 的宿主模块）
registerModuleBack('files', {
  canBack: () => !!(window.__filesPB && window.__filesPB.canBack()),
  triggerBack: () => { if (window.__filesPB) window.__filesPB.triggerBack(); },
  // v7.41：转发方向/纵向位移（与 iframe PB 同协议 —— 卡片跟手方向+上下跟随）
  beginGesture: (dir) => { if (window.__filesPB) window.__filesPB.beginGesture(dir); },
  progressGesture: (dx, dy) => { if (window.__filesPB) window.__filesPB.progressGesture(dx, dy); },
  endGesture: (commit, vx) => { if (window.__filesPB) window.__filesPB.endGesture(commit, vx); },
});

// ==================== 全局禁用系统右键菜单与图片系统拖拽 ====================
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
}, { passive: false });

window.addEventListener('dragstart', (e) => {
  e.preventDefault();
}, { passive: false });

// ==================== 初始化 ====================

initDOM();
initStatusBar();
initSoundHaptics(); // 系统音效 + 触感门控：尽早安装 navigator.vibrate 包装，后续模块的振动调用全部受开关管辖
initThemeMode();   // 外观模式：先于面板渲染，避免首帧闪色
initWallpaper();
initFolder();
initGestures();
initQuickSettings();
initVideoWallpaper();
initNotifications();
initPullDownGesture();
initPerformanceAndShortcuts();
initSearchService();
initAtAGlance();
initContextMenu();
initThemeEngine();
initRecentApps();
initSplitGroups(); // v7.33：分屏组合托盘自举（localStorage 恢复 + 桌面渲染）
// 三键导航传统模式（融合手势：开启后手势引擎依旧全速运作）
initNavBar();
// 应用间通信总线 + 统一权限系统（跨应用联动的基座，详见 js/app-bus.js / js/permissions.js）
initAppBus();
initPermissions();
initShareSheet();
// 批次三：虚拟文件系统 + 全局剪贴板（数据层基座；vfs 桥接依赖总线的实例容器标记，置于其后）
initVfs();
initClipboard();
// 批次二：多模式（快照依赖主题引擎/壁纸模块就绪）、存储统计、开发者选项
initProfiles();
initFocus(); // 番茄钟专注模式（批次四）：Focus 磁贴 + 自动勿扰 + 阶段通知
initStorageStats(initialApps);
initDevOptions();
// v7.41（Issue #4 采纳）：AOSP 滚动体验（Stretch/Glow + FastScroller 滑动条）
// 与 M3E 点击涟漪 —— 均为文档级委托/观察器自举，无顺序依赖；
// 涟漪层依赖 document.body（入口脚本执行时已在 DOM 内）
initScrollFx();
initRippleFx();

// 外观模式变化时同步刷新快捷设置磁贴（深色模式磁贴跟随实际外观）；
// v7.26「MD3 贯穿始终」：同时重跑 applyThemeHue —— 宿主 inline 令牌与全部
// iframe 的注入样式 / data-theme-mode / postMessage 按新外观模式刷新，
// 子应用（共享令牌层 _shared/md3-tokens.css）随之切换浅/深方案。
window.__onThemeModeChanged = () => {
  try { renderQuickSettingsGrid(); } catch (e) {}
  try { applyThemeHue(getCurrentThemeHue(), false); } catch (e) {}
};

// v7.27：图标体系调试探针（E2E 源码版/dist 版通用 —— dist 为哈希捆绑无源码模块路径，
// 与 __themeHueTest 同惯例；app-icons 为零依赖纯数据模块，静态导入无环；
// 仅只读，不参与任何运行时逻辑）
import { APP_ICONS, getAppIconSVG } from './app-icons.js';
window.__appIconProbe = {
  ids: Object.keys(APP_ICONS),
  svg: (id) => APP_ICONS[id] || getAppIconSVG(id),
};

// 从 localStorage 恢复壁纸和字体
restoreWallpaper().then(() => refreshBlurSnapshot(true)); // 壁纸就绪后预烘焙毛玻璃快照
restoreFont();

// 响应式网格：旋转/跨档位缩放时重排图标
initResponsiveGrid();

// 初始化锁屏界面（默认展示；?nolock=1 跳过）
initLockScreen();
window.__getUnlockAnimStyle = getUnlockAnimStyle;
window.__setUnlockAnimStyle = setUnlockAnimStyle;
// v7.13：供设置页「立即体验」按钮直达锁屏（与快捷设置锁定磁贴同一入口）
window.__lockNow = lockNow;
// v7.13：设置页「立即锁屏体验」—— 若有前台应用先回桌面（关闭动画遮盖下完成），
// 稍候再上锁，确保解锁后用户看到的是桌面入场动效而非残留的应用窗口
window.__tryUnlockAnim = function () {
  if (state.isOpen && !state.isClosing) {
    closeApp(0, -600, -2);
    setTimeout(() => lockNow(), 500);
  } else {
    lockNow();
  }
};
// 壁纸恢复是异步的：延迟再刷新一次锁屏壁纸层，确保首次锁屏也拿到正确壁纸
setTimeout(() => {
  if (window.__lockTest && window.__lockTest.isLocked()) {
    const lockEl = document.getElementById('lockScreen');
    if (lockEl) {
      const proc = getProceduralSnapshotURL();
      const layer = lockEl.querySelector('.lock-wallpaper');
      if (layer) {
        if (proc) {
          layer.style.backgroundImage = `url("${proc}")`;
        } else {
          const desktop = document.getElementById('desktop');
          const bg = desktop ? getComputedStyle(desktop).backgroundImage : 'none';
          if (bg && bg !== 'none') layer.style.backgroundImage = bg;
        }
      }
    }
  }
}, 1200);

// 动态图标：事件驱动 1Hz 自续约（v7.34 起不再永续 rAF，空闲零开销）
updateDynamicIcons();

// 首次渲染桌面
renderDesktopPages();

// ==================== 暴露全局函数（供 HTML inline onclick 使用） ====================

window.pushSubPage = pushSubPage;
window.popSubPage = popSubPage;
window.triggerWallpaperSelect = triggerWallpaperSelect;
window.triggerFontSelect = triggerFontSelect;
window.showSystemToast = showSystemToast;

// fix(P3)：演示型死按钮统一反馈 —— appstore/map/mail/facetime 等演示应用内
// 多处按钮无任何监听器，点击零反馈（用户无法区分「坏了」还是「没做」）。
// 模板里以 onclick="__demoAction('xxx')" 接入，统一走系统 toast。
window.__demoAction = function (label) {
  try {
    window.showSystemToast(label ? `「${label}」为演示功能，暂未开放` : '演示功能，暂未开放');
  } catch (e) { /* toast 不可用时静默 */ }
};

// 全局手势穿透桥接（支持沙箱应用直接调用父级手势引擎）
function dispatchGesture(type, x, y, extra) {
  if (type === 'down') {
    onDown(x, y, extra || 'BOTTOM');
  } else if (type === 'move') {
    onMove(x, y);
  } else if (type === 'up') {
    onUp();
  }
}

window.__handleIframeGesture = function(type, x, y, extra) {
  dispatchGesture(type, x, y, extra);
};

/**
 * iframe 加载完成后，将当前壁纸和字体同步到 iframe 应用。
 * 同时注入 message 监听器与手势穿透监听器，使底部小白条手势在沙箱应用中同样拥有 100% 灵敏度。
 */
window.__syncIframeApp = function(iframe) {
  syncIframeTheme(iframe);

  // 推送当前壁纸（视频壁纸时为当前帧快照，否则为静态壁纸 URL）
  const wpURL = getWallpaperPushURL();
  if (wpURL) {
    try { iframe.contentWindow.postMessage({ type: 'set-wallpaper', url: wpURL }, '*'); } catch (e) {}
  }
  // 程序化动态壁纸：iframe 内以静态快照呈现（应用内无需实时动画）
  const procSnap = getProceduralSnapshotURL();
  if (procSnap) {
    try { iframe.contentWindow.postMessage({ type: 'set-wallpaper', url: procSnap }, '*'); } catch (e) {}
  }
  // 推送当前字体
  const fontURL = getFontURL();
  const fontName = getFontName();
  if (fontURL && fontName) {
    try { iframe.contentWindow.postMessage({ type: 'set-font', url: fontURL, name: fontName }, '*'); } catch (e) {}
  }
  // 推送当前主题色
  // fix(v7.25)：改用 theme-engine 单一真源 —— wallpaper.js 的 currentHue 只在初始化时
  // 从 localStorage 读取，运行期切壁纸（applyThemeHue）不会回写它，会造成双源不同步：
  // 应用重载后本函数按旧值补发 set-theme-hue，覆盖掉用户刚切的新主题色
  const hue = getCurrentThemeHue();
  try { iframe.contentWindow.postMessage({ type: 'set-theme-hue', hue }, '*'); } catch (e) {}
  // 推送完整配色方案
  const palette = getPalette();
  if (palette) {
    try { iframe.contentWindow.postMessage({ type: 'set-palette', palette }, '*'); } catch (e) {}
  }

  // 应用总线：实例挂载完成，补投递排队中的跨应用消息（便签→信息、相机→相册等）
  try { flushPendingForIframe(iframe); } catch (e) {}

  // 注入监听脚本与手势穿透脚本 —— 按文档幂等注入（fix(v7.19)：SDK 注入竞态）。
  // 旧版用 per-iframe 的 dataset.injected 守卫：创建期调用若打进 about:blank（导航
  // 未提交），标记已置位而注入随 about:blank 一起丢弃；真实文档 onload 再调时早退，
  // __system SDK 永久丢失 —— 重开后的应用失去 emit/notify/fs/clipboard/openApp 全部
  // 系统能力（E2E 实证：重开快捷指令后深链静默失效）。改为 per-document 标记后，
  // about:blank 与真实文档各注入一次，两种时序（先 about:blank / 先真实文档）都正确。
  const iDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
  if (!iDoc || iDoc.__md3SdkInjected) return;
  iDoc.__md3SdkInjected = true;
  try {
    const script = iDoc.createElement('script');
    script.textContent = `
      (function() {
        window.addEventListener('contextmenu', function(e) { e.preventDefault(); }, { passive: false });
        window.addEventListener('dragstart', function(e) { e.preventDefault(); }, { passive: false });

        // ---------- 应用间通信总线 / 系统服务 SDK（由桌面注入，详见 js/app-bus.js） ----------
        // 子应用通过 window.__system 以最小成本接入：跨应用事件、统一通知、统一权限
        if (!window.__system) {
          window.__system = {
            // 定向投递：target 传应用 id（如 'msg'）；不传则广播给全部活跃应用
            emit: function(event, payload, target) {
              try { window.parent.postMessage({ type: 'BUS_EMIT', event: event, payload: payload, target: target }, '*'); } catch (e) {}
            },
            broadcast: function(event, payload) { window.__system.emit(event, payload); },
            // v7.19 系统分享面板：拉起桌面级分享 UI（目标按内容自动过滤，见 share-sheet.js）
            share: function(p) {
              try { window.parent.postMessage({ type: 'SHARE_OPEN', payload: p || {} }, '*'); } catch (e) {}
            },
            // v7.19 应用深链：打开应用并可选携带动作（先排队投递、挂载后补投 → 打开即动作）
            openApp: function(appId, opts) {
              try {
                window.parent.postMessage({
                  type: 'OPEN_APP', appId: appId,
                  event: opts && opts.event, payload: opts && opts.payload
                }, '*');
              } catch (e) {}
            },
            // 统一通知：桌面 notifications.js 渲染 Heads-up 横幅 + 进通知中心
            notify: function(p) {
              try { window.parent.postMessage({ type: 'NOTIFY', payload: p }, '*'); } catch (e) {}
            },
            // 统一权限：桌面 permissions.js 弹出 MD3 对话框，resolve(true/false)
            requestPermission: function(name) {
              return new Promise(function(resolve) {
                var settled = false;
                var acknowledged = false;
                function done(v) {
                  if (settled) return;
                  settled = true;
                  window.removeEventListener('message', onMsg);
                  resolve(!!v);
                }
                var rid = 'perm' + Date.now() + Math.random().toString(36).slice(2, 7);
                function onMsg(e) {
                  var d = e.data;
                  if (!d || d.requestId !== rid) return;
                  if (d.type === 'PERMISSION_ACK') { acknowledged = true; }
                  else if (d.type === 'PERMISSION_RESULT') { done(d.granted); }
                }
                window.addEventListener('message', onMsg);
                try {
                  window.parent.postMessage({ type: 'REQUEST_PERMISSION', requestId: rid, permission: name }, '*');
                } catch (err) { done(true); return; }
                // 兜底：桌面无权限服务（旧版本/独立打开）→ ACK 未至则放行，不阻塞子应用
                setTimeout(function() { if (!acknowledged) done(true); }, 1200);
              });
            }
          };
        }

        // ---------- 批次三：虚拟文件系统 / 全局剪贴板（桌面 vfs.js / clipboard.js 承接） ----------
        // promise 化的请求应答助手：桌面回包 { type:'*_RESULT', requestId, ... }
        function bridgeRequest(msgType, resultType, body, timeoutMs) {
          return new Promise(function(resolve) {
            var settled = false;
            var rid = 'fs' + Date.now() + Math.random().toString(36).slice(2, 8);
            function onMsg(e) {
              var d = e.data;
              if (!d || d.requestId !== rid || d.type !== resultType) return;
              settled = true;
              window.removeEventListener('message', onMsg);
              resolve(d);
            }
            window.addEventListener('message', onMsg);
            try {
              window.parent.postMessage(Object.assign({ type: msgType, requestId: rid }, body), '*');
            } catch (err) { settled = true; window.removeEventListener('message', onMsg); resolve({ ok: false, error: 'postMessage 失败' }); return; }
            setTimeout(function() {
              if (!settled) { settled = true; window.removeEventListener('message', onMsg); resolve({ ok: false, error: '桌面无响应' }); }
            }, timeoutMs || 6000);
          });
        }
        if (window.__system && !window.__system.fs) {
          // 虚拟文件系统：write(path, data) 的 data 支持字符串/dataURL/Blob；read 返回 { meta, blob, text }
          window.__system.fs = {
            write: function(path, data, opts) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'write', args: { path: path, data: data, mime: opts && opts.mime } }).then(function(r) { return r.ok ? r.data : Promise.reject(new Error(r.error || '写入失败')); });
            },
            read: function(path) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'read', args: { path: path } }).then(function(r) { return r.ok ? r.data : null; });
            },
            list: function(path) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'list', args: { path: path } }).then(function(r) { return (r.ok && r.data && r.data.entries) ? r.data.entries : []; });
            },
            del: function(path) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'del', args: { path: path } }).then(function(r) { return r.ok; });
            },
            mkdir: function(path) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'mkdir', args: { path: path } }).then(function(r) { return r.ok; });
            },
            move: function(from, to) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'move', args: { from: from, to: to } }).then(function(r) { return r.ok ? r.data : null; });
            },
            exists: function(path) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'exists', args: { path: path } }).then(function(r) { return !!(r.ok && r.data && r.data.exists); });
            },
            url: function(path) {
              return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'url', args: { path: path } }).then(function(r) { return (r.ok && r.data) ? r.data.url : null; });
            }
          };
          // 全局剪贴板：write({ text }) 写入并镜像系统剪贴板；read() 返回内部载荷
          window.__system.clipboard = {
            write: function(payload) {
              return bridgeRequest('CLIPBOARD_WRITE', 'CLIPBOARD_RESULT', { payload: payload }, 3000).then(function(r) { return !!r.ok; });
            },
            read: function() {
              return bridgeRequest('CLIPBOARD_READ', 'CLIPBOARD_RESULT', {}, 3000).then(function(r) { return r.payload || null; });
            }
          };
          // 通知宿主子应用：SDK 就绪（此前启动的应用可监听该事件延迟初始化）
          try { window.dispatchEvent(new Event('__system-ready')); } catch (err) {}
        }

        // ---------- 底部手势敏捷转发 (针对沙箱应用的零延迟穿透) ----------
        var isTrackingBottom = false;
        var startX = 0, startY = 0;

        function forwardGesture(type, x, y, extra) {
          try {
            if (window.parent && window.parent.__handleIframeGesture) {
              window.parent.__handleIframeGesture(type, x, y, extra);
            } else {
              window.parent.postMessage({ type: 'iframe-gesture', gestureType: type, x: x, y: y, extra: extra }, '*');
            }
          } catch (e) {
            try {
              window.parent.postMessage({ type: 'iframe-gesture', gestureType: type, x: x, y: y, extra: extra }, '*');
            } catch (err) {}
          }
        }

        window.addEventListener('touchstart', function(e) {
          if (!e.touches || !e.touches[0]) return;
          var t = e.touches[0];
          var screenH = window.innerHeight;
          var screenW = window.innerWidth;
          // 判定是否触碰到底部 68px 区域或左右边缘 36px 区域
          if (t.clientY > screenH - 68) {
            isTrackingBottom = true;
            startX = t.clientX;
            startY = t.clientY;
            forwardGesture('down', t.clientX, t.clientY, 'BOTTOM');
          } else if (t.clientX < 36) {
            forwardGesture('down', t.clientX, t.clientY, 'EDGE_LEFT');
          } else if (t.clientX > screenW - 36) {
            forwardGesture('down', t.clientX, t.clientY, 'EDGE_RIGHT');
          } else {
            isTrackingBottom = false;
          }
        }, { passive: true });

        window.addEventListener('touchmove', function(e) {
          if (!isTrackingBottom || !e.touches || !e.touches[0]) return;
          var t = e.touches[0];
          var dy = startY - t.clientY;
          if (dy > 6 && e.cancelable) {
            e.preventDefault();
          }
          forwardGesture('move', t.clientX, t.clientY);
        }, { passive: false });

        window.addEventListener('touchend', function(e) {
          if (isTrackingBottom) {
            isTrackingBottom = false;
            forwardGesture('up');
          }
        }, { passive: true });

        window.addEventListener('touchcancel', function(e) {
          if (isTrackingBottom) {
            isTrackingBottom = false;
            forwardGesture('up');
          }
        }, { passive: true });

        // 鼠标在桌面端模拟手势
        window.addEventListener('mousedown', function(e) {
          if (e.clientY > window.innerHeight - 68) {
            isTrackingBottom = true;
            forwardGesture('down', e.clientX, e.clientY, 'BOTTOM');
          }
        });
        window.addEventListener('mousemove', function(e) {
          if (isTrackingBottom) {
            forwardGesture('move', e.clientX, e.clientY);
          }
        });
        window.addEventListener('mouseup', function(e) {
          if (isTrackingBottom) {
            isTrackingBottom = false;
            forwardGesture('up');
          }
        });

        window.addEventListener('message', function(e) {
          var d = e.data;
          if (!d) return;
          // 守卫：iframe 文档销毁间隙（换页/卸载）documentElement 可能短暂为 null
          if (!document.documentElement || !document.body) return;
          // 壁纸同步
          if (d.type === 'set-wallpaper' && d.url) {
            var P = document.getElementById('P');
            if (P) {
              P.style.backgroundImage = 'url(' + d.url + ')';
              P.classList.add('has-wallpaper');
            }
            var targets = document.querySelectorAll('[data-wallpaper-target]');
            for (var i = 0; i < targets.length; i++) {
              targets[i].style.backgroundImage = 'url(' + d.url + ')';
              if (targets[i].classList) targets[i].classList.add('has-wallpaper');
            }
            if (!P && targets.length === 0) {
              document.body.style.backgroundImage = 'url(' + d.url + ')';
              document.body.style.backgroundSize = 'cover';
              document.body.style.backgroundPosition = 'center';
            }
          }
          // 字体同步 (智能字体回退链，保护符号、Emoji 与矢量图标不被破坏)
          if (d.type === 'set-font' && d.url && d.name) {
            var sid = 'ios-desktop-injected-font';
            var existing = document.getElementById(sid);
            if (existing) existing.remove();
            var s = document.createElement('style');
            s.id = sid;
            s.textContent = "@font-face{font-family:'" + d.name + "';src:url('" + d.url + "') format('woff2'),url('" + d.url + "') format('woff'),url('" + d.url + "') format('truetype');font-display:swap;} body,input,textarea,select,button,p,h1,h2,h3,h4,h5,h6{font-family:'" + d.name + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', 'PingFang SC', sans-serif !important;} svg, svg *, [class*='icon'], [class*='symbol'], [class*='emoji'], [data-icon], [data-symbol], .material-symbols{font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif !important;} .material-symbols-rounded{font-family:'Material Symbols Rounded' !important;} .material-symbols-outlined{font-family:'Material Symbols Outlined' !important;} .material-icons,.material-icons-rounded,.material-icons-outlined{font-family:'Material Icons' !important;}";
            document.head.appendChild(s);
          }
          // 主题色同步
          if (d.type === 'set-theme-hue' && typeof d.hue === 'number') {
            document.documentElement.style.setProperty('--md-h', d.hue);
            document.documentElement.style.setProperty('--h', d.hue);
          }
          // 完整配色方案同步
          if (d.type === 'set-palette' && d.palette) {
            var p = d.palette;
            if (p.hue) {
              document.documentElement.style.setProperty('--md-h', p.hue);
              document.documentElement.style.setProperty('--h', p.hue);
            }
            if (p.secondaryHue) {
              document.documentElement.style.setProperty('--md-secondary-hue', p.secondaryHue);
            }
          }
          // 应用内字体覆盖
          if (d.type === 'set-app-font' && d.url && d.name) {
            var sid2 = 'app-local-font';
            var ex2 = document.getElementById(sid2);
            if (ex2) ex2.remove();
            var s2 = document.createElement('style');
            s2.id = sid2;
            s2.textContent = "@font-face{font-family:'" + d.name + "';src:url('" + d.url + "') format('woff2'),url('" + d.url + "') format('woff'),url('" + d.url + "') format('truetype');font-display:swap;} body,input,textarea,select,button,p,h1,h2,h3,h4,h5,h6{font-family:'" + d.name + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;} svg, svg *, [class*='icon'], [class*='symbol'], [class*='emoji'], [data-icon], [data-symbol]{font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif !important;} .material-symbols-rounded{font-family:'Material Symbols Rounded' !important;} .material-symbols-outlined{font-family:'Material Symbols Outlined' !important;} .material-icons,.material-icons-rounded,.material-icons-outlined{font-family:'Material Icons' !important;}";
            document.head.appendChild(s2);
          }
        });
      })();
    `;
    iDoc.body ? iDoc.body.appendChild(script) : (iDoc.head || iDoc.documentElement).appendChild(script);
  } catch (e) {
    // 跨域限制时 fallback
  }
};

// ==================== 全局事件绑定 ====================

// 点击桌面空白处退出编辑模式
dom.desktop.addEventListener('click', (e) => {
  if (state.isEditMode && !e.target.closest('.app-icon') && !e.target.closest('.app-folder')) {
    exitEditMode();
  }
});

// 返回按钮
dom.backBtn.addEventListener('click', () => {
  if (!state.isDragging) popSubPage();
});

// ---------- Touch 事件 ----------
window.addEventListener('touchstart', (e) => {
  if (isPullPanelsActive()) return;
  onDown(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (isPullPanelsActive()) return;
  onMove(e.touches[0].clientX, e.touches[0].clientY);
  if (state.isDragging && e.cancelable) e.preventDefault();
}, { passive: false });

window.addEventListener('touchend', (e) => {
  if (isPullPanelsActive()) return;
  onUp();
}, { passive: true });

window.addEventListener('touchcancel', (e) => {
  if (isPullPanelsActive()) return;
  onUp();
}, { passive: true });

// ---------- Mouse 事件 ----------
window.addEventListener('mousedown', (e) => {
  if (isPullPanelsActive()) return;
  state.mouseDown = true;
  onDown(e.clientX, e.clientY);
});

window.addEventListener('mousemove', (e) => {
  if (isPullPanelsActive()) return;
  // state.isDragging：从 iframe 桥接开始的手势（iframe 内 mousedown 被转发，
  // 父页面 state.mouseDown 为 false），拖拽期间 iframe 指针事件已被禁用，
  // 后续 mousemove 必须由父页面接管，否则拖拽卡死
  if (state.mouseDown || state.isDragging) onMove(e.clientX, e.clientY);
});

window.addEventListener('mouseup', () => {
  if (state.mouseDown || state.isDragging) {
    state.mouseDown = false;
    onUp();
  }
});

// ---------- 跨上下文消息监听（恢复应用、沙箱手势通信等） ----------
// fix(P3)：消息来源校验（与 notifications.js 同族问题）—— restore-app / uninstall-app /
// iframe-gesture 直接驱动桌面级变更（卸载应用、伪造手势），无校验时任意可 postMessage
// 的上下文均可触发。仅接受桌面自身与当前文档内已挂载的 iframe 来源。
function isTrustedMessageSource(source) {
  if (!source) return false;
  if (source === window) return true; // 桌面自身 postMessage（同窗）
  const frames = document.querySelectorAll('iframe');
  for (let i = 0; i < frames.length; i++) {
    try {
      if (frames[i].contentWindow === source) return true;
    } catch (e) { /* 跨域/已销毁上下文时忽略 */ }
  }
  return false;
}

window.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'restore-app' && e.data.appId) {
    if (!isTrustedMessageSource(e.source)) return;
    restoreApp(e.data.appId);
    // 恢复应用后重建搜索索引（应用重新可搜）
    rebuildSearchIndex();
  } else if (e.data.type === 'uninstall-app' && e.data.appId) {
    if (!isTrustedMessageSource(e.source)) return;
    // 设置 › 应用管理：卸载 = 从所在页移除并入 removedApps（与编辑模式移除同一条链路）
    const pageIdx = state.pagesApps.findIndex((page) => Array.isArray(page) && page.some((a) => a && a.id === e.data.appId));
    if (pageIdx !== -1) removeAppFromDesktop(pageIdx, e.data.appId);
    // 卸载后重建搜索索引（已卸载应用不再可搜）
    rebuildSearchIndex();
  } else if (e.data.type === 'iframe-gesture') {
    if (!isTrustedMessageSource(e.source)) return;
    const { gestureType, x, y, extra } = e.data;
    dispatchGesture(gestureType, x, y, extra);
  } else {
    // v7.28 预览式返回：子应用 PBNav 的状态上报（canBack 记账）
    handlePBMessage(e);
  }
});

// ---------- 桌面水平滑动切页 与 底部上滑呼出后台 ----------
// 升级：触摸/鼠标统一走 Live Pager（js/desktop.js）—— 1:1 跟手 + 速度吸附 +
// 越界橡皮筋；吸附飞行中再次按下从 CSS 插值矩阵无缝接管，消除反复重绘闪屏。
let desktopSwipeStartX = 0;
let desktopSwipeStartY = 0;
let desktopSwipeStartTime = 0;
let desktopSwipeActive = false;
let desktopLiveMode = false;      // 跟手模式已激活（水平意图已判定）
let desktopSwipeTouchId = null;   // 多点触控：只跟踪起始那根手指

// 滑动收尾后短暂拦截桌面 click：部分浏览器大幅移动后仍会派发 click，
// 落点若是另一页图标会误开应用（老隐患顺带修复）
let desktopClickBlockUntil = 0;
dom.desktop.addEventListener('click', (e) => {
  if (performance.now() < desktopClickBlockUntil) {
    e.stopPropagation();
    e.preventDefault();
  }
}, true);

function suppressDesktopClick() {
  desktopClickBlockUntil = performance.now() + 350;
}

dom.desktop.addEventListener('touchstart', (e) => {
  if (isPullPanelsActive() || state.isOpen || state.isDragging || state.iconDragState || state.isEditMode) return;
  const t = e.touches[0];
  desktopSwipeStartX = t.clientX;
  desktopSwipeStartY = t.clientY;
  desktopSwipeStartTime = performance.now();
  desktopSwipeActive = true;
  desktopLiveMode = false;
  desktopSwipeTouchId = t.identifier;
}, { passive: true });

dom.desktop.addEventListener('touchmove', (e) => {
  if (!desktopSwipeActive || isPullPanelsActive()) return;
  // 只跟踪起始手指，多指触摸不干扰
  const t = e.touches.length === 1 ? e.touches[0]
    : Array.from(e.touches).find((tt) => tt.identifier === desktopSwipeTouchId);
  if (!t) return;

  const dx = t.clientX - desktopSwipeStartX;
  const dy = t.clientY - desktopSwipeStartY;

  if (!desktopLiveMode) {
    // 水平意图判定：超过 12px 且明显横向 → 进入跟手模式
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      desktopLiveMode = true;
      // 传入手势起点：起始已位移的 12px 立即体现，全程 1:1
      beginLiveSwipe(desktopSwipeStartX);
      moveLiveSwipe(t.clientX);
    }
  } else {
    moveLiveSwipe(t.clientX);
  }

  // 跟手期间阻止浏览器滚动 / 下拉刷新 / 橡皮筋
  if (desktopLiveMode && e.cancelable) e.preventDefault();
}, { passive: false });

dom.desktop.addEventListener('touchend', (e) => {
  if (isPullPanelsActive() || !desktopSwipeActive || state.isOpen || state.isDragging) {
    desktopSwipeActive = false;
    desktopLiveMode = false;
    return;
  }
  const wasLive = desktopLiveMode;
  desktopSwipeActive = false;
  desktopLiveMode = false;

  const t = e.changedTouches[0];
  const dx = t.clientX - desktopSwipeStartX;
  const dy = t.clientY - desktopSwipeStartY;

  // 底部上滑唤出后台（垂直手势：live 模式不会被水平意图判定激活）
  if (desktopSwipeStartY > window.innerHeight - 60 && dy < -45) {
    openRecentApps();
    return;
  }

  // 跟手模式收尾：按位移 + 释放速度吸附目标页
  if (wasLive) {
    suppressDesktopClick();
    settleLiveSwipe();
    return;
  }

  // 兑底：极短促轻扫未触发跟手判定时保留原有阈值切页
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    suppressDesktopClick();
    if (dx < 0) {
      switchDesktopPage(state.currentPage + 1);
    } else {
      switchDesktopPage(state.currentPage - 1);
    }
  }
}, { passive: true });

dom.desktop.addEventListener('touchcancel', () => {
  // 手势被系统中断：跟手模式直接吸附回最近页面，避免卡在中间态
  if (desktopLiveMode) {
    desktopLiveMode = false;
    settleLiveSwipe();
  }
  desktopSwipeActive = false;
}, { passive: true });

// Mouse 版桌面滑动（桌面浏览器测试；同样走 Live Pager）
let mouseSwipeStartX = 0;
let mouseSwipeStartY = 0;
let mouseSwipeActive = false;
let mouseLiveMode = false;

dom.desktop.addEventListener('mousedown', (e) => {
  if (isPullPanelsActive() || state.isOpen || state.isDragging || state.iconDragState || state.isEditMode) return;
  if (e.target.closest('.app-icon') || e.target.closest('.app-folder')) return;
  mouseSwipeStartX = e.clientX;
  mouseSwipeStartY = e.clientY;
  mouseSwipeActive = true;
  mouseLiveMode = false;
});

window.addEventListener('mousemove', (e) => {
  if (!mouseSwipeActive || isPullPanelsActive()) return;
  const dx = e.clientX - mouseSwipeStartX;
  const dy = e.clientY - mouseSwipeStartY;

  if (!mouseLiveMode) {
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      mouseLiveMode = true;
      beginLiveSwipe(mouseSwipeStartX);
      moveLiveSwipe(e.clientX);
    }
  } else {
    moveLiveSwipe(e.clientX);
  }
});

window.addEventListener('mouseup', (e) => {
  if (!mouseSwipeActive || isPullPanelsActive()) {
    mouseSwipeActive = false;
    mouseLiveMode = false;
    return;
  }
  const wasLive = mouseLiveMode;
  mouseSwipeActive = false;
  mouseLiveMode = false;
  const dx = e.clientX - mouseSwipeStartX;
  const dy = e.clientY - mouseSwipeStartY;

  // 底部上滑唤出后台
  if (mouseSwipeStartY > window.innerHeight - 60 && dy < -50) {
    openRecentApps();
    return;
  }

  if (wasLive) {
    suppressDesktopClick();
    settleLiveSwipe();
    return;
  }

  if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    suppressDesktopClick();
    if (dx < 0) {
      switchDesktopPage(state.currentPage + 1);
    } else {
      switchDesktopPage(state.currentPage - 1);
    }
  }
});

// ==================== 屏幕尺寸与方向变化自动重平衡 ====================
let resizeDebounceTimer = null;
function rebalanceViewportLayout() {
  // 1. 刷新桌面分页位置
  switchDesktopPage(state.currentPage, false);

  // 2. 如果后台多任务视图打开，重新计算卡片尺寸
  const recentsOverlay = document.getElementById('recentAppsOverlay');
  if (recentsOverlay && recentsOverlay.classList.contains('active')) {
    import('./recent-apps.js').then(m => m.renderRecentCards());
  }
}

window.addEventListener('resize', () => {
  if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = setTimeout(rebalanceViewportLayout, 100);
}, { passive: true });

window.addEventListener('orientationchange', () => {
  setTimeout(rebalanceViewportLayout, 200);
}, { passive: true });
