// probe-v83-reverse.mjs — 回程拖拽状态探针（定位 S10 反向交接失败根因后即删）
import { chromium } from 'playwright';
const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html?nolock=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const browser = await chromium.launch({
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => log('[pageerror]', e.message.slice(0, 200)));
await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
await sleep(2500);
await page.evaluate(() => document.querySelector('.power-dialog-card button[data-act="once"]')?.click());
await sleep(400);
for (let i = 0; i < 90; i++) {
  if (await page.evaluate(() => document.querySelectorAll('.qs-tile-pill').length > 0)) break;
  await sleep(500);
}

const snap = (tag) => page.evaluate((t) => {
  const col = document.getElementById('qsColumn');
  const qqs = document.querySelector('#qqsTilesContainer .qs-tile-pill');
  const grid = document.querySelector('#qsTilesContainer .qs-tile-pill');
  const track = document.getElementById('pullPanelsTrack');
  const R = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
  return `[${t}] colOp=${col.style.opacity}/${getComputedStyle(col).opacity} colVis=${col.style.visibility} morphing=${track.classList.contains('scene-morphing')} dragging=${track.classList.contains('dragging')} qqsOp=${JSON.stringify(qqs.style.opacity)} gridOp=${JSON.stringify(grid.style.opacity)} qqsRect=${R(qqs)} innerScrollTop=${document.getElementById('qsInnerScroll').scrollTop}`;
}, tag);
const hitAt = (x, y) => page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y);
  return `hit(${x},${y}) = ${el ? (el.id || el.className || el.tagName) + ' closestShade=' + !!el.closest('#shadeColumn') + ' closestInner=' + !!el.closest('#qsInnerScroll') : 'null'}`;
}, [x, y]);

// 正向：开面板 → 拉满 QS
await page.mouse.move(206, 8);
await page.mouse.down();
for (let y = 40; y <= 380; y += 30) { await page.mouse.move(206, y); await sleep(24); }
await sleep(600);
log(await snap('after-open+seg2'));
await page.mouse.up();
await sleep(900);
log(await snap('settled-QS'));

// 归零位（dy=0 无分支安全）→ 移到 700（场景 1 下向下移动无分支）→ 下压
await page.mouse.move(206, 8);
await sleep(100);
log(await snap('after-recenter'));
await page.mouse.move(206, 700);
await sleep(100);
log(await snap('after-move700') + ' | ' + await hitAt(206, 700));
await page.mouse.down();
await sleep(100);
log(await snap('after-down@700'));
await page.mouse.move(206, 471, { steps: 6 });
await sleep(150);
log(await snap('hold-p0.5') + ' | ' + await hitAt(206, 471));
await page.mouse.move(206, 348, { steps: 6 });
await sleep(150);
log(await snap('hold-TH'));
await page.mouse.up();
await sleep(300);
log(await snap('up+300ms'));
await sleep(800);
log(await snap('up+1100ms'));
log(await hitAt(206, 348));

await browser.close();
