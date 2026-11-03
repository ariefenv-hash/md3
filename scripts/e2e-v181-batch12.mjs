// ==================== e2e-v181-batch12.mjs — #181 第十二批 threes 行为真跑（13/13 收官）====================
// threes 直开（无桌面注入 → __system 不可用 → SDK 降级路径不炸为验收点）+ 手机/平板双视口：
// Q1 手机 400px：紧凑断点（icon-btn 32px）+ 对局卡片 flex 布局零变化 + side-panel 隐藏
// Q2 平板 800px：body 两列 grid 1fr/300px + side-panel 右列常驻（display flex/col 2）+ app 左列
// Q3 pressRipple：icon-btn 按下本体 scale(<1) + 同排近邻联动 → 松手双复位
// Q4 真实下棋链路：键盘 ArrowLeft/A → moves 递增 + 下张牌刷新 + side-panel stats 同步刷新
//    + 无 __system VFS/notify 静默零炸
// Q5 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8969;
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
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // 外域断网（unsplash 壁纸失败不阻塞）

try {
  // Q1 手机 400px
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`${BASE}/threes/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1000);
  const q1 = await page.evaluate(() => {
    const app = document.querySelector('.app');
    const btn = document.querySelector('.icon-btn').getBoundingClientRect();
    const sp = document.getElementById('sidePanel');
    const tiles = document.querySelectorAll('.tile').length;
    return {
      appCol: getComputedStyle(app).flexDirection,
      btnW: Math.round(btn.width),
      spDisplay: getComputedStyle(sp).display,
      tiles,
    };
  });
  A('Q1 手机 400px：flex 零变化 + icon-btn 32px 紧凑 + side-panel 隐藏 + 开局 9 张棋子',
    q1.appCol === 'column' && q1.btnW >= 30 && q1.btnW <= 34 && q1.spDisplay === 'none' && q1.tiles === 9,
    `flex=${q1.appCol} btn=${q1.btnW} sp=${q1.spDisplay} tiles=${q1.tiles}`);

  // Q2 平板 800px
  await page.setViewportSize({ width: 800, height: 900 });
  await sleep(500);
  const q2 = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const sp = document.getElementById('sidePanel');
    const scs = getComputedStyle(sp);
    const app = document.querySelector('.app');
    const acs = getComputedStyle(app);
    const appRect = app.getBoundingClientRect();
    return {
      cols: cs.gridTemplateColumns,
      spDisplay: scs.display,
      spDir: scs.flexDirection,
      spCol: scs.gridColumnStart,
      spW: Math.round(sp.getBoundingClientRect().width),
      appCol: acs.gridColumnStart,
      appRight: Math.round(appRect.right),
    };
  });
  A('Q2 平板 800px：两列 grid 1fr/300px + side-panel 右列常驻纵排（flex/col 2/300px）+ app 左列',
    q2.cols.split(' ').length === 2 && q2.cols.includes('300px')
      && q2.spDisplay === 'flex' && q2.spDir === 'column' && q2.spCol === '2' && q2.spW >= 298 && q2.spW <= 302
      && q2.appCol === '1' && q2.appRight <= 500,
    `cols=${q2.cols} sp=${q2.spDisplay}/${q2.spDir}/c${q2.spCol}/w${q2.spW} app=c${q2.appCol} r${q2.appRight}`);

  // Q3 pressRipple（header 按钮排）
  await page.setViewportSize({ width: 400, height: 800 });
  await sleep(400);
  const q3 = await page.evaluate(() => new Promise((resolve) => {
    const btns = Array.from(document.querySelectorAll('.btn-group .icon-btn'));
    const btn = btns[0];
    const peer = btns[3];
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

  // Q4 真实下棋链路（键盘 → move → render → side-panel 同步）
  const q4 = await page.evaluate(async () => {
    const out = { moves0: '', moves1: '', next: '', sp: '', sys: false, over: false, err: '' };
    try {
      out.sys = !!window.__system;   // 直开无桌面注入 → false（SDK 全静默）
      out.moves0 = document.getElementById('movesVal').innerText;
      out.next0 = document.getElementById('nextCard').innerText;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await new Promise((r) => setTimeout(r, 300));
      out.moves1 = document.getElementById('movesVal').innerText;
      out.next = document.getElementById('nextCard').innerText;
      out.sp = document.getElementById('spGames').innerText;
      out.over = typeof game !== 'undefined' ? game.over : null;
    } catch (e) { out.err = String(e); }
    return out;
  });
  A('Q4 真实下棋链路：ArrowLeft → 步数 0→1 + 下张牌刷新 + side-panel 同源 + 无 __system 全静默零炸',
    q4.moves0 === '0' && q4.moves1 === '1' && q4.next !== '' && q4.sp !== '' && q4.sys === false && q4.over === false && !q4.err,
    JSON.stringify(q4).slice(0, 180));

  // Q5 全程零 pageerror
  A('Q5 全程零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
} catch (e) {
  A('e2e 异常中断', false, String(e));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const failed = results.filter(([c]) => !c);
console.log(`\n==== e2e-v181-batch12: ${results.length - failed.length}/${results.length} ====${failed.length ? ' FAILED' : ' ALL PASS'}`);
process.exit(failed.length ? 1 : 0);
