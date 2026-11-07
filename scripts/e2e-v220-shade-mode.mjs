// e2e-v220-shade-mode.mjs — #220 ①②③ E2E 核验：面板模式设置项 + 双栏语义/回流 + QS 折合复测
// ① 设置 → 通知 → 面板模式（Separate / Combined (classic)）：写入走 dual-shade.js
//    setShadeMode 单一真源（window.__dualShade 桥），存储复用 'android17:shadeMode'（#178）
// ② 双栏语义：左 75% / 右 25% invocation 分区（config_invocationGestureSplitRatio）、
//    双面板独立滚动可同开、classic↔dual 切换通知条目 DOM 迁移回流（moveInto/restoreAll）
// ③ QS 折合复测（#83 闭环面）：Shade↔QS 场景快速折叠/展开不丢动画、磁贴展开样式还原
//
// 用法：MD3_BASE=http://127.0.0.1:8080/ios-desktop/index.html?nolock=1 node scripts/e2e-v220-shade-mode.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.MD3_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '../docs/v220';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, cond, detail = '') => {
  log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!cond) failures++;
};
const browser = await chromium.launch({
  executablePath: process.env.MD3_CHROME || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
let pageErrors = 0;
page.on('pageerror', () => { pageErrors++; });
page.on('console', (m) => { if (m.type() === 'error' && !/net::|Failed to load resource/.test(m.text())) log('  [console.error]', m.text().slice(0, 160)); });

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await sleep(1400);

// ---------------- R0 默认态 ----------------
const r0 = await page.evaluate(() => ({
  dataset: document.body.dataset.shadeMode || null,
  ls: localStorage.getItem('android17:shadeMode'),
  bridge: !!(window.__dualShade && window.__dualShade.getShadeMode && window.__dualShade.setShadeMode),
  root: !!document.getElementById('dualShadeRoot'),
  notifInDual: document.getElementById('dualNotifPanel') ? !!document.getElementById('dualNotifPanel').contains(document.getElementById('notiPanelScroll')) : null,
}));
check('R0-1 默认 classic（上线默认：dataset 空、无存储值）', r0.dataset !== 'dual' && r0.ls !== 'dual', JSON.stringify(r0));
check('R0-2 window.__dualShade 桥在位（getShadeMode/setShadeMode 双入口）', r0.bridge);
check('R0-3 dualShadeRoot 骨架在位', r0.root);

// ---------------- R4 经典 QS 折合复测（先于模式切换，#83 闭环面回归） ----------------
log('R4 QS 折合复测：Shade→QS 场景展开 + 快速折叠/展开');
// 第一次下拉：开 Shade 场景
await page.mouse.move(206, 8);
await page.mouse.down();
for (let y = 40; y <= 340; y += 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.up();
await sleep(900);
const shadeOpen = await page.evaluate(() => {
  const o = document.getElementById('pullPanelsOverlay');
  return o && o.classList.contains('active');
});
check('R4-1 经典 Shade 下拉打开（overlay.active）', !!shadeOpen);
// 第二次下拉：进 QS 场景（大钟头部 + 全量磁贴）
await page.mouse.move(206, 400);
await page.mouse.down();
for (let y = 430; y <= 700; y += 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.up();
await sleep(900);
const scene1 = await page.evaluate(() => {
  const grid = document.getElementById('qsTilesContainer');
  const qqs = document.getElementById('qqsTilesContainer');
  return {
    gridVisible: !!grid && grid.getBoundingClientRect().height > 40,
    qqsOpacity: qqs ? getComputedStyle(qqs).opacity : null,
    overlay: !!document.getElementById('pullPanelsOverlay')?.classList.contains('active'),
  };
});
check('R4-2 QS 场景展开（全量磁贴网格在位）', scene1.gridVisible && scene1.overlay, JSON.stringify(scene1));
// 快速折叠/展开三循环（丢动画回归面：#39 同类缺陷）
let foldOk = true, foldDetail = '';
for (let i = 0; i < 3; i++) {
  await page.mouse.move(206, 700); await page.mouse.down();
  for (let y = 660; y >= 420; y -= 40) { await page.mouse.move(206, y); await sleep(12); }
  await page.mouse.up(); await sleep(140); // 快速上折（间隔短于过渡时长，故意压进动画期）
  await page.mouse.move(206, 420); await page.mouse.down();
  for (let y = 460; y <= 700; y += 40) { await page.mouse.move(206, y); await sleep(12); }
  await page.mouse.up(); await sleep(140);
}
await sleep(900);
const sceneAfter = await page.evaluate(() => {
  const grid = document.getElementById('qsTilesContainer');
  const qqs = document.getElementById('qqsTilesContainer');
  const col = document.getElementById('qsColumn');
  return {
    gridVisible: !!grid && grid.getBoundingClientRect().height > 40,
    qqsOpacity: qqs ? getComputedStyle(qqs).opacity : null,
    overlay: !!document.getElementById('pullPanelsOverlay')?.classList.contains('active'),
    inlineTrack: col ? col.style.transform || '' : '',
  };
});
foldOk = sceneAfter.gridVisible && sceneAfter.overlay;
foldDetail = JSON.stringify(sceneAfter);
check('R4-3 快速折叠×3 展开×3 后场景终态正确（不丢动画不卡死）', foldOk, foldDetail);
// 折回 Shade 场景：磁贴展开样式还原（QQS 复显、无残留 opacity 抑制）
await page.mouse.move(206, 700); await page.mouse.down();
for (let y = 660; y >= 400; y -= 40) { await page.mouse.move(206, y); await sleep(14); }
await page.mouse.up();
await sleep(900);
const scene0 = await page.evaluate(() => {
  const qqs = document.getElementById('qqsTilesContainer');
  const grid = document.getElementById('qsTilesContainer');
  const header = document.getElementById('collapsedShadeHeader');
  // 场景 morph 探针实锤：scene 0 的 QS 全量网格 = visibility:hidden（保留布局非移出视口），
  // 小头部 collapsedShadeHeader opacity 还原 1；QQS opacity/visibility 无残留抑制
  return {
    qqsOpacity: qqs ? getComputedStyle(qqs).opacity : null,
    qqsVis: qqs ? getComputedStyle(qqs).visibility : null,
    gridVis: grid ? getComputedStyle(grid).visibility : null,
    headerOp: header ? getComputedStyle(header).opacity : null,
    overlay: !!document.getElementById('pullPanelsOverlay')?.classList.contains('active'),
  };
});
check('R4-4 折回 Shade 场景：磁贴展开样式还原（QS 网格折起 hidden + 小头部 opacity 还原 + QQS 无残留）',
  scene0.overlay && scene0.qqsOpacity === '1' && scene0.qqsVis === 'visible' && scene0.gridVis === 'hidden' && scene0.headerOp === '1', JSON.stringify(scene0));
await page.screenshot({ path: `${OUT}/v220-r4-classic-fold.png` });
// 收起面板（真实路径：继续上折关闭；不作为硬断言目标，仅防残留干扰 R5）
await page.mouse.move(206, 300); await page.mouse.down();
for (let y = 260; y >= 20; y -= 40) { await page.mouse.move(206, y); await sleep(12); }
await page.mouse.up();
await sleep(700);

// ---------------- R1 面板模式设置项（#220 ①） ----------------
log('R1 设置 → 通知 → 面板模式');
await page.evaluate(() => document.querySelector('.app-icon[data-id="settings"]').click());
await sleep(1000);
await page.evaluate(() => { window.pushSubPage && window.pushSubPage(19); });
await sleep(600);
const sec = await page.evaluate(() => {
  const list = document.getElementById('shadeModeList');
  if (!list) return { found: false };
  const chips = [...list.querySelectorAll('[data-shademode-id]')];
  const checked = list.querySelector('[data-shademode-id].uiv-nav-radio-on');
  return {
    found: true,
    count: chips.length,
    ids: chips.map((c) => c.dataset.shademodeId),
    active: checked ? checked.dataset.shademodeId : null,
    cardText: (document.querySelector('.md3-card')?.textContent || '').includes('Separate'),
  };
});
check('R1-1 面板模式设置项渲染（2 行 Separate/Combined）', sec.found && sec.count === 2 && sec.ids.join() === 'dual,classic', JSON.stringify(sec));
check('R1-2 默认选中 Combined (classic)', sec.active === 'classic');
await page.screenshot({ path: `${OUT}/v220-r1-settings-panels.png` });
// 切 Separate：写入走 setShadeMode 单一真源
await page.evaluate(() => document.querySelector('[data-shademode-id="dual"]').click());
await sleep(500);
const r1dual = await page.evaluate(() => ({
  dataset: document.body.dataset.shadeMode,
  ls: localStorage.getItem('android17:shadeMode'),
  active: document.querySelector('[data-shademode-id].uiv-nav-radio-on')?.dataset.shademodeId || null,
  migrated: document.getElementById('dualNotifPanel').contains(document.getElementById('notiPanelScroll')) &&
            document.getElementById('dualQsPanel').contains(document.getElementById('qsPanelScroll')),
  notifStill: !!document.getElementById('notiPanelScroll'),
}));
check('R1-3 Separate 切换三联写（dataset + 存储 + radio 回显）', r1dual.dataset === 'dual' && r1dual.ls === 'dual' && r1dual.active === 'dual', JSON.stringify(r1dual));
check('R1-4 classic→dual DOM 迁移回流（通知滚动区入双栏面板、QS 滚动区入 QS 浮板）', r1dual.migrated && r1dual.notifStill, JSON.stringify(r1dual));

// ---------------- R2 双栏语义（#220 ②） ----------------
log('R2 双栏 invocation 分区与双面板同开');
const zone = await page.evaluate(() => {
  const n = document.getElementById('dualHitNotif');
  const q = document.getElementById('dualHitQs');
  if (!n || !q) return null;
  const nr = n.getBoundingClientRect(), qr = q.getBoundingClientRect();
  return { nr: nr.width, qr: qr.width, ratio: +(nr.width / Math.max(1, qr.width)).toFixed(2) };
});
check('R2-1 命中区左/右 ≈ 75/25 分区（GESTURE_SPLIT_RATIO 同构）', zone && zone.ratio > 2.4 && zone.ratio < 3.6, JSON.stringify(zone));
await page.evaluate(() => document.getElementById('dualHitNotif').click());
await sleep(500);
const openNotif = await page.evaluate(() => document.getElementById('dualNotifPanel').classList.contains('open'));
await page.evaluate(() => document.getElementById('dualHitQs').click());
await sleep(500);
const both = await page.evaluate(() => ({
  notif: document.getElementById('dualNotifPanel').classList.contains('open'),
  qs: document.getElementById('dualQsPanel').classList.contains('open'),
  qsInView: document.getElementById('dualQsPanel').getBoundingClientRect().width > 100,
}));
check('R2-2 左区开通知面板', openNotif);
check('R2-3 双面板可同开（分家语义：QS 右浮面板独立）', both.notif && both.qs && both.qsInView, JSON.stringify(both));
await page.screenshot({ path: `${OUT}/v220-r2-dual-both-open.png` });
await page.evaluate(() => document.getElementById('dualScrimQs').click());
await sleep(500);
const qsClosed = await page.evaluate(() => !document.getElementById('dualQsPanel').classList.contains('open'));
check('R2-4 scrim 点击关闭 QS 浮板（通知面板不受扰）', qsClosed && both.notif !== undefined);

// ---------------- R3 回流复原（#220 ② 回流重排） ----------------
log('R3 切回 Combined (classic)：节点回流复原');
await page.evaluate(() => document.querySelector('[data-shademode-id="classic"]').click());
await sleep(600);
const r3 = await page.evaluate(() => ({
  dataset: document.body.dataset.shadeMode,
  ls: localStorage.getItem('android17:shadeMode'),
  notifBackOut: !document.getElementById('dualNotifPanel').contains(document.getElementById('notiPanelScroll')),
  qsBackOut: !document.getElementById('dualQsPanel').contains(document.getElementById('qsPanelScroll')),
  dualPanelsClosed: !document.getElementById('dualNotifPanel').classList.contains('open') && !document.getElementById('dualQsPanel').classList.contains('open'),
  activeChip: document.querySelector('[data-shademode-id].uiv-nav-radio-on')?.dataset.shademodeId || null,
}));
check('R3-1 classic 切回：dataset/存储/radio 三联回显', r3.dataset === 'classic' && r3.ls === 'classic' && r3.activeChip === 'classic', JSON.stringify(r3));
check('R3-2 节点回流复原（通知/QS 滚动区迁出双栏面板，监听器随节点走）', r3.notifBackOut && r3.qsBackOut);
check('R3-3 双栏面板全闭（切回经典不留 open 残留）', r3.dualPanelsClosed);
// 经典面板可再开（回流后经典轨道完好）
await page.mouse.move(206, 8);
await page.mouse.down();
for (let y = 40; y <= 340; y += 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.up();
await sleep(900);
const classicAgain = await page.evaluate(() => {
  const o = document.getElementById('pullPanelsOverlay');
  const notif = document.getElementById('notiPanelScroll');
  return {
    overlay: !!(o && o.classList.contains('active')),
    notifTop: notif ? notif.getBoundingClientRect().top : -1,
    notifH: notif ? notif.getBoundingClientRect().height : -1,
  };
});
check('R3-4 回流后经典面板可再开且通知滚动区有几何（不丢面板）', classicAgain.overlay && classicAgain.notifH > 100, JSON.stringify(classicAgain));

// ---------------- 总账 ----------------
check('总账 零 pageerror（全程）', pageErrors === 0, `pageErrors=${pageErrors}`);
await browser.close();
log(failures === 0 ? `\nALL PASS (${pageErrors === 0 ? '零 pageerror' : pageErrors + ' pageerror'})` : `\n${failures} FAIL`);
process.exit(failures === 0 ? 0 : 1);
