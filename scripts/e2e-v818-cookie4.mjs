// ==================== e2e-v818-cookie4.mjs — #44 无头回归 ====================
//
// DoD（议题 #44）：
//   A. 四芒星尖角圆滑度对齐原版：Path2D 判别点双指标——
//      谷向半径 0.38 处（0.5, 0.88）：修复版（谷边界 0.440）= 内部；
//      镜像缺陷版（谷边界 0.332）= 外部
//      尖向半径 0.63 处（0.9455, 0.9455）：修复版（尖边界 0.600）= 外部（尖被削圆）；
//      镜像缺陷版（尖边界 0.665）= 内部（尖角过重）
//   B. 真 loader 挂载跑 800ms 形变循环零 pageerror（morph 链重建后运行时健康）
//   C. 静态大图渲染 docs/v818/×2（cookie4 填充对比图 + loader 运行态）

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v818');
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
const page = await browser.newPage({ viewport: { width: 720, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1200);

// ---------- A. Path2D 判别点（真引擎轮廓） ----------
const chk = await page.evaluate(async () => {
  const m = await import('/ios-desktop/js/m3e.js');
  const c = m.M3E_LOADER_SHAPES[5];
  const S = 480;
  const p = new Path2D();
  p.moveTo(c[0][0] * S, c[0][1] * S);
  for (let i = 1; i < c.length; i++) p.lineTo(c[i][0] * S, c[i][1] * S);
  p.closePath();
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d');
  const inPath = (x, y) => ctx.isPointInPath(p, x * S, y * S);
  return {
    valleyDiscriminator: inPath(0.5, 0.88),   // 期望 true（修复版谷边界 0.440 > 0.38）
    tipDiscriminator: inPath(0.9455, 0.9455), // 期望 false（修复版尖边界 0.600 < 0.63）
    center: inPath(0.5, 0.5),                 // 期望 true（形状内部基准）
    valleyDeep: inPath(0.5, 0.75),            // 期望 true（谷区深处基准，半径 0.25 < 0.332 也在内）
    outside: inPath(0.5, 0.02),               // 期望 false（形状外基准）
  };
});
A('A1 谷向判别点 (0.5,0.88) 在形状内（谷边界 0.440，镜像版 0.332 必挂）', chk.valleyDiscriminator === true);
A('A2 尖向判别点 (0.9455,0.9455) 在形状外（尖边界 0.600 削圆；镜像版 0.665 必挂）', chk.tipDiscriminator === false);
A('A3 基准：中心/谷深在内、形状外在外', chk.center === true && chk.valleyDeep === true && chk.outside === false);

// ---------- C1. 静态填充大图（修复版 cookie4 + 判别点标记） ----------
const shotStatic = await page.evaluate(async () => {
  const m = await import('/ios-desktop/js/m3e.js');
  const c = m.M3E_LOADER_SHAPES[5];
  const S = 480;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  cv.id = 'v818Cookie4';
  cv.style.cssText = 'position:fixed;left:120px;top:120px;background:#fff;';
  const ctx = cv.getContext('2d');
  const p = new Path2D();
  p.moveTo(c[0][0] * S, c[0][1] * S);
  for (let i = 1; i < c.length; i++) p.lineTo(c[i][0] * S, c[i][1] * S);
  p.closePath();
  ctx.fillStyle = '#6750A4';
  ctx.fill(p);
  // 判别点标记：谷向 0.38（绿=内部）/ 尖向 0.63（红=外部）
  ctx.fillStyle = '#00A86B';
  ctx.beginPath(); ctx.arc(0.5 * S, 0.88 * S, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#D13438';
  ctx.beginPath(); ctx.arc(0.9455 * S, 0.9455 * S, 5, 0, Math.PI * 2); ctx.fill();
  document.body.appendChild(cv);
  return true;
});
A('C1 静态大图渲染', shotStatic === true);

// ---------- B. 真 loader 运行 800ms ----------
const loaderOk = await page.evaluate(async () => {
  const m = await import('/ios-desktop/js/m3e.js');
  const box = document.createElement('div');
  box.id = 'v818Loader';
  box.style.cssText = 'position:fixed;right:24px;top:24px;';
  document.body.appendChild(box);
  const inst = m.createM3eLoadingIndicator({ size: 48, contained: true });
  box.appendChild(inst.el);
  await new Promise((r) => setTimeout(r, 800));
  return !!box.querySelector('canvas');
});
A('B 真 loader 挂载运行 800ms（morph 循环）', loaderOk === true);
await sleep(300);

const cdp = await page.context().newCDPSession(page);
const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
writeFileSync(join(OUT, 'v818-cookie4-static.png'), Buffer.from(data, 'base64'));

A('零 pageerror', errors.length === 0, errors.join(';').slice(0, 120));

await browser.close();
console.log(`\n==== v818 e2e 汇总：PASS ${pass} / FAIL ${fail} ====`);
process.exit(fail > 0 ? 1 : 0);
