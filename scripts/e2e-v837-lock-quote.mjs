// ==================== e2e-v837-lock-quote.mjs — #26 锁屏一言无头回归 ====================
//
// DoD（#26 验收原文逐条）：
//   A. 断网状态锁屏诗词正常显示且按日切换（确定性轮换当日条 + route abort 模拟断网）
//   B. 与 #20 表盘样式共存无排版冲突（一言行在时钟下方，boundingBox 不遮挡）
//   C. 在线增强（默认关）→ 开启后 hitokoto 拉取成功渲染（route fulfill mock，零真实网络）
//   D. 缓存当日复用（localStorage ios-desktop:lock-quote-cache）
//   E. 零 pageerror
//
// 驱动：真实加载（默认锁屏在场，?nolock=1 不用）；在线开关走 localStorage 直写 +
// lock-quote-online-changed 事件（UI 绑定由 vitest v837 源码锚定覆盖）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v837');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

console.log('A. 断网基线：默认加载（离线条即时显示，零 fetch 依赖）');
await page.route('**v1.hitokoto.cn**', (route) => route.abort()); // 全程断网 hitokoto
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1200);

const quoteState = () => page.evaluate(() => {
  const clock = document.querySelector('#lockScreen .lock-clock');
  const q = document.querySelector('#lockScreen .lock-quote');
  const text = document.querySelector('#lockScreen .lock-quote-text');
  const src = document.querySelector('#lockScreen .lock-quote-src');
  return {
    locked: document.body.classList.contains('is-locked'),
    hasQuote: !!q,
    text: text ? text.textContent : '',
    src: src ? src.textContent : '',
    afterClock: q && clock ? q.previousElementSibling === clock : false,
    emptyHidden: q ? getComputedStyle(q).display !== 'none' : false,
  };
});

const a = await quoteState();
A('锁屏在场（默认 is-locked）', a.locked);
A('一言行存在且有时钟内容', a.hasQuote && a.text.length > 0, `「${a.text.slice(0, 18)}…」`);
A('紧随时钟下方（previousElementSibling === .lock-clock）', a.afterClock);
A('作者出处小字「——作者《出处》」', /^——.+《.+》$/.test(a.src), a.src);
A('非空行可见（:empty 隐藏规则不误伤）', a.emptyHidden);
await page.screenshot({ path: join(OUT, 'lock-quote-offline.png') });

console.log('B. 排版共存：一言行与无遮挡几何断言');
const geo = await page.evaluate(() => {
  const clock = document.querySelector('#lockScreen .lock-clock').getBoundingClientRect();
  const q = document.querySelector('#lockScreen .lock-quote').getBoundingClientRect();
  return { clockBottom: clock.bottom, quoteTop: q.top, quoteWidth: q.width, vw: innerWidth };
});
A('一言行在时钟下方（quoteTop ≥ clockBottom - 1）', geo.quoteTop >= geo.clockBottom - 1,
  `clock.bottom=${geo.clockBottom.toFixed(0)} quote.top=${geo.quoteTop.toFixed(0)}`);
A('宽度受 max-width 78vw 约束', geo.quoteWidth <= geo.vw * 0.78 + 1,
  `${geo.quoteWidth.toFixed(0)}px ≤ ${(geo.vw * 0.78).toFixed(0)}px`);

console.log('C. 缓存当日复用');
const cached = await page.evaluate(() => {
  const raw = localStorage.getItem('ios-desktop:lock-quote-cache');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
});
A('缓存存在且当日（src=offline）', cached && typeof cached.day === 'string' && cached.src === 'offline',
  cached ? `day=${cached.day}` : 'null');
A('缓存正文 = DOM 显示', cached && cached.q && cached.q.t === a.text);

console.log('D. 在线增强闭环（默认关 → 直写开关 + 事件 → route fulfill mock 响应）');
await page.unroute('**v1.hitokoto.cn**');
await page.route('**v1.hitokoto.cn**', (route) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({
    hitokoto: '山中何事？松花酿酒，春水煎茶。',
    from_who: '张可久',
    from: '人月圆·山中书事',
  }),
}));
await page.evaluate(() => {
  localStorage.removeItem('ios-desktop:lock-quote-cache');
  localStorage.setItem('ios-desktop:lock-quote-online', '1');
  document.dispatchEvent(new CustomEvent('lock-quote-online-changed', { detail: { on: true } }));
});
await sleep(600);
const d = await quoteState();
A('在线一言渲染（mock hitokoto 内容）', d.text === '山中何事？松花酿酒，春水煎茶。', d.text);
A('出处切换为 mock from/from_who', d.src === '——张可久《人月圆·山中书事》', d.src);
const dCache = await page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('ios-desktop:lock-quote-cache')); } catch (e) { return null; }
});
A('在线结果落缓存（src=online 当日复用）', dCache && dCache.src === 'online' && dCache.q.t === d.text);
await page.screenshot({ path: join(OUT, 'lock-quote-online.png') });

console.log('E. 断网回落（在线开着 + route abort → 离线条保持不空窗）');
await page.unroute('**v1.hitokoto.cn**');
await page.route('**v1.hitokoto.cn**', (route) => route.abort());
await page.evaluate(() => {
  localStorage.removeItem('ios-desktop:lock-quote-cache');
  document.dispatchEvent(new CustomEvent('lock-quote-online-changed', { detail: { on: true } }));
});
await sleep(1200); // 等 fetch 超时/拒绝路径走完
const e = await quoteState();
A('离线条回落在场（绝白屏）', e.text.length > 0 && e.text !== '山中何事？松花酿酒，春水煎茶。', `「${e.text.slice(0, 18)}…」`);
const eCache = await page.evaluate(() => {
  try { return JSON.parse(localStorage.getItem('ios-desktop:lock-quote-cache')); } catch (e2) { return null; }
});
A('回落条重写缓存（src=offline）', eCache && eCache.src === 'offline');

console.log('F. 解锁 → 锁屏 → 一言持久（unlock/lock 往返状态不残留）');
await page.evaluate(() => { window.__lockTest && window.__lockTest.instantUnlock(); });
await sleep(400);
await page.evaluate(() => { window.__lockTest && window.__lockTest.instantLock(); });
await sleep(400);
const f = await quoteState();
A('往返后一言仍在（当日缓存复用）', f.locked && f.hasQuote && f.text === e.text);

A('零 pageerror', errors.length === 0, errors.length ? errors[0].slice(0, 120) : '');

console.log(`\n===== e2e-v837: ${pass} pass / ${fail} fail =====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
