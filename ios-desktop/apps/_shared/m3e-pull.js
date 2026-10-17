/* ==================== m3e-pull.js — M3E 下拉刷新加载器（v7.77） ====================
 *
 * 下拉样式设计取自用户提供的 MD2 下拉刷新参考件（仅学习其「下拉样式」）：
 *   • 指示器 = 顶部中央的圆形卡片，初始藏于标题栏上方
 *     （translateY(hiddenY) scale(0)），随下拉进度渐显
 *   • 位置跟随 = 指数阻尼 lerp：posY += (targetY - posY) × (1 - e^(-lerpSpeed·dt))
 *     （PULLING 26 / DISMISSING 14 / 其余 16，参考件同款）
 *   • 行程曲线 = 阈值内线性、超出部分 (1 - e^(-overDrag/90)) 指数衰减（越拉越韧）
 *   • 松手判定 = 超阈值 → 停靠 restingY 旋转加载，onRefresh 完成后平滑向上收回；
 *     未超阈值 → 原路弹回隐藏
 *   • 支持触摸 / 鼠标拖拽 / 触控板 wheel 三通道；scrollTop≤0 才拦截
 * 参考件中的加速、变色、加载圈弧线、冲击波等游戏化元素一律不采用。
 *
 * v7.77 圆形容器颜色语义修正（用户裁决：按参考件 2.html 样式随主题动态调整）：
 *   • 圆形容器 = ContainedLoadingIndicator 语义的 primary-container 角色
 *     （不再用 surface/白底盘），指示器前景 = on-primary-container；
 *   • 颜色均为「主题动态」——documentElement 的 class/style/data-theme 变更
 *     时实时重读（与参考件 readColors() 同语义），深浅色/动态色相切换即生效；
 *   • 保留 MD2 下拉样式的高程阴影（分离度），去掉硬边框（参考件圆形容器无描边）。
 *
 * 指示器本体 = 忠实 M3E LoadingIndicator（__m3eMini 引擎，参考件 2.html 1:1）。
 *
 * 零依赖 classic script；用法：
 *   const pull = __m3ePull.attach(scrollEl, { onRefresh: () => doRefresh() });
 *   pull.detach(); // 卸载
 */
(function () {
  'use strict';

  var CFG = {
    TRIGGER_THRESHOLD: 80,  // 触发刷新的下拉距离（px）
    RESTING_Y: 48,          // 停靠位（标题栏下方 px）
    HIDDEN_Y: -52,          // 隐藏位（藏进标题栏上方）
    MAX_TRAVEL: 105,        // 最大视觉行程（超出指数阻尼）
    PULL_LERP: 26.0,        // 下拖跟随速度
    DISMISS_LERP: 14.0,     // 收回速度
    DOCK_LERP: 16.0,        // 停靠速度
    WHEEL_DEBOUNCE: 220,    // 触控板累计判定窗口
    MIN_SPIN_MS: 600,       // 最短旋转时长（保证可感知）
  };

  function reducedMotion() {
    try {
      return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  }

  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  /* ---- 主题动态色（v7.77，与 m3e-mini 同语义：属性变更即重读） ---- */
  var themeCbs = [];
  var themeMo = null;
  function onThemeChange(cb) {
    if (themeCbs.indexOf(cb) < 0) themeCbs.push(cb);
    if (themeMo || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    themeMo = new MutationObserver(function () {
      for (var i = 0; i < themeCbs.length; i++) { try { themeCbs[i](); } catch (e) {} }
    });
    themeMo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
  }
  function offThemeChange(cb) {
    var i = themeCbs.indexOf(cb);
    if (i >= 0) themeCbs.splice(i, 1);
  }

  /** 行程曲线（参考件 calculatePullY 同款：线性段 + 指数阻尼段） */
  function calcPullY(deltaY, threshold, restingY, hiddenY, maxTravel) {
    if (deltaY <= 0) return hiddenY;
    var progress = Math.min(1, deltaY / threshold);
    var linearY = hiddenY + progress * (restingY - hiddenY);
    if (deltaY <= threshold) return linearY;
    var overDrag = deltaY - threshold;
    var extra = (maxTravel - restingY) * (1 - Math.exp(-overDrag / 90));
    return restingY + extra;
  }

  /**
   * 绑定一个滚动容器的下拉刷新。
   * @param {Element} viewport 滚动容器（overflow-y:auto）
   * @param {{ onRefresh?: Function, threshold?: number, restingY?: number, top?: number,
   *          loaderSize?: number, hint?: string }} opts
   * @returns {{ detach: Function, trigger: Function } | null}
   */
  function attach(viewport, opts) {
    if (!viewport || !window.__m3eMini) return null;
    opts = opts || {};
    var threshold = opts.threshold || CFG.TRIGGER_THRESHOLD;
    var restingY = (opts.restingY !== undefined) ? opts.restingY : CFG.RESTING_Y;
    var hiddenY = -(restingY + 4);
    var maxTravel = (opts.maxTravel !== undefined) ? opts.maxTravel : CFG.MAX_TRAVEL;

    // ---- 指示器 DOM（顶部中央圆形卡片 + 忠实 M3E 指示器） ----
    // v7.77：圆形容器 = primary-container 角色（参考件 ContainedLoadingIndicator 语义，
    // 随主题动态重读），保留 MD2 下拉样式的高程阴影，无描边
    var holder = document.createElement('div');
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:fixed;left:50%;top:' + (opts.top || 0) + 'px;' +
      'transform:translate3d(-50%,' + hiddenY + 'px,0) scale(0);z-index:1200;display:flex;' +
      'align-items:center;justify-content:center;pointer-events:none;opacity:0;' +
      'will-change:transform,opacity;';
    var card = document.createElement('div');
    card.style.cssText = 'width:42px;height:42px;border-radius:50%;display:flex;align-items:center;' +
      'justify-content:center;background:' + cssVar('--md-primary-container', '#EADDFF') + ';' +
      'box-shadow:0 3px 5px -1px rgba(0,0,0,.2),0 6px 10px 0 rgba(0,0,0,.14),0 1px 18px 0 rgba(0,0,0,.12);';
    var slot = document.createElement('div');
    slot.style.cssText = 'width:28px;height:28px;';
    card.appendChild(slot);
    holder.appendChild(card);
    (document.body || document.documentElement).appendChild(holder);
    // 指示器前景 = on-primary-container（contained 语义；颜色随主题实时重读）
    var loaderInst = window.__m3eMini.mount(slot, { size: 28, fgVar: '--md-on-primary-container' });
    // 主题变更 → 圆形容器实时重读（与参考件 readColors 同步）
    var rethemeCard = function () {
      card.style.background = cssVar('--md-primary-container', '#EADDFF');
    };
    onThemeChange(rethemeCard);

    var st = {
      phase: 'IDLE',        // IDLE | PULLING | REFRESHING | DISMISSING
      posY: hiddenY,
      targetY: hiddenY,
      scale: 0,
      interacting: false,
      startY: 0,
      lastY: 0,
      intercepting: false,
      wheelAccum: 0,
      wheelTimer: 0,
      dismissTimer: 0,
      raf: 0,
      lastFrame: 0,
      busy: false,          // onRefresh 进行中（防重复触发）
    };

    function applyTransform() {
      holder.style.transform = 'translate3d(-50%,' + st.posY.toFixed(2) + 'px,0) scale(' + st.scale.toFixed(3) + ')';
    }
    function setOpacity(o) { holder.style.opacity = String(o); }

    function loop(now) {
      if (!st.raf) return;
      var dt = Math.min(0.1, Math.max(0.001, (now - st.lastFrame) / 1000));
      st.lastFrame = now;
      var lerp = st.phase === 'PULLING' ? CFG.PULL_LERP : (st.phase === 'DISMISSING' ? CFG.DISMISS_LERP : CFG.DOCK_LERP);
      st.posY += (st.targetY - st.posY) * (1 - Math.exp(-lerp * dt));
      applyTransform();
      if (st.phase === 'IDLE' && Math.abs(st.posY - hiddenY) < 0.5 && st.scale < 0.01) {
        st.raf = 0; // 完全归位：停循环（空闲零开销）
        setOpacity(0);
        applyTransform();
        return;
      }
      st.raf = requestAnimationFrame(loop);
    }
    function ensureLoop() {
      if (!st.raf) {
        st.lastFrame = (typeof performance !== 'undefined' ? performance.now() : 0);
        st.raf = requestAnimationFrame(loop);
      }
    }

    function onGestureStart(clientY) {
      st.interacting = true;
      st.startY = clientY;
      st.lastY = clientY;
      st.intercepting = false;
      if (st.phase !== 'IDLE' && st.phase !== 'PULLING') clearTimeout(st.dismissTimer);
    }

    function onGestureMove(clientY, preventDefault) {
      if (!st.interacting || st.busy) return;
      st.lastY = clientY;
      var rawDeltaY = clientY - st.startY;
      if ((viewport.scrollTop || 0) <= 0 && rawDeltaY > 0 &&
          (st.phase === 'IDLE' || st.phase === 'PULLING' || st.phase === 'DISMISSING')) {
        st.intercepting = true;
        if (preventDefault) preventDefault();
      }
      if (st.intercepting && !st.busy &&
          (st.phase === 'IDLE' || st.phase === 'PULLING' || st.phase === 'DISMISSING')) {
        st.phase = 'PULLING';
        st.targetY = calcPullY(rawDeltaY, threshold, restingY, hiddenY, maxTravel);
        var progress = Math.min(1, Math.max(0, rawDeltaY / threshold));
        st.scale = Math.min(1, progress * 1.2);
        setOpacity(Math.min(1, progress * 1.5));
        ensureLoop();
      }
    }

    function startRefreshing() {
      if (st.busy) return;
      st.phase = 'REFRESHING';
      st.busy = true;
      st.targetY = restingY;
      st.scale = 1;
      setOpacity(1);
      ensureLoop();
      var result = null;
      try { result = opts.onRefresh && opts.onRefresh(); } catch (e) { result = null; }
      var elapsed = 0;
      var t0 = (typeof performance !== 'undefined' ? performance.now() : 0);
      var done = function () {
        elapsed = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
        var wait = Math.max(0, CFG.MIN_SPIN_MS - elapsed);
        clearTimeout(st.dismissTimer);
        st.dismissTimer = setTimeout(dismiss, wait);
      };
      if (result && typeof result.then === 'function') {
        result.then(done, done);
      } else {
        done();
      }
    }

    function dismiss() {
      st.phase = 'DISMISSING';
      st.busy = false;
      st.targetY = hiddenY;
      st.scale = 0;
      ensureLoop();
      setTimeout(function () {
        if (st.phase === 'DISMISSING') {
          st.phase = 'IDLE';
          setOpacity(0);
        }
      }, 340);
    }

    function onGestureEnd() {
      if (!st.interacting) return;
      st.interacting = false;
      var rawDeltaY = st.lastY - st.startY;
      if (st.phase === 'PULLING') {
        if (rawDeltaY >= threshold) startRefreshing();
        else {
          st.phase = 'DISMISSING';
          st.targetY = hiddenY;
          st.scale = 0;
          ensureLoop();
          setTimeout(function () { if (st.phase === 'DISMISSING') { st.phase = 'IDLE'; setOpacity(0); } }, 300);
        }
      }
      st.intercepting = false;
    }

    // ---- 触摸 ----
    var onTouchStart = function (e) {
      if (e.touches.length === 1) onGestureStart(e.touches[0].clientY);
    };
    var onTouchMove = function (e) {
      if (e.touches.length === 1) {
        onGestureMove(e.touches[0].clientY, function () {
          if (e.cancelable) e.preventDefault();
        });
      }
    };
    var onTouchEnd = function () { onGestureEnd(); };

    // ---- 鼠标拖拽（桌面） ----
    var onMouseDown = function (e) {
      if (e.button !== 0) return;
      onGestureStart(e.clientY);
      var move = function (me) { onGestureMove(me.clientY, null); };
      var up = function () {
        window.removeEventListener('mousemove', move);
        window.removeEventListener('mouseup', up);
        onGestureEnd();
      };
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    };

    // ---- 触控板 / 滚轮（scrollTop=0 且向上滚 = 下拉） ----
    var onWheel = function (e) {
      if ((viewport.scrollTop || 0) > 0) return;
      if (st.phase !== 'IDLE' && st.phase !== 'PULLING') return;
      if (e.deltaY >= 0) return;
      e.preventDefault();
      st.wheelAccum += Math.abs(e.deltaY) * 0.75;
      st.interacting = true;
      clearTimeout(st.wheelTimer);
      st.wheelTimer = setTimeout(function () {
        st.interacting = false;
        if (st.wheelAccum >= threshold) {
          // 直接按进度渐显后触发（wheel 无连续跟手过程）
          st.phase = 'PULLING';
          st.targetY = restingY;
          st.scale = 1;
          setOpacity(1);
          ensureLoop();
          startRefreshing();
        }
        st.wheelAccum = 0;
      }, CFG.WHEEL_DEBOUNCE);
    };

    viewport.addEventListener('touchstart', onTouchStart, { passive: true });
    viewport.addEventListener('touchmove', onTouchMove, { passive: false });
    viewport.addEventListener('touchend', onTouchEnd, { passive: true });
    viewport.addEventListener('touchcancel', onTouchEnd, { passive: true });
    viewport.addEventListener('mousedown', onMouseDown);
    viewport.addEventListener('wheel', onWheel, { passive: false });
    // 阻断浏览器自身 overscroll 效果与滚动链（下拉手势独占顶缘）
    try { viewport.style.overscrollBehaviorY = 'contain'; } catch (e) {}
    // 拉伸引擎协调标记（stretch.js 见顶缘下让位给下拉刷新）
    try { viewport.__m3ePullActive = true; } catch (e) {}

    return {
      detach: function () {
        viewport.removeEventListener('touchstart', onTouchStart);
        viewport.removeEventListener('touchmove', onTouchMove);
        viewport.removeEventListener('touchend', onTouchEnd);
        viewport.removeEventListener('touchcancel', onTouchEnd);
        viewport.removeEventListener('mousedown', onMouseDown);
        viewport.removeEventListener('wheel', onWheel);
        clearTimeout(st.dismissTimer);
        clearTimeout(st.wheelTimer);
        if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
        offThemeChange(rethemeCard);
        try { delete viewport.__m3ePullActive; } catch (e) { viewport.__m3ePullActive = false; }
        if (loaderInst && loaderInst.stop) loaderInst.stop();
        if (holder.parentNode) holder.parentNode.removeChild(holder);
      },
      /** 编程式触发一次刷新（等价于拉满松手） */
      trigger: function () {
        if (st.busy) return;
        st.phase = 'PULLING';
        st.targetY = restingY;
        st.scale = 1;
        setOpacity(1);
        ensureLoop();
        startRefreshing();
      },
    };
  }

  window.__m3ePull = { attach: attach, CFG: CFG };
})();
