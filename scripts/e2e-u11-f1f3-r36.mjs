// R35 会话补收（v8.96 = #85-F1/F3）小判据：壁纸和样式复合入口 + 主题色复合块跳转链
// ①设置一级含「壁纸和样式」行（sub 含主题色）②推入页 13 → settingsWallpaperStyleBlock 在场 +
//   data-test wp-style-color-entry ③点击复合块 → __tpNav 跳页 1（显示页标题在场）④K 零 pageerror
import { chromium } from 'playwright';
const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8100/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

// 打开设置（抽屉或图标）
await page.evaluate(async () => {
  const { initialApps } = await import('/js/apps-data.js');
  const { openApp } = await import('/js/app-window.js');
  const idx = initialApps.findIndex(a => a.id === 'settings');
  if (idx !== -1) openApp(idx);
});
await sleep(1500);

// ① 一级行复合入口
const row = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('.tp-home-icon, [class*="home-icon"], .md3-list-item'));
  const el = rows.find(r => (r.textContent || '').includes('壁纸和样式'));
  return { found: !!el, text: el ? (el.textContent || '').slice(0, 80) : '' };
});
t('F1-1 一级行「壁纸和样式」在场', row.found, row.text);

// ② 推入页 13（壁纸和样式子页）
await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('.tp-home-icon, [class*="home-icon"], .md3-list-item'));
  const el = rows.find(r => (r.textContent || '').includes('壁纸和样式'));
  if (el && window.__tpNav) window.__tpNav(el, 13);
});
await sleep(1200);
const block = await page.evaluate(() => {
  const b = document.getElementById('settingsWallpaperStyleBlock');
  const entry = document.querySelector('[data-test="wp-style-color-entry"]');
  const swatch = entry ? entry.querySelector('span[style*="--md-h"]') : null;
  const cs = swatch ? getComputedStyle(swatch).backgroundImage : '';
  const cont = document.getElementById('settingsWallpaperContainer');
  return { block: !!b, entry: !!entry, swatchGrad: cs.includes('gradient'), cont: !!cont, entryText: entry ? (entry.textContent || '').slice(0, 40) : '' };
});
t('F1-2 页 13 主题色复合块在场（settingsWallpaperStyleBlock）', block.block && block.entry, `entry=${block.entry} swatchGrad=${block.swatchGrad}`);
t('F1-3 色样圆点取 --md-h 渐变（单源联动视觉）', block.swatchGrad === true, '');
t('F1-4 既有壁纸来源容器零丢失（v808 六锚前置）', block.cont === true, '');

// ③ 点击复合块 → 跳显示页
await page.evaluate(() => {
  const entry = document.querySelector('[data-test="wp-style-color-entry"]');
  if (entry) entry.click();
});
await sleep(1000);
const jumped = await page.evaluate(() => {
  const win = document.getElementById('appWindow') || document;
  const text = win.textContent || '';
  return { display: text.includes('亮度'), dark: text.includes('深色主题'), notWall: !text.includes('选择壁纸来源') || text.includes('亮度') };
});
t('F1-5 复合块点击 → 显示页（主题色单源区）', jumped.display && jumped.dark, `display=${jumped.display} dark=${jumped.dark}`);

// ④ 收场 + K
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
await sleep(500);
t('K-1 全程零 pageerror', errors.length === 0, errors.length ? errors.slice(0, 2).join(' | ') : '');

console.log(`\n==== e2e-u11-f1f3 结果：pass=${pass} fail=${fail} ====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
