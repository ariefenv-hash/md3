// ==================== taskbar-core.js — 平板任务栏纯函数核（#72，Launcher3 lineage-24.0 源码实证） ====================
//
// 源码锚（#54 基线：LineageOS/android_packages_apps_Launcher3 lineage-24.0）：
//   · quickstep/src/com/android/launcher3/taskbar/TaskbarStashController.java —— 收纳状态机标志位/时长
//   · quickstep/src/com/android/launcher3/taskbar/TaskbarView.java —— calculateMaxNumIcons 容量计算
//   · quickstep/src/com/android/launcher3/taskbar/customization/TaskbarProfile.kt —— 三分支形态构造
//   · frameworks core/res/res/values/dimens.xml —— taskbar_frame_height=56dp / taskbar_stashed_size=24dp
//   · quickstep/res/values/dimens.xml —— 图标/导航/手柄/圆角/临时态全套实测值
//
// 取值纪律（#72 全局强制）：所有数值按源码实测原值落地，不因 md3 既有习惯压缩；
//   「收纳 417ms / 自动收纳 5000ms / 缩放 0.5 / 手柄 220×4dp」均为原值，刻意偏离须注明。

// ==================== §1.4 实测尺寸（dimens.xml 实测值） ====================

/** taskbar_frame_height（框架层）——「Height of the bottom taskbar not including decorations」 */
export const TASKBAR_FRAME_HEIGHT = 56;
/** taskbar_icon_min_touch_size —— 图标触控区（≥48dp 无障碍下限） */
export const TASKBAR_ICON_TOUCH = 48;
/** taskbar_icon_spacing —— 图标间距 */
export const TASKBAR_ICON_SPACING = 12;
/** taskbar_nav_buttons_size —— 导航按钮直径 */
export const TASKBAR_NAV_BUTTONS_SIZE = 44;
/** persistent_taskbar_icon_size —— 常驻态图标 */
export const PERSISTENT_TASKBAR_ICON_SIZE = 44;
/** transient_taskbar_icon_size —— 临时态图标（比常驻大） */
export const TRANSIENT_TASKBAR_ICON_SIZE = 57;
/** transient_taskbar_bottom_margin —— 临时态悬浮底距 */
export const TRANSIENT_TASKBAR_BOTTOM_MARGIN = 24;
/** transient_taskbar_stashed_height —— 临时态收纳后高度 */
export const TRANSIENT_TASKBAR_STASHED_HEIGHT = 32;
/** persistent_taskbar_corner_radius —— 常驻容器圆角 */
export const PERSISTENT_TASKBAR_CORNER_RADIUS = 16;
/** taskbar_stashed_handle_width —— 收纳手柄宽 */
export const TASKBAR_STASHED_HANDLE_WIDTH = 220;
/** taskbar_stashed_handle_height —— 收纳手柄高 */
export const TASKBAR_STASHED_HANDLE_HEIGHT = 4;
/** taskbar_stashed_screen_edge_hover_deadzone_height —— 边缘悬停死区 */
export const TASKBAR_STASHED_EDGE_HOVER_DEADZONE = 10;
/** taskbar_unstash_input_area —— 解收纳输入区宽 */
export const TASKBAR_UNSTASH_INPUT_AREA = 316;
/** taskbar_stashed_size（框架层）——「Default height of taskbar for Launcher」（常驻态收纳后高度） */
export const TASKBAR_STASHED_SIZE = 24;
/** NUM_ALWAYS_VISIBLE_TASKBAR_ICONS（TaskbarView.java 常量）—— 恒显图标数（含 All Apps 占位） */
export const NUM_ALWAYS_VISIBLE_TASKBAR_ICONS = 2;

// ==================== §1.5 收纳状态机时长（TaskbarStashController.java 实测常量） ====================

/** TRANSIENT_TASKBAR_STASH_DURATION —— 收纳动画时长（议题明示不压缩） */
export const TRANSIENT_TASKBAR_STASH_DURATION = 417;
/** TASKBAR_STASH_DURATION_FOR_IME —— IME 场景收纳时长 */
export const TASKBAR_STASH_DURATION_FOR_IME = 80;
/** STASHED_TASKBAR_SCALE —— 收纳态图标缩放 */
export const STASHED_TASKBAR_SCALE = 0.5;
/** UNSTASHED_TASKBAR_HANDLE_HINT_SCALE —— 解收纳手柄悬停提示缩放 */
export const UNSTASHED_TASKBAR_HANDLE_HINT_SCALE = 1.1;
/** NO_TOUCH_TIMEOUT_TO_STASH_MS —— 无触摸自动收纳超时 */
export const NO_TOUCH_TIMEOUT_TO_STASH_MS = 5000;
/** transient_taskbar_stash_spring_velocity_dp_per_s —— 收纳弹簧初速（位置量纲） */
export const STASH_SPRING_INITIAL_VELOCITY_DP_PER_S = 400;
/** TASKBAR_UNPINNING... —— 预留：源码侧 UNSTASHED_TASKBAR_HANDLE_HINT_SCALE 配对项已覆盖 */

// 收纳弹簧参数：以 417ms 为 2% 整定目标反解（ωn = 4/(ζ·T)，ζ=0.9 受控微超调质感）：
//   ωn = 4/(0.9×0.417) ≈ 10.66 rad/s → stiffness = ωn² ≈ 113.7，damping = 2ζωn ≈ 19.2。
// 与 m3-controls 同纪律：JS 弹簧驱动，不经 CSS transition（html.no-anim 不杀动效）。
export const STASH_SPRING_STIFFNESS = 113.7;
export const STASH_SPRING_DAMPING = 19.2;

// ==================== 收纳状态机标志位（TaskbarStashController.java 位值与源码一致） ====================

export const FLAG_IN_APP = 1 << 0;                    // 在应用内
export const FLAG_STASHED_IN_APP_SYSUI = 1 << 1;      // shade 打开等 SystemUI 收纳
export const FLAG_STASHED_IME = 1 << 3;               // IME 可见
export const FLAG_IN_STASHED_LAUNCHER_STATE = 1 << 4; // launcher 处于收纳态
export const FLAG_STASHED_IN_TASKBAR_ALL_APPS = 1 << 5; // All Apps 可见
export const FLAG_STASHED_IN_APP_AUTO = 1 << 8;       // Autohide（transient taskbar）
export const FLAG_IN_OVERVIEW = 1 << 11;              // launcher 在概览（不判定收纳）
export const FLAG_TASKBAR_HIDDEN = 1 << 14;           // dream 等场景隐藏（md3 锁屏映射到此位）

/** FLAGS_STASHED —— isStashed 判定掩码（hasAnyFlag(FLAGS_STASHED) 同构；IN_OVERVIEW 不在掩码内） */
export const FLAGS_STASHED = FLAG_STASHED_IN_APP_SYSUI | FLAG_STASHED_IME
  | FLAG_IN_STASHED_LAUNCHER_STATE | FLAG_STASHED_IN_TASKBAR_ALL_APPS
  | FLAG_STASHED_IN_APP_AUTO | FLAG_TASKBAR_HIDDEN;

/** 标志位 → 是否收纳（TaskbarStashController.isStashed 同构） */
export function isStashedFlags(flags) {
  return (Number(flags) & FLAGS_STASHED) !== 0;
}

/**
 * 收纳决策纯函数（语境 → 标志位集合 + 收纳判定）。
 * 语境映射（md3 侧）：
 *   · locked      → FLAG_TASKBAR_HIDDEN（锁屏/dream：整体隐藏）
 *   · inApp       → FLAG_IN_APP；且 autoStash（5s 无触摸计时已触发）→ FLAG_STASHED_IN_APP_AUTO
 *   · allAppsOpen → FLAG_STASHED_IN_TASKBAR_ALL_APPS（抽屉全屏覆盖，任务栏收纳）
 *   · imeOpen     → FLAG_STASHED_IME（md3 暂无系统 IME，预留语义位）
 *   · overviewOpen→ FLAG_IN_OVERVIEW（概览中任务栏仍可见 —— 不入 FLAGS_STASHED 掩码）
 * @param {{inApp?:boolean, autoStash?:boolean, allAppsOpen?:boolean, locked?:boolean, overviewOpen?:boolean, imeOpen?:boolean}} ctx
 * @returns {{flags:number, stashed:boolean}}
 */
export function computeStash(ctx) {
  const c = ctx || {};
  let flags = 0;
  if (c.locked) flags |= FLAG_TASKBAR_HIDDEN;
  if (c.inApp) flags |= FLAG_IN_APP;
  if (c.inApp && c.autoStash) flags |= FLAG_STASHED_IN_APP_AUTO;
  if (c.allAppsOpen) flags |= FLAG_STASHED_IN_TASKBAR_ALL_APPS;
  if (c.imeOpen) flags |= FLAG_STASHED_IME;
  if (c.overviewOpen) flags |= FLAG_IN_OVERVIEW;
  return { flags, stashed: isStashedFlags(flags) };
}

// ==================== TaskbarProfile.kt 三分支构造（实测值） ====================

/**
 * 任务栏形态档案（TaskbarProfile.kt 三分支构造同构）：
 *   · 'none'       无任务栏 —— height/iconSize 全 0
 *   · 'transient'  临时态 —— iconSize=57、bottomMargin=24、stashedHeight=32
 *   · 'persistent' 常驻态 —— iconSize=44、height=56(taskbar_frame_height)、bottomMargin=0、
 *                 stashedHeight=24（taskbar_stashed_size「Default height of taskbar for Launcher」）
 * @param {'none'|'transient'|'persistent'} mode
 */
export function taskbarProfile(mode) {
  if (mode === 'transient') {
    return {
      iconSize: TRANSIENT_TASKBAR_ICON_SIZE,
      height: TASKBAR_FRAME_HEIGHT,
      bottomMargin: TRANSIENT_TASKBAR_BOTTOM_MARGIN,
      stashedHeight: TRANSIENT_TASKBAR_STASHED_HEIGHT,
    };
  }
  if (mode === 'persistent') {
    return {
      iconSize: PERSISTENT_TASKBAR_ICON_SIZE,
      height: TASKBAR_FRAME_HEIGHT,
      bottomMargin: 0,
      stashedHeight: TASKBAR_STASHED_SIZE,
    };
  }
  // 'none'：无任务栏（手机断点走 Dock 范式）
  return { iconSize: 0, height: 0, bottomMargin: 0, stashedHeight: 0 };
}

// ==================== 容量与溢出（TaskbarView.java calculateMaxNumIcons 同构移植） ====================

/**
 * 按容器宽度动态计算可容纳图标数。
 * 源码语义：iconSize = 2 × margin + touchSize；先扣掉两侧保留区
 * （导航按钮 / All Apps 按钮 / 分隔线 / Overflow 把手等 reservedW），再
 * Math.floorDiv(availableWidth, iconSize) + additionalIcons。
 * md3 侧 additionalIcons 默认 1（NUM_ALWAYS_VISIBLE_TASKBAR_ICONS=2 含 All Apps 按钮，
 * 其宽度已在 reservedW 扣除，故补位计数 +1）；结果永不低于恒显下限。
 * @param {number} containerW 任务栏内容区宽度 px
 * @param {{margin?:number, touch?:number, reservedW?:number, additionalIcons?:number, min?:number}} [opts]
 * @returns {number}
 */
export function calculateMaxNumIcons(containerW, opts = null) {
  const o = opts || {};
  const margin = o.margin != null ? o.margin : TASKBAR_ICON_SPACING;
  const touch = o.touch != null ? o.touch : TASKBAR_ICON_TOUCH;
  const min = o.min != null ? o.min : NUM_ALWAYS_VISIBLE_TASKBAR_ICONS;
  const iconSize = 2 * margin + touch; // = 72（源码同式）
  const available = Math.max(0, Math.floor(containerW) - Math.floor(o.reservedW || 0));
  const additional = o.additionalIcons != null ? o.additionalIcons : 1;
  const fit = Math.floor(available / iconSize); // floorDiv（宽度非负，floor == div）
  return Math.max(min, fit + additional);
}

/**
 * 应用列表按容量切分：可见区 + 溢出区（溢出项不丢弃，进 Overflow 面板）。
 * @param {string[]} ids 有序应用 id
 * @param {number} maxVisible 可见上限（calculateMaxNumIcons 结果）
 * @returns {{visible:string[], overflow:string[]}}
 */
export function partitionApps(ids, maxVisible) {
  const list = Array.isArray(ids) ? ids.filter((x) => typeof x === 'string' && x) : [];
  const n = Math.max(0, Math.floor(maxVisible) || 0);
  return { visible: list.slice(0, n), overflow: list.slice(n) };
}

/**
 * 运行中应用区数据投影：recent-apps 列表 ∩ 打开中集合 − 已固定项。
 * （运行区与 recent-apps.js 单源一致；打开中集合由 taskbar 板层事件维护）
 * @param {string[]} recentList getRecentAppsList() 结果
 * @param {Set<string>} openSet 打开中的应用 id
 * @param {string[]} fixedIds 固定区 id
 * @returns {string[]}
 */
export function runningProjection(recentList, openSet, fixedIds) {
  const fixed = fixedIds instanceof Set ? fixedIds : new Set(fixedIds || []);
  const out = [];
  const list = Array.isArray(recentList) ? recentList : [];
  for (const id of list) {
    if (fixed.has(id)) continue;
    if (!(openSet && openSet.has(id))) continue;
    out.push(id);
  }
  return out;
}
