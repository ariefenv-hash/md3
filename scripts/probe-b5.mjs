import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0,140)));
await page.goto('http://127.0.0.1:8791/md3/ios-desktop/index.html?nolock=1&shadeMode=dual', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.evaluate(() => { const b = document.querySelector('.power-dialog-card button[data-act="once"]'); if (b) b.click(); });
await page.waitForTimeout(400);
await page.mouse.click(103, 12);
await page.waitForTimeout(700);
const probe = await page.evaluate(() => {
  const el = document.elementFromPoint(10, 500);
  const np = document.getElementById('dualNotifPanel');
  const scrim = document.getElementById('dualScrimNotif');
  const zr = document.getElementById('dualInvocationZone').getBoundingClientRect();
  return {
    hit: el ? el.id || el.className || el.tagName : 'null',
    notifOpen: np.classList.contains('open'),
    scrimOpen: scrim.classList.contains('open'),
    scrimPE: getComputedStyle(scrim).pointerEvents,
    zoneRect: { h: zr.height },
    npRect: np.getBoundingClientRect().toJSON(),
  };
});
console.log(JSON.stringify(probe, null, 1));
await page.mouse.click(10, 500);
await page.waitForTimeout(600);
console.log('after click notifOpen =', await page.evaluate(() => document.getElementById('dualNotifPanel').classList.contains('open')));
await browser.close();
