// ==================== e2e-v834-support.mjs — #22⑪ support 收官裁决无头回归 ====================
//
// DoD：
//   A. 一级菜单 support 行不渲染（UNSUPPorted_ON_DEVICE 门控隐藏，hidden:true）
//   B. 其余一级行照常渲染（accounts 转正行在位——负断言的对照面）
//   C. 零 pageerror
//
// 驱动：真实导航（解锁 → settings 图标）。420px 窄栏栈语义（v8.31 F1-F3 门控负断言同款）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v834');
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

// ---------- A/B. 一级菜单门控负断言 ----------
console.log('A/B. 一级菜单 support 行不渲染 + 对照行照常渲染');
const m = await page.evaluate(() => ({
  support: !!document.querySelector('.tp-row[data-tp-key="support"]'),
  accounts: !!document.querySelector('.tp-row[data-tp-key="accounts"]'),
  system: !!document.querySelector('.tp-row[data-tp-key="system"]'),
  about: !!document.querySelector('.tp-row[data-tp-key="about"]'),
  supportText: [...document.querySelectorAll('.tp-row')].some((r) => r.textContent.includes('提示和支持')),
}));
A('A1 support 行不渲染（UNSUPPorted_ON_DEVICE 门控隐藏）', !m.support);
A('A2 「提示和支持」全文零渲染（hidden:true 不进 DOM）', !m.supportText);
A('B1 对照：accounts 转正行在位（v8.33）', m.accounts);
A('B2 对照：system 行在位', m.system);
A('B3 对照：about 行在位', m.about);
await page.screenshot({ path: join(OUT, 'a-top-level-no-support.png') });

// ---------- C. 零 pageerror ----------
A('C1 零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n==== e2e-v834: ${pass} PASS / ${fail} FAIL ====`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
