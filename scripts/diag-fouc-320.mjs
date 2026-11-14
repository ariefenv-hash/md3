// ==================== diag-fouc-320.mjs — #320 首帧令牌闪烁逐帧取证 ====================
// #320 DoD 取证①：Playwright 真实时间线，逐帧采
//   a) 启动屏 opacity（掩护是否在位）
//   b) 子 iframe 文档 --md-primary 计算值（令牌是否已注入/是否当前主题值）
//   c) 主壳 pageStack opacity（内容可见性）
//   d) 视口中心像素（screencast 帧证据，落盘 PNG 序列）
// 采样在页面内 rAF 循环完成（免 CDP 往返失真），窗口外只做 screencast 收帧。
// 用法：node scripts/diag-fouc-320.mjs [--port 8093] [--app msg] [--out /tmp/fouc]
// 退出码：0=取证完成（无论是否发现闪烁）；1=流程失败

import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const argOf = (k, d) => { const i = args.indexOf(k); return i !== -1 ? args[i + 1] : d; };
const PORT = Number(argOf('--port', 8093));
const APP = argOf('--app', 'msg');
const OUT = argOf('--out', '/tmp/fouc-diag');
const HUE = Number(argOf('--hue', 320)); // 粉紫主题，与默认 215 蓝拉开距离
mkdirSync(OUT, { recursive: true });

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
if (!existsSync(path.join(distDir, 'index.html'))) {
  console.error('[diag] dist/ 不存在 —— 先 npm run build');
  process.exit(1);
}
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let fp = path.join(distDir, urlPath);
  if (!fp.startsWith(distDir)) { res.writeHead(403); res.end(); return; }
  if (statSync(fp, { throwIfNoEntry: false })?.isDirectory()) fp = path.join(fp, 'index.html');
  try {
    const data = readFileSync(fp);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

// 沙箱浏览器解析：仓库 playwright 1.64 期望 revision 1248 未装，沙箱预装 chromium-1200
// → 环境变量 MD3_PW_EXECUTABLE 或常见预装路径直连 executablePath（e2e 惯例零下载纪律）
function resolveChromium() {
  if (process.env.MD3_PW_EXECUTABLE) return process.env.MD3_PW_EXECUTABLE;
  for (const rev of ['1200', '1248', '1194']) {
    const p = `${process.env.HOME}/.cache/ms-playwright/chromium-${rev}/chrome-linux64/chrome`;
    if (existsSync(p)) return p;
  }
  return undefined; // playwright 默认解析
}

const browser = await chromium.launch({ executablePath: resolveChromium(), args: ['--disable-accelerated-2d-canvas'] });
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 160)));

await page.goto(`http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1200); // 桌面稳定

// 设定与默认色相(215)差距大的主题色 → 任何「默认令牌帧」都会在 --md-primary 上现形
await page.evaluate((hue) => {
  try { window.__themeHueTest && window.__themeHueTest.set(hue); } catch (e) {}
}, HUE);
await page.waitForTimeout(300);

// 启动 screencast（像素证据）
const cdp = await page.context().newCDPSession(page);
const framePngs = [];
cdp.on('Page.screencastFrame', async (ev) => {
  framePngs.push({ ts: Date.now(), data: ev.data, metadata: ev.metadata });
  try { await cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId }); } catch (e) {}
});
await cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });

// 页面内 rAF 采样器：开窗瞬间开始记录
const SAMPLE = `
(() => {
  window.__fouc = { t0: null, samples: [], openDone: false };
  const rec = () => {
    const S = window.__fouc;
    if (!S.openDone) { requestAnimationFrame(rec); return; }
    const now = performance.now();
    if (S.t0 === null) S.t0 = now;
    const t = now - S.t0;
    const ls = document.querySelector('.app-window.open .app-launch-screen') || document.querySelector('.app-launch-screen');
    const ps = document.querySelector('.app-window.open .page-stack');
    const win = document.querySelector('.app-window.open');
    let frame = null;
    if (win) { frame = win.querySelector('iframe'); }
    let primary = null, docReady = false, bodyBg = null;
    try {
      if (frame && frame.dataset.loaded === '1') {
        const d = frame.contentDocument;
        if (d && d.documentElement) {
          docReady = true;
          primary = getComputedStyle(d.documentElement).getPropertyValue('--md-primary').trim() || '(empty)';
          bodyBg = getComputedStyle(d.body).backgroundColor;
        }
      }
    } catch (e) { primary = 'ERR:' + e.message; }
    S.samples.push({
      t: Math.round(t * 10) / 10,
      launchOp: ls ? (parseFloat(ls.style.opacity) !== undefined && ls.style.opacity !== '' ? parseFloat(ls.style.opacity) : getComputedStyle(ls).opacity) : null,
      contentOp: ps ? ps.style.opacity : null,
      iframeLoaded: !!(frame && frame.dataset.loaded === '1'),
      docReady,
      primary,
      bodyBg,
    });
    if (t < 3000) requestAnimationFrame(rec);
    else S.done = true;
  };
  requestAnimationFrame(rec);
})();
`;
await page.evaluate(SAMPLE);

// 冷开窗（首次打开该应用）—— 入口与 e2e-dist-smoke 同源：window.__shareSheet.openAppById
const tOpen = Date.now();
await page.evaluate((appId) => {
  const fn = window.__shareSheet && window.__shareSheet.openAppById;
  if (typeof fn === 'function') { fn(appId); return 'fn'; }
  throw new Error('openApp 入口不可用');
}, APP);
await page.evaluate(() => { if (window.__fouc) window.__fouc.openDone = true; });

// 等采样完成（3s 窗口）
await page.waitForFunction(() => window.__fouc && window.__fouc.done, { timeout: 8000 });
const samples = await page.evaluate(() => window.__fouc.samples);
await cdp.send('Page.stopScreencast');
await browser.close();
server.close();

// 落盘
writeFileSync(path.join(OUT, 'samples.json'), JSON.stringify({ hue: HUE, app: APP, tOpen, samples }, null, 1));
console.log(`[diag] 采样 ${samples.length} 帧 → ${OUT}/samples.json`);

// 分析：可见帧（contentOp>0.05 或 launchOp<0.95）中令牌非当前主题色的窗口
const HUE_PRIMARY = `hsl(${HUE}`;
let visibleNoToken = 0, visibleNoTokenFrames = [];
for (const s of samples) {
  const contentVisible = (s.contentOp !== null && parseFloat(s.contentOp) > 0.05) || (s.launchOp !== null && parseFloat(s.launchOp) < 0.95);
  const tokenOk = s.primary && String(s.primary).includes(HUE_PRIMARY);
  if (contentVisible && s.docReady && !tokenOk) { visibleNoToken++; visibleNoTokenFrames.push(s); }
}
console.log(`[diag] 内容可见且令牌≠当前主题(${HUE}) 的帧数: ${visibleNoToken}`);
if (visibleNoTokenFrames.length) {
  console.log(`  首帧 t=${visibleNoTokenFrames[0].t}ms primary=${visibleNoTokenFrames[0].primary} launchOp=${visibleNoTokenFrames[0].launchOp} contentOp=${visibleNoTokenFrames[0].contentOp}`);
  console.log(`  末帧 t=${visibleNoTokenFrames[visibleNoTokenFrames.length - 1].t}ms primary=${visibleNoTokenFrames[visibleNoTokenFrames.length - 1].primary}`);
}
// 令牌注入时刻与启动屏释放时刻
const firstToken = samples.find((s) => s.docReady && s.primary && String(s.primary).includes(HUE_PRIMARY));
const firstVisible = samples.find((s) => (s.contentOp !== null && parseFloat(s.contentOp) > 0.05) || (s.launchOp !== null && parseFloat(s.launchOp) < 0.95));
console.log(`[diag] 首个可见帧: t=${firstVisible ? firstVisible.t + 'ms' : '无'} 首个当前主题令牌帧: t=${firstToken ? firstToken.t + 'ms' : '3s 内未出现'}`);
console.log(`[diag] screencast 帧: ${framePngs.length}（PNG 未逐帧落盘，证据以 samples.json 为准）`);
process.exit(0);
