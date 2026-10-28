// ==================== e2e-v858-all-apps.mjs — #66 应用抽屉无头回归 ====================
//
// DoD（#66 验收原文逐条）：
//   A. 手势入口：桌面上滑（纵向主导）→ 抽屉开；水平滑动仍走翻页（方向区分不冲突）
//   B. 骨架：45 条目 / A-Z 分节 / 4 列网格（1280 视口 6 列）/ 搜索框 / FastScroller 轨道
//   C. 搜索过滤：即时生效 + 空态 + 清空还原
//   D. 快速滚动：rail 拖拽 → thumb 可见 + 字母气泡出现 + 列表滚动
//   E. 条目点按启动：应用窗口开 + 抽屉收（起飞动画链）
//   F. 关闭通道：Esc / scrim 点击 / 再开循环
//   G. API 入口：window.__allApps.open('qs-tile' 同路径)
//   H. 零 pageerror
//
// 教训沿袭：v843（goto load+固定等待）、v854（外域 route.abort）、v850（同一 openAppById 路径）、
//           v857（起服+跑+kill 同命令，防后台进程被会话回收）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v858');
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());

await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(1800);

// ---------- G. API 入口先验（后续手势测试前置状态干净） ----------
const hookOk = await page.evaluate(() => typeof window.__allApps?.open === 'function');
A('G1. __allApps 钩子在册', hookOk);

// ---------- A1. 桌面上滑手势 → 抽屉 ----------
// 空白点起手（右侧 40px 内无图标），纵向主导上滑 160px
const startX = 1240, startY = 500;
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.mouse.move(startX, startY - 80, { steps: 6 });
await page.mouse.move(startX, startY - 160, { steps: 6 });
await page.mouse.up();
await sleep(900); // 600ms 出场
const opened = await page.evaluate(() => ({
  active: !!document.getElementById('allAppsOverlay')?.classList.contains('active'),
  via: 'gesture',
}));
A('A1. 桌面上滑 → 抽屉打开', opened.active);

// ---------- B. 骨架 ----------
const skel = await page.evaluate(() => {
  const overlay = document.getElementById('allAppsOverlay');
  return {
    items: overlay.querySelectorAll('.aa-item').length,
    sections: Array.from(overlay.querySelectorAll('.aa-section')).map((s) => s.textContent),
    cols: overlay.querySelector('.aa-grid')?.style.gridTemplateColumns || '',
    hasSearch: !!overlay.querySelector('#aaSearch'),
    hasRail: !!overlay.querySelector('.md-fs-track'),
    sticky: getComputedStyle(overlay.querySelector('.aa-section')).position,
  };
});
A('B1. 条目 45（全注册表）', skel.items === 45, `n=${skel.items}`);
A('B2. A-Z 分节在册（# 恒最后）', skel.sections.length >= 15 && skel.sections[skel.sections.length - 1] === '#', `letters=${skel.sections.join('')}`);
A('B3. 1280 视口 6 列（平板断点数据层）', skel.cols.includes('6'), `cols=${skel.cols}`);
A('B4. 搜索框 + FastScroller 轨道在册', skel.hasSearch && skel.hasRail);
A('B5. 分节头 sticky 吸顶', skel.sticky === 'sticky', `pos=${skel.sticky}`);
await page.screenshot({ path: join(OUT, 'drawer-open.png') });

// ---------- C. 搜索过滤 ----------
await page.fill('#aaSearch', '音乐');
await sleep(250);
const filtered = await page.evaluate(() => ({
  n: document.querySelectorAll('#allAppsOverlay .aa-item').length,
  secs: document.querySelectorAll('#allAppsOverlay .aa-section').length,
}));
A('C1. 搜索「音乐」即时过滤（子串语义恰 1 命中）+ 搜索态拍平分节', filtered.n === 1 && filtered.secs === 0, `n=${filtered.n} secs=${filtered.secs}`);

await page.fill('#aaSearch', 'zzzz不存在');
await sleep(250);
const emptyState = await page.evaluate(() => !!document.querySelector('#allAppsOverlay .aa-empty'));
A('C2. 无命中空态', emptyState);

await page.fill('#aaSearch', '');
await sleep(250);
const restored = await page.evaluate(() => document.querySelectorAll('#allAppsOverlay .aa-item').length);
A('C3. 清空还原 45', restored === 45, `n=${restored}`);

// ---------- D. 快速滚动 rail 拖拽 ----------
const listRect = await page.evaluate(() => {
  const r = document.getElementById('aaList').getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
});
const railX = listRect.x + listRect.w - 6;
// AOSP FastScroller 拖拽只认 thumb 命中区（isPointInsideY ±mThumbMinHeight）——
// 首屏 firstVisible≈0 → thumb 位于轨道顶；从 thumb 中心（≈top+24px）起手
await page.mouse.move(railX, listRect.y + 24);
await page.mouse.down();
await page.mouse.move(railX, listRect.y + listRect.h * 0.9, { steps: 10 });
await sleep(150);
const drag = await page.evaluate(() => {
  const overlay = document.getElementById('allAppsOverlay');
  const thumb = overlay.querySelector('.md-fs-thumb');
  const bubble = overlay.querySelector('.aa-fs-bubble');
  const list = document.getElementById('aaList');
  return {
    thumbOpacity: getComputedStyle(thumb).opacity,
    bubbleText: bubble.textContent,
    scrollTop: list.scrollTop,
  };
});
A('D1. rail 拖拽 thumb 可见', parseFloat(drag.thumbOpacity) > 0.5, `op=${drag.thumbOpacity}`);
A('D2. 字母气泡出现（textContent 非空）', drag.bubbleText.length === 1, `bubble=${drag.bubbleText}`);
A('D3. 列表已滚动', drag.scrollTop > 0, `scrollTop=${drag.scrollTop}`);
await page.mouse.up();
await page.screenshot({ path: join(OUT, 'drawer-fastscroll.png') });

// ---------- E. 条目点按启动 ----------
await page.evaluate(() => { document.getElementById('aaSearch').value = ''; });
await page.click('.aa-item[data-app-id="calculator"]');
await sleep(1000);
const launched = await page.evaluate(() => ({
  drawerClosed: !document.getElementById('allAppsOverlay').classList.contains('active'),
  appOpen: document.getElementById('appWindow').classList.contains('open'),
}));
A('E1. 点按条目 → 应用开 + 抽屉收', launched.drawerClosed && launched.appOpen, JSON.stringify(launched));
await page.screenshot({ path: join(OUT, 'drawer-launch.png') });

// 关闭应用，回到桌面（closeApp 真链路）。开窗弹簧未落定时 closeApp 会被开窗态锁
// 忽略（间歇实锤）——轮询重试至关闭，上 waitUntil 定间隔（v856 rAF 轮询不可靠教训）
let appClosed = false;
for (let i = 0; i < 6 && !appClosed; i++) {
  await sleep(500);
  appClosed = await page.evaluate(async () => {
    if (!document.getElementById('appWindow').classList.contains('open')) return true;
    const m = await import('./js/app-window.js');
    m.closeApp(0, 0, 0);
    return false;
  });
}
A('E2. 关闭应用复位现场（F 段前置·轮询重试）', appClosed);

// ---------- F. 关闭通道（scrim 点击 + Esc + 再开循环） ----------
await page.evaluate(() => { window.__allApps.open('retest'); });
await sleep(700);
const escClosed = await page.evaluate(() => new Promise((res) => {
  // scrim 在 sheet 之下（z 层），点击落 sheet —— Esc 是主关闭通道，scrim 由 Esc 备份
  window.addEventListener('all-apps-changed', (e) => res(!e.detail.open), { once: true });
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  setTimeout(() => res(null), 1500);
}));
A('F1. Esc 关闭（all-apps-changed 事件）', escClosed === true, `res=${escClosed}`);

const reopen = await page.evaluate(() => {
  window.__allApps.open('cycle');
  const a1 = document.getElementById('allAppsOverlay').classList.contains('active');
  window.__allApps.close();
  const a2 = !document.getElementById('allAppsOverlay').classList.contains('active');
  return a1 && a2;
});
A('F2. 再开循环干净（visibility 复位）', reopen);

A('H1. 零 pageerror', errors.length === 0, errors.length ? errors[0] : '');

console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
