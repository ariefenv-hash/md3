// ==================== e2e-v181-batch4.mjs — #181 第四批 ocr 行为真跑（v9.50） ====================
// ocr 直开（无桌面注入 → __system 不可用 → SDK/FS 降级路径不炸为验收点）+ 平板/手机双视口：
// Q1 手机 400px：display:contents 透明流（histPanel 隐藏）+ 语言 chips ≥1
// Q2 平板 800px：.oc-app grid 两列（1fr/300px）+ #ocHistPanel 可见 + 空态「暂无识别历史」
// Q3 结果字号怠速柄 1.15 → --res-font-scale + --p 同步 + localStorage 持久化（reload 复验）
// Q4 降级路径零炸：fsCall read 超时降级 + 无 Tesseract 触发（不识别）零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8951;
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
  // Q1 手机态
  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`${BASE}/ocr/index.html`, { waitUntil: 'load', timeout: 30000 });
  await sleep(1500);
  const q1 = await page.evaluate(() => {
    const main = document.querySelector('.oc-main'), side = document.querySelector('.oc-side');
    const hist = document.getElementById('ocHistPanel');
    return {
      mainTransparent: getComputedStyle(main).display === 'contents',
      sideTransparent: getComputedStyle(side).display === 'contents',
      histHidden: getComputedStyle(hist).display === 'none',
      chips: document.querySelectorAll('.oc-lang').length,
      grid: getComputedStyle(document.querySelector('.oc-app')).display === 'flex',
    };
  });
  A('Q1 手机 400px：wrapper contents 透明 + histPanel 隐藏 + 布局保持 flex + chips 就绪',
    q1.mainTransparent && q1.sideTransparent && q1.histHidden && q1.grid && q1.chips >= 1,
    `chips=${q1.chips}`);

  // Q3 滑条（先在手机态设置，复验 reload 持久化）
  await page.evaluate(() => {
    const s = document.getElementById('ocFontSlider');
    s.value = '1.15'; s.dispatchEvent(new Event('input'));
    s.dispatchEvent(new Event('change'));
  });
  await sleep(300);
  const q3 = await page.evaluate(() => ({
    scale: document.documentElement.style.getPropertyValue('--res-font-scale'),
    p: document.getElementById('ocFontSlider').style.getPropertyValue('--p'),
    saved: localStorage.getItem('ocr-res-font-v1'),
  }));
  A('Q3 怠速柄 1.15 → --res-font-scale + --p=67%（(1.15-0.85)/0.45）+ localStorage 落盘',
    q3.scale === '1.15' && q3.p === '67%' && q3.saved === '1.15',
    `scale=${q3.scale} p=${q3.p}`);

  // Q2 平板态
  await page.setViewportSize({ width: 800, height: 900 });
  await sleep(600);
  const q2 = await page.evaluate(() => {
    const app = document.querySelector('.oc-app');
    const hist = document.getElementById('ocHistPanel');
    const emp = document.querySelector('.oc-hist-empty');
    const cs = getComputedStyle(app);
    const cols = cs.gridTemplateColumns.split(' ').map((v) => parseFloat(v));
    return {
      grid: cs.display === 'grid',
      twoCol: cols.length === 2 && Math.abs(cols[1] - 300) < 8,
      histVisible: getComputedStyle(hist).display === 'flex',
      emptyText: emp ? emp.textContent : '',
    };
  });
  A('Q2 平板 800px：grid 两列 1fr/300px + histPanel 可见 + 空态文案',
    q2.grid && q2.twoCol && q2.histVisible && q2.emptyText === '暂无识别历史',
    `cols=${JSON.stringify(q2.twoCol)} empty=${q2.emptyText}`);

  // Q3b reload 复验持久化回填
  await page.reload({ waitUntil: 'load' });
  await sleep(1500);
  const q3b = await page.evaluate(() => {
    const s = document.getElementById('ocFontSlider');
    return { val: parseFloat(s.value), scale: document.documentElement.style.getPropertyValue('--res-font-scale') };
  });
  A('Q3b reload → 滑条回填 1.15 + --res-font-scale 复现（持久化闭环）',
    Math.abs(q3b.val - 1.15) < 0.001 && q3b.scale === '1.15', `val=${q3b.val} scale=${q3b.scale}`);

  // Q4 零 pageerror（fsCall 降级 + 直开无 __system）
  A('Q4 全程零 pageerror（SDK/FS 降级路径不炸）', errors.length === 0, errors.slice(0, 2).join(' | '));
} catch (e) {
  A('e2e 异常中断', false, String(e).slice(0, 200));
} finally {
  await browser.close();
  server.kill();
}
const fails = results.filter((r) => !r[0]).length;
console.log(`\n=== e2e-v181-batch4: ${results.length - fails}/${results.length} ===`);
process.exit(fails ? 1 : 0);
