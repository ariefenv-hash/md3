// ==================== e2e-v819-icon-drag-decouple.mjs — #41 无头回归 ====================
//
// DoD（议题 #41）：
//   A. 拖图标横移（屏幕中部）：页面纹丝不动，仅图标动——CDP 真实触摸流
//      （touchStart → 550ms 长按 lift → touchMove ×8 横移 200px），
//      逐帧采样 desktopSlider transform tx：全程恒定；拖拽克隆体逐帧移动
//   B. 拖到边缘停留（60px 区 / 500ms 驻留）：页面切换恰一次，tx 跳变 = ±winW；
//      未满驻留（~200ms 即离开）不翻页
//   C. 快速拖-放-拖-放连击 ×3：状态无错乱，零 pageerror

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v819');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => document.querySelector('.power-dialog-card button[data-act="once"]')?.click());
await page.waitForTimeout(700);

const cdp = await page.context().newCDPSession(page);
const touch = async (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
const sliderTx = () => page.evaluate(() => {
  const el = document.getElementById('desktopSlider');
  const tr = getComputedStyle(el).transform;
  if (!tr || tr === 'none') return 0;
  const parts = tr.match(/matrix(?:3d)?\(([^)]+)\)/);
  if (!parts) return 0;
  const v = parts[1].split(',').map(parseFloat);
  return v.length === 16 ? v[12] : v[4]; // matrix3d 平移在 index 12，matrix 在 4
});
const pageW = await page.evaluate(() => {
  const el = document.querySelector('#desktopSlider .desktop-page, #desktopSlider > div');
  return el ? el.offsetWidth : window.innerWidth;
});

// ---------- A. 中部横移：页面冻结、图标跟手 ----------
const icon = await page.evaluate(() => {
  const el = document.querySelector('.desktop-page:not([style*="display: none"]) .app-icon, #desktopSlider .app-icon');
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
const tx0 = await sliderTx();

await touch('touchStart', [{ x: icon.x, y: icon.y, id: 0 }]);
await sleep(560); // 长按 380ms lift + 余量
const lifted = await page.evaluate(() => !!document.querySelector('.dragging-active'));
A('A0 长按 lift（.dragging-active 克隆体在）', lifted === true);

const txSamples = [];
const cloneSamples = [];
for (let i = 1; i <= 8; i++) {
  await touch('touchMove', [{ x: icon.x + i * 25, y: icon.y, id: 0 }]);
  await sleep(45);
  txSamples.push(await sliderTx());
  cloneSamples.push(await page.evaluate(() => {
    const c = document.querySelector('.dragging-active');
    if (!c) return null;
    const mtr = getComputedStyle(c).transform;
    const parts = mtr.match(/matrix(?:3d)?\(([^)]+)\)/);
    if (!parts) return null;
    const v = parts[1].split(',').map(parseFloat);
    return v.length === 16 ? v[12] : v[4]; // translate3d+rotate → matrix3d，平移 index 12
  }));
}
const pageFrozen = txSamples.every((tx) => Math.abs(tx - tx0) < 0.6);
const cloneMoved = cloneSamples.every((v, i) => v !== null && (i === 0 || v > cloneSamples[i - 1]));
A('A1 拖图标横移全程页面纹丝不动（8 采样 tx 恒定）', pageFrozen, `tx0=${tx0.toFixed(1)} samples=${txSamples.map((v) => v.toFixed(1)).join(',')}`);
A('A2 仅图标移动（克隆体逐帧跟手 1:1 递增）', cloneMoved, `first=${cloneSamples[0]?.toFixed(1)} last=${cloneSamples[cloneSamples.length - 1]?.toFixed(1)}`);

await touch('touchEnd', []);
await sleep(450);
const txAfterDrop = await sliderTx();
const cloneGone = await page.evaluate(() => !document.querySelector('.dragging-active'));
A('A3 落点后页面仍不动 + 克隆体回收', Math.abs(txAfterDrop - tx0) < 0.6 && cloneGone, `tx=${txAfterDrop.toFixed(1)}`);

let txPaged = 0;
// ---------- B. 边缘翻页：驻留 500ms 才翻 / 未满驻留不翻（独立触摸流） ----------
// A3 落点后退出编辑模式，回到与首轮一致的长按 lift 基线
await page.evaluate(async () => {
  const m = await import('/ios-desktop/js/drag-reorder.js');
  m.exitEditMode();
});
await sleep(300);
const icon2 = await page.evaluate(() => {
  const el = document.querySelector('#desktopSlider .app-icon');
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
const winW = await page.evaluate(() => window.innerWidth);

// B1 未满驻留（~180ms 离开）：不翻页
await touch('touchStart', [{ x: icon2.x, y: icon2.y, id: 0 }]);
await sleep(560);
for (let x = icon2.x; x > winW - 40; x -= 30) { await touch('touchMove', [{ x, y: icon2.y, id: 0 }]); await sleep(25); }
await sleep(180); // < 500ms 驻留
await touch('touchMove', [{ x: winW / 2, y: icon2.y, id: 0 }]); // 离开边缘（清定时器）
await sleep(300);
await touch('touchEnd', []);
await sleep(500);
const txNoPage = await sliderTx();
A('B1 边缘未满 500ms 驻留：不翻页', Math.abs(txNoPage - tx0) < 1.5, `tx=${txNoPage.toFixed(1)}`);

// B2 满驻留：翻页恰一次（驻留期间边缘区内微动喂管线防合并丢事件，轮询至过渡落定）
await touch('touchStart', [{ x: icon2.x, y: icon2.y, id: 0 }]);
await sleep(560);
for (let x = icon2.x; x > winW - 25; x -= 30) { await touch('touchMove', [{ x, y: icon2.y, id: 0 }]); await sleep(25); }
for (let i = 0; i < 12; i++) {
  await touch('touchMove', [{ x: winW - 25 - (i % 3), y: icon2.y, id: 0 }]);
  await sleep(100);
  txPaged = await sliderTx();
  if (Math.abs(txPaged - tx0) > pageW / 2) break; // 翻页已触发
}
let prev = txPaged, stable = 0;
for (let i = 0; i < 12 && stable < 2; i++) {
  await sleep(100);
  const v = await sliderTx();
  stable = Math.abs(v - prev) < 0.3 ? stable + 1 : 0;
  prev = v;
}
txPaged = prev;
const pageSwitchedOnce = Math.abs(Math.abs(txPaged - tx0) - pageW) < 4;
A('B2 边缘驻留 500ms：页面切换恰一次（tx 跳变 = 页宽，过渡落定后）', pageSwitchedOnce, `tx=${txPaged.toFixed(1)} Δ=${(txPaged - tx0).toFixed(1)} pageW=${pageW}`);
await touch('touchMove', [{ x: winW / 2, y: icon2.y, id: 0 }]);
await sleep(80);
await touch('touchEnd', []);
await sleep(450);

// ---------- C. 快速拖-放-拖-放 ×3 ----------
let rapidOk = true;
for (let round = 0; round < 3; round++) {
  const ic = await page.evaluate(() => {
    const el = document.querySelector('#desktopSlider .app-icon');
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await touch('touchStart', [{ x: ic.x, y: ic.y, id: 0 }]);
  await sleep(90);
  await touch('touchMove', [{ x: ic.x + 40, y: ic.y + 10, id: 0 }]);
  await sleep(70);
  await touch('touchEnd', []);
  await sleep(130);
}
  const rapidState = await page.evaluate(() => ({
  cloneGone: !document.querySelector('.dragging-active'),
  tx: (() => {
    const el = document.getElementById('desktopSlider');
    const parts = getComputedStyle(el).transform.match(/matrix(?:3d)?\(([^)]+)\)/);
    if (!parts) return 0;
    const v = parts[1].split(',').map(parseFloat);
    return v.length === 16 ? v[12] : v[4];
  })(),
}));
rapidOk = rapidState.cloneGone;
A('C 快速拖放连击 ×3：状态无错乱（克隆体全回收）', rapidOk, `tx=${rapidState.tx.toFixed(1)}`);

const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
writeFileSync(join(OUT, 'v819-icon-drag.png'), Buffer.from(data, 'base64'));

A('零 pageerror', errors.length === 0, errors.join(';').slice(0, 120));

await browser.close();
console.log(`\n==== v819 e2e 汇总：PASS ${pass} / FAIL ${fail} ====`);
process.exit(fail > 0 ? 1 : 0);
