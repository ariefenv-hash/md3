import { chromium } from 'playwright';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await sleep(1400);
await page.evaluate(() => document.querySelector('.power-dialog-card button[data-act="once"]')?.click());
await sleep(400);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]')?.click());
await sleep(1000);
await page.mouse.move(4, 400);
await page.mouse.down();
for (let x = 14; x <= 398; x += 24) { await page.mouse.move(x, 400); await sleep(18); }
const pre = await page.evaluate(() => window.__backPillDebug());
console.log('up 前 pill:', JSON.stringify(pre));
await page.mouse.up();
for (let i = 0; i < 8; i++) {
  const q = await page.evaluate(() => { const d = window.__qsDebug(); return { fling: d.fling, anim: d.flingAnim, isOpen: d.isOpen }; });
  console.log(i, JSON.stringify(q));
  if (!q.isOpen) break;
  await sleep(60);
}
await browser.close();
