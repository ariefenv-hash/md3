import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 9005;
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
// calc 先开，notes 后开 → 看 calc 是否重载
await openApp('calculator');
await page.evaluate(() => { const f = document.querySelector('#app-instance-calculator iframe'); if (f && f.contentWindow) f.contentWindow.__tag = 'CT1'; });
await openApp('notes');
const d = await page.evaluate(() => {
  const out = {};
  const fc = document.querySelector('#app-instance-calculator iframe');
  try { out.calcTag = fc && fc.contentWindow ? (fc.contentWindow.__tag ?? 'absent') : 'nof'; } catch (e) { out.calcTag = 'err'; }
  const fn = document.querySelector('#app-instance-notes iframe');
  try { out.notesTag = fn && fn.contentWindow ? (fn.contentWindow.__tag ?? 'absent') : 'nof'; } catch (e) { out.notesTag = 'err'; }
  out.iframes = [...document.querySelectorAll('iframe')].map((f) => (f.closest('[id]') && f.closest('[id]').id) || f.id);
  return out;
});
console.log('calc-first:', JSON.stringify(d));
await openApp('calculator');
const d2 = await page.evaluate(() => {
  const fc = document.querySelector('#app-instance-calculator iframe');
  try { return { calcTag: fc && fc.contentWindow ? (fc.contentWindow.__tag ?? 'absent') : 'nof' }; } catch (e) { return { calcTag: 'err' }; }
});
console.log('back-calc:', JSON.stringify(d2));
await browser.close(); server.kill();
