// ==================== wallpaper.js — 壁纸、字体、主题色统一管理 ====================
//
// 核心改进:
//   1. 壁纸/字体以原始文件（Blob）存入 IndexedDB —— 无 5MB 限制、无 base64 膨胀，
//      修复「大文件保存静默失败 → 刷新后丢失」；旧 dataURL 数据启动时自动迁移
//   2. 多色配色方案提取（主色+次色+强调色）
//   3. 字体双入口：全局设置 + 应用内设置（应用内覆盖全局）
//   4. 所有 iframe 实时同步壁纸/字体/主题色（同步的是本地链接，不再是巨串 dataURL）

import { dom } from './dom.js';
import { idbAvailable, idbGet, idbSet, idbDel } from './storage.js';
import { PROCEDURAL_STORAGE_KEY, applyProceduralWallpaper, clearProceduralWallpaper, getActiveProceduralId } from './procedural-wallpaper.js';
// 运行时才调用（ESM 循环引用安全）：自定义壁纸取色后统一走主题引擎的
// 全量令牌应用 + iframe 样式表重注入，保证所有应用立刻跟随主题色
import { applyThemeHue } from './theme-engine.js';
import { restoreVideoWallpaper, clearVideoWallpaper, isVideoActive, getVideoFrameDataURL, applyVideoWallpaper } from './video-wallpaper.js';
import { refreshBlurSnapshot } from './desktop-blur.js';
import { ICONS } from './icons.js';

// 连字图标字体的字体家族恢复规则（Material Symbols/Icons 靠连字把图标名渲染成矢量图标，
// 任何对 font-family 的覆盖都会让图标退化成原始名字文本，必须原样保留）
const LIGATURE_FONT_FIX_CSS = `
    .material-symbols-rounded { font-family: 'Material Symbols Rounded' !important; }
    .material-symbols-outlined { font-family: 'Material Symbols Outlined' !important; }
    .material-icons, .material-icons-rounded, .material-icons-outlined { font-family: 'Material Icons' !important; }
  `;

const SK = {
  wallpaper: 'ios-desktop:wallpaper',
  font:      'ios-desktop:font',
  fontName:  'ios-desktop:font-name',
  hue:       'ios-desktop:theme-hue',
  palette:   'ios-desktop:palette',
};

// IndexedDB 键名：壁纸/字体以原始文件（Blob）存储
const IDB_KEYS = {
  wallpaper: 'wallpaper-blob',
  font:      'font-blob',
  fontName:  'font-name',
};

// 无自定义壁纸时的默认壁纸（远程小图，继续走 URL）
// 供 profiles.js 等模块做壁纸形态探测/还原使用（导出避免双份魔法串）
export const DEFAULT_WALLPAPER_URL = 'https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/b311240a375e.jpg';

let currentWallpaperURL = '';
let currentFontURL = '';
let currentFontName = '';
let currentHue = 215;
let currentPalette = null;
let uploadToken = 0; // fix(audit-C #5): 上传世代令牌 —— 慢的取色回调不得覆盖新壁纸主题

/** 取色/主题默认色相（科技蓝），与 theme-engine 默认一致 */
const DEFAULT_HUE = 215;

// 由 Blob 生成的本地链接（objectURL）；更换时延迟释放，给 iframe 留出切换时间
let wallpaperObjectURL = '';
let fontObjectURL = '';

// ==================== 持久化 ====================

function loadFromStorage() {
  try {
    // 只同步读取小数据；壁纸/字体文件由 restoreWallpaper/restoreFont 异步从 IndexedDB 恢复
    currentFontName     = localStorage.getItem(SK.fontName) || '';
    const savedHue      = localStorage.getItem(SK.hue);
    const parsedHue     = savedHue ? parseInt(savedHue, 10) : 215;
    currentHue          = Number.isFinite(parsedHue) ? parsedHue : 215; // 存储损坏时回落默认色相
    const savedPalette  = localStorage.getItem(SK.palette);
    currentPalette      = savedPalette ? JSON.parse(savedPalette) : null;
  } catch (e) {}
}

// ==================== Blob 与链接工具 ====================

/** dataURL 转 Blob（仅用于旧数据一次性迁移） */
function dataURLToBlob(dataURL) {
  try {
    const commaIdx = dataURL.indexOf(',');
    if (commaIdx < 0) return null;
    const head = dataURL.slice(0, commaIdx);
    const body = dataURL.slice(commaIdx + 1);
    const mimeMatch = head.match(/^data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch (e) { return null; }
}

/** Blob 转 dataURL（仅用于 IndexedDB 不可用时的旧方案降级） */
function blobToDataURL(blob) {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    } catch (e) { resolve(null); }
  });
}

/**
 * 为 Blob 生成本地链接（objectURL）。
 * 同一角色的旧链接延迟 30 秒释放，避免 iframe 还没切换完就被回收。
 */
function blobToObjectURL(blob, kind) {
  const url = URL.createObjectURL(blob);
  const prev = kind === 'font' ? fontObjectURL : wallpaperObjectURL;
  if (prev && prev !== url) {
    setTimeout(() => { try { URL.revokeObjectURL(prev); } catch (e) {} }, 30000);
  }
  if (kind === 'font') fontObjectURL = url; else wallpaperObjectURL = url;
  return url;
}

// ==================== 持久化（IndexedDB 不可用时的旧方案降级） ====================

async function legacySaveWallpaper(blob) {
  const dataURL = await blobToDataURL(blob);
  if (!dataURL) return;
  try { localStorage.setItem(SK.wallpaper, dataURL); return; } catch (e) {}
  try { sessionStorage.setItem(SK.wallpaper, dataURL); } catch (e2) {
    console.warn('[wallpaper] 存储空间不足，壁纸仅本次会话有效');
  }
}

async function legacySaveFont(blob, name) {
  const dataURL = await blobToDataURL(blob);
  if (!dataURL) return;
  try {
    localStorage.setItem(SK.font, dataURL);
    localStorage.setItem(SK.fontName, name);
  } catch (e) {
    console.warn('[wallpaper] 存储空间不足，字体仅本次会话有效');
  }
}
function saveHue(hue) {
  try { localStorage.setItem(SK.hue, String(hue)); } catch (e) {}
}
function savePalette(palette) {
  try { localStorage.setItem(SK.palette, JSON.stringify(palette)); } catch (e) {}
}

/**
 * fix(audit-C #2): 清掉旧壁纸的调色板持久化（localStorage 记录 + 内存 currentPalette）。
 * 调色板只属于自定义图片/视频壁纸；切预设/程序化壁纸时必须作废，
 * 否则重启后 applySavedTheme 会把旧壁纸的 primary/secondary/tertiary 叠加到新壁纸上。
 * 由预设点击（theme-engine）、程序化应用（procedural-wallpaper）与视频切换（video-wallpaper）
 * 通过本导出函数协调，不使用全局 hack。
 */
export function clearSavedPalette() {
  currentPalette = null;
  try { localStorage.removeItem(SK.palette); } catch (e) {}
}

// ==================== 对外读取 ====================

export function getWallpaperURL() { return currentWallpaperURL; }
export function getFontURL()      { return currentFontURL; }
export function getFontName()     { return currentFontName; }
export function getHue()          { return currentHue; }
export function getPalette()      { return currentPalette; }

// ==================== 多色配色方案提取 ====================

/**
 * 从壁纸图片提取多色配色方案。
 * 采样像素 → K-means 聚类（k=5）→ 取最大簇为主色，其余为次色/强调色。
 */
function extractPaletteFromImage(url, callback) {
  const img = new Image();
  // blob:/data: 属同源资源无需 CORS；仅远程图才需要 anonymous，避免画布被污染无法取色
  if (/^https?:/i.test(url)) img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const cx = canvas.getContext('2d');
    const size = 60;
    canvas.width = canvas.height = size;
    cx.drawImage(img, 0, 0, size, size);
    const data = cx.getImageData(0, 0, size, size).data;

    // 收集像素
    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 128) {
        pixels.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
    if (pixels.length === 0) { callback({ hue: 215 }); return; }

    // 简化 K-means (k=5, 3 轮)
    let centroids = [
      pixels[Math.floor(Math.random() * pixels.length)],
      pixels[Math.floor(Math.random() * pixels.length)],
      pixels[Math.floor(Math.random() * pixels.length)],
      pixels[Math.floor(Math.random() * pixels.length)],
      pixels[Math.floor(Math.random() * pixels.length)],
    ];

    for (let round = 0; round < 3; round++) {
      const clusters = [[], [], [], [], []];
      for (const px of pixels) {
        let minD = Infinity, minI = 0;
        for (let c = 0; c < centroids.length; c++) {
          const d = (px[0]-centroids[c][0])**2 + (px[1]-centroids[c][1])**2 + (px[2]-centroids[c][2])**2;
          if (d < minD) { minD = d; minI = c; }
        }
        clusters[minI].push(px);
      }
      for (let c = 0; c < centroids.length; c++) {
        if (clusters[c].length === 0) continue;
        let r=0, g=0, b=0;
        for (const px of clusters[c]) { r+=px[0]; g+=px[1]; b+=px[2]; }
        const n = clusters[c].length;
        centroids[c] = [r/n, g/n, b/n];
      }
    }

    // 按簇大小排序
    const clustersWithSize = centroids.map((c, i) => ({
      r: Math.round(c[0]),
      g: Math.round(c[1]),
      b: Math.round(c[2]),
      size: pixels.length, // 近似
      idx: i,
    })).sort((a, b) => b.size - a.size);

    // 实际簇大小
    for (let round = 0; round < 1; round++) {
      const counts = [0, 0, 0, 0, 0];
      for (const px of pixels) {
        let minD = Infinity, minI = 0;
        for (let c = 0; c < centroids.length; c++) {
          const d = (px[0]-centroids[c][0])**2 + (px[1]-centroids[c][1])**2 + (px[2]-centroids[c][2])**2;
          if (d < minD) { minD = d; minI = c; }
        }
        counts[minI]++;
      }
      clustersWithSize.forEach((c, i) => { c.size = counts[c.idx]; });
      clustersWithSize.sort((a, b) => b.size - a.size);
    }

    const rgbToHsl = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
          case g: h = ((b - r) / d + 2) * 60; break;
          case b: h = ((r - g) / d + 4) * 60; break;
        }
      }
      return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
    };

    // fix(audit-C #4): 无彩色退化守卫 —— 纯白/纯黑/灰阶壁纸的簇色饱和度≈0，
    // 旧实现直接用原色：纯白 → 白色 primary（暗色 UI 上不可见）、hue=0（红色主题）。
    // 参考 video-wallpaper.js 多帧取色的 s/l 过滤写法做 tonal 折算：
    //   · 饱和度 < 8%（无彩色）→ hue 回退默认 215
    //   · 饱和度抬到角色下限、亮度折进可见区间（近白/近黑在暗色 UI 上不可见）
    // neutral 保持原样（中性色本就该低饱和）
    const tonalize = (hsl, sFloor, lMin, lMax) => {
      const [h, s, l] = hsl;
      return [
        s < 8 ? DEFAULT_HUE : h,
        Math.max(sFloor, s),
        Math.min(lMax, Math.max(lMin, l)),
      ];
    };

    const palette = {
      primary:   clustersWithSize[0] ? tonalize(rgbToHsl(clustersWithSize[0].r, clustersWithSize[0].g, clustersWithSize[0].b), 28, 22, 88) : [DEFAULT_HUE, 80, 25],
      secondary: clustersWithSize[1] ? tonalize(rgbToHsl(clustersWithSize[1].r, clustersWithSize[1].g, clustersWithSize[1].b), 18, 25, 80) : [DEFAULT_HUE, 15, 40],
      tertiary:  clustersWithSize[2] ? tonalize(rgbToHsl(clustersWithSize[2].r, clustersWithSize[2].g, clustersWithSize[2].b), 24, 25, 82) : [DEFAULT_HUE, 50, 50],
      accent:    clustersWithSize[3] ? tonalize(rgbToHsl(clustersWithSize[3].r, clustersWithSize[3].g, clustersWithSize[3].b), 45, 40, 78) : [0, 70, 50],
      neutral:   clustersWithSize[4] ? rgbToHsl(clustersWithSize[4].r, clustersWithSize[4].g, clustersWithSize[4].b) : [DEFAULT_HUE, 10, 50],
      hue: 0,
    };
    palette.hue = palette.primary[0];
    callback(palette);
  };
  img.onerror = () => callback({ hue: 215, primary: [215, 80, 25] });
  img.src = url;
}

/** 应用完整配色方案到父文档 */
function applyPaletteToDocument(palette) {
  if (!palette) return;
  const root = document.documentElement;
  root.style.setProperty('--md-h', palette.hue);
  if (palette.primary) {
    const [h, s, l] = palette.primary;
    root.style.setProperty('--md-primary', `hsl(${h} ${s}% ${l}%)`);
  }
  if (palette.secondary) {
    const [h, s, l] = palette.secondary;
    root.style.setProperty('--md-secondary', `hsl(${h} ${s}% ${l}%)`);
  }
  if (palette.tertiary) {
    const [h, s, l] = palette.tertiary;
    root.style.setProperty('--md-tertiary', `hsl(${h} ${s}% ${l}%)`);
  }
}

// ==================== 字体 ====================

/** 将自定义字体应用到父文档 (保护状态栏、系统符号与 Emoji) */
function applyFontToDocument(url, name) {
  let styleEl = document.getElementById('custom-font-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'custom-font-style';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    @font-face {
      font-family: '${name}';
      src: url('${url}') format('woff2'), url('${url}') format('woff'), url('${url}') format('truetype');
      font-display: swap;
    }
    :root {
      --custom-user-font: '${name}', -apple-system, BlinkMacSystemFont, "Google Sans", "Noto Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif;
    }
    body, input, textarea, select, button, .app-icon > span, .widget-title, .at-a-glance-title, .glance-date, .md3-list-item-text, .md3-card, .menu-item-text {
      font-family: var(--custom-user-font) !important;
    }
    /* 严格保护状态栏、时钟电量、图标矢量、系统符号与 Emoji 免受自定义字体破坏 */
    .status-bar, .app-window-status-bar, .status-time, .status-icon, .battery-pill, .battery-pct, .battery-level, .page-dots, .dot, .app-badge, .remove-badge, .nav-btn, .back-btn, .recent-card-close, .recent-action-pill, svg, svg *, [class*="icon"], [class*="symbol"], [class*="emoji"], [data-icon], [data-symbol], .material-symbols, .glance-weather-icon, .glance-chip-icon, .menu-header-icon, .menu-item-icon {
      font-family: -apple-system, BlinkMacSystemFont, "Google Sans", "Segoe UI", system-ui, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif !important;
    }
    /* 连字图标字体例外：恢复其自家字体家族，否则图标名（如 bar_chart）会以文本形式裸露 */
    ${LIGATURE_FONT_FIX_CSS}
  `;
}

// ==================== 应用自定义壁纸/字体（上传入口，恢复流程见下方 restore 系列） ====================

/** 静态壁纸生效后，同步清理面板上动态/视频入口的高亮状态 */
function markStaticWallpaperUI() {
  try {
    document.getElementById('themeUploadAnyBtn')?.classList.remove('active');
    document.querySelectorAll('#themeDynamicGrid [data-proc]').forEach((c) => c.classList.remove('active'));
  } catch (e) {}
  // fix(P2)：广播壁纸变更 —— 设置›壁纸子页（pageIdx 13）用的是另一套 id
  //（#setDynamicGrid/#setUploadBtn），旧 mark 系列只维护旧面板 DOM，页外改壁纸
  //（上传/恢复/模式切换）时子页选中态脱管。监听方见 theme-engine.initWallpaperPage。
  try { window.dispatchEvent(new CustomEvent('wallpaper-changed', { detail: { source: 'static' } })); } catch (e) {}
}

/**
 * 上传壁纸自动识别：视频 → 动态视频壁纸；图片 → 静态壁纸。
 * 判断依据：MIME 类型优先，无 MIME 时按扩展名推断。
 * @param {Blob} blob 壁纸文件（图片或视频）
 * @param {boolean} persist 是否持久化
 */
export async function applyCustomWallpaperAuto(blob, persist) {
  const type = (blob && blob.type) || '';
  const name = (blob && blob.name) || '';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const videoExts = ['mp4', 'webm', 'mov', 'm4v', 'ogv', 'mkv', 'avi'];
  const isVideo = /^video\//.test(type) || (!type && videoExts.includes(ext));
  if (isVideo) {
    if (blob.size > 200 * 1024 * 1024) {
      if (window.showSystemToast) window.showSystemToast('视频过大（上限 200MB）', ICONS.videocam);
      return;
    }
    const ok = await applyVideoWallpaper(blob, { persist, showToast: true });
    if (!ok && window.showSystemToast) window.showSystemToast('不支持的视频格式', ICONS.videocam);
    return;
  }
  await applyCustomWallpaper(blob, persist);
}

/**
 * 应用自定义静态壁纸。
 * @param {Blob} blob 壁纸文件
 * @param {boolean} persist 是否持久化（用户上传 = true）
 */
export async function applyCustomWallpaper(blob, persist) {
  clearProceduralWallpaper(); // 自定义静态壁纸与动态壁纸互斥，后选者优先
  await clearVideoWallpaper(); // 与视频壁纸互斥
  markStaticWallpaperUI();
  // fix(audit-C #2): 换壁纸即作废旧调色板（新调色板由下方异步提取重写；
  // 若提取永不回调（加载异常等）也不留旧壁纸的残留）
  clearSavedPalette();
  const url = blobToObjectURL(blob, 'wallpaper');
  applyWallpaperURL(url);

  if (persist) {
    let saved = false;
    if (idbAvailable()) saved = await idbSet(IDB_KEYS.wallpaper, blob);
    if (saved) {
      // 自定义壁纸生效后，预设壁纸记录作废，避免下次启动优先级混乱
      try { localStorage.removeItem(SK.wallpaper); sessionStorage.removeItem(SK.wallpaper); } catch (e) {}
    } else {
      await legacySaveWallpaper(blob);
    }
  }

  // 提取多色配色方案
  // fix(audit-C #5): 异步竞态守卫 —— 连续上传两张图时，慢的取色回调后落地会覆盖
  // 新壁纸的主题。世代令牌 + 落地前校验 objectURL 仍是当前壁纸（含被视频/程序化/预设取代）
  const token = ++uploadToken;
  const isStillCurrentWallpaper = () => {
    if (token !== uploadToken || isVideoActive() || getActiveProceduralId()) return false;
    if (url !== currentWallpaperURL) return false;
    // 预设壁纸由 theme-engine 直铺 CSS 背景（不经 applyWallpaperURL）→ 再校验桌面背景仍指向本壁纸
    try { return (dom.desktop.style.backgroundImage || '').includes(url); } catch (e) { return false; }
  };
  extractPaletteFromImage(url, (palette) => {
    if (!isStillCurrentWallpaper()) return;
    currentHue = palette.hue;
    currentPalette = palette;
    saveHue(palette.hue);
    savePalette(palette);
    // 统一走主题引擎：全量 MD3 令牌落到根节点 + 向所有活 iframe 重注入
    // 动态样式表（旧实现只改 3 个根变量 + postMessage，令牌型应用不会全量跟色）
    applyThemeHue(palette.hue, false);
    // 实测主/次/三色（比公式更贴近壁纸本身）再叠加覆盖，并广播给监听型应用
    applyPaletteToDocument(palette);
    document.querySelectorAll('iframe').forEach((iframe) => {
      try { iframe.contentWindow.postMessage({ type: 'set-palette', palette }, '*'); } catch (e) {}
    });
  });
}

/**
 * 应用自定义字体。
 * @param {Blob} blob 字体文件
 * @param {string} name 字体名（一般取文件名去扩展名）
 * @param {boolean} persist 是否持久化
 */
export async function applyCustomFont(blob, name, persist) {
  const url = blobToObjectURL(blob, 'font');
  currentFontURL = url;
  currentFontName = name;
  applyFontToDocument(url, name);
  syncToIframes('set-font', url, { name });

  if (persist) {
    let saved = false;
    if (idbAvailable()) {
      const okFile = await idbSet(IDB_KEYS.font, blob);
      const okName = await idbSet(IDB_KEYS.fontName, name);
      saved = okFile && okName;
    }
    if (!saved) {
      await legacySaveFont(blob, name);
    }
    // 字体名很小，localStorage 里始终保留一份，兼容旧读取路径
    try { localStorage.setItem(SK.fontName, name); } catch (e) {}
  }
}

// ==================== 恢复（异步：IndexedDB → 旧数据迁移 → 预设 URL → 默认） ====================

function applyWallpaperURL(url) {
  currentWallpaperURL = url;
  // fix(audit-C #2): 预设壁纸路径（http/https URL）不携带调色板 —— 清掉旧自定义壁纸的
  // 调色板残留；blob:/data: 为自定义壁纸（自有调色板，随恢复流程的 applySavedTheme 重新应用）
  if (/^https?:/i.test(url)) clearSavedPalette();
  dom.desktop.style.backgroundImage = `url(${url})`;
  syncToIframes('set-wallpaper', url);
  refreshBlurSnapshot(true); // 毛玻璃预烘焙快照同步重绘
}

function applySavedTheme() {
  // 全量 MD3 令牌 + iframe 动态样式表统一由主题引擎落地；实测调色板再叠加覆盖
  applyThemeHue(currentHue, false);
  applyPaletteToDocument(currentPalette);
}

export function restoreWallpaper() {
  return (async () => {
    // -1) 视频壁纸（IndexedDB 原始文件 + localStorage 标记，最高优先级）
    await restoreVideoWallpaper();
    if (isVideoActive()) {
      applySavedTheme();
      return;
    }
    // 0) 程序化动态壁纸（键存的是预设 id，体积极小，留在 localStorage）
    let procId = '';
    try { procId = localStorage.getItem(PROCEDURAL_STORAGE_KEY) || ''; } catch (e) {}
    if (procId && applyProceduralWallpaper(procId, { persist: false, showToast: false })) {
      applySavedTheme();
      return;
    }
    // 1) 新版：IndexedDB 中的自定义壁纸（原始文件，无大小限制）
    if (idbAvailable()) {
      const blob = await idbGet(IDB_KEYS.wallpaper);
      if (blob) {
        applyWallpaperURL(blobToObjectURL(blob, 'wallpaper'));
        applySavedTheme();
        return;
      }
    }
    // 2) 旧版迁移：localStorage 里的 dataURL —— 搬进 IndexedDB 后删掉原键，释放空间
    let legacy = '';
    try {
      legacy = (localStorage.getItem(SK.wallpaper) || sessionStorage.getItem(SK.wallpaper) || '').trim();
    } catch (e) {}
    if (legacy.startsWith('data:')) {
      const blob = dataURLToBlob(legacy);
      if (blob) {
        applyWallpaperURL(blobToObjectURL(blob, 'wallpaper'));
        applySavedTheme();
        if (idbAvailable()) await idbSet(IDB_KEYS.wallpaper, blob);
        try { localStorage.removeItem(SK.wallpaper); sessionStorage.removeItem(SK.wallpaper); } catch (e) {}
        return;
      }
    }
    // 3) 预设壁纸（远程 URL，体积小，继续留在 localStorage）
    if (legacy) {
      applyWallpaperURL(legacy);
      applySavedTheme();
      return;
    }
    // 4) 默认壁纸：v7.6 起默认使用程序化动态壁纸「极光流体」（实时绘制、零网络依赖）；
    //    此前默认是一张 z-cdn 远程小图 —— 全站最后一个非自站资源。渲染失败时才回退远程图。
    if (applyProceduralWallpaper('aurora', { persist: false, showToast: false })) {
      applySavedTheme();
      return;
    }
    // 兜底：无任何壁纸记录且程序化壁纸也创建失败（极端环境）。
    // fix(P2)：回退改为纯 CSS 渐变 —— 旧实现回退跨源远程图（z-cdn），PWA 离线时
    // 连兜底图都加载不到（sw 只缓存同源 + Google Fonts），桌面全黑；
    // 渐变零依赖、离线必然可用，视觉也与应用主色一致。
    clearSavedPalette();
    dom.desktop.style.backgroundImage = '';
    dom.desktop.style.background =
      'radial-gradient(120% 90% at 20% 10%, #0b3b2e 0%, transparent 55%),' +
      'radial-gradient(110% 80% at 85% 20%, #123a63 0%, transparent 60%),' +
      'linear-gradient(160deg, #07130f 0%, #0a1a2f 55%, #050b12 100%)';
  })();
}

export function restoreFont() {
  return (async () => {
    // 1) 新版：IndexedDB 中的字体文件
    let blob = null;
    if (idbAvailable()) {
      blob = await idbGet(IDB_KEYS.font);
      if (blob && !currentFontName) {
        const savedName = await idbGet(IDB_KEYS.fontName);
        if (savedName) currentFontName = savedName;
      }
    }
    // 2) 旧版迁移：localStorage 里的 dataURL —— 搬进 IndexedDB 后删掉原键
    if (!blob) {
      let legacyFont = '';
      try { legacyFont = (localStorage.getItem(SK.font) || '').trim(); } catch (e) {}
      if (legacyFont.startsWith('data:')) {
        const migrated = dataURLToBlob(legacyFont);
        if (migrated) {
          blob = migrated;
          if (idbAvailable()) {
            await idbSet(IDB_KEYS.font, blob);
            if (currentFontName) await idbSet(IDB_KEYS.fontName, currentFontName);
          }
          try { localStorage.removeItem(SK.font); } catch (e) {}
        }
      }
    }
    if (blob && currentFontName) {
      const url = blobToObjectURL(blob, 'font');
      currentFontURL = url;
      applyFontToDocument(url, currentFontName);
    }
  })();
}

/**
 * 清除自定义壁纸记录（选预设壁纸时调用，保证下次启动预设优先生效）。
 * 当前画面不受影响 —— 调用方会立刻铺上预设壁纸。
 */
export async function clearCustomWallpaper() {
  if (idbAvailable()) await idbDel(IDB_KEYS.wallpaper);
}

// ==================== 同步到 iframe ====================

function syncToIframes(type, url, extra = {}) {
  document.querySelectorAll('iframe').forEach((iframe) => {
    try { iframe.contentWindow.postMessage({ type, url, ...extra }, '*'); } catch (e) {}
  });
}

/** 供 __syncIframeApp 推送用的壁纸 URL：视频壁纸时取当前帧快照，否则为当前静态壁纸 */
export function getWallpaperPushURL() {
  if (isVideoActive()) {
    const frame = getVideoFrameDataURL();
    if (frame) return frame;
  }
  return currentWallpaperURL || '';
}

// ==================== 触发函数 ====================

export function triggerWallpaperSelect() { dom.wallpaperInput.click(); }
export function triggerFontSelect() { if (dom.fontInput) dom.fontInput.click(); }

// ==================== 初始化 ====================

export function initWallpaper() {
  loadFromStorage();

  // 壁纸选择 — 静态/动态自动识别（图片→静态壁纸，视频→视频壁纸），原始文件入 IndexedDB
  dom.wallpaperInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = ''; // 允许重复选择同一个文件
    await applyCustomWallpaperAuto(file, true);
  });

  // 字体选择 — 同上
  if (dom.fontInput) {
    dom.fontInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      e.target.value = '';
      const name = file.name.replace(/\.[^.]+$/, '');
      await applyCustomFont(file, name, true);
    });
  }

}