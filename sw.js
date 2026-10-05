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

const VERSION = 'geek-v53-cacheFirst';
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

  event.respondWith(cacheFirst(req));
});

// 页面可主动发送 { type: 'SKIP_WAITING' } 消息，让新 SW 立即跳过等待接管页面
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
