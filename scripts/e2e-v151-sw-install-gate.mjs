// ==================== e2e-v151-sw-install-gate.mjs — SW 全有或全无激活门（#151） ====================
//
// 真浏览器三阶段验证（本地 dist + ?swtest=1 强制 SW 注册）：
//   P1 基线：首次安装（清单完整）→ SW 激活 + 缓存条数 == 清单数
//   P2 门控：篡改清单加幽灵 URL + sw.js 字节变化触发重装 → 部分失败 →
//            不得激活（waiting 在位）+ SKIP_WAITING 消息被拒 +
//            SW_PRECACHE_PARTIAL 广播在册 + 更新胶囊不浮现
//   P3 验收活：清单复原 + sw.js 再变 → 重装完整 → 激活 + 缓存条数==清单数 + 页面无重载
//
// 用法：npm run build && node scripts/e2e-v151-sw-install-gate.mjs [--port 8091]
// 退出码：0 = 全绿；1 = 任何断言失败

import { chromium } from 'playwright';
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const PORT = portIdx !== -1 ? Number(args[portIdx + 1]) : 8091;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const swPath = path.join(distDir, 'sw.js');
const manifestPath = path.join(distDir, 'precache-manifest.json');

if (!existsSync(path.join(distDir, 'index.html'))) {
  console.error('[e2e-v151] dist/ 不存在或未构建 —— 先 npm run build');
  process.exit(1);
}

// 污染守卫：上次中断的运行可能把篡改清单留在磁盘（幽灵 URL 在册即标志）
const _preRaw = readFileSync(manifestPath);
if (_preRaw.toString('utf-8').includes('sw-gate-ghost')) {
  console.error('[e2e-v151] dist/precache-manifest.json 含上次中断残留的幽灵 URL —— 先 npm run build 重建 dist');
  process.exit(1);
}

// 原始字节快照（P3 精确复原，保证不污染工作树）
const manifestOrig = _preRaw;
const manifestJson = JSON.parse(manifestOrig.toString('utf-8'));
const N = manifestJson.files.length;
console.log(`[e2e-v151] precache 清单：${N} 条`);

// 崩溃安全：无论正常收场还是异常退出，磁盘清单/工件不残留篡改
process.on('exit', () => { try { writeFileSync(manifestPath, manifestOrig); } catch (e) { /* 尽力而为 */ } });
process.on('SIGINT', () => process.exit(2));
process.on('SIGTERM', () => process.exit(2));

// ---------- dist 静态服务（与 e2e-dist-smoke 同表；404 直通 → 幽灵 URL 必失败） ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
};
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let fp = path.join(distDir, urlPath);
  if (!fp.startsWith(distDir)) { res.writeHead(403); res.end(); return; }
  // 目录 → index.html（与 e2e-dist-smoke 同口径；缺此行根路径 404，整页不加载）
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
console.log(`[e2e-v151] dist 服务就绪：http://127.0.0.1:${PORT}/`);

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${extra}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const perr = [];
page.on('pageerror', (e) => perr.push(String(e).slice(0, 200)));
// SW 消息收集器（init 阶段注入，早于页面脚本）
await page.addInitScript(() => {
  window.__swMsgs = [];
  window.__p3mark = 0;
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', (e) => window.__swMsgs.push(e.data && e.data.type ? e.data : String(e.data)));
  }
});

await page.goto(`http://127.0.0.1:${PORT}/?swtest=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });

const swState = () => page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return { hasReg: false };
  const keys = await caches.keys();
  const cur = keys.find((k) => k.startsWith('geek-cache-'));
  let entries = 0;
  if (cur) { const c = await caches.open(cur); entries = (await c.keys()).length; }
  return { hasReg: true, active: !!reg.active, waiting: !!reg.waiting, entries, cur };
});

// ==================== P1 基线：完整安装 → 激活 ====================
console.log('\nP1 基线：首次安装（清单完整）→ 激活 + 缓存条数 == 清单数');
let st = null;
for (let i = 0; i < 45; i++) {
  st = await swState().catch(() => null);
  if (st && st.active && st.entries >= N) break;
  await sleep(2000);
}
A('P1 SW 已注册并激活', !!st?.active, JSON.stringify(st));
A(`P1 缓存条数 ${st?.entries} == 清单 ${N}`, st?.entries === N, `entries=${st?.entries}`);
A('P1 无 waiting 残留', !st?.waiting);
A('P1 页面零 pageerror', perr.length === 0, perr[0] || '');

// ==================== P2 门控：篡改清单 → 部分失败 → 不得激活 ====================
console.log('\nP2 门控：幽灵 URL → 预缓存部分失败 → 不得激活 + 胶囊抑制');
const tampered = { files: [...manifestJson.files, '/sw-gate-ghost-r39.png'] };
writeFileSync(manifestPath, JSON.stringify(tampered));
writeFileSync(swPath, readFileSync(swPath).toString('utf-8') + `\n// sw-gate-p2 ${Date.now()}\n`);

await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  await reg.update();
});
// 等新 SW 走完 install（部分失败 → waiting 在位）
let st2 = null;
for (let i = 0; i < 30; i++) {
  st2 = await swState().catch(() => null);
  if (st2 && st2.waiting) break;
  await sleep(2000);
}
A('P2 新 SW install 完毕进入 waiting（未激活）', !!st2?.waiting && !!st2?.active, JSON.stringify(st2));
A('P2 旧缓存条数未被破坏（仍 == 清单数）', st2?.entries === N, `entries=${st2?.entries}`);

// SW_PRECACHE_PARTIAL 广播在册
let partialMsg = null;
for (let i = 0; i < 10 && !partialMsg; i++) {
  partialMsg = await page.evaluate(() => (window.__swMsgs || []).find((m) => m && m.type === 'SW_PRECACHE_PARTIAL')).catch(() => null);
  if (!partialMsg) await sleep(1000);
}
A('P2 收到 SW_PRECACHE_PARTIAL 广播', !!partialMsg, JSON.stringify((await page.evaluate(() => window.__swMsgs)).slice(0, 4)));
A('P2 广播 failed>=1 且 total==清单+1', !!partialMsg && partialMsg.failed >= 1 && partialMsg.total === N + 1, JSON.stringify(partialMsg));

// SKIP_WAITING 消息必须被闸拒绝（waiting 不得消失）
await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg && reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
});
await sleep(1800);
const st2b = await swState();
A('P2 SKIP_WAITING 被拒：waiting 仍在（未接管）', !!st2b.waiting, JSON.stringify(st2b));

// 更新胶囊不得浮现（partialBuild 前置门 + 竞态回收）
await sleep(1200);
const pill = await page.evaluate(() => !!document.querySelector('[role="button"]'));
A('P2 更新胶囊不浮现', !pill);

// ==================== P3 验收活：复原清单 → 完整重装 → 激活 ====================
console.log('\nP3 验收活：清单复原 + sw.js 再变 → 完整激活 + 页面无重载');
writeFileSync(manifestPath, manifestOrig); // 字节级精确复原
writeFileSync(swPath, readFileSync(swPath).toString('utf-8') + `\n// sw-gate-p3 ${Date.now()}\n`);
await page.evaluate(() => { window.__p3mark = 1; });
await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  await reg.update();
});
let st3 = null;
for (let i = 0; i < 45; i++) {
  st3 = await swState().catch(() => null);
  if (st3 && st3.active && !st3.waiting && st3.entries >= N) break;
  await sleep(2000);
}
A('P3 完整重装后激活（waiting 清空）', !!st3?.active && !st3?.waiting, JSON.stringify(st3));
A(`P3 缓存条数 ${st3?.entries} == 清单 ${N}（幽灵条目不在缓存）`, st3?.entries === N, `entries=${st3?.entries}`);
const mark = await page.evaluate(() => window.__p3mark);
A('P3 页面未重载（__p3mark 存活）', mark === 1, `mark=${mark}`);
const pill3 = await page.evaluate(() => !!document.querySelector('[role="button"]'));
A('P3 胶囊保持抑制（partialBuild 残留门）', !pill3);
A('P3 全程零 pageerror', perr.length === 0, perr[0] || '');

// ---------- 收场 ----------
console.log(`\n========== e2e-v151 汇总：${pass} 过 / ${fail} 败 ==========`);
server.close();
await browser.close();
process.exit(fail ? 1 : 0);
