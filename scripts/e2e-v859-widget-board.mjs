// ==================== e2e-v859-widget-board.mjs — #67 桌面 widget 系统无头回归 ====================
//
// DoD（#67 验收原文逐条）：
//   A. 入口链：桌面空白 contextmenu → 菜单「小工具」→ widgetpicker 底部选择器
//   B. 选择器骨架：6 类全变体卡（live 预览 + 规格徽标）
//   C. 点选自动落位：battery 2×1 → 末页尾部空隙 + 持久化
//   D. 编辑拖拽重排：长按 lift → 格点吸附迁移（slot 变更落盘）
//   E. 拖入垃圾桶删除：底部垃圾桶高亮 → 移除 + 持久化消失
//   F. 规格调整把手：编辑态 grip 点击 → 2×2→…（可换规格）
//   G. 刷新还原：reload 后布局与 localStorage 一致（持久化验收）
//   H. 零 pageerror
//
// 教训沿袭：v858（goto load+固定等待、外域 route.abort、closeApp 轮询重试）、
//           v857（起服+跑+kill 同命令）、v850（同一 openAppById 路径）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v859');
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
await sleep(2000);

// ---------- A. API 与入口链 ----------
const hookOk = await page.evaluate(() => typeof window.__widgetBoard?.open === 'function');
A('A1. __widgetBoard 钩子在册', hookOk);

// 腾空第 2 页 slot 16..20（1280 视口 6×4=24 容量；第 2 页 21 图标 slot 0..20 ——
// 腾出 16..20 连同尾部 21..23 成两整行 8 连续格，供 4×2 与拖拽目标使用）
await page.evaluate(async () => {
  const s = window.__state;
  s.pagesApps[1] = s.pagesApps[1].filter((a) => a.slot < 16 || a.slot > 20);
  const m = await import('./js/desktop.js');
  m.renderDesktopPages(); // 状态与 DOM 同步（不然旧图标残留在被腾出的格上）
});
await sleep(500);

// 桌面空白 contextmenu（.page-grid padding 区，bubbles 到 desktop 监听）
await page.evaluate(() => {
  const grid = document.querySelector('.page-grid');
  grid.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 400, clientY: 300 }));
});
await sleep(300);
const menuShown = await page.evaluate(() => {
  const m = document.getElementById('widgetSourceMenu');
  return { active: m?.classList.contains('active'), items: m ? m.querySelectorAll('.wsm-item').length : 0 };
});
A('A2. 桌面空白长按菜单弹出（三项）', menuShown.active && menuShown.items === 3, `items=${menuShown.items}`);

await page.evaluate(() => document.querySelector('#widgetSourceMenu [data-wsm="widgets"]').click());
await sleep(600);
const pickerOpen = await page.evaluate(() => document.getElementById('widgetPickerOverlay')?.classList.contains('active'));
A('A3. 菜单「小工具」→ 选择器打开', pickerOpen === true);

// ---------- B. 选择器骨架（widgetpicker 对标） ----------
const pickerSkel = await page.evaluate(() => {
  const ov = document.getElementById('widgetPickerOverlay');
  const cards = Array.from(ov.querySelectorAll('.wp-card'));
  return {
    n: cards.length,
    kinds: [...new Set(cards.map((c) => c.dataset.kind))],
    livePreviews: ov.querySelectorAll('.wp-preview .widget-inner').length,
    spanBadges: ov.querySelectorAll('.wp-span').length,
  };
});
A('B1. 6 类 12 变体卡在册', pickerSkel.n === 12 && pickerSkel.kinds.length === 6, `n=${pickerSkel.n} kinds=${pickerSkel.kinds.join(',')}`);
A('B2. live 预览 + 规格徽标全覆盖', pickerSkel.livePreviews === 12 && pickerSkel.spanBadges === 12, `prev=${pickerSkel.livePreviews} span=${pickerSkel.spanBadges}`);
await page.screenshot({ path: join(OUT, 'picker-open.png') });

// ---------- C. 点选自动落位（battery 2×1） ----------
// 真实鼠标点击（选择器卡片走 pointerdown/up 判定，合成 .click() 无指针事件不触发）
await page.click('.wp-card[data-kind="battery"][data-w="2"][data-h="1"]');
await sleep(900); // place + rAF 渲染 + toast
const placedBattery = await page.evaluate(() => {
  const saved = JSON.parse(localStorage.getItem('ios-desktop:widget-board') || '{}');
  const wg = (saved.widgets || []).find((w) => w.kind === 'battery');
  const card = wg && document.querySelector(`.widget-card[data-widget-id="${wg.id}"]`);
  return {
    wg,
    cardInGrid: !!card,
    gridArea: card ? card.style.gridArea : '',
    pageOfCard: card ? card.dataset.page : '',
    pickerClosed: !document.getElementById('widgetPickerOverlay').classList.contains('active'),
  };
});
A('C1. 点选 → picker 收 + battery 入板（first-fit 页 2 slot 16·6 列网格）', placedBattery.pickerClosed && placedBattery.wg && placedBattery.wg.page === 1 && placedBattery.wg.slot === 16, JSON.stringify(placedBattery.wg));
A('C2. DOM 卡片入 grid 坐标系（gridArea 跨格）', placedBattery.cardInGrid && placedBattery.gridArea.includes('span 1'), `area=${placedBattery.gridArea}`);

// 切到第 2 页目检
await page.evaluate(async () => {
  const m = await import('./js/desktop.js');
  m.switchDesktopPage(1, false);
});
await sleep(700);
await page.screenshot({ path: join(OUT, 'battery-on-page2.png') });

// ---------- D. 编辑拖拽重排（长按 lift → 格点吸附） ----------
// battery 卡在 slot 16（6 列：row2 col4），拖到 slot 22（row3 col4）
const dragGeo = await page.evaluate(() => {
  const saved = JSON.parse(localStorage.getItem('ios-desktop:widget-board') || '{}');
  const wg = (saved.widgets || []).find((w) => w.kind === 'battery');
  if (!wg) return { id: null, cx: 0, cy: 0, w: 0, h: 0 };
  const card = document.querySelector(`.widget-card[data-widget-id="${wg.id}"]`);
  const r = card.getBoundingClientRect();
  return { id: wg.id, cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
});
A('D0. 第 2 页可见 battery 卡（几何可测）', dragGeo.w > 0 && dragGeo.h > 0, JSON.stringify(dragGeo));

// 长按 380ms lift（非编辑态长按 → enterEditMode + 拖拽）
await page.mouse.move(dragGeo.cx, dragGeo.cy);
await page.mouse.down();
await sleep(520); // 长按阈值 380ms
await page.mouse.move(dragGeo.cx + 30, dragGeo.cy, { steps: 5 });
const editArmed = await page.evaluate(() => ({
  edit: window.__state.isEditMode,
  trash: !!document.getElementById('widgetTrashZone')?.classList.contains('active'),
}));
A('D1. 长按 lift：编辑模式 + 垃圾桶条出现', editArmed.edit && editArmed.trash, JSON.stringify(editArmed));
if (!editArmed.edit) { console.log(`\nRESULT: ${pass} pass / ${fail + 1} fail (编辑态未亮起，后续 D/E 段中止)`); await browser.close(); process.exit(1); }

// 目标格 slot 22 中心（row3 col4 → 由第 2 页 grid 几何实测）
const target = await page.evaluate(() => {
  const grids = document.querySelectorAll('.page-grid');
  const grid = grids[1];
  const cs = getComputedStyle(grid);
  const r = grid.getBoundingClientRect();
  const cols = 6, rows = 4;
  const padL = parseFloat(cs.paddingLeft), padT = parseFloat(cs.paddingTop);
  const padR = parseFloat(cs.paddingRight), padB = parseFloat(cs.paddingBottom);
  const gapX = parseFloat(cs.columnGap) || 0, gapY = parseFloat(cs.rowGap) || 0;
  const cellW = (r.width - padL - padR - (cols - 1) * gapX) / cols;
  const cellH = (r.height - padT - padB - (rows - 1) * gapY) / rows;
  // slot 22 = row3 col4（0-based）→ 格中心
  const slot = 22, row = Math.floor(slot / cols), col = slot % cols;
  return {
    x: r.left + padL + col * (cellW + gapX) + cellW / 2,
    y: r.top + padT + row * (cellH + gapY) + cellH / 2,
  };
});
await page.mouse.move(target.x, target.y, { steps: 10 });
await sleep(150);
const outlineOk = await page.evaluate(() => {
  const o = document.getElementById('widget-drop-outline') || document.querySelector('.widget-drop-outline');
  return { visible: o && o.style.display !== 'none' && o.style.display !== '', bad: o?.classList.contains('bad') };
});
A('D2. 落位预览框出现且合法', outlineOk.visible && outlineOk.bad === false, JSON.stringify(outlineOk));
await page.mouse.up();
await sleep(700);
const movedSlot = await page.evaluate(() => {
  const saved = JSON.parse(localStorage.getItem('ios-desktop:widget-board') || '{}');
  return ((saved.widgets || []).find((w) => w.kind === 'battery') || {}).slot;
});
A('D3. 拖拽重排落盘（slot 16→22）', movedSlot === 22, `slot=${movedSlot}`);

// ---------- E. 拖入垃圾桶删除 ----------
await page.mouse.move(target.x, target.y);
await page.mouse.down();
await sleep(520);
const geo2 = await page.evaluate(() => {
  const t = document.getElementById('widgetTrashZone').getBoundingClientRect();
  return { tx: t.left + t.width / 2, ty: t.top + t.height / 2 };
});
await page.mouse.move(geo2.tx, geo2.ty, { steps: 12 });
await sleep(200);
const trashHover = await page.evaluate(() => document.getElementById('widgetTrashZone').classList.contains('hover'));
A('E1. 垃圾桶悬停高亮', trashHover);
await page.mouse.up();
await sleep(700);
const goneTrash = await page.evaluate(() => {
  const saved = JSON.parse(localStorage.getItem('ios-desktop:widget-board') || '{}');
  return (saved.widgets || []).length === 0;
});
A('E2. 拖入垃圾桶 → 移除 + 持久化消失', goneTrash);

// ---------- F. 规格调整把手（可换规格） ----------
// API 放 weather 2×2（拖出通道 e2e 已覆盖长按 lift；规格把手走编辑态 grip 点击）
await page.evaluate(() => window.__widgetBoard.place('weather', 2, 2));
await sleep(600);
const gripTest = await page.evaluate(async () => {
  const saved = JSON.parse(localStorage.getItem('ios-desktop:widget-board') || '{}');
  const wg = (saved.widgets || []).find((w) => w.kind === 'weather');
  if (!wg) return { hasGrip: false };
  const card = document.querySelector(`.widget-card[data-widget-id="${wg.id}"]`);
  const grip = card && card.querySelector('.widget-resize-grip');
  if (!grip) return { hasGrip: false };
  grip.click();
  await new Promise((r) => setTimeout(r, 500));
  const saved2 = JSON.parse(localStorage.getItem('ios-desktop:widget-board') || '{}');
  const wg2 = (saved2.widgets || []).find((w) => w.kind === 'weather');
  return { hasGrip: true, w: wg2 ? wg2.w : null, h: wg2 ? wg2.h : null, area: document.querySelector(`.widget-card[data-widget-id="${wg.id}"]`)?.style.gridArea };
});
A('F1. 规格把手点击 → 2×2 循环到 2×1（规格徽标同步）', gripTest.hasGrip && gripTest.w === 2 && gripTest.h === 1, JSON.stringify(gripTest));
await page.screenshot({ path: join(OUT, 'resize-after.png') });

// ---------- G. 刷新还原（持久化验收） ----------
await page.reload({ waitUntil: 'load' });
await sleep(2000);
const afterReload = await page.evaluate(() => {
  const saved = JSON.parse(localStorage.getItem('ios-desktop:widget-board') || '{}');
  const wg = ((saved.widgets || []).find((w) => w.kind === 'weather')) || null;
  const card = wg && document.querySelector(`.widget-card[data-widget-id="${wg.id}"]`);
  return { saved: wg, cardRestored: !!card, area: card ? card.style.gridArea : '' };
});
A('G1. 刷新还原：weather 2×1 布局与 localStorage 一致', afterReload.saved && afterReload.saved.w === 2 && afterReload.saved.h === 1 && afterReload.cardRestored, JSON.stringify(afterReload));

// ---------- H. 零 pageerror ----------
A('H1. 零 pageerror', errors.length === 0, errors.length ? errors[0] : '');

console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
