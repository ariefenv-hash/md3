// e2e · v10.32 #172 余项：外部失联探活 + 失联占位面 + 重试链 + 十一站点账渲染
//
// 覆盖：
//   T1 目录 11 账渲染：同源 catalog.json 命中（CDN 被外域拦截）→ 外部全量页 11 行
//   T2 真载 ok 路径：添加 → 上桌 → 打开 → iframe[data-ext-guard] 直载（fulfill 注入 HTML）
//      → load 信号 → 占位层恒 hidden（reachable ok 判定链）
//   T3 API 404 权威失联：api.github.com/repos/** fulfill 404 → 占位层即现 + 判定依据文案
//      （GitHub 仓库/Pages 已删除语义；load 未发生亦判失联）
//   T4 看门狗超时（歧义探活）：API 403（限流语义 → unknown 不降级）+ 页面 abort
//      → 600ms 时占位层仍 hidden（unknown 不误伤）→ 12s 看门狗到点 → 占位层现 + 看门狗依据
//   T5 重试链：fulfill 页面 200 → 点重试 → src 携 md3_retry=1 → load 到 → 占位层回隐
//   T6 平板 768 失联占位：abort 全外域 → 直连探活拒 → 占位即现（准入② @media 档视觉留档）
//   K1 全程零 pageerror
// 纪律：外域默认 route.abort；后注册路由覆盖先注册（fulfill 注入位）；截图入库 docs/v1032/；
// BASE 直连 /ios-desktop/index.html（serve.mjs 根=仓库根 —— R111 勘误同律）。

import { chromium } from 'playwright';
import fs from 'node:fs';
import { resolve } from 'node:path';

fs.mkdirSync('docs/v1032', { recursive: true });

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8100/ios-desktop/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OK_HTML = '<!doctype html><html><head><title>ext-ok</title></head><body><h1>ext-ok-page</h1></body></html>';
const API_404 = JSON.stringify({ message: 'Not Found', documentation_url: 'https://docs.github.com/rest' });
const API_403 = JSON.stringify({ message: 'API rate limit exceeded', documentation_url: 'https://docs.github.com/rest' });

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

async function newPage({ viewport = { width: 390, height: 844 } } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // 外域默认全断（CDN 挡在门外 → 同源 catalog.json 回退位生效）
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  return { ctx, page, errors };
}

async function openStore(page) {
  await page.evaluate(() => window.__shareSheet && window.__shareSheet.openAppById('appstore'));
  await sleep(1500);
}

/** 目录页添加第一个外部条目（retro-player）→ 桌面上桌 */
async function addFirstExternal(page) {
  const added = await page.evaluate(() => {
    const b = document.querySelector('[data-test="as-ext-home"] [data-as-ext-add], [data-test="as-ext-full"] [data-as-ext-add]');
    if (!b) return false;
    b.click();
    return true;
  });
  await sleep(1500);
  return added;
}

async function openFirstExternal(page) {
  await page.evaluate(() => window.__pkgInstallerAPI.openPkgApp('ext-retro-player'));
  await sleep(1500);
}

// ---------- T1 目录 11 账渲染 ----------
{
  const { ctx, page, errors } = await newPage();
  console.log('T1 目录 11 账渲染（同源回退位）');
  await openStore(page);
  const mode = await page.evaluate(() => (document.getElementById('as-cat-state') || {}).getAttribute('data-as-mode') || 'MISSING');
  t('T1-1 目录可用（CDN 断 → 同源回退）', mode !== 'MISSING' && mode !== 'down', mode);
  // 进入全量目录页（含 as-ext-full）——首页 compact 区仅 3 行
  await page.evaluate(() => {
    const btn = document.querySelector('[data-as-cat-full],[data-test="as-cat-full"]');
    if (btn) btn.click();
  });
  await sleep(1200);
  const fullN = await page.evaluate(() => document.querySelectorAll('[data-test="as-ext-full"] .md3-list-item').length);
  t('T1-2 外部全量页 11 行', fullN === 11, `got ${fullN}`);
  const names = await page.evaluate(() => (document.querySelector('[data-test="as-ext-full"]') || {}).textContent || '');
  t('T1-3 新七站在场（墨痕武道/逐字歌词工坊/纸上几何/环游世界）', ['墨痕武道', '逐字歌词工坊', '纸上几何', '环游世界'].every((n) => names.includes(n)), '');
  t('T1-4 零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
  await ctx.close();
}

// ---------- T2 真载 ok 路径 ----------
{
  const { ctx, page, errors } = await newPage();
  console.log('T2 真载 ok 路径（load 信号 → 不占位）');
  // 后注册覆盖全局 abort：外部页面 fulfill 200（探活 no-cors 亦 resolve → reachable ok）
  await page.route(/^https:\/\/ariefenv-hash\.github\.io\/retro-music-player\//, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: OK_HTML }));
  await openStore(page);
  t('T2-1 添加外部应用（retro-player）', await addFirstExternal(page), '');
  const onDesk = await page.evaluate(() => !!document.querySelector('[data-id="ext-retro-player"]'));
  t('T2-2 桌面上桌（data-id=ext-retro-player）', onDesk, '');
  await openFirstExternal(page);
  const info = await page.evaluate(() => {
    const f = document.querySelector('iframe[data-ext-guard="1"]');
    return f ? { src: f.getAttribute('src'), bound: f.dataset.extGuardBound } : null;
  });
  t('T2-3 外部壳 iframe 在场且 src 指向远程 Pages', !!info && info.src.includes('ariefenv-hash.github.io/retro-music-player'), info ? info.src : 'iframe missing');
  await sleep(1500);
  const phHidden = await page.evaluate(() => {
    const p = document.querySelector('[data-ext-placeholder]');
    return p ? p.hidden : null;
  });
  t('T2-4 load 后占位层保持 hidden（ok 判定）', phHidden === true, `hidden=${phHidden}`);
  t('T2-5 零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
  await page.screenshot({ path: 'docs/v1032/external-ok.png' });
  await ctx.close();
}

// ---------- T3 API 404 权威失联 ----------
{
  const { ctx, page, errors } = await newPage();
  console.log('T3 API 404 权威失联（仓库/Pages 已删除）');
  await page.route(/^https:\/\/api\.github\.com\/repos\//, (r) => r.fulfill({ status: 404, contentType: 'application/json', body: API_404 }));
  await openStore(page);
  await addFirstExternal(page);
  await openFirstExternal(page);
  await sleep(1500);
  const ph = await page.evaluate(() => {
    const p = document.querySelector('[data-ext-placeholder]');
    if (!p) return null;
    return { hidden: p.hidden, reason: (p.querySelector('[data-ext-placeholder-reason]') || {}).textContent || '' };
  });
  t('T3-1 占位层即现（404 权威信号，无需等看门狗）', !!ph && ph.hidden === false, ph ? `hidden=${ph.hidden}` : 'no placeholder');
  t('T3-2 判定依据文案在场（删除语义）', !!ph && (ph.reason.includes('404') || ph.reason.includes('删除')), ph ? ph.reason : '');
  t('T3-3 零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
  await page.screenshot({ path: 'docs/v1032/placeholder-404.png' });
  await ctx.close();
}

// ---------- T4 看门狗超时（探活全挂起）+ T5 重试链（同 context 状态真实演进） ----------
{
  const { ctx, page, errors } = await newPage();
  console.log('T4 看门狗超时（黑洞路由：探活双通道与页面导航全部挂起）');
  // 黑洞路由 = handler 不应答 → 请求永久 pending：探活无结论（规则 7 unknown）+
  // 页面导航挂起（load 永不发生）→ 唯一出路 = 12s 看门狗（规则 5）。
  // v10.32 勘误注记：Chromium 对 iframe 网络错误页也 fire load（error page load），
  // abort 路由下规则 6 会先行判 ok —— 看门狗路径必须用挂起（非 abort）构造。
  const blackhole = () => { /* 永不应答 */ };
  await page.route(/^https:\/\/api\.github\.com\/repos\//, blackhole);
  await page.route(/^https:\/\/ariefenv-hash\.github\.io\/retro-music-player\//, blackhole);
  await openStore(page);
  await addFirstExternal(page);
  await openFirstExternal(page);
  await sleep(600);
  const earlyHidden = await page.evaluate(() => {
    const p = document.querySelector('[data-ext-placeholder]');
    return p ? p.hidden : null;
  });
  t('T4-1 挂起态 600ms 不占位（unknown 不误伤慢网真站点）', earlyHidden === true, `hidden=${earlyHidden}`);
  console.log('T4-2 等待 12s 看门狗（真实时钟，一次性成本）…');
  await sleep(12600);
  const late = await page.evaluate(() => {
    const p = document.querySelector('[data-ext-placeholder]');
    if (!p) return null;
    return { hidden: p.hidden, reason: (p.querySelector('[data-ext-placeholder-reason]') || {}).textContent || '' };
  });
  t('T4-3 看门狗到点占位层现', !!late && late.hidden === false, late ? `hidden=${late.hidden}` : 'no placeholder');
  t('T4-4 判定依据文案在场（看门狗语义）', !!late && late.reason.includes('看门狗'), late ? late.reason : '');
  t('T4-5 零 pageerror', errors.length === 0, errors.length ? errors[0] : '');

  console.log('T5 重试链');
  // 后注册覆盖黑洞：页面 fulfill 200 → 重试后 load 到 → 占位回隐
  await page.route(/^https:\/\/ariefenv-hash\.github\.io\/retro-music-player\//, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: OK_HTML }));
  await page.evaluate(() => {
    const b = document.querySelector('[data-ext-retry]');
    if (b) b.click();
  });
  await sleep(500);
  const retrySrc = await page.evaluate(() => {
    const f = document.querySelector('iframe[data-ext-guard="1"]');
    return f ? f.getAttribute('src') : '';
  });
  t('T5-1 重试 src 携 cache-bust 参数', retrySrc.includes('md3_retry=1'), retrySrc.slice(-40));
  await sleep(1500);
  const afterRetry = await page.evaluate(() => {
    const p = document.querySelector('[data-ext-placeholder]');
    return p ? p.hidden : null;
  });
  t('T5-2 重试 load 到 → 占位层回隐', afterRetry === true, `hidden=${afterRetry}`);
  t('T5-3 零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
  await ctx.close();
}

// ---------- T6 平板 768 失联占位（准入② 档视觉留档） ----------
{
  const { ctx, page, errors } = await newPage({ viewport: { width: 768, height: 1024 } });
  console.log('T6 平板 768 失联占位');
  await openStore(page);
  await addFirstExternal(page);
  await openFirstExternal(page);
  await sleep(1800);
  const ph = await page.evaluate(() => {
    const p = document.querySelector('[data-ext-placeholder]');
    if (!p) return null;
    const rect = p.getBoundingClientRect();
    return { hidden: p.hidden, w: Math.round(rect.width), text: p.textContent || '' };
  });
  t('T6-1 直连探活拒 → 占位即现', !!ph && ph.hidden === false, ph ? `hidden=${ph.hidden}` : 'no placeholder');
  t('T6-2 占位面铺满窗口（768 宽）', !!ph && ph.w === 768, ph ? `w=${ph.w}` : '');
  t('T6-3 诚实边界注记在场', !!ph && ph.text.includes('同源策略'), '');
  t('T6-4 零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
  await page.screenshot({ path: 'docs/v1032/placeholder-tablet.png' });
  await ctx.close();
}

console.log(`\ne2e-v1032: ${pass} pass / ${fail} fail`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
