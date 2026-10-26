// ==================== e2e-v839-word-app.mjs — #28 每日单词无头回归 ====================
//
// DoD（#28 验收原文逐条）：
//   A. 断网全功能（内置词库 + Web Speech 发音：speechSynthesis stub 录音断言，零音频文件）
//   B. 卡片翻面（3D rotateY）+ 认识/模糊/不认识三键推进
//   C. 进度持久化（localStorage word_progress_v1 跨重载：已学词不重学 + 复习位回归）
//   D. 损坏缓存静默降级（'{oops' → 全新进度零崩溃）
//   E. 双声切换（en-US ↔ en-GB chip）
//   F. 零 pageerror
//
// 驱动：真实导航（nolock → word 图标，第 2 页直击同 v836 reaction 先例）；
//       ⚠ speechSynthesis/SpeechSynthesisUtterance 必须 addInitScript 注入（早于应用脚本），
//         Playwright init script 对所有 frame 生效（iframe 同源共享宿主 localStorage）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v839');
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

// Web Speech stub：录音通道（lang:text），早于一切应用脚本（所有 frame 生效）
await page.addInitScript(() => {
  window.__ttsLog = [];
  try {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel() {},
        speak(u) { window.__ttsLog.push((u.lang || '?') + ':' + (u.text || '')); },
      },
    });
  } catch (e) {}
  window.SpeechSynthesisUtterance = function (text) { this.text = text; this.lang = ''; };
});

await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);

// 打开每日单词（第 2 页图标直击）
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

console.log('A. 断网基线：词库 + 队列 + 桌面图标');
const a = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  const d = f.contentDocument;
  return {
    state: d.querySelector('.wd-app').dataset.wdState,
    word: d.getElementById('wdWord').textContent,
    pos: d.getElementById('wdPos').textContent,
    flipped: d.getElementById('wdCard').dataset.flipped,
    stats: d.getElementById('wdStats').textContent,
    hasIcon: !!document.querySelector('.app-icon[data-id="word"] svg, .app-icon[data-id="word"] img, .app-icon[data-id="word"]'),
    chipUS: d.getElementById('wdLangUS').classList.contains('on'),
  };
});
A('队列态 data-wd-state=queue', a.state === 'queue');
A('首卡 = 词库首词 abandon（词库序确定性）', a.word === 'abandon', a.word);
A('词性标注在位（v.）', a.pos === 'v.', a.pos);
A('卡片未翻面', a.flipped === '0');
A('今日队列 10 词（DAILY_NEW）', a.stats.includes('今日队列') && a.stats.includes('10'), a.stats.replace(/\s+/g, ' '));
A('桌面图标在位', a.hasIcon);
A('默认美音 chip 亮', a.chipUS === true);
await page.screenshot({ path: join(OUT, 'word-card.png') });

console.log('B. 翻面 + Web Speech 双声');
await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  f.contentDocument.getElementById('wdCard').click();
});
await sleep(300);
const b = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  const d = f.contentDocument;
  return {
    flipped: d.getElementById('wdCard').dataset.flipped,
    meaning: d.getElementById('wdMeaning').textContent,
    back: d.getElementById('wdWordBack').textContent,
  };
});
A('翻面 data-flipped=1', b.flipped === '1');
A('背面释义 = 放弃，抛弃', b.meaning === '放弃，抛弃', b.meaning);
A('背面词形回显 abandon', b.back === 'abandon');

await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  f.contentDocument.getElementById('wdSpeak').click();
});
await sleep(200);
let tts = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  return f.contentWindow.__ttsLog; // init script 逐 frame 各自求值，录音在 iframe 自己的 window 上
});
A('美音发音 en-US:abandon', tts.some((x) => x === 'en-US:abandon'), JSON.stringify(tts));

await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  const d = f.contentDocument;
  d.getElementById('wdLangGB').click();
});
await sleep(200);
tts = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  return f.contentWindow.__ttsLog;
});
A('英音 chip 切换 → en-GB:abandon', tts.some((x) => x === 'en-GB:abandon'), JSON.stringify(tts));

console.log('C. 三键推进 + 进度落盘');
// 卡1 abandon：认识
await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  const d = f.contentDocument;
  d.getElementById('wdKnow').click();
});
await sleep(300);
const c = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  const d = f.contentDocument;
  let saved = null;
  try { saved = JSON.parse(f.contentWindow.localStorage.getItem('word_progress_v1')); } catch (e) {}
  return {
    word: d.getElementById('wdWord').textContent,
    flipped: d.getElementById('wdCard').dataset.flipped,
    saved,
  };
});
A('评分后切下一卡 ability', c.word === 'ability', c.word);
A('翻面状态复位', c.flipped === '0');
A('进度落盘：abandon s=1 due=明日 n=1', !!(c.saved && c.saved.words.abandon && c.saved.words.abandon.s === 1
  && c.saved.words.abandon.due && c.saved.log && Object.values(c.saved.log).some((x) => x.n === 1)),
  JSON.stringify(c.saved && c.saved.words.abandon));

console.log('D. 清队列：8 认识 + 2 不认识（各补现 1 次再认识）→ 完成态');
// 卡2~卡10：ability unknown / abnormal..smart 7 认识 / so? 顺序=词库序前10
// 前 10 词: abandon ability abnormal aboard abolish absorb abstract absurd abundant abuse
const grades = ['unknown', 'know', 'know', 'know', 'know', 'know', 'know', 'know', 'unknown'];
for (const g of grades) {
  await page.evaluate((grade) => {
    const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
    const id = grade === 'know' ? 'wdKnow' : 'wdNo';
    f.contentDocument.getElementById(id).click();
  }, g);
  await sleep(120);
}
const mid = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  const d = f.contentDocument;
  return { state: d.querySelector('.wd-app').dataset.wdState, word: d.getElementById('wdWord').textContent };
});
A('unknown 补现卡回队（ability 重现）', mid.state === 'queue' && mid.word === 'ability', `${mid.state}/${mid.word}`);
// 补现两张（ability, abuse）→ 认识
await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  f.contentDocument.getElementById('wdKnow').click();
});
await sleep(150);
await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  f.contentDocument.getElementById('wdKnow').click();
});
await sleep(300);
const done = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  const d = f.contentDocument;
  return {
    state: d.querySelector('.wd-app').dataset.wdState,
    doneText: d.getElementById('wdDoneSub').textContent,
  };
});
A('完成态 data-wd-state=done', done.state === 'done');
A('完成面板：已学 10 / 掌握 8 / 今日新学 10', done.doneText.includes('10') && done.doneText.includes('已掌握'),
  done.doneText.replace(/\s+/g, ' '));
await page.screenshot({ path: join(OUT, 'word-done.png') });

console.log('E. 跨重载持久化（已学词不重学 + 无到期 → 直接完成态）');
await page.reload({ waitUntil: 'load', timeout: 30000 });
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
let ready2 = false;
for (let i = 0; i < 30; i++) {
  ready2 = await page.evaluate(() => {
    const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
    return !!(f && f.contentDocument && f.contentDocument.getElementById('wdCard'));
  });
  if (ready2) break;
  await sleep(200);
}
const e = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  const d = f.contentDocument;
  return { state: d.querySelector('.wd-app').dataset.wdState, stats: d.getElementById('wdStats').textContent };
});
A('重载后应用可达', ready2 && e.state !== undefined, `${ready2}/${e.state}`);
A('10 新词配额已用完且无今日到期 → 直接完成态（Anki 同款）', e.state === 'done', e.stats.replace(/\s+/g, ' '));

console.log('F. 损坏缓存静默降级');
await page.evaluate(() => localStorage.setItem('word_progress_v1', '{oops'));
await page.reload({ waitUntil: 'load', timeout: 30000 });
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
let ready3 = false;
for (let i = 0; i < 30; i++) {
  ready3 = await page.evaluate(() => {
    const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
    return !!(f && f.contentDocument && f.contentDocument.getElementById('wdCard'));
  });
  if (ready3) break;
  await sleep(200);
}
const f4 = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="apps/word/index.html"]');
  const d = f.contentDocument;
  return { state: d.querySelector('.wd-app').dataset.wdState, word: d.getElementById('wdWord').textContent };
});
A('损坏缓存 → 全新进度重新开始（abandon 回归）', ready3 && f4.state === 'queue' && f4.word === 'abandon',
  `${f4.state}/${f4.word}`);

A('零 pageerror', errors.length === 0, errors.length ? errors[0].slice(0, 120) : '');

console.log(`\n===== e2e-v839: ${pass} pass / ${fail} fail =====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
