// ==================== e2e-v88-navbar-icons.mjs — #88 三键导航图标 AOSP 权威对齐 e2e ====================
//
// Q1 三键导航开启后 .sys-nav-bar 在场可见（seed navbar-enabled）
// Q2 三键 path d 逐字 = AOSP 入库权威值（docs/reference 真源，DOM 真跑比对）
// Q3 三键 svg viewBox="0 0 20 20"（AOSP 20dp 形态）
// Q4 fill 语义生效：path computed fill ≠ none 且 stroke = none（AOSP fill 实心）
// Q5 三键图形有界渲染（getBoundingClientRect 宽高 > 0）
// Q6 pos 三档切换回归：setNavBarPos('left') → class pos-left 生效（既有行为不破坏）
// Q7 音量键 #107 默认 hidden（线稿维持范围外，默认态不显）
// Q8 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8987;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// AOSP 权威 pathData（与 tests/navbar-icons.test.js 同源：docs 入库文件逐字）
const { readFileSync } = await import('node:fs');
const REF = (f) => readFileSync(join(root, 'docs/reference/frameworks-base/systemui/navbar-icons', f), 'utf-8')
  .match(/android:pathData="([^"]+)"/)[1];

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());

try {
  await page.addInitScript(() => { try { localStorage.setItem('ios-desktop:navbar-enabled', '1'); } catch (e) {} });
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);

  // Q1 三键栏在场
  const q1 = await page.evaluate(() => {
    const bar = document.querySelector('.sys-nav-bar');
    return { on: !!bar && !bar.classList.contains('hidden'), h: bar ? bar.getBoundingClientRect().height : 0 };
  });
  A('Q1 三键导航开启且栏体在场', q1.on === true && q1.h > 0, `h=${q1.h}`);

  // Q2+Q3+Q4+Q5 三键 DOM 真跑比对
  const EXPECT = { back: REF('ic_sysbar_back.xml'), home: REF('ic_sysbar_home.xml'), recents: REF('ic_sysbar_recent.xml') };
  const keys = await page.evaluate(() => {
    const out = {};
    for (const key of ['back', 'home', 'recents']) {
      const btn = document.querySelector(`.nvb-btn[data-nvb="${key}"]`);
      if (!btn) { out[key] = null; continue; }
      const svg = btn.querySelector('svg.nvb-icon');
      const path = btn.querySelector('path');
      const cs = path ? getComputedStyle(path) : null;
      const rect = btn.getBoundingClientRect();
      out[key] = {
        d: path ? path.getAttribute('d') : null,
        vb: svg ? svg.getAttribute('viewBox') : null,
        fill: cs ? cs.fill : null,
        stroke: cs ? cs.stroke : null,
        w: rect.width, h: rect.height,
      };
    }
    return out;
  });
  for (const key of ['back', 'home', 'recents']) {
    const k = keys[key];
    A(`Q2 ${key} path d 逐字=AOSP 权威`, !!k && k.d === EXPECT[key], k ? `d=${(k.d || '').slice(0, 24)}…` : 'missing');
    A(`Q3 ${key} viewBox 20`, !!k && k.vb === '0 0 20 20', `vb=${k && k.vb}`);
    A(`Q4 ${key} fill 语义生效`, !!k && k.fill && k.fill !== 'none' && k.stroke === 'none', `fill=${k && k.fill} stroke=${k && k.stroke}`);
    A(`Q5 ${key} 图形有界渲染`, !!k && k.w > 0 && k.h > 0, `${k && k.w}x${k && k.h}`);
  }

  // Q6 pos 三档切换回归（既有行为不破坏）
  const q6 = await page.evaluate(() => {
    window.__navBar.setPos('left');
    const bar = document.querySelector('.sys-nav-bar');
    const cls = bar.className.includes('pos-left');
    window.__navBar.setPos('center');
    const back = bar.className.includes('pos-center');
    return { cls, back };
  });
  A('Q6 pos 三档切换回归（left→center class 跟随）', q6.cls === true && q6.back === true, JSON.stringify(q6));

  // Q7 音量键默认 hidden
  const q7 = await page.evaluate(() => {
    const vols = [...document.querySelectorAll('.nvb-vol')];
    return vols.length === 2 && vols.every((b) => b.hidden);
  });
  A('Q7 音量键双键默认 hidden', q7 === true);

  // Q8 零 pageerror
  A('Q8 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));
} catch (e) {
  A('e2e 异常中断', false, String(e).slice(0, 300));
} finally {
  await browser.close();
  server.kill();
}

const fails = results.filter(([c]) => !c);
console.log(`\n=== e2e-v88: ${results.length - fails.length}/${results.length} passed ===`);
process.exit(fails.length ? 1 : 0);
