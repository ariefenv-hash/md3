// ==================== e2e-v146-fling-back-r53.mjs — #146 四期 fling 滑行无头回归（R53 窗） ====================
//
// DoD（FlingOnBackAnimationCallback.kt 168 行语义，真实鼠标手势流）：
//   G0  应用打开（根页）
//   G1  拖拽中段跟手（四期接线不破坏 v9.21 二期拖拽渲染：sx ≈ 0.8215 @ rawDx=212）
//   G2  高速松手 commit → fling 滑行期：松手后 ~50ms 内 isOpen 仍 true（closeApp 未立即兑现
//       —— 原实现 commit 即 closeApp；四期 fling 滑行数帧后才 invoke）+ 容器变换继续推进
//       （sx 比松手瞬间更小或同帧采样序列单调缩小——摩擦滑行证据）
//   G3  fling 结束 → closeApp 兑现（isOpen=false + 窗口隐藏）
//   G4  取消路径回归：慢速短滑 cancel → flingBack.onBackCancelled 清态 → 应用保持打开
//   G5  全程零 pageerror
// 场景：1280×800，?nolock=1 → 设置 app → 左缘右滑。
// fling 数值预演（python 闭式解，friction m=-25.2，×100 域）：
//   松手 ~2500px/s → progress 速度 ≈ 6.3/s → tracker 域 ≈ 630；startValue ≈ (200-16)/396×100 ≈ 46
//   → 滑行到速度阈值 62.5 需 t = ln(62.5/630)/-25.2 ≈ 91ms（e2e 采样窗口可抓 2-4 帧）
//   → 值域爬升 46 → 46+630/25.2×(1-e^(-25.2t)) 上限 71（速度耗尽，max=100 不触）
//   → isAtEquilibrium 结束 → onBackInvokedCompat → closeApp
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v146');
mkdirSync(OUT, { recursive: true });
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await sleep(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(500);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]')?.click());
await sleep(1000);

const winInfo = () => page.evaluate(() => {
  const el = document.getElementById('appWindow');
  const b = el.getBoundingClientRect();
  const dbg = window.__qsDebug ? window.__qsDebug() : null;
  return {
    sx: b.width / window.innerWidth,
    cx: b.left + b.width / 2,
    hidden: getComputedStyle(el).visibility === 'hidden' || getComputedStyle(el).display === 'none',
    isOpen: dbg ? dbg.isOpen : null,
    gestureType: dbg ? dbg.gestureType : null,
  };
});

const base = await winInfo();
A('G0 应用打开（根页）', base.isOpen === true && !base.hidden, `isOpen=${base.isOpen}`);

// ---------- G1：拖拽中段跟手（慢速，rawDx=212 同 v146 二期锚） ----------
await page.mouse.move(4, 400);
await page.mouse.down();
for (let x = 14; x <= 216; x += 20) { await page.mouse.move(x, 400); await sleep(70); }
await sleep(220);
const mid = await winInfo();
A('G1 拖拽中段 spec 跟手（sx ≈ 0.8215，四期接线零扰动）', near(mid.sx, 0.8215, 0.02), `sx=${mid.sx.toFixed(4)}`);

// ---------- G2：取消（本段慢速短滑，回归 v146 二期 C 场景） ----------
await page.mouse.up();
await sleep(900);
const canceled = await winInfo();
A('G2 取消回弹（flingBack.onBackCancelled 清态，应用保持打开）',
  canceled.isOpen === true && !canceled.hidden && near(canceled.sx, 1, 0.02),
  `sx=${canceled.sx.toFixed(4)} isOpen=${canceled.isOpen}`);

// ---------- G3+G4：高速松手 commit → fling 滑行 → closeApp 兑现 ----------
await page.mouse.move(4, 400);
await page.mouse.down();
// 快拖 rawDx≈210（< 320 距离阈 → 速度通道 commit）：5 步大步幅 + 短 sleep，
// tracker 最后 100ms 窗口 Δp 足够（playwright move 实际间隔 ~25ms，诊断脚本实测 vel 序列）
for (const x of [54, 94, 134, 174, 214]) { await page.mouse.move(x, 400); await sleep(6); }
await page.mouse.up(); // 真实事件链松手 → 速度通道 commit → fling 接管
// up 后立即轮询 fling 观测钩子（200ms × 16ms）—— 决定性证据：
// fling=true + flingAnim 非空且 value 递增（×100 域摩擦滑行）+ isOpen 恒 true
const poll = [];
for (let i = 0; i < 14; i++) {
  poll.push(await page.evaluate(() => {
    const d = window.__qsDebug ? window.__qsDebug() : null;
    return d ? { t: Date.now(), fling: d.fling, anim: d.flingAnim, isOpen: d.isOpen } : null;
  }));
  await sleep(16);
}
const flingFrames = poll.filter((s) => s && s.fling === true && s.anim);
const values = flingFrames.map((s) => s.anim.value);
const vel0 = flingFrames.length ? flingFrames[0].anim.vel : null;
console.log(`G3. fling 滑行观测（轮询 ${poll.length} 帧，滑行帧 ${flingFrames.length}）:`);
A('G3a fling 滑行期出现（fling=true + flingAnim 非空）', flingFrames.length >= 2,
  `帧数=${flingFrames.length} vel0=${vel0}`);
A('G3b 滑行推进：flingAnim.value 递增（摩擦滑行 ×100 域）', values.length >= 2 && values[values.length - 1] > values[0],
  `value ${values[0]} → ${values[values.length - 1]}`);
A('G3c 滑行期 closeApp 未兑现（isOpen 恒 true——原实现 commit 即 closeApp）',
  poll.every((s) => s && s.isOpen === true), `轮询期内isOpen全true=${poll.every((s) => s && s.isOpen === true)}`);
await sleep(900);
const closed = await winInfo();
A('G4 fling 结束 → closeApp 兑现（isOpen=false）', closed.isOpen === false && closed.hidden,
  `isOpen=${closed.isOpen} hidden=${closed.hidden}`);

A('G5 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));

console.log(`\n[e2e-v146-fling-back-r53] PASS ${pass} / FAIL ${fail}`);
await browser.close();
process.exit(fail ? 1 : 0);
