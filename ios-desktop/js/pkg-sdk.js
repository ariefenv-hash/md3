/* ==================== pkg-sdk.js — 安装包应用系统 SDK（v7.52 · 由 Service Worker 注入） ====================
 *
 * 运行环境：安装包应用（pkg-）的沙箱 iframe —— sandbox 无 allow-same-origin，
 * 运行在 opaque origin。宿主桌面无法向其注入 main.js 的内联 SDK（跨域读取
 * contentDocument 被浏览器拒绝），因此本文件由 sw.js 在返回包内 text/html 响应时
 * 以 <script src> 注入 <head> 最前，为包内网页补齐与内置 iframe 应用一致的系统桥：
 *
 *   window.__system  — emit / broadcast / share / openApp / notify / requestPermission
 *                      + fs（虚拟文件系统）/ clipboard（全局剪贴板）
 *   主题同步消息      — set-theme-hue / set-wallpaper / set-font / set-palette / set-app-font
 *   手势穿透          — 底部 68px / 左右边缘 36px 触摸与鼠标事件转发桌面手势引擎
 *
 * 通信协议与 main.js 注入版完全同构（桌面侧零新增监听）：所有出站消息 postMessage
 * 到 window.parent，桌面按既有类型分发（BUS_EMIT / NOTIFY / REQUEST_PERMISSION / …）。
 *
 * 沙箱注意：opaque origin 里 window.localStorage 访问会抛 SecurityError ——
 * 包内应用的持久化请统一走 window.__system.fs（README 规范有说明）。
 */
(function () {
  'use strict';
  if (window.__pkgSdkInstalled) return;
  window.__pkgSdkInstalled = true;

  // ---------- 右键 / 系统拖拽禁用（与桌面、内置 iframe 应用行为一致） ----------
  window.addEventListener('contextmenu', function (e) { e.preventDefault(); }, { passive: false });
  window.addEventListener('dragstart', function (e) { e.preventDefault(); }, { passive: false });

  // ---------- promise 化请求应答（与 main.js 注入版同构） ----------
  function bridgeRequest(msgType, resultType, body, timeoutMs) {
    return new Promise(function (resolve) {
      var settled = false;
      var rid = 'pkg' + Date.now() + Math.random().toString(36).slice(2, 8);
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
      setTimeout(function () {
        if (!settled) { settled = true; window.removeEventListener('message', onMsg); resolve({ ok: false, error: '桌面无响应' }); }
      }, timeoutMs || 6000);
    });
  }

  function post(msg) {
    try { window.parent.postMessage(msg, '*'); } catch (e) { /* 上下文已销毁 */ }
  }

  // ---------- __system：跨应用事件 / 通知 / 深链 / 权限 / fs / 剪贴板 ----------
  if (!window.__system) {
    window.__system = {
      emit: function (event, payload, target) { post({ type: 'BUS_EMIT', event: event, payload: payload, target: target }); },
      broadcast: function (event, payload) { window.__system.emit(event, payload); },
      share: function (p) { post({ type: 'SHARE_OPEN', payload: p || {} }); },
      openApp: function (appId, opts) {
        post({ type: 'OPEN_APP', appId: appId, event: opts && opts.event, payload: opts && opts.payload });
      },
      notify: function (p) { post({ type: 'NOTIFY', payload: p }); },
      requestPermission: function (name) {
        return new Promise(function (resolve) {
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
          try { post({ type: 'REQUEST_PERMISSION', requestId: rid, permission: name }); } catch (err) { done(true); return; }
          setTimeout(function () { if (!acknowledged) done(true); }, 1200);
        });
      }
    };
  }

  if (!window.__system.fs) {
    window.__system.fs = {
      write: function (path, data, opts) {
        return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'write', args: { path: path, data: data, mime: opts && opts.mime } })
          .then(function (r) { return r.ok ? r.data : Promise.reject(new Error(r.error || '写入失败')); });
      },
      read: function (path) {
        return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'read', args: { path: path } }).then(function (r) { return r.ok ? r.data : null; });
      },
      list: function (path) {
        return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'list', args: { path: path } }).then(function (r) { return (r.ok && r.data && r.data.entries) ? r.data.entries : []; });
      },
      del: function (path) {
        return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'del', args: { path: path } }).then(function (r) { return r.ok; });
      },
      mkdir: function (path) {
        return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'mkdir', args: { path: path } }).then(function (r) { return r.ok; });
      },
      exists: function (path) {
        return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'exists', args: { path: path } }).then(function (r) { return !!(r.ok && r.data && r.data.exists); });
      },
      url: function (path) {
        return bridgeRequest('FS_REQUEST', 'FS_RESULT', { op: 'url', args: { path: path } }).then(function (r) { return (r.ok && r.data) ? r.data.url : null; });
      }
    };
    window.__system.clipboard = {
      write: function (payload) {
        return bridgeRequest('CLIPBOARD_WRITE', 'CLIPBOARD_RESULT', { payload: payload }, 3000).then(function (r) { return !!r.ok; });
      },
      read: function () {
        return bridgeRequest('CLIPBOARD_READ', 'CLIPBOARD_RESULT', {}, 3000).then(function (r) { return r.payload || null; });
      }
    };
    try { window.dispatchEvent(new Event('__system-ready')); } catch (err) {}
  }

  // ---------- 桌面 → 包应用：主题 / 壁纸 / 字体 / 配色 同步（语义同 main.js 注入版） ----------
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d) return;
    if (!document.documentElement || !document.body) return;

    if (d.type === 'set-theme-hue' && typeof d.hue === 'number') {
      document.documentElement.style.setProperty('--md-h', d.hue);
      document.documentElement.style.setProperty('--h', d.hue);
    }
    if (d.type === 'set-palette' && d.palette) {
      var p = d.palette;
      if (p.hue) {
        document.documentElement.style.setProperty('--md-h', p.hue);
        document.documentElement.style.setProperty('--h', p.hue);
      }
      if (p.secondaryHue) document.documentElement.style.setProperty('--md-secondary-hue', p.secondaryHue);
    }
    if (d.type === 'set-wallpaper' && d.url) {
      var targets = document.querySelectorAll('[data-wallpaper-target]');
      for (var i = 0; i < targets.length; i++) {
        targets[i].style.backgroundImage = 'url(' + d.url + ')';
        if (targets[i].classList) targets[i].classList.add('has-wallpaper');
      }
      if (!targets.length) {
        document.body.style.backgroundImage = 'url(' + d.url + ')';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
      }
    }
    if (d.type === 'set-font' && d.url && d.name) {
      injectFont('ios-desktop-injected-font', d);
    }
    if (d.type === 'set-app-font' && d.url && d.name) {
      injectFont('app-local-font', d);
    }
  });

  function injectFont(styleId, d) {
    var existing = document.getElementById(styleId);
    if (existing) existing.remove();
    var s = document.createElement('style');
    s.id = styleId;
    s.textContent = "@font-face{font-family:'" + d.name + "';src:url('" + d.url + "') format('woff2'),url('" + d.url + "') format('woff'),url('" + d.url + "') format('truetype');font-display:swap;} body,input,textarea,select,button,p,h1,h2,h3,h4,h5,h6{font-family:'" + d.name + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', 'PingFang SC', sans-serif !important;}";
    document.head.appendChild(s);
  }

  // ---------- 手势穿透（底部 68px / 左右边缘 36px；与 main.js 注入版同构） ----------
  var isTrackingBottom = false;
  var startX = 0, startY = 0;

  function forwardGesture(type, x, y, extra) {
    try {
      if (window.parent && window.parent.__handleIframeGesture) {
        window.parent.__handleIframeGesture(type, x, y, extra);
      } else {
        post({ type: 'iframe-gesture', gestureType: type, x: x, y: y, extra: extra });
      }
    } catch (e) {
      post({ type: 'iframe-gesture', gestureType: type, x: x, y: y, extra: extra });
    }
  }

  window.addEventListener('touchstart', function (e) {
    if (!e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    var screenH = window.innerHeight;
    var screenW = window.innerWidth;
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

  window.addEventListener('touchmove', function (e) {
    if (!isTrackingBottom || !e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    var dy = startY - t.clientY;
    if (dy > 6 && e.cancelable) e.preventDefault();
    forwardGesture('move', t.clientX, t.clientY);
  }, { passive: false });

  window.addEventListener('touchend', function () {
    if (isTrackingBottom) { isTrackingBottom = false; forwardGesture('up'); }
  }, { passive: true });
  window.addEventListener('touchcancel', function () {
    if (isTrackingBottom) { isTrackingBottom = false; forwardGesture('up'); }
  }, { passive: true });

  window.addEventListener('mousedown', function (e) {
    if (e.clientY > window.innerHeight - 68) {
      isTrackingBottom = true;
      startX = e.clientX;
      startY = e.clientY;
      forwardGesture('down', e.clientX, e.clientY, 'BOTTOM');
    }
  });
  window.addEventListener('mousemove', function (e) {
    if (isTrackingBottom) forwardGesture('move', e.clientX, e.clientY);
  });
  window.addEventListener('mouseup', function () {
    if (isTrackingBottom) { isTrackingBottom = false; forwardGesture('up'); }
  });
})();
