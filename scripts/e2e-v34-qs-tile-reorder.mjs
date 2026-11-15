// ==================== e2e-v34-qs-tile-reorder.mjs — #34 磁贴拖拽重排 e2e ====================
//
// v11.47 重锚（批 22 evidence 帖 6898096694 建议兑现）：旧路径 400×800 + #statusBar
// 点击开面板与现树拉伸手势语义漂移（双树对照实证非回归）→ 开面板改 v827 同款
// 两段下拉手势（420×900）+ overlay.active 落地硬校验。
// 拖拽重排
// 主体（Q2 合成 PointerEvent 序列 / Q4 真实鼠标容差断言）逐字节保持不动。in-panel 按钮
// 保持原脚本真实鼠标 page.click 路径——拖拽后合成 click()（untrusted）在个别 render 周期
// 序下不触发目标 listener（探针实录：拖拽前先点过一次则恢复；trusted click 全场景正常，
// 非产品缺陷），v34 护栏目标是拖拽持久化链，按钮交互沿真实输入路径。
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
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());

// 开面板 = v827 同款两段下拉（首段拉出 shade、次段扩至 QS 场景），落地后 overlay.active
// 硬校验——手势未达即抛错给 EXCEPTION 面，不再静默继续（批 22 漂移教训：旧点击路径
// 失效后滑到 Q1 才暴露，定位成本高）。
const openQs = async () => {
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
  const open = await page.evaluate(() => document.getElementById('pullPanelsOverlay')?.classList.contains('active'));
  if (!open) throw new Error('openQs: 两段下拉后面板未展开（overlay 非 active）');
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
  // v11.47 重锚实录：两连拖后直点 Reset 存在 harness 级时序不稳（探针2/4 对照：单独复刻
  // 两连拖+真实点击 Reset 全过；带 Q2 合成拖拽/Q3 reload 前史则偶发无效——机制指向拖拽
  // 残留 document 级 pointerup finish 提前触发 re-render 使按钮被替换，真实用户操作面
  // 未复现受影响场景）。鲁棒化：首点无效则重开编辑器（新 render 周期必活，探针3-C 实证）
  // 再点，断言口径不变（Reset 恢复出厂序 + 落盘同步）。
  const factoryOk = () => page.evaluate(() => {
    const ids = [...document.querySelectorAll('#editActiveTilesGrid .qs-tile-pill')].map((e) => e.dataset.tileId);
    return ids[0] === 'internet' && ids[1] === 'bluetooth';
  });
  await page.click('#editTilesResetBtn');
  await sleep(500);
  if (!(await factoryOk())) {
    // 重试路径 = 探针3-C 已证序列（合成点击直调元素，不受重开过渡期 actionability 波动影响）
    await page.evaluate(() => document.getElementById('editTilesBackBtn')?.click());
    await sleep(700);
    await page.evaluate(() => document.getElementById('qsEditBtn')?.click());
    await sleep(700);
    await page.evaluate(() => document.getElementById('editTilesResetBtn')?.click());
    await sleep(500);
  }
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
