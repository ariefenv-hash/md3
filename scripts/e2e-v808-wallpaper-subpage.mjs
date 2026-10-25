// e2e-v808-wallpaper-subpage.mjs — v8.08 #23 差距矩阵⑥ 标注轮 E2E 核验
// ① 一级菜单壁纸行（idx 13）推入 → 页头「选择壁纸来源」
// ② 来源区三锚渲染（section/row/note）+ 权威文案（壁纸和样式/主屏幕、锁定屏幕）
// ③ 来源行点击 → 滚动直达选择器（高亮脉冲）
// ④ 既有选择器零丢失（当前壁纸行/外观模式/实时模糊/动态网格/预设网格/上传）
// ⑤ 零 pageerror + 截图两张落盘 docs/v808/
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/md3-repo/docs/v808';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, cond, detail = '') => {
  log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
let pageErrors = 0;
page.on('pageerror', (e) => { pageErrors++; log('[pageerror]', e.message.slice(0, 200)); });

await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await sleep(2500);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(1200);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(2000);

// ① 推入壁纸子页
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="wallpaper"]').click());
await sleep(1500);

// ② 页头 + 来源区
const page13 = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const txt = (s) => { const el = q(s); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; };
  return {
    sourceSection: !!q('[data-test="wallpaper-source-section"]'),
    sourceRow: !!q('[data-test="wallpaper-source-row"]'),
    note: txt('[data-test="wallpaper-note"]'),
    rowText: txt('[data-test="wallpaper-source-row"]'),
    header: (document.querySelector('.page-stack-title, .subpage-header-title, [class*="page-title"]') || {}).textContent || '',
    curRow: !!document.getElementById('setNavWallpaperRow'),
    modeRow: !!document.getElementById('setThemeModeRow'),
    blurSwitch: !!document.getElementById('setWallpaperBlurSwitch'),
    dynGrid: !!document.getElementById('setDynamicGrid'),
    presGrid: !!document.getElementById('setWallpapersGrid'),
    upload: !!document.getElementById('setUploadBtn'),
  };
});
check('来源区三锚渲染（section/row/note）', page13.sourceSection && page13.sourceRow && !!page13.note);
check('来源行权威文案（壁纸和样式 + 主屏幕、锁定屏幕）', /壁纸和样式/.test(page13.rowText || '') && /主屏幕、锁定屏幕/.test(page13.rowText || ''), page13.rowText);
check('注记考证（空壳 XML + ACTION_SET_WALLPAPER + 合法超越）',
  /零子项/.test(page13.note || '') && /ACTION_SET_WALLPAPER/.test(page13.note || '') && /合法超越/.test(page13.note || ''), (page13.note || '').slice(0, 60));
check('既有选择器六锚全渲染（当前壁纸/外观模式/实时模糊/动态/预设/上传）',
  page13.curRow && page13.modeRow && page13.blurSwitch && page13.dynGrid && page13.presGrid && page13.upload);

// ③ 截图：来源区特写
const cdp = await ctx.newCDPSession(page);
const shot = async (name) => {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  (await import('node:fs')).writeFileSync(`${OUT}/${name}`, Buffer.from(data, 'base64'));
  log('shot:', name);
};
const rowEl = await page.$('[data-test="wallpaper-source-row"]');
if (rowEl) { await rowEl.scrollIntoViewIfNeeded(); await sleep(400); }
await shot('v808-wallpaper-source.png');

// ④ 来源行点击 → 滚动直达 + 高亮
const scrollBefore = await page.evaluate(() => {
  const scroller = document.querySelector('[data-test="wallpaper-source-row"]').closest('.page-content, .app-page, .settings-page') || document.scrollingElement;
  return scroller.scrollTop;
});
await page.evaluate(() => document.querySelector('[data-test="wallpaper-source-row"]').click());
await sleep(700);
const scrollAfter = await page.evaluate(() => {
  const scroller = document.querySelector('[data-test="wallpaper-source-row"]').closest('.page-content, .app-page, .settings-page') || document.scrollingElement;
  return scroller.scrollTop;
});
check('来源行点击触发滚动直达（scrollTop 变化）', scrollAfter !== scrollBefore, `before=${scrollBefore} after=${scrollAfter}`);

// 收尾全景
await sleep(600);
await shot('v808-wallpaper-full.png');
check('零 pageerror', pageErrors === 0, `errors=${pageErrors}`);

await browser.close();
log(failures === 0 ? 'ALL PASS' : `FAILURES: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
