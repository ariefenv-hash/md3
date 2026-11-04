// ==================== media-keys.js — 媒体键 MediaSession 键盘映射（#110） ====================
//
// AOSP 同构（aosp-mirror/platform_frameworks_base main 实拉 2026-11-05）：
//   · MediaSessionStack.java getPriorityList（L374-411）三级优先仲裁，注释原文
//     "Here's the priority order": ①Active sessions whose PlaybackState is active
//     （播放中）→ ②Active sessions whose PlaybackState is inactive → ③Inactive
//     sessions（仅 !activeOnly 收录段尾）。实现为按游标分段插入
//     （lastPlaybackActiveIndex 段首游标 / lastActiveIndex 次段游标），同段内保持
//     迭代序——mSessions 为 LRU 新者先（调用方保证），故同类内「最近活跃者优先」。
//   · MediaSessionService.java dispatchMediaKeyEvent（L1774+）→
//     dispatchMediaKeyEventLocked：媒体键派发给**唯一** media button session；
//     无受控 session → 静默（键事件不产生任何播放副作用）。
//   · android.view.KeyEvent 媒体键 KEYCODE（public static final int 实值）：
//     STOP 86 / NEXT 87 / PREVIOUS 88 / REWIND 89 / FAST_FORWARD 90 / PLAY_PAUSE 126。
//   · 网页映射 = UI Events KeyboardEvent key Values 媒体键段（MediaPlayPause /
//     MediaPlay / MediaPause / MediaTrackNext / MediaTrackPrevious / MediaStop /
//     MediaFastForward / MediaRewind）：按键值匹配 = 天然特性检测，不支持的平台
//     该键值永不出火、零报错零降级成本（#77-A 兼容性纪律）；显式降级面 = 既有
//     通知胶囊播放控制钮（notifications.js MEDIA_COMMAND 链）与锁屏媒体卡。
//
// 纯逻辑纪律：零 DOM、零 window、零 setTimeout（时钟注入 now；接线层负责事件流）。

/** android.view.KeyEvent 媒体键 KEYCODE 常量（KeyEvent.java 实值） */
export const KEYCODE_MEDIA_STOP = 86;
export const KEYCODE_MEDIA_NEXT = 87;
export const KEYCODE_MEDIA_PREVIOUS = 88;
export const KEYCODE_MEDIA_REWIND = 89;
export const KEYCODE_MEDIA_FAST_FORWARD = 90;
export const KEYCODE_MEDIA_PLAY_PAUSE = 126;

/**
 * KeyboardEvent.key → { keycode, action }（UI Events key Values 媒体键段全集）。
 * MediaPlay/MediaPause 为 PLAY_PAUSE 的显式播放/暂停分键（spec 并存，统一锚 126）。
 */
export const WEB_MEDIA_KEYS = {
  MediaPlayPause: { keycode: KEYCODE_MEDIA_PLAY_PAUSE, action: 'play_pause' },
  MediaPlay: { keycode: KEYCODE_MEDIA_PLAY_PAUSE, action: 'play' },
  MediaPause: { keycode: KEYCODE_MEDIA_PLAY_PAUSE, action: 'pause' },
  MediaTrackNext: { keycode: KEYCODE_MEDIA_NEXT, action: 'next' },
  MediaTrackPrevious: { keycode: KEYCODE_MEDIA_PREVIOUS, action: 'prev' },
  MediaStop: { keycode: KEYCODE_MEDIA_STOP, action: 'stop' },
  MediaFastForward: { keycode: KEYCODE_MEDIA_FAST_FORWARD, action: 'fast_forward' },
  MediaRewind: { keycode: KEYCODE_MEDIA_REWIND, action: 'rewind' },
};

/**
 * 键值 → 媒体动作（未知键值返回 null——非媒体键直接放行主链）。
 * @param {string} key KeyboardEvent.key
 * @returns {{keycode:number, action:string}|null}
 */
export function keyToMediaAction(key) {
  const rec = WEB_MEDIA_KEYS[key];
  return rec ? { keycode: rec.keycode, action: rec.action } : null;
}

/**
 * MediaSessionStack.getPriorityList 同构（L374-411 逐行语义）。
 * @param {Array<{id:string, isActive:boolean, isPlaying:boolean, lastActiveTs:number}>} sessions
 *        迭代序 = LRU 新者先（调用方保证；AOSP mSessions 同义）
 * @param {{activeOnly?:boolean}} [opts] true（默认）不收录不活跃段——媒体键受控会话
 *        只从活跃段选（无活跃 → 空表 → 静默）
 * @returns {Array} 优先级降序：播放中段 → 活跃未播放段 →（可选）不活跃段
 */
export function getPriorityList(sessions, { activeOnly = true } = {}) {
  const result = [];
  let lastPlaybackActiveIndex = 0;
  let lastActiveIndex = 0;
  for (const session of (sessions || [])) {
    if (!session || !session.isActive) {
      if (!activeOnly) {
        // AOSP：未发布/不活跃会话仅在 !activeOnly 时收录，置于段尾
        result.push(session);
      }
      continue;
    }
    if (session.isPlaying) {
      // checkPlaybackActiveState(true) → 插入播放中段（段首游标推进）
      result.splice(lastPlaybackActiveIndex, 0, session);
      lastPlaybackActiveIndex++;
      lastActiveIndex++;
    } else {
      // 活跃但未播放 → 插入次段（次段游标推进，仍在播放中段之后）
      result.splice(lastActiveIndex, 0, session);
      lastActiveIndex++;
    }
  }
  return result;
}

/**
 * 媒体键受控会话仲裁：优先级表首项；空表 → null（媒体键静默，AOSP 无目标语义）。
 * @returns {{id:string, isActive:boolean, isPlaying:boolean, lastActiveTs:number}|null}
 */
export function resolveMediaButtonSession(sessions, opts = {}) {
  const list = getPriorityList(sessions, { activeOnly: true, ...opts });
  return list.length > 0 ? list[0] : null;
}

/**
 * md3 流注册表 → 仲裁输入适配（media-service.streams × 双会话快照）。
 * 输出按 lastActiveTs 降序排布（LRU 新者先，供 getPriorityList 迭代序契约；
 * 稳定排序：同 ts 保持注册序）。
 *
 * 会话语义（诚实标注）：
 *   · host-radio = 常驻系统会话（构造期注册；isActive 恒 true——媒体键永远有
 *     受控兜底目标，与通知胶囊按钮可随时启动同口径）
 *   · external-music = 音乐应用覆盖层会话（isActive = externalActive()：有曲目
 *     接管或播放中；isPlaying = 覆盖层实时播放位）
 *
 * @param {Iterable<{streamId:string, lastActiveTs?:number}>} streams
 * @param {{externalActive:boolean, externalPlaying:boolean, hostPlaying:boolean,
 *          externalTs?:number, hostHasAudio?:boolean}} snap
 * @returns {Array<{id:string, isActive:boolean, isPlaying:boolean, lastActiveTs:number}>}
 */
export function streamsToSessions(streams, snap) {
  const out = [];
  for (const rec of streams) {
    if (!rec || !rec.streamId) continue;
    if (rec.streamId === 'external-music') {
      out.push({
        id: rec.streamId,
        isActive: !!snap.externalActive,
        isPlaying: !!snap.externalPlaying,
        lastActiveTs: snap.externalTs || 0,
      });
    } else if (rec.streamId === 'host-radio') {
      out.push({
        id: rec.streamId,
        isActive: true, // 常驻系统会话（AOSP SystemUI 自有媒体会话同位）
        isPlaying: !!snap.hostPlaying,
        lastActiveTs: rec.lastActiveTs || 0,
      });
    }
  }
  // LRU 新者先（lastActiveTs 降序；稳定排序保注册序）
  return out.sort((a, b) => (b.lastActiveTs || 0) - (a.lastActiveTs || 0));
}

/**
 * 动作 → 受控会话路由（dispatchMediaKeyEventLocked 单目标语义）。
 * @param {string} action keyToMediaAction().action
 * @param {string|null} targetSessionId resolveMediaButtonSession().id
 * @returns {{target:'external-music'|'host-radio'|null, cmd:string|null}}
 *          target=null = 无受控会话（调用方静默返回，零副作用）
 */
export function routeMediaAction(action, targetSessionId) {
  if (!targetSessionId) return { target: null, cmd: null };
  if (targetSessionId === 'external-music') {
    // 覆盖层路径：MEDIA_COMMAND 命令字（音乐应用 iframe 自过滤，未知命令忽略）
    const cmdMap = {
      play_pause: 'toggle',
      play: 'play',
      pause: 'pause',
      next: 'next',
      prev: 'prev',
      stop: 'stop',
      fast_forward: 'fast_forward',
      rewind: 'rewind',
    };
    return { target: 'external-music', cmd: cmdMap[action] || null };
  }
  // 宿主路径：mediaService 原生控制（togglePlay/play/pause/next/prev 为既有方法；
  // stop = KEYCODE_MEDIA_STOP 停止语义 暂停+归位；fast_forward/rewind = seekRelative ±10s
  // ——navigator.mediaSession seekbackward/seekforward 缺省 seekOffset 同值）
  const hostMap = {
    play_pause: 'togglePlay',
    play: 'play',
    pause: 'pause',
    next: 'next',
    prev: 'prev',
    stop: 'stop',
    fast_forward: 'fast_forward',
    rewind: 'rewind',
  };
  return { target: 'host-radio', cmd: hostMap[action] || null };
}
