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
