// ==================== probe-anim-discontinuity.mjs — 开/关动画中间不连贯 逐帧取证探针 ====================
// 用户报障：打开/关闭动画中间不连贯。本探针在真实页面逐帧采样 render() 写入的样式值，
// 计算帧间跳变，定位不连续帧并与事件（iframe load / watchdog release / blur 路径切换）对齐。
// 纯诊断，不入 CI。

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/anim-probe');
mkdirSync(OUT, { recursive: true });
const PORT = 8123;
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 静态服务（零依赖 http）
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const ROOT = root;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const server = http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const fp = path.join(ROOT, p);
    const st = await stat(fp).catch(() => null);
    const file = st && st.isFile() ? fp : path.join(ROOT, p.replace(/\/[^/]*$/, '/index.html'));
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch (e) { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
console.log(`serve :${PORT}`);

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 900, height: 800 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());

// 采样器：挂在 rAF 上逐帧记录 render() 写入的内联样式 + 引擎状态
const SAMPLER = `
window.__animLog = [];
window.__loadEvents = [];
document.addEventListener('load', (ev) => {
  if (ev.target && ev.target.tagName === 'IFRAME') {
    window.__loadEvents.push({ t: performance.now(), src: (ev.target.getAttribute('src')||'').slice(0,60) });
  }
}, true);
(function startSampler() {
  const win = document.getElementById('appWindow');
  const launch = document.getElementById('appLaunchScreen');
  const header = document.getElementById('appHeader');
  const ps = document.getElementById('pageStack');
  const rec = () => {
    const log = window.__animLog;
    if (log.length < 4000) {
      log.push({
        t: Math.round(performance.now()*10)/10,
        wOp: win ? win.style.opacity : '',
        wTf: win ? (win.style.transform||'').slice(0,110) : '',
        lOp: launch ? getComputedStyle(launch).opacity : '',
        hOp: header ? header.style.opacity : '',
        cOp: ps ? ps.style.opacity : '',
      });
    }
    requestAnimationFrame(rec);
  };
  requestAnimationFrame(rec);
})();
`;

async function armSampler() {
  await page.evaluate(`(() => { if (window.__animLog) { window.__animLog = []; } })()`);
  await page.evaluate(SAMPLER);
}

function analyze(log, label) {
  console.log(`\n===== ${label}：${log.length} 帧采样 =====`);
  const issues = [];
  let prev = null;
  let hardCut = 0;
  let minLaunch = 1, maxLaunch = 0;
  let fadeT0 = null, fadeT1 = null;
  for (const f of log) {
    if (prev) {
      const dt = f.t - prev.t;
      const num = (s) => (s === '' || s === null ? NaN : parseFloat(s));
      const lOp = num(f.lOp), pL = num(prev.lOp);
      const dC = num(f.cOp) - num(prev.cOp);
      const dW = num(f.wOp) - num(prev.wOp);
      // 硬切判定：单帧跨 >0.7 且跨过中点（如 1→0.1），或任何 >0.85 的单帧变化
      if (Number.isFinite(lOp) && Number.isFinite(pL)) {
        const d = lOp - pL;
        minLaunch = Math.min(minLaunch, lOp); maxLaunch = Math.max(maxLaunch, lOp);
        if (Math.abs(d) > 0.85 || (Math.abs(d) > 0.7 && ((pL - 0.5) * (lOp - 0.5) < 0))) { hardCut++; issues.push({ kind: 'HARD_CUT', t: f.t, from: pL, to: lOp, dt: Math.round(dt) }); }
        if (lOp > 0.02 && lOp < 0.98) { if (fadeT0 === null) fadeT0 = prev.t; fadeT1 = f.t; }
      }
      if (Math.abs(dC) > 0.85) issues.push({ kind: 'CONTENT_CUT', t: f.t, from: prev.cOp, to: f.cOp, dt: Math.round(dt) });
      if (Math.abs(dW) > 0.85) issues.push({ kind: 'WINOP_CUT', t: f.t, from: prev.wOp, to: f.wOp, dt: Math.round(dt) });
      if (dt > 150) issues.push({ kind: 'STALL', t: f.t, dt: Math.round(dt) });
    }
    prev = f;
  }
  const fadeDur = fadeT0 !== null && fadeT1 !== null ? Math.round(fadeT1 - fadeT0) : null;
  console.log(`  硬切帧: ${hardCut} | 启动屏淡化墙钟跨度: ${fadeDur !== null ? fadeDur + 'ms' : 'n/a'} | 采样帧均间隔约 ${(log.length > 1 ? Math.round((log[log.length-1].t - log[0].t) / (log.length-1)) : 0)}ms`);
  if (issues.length === 0) console.log('  ✅ 无硬切、无长停顿');
  for (const i of issues) console.log('  ', JSON.stringify(i));
  return { hardCut, fadeDur };
}

// ---------- 场景 1：冷启动打开（首次打开 iframe 应用） ----------
console.log('\n########## 场景1 冷启动打开 ##########');
await page.goto(`http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`, { waitUntil: 'networkidle' }).catch(() => {});
await sleep(1200);
await armSampler();
const clickT = await page.evaluate(() => { performance.mark('probe-click'); return Math.round(performance.now()); });
await page.click('.app-icon[data-id="msg"]', { force: true });
await sleep(1600);
const logOpen = await page.evaluate(() => window.__animLog.splice(0, 4000));
const loadEv = await page.evaluate(() => window.__loadEvents);
console.log('click t =', clickT, '| iframe load events:', JSON.stringify(loadEv));
analyze(logOpen, '冷启动打开');
console.log('前 26 帧明细:');
for (const f of logOpen.slice(0, 26)) console.log(`  t=${f.t} lOp=${f.lOp} hOp=${f.hOp} cOp=${f.cOp} wOp=${f.wOp} tf=${f.wTf.slice(0,70)}`);

// ---------- 场景 2：关闭 ----------
console.log('\n########## 场景2 关闭 ##########');
await armSampler();
await page.evaluate(() => import('/ios-desktop/js/app-window.js').then((m) => { m.closeApp(0, 0, 0); return true; }));
await sleep(1000);
const logClose = await page.evaluate(() => window.__animLog.splice(0, 4000));
analyze(logClose, '关闭');
console.log('前 22 帧明细:');
for (const f of logClose.slice(0, 22)) console.log(`  t=${f.t} lOp=${f.lOp} hOp=${f.hOp} cOp=${f.cOp} wOp=${f.wOp} tf=${f.wTf.slice(0,70)} dFl=${f.dFl}`);

// ---------- 场景 3：温热再次打开 ----------
console.log('\n########## 场景3 温热再开 ##########');
await armSampler();
await page.click('.app-icon[data-id="msg"]', { force: true });
await sleep(1200);
const logWarm = await page.evaluate(() => window.__animLog.splice(0, 4000));
analyze(logWarm, '温热再开');

// ---------- 场景 4：快速开关打断（开到中段关） ----------
console.log('\n########## 场景4 开到中段打断关闭 ##########');
await page.evaluate(() => { window.__animLog = []; });
await armSampler();
await page.click('.app-icon[data-id="calculator"]', { force: true });
await sleep(200);
await page.evaluate(() => import('/ios-desktop/js/app-window.js').then((m) => { m.closeApp(0, 0, 0); return true; }));
await sleep(1000);
const logInt = await page.evaluate(() => window.__animLog.splice(0, 4000));
analyze(logInt, '中段打断');

console.log('\npageerrors:', errors.length ? errors : '0');
await browser.close();
server.close();
console.log('done');
