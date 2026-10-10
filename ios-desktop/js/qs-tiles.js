// ==================== qs-tiles.js — Android 16 QPR1 可调磁贴尺寸·纯函数内核 ====================
//
// 1:1 复刻自 Android 16 QPR1 Quick Settings 官方行为（2025-05 Pixel 实测报道）：
//   · 磁贴两种尺寸：2×1 宽药丸（图标 + 标题 + 副标题） ↔ 1×1 圆形瓷贴（仅图标，文字标签移除）
//   · 编辑模式：点选磁贴 → 右缘出现拖拽手柄；向左拖 = 缩为 1×1，向右拖 = 还原 2×1
//   · 尺寸随布局持久化（真实系统跨重启保留），撤销/重置走编辑历史快照
// 本模块只承载模型与判定（无 DOM 依赖），供 quick-settings.js 渲染层与
// tests/v762-android16-ui.test.js 直接驱动 —— 与 slider-geom.js 同款「纯函数守护」策略。

// 持久化键（与项目既有 localStorage 命名风格一致）
export const TILE_SIZE_KEY = 'ios-desktop:qs-tile-sizes';

/** 尺寸枚举 */
export const QS_TILE_SIZES = Object.freeze({ WIDE: 'wide', SMALL: 'small' });

/** 非法值回退 wide（2×1 是默认出厂尺寸） */
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
 *  别名化，setTileSize 展开数组产出数字键脏表并写盘 —— 必须返回独立纯映射。 */
export function applyTileSizes(tiles, map) {
  const m = map && typeof map === 'object' ? map : {};
  const out = {};
  for (const t of tiles || []) {
    t.size = normalizeSize(m[t.id]);
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
