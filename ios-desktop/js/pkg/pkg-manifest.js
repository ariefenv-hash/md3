// ==================== pkg-manifest.js — 安装包清单校验与自动识别（v7.52 纯逻辑层） ====================
//
// 「安装包」功能的规范核心：定义 .mdapp 压缩包内文件的格式契约（与 README「安装包格式规范」
// 章节一一对应），并提供纯函数实现：
//   1. manifest.json 校验（字段/长度/字符集/权限白名单）
//   2. 自动识别（规范要求"自动识别内置的图标及名称"）：
//        名称  = manifest.name → 入口页 <title> → 压缩包文件名（去扩展名）
//        图标  = manifest.icon → 入口页 favicon → 系统默认图标
//        入口  = manifest.entry → index.html
//   3. 路径安全（zip 常见投毒：绝对路径 / .. 穿越 / NUL / 反斜杠归一）
//   4. SVG 图标净化（包内图标是任意第三方内容，进桌面 DOM 前剥掉 script / on* / 外链）
//
// 本模块保持零 DOM 依赖、零副作用（HTML 解析用正则而非 DOMParser，
// happy-dom 与真实浏览器行为一致且可在任意环境单测）。

/** 安装后的应用 id 前缀：pkg-<manifest.id>，与内置应用 id 空间物理隔离 */
export const PKG_APP_PREFIX = 'pkg-';
/** 清单文件在包内的规范路径（zip 根目录） */
export const PKG_MANIFEST_PATH = 'manifest.json';
/** 默认入口 */
export const PKG_DEFAULT_ENTRY = 'index.html';

/** 体量限制（与 README 规范表一致） */
export const PKG_LIMITS = {
  maxZipSize: 30 * 1024 * 1024,            // 压缩包本体 ≤ 30 MB
  maxTotalUncompressed: 40 * 1024 * 1024,  // 解压后总量 ≤ 40 MB
  maxFileUncompressed: 25 * 1024 * 1024,   // 单文件解压后 ≤ 25 MB
  maxEntries: 800,                          // 条目数 ≤ 800
  maxIconBytes: 512 * 1024,                 // 图标 ≤ 512 KB（安装时栅格化到 ≤192px）
  maxNameLen: 24,                           // name 长度上限（字符）
  maxVersionLen: 20,
  maxAuthorLen: 40,
  maxDescLen: 120,
};

/** 权限白名单 —— 与 permissions.js 的 PERMISSION_META 五类一一对应（此处只声明键名，
 * 展示文案由 pkg-registry 从 permissions.js 读取，避免本模块引入 DOM 依赖链） */
export const PKG_PERMISSIONS = ['camera', 'microphone', 'location', 'notifications', 'clipboard'];

/** 支持打包进应用的可安装扩展名白名单（网页内容识别与展现的资产边界） */
const INSTALLABLE_EXT = new Set([
  'html', 'htm', 'css', 'js', 'mjs', 'json', 'txt', 'md', 'xml', 'csv', 'map',
  'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico', 'bmp',
  'woff', 'woff2', 'ttf', 'otf',
  'wav', 'mp3', 'ogg', 'm4a', 'flac',
  'mp4', 'webm', 'mov',
  'wasm',
]);

/** zip 内文件 → 响应 Content-Type（sw.js 服务包内容时使用，保持单一真源） */
export const PKG_MIME = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  md: 'text/plain; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
  map: 'application/json; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  wasm: 'application/wasm',
};

/** 按扩展名取 MIME（未知扩展名按二进制流处理） */
export function mimeFromPath(path) {
  const ext = String(path || '').split('.').pop().toLowerCase();
  return PKG_MIME[ext] || 'application/octet-stream';
}

/** 扩展名是否允许打包（规范白名单之外一律拒绝安装，错误信息明确到具体文件） */
export function isInstallablePath(path) {
  const ext = String(path || '').split('.').pop().toLowerCase();
  return INSTALLABLE_EXT.has(ext);
}

/**
 * 包内路径安全归一：反斜杠归一、剥 ./ 前缀、拒绝绝对路径 / .. 穿越 / NUL / 空段。
 * @returns {string|null} 归一后的安全相对路径；不安全返回 null
 */
export function safePkgPath(rawPath) {
  if (typeof rawPath !== 'string' || !rawPath.length) return null;
  if (rawPath.includes('\0')) return null;
  if (/^[a-z]:[\\/]/i.test(rawPath)) return null;     // Windows 盘符
  let p = rawPath.replace(/\\/g, '/');
  if (p.startsWith('/')) return null;                 // 绝对路径
  const out = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;          // 空段 / 当前段
    if (seg === '..') return null;                    // 穿越
    out.push(seg);
  }
  if (!out.length) return null;
  return out.join('/');
}

/** manifest.id 合法性：小写字母开头，[a-z0-9._-]，2~40 位，禁止连续点（防路径歧义） */
export function isValidManifestId(id) {
  return typeof id === 'string' && /^[a-z][a-z0-9._-]{1,39}$/.test(id) && !id.includes('..');
}

/** manifest.id → 桌面应用 id */
export function pkgAppId(manifestId) {
  return PKG_APP_PREFIX + manifestId;
}

/** 压缩包文件名 → 默认应用名候选（去扩展名，截断到规范长度） */
export function nameFromZipName(zipName) {
  const base = String(zipName || '').replace(/\.(zip|mdapp)$/i, '').trim();
  if (!base) return '';
  return base.slice(0, PKG_LIMITS.maxNameLen);
}

/** 从入口 HTML 提取 <title>（自动识别链第二优先级）；实体仅解常用五个，够展示用 */
export function guessTitleFromHTML(html) {
  if (typeof html !== 'string') return '';
  const m = html.match(/<title[^>]*>([\s\S]{0,200}?)<\/title>/i);
  if (!m) return '';
  const t = m[1]
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
  return t.slice(0, PKG_LIMITS.maxNameLen);
}

/** 从入口 HTML 提取 favicon 相对路径（自动识别链第二优先级）；外链/内联 data 一律忽略 */
export function guessFaviconFromHTML(html) {
  if (typeof html !== 'string') return '';
  const re = /<link[^>]*rel\s*=\s*["']?[^"'>]*icon[^"'>]*["']?[^>]*>/gi;
  let tag;
  while ((tag = re.exec(html))) {
    const href = (tag[0].match(/href\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    if (!href || /^(https?:)?\/\//i.test(href) || href.startsWith('data:')) continue;
    return href;
  }
  return '';
}

/**
 * SVG 图标净化：桌面图标经 innerHTML 注入主文档，包内 SVG 是任意第三方内容 ——
 * 进入桌面 DOM 前剥掉 <script> / on* 事件属性 / javascript: 与外链 href / foreignObject。
 * @returns {string|null} 净化后的 SVG 文本；解析失败或根元素不是 svg 返回 null
 */
export function sanitizeIconSVG(text) {
  if (typeof text !== 'string' || !/<svg[\s>]/i.test(text)) return null;
  if (text.length > PKG_LIMITS.maxIconBytes) return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() !== 'svg' || root.getElementsByTagName('parsererror').length) return null;
    root.querySelectorAll('script, foreignObject, iframe, embed, object, animate, set').forEach((el) => el.remove());
    const all = [root, ...root.querySelectorAll('*')];
    for (const el of all) {
      for (const attr of [...el.attributes]) {
        const n = attr.name.toLowerCase();
        const v = String(attr.value || '');
        if (n.startsWith('on')) el.removeAttribute(attr.name);
        else if ((n === 'href' || n === 'xlink:href') && /^\s*(javascript:|https?:|\/\/)/i.test(v)) el.removeAttribute(attr.name);
      }
    }
    return new XMLSerializer().serializeToString(root);
  } catch (e) {
    return null;
  }
}

/** 图标文件名 → image MIME（仅接受浏览器可解码的位图与 svg） */
export function imageMimeFromName(path) {
  const ext = String(path || '').split('.').pop().toLowerCase();
  const table = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon', bmp: 'image/bmp', svg: 'image/svg+xml' };
  return table[ext] || null;
}

/**
 * manifest.json 校验 + 名称/图标自动识别。
 * @param {any} raw         manifest.json 解析结果（可能缺失/非法）
 * @param {object} ctx
 * @param {string} ctx.zipName      压缩包文件名（识别兜底）
 * @param {string} ctx.entryHTML    入口页文本（识别兜底）
 * @param {Map<string,{path,size}>} ctx.filesByPath 包内文件索引
 * @returns {{ok: boolean, manifest: object|null, errors: string[], warnings: string[], recognized: {name: string, nameSource: string, iconPath: string, iconSource: string}}}
 */
export function validateManifest(raw, { zipName = '', entryHTML = '', filesByPath = new Map() } = {}) {
  const errors = [];
  const warnings = [];
  const recognized = { name: '', nameSource: '', iconPath: '', iconSource: '' };

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, manifest: null, errors: ['manifest.json 缺失或不是 JSON 对象'], warnings, recognized };
  }

  // ---- id：必填，全系统唯一键的根 ----
  if (!isValidManifestId(raw.id)) {
    errors.push('manifest.id 缺失或非法（需小写字母开头，仅 a-z 0-9 . _ -，2~40 位，如 com.example.demo）');
  }

  // ---- name：三级自动识别 ----
  let name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (name) {
    recognized.nameSource = 'manifest';
  } else {
    name = guessTitleFromHTML(entryHTML);
    if (name) {
      recognized.nameSource = 'title';
      warnings.push('manifest.name 缺省，已从入口页 <title> 自动识别应用名');
    } else {
      name = nameFromZipName(zipName);
      if (name) {
        recognized.nameSource = 'zip';
        warnings.push('manifest.name 缺省且入口页无 <title>，已用压缩包文件名作为应用名');
      }
    }
  }
  if (!name) errors.push('无法确定应用名称（manifest.name / <title> / 压缩包文件名均不可用）');
  if (name.length > PKG_LIMITS.maxNameLen) {
    name = name.slice(0, PKG_LIMITS.maxNameLen);
    warnings.push(`应用名超出 ${PKG_LIMITS.maxNameLen} 字符上限，已截断`);
  }
  recognized.name = name;

  // ---- entry：可选，默认 index.html；必须存在于包内 ----
  let entry = PKG_DEFAULT_ENTRY;
  if (raw.entry != null && raw.entry !== '') {
    if (typeof raw.entry !== 'string') errors.push('manifest.entry 必须是字符串');
    else {
      const norm = safePkgPath(raw.entry);
      if (!norm) errors.push('manifest.entry 路径不安全（禁止绝对路径与 .. 穿越）');
      else if (!filesByPath.has(norm)) errors.push(`manifest.entry 指向的文件不存在：${norm}`);
      else entry = norm;
    }
  } else if (!filesByPath.has(PKG_DEFAULT_ENTRY)) {
    errors.push(`包内缺少入口文件 ${PKG_DEFAULT_ENTRY}（且 manifest.entry 未指定其他入口）`);
  }

  // ---- icon：两级自动识别 ----
  let iconPath = '';
  if (raw.icon != null && raw.icon !== '') {
    if (typeof raw.icon !== 'string') errors.push('manifest.icon 必须是字符串');
    else {
      const norm = safePkgPath(raw.icon);
      if (!norm) errors.push('manifest.icon 路径不安全');
      else if (!filesByPath.has(norm)) errors.push(`manifest.icon 指向的文件不存在：${norm}`);
      else if (!imageMimeFromName(norm)) errors.push(`manifest.icon 不是受支持的图片格式：${norm}`);
      else if (filesByPath.get(norm).size > PKG_LIMITS.maxIconBytes) errors.push(`图标文件超过 ${Math.round(PKG_LIMITS.maxIconBytes / 1024)} KB 上限：${norm}`);
      else { iconPath = norm; recognized.iconSource = 'manifest'; }
    }
  }
  if (!iconPath) {
    const fav = guessFaviconFromHTML(entryHTML);
    const favNorm = fav ? safePkgPath(fav) : '';
    if (favNorm && filesByPath.has(favNorm) && imageMimeFromName(favNorm) && filesByPath.get(favNorm).size <= PKG_LIMITS.maxIconBytes) {
      iconPath = favNorm;
      recognized.iconSource = 'favicon';
      warnings.push('manifest.icon 缺省，已从入口页 favicon 自动识别应用图标');
    }
  }
  recognized.iconPath = iconPath;

  // ---- version / author / description：可选字段，长度钳制 ----
  let version = typeof raw.version === 'string' ? raw.version.trim() : '';
  if (version && !/^[0-9A-Za-z.-]{1,20}$/.test(version)) {
    warnings.push('version 含非常规字符或超长，已忽略');
    version = '';
  }
  const author = typeof raw.author === 'string' ? raw.author.trim().slice(0, PKG_LIMITS.maxAuthorLen) : '';
  const description = typeof raw.description === 'string' ? raw.description.trim().slice(0, PKG_LIMITS.maxDescLen) : '';

  // ---- permissions：白名单过滤（未知权限降级为警告而非错误，向前兼容新权限类型）----
  let permissions = [];
  if (raw.permissions != null) {
    if (!Array.isArray(raw.permissions)) errors.push('manifest.permissions 必须是字符串数组');
    else {
      for (const p of raw.permissions) {
        if (typeof p !== 'string' || !p) { warnings.push(`忽略非法权限声明：${String(p)}`); continue; }
        if (PKG_PERMISSIONS.includes(p)) permissions.push(p);
        else warnings.push(`未知权限「${p}」已忽略（白名单：${PKG_PERMISSIONS.join('/')}）`);
      }
      permissions = [...new Set(permissions)];
    }
  }

  if (errors.length) return { ok: false, manifest: null, errors, warnings, recognized };

  return {
    ok: true,
    manifest: { id: raw.id, name, version: version || '1.0.0', entry, icon: iconPath, permissions, author, description },
    errors,
    warnings,
    recognized,
  };
}
