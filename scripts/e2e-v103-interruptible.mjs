// ==================== e2e-v103-interruptible.mjs — #103 InterruptibleInOutAnimator 真跑（v9.93） ====================
// Q1 快速连开连关 5 次 → 终态正确（最后一次 show → opacity 收敛 1 + active 在 + 可交互）
// Q2 连开后立即连关 5 次 → 终态正确（opacity 0 + active 移除 + 指针事件复位）
// Q3 中途反向接管不归零（开到中段 out → opacity 从当前值继续下降，非跳 0 重播——#39 类根治）
// Q4 距离比例缩放生效：中段反向收敛帧数 < 满程收敛帧数（scaleDuration 真跑）
// Q5 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8997;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' : ''}${extra}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(300);

  const CM = '/ios-desktop/js/context-menu.js';
  const menuState = () => page.evaluate(() => {
    const el = document.getElementById('appContextMenu');
    return {
      active: el.classList.contains('active'),
      op: parseFloat(el.style.opacity || '0'),
      pe: el.style.pointerEvents,
    };
  });
  const show = () => page.evaluate((u) => import(u).then((m) => m.showContextMenu({ id: 'calculator', name: '计算器' }, document.createElement('div'), 195, 300)), CM);
  const close = () => page.evaluate((u) => import(u).then((m) => m.closeContextMenu()), CM);

  // ---------- Q1 快速连开连关 5 次（最后一次 show）→ 终态正确 ----------
  for (let i = 0; i < 5; i++) { await show(); await sleep(40); await close(); await sleep(40); }
  await show();
  await sleep(700); // open 满程 83ms fade + settle 200ms 级 + 余量
  const q1 = await menuState();
  A('Q1 连开连关 5 次 → 末次 show 终态（op=1 + active + 可交互）', q1.active && Math.abs(q1.op - 1) < 0.02 && q1.pe !== 'none', `op=${q1.op} pe=${q1.pe}`);

  // ---------- Q2 立即连关 5 次 → 终态正确 ----------
  for (let i = 0; i < 5; i++) { await close(); await sleep(30); await show(); await sleep(30); }
  for (let i = 0; i < 5; i++) { await close(); await sleep(30); }
  await sleep(700);
  const q2 = await menuState();
  A('Q2 连关 5 次 → 终态（op=0 + active 移除）', !q2.active && q2.op === 0, `op=${q2.op} active=${q2.active}`);

  // ---------- Q3 中途反向接管不归零 ----------
  await show();
  await sleep(45); // openFade 83ms 的中段
  const mid = (await menuState()).op;
  await close();
  await sleep(20);
  const after = (await menuState()).op;
  A('Q3 中途反向接管非重置（op 从中段继续下降，非跳 0）', mid > 0.05 && after > 0.02 && after < mid + 0.2, `mid=${mid.toFixed(3)} after=${after.toFixed(3)}`);
  await sleep(600);

  // ---------- Q4 距离比例缩放：中段反向收敛更快 ----------
  // 场景 A：满程 out（先 show 完整展开再 close）
  await show();
  await sleep(600); // 完全展开
  await close();
  const t0 = Date.now();
  await page.waitForFunction(() => {
    const el = document.getElementById('appContextMenu');
    return !el.classList.contains('active');
  }, { timeout: 2000 });
  const fullCloseMs = Date.now() - t0;
  // 场景 B：开到 ~1/3 处立即 close（剩余距离 ≈ 1/3 → scaled ≈ 233/3 ≈ 78ms）
  await show();
  await sleep(28);
  await close();
  const t1 = Date.now();
  await page.waitForFunction(() => {
    const el = document.getElementById('appContextMenu');
    return !el.classList.contains('active');
  }, { timeout: 2000 });
  const earlyCloseMs = Date.now() - t1;
  A('Q4 中段反向收敛快于满程（scaleDuration 真跑）', earlyCloseMs < fullCloseMs, `early=${earlyCloseMs}ms full=${fullCloseMs}ms`);

  // ---------- Q5 零 pageerror ----------
  A('Q5 全程零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const fails = results.filter((r) => !r[0]);
console.log(`\n===== e2e-v103: ${results.length - fails.length}/${results.length} =====`);
process.exit(fails.length ? 1 : 0);
