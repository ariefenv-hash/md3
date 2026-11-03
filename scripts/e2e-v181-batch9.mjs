// ==================== e2e-v181-batch9.mjs — #181 第九批 midi-player 行为真跑 ====================
// midi-player 直开（无桌面注入 → __system 不可用 → SDK 降级路径不炸为验收点）+ 手机/平板双视口：
// Q1 手机 400px：紧凑断点（info 9.5px）+ 布局保持 flex column（零变化锚）+ 双示例 chip 在册
// Q2 平板 800px：.mp-app grid 两列 1fr/300px + 示例列右移纵向 + info 左列沉底 row 3
// Q3 pressRipple：导入按钮（mp-head 排）按下 → 本体 scale(<1) → 松手复位
// Q4 真实装载链路：点击示例 chip → 同源 fetch assets → stage 展开 + 信息栏回填（62 音符/1 轨）
//    + 历史独立键落档 + 同曲重装去重（无 __system 全程静默）+ 零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8966;
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
  await page.goto(`${BASE}/midi-player/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1500);
  const q1 = await page.evaluate(() => {
    const app = document.querySelector('.mp-app');
    const info = document.querySelector('.mp-info');
    const viz = document.getElementById('mpViz');
    return {
      appFlex: getComputedStyle(app).display === 'flex',
      infoFont: getComputedStyle(info).fontSize,
      chips: document.querySelectorAll('#mpSamples .mp-chip').length,
      maskVar: getComputedStyle(document.documentElement).getPropertyValue('--mp-mask').trim(),
      vizH: viz.getBoundingClientRect().height,
    };
  });
  A('Q1 手机 400px：紧凑断点（info 9.5px）+ flex 零变化 + 双示例 chip + --mp-mask 派生在册',
    q1.appFlex && q1.infoFont === '9.5px' && q1.chips === 2 && q1.maskVar.includes('color-mix') && q1.vizH === 0,
    `flex=${q1.appFlex} info=${q1.infoFont} chips=${q1.chips} mask=${q1.maskVar.slice(0, 40)}`);

  // Q2 平板 800px
  await page.setViewportSize({ width: 800, height: 900 });
  await sleep(500);
  const q2 = await page.evaluate(() => {
    const app = document.querySelector('.mp-app');
    const cs = getComputedStyle(app);
    const samples = document.getElementById('mpSamples');
    const info = document.querySelector('.mp-info');
    return {
      display: cs.display,
      cols: cs.gridTemplateColumns,
      samplesCol: getComputedStyle(samples).gridColumnStart,
      samplesDir: getComputedStyle(samples).flexDirection,
      infoRow: getComputedStyle(info).gridRowStart,
      infoCol: getComputedStyle(info).gridColumnStart,
    };
  });
  A('Q2 平板 800px：grid 两列 1fr/300px + 示例列右移纵向 + info 左列沉底 row 3',
    q2.display === 'grid' && q2.cols.split(' ').length === 2 && q2.cols.includes('300px')
      && q2.samplesCol === '2' && q2.samplesDir === 'column' && q2.infoRow === '3' && q2.infoCol === '1',
    `cols=${q2.cols} samples=${q2.samplesCol}/${q2.samplesDir} info=${q2.infoCol}/r${q2.infoRow}`);

  // Q3 pressRipple（导入按钮本体按压/释放，mp-head 排联动）
  await page.setViewportSize({ width: 400, height: 800 });
  await sleep(400);
  const q3 = await page.evaluate(() => new Promise((resolve) => {
    const btn = document.getElementById('mpImportBtn');
    const peer = document.getElementById('mpSfBtn');        // 同排（mp-head）近邻联动对象
    const r = btn.getBoundingClientRect();
    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }));
    const pressed = btn.style.transform;
    const peerPressed = peer.style.transform;                // 同排联动（近邻距离衰减）
    requestAnimationFrame(() => {
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      requestAnimationFrame(() => resolve({ pressed, peerPressed, after: btn.style.transform, peerAfter: peer.style.transform }));
    });
  }));
  A('Q3 pressRipple：按压本体 scale(<1) + 同排近邻联动 + 松手双复位',
    q3.pressed.includes('scale(') && parseFloat(q3.pressed.replace('scale(', '')) < 1
      && q3.peerPressed.includes('scale(') && q3.after === '' && q3.peerAfter === '',
    `pressed=${q3.pressed} peer=${q3.peerPressed} after='${q3.after}'`);

  // Q4 真实装载链路（同源 fetch assets → 装载 → 信息栏回填 → 历史落档 → 同曲去重）
  const q4 = await page.evaluate(async () => {
    const out = { notes: '', trks: '', name: '', stage: '', hist: 0, histAfterReload: 0, err: '' };
    try {
      const chip = document.querySelector('[data-test="mp-sample-ode"]');
      chip.click();
      await new Promise((r) => setTimeout(r, 2000));          // 等元件 load 事件（blob → parse）
      const stage = document.getElementById('mpStage');
      out.stage = stage.classList.contains('hide') ? 'hide' : 'shown';
      out.name = document.getElementById('mpStName').textContent;
      out.notes = document.getElementById('mpStNotes').textContent;
      out.trks = document.getElementById('mpStTrks').textContent;
      out.hist = JSON.parse(localStorage.getItem('ios-desktop:midi-history-v1') || '[]').length;
      // 同曲重复装载 → 历史去重仍 1 条（同曲门：notify 不重发口径同源）
      document.querySelector('[data-test="mp-sample-ode"]').click();
      await new Promise((r) => setTimeout(r, 800));
      out.histAfterReload = JSON.parse(localStorage.getItem('ios-desktop:midi-history-v1') || '[]').length;
    } catch (e) { out.err = String(e); }
    return out;
  });
  A('Q4 真实装载链路：stage 展开 + 信息栏回填（欢乐颂 62 音符 1 轨）+ 历史落档 + 同曲去重（无 __system 静默）',
    q4.stage === 'shown' && q4.name === '欢乐颂' && q4.notes === '62' && q4.trks === '1'
      && q4.hist === 1 && q4.histAfterReload === 1 && !q4.err,
    JSON.stringify(q4).slice(0, 150));

  // Q5 全程零 pageerror
  A('Q5 全程零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
} catch (e) {
  A('e2e 异常中断', false, String(e));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const failed = results.filter(([c]) => !c);
console.log(`\n==== e2e-v181-batch9: ${results.length - failed.length}/${results.length} ====${failed.length ? ' FAILED' : ' ALL PASS'}`);
process.exit(failed.length ? 1 : 0);
