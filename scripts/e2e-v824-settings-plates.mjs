// ==================== e2e-v824-settings-plates.mjs — #47 无头回归 ====================
//
// DoD（议题 #47 验收标准）：
//   A. 一级菜单全部图标带彩色圆容器（40px + border-radius 50%）
//   B. 逐项配色与 A17 expressive 权威色板一致（spot check 三族：network=blueVariant
//      bg 80 档 / battery=green / storage=yellow + glyph 字色 30 档）
//   C. 深/浅色模式容器色正确切换（body.light-theme → bg 90 档；fg 恒定）
//   D. 形制：glyph 24px 居中于 40px 圆（inset 8dp 恰居中）
//   E. 圆底全 21 项在位（visible 行逐项 background 非 transparent）+ 零 pageerror
//
// 驱动：真实导航（解锁 → settings 图标）。420px 窄格局一级行同样渲染（renderSettingsListHTML）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v824');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);

// 外壳主题显式置暗（auto 依赖 prefers-color-scheme，headless 环境已由 colorScheme 锚定，
// 此处再显式一次保证确定性）
await page.evaluate(() => window.__themeModeTest.set('dark'));
await sleep(200);

await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1100);

// ---------- A/B. 圆容器形态 + 逐项色（暗色默认） ----------
console.log('A/B. 圆容器 + 逐项色（暗色默认 = 80 档 bg / 30 档 fg）');
const probe = (key) => page.evaluate((k) => {
  const row = document.querySelector(`.tp-row[data-tp-key="${k}"]`);
  if (!row) return null;
  const icon = row.querySelector('.tp-home-icon');
  if (!icon) return null;
  const cs = getComputedStyle(icon);
  const svg = icon.querySelector('svg');
  const b = icon.getBoundingClientRect();
  return {
    bg: cs.backgroundColor, color: cs.color, radius: cs.borderRadius,
    w: b.width, h: b.height,
    svgW: svg ? parseFloat(getComputedStyle(svg).width) : 0,
    svgH: svg ? parseFloat(getComputedStyle(svg).height) : 0,
    centered: svg ? Math.abs((b.width - parseFloat(getComputedStyle(svg).width)) / 2 - 8) < 1.5 : false,
  };
}, key);

const net = await probe('network');
A('A1 network 圆容器 40px + radius 50%', net && net.w === 40 && net.h === 40 && net.radius === '50%', JSON.stringify(net));
A('A2 network bg = blueVariant 80 档 #67D4FF', net && net.bg === rgb('#67D4FF'), net && net.bg);
A('A3 network glyph 字色 = 30 档 #004D68', net && net.color === rgb('#004D68'), net && net.color);
A('A4 glyph 24px 居中（inset 8px 恰居中）', net && net.svgW === 24 && net.svgH === 24 && net.centered, `svg=${net && net.svgW}x${net && net.svgH}`);

const bat = await probe('battery');
A('B1 battery bg = green 80 档 #80DA88', bat && bat.bg === rgb('#80DA88'), bat && bat.bg);
A('B2 battery fg = #00522C', bat && bat.color === rgb('#00522C'), bat && bat.color);
const sto = await probe('storage');
A('B3 storage bg = yellow 80 档 #FCBD00', sto && sto.bg === rgb('#FCBD00'), sto && sto.bg);
const acc = await probe('accessibility');
A('B4 accessibility bg = purple 80 档 #D9BAFD', acc && acc.bg === rgb('#D9BAFD'), acc && acc.bg);
await page.screenshot({ path: join(OUT, 'a-plates-dark.png') });

// ---------- E1. 全部可见行圆底在位（非透明背景） ----------
const allPlates = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.tp-row[data-tp-key]')];
  return rows.map((r) => {
    const icon = r.querySelector('.tp-home-icon');
    if (!icon) return { key: r.dataset.tpKey, missing: true };
    const bg = getComputedStyle(icon).backgroundColor;
    return { key: r.dataset.tpKey, transparent: bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' };
  });
});
const noMissing = allPlates.every((p) => !p.missing);
const noTransparent = allPlates.filter((p) => !p.missing).every((p) => !p.transparent);
A('E1 全部一级行圆底在位', noMissing, allPlates.filter(p => p.missing).map(p => p.key).join(','));
A('E2 全部圆底非透明（逐项彩色落地）', noTransparent, allPlates.filter(p => p.transparent).map(p => p.key).join(','));

// ---------- C. 明暗切换（light-theme → 90 档；fg 恒定） ----------
console.log('C. 明暗切换');
await page.evaluate(() => window.__themeModeTest.set('light'));
await sleep(300);
const netL = await probe('network');
A('C1 network bg 切 90 档 #BDE9FF', netL && netL.bg === rgb('#BDE9FF'), netL && netL.bg);
A('C2 fg 恒定 #004D68（values-night 同构）', netL && netL.color === rgb('#004D68'), netL && netL.color);
A('C3 圆容器形态不变（radius 50%）', netL && netL.radius === '50%');
await page.screenshot({ path: join(OUT, 'b-plates-light.png') });
await page.evaluate(() => window.__themeModeTest.set('dark'));
await sleep(300);
const netD = await probe('network');
A('C4 切回暗色 bg 复原 80 档', netD && netD.bg === rgb('#67D4FF'), netD && netD.bg);

// ---------- E3. 零 pageerror ----------
A('E3 零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));

console.log(`\n===== e2e-v824: ${pass} passed, ${fail} failed =====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
