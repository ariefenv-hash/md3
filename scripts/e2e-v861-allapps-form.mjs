// ==================== e2e-v861-allapps-form.mjs — #73 应用抽屉双形态分化无头回归 ====================
//
// DoD（#73 验收原文逐条）：
//   A. 平板（1280×800）：任务栏 All Apps 按钮 → 浮层 sheet（data-form=tablet），
//      顶部留白 = 视口高/6（133px）、圆角上缘、267ms
//   B. 应用内可达（§三.9 效率来源）：开应用 → 任务栏 All Apps → 浮层在应用之上 →
//      点另一应用 = 切换（应用窗保持开、抽屉收）
//   C. 关闭三路径：下拉超过阈值 0.3 / Esc / 点上方露出的桌面区域（scrim 顶部留白带）
//   D. 手机（412×850）：上滑 → 全屏抽屉（data-form=phone）+ 600ms；应用内 open 拒绝
//   E. resize 跨 768 断点：开着销毁重建、无残留 DOM
//   F. 手机/平板各开合 10 次无残留（overlay 计数恒 1/0）
//   G. 零 pageerror
//
// 教训沿袭：v858（goto load+固定等待、外域 route.abort）、v857（起服+跑+kill 同命令）、
//           v860（weather 权限对话框拦截需先授予、rAF 轮询不可靠→Node 侧 waitUntil）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v861');
mkdirSync(OUT, { recursive: true });
const PORT = 8086;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

// 起服 + 跑 + kill 同命令（v857 纪律：防后台进程被会话回收）
const server = spawn('node', [join(root, 'scripts', 'serve.mjs'), '--port', String(PORT)], {
  stdio: 'ignore',
});
await sleep(1500);

const browser = await chromium.launch({ headless: true, executablePath: EXE });

// ==================== 平板视口 1280×800 ====================
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(1800);

// ---------- A. 任务栏 All Apps 按钮 → 浮层 ----------
const tbVisible = await page.evaluate(() => {
  const tb = document.getElementById('taskbar');
  return !!tb && !tb.classList.contains('hidden');
});
A('A0. 平板视口任务栏在册（#72 前置）', tbVisible);

await page.click('.taskbar-allapps');
await sleep(500); // 267ms 出场 + 余量
const sheet = await page.evaluate(() => {
  const ov = document.getElementById('allAppsOverlay');
  const sh = ov ? ov.querySelector('.aa-sheet') : null;
  if (!ov || !sh) return null;
  const r = sh.getBoundingClientRect();
  return {
    form: ov.dataset.form,
    active: ov.classList.contains('active'),
    top: r.top,
    radius: getComputedStyle(sh).borderTopLeftRadius,
    z: getComputedStyle(ov).zIndex,
    items: ov.querySelectorAll('.aa-item').length,
  };
});
A('A1. data-form=tablet + active', sheet && sheet.form === 'tablet' && sheet.active, JSON.stringify(sheet));
A('A2. 顶部留白 = 视口高/6（800/6≈133.3）', sheet && Math.abs(sheet.top - 800 / 6) < 1, `top=${sheet && sheet.top.toFixed(1)}`);
A('A3. 上缘圆角 28px', sheet && sheet.radius === '28px', `r=${sheet && sheet.radius}`);
A('A4. z=848（> taskbar 846 / mini 590 / 分屏 760，< shade 850）', sheet && sheet.z === '848', `z=${sheet && sheet.z}`);
A('A5. 全注册表 45 条目', sheet && sheet.items === 45, `n=${sheet && sheet.items}`);
await page.screenshot({ path: join(OUT, 'tablet-sheet.png') });

// ---------- C2. Esc 关闭（浮层态） ----------
await page.keyboard.press('Escape');
await sleep(450);
const escGone = await page.evaluate(() => !document.getElementById('allAppsOverlay'));
A('C2. Esc 关闭 → ephemeral DOM 已销毁', escGone);

// ---------- C3. 点上方露出桌面区域（scrim 顶部留白带） ----------
await page.evaluate(() => window.__allApps.open('scrim-test'));
await sleep(450);
await page.mouse.click(640, 60); // 顶部留白带（<133px）= scrim 区域
await sleep(450);
const scrimClosed = await page.evaluate(() => !document.getElementById('allAppsOverlay'));
A('C3. 点顶部留白（scrim）关闭', scrimClosed);

// ---------- B. 应用内可达 + 切换应用（§三.9） ----------
// B1. 先开一个应用（calculator——v8.60 教训：weather 首开权限对话框拦截全屏指针）
const openAppByDock = await page.evaluate(async () => {
  const m = await import('./js/app-window.js');
  const d = await import('./js/apps-data.js');
  const idx = d.initialApps.findIndex((a) => a.id === 'calculator');
  m.openApp(idx, null);
  return true;
});
await sleep(1400); // 开窗弹簧
const appOpen = await page.evaluate(() => document.getElementById('appWindow').classList.contains('open'));
A('B1. 计算器应用已开', appOpen && openAppByDock);

// B2. 任务栏 All Apps → 应用内拉起浮层（手机形态此路不通，平板必须通）
await page.click('.taskbar-allapps');
await sleep(500);
const inAppSheet = await page.evaluate(() => {
  const ov = document.getElementById('allAppsOverlay');
  const win = document.getElementById('appWindow');
  return {
    active: ov && ov.classList.contains('active'),
    form: ov && ov.dataset.form,
    appStillOpen: win.classList.contains('open'),
    z: ov ? getComputedStyle(ov).zIndex : '',
  };
});
A('B2. 应用内拉起浮层（§三.9 效率来源）', inAppSheet && inAppSheet.active && inAppSheet.form === 'tablet' && inAppSheet.appStillOpen, JSON.stringify(inAppSheet));
A('B3. 浮层 z=848 高于应用窗(540)', inAppSheet && inAppSheet.z === '848');
await page.screenshot({ path: join(OUT, 'inapp-sheet.png') });

// B4. 点另一应用 = 切换（抽屉收、应用窗保持开）——notes 无权限弹窗链路
await page.click('.aa-item[data-app-id="notes"]');
await sleep(1200);
const switched = await page.evaluate(() => {
  const ov = document.getElementById('allAppsOverlay');
  const win = document.getElementById('appWindow');
  return {
    drawerGone: !ov, // ephemeral 销毁
    appStillOpen: win.classList.contains('open'),
  };
});
A('B4. 点浮层条目 → 切换应用（抽屉收 + 应用窗保持开）', switched.drawerGone && switched.appStillOpen, JSON.stringify(switched));

// 关闭应用复位（轮询重试，v858 教训）
let appClosed = false;
for (let i = 0; i < 8 && !appClosed; i++) {
  await sleep(500);
  appClosed = await page.evaluate(async () => {
    if (!document.getElementById('appWindow').classList.contains('open')) return true;
    const m = await import('./js/app-window.js');
    m.closeApp(0, 0, 0);
    return false;
  });
}
A('B5. 关应用复位现场', appClosed);

// ---------- C1. 下拉关闭（阈值 0.3） ----------
await page.evaluate(() => window.__allApps.open('drag-test'));
await sleep(450);
// header 区（搜索框上方 padding 带，避开 input 本身）按下下拉 300px（>0.3×667 sheet 高）
const sheetTop = await page.evaluate(() => {
  const sh = document.querySelector('#allAppsOverlay .aa-sheet');
  return sh.getBoundingClientRect().top;
});
await page.mouse.move(640, sheetTop + 20);
await page.mouse.down();
await page.mouse.move(640, sheetTop + 180, { steps: 6 });
await page.mouse.move(640, sheetTop + 300, { steps: 6 });
await page.mouse.up();
await sleep(500);
const dragClosed = await page.evaluate(() => !document.getElementById('allAppsOverlay'));
A('C1. 下拉 300px（进度≈0.45≥0.3）关闭', dragClosed);

// ---------- E. resize 跨断点：开着销毁 ----------
await page.evaluate(() => window.__allApps.open('resize-test'));
await sleep(400);
await page.setViewportSize({ width: 600, height: 850 });
await sleep(300);
const resizeGone = await page.evaluate(() => ({
  overlayGone: !document.getElementById('allAppsOverlay'),
  inactive: !window.__allApps.isActive(),
}));
A('E1. 平板开着 resize→手机：立即关 + DOM 销毁', resizeGone.overlayGone && resizeGone.inactive, JSON.stringify(resizeGone));

// ---------- F. 平板开合 10 次无残留 ----------
let tabletCycleOk = true;
for (let i = 0; i < 10; i++) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await sleep(120);
  await page.evaluate(() => window.__allApps.open('cycle-t'));
  await sleep(150);
  await page.evaluate(() => window.__allApps.close());
  await sleep(350);
  const st = await page.evaluate(() => ({
    overlays: document.querySelectorAll('.all-apps-overlay').length,
    inactive: !window.__allApps.isActive(),
  }));
  if (st.overlays !== 0 || !st.inactive) { tabletCycleOk = false; console.log(`  cycle-t#${i}`, JSON.stringify(st)); break; }
}
A('F1. 平板开合 10 次无残留（overlay 计数恒 0）', tabletCycleOk);

await page.close();

// ==================== 手机视口 412×850 ====================
const mp = await browser.newPage({ viewport: { width: 412, height: 850 }, colorScheme: 'dark' });
mp.on('pageerror', (e) => errors.push(String(e)));
await mp.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
await mp.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(1800);

// D1. 上滑 → 全屏抽屉（data-form=phone）
await mp.mouse.move(400, 500);
await mp.mouse.down();
await mp.mouse.move(400, 420, { steps: 6 });
await mp.mouse.move(400, 340, { steps: 6 });
await mp.mouse.up();
await sleep(800);
const phoneForm = await mp.evaluate(() => {
  const ov = document.getElementById('allAppsOverlay');
  const sh = ov ? ov.querySelector('.aa-sheet') : null;
  if (!ov) return null;
  const r = sh.getBoundingClientRect();
  return { form: ov.dataset.form, active: ov.classList.contains('active'), top: r.top, h: r.height };
});
A('D1. 手机上滑 → 全屏抽屉（form=phone，top≈0 铺满）', phoneForm && phoneForm.form === 'phone' && phoneForm.active && phoneForm.top < 2, JSON.stringify(phoneForm));
await mp.screenshot({ path: join(OUT, 'phone-full.png') });

// D2. 手机应用内 open 拒绝（先点条目开应用）
await mp.click('.aa-item[data-app-id="calculator"]');
await sleep(1200);
const inAppGuard = await mp.evaluate(() => {
  const win = document.getElementById('appWindow');
  const ok = win.classList.contains('open');
  const rejected = !window.__allApps.open('inapp-phone-reject');
  return { ok, rejected };
});
A('D2. 手机应用窗口开 → open 拒绝（Launcher state 不可达）', inAppGuard.ok && inAppGuard.rejected, JSON.stringify(inAppGuard));

// 关应用复位
for (let i = 0; i < 8; i++) {
  await sleep(400);
  const done = await mp.evaluate(async () => {
    if (!document.getElementById('appWindow').classList.contains('open')) return true;
    const m = await import('./js/app-window.js');
    m.closeApp(0, 0, 0);
    return false;
  });
  if (done) break;
}

// F2. 手机开合 10 次无残留
let phoneCycleOk = true;
for (let i = 0; i < 10; i++) {
  await mp.evaluate(() => window.__allApps.open('cycle-p'));
  await sleep(200);
  await mp.evaluate(() => window.__allApps.close());
  await sleep(400);
  const st = await mp.evaluate(() => ({
    overlays: document.querySelectorAll('.all-apps-overlay').length, // persistent：恒 1（保留 DOM）
    inactive: !window.__allApps.isActive(),
  }));
  if (st.overlays !== 1 || !st.inactive) { phoneCycleOk = false; console.log(`  cycle-p#${i}`, JSON.stringify(st)); break; }
}
A('F2. 手机开合 10 次无残留（persistent DOM 恒 1 + 状态复位）', phoneCycleOk);

// E2. 手机开着 resize→平板：销毁重建
await mp.evaluate(() => window.__allApps.open('resize-p'));
await sleep(300);
await mp.setViewportSize({ width: 1280, height: 800 });
await sleep(300);
const mpResize = await mp.evaluate(() => ({
  gone: !document.getElementById('allAppsOverlay'),
  inactive: !window.__allApps.isActive(),
}));
A('E2. 手机开着 resize→平板：立即关 + DOM 销毁', mpResize.gone && mpResize.inactive, JSON.stringify(mpResize));
await mp.close();

A('G1. 零 pageerror', errors.length === 0, errors.length ? errors[0] : '');

console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
await browser.close();
server.kill();
process.exit(fail === 0 ? 0 : 1);
