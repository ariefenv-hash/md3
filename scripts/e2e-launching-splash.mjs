// ==================== e2e-launching-splash.mjs — 根壳 LAUNCHING 启动屏真实回归 ====================
//
// 背景：站点摘要工具/用户快速访问时看到的「安卓16极客 L A U N C H I N G」是**根壳
// index.html 的 .splash**（L1），与 #225 修的「应用窗口 .app-launch-screen」（L2）是两层
// 不同 DOM。本探针把 L1 纳入自动化，防止再度把两者混淆、也防止启动屏常驻回归。
// 实证报告：docs/audits/launching-boot-audit.md
//
// 用法：
//   MD3_CHROME=/usr/bin/google-chrome node scripts/e2e-launching-splash.mjs
//   BASE=http://127.0.0.1:8081 node scripts/e2e-launching-splash.mjs   # 复用已起的服务
// 退出码：0 = 全绿；1 = 任一断言失败
//
// 说明：外域天气 API 在离线沙箱被 CSP 拦下属预期噪声，只严查 pageerror（零过滤）。

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res, rej) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  s.on('error', rej);
});

const CHROME = [
  process.env.MD3_CHROME,
  chromium.executablePath(),
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && existsSync(p));
if (!CHROME) { console.error('[launching] 找不到 Chromium，可设 MD3_CHROME'); process.exit(1); }

let BASE = process.env.BASE;
let server = null;
if (!BASE) {
  const port = await freePort();
  BASE = `http://127.0.0.1:${port}`;
  server = spawn('node', [join(ROOT, 'scripts', 'serve.mjs'), '--no-open', '--port', String(port)], { cwd: ROOT, stdio: 'ignore' });
  await sleep(1200);
}

const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const results = { runs: [], openWindow: null, clock: null, hardErrors: [], consoleNoise: [] };
const hard = (m) => { results.hardErrors.push(m); console.error('  ✗ ' + m); };

// ---------- L1：三轮冷启动，采样 splash 释放 与 桌面图标挂载 ----------
for (let run = 1; run <= 3; run++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') results.consoleNoise.push(m.text().slice(0, 120)); });

  const t0 = Date.now();
  await page.goto(`${BASE}/index.html`, { waitUntil: 'commit' });
  let hiddenAt = null, iconsAt = null, finalVis = null, readyFinal = null, iconCount = 0;

  for (let i = 0; i < 32; i++) {
    const target = i * 200;
    const wait = target - (Date.now() - t0);
    if (wait > 0) await sleep(wait);
    const s = await page.evaluate(() => {
      const sp = document.getElementById('splash');
      let desk = null;
      try {
        const d = document.getElementById('sim-iframe')?.contentDocument;
        if (d) desk = { ready: d.readyState, icons: d.querySelectorAll('.app-icon').length };
      } catch { desk = null; }
      return {
        hidden: sp ? sp.classList.contains('splash-hide') : null,
        vis: sp ? getComputedStyle(sp).visibility : null,
        desk,
      };
    }).catch(() => ({}));
    const t = Date.now() - t0;
    if (s.hidden && hiddenAt === null) hiddenAt = t;
    if (s.desk?.icons > 0 && iconsAt === null) iconsAt = { t, count: s.desk.icons };
    if (s.desk) { readyFinal = s.desk.ready; iconCount = s.desk.icons; }
    finalVis = s.vis ?? finalVis;
    if (hiddenAt !== null && s.vis === 'hidden') break;
    if (t > 9000) break;
  }

  const row = { run, hiddenAt, iconsAt, finalVis, readyFinal, iconCount, pageerrors: errs.length };
  results.runs.push(row);
  console.log(`  run ${run}: splash 隐藏 ${hiddenAt}ms · 图标 ${iconCount} 个挂载于 ${iconsAt?.t}ms · 终态 ${finalVis} · pageerror ${errs.length}`);
  if (hiddenAt === null) hard(`run ${run}: splash 从未进入 splash-hide（疑似常驻）`);
  if (finalVis !== 'hidden') hard(`run ${run}: splash 最终仍 ${finalVis}`);
  if (iconCount < 40) hard(`run ${run}: 桌面图标仅 ${iconCount} 个（预期 ~52）`);
  if (errs.length) hard(`run ${run}: pageerror ${errs.length} 条 → ${errs[0]}`);
  await ctx.close();
}

// ---------- L2：#225 开窗终值 ----------
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
  await page.goto(`${BASE}/index.html?nolock=1`, { waitUntil: 'commit' });
  await sleep(4200);
  const frame = page.frames().find((f) => f.url().includes('ios-desktop/index.html'));
  if (!frame) hard('#225: 桌面 iframe 未找到');
  else {
    const opened = await frame.evaluate(() => {
      if (typeof window.openAppById === 'function') { window.openAppById('messages'); return 'openAppById'; }
      const icon = document.querySelector('.app-icon');
      if (icon) { icon.click(); return 'icon-click'; }
      return 'none';
    }).catch(() => 'err');
    await sleep(2600);
    const w = await frame.evaluate(() => {
      const el = document.querySelector('.app-window');
      const ls = document.querySelector('.app-launch-screen');
      let inner = null;
      try { const f = document.querySelector('.app-window iframe'); inner = f?.contentDocument?.documentElement?.outerHTML?.length ?? null; } catch { inner = null; }
      return {
        w: el ? Math.round(el.getBoundingClientRect().width) : null,
        h: el ? Math.round(el.getBoundingClientRect().height) : null,
        cls: el?.className ?? null,
        launchOpacity: ls ? getComputedStyle(ls).opacity : null,
        inner,
      };
    }).catch(() => ({}));
    results.openWindow = { opened, ...w, pageerrors: errs.length };
    console.log(`  #225 开窗: ${w.w}×${w.h} · ${w.cls} · launchOpacity=${w.launchOpacity} · 内部文档 ${w.inner} 字符`);
    if (!w.w || w.w < 300) hard(`#225: 窗口宽度 ${w.w}，疑似停在图标起始帧`);
    if (w.launchOpacity !== '0') hard(`#225: 启动画面 opacity=${w.launchOpacity}，疑似常驻遮挡`);
    if (errs.length) hard(`#225: pageerror ${errs.length} 条`);
  }
  await ctx.close();
} catch (e) { hard('#225 探针异常：' + String(e).slice(0, 140)); }

// ---------- #226：时钟直载 ----------
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
  await page.goto(`${BASE}/ios-desktop/apps/clock-app/index.html`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await sleep(1600);
  const info = await page.evaluate(() => ({
    coreReady: !!window.__clockCore,
    hasMask: !!document.querySelector('#clockCoreErrorMask'),
    tabs: document.querySelectorAll('[data-tab], .clock-tab').length,
    text: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 80),
  })).catch(() => ({}));
  results.clock = { ...info, pageerrors: errs.length };
  console.log(`  #226 时钟: core=${info.coreReady} · 遮罩=${info.hasMask} · tabs=${info.tabs} · pageerror=${errs.length}`);
  if (errs.length) hard(`#226: 时钟整图崩塌复现 → ${errs[0]}`);
  if (!info.coreReady) hard('#226: __clockCore 未就绪');
  if (info.hasMask) hard('#226: 降级遮罩出现（正常路径不应触发）');
  await ctx.close();
} catch (e) { hard('#226 探针异常：' + String(e).slice(0, 140)); }

await browser.close();
if (server) server.kill('SIGKILL');

console.log(`\n[launching] 三轮 splash 隐藏时刻：${results.runs.map((r) => r.hiddenAt).join(' / ')} ms`);
console.log(`[launching] 外域 console 噪声 ${results.consoleNoise.length} 条（离线沙箱预期，不计入失败）`);
if (results.hardErrors.length) {
  console.error(`[launching] FAIL：${results.hardErrors.length} 项`);
  process.exit(1);
}
console.log('[launching] PASS：L1 正常释放 / 桌面图标挂载 / L2 开窗全屏 / 时钟零崩塌');
