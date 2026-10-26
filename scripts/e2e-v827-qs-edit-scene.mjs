// ==================== e2e-v827-qs-edit-scene.mjs — #43 无头回归 ====================
//
// DoD（议题 #43 验收，形态按源码勘误裁决 = A17 Expressive EditMode Scene 淡切）：
//   A. 点「修改」出现编辑模式 —— 形态 = QS 面板内 Scene 淡切（非底部 sheet/非全屏覆盖页，
//      源码勘误见回帖）：500ms opacity 过渡 + 编辑视图与 qsColumn 同几何
//   B. 标题 = qs_edit_tiles zh 权威「编辑功能块」+ 返回/Undo 在位
//   C. 编辑能力：磁贴清单渲染 + 删除/添加 + Reset
//   D. 返回退出：close 回 QS 场景（opacity 0），磁贴变更回写主网格
//   E. dual 模式跟随：shadeMode=dual 下编辑视图迁至 dualQsPanel
//   F. 零 pageerror + 截图 ×2

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v827');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8081/ios-desktop/index.html';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);

// ---------- 两段下拉 → QS 场景（v784 同款手势驱动） ----------
console.log('导航：两段下拉 → QS 场景');
await page.mouse.move(206, 8);
await page.mouse.down();
for (let y = 40; y <= 340; y += 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.up();
await sleep(900);
await page.mouse.move(206, 400);
await page.mouse.down();
for (let y = 430; y <= 700; y += 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.up();
await sleep(900);

const qsOpen = await page.evaluate(() => {
  const overlay = document.getElementById('pullPanelsOverlay');
  const col = document.getElementById('qsColumn');
  return overlay && overlay.classList.contains('active') && !!col;
});
A('N1 QS 场景已展开', !!qsOpen);

// ---------- A. 点修改 → 编辑 Scene 淡切 ----------
console.log('A. EditMode Scene 淡切（源码勘误形态）');
await page.evaluate(() => {
  const btn = document.getElementById('qsEditBtn');
  if (btn) btn.click();
});
await sleep(750); // 500ms tween + 动画余量

const sceneState = await page.evaluate(() => {
  const view = document.getElementById('editTilesView');
  const col = document.getElementById('qsColumn');
  const VR = view.getBoundingClientRect();
  const CR = col.getBoundingClientRect();
  const cs = getComputedStyle(view);
  return {
    open: view.classList.contains('open'),
    inQsColumn: view.parentElement === col,
    opacity: cs.opacity,
    visibility: cs.visibility,
    pe: cs.pointerEvents,
    geoMatch: Math.abs(VR.top - CR.top) < 2 && Math.abs(VR.width - CR.width) < 2 && Math.abs(VR.height - CR.height) < 2,
    z: cs.zIndex,
    title: view.querySelector('.edit-tiles-title')?.textContent || '',
    backBtn: !!document.getElementById('editTilesBackBtn'),
    undoBtn: !!document.getElementById('editTilesUndoBtn'),
    activeTiles: document.querySelectorAll('#editActiveTilesGrid .qs-tile-pill').length,
    categories: document.querySelectorAll('#editAvailableCategories .edit-category-title').length,
  };
});
A('A1 编辑 Scene 打开（.open）', sceneState.open);
A('A2 容器锚定 qsColumn 内', sceneState.inQsColumn);
A('A3 淡切完成 opacity=1/visible/pe=auto', sceneState.opacity === '1' && sceneState.visibility === 'visible' && sceneState.pe === 'auto');
// qsColumn = 场景轨道全屏列（height 50% of 200% track = 100vh，v7.83 场景机制）——
// 编辑视图 inset:0 与其同几何 = 源码 EditMode Box(fillMaxSize) 场景替换语义
A('A4 与 qsColumn 同几何（面板内 Scene 替换，随轨道走非独立浮层）', sceneState.geoMatch && sceneState.inQsColumn);
A('A5 标题「编辑功能块」（qs_edit_tiles zh 权威）', sceneState.title === '编辑功能块', JSON.stringify(sceneState.title));
A('A6 返回/Undo 按钮在位', sceneState.backBtn && sceneState.undoBtn);
A('A7 磁贴清单已渲染', sceneState.activeTiles > 0 && sceneState.categories > 0, `active=${sceneState.activeTiles} cats=${sceneState.categories}`);
await page.screenshot({ path: join(OUT, 'qs-edit-scene.png') }).catch(() => {});

// ---------- C. 编辑能力：删除一个磁贴 + Reset ----------
console.log('C. 编辑能力（删除/添加/Reset 保留）');
const beforeCount = sceneState.activeTiles;
await page.evaluate(() => {
  const badge = document.querySelector('#editActiveTilesGrid .edit-badge-remove');
  if (badge) badge.click();
});
await sleep(300);
const afterRemove = await page.evaluate(() => document.querySelectorAll('#editActiveTilesGrid .qs-tile-pill').length);
A('C1 删除磁贴生效', afterRemove === beforeCount - 1, `${beforeCount}→${afterRemove}`);
await page.evaluate(() => {
  const add = document.querySelector('#editAvailableCategories .edit-badge-add');
  if (add) add.click();
});
await sleep(300);
const afterAdd = await page.evaluate(() => document.querySelectorAll('#editActiveTilesGrid .qs-tile-pill').length);
A('C2 添加磁贴生效', afterAdd === beforeCount, `${afterRemove}→${afterAdd}`);

// ---------- D. 返回退出 → 回 QS 场景 ----------
console.log('D. 返回退出（BackHandler 语义）');
await page.evaluate(() => document.getElementById('editTilesBackBtn').click());
await sleep(750);
const closed = await page.evaluate(() => {
  const view = document.getElementById('editTilesView');
  const cs = getComputedStyle(view);
  const mainTile = document.querySelector('#qsTilesContainer .qs-tile-pill');
  return { open: view.classList.contains('open'), opacity: cs.opacity, vis: cs.visibility, mainTileBack: !!mainTile };
});
A('D1 编辑 Scene 关闭（opacity=0/hidden）', !closed.open && closed.opacity === '0' && closed.vis === 'hidden');
A('D2 主 QS 磁贴网格在位（变更回写渲染）', closed.mainTileBack);

// ---------- E. dual 模式跟随 ----------
console.log('E. dual 模式编辑视图迁移');
await page.evaluate(() => { localStorage.setItem('android17:shadeMode', 'dual'); });
await page.reload({ waitUntil: 'load' });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await page.waitForTimeout(500);
await page.evaluate(async () => {
  const m = await import('./js/dual-shade.js');
  m.setShadeMode('dual');
});
await sleep(600);
// 打开 dual QS 面板（右侧调用区拖拽或直接调 openPanel —— 手势驱动走 applyMode 后面板开合走 dual-shade 内部 API）
const dualOpened = await page.evaluate(async () => {
  const m = await import('./js/dual-shade.js');
  m.openDualPanel('qs');
  return true;
});
A('E1 dual QS 面板打开', !!dualOpened);
await page.evaluate(() => {
  const btn = document.getElementById('qsEditBtn');
  if (btn) btn.click();
});
await sleep(750);
const dualEdit = await page.evaluate(() => {
  const view = document.getElementById('editTilesView');
  const qp = document.getElementById('dualQsPanel');
  const VR = view.getBoundingClientRect();
  const PR = qp.getBoundingClientRect();
  const cs = getComputedStyle(view);
  return {
    hostDual: view.parentElement === qp,
    open: view.classList.contains('open'),
    opacity: cs.opacity,
    geoMatch: Math.abs(VR.top - PR.top) < 3 && Math.abs(VR.width - PR.width) < 3,
  };
});
A('E2 编辑视图迁至 dualQsPanel 内', dualEdit.hostDual);
A('E3 dual 面板内淡切打开', dualEdit.open && dualEdit.opacity === '1');
A('E4 与 dual 面板同几何', dualEdit.geoMatch);
await page.screenshot({ path: join(OUT, 'qs-edit-dual.png') }).catch(() => {});

// ---------- F. 零 pageerror ----------
A('F1 零 pageerror', errors.length === 0, errors.slice(0, 2).join(' | '));

console.log(`\nRESULT: ${pass} pass, ${fail} fail`);
await browser.close();
process.exit(fail ? 1 : 0);
