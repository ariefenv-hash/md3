// ==================== screenshot-shelf.js — ScreenshotController/Shelf 同构（#196） ====================
//
// AOSP 源：packages/SystemUI/src/com/android/systemui/screenshot/（aosp-mirror/platform_frameworks_base
//   @ main A14 快照，blob 页实拉，#196 议题正文实证）
//   · ScreenshotController.kt：SCREENSHOT_CORNER_DEFAULT_TIMEOUT_MILLIS = 6000 —— 缩略图角标
//     （Shelf）驻留 6 秒后自动退场
//   · 快门音：screenshotSoundController.playScreenshotSoundAsync() 在 startAnimation 与
//     saveScreenshotAndToast **两处调用点**（动画即响，不只落盘时）
//   · 滚动截屏五步链路：enqueueScrollCaptureRequest → requestScrollCapture →
//     onScrollButtonClicked → executeBatchScrollCapture → createLongScreenshotIntent
//   · ScreenshotEvent.java：SCREENSHOT_INTERACTION_TIMEOUT / SCREENSHOT_REENTERED 等交互
//     超时事件枚举（触摸角标可重置退场计时 = SCREENSHOT_REENTERED 语义）
//
// md3 落地（v9.93 #196，裁决在录）：
//   · 光栅真源：浏览器侧全屏 DOM 栅格化受跨域 iframe 画布污染限制，getDisplayMedia 需系统
//     级权限链——**光栅源另案**（入口 recent-apps 截屏按钮先行接线 Shelf 全生命周期，缩略图
//     以最近任务卡片图标+应用名占位；滚动截屏五步链路 API 命名对齐在库，分步消费另案）
//   · 快门音：sound-haptics SFX 新增 screenshot 预设（快门双音），双调用点判定
//     isScreenshotSoundAt 纯函数单源（startAnimation/saveScreenshotAndToast 白名单）
//   · 手势：左滑删除 / 上滑分享 / 触摸重置计时（SCREENSHOT_REENTERED）——触摸即重置，
//     与 AOSP 触摸角标重置退场计时一致
//
// 零 DOM / 零 window 引用（js/aosp 纯逻辑层纪律）；时钟与定时由外部注入（now()，可测性）。

/** 角标（Shelf）默认驻留时长（ScreenshotController.kt 同值） */
export const SCREENSHOT_CORNER_DEFAULT_TIMEOUT_MILLIS = 6000;

/** 快门音双调用点（ScreenshotController.kt 两处 playScreenshotSoundAsync 调用位） */
export const SCREENSHOT_SOUND_POINTS = ['startAnimation', 'saveScreenshotAndToast'];

/** 滚动截屏五步链路（API 分步命名对齐 AOSP scroll/ 子包链路） */
export const SCROLL_CAPTURE_STEPS = [
  'enqueueScrollCaptureRequest',
  'requestScrollCapture',
  'onScrollButtonClicked',
  'executeBatchScrollCapture',
  'createLongScreenshotIntent',
];

/** ScreenshotEvent.java 交互事件枚举（md3 消费子集：超时退场 / 重入重置） */
export const SCREENSHOT_EVENT = {
  SCREENSHOT_INTERACTION_TIMEOUT: 'SCREENSHOT_INTERACTION_TIMEOUT',
  SCREENSHOT_REENTERED: 'SCREENSHOT_REENTERED',
};

/** Shelf 手势动作（左滑删除 / 上滑分享，AOSP Shelf swipe 语义） */
export const SHELF_SWIPE = {
  DELETE: 'delete',
  SHARE: 'share',
};

/**
 * 快门音判定：该调用点是否应播快门音（双调用点白名单，ScreenshotController.kt 同构）。
 * @param {string} callPoint 调用点名
 * @returns {boolean}
 */
export function isScreenshotSoundAt(callPoint) {
  return SCREENSHOT_SOUND_POINTS.includes(callPoint);
}

/**
 * 创建截屏 Shelf（角标）生命周期状态机。
 * 生命周期：enter（入场驻留）→ touch（SCREENSHOT_REENTERED 重置计时）→
 *   swipe(delete|share)（手势退场）| expire（6s 超时退场）→ idle。
 * 退场原因返回给调用方驱动 DOM（删除→缩略图滑出；分享→分享面板；超时→自动淡出）。
 *
 * @param {{
 *   timeoutMs?: number,
 *   now?: () => number,
 * }} [opts]
 * @returns {{
 *   enter: () => void,
 *   touch: () => string|null,            // 驻留中触摸 → SCREENSHOT_REENTERED（重置计时）；否则 null
 *   swipe: (dir: string) => string|null, // 'delete'|'share' → 手势退场原因；非驻留/非法方向 → null
 *   tick: () => string|null,             // 每次轮询：超时 → SCREENSHOT_INTERACTION_TIMEOUT；否则 null
 *   state: () => string,                 // 'idle' | 'shown'
 *   remainingMs: () => number,
 *   timeoutMs: () => number,
 * }}
 */
export function createScreenshotShelf(opts = {}) {
  const timeoutMs = Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0
    ? opts.timeoutMs
    : SCREENSHOT_CORNER_DEFAULT_TIMEOUT_MILLIS;
  const now = typeof opts.now === 'function' ? opts.now : () => performance.now();

  let st = 'idle';
  let enteredAt = 0;

  return {
    enter() {
      st = 'shown';
      enteredAt = now();
    },
    touch() {
      if (st !== 'shown') return null;
      enteredAt = now(); // SCREENSHOT_REENTERED：触摸角标重置退场计时
      return SCREENSHOT_EVENT.SCREENSHOT_REENTERED;
    },
    swipe(dir) {
      if (st !== 'shown') return null;
      if (dir !== SHELF_SWIPE.DELETE && dir !== SHELF_SWIPE.SHARE) return null;
      st = 'idle';
      return dir; // 退场原因：'delete' | 'share'
    },
    tick() {
      if (st !== 'shown') return null;
      if (now() - enteredAt >= timeoutMs) {
        st = 'idle'; // SCREENSHOT_INTERACTION_TIMEOUT：6s 超时自动退场
        return SCREENSHOT_EVENT.SCREENSHOT_INTERACTION_TIMEOUT;
      }
      return null;
    },
    state: () => st,
    remainingMs: () => (st === 'shown' ? Math.max(0, timeoutMs - (now() - enteredAt)) : 0),
    timeoutMs: () => timeoutMs,
  };
}
