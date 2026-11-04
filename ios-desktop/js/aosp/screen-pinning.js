// ==================== screen-pinning.js — 屏幕固定纯逻辑层（AOSP SystemUI pinning 1:1 移植） ====================
// 源码依据（aosp-mirror/platform_frameworks_base @ main，blob 实拉 2026-11-04，快照
// docs/reference/frameworks-base/systemui/pinning/）：
//   navigationbar/ScreenPinningNotify.java（77 行全文快照）
//     → SHOW_TOAST_MINIMUM_INTERVAL = 1000（L33：1s 内重复 escape toast 忽略）
//     → showPinningStartToast() / showPinningExitToast() 直通
//     → showEscapeToast(isGestureNavEnabled, isRecentsButtonVisible) 三文案变体 + 1s 节流
//   recents/ScreenPinningRequest.java（429 行全文快照）
//     → showPrompt(taskId, allowCancel) 确认面板（Gravity.BOTTOM + OFFSET_DP=96 上移
//       300ms DecelerateInterpolator + 背景色 1000ms 渐入，L139-156/L230-256）
//     → onClick：ok_button → ActivityTaskManager.startSystemLockTaskMode(taskId) → clearPrompt
//     → 三 bullets 描述（description 变体 + exposes_personal_data + can_open_other_apps，
//       BulletSpan L334-346）；描述五变体按 navMode/overviewEnabled/touchExploration 分派
//       （L307-323）
//   文案真源 packages/SystemUI/res/values/strings.xml（main blob 实拉，screen_pinning_*
//   15 条全族逐字在录，中文为 md3 UI 语言映射、键名与 AOSP R.string 资源名同名）。
//   退出长按判定：ViewConfiguration.getLongPressTimeout() 框架默认 400ms（AOSP 公开
//   API 默认值，system server 侧 KEYCODE_BACK 长按退出 lock task 消费同一超时）。
// md3 落地裁决（在录）：
//   ① md3 融合导航（三键浮条 + 全局手势共存）下 pinned 态融合手势引擎整体冻结
//     （避免应用跟手缩小/快速切换等复杂手势与单应用固定语义冲突），退出交互收敛为
//     长按返回键单通道（AOSP 三键 Back+Overview 语义中 Overview 点击被拦后，
//     长按 back 即完整退出交互）——escape toast 恒用 screen_pinning_toast 变体。
//   ② 凭据门控（AOSP Settings.Secure.LOCK_TO_APP_EXIT_LOCKED + 锁屏凭据校验）：
//     md3 锁屏仅有滑动解锁、无 PIN/密码凭据实体（lock-screen.js L24-26 注释在录），
//     verifyCredential 通道在本状态机全量实现（回调注入可测），但设置面不建——
//     无凭据实体不空转接线，凭据系统落地后单点接 verifyCredential 即可启用。
//   ③ system server 侧 stopLockTaskMode token 校验/DeviceOwner lock task 白名单
//     （LockTaskController）为 Android 多用户/受管设备语义，md3 单用户网页语境
//     无对应物，不空转移植（诚实标注，非缺口）。

/** ScreenPinningNotify.java L33：SHOW_TOAST_MINIMUM_INTERVAL = 1000 */
export const SHOW_TOAST_MINIMUM_INTERVAL = 1000;

/** ViewConfiguration.getLongPressTimeout() 框架默认 400ms（退出长按判定映射） */
export const PIN_BACK_LONGPRESS_MS = 400;

/**
 * R.string.screen_pinning_* 全族文案（strings.xml main blob 实拉 15 条，键名同名）。
 * 中文为 md3 UI 语言映射；AOSP 英文原文见快照 README。
 */
export const PINNING_STRINGS = {
  screen_pinning_title: '应用已固定',
  screen_pinning_description: '固定后应用将保持在前台，直到你取消固定。触摸并按住返回键和多任务键即可取消固定。',
  screen_pinning_description_recents_invisible: '固定后应用将保持在前台，直到你取消固定。触摸并按住返回键和主屏键即可取消固定。',
  screen_pinning_description_gestural: '固定后应用将保持在前台，直到你取消固定。上滑并按住即可取消固定。',
  screen_pinning_description_accessible: '固定后应用将保持在前台，直到你取消固定。触摸并按住多任务键即可取消固定。',
  screen_pinning_description_recents_invisible_accessible: '固定后应用将保持在前台，直到你取消固定。触摸并按住主屏键即可取消固定。',
  screen_pinning_exposes_personal_data: '个人数据可能可被访问（如联系人和邮件内容）。',
  screen_pinning_can_open_other_apps: '被固定的应用可能会打开其他应用。',
  screen_pinning_toast: '要取消固定，请触摸并按住返回键和多任务键',
  screen_pinning_toast_recents_invisible: '要取消固定，请触摸并按住返回键和主屏键',
  screen_pinning_toast_gesture_nav: '要取消固定，请上滑并按住',
  screen_pinning_positive: '知道了',
  screen_pinning_negative: '不用了',
  screen_pinning_start: '应用已固定',
  screen_pinning_exit: '已取消固定',
};

/** ScreenPinningNotify L63-67 escape toast 三变体键（resolveEscapeToastVariant 输出域） */
export const ESCAPE_TOAST_VARIANTS = [
  'screen_pinning_toast',
  'screen_pinning_toast_recents_invisible',
  'screen_pinning_toast_gesture_nav',
];

/** ScreenPinningRequest L307-323 描述五变体键（resolveDescriptionVariant 输出域） */
export const DESCRIPTION_VARIANTS = [
  'screen_pinning_description',
  'screen_pinning_description_recents_invisible',
  'screen_pinning_description_gestural',
  'screen_pinning_description_accessible',
  'screen_pinning_description_recents_invisible_accessible',
];

/**
 * escape toast 变体解析（ScreenPinningNotify L63-67 逐字同构）：
 * 手势导航 → gesture_nav；否则 recents 键可见 → toast；recents 键不可见 → toast_recents_invisible。
 */
export function resolveEscapeToastVariant(isGestureNavEnabled, isRecentsButtonVisible) {
  if (isGestureNavEnabled) return 'screen_pinning_toast_gesture_nav';
  return isRecentsButtonVisible
    ? 'screen_pinning_toast'
    : 'screen_pinning_toast_recents_invisible';
}

/**
 * 确认面板描述变体解析（ScreenPinningRequest L307-323 同构）：
 * gestural → gestural；overviewEnabled → description / accessible（触控探索）；
 * overview 不可见 → recents_invisible / recents_invisible_accessible。
 */
export function resolveDescriptionVariant({ isGestural = false, overviewEnabled = true, touchExploration = false }) {
  if (isGestural) return 'screen_pinning_description_gestural';
  if (overviewEnabled) {
    return touchExploration
      ? 'screen_pinning_description_accessible'
      : 'screen_pinning_description';
  }
  return touchExploration
    ? 'screen_pinning_description_recents_invisible_accessible'
    : 'screen_pinning_description_recents_invisible';
}

/** 确认面板三条 bullets（ScreenPinningRequest L334-346：主描述 + 两条安全提示） */
export function buildPromptBullets(descVariant) {
  return [
    descVariant,
    'screen_pinning_exposes_personal_data',
    'screen_pinning_can_open_other_apps',
  ];
}

/**
 * ScreenPinningNotify 状态机（L31-76 同构）：escape toast 1s 节流 + start/exit 直通。
 * showEscapeToast 返回 null（节流忽略）或变体键（应展示）；消费方据此发系统 toast。
 * now 注入可测（生产消费 Date.now，同 media-service isStreamActive 口径）。
 */
export function createScreenPinningNotify({ now = () => Date.now() } = {}) {
  let lastShowToastTime = 0;
  return {
    /** L44-46：showPinningStartToast —— 直通（无节流） */
    showStartToast() {
      return 'screen_pinning_start';
    },
    /** L48-51：showPinningExitToast —— 直通（无节流） */
    showExitToast() {
      return 'screen_pinning_exit';
    },
    /** L54-69：showEscapeToast —— 1s 内重复请求忽略（L56-59 同构），首示返回变体键 */
    showEscapeToast(isGestureNavEnabled, isRecentsButtonVisible) {
      const showToastTime = now();
      if ((showToastTime - lastShowToastTime) < SHOW_TOAST_MINIMUM_INTERVAL) {
        return null;   // L57 "Ignore toast since it is requested in very short interval."
      }
      lastShowToastTime = showToastTime;
      return resolveEscapeToastVariant(isGestureNavEnabled, isRecentsButtonVisible);
    },
    /** 测试观测：上次节流基准 */
    lastShownAt() {
      return lastShowToastTime;
    },
  };
}

/**
 * 屏幕固定状态机（ScreenPinningRequest showPrompt/onClick + system server
 * startSystemLockTaskMode/stopLockTaskMode 语义位同构）：
 *   unpinned → prompting（showPrompt）→ pinned（confirmPrompt，同 startSystemLockTaskMode）
 *   pinned →（exitAttempt 长按达成）→ unpinned（同 stopLockTaskMode）
 * intercept(action, appId) 为系统动作守卫单源（md3 接线四面统一消费）：
 *   home / recents / gesture / open-app（非固定应用）→ 'blocked'
 *   open-app（固定应用自身，resume 语义）→ 'pass'
 *   back-internal（应用内页返回）→ 'pass'；back-root（根页关闭应用）→ 'blocked'
 *   exit（长按返回达成）→ 'pass'（唯一退出通道）
 */
export function createScreenPinningState({ verifyCredential = null, now = () => Date.now() } = {}) {
  let phase = 'unpinned';            // 'unpinned' | 'prompting' | 'pinned'
  let pinnedTaskId = null;           // 被固定任务（md3 口径 = appId）
  let pinnedSince = 0;

  return {
    phase() { return phase; },
    pinnedTaskId() { return pinnedTaskId; },
    pinnedSince() { return pinnedSince; },
    isPinned() { return phase === 'pinned'; },

    /** ScreenPinningRequest L139-156 showPrompt(taskId, allowCancel) */
    requestPrompt(taskId, allowCancel = true) {
      if (phase === 'pinned') return null;    // 已固定重复请求拒绝（system 侧 startSystemLockTaskMode 幂等拒绝语义）
      phase = 'prompting';
      return { taskId, allowCancel };
    },

    /** 取消面板（allowCancel=false 时取消钮 INVISIBLE，L294-300；API 层仍可强取消——
        清 prompt 是 clearPrompt 独立语义，与按钮可见性解耦） */
    cancelPrompt() {
      if (phase !== 'prompting') return false;
      phase = 'unpinned';
      return true;
    },

    /** ScreenPinningRequest L188-193：ok_button → startSystemLockTaskMode(taskId) */
    confirmPrompt(taskId = null) {
      if (phase !== 'prompting') return null;
      phase = 'pinned';
      pinnedTaskId = taskId;
      pinnedSince = now();
      return { pinned: true, taskId: pinnedTaskId };
    },

    /** 退出尝试（长按返回达成时调用）。verifyCredential 注入时先校验：
        通过 → 退出；拒绝 → 保持 pinned 返回 { exited:false, credentialDenied:true }。 */
    exitAttempt() {
      if (phase !== 'pinned') return { exited: false };
      if (verifyCredential) {
        let ok = false;
        try { ok = !!verifyCredential(); } catch { ok = false; }
        if (!ok) return { exited: false, credentialDenied: true };
      }
      phase = 'unpinned';
      const taskId = pinnedTaskId;
      pinnedTaskId = null;
      pinnedSince = 0;
      return { exited: true, taskId };
    },

    /** 强制解除（锁屏/系统收场等内部路径；AOSP ACTION_SCREEN_OFF clearPrompt 同层语义） */
    forceUnpin() {
      const was = phase;
      phase = 'unpinned';
      pinnedTaskId = null;
      pinnedSince = 0;
      return was === 'pinned';
    },

    /**
     * 系统动作守卫（md3 四面接线单源）：
     * action ∈ 'home' | 'recents' | 'gesture' | 'open-app' | 'back-root' | 'back-internal' | 'exit'
     * 非 pinned 恒 'pass'（零开销直通）；pinned 按矩阵裁决。
     */
    intercept(action, appId = null) {
      if (phase !== 'pinned') return 'pass';
      switch (action) {
        case 'home':
        case 'recents':
        case 'gesture':
          return 'blocked';                       // AOSP：pinned 时 Home/Overview 无效 + escape toast
        case 'open-app':
          return appId === pinnedTaskId ? 'pass' : 'blocked';   // resume 放行 / 换应用拦截
        case 'back-internal':
          return 'pass';                          // 应用内页返回不受限（AOSP back 语义保留）
        case 'back-root':
          return 'blocked';                       // 根页关闭应用被拦（不能退出固定应用）
        case 'exit':
          return 'pass';                          // 长按返回 = 唯一退出通道
        default:
          return 'pass';
      }
    },
  };
}
