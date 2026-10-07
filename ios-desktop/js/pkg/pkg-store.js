// ==================== pkg-store.js — 安装包存储层（v7.52 IndexedDB + 内存回退） ====================
//
// 两个 Object Store：
//   - 'installed'（keyPath 'appId'）：已安装应用全量记录 —— 元数据 + 图标 + 包内全部文件（Blob）
//   - 'pending'   （keyPath 'key'） ：已导入待安装的压缩包 —— 原始 zip Blob + 导入期识别预览
//
// 设计要点：
//   - IndexedDB 是唯一持久层（Service Worker 同库直读 —— sw.js 按 appId 取文件响应 /pkg/<id>/**），
//     localStorage 存不下 Blob 且配额太小，主文档与 SW 也无法共享 localStorage；
//   - 环境无 indexedDB（单测 / 极旧内核）自动降级为内存 Map，API 完全同形，
//     usingFallback 标记供 UI 显示「重启后不保留」提示；
//   - 所有方法返回 Promise，失败 reject 原生错误（registry 层统一转 toast）。

const DB_NAME = 'md3-installer';
const DB_VERSION = 1;
const S_INSTALLED = 'installed';
const S_PENDING = 'pending';

/** 内存回退后端（indexedDB 不可用时启用） */
function createMemoryBackend() {
  const installed = new Map();
  const pending = new Map();
  return {
    usingFallback: true,
    async getAll(store) { return [...(store === S_INSTALLED ? installed : pending).values()]; },
    async get(store, key) { return (store === S_INSTALLED ? installed : pending).get(key); },
    async put(store, rec) { (store === S_INSTALLED ? installed : pending).set(rec.key || rec.appId, rec); },
    async del(store, key) { (store === S_INSTALLED ? installed : pending).delete(key); },
    async clear(store) { (store === S_INSTALLED ? installed : pending).clear(); },
  };
}

function createIdbBackend() {
  let dbPromise = null;

  function db() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains(S_INSTALLED)) d.createObjectStore(S_INSTALLED, { keyPath: 'appId' });
          if (!d.objectStoreNames.contains(S_PENDING)) d.createObjectStore(S_PENDING, { keyPath: 'key' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('IndexedDB 打开失败'));
        req.onblocked = () => reject(new Error('IndexedDB 被其他页面占用'));
      });
    }
    return dbPromise;
  }

  function tx(store, mode, fn) {
    return db().then((d) => new Promise((resolve, reject) => {
      const t = d.transaction(store, mode);
      const os = t.objectStore(store);
      let result;
      try { result = fn(os); } catch (e) { reject(e); return; }
      t.oncomplete = () => resolve(result && typeof result.result !== 'undefined' ? result.result : result);
      t.onerror = () => reject(t.error || new Error('IndexedDB 事务失败'));
      t.onabort = () => reject(t.error || new Error('IndexedDB 事务中止'));
    }));
  }

  const reqAsPromise = (req) => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB 请求失败'));
  });

  return {
    usingFallback: false,
    getAll(store) { return tx(store, 'readonly', (os) => reqAsPromise(os.getAll())); },
    get(store, key) { return tx(store, 'readonly', (os) => reqAsPromise(os.get(key))); },
    put(store, rec) { return tx(store, 'readwrite', (os) => reqAsPromise(os.put(rec))); },
    del(store, key) { return tx(store, 'readwrite', (os) => reqAsPromise(os.delete(key))); },
    clear(store) { return tx(store, 'readwrite', (os) => reqAsPromise(os.clear())); },
  };
}

let backend = null;
function be() {
  if (!backend) {
    try { backend = (typeof indexedDB !== 'undefined' && indexedDB) ? createIdbBackend() : createMemoryBackend(); }
    catch (e) { backend = createMemoryBackend(); }
  }
  return backend;
}

/** 测试注入：强制使用内存后端（单测环境无 indexedDB 时自动生效，无需调用） */
export function __forceMemoryBackendForTests() { backend = createMemoryBackend(); return backend; }
/** 测试注入：清空已选后端（恢复自动选择） */
export function __resetBackendForTests() { backend = null; }

export const pkgStore = {
  /** 是否运行在内存回退模式 */
  get usingFallback() { return be().usingFallback; },

  // ---------- 已安装 ----------
  listInstalled() { return be().getAll(S_INSTALLED); },
  getInstalled(appId) { return be().get(S_INSTALLED, appId); },
  putInstalled(record) {
    if (!record || !record.appId) return Promise.reject(new Error('putInstalled: 缺少 appId'));
    return be().put(S_INSTALLED, record);
  },
  delInstalled(appId) { return be().del(S_INSTALLED, appId); },

  // ---------- 待安装（已导入的压缩包） ----------
  listPending() { return be().getAll(S_PENDING); },
  getPending(key) { return be().get(S_PENDING, key); },
  putPending(record) {
    if (!record || !record.key) return Promise.reject(new Error('putPending: 缺少 key'));
    return be().put(S_PENDING, record);
  },
  delPending(key) { return be().del(S_PENDING, key); },
};
