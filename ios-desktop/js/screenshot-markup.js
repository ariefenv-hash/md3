// ==================== screenshot-markup.js — #94 二期：光栅源 + Markup 浮层（ScreenshotController EDIT intent 承接） ====================
//
// AOSP 锚（#94 议题正文 + v10.91 认领帖二期路线）：
//   · MarkupView：截图后进入独立批注浮层（与主 UI 解耦）——工具条（画笔/高亮/橡皮/裁切 +
//     撤销重做 + 保存/分享/关闭）
//   · ScreenshotController EDIT intent：shelf 缩略图点按 = 编辑入口（recent-apps 接线）
//   · ImageExporter：导出校验/命名/落盘目录由 aosp/image-exporter.js 纯逻辑单源
//
// 消费契约：
//   · aosp/markup-editor.js（v10.91）：createMarkupSession 会话状态机——exportGeometry()
//     产出的 stroke 数组即 canvas 绘制指令真源，cropRect 即输出画布裁剪框；serialize() v1
//     codec 即 Markup 伴生文件内容（OCR 消费入口预埋 #58/#59）
//   · aosp/image-exporter.js（本期新增）：PNG 前缀/尺寸/载荷校验 + 同源门
//
// 光栅源（#196「光栅另案」承接）DOM → SVG foreignObject → Canvas：
//   受浏览器约束三条（诚实标注，详见 image-exporter.js 头注）：跨域 iframe 不入图 / 外链
//   <img> 不加载 / web 字体回退渲染。同源门拒绝时 recent-apps 回退占位路径（诚实 toast）。
//
// 反馈纪律：本模块零 toast 零音效——onSave/onShare/onExportError 全由接线方（recent-apps）
// 提供，浮层只产出「已校验的导出载荷」（validateExport 通过才回调）。

import {
  createMarkupSession,
  PEN_COLORS,
  PEN_WIDTHS,
  HIGHLIGHTER_ALPHA,
  ERASER_HIT_RADIUS,
  MIN_CROP_EDGE,
} from './aosp/markup-editor.js';
import { validateExport } from './aosp/image-exporter.js';

/**
 * 光栅化当前视口（DOM → SVG foreignObject → Canvas → PNG dataURL）。
 * @param {Document} [doc] 注入（可测性；缺省全局 document）
 * @param {Window} [win] 注入
 * @returns {Promise<{dataUrl:string, width:number, height:number}>}
 * @throws Error（同源门拒绝 / SVG 图像装载失败 / 空白导出）
 */
export async function rasterizeViewport(doc = document, win = window) {
  const w = Math.max(1, Math.round(win.innerWidth));
  const h = Math.max(1, Math.round(win.innerHeight));
  const scale = Math.min(win.devicePixelRatio || 1, 2, 4096 / Math.max(w, h));
  // ① 克隆根节点并摘除自摄面（shelf/白闪/本浮层）+ 脚本（SVG-image 上下文不执行且
  //    script 原文含 `<`/`&` 经 XMLSerializer 产出非法 XML——foreignObject 经典坑，必摘）
  const clone = doc.documentElement.cloneNode(true);
  clone.querySelectorAll('#screenshotShelf,#screenshotFlash,#markupLayer').forEach((n) => n.remove());
  clone.querySelectorAll('script').forEach((n) => n.remove());
  // 注释节点必摘：HTML 注释可含 `--`（如 `--md-*` 令牌名），XML 注释「不得含双连字符」——
  // parsererror「Comment must not contain '--'」实锤（#170 坑账惯例）
  const walker = doc.createTreeWalker(clone, 128 /* NodeFilter.SHOW_COMMENT */);
  const comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((c) => c.remove());
  // ② 同源样式内联（跨域 stylesheet cssRules 不可读——跳过，诚实降级）
  let css = '';
  for (const sheet of doc.styleSheets) {
    try {
      if (sheet.cssRules) for (const r of sheet.cssRules) css += `${r.cssText}\n`;
    } catch (e) { /* 跨域 sheet：SilenceIsGolden */ }
  }
  const st = doc.createElement('style');
  st.textContent = css;
  const head = clone.querySelector('head') || clone;
  head.appendChild(st);
  // ③ foreignObject 包裹 → SVG dataURL → Image。
  //    坑二条在录（#170 惯例）：a) blob URL 装载的 foreignObject SVG 画入 canvas 会污染
  //    （Chromium 实测 M2 blob=taint / M3 dataURL=ok——blob image 保守 origin 策略），必须
  //    dataURL；b) 巨体量 dataURL 需 encodeURIComponent 全量转义（约 1.5x 膨胀，900x700 视口
  //    实测 ~0.9MB 可装载）。
  const xml = new XMLSerializer().serializeToString(clone)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`
    + `<foreignObject x="0" y="0" width="100%" height="100%">${xml}</foreignObject></svg>`;
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('svg-image-load-fail'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  // ④ 光栅到画布 → PNG
  const cv = doc.createElement('canvas');
  cv.width = Math.round(w * scale);
  cv.height = Math.round(h * scale);
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0, cv.width, cv.height);
  const dataUrl = cv.toDataURL('image/png');
  if (!dataUrl || dataUrl.length <= 'data:image/png;base64,'.length) {
    throw new Error('raster-empty-export');
  }
  return { dataUrl, width: w, height: h };
}

/** 工具按钮内联 SVG（自研线稿——AOSP Markup 图标无逐值公开源，#170 惯例标注） */
const TOOL_ICONS = {
  pen: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  highlighter: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l-6 6v3h3l6-6"/><path d="M22 12l-8.5-8.5a2.1 2.1 0 0 0-3 3L19 15a2.1 2.1 0 0 0 3-3Z"/></svg>',
  eraser: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H8.5L3 14.5a2 2 0 0 1 0-2.8l8.6-8.6a2 2 0 0 1 2.8 0l6.2 6.2a2 2 0 0 1 0 2.8L14 18.6"/></svg>',
  crop: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>',
  undo: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>',
  redo: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/></svg>',
  share: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
};

/** 笔迹绘制单源（渲染帧与导出离屏共用——同一 stroke 定义只实现一次） */
function drawStroke(ctx, s) {
  ctx.save();
  ctx.globalAlpha = s.tool === 'highlighter' ? HIGHLIGHTER_ALPHA : 1;
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const pts = s.points;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], Math.max(0.5, s.width / 2), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * 打开 Markup 批注浮层（ScreenshotController EDIT intent 网页等价）。
 * @param {{dataUrl:string, width:number, height:number}} shot 待批注截图（光栅产物）
 * @param {{
 *   onSave?: (exp:{dataUrl,width,height,markupJson:string|null,bytes:number}) => Promise<string|boolean>|string|boolean,
 *   onShare?: (exp:{dataUrl,width,height,markupJson:string|null,bytes:number}) => void,
 *   onExportError?: (error:string) => void,
 * }} [hooks] 接线方反馈（toast/音效/VFS 落盘全在接线方——本模块零反馈）
 * @returns {Promise<{kind:'save'|'share'|'close'|'busy'|'error', path?:string}>}
 */
export function openMarkupEditor(shot, hooks = {}) {
  return new Promise((resolve) => {
    if (!shot || typeof shot.dataUrl !== 'string' || !shot.dataUrl.startsWith('data:image/png;base64,')
      || !Number.isFinite(shot.width) || !Number.isFinite(shot.height)
      || document.getElementById('markupLayer')) {
      resolve({ kind: 'busy' });
      return;
    }
    const base = new Image();
    base.onload = () => {
      try { build(); } catch (e) { resolve({ kind: 'error' }); }
    };
    base.onerror = () => resolve({ kind: 'error' });
    base.src = shot.dataUrl;

    function build() {
      const session = createMarkupSession({ width: shot.width, height: shot.height });
      let curTool = 'pen';
      let curColor = PEN_COLORS[0];
      let curWidth = PEN_WIDTHS[1];
      let dragStroke = null;      // 进行中笔迹（渲染预览）
      let dragCropStart = null;   // 裁切拉框起点
      let previewCrop = null;     // 裁切预览框

      const layer = document.createElement('div');
      layer.id = 'markupLayer';
      layer.className = 'markup-layer';
      layer.setAttribute('role', 'dialog');
      layer.setAttribute('aria-label', '截图批注');
      const dots = PEN_COLORS.map((c, i) => `<button class="mk-dot" data-color="${c}" style="background:${c}" aria-label="颜色${i + 1}"></button>`).join('');
      const widths = PEN_WIDTHS.map((w) => `<button class="mk-w" data-w="${w}" aria-label="笔宽${w}"><span style="height:${Math.max(2, w)}px;width:${Math.max(2, w) * 3}px"></span></button>`).join('');
      layer.innerHTML =
        `<canvas class="mk-canvas" width="${shot.width}" height="${shot.height}" aria-label="截图画布"></canvas>`
        + `<div class="mk-toolbar" role="toolbar" aria-label="批注工具条">`
        + ['pen', 'highlighter', 'eraser', 'crop'].map((t) => `<button class="mk-btn mk-tool" data-tool="${t}" aria-label="${t === 'pen' ? '画笔' : t === 'highlighter' ? '高亮' : t === 'eraser' ? '橡皮' : '裁切'}">${TOOL_ICONS[t]}</button>`).join('')
        + `<span class="mk-sep"></span>${dots}`
        + `<span class="mk-sep"></span>${widths}`
        + `<span class="mk-sep"></span>`
        + `<button class="mk-btn" data-act="undo" aria-label="撤销">${TOOL_ICONS.undo}</button>`
        + `<button class="mk-btn" data-act="redo" aria-label="重做">${TOOL_ICONS.redo}</button>`
        + `<button class="mk-btn mk-crop-clear" data-act="crop-clear" aria-label="清除裁切" hidden>${TOOL_ICONS.crop}</button>`
        + `<span class="mk-flex"></span>`
        + `<button class="mk-btn mk-primary" data-act="save" aria-label="保存截图">保存</button>`
        + `<button class="mk-btn" data-act="share" aria-label="分享截图">${TOOL_ICONS.share}</button>`
        + `<button class="mk-btn" data-act="close" aria-label="关闭批注">${TOOL_ICONS.close}</button>`
        + `</div>`;
      document.body.appendChild(layer);
      const cv = layer.querySelector('.mk-canvas');
      const ctx = cv.getContext('2d');

      const renderFrame = () => {
        const geom = session.exportGeometry();
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(base, 0, 0, cv.width, cv.height);
        for (const s of geom.strokes) drawStroke(ctx, s);
        if (dragStroke) drawStroke(ctx, dragStroke);
        const crop = previewCrop || geom.crop;
        if (crop) {
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(0, 0, cv.width, crop.y);
          ctx.fillRect(0, crop.y, crop.x, crop.h);
          ctx.fillRect(crop.x + crop.w, crop.y, cv.width - crop.x - crop.w, crop.h);
          ctx.fillRect(0, crop.y + crop.h, cv.width, cv.height - crop.y - crop.h);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(crop.x, crop.y, crop.w, crop.h);
          ctx.restore();
        }
        // 按钮态同步（undo/redo disabled + 工具高亮 + 裁切清除钮显隐）
        layer.querySelector('[data-act="undo"]').disabled = !session.canUndo();
        layer.querySelector('[data-act="redo"]').disabled = !session.canRedo();
        layer.querySelectorAll('.mk-tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === curTool));
        layer.querySelectorAll('.mk-dot').forEach((b) => b.classList.toggle('active', b.dataset.color === curColor));
        layer.querySelectorAll('.mk-w').forEach((b) => b.classList.toggle('active', Number(b.dataset.w) === curWidth));
        layer.querySelector('[data-act="crop-clear"]').hidden = !geom.crop;
      };
      renderFrame();

      /** 画布坐标换算（CSS 显示尺寸 → 画布内部像素坐标系） */
      const toCanvas = (e) => {
        const rect = cv.getBoundingClientRect();
        return [
          Math.round(((e.clientX - rect.left) * cv.width) / Math.max(1, rect.width)),
          Math.round(((e.clientY - rect.top) * cv.height) / Math.max(1, rect.height)),
        ];
      };

      cv.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 无捕获环境静默 */ }
        const [x, y] = toCanvas(e);
        if (curTool === 'crop') {
          dragCropStart = [x, y];
          previewCrop = { x, y, w: 0, h: 0 };
        } else if (curTool === 'eraser') {
          session.eraseAt(x, y, ERASER_HIT_RADIUS);
        } else {
          dragStroke = { tool: curTool, color: curColor, width: curTool === 'highlighter' ? Math.max(curWidth, 10) : curWidth, points: [[x, y]] };
        }
        renderFrame();
      });
      cv.addEventListener('pointermove', (e) => {
        if (curTool === 'crop' && dragCropStart) {
          const [x, y] = toCanvas(e);
          const [sx, sy] = dragCropStart;
          previewCrop = {
            x: Math.min(sx, x), y: Math.min(sy, y),
            w: Math.abs(x - sx), h: Math.abs(y - sy),
          };
          renderFrame();
          return;
        }
        if (curTool === 'eraser' && e.buttons) {
          const [x, y] = toCanvas(e);
          session.eraseAt(x, y, ERASER_HIT_RADIUS);
          renderFrame();
          return;
        }
        if (dragStroke && e.buttons) {
          dragStroke.points.push(toCanvas(e));
          renderFrame();
        }
      });
      const endPointer = (e) => {
        if (curTool === 'crop' && dragCropStart) {
          const rect = previewCrop;
          dragCropStart = null;
          previewCrop = null;
          if (rect) session.setCrop(rect); // 钳位归一 + MIN_CROP_EDGE 门（非法保持原值——v10.91 语义）
          renderFrame();
          return;
        }
        if (dragStroke) {
          const s = dragStroke;
          dragStroke = null;
          session.addStroke(s); // 非法笔迹 session 内部拒绝（返回 null）
          renderFrame();
        }
      };
      cv.addEventListener('pointerup', endPointer);
      cv.addEventListener('pointercancel', endPointer);

      /** 导出：crop 内离屏合成（底图 + 笔迹）→ validateExport 校验 → 回调载荷 */
      const finalize = () => {
        const geom = session.exportGeometry();
        const crop = geom.crop || { x: 0, y: 0, w: geom.width, h: geom.height };
        const off = document.createElement('canvas');
        off.width = Math.max(1, crop.w);
        off.height = Math.max(1, crop.h);
        const octx = off.getContext('2d');
        octx.translate(-crop.x, -crop.y);
        octx.drawImage(base, 0, 0, cv.width, cv.height);
        for (const s of geom.strokes) drawStroke(octx, s);
        const dataUrl = off.toDataURL('image/png');
        const v = validateExport({ width: crop.w, height: crop.h, dataUrl });
        if (!v.ok) return { ok: false, error: v.error };
        return { ok: true, dataUrl, width: crop.w, height: crop.h, markupJson: session.serialize(), bytes: v.bytes };
      };

      const done = (kind, extra = {}) => {
        document.removeEventListener('keydown', onKey);
        try { layer.remove(); } catch (e) { /* 幂等 */ }
        try { delete window.__markupTest; } catch (e) { window.__markupTest = undefined; }
        resolve({ kind, ...extra });
      };
      const onKey = (e) => { if (e.key === 'Escape') done('close'); };
      document.addEventListener('keydown', onKey);

      // 工具条点击路由（工具/色/宽/撤销重做/裁切清除/保存/分享/关闭）
      layer.querySelector('.mk-toolbar').addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn || btn.disabled) return;
        if (btn.dataset.tool) { curTool = btn.dataset.tool; renderFrame(); return; }
        if (btn.dataset.color) { curColor = btn.dataset.color; renderFrame(); return; }
        if (btn.dataset.w) { curWidth = Number(btn.dataset.w); renderFrame(); return; }
        const act = btn.dataset.act;
        if (act === 'undo') { session.undo(); renderFrame(); return; }
        if (act === 'redo') { session.redo(); renderFrame(); return; }
        if (act === 'crop-clear') { session.setCrop(null); renderFrame(); return; }
        if (act === 'close') { done('close'); return; }
        if (act === 'save') {
          const r = finalize();
          if (!r.ok) { if (hooks.onExportError) hooks.onExportError(r.error); return; }
          const path = hooks.onSave ? await hooks.onSave(r) : true;
          if (path) done('save', { path: typeof path === 'string' ? path : undefined });
          return;
        }
        if (act === 'share') {
          const r = finalize();
          if (!r.ok) { if (hooks.onExportError) hooks.onExportError(r.error); return; }
          if (hooks.onShare) hooks.onShare(r);
          done('share');
        }
      });

      // 调试桥（e2e/回归用；关闭即摘除——v10.02 __themeColorTest 惯例）
      try {
        window.__markupTest = {
          open: () => !!document.getElementById('markupLayer'),
          session: () => session.__debug(),
          crop: () => session.cropRect(),
          tool: () => curTool,
          finalize,
        };
      } catch (e) { /* window 只读环境静默 */ }
    }
  });
}
