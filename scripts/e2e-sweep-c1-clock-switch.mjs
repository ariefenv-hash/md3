// ==================== e2e-sweep-c1-clock-switch.mjs — #77 Standing Sweep 第一轮 C 类（UI 细节）检查项③ ====================
// 对象：clock-app 自绘 .m3-switch 开关（v7.39 规格：未拖 16px / 选中 24px / 拖拽 28px，行程 16px）
// 假说验证（#79 同类延伸到 iframe 自绘开关）：
//   P1 关/开端态球不出轨（右缘 ≤ 轨道内容右缘 50px，左缘 ≥ 2px）
//   P2 点击切换的 CSS transition 中间帧（含 spring 前冲超调）球恒不出轨
//   P3 拖拽态 28px 球（margin-left -2 补偿）全程 pos∈[0,16] 不出轨
//   P4 拖拽中途松手的回弹过渡（width 28→24 或 28→16 + transform 回落）中间帧不出轨
//   P5 垂直居中恒成立（translateY(-50%) 百分比 × 动态 height：CSS transition 无 JS 写序窗口）
//   P6 零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const ROOT = '/home/z/my-project/md3-repo';
const PORT = 8085;
const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const SHOT = `${ROOT}/docs/sweep`;
import { mkdirSync } from 'node:fs';
mkdirSync(SHOT, { recursive: true });

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', ROOT, '--bind', '127.0.0.1'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));

let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra}`); }
  else { fail++; console.log(`  FAIL ${name}${extra}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

await page.goto(`http://127.0.0.1:${PORT}/ios-desktop/apps/clock-app/index.html`, { waitUntil: 'load', timeout: 20000 });
await page.waitForTimeout(500);

// 注入一个复刻模板结构的开关（fixed 定位便于坐标计算；document 级 pointerdown 委托自动接管）
await page.evaluate(() => {
  const l = document.createElement('label');
  l.className = 'm3-switch';
  l.id = 'sweepSw';
  l.style.cssText = 'position:fixed;left:40px;top:120px;z-index:9999';
  l.innerHTML = '<input type="checkbox"><span class="slider"><span class="thumb"></span></span>';
  document.body.appendChild(l);
});
const geo = await page.evaluate(() => {
  const sw = document.getElementById('sweepSw');
  const s = sw.querySelector('.slider').getBoundingClientRect();
  return { x: s.left, y: s.top, w: s.width, h: s.height };
});
console.log('slider rect:', JSON.stringify(geo));
ok(Math.abs(geo.w - 52) < 0.8 && Math.abs(geo.h - 32) < 0.8, 'A0 轨道 52×32', ` w=${geo.w.toFixed(1)} h=${geo.h.toFixed(1)}`);

const CX = geo.x + geo.w / 2, CY = geo.y + geo.h / 2;

// 采样器：rAF 连续采 N 帧读 thumb 几何（相对 slider 内容坐标系：border 2 内缘 → [2,50]）
const SAMPLE = `(sel, n) => new Promise(res => {
  const sw = document.querySelector(sel);
  const t = sw.querySelector('.thumb'), s = sw.querySelector('.slider');
  const out = [];
  const tick = () => {
    const tr = t.getBoundingClientRect(), sr = s.getBoundingClientRect();
    const m = new DOMMatrixReadOnly(getComputedStyle(t).transform === 'none' ? '' : getComputedStyle(t).transform);
    out.push({ tx: m.m41, w: tr.width, l: tr.left - sr.left, r: tr.right - sr.left,
               cyOff: (tr.top + tr.height / 2) - (sr.top + sr.height / 2) });
    if (out.length >= n) res(out); else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})`;

// B. 关态端态
let st = await page.evaluate(`(${SAMPLE})('#sweepSw', 3)`);
let f = st[st.length - 1];
ok(Math.abs(f.w - 16) < 0.6 && Math.abs(f.tx) < 0.6, 'B1 关态 16 球 tx=0', ` w=${f.w.toFixed(1)} tx=${f.tx.toFixed(2)}`);
ok(f.r <= 50.6 && f.l >= 1.4, 'B2 关态球在轨内', ` l=${f.l.toFixed(2)} r=${f.r.toFixed(2)}`);
ok(Math.abs(f.cyOff) < 0.6, 'B3 关态垂直居中', ` off=${f.cyOff.toFixed(2)}`);

// C. 点击开 → transition 中间帧 12 帧 + 端态（spring 前冲超调全程在轨）
await page.mouse.click(CX, CY);
const mid = await page.evaluate(`(${SAMPLE})('#sweepSw', 30)`); // 500ms > spring 220ms 收敛期
let maxR = -1e9, minL = 1e9, maxCy = 0;
for (const s of mid) { maxR = Math.max(maxR, s.r); minL = Math.min(minL, s.l); maxCy = Math.max(maxCy, Math.abs(s.cyOff)); }
ok(maxR <= 50.6, 'C1 开启全程右缘不出轨', ` maxR=${maxR.toFixed(2)}`);
ok(minL >= 1.4, 'C2 开启全程左缘不出轨', ` minL=${minL.toFixed(2)}`);
ok(maxCy < 1.2, 'C3 全程垂直居中（-50%×动态height）', ` maxCyOff=${maxCy.toFixed(2)}`);
const end = mid[mid.length - 1];
ok(Math.abs(end.w - 24) < 0.8 && Math.abs(end.tx - 16) < 0.8, 'C4 端态 24 球 tx=16', ` w=${end.w.toFixed(1)} tx=${end.tx.toFixed(2)}`);
ok(Math.abs(end.r - 48) < 1.2, 'C5 端态右缘 48（border-box 系：slider 2px border，D1 l=22/r=50 同系印证）', ` r=${end.r.toFixed(2)}`);
await page.screenshot({ path: `${SHOT}/c1-switch-on.png`, clip: { x: geo.x - 30, y: geo.y - 30, width: 120, height: 90 } });

// D. 拖拽 28 球全程（0→16 分 8 步）→ 最右释放
await page.mouse.move(CX, CY);
await page.mouse.down();
for (let i = 1; i <= 8; i++) { await page.mouse.move(CX + i * 2, CY); const g = await page.evaluate(`(${SAMPLE})('#sweepSw', 1)`); const s = g[0]; if (!(s.r <= 50.6 && s.l >= 1.4 && Math.abs(s.cyOff) < 1.2)) { ok(false, `D 拖拽 step${i} 出轨`, JSON.stringify(s)); break; } if (i === 8) ok(true, 'D1 拖拽 8 步全程在轨+垂直居中', ` final l=${s.l.toFixed(2)} r=${s.r.toFixed(2)} w=${s.w.toFixed(1)}`); }
await page.mouse.up();
await page.waitForTimeout(400);
const dEnd = (await page.evaluate(`(${SAMPLE})('#sweepSw', 3)`))[2];
ok(Math.abs(dEnd.tx - 16) < 0.8 && Math.abs(dEnd.w - 24) < 0.8, 'D2 拖到底释放=开态', ` tx=${dEnd.tx.toFixed(2)} w=${dEnd.w.toFixed(1)}`);

// E. 拖过半再拖回中线以下释放 → 关态回弹过渡 16 帧（width 28→16 回落窗口）
// 前置：D2 后开关为开态，先单击翻回关态（修后 click=净翻转一次）保证 startPos=0 语义
await page.waitForTimeout(200);
await page.mouse.click(CX, CY);
await page.waitForTimeout(320);
await page.mouse.move(CX, CY);
await page.mouse.down();
await page.mouse.move(CX + 14, CY, { steps: 4 });
await page.mouse.move(CX + 5, CY, { steps: 4 }); // pos=5 < 8 → 松手应回「关」
const eMid = [];
for (let i = 0; i < 3; i++) eMid.push(...await page.evaluate(`(${SAMPLE})('#sweepSw', 1)`));
await page.mouse.up();
const eTail = await page.evaluate(`(${SAMPLE})('#sweepSw', 16)`);
const eAll = [...eMid, ...eTail];
let eMaxR = -1e9, eMinL = 1e9, eMaxCy = 0;
for (const s of eAll) { eMaxR = Math.max(eMaxR, s.r); eMinL = Math.min(eMinL, s.l); eMaxCy = Math.max(eMaxCy, Math.abs(s.cyOff)); }
ok(eMaxR <= 50.6, 'E1 回弹过渡右缘不出轨', ` maxR=${eMaxR.toFixed(2)}`);
ok(eMinL >= 1.4, 'E2 回弹过渡左缘不出轨', ` minL=${eMinL.toFixed(2)}`);
ok(eMaxCy < 1.2, 'E3 回弹全程垂直居中', ` maxCyOff=${eMaxCy.toFixed(2)}`);
const eEnd = eTail[eTail.length - 1];
ok(eEnd.tx < 1 && Math.abs(eEnd.w - 16) < 0.8, 'E4 终态=关 16 球', ` tx=${eEnd.tx.toFixed(2)} w=${eEnd.w.toFixed(1)}`);

// F. 快速连点 6 次（交替开关，弹簧相位打散）中间帧全程在轨
await page.waitForTimeout(250);
for (let i = 0; i < 6; i++) { await page.mouse.click(CX, CY); await page.waitForTimeout(60); }
const fMid = await page.evaluate(`(${SAMPLE})('#sweepSw', 14)`);
let fMaxR = -1e9, fMinL = 1e9, fMaxCy = 0;
for (const s of fMid) { fMaxR = Math.max(fMaxR, s.r); fMinL = Math.min(fMinL, s.l); fMaxCy = Math.max(fMaxCy, Math.abs(s.cyOff)); }
ok(fMaxR <= 50.6 && fMinL >= 1.4 && fMaxCy < 1.2, 'F1 连点 6 次全程在轨+居中', ` maxR=${fMaxR.toFixed(2)} minL=${fMinL.toFixed(2)} cy=${fMaxCy.toFixed(2)}`);
const fEnd = fMid[fMid.length - 1];
ok(fEnd.tx > 15 || fEnd.tx < 1, 'F2 终态收敛到端位', ` tx=${fEnd.tx.toFixed(2)}`);
await page.screenshot({ path: `${SHOT}/c1-switch-final.png`, clip: { x: geo.x - 30, y: geo.y - 30, width: 120, height: 90 } });

// G. 真实场景（#81 核心断言）：seed 闹钟 2（vibrate=false）→ 展开 → 点 toggle-vib → UI 与存储双向一致
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(500);
await page.click('.alarm-card-wrapper[data-alarm-id="2"] .alarm-card-header');
await page.waitForTimeout(600); // 展开动画 .38s
const vib = page.locator('.alarm-card-wrapper[data-alarm-id="2"] .m3-switch:has(input[data-act="toggle-vib"])');
await vib.click(); // 点 label 容器（input 0 尺寸不可见，Playwright 可见性判定不过）
await page.waitForTimeout(150);
const g1 = await page.evaluate(() => {
  const i = document.querySelector('.alarm-card-wrapper[data-alarm-id="2"] input[data-act="toggle-vib"]');
  const st = JSON.parse(localStorage.getItem('android_clock_state') || 'null');
  const a = st && st.alarms.find(x => x.id == 2);
  return { ui: i.checked, store: a ? a.vibrate : null };
});
ok(g1.ui === true && g1.store === true, 'G1 点击后 UI===存储===true（修前：UI 翻回 false 而存储 true 打架）', JSON.stringify(g1));
await vib.click();
await page.waitForTimeout(150);
const g2 = await page.evaluate(() => {
  const i = document.querySelector('.alarm-card-wrapper[data-alarm-id="2"] input[data-act="toggle-vib"]');
  const st = JSON.parse(localStorage.getItem('android_clock_state') || 'null');
  const a = st && st.alarms.find(x => x.id == 2);
  return { ui: i.checked, store: a ? a.vibrate : null };
});
ok(g2.ui === false && g2.store === false, 'G2 二次点击 UI===存储===false', JSON.stringify(g2));
await page.screenshot({ path: `${SHOT}/c1-real-vib-toggle.png`, fullPage: false });

ok(errors.length === 0, 'P6 零 pageerror', errors.length ? ` ${errors[0]}` : '');

console.log(`\n=== sweep-C1 clock-switch: ${pass} pass / ${fail} fail ===`);
await browser.close();
srv.kill();
process.exit(fail ? 1 : 0);
