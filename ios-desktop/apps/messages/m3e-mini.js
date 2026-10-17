/* ==================== m3e-mini.js — M3E LoadingIndicator 独立内嵌引擎（v7.73） ====================
 *
 * 场景：翻译等 iframe 沙箱应用无法引用宿主 m3e.js（ES 模块 + 宿主依赖链），
 * 此文件为零依赖 classic script 版，可在任意 iframe 内 <script src> 引入。
 *
 * 与宿主 ios-desktop/js/m3e.js 保持数学同构（改一处必须同步另一处）：
 *   • 七形循环序列 M3E_LOADER_SHAPES（{ n 瓣频, a 振幅, s 纵向压扁 }）
 *   • 形变半径 r(θ) = R·(1 + a(t)·cos(n(t)·θ))·s(t)，n 瓣频整数化插值防接缝撕裂
 *   • v7.74：单段 650ms（官方 MorphInterval）+ spring(0.6,200) 形变进度
 *     + 段序累计 90° + 360°/4666ms 全局线性顺时针旋转（与宿主同构）
 *   • 颜色跟随 currentColor（每 64 帧回读一次）
 *   • document.hidden 暂停、元素脱文档自回收、prefers-reduced-motion 静帧
 *
 * 暴露 window.__m3eMini = { mount, stop, radius, shapes }
 */
(function () {
  'use strict';

  // 七形序列（与宿主 m3e.js 逐字一致）
  var SHAPES = [
    { n: 8, a: 0.12, s: 1.0 },   // sunny
    { n: 4, a: 0.22, s: 1.0 },   // clover-4
    { n: 12, a: 0.08, s: 1.0 },  // softburst
    { n: 6, a: 0.16, s: 0.96 },  // cookie-6
    { n: 1, a: 0.30, s: 0.80 },  // pill（椭圆偏置）
    { n: 8, a: 0.22, s: 1.0 },   // clover-8
    { n: 5, a: 0.18, s: 1.0 },   // burst-5
  ];
  var SEGMENT_MS = 650;      // v7.74 官方 MorphIntervalMillis
  var GLOBAL_ROTATION_MS = 4666; // v7.74 官方 GlobalRotationDurationMillis

  /** 形变半径纯函数（与宿主 m3eLoaderRadius 同构，供测试与描形共用） */
  function radius(theta, shapeA, shapeB, t, R) {
    var k = Math.max(0, Math.min(1, t));
    var n = Math.round(shapeA.n + (shapeB.n - shapeA.n) * k);
    var a = shapeA.a + (shapeB.a - shapeA.a) * k;
    var s = shapeA.s + (shapeB.s - shapeA.s) * k;
    return R * (1 + a * Math.cos(n * theta)) * s;
  }

  // v7.74 官方 spring(0.6, 200) 形变进度（与宿主 m3eSpringProgress 同构）
  var SPRING_W = Math.sqrt(200);
  var SPRING_WD = SPRING_W * Math.sqrt(1 - 0.6 * 0.6);
  var SPRING_T_HOLD = Math.log(1.25 / 0.1) / (0.6 * SPRING_W);
  function springProgress(tau) {
    if (tau >= SPRING_T_HOLD) return 1;
    return 1 - Math.exp(-0.6 * SPRING_W * tau)
      * (Math.cos(SPRING_WD * tau) + 0.6 * SPRING_W / SPRING_WD * Math.sin(SPRING_WD * tau));
  }
  function segmentMorphT(segT) {
    return springProgress(Math.max(0, segT));
  }

  function reducedMotion() {
    try {
      return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  }

  /** 画一帧（静帧复用）：A/B 形 + 形变进度 + 旋转角 */
  function paint(ctx, size, dpr, shapeA, shapeB, mt, rot, color) {
    var R = (size / 2) * 0.79;
    ctx.clearRect(0, 0, size, size); // 注意：调用方已按 dpr scale
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(rot);
    ctx.beginPath();
    var STEPS = 72;
    for (var i = 0; i <= STEPS; i++) {
      var th = (i / STEPS) * Math.PI * 2;
      var r = radius(th, shapeA, shapeB, mt, R);
      var x = Math.cos(th) * r;
      var y = Math.sin(th) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function readColor(el) {
    try { return getComputedStyle(el).color || 'currentColor'; } catch (e) { return 'currentColor'; }
  }

  /**
   * 挂载一枚七形循环指示器到容器（容器内已有实例则复用）。
   * @param {{size?:number}} [opts]
   * @returns {{el:Element, stop:Function}|null}
   */
  function mount(container, opts) {
    if (!container || typeof container.appendChild !== 'function') return null;
    var prev = container.querySelector(':scope > canvas');
    if (prev && prev.__m3eMini) return prev.__m3eMini;

    var size = (opts && opts.size) || 14;
    var el = document.createElement('canvas');
    var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    el.width = Math.round(size * dpr);
    el.height = Math.round(size * dpr);
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.display = 'block';
    container.appendChild(el);
    var ctx = el.getContext && el.getContext('2d');
    if (!ctx) {
      return {
        el: el,
        stop: function () { if (el.parentNode) el.parentNode.removeChild(el); },
      };
    }

    var inst = { el: el, stop: stop };
    el.__m3eMini = inst;

    var raf = 0;
    var stopped = false;
    var color = readColor(el);
    var age = 0;
    var t0 = (typeof performance !== 'undefined' ? performance.now() : 0); // v7.74 实例自有时钟原点
    var lastRender = t0;
    var watchdog = 0;

    if (reducedMotion()) {
      // 静帧：第一形（含 dpr 处理，与循环帧一致的坐标系）
      ctx.save();
      ctx.scale(dpr, dpr);
      paint(ctx, size, dpr, SHAPES[0], SHAPES[0], 0, 0, readColor(el));
      ctx.restore();
      return inst;
    }

    function drawFrame(now) {
      if ((age++ & 63) === 0) color = readColor(el);
      // v7.74 官方 dt 时钟（钳 0 防负时间）
      var dt = Math.max(0, now - t0);
      var seg = Math.floor(dt / SEGMENT_MS);
      var segT = (dt % SEGMENT_MS) / SEGMENT_MS;
      var N = SHAPES.length;
      var shapeA = SHAPES[((seg % N) + N) % N];
      var shapeB = SHAPES[(((seg + 1) % N) + N) % N];
      var mt = segmentMorphT(segT);
      // v7.74 官方旋转：prog×90° + 段序累计 90° + 360°/4666ms 全局线性顺时针
      var rotDeg = mt * 90
        + ((((seg % 4) + 4) % 4) + 1) * 90
        + (dt / GLOBAL_ROTATION_MS * 360) % 360;
      var rot = rotDeg * Math.PI / 180;
      ctx.save();
      ctx.scale(dpr, dpr);
      paint(ctx, size, dpr, shapeA, shapeB, mt, rot, color);
      ctx.restore();
    }

    function frame(now) {
      if (stopped) return;
      if (!el.isConnected) { stopped = true; teardownWatchdog(); return; } // 脱文档自回收
      if (typeof document !== 'undefined' && document.hidden) {
        raf = requestAnimationFrame(frame); // 隐藏期暂停积分
        return;
      }
      drawFrame(now);
      lastRender = now;
      raf = requestAnimationFrame(frame);
    }

    // v7.74 rAF 看门狗（与宿主 m3e.js 同构）：rAF 停滞 >250ms 时 100ms 定时器补帧
    function teardownWatchdog() { if (watchdog) { clearInterval(watchdog); watchdog = 0; } }
    watchdog = setInterval(function () {
      if (stopped || !el.isConnected) { stopped = true; teardownWatchdog(); return; }
      if (typeof document !== 'undefined' && document.hidden) return;
      var now = (typeof performance !== 'undefined' ? performance.now() : 0);
      if (now - lastRender > 250) { drawFrame(now); lastRender = now; }
    }, 100);

    // v7.74 同步首帧：挂载即呈现，不等首个 rAF
    drawFrame(t0);
    raf = requestAnimationFrame(frame);

    function stop() {
      stopped = true;
      teardownWatchdog();
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    return inst;
  }

  window.__m3eMini = { mount: mount, stop: function (inst) { if (inst && inst.stop) inst.stop(); }, radius: radius, shapes: SHAPES };
})();
