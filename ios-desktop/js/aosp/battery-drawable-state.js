// ==================== aosp/battery-drawable-state.js — 电池四态 ColorProfile（#194） ====================
//
// 权威源（aosp-mirror/platform_frameworks_base @ main 实拉；快照 docs/reference/frameworks-base/
// battery/ 两件）：
//   - unified/BatteryDrawableState.kt（149 行快照）L26-34：
//       enum class ColorProfile { None(灰默认), Active(绿=充电), Warning(黄=省电), Error(红=低电) }
//       —— 四态互斥，由 (level, charging, saver) 映射
//   - graph/ThemedBatteryDrawable.kt（425 行快照，LineageOS lineage-22.2 同常量交叉验证）：
//       L416-418  WIDTH=12f / HEIGHT=20f / CRITICAL_LEVEL=20（竖形 12:20；低电阈值）
//       L231      batteryLevel <= CRITICAL_LEVEL && !charging → 低电 error 路径
//                 （**!charging 实锤：充电优先于低电**——充电中低电不显示红色）
//       L246      powerSaveEnabled → errorPaint + 叠画 scaledPlus（加号色 = ?attr/colorError）
//       L256-261  batteryColorForLevel：charging || powerSaveEnabled → fillColor（else
//                 getColorForLevel）—— 充电/省电色高于档位色
//       L317      invertFillIcon = if (l >= 67) true else if (l <= 33) false else
//                 invertFillIcon（icon 反白迟滞：中间区不翻转，防抖）
//   - graph/BatteryMeterDrawableBase.java（行号锚，未入库全文）：
//       L44 ASPECT_RATIO=.58f / L46 RADIUS_RATIO=1/17 / L66 FULL=96（≥96 视为满电）/
//       L68 BOLT_LEVEL_THRESHOLD=0.3f（低填充时 bolt 转不透明保对比度）
//
// md3 网页映射（诚实标注）：
//   - 四态 → CSS class：is-charging（Active，充电色保持现状 primary 系）/
//     battery-saver（Warning → --md-tertiary 近似 AOSP saver 黄）/
//     battery-critical（Error → --md-error）/ 无 class（None，恒 --md-primary）
//   - profile 优先级：charging > saver > critical（charging 优先 = L231 !charging 实锤；
//     saver 优先于低电 = ThemedBatteryDrawable 绘制顺序 L231 先画 L246 后画覆盖；
//     charging+saver 并发 → Active，与 L258 when 合并支「charging || powerSaveEnabled →
//     fillColor」由外部 state.color 设 Active 语义一致）
//   - invertFillIcon 迟滞：服务 icon 反白形态（竖形图标填充反转），md3 水平胶囊无此形态，
//     纯函数层保留逐字语义（测试覆盖迟滞防抖），status-bar 暂不消费
//   - FULL=96 满电折算 → status-bar 填充宽度 fillFraction×100（96% 起显示满格）
//   - 几何裁决（议题建议 3）：只做色彩语义零布局风险；12:20 竖形/闪电挖洞/盾牌配件远期
//
// 纯逻辑模块：零 DOM、零 battery-service 依赖。

/** ThemedBatteryDrawable.kt L418: private const val CRITICAL_LEVEL = 20 */
export const CRITICAL_LEVEL = 20;
/** ThemedBatteryDrawable.kt L317 迟滞双阈值 */
export const INVERT_FILL_HIGH = 67;
export const INVERT_FILL_LOW = 33;
/** BatteryMeterDrawableBase.java L66: private static final int FULL = 96; */
export const FULL_LEVEL = 96;
/** BatteryMeterDrawableBase.java L68: BOLT_LEVEL_THRESHOLD = 0.3f */
export const BOLT_LEVEL_THRESHOLD = 0.3;

/** BatteryDrawableState.kt L26-34 enum class ColorProfile 同构 */
export const COLOR_PROFILE = Object.freeze({
  NONE: 'None',          // Grayscale is the default color
  ACTIVE: 'Active',      // Green for e.g., charging
  WARNING: 'Warning',    // Yellow for e.g., battery saver
  ERROR: 'Error',        // Red for e.g., low battery
});

/** 四态互斥映射（BatteryDrawableState ColorProfile 消费口径 + ThemedBatteryDrawable
    判据合成；优先级推导见文件头映射决策）：
    @param {number} level 0-100
    @param {boolean} charging
    @param {boolean} saver */
export function colorProfile(level, charging, saver) {
  if (charging) return COLOR_PROFILE.ACTIVE;
  if (saver) return COLOR_PROFILE.WARNING;
  if (level <= CRITICAL_LEVEL) return COLOR_PROFILE.ERROR;
  return COLOR_PROFILE.NONE;
}

/** ThemedBatteryDrawable.kt L317 迟滞逐字同构（有状态函数的纯化形态：
    prev = 上一态；level >= 67 → true / level <= 33 → false / 中间区保持 prev） */
export function invertFillIcon(prev, level) {
  if (level >= INVERT_FILL_HIGH) return true;
  if (level <= INVERT_FILL_LOW) return false;
  return !!prev;
}

/** BatteryMeterDrawableBase.java L66 FULL=96 满电折算：≥96 → 1.0（不再部分填充），
    其余 level/100（L44 ASPECT_RATIO 几何不在 md3 色彩语义范围） */
export function fillFraction(level) {
  if (level >= FULL_LEVEL) return 1;
  return Math.max(0, level) / 100;
}

/** BatteryMeterDrawableBase.java L68 BOLT_LEVEL_THRESHOLD=0.3：低填充时 bolt 转不透明
    （true=不透明），保低电充电对比度 */
export function boltOpaque(fraction) {
  return fraction < BOLT_LEVEL_THRESHOLD;
}
