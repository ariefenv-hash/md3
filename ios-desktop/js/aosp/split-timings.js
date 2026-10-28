// ==================== aosp/split-timings.js — SplitAnimationTimings 原值分档（#75 二期 · §1.6） ====================
//
// 源码锚：quickstep/src/com/android/quickstep/split/SplitAnimationTimings.java
//         （议题 #75 §1.6 实测表逐项 1:1，快照 v8.64 · 2026-10-29）
// 配套：QuickstepTransitionManager 的 SPLIT_LAUNCH_DURATION / SPLIT_DIVIDER_ANIM_DURATION。
// 分档约定：平板/手机断点与 #72（taskbar ≥768）/ #73（allapps formFor）同一约定 ——
//         ≥768 = 平板档，否则手机档（单一真源，勿再立第二断点）。
//
// 消费纪律（#75 §六）：
//   - 本表常量仅在「原生」预设（timed 引擎在场）下生效；果冻（弹簧）保持既有弹簧物理，零改动。
//   - md3 的 enterSplit 是「双窗格自源卡片同时展开」= AOSP App Pair Launch 型进入，
//     故进入时长消费 appPair 档（998/915）；enter（866/517）与 confirm（500/333）在 md3
//     现生命周期中无独立消费点（md3 无「概览选第二应用确认」的分步进入），常量在册供
//     #68 手势合并与后续分步进入复用 —— 刻意偏离已注明。

export const TABLET_ENTER_DURATION = 866;
export const TABLET_CONFIRM_DURATION = 500;
export const PHONE_ENTER_DURATION = 517;
export const PHONE_CONFIRM_DURATION = 333;
export const ABORT_DURATION = 500;
export const TABLET_APP_PAIR_LAUNCH_DURATION = 998;
export const PHONE_APP_PAIR_LAUNCH_DURATION = 915;
export const DESKTOP_FADE_OUT_DURATION = 200;

// QuickstepTransitionManager（§1.6 配套原值）
export const SPLIT_LAUNCH_DURATION = 370;
export const SPLIT_DIVIDER_ANIM_DURATION = 100;

// 平板断点（与 #72 taskbar / #73 allapps-form 同源约定）
export const TABLET_BREAKPOINT = 768;

export function isTabletWidth(w) {
  return Number.isFinite(w) && w >= TABLET_BREAKPOINT;
}

/** 设备分档时序表：{ device, enter, confirm, appPair, abort, desktopFade, launch, divider } */
export function splitTimingsFor(width) {
  const tablet = isTabletWidth(width);
  return {
    device: tablet ? 'tablet' : 'phone',
    enter: tablet ? TABLET_ENTER_DURATION : PHONE_ENTER_DURATION,
    confirm: tablet ? TABLET_CONFIRM_DURATION : PHONE_CONFIRM_DURATION,
    appPair: tablet ? TABLET_APP_PAIR_LAUNCH_DURATION : PHONE_APP_PAIR_LAUNCH_DURATION,
    abort: ABORT_DURATION,
    desktopFade: DESKTOP_FADE_OUT_DURATION,
    launch: SPLIT_LAUNCH_DURATION,
    divider: SPLIT_DIVIDER_ANIM_DURATION,
  };
}

// ==================== AppPairLaunchTimings.kt 分段窗口 ====================
//
// 议题 §1.6 给出分段名（staged rect slide / icon fade / app reveal / cell split）与
// 归一化纪律「进度 = 毫秒 / getDuration()」，但**未给各段毫秒原值**。本版以 appPair
// 总时长为基的归一化窗口参数化实现（窗口数值为本版推导，偏离已注明）——待源码实测
// 后仅改下面四个窗口常量，结构与消费点零改动（与 v8.61「议题只给字段名」同处理先例）。
//
// md3 等效消费映射（刻意偏离在册）：
//   - stagedRectSlide [0,0.55] → 两窗格矩形错峰滑入：窗格 A 窗口 [0,0.55]、
//     窗格 B 窗口 [0.25,0.55]（错峰 0.25，同刻 0.55 会合落位）
//   - iconFade [0.10,0.40]     → md3 窗格即源卡片形变本体（「指哪打哪」），源图标
//     自 t=0 起被窗格覆盖，等效固有，无独立消费面
//   - appReveal [0.30,1.00]    → 应用内容显现：映射到各窗格自身进度 [0.55,0.90]
//     （内容先于落位显现，落位时内容已全亮 —— 等效简化，注明）
//   - cellSplit [0,1]          → 分隔带浮现由「两窗格进度最小值」逐帧驱动（既有
//     v7.x 机制，等效于全程分档），不另起时间轴

export const APP_PAIR_STAGES = Object.freeze({
  stagedRectSlide: Object.freeze({ start: 0.0, end: 0.55 }),
  iconFade: Object.freeze({ start: 0.1, end: 0.4 }),
  appReveal: Object.freeze({ start: 0.3, end: 1.0 }),
  cellSplit: Object.freeze({ start: 0.0, end: 1.0 }),
});

// app pair 错峰参数（stagedRectSlide 内窗格 B 的装载起点，归一化）
export const PANE_B_ARM_AT = 0.25;
// 窗格 A/B 各自的滑入窗口占 appPair 总时长比例（stagedRectSlide 段内错峰切分）
export const PANE_A_SLIDE_SPAN = 0.55;
export const PANE_B_SLIDE_SPAN = 0.3; // 0.25 → 0.55

/** 段内归一化进度：进度 = (毫秒 - start×T) / (span×T)，越界钳制 [0,1] */
export function stageProgress(t, win) {
  if (!Number.isFinite(t)) return 0;
  const span = win.end - win.start;
  if (span <= 0) return t >= win.end ? 1 : 0;
  return Math.min(1, Math.max(0, (t - win.start) / span));
}

/** AppPairLaunchTimings 四段归一化进度（一次性求取，消费方按需取用） */
export function appPairStageProgress(t) {
  return {
    stagedRectSlide: stageProgress(t, APP_PAIR_STAGES.stagedRectSlide),
    iconFade: stageProgress(t, APP_PAIR_STAGES.iconFade),
    appReveal: stageProgress(t, APP_PAIR_STAGES.appReveal),
    cellSplit: stageProgress(t, APP_PAIR_STAGES.cellSplit),
  };
}
