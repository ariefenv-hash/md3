// ==================== e2e-v814-qs-sheet-quick-tap.mjs — #39 无头回归 ====================
//
// DoD（议题 #39）：
//   A. 快速连点（开→关→开循环）后二次 open 仍是真容器变换（起始 scale < 0.7）——
//      修复前 --qs-tf-src 残留污染测量致 sx≈1 退化纯淡入（丢动画）
//   B. 动画中间帧 sheet×body scale 乘积 ≈ 1（|dev| < 0.15）——修复前 2.31 倍（字体爆大）
//   C. 150ms 级快速操作链（open-close-open-close-open）无状态残留、零 pageerror
// 环境：真实 chromium + 真页面（蓝牙磁贴 click 直达面板，v778 先例）。
// 动画读取：Element.getAnimations() → effect.getKeyframes()（chromium 支持）。

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL = 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
const OUT = join(root, 'docs/v814');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(600);

const results = {};

// ---------- 场景 A：开→关→二次开，起始 scale 保真 ----------
const openSheet = () => page.evaluate(() => {
  const pill = document.querySelector('.qs-tile-pill[data-tile-id="bluetooth"]');
  if (!pill) return 'no-pill';
  pill.click();
  return 'ok';
});
const closeSheet = () => page.evaluate(() => {
  const overlay = document.getElementById('qsSheetOverlay');
  overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
const readAnims = () => page.evaluate(() => {
  const overlay = document.getElementById('qsSheetOverlay');
  const sheet = overlay.querySelector('.qs-sheet');
  const anims = sheet.getAnimations();
  let startScaleX = null, duration = null;
  for (const a of anims) {
    const kf = a.effect.getKeyframes();
    const t0 = kf[0] && kf[0].transform;
    const m = t0 && t0.match(/scale\(([\d.]+), ([\d.]+)\)/);
    if (m) { startScaleX = parseFloat(m[1]); duration = a.effect.getTiming().duration; break; }
  }
  return { open: overlay.classList.contains('open'), startScaleX, duration,
    animCount: anims.length };
});

const r1 = await openSheet();
await sleep(300);                          // open1 动画完（200ms）
const firstOpen = await readAnims();
await closeSheet();
await sleep(60);                           // 快速连点节奏（close 动画未完即再开）
const r2 = await openSheet();
await sleep(30);                           // open2 动画进行中读取
results.reopen = await readAnims();
results.openAttempts = [r1, r2];
results.firstOpen = firstOpen;
const midPng = await shot_mid();
async function shot_mid() {
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  return data;
}
writeFileSync(join(OUT, 'v814-reopen-mid.png'), Buffer.from(midPng, 'base64'));

// ---------- 场景 B：中间帧 sheet×body 乘积恒 1（趁 open2 动画还在播，200ms 窗口） ----------
results.midFrames = await page.evaluate(() => {
  const overlay = document.getElementById('qsSheetOverlay');
  const sheet = overlay.querySelector('.qs-sheet');
  const body = overlay.querySelector('.qs-sheet-body');
  const sc = (el) => {
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return null;
    const p = t.match(/matrix\(([^)]+)\)/);
    if (!p) return null;
    const v = p[1].split(',').map(parseFloat);
    return { a: v[0], d: v[3] };
  };
  const s = sc(sheet), b = sc(body);
  if (!s || !b) return null;
  return { prodX: s.a * b.a, prodY: s.d * b.d };
});

// ---------- 场景 C：150ms 级快速操作链 → 无状态残留 ----------
await sleep(300);
await closeSheet();
await sleep(60);
await openSheet();
await sleep(60);
await closeSheet();
await sleep(60);
const r3 = await openSheet();
await sleep(400);                          // open3 动画完 + 稳定
results.chainFinal = await page.evaluate(() => {
  const overlay = document.getElementById('qsSheetOverlay');
  const sheet = overlay.querySelector('.qs-sheet');
  const t = getComputedStyle(sheet).transform;
  return {
    open: overlay.classList.contains('open'),
    transform: t,
    identity: t === 'none' || /^matrix\(1, 0, 0, 1,/.test(t) || /^matrix\(1, 0, 0, 1\)$/.test(t),
    animCount: sheet.getAnimations().length,
  };
});
await sleep(100);
const endPng = await (async () => {
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  return data;
})();
writeFileSync(join(OUT, 'v814-final-open.png'), Buffer.from(endPng, 'base64'));

console.log('RESULTS', JSON.stringify(results, null, 2));
console.log('PAGEERRORS', errors.length, errors.slice(0, 3));

// ---------- 判定 ----------
const verdict = {
  A_realTransform: results.reopen.startScaleX !== null && results.reopen.startScaleX < 0.7,
  A_duration: results.reopen.duration === 200,
  B_product: results.midFrames && Math.abs(results.midFrames.prodX - 1) < 0.15
    && Math.abs(results.midFrames.prodY - 1) < 0.15,
  C_clean: results.chainFinal.open && results.chainFinal.identity && errors.length === 0,
};
console.log('VERDICT', JSON.stringify(verdict, null, 2));

await browser.close();
process.exit(verdict.A_realTransform && verdict.A_duration && verdict.B_product && verdict.C_clean ? 0 : 2);
