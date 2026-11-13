// ==================== e2e-app-sweep.mjs — 全应用 sweep 自动化（#300） ====================
//
// 背景（#300 实录）：一次会话曾用 Playwright 完成「52 应用逐个开启→截图→收集
// console/pageerror/netfail→关窗→校验」全量 sweep（52/52 走通、0 卡死），该能力当时
// 只存在于会话内存，未固化为仓库脚本——本脚本将其入库，回归可复跑。
//
// 与既有防线分层（零重复、互补）：
//   - scripts/e2e-dist-smoke.mjs（#139②/#260/#299）：dist 部署档冒烟——API 直调
//     window.__shareSheet.openAppById 启动，验「构建产物可达性」；
//   - 本脚本（#300）：源码档真实 UI 路径——桌面 .app-icon 图标逐个真实点击启动
//     （用户实际触达路径），验「图标→开窗→应用运行→关窗」全链路，覆盖非 iframe
//     的卡片式应用（clock/settings 等 dist-smoke 注册表解析不到的应用）。
//
// #300 实录踩坑四要素（逐条固化，勿删——这是本题交付的知识本体）：
//   ① 桌面在锁屏下启动时需先上滑手势解锁（D 键不解锁）——本脚本默认走
//      ?nolock=1 直达桌面档（与全库 e2e 惯例一致，CI 稳定）；--lock 档保留
//      真锁屏路径并自动上滑解锁，两条路径均可复跑实录。
//   ② 图标选择器 .app-icon[data-id="<id>"]（真源 ios-desktop/js/desktop.js:42）；
//      跨页图标用 JS el.click() 绕过横滑分页的可见性限制（DOM click 无可见性要求）。
//   ③ 关窗 = 窗口内 BUTTON.back-btn（#appWindow .back-btn，无 close 类名；
//      click → popSubPage，真源 ios-desktop/js/main.js:805）。勿用 Esc——
//      Esc 会唤出电源对话框且遮罩驻留，污染下一轮 sweep。
//   ④ 每应用断言：console error=0（同源资源加载失败）/ pageerror=0 /
//      netfail（同源 4xx+requestfailed）=0，豁免口径与 e2e-dist-smoke（#260/#299）同律；
//      外域请求沿用断网纪律 route.abort（radio/汇率类应用走离线降级路径）。
//   ⑤ 截图默认关闭（--shot 开启落 docs/sweep/）——防 docs/ 截图目录膨胀
//      （#295 在案：docs/ 已 400+ 文件）；失败应用必截图留证（无论 --shot）。
//   ⑥ 关窗判定必须**轮询等待**，不可「固定 sleep + 一次性查 .open」：CI runner 负载下
//      gravity（Canvas rAF 仿真）/ archive（VFS / zip 重活）的 closing-actor 卸载会超 900ms，
//      窗口其实在正常关闭却被误判失败（2026-11-12/13 连红两次，11-11 同 sha 却 success）。
//      现为总超时 3000ms / 每 100ms 复查，真未关闭才 FAIL。
//
// 用法：
//   npm run e2e:sweep                        # 默认档（nolock=1 直达桌面）；docs/sweep-baseline.json
//                                            # 存在时自动启用 #304 基线对比闸
//   node scripts/e2e-app-sweep.mjs --port 8097 [--shot] [--lock] [--write-baseline]
// #304 基线闸（docs/sweep-baseline.json · 纯逻辑层 scripts/sweep-baseline-lib.mjs 真身直连可测）：
//   --write-baseline   重切基线（把本次实跑逐应用三通道计数写入 docs/sweep-baseline.json）
//   默认（基线在）     逐应用对比：三通道全零 → green；与基线逐通道精确相等（基线非零）→ 豁免命中
//                      （已知异常，计数钉死防劣化）；超基线/基线未登记/低于基线 → 照常 FAIL
//                      （新增异常即红；低于基线=改善，汇总提示重切——#297/#298 修复后清零可断言）；
//                      基线红（regressions/unknown/missing 非空）→ 汇总 fail+1，退出码 1
// 退出码：0 = 全绿；1 = 任何断言失败（含基线对比红）
//
// 纪律沿袭：e2e-v858（起服+跑+kill 同命令防后台进程回收；goto load+固定等待）；
//           e2e-dist-smoke（注册表单一真源 ≥30 防误报中止；gotoShellWithHeal 崩溃重建兜底；
//           三防线挂载；NET_EXEMPT 数据驱动豁免表空表起步）。

import { chromium } from 'playwright';
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { buildBaseline, compareReportToBaseline, SWEEP_CHANNELS } from './sweep-baseline-lib.mjs';

const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const PORT = portIdx !== -1 ? Number(args[portIdx + 1]) : 8097;
const SHOT = args.includes('--shot');
const LOCK_MODE = args.includes('--lock');
const WRITE_BASELINE = args.includes('--write-baseline');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = path.join(root, 'docs/sweep-baseline.json');
const OUT = path.join(root, 'docs/sweep');
if (SHOT) mkdirSync(OUT, { recursive: true });

// ---------- 注册表解析（js/apps/*.js 单一真源，判定 iframe 应用面） ----------
const APPS = [];
for (const f of readdirSync(path.join(root, 'ios-desktop/js/apps'))) {
  if (!f.endsWith('.js')) continue;
  const txt = readFileSync(path.join(root, 'ios-desktop/js/apps', f), 'utf-8');
  const idM = txt.match(/id:\s*['"]([a-z0-9-]+)['"]/);
  const dirM = txt.match(/iframeAppContent\(\s*['"]apps\/([a-z0-9-]+)\/index\.html['"]/);
  if (idM && dirM) APPS.push({ id: idM[1], dir: dirM[1], reg: f });
}
if (APPS.length < 30) {
  console.error(`[e2e-sweep] 注册表解析异常：仅解析到 ${APPS.length} 个 iframe 应用（预期 ≥30），中止防误报`);
  process.exit(1);
}
console.log(`[e2e-sweep] 注册表解析：${APPS.length} 个 iframe 应用（js/apps/*.js 单一真源）`);

// ---------- 源码档静态服务（零依赖，MIME 与 serve.mjs 同表；服务仓库根） ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.zip': 'application/zip',
};
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let fp = path.join(root, urlPath);
  if (!fp.startsWith(root)) { res.writeHead(403); res.end(); return; }
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
console.log(`[e2e-sweep] 源码档服务就绪：http://127.0.0.1:${PORT}/`);

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

// ---------- 三防线（#260 console / #299 网络层 / pageerror；口径与 e2e-dist-smoke 同律） ----------
const NET_EXEMPT = []; // 空表=零豁免起步：静态自服务档下同源网络失败均无正当理由
const netExemptOf = (u) => NET_EXEMPT.find((e) => e.test(u));
const netFails = [];
const SAME_ORIGIN = `http://127.0.0.1:${PORT}`;
const attachNetGuard = (pg) => {
  pg.on('response', (r) => {
    const u = r.url() || '';
    if (!u.startsWith(SAME_ORIGIN)) return; // 外域断网纪律域外
    if (r.status() < 400) return;
    if (netExemptOf(u)) return;
    netFails.push(`HTTP ${r.status()} ${u.slice(SAME_ORIGIN.length)}`);
  });
  pg.on('requestfailed', (r) => {
    const u = r.url() || '';
    if (!u.startsWith(SAME_ORIGIN)) return;
    if (netExemptOf(u)) return;
    netFails.push(`requestfailed ${r.failure()?.errorText || 'ERR?'} ${u.slice(SAME_ORIGIN.length)}`);
  });
};
const consoleResourceErrs = [];
const attachConsoleGuard = (pg) => {
  pg.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text() || '';
    if (!/Failed to load resource/.test(t)) return;
    const url = (m.location && m.location() && m.location().url) || '';
    if (!url.startsWith(SAME_ORIGIN)) return; // 外域断网纪律豁免
    consoleResourceErrs.push(`${t} @ ${url}`);
  });
};

const EXE_CANDIDATES = [process.env.MD3_CHROME, '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome'].filter(Boolean);
const exeExists = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
const launchOpts = { headless: true };
for (const c of EXE_CANDIDATES) if (exeExists(c)) { launchOpts.executablePath = c; break; }
const browser = await chromium.launch(launchOpts);
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
let page = await ctx.newPage(); // let：gotoShellWithHeal 崩溃重建会重新赋值
const errors = [];
page.on('pageerror', (e) => errors.push(`[pageerror] ${String(e)}`));
attachNetGuard(page);
attachConsoleGuard(page);
// 断网纪律：外域一律 abort（e2e 全程惯例）
await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SHELL = LOCK_MODE
  ? `http://127.0.0.1:${PORT}/ios-desktop/index.html`
  : `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const ERROR_TEXT_RE = /(不可用|加载失败|无法加载|请重开应用|重新加载该应用)/;

async function gotoShellWithHeal() {
  try {
    await page.goto(SHELL, { waitUntil: 'load', timeout: 30000 });
    return true;
  } catch (e) {
    if (!/Target page|context or browser|ERR_ABORTED/.test(String(e))) throw e;
    page = await ctx.newPage();
    page.on('pageerror', (err) => errors.push(String(err)));
    attachConsoleGuard(page);
    attachNetGuard(page);
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
    await page.goto(SHELL, { waitUntil: 'load', timeout: 30000 });
    return true;
  }
}

// ---------- ① 锁屏解锁档（#300 实录踩坑①：上滑手势解锁，D 键不解锁） ----------
async function unlockIfLocked() {
  const locked = await page.evaluate(() => {
    const ls = document.querySelector('.lock-screen');
    return !!(ls && getComputedStyle(ls).display !== 'none' && getComputedStyle(ls).visibility !== 'hidden');
  }).catch(() => false);
  if (!locked) return { unlocked: false, wasLocked: false };
  // 上滑手势：从屏幕下部向上拖拽（真实用户路径；D 键不解锁实录在案）
  await page.mouse.move(640, 700);
  await page.mouse.down();
  for (let y = 700; y >= 160; y -= 60) { await page.mouse.move(640, y); await sleep(16); }
  await page.mouse.up();
  await sleep(900);
  const after = await page.evaluate(() => {
    const ls = document.querySelector('.lock-screen');
    return !!(ls && getComputedStyle(ls).display !== 'none' && getComputedStyle(ls).visibility !== 'hidden');
  }).catch(() => true);
  return { unlocked: !after, wasLocked: true };
}

// ---------- ② 桌面图标全量收集（真实 UI 路径驱动源；跨页 JS click 绕可见性） ----------
await gotoShellWithHeal();
await sleep(1500);
if (LOCK_MODE) {
  const u = await unlockIfLocked();
  console.log(`[e2e-sweep] 锁屏档：wasLocked=${u.wasLocked} unlocked=${u.unlocked}`);
  if (u.wasLocked && !u.unlocked) { console.error('[e2e-sweep] 锁屏解锁失败，中止'); await browser.close(); server.close(); process.exit(1); }
}
const iconIds = await page.evaluate(() =>
  [...document.querySelectorAll('.app-icon[data-id]')].map((el) => el.dataset.id)
);
if (!iconIds.length) {
  console.error('[e2e-sweep] 桌面 .app-icon 收集为 0，中止防误报');
  await browser.close(); server.close(); process.exit(1);
}
console.log(`[e2e-sweep] 桌面图标收集：${iconIds.length} 个（.app-icon[data-id] 真源）`);
const iframeById = new Map(APPS.map((a) => [a.id, a]));
// 防抖检查：注册表 iframe 应用应尽数出现在桌面图标（文件夹/抽屉收纳的应用允许缺失，只告警不 fail——
// sweep 覆盖面以桌面图标为真源，注册表仅用于区分断言分支）
const missingOnDesktop = APPS.filter((a) => !iconIds.includes(a.id)).map((a) => a.id);
if (missingOnDesktop.length) console.log(`[e2e-sweep] 注：${missingOnDesktop.length} 个注册表应用不在桌面图标直列（${missingOnDesktop.slice(0, 6).join(',')}${missingOnDesktop.length > 6 ? '…' : ''}），sweep 覆盖面以桌面图标为真源`);

// ---------- ②b #304 基线装载（写基线模式跳过；解析失败降级零豁免口径继续，不静默假绿） ----------
let baseline = null;
if (!WRITE_BASELINE && existsSync(BASELINE_PATH)) {
  try {
    baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'));
    if (!baseline || baseline.schema !== 1 || typeof baseline.apps !== 'object') throw new Error('schema 不合法');
    console.log(`[e2e-sweep] #304 基线对比闸已启用（docs/sweep-baseline.json · apps=${Object.keys(baseline.apps).length} · generated=${baseline.generated || 'n/a'}）`);
  } catch (e) {
    console.error(`[e2e-sweep] 基线解析失败，按零豁免口径继续：${e.message}`);
    baseline = null;
  }
}

// ---------- ③ 全应用 sweep 主循环 ----------
console.log(`③ 全应用 sweep（${iconIds.length} 个：图标点击 → 开窗 → 内容/三零断言 → back-btn 关窗）`);
let frameErrTotal = 0;
const report = [];
for (const id of iconIds) {
  errors.length = 0;
  consoleResourceErrs.length = 0;
  netFails.length = 0;
  let ok = true, why = '';
  let frame = null;
  const app = iframeById.get(id) || null;
  try {
    await gotoShellWithHeal();
    await sleep(1500);
    // 跨页图标 JS el.click()（踩坑②：DOM click 无可见性要求，绕横滑分页）
    const clicked = await page.evaluate((appId) => {
      const el = document.querySelector(`.app-icon[data-id="${appId}"]`);
      if (!el) return false;
      el.click();
      return true;
    }, id);
    if (!clicked) { ok = false; why = '桌面图标未找到（data-id 缺失）'; }
    else {
      await sleep(1600); // 开窗动画 + iframe 挂载窗口
      const winOpen = await page.evaluate(() =>
        document.querySelector('#appWindow')?.classList.contains('open') || false
      );
      if (!winOpen) { ok = false; why = '窗口未开启（#appWindow 无 open 类）'; }
      else if (app) {
        // iframe 应用：iframe 挂载 + 非空 + 无错误文案（dist-smoke 同口径）
        frame = page.frames().find((f) => f.url().includes(`apps/${app.dir}/index.html`));
        if (!frame) { ok = false; why = 'iframe 未挂载'; }
        else {
          const probe = await frame.evaluate(() => ({
            text: document.body ? document.body.innerText.trim() : '',
            nodes: document.body ? document.body.querySelectorAll('*').length : 0,
          })).catch((e) => ({ evalErr: String(e) }));
          if (probe.evalErr) { ok = false; why = `frame evaluate 异常：${probe.evalErr.slice(0, 120)}`; }
          else if (probe.nodes === 0 || probe.text.length === 0) { ok = false; why = `页面空白（nodes=${probe.nodes} text=${probe.text.length}）`; }
          else if (ERROR_TEXT_RE.test(probe.text)) { ok = false; why = `错误文案命中：${probe.text.match(ERROR_TEXT_RE)[0]}`; }
        }
      } else {
        // 非 iframe 卡片式应用：窗口开启 + 壳内内容非空
        const probe = await page.evaluate(() => {
          const w = document.querySelector('#appWindow');
          return { nodes: w ? w.querySelectorAll('*').length : 0 };
        });
        if (probe.nodes < 5) { ok = false; why = `窗口内容近空（nodes=${probe.nodes}）`; }
      }
    }
  } catch (e) {
    ok = false; why = `流程异常：${String(e).slice(0, 160)}`;
  }
  // 关窗（踩坑③：back-btn，勿 Esc——电源对话框遮罩驻留）
  // #300 CI 连红修复（2026-11-13）：原为固定 sleep(900) + **一次性**检查 .open，
  // 在 CI runner 高负载下属时序 flaky。gravity（Canvas rAF 物理仿真）与 archive
  // （VFS / zip 重活）的 closing-actor 卸载可能超过 900ms，但窗口其实正在正常关闭
  // → 被误判「关窗失败」→ exit 1（11-12 / 11-13 连红两次，11-11 同 sha 却 success）。
  // 改为**轮询等待**：总超时内每 100ms 复查，.open 一移除即通过；真没关才判失败。
  // 副作用：正常应用比原来更早放行（不再白等 900ms），慢应用最多多等 2.1s。
  const WIN_CLOSE_TIMEOUT_MS = 3000;
  const WIN_CLOSE_POLL_MS = 100;
  let closed = false;
  try {
    closed = await page.evaluate(() => {
      const b = document.querySelector('#appWindow button.back-btn');
      if (!b) return false;
      b.click();
      return true;
    });
    if (closed) {
      const deadline = Date.now() + WIN_CLOSE_TIMEOUT_MS;
      let winStillOpen = true;
      do {
        await sleep(WIN_CLOSE_POLL_MS);
        winStillOpen = await page.evaluate(() =>
          document.querySelector('#appWindow')?.classList.contains('open') || false
        ).catch(() => true);
      } while (winStillOpen && Date.now() < deadline);
      if (winStillOpen) closed = false;
    }
  } catch { closed = false; }
  if (!closed && ok) { ok = false; why += ` + 关窗失败（back-btn 点击后窗口仍 open）`; }
  else if (!closed && !ok) { why += ` + 关窗亦未成功`; }
  // 三零断言（踩坑④）+ #304 基线豁免闸：非零计数与基线逐通道精确相等 → 已知异常豁免
  // （PASS + 命中注记，计数钉死防劣化）；超基线/低于基线/基线未登记 → 照常 FAIL
  // （新增异常即红；低于基线=改善形态，汇总提示重切——#297/#298 修复后清零可断言）
  const shellErr = errors.slice();
  const resErrs = consoleResourceErrs.slice();
  const netErrs = netFails.slice();
  const counts = { pageerror: shellErr.length, consoleRes: resErrs.length, netfail: netErrs.length };
  frameErrTotal += counts.pageerror + counts.consoleRes + counts.netfail;
  const errSum = counts.pageerror + counts.consoleRes + counts.netfail;
  let exempt = false;
  if (errSum > 0) {
    const pinned = baseline && baseline.apps[id];
    const exact = !!(pinned && SWEEP_CHANNELS.every((c) => counts[c] === pinned[c]));
    if (exact) {
      exempt = true;
      why += ` 【#304 豁免命中：已知异常与基线精确相等（pageerror=${counts.pageerror}/consoleRes=${counts.consoleRes}/netfail=${counts.netfail}，计数钉死）】`;
    } else {
      ok = false;
      let tag;
      if (!pinned) tag = '基线未登记（新增异常）';
      else if (SWEEP_CHANNELS.some((c) => counts[c] > pinned[c])) tag = '超基线（劣化）';
      else tag = '低于基线（改善→建议 --write-baseline 重切）';
      if (counts.pageerror) why += ` + pageerror×${counts.pageerror}: ${shellErr[0].slice(0, 140)}（#260 防线·${tag}）`;
      if (counts.consoleRes) why += ` + 同源资源加载失败×${counts.consoleRes}: ${resErrs[0].slice(0, 140)}（#260 防线·${tag}）`;
      if (counts.netfail) why += ` + 同源网络失败×${counts.netfail}: ${netErrs[0].slice(0, 140)}（#299 防线·${tag}）`;
    }
  }
  report.push({ id, dir: app ? app.dir : null, ok, why, exempt, ...counts });
  A(`${id}${app ? `（apps/${app.dir}）` : '（卡片式）'}`, ok, ok ? (exempt ? why : '') : why);
  if (!ok) {
    // 失败应用必截图留证（无论 --shot，踩坑⑤；docs/sweep/ 已 gitignore 不入库）
    await page.screenshot({ path: path.join(OUT, `sweep-fail-${id}.png`) }).catch(() => {});
  } else if (SHOT) {
    await page.screenshot({ path: path.join(OUT, `sweep-${id}.png`) }).catch(() => {});
  }
}

// ---------- ④ 汇总 ----------
console.log('');
console.log(`[e2e-sweep] 汇总：${pass} pass / ${fail} fail（桌面图标 ${iconIds.length} 个；其中 iframe 应用 ${iconIds.filter((i) => iframeById.has(i)).length} 个）`);
console.log(`[e2e-sweep] 错误总量：pageerror+console+netfail = ${frameErrTotal}`);

// ---------- ④b #304 基线闸（写基线 / 对比基线；纯逻辑层 sweep-baseline-lib.mjs 真身直连） ----------
if (WRITE_BASELINE) {
  let head = null;
  try { head = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf-8' }).trim(); } catch { head = null; }
  const bl = buildBaseline(report, {
    generated: new Date().toISOString(), head,
    note: '#304 深测全绿面快照（应用×三通道计数表；重切请跑 npm run sweep:write-baseline）',
  });
  writeFileSync(BASELINE_PATH, JSON.stringify(bl, null, 2) + '\n');
  console.log(`[sweep-baseline] 基线已重切：docs/sweep-baseline.json（apps=${Object.keys(bl.apps).length} · appsWithError=${bl.summary.appsWithError} · totalErrors=${bl.summary.totalErrors} · head=${bl.head || 'n/a'}）`);
} else if (baseline) {
  const cmp = compareReportToBaseline(report, baseline);
  if (cmp.verdict === 'green') {
    console.log(`[sweep-baseline] 对比 GREEN（apps=${cmp.summary.apps}/基线 ${cmp.summary.baselineApps} · 豁免命中 ${cmp.exemptionsHit.length} · 改善 ${cmp.improvements.length}）`);
    if (cmp.improvements.length) {
      for (const im of cmp.improvements) console.log(`  改善 ${im.id}: ${im.channels.join('/')} ${im.reason}`);
      console.log('[sweep-baseline] 建议：npm run sweep:write-baseline 重切基线（清零可断言形态）');
    }
  } else {
    console.error(`[sweep-baseline] 对比 RED（regressions=${cmp.regressions.length} unknown=${cmp.unknownApps.length} missing=${cmp.missingApps.length}）`);
    for (const r of cmp.regressions) console.error(`  - ${r.id}: ${r.channels.join('/')} ${r.reason}`);
    if (cmp.unknownApps.length) console.error(`  unknown: ${cmp.unknownApps.join(',')}`);
    if (cmp.missingApps.length) console.error(`  missing: ${cmp.missingApps.join(',')}`);
    fail++;
  }
}
const fails = report.filter((r) => !r.ok);
if (fails.length) {
  console.log('[e2e-sweep] 失败清单：');
  for (const f of fails) console.log(`  - ${f.id}${f.dir ? ` (apps/${f.dir})` : ''}: ${f.why}`);
}
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
