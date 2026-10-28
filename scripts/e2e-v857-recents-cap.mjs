// ==================== e2e-v857-recents-cap.mjs — #68 收尾·任务数上限 8 张卡无头回归 ====================
//
// DoD（#68 验收对照 · v8.57 收紧 10→8）：
//   A. 连续打开 10 个应用 → recordAppOpened 上限 8 生效（列表恰好 8 条）
//   B. openRecentApps → 卡片数量 === 8（与历史栈一致）
//   C. 顺序语义：最新在前（a10），最老两条被弹出（a1/a2 不在）
//   D. 清除全部按钮在场（executeWaveClearAll 路径已有 v763 套件锚，此处只验 DOM）
//   E. 关闭多任务 → 零残留 + 零 pageerror
//
// 教训沿袭：v842（同一 openAppById 路径）、v843（goto load+固定等待）、
//           v854（外域资源 route.abort——沙箱外网波动隔离）、v850（父页读回）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v857');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8085/ios-desktop/index.html?nolock=1';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
// 外域资源一律隔离（v854 纪律）
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());

await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(1800); // boot

// ---------- A. 连续打开 10 个应用 ----------
const APPS = ['msg', 'game2048', 'settings', 'camera', 'photo', 'music', 'weather', 'notes', 'calculator', 'stocks'];
for (const id of APPS) {
  await page.evaluate((appId) => { window.__shareSheet.openAppById(appId); }, id);
  await sleep(500); // 记录进 recents（recordAppOpened 在 openApp 链路）
}
await sleep(400);

const listInfo = await page.evaluate(() => {
  // getRecentAppsList 未挂 window —— 经 __lastRecordedApp + DOM 侧验证；
  // 列表本体经 openRecentApps 后由卡片数量与 data-appId 断言（不依赖内部导出）。
  return { last: window.__lastRecordedApp };
});
A('A1. 10 次打开已记录（最后记录=stocks）', listInfo.last === 'stocks', `last=${listInfo.last}`);

// ---------- B. 打开多任务，卡片数 = 8 ----------
await page.evaluate(() => { window.__openRecentApps(); });
await sleep(900); // 入场动画

const rec = await page.evaluate(() => {
  const overlay = document.getElementById('recentAppsOverlay');
  const cards = Array.from(document.querySelectorAll('#recentCardsDeck .recent-app-card'));
  return {
    active: overlay ? overlay.classList.contains('active') : false,
    n: cards.length,
    ids: cards.map((c) => c.dataset.appId),
    hasClearAll: !!document.getElementById('recentClearAllBtn'),
  };
});
A('B1. overlay 激活', rec.active);
A('B2. 卡片数量 = 8（上限收紧生效）', rec.n === 8, `n=${rec.n}`);
A('B3. 清除全部按钮在场', rec.hasClearAll);

// ---------- C. 顺序语义 ----------
A('C1. 最新在前（stocks）', rec.ids[0] === 'stocks', `first=${rec.ids[0]}`);
A('C2. 最老两项被弹出（msg/game2048 不在）', !rec.ids.includes('msg') && !rec.ids.includes('game2048'), `ids=${rec.ids.join(',')}`);
A('C3. 幸存最老项 = settings（第 3 位打开者）', rec.ids[rec.ids.length - 1] === 'settings', `last=${rec.ids[rec.ids.length - 1]}`);

// ---------- E. 关闭零残留 ----------
await page.evaluate(() => { window.__closeRecentApps(); });
await sleep(700);
const closed = await page.evaluate(() => {
  const overlay = document.getElementById('recentAppsOverlay');
  return { active: overlay ? overlay.classList.contains('active') : false };
});
A('E1. 关闭后 overlay 复位', !closed.active);

A('Z1. 零 pageerror', errors.length === 0, errors.length ? errors[0] : '');

await page.screenshot({ path: join(OUT, 'recents-cap8.png') });
console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
