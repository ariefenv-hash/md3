// v9.17 = #166 压缩/解压（R43 轮）无头回归小判据：
// ①archive iframe 挂载（JSZip 就位）②第 50 号在册 ③VFS 目录清单渲染
// ④压缩闭环：预置种子文件 → 勾选 → 压缩 → /archives/<name>.zip 落盘（宿主 __vfs 复核）
// ⑤自动打开包：包内树渲染（条目数/大小）⑥解压到 /archives/<name>/ → 宿主读回复核内容一致
// ⑦清单复制按钮在册 ⑧手机 tab / 平板双栏 ⑨K 零 pageerror
// 范式同 e2e-v165：dev 服务器（E2E_BASE 可覆写，默认 8080）。两跑收敛。
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const SHOT = new URL('../docs/v917/archive-app.png', import.meta.url).pathname;
const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html?nolock=1';
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
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

// 种子文件（直接写宿主 VFS，模拟相机/文档既有产物）
await page.evaluate(async () => {
  await window.__vfs.write('/documents/seed165.md', '# seed from e2e\n\nhello archive');
  await window.__vfs.write('/documents/seed-note.txt', 'plain text seed');
});

const openArc = () => page.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  openApp(initialApps.findIndex(a => a.id === 'archive'));
});
await openArc();
await sleep(2200);

const aframe = () => page.frames().find(f => f.url().includes('apps/archive/index.html'));
for (let i = 0; i < 15 && !aframe(); i++) await sleep(300);
t('P1 archive iframe 挂载（JSZip 就位）', !!aframe() && await aframe().evaluate(() => typeof window.JSZip !== 'undefined'));
t('P2 第 50 号在册：apps-data 聚合 50 项含 archive', await page.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  return initialApps.length === 50 && initialApps.some(a => a.id === 'archive');
}));

// A. VFS 清单渲染（种子文件可见）
await sleep(500);
t('A1 VFS 目录清单渲染：/documents/ 下两个种子文件在列', await aframe().evaluate(() => {
  const nms = Array.from(document.querySelectorAll('#vfsList .row .nm')).map(n => n.textContent);
  return nms.includes('seed165.md') && nms.includes('seed-note.txt');
}));

// B. 勾选两个文件 → 压缩
await aframe().evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#vfsList .row'));
  rows.filter(r => /seed165\.md|seed-note\.txt/.test(r.querySelector('.nm').textContent))
    .forEach(r => r.querySelector('.ck').click());
});
await aframe().evaluate(() => { document.getElementById('zipName').value = 'e2e166'; });
t('B1 已选 2 项（statline 同步）', await aframe().evaluate(() =>
  document.getElementById('stSel').textContent === '已选 2 项'));
await aframe().evaluate(() => document.getElementById('btnZip').click());
await sleep(1500);
t('B2 压缩落盘：宿主 __vfs 读回 /archives/e2e166.zip（blob 非空）', await page.evaluate(async () => {
  const rec = await window.__vfs.read('/archives/e2e166.zip');
  return !!(rec && rec.blob && rec.blob.size > 50);
}));

// C. 自动打开包 → 树渲染
t('C1 包内容树渲染：2 条文件条目（dirhead + rows）', await aframe().evaluate(() => {
  const rows = Array.from(document.querySelectorAll('#zipList .row')).filter(r => !r.classList.contains('dir'));
  return rows.length === 2 && document.querySelector('#zipList .dirhead')?.textContent.includes('/archives/e2e166.zip');
}));

// D. 解压到 /archives/e2e166/ → 内容复核
await aframe().evaluate(() => document.getElementById('btnExtract').click());
await sleep(1500);
t('D1 解压写回：宿主读回 /archives/e2e166/seed165.md 内容一致', await page.evaluate(async () => {
  const text = await window.__vfs.readText('/archives/e2e166/seed165.md');
  return text === '# seed from e2e\n\nhello archive';
}));
t('D2 解压写回：/archives/e2e166/seed-note.txt 一致', await page.evaluate(async () =>
  (await window.__vfs.readText('/archives/e2e166/seed-note.txt')) === 'plain text seed'));
t('D3 通知桥在册（notify 挂载）', await aframe().evaluate(() =>
  !!(window.__system && typeof window.__system.notify === 'function')));

// E. 顶栏联动键与范围纪律留痕
t('E1 顶栏 3 操作键在册（整排按压联动对象）', await aframe().evaluate(() =>
  document.querySelectorAll('#topbar .tbtn').length === 3));
t('E2 只做 zip 纪律留痕（rar/7z 不在列）', await aframe().evaluate(() =>
  document.getElementById('hint').textContent.includes('rar/7z')));

// 截图
mkdirSync(new URL('../docs/v917/', import.meta.url).pathname, { recursive: true });
await page.screenshot({ path: SHOT });
await ctx.close();

// F. 平板双栏
const ctx2 = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
const page2 = await ctx2.newPage();
page2.on('pageerror', e => errors.push(String(e)));
await page2.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2200);
await page2.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  openApp(initialApps.findIndex(a => a.id === 'archive'));
});
for (let i = 0; i < 15; i++) await sleep(300);
const aframe2 = () => page2.frames().find(f => f.url().includes('apps/archive/index.html'));
t('F1 平板双栏并排（VFS|包内容 同屏）', await aframe2().evaluate(() => {
  const vp = document.getElementById('vfsPane'), zp = document.getElementById('zipPane');
  return getComputedStyle(vp).display !== 'none' && getComputedStyle(zp).display !== 'none' &&
    vp.getBoundingClientRect().width > 100 && zp.getBoundingClientRect().width > 100;
}));
await page2.screenshot({ path: SHOT.replace('.png', '-tablet.png') });
await ctx2.close();

t('K 零 pageerror（两视口累计）', errors.length === 0, errors.slice(0, 2).join(' | '));
await browser.close();
console.log(`\n[e2e-v166] 结果：PASS ${pass} / FAIL ${fail}${fail ? '  ←←← 需修复' : ''}`);
process.exit(fail ? 1 : 0);
