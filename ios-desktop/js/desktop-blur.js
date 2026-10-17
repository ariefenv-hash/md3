// ==================== desktop-blur.js — 壁纸毛玻璃模糊引擎（双通道 + 全局开关） ====================
//
// 性能改造：应用开合动画期间，旧实现每帧重写 #desktop 的 filter: blur() ——
// 全屏大元素逐帧重新模糊，低端设备掉帧明显。现在改为「预烘焙」：
//   1. 壁纸变化时（或视频壁纸取帧时），把当前画面降采样 4 倍画进离屏画布，
//      用 canvas filter 一次性模糊 + 压暗，铺到 #desktopBlurCanvas 上
//   2. 开合动画只推动该图层的 opacity（0→1 交叉淡入 ≈ 渐进模糊），纯合成器操作
//   3. 应用全屏期间该图层保持 opacity 1，桌面本身零滤镜零重算
// 快照不可用时（外链壁纸未加载完/离线测试环境），自动回退旧滤镜路径，绝不空屏。
//
// v7.81 壁纸实时模糊（全局开关）：
//   - 双通道进度：app（应用开合，setDesktopBlurProgress）+ panel（下拉通知/控制中心，
//     setPanelBlurProgress），同一张预烘焙画布取 max 合成 —— 两路消费者互不覆盖，
//     应用全屏时从应用内状态栏拉开面板也不会把应用通道的模糊拽回 0
//   - 面板通道跟手：拖拽进度 → 画布 opacity 二次曲线（0 清晰 → 1 全模糊），
//     开/关/回弹由 tweenPanelBlurProgress 按 rAF 补间（时长沿用 motion.dur 令牌）
//   - 实时性：视频壁纸激活且任一通道 > 0 时按 ~14fps 节流重烘焙当前帧（帧代计数
//     保证每次都取新帧），程序化/静态壁纸维持「换壁纸即重烘焙」不变
//   - 全局开关：localStorage 'ios-desktop:wallpaper-blur'（'0' = 关，默认开）。
//     关闭时两个通道全部失效、画布整层隐藏；app-window 的旧滤镜回退路径
//     也通过 isWallpaperBlurEnabled() 一并停用 —— 全系统零壁纸模糊

let blurCanvas = null;
let ctx = null;
let snapshotReady = false;
let snapshotKey = '';        // 当前快照对应的壁纸标识（URL / 'video:N' / 'procedural'）
let lastProgress = 0;        // app 通道（应用开合）
let panelProgress = 0;       // panel 通道（下拉面板，v7.81）
let videoFrameGen = 0;       // fix(audit-C #6): 视频源帧代计数 —— 每次解析都视为新源
let resizeDebounceTimer = 0; // fix(audit-C #24): resize 重烘焙防抖定时器

const DOWNSCALE = 0.25;      // 1/4 分辨率绘制，blur 半径同步缩小
const BLUR_PX_FULL = 12;     // 与旧实现等效的全尺寸模糊半径
const BRIGHTNESS = 0.84;     // 与旧实现等效的压暗系数

// ---------- v7.81 全局开关 ----------
export const WALLPAPER_BLUR_STORAGE_KEY = 'ios-desktop:wallpaper-blur';

let wallpaperBlurEnabled = true;
try { wallpaperBlurEnabled = localStorage.getItem(WALLPAPER_BLUR_STORAGE_KEY) !== '0'; } catch (e) {}

/** 全局壁纸模糊是否启用（面板实时模糊 + 应用开合毛玻璃共用这一个开关） */
export function isWallpaperBlurEnabled() { return wallpaperBlurEnabled; }

/** 切换全局壁纸模糊（设置页调用）；关闭即刻隐藏画布，开启即刻按当前进度恢复 */
export function setWallpaperBlurEnabled(on) {
  wallpaperBlurEnabled = !!on;
  try { localStorage.setItem(WALLPAPER_BLUR_STORAGE_KEY, wallpaperBlurEnabled ? '1' : '0'); } catch (e) {}
  if (!wallpaperBlurEnabled) cancelPanelBlurTween();
  panelProgress = wallpaperBlurEnabled ? panelProgress : 0;
  applyCombinedProgress();
}

// ---------- v7.81 双通道合成 ----------

/** 两通道取 max：任何一路需要模糊，画布就按最深的那一路显示 */
function combinedProgress() { return Math.max(lastProgress, panelProgress); }

function applyCombinedProgress() {
  if (!blurCanvas) return;
  const p = combinedProgress();
  if (!wallpaperBlurEnabled || p <= 0.001) {
    blurCanvas.classList.remove('active');
    blurCanvas.style.opacity = '';
    return;
  }
  blurCanvas.classList.add('active');
  blurCanvas.style.opacity = (p * p).toFixed(4);
}

// ---------- v7.81 面板通道（实时跟手） ----------

/** 补间缓动（纯函数导出供测试）：ease-out cubic，与 emphasized 收场同族的快出缓停 */
export function panelBlurEase(t) {
  const x = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - x, 3);
}

let panelTweenRafId = 0;

function cancelPanelBlurTween() {
  if (panelTweenRafId) {
    cancelAnimationFrame(panelTweenRafId);
    panelTweenRafId = 0;
  }
}

/**
 * 面板通道进度写入（下拉拖拽每一帧调用）：0 清晰 → 1 全模糊。
 * 与 setDesktopBlurProgress 通道隔离，opacity 取双通道 max。
 */
export function setPanelBlurProgress(p) {
  if (!wallpaperBlurEnabled) { panelProgress = 0; return; } // 全局关闭：通道恒零，重开时无残留
  panelProgress = Math.max(0, Math.min(1, p));
  maybeLiveRebake();
  if (!ensureCanvas()) return;
  applyCombinedProgress();
}

/**
 * 面板开/关/回弹的模糊补间：从当前 panelProgress 起 rAF 驱动到目标值。
 * 时长由调用方传入（沿用 motion.dur 令牌，尊重速度倍率与减弱动态）。
 */
export function tweenPanelBlurProgress(target, durMs = 260) {
  cancelPanelBlurTween();
  if (!wallpaperBlurEnabled) { panelProgress = 0; applyCombinedProgress(); return; }
  const to = Math.max(0, Math.min(1, target));
  const from = panelProgress;
  if (durMs <= 0 || Math.abs(to - from) < 0.001) {
    setPanelBlurProgress(to);
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    panelTweenRafId = 0;
    const t = Math.min(1, (now - t0) / durMs);
    setPanelBlurProgress(from + (to - from) * panelBlurEase(t));
    if (t < 1) panelTweenRafId = requestAnimationFrame(step);
  };
  panelTweenRafId = requestAnimationFrame(step);
}

// ---------- v7.81 视频壁纸实时重烘焙 ----------
// 视频是连续帧：预烘焙快照只对应取帧瞬间，面板打开期间壁纸在动，
// 模糊层却停在旧帧 → 「实时模糊」名不副实。按 ~14fps 节流重烘焙当前帧，
// 1/4 分辨率 + canvas filter 单次模糊，单帧成本 < 2ms（M1 实测量级），远低于阈值。

const LIVE_BAKE_INTERVAL_MS = 70;
let lastLiveBakeAt = 0;

function maybeLiveRebake() {
  if (!wallpaperBlurEnabled) return;
  if (combinedProgress() <= 0.001) return;
  let videoActive = false;
  try { videoActive = !!(window.__videoWallpaper && window.__videoWallpaper.isVideoActive()); } catch (e) {}
  if (!videoActive) return;
  const now = performance.now();
  if (now - lastLiveBakeAt < LIVE_BAKE_INTERVAL_MS) return;
  lastLiveBakeAt = now;
  refreshBlurSnapshot(true); // 帧代计数：即使 key 相同也取当前帧重画
}

// fix(P3)：Canvas2D filter 特性检测 —— 不支持的引擎（旧 Safari）上赋值只是 expando、
// 不抛错，旧代码照常 snapshotReady=true → 回退永不触发，用户得到「未模糊的快照」。
// 用原型链归属（'filter' in ctx）判定，模块级缓存一次。
let ctxFilterSupported = null;
function supportsCtxFilter() {
  if (ctxFilterSupported === null) {
    try {
      const probe = document.createElement('canvas').getContext('2d');
      ctxFilterSupported = !!probe && 'filter' in probe && typeof probe.filter === 'string';
    } catch (e) {
      ctxFilterSupported = false;
    }
  }
  return ctxFilterSupported;
}

// 静态壁纸图片缓存：URL → HTMLImageElement（已解码）
const imageCache = new Map();

function ensureCanvas() {
  if (blurCanvas) return true;
  const desktop = document.getElementById('desktop');
  if (!desktop) return false;
  blurCanvas = document.createElement('canvas');
  blurCanvas.id = 'desktopBlurCanvas';
  blurCanvas.className = 'desktop-blur-canvas';
  ctx = blurCanvas.getContext('2d');
  desktop.appendChild(blurCanvas);
  // fix(audit-C #24): resize 重烘焙防抖 180ms —— 旧实现每事件全量重烘焙
  //（loadImage + drawImage + filter），拖动窗口期间 CPU 尖峰，与程序化壁纸 resize 风暴叠加
  window.addEventListener('resize', () => {
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(() => {
      resizeDebounceTimer = 0;
      refreshBlurSnapshot(true);
    }, 180);
  }, { passive: true });
  return true;
}

/** 取当前壁纸快照源：video > 程序化画布 > 静态图片 */
function resolveSource() {
  let mod = null;
  try { mod = window.__videoWallpaper; } catch (e) {}
  if (mod && mod.isVideoActive() && mod.getVideoEl()) {
    // fix(audit-C #6): 视频是连续帧 —— key 恒为 'video' 时，无 force 的 refreshBlurSnapshot()
    // 会命中 key 去重直接 return（应用开合取到的永远是首帧，交叉淡入可见跳变）；
    // 帧代计数让每次解析都视为新源，非 force 刷新也能取到当前帧
    return { kind: 'video', el: mod.getVideoEl(), key: `video:${++videoFrameGen}` };
  }
  try {
    const proc = document.querySelector('.procedural-wallpaper');
    if (proc && document.getElementById('desktop').classList.contains('procedural-active') && proc.width > 2) {
      return { kind: 'canvas', el: proc, key: 'procedural' };
    }
  } catch (e) {}
  const bg = document.getElementById('desktop')?.style.backgroundImage || '';
  const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
  if (m && m[1]) return { kind: 'image', url: m[1], key: m[1] };
  return null;
}

function loadImage(url) {
  return new Promise((resolve) => {
    const cached = imageCache.get(url);
    if (cached && cached.complete && cached.naturalWidth > 0) { resolve(cached); return; }
    const img = new Image();
    if (/^https?:/i.test(url)) img.crossOrigin = 'anonymous';
    img.onload = () => { if (imageCache.size > 8) imageCache.clear(); imageCache.set(url, img); resolve(img); };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * 重绘预烘焙快照。force=true 时即使 key 相同也重画（尺寸变化/视频新帧）。
 * 静态壁纸异步解码后自动补画；同步路径失败时 snapshotReady=false（走旧滤镜回退）。
 */
export function refreshBlurSnapshot(force = false) {
  if (!ensureCanvas()) return;
  const src = resolveSource();
  if (!src) { snapshotReady = false; return; }
  if (!force && src.key === snapshotKey && snapshotReady) return;

  const dprW = Math.max(2, Math.round(window.innerWidth * DOWNSCALE));
  const dprH = Math.max(2, Math.round(window.innerHeight * DOWNSCALE));
  blurCanvas.width = dprW;
  blurCanvas.height = dprH;

  const draw = (source, sw, sh) => {
    if (!ctx || !source) { snapshotReady = false; return; }
    // fix(P3)：引擎不支持 ctx.filter 时放弃预烘焙，保持 snapshotReady=false，
    // 让 app-window 走旧滤镜回退路径（否则得到未模糊快照，开合动画失真）
    if (!supportsCtxFilter()) { snapshotReady = false; return; }
    // cover 铺满
    const scale = Math.max(dprW / sw, dprH / sh);
    const dw = sw * scale, dh = sh * scale;
    const dx = (dprW - dw) / 2, dy = (dprH - dh) / 2;
    ctx.clearRect(0, 0, dprW, dprH);
    try { ctx.filter = `blur(${(BLUR_PX_FULL * DOWNSCALE).toFixed(1)}px)`; } catch (e) {}
    ctx.drawImage(source, dx, dy, dw, dh);
    ctx.filter = 'none';
    // 压暗烘焙进快照（等效旧 brightness(0.84)，运行时零滤镜）
    ctx.fillStyle = `rgba(0, 0, 0, ${(1 - BRIGHTNESS).toFixed(2)})`;
    ctx.fillRect(0, 0, dprW, dprH);
    snapshotKey = src.key;
    snapshotReady = true;
    // 若动画已在进行，立即补上当前进度
    if (lastProgress > 0.001) setDesktopBlurProgress(lastProgress);
  };

  if (src.kind === 'video') {
    const v = src.el;
    if (v.readyState >= 2 && v.videoWidth > 0) draw(v, v.videoWidth, v.videoHeight);
    else snapshotReady = false;
    return;
  }
  if (src.kind === 'canvas') { draw(src.el, src.el.width, src.el.height); return; }
  loadImage(src.url).then((img) => {
    if (img) draw(img, img.naturalWidth, img.naturalHeight);
    else snapshotReady = false;
  });
}

/** 快照是否可用（不可用时 app-window 自动回退旧滤镜路径） */
export function isBlurSnapshotReady() { return snapshotReady && !!blurCanvas; }

/** 开合动画进度驱动：0（清晰）→ 1（全模糊+压暗），opacity 二次曲线与旧实现一致 */
export function setDesktopBlurProgress(p) {
  if (!wallpaperBlurEnabled) return; // v7.81：全局关闭时 app 通道同样不记录瞬态进度（重开零残留）
  lastProgress = Math.max(0, Math.min(1, p));
  if (!ensureCanvas()) return;
  applyCombinedProgress(); // v7.81：与面板通道 max 合成，不再独占画布
}

/** 动画结束/关闭完成：app 通道归零（面板通道不受影响） */
export function hideDesktopBlur() {
  lastProgress = 0;
  if (!blurCanvas) return;
  applyCombinedProgress();
}

// 测试钩子
if (typeof window !== 'undefined') {
  window.__blurBakeTest = {
    isReady: () => isBlurSnapshotReady(),
    refresh: () => refreshBlurSnapshot(true),
    progress: () => lastProgress,
    // v7.81 面板通道 / 全局开关
    panelProgress: () => panelProgress,
    setPanelProgress: (p) => setPanelBlurProgress(p),
    isEnabled: () => isWallpaperBlurEnabled(),
    setEnabled: (on) => setWallpaperBlurEnabled(on),
  };
}
