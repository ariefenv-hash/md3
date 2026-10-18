import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome', args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
page.on('console', m => { if (m.text().includes('[pp]')) console.log(m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0,140)));
await page.goto('http://127.0.0.1:8791/md3/ios-desktop/index.html?nolock=1', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.evaluate(() => { const b = document.querySelector('.power-dialog-card button[data-act="once"]'); if (b) b.click(); });
await page.waitForTimeout(500);
// 打开 QS 面板（经典下拉）
await page.mouse.move(206, 8); await page.mouse.down();
for (let y = 40; y <= 640; y += 30) { await page.mouse.move(206, y); await page.waitForTimeout(22); }
await page.mouse.up();
await page.waitForTimeout(900);
const gear = await page.locator('#qsSettingsBtn').boundingBox();
console.log('gear box:', JSON.stringify(gear));
// 探针：监听 gear 的 pointer 事件
await page.evaluate(() => {
  const g = document.getElementById('qsSettingsBtn');
  ['pointerdown','pointerup','pointercancel','pointerleave'].forEach(t =>
    g.addEventListener(t, (e) => console.log('[pp]', t, e.pointerId || '', e.isTrusted)));
  const ov = document.getElementById('panelsPopoverOverlay');
  new MutationObserver(() => console.log('[pp] overlay hidden=', ov.hidden, 'cls=', ov.className)).observe(ov, { attributes: true, attributeFilter: ['hidden','class'] });
});
await page.mouse.move(gear.x + gear.width/2, gear.y + gear.height/2);
await page.mouse.down();
await page.waitForTimeout(700);
const st = await page.evaluate(() => { const ov = document.getElementById('panelsPopoverOverlay'); return { hidden: ov.hidden, cls: ov.className, gearAt: !!document.getElementById('qsSettingsBtn') }; });
console.log('after hold:', JSON.stringify(st));
await page.mouse.up();
await browser.close();
