/* ==================== sw.js — 安卓16极客 Service Worker ====================
 * 策略（Vite 构建版 · cacheFirst 缓存优先）：
 *  - 为何改为 cacheFirst：接入 Vite 构建后，JS/CSS 产物文件名携带内容哈希
 *    （如 main-Bx9k2q.js），内容一变 URL 必变 → 「缓存命中 = 最新版本」，
 *    cacheFirst 可以零网络等待、离线秒开，同时永不出现缓存与代码不一致
 *  - 版本迭代机制：每次构建时 vite.config.js 的 copyStaticAndPrecache 插件会把
 *    本文件中的 __BUILD_ID__ 替换为本次构建 id → sw.js 字节内容变化 → 浏览器
 *    byte-diff 检测到 SW 更新 → 重新 install 全量预缓存新产物 → activate 清理旧缓存
 *  - install：读取构建期生成的 precache-manifest.json，用 {cache:'reload'} 逐个
 *    预缓存全部产物（绕过 HTTP 缓存，保证缓存的字节与服务器真实内容一致）；
 *    单个失败不阻断安装（Promise.allSettled）
 *  - activate：删除所有历史旧缓存（ios-sim-cache- 初代 / zeekr-cache- 误植代 / geek-cache- 旧版本，排除当前），clients.claim() 立即接管
 *  - fetch：仅拦截同源 GET；cacheFirst —— 命中缓存直接响应；未命中回源并回填缓存；
 *    回源失败时导航请求回退应用外壳（离线可打开页面），其余返回 503
 *  - 非 200 响应与 chrome-extension 等特殊协议一律不处理
 */

/* fix(v7.45)：策略名曾被写进版本号（'geek-v53-cacheFirst'），设置页「系统版本」随之显示
 * 成 geek-v53-cacheFirst（issue #5 img3）。版本号回归纯语义化 geek-v54，策略归属注释。 */
const VERSION = 'geek-v63';
// 构建指纹：构建时被 vite 插件替换为实际 id（如 'm3x9q2'），便于排查线上正在运行的 SW 版本
const BUILD_ID = '__BUILD_ID__';
// fix(P3)：CACHE_NAME 纳入 BUILD_ID —— 旧实现所有构建共用同一个 cache 名，
// activate 清理逻辑（k !== CACHE_NAME）永远没有可清理对象，旧哈希产物
//（desktop-OLDHASH.js 等）在缓存里无限堆积成死条目。现在每次构建独立缓存，
// activate 时旧构建的整个缓存桶被整体删除（预缓存清单已保证新桶完整覆盖所需资源）。
const CACHE_NAME = `geek-cache-${VERSION}-${BUILD_ID}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        // cache:'reload' 强制绕过 HTTP 缓存，确保预缓存进来的就是本次构建的真实最新内容
        const manifestRes = await fetch(new Request('precache-manifest.json', { cache: 'reload' }));
        const manifest = await manifestRes.json();
        const files = Array.isArray(manifest.files) ? manifest.files : [];
        // 逐个预缓存：单个资源失败只记录、不阻断整体安装
        const results = await Promise.allSettled(
          files.map((url) => cache.add(new Request(url, { cache: 'reload' })))
        );
        const failed = results.filter((r) => r.status === 'rejected').length;
        console.log(`[SW] 版本 ${VERSION} 构建 ${BUILD_ID} 预缓存完成：${files.length - failed}/${files.length}`);
      } catch (err) {
        // 清单读取失败（如旧部署无此文件）不阻断安装：运行期 cacheFirst 仍会按需回填缓存
        console.warn('[SW] precache-manifest.json 读取失败，降级为运行期按需缓存', err);
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // 清理历史版本缓存（ios-sim-cache- 初代 / zeekr-cache- 误植代 / geek-cache- 旧版本），只保留当前 CACHE_NAME
      await Promise.all(
        keys.filter((k) => (k.startsWith('geek-cache-') || k.startsWith('zeekr-cache-') || k.startsWith('ios-sim-cache-')) && k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

/** 缓存优先：命中直接响应（零网络等待、离线秒开）；未命中回源并回填缓存 */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  // 1) 先查缓存；导航请求（HTML）未命中时再放宽 query 容错匹配一次
  //    （兼容 /?nolock=1 之类带参数打开页面的场景；哈希命名的静态资源无需容错）
  const cached =
    (await cache.match(request)) ||
    (request.mode === 'navigate' ? await cache.match(request, { ignoreSearch: true }) : undefined);
  if (cached) return cached;

  // 2) 缓存未命中 → 回源
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200 && fresh.type !== 'opaque') {
      // fix(v7.20) 防缓存投毒：跳过「响应 URL 与请求路径不一致」的回填。
      // fetch 默认跟随重定向（redirect:'follow'），跟随后的 Response.url 是最终 URL，
      // 若直接以原始请求 URL 为键入缓存，重定向目标的内容会被永久钉在旧路径下 ——
      // 旧路径后续命中即呈现错位文档（issue #2 白底板链路的一环：错误 base 的宿主
      // 文档由此续命）。正确语义：重定向内容留给重定向去解析，缓存只存路径一致的响应。
      let pathMismatch = false;
      try {
        if (fresh.url && request.url) {
          const fu = new URL(fresh.url);
          const ru = new URL(request.url);
          pathMismatch = fu.pathname !== ru.pathname;
        }
      } catch (e) { /* URL 解析异常按一致处理（不阻断缓存） */ }
      if (!pathMismatch) {
        // 回填缓存：写失败（如存储配额）吞掉异常，不影响本次响应
        cache.put(request, fresh.clone()).catch(() => {});
      }
    }
    return fresh;
  } catch (err) {
    // 3) 离线兜底：导航请求回退到应用外壳，保证离线仍能打开页面
    //    相对路径以 sw.js 所在目录为基准解析 —— 域名根路径与 GitHub Pages
    //    项目子路径（/<repo>/）部署下均能正确命中
    if (request.mode === 'navigate') {
      const shell = (await cache.match('index.html')) || (await cache.match('ios-desktop/index.html'));
      if (shell) return shell;
    }
    return new Response('离线且无缓存', { status: 503, statusText: 'Offline' });
  }
}

// fix(v7.37 全量审计)：跨源视觉资产（Google Fonts CSS/woff2）运行期缓存 ——
// 功能级第三方库已全部本地化（vendor/），页面仍保留的跨源只剩字体与素材图；
// 字体属「在线访问一次、离线保形」的静态资产，CacheFirst 后离线不再回退系统字体。
// 仅白名单两个字体域：css2 API 与 gstatic 字体文件均稳定带版本化 URL，内容不变。
const FONT_CACHE_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com']);

async function crossOriginFontCacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    // no-cors 模式（<link> 默认）得到 opaque 响应：status 0 合法，体可回放给页面
    const ok = fresh && (fresh.status === 200 || fresh.type === 'opaque');
    if (ok) cache.put(request, fresh.clone()).catch(() => {});
    return fresh;
  } catch (err) {
    return new Response('/* 字体离线且无缓存 */', { status: 503, headers: { 'Content-Type': 'text/css' } });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  // 跨源：仅拦截 Google Fonts 两域做 CacheFirst；其余跨源（数据 API 等）透传
  if (url.origin !== self.location.origin) {
    if (url.protocol === 'https:' && FONT_CACHE_HOSTS.has(url.hostname)) {
      event.respondWith(crossOriginFontCacheFirst(req));
    }
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // v7.52 安装包路由：优先于 cacheFirst（包内容只存在 IndexedDB，不进 HTTP 缓存层）
  const pkgMatch = url.pathname.match(PKG_ROUTE);
  if (pkgMatch) {
    event.respondWith(servePackage(pkgMatch[1], pkgMatch[2]));
    return;
  }

  event.respondWith(cacheFirst(req));
});

// 页面可主动发送 { type: 'SKIP_WAITING' } 消息，让新 SW 立即跳过等待接管页面
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  // v7.52 安装包：页面侧安装/卸载/覆盖后通知 SW 清空包记录内存缓存（下次请求重读 IDB）
  if (event.data && event.data.type === 'PKG_CHANGED') {
    try { pkgMemCache.clear(); } catch (e) {}
  }
});

// ==================== v7.52 安装包托管（/pkg/<appId>/<path> → IndexedDB） ====================
//
// 安装包（pkg-）应用的网页内容不存在于服务器磁盘，安装时整体存入 IndexedDB
//（库名 md3-installer，与页面侧 js/pkg/pkg-store.js 同库同 schema）。
// SW 以虚拟路径对外供文件：
//   - 相对路径引用（css/js/img）天然按 /pkg/<appId>/… 解析 → 包内任意目录结构零改写可用
//   - text/html 响应注入 pkg-sdk.js（沙箱 iframe 无法被宿主注入 SDK，见 pkg-sdk.js）
//   - Access-Control-Allow-Origin: * —— opaque origin 里包内 fetch/xhr 自己资源属跨源，
//     无 ACAO 会被 CORS 拦截
//
// 路由安全：强制三段式 /pkg/<appId>/<rest>（rest 非空）—— 源码版模块目录
// ios-desktop/js/pkg/*.js（无第三段）不会被误拦；appId 字符集在安装期已钳制
//（[a-z0-9][a-z0-9._-]*），无注入面。
const PKG_ROUTE = /\/pkg\/([a-z0-9][a-z0-9._-]*)\/(.+)$/;
const PKG_MEM_LIMIT = 12;
const pkgMemCache = new Map(); // appId → 记录（LRU 语义：set 后超限删最老键）

function pkgIdbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('md3-installer', 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('installed')) d.createObjectStore('installed', { keyPath: 'appId' });
      if (!d.objectStoreNames.contains('pending')) d.createObjectStore('pending', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('pkg IDB open failed'));
  });
}

async function pkgIdbGetInstalled(appId) {
  const d = await pkgIdbOpen();
  return new Promise((resolve, reject) => {
    const t = d.transaction('installed', 'readonly');
    const req = t.objectStore('installed').get(appId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error('pkg IDB get failed'));
  });
}

async function pkgGetRecord(appId) {
  if (pkgMemCache.has(appId)) return pkgMemCache.get(appId);
  try {
    const rec = await pkgIdbGetInstalled(appId);
    if (rec) {
      pkgMemCache.set(appId, rec);
      if (pkgMemCache.size > PKG_MEM_LIMIT) {
        const oldest = pkgMemCache.keys().next().value;
        pkgMemCache.delete(oldest);
      }
    }
    return rec;
  } catch (e) {
    return null;
  }
}

/** 包内路径 → Content-Type（与 js/pkg/pkg-manifest.js PKG_MIME 保持同值；SW 无法 import ESM） */
function pkgMime(path) {
  const ext = path.split('.').pop().toLowerCase();
  const table = {
    html: 'text/html; charset=utf-8', htm: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8', map: 'application/json; charset=utf-8',
    txt: 'text/plain; charset=utf-8', md: 'text/plain; charset=utf-8', xml: 'application/xml; charset=utf-8', csv: 'text/csv; charset=utf-8',
    svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon', bmp: 'image/bmp',
    woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
    wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg', m4a: 'audio/mp4', flac: 'audio/flac',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', wasm: 'application/wasm',
  };
  return table[ext] || 'application/octet-stream';
}

/** 沙箱 iframe 无法被宿主注入 SDK → 在 HTML 文档 <head> 最前注入 pkg-sdk.js */
function pkgInjectSDK(html) {
  let sdkURL;
  try { sdkURL = new URL('ios-desktop/js/pkg-sdk.js', self.registration.scope).href; }
  catch (e) { sdkURL = '/ios-desktop/js/pkg-sdk.js'; }
  const tag = '<script src="' + sdkURL + '"></script>';
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + tag);
  return tag + html;
}

/** 包内 HTML 的内容安全策略：封外联（仅 self/data/blob），内联与 eval 放行（网页包常态）。
 * 同源信任模型下收窄第三方请求面；子资源 css/js 同为 /pkg/ 同源路径不受影响。 */
const PKG_HTML_CSP = "default-src 'self' data: blob:; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
  "style-src 'self' 'unsafe-inline' data: blob:; " +
  "img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data: blob:; " +
  "connect-src 'self' data: blob:;";

async function servePackage(appId, rawPath) {
  let path = rawPath;
  try { path = decodeURIComponent(rawPath); } catch (e) { /* 保留原串 */ }
  if (path.endsWith('/')) path += 'index.html';
  if (path.includes('..') || path.includes('\0')) return pkg404(appId, rawPath);

  const rec = await pkgGetRecord(appId);
  if (!rec || !Array.isArray(rec.files)) return pkg404(appId, path);
  const file = rec.files.find((f) => f.path === path);
  if (!file) return pkg404(appId, path);

  const mime = pkgMime(path);
  const headers = {
    'Content-Type': mime,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  };
  if (mime.startsWith('text/html')) {
    headers['Content-Security-Policy'] = PKG_HTML_CSP;
    let html = '';
    try { html = await file.blob.text(); } catch (e) { return pkg404(appId, path); }
    return new Response(pkgInjectSDK(html), { status: 200, headers });
  }
  return new Response(file.blob, { status: 200, headers });
}

function pkg404(appId, path) {
  return new Response(JSON.stringify({ error: 'package file not found', appId, path }), {
    status: 404,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
