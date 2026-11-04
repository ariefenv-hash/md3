// ==================== qs-tiles.js — Android 16 QPR1 可调磁贴尺寸·纯函数内核 ====================
//
// 1:1 复刻自 Android 16 QPR1 Quick Settings 官方行为（2025-05 Pixel 实测报道 + 参考图逐像素测量）：
//   · 磁贴两种尺寸：2×1 宽药丸（图标 + 标题 + 副标题） ↔ 1×1 横卧药丸（仅图标，文字标签移除）
//   · 网格：手机 4 列基准（宽药丸跨 2 格 = 一行 2 枚宽磁贴 / 4 枚 1×1），
//     ≥640px 平板 6 列（宽药丸一行 3 枚 / 1×1 一行 6 枚）
//     —— 参考图测量：9to5 官方图宽 405px ≈ 2×194+18；Droid Life 平板图宽 221px ≈ 2×105+10
//   · 出厂默认（9to5Google 实测）：新加入磁贴默认 1×1；Internet/Bluetooth/Modes 出厂 2×1
//   · 编辑模式：点选磁贴 → 右缘出现拖拽手柄；向左拖 = 缩为 1×1，向右拖 = 还原 2×1
//   · 尺寸随布局持久化（真实系统跨重启保留），撤销/重置走编辑历史快照
// 本模块只承载模型与判定（无 DOM 依赖），供 quick-settings.js 渲染层与
// tests/v762-android16-ui.test.js 直接驱动 —— 与 slider-geom.js 同款「纯函数守护」策略。

// 持久化键（与项目既有 localStorage 命名风格一致）
export const TILE_SIZE_KEY = 'ios-desktop:qs-tile-sizes';

/** 尺寸枚举 */
export const QS_TILE_SIZES = Object.freeze({ WIDE: 'wide', SMALL: 'small' });

/** 出厂默认尺寸表（v7.63 按参考图校准：双分区/主磁贴 2×1，其余 1×1；
 *  未入表的新磁贴一律 1×1 —— 9to5Google「When adding a new QS Tile, it's 1×1 by default」） */
export const FACTORY_TILE_SIZES = Object.freeze({
  internet: QS_TILE_SIZES.WIDE,
  bluetooth: QS_TILE_SIZES.WIDE,
  modes: QS_TILE_SIZES.WIDE,
  cast: QS_TILE_SIZES.WIDE,
});

/** 非法值回退 wide（历史存值容错；表中缺失条目的默认走 FACTORY_TILE_SIZES） */
export function normalizeSize(v) {
  return v === QS_TILE_SIZES.SMALL ? QS_TILE_SIZES.SMALL : QS_TILE_SIZES.WIDE;
}

/** 从存储读取尺寸表；损坏/缺失一律回退空表（全部默认 wide） */
export function loadTileSizes(storage) {
  try {
    const raw = storage && storage.getItem(TILE_SIZE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out = {};
    for (const k of Object.keys(parsed)) out[k] = normalizeSize(parsed[k]);
    return out;
  } catch (e) {
    return {};
  }
}

/** 尺寸表写盘（隐私模式等场景静默失败） */
export function saveTileSizes(map, storage) {
  try {
    storage && storage.setItem(TILE_SIZE_KEY, JSON.stringify(map || {}));
  } catch (e) { /* 忽略 */ }
}

/** 把尺寸表应用到磁贴数组（就地写 tile.size），并返回【纯映射表】（id → size）。
 *  v7.62 E2E 修复：旧实现返回 tiles 数组引用，调用方 tileSizes === activeTiles
 *  别名化，setTileSize 展开数组产出数字键脏表并写盘 —— 必须返回独立纯映射。
 *  v7.63：表中缺失的磁贴按出厂默认（FACTORY_TILE_SIZES 优先，否则 1×1）。 */
export function applyTileSizes(tiles, map) {
  const m = map && typeof map === 'object' ? map : {};
  const out = {};
  for (const t of tiles || []) {
    const raw = Object.prototype.hasOwnProperty.call(m, t.id)
      ? m[t.id]
      : (FACTORY_TILE_SIZES[t.id] || QS_TILE_SIZES.SMALL);
    t.size = normalizeSize(raw);
    out[t.id] = t.size;
  }
  return out;
}

/** 由磁贴数组反推尺寸表（撤销/重置后同步持久层用） */
export function sizesFromTiles(tiles) {
  const out = {};
  for (const t of tiles || []) out[t.id] = normalizeSize(t.size);
  return out;
}

/** 不可变设置单枚磁贴尺寸，返回新表 */
export function setTileSize(map, id, size) {
  return { ...(map || {}), [id]: normalizeSize(size) };
}

/**
 * 拖拽手柄位移 → 目标尺寸判定（Android 16：宽磁贴右缘手柄向左拖缩为 1×1，
 * 圆瓷贴向右拖还原 2×1；阈值 ±28px ≈ 半枚图标宽度，低于阈值视为误触不动）。
 * @returns {{ size: string, changed: boolean }}
 */
export function resizeFromDrag(currentSize, dx) {
  const cur = normalizeSize(currentSize);
  if (cur === QS_TILE_SIZES.WIDE && dx <= -28) {
    return { size: QS_TILE_SIZES.SMALL, changed: true };
  }
  if (cur === QS_TILE_SIZES.SMALL && dx >= 28) {
    return { size: QS_TILE_SIZES.WIDE, changed: true };
  }
  return { size: cur, changed: false };
}

/** 拖拽实时预览位移上限（|dx| 超过后视觉钳制，避免把瓷贴拖飞） */
export function clampPreviewDx(dx) {
  return Math.max(-44, Math.min(44, dx));
}

// ==================== v9.80 #34：磁贴拖拽重排（A17 QPR2 QS customizer） ====================
// 布局顺序单一持久化真源：ios-desktop:qs-tile-order（id 有序数组）。
// 语义对齐 AOSP QS customizer：顺序即布局（前插后让）；集合与顺序弱同步——
// order 未覆盖的磁贴按原相对序垫尾（增删后无需全量重写），order 中已不存在的
// id 剔除（防御脏数据）。编辑器增删/Reset/拖拽落位三处统一 saveTileOrder。

export const QS_TILE_ORDER_KEY = 'ios-desktop:qs-tile-order';

/** 读取持久化顺序（容错：非数组/含非字符串元素返回 null，由调用方回退出厂序） */
export function loadTileOrder(storage) {
  try {
    const raw = storage && storage.getItem(QS_TILE_ORDER_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.some((v) => typeof v !== 'string')) return null;
    return arr;
  } catch (e) { return null; }
}

/** 持久化顺序（storage 缺席时静默跳过——非浏览器语境单测直调） */
export function saveTileOrder(order, storage) {
  if (!Array.isArray(order)) return;
  try {
    if (storage && typeof storage.setItem === 'function') {
      storage.setItem(QS_TILE_ORDER_KEY, JSON.stringify(order));
    }
  } catch (e) { /* 隐私模式等存储失败静默 */ }
}

/**
 * 应用持久化顺序：order 中存在的 id 按序在前，未覆盖的按原相对序垫尾。
 * 返回新数组（不原地改，调用方拿到后整体赋回 activeTiles）。
 */
export function applyTileOrder(tiles, order) {
  if (!Array.isArray(tiles) || !Array.isArray(order) || order.length === 0) return tiles;
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const out = [];
  const seen = new Set();
  for (const id of order) {
    const t = byId.get(id);
    if (t && !seen.has(id)) { out.push(t); seen.add(id); }
  }
  for (const t of tiles) if (!seen.has(t.id)) out.push(t);
  return out;
}

/** 拖拽落位纯重排：fromIdx 拔出插入 toIdx（splice 语义，返回新数组不原地改） */
export function reorderTiles(tiles, fromIdx, toIdx) {
  if (!Array.isArray(tiles)) return tiles;
  const n = tiles.length;
  let from = Math.trunc(fromIdx), to = Math.trunc(toIdx);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || from >= n) return tiles;
  to = Math.max(0, Math.min(n - 1, to));
  const out = tiles.slice();
  const [moved] = out.splice(from, 1);
  out.splice(to, 0, moved);
  return out;
}
