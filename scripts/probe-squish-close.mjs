// probe-squish-close.mjs — 诊断：关闭面板后 --qs-squish 为何停留 1
import { chromium } from 'playwright';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8793/md3/ios-desktop/index.html?nolock=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 160)));
page.on('console', (m) => { if (m.text().startsWith('[squish]')) console.log(m.text()); });

await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
await sleep(2000);
await page.evaluate(() => { document.querySelector('.power-dialog-card button[data-act="once"]')?.click(); });
for (let i = 0; i < 60; i++) { if (await page.evaluate(() => document.querySelectorAll('.qs-tile-pill').length > 0)) break; await sleep(500); }

// 给 tween 打点
await page.evaluate(() => {
  const orig = document.getElementById('quickSettingsPanel').style.setProperty.bind(document.getElementById('quickSettingsPanel').style);
  window.__squishLog = [];
  document.getElementById('quickSettingsPanel').style.setProperty = (k, v) => {
    if (k === '--qs-squish') window.__squishLog.push([performance.now() | 0, v]);
    return orig(k, v);
  };
});

// 拖开面板
await page.mouse.move(206, 8); await page.mouse.down();
for (let y = 40; y <= 380; y += 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.up();
await sleep(900);
console.log('after open:', JSON.stringify(await page.evaluate(() => ({ squish: document.getElementById('quickSettingsPanel').style.getPropertyValue('--qs-squish'), ov: document.getElementById('pullPanelsOverlay').className }))));

// 点状态栏关闭
await page.click('#statusBar', { position: { x: Math.round(412 * 0.85), y: 14 }, force: true });
await sleep(250);
console.log('t+250:', JSON.stringify(await page.evaluate(() => ({ squish: document.getElementById('quickSettingsPanel').style.getPropertyValue('--qs-squish'), ov: document.getElementById('pullPanelsOverlay').className, log: window.__squishLog.slice(-8) }))));
await sleep(600);
console.log('t+850:', JSON.stringify(await page.evaluate(() => ({ squish: document.getElementById('quickSettingsPanel').style.getPropertyValue('--qs-squish'), ov: document.getElementById('pullPanelsOverlay').className, log: window.__squishLog.slice(-8) }))));
await browser.close();
