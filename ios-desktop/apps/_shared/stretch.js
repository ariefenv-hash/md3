/* ==================== stretch.js — iframe 应用共享 MD3/AOSP 边缘拉伸引擎（v7.77） ====================
 *
 * 忠实移植自宿主 js/aosp/edge-effect.js（android.widget.EdgeEffect，AOSP main 分支，
 * TYPE_STRETCH / Android 12+ Stretch）与宿主 js/scroll-fx.js 的接管管线，常数逐字一致：
 *   • 拉伸弹簧：NATURAL_FREQUENCY=24.657 · DAMPING_RATIO=0.98（欠阻尼解析解）
 *     · LINEAR_VELOCITY_TAKE_OVER=200 · LINEAR_DISTANCE_TAKE_OVER=8px（近终点线性接管）
 *   • 拉伸强度：LINEAR_STRETCH_INTENSITY=EXP_STRETCH_INTENSITY=0.016
 *     · SCROLL_DIST_AFFECTED_BY_EXP_STRETCH=0.33（dampStretchVector 逐字）
 *   • 撞边吸收：onAbsorb(velocity) × ON_ABSORB_VELOCITY_ADJUSTMENT=13
 *   • AOSP 1:1 语义：拖拽出界期间 STATE_PULL 恒保持（不中途衰减），松手才弹簧回弹；
 *     对侧消耗（getDistance 判定）；OVER_SCROLL_IF_CONTENT_SCROLLS（内容不可滚不给边缘效果）
 * 管线（与宿主 scroll-fx 同款，仅去掉 FastScroller/OverScroller/宿主手势守卫）：
 *   • pointer 管线：pointerdown/move/up，越 slop(8px) 且处于边缘且朝外才 engage
 *   • touch 兜底管线（v7.61 语义）：原生滚动接管后 pointer 流断流，touchmove 以
 *     「触边锚点」（触边后手指极值，反转冻结）计量净外拉，越过死区即 engage，
 *     实现「fling 撞边后同一手势继续外拉」的无缝衔接
 *   • scroll 测速通道：惯性撞边（|v|>900px/s EMA）注入 onAbsorb 吸收脉冲
 *   • prefers-reduced-motion：整引擎禁用（装饰性形变）
 * 与下拉刷新（m3e-pull.js）的协调：挂载下拉刷新的容器带 __m3ePullActive 标记，
 * 本引擎顶缘让位（下拉卡片独占顶缘外拉），底缘与吸收脉冲照常。
 *
 * 零依赖 classic script；两种接入方式：
 *   1) 声明式：<script src="../_shared/stretch.js" data-stretch=".content-area"></script>
 *      （DOM 就绪后自动 attach 全部命中元素；data-stretch 支持逗号分隔多选择器）
 *   2) 编程式：const st = __m3eStretch.attach(el, opts); st.detach();
 */
(function () {
  'use strict';

  /* ---------- AOSP EdgeEffect 常数（js/aosp/edge-effect.js 逐字） ---------- */
  var STATE_IDLE = 0, STATE_PULL = 1, STATE_RECEDE = 3;
  var RECEDE_TIME = 600, PULL_TIME = 167;
  var VELOCITY_THRESHOLD = 0.01;
  var LINEAR_VELOCITY_TAKE_OVER = 200.0;
  var VALUE_THRESHOLD = 0.001;
  var LINEAR_DISTANCE_TAKE_OVER = 8.0;
  var NATURAL_FREQUENCY = 24.657;
  var DAMPING_RATIO = 0.98;
  var ON_ABSORB_VELOCITY_ADJUSTMENT = 13.0;
  var LINEAR_STRETCH_INTENSITY = 0.016;
  var EXP_STRETCH_INTENSITY = 0.016;
  var SCROLL_DIST_AFFECTED_BY_EXP_STRETCH = 0.33;

  /* ---------- 管线常数（宿主 scroll-fx.js 同款） ---------- */
  var TOUCH_SLOP = 8;
  var SCROLL_V_ABSORB = 900;

  function reducedMotion() {
    try {
      return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  }

  function dampStretchVector(normalizedVec) {
    var sign = normalizedVec > 0 ? 1.0 : -1.0;
    var overscroll = Math.abs(normalizedVec);
    var linearIntensity = LINEAR_STRETCH_INTENSITY * overscroll;
    var scalar = Math.E / SCROLL_DIST_AFFECTED_BY_EXP_STRETCH;
    var expIntensity = EXP_STRETCH_INTENSITY * (1 - Math.exp(-overscroll * scalar));
    return sign * (linearIntensity + expIntensity);
  }

  /** EdgeEffect（stretch 型；glow 分支不需要，未移植） */
  function EdgeEffect() {
    this.mDistance = 0;
    this.mVelocity = 0;
    this.mState = STATE_IDLE;
    this.mPullDistance = 0;
    this.mStartTime = 0;
    this.mWidth = 0;
    this.mHeight = 1;
    this.mDisplacement = 0.5;
  }
  EdgeEffect.prototype.setSize = function (w, h) { this.mWidth = w; this.mHeight = Math.max(1, h); };
  EdgeEffect.prototype.isFinished = function () { return this.mState === STATE_IDLE; };
  EdgeEffect.prototype.finish = function () { this.mState = STATE_IDLE; this.mDistance = 0; this.mVelocity = 0; };
  EdgeEffect.prototype.getDistance = function () { return this.mDistance; };
  EdgeEffect.prototype.getStretch = function () {
    return dampStretchVector(Math.max(-1.0, Math.min(1.0, this.mDistance)));
  };
  EdgeEffect.prototype.onPullDistance = function (deltaDistance, displacement) {
    var finalDistance = Math.max(0.0, deltaDistance + this.mDistance);
    var delta = finalDistance - this.mDistance;
    if (delta === 0.0 && this.mDistance === 0.0) return 0.0;
    this.mDisplacement = displacement;
    if (this.mState !== STATE_PULL) {
      // Restore the mPullDistance to the fraction it is currently showing
      this.mPullDistance = this.mDistance;
    }
    this.mState = STATE_PULL;
    this.mStartTime = Date.now();
    this.mPullDistance += delta;
    this.mPullDistance = Math.min(1.0, this.mPullDistance);
    this.mDistance = Math.max(0.0, this.mPullDistance);
    this.mVelocity = 0;
    if (this.mDistance === 0) this.mState = STATE_IDLE;
    return delta;
  };
  EdgeEffect.prototype.onRelease = function () {
    this.mPullDistance = 0;
    if (this.mState !== STATE_PULL) return;
    this.mState = STATE_RECEDE;
    this.mVelocity = 0.0;
    this.mStartTime = Date.now();
  };
  EdgeEffect.prototype.onAbsorb = function (velocity) {
    this.mState = STATE_RECEDE;
    this.mVelocity = velocity * ON_ABSORB_VELOCITY_ADJUSTMENT;
    this.mStartTime = Date.now();
  };
  /** AOSP updateSpring() 逐字（欠阻尼解析解 + 近终点线性接管） */
  EdgeEffect.prototype.updateSpring = function () {
    var time = Date.now();
    var deltaT = (time - this.mStartTime) / 1000.0;
    if (deltaT < 0.001) return;
    this.mStartTime = time;
    if (Math.abs(this.mVelocity) <= LINEAR_VELOCITY_TAKE_OVER
        && Math.abs(this.mDistance * this.mHeight) < LINEAR_DISTANCE_TAKE_OVER
        && Math.sign(this.mVelocity) === -Math.sign(this.mDistance)) {
      this.mVelocity = Math.sign(this.mVelocity) * LINEAR_VELOCITY_TAKE_OVER;
      var targetDistance = this.mDistance + (this.mVelocity * deltaT / this.mHeight);
      if (Math.sign(targetDistance) !== Math.sign(this.mDistance)) {
        this.mDistance = 0; this.mVelocity = 0;
      } else {
        this.mDistance = targetDistance;
      }
      return;
    }
    var mDampedFreq = NATURAL_FREQUENCY * Math.sqrt(1 - DAMPING_RATIO * DAMPING_RATIO);
    var cosCoeff = this.mDistance * this.mHeight;
    var sinCoeff = (1 / mDampedFreq) * (DAMPING_RATIO * NATURAL_FREQUENCY
      * this.mDistance * this.mHeight + this.mVelocity);
    var distance = Math.exp(-DAMPING_RATIO * NATURAL_FREQUENCY * deltaT)
      * (cosCoeff * Math.cos(mDampedFreq * deltaT) + sinCoeff * Math.sin(mDampedFreq * deltaT));
    var velocity = distance * (-NATURAL_FREQUENCY) * DAMPING_RATIO
      + Math.exp(-DAMPING_RATIO * NATURAL_FREQUENCY * deltaT)
      * (-mDampedFreq * cosCoeff * Math.sin(mDampedFreq * deltaT)
        + mDampedFreq * sinCoeff * Math.cos(mDampedFreq * deltaT));
    this.mDistance = distance / this.mHeight;
    this.mVelocity = velocity;
    if (this.mDistance > 1) { this.mDistance = 1; this.mVelocity = 0; }
    var displacement = this.mDistance * this.mHeight;
    if (displacement < 0 || (Math.abs(this.mVelocity) < VELOCITY_THRESHOLD && displacement < VALUE_THRESHOLD)) {
      this.mDistance = 0; this.mVelocity = 0;
    }
  };
  EdgeEffect.prototype.draw = function () {
    if (this.mState === STATE_RECEDE) this.updateSpring();
    var oneLastFrame = false;
    if (this.mState === STATE_RECEDE && this.mDistance === 0 && this.mVelocity === 0) {
      this.mState = STATE_IDLE;
      oneLastFrame = true;
    }
    return this.mState !== STATE_IDLE || oneLastFrame;
  };

  /** 单容器接管（与宿主 ScrollFx 同构；去 FastScroller/OverScroller/宿主守卫） */
  function attach(el, opts) {
    if (!el || el.__m3eStretch) return el.__m3eStretch || null;
    opts = opts || {};
    if (reducedMotion()) { el.__m3eStretch = { detach: function () {}, el: el }; return el.__m3eStretch; }

    var edgeTop = new EdgeEffect();
    var edgeBottom = new EdgeEffect();
    var rafPending = false;

    var pointerId = null, startY = 0, lastY = 0, dragging = false, pullEngaged = false;
    var velSamples = [];
    // touch 兜底管线状态
    var touchId = null, tAnchorY = null, tEngaged = false, tLastY = 0;
    // scroll 测速
    var lastScrollTop = el.scrollTop, lastScrollT = 0, scrollV = 0, scrollIdleTimer = 0;

    try { el.style.overscrollBehaviorY = 'contain'; } catch (e) {}

    function rangeOf() { return Math.max(0, el.scrollHeight - el.clientHeight); }
    function pullAllowed() { return opts.pull !== false; }
    function topPullAllowed() {
      // 下拉刷新独占顶缘（__m3ePullActive）：顶缘外拉让位，底缘/吸收照常
      return pullAllowed() && !el.__m3ePullActive;
    }

    function render() {
      var dT = edgeTop.mDistance || 0, dB = edgeBottom.mDistance || 0;
      var sT = dT > 0 ? 1 + edgeTop.getStretch() : 1;
      var sB = dB > 0 ? 1 + edgeBottom.getStretch() : 1;
      if (sT > 1.0005 && sT >= sB) {
        el.style.transformOrigin = '0 0';
        el.style.transform = 'scale(1, ' + sT.toFixed(4) + ')';
      } else if (sB > 1.0005) {
        el.style.transformOrigin = '0 100%';
        el.style.transform = 'scale(1, ' + sB.toFixed(4) + ')';
      }
    }
    function renderClear() {
      if (el.style.transform && el.style.transform.indexOf('scale(1,') === 0) {
        el.style.transform = '';
        el.style.transformOrigin = '';
      }
    }
    function frame() {
      rafPending = false;
      var active = false;
      if (!edgeTop.isFinished()) { edgeTop.draw(); active = true; }
      if (!edgeBottom.isFinished()) { edgeBottom.draw(); active = true; }
      render();
      if (active) ensureRaf();
      else renderClear();
    }
    function ensureRaf() {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(frame);
    }

    function velPush(y, t) {
      velSamples.push({ y: y, t: t });
      var cutoff = t - 200;
      while (velSamples.length > 2 && velSamples[0].t < cutoff) velSamples.shift();
    }
    function velEstimate() {
      if (velSamples.length < 2) return 0;
      var a = velSamples[0], b = velSamples[velSamples.length - 1];
      var dt = Math.max(1, b.t - a.t);
      return (a.y - b.y) / dt * 1000; // px/s，正=内容前滚方向
    }

    // ---- pointer 管线 ----
    function onPointerDown(e) {
      if (pointerId !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointerId = e.pointerId;
      startY = lastY = e.clientY;
      dragging = false; pullEngaged = false;
      velSamples = [{ y: e.clientY, t: e.timeStamp }];
      if (!edgeTop.isFinished()) edgeTop.onPullDistance(0, 0.5);
      if (!edgeBottom.isFinished()) edgeBottom.onPullDistance(0, 0.5);
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp, { passive: true });
      window.addEventListener('pointercancel', onPointerCancel, { passive: true });
    }
    function onPointerMove(e) {
      if (e.pointerId !== pointerId) return;
      var y = e.clientY;
      var dy = lastY - y; // 手指上移 → 内容前滚为正
      lastY = y;
      velPush(y, e.timeStamp);
      if (!dragging) {
        if (Math.abs(y - startY) <= TOUCH_SLOP) return;
        dragging = true;
      }
      var range = rangeOf();
      var atTop = el.scrollTop <= 0;
      var atBottom = el.scrollTop >= range - 0.5;
      if (!pullEngaged) {
        if ((atTop && dy < 0 && topPullAllowed()) || (atBottom && dy > 0)) {
          if (range > 0) { pullEngaged = true; }
        }
        if (!pullEngaged) return;
      }
      if (dy === 0) return;
      var h = Math.max(1, el.clientHeight);
      // 对侧先消拉伸（API 31 对侧消耗）
      if (dy < 0 && edgeBottom.getDistance() !== 0) { edgeBottom.onPullDistance(dy / h, 0.5); ensureRaf(); return; }
      if (dy > 0 && edgeTop.getDistance() !== 0) { edgeTop.onPullDistance(-dy / h, 0.5); ensureRaf(); return; }
      var displacedTop = el.scrollTop <= 0 && dy < 0;
      var displacedBottom = el.scrollTop >= range - 0.5 && dy > 0;
      if (displacedTop) {
        edgeTop.onPullDistance(-dy / h, 0.5);
        if (!edgeBottom.isFinished()) edgeBottom.onRelease();
      } else if (displacedBottom) {
        edgeBottom.onPullDistance(dy / h, 0.5);
        if (!edgeTop.isFinished()) edgeTop.onRelease();
      }
      ensureRaf();
    }
    function finishPointer() {
      pointerId = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      if (pullEngaged) {
        pullEngaged = false; dragging = false;
        edgeTop.onRelease(); edgeBottom.onRelease();
        ensureRaf();
        return;
      }
      dragging = false;
    }
    function onPointerUp(e) { if (e.pointerId === pointerId) finishPointer(); }
    function onPointerCancel(e) { if (e.pointerId === pointerId) finishPointer(); }

    // ---- touch 兜底管线（v7.61 无缝衔接语义） ----
    function onTouchStart(e) {
      if (touchId !== null) return;
      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      touchId = t.identifier;
      tLastY = t.clientY; tAnchorY = null; tEngaged = false;
    }
    function onTouchMove(e) {
      if (touchId === null || pointerId !== null) return;
      var t = null, ch = e.changedTouches || [];
      for (var i = 0; i < ch.length; i++) if (ch[i].identifier === touchId) { t = ch[i]; break; }
      if (!t) return;
      var y = t.clientY;
      var range = rangeOf();
      var atTop = el.scrollTop <= 0.5;
      var atBottom = range > 0 && el.scrollTop >= range - 0.5;
      if (tEngaged) {
        var dy = tLastY - y;
        tLastY = y;
        if (dy === 0) return;
        var h = Math.max(1, el.clientHeight);
        if (dy < 0 && (atTop || edgeTop.getDistance() > 0) && topPullAllowed()) {
          edgeTop.onPullDistance(-dy / h, 0.5);
          if (!edgeBottom.isFinished()) edgeBottom.onRelease();
          ensureRaf();
          return;
        }
        if (dy > 0 && (atBottom || edgeBottom.getDistance() > 0)) {
          edgeBottom.onPullDistance(dy / h, 0.5);
          if (!edgeTop.isFinished()) edgeTop.onRelease();
          ensureRaf();
          return;
        }
        if (!atTop && !atBottom) {
          tEngaged = false; tAnchorY = null;
          if (!edgeTop.isFinished()) edgeTop.onRelease();
          if (!edgeBottom.isFinished()) edgeBottom.onRelease();
          ensureRaf();
        }
        return;
      }
      if (!atTop && !atBottom) { tAnchorY = null; tLastY = y; return; }
      if (tAnchorY === null) tAnchorY = y;
      tAnchorY = atTop ? Math.min(tAnchorY, y) : Math.max(tAnchorY, y);
      tLastY = y;
      var outward = atTop ? (y - tAnchorY) : (tAnchorY - y);
      var outwardAllowed = atTop ? topPullAllowed() : true;
      if (outward > TOUCH_SLOP && outwardAllowed && range > 0) {
        tEngaged = true;
        tLastY = y;
      }
    }
    function onTouchEnd(e) {
      if (touchId === null) return;
      var ch = e.changedTouches || [];
      for (var i = 0; i < ch.length; i++) {
        if (ch[i].identifier === touchId) { touchId = null; break; }
      }
      if (touchId !== null) return;
      if (tEngaged) {
        tEngaged = false; tAnchorY = null;
        edgeTop.onRelease(); edgeBottom.onRelease();
        ensureRaf();
      } else {
        tAnchorY = null;
      }
    }

    // ---- scroll 测速 → 惯性撞边吸收 ----
    function onScroll() {
      var now = Date.now();
      if (lastScrollT) {
        var dt = Math.max(1, now - lastScrollT);
        var v = (el.scrollTop - lastScrollTop) / dt * 1000;
        scrollV = scrollV * 0.7 + v * 0.3;
      }
      lastScrollTop = el.scrollTop;
      lastScrollT = now;
      clearTimeout(scrollIdleTimer);
      scrollIdleTimer = setTimeout(function () { scrollV = 0; lastScrollT = 0; }, 120);
      var range = rangeOf();
      if ((el.scrollTop <= 0 && scrollV < -SCROLL_V_ABSORB) || (el.scrollTop >= range - 0.5 && scrollV > SCROLL_V_ABSORB)) {
        var edge = el.scrollTop <= 0 ? edgeTop : edgeBottom;
        if (edge.isFinished()) {
          edge.onAbsorb(Math.min(Math.abs(scrollV), 4000) | 0);
          ensureRaf();
        }
      }
    }

    function layout() {
      var w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      edgeTop.setSize(w, h);
      edgeBottom.setSize(w, h);
    }
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(layout);
      ro.observe(el);
    }
    layout();

    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    var inst = {
      el: el,
      detach: function () {
        el.removeEventListener('scroll', onScroll);
        el.removeEventListener('pointerdown', onPointerDown);
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchcancel', onTouchEnd);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
        clearTimeout(scrollIdleTimer);
        if (ro) ro.disconnect();
        renderClear();
        el.__m3eStretch = null;
      },
      /** 编程式吸收脉冲（供应用在数据刷新完成等时机调用） */
      absorb: function (edge, velocity) {
        (edge === 'bottom' ? edgeBottom : edgeTop).onAbsorb(velocity || 1200);
        ensureRaf();
      },
    };
    el.__m3eStretch = inst;
    return inst;
  }

  /** data-stretch 声明式自动接线（DOM 就绪后扫描本 script 标签的选择器） */
  function autoAttachFromScript() {
    var scripts = document.querySelectorAll('script[data-stretch]');
    for (var i = 0; i < scripts.length; i++) {
      var sel = scripts[i].getAttribute('data-stretch');
      if (!sel) continue;
      var list = sel.split(',');
      for (var j = 0; j < list.length; j++) {
        var s = list[j].trim();
        if (!s) continue;
        try { document.querySelectorAll(s).forEach(function (el) { attach(el); }); } catch (e) {}
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoAttachFromScript);
  } else {
    autoAttachFromScript();
  }

  window.__m3eStretch = { attach: attach, auto: autoAttachFromScript, EdgeEffect: EdgeEffect };
})();
