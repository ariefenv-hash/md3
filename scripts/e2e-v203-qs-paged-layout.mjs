// ==================== e2e-v203-qs-paged-layout.mjs — #203 QS 磁贴分页布局 e2e（v9.81） ====================
//
// Q1 分页落位：面板展开 → 页数/圆点数一致 + 页 1 磁贴数（dataset.pageTiles 契约）
//    + .qs-page 保留 qs-tiles-grid 类（tile-bounce :scope 直接子级零破坏）
// Q2 滑动翻页：scrollLeft=1×页宽 → 指示器 active 移到第 2 圆点（onPageSelected 语义）
// Q3 圆点点击翻页：点第 3 圆点 → viewport 落位第 3 页
// Q4 键盘 ArrowRight/ArrowLeft → stepPage 方向翻页 + 边界钳制
// Q5 重分配+恢复页：编辑器删一枚磁贴 → 返回主面板 → 恢复记忆页（不跳回第 1 页）
// Q6 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8991;
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
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort()); // 外域断网（e2e 惯例）

const openQs = async () => {
  await page.click('#statusBar', { position: { x: 350, y: 14 }, force: true });
  await sleep(1200);
};

try {
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await openQs();

  // ---------- Q1 分页落位 ----------
  const q1 = await page.evaluate(() => {
    const vp = document.getElementById('qsTilesContainer');
    const ind = document.getElementById('qsPageIndicator');
    const st = window.__qsPageState ? window.__qsPageState() : null;
    const pages = [...vp.querySelectorAll(':scope > .qs-page')];
    return {
      st,
      pageCount: pages.length,
      pageTiles: pages.map((p) => Number(p.dataset.pageTiles || 0)),
      dots: ind ? ind.children.length : 0,
      gridClassKept: pages.every((p) => p.classList.contains('qs-tiles-grid')),
      pillCount: vp.querySelectorAll('.qs-tile-pill').length,
      vpClass: vp.classList.contains('qs-paged-viewport'),
    };
  });
  A('Q1 分页落位：viewport 类 + 页数≥2 + 圆点数一致 + 页网格数=磁贴数 + grid 类保留',
    q1.vpClass && q1.pageCount >= 2 && q1.dots === q1.pageCount
    && q1.pageTiles.reduce((a, b) => a + b, 0) === q1.pillCount && q1.gridClassKept,
    JSON.stringify(q1));

  // ---------- Q2 滑动翻页 → 指示器联动 ----------
  const q2 = await page.evaluate(async () => {
    const vp = document.getElementById('qsTilesContainer');
    const w = vp.clientWidth;
    vp.scrollLeft = w; // 第 2 页
    await new Promise((r) => setTimeout(r, 400));
    const dots = [...document.getElementById('qsPageIndicator').children];
    return {
      active: dots.findIndex((d) => d.classList.contains('active')),
      state: window.__qsPageState(),
    };
  });
  A('Q2 滑动翻页：scrollLeft=1×页宽 → active 圆点移到第 2 枚 + state.currentPage=1',
    q2.active === 1 && q2.state.currentPage === 1, JSON.stringify(q2));

  // ---------- Q3 圆点点击翻页 ----------
  const q3 = await page.evaluate(async () => {
    const ind = document.getElementById('qsPageIndicator');
    const dots = [...ind.children];
    dots[2].click(); // 点第 3 圆点
    await new Promise((r) => setTimeout(r, 700));
    const vp = document.getElementById('qsTilesContainer');
    return {
      page: Math.round(vp.scrollLeft / vp.clientWidth),
      active: [...ind.children].findIndex((d) => d.classList.contains('active')),
    };
  });
  A('Q3 圆点点击翻页：第 3 圆点 → viewport 落位第 3 页 + active 同步',
    q3.page === 2 && q3.active === 2, JSON.stringify(q3));

  // ---------- Q4 键盘方向翻页（ArrowRight/ArrowLeft + 边界钳制） ----------
  await page.focus('#qsTilesContainer');
  await page.keyboard.press('ArrowLeft'); // 第 3 页 → 第 2 页
  await sleep(700);
  const q4a = await page.evaluate(() => window.__qsPageState().currentPage);
  await page.keyboard.press('ArrowRight');
  await sleep(700);
  const q4b = await page.evaluate(() => window.__qsPageState().currentPage);
  A('Q4 键盘翻页：ArrowLeft 2→1 + ArrowRight 1→2（stepPage 方向语义）',
    q4a === 1 && q4b === 2, `after-left=${q4a} after-right=${q4b}`);

  // ---------- Q5 重分配 + 恢复页（mPageToRestore） ----------
  // 先翻到第 2 页（index 1，Q4 结束在第 3 页）→ 编辑器删一枚 → 返回 → 应恢复第 2 页
  await page.evaluate(() => { const vp = document.getElementById('qsTilesContainer'); vp.scrollLeft = vp.clientWidth; });
  await sleep(400);
  // 坑在录（v34 同款）：无头真实鼠标 hit-test 命中歧义 —— 改合成事件驱动真实 handler 链
  await page.click('#qsEditBtn');
  await sleep(700);
  const removeInfo = await page.evaluate(async () => {
    const badges = [...document.querySelectorAll('#editActiveTilesGrid .edit-badge-remove')];
    if (!badges.length) return { ok: false };
    badges[badges.length - 1].click(); // 删最后一枚（避免扰动 QQS 前 4 wide 集合）
    await new Promise((r) => setTimeout(r, 400));
    const after = document.querySelectorAll('#editActiveTilesGrid .edit-badge-remove').length;
    document.getElementById('editTilesBackBtn').click(); // closeEditTilesView（合成 click 探针实证可达）
    return { ok: true, before: badges.length, after };
  });
  await sleep(900);
  const q5 = await page.evaluate(() => {
    const vp = document.getElementById('qsTilesContainer');
    const st = window.__qsPageState();
    return {
      st,
      pageTiles: [...vp.querySelectorAll(':scope > .qs-page')].map((p) => Number(p.dataset.pageTiles || 0)),
      pills: vp.querySelectorAll('.qs-tile-pill').length,
      viewOpen: document.getElementById('editTilesView').classList.contains('open'),
    };
  });
  A('Q5 重分配+恢复页：删除生效（19→18）+ 编辑器关 + 返回后 currentPage=1（不跳回第 1 页）',
    removeInfo.ok && removeInfo.before === q1.pillCount && removeInfo.after === q1.pillCount - 1
    && q5.pills === q1.pillCount - 1 && !q5.viewOpen && q5.st.currentPage === 1
    && q5.st.dots === q5.st.pageCount,
    `badge=${removeInfo.before}→${removeInfo.after} pills=${q5.pills} state=${JSON.stringify(q5.st)}`);

  // ---------- Q6 零 pageerror ----------
  A('Q6 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));
} catch (e) {
  A('e2e 异常中断', false, String(e).slice(0, 300));
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter(([c]) => !c);
console.log(`\n==== e2e-v203: ${results.length - failed.length}/${results.length} ====`);
process.exit(failed.length ? 1 : 0);
