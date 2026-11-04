import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 9001;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);
const openApp = async (id) => { await page.evaluate((a) => { for (const ic of document.querySelectorAll('.app-icon')) if (ic.dataset.id === a) { ic.click(); return; } }, id); await sleep(1100); };
await openApp('notes');
const h = await page.evaluate(() => {
  const f = document.querySelector('#app-instance-notes iframe');
  const s = f && f.contentWindow && f.contentWindow.__system;
  if (s) { f.contentWindow.__lcLog = []; s.on('system/lifecycle', (p) => f.contentWindow.__lcLog.push(p)); }
  return { sysOk: !!s, loaded: f ? f.dataset.loaded : null };
});
console.log('hook:', JSON.stringify(h));
await openApp('calculator');
const d = await page.evaluate(() => {
  const n = document.getElementById('app-instance-notes');
  const f = document.querySelector('#app-instance-notes iframe');
  return {
    frozen: n ? n.dataset.frozen : 'no-el',
    lcLog: (f && f.contentWindow && f.contentWindow.__lcLog) || 'no-log',
    loaded: f ? f.dataset.loaded : null,
  };
});
console.log('after-calc:', JSON.stringify(d));
await sleep(2000);
const d2 = await page.evaluate(() => {
  const f = document.querySelector('#app-instance-notes iframe');
  return { lcLog: (f && f.contentWindow && f.contentWindow.__lcLog) || 'no-log' };
});
console.log('after-2s:', JSON.stringify(d2));
await browser.close();
server.kill();
