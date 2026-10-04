// ==================== storage-stats.js — 存储占用统计（批次二·真设置） ====================
//
// 为设置 › 存储空间占用 页提供数据：
//   1. localStorage 逐键统计（key + value 的 UTF-16 字节数近似，×2 字节/字符）
//   2. IndexedDB 实际占用（navigator.storage.estimate 的 usage/quota）
//      + 逐条目体积（Blob 取 .size，其余按 JSON 序列化长度近似）
//   3. 按应用归属聚合：已知键名 → 所属应用；未知键 → 系统
//
// 所有接口绝不抛异常，失败返回空数据，绝不阻塞设置页渲染。

import { idbAvailable, idbGetAllEntries } from './storage.js';

/** 已知 localStorage 键 → 应用归属（与各子应用实际写入键一一核对过） */
const LS_OWNER_RULES = [
  ['ios-desktop:', '__system'],
  ['memos', 'notes'],
  ['md3_groups', 'reminders'],
  ['md3_tasks', 'reminders'],
  ['flow11_best', 'flow11'],
  ['android_clock_state', 'clock_app'],
  ['pixel_camera_gallery', 'camera'],
  ['translationHistory', 'translate'],
  ['theme', 'translate'],
  ['visited', 'translate'],
  ['threes_hi', 'threes'],
  ['threes_records', 'threes'],
  ['dice_lab_stats', 'dice'],
  ['m3-theme', 'threes'],
];

/** 已知 IndexedDB 键 → 归属 */
const IDB_OWNER_RULES = [
  ['wallpaper-blob', '__system'],
  ['font-blob', '__system'],
  ['font-name', '__system'],
  ['wallpaper-video-blob', '__system'],
  ['ios-desktop:wallpaper', '__system'],
  ['ios-desktop:font', '__system'],
  ['ios-desktop:font-name', '__system'],
  ['vfs:', 'files'],        // 批次三：VFS 内容键（Blob 主体）
  ['vfs-meta:', 'files'],   // 批次三：VFS 元数据键
];

/** 字符串近似字节（UTF-16：每字符 2 字节；仅用于占比展示，非精确配额） */
function strBytes(s) { return (s || '').length * 2; }

function ownerOf(key, rules) {
  const k = String(key || '');
  for (const [prefix, owner] of rules) {
    if (k === prefix || k.startsWith(prefix)) return owner;
  }
  return '__other';
}

/** 单条目体积：Blob/File 直接取 size，其余 JSON 序列化长度近似 */
function entryBytes(value) {
  if (value == null) return 0;
  if (typeof value === 'object' && typeof value.size === 'number' && typeof value.type === 'string') return value.size;
  try { return strBytes(JSON.stringify(value)); } catch (e) { return 0; }
}

export function formatBytes(bytes) {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * 采集全部存储统计（异步）。
 * @returns {Promise<{
 *   ls: { total: number, keys: number, items: Array<{key,bytes,owner}> },
 *   idb: { available: boolean, usage: number, quota: number, entries: Array<{key,bytes,owner}> },
 *   byOwner: Array<{owner, bytes}>  // localStorage + IndexedDB 按归属聚合（降序）
 * }>}
 */
export async function collectStorageStats() {
  // ---- 1) localStorage 逐键 ----
  const lsItems = [];
  let lsTotal = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === null) continue;
      const bytes = strBytes(key) + strBytes(localStorage.getItem(key));
      lsTotal += bytes;
      lsItems.push({ key, bytes, owner: ownerOf(key, LS_OWNER_RULES) });
    }
  } catch (e) {}
  lsItems.sort((a, b) => b.bytes - a.bytes);

  // ---- 2) IndexedDB 逐条目 + 配额 ----
  const idbEntries = [];
  let usage = 0, quota = 0;
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      usage = est.usage || 0;
      quota = est.quota || 0;
    }
  } catch (e) {}
  if (idbAvailable()) {
    const entries = await idbGetAllEntries();
    for (const item of entries) {
      const bytes = entryBytes(item.value);
      idbEntries.push({ key: String(item.key), bytes, owner: ownerOf(item.key, IDB_OWNER_RULES) });
    }
    idbEntries.sort((a, b) => b.bytes - a.bytes);
  }

  // ---- 3) 按归属聚合 ----
  const ownerMap = new Map();
  const add = (owner, bytes) => ownerMap.set(owner, (ownerMap.get(owner) || 0) + bytes);
  lsItems.forEach((it) => add(it.owner, it.bytes));
  idbEntries.forEach((it) => add(it.owner, it.bytes));
  const byOwner = Array.from(ownerMap.entries())
    .map(([owner, bytes]) => ({ owner, bytes }))
    .sort((a, b) => b.bytes - a.bytes);

  return {
    ls: { total: lsTotal, keys: lsItems.length, items: lsItems },
    idb: { available: idbAvailable(), usage, quota, entries: idbEntries },
    byOwner,
  };
}

/** 归属 id → 展示名（系统/未知特判，其余查 initialApps，找不到就显示原 id） */
export function ownerDisplayName(owner) {
  if (owner === '__system') return '系统服务';
  if (owner === '__other') return '其他数据';
  try {
    // 惰性动态 import，避免与其他模块产生新的静态依赖边
    const mod = window.__initialAppsRef;
    if (mod && Array.isArray(mod)) {
      const app = mod.find((a) => a.id === owner);
      if (app) return app.name;
    }
  } catch (e) {}
  return owner;
}

/** 初始化：把应用注册表引用交给本模块（由 main.js 调用，规避静态循环依赖） */
export function initStorageStats(appsRegistry) {
  try { window.__initialAppsRef = appsRegistry || null; } catch (e) {}
  window.__storageStats = { collect: collectStorageStats, formatBytes, ownerDisplayName };
}
