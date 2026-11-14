// ==================== e2e-v181-batch6.mjs — #181 第六批 flow11 行为真跑（v9.54） ====================
// flow11 直开（无桌面注入 → __system 不可用 → SDK 降级路径不炸为验收点）+ 手机/平板双视口：
// Q1 手机 400px：body 紧凑 padding 8/10/62 + 布局保持 flex column（零变化锚）+ vol-row 在册
// Q2 平板 800px：.game-container grid 两列 1fr/300px + board-wrapper 左列 + crafting 右列跨行 + chips 纵向
// Q3 音量带手柄：0.67 → --p=67% + localStorage flow11-vol-v1 持久化（reload 复验 --p 回填）
// Q4 pressRipple 整排联动：pointerdown 于 mode-pill → 近邻 pill transform 让位 → pointerup 复位
// Q5 降级零炸：无 __system 下模拟连线合成两颗同值晶石 + 破纪录路径 + 重置 → 零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8963;
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
  await page.goto(`${BASE}/flow11/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1500);
  const q1 = await page.evaluate(() => {
    const app = document.querySelector('.game-container');
    const body = document.body;
    const bs = getComputedStyle(body);
    return {
      appFlex: getComputedStyle(app).display === 'flex',
      bodyPad: bs.paddingTop + '|' + bs.paddingLeft + '|' + bs.paddingBottom,
      volRow: !!document.getElementById('flowVol'),
      cells: document.querySelectorAll('.cell').length,
    };
  });
  A('Q1 手机 400px：@media 紧凑 padding 8/10/62 + flex 零变化 + vol-row 就绪 + 25 格',
    q1.appFlex && q1.bodyPad.startsWith('8px|10px|62px') && q1.volRow && q1.cells === 25,
    `pad=${q1.bodyPad} vol=${q1.volRow} cells=${q1.cells}`);

  // Q3 手机态音量带手柄（--p 同步 + localStorage）
  await page.evaluate(() => {
    const el = document.getElementById('flowVol');
    el.value = 67;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await sleep(150);
  const q3a = await page.evaluate(() => ({
    p: document.getElementById('flowVol').style.getPropertyValue('--p'),
    val: document.getElementById('flowVolVal').textContent,
    ls: localStorage.getItem('flow11-vol-v1'),
  }));
  A('Q3a 带手柄 0.67：--p=67% + 显示 67% + localStorage 持久化',
    q3a.p === '67%' && q3a.val === '67%' && q3a.ls === '67', JSON.stringify(q3a));

  // Q2 平板 800px
  await page.setViewportSize({ width: 800, height: 900 });
  await sleep(500);
  const q2 = await page.evaluate(() => {
    const app = document.querySelector('.game-container');
    const cs = getComputedStyle(app);
    const board = document.getElementById('boardWrapper');
    const craft = document.getElementById('specialCraftingBar');
    const chips = craft.querySelector('.crafting-chips');
    return {
      display: cs.display,
      cols: cs.gridTemplateColumns,
      boardCol: getComputedStyle(board).gridColumnStart,
      craftCol: getComputedStyle(craft).gridColumnStart,
      chipsDir: getComputedStyle(chips).flexDirection,
    };
  });
  A('Q2 平板 800px：grid 两列 1fr/300px + 棋盘左列 + 工坊右列 + chips 纵向常驻',
    q2.display === 'grid' && q2.cols.split(' ').length === 2 && q2.cols.includes('300px')
      && q2.boardCol === '1' && q2.craftCol === '2' && q2.chipsDir === 'column',
    `cols=${q2.cols} board=${q2.boardCol} craft=${q2.craftCol} chips=${q2.chipsDir}`);

  // Q3b 平板态 reload 回填（--p 持久化复验）
  await page.reload({ waitUntil: 'load' });
  await sleep(1200);
  const q3b = await page.evaluate(() => ({
    p: document.getElementById('flowVol').style.getPropertyValue('--p'),
    val: document.getElementById('flowVolVal').textContent,
  }));
  A('Q3b reload 回填：--p=67% 持久化复验', q3b.p === '67%' && q3b.val === '67%', JSON.stringify(q3b));

  // Q4 pressRipple 整排联动（mode-pills 第 1 颗按下 → 紧邻第 2 颗让位）
  // 派发目标 = pill 本体（真实点击 target 为 button 冒泡到 row；row 直发 target=row 时 closest('button') 落空）；
  // 按压态 self/近邻在 dispatch 后同步读取（pointerup 后 releaseRipple 即清空，rAF 后读必为空）
  const q4 = await page.evaluate(() => new Promise((resolve) => {
    const row = document.querySelector('.mode-pills');
    const pills = Array.from(row.querySelectorAll('.mode-pill'));
    const r = pills[0].getBoundingClientRect();
    pills[0].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
    const pressedSelf = pills[0].style.transform;            // 同步：按压态本体
    const neighbour = pills[1].style.transform;              // 同步：紧邻让位（scale < 1）
    requestAnimationFrame(() => {
      row.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      requestAnimationFrame(() => {
        const after = pills[0].style.transform;              // 释放后复位
        resolve({ pressedSelf, neighbour, after });
      });
    });
  }));
  A('Q4 pressRipple：按压本体 scale(0.94) + 紧邻让位 scale(<1) + 松手复位',
    q4.pressedSelf.includes('scale(0.94)') && q4.neighbour.includes('scale(')
      && parseFloat(q4.neighbour.replace('scale(', '')) < 1 && q4.after === '',
    `self=${q4.pressedSelf} neighbour=${q4.neighbour} after='${q4.after}'`);

  // Q5 降级零炸：模拟连线合成（找相邻同值格派发 pointer 序列）+ 破纪录 + 重置
  await page.setViewportSize({ width: 400, height: 800 });
  await sleep(400);
  const q5 = await page.evaluate(async () => {
    const out = { merged: false, err: '' };
    try {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const findPair = () => {
        const cells = Array.from(document.querySelectorAll('#boardGrid .cell'));
        for (const a of cells) {
          const ga = a.querySelector('.gem-lvl-1') || a.querySelector('.gem-lvl-2') || a.querySelector('.gem-lvl-3');
          if (!ga) continue;
          const ra = +a.dataset.row, ca = +a.dataset.col;
          for (const b of cells) {
            if (b === a) continue;
            const rb = +b.dataset.row, cb = +b.dataset.col;
            if (Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1) {
              const gb = b.querySelector('.gem-lvl-1') || b.querySelector('.gem-lvl-2') || b.querySelector('.gem-lvl-3');
              if (gb && gb.className === ga.className) return [a, b];
            }
          }
        }
        return null;
      };
      for (let attempt = 0; attempt < 4 && !out.merged; attempt++) {
        const pair = findPair();
        if (!pair) break;
        const [a, b] = pair;
        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        const wrap = document.getElementById('boardWrapper').getBoundingClientRect();
        const fire = (el, type, x, y) => el.dispatchEvent(new PointerEvent(type, {
          bubbles: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true,
        }));
        fire(document.getElementById('boardWrapper'), 'pointerdown', ra.x + ra.width / 2, ra.y + ra.height / 2);
        await sleep(30);
        fire(window, 'pointermove', rb.x + rb.width / 2, rb.y + rb.height / 2);
        await sleep(30);
        fire(window, 'pointerup', rb.x + rb.width / 2, rb.y + rb.height / 2);
        await sleep(120);
        out.merged = +document.getElementById('scoreVal').textContent > 0;
      }
      // 破纪录路径 + session-end 落档（无 __system 降级静默）
      document.getElementById('btnRestart').click();
      await sleep(100);
      out.restartOk = +document.getElementById('scoreVal').textContent === 0;
    } catch (e) { out.err = String(e); }
    return out;
  });
  A('Q5 降级零炸：连线合成得分 + 重置归零（无 __system 全程静默）',
    q5.merged && q5.restartOk && !q5.err, JSON.stringify(q5).slice(0, 120));

  // Q6 全程零 pageerror
  A('Q6 全程零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
} catch (e) {
  A('e2e 异常中断', false, String(e));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const failed = results.filter(([c]) => !c);
console.log(`\n==== e2e-v181-batch6: ${results.length - failed.length}/${results.length} ====${failed.length ? ' FAILED' : ' ALL PASS'}`);
process.exit(failed.length ? 1 : 0);
