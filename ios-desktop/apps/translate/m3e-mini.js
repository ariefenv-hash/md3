/* ==================== m3e-mini.js — M3E LoadingIndicator 独立内嵌引擎（v7.73） ====================
 *
 * 场景：翻译等 iframe 沙箱应用无法引用宿主 m3e.js（ES 模块 + 宿主依赖链），
 * 此文件为零依赖 classic script 版，可在任意 iframe 内 <script src> 引入。
 *
 * 与宿主 ios-desktop/js/m3e.js 保持数学同构（改一处必须同步另一处）：
 *   • 七形循环序列 M3E_LOADER_SHAPES（{ n 瓣频, a 振幅, s 纵向压扁 }）
 *   • 形变半径 r(θ) = R·(1 + a(t)·cos(n(t)·θ))·s(t)，n 瓣频整数化插值防接缝撕裂
 *   • 单段 900ms：前 55% 保持 A 形，后 45% easeOutCubic 完成形变
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
  var SEGMENT_MS = 900;

  /** 形变半径纯函数（与宿主 m3eLoaderRadius 同构，供测试与描形共用） */
  function radius(theta, shapeA, shapeB, t, R) {
    var k = Math.max(0, Math.min(1, t));
    var n = Math.round(shapeA.n + (shapeB.n - shapeA.n) * k);
    var a = shapeA.a + (shapeB.a - shapeA.a) * k;
    var s = shapeA.s + (shapeB.s - shapeA.s) * k;
    return R * (1 + a * Math.cos(n * theta)) * s;
  }

  function easeOutCubic(t) {
    var x = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - x, 3);
  }
  function segmentMorphT(segT) {
    if (segT < 0.55) return 0;
    return easeOutCubic((segT - 0.55) / 0.45);
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

    if (reducedMotion()) {
      // 静帧：第一形（含 dpr 处理，与循环帧一致的坐标系）
      ctx.save();
      ctx.scale(dpr, dpr);
      paint(ctx, size, dpr, SHAPES[0], SHAPES[0], 0, 0, readColor(el));
      ctx.restore();
      return inst;
    }

    function frame(now) {
      if (stopped) return;
      if (!el.isConnected) { stopped = true; return; } // 脱文档自回收
      if (typeof document !== 'undefined' && document.hidden) {
        raf = requestAnimationFrame(frame); // 隐藏期暂停积分
        return;
      }
      if ((age++ & 63) === 0) color = readColor(el);
      var total = SEGMENT_MS * SHAPES.length;
      var t = now % total;
      var seg = Math.floor(t / SEGMENT_MS);
      var segT = (t % SEGMENT_MS) / SEGMENT_MS;
      var shapeA = SHAPES[seg % SHAPES.length];
      var shapeB = SHAPES[(seg + 1) % SHAPES.length];
      var mt = segmentMorphT(segT);
      var rot = (seg / SHAPES.length) * Math.PI * 2 + segT * 0.22;
      ctx.save();
      ctx.scale(dpr, dpr);
      paint(ctx, size, dpr, shapeA, shapeB, mt, rot, color);
      ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function stop() {
      stopped = true;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (el.parentNode) el.parentNode.removeChild(el);
    }
    return inst;
  }

  window.__m3eMini = { mount: mount, stop: function (inst) { if (inst && inst.stop) inst.stop(); }, radius: radius, shapes: SHAPES };
})();
