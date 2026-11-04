import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 9003;
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
await page.evaluate(() => {
  const f = document.querySelector('#app-instance-notes iframe');
  f.contentWindow.__tag = 'T1';
  f.__elTag = 'EL1'; // 元素 expando
  window.__elRef = f; // 强引用节点身份
});
await openApp('calculator');
const s = async (label) => {
  const d = await page.evaluate(() => {
    const f = document.querySelector('#app-instance-notes iframe');
    let t = null, elT = null, same = false;
    try { t = f && f.contentWindow ? f.contentWindow.__tag : 'nof'; } catch (e) { t = 'err'; }
    try { elT = f && f.__elTag; same = f === window.__elRef; } catch (e) {}
    const n = document.getElementById('app-instance-notes');
    return { t, elT, same, display: n ? getComputedStyle(n).display : 'no-el' };
  });
  console.log(label, JSON.stringify(d));
};
await s('t+0:');
await sleep(300); await s('t+300:');
await sleep(500); await s('t+800:');
await sleep(1000); await s('t+1800:');
await browser.close(); server.kill();
