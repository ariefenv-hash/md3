// ==================== core.js — 重力沙盒 N 体物理核（v9.03 #123） ====================
//
// 纯函数物理核：两两万有引力 + 固定子步辛欧拉积分 + 动量守恒合并 + 预设场景。
// 经典脚本 IIFE 挂 window.__gravityCore（terminal-core/word-core 同款模式；
// ESM export 在经典 <script> 下整文件 SyntaxError —— v8.38 教训沿用）。
// 顶层零副作用：不触碰 document / localStorage / window（仅末尾挂载导出对象），
// vitest 经 new Function('window', SRC)({window:{}}) 沙箱直驱（v840 同范式）。
//
// 标度纪律：G/软化/子步均为沙盒标度工程值（非 SI 物理值，头注留痕勿按真值核对）；
// 轨道公式为精确二体圆轨道解（v = sqrt(G·M / r)），三体预设为 Chenciner–Montgomery
// 「8 字周期解」标度变换（x = L·x₀，v = sqrt(G·m/L)·v₀，初值常量 verbatim）。

(function () {
  'use strict';

  // ---------- 标度常量（工程调优值） ----------
  var G = 1200;            // 引力常数（沙盒标度）
  var SOFTENING = 6;       // Plummer 软化 ε：d² += ε² 防近距发散
  var SUBSTEPS = 4;        // 每帧固定子步数（大步长轨道防发散）
  var TRAIL_MAX = 260;     // 拖尾采样点上限（x,y 扁平交替存）
  var MERGE_OVERLAP = 0.85; // 合并判定半径比（dist < 0.85·(r1+r2)）
  var FIGURE8_T0 = 6.32449; // 8 字解标称周期（G=1, m=1 归一单位，文献值）

  function radiusForMass(m) {
    return Math.max(2.5, Math.cbrt(Math.max(m, 0.001)) * 7);
  }

  function createBody(o) {
    var m = o && typeof o.m === 'number' ? o.m : 1;
    return {
      x: o.x, y: o.y,
      vx: o.vx || 0, vy: o.vy || 0,
      m: m,
      r: o.r || radiusForMass(m),
      hue: typeof o.hue === 'number' ? o.hue : 215,
      trail: [],
      fixed: !!(o && o.fixed), // 恒星钉住语义（不受积分，仍施力）
      merges: 0,
    };
  }

  // 两两万有引力加速度（Newton + Plummer 软化：a = G·M·d / (|d|²+ε²)^{3/2}）
  function accelAt(bodies, i) {
    var ax = 0, ay = 0;
    var bi = bodies[i];
    for (var j = 0; j < bodies.length; j++) {
      if (j === i) continue;
      var bj = bodies[j];
      var dx = bj.x - bi.x, dy = bj.y - bi.y;
      var d2 = dx * dx + dy * dy + SOFTENING * SOFTENING;
      var invD = 1 / Math.sqrt(d2);
      var a = G * bj.m * invD * invD; // G·M/(d²+ε²)
      ax += a * dx * invD;
      ay += a * dy * invD;
    }
    return { x: ax, y: ay };
  }

  // 固定子步辛欧拉（每子步整表 O(n²) 一次；拖尾每帧推一点，上限裁剪）。
  // 返回本帧被积分的天体数（fixed 与拖拽中天体不计入）。
  function step(bodies, dt) {
    if (!bodies || bodies.length === 0) return 0;
    var h = dt / SUBSTEPS;
    var moved = 0;
    for (var s = 0; s < SUBSTEPS; s++) {
      var accels = new Array(bodies.length);
      for (var i = 0; i < bodies.length; i++) accels[i] = accelAt(bodies, i);
      for (var k = 0; k < bodies.length; k++) {
        var b = bodies[k];
        if (b.fixed || b._drag) continue;
        b.vx += accels[k].x * h;
        b.vy += accels[k].y * h;
        b.x += b.vx * h;
        b.y += b.vy * h;
      }
    }
    for (var t = 0; t < bodies.length; t++) {
      if (!bodies[t].fixed && !bodies[t]._drag) moved++;
    }
    for (var u = 0; u < bodies.length; u++) {
      var tb = bodies[u];
      tb.trail.push(tb.x, tb.y);
      if (tb.trail.length > TRAIL_MAX * 2) tb.trail.splice(0, tb.trail.length - TRAIL_MAX * 2);
    }
    return moved;
  }

  // 完全非弹性合并（动量守恒）：p 守恒 + 质量相加 + 半径 ∝ m^(1/3) +
  // 位置/色相取大质量方继承 + merges 计数累加（大者原地吸收小者）。
  function mergeBodies(a, b) {
    var m = a.m + b.m;
    var px = a.vx * a.m + b.vx * b.m;
    var py = a.vy * a.m + b.vy * b.m;
    var bigIsA = a.m >= b.m;
    var keep = bigIsA ? a : b;
    var small = bigIsA ? b : a;
    keep.x = bigIsA ? a.x : b.x;
    keep.y = bigIsA ? a.y : b.y;
    keep.vx = px / m;
    keep.vy = py / m;
    keep.m = m;
    keep.r = radiusForMass(m);
    keep.hue = (a.hue * a.m + b.hue * b.m) / (a.m + b.m);
    keep.merges = (a.merges || 0) + (b.merges || 0) + 1;
    small._absorbed = true;
    return keep;
  }

  // 碰撞检测与归并：两两圆相交（重叠比 MERGE_OVERLAP）→ mergeBodies + splice。
  // 返回本轮合并次数。keep 留在 bodies 中继续参与后续比对。
  function handleCollisions(bodies) {
    if (!bodies || bodies.length < 2) return 0;
    var merged = 0;
    for (var i = 0; i < bodies.length; i++) {
      for (var j = bodies.length - 1; j > i; j--) {
        var a = bodies[i], b = bodies[j];
        var dx = b.x - a.x, dy = b.y - a.y;
        var rr = (a.r + b.r) * MERGE_OVERLAP;
        if (dx * dx + dy * dy < rr * rr) {
          mergeBodies(a, b);
          bodies.splice(j, 1);
          merged++;
        }
      }
    }
    return merged;
  }

  // 系统总动量（测试断言：合并前后守恒）
  function totalMomentum(bodies) {
    var px = 0, py = 0;
    for (var i = 0; i < bodies.length; i++) {
      px += bodies[i].vx * bodies[i].m;
      py += bodies[i].vy * bodies[i].m;
    }
    return { x: px, y: py };
  }

  // 系统总机械能（动能 + 成对软化势能；测试断言：能量有界不发散）
  function totalEnergy(bodies) {
    var ke = 0, pe = 0;
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      ke += 0.5 * b.m * (b.vx * b.vx + b.vy * b.vy);
      for (var j = i + 1; j < bodies.length; j++) {
        var o = bodies[j];
        var dx = o.x - b.x, dy = o.y - b.y;
        var d = Math.sqrt(dx * dx + dy * dy + SOFTENING * SOFTENING);
        pe -= (G * b.m * o.m) / d;
      }
    }
    return { ke: ke, pe: pe, total: ke + pe };
  }

  // ---------- 预设场景（固定数值可复现，零随机） ----------

  // 双星：等质量互绕，精确圆轨道 v = sqrt(G·m / (4d))（质心系两体各距 d，间距 2d）
  function presetBinary(cx, cy) {
    var m = 60, d = 110;
    var v = Math.sqrt(G * m / (4 * d));
    return [
      createBody({ x: cx - d, y: cy, vx: 0, vy: -v, m: m, hue: 210 }),
      createBody({ x: cx + d, y: cy, vx: 0, vy: v, m: m, hue: 25 }),
    ];
  }

  // 三体：Chenciner–Montgomery 8 字周期解标度变换。
  // 归一初值（G=1,m=1，文献常量 verbatim）：
  //   x₁ = (0.97000436, −0.24308753)，x₂ = −x₁，x₃ = (0,0)
  //   v₃ = (−0.93240737, −0.86473146)，v₁ = v₂ = −v₃/2
  // 标度：x = L·x₀ + c，v = sqrt(G·m/L)·v₀（m 为每体质量）
  function presetThree(cx, cy) {
    var m = 1.5, L = 150;
    var VSCALE = Math.sqrt((G * m) / L);
    var X1 = 0.97000436, Y1 = -0.24308753;
    var V3X = -0.93240737, V3Y = -0.86473146;
    return [
      createBody({ x: cx + L * X1, y: cy + L * Y1, vx: -VSCALE * V3X / 2, vy: -VSCALE * V3Y / 2, m: m, hue: 205 }),
      createBody({ x: cx - L * X1, y: cy - L * Y1, vx: -VSCALE * V3X / 2, vy: -VSCALE * V3Y / 2, m: m, hue: 150 }),
      createBody({ x: cx, y: cy, vx: VSCALE * V3X, vy: VSCALE * V3Y, m: m, hue: 330 }),
    ];
  }

  // 太阳系：中心恒星 + 四行星精确圆轨道 v = sqrt(G·M / r)（切向），恒星非 fixed（受微扰）
  function presetSolar(cx, cy) {
    var M = 420;
    var radii = [70, 110, 155, 200];
    var masses = [2, 3.5, 2.5, 5];
    var hues = [200, 30, 140, 280];
    var out = [createBody({ x: cx, y: cy, m: M, hue: 48 })];
    for (var i = 0; i < radii.length; i++) {
      var r = radii[i];
      var v = Math.sqrt((G * M) / r);
      var ang = (i * Math.PI) / 2.4; // 相位错开（非对称铺开，视觉可辨）
      out.push(createBody({
        x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang),
        vx: -v * Math.sin(ang), vy: v * Math.cos(ang),
        m: masses[i], hue: hues[i],
      }));
    }
    return out;
  }

  // 预设工厂：name ∈ binary|three|solar|empty（未知名回 empty）
  function makePreset(name, W, H) {
    var cx = W / 2, cy = H / 2;
    if (name === 'binary') return presetBinary(cx, cy);
    if (name === 'three') return presetThree(cx, cy);
    if (name === 'solar') return presetSolar(cx, cy);
    return [];
  }

  var core = {
    G: G, SOFTENING: SOFTENING, SUBSTEPS: SUBSTEPS, TRAIL_MAX: TRAIL_MAX,
    MERGE_OVERLAP: MERGE_OVERLAP, FIGURE8_T0: FIGURE8_T0,
    radiusForMass: radiusForMass,
    createBody: createBody,
    accelAt: accelAt,
    step: step,
    mergeBodies: mergeBodies,
    handleCollisions: handleCollisions,
    totalMomentum: totalMomentum,
    totalEnergy: totalEnergy,
    makePreset: makePreset,
    presetBinary: presetBinary,
    presetThree: presetThree,
    presetSolar: presetSolar,
  };

  if (typeof window !== 'undefined') window.__gravityCore = core;
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
})();
