// ==================== media-service.js — 全局电台与流媒体服务中心 (Real HTML5 Audio) ====================
//
// 核心功能:
//   1. 真实驱动底层 HTML5 <audio> 引擎，支持在线公共电台流与本地音频文件导入 (Blob URL)
//   2. 统一分发状态至：
//      - 下拉通知中心顶部的 Pixel 10 流媒体胶囊 (Notification Shade Media Capsule)
//      - 快速设置媒体音量滑块 (Quick Settings Volume Slider)
//      - 状态栏动态音乐播放指示器
//      - 概览微件音乐条 (At-a-Glance Media Chip)
//      （v7.29：播客应用已下线，本服务作为系统级电台引擎独立存续 —— 胶囊/音量/指示器/微件
//       的数据源不受应用增删影响；点击胶囊直达音乐应用）

import {
  STREAM_MUSIC,
  DYNAMIC_STREAM_REMOTE_START_INDEX,
  makeStreamModel,
} from './aosp/volume-sliders.js';
// v9.86 #110：媒体键优先级仲裁（MediaSessionStack.getPriorityList 三级同构）
import {
  streamsToSessions,
  resolveMediaButtonSession,
  routeMediaAction,
} from './aosp/media-keys.js';
// v9.87 #118：本地音频 ID3/FLAC/MP4 封面解析 + MediaMetadata artwork 通道
import { parseAudioMeta, artworkFromTrack } from './media-meta.js';

export const PLAYLIST = [
  {
    id: 'track-1',
    title: 'Pixel Space: Android 16 & MD3',
    artist: 'Google Pixel 开发者电台',
    album: 'Google I/O Special',
    src: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    isLocal: false,
    durationText: '02:40'
  },
  {
    id: 'track-2',
    title: 'Lofi Chill Study & Focus Code',
    artist: 'Lofi Girl • 专注编程频道',
    album: 'Deep Focus Sessions',
    src: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-amp-strings-10711.mp3',
    isLocal: false,
    durationText: '02:05'
  },
  {
    id: 'track-3',
    title: 'Beethoven: Moonlight Sonata',
    artist: '经典交响乐团',
    album: 'Classical Masterpieces',
    src: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_733568c853.mp3?filename=beethoven-moonlight-sonata-114422.mp3',
    isLocal: false,
    durationText: '05:14'
  }
];

class MediaService {
  constructor() {
    // fix(audit-C #11): Audio 惰性创建 —— 旧实现在模块单例 import 期即 new Audio() +
    // loadTrack(0,false) 设 src，导致用户从未打开播客也向 pixabay CDN 发 metadata 网络请求；
    // 现推迟到首次播放/用户交互（ensureAudio）时再创建元素并装载 src，import 零网络依赖
    this.audio = null;
    this.playlist = [...PLAYLIST];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.playbackRate = 1.0;
    this.volume = 0.6;
    this.listeners = new Set();
    // fix(audit-C #30): 本地导入曲目的 objectURL 登记（id → url）—— 淘汰时统一 revoke，
    // 修复「导入的 blob URL 永不释放」的会话级泄漏
    this.localUrls = new Map();
    // v7.76 音乐应用联动：iframe 音乐应用（CyanWave）经 MEDIA_STATE_SYNC 上报的真实
    // 播放状态覆盖层 —— 活跃时 getState() 合成返回真实曲名/进度，通知胶囊 / QS /
    // At-a-Glance / 状态栏全部随之联动（旧实现各处永远显示内置电台演示曲目）
    this.external = null;
    // #193 缺口二期：流注册表（AOSP VolumeDialogStreamModel 多流模型映射）——
    // streamId → { streamId, stream, isDynamic, lastActiveTs }；isActive = 近 3s 内有实际
    // 发声（AOSP isActive 为系统流状态位，md3 以 3s 活跃窗口映射——VisibilityInteractor
    // MAX_DIALOG_SHOW_TIME 同源时长）。内置两流：宿主电台（STREAM_MUSIC 本地 audio 元素）、
    // 音乐应用覆盖层（DYNAMIC_STREAM_REMOTE_START_INDEX 远程媒体段语义：音源不在宿主
    // audio 元素而在 iframe，结构同构于 cast 远程媒体流，诚实标注）。
    this.streams = new Map();
    this.registerAudioStream({ streamId: 'host-radio', stream: STREAM_MUSIC, isDynamic: false });
    this.registerAudioStream({ streamId: 'external-music', stream: DYNAMIC_STREAM_REMOTE_START_INDEX, isDynamic: true });
  }

  /** #193 缺口二期：流注册（发声源接入点；重复注册幂等） */
  registerAudioStream({ streamId, stream, isDynamic = false }) {
    if (!streamId || this.streams.has(streamId)) return;
    this.streams.set(streamId, { streamId, stream, isDynamic, lastActiveTs: 0 });
    this.notify();
  }

  /** 流注销（音源销毁时调用；未注册幂等） */
  unregisterAudioStream(streamId) {
    if (!this.streams.has(streamId)) return;
    this.streams.delete(streamId);
    this.notify();
  }

  /** 活跃心跳：音源实际发声时调用（audio play 事件 / iframe 上报） */
  markStreamActive(streamId) {
    const rec = this.streams.get(streamId);
    if (!rec) return;
    rec.lastActiveTs = Date.now();
  }

  /** isActive 判定：近 3s 内有实际发声（AOSP isActive 流状态位的 md3 映射口径） */
  isStreamActive(rec) {
    return !!rec && (Date.now() - rec.lastActiveTs) < 3000;
  }

  /** VolumeDialogStreamModel 形态快照（buildSlidersModel 消费；streamId 升序稳定序——
      AOSP 以 stream 数值为键同值唯一，md3 扩展键由注册序保序，诚实标注） */
  streamModels() {
    return [...this.streams.values()].map((rec) => makeStreamModel({
      streamId: rec.streamId,
      stream: rec.stream,
      isActive: this.isStreamActive(rec),
      isDynamic: rec.isDynamic,
    }));
  }

  /** 音乐应用回报的真实状态 → 覆盖层（isPlaying=true 时抢占：宿主电台自动暂停） */
  applyExternalState(payload) {
    if (!payload || typeof payload !== 'object') return;
    const title = String(payload.title || '');
    const isPlaying = !!payload.isPlaying;
    if (!title && !isPlaying) {
      // 音乐应用曲库清空/无曲目：清除覆盖层，回落宿主电台
      this.external = null;
      this.notify();
      return;
    }
    // 新媒体源抢占：音乐应用开播时宿主电台自动暂停（Android 同源语义）
    if (isPlaying && this.audio && !this.audio.paused) {
      try { this.audio.pause(); } catch (e) {}
    }
    this.external = {
      title,
      artist: String(payload.artist || '音乐应用'),
      isPlaying,
      currentTime: Number(payload.currentTime) || 0,
      duration: Number(payload.duration) || 0,
      // v9.87 #118：封面通道（音乐应用上报 data URL/objectURL；无字段 = 维持既有回落）
      coverUrl: payload.coverUrl ? String(payload.coverUrl) : (this.external && this.external.coverUrl) || '',
      coverMime: payload.coverMime ? String(payload.coverMime) : (this.external && this.external.coverMime) || '',
      ts: Date.now(),
    };
    if (isPlaying) this.markStreamActive('external-music');   // #193 二期：音乐应用流活跃心跳
    this.notify();
  }

  /** 覆盖层是否活跃（播放中或暂停但仍有曲目 —— Android 媒体通知同样常驻曲名） */
  externalActive() {
    return !!(this.external && (this.external.title || this.external.isPlaying));
  }

  /** 控制反向通道：胶囊/线控的播放控制转发给音乐应用 iframe（广播，音乐应用自过滤） */
  dispatchMediaCommand(cmd, value) {
    try {
      const frames = document.querySelectorAll('iframe');
      frames.forEach((f) => {
        try { f.contentWindow.postMessage({ type: 'MEDIA_COMMAND', cmd, value }, '*'); } catch (e) {}
      });
    } catch (e) {}
  }

  /** 惰性创建 audio 元素（首次播放/用户交互时）；只建元素挂事件，不在此装载 src */
  ensureAudio() {
    if (this.audio) return this.audio;
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.audio.volume = this.volume;
    this.audio.playbackRate = this.playbackRate;
    this.setupAudioEvents();
    return this.audio;
  }

  /** 装载指定曲目的 src（不自动播放），进度/时长归零 */
  applyTrackSrc(track) {
    if (!track) return;
    this.audio.src = track.src;
    this.audio.playbackRate = this.playbackRate;
    this.currentTime = 0;
    this.duration = 0;
  }

  /** 首次播放前确保当前曲目 src 已装载（把 import 期推迟的网络请求在此补上） */
  ensureLoaded() {
    this.ensureAudio();
    if (!this.audio.src) {
      this.applyTrackSrc(this.playlist[this.currentIndex] || this.playlist[0]);
    }
  }

  setupAudioEvents() {
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.markStreamActive('host-radio');       // #193 二期：宿主流活跃心跳
      this.syncMediaSession();
      this.notify();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.syncMediaSession();
      this.notify();
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime = this.audio.currentTime;
      this.duration = this.audio.duration || 0;
      if (this.isPlaying) this.markStreamActive('host-radio');  // 发声中持续心跳
      this.syncPositionState();
      this.notify();
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.duration = this.audio.duration || 0;
      this.syncMediaSession();
      this.notify();
    });

    this.audio.addEventListener('ended', () => {
      this.next();
    });

    this.audio.addEventListener('error', (err) => {
      console.warn('Audio stream fallback notice:', err);
    });

    this.setupMediaSessionHandlers();
  }

  /**
   * fix(P2)：接入 navigator.mediaSession —— 旧实现只挂 audio 元素事件，系统级
   * 媒体控制（键盘媒体键 / 锁屏控件 / 蓝牙线控 / OS 媒体弹窗）全部无效。
   * 元数据随曲目/播放状态变化同步，动作处理器在 ensureAudio 时一次性注册。
   */
  setupMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const setHandler = (action, fn) => {
      try { ms.setActionHandler(action, fn); } catch (e) { /* 引擎不支持该动作时忽略 */ }
    };
    setHandler('play', () => this.play());
    setHandler('pause', () => this.pause());
    setHandler('previoustrack', () => this.prev());
    setHandler('nexttrack', () => this.next());
    setHandler('seekbackward', (details) => {
      if (this.audio) this.audio.currentTime = Math.max(0, this.audio.currentTime - (details.seekOffset || 10));
    });
    setHandler('seekforward', (details) => {
      if (this.audio) this.audio.currentTime = Math.min(this.duration || this.audio.duration || 0, this.audio.currentTime + (details.seekOffset || 10));
    });
    setHandler('seekto', (details) => {
      if (this.audio && details.seekTime != null && this.duration > 0) this.audio.currentTime = details.seekTime;
    });
    this.syncMediaSession();
  }

  /** 同步曲目元数据与播放状态到 OS 媒体会话 */
  syncMediaSession() {
    if (!('mediaSession' in navigator)) return;
    try {
      const track = this.getCurrentTrack();
      const ex = this.externalActive() && this.external ? this.external : null;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        // v9.87 #118：artwork 封面（外部覆盖层优先——它才是当前受控会话的曲面）
        artwork: artworkFromTrack(ex || track),
      });
      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
      this.syncPositionState();
    } catch (e) { /* MediaMetadata 不可用等引擎差异忽略 */ }
  }

  /** 同步进度（锁屏/线控进度条显示用）；无时长或未播放时跳过 */
  syncPositionState() {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    try {
      if (this.audio && this.duration > 0 && Number.isFinite(this.duration)) {
        navigator.mediaSession.setPositionState({
          duration: this.duration,
          playbackRate: this.playbackRate || 1,
          position: Math.min(this.audio.currentTime, this.duration),
        });
      }
    } catch (e) { /* 位置非法（暂停过久等）时引擎会抛错，忽略 */ }
  }

  loadTrack(index, autoPlay = true) {
    if (this.externalActive()) return; // v7.76：音乐应用接管期间宿主电台不切曲
    this.loadHostTrack(index, autoPlay);
  }

  /** #110：宿主切曲原生路径（无覆盖层守卫——媒体键仲裁已决定宿主受控时直用） */
  loadHostTrack(index, autoPlay = true) {
    if (index < 0 || index >= this.playlist.length) return;
    this.currentIndex = index;
    const track = this.playlist[index];
    // fix(audit-C #11): audio 尚未创建（用户从未交互）且不需自动播放 → 只记录待播索引，
    // 不设 src 不发网络请求；自动播放路径必来自用户手势 → 此刻初始化并装载
    if (!this.audio) {
      if (!autoPlay) { this.notify(); return; }
      this.ensureAudio();
    }
    this.applyTrackSrc(track);
    this.syncMediaSession(); // 切曲后立即刷新 OS 媒体会话元数据

    if (autoPlay) {
      this.audio.play().catch(() => {});
    }
    this.notify();
  }

  getCurrentTrack() {
    return this.playlist[this.currentIndex] || this.playlist[0];
  }

  play() {
    if (this.externalActive()) { this.dispatchMediaCommand('play'); return; } // v7.76：转发音乐应用
    this.ensureLoaded(); // fix(audit-C #11): 首次播放时才创建 audio 并装载当前曲目
    this.audio.play().catch(() => {});
  }

  pause() {
    if (this.externalActive()) { this.dispatchMediaCommand('pause'); return; } // v7.76：转发音乐应用
    if (!this.audio) return; // 从未创建（从未播放过）→ 无需暂停
    this.audio.pause();
  }

  togglePlay() {
    if (this.externalActive()) { this.dispatchMediaCommand('toggle'); return; } // v7.76：转发音乐应用
    this.ensureLoaded();
    if (this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  next() {
    if (this.externalActive()) { this.dispatchMediaCommand('next'); return; } // v7.76：转发音乐应用
    const nextIdx = (this.currentIndex + 1) % this.playlist.length;
    this.loadTrack(nextIdx, true);
  }

  prev() {
    if (this.externalActive()) { this.dispatchMediaCommand('prev'); return; } // v7.76：转发音乐应用
    if (this.audio && this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    const prevIdx = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    this.loadTrack(prevIdx, true);
  }

  seek(percent) {
    if (this.externalActive()) { this.dispatchMediaCommand('seek', percent); return; } // v7.76：转发音乐应用
    if (this.duration > 0 && this.audio) {
      const targetTime = (Math.max(0, Math.min(100, percent)) / 100) * this.duration;
      this.audio.currentTime = targetTime;
    }
  }

  /** #110：宿主原生播放（绕过 externalActive 路由——仲裁路径专用，其余链路不走此） */
  playHost() {
    this.ensureLoaded();
    this.audio.play().catch(() => {});
  }

  /**
   * #110 媒体键入口：AOSP MediaSessionService.dispatchMediaKeyEvent 同构 ——
   * ①从流注册表 + 双会话快照建仲裁输入（streamsToSessions，LRU 新者先）；
   * ②getPriorityList 三级仲裁选唯一 media button session（播放中 > 活跃未播放 >
   *   不活跃；无受控会话 → 静默零副作用）；
   * ③routeMediaAction 单目标路由：external-music → MEDIA_COMMAND 转发（iframe 自
   *   过滤）；host-radio → 原生 audio 控制（stop = 停止语义 暂停+归位，
   *   fast_forward/rewind = ±10s，navigator.mediaSession seekOffset 缺省同值）。
   *
   * 真行为缺口修复在录：旧路由 externalActive() 使「暂停但有曲目」的覆盖层抢占
   * 「正在播放」的宿主电台（externActive 只要 title 在场即接管），违背 AOSP
   * 「PlaybackState 活跃优先」仲裁——本方法以仲裁结果路由，播放中的会话恒优先。
   * @param {string} action keyToMediaAction().action
   * @returns {{target:string|null, cmd:string|null, sessions:Array, resolved:string|null}}
   */
  dispatchMediaKey(action) {
    const snap = {
      externalActive: this.externalActive(),
      externalPlaying: !!(this.external && this.external.isPlaying),
      // 会话上报态优先（AOSP checkPlaybackActiveState 读 PlaybackState——
      // session 自报的播放位，非硬体瞬时值）；audio.paused 仅为无事件环境兑底
      hostPlaying: !!(this.isPlaying || (this.audio && !this.audio.paused)),
      externalTs: this.external ? this.external.ts : 0,
    };
    const sessions = streamsToSessions(this.streams.values(), snap);
    const target = resolveMediaButtonSession(sessions);
    const route = routeMediaAction(action, target ? target.id : null);
    if (!route.target) {
      return { target: null, cmd: null, sessions, resolved: null }; // 静默
    }
    if (route.target === 'external-music') {
      this.dispatchMediaCommand(route.cmd);
    } else {
      // 宿主原生控制路径（绕过 play/pause/togglePlay/next/prev 内部的
      // externalActive() 二段路由——否则仲裁选了宿主仍被「暂停但有曲目」的
      // 覆盖层抢走，等同未修复；AOSP 仲裁单目标语义要求控制直达受控会话）
      const a = this.audio;
      switch (route.cmd) {
        case 'togglePlay':
          // 与仲裁快照同源的上报态判定（audio.paused 裸值在 src 装载期会瞬时回真）
          if (this.isPlaying && a) { a.pause(); }
          else { this.playHost(); }
          break;
        case 'play': this.playHost(); break;
        case 'pause':
          if (a) a.pause();
          break;
        case 'next':
          this.loadHostTrack((this.currentIndex + 1) % this.playlist.length, true);
          break;
        case 'prev':
          if (a && a.currentTime > 3) { a.currentTime = 0; break; }
          this.loadHostTrack((this.currentIndex - 1 + this.playlist.length) % this.playlist.length, true);
          break;
        case 'stop':
          // KEYCODE_MEDIA_STOP 停止语义：暂停 + 归位（不同于 pause 的纯暂停）
          try { a.pause(); a.currentTime = 0; } catch (e) {}
          break;
        case 'fast_forward':
          try { a.currentTime = Math.min(this.duration || a.duration || 0, a.currentTime + 10); } catch (e) {}
          break;
        case 'rewind':
          try { a.currentTime = Math.max(0, a.currentTime - 10); } catch (e) {}
          break;
      }
    }
    return { target: route.target, cmd: route.cmd, sessions, resolved: target ? target.id : null };
  }

  setVolume(val) {
    const v = Math.max(0, Math.min(1, val));
    this.volume = v;
    if (this.audio) this.audio.volume = v; // fix(audit-C #11): audio 未创建时只记账，创建时同步
    this.notify();
  }

  setSpeed(rate) {
    this.playbackRate = rate;
    if (this.audio) this.audio.playbackRate = rate;
    this.notify();
  }

  /** 导入本地音频文件 (MP3, WAV, AAC, M4A, OGG) */
  importLocalAudio(file) {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const newTrack = {
      id: 'local-' + Date.now(),
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: '本地音频导入',
      album: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      src: objectUrl,
      isLocal: true,
      durationText: '本地音频'
    };

    this.localUrls.set(newTrack.id, objectUrl);
    this.playlist.unshift(newTrack);

    // v9.87 #118：内嵌封面解析（ID3v2 APIC/FLAC PICTURE/MP4 covr，media-meta 纯解析）
    // → objectURL 登记 → MediaMetadata artwork + 通知胶囊真封面；解析失败零影响（回落图标）
    try {
      file.arrayBuffer().then((buf) => {
        const meta = parseAudioMeta(new Uint8Array(buf));
        if (meta && meta.cover && meta.cover.data && meta.cover.data.length > 0) {
          const coverUrl = URL.createObjectURL(new Blob([meta.cover.data], { type: meta.cover.mime || 'image/jpeg' }));
          newTrack.coverUrl = coverUrl;
          newTrack.coverMime = meta.cover.mime || 'image/jpeg';
          this.localUrls.set(newTrack.id + '-cover', coverUrl); // 同桶登记，淘汰同 revoke
          if (this.playlist[0] === newTrack) this.syncMediaSession(); // 当前曲立即上屏
          this.notify();
        }
      }).catch(() => {});
    } catch (e) { /* 解析失败零影响 */ }

    // fix(audit-C #30): 本地曲目封顶（保留最新 8 条）—— 超出的最旧本地曲目从播放列表
    // 淘汰并 revoke 其 objectURL；旧实现导入的 blob URL 永不释放、列表无限增长（会话级泄漏）
    const locals = this.playlist.filter((t) => t.isLocal);
    if (locals.length > 8) {
      const evictIds = new Set(locals.slice(8).map((t) => t.id));
      this.playlist.forEach((t) => {
        if (!evictIds.has(t.id)) return;
        try { URL.revokeObjectURL(t.src); } catch (e) {}
        try { if (t.coverUrl) URL.revokeObjectURL(t.coverUrl); } catch (e) {} // #118 封面同撤销
        this.localUrls.delete(t.id);
        this.localUrls.delete(t.id + '-cover');
      });
      this.playlist = this.playlist.filter((t) => !evictIds.has(t.id));
    }

    this.loadTrack(0, true);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  getState() {
    // v7.76 音乐应用联动：覆盖层活跃时合成返回真实曲名/进度（字段名与电台态完全兼容）
    if (this.externalActive() && this.external) {
      const ex = this.external;
      const progress = ex.duration > 0 ? (ex.currentTime / ex.duration) * 100 : 0;
      return {
        track: {
          title: ex.title,
          artist: ex.artist,
          album: '音乐应用',
          isExternal: true,
          coverUrl: ex.coverUrl || '',
          coverMime: ex.coverMime || '',
        },
        isPlaying: ex.isPlaying,
        currentTime: ex.currentTime,
        duration: ex.duration,
        progress: progress,
        volume: this.volume,
        playbackRate: this.playbackRate,
        playlist: [...this.playlist],
        currentIndex: this.currentIndex,
      };
    }
    const progress = this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
    return {
      track: this.getCurrentTrack(),
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      progress: progress,
      volume: this.volume,
      playbackRate: this.playbackRate,
      playlist: [...this.playlist],
      currentIndex: this.currentIndex
    };
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach((cb) => {
      try {
        cb(state);
      } catch (e) {
        console.error(e);
      }
    });
  }
}

export const mediaService = new MediaService();

// ==================== v7.76 音乐应用联动 ====================
// 接收音乐应用 iframe（CyanWave）的 MEDIA_STATE_SYNC 上报 → 覆盖层接管系统媒体显示；
// 消息来源不校验 contentWindow（postMessage 无敏感操作，仅改显示态；伪造面 = 曲名文本）。
if (typeof window !== 'undefined') {
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.type !== 'MEDIA_STATE_SYNC' || !d.payload) return;
    try { mediaService.applyExternalState(d.payload); } catch (err) {}
  });
  // #110 媒体键调试钩子（零 import 惯例，同 __monetReroll/__oneHanded）：
  // dispatch = 仲裁+路由真跑；resolve = 仲裁快照（受控会话/双会话输入）
  window.__mediaKeys = {
    dispatch: (action) => mediaService.dispatchMediaKey(String(action || '')),
    state: () => ({
      currentIndex: mediaService.currentIndex,
      hostPlaying: !!(mediaService.isPlaying || (mediaService.audio && !mediaService.audio.paused)),
      isPlaying: mediaService.isPlaying,
      externalActive: mediaService.externalActive(),
      externalPlaying: !!(mediaService.external && mediaService.external.isPlaying),
      trackTitle: (mediaService.getCurrentTrack() || {}).title || '',
    }),
    resolve: () => {
      const snap = {
        externalActive: mediaService.externalActive(),
        externalPlaying: !!(mediaService.external && mediaService.external.isPlaying),
        hostPlaying: !!(mediaService.isPlaying || (mediaService.audio && !mediaService.audio.paused)),
        externalTs: mediaService.external ? mediaService.external.ts : 0,
      };
      const sessions = streamsToSessions(mediaService.streams.values(), snap);
      const target = resolveMediaButtonSession(sessions);
      return { target: target ? target.id : null, sessions };
    },
  };
}
