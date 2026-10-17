import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
await page.goto('http://localhost:8099/ios-desktop/index.html?nolock=1', { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1800);
// 打开 QS
await page.evaluate(() => { const m = document.querySelector('.pull-panels-overlay'); });
await page.evaluate(() => { import('/ios-desktop/js/pull-down-gesture.js').then((m) => m.openPullPanel(1)).catch(() => {}); });
await page.waitForTimeout(1200);
const data = await page.evaluate(() => {
  const out = {};
  for (const id of ['internet', 'modes', 'bluetooth']) {
    const pill = document.querySelector(`.qs-tile-pill[data-tile-id="${id}"]`);
    if (!pill) continue;
    const pr = pill.getBoundingClientRect();
    const sub = pill.querySelector('.qs-tile-sub');
    const txt = pill.querySelector('.qs-tile-text');
    const sr = sub ? sub.getBoundingClientRect() : null;
    const tr = txt ? txt.getBoundingClientRect() : null;
    out[id] = {
      pill: { top: Math.round(pr.top), bottom: Math.round(pr.bottom), h: Math.round(pr.height) },
      text: tr ? { top: Math.round(tr.top), bottom: Math.round(tr.bottom) } : null,
      sub: sr ? { top: Math.round(sr.top), bottom: Math.round(sr.bottom), h: Math.round(sr.height) } : null,
      subOverflow: sr ? Math.round(sr.bottom - pr.bottom) : null,
      overflowY: getComputedStyle(pill).overflowY,
      textStyle: txt ? { lineHeight: getComputedStyle(txt).lineHeight, fontSize: getComputedStyle(txt).fontSize } : null,
    };
  }
  return out;
});
console.log(JSON.stringify(data, null, 1));
await browser.close();
