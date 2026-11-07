// e2e · v10.31 #183 二期：在线目录 CDN 链 + #172 外部项目轻量壳 + 版本语义三态
//
// 覆盖：
//   T1 CDN 优先命中：route.fulfill jsdelivr → 目录卡渲染 CDN 载荷 + 状态条「· CDN」
//   T2 同源回退：CDN 默认 abort（全局外域拦截）→ 同源 catalog.json 命中 + 状态条「· 同源」
//   T3 外部项目添加链：ext 行「添加」→ 桌面上桌（data-id=ext-retro-player）+ 已添加徽章 + 移除钮翻转
//   T4 外部应用打开：openPkgApp → 窗口 iframe src 指向远程 Pages url（轻量壳直载）
//   T5 外部移除链：移除钮 → 确认组 → 桌面图标消失 + 添加钮回归
//   T6 版本语义三态：获取→已安装 v1.0.0 → 目录升 v2.0.0 → 可更新 → 覆盖安装链真实跑通
//      （installedAt 前移）+ 版本真源诚实断言（真源在包内 manifest，目录为展示层预期值）
//   T7 降级硬要求：全链 abort → down + 外部区块空态 + 已装照常 + 零 pageerror
//   T8 平板 768 双栏：.as-grid 两轨 + 外部区块在场
//   K1 全程零 pageerror
// 纪律：外域默认 route.abort；CDN 命中用 fulfill 注入；截图入库 docs/v1031/；
// BASE 直连 /ios-desktop/index.html（serve.mjs 根=仓库根，/index.html 是包装壳 iframe —— R111 勘误同律）。

import { chromium } from 'playwright';
import fs from 'node:fs';
import { resolve } from 'node:path';

fs.mkdirSync('docs/v1031', { recursive: true });

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8100/ios-desktop/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const catRaw = JSON.parse(fs.readFileSync(resolve('ios-desktop/catalog.json'), 'utf8'));

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

async function newPage({ blockCatalog = false, viewport = { width: 390, height: 844 } } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // 外域默认全断（CDN 挡在门外 → 同源回退位生效）
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  if (blockCatalog) {
    // 同源 catalog.json 也断（CDN 已被外域规则覆盖）→ 双失降级实测位
    await page.route('**/catalog.json', (r) => r.abort());
  }
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  return { ctx, page, errors };
}

async function openStore(page) {
  await page.evaluate(() => window.__shareSheet && window.__shareSheet.openAppById('appstore'));
  await sleep(1500);
}

// ---------- T1 CDN 优先命中（独立 context：jsdelivr fulfill 注入标记载荷） ----------
{
  const { ctx, page, errors } = await newPage();
  console.log('T1 CDN 优先命中');
  const cdnCat = JSON.parse(JSON.stringify(catRaw));
  cdnCat.apps[0].name = 'CDN标记你好';
  await page.route('**/cdn.jsdelivr.net/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(cdnCat) }));
  await openStore(page);
  const stTxt = await page.evaluate(() => (document.getElementById('as-cat-state-text') || {}).textContent || '');
  t('T1-1 状态条命中位标记 CDN', stTxt.includes('· CDN'), stTxt);
  const catHome = await page.evaluate(() => (document.querySelector('[data-test="as-cat-home"]') || {}).textContent || '');
  t('T1-2 渲染的是 CDN 载荷（标记名在场）', catHome.includes('CDN标记你好'));
  const extTxt = await page.evaluate(() => (document.querySelector('[data-test="as-ext-home"]') || {}).textContent || '');
  t('T1-3 外部区块随 CDN 载荷渲染（compact 3 行：retro/prism）', extTxt.includes('RETRO PLAYER') && extTxt.includes('棱镜回响'), extTxt.slice(0, 40));
  t('T1-4 零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
  await page.screenshot({ path: 'docs/v1031/catalog-cdn-hit.png' });
  await ctx.close();
}

// ---------- T2 同源回退 + T3/T4/T5 外部应用全链（同 context 状态真实演进） ----------
{
  const { ctx, page, errors } = await newPage();
  console.log('T2 同源回退（CDN 被全局外域拦截）');
  await openStore(page);
  const stTxt = await page.evaluate(() => (document.getElementById('as-cat-state-text') || {}).textContent || '');
  t('T2-1 状态条回退位标记 同源', stTxt.includes('· 同源'), stTxt);
  const mode = await page.evaluate(() => (document.getElementById('as-cat-state') || {}).getAttribute('data-as-mode') || 'MISSING');
  t('T2-2 目录检测 ok（回退位命中）', mode === 'ok', `mode=${mode}`);
  const extN = await page.evaluate(() => document.querySelectorAll('[data-test="as-ext-home"] .md3-list-item').length);
  t('T2-3 外部项目 4 账（compact 3 行）', extN === 3, `rows=${extN}`);
  await page.screenshot({ path: 'docs/v1031/catalog-fallback.png' });

  console.log('T3 外部项目添加链');
  await page.evaluate(() => { const b = document.querySelector('[data-test="as-ext-add"]'); if (b) b.click(); });
  await sleep(1800);
  const onDesk = await page.evaluate(() => !!document.querySelector('[data-id="ext-retro-player"]'));
  t('T3-1 桌面上桌（ext- 前缀安装 id）', onDesk);
  const addedBadge = await page.evaluate(() => !!document.querySelector('[data-test="as-ext-added-badge"]'));
  t('T3-2 已添加徽章翻转', addedBadge);
  const rmBtn = await page.evaluate(() => !!document.querySelector('[data-test="as-ext-remove"]'));
  t('T3-3 行动作钮翻转为移除', rmBtn);

  console.log('T4 外部应用打开（iframe 直载远程 url）');
  await page.evaluate(() => window.__pkgInstallerAPI.openPkgApp('ext-retro-player'));
  await sleep(1800);
  const iframeSrc = await page.evaluate(() => {
    const frames = Array.from(document.querySelectorAll('iframe'));
    const hit = frames.find((f) => (f.getAttribute('src') || '').indexOf('retro-music-player') !== -1);
    return hit ? hit.getAttribute('src') : '';
  });
  t('T4-1 窗口 iframe src 指向外部 Pages', iframeSrc.indexOf('https://ariefenv-hash.github.io/retro-music-player/') === 0, iframeSrc.slice(0, 60));
  const extStore = await page.evaluate(async () => (await window.__pkgInstallerAPI.listExternals()).length);
  t('T4-2 externals 存储账 1 条', extStore === 1, `n=${extStore}`);
  await page.screenshot({ path: 'docs/v1031/external-open.png' });

  console.log('T5 外部移除链（确认组）');
  // 回市场窗口（外部窗若在前台先由 removeExternalApp 关窗链兜底，此处先关保干净）
  await page.evaluate(() => { const b = document.querySelector('[data-test="as-ext-remove"]'); if (b) b.click(); });
  await sleep(500);
  const ovShown = await page.evaluate(() => { const o = document.querySelector('[data-test="as-ext-confirm"]'); return o && o.hidden === false; });
  t('T5-1 移除确认弹层唤出', ovShown);
  await page.evaluate(() => { const b = document.querySelector('[data-test="as-ext-ok"]'); if (b) b.click(); });
  await sleep(1800);
  const deskGone = await page.evaluate(() => !document.querySelector('[data-id="ext-retro-player"]'));
  t('T5-2 桌面图标随移除消失', deskGone);
  const addBack = await page.evaluate(() => !!document.querySelector('[data-test="as-ext-add"]'));
  t('T5-3 行动作钮回归添加', addBack);
  const extStore0 = await page.evaluate(async () => (await window.__pkgInstallerAPI.listExternals()).length);
  t('T5-4 存储账清空', extStore0 === 0, `n=${extStore0}`);
  t('T5-5 外部全链零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
  await ctx.close();
}

// ---------- T6 版本语义三态（同 context：装 v1.0.0 → 已安装 → 目录升 2.0.0 → 可更新 → 覆盖装） ----------
{
  const { ctx, page, errors } = await newPage();
  console.log('T6 版本语义三态');
  await openStore(page);
  await page.evaluate(() => { const b = document.querySelector('[data-test="as-acquire"]'); if (b) b.click(); });
  await sleep(2600);
  const badge1 = await page.evaluate(() => {
    const el = document.querySelector('[data-test="as-installed-badge"]');
    return el ? el.textContent : '';
  });
  t('T6-1 同版本 → 已安装 v1.0.0（获取钮退役）', badge1.indexOf('已安装 v1.0.0') !== -1, badge1);
  const acqGone = await page.evaluate(() => !document.querySelector('[data-test="as-acquire"]'));
  t('T6-2 目录行获取钮退场', acqGone);

  const upCat = JSON.parse(JSON.stringify(catRaw));
  upCat.apps[0].version = '2.0.0';
  await page.route('**/catalog.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(upCat) }));
  await page.evaluate(() => window.__asLoadCatalog && window.__asLoadCatalog());
  await sleep(1200);
  const upd = await page.evaluate(() => !!document.querySelector('[data-test="as-upd"]'));
  t('T6-3 目录新版 → 可更新钮在场', upd);
  const updBadge = await page.evaluate(() => {
    const el = document.querySelector('[data-test="as-upd-badge"]');
    return el ? el.textContent : '';
  });
  t('T6-4 可更新徽章携带目录版本 v2.0.0', updBadge.indexOf('2.0.0') !== -1, updBadge);
  const at0 = await page.evaluate(async () => {
    const list = await window.__pkgInstallerAPI.listInstalled();
    return list.length ? list[0].installedAt : 0;
  });
  await page.evaluate(() => { const b = document.querySelector('[data-test="as-upd"]'); if (b) b.click(); });
  await sleep(4000);
  const at1 = await page.evaluate(async () => {
    const list = await window.__pkgInstallerAPI.listInstalled();
    return list.length ? list[0].installedAt : 0;
  });
  t('T6-5 可更新点击 → 覆盖安装链真实跑通（IDB installedAt 前移）', at1 > at0, `at ${at0} → ${at1}`);
  // 诚实语义断言：安装版本真源在包内 manifest（analyzeZipBlob），目录 version 是展示层预期值 ——
  // demo 包仍 v1.0.0 → 已装记录保持 1.0.0 → 行保持「可更新」（cmp = -1）即正确行为，不是缺陷。
  const verNow = await page.evaluate(async () => {
    const list = await window.__pkgInstallerAPI.listInstalled();
    return list.length ? list[0].version : '';
  });
  t('T6-6 版本真源在包内 manifest（已装仍 v1.0.0，目录预期 v2.0.0 → 行保持可更新）', verNow === '1.0.0', `installed=${verNow}`);
  const updStays = await page.evaluate(() => !!document.querySelector('[data-test="as-upd"]'));
  t('T6-7 行保持可更新态（目录>已装 cmp=-1 判定正确）', updStays);
  t('T6-8 版本链零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
  await page.screenshot({ path: 'docs/v1031/version-states.png' });
  await ctx.close();
}

// ---------- T7 降级硬要求（CDN+同源全失） ----------
{
  const { ctx, page, errors } = await newPage({ blockCatalog: true });
  console.log('T7 降级硬要求（CDN+同源全失）');
  await openStore(page);
  const mode = await page.evaluate(() => (document.getElementById('as-cat-state') || {}).getAttribute('data-as-mode') || 'MISSING');
  t('T7-1 状态条转 down（全链不可达）', mode === 'down', `mode=${mode}`);
  const stTxt = await page.evaluate(() => (document.getElementById('as-cat-state-text') || {}).textContent || '');
  t('T7-2 降级文案在册', stTxt.includes('目录暂不可达'), stTxt);
  const extEmpty = await page.evaluate(() => !!document.querySelector('[data-test="as-ext-home"] [data-test="as-ext-empty"]'));
  t('T7-3 外部区块空态（不白屏）', extEmpty);
  const installedOk = await page.evaluate(() => !!document.querySelector('[data-test="as-installed"]'));
  t('T7-4 已装列表照常', installedOk);
  t('T7-5 降级路径零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
  await page.screenshot({ path: 'docs/v1031/catalog-degraded.png' });
  await ctx.close();
}

// ---------- T8 平板双栏 ----------
{
  const { ctx, page, errors } = await newPage({ viewport: { width: 768, height: 1024 } });
  console.log('T8 平板双栏（#179 ③ 回归）');
  await openStore(page);
  const cols = await page.evaluate(() => {
    const g = document.querySelector('.as-grid');
    return g ? getComputedStyle(g).gridTemplateColumns : 'NONE';
  });
  t('T8-1 ≥768 双轨 grid', /\S+\s+\S+/.test(cols.trim()) && cols.trim().split(/\s+/).length === 2, `cols=${cols}`);
  const extVisible = await page.evaluate(() => !!document.querySelector('[data-test="as-ext-home"]'));
  t('T8-2 外部区块在场', extVisible);
  t('T8-3 零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
  await page.screenshot({ path: 'docs/v1031/catalog-tablet.png' });
  await ctx.close();
}

await browser.close();
console.log(`\n==== e2e-v1031-online-catalog 结果：pass=${pass} fail=${fail} ====`);
process.exit(fail ? 1 : 0);
