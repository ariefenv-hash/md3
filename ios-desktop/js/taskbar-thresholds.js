// ==================== taskbar-thresholds.js — Transient Taskbar 阈值体系纯函数核（#74，#72 二期） ====================
//
// 源码锚（#54 基线：LineageOS/android_packages_apps_Launcher3 lineage-24.0）：
//   · quickstep/src/com/android/quickstep/inputconsumers/TaskbarUnstashInputConsumer.java —— 唤出主逻辑
//   · quickstep/src/com/android/launcher3/taskbar/TaskbarThresholdUtils.java —— 阈值计算（本文件核心）
//   · quickstep/src/com/android/launcher3/taskbar/TaskbarStashViaTouchController.java —— 收起手势
//   · quickstep/src/com/android/launcher3/taskbar/TaskbarAutohideSuspendController.java —— 挂起标志位
//   · quickstep/res/values/dimens.xml —— 阈值基准数据点 / 倍率 / 24dp 收回 / -288dp 慢速
//
// 取值纪律（#74 同 #72 全局强制）：所有数值按源码实测原值落地。
//
// ⚠️ 关键陷阱（议题 §一.3 原文）：40dp/88dp/156dp/264dp **不是最终阈值**，只是
// 「用两台平板设备反推的基准数据点」（TaskbarThresholdUtils 源码注释原文：
// "Note that this value was calculated arbitrarily by using two tablet devices as data points."）。
// 真正生效的是公式：**阈值 = 屏幕短边 ÷ 80 → 转 dp → × 倍率**（自适应，非死值）。
// 实施必须走 computeTaskbarThreshold()，禁止直接硬编码 40dp。

// ==================== §1.3 阈值公式（TaskbarThresholdUtils.java 同构移植） ====================

/** SCREEN_UNITS —— "We divide the screen into this many parts"（源码 private static final float SCREEN_UNITS = 1/80f） */
export const TASKBAR_THRESHOLD_SCREEN_UNITS = 1 / 80;

/** DENSITY_DEVICE_STABLE —— 源码 dpiFromPx(screenPart, DENSITY_DEVICE_STABLE) 的稳定密度（160 = mdpi 基准） */
export const DENSITY_DEVICE_STABLE = 160;
/** 浏览器当前密度（CSS px 基准密度恒 1.0 → density = 160） */
export const BROWSER_DENSITY = 160;

/**
 * 阈值倍率表（quickstep/res/values/dimens.xml 实测 getFloat）：
 *   taskbar_nav_threshold_mult = 4.5          —— 唤出任务栏（本议题第一段）
 *   taskbar_app_window_threshold_mult = 10    —— 开始移动应用窗口（#68 交界）
 *   taskbar_home_overview_threshold_mult = 18 —— Home/Overview 分界（#68 交界）
 *   taskbar_catch_up_threshold_mult = 30      —— 滑动追上手指（#68 交界）
 */
export const TASKBAR_THRESHOLD_MULTIPLIERS = {
  nav: 4.5,
  appWindow: 10,
  homeOverview: 18,
  catchUp: 30,
};

/** 基准数据点存档（仅对照锚，非生效值 —— 议题 §一.3 陷阱条款） */
export const TASKBAR_THRESHOLD_BASELINE_DP = {
  nav: 40,
  appWindow: 88,
  homeOverview: 156,
  catchUp: 264,
};

/**
 * TaskbarThresholdUtils.getThreshold 同构移植。
 * 源码：screenPart = 短边 × SCREEN_UNITS（屏幕短边/80，px）
 *       defaultDp  = dpiFromPx(screenPart, DENSITY_DEVICE_STABLE)   → dp = px × 160 / stable
 *       thisDp     = dpToPx(defaultDp)                              → px = dp × density / 160
 *       return Math.round(thisDp × multiplier)
 * 浏览器侧 stable=density=160 两步互逆抵消 → 阈值 = round(短边/80 × 倍率)；
 * 密度参数保留以保持与源码公式逐字同构（并可供高分屏推演）。
 * @param {number} shortSidePx 屏幕短边（landscape 高 / 其余宽，源码 isLandscape ? heightPx : widthPx）
 * @param {number} multiplier  §MULTIPLIERS 倍率
 * @param {{stableDensity?:number, density?:number}} [opts]
 * @returns {number}
 */
export function computeTaskbarThreshold(shortSidePx, multiplier, opts = null) {
  const o = opts || {};
  const stable = o.stableDensity != null ? o.stableDensity : DENSITY_DEVICE_STABLE;
  const density = o.density != null ? o.density : BROWSER_DENSITY;
  const shortSide = Number(shortSidePx);
  const mult = Number(multiplier);
  if (!isFinite(shortSide) || !isFinite(mult) || shortSide <= 0) return 0;
  const screenPart = shortSide * TASKBAR_THRESHOLD_SCREEN_UNITS; // 屏幕短边 ÷ 80（px）
  const defaultDp = screenPart * (DENSITY_DEVICE_STABLE / stable); // dpiFromPx：px → dp
  const thisDp = defaultDp * (density / DENSITY_DEVICE_STABLE);    // dpToPx：dp → px
  return Math.round(thisDp * mult);
}

/**
 * 四段阈值一次算全（供 #74 第一段与 #68 未来分段合并复用 —— 议题 §三 约定）。
 * @param {number} shortSidePx 屏幕短边 px
 * @param {{stableDensity?:number, density?:number}} [opts]
 * @returns {{nav:number, appWindow:number, homeOverview:number, catchUp:number}}
 */
export function taskbarThresholds(shortSidePx, opts = null) {
  const m = TASKBAR_THRESHOLD_MULTIPLIERS;
  return {
    nav: computeTaskbarThreshold(shortSidePx, m.nav, opts),
    appWindow: computeTaskbarThreshold(shortSidePx, m.appWindow, opts),
    homeOverview: computeTaskbarThreshold(shortSidePx, m.homeOverview, opts),
    catchUp: computeTaskbarThreshold(shortSidePx, m.catchUp, opts),
  };
}

// ==================== §1.4/§1.5 手势阈值 dimen（quickstep/res/values/dimens.xml 实测） ====================

/** taskbar_to_nav_threshold —— 下滑多远收回（24dp，固定 dimen，不入倍率公式） */
export const TASKBAR_TO_NAV_THRESHOLD = 24;
/** taskbar_slow_velocity_y_threshold —— 慢速阈值（-288dp，负号 = 向上量纲；触发背景 alpha 动画） */
export const TASKBAR_SLOW_VELOCITY_Y_THRESHOLD = -288;
/** taskbar_unstash_input_area —— 唤出热区宽（316dp 居中；#72 taskbar-core 已有同值常量，此处语义引用） */
export const TASKBAR_UNSTASH_INPUT_AREA_DP = 316;
/** HOVER_TASKBAR_UNSTASH_TIMEOUT —— 悬停唤出超时（500ms，§1.7） */
export const HOVER_TASKBAR_UNSTASH_TIMEOUT = 500;
/** NUM_MOTION_MOVE_THRESHOLD —— 悬停路径 move 事件数阈值（§1.7） */
export const NUM_MOTION_MOVE_THRESHOLD = 3;
/**
 * 快速下滑甩动（isFlingDown）判定速度 —— 源码未给独立 dimen，
 * 复用 taskbar_slow_velocity_y_threshold 的 288dp/s 量纲、方向取正（向下）。
 * 刻意复用已注明（#74 取值纪律：偏离须注明）。
 */
export const TASKBAR_FLING_DOWN_VELOCITY = 288;
/** 触控 slop 近似（ViewConfiguration ~8dp；AOSP isInExtendedSlopRegion 在 md3 无扩展边缘区语义，恒 false，见 unstashDecision） */
export const TOUCH_SLOP_DP = 8;

// ==================== §1.4 唤出判定（TaskbarUnstashInputConsumer ACTION_MOVE 同构） ====================
// 源码：
//   float dY = mLastPos.y - mDownPos.y;                       // 上滑为负
//   boolean passed = dY < 0 && Math.abs(dY) >= mTaskbarNavThreshold;
//   if (!mHasPassedTaskbarNavThreshold && passed && !mGestureState.isInExtendedSlopRegion()) → unstash

/**
 * 唤出判定纯函数。
 * @param {{dy:number, threshold:number, alreadyFired?:boolean, inExtendedSlop?:boolean}} p
 *   dy：屏幕系位移（向下为正/上滑为负，与源码 dY 同号）；threshold：§1.3 公式值；
 *   inExtendedSlop：md3 无扩展边缘 slop 区语义，调用方恒传 false（刻意偏离已注明）。
 * @returns {{fired:boolean}}
 */
export function unstashDecision(p) {
  const dy = Number(p.dy) || 0;
  const thr = Number(p.threshold) || 0;
  if (p.alreadyFired) return { fired: false };
  const passed = dy < 0 && Math.abs(dy) >= thr;
  return { fired: !!(passed && !p.inExtendedSlop) };
}

// ==================== §1.5 收起判定（TaskbarStashViaTouchController 同构） ====================
// 源码注释原文："A touch outside of Transient Taskbar bounds will immediately stash on
// ACTION_DOWN or ACTION_OUTSIDE. Touches inside Transient Taskbar bounds will stash if
// it is detected as a swipe down gesture."；touchDisplacementToStash = taskbar_to_nav_threshold = 24dp。

/**
 * 栏内下滑收起判定：dY ≥ 24dp 或 快速下滑甩动（|v| ≥ 288 且方向向下）。
 * @param {{dy:number, velocityY?:number, toNavThreshold?:number, flingVelocity?:number}} p
 *   dy：屏幕系位移（向下为正）；velocityY：松指速度（向下为正，px/s）。
 * @returns {{stashed:boolean, reason:''|'swipe-down'|'fling-down'}}
 */
export function stashSwipeDecision(p) {
  const dy = Number(p.dy) || 0;
  const toNav = p.toNavThreshold != null ? Number(p.toNavThreshold) : TASKBAR_TO_NAV_THRESHOLD;
  const flingV = p.flingVelocity != null ? Number(p.flingVelocity) : TASKBAR_FLING_DOWN_VELOCITY;
  const vy = p.velocityY != null ? Number(p.velocityY) : 0;
  if (dy >= toNav) return { stashed: true, reason: 'swipe-down' };
  if (vy >= flingV) return { stashed: true, reason: 'fling-down' };
  return { stashed: false, reason: '' };
}

/**
 * 栏外点按立即收起判定（ACTION_DOWN / ACTION_OUTSIDE 落在栏外）。
 * @param {{x:number, y:number, rect:{left:number,top:number,right:number,bottom:number}|null}} p
 * @returns {{stashed:boolean}}
 */
export function outsideStashDecision(p) {
  const r = p.rect;
  if (!r) return { stashed: false };
  const inside = p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
  return { stashed: !inside };
}

// ==================== §1.4 跟手阻尼（OverScroll.dampedScroll 语义同构） ====================

/**
 * 阻尼映射：输出 = max·|d| / (|d| + max)，保号、渐近逼近 max 永不越阈。
 * 源码调用：OverScroll.dampedScroll(-dY, mTaskbarNavThresholdY) —— 唤出后继续上滑，
 * 任务栏过渡进度以阻尼跟手；越接近阈值增益越小（"滑动追上手指" catchUp 段的前置语义）。
 * @param {number} dist 位移（保号）
 * @param {number} max 阻尼上限（navThreshold）
 * @returns {number}
 */
export function dampedScroll(dist, max) {
  const d = Math.abs(Number(dist) || 0);
  const m = Math.abs(Number(max) || 0);
  if (m === 0) return 0;
  const out = (m * d) / (d + m);
  return dist < 0 ? -out : out;
}

/**
 * 唤出过渡进度：阻尼位移 ÷ navThreshold，钳制 [0,1)。1 由松手后弹簧补完（417ms）。
 * @param {number} absDy 上滑累计距离（正数）
 * @param {number} navThreshold 阈值
 */
export function followProgress(absDy, navThreshold) {
  const t = Number(navThreshold) || 0;
  if (t <= 0) return 0;
  return Math.min(1, Math.max(0, dampedScroll(Math.abs(Number(absDy)) || 0, t) / t));
}

// ==================== §四.11 背景 alpha（taskbar_slow_velocity_y_threshold） ====================

/**
 * 跟手阶段背景 alpha：上滑距离不足慢速阈值（288dp）时按比例升 alpha，
 * 达到阈值后全亮（快速上滑 → 背景 alpha 动画语义的 md3 侧落地）。
 * @param {number} absDy 上滑累计距离（正数）
 * @param {number} [slow] 慢速阈值量纲（默认 288）
 */
export function followBackgroundAlpha(absDy, slow = Math.abs(TASKBAR_SLOW_VELOCITY_Y_THRESHOLD)) {
  const s = Number(slow) || 1;
  return Math.min(1, (Math.abs(Number(absDy)) || 0) / s);
}

// ==================== §1.5 自动隐藏挂起标志位（TaskbarAutohideSuspendController 同构） ====================
// 源码位值：FULLSCREEN(1<<0) / DRAGGING(1<<1) / TOUCHING(1<<2) / EDU_OPEN(1<<3) /
//           IN_LAUNCHER(1<<4) / TRANSIENT_TASKBAR(1<<5)；6-10 位（HOVERING_ICONS 等）md3 场景未涉，预留。

export const FLAG_AUTOHIDE_SUSPEND_FULLSCREEN = 1 << 0;
export const FLAG_AUTOHIDE_SUSPEND_DRAGGING = 1 << 1;
export const FLAG_AUTOHIDE_SUSPEND_TOUCHING = 1 << 2;
export const FLAG_AUTOHIDE_SUSPEND_EDU_OPEN = 1 << 3;
export const FLAG_AUTOHIDE_SUSPEND_IN_LAUNCHER = 1 << 4;
export const FLAG_AUTOHIDE_SUSPEND_TRANSIENT_TASKBAR = 1 << 5;

/** hasAnyFlag 同构：任一挂起位即挂起自动收起 */
export function isAutohideSuspended(flags) {
  return (Number(flags) || 0) !== 0;
}

// ==================== 在场判定（md3 侧语境 → 悬浮栏是否可武装） ====================

/**
 * 悬浮栏武装判定（纯函数）：平板断点 + 任务栏开关开 + 应用前台全屏 + 非 All Apps/锁屏
 * + 常驻任务栏未展开在场（AOSP transient 分支 isTaskbarPresentInApps=false 语义：
 * 应用内无常驻占位栏，悬浮栏只在「无栏在场」时经手势唤出）。
 * @param {{isTablet:boolean, taskbarEnabled:boolean, inApp:boolean, allAppsOpen:boolean,
 *          locked:boolean, persistentExpanded:boolean}} c
 * @returns {boolean}
 */
export function transientArmed(c) {
  if (!c) return false;
  return !!(c.isTablet && c.taskbarEnabled && c.inApp
    && !c.allAppsOpen && !c.locked && !c.persistentExpanded);
}
