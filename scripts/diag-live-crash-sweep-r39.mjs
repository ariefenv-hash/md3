// diag-live-crash-sweep-r39.mjs — 本地诊断脚本（不入库，worklog 纪律）
// 对线上站做「用户真实流」崩溃扫荡：完整锁屏启动 → 手势解锁 → 全应用开合 → 系统面手势
// 背景：用户反馈「体验项目老是有崩溃」，但线上冷启动探针零异常（probe-live-boot）。
// 本脚本覆盖冒烟层之外的交互面，手机视口 + 触摸仿真。
// 用法：node scripts/diag-live-crash-sweep-r39.mjs [--nolock] [--shot]
import { chromium } from 'playwright';
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const NOLOCK = args.includes('--nolock');
const SHOT = args.includes('--shot');
const OUT = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'docs/diag-r39');
if (SHOT) mkdirSync(OUT, { recursive: true });

const LIVE = process.env.MD3_BASE || 'https://ariefenv-hash.github.io/md3/ios-desktop/index.html' + (NOLOCK ? '?nolock=1' : '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 应用注册表解析（与 e2e-dist-smoke 同口径：js/apps/*.js 单一真源）
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appsJsDir = path.join(root, 'ios-desktop', 'js', 'apps');
const APPS = [];
for (const f of readdirSync(appsJsDir).filter((n) => n.endsWith('.js'))) {
  const txt = readFileSync(path.join(appsJsDir, f), 'utf-8');
  const idM = txt.match(/\bid:\s*['"]([a-z0-9_-]+)['"]/);
  if (idM) APPS.push({ id: idM[1], reg: f });
}
console.log(`[diag] registry: ${APPS.length} apps parsed`);

const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

// ---------- 错误采集（带 surface 标签） ----------
let surface = 'boot';
const errors = [];
const consoleErrs = [];
const netFail = [];
page.on('pageerror', (e) => errors.push({ surface, msg: String(e).slice(0, 300) }));
page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push({ surface, msg: m.text().slice(0, 220) }); });
page.on('requestfailed', (r) => netFail.push(`${r.failure()?.errorText?.slice(0, 40)} ${r.url().slice(0, 100)}`));
page.on('crash', () => errors.push({ surface, msg: 'PAGE CRASHED (tab crash)' }));

const step = async (name, fn) => {
  surface = name;
  try { await fn(); console.log(`[ok] ${name}`); }
  catch (e) { errors.push({ surface: name, msg: 'STEP-FAIL: ' + String(e).slice(0, 200) }); console.log(`[step-fail] ${name}: ${String(e).slice(0, 120)}`); }
};

// ---------- ① 启动（真实锁屏流） ----------
await step('boot', async () => {
  await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => document.body && document.body.children.length > 5, null, { timeout: 30000 });
  await sleep(4000); // 锁屏时钟/壁纸渲染
  const locked = await page.evaluate(() => !!(window.__lockTest ? window.__lockTest.isLocked() : true)).catch(() => 'unknown');
  console.log(`[diag] lockState=${locked}`);
});

// ---------- ② 手势解锁（触摸上滑；失败则 __lockTest.instantUnlock 兑底并如实标注） ----------
await step('unlock-swipe', async () => {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 680 }] });
  for (let y = 680; y >= 160; y -= 40) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y }] });
    await sleep(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(1500);
  let locked = await page.evaluate(() => (window.__lockTest ? window.__lockTest.isLocked() : 'unknown')).catch(() => 'err');
  console.log(`[diag] after-swipe lockState=${locked}`);
  if (locked !== false) {
    console.log('[diag] gesture unlock failed → instantUnlock fallback (如实标注)');
    await page.evaluate(() => window.__lockTest && window.__lockTest.instantUnlock());
    await sleep(1200);
    locked = await page.evaluate(() => window.__lockTest.isLocked()).catch(() => 'err');
    console.log(`[diag] after-fallback lockState=${locked}`);
  }
  if (locked !== false) throw new Error('unlock did not complete (lockState=' + locked + ')');
});

// 桌面就绪探针
await step('desktop-ready', async () => {
  await page.waitForFunction(() => document.querySelectorAll('.qs-tile-pill').length > 0, null, { timeout: 20000 });
  const tiles = await page.evaluate(() => document.querySelectorAll('.qs-tile-pill').length);
  console.log(`[diag] desktop ready, tiles=${tiles}`);
});

// ---------- ③ 全应用开合扫荡 ----------
// v2（R39 接管补丁）：线上 dist 将大部分 js 模块打包进 assets/desktop-*.js 单束包，
// 裸路径动态 import 必 404（app-window/recent-apps/dual-shade 实测）→ 改真实用户路径：
// 开 = __shareSheet.openAppById（与 e2e-dist-smoke 同口径），收 = 点击 #backBtn 返回键。
// 另修：每应用 errors 清零致 SUMMARY 只剩末应用 → 新增 allErrs 持久累计。
const allErrs = [];
await step('open-close-all-apps', async () => {
  let i = 0;
  for (const app of APPS) {
    i++;
    errors.length = 0;
    consoleErrs.length = 0;
    const tag = `${i}/${APPS.length}:${app.id}`;
    try {
      await page.evaluate((id) => window.__shareSheet.openAppById(id), app.id);
      await sleep(1100);
      const st = await page.evaluate(() => ({
        iframe: !!document.querySelector('.app-window iframe, iframe.app-frame, iframe'),
        winOpen: !!document.querySelector('.app-window.open'),
      })).catch(() => ({ iframe: 'eval-err', winOpen: '?' }));
      if (!st.iframe || !st.winOpen) console.log(`[warn] ${tag} iframe=${st.iframe} winOpen=${st.winOpen}`);
      // 收场：真实用户路径 —— 点击返回键
      await page.evaluate(() => { const b = document.getElementById('backBtn'); if (b) b.click(); });
      await sleep(650);
      const stillOpen = await page.evaluate(() => !!document.querySelector('.app-window.open')).catch(() => '?');
      if (stillOpen === true) console.log(`[warn] ${tag} close-left-open`);
      const errNow = errors.map((e) => e.msg);
      const cNow = consoleErrs.map((e) => e.msg);
      if (errNow.length || cNow.length) {
        console.log(`[ERR] ${tag}`);
        errNow.forEach((m) => { console.log('   pageerror: ' + m); allErrs.push(`${tag} pageerror: ${m}`); });
        cNow.forEach((m) => { console.log('   console.error: ' + m); allErrs.push(`${tag} console.error: ${m}`); });
      }
    } catch (e) {
      console.log(`[ERR] ${tag} step-ex: ${String(e).slice(0, 140)}`);
      allErrs.push(`${tag} STEP-EX ${String(e).slice(0, 180)}`);
    }
  }
});

// ---------- ④ 系统面手势 ----------
await step('all-apps-drawer', async () => {
  await page.evaluate(() => window.__allApps.open());
  await sleep(900);
  const active = await page.evaluate(() => window.__allApps.isActive());
  if (!active) throw new Error('drawer not active');
  await page.evaluate(() => window.__allApps.close());
  await sleep(500);
});

await step('shade-pull-gesture', async () => {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 8 }] });
  for (let y = 8; y <= 500; y += 40) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y }] });
    await sleep(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(1200);
  await page.evaluate(async () => {
    const m = await import('./js/dual-shade.js').catch(() => null);
    if (m?.closePanel) m.closePanel();
    else if (m?.closePullPanels) m.closePullPanels();
  }).catch(() => {});
  await sleep(600);
});

await step('recents-gesture', async () => {
  await page.evaluate(async () => {
    const m = await import('./js/recent-apps.js').catch(() => null);
    if (m?.openRecentApps) m.openRecentApps();
  }).catch(() => {});
  await sleep(1200);
  await page.evaluate(async () => {
    const m = await import('./js/app-window.js').catch(() => null);
    if (m?.closeApp) m.closeApp();
  }).catch(() => {});
  await sleep(700);
});

// ---------- 汇总 ----------
console.log('\n========== SUMMARY ==========');
console.log(`app-sweep errors total: ${allErrs.length}`);
allErrs.slice(0, 40).forEach((m) => console.log('  ' + m));
console.log(`pageerror total: ${errors.length}`);
errors.forEach((e) => console.log(`  [${e.surface}] ${e.msg}`));
console.log(`console.error total: ${consoleErrs.length}`);
const uniqC = [...new Map(consoleErrs.map((c) => [c.surface + '|' + c.msg, c])).values()];
uniqC.slice(0, 30).forEach((c) => console.log(`  [${c.surface}] ${c.msg}`));
console.log(`requestfailed total: ${netFail.length}`);
[...new Set(netFail)].slice(0, 15).forEach((f) => console.log('  ' + f));
const alive = await page.evaluate(() => 1 + 1).then((v) => v === 2).catch(() => false);
console.log(`page alive at end: ${alive}`);
if (SHOT) await page.screenshot({ path: path.join(OUT, 'final.png') }).catch(() => {});
await browser.close();
process.exit((errors.length || allErrs.length) ? 1 : 0);
