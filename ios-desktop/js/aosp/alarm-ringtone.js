// ==================== js/aosp/alarm-ringtone.js — 闹钟铃声资源治理（v9.82 · #158 主线） ====================
// AOSP 对标：AsyncRingtonePlayer（MediaPlayer 采样轨）+ RingtoneManager.TYPE_ALARM（铃声=音频文件资源，
// 合成音仅兜底）。真源：aosp-mirror/platform_frameworks_base @ main data/sounds/alarms/ogg/（元素周期系列，
// 经典 Alarm_Beep_02/Buzzer 自 android-11 起已不在库——23 枚实列在录，按用户「疑点按最优方案」裁决以同库
// 元素系列替代）；timer_expire.ogg 真源 LineageOS/android_packages_apps_DeskClock @ lineage-22.1 res/raw/
// （aosp-mirror 无 DeskClock 镜像 Not Found 实证，v9.40 同源纪律）。
// 纪律：纯逻辑零 DOM 零 window（Audio 构造注入；localStorage 经 store 参数注入），时序无。
// 统一回退开关（#158/#161 共用，一个开关管全部音频资源，用户裁决）：auto=采样优先失败回落合成 /
// asset=强制真实资源（缺失静默，不虚假回落） / synth=强制合成（资源不消费）。

/** 铃声资产基路径（相对 clock-app iframe：ios-desktop/apps/clock-app/ → ios-desktop/assets/audio/alarms/） */
export const ALARM_RINGTONE_BASE = '../../assets/audio/alarms/';

/** 统一回退开关 localStorage 键（#158/#161 共用；settings 声音页写、sound-haptics 与 clock 双读） */
export const AUDIO_RESOURCE_MODE_KEY = 'ios-desktop:audio-resource-mode';

/** AOSP 元素系列闹钟铃声 6 枚（bytes/sha256 实拉快照，OggS 魔数逐枚校验在测） */
export const ALARM_RINGTONES = [
  { id: 'oxygen',   file: 'Oxygen.ogg',   bytes: 27025,  sha256: '687bf3b4f6a802f7bfd60fa2ff55c30af6666e5a0d6c613114e0ad7d0ec72d8e' },
  { id: 'osmium',   file: 'Osmium.ogg',   bytes: 42488,  sha256: 'ee4a018a15fa6c1b2855b1579999d2e5584d4fb7c66131b532b79551b58c2ac3' },
  { id: 'carbon',   file: 'Carbon.ogg',   bytes: 97611,  sha256: '074f5080704bf8591cb51bae2bd609fa5932036fcebcba219d8b07166b9c42be' },
  { id: 'krypton',  file: 'Krypton.ogg',  bytes: 103196, sha256: '331e2a26941b1e1dd0b1099dc57bbca47156cbfa75d40bd366929e3feb8ce958' },
  { id: 'platinum', file: 'Platinum.ogg', bytes: 112676, sha256: '97a8809aa641e0b319648e5622787cb963d029cc4e408325132d97c1dbec3a55' },
  { id: 'helium',   file: 'Helium.ogg',   bytes: 147067, sha256: '8c18bb9ef385829e087e28555cf818818bb3428c53a2819f0fe74df6c32550f1' },
];

/** 计时器到期音（AOSP DeskClock res/raw/timer_expire.ogg；独立于闹钟铃声选择——AsyncRingtonePlayer
 *  双播放器语义：TimerStream/AlarmStream 各自 MediaPlayer） */
export const TIMER_EXPIRE_ASSET = {
  id: 'timer_expire', file: 'timer_expire.ogg', bytes: 174634,
  sha256: 'a82f24b80369188c31a5a4269037a7b0ed4160a99205ae4423506552cba95a2a',
};

/** 全资产池（闹钟 6 + 计时器 1）——id 唯一，file 相对 ALARM_RINGTONE_BASE */
export const ALARM_ASSET_POOL = [...ALARM_RINGTONES, TIMER_EXPIRE_ASSET];

/** 按 id 查资产（未命中 null） */
export function findAlarmRingtone(id) {
  return ALARM_ASSET_POOL.find((r) => r.id === id) || null;
}

/** id → 完整 URL（未命中 null；base 可注入供测试） */
export function alarmRingtoneUrl(id, base = ALARM_RINGTONE_BASE) {
  const hit = findAlarmRingtone(id);
  return hit ? base + hit.file : null;
}

/** 读取统一回退模式（非法/缺省/存储异常 → 'auto'；store 需含 getItem） */
export function readAudioResourceMode(store) {
  try {
    const v = store && typeof store.getItem === 'function' ? store.getItem(AUDIO_RESOURCE_MODE_KEY) : null;
    return v === 'asset' || v === 'synth' || v === 'auto' ? v : 'auto';
  } catch (_) { return 'auto'; }
}

/** 写统一回退模式（非法拒绝返回 false；存储异常 false——调用方静默） */
export function writeAudioResourceMode(store, mode) {
  if (mode !== 'auto' && mode !== 'asset' && mode !== 'synth') return false;
  try { store.setItem(AUDIO_RESOURCE_MODE_KEY, mode); return true; } catch (_) { return false; }
}

/** 该 id 在当前模式下是否走资产轨（synth 恒 false；auto/asset 在池内即 true——失败处置由播放层分叉：
 *  auto→回落合成，asset→静默） */
export function shouldUseAssetRingtone(id, mode) {
  if (mode === 'synth') return false;
  return !!findAlarmRingtone(id);
}

/** 计时器到期铃声选择：synth → null（沿用既有合成/用户铃声）；auto/asset → timer_expire 资产 id */
export function pickTimerRingtone(mode) {
  return mode === 'synth' ? null : TIMER_EXPIRE_ASSET.id;
}

/**
 * 资产轨播放器（MediaPlayer Web 等价：HTMLAudioElement 注入构造，双事件回落语义）。
 * verdict 协议：'playing'=已开播（含同源续播：loop 中仅同步音量——离散渐强语义与 v9.40 一致）；
 * 'failed'=该 url 本会话已知失败（调用方决定回落合成或静默）。失败 url 永久记账（本会话不再重试——
 * 防每 2.2s 重触发×失败事件循环轰鸣；dR/stop 不清账，下次页面加载自然重试）。
 * @param {{createAudio:(url:string)=>Object, onFallback?:(url:string)=>void}} deps
 */
export function createAlarmAssetPlayer({ createAudio, onFallback } = {}) {
  if (typeof createAudio !== 'function') throw new RangeError('createAlarmAssetPlayer: createAudio 注入必填');
  let el = null;
  let url = '';
  let lastErrCode = null;
  const failedUrls = new Set();
  const clamp = (v) => Math.max(0, Math.min(1, Number(v) || 0));
  const fireFallback = (u) => {
    if (!failedUrls.has(u)) {
      failedUrls.add(u);
      if (typeof onFallback === 'function') { try { onFallback(u); } catch (_) {} }
    }
  };
  return {
    /** 播放：返回 'playing' | 'failed'（同 url 已知失败不重试） */
    play(u, { volume = 1, loop = true } = {}) {
      if (!u || failedUrls.has(u)) return 'failed';
      if (el && url === u && !el.paused) { el.volume = clamp(volume); return 'playing'; }
      this.stop();
      url = u;
      let audio;
      try { audio = createAudio(u); } catch (_) { fireFallback(u); return 'failed'; }
      if (!audio) { fireFallback(u); return 'failed'; }
      el = audio;
      el.loop = !!loop;
      el.volume = clamp(volume);
      const onErr = () => { if (el && el.error) lastErrCode = el.error.code; fireFallback(u); };
      el.__onErr = onErr;
      el.addEventListener('error', onErr);
      let p;
      try { p = el.play(); } catch (_) { p = null; }
      if (p && typeof p.catch === 'function') p.catch(() => fireFallback(u));
      return 'playing';
    },
    /** 同步音量（渐强离散采样点 / in-call 标量） */
    setVolume(v) { if (el) el.volume = clamp(v); },
    /** 停止并释放（AOSP MediaPlayer.release 语义；失败账本保留防循环重试）。
       注：先卸 error 监听再清 src——清空 src 会触发 NotSupportedError error 事件，
       不卸会把正常释放误记账成资源失败（后续同 url 会错回落合成）。 */
    stop() {
      if (el) {
        try { el.pause(); } catch (_) {}
        try { el.removeEventListener('error', el.__onErr || (() => {})); } catch (_) {}
        try { el.src = ''; } catch (_) {}
      }
      el = null; url = '';
    },
    /** 观测面（e2e/vitest 同步探针，零定时器依赖——无头节流坑规避） */
    currentSrc() { return el ? el.src : ''; },
    isPlaying() { return !!(el && !el.paused); },
    loopFlag() { return el ? !!el.loop : null; },
    currentTime() { try { return el ? (el.currentTime || 0) : 0; } catch (_) { return 0; } },
    lastError() { return lastErrCode; },
    failedUrlsList() { return [...failedUrls]; },
  };
}
