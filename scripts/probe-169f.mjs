import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 9004;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 150)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);
const openApp = async (id) => { await page.evaluate((a) => { for (const ic of document.querySelectorAll('.app-icon')) if (ic.dataset.id === a) { ic.click(); return; } }, id); await sleep(1100); };
await openApp('notes');
const sample = async (label) => {
  const d = await page.evaluate(() => {
    const f = document.querySelector('#app-instance-notes iframe');
    let tag = 'noframe';
    try { tag = f && f.contentWindow ? (f.contentWindow.__tag ?? 'absent') : 'nowin'; } catch (e) { tag = 'err'; }
    return { tag };
  });
  console.log(label, JSON.stringify(d));
};
await page.evaluate(() => { const f = document.querySelector('#app-instance-notes iframe'); f.contentWindow.__tag = 'T1'; });
for (const t of ['sit+0', 'sit+1s', 'sit+2s', 'sit+3s', 'sit+5s']) { await sample(t); await sleep(t === 'sit+4s' ? 2000 : 1000); }
await openApp('calculator');
await sample('after-calc');
await openApp('notes');
await sample('back-notes');
await browser.close(); server.kill();
