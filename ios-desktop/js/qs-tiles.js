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

// #284 批18（v11.47）：调色板簇色彩数值出口依赖（argb 纯函数，无副作用；
// 与渲染层 DOM 紧耦合划界——本模块其余部分维持零 DOM 依赖章程不变）
import { argb } from './aosp/qs-tile-view.js';

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

// ==================== v9.94 #34：磁贴拖拽重排（A17 QPR2 QS customizer） ====================
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

// ==================== #284 批17（v11.47）：磁贴注册表常量簇单源（G1 表先行样例 · boundary-map §3.5 表首行） ====================
// 自 quick-settings.js L51-108 逐字节搬迁（唯一语义差异 = const → export const）；
// 本模块章程「只承载模型与判定（无 DOM 依赖）」兼容——三表为纯数据注册表：
//   · DEFAULT_ACTIVE_TILES —— 初始默认已激活磁贴 26 贴（A17 出厂激活族同量级，#321 考证在案）
//   · DEFAULT_AVAILABLE_CATEGORIES —— 编辑器可选池双分类（Accessibility / From system apps）
//   · ENV_DEPENDENT_TILES —— v9.94 #201 环境依赖磁贴清单（refreshState 广播目标——
//     飞行模式→射频链路四贴；省电模式→torch 受管 disabledByPolicy 通道）
// quick-settings.js 消费点（init 浅/深拷贝 L101-102 · 编辑器 reset 深拷贝 · 广播循环）零改动；
// TILE_LONG_CLICK_SHEET（宿主函数引用）留宿主；mdTilePalette 已于批18（v11.47）迁入本文件（§3.5 表次行兑现）。

// 初始默认已激活磁贴
export const DEFAULT_ACTIVE_TILES = [
  { id: 'internet', name: 'Internet', sub: '中国移动 5G Wi-Fi', iconKey: 'wifi', active: true },
  { id: 'bluetooth', name: 'Bluetooth', sub: 'Pixel Buds Pro', iconKey: 'bluetooth', active: true },
  { id: 'darktheme', name: 'Dark theme', sub: '深色模式', iconKey: 'darktheme', active: true },
  { id: 'torch', name: 'Torch', sub: '手电筒', iconKey: 'torch', active: false },
  { id: 'modes', name: 'Modes', sub: '勿扰模式', iconKey: 'modes', active: false },
  { id: 'focus', name: 'Focus', sub: '番茄钟 · 专注', iconKey: 'focus_mode', active: false },
  { id: 'profile', name: 'Profile', sub: '个人 / 工作模式', iconKey: 'person', active: false },
  { id: 'autorotate', name: 'Auto-rotate', sub: '自动旋转', iconKey: 'autorotate', active: true },
  { id: 'battery_saver', name: 'Battery Saver', sub: '省电模式', iconKey: 'battery_saver', active: false },
  { id: 'lock_screen', name: '锁屏', sub: '立即锁定屏幕', iconKey: 'lock', active: false },
  { id: 'qrcode', name: 'QR code', sub: '扫一扫', iconKey: 'qrcode', active: false },
  { id: 'screen_record', name: 'Screen record', sub: '屏幕录制', iconKey: 'screen_record', active: false },
  { id: 'wallet', name: 'Wallet', sub: '谷歌钱包', iconKey: 'wallet', active: false },
  { id: 'mic_access', name: 'Mic access', sub: '麦克风权限', iconKey: 'mic_access', active: true },
  { id: 'camera_access', name: 'Camera access', sub: '相机权限', iconKey: 'camera_access', active: true },
  { id: 'quick_share', name: 'Quick Share', sub: '快传服务', iconKey: 'quick_share', active: true },
  { id: 'cast', name: 'Cast', sub: '无线投屏', iconKey: 'cast', active: false },
  { id: 'alarm', name: 'Alarm', sub: '未设置闹钟', iconKey: 'alarm', active: false },
  { id: 'aeroplane', name: 'Aeroplane', sub: '飞行模式', iconKey: 'aeroplane', active: false },
];

export const DEFAULT_AVAILABLE_CATEGORIES = [
  {
    category: 'Accessibility / 无障碍辅助',
    tiles: [
      { id: 'colour_correction', name: 'Colour correction', sub: '色彩校正', iconKey: 'colour_correction' },
      { id: 'colour_inversion', name: 'Colour inversion', sub: '色彩反转', iconKey: 'colour_inversion' },
      { id: 'hearing_devices', name: 'Hearing devices', sub: '助听设备', iconKey: 'hearing_devices' },
      { id: 'one_handed', name: 'One-handed mode', sub: '单手模式', iconKey: 'one_handed' },
    ]
  },
  {
    category: 'From system apps / 系统功能',
    tiles: [
      { id: 'calculator', name: 'Calculator', sub: '计算器', iconKey: 'calculator' },
      { id: 'all_apps', name: 'All apps', sub: '应用抽屉', iconKey: 'apps_grid' },
      { id: 'focus_mode', name: 'Focus mode', sub: '专注模式', iconKey: 'focus_mode' },
      { id: 'live_caption', name: 'Live Caption', sub: '实时字幕', iconKey: 'live_caption' },
      { id: 'live_transcribe', name: 'Live Transcribe', sub: '实时转写', iconKey: 'live_transcribe' },
      { id: 'recorder', name: 'Recorder', sub: '录音机', iconKey: 'recorder' },
      { id: 'song_search', name: 'Song search', sub: '听歌识曲', iconKey: 'song_search' },
      { id: 'sound_notifications', name: 'Sound notifications', sub: '声音通知', iconKey: 'sound_notifications' },
      { id: 'storage', name: 'Storage', sub: '存储空间', iconKey: 'storage' },
      { id: 'vpn', name: 'VPN', sub: '虚拟网络', iconKey: 'vpn' },
    ]
  }
];

// v9.94 #201：环境依赖磁贴清单（refreshState 广播目标——飞行模式→射频链路四贴；
// 省电模式→torch 受管 disabledByPolicy 通道）
export const ENV_DEPENDENT_TILES = ['cast', 'quick_share', 'vpn', 'internet', 'torch'];

// ==================== #284 批18（v11.47）：mdTilePalette 调色板簇单源（boundary-map §3.5 表次行兑现） ====================
// 自 quick-settings.js L92-122 逐字节搬迁（唯一语义差异 = function → export function）；
// DOM 读防御性保留：getComputedStyle(document.body) try/catch → null（非 DOM 语境单测直调安全）；
// 色彩解析纯逻辑 + 一次性 DOM 读快照，无节点挂载/事件绑定——与渲染层 DOM 紧耦合定义划界。
// quick-settings.js 消费点（renderQuickSettingsGrid / refreshTilePill 双路径）经 import 零改动。

/** v9.94 #202：md token → 三态色板（getComputedStyle 解析，解析失败返回空表——
 *  色彩层合流由 CSS 类兜底，五通道精确值仅在 token 可解析时内联） */
export function mdTilePalette() {
  let cs;
  try { cs = getComputedStyle(document.body); } catch (e) { return null; }
  const cv = (n) => (cs.getPropertyValue(n) || '').trim();
  const parse = (s) => {
    if (!s) return null;
    if (s[0] === '#') {
      let h = s.slice(1);
      if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('');
      if (h.length < 6) return null;
      return argb(255, parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
    }
    const m = s.match(/rgba?\(([^)]+)\)/);
    const nums = m ? m[1].split(/[,\s\/]+/).filter(Boolean).map(Number) : s.split(/[\s,/]+/).filter(Boolean).map(Number);
    if (!nums || nums.length < 3 || nums.slice(0, 3).some((n) => Number.isNaN(n))) return null;
    const a = nums[3] === undefined ? 255 : (nums[3] <= 1 ? Math.round(nums[3] * 255) : Math.round(nums[3]));
    return argb(a, Math.round(nums[0]), Math.round(nums[1]), Math.round(nums[2]));
  };
  const p = {
    // shadeDisabled：md3 无 surface-variant 实体 → surface-container-lowest（最暗底面，
    // 禁用灰底视觉同构）；onShadeActiveVariant：md3 无 on-primary-variant 实体 →
    // on-primary 同值（副标签激活色降级一致，在录）
    shadeActive: parse(cv('--md-primary')), shadeInactive: parse(cv('--md-surface-container-high')),
    shadeDisabled: parse(cv('--md-surface-container-lowest')), onShadeActive: parse(cv('--md-on-primary')),
    onShadeInactive: parse(cv('--md-on-surface')), onShadeActiveVariant: parse(cv('--md-on-primary')),
    onShadeInactiveVariant: parse(cv('--md-on-surface-variant')), outline: parse(cv('--md-outline')),
  };
  return p.shadeActive == null ? null : p;
}
