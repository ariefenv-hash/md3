// ==================== m3e.js — Material 3 Expressive 组件内核（v7.75 忠实源文件版） ====================
//
// 官方依据（m3.material.io，2025-05 M3 Expressive 更新）：
//   • Loading indicator —— "The active indicator is a looping shape morph sequence
//     composed of seven unique Material 3 shapes"；默认 48dp（shape container 38dp）；
//     用于 <5s 短等待、下拉刷新；颜色角色 Primary（contained 变体 on-primary-container
//     / primary-container）。
//   • Split button —— 主按钮 + 菜单图标按钮两段：激活时拖尾按钮 "spins and changes
//     shape"，内角随 hover/focus/pressed 变形。
//   • Button group（connected）—— 相邻按钮共享边界，按压时内角变形。
//
// v7.75 按用户要求**忠实议题 #9 参考源文件 2.html 重写**：废除 v7.72~v7.74 的极坐标
// 近似（r(θ)=R·(1+a·cos(nθ))·s —— 与官方形状不符），改为源文件的完整几何管线：
//   • MaterialShapes 顶点表（SoftBurst→Cookie9→Pentagon→Pill→Sunny→Cookie4→Oval 环形）
//   • RoundedPolygon 圆角算法（buildOutline，smoothing=0 纯圆弧）
//   • 形变 = 弧长等分重采样（M=256）+ 两级环形对齐 + 笛卡尔插值（buildMorph）
//   • 官方常数：spring(0.6, 200) · MorphInterval=650ms · 全局旋转 360°/4666ms
//   • 与 iframe 侧 m3e-mini.js 数学同构（apps/_shared/m3e-mini.js，改一处同步另一处）
//
// 本模块提供：
//   1. 纯函数内核（可测试）：七形顶点表 + 弧长重采样 + 形变配对 + 官方 spring
//   2. LoadingIndicator 引擎（canvas 逐帧描形，颜色跟随 currentColor / MD3 角色）
//   3. window.__m3eLoader 桥（沙箱应用脚本经此挂载，如文件应用导入 snack）
//   4. SplitButton / ButtonGroup 的 DOM 工厂（供宿主模块使用；沙箱应用用静态类 + m3e.css）
//
// 性能纪律：单 rAF 循环、document.hidden 自动暂停、元素脱文档自回收、
// prefers-reduced-motion 降级为呼吸圆点静帧、100ms 看门狗兜底（参考件同款）。

import { state } from './state.js';

// ---------- 官方常数（LoadingIndicator.kt / 参考件 2.html 逐字） ----------
export const M3E_LOADER_SEGMENT_MS = 650; // 官方 MorphIntervalMillis
export const M3E_GLOBAL_ROTATION_MS = 4666; // 官方 GlobalRotationDurationMillis
const SPRING_DAMPING = 0.6; // 官方 dampingRatio
const SPRING_STIFFNESS = 200; // 官方 stiffness
const ActiveIndicatorScale = 38 / 48;
const MORPH_POINTS = 256; // 弧长重采样点数 M（源文件同款）
const TAU = Math.PI * 2;
const EPS = 1e-6;

// ---------- 官方 spring 进度（LoadingIndicator.kt：spring(0.6, 200, visibilityThreshold=0.1)） ----------
const SPRING_W = Math.sqrt(SPRING_STIFFNESS);
const SPRING_WD = SPRING_W * Math.sqrt(1 - SPRING_DAMPING * SPRING_DAMPING);
const SPRING_T_HOLD = Math.log(1.25 / 0.1) / (SPRING_DAMPING * SPRING_W);
/**
 * 官方 spring 形变进度：@param tau 段内秒数 [0,∞) → 进度 [0,1]
 */
export function m3eSpringProgress(tau) {
  if (tau >= SPRING_T_HOLD) return 1;
  return 1 - Math.exp(-SPRING_DAMPING * SPRING_W * tau)
    * (Math.cos(SPRING_WD * tau) + SPRING_DAMPING * SPRING_W / SPRING_WD * Math.sin(SPRING_WD * tau));
}

// ---------- MaterialShapes 几何管线（参考件 2.html 1:1 移植） ----------
const pt = (x, y, r = 0) => ({ x, y, r, sm: 0 });

function doRepeat(points, reps, cx = 0.5, cy = 0.5, mirror = false) {
  const ang = points.map((p) => Math.atan2(p.y - cy, p.x - cx));
  const dst = points.map((p) => Math.hypot(p.x - cx, p.y - cy));
  const out = [];
  if (mirror) {
    const total = reps * 2, sec = TAU / total;
    for (let rep = 0; rep < total; rep++)
      for (let idx = 0; idx < points.length; idx++) {
        const i = (rep % 2 === 0) ? idx : points.length - 1 - idx;
        if (i > 0 || rep % 2 === 0) {
          const a = (rep % 2 === 0) ? sec * rep + ang[i]
                                    : sec * rep + sec - ang[i] + 2 * ang[0];
          out.push({ x: Math.cos(a) * dst[i] + cx,
                     y: Math.sin(a) * dst[i] + cy, r: points[i].r, sm: points[i].sm });
        }
      }
  } else {
    for (let rep = 0; rep < reps; rep++) {
      const a = TAU * rep / reps, c = Math.cos(a), s = Math.sin(a);
      for (const p of points) {
        const dx = p.x - cx, dy = p.y - cy;
        out.push({ x: dx * c - dy * s + cx, y: dx * s + dy * c + cy, r: p.r, sm: p.sm });
      }
    }
  }
  return out;
}
const starPts = (num, R, inner, r) => {
  const o = [];
  for (let i = 0; i < num * 2; i++) {
    const a = Math.PI * i / num, rad = (i % 2 === 0) ? R : inner;
    o.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, r, sm: 0 });
  }
  return o;
};
const circlePts = (num, R) => {
  const rad = R / Math.cos(Math.PI / num), o = [];
  for (let i = 0; i < num; i++) {
    const a = TAU * i / num;
    o.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, r: R, sm: 0 });
  }
  return o;
};
const rotPts = (pts, deg) => {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return pts.map((p) => ({ x: p.x * c - p.y * s, y: p.x * s + p.y * c, r: p.r, sm: p.sm }));
};
const scaleYPts = (pts, k) => pts.map((p) => ({ x: p.x, y: p.y * k, r: p.r, sm: p.sm }));

/** RoundedPolygon 圆角轮廓（源文件 buildOutline 逐字：纯圆弧，smoothing=0） */
function buildOutline(vIn) {
  const V = [];
  for (const p of vIn) {
    const q = V[V.length - 1];
    if (!q || Math.hypot(p.x - q.x, p.y - q.y) > 1e-4) V.push(p);
  }
  if (V.length > 1 && Math.hypot(V[0].x - V[V.length - 1].x, V[0].y - V[V.length - 1].y) <= 1e-4) V.pop();
  const n = V.length;

  const C = V.map((p1, i) => {
    const p0 = V[(i + n - 1) % n], p2 = V[(i + 1) % n];
    const o = { p1, r: p1.r, d1: null, d2: null, erc: 0, ec: 0, deg: true };
    const v01 = [p0.x - p1.x, p0.y - p1.y], v21 = [p2.x - p1.x, p2.y - p1.y];
    const d01 = Math.hypot(v01[0], v01[1]), d21 = Math.hypot(v21[0], v21[1]);
    if (d01 > EPS && d21 > EPS && p1.r > 0) {
      const d1 = [v01[0] / d01, v01[1] / d01], d2 = [v21[0] / d21, v21[1] / d21];
      const cosA = d1[0] * d2[0] + d1[1] * d2[1];
      const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
      o.d1 = d1; o.d2 = d2; o.deg = false;
      if (sinA > 1e-3) o.erc = p1.r * (cosA + 1) / sinA;
      o.ec = (1 + p1.sm) * o.erc;
    }
    return o;
  });

  const adj = C.map((c, i) => {
    const nx = C[(i + 1) % n].p1;
    const side = Math.hypot(nx.x - c.p1.x, nx.y - c.p1.y);
    const erc = c.erc + C[(i + 1) % n].erc;
    const ec = c.ec + C[(i + 1) % n].ec;
    if (erc > side) return { rc: side / (erc || 1), cr: 0 };
    if (ec > side) return { rc: 1, cr: (side - erc) / ((ec - erc) || 1) };
    return { rc: 1, cr: 1 };
  });

  const arcs = C.map((c, i) => {
    if (c.deg || c.erc < EPS) return null;
    const a0 = adj[(i + n - 1) % n], a1 = adj[i];
    const allow = Math.min(
      c.erc * a0.rc + (c.ec - c.erc) * a0.cr,
      c.erc * a1.rc + (c.ec - c.erc) * a1.cr);
    if (allow < EPS) return null;
    const cut = Math.min(allow, c.erc);
    const R = c.r * cut / c.erc;
    let bx = c.d1[0] + c.d2[0], by = c.d1[1] + c.d2[1];
    const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
    const cd = Math.sqrt(R * R + cut * cut);
    return {
      center: [c.p1.x + bx * cd, c.p1.y + by * cd],
      R,
      I0: [c.p1.x + c.d1[0] * cut, c.p1.y + c.d1[1] * cut],
      I2: [c.p1.x + c.d2[0] * cut, c.p1.y + c.d2[1] * cut],
      vertex: [c.p1.x, c.p1.y],
    };
  });

  const nrm = (a) => { while (a > Math.PI) a -= TAU; while (a <= -Math.PI) a += TAU; return a; };
  const out = [];
  for (let i = 0; i < n; i++) {
    const A = arcs[i];
    if (A) {
      const [cx, cy] = A.center;
      const a0 = Math.atan2(A.I0[1] - cy, A.I0[0] - cx);
      const am = Math.atan2(A.vertex[1] - cy, A.vertex[0] - cx);
      let d = nrm(Math.atan2(A.I2[1] - cy, A.I2[0] - cx) - a0);
      const dm = nrm(am - a0);
      if ((dm >= 0) !== (d >= 0) || Math.abs(dm) > Math.abs(d)) d += d > 0 ? -TAU : TAU;
      for (let s = 0; s <= 16; s++) {
        const a = a0 + d * s / 16;
        out.push([cx + A.R * Math.cos(a), cy + A.R * Math.sin(a)]);
      }
    } else out.push([C[i].p1.x, C[i].p1.y]);
    const B = arcs[(i + 1) % n];
    const end = A ? A.I2 : [C[i].p1.x, C[i].p1.y];
    const start = B ? B.I0 : [C[(i + 1) % n].p1.x, C[(i + 1) % n].p1.y];
    if (Math.hypot(start[0] - end[0], start[1] - end[1]) > 1e-6)
      for (let s = 1; s <= 4; s++)
        out.push([end[0] + (start[0] - end[0]) * s / 4, end[1] + (start[1] - end[1]) * s / 4]);
  }
  return out;
}

function normalizeUnit(pts) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of pts) {
    if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, s = 1 / Math.max(x1 - x0, y1 - y0);
  return pts.map((p) => [(p[0] - cx) * s + 0.5, (p[1] - cy) * s + 0.5]);
}

// 七形序列（源文件环形顺序）：SoftBurst → Cookie9 → Pentagon → Pill → Sunny → Cookie4 → Oval
const softBurst = normalizeUnit(buildOutline(doRepeat(
  [pt(0.193, 0.277, 0.053), pt(0.176, 0.055, 0.053)], 10)));
const cookie9 = normalizeUnit(buildOutline(rotPts(starPts(9, 1.0, 0.8, 0.5), -90)));
const pentagon = normalizeUnit(buildOutline(doRepeat(
  [pt(0.500, -0.009, 0.172), pt(1.030, 0.365, 0.164), pt(0.828, 0.970, 0.169)], 1, 0.5, 0.5, true)));
const pill = normalizeUnit(buildOutline(doRepeat(
  [pt(0.961, 0.039, 0.426), pt(1.001, 0.428), pt(1.000, 0.609, 1.0)], 2, 0.5, 0.5, true)));
const sunny = normalizeUnit(buildOutline(starPts(8, 1.0, 0.8, 0.15)));
// v8.18（#44）：cookie4 镜像参数修正 true→false——官方 MaterialShapes.kt cookie4()
// = customPolygon(listOf(PointNRound((1.237,1.236), 0.258), PointNRound((0.500,0.918), 0.233)), reps=4)
// 未传 mirroring → 默认 false（旋转重复 8 顶点，谷部 0.233 圆角完好）；
// 误传 true 时镜像分支产生 4 对 0.0005 级近重复谷部顶点（89.93°/90° …），
// buildOutline 邻接钳位把谷部圆角吞成微弧锐谷 → 尖角视觉过重（议题实锤）。
// pentagon/pill 官方明确 mirroring=true 保持不动（doRepeat 镜像公式本身与官方逐字一致）。
const cookie4 = normalizeUnit(buildOutline(doRepeat(
  [pt(1.237, 1.236, 0.258), pt(0.500, 0.918, 0.233)], 4, 0.5, 0.5, false)));
const oval = normalizeUnit(buildOutline(rotPts(scaleYPts(circlePts(8, 1.0), 0.64), -45)));

/** 七个 MaterialShapes 单位化顶点多边形（Float64Array，M×2 笛卡尔点） */
export const M3E_LOADER_SHAPES = [softBurst, cookie9, pentagon, pill, sunny, cookie4, oval];

/** 形变 = 弧长等分重采样（M=256）+ 两级环形对齐 + 笛卡尔插值（源文件 resample/buildMorph） */
function resample(pts, start) {
  const n = pts.length, cum = [0];
  let total = 0;
  for (let i = 1; i <= n; i++) {
    const a = pts[(start + i - 1) % n], b = pts[(start + i) % n];
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    cum.push(total);
  }
  const o = new Float64Array(MORPH_POINTS * 2);
  let j = 0;
  for (let k = 0; k < MORPH_POINTS; k++) {
    const tgt = total * k / MORPH_POINTS;
    while (j < n && cum[j + 1] < tgt) j++;
    const seg = cum[j + 1] - cum[j] || 1e-9, f = (tgt - cum[j]) / seg;
    const a = pts[(start + j) % n], b = pts[(start + j + 1) % n];
    o[k * 2] = a[0] + (b[0] - a[0]) * f;
    o[k * 2 + 1] = a[1] + (b[1] - a[1]) * f;
  }
  return o;
}
function buildMorph(A, B) {
  const a = resample(A, 0), b = resample(B, 0);
  let best = 0, bestD = Infinity;
  for (let s = 0; s < MORPH_POINTS; s++) {
    let d = 0;
    for (let i = 0; i < MORPH_POINTS; i += 4) {
      const bi = ((i + s) % MORPH_POINTS) * 2;
      d += (a[i * 2] - b[bi]) ** 2 + (a[i * 2 + 1] - b[bi + 1]) ** 2;
    }
    if (d < bestD) { bestD = d; best = s; }
  }
  let bf = best, df = Infinity;
  for (let ds = -2; ds <= 2; ds++) {
    const s = (best + ds + MORPH_POINTS) % MORPH_POINTS;
    let d = 0;
    for (let i = 0; i < MORPH_POINTS; i++) {
      const bi = ((i + s) % MORPH_POINTS) * 2;
      d += (a[i * 2] - b[bi]) ** 2 + (a[i * 2 + 1] - b[bi + 1]) ** 2;
    }
    if (d < df) { df = d; bf = s; }
  }
  const bs = new Float64Array(MORPH_POINTS * 2);
  for (let i = 0; i < MORPH_POINTS; i++) {
    const bi = ((i + bf) % MORPH_POINTS) * 2;
    bs[i * 2] = b[bi]; bs[i * 2 + 1] = b[bi + 1];
  }
  return { a, b: bs };
}
/** 七对相邻形变缓冲（环形：Oval → SoftBurst 闭合） */
export const M3E_LOADER_MORPHS = M3E_LOADER_SHAPES.map((s, i) => buildMorph(s, M3E_LOADER_SHAPES[(i + 1) % M3E_LOADER_SHAPES.length]));

/** calculateScaleFactor（源文件逐字）：多边形最窄投影直径比 × ActiveIndicatorScale */
function calculateScaleFactor(all) {
  let f = 1;
  for (const pts of all) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) {
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    }
    const w = x1 - x0, h = y1 - y0;
    let side = 0;
    for (let k = 0; k < 180; k++) {
      const phi = k * Math.PI / 180, c = Math.cos(phi), s = Math.sin(phi);
      let hp = 0, hn = 0;
      for (const p of pts) {
        const d = (p[0] - 0.5) * c + (p[1] - 0.5) * s;
        if (d > hp) hp = d;
        if (-d > hn) hn = -d;
      }
      if (hp + hn > side) side = hp + hn;
    }
    f = Math.min(f, Math.max(w / side, h / side));
  }
  return f;
}
export const M3E_SHAPE_SCALE_FACTOR = calculateScaleFactor(M3E_LOADER_SHAPES) * ActiveIndicatorScale;

// ---------- 主题动态色（v7.77，参考件 2.html readColors 语义） ----------
// 参考件在主题切换时调用 readColors() 重读 CSS 变量；这里以 documentElement
// 属性观察实现同等语义：深浅色 / 动态色相（--md-h）变更即重读，
// canvas 指示器的前景/圆形容器色实时跟随主题（含已挂载的长生命周期实例）。
const themeCbs = new Set();
let themeMo = null;
function onThemeChange(cb) {
  themeCbs.add(cb);
  if (themeMo || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  themeMo = new MutationObserver(() => {
    for (const cb2 of themeCbs) { try { cb2(); } catch (e) { /* 单例失败不阻断其余 */ } }
  });
  themeMo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
}
function offThemeChange(cb) { themeCbs.delete(cb); }

// ---------- LoadingIndicator 引擎 ----------

/**
 * 创建 M3E LoadingIndicator（48dp 默认，contained 变体带 primary-container 底盘）。
 * @param {{ size?: number, contained?: boolean, color?: string, bgColor?: string,
 *          fgVar?: string, bgVar?: string }} [opts]
 * @returns {{ el: HTMLDivElement, stop: () => void }}
 */
export function createM3eLoadingIndicator(opts = {}) {
  const size = opts.size || 48;
  const contained = !!opts.contained;
  const el = document.createElement('div');
  el.className = 'm3e-loader' + (contained ? ' m3e-loader-contained' : '');
  el.style.width = size + 'px';
  el.style.height = size + 'px';

  const canvas = document.createElement('canvas');
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  el.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return { el, stop() {} };

  // 颜色角色：显式指定 > MD3 角色（md3-tokens.css）> Material 兜底
  // v7.77：CSS 角色色改为「主题动态」——主题变更时重读（参考件 readColors 语义）
  const readVar = (name, fb) => {
    try {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fb;
    } catch (e) { return fb; }
  };
  const fgVarName = opts.fgVar || (contained ? '--md-on-primary-container' : '--md-primary');
  const bgVarName = opts.bgVar || '--md-primary-container';
  const fgFallback = contained ? '#21005D' : '#6750A4';
  let fgColor = opts.color || readVar(fgVarName, fgFallback);
  let bgColor = contained ? (opts.bgColor || readVar(bgVarName, '#EADDFF')) : null;
  let staticPainted = false;
  function paintStaticOnce() {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);
    ctx.translate(size / 2, size / 2);
    if (bgColor) {
      ctx.beginPath(); ctx.arc(0, 0, BOX / 2, 0, TAU);
      ctx.fillStyle = bgColor; ctx.fill();
    }
    ctx.globalAlpha = 0.5 + 0.4 * Math.sin(0 / 1600 * TAU);
    ctx.beginPath(); ctx.arc(0, 0, Math.max(1, U * 0.2), 0, TAU);
    ctx.fillStyle = fgColor; ctx.fill();
    ctx.restore();
    staticPainted = true;
  }
  function retheme() {
    if (!opts.color) fgColor = readVar(fgVarName, fgFallback);
    if (contained && !opts.bgColor) bgColor = readVar(bgVarName, '#EADDFF');
    if (staticPainted) paintStaticOnce(); // reduced-motion 静帧同步重绘新色
  }
  onThemeChange(retheme);

  // 源文件坐标映射：canvas 120 → BOX=96（48dp 组件盒）；此处 size → BOX=size×(96/120)
  const BOX = size * (96 / 120);
  const U = BOX * M3E_SHAPE_SCALE_FACTOR;

  let raf = 0;
  let stopped = false;
  const t0 = (typeof performance !== 'undefined' ? performance.now() : 0); // v7.74 实例自有时钟原点（官方 dt）
  let lastRender = t0;
  let watchdog = 0;

  function drawFrame(now) {
    // 官方 dt 时钟（钳 0 防负时间）：段序/形变/旋转全部由 dt 推导（源文件 draw 逐字语义）
    const dt = Math.max(0, now - t0);
    const seg = Math.floor(dt / M3E_LOADER_SEGMENT_MS);
    const tau = (dt - seg * M3E_LOADER_SEGMENT_MS) / 1000;
    const mt = m3eSpringProgress(tau);
    const N = M3E_LOADER_SHAPES.length;
    const morph = M3E_LOADER_MORPHS[((seg % N) + N) % N];
    // 官方旋转公式（LoadingIndicator.kt）：prog×90° + 段序累计 90° + 360°/4666ms 全局线性顺时针
    const rotDeg = mt * 90
      + ((((seg % 4) + 4) % 4) + 1) * 90
      + (dt / M3E_GLOBAL_ROTATION_MS * 360) % 360;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(size / 2, size / 2);
    if (bgColor) {
      ctx.beginPath(); ctx.arc(0, 0, BOX / 2, 0, TAU);
      ctx.fillStyle = bgColor; ctx.fill();
    }
    ctx.rotate(rotDeg * Math.PI / 180);
    const { a, b } = morph;
    ctx.beginPath();
    for (let i = 0; i < MORPH_POINTS; i++) {
      const x = (a[i * 2] + (b[i * 2] - a[i * 2]) * mt - 0.5) * U;
      const y = (a[i * 2 + 1] + (b[i * 2 + 1] - a[i * 2 + 1]) * mt - 0.5) * U;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fgColor;
    ctx.fill();
    ctx.restore();
  }

  function frame(now) {
    if (stopped) return;
    // 元素脱文档 → 自回收（snack 重建等场景零泄漏）
    if (!el.isConnected) { stopped = true; teardownWatchdog(); return; }
    // 页面隐藏 → 暂停积分（恢复由下一帧重入；visibility-heal 兜底）
    if (typeof document !== 'undefined' && document.hidden) {
      raf = requestAnimationFrame(frame);
      return;
    }
    drawFrame(now);
    lastRender = now;
    raf = requestAnimationFrame(frame);
  }

  // ---------- rAF 看门狗（参考件 2.html 同款） ----------
  // 后台标签回前台 / 主线程长任务后 rAF 停滞 >250ms 时，由 100ms 定时器巡检补帧；
  // rAF 恢复后自动让回（lastRender 已刷新，无双驱动）。停止时同步拆除。
  function teardownWatchdog() { if (watchdog) { clearInterval(watchdog); watchdog = 0; } }
  if (typeof setInterval === 'function') {
    watchdog = setInterval(() => {
      if (stopped || !el.isConnected) { stopped = true; teardownWatchdog(); return; }
      if (typeof document !== 'undefined' && document.hidden) return;
      const now = (typeof performance !== 'undefined' ? performance.now() : 0);
      if (now - lastRender > 250) { drawFrame(now); lastRender = now; }
    }, 100);
  }

  // prefers-reduced-motion：静态呼吸圆点（源文件 reduceMotion 分支，不启动循环）
  let reduced = false;
  try {
    reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* 环境缺失按未开启处理 */ }

  if (reduced) {
    paintStaticOnce();
  } else {
    // 同步首帧：挂载即呈现，不等首个 rAF（防节流环境白屏，参考件同款）
    drawFrame(t0);
    raf = requestAnimationFrame(frame);
  }

  return {
    el,
    stop() {
      stopped = true;
      teardownWatchdog();
      offThemeChange(retheme);
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    },
  };
}

/** 便捷挂载：向容器内挂载一枚加载指示器（已有则复用） */
export function mountM3eLoader(container, opts = {}) {
  if (!container || typeof container.appendChild !== 'function') return null;
  const existing = container.querySelector(':scope > .m3e-loader');
  if (existing) return { el: existing, stop() {} };
  const inst = createM3eLoadingIndicator(opts);
  container.appendChild(inst.el);
  return inst;
}

// ---------- 沙箱应用桥（files 导入 snack 等经 window.__m3eLoader 使用） ----------
export function initM3eBridge() {
  if (typeof window === 'undefined') return;
  window.__m3eLoader = {
    mount: (el, opts) => mountM3eLoader(el, opts),
    create: (opts) => createM3eLoadingIndicator(opts),
  };
}

// ---------- SplitButton / ButtonGroup DOM 工厂（宿主模块用） ----------

/**
 * M3E SplitButton：主按钮（icon+label）+ 菜单图标按钮（激活 spin + 变形）。
 * @param {{ icon?: string, label?: string, onPrimary?: Function, onMenu?: Function, menuIcon?: string }} opts
 * @returns {{ el: HTMLDivElement, setMenuOpen: (open: boolean) => void }}
 */
export function createM3eSplitButton(opts = {}) {
  const el = document.createElement('div');
  el.className = 'm3e-splitbtn';
  const lead = document.createElement('button');
  lead.type = 'button';
  lead.className = 'm3e-sb-lead';
  lead.innerHTML = (opts.icon || '') + (opts.label ? '<span class="m3e-sb-lbl"></span>' : '');
  if (opts.label) lead.querySelector('.m3e-sb-lbl').textContent = opts.label;
  const trail = document.createElement('button');
  trail.type = 'button';
  trail.className = 'm3e-sb-trail';
  trail.setAttribute('aria-label', 'menu');
  trail.innerHTML = opts.menuIcon || '';
  el.appendChild(lead);
  el.appendChild(trail);
  if (typeof opts.onPrimary === 'function') lead.addEventListener('click', opts.onPrimary);
  if (typeof opts.onMenu === 'function') {
    trail.addEventListener('click', (e) => {
      e.stopPropagation();
      opts.onMenu();
    });
  }
  return {
    el,
    setMenuOpen(open) { el.classList.toggle('m3e-sb-open', !!open); },
  };
}

/**
 * M3E connected ButtonGroup：相邻共享边界，激活段 secondary-container，按压内角变形。
 * @param {{ segments: Array<{ id: string, icon?: string, label: string, active?: boolean }>, onChange?: (id: string) => void }} opts
 * @returns {{ el: HTMLDivElement, setActive: (id: string) => void }}
 */
export function createM3eButtonGroup(opts = {}) {
  const el = document.createElement('div');
  el.className = 'm3e-btngroup';
  el.setAttribute('role', 'group');
  const segs = [];
  (opts.segments || []).forEach((seg) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'm3e-bg-seg' + (seg.active ? ' on' : '');
    b.dataset.segId = seg.id;
    b.innerHTML = (seg.icon || '') + '<span></span>';
    b.querySelector('span').textContent = seg.label;
    b.addEventListener('click', () => {
      el.querySelectorAll('.m3e-bg-seg').forEach((x) => x.classList.toggle('on', x === b));
      if (typeof opts.onChange === 'function') opts.onChange(seg.id);
    });
    el.appendChild(b);
    segs.push(b);
  });
  return {
    el,
    setActive(id) {
      segs.forEach((b) => b.classList.toggle('on', b.dataset.segId === id));
    },
  };
}

// 自动装配沙箱桥（main.js 侧 import 即生效）
if (typeof window !== 'undefined') {
  try { initM3eBridge(); } catch (e) { /* 桥装配失败不阻断启动 */ }
  // state 引用保活（与全局状态单一真源对齐；供未来动效倍率接入）
  void state;
}
