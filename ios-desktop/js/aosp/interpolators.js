// ==================== aosp/interpolators.js — AOSP 框架曲线族求解器（#75 · 三期资产提前落地） ====================
//
// 取值纪律（同 #54，强制）：全部曲线定义取自 AOSP 源码实测原值，不因 md3 既有手感覆盖。
//   - emphasized / app_open_x：QuickstepTransitionManager 构造实测 pathData
//     （lineage-24.0 quickstep/src/com/android/launcher3/QuickstepTransitionManager.java）
//   - standard / emphasized_decelerate / emphasized_accelerate / fast_out_slow_in：
//     android_frameworks_base/core/res/res/interpolator/ 实测控制点
//   - NAV_FADE_IN / NAV_FADE_OUT：QuickstepTransitionManager 源码内硬编码 PathInterpolator
//   - decelerate(factor)：Android DecelerateInterpolator 解析式 y = 1 − (1−x)^factor
//
// 求解器形态：
//   - cubicBezier(x1,y1,x2,y2) —— 单段三次贝塞尔（WebKit UnitBezier 同构：Newton-Raphson
//     8 次迭代 + 二分兜底，x 单调前提下全局收敛）
//   - pathInterpolator(segments) —— PathInterpolator pathData 多段求解：每段
//     [c1x,c1y,c2x,c2y,x1,y1]（起点隐含承接上一段终点，首段起点恒 (0,0)）。
//     emphasized 与 app_open_x 均为两段路径，须按段定位后段内解 t，不能用单段 cubic-bezier 表达。
//
// 供 #75（原生预设）/#42（预测性返回）/#46（音乐三联动）/#68（最近任务）/#19（解锁动画）统一引用。

/** 区间钳制 */
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * 单段三次贝塞尔曲线求解器（时间量 x → 进度量 y）。
 * Newton-Raphson 8 次迭代起步，不收敛时二分兜底 —— WebKit UnitBezier 同构。
 * @param {number} x1 控制点 1 的 x
 * @param {number} y1 控制点 1 的 y
 * @param {number} x2 控制点 2 的 x
 * @param {number} y2 控制点 2 的 y
 * @returns {(x: number) => number} 求解函数（x ∈ [0,1] → y）
 */
export function cubicBezier(x1, y1, x2, y2) {
  // 贝塞尔系数展开（ax t³ + bx t² + cx t + dx 形式，避免逐帧 pow）
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const sampleDX = (t) => (3 * ax * t + 2 * bx) * t + cx;

  const solveT = (x) => {
    // Newton-Raphson：初值取 x 本身（单调曲线的良好近似）
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < 1e-7) return t;
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-7) break;
      t -= err / d;
    }
    // 二分兜底（Newton 不收敛 / 导数退化）
    let lo = 0;
    let hi = 1;
    t = clamp01(x);
    while (hi - lo > 1e-7) {
      const mid = (lo + hi) / 2;
      if (sampleX(mid) < x) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };

  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleY(solveT(x));
  };
}

/**
 * PathInterpolator pathData 多段求解器（AOSP PathInterpolator 同构语义）。
 * @param {number[][]} segments 每段 [c1x,c1y,c2x,c2y,x1,y1]，首段起点恒 (0,0)，
 *        后续段起点隐含承接上一段终点（pathData 的 C 命令连续拼接语义）
 * @returns {(x: number) => number} 求解函数（x ∈ [0,1] → y）
 */
export function pathInterpolator(segments) {
  // 预解析为绝对坐标段：{ x0, y0, c1x, c1y, c2x, c2y, x1, y1 }
  const segs = [];
  let px = 0;
  let py = 0;
  for (const s of segments) {
    const [c1x, c1y, c2x, c2y, x1, y1] = s;
    segs.push({ x0: px, y0: py, c1x, c1y, c2x, c2y, x1, y1 });
    px = x1;
    py = y1;
  }

  // 段内求解：局部 xi → Newton 解 t → y(t)
  const solveSeg = (seg, xi) => {
    const dx0 = seg.x0;
    const cx = 3 * seg.c1x;
    const bx = 3 * (seg.c2x - seg.c1x) - cx;
    const ax = 1 - cx - bx;
    // 注意：段内 x 以全局坐标表达（起止均为全局值），局部化须按段跨度归一
    const spanX = seg.x1 - seg.x0;
    // 局部化：X(t) = x0 + span·(t³ 系数形式) —— 直接以全局坐标解 t 更稳（免归一漂移）
    const X = (t) => {
      const u = 1 - t;
      return u * u * u * dx0 + 3 * u * u * t * seg.c1x + 3 * u * t * t * seg.c2x + t * t * t * seg.x1;
    };
    const dX = (t) => {
      const u = 1 - t;
      return 3 * u * u * (seg.c1x - dx0) + 6 * u * t * (seg.c2x - seg.c1x) + 3 * t * t * (seg.x1 - seg.c2x);
    };
    void cx; void bx; void ax; // 全局坐标直接解，弃局部展开
    let t = spanX > 0 ? (xi - seg.x0) / spanX : 1;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    for (let i = 0; i < 8; i++) {
      const err = X(t) - xi;
      if (Math.abs(err) < 1e-7) break;
      const d = dX(t);
      if (Math.abs(d) < 1e-7) break;
      t -= err / d;
      if (t < 0) t = 0;
      else if (t > 1) t = 1;
    }
    // 二分兜底
    if (Math.abs(X(t) - xi) > 1e-5) {
      let lo = 0;
      let hi = 1;
      while (hi - lo > 1e-7) {
        const mid = (lo + hi) / 2;
        if (X(mid) < xi) lo = mid;
        else hi = mid;
      }
      t = (lo + hi) / 2;
    }
    const u = 1 - t;
    return u * u * u * seg.y0 + 3 * u * u * t * seg.c1y + 3 * u * t * t * seg.c2y + t * t * t * seg.y1;
  };

  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // 按段定位（段按 endx 升序；x 落在段界上取后段 —— 连续拼接处两段 y 相等）
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      if (x <= seg.x1 + 1e-12 || i === segs.length - 1) return solveSeg(seg, x);
    }
    return 1;
  };
}

// ==================== AOSP 原值曲线族（逐条溯源） ====================

/**
 * emphasized（主时间轴）—— QuickstepTransitionManager.mOpeningInterpolator。
 * 源码：R.interpolator.emphasized（frameworks base res/interpolator/emphasized.xml）：
 * pathData "M 0,0 C 0.05,0 0.133333,0.06 0.166666,0.4 C 0.208333,0.82 0.25,1 1,1"
 */
export const EMPHASIZED_PATH = [
  [0.05, 0, 0.133333, 0.06, 0.166666, 0.4],
  [0.208333, 0.82, 0.25, 1, 1, 1],
];
export const EMPHASIZED = pathInterpolator(EMPHASIZED_PATH);

/**
 * app_open_x（X 位移专用）—— QuickstepTransitionManager.mOpeningXInterpolator。
 * 源码：R.interpolator.app_open_x：
 * pathData "M 0,0 C 0.1217,0.0462 0.15,0.4686 0.1667,0.66 C 0.1834,0.8878 0.1667,1 1,1"
 */
export const APP_OPEN_X_PATH = [
  [0.1217, 0.0462, 0.15, 0.4686, 0.1667, 0.66],
  [0.1834, 0.8878, 0.1667, 1, 1, 1],
];
export const APP_OPEN_X = pathInterpolator(APP_OPEN_X_PATH);

/** standard —— frameworks res/interpolator/standard.xml：cubic(0.2, 0, 0, 1) */
export const STANDARD = cubicBezier(0.2, 0, 0, 1);
/** standard_decelerate —— cubic(0, 0, 0, 1) */
export const STANDARD_DECELERATE = cubicBezier(0, 0, 0, 1);
/** emphasized_decelerate —— cubic(0.05, 0.7, 0.1, 1) */
export const EMPHASIZED_DECELERATE = cubicBezier(0.05, 0.7, 0.1, 1);
/** emphasized_accelerate —— cubic(0.3, 0, 0.8, 0.15) */
export const EMPHASIZED_ACCELERATE = cubicBezier(0.3, 0, 0.8, 0.15);
/** fast_out_slow_in —— cubic(0.4, 0, 0.2, 1)（Android 经典减速曲线） */
export const FAST_OUT_SLOW_IN = cubicBezier(0.4, 0, 0.2, 1);
/** NAV_FADE_IN —— QuickstepTransitionManager 硬编码 PathInterpolator(0,0,0,1) */
export const NAV_FADE_IN = cubicBezier(0, 0, 0, 1);
/** NAV_FADE_OUT —— QuickstepTransitionManager 硬编码 PathInterpolator(0.2,0,1,1) */
export const NAV_FADE_OUT = cubicBezier(0.2, 0, 1, 1);

/**
 * DecelerateInterpolator（factor 语义）：y = 1 − (1−x)^factor。
 * #75 启动动画 mBlurRadius / mBlurScrimAlpha 用 DECELERATE_1_5（factor=1.5）。
 * @param {number} [factor=1.5]
 * @returns {(x: number) => number}
 */
export function decelerate(factor = 1.5) {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return (x) => {
    const v = clamp01(x);
    return 1 - Math.pow(1 - v, f);
  };
}

/** DECELERATE_1_5 —— Interpolators.DECELERATE_1_5（blur/scrim 通道） */
export const DECELERATE_1_5 = decelerate(1.5);
