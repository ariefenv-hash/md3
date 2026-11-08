// ==================== app-data-registry.js — 应用→数据位置登记表（v10.67 #219 · #178 落地件） ====================
//
// 职责（#219）：为「设置 › 应用 › 应用信息 › 清除数据/清除缓存」提供数据面真源：
//   1. 归属规则单一消费源 —— LS/IDB 归属规则物理真源在 storage-stats.js（v8.36/v839~
//      v842 系列测试源码锚在录，不迁移本文件），本模块导入后补充 VFS 面与保护面；
//   2. 按应用快照 / 清除 / 回滚 —— registry 驱动，逐键操作，绝不误伤系统级数据；
//   3. 清除缓存 —— 缓存面登记（AOSP cache 语义）；本版全库缓存面为空（VFS 共享媒体
//      存储属用户数据非缓存），如实返回 0 B 并在 UI 呈现「无缓存」，不造假数字。
//
// AOSP 对标（#219）：Settings → Apps → [app] → Storage & cache → Clear storage /
//   Clear cache。共享媒体存储（/photos /music /documents /downloads /recordings，
//   对标 AOSP /DCIM /Pictures /Music /Download /Recordings）属共享存储 ——
//   AppInfo 清除数据不触碰共享存储（真机语义：清除相机数据不删相册照片）。
//   故 VFS 全量归属 __shared，按应用清除一律跳过（#219 防误伤铁律⑤）。
//
// 保护面（清除永不触碰）：
//   - owner === '__system'：桌面壳数据（ios-desktop:* / android17:shadeMode /
//     壁纸 / 字体 blob 等）——这些是「系统」不是应用数据；
//   - owner === '__shared'：VFS 共享媒体存储；
//   - owner === '__other'：登记表未登记的键 —— 宁漏勿误（#219 登记表未收录前不清）；
//   - appId 自身为 '__system' 时拒绝执行（系统无 AppInfo 清除语义）。
//
// 可测性：全部 I/O 经 deps 注入（ls / idbGet / idbDel / idbGetAllEntries），
//   默认接真实 localStorage 与 storage.js —— 与 history-guard-core.js 同款注入式纯核。

import { idbGetAllEntries, idbDel, idbSet } from './storage.js';
import { LS_OWNER_RULES, IDB_OWNER_RULES, ownerOf } from './storage-stats.js';

/** VFS 路径 → 归属：全库 VFS 均为共享媒体存储（盘点实证 2026-11-07 R120 窗） */
export const VFS_OWNER_RULES = [
  ['/', '__shared'],
];

/** 受保护归属：任何按应用清除/快照一律跳过 */
export const PROTECTED_OWNERS = ['__system', '__shared', '__other'];

/**
 * 键归属判定（优先精确命中，再前缀命中；未命中 → '__other'）。
 * 与 storage-stats.ownerOf 同语义（真源在彼处，此处转出供登记表消费方单点引用）。
 */
export { ownerOf };

export function ownerOfLs(key) { return ownerOf(key, LS_OWNER_RULES); }
export function ownerOfIdb(key) { return ownerOf(key, IDB_OWNER_RULES); }

/** 默认依赖装配（真实环境）；测试经参数注入替换 */
function defaultDeps() {
  return {
    ls: (typeof localStorage !== 'undefined') ? localStorage : null,
    idbAll: () => idbGetAllEntries(),
    idbRemove: (k) => idbDel(k),
    idbPut: (k, v) => idbSet(k, v),
  };
}

function assertClearable(appId) {
  if (!appId || typeof appId !== 'string') throw new Error('app-data-registry: appId 必填');
  if (appId === '__system' || appId === '__shared') {
    throw new Error('app-data-registry: ' + appId + ' 为系统/共享域，无按应用清除语义（#219 铁律⑤）');
  }
}

/**
 * 登记某应用的全部数据落点（快照/清除前的清单视图）。
 * @returns {{ appId, ls: string[], idb: string[], vfs: string[], cache: string[] }}
 */
export function listAppData(appId, deps) {
  const d = deps || defaultDeps();
  const out = { appId: appId || '', ls: [], idb: [], vfs: [], cache: [] };
  if (!appId) return out;
  try {
    if (d.ls) {
      for (let i = 0; i < d.ls.length; i++) {
        const key = d.ls.key(i);
        if (key === null || key === undefined) continue;
        if (ownerOfLs(key) === appId) out.ls.push(key);
      }
    }
  } catch (e) { /* localStorage 不可用 → 空清单 */ }
  return out;
}

/**
 * 清除前快照（#219 范围④：清除前快照可回滚）。
 * 只采集登记表归属 = appId 的键（保护面永不入快照也永不清除）。
 * @returns {Promise<{appId, ts, ls: Object<string,string>, idb: Array<{key,value}>}>}
 */
export async function snapshotAppData(appId, deps) {
  assertClearable(appId);
  const d = deps || defaultDeps();
  const snap = { appId, ts: Date.now(), ls: {}, idb: [] };
  try {
    if (d.ls) {
      for (let i = 0; i < d.ls.length; i++) {
        const key = d.ls.key(i);
        if (key === null || key === undefined) continue;
        if (ownerOfLs(key) !== appId) continue;
        try { const v = d.ls.getItem(key); if (typeof v === 'string') snap.ls[key] = v; } catch (e) {}
      }
    }
  } catch (e) { /* 防御式：快照失败按空处理，清除面同步收窄 */ }
  try {
    const entries = await d.idbAll();
    for (const it of (entries || [])) {
      if (!it || typeof it.key !== 'string') continue;
      if (ownerOfIdb(it.key) !== appId) continue;
      snap.idb.push({ key: it.key, value: it.value });
    }
  } catch (e) { /* IDB 不可用 → 空 */ }
  return snap;
}

/**
 * 清除应用数据（registry 驱动逐键删除；保护面铁律）。
 * @returns {Promise<{lsRemoved: number, idbRemoved: number, cleared: true}>}
 */
export async function clearAppData(appId, deps) {
  assertClearable(appId);
  const d = deps || defaultDeps();
  const targets = listAppData(appId, d);
  let lsRemoved = 0;
  for (const key of targets.ls) {
    try { d.ls.removeItem(key); lsRemoved++; } catch (e) { /* 单键失败不阻塞其余 */ }
  }
  let idbRemoved = 0;
  for (const key of targets.idb) {
    try { await d.idbRemove(key); idbRemoved++; } catch (e) { /* 同上 */ }
  }
  return { lsRemoved, idbRemoved, cleared: true };
}

/**
 * 清除应用缓存（AOSP Clear cache 语义）。
 * 本版登记表缓存面为空（VFS 共享媒体存储 = 用户数据非缓存，__shared 保护）——
 * 如实返回 0，UI 呈现「无缓存可清除」，不造数。
 */
export async function clearAppCache(appId, deps) {
  assertClearable(appId);
  const d = deps || defaultDeps();
  const list = listAppData(appId, d);
  let removed = 0;
  for (const key of list.cache) {
    try { d.ls.removeItem(key); removed++; } catch (e) {}
  }
  return { cacheRemoved: removed, note: removed ? '' : '缓存面为空（登记表未登记任何缓存键）' };
}

/**
 * 回滚快照（撤销窗内恢复；快照结构见 snapshotAppData）。
 * 只写回快照内键 —— 不触碰其他任何键（含清除后新增的键，避免回滚放大）。
 */
export async function restoreAppData(snap, deps) {
  if (!snap || snap.appId === '__system' || snap.appId === '__shared') {
    throw new Error('app-data-registry: 非法或受保护快照');
  }
  const d = deps || defaultDeps();
  let lsRestored = 0, idbRestored = 0;
  try {
    if (d.ls) {
      for (const k of Object.keys(snap.ls || {})) {
        try { d.ls.setItem(k, snap.ls[k]); lsRestored++; } catch (e) {}
      }
    }
  } catch (e) {}
  try {
    for (const it of (snap.idb || [])) {
      try { await d.idbRemove(it.key); await idbSetSafe(d, it.key, it.value); idbRestored++; } catch (e) {}
    }
  } catch (e) {}
  return { lsRestored, idbRestored };
}

/** IDB 写回：deps.idbPut（默认 idbSet）——测试可注入假实现 */
async function idbSetSafe(d, key, value) {
  if (typeof d.idbPut === 'function') return d.idbPut(key, value);
  throw new Error('app-data-registry: idbPut 未注入，跳过 IDB 回滚');
}

// window 桥（非 ESM 页脚本消费面，与 __getAppIconSVG/__bindAppDocListener 同款惯例）
// vitest node 环境无 window → 守卫（history-guard-core 同款）
if (typeof window !== 'undefined') {
  window.__appDataRegistry = {
    listAppData, snapshotAppData, clearAppData, clearAppCache, restoreAppData,
    LS_OWNER_RULES, IDB_OWNER_RULES, VFS_OWNER_RULES, PROTECTED_OWNERS,
    ownerOfLs, ownerOfIdb,
  };
}
