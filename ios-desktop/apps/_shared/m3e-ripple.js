/* ==================== m3e-ripple.js — MD3 Expressive 涟漪（iframe 应用版，v7.76） ====================
 *
 * 与宿主 js/aosp/expressive-ripple.js（WebGL/AGSL 逐行移植）同源的 AOSP
 * Android 16 Expressive Ripple（RippleShader + RippleAnimationSession）视觉移植，
 * 面向 iframe 子应用改用 Canvas 2D 渲染（避免每应用一个 WebGL 上下文）。
 *
 * 忠实参数（与 aosp/expressive-ripple.js 一致，AOSP 原值）：
 *   · enter: progress 0→0.5，450ms，fast_out_slow_in(0.4,0,0.2,1)
 *   · exit : progress exitStart→1，375ms，LINEAR，delay 自按下起算（computeDelay 同式）
 *   · noise : 7000ms 播完即停，MAX_NOISE_PHASE = 7000/214 ≈ 32.71
 *   · 波心迁移 center = mix(touch, origin, sat(progress×2))（触点 → 视图中心）
 *   · 主波 = 软边实心圆（softCircle blur=1.0，smoothstep 软边）
 *   · 波前环带（softRing，thickness=0.05R）承载 sparkle 闪点：
 *     triangleNoise 逐行移植 × turbulence（三组旋转圆格 0.17/0.2/0.275）
 *   · 淡出节奏：fadeIn 0→0.13 / fadeOutNoise 0.4→0.5 / fadeOutRipple 0.4→1.0
 *   · 配色：浅色=黑 12%（MD3 state layer）/ 深色=白 20%；--ripple-color 可覆盖；
 *     sparkle = 白 90%
 *   · 遮罩 = 宿主元素圆角矩形（RippleDrawable 以 View 边界为涟漪遮罩）
 *   · maxRadius = 半对角线 × 2.3（RippleComponent.getTargetRadius × setRadius）
 *   · prefers-reduced-motion / 2D 上下文不可用：静默降级（:active 压暗仍在）
 *
 * 零依赖 classic script。用法：
 *   <script src="../_shared/m3e-ripple.js"></script>
 *   M3ERipple.init();                       // 默认选择器覆盖全部按钮类
 *   M3ERipple.init({ selector: '.my-btn' }); // 自定义
 */
(function () {
  'use strict';

  /* ---- AOSP 原值常量 ---- */
  var ENTER_ANIM_DURATION = 450;
  var EXIT_ANIM_DURATION = 375;
  var NOISE_ANIMATION_DURATION = 7000;
  var MAX_NOISE_PHASE = NOISE_ANIMATION_DURATION / 214; // ≈32.710
  var PI_ROTATE_RIGHT = Math.PI * 0.0078125;
  var PI_ROTATE_LEFT = Math.PI * -0.0078125;

  /* ---- fast_out_slow_in(0.4, 0, 0.2, 1) 三次贝塞尔插值（二分求解，AOSP PathInterpolatorCubic 同式） ---- */
  var FAST_OUT_SLOW_IN = (function () {
    var X1 = 0.4, Y1 = 0, X2 = 0.2, Y2 = 1;
    function xAt(t) { var u = 1 - t; return 3 * u * u * t * X1 + 3 * u * t * t * X2 + t * t * t; }
    function yAt(t) { var u = 1 - t; return 3 * u * u * t * Y1 + 3 * u * t * t * Y2 + t * t * t; }
    return function (x) {
      var lo = 0, hi = 1, t = x, i;
      for (i = 0; i < 24; i++) {
        var vx = xAt(t) - x;
        if (Math.abs(vx) < 1e-6) break;
        if (vx < 0) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return yAt(t);
    };
  })();

  function sat(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fract(v) { return v - Math.floor(v); }
  function smoothstep(e0, e1, x) {
    var t = sat((x - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
  }
  function subProgress(start, end, p) { return sat((sat(p) - start) / (end - start)); }

  /* ---- GLSL triangleNoise / circle_grid / turbulence / sparkles 逐行移植 ---- */
  function triangleNoise(n) {
    var nx = fract(n[0] * 5.3987), ny = fract(n[1] * 5.4421);
    var d = ny * (nx + 21.5351) + nx * (ny + 14.3137);
    nx += d; ny += d;
    var xy = nx * ny;
    return fract(xy * 95.4307) + fract(xy * 75.04961) - 1.0;
  }
  function softCircleVal(dOverR, blur) {
    var blurHalf = blur * 0.5;
    return 1 - smoothstep(1 - blurHalf, 1 + blurHalf, dOverR);
  }
  function circleGrid(resolution, coord, center, rotation, cell) {
    var cx = center[0] - coord[0], cy = center[1] - coord[1];
    var rcx = rotation[0] * cx - rotation[1] * cy + center[0];
    var rcy = rotation[1] * cx + rotation[0] * cy + center[1];
    var mx = (rcx % cell + cell) % cell / resolution;
    var my = (rcy % cell + cell) % cell / resolution;
    var normalRadius = cell / resolution * 0.5;
    var radius = 0.65 * normalRadius;
    var d = Math.hypot(mx - normalRadius, my - normalRadius);
    return softCircleVal(d / radius, radius * 50);
  }
  function turbulenceUV(uv, tU, phase) {
    var s = 0.8;
    var x = uv[0] * s, y = uv[1] * s;
    var g1 = circleGrid(s, [x, y], tU.tC1, tU.tR1, 0.17);
    var g2 = circleGrid(s, [x, y], tU.tC2, tU.tR2, 0.2);
    var g3 = circleGrid(s, [x, y], tU.tC3, tU.tR3, 0.275);
    var v = (g1 * g1 + g2 - g3) * 0.5;
    return sat(0.45 + 0.8 * v);
  }
  function sparklesAt(densityUv, t) {
    var n = triangleNoise(densityUv);
    var s = 0.0;
    for (var i = 0; i < 4; i++) {
      var l = i * 0.1;
      var h = l + 0.05;
      var o = Math.sin(Math.PI * (t + 0.35 * i));
      var v = n + o;
      if (v >= l && v < h) s += 1;
    }
    return sat(s);
  }
  /** 对应 RippleShader.setNoisePhase() 的 uniform 计算（逐行） */
  function computeTurbulenceUniforms(phase) {
    var scale = 1.5;
    var tC1 = [scale * 0.5 + phase * 0.01 * Math.cos(scale * 0.55), scale * 0.5 + phase * 0.01 * Math.sin(scale * 0.55)];
    var tC2 = [scale * 0.2 + phase * -0.0066 * Math.cos(scale * 0.45), scale * 0.2 + phase * -0.0066 * Math.sin(scale * 0.45)];
    var tC3 = [scale + phase * -0.0066 * Math.cos(scale * 0.35), scale + phase * -0.0066 * Math.sin(scale * 0.35)];
    var rotR = phase * PI_ROTATE_RIGHT, rotL = phase * PI_ROTATE_LEFT;
    return {
      tC1: tC1, tC2: tC2, tC3: tC3,
      tR1: [Math.cos(rotR), Math.sin(rotR)],
      tR2: [Math.cos(rotL), Math.sin(rotL)],
      tR3: [Math.cos(rotL), Math.sin(rotR)],
    };
  }

  /* ---- 会话（RippleAnimationSession 同款时序） ---- */
  function Session(origin, touch, maxRadius, mask, color, sparkle, now) {
    this.originX = origin[0]; this.originY = origin[1];
    this.touchX = touch[0]; this.touchY = touch[1];
    this.maxRadius = maxRadius;
    this.mask = mask;
    this.color = color; this.sparkle = sparkle;
    this.mStartTime = now;
    this.progress = 0;
    this.noisePhase = now;
    this.exiting = false;
    this.exitRequestedAt = 0;
    this.exitStartValue = 0;
    this.finished = false;
  }
  Session.prototype.requestExit = function (now) {
    if (!this.exiting) {
      this.exiting = true;
      this.exitRequestedAt = now;
      this.exitStartValue = this.progress;
    }
  };
  Session.prototype.update = function (now) {
    var elapsed = now - this.mStartTime;
    this.noisePhase = this.mStartTime + MAX_NOISE_PHASE * Math.min(elapsed / NOISE_ANIMATION_DURATION, 1.0);
    if (!this.exiting) {
      var t = Math.min(elapsed / ENTER_ANIM_DURATION, 1.0);
      this.progress = 0.5 * FAST_OUT_SLOW_IN(t);
    } else {
      var delay = Math.max(ENTER_ANIM_DURATION - (this.exitRequestedAt - this.mStartTime), 0);
      var exitStart = this.exitRequestedAt + delay;
      var exitElapsed = now - exitStart;
      if (exitElapsed >= 0) {
        var t2 = Math.min(exitElapsed / EXIT_ANIM_DURATION, 1.0);
        this.progress = this.exitStartValue + (1.0 - this.exitStartValue) * t2;
        this.finished = exitElapsed >= EXIT_ANIM_DURATION;
      }
    }
  };

  /* ---- 颜色解析（rgba() / #rgb / #rrggbb / #rgba） ---- */
  function parseColor(str) {
    if (!str) return null;
    var s = String(str).trim();
    var m = s.match(/^rgba?\(([^)]+)\)$/i);
    if (m) {
      var parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      if (parts.length >= 3 && parts.every(function (n) { return !Number.isNaN(n); })) {
        return [parts[0] / 255, parts[1] / 255, parts[2] / 255, parts.length > 3 ? sat(parts[3]) : 1];
      }
      return null;
    }
    m = s.match(/^#([0-9a-f]{3,8})$/i);
    if (m) {
      var hex = m[1];
      if (hex.length === 3 || hex.length === 4) hex = hex.split('').map(function (c) { return c + c; }).join('');
      return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255,
        hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
      ];
    }
    return null;
  }
  function rgbaStr(c, a) {
    return 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + a + ')';
  }
  function isLightTheme() {
    return !!(document.body && document.body.classList.contains('light-theme'));
  }

  var DEFAULT_SELECTOR = [
    'button', '.btn', '.md-btn', '.icon-btn', '.tab-btn', '.cat-chip', '.mem-btn',
    '.badge-chip', '.list-card', '.action-btn', '[data-ripple]',
  ].join(', ');

  var state = { canvas: null, ctx: null, sessions: [], pointers: new Map(), running: false, raf: 0, selector: DEFAULT_SELECTOR, initialized: false };

  function reducedMotion() {
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function resize() {
    if (!state.canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    state.canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
    state.canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
    state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function handleDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    var el = e.target && e.target.closest ? e.target.closest(state.selector) : null;
    if (!el) return;
    if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return;
    if (reducedMotion() || !state.ctx) return;
    var rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    var vw = window.innerWidth, vh = window.innerHeight;
    var cx0 = Math.max(rect.left, 0), cy0 = Math.max(rect.top, 0);
    var cx1 = Math.min(rect.right, vw), cy1 = Math.min(rect.bottom, vh);
    if (cx1 <= cx0 || cy1 <= cy0) return;
    var cssColor = getComputedStyle(el).getPropertyValue('--ripple-color').trim();
    var color = parseColor(cssColor) || (isLightTheme() ? [0, 0, 0, 0.12] : [1, 1, 1, 0.20]);
    var session = new Session(
      [rect.left + rect.width / 2, rect.top + rect.height / 2],
      [e.clientX, e.clientY],
      Math.hypot(rect.width / 2, rect.height / 2) * 2.3,
      { x: cx0, y: cy0, w: cx1 - cx0, h: cy1 - cy0, r: parseFloat(getComputedStyle(el).borderRadius) || 0 },
      color, [1, 1, 1, 0.90],
      performance.now(),
    );
    state.sessions.push(session);
    state.pointers.set(e.pointerId, session);
    ensureLoop();
  }
  function handleMove(e) {
    var s = state.pointers.get(e.pointerId);
    if (!s) return;
    s.touchX = e.clientX; s.touchY = e.clientY;
  }
  function handleUp(e) {
    var s = state.pointers.get(e.pointerId);
    if (!s) return;
    s.requestExit(performance.now());
    state.pointers.delete(e.pointerId);
  }

  function ensureLoop() {
    if (state.running) return;
    state.running = true;
    state.raf = requestAnimationFrame(frame);
  }
  function frame() {
    var ctx = state.ctx;
    if (!ctx) { state.running = false; return; }
    var now = performance.now();
    var vw = window.innerWidth, vh = window.innerHeight;
    ctx.clearRect(0, 0, vw, vh);
    state.sessions = state.sessions.filter(function (s) {
      s.update(now);
      if (s.finished) return false;
      drawSession(ctx, s, vw, vh);
      return true;
    });
    if (state.sessions.length > 0 || state.pointers.size > 0) {
      state.raf = requestAnimationFrame(frame);
    } else {
      state.running = false;
      ctx.clearRect(0, 0, vw, vh);
    }
  }

  function drawSession(ctx, s, vw, vh) {
    var progress = s.progress;
    var fadeIn = subProgress(0, 0.13, progress);
    var scaleIn = subProgress(0, 1.0, progress);
    var fadeOutNoise = subProgress(0.4, 0.5, progress);
    var fadeOutRipple = subProgress(0.4, 1.0, progress);
    var mixC = sat(progress * 2.0);
    var cx = s.touchX + (s.originX - s.touchX) * mixC;
    var cy = s.touchY + (s.originY - s.touchY) * mixC;
    var alpha = Math.min(fadeIn, 1 - fadeOutNoise);
    var fade = Math.min(fadeIn, 1 - fadeOutRipple);
    if (alpha <= 0 && fade <= 0) return;
    var tU = computeTurbulenceUniforms(s.noisePhase * 0.001);
    var turbPhase = s.noisePhase;
    var noiseScaleX = 2.1 / vw, noiseScaleY = 2.1 / vh;

    ctx.save();
    // 遮罩 = 宿主圆角矩形（RippleDrawable 以 View 边界为涟漪遮罩）
    if (s.mask) {
      ctx.beginPath();
      var m = s.mask, r = Math.min(m.r, m.w / 2, m.h / 2);
      ctx.moveTo(m.x + r, m.y);
      ctx.arcTo(m.x + m.w, m.y, m.x + m.w, m.y + m.h, r);
      ctx.arcTo(m.x + m.w, m.y + m.h, m.x, m.y + m.h, r);
      ctx.arcTo(m.x, m.y + m.h, m.x, m.y, r);
      ctx.arcTo(m.x, m.y, m.x + m.w, m.y, r);
      ctx.closePath();
      ctx.clip();
    }
    var R = s.maxRadius * scaleIn;

    // 主波：软边实心圆（softCircle blur=1.0 → smoothstep(0.5, 1.5, d/R) 的径向渐变近似）
    if (fade > 0 && R > 0.5) {
      var waveA = fade * s.color[3];
      var g = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, R * 1.5);
      g.addColorStop(0, rgbaStr(s.color, waveA));
      g.addColorStop(0.5, rgbaStr(s.color, waveA * 0.85));
      g.addColorStop(1, rgbaStr(s.color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 波前环带 sparkle 闪点（sparkles × ring × alpha × turbulence，AOSP 同式）
    if (alpha > 0 && R > 2) {
      var thickness = 0.05 * s.maxRadius;
      var rOuter = R + thickness, rInner = Math.max(R - thickness, 0);
      var step = Math.max(3, (2 * Math.PI * Math.max(R, 1)) / 220);
      var steps = Math.max(36, Math.floor(2 * Math.PI * Math.max(R, 1) / step));
      ctx.fillStyle = rgbaStr(s.sparkle, 1);
      for (var i = 0; i < steps; i++) {
        var th = (i / steps) * Math.PI * 2;
        var px = cx + Math.cos(th) * R;
        var py = cy + Math.sin(th) * R;
        if (px < -4 || py < -4 || px > vw + 4 || py > vh + 4) continue;
        // softRing 逐点值（环带软边）
        var d = Math.hypot(px - cx, py - cy);
        var co = softCircleVal(d / (rOuter), 1.0);
        var ci = softCircleVal(d / (rInner || 0.001), 1.0);
        var ring = sat(co - ci);
        if (ring <= 0.01) continue;
        var du = px - (px % noiseScaleX);
        var dv = py - (py % noiseScaleY);
        var turb = turbulenceUV([px, py], tU, turbPhase);
        var sp = sparklesAt([du, dv], s.noisePhase * 0.001) * ring * alpha * turb;
        if (sp <= 0.01) continue;
        ctx.globalAlpha = sp * s.sparkle[3];
        ctx.beginPath();
        ctx.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  /** 文档级初始化（幂等；不支持时静默降级） */
  function init(opts) {
    if (state.initialized) return false;
    try {
      if (typeof document === 'undefined' || !document.body || reducedMotion()) return false;
      var canvas = document.createElement('canvas');
      canvas.className = 'md3e-ripple-layer';
      canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483000;pointer-events:none;';
      var ctx = canvas.getContext('2d');
      if (!ctx) return false;
      state.canvas = canvas; state.ctx = ctx;
      document.body.appendChild(canvas);
      if (opts && opts.selector) state.selector = opts.selector;
      resize();
      window.addEventListener('resize', resize, { passive: true });
      document.addEventListener('pointerdown', handleDown, true);
      window.addEventListener('pointermove', handleMove, { passive: true });
      window.addEventListener('pointerup', handleUp, { passive: true });
      window.addEventListener('pointercancel', handleUp, { passive: true });
      state.initialized = true;
      return true;
    } catch (e) {
      state.canvas = null; state.ctx = null;
      return false;
    }
  }

  window.M3ERipple = {
    init: init,
    /** 调试/E2E 透视 */
    __debug: function () {
      return { active: state.initialized, sessions: state.sessions.length, pointers: state.pointers.size };
    },
  };
})();
