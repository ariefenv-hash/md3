// ==================== e2e-v223-version-live.mjs — #223 版本单一真源运行时链路无头回归 ====================
//
// 定位（v10.41 轻量加餐 · 实例 C 让位补产）：实例 B v10.40 = cf51ede6 已交付 #223
// 静态面三防线（audit-version-consumers / migrate 幂等迁移 / v223 vitest 11 例）；
// 本脚本补【运行时真链路】一档 —— 真实 Chromium 内验证「package.json 真源 →
// vite 构建注入 → dist/sw.js → 设置页 fetch 提取 → 系统版本行渲染」端到端逐字一致，
// 与 B 的静态 C3「dist 产物必为已注入形态」互补（静态锚过 ≠ 渲染链通）。
//
// DoD（#223 验收口径 · dist 部署档真链路）：
//   R0. dist/sw.js 的 VERSION 常量 = package.json 真源展示形（逐字一致，动态推导无版本字面量）
//   R1. dist/sw.js 的 __BUILD_ID__ 已被构建替换（非占位符字面量）
//   R2. CACHE_NAME 组成 = geek-cache-${VERSION}-${BUILD_ID}（真源段 + 构建段双段完整）
//   R3. 设置 › 开发者选项「系统版本」行 = `Android16 Geek · ${VERSION} · build ${BUILD_ID}`
//       （settings.js fetch ../sw.js → const VERSION 提取链路在 dist 档端到端可用）
//   R4. 全程零 pageerror + 截图 ×1
//
// 用法：npm run build && node scripts/e2e-v223-version-live.mjs [--port 8093]
// 退出码：0 = 全绿；1 = 任何断言失败

import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const PORT = portIdx !== -1 ? Number(args[portIdx + 1]) : 8093;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const OUT = path.join(root, 'docs/v223');
mkdirSync(OUT, { recursive: true });

if (!existsSync(path.join(distDir, 'sw.js'))) {
  console.error('[e2e-v223] dist/sw.js 不存在 —— 先 npm run build');
  process.exit(1);
}

// 真源展示形推导（与 tests/v223 toDisplayForm 同律：semver X.Y.0 → vX.YZ 两位补零）
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf-8'));
const [, maj, min] = String(pkg.version).match(/^(\d+)\.(\d+)\.(\d+)$/);
const VER = `v${maj}.${String(Number(min)).padStart(2, '0')}`;

// ---------- dist 静态服务（零依赖，MIME 与 e2e-dist-smoke 同表） ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
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
console.log(`[e2e-v223] dist 服务就绪：http://127.0.0.1:${PORT}/  真源=${pkg.version} → 展示形 ${VER}`);

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- R0/R1/R2：served sw.js 与真源一致性 ----------
console.log('R0-R2 · dist/sw.js ↔ package.json 单一真源（B v10.40 注入架构运行时复核）');
const swText = readFileSync(path.join(distDir, 'sw.js'), 'utf-8');
const m = swText.match(/const VERSION = '([^']+)'/);
const buildId = (swText.match(/const BUILD_ID = '([a-z0-9]+)'/) || [])[1];
A(`R0 sw.js VERSION = ${VER}（真源展示形逐字一致）`, m && m[1] === VER, JSON.stringify(m && m[1]));
A('R1 __BUILD_ID__ 已被构建替换（非占位符）', !!buildId && !swText.includes('__BUILD_ID__'), buildId || '(missing)');
A('R2 CACHE_NAME 模板双段完整（VERSION 真源段 + BUILD_ID 构建段）', swText.includes('const CACHE_NAME = `geek-cache-${VERSION}-${BUILD_ID}`;') && !!buildId, '');

// ---------- 浏览器：设置 › 开发者选项 系统版本行 ----------
const EXE_CANDIDATES = [process.env.MD3_CHROME, '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'].filter(Boolean);
const exeExists = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
const launchOpts = { headless: true };
for (const c of EXE_CANDIDATES) if (exeExists(c)) { launchOpts.executablePath = c; break; }
const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());

const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(600);
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1200);
// 窄格局页栈直达：开发者选项 = settings 页 8（tpNav 窄格局回落 pushSubPage 同路径）
await page.evaluate(() => window.pushSubPage(8));
await sleep(900);

// 等系统版本行填充（fetch ../sw.js 异步）
let verText = '';
for (let i = 0; i < 20; i++) {
  verText = await page.evaluate(() => {
    const el = document.getElementById('sysVerLine');
    return el && el.isConnected ? el.textContent : '';
  });
  if (verText && verText !== '读取中…') break;
  await sleep(300);
}
const expected = buildId ? `Android16 Geek · ${VER} · build ${buildId}` : `(unreachable)`;
A(`R3 系统版本行 = "${expected}"`, verText === expected, JSON.stringify(verText));
await page.screenshot({ path: path.join(OUT, 'v223-settings-sysver.png') });

A('R4 全程零 pageerror', errors.length === 0, JSON.stringify(errors.slice(0, 3)));

await browser.close();
server.close();
console.log(`[e2e-v223] 结果：PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
