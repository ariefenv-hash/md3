// ==================== e2e-v836-reaction.mjs — #29 反应力测试无头回归 ====================
//
// DoD（#29 验收原文）：
//   A. idle 形态：开始按钮 + 历史最佳 chips（空数据显示 —）
//   B. 防作弊：等待期误触判负并提示；幽灵变色被阻断（判负后延时无 ready 翻转）
//   C. rxdelay 确定性 5 轮：等待→变色→计时→result→summary（min/avg/max 三卡 + 近 5 次记录）
//      + localStorage reaction_stats_v1（attempts=5 + bestAvg + bestSingle）
//   D. 持久化跨重载：历史最佳 chips 从 — 变数值
//   E. 中途关窗无状态残留：waiting 期直接重载 iframe → 回来是全新 idle
//   F. 零 pageerror
//
// 驱动：真实导航（nolock → reaction 图标，第 2 页直击同 v766 game2048 先例）；
//       计时确定性走页面文档化的 ?rxdelay= 测试缝（默认随机 1~7s 不受影响）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v836');
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

await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);

// 打开反应力测试（第 2 页图标直击）
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="reaction"]');
  if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});
await sleep(1800);

const iframeOf = () => page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="reaction"]');
  return f && f.contentDocument ? { found: true } : { found: false };
});

console.log('A. idle 形态');
const a = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="reaction"]');
  if (!f || !f.contentDocument) return { found: false };
  const doc = f.contentDocument;
  const stage = doc.getElementById('stage');
  return {
    found: true,
    state: stage ? stage.getAttribute('data-state') : null,
    hasStart: !!doc.getElementById('rx-start'),
    hasBestChips: (stage && stage.textContent || '').includes('历史最佳单次'),
    bestEmpty: (stage && stage.textContent || '').includes('—'),
    hasAppIcon: !!document.querySelector('.app-icon[data-id="reaction"] svg, .app-icon[data-id="reaction"] img, .app-icon[data-id="reaction"]'),
  };
});
A('A1 应用打开且 iframe 文档可达', a.found);
A('A2 idle 态 data-state=idle', a.state === 'idle');
A('A3 开始按钮在位', a.hasStart === true);
A('A4 历史最佳 chips 在位且空态为 —', a.hasBestChips && a.bestEmpty);
await page.screenshot({ path: join(OUT, 'a-idle.png') });

const stageDown = () => page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="reaction"]');
  const stage = f.contentDocument.getElementById('stage');
  stage.dispatchEvent(new f.contentWindow.PointerEvent('pointerdown', { bubbles: true }));
});
const rxState = () => page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="reaction"]');
  return f.contentDocument.getElementById('stage').getAttribute('data-state');
});
const rxText = () => page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="reaction"]');
  return f.contentDocument.getElementById('stage').textContent;
});

console.log('B. 防作弊犯规 + 幽灵变色阻断');
await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="reaction"]');
  f.contentWindow.__rx.startRound();
});
await sleep(120);
A('B1 进入 waiting 态', (await rxState()) === 'waiting');
await stageDown(); // 等待期误触
await sleep(80);
A('B2 判负进入 foul 态并提示', (await rxState()) === 'foul' && (await rxText()).includes('犯规'));
await sleep(500);
A('B3 幽灵变色被阻断（判负 500ms 后仍非 ready）', (await rxState()) !== 'ready');
await page.screenshot({ path: join(OUT, 'b-foul.png') });
await stageDown(); // foul → idle
A('B4 犯规后点击回 idle', (await rxState()) === 'idle');

console.log('C. rxdelay=220 确定性 5 轮闭环');
// 重载 iframe 走测试缝
await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="reaction"]');
  f.src = f.src.replace(/([?&])rxdelay=\d+/, '') + (f.src.includes('?') ? '&' : '?') + 'rxdelay=220';
});
await sleep(1500);
const waitReady = async () => {
  for (let i = 0; i < 40; i++) {
    if ((await rxState()) === 'ready') return true;
    await sleep(50);
  }
  return false;
};
let allOk = true;
for (let r = 1; r <= 5; r++) {
  await page.evaluate(() => {
    const f = document.querySelector('.app-window iframe[src*="reaction"]');
    f.contentWindow.__rx.startRound();
  });
  const ready = await waitReady();
  const st1 = await rxState();
  await stageDown(); // ready → result（真实 pointer 事件路径）
  await sleep(60);
  const st2 = await rxState();
  const ok = ready && st1 === 'ready' && st2 === 'result';
  if (!ok) allOk = false;
  await stageDown(); // result → 下一轮 / 第 5 轮 → summary
  await sleep(60);
}
const c = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="reaction"]');
  const doc = f.contentDocument;
  const stage = doc.getElementById('stage');
  const txt = stage.textContent;
  let ls = null;
  try { ls = JSON.parse(f.contentWindow.localStorage.getItem('reaction_stats_v1')); } catch (e) { ls = null; }
  return {
    state: stage.getAttribute('data-state'),
    hasSummary: txt.includes('五轮完成') && txt.includes('最快') && txt.includes('均值') && txt.includes('最慢'),
    hasHistory: txt.includes('近 5 次记录'),
    barCount: doc.querySelectorAll('.rx-bar').length,
    attempts: ls ? ls.attempts.length : -1,
    bestAvg: ls ? ls.bestAvg : null,
    bestSingle: ls ? ls.bestSingle : null,
    gradesOk: ls ? ls.attempts.every((x) => typeof x.ms === 'number' && x.ms > 0) : false,
  };
});
A('C1 五轮全部走通（waiting→ready→result ×5）', allOk);
A('C2 第 5 轮后进入 summary（最快/均值/最慢三卡）', c.state === 'summary' && c.hasSummary);
A('C3 近 5 次记录迷你柱图渲染', c.hasHistory && c.barCount === 5);
A('C4 localStorage reaction_stats_v1：attempts=5 且全为正数', c.attempts === 5 && c.gradesOk);
A('C5 bestAvg 与 bestSingle 均已落库', typeof c.bestAvg === 'number' && typeof c.bestSingle === 'number');
await page.screenshot({ path: join(OUT, 'c-summary.png') });

console.log('D. 持久化跨重载');
await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="reaction"]');
  f.src = '/ios-desktop/apps/reaction/index.html';
});
await sleep(1500);
const d = await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="reaction"]');
  const stage = f.contentDocument.getElementById('stage');
  return { state: stage.getAttribute('data-state'), txt: stage.textContent };
});
A('D1 重载后 idle 且历史最佳显示数值（非 —）', d.state === 'idle' && d.txt.includes('历史最佳单次') && !d.txt.includes('—'));

console.log('E. 中途关窗无状态残留');
await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="reaction"]');
  f.contentWindow.__rx.startRound();
});
await sleep(150);
A('E1 waiting 期直接关窗（重载 iframe）', (await rxState()) === 'waiting');
await page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="reaction"]');
  f.src = '/ios-desktop/apps/reaction/index.html?rxdelay=220';
});
await sleep(1500);
const e = await rxState();
A('E2 重载后全新 idle（无 waiting/ready 残留）', e === 'idle');

console.log('F. 零 pageerror');
A('F1 全程零 pageerror', errors.length === 0, errors.length ? errors[0].slice(0, 120) : '');

await browser.close();
console.log(`\n==== e2e-v836: ${pass} PASS / ${fail} FAIL ====`);
process.exit(fail ? 1 : 0);
