#!/usr/bin/env node
// ==================== shot-baseline.mjs — 截图基线录制 + 指纹 diff 巡检（#256） ====================
//
// #246 建议③ 承载卡：视觉快照回归基建（基线快照 + 指纹分档告警，拦「基线被覆盖」类回归）。
// 纯逻辑（距离/分档/报告/退出码）在 scripts/lib/shot-fingerprint-core.js，本文件只做 IO：
// dist 静态服务 + Playwright 截图 + 浏览器 canvas 降采样指纹。
//
// 用法：
//   npm run shot:diff                     # diff 巡检（告警分档，恒 exit 0）
//   npm run shot:diff -- --update         # 录制/重录基线（PNG + fingerprints.json 入库）
//   npm run shot:diff -- --strict         # 巡检 + 漂移及以上才 exit 1
//   npm run shot:diff -- --apps a,b --port 8096
//
// 确定性策略（防 flaky，#256 验收③）：
//   ① 全 frame 注入 animation/transition: none + caret 透明 —— CSS 动画类闪烁（光标等）
//      回到静态声明值，两次运行像素确定性；
//   ② colorScheme=dark / locale=zh-CN / timezoneId=Asia/Shanghai / deviceScaleFactor=1
//      全部固定，防环境差异；
//   ③ goto load + 固定等待 + document.fonts.ready（e2e-dist-smoke 同款，不用 networkidle）；
//   ④ 外域请求 route.abort 断网（e2e 全程惯例）；
//   ⑤ 截图对象 = 应用 iframe 元素（壁纸不入镜 —— 程序化壁纸逐帧变化会污染整屏指纹）。
//
// 退出码：默认恒 0（告警分档非硬阻断，#235 教训 / #246 边界①）；--strict 见 core。

import { chromium } from 'playwright';
import http from 'node:http';
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FP_SIZE, DEFAULT_APPS, VIEWPORTS,
  fingerprintDistance, buildReport, renderReport, computeExitCode, parseArgs,
} from './lib/shot-fingerprint-core.js';

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const OUT_DIR = path.join(root, 'docs', 'shot-baseline');
const FP_FILE = path.join(OUT_DIR, 'fingerprints.json');
const PORT = args.port;

if (!existsSync(path.join(distDir, 'index.html'))) {
  console.error('[shot-diff] dist/ 不存在或未构建 —— 先 npm run build');
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

// ---------- 应用注册表解析（id ↔ iframe 目录，单一真源 = js/apps/*.js，e2e-dist-smoke 同款） ----------
const appsJsDir = path.join(root, 'ios-desktop', 'js', 'apps');
const REG = new Map();
for (const f of readdirSync(appsJsDir).filter((n) => n.endsWith('.js'))) {
  const txt = readFileSync(path.join(appsJsDir, f), 'utf-8');
  const idM = txt.match(/\bid:\s*['"]([a-z0-9_-]+)['"]/);
  const dirM = txt.match(/iframeAppContent\(\s*['"]apps\/([a-z0-9-]+)\/index\.html['"]/);
  if (idM && dirM) REG.set(idM[1], dirM[1]);
}
const targetIds = (args.apps && args.apps.length ? args.apps : DEFAULT_APPS)
  .filter((id) => {
    if (REG.has(id)) return true;
    console.warn(`[shot-diff] SKIP ${id}：注册表未收录（模块型应用或 id 拼写）`);
    return false;
  });
console.log(`[shot-diff] 目标组 ${targetIds.length} 家 × ${VIEWPORTS.length} 视口（模式：${args.update ? '录基线 --update' : 'diff 巡检'}）`);

// ---------- dist 静态服务（零依赖，MIME 与 e2e-dist-smoke 同表） ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
};
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let fp = path.join(distDir, urlPath);
  if (!fp.startsWith(distDir)) { res.writeHead(403); res.end(); return; }
  if (statSync(fp, { throwIfNoEntry: false })?.isDirectory()) fp = path.join(fp, 'index.html');
  try {
    const data = readFileSync(fp);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 ' + urlPath);
  }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
console.log(`[shot-diff] dist 服务就绪：http://127.0.0.1:${PORT}/`);

// ---------- 浏览器（EXE 候选与 e2e-dist-smoke 同表） ----------
const EXE_CANDIDATES = [process.env.MD3_CHROME, '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'].filter(Boolean);
const exeExists = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
const launchOpts = { headless: true };
for (const c of EXE_CANDIDATES) if (exeExists(c)) { launchOpts.executablePath = c; break; }
const browser = await chromium.launch(launchOpts);

const SHELL = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// CSS 动画冻结（确定性策略①）：animation/transition 归零回到静态声明值 + caret 透明
const FREEZE_CSS = '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }';

/** 浏览器即 PNG 解码器：base64 PNG → createImageBitmap → FP_SIZE×FP_SIZE canvas 亮度降采样 */
async function pngToFingerprint(page, pngBuffer) {
  const b64 = pngBuffer.toString('base64');
  return page.evaluate(async ({ b64, size }) => {
    const bin = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const bmp = await createImageBitmap(new Blob([bin], { type: 'image/png' }));
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(bmp, 0, 0, size, size);
    const d = cx.getImageData(0, 0, size, size).data;
    const fp = [];
    for (let i = 0; i < d.length; i += 4) {
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      fp.push(Math.round(lum * 10000) / 10000);
    }
    bmp.close && bmp.close();
    return fp;
  }, { b64, size: FP_SIZE });
}

/** 全 frame 注入冻结 CSS + 等字体就绪（确定性策略①③） */
async function freezeFrames(page) {
  for (const fr of page.frames()) {
    await fr.evaluate((css) => {
      const s = document.createElement('style');
      s.setAttribute('data-shot-freeze', '1');
      s.textContent = css;
      document.head && document.head.appendChild(s);
    }, FREEZE_CSS).catch(() => {});
    await fr.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  }
}

const currents = [];
let pngCount = 0;

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  });
  for (const id of targetIds) {
    const dir = REG.get(id);
    const key = `${id}-${vp.name}`;
    let entry = { key, app: id, vp: vp.name, ok: false };
    try {
      const page = await ctx.newPage();
      await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
      const errs = [];
      page.on('pageerror', (e) => errs.push(String(e)));
      await page.goto(SHELL, { waitUntil: 'load', timeout: 30000 });
      await sleep(1500);
      await page.evaluate((aid) => window.__shareSheet.openAppById(aid), id);
      await sleep(1500);
      await freezeFrames(page);
      await sleep(300);
      const appFrame = page.frames().find((f) => f.url().includes(`apps/${dir}/index.html`));
      if (!appFrame) throw new Error('iframe 未挂载');
      const el = await appFrame.frameElement();
      const shot = await el.screenshot();
      const size = await appFrame.evaluate(() => [document.documentElement.clientWidth, document.documentElement.clientHeight]);
      const fp = await pngToFingerprint(page, shot);
      if (errs.length) throw new Error(`pageerror×${errs.length}: ${errs[0].slice(0, 120)}`);
      entry = { key, app: id, vp: vp.name, ok: true, fp, size };
      if (args.update) {
        writeFileSync(path.join(OUT_DIR, `${key}.png`), shot);
        pngCount++;
      }
      await page.close();
    } catch (e) {
      entry.why = `流程异常：${String(e).slice(0, 140)}`;
    }
    currents.push(entry);
    console.log(`  ${entry.ok ? 'SHOT' : 'FAIL '} ${key}${entry.ok ? '' : ' — ' + entry.why}`);
  }
  await ctx.close();
}
await browser.close();
server.close();

// ---------- 基线写档 / diff 巡检 ----------
if (args.update) {
  const prev = existsSync(FP_FILE) ? JSON.parse(readFileSync(FP_FILE, 'utf-8')) : {};
  const entries = prev.entries && typeof prev.entries === 'object' ? prev.entries : {};
  for (const c of currents) {
    if (c.ok) entries[c.key] = { app: c.app, vp: c.vp, size: c.size, fp: c.fp, at: new Date().toISOString() };
  }
  writeFileSync(FP_FILE, JSON.stringify({
    version: 1, fpSize: FP_SIZE,
    thresholds: { drift: 0.02, major: 0.08 },
    entries,
  }, null, 1));
  console.log(`[shot-diff] 基线写档：${pngCount} PNG → docs/shot-baseline/ + fingerprints.json 共 ${Object.keys(entries).length} 条目`);
  process.exit(0);
}

let baselines = {};
try { baselines = (JSON.parse(readFileSync(FP_FILE, 'utf-8'))).entries || {}; } catch { baselines = {}; }
const report = buildReport(currents, baselines);
console.log(renderReport(report));
process.exit(computeExitCode(report, args.strict));
