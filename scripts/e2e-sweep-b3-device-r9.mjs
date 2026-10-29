// R9=B 类（设备适配）巡查 e2e · v8.69
// S 组·折叠加分屏交叉 resize（R8 指向新增面①：R6 折叠序列是普通窗口，本轮分屏在场）
// W 组·widget-board 多尺寸档×五档视口（R8 指向新增面②：span 钳制/规格轮换/resize 重排）
// X 组·极端档（800×360 / 320×740）widget 降级
// K 组·全程零 pageerror
// 纪律：外域 route.abort；可控超时；__state.isOpen/__splitInfo 前置防空壳假阳性
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8095/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

// ============ S 组：分屏在场 × 折叠屏连续 resize ============
console.log('S 组 折叠加分屏交叉 resize（1024×768 起步）');
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(500);
const splitOpened = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({
  appAId: 'calculator', appBId: 'notes',
  rectA: { left: 300, top: 200, width: 220, height: 160 },
  rectB: { left: 700, top: 200, width: 220, height: 160 },
  ratio: 0.5,
}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1500);
const info0 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
t('S-1 分屏开启（1024×768）', splitOpened === 'OK', `ret=${splitOpened} info=${JSON.stringify(info0).slice(0, 160)}`);

const FOLD_SEQ = [343, 500, 675, 768, 900, 675, 500, 343];
const geoResults = [];
for (const w of FOLD_SEQ) {
  await page.setViewportSize({ width: w, height: 768 });
  await sleep(800);
  const g = await page.evaluate(() => {
    const vw = window.innerWidth;
    const info = window.__splitInfo && window.__splitInfo();
    const panes = [...document.querySelectorAll('.split-pane, [class*=split-pane]')].map(el => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vis: r.width > 0 && r.height > 0 };
    });
    const splitEls = [...document.querySelectorAll('[class*=split]')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    }).map(el => {
      const r = el.getBoundingClientRect();
      return { cls: el.className.slice(0, 40), l: Math.round(r.left), t: Math.round(r.top), rgt: Math.round(r.right), b: Math.round(r.bottom) };
    });
    return { vw, info, panes: panes.slice(0, 3), splitEls: splitEls.slice(0, 4) };
  });
  geoResults.push({ w, ...g });
  // 硬断言①：分屏会话全程在场（active）——防空壳假阳性（R6 教训）
  t(`S-${w}a 视口 ${w}×768 分屏会话在场`, !!g.info && g.info.active === true, `info=${JSON.stringify(g.info)}`);
  // 硬断言②：所有可见 split 元素不越出视口
  const oob = g.splitEls.filter(e => e.l < -1 || e.rgt > g.vw + 1);
  t(`S-${w}b split 元素不越界`, oob.length === 0, oob.length ? JSON.stringify(oob) : `els=${g.splitEls.length}`);
}
t('S-9 折叠序列全程零 pageerror', errors.length === 0, errors.join(';').slice(0, 200));
console.log('  [dump] 折叠序列 __splitInfo:', geoResults.map(r => `${r.w}:${JSON.stringify(r.info)}`).join(' '));

// 收场
const exited = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('S-10 分屏收场零挂死', exited === 'OK', String(exited));
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(600);

// ============ W 组：widget 多尺寸档 × 五档视口 ============
console.log('W 组 widget×五档视口');
const VW_SEQ = [[390, 844], [600, 962], [768, 1024], [1024, 768], [1280, 800]];
let firstWidgetIds = null;
for (let i = 0; i < VW_SEQ.length; i++) {
  const [vw, vh] = VW_SEQ[i];
  await page.setViewportSize({ width: vw, height: vh });
  await sleep(700);
  const r = await page.evaluate(async () => {
    const WB = window.__widgetBoard;
    if (!WB) return { noApi: true };
    const before = WB.list().length;
    const p1 = WB.list().some(x => x.kind === 'clock') ? null : WB.place('clock');
    const p2 = WB.list().some(x => x.kind === 'battery') ? null : WB.place('battery');
    const after = WB.list();
    // DOM 几何
    const cards = [...document.querySelectorAll('.widget-card')].map(el => {
      const b = el.getBoundingClientRect();
      // 相对所在页容器断言（桌面页横向平铺，非当前页卡片在视口外系正常几何）
      const host = el.closest('.page-grid') || el.parentElement;
      const hb = host ? host.getBoundingClientRect() : null;
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
               inPage: hb ? (b.left >= hb.left - 1 && b.right <= hb.right + 1 && b.top >= hb.top - 1 && b.bottom <= hb.bottom + 1) : 'NO-HOST',
               hostCls: host ? host.className.slice(0, 30) : null };
    });
    return {
      placed1: !!p1, placed2: !!p2, count: after.length,
      spans: after.map(x => `${x.kind}:${x.w}x${x.h}@p${x.page}`),
      cards,
      vw: window.innerWidth,
    };
  });
  if (r.noApi) { t(`W-${vw} __widgetBoard API 在场`, false, 'no api'); continue; }
  const spanOk = r.spans.every(s => { const m = s.match(/:(\d+)x(\d+)/); return m && +m[1] >= 1 && +m[2] >= 1; });
  t(`W-${i + 1} 视口 ${vw}×${vh} place+span 合法`, spanOk && r.count >= 1, `count=${r.count} [${r.spans.join(',')}] p1=${r.placed1} p2=${r.placed2}`);
  const oobCard = r.cards.filter(c => c.inPage !== true);
  t(`W-${i + 1}b widget 卡几何在所在页容器内`, r.cards.length === 0 || oobCard.length === 0, oobCard.length ? JSON.stringify(oobCard) : `cards=${r.cards.length} ok=${r.cards.filter(c => c.inPage === true).length}`);
  // 规格轮换一次
  const cyc = await page.evaluate(() => {
    const WB = window.__widgetBoard;
    const l = WB.list();
    if (!l.length) return null;
    const res = WB.resize(l[0].id);
    return res ? { w: res.w, h: res.h } : 'NO-NEXT';
  });
  await sleep(400);
  const cycOk = cyc === 'NO-NEXT' || (cyc && cyc.w >= 1 && cyc.h >= 1);
  t(`W-${i + 1}c cycleSpan 后仍合法`, !!cycOk, JSON.stringify(cyc));
  if (firstWidgetIds === null) {
    firstWidgetIds = await page.evaluate(() => window.__widgetBoard.list().map(x => x.id));
  }
}
// 五档走完再 resize 回 390 验证重排钳制
await page.setViewportSize({ width: 390, height: 844 });
await sleep(800);
const afterResize = await page.evaluate(() => {
  const l = window.__widgetBoard.list();
  return { count: l.length, spans: l.map(x => `${x.w}x${x.h}`) };
});
t('W-6 五档 resize 往返后 widget span 仍合法', afterResize.spans.every(s => { const m = s.match(/(\d+)x(\d+)/); return m && +m[1] >= 1 && +m[2] >= 1; }), JSON.stringify(afterResize));
await page.screenshot({ path: 'docs/sweep/s9-widget-390.png' });
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(600);
await page.screenshot({ path: 'docs/sweep/s9-widget-1024.png' });
// 收场清理
const cleaned = await page.evaluate(() => {
  const WB = window.__widgetBoard;
  WB.list().forEach(x => WB.remove(x.id));
  return WB.list().length;
});
t('W-7 widget 清理零残留', cleaned === 0, `left=${cleaned}`);

// ============ X 组：极端档 ============
console.log('X 组 极端档降级');
for (const [vw, vh] of [[800, 360], [320, 740]]) {
  await page.setViewportSize({ width: vw, height: vh });
  await sleep(700);
  const xr = await page.evaluate(() => {
    const WB = window.__widgetBoard;
    const p = WB.place('clock');
    const l = WB.list();
    const toast = document.querySelector('.system-toast, #systemToast');
    const cards = [...document.querySelectorAll('.widget-card')].map(el => {
      const b = el.getBoundingClientRect();
      const host = el.closest('.page-grid') || el.parentElement;
      const hb = host ? host.getBoundingClientRect() : null;
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
               inPage: hb ? (b.left >= hb.left - 1 && b.right <= hb.right + 1 && b.top >= hb.top - 1 && b.bottom <= hb.bottom + 1) : 'NO-HOST' };
    });
    return { placed: !!p, count: l.length, spans: l.map(x => `${x.w}x${x.h}`), cards, vw: window.innerWidth, toast: toast ? toast.textContent.slice(0, 50) : null };
  });
  const oob = xr.cards.filter(c => c.inPage !== true);
  t(`X-${vw}×${vh} 极端档 widget 合法（place 成功则页内合法/失败则 null+toast 在册）`, (!xr.placed && xr.count === 0) || (xr.placed && oob.length === 0), `placed=${xr.placed} toast=${JSON.stringify(xr.toast)} oob=${JSON.stringify(oob)}`);
  if (xr.placed) {
    await page.evaluate(() => { const l = window.__widgetBoard.list(); l.forEach(x => window.__widgetBoard.remove(x.id)); });
    await sleep(300);
  }
}

t('K-1 全程零 pageerror', errors.length === 0, errors.join(';').slice(0, 200));
await ctx.close();
await browser.close();
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
