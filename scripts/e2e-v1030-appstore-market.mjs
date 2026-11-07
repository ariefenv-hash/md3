// e2e · v10.30 #183 一期：应用市场真数据化（appstore 外壳 + catalog 全链 + 降级硬要求）
//
// 覆盖：
//   T1 目录检测 ok：开应用 → 已装空态 + 目录卡「你好世界」+ 状态条 ok
//   T2 获取全链：目录「获取」→ fetch demo/hello-world.mdapp → importBlob → installPending
//      → 桌面上桌（.icon-box[data-id=com.demo.hello]）+ 已装行出现
//   T3 详情往返：行点入 → 包名/版本/权限 chip（通知）→ 确认弹层默认隐藏
//   T4 卸载全链：卸载钮 → m3e-btngroup 确认 → uninstallPackage → 桌面图标消失 + 空态回归
//   T5 降级硬要求：route.abort catalog.json → 状态条 down + 已装区照常 + 全程零 pageerror
//   T6 平板 768 双栏：.as-grid computed 两轨（#179 ③）
//   K1 全程零 pageerror
// 纪律：外域 route.abort；截图入库 docs/v1030/；Esc 经 window 键事件（R18 校准）。

import { chromium } from 'playwright';
import fs from 'node:fs';

fs.mkdirSync('docs/v1030', { recursive: true });

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8100/ios-desktop/index.html?nolock=1'; // v10.31 R114 勘误：serve.mjs 根=仓库根，/index.html 是包装壳 iframe（R111 serve 根勘误同律；原 8100 服务为 ios-desktop 根语境下成立）
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

async function newPage({ blockCatalog = false, viewport = { width: 390, height: 844 } } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  if (blockCatalog) {
    await page.route('**/catalog.json', (r) => r.abort());
  }
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  return { ctx, page, errors };
}

async function openStore(page) {
  await page.evaluate(() => window.__shareSheet && window.__shareSheet.openAppById('appstore'));
  await sleep(1400);
}

// ---------- T1-T4 主链（同一 context：安装→详情→卸载 全链状态真实演进） ----------
{
  const { ctx, page, errors } = await newPage();
  console.log('T1 目录检测与空态');
  await openStore(page);
  const installedBox = await page.evaluate(() => !!document.querySelector('[data-test="as-installed"]'));
  t('T1-1 已装列表容器在场', installedBox);
  const catMode = await page.evaluate(() => {
    const el = document.getElementById('as-cat-state');
    return el ? el.getAttribute('data-as-mode') : 'MISSING';
  });
  t('T1-2 目录检测 ok（同源 catalog.json 命中）', catMode === 'ok', `mode=${catMode}`);
  const catHome = await page.evaluate(() => (document.querySelector('[data-test="as-cat-home"]') || {}).textContent || '');
  t('T1-3 目录卡含「你好世界」条目', catHome.includes('你好世界'));
  const empty0 = await page.evaluate(() => !!document.querySelector('[data-test="as-installed-empty"]'));
  t('T1-4 已装空态在场（种子环境零安装）', empty0);
  await page.screenshot({ path: 'docs/v1030/market-home.png' });

  console.log('T2 获取全链（直链→校验→上桌）');
  await page.evaluate(() => {
    const btn = document.querySelector('[data-test="as-acquire"]');
    if (btn) btn.click();
  });
  await sleep(2600);
  const onDesk = await page.evaluate(() => !!document.querySelector('.icon-box[data-id="pkg-com.demo.hello"], [data-id="pkg-com.demo.hello"]'));
  t('T2-1 桌面上桌（pkg- 前缀安装 id 图标注册）', onDesk);
  const rowN = await page.evaluate(() => document.querySelectorAll('[data-test="as-app-row"]').length);
  t('T2-2 已装行出现（listInstalled 桥同步）', rowN === 1, `rows=${rowN}`);
  const emptyGone = await page.evaluate(() => !document.querySelector('[data-test="as-installed-empty"]'));
  t('T2-3 空态退场', emptyGone);

  console.log('T3 详情页');
  await page.evaluate(() => document.querySelector('[data-test="as-app-row"]').click());
  await sleep(900);
  const detailTxt = await page.evaluate(() => (document.getElementById('as-detail') || {}).textContent || '');
  t('T3-1 详情含包名/版本/体积', detailTxt.includes('com.demo.hello') && detailTxt.includes('v1.0.0') && detailTxt.includes('KB'));
  const permChip = await page.evaluate(() => {
    const chips = document.querySelectorAll('[data-test="as-perm-chip"]');
    return Array.from(chips).map((c) => c.textContent).join('|');
  });
  t('T3-2 权限 chip 经 PERMISSION_META 快照译名（通知）', permChip.includes('通知'), `chips=${permChip}`);
  const confirmHidden0 = await page.evaluate(() => { const el = document.querySelector('[data-test="as-confirm"]'); return el && el.hidden === true; });
  t('T3-3 确认弹层默认隐藏', confirmHidden0);
  await page.screenshot({ path: 'docs/v1030/market-detail.png' });

  console.log('T4 卸载全链（m3e-btngroup 确认）');
  await page.evaluate(() => { const b = document.querySelector('[data-test="as-uninstall-btn"]'); if (b) b.click(); });
  await sleep(400);
  const confirmShown = await page.evaluate(() => { const el = document.querySelector('[data-test="as-confirm"]'); return el && el.hidden === false; });
  t('T4-1 确认弹层唤出', confirmShown);
  await page.evaluate(() => { const b = document.querySelector('[data-test="as-confirm-ok"]'); if (b) b.click(); });
  await sleep(2600);
  const deskGone = await page.evaluate(() => !document.querySelector('[data-id="pkg-com.demo.hello"]'));
  t('T4-2 桌面图标随卸载消失（全链含反注册）', deskGone);
  const emptyBack = await page.evaluate(() => !!document.querySelector('[data-test="as-installed-empty"]'));
  t('T4-3 已装空态回归', emptyBack);
  t('T4-4 主链零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
  await ctx.close();
}

// ---------- T5 降级硬要求（独立 context + route.abort） ----------
{
  const { ctx, page, errors } = await newPage({ blockCatalog: true });
  console.log('T5 降级硬要求（catalog.json 注入失败）');
  await openStore(page);
  const mode = await page.evaluate(() => {
    const el = document.getElementById('as-cat-state');
    return el ? el.getAttribute('data-as-mode') : 'MISSING';
  });
  t('T5-1 状态条转 down', mode === 'down', `mode=${mode}`);
  const stTxt = await page.evaluate(() => (document.getElementById('as-cat-state-text') || {}).textContent || '');
  t('T5-2 降级文案（暂不可达·已装不受影响）', stTxt.includes('目录暂不可达'), stTxt);
  const installedOk = await page.evaluate(() => !!document.querySelector('[data-test="as-installed"]'));
  t('T5-3 已装列表照常渲染（不白屏）', installedOk);
  const retry = await page.evaluate(() => !!document.querySelector('[data-test="as-cat-retry"]'));
  t('T5-4 目录页重试入口在场', retry);
  t('T5-5 降级路径零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
  await page.screenshot({ path: 'docs/v1030/market-degraded.png' });
  await ctx.close();
}

// ---------- T6 平板双栏 ----------
{
  const { ctx, page, errors } = await newPage({ viewport: { width: 768, height: 1024 } });
  console.log('T6 平板双栏（#179 ③）');
  await openStore(page);
  const cols = await page.evaluate(() => {
    const g = document.querySelector('.as-grid');
    return g ? getComputedStyle(g).gridTemplateColumns : 'NONE';
  });
  t('T6-1 ≥768 双轨 grid（列表+目录并陈）', /\S+\s+\S+/.test(cols.trim()) && cols.trim().split(/\s+/).length === 2, `cols=${cols}`);
  t('T6-2 零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
  await page.screenshot({ path: 'docs/v1030/market-tablet.png' });
  await ctx.close();
}

await browser.close();
console.log(`\n==== e2e-v1030-appstore-market 结果：pass=${pass} fail=${fail} ====`);
process.exit(fail ? 1 : 0);
