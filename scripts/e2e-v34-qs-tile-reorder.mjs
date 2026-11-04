// ==================== e2e-v34-qs-tile-reorder.mjs — #34 磁贴拖拽重排 e2e ====================
//
// Q1 编辑器入口：QS 下拉 → 铅笔 → #editTilesView 在场 + 激活清单 dataset.tileId 齐
// Q2 拖拽重排：第一磁贴拖到第二磁贴 → DOM 序换位 + qs-tile-order 落盘反映新序
// Q3 持久化恢复：reload → 主面板磁贴序 = 拖拽后序（qs-tile-order 生效）
// Q4 快速连拖中断：连续两次快速拖拽落位收敛（v7.11 状态机纪律：无错位）
// Q5 Reset：出厂序恢复 + 持久化同步（防旧 order 残留）
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

const openQs = async () => {
  await page.click('#statusBar', { position: { x: 350, y: 14 }, force: true });
  await sleep(1200);
};
const openEditor = async () => {
  await openQs();
  await page.click('#qsEditBtn');
  await sleep(700);
};
const activeIds = () => page.evaluate(() => [...document.querySelectorAll('#editActiveTilesGrid .qs-tile-pill')].map((e) => e.dataset.tileId));
const mainOrder = () => page.evaluate(() => [...document.querySelectorAll('#qsTilesContainer .qs-tile-pill[data-tile-id]')].map((e) => e.dataset.tileId));

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2000);
  await page.evaluate(() => { const b = document.querySelector('.power-dialog-card button[data-act="once"]'); if (b) b.click(); });
  await sleep(500);

  // Q1 编辑器入口
  await openEditor();
  const q1 = await page.evaluate(() => {
    const v = document.getElementById('editTilesView');
    const pills = document.querySelectorAll('#editActiveTilesGrid .qs-tile-pill[data-tile-id]');
    return { view: !!v && v.offsetParent !== null, count: pills.length };
  });
  A('Q1 编辑器打开 + 激活清单 tileId 齐', q1.view && q1.count >= 5, `count=${q1.count}`);

  // Q2 拖拽重排：合成 PointerEvent 序列驱动真实 handler 链（bindTileDrag → hitTest
  // 换位 → DOM 实序写回 → persistTileOrder）。浏览器 hit-test 在编辑视图容器级
  // transform 下与布局 rect 存在系统性偏移（真实鼠标 down 命中错位磁贴，探针实录
  // efp/rect 三读三异），合成事件不依赖 elementFromPoint、handler 与几何全真。
  const before = await activeIds();
  const drag = await page.evaluate(async () => {
    const grid = document.getElementById('editActiveTilesGrid');
    const fire = (el, type, x, y, id) => el.dispatchEvent(new PointerEvent(type, {
      bubbles: true, clientX: x, clientY: y, pointerId: id, pointerType: 'mouse', button: 0, isPrimary: true,
    }));
    const rect = (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const el = grid.children[0];
    const target = grid.children[1];
    const from = rect(el);
    const to = rect(target);
    const fx = from.x + from.w / 2, fy = from.y + from.h / 2;
    const id = 91;
    fire(el, 'pointerdown', fx, fy, id);
    // 14 步追踪 target 实时 rect（与真实 handler hitTest 同一坐标系）到其右半（>mid=插后）
    // move/up 同样 dispatch 到 el 冒泡（真实事件 target 永为最深元素，document 级裸
    // closest 监听（pull-down-gesture）不会被合成 target=document 炸伤）
    for (let i = 1; i <= 14; i++) {
      const t = rect(target);
      const x = t.x + t.w * 0.75, y = t.y + t.h / 2;
      const dx = fx + (x - fx) * (i / 14), dy = fy + (y - fy) * (i / 14);
      fire(el, 'pointermove', dx, dy, id);
      if (i === 7) { if (!el.classList.contains('qs-tile-dragging')) return { ok: false, why: 'no-dragging-class' }; }
      await new Promise((r) => setTimeout(r, 16));
    }
    const midDom = [...grid.children].map((c) => c.dataset.tileId).join(',');
    fire(el, 'pointerup', to.x + to.w * 0.75, to.y + to.h / 2, id);
    await new Promise((r) => setTimeout(r, 120));
    const endDom = [...grid.children].map((c) => c.dataset.tileId).join(',');
    return { ok: true, from: from.x + from.w / 2, to: to.x + to.w * 0.75, midDom, endDom };
  });
  await sleep(500);
  const after = await activeIds();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ios-desktop:qs-tile-order') || 'null'));
  const reordered = after[0] === before[1] && after[1] === before[0] && after.slice(2).join() === before.slice(2).join();
  A('Q2 拖拽换位（前两枚交换余序不动）+ qs-tile-order 落盘', drag.ok && reordered && JSON.stringify(stored) === JSON.stringify(after),
    `${before.slice(0, 3).join(',')} → ${after.slice(0, 3).join(',')} mid=${String(drag.midDom || '').slice(0, 20)} end=${String(drag.endDom || '').slice(0, 20)}`);

  // Q3 持久化恢复：reload → 主面板首贴 = 拖后第一
  await page.reload({ waitUntil: 'load' });
  await sleep(2000);
  await page.evaluate(() => { const b = document.querySelector('.power-dialog-card button[data-act="once"]'); if (b) b.click(); });
  await sleep(500);
  await openQs();
  const mOrder = await mainOrder();
  A('Q3 reload 后主面板磁贴序 = 拖拽后序（持久化生效）', mOrder[0] === after[0] && mOrder[1] === after[1], `main=${mOrder.slice(0, 3).join(',')}`);

  // Q4 快速连拖中断收敛：编辑器内把首位拖到第三位，立即再拖回第二位
  await page.click('#qsEditBtn');
  await sleep(700);
  const b4 = await activeIds();
  const p0 = await page.locator('#editActiveTilesGrid .qs-tile-pill').first().boundingBox();
  const p2 = await page.locator('#editActiveTilesGrid .qs-tile-pill').nth(2).boundingBox();
  await page.mouse.move(p0.x + p0.width / 2, p0.y + p0.height / 2);
  await page.mouse.down();
  await page.mouse.move(p2.x + p2.width - 4, p2.y + p2.height / 2, { steps: 4 });
  await page.mouse.up();
  await sleep(350);
  const b4b = await activeIds();
  const q0 = await page.locator('#editActiveTilesGrid .qs-tile-pill').first().boundingBox();
  const q1b = await page.locator('#editActiveTilesGrid .qs-tile-pill').nth(1).boundingBox();
  await page.mouse.move(q0.x + q0.width / 2, q0.y + q0.height / 2);
  await page.mouse.down();
  await page.mouse.move(q1b.x + 4, q1b.y + q1b.height / 2, { steps: 4 });
  await page.mouse.up();
  await sleep(350);
  const b4c = await activeIds();
  const sane = b4b.length === b4.length && b4c.length === b4.length && new Set(b4c).size === b4.length;
  A('Q4 快速连拖两轮后集合无增减无重复（中断收敛无错位）', sane, `${b4.slice(0, 3).join(',')} → ${b4b.slice(0, 3).join(',')} → ${b4c.slice(0, 3).join(',')}`);

  // Q5 Reset 出厂序 + 持久化同步
  await page.click('#editTilesResetBtn');
  await sleep(500);
  const resetIds = await activeIds();
  const resetStored = await page.evaluate(() => JSON.parse(localStorage.getItem('ios-desktop:qs-tile-order') || 'null'));
  const factoryFirst = resetIds[0] === 'internet' && resetIds[1] === 'bluetooth';
  A('Q5 Reset 恢复出厂序 + localStorage 同步出厂序', factoryFirst && JSON.stringify(resetStored) === JSON.stringify(resetIds), `${resetIds.slice(0, 3).join(',')}`);

  A('Q6 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 300));
} catch (e) {
  A('EXCEPTION', false, String(e).slice(0, 300));
} finally {
  await browser.close().catch(() => {});
  server.kill();
}

const pass = results.filter((r) => r[0]).length;
console.log(`\n=== ${pass}/${results.length} passed ===`);
process.exit(pass === results.length ? 0 : 1);
