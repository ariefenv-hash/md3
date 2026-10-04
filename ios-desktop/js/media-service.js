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

export const PLAYLIST = [
  {
    id: 'track-1',
    title: 'Pixel Space: Android 16 & MD3',
    artist: 'Google Pixel 开发者电台',
    album: 'Google I/O Special',
    coverGradient: 'linear-gradient(135deg, #a8c7fa 0%, #669df6 100%)',
    src: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    isLocal: false,
    durationText: '02:40'
  },
  {
    id: 'track-2',
    title: 'Lofi Chill Study & Focus Code',
    artist: 'Lofi Girl • 专注编程频道',
    album: 'Deep Focus Sessions',
    coverGradient: 'linear-gradient(135deg, #d0bcff 0%, #9a82db 100%)',
    src: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-amp-strings-10711.mp3',
    isLocal: false,
    durationText: '02:05'
  },
  {
    id: 'track-3',
    title: 'Beethoven: Moonlight Sonata',
    artist: '经典交响乐团',
    album: 'Classical Masterpieces',
    coverGradient: 'linear-gradient(135deg, #c2e7ff 0%, #7fcfff 100%)',
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
      this.notify();
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notify();
    });

    this.audio.addEventListener('timeupdate', () => {
      this.currentTime = this.audio.currentTime;
      this.duration = this.audio.duration || 0;
      this.notify();
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.duration = this.audio.duration || 0;
      this.notify();
    });

    this.audio.addEventListener('ended', () => {
      this.next();
    });

    this.audio.addEventListener('error', (err) => {
      console.warn('Audio stream fallback notice:', err);
    });
  }

  loadTrack(index, autoPlay = true) {
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

    if (autoPlay) {
      this.audio.play().catch(() => {});
    }
    this.notify();
  }

  getCurrentTrack() {
    return this.playlist[this.currentIndex] || this.playlist[0];
  }

  play() {
    this.ensureLoaded(); // fix(audit-C #11): 首次播放时才创建 audio 并装载当前曲目
    this.audio.play().catch(() => {});
  }

  pause() {
    if (!this.audio) return; // 从未创建（从未播放过）→ 无需暂停
    this.audio.pause();
  }

  togglePlay() {
    this.ensureLoaded();
    if (this.audio.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  next() {
    const nextIdx = (this.currentIndex + 1) % this.playlist.length;
    this.loadTrack(nextIdx, true);
  }

  prev() {
    if (this.audio && this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    const prevIdx = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    this.loadTrack(prevIdx, true);
  }

  seek(percent) {
    if (this.duration > 0 && this.audio) {
      const targetTime = (Math.max(0, Math.min(100, percent)) / 100) * this.duration;
      this.audio.currentTime = targetTime;
    }
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
      coverGradient: 'linear-gradient(135deg, #7df8db 0%, #006b5a 100%)',
      src: objectUrl,
      isLocal: true,
      durationText: '本地音频'
    };

    this.localUrls.set(newTrack.id, objectUrl);
    this.playlist.unshift(newTrack);

    // fix(audit-C #30): 本地曲目封顶（保留最新 8 条）—— 超出的最旧本地曲目从播放列表
    // 淘汰并 revoke 其 objectURL；旧实现导入的 blob URL 永不释放、列表无限增长（会话级泄漏）
    const locals = this.playlist.filter((t) => t.isLocal);
    if (locals.length > 8) {
      const evictIds = new Set(locals.slice(8).map((t) => t.id));
      this.playlist.forEach((t) => {
        if (!evictIds.has(t.id)) return;
        try { URL.revokeObjectURL(t.src); } catch (e) {}
        this.localUrls.delete(t.id);
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
