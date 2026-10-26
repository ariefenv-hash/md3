// ==================== e2e-v830-modes.mjs — #22③ 模式页无头回归 ====================
//
// DoD：
//   A. 页 27 = modes_list_settings.xml 3 keys 1:1：标题「模式」+ TopIntro 权威文案 +
//      勿扰行（Manual DND 恒在首位）+ add_mode 行
//   B. 勿扰摘要默认「已停用」（__qsTileState.get('modes') 真源桥，QS 出厂勿扰关）
//   C. add_mode 点击 → 系统 toast（ZenModeNewCustomFragment 向导 Web 等价）
//   D. 勿扰行点击 → 页 9「多模式」（#appTitle 切栈顶页标题证据）
//   E. 零 pageerror
//
// 驱动：真实导航（解锁 → settings 图标 → tp-row modes）。420px 窄栏栈语义。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v830');
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
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);
await page.evaluate(() => window.__themeModeTest.set('dark'));
await sleep(200);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1100);

// ---------- A. 页 27 主形态 ----------
console.log('A. 页 27 主形态（modes_list_settings 3 keys 1:1）');
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="modes"]').click());
await sleep(900);
const p27 = await page.evaluate(() => {
  const page27 = [...document.querySelectorAll('.app-page')].find((p) => p.querySelector('#modesDndSummary'));
  return {
    title: document.getElementById('appTitle').textContent,
    intro: page27 ? page27.textContent.includes('利用适合睡眠、工作、驾车等场景的各种模式，减少干扰、保持专注。') : false,
    dndRow: page27 ? !![...page27.querySelectorAll('.md3-list-item')].find((x) => x.textContent.includes('勿扰')) : false,
    dndSummary: document.getElementById('modesDndSummary') ? document.getElementById('modesDndSummary').textContent : '',
    addRow: page27 ? !![...page27.querySelectorAll('.md3-list-item')].find((x) => x.textContent.includes('创建您的专属模式')) : false,
  };
});
A('A1 页 27 打开（#appTitle=模式）', p27.title === '模式', `title=${p27.title}`);
A('A2 TopIntro 权威文案逐字', p27.intro);
A('A3 勿扰行在位（Manual DND 恒在首位）', p27.dndRow);
A('A4 勿扰摘要默认「已停用」（出厂勿扰关）', p27.dndSummary === '已停用', p27.dndSummary);
A('A5 add_mode 行「创建您的专属模式」在位', p27.addRow);
await page.screenshot({ path: join(OUT, 'a-modes-main.png') });

// ---------- C. add_mode → toast ----------
console.log('C. add_mode 点击 → 系统 toast');
const oldToast = await page.evaluate(() => { const t = document.getElementById('systemGlobalToast'); if (t) t.remove(); return true; });
await page.evaluate(() => {
  const page27 = [...document.querySelectorAll('.app-page')].find((p) => p.querySelector('#modesDndSummary'));
  const r = [...page27.querySelectorAll('.md3-list-item')].find((x) => x.textContent.includes('创建您的专属模式'));
  if (r) r.click();
});
await sleep(500);
const pToast = await page.evaluate(() => {
  const t = document.getElementById('systemGlobalToast');
  return t ? t.textContent : '';
});
A('C1 toast 弹出且文案正确', oldToast && pToast.includes('模式模板选择向导后续版本转正'), pToast);

// ---------- D. 勿扰行 → 页 8 ----------
console.log('D. 勿扰行点击 → 页 9「多模式」');
await page.evaluate(() => {
  const page27 = [...document.querySelectorAll('.app-page')].find((p) => p.querySelector('#modesDndSummary'));
  const r = [...page27.querySelectorAll('.md3-list-item')].find((x) => x.textContent.includes('勿扰'));
  if (r) r.click();
});
await sleep(900);
const p8 = await page.evaluate(() => ({
  title: document.getElementById('appTitle').textContent,
  multiMode: document.body.textContent.includes('为「个人」与「工作」分别记忆一套完整场景'),
}));
A('D1 勿扰行跳转页 9（#appTitle=多模式 + 场景系统文案在位）', p8.title === '多模式' && p8.multiMode, `title=${p8.title}`);

// ---------- E. 回页 27 后摘要仍正确（eventBus 刷新链） ----------
console.log('E. 返回页 27 摘要 eventBus 刷新');
await page.evaluate(() => window.popSubPage()); // 页 9 → 页 27（栈 [0,27]）
await sleep(900);
const p27b = await page.evaluate(() => ({
  title: document.getElementById('appTitle').textContent,
  dndSummary: document.getElementById('modesDndSummary') ? document.getElementById('modesDndSummary').textContent : '',
}));
A('E1 返回页 27 摘要仍正确（eventBus pageIdx 27 → refresh）',
  p27b.title === '模式' && p27b.dndSummary === '已停用', `title=${p27b.title} summary=${p27b.dndSummary}`);

A('Z1 零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n==== e2e-v830: ${pass} PASS / ${fail} FAIL ====`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
