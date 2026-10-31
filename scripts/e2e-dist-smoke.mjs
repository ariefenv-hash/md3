// ==================== e2e-dist-smoke.mjs — dist 部署档全应用冒烟（#139 ②③） ====================
//
// 背景（#138 事故复盘）：14 个 e2e 脚本全部只跑源码服务，「源码有、dist 没有」
// 100% 测不出——16 个文件缺失、15 个应用在线上失效，测试却全绿。本脚本是
// 【dist 部署档】的冒烟层，与源码档 e2e 互补：
//
//   ① 全应用可达性：解析 js/apps/*.js 注册表的 id + iframeAppContent('apps/<dir>')
//      映射，在 dist 静态服务上逐个 openAppById 启动，断言「iframe 挂载 + 页面
//      非空 + 无『不可用/加载失败』类错误文案 + 零 pageerror」——#138 的失效形态
//      （core 脚本 404 → 「命令面不可用」）从此必然暴露
//   ② precache 清单 HTTP 自校验：对 dist/precache-manifest.json 的每个 URL 发起
//      真实 HTTP GET，非 200 或空体即 fail（#139 建议③的落地形态）
//
// 纪律沿袭：外域请求 route.abort 断网（e2e 全程惯例）；goto load + 固定等待替代
// networkidle（v843）；每次 app 全新 shell（防串状态，冒烟级只验启动面）。
//
// 用法：npm run build && node scripts/e2e-dist-smoke.mjs [--port 8088] [--shot]
// 退出码：0 = 全绿；1 = 任何断言失败

import { chromium } from 'playwright';
import http from 'node:http';
import { readdirSync, readFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const PORT = portIdx !== -1 ? Number(args[portIdx + 1]) : 8088;
const SHOT = args.includes('--shot');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const OUT = path.join(root, 'docs/v897');
if (SHOT) mkdirSync(OUT, { recursive: true });

if (!existsSync(path.join(distDir, 'index.html'))) {
  console.error('[e2e-dist] dist/ 不存在或未构建 —— 先 npm run build');
  process.exit(1);
}

// ---------- 应用注册表解析（id ↔ iframe 目录，单一真源 = js/apps/*.js） ----------
const appsJsDir = path.join(root, 'ios-desktop', 'js', 'apps');
const APPS = [];
for (const f of readdirSync(appsJsDir).filter((n) => n.endsWith('.js'))) {
  const txt = readFileSync(path.join(appsJsDir, f), 'utf-8');
  const idM = txt.match(/\bid:\s*['"]([a-z0-9_]+)['"]/);
  const dirM = txt.match(/iframeAppContent\(\s*['"]apps\/([a-z0-9-]+)\/index\.html['"]/);
  if (idM && dirM) APPS.push({ id: idM[1], dir: dirM[1], reg: f });
}
if (APPS.length < 30) {
  console.error(`[e2e-dist] 注册表解析异常：仅解析到 ${APPS.length} 个 iframe 应用（预期 ≥30），中止防误报`);
  process.exit(1);
}
console.log(`[e2e-dist] 注册表解析：${APPS.length} 个 iframe 应用（js/apps/*.js 单一真源）`);

// ---------- dist 静态服务（零依赖，MIME 与 serve.mjs 同表） ----------
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
console.log(`[e2e-dist] dist 服务就绪：http://127.0.0.1:${PORT}/`);

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const EXE_CANDIDATES = [process.env.MD3_CHROME, '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'].filter(Boolean);
const exeExists = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
const launchOpts = { headless: true };
for (const c of EXE_CANDIDATES) if (exeExists(c)) { launchOpts.executablePath = c; break; }
const browser = await chromium.launch(launchOpts);
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`[pageerror] ${String(e)}`));
// 断网纪律：外域一律 abort（e2e 全程惯例；radio/汇率类应用走离线降级路径）
await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SHELL = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const ERROR_TEXT_RE = /(不可用|加载失败|无法加载|请重开应用|重新加载该应用)/;

// ---------- ① 全应用可达性冒烟 ----------
console.log('① 全应用可达性（每个应用：全新 shell → openAppById → iframe 挂载 + 非空 + 无错误文案）');
let frameErrTotal = 0;
for (const app of APPS) {
  errors.length = 0;
  let ok = true, why = '';
  try {
    await page.goto(SHELL, { waitUntil: 'load', timeout: 30000 });
    await sleep(1500);
    await page.evaluate((id) => window.__shareSheet.openAppById(id), app.id);
    await sleep(1200);
    const frame = page.frames().find((f) => f.url().includes(`apps/${app.dir}/index.html`));
    if (!frame) { ok = false; why = 'iframe 未挂载'; }
    else {
      const probe = await frame.evaluate(() => ({
        text: document.body ? document.body.innerText.trim() : '',
        nodes: document.body ? document.body.querySelectorAll('*').length : 0,
      })).catch((e) => { return { evalErr: String(e) }; });
      if (probe.evalErr) { ok = false; why = `frame evaluate 异常：${probe.evalErr.slice(0, 120)}`; }
      else if (probe.nodes === 0 || probe.text.length === 0) { ok = false; why = `页面空白（nodes=${probe.nodes} text=${probe.text.length}）`; }
      else if (ERROR_TEXT_RE.test(probe.text)) {
        ok = false;
        why = `错误文案命中：${probe.text.match(ERROR_TEXT_RE)[0]}`;
      }
    }
  } catch (e) {
    ok = false; why = `流程异常：${String(e).slice(0, 160)}`;
  }
  const shellErr = errors.slice();
  if (shellErr.length) { ok = false; why += ` + pageerror×${shellErr.length}: ${shellErr[0].slice(0, 140)}`; frameErrTotal += shellErr.length; }
  A(`${app.id}（apps/${app.dir}）`, ok, ok ? '' : why);
  if (SHOT && !ok) await page.screenshot({ path: path.join(OUT, `dist-fail-${app.dir}.png`) }).catch(() => {});
}
if (SHOT) await page.screenshot({ path: path.join(OUT, 'dist-smoke-last.png') }).catch(() => {});

// ---------- ② precache 清单 HTTP 自校验 ----------
console.log('② precache-manifest.json 逐 URL HTTP 自校验（非 200 / 空体即 fail）');
let precacheOk = true, precacheBad = [];
try {
  const manifest = JSON.parse(readFileSync(path.join(distDir, 'precache-manifest.json'), 'utf-8'));
  const urls = manifest.files || [];
  for (const u of urls) {
    // .nojekyll：GitHub Pages 哨兵空文件（存在即语义），豁免空体判定（与 verify-dist.mjs 同口径）
    if (u === '.nojekyll') continue;
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/${u}`, { redirect: 'follow' });
      const buf = res.ok ? await res.arrayBuffer() : null;
      if (!res.ok) { precacheOk = false; precacheBad.push(`${u} → HTTP ${res.status}`); }
      else if (!buf || buf.byteLength === 0) { precacheOk = false; precacheBad.push(`${u} → 空体`); }
    } catch (e) {
      precacheOk = false; precacheBad.push(`${u} → ${String(e).slice(0, 80)}`);
    }
  }
  A(`precache ${urls.length} 条 URL 全部 200 非空`, precacheOk, precacheOk ? '' : precacheBad.slice(0, 5).join('；'));
} catch (e) {
  A('precache 清单可读', false, String(e).slice(0, 120));
}

await browser.close();
server.close();

console.log('');
console.log(`[e2e-dist] 结果：PASS ${pass} / FAIL ${fail}（pageerror 累计 ${frameErrTotal}）`);
process.exit(fail === 0 ? 0 : 1);
