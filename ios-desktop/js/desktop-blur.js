// ==================== desktop-blur.js — 桌面毛玻璃预烘焙层 ====================
//
// 性能改造：应用开合动画期间，旧实现每帧重写 #desktop 的 filter: blur() ——
// 全屏大元素逐帧重新模糊，低端设备掉帧明显。现在改为「预烘焙」：
//   1. 壁纸变化时（或视频壁纸取帧时），把当前画面降采样 4 倍画进离屏画布，
//      用 canvas filter 一次性模糊 + 压暗，铺到 #desktopBlurCanvas 上
//   2. 开合动画只推动该图层的 opacity（0→1 交叉淡入 ≈ 渐进模糊），纯合成器操作
//   3. 应用全屏期间该图层保持 opacity 1，桌面本身零滤镜零重算
// 快照不可用时（外链壁纸未加载完/离线测试环境），自动回退旧滤镜路径，绝不空屏。

let blurCanvas = null;
let ctx = null;
let snapshotReady = false;
let snapshotKey = '';        // 当前快照对应的壁纸标识（URL / 'video:N' / 'procedural'）
let lastProgress = 0;
let videoFrameGen = 0;       // fix(audit-C #6): 视频源帧代计数 —— 每次解析都视为新源
let resizeDebounceTimer = 0; // fix(audit-C #24): resize 重烘焙防抖定时器

const DOWNSCALE = 0.25;      // 1/4 分辨率绘制，blur 半径同步缩小
const BLUR_PX_FULL = 12;     // 与旧实现等效的全尺寸模糊半径
const BRIGHTNESS = 0.84;     // 与旧实现等效的压暗系数

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
  if (!ensureCanvas()) return;
  lastProgress = Math.max(0, Math.min(1, p));
  if (lastProgress <= 0.001) {
    blurCanvas.classList.remove('active');
    blurCanvas.style.opacity = '';
    return;
  }
  blurCanvas.classList.add('active');
  blurCanvas.style.opacity = (lastProgress * lastProgress).toFixed(4);
}

/** 动画结束/关闭完成：整层隐藏 */
export function hideDesktopBlur() {
  lastProgress = 0;
  if (!blurCanvas) return;
  blurCanvas.classList.remove('active');
  blurCanvas.style.opacity = '';
}

// 测试钩子
if (typeof window !== 'undefined') {
  window.__blurBakeTest = {
    isReady: () => isBlurSnapshotReady(),
    refresh: () => refreshBlurSnapshot(true),
    progress: () => lastProgress,
  };
}
