// diag-sw-reg-r39.mjs — 临时诊断（不入库）：本地 dist SW 注册失败原因
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let fp = path.join(distDir, decodeURIComponent((req.url || '/').split('?')[0]));
  try { const d = readFileSync(fp); res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); }
  catch { res.writeHead(404); res.end('404'); }
});
await new Promise((r) => server.listen(8091, '127.0.0.1', r));

const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext()).newPage();
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 160)));
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 160)));
await page.addInitScript(() => {
  const orig = navigator.serviceWorker.register.bind(navigator.serviceWorker);
  navigator.serviceWorker.register = function (...a) {
    console.log('[dbg] register called: ' + a.join(' '));
    return orig(...a).then((r) => { console.log('[dbg] register ok'); return r; }).catch((e) => { console.log('[dbg] register ERR ' + String(e)); throw e; });
  };
  window.addEventListener('load', () => console.log('[dbg] window load fired, webdriver=' + navigator.webdriver + ' search=' + location.search));
});
await page.goto('http://127.0.0.1:8091/?swtest=1', { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 5000));
const out = await page.evaluate(async () => {
  const g1 = await navigator.serviceWorker.getRegistration();
  const g2 = await navigator.serviceWorker.getRegistration('./');
  const all = await navigator.serviceWorker.getRegistrations();
  const ready = await navigator.serviceWorker.ready.then((r) => 'ready-scope:' + r.scope).catch((e) => 'ready-err ' + String(e).slice(0, 80));
  const cacheKeys = await caches.keys();
  return { g1: !!g1, g2: !!g2, allCount: all.length, allScopes: all.map((r) => r.scope), ready, cacheKeys, controller: !!navigator.serviceWorker.controller };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
server.close();
