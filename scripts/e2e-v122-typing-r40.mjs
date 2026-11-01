// v9.06 = #122 打字练习一期（R40 轮）无头回归小判据：
// ①iframe 应用挂载（core + 只读桥 + word 词库直载）②真实键盘逐字输入出成绩（WPM/准确率/进度）
// ③错字高亮与准确率下探 ④成绩面板与最佳分留存（刷新持久 + 重置归零）⑤K 零 pageerror 全程
// 范式同 e2e-v123/v124：dev 服务器（E2E_BASE 可覆写，默认 8080）。两跑收敛。
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const SHOT = new URL('../docs/v906/typing-app.png', import.meta.url).pathname;
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
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

// 打开打字练习
await page.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  openApp(initialApps.findIndex(a => a.id === 'typing'));
});
await sleep(1800);

const tframe = () => page.frames().find(f => f.url().includes('apps/typing/index.html'));
t('P1 iframe 应用挂载（frame 在册 + core/桥/词库 载入）', !!tframe() && await tframe().evaluate(() =>
  !!window.__typingCore && !!window.__typingUI && !!(window.__wordCore && window.__wordCore.WORD_BANK.length > 500)));

// A. 真实键盘输入（读桥上题面 → 逐字敲入；默认单词模式 = 12 个 CET-4 词）
const target = await tframe().evaluate(() => window.__typingUI.target);
t('P2 题面就绪（单词模式 12 词）', typeof target === 'string' && target.trim().split(/\s+/).length === 12,
  `len=${target.length}`);
await tframe().evaluate(() => document.getElementById('drill').dispatchEvent(new PointerEvent('pointerdown')));
await sleep(120);
await page.keyboard.type(target, { delay: 12 });
await sleep(500);
let last = await tframe().evaluate(() => window.__typingUI.last);
t('A1 打满出成绩（面板数据在册）', !!last && typeof last.wpm === 'number', last ? `wpm=${last.wpm}` : '');
t('A2 完美输入准确率 100%', !!last && last.acc === 100, last ? `acc=${last.acc}` : '');
t('A3 净 WPM > 0（成绩面板）', !!last && last.wpm > 0);
t('A4 分级在册（四档枚举）', !!last && ['键指如飞', '熟练', '入门', '新手'].includes(last.grade), last ? last.grade : '');
t('A5 最佳分同步（首打即纪录）', await tframe().evaluate(() => window.__typingUI.best) === last.wpm);

// B. 成绩面板可见 + 关闭后错字路径（s-bad 高亮 + 准确率下探）
t('B1 成绩面板展开', await tframe().evaluate(() => document.getElementById('panel').classList.contains('show')));
await tframe().evaluate(() => { document.getElementById('closeBtn').click(); document.getElementById('nextBtn').click(); });
await sleep(200);
const target2 = await tframe().evaluate(() => window.__typingUI.target);
// 溢出打段：前 len-2 位照抄 + 'ZZZ'（恒越尾 1 位 → extra 多打段 + 尾部 bad + 打满出面板）
await tframe().evaluate((tt) => window.__typingUI.setTyped(tt.slice(0, tt.length - 2) + 'ZZZ'), target2);
await sleep(200);
const st2 = await tframe().evaluate(() => window.__typingUI.stats());
t('B2 错字准确率下探（<100）', st2.acc < 100, `acc=${st2.acc}`);
t('B3 题面存在 s-bad 高亮段', await tframe().evaluate(() => !!document.querySelector('#drill .s-bad')));
t('B4 extra 多打段在册', await tframe().evaluate(() => !!document.querySelector('#drill .s-extra')));

// C. 刷新持久化（重开应用后 best 仍在）
const bestBefore = await tframe().evaluate(() => window.__typingUI.best);
await page.reload({ waitUntil: 'load' });
await sleep(2500);
await page.evaluate(async () => {
  const { initialApps } = await import('/ios-desktop/js/apps-data.js');
  const { openApp } = await import('/ios-desktop/js/app-window.js');
  openApp(initialApps.findIndex(a => a.id === 'typing'));
});
await sleep(1800);
const bestAfter = await tframe().evaluate(() => window.__typingUI.best);
t('C1 刷新后最佳分持久', Math.abs(bestAfter - bestBefore) < 0.001, `best=${bestAfter}`);

// D. 重置归零
await tframe().evaluate(() => document.getElementById('chipReset').click());
await sleep(300);
t('D1 重置后最佳归零', (await tframe().evaluate(() => window.__typingUI.best)) === 0);

// K. 全程零 pageerror
t('K1 零 pageerror 全程', errors.length === 0, errors[0] || '');

// 截图留痕
try {
  mkdirSync(new URL('../docs/v906/', import.meta.url).pathname, { recursive: true });
  await page.screenshot({ path: SHOT });
} catch (e) { /* 截图失败不判失败 */ }

await browser.close();
console.log(`\n${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
