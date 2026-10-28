// ==================== widget-core.js — 桌面 widget 系统纯函数核（v8.59 #67） ====================
//
// Launcher3（lineage-24.0 / A17 基线）对标锚点（#54 模块地图 · widgetpicker 模块）：
//   · CellLayout.java GridOccupancy —— 每格一布尔占用矩阵，widget 以 span 矩形占格，
//     落位校验 = 矩形全 0 才可放（canPlaceAt 同语义）
//   · WidgetSizes.java / WidgetsListAdapter —— widgetpicker 把每个可变规格 widget 的
//     全部 span 变体展开成独立条目（用户点选即该规格），本目录 CATALOG_VARIANTS 同构
//   · GridPositionAndSize（cellX/cellY/cellHSpan/cellVSpan）→ 本数据模型 slot/w/h
//     slot = cellY*cols + cellX（与 state.pagesApps 图标槽位同一坐标系）
//
// 模块纪律：零 DOM / 零 import —— vitest 直测纯函数（v851/v853 同惯例）。
// 数据模型独立于 state.pagesApps（存储键 ios-desktop:widget-board）：
//   桌面图标数据零侵入（拖拽/容量重排/文件夹逻辑不受 widget 影响），widget 层
//   与图标层同为格点租户，碰撞自愈避让（widget-board.js renderWidgetLayer）。

export const STORAGE_KEY = 'ios-desktop:widget-board';

/** 单 widget 跨页上限（Launcher3 Workspace 硬上限对齐，防溢出持久化爆炸） */
export const WIDGETS_MAX = 12;

/**
 * widget 目录（6 类起步，#67 执行要点原文）。
 * spans = 该类全部规格变体（[w,h]，widgetpicker 全变体展开语义）；
 * preview = 选择器 live 预览与落位卡的渲染 kind 名。
 */
export const WIDGET_CATALOG = [
  {
    kind: 'clock', name: '时钟', desc: '数字时钟与日期', icon: 'alarm',
    spans: [[4, 2], [2, 2]],
  },
  {
    kind: 'weather', name: '天气', desc: '实时天气概览', icon: 'weather_sunny',
    spans: [[2, 2], [2, 1]],
  },
  {
    kind: 'schedule', name: '日程', desc: '今日日程速览', icon: 'calendar_month',
    spans: [[4, 1], [2, 1]],
  },
  {
    kind: 'music', name: '音乐控制', desc: '正在播放与快捷控制', icon: 'music_note',
    spans: [[4, 2], [2, 2]],
  },
  {
    kind: 'battery', name: '电池', desc: '电量与充电状态', icon: 'battery_saver',
    spans: [[2, 1], [1, 1]],
  },
  {
    kind: 'shortcuts', name: '快捷指令', desc: '系统开关一键直达', icon: 'torch',
    spans: [[4, 1], [2, 1]],
  },
];

/** 目录快速索引 kind → 定义（未知 kind 一律 null，杜绝原型链穿透） */
export function resolveKind(kind) {
  if (typeof kind !== 'string') return null;
  return WIDGET_CATALOG.find((k) => k.kind === kind) || null;
}

/** kind 的首个（默认）规格 */
export function defaultSpanFor(kind) {
  const def = resolveKind(kind);
  return def ? [...def.spans[0]] : null;
}

/**
 * 规格变体存在性（widgetpicker 点选条目 = kind+span 联合寻址）。
 * @returns {boolean}
 */
export function variantOf(kind, w, h) {
  const def = resolveKind(kind);
  if (!def) return false;
  return def.spans.some(([sw, sh]) => sw === w && sh === h);
}

/**
 * 规格循环调整（「调整规格」入口语义）：在 spans 环上取 idx+1。
 * @returns {[number, number] | null} 下一规格（未知 kind / 单变体 → null）
 */
export function nextSpan(kind, w, h) {
  const def = resolveKind(kind);
  if (!def || def.spans.length < 2) return null;
  const idx = def.spans.findIndex(([sw, sh]) => sw === w && sh === h);
  if (idx === -1) return null;
  return [...def.spans[(idx + 1) % def.spans.length]];
}

/**
 * 规格钳制到当前网格容量内（跨档位 resize 后自愈的第一道闸）。
 * Launcher3 语义：span 超出 Workspace 网格时按格数截断（XmlParser 截断同构）。
 * @returns {[number, number]}
 */
export function clampSpan(w, h, cols, rows) {
  const cw = Math.max(1, Math.min(Number(w) || 1, cols));
  const ch = Math.max(1, Math.min(Number(h) || 1, rows));
  return [cw, ch];
}

/**
 * slot + 跨度 → 占用格索引列表（row*cols+col 展平，与图标 slot 同坐标系）。
 * Launcher3 CellLayout плитка：cellX=slot%cols, cellY=floor(slot/cols)。
 * @param {number} slot 左上格槽位
 * @param {number} w 宽跨度（列）
 * @param {number} h 高跨度（行）
 * @param {number} cols 网格列数
 * @returns {number[]} 占用的全部格索引
 */
export function cellsOf(slot, w, h, cols) {
  const s = Math.floor(Number(slot) || 0);
  const cw = Math.max(1, Math.floor(Number(w) || 1));
  const ch = Math.max(1, Math.floor(Number(h) || 1));
  const c = Math.max(1, Math.floor(Number(cols) || 1));
  const row0 = Math.floor(s / c);
  const col0 = s % c;
  const out = [];
  for (let dr = 0; dr < ch; dr++) {
    for (let dc = 0; dc < cw; dc++) {
      out.push((row0 + dr) * c + (col0 + dc));
    }
  }
  return out;
}

/**
 * GridOccupancy.canFitCell 同构：矩形全部格都在界内且未被占用。
 * @param {Set<number>} occupied 页面占用格集合（图标 1×1 + widget span 展开）
 * @param {number} slot 左上格槽位
 * @param {number} w @param {number} h 跨度
 * @param {number} cols @param {number} rows 网格规格
 * @returns {boolean}
 */
export function canPlaceAt(occupied, slot, w, h, cols, rows) {
  const s = Math.floor(Number(slot) || 0);
  const cw = Math.max(1, Math.floor(Number(w) || 1));
  const ch = Math.max(1, Math.floor(Number(h) || 1));
  const c = Math.max(1, Math.floor(Number(cols) || 1));
  const r = Math.max(1, Math.floor(Number(rows) || 1));
  const cells = cellsOf(s, cw, ch, c);
  // 越界：最后一行/列索引必须仍在网格内（span 矩形整体在界）
  const row0 = Math.floor(s / c);
  const col0 = s % c;
  if (row0 + ch > r || col0 + cw > c) return false;
  // 负槽位越界：row0/col0 负值必然产生负格索引
  return cells.every((cell) => cell >= 0 && !occupied.has(cell));
}

/**
 * 首个可放槽位扫描（Launcher3 first-fit 落位语义：页序 → 行优先 → 列序）。
 * @param {(Set<number> | null)[]} pagesOccupied 每页占用集合（null 页跳过）
 * @param {number} w @param {number} h 跨度 @param {number} cols @param {number} rows
 * @returns {{ page: number, slot: number } | null} null = 全部页面无处安放
 */
export function firstFreeSlot(pagesOccupied, w, h, cols, rows) {
  for (let page = 0; page < pagesOccupied.length; page++) {
    const occ = pagesOccupied[page];
    if (!occ) continue;
    const cap = cols * rows;
    for (let slot = 0; slot < cap; slot++) {
      if (canPlaceAt(occ, slot, w, h, cols, rows)) return { page, slot };
    }
  }
  return null;
}

/**
 * 页面占用集合构建：图标 1×1（state.pagesApps[page] 的 slot）+ widget span 展开。
 * 桌面网格容量以有效行列为准（effGridCols × effGridRows，slot ≥ 容量的越界图标
 * 按 Launcher3 重排兜底语义视为占用但无格——只按 slot<cap 收录，杜绝幽灵格）。
 * @param {{ slot: number }[]} pageItems 图标条目（1×1 租户）
 * @param {{ slot: number, w: number, h: number }[]} pageWidgets widget 条目（span 租户）
 * @param {number} cols @param {number} rows 网格规格
 * @returns {Set<number>}
 */
export function buildOccupancy(pageItems, pageWidgets, cols, rows) {
  const occ = new Set();
  const cap = Math.max(0, Math.floor(cols * rows));
  for (const item of pageItems || []) {
    const s = Math.floor(Number(item && item.slot) || 0);
    if (s >= 0 && s < cap) occ.add(s);
  }
  for (const wg of pageWidgets || []) {
    if (!wg) continue;
    for (const cell of cellsOf(wg.slot, wg.w, wg.h, cols)) {
      if (cell >= 0 && cell < cap) occ.add(cell);
    }
  }
  return occ;
}

/**
 * 持久化板读取 + 全量清洗（loadPagesApps 同款防御纪律）：
 * 非法条目丢弃（不整板作废——Launcher3 对损坏 db 只丢坏行）。
 * @param {Storage} [ls] 可注入存储（vitest / 真实 localStorage）
 * @returns {{ widgets: Array<{ id: string, kind: string, page: number, slot: number, w: number, h: number }> }}
 */
export function loadBoard(ls) {
  const store = ls || (typeof localStorage !== 'undefined' ? localStorage : null);
  const empty = { widgets: [] };
  if (!store) return empty;
  try {
    const raw = JSON.parse(store.getItem(STORAGE_KEY) || 'null');
    if (!raw || !Array.isArray(raw.widgets)) return empty;
    const widgets = [];
    const seenIds = new Set();
    for (const wg of raw.widgets) {
      if (!wg || typeof wg.id !== 'string' || !wg.id) continue;
      if (!resolveKind(wg.kind)) continue;
      const page = Math.floor(Number(wg.page));
      const slot = Math.floor(Number(wg.slot));
      const w = Math.floor(Number(wg.w));
      const h = Math.floor(Number(wg.h));
      if (!Number.isFinite(page) || page < 0) continue;
      if (!Number.isFinite(slot) || slot < 0) continue;
      if (!Number.isFinite(w) || w < 1 || !Number.isFinite(h) || h < 1) continue;
      if (seenIds.has(wg.id)) continue;
      seenIds.add(wg.id);
      widgets.push({ id: wg.id, kind: wg.kind, page, slot, w, h });
    }
    return { widgets: widgets.slice(0, WIDGETS_MAX) };
  } catch (e) {
    return empty;
  }
}

/**
 * 持久化板写入（形状压缩：只落五字段，隐私模式静默降级会话内有效）。
 * @param {Storage} [ls] @param {{ widgets: any[] }} board
 */
export function saveBoard(ls, board) {
  const store = ls || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return false;
  try {
    const widgets = (board && Array.isArray(board.widgets) ? board.widgets : [])
      .slice(0, WIDGETS_MAX)
      .map((wg) => ({ id: wg.id, kind: wg.kind, page: wg.page, slot: wg.slot, w: wg.w, h: wg.h }));
    store.setItem(STORAGE_KEY, JSON.stringify({ widgets }));
    return true;
  } catch (e) {
    return false;
  }
}

/** 新 widget id（kind 前缀 + 毫秒 + 计数，同板唯一） */
export function newWidgetId(kind) {
  return `widget-${kind}-${Date.now().toString(36)}-${(nextWidgetSeq++).toString(36)}`;
}
let nextWidgetSeq = 0;

/**
 * 图标拖拽/容量重排后的小工具自愈避让：widget 矩形与图标占用格冲突时，
 * 在同页 first-fit 迁移；同页无解则跨页扫描；全网无解返回 null（调用方移除或悬浮提示）。
 * Launcher3 语义：addInScreen 失败时 fallback 到空位搜索（Workspace.addPendingWidget）。
 * @param {Set<number>} iconOccupied 同页图标占用
 * @param {(Set<number> | null)[]} allPages 每页完整占用（含 widget 自身——调用方应先剔除自身）
 * @param {{ slot: number, w: number, h: number, page: number }} wg
 * @param {number} cols @param {number} rows
 * @returns {{ page: number, slot: number } | null}
 */
export function evictRelocate(iconOccupied, allPages, wg, cols, rows) {
  // 1) 原位仍合法（图标未侵占）→ 不动
  if (canPlaceAt(iconOccupied, wg.slot, wg.w, wg.h, cols, rows)) return null;
  // 2) 同页 first-fit（排除图标占用即可——同页其他 widget 占用含在 allPages，
  //    此处只对「与图标冲突」做迁移判定，widget 间冲突由放置时校验保证不产生）
  const cap = cols * rows;
  for (let slot = 0; slot < cap; slot++) {
    if (canPlaceAt(iconOccupied, slot, wg.w, wg.h, cols, rows)) return { page: wg.page, slot };
  }
  // 3) 跨页扫描（allPages 已含全部租户）
  const hit = firstFreeSlot(allPages, wg.w, wg.h, cols, rows);
  return hit ? { page: hit.page, slot: hit.slot } : null;
}
