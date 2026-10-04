// ==================== video-wallpaper.js — 视频壁纸引擎（壁纸路线第三步） ====================
//
// 上传本地视频 → Blob 原样存 IndexedDB（大文件无忧）→ <video> 全屏循环播放。
//   - 与静态/程序化壁纸互斥：后选者优先，双向清除记录
//   - 加载/解码失败兜底：toast 提示 + 自清理 + 回退链恢复下一优先级壁纸，且不落盘
//   - 应用全屏自动暂停播放、回桌面恢复（500ms 轮询，零耦合）
//   - prefers-reduced-motion 用户不自动播放（仅首帧静止呈现）
//   - 取当前帧同步给 iframe 应用与锁屏（静态画面，保证兼容与性能）
//   - 毛玻璃预烘焙层（desktop-blur.js）在应用开合时抓当前帧做模糊快照

import { state } from './state.js';
import { idbAvailable, idbGet, idbSet, idbDel } from './storage.js';
import { clearProceduralWallpaper } from './procedural-wallpaper.js';
import { refreshBlurSnapshot } from './desktop-blur.js';
import { ICONS } from './icons.js';
// 运行时才调用（ESM 循环引用安全，theme-engine 亦在运行时才调 clearVideoWallpaper）：
// 视频壁纸取色后统一走主题引擎的全量令牌应用 + iframe 样式表重注入
import { applyThemeHue } from './theme-engine.js';
// fix(audit-C #1): 失败兜底要走 wallpaper.js 的回退链（restoreWallpaper 恢复下一优先级壁纸）；
// fix(audit-C #2): 用户切换视频壁纸时清掉旧调色板（随后由本视频取色重写）。
// 两者同样只在事件回调里运行时调用，不参与模块求值期，循环引用安全
import { restoreWallpaper, clearSavedPalette } from './wallpaper.js';

export const VIDEO_IDB_KEY = 'wallpaper-video-blob';
export const VIDEO_LS_MARKER = 'ios-desktop:video-wallpaper';

let videoEl = null;
let objectURL = '';
let active = false;
let watchTimer = null;
let videoGen = 0; // fix(audit-C #1): 装载世代令牌 —— 新装载使旧装载的就绪/失败回调全部作废
let reducedMotion = false;
try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

export function isVideoActive() { return active; }
export function getVideoEl() { return videoEl; }

/** 互斥清理：静态自定义壁纸（IndexedDB 记录 + 旧 dataURL 记录） */
async function clearStaticWallpaperRecords() {
  if (idbAvailable()) await idbDel('wallpaper-blob');
  try {
    localStorage.removeItem('ios-desktop:wallpaper');
    sessionStorage.removeItem('ios-desktop:wallpaper');
  } catch (e) {}
}

function ensureVideoEl() {
  const desktop = document.getElementById('desktop');
  if (videoEl) {
    // 自愈：若元素被外部 DOM 级互斥清理摘除，重新挂载
    if (!videoEl.isConnected && desktop) desktop.insertBefore(videoEl, desktop.firstChild);
    return videoEl;
  }
  if (!desktop) return null;
  videoEl = document.createElement('video');
  videoEl.className = 'video-wallpaper';
  videoEl.muted = true;
  videoEl.loop = true;
  videoEl.autoplay = true;
  videoEl.setAttribute('playsinline', '');
  videoEl.setAttribute('webkit-playsinline', '');
  videoEl.disablePictureInPicture = true;
  videoEl.preload = 'auto';
  desktop.insertBefore(videoEl, desktop.firstChild);
  return videoEl;
}

/** 当前帧 → 高清 JPEG dataURL（iframe/锁屏/调色板提取共用，宽上限 2160） */
export function getVideoFrameDataURL() {
  if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) return '';
  try {
    // 该帧会作为应用底板/锁屏背景全屏展示：直接取视频原生分辨率（上限 2160），
    // 旧逻辑上限 1080 在桌面端/大窗口会被放大 1.3~2.4 倍而发虚；质量 0.85 → 0.88 消除压缩痕迹
    const w = Math.min(videoEl.videoWidth, 2160);
    const h = Math.max(1, Math.round((videoEl.videoHeight / videoEl.videoWidth) * w));
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    off.getContext('2d').drawImage(videoEl, 0, 0, w, h);
    return off.toDataURL('image/jpeg', 0.88);
  } catch (e) { return ''; }
}

function syncFrameToIframes() {
  const url = getVideoFrameDataURL();
  if (!url) return;
  document.querySelectorAll('iframe').forEach((iframe) => {
    try { iframe.contentWindow.postMessage({ type: 'set-wallpaper', url }, '*'); } catch (e) {}
  });
}

// ==================== 动态壁纸主题色提取（多帧加权色相直方图） ====================
//
// 原理：视频是会动的，单一帧的平均色会被黑场/转场带偏。
// 方案：沿时间轴采样多帧 → 逐像素转 HSL → 只保留「有色倾向」的像素
//       （饱和度过低、过黑过白的都不要）→ 按饱和度加权投票进 36 个色相桶
//       → 平滑后取最高票桶为主色相，次高票且色相差足够大的桶为次色相。
// 采样期间暂停播放、结束后回到片头恢复播放，整个过程不阻塞 UI。

const HUE_BINS = 36; // 10° 一桶

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (mx === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}

/** 采样一帧到 48×48 并累加进直方图/统计 */
function accumulateFrame(source, hist, stat) {
  try {
    const size = 48;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(source, 0, 0, size, size);
    const d = g.getImageData(0, 0, size, size).data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
      // 跳过近灰/近黑/近白像素：它们不该给主题色投票
      if (s < 0.12 || l < 0.06 || l > 0.96) continue;
      const w = s * s * (1 - Math.abs(l - 0.5) * 1.2); // 饱和度加权，中间调优先
      if (w <= 0) continue;
      const bin = Math.min(HUE_BINS - 1, Math.floor((h / 360) * HUE_BINS));
      hist[bin] += w;
      stat[bin].rs += d[i]; stat[bin].gs += d[i + 1]; stat[bin].bs += d[i + 2];
      stat[bin].ss += s; stat[bin].n++;
    }
  } catch (e) {}
}

/** 平滑后取票数最高的去重色相桶（相邻桶视为同一峰） */
function peakBins(hist, maxPeaks = 2) {
  const smooth = hist.map((_, i) =>
    hist[(i + HUE_BINS - 1) % HUE_BINS] + hist[i] * 2 + hist[(i + 1) % HUE_BINS]);
  const total = smooth.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  const order = smooth.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const peaks = [];
  for (const { v, i } of order) {
    if (peaks.length >= maxPeaks) break;
    // 去重：与已选峰色相距离 < 60° 的桶丢弃
    if (peaks.some((p) => {
      const d = Math.abs(p.bin - i) * (360 / HUE_BINS);
      return Math.min(d, 360 - d) < 60;
    })) continue;
    peaks.push({ bin: i, share: v / total });
  }
  return peaks;
}

const seekOnce = (video, t) => new Promise((resolve) => {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    video.removeEventListener('seeked', finish);
    resolve();
  };
  video.addEventListener('seeked', finish);
  try { video.currentTime = t; } catch (e) { finish(); }
  setTimeout(finish, 900); // 编码异常时的兜底
});

/**
 * 从视频多帧提取主题色 + 配色方案。
 * @returns {Promise<{hue:number, primary:number[], secondary:number[], tertiary:number[], accent:number[], neutral:number[]}|null>}
 */
export async function extractVideoPalette(video) {
  if (!video || !video.videoWidth) return null;
  const hist = new Array(HUE_BINS).fill(0);
  const stat = Array.from({ length: HUE_BINS }, () => ({ rs: 0, gs: 0, bs: 0, ss: 0, n: 0 }));

  const wasPlaying = !video.paused;
  try { video.pause(); } catch (e) {}
  const duration = isFinite(video.duration) && video.duration > 0.4 ? video.duration : 0;
  const points = duration
    ? [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => f * duration)
    : [video.currentTime || 0.1];

  for (const t of points) {
    await seekOnce(video, Math.min(Math.max(t, 0), Math.max(0.05, (duration || t) - 0.05)));
    accumulateFrame(video, hist, stat);
  }
  // 回到片头并恢复播放（采样期间停-stage 不被用户察觉：<1s）
  try { video.currentTime = 0; } catch (e) {}
  if (wasPlaying) { try { video.play().catch(() => {}); } catch (e) {} }

  const peaks = peakBins(hist);
  if (!peaks.length) return null;
  const binHue = (b) => Math.round(b * (360 / HUE_BINS) + 180 / HUE_BINS) % 360;

  const describe = (bin, fallbackS, fallbackL) => {
    const st = stat[bin];
    const s = st.n ? Math.round((st.ss / st.n) * 100) : fallbackS;
    const r = st.n ? st.rs / st.n : 128, g = st.n ? st.gs / st.n : 128, b = st.n ? st.bs / st.n : 128;
    const l = Math.min(88, Math.max(22, Math.round((0.299 * r + 0.587 * g + 0.114 * b) / 2.55)));
    return [binHue(bin), Math.max(28, s), l];
  };

  const primary = describe(peaks[0].bin, 72, 48);
  const secondary = peaks[1] ? describe(peaks[1].bin, 45, 55)
    : [(primary[0] + 60) % 360, Math.round(primary[1] * 0.55), Math.min(80, primary[2] + 8)];
  const h = primary[0];
  return {
    hue: h,
    primary,
    secondary,
    tertiary: [(h + 60) % 360, Math.max(30, Math.round(primary[1] * 0.7)), Math.min(82, primary[2] + 6)],
    accent: [(h + 200) % 360, 70, 58],
    neutral: [h, 10, 46],
  };
}

/** 提取结果落地：CSS 变量 + localStorage + iframe 广播 */
function applyVideoPalette(pal) {
  if (!pal) return;
  try {
    localStorage.setItem('ios-desktop:theme-hue', String(pal.hue));
    localStorage.setItem('ios-desktop:palette', JSON.stringify(pal));
  } catch (e) {}
  // 统一走主题引擎：全量 MD3 令牌落到根节点 + 向所有活 iframe 重注入动态样式表
  // （旧实现只改 3 个根变量 + postMessage，令牌型应用不会全量跟色）
  applyThemeHue(pal.hue, false);
  // 实测主/次色（比公式更贴近视频画面本身）再叠加覆盖，并广播给监听型应用
  try {
    const root = document.documentElement;
    if (pal.primary) root.style.setProperty('--md-primary', `hsl(${pal.primary[0]} ${pal.primary[1]}% ${pal.primary[2]}%)`);
    if (pal.secondary) root.style.setProperty('--md-secondary', `hsl(${pal.secondary[0]} ${pal.secondary[1]}% ${pal.secondary[2]}%)`);
  } catch (e) {}
  document.querySelectorAll('iframe').forEach((iframe) => {
    try {
      iframe.contentWindow.postMessage({ type: 'set-palette', palette: pal }, '*');
    } catch (e) {}
  });
}

/** 应用全屏暂停 / 回桌面恢复（与程序化壁纸同一策略） */
function startWatch() {
  if (watchTimer) return;
  watchTimer = setInterval(() => {
    if (!active || !videoEl) {
      stopWatch(); // 壁纸已失效时自动收摊，不留永久定时器
      return;
    }
    const shouldPause = !!state.currentApp || reducedMotion;
    if (shouldPause && !videoEl.paused) videoEl.pause();
    else if (!shouldPause && videoEl.paused) videoEl.play().catch(() => {});
  }, 500);
}

/** 停止全屏暂停/恢复看门狗 */
function stopWatch() {
  if (watchTimer) {
    clearInterval(watchTimer);
    watchTimer = null;
  }
}

/**
 * 应用视频壁纸。
 * @param {Blob} blob 视频文件
 * @param {{persist?: boolean, showToast?: boolean}} opts
 */
export async function applyVideoWallpaper(blob, opts = {}) {
  const { persist = true, showToast = true } = opts;
  if (!blob || !/^video\//.test(blob.type || '')) return false;

  // 互斥：清程序化与静态壁纸记录，保证"后选者优先"
  // （DOM 级清理跨模块实例一致生效；clearProceduralWallpaper 负责同图实例的 raf/状态）
  try {
    const procCanvas = document.querySelector('.procedural-wallpaper');
    if (procCanvas) procCanvas.remove();
    document.getElementById('desktop')?.classList.remove('procedural-active');
    localStorage.removeItem('ios-desktop:procedural-wallpaper');
  } catch (e) {}
  clearProceduralWallpaper();
  await clearStaticWallpaperRecords();
  // fix(audit-C #2): 用户切换到视频壁纸 → 旧壁纸的调色板持久化作废（persist=false 的
  // 启动恢复路径不清：视频自身的调色板要留给 restoreWallpaper → applySavedTheme 应用）
  if (persist) clearSavedPalette();

  const video = ensureVideoEl();
  if (!video) return false;

  if (objectURL) { try { URL.revokeObjectURL(objectURL); } catch (e) {} }
  objectURL = URL.createObjectURL(blob);
  const gen = ++videoGen;       // 本次装载的世代：旧装载的就绪/失败回调一律作废
  const myURL = objectURL;
  video.src = objectURL;
  document.getElementById('desktop').style.backgroundImage = 'none';
  document.getElementById('desktop').classList.add('video-wallpaper-active');
  active = true;

  const isCurrentLoad = () => active && gen === videoGen && objectURL === myURL;

  const onReady = () => {
    if (!isCurrentLoad()) return;
    syncFrameToIframes();
    refreshBlurSnapshot(true); // 毛玻璃预烘焙快照取当前视频帧
    // fix(audit-C #1 P1): 落盘时机后移到 loadeddata —— 确认可解码后才写 IDB+marker。
    // 旧实现在 src 赋值后立刻落盘，解码失败（如 HEVC/损坏文件）时 loadeddata 永不触发，
    // 坏状态被持久化 → 刷新后 restoreVideoWallpaper 永久黑屏循环
    if (persist) {
      (async () => {
        let saved = false;
        if (idbAvailable()) saved = await idbSet(VIDEO_IDB_KEY, blob);
        if (saved) {
          try { localStorage.setItem(VIDEO_LS_MARKER, '1'); } catch (e) {}
        } else {
          console.warn('[video-wallpaper] IndexedDB 不可用，视频壁纸仅本次会话有效');
        }
      })();
      // 主题色：多帧采样提取。延迟启动 —— 采样会暂停/seek 视频，
      // 必须等毛玻璃预烘焙层完成本次抓帧，避免争抢同一 video 元素
      setTimeout(() => {
        if (!isCurrentLoad()) return; // 700ms 窗口内已换新壁纸 → 旧提取作废
        extractVideoPalette(video).then((pal) => { applyVideoPalette(pal); });
      }, 700);
    }
    // 通知预烘焙层刷新快照（视频源取当前帧）
    if (window.__blurBakeTest) window.__blurBakeTest.refresh && window.__blurBakeTest.refresh();
    if (showToast && window.showSystemToast) {
      window.showSystemToast('视频壁纸已应用', ICONS.image);
    }
    markActiveCard();
  };
  // fix(audit-C #1 P1): 加载/解码失败兜底 —— 旧实现无 error 监听，坏视频 → 桌面/锁屏
  // 全黑且无提示。此处：toast 告知 + clearVideoWallpaper 自清理（含持久化记录）+
  // 走 wallpaper.js 回退链恢复下一优先级壁纸（程序化 → 静态 → 预设 → 默认）
  const onError = async () => {
    if (!isCurrentLoad()) return; // 旧装载的失败不作数（已被新装载取代）
    if (window.showSystemToast) {
      window.showSystemToast('视频壁纸加载失败，已恢复原壁纸', ICONS.videocam);
    }
    await clearVideoWallpaper(); // 先同步清 marker、再清 IDB，杜绝坏状态复活
    try { restoreWallpaper(); } catch (e) {}
  };
  video.addEventListener('loadeddata', onReady, { once: true });
  video.addEventListener('error', onError, { once: true });
  video.play().catch(() => {}); // reduced-motion 或自动播放限制：停在首帧
  startWatch();
  return true;
}

/** 清除视频壁纸（切换到其他壁纸时调用；不负责铺新背景，由调用方设置） */
export async function clearVideoWallpaper() {
  try { localStorage.removeItem(VIDEO_LS_MARKER); } catch (e) {}
  if (idbAvailable()) await idbDel(VIDEO_IDB_KEY);
  if (!active) { stopWatch(); return; }
  active = false;
  stopWatch();
  if (videoEl) {
    videoEl.pause();
    videoEl.removeAttribute('src');
    videoEl.load();
    videoEl.remove();
    videoEl = null;
  }
  if (objectURL) { try { URL.revokeObjectURL(objectURL); } catch (e) {} objectURL = ''; }
  const desktop = document.getElementById('desktop');
  if (desktop) desktop.classList.remove('video-wallpaper-active');
}

function markActiveCard() {
  const btn = document.getElementById('themeUploadAnyBtn');
  if (btn) btn.classList.add('active');
  document.querySelectorAll('#themeDynamicGrid [data-proc]').forEach((c) => c.classList.remove('active'));
}

/** 启动恢复：有持久化记录时静默恢复视频壁纸 */
export async function restoreVideoWallpaper() {
  try { if (!localStorage.getItem(VIDEO_LS_MARKER)) return; } catch (e) { return; }
  if (!idbAvailable()) return;
  const blob = await idbGet(VIDEO_IDB_KEY);
  if (blob) await applyVideoWallpaper(blob, { persist: false, showToast: false });
}

/** 初始化：绑定上传入口 + 暴露测试钩子 */
export function initVideoWallpaper() {
  const input = document.getElementById('videoWallpaperInput');
  if (input) {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      e.target.value = '';
      if (file.size > 200 * 1024 * 1024) {
        if (window.showSystemToast) window.showSystemToast('视频过大（上限 200MB）', ICONS.videocam);
        return;
      }
      // fix(audit-C #23): 第二参数应为 opts 对象（旧写法传 true 恰好解构出默认值，属侥幸正确）
      await applyVideoWallpaper(file, { persist: true, showToast: true });
    });
  }
  // 暴露给 desktop-blur / 测试（避免模块循环依赖）
  window.__videoWallpaper = { isVideoActive, getVideoEl, getVideoFrameDataURL };
  // 应用内同实例入口（回归测试用：确保与主图同一模块实例）
  window.__videoWallpaperApply = applyVideoWallpaper;
}
