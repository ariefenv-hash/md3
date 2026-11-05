// ==================== markup-editor.js — Markup 批注编辑会话纯逻辑（#94 一期） ====================
//
// AOSP 锚（#94 议题正文实证；aosp-mirror/platform_frameworks_base @ main ScreenshotController）
//   · A11+ 截图后进入 Markup 编辑：截图 → 底部工具条（裁切 crop / 涂鸦 markup / 文字 /
//     高亮 / 橡皮 / 撤销重做 / 分享 / 删除）→ 编辑视图为独立浮层与主 UI 解耦
//   · 编辑入口：ScreenshotController EDIT intent（缩略图点按进入编辑，md3 以 shelf 缩略图
//     点按承接——二期接线）；ImageExporter 落盘（md3 网页等价 = VFS /Pictures/Screenshots，
//     二期接线）
//   · 工具细节（笔宽档位/色板/橡皮命中）AOSP Markup 无公开逐值源——网页自研，诚实标注
//     （#170 自创标注惯例）；工具集按 issue 描述对齐：pen/highlighter/eraser/crop 四工具
//     一期在库，text/emoji 二期另案
//
// md3 映射（#94 一期范围纪律）：
//   · 本模块 = 编辑会话状态机与几何/序列化纯逻辑（零 DOM 零 window）——渲染层（canvas
//     笔迹绘制/指针采样）与浮层 UI 二期另案；消费契约：exportGeometry() 产出的 stroke
//     数组即 canvas 绘制指令真源，cropRect 即输出画布裁剪框
//   · 序列化严格 codec：deserialize 非法输入 → null 永不半成品（parseCommunityTheme 同律，
//     v10.02 先例）；载荷上限 1MB（防 localStorage/跨应用载荷膨胀）
//
// 纯逻辑层：零 DOM 零 window 零随机源（stroke id 由单调计数器生成，vitest 可控）。

/** 工具集（#94 issue 描述对齐；text/emoji 二期另案） */
export const MARKUP_TOOLS = ['pen', 'highlighter', 'eraser', 'crop'];

/** 笔色板（M3 基线五色——AOSP Markup 色板无逐值公开源，自研标注；白/黑保证深浅底可用） */
export const PEN_COLORS = ['#D0BCFF', '#FFB4AB', '#A8CABF', '#1C1B1F', '#FFFFFF'];

/** 高亮笔迹透明度（AOSP highlighter 视觉语义；自研标注） */
export const HIGHLIGHTER_ALPHA = 0.35;

/** 橡皮命中半径 px（屏幕坐标系；自研标注） */
export const ERASER_HIT_RADIUS = 12;

/** 笔宽档位（px；pen 3 档 / highlighter 3 档——自研标注） */
export const PEN_WIDTHS = [2, 5, 10];

/** 裁切框最小边（px；低于此门拒绝——防零面积导出） */
export const MIN_CROP_EDGE = 32;

/** 序列化载荷上限（bytes） */
export const MARKUP_PAYLOAD_LIMIT = 1024 * 1024;

let __strokeSeq = 0;
/** 单调笔迹 id（会话内唯一；reset 只由 deserialize 调用方显式触发） */
export function nextStrokeId() {
  __strokeSeq += 1;
  return `s${__strokeSeq}`;
}
/** 测试钩子：重置计数器（生产零消费） */
export function resetStrokeIdCounter() { __strokeSeq = 0; }

/** 点合法性（数值坐标；NaN/Infinity/非数组元素拒绝） */
function validPoint(p) {
  return Array.isArray(p) && p.length >= 2
    && Number.isFinite(p[0]) && Number.isFinite(p[1]);
}

/** 笔迹合法性（tool/color/width/points 全门） */
export function isValidStroke(s) {
  if (!s || typeof s !== 'object') return false;
  if (!MARKUP_TOOLS.includes(s.tool) || s.tool === 'crop') return false;
  if (typeof s.color !== 'string' || !s.color) return false;
  if (!Number.isFinite(s.width) || s.width <= 0) return false;
  if (!Array.isArray(s.points) || s.points.length === 0) return false;
  return s.points.every(validPoint);
}

/** 点到线段最短距离（橡皮命中几何；欧氏） */
export function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = px - x1;
    const ey = py - y1;
    return Math.sqrt(ex * ex + ey * ey);
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return Math.sqrt(ex * ex + ey * ey);
}

/** 笔迹命中判定：点距笔迹任一线段 ≤ radius → true（单点笔迹退化为点距） */
export function hitTestStroke(stroke, x, y, radius) {
  if (!isValidStroke(stroke)) return false;
  const r = Number.isFinite(radius) && radius > 0 ? radius : ERASER_HIT_RADIUS;
  const pts = stroke.points;
  for (let i = 0; i < pts.length - 1; i++) {
    if (pointToSegmentDistance(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= r) return true;
  }
  if (pts.length === 1) {
    const ex = x - pts[0][0];
    const ey = y - pts[0][1];
    return Math.sqrt(ex * ex + ey * ey) <= r;
  }
  return false;
}

/**
 * 创建 Markup 编辑会话（状态机）。
 * @param {object} [opts]
 *   - width/height 画布尺寸（px，正数）
 *   - strokes 初始笔迹（deserialize 产物回灌）
 * @returns 会话对象（addStroke/eraseAt/undo/redo/setCrop/exportGeometry/serialize）
 */
export function createMarkupSession(opts = {}) {
  const width = Number.isFinite(opts.width) && opts.width > 0 ? opts.width : 1080;
  const height = Number.isFinite(opts.height) && opts.height > 0 ? opts.height : 1920;
  let strokes = (Array.isArray(opts.strokes) ? opts.strokes : []).filter(isValidStroke);
  // initialCrop：回灌路径（deserialize 专用，不产生撤销历史——状态恢复非用户动作）；
  // 交互路径 setCrop 才入栈
  let cropRect = (opts.initialCrop && typeof opts.initialCrop === 'object') ? { ...opts.initialCrop } : null;
  let undoStack = [];                     // { op:'add', stroke } | { op:'erase', strokes } | { op:'crop', prev, next }
  let redoStack = [];

  const snapshot = () => ({
    strokes: strokes.map((s) => ({ ...s, points: s.points.map((p) => [p[0], p[1]]) })),
    crop: cropRect ? { ...cropRect } : null,
  });

  const session = {
    /** 画布尺寸 */
    get width() { return width; },
    get height() { return height; },
    /** 当前笔迹（防御性拷贝——渲染层消费真源） */
    strokes: () => strokes.map((s) => ({ ...s, points: s.points.map((p) => [p[0], p[1]]) })),
    cropRect: () => (cropRect ? { ...cropRect } : null),

    /** 落笔提交（一笔一 id；非法笔迹拒绝返回 null）；撤销账存全量快照（redo 可回放） */
    addStroke({ tool, color, width: w, points }) {
      const stroke = { id: nextStrokeId(), tool, color, width: w, points };
      if (!isValidStroke(stroke)) return null;
      const frozen = { ...stroke, points: stroke.points.map((p) => [p[0], p[1]]) };
      strokes.push(frozen);
      undoStack.push({ op: 'add', stroke: frozen });
      redoStack = [];
      return { ...frozen, points: frozen.points.map((p) => [p[0], p[1]]) };
    },

    /** 橡皮：删除命中笔迹（可能多条；返回被删 id 数组，无可命中 → 空数组） */
    eraseAt(x, y, radius) {
      const px = Number(x);
      const py = Number(y);
      if (!Number.isFinite(px) || !Number.isFinite(py)) return [];
      const hit = strokes.filter((s) => hitTestStroke(s, px, py, radius));
      if (!hit.length) return [];
      const hitIds = new Set(hit.map((s) => s.id));
      const removed = strokes.filter((s) => hitIds.has(s.id));
      strokes = strokes.filter((s) => !hitIds.has(s.id));
      undoStack.push({ op: 'erase', strokes: removed.map((s) => ({ ...s, points: s.points.map((p) => [p[0], p[1]]) })) });
      redoStack = [];
      return removed.map((s) => s.id);
    },

    /** 撤销（add → 按 id 移除；erase → 整组回灌；crop → 回灌 prev）。无可撤销 → false */
    undo() {
      const entry = undoStack.pop();
      if (!entry) return false;
      if (entry.op === 'add') {
        strokes = strokes.filter((s) => s.id !== entry.stroke.id);
      } else if (entry.op === 'erase') {
        strokes = strokes.concat(entry.strokes.map((s) => ({ ...s, points: s.points.map((p) => [p[0], p[1]]) })));
      } else if (entry.op === 'crop') {
        cropRect = entry.prev ? { ...entry.prev } : null;
      }
      redoStack.push(entry);
      return true;
    },

    /** 重做（逆操作回放）。无可重做 → false */
    redo() {
      const entry = redoStack.pop();
      if (!entry) return false;
      if (entry.op === 'add') {
        strokes.push(entry.stroke);         // 全量快照回放（undo 曾物理移除）
      } else if (entry.op === 'erase') {
        const ids = new Set(entry.strokes.map((s) => s.id));
        strokes = strokes.filter((s) => !ids.has(s.id));
      } else if (entry.op === 'crop') {
        cropRect = entry.next ? { ...entry.next } : null;
      }
      undoStack.push(entry);
      return true;
    },
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,

    /** 裁切框设置（钳入画布 + 最小边门；null = 清除裁切）。非法 → false 保持原值 */
    setCrop(rect) {
      if (rect === null) {
        undoStack.push({ op: 'crop', prev: cropRect ? { ...cropRect } : null, next: null });
        redoStack = []; cropRect = null; return true;
      }
      if (!rect || typeof rect !== 'object') return false;
      const x = Math.round(Number(rect.x));
      const y = Math.round(Number(rect.y));
      const w = Math.round(Number(rect.w));
      const h = Math.round(Number(rect.h));
      if (![x, y, w, h].every(Number.isFinite)) return false;
      const cx = Math.max(0, Math.min(width, x));
      const cy = Math.max(0, Math.min(height, y));
      const cw = Math.max(0, Math.min(width - cx, w));
      const ch = Math.max(0, Math.min(height - cy, h));
      if (cw < MIN_CROP_EDGE || ch < MIN_CROP_EDGE) return false;   // 最小边门（防零面积导出）
      undoStack.push({ op: 'crop', prev: cropRect ? { ...cropRect } : null, next: { x: cx, y: cy, w: cw, h: ch } });
      cropRect = { x: cx, y: cy, w: cw, h: ch };
      redoStack = [];
      return true;
    },

    /** 渲染层消费契约：笔迹数组 + 裁剪框（canvas 绘制指令真源） */
    exportGeometry() {
      return { width, height, crop: cropRect ? { ...cropRect } : null, strokes: session.strokes() };
    },

    /** 序列化（JSON 字符串；超限拒绝 → null） */
    serialize() {
      const payload = JSON.stringify({ v: 1, width, height, crop: cropRect, strokes });
      if (payload.length > MARKUP_PAYLOAD_LIMIT) return null;
      return payload;
    },

    /** 测试/调试快照 */
    __debug: snapshot,
  };
  return session;
}

/**
 * 反序列化（严格 codec：非法输入 → null 永不半成品——parseCommunityTheme 同律）。
 * @param {string} raw serialize() 产物
 * @returns {{ session: object }|null}（重启会话：strokes 回灌、crop 回灌、栈清空）
 */
export function deserializeMarkup(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > MARKUP_PAYLOAD_LIMIT) return null;
  let obj = null;
  try { obj = JSON.parse(raw); } catch (e) { return null; }
  if (!obj || typeof obj !== 'object' || obj.v !== 1) return null;
  if (!Number.isFinite(obj.width) || !Number.isFinite(obj.height) || obj.width <= 0 || obj.height <= 0) return null;
  if (!Array.isArray(obj.strokes) || !obj.strokes.every(isValidStroke)) return null;
  if (obj.crop !== null && obj.crop !== undefined) {
    const c = obj.crop;
    if (!c || typeof c !== 'object'
      || ![c.x, c.y, c.w, c.h].every((n) => Number.isFinite(n) && n >= 0)
      || c.x + c.w > obj.width || c.y + c.h > obj.height
      || c.w < MIN_CROP_EDGE || c.h < MIN_CROP_EDGE) return null;
  }
  const session = createMarkupSession({ width: obj.width, height: obj.height, strokes: obj.strokes, initialCrop: obj.crop || null });
  return { session };
}
