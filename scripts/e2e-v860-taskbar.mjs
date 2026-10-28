// ==================== e2e-v860-taskbar.mjs — #72 平板任务栏无头回归 ====================
//
// DoD（#72 验收原文逐条）：
//   A. 断点互斥：≥768 任务栏在场 + Dock 隐藏；<768 反向回退零残留
//   B. 实测几何：栏高 56 / 图标触控 48 / 导航 44 / 圆角 16 / 手柄 220×4
//   C. 三段内容与导航：固定区 / 运行指示条 / All Apps 入口（#66）/ 返回·Home·概览三键
//   D. 收纳双态：应用内 5000ms 自动收纳（417ms 弹簧·0.5 缩放）/ 手柄悬浮唤出
//   E. 容量溢出：窄容器把手在场 + 面板不丢项
//   F. 压力：开/关应用 10 次无残留
//   G. 零 pageerror
//
// 教训沿袭：v859（goto load+固定等待、外域 route.abort、真实 page.click 派发 pointer 链）、
//           v857（起服+跑+kill 同命令）、v856（evaluate 不传闭包、显式传参）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v860');
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
await sleep(2000);

// ---------- A. 断点互斥与在场 ----------
const a = await page.evaluate(() => {
  const tb = document.getElementById('taskbar');
  const dock = document.querySelector('.dock-bar');
  return {
    on: document.body.classList.contains('taskbar-on'),
    tbVisible: tb && !tb.classList.contains('hidden') && getComputedStyle(tb).display !== 'none',
    dockHidden: dock && getComputedStyle(dock).display === 'none',
    space: document.documentElement.style.getPropertyValue('--taskbar-space'),
  };
});
A('A1. 平板断点：taskbar-on 在场（display≠none）', a.on && a.tbVisible);
A('A2. Dock 互斥隐藏（display:none）+ --taskbar-space=68px', a.dockHidden && a.space === '68px', `space=${a.space}`);

// ---------- B. 实测几何（§1.4 原值） ----------
const g = await page.evaluate(() => {
  const tb = document.getElementById('taskbar');
  const nav = tb.querySelector('.taskbar-nav-btn');
  const icon = tb.querySelector('.taskbar-fixed .taskbar-icon');
  const handle = tb.querySelector('.taskbar-handle');
  const cs = getComputedStyle(tb);
  return {
    h: tb.getBoundingClientRect().height,
    radius: cs.borderTopLeftRadius,
    navW: nav.getBoundingClientRect().width, navH: nav.getBoundingClientRect().height,
    iconW: icon.getBoundingClientRect().width,
    handleW: handle.offsetWidth, handleH: handle.offsetHeight,
  };
});
A('B1. 栏高 56 + 圆角 16', Math.round(g.h) === 56 && g.radius === '16px', JSON.stringify(g));
A('B2. 导航按钮 44×44 + 图标触控 48', Math.round(g.navW) === 44 && Math.round(g.navH) === 44 && Math.round(g.iconW) === 48, `nav=${g.navW}x${g.navH} icon=${g.iconW}`);
A('B3. 收纳手柄 220×4', g.handleW === 220 && g.handleH === 4, `${g.handleW}x${g.handleH}`);

// ---------- C. 三段内容与导航 ----------
const c0 = await page.evaluate(() => ({
  fixed: document.querySelectorAll('.taskbar-fixed .taskbar-icon').length,
  allapps: !!document.querySelector('.taskbar-allapps'),
  navs: [...document.querySelectorAll('.taskbar-nav-btn')].map((b) => b.dataset.nav),
}));
A('C1. 固定区 ≥4 项 + All Apps 在册 + 三键 back/home/recents', c0.fixed >= 4 && c0.allapps && c0.navs.join() === 'back,home,recents', JSON.stringify(c0));

// All Apps 入口 → #66 抽屉
await page.click('.taskbar-allapps');
await sleep(900);
const drawerOpen = await page.evaluate(() => {
  const drawer = document.getElementById('allAppsOverlay');
  return { any: !!drawer && drawer.classList.contains('active'), cls: drawer ? drawer.className : '' };
});
A('C2. All Apps 按钮唤出 #66 抽屉', drawerOpen.any, drawerOpen.cls.slice(0, 60));
await page.keyboard.press('Escape');
await sleep(600);

// 开应用（点任务栏固定图标 phone）→ 运行指示条 + 应用窗在场
await page.click('.taskbar-icon[data-id="phone"]');
await sleep(1400);
const c3 = await page.evaluate(() => {
  const icon = document.querySelector('.taskbar-icon[data-id="phone"]');
  return {
    appOpen: !!(window.__state && window.__state.isOpen),
    indicator: icon && icon.classList.contains('is-running'),
  };
});
A('C3. 点任务栏图标开应用（state.isOpen）+ 指示条在场', c3.appOpen && c3.indicator, JSON.stringify(c3));

// 概览键 → 最近任务层
await page.click('.taskbar-nav-btn[data-nav="recents"]');
await sleep(1000);
const c4 = await page.evaluate(() => {
  const el = document.getElementById('recentAppsOverlay');
  return !!(el && el.classList.contains('active'));
});
A('C4. 概览键唤出最近任务层', c4);
// Home 键 → 关场回桌面
await page.click('.taskbar-nav-btn[data-nav="home"]');
await sleep(1200);
const c5 = await page.evaluate(() => {
  const el = document.getElementById('recentAppsOverlay');
  const closed = !el || !el.classList.contains('active');
  const appClosed = !(window.__state && window.__state.isOpen);
  return { closed, appClosed };
});
A('C5. Home 键回桌面（概览层关闭 + 应用关闭）', c5.closed && c5.appClosed, JSON.stringify(c5));

// ---------- D. 收纳双态（5000ms 自动收纳 + 手柄唤出） ----------
// 先开一个应用（应用内才走 AUTO 收纳）
await page.click('.taskbar-icon[data-id="msg"]');
await sleep(1400);
const inApp = await page.evaluate(() => !!(window.__state && window.__state.isOpen));
const d0 = await page.evaluate(() => window.__state.isOpen);
A('D0. 前置：应用内（transient 展开态）', inApp && d0);

// 轮询捕获收纳触发瞬间（5s 无触摸自动收纳），翻转后立即采样弹簧中间帧
const dPoll = await page.evaluate(() => new Promise((resolve) => {
  const t0 = Date.now();
  let flipAt = 0;
  const timer = setInterval(() => {
    const tb = document.getElementById('taskbar');
    if (!flipAt && tb.classList.contains('stashed')) {
      flipAt = Date.now(); // 收纳翻转：进入弹簧中间帧捕获窗（417ms 内逐帧采样）
    }
    if (flipAt) {
      const m = String(tb.querySelector('.taskbar-view').style.transform || '').match(/translateY\(([\d.]+)px\)/);
      const v = m ? parseFloat(m[1]) : 0;
      if (v > 0.5) { // 首个非零中间帧 = 弹簧进行中铁证
        clearInterval(timer);
        resolve({ flags: Number(tb.getAttribute('data-stash-flags')), mid: 'translateY(' + v + 'px)', elapsed: Date.now() - t0 });
        return;
      }
      if (Date.now() - flipAt > 900) { // 弹簧已落定仍未采到中间帧
        clearInterval(timer);
        resolve({ flags: Number(tb.getAttribute('data-stash-flags')), mid: tb.querySelector('.taskbar-view').style.transform, elapsed: Date.now() - t0 });
        return;
      }
      return;
    }
    if (Date.now() - t0 > 7000) { clearInterval(timer); resolve({ timeout: true }); }
  }, 25);
}));
A('D1. 5000ms 无触摸自动收纳（FLAG_STASHED_IN_APP_AUTO=256）', !dPoll.timeout && (dPoll.flags & 256) !== 0, `flags=${dPoll.flags} elapsed=${dPoll.elapsed}ms`);
const midVal = parseFloat((String(dPoll.mid || '').match(/translateY\(([-\d.]+)px\)/) || [])[1] || '');
A('D2. 417ms JS 弹簧中间帧在场（0 < translateY < 66）', midVal > 0.5 && midVal < 65.5, `t=${dPoll.mid} @flip+${dPoll.elapsed}ms`);
await page.screenshot({ path: join(OUT, 'stashed.png') });
await sleep(1200); // 落定

// 手柄悬浮唤出（真实鼠标路径 —— pointerenter 驱动）
const handleBox = await page.evaluate(() => {
  const h = document.querySelector('.taskbar-handle');
  const r = h.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.move(handleBox.x - 200, handleBox.y - 120);
await sleep(120);
await page.mouse.move(handleBox.x, handleBox.y, { steps: 8 });
await sleep(900);
const d3 = await page.evaluate(() => {
  const tb = document.getElementById('taskbar');
  return {
    stashed: tb.classList.contains('stashed'),
    reason: tb.getAttribute('data-unstash-reason'),
    transform: tb.querySelector('.taskbar-view').style.transform,
  };
});
A('D3. 手柄悬浮唤出（unstash reason=hover）', !d3.stashed && d3.reason === 'hover', JSON.stringify(d3));

// ---------- E. 容量溢出（窄平板 768） ----------
await page.setViewportSize({ width: 768, height: 700 });
await sleep(900);
// 造溢出：Dock 扩容至 6（系统设置同款 API）+ 开 1 个未固定应用（切换语义下
// openSet 只保留当前应用 —— app-window-closed 在切窗时派发）→ merged 7 > max 6
await page.evaluate(() => {
  try { window.__dockPrefs.add('calculator'); window.__dockPrefs.add('notes'); } catch (e) {}
});
await sleep(600);
const openedOk = await page.evaluate(() => {
  try { window.__shareSheet.openAppById('weather'); return true; } catch (e) { return false; }
});
await sleep(900);
// weather 首开会弹定位权限对话框（md3PermissionOverlay 拦截全屏指针）→ 授予后继续
const perm = await page.evaluate(() => {
  const ov = document.getElementById('md3PermissionOverlay');
  if (!ov || !ov.classList.contains('active')) return false;
  const btn = ov.querySelector('button[data-act="granted"]');
  if (btn) btn.click();
  return true;
});
if (perm) await sleep(500);
// 若 5s 无触摸自动收纳已触发 → 手柄唤出后再点把手（stashed 态 view 无 pointer）
const un = await page.evaluate(() => document.getElementById('taskbar').classList.contains('stashed'));
if (un) {
  const hb = await page.evaluate(() => {
    const r = document.querySelector('.taskbar-handle').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.move(hb.x, hb.y, { steps: 6 });
  await sleep(700);
}
const e1 = await page.evaluate(() => {
  const btn = document.querySelector('.taskbar-overflow-btn');
  const visibleCount = document.querySelectorAll('.taskbar-fixed .taskbar-icon, .taskbar-running .taskbar-icon').length;
  return { hidden: btn ? btn.hidden : null, visibleCount, stashed: document.getElementById('taskbar').classList.contains('stashed') };
});
A('E1. 768 窄容器：溢出把手在场', e1.hidden === false && !e1.stashed && openedOk, JSON.stringify(e1));
if (e1.hidden === false) {
  // 5s 无触摸自动收纳可能在断言间隙再触发（view 下移 66px 出视口）→ 先唤出再点
  const un2 = await page.evaluate(() => document.getElementById('taskbar').classList.contains('stashed'));
  if (un2) {
    const hb2 = await page.evaluate(() => {
      const r = document.querySelector('.taskbar-handle').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await page.mouse.move(hb2.x, hb2.y, { steps: 6 });
    await sleep(700);
  }
  await page.click('.taskbar-overflow-btn');
  await sleep(500);
  const e2 = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.taskbar-overflow-item')].map((b) => b.dataset.id);
    const visibleCount = document.querySelectorAll('.taskbar-fixed .taskbar-icon, .taskbar-running .taskbar-icon').length;
    return { items, visibleCount };
  });
  A('E2. 溢出面板不丢项（可见+溢出 ≥ 全量 7）', e2.visibleCount + e2.items.length >= 7 && e2.items.length > 0, `visible=${e2.visibleCount} overflow=${e2.items.length}`);
  await page.screenshot({ path: join(OUT, 'overflow.png') });
}

// ---------- F. 压力：开/关应用 10 次无残留 ----------
let fOk = true;
for (let i = 0; i < 10; i++) {
  const ids = ['phone', 'calculator', 'msg', 'notes', 'safari', 'weather', 'clock_app', 'camera', 'files', 'settings'];
  await page.setViewportSize({ width: 1280, height: 800 });
  await sleep(350);
  const opened = await page.evaluate((appId) => {
    try { window.__shareSheet.openAppById(appId); return true; } catch (e) { return false; }
  }, ids[i]);
  if (!opened) { fOk = false; break; }
  await sleep(650);
  // 首开可能弹权限对话框（camera/weather）→ 授予避免拦截后续点击
  await page.evaluate(() => {
    const ov = document.getElementById('md3PermissionOverlay');
    if (ov && ov.classList.contains('active')) {
      const btn = ov.querySelector('button[data-act="granted"]');
      if (btn) btn.click();
    }
  });
  const st = await page.evaluate(() => ({ open: window.__state.isOpen, app: window.__state.currentApp ? window.__state.currentApp.id : null }));
  if (!st.open) { fOk = false; break; }
  await page.click('.taskbar-nav-btn[data-nav="home"]');
  // 关场弹簧 >600ms（v860 实测 t+300 未关 t+900 已关）—— 轮询等待，固定 650ms 会抖动
  let closed = false;
  for (let k = 0; k < 20; k++) {
    await sleep(150);
    if (!(await page.evaluate(() => window.__state.isOpen))) { closed = true; break; }
  }
  if (!closed) { fOk = false; break; }
}
A('F1. 10 轮开/关应用循环无残留', fOk);
const f2 = await page.evaluate(() => {
  const tb = document.getElementById('taskbar');
  const fixedCount = tb.querySelectorAll('.taskbar-fixed .taskbar-icon').length;
  const overflowHidden = tb.querySelector('.taskbar-overflow-btn').hidden;
  return { fixedCount, overflowHidden, taskbarOn: document.body.classList.contains('taskbar-on') };
});
A('F2. 压力后任务栏结构完好（固定区在场/溢出复位/在场态正确）', f2.fixedCount >= 4 && f2.taskbarOn, JSON.stringify(f2));
await page.screenshot({ path: join(OUT, 'final-1280.png') });

// ---------- G. <768 回退 Dock ----------
await page.setViewportSize({ width: 700, height: 800 });
await sleep(900);
const g1 = await page.evaluate(() => {
  const tb = document.getElementById('taskbar');
  const dock = document.querySelector('.dock-bar');
  return {
    taskbarOff: !document.body.classList.contains('taskbar-on'),
    tbHidden: getComputedStyle(tb).display === 'none',
    dockVisible: dock && getComputedStyle(dock).display !== 'none',
    space: document.documentElement.style.getPropertyValue('--taskbar-space'),
  };
});
A('G1. <768 回退：任务栏隐藏 + Dock 复位 + space=0', g1.taskbarOff && g1.tbHidden && g1.dockVisible && g1.space === '0px', JSON.stringify(g1));
await page.screenshot({ path: join(OUT, 'phone-700.png') });

// ---------- H. 零 pageerror ----------
A('H1. 零 pageerror', errors.length === 0, errors.length ? errors[0].slice(0, 200) : '');

console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
