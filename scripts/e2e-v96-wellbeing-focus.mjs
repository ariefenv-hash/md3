// e2e-v96-wellbeing-focus.mjs — v10.27 #96 三期 应用计时器 + 专注模式 E2E 核验
// ① 页 36 三期双卡权威结构：专注模式卡（开关 + 应用 chips）+ 应用计时器卡（行 + 档位钮）
// ② 专注模式链：chip 勾选 → 开关开 → 真实点击被暂停应用图标 → toast「已暂停（专注模式）」+ 零开窗（defer 埋点零会话）
// ③ 零误伤：开关关后同应用正常打开（defer 埋点在途会话在位）
// ④ 计时器链：档位钮设限 + seed 超限 → 行「已暂停（到限）」标签 + 真实点击拦截 + 未超限行「剩余」展示
// ⑤ 零 pageerror + 截图落盘 docs/v96/
//
// 用法：MD3_BASE=http://127.0.0.1:8080/ios-desktop/index.html?nolock=1 node scripts/e2e-v96-wellbeing-focus.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/md3-repo/docs/v96';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, cond, detail = '') => {
  log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
let pageErrors = 0;
page.on('pageerror', (e) => { pageErrors++; log('[pageerror]', e.message.slice(0, 200)); });

await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await sleep(2500);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(1200);

// ① 打开设置 → 数字健康页 36
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(2000);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="wellbeing"]').click());
await sleep(1500);

const focusCard = await page.evaluate(() => !!document.querySelector('[data-test="wellbeing-focus-card"]'));
const focusSwitch = await page.evaluate(() => !!document.getElementById('wellbeingFocusSwitch'));
const timersCard = await page.evaluate(() => !!document.querySelector('[data-test="wellbeing-timers-card"]'));
const chipCount = await page.evaluate(() => document.querySelectorAll('[data-test="wellbeing-focus-chip"]').length);
check('专注模式卡 + 开关在场', focusCard && focusSwitch);
check('应用计时器卡在场', timersCard);
check('专注 chips 渲染（桌面应用清单）', chipCount > 5, `chips=${chipCount}`);
await page.screenshot({ path: `${OUT}/wb-focus-empty.png` });

// ② 专注模式链：勾选 clock_app chip → 开关开
const chipPressed = await page.evaluate(() => {
  const chip = document.querySelector('[data-test="wellbeing-focus-chip"][data-app="clock_app"]');
  if (!chip) return 'MISSING';
  chip.click();
  return chip.getAttribute('aria-pressed');
});
await sleep(300);
const chipPressedAfter = await page.evaluate(() => {
  const chip = document.querySelector('[data-test="wellbeing-focus-chip"][data-app="clock_app"]');
  return chip ? chip.getAttribute('aria-pressed') : 'MISSING';
});
const focusList = await page.evaluate(() => window.__wellbeingStore && window.__wellbeingStore.focusApps());
check('chip 点击切换清单成员（aria-pressed false→true + store 持久化）',
  chipPressed === 'false' && chipPressedAfter === 'true' && Array.isArray(focusList) && focusList.indexOf('clock_app') !== -1,
  `before=${chipPressed} after=${chipPressedAfter} list=${JSON.stringify(focusList)}`);

await page.evaluate(() => document.getElementById('wellbeingFocusSwitch').click());
await sleep(300);
const focusActive = await page.evaluate(() => window.__wellbeingStore && window.__wellbeingStore.focusActive());
check('开关开启 → focusActive true（即提交持久化）', focusActive === true, String(focusActive));
await page.screenshot({ path: `${OUT}/wb-focus-on.png` });

// ③ 关设置回桌面 → 真实点击被暂停应用 → toast + 零开窗
await page.evaluate(() => { if (typeof window.__closeApp === 'function') window.__closeApp(); });
await sleep(900);
await page.evaluate(() => document.querySelector('.app-icon[data-id="clock_app"]').click());
await sleep(600);
const pausedToast = await page.evaluate(() => {
  const t = document.getElementById('systemGlobalToast');
  return t ? t.textContent : '';
});
const openAfterBlock = await page.evaluate(() => (window.__usageStore.getState().open || {}).clock_app != null);
check('被暂停应用真实点击拦截（toast 已暂停（专注模式））', pausedToast.indexOf('已暂停（专注模式）') !== -1, `toast=${pausedToast}`);
check('拦截零开窗（defer 埋点无在途会话）', !openAfterBlock);
await page.screenshot({ path: `${OUT}/wb-paused-toast.png` });

// ④ 零误伤：开关关 → 同应用正常打开
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1800);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="wellbeing"]').click());
await sleep(1200);
await page.evaluate(() => document.getElementById('wellbeingFocusSwitch').click());
await sleep(300);
const focusOffState = await page.evaluate(() => ({
  active: window.__wellbeingStore.focusActive(),
  list: window.__wellbeingStore.focusApps(),
  switchChecked: document.getElementById('wellbeingFocusSwitch').checked,
}));
check('开关关 → focusActive false（清单保留——AOSP Focus mode 配置记忆语义）',
  focusOffState.active === false && focusOffState.list.indexOf('clock_app') !== -1 && focusOffState.switchChecked === false,
  JSON.stringify(focusOffState));
await page.evaluate(() => { if (typeof window.__closeApp === 'function') window.__closeApp(); });
await sleep(900);
await page.evaluate(() => document.querySelector('.app-icon[data-id="clock_app"]').click());
await sleep(2600);
const openOk = await page.evaluate(() => (window.__usageStore.getState().open || {}).clock_app != null);
check('零误伤：未暂停应用正常打开（defer 埋点在途会话在位）', openOk);
await page.evaluate(() => { if (typeof window.__closeApp === 'function') window.__closeApp(); });
await sleep(900);

// ⑤ 计时器链：档位钮设限 clock_app（未限时→15 分钟）+ music 直调超限
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1800);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="wellbeing"]').click());
await sleep(1200);
const cycleBefore = await page.evaluate(() => {
  const row = document.querySelector('[data-test="wellbeing-timer-row"][data-app="clock_app"]');
  return row ? row.querySelector('[data-test="wellbeing-timer-btn"]').textContent.trim() : 'MISSING_ROW';
});
await page.evaluate(() => {
  const row = document.querySelector('[data-test="wellbeing-timer-row"][data-app="clock_app"]');
  row.querySelector('[data-test="wellbeing-timer-btn"]').click();
});
await sleep(300);
const cycleAfter = await page.evaluate(() => {
  const row = document.querySelector('[data-test="wellbeing-timer-row"][data-app="clock_app"]');
  return row ? row.querySelector('[data-test="wellbeing-timer-btn"]').textContent.trim() : 'MISSING_ROW';
});
const limitStored = await page.evaluate(() => window.__wellbeingStore.limitOf('clock_app'));
check('档位轮转钮：未限时 → 15 分钟（点击即提交 store）',
  cycleBefore === '未限时' && cycleAfter === '15 分钟' && limitStored === 15,
  `before=${cycleBefore} after=${cycleAfter} limit=${limitStored}`);

const remainShown = await page.evaluate(() => {
  const row = document.querySelector('[data-test="wellbeing-timer-row"][data-app="clock_app"]');
  return row ? row.textContent.replace(/\s+/g, ' ') : '';
});
check('未到限行「剩余」展示 + 已用行（clock_app 用时 < 15 分钟）',
  remainShown.indexOf('剩余') !== -1 && remainShown.indexOf('今日已用') !== -1, remainShown.slice(0, 120));

await page.evaluate(() => {
  window.__wellbeingStore.setLimit('music', 15); // 先设限（直调面），再 seed 超限用量
  const now = Date.now();
  window.__usageStore.appOpened('music', now - 16 * 60000);
  window.__usageStore.appClosed('music', now); // 16 分钟会话 → 超 15 分钟限时
  document.dispatchEvent(new CustomEvent('app-page-active', { detail: { appId: 'settings', pageIdx: 36 } }));
});
await sleep(500);
const musicRow = await page.evaluate(() => {
  const row = document.querySelector('[data-test="wellbeing-timer-row"][data-app="music"]');
  return row ? row.textContent.replace(/\s+/g, ' ') : 'MISSING';
});
check('超限行「已暂停（到限）」标签渲染（music 16 分钟 > 15 分钟限时）',
  musicRow.indexOf('已暂停（到限）') !== -1, musicRow.slice(0, 140));
await page.screenshot({ path: `${OUT}/wb-timers.png` });

// ⑥ 真实点击超限应用 → toast + 零开窗
await page.evaluate(() => { if (typeof window.__closeApp === 'function') window.__closeApp(); });
await sleep(900);
await page.evaluate(() => document.querySelector('.app-icon[data-id="music"]').click());
await sleep(600);
const timerToast = await page.evaluate(() => {
  const t = document.getElementById('systemGlobalToast');
  return t ? t.textContent : '';
});
const openMusicBlocked = await page.evaluate(() => (window.__usageStore.getState().open || {}).music != null);
check('超限应用真实点击拦截（toast 今日限时已用完）', timerToast.indexOf('今日限时已用完') !== -1, `toast=${timerToast}`);
check('超限拦截零开窗（defer 埋点无在途会话）', !openMusicBlocked);

// ⑦ 持久化往返：刷新后配置存活
await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
await sleep(2500);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(1200);
const persisted = await page.evaluate(() => ({
  limit: window.__wellbeingStore.limitOf('clock_app'),
  list: window.__wellbeingStore.focusApps(),
  active: window.__wellbeingStore.focusActive(),
}));
check('配置持久化往返（刷新后 limit 15 / focusApps 含 clock_app / focusActive false）',
  persisted.limit === 15 && persisted.list.indexOf('clock_app') !== -1 && persisted.active === false,
  JSON.stringify(persisted));

check('零 pageerror', pageErrors === 0, `errors=${pageErrors}`);
await browser.close();
log(failures === 0 ? 'ALL PASS' : `FAILED: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
