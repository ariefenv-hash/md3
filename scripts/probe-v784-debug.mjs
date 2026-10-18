// probe-v784-debug.mjs — 诊断场景轨 tween 与 squish 停滞
import { chromium } from 'playwright';
const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8791/md3/ios-desktop/index.html?nolock=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 200)));
await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
await sleep(2500);
await page.evaluate(() => document.querySelector('.power-dialog-card button[data-act="once"]')?.click());
await sleep(400);
for (let i = 0; i < 90; i++) {
  if (await page.evaluate(() => document.querySelectorAll('.qs-tile-pill').length > 0)) break;
  await sleep(500);
}

// 段一拉满
await page.mouse.move(206, 8);
await page.mouse.down();
for (let y = 40; y <= 340; y += 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.up();
await sleep(1000);
console.log('after seg1:', await page.evaluate(() => ({
  squish: document.getElementById('pullPanelsTrack').style.getPropertyValue('--qs-squish'),
  track: document.getElementById('pullPanelsTrack').style.transform,
})));

// 段二：从 y=400 拖到 700
await page.mouse.move(206, 400);
await page.mouse.down();
for (let y = 430; y <= 700; y += 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.up();
for (const t of [100, 250, 400, 700, 1000]) {
  await sleep(t === 100 ? 100 : t - (t === 250 ? 100 : t === 400 ? 250 : t === 700 ? 400 : 700));
  console.log(`t=${t}ms:`, await page.evaluate(() => ({
    track: document.getElementById('pullPanelsTrack').style.transform,
    trans: document.getElementById('pullPanelsTrack').style.transition,
    squish: document.getElementById('pullPanelsTrack').style.getPropertyValue('--qs-squish'),
  })));
}

// 磁贴圆角/激活态
console.log('tiles:', await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('#qsTilesContainer .qs-tile-pill').forEach((p, i) => {
    if (i > 3) return;
    out.push({ id: p.dataset.tileId, active: p.classList.contains('active'), r: getComputedStyle(p).borderRadius });
  });
  return out;
}));
await browser.close();
