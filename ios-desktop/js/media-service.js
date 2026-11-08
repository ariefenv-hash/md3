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
// v9.94 #118：本地音频 ID3/FLAC/MP4 封面解析 + MediaMetadata artwork 通道
import { parseAudioMeta, artworkFromTrack } from './media-meta.js';
// v9.94 #116：媒体 GainNode 音量链（iOS audio.volume 只读恒 1 的 P0 地基）——
// 同源门控接管 + 元素中性化防双层衰减（aosp/media-gain.js R1/R2/R3 铁律）
import {
  isSameOriginMediaSource,
  createGainChain,
  resolveGainVolume,
  resumeIfSuspended,
  nextPlayableIndex,
} from './aosp/media-gain.js';
// v9.94 #116：共享 AudioContext 单例（sound-haptics 同上下文，#117 收编方向第一步）
import { getSharedAudioContext } from './sound-haptics.js';
// v10.81 #117：双层音量架构 Layer2 流总线（注册采纳/记账/持久化/首播引导派发）
import { levelToGain, resolveOnboardingDismissed, dismissOnboarding } from './aosp/audio-graph.js';
import { getAudioGraph } from './audio-graph-instance.js';

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
    // v10.81 #117：媒体流音量恢复（settings:sound-v1 media 键持久化——此前为易失内存态，
    // 刷新回落 0.6；经 audio-graph 适配器读单一真源，缺省/非法回落 60 同值）
    this.volume = levelToGain(getAudioGraph().getLevel('media'));
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
    // v9.94 #116：GainNode 接管态（R1 元素级一次性：建链后 audio 输出只走图，不可撤销）
    //   gainChain —— { source, gain } | null（null = 未接管，audio.volume 直连路径）
    //   gainSessionBlocked —— 本会话永久放弃接管（无 WebAudio / 建链失败，直连兜底）
    //   gainNormalize —— 外链曲目 blob 归一化状态机（idle|running|done；R2 全池同源前提）
    this.gainChain = null;
    this.gainSessionBlocked = false;
    this.gainNormalize = 'idle';
    // 测试注入口（vitest 注入 ctxFactory/fetchImpl；生产零消费）
    this.__gainHooks = {};
  }

  /** 参照 origin（location 不可用/ file: opaque 时返回 ''，门控仅放行 blob:/data:） */
  _origin() {
    try { return (typeof location !== 'undefined' && location.origin) || ''; } catch (e) { return ''; }
  }

  /**
   * v9.94 #116 接管评估（R1 幂等 + R2 同源门控 + R3 手势时机——由 play() 调用）：
   * ① 当前曲同源可信（blob/data/同源）即接管 —— VFS 本地导入主路径离线也可用
   *   （P0 验收：iOS 拖滑条听感变化；不等全池，外链归一化机会性后台进行）；
   * ② 池内仍有外链曲目时机会性触发 blob 归一化（_normalizeExternalTracks）：成功者
   *    恢复可播，失败者保持外链（接管态切曲时被跳过——loadHostTrack skip 语义）；
   * ③ 当前曲外链 → 不接管直连（桌面 audio.volume 零变化；iOS 外链音量维持既有边界，
   *   #117 归一化后收口）；④ 无 WebAudio/建链失败 → 本会话永久直连兜底。
   */
  _maybeAttachGain() {
    if (this.gainChain || this.gainSessionBlocked || !this.audio) return;
    const origin = this._origin();
    const track = this.getCurrentTrack();
    if (!track || !isSameOriginMediaSource(track.src, origin)) return;   // 当前曲外链 → 直连
    if (this.playlist.some((t) => t && !isSameOriginMediaSource(t.src, origin))) {
      this._normalizeExternalTracks();                                   // 外链机会性归一化（后台）
    }
    const ctx = this.__gainHooks.ctxFactory ? this.__gainHooks.ctxFactory() : getSharedAudioContext();
    if (!ctx) { this.gainSessionBlocked = true; return; }                // 无 WebAudio → 直连兜底
    // v10.81 #117：主总线先行挂载（幂等；失败不阻断建链——链路仍直连 destination 兑底）
    getAudioGraph().attach(ctx);
    const chain = createGainChain(ctx, this.audio);                      // R1 一次性（失败=null）
    if (!chain) { this.gainSessionBlocked = true; return; }
    this.gainChain = chain;
    // 元素中性化（防双层衰减）：音量真值移交 GainNode，元素恒 1（audio.volume=1 在 iOS
    // 亦无害——本来就只读）；增益对齐当前音量后恢复挂起的上下文（R3）
    try { this.audio.volume = 1; } catch (e) {}
    chain.gain.gain.value = resolveGainVolume(this.volume);
    // v10.81 #117：媒体增益节点注册采纳进主总线拓扑（node→master→destination 重连 +
    // analyser 抽头；采纳语义 = 图侧 level 从节点现值同步，写路径仍由 setVolume 单点承载）
    getAudioGraph().registerNode('media', chain.gain);
    resumeIfSuspended(ctx);
    this.notify();
  }

  /**
   * R2 前提工程：外链曲目 blob 归一化（fetch→objectURL 就地替换 src）。
   * 每会话至多一轮（gainNormalize 状态机）；失败曲目保持原 src（接管态被切曲跳过）。
   * 跨域 fetch 需服务器 CORS 放行（mode:'cors'）——无 CORS 的流不归一化，接管态
   * 跳过播放，绝不污染图输出静音（#116 风险 2 防御）。
   */
  _normalizeExternalTracks() {
    if (this.gainNormalize !== 'idle') return;
    this.gainNormalize = 'running';
    const origin = this._origin();
    const fetchImpl = this.__gainHooks.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    const targets = this.playlist.filter((t) => t && !isSameOriginMediaSource(t.src, origin));
    if (!targets.length || !fetchImpl) { this.gainNormalize = 'done'; return; }
    let settled = 0;
    targets.forEach((t) => {
      fetchImpl(t.src, { mode: 'cors' }).then((res) => {
        if (!res || !res.ok) return null;
        return res.blob();
      }).then((blob) => {
        if (blob && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          try { t.src = URL.createObjectURL(blob); } catch (e) { /* 归一化失败保持原 src */ }
        }
      }).catch(() => { /* 离线/无 CORS：曲目保持外链，接管态切曲被跳过 */ })
        .then(() => {
          settled += 1;
          if (settled === targets.length) this.gainNormalize = 'done';
        });
    });
  }

  /** v9.94 #116：GainNode 接管态快照（调试钩子/e2e 断言面） */
  __gainState() {
    const origin = this._origin();
    const track = this.getCurrentTrack();
    return {
      attached: !!this.gainChain,
      blocked: this.gainSessionBlocked,
      normalize: this.gainNormalize,
      volume: this.volume,
      elementVolume: this.audio ? this.audio.volume : null,
      gainValue: this.gainChain ? this.gainChain.gain.gain.value : null,
      currentEligible: track ? isSameOriginMediaSource(track.src, origin) : false,
    };
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
      // v9.94 #118：封面通道（音乐应用上报 data URL/objectURL；无字段 = 维持既有回落）
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

  /** 装载指定曲目的 src（不自动播放），进度/时长归零。
   *  v9.94 #116 R2 污染守卫：接管态（gainChain 在场）装载跨域源会让经图输出永久静音
   *  （CORS taint 且 R1 不可撤销）——守卫拒绝装载并记账（正常会话不可达：接管前提=
   *  全池同源，运行期唯一注入面 importLocalAudio 恒 blob；防御未来外链注入面）。 */
  applyTrackSrc(track) {
    if (!track) return;
    if (this.gainChain && !isSameOriginMediaSource(track.src, this._origin())) {
      console.warn('[media-gain] R2 taint guard: reject cross-origin src while graph-bound', track.id);
      return;
    }
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
        // v9.94 #118：artwork 封面（外部覆盖层优先——它才是当前受控会话的曲面）
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

  loadTrack(index, autoPlay = true, dir = 1) {
    if (this.externalActive()) return; // v7.76：音乐应用接管期间宿主电台不切曲
    this.loadHostTrack(index, autoPlay, dir);
  }

  /** #110：宿主切曲原生路径（无覆盖层守卫——媒体键仲裁已决定宿主受控时直用）。
   *  v9.94 #116 接管态外链跳过：目标曲不合格时按 dir 方向找最近合格曲目；
   *  整池无合格 → 停止语义（暂停归位，AOSP 播放队列无下一首同构）。 */
  loadHostTrack(index, autoPlay = true, dir = 1) {
    if (index < 0 || index >= this.playlist.length) return;
    if (this.gainChain && !isSameOriginMediaSource(this.playlist[index].src, this._origin())) {
      const playable = nextPlayableIndex(this.playlist, index, dir, (t) => isSameOriginMediaSource(t && t.src, this._origin()));
      if (playable === -1) {
        try { this.audio.pause(); } catch (e) {}
        this.notify();
        return;                              // 全池不可播：停止（接管态唯一诚实出口）
      }
      index = playable;
    }
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

    // v9.94 #116：接管评估必须在切曲路径上（importLocalAudio→loadTrack→loadHostTrack
    // 是导入主路径，直调 audio.play() 绕过 this.play()——首跑 e2e Q1 实踩）；幂等，
    // 已接管时零开销；当前曲合格即接管（R3：此处必在用户手势衍生链路）
    this._maybeAttachGain();

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
    this._maybeAttachGain(); // v9.94 #116：接管评估（手势衍生链路，R3；幂等，接管后音量真生效）
    // v10.81 #117 建议处理②：首启引导一次性派发（会话首播 → 下一帧 toast 说明双层关系；
    // 「可关闭」= toast 自动消失 + dismissed 持久化后永不重复；读取失败视为已读不骚扰）
    this._maybeAnnounceDualLayerOnce();
    this.audio.play().catch(() => {});
  }

  /** #117：首播一次性双层说明（mediaService 播放域 = 音量面板主控面——音乐/电台/本地导入；
   *  piano 等合成应用不在此域，诚实标注触发面）。会话内至多一次 try，dismissed 后静默。 */
  _maybeAnnounceDualLayerOnce() {
    if (this.__dualLayerAnnounced) return;
    this.__dualLayerAnnounced = true;
    try {
      if (!resolveOnboardingDismissed(localStorage)) {
        dismissOnboarding(localStorage);
        setTimeout(() => {
          try { import('./quick-settings.js').then(({ showSystemToast }) =>
            showSystemToast('应用音量独立于系统音量：两层同时生效，无声时请检查系统音量')); } catch (e) {}
        }, 600);
      }
    } catch (e) { /* 隐私模式/异常静默 */ }
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
    this.loadTrack(prevIdx, true, -1);
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
          this.loadHostTrack((this.currentIndex + 1) % this.playlist.length, true, 1);
          break;
        case 'prev':
          if (a && a.currentTime > 3) { a.currentTime = 0; break; }
          this.loadHostTrack((this.currentIndex - 1 + this.playlist.length) % this.playlist.length, true, -1);
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
    // v9.94 #116 双写分流：未接管 → audio.volume 直写（桌面既有路径零变化）；
    // 已接管 → 元素中性化恒 1（防 元素0.6×增益0.6=0.36 双层衰减），真值走 GainNode
    //（iOS 上 audio.volume 只读恒 1 本就无效，gain.gain.value 是唯一生效路径）
    if (this.audio) this.audio.volume = this.gainChain ? 1 : v; // fix(audit-C #11): audio 未创建时只记账
    if (this.gainChain) this.gainChain.gain.gain.value = resolveGainVolume(v);
    // v10.81 #117：媒体流总线记账（skipNode——节点真值仍由上行单点写，防双写漂移；
    // 持久化 settings:sound-v1 media 键 + audio-graph-level-changed/settings-sound-changed 事件）
    try { getAudioGraph().setLevel('media', Math.round(v * 100), { skipNode: true }); } catch (e) {}
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

    // v9.94 #118：内嵌封面解析（ID3v2 APIC/FLAC PICTURE/MP4 covr，media-meta 纯解析）
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
  // #116 媒体增益调试钩子（零 import 惯例）：state = 接管态/门控/归一化快照
  window.__mediaGain = {
    state: () => mediaService.__gainState(),
    setVolume: (v) => mediaService.setVolume(Number(v)),
  };
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
