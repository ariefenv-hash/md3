// ==================== diag-324-files-sheet.mjs — #324 分屏下文件二级菜单「上浮层阴影」成因取证 ====================
// 三场景对照（卡面 §三-3）：全屏窗口 / 分屏左 pane / 分屏右 pane ——
// 采样 fj-sheet 及其祖先链的 computed boxShadow/isolation/transform/contain/filter + 视口截图。
// 用法：node scripts/diag-324-files-sheet.mjs [--port 8096] [--out /tmp/diag324]
import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const argOf = (k, d) => { const i = args.indexOf(k); return i !== -1 ? args[i + 1] : d; };
const PORT = Number(argOf('--port', 8096));
const OUT = argOf('--out', '/tmp/diag324');
const PHASE = argOf('--phase', 'A');
mkdirSync(OUT, { recursive: true });

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let fp = path.join(distDir, urlPath);
  if (!fp.startsWith(distDir)) { res.writeHead(403); res.end(); return; }
  if (statSync(fp, { throwIfNoEntry: false })?.isDirectory()) fp = path.join(fp, 'index.html');
  try { res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(readFileSync(fp)); }
  catch (e) { if (!res.headersSent) { res.writeHead(404); res.end('404'); } }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

function resolveChromium() {
  if (process.env.MD3_PW_EXECUTABLE) return process.env.MD3_PW_EXECUTABLE;
  for (const rev of ['1200', '1248']) {
    const p = `${process.env.HOME}/.cache/ms-playwright/chromium-${rev}/chrome-linux64/chrome`;
    if (existsSync(p)) return p;
  }
  return undefined;
}
const browser = await chromium.launch({ executablePath: resolveChromium() });
const page = await browser.newPage({ viewport: { width: 820, height: 1180 } }); // 平板档（分屏适配面）
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 160)));
page.on('crash', () => console.log('[PAGE CRASHED]'));
await page.goto(`http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`, { waitUntil: 'load' });
await page.waitForTimeout(1500);

const SAMPLE = (idPrefix) => {
  const pane = document.querySelector('.split-pane[data-app-id="' + idPrefix + '"], .split-pane[data-id="' + idPrefix + '"]') ||
               [...document.querySelectorAll('.split-pane')].find(p => (p.dataset.appId === idPrefix || p.getAttribute('data-app') === idPrefix || p.id.includes(idPrefix)));
  const rootDoc = pane || document;
  const sheet = rootDoc.querySelector('.fj-sheet');
  if (!sheet) return { err: 'no .fj-sheet' };
  const chain = [];
  let el = sheet;
  while (el && chain.length < 10) {
    const cs = getComputedStyle(el);
    chain.push({
      sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).slice(0, 3).join('.') : ''),
      boxShadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow,
      filter: cs.filter,
      transform: cs.transform === 'none' ? 'none' : cs.transform.slice(0, 60),
      isolation: cs.isolation,
      contain: cs.contain,
      zIndex: cs.zIndex,
    });
    el = el.parentElement;
  }
  return { chain };
};

async function openFilesAndSheet(inSplit) {
  if (inSplit) {
    console.log('[B] pre-import alive check:', await page.evaluate(() => 'alive ' + location.pathname).catch((e) => 'DEAD: ' + e.message.slice(0, 80)));
    page.on('close', () => console.log('[event] page close fired'));
    browser.on('disconnected', () => console.log('[event] browser disconnected'));
    process.on('exit', () => console.log('[event] node process exit'));
    const loaded = await page.evaluate(async () => {
      // dist 档：vite 动态 import 重写为 assets chunk（源码档动态 import 真身在 ios-desktop/js/，
      // dist/ios-desktop/js/ 无此文件 —— 404 路径尝试会触发页面关闭，实证直连 chunk 安全）
      const chunks = [...document.querySelectorAll('script[src]')]
        .map((x) => x.getAttribute('src'))
        .filter((x) => x && x.includes('desktop'));
      void chunks;
      const base = location.pathname.replace(/index\.html.*$/, '');
      try { const _chunkUrl = await (async () => {
        const base = location.pathname.replace(/index\.html.*$/, '');
        const m = await (await fetch(base + '../precache-manifest.json')).json();
        const u = JSON.stringify(Object.values(m).flat()).match(/assets\/split-screen-[A-Za-z0-9_-]+\.js/)[0];
        return base + '../' + u;
      })();
      await import(_chunkUrl);; } catch (e) { return 'import-fail:' + String(e && e.message || e).slice(0, 120); }
      return 'splitE2E=' + typeof window.__splitE2E;
    });
    console.log('[splitE2E type]', String(loaded));
    console.log('[splitE2E type]', String(loaded));
    const sr = await page.evaluate(() => { try { return window.__splitE2E.enter('files', 'notes'); } catch (e) { return 'ERR ' + String(e && e.stack || e).slice(0, 300); } });
    console.log('[enter split]', String(sr).slice(0, 200));
    await page.waitForTimeout(1600);
    // 找 files pane 的排序按钮
    const ok = await page.evaluate(() => {
      const panes = [...document.querySelectorAll('.split-pane')];
      const filesPane = panes.find(p => p.querySelector('.fj-app'));
      if (!filesPane) return false;
      const btn = filesPane.querySelector('#fjBtnSort');
      if (!btn) return false;
      btn.click();
      return true;
    });
    if (!ok) return { err: 'files pane or #fjBtnSort not found' };
    await page.waitForTimeout(700);
    return await page.evaluate(SAMPLE, 'files');
  }
  // 全屏：直接开 files → 浏览页 → 排序 sheet
  const r1 = await page.evaluate(() => { try { return { ok: !!window.__shareSheet.openAppById('files') }; } catch (e) { return { err: String(e && e.stack || e).slice(0, 400) }; } });
  console.log('[open files]', JSON.stringify(r1).slice(0, 300));
  await page.waitForTimeout(1500);
  const r2 = await page.evaluate(() => { try { const w = [...document.querySelectorAll('.app-window.open')][0]; const doc = w || document; const browse = doc.querySelector('.fj-ritem[data-tab="2"]'); if (browse) browse.click(); return { clicked: !!browse }; } catch (e) { return { err: String(e && e.stack || e).slice(0, 400) }; } });
  console.log('[browse click]', JSON.stringify(r2).slice(0, 300));
  await page.waitForTimeout(500);
  const r3 = await page.evaluate(() => { try { const btn = document.querySelector('#fjBtnSort'); if (btn) btn.click(); return { clicked: !!btn, sheetOn: !!(document.querySelector('#fjSheetWrap')||{}).className }; } catch (e) { return { err: String(e && e.stack || e).slice(0, 400) }; } });
  console.log('[sort click]', JSON.stringify(r3).slice(0, 300));
  await page.waitForTimeout(700);
  let out;
  try {
    const pr = page.evaluate(SAMPLE, 'files');
    console.log('[eval type]', typeof pr);
    out = await pr;
  } catch (e) {
    console.log('[sample threw]', e && e.message);
    out = { err: String(e && e.stack || e).slice(0, 600) };
  }
  console.log('[fullscreen sample]', String(JSON.stringify(out)).slice(0, 300));
  return out;
}

const report = {};

async function runPhase() {
  if (PHASE === 'A') {
    console.log('===== 场景 A：全屏窗口 =====');
    try { report.fullscreen = await openFilesAndSheet(false); } catch (e) { report.fullscreen = { err: String(e && e.stack || e).slice(0, 600) }; }
    console.log(String(JSON.stringify(report.fullscreen, null, 1)).slice(0, 2400));
    await page.screenshot({ path: path.join(OUT, 'A-fullscreen-sheet.png') });
    writeFileSync(path.join(OUT, 'report-A.json'), JSON.stringify(report, null, 1));
  } else {
    console.log('===== 场景 B/C：分屏 files pane =====');
    try { report.split = await openFilesAndSheet(true); } catch (e) { report.split = { err: String(e && e.stack || e).slice(0, 600) }; }
    console.log(String(JSON.stringify(report.split, null, 1)).slice(0, 3000));
    await page.screenshot({ path: path.join(OUT, 'B-split-sheet.png') });
    writeFileSync(path.join(OUT, 'report-B.json'), JSON.stringify(report, null, 1));
  }
}
await runPhase();
await browser.close().catch(() => {});
server.close();
console.log('[diag324] 完成，产物 →', OUT);
