// ==================== storage.js — IndexedDB 大容量本地存储 ====================
//
// 为什么需要它：
//   localStorage 只有约 5MB，且只能存文本 —— 大文件转 base64 还会额外膨胀 33%。
//   壁纸、字体这类文件动辄数 MB，塞进 localStorage 会静默失败（保存时报错被吞掉），
//   表现为「设置成功、刷新后丢失」。
//
// 方案：
//   大文件以原始 Blob 存入 IndexedDB（配额一般为磁盘可用空间的 60%，GB 级），
//   读取时用 URL.createObjectURL() 生成本地链接直接使用，无膨胀、无上限。
//
// 设计原则：
//   所有接口绝不抛异常 —— 存储失败一律返回 null/false，由调用方决定降级策略，
//   保证任何情况下都不阻塞桌面启动。

const DB_NAME = 'ios-desktop-files';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise = null;

/**
 * 打开（并复用）数据库连接。
 * @returns {Promise<IDBDatabase|null>} 不支持或打开失败时返回 null
 */
function openDB() {
  if (typeof indexedDB === 'undefined' || !indexedDB) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      let req;
      try {
        req = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (e) { resolve(null); return; }
      req.onupgradeneeded = () => {
        try {
          if (!req.result.objectStoreNames.contains(STORE)) {
            req.result.createObjectStore(STORE);
          }
        } catch (e) {}
      };
      req.onsuccess = () => {
        const db = req.result;
        // 其他标签页要求升级版本时主动让路，避免连接被永久阻塞
        db.onversionchange = () => { try { db.close(); } catch (e) {} };
        resolve(db);
      };
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    }).catch(() => null);
  }
  return dbPromise;
}

/** 当前环境是否支持 IndexedDB（不保证后续读写一定成功，仅作快速分支判断） */
export function idbAvailable() {
  return typeof indexedDB !== 'undefined' && !!indexedDB;
}

/**
 * 写入数据。value 可为 Blob / File / 字符串 / 结构化对象。
 * @returns {Promise<boolean>} true = 写入成功
 */
export async function idbSet(key, value) {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch (e) { resolve(false); }
  });
}

/**
 * 读取数据。键不存在时返回 null。
 * @returns {Promise<any>}
 */
export async function idbGet(key) {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}

/**
 * 删除数据。
 * @returns {Promise<boolean>}
 */
export async function idbDel(key) {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch (e) { resolve(false); }
  });
}

// ==================== 备份与恢复专用批量接口 ====================
//
// 供 data-backup.js 全量导出 / 导入使用：
//   - idbGetAllEntries：cursor 遍历 kv store 全部条目
//   - idbBulkPut       ：批量写回条目（恢复）
//   - idbClearStore    ：清空 store（恢复前覆盖旧数据）
// 与上方接口同样遵循「绝不抛异常」原则，失败一律 resolve 空数组 / false。

/**
 * 用 cursor 遍历 kv store，返回全部条目。
 * @returns {Promise<Array<{key: IDBValidKey, value: any}>>} 不支持或失败时返回 []
 */
export async function idbGetAllEntries() {
  const db = await openDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).openCursor();
      const entries = [];
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) { resolve(entries); return; }
        entries.push({ key: cursor.key, value: cursor.value });
        try { cursor.continue(); } catch (e) { resolve(entries); }
      };
      req.onerror = () => resolve(entries.length ? entries : []);
      tx.onerror = () => resolve(entries.length ? entries : []);
      tx.onabort = () => resolve(entries.length ? entries : []);
    } catch (e) { resolve([]); }
  });
}

/**
 * 批量写入条目（value, key 形式的 put）。
 * @param {Array<{key: IDBValidKey, value: any}>} entries
 * @returns {Promise<boolean>} true = 全部写入成功
 */
export async function idbBulkPut(entries) {
  const db = await openDB();
  if (!db || !Array.isArray(entries)) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const item of entries) {
        if (!item || typeof item.key === 'undefined' || item.key === null) continue;
        try { store.put(item.value, item.key); } catch (e) { resolve(false); return; }
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch (e) { resolve(false); }
  });
}

/**
 * 清空 kv store。
 * @returns {Promise<boolean>} true = 清空成功
 */
export async function idbClearStore() {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch (e) { resolve(false); }
  });
}
