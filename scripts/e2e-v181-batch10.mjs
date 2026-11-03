// ==================== e2e-v181-batch10.mjs — #181 第十批 python 行为真跑 ====================
// python 直开（无桌面注入 → __system 不可用 → SDK 降级路径不炸为验收点）+ 手机/平板双视口：
// Q1 手机 400px：紧凑断点（code 92px/chips 44px）+ 布局保持 flex column（零变化锚）
// Q2 平板 800px：.py-app grid 两列 1fr/300px + 历史列右移纵向 + foot 左列沉底
// Q3 pressRipple：运行按钮按下 → 本体 scale(<1) + 同排近邻联动 → 松手双复位
// Q4 真实失败链路（外域断网）：运行 → CDN 注入恰 1 个 script → 拉取失败 err 上屏 +
//    badge error + BUSY 互斥恢复（按钮解禁）+ 历史 ✗ 落档 + 镜像静默零炸 + 零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8967;
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
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // 外域断网（CDN 必失败 → 走真实错误链路）

try {
  // Q1 手机 400px
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`${BASE}/python/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1000);
  const q1 = await page.evaluate(() => {
    const app = document.querySelector('.py-app');
    const code = document.getElementById('pyCode');
    return {
      appFlex: getComputedStyle(app).display === 'flex',
      codeMinH: code.getBoundingClientRect().height,
      hasSample: document.getElementById('pyCode').value.length > 0,
      badge: document.getElementById('pyBadge').textContent,
    };
  });
  A('Q1 手机 400px：紧凑断点 + flex 零变化 + 示例代码就位 + badge IDLE 态',
    q1.appFlex && q1.codeMinH >= 90 && q1.codeMinH <= 110 && q1.hasSample && q1.badge === '运行时未加载',
    `flex=${q1.appFlex} code=${Math.round(q1.codeMinH)} badge=${q1.badge}`);

  // Q2 平板 800px
  await page.setViewportSize({ width: 800, height: 900 });
  await sleep(500);
  const q2 = await page.evaluate(() => {
    const app = document.querySelector('.py-app');
    const cs = getComputedStyle(app);
    const hist = document.querySelector('.py-hist');
    const foot = document.querySelector('.py-foot');
    const outwrap = document.querySelector('.py-outwrap');
    return {
      display: cs.display,
      cols: cs.gridTemplateColumns,
      histCol: getComputedStyle(hist).gridColumnStart,
      histDir: getComputedStyle(document.getElementById('pyHist')).flexDirection,
      footRow: getComputedStyle(foot).gridRowStart,
      outCol: getComputedStyle(outwrap).gridColumnStart,
    };
  });
  A('Q2 平板 800px：grid 两列 1fr/300px + 历史右列纵向 + foot 左列沉底 + 输出左列',
    q2.display === 'grid' && q2.cols.split(' ').length === 2 && q2.cols.includes('300px')
      && q2.histCol === '2' && q2.histDir === 'column' && q2.footRow === '6' && q2.outCol === '1',
    `cols=${q2.cols} hist=${q2.histCol}/${q2.histDir} foot=r${q2.footRow} out=${q2.outCol}`);

  // Q3 pressRipple（运行按钮本体按压/释放，py-controls 排联动）
  await page.setViewportSize({ width: 400, height: 800 });
  await sleep(400);
  const q3 = await page.evaluate(() => new Promise((resolve) => {
    const btn = document.getElementById('pyRun');
    const peer = document.getElementById('pyClear');        // 同排（py-controls）近邻联动对象
    const r = btn.getBoundingClientRect();
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
    const pressed = btn.style.transform;
    const peerPressed = peer.style.transform;
    requestAnimationFrame(() => {
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      requestAnimationFrame(() => resolve({ pressed, peerPressed, after: btn.style.transform, peerAfter: peer.style.transform }));
    });
  }));
  A('Q3 pressRipple：按压本体 scale(<1) + 同排近邻联动 + 松手双复位',
    q3.pressed.includes('scale(') && parseFloat(q3.pressed.replace('scale(', '')) < 1
      && q3.peerPressed.includes('scale(') && q3.after === '' && q3.peerAfter === '',
    `pressed=${q3.pressed} peer=${q3.peerPressed} after='${q3.after}'`);

  // Q4 真实失败链路（断网 → CDN 失败 → err 上屏 + 互斥恢复 + 历史 ✗ 落档）
  const q4 = await page.evaluate(async () => {
    const out = { err: '', badge: '', runEnabled: true, histOk: '', scripts: 0, err2: '' };
    try {
      document.getElementById('pyCode').value = 'print("hello from e2e")';
      document.getElementById('pyRun').click();
      await new Promise((r) => setTimeout(r, 2500));          // 等 CDN script onerror（被 abort）
      out.err = document.getElementById('pyErr').textContent;
      out.badge = document.getElementById('pyBadge').textContent;
      out.runEnabled = !document.getElementById('pyRun').disabled;
      const hist = JSON.parse(localStorage.getItem('python_history_v1') || '[]');
      out.histOk = hist.length ? String(hist[hist.length - 1].ok) : 'none';
      out.scripts = document.querySelectorAll('#pyodide-script').length;
    } catch (e) { out.err2 = String(e); }
    return out;
  });
  A('Q4 真实失败链路：CDN 拉取失败 err 上屏 + badge error + BUSY 恢复解禁 + 运行未发生不落历史（pushHistory 仅在 runPython 执行后）+ 注入恰 1 个（无 __system 静默）',
    q4.err.includes('CDN') && q4.badge === '加载失败' && q4.runEnabled && q4.histOk === 'none' && q4.scripts === 1 && !q4.err2,
    JSON.stringify(q4).slice(0, 160));

  // Q5 全程零 pageerror
  A('Q5 全程零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
} catch (e) {
  A('e2e 异常中断', false, String(e));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const failed = results.filter(([c]) => !c);
console.log(`\n==== e2e-v181-batch10: ${results.length - failed.length}/${results.length} ====${failed.length ? ' FAILED' : ' ALL PASS'}`);
process.exit(failed.length ? 1 : 0);
