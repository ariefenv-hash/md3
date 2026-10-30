// R21=B 类（设备适配）巡查 e2e · v8.81（R17 后隔 3 轮回归；v8.77-80 连续零产品变更窗口）
// R20 遗留指向 verbatim：复验面 R13/R17 B 类判据（S 折叠序列 343→900 折返 axis 档位硬断言 /
//   W 组 widget 五档视口 390/600/768/1024/1280 / X 组极端档 800×360/320×740 place=null 在册降级 /
//   AA 组双形态跨断点 / T 组 transient 阈值档位重算 armed 前置）
// 增量① SP-M 组：600/768 中间档 split 旋转逐帧几何+帧预算首定档（R17 SP 逐帧口径 + R19 SP-F 帧预算口径跨档延伸，
//   档界参照 SP-F/P 组回旋档：p95≤416.8（25 vsync）/ max≤500.2 留档）
// 增量② SV 组：R20 S 组 SP-U 视觉快照三属性基准（split-pane bg=rgb(248, 250, 252) / app-header
//   height=48px / padding=0px 16px）+ split-pane 无圆角（R18 事实③）在 600/768 中间档交叉抽证
//   （R20 computed 跨档复用口径延伸：R19 留档 390 档、R20 抽证 1024 档、本轮 600/768 中间档）
// 增量③ A390 组：R17 口径延续（icon-box/dock-app-icon/aa-grid @390 档 computed）
// 纪律传承：外域 route.abort；getComputedStyle 读后立即物化（R12 事实①）；import 链开窗（R12 事实④）；
//   armed 重试兜底（R11 事实④/R13 事实③）；evaluate 内一律 new Promise(setTimeout)（R13 事实①）
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8100/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
// p95 采用 R19 d5 口径（ceil），与 SP-F 首定档判据同源
const p95 = arr => { const s = [...arr].sort((a, b) => a - b); return s.length ? (s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)] || 0) : 0; };

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

// ============ P1 前置锚 ============
const p1 = await page.evaluate(() => ({
  icons: document.querySelectorAll('.icon-box').length,
  dock: document.querySelectorAll('.dock-app-icon').length,
  glogo: !!document.querySelector('.search-g-logo'),
  wb: !!window.__widgetBoard,
}));
t('P1 前置（icon-box/dock/glogo/__widgetBoard）', p1.icons > 0 && p1.dock > 0 && p1.glogo && p1.wb, `icons=${p1.icons} dock=${p1.dock}`);

// ============ S 组：折叠序列（R13/R17 判据原样） ============
console.log('S 组 折叠加分屏交叉 resize（1024×768 起步，axis 档位硬断言）');
const splitOpened = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({
  appAId: 'calculator', appBId: 'notes',
  rectA: { left: 300, top: 200, width: 220, height: 160 },
  rectB: { left: 700, top: 200, width: 220, height: 160 },
  ratio: 0.5,
}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1500);
const info0 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
t('S-1 分屏开启（1024×768 axis=x）', splitOpened === 'OK' && info0 && info0.active === true && info0.axis === 'x', `ret=${splitOpened} axis=${info0 && info0.axis}`);

const FOLD_SEQ = [343, 500, 675, 768, 900, 675, 500, 343];
for (const w of FOLD_SEQ) {
  await page.setViewportSize({ width: w, height: 768 });
  await sleep(800);
  const g = await page.evaluate(() => {
    const info = window.__splitInfo && window.__splitInfo();
    const splitEls = [...document.querySelectorAll('[class*=split]')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    }).map(el => {
      const r = el.getBoundingClientRect();
      return { cls: el.className.slice(0, 36), l: Math.round(r.left), rgt: Math.round(r.right) };
    });
    return { vw: window.innerWidth, vh: window.innerHeight, axis: info ? info.axis : null, active: !!info && info.active === true, splitEls: splitEls.slice(0, 4) };
  });
  const expAxis = g.vw >= g.vh ? 'x' : 'y';
  t(`S-${w}a 视口 ${w}×768 分屏在场+axis=${expAxis}`, g.active && g.axis === expAxis, `axis=${g.axis} active=${g.active}`);
  const oob = g.splitEls.filter(e => e.l < -1 || e.rgt > g.vw + 1);
  t(`S-${w}b split 元素不越界`, oob.length === 0, oob.length ? JSON.stringify(oob) : `els=${g.splitEls.length}`);
}
const exited = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('S-10 分屏收场零挂死', exited === 'OK', String(exited));
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(600);

// ============ W 组：widget 五档视口复验（R13/R17 判据原样） ============
console.log('W 组 widget×五档视口（390/600/768/1024/1280）');
const VW_SEQ = [[390, 844], [600, 962], [768, 1024], [1024, 768], [1280, 800]];
for (let i = 0; i < VW_SEQ.length; i++) {
  const [vw, vh] = VW_SEQ[i];
  await page.setViewportSize({ width: vw, height: vh });
  await sleep(700);
  const r = await page.evaluate(async () => {
    const WB = window.__widgetBoard;
    if (!WB) return { noApi: true };
    const p1 = WB.list().some(x => x.kind === 'clock') ? null : WB.place('clock');
    const p2 = WB.list().some(x => x.kind === 'battery') ? null : WB.place('battery');
    const l = WB.list();
    const cards = [...document.querySelectorAll('.widget-card')].map(el => {
      const b = el.getBoundingClientRect();
      const host = el.closest('.page-grid') || el.parentElement;
      const hb = host ? host.getBoundingClientRect() : null;
      return { w: Math.round(b.width), h: Math.round(b.height),
               inPage: hb ? (b.left >= hb.left - 1 && b.right <= hb.right + 1 && b.top >= hb.top - 1 && b.bottom <= hb.bottom + 1) : 'NO-HOST' };
    });
    return { placed: !!p1 || !!p2, count: l.length, spans: l.map(x => `${x.kind}:${x.w}x${x.h}@p${x.page}`), cards, nCards: cards.length };
  });
  if (r.noApi) { t(`W-${i + 1} __widgetBoard 在场`, false, 'no api'); continue; }
  const spanOk = r.spans.every(s => { const m = s.match(/:(\d+)x(\d+)/); return m && +m[1] >= 1 && +m[2] >= 1; });
  t(`W-${i + 1} ${vw}×${vh} place+span 合法`, spanOk && r.count >= 1, `[${r.spans.join(',')}]`);
  const oob = r.cards.filter(c => c.inPage !== true);
  t(`W-${i + 1}b 卡几何在所在页容器内`, r.nCards === 0 || oob.length === 0, oob.length ? JSON.stringify(oob) : `cards=${r.nCards}`);
  const cyc = await page.evaluate(() => {
    const WB = window.__widgetBoard;
    const l = WB.list();
    if (!l.length) return null;
    const res = WB.resize(l[0].id);
    return res ? { w: res.w, h: res.h } : 'NO-NEXT';
  });
  const cycOk = cyc === 'NO-NEXT' || (cyc && cyc.w >= 1 && cyc.h >= 1);
  t(`W-${i + 1}c cycleSpan 后仍合法`, !!cycOk, JSON.stringify(cyc));
}
const afterResize = await page.evaluate(() => {
  const l = window.__widgetBoard.list();
  return { count: l.length, spans: l.map(x => `${x.w}x${x.h}`) };
});
t('W-6 五档往返后 span 仍合法', afterResize.spans.every(s => { const m = s.match(/(\d+)x(\d+)/); return m && +m[1] >= 1 && +m[2] >= 1; }), JSON.stringify(afterResize));
const cleaned = await page.evaluate(() => {
  const WB = window.__widgetBoard;
  WB.list().forEach(x => WB.remove(x.id));
  return WB.list().length;
});
t('W-7 widget 清理零残留', cleaned === 0, `left=${cleaned}`);

// ============ X 组：极端档（R13/R17 判据原样） ============
console.log('X 组 极端档降级（800×360 / 320×740）');
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
      return { inPage: hb ? (b.left >= hb.left - 1 && b.right <= hb.right + 1 && b.top >= hb.top - 1 && b.bottom <= hb.bottom + 1) : 'NO-HOST' };
    });
    return { placed: !!p, count: l.length, cards, toast: toast ? toast.textContent.slice(0, 40) : null };
  });
  const oob = xr.cards.filter(c => c.inPage !== true);
  t(`X-${vw}×${vh} 极端档 widget 在册降级`, (!xr.placed && xr.count === 0) || (xr.placed && oob.length === 0), `placed=${xr.placed} toast=${JSON.stringify(xr.toast)}`);
  if (xr.placed) {
    await page.evaluate(() => { const l = window.__widgetBoard.list(); l.forEach(x => window.__widgetBoard.remove(x.id)); });
    await sleep(300);
  }
}

// ============ A390 + AA 组（390 档 phone 形态段，R17 口径延续） ============
console.log('A390 组 R8 修复处 computed@390 档 + AA 组 phone 形态');
await page.setViewportSize({ width: 390, height: 844 });
await sleep(900);
const a390 = await page.evaluate(() => {
  const ic = document.querySelector('.icon-box');
  const dk = document.querySelector('.dock-app-icon');
  // live 纪律：读后立即物化（R12 事实①）
  const icS = ic ? (getComputedStyle(ic).webkitUserSelect || getComputedStyle(ic).userSelect) : 'NO_ICON';
  const dkCs = dk ? getComputedStyle(dk) : null;
  return { icS, dkAp: dkCs ? dkCs.appearance : 'NO_DOCK', dkWap: dkCs ? dkCs.webkitAppearance : 'NO_DOCK', tag: dk ? dk.tagName : '-' };
});
t('A390-1 icon-box user-select=none（390 档）', a390.icS === 'none', `s=${a390.icS}`);
t('A390-2 dock-app-icon appearance 双属性=none（390 档）', a390.dkAp === 'none' && a390.dkWap === 'none', `ap=${a390.dkAp} wk=${a390.dkWap} tag=${a390.tag}`);

const aa1 = await page.evaluate(async () => {
  const { openAllApps } = await import('/js/all-apps.js');
  openAllApps('r21');
  await new Promise(r => setTimeout(r, 1100));
  const ov = document.querySelector('.all-apps-overlay');
  const grid = document.querySelector('.all-apps-overlay .aa-grid');
  const gridS = grid ? (getComputedStyle(grid).webkitUserSelect || getComputedStyle(grid).userSelect) : 'NO_GRID';
  return ov ? { form: ov.dataset.form, active: ov.classList.contains('active'), gridS } : { form: 'NO_OVERLAY', gridS };
});
t('AA-1 390 档 phone 形态开启', aa1.form !== 'NO_OVERLAY' && aa1.active === true, `form=${aa1.form}`);
t('A390-3 aa-grid user-select=none（390 档）', aa1.gridS === 'none', `s=${aa1.gridS}`);
await page.keyboard.press('Escape');
await sleep(900);
const aa2 = await page.evaluate(() => {
  const ov = document.querySelector('.all-apps-overlay');
  return { kept: !!ov, active: ov ? ov.classList.contains('active') : null };
});
t('AA-2 phone 关后 DOM 保留（persistent）', aa2.kept === true, `active=${aa2.active}`);
const aa2b = await page.evaluate(async () => {
  const { openAllApps } = await import('/js/all-apps.js');
  openAllApps('r21-active');
  await new Promise(r => setTimeout(r, 1000));
  const ov = document.querySelector('.all-apps-overlay');
  return ov ? { active: ov.classList.contains('active'), form: ov.dataset.form } : { active: false, form: 'NO_OVERLAY' };
});
t('AA-2b 390 档重开 active（开启态前置）', aa2b.active === true && aa2b.form === 'phone', `form=${aa2b.form}`);

// ============ SP-M 组·增量①：600 中间档 split 旋转逐帧几何+帧预算首定档 ============
console.log('SP-M 组 600 中间档 split 旋转逐帧（600×962 ↔ 962×600）');
// 清场：phone persistent overlay 收起（split 前桌面干净，R20 S 组同款纪律）
await page.evaluate(async () => { try { const { closeAllApps } = await import('/js/all-apps.js'); closeAllApps('r21-clear'); } catch (e) {} });
await sleep(900);
await page.setViewportSize({ width: 600, height: 962 });
await sleep(900);
const sp600Open = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({
  appAId: 'calculator', appBId: 'notes',
  rectA: { left: 40, top: 120, width: 160, height: 120 },
  rectB: { left: 320, top: 120, width: 160, height: 120 },
  ratio: 0.5,
}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
const sp600_0 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
t('SP-M-0 600×962 中间档分屏开启 axis=y', sp600Open === 'OK' && sp600_0 && sp600_0.active === true && sp600_0.axis === 'y', `ret=${sp600Open} axis=${sp600_0 && sp600_0.axis}`);

// SV 组·增量②：SP-U 三属性基准 @600 中间档（R20 S 组口径 verbatim，live 物化）
const sv600 = await page.evaluate(() => {
  const pane = document.querySelector('.split-pane');
  const header = document.querySelector('.split-pane .app-header');
  if (!pane) return { err: 'NO_PANE' };
  const cs = getComputedStyle(pane);
  const ch = header ? getComputedStyle(header) : null;
  return { bg: String(cs.backgroundColor), rad: String(cs.borderRadius), h: ch ? String(ch.height) : 'NO_HEADER', pad: ch ? String(ch.padding) : 'NO_HEADER' };
});
t('SV-600-1 split-pane bg 基准（R19 SP-C-4/R20 S1 跨档抽证 @600）', sv600.bg === 'rgb(248, 250, 252)', `bg=${sv600.bg}`);
t('SV-600-2 split-pane border-radius=0px（R18 事实③ @600）', sv600.rad === '0px', `rad=${sv600.rad}`);
t('SV-600-3 app-header height/padding 基准（R19/R20 跨档抽证 @600）', sv600.h === '48px' && sv600.pad === '0px 16px', `h=${sv600.h} pad=${sv600.pad}`);

// 旋转逐帧采样器（R17 SP 口径 + R19 SP-F 帧预算口径合并：dt/oob/axis/active 单帧同采）
const rotRun = (ms) => page.evaluate(async (win) => {
  const out = [];
  let last = performance.now();
  const t0 = last;
  while (performance.now() - t0 < win) {
    await new Promise(r => requestAnimationFrame(r));
    const now = performance.now();
    const dt = now - last; last = now;
    const info = window.__splitInfo && window.__splitInfo();
    let oob = 0;
    for (const el of document.querySelectorAll('[class*=split]')) {
      const r = el.getBoundingClientRect();
      if (r.width > 2 && r.height > 2) {
        if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) oob++;
      }
    }
    out.push({ dt: Math.round(dt * 10) / 10, axis: info ? info.axis : null, active: !!info && info.active === true, oob });
  }
  return out;
}, 1400);

await page.setViewportSize({ width: 962, height: 600 });
const f600a = await rotRun(1400);
const sp600_1 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
const dts600a = f600a.map(f => f.dt);
t('SP-M-1a 600 正向旋转→962×600 末态 axis=x + 在场', sp600_1 && sp600_1.axis === 'x' && sp600_1.active === true, `axis=${sp600_1 && sp600_1.axis}`);
t('SP-M-1b 600 正向全帧不越视口（R17 SP 几何口径跨档）', f600a.every(f => f.oob === 0), `n=${f600a.length} oobSum=${f600a.reduce((a, f) => a + f.oob, 0)}`);
t('SP-M-1c 600 正向 p95≤416.8（25 vsync 首定档，参照 SP-F/P 回旋档）', p95(dts600a) <= 416.8, `p95=${p95(dts600a)} max=${Math.max(...dts600a)} mean=${(dts600a.reduce((a, b) => a + b, 0) / dts600a.length).toFixed(1)}`);
t('SP-M-1d 600 正向 max≤500.2（30 vsync 留档）', Math.max(...dts600a) <= 500.2, `max=${Math.max(...dts600a)}`);
await page.setViewportSize({ width: 600, height: 962 });
const f600b = await rotRun(1400);
const sp600_2 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
const dts600b = f600b.map(f => f.dt);
t('SP-M-2a 600 回旋→600×962 恢复 axis=y + 在场', sp600_2 && sp600_2.axis === 'y' && sp600_2.active === true, `axis=${sp600_2 && sp600_2.axis}`);
t('SP-M-2b 600 回旋全帧不越视口', f600b.every(f => f.oob === 0), `n=${f600b.length} oobSum=${f600b.reduce((a, f) => a + f.oob, 0)}`);
t('SP-M-2c 600 回旋 p95≤416.8（同档首定档）', p95(dts600b) <= 416.8, `p95=${p95(dts600b)} max=${Math.max(...dts600b)}`);
t('SP-M-2d 600 回旋 max≤500.2（留档）', Math.max(...dts600b) <= 500.2, `max=${Math.max(...dts600b)}`);
t('SP-M-3 600 双向旋转 active 恒 true（R17 SP 在册语义跨档复证）', f600a.concat(f600b).every(f => f.active === true), `nAll=${f600a.length + f600b.length}`);
t('SP-M-3b 600 旋转帧产出画像 n≥5×2 段（仪器下限 SP-F-4 同款）', Math.min(f600a.length, f600b.length) >= 5, `n=[${f600a.length},${f600b.length}]`);
const sp600Exit = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('SP-M-4 600 中间档收场零挂死', sp600Exit === 'OK', String(sp600Exit));

// ============ SP-M 组：768 中间档同构 ============
console.log('SP-M 组 768 中间档 split 旋转逐帧（768×1024 ↔ 1024×768）');
await page.setViewportSize({ width: 768, height: 1024 });
await sleep(900);
const sp768Open = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({
  appAId: 'calculator', appBId: 'notes',
  rectA: { left: 60, top: 160, width: 200, height: 140 },
  rectB: { left: 420, top: 160, width: 200, height: 140 },
  ratio: 0.5,
}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
const sp768_0 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
t('SP-M-5 768×1024 中间档分屏开启 axis=y', sp768Open === 'OK' && sp768_0 && sp768_0.active === true && sp768_0.axis === 'y', `ret=${sp768Open} axis=${sp768_0 && sp768_0.axis}`);

const sv768 = await page.evaluate(() => {
  const pane = document.querySelector('.split-pane');
  const header = document.querySelector('.split-pane .app-header');
  if (!pane) return { err: 'NO_PANE' };
  const cs = getComputedStyle(pane);
  const ch = header ? getComputedStyle(header) : null;
  return { bg: String(cs.backgroundColor), rad: String(cs.borderRadius), h: ch ? String(ch.height) : 'NO_HEADER', pad: ch ? String(ch.padding) : 'NO_HEADER' };
});
t('SV-768-1 split-pane bg 基准（跨档抽证 @768）', sv768.bg === 'rgb(248, 250, 252)', `bg=${sv768.bg}`);
t('SV-768-2 split-pane border-radius=0px（R18 事实③ @768）', sv768.rad === '0px', `rad=${sv768.rad}`);
t('SV-768-3 app-header height/padding 基准（跨档抽证 @768）', sv768.h === '48px' && sv768.pad === '0px 16px', `h=${sv768.h} pad=${sv768.pad}`);

await page.setViewportSize({ width: 1024, height: 768 });
const f768a = await rotRun(1400);
const sp768_1 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
const dts768a = f768a.map(f => f.dt);
t('SP-M-6a 768 正向旋转→1024×768 末态 axis=x + 在场', sp768_1 && sp768_1.axis === 'x' && sp768_1.active === true, `axis=${sp768_1 && sp768_1.axis}`);
t('SP-M-6b 768 正向全帧不越视口', f768a.every(f => f.oob === 0), `n=${f768a.length} oobSum=${f768a.reduce((a, f) => a + f.oob, 0)}`);
t('SP-M-6c 768 正向 p95≤416.8（同档首定档）', p95(dts768a) <= 416.8, `p95=${p95(dts768a)} max=${Math.max(...dts768a)} mean=${(dts768a.reduce((a, b) => a + b, 0) / dts768a.length).toFixed(1)}`);
t('SP-M-6d 768 正向 max≤500.2（留档）', Math.max(...dts768a) <= 500.2, `max=${Math.max(...dts768a)}`);
await page.setViewportSize({ width: 768, height: 1024 });
const f768b = await rotRun(1400);
const sp768_2 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
const dts768b = f768b.map(f => f.dt);
t('SP-M-7a 768 回旋→768×1024 恢复 axis=y + 在场', sp768_2 && sp768_2.axis === 'y' && sp768_2.active === true, `axis=${sp768_2 && sp768_2.axis}`);
t('SP-M-7b 768 回旋全帧不越视口', f768b.every(f => f.oob === 0), `n=${f768b.length} oobSum=${f768b.reduce((a, f) => a + f.oob, 0)}`);
t('SP-M-7c 768 回旋 p95≤416.8（同档首定档）', p95(dts768b) <= 416.8, `p95=${p95(dts768b)} max=${Math.max(...dts768b)}`);
t('SP-M-7d 768 回旋 max≤500.2（留档）', Math.max(...dts768b) <= 500.2, `max=${Math.max(...dts768b)}`);
t('SP-M-8 768 双向旋转 active 恒 true', f768a.concat(f768b).every(f => f.active === true), `nAll=${f768a.length + f768b.length}`);
t('SP-M-8b 768 旋转帧产出画像 n≥5×2 段', Math.min(f768a.length, f768b.length) >= 5, `n=[${f768a.length},${f768b.length}]`);
const sp768Exit = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('SP-M-9 768 中间档收场零挂死', sp768Exit === 'OK', String(sp768Exit));

// ============ AA 组收尾：1024 档 tablet 形态（R13/R17 判据原样） ============
console.log('AA 组 tablet 形态收尾（1024 档）');
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(800);
const aa4b = await page.evaluate(async () => {
  const { openAllApps } = await import('/js/all-apps.js');
  openAllApps('r21-reopen');
  await new Promise(r => setTimeout(r, 1000));
  const ov = document.querySelector('.all-apps-overlay');
  return ov ? { form: ov.dataset.form, active: ov.classList.contains('active') } : { form: 'NO_OVERLAY' };
});
t('AA-4 resize 后重开重建为 tablet 形态', aa4b.form === 'tablet' && aa4b.active === true, `form=${aa4b.form} active=${aa4b.active}`);
await page.keyboard.press('Escape');
await sleep(1000);
const aa5 = await page.evaluate(() => ({ destroyed: !document.querySelector('.all-apps-overlay') }));
t('AA-5 tablet 关后销毁零残留（ephemeral）', aa5.destroyed === true, `destroyed=${aa5.destroyed}`);

// ============ T 组：taskbar-transient 阈值档位（R13/R17 判据原样） ============
console.log('T 组 transient 阈值档位（平板专用语义）');
await page.evaluate(async () => {
  const { initialApps } = await import('/js/apps-data.js');
  const { openApp } = await import('/js/app-window.js');
  const idx = initialApps.findIndex(a => a.id === 'calculator');
  if (idx !== -1) openApp(idx);
});
await sleep(5600);
let armed1024 = false;
for (let i = 0; i < 4 && !armed1024; i++) {
  armed1024 = await page.evaluate(async () => (await import('/js/taskbar-transient.js')).__transientTestHooks().armed === true);
  if (!armed1024) await sleep(1500);
}
const t1 = await page.evaluate(() => window.__state.isOpen === true);
t('T-1 1024 平板档 armed=true（重试兜底）', armed1024, `open=${t1}`);
await page.setViewportSize({ width: 390, height: 844 });
await sleep(1000);
const t2 = await page.evaluate(async () => {
  const hooks = (await import('/js/taskbar-transient.js')).__transientTestHooks();
  return { armed390: hooks.armed };
});
t('T-2 resize→390 手机档 armed 重算为 false（阈值档位在册语义）', t2.armed390 === false, `armed390=${t2.armed390}`);
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(800);

// ============ 截图 + K 组 ============
await page.screenshot({ path: 'docs/sweep/s21-device-final.png' });
t('K-1 全程零 pageerror', errors.length === 0, errors.join(';').slice(0, 200));
await ctx.close();
await browser.close();
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
