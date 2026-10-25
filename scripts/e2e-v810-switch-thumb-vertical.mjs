// ==================== e2e-v810-switch-thumb-vertical.mjs — #79 无头回归 ====================
//
// DoD（议题 #79）：连续按压/释放 10 次，抽帧检查无上下偏移（|gapTop−gapBottom| < 0.5px）；
//   拖拽过程同样逐帧对称；CSS 无 JS 回退路径显式像素；零 pageerror。
// 环境：真实 chromium（playwright）+ 真页面 md3-theme.css 布局 + 真实 m3-controls 引擎
//   （动态 import，页面内构造 .md3-switch 夹具挂 body —— CSS 类自足 52×32，无需导航进子页）。
// 采样：独立 rAF 循环全程逐帧抽检 thumb/slider 实测 rect（getBoundingClientRect），
//   gapTop = thumb.top − slider.top、gapBottom = slider.bottom − thumb.bottom（含等宽描边，差值口径不受影响）。
// 截图：CDP Page.captureScreenshot（v8.07 经验：绕开 page.screenshot 的 fonts 等待超时）。

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL = 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
const OUT = join(root, 'docs/v810');

const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1200);

// ---------- 页面内安装夹具 + 采样循环 ----------
const installed = await page.evaluate(async () => {
  const mod = await import('/ios-desktop/js/m3-controls.js');
  const label = document.createElement('label');
  label.className = 'md3-switch';
  label.id = 'v810-fixture';
  label.innerHTML = '<input type="checkbox"><span class="slider"><span class="thumb"></span></span>';
  label.style.cssText = 'position:fixed;left:60px;top:300px;z-index:99999;';
  document.body.appendChild(label);
  mod.initM3Switch(label);

  const thumb = label.querySelector('.thumb');
  const slider = label.querySelector('.slider');
  window.__v810Samples = [];
  let sampling = true;
  (function sample() {
    if (!sampling) return;
    const tr = thumb.getBoundingClientRect();
    const sr = slider.getBoundingClientRect();
    window.__v810Samples.push({
      w: +tr.width.toFixed(2),
      gapTop: +(tr.top - sr.top).toFixed(2),
      gapBottom: +(sr.bottom - tr.bottom).toFixed(2),
      tx: +(tr.left - sr.left).toFixed(2),
    });
    requestAnimationFrame(sample);
  })();

  const pe = (type, x) => new PointerEvent(type, {
    bubbles: true, cancelable: true, pointerId: 7, button: 0, clientX: x, clientY: 316,
  });
  window.__v810 = {
    down: (x) => label.dispatchEvent(pe('pointerdown', x)),
    move: (x) => label.dispatchEvent(pe('pointermove', x)),
    up: (x) => label.dispatchEvent(pe('pointerup', x)),
    setChecked: (v) => { label.querySelector('input').checked = v; },
    stop: () => { sampling = false; },
  };
  return { w: slider.getBoundingClientRect().width, h: slider.getBoundingClientRect().height };
});
console.log(`fixture slider rect: ${installed.w}x${installed.h}`);
if (Math.abs(installed.w - 52) > 0.5 || Math.abs(installed.h - 32) > 0.5) {
  console.error('FAIL: 夹具布局异常（期望 52x32）'); process.exit(1);
}

const sleep = (ms) => page.waitForTimeout(ms);
const shot = async (name) => {
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, name), Buffer.from(data, 'base64'));
};

mkdirSync(OUT, { recursive: true });

// ---------- ① 静息态截图 ----------
await sleep(120);
await shot('v810-switch-rest.png');

// ---------- ② 连续按压/释放 10 次（DoD 主口径）----------
const sampleCountBefore = await page.evaluate(() => window.__v810Samples.length);
for (let i = 0; i < 10; i++) {
  await page.evaluate(() => window.__v810.down(80));
  await sleep(i % 3 === 0 ? 140 : 60);           // 按压保持（长短交替，覆盖弹簧不同相位）
  await page.evaluate(() => window.__v810.up(80));
  await sleep(520);                              // 弹簧收敛（k800 ζ0.6 ≈ 0.35s）
}

// ---------- ③ 拖拽序列：左右往复跨中线 + 中途释放 ----------
await page.evaluate(() => window.__v810.down(80));
await sleep(60);
for (const x of [95, 110, 95, 80, 65, 50, 65, 80, 95, 82]) {
  await page.evaluate((xx) => window.__v810.move(xx), x);
  await sleep(24);
}
await page.evaluate(() => window.__v810.up(82));
await sleep(600);

// ---------- ④ 程序化切换路径（change 事件弹簧全程）----------
await page.evaluate(() => {
  window.__v810.setChecked(false);
  const input = document.querySelector('#v810-fixture input');
  input.checked = true;
  input.dispatchEvent(new Event('change', { bubbles: true }));
});
await sleep(600);

const samples = await page.evaluate(() => { window.__v810.stop(); return window.__v810Samples; });
const pressed = samples.filter((s) => s.w > 27.4);
const resting24 = samples.filter((s) => Math.abs(s.w - 24) < 0.6);
const asymmetric = samples.filter((s) => Math.abs(s.gapTop - s.gapBottom) >= 0.5);
const maxAsym = samples.reduce((m, s) => Math.max(m, Math.abs(s.gapTop - s.gapBottom)), 0);
const draggedTx = new Set(samples.filter((s) => s.w > 27.4).map((s) => s.tx.toFixed(1)));

console.log(`samples=${samples.length} pressed=${pressed.length} rest24=${resting24.length}`);
console.log(`max|gapTop-gapBottom| = ${maxAsym.toFixed(3)}px  (DoD < 0.5px)`);
console.log(`drag tx variety: ${draggedTx.size} 档（跟手性）`);

let ok = true;
const fail = (msg) => { ok = false; console.error('FAIL:', msg); };
if (samples.length < 150) fail(`采样过少 ${samples.length}（rAF 循环未跑？）`);
if (pressed.length < 20) fail(`按压帧样本不足 ${pressed.length}（应覆盖 10 次按压保持段）`);
if (maxAsym >= 0.5) fail(`端隙不对称超限：${maxAsym.toFixed(3)}px ≥ 0.5px，共 ${asymmetric.length} 帧`);
if (draggedTx.size < 5) fail(`拖拽跟手样本不足：tx 仅 ${draggedTx.size} 档`);
const last = samples[samples.length - 1];
if (Math.abs(last.w - 24) > 0.6 || Math.abs(last.gapTop - 4) > 0.5 || Math.abs(last.gapBottom - 4) > 0.5) {
  fail(`终态几何异常: w=${last.w} gap=${last.gapTop}/${last.gapBottom}（期望 24 球 4/4）`);
}

// ---------- ⑤ CSS 无 JS 回退路径（CSSOM 规则文本；仅球本体动态路径 —— 
//    .a17-thumb-icon / ::after 为静态 16×16 / 9×9 尺寸，-50% 无时序耦合，§七已排查有意保留） ----------
const cssFallback = await page.evaluate(() => {
  const out = [];
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) {
      if (!r.selectorText || !r.style || !r.style.transform) continue;
      const sel = r.selectorText;
      const isThumbBody = /\.md3-switch(\.[-\w]+| input[^{]*)?\s*\+?\s*\.slider \.thumb$/.test(sel.replace(/\s+/g, ' ').trim())
        || sel === '.md3-switch .thumb';
      if (isThumbBody && !sel.includes('a17-thumb-icon') && !sel.includes('::after')) {
        out.push(`${sel} → ${r.style.transform}`);
      }
    }
  }
  return out;
});
console.log('CSS 回退规则:');
for (const line of cssFallback) console.log('  ', line);
if (!cssFallback.some((s) => s.includes('translate(4px, -12px)'))) fail('静息关回退规则未显式像素化');
if (!cssFallback.some((s) => s.includes('translate(24px, -12px)'))) fail('静息开回退规则未显式像素化');
if (cssFallback.some((s) => s.includes('-50%'))) fail('回退规则残留 -50%');

// ---------- ⑥ 按压中特写截图 ----------
await page.evaluate(() => window.__v810.down(80));
await sleep(90);
await shot('v810-switch-pressed.png');
await page.evaluate(() => window.__v810.up(80));
await sleep(400);

if (errors.length) { ok = false; console.error('FAIL: pageerror ×' + errors.length, errors.slice(0, 3)); }

await browser.close();
console.log(ok ? '\n=== E2E PASS — #79 逐帧端隙对称 + 回退路径显式像素 ===' : '\n=== E2E FAIL ===');
process.exit(ok ? 0 : 1);
