// e2e-v767.mjs — v7.67 真实浏览器核验
// ① 手机 classic 平铺：多卡零重叠完整平铺 + 焦点卡居中 + 滑动翻页可见
// ② 平板 1280×800 tablet 网格：前台大卡居右 + 历史卡左侧两列网格
// ③ carousel 基线回归
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8095/ios-desktop/index.html?nolock=1';
const OUT = '/home/z/my-project/e2e-v767';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--force-device-scale-factor=2'] });

const probe = () => page.evaluate(() => {
  const cards = [...document.querySelectorAll('.recent-app-card')];
  return cards.map((c) => {
    const r = c.getBoundingClientRect();
    return {
      id: c.dataset.appId,
      opacity: getComputedStyle(c).opacity,
      x: Math.round(r.x), w: Math.round(r.width), y: Math.round(r.y), h: Math.round(r.height),
      ml: c.style.marginLeft,
      transform: c.style.transform,
    };
  });
});
let page;

// ============ 手机 390×844：classic 平铺 ============
console.log('===== ① phone 390x844 classic =====');
page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1200);

for (const id of ['clock', 'calculator', 'msg', 'settings']) {
  await page.evaluate((appId) => {
    const icon = document.querySelector(`.app-icon[data-id="${appId}"]`);
    if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
  }, id);
  await sleep(1400);
}

await page.evaluate(() => window.__desktopPrefs.set('recentsStyle', 'classic'));
await sleep(300);
await page.evaluate(() => { window.__openRecentApps && window.__openRecentApps(); });
await sleep(2000);
const classicCards = await probe();
console.log('classic cards:', JSON.stringify(classicCards.map(c => ({ id: c.id, x: c.x, w: c.w, ml: c.ml, op: c.opacity })), null, 0));
// 零重叠断言：按 x 排序后相邻可见卡不相交
const visible = classicCards.filter(c => c.x < 390 && c.x + c.w > 0);
let overlaps = 0;
const sorted = [...visible].sort((a, b) => a.x - b.x);
for (let i = 1; i < sorted.length; i++) {
  if (sorted[i].x < sorted[i - 1].x + sorted[i - 1].w - 1) overlaps++;
}
console.log('visible cards:', visible.length, '| overlaps:', overlaps);
// 焦点卡居中：x ≈ (390-171)/2 = 109.5
console.log('focus card x (expect ~110):', classicCards[0].x);
await page.screenshot({ path: `${OUT}/1-phone-classic.png` });

// 滑动翻一页（真实手势：拖 190px）
await page.mouse.move(300, 400);
await page.mouse.down();
for (let i = 1; i <= 8; i++) { await page.mouse.move(300 - i * 24, 400); await sleep(16); }
await page.mouse.up();
await sleep(900);
const afterSwipe = await probe();
console.log('after swipe focus x (idx0 off-center → 左侧):', afterSwipe[0].x, '| idx1 x:', afterSwipe[1].x);
await page.screenshot({ path: `${OUT}/2-phone-classic-swiped.png` });
await page.evaluate(() => { window.__closeRecentApps && window.__closeRecentApps({ resumeSuspended: false }); });
await page.close();

// ============ 平板 1280×800：tablet 网格 ============
console.log('===== ② tablet 1280x800 tablet-grid =====');
page = await browser.newPage({ viewport: { width: 1280, height: 800 }, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1400);
for (const id of ['clock', 'calculator', 'msg', 'game2048', 'settings']) {
  await page.evaluate((appId) => {
    const icon = document.querySelector(`.app-icon[data-id="${appId}"]`);
    if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
  }, id);
  await sleep(1200);
}
await page.evaluate(() => window.__desktopPrefs.set('recentsStyle', 'tablet'));
await sleep(300);
await page.evaluate(() => { window.__openRecentApps && window.__openRecentApps(); });
await sleep(2000);
const tabletCards = await probe();
console.log('tablet cards:', JSON.stringify(tabletCards.map(c => ({ id: c.id, x: c.x, y: c.y, w: c.w, h: c.h, op: c.opacity })), null, 0));
const focus = tabletCards[0];
const grid = tabletCards.slice(1);
const inGridLeft = grid.every(c => c.x + c.w <= focus.x + 2);
const twoCols = Math.abs(grid[0].y - grid[1].y) < 2 && grid[0].x !== grid[1].x;
console.log('focus right-edge ok:', focus.x + focus.w <= 1280, '| all grid left of focus:', inGridLeft, '| row1 two cols:', twoCols);
await page.screenshot({ path: `${OUT}/3-tablet-grid.png` });

// 点击网格历史卡直接启动
await page.evaluate(() => { window.__closeRecentApps && window.__closeRecentApps({ resumeSuspended: false }); });
await sleep(600);
await page.evaluate(() => { window.__openRecentApps && window.__openRecentApps(); });
await sleep(1500);
const gridCard = await page.evaluate(() => {
  const c = document.querySelectorAll('.recent-app-card')[2]; // msg
  const r = c.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: c.dataset.appId };
});
await page.mouse.click(gridCard.x, gridCard.y);
await sleep(1500);
const launched = await page.evaluate(() => {
  const win = document.getElementById('appWindow');
  return { open: win.classList.contains('open'), overlayGone: !document.getElementById('recentAppsOverlay').classList.contains('active') };
});
console.log('grid card click → direct launch:', gridCard.id, JSON.stringify(launched));
await page.screenshot({ path: `${OUT}/4-tablet-grid-launch.png` });
await page.evaluate(() => window.__desktopPrefs.set('recentsStyle', 'carousel'));
await page.close();

// ============ carousel 基线回归（手机） ============
console.log('===== ③ phone carousel baseline =====');
page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1200);
for (const id of ['calculator', 'settings']) {
  await page.evaluate((appId) => {
    const icon = document.querySelector(`.app-icon[data-id="${appId}"]`);
    if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
  }, id);
  await sleep(1400);
}
await page.evaluate(() => { window.__openRecentApps && window.__openRecentApps(); });
await sleep(2000);
const car = await probe();
console.log('carousel t0:', car[0].transform, '| t1:', car[1].transform);
await page.screenshot({ path: `${OUT}/5-phone-carousel.png` });
await page.evaluate(() => { window.__closeRecentApps && window.__closeRecentApps({ resumeSuspended: false }); });
await page.close();

await browser.close();
console.log('\nDONE');
