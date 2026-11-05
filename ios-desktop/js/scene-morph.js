// ==================== scene-morph.js — QQS→QS 同面展开位姿插值（#83 · AOSP ShadeScene 同面生长语义） ====================
//
// #83 验收实证：AOSP 二次下拉不存在「换页」——QQS 的 2×2 大磁贴就是全量网格的
// 前 4 磁贴本体（同一套 tile 记录），展开是**同一表面生长**：大磁贴从大磁贴位姿
// 连续过渡到网格位姿、网格下方其余磁贴随面板高度增长逐步显现、头部/亮度条同面变形。
// md3 旧实现为双独立 DOM 列 + 轨道整页垂直平移（translate3d(0, -50%×p, 0)），
// QQS 磁贴不参与过渡、无位姿连续性 → 视觉即「翻一页」，与本议题验收直接相悖。
//
// 本模块 = 纯逻辑层（零 DOM，可单测快照）：
//   · 位姿差分 computePose / poseCssAt —— FLIP 式 translate+scale 插值
//     （transform-origin 0 0 语义：from 矩形顶点 + d + s·x = to 矩形顶点）
//   · 交接滞回阈 SWAP_ON/SWAP_OFF —— 位姿重合帧节点交接（QQS 节点隐、网格节点显），
//     回程反向交接；滞回带防边界抖动（双触发互斥）
//   · 折叠磁贴渐现曲线 foldedRevealAlpha —— AOSP「面板高度生长 → 折叠磁贴逐步显现」
//     的 web 等价（延迟渐现带，自创标注：源码为布局高度生长裁切，网页取透明度渐现近似）
//   · 通知区退场 notiAlpha/notiShiftPx —— 展开中通知列淡出+上推（不换页）
//
// DOM 接线（量测/逐帧直写/交接簿记）在 pull-down-gesture.js applySceneMorph。
// 兼容面：sceneProgress / tweenScene / switchPullPanel / --qs-squish 对外接口零变化；
// split ≥600px（transform none !important + display:contents）与 dual 模式
//（track 整体 display:none）天然不走本路径。

/** 交接阈值：p ≥ SWAP_ON 视为落定 QS 场景（节点交接：QQS 节点隐、网格节点显）。
 *  取 0.995 而非 1：tweenScene 收尾帧浮点噪声下保证交接必然发生（p=1 由 tween 终帧到达，
 *  但拖拽钳制/取整路径可能停在 0.999）。 */
export const SWAP_ON = 0.995;
/** 反向交接阈：p ≤ SWAP_OFF 回 Shade 场景（网格节点隐、QQS 节点显）。
 *  与 SWAP_ON 构成 [0.985, 0.995] 滞回带 —— 边界附近来回抖动不产生节点闪烁。 */
export const SWAP_OFF = 0.985;

/** 折叠磁贴渐现带（自创标注：源码为面板高度生长的布局裁切显现，web 取延迟渐现近似；
 *  演示值为手感调参非权威）。展开初段先让大磁贴位姿插值可读，后段折叠磁贴成批浮现。 */
export const REVEAL_START = 0.18;
export const REVEAL_END = 0.8;

/** 通知区退场参数：alpha 在 p∈[0, 0.5] 线性淡出；上推位移峰 -24px（easedP 二次缓出）。 */
export const NOTI_FADE_END = 0.5;
export const NOTI_SHIFT_PX = 24;

export function clamp01(v) {
  if (Number.isNaN(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/**
 * 位姿差分：from → to 的 FLIP 变换分量（translate + scale，transform-origin 0 0 语义）。
 * 调用方保证 from/to 在同一坐标系同帧量测（同为画布平移层的后代 → 公共平移对差分无影响）。
 * @returns {{dx:number, dy:number, sx:number, sy:number}} dx/dy 顶点位移，sx/sy 尺寸比
 */
export function computePose(fromRect, toRect) {
  const sx = fromRect.width > 0 ? toRect.width / fromRect.width : 1;
  const sy = fromRect.height > 0 ? toRect.height / fromRect.height : 1;
  return {
    dx: toRect.left - fromRect.left,
    dy: toRect.top - fromRect.top,
    sx,
    sy,
  };
}

/**
 * 量测守卫：矩形完备（有限数值）、尺寸非零、缩放比在合理带内（0.05..20）才可 morph。
 * 越界（布局未就绪/量测被 display:none 波及/异常布局）→ 调用方走交叉淡切兜底。
 */
export function isMorphable(fromRect, toRect) {
  if (!fromRect || !toRect) return false;
  const nums = [fromRect.left, fromRect.top, fromRect.width, fromRect.height,
    toRect.left, toRect.top, toRect.width, toRect.height];
  if (nums.some((n) => !Number.isFinite(n))) return false;
  if (fromRect.width <= 0 || fromRect.height <= 0 || toRect.width <= 0 || toRect.height <= 0) return false;
  const pose = computePose(fromRect, toRect);
  if (pose.sx < 0.05 || pose.sx > 20 || pose.sy < 0.05 || pose.sy > 20) return false;
  return true;
}

/**
 * progress 采样位姿：p=0 → ''（identity，交还 CSS 默认零内联）；p=1 → 精确落位 to。
 * 线性插值（跟手相位由手势驱动、补间相位由 tweenScene 的 bezierStandard 驱动，
 * 本函数保持线性 = 插值器外置，与 blur/squish 通道同构）。
 */
export function poseCssAt(fromRect, toRect, p) {
  const t = clamp01(p);
  if (t <= 0.0005) return '';
  const pose = computePose(fromRect, toRect);
  const dx = pose.dx * t;
  const dy = pose.dy * t;
  const sx = 1 + (pose.sx - 1) * t;
  const sy = 1 + (pose.sy - 1) * t;
  return `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
}

/** 交接判定（滞回带双触发互斥） */
export function shouldSwapOn(p) { return p >= SWAP_ON; }
export function shouldSwapOff(p) { return p <= SWAP_OFF; }

/** 折叠磁贴渐现 alpha：p < REVEAL_START 全隐，p > REVEAL_END 全显（1 → 交还 CSS 默认）。 */
export function foldedRevealAlpha(p) {
  const t = clamp01(p);
  if (t <= REVEAL_START) return 0;
  if (t >= REVEAL_END) return 1;
  return (t - REVEAL_START) / (REVEAL_END - REVEAL_START);
}

/** 通知区退场 alpha：p ∈ [0, NOTI_FADE_END] 线性淡出，之后保持 0。 */
export function notiAlpha(p) {
  return 1 - clamp01(clamp01(p) / NOTI_FADE_END);
}

/** 通知区上推位移（px，负值向上）：二次缓出（t² 感知更贴近生长节拍），峰 -NOTI_SHIFT_PX。 */
export function notiShiftPx(p) {
  const t = clamp01(p);
  return -NOTI_SHIFT_PX * t * t;
}
