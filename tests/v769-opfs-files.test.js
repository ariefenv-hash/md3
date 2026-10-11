// ==================== v769-opfs-files.test.js — OPFS 存储引擎 + 文件应用 UI 全面增强 ====================
//
// 用户需求：「全面增强文件应用的ui，可以尝试使用opfs方案」
//
// 交付面：
//   A. opfs.js —— OPFS 私有文件系统引擎（真实写探针/流式写入/编码/清场/estimate/persist）
//   B. vfs.js  —— OPFS 内容后端（meta 恒走 IDB）+ boot 迁移 + 读回落 + engine()/estimate() 面
//   C. data-backup.js —— 备份/恢复纳入 OPFS 内容段（导出枚举 base64 + 恢复清场回写）
//   D. files.js / files-app.css —— 存储卡引擎徽章+配额条+持久存储、面包屑、目录行元信息、
//      tab 共享轴、stagger、导入进度、文本复制、网格目录徽标
//   E. 运行时（in-memory OPFS mock + storage.js mock）—— 引擎上场/降级/迁移/孤儿清扫/
//      双删/搬运/读回落/配额与持久化

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

const opfsJs = src('ios-desktop/js/opfs.js');
const vfsJs = src('ios-desktop/js/vfs.js');
const backupJs = src('ios-desktop/js/data-backup.js');
const filesJs = src('ios-desktop/js/apps/files.js');
const filesCss = src('ios-desktop/css/files-app.css');
const swJs = src('sw.js');

// ==================== A. opfs.js 源码锚定 ====================
describe('v7.69 · A opfs.js 引擎（源码锚定）', () => {
  test('常量与导出面：专用目录 geek-vfs + 全套 fail-soft API', () => {
    expect(opfsJs).toContain("export const OPFS_DIR_NAME = 'geek-vfs';");
    expect(opfsJs).toContain('export function opfsDir()');
    expect(opfsJs).toContain('export function opfsAvailable()');
    expect(opfsJs).toContain('export function pathToKey(path)');
    expect(opfsJs).toContain('export function keyToPath(key)');
    expect(opfsJs).toContain('export async function opfsWrite(path, blob)');
    expect(opfsJs).toContain('export async function opfsRead(path)');
    expect(opfsJs).toContain('export async function opfsDel(path)');
    expect(opfsJs).toContain('export async function opfsList()');
    expect(opfsJs).toContain('export async function opfsClear()');
    expect(opfsJs).toContain('export async function opfsEstimate()');
    expect(opfsJs).toContain('export async function opfsPersisted()');
    expect(opfsJs).toContain('export async function opfsRequestPersist()');
  });

  test('真实写探针：getDirectory → 目录句柄 → __probe 完整 createWritable→write→close→removeEntry 链', () => {
    expect(opfsJs).toContain('navigator.storage.getDirectory()');
    expect(opfsJs).toContain("root.getDirectoryHandle(OPFS_DIR_NAME, { create: true })");
    expect(opfsJs).toContain("dir.getFileHandle('__probe', { create: true })");
    expect(opfsJs).toContain('const w = await fh.createWritable();');
    expect(opfsJs).toContain("await w.write(new Blob(['ok']));");
    expect(opfsJs).toContain('await w.close();');
    expect(opfsJs).toContain("await dir.removeEntry('__probe');");
    // 探针失败 → 引擎判定不可用（Safari 15.x 有目录无主线程 createWritable 的场景在此暴露）
    expect(opfsJs).toContain('} catch (e) {\n      return null;\n    }');
  });

  test('流式写入：blob.stream().pipeTo 优先，无 stream 回落 write+close（大文件零全量驻内存）', () => {
    expect(opfsJs).toContain('if (typeof blob.stream === \'function\') {\n      await blob.stream().pipeTo(w);\n    } else {\n      await w.write(blob);\n      await w.close();\n    }');
  });

  test('路径编码：encodeURIComponent 扁平化整棵树（/ → %2F），读侧 decodeURIComponent 反解', () => {
    expect(opfsJs).toContain('return encodeURIComponent(String(path));');
    expect(opfsJs).toContain('return decodeURIComponent(String(key));');
  });

  test('枚举/清场：entries() 异步迭代只收文件、跳过 __probe、清场只动 geek-vfs 专用目录', () => {
    expect(opfsJs).toContain('for await (const [name, handle] of dir.entries())');
    expect(opfsJs).toContain("if (name === '__probe') continue;");
    expect(opfsJs).toContain('if (handle && handle.kind === \'file\') names.push(name);');
  });

  test('配额/持久化：estimate 用真实 usage/quota；persist 为用户手势申请且返回最终授予态', () => {
    expect(opfsJs).toContain('navigator.storage.estimate');
    expect(opfsJs).toContain('return { usage: est.usage || 0, quota: est.quota || 0 };');
    expect(opfsJs).toContain('navigator.storage.persisted');
    expect(opfsJs).toContain('navigator.storage.persist()');
  });
});

// ==================== B. vfs.js 源码锚定 ====================
describe('v7.69 · B vfs.js OPFS 内容后端（源码锚定）', () => {
  test('引擎引入与状态位：opfs.js 函数导入 + contentEngine 双态', () => {
    expect(vfsJs).toContain("import {\n  opfsDir, opfsWrite, opfsRead, opfsDel, opfsList,\n  opfsEstimate, opfsPersisted, opfsRequestPersist,\n} from './opfs.js';");
    expect(vfsJs).toContain("let contentEngine = 'idb';");
  });

  test('boot 首步定引擎：探测（含写探针）失败自动回落 IndexedDB，boot 内写入直走最终引擎', () => {
    expect(vfsJs).toContain("contentEngine = dir ? 'opfs' : 'idb';");
    expect(vfsJs).toContain("if (contentEngine === 'opfs') {\n    if (contents.size) await migrateContentsToOpfs(contents);\n    await sweepOpfsOrphans();\n  }");
  });

  test('双引擎写入：OPFS 引擎字符串包 Blob 流式写；OPFS 失败回落 IDB（绝不让写凭空失败）', () => {
    expect(vfsJs).toContain("if (typeof content === 'string') blob = new Blob([content], { type: mime || 'text/plain' });");
    expect(vfsJs).toContain('okC = await opfsWrite(path, blob);');
    expect(vfsJs).toContain('okC = await idbSet(K_CONTENT + path, content);');
    expect(vfsJs).toContain("return { ok: false, error: '写入失败（存储引擎不可用）' };");
  });

  test('双引擎读取：OPFS 优先，miss 回落 IDB（迁移失败残留条目仍可读）', () => {
    expect(vfsJs).toContain('content = await opfsRead(path);');
    expect(vfsJs).toContain('if (content === null) content = await idbGet(K_CONTENT + path);');
  });

  test('双引擎删除：opfsDel + IDB 残键幂等双删；OPFS 删失败以 IDB 残键清理结果为准', () => {
    expect(vfsJs).toContain('okC = await opfsDel(p);');
    expect(vfsJs).toContain('const idbOk = await idbDel(K_CONTENT + p);');
    expect(vfsJs).toContain('if (!okC) okC = idbOk;');
  });

  test('双引擎搬运：OPFS 读源→写目标（move 再删源）；写目标失败落 IDB；源 miss 回落 IDB 通道', () => {
    expect(vfsJs).toContain('const blob = await opfsRead(p);');
    expect(vfsJs).toContain('await idbSet(K_CONTENT + np, blob);');
    expect(vfsJs).toContain("const asBlob = typeof content === 'string' ? new Blob([content]) : content;");
  });

  test('迁移与自愈：migrateContentsToOpfs（字符串包 Blob，成功删 IDB 内容键）+ sweepOpfsOrphans（索引外即删）', () => {
    expect(vfsJs).toContain('async function migrateContentsToOpfs(contents)');
    expect(vfsJs).toContain("if (typeof value === 'string') blob = new Blob([value], { type: (meta && meta.mime) || 'text/plain' });");
    expect(vfsJs).toContain('await idbDel(K_CONTENT + p); // meta 键保留；内容键删除失败也无妨（幂等迁移下次再清）');
    expect(vfsJs).toContain('async function sweepOpfsOrphans()');
    expect(vfsJs).toContain('if (!norm || !index.has(norm)) {');
  });

  test('观测/配额面：engine() + estimate/persisted/requestPersist 直通暴露', () => {
    expect(vfsJs).toContain('function engine() {\n  return { name: contentEngine, opfs: contentEngine === \'opfs\' };\n}');
    expect(vfsJs).toContain('estimate: opfsEstimate,');
    expect(vfsJs).toContain('persisted: opfsPersisted,');
    expect(vfsJs).toContain('requestPersist: opfsRequestPersist,');
  });
});

// ==================== C. data-backup.js 源码锚定 ====================
describe('v7.69 · C data-backup.js OPFS 内容段（源码锚定）', () => {
  test('导出：OPFS 枚举 + 复用 Blob→base64 通道 + data.opfs = { dir, files }（引擎不在场不出段）', () => {
    expect(backupJs).toContain("import { opfsDir, opfsList, opfsRead, opfsWrite, opfsClear, OPFS_DIR_NAME } from './opfs.js';");
    expect(backupJs).toContain('const paths = await opfsList();');
    expect(backupJs).toContain('const blob = await opfsRead(p);');
    expect(backupJs).toContain('files[p] = await serializeIdbValue(blob);');
    expect(backupJs).toContain('if (opfsCount > 0) data.opfs = { dir: OPFS_DIR_NAME, files };');
    expect(backupJs).toContain('Object.keys(ls).length + kv.length + opfsCount;');
  });

  test('恢复 = 全量覆盖：备份带 opfs 段回写；无段也清场（meta 已全量替换，旧内容必成孤儿）；失败如实报不整体回滚', () => {
    expect(backupJs).toContain('const cleared = await opfsClear();');
    expect(backupJs).toContain('const val = decodeIdbValue(opfsData.files[p]);');
    expect(backupJs).toContain('if (ok) opfsWritten++; else opfsOk = false;');
    expect(backupJs).toContain('OPFS 文件内容未能全部恢复，可重新导入备份补齐');
    // 确认弹窗含 OPFS 条目行
    expect(backupJs).toContain("if (opfsCount > 0) lines.push('OPFS 文件内容：' + opfsCount + ' 条');");
  });
});

// ==================== D. files.js / files-app.css 源码锚定 ====================
describe('v7.69 · D 文件应用 UI 全面增强（源码锚定）', () => {
  test('存储卡：引擎徽章 + 持久存储徽章/申请按钮 + 本源配额条（class 定位，三页共用模板无 id 冲突）', () => {
    expect(filesJs).toContain('<span class="fj-badge fj-engbadge">引擎检测中…</span>');
    expect(filesJs).toContain('<span class="fj-badge fj-persistbadge" style="display:none;">持久存储</span>');
    expect(filesJs).toContain('<button class="fj-chip fj-persistbtn" style="display:none;">');
    expect(filesJs).toContain('<i class="fj-quotafill"></i>');
    expect(filesJs).toContain('fj-quotatext">正在读取配额…</span>');
  });

  test('fillStorageCardExtras：engine/persisted/estimate 三态探测 + OPFS 引擎高亮 + 配额百分比公式 + 申请按钮回调', () => {
    expect(filesJs).toContain('async function fillStorageCardExtras() {');
    expect(filesJs).toContain("engBadge.textContent = eng.opfs ? 'OPFS 引擎' : 'IndexedDB';");
    expect(filesJs).toContain("engBadge.classList.toggle('on', !!eng.opfs);");
    expect(filesJs).toContain('if (persisted === true) { pBadge.style.display = \'\'; pBtn.style.display = \'none\'; }');
    expect(filesJs).toContain('var pct = Math.min(100, Math.max(0.5, (est.usage / est.quota) * 100));');
    expect(filesJs).toContain("'本源已用 ' + fmtBytes(est.usage) + ' / 配额 ' + fmtBytes(est.quota)");
    expect(filesJs).toContain('granted = await v.requestPersist();');
    expect(filesJs).toContain('fillStorageCardExtras();\n            }');
  });

  test('renderAll 收尾接 fillStorageCardExtras（首页/清理/浏览三卡都补齐）', () => {
    expect(filesJs).toContain('else renderBrowse();\n              fillStorageCardExtras();');
  });

  test('面包屑：crumbsHtml（内部存储根段 + › 分隔 + 当前段 cur）+ renderSub 目录模式注入 + 点击祖先段跳转', () => {
    expect(filesJs).toContain('function crumbsHtml(dir) {');
    expect(filesJs).toContain("var items = [{ dir: '/', label: '内部存储' }];");
    expect(filesJs).toContain("data-crumb=\"' + esc(items[j].dir) + '\"");
    expect(filesJs).toContain('body = crumbsHtml(S.sub.dir)');
    expect(filesJs).toContain("var crumb = target.closest('[data-crumb]');");
    expect(filesJs).toContain('S.sub.dir = d; renderSub();');
  });

  test('目录行元信息：dirStatOf 实时子项统计 + 「N 项 · 体积」；网格目录计数徽标 gcnt', () => {
    expect(filesJs).toContain('function dirStatOf(path) {');
    expect(filesJs).toContain("meta = (st && st.n) ? (st.n + ' 项 · ' + fmtBytes(st.bytes)) : ((entry.meta && entry.meta.hint) || '');");
    expect(filesJs).toContain("badge = '<span class=\"gcnt\">' + st.n + '</span>';");
  });

  test('Tab 共享轴：switchTab 方向判定 + syncScreens(direction) + fj-ax-l/fj-ax-r 强重排重放；进场 stagger 仅 tab 进场挂 .stag', () => {
    expect(filesJs).toContain('var dir = i > S.tab ? 1 : -1;');
    expect(filesJs).toContain('function syncScreens(direction) {');
    expect(filesJs).toContain("sc.classList.add(direction > 0 ? 'fj-ax-l' : 'fj-ax-r');");
    expect(filesJs).toContain('void sc.offsetWidth;');
    expect(filesJs).toContain("if (sc) sc.querySelectorAll('.fj-vlist').forEach(function(v) { v.classList.add('stag'); });");
  });

  test('导入进度：snack 第三参 sticky（长任务不自动隐藏）+ 逐文件「正在导入 i/n · 文件名」', () => {
    expect(filesJs).toContain('function snack(msg, icn, sticky) {');
    expect(filesJs).toContain("if (!sticky) snackEl._t = setTimeout(function() { snackEl.classList.remove('on'); }, 2600);");
    expect(filesJs).toContain("'正在导入 ' + (i + 1) + '/' + files.length + ' · ' + f.name");
  });

  test('文本预览复制全文：navigator.clipboard 优先 + execCommand 回落 + 结果 snack', () => {
    expect(filesJs).toContain('var previewText = null;');
    expect(filesJs).toContain("'<div style=\"display:flex;justify-content:center;margin-top:14px;\"><button class=\"fj-btn\" id=\"fjCopyText\">'");
    expect(filesJs).toContain('await navigator.clipboard.writeText(previewText || \'\')');
    expect(filesJs).toContain("ok = document.execCommand('copy');");
    expect(filesJs).toContain("snack(ok ? '已复制全文' : '复制失败', ok ? 'check' : 'info');");
  });

  test('files-app.css：徽章/配额条/面包屑/目录徽标/共享轴 keyframes/stagger 延迟阶梯/reduced-motion 全套在场', () => {
    expect(filesCss).toContain('.fj-engrow {');
    expect(filesCss).toContain('.fj-badge.on { background: hsl(var(--md-h, 215) 70% 55% / 0.18);');
    // v7.71 演进：width 过渡（逐帧布局）退役 → 终局 width 由 JS 一次性落定 + 一次性合成器 scaleX（.go）
    expect(filesCss).toContain('.fj-qbar i.go { animation: fjBarGo 0.7s cubic-bezier(0.2, 0, 0.1, 1); }');
    expect(filesCss).toContain('@keyframes fjBarGo { from { transform: scaleX(0); } }');
    expect(filesCss).not.toContain('transition: width');
    expect(filesCss).toContain('.fj-crumbs {');
    expect(filesCss).toContain('.fj-crumb.cur { color: var(--md-on-surface, #e3e3e3); font-weight: 600; }');
    expect(filesCss).toContain('.fj-gitem .gcnt {');
    expect(filesCss).toContain('.fj-screen.on.fj-ax-l { animation: fjAxL 0.32s cubic-bezier(0.2, 0, 0.1, 1); }');
    expect(filesCss).toContain('@keyframes fjAxR { from { opacity: 0; transform: translateX(-28px); } }');
    expect(filesCss).toContain('.fj-vlist.stag .fj-row { animation: fjRowIn 0.3s cubic-bezier(0.2, 0, 0, 1) both; }');
    expect(filesCss).toContain('.fj-vlist.stag .fj-row:nth-child(n + 12) { animation-delay: 242ms; }');
    // reduced-motion：共享轴与 stagger 一并禁播
    expect(filesCss).toContain('.fj-screen.on.fj-ax-l, .fj-screen.on.fj-ax-r { animation: none; }');
    expect(filesCss).toContain('.fj-vlist.stag .fj-row { animation: none; }');
  });

  test('sw 版本锚点：geek-v82', () => {
    expect(swJs).toContain("const VERSION = 'geek-v82';");
  });
});

// ==================== E. 运行时（in-memory OPFS mock + storage.js mock） ====================

const { kv } = vi.hoisted(() => ({ kv: new Map() }));

vi.mock('../ios-desktop/js/storage.js', () => ({
  idbAvailable: () => true,
  idbSet: async (k, v) => { kv.set(String(k), v); return true; },
  idbGet: async (k) => (kv.has(String(k)) ? kv.get(String(k)) : null),
  idbDel: async (k) => kv.delete(String(k)),
  idbGetAllEntries: async () => Array.from(kv.entries()).map(([key, value]) => ({ key, value })),
  idbBulkPut: async () => true,
  idbClearStore: async () => { kv.clear(); return true; },
}));

/** in-memory OPFS mock：目录句柄 + 真实 WritableStream（兼通 pipeTo 与直写两条 opfs.js 代码路径） */
function makeOpfsMock() {
  const files = new Map(); // OPFS 文件名 → Blob
  const dir = {
    kind: 'directory',
    name: 'geek-vfs',
    async getFileHandle(name, opts) {
      if (!files.has(name) && !(opts && opts.create)) {
        throw Object.assign(new Error('NotFoundError'), { name: 'NotFoundError' });
      }
      return {
        kind: 'file',
        name,
        async createWritable() {
          const chunks = [];
          const w = new WritableStream({
            write(chunk) { chunks.push(chunk); },
            close() { files.set(name, new Blob(chunks)); },
            abort() {},
          });
          // 直写便捷通道（写 sink 直通；close 走 writer 触发 sink.close）
          w.write = async (b) => { const writer = w.getWriter(); await writer.write(b); writer.releaseLock(); };
          w.close = async () => { const writer = w.getWriter(); await writer.close(); };
          return w;
        },
        async getFile() {
          const b = files.get(name);
          if (!b) throw Object.assign(new Error('NotFoundError'), { name: 'NotFoundError' });
          return b;
        },
      };
    },
    async removeEntry(name) {
      if (!files.delete(name)) throw Object.assign(new Error('NotFoundError'), { name: 'NotFoundError' });
    },
    async *entries() { for (const [name] of files) yield [name, { kind: 'file', name }]; },
  };
  const root = { async getDirectoryHandle() { return dir; } };
  return { root, dir, files };
}

let persistFlag = false;
let opfsMock = null;

function installStorage(mock) {
  const desc = {
    configurable: true,
    value: mock ? {
      getDirectory: async () => mock.root,
      estimate: async () => ({ usage: 123456, quota: 987654321 }),
      persisted: async () => persistFlag,
      persist: async () => { persistFlag = true; return true; },
    } : undefined,
  };
  try { delete navigator.storage; } catch (e) { /* 只读则靠 defineProperty */ }
  try { Object.defineProperty(navigator, 'storage', desc); } catch (e) { /* 忽略 */ }
}

async function freshVfs() {
  vi.resetModules();
  const mod = await import('../ios-desktop/js/vfs.js');
  const api = mod.initVfs();
  await api.ready;
  return api;
}

beforeEach(() => {
  kv.clear();
  try { localStorage.clear(); } catch (e) {}
  persistFlag = false;
  opfsMock = makeOpfsMock();
  installStorage(opfsMock);
});

afterEach(() => {
  installStorage(null);
});

describe('v7.69 · E OPFS 引擎运行时（mock 注入）', () => {
  test('① 引擎上场：boot 后 engine=opfs；写入落 OPFS（内容键不进 IDB），meta 仍走 IDB；读回原文', async () => {
    const vfs = await freshVfs();
    expect(vfs.engine()).toEqual({ name: 'opfs', opfs: true });
    const r = await vfs.write('/documents/a.txt', 'hello opfs');
    expect(r.ok).toBe(true);
    // OPFS 有内容（扁平编码名）
    expect(opfsMock.files.has('%2Fdocuments%2Fa.txt')).toBe(true);
    const blob = opfsMock.files.get('%2Fdocuments%2Fa.txt');
    expect(await blob.text()).toBe('hello opfs');
    // IDB：meta 在、内容键不在
    expect(kv.has('vfs-meta:/documents/a.txt')).toBe(true);
    expect(kv.has('vfs:/documents/a.txt')).toBe(false);
    // 读回
    expect(await vfs.readText('/documents/a.txt')).toBe('hello opfs');
    expect(await vfs.readBlob('/documents/a.txt')).toBeInstanceOf(Blob);
  });

  test('② 降级路径：无 navigator.storage.getDirectory → 引擎 idb，字符串原样存 IDB（历史语义）', async () => {
    installStorage(null);
    const vfs = await freshVfs();
    expect(vfs.engine()).toEqual({ name: 'idb', opfs: false });
    const r = await vfs.write('/legacy/t.txt', 'plain string');
    expect(r.ok).toBe(true);
    expect(kv.get('vfs:/legacy/t.txt')).toBe('plain string');
    expect(await vfs.readText('/legacy/t.txt')).toBe('plain string');
  });

  test('③ IDB → OPFS 迁移：boot 把残余内容键迁入 OPFS 并删除 IDB 内容键，读路径无感', async () => {
    kv.set('vfs-meta:/legacy.txt', { path: '/legacy.txt', name: 'legacy.txt', type: 'file', mime: 'text/plain', size: 12, created: 1, modified: 1, owner: '', meta: null });
    kv.set('vfs:/legacy.txt', 'hello legacy');
    const vfs = await freshVfs();
    expect(vfs.engine().opfs).toBe(true);
    expect(opfsMock.files.has('%2Flegacy.txt')).toBe(true);
    expect(await (await opfsMock.files.get('%2Flegacy.txt')).text()).toBe('hello legacy');
    expect(kv.has('vfs:/legacy.txt')).toBe(false); // 内容键已迁出
    expect(kv.has('vfs-meta:/legacy.txt')).toBe(true); // meta 保留
    expect(await vfs.readText('/legacy.txt')).toBe('hello legacy');
  });

  test('④ 孤儿清扫：OPFS 里索引不存在的路径在 boot 时被清掉', async () => {
    opfsMock.files.set('%2Fghost.txt', new Blob(['ghost']));
    const vfs = await freshVfs();
    expect(vfs.engine().opfs).toBe(true);
    expect(opfsMock.files.has('%2Fghost.txt')).toBe(false);
  });

  test('⑤ 删除双清：del 后 OPFS 内容、IDB meta、IDB 内容残键全消失', async () => {
    const vfs = await freshVfs();
    await vfs.write('/del-me/x.txt', 'bye');
    expect(opfsMock.files.has('%2Fdel-me%2Fx.txt')).toBe(true);
    const r = await vfs.del('/del-me');
    expect(r.ok).toBe(true);
    expect(r.removed).toBe(2); // 目录 + 文件
    expect(opfsMock.files.has('%2Fdel-me%2Fx.txt')).toBe(false);
    expect(kv.has('vfs-meta:/del-me')).toBe(false);
    expect(kv.has('vfs-meta:/del-me/x.txt')).toBe(false);
    expect(await vfs.readText('/del-me/x.txt')).toBe(null);
  });

  test('⑥ 搬运：copy 双份内容在 OPFS；move 后源消失目标可读', async () => {
    const vfs = await freshVfs();
    await vfs.write('/mv/a.txt', 'AAA');
    const cp = await vfs.copy('/mv/a.txt', '/mv/b.txt');
    expect(cp.ok).toBe(true);
    expect(opfsMock.files.has('%2Fmv%2Fa.txt')).toBe(true);
    expect(opfsMock.files.has('%2Fmv%2Fb.txt')).toBe(true);
    expect(await vfs.readText('/mv/b.txt')).toBe('AAA');
    const mv = await vfs.move('/mv/a.txt', '/mv/c.txt');
    expect(mv.ok).toBe(true);
    expect(opfsMock.files.has('%2Fmv%2Fa.txt')).toBe(false);
    expect(opfsMock.files.has('%2Fmv%2Fc.txt')).toBe(true);
    expect(await vfs.readText('/mv/c.txt')).toBe('AAA');
    expect(await vfs.stat('/mv/a.txt')).toBe(null);
  });

  test('⑦ 读回落：OPFS 内容丢失（模拟迁移残留）时读路径回落 IDB 内容键', async () => {
    const vfs = await freshVfs();
    await vfs.write('/fb.txt', 'from opfs');
    // 模拟：OPFS 侧丢失，IDB 残留旧字符串内容
    opfsMock.files.delete('%2Ffb.txt');
    kv.set('vfs:/fb.txt', 'from idb');
    expect(await vfs.readText('/fb.txt')).toBe('from idb');
  });

  test('⑧ 配额与持久化：estimate 直通真实数值；persist 申请后 persisted 翻转', async () => {
    const vfs = await freshVfs();
    const est = await vfs.estimate();
    expect(est).toEqual({ usage: 123456, quota: 987654321 });
    expect(await vfs.persisted()).toBe(false);
    expect(await vfs.requestPersist()).toBe(true);
    expect(await vfs.persisted()).toBe(true);
  });

  test('⑨ VFS 全 API 回归：list/mkdir/stat/move 事件订阅在 OPFS 引擎下行为不变', async () => {
    const vfs = await freshVfs();
    await vfs.mkdir('/docs');
    await vfs.write('/docs/note.md', '# hi', { owner: 'test' });
    const listed = vfs.list('/docs');
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe('note.md');
    const st = vfs.stat('/docs/note.md');
    expect(st.mime).toBe('text/markdown');
    expect(st.size).toBe(4); // '# hi' UTF-8 4 字节
    const events = [];
    const un = vfs.subscribe('/docs', (e) => events.push(e.type));
    await vfs.write('/docs/2.md', 'x');
    un();
    expect(events).toContain('write');
  });
});

describe('v7.69 · E opfs.js 单元（mock 注入）', () => {
  test('pathToKey/keyToPath 往返；opfsList 只收文件并解码回路径；opfsClear 清专用目录', async () => {
    vi.resetModules();
    const opfs = await import('../ios-desktop/js/opfs.js');
    expect(opfs.pathToKey('/documents/a.txt')).toBe('%2Fdocuments%2Fa.txt');
    expect(opfs.keyToPath('%2Fdocuments%2Fa.txt')).toBe('/documents/a.txt');
    expect(opfs.OPFS_DIR_NAME).toBe('geek-vfs');
    expect(await opfs.opfsDir()).toBeTruthy(); // 探针通过
    await opfs.opfsWrite('/x/y.bin', new Blob([new Uint8Array([1, 2, 3])]));
    expect(await opfs.opfsList()).toContain('/x/y.bin');
    expect(await opfs.opfsRead('/x/y.bin')).toBeInstanceOf(Blob);
    expect((await opfs.opfsRead('/x/y.bin')).size).toBe(3);
    expect(await opfs.opfsDel('/x/y.bin')).toBe(true);
    expect(await opfs.opfsRead('/x/y.bin')).toBe(null);
    await opfs.opfsWrite('/keep.bin', new Blob(['k']));
    expect(await opfs.opfsClear()).toBe(true);
    expect(await opfs.opfsList()).toEqual([]);
  });

  test('引擎不可用：storage 未定义时 opfsDir → null，全部操作 fail-soft', async () => {
    installStorage(null);
    vi.resetModules();
    const opfs = await import('../ios-desktop/js/opfs.js');
    expect(await opfs.opfsDir()).toBe(null);
    expect(await opfs.opfsWrite('/a', new Blob(['x']))).toBe(false);
    expect(await opfs.opfsRead('/a')).toBe(null);
    expect(await opfs.opfsDel('/a')).toBe(false);
    expect(await opfs.opfsList()).toEqual([]);
    expect(await opfs.opfsClear()).toBe(false);
    expect(await opfs.opfsEstimate()).toBe(null);
    expect(await opfs.opfsPersisted()).toBe(null);
    expect(await opfs.opfsRequestPersist()).toBe(null);
  });
});
