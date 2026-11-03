// ==================== e2e-v199-desktop-tasks.mjs — #199 桌面窗口治理 e2e ====================
//
// Q1 limiter 治理：连开 7 个小窗 → 第 7 个照开（永不拒绝）+ 最早窗自动最小化（芯片出现）
// Q2 三落点预示：拖小窗 header 贴左边缘 → .desktop-visual-indicator.zone-left 高亮在场
// Q3 半屏落位：松手 → 小窗吸附左半矩形（x≈8，宽受 MINI_MIN_W 钳位 200）
// Q4 题签双击：header 双击 → mini-maximized 沉浸最大化；再双击还原 preMaxRect
// Q5 全屏落位：拖到顶边缘松手 → 全屏接管（appWindow.open，AOSP fullscreen drop 等价）
// Q6 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8978;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome' });
const page = await browser.newPage({ viewport: { width: 400, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());

// 测试卫生：批量唤醒 7 应用会排队异步弹出多个运行时权限框（#md3PermissionOverlay z=9500）
// 与 heads-up 通知（#headsUpStack），均 z 高于小窗拦截 header 交互（AOSP 同语义）——与被测
// 逻辑无关；循环清理直至清净，防止拖拽中弹出新框拦截 pointer 流
const dismissOverlays = async () => {
  for (let i = 0; i < 6; i++) {
    const had = await page.evaluate(() => {
      const ov = document.getElementById('md3PermissionOverlay');
      if (ov) { const b = ov.querySelector('button[data-act="granted"]'); if (b) b.click(); else ov.remove(); return true; }
      const h = document.getElementById('headsUpStack');
      if (h) { h.remove(); return true; }
      const toasts = document.querySelectorAll('.hun-banner, #systemGlobalToast');
      if (toasts.length) { toasts.forEach((e) => e.remove()); return true; }
      return false;
    });
    if (!had) break;
    await sleep(320);
  }
};

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  await page.evaluate(() => {
    const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
    if (btn) btn.click();
  });
  await sleep(400);

  // Q1 limiter 治理：连开 7 个小窗（上限 6 → 最早窗自动最小化，第 7 个照开）
  await page.evaluate(() => {
    ['msg', 'notes', 'cal_app', 'clock_app', 'weather', 'music', 'calculator'].forEach((id) => {
      window.__miniWindowOpen(id, null);
    });
  });
  await sleep(700); // 最小化动画 240ms + 芯片落档
  // 排队的权限请求/通知需时间逐个弹出：加长等待后循环清净
  await sleep(1500);
  await dismissOverlays();
  const q1 = await page.evaluate(() => ({
    total: window.__miniWindowAll().length,
    chips: document.querySelectorAll('.mini-restore-chip').length,
    visible: document.querySelectorAll('.mini-window').length,
    hidden: Array.from(document.querySelectorAll('.mini-window')).filter((el) => el.style.display === 'none').length,
  }));
  A('Q1 limiter 治理：7 窗全开（永不拒绝）+ 栈底窗自动最小化出芯片（可见 6）',
    q1.total === 7 && q1.chips >= 1 && q1.hidden === 1, JSON.stringify(q1));

  // Q2+Q3 三落点预示与半屏落位：拖顶层小窗 header 贴左边缘
  await dismissOverlays();
  const rect0 = await page.evaluate(() => {
    const ids = window.__miniWindowAll();
    const el = document.querySelector(`.mini-window[data-app-id="${ids[ids.length - 1]}"]`);
    const r = el.getBoundingClientRect();
    return { appId: ids[ids.length - 1], x: r.left, y: r.top, w: r.width, h: r.height };
  });
  const hx = Math.min(Math.max(rect0.x + rect0.w / 2, 40), 360);
  // 状态栏（z>590）遮蔽 header 顶部 ~44px：交互点取 header 下缘安全带（top+38）
  const hy = rect0.y + 38; // header 下缘（header 40px 高，顶部被 status-bar 拦截）
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  // 分步拖到左边缘（x=12 < 48 阈值）
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(hx + (12 - hx) * (i / 8), hy + 30, { steps: 2 });
    await sleep(40);
  }
  const q2pre = await page.evaluate(() => ({
    indicator: !!document.getElementById('desktopVisualIndicator'),
    cls: document.getElementById('desktopVisualIndicator') ? document.getElementById('desktopVisualIndicator').className : '',
  }));
  console.log('PROBE q2pre:', JSON.stringify(q2pre));
  const q2 = await page.evaluate(() => {
    const el = document.getElementById('desktopVisualIndicator');
    return el ? { on: el.classList.contains('on'), zone: el.dataset.zone || '', left: el.classList.contains('zone-left') } : null;
  });
  A('Q2 三落点预示：贴左边缘 → 指示器 on + zone-left 高亮（DesktopModeVisualIndicator）',
    q2 && q2.on && q2.left && q2.zone === 'left-half', JSON.stringify(q2));
  await page.mouse.up();
  await sleep(900); // 四通道弹簧落位
  const q3 = await page.evaluate((appId) => {
    const el = document.querySelector(`.mini-window[data-app-id="${appId}"]`);
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) };
  }, rect0.appId);
  A('Q3 半屏落位：小窗吸附左半（x≈8，宽受 MINI_MIN_W 钳位 200，高≈784）',
    Math.abs(q3.x - 8) <= 2 && Math.abs(q3.w - 200) <= 3 && q3.h > 700, JSON.stringify(q3));

  // Q4 题签双击最大化/还原（双击间隔 < 300ms、位移 < 12px）
  // 权限框/hun 为 Q1 批量唤醒应用的异步副作用，与本测试无关，前置清理
  await dismissOverlays();
  const r1 = await page.evaluate((appId) => {
    const el = document.querySelector(`.mini-window[data-app-id="${appId}"]`);
    const r = el.getBoundingClientRect();
    const e2 = document.elementFromPoint(r.left + r.width / 2, r.top + 38);
    const chain = [];
    let n = e2;
    for (let i = 0; i < 6 && n && n.tagName !== 'BODY'; i++) {
      chain.push(n.tagName + '#' + (n.id || '') + '.' + ((n.className && n.className.toString) ? n.className.toString().slice(0, 36) : ''));
      n = n.parentElement;
    }
    window.__ev = { down: 0, up: 0 };
    const header = el.querySelector('.mini-header');
    header.addEventListener('pointerdown', () => window.__ev.down++);
    header.addEventListener('pointerup', () => window.__ev.up++);
    return { x: r.left + r.width / 2, y: r.top + 38, hit: chain.join(' > ') }; // header 下缘安全带（避开状态栏）
  }, rect0.appId);
  console.log('PROBE q4 hit:', r1.hit);
  await page.mouse.move(r1.x, r1.y);
  await page.mouse.down(); await page.mouse.up();
  await sleep(90);
  await page.mouse.down(); await page.mouse.up();
  await sleep(700); // 最大化四通道弹簧
  const q4a = await page.evaluate((appId) => {
    const el = document.querySelector(`.mini-window[data-app-id="${appId}"]`);
    const r = el.getBoundingClientRect();
    return { maximized: el.classList.contains('mini-maximized'), x: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) };
  }, rect0.appId);
  await sleep(120);
  await page.mouse.down(); await page.mouse.up();
  await sleep(90);
  await page.mouse.down(); await page.mouse.up();
  await sleep(700);
  const q4b = await page.evaluate((appId) => {
    const el = document.querySelector(`.mini-window[data-app-id="${appId}"]`);
    const r = el.getBoundingClientRect();
    return { maximized: el.classList.contains('mini-maximized'), x: Math.round(r.left), w: Math.round(r.width) };
  }, rect0.appId);
  A('Q4 题签双击：一击最大化（mini-maximized + 近全幅矩形）→ 二击还原（Freeform 矩形）',
    q4a.maximized && q4a.x <= 10 && q4a.w > 380 && !q4b.maximized && q4b.w <= 205,
    JSON.stringify({ q4a, q4b }));

  // Q5 全屏落位：拖到顶边缘（y=12 < 48）松手 → 全屏接管
  await dismissOverlays();
  const r2 = await page.evaluate((appId) => {
    const el = document.querySelector(`.mini-window[data-app-id="${appId}"]`);
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + 38 }; // header 下缘安全带
  }, rect0.appId);
  await page.mouse.move(r2.x, r2.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) {
    await page.mouse.move(r2.x + (300 - r2.x) * 0.2, r2.y + (12 - r2.y) * (i / 8), { steps: 2 });
    await sleep(40);
  }
  await page.mouse.up();
  await sleep(900);
  const q5 = await page.evaluate((appId) => ({
    fullscreenOpen: document.getElementById('appWindow').classList.contains('open'),
    miniGone: !document.querySelector(`.mini-window[data-app-id="${appId}"]`),
  }), rect0.appId);
  A('Q5 全屏落位：顶边缘松手 → 全屏接管（appWindow.open，AOSP fullscreen drop 等价）',
    q5.fullscreenOpen, JSON.stringify(q5));

  A('Q6 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 300));
} catch (e) {
  A('e2e 异常中断', false, String(e).slice(0, 300));
}

await browser.close();
server.kill();
const passed = results.filter((r) => r[0]).length;
console.log(`\n===== e2e-v199-desktop-tasks: ${passed}/${results.length} =====`);
process.exit(passed === results.length ? 0 : 1);
