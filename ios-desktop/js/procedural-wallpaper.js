// ==================== procedural-wallpaper.js — 程序化动态壁纸引擎 ====================
//
// 「壁纸即代码」：不依赖任何图片/视频文件，用 Canvas 2D 实时绘制。
//   - 内置预设各带主题色相，应用时联动 Material You
//   - 分辨率封顶绘制（DPR ≤ 1.5 且总像素 ≤ ~2.5M）+ 30fps 帧率上限，开销低
//     （渐变/光斑类画面降采样后视觉几乎无损；旧实现 min(DPR,3) 全分辨率在 3x 屏
//      ≈75MB 画布 buffer，30fps 全画布重绘开销过大）
//   - 应用全屏(state.currentApp)时自动暂停绘制；回到桌面立即恢复
//   - prefers-reduced-motion 用户只画一帧静态画面
//   - 提供 JPEG 快照同步给 iframe 应用（应用内壁纸为静态画面，保证兼容与性能）
//
// 分层：canvas 以 z-index:-1 插入 .desktop（桌面自身构成堆叠上下文），
//       绘制在桌面背景之上、所有桌面内容（图标/滑块/圆点）之下。

import { state } from './state.js';
import { ICONS } from './icons.js';
import { refreshBlurSnapshot } from './desktop-blur.js';
import { idbAvailable, idbDel } from './storage.js';
// fix(audit-C #2): 程序化壁纸切换时清掉旧壁纸调色板（运行时才调用，ESM 循环引用安全：
// wallpaper.js 亦只在函数体内使用本模块导出，两方均不参与对方模块求值期）
import { clearSavedPalette } from './wallpaper.js';

export const PROCEDURAL_STORAGE_KEY = 'ios-desktop:procedural-wallpaper';

/** 内置预设（seed 固定 → 每次启动画面一致，可复现为缩略图） */
export const PROCEDURAL_PRESETS = [
  { id: 'aurora', name: '极光流体', hue: 215, seed: 11 },
  { id: 'sunset', name: '落日波纹', hue: 25,  seed: 23 },
  { id: 'starry', name: '粒子星野', hue: 275, seed: 37 },
];

const FPS_INTERVAL = 1000 / 30; // 30fps 足够呈现缓慢流动感
// fix(audit-C #7): 绘制分辨率封顶 —— DPR 上限 1.5（原 min(DPR,3) 全分辨率：
// 3x 屏 5760×3240 ≈75MB buffer）；另按画布总像素面积封顶 ~2.5M，兼顾高 DPI 大屏
const DPR_CAP = 1.5;
const MAX_CANVAS_PIXELS = 2.5e6;

let canvas = null;
let ctx = null;
let activeId = null;
let rafId = 0;
let t0 = 0;
let lastDraw = 0;
let geom = null;         // 当前预设几何状态（均为 0~1 的比例值，与分辨率无关）
let snapshotURL = '';

let reducedMotion = false;
try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

// ==================== 确定性随机（保证缩略图与实际画面一致） ====================

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ==================== 对外状态 ====================

export function getActiveProceduralId() { return activeId; }
export function getProceduralSnapshotURL() { return snapshotURL; }

function getPreset(id) { return PROCEDURAL_PRESETS.find(p => p.id === id) || null; }

// ==================== 画布挂载 ====================

function ensureCanvas() {
  if (canvas) {
    // 自愈：若画布被外部 DOM 级互斥清理摘除，重新挂载
    if (!canvas.isConnected) {
      const desktop = document.getElementById('desktop');
      if (desktop) desktop.insertBefore(canvas, desktop.firstChild);
    }
    return true;
  }
  canvas = document.createElement('canvas');
  canvas.className = 'procedural-wallpaper';
  ctx = canvas.getContext('2d');
  const desktop = document.getElementById('desktop');
  desktop.insertBefore(canvas, desktop.firstChild);
  // fix(audit-C #8): resize 防抖 180ms —— 拖动窗口期间不再每事件全量重绘 +
  // JPEG dataURL 重编码 + postMessage 全 iframe 广播（CPU/内存尖峰）
  window.addEventListener('resize', scheduleResize);
}

/** fix(audit-C #8): 防抖调度 resize 重绘（窗口拖动中只保留最后一次尺寸） */
let resizeDebounceTimer = 0;
function scheduleResize() {
  clearTimeout(resizeDebounceTimer);
  resizeDebounceTimer = setTimeout(() => {
    resizeDebounceTimer = 0;
    resizeCanvas();
  }, 180);
}

function resizeCanvas() {
  if (!canvas) return;
  // fix(audit-C #7): 分辨率封顶 —— DPR ≤ 1.5，且总像素不超过 ~2.5M（超出时按面积开方降采样）
  const cw = Math.max(1, canvas.clientWidth);
  const ch = Math.max(1, canvas.clientHeight);
  let q = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  if (cw * ch * q * q > MAX_CANVAS_PIXELS) {
    q = Math.max(0.5, Math.sqrt(MAX_CANVAS_PIXELS / (cw * ch)));
  }
  const w = Math.max(1, Math.round(cw * q));
  const h = Math.max(1, Math.round(ch * q));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    // 尺寸变化后旧快照比例/分辨率失效：立即重画当前帧并重新快照同步（仅激活时）
    if (activeId && geom) {
      drawFrame(getPreset(activeId));
      takeSnapshot();
      syncSnapshotToIframes();
    }
  }
}

// ==================== 预设几何（比例坐标，随窗口尺寸自适应） ====================

function buildGeometry(preset) {
  const rnd = mulberry32(preset.seed);

  if (preset.id === 'aurora') {
    return {
      kind: 'aurora',
      blobs: Array.from({ length: 5 }, (_, i) => ({
        bx: 0.15 + rnd() * 0.7,
        by: 0.15 + rnd() * 0.7,
        r: 0.30 + rnd() * 0.24,
        hueOff: (i - 2) * 26 + (rnd() - 0.5) * 18,
        ax: 0.05 + rnd() * 0.08,
        ay: 0.04 + rnd() * 0.07,
        sx: 0.045 + rnd() * 0.055,           // 漂移频率（Hz 级，缓慢）
        sy: 0.035 + rnd() * 0.05,
        px: rnd() * Math.PI * 2,
        py: rnd() * Math.PI * 2,
      })),
    };
  }

  if (preset.id === 'starry') {
    return {
      kind: 'starry',
      stars: Array.from({ length: 110 }, () => ({
        x: rnd(),
        y: rnd(),
        r: 0.4 + rnd() * 1.6,
        tw: rnd() * Math.PI * 2,
        tws: 0.35 + rnd() * 1.1,
        vx: 0.002 + rnd() * 0.006,           // 每秒位移（占屏宽比例）
        vy: -(0.001 + rnd() * 0.004),
      })),
      nebulae: Array.from({ length: 2 }, (_, i) => ({
        bx: 0.25 + i * 0.5 + (rnd() - 0.5) * 0.2,
        by: 0.3 + rnd() * 0.4,
        r: 0.45 + rnd() * 0.2,
        hueOff: i * 40 - 10,
        phase: rnd() * Math.PI * 2,
      })),
    };
  }

  return {
    kind: 'sunset',
    waves: Array.from({ length: 4 }, (_, i) => ({
      yBase: 0.60 + i * 0.10,
      amp: 0.030 - i * 0.004,
      speed: (0.10 + i * 0.045) * (i % 2 ? -1 : 1),
      hueShift: i * 7,
      freq: 1.6 + i * 0.7,
    })),
  };
}

// ==================== 绘制（g/W/H 显式传入，绘制函数同时服务于主画布与缩略图） ====================

function drawAurora(g, W, H, t, hue, gm) {
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#0b1026');
  base.addColorStop(1, '#141b3c');
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);

  g.globalCompositeOperation = 'lighter';
  const minDim = Math.min(W, H);
  for (const b of gm.blobs) {
    const cx = (b.bx + b.ax * Math.sin(t * b.sx * Math.PI * 2 + b.px)) * W;
    const cy = (b.by + b.ay * Math.cos(t * b.sy * Math.PI * 2 + b.py)) * H;
    const r = b.r * minDim;
    const h = hue + b.hueOff + 10 * Math.sin(t * 0.15 + b.px);
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `hsla(${h}, 72%, 58%, 0.50)`);
    grad.addColorStop(0.55, `hsla(${h}, 68%, 46%, 0.22)`);
    grad.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
}

function drawSunset(g, W, H, t, hue, gm) {
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1a1030');
  sky.addColorStop(0.45, `hsl(${hue + 15}, 78%, 34%)`);
  sky.addColorStop(0.72, `hsl(${hue + 5}, 92%, 55%)`);
  sky.addColorStop(1, `hsl(${Math.max(0, hue - 8)}, 95%, 62%)`);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  // 太阳与光晕
  const sy = H * (0.50 + 0.012 * Math.sin(t * 0.35));
  const sr = Math.min(W, H) * 0.13;
  const glow = g.createRadialGradient(W * 0.5, sy, 0, W * 0.5, sy, sr * 3.2);
  glow.addColorStop(0, 'hsla(45, 100%, 80%, 0.85)');
  glow.addColorStop(0.28, `hsla(${hue + 30}, 100%, 68%, 0.40)`);
  glow.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'hsl(48, 100%, 84%)';
  g.beginPath();
  g.arc(W * 0.5, sy, sr, 0, Math.PI * 2);
  g.fill();

  // 层叠波浪剪影（视差速度不同）
  for (const w of gm.waves) {
    g.beginPath();
    g.moveTo(0, H);
    const step = Math.max(4, Math.floor(W / 48));
    for (let x = 0; x <= W + step; x += step) {
      const y = H * (w.yBase + w.amp * Math.sin((x / W) * Math.PI * 2 * w.freq + t * w.speed));
      g.lineTo(x, y);
    }
    g.lineTo(W, H);
    g.closePath();
    g.fillStyle = `hsla(${(hue + 255 + w.hueShift * 6) % 360}, 48%, ${13 + w.hueShift * 3}%, 0.95)`;
    g.fill();
  }
}

function drawStarry(g, W, H, t, hue, gm) {
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, `hsl(${hue}, 55%, 7%)`);
  sky.addColorStop(0.6, `hsl(${hue + 12}, 48%, 12%)`);
  sky.addColorStop(1, `hsl(${hue + 25}, 40%, 17%)`);
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);

  const minDim = Math.min(W, H);

  // 星云光斑（缓慢呼吸）
  g.globalCompositeOperation = 'lighter';
  for (const n of gm.nebulae) {
    const cx = (n.bx + 0.02 * Math.sin(t * 0.06 + n.phase)) * W;
    const cy = (n.by + 0.02 * Math.cos(t * 0.05 + n.phase)) * H;
    const a = 0.10 + 0.05 * (0.5 + 0.5 * Math.sin(t * 0.12 + n.phase));
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, n.r * minDim);
    grad.addColorStop(0, `hsla(${hue + n.hueOff}, 70%, 55%, ${a})`);
    grad.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(cx, cy, n.r * minDim, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';

  // 星星：缓慢漂移 + 闪烁
  for (const s of gm.stars) {
    const x = (((s.x + s.vx * t) % 1) + 1) % 1 * W;
    const y = (((s.y + s.vy * t) % 1) + 1) % 1 * H;
    const a = 0.35 + 0.6 * (0.5 + 0.5 * Math.sin(t * s.tws * 2 + s.tw));
    g.fillStyle = `hsla(${hue + 40}, 30%, 92%, ${a.toFixed(3)})`;
    g.beginPath();
    g.arc(x, y, Math.max(0.4, s.r * minDim * 0.004), 0, Math.PI * 2);
    g.fill();
  }
}

function drawFrame(preset) {
  if (!ctx || !geom || canvas.width < 2) return;
  const t = (performance.now() - t0) / 1000;
  if (geom.kind === 'aurora') drawAurora(ctx, canvas.width, canvas.height, t, preset.hue, geom);
  else if (geom.kind === 'sunset') drawSunset(ctx, canvas.width, canvas.height, t, preset.hue, geom);
  else drawStarry(ctx, canvas.width, canvas.height, t, preset.hue, geom);
}

// ==================== 主循环（30fps 节流 + 应用全屏暂停） ====================

function loop(now) {
  // fix(audit-C #18): 空闲自停 —— activeId 失效时不再每帧空转重注册 rAF
  // （原实现先 re-register 再判空，只有 clear 才 cancel；改为判空即停，
  //  由下次 applyProceduralWallpaper 重新启动循环）
  if (!activeId) { rafId = 0; return; }
  rafId = requestAnimationFrame(loop);
  if (state.currentApp) return;               // 应用全屏期间壁纸不可见，暂停绘制
  if (reducedMotion) return;                  // 减少动态偏好：保持静态帧
  if (now - lastDraw < FPS_INTERVAL) return;  // 帧率上限
  lastDraw = now;
  drawFrame(getPreset(activeId));
}

// ==================== 快照（同步给 iframe 应用：静态画面，保证兼容与性能） ====================

let _snapshotObjectURL = '';

function takeSnapshot() {
  if (!canvas || canvas.width < 2) { snapshotURL = ''; return; }
  try {
    // fix(audit-C #8): 快照降分辨率 —— 上限 2160 → 1440：快照仅作应用底板/锁屏背景，
    // resize 防抖后仍会重编码 + 广播，数据量随宽度平方下降，常见窗口下视觉无感知差异；
    // 质量保持 0.92 消除渐变画面的压缩痕迹
    const w = Math.min(canvas.width, 1440);
    const h = Math.max(1, Math.round((canvas.height / canvas.width) * w));
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    off.getContext('2d').drawImage(canvas, 0, 0, w, h);
    // fix(v7.37 全量审计)：toDataURL → toBlob 异步编码 —— 同步 JPEG 编码 1440 宽
    // 实测阻塞主线程数百毫秒（软渲染更甚），是启动期最后的大长任务源。
    // toBlob 在编码线程完成后回调：主线程只付 drawImage（~10ms 级）。
    // 消费者全部走 url() 字符串（style.backgroundImage / iframe postMessage），
    // blob: URL 与 data: URL 对其完全等价（同源 blob 可被 iframe img/bg 加载）。
    // 异步就绪前的空窗：各消费点均有 data 兜底或 if 守卫（锁屏层取 desktop
    // computed 背景、__syncIframeApp 判空跳过），就绪后 syncSnapshotToIframes 补投。
    off.toBlob((blob) => {
      if (!blob) { snapshotURL = ''; return; }
      if (_snapshotObjectURL) { try { URL.revokeObjectURL(_snapshotObjectURL); } catch (e) {} }
      _snapshotObjectURL = URL.createObjectURL(blob);
      snapshotURL = _snapshotObjectURL;
      syncSnapshotToIframes();
    }, 'image/jpeg', 0.92);
  } catch (e) { snapshotURL = ''; }
}

function syncSnapshotToIframes() {
  if (!snapshotURL) return;
  document.querySelectorAll('iframe').forEach((iframe) => {
    try { iframe.contentWindow.postMessage({ type: 'set-wallpaper', url: snapshotURL }, '*'); } catch (e) {}
  });
}

// ==================== 应用 / 清除 ====================

/**
 * 应用程序化动态壁纸。
 * @param {string} presetId 预设 id
 * @param {{persist?: boolean, showToast?: boolean}} opts persist=false 用于启动恢复（键已在）
 * @returns {boolean} 是否成功应用
 */
export function applyProceduralWallpaper(presetId, opts = {}) {
  const preset = getPreset(presetId);
  if (!preset) return false;
  const { persist = true, showToast = true } = opts;

  // 互斥清理视频壁纸（DOM 级清理，不依赖模块实例，跨环境一致）
  try {
    const vw = document.querySelector('.video-wallpaper');
    if (vw) vw.remove();
    document.getElementById('desktop')?.classList.remove('video-wallpaper-active');
    localStorage.removeItem('ios-desktop:video-wallpaper');
    if (idbAvailable()) idbDel('wallpaper-video-blob');
  } catch (e) {}
  // fix(audit-C #2): 程序化壁纸不携带调色板 —— 清掉旧自定义壁纸的调色板持久化，
  // 避免重启后 applySavedTheme 把旧壁纸的 primary/secondary/tertiary 叠加到新壁纸
  //（含启动恢复路径：程序化壁纸生效时，LS 里的调色板必为残留）
  clearSavedPalette();

  ensureCanvas();
  activeId = preset.id;
  geom = buildGeometry(preset);
  canvas.parentElement.classList.add('procedural-active');
  document.getElementById('desktop').style.backgroundImage = 'none';
  resizeCanvas();

  t0 = performance.now();
  lastDraw = 0;
  if (!rafId) rafId = requestAnimationFrame(loop);
  drawFrame(preset);          // 立即出画（reduced-motion 用户也因此有静态画面）
  takeSnapshot();
  syncSnapshotToIframes();

  if (persist) {
    try { localStorage.setItem(PROCEDURAL_STORAGE_KEY, preset.id); } catch (e) {}
  }
  refreshBlurSnapshot(true); // 毛玻璃预烘焙快照同步重绘（程序化画布新画面）
  if (showToast && window.showSystemToast) {
    window.showSystemToast(`动态壁纸已应用: ${preset.name}`, ICONS.image);
  }
  markActiveCard(preset.id);
  return true;
}

/**
 * 清除动态壁纸（切回静态壁纸时调用）。
 * 不负责恢复静态背景 —— 由调用方紧接着设置 backgroundImage。
 */
export function clearProceduralWallpaper() {
  try { localStorage.removeItem(PROCEDURAL_STORAGE_KEY); } catch (e) {}
  if (!activeId) return;
  activeId = null;
  geom = null;
  snapshotURL = '';
  if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  // 画布可能已被其他模块从 DOM 摘除（如视频壁纸互斥清理），此时 parentElement 为 null，跳过即可
  if (canvas && canvas.parentElement) canvas.parentElement.classList.remove('procedural-active');
}

function markActiveCard(presetId) {
  const container = document.getElementById('themeDynamicGrid');
  if (!container) return;
  const uploadBtn = document.getElementById('themeUploadAnyBtn');
  if (uploadBtn) uploadBtn.classList.remove('active');
  container.querySelectorAll('[data-proc]').forEach((c) => {
    c.classList.toggle('active', c.dataset.proc === presetId);
  });
}

// ==================== 缩略图（设置面板卡片用，与真实画面同一套绘制代码） ====================

// fix(v7.37 全量审计)：缩略图 memo 缓存 —— 绘制与 PNG 编码成本实测可达每张数百毫秒
// （软渲染环境 1.2s/张），且同一组缩略图在「主题 overlay 挂载 / 主题 overlay 打开 /
// 设置壁纸页」多处重复渲染（取证实锤：同一 preset 首次会话内被完整重绘 6 遍）。
// 缩略图参数（preset 固定 hue / 固定时刻 t=1.2 / 尺寸）全部确定 → 结果天然可缓存；
// key 即 id|WxH，容量上限防御（preset × 尺寸组合有限，正常 < 12 项）。
const _thumbCache = new Map();
const _THUMB_CACHE_MAX = 24;

export function renderProceduralThumbnail(presetId, w = 160, h = 100) {
  const cacheKey = `${presetId}|${w}x${h}`;
  if (_thumbCache.has(cacheKey)) return _thumbCache.get(cacheKey);
  const preset = getPreset(presetId);
  if (!preset) return '';
  try {
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const g = off.getContext('2d');
    const gm = buildGeometry(preset);
    const t = 1.2; // 固定时刻，缩略图稳定
    if (gm.kind === 'aurora') drawAurora(g, w, h, t, preset.hue, gm);
    else if (gm.kind === 'sunset') drawSunset(g, w, h, t, preset.hue, gm);
    else drawStarry(g, w, h, t, preset.hue, gm);
    const url = off.toDataURL('image/png');
    if (_thumbCache.size >= _THUMB_CACHE_MAX) _thumbCache.clear();
    _thumbCache.set(cacheKey, url);
    return url;
  } catch (e) { return ''; }
}
