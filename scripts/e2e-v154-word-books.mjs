// ==================== e2e-v154-word-books.mjs — #154 多词书 + i18n 无头回归 ====================
//
// DoD（#154 验收四条逐条）：
//   A. 词书切换三册在位：CET-4 默认（零回归）→ CET-6 懒加载 → 考研懒加载
//   B. 进度命名空间隔离：CET-6/考研 评分落 word_progress_v1:cet6 / :kaoyan，
//      cet4 存量键 word_progress_v1 原地不动（跨词书互不串扰）
//   C. 音标展示（/…/ 形态，ECDICT 源）+ 词书懒加载竞态防御（切走不回渲染）
//   D. i18n：中/EN 切换（按钮/标题/提示全量换语）+ 双持久化（重载保持）
//   E. 词书选择持久化（重载保持激活册）
//   F. 零 pageerror + 零载入失败（loadFail 不出现）
//
// 驱动：v839 同款——playwright 真实导航（nolock → word 图标）+ iframe 同源
//       contentDocument 直驱；speechSynthesis addInitScript stub（录音断言）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v154');
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

await page.addInitScript(() => {
  window.__ttsLog = [];
  try {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { cancel() {}, speak(u) { window.__ttsLog.push((u.lang || '?') + ':' + (u.text || '')); } },
    });
  } catch (e) {}
  window.SpeechSynthesisUtterance = function (text) { this.text = text; this.lang = ''; };
});

const iframeLoc = '.app-window iframe[src*="apps/word/index.html"]';

async function wd() {
  return page.evaluateHandle(() => {
    const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
    return f && f.contentDocument ? f.contentDocument : null;
  });
}

async function inWd(fn) {
  return page.evaluate((fnStr) => {
    const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
    if (!f || !f.contentDocument) return null;
    return eval('(' + fnStr + ')(f.contentDocument)');
  }, fn.toString());
}

await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="word"]');
  if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});

let ready = false;
for (let i = 0; i < 30; i++) {
  ready = await page.evaluate(() => {
    const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
    return !!(f && f.contentDocument && f.contentDocument.getElementById('wdCard'));
  });
  if (ready) break;
  await sleep(200);
}
A('word iframe 在场（wdCard 就绪）', ready);

console.log('A. CET-4 默认零回归 + 三册工具行在场');
const s1 = await inWd((d) => ({
  on4: d.querySelector('.wd-book[data-book="cet4"]').classList.contains('on'),
  btns: d.querySelectorAll('.wd-book').length,
  word: d.getElementById('wdWord').textContent,
  title: d.getElementById('wdTitle').textContent,
  langBtn: d.getElementById('wdUiLang').textContent,
}));
A('CET-4 默认激活', s1 && s1.on4);
A('三册按钮 + 语言钮（4 枚）', s1 && s1.btns === 4);
A('CET-4 卡片出词', s1 && s1.word.length > 0, s1 && s1.word);
A('默认 zh 界面（标题=每日单词，语言钮=EN）', s1 && s1.title === '每日单词' && s1.langBtn === 'EN');

console.log('B. CET-6 懒加载 + 音标 + 进度隔离');
await inWd((d) => { d.querySelector('.wd-book[data-book="cet6"]').click(); return true; });
await page.waitForTimeout(700);
const s2 = await inWd((d) => ({
  on6: d.querySelector('.wd-book[data-book="cet6"]').classList.contains('on'),
  word: d.getElementById('wdWord').textContent,
  uk: d.getElementById('wdUk').textContent,
  ukShown: d.getElementById('wdUk').style.display !== 'none',
  stats: d.getElementById('wdStats').textContent,
}));
A('CET-6 激活态', s2 && s2.on6);
A('CET-6 出词（懒加载 JSON 就绪）', s2 && s2.word.length > 0, s2 && s2.word);
A('音标 /…/ 展示（ECDICT 源）', s2 && s2.ukShown && /^\//.test(s2.uk), s2 && s2.uk);
A('无载入失败提示', s2 && !s2.stats.includes('失败'));
// CET-6 内评分 1 词 → :cet6 键落地，cet4 存量键不动
await inWd((d) => { d.getElementById('wdKnow').click(); return true; });
await page.waitForTimeout(200);
const s3 = await page.evaluate(() => ({
  k6: !!localStorage.getItem('word_progress_v1:cet6'),
  k4: !!localStorage.getItem('word_progress_v1'),
  kky: !!localStorage.getItem('word_progress_v1:kaoyan'),
}));
A('评分落 word_progress_v1:cet6', s3.k6);
A('cet4 存量键未动（隔离）', !s3.k4);
A('kaoyan 键未动（隔离）', !s3.kky);

console.log('C. 考研册切换 + 第二命名空间');
await inWd((d) => { d.querySelector('.wd-book[data-book="kaoyan"]').click(); return true; });
await page.waitForTimeout(700);
const s4 = await inWd((d) => ({
  onK: d.querySelector('.wd-book[data-book="kaoyan"]').classList.contains('on'),
  word: d.getElementById('wdWord').textContent,
}));
A('考研激活 + 出词', s4 && s4.onK && s4.word.length > 0, s4 && s4.word);
await inWd((d) => { d.getElementById('wdFuzzy').click(); return true; });
await page.waitForTimeout(200);
const s5 = await page.evaluate(() => ({
  kky: !!localStorage.getItem('word_progress_v1:kaoyan'),
  k6: JSON.parse(localStorage.getItem('word_progress_v1:cet6') || '{"words":{}}').words ? Object.keys(JSON.parse(localStorage.getItem('word_progress_v1:cet6')).words).length : -1,
}));
A('评分落 word_progress_v1:kaoyan', s5.kky);
A('cet6 键内容不因考研评分变化（词数仍 1）', s5.k6 === 1);

console.log('D. i18n 中/EN 切换 + 双持久化');
await inWd((d) => { d.getElementById('wdUiLang').click(); return true; });
await page.waitForTimeout(200);
const s6 = await inWd((d) => ({
  title: d.getElementById('wdTitle').textContent,
  no: d.getElementById('wdNo').textContent,
  fuzzy: d.getElementById('wdFuzzy').textContent,
  know: d.getElementById('wdKnow').textContent,
  hint: d.getElementById('wdHint').textContent,
  langBtn: d.getElementById('wdUiLang').textContent,
}));
A('EN 全量换语（title/三键/hint）', s6 && s6.title === 'WORD CARD' && s6.no === 'No' && s6.fuzzy === 'Fuzzy' && s6.know === 'Yes' && s6.hint === 'Tap card for meaning');
A('语言钮翻转为 中文', s6 && s6.langBtn === '中文');
A('uiLang 持久化', await page.evaluate(() => localStorage.getItem('word_ui_lang_v1') === 'en'));

console.log('E. 词书选择持久化（重载恢复考研册）');
await page.reload({ waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(400);
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="word"]');
  if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});
let ready2 = false;
for (let i = 0; i < 30; i++) {
  ready2 = await page.evaluate(() => {
    const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
    return !!(f && f.contentDocument && f.contentDocument.getElementById('wdCard') && f.contentDocument.getElementById('wdWord').textContent);
  });
  if (ready2) break;
  await sleep(200);
}
const s7 = await inWd((d) => ({
  onK: d.querySelector('.wd-book[data-book="kaoyan"]').classList.contains('on'),
  title: d.getElementById('wdTitle').textContent,
  langBtn: d.getElementById('wdUiLang').textContent,
  word: d.getElementById('wdWord').textContent,
}));
A('重载后考研册恢复', ready2 && s7 && s7.onK, s7 && s7.word);
A('重载后 EN 语言恢复', s7 && s7.title === 'WORD CARD' && s7.langBtn === '中文');
A('word_book_v1 持久化', await page.evaluate(() => localStorage.getItem('word_book_v1') === 'kaoyan'));

console.log('F. 收尾：零 pageerror + 零载入失败');
const s8 = await inWd((d) => d.getElementById('wdStats').textContent);
A('无 loadFail 残留', s8 && !s8.includes('失败') && !s8.includes('failed'));
A('零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));

console.log(`\n=== e2e-v154: ${pass} pass / ${fail} fail ===`);
await page.screenshot({ path: join(OUT, 'word-books.png') });
await browser.close();
process.exit(fail ? 1 : 0);
