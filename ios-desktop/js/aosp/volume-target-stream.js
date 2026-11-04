// ==================== volume-target-stream.js — 音量键目标流判定（#109 · AudioService.getActiveStreamType 对标） ====================
//
// AOSP 真源：frameworks/base/services/core/java/com/android/server/audio/AudioService.java
//   → getActiveStreamType(int suggestedStreamType)：音量键控哪条流由系统动态判定，非固定
//     STREAM_MUSIC。判定链（md3 可复现四档）：
//     ① 通话中（isInCommunication）→ STREAM_VOICE_CALL
//     ② 闹钟响铃（isStreamActive(STREAM_ALARM)）→ STREAM_ALARM
//     ③ 媒体播放中 / 近期活跃（isStreamActive(STREAM_MUSIC, active 窗口)）→ STREAM_MUSIC
//     ④ 静默 → STREAM_RING（桌面静默按音量键 = 调铃声音量，与真机行为一致——#109 核心差异面）
//
// md3 映射：五通道数据真源已在（settings.js DEFAULTS { call, ring, notification, alarm }，
// localStorage settings:sound-v1）；媒体活跃判定复用 #193 流注册表 isActive 口径（3s 窗口）。
// RingerMode（ring|vibrate|silent，#36）与目标流判定正交：AOSP 静音态音量键仍调 ring 流
// （Zen 分流是独立交互），本模块不掺入 ringerMode。
//
// 纯逻辑层：零 DOM 零 window 零 setTimeout（快照时间 now 由调用方注入，vitest 可控）。

/** 媒体「近期活跃」窗口（#193 isActive 同口径：AOSP isStreamActive(STREAM_MUSIC,
 *  AudioServer 活跃位)；md3 以 3s 内有实际发声映射，VisibilityInteractor 同源时长） */
export const STREAM_ACTIVE_WINDOW_MS = 3000;

/**
 * 目标流判定（getActiveStreamType 同构，优先级自上而下）。
 * @param {object} snap 快照（调用方从 mediaService/时钟域构建）
 *   - callActive   通话中（md3 暂无通话引擎，恒 false；占位对齐 AOSP 判定首位）
 *   - alarmRinging 闹钟响铃中（时钟域响铃态；md3 响铃时音量键调闹钟流）
 *   - mediaPlaying 媒体正在播放（宿主 isPlaying 或 external 上报播放位）
 *   - mediaActiveTs 媒体最近一次发心声心跳 ts（#193 lastActiveTs；0 = 从未）
 *   - now          当前时间（注入；缺省 Date.now()）
 * @returns {'call'|'alarm'|'music'|'ring'}
 */
export function resolveVolumeKeyTargetStream(snap) {
  const s = snap || {};
  if (s.callActive) return 'call';                       // ① STREAM_VOICE_CALL
  if (s.alarmRinging) return 'alarm';                    // ② STREAM_ALARM
  const now = typeof s.now === 'number' ? s.now : Date.now();
  const recent = typeof s.mediaActiveTs === 'number' &&
    s.mediaActiveTs > 0 && (now - s.mediaActiveTs) < STREAM_ACTIVE_WINDOW_MS;
  if (s.mediaPlaying || recent) return 'music';          // ③ STREAM_MUSIC（播放中或近期活跃）
  return 'ring';                                         // ④ STREAM_RING（静默回落，#109 行为差异主档）
}

/**
 * 目标流图标判定（VolumeDialogSliderIconProvider 分流扩展：既有 STREAM_MUSIC 两态 +
 * #109 补 ring/alarm/call 段；mute 语义 per-stream —— 目标流 level==0 即 mute 形态）。
 * @param {'call'|'alarm'|'music'|'ring'} target
 * @param {number} level 0-100（目标流当前值）
 * @returns {{icon: 'volume_media_mute'|'volume_media'|'ring_volume'|'alarm'|'volume', stream: string}}
 */
export function targetStreamIconState(target, level) {
  const muted = !(level > 0);
  switch (target) {
    case 'call':  return { icon: 'volume', stream: 'call' };          // 通话流（通用扬声器字形）
    case 'alarm': return { icon: muted ? 'alarm' : 'alarm', stream: 'alarm' }; // 闹钟流（ic_alarm）
    case 'ring':  return { icon: muted ? 'ring_volume_off' : 'ring_volume', stream: 'ring' };
    case 'music':
    default:      return { icon: muted ? 'volume_media_mute' : 'volume_media', stream: 'music' };
  }
}

/**
 * 步进落值钳位（per-stream index 语义：每条流独立 0-100，±KEY_STEP 后钳位）。
 * @param {number} current 目标流当前值
 * @param {number} delta 步进量（可负）
 * @returns {number}
 */
export function clampStreamVolume(current, delta) {
  const v = Number(current);
  const d = Number(delta);
  const base = Number.isFinite(v) ? v : 0;
  const step = Number.isFinite(d) ? d : 0;
  return Math.max(0, Math.min(100, Math.round(base + step)));
}
