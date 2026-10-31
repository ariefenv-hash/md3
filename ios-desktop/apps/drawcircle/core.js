/* ==================== core.js — 画圆挑战评分核（#124 一期 · v9.05） ====================
 * 纯函数 IIFE 双挂载（terminal-core 沙箱直驱范式 / v123 同款）：顶层零副作用，
 * 浏览器挂 window.__drawCircleCore，vitest 经 new Function('window', SRC) 沙箱提取。
 *
 * 三指标（议题 #124 验收口径：闭合度 / 圆度（各方向半径方差）/ 起止点重合度）：
 *   · roundness 圆度   —— 径向偏差变异系数 CV = std(r_i)/mean(r_i)，Kåsa 代数最小二乘拟合圆
 *   · closure  闭合度  —— 笔迹绕拟合圆圆心的角覆盖 sweep/(2π)（连续展开跨 ±π 不误断）
 *   · overlap  重合度  —— 起止点间距相对直径比 gap = d(p0,pn)/(2r)
 * 总分为三指标加权和（权重与阈值见 WEIGHTS/THRESH 导出常量，非 AOSP 对标物，
 * 系工程调优自定值——Human Benchmark 无画圆项目，无源码常量可循，特此留痕）。
 * 拟合退化（共线/半径过小/点数不足）返回 null，调用方按无效笔画处理（防误触）。
 */
(function () {
  'use strict';

  // Kåsa 圆拟合：最小化 Σ(x²+y²+Dx+Ey+F)²，法方程 3×3 线性方程组按伴随式消元
  function fitCircle(pts) {
    if (!pts || pts.length < 3) return null;
    var n = pts.length;
    var Sx = 0, Sy = 0, Sxx = 0, Syy = 0, Sxy = 0, Sxz = 0, Syz = 0, Sz = 0;
    for (var i = 0; i < n; i++) {
      var p = pts[i], z = p.x * p.x + p.y * p.y;
      Sx += p.x; Sy += p.y;
      Sxx += p.x * p.x; Syy += p.y * p.y;
      Sxy += p.x * p.y;
      Sxz += p.x * z; Syz += p.y * z; Sz += z;
    }
    var a11 = Sxx, a12 = Sxy, a13 = Sx;
    var a21 = Sxy, a22 = Syy, a23 = Sy;
    var a31 = Sx, a32 = Sy, a33 = n;
    var b1 = -Sxz, b2 = -Syz, b3 = -Sz;
    // Cramer 法则共用子式（第一行展开求 det，三个未知数各按列替换行列式展开）
    var m11 = a22 * a33 - a23 * a32;
    var m12 = a21 * a33 - a23 * a31;
    var m13 = a21 * a32 - a22 * a31;
    var det = a11 * m11 - a12 * m12 + a13 * m13;
    if (!isFinite(det) || Math.abs(det) < 1e-9) return null;
    var D = (b1 * m11 - a12 * (b2 * a33 - b3 * a23) + a13 * (b2 * a32 - b3 * a22)) / det;
    var E = (a11 * (b2 * a33 - a23 * b3) - b1 * m12 + a13 * (a21 * b3 - b2 * a31)) / det;
    var F = (a11 * (a22 * b3 - b2 * a32) - a12 * (a21 * b3 - b2 * a31) + b1 * m13) / det;
    var cx = -D / 2, cy = -E / 2;
    var rr = cx * cx + cy * cy - F;
    if (!isFinite(rr) || rr <= 0) return null;
    return { cx: cx, cy: cy, r: Math.sqrt(rr) };
  }

  // 角覆盖：相邻点方位角差连续展开（跨 ±π 跳变折叠到最短路径）后取绝对值累加
  function angularSweep(pts, cx, cy) {
    var sweep = 0, prev = null;
    for (var i = 0; i < pts.length; i++) {
      var a = Math.atan2(pts[i].y - cy, pts[i].x - cx);
      if (prev !== null) {
        var d = a - prev;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        sweep += Math.abs(d);
      }
      prev = a;
    }
    return sweep;
  }

  function scoreStroke(points) {
    var fit = fitCircle(points);
    if (!fit) return null;
    var rs = [], i, sum = 0;
    for (i = 0; i < points.length; i++) {
      var r = Math.hypot(points[i].x - fit.cx, points[i].y - fit.cy);
      rs.push(r); sum += r;
    }
    var mean = sum / rs.length;
    if (mean < 8) return null; // 拟合半径过小 = 误触/抖点，不作有效笔画
    var acc = 0;
    for (i = 0; i < rs.length; i++) { var dv = rs[i] - mean; acc += dv * dv; }
    var cv = Math.sqrt(acc / rs.length) / mean;
    var sweepCov = Math.min(1, angularSweep(points, fit.cx, fit.cy) / (2 * Math.PI));
    var last = points[points.length - 1];
    var gap = Math.hypot(points[0].x - last.x, points[0].y - last.y) / (2 * fit.r);
    var roundness = Math.max(0, 1 - cv / 0.35);
    var overlap = Math.max(0, 1 - gap / 0.25);
    var score = 100 * (0.4 * roundness + 0.35 * sweepCov + 0.25 * overlap);
    return {
      score: Math.round(score * 10) / 10,
      roundness: roundness,
      closure: sweepCov,
      overlap: overlap,
      cx: fit.cx, cy: fit.cy, r: fit.r,
      cv: cv, gap: gap
    };
  }

  function grade(s) {
    if (s >= 95) return '人形圆规';
    if (s >= 88) return '宗师级';
    if (s >= 78) return '熟练';
    if (s >= 60) return '入门';
    return '灵魂画手';
  }

  window.__drawCircleCore = {
    fitCircle: fitCircle,
    angularSweep: angularSweep,
    scoreStroke: scoreStroke,
    grade: grade,
    WEIGHTS: { roundness: 0.4, closure: 0.35, overlap: 0.25 },
    THRESH: { cv: 0.35, gap: 0.25, minR: 8 }
  };
})();
