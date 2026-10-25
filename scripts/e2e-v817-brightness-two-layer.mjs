// ==================== e2e-v817-brightness-two-layer.mjs — #78 无头回归 ====================
//
// DoD（议题 #78 · 方案 A）：
//   A. 两层结构：halo（rgba(0,0,0,.28) 外扩 8px 环）像素级无残留（frame 外缘 ±4px =
//      面板底色，非暗环）；.panel-scroll overflow-x:hidden 裁断问题随删层消失
//   B. 圆角单源重合：track overflow:hidden（唯一圆角权威），active/inactive 段
//      computed radius = 内角 2dp、外角 0px（双元素各画同一条圆弧的 AA 亚像素错位
//      结构性根除）；thumb 外移 row 后 52dp 出头完整可见（不被新裁切域波及）
//   C. 源码原值不动：thumb 4×52 / track 40 / gap 8 / 段消失阈值（v=100 inactive 消失）
//   D. 亮度 15/100 两档真实拖拽 + dsf=2 截图像素分类（角区仅 面板底/primary 两族）
// 场景：1280×800 classic split（≥600px 双列常显，单次下拉 QS 列即含亮度条）。

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v817');
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

// ---------- 几何映射 + computed 样式 ----------
const geo = await page.evaluate(() => {
  const bar = document.getElementById('qsBrightnessBar');
  const frame = bar?.querySelector('.qs-bs-frame');
  const row = bar?.querySelector('.qs-bs-row');
  const track = document.getElementById('qsBsTrack');
  const active = document.getElementById('qsBsActive');
  const inactive = document.getElementById('qsBsInactive');
  const thumb = document.getElementById('qsBsThumb');
  if (!bar || !track || !thumb) return null;
  const r = (el) => { const b = el.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height }; };
  const cs = (el) => getComputedStyle(el);
  return {
    visible: bar.offsetWidth > 0 && bar.offsetHeight > 0,
    bar: r(bar), frame: frame ? r(frame) : null, row: row ? r(row) : null,
    track: r(track), thumb: r(thumb),
    colors: {
      frameBg: frame ? cs(frame).backgroundColor : '',
      trackBg: cs(track).backgroundColor,
      primary: cs(thumb).backgroundColor,
    },
    trackOverflowX: cs(track).overflowX,
    activeRadius: active ? { tl: cs(active).borderTopLeftRadius, tr: cs(active).borderTopRightRadius, br: cs(active).borderBottomRightRadius, bl: cs(active).borderBottomLeftRadius } : null,
    inactiveRadius: inactive ? { tl: cs(inactive).borderTopLeftRadius, tr: cs(inactive).borderTopRightRadius, br: cs(inactive).borderBottomRightRadius, bl: cs(inactive).borderBottomLeftRadius } : null,
    rowPosition: row ? cs(row).position : '',
    thumbParentIsRow: !!row && thumb.parentElement === row,
    value: bar.getAttribute('aria-valuenow'),
    activeW: active ? parseFloat(active.style.width) : null,
    inactiveW: inactive ? inactive.style.width : null,
  };
});
A('亮度条可见（split QS 列）', !!geo && geo.visible, geo ? `value=${geo.value}` : 'geo=null');
A('B1 track overflowX=hidden（单源圆角权威）', geo?.trackOverflowX === 'hidden', `overflowX=${geo?.trackOverflowX}`);
A('B2 active 段外角 0px / 内角 2px（computed）', !!geo?.activeRadius && geo.activeRadius.tl === '0px' && geo.activeRadius.bl === '0px' && geo.activeRadius.tr === '2px' && geo.activeRadius.br === '2px', JSON.stringify(geo?.activeRadius));
A('B3 inactive 段外角 0px / 内角 2px（computed）', !!geo?.inactiveRadius && geo.inactiveRadius.tr === '0px' && geo.inactiveRadius.br === '0px' && geo.inactiveRadius.tl === '2px' && geo.inactiveRadius.bl === '2px', JSON.stringify(geo?.inactiveRadius));
A('B4 row position:relative + thumb 宿主=row', geo?.rowPosition === 'relative' && geo?.thumbParentIsRow === true, `pos=${geo?.rowPosition}`);
A('B5 thumb 几何：52dp 高 + top 出头 6px（不被裁切域波及的几何前提）', Math.abs(geo.thumb.height - 52) < 0.6 && Math.abs(geo.thumb.top - (geo.track.top - 6)) < 0.6, `h=${geo.thumb.height} dy=${(geo.thumb.top - geo.track.top).toFixed(2)}`);

// ---------- 拖拽到 100（body.filter factor=1.00，像素全保真） ----------
const trackCy = (geo.track.top + geo.track.bottom) / 2;
await page.mouse.move(geo.track.left + geo.track.width * 0.8, trackCy);
await page.mouse.down();
for (let x = geo.track.left + geo.track.width * 0.8; x < geo.track.right - 1; x += 20) { await page.mouse.move(x, trackCy); await sleep(12); }
await page.mouse.move(geo.track.right - 1, trackCy); await sleep(40);
await page.mouse.up();
await sleep(350);

const geo100 = await page.evaluate(() => {
  const bar = document.getElementById('qsBrightnessBar');
  const track = document.getElementById('qsBsTrack');
  const active = document.getElementById('qsBsActive');
  const inactive = document.getElementById('qsBsInactive');
  return {
    value: bar.getAttribute('aria-valuenow'),
    w: track.clientWidth,
    activeW: parseFloat(active.style.width),
    inactiveW: inactive.style.width,
  };
});
A('C1 v=100：aria-valuenow', geo100.value === '100', `value=${geo100.value}`);
A('C2 段消失阈值：active 宽 = W−8', Math.abs(geo100.activeW - (geo100.w - 8)) <= 1, `activeW=${geo100.activeW} W=${geo100.w}`);
A('C3 v=100 inactive 段消失（width=0）', parseFloat(geo100.inactiveW) === 0, `inactiveW='${geo100.inactiveW}'`);

// CDP 截图（dsf=2；PNG 尺寸自适应域）
const cdp = await page.context().newCDPSession(page);
const shot100 = await cdp.send('Page.captureScreenshot', { format: 'png' });
const png100 = Buffer.from(shot100.data, 'base64');
writeFileSync(join(OUT, 'v817-v100.png'), png100);

// ---------- 像素级断言（v=100，factor=1） ----------
const px100 = await page.evaluate(async ({ b64, geo, frac }) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await new Promise((res) => { img.onload = res; });
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const s = img.width / 1280; // 域适配（CSS px → PNG px）
  const parse = (str) => str.match(/\d+/g).slice(0, 3).map(Number);
  const pal = [parse(geo.colors.frameBg), parse(geo.colors.trackBg), parse(geo.colors.primary)]; // 0=frameBg 1=trackBg 2=primary
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const px = (x, y) => Array.from(ctx.getImageData(Math.round(x * s), Math.round(y * s), 1, 1).data.slice(0, 3));
  const cls = (p, thr = 40) => { let b = -1, bd = 1e9; pal.forEach((c, i) => { const d = dist(p, c); if (d < bd) { bd = d; b = i; } }); return bd <= thr ? b : -1; };
  const out = { scale: s, thumbAbove: 0, thumbBelow: 0, seamRuns: 0, cornerThird: 0, haloResidue: [], haloDebug: [] };
  // D1 thumb 出头可见：cx 按拖拽后值域计算（拖拽前 geo.value 是陈旧值）
  const cx = geo.track.left + geo.track.width * frac - 2;
  for (let dx = -1; dx <= 1; dx++) {
    if (cls(px(cx + dx, geo.track.top - 3)) === 2) out.thumbAbove++;
    if (cls(px(cx + dx, geo.track.bottom + 3)) === 2) out.thumbBelow++;
  }
  // D2 左角区（active 覆盖）：真缝带 = 到 trackBg×f 绝对距离 ≤10 且成片（≥2 连续）；
  //   新代码角区边界混合 = primary↔frameBg 两族，中间色到 trackBg 距离 ≥12（B 通道分离）
  for (let y = geo.track.top + 1.5; y <= geo.track.top + 6; y += 0.75) {
    let run = 0;
    for (let x = geo.track.left; x <= geo.track.left + 16; x += 0.5) {
      if (dist(px(x, y), pal[1]) <= 10) { run++; if (run >= 2) out.seamRuns++; } else run = 0;
    }
  }
  // D3 halo 无残留（亮度比值法，对壁纸/主题鲁棒）：frame 上/下外缘 4px vs 12px，
  //   halo 特征 = 内点亮度 ≈ 外点 × 0.72（28% 黑环）；无 halo = 平滑背景比值 ≈ 1
  const f = geo.frame;
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const cy = (f.top + f.bottom) / 2;
  const ring = [
    { tag: 'top', inner: px(cy, f.top - 4), outer: px(cy, f.top - 12) },
    { tag: 'bottom', inner: px(cy, f.bottom + 4), outer: px(cy, f.bottom + 12) },
  ];
  for (const { tag, inner, outer } of ring) {
    const li = lum(inner), lo = lum(outer);
    // 单侧判据：halo 特征 = 内点比外点暗（li/lo ≈ 0.72）；内点更亮 = 壁纸自然梯度，非环
    const ratio = lo > 8 ? li / lo : 1; // 外点过暗（黑壁纸）时比值无意义，视为无环
    out.haloResidue.push(Math.max(0, 1 - ratio));
    out.haloDebug.push(`${tag}: lumIn=${li.toFixed(0)} lumOut=${lo.toFixed(0)} ratio=${ratio.toFixed(2)}`);
  }
  return out;
}, { b64: shot100.data, geo, frac: parseFloat(geo100.value) / 100 });

A('D1 v=100 thumb 上/下出头可见（不被 track overflow 裁切）', px100.thumbAbove >= 1 && px100.thumbBelow >= 1, `above=${px100.thumbAbove}/3 below=${px100.thumbBelow}/3 s=${px100.scale}`);
A('D2 v=100 左角区无 trackBg 缝带（绝对距离判据）', px100.seamRuns === 0, `seamRuns=${px100.seamRuns}`);
A('D3 halo 无残留：frame 上/下外缘亮度比 ≈ 1（halo 特征 0.72，阈值 0.08）', Math.max(...px100.haloResidue) < 0.08, px100.haloDebug.join(' | '));

// ---------- 拖拽到 15（factor=0.4475，分类用相对最近色，域保序） ----------
await page.mouse.move(geo.track.left + geo.track.width * 0.5, trackCy);
await page.mouse.down();
for (let x = geo.track.left + geo.track.width * 0.5; x > geo.track.left + 1; x -= 20) { await page.mouse.move(x, trackCy); await sleep(12); }
await page.mouse.move(geo.track.left + 1, trackCy); await sleep(40);
await page.mouse.up();
await sleep(350);

const geo15 = await page.evaluate(() => {
  const bar = document.getElementById('qsBrightnessBar');
  const track = document.getElementById('qsBsTrack');
  const active = document.getElementById('qsBsActive');
  const inactive = document.getElementById('qsBsInactive');
  return {
    value: bar.getAttribute('aria-valuenow'),
    w: track.clientWidth,
    activeW: parseFloat(active.style.width),
    inactiveW: inactive.style.width,
  };
});
A('C4 v=15：aria-valuenow（下限模型）', geo15.value === '15', `value=${geo15.value}`);
A('C5 v=15 active 宽 = 0.15W−8（>12 绘制）', Math.abs(geo15.activeW - (geo15.w * 0.15 - 8)) <= 1, `activeW=${geo15.activeW} exp=${(geo15.w * 0.15 - 8).toFixed(1)}`);
A('C6 v=15 inactive 段在（width≠0）', geo15.inactiveW !== '0', `inactiveW='${geo15.inactiveW}'`);

const shot15 = await cdp.send('Page.captureScreenshot', { format: 'png' });
writeFileSync(join(OUT, 'v817-v15.png'), Buffer.from(shot15.data, 'base64'));
const px15 = await page.evaluate(async ({ b64, geo, geo15 }) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await new Promise((res) => { img.onload = res; });
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const s = img.width / 1280;
  const parse = (str) => str.match(/\d+/g).slice(0, 3).map(Number);
  const factor = 0.35 + 0.65 * (15 / 100); // body.filter brightness(0.4475)
  const pal = [parse(geo.colors.frameBg), parse(geo.colors.trackBg), parse(geo.colors.primary)].map((c) => c.map((v) => v * factor));
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const px = (x, y) => Array.from(ctx.getImageData(Math.round(x * s), Math.round(y * s), 1, 1).data.slice(0, 3));
  const cls = (p, thr = 40) => { let b = -1, bd = 1e9; pal.forEach((c, i) => { const d = dist(p, c); if (d < bd) { bd = d; b = i; } }); return bd <= thr ? b : -1; };
  const out = { thumbAbove: 0, thumbBelow: 0, seamRuns: 0 };
  const cx = geo.track.left + geo.track.width * 0.15 - 2; // v=15 thumb 中心（calc(15% - 2px) 左缘 +2）
  for (let dx = -1; dx <= 1; dx++) {
    if (cls(px(cx + dx, geo.track.top - 3)) === 2) out.thumbAbove++;
    if (cls(px(cx + dx, geo.track.bottom + 3)) === 2) out.thumbBelow++;
  }
  for (let y = geo.track.top + 1.5; y <= geo.track.top + 6; y += 0.75) {
    let run = 0;
    for (let x = geo.track.left; x <= geo.track.left + 16; x += 0.5) {
      if (dist(px(x, y), pal[1]) <= 10) { run++; if (run >= 2) out.seamRuns++; } else run = 0;
    }
  }
  return out;
}, { b64: shot15.data, geo, geo15 });

A('D4 v=15 thumb 上/下出头可见（缩放域）', px15.thumbAbove >= 1 && px15.thumbBelow >= 1, `above=${px15.thumbAbove}/3 below=${px15.thumbBelow}/3`);
A('D5 v=15 左角区无 trackBg 缝带（绝对距离判据）', px15.seamRuns === 0, `seamRuns=${px15.seamRuns}`);
A('零 pageerror', errors.length === 0, errors.join(';').slice(0, 120));

await browser.close();
console.log(`\n==== v817 e2e 汇总：PASS ${pass} / FAIL ${fail} ====`);
process.exit(fail > 0 ? 1 : 0);
