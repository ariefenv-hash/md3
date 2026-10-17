// e2e-probe-panel.mjs — 网络面板展开 FLIP 逐帧探针：中间帧是否丢失
import { chromium } from 'playwright';

const BASE = process.env.MD3_BASE || 'http://localhost:8123/md3/ios-desktop/index.html?nolock=1';
const OUT = '/home/z/my-project/e2e-probe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
let errors = 0;
page.on('pageerror', (e) => { errors++; console.log('[pageerror]', e.message.slice(0, 200)); });
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
await sleep(2000);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(400);
for (let i = 0; i < 30; i++) {
  if (await page.evaluate(() => document.querySelectorAll('.qs-tile-pill').length > 0)) break;
  await sleep(500);
}
await page.click('#statusBar', { position: { x: 350, y: 14 }, force: true });
await sleep(1500);

// 点击 Internet 磁贴，随后按 ~40ms 步长连拍
await page.evaluate(() => {
  const pill = document.querySelector('.qs-tile-pill[data-tile-id="internet"]');
  if (pill) pill.click();
});
for (let i = 0; i < 8; i++) {
  await page.screenshot({ path: `${OUT}/open-t${i * 45}.png` });
  await sleep(45);
}
await sleep(600);
await page.screenshot({ path: `${OUT}/open-settled.png` });

// 读取面板最终 transform 与过渡定义
const state = await page.evaluate(() => {
  const overlay = document.getElementById('qsSheetOverlay');
  const sheet = overlay && overlay.querySelector('.qs-sheet');
  if (!sheet) return null;
  const cs = getComputedStyle(sheet);
  return {
    open: overlay.classList.contains('open'),
    transform: cs.transform,
    transition: cs.transition.slice(0, 120),
    tfSrc: sheet.style.getPropertyValue('--qs-tf-src'),
    rect: sheet.getBoundingClientRect().toJSON(),
  };
});
console.log('STATE:', JSON.stringify(state, null, 1));
console.log('pageerrors:', errors);
await browser.close();
