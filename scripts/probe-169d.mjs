import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 9002;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 150)));
page.on('console', (m) => { const t = m.text(); if (/notes|iframe|reload/i.test(t)) console.log('C:', t.slice(0, 130)); });
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);
const openApp = async (id) => { await page.evaluate((a) => { for (const ic of document.querySelectorAll('.app-icon')) if (ic.dataset.id === a) { ic.click(); return; } }, id); await sleep(1100); };
await openApp('notes');
const h = await page.evaluate(() => {
  const f = document.querySelector('#app-instance-notes iframe');
  f.contentWindow.__tag = 'first';
  return { tag: f.contentWindow.__tag, frames: document.querySelectorAll('iframe').length };
});
console.log('hook:', JSON.stringify(h));
await openApp('calculator');
const d = await page.evaluate(() => {
  const frames = [...document.querySelectorAll('iframe')].map((f) => {
    let tag = null; try { tag = f.contentWindow.__tag || null; } catch (e) {}
    return { id: f.id || (f.closest('[id]') && f.closest('[id]').id), tag, src: (f.getAttribute('src') || '').slice(-22) };
  });
  const n = document.querySelector('#app-instance-notes iframe');
  return { frames, notesTag: n && n.contentWindow ? (n.contentWindow.__tag || 'absent') : 'no-frame' };
});
console.log('after-calc:', JSON.stringify(d, null, 1));
await browser.close();
server.kill();
