// e2e-v144-shade-interpolation.mjs — #144 ShadeInterpolation 跟手连续 α 无头回归（源码档）
// 判据：
//   P 前置：桌面 boot（节点数在册）+ body[data-shade-mode=dual] + 面板几何可读
//   A 跟手连续映射：分步拖拽 6 档 expansion，#dualScrimNotif computed opacity 逐档命中
//     ShadeInterpolation.getNotificationScrimAlpha（页内 import 同源计算，容差 0.02）+ 单调不减
//   B 拖拽期硬切：computed transition-duration=0s + backdrop-filter=none（frost↔motion 互斥律）
//   C 松手交接：0.65h 释放 → .open + opacity 1 + 内联 α 摘净 + dragging 摘除 + bf/过渡交回
//   D 阈值下瞬收：0.1h 慢拖释放 → 面板+scrim 同帧瞬收（无渐散残影）
//   E 纯点击切换：notif 左 75% / qs 右 25% 两分区 toggle 开合往返
//   K 全程零 pageerror
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8107;
const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 零依赖静态服务（no-store，同 serve.mjs 口径） ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mid': 'audio/midi', '.webm': 'video/webm' };
const srv = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const fp = path.normalize(path.join(ROOT, p));
  if (!fp.startsWith(ROOT + path.sep) && fp !== ROOT) { res.writeHead(403); return res.end(); }
  try {
    const data = await readFile(fp);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort()); // 外域断网纪律
await page.goto(`http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1&shadeMode=dual`, { waitUntil: 'load', timeout: 30000 });
await sleep(2600);

// ---------- P 前置 ----------
const boot = await page.evaluate(() => ({
  nodes: document.querySelectorAll('*').length,
  mode: document.body.dataset.shadeMode,
  hasHit: !!document.getElementById('dualHitNotif') && !!document.getElementById('dualHitQs'),
  hasScrim: !!document.getElementById('dualScrimNotif') && !!document.getElementById('dualScrimQs'),
}));
t('P-1 桌面 boot（节点数在册）', boot.nodes >= 1000, `nodes=${boot.nodes}`);
t('P-2 shadeMode=dual 命中（URL 参数直通）', boot.mode === 'dual', `mode=${boot.mode}`);
t('P-3 双分区命中区 + 双 scrim 在场', boot.hasHit && boot.hasScrim, '');

const geo = await page.evaluate(() => {
  const p = document.getElementById('dualNotifPanel');
  const hit = document.getElementById('dualHitNotif');
  const r = hit.getBoundingClientRect();
  return { h: p.offsetHeight, hx: r.x + r.width * 0.35, hy: r.y + r.height / 2 };
});
t('P-4 面板几何可读（offsetHeight>200 且命中区在顶部）', geo.h > 200 && geo.hy < 80, `h=${geo.h} hitY=${geo.hy.toFixed(0)}`);

// 页内同源期望函数（evaluate 显式传参，v856 教训）
await page.evaluate(async () => {
  const m = await import('/ios-desktop/js/aosp/shade-interpolation.js');
  window.__scrimAlpha = m.getNotificationScrimAlpha;
});

// ---------- A+B 拖拽跟手连续映射 + 拖拽期硬切 ----------
const hitId = 'dualHitNotif';
const scrimSel = '#dualScrimNotif';
await page.mouse.move(geo.hx, geo.hy);
await page.mouse.down();
await sleep(60);

const SAMPLES = [0.08, 0.16, 0.25, 0.35, 0.5, 0.65];
const readings = [];
for (const k of SAMPLES) {
  await page.mouse.move(geo.hx, geo.hy + k * geo.h, { steps: 4 });
  await sleep(50);
  const r = await page.evaluate(({ sel, kk }) => {
    const s = document.querySelector(sel);
    const cs = getComputedStyle(s);
    return {
      opacity: parseFloat(cs.opacity),
      expected: window.__scrimAlpha(kk),
      transition: cs.transitionDuration,
      bf: cs.backdropFilter,
      inline: s.style.opacity,
    };
  }, { sel: scrimSel, kk: k });
  readings.push({ k, ...r });
}
let curveOk = true, curveDetail = '';
for (const r of readings) {
  const d = Math.abs(r.opacity - r.expected);
  if (d > 0.02) { curveOk = false; curveDetail += `[k=${r.k} got=${r.opacity} want=${r.expected.toFixed(3)}]`; }
}
t('A-1 跟手 6 档 opacity 逐档命中 ShadeInterpolation 曲线（容差 0.02）', curveOk,
  readings.map((r) => `${r.k}:${r.opacity.toFixed(3)}/${r.expected.toFixed(3)}`).join(' ') + curveDetail);
let monoOk = true;
for (let i = 1; i < readings.length; i++) if (readings[i].opacity < readings[i - 1].opacity - 1e-6) monoOk = false;
t('A-2 跟手 opacity 单调不减', monoOk, '');
t('A-3 半程已近全黑：k=0.5 档 opacity≥0.95（scrim 0→0.5 走完语义）',
  readings.find((r) => r.k === 0.5).opacity >= 0.95, '');
const dragState = readings[2]; // k=0.25 档的状态
t('B-1 拖拽期过渡硬切（transition-duration=0s）', dragState.transition === '0s', `got=${dragState.transition}`);
t('B-2 拖拽期 bf 硬切（frost↔motion 互斥律）', dragState.bf === 'none', `got=${dragState.bf}`);
t('B-3 拖拽期 α 为内联直写', dragState.inline !== '', `inline=${dragState.inline}`);

// ---------- C 松手交接（0.65h 释放 → 开） ----------
await page.mouse.up();
await sleep(650);
const afterOpen = await page.evaluate((sel) => {
  const s = document.querySelector(sel);
  const p = document.getElementById('dualNotifPanel');
  const cs = getComputedStyle(s);
  return {
    open: s.classList.contains('open'),
    dragging: s.classList.contains('dragging'),
    opacity: parseFloat(cs.opacity),
    inline: s.style.opacity,
    transition: cs.transitionDuration,
    bf: cs.backdropFilter,
    panelOpen: p.classList.contains('open'),
  };
}, scrimSel);
t('C-1 释放超阈值 → 面板+scrim .open 在册', afterOpen.open && afterOpen.panelOpen, '');
t('C-2 落定 opacity=1（类过渡自拖拽值起步交回）', afterOpen.opacity === 1, `got=${afterOpen.opacity}`);
t('C-3 内联 α 摘净 + dragging 摘除', afterOpen.inline === '' && !afterOpen.dragging, `inline="${afterOpen.inline}"`);
t('C-4 bf/过渡交回基线（blur(14px)·0.32s）',
  afterOpen.bf.includes('blur') && afterOpen.transition === '0.32s', `bf=${afterOpen.bf} td=${afterOpen.transition}`);

// ---------- E1 纯点击关闭（toggle 往返） ----------
await page.mouse.click(geo.hx, geo.hy);
await sleep(650);
const afterToggleClose = await page.evaluate((sel) => {
  const s = document.querySelector(sel);
  return { open: s.classList.contains('open'), opacity: parseFloat(getComputedStyle(s).opacity) };
}, scrimSel);
t('E-1 纯点击 toggle → 关（.open 摘除 + opacity 0）',
  !afterToggleClose.open && afterToggleClose.opacity === 0, `op=${afterToggleClose.opacity}`);

// ---------- D 阈值下瞬收（0.1h 慢拖 → 释放瞬收） ----------
await page.mouse.move(geo.hx, geo.hy);
await page.mouse.down();
await page.mouse.move(geo.hx, geo.hy + 0.1 * geo.h, { steps: 6 });
await sleep(220); // 慢拖：速度低于 0.6px/ms
const midDrag = await page.evaluate((sel) => parseFloat(getComputedStyle(document.querySelector(sel)).opacity), scrimSel);
await page.mouse.up();
await sleep(40);
const instantClose = await page.evaluate(({ sel, pid }) => {
  const s = document.querySelector(sel);
  const p = document.getElementById(pid);
  return {
    open: s.classList.contains('open'),
    opacity: parseFloat(getComputedStyle(s).opacity),
    panelOpen: p.classList.contains('open'),
    panelTransform: getComputedStyle(p).transform,
    panelH: p.offsetHeight,
  };
}, { sel: scrimSel, pid: 'dualNotifPanel' });
t('D-1 慢拖中段 α 已跟手（k=0.1 → α≈0.015）', Math.abs(midDrag - 0.0151) <= 0.02, `got=${midDrag}`);
t('D-2 阈值下（0.1h<0.25h）释放 → 瞬收：.open 不在册 + opacity=0',
  !instantClose.open && !instantClose.panelOpen && instantClose.opacity === 0, `op=${instantClose.opacity}`);
const closedY = instantClose.panelH * 1.05;
const ty = Math.abs(parseFloat(instantClose.panelTransform.split(',')[5] || '0'));
t('D-3 面板同步瞬收（transform 已处全闭位，非过渡中）', ty > closedY * 0.95, `ty=${ty.toFixed(0)} closedY=${closedY.toFixed(0)}`);

// ---------- E2 纯点击开启（QS 右 25% 分区） ----------
const qsGeo = await page.evaluate(() => {
  const r = document.getElementById('dualHitQs').getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await page.mouse.click(qsGeo.x, qsGeo.y);
await sleep(650);
const qsOpen = await page.evaluate(() => {
  const s = document.getElementById('dualScrimQs');
  const p = document.getElementById('dualQsPanel');
  return { open: s.classList.contains('open'), opacity: parseFloat(getComputedStyle(s).opacity), panelOpen: p.classList.contains('open') };
});
t('E-2 QS 分区纯点击 → 开（scrim+面板）', qsOpen.open && qsOpen.panelOpen && qsOpen.opacity === 1, `op=${qsOpen.opacity}`);
await page.mouse.click(qsGeo.x, qsGeo.y);
await sleep(650);
const qsClosed = await page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('dualScrimQs')).opacity));
t('E-3 QS 再点击 → 关', qsClosed === 0, `op=${qsClosed}`);

// ---------- K ----------
t('K-1 全程零 pageerror', errors.length === 0, errors.length ? errors.slice(0, 2).join(' | ') : '');

await browser.close();
srv.close();
console.log(`\n==== e2e-v144-shade-interpolation 结果：pass=${pass} fail=${fail} ====`);
process.exit(fail === 0 ? 0 : 1);
