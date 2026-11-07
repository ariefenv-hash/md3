// ==================== image-exporter.js — Screenshot ImageExporter 网页等价纯逻辑（#94 二期） ====================
//
// AOSP 锚（packages/SystemUI/src/com/android/systemui/screenshot/ImageExporter.kt，
// aosp-mirror/platform_frameworks_base @ main，#196 blob 页实拉先例 + #94 议题正文实证）：
//   · IMAGE_NAME_FORMAT = "Screenshot_%s"（日期段 yyyyMMdd-HHmmss，Android 截图命名惯例）
//   · 落盘目录语义位：md3 网页等价 = VFS /Pictures/Screenshots（#94 议题原文路径）
//   · Shelf 超时退场 = saveScreenshotAndToast 语义（ScreenshotController.kt：6s 无交互自动
//     保存 + toast；删除 = 丢弃；分享 = 分享面板接管不落盘）——md3 以 shouldAutoSave 单源判定
//
// md3 落地（#94 二期，v10.31）：
//   · 本模块 = 导出链纯逻辑（命名/伴生文件路径/导出载荷校验/光栅同源门/超时自动保存判定），
//     零 DOM 零 window（js/aosp 纯逻辑层纪律）；canvas 光栅化与浮层 UI 在 js/screenshot-markup.js
//   · 光栅源（DOM → SVG foreignObject → Canvas，#196「光栅另案」承接）受浏览器约束三条，
//     诚实标注（#170 自创标注惯例）：
//     ① 跨域 iframe 内容不入图（XMLSerializer 不跨文档边界——序列化结果为空白矩形）
//     ② 外链 <img> 在 SVG-image 上下文不加载（资源沙箱）——以空白框呈现
//     ③ web 字体不在 SVG-image 上下文加载——文本以回退字体渲染（形变可接受，逐像素保真不可达）
//     同源门 canRasterizeLocation 只承诺「本页 DOM 序列化」这条腿（#116 R2 同源同律）。
//   · 校验门（RASTER_MAX_EDGE / EXPORT_MAX_BYTES）为自研防炸门（长边 4096 / PNG dataURL
//     8MB）——AOSP 无逐值公开源对应物，自研标注；零面积/前缀错/超限一律拒绝不半成品
//     （deserializeMarkup v10.31 同律）。
//
// 纯逻辑层：零 DOM 零 window 零随机源。

/** VFS 截图落盘目录（#94 议题原文路径） */
export const SCREENSHOTS_DIR = '/Pictures/Screenshots';

/** Markup 伴生文件扩展名（serializeMarkup v1 codec——OCR 消费入口预埋 #58/#59） */
export const MARKUP_SIDECAR_EXT = '.markup.json';

/** 光栅长边上限 px（自研防炸门：2x DPR 下 4K 视口封顶） */
export const RASTER_MAX_EDGE = 4096;

/** PNG dataURL 导出上限 bytes（自研防炸门：防 VFS 单文件膨胀） */
export const EXPORT_MAX_BYTES = 8 * 1024 * 1024;

/** PNG dataURL 前缀（canvas.toDataURL('image/png') 契约） */
export const PNG_DATAURL_PREFIX = 'data:image/png;base64,';

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * 截图文件名（AOSP IMAGE_NAME_FORMAT "Screenshot_%s" 网页等价；日期段 yyyyMMdd-HHmmss 本地时区）。
 * @param {Date} now 落盘时刻
 * @returns {string} 如 Screenshot_20261105-220000.png
 */
export function screenshotFileName(now) {
  const d = now instanceof Date ? now : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return `Screenshot_${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}.png`;
}

/**
 * Markup 伴生文件路径（同主名换扩展名；OCR 消费入口：readText(sidecar) → deserializeMarkup）。
 * @param {string} pngPath 主 PNG 路径
 * @returns {string|null} 非 .png 结尾 → null（防御：永不写错位伴生文件）
 */
export function sidecarPathFor(pngPath) {
  if (typeof pngPath !== 'string' || !pngPath.endsWith('.png')) return null;
  return pngPath.slice(0, -4) + MARKUP_SIDECAR_EXT;
}

/**
 * 导出载荷校验（零面积/超限/前缀错一律拒绝——永不半成品）。
 * @param {{width:number, height:number, dataUrl:string}} exp
 * @returns {{ok:true, bytes:number}|{ok:false, error:string}}
 */
export function validateExport(exp) {
  if (!exp || typeof exp !== 'object') return { ok: false, error: '载荷缺失' };
  const { width, height, dataUrl } = exp;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { ok: false, error: '画布尺寸非法' };
  }
  const longEdge = Math.max(width, height);
  if (longEdge > RASTER_MAX_EDGE) {
    return { ok: false, error: `长边超限 ${longEdge} > ${RASTER_MAX_EDGE}` };
  }
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith(PNG_DATAURL_PREFIX)) {
    return { ok: false, error: 'dataURL 非 PNG 前缀' };
  }
  const b64 = dataUrl.slice(PNG_DATAURL_PREFIX.length);
  if (!b64.length) return { ok: false, error: '空载荷' };
  const bytes = Math.floor((b64.length * 3) / 4);
  if (bytes > EXPORT_MAX_BYTES) {
    return { ok: false, error: `载荷超限 ${bytes} > ${EXPORT_MAX_BYTES}` };
  }
  return { ok: true, bytes };
}

/**
 * 光栅同源门（#116 R2 同源同律：只承诺本页 DOM 序列化这条腿）。
 * 非 http(s) 环境（file:/about:/chrome-extension: 等）拒绝——SVG foreignObject 序列化
 * 在非 http(s) 上下文行为不稳定，诚实拒绝优于静默黑帧。
 * @param {{protocol:string, origin:string}} loc
 * @returns {{ok:true}|{ok:false, reason:string}}
 */
export function canRasterizeLocation(loc) {
  const protocol = loc && typeof loc.protocol === 'string' ? loc.protocol : '';
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { ok: false, reason: `非 http(s) 环境（${protocol || 'unknown'}）——光栅源同源门拒绝` };
  }
  return { ok: true };
}

/**
 * Shelf 退场原因 → 是否自动落盘（ScreenshotController.kt 超时退场 = saveScreenshotAndToast
 * 语义单源；delete=丢弃 / share=分享面板接管 / edit=进编辑器 / close=用户取消——均不落盘）。
 * @param {string} exitReason shelfHide 原因
 * @returns {boolean}
 */
export function shouldAutoSave(exitReason) {
  return exitReason === 'timeout';
}
