// ==================== e2e-v181-batch8.mjs — #181 第八批 ping 行为真跑（v9.56） ====================
// ping 直开（无桌面注入 → __system 不可用 → SDK 降级路径不炸为验收点）+ 手机/平板双视口：
// Q1 手机 400px：紧凑断点（chart 52px）+ 布局保持 flex column（零变化锚）+ 六统计卡在册
// Q2 平板 800px：.pg-app grid 两列 1fr/300px + 历史列纵向 + note 沉底右列
// Q3 pressRipple：pg-go 按下 → 本体 scale(<1) → 松手复位
// Q4 真实探测链路：ping 本地 serve → ok 样本入统计/日志/时序图 → 停止归位（无 __system 全程静默）+ 零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8965;
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
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // 外域断网（e2e 惯例；本地 serve 放行）

try {
  // Q1 手机 400px
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`${BASE}/ping/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1200);
  const q1 = await page.evaluate(() => {
    const app = document.querySelector('.pg-app');
    const chart = document.getElementById('pgChart');
    return {
      appFlex: getComputedStyle(app).display === 'flex',
      chartH: chart.getBoundingClientRect().height,
      stats: document.querySelectorAll('.pg-stat').length,
      gridVar: getComputedStyle(document.documentElement).getPropertyValue('--pg-grid').trim(),
    };
  });
  A('Q1 手机 400px：紧凑断点（chart 52px）+ flex 零变化 + 六统计卡 + --pg-grid 变量在册',
    q1.appFlex && Math.round(q1.chartH) === 52 && q1.stats === 6 && q1.gridVar.includes('color-mix'),
    `flex=${q1.appFlex} chart=${q1.chartH} stats=${q1.stats} grid=${q1.gridVar}`);

  // Q2 平板 800px
  await page.setViewportSize({ width: 800, height: 900 });
  await sleep(500);
  const q2 = await page.evaluate(() => {
    const app = document.querySelector('.pg-app');
    const cs = getComputedStyle(app);
    const hist = document.getElementById('pgHist');
    const note = document.querySelector('.pg-note');
    const out = document.getElementById('pgOut');
    return {
      display: cs.display,
      cols: cs.gridTemplateColumns,
      histCol: getComputedStyle(hist).gridColumnStart,
      histDir: getComputedStyle(hist).flexDirection,
      noteCol: getComputedStyle(note).gridColumnStart,
      outCol: getComputedStyle(out.parentElement).gridColumnStart,
    };
  });
  A('Q2 平板 800px：grid 两列 1fr/300px + 日志左列 + 历史右列纵向 + note 沉底',
    q2.display === 'grid' && q2.cols.split(' ').length === 2 && q2.cols.includes('300px')
      && q2.histCol === '2' && q2.histDir === 'column' && q2.noteCol === '2' && q2.outCol === '1',
    `cols=${q2.cols} hist=${q2.histCol}/${q2.histDir} note=${q2.noteCol} out=${q2.outCol}`);

  // Q3 pressRipple（pg-go 本体按压/释放）
  await page.setViewportSize({ width: 400, height: 800 });
  await sleep(400);
  const q3 = await page.evaluate(() => new Promise((resolve) => {
    const btn = document.getElementById('pgGo');
    const r = btn.getBoundingClientRect();
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
    const pressed = btn.style.transform;                     // 同步：按压态
    requestAnimationFrame(() => {
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      requestAnimationFrame(() => resolve({ pressed, after: btn.style.transform }));
    });
  }));
  A('Q3 pressRipple：按压本体 scale(<1) + 松手复位',
    q3.pressed.includes('scale(') && parseFloat(q3.pressed.replace('scale(', '')) < 1 && q3.after === '',
    `pressed=${q3.pressed} after='${q3.after}'`);

  // Q4 真实探测链路（本地 serve 放行 → ok 样本 → 统计/日志/图表 → 停止）
  const q4 = await page.evaluate(async () => {
    const out = { sent: 0, okLines: 0, err: '' };
    try {
      const target = location.origin + '/';
      document.getElementById('pgTarget').value = target;
      document.getElementById('pgGo').click();               // 开始
      await new Promise((r) => setTimeout(r, 2300));          // 等约 2 个样本（1s 间隔）
      const stopBtn = document.getElementById('pgGo');
      const stillRunning = stopBtn.textContent === '停止';
      if (stillRunning) stopBtn.click();                      // 停止
      await new Promise((r) => setTimeout(r, 150));
      out.sent = document.getElementById('pgSent').textContent;
      out.okLines = document.querySelectorAll('#pgOut .pg-line.ok').length;
      out.histChips = document.querySelectorAll('#pgHist .pg-hist').length;
      out.badgeIdle = document.getElementById('pgBadge').textContent === 'IDLE';
      // 非法目标 warn 路径
      document.getElementById('pgTarget').value = 'ftp://bad';
      document.getElementById('pgGo').click();
      await new Promise((r) => setTimeout(r, 100));
      out.warn = document.getElementById('pgWarn').textContent;
    } catch (e) { out.err = String(e); }
    return out;
  });
  A('Q4 真实探测链路：ok 样本入日志/统计 + 历史 chip 落档 + 停止归位 IDLE + 非法目标 warn（无 __system 静默）',
    q4.okLines > 0 && q4.sent !== '—' && q4.sent.includes('/') && q4.histChips >= 1 && q4.badgeIdle && q4.warn.includes('非法') && !q4.err,
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
console.log(`\n==== e2e-v181-batch8: ${results.length - failed.length}/${results.length} ====${failed.length ? ' FAILED' : ' ALL PASS'}`);
process.exit(failed.length ? 1 : 0);
