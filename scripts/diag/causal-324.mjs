import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
const PORT = 8113;
const distDir = '/home/z/my-project/md3-repo/dist';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let fp = path.join(distDir, urlPath);
  if (!fp.startsWith(distDir)) { res.writeHead(403); res.end(); return; }
  if (statSync(fp, { throwIfNoEntry: false })?.isDirectory()) fp = path.join(fp, 'index.html');
  try { res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(readFileSync(fp)); }
  catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('404'); } }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
await page.goto(`http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await page.evaluate(async () => { const base = location.pathname.replace(/index\.html.*$/, ''); const _chunkUrl = await (async () => {
        const base = location.pathname.replace(/index\.html.*$/, '');
        const m = await (await fetch(base + '../precache-manifest.json')).json();
        const u = JSON.stringify(Object.values(m).flat()).match(/assets\/split-screen-[A-Za-z0-9_-]+\.js/)[0];
        return base + '../' + u;
      })();
      await import(_chunkUrl);; });
await page.evaluate(() => window.__splitE2E.enter('files', 'notes'));
await page.waitForTimeout(1600);
await page.evaluate(() => { const p = [...document.querySelectorAll('.split-pane')].find((q) => q.querySelector('.fj-app')); const b = p && p.querySelector('#fjBtnSort'); if (b) b.click(); });
await page.waitForTimeout(700);
const info = await page.evaluate(() => {
  const panes = [...document.querySelectorAll('.split-pane')];
  return panes.map((p, i) => ({ i, app: (p.dataset.appId || p.getAttribute('data-app') || (p.querySelector('.fj-app') ? 'files' : 'notes')), dom: [...p.parentElement.children].indexOf(p) }));
});
console.log('panes:', JSON.stringify(info));
// 基线采样
let s1 = await page.evaluate(() => { const c = document.createElement('canvas'); return null; });
// 直接用 screenshot 对比：关掉非 files 窗格的 box-shadow 前后各拍一张
await page.screenshot({ path: '/tmp/diag324/C-before.png', clip: { x: 250, y: 540, width: 320, height: 120 } });
await page.evaluate(() => {
  const panes = [...document.querySelectorAll('.split-pane')];
  const filesPane = panes.find((p) => p.querySelector('.fj-app'));
  const other = panes.find((p) => p !== filesPane);
  other.style.boxShadow = 'none';
});
await page.waitForTimeout(250);
await page.screenshot({ path: '/tmp/diag324/C-after.png', clip: { x: 250, y: 540, width: 320, height: 120 } });
console.log('因果实验截图 → /tmp/diag324/C-before.png / C-after.png');
await browser.close(); server.close();
