// ==================== opfs.js — OPFS 私有文件系统引擎（v7.69 · 存储内核升级） ====================
//
// Origin Private File System（源私有文件系统）：
//   navigator.storage.getDirectory() 给出的浏览器级真实文件系统 ——
//   低延迟、流式写入（createWritable + ReadableStream.pipeTo，大文件零全量驻内存）、
//   真实配额（navigator.storage.estimate）、可申请持久化（persist）。
//
// 在本项目的角色（关键决策）：
//   作为 vfs.js 的「内容后端」——文件内容本体（Blob/字符串归一化后的 Blob）存 OPFS，
//   元数据（vfs-meta:）仍存 IndexedDB。理由：
//   · 索引装载/usage 统计/设置页逐键统计全部依赖 meta 键的全量游标扫描，IndexedDB
//     在这条链路上零改动即兼容（boot 快照、data-backup 元数据段原样保留）；
//   · 内容迁到 OPFS 换来流式写入与更低读延迟，且备份链路由 data-backup.js 的
//     opfs 段补齐（导出枚举 + 恢复回写）。
//
// 兼容矩阵（渐进增强，全程可降级）：
//   · Chrome 102+ / Edge 102+ / Firefox 111+ / Safari 16.4+：完整 OPFS 引擎
//   · Safari 15.2～16.3：有目录句柄但主线程无 createWritable → init 写探针失败
//     → 引擎判定不可用，回落 IndexedDB（现状路径）
//   · 不支持 navigator.storage.getDirectory（旧浏览器 / happy-dom 测试环境）：
//     同样回落 IndexedDB
//
// 设计原则（与 storage.js 完全一致）：
//   所有接口绝不抛异常 —— 失败一律返回 null/false/[]，由调用方决定降级策略。

/** VFS 内容专用 OPFS 目录名（与浏览器里其他 OPFS 使用者隔离，清场只动这里） */
export const OPFS_DIR_NAME = 'geek-vfs';

/** init 结果缓存：null = 未探测，false = 探测过且不可用，Promise = 目录句柄 */
let dirPromise = null;
let probed = false;

/**
 * OPFS 能力探测 + 目录句柄获取（结果进程内缓存）。
 * 探针是「真实写一遍」：有 getDirectoryHandle 但主线程缺 createWritable 的
 * Safari 15.x 会在这一步暴露，而不是等第一笔用户写入才失败。
 * @returns {Promise<FileSystemDirectoryHandle|null>} 不可用返回 null
 */
export function opfsDir() {
  if (dirPromise) return dirPromise;
  probed = true;
  dirPromise = (async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.getDirectory) return null;
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle(OPFS_DIR_NAME, { create: true });
      // 写探针：__probe 走完整 createWritable → write → close → removeEntry 链路
      const fh = await dir.getFileHandle('__probe', { create: true });
      const w = await fh.createWritable();
      await w.write(new Blob(['ok']));
      await w.close();
      await dir.removeEntry('__probe');
      return dir;
    } catch (e) {
      return null;
    }
  })();
  return dirPromise;
}

/** OPFS 引擎是否可用（未初始化时先触发探测；同步返回当前已知结论） */
export function opfsAvailable() {
  if (!probed) opfsDir();
  return dirPromise !== null && probed
    ? dirPromise.then((d) => !!d)
    : Promise.resolve(false);
}

// ==================== 路径 ↔ OPFS 文件名 ====================
// VFS 路径 'a/b.txt'（不带前导 /，与 meta 键一致）→ OPFS 文件名。
// encodeURIComponent 把 '/' 编码为 %2F，保证一棵树在扁平 OPFS 目录里零歧义。

export function pathToKey(path) {
  try { return encodeURIComponent(String(path)); } catch (e) { return null; }
}

export function keyToPath(key) {
  try { return decodeURIComponent(String(key)); } catch (e) { return null; }
}

/**
 * 写入内容（流式优先）。blob 必须是 Blob（调用方 vfs.write 已完成归一化）。
 * blob.stream().pipeTo(writable) 成功后自动关闭写入端；失败时管道中止，
 * 残文件由后续成功写入覆盖（VFS 写语义为整文件覆盖，无部分提交态暴露）。
 * @returns {Promise<boolean>}
 */
export async function opfsWrite(path, blob) {
  const dir = await opfsDir();
  const key = pathToKey(path);
  if (!dir || !key || !(typeof Blob !== 'undefined' && blob instanceof Blob)) return false;
  try {
    const fh = await dir.getFileHandle(key, { create: true });
    const w = await fh.createWritable();
    if (typeof blob.stream === 'function') {
      await blob.stream().pipeTo(w);
    } else {
      await w.write(blob);
      await w.close();
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 读取内容。文件不存在 / 引擎不可用返回 null。
 * @returns {Promise<Blob|null>}
 */
export async function opfsRead(path) {
  const dir = await opfsDir();
  const key = pathToKey(path);
  if (!dir || !key) return null;
  try {
    const fh = await dir.getFileHandle(key, { create: false });
    const file = await fh.getFile();
    return file;
  } catch (e) {
    return null; // NotFoundError 等一律归一化为 null
  }
}

/** 删除内容。返回是否确认删除成功；引擎不可用返回 false。 */
export async function opfsDel(path) {
  const dir = await opfsDir();
  const key = pathToKey(path);
  if (!dir || !key) return false;
  try {
    await dir.removeEntry(key);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 枚举目录下全部内容键（解码回 VFS 路径）。
 * @returns {Promise<string[]>} 失败/不可用返回 []
 */
export async function opfsList() {
  const dir = await opfsDir();
  if (!dir) return [];
  const out = [];
  try {
    for await (const [name, handle] of dir.entries()) {
      if (!handle || handle.kind !== 'file') continue;
      if (name === '__probe') continue;
      const p = keyToPath(name);
      if (p) out.push(p);
    }
  } catch (e) {
    return out; // 中途失败返回已收集部分（与 storage.js 部分结果语义一致）
  }
  return out;
}

/** 清空 VFS 专用目录（备份恢复清场用；只动 geek-vfs，不碰 OPFS 其他内容） */
export async function opfsClear() {
  const dir = await opfsDir();
  if (!dir) return false;
  try {
    const names = [];
    for await (const [name, handle] of dir.entries()) {
      if (handle && handle.kind === 'file') names.push(name);
    }
    let ok = true;
    for (const name of names) {
      try { await dir.removeEntry(name); } catch (e) { ok = false; }
    }
    return ok;
  } catch (e) {
    return false;
  }
}

// ==================== 配额与持久化（UI 直读） ====================

/**
 * 真实配额估算。usage 为已用字节（含 IndexedDB + Cache + OPFS 全体），
 * quota 为浏览器给本源的配额上限（一般为磁盘可用空间的一部分）。
 * @returns {Promise<{usage:number, quota:number}|null>}
 */
export async function opfsEstimate() {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) return null;
    const est = await navigator.storage.estimate();
    if (!est) return null;
    return { usage: est.usage || 0, quota: est.quota || 0 };
  } catch (e) {
    return null;
  }
}

/** 持久化授予状态（持久存储 = 浏览器承诺不自动清理本源数据）。不可用返回 null。 */
export async function opfsPersisted() {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persisted) return null;
    return !!await navigator.storage.persisted();
  } catch (e) {
    return null;
  }
}

/** 申请持久化存储（需用户手势语境；返回最终授予态，不可用返回 null） */
export async function opfsRequestPersist() {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) return null;
    return !!await navigator.storage.persist();
  } catch (e) {
    return null;
  }
}
