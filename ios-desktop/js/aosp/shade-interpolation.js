// ==================== shade-interpolation.js — ShadeInterpolation.kt 1:1 移植 ====================
// 源码：AOSP android-17.0.0_r1 packages/SystemUI/animation/src/com/android/systemui/animation/
// ShadeInterpolation.kt（全文 39 行、零 Android 依赖纯数学，#144 逐字直译，#147 候选池首件）。
// 定义真机下拉 Shade 的层次感三函数：
//  * getNotificationScrimAlpha：scrim 在 expansion 0→0.5 区间走完 α 0→1（下拉到一半遮罩已全黑）
//  * getContentAlpha：内容在 expansion 0.3→1 区间走完 α 0→1（内容比遮罩晚起步，先暗背景再浮内容）
//  * interpolateEaseInOut：先 ×1.2−0.2 预映射（起步延迟带：前 1/6 输入压为 0），再套余弦
//    ease-in-out（Math.cos，非常见贝塞尔）；源码用 Float 字面量 3.14159f，直译保留、不用 Math.PI

/**
 * MathUtils.constrainedMap(resultMin, resultMax, valueMin, valueMax, value) 等价实现：
 * 把 value 从 [valueMin, valueMax] 线性映射到 [resultMin, resultMax]，先钳位输入再映射，
 * 输出恒落在 [resultMin, resultMax]；valueMin===valueMax 时退化为阶跃（同 framework 语义）。
 */
export function constrainedMap(resultMin, resultMax, valueMin, valueMax, value) {
  if (valueMin === valueMax) return value <= valueMin ? resultMin : resultMax;
  let t = (value - valueMin) / (valueMax - valueMin);
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return resultMin + t * (resultMax - resultMin);
}

/** interpolateEaseInOut：×1.2−0.2 预映射 + 余弦 ease-in-out（ShadeInterpolation.kt 私有函数导出供测试） */
export function interpolateEaseInOut(fraction) {
  const mappedFraction = fraction * 1.2 - 0.2;
  if (mappedFraction <= 0) return 0;
  const oneMinusFrac = 1 - mappedFraction;
  return 1 - 0.5 * (1 - Math.cos(3.14159 * oneMinusFrac * oneMinusFrac));
}

/** 通知遮罩 α：expansion 0→0.5 → α 0→1（下拉一半遮罩全黑；过拉段经 constrainedMap 钳位恒 1） */
export function getNotificationScrimAlpha(fraction) {
  const mappedFraction = constrainedMap(0, 1, 0, 0.5, fraction);
  return interpolateEaseInOut(mappedFraction);
}

/** Shade 内容 α：expansion 0.3→1 → α 0→1（内容比遮罩晚起步，#83 QS 纵向扩展备料） */
export function getContentAlpha(fraction) {
  const mappedFraction = constrainedMap(0, 1, 0.3, 1, fraction);
  return interpolateEaseInOut(mappedFraction);
}

// ==================== v10.01 #155 blur 半径跟手映射（BlurUtils.setBlurRadius 同构） ====================
//
// 议题 #155：真机 SystemUI 下拉模糊由 BlurUtils.setBlurRadius(float) 在拖拽进度中连续驱动，
// 非到位突变。BlurUtils.kt 本体 16-QPR2 镜像路径 404（statusesbar/phone 旧路径已重构），
// 按议题实施方向建议 1 主曲线「0 → 20px 线性」落位（线性为议题建议原文给出的合法选项，
// 验收一「拖拽至 50% 时已呈现约一半模糊强度」逐字达标；后续真机录屏逐帧校准可换
// easeInOut——曲线升级点只在本函数，单源在录）。
//
// 单源纪律（建议 4）：与 #144 的 α 插值共用同一 fraction 源（applyPanelVisual 的
// overlayOpacity），但区间/曲线解耦——scrim α 走 0→0.5 ease-in-out（#144 源码 1:1 零触碰），
// blur 半径走 0→1 线性；两函数输入同源、输出各自映射，无双曲线打架面。
//
// 消费端：desktop-blur.js setPanelBlurProgress（canvas 预烘焙层半径进度——web 软件光栅下
// backdrop-filter 逐帧插值受 #86-H2「frost 与 motion 互斥」性能裁决约束（33-50ms/帧），
// 拖拽中渐进观感由 canvas 层承担（纯合成器 opacity，零重滤波）；underlay 落定 frost 保留。

/** 模糊半径上限（与 .pp-blur-underlay v7.32 实证值 blur(20px) 一致） */
export const SHADE_BLUR_MAX_PX = 20;

/**
 * 拖拽 fraction（0-1）→ blur 半径 px（线性 0→maxPx；越界经 constrainedMap 钳位）。
 * BlurUtils.setBlurRadius 拖拽连续驱动同构：50% 拉程 → 一半半径。
 */
export function getShadeBlurRadius(fraction, maxPx = SHADE_BLUR_MAX_PX) {
  return constrainedMap(0, maxPx, 0, 1, fraction);
}

/** 归一化模糊强度（0-1，maxPx=1 的半径映射；canvas 预烘焙层以 opacity 表达半径进度） */
export function getShadeBlurStrength(fraction) {
  return getShadeBlurRadius(fraction, 1);
}
