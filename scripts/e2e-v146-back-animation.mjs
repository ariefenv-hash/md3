// ==================== e2e-v146-back-animation.mjs — #146 容器变换无头回归 ====================
//
// DoD（AOSP BackAnimationSpec ST1 dismissAppForSysUi 权威语义，真实鼠标手势流）：
//   A. 根页面边缘拖拽中：窗口容器变换按 spec 跟手（bbox 反解 sx ≈ 0.8215、中心 x ≈ 640+107.07）
//   B. 同相位：pill 与容器同手势共存（pill 可见 + spring p ≈ 0.8131）
//   C. 取消路径（慢速短滑 <25% 屏宽）：弹簧回 1、中心回屏心、应用保持打开
//   D. 提交路径（拖过 25% 屏宽）：应用关闭（isOpen=false）
//   E. 全程零 pageerror
// 场景：1280×800，解锁 → 设置 app（根页 navHistory=1，无 ovBack/pbDrag 拦截）→ 左缘右滑。
// 期望值离线精算（python 牛顿解 cubic-bezier(0.1,0.1,0,1)）：
//   rawDx=212 → progress=(212−16)/(412−16)=0.494949 → BG=0.892259
//   → translateX=107.071px / scale=0.821548 / 弹簧 p=(0.8215−58/1280)/(1−58/1280)=0.813078

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v146');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]')?.click());
await sleep(1000);

const winInfo = () => page.evaluate(() => {
  const el = document.getElementById('appWindow');
  const pill = document.getElementById('backPill');
  const b = el.getBoundingClientRect();
  const dbg = window.__qsDebug ? window.__qsDebug() : null;
  return {
    cx: b.left + b.width / 2,
    cy: b.top + b.height / 2,
    sx: b.width / window.innerWidth,
    hidden: getComputedStyle(el).visibility === 'hidden' || getComputedStyle(el).display === 'none',
    pillVis: pill ? getComputedStyle(pill).visibility : null,
    isOpen: dbg ? dbg.isOpen : null,
    springP: dbg ? Number(dbg.scale) : null,
  };
});

const base = await winInfo();
A('P0 应用打开（根页）', base.isOpen === true && !base.hidden, `isOpen=${base.isOpen}`);

// ---------- A+B：拖拽中段采样（rawDx=212，慢速防误提交） ----------
await page.mouse.move(4, 400);
await page.mouse.down();
for (let x = 14; x <= 216; x += 20) { await page.mouse.move(x, 400); await sleep(70); } // ~285px/s < 400
await sleep(220);
const mid = await winInfo();
await page.screenshot({ path: join(OUT, 'v146-gesture-mid.png'), clip: { x: 0, y: 100, width: 1280, height: 600 } });

console.log('A/B. 容器变换 spec 跟手（ST1 8dp/8dp/0.8）:');
A('A1 bbox 反解 sx ≈ 0.8215（spec scale 经 iconScaleX 通道）', near(mid.sx, 0.8215, 0.02), `sx=${mid.sx.toFixed(4)}`);
A('A2 中心 x ≈ 640+107.07=747.1（BACK_GESTURE(0.4949)·120）', near(mid.cx, 747.1, 6), `cx=${mid.cx.toFixed(1)}`);
A('A3 纵向居中（progressY=0 → translateY=0）', near(mid.cy, 400, 6), `cy=${mid.cy.toFixed(1)}`);
A('B1 pill 同手势共存（严格同相位）', mid.pillVis === 'visible', `pill=${mid.pillVis}`);
A('B2 弹簧 p ≈ 0.8131（scale 反解写入 scaleSpring）', mid.springP !== null && near(mid.springP, 0.8131, 0.01), `p=${mid.springP}`);

// ---------- C：取消路径（松手回弹，应用保持打开） ----------
await page.mouse.up(); // rawDx=212 < 320 且慢速 → cancel
await sleep(900);
const canceled = await winInfo();
console.log('C. 取消回弹:');
A('C1 弹簧回 1（全屏恢复）', near(canceled.springP, 1, 0.02), `p=${canceled.springP}`);
A('C2 中心回屏心（cx≈640）', near(canceled.cx, 640, 8), `cx=${canceled.cx.toFixed(1)}`);
A('C3 应用保持打开', canceled.isOpen === true && !canceled.hidden, `isOpen=${canceled.isOpen}`);

// ---------- D：提交路径（拖过 25% 屏宽 → closeApp） ----------
await page.mouse.move(4, 400);
await page.mouse.down();
for (let x = 14; x <= 520; x += 24) { await page.mouse.move(x, 400); await sleep(18); }
await page.mouse.up(); // rawDx=516 > 320 → commit
await sleep(1400);
const closed = await winInfo();
console.log('D. 提交关闭:');
A('D1 应用关闭（isOpen=false）', closed.isOpen === false, `isOpen=${closed.isOpen}`);
A('D2 窗口隐藏', closed.hidden, `hidden=${closed.hidden}`);

A('E1 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));

console.log(`\n[e2e-v146] PASS ${pass} / FAIL ${fail}`);
await browser.close();
process.exit(fail ? 1 : 0);
