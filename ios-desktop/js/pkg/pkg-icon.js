// ==================== pkg-icon.js — 安装包图标管线（v7.52 矢量优先） ====================
//
// 全站内置应用图标均为矢量 SVG（app-icons.js APP_ICONS 表），安装包图标保持同一质感：
//
//   SVG（首选）：manifest.icon 指向 .svg → sanitizeIconSVG 净化（剥 script/on*/外链）
//              → 归一化填满 icon-box（width/height 100%）→ 直接以内联 SVG HTML 注入桌面。
//              与内置图标同一条 innerHTML 通道：包内 SVG 使用 hsl(var(--md-h,215) …)
//              即可自动跟随系统主题色（README 规范有说明）。
//
//   位图（兼容）：png/jpg/webp 等 → createImageBitmap 栅格化到 ≤192px 正方形
//              → PNG dataURL → <img> 标签注入（缩放由 CSS object-fit 处理）。
//              ICO / 解码失败的位图 → 回退默认图标。
//
// 本模块是「图标字节 → 桌面 icon HTML」的唯一转换点；非浏览器环境（单测）优雅降级。

import { sanitizeIconSVG } from './pkg-manifest.js';

/** 栅格化目标边长（图标框显示约 56~64px，192 覆盖 2~3x DPI 足够） */
const RASTER_MAX = 192;

/** 归一化 SVG：确保根节点填满图标盒（与内置图标 <svg width=100% height=100%> 同形） */
function normalizeSvgBox(svgText) {
  return svgText
    .replace(/<svg([^>]*)>/i, (m, attrs) => {
      let a = String(attrs);
      if (!/width\s*=/i.test(a)) a += ' width="100%"';
      if (!/height\s*=/i.test(a)) a += ' height="100%"';
      // 保留宽高比居中放置，避免包图标被拉伸变形
      if (!/preserveAspectRatio\s*=/i.test(a)) a += ' preserveAspectRatio="xMidYMid meet"';
      return `<svg${a}>`;
    });
}

/**
 * 位图栅格化到 ≤192px PNG dataURL。
 * @returns {Promise<string|null>} dataURL；解码失败 / 非浏览器环境返回 null
 */
async function rasterizeToDataURL(blob) {
  try {
    if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined') return null;
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, RASTER_MAX / Math.max(bmp.width || 1, bmp.height || 1));
    const w = Math.max(1, Math.round((bmp.width || RASTER_MAX) * scale));
    const h = Math.max(1, Math.round((bmp.height || RASTER_MAX) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bmp, 0, 0, w, h);
    try { bmp.close && bmp.close(); } catch (e) {}
    return canvas.toDataURL('image/png');
  } catch (e) {
    return null;
  }
}

/**
 * 图标字节 → 桌面 icon HTML。
 * @param {Uint8Array|Blob} data 图标文件字节
 * @param {string} mime imageMimeFromName 的结果
 * @returns {Promise<{kind:'svg'|'img', html:string}|null>} null = 全部失败（调用方回退默认图标）
 */
export async function buildIconHTML(data, mime) {
  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });

    // ---- 矢量优先：SVG 净化后内联注入（与内置图标同通道、可跟随主题） ----
    if (mime === 'image/svg+xml') {
      const text = await blob.text();
      const clean = sanitizeIconSVG(text);
      if (clean) return { kind: 'svg', html: normalizeSvgBox(clean) };
      return null; // SVG 净化失败不强行栅格化（有 script 的图标直接回退默认）
    }

    // ---- 位图：栅格化 → dataURL ----
    if (mime === 'image/x-icon') {
      // ICO 由栅格化链路尝试（Chromium createImageBitmap 支持 ICO），失败回退默认
      const url = await rasterizeToDataURL(blob);
      if (!url) return null;
      return { kind: 'img', html: imgHTML(url) };
    }

    const url = await rasterizeToDataURL(blob);
    if (!url) return null;
    return { kind: 'img', html: imgHTML(url) };
  } catch (e) {
    return null;
  }
}

/** dataURL → 填满图标盒的 <img>（border-radius 与 icon-box 圆角一致） */
function imgHTML(dataURL) {
  return `<img src="${dataURL}" alt="" draggable="false" style="width:100%;height:100%;object-fit:cover;border-radius:24%;display:block;background:#fff;">`;
}
