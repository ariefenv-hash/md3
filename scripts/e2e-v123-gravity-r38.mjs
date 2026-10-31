// v9.03 = #123 重力沙盒（R38 轮）无头回归小判据：
// ①iframe 应用启动（binary 预设 2 体在轨）②物理运转（1.5s 后位置漂移）③预设切换三体/太阳系
// ④清空 + 空白拖拽发射 ⑤暂停/恢复 ⑥K 零 pageerror 全程
import { chromium } from 'playwright';
const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

// 打开重力沙盒
await page.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  const idx = initialApps.findIndex(a => a.id === 'gravity');
  openApp(idx);
});
await sleep(1800);

const gframe = () => page.frames().find(f => f.url().includes('apps/gravity/index.html'));
t('P1 iframe 应用挂载（frame 在册 + core.js 载入）', !!gframe() && await gframe().evaluate(() => !!window.__gravityCore && !!window.__gravityUI));

// A. binary 预设默认在轨
let stats = await gframe().evaluate(() => window.__gravityUI.stats());
t('A1 默认双星预设 2 体', stats.n === 2, `n=${stats.n}`);
const pos0 = await gframe().evaluate(() => window.__gravityUI.getBodies().map(b => [b.x, b.y]));
await sleep(1500);
const pos1 = await gframe().evaluate(() => window.__gravityUI.getBodies().map(b => [b.x, b.y]));
const moved = pos0.some((p, i) => Math.hypot(p[0] - pos1[i][0], p[1] - pos1[i][1]) > 5);
t('A2 物理运转（1.5s 位置漂移）', moved);
stats = await gframe().evaluate(() => window.__gravityUI.stats());
t('A3 轨道束缚（仍 2 体，未逃逸未合并）', stats.n === 2, `n=${stats.n} merges=${stats.merges}`);

// B. 预设切换
await gframe().evaluate(() => { document.querySelector('[data-preset="three"]').click(); });
await sleep(300);
t('B1 三体预设 3 体（8 字解）', (await gframe().evaluate(() => window.__gravityUI.stats().n)) === 3);
await gframe().evaluate(() => { document.querySelector('[data-preset="solar"]').click(); });
await sleep(300);
t('B2 太阳系预设 5 体', (await gframe().evaluate(() => window.__gravityUI.stats().n)) === 5);
await gframe().evaluate(() => { document.querySelector('[data-preset="binary"]').click(); });
await sleep(300);

// C. 拖拽发射（空白处拖出 → 新天体带初速）
await gframe().evaluate(() => { document.getElementById('btnClear').click(); });
await sleep(200);
t('C1 清空 0 体', (await gframe().evaluate(() => window.__gravityUI.stats().n)) === 0);
const box = await page.evaluate(() => {
  const win = document.querySelector('.app-window:not([style*="display: none"])');
  const r = win.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
// iframe 内坐标 = 窗口矩形内；拖拽起点取窗体中下部空白
const sx = box.x + box.w * 0.4, sy = box.y + box.h * 0.7;
await page.mouse.move(sx, sy);
await page.mouse.down();
await page.mouse.move(sx + 90, sy - 60, { steps: 8 });
await page.mouse.up();
await sleep(300);
stats = await gframe().evaluate(() => window.__gravityUI.stats());
t('C2 拖拽发射 1 体', stats.n === 1, `n=${stats.n}`);
const vel = await gframe().evaluate(() => {
  const b = window.__gravityUI.getBodies()[0];
  return { vx: b.vx, vy: b.vy };
});
t('C3 初速向量非零（拖向决定初速）', Math.hypot(vel.vx, vel.vy) > 20, `v=${Math.hypot(vel.vx, vel.vy).toFixed(0)}`);
await sleep(1200);
t('C4 发射天体在运动（1.2s 后位移）', await gframe().evaluate(() => {
  const b = window.__gravityUI.getBodies()[0];
  return Math.hypot(b.vx, b.vy) > 1; // 仍带速度（自由飞）
}));

// D. 暂停/恢复
await gframe().evaluate(() => { document.getElementById('btnPause').click(); });
t('D1 暂停态在册', await gframe().evaluate(() => window.__gravityUI.isPaused()) === true);
await gframe().evaluate(() => { document.getElementById('btnPause').click(); });
t('D2 恢复运行', await gframe().evaluate(() => window.__gravityUI.isPaused()) === false);

// 截图留痕
await gframe().evaluate(() => { document.querySelector('[data-preset="three"]').click(); });
await sleep(1200);
await page.screenshot({ path: 'docs/v902/gravity-app.png' });

// K. 零 pageerror 全程
t('K1 全程零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log(`\n${pass}/${pass + fail} PASS`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
