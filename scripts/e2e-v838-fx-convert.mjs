// ==================== e2e-v838-fx-convert.mjs — #27 汇率换算页签无头回归 ====================
//
// DoD（#27 验收原文逐条）：
//   A. 断网可用（内置快照 + 日期水印：route abort 双源 → fallbackSnapshot）
//   B. 联网自动更新（route fulfill ER-API 免 key 响应 → 状态行切换 + 缓存写入）
//   C. 换算方向一键互换（swap 后结果互换）
//   D. 常用货币置顶（optgroup「常用」首组 CNY 最前）+ 搜索过滤（code/中文名）
//   E. 小数位规则（≥1000 → 2 位；<1000 → 4 位）
//   F. 零 pageerror
//
// 驱动：真实导航（nolock → calculator 图标）→ converter 页签 → currency 分类；
//       route abort/fulfill 切换须 unroute 再 route（同 pattern 双注册叠加教训）。
//       ⚠ 跨 iframe DOM 操作全部内联在 page.evaluate 内（evaluate 不可捕获外层闭包——
//       WITH_DOC(fn) 序列化后 fn undefined 教训；contentDocument 跨 evaluate 序列化失效）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v838');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

// 浏览器上下文内取 calculator contentDocument 的公共片段（内联展开进每个 evaluate）
const DOC = 'const f = document.querySelector(\'.app-window iframe[src*="calculator"]\');const d = f.contentDocument;';

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

// A. 断网基线：双汇率源全部 abort（快照 + 日期水印验收）
await page.route('**open.er-api.com**', (route) => route.abort());
await page.route('**api.frankfurter.app**', (route) => route.abort());
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(400);
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="calculator"]');
  if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});

// 显式等待 iframe + converter 页签就绪（静态 tab 是页面脚本渲染 cat-chip 的前提信号）
let calcReady = false;
for (let i = 0; i < 30; i++) {
  calcReady = await page.evaluate(() => {
    const f = document.querySelector('.app-window iframe[src*="calculator"]');
    return !!(f && f.contentDocument && f.contentDocument.querySelector('[data-mode="converter"]')
      && f.contentDocument.querySelector('.cat-chip'));
  });
  if (calcReady) break;
  await sleep(200);
}
A('calculator iframe 在场（converter + cat-chip 就绪）', calcReady);

// 切 converter 页签 + currency 分类
await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="calculator"]');
  const d = f.contentDocument;
  d.querySelector('[data-mode="converter"]').click();
  d.querySelector('.cat-chip[data-cat="currency"]').click();
});
await sleep(900);

const a = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="calculator"]');
  const d = f.contentDocument;
  return {
    status: d.getElementById('fx-status-text').textContent,
    out: d.getElementById('conv-input-2').value,
    u1: d.getElementById('conv-unit-1').value,
    u2: d.getElementById('conv-unit-2').value,
    searchVisible: d.getElementById('fx-search').style.display,
    optgroups: Array.from(d.querySelectorAll('#conv-unit-1 optgroup')).map((g) => g.label),
    firstPopularOption: d.querySelector('#conv-unit-1 optgroup option')
      ? d.querySelector('#conv-unit-1 optgroup option').value : '',
    optionCount: d.querySelectorAll('#conv-unit-1 option').length,
  };
});
A('断网回退内置快照 + 日期水印', a.status.includes('内置快照 2026-10-27'), a.status);
A('默认 CNY → USD', a.u1 === 'CNY' && a.u2 === 'USD');
A('快照换算 1 CNY→USD = 0.1401（1/7.14，4 位规则）', a.out === '0.1401', `out=${a.out}`);
A('搜索框显示（currency 分类）', a.searchVisible === 'block');
A('optgroup 常用/全部两组', JSON.stringify(a.optgroups) === JSON.stringify(['常用', '全部货币']), JSON.stringify(a.optgroups));
A('常用组 CNY 置顶最前', a.firstPopularOption === 'CNY');
A('全量 34 币（≥30 验收）', a.optionCount >= 30, `count=${a.optionCount}`);
await page.screenshot({ path: join(OUT, 'fx-offline.png') });

console.log('B. 互换方向');
await page.evaluate(`${DOC}
  d.getElementById('btn-swap-units').click();`);
await sleep(200);
const b = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="calculator"]');
  const d = f.contentDocument;
  return {
    out: d.getElementById('conv-input-2').value,
    u1: d.getElementById('conv-unit-1').value,
    u2: d.getElementById('conv-unit-2').value,
  };
});
A('互换后 USD→CNY = 7.1400', b.u1 === 'USD' && b.u2 === 'CNY' && b.out === '7.1400', `out=${b.out}`);

console.log('C. 小数位规则：1000 USD→CNY ≥1000 → 2 位');
await page.evaluate(`${DOC}
  const inp = d.getElementById('conv-input-1');
  inp.value = '1000';
  inp.dispatchEvent(new Event('input', { bubbles: true }));`);
await sleep(200);
const c = await page.evaluate(`(() => { ${DOC} return d.getElementById('conv-input-2').value; })()`);
A('1000 USD→CNY = 7140.00（2 位规则）', c === '7140.00', `out=${c}`);

console.log('D. 搜索过滤（code 子串 + 中文名）');
const dRes = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="calculator"]');
  const d = f.contentDocument;
  const search = d.getElementById('fx-search');
  const vis = (sel) => Array.from(sel.querySelectorAll('option')).filter((o) => !o.hidden).map((o) => o.value);
  search.value = 'kr';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  const byCode = vis(d.getElementById('conv-unit-1'));
  search.value = '日元';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  const byName = vis(d.getElementById('conv-unit-1'));
  search.value = '';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  const cleared = vis(d.getElementById('conv-unit-1')).length;
  return { byCode, byName, cleared };
});
A('搜索「kr」→ 仅 KRW', JSON.stringify(dRes.byCode) === JSON.stringify(['KRW']), JSON.stringify(dRes.byCode));
A('搜索「日元」→ 仅 JPY', JSON.stringify(dRes.byName) === JSON.stringify(['JPY']), JSON.stringify(dRes.byName));
A('清空搜索恢复全量', dRes.cleared >= 30, `count=${dRes.cleared}`);

console.log('E. 联网自动更新（route fulfill ER-API 免 key mock）');
await page.unroute('**open.er-api.com**');
await page.route('**open.er-api.com**', (route) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ result: 'success', base_code: 'CNY', rates: {
    CNY: 1, USD: 0.140056, EUR: 0.127389, JPY: 21.2766, GBP: 0.108108, KRW: 192.2,
    HKD: 1.09289, TWD: 4.44444, SGD: 0.1845, CHF: 0.11299, CAD: 0.19305, AUD: 0.21368,
  } }),
}));
await page.evaluate(`${DOC}
  localStorage.removeItem('ios-desktop:fx-rates');
  d.getElementById('fx-refresh').click();`);
await sleep(800);
const e = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="calculator"]');
  const d = f.contentDocument;
  let cache = null;
  try { cache = JSON.parse(localStorage.getItem('ios-desktop:fx-rates')); } catch (err) {}
  return {
    status: d.getElementById('fx-status-text').textContent,
    out: d.getElementById('conv-input-2').value,
    u1: d.getElementById('conv-unit-1').value,
    u2: d.getElementById('conv-unit-2').value,
    cacheSrc: cache ? cache.src : null,
  };
});
A('状态行切实时汇率 · ER-API', e.status.includes('实时汇率 · ER-API'), e.status);
A('换算走 mock 新值：1000 USD→CNY = 7140.00', e.u1 === 'USD' && e.u2 === 'CNY' && e.out === '7140.00', `out=${e.out}`);
A('缓存写入 src=ER-API', e.cacheSrc === 'ER-API');
await page.screenshot({ path: join(OUT, 'fx-online.png') });

console.log('F. 1 USD→CNY 实时值复核');
await page.evaluate(`${DOC}
  const inp2 = d.getElementById('conv-input-1');
  inp2.value = '1';
  inp2.dispatchEvent(new Event('input', { bubbles: true }));`);
await sleep(200);
const f2 = await page.evaluate(`(() => { ${DOC} return d.getElementById('conv-input-2').value; })()`);
A('1 USD→CNY = 7.1400（mock 0.140056 倒数 ≈ 7.1400）', f2 === '7.1400', `out=${f2}`);

A('零 pageerror', errors.length === 0, errors.length ? errors[0].slice(0, 120) : '');

console.log(`\n===== e2e-v838: ${pass} pass / ${fail} fail =====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
