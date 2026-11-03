// debug-hun-q2.mjs — Q2 钳制路径最小复现
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8961;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage();
page.on('console', (m) => { if (m.text().startsWith('[HUN]')) console.log('  BROWSER:', m.text()); });
page.on('pageerror', (e) => console.log('  PAGEERROR:', String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2000);
await page.evaluate(async () => { window.__notiMod = await import('/ios-desktop/js/notifications.js'); });

const dbg = () => page.evaluate(() => {
  const d = window.__headsUpDebug;
  return { count: d.count, alive: d.aliveCount, items: d.items(), states: d.states(), snoozeQ3: d.snoozed('q3-n1') };
});

// Q2 复现
await page.evaluate(() => window.__notiMod.addSystemNotification({ id: 'q2-n1', app: 'X', title: 'T', desc: 'D', time: '刚刚' }));
await sleep(1000);
console.log('before swipe:', JSON.stringify(await dbg()));
const box = await page.evaluate(() => {
  const el = document.querySelector('#headsUpStack .hun-banner');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
console.log('banner box:', JSON.stringify(box));
await page.mouse.move(box.x, box.y);
await page.mouse.down();
await page.mouse.move(box.x, box.y - 60, { steps: 5 });
await page.mouse.move(box.x, box.y - 130, { steps: 5 });
await page.mouse.up();
console.log('right after swipe (+30ms):', JSON.stringify(await dbg()));
await sleep(150);
console.log('+150ms:', JSON.stringify(await dbg()));
await sleep(400);
console.log('+550ms:', JSON.stringify(await dbg()));
await sleep(800);
console.log('+1350ms:', JSON.stringify(await dbg()));
await sleep(700);
console.log('+2050ms:', JSON.stringify(await dbg()));

await browser.close().catch(() => {});
server.kill();
process.exit(0);
