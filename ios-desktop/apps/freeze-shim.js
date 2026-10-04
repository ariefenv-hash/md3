/* ==================== freeze-shim.js — 子应用冻结协议运行时 ====================
 * 由桌面 bg-freeze.js 驱动。本文件以 <script src="../freeze-shim.js"> 注入在
 * 每个应用 HTML 的 <head> 最前，先于应用自身脚本执行，从而完整接管：
 *   1. setTimeout / setInterval / requestAnimationFrame —— 全量登记；
 *   2. 收到桌面 APP_FREEZE：清空全部心跳、暂停 CSS 动画/过渡、rAF 断流；
 *      APP_RESUME：重建周期定时器（登记同步），解除 CSS 冻结；
 *   3. 媒体豁免：<audio>/<video> 播放与 MediaRecorder 录音经 APP_MEDIA_STATE
 *      上报桌面 —— 正在出声/录制的应用永远不会被冻结。
 */
(function () {
  if (window.__freezeShimInstalled) return;
  window.__freezeShimInstalled = true;

  var frozen = false;
  var trackedTo = new Map();   // realId -> { fn, args, d }
  var trackedIv = new Map();   // realId -> { fn, args, d }
  var trackedRaf = new Set();

  var _setTimeout = window.setTimeout.bind(window);
  var _setInterval = window.setInterval.bind(window);
  var _clearTimeout = window.clearTimeout.bind(window);
  var _clearInterval = window.clearInterval.bind(window);
  var _raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : null;
  var _caf = window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : null;

  function reportMedia(active) {
    try { window.parent.postMessage({ type: 'APP_MEDIA_STATE', active: !!active }, '*'); } catch (e) {}
  }

  // ---------- 定时器接管 ----------
  window.setTimeout = function (fn, d) {
    if (typeof fn !== 'function') return _setTimeout.apply(null, arguments);
    var args = Array.prototype.slice.call(arguments, 2);
    var realId;
    var wrapped = function () { trackedTo.delete(realId); return fn.apply(null, args); };
    realId = _setTimeout(wrapped, d);
    trackedTo.set(realId, { fn: fn, args: args, d: d || 0 });
    return realId;
  };
  window.clearTimeout = function (id) { trackedTo.delete(id); return _clearTimeout(id); };

  window.setInterval = function (fn, d) {
    if (typeof fn !== 'function') return _setInterval.apply(null, arguments);
    var args = Array.prototype.slice.call(arguments, 2);
    var realId = _setInterval.apply(null, [fn, d].concat(args));
    trackedIv.set(realId, { fn: fn, args: args, d: d || 0 });
    return realId;
  };
  window.clearInterval = function (id) { trackedIv.delete(id); return _clearInterval(id); };

  if (_raf) {
    window.requestAnimationFrame = function (cb) {
      var id;
      var step = function (t) {
        trackedRaf.delete(id);
        if (frozen) return undefined; // 冻结期吞掉回调：rAF 循环链自然断流
        return cb(t);
      };
      id = _raf(step);
      trackedRaf.add(id);
      return id;
    };
    window.cancelAnimationFrame = function (id) { trackedRaf.delete(id); return _caf(id); };
  }

  // ---------- CSS 冻结层 ----------
  function setFreezeStyle(on) {
    var st = document.getElementById('__app-freeze-style');
    if (on && !st && document.head) {
      st = document.createElement('style');
      st.id = '__app-freeze-style';
      st.textContent = '*,*::before,*::after{animation-play-state:paused!important;transition:none!important;}';
      document.head.appendChild(st);
    } else if (!on && st && st.parentNode) {
      st.parentNode.removeChild(st);
    }
  }

  window.__appFreeze = function () {
    if (frozen) return;
    frozen = true;
    trackedTo.forEach(function (_rec, id) { try { _clearTimeout(id); } catch (e) {} });
    trackedIv.forEach(function (_rec, id) { try { _clearInterval(id); } catch (e) {} });
    trackedRaf.forEach(function (id) { try { if (_caf) _caf(id); } catch (e) {} });
    setFreezeStyle(true);
  };

  window.__appResume = function () {
    if (!frozen) return;
    frozen = false;
    setFreezeStyle(false);
    // 重建周期定时器（登记表换绑到新的真实 id）
    var rebuild = function (map, create) {
      var entries = Array.from(map.entries());
      map.clear();
      entries.forEach(function (entry) {
        var rec = entry[1];
        var nid = create(rec);
        map.set(nid, rec);
      });
    };
    rebuild(trackedIv, function (rec) {
      return _setInterval.apply(null, [rec.fn, rec.d].concat(rec.args));
    });
    rebuild(trackedTo, function (rec) {
      var nid;
      var wrapped = function () { trackedTo.delete(nid); return rec.fn.apply(null, rec.args); };
      nid = _setTimeout.apply(null, [wrapped, rec.d].concat(rec.args));
      return nid;
    });
  };

  // ---------- 桌面指令通道 ----------
  window.addEventListener('message', function (e) {
    if (e.source !== window.parent) return;
    var d = e.data;
    if (!d) return;
    if (d.type === 'APP_FREEZE' && window.__appFreeze) window.__appFreeze();
    else if (d.type === 'APP_RESUME' && window.__appResume) window.__appResume();
  });

  // ---------- 媒体豁免上报 ----------
  // 播放中的音频/视频（捕获阶段覆盖 iframe 内全部元素）
  document.addEventListener('play', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'AUDIO' || t.tagName === 'VIDEO')) reportMedia(true);
  }, true);
  document.addEventListener('pause', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'AUDIO' || t.tagName === 'VIDEO')) reportMedia(false);
  }, true);
  document.addEventListener('ended', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'AUDIO' || t.tagName === 'VIDEO')) reportMedia(false);
  }, true);

  // MediaRecorder（录音机等）：start/stop 上报
  try {
    var _MR = window.MediaRecorder;
    if (_MR) {
      function PatchedRecorder(stream, opts) {
        var rec = new _MR(stream, opts);
        rec.addEventListener('start', function () { reportMedia(true); });
        rec.addEventListener('stop', function () { reportMedia(false); });
        rec.addEventListener('error', function () { reportMedia(false); });
        return rec;
      }
      PatchedRecorder.prototype = _MR.prototype;
      PatchedRecorder.isTypeSupported = _MR.isTypeSupported
        ? _MR.isTypeSupported.bind(_MR) : undefined;
      window.MediaRecorder = PatchedRecorder;
    }
  } catch (e) { /* 环境不支持时静默跳过 */ }
})();
