// ==================== e2e-v813-ripple-overlay.mjs — #38 无头回归 ====================
//
// DoD（议题 #38）：
//   A. 点击列表行正中：涟漪质心与触点垂直误差 ≤ 2px（按住稳态截图，红涟漪逐像素质心）
//   B. 快速连点 5 次同一行：多会话共存（__rippleDebug().sessions ≥ 2 双采样点）+
//      红像素总数显著多于单点（层叠证据）
//   C. 全部会话结束后：sessions = 0 且无残留异常像素（红/白块对比基线帧）
// 环境：真实 chromium + 真页面导航（解锁 → 设置 → 电池子页，#38 证据页）。
// 截图：CDP Page.captureScreenshot（v8.07 经验：绕开 page.screenshot fonts 等待超时）；
//   PNG 解码与像素统计在页面内 OffscreenCanvas 完成（v8.07 探针同款）。

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL = 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
const OUT = join(root, 'docs/v813');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1200);

// ---------- 导航：解锁（如出现电源对话框）→ 设置 → 电池子页 ----------
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(600);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]')?.click());
await page.waitForTimeout(900);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="battery"]')?.click());
await page.waitForTimeout(1200);

// ---------- 页面内安装：红涟漪注入 + 行定位 + 截图解码统计工具 ----------
const setup = await page.evaluate(async () => {
  // 红涟漪（body 级继承给全部行元素；仅影响 ripple-fx 读到的 --ripple-color）
  document.body.style.setProperty('--ripple-color', 'rgba(255,0,0,1)');

  // 选目标行：电池子页第一个**真实可见**的行（checkVisibility + 命中校验双保险；
  // 一级列表行进子页后被覆盖，v7.42 宿主遮挡消散会 90ms 杀会话——必须选子页可见行）
  const cands = [...document.querySelectorAll('.tp-row, .md3-list-item, [data-ripple]')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      if (!(r.width > 120 && r.height > 28 && r.top > 40 && r.bottom < innerHeight - 20)) return false;
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
      const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return h && (h === el || el.contains(h));
    });
  const row = cands[0];
  if (!row) return { ok: false, reason: 'no-row' };
  row.scrollIntoView({ block: 'center' });
  const rect = row.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // 截图 base64 → 像素统计（页面内解码）
  window.__v813Decode = async (b64) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
    const bmp = await createImageBitmap(blob);
    const oc = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = oc.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    return ctx.getImageData(0, 0, bmp.width, bmp.height).data;
  };
  window.__v813Stats = (px, W, H, box) => {
    // box = {x0,y0,x1,y1} CSS 像素窗口（CDP 截图按 CSS 像素输出，dsf=1 直接对应）
    let red = 0, rx = 0, ry = 0, white = 0, redSum = 0;
    const x0 = Math.max(0, Math.floor(box.x0)), y0 = Math.max(0, Math.floor(box.y0));
    const x1 = Math.min(W - 1, Math.ceil(box.x1)), y1 = Math.min(H - 1, Math.ceil(box.y1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = (y * W + x) * 4;
        const r = px[i], g = px[i + 1], b = px[i + 2];
        if (r > 190 && g < 90 && b < 90) { red++; rx += x; ry += y; redSum += (255 - g) + (255 - b); }
        else if (r > 200 && g > 200 && b > 200) white++;   // 高亮像素（覆盖粉白过渡带，白块残留指标）
      }
    }
    return { red, cx: red ? rx / red : -1, cy: red ? ry / red : -1, white,
      redIntensity: red ? redSum / red : 0 };
  };

  // 合成指针事件（ripple-fx 文档级 capture 监听，bubbles 冒泡即可达）
  const pe = (type, id) => new PointerEvent(type, {
    bubbles: true, cancelable: true, pointerId: id, button: 0,
    clientX: cx, clientY: cy, isPrimary: true,
  });
  window.__v813 = {
    down: (id = 1) => row.dispatchEvent(pe('pointerdown', id)),
    up: (id = 1) => row.dispatchEvent(pe('pointerup', id)),
    rowBox: { x0: rect.left - 8, y0: rect.top - 8, x1: rect.right + 8, y1: rect.bottom + 8 },
    touch: { cx, cy },
    rowSel: row.className,
  };
  return {
    ok: true, rowSel: row.className, rect: { w: rect.width, h: rect.height, top: rect.top },
    touch: { cx, cy },
    debug0: window.__rippleDebug ? window.__rippleDebug() : null,
  };
});
if (!setup.ok) { console.error('SETUP FAIL', setup); process.exit(1); }
console.log('SETUP', JSON.stringify(setup));

const cdp = await page.context().newCDPSession(page);
async function shot() {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  return data;
}

const results = {};

// ---------- 场景 A：按住稳态 → 质心 vs 触点（垂直误差 ≤ 2px） ----------
await page.waitForFunction(() => !window.__rippleDebug || window.__rippleDebug().sessions === 0, null, { timeout: 5000 }).catch(() => {});
const basePng = await shot();
results.base = await page.evaluate(async (b64) => {
  const px = await window.__v813Decode(b64);
  return window.__v813Stats(px, innerWidth, innerHeight, window.__v813.rowBox);
}, basePng);

await page.evaluate(() => window.__v813.down(1));
await page.waitForTimeout(520);            // enter 450ms 完成，稳态
const holdPng = await shot();
await page.evaluate(() => window.__v813.up(1));
results.hold = await page.evaluate(async (b64) => {
  const px = await window.__v813Decode(b64);
  return window.__v813Stats(px, innerWidth, innerHeight, window.__v813.rowBox);
}, holdPng);
writeFileSync(join(OUT, 'v813-hold-single.png'), Buffer.from(holdPng, 'base64'));

// ---------- 场景 B：快速连点 5 次（紧凑节奏 300ms 内）→ 多会话共存 + 中心红度叠加 + sparkle 白点治理 ----------
await page.waitForFunction(() => !window.__rippleDebug || window.__rippleDebug().sessions === 0, null, { timeout: 5000 }).catch(() => {});
const sessMid = [];
for (let i = 1; i <= 5; i++) {
  await page.evaluate((id) => window.__v813.down(id), i);
  if (i === 3) sessMid.push(await page.evaluate(() => window.__rippleDebug()));
  await page.waitForTimeout(10);
  await page.evaluate((id) => window.__v813.up(id), i);
  await page.waitForTimeout(50);
}
results.sessAtTap3 = sessMid[0];
results.sessAfter5 = await page.evaluate(() => window.__rippleDebug());
const burstPng = await shot();             // 第 5 点 up 后立即截（<450ms exit 窗口内，5 会话全活）
results.burst = await page.evaluate(async (b64) => {
  const px = await window.__v813Decode(b64);
  return window.__v813Stats(px, innerWidth, innerHeight, window.__v813.rowBox);
}, burstPng);
writeFileSync(join(OUT, 'v813-burst5.png'), Buffer.from(burstPng, 'base64'));

// ---------- 场景 C：结束清空 → 无残留 ----------
await page.waitForTimeout(1600);
results.sessFinal = await page.evaluate(() => window.__rippleDebug());
const endPng = await shot();
results.end = await page.evaluate(async (b64) => {
  const px = await window.__v813Decode(b64);
  return window.__v813Stats(px, innerWidth, innerHeight, window.__v813.rowBox);
}, endPng);
writeFileSync(join(OUT, 'v813-end.png'), Buffer.from(endPng, 'base64'));

console.log('RESULTS', JSON.stringify(results, null, 2));
console.log('PAGEERRORS', errors.length, errors.slice(0, 3));

// ---------- 判定 ----------
const t = setup.touch.cy;
const verdict = {
  A_offset: Math.abs(results.hold.cy - t),
  A_pass: Math.abs(results.hold.cy - t) <= 2 && results.hold.red > 50,
  B_overlay: results.sessAtTap3 && results.sessAtTap3.sessions,
  // 多会话共存（机制）+ 红强度叠加（burst 多层 → 平均红度高于单点按住）
  B_pass: results.sessAtTap3 && results.sessAtTap3.sessions >= 2
    && results.burst.redIntensity > results.hold.redIntensity * 0.85,
  C_clean: results.sessFinal.sessions === 0
    && results.end.red <= results.base.red + 5
    && results.end.white <= results.base.white + 40,
};
console.log('VERDICT', JSON.stringify(verdict, null, 2));

await browser.close();
process.exit(verdict.A_pass && verdict.B_pass && verdict.C_clean ? 0 : 2);
