// ==================== aosp/popup-timings.js — ArrowPopup 时序两套 + 折叠阈值（#75 二期 · §1.7） ====================
//
// 源码锚：src/com/android/launcher3/popup/ArrowPopup.java（议题 #75 §1.7 实测表逐项 1:1）
//         PopupContainerWithArrow.kt（SHORTCUT_COLLAPSE_THRESHOLD）
// 快照：v8.64 · 2026-10-29
//
// 消费纪律（#75 §五 DoD「图标弹出菜单时序正确（U+ 一套），快捷方式 >6 条折叠」）：
//   - md3 图标长按气泡菜单（context-menu.js）直接实现 U+ 一套（议题建议原文）；
//     经典套常量在册（供对照与后续主题化切换复用，勿删）。
//   - 议题未给子项阶梯步进（stagger）原值 —— 本版以 openChildFadeDuration（83ms）
//     同时充当「单条子项淡入时长」与「相邻子项阶梯步进」，偏离已注明。
//   - U+ 收场子项淡出时长议题未单列 —— 沿用 openChildFadeDuration（83ms）对称语义，
//     起点 = closeChildFadeStartDelay（150ms），偏离已注明。

export const CLASSIC_TIMINGS = Object.freeze({
  openDuration: 276,        // mOpenDuration
  openFadeDuration: 38,     // mOpenFadeDuration
  openChildFadeDuration: 76,// mOpenChildFadeDuration
  closeDuration: 200,       // mCloseDuration
  closeFadeDuration: 50,    // mCloseFadeDuration
  closeChildFadeDuration: 140, // mCloseChildFadeDuration
});

export const U_TIMINGS = Object.freeze({
  openDuration: 200,        // OPEN_DURATION_U
  openFadeDuration: 83,     // OPEN_FADE_DURATION_U
  openChildFadeDuration: 83,// OPEN_CHILD_FADE_DURATION_U
  closeDuration: 233,       // CLOSE_DURATION_U
  closeChildFadeStartDelay: 150, // CLOSE_CHILD_FADE_START_DELAY_U
  openOvershootDuration: 200,    // OPEN_OVERSHOOT_DURATION_U
});

// PopupContainerWithArrow.kt：快捷方式超过 6 条折叠
export const SHORTCUT_COLLAPSE_THRESHOLD = 6;

export function popupTimings(useU) {
  return useU ? U_TIMINGS : CLASSIC_TIMINGS;
}

/** 折叠切分：> threshold 条时可见前 threshold 条，其余进折叠区（hasFoldRow 提示渲染折叠行） */
export function foldShortcuts(list, threshold = SHORTCUT_COLLAPSE_THRESHOLD) {
  const items = Array.isArray(list) ? list.filter(Boolean) : [];
  return {
    visible: items.slice(0, threshold),
    folded: items.slice(threshold),
    foldedCount: Math.max(0, items.length - threshold),
    hasFoldRow: items.length > threshold,
  };
}

/**
 * U+ 开场编排：容器 fade 83ms；容器 settle 200ms（Overshoot 落位，
 * OPEN_OVERSHOOT_DURATION_U=200）；子项逐条 83ms 阶梯（步进=83ms，见头注偏离）。
 * 返回 { container:{fade,settle,overshoot}, children:[{index,delay,duration}] }
 */
export function openSchedule(useU, childCount) {
  const t = popupTimings(useU);
  const stagger = t.openChildFadeDuration;
  const children = [];
  for (let i = 0; i < childCount; i++) {
    children.push({ index: i, delay: i * stagger, duration: t.openChildFadeDuration });
  }
  return {
    container: { fade: t.openFadeDuration, settle: t.openDuration, overshoot: t.openOvershootDuration },
    children,
  };
}

/**
 * U+ 收场编排：容器 fade 233ms；子项 150ms 起淡、83ms 淡出（头注偏离：时长沿用子项淡入）。
 * 返回 { container:{fade}, children:[{index,delay,duration}] }
 */
export function closeSchedule(useU, childCount) {
  const t = popupTimings(useU);
  const children = [];
  for (let i = 0; i < childCount; i++) {
    children.push({ index: i, delay: t.closeChildFadeStartDelay, duration: t.openChildFadeDuration });
  }
  return { container: { fade: t.closeDuration }, children };
}
