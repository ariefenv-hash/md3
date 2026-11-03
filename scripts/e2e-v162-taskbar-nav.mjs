// ==================== e2e-v162-taskbar-nav.mjs — #162 平板三键导航×任务栏重叠修复 ====================
//
// Q1 平板 1024×768（三键开启）：data-nav-host=taskbar + 独立浮条让位（display:none，零重叠）
//    + 任务栏内导航键 44×44 三枚在场
// Q2 平板三键行为：任务栏内概览键点击 → 多任务浮层开启（行为与独立浮条同语义）
// Q3 手机 400×800（三键开启）：data-nav-host=floating + 独立浮条照常显示（拖移吸附保留）
// Q4 平板 taskbar 关闭（desktop-prefs）：回 floating → 浮条恢复在场
// Q5 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8971;
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
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());   // 外域断网

// 预置：三键导航开启（独立浮条 would-be 在场）——loadPrefs 读 localStorage
await page.addInitScript(() => {
  try { localStorage.setItem('ios-desktop:navbar-enabled', '1'); } catch (e) {}
});

try {
  // Q1 平板：分派 taskbar → 浮条让位 + 任务栏内三键在场
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2200);
  const q1 = await page.evaluate(() => {
    const bar = document.getElementById('sysNavBar');
    const tb = document.getElementById('taskbar');
    const navBtns = tb ? tb.querySelectorAll('.taskbar-nav-btn') : [];
    const nb0 = navBtns[0] ? navBtns[0].getBoundingClientRect() : null;
    return {
      host: document.body.getAttribute('data-nav-host'),
      tbOn: document.body.classList.contains('taskbar-on'),
      barDisplay: bar ? getComputedStyle(bar).display : 'missing',
      navCount: navBtns.length,
      navW: nb0 ? Math.round(nb0.width) : 0,
      navVisible: nb0 ? nb0.height > 0 && nb0.width > 0 : false,
    };
  });
  A('Q1 平板 1024×768：host=taskbar + 浮条 display:none（重叠消除）+ 任务栏内 3 枚 44px 导航键在场',
    q1.host === 'taskbar' && q1.tbOn && q1.barDisplay === 'none' && q1.navCount === 3 && q1.navW === 44 && q1.navVisible,
    JSON.stringify(q1));

  // Q2 平板：任务栏内概览键点击 → 多任务浮层（与独立浮条同语义）
  await page.click('#taskbar .taskbar-nav-btn[data-nav="recents"]');
  await sleep(900);
  const q2 = await page.evaluate(() => {
    const el = document.getElementById('recentAppsOverlay');
    return { open: !!(el && el.classList.contains('active')) };
  });
  A('Q2 平板任务栏内概览键 → 多任务浮层开启（行为同语义）', q2.open, JSON.stringify(q2));
  await page.keyboard.press('Escape');
  await sleep(400);

  // Q3 手机：分派 floating → 浮条照常
  await page.setViewportSize({ width: 400, height: 800 });
  await sleep(700);
  const q3 = await page.evaluate(() => {
    const bar = document.getElementById('sysNavBar');
    return {
      host: document.body.getAttribute('data-nav-host'),
      tbOn: document.body.classList.contains('taskbar-on'),
      barDisplay: bar ? getComputedStyle(bar).display : 'missing',
      btns: bar ? bar.querySelectorAll('.nvb-btn').length : 0,
    };
  });
  A('Q3 手机 400×800：host=floating + 独立浮条照常显示（三键 3 枚，拖移吸附保留）',
    q3.host === 'floating' && !q3.tbOn && q3.barDisplay === 'flex' && q3.btns === 3,
    JSON.stringify(q3));

  // Q4 平板 + taskbar 开关关闭 → 回 floating 浮条恢复
  await page.setViewportSize({ width: 1024, height: 768 });
  await sleep(600);
  await page.evaluate(() => {
    // desktop-prefs 单源：内存 prefs 是权威（getDesktopPrefs 不重读 localStorage），
    // 改键后必须 __desktopPrefsInternal.reload() 回灌 + 派发 desktop-prefs-changed
    // （taskbar.js syncPresence 监听同链路，设置 › 桌面与 Dock 开关同语义）
    try {
      const raw = localStorage.getItem('ios-desktop:desktop-prefs');
      const p = raw ? JSON.parse(raw) : {};
      p.taskbarEnabled = false;
      localStorage.setItem('ios-desktop:desktop-prefs', JSON.stringify(p));
    } catch (e) {}
    if (window.__desktopPrefsInternal && window.__desktopPrefsInternal.reload) window.__desktopPrefsInternal.reload();
    window.dispatchEvent(new Event('desktop-prefs-changed'));
  });
  await sleep(800);
  const q4 = await page.evaluate(() => {
    const bar = document.getElementById('sysNavBar');
    return {
      host: document.body.getAttribute('data-nav-host'),
      tbOn: document.body.classList.contains('taskbar-on'),
      barDisplay: bar ? getComputedStyle(bar).display : 'missing',
    };
  });
  A('Q4 平板 taskbar 关闭：host 回 floating + 浮条恢复在场',
    q4.host === 'floating' && !q4.tbOn && q4.barDisplay === 'flex',
    JSON.stringify(q4));

  // Q5 全程零 pageerror
  A('Q5 全程零 pageerror', errors.length === 0, errors.length ? errors[0] : '');
} catch (e) {
  A('e2e 异常中断', false, String(e));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const failed = results.filter(([c]) => !c);
console.log(`\n==== e2e-v162-taskbar-nav: ${results.length - failed.length}/${results.length} ====${failed.length ? ' FAILED' : ' ALL PASS'}`);
process.exit(failed.length ? 1 : 0);
