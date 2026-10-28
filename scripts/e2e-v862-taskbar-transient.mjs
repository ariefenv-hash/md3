// ==================== e2e-v862-taskbar-transient.mjs — #74 Transient Taskbar 无头回归 ====================
//
// DoD（#74 验收原文逐条）：
//   A. 应用全屏不占位（常驻栏 5s AUTO 收纳后悬浮栏未在场）
//   B. 底部上滑达阈值浮出圆角悬浮栏（阈值 = 短边/80×4.5 自适应，768 短边 → 43px）
//   C. 悬浮栏几何：离底 24 / 最小宽 150 / 图标 57 / 内边距 12 / 1dp 描边 / 阴影 blur 40·距离 10
//   D. 内容：固定应用 + All Apps 入口（8dp 偏移）→ 触发 #73 平板浮层
//   E. 三条收起路径：5s 自动收起 / 栏内下滑 24dp 收起 / 点栏外立即收起
//   F. 唤出 417ms 弹簧中间帧 + 跟手阻尼（translateY 中间值在场）
//   G. 仲裁：上滑未超 app_window 阈值（96px@768）松手 → 不进概览、不关窗、窗口回弹
//   H. 首次引导只弹一次（edu + localStorage）
//   I. 压力：唤出→停留→自动收起 ×10 无残留
//   J. resize 断点切换：阈值重算 + 在场失守即收
//   K. 零 pageerror
//
// 教训沿袭：v859（真实 page.mouse 派发 pointer 链）、v857（起服+跑+kill 同命令）、
//           v860（关场弹簧轮询等待、weather 权限对话框先授予）、v861（sheet 起点避开 iframe 区）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v862');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8085/ios-desktop/index.html?nolock=1';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());

await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2200);

// 轮询工具
const poll = async (fn, ms = 7000, step = 120) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await page.evaluate(fn)) return true;
    await sleep(step);
  }
  return false;
};

// 底部上滑真实鼠标路径：按下于底部 38px 手势条带（全宽 container，z 550 高于 iframe），
// 上滑越过 nav 阈值（43px@768）后**回到条带内释放**——全程不离开父 DOM 命中面，
// pointerup 必达 window（规避 iframe 吞事件，v7.47 教训）。
async function barOpen() {
  return page.evaluate(() => document.getElementById('taskbar-transient').getAttribute('data-open') === '1');
}
async function closeBarFromStrip() {
  // 底部条带（父 DOM 命中面）栏外点按 → outside-tap 收起（iframe 区域点按会被吞，v7.47 同源教训）
  await page.mouse.click(150, 760);
  await poll(() => document.getElementById('taskbar-transient').getAttribute('data-open') === '0', 2000);
  await sleep(500);
}
async function swipeUpOpen(x = 150) {
  if (await barOpen()) await closeBarFromStrip(); // 已开先收（避免本次按下被 outside-tap 消费）
  await page.mouse.move(x, 766);
  await sleep(60);
  await page.mouse.down();
  // 分 8 步上滑 62px（>43 触发唤出；<96 app_window —— 仲裁段内）
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(x, 766 - i * 8, { steps: 1 });
    await sleep(24);
  }
  // 回到底部条带内释放（y=764 ≥ 730 手势条带下缘）
  await page.mouse.move(x, 764, { steps: 4 });
  await sleep(60);
  await page.mouse.up();
}
async function waitBarSettled() {
  await poll(() => document.getElementById('taskbar-transient').getAttribute('data-open') === '1', 2500);
  await poll(() => {
    const m = String(document.querySelector('.tbt-bar').style.transform || '').match(/translateY\(([-\d.]+)px\)/);
    return m ? Math.abs(parseFloat(m[1])) < 1 : false;
  }, 2200, 80);
  await sleep(150);
}

// ---------- A. 前置：开应用 + 常驻栏 5s AUTO 收纳（不占位稳态） ----------
await page.click('.taskbar-icon[data-id="phone"]');
await sleep(1500);
const a0 = await page.evaluate(() => ({
  appOpen: !!(window.__state && window.__state.isOpen),
  persistentStashed: document.getElementById('taskbar').classList.contains('stashed'),
  transientOpen: document.getElementById('taskbar-transient').getAttribute('data-open'),
}));
A('A0. 应用已开 + 悬浮栏未在场（data-open=0）', a0.appOpen && a0.transientOpen === '0', JSON.stringify(a0));
const stashed = await poll(() => document.getElementById('taskbar').classList.contains('stashed'), 8000);
A('A1. 常驻栏 5s AUTO 收纳（应用全屏无栏占位）', stashed);

// ---------- B. 底部上滑唤出（真实鼠标路径 + 阈值公式值 43px@768） ----------
await swipeUpOpen(150);
const b0 = await poll(() => document.getElementById('taskbar-transient').getAttribute('data-open') === '1', 2500);
const b1 = await page.evaluate(() => ({
  open: document.getElementById('taskbar-transient').getAttribute('data-open'),
  reason: document.getElementById('taskbar-transient').getAttribute('data-open-reason'),
  claim: window.__tbTransientClaim ? window.__tbTransientClaim.state : null,
}));
A('B1. 上滑 62px（>43 阈值）唤出悬浮栏（reason=swipe）', b0 && b1.reason === 'swipe', JSON.stringify(b1));
await sleep(1100); // 弹簧落定
const b2 = await page.evaluate(() => {
  const bar = document.querySelector('.tbt-bar');
  const m = String(bar.style.transform || '').match(/translateY\(([-\d.]+)px\)/);
  return { ty: m ? parseFloat(m[1]) : null, alpha: bar.style.getPropertyValue('--tbt-bg-alpha') };
});
A('B2. 唤出弹簧落定（translateY≈0，进度 1）', b2.ty !== null && Math.abs(b2.ty) < 1, JSON.stringify(b2));
await page.screenshot({ path: join(OUT, 'bar-open.png') });

// ---------- C. 悬浮栏几何（§1.6 原值） ----------
const c0 = await page.evaluate(() => {
  const bar = document.querySelector('.tbt-bar');
  const r = bar.getBoundingClientRect();
  const cs = getComputedStyle(bar);
  const icon = document.querySelector('.tbt-icon-img');
  const ir = icon.getBoundingClientRect();
  return {
    bottomGap: 768 - r.bottom,
    h: r.height, w: r.width,
    radius: cs.borderTopLeftRadius,
    stroke: cs.borderTopWidth,
    shadow: cs.boxShadow,
    z: getComputedStyle(document.getElementById('taskbar-transient')).zIndex,
    iconSize: ir.width,
    pad: cs.paddingTop,
  };
});
A('C1. 离底 24 + 高 81 + 最小宽 ≥150', Math.round(c0.bottomGap) === 24 && Math.round(c0.h) === 81 && c0.w >= 150, JSON.stringify({ g: c0.bottomGap, h: c0.h, w: Math.round(c0.w) }));
A('C2. 完整圆角浮栏 + 1dp 描边 + 阴影在场 + z 847 + 内边距 12', c0.radius === '999px' && c0.stroke === '1px' && c0.shadow !== 'none' && c0.z === '847' && parseFloat(c0.pad) === 12, JSON.stringify(c0));
A('C3. 图标 57（transient_taskbar_icon_size）', Math.round(c0.iconSize) === 57, `icon=${c0.iconSize}`);

// ---------- D. 内容 + 仲裁（松手不进概览不关窗） ----------
const d0 = await page.evaluate(() => ({
  icons: document.querySelectorAll('.tbt-icon').length,
  allapps: !!document.querySelector('.tbt-allapps'),
  allappsOffset: getComputedStyle(document.querySelector('.tbt-allapps')).marginLeft,
  recentsActive: document.getElementById('recentAppsOverlay').classList.contains('active'),
  appOpen: window.__state.isOpen,
  qs: window.__qsDebug ? window.__qsDebug() : null,
  claim: window.__tbTransientClaim,
}));
A('D1. 固定应用 ≥4 + All Apps 入口（margin-left 8dp）', d0.icons >= 4 && d0.allapps && d0.allappsOffset === '8px', JSON.stringify({ icons: d0.icons, off: d0.allappsOffset }));
A('D2. 仲裁生效：无概览、应用未关、窗口回弹 scale≈1、claim 已消费', !d0.recentsActive && d0.appOpen && d0.qs && Math.abs(d0.qs.scale - 1) < 0.02 && d0.claim === null, JSON.stringify({ scale: d0.qs ? d0.qs.scale : null, claim: d0.claim }));

// ---------- E. 点栏外立即收起（ACTION_DOWN outside） ----------
await page.mouse.click(150, 760); // 底部条带栏外点（父 DOM 命中面，iframe 区点按会被吞）
const e0 = await poll(() => document.getElementById('taskbar-transient').getAttribute('data-open') === '0', 2000);
const e1 = await page.evaluate(() => document.getElementById('taskbar-transient').getAttribute('data-stash-reason'));
A('E1. 点栏外立即收起（reason=outside-tap）', e0 && e1 === 'outside-tap', `reason=${e1}`);

// ---------- F. 跟手阻尼中间帧（二次唤出 + 慢步进采样） ----------
await swipeUpOpen(200);
await sleep(120); // 唤出已在滑动中途触发 → 弹簧尚在推进，立即采样
// 唤出弹簧推进序列采样（0 → 1 之间存在中间帧）
const f0 = await page.evaluate(() => new Promise((resolve) => {
  const vals = [];
  const t0 = Date.now();
  const timer = setInterval(() => {
    const bar = document.querySelector('.tbt-bar');
    const m = String(bar.style.transform || '').match(/translateY\(([-\d.]+)px\)/);
    if (m) vals.push(parseFloat(m[1]));
    if (Date.now() - t0 > 1200) { clearInterval(timer); resolve(vals); }
  }, 60);
}));
const hasMid = f0.some((v) => v > 1 && v < 116);
A('F1. 417ms 弹簧中间帧在场（0 < translateY < 117）', hasMid, JSON.stringify(f0.slice(0, 6)));
await waitBarSettled();
// All Apps → #73 平板浮层 + 悬浮栏收起
await page.click('.tbt-allapps');
await sleep(1100);
const f1 = await page.evaluate(() => {
  const ov = document.getElementById('allAppsOverlay');
  return {
    open: ov.classList.contains('active'),
    form: ov.getAttribute('data-form') || ov.dataset.form || '',
    tbOpen: document.getElementById('taskbar-transient').getAttribute('data-open'),
    edu: window.localStorage.getItem('md3.tbTransientEdu'),
  };
});
A('F2. All Apps 触发 #73 平板浮层 + 悬浮栏收起', f1.open && f1.form === 'tablet' && f1.tbOpen === '0', JSON.stringify(f1));

// 下拉关闭平板浮层（v861 实证手势：header 带 300px 拖拽，进度 ≥0.3 关闭；Escape 语义=关应用不可用）
const sheetTop = await page.evaluate(() => {
  const sh = document.querySelector('#allAppsOverlay .aa-sheet');
  return sh ? sh.getBoundingClientRect().top : 0;
});
await page.mouse.move(640, sheetTop + 20);
await page.mouse.down();
await page.mouse.move(640, sheetTop + 180, { steps: 6 });
await page.mouse.move(640, sheetTop + 300, { steps: 6 });
await page.mouse.up();
await sleep(700);
const f2 = await page.evaluate(() => ({
  overlayGone: !document.getElementById('allAppsOverlay'), // ephemeral 开建关毁（v8.61）
  appStillOpen: window.__state.isOpen,
  edu: window.localStorage.getItem('md3.tbTransientEdu'),
  eduShow: !!document.querySelector('.tbt-edu') && document.querySelector('.tbt-edu').classList.contains('show'),
}));
A('F3. 浮层关闭（ephemeral 毁）+ 应用仍在前台（Escape 语义规避）', f2.overlayGone && f2.appStillOpen, JSON.stringify(f2));
A('F4. edu 首次引导落盘（关闭浮层 → 重武装 → 只弹一次）', f2.edu === '1', `edu=${f2.edu} show=${f2.eduShow}`);
await page.screenshot({ path: join(OUT, 'after-allapps.png') });

// ---------- G. 栏内下滑 24dp 收起 ----------
await swipeUpOpen(150);
await waitBarSettled();
const gRect = await page.evaluate(() => {
  const r = document.querySelector('.tbt-bar').getBoundingClientRect();
  return { x: Math.round(r.left + 6), y: Math.round(r.top + r.height / 2) }; // 左缘内边距区（避开图标点击）
});
await page.mouse.move(gRect.x, gRect.y);
await sleep(80);
await page.mouse.down();
await page.mouse.move(gRect.x, gRect.y + 40, { steps: 6 }); // ≥24dp
await sleep(80);
await page.mouse.up();
const g0 = await poll(() => document.getElementById('taskbar-transient').getAttribute('data-open') === '0', 2000);
const g1 = await page.evaluate(() => document.getElementById('taskbar-transient').getAttribute('data-stash-reason'));
A('G1. 栏内下滑 40px ≥ 24dp 收起（reason=swipe-down）', g0 && g1 === 'swipe-down', `reason=${g1}`);

// ---------- H. 5s 无交互自动收起（完整路径实测） ----------
await swipeUpOpen(150);
const h0 = await poll(() => document.getElementById('taskbar-transient').getAttribute('data-open') === '1', 2500);
await sleep(300);
const h1 = await poll(() => document.getElementById('taskbar-transient').getAttribute('data-open') === '0', 6800, 150);
const h2 = await page.evaluate(() => document.getElementById('taskbar-transient').getAttribute('data-stash-reason'));
A('H1. 5s 无交互自动收起（reason=auto-timeout）', h0 && h1 && h2 === 'auto-timeout', `reason=${h2}`);

// ---------- I. 压力：唤出→停留→自动收起 ×10 无残留 ----------
let iOk = true;
for (let i = 0; i < 10; i++) {
  await swipeUpOpen(150 + (i % 3) * 40);
  const opened = await poll(() => document.getElementById('taskbar-transient').getAttribute('data-open') === '1', 2500);
  if (!opened) { iOk = false; console.log(`    cycle ${i + 1}: OPEN 失败`); break; }
  const closed = await poll(() => document.getElementById('taskbar-transient').getAttribute('data-open') === '0', 6800, 150);
  if (!closed) { iOk = false; console.log(`    cycle ${i + 1}: AUTO-STASH 失败`); break; }
}
A('I1. ×10 唤出→自动收起循环全通过', iOk);
// 等最后一次收起弹簧落定（stash 417ms）再断言零残留
await poll(() => {
  const m = String(document.querySelector('.tbt-bar').style.transform || '').match(/translateY\(([-\d.]+)px\)/);
  return m ? parseFloat(m[1]) >= 116 : false;
}, 2200, 80);
const i1 = await page.evaluate(() => ({
  open: document.getElementById('taskbar-transient').getAttribute('data-open'),
  ty: (String(document.querySelector('.tbt-bar').style.transform || '').match(/translateY\(([-\d.]+)px\)/) || [])[1],
  appOpen: window.__state.isOpen,
  recents: document.getElementById('recentAppsOverlay').classList.contains('active'),
}));
A('I2. 循环后零残留（收起位 + 应用仍在 + 无概览）', i1.open === '0' && parseFloat(i1.ty) > 100 && i1.appOpen && !i1.recents, JSON.stringify(i1));
await page.screenshot({ path: join(OUT, 'final.png') });

// ---------- J. resize 断点切换：阈值重算 + 在场失守即收 ----------
await swipeUpOpen(150);
await poll(() => document.getElementById('taskbar-transient').getAttribute('data-open') === '1', 2500);
await page.setViewportSize({ width: 700, height: 800 });
await sleep(900);
const j0 = await page.evaluate(() => ({
  open: document.getElementById('taskbar-transient').getAttribute('data-open'),
  reason: document.getElementById('taskbar-transient').getAttribute('data-stash-reason'),
}));
A('J1. 跨断点 resize（<768）悬浮栏即收（reason=context-lost）', j0.open === '0' && j0.reason === 'context-lost', JSON.stringify(j0));
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(900);
const j1 = await page.evaluate(() => ({
  nav: document.getElementById('taskbar-transient').getAttribute('data-nav-threshold'),
  short: document.getElementById('taskbar-transient').getAttribute('data-short-side'),
}));
A('J2. 阈值重算（短边 768 → nav 43 = round(768/80×4.5)）', j1.nav === '43' && j1.short === '768', JSON.stringify(j1));

// ---------- K. 零 pageerror ----------
A('K1. 零 pageerror', errors.length === 0, errors.length ? errors[0].slice(0, 200) : '');

console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
