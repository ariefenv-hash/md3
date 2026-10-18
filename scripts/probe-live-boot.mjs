// probe-live-boot.mjs — 探测线上冷加载卡点：DOM/脚本/磁贴渲染各阶段状态
import { chromium } from 'playwright';

const LIVE = process.env.MD3_BASE || 'https://ariefenv-hash.github.io/md3/ios-desktop/index.html?nolock=1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
const netFail = [];
page.on('requestfailed', (r) => netFail.push(`${r.failure()?.errorText} ${r.url().slice(0, 110)}`));
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 160)));

await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch((e) => console.log('[goto]', e.message.slice(0, 120)));

for (let i = 0; i < 30; i++) {
  const st = await page.evaluate(() => ({
    scripts: document.scripts.length,
    title: document.title,
    hasSWReg: !!navigator.serviceWorker?.controller,
    powerDialog: !!document.querySelector('.power-dialog-card'),
    tiles: document.querySelectorAll('.qs-tile-pill').length,
    bodyKids: document.body.children.length,
    appRoot: !!document.getElementById('appRoot'),
    swVersion: window.caches ? 'cache-api-ok' : 'no',
  })).catch(() => null);
  if (i % 5 === 0) console.log(`t+${i * 2}s`, JSON.stringify(st));
  if (st && st.tiles > 0) { console.log('READY at t+' + i * 2 + 's', JSON.stringify(st)); break; }
  await sleep(2000);
}
console.log('--- requestfailed ---');
netFail.slice(0, 12).forEach((f) => console.log(f));
await browser.close();
