// ==================== e2e-v181-batch7.mjs — #181 第七批 game2048 行为真跑（v9.55） ====================
// game2048 直开（无桌面注入 → __system 不可用 → SDK 降级路径不炸为验收点）+ 手机/平板双视口：
// Q1 手机 400px：紧凑断点（卡面 48px + icon-btn 30px）+ 布局保持 flex column（零变化锚）+ 5 列在册
// Q2 平板 800px：.game-wrapper grid 两列 1fr/300px + board 左列 + side-panel 右列跨全行可见 + 战绩渲染
// Q3 pressRipple 整排联动：pointerdown 于 icon-btn → 本体 scale(0.92) + 近邻让位 scale(<1) → 松手复位
// Q4 出牌得分链：点击列出牌 → 得分 > 0（合并或落牌）+ 工具徽章在册 + 重开归零（无 __system 全程静默）
// Q5 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8964;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/apps`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // 外域断网（e2e 惯例）

try {
  // Q1 手机 400px
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`${BASE}/game2048/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1500);
  const q1 = await page.evaluate(() => {
    const app = document.querySelector('.game-wrapper');
    const col = document.querySelector('.column');
    const btn = document.querySelector('.icon-btn');
    const side = document.getElementById('side-panel');
    return {
      appFlex: getComputedStyle(app).display === 'flex',
      cardW: parseFloat(col.style.getPropertyValue('--card-w')),   // renderAll JS 动态卡面（inline）
      btnH: btn.getBoundingClientRect().height,
      sideHidden: getComputedStyle(side).display === 'none',
      cols: document.querySelectorAll('.column').length,
    };
  });
  A('Q1 手机 400px：紧凑断点（icon-btn 30px）+ flex 零变化 + side-panel 隐藏 + 5 列 + JS 动态卡面在轨',
    q1.appFlex && q1.cardW >= 32 && q1.cardW <= 60 && Math.round(q1.btnH) === 30 && q1.sideHidden && q1.cols === 5,
    `flex=${q1.appFlex} cardW=${q1.cardW} btn=${q1.btnH} side=${q1.sideHidden} cols=${q1.cols}`);

  // Q2 平板 800px
  await page.setViewportSize({ width: 800, height: 900 });
  await sleep(500);
  const q2 = await page.evaluate(() => {
    const app = document.querySelector('.game-wrapper');
    const cs = getComputedStyle(app);
    const board = document.getElementById('board');
    const side = document.getElementById('side-panel');
    return {
      display: cs.display,
      cols: cs.gridTemplateColumns,
      boardCol: getComputedStyle(board).gridColumnStart,
      sideCol: getComputedStyle(side).gridColumnStart,
      sideRow: getComputedStyle(side).gridRowStart + '/' + getComputedStyle(side).gridRowEnd,
      sideVisible: getComputedStyle(side).display !== 'none',
      statsCells: side.querySelectorAll('.stats-box').length,
      badges: side.querySelectorAll('.badge-row').length,
      hint: side.querySelector('.side-hint').textContent,
    };
  });
  A('Q2 平板 800px：grid 两列 1fr/300px + 棋盘左列 + 面板右列跨全行可见 + 战绩 3 格 2 徽 + hint 在册',
    q2.display === 'grid' && q2.cols.split(' ').length === 2 && q2.cols.includes('300px')
      && q2.boardCol === '1' && q2.sideCol === '2' && q2.sideRow === '1/-1' && q2.sideVisible
      && q2.statsCells === 3 && q2.badges === 2 && q2.hint.includes('最高分纪录'),
    `cols=${q2.cols} board=${q2.boardCol} side=${q2.sideCol} row=${q2.sideRow} stats=${q2.statsCells} badges=${q2.badges}`);

  // Q3 pressRipple（controls-top 第 2 枚按下 → 本体 + 近邻 → 释放复位）
  // 派发目标 = 按钮本体；按压态在 dispatch 后同步读取（pointerup 后即清空）
  const q3 = await page.evaluate(() => new Promise((resolve) => {
    const row = document.querySelector('.controls-top');
    const btns = Array.from(row.querySelectorAll('button'));
    const r = btns[1].getBoundingClientRect();
    btns[1].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
    const pressedSelf = btns[1].style.transform;             // 同步：按压本体
    const neighbour = btns[0].style.transform;               // 同步：近邻让位
    requestAnimationFrame(() => {
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      requestAnimationFrame(() => {
        const after = btns[1].style.transform;               // 释放后复位
        resolve({ pressedSelf, neighbour, after });
      });
    });
  }));
  A('Q3 pressRipple：按压本体 scale(<1) + 近邻让位 scale(<1) 且近邻值更大 + 松手复位',
    q3.pressedSelf.includes('scale(') && parseFloat(q3.pressedSelf.replace('scale(', '')) < 1
      && q3.neighbour.includes('scale(') && parseFloat(q3.neighbour.replace('scale(', '')) < 1
      && parseFloat(q3.neighbour.replace('scale(', '')) >= parseFloat(q3.pressedSelf.replace('scale(', ''))
      && q3.after === '',
    `self=${q3.pressedSelf} neighbour=${q3.neighbour} after='${q3.after}'`);

  // Q4 出牌得分链（手机态）：列顶/手牌同值匹配出牌 → 合并得分 + 重开归零
  await page.setViewportSize({ width: 400, height: 800 });
  await sleep(400);
  const q4 = await page.evaluate(async () => {
    const out = { scored: false, err: '', resetOk: false };
    try {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const snap0 = window.__g2048.snapshot();
      out.snapKeysOk = ['score', 'highScore', 'gameMode', 'columnLens', 'handVals', 'tools', 'stats'].every(k => k in snap0);
      const cols = Array.from(document.querySelectorAll('.column'));
      const handWraps = () => Array.from(document.querySelectorAll('.hand-card-wrapper'));
      const topVal = (ci) => {
        const cards = cols[ci].querySelectorAll('.card');
        return cards.length ? String(cards[cards.length - 1].dataset.val) : null;
      };
      // 最多 12 轮：手牌/列顶同值即选中该手牌点击该列（合并得分）；无匹配则落牌制造新顶牌
      for (let round = 0; round < 12 && !out.scored; round++) {
        const hvals = handWraps().map(w => w.querySelector('.card')?.dataset.val);
        let played = false;
        for (let h = 0; h < hvals.length && !out.scored && !played; h++) {
          if (!hvals[h]) continue;
          const target = cols.findIndex((c, ci) => topVal(ci) === hvals[h]);
          if (target >= 0) {
            handWraps()[h].click(); await sleep(80);
            cols[target].click(); await sleep(400);
            out.scored = window.__g2048.snapshot().score > 0;
            played = true;
          }
        }
        if (!played) {  // 无匹配：出首张手牌到最短列，制造新顶牌
          const shortest = cols.reduce((mi, c, ci) => (c.querySelectorAll('.card').length < cols[mi].querySelectorAll('.card').length ? ci : mi), 0);
          cols[shortest].click(); await sleep(400);
        }
      }
      out.score = window.__g2048.snapshot().score;
      out.badgesOk = ['badge-dynamic', 'badge-undo', 'badge-wildcard', 'badge-trash'].every(id => !!document.getElementById(id));
      // 重开归零
      window.__g2048.initGame(false);
      await sleep(200);
      out.resetOk = window.__g2048.snapshot().score === 0;
    } catch (e) { out.err = String(e); }
    return out;
  });
  A('Q4 出牌得分链：同值合并得分 + 四工具徽章在册 + 重开归零（无 __system 静默）',
    q4.scored && q4.badgesOk && q4.resetOk && !q4.err && q4.snapKeysOk,
    JSON.stringify(q4).slice(0, 140));

  // Q5 全程零 pageerror
  A('Q5 全程零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
} catch (e) {
  A('e2e 异常中断', false, String(e));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const failed = results.filter(([c]) => !c);
console.log(`\n==== e2e-v181-batch7: ${results.length - failed.length}/${results.length} ====${failed.length ? ' FAILED' : ' ALL PASS'}`);
process.exit(failed.length ? 1 : 0);
