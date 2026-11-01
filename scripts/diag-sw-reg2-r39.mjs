// diag-sw-reg2-r39.mjs — 最小探针：无钩子，纯读注册状态 + 服务器请求计数
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.css': 'text/css', '.png': 'image/png' };
let reqCount = 0;
const server = http.createServer((req, res) => {
  reqCount++;
  let fp = path.join(distDir, decodeURIComponent((req.url || '/').split('?')[0]));
  try { const d = readFileSync(fp); res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }
  catch { res.writeHead(404); res.end('404'); }
});
await new Promise((r) => server.listen(8092, '127.0.0.1', r));

const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext()).newPage();
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 120)));
await page.goto('http://127.0.0.1:8092/?swtest=1', { waitUntil: 'load', timeout: 30000 });
console.log('goto done, server reqs so far:', reqCount);

for (let i = 0; i < 8; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  const st = await page.evaluate(async () => {
    const all = await navigator.serviceWorker.getRegistrations();
    const reg = all[0];
    return {
      allCount: all.length,
      scope: reg?.scope,
      installing: reg?.installing?.state || null,
      waiting: reg?.waiting?.state || null,
      active: reg?.active?.state || null,
      controller: !!navigator.serviceWorker.controller,
      cacheKeys: await caches.keys(),
    };
  }).catch((e) => ({ evalErr: String(e).slice(0, 120) }));
  console.log(`t+${(i + 1) * 3}s reqs=${reqCount}`, JSON.stringify(st));
  if (st.active === 'activated') break;
}
await browser.close();
server.close();
console.log('final server reqs:', reqCount);
