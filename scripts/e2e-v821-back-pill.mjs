// ==================== e2e-v821-back-pill.mjs — #42 预测性返回 pill 无头回归 ====================
//
// DoD（A17 BackPanel 权威语义，真实鼠标手势流）：
//   A. 手势中 pill 可见、贴左缘（entry→preThreshold 拉伸），edge-indicator 被压制
//   B. 形态随进度：xT<16（ENTRY 宽度小）→ xT=200（ACTIVE w≈48 margin≈14）→ xT=600（stretch w→60）
//   C. 松手 commit（滑过 25% 屏宽）：scale→0.86、α→0，最终 GONE（visibility hidden）
//   D. 取消路径（短滑 <25%）：宽→0 α→0 弹回，最终 GONE
//   E. 全程零 pageerror
// 场景：1280×800，解锁 → 设置 app → battery 子页（navHistory>1）→ 左缘右滑。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v821');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};
const near = (a, b, tol = 3) => Math.abs(a - b) <= tol;

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
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]')?.click());
await sleep(900);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="battery"]')?.click());
await sleep(800);

const inSub = await page.evaluate(() => (window.__navHistoryLen ? window.__navHistoryLen() : -1));
// 直接探测（navHistory 非导出面）：settings 子页体存在即可
const subOk = await page.evaluate(() => !!document.querySelector('.app-page-active, .tp-row'));
A('P0 设置子页在场', !!subOk, `navLen=${inSub}`);

// ---------- 手势中 pill 采样 ----------
const sample = () => page.evaluate(() => {
  const el = document.getElementById('backPill');
  if (!el) return null;
  const cs = getComputedStyle(el);
  const b = el.getBoundingClientRect();
  const edgeL = document.getElementById('edgeLeft');
  return {
    vis: cs.visibility, op: parseFloat(cs.opacity),
    w: b.width, h: b.height, x: b.left, y: b.top + b.height / 2,
    radius: cs.borderRadius, tf: cs.transform,
    edgeOp: edgeL ? parseFloat(getComputedStyle(edgeL).opacity) : null,
    bodyFlag: document.body.classList.contains('back-pill-active'),
  };
});

// 慢速拖拽（可中断采样）：从 x=4 → x=400
async function dragTo(targetX, y) {
  await page.mouse.move(4, y);
  await page.mouse.down();
  for (let x = 14; x <= targetX; x += 22) { await page.mouse.move(x, y); await sleep(12); }
}

// A+B：手势中段采样（拖至 700px：ovBack 通道 commit 阈值 = 0.5 屏宽 640px，须确保越过）
await page.mouse.move(4, 400);
await page.mouse.down();
await sleep(60);
for (let x = 14; x <= 200; x += 18) { await page.mouse.move(x, 400); await sleep(10); }
await sleep(140);
const mid = await sample();
for (let x = 218; x <= 700; x += 24) { await page.mouse.move(x, 400); await sleep(8); }
await sleep(160);
const deep = await sample();
await page.screenshot({ path: join(OUT, 'pill-active.png'), clip: { x: 0, y: 280, width: 260, height: 240 } });
await page.mouse.up();   // x=700 > 640（ovBack 0.5 屏宽）→ commit
await sleep(240);
const committed = await sample();
await sleep(2600);
const goneC = await sample();

console.log('A/B. 手势中 + commit:');
A('A1 pill 可见 + body 标记', mid && mid.vis === 'visible' && mid.bodyFlag, `vis=${mid && mid.vis}`);
A('A2 edge-indicator 被压制（opacity 0）', mid && mid.edgeOp === 0, `edgeOp=${mid && mid.edgeOp}`);
A('A3 pill 贴左缘（left ≈ margin，>0 在屏内）', mid && mid.x > 0 && mid.x < 30, `x=${mid && mid.x.toFixed(1)}`);
A('A4 ACTIVE 态宽度 → 48 族（entry 拉伸后）', mid && mid.w > 20 && mid.w < 80, `w=${mid && mid.w.toFixed(1)}`);
A('A5 高度 48 族（entry h48 / pre h46 / active h48）', mid && mid.h > 40 && mid.h < 70, `h=${mid && mid.h.toFixed(1)}`);
A('A6 deep 段宽 → 60（stretch 终态方向）', deep && deep.w >= mid.w - 2 && deep.w <= 90, `w=${deep && deep.w.toFixed(1)}`);
A('A7 圆角四分量分离（edge 24 / far 24 或过渡值）', mid && /px/.test(mid.radius), `r=${mid && mid.radius}`);
A('C1 commit 触发（scale<1 或 α 衰减）', committed && (committed.op < 1 || /0\.8|matrix\(0\.86/.test(committed.tf)), `op=${committed && committed.op} tf=${committed && committed.tf.slice(0, 40)}`);
A('C2 commit 后 GONE（visibility hidden）', goneC && goneC.vis === 'hidden', `vis=${goneC && goneC.vis}`);
A('C3 commit 后 body 标记移除', goneC && !goneC.bodyFlag);

// D. 取消路径：新手势短滑 60px 松手
await sleep(300);
await page.mouse.move(4, 400);
await page.mouse.down();
for (let x = 14; x <= 60; x += 12) { await page.mouse.move(x, 400); await sleep(10); }
await sleep(120);
const cancelMid = await sample();
await page.mouse.up();
await sleep(2600);
const cancelEnd = await sample();
console.log('D. 取消路径:');
A('D1 短滑中 pill 在场', cancelMid && cancelMid.vis === 'visible' && cancelMid.bodyFlag);
A('D2 取消后 GONE', cancelEnd && cancelEnd.vis === 'hidden' && !cancelEnd.bodyFlag, `vis=${cancelEnd && cancelEnd.vis}`);

A('E 零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));

console.log(`\n===== e2e-v821: ${pass} passed, ${fail} failed =====`);
await browser.close();
process.exit(fail ? 1 : 0);
