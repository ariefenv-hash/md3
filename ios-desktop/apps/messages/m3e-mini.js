/* ==================== m3e-mini.js — M3E LoadingIndicator 忠实 1:1 引擎（v7.75） ====================
 *
 * 参考源文件：议题 #9 附件 2.html「Loading Indicator · androidx compose-material3 1:1 移植」。
 * v7.75 按用户要求**忠实源文件重写**：废除 v7.73/v7.74 的极坐标近似
 * （r(θ)=R·(1+a·cos(nθ))·s —— 与官方形状不符），改为源文件的完整几何管线：
 *   • MaterialShapes 顶点表（SoftBurst/Cookie9/Pentagon/Pill/Sunny/Cookie4/Oval）
 *   • RoundedPolygon 圆角算法（buildOutline，smoothing=0 纯圆弧）
 *   • 形变 = 弧长等分重采样（resample，M=256）+ 两级环形对齐 + 笛卡尔插值（buildMorph）
 *   • 官方常数：spring(dampingRatio=0.6, stiffness=200) · MorphInterval=650ms
 *     · 全局旋转 360°/4666ms 线性顺时针 · ActiveIndicatorScale=38/48
 *   • 启动三件套：同步首帧 + rAF 主循环 + 100ms 看门狗兜底（rAF 被节流环境立即出现）
 *
 * 零依赖 classic script，可在任意 iframe 内 <script src> 引入。
 * 生命周期纪律保留：document.hidden 暂停、元素脱文档自回收、prefers-reduced-motion 静帧。
 *
 * 暴露 window.__m3eMini = { mount, stop, shapes, morphs, ShapeScaleFactor, springProgress }
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var M = 256;          // 弧长重采样点数（源文件同款）
  var EPS = 1e-6;

  /* ---------- 官方常数（LoadingIndicator.kt / 源文件 2.html 逐字） ---------- */
  var MorphIntervalMillis = 650;
  var GlobalRotationDurationMillis = 4666;
  var FullRotation = 360, QuarterRotation = 90;
  var SpringStiffness = 200, SpringDamping = 0.6;
  var ActiveIndicatorScale = 38 / 48;
  var NUM_SHAPES = 7;

  /* ================= 基础几何（源文件逐字移植） ================= */
  function pt(x, y, r) { return { x: x, y: y, r: r || 0, sm: 0 }; }

  function doRepeat(points, reps, cx, cy, mirror) {
    cx = (cx === undefined) ? 0.5 : cx;
    cy = (cy === undefined) ? 0.5 : cy;
    var ang = points.map(function (p) { return Math.atan2(p.y - cy, p.x - cx); });
    var dst = points.map(function (p) { return Math.hypot(p.x - cx, p.y - cy); });
    var out = [];
    if (mirror) {
      var total = reps * 2, sec = TAU / total;
      for (var rep = 0; rep < total; rep++)
        for (var idx = 0; idx < points.length; idx++) {
          var i = (rep % 2 === 0) ? idx : points.length - 1 - idx;
          if (i > 0 || rep % 2 === 0) {
            var a = (rep % 2 === 0) ? sec * rep + ang[i]
                                    : sec * rep + sec - ang[i] + 2 * ang[0];
            out.push({ x: Math.cos(a) * dst[i] + cx,
                       y: Math.sin(a) * dst[i] + cy, r: points[i].r, sm: points[i].sm });
          }
        }
    } else {
      for (var rep2 = 0; rep2 < reps; rep2++) {
        var aa = TAU * rep2 / reps, c = Math.cos(aa), s = Math.sin(aa);
        for (var k = 0; k < points.length; k++) {
          var p = points[k];
          var dx = p.x - cx, dy = p.y - cy;
          out.push({ x: dx * c - dy * s + cx, y: dx * s + dy * c + cy, r: p.r, sm: p.sm });
        }
      }
    }
    return out;
  }

  var starPts = function (num, R, inner, r) {
    var o = [];
    for (var i = 0; i < num * 2; i++) {
      var a = Math.PI * i / num, rad = (i % 2 === 0) ? R : inner;
      o.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, r: r, sm: 0 });
    }
    return o;
  };
  var circlePts = function (num, R) {
    var rad = R / Math.cos(Math.PI / num), o = [];
    for (var i = 0; i < num; i++) {
      var a = TAU * i / num;
      o.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, r: R, sm: 0 });
    }
    return o;
  };
  var rotPts = function (pts, deg) {
    var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return pts.map(function (p) { return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, r: p.r, sm: p.sm }; });
  };
  var scaleYPts = function (pts, k) {
    return pts.map(function (p) { return { x: p.x, y: p.y * k, r: p.r, sm: p.sm }; });
  };

  /** RoundedPolygon 圆角轮廓（源文件 buildOutline 逐字：纯圆弧，smoothing=0） */
  function buildOutline(vIn) {
    var V = [];
    for (var vi = 0; vi < vIn.length; vi++) {
      var p = vIn[vi];
      var q = V[V.length - 1];
      if (!q || Math.hypot(p.x - q.x, p.y - q.y) > 1e-4) V.push(p);
    }
    if (V.length > 1 && Math.hypot(V[0].x - V[V.length - 1].x, V[0].y - V[V.length - 1].y) <= 1e-4) V.pop();
    var n = V.length;

    var C = V.map(function (p1, i) {
      var p0 = V[(i + n - 1) % n], p2 = V[(i + 1) % n];
      var o = { p1: p1, r: p1.r, d1: null, d2: null, erc: 0, ec: 0, deg: true };
      var v01 = [p0.x - p1.x, p0.y - p1.y], v21 = [p2.x - p1.x, p2.y - p1.y];
      var d01 = Math.hypot(v01[0], v01[1]), d21 = Math.hypot(v21[0], v21[1]);
      if (d01 > EPS && d21 > EPS && p1.r > 0) {
        var d1 = [v01[0] / d01, v01[1] / d01], d2 = [v21[0] / d21, v21[1] / d21];
        var cosA = d1[0] * d2[0] + d1[1] * d2[1];
        var sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
        o.d1 = d1; o.d2 = d2; o.deg = false;
        if (sinA > 1e-3) o.erc = p1.r * (cosA + 1) / sinA;
        o.ec = (1 + p1.sm) * o.erc;
      }
      return o;
    });

    var adj = C.map(function (c, i) {
      var nx = C[(i + 1) % n].p1;
      var side = Math.hypot(nx.x - c.p1.x, nx.y - c.p1.y);
      var erc = c.erc + C[(i + 1) % n].erc;
      var ec = c.ec + C[(i + 1) % n].ec;
      if (erc > side) return { rc: side / (erc || 1), cr: 0 };
      if (ec > side) return { rc: 1, cr: (side - erc) / ((ec - erc) || 1) };
      return { rc: 1, cr: 1 };
    });

    var arcs = C.map(function (c, i) {
      if (c.deg || c.erc < EPS) return null;
      var a0 = adj[(i + n - 1) % n], a1 = adj[i];
      var allow = Math.min(
        c.erc * a0.rc + (c.ec - c.erc) * a0.cr,
        c.erc * a1.rc + (c.ec - c.erc) * a1.cr);
      if (allow < EPS) return null;
      var cut = Math.min(allow, c.erc);
      var R = c.r * cut / c.erc;
      var bx = c.d1[0] + c.d2[0], by = c.d1[1] + c.d2[1];
      var bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
      var cd = Math.sqrt(R * R + cut * cut);
      return {
        center: [c.p1.x + bx * cd, c.p1.y + by * cd],
        R: R,
        I0: [c.p1.x + c.d1[0] * cut, c.p1.y + c.d1[1] * cut],
        I2: [c.p1.x + c.d2[0] * cut, c.p1.y + c.d2[1] * cut],
        vertex: [c.p1.x, c.p1.y]
      };
    });

    var nrm = function (a) { while (a > Math.PI) a -= TAU; while (a <= -Math.PI) a += TAU; return a; };
    var out = [];
    for (var i = 0; i < n; i++) {
      var A = arcs[i];
      if (A) {
        var cx = A.center[0], cy = A.center[1];
        var a0 = Math.atan2(A.I0[1] - cy, A.I0[0] - cx);
        var am = Math.atan2(A.vertex[1] - cy, A.vertex[0] - cx);
        var d = nrm(Math.atan2(A.I2[1] - cy, A.I2[0] - cx) - a0);
        var dm = nrm(am - a0);
        if ((dm >= 0) !== (d >= 0) || Math.abs(dm) > Math.abs(d)) d += d > 0 ? -TAU : TAU;
        for (var s = 0; s <= 16; s++) {
          var ang = a0 + d * s / 16;
          out.push([cx + A.R * Math.cos(ang), cy + A.R * Math.sin(ang)]);
        }
      } else out.push([C[i].p1.x, C[i].p1.y]);
      var B = arcs[(i + 1) % n];
      var end = A ? A.I2 : [C[i].p1.x, C[i].p1.y];
      var start = B ? B.I0 : [C[(i + 1) % n].p1.x, C[(i + 1) % n].p1.y];
      if (Math.hypot(start[0] - end[0], start[1] - end[1]) > 1e-6)
        for (var s2 = 1; s2 <= 4; s2++)
          out.push([end[0] + (start[0] - end[0]) * s2 / 4, end[1] + (start[1] - end[1]) * s2 / 4]);
    }
    return out;
  }

  function normalizeUnit(pts) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    }
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, s = 1 / Math.max(x1 - x0, y1 - y0);
    return pts.map(function (q) { return [(q[0] - cx) * s + 0.5, (q[1] - cy) * s + 0.5]; });
  }

  /* ================= MaterialShapes（源文件七形序列，环形） ================= */
  var softBurst = normalizeUnit(buildOutline(doRepeat(
    [pt(0.193, 0.277, 0.053), pt(0.176, 0.055, 0.053)], 10)));
  var cookie9 = normalizeUnit(buildOutline(rotPts(starPts(9, 1.0, 0.8, 0.5), -90)));
  var pentagon = normalizeUnit(buildOutline(doRepeat(
    [pt(0.500, -0.009, 0.172), pt(1.030, 0.365, 0.164), pt(0.828, 0.970, 0.169)], 1, 0.5, 0.5, true)));
  var pill = normalizeUnit(buildOutline(doRepeat(
    [pt(0.961, 0.039, 0.426), pt(1.001, 0.428), pt(1.000, 0.609, 1.0)], 2, 0.5, 0.5, true)));
  var sunny = normalizeUnit(buildOutline(starPts(8, 1.0, 0.8, 0.15)));
  var cookie4 = normalizeUnit(buildOutline(doRepeat(
    [pt(1.237, 1.236, 0.258), pt(0.500, 0.918, 0.233)], 4, 0.5, 0.5, true)));
  var oval = normalizeUnit(buildOutline(rotPts(scaleYPts(circlePts(8, 1.0), 0.64), -45)));

  var SHAPES = [softBurst, cookie9, pentagon, pill, sunny, cookie4, oval];

  /* ================= Morph（弧长等分 + 两级环形对齐 + 笛卡尔插值） ================= */
  function resample(pts, start) {
    var n = pts.length, cum = [0];
    var total = 0;
    for (var i = 1; i <= n; i++) {
      var a = pts[(start + i - 1) % n], b = pts[(start + i) % n];
      total += Math.hypot(b[0] - a[0], b[1] - a[1]);
      cum.push(total);
    }
    var o = new Float64Array(M * 2);
    var j = 0;
    for (var k = 0; k < M; k++) {
      var tgt = total * k / M;
      while (j < n && cum[j + 1] < tgt) j++;
      var seg = cum[j + 1] - cum[j] || 1e-9, f = (tgt - cum[j]) / seg;
      var a2 = pts[(start + j) % n], b2 = pts[(start + j + 1) % n];
      o[k * 2] = a2[0] + (b2[0] - a2[0]) * f;
      o[k * 2 + 1] = a2[1] + (b2[1] - a2[1]) * f;
    }
    return o;
  }

  function buildMorph(A, B) {
    var a = resample(A, 0), b = resample(B, 0);
    var best = 0, bestD = Infinity;
    for (var s = 0; s < M; s++) {
      var d = 0;
      for (var i = 0; i < M; i += 4) {
        var bi = ((i + s) % M) * 2;
        var dx = a[i * 2] - b[bi], dy = a[i * 2 + 1] - b[bi + 1];
        d += dx * dx + dy * dy;
      }
      if (d < bestD) { bestD = d; best = s; }
    }
    var bf = best, df = Infinity;
    for (var ds = -2; ds <= 2; ds++) {
      var s2 = (best + ds + M) % M;
      var d2 = 0;
      for (var i2 = 0; i2 < M; i2++) {
        var bi2 = ((i2 + s2) % M) * 2;
        var dx2 = a[i2 * 2] - b[bi2], dy2 = a[i2 * 2 + 1] - b[bi2 + 1];
        d2 += dx2 * dx2 + dy2 * dy2;
      }
      if (d2 < df) { df = d2; bf = s2; }
    }
    var bs = new Float64Array(M * 2);
    for (var i3 = 0; i3 < M; i3++) {
      var bi3 = ((i3 + bf) % M) * 2;
      bs[i3 * 2] = b[bi3]; bs[i3 * 2 + 1] = b[bi3 + 1];
    }
    return { a: a, b: bs };
  }
  var MORPHS = SHAPES.map(function (s, i) { return buildMorph(s, SHAPES[(i + 1) % SHAPES.length]); });

  /* ================= calculateScaleFactor（源文件逐字） ================= */
  function calculateScaleFactor(all) {
    var f = 1;
    for (var ai = 0; ai < all.length; ai++) {
      var pts = all[ai];
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      var i;
      for (i = 0; i < pts.length; i++) {
        if (pts[i][0] < x0) x0 = pts[i][0]; if (pts[i][0] > x1) x1 = pts[i][0];
        if (pts[i][1] < y0) y0 = pts[i][1]; if (pts[i][1] > y1) y1 = pts[i][1];
      }
      var w = x1 - x0, h = y1 - y0;
      var side = 0;
      for (var k = 0; k < 180; k++) {
        var phi = k * Math.PI / 180, c = Math.cos(phi), s = Math.sin(phi);
        var hp = 0, hn = 0;
        for (i = 0; i < pts.length; i++) {
          var d = (pts[i][0] - 0.5) * c + (pts[i][1] - 0.5) * s;
          if (d > hp) hp = d;
          if (-d > hn) hn = -d;
        }
        if (hp + hn > side) side = hp + hn;
      }
      f = Math.min(f, Math.max(w / side, h / side));
    }
    return f;
  }
  var ShapeScaleFactor = calculateScaleFactor(SHAPES) * ActiveIndicatorScale;

  /* ================= 官方 spring（逐字保留） ================= */
  var SPRING_W = Math.sqrt(SpringStiffness);
  var SPRING_WD = SPRING_W * Math.sqrt(1 - SpringDamping * SpringDamping);
  var SPRING_T_HOLD = Math.log(1.25 / 0.1) / (SpringDamping * SPRING_W);
  function springProgress(tau) {
    if (tau >= SPRING_T_HOLD) return 1;
    return 1 - Math.exp(-SpringDamping * SPRING_W * tau)
      * (Math.cos(SPRING_WD * tau) + SpringDamping * SPRING_W / SPRING_WD * Math.sin(SPRING_WD * tau));
  }

  function reducedMotion() {
    try {
      return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) { return false; }
  }

  function readVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  /**
   * 画一帧（源文件 draw 逐字语义）：M=256 笛卡尔插值 + 官方旋转公式。
   * @param {CanvasRenderingContext2D} ctx 已按 dpr scale 的 2D 上下文
   * @param {number} size 画布 CSS 尺寸（正方形）
   * @param {number} dtMs 实例时钟（钳 0）
   * @param {number[]} morphPair 未用占位（兼容签名）；实际取 MORPHS[seg]
   * @param {number} seg 形变段序
   * @param {number} prog spring 形变进度
   * @param {string} fg 前景色
   * @param {string} [bg] contained 圆形底盘色
   */
  function paintFrame(ctx, size, dtMs, morphPair, seg, prog, fg, bg) {
    // 源文件：canvas 120px，BOX=96（48dp 组件盒），U=BOX×ShapeScaleFactor，中心 60,60
    // 映射：BOX = size×(96/120)，contained 圆盘半径 = BOX/2
    var BOX = size * (96 / 120);
    var U = BOX * ShapeScaleFactor;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    if (bg) {
      ctx.beginPath(); ctx.arc(0, 0, BOX / 2, 0, TAU);
      ctx.fillStyle = bg; ctx.fill();
    }
    var morph = MORPHS[((seg % NUM_SHAPES) + NUM_SHAPES) % NUM_SHAPES];
    var rot = prog * QuarterRotation
      + ((((seg % 4) + 4) % 4) + 1) * QuarterRotation
      + (dtMs / GlobalRotationDurationMillis * FullRotation) % FullRotation;
    ctx.rotate(rot * Math.PI / 180);
    var a = morph.a, b = morph.b;
    ctx.beginPath();
    for (var i = 0; i < M; i++) {
      var x = (a[i * 2] + (b[i * 2] - a[i * 2]) * prog - 0.5) * U;
      var y = (a[i * 2 + 1] + (b[i * 2 + 1] - a[i * 2 + 1]) * prog - 0.5) * U;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.restore();
  }

  /** 静帧（reduced-motion / 兜底）：源文件 reduceMotion 分支 —— 呼吸圆点 */
  function paintStatic(ctx, size, fg, bg, dtMs) {
    var BOX = size * (96 / 120);
    var U = BOX * ShapeScaleFactor;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    if (bg) {
      ctx.beginPath(); ctx.arc(0, 0, BOX / 2, 0, TAU);
      ctx.fillStyle = bg; ctx.fill();
    }
    ctx.globalAlpha = 0.5 + 0.4 * Math.sin((dtMs || 0) / 1600 * TAU);
    ctx.beginPath(); ctx.arc(0, 0, Math.max(1, U * 0.2), 0, TAU);
    ctx.fillStyle = fg; ctx.fill();
    ctx.restore();
  }

  /**
   * 挂载一枚忠实 M3E 七形指示器到容器（容器内已有实例则复用）。
   * @param {{size?:number, contained?:boolean, color?:string, bgColor?:string}} [opts]
   * @returns {{el:Element, stop:Function}|null}
   */
  function mount(container, opts) {
    if (!container || typeof container.appendChild !== 'function') return null;
    var prev = container.querySelector(':scope > canvas');
    if (prev && prev.__m3eMini) return prev.__m3eMini;

    opts = opts || {};
    var size = opts.size || 14;
    var contained = !!opts.contained;
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
      return { el: el, stop: function () { if (el.parentNode) el.parentNode.removeChild(el); } };
    }

    var inst = { el: el, stop: stop };
    el.__m3eMini = inst;

    // 颜色：显式指定 > CSS 角色（md3-tokens）> 源文件 Material 兜底
    var fg = opts.color || readVar('--md-primary', '#6750A4')
      || 'currentColor';
    var bg = null;
    if (contained) bg = opts.bgColor || readVar('--md-primary-container', '#EADDFF');
    // contained 前景色用 on-primary-container（源文件语义）
    if (contained) fg = opts.color || readVar('--md-on-primary-container', '#21005D');

    var raf = 0;
    var stopped = false;
    var t0 = (typeof performance !== 'undefined' ? performance.now() : 0); // 实例自有时钟（源文件 t0）
    var lastRender = t0;
    var watchdog = 0;

    if (reducedMotion()) {
      // 静帧：呼吸圆点（含 dpr 处理，与循环帧一致的坐标系）
      ctx.save(); ctx.scale(dpr, dpr);
      paintStatic(ctx, size, fg, bg, 0);
      ctx.restore();
      return inst;
    }

    function drawFrame(now) {
      var dt = Math.max(0, now - t0);          // 时钟钳制：杜绝负时间（源文件同款）
      var seg = Math.floor(dt / MorphIntervalMillis);
      var tau = (dt - seg * MorphIntervalMillis) / 1000;
      var prog = springProgress(tau);
      ctx.save();
      ctx.scale(dpr, dpr);
      paintFrame(ctx, size, dt, null, seg, prog, fg, bg);
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

    // rAF 看门狗（源文件 2.html 同款）：rAF 停滞 >250ms 时 100ms 定时器补帧
    function teardownWatchdog() { if (watchdog) { clearInterval(watchdog); watchdog = 0; } }
    watchdog = setInterval(function () {
      if (stopped || !el.isConnected) { stopped = true; teardownWatchdog(); return; }
      if (typeof document !== 'undefined' && document.hidden) return;
      var now = (typeof performance !== 'undefined' ? performance.now() : 0);
      if (now - lastRender > 250) { drawFrame(now); lastRender = now; }
    }, 100);

    // 同步首帧：挂载即呈现，不等首个 rAF（源文件 boot 特性）
    ctx.save(); ctx.scale(dpr, dpr); ctx.restore();
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

  window.__m3eMini = {
    mount: mount,
    stop: function (inst) { if (inst && inst.stop) inst.stop(); },
    shapes: SHAPES,
    morphs: MORPHS,
    ShapeScaleFactor: ShapeScaleFactor,
    springProgress: springProgress,
    MorphIntervalMillis: MorphIntervalMillis,
    GlobalRotationDurationMillis: GlobalRotationDurationMillis,
  };
})();
