import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8979;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2200);
await page.evaluate(() => { const b = document.querySelector('.power-dialog-card button[data-act="once"]'); if (b) b.click(); });
await sleep(400);
for (let i = 0; i < 4; i++) { await page.evaluate(() => { const o = document.getElementById('md3PermissionOverlay'); if (o) { const g = o.querySelector('button[data-act="granted"]'); if (g) g.click(); else o.remove(); } const h = document.getElementById('headsUpStack'); if (h) h.remove(); }); await sleep(300); }
await page.evaluate(() => window.__navBar && window.__navBar.setEnabled(true));
await sleep(600);
// 打开 recents 并确认固定 msg
await page.evaluate(() => document.querySelector('.nvb-recents').click());
await sleep(900);
await page.click('#recentPinBtn');
await sleep(400);
await page.click('[data-sp="ok"]');
await sleep(900);
// 探针：捕获 click 细节
await page.evaluate(() => {
  window.__log = [];
  const home = document.querySelector('.nvb-home');
  ['pointerdown','pointerup','click'].forEach((t) => home.addEventListener(t, (e) => window.__log.push(t + ':' + e.detail), true));
  document.addEventListener('click', (e) => window.__log.push('doc-click:' + (e.target.closest?.('.nvb-btn')?.dataset.nvb || e.target.id || e.target.className.slice(0, 20))), true);
});
await sleep(1200);
await page.click('.nvb-home');
await sleep(150);
await page.evaluate(() => window.__log.push('toast:' + (document.getElementById('systemGlobalToast')?.textContent || 'none')));
console.log('LOG:', JSON.stringify(await page.evaluate(() => window.__log)));
console.log('pinned:', await page.evaluate(() => document.body.dataset.pinned));
await browser.close(); server.kill(); process.exit(0);
