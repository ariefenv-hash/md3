// ==================== vfs.js — 虚拟文件系统（批次三 · 数据层） ====================
//
// 目标（建议文档 · 第二档）：
//   给 29 个应用一个统一的「文件」抽象 —— 照片、录音、文档、下载不再各自为政，
//   而是写入一棵可浏览、可预览、可分享的虚拟目录树（/photos /music /documents …）。
//
// 存储选型（关键决策）：
//   复用 storage.js 的既有库 ios-desktop-files / kv（IndexedDB），不另开数据库 ——
//   这样设置 › 备份与恢复、开发者选项 › 恢复出厂、存储空间统计全部自动继承，零改动。
//   同一文件拆成两个键：
//     vfs:<path>       → 内容本体（Blob / 字符串）
//     vfs-meta:<path>  → 元数据 JSON { path, name, type, mime, size, created, modified, owner, meta }
//   拆分原因：data-backup.js 的序列化只识别「顶层 Blob」（data:...→base64），
//   若把 Blob 包在对象里会被 JSON.stringify 吞成 {} —— 拆开后内容键就是顶层 Blob，
//   备份/恢复链路原样兼容；元数据是纯 JSON，同样无忧。
//   （目录只有 meta 键，没有内容键；根 '/' 为虚拟目录，不落盘。）
//
// API 一览（全部异步、绝不抛异常，失败返回 {ok:false,error} / null / []）：
//   write(path, data, opts)  data: string(文本或 dataURL) | Blob | File | JSON 对象
//   read(path)               → { ...meta, blob?, text? } | null
//   readText(path) / readBlob(path) / readURL(path)（objectURL，删除时自动回收）
//   list(dir)                → [meta]（目录在前，字典序）
//   mkdir(path) / exists(path) / stat(path)
//   move(src, dst) / copy(src, dst)（目录递归）
//   del(path)                （目录递归删除）
//   subscribe(prefix, cb)    → 退订函数；cb({type:'write'|'delete'|'move', path, from?, to?, entry?})
//   usage()                  → { files, dirs, bytes, byDir: [{dir, files, bytes}] }
//   ready                    → Promise<VfsAPI>（索引装载 + 首次播种完成后 resolve）
//
// iframe 子应用桥接：
//   子应用经桌面注入的 window.__system.fs / __system.clipboard（见 main.js 注入脚本）
//   postMessage { type:'FS_REQUEST', requestId, op, args } 过来，这里处理后回
//   { type:'FS_RESULT', requestId, ok, data, error }。Blob 走结构化克隆直传，零拷贝编码。
//
// 调试入口：window.__vfs（控制台可直接 vfs.write('/documents/a.txt','hi')）

import { idbSet, idbGet, idbDel, idbGetAllEntries } from './storage.js';

// ==================== 常量 ====================

const K_CONTENT = 'vfs:';       // 内容键前缀
const K_META = 'vfs-meta:';     // 元数据键前缀
const SEED_FLAG = 'ios-desktop:vfs-seeded';

/** 常用扩展名 → MIME（readURL / 文件管理器图标判定用） */
const MIME_MAP = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac',
  txt: 'text/plain', md: 'text/markdown', json: 'application/json', csv: 'text/csv',
  html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript',
  pdf: 'application/pdf', zip: 'application/zip',
};

// ==================== 路径工具 ====================

/** 规范化路径：保证以 / 开头、消除 // 与 . / .. 段；根为 '/'；非法返回 null */
function normalizePath(p) {
  if (typeof p !== 'string') return null;
  let s = p.trim();
  if (!s) return null;
  if (!s.startsWith('/')) s = '/' + s;
  const out = [];
  for (const seg of s.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') { out.pop(); continue; }
    out.push(seg);
  }
  return '/' + out.join('/');
}

function parentOf(path) {
  const i = path.lastIndexOf('/');
  return i <= 0 ? '/' : path.slice(0, i);
}

function baseName(path) {
  const i = path.lastIndexOf('/');
  return i < 0 ? path : path.slice(i + 1);
}

function extOf(name) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

function mimeFromName(name) {
  return MIME_MAP[extOf(name)] || '';
}

/** 订阅前缀匹配：'/' 匹配一切；'/photos' 匹配自身与 '/photos/...' */
function underPrefix(prefix, path) {
  if (prefix === '/') return true;
  return path === prefix || path.startsWith(prefix + '/');
}

function isBlobLike(v) {
  try { return typeof Blob !== 'undefined' && v instanceof Blob; } catch (e) { return false; }
}

/** dataURL → Blob（fetch 优先，失败回退 atob 手工解码） */
async function dataUrlToBlob(dataUrl) {
  try {
    const r = await fetch(dataUrl);
    return await r.blob();
  } catch (e) { /* 继续走手工解码 */ }
  try {
    const comma = dataUrl.indexOf(',');
    const header = dataUrl.slice(0, comma);
    const b64 = dataUrl.slice(comma + 1);
    const mime = (/data:([^;,]+)/.exec(header) || [])[1] || 'application/octet-stream';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch (e) {
    return null;
  }
}

// ==================== 内存索引 ====================
// meta 键全量装载进 Map：list/stat/exists 全内存判定，无逐次 IDB 扫描；
// 写操作同时落 IDB 与索引，两者永远同步。

const index = new Map();          // path → meta 对象
const subscribers = new Map();    // prefix → Set<cb>
const urlCache = new Map();       // path → objectURL（del/move 时回收）

let readyResolve = null;
const readyPromise = new Promise((resolve) => { readyResolve = resolve; });

function notify(evt) {
  subscribers.forEach((set, prefix) => {
    if (!underPrefix(prefix, evt.path)) return;
    set.forEach((cb) => { try { cb(evt); } catch (e) { /* 订阅者异常不影响文件系统 */ } });
  });
}

function revokeURL(path) {
  const u = urlCache.get(path);
  if (u) { try { URL.revokeObjectURL(u); } catch (e) {} urlCache.delete(path); }
}

// ==================== 核心操作 ====================

/** 逐级确保祖先目录存在（mkdir -p 语义） */
async function mkdirp(dir) {
  if (!dir || dir === '/') return true;
  const parts = dir.split('/').filter(Boolean);
  let cur = '';
  for (const seg of parts) {
    cur += '/' + seg;
    if (index.get(cur)?.type === 'dir') continue;
    if (index.get(cur)?.type === 'file') return false; // 同名文件挡路
    const meta = { path: cur, name: seg, type: 'dir', mime: '', size: 0, created: Date.now(), modified: Date.now(), owner: '', meta: null };
    const ok = await idbSet(K_META + cur, meta);
    if (!ok) return false;
    index.set(cur, meta);
  }
  return true;
}

/**
 * 写入文件。data 支持：字符串（普通文本 / dataURL 自动转 Blob）/ Blob / File /
 * ArrayBuffer / 可 JSON 序列化对象（存为 JSON 文本）。
 * @returns {Promise<{ok:boolean, entry?:object, error?:string}>}
 */
async function write(path, data, opts = {}) {
  path = normalizePath(path);
  if (!path || path === '/') return { ok: false, error: '路径无效' };
  if (data === undefined || data === null) return { ok: false, error: '内容为空' };
  const existing = index.get(path);
  if (existing && existing.type === 'dir') return { ok: false, error: '同名目录已存在' };
  if (!(await mkdirp(parentOf(path)))) return { ok: false, error: '父目录创建失败' };

  // ---- 归一化内容 ----
  let content = data;
  let mime = opts.mime || '';
  let size = 0;
  try {
    if (typeof content === 'string' && /^data:[^,]{0,120},/i.test(content.slice(0, 140))) {
      const blob = await dataUrlToBlob(content);
      if (blob) { content = blob; }
    }
    if (isBlobLike(content)) {
      // fix(audit-D): 上一行 || 链已保证 mime 非空，删除恒不成立的 mime 补写死代码
      mime = mime || content.type || mimeFromName(baseName(path)) || 'application/octet-stream';
      size = content.size;
    } else if (content instanceof ArrayBuffer) {
      mime = mime || mimeFromName(baseName(path)) || 'application/octet-stream';
      size = content.byteLength;
      content = new Blob([content], { type: mime });
    } else if (typeof content !== 'string') {
      // 对象 → JSON 文本
      content = JSON.stringify(content, null, 2);
    }
    if (typeof content === 'string') {
      mime = mime || mimeFromName(baseName(path)) || 'text/plain';
      // fix(P3)：size 记录字节数而非字符数 —— CJK 字符 UTF-8 占 3 字节，
      // 旧实现按字符串 length 统计会把中低估值低估 2~3 倍，导致 usage()/存储页虚低
      size = new TextEncoder().encode(content).byteLength;
    }
  } catch (e) {
    return { ok: false, error: '内容处理失败：' + (e && e.message ? e.message : '未知错误') };
  }

  const meta = {
    path,
    name: baseName(path),
    type: 'file',
    mime,
    size,
    created: (existing && existing.created) || Date.now(),
    modified: Date.now(),
    owner: opts.owner || (existing && existing.owner) || '',
    meta: opts.meta || null,
  };

  const okC = await idbSet(K_CONTENT + path, content);
  if (!okC) return { ok: false, error: '写入失败（IndexedDB 不可用）' };
  // fix(P2)：meta 写入结果必须校验 —— 失败时不能把 meta 塞进内存索引，
  // 否则内存与落盘脱钩（重载后文件消失，运行期却一切正常，行为不一致）
  const okM = await idbSet(K_META + path, meta);
  if (!okM) return { ok: false, error: '写入失败（索引落盘不可用）' };
  revokeURL(path);
  index.set(path, meta);
  notify({ type: 'write', path, entry: meta });
  return { ok: true, entry: meta };
}

/** 读完整条目：{ ...meta, blob?, text? } */
async function read(path) {
  path = normalizePath(path);
  if (!path) return null;
  const meta = index.get(path);
  if (!meta || meta.type !== 'file') return null;
  const content = await idbGet(K_CONTENT + path);
  if (content === null) return null;
  if (typeof content === 'string') return { ...meta, blob: null, text: content };
  return { ...meta, blob: content, text: null };
}

async function readText(path) {
  const entry = await read(path);
  if (!entry) return null;
  if (entry.text !== null) return entry.text;
  try { return await entry.blob.text(); } catch (e) { return null; }
}

async function readBlob(path) {
  const entry = await read(path);
  if (!entry) return null;
  return entry.blob || new Blob([entry.text || ''], { type: entry.mime || 'text/plain' });
}

/** 生成 objectURL（缓存复用；del/move 时自动回收） */
async function readURL(path) {
  path = normalizePath(path);
  if (!path) return null;
  if (urlCache.has(path)) return urlCache.get(path);
  const blob = await readBlob(path);
  if (!blob) return null;
  try {
    const url = URL.createObjectURL(blob);
    urlCache.set(path, url);
    return url;
  } catch (e) { return null; }
}

/**
 * 列出目录的直接子项（目录在前，其余按名称排序）。
 * 目录不存在时返回 []（对调用方永远温和）。
 */
function list(dir) {
  const d = normalizePath(dir || '/');
  if (!d) return [];
  const out = [];
  index.forEach((meta) => {
    if (parentOf(meta.path) === d) out.push({ ...meta });
  });
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  });
  return out;
}

async function mkdir(path) {
  path = normalizePath(path);
  if (!path || path === '/') return { ok: false, error: '路径无效' };
  if (index.has(path)) return index.get(path).type === 'dir'
    ? { ok: true }
    : { ok: false, error: '同名文件已存在' };
  if (!(await mkdirp(path))) return { ok: false, error: '目录创建失败' };
  notify({ type: 'write', path, entry: index.get(path) });
  return { ok: true };
}

function exists(path) {
  const p = normalizePath(path);
  return !!p && index.has(p);
}

function stat(path) {
  const p = normalizePath(path);
  const m = p && index.get(p);
  return m ? { ...m } : null;
}

/** 递归删除（文件或目录）；返回删除条数 */
async function del(path) {
  path = normalizePath(path);
  if (!path || path === '/') return { ok: false, error: '根目录不可删除' };
  const victims = [];
  index.forEach((meta, p) => {
    if (p === path || p.startsWith(path + '/')) victims.push(p);
  });
  if (!victims.length) return { ok: true, removed: 0 };
  victims.sort((a, b) => b.length - a.length); // 先深后浅
  let removed = 0;
  for (const p of victims) {
    const meta = index.get(p);
    // fix(P2)：落盘删除结果校验 —— idbDel 失败（返回 false）时保留内存索引，
    // 避免「内存已删 / IndexedDB 仍存」的脱钩态（重载后文件诈尸）
    if (meta && meta.type === 'file') {
      const okC = await idbDel(K_CONTENT + p);
      if (!okC) continue;
    }
    const okM = await idbDel(K_META + p);
    if (!okM) continue;
    revokeURL(p);
    index.delete(p);
    removed++;
  }
  notify({ type: 'delete', path });
  return { ok: true, removed };
}

/** move / copy 共用：枚举受影响路径并按前缀重写（目录递归） */
async function transfer(src, dst, mode) {
  src = normalizePath(src); dst = normalizePath(dst);
  if (!src || !dst || src === '/') return { ok: false, error: '路径无效' };
  if (dst === src) return { ok: true };
  if (dst.startsWith(src + '/')) return { ok: false, error: '不能移动/复制到自身内部' };
  if (!index.has(src)) return { ok: false, error: '源不存在' };
  // 目标是已存在目录（含虚拟根 '/'）→ 移入其内部（语义同 mv src existing-dir/）
  // fix(audit-D): 根 '/' 也按目录解析 —— 此前 move(x,'/') 会把 meta 写到 '/' 污染根索引
  let realDst = dst;
  if (dst === '/' || index.get(dst)?.type === 'dir') realDst = (dst === '/' ? '' : dst) + '/' + baseName(src);
  // fix(audit-D) P1: 目标解析为源自身（如 move('/documents/b.txt','/documents')）时，
  // 原实现同键先 set 后 del 会把文件物理删除却仍返回 ok:true —— 视为 no-op 直接成功返回
  if (realDst === src) return { ok: true, to: src };
  // fix(audit-D) E1: 目标已存在同名文件时拒绝静默覆盖 —— 重命名/拖拽/子应用 move 直接覆盖会毁掉目标文件；
  // 文件管理器粘贴路径在调用前已用 (n) 序号改名（files.js 同名自动加序号逻辑），不受此分支影响
  if (index.get(realDst)?.type === 'file') return { ok: false, error: '目标已存在同名文件' };
  // fix(audit-D): 文件移到同名目录路径同样拒绝（否则目录条目被覆盖、子项变孤儿）
  if (index.get(realDst)?.type === 'dir' && index.get(src)?.type === 'file') return { ok: false, error: '目标已存在同名目录' };
  if (!(await mkdirp(parentOf(realDst)))) return { ok: false, error: '父目录创建失败' };

  const affected = [];
  index.forEach((meta, p) => {
    if (p === src || p.startsWith(src + '/')) affected.push(p);
  });

  for (const p of affected) {
    const np = realDst + p.slice(src.length);
    const meta = index.get(p);
    if (!meta) continue;
    if (meta.type === 'file') {
      const content = await idbGet(K_CONTENT + p);
      if (content !== null) await idbSet(K_CONTENT + np, content);
      if (mode !== 'copy' && content !== null) {
        // fix(audit-D) P1: 源内容键只在 move 模式删除 —— 此前 copy 模式也执行 del，复制即“剪切”
        await idbDel(K_CONTENT + p);
      }
      if (mode !== 'copy') revokeURL(p);
    }
    const nm = { ...meta, path: np, name: baseName(np), modified: mode === 'copy' ? meta.modified : Date.now() };
    await idbSet(K_META + np, nm);
    if (mode !== 'copy') {
      // fix(audit-D) P1: 源 meta 键与内存索引条目同样只在 move 模式移除（copy 不得删源）
      await idbDel(K_META + p);
      index.delete(p);
    }
    // fix(audit-D) P2: 目标路径若缓存过 objectURL（目录合并时覆盖已存在的同名旧文件），
    // 必须失效 —— 否则 readURL 一直返回旧文件的 blob URL
    revokeURL(np);
    index.set(np, nm);
  }

  if (mode === 'copy') {
    notify({ type: 'write', path: realDst });
  } else {
    // fix(audit-D) P2: move 事件按 from/to 双前缀分别通知 —— 此前只按源前缀匹配订阅者，
    // 移入目录时该目录的订阅者（如录音机订阅 /recordings）收不到任何通知；
    // 同一回调命中两个前缀时只通知一次，避免 '/' 订阅者收到重复事件
    const seen = new Set();
    const fireMove = (path) => {
      const evt = { type: 'move', path, from: src, to: realDst };
      subscribers.forEach((set, prefix) => {
        if (!underPrefix(prefix, path)) return;
        set.forEach((cb) => {
          if (seen.has(cb)) return;
          seen.add(cb);
          try { cb(evt); } catch (e) { /* 订阅者异常不影响文件系统 */ }
        });
      });
    };
    fireMove(src);
    fireMove(realDst);
  }
  return { ok: true, to: realDst };
}

function move(src, dst) { return transfer(src, dst, 'move'); }
function copy(src, dst) { return transfer(src, dst, 'copy'); }

/** 订阅变更（前缀匹配），返回退订函数 */
function subscribe(prefix, cb) {
  const p = normalizePath(prefix || '/');
  if (!p || typeof cb !== 'function') return () => {};
  if (!subscribers.has(p)) subscribers.set(p, new Set());
  subscribers.get(p).add(cb);
  return () => {
    const set = subscribers.get(p);
    if (set) { set.delete(cb); if (!set.size) subscribers.delete(p); }
  };
}

/** 用量统计：文件/目录数、总字节、按一级目录聚合 */
function usage() {
  let files = 0, dirs = 0, bytes = 0;
  const byDir = new Map();
  index.forEach((meta) => {
    if (meta.type === 'dir') { dirs++; return; }
    files++;
    bytes += meta.size || 0;
    const top = '/' + (meta.path.split('/').filter(Boolean)[0] || '');
    const rec = byDir.get(top) || { dir: top, files: 0, bytes: 0 };
    rec.files++;
    rec.bytes += meta.size || 0;
    byDir.set(top, rec);
  });
  return {
    files, dirs, bytes,
    byDir: Array.from(byDir.values()).sort((a, b) => b.bytes - a.bytes),
  };
}

/**
 * fix(audit-D): 清洗播种文件名 —— 相机胶卷条目名可能带 '/'、'\\'、纯点段（'.'/'..'）等
 * 路径成分，直接拼接会让文件越出 /photos 写到任意路径；统一替换/兜底后再落盘。
 */
function sanitizeSeedName(raw, seq) {
  let s = String(raw == null ? '' : raw).replace(/[\/\\]+/g, '_').trim();
  if (!s || /^\.+$/.test(s)) s = 'IMG_' + Date.now() + '_' + (seq + 1) + '.jpg';
  return s;
}

// ==================== 首次播种 ====================
// 首次启动：建标准目录树 + 写一份欢迎文档 + 把相机胶卷（localStorage dataURL）
// 导入 /photos —— 让文件管理器 / 相册开箱即有真实内容。

async function seedIfFirstBoot() {
  try {
    if (localStorage.getItem(SEED_FLAG)) return;
    await mkdir('/photos');
    await mkdir('/music');
    await mkdir('/recordings');
    await mkdir('/documents');
    await mkdir('/downloads');
    await write('/documents/欢迎使用文件.txt',
      '这是安卓16极客的虚拟文件系统（VFS）。\n\n' +
      '· 所有应用产生的照片、录音、文档都会出现在这里，可浏览、重命名、删除、分享。\n' +
      '· 顶部「导入文件」可以把电脑里的真实文件拖进模拟器；「下载」可以把文件导出回电脑。\n' +
      '· 数据保存在浏览器 IndexedDB，设置 › 备份与恢复 可整棵树导出 / 迁移。\n\n' +
      '—— 由桌面系统于 ' + new Date().toLocaleString('zh-CN') + ' 自动创建',
      { owner: 'files' });
    // 相机胶卷迁移：pixel_camera_gallery 里前 10 张 dataURL 图片 → /photos
    try {
      const raw = localStorage.getItem('pixel_camera_gallery');
      if (raw) {
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          let n = 0;
          for (const it of items) {
            if (n >= 10) break;
            const src = it && it.src;
            if (typeof src === 'string' && src.startsWith('data:image')) {
              const rawName = (typeof it.name === 'string' && it.name) || ('IMG_' + (it.id || Date.now() + n) + '.jpg');
              // fix(audit-D): 播种文件名先清洗（'/'、'..' 等），防止越出 /photos
              const name = sanitizeSeedName(rawName, n);
              await write('/photos/' + name, src, { owner: 'camera' });
              n++;
            }
          }
        }
      }
    } catch (e) { /* 胶卷损坏不阻塞播种 */ }
    try { localStorage.setItem(SEED_FLAG, '1'); } catch (e) {}
  } catch (e) { /* 播种失败不阻塞启动 */ }
}

// ==================== 启动：装载索引 → 播种 → 暴露 API ====================

async function boot() {
  // 全量扫一遍 kv store，把 vfs-meta: 键装进内存索引；孤儿内容键自愈补 meta
  const entries = await idbGetAllEntries();
  const contents = new Map();
  for (const item of entries) {
    const k = String(item.key || '');
    if (k.startsWith(K_META)) {
      const m = item.value;
      if (m && typeof m.path === 'string' && m.type) index.set(m.path, m);
    } else if (k.startsWith(K_CONTENT)) {
      contents.set(k.slice(K_CONTENT.length), item.value);
    }
  }
  // 自愈：有内容没 meta（理论上不应出现，例如旧版本中断写入）
  for (const [p, value] of contents) {
    if (index.has(p)) continue;
    const name = baseName(p);
    const size = isBlobLike(value) ? value.size : (typeof value === 'string' ? value.length : 0);
    const meta = {
      path: p, name, type: 'file',
      mime: (isBlobLike(value) && value.type) || mimeFromName(name) || 'application/octet-stream',
      size, created: Date.now(), modified: Date.now(), owner: '', meta: { healed: true },
    };
    await idbSet(K_META + p, meta);
    index.set(p, meta);
  }
  await seedIfFirstBoot();
  readyResolve(api);
  return api;
}

// ==================== iframe 子应用 FS 桥接 ====================

/** 反查消息来源所属应用 id（与 app-bus.js 同款逻辑，避免跨模块导出私有函数） */
function inferSenderAppId(sourceWindow) {
  if (!sourceWindow) return '';
  let found = '';
  document.querySelectorAll('.app-instance-wrapper, [data-bus-app-id]').forEach((el) => {
    if (found) return;
    el.querySelectorAll('iframe').forEach((iframe) => {
      try {
        if (iframe.contentWindow === sourceWindow) {
          found = el.getAttribute('data-bus-app-id') || (el.id || '').replace('app-instance-', '');
        }
      } catch (e) { /* 上下文销毁忽略 */ }
    });
  });
  return found;
}

function initFsBridge() {
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.type !== 'FS_REQUEST' || !d.requestId || typeof d.op !== 'string') return;
    if (e.source === window) return; // 忽略自身
    // fix(P2)：FS 桥来源校验 —— 旧实现无任何归因门控，任意可 postMessage 的上下文
    // （外部网页、已摘除 iframe 等）发 FS_REQUEST {op:'del'} 即可删除 '/photos' 等
    // 全树数据。现要求来源必须可归因到当前已挂载的应用 iframe；可归因应用沿用
    // 原有能力（写入路径记录 owner 元数据，供文件归属展示）。
    const owner = inferSenderAppId(e.source);
    const reply = (ok, data, error) => {
      try {
        e.source.postMessage({ type: 'FS_RESULT', requestId: d.requestId, ok: !!ok, data: data === undefined ? null : data, error: error || null }, '*');
      } catch (err) { /* 目标上下文已销毁 */ }
    };
    if (!owner) {
      reply(false, null, 'FS 桥拒绝：来源不是已挂载的应用 iframe');
      return;
    }

    (async () => {
      const a = d.args || {};
      switch (d.op) {
        case 'write': {
          const r = await write(a.path, a.data, { mime: a.mime, meta: a.meta, owner });
          reply(r.ok, r.entry || null, r.error);
          break;
        }
        case 'read': {
          const entry = await read(a.path);
          if (!entry) { reply(false, null, '文件不存在'); break; }
          // Blob 结构化克隆直传；文本直接给字符串
          reply(true, { meta: { path: entry.path, name: entry.name, mime: entry.mime, size: entry.size, modified: entry.modified }, blob: entry.blob, text: entry.text });
          break;
        }
        case 'url': {
          reply(true, { url: await readURL(a.path) });
          break;
        }
        case 'list': {
          reply(true, { entries: list(a.path) });
          break;
        }
        case 'mkdir': {
          const r = await mkdir(a.path);
          reply(r.ok, null, r.error);
          break;
        }
        case 'del': {
          const r = await del(a.path);
          reply(r.ok, { removed: r.removed || 0 }, r.error);
          break;
        }
        case 'move': {
          const r = await move(a.from || a.path, a.to);
          reply(r.ok, { to: r.to || null }, r.error);
          break;
        }
        case 'copy': {
          const r = await copy(a.from || a.path, a.to);
          reply(r.ok, { to: r.to || null }, r.error);
          break;
        }
        case 'exists': reply(true, { exists: exists(a.path) }); break;
        case 'stat': reply(true, { entry: stat(a.path) }); break;
        case 'usage': reply(true, usage()); break;
        default: reply(false, null, '未知操作: ' + d.op);
      }
    })().catch((err) => reply(false, null, (err && err.message) || '文件系统错误'));
  });
}

// ==================== 对外 API 与初始化入口 ====================

const api = {
  write, read, readText, readBlob, readURL,
  list, mkdir, exists, stat, del, move, copy, subscribe, usage,
  ready: readyPromise,
  normalize: normalizePath,
};

/** 由 main.js 调用：启动索引装载 + 注册子应用桥接 + 暴露调试入口 */
export function initVfs() {
  if (typeof window === 'undefined') return api;
  initFsBridge();
  boot();
  // 控制台调试 / 模块渲染型应用直连入口
  try {
    window.__vfs = api;
  } catch (e) { /* window 只读环境静默 */ }
  return api;
}
