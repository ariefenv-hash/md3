// ==================== e2e-v181-batch2.mjs — #181 第二批整改行为真跑（v9.47 · R63 窗主作业） ====================
// calculator + weather 直开（无桌面注入 → __system 不可用 → SDK 降级路径不炸为验收点之一）+ 平板/手机双视口：
// Q1 calculator 手机态：按键 5+3= → 显示 8 + 历史入档（抽屉+平板面板双容器同写，降级 fsSynced 静默）
// Q2 calculator 按键字号怠速柄滑条 1.5× → --btn-font-scale + --p 同步 + localStorage 持久化（reload 复验）
// Q3 calculator 平板 900px：app-viewport grid 两列 + #tablet-history 可见 + 历史项同步
// Q4 weather 手机态：城市胶囊 ≥1 + 重定位间隔滑条默认 30 → 改 15 持久化（getRelocateMin=15）
// Q5 weather 手动选城 → currentCityName 更新 + SDK 降级不炸（fetch 断网 catch）
// Q6 weather 平板 900px：main grid 两列 + 逐小时|每日 section 分列
// Q7 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8943;
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
// 外域断网（e2e 惯例）：天气 API abort → 应用 catch 降级
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());

try {
  // ---------- calculator 手机态 ----------
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto(`${BASE}/calculator/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1000);
  // Q1：5 + 3 = → 8
  await page.click('[data-val="5"]');
  await page.click('[data-action="op"][data-val="+"]');
  await page.click('[data-val="3"]');
  await page.click('[data-action="calculate"]');
  await sleep(300);
  const q1 = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('ios-desktop:calc-state-v1') || '{}');
    return {
      main: document.getElementById('display-main').textContent,
      drawer: document.getElementById('history-list').children.length,
      panel: document.getElementById('tablet-history-list').children.length,
      fsGone: !(window.__system && window.__system.fs), // 直开降级
      hist: st.history && st.history.length,
    };
  });
  A('Q1 calc 5+3=8 + 历史双容器同写 + 直开 fs 降级',
    q1.main === '8' && q1.drawer >= 1 && q1.panel >= 1 && q1.fsGone && q1.hist >= 1,
    `main=${q1.main} drawer=${q1.drawer} panel=${q1.panel} hist=${q1.hist}`);

  // Q2：按键字号滑条 → 1.5
  const q2 = await page.evaluate(() => {
    const s = document.getElementById('btnfont-slider');
    s.value = '1.5'; s.dispatchEvent(new Event('input'));
    return {
      scale: document.documentElement.style.getPropertyValue('--btn-font-scale'),
      p: s.style.getPropertyValue('--p'),
      saved: localStorage.getItem('ios-desktop:calc-btn-font-v1'),
      txt: document.getElementById('btnfont-val-text').textContent,
    };
  });
  A('Q2 怠速柄 1.5× → --btn-font-scale + --p + localStorage', q2.scale === '1.5' && q2.saved === '1.5' && q2.p === '100.0%' && q2.txt === '1.50×',
    `scale=${q2.scale} p=${q2.p}`);

  // reload 复验持久化
  await page.reload({ waitUntil: 'load' }); await sleep(900);
  const q2b = await page.evaluate(() => ({
    scale: document.documentElement.style.getPropertyValue('--btn-font-scale'),
    txt: document.getElementById('btnfont-val-text').textContent,
  }));
  A('Q2b reload 后字号持久化回填', q2b.scale === '1.5' && q2b.txt === '1.50×', `scale=${q2b.scale}`);

  // ---------- calculator 平板 900px ----------
  await page.setViewportSize({ width: 1000, height: 800 });
  await sleep(500);
  const q3 = await page.evaluate(() => {
    const vp = document.getElementById('app-viewport');
    const panel = document.getElementById('tablet-history');
    const cs = getComputedStyle(vp);
    return {
      grid: cs.display === 'grid',
      cols: cs.gridTemplateColumns.split(' ').length,
      panelVisible: !!panel.offsetParent,
      items: document.getElementById('tablet-history-list').children.length,
    };
  });
  A('Q3 calc 平板 grid 两列 + 历史常驻面板可见', q3.grid && q3.cols === 2 && q3.panelVisible && q3.items >= 1,
    `grid=${q3.grid} cols=${q3.cols} panel=${q3.panelVisible} items=${q3.items}`);

  // ---------- weather 手机态 ----------
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto(`${BASE}/weather/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1400);
  const q4 = await page.evaluate(() => {
    const s = document.getElementById('refreshSlider');
    s.value = '15'; s.dispatchEvent(new Event('input'));
    return {
      chips: document.querySelectorAll('.city-chip').length,
      val: document.getElementById('refreshVal').textContent,
      saved: localStorage.getItem('md3_weather_relocate_min_v1'),
      p: s.style.getPropertyValue('--p'),
    };
  });
  A('Q4 weather 胶囊渲染 + 间隔滑条 15 持久化', q4.chips >= 1 && q4.val === '15 分钟' && q4.saved === '15' && q4.p === '18.2%',
    `chips=${q4.chips} val=${q4.val} p=${q4.p}`);

  // Q5：手动选城（断网 → fetch abort 应用 catch 不炸）
  await page.evaluate(() => { document.querySelectorAll('.city-chip')[1].click(); });
  await sleep(900);
  const q5 = await page.evaluate(() => ({
    city: document.getElementById('currentCityName').textContent,
    saved: JSON.parse(localStorage.getItem('md3_weather_loc_v1') || '{}').src,
    noSDK: !(window.__system && window.__system.notify),
  }));
  A('Q5 手动选城切换 + 降级不炸', q5.city && q5.city !== '北京市' && q5.saved === 'manual' && q5.noSDK,
    `city=${q5.city} src=${q5.saved}`);

  // Q6：weather 平板 900px
  await page.setViewportSize({ width: 1000, height: 800 });
  await sleep(500);
  const q6 = await page.evaluate(() => {
    const main = document.querySelector('.weather-app-container > main');
    const secs = main.querySelectorAll(':scope > section');
    return {
      display: getComputedStyle(main).display,
      cols: getComputedStyle(main).gridTemplateColumns.split(' ').length,
      s3col: getComputedStyle(secs[2]).gridColumnStart,
      s4col: getComputedStyle(secs[3]).gridColumnStart,
    };
  });
  A('Q6 weather 平板 main grid 两列 + section 分列', q6.display === 'grid' && q6.cols === 2 && q6.s3col === '1' && q6.s4col === '2',
    `display=${q6.display} cols=${q6.cols} s3=${q6.s3col} s4=${q6.s4col}`);

  A('Q7 全程零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));
} catch (e) {
  A('EXCEPTION', false, String(e).slice(0, 200));
} finally {
  await browser.close();
  server.kill();
}
const fail = results.filter((r) => !r[0]);
console.log(`\n===== e2e-v181-batch2: ${results.length - fail.length}/${results.length} =====`);
process.exit(fail.length ? 1 : 0);
