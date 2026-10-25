// ==================== e2e-v820-slider-m3-layout.mjs — #45 竖柄滑块第三轮无头回归 ====================
//
// DoD（material3 1.4.0 SliderImpl/drawTrack/Thumb 权威语义）：
//   A. 常态几何：track 两端各内缩 2px（margin 0 2px = thumbW/2）、thumb 左缘 = trackW·frac
//      （v=80）、track 本底透明（backgroundColor = transparent）、视觉缝 = 6（ThumbTrackGapSize）
//   B. 按压联动：pointerdown 不释放 → thumb 宽 4→2 / radius 2→1 / track +2px（margin 1px）/
//      thumb 左缘不变（值不变时）/ 视觉缝恒 6 / 松手回 4
//   C. 端点语义：v=100 → thumb 中心 = track 右端、inactive width=0（段消失露 frame 底色）；
//      v=15 → 双段在场
//   D. 拖拽跟手线性 + 全程零 pageerror
// 场景：1280×800 classic split（v8.17 同导航：下拉 QS 列含亮度条）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v820');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};
const near = (a, b, tol = 1.01) => Math.abs(a - b) <= tol;

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);

// 下拉面板（split：双列常显）
await page.mouse.move(640, 8);
await page.mouse.down();
for (let y = 40; y <= 340; y += 30) { await page.mouse.move(640, y); await sleep(20); }
await page.mouse.up();
await sleep(1100);

// ---------- A. 常态几何（v=80 初始值） ----------
const g0 = await page.evaluate(() => {
  const bar = document.getElementById('qsBrightnessBar');
  const row = bar?.querySelector('.qs-bs-row');
  const track = document.getElementById('qsBsTrack');
  const active = document.getElementById('qsBsActive');
  const inactive = document.getElementById('qsBsInactive');
  const thumb = document.getElementById('qsBsThumb');
  const frame = bar?.querySelector('.qs-bs-frame');
  if (!bar || !track || !thumb) return null;
  const r = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; };
  const cs = (el) => getComputedStyle(el);
  return {
    value: Number(bar.getAttribute('aria-valuenow')),
    row: r(row), track: r(track), thumb: r(thumb),
    activeRight: active ? r(active).right : null,
    inactiveLeft: inactive ? r(inactive).left : null,
    inactiveW: inactive ? inactive.getBoundingClientRect().width : null,
    thumbW: r(thumb).width, thumbRadius: cs(thumb).borderRadius,
    trackMarginL: cs(track).marginLeft, trackMarginR: cs(track).marginRight,
    trackBg: cs(track).backgroundColor,
    frameBg: frame ? cs(frame).backgroundColor : '',
    thumbLeftRow: r(thumb).left - r(row).left,
    trackLeftRow: r(track).left - r(row).left,
    trackW: r(track).width,
  };
});
console.log('A. 常态几何（v=80）:');
A('A1 亮度初始 80', g0 && g0.value === 80, `value=${g0 && g0.value}`);
A('A2 track 两端各内缩 2px（margin = thumbW/2）', g0 && near(g0.trackLeftRow, 2) && g0.trackMarginL === '2px', `left=${g0 && g0.trackLeftRow} mL=${g0 && g0.trackMarginL}`);
A('A3 track 本底透明（段消失露 frame 底）', g0 && (g0.trackBg === 'rgba(0, 0, 0, 0)' || g0.trackBg === 'transparent'), `bg=${g0 && g0.trackBg}`);
A('A4 thumb 宽 4 / radius 2（常态）', g0 && g0.thumbW === 4 && g0.thumbRadius === '2px', `w=${g0 && g0.thumbW} r=${g0 && g0.thumbRadius}`);
{
  const expectLeft = g0.trackW * (g0.value / 100);           // thumbOffsetX = trackW·frac
  A('A5 thumb 左缘 = trackW·frac（左缘 travels 语义）', near(g0.thumbLeftRow, expectLeft, 1.2), `left=${g0.thumbLeftRow.toFixed(2)} expect=${expectLeft.toFixed(2)}`);
  const gapVis = g0.thumb.left - g0.activeRight;              // 视觉缝 = ThumbTrackGapSize
  A('A6 视觉缝 = 6（thumbTrackGapSize，endGap=8 系 track 内坐标含半 thumb）', near(gapVis, 6, 1.2), `gap=${gapVis.toFixed(2)}`);
  const inactGap = g0.inactiveLeft - g0.thumb.right;
  A('A7 inactive 段起于 thumb 右侧缝 6', near(inactGap, 6, 1.2), `gap=${inactGap.toFixed(2)}`);
}

// ---------- B. 按压联动（pointerdown 不释放 @ thumb 当前位置，值保持 80） ----------
const thumbCx = (g0.thumb.left + g0.thumb.right) / 2;
const thumbCy = (g0.thumb.top + g0.thumb.bottom) / 2;
await page.mouse.move(thumbCx, thumbCy);
await page.mouse.down();
await sleep(160);   // 按压联动 render 完成
const g1 = await page.evaluate(() => {
  const bar = document.getElementById('qsBrightnessBar');
  const row = bar?.querySelector('.qs-bs-row');
  const track = document.getElementById('qsBsTrack');
  const active = document.getElementById('qsBsActive');
  const thumb = document.getElementById('qsBsThumb');
  const r = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, width: b.width, height: b.height }; };
  const cs = (el) => getComputedStyle(el);
  return {
    dragging: bar.classList.contains('is-dragging'),
    value: Number(bar.getAttribute('aria-valuenow')),
    thumbW: r(thumb).width, thumbRadius: cs(thumb).borderRadius,
    thumbLeftRow: r(thumb).left - r(row).left,
    trackW: r(track).width, trackMarginL: cs(track).marginLeft,
    activeRight: active ? r(active).right : null,
    thumb: r(thumb),
  };
});
console.log('B. 按压联动（is-dragging）:');
A('B1 is-dragging 类生效', g1.dragging);
A('B2 thumb 宽减半 4→2（Thumb interactions 语义）', g1.thumbW === 2, `w=${g1.thumbW}`);
A('B3 CornerFull 圆角随宽 2→1', g1.thumbRadius === '1px', `r=${g1.thumbRadius}`);
A('B4 track 加宽 2px（W−4 → W−2，margin 1px）', near(g1.trackW, g0.trackW + 2) && g1.trackMarginL === '1px', `w=${g1.trackW} mL=${g1.trackMarginL}`);
A('B5 thumb 左缘移动 = 2×frac（trackW 联动重测：thumbOffsetX = trackW·frac，SliderImpl measure 语义；Spacer 在 Box 内相对左缘锚定）', near(g1.thumbLeftRow - g0.thumbLeftRow, 2 * (g1.value / 100), 0.5), `Δ=${(g1.thumbLeftRow - g0.thumbLeftRow).toFixed(2)} expect=${(2 * (g1.value / 100)).toFixed(2)}`);
A('B6 视觉缝恒 6（endGap 8→7 联动但缝不变）', near(g1.thumb.left - g1.activeRight, 6, 1.2), `gap=${(g1.thumb.left - g1.activeRight).toFixed(2)}`);
await page.screenshot({ path: join(OUT, 'pressed-thumb-2px.png'), clip: { x: g0.row.left - 30, y: g0.row.top - 30, width: g0.row.width + 60, height: g0.row.height + 60 } });
await page.mouse.up();
await sleep(120);
const g2 = await page.evaluate(() => {
  const thumb = document.getElementById('qsBsThumb');
  const track = document.getElementById('qsBsTrack');
  const cs = (el) => getComputedStyle(el);
  return { thumbW: thumb.getBoundingClientRect().width, thumbRadius: cs(thumb).borderRadius, mL: cs(track).marginLeft };
});
A('B7 松手回常态（宽 4 / radius 2 / margin 2px）', g2.thumbW === 4 && g2.thumbRadius === '2px' && g2.mL === '2px', `w=${g2.thumbW} r=${g2.thumbRadius} mL=${g2.mL}`);

// ---------- C. 端点语义（v=100 段消失 / v=15 双段在场） ----------
await page.evaluate(() => window.__qsBrightness.set(100));
await sleep(100);
const c100 = await page.evaluate(() => {
  const bar = document.getElementById('qsBrightnessBar');
  const row = bar?.querySelector('.qs-bs-row');
  const track = document.getElementById('qsBsTrack');
  const active = document.getElementById('qsBsActive');
  const inactive = document.getElementById('qsBsInactive');
  const thumb = document.getElementById('qsBsThumb');
  const r = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width }; };
  return {
    inactiveW: inactive.getBoundingClientRect().width,
    inactiveStyleW: inactive.style.width,
    thumbCenter: (r(thumb).left + r(thumb).right) / 2,
    trackRight: r(track).right,
    activeW: r(active).width,
  };
});
A('C1 v=100 inactive 完全消失（style width 归一化 0px）', c100.inactiveW === 0 && parseFloat(c100.inactiveStyleW) === 0, `w=${c100.inactiveW} s=${c100.inactiveStyleW}`);
A('C2 v=100 thumb 中心 = track 右端（左缘 travels 端点语义，不溢出）', near(c100.thumbCenter, c100.trackRight, 1.2), `c=${c100.thumbCenter.toFixed(2)} tr=${c100.trackRight.toFixed(2)}`);
A('C3 v=100 active 段 = trackW − 8（endGap 常态）', near(c100.activeW, g0.trackW - 8, 1.5), `aw=${c100.activeW.toFixed(2)}`);
await page.screenshot({ path: join(OUT, 'v100-inactive-gone.png'), clip: { x: g0.row.left - 30, y: g0.row.top - 30, width: g0.row.width + 60, height: g0.row.height + 60 } });

await page.evaluate(() => window.__qsBrightness.set(15));
await sleep(100);
const c15 = await page.evaluate(() => {
  const active = document.getElementById('qsBsActive');
  const inactive = document.getElementById('qsBsInactive');
  return { activeW: active.getBoundingClientRect().width, inactiveW: inactive.getBoundingClientRect().width };
});
A('C4 v=15 双段在场（active≈trackW·0.15−8 / inactive 在场）', c15.activeW > 12 && c15.inactiveW > 0, `a=${c15.activeW.toFixed(1)} i=${c15.inactiveW.toFixed(1)}`);

// ---------- D. 拖拽跟手（pointer 流线性映射） ----------
const trackBox = await page.evaluate(() => {
  const t = document.getElementById('qsBsTrack');
  const b = t.getBoundingClientRect();
  return { left: b.left, width: b.width, top: b.top + b.height / 2 };
});
const targetX = trackBox.left + trackBox.width * 0.5;
await page.mouse.move(targetX, trackBox.top);
await page.mouse.down();
await sleep(60);
await page.mouse.up();
await sleep(100);
const v50 = await page.evaluate(() => Number(document.getElementById('qsBrightnessBar').getAttribute('aria-valuenow')));
A('D1 tap 50% → 值 ≈ 50（tap-to-position + 按压后布局解算）', Math.abs(v50 - 50) <= 3, `v=${v50}`);

A('D2 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));

console.log(`\n===== e2e-v820: ${pass} passed, ${fail} failed =====`);
await browser.close();
process.exit(fail ? 1 : 0);
