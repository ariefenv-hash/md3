// v9.05 = #124 画圆挑战（R39 轮）无头回归小判据：
// ①iframe 应用挂载（core + 只读桥）②真实鼠标轨迹画圆出分（高分带）③三指标面板与最佳分留存
// ④刷新后最高分持久 + 重置归零 ⑤K 零 pageerror 全程
// 范式同 e2e-v123：dev 服务器（E2E_BASE 可覆写，默认 8080）——源码态模块真实存在，
// 页面内动态 import 可用（dist 为 bundle 化产物，源路径 404，R39 坑③）。两跑收敛。
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const SHOT = new URL('../docs/v905/drawcircle-app.png', import.meta.url).pathname;
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

// 打开画圆挑战
await page.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  const idx = initialApps.findIndex(a => a.id === 'drawcircle');
  openApp(idx);
});
await sleep(1800);

const dframe = () => page.frames().find(f => f.url().includes('apps/drawcircle/index.html'));
t('P1 iframe 应用挂载（frame 在册 + core/桥 载入）', !!dframe() && await dframe().evaluate(() => !!window.__drawCircleCore && !!window.__drawCircleUI));

// A. 真实鼠标轨迹画圆（参数圆 + 确定性微扰，零随机可复现）
async function drawCircle(frame, page_, cx, cy, R, wobble) {
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const rr = R * (1 + wobble * Math.sin(5 * a));
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  await page_.mouse.move(pts[0][0], pts[0][1]);
  await page_.mouse.down();
  for (let i = 1; i < pts.length; i++) { await page_.mouse.move(pts[i][0], pts[i][1]); await sleep(6); }
  await page_.mouse.up();
  await sleep(400);
}
const box = await dframe().evaluate(() => { const b = document.getElementById('cv').getBoundingClientRect(); return { w: b.width, h: b.height }; });
// iframe 内坐标 → 页面坐标：取 iframe 元素在主页面的偏移
const iframeEl = await page.evaluateHandle(() => document.querySelector('.app-window iframe'));
const iframeBox = await iframeEl.asElement().boundingBox();
const ox = iframeBox ? iframeBox.x : 0, oy = iframeBox ? iframeBox.y : 0;
const CX = ox + box.w / 2, CY = oy + Math.min(box.h / 2, (box.h / 2) + oy * 0) + Math.min(200, box.h * 0.38);

await drawCircle(dframe(), page, CX, CY, Math.min(120, box.w * 0.3), 0.012);
let res = await dframe().evaluate(() => window.__drawCircleUI.last);
t('A1 画圆出分（结果对象在册）', !!res && typeof res.score === 'number', res ? `score=${res.score}` : '');
t('A2 高分带（参数圆 ≥ 90）', !!res && res.score >= 90, res ? `score=${res.score}` : '');
t('A3 三指标齐备且在 [0,1]', !!res && [res.roundness, res.closure, res.overlap].every(v => v >= 0 && v <= 1));
t('A4 分级在册', !!res && ['人形圆规', '宗师级', '熟练', '入门', '灵魂画手'].includes(await dframe().evaluate(() => window.__drawCircleUI.grade())));
t('A5 最佳分同步（首画即纪录）', await dframe().evaluate(() => window.__drawCircleUI.best) === res.score);

// B. 成绩面板可见 + 最佳 chip 文案
t('B1 成绩面板展开', await dframe().evaluate(() => document.getElementById('panel').classList.contains('show')));
t('B2 最佳 chip 含分数', (await dframe().evaluate(() => document.getElementById('chipBest').textContent)).includes('最佳'));

// C. 刷新持久化（iframe 重载后 best 仍在）
await page.reload({ waitUntil: 'load' });
await sleep(2500);
await page.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  openApp(initialApps.findIndex(a => a.id === 'drawcircle'));
});
await sleep(1800);
const bestAfter = await dframe().evaluate(() => window.__drawCircleUI.best);
t('C1 刷新后最高分持久', Math.abs(bestAfter - res.score) < 0.001, `best=${bestAfter}`);

// D. 重置归零
await dframe().evaluate(() => document.getElementById('chipReset').click());
await sleep(300);
t('D1 重置后最佳归零', (await dframe().evaluate(() => window.__drawCircleUI.best)) === 0);

// K. 全程零 pageerror
t('K1 零 pageerror 全程', errors.length === 0, errors[0] || '');

// 截图留痕
try {
  mkdirSync(new URL('../docs/v905/', import.meta.url).pathname, { recursive: true });
  await page.screenshot({ path: SHOT });
} catch (e) { /* 截图失败不判失败 */ }

await browser.close();
console.log(`\n${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
