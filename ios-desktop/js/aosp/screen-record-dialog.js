// ==================== screen-record-dialog.js — ScreenRecord 准出对话框同构（#196） ====================
//
// AOSP 源：packages/SystemUI/src/com/android/systemui/screenrecord/（aosp-mirror/
//   platform_frameworks_base @ main A14 快照，blob 页实拉，#196 议题正文实证）
//   · ScreenRecordPermissionDialogDelegate.kt：音频枚举 {NONE, INTERNAL, MIC, MIC_AND_INTERNAL}
//     （ScreenRecordingAudioSource.java 原序，四选一，NONE 在首）
//   · 显示点按开关：screenrecord_taps_switch（默认关）
//   · 录制范围默认 SINGLE_APP（单应用优先）
//   · RecordingController.startCountdown：DELAY_MS=3000 / INTERVAL_MS=1000（3-2-1 每秒一拍，
//     期间可取消——取消不产生片段文件）
//   · 管线四件套：RecordingService / ScreenMediaRecorder / ScreenInternalAudioRecorder /
//     ScreenRecordingMuxer
//
// md3 落地（v9.94 #196，裁决在录）：
//   · 准出对话框纯逻辑（四源枚举/倒计时/范围/点按开关）在库在测；DOM 对话框与
//     getDisplayMedia + MediaRecorder 光栅管线**另案**（入口挂接随 #34 QS 磁贴编辑器同期，
//     本版经 window.__screenRecord 桥驱动状态机——headless 可测，验收「取消不产生片段」
//     以 controller.cancelled 语义承载）
//   · 录制范围枚举：SINGLE_APP 默认（AOSP 同构）； EntireScreen 为显式选项
//
// 零 DOM / 零 window 引用（js/aosp 纯逻辑层纪律）；时钟由外部注入（now()，可测性）。

/** 音频四源（ScreenRecordingAudioSource.java 原序，NONE 在首——验收三） */
export const AUDIO_SOURCES = ['NONE', 'INTERNAL', 'MIC', 'MIC_AND_INTERNAL'];

/** 倒计时总时长（RecordingController DELAY_MS 同值） */
export const COUNTDOWN_DELAY_MS = 3000;

/** 倒计时步进（RecordingController INTERVAL_MS 同值，3-2-1 每秒一拍） */
export const COUNTDOWN_INTERVAL_MS = 1000;

/** 录制范围默认（ScreenRecordPermissionDialogDelegate.kt：单应用优先） */
export const DEFAULT_MODE = 'SINGLE_APP';

/** 录制范围枚举 */
export const RECORD_MODES = ['SINGLE_APP', 'ENTIRE_SCREEN'];

/** 显示点按开关默认（screenrecord_taps_switch 默认关） */
export const SHOW_TAPS_DEFAULT = false;

/**
 * 校准音频源选择：非法/越界值回退 NONE（AOSP 枚举安全解析语义）。
 * @param {string} sel 用户选择
 * @returns {string} AUDIO_SOURCES 之一
 */
export function resolveAudioSource(sel) {
  return AUDIO_SOURCES.includes(sel) ? sel : 'NONE';
}

/**
 * 校准录制范围：非法值回退默认 SINGLE_APP。
 * @param {string} mode
 * @returns {string} RECORD_MODES 之一
 */
export function resolveRecordMode(mode) {
  return RECORD_MODES.includes(mode) ? mode : DEFAULT_MODE;
}

/**
 * 创建录屏控制器（RecordingController.startCountdown 同构）。
 * 状态机：idle → startCountdown → counting（3-2-1 每秒一拍，tick 返回剩余整秒）→
 *   onCountdownFinish → recording → stop → idle；
 *   counting 期间 cancel() → idle（cancelled=true：**取消不产生片段文件**——验收二语义位）。
 *
 * @param {{
 *   delayMs?: number,
 *   intervalMs?: number,
 *   now?: () => number,
 * }} [opts]
 * @returns {{
 *   startCountdown: (opts?: { audioSource?: string, mode?: string, showTaps?: boolean }) => boolean,
 *   tick: () => number|null,   // counting 中每次轮询：剩余整秒（3/2/1）；非 counting → null；到 0 自动转 recording 并返回 0
 *   cancel: () => boolean,     // counting 中取消 → true（cancelled 置位）；recording 中停止 → true；idle → false
 *   state: () => string,       // 'idle' | 'counting' | 'recording'
 *   cancelled: () => boolean,  // 本次会话是否经取消退场（真 = 无片段文件语义）
 *   session: () => ({ audioSource: string, mode: string, showTaps: boolean } | null),
 *   remainingMs: () => number,
 * }}
 */
export function createRecordingController(opts = {}) {
  const delayMs = Number.isFinite(opts.delayMs) && opts.delayMs > 0 ? opts.delayMs : COUNTDOWN_DELAY_MS;
  const intervalMs = Number.isFinite(opts.intervalMs) && opts.intervalMs > 0 ? opts.intervalMs : COUNTDOWN_INTERVAL_MS;
  const now = typeof opts.now === 'function' ? opts.now : () => performance.now();

  let st = 'idle';
  let startedAt = 0;
  let sessionOpts = null;
  let wasCancelled = false;

  return {
    startCountdown(o = null) {
      if (st !== 'idle') return false;
      st = 'counting';
      startedAt = now();
      wasCancelled = false;
      sessionOpts = {
        audioSource: resolveAudioSource(o && o.audioSource),
        mode: resolveRecordMode(o && o.mode),
        showTaps: !!(o && o.showTaps),
      };
      return true;
    },
    tick() {
      if (st !== 'counting') return null;
      const elapsed = now() - startedAt;
      if (elapsed >= delayMs) {
        st = 'recording'; // 3-2-1 走完 → 录制开始
        return 0;
      }
      // 剩余整秒（向上取整：elapsed=0 → 3，elapsed=2000 → 1）
      return Math.ceil((delayMs - elapsed) / intervalMs);
    },
    cancel() {
      if (st === 'counting') {
        st = 'idle';
        wasCancelled = true; // 取消：无片段文件（验收二）
        sessionOpts = null;
        return true;
      }
      if (st === 'recording') {
        st = 'idle'; // 正常停止：片段有效
        sessionOpts = null;
        return true;
      }
      return false;
    },
    state: () => st,
    cancelled: () => wasCancelled,
    session: () => sessionOpts,
    remainingMs: () => (st === 'counting' ? Math.max(0, delayMs - (now() - startedAt)) : 0),
  };
}
