// e2e-v767-classic-repro.mjs — v7.67 复现：classic 平铺从应用退后台只显示一张卡片
// 路径：打开多个应用 → 在最后一个应用内唤出后台（zoomToCard 路径）
// 对比 carousel 与 classic 两种模式下邻卡最终 opacity/transform/可见矩形
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8095/ios-desktop/index.html?nolock=1';
const OUT = '/home/z/my-project/e2e-v767';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--force-device-scale-factor=2'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 160)); });

await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1200);

// 打开三个应用制造后台卡片
for (const id of ['clock', 'calculator', 'settings']) {
  await page.evaluate((appId) => {
    const icon = document.querySelector(`.app-icon[data-id="${appId}"]`);
    if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
  }, id);
  await sleep(1500);
}

const probe = () => page.evaluate(() => {
  const cards = [...document.querySelectorAll('.recent-app-card')];
  return {
    count: cards.length,
    cards: cards.map((c) => {
      const r = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      return {
        id: c.dataset.appId,
        opacity: cs.opacity,
        vis: cs.visibility,
        display: cs.display,
        transform: c.style.transform,
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        zIndex: c.style.zIndex,
        pe: c.style.pointerEvents,
      };
    }),
    deckH: document.getElementById('recentCardsDeck')?.style.height,
    containerW: document.querySelector('.recent-apps-container')?.getBoundingClientRect().width,
  };
});

for (const mode of ['carousel', 'classic']) {
  console.log(`\n===== MODE: ${mode} =====`);
  // 先回桌面干净态
  await page.evaluate(() => { window.__closeRecentApps && window.__closeRecentApps({ resumeSuspended: false }); });
  await sleep(600);
  await page.evaluate((m) => window.__desktopPrefs.set('recentsStyle', m), mode);
  await sleep(300);

  // 打开最后一个应用（settings 应已在屏，直接唤后台 = zoomToCard 路径）
  await page.evaluate(() => {
    const icon = document.querySelector('.app-icon[data-id="settings"]');
    if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
  });
  await sleep(1500);
  // 从应用内唤出后台（真实手势路径同 gestures.js → __openRecentApps）
  await page.evaluate(() => { window.__openRecentApps && window.__openRecentApps(); });
  await sleep(500);
  const mid = await probe();
  console.log('mid(+500ms):', JSON.stringify(mid, null, 0));
  await sleep(1400);
  const settled = await probe();
  console.log('settled(+1.9s):', JSON.stringify(settled, null, 0));
  await page.screenshot({ path: `${OUT}/${mode}-settled.png` });

  // 逐帧抓入场过程：邻卡 opacity 时间线
  await page.evaluate(() => { window.__closeRecentApps && window.__closeRecentApps({ resumeSuspended: false }); });
  await sleep(700);
  await page.evaluate(() => {
    const icon = document.querySelector('.app-icon[data-id="settings"]');
    if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
  });
  await sleep(1300);
  await page.evaluate(() => { window.__openRecentApps && window.__openRecentApps(); });
  const timeline = [];
  for (let i = 0; i < 14; i++) {
    const t = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.recent-app-card')];
      return cards.map((c) => `${c.dataset.appId}:${getComputedStyle(c).opacity}`).join(' ');
    });
    timeline.push(`t+${i * 120}ms ${t}`);
    await sleep(120);
  }
  console.log('opacity timeline:\n  ' + timeline.join('\n  '));
}

await browser.close();
console.log('\nDONE');
