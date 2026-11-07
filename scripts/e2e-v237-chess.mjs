// ==================== e2e-v237-chess.mjs — #237 竞态三连 / 升变四选择 / 判和（v10.43） ====================
// 议题 #237 的缺陷全部是**运行时竞态**，静态锚无法证伪，故本脚本用真 Chromium 复现同一时序：
//   Q1 开屏：64 格 + 白方先行
//   Q2 竞态·新局劫持：AI 思考窗（320ms）内点「新局」→ 新局不得多出幽灵走子（旧版会 Nc3）
//   Q3 竞态·人机死局：新局后玩家走白 → AI 必须回应（旧版输入全吞、永久冻结）
//   Q4 竞态·pvp 幽灵替走：思考窗内切「双人」→ 黑方不得被替走（旧版 SAN 1→2）
//   Q5 升变四选择：b7→b8 弹层四选，选「马」→ SAN b8=N（旧版恒升后）
//   Q6 KBvKB 异色格象：不再误判「子力不足」
//   Q7 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8993;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const exe = process.env.CHROME_EXE || '/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const browser = await chromium.launch({ headless: true, executablePath: exe });
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^(?!http:\/\/127\.0\.0\.1)/, (r) => r.abort());

const openById = (id) => page.evaluate(async (appId) => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  openApp(initialApps.findIndex((a) => a.id === appId));
}, id);
const frameOf = (frag) => page.frames().find((f) => f.url().includes(frag));
const waitFrame = async (frag) => {
  for (let i = 0; i < 15 && !frameOf(frag); i++) await sleep(300);
  return frameOf(frag);
};

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  await page.evaluate(() => {
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await sleep(400);

  await openById('chess');
  const frame = await waitFrame('apps/chess/index.html');
  await sleep(800);

  const clickCell = async (name) => frame.evaluate((s) => {
    const f = 'abcdefgh'.indexOf(s[0]);
    const r = 8 - parseInt(s[1], 10);
    document.querySelectorAll('.ch-cell')[r * 8 + f].click();
  }, name);
  const state = () => frame.evaluate(() => window.__chessTest.state());

  // ---------- Q1 开屏 ----------
  const q1 = frame ? await frame.evaluate(() => ({
    cells: document.querySelectorAll('.ch-cell').length,
    state: window.__chessTest.state(),
  })) : null;
  A('Q1 棋盘 64 格 + 白方先行', q1 && q1.cells === 64 && q1.state.turn === 'w' && q1.state.status === 'playing',
    `cells=${q1 && q1.cells} turn=${q1 && q1.state.turn}`);

  // ---------- Q2 竞态·新局劫持（思考窗内点新局） ----------
  await frame.evaluate(() => window.__chessTest.setMode('ai', 2));
  await sleep(120);
  await clickCell('e2');
  await sleep(80);
  await clickCell('e4');            // 触发 AI 320ms 思考窗
  const q2mid = await state();
  await frame.evaluate(() => document.getElementById('chNew').click()); // 思考窗内立即新局
  await sleep(1300);                // 越过旧回调触发点
  const q2 = await state();
  A('Q2 竞态：思考窗内「新局」→ 零幽灵走子（旧版多出 Nc3）',
    q2 && q2.san.length === 0 && q2.turn === 'w' && q2.busy === false && q2.aiPending === false,
    `midBusy=${q2mid.busy} san=[${q2 && q2.san.join(',')}] turn=${q2 && q2.turn} busy=${q2 && q2.busy}`);

  // ---------- Q3 竞态·人机死局（新局后 AI 必须能接续） ----------
  await clickCell('d2');
  await sleep(80);
  await clickCell('d4');
  await sleep(1500);
  const q3 = await state();
  A('Q3 竞态：新局后人机不死局（玩家 d4 → AI 已回应）',
    q3 && q3.san.length === 2 && q3.turn === 'w' && q3.status !== 'checkmate',
    `san=[${q3 && q3.san.join(',')}] turn=${q3 && q3.turn}`);

  // ---------- Q4 竞态·pvp 幽灵替走（思考窗内切双人） ----------
  await frame.evaluate(() => document.getElementById('chNew').click());
  await sleep(120);
  await frame.evaluate(() => window.__chessTest.setMode('ai', 2));
  await sleep(120);
  await clickCell('e2');
  await sleep(80);
  await clickCell('e4');
  await sleep(120);
  await frame.evaluate(() => window.__chessTest.setMode('pvp')); // 思考窗内切回双人
  await sleep(1300);
  const q4 = await state();
  A('Q4 竞态：思考窗内切「双人」→ 黑方不被替走（旧版 SAN 1→2）',
    q4 && q4.san.length === 1 && q4.turn === 'b' && q4.mode === 'pvp' && q4.busy === false,
    `san=[${q4 && q4.san.join(',')}] turn=${q4 && q4.turn} mode=${q4 && q4.mode}`);

  // ---------- Q5 升变四选择 ----------
  const q5before = await frame.evaluate(() => window.__chessTest.loadFen('4k3/1P6/8/8/8/8/8/4K3 w - -'));
  await clickCell('b7');
  await sleep(100);
  await clickCell('b8');
  await sleep(200);
  const sheet = await frame.evaluate(() => ({
    open: !document.getElementById('chPromo').hidden,
    opts: [...document.querySelectorAll('.ch-promo-btn')].map((b) => b.dataset.piece),
    state: window.__chessTest.state(),
  }));
  await frame.evaluate(() => document.querySelector('.ch-promo-btn[data-piece="n"]').click());
  await sleep(250);
  const q5 = await frame.evaluate(() => ({
    state: window.__chessTest.state(),
    hidden: document.getElementById('chPromo').hidden,
    queen: [...document.querySelectorAll('.ch-cell')].some((c) => c.textContent === '♛'),
  }));
  A('Q5 升变弹层：四选齐全 + 选马得到 b8=N（旧版恒升后）',
    q5before === 'playing' && sheet.open && sheet.opts.join('') === 'qrbn'
      && q5.state.san[0] === 'b8=N' && q5.hidden === true && q5.queen === false,
    `opts=${sheet.opts.join('')} san=${q5.state.san.join(',')} sheetHidden=${q5.hidden}`);

  // ---------- Q6 KBvKB 异色格象不判和 ----------
  const q6 = await frame.evaluate(() => window.__chessTest.loadFen('4k3/8/8/8/8/8/8/2B1K2b w - -'));
  await sleep(150);
  const q6t = await frame.evaluate(() => document.getElementById('chStatus').textContent);
  A('Q6 KBvKB 异色格象不再误判「子力不足」', q6 === 'playing' && !/子力不足/.test(q6t), `status=${q6} text=${q6t}`);

  // ---------- Q7 零 pageerror ----------
  A('Q7 全程零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));
} catch (e) {
  console.log('FATAL', String(e));
  results.push([false, 'e2e 未完成（FATAL）', String(e)]);
} finally {
  await browser.close().catch(() => {});
  server.kill();
}
const pass = results.filter((r) => r[0]).length;
console.log(`\n===== e2e-v237: ${pass}/${results.length} =====`);
process.exit(pass === results.length ? 0 : 1);
