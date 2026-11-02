// ==================== e2e-v181-admission.mjs — #181 第一批整改行为真跑（v9.46 · R62 窗主作业） ====================
// 三应用直开（无桌面注入 → __system 不可用 → SDK 降级路径不炸为验收点之一）+ 平板/手机双视口：
// Q1 typing 手机态：题面渲染 + 字号滑条 21px 默认 + setTyped 打完 → panel.show + fsSynced===false（降级不炸）
// Q2 typing 滑条改 28 → drill fontSize 28px + __typingUI.fontSize===28（--p 同步链）
// Q3 typing 平板 900px：body display:grid（③真分栏）+ #side 侧栏可见
// Q4 drawcircle 手机态：mouse 画圆 → panel.show + score>0 + records≥1（VFS 降级静默）
// Q5 drawcircle 平板 900px：#cv 让位（clientWidth = innerWidth-360）
// Q6 gravity：hud 2 体 + speedSlider→50 → __gravityUI.speed===0.5（dt 标度）
// Q7 gravity 平板 900px：#dock display:flex + 保存场景 → scenes===1（fs 降级内存态）
// Q8 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8941;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/apps`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

try {
  // ---------- typing 手机态 ----------
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto(`${BASE}/typing/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1200);
  const q1 = await page.evaluate(() => {
    const ui = window.__typingUI;
    ui.setTyped(ui.target);                       // 一次全对打完 → finish
    return {
      drilled: document.getElementById('drill').children.length,
      fs: ui.fsSynced, panel: document.getElementById('panel').classList.contains('show'),
      wpm: ui.last && ui.last.wpm, font: ui.fontSize,
    };
  });
  await sleep(400);
  A('Q1 typing 打完出成绩 + SDK 降级 fsSynced=false 不炸',
    q1.drilled > 0 && q1.fs === false && q1.panel === true && q1.wpm >= 0 && q1.font === 21,
    `drilled=${q1.drilled} fs=${q1.fs} panel=${q1.panel} wpm=${q1.wpm}`);

  const q2 = await page.evaluate(() => {
    const s = document.getElementById('fontSlider');
    s.value = 28; s.dispatchEvent(new Event('input'));
    return {
      px: document.getElementById('drill').style.fontSize,
      ui: window.__typingUI.fontSize, p: s.style.getPropertyValue('--p'),
    };
  });
  A('Q2 滑条改 28 → 题面字号同步 + --p 同步', q2.px === '28px' && q2.ui === 28 && q2.p === '86.66666666666667%', `px=${q2.px} p=${q2.p}`);

  await page.setViewportSize({ width: 1000, height: 800 });
  await sleep(500);
  const q3 = await page.evaluate(() => ({
    grid: getComputedStyle(document.body).display === 'grid',
    side: !!document.getElementById('side').offsetParent,
    cols: getComputedStyle(document.body).gridTemplateColumns,
  }));
  A('Q3 typing 平板 900px 真分栏（grid 双栏 + #side 可见）',
    q3.grid && q3.side && q3.cols.split(' ').length === 2, `cols=${q3.cols}`);

  // ---------- drawcircle ----------
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto(`${BASE}/drawcircle/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1200);
  const cx = 300, cy = 450, R = 130;
  await page.mouse.move(cx, cy + R);
  await page.mouse.down();
  for (let i = 1; i <= 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    await page.mouse.move(cx + R * Math.sin(a), cy + R * Math.cos(a));
    await sleep(12);
  }
  await page.mouse.up();
  await sleep(600);
  const q4 = await page.evaluate(() => {
    const ui = window.__drawCircleUI;
    return { panel: document.getElementById('panel').classList.contains('show'), score: ui.last && ui.last.score, recs: ui.records };
  });
  A('Q4 drawcircle 画圆出分 + 纪录入列（VFS 降级静默）', q4.panel && q4.score > 0 && q4.recs >= 1, `score=${q4.score} recs=${q4.recs}`);

  await page.setViewportSize({ width: 1000, height: 800 });
  await sleep(500);
  const q5 = await page.evaluate(() => ({
    cvW: document.getElementById('cv').clientWidth, iw: window.innerWidth,
  }));
  A('Q5 drawcircle 平板画布让位 360px 右栏', q5.iw - q5.cvW === 360, `cv=${q5.cvW} iw=${q5.iw}`);

  // ---------- gravity ----------
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto(`${BASE}/gravity/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1500);
  const q6a = await page.evaluate(() => ({
    hud: document.getElementById('hud').textContent,
    dock: getComputedStyle(document.getElementById('dock')).display,
  }));
  await page.evaluate(() => {
    const s = document.getElementById('speedSlider');
    s.value = 50; s.dispatchEvent(new Event('input'));
  });
  const q6b = await page.evaluate(() => window.__gravityUI.speed);
  A('Q6 gravity 2 体预设 + dock 手机态隐藏 + 流速 0.5×', q6a.hud.startsWith('2') && q6a.dock === 'none' && q6b === 0.5, `hud=${q6a.hud} dock=${q6a.dock} speed=${q6b}`);

  await page.setViewportSize({ width: 1000, height: 800 });
  await sleep(500);
  await page.evaluate(() => document.getElementById('btnSaveScene').click());
  await sleep(300);
  const q7 = await page.evaluate(() => ({
    dock: getComputedStyle(document.getElementById('dock')).display,
    scenes: window.__gravityUI.scenes,
    rows: document.querySelectorAll('#sceneList .scene').length,
  }));
  A('Q7 gravity 平板 dock 显示 + 场景保存入列', q7.dock === 'flex' && q7.scenes === 1 && q7.rows === 1, `dock=${q7.dock} scenes=${q7.scenes} rows=${q7.rows}`);

  // Q8 零 pageerror
  A('Q8 全程零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close();
  server.kill();
}
const fails = results.filter((r) => !r[0]);
console.log(`\n[e2e-v181] 结果：PASS ${results.length - fails.length} / FAIL ${fails.length}`);
process.exit(fails.length ? 1 : 0);
