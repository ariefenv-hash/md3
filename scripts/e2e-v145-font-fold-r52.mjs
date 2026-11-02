// v9.32 = #145 FontInterpolator fold 字重插值 无头回归（R52 窗）：
// F1  初始锁屏：fold 观测 applied=false + 两钟内联 fvs = 注入基线（'wght' 300, 'wdth' 100, 'opsz' 96）
// F2  foldApply(0.5) → 'wght' 200（lerp(300,100,0.5)）+ applied=true
// F3  foldApply(0.9) → 'wght' 120
// F4  foldApply(1) → 端点语义：'wght' 100（kt L95-96 返回 end）
// F5  foldApply(0) 恢复 → applied=false + fvs 显式写回基线 300（非清空语义）
// F6  clamp：foldApply(-0.5) 短路、foldApply(2) 端点
// F7  帧量化缓存：同帧区间（0.50/0.52）missCount 只 +1，跨帧（0.70）再 +1
// F8  真拖拽跟手：pointer 上滑中 fold applied=true + wght < 300（drag 路径接线真跑）
// F9  小位移慢速拖拽释放回弹 → 等弹簧归位 → fvs 回基线（回弹路径 fold 回落）
// F10 零 pageerror
// 范式同 e2e-v186b-clock-size-r50：dev 服务器（E2E_BASE 可覆写，默认 8080）。
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 400, height: 820 } });
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

await page.addInitScript(() => {
  try { localStorage.clear(); } catch (e) {}
});
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(1200);

// 进锁屏（__lockTest.lock → lockNow）
await page.evaluate(() => window.__lockTest && window.__lockTest.lock());
await sleep(600);

const fold = () => page.evaluate(() => window.__lockTest.fold());
// CSSOM 序列化形态无关断言：style.fontVariationSettings 读回是规范化形态（双引号 +
// 轴字典序重排——R52 e2e 实测在录），断言只提 wght 数值，引号/轴序无关
const wghtOf = (s) => { const m = /["']wght["']\s+([\d.]+)/.exec(s || ''); return m ? parseFloat(m[1]) : NaN; };
const BASE_W = 300;

// F1 初始态
const f1 = await fold();
t('F1 初始 applied=false + 两钟注入基线 wght 300', f1 && f1.applied === false &&
  wghtOf(f1.smallFvs) === BASE_W && wghtOf(f1.largeFvs) === BASE_W,
  `small=${f1.smallFvs} large=${f1.largeFvs}`);

// F2 p=0.5 → wght 200
await page.evaluate(() => window.__lockTest.foldApply(0.5));
let f = await fold();
t('F2 foldApply(0.5) → wght 200', f.applied === true &&
  wghtOf(f.smallFvs) === 200 && wghtOf(f.largeFvs) === 200, `small=${f.smallFvs}`);

// F3 p=0.9 → wght 120
await page.evaluate(() => window.__lockTest.foldApply(0.9));
f = await fold();
t('F3 foldApply(0.9) → wght 120', wghtOf(f.smallFvs) === 120, f.smallFvs);

// F4 p=1 → 端点 end 引用
await page.evaluate(() => window.__lockTest.foldApply(1));
f = await fold();
t('F4 foldApply(1) → wght 100（端点）', wghtOf(f.smallFvs) === 100, f.smallFvs);

// F7 帧量化缓存（F2 已热 frame2 / F3 已热 frame4 → 基线 m0；同帧命中不增 / 跨帧 +1）
const m0 = f.missCount;
await page.evaluate(() => window.__lockTest.foldApply(0.5));  // frame 2 已热命中
const m1 = (await fold()).missCount;
await page.evaluate(() => window.__lockTest.foldApply(0.52)); // frame 2 同帧命中
const m2 = (await fold()).missCount;
await page.evaluate(() => window.__lockTest.foldApply(0.70)); // frame 3 跨帧 MISS
const m3 = (await fold()).missCount;
t('F7 帧量化缓存命中', m1 === m0 && m2 === m1 && m3 - m2 === 1,
  `m0=${m0} 同帧→${m1} 同帧→${m2} 跨帧+1→${m3}`);

// F5 恢复（显式写回非清空）
await page.evaluate(() => window.__lockTest.foldApply(0));
f = await fold();
t('F5 foldApply(0) 恢复基线（显式写回）', f.applied === false && wghtOf(f.smallFvs) === BASE_W, f.smallFvs);

// F6 clamp 边界
await page.evaluate(() => window.__lockTest.foldApply(-0.5)); // clamp→0 短路
f = await fold();
const f6a = f.applied === false;
await page.evaluate(() => window.__lockTest.foldApply(2)); // clamp→1 端点
f = await fold();
t('F6 clamp：负值短路 / 超界端点', f6a && f.applied === true && wghtOf(f.smallFvs) === 100, f.smallFvs);
await page.evaluate(() => window.__lockTest.foldApply(0));

// F8 真拖拽跟手（drag 路径接线）：上滑中 fold applied + wght 下降（300 → <300）
const vp = page.viewportSize();
const startX = vp.width / 2, startY = Math.round(vp.height * 0.28);
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.mouse.move(startX, startY - 120, { steps: 8 });
await sleep(80);
f = await fold();
t('F8 拖拽跟手 fold applied + wght < 300', f.applied === true &&
  wghtOf(f.smallFvs) < 300 && wghtOf(f.smallFvs) > 200, f.smallFvs);

// F9 释放（位移 120px ≈14.6% < 25% commit 阈值，慢速 → 回弹）→ 等弹簧归位 → fold 复位基线
await page.mouse.move(startX, startY - 30, { steps: 6 }); // 回拖一点降速度
await page.mouse.up();
await sleep(2200); // 弹簧回弹完成
f = await fold();
t('F9 回弹归位 fold 复位基线（isSettled 显式复位）', f.applied === false && wghtOf(f.smallFvs) === BASE_W,
  `applied=${f.applied} wght=${wghtOf(f.smallFvs)}`);

// F10 零 pageerror
t('F10 零 pageerror', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 200));

await browser.close();
console.log(`\n=== e2e-v145-font-fold: ${pass} pass / ${fail} fail ===`);
process.exit(fail === 0 ? 0 : 1);
