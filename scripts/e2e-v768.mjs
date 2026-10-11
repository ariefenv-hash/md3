// e2e-v768.mjs — v7.68 平板 Overview AOSP 同构精修 真实浏览器核验
// ① 平板 1280×800 · 3 卡（未收缩路径）：焦点卡垂直居中 + 两排恒在 + 右端贴焦点卡 + 带顶/带底对齐 + 动作行贴卡
// ② 平板 1280×800 · 7 卡（收缩路径）：全卡可见（左缘不出 margin）+ 两排带中心对称
// ③ 手机 390×844 classic 回归（动作行保持常规流式）
// ④ 手机 carousel 基线 + 平板网格卡点击直启
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8095/ios-desktop/index.html?nolock=1';
const OUT = '/home/z/my-project/e2e-v768';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--force-device-scale-factor=2'] });
// 预置权限存储（页面脚本运行前）：weather 定位 = denied → 天气应用不再弹权限假弹窗
const seedPerm = (pg) => pg.addInitScript(() => {
  try {
    const store = JSON.parse(localStorage.getItem('ios-desktop:permissions') || '{}');
    store.weather = Object.assign({ __name: '天气' }, store.weather, { location: false });
    localStorage.setItem('ios-desktop:permissions', JSON.stringify(store));
  } catch (e) {}
});
let page;
let failures = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!cond) failures++;
};

const probe = () => page.evaluate(() => {
  const cards = [...document.querySelectorAll('.recent-app-card')];
  return cards.map((c) => {
    const r = c.getBoundingClientRect();
    return { id: c.dataset.appId, x: r.x, y: r.y, w: r.width, h: r.height, op: getComputedStyle(c).opacity, tf: c.style.transform };
  });
});
const actionsProbe = () => page.evaluate(() => {
  const a = document.getElementById('recentActionsRow');
  const r = a.getBoundingClientRect();
  return { position: a.style.position, top: a.style.top, right: a.style.right, x: r.x, y: r.y, w: r.width, h: r.height };
});

const launchApps = async (ids) => {
  for (const id of ids) {
    await page.evaluate((appId) => {
      const icon = document.querySelector(`.app-icon[data-id="${appId}"]`);
      if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
    }, id);
    await sleep(1200);
  }
};
const openTablet = async () => {
  await page.evaluate(() => window.__desktopPrefs.set('recentsStyle', 'tablet'));
  await sleep(300);
  await page.evaluate(() => { window.__openRecentApps && window.__openRecentApps(); });
  await sleep(2000);
};
/** 全清后台（真实 UI 路径）→ 精确控制卡片数 */
const resetRecents = async () => {
  await page.evaluate(() => { window.__openRecentApps && window.__openRecentApps(); });
  await sleep(1200);
  await page.evaluate(() => document.getElementById('recentClearAllBtn')?.click());
  await sleep(900);
  await page.evaluate(() => { window.__closeRecentApps && window.__closeRecentApps({ resumeSuspended: false }); });
  await sleep(500);
};

// ============ ① 平板 1280×800 · 3 卡（未收缩） ============
console.log('===== ① tablet 1280x800, 3 apps (unshrunk band) =====');
page = await browser.newPage({ viewport: { width: 1280, height: 800 }, isMobile: true, hasTouch: true });
seedPerm(page);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1400);
await resetRecents();
await launchApps(['calculator', 'msg', 'game2048']);
await openTablet();
let cards = await probe();
console.log('cards:', JSON.stringify(cards.map(c => ({ id: c.id, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.w), h: Math.round(c.h) })), null, 0));
const [f, g1, g2] = cards;
const focusCY = f.y + f.h / 2;
// 焦点卡垂直居中：卡中心 y ≈ 视口中线略上（deck 86% 视口 + 动作行占位 → 中心 ≈ 344/800 视觉带）
check('焦点卡垂直居中于 deck（中心 ≈ 340-420px）', focusCY > 300 && focusCY < 460, `focusCY=${Math.round(focusCY)}`);
check('焦点卡右缘收 margin（≈ 1254）', Math.abs(f.x + f.w - (1280 - 32)) < 8, `right=${Math.round(f.x + f.w)}`);
// 两排：g1 上排 / g2 下排，同列（x 相同）、右缘贴焦点卡左缘
check('恒两排（g1 上 g2 下，x 同列）', Math.abs(g1.x - g2.x) < 2 && g2.y > g1.y, `g1.y=${Math.round(g1.y)} g2.y=${Math.round(g2.y)}`);
const focusLeft = f.x;
check('网格右端贴焦点卡（g1 右缘 ≈ 焦点卡左缘 - 24）', Math.abs(g1.x + g1.w - (focusLeft - 24)) < 10, `gridRight=${Math.round(g1.x + g1.w)} focusLeft=${Math.round(focusLeft)}`);
// AOSP 带对齐：两排 + 行距 = 焦点卡高；带顶 = 焦点卡顶、带底 = 焦点卡底
const bandH = g2.y + g2.h - g1.y;
check('两排 + 行距 = 焦点卡高（bandH ≈ focusH）', Math.abs(bandH - f.h) < 6, `bandH=${Math.round(bandH)} focusH=${Math.round(f.h)}`);
check('带顶对齐焦点卡顶', Math.abs(g1.y - f.y) < 6, `gridTop=${Math.round(g1.y)} focusTop=${Math.round(f.y)}`);
check('带底对齐焦点卡底', Math.abs(g2.y + g2.h - (f.y + f.h)) < 6, `gridBottom=${Math.round(g2.y + g2.h)} focusBottom=${Math.round(f.y + f.h)}`);
check('网格卡 = 焦点卡 ÷2 高（等比微缩）', Math.abs(g1.h - (f.h - 14) / 2) < 6, `cellH=${Math.round(g1.h)} expect=${Math.round((f.h - 14) / 2)}`);
check('全卡不透明', cards.every(c => c.op === '1'));
// 动作行贴焦点卡正下方
const act = await actionsProbe();
check('动作行 absolute + 右缘对齐焦点卡', act.position === 'absolute' && Math.abs(act.x + act.w - (f.x + f.w)) < 12, JSON.stringify({ x: Math.round(act.x), w: Math.round(act.w), right: act.right }));
check('动作行 top = 带底 + 14', Math.abs(act.y - (f.y + f.h + 14)) < 10, `actY=${Math.round(act.y)} bandBottom=${Math.round(f.y + f.h)}`);
await page.screenshot({ path: `${OUT}/1-tablet-3cards.png` });
await page.evaluate(() => { window.__closeRecentApps && window.__closeRecentApps({ resumeSuspended: false }); });
await sleep(500);

// 网格卡点击直启（回归）
await openTablet();
const gridCard = await page.evaluate(() => {
  const c = document.querySelectorAll('.recent-app-card')[2];
  const r = c.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: c.dataset.appId };
});
await page.mouse.click(gridCard.x, gridCard.y);
await sleep(1500);
const launched = await page.evaluate(() => {
  const win = document.getElementById('appWindow');
  return { open: win.classList.contains('open'), overlayGone: !document.getElementById('recentAppsOverlay').classList.contains('active') };
});
check('网格卡点击直启', launched.open && launched.overlayGone, `${gridCard.id} ${JSON.stringify(launched)}`);
await page.screenshot({ path: `${OUT}/2-tablet-launch.png` });
await page.close();

// ============ ② 平板 1280×800 · 7 卡（收缩路径） ============
console.log('===== ② tablet 1280x800, 7 apps (width-fit shrink) =====');
page = await browser.newPage({ viewport: { width: 1280, height: 800 }, isMobile: true, hasTouch: true });
seedPerm(page);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1400);
await launchApps(['clock', 'calculator', 'msg', 'game2048', 'settings', 'weather', 'music']);
// 天气应用可能弹位置权限假弹窗 → 驱逐后截图不被遮挡
await sleep(600);
await openTablet();
cards = await probe();
console.log('cards:', JSON.stringify(cards.map(c => ({ id: c.id, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.w), h: Math.round(c.h) })), null, 0));
const f7 = cards[0];
const grid7 = cards.slice(1);
const margin = 32;
check('7+ 卡：全部可见（左缘 ≥ margin - 2）', grid7.every(c => c.x >= margin - 2), `minX=${Math.round(Math.min(...grid7.map(c => c.x)))}`);
check('7+ 卡：无卡出右界（网格全部在焦点卡左侧）', grid7.every(c => c.x + c.w <= f7.x + 2));
// 两排对称：上/下排 + 带中心 = 焦点卡中心
const topRow = grid7.filter(c => Math.abs(c.y - grid7[0].y) < 3);
const botRow = grid7.filter(c => Math.abs(c.y - grid7[1].y) < 3);
check('恒两排（top+bottom = 全部网格卡）', topRow.length + botRow.length === grid7.length, `top=${topRow.length} bottom=${botRow.length} total=${grid7.length}`);
check('上下排各 ≤ ceil(n/2)', topRow.length <= Math.ceil(grid7.length / 2) && botRow.length <= Math.ceil(grid7.length / 2));
const bandCenter7 = (topRow[0].y + botRow[0].y + botRow[0].h) / 2;
check('两排带中心 = 焦点卡中心（垂直居中）', Math.abs(bandCenter7 - (f7.y + f7.h / 2)) < 8, `bandC=${Math.round(bandCenter7)} focusC=${Math.round(f7.y + f7.h / 2)}`);
// 收缩后行宽恰 = gridW：最左卡左缘 ≈ margin（解方程精确）
check('收缩解方程：最左卡左缘 ≈ margin', Math.abs(Math.min(...grid7.map(c => c.x)) - margin) < 6, `minX=${Math.round(Math.min(...grid7.map(c => c.x)))}`);
// 天气应用的位置权限假弹窗若在，驱逐（拒绝）后截干净图
await page.evaluate(() => {
  const deny = [...document.querySelectorAll('button[data-act="denied"]')].pop();
  if (deny) deny.click();
});
await sleep(500);
await page.screenshot({ path: `${OUT}/3-tablet-7cards.png` });
await page.close();

// ============ ③ 手机 390×844 classic 回归 ============
console.log('===== ③ phone 390x844 classic (actions row normal flow) =====');
page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
seedPerm(page);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1200);
await launchApps(['clock', 'calculator', 'msg']);
await page.evaluate(() => window.__desktopPrefs.set('recentsStyle', 'classic'));
await sleep(300);
await page.evaluate(() => { window.__openRecentApps && window.__openRecentApps(); });
await sleep(1800);
cards = await probe();
const actC = await actionsProbe();
check('classic：动作行常规流式（position 为空）', actC.position === '', `position='${actC.position}'`);
check('classic：焦点卡居中（x ≈ 110）', Math.abs(cards[0].x - 109.5) < 3, `x=${Math.round(cards[0].x)}`);
check('classic：多卡零重叠', (() => {
  const vis = cards.filter(c => c.x < 390 && c.x + c.w > 0).sort((a, b) => a.x - b.x);
  for (let i = 1; i < vis.length; i++) if (vis[i].x < vis[i - 1].x + vis[i - 1].w - 1) return false;
  return true;
})());
await page.screenshot({ path: `${OUT}/4-phone-classic.png` });
await page.evaluate(() => { window.__closeRecentApps && window.__closeRecentApps({ resumeSuspended: false }); });
await page.close();

// ============ ④ 手机 carousel 基线 ============
console.log('===== ④ phone carousel baseline =====');
page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
seedPerm(page);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1200);
await launchApps(['calculator', 'settings']);
await page.evaluate(() => { window.__openRecentApps && window.__openRecentApps(); });
await sleep(1800);
cards = await probe();
check('carousel：焦点卡居中 + 侧卡 rotateY 在场', Math.abs(cards[0].x - (390 - cards[0].w) / 2) < 4 && /rotateY/.test(cards[1]?.tf || ''), `x=${Math.round(cards[0].x)} tf=${cards[1]?.tf}`);
await page.screenshot({ path: `${OUT}/5-phone-carousel.png` });
await page.close();

await browser.close();
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
