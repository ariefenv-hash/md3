// 调试：v=100 时 thumb 实际落点 + 周边像素补丁 + frame 上下外缘亮度梯度
import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => document.querySelector('.power-dialog-card button[data-act="once"]')?.click());
await page.waitForTimeout(500);
await page.mouse.move(640, 8);
await page.mouse.down();
for (let y = 40; y <= 340; y += 30) { await page.mouse.move(640, y); await sleep(20); }
await page.mouse.up();
await sleep(1100);

const geo = await page.evaluate(() => {
  const bar = document.getElementById('qsBrightnessBar');
  const row = bar.querySelector('.qs-bs-row');
  const track = document.getElementById('qsBsTrack');
  const frame = bar.querySelector('.qs-bs-frame');
  const r = (el) => { const b = el.getBoundingClientRect(); return { left: +b.left.toFixed(1), top: +b.top.toFixed(1), right: +b.right.toFixed(1), bottom: +b.bottom.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  return { bar: r(bar), row: r(row), track: r(track), frame: r(frame), rowW: row.clientWidth, trackW: track.clientWidth };
});
console.log('GEO:', JSON.stringify(geo));

const trackCy = (geo.track.top + geo.track.bottom) / 2;
await page.mouse.move(geo.track.left + geo.track.w * 0.8, trackCy);
await page.mouse.down();
for (let x = geo.track.left + geo.track.w * 0.8; x < geo.track.right - 1; x += 20) { await page.mouse.move(x, trackCy); await sleep(12); }
await page.mouse.move(geo.track.right - 1, trackCy); await sleep(40);
await page.mouse.up();
await sleep(350);

const post = await page.evaluate(() => {
  const bar = document.getElementById('qsBrightnessBar');
  const thumb = document.getElementById('qsBsThumb');
  const track = document.getElementById('qsBsTrack');
  const b = thumb.getBoundingClientRect();
  return {
    value: bar.getAttribute('aria-valuenow'),
    thumbLeft: thumb.style.left,
    thumbRect: { left: +b.left.toFixed(1), top: +b.top.toFixed(1), right: +b.right.toFixed(1), bottom: +b.bottom.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) },
    track: { left: track.getBoundingClientRect().left, top: track.getBoundingClientRect().top, w: track.clientWidth, h: track.clientHeight },
    primary: getComputedStyle(thumb).backgroundColor,
  };
});
console.log('POST:', JSON.stringify(post));

const cdp = await page.context().newCDPSession(page);
const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
const dbg = await page.evaluate(async ({ b64, post }) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await new Promise((res) => { img.onload = res; });
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const s = img.width / 1280;
  const px = (x, y) => Array.from(ctx.getImageData(Math.round(x * s), Math.round(y * s), 1, 1).data.slice(0, 3));
  const t = post.track;
  const cx = t.left + t.w - 2;
  const patch = [];
  for (let dy = -2; dy <= 2; dy++) {
    const row = [];
    for (let dx = -3; dx <= 3; dx++) row.push(px(cx + dx, t.top - 3 + dy).map(Math.round).join(','));
    patch.push(row.join(' | '));
  }
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const f = { top: t.top - 6, bottom: t.top + 46 }; // frame 上下缘（frame = track ± 6 纵向）
  const gradTop = { in: px(t.left + t.w / 2, f.top - 4), out: px(t.left + t.w / 2, f.top - 12) };
  const gradBot = { in: px(t.left + t.w / 2, f.bottom + 4), out: px(t.left + t.w / 2, f.bottom + 12) };
  return {
    s,
    patchAroundThumbTop: patch,
    gradTop: { ...gradTop, lumIn: lum(gradTop.in).toFixed(0), lumOut: lum(gradTop.out).toFixed(0) },
    gradBot: { ...gradBot, lumIn: lum(gradBot.in).toFixed(0), lumOut: lum(gradBot.out).toFixed(0) },
  };
}, { b64: data, post });
console.log('DBG:', JSON.stringify(dbg, null, 1));
await browser.close();
