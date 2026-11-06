// e2e-v96-wellbeing.mjs — v10.25 #96 一期 数字健康仪表盘 E2E 核验
// ① 页 36 权威结构：一级入口行 → 环形卡（wellbeing-ring-card）+ 空态（wellbeing-empty）+ 口径注记卡
// ② seed 直调面（window.__usageStore）：双应用开/闭会话 → 环形 SVG 弧段 + 排行行
//    （时长格式化 + 打开 N 次）+ 合计/应用数摘要 + 空态退场
// ③ 真接线核验：真实点击 clock_app 图标开应用 → defer 埋点 → __usageStore.getState().open 在途会话在位
// ④ 零 pageerror + 截图两张落盘 docs/v96/
//
// 用法：MD3_BASE=http://127.0.0.1:8081/ios-desktop/index.html?nolock=1 node scripts/e2e-v96-wellbeing.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8081/ios-desktop/index.html?nolock=1';
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

// ① 打开设置 → 数字健康行 → 页 36
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(2000);
const rowPresent = await page.evaluate(() => !!document.querySelector('.tp-row[data-tp-key="wellbeing"]'));
check('一级入口行 wellbeing 在场（AOSP_TOP_LEVEL）', rowPresent);
await page.evaluate(() => document.querySelector('.tp-row[data-tp-key="wellbeing"]').click());
await sleep(1500);

const ringCard = await page.evaluate(() => !!document.querySelector('[data-test="wellbeing-ring-card"]'));
const emptyAnchor = await page.evaluate(() => !!document.querySelector('[data-test="wellbeing-empty"]'));
const preRows = await page.evaluate(() => (window.__usageStore && window.__usageStore.dayTotals()).length);
const noteCard = await page.evaluate(() => {
  const el = document.querySelector('[data-test="wellbeing-note"]');
  return el && el.textContent.includes('UsageStats') && el.textContent.includes('本机');
});
check('页 36 环形卡在场', ringCard);
check('空态锚在场（模板双锚互斥结构）', emptyAnchor);
check('真实开设置本身已产生 opens=1（真埋点第一手证据；单前台模型内零 ms 不入环）', preRows === 1, `rows=${preRows}`);
check('口径注记卡在场（UsageStats 边界 + 本机口径）', noteCard);
await page.screenshot({ path: `${OUT}/wellbeing-empty.png` });

// ② seed 直调面：双应用会话（clock 25min×2 开 / music 10min×1 开）
const seeded = await page.evaluate(() => {
  try {
    const now = Date.now();
    window.__usageStore.appOpened('clock_app', now - 25 * 60000);
    window.__usageStore.appClosed('clock_app', now - 5 * 60000); // 20min 会话
    window.__usageStore.appOpened('clock_app', now - 8 * 60000);
    window.__usageStore.appClosed('clock_app', now - 3 * 60000); // 5min 会话
    window.__usageStore.appOpened('music', now - 10 * 60000);
    window.__usageStore.appClosed('music', now); // 10min 会话
    return true;
  } catch (e) { return 'ERR:' + e.message; }
});
check('seed 直调面可用（__usageStore）', seeded === true, String(seeded));

// 重渲染（监听在 document——CustomEvent dispatch 目标 document，v207c 坑①规避）
await page.evaluate(() => document.dispatchEvent(new CustomEvent('app-page-active', { detail: { appId: 'settings', pageIdx: 36 } })));
await sleep(600);

// ②b 设备级统计卡（#96 二期：解锁/通知计数——seed 3 解锁 2 通知）
const statSeeded = await page.evaluate(() => {
  try {
    const now = Date.now();
    window.__usageStore.deviceEvent('unlock', now - 5000);
    window.__usageStore.deviceEvent('unlock', now - 4000);
    window.__usageStore.deviceEvent('unlock', now - 3000);
    window.__usageStore.deviceEvent('notify', now - 2000);
    window.__usageStore.deviceEvent('notify', now - 1000);
    return true;
  } catch (e) { return 'ERR:' + e.message; }
});
check('统计卡 seed 直调面可用', statSeeded === true, String(statSeeded));
await page.evaluate(() => document.dispatchEvent(new CustomEvent('app-page-active', { detail: { appId: 'settings', pageIdx: 36 } })));
await sleep(400);
const statCards = await page.evaluate(() => ({
  unlocks: (document.getElementById('wellbeingUnlocks') || {}).textContent,
  notifs: (document.getElementById('wellbeingNotifs') || {}).textContent,
}));
check('统计卡渲染（解锁 3 / 通知 2）', statCards.unlocks === '3' && statCards.notifs === '2', JSON.stringify(statCards));

const ringSvg = await page.evaluate(() => !!document.querySelector('[data-test="wellbeing-ring-svg"] circle'));
const arcCount = await page.evaluate(() => document.querySelectorAll('[data-test="wellbeing-ring-svg"] circle').length);
const totalText = await page.evaluate(() => (document.querySelector('[data-test="wellbeing-ring-total"]') || {}).textContent || '');
const rankingRows = await page.evaluate(() => Array.from(document.querySelectorAll('[data-test="wellbeing-app-row"]')).map((r) => ({
  app: r.getAttribute('data-app'),
  text: r.textContent.replace(/\s+/g, ' ').trim(),
})));
const emptyGone = await page.evaluate(() => {
  const el = document.querySelector('[data-test="wellbeing-empty"]');
  return el && el.style.display === 'none';
});
check('环形 SVG 弧段渲染（clock+music 两弧）', ringSvg && arcCount === 2, `arcs=${arcCount}`);
check('环心合计文案（35 分钟 = 20+5+10）', totalText === '35 分钟', totalText);
check('排行前两行 seed 精确命中（clock_app 25 分钟 2 次 / music 10 分钟 1 次；ms 降序）', rankingRows.length >= 2
  && rankingRows[0].app === 'clock_app' && rankingRows[0].text.includes('25 分钟') && rankingRows[0].text.includes('打开 2 次')
  && rankingRows[1].app === 'music' && rankingRows[1].text.includes('10 分钟') && rankingRows[1].text.includes('打开 1 次'),
  JSON.stringify(rankingRows));
const extraRowOk = rankingRows.length === 2 || rankingRows.slice(2).every((r) => r.app === 'settings' && r.text.includes('不足 1 分钟'));
check('seed 后仅 settings 零 ms 尾行（真实开设置 opens=1，零 ms 不入环不碍账）', extraRowOk, JSON.stringify(rankingRows.slice(2)));
check('空态退场（有数据态）', emptyGone);
await page.screenshot({ path: `${OUT}/wellbeing-data.png` });

// ③ 真接线核验：回桌面 → 真实点击 clock_app 图标 → defer 650ms 埋点 → 在途会话在位
const backHome = await page.evaluate(() => {
  try { if (typeof window.__closeApp === 'function') { window.__closeApp(); return 'bridge'; } } catch (e) {}
  try {
    const g = document.getElementById('gestureBar') || document.querySelector('.home-gesture');
    if (g) { g.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 'gesture'; }
  } catch (e) {}
  return 'fallback';
});
await sleep(800);
await page.evaluate(() => document.querySelector('.app-icon[data-id="clock_app"]').click());
await sleep(2600); // 开窗动画 650ms defer 埋点 + 余量
const wiredOpen = await page.evaluate(() => {
  const open = (window.__usageStore && window.__usageStore.getState().open) || {};
  return open.clock_app != null;
});
check('真实开应用 → defer 埋点在途会话在位（clock_app）', wiredOpen, `back=${backHome}`);

check('零 pageerror', pageErrors === 0, `errors=${pageErrors}`);
await browser.close();
log(failures === 0 ? 'ALL PASS' : `FAILED: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
