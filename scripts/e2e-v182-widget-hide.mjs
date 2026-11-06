// ==================== e2e-v182-widget-hide.mjs — #182 widget 逐项显隐真浏览器回归（v10.14） ====================
// S1 腾格（page0 slots 22-23 state+DOM 双清）→ place 2×1 落页0可见
// S2 真右键（Playwright button:right）→ 卡片长按菜单 active（隐藏/移除双项）
// S3 Esc 收起 → 再开菜单
// S4 点「隐藏」→ 卡片消失 + 配置保留（list.hidden=true + localStorage 落盘）
// S5 不占格实证：原槽放新件 1×1 成功；移除腾回 22-23
// S6 picker「已隐藏」管理区：真点击「恢复」→ 行消失 + 卡片回页0 slot 22
// S7 菜单「移除」→ 配置销毁（list 无该件）
// S8 全程零 pageerror
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8996;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXE = process.env.CHROME_EXE || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';

const results = [];
const A = (name, cond, extra = '') => {
  results.push([cond, name, extra]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' : ''}${extra}`);
};

const server = spawn('node', [join(root, 'scripts/serve.mjs'), '--no-open', '--port', String(PORT)], { cwd: root, stdio: 'ignore' });
await sleep(1200);
const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--autoplay-policy=no-user-gesture-required'] });
const errors = [];
let failed = 0;
try {
  const page = await browser.newPage({ viewport: { width: 480, height: 860 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)[^/]+/, (route) => route.abort());
  await page.goto(`${BASE}?nolock=1`, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => { if (window.__lockTest) window.__lockTest.instantUnlock(); });
  await sleep(400);

  // S1 腾格 + 落位（页0 末两格 state+DOM 双清 → 2×1 落 slot 22 可见）
  const s1 = await page.evaluate(() => {
    const pg = window.__state.pagesApps[0];
    const gone = pg.filter((a) => a.slot >= 22 && a.slot <= 23);
    window.__state.pagesApps[0] = pg.filter((a) => a.slot < 22);
    gone.forEach((a) => {
      const el = document.querySelector(`.page-grid[data-page="0"] .app-icon[data-slot="${a.slot}"]`);
      if (el) el.remove();
    });
    const placed = window.__widgetBoard.place('battery', 2, 1);
    return { popped: gone.length, placed };
  });
  await sleep(400);
  const s1b = await page.evaluate(() => {
    const card = document.querySelector('.page-grid[data-page="0"] .widget-card');
    return {
      cardInPage0: !!card,
      kind: card ? card.dataset.kind : '',
      id: card ? card.dataset.widgetId : '',
      visible: card ? card.getBoundingClientRect().width > 0 : false,
    };
  });
  A('S1 腾格落位 → 2×1 落页0 slot22 + DOM 卡片可见',
    s1.popped === 2 && s1.placed && s1.placed.page === 0 && s1.placed.slot === 22
    && s1b.cardInPage0 && s1b.kind === 'battery' && s1b.visible, JSON.stringify({ s1, s1b }));
  const WID = s1b.id;

  // S2 真右键 → 卡片长按菜单（隐藏/移除双项）
  await page.click(`.widget-card[data-widget-id="${WID}"]`, { button: 'right' });
  await sleep(300);
  const s2 = await page.evaluate(() => {
    const m = document.getElementById('widgetCardMenu');
    return {
      active: m ? m.classList.contains('active') : false,
      items: m ? m.querySelectorAll('.wsm-item').length : 0,
      hide: !!m?.querySelector('[data-wcm="hide"]'),
      remove: !!m?.querySelector('[data-wcm="remove"]'),
    };
  });
  A('S2 真右键 → 卡片长按菜单 active（隐藏/移除双通道）',
    s2.active && s2.items === 2 && s2.hide && s2.remove, JSON.stringify(s2));

  // S3 Esc 收起 → 再开
  await page.keyboard.press('Escape');
  await sleep(200);
  const s3 = await page.evaluate(() => document.getElementById('widgetCardMenu').classList.contains('active'));
  A('S3 Esc → 菜单收起', s3 === false, `active=${s3}`);
  await page.click(`.widget-card[data-widget-id="${WID}"]`, { button: 'right' });
  await sleep(200);

  // S4 点「隐藏」→ 卡片消失 + 配置保留
  await page.click('#widgetCardMenu [data-wcm="hide"]');
  await sleep(400);
  const s4 = await page.evaluate((wid) => {
    const inList = window.__widgetBoard.list().find((w) => w.id === wid);
    const saved = JSON.parse(localStorage.getItem('ios-desktop:widget-board')).widgets.find((w) => w.id === wid);
    return {
      domGone: !document.querySelector(`.widget-card[data-widget-id="${wid}"]`),
      kept: !!inList,
      hidden: inList ? inList.hidden : null,
      savedHidden: saved ? saved.hidden : null,
      hiddenCount: window.__widgetBoard.hiddenList().length,
      menuClosed: !document.getElementById('widgetCardMenu').classList.contains('active'),
    };
  }, WID);
  A('S4 隐藏 → 卡片消失 + 配置保留落盘（hidden:true）+ 菜单收口',
    s4.domGone && s4.kept && s4.hidden === true && s4.savedHidden === true && s4.hiddenCount === 1 && s4.menuClosed, JSON.stringify(s4));

  // S5 不占格：原槽 22 放新件 1×1；随后移除腾回
  const s5 = await page.evaluate(() => {
    const b = window.__widgetBoard.place('battery', 1, 1);
    const ok = b && b.page === 0 && b.slot === 22;
    window.__widgetBoard.remove(b.id);
    return { slot: b ? b.slot : -1, ok };
  });
  A('S5 隐藏件不占格 → 原槽 22 可放新件（1×1）', s5.ok, JSON.stringify(s5));

  // S6 picker 已隐藏管理区：真点击「恢复」→ 行消失 + 卡片回页0
  await page.evaluate(() => window.__widgetBoard.open());
  await sleep(500);
  const s6a = await page.evaluate((wid) => {
    const ov = document.getElementById('widgetPickerOverlay');
    const head = ov.querySelector('.wp-hidden-head');
    const row = ov.querySelector(`.wp-hidden-row[data-widget-id="${wid}"]`);
    return {
      open: ov.classList.contains('active'),
      headText: head ? head.textContent : '',
      rowThere: !!row,
      btnThere: !!row?.querySelector('.wp-restore-btn'),
    };
  }, WID);
  A('S6a 管理区 → 区头计数 + 恢复行在册',
    s6a.open && s6a.headText === '已隐藏（1）' && s6a.rowThere && s6a.btnThere, JSON.stringify(s6a));
  await page.click(`.wp-hidden-row[data-widget-id="${WID}"] .wp-restore-btn`);
  await sleep(400);
  const s6b = await page.evaluate((wid) => {
    const ov = document.getElementById('widgetPickerOverlay');
    const a = window.__widgetBoard.list().find((w) => w.id === wid);
    const card = document.querySelector(`.widget-card[data-widget-id="${wid}"]`);
    return {
      rowGone: !ov.querySelector('.wp-hidden-row'),
      headGone: !ov.querySelector('.wp-hidden-head'),
      hidden: a ? a.hidden : null,
      page: a ? a.page : -1,
      slot: a ? a.slot : -1,
      cardBack: !!card,
      cardInPage0: !!document.querySelector('.page-grid[data-page="0"] .widget-card'),
    };
  }, WID);
  A('S6b 真点击恢复 → 行消失 + first-fit 回页0 slot22 + 空态区头不渲染',
    s6b.rowGone && s6b.headGone && s6b.hidden === false && s6b.page === 0 && s6b.slot === 22
    && s6b.cardBack && s6b.cardInPage0, JSON.stringify(s6b));
  await page.evaluate(() => window.__widgetBoard.close());
  await sleep(200);

  // S7 菜单「移除」→ 配置销毁
  await page.click(`.widget-card[data-widget-id="${WID}"]`, { button: 'right' });
  await sleep(200);
  await page.click('#widgetCardMenu [data-wcm="remove"]');
  await sleep(400);
  const s7 = await page.evaluate((wid) => ({
    domGone: !document.querySelector(`.widget-card[data-widget-id="${wid}"]`),
    listGone: !window.__widgetBoard.list().some((w) => w.id === wid),
    saved: JSON.parse(localStorage.getItem('ios-desktop:widget-board')).widgets.some((w) => w.id === wid),
  }), WID);
  A('S7 移除 → 配置销毁（DOM/list/storage 三清）', s7.domGone && s7.listGone && !s7.saved, JSON.stringify(s7));

  // S8 全程零 pageerror
  A('S8 全程零 pageerror', errors.length === 0, errors.join(' | ').slice(0, 200));
} catch (e) {
  console.log('FATAL', e);
  failed = 1;
} finally {
  await browser.close();
  server.kill();
}
for (const [ok] of results) if (!ok) failed = 1;
console.log(failed ? `RESULT: FAIL (${results.filter((r) => !r[0]).length} failed)` : `RESULT: ALL PASS (${results.length})`);
process.exit(failed);
