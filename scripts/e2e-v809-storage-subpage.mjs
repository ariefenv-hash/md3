// e2e-v809-storage-subpage.mjs — v8.09 #23 差距矩阵⑤ 存储子页 E2E 核验
// ① 一级菜单存储行（idx 7）推入 → AOSP 结构八锚渲染
// ② 权威文案（释放空间/分类 9 行/系统/Android 17/临时系统文件/存储空间管理器）
// ③ 真实数据回填（summary 百分比 + 分类大小数值型文本）
// ④ 释放空间卡点击 → OPEN_APP 深链打开 files 应用
// ⑤ Web 扩展卡保留 + 零 pageerror + 截图两张 docs/v809/
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/md3-repo/docs/v809';
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
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="storage"]').click());
await sleep(1800);

const s = await page.evaluate(() => {
  const q = (sel) => document.querySelector(sel);
  const txt = (sel) => { const el = q(sel); return el ? el.textContent.replace(/\s+/g, ' ').trim() : null; };
  const ids = ['stgSummaryPct', 'stgSummaryLine', 'stgSizeFiles', 'stgSizeImages', 'stgSizeVideos',
    'stgSizeAudio', 'stgSizeApps', 'stgSizeGames', 'stgSizeDocuments', 'stgSizeOther',
    'stgSizeTrash', 'stgSizeSystem', 'stgSizeTemp'];
  const sizes = {};
  ids.forEach((id) => { const el = document.getElementById(id); sizes[id] = el ? el.textContent : null; });
  return {
    anchors: {
      aosp: !!q('[data-test="storage-aosp"]'), summary: !!q('[data-test="storage-summary"]'),
      spinner: !!q('[data-test="storage-spinner-note"]'), asm: !!q('[data-test="storage-asm"]'),
      freeUp: !!q('[data-test="storage-free-up"]'), cats: !!q('[data-test="storage-categories"]'),
      sysLabel: !!q('[data-test="storage-system-label"]'),
      otherUsers: !!q('[data-test="storage-other-users-note"]'),
    },
    freeText: txt('[data-test="storage-free-up"]'),
    asmDisabled: (() => { const el = document.getElementById('stgAsmSwitch'); return el ? el.disabled : null; })(),
    extBadge: txt('#storageOverview') || '',
    byOwner: txt('#storageByOwner') || '',
    sizes,
  };
});
check('AOSP 结构八锚全渲染', Object.values(s.anchors).every(Boolean), JSON.stringify(s.anchors));
check('释放空间卡权威文案', /释放空间/.test(s.freeText || '') && /管理和释放空间/.test(s.freeText || ''), s.freeText);
check('ASM 开关 disabled（忠实不可用）', s.asmDisabled === true);
check('summary 真实回填（百分比 + 已使用/还剩）', /^\d+%$/.test(s.sizes.stgSummaryPct || '') && /已使用/.test(s.sizes.stgSummaryLine || ''), `${s.sizes.stgSummaryPct} | ${s.sizes.stgSummaryLine}`);
const filled = ['stgSizeFiles', 'stgSizeImages', 'stgSizeVideos', 'stgSizeAudio', 'stgSizeApps',
  'stgSizeGames', 'stgSizeDocuments', 'stgSizeOther', 'stgSizeTrash', 'stgSizeSystem', 'stgSizeTemp'];
check('分类 11 行大小全部回填（无 … 残留）', filled.every((id) => s.sizes[id] && !s.sizes[id].includes('…')), JSON.stringify(s.sizes).slice(0, 220));
check('游戏/回收站忠实 0 值', /0 ?B|0 字节|^0/.test(s.sizes.stgSizeGames || '') && /0 ?B|0 字节|^0/.test(s.sizes.stgSizeTrash || ''), `${s.sizes.stgSizeGames} | ${s.sizes.stgSizeTrash}`);
check('Web 扩展卡保留（介质明细徽标 + byOwner）', /Web 扩展/.test(s.extBadge) && s.byOwner.length > 0);

// 截图：结构区
const cdp = await ctx.newCDPSession(page);
const shot = async (name) => {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${name}`, Buffer.from(data, 'base64'));
  log('shot:', name);
};
const card = await page.$('[data-test="storage-summary"]');
if (card) { await card.scrollIntoViewIfNeeded(); await sleep(400); }
await shot('v809-storage-top.png');

// 释放空间卡点击 → files 应用窗口出现
const filesBefore = await page.evaluate(() => !!document.querySelector('.app-window[data-app="files"], [data-app-window="files"]'));
await page.evaluate(() => document.querySelector('[data-test="storage-free-up"]').click());
await sleep(2200);
const filesAfter = await page.evaluate(() => {
  const wins = [...document.querySelectorAll('[data-app-id], .app-window, [data-app]')];
  return wins.some((w) => (w.dataset.appId || w.dataset.app || '').includes('files'));
});
check('释放空间点击 → 文件应用打开（OPEN_APP 深链）', filesAfter, `before=${filesBefore} after=${filesAfter}`);

await sleep(500);
await shot('v809-storage-files-open.png');
check('零 pageerror', pageErrors === 0, `errors=${pageErrors}`);

await browser.close();
log(failures === 0 ? 'ALL PASS' : `FAILURES: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
