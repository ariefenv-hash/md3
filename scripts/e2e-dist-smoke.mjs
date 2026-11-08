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
//      v10.67 #260：防线补强——同源资源 console error 监控（Failed to load
//      resource 即 fail）：#260 的 404 形态零 pageerror、只报 console error，
//      本脚本此前不监控 console 正是三道防线全漏之一；外域 abort（断网纪律
//      预期产物）豁免。另 clock_app 升级为功能级断言（秒表「开始→停止」+ 闹钟
//      seed 渲染各 1 条）——#260 的秒表瘫痪/闹钟空列表在启动面全绿下静默
//      两周，功能级探针一道即拦
//   ② precache 清单 HTTP 自校验：对 dist/precache-manifest.json 的每个 URL 发起
//      真实 HTTP GET，非 200 或空体即 fail（#139 建议③的落地形态）
//   ③ 网络层防线（v10.76 #299）：#297（alarm-ringtone.js 404）与 #298（catalog.json
//      404/403）两例实证——页面真实运行时的网络失败（同源 response.status>=400 与
//      requestfailed）此前完全在断言面之外，部署级缺件事故零拦截。本层收集双通道
//      失败：同源 4xx/5xx 响应 + 同源 requestfailed（errorText），外域请求沿用断网
//      纪律（route.abort 预期产物，ERR_FAILED 外域豁免口径与 #260 console 防线
//      同律）；已知可容忍项走 NET_EXEMPT 豁免表（数据驱动防误报，每项必附理由）。
//      另设 dist 关键资源存在性清单（第④节）：部署级缺件双保险，与构建对账门禁
//      （#301 方向）互补——#298/#297 两事故文件在册为永久回归锚。
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
  const idM = txt.match(/\bid:\s*['"]([a-z0-9_-]+)['"]/);
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

// ---------- v10.76 #299：网络层防线（同源 4xx/5xx + requestfailed 双通道） ----------
// 豁免表：同源可容忍失败路径（数据驱动；每项必附理由，禁无由豁免）。
// 空表=零豁免起步：静态自服务档下同源网络失败均无正当理由（#297/#298 双实证）。
const NET_EXEMPT = [];
const netExemptOf = (u) => NET_EXEMPT.find((e) => e.test(u));
const netFails = [];
const SAME_ORIGIN = `http://127.0.0.1:${PORT}`;
const attachNetGuard = (pg) => {
  // 同源响应状态 ≥400（404 缺件 / 403 拒绝 / 5xx 服务异常）
  pg.on('response', (r) => {
    const u = r.url() || '';
    if (!u.startsWith(SAME_ORIGIN)) return; // 外域断网纪律域外
    if (r.status() < 400) return;
    if (netExemptOf(u)) return; // 豁免表在册可容忍项
    netFails.push(`HTTP ${r.status()} ${u.slice(SAME_ORIGIN.length)}`);
  });
  // 同源请求失败（网络层异常；外域 abort 为断网纪律预期产物不入册）
  pg.on('requestfailed', (r) => {
    const u = r.url() || '';
    if (!u.startsWith(SAME_ORIGIN)) return;
    if (netExemptOf(u)) return;
    netFails.push(`requestfailed ${r.failure()?.errorText || 'ERR?'} ${u.slice(SAME_ORIGIN.length)}`);
  });
};

const EXE_CANDIDATES = [process.env.MD3_CHROME, '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'].filter(Boolean);
const exeExists = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
const launchOpts = { headless: true };
for (const c of EXE_CANDIDATES) if (exeExists(c)) { launchOpts.executablePath = c; break; }
const browser = await chromium.launch(launchOpts);
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
let page = await ctx.newPage(); // v9.92: let（gotoShellWithHeal 崩溃重建会重新赋值）
const errors = [];
page.on('pageerror', (e) => errors.push(`[pageerror] ${String(e)}`));
// v10.67 #260：同源资源 console error 监控（防线补强）——#260 的 module script
// 404 只报 console error、零 pageerror，此前不监控 console 正是漏检核心。
// 判定：type=error + text 含 'Failed to load resource' + 资源 URL 同源
// （127.0.0.1 本档服务）；外域 abort（断网纪律预期产物 ERR_FAILED）豁免。
const consoleResourceErrs = [];
attachNetGuard(page); // v10.76 #299：网络层防线与 console 防线同挂
const attachConsoleGuard = (pg) => {
  pg.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text() || '';
    if (!/Failed to load resource/.test(t)) return;
    const url = (m.location && m.location() && m.location().url) || '';
    if (!url.startsWith(`http://127.0.0.1:${PORT}`)) return; // 外域断网纪律豁免
    consoleResourceErrs.push(`${t} @ ${url}`);
  });
};
attachConsoleGuard(page);
// 断网纪律：外域一律 abort（e2e 全程惯例；radio/汇率类应用走离线降级路径）
await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SHELL = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const ERROR_TEXT_RE = /(不可用|加载失败|无法加载|请重开应用|重新加载该应用)/;

// ---------- ① 全应用可达性冒烟 ----------
console.log('① 全应用可达性（每个应用：全新 shell → openAppById → iframe 挂载 + 非空 + 无错误文案）');
let frameErrTotal = 0;
/** page 崩溃重建兜底（v9.92：连续 40 次 goto 同一 page 偶发
 * "Target page/context/browser has been closed"——尾部应用环境抖动，
 * 重建 page 后重试一次，断言语义零变化） */
async function gotoShellWithHeal() {
  try {
    await page.goto(SHELL, { waitUntil: 'load', timeout: 30000 });
    return true;
  } catch (e) {
    if (!/Target page|context or browser|ERR_ABORTED/.test(String(e))) throw e;
    page = await ctx.newPage();
    page.on('pageerror', (err) => errors.push(String(err)));
    attachConsoleGuard(page); // v10.67 #260：重建 page 同步重挂 console 监控
    attachNetGuard(page); // v10.76 #299：重建 page 同步重挂网络层防线
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
    await page.goto(SHELL, { waitUntil: 'load', timeout: 30000 });
    return true;
  }
}

/** v10.67 #260：clock_app 功能级探针（秒表走动 + 闹钟 seed）。
 * #260 形态：启动面全绿（挂载/非空/无错误文案）但模块图断链 → app.mjs
 * 整链不执行 → 事件委托不绑（秒表点了没反应）、闹钟数据不 seed（列表空）。
 * 两探针一道即拦：启动面之上加功能面。 */
async function clockFunctionalProbe(frame) {
  return frame.evaluate(async () => {
    const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
    const tabs = [...document.querySelectorAll('button, [role="tab"], .tab, [class*="tab"]')];
    // ① 秒表：切 tab → 点主按钮 → 文字「开始/启动」→「停止/暂停」且不再复原
    let stopwatchMoved = false, swDetail = '按钮未找到';
    const swTab = tabs.find((b) => (b.textContent || '').trim() === '秒表');
    if (swTab) swTab.click();
    await sleepMs(500);
    const swBtn = document.querySelector('#swMainBtn')
      || [...document.querySelectorAll('button')].find((b) => /^(启动|开始)$/.test((b.textContent || '').trim()));
    if (swBtn) {
      const before = (swBtn.textContent || '').trim();
      swBtn.click();
      await sleepMs(1100);
      const after = (swBtn.textContent || '').trim();
      stopwatchMoved = after !== before && /停止|暂停/.test(after);
      swDetail = `${before}→${after}`;
      swBtn.click(); // 卫生复位（应用每轮全新 shell，此处仅探针后收尾）
    }
    // ② 闹钟：切 tab → 列表渲染 seed 数据（默认「早起闹钟 09:00」）
    let alarmSeeded = false, alarmDetail = '列表未找到';
    const alTab = tabs.find((b) => (b.textContent || '').trim() === '闹钟')
      || tabs.find((b) => /闹钟/.test((b.textContent || '').trim()));
    if (alTab) alTab.click();
    await sleepMs(500);
    const listEl = document.querySelector('#alarmList, .alarm-list, [class*="alarm-list"]');
    const bodyText = document.body ? document.body.innerText : '';
    const childCount = listEl ? listEl.children.length : 0;
    const hasMorning = /早起闹钟/.test(bodyText);
    alarmSeeded = childCount > 0 || hasMorning;
    alarmDetail = `list=${childCount} morning=${hasMorning}`;
    return { stopwatchMoved, swDetail, alarmSeeded, alarmDetail };
  });
}
for (const app of APPS) {
  errors.length = 0;
  consoleResourceErrs.length = 0; // v10.67 #260：同源资源错误随轮清零
  netFails.length = 0; // v10.76 #299：同源网络失败随轮清零
  let ok = true, why = '';
  let frame = null;
  try {
    await gotoShellWithHeal();
    await sleep(1500);
    await page.evaluate((id) => window.__shareSheet.openAppById(id), app.id);
    await sleep(1200);
    frame = page.frames().find((f) => f.url().includes(`apps/${app.dir}/index.html`));
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
  const resErrs = consoleResourceErrs.slice();
  if (resErrs.length) { ok = false; why += ` + 同源资源加载失败×${resErrs.length}: ${resErrs[0].slice(0, 140)}（#260 防线）`; frameErrTotal += resErrs.length; }
  // v10.76 #299：同源网络层失败逐应用断言（#297/#298 形态：网络层独立报错，
  // pageerror 与 console 可能均静默，唯此层必现）
  const netErrs = netFails.slice();
  if (netErrs.length) { ok = false; why += ` + 同源网络失败×${netErrs.length}: ${netErrs[0].slice(0, 140)}（#299 防线）`; frameErrTotal += netErrs.length; }
  A(`${app.id}（apps/${app.dir}）`, ok, ok ? '' : why);
  // v10.67 #260：clock_app 功能级断言（秒表/闹钟各 1 条）——启动面之上加功能面
  if (app.id === 'clock_app') {
    if (!ok || !frame) {
      A('#260 时钟功能级：秒表走动', false, `前置未过（${why.slice(0, 80)}），功能面判 fail`);
      A('#260 时钟功能级：闹钟 seed 渲染', false, '前置未过，功能面判 fail');
    } else {
      const fp = await clockFunctionalProbe(frame).catch((e) => ({ evalErr: String(e) }));
      if (fp.evalErr) {
        A('#260 时钟功能级：秒表走动', false, `probe 异常：${fp.evalErr.slice(0, 100)}`);
        A('#260 时钟功能级：闹钟 seed 渲染', false, 'probe 异常');
      } else {
        A('#260 时钟功能级：秒表走动', fp.stopwatchMoved, fp.swDetail);
        A('#260 时钟功能级：闹钟 seed 渲染', fp.alarmSeeded, fp.alarmDetail);
      }
    }
  }
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

// ---------- ④（#299）dist 关键资源存在性清单：部署级缺件双保险 ----------
console.log('④ dist 关键资源存在性清单（#299：HTTP 逐项 200 非空，与构建对账门禁互补双保险）');
const KEY_RESOURCES = [
  'index.html',                        // 根入口
  'ios-desktop/index.html',            // shell 主入口
  'launch.html',                       // 第二入口（#293 盘点对象）
  'manifest.webmanifest',              // PWA 清单（index.html 引用）
  'precache-manifest.json',            // precache 清单自体
  'sw.js',                             // Service Worker（根注册面）
  'ios-desktop/catalog.json',          // #298 实证缺件回归锚（市场目录）
  'ios-desktop/js/aosp/alarm-ringtone.js', // #297 实证缺件回归锚（闹钟铃声）
];
let keyResOk = true, keyResBad = [];
for (const kr of KEY_RESOURCES) {
  if (!existsSync(path.join(distDir, kr))) { keyResOk = false; keyResBad.push(`${kr} → dist 无实物`); continue; }
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/${kr}`, { redirect: 'follow' });
    const buf = res.ok ? await res.arrayBuffer() : null;
    if (!res.ok) { keyResOk = false; keyResBad.push(`${kr} → HTTP ${res.status}`); }
    else if (!buf || buf.byteLength === 0) { keyResOk = false; keyResBad.push(`${kr} → 空体`); }
  } catch (e) {
    keyResOk = false; keyResBad.push(`${kr} → ${String(e).slice(0, 80)}`);
  }
}
A(`关键资源 ${KEY_RESOURCES.length} 项全部 200 非空（#299 双保险）`, keyResOk, keyResOk ? '' : keyResBad.slice(0, 5).join('；'));

await browser.close();
server.close();

console.log('');
console.log(`[e2e-dist] 结果：PASS ${pass} / FAIL ${fail}（pageerror + 同源资源错误 + 同源网络失败累计 ${frameErrTotal}；v10.67 #260 console 监控 + 时钟功能级 2 条；v10.76 #299 网络层防线 + 关键资源清单已入列）`);
process.exit(fail === 0 ? 0 : 1);
