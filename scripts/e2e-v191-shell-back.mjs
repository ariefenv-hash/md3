// ==================== e2e-v191-shell-back.mjs — #191 WM Shell 侧三机制无头回归 ====================
//
// DoD（真实鼠标手势流，1280×800）：
//   P. 前置：解锁 → 浅色壁纸（真实取色管线）→ 打开设置（根页 navHistory=1）
//   C. 提交流（先行）：快速拖过 25% 屏宽 → commit → 收场期 back-animation-background 可见
//      （showLayer 延迟到 commit）→ app-window-closed 后层移除 + 外观类复位 + 应用关闭
//   A/B. 取消流（后行）：重开应用 → 慢速拖到进度 ~0.5 → 浅色主色 + 双门齐
//      （top>半高 且 progress≥0.20）→ body.back-sysui-light-icons（APPEARANCE_LIGHT_STATUS_BARS）
//      → 层武装但不可见 → 松手取消 → 外观复位 + 层拆除 + 应用保持打开
//   D. 全程零 pageerror
// 注：提交流先行 —— 取消流松手点落在应用内容上会触发子页导航，污染后续根页手势判定。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v191');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

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

// 浅色壁纸：走真实自定义壁纸管线（页面内 import wallpaper.js → applyCustomWallpaper
// → K-means 取色 → palette.primary 亮色），非种子作弊。v7.6 起默认壁纸为程序化 aurora
// （零网络），无法 route 拦截，故用 canvas 生成浅灰蓝 RGB(226,230,240) 小图。
await page.evaluate(async () => {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 8;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgb(226, 230, 240)';
  ctx.fillRect(0, 0, 8, 8);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const mod = await import(location.origin + '/ios-desktop/js/wallpaper.js');
  await mod.applyCustomWallpaper(blob, false);
});
await page.waitForTimeout(900); // 等取色回调（K-means + tonalize → currentPalette）
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]')?.click());
await sleep(1000);

const layerInfo = () => page.evaluate(() => {
  const el = document.querySelector('.back-animation-background');
  const dbg = window.__qsDebug ? window.__qsDebug() : null;
  return {
    exists: !!el,
    vis: el ? getComputedStyle(el).visibility : null,
    bg: el ? el.style.background : null,
    lightIcons: document.body.classList.contains('back-sysui-light-icons'),
    isOpen: dbg ? dbg.isOpen : null,
  };
});
const luminanceOf = (bg) => {
  const m = (bg || '').match(/rgb\((\d+), (\d+), (\d+)\)/);
  if (!m) return -1;
  const lin = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(+m[1]) + 0.7152 * lin(+m[2]) + 0.0722 * lin(+m[3]);
};

const s0 = await layerInfo();
A('P0 应用打开（根页）', s0.isOpen === true, `isOpen=${s0.isOpen}`);
A('P1 手势前无背景层（层随手势生命周期）', s0.exists === false, `exists=${s0.exists}`);

// ---------- C. 提交流：快速拖过 25% 屏宽（>320px，距离通道必达） ----------
await page.mouse.move(4, 400);
await page.mouse.down();
// 快甩：48px/~25ms ≈ 1900px/s ≈ 4.8 progress/s（阈值 1.0101）——且 rawDx(history 窗 6)
// ≈240 < 320（25% 屏宽），提交完全由 #191 新进度速度通道达成（距离通道不参与）。
// 终点 x=398（xT=394 < 412）：p=(394−16)/396=0.954 不饱和 —— 饱和后 Δp=0 会把末窗速度
// 清零（生产语义由 25% 距离通道兜底，e2e 专测速度通道故不触饱和）
for (let x = 14; x <= 398; x += 48) { await page.mouse.move(x, 400); await sleep(4); }
await page.mouse.up();
// 收场动画期轮询采样（~350ms 窗口内层必现；CDP 抖动下防单帧错过）
let closing = null;
for (let i = 0; i < 8; i++) {
  closing = await layerInfo();
  if (closing.exists && closing.vis === 'visible') break;
  await sleep(40);
}
await page.screenshot({ path: join(OUT, 'v191-closing.png'), clip: { x: 0, y: 0, width: 1280, height: 400 } });
await sleep(900);
const closed = await layerInfo();

console.log('C. 提交收场（层可见 → 关窗终点拆除）:');
A('C1 提交后应用关闭', closed.isOpen === false, `isOpen=${closed.isOpen}`);
A('C2 收场期层可见（showLayer 于 commit）', closing.exists === true && closing.vis === 'visible', `vis=${closing.vis}`);
A('C3 关窗终点层拆除（app-window-closed → removeBackground）', closed.exists === false, `exists=${closed.exists}`);
A('C4 收场终点外观类复位', closed.lightIcons === false, `lightIcons=${closed.lightIcons}`);

// ---------- A/B. 取消流：重开应用 → 慢速拖到进度 ~0.5 ----------
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]')?.click());
await sleep(1000);
await page.mouse.move(4, 400);
await page.mouse.down();
for (let x = 14; x <= 216; x += 20) { await page.mouse.move(x, 400); await sleep(70); } // ~285px/s
await sleep(220);
const mid = await layerInfo();
await page.screenshot({ path: join(OUT, 'v191-gesture-mid.png'), clip: { x: 0, y: 0, width: 1280, height: 400 } });

console.log('A/B. 拖拽中段（机制武装 + 状态栏外观联动）:');
A('B1 浅色主色 + 双门齐 → back-sysui-light-icons 出现（APPEARANCE_LIGHT_STATUS_BARS）', mid.lightIcons === true, `lightIcons=${mid.lightIcons}`);
A('B2 层已武装但不可见（showLayer:false，#191 议题口径：可见性延迟到 commit）', mid.exists === true && mid.vis === 'hidden', `vis=${mid.vis}`);
A('B3 层色为浅色（取色管线产物，亮度 > 0.5）', luminanceOf(mid.bg) > 0.5, `bg=${mid.bg}`);

// ---------- A. 取消：原地松手（慢速短滑未过 25%） ----------
await page.mouse.up();
await sleep(400);
const cancelled = await layerInfo();
A('A1 取消后外观类复位（removeBackground → reset null）', cancelled.lightIcons === false, `lightIcons=${cancelled.lightIcons}`);
A('A2 取消后层拆除（未展示过即移除）', cancelled.exists === false, `exists=${cancelled.exists}`);
A('A3 取消后应用保持打开', cancelled.isOpen === true, `isOpen=${cancelled.isOpen}`);

A('D1 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));

await browser.close();
console.log(`\n[e2e-v191] 结果：PASS ${pass} / FAIL ${fail}${errors.length ? `（pageerror ${errors.length}）` : '（零 pageerror）'}`);
process.exit(fail === 0 && errors.length === 0 ? 0 : 1);
