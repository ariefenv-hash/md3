// ==================== pkg-registry.js — 安装包注册中心（v7.52 编排层） ====================
//
// 「安装包」功能的总装配：
//   导入（analyzeZipBlob / importFiles）→ 待安装（pkgStore 'pending'）
//   安装（installPending）→ 校验重建 + 记录落 IDB + 桌面注册（图标/initialApps/pagesApps）
//   打开  → iframeAppContent('pkg/<appId>/<entry>') + sandbox 沙箱 → sw.js 从 IDB 供文件
//   卸载（uninstallPackage）→ 桌面反注册 + 权限记录清除 + 实例销毁 + SW 缓存失效
//
// 模块环规避：本模块被 main.js 静态导入；对 desktop.js / app-window.js / page-stack.js /
// permissions.js 这类「依赖链会绕回 apps-data」的重模块一律动态 import（调用期才拉起），
// 静态依赖仅限叶子模块（pkg-* 纯逻辑 + app-icons 数据表 + iframe-app 模板）。
// ⚠️ 求值顺序纪律：state.js 必须是第一个静态导入 —— state 的求值需要完整的
// initialApps（apps-data）；若先 import apps-data，其依赖树里的某个 app 模块会再拉起
// state.js，state 在 apps-data 求值中途读到未初始化的 initialApps（esbuild 转换下
// 表现为 undefined.slice 崩溃）。state 先行 → 由它自己拉起 apps-data 全量求值 → 环解开。

import { state } from '../state.js';
import { initialApps } from '../apps-data.js';
import { iframeAppContent } from '../iframe-app.js';
import { registerAppIcon, unregisterAppIcon } from '../app-icons.js';
import { PKG_MANIFEST_PATH, PKG_DEFAULT_ENTRY, PKG_LIMITS, pkgAppId, validateManifest, isInstallablePath, imageMimeFromName, mimeFromPath, guessTitleFromHTML } from './pkg-manifest.js';
import { readZip, PkgZipError } from './zip-reader.js';
import { pkgStore } from './pkg-store.js';
import { buildIconHTML } from './pkg-icon.js';

/** 包应用 iframe 承载策略（v7.52 实证结论）：
 *
 * 曾设计为无 allow-same-origin 的 opaque 沙箱（隔离宿主存储），但真浏览器对照实验实锤：
 * opaque origin 的文档不属于任何 Service Worker 的控制域 —— 其导航请求绕过 SW 直达网络，
 * 包内容 404（fetch 同样不受控）。SW 虚拟托管（相对路径正确性）与 opaque 沙箱不可兼得。
 * 故改为同源 iframe，安全面以三层防波堤补偿：
 *   1. sw.js 为 /pkg/ 的 text/html 响应注入 CSP 响应头（封外联、收窄请求面）；
 *   2. pkg-sdk.js 由 SW 头注，先于包内任何脚本建立 __system 单一真源
 *      （main.js 注入器检测 __pkgSdkInstalled 幂等跳过，防双监听）；
 *   3. README 6.5 明示同源信任模型 —— 与真机侧载 APK 同级的信任前提。
 * 本常量保留作为沙箱令牌参考实现，当前不用于 iframe（回切沙箱时需先解决 SW 控制域问题）。
 */
export const PKG_SANDBOX = 'allow-scripts allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-downloads';

const INSTALLER_APP_ID = 'installer';
const REMOVED_KEY = 'ios-desktop:removed-apps';

// ---------- 小工具 ----------

function loadRemovedIds() {
  try {
    const r = JSON.parse(localStorage.getItem(REMOVED_KEY) || '[]');
    if (!Array.isArray(r)) return new Set();
    return new Set(r.map((x) => (x && typeof x === 'object' ? x.id : x)).filter((id) => typeof id === 'string' && id));
  } catch (e) { return new Set(); }
}

function saveRemovedIds(set) {
  try { localStorage.setItem(REMOVED_KEY, JSON.stringify([...set])); } catch (e) {}
}

function findInPages(pages, appId) {
  for (const page of pages) {
    if (!Array.isArray(page)) continue;
    for (const item of page) {
      if (!item) continue;
      if (item.id === appId) return true;
      if (item.type === 'folder' && Array.isArray(item.apps) && item.apps.some((m) => m && m.id === appId)) return true;
    }
  }
  return false;
}

/** 从 pagesApps 深度移除（含文件夹内成员）；返回是否移除成功 */
function deepRemoveFromPages(pages, appId) {
  let removed = false;
  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi];
    if (!Array.isArray(page)) continue;
    for (let ii = page.length - 1; ii >= 0; ii--) {
      const item = page[ii];
      if (!item) continue;
      if (item.id === appId) { page.splice(ii, 1); removed = true; continue; }
      if (item.type === 'folder' && Array.isArray(item.apps)) {
        const before = item.apps.length;
        item.apps = item.apps.filter((m) => !(m && m.id === appId));
        if (item.apps.length !== before) removed = true;
        // 文件夹被清空 → 整体移除
        if (item.apps.length === 0) { page.splice(ii, 1); }
      }
    }
  }
  return removed;
}

function appendToPagesApps(def) {
  const pages = state.pagesApps;
  if (!pages.length) { pages.push([{ ...def, slot: 0 }]); return; }
  const last = pages[pages.length - 1];
  if (last.length >= 24) pages.push([{ ...def, slot: 0 }]);
  else last.push({ ...def, slot: last.length });
}

/** 通知 Service Worker 失效包内存缓存（安装/卸载/覆盖后调用）。
 * v7.60：appId 可空 —— 表示全量失效（PKG_CHANGED 消息丢失补偿场景）。 */
function notifyPkgChanged(appId) {
  try { navigator.serviceWorker && navigator.serviceWorker.controller && navigator.serviceWorker.controller.postMessage({ type: 'PKG_CHANGED', appId: appId || '' }); } catch (e) {}
}

// ==================== v7.60 首开 404 自愈三件套 ====================
//
// 用户实证：安装包应用「初次打开可能 404，多刷新几遍才正常」。根因层：
//   A. /pkg/** 是 SW 虚拟路由 —— 服务器上不存在。页面尚未被 SW 接管的窗口期
//     （首次访问 SW 仍在安装 / 部署后新 SW 激活前 / SW 注册失败的浏览器），
//     iframe 导航直达网络 → 服务器真 404（GitHub Pages 404 页）。
//   B. SW 读 IDB 瞬态故障被旧逻辑伪装成 404（sw.js 已改为重试 + 503 区分）。
//   C. PKG_CHANGED 丢失（controller 尚未就绪）→ SW 包记录内存缓存陈旧。
// 页面侧自愈不依赖单一根因判定，三层互补：
//   ① waitPkgServing：安装完成前 / openPkgApp 打开前探测入口 URL 直到 SW 真实供包；
//   ② __pkgIframeSelfHeal：iframe onload 后同源检查响应体，命中 404/504 页签名
//     即自动带退避重载（SW 激活完成后的下一轮重载自然成功，用户无需手动刷新）；
//   ③ 重载前补发全量 PKG_CHANGED，若缓存陈旧则下一轮即命中新记录。

/** 包入口的绝对 URL（与 iframe 相对路径解析同一基准：宿主文档 baseURI） */
function pkgServeUrl(appId, entry) {
  try { return new URL('pkg/' + appId + '/' + entry, document.baseURI).href; }
  catch (e) { return 'pkg/' + appId + '/' + entry; }
}

/**
 * 等待 SW 虚拟托管真实就绪（能 200 取到入口）。
 * 已就绪时是一次 ~1ms 的探测（SW 包记录内存缓存命中）；未就绪时按退避轮询直到
 * 超时。返回是否就绪；调用方对 false 一律非致命（无 SW 环境仍按旧路径打开）。
 * @param {string} appId
 * @param {string} entry
 * @param {number} [timeoutMs]
 * @returns {Promise<boolean>}
 */
export async function waitPkgServing(appId, entry, timeoutMs = 5000) {
  const url = pkgServeUrl(appId, entry);
  const deadline = Date.now() + timeoutMs;
  let n = 0;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (r && r.ok) return true;
      // 受控但 404 → 可能 PKG_CHANGED 丢失致 SW 缓存陈旧：全量失效后重试
      if (navigator.serviceWorker && navigator.serviceWorker.controller) notifyPkgChanged('');
    } catch (e) { /* 未受控/离线：继续轮询 */ }
    n++;
    if (Date.now() >= deadline) break;
    await new Promise((res) => setTimeout(res, Math.min(250 * (n + 1), 1200)));
  }
  return false;
}

/**
 * 安装包 iframe 自愈：onload 后检查同源文档，命中「包 404 JSON / 包 503 JSON /
 * 服务器 404 页」签名即带退避重载（全局注册一次，由 buildPkgAppDef 的
 * onLoadExtra 通道调用）。重载前补发全量 PKG_CHANGED 兼修缓存陈旧分支。
 * @param {HTMLIFrameElement} iframe
 */
function pkgIframeSelfHeal(iframe) {
  try {
    if (!iframe || !iframe.src || iframe.src.indexOf('/pkg/') === -1) return;
    const doc = iframe.contentDocument;
    if (!doc || !doc.body) return;
    const txt = (doc.body.textContent || '').slice(0, 500);
    const isPkgJson404 = txt.indexOf('"package file not found"') !== -1;
    const isPkgJson503 = txt.indexOf('"package service unavailable"') !== -1;
    const title = String(doc.title || '');
    const isServer404 = /(^|\s)404(\s|$)|page not found/i.test(title);
    if (!isPkgJson404 && !isPkgJson503 && !isServer404) return;
    const n = parseInt(iframe.dataset.pkgRetry || '0', 10) || 0;
    if (n >= 8) return; // 上限 8 次（500ms→8s 退避），防无 SW 环境无限重载
    iframe.dataset.pkgRetry = String(n + 1);
    notifyPkgChanged('');
    setTimeout(() => {
      try { iframe.src = iframe.src; } catch (e) {}
    }, Math.min(500 * Math.pow(2, n), 8000));
  } catch (e) { /* 上下文销毁等：忽略 */ }
}

/** 全局注册自愈入口（initInstaller 期调用一次；先于任何包应用可打开的时机） */
function installPkgSelfHeal() {
  if (typeof window === 'undefined' || window.__pkgIframeSelfHeal) return;
  window.__pkgIframeSelfHeal = pkgIframeSelfHeal;
}

/** 通知安装器 UI 重拉列表（实例常驻后台时也能同步） */
function emitInstallerRefresh() {
  try { window.dispatchEvent(new CustomEvent('pkg-installer-refresh')); } catch (e) {}
}

async function renderDesktop() {
  try { const m = await import('../desktop.js'); m.renderDesktopPages(); } catch (e) {}
}

// ---------- 分析：zip 字节 → 校验 + 识别 + 图标（导入与安装共用一条链） ----------

/**
 * 解析并校验一个压缩包 Blob。
 * @returns {Promise<{manifest, warnings, recognized, files, strippedRoot, iconHTML, iconKind, entryText}>}
 * @throws {Error & {pkgErrors?: string[], pkgWarnings?: string[]}} 校验失败（UI 展示 pkgErrors）
 */
export async function analyzeZipBlob(blob, zipName = '') {
  const buf = blob instanceof Blob ? await blob.arrayBuffer() : blob;
  let parsed;
  try {
    parsed = await readZip(buf);
  } catch (e) {
    if (e instanceof PkgZipError) { const err = new Error(e.message); err.pkgErrors = [e.message]; throw err; }
    throw e;
  }
  const { files, strippedRoot } = parsed;

  // 扩展名白名单（网页内容资产边界）
  const badFiles = files.filter((f) => !isInstallablePath(f.path)).map((f) => f.path);
  if (badFiles.length) {
    const err = new Error('包含不受支持的文件类型');
    err.pkgErrors = [`包含不受支持的文件类型：${badFiles.slice(0, 3).join('、')}${badFiles.length > 3 ? ' 等 ' + badFiles.length + ' 个' : ''}（白名单见 README 规范）`];
    throw err;
  }

  const filesByPath = new Map(files.map((f) => [f.path, { path: f.path, size: f.size }]));
  const idxFile = files.find((f) => f.path === PKG_DEFAULT_ENTRY);
  const idxHTML = idxFile ? new TextDecoder('utf-8').decode(idxFile.data) : '';
  const mfFile = files.find((f) => f.path === PKG_MANIFEST_PATH);
  let raw = null;
  if (mfFile) {
    try { raw = JSON.parse(new TextDecoder('utf-8').decode(mfFile.data)); } catch (e) { raw = null; }
  }

  const v = validateManifest(raw, { zipName, entryHTML: idxHTML, filesByPath });
  if (!v.ok) { const err = new Error(v.errors[0] || '清单校验失败'); err.pkgErrors = v.errors; err.pkgWarnings = v.warnings; throw err; }

  // manifest.entry 非默认且名称是从 <title> 识别的 → 用真实入口重识别一次（名称识别精度兜底）
  let name = v.manifest.name;
  if (v.recognized.nameSource === 'title' && v.manifest.entry !== PKG_DEFAULT_ENTRY) {
    const realEntry = files.find((f) => f.path === v.manifest.entry);
    if (realEntry) {
      const t = guessTitleFromHTML(new TextDecoder('utf-8').decode(realEntry.data));
      if (t) { name = t; v.manifest.name = t; }
    }
  }

  // 图标：矢量优先（SVG 内联注入，跟随 --md-h 主题）；位图栅格化兜底
  let iconHTML = '';
  let iconKind = '';
  if (v.manifest.icon) {
    const iconFile = files.find((f) => f.path === v.manifest.icon);
    const built = await buildIconHTML(iconFile.data, imageMimeFromName(v.manifest.icon));
    if (built) { iconHTML = built.html; iconKind = built.kind; }
    else v.warnings.push('图标处理失败，已使用系统默认图标');
  }

  const entryFile = files.find((f) => f.path === v.manifest.entry);
  if (!entryFile) { const err = new Error('入口文件缺失'); err.pkgErrors = [`入口文件缺失：${v.manifest.entry}`]; throw err; }

  return {
    manifest: v.manifest,
    warnings: v.warnings,
    recognized: v.recognized,
    files,
    strippedRoot,
    iconHTML,
    iconKind,
    entryText: new TextDecoder('utf-8').decode(entryFile.data),
  };
}

// ---------- 待安装（导入） ----------

/** 单文件大小预检（导入瞬间就拦，避免无意义读入） */
export function checkZipSize(byteLength) {
  if (byteLength > PKG_LIMITS.maxZipSize) {
    return `压缩包超过 ${Math.round(PKG_LIMITS.maxZipSize / 1024 / 1024)} MB 上限`;
  }
  return '';
}

/**
 * 导入一个压缩包（不安装）：解析预览后进 pending 队列。
 * @param {Blob|File} blob
 * @param {string} zipName
 * @returns {Promise<{key: string, name: string, size: number, warnings: string[], iconHTML: string, version: string, permissions: string[]}>}
 */
export async function importZipBlob(blob, zipName = '') {
  const sizeErr = checkZipSize(blob.size);
  if (sizeErr) { const err = new Error(sizeErr); err.pkgErrors = [sizeErr]; throw err; }

  const a = await analyzeZipBlob(blob, zipName);
  const key = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  await pkgStore.putPending({
    key,
    zipName: zipName || 'package.zip',
    size: blob.size,
    addedAt: Date.now(),
    blob,
    preview: {
      name: a.manifest.name,
      version: a.manifest.version,
      author: a.manifest.author,
      description: a.manifest.description,
      permissions: a.manifest.permissions,
      iconHTML: a.iconHTML,
      iconKind: a.iconKind,
      warnings: a.warnings,
      manifest: { id: a.manifest.id, entry: a.manifest.entry },
    },
  });
  // 导入后通知安装器 UI（若已开启）刷新；首次打开场景由页面初始 refresh 覆盖
  emitInstallerRefresh();
  return {
    key,
    name: a.manifest.name,
    version: a.manifest.version,
    size: blob.size,
    warnings: a.warnings,
    iconHTML: a.iconHTML,
    permissions: a.manifest.permissions,
  };
}

// ---------- 已安装：记录 → 桌面 ----------

/** 由安装记录构建桌面 AppInfo 定义（图标/名称/同源托管 iframe 页面）
 * v7.60：pkgEntry 记录入口路径（openPkgApp 打开前探测用）；content 携带自愈 onload */
export function buildPkgAppDef(rec) {
  return {
    id: rec.appId,
    name: rec.name,
    isPkg: true,
    pkgAppId: rec.appId,
    pkgVersion: rec.version,
    pkgEntry: rec.entry,
    customIcon: rec.iconHTML || '',
    pages: [{
      title: rec.name,
      content: iframeAppContent('pkg/' + rec.appId + '/' + rec.entry, {
        onLoadExtra: 'window.__pkgIframeSelfHeal&&window.__pkgIframeSelfHeal(this)',
      }),
    }],
  };
}

/**
 * 把一条安装记录挂进桌面（图标注册 + initialApps + 分页末尾）。
 * 返回 true 表示 initialApps 有新增（需要重建索引）。
 */
function attachInstalledApp(rec) {
  let changed = false;
  if (rec.iconHTML) registerAppIcon(rec.appId, rec.iconHTML);
  let def = initialApps.find((a) => a.id === rec.appId);
  if (!def) { initialApps.push(buildPkgAppDef(rec)); changed = true; }
  else { Object.assign(def, buildPkgAppDef(rec)); } // 覆盖安装：原地更新（pages/customIcon 引用刷新）
  const removed = loadRemovedIds();
  if (!removed.has(rec.appId) && !findInPages(state.pagesApps, rec.appId)) {
    appendToPagesApps(initialApps.find((a) => a.id === rec.appId));
  }
  return changed;
}

/** 安装：pending → 校验重建 → IDB → 桌面。已装同 id 时覆盖升级。 */
export async function installPending(key) {
  const pending = await pkgStore.getPending(key);
  if (!pending) throw new Error('待安装记录不存在（可能已被删除）');

  // 安装期重新走一遍完整校验链（防导入后包被篡改/存储损坏；单一真源）
  const a = await analyzeZipBlob(pending.blob, pending.zipName);
  const appId = pkgAppId(a.manifest.id);

  // 与内置应用 id / 其他包 id 冲突检查（pkg- 前缀已隔离内置空间；此处防重复包覆盖提示）
  const prev = await pkgStore.getInstalled(appId);
  if (prev && prev.name !== a.manifest.name) {
    // 覆盖安装但改名：允许，记录会整体替换
  }

  const totalSize = a.files.reduce((s, f) => s + f.size, 0);
  const record = {
    appId,
    pkgId: a.manifest.id,
    name: a.manifest.name,
    version: a.manifest.version,
    author: a.manifest.author,
    description: a.manifest.description,
    entry: a.manifest.entry,
    permissions: a.manifest.permissions,
    iconHTML: a.iconHTML,
    iconKind: a.iconKind,
    files: a.files.map((f) => ({ path: f.path, size: f.size, blob: new Blob([f.data], { type: mimeFromPath(f.path) }) })),
    size: totalSize,
    zipName: pending.zipName,
    installedAt: Date.now(),
  };

  // 覆盖安装：先销毁旧实例（内容引用整体换血）
  if (prev) {
    try { const ps = await import('../page-stack.js'); ps.destroyAppInstance(appId); } catch (e) {}
  }

  await pkgStore.putInstalled(record);
  attachInstalledApp(record);
  await renderDesktop();
  notifyPkgChanged(appId);

  // v7.60：安装完成前等待 SW 虚拟托管就绪 —— 根治「装完立刻打开撞上 SW 激活
  // 窗口期 → 404」。就绪环境为一次 ~1ms 探测；非致命（无 SW 环境不阻塞安装）。
  try { await waitPkgServing(appId, record.entry, 5000); } catch (e) {}

  // 权限元数据种子（不预授权 —— 运行时请求仍走统一权限对话框）
  try {
    const pm = await import('../permissions.js');
    pm.seedAppMeta(appId, record.name, record.iconHTML);
  } catch (e) {}

  await pkgStore.delPending(key);
  emitInstallerRefresh();
  return { appId, name: record.name, upgraded: !!prev };
}

/** 卸载：IDB + 桌面 + 权限 + 实例 + SW 缓存全链清除 */
export async function uninstallPackage(appId) {
  await pkgStore.delInstalled(appId);
  unregisterAppIcon(appId);

  const idx = initialApps.findIndex((a) => a.id === appId);
  if (idx !== -1) initialApps.splice(idx, 1);
  deepRemoveFromPages(state.pagesApps, appId);

  const removed = loadRemovedIds();
  if (removed.delete(appId)) saveRemovedIds(removed);

  try {
    const pm = await import('../permissions.js');
    pm.removeAppPermissions(appId);
  } catch (e) {}

  // 若该包应用正在前台 → 先关窗再销毁常驻实例
  if (state.currentApp && state.currentApp.id === appId) {
    try { const aw = await import('../app-window.js'); aw.closeApp(0, 0, 0); } catch (e) {}
  }
  try { const ps = await import('../page-stack.js'); ps.destroyAppInstance(appId); } catch (e) {}

  notifyPkgChanged(appId);
  await renderDesktop();
  emitInstallerRefresh();
}

/** 用户移除过桌面图标（removedApps）的已安装包 → 重新放回桌面 */
export async function reattachToDesktop(appId) {
  const rec = await pkgStore.getInstalled(appId);
  if (!rec) throw new Error('应用不存在或已卸载');
  const removed = loadRemovedIds();
  if (removed.delete(appId)) saveRemovedIds(removed);
  if (!findInPages(state.pagesApps, appId)) {
    attachInstalledApp(rec);
    await renderDesktop();
    emitInstallerRefresh();
  }
}

/** 打开已安装的包应用（安装器「打开」按钮 / 桌面图标同路径）。
 * v7.60：打开前探测 SW 就绪 —— 与桌面图标路径（自愈层兜底）双保险。 */
export async function openPkgApp(appId) {
  const idx = initialApps.findIndex((a) => a.id === appId);
  if (idx === -1) throw new Error('应用不存在或已卸载');
  const def = initialApps[idx];
  try { await waitPkgServing(appId, (def && def.pkgEntry) || 'index.html', 5000); } catch (e) {}
  const aw = await import('../app-window.js');
  aw.openApp(idx, null);
}

// ---------- 启动同步 ----------

/**
 * 启动期把全部已安装包挂进桌面（main.js 在 initVfs/initPermissions 之后调用）。
 * 返回新增数量；调用方随后自行 renderDesktopPages + rebuildSearchIndex。
 */
export async function initInstaller() {
  installPkgSelfHeal();
  let added = 0;
  try {
    const installed = await pkgStore.listInstalled();
    for (const rec of installed) {
      try { if (attachInstalledApp(rec)) added++; } catch (e) { /* 单个坏记录不阻断其余 */ }
    }
  } catch (e) { /* 存储不可用：跳过（内存回退模式下为空列表） */ }

  registerWindowAPI();
  return { added };
}

// ---------- window 桥（安装器 UI 内联脚本 / files 应用交接的唯一通道） ----------

let apiRegistered = false;
function registerWindowAPI() {
  if (apiRegistered || typeof window === 'undefined') return;
  apiRegistered = true;
  window.__pkgInstallerAPI = {
    // 数据查询
    listPending: () => pkgStore.listPending(),
    listInstalled: () => pkgStore.listInstalled(),
    // 导入（installer 页 file input → files 数组）
    importFiles: async (fileList) => {
      const out = [];
      for (const f of Array.from(fileList || [])) {
        try { out.push({ ok: true, ...(await importZipBlob(f, f.name)) }); }
        catch (e) { out.push({ ok: false, name: f.name, size: f.size, error: (e.pkgErrors && e.pkgErrors[0]) || e.message || '导入失败', errors: e.pkgErrors || [e.message || '导入失败'], warnings: e.pkgWarnings || [] }); }
      }
      return out;
    },
    // 安装 / 卸载 / 桌面管理
    installPending: (key) => installPending(key),
    uninstallPackage: (appId) => uninstallPackage(appId),
    reattachToDesktop: (appId) => reattachToDesktop(appId),
    delPending: (key) => pkgStore.delPending(key),
    // 打开
    openPkgApp: (appId) => openPkgApp(appId),
    // 文件管理器 zip 交接：读取 VFS 内的压缩包 → 导入 → 打开安装器
    openVFSFile: async (path) => {
      const vfs = window.__vfs;
      if (!vfs) throw new Error('虚拟文件系统未就绪');
      const blob = await vfs.readBlob(path);
      const fileName = String(path).split('/').pop();
      const rec = await importZipBlob(blob, fileName);
      const idx = initialApps.findIndex((a) => a.id === INSTALLER_APP_ID);
      if (idx !== -1) {
        try { const aw = await import('../app-window.js'); aw.openApp(idx, null); } catch (e) {}
      }
      return rec;
    },
    // 权限展示元数据快照（UI 渲染权限列表用；白名单与 PERMISSION_META 单一真源）
    permissionMeta: null, // initPermissions 之后由 main.js 注入真实快照
  };
}

/** main.js 调用：把 PERMISSION_META 快照交给安装器 UI（避免 UI 侧直接依赖 permissions 模块） */
export function providePermissionMeta(meta) {
  if (window.__pkgInstallerAPI) window.__pkgInstallerAPI.permissionMeta = meta;
}
