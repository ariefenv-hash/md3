// ==================== shell-lifecycle.spec.js — 源码档壳层全链路常青 spec（#272 渐进批 2） ====================
//
// 批 2 首件原生 spec（native re-expression，#291 常青命名纪律 <特性名>-<行为>）：
// 与 scripts/e2e-app-sweep.mjs（#300）同口径的源码档真实 UI 路径，抽其「单应用全链路」
// 常青面固化为 playwright test spec——boot 三防线（#260 console / #299 网络层 / pageerror，
// 口径与 e2e-app-sweep/e2e-dist-smoke 同律）+ 桌面在场 + 注册表首应用「图标点击 → 开窗 →
// iframe 挂载非空 → back-btn 关窗」全链路。
//
// 与裸脚本通道的分层（零重复、互补——G6 等强语义见 adoption §6）：
//   - npm e2e:sweep：52+ 应用全量 sweep + #304 基线闸（重负载全量面，直跑通道保留）；
//   - 本 spec：单应用链路轻量常青面 + 三防线 boot 断言（e2e:pw 通道分钟级可复跑）；
//   - 断言口径逐字镜像 e2e-app-sweep.mjs（ERROR_TEXT_RE / 三防线正则 / JS el.click 跨页惯例），
//     两通道对同一运行时面结论可互证。
//
// 运行：npm run e2e:pw（playwright.config.js testDir=./e2e-specs，workers=1 顺序纪律）。

import { test, expect } from 'playwright/test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- 可执行档解析（e2e-app-sweep 同款 EXE_CANDIDATES 惯例；缺省走 runner 注册表） ----------
const EXE_CANDIDATES = [
  process.env.MD3_CHROME,
  '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
].filter(Boolean);
const exeExists = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
const EXE = EXE_CANDIDATES.find(exeExists);
test.use({
  viewport: { width: 1280, height: 800 },
  colorScheme: 'dark',
  ...(EXE ? { launchOptions: { executablePath: EXE } } : {}),
});

// ---------- 源码档静态服务（零依赖；MIME 与 e2e-app-sweep.mjs 同表逐字） ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.zip': 'application/zip',
};

let server;
let base = '';

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
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
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/ios-desktop/index.html?nolock=1`;
});

test.afterAll(async () => {
  await new Promise((r) => server.close(r));
});

// ---------- 注册表解析（js/apps/*.js 单一真源，e2e-app-sweep 同款双正则） ----------
const APPS = [];
for (const f of readdirSync(path.join(root, 'ios-desktop/js/apps'))) {
  if (!f.endsWith('.js')) continue;
  const txt = readFileSync(path.join(root, 'ios-desktop/js/apps', f), 'utf-8');
  const idM = txt.match(/id:\s*['"]([a-z0-9-]+)['"]/);
  const dirM = txt.match(/iframeAppContent\(\s*['"]apps\/([a-z0-9-]+)\/index\.html['"]/);
  if (idM && dirM) APPS.push({ id: idM[1], dir: dirM[1], reg: f });
}
const ERROR_TEXT_RE = /(不可用|加载失败|无法加载|请重开应用|重新加载该应用)/;

// ---------- 三防线挂载（#260 console / #299 网络层 / pageerror；口径逐字镜像 sweep） ----------
async function attachDefenses(page, origin, bag) {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  page.on('pageerror', (e) => bag.pageerror.push(String(e)));
  page.on('response', (r) => {
    const u = r.url() || '';
    if (!u.startsWith(origin)) return;
    if (r.status() < 400) return;
    bag.netfail.push(`HTTP ${r.status()} ${u.slice(origin.length)}`);
  });
  page.on('requestfailed', (r) => {
    const u = r.url() || '';
    if (!u.startsWith(origin)) return;
    bag.netfail.push(`requestfailed ${r.failure()?.errorText || 'ERR?'} ${u.slice(origin.length)}`);
  });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text() || '';
    if (!/Failed to load resource/.test(t)) return;
    const url = (m.location && m.location() && m.location().url) || '';
    if (!url.startsWith(origin)) return;
    bag.consoleRes.push(`${t} @ ${url}`);
  });
}

test.setTimeout(120_000);

test('壳层 boot：桌面在场 + 三防线全零（#260/#299/pageerror）', async ({ page }) => {
  const bag = { pageerror: [], consoleRes: [], netfail: [] };
  await attachDefenses(page, base.replace('/ios-desktop/index.html?nolock=1', ''), bag);
  await page.goto(base, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);
  const icons = await page.evaluate(() =>
    [...document.querySelectorAll('.app-icon[data-id]')].map((el) => el.dataset.id)
  );
  expect(icons.length, '桌面 .app-icon[data-id] 收集为 0（壳层未 boot）').toBeGreaterThan(0);
  expect(bag.pageerror, 'pageerror 防线').toEqual([]);
  expect(bag.consoleRes, '同源资源 console error 防线（#260）').toEqual([]);
  expect(bag.netfail, '同源网络失败防线（#299）').toEqual([]);
});

test('iframe 应用全链路：图标点击 → 开窗 → 挂载非空 → back-btn 关窗', async ({ page }) => {
  test.skip(APPS.length === 0, '注册表解析为零（js/apps/*.js 面缺失）——环境异常不静默假绿');
  const bag = { pageerror: [], consoleRes: [], netfail: [] };
  const origin = base.replace('/ios-desktop/index.html?nolock=1', '');
  await attachDefenses(page, origin, bag);
  await page.goto(base, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);

  const iconIds = await page.evaluate(() =>
    [...document.querySelectorAll('.app-icon[data-id]')].map((el) => el.dataset.id)
  );
  const app = APPS.find((a) => iconIds.includes(a.id));
  expect(app, '注册表 iframe 应用无一在桌面直列（覆盖面以桌面图标为真源）').toBeTruthy();

  // 跨页图标 JS el.click()（e2e-app-sweep 踩坑②：DOM click 无可见性要求）
  const clicked = await page.evaluate((appId) => {
    const el = document.querySelector(`.app-icon[data-id="${appId}"]`);
    if (!el) return false;
    el.click();
    return true;
  }, app.id);
  expect(clicked, '桌面图标未找到（data-id 缺失）').toBe(true);
  await page.waitForTimeout(1600); // 开窗动画 + iframe 挂载窗口

  const winOpen = await page.evaluate(() =>
    document.querySelector('#appWindow')?.classList.contains('open') || false
  );
  expect(winOpen, '窗口未开启（#appWindow 无 open 类）').toBe(true);

  const frame = page.frames().find((f) => f.url().includes(`apps/${app.dir}/index.html`));
  expect(frame, `iframe 未挂载（apps/${app.dir}）`).toBeTruthy();
  const probe = await frame.evaluate(() => ({
    text: document.body ? document.body.innerText.trim() : '',
    nodes: document.body ? document.body.querySelectorAll('*').length : 0,
  }));
  expect(probe.nodes, '页面空白（nodes=0）').toBeGreaterThan(0);
  expect(probe.text.length, '页面空白（text=0）').toBeGreaterThan(0);
  expect(ERROR_TEXT_RE.test(probe.text), `错误文案命中：${(probe.text.match(ERROR_TEXT_RE) || [''])[0]}`).toBe(false);

  // 关窗（踩坑③：back-btn，勿 Esc——电源对话框遮罩驻留）
  const closedBtn = await page.evaluate(() => {
    const b = document.querySelector('#appWindow button.back-btn');
    if (!b) return false;
    b.click();
    return true;
  });
  expect(closedBtn, 'back-btn 未找到').toBe(true);
  await page.waitForTimeout(900); // 关窗动画 + closing-actor 卸载
  const winStillOpen = await page.evaluate(() =>
    document.querySelector('#appWindow')?.classList.contains('open') || false
  );
  expect(winStillOpen, '关窗失败（back-btn 点击后窗口仍 open）').toBe(false);

  expect(bag.pageerror, 'pageerror 防线（全链路）').toEqual([]);
  expect(bag.consoleRes, '同源资源 console error 防线（全链路）').toEqual([]);
  expect(bag.netfail, '同源网络失败防线（全链路）').toEqual([]);
});
