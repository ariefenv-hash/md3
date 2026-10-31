// R29=B 类（设备适配）巡查 e2e · v8.89（R25 后隔 3 轮回归；v8.85-88 连续零产品变更窗口）
// R28 遗留指向 verbatim：R13/R17/R21/R25 B 类判据（S 组折叠序列 343→900 折返 axis 档位硬断言 /
//   W 组 widget 五档视口 390/600/768/1024/1280 / X 组极端档 800×360/320×740 place=null 在册降级 /
//   AA 组双形态跨断点 / T 组 transient 阈值档位重算 armed 前置）复验，
//   增量重点 R26/R27/R28 新增面设备维度延伸（R26 SPV600 视觉快照跨旋转 600 档 + R27 SPG6D 600 档
//   帧预算 D 类留档 133.4-166.6 与 SP-H390 390 档快照链 D 类留档 0.588-0.594ms + R28 V 组 600 档
//   动态旋转 computed 恒定 A 类口径与 W 组 390 档五属性 A 类补档 → 本轮 B 类视角正式化：
//   ①SPF390 组 390 档旋转逐帧几何+帧预算 B 类复核（R19 SP-F phone 档首定档 p95=100-150 留档直接
//   diff，档界 p95≤416.8/max≤500.2）②SV-390 组 390 档五属性基准 B 类视角（R26 U-W/R28 W 组口径
//   设备维度引用）③SPH3B 组 390 档快照采样链叠加旋转同窗观测 B 类复核（R27 SP-H390 D 类留档直接 diff））
// 纪律传承：外域 route.abort；getComputedStyle 读后立即物化（R12 事实①）；import 链开窗（R12 事实④）；
//   armed 重试兜底（R11 事实④/R13 事实③）；evaluate 内一律 new Promise(setTimeout)（R13 事实①）；
//   close 系过渡系合成器时钟驱动判据（R18 教训）；p95 采用 R19 d5 口径（ceil）
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8100/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const p95 = arr => { const s = [...arr].sort((a, b) => a - b); return s.length ? (s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)] || 0) : 0; };

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(3000); // boot 快照前置（R7 教训①）

// longtask 观察器前置挂载（R7 传承）
await page.evaluate(() => {
  window.__lt = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(+e.duration.toFixed(1)); }).observe({ entryTypes: ['longtask'] }); } catch (e) {}
});
const takeLT = async () => { const v = await page.evaluate(() => window.__lt.splice(0)); return v; };

// 视觉快照（R18 SP-U/R22 SP-V/R25/R27 同款：live 物化五属性）
const paneSnap = () => page.evaluate(() => {
  const panes = [...document.querySelectorAll('.split-pane')];
  const hdr = document.querySelector('.split-pane .app-header');
  const info = window.__splitInfo && window.__splitInfo();
  return {
    n: panes.length, axis: info ? info.axis : null, active: info ? !!info.active : null,
    bg: panes[0] ? String(getComputedStyle(panes[0]).backgroundColor) : 'NO_PANE',
    rad: panes[0] ? String(getComputedStyle(panes[0]).borderRadius) : 'NO_PANE',
    usel: panes[0] ? (getComputedStyle(panes[0]).webkitUserSelect || getComputedStyle(panes[0]).userSelect) : 'NO_PANE',
    hdrH: hdr ? String(getComputedStyle(hdr).height) : null,
    hdrPad: hdr ? String(getComputedStyle(hdr).padding) : null,
  };
});

// ============ P1 前置锚 ============
const p1 = await page.evaluate(() => ({
  icons: document.querySelectorAll('.icon-box').length,
  dock: document.querySelectorAll('.dock-app-icon').length,
  glogo: !!document.querySelector('.search-g-logo'),
  wb: !!window.__widgetBoard,
}));
t('P1 前置（icon-box/dock/glogo/__widgetBoard）', p1.icons > 0 && p1.dock > 0 && p1.glogo && p1.wb, `icons=${p1.icons} dock=${p1.dock}`);

// ============ S 组：折叠序列（R13/R17/R21/R25 判据原样） ============
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

// ============ W 组：widget 五档视口复验（R13/R17/R21/R25 判据原样） ============
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

// ============ X 组：极端档（R13/R17/R21/R25 判据原样） ============
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

// ============ A390 + AA 组（390 档 phone 形态段，R17/R21/R25 口径延续） ============
console.log('A390 组 R8 修复处 computed@390 档 + AA 组 phone 形态');
await page.setViewportSize({ width: 390, height: 844 });
await sleep(900);
const a390 = await page.evaluate(() => {
  const ic = document.querySelector('.icon-box');
  const dk = document.querySelector('.dock-app-icon');
  const icS = ic ? (getComputedStyle(ic).webkitUserSelect || getComputedStyle(ic).userSelect) : 'NO_ICON';
  const dkCs = dk ? getComputedStyle(dk) : null;
  return { icS, dkAp: dkCs ? dkCs.appearance : 'NO_DOCK', dkWap: dkCs ? dkCs.webkitAppearance : 'NO_DOCK', tag: dk ? dk.tagName : '-' };
});
t('A390-1 icon-box user-select=none（390 档）', a390.icS === 'none', `s=${a390.icS}`);
t('A390-2 dock-app-icon appearance 双属性=none（390 档）', a390.dkAp === 'none' && a390.dkWap === 'none', `ap=${a390.dkAp} wk=${a390.dkWap} tag=${a390.tag}`);

const aa1 = await page.evaluate(async () => {
  const { openAllApps } = await import('/js/all-apps.js');
  openAllApps('r29');
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
  openAllApps('r29-active');
  await new Promise(r => setTimeout(r, 1000));
  const ov = document.querySelector('.all-apps-overlay');
  return ov ? { active: ov.classList.contains('active'), form: ov.dataset.form } : { active: false, form: 'NO_OVERLAY' };
});
t('AA-2b 390 档重开 active（开启态前置）', aa2b.active === true && aa2b.form === 'phone', `form=${aa2b.form}`);

// ============ SPF390 组·增量①：390 档旋转逐帧几何+帧预算 B 类复核（R19 SP-F 留档直接 diff） ============
console.log('SPF390 组 390 档 split 旋转逐帧（390×844 ↔ 844×390，R19 SP-F 留档 diff）');
// 清场：phone persistent overlay 收起（split 前桌面干净，R20/R21/R25 同款纪律）
await page.evaluate(async () => { try { const { closeAllApps } = await import('/js/all-apps.js'); closeAllApps('r29-clear'); } catch (e) {} });
await sleep(900);
const spfOpen = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({
  appAId: 'calculator', appBId: 'notes',
  rectA: { left: 30, top: 120, width: 140, height: 110 },
  rectB: { left: 200, top: 120, width: 140, height: 110 },
  ratio: 0.5,
}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
const spf0 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
t('SPF390-0 390×844 档分屏开启 axis=y（R19 SP 同款 rect）', spfOpen === 'OK' && spf0 && spf0.active === true && spf0.axis === 'y', `ret=${spfOpen} axis=${spf0 && spf0.axis}`);

// SV-390 五属性基准（R26 U-W/R28 W 组口径 B 类视角引用，live 物化）
const sv390 = await paneSnap();
t('SV-390-1 split-pane bg 基准（跨档抽证 @390，R19 SP-C-4/R26 U-W/R28 W 组口径）', sv390.bg === 'rgb(248, 250, 252)', `bg=${sv390.bg}`);
t('SV-390-2 split-pane border-radius=0px（R18 事实③ @390）', sv390.rad === '0px', `rad=${sv390.rad}`);
t('SV-390-3 app-header height/padding 基准（跨档抽证 @390）', sv390.hdrH === '48px' && sv390.hdrPad === '0px 16px', `h=${sv390.hdrH} pad=${sv390.hdrPad}`);
t('U-R29-1 split-pane user-select=none @390（R24 U 组/R26 U-W/R28 W 组口径设备维度引用复核）', sv390.usel === 'none', `usel=${sv390.usel}`);

// 旋转逐帧采样器（R17 SP/R19 SP-F/R21 SP-M/R25 口径合并：dt/oob/axis/active 单帧同采）
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

await page.setViewportSize({ width: 844, height: 390 });
const f390a = await rotRun(1400);
const spf1 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
const dts390a = f390a.map(f => f.dt);
t('SPF390-1a 390 正向旋转→844×390 末态 axis=x + 在场', spf1 && spf1.axis === 'x' && spf1.active === true, `axis=${spf1 && spf1.axis}`);
t('SPF390-1b 390 正向全帧不越视口（R17 SP 几何口径 phone 档）', f390a.every(f => f.oob === 0), `n=${f390a.length} oobSum=${f390a.reduce((a, f) => a + f.oob, 0)}`);
t('SPF390-1c 390 正向 p95≤416.8（25 vsync 档界，R19 SP-F 首定档留档 p95=100-150 直接 diff）', p95(dts390a) <= 416.8, `p95=${p95(dts390a)} max=${Math.max(...dts390a)} mean=${(dts390a.reduce((a, b) => a + b, 0) / dts390a.length).toFixed(1)}`);
t('SPF390-1d 390 正向 max≤500.2（30 vsync 留档）', Math.max(...dts390a) <= 500.2, `max=${Math.max(...dts390a)}`);
// 旋转后视觉快照恒定（R26 SPV600/R28 V 组口径 phone 档延伸）
const sv390rot = await paneSnap();
t('SPV390-1 旋转后 90° 视觉五属性恒定（R26 SPV600/R28 V 组口径 phone 档延伸）', sv390rot.bg === sv390.bg && sv390rot.hdrH === sv390.hdrH && sv390rot.hdrPad === sv390.hdrPad && sv390rot.rad === sv390.rad && sv390rot.usel === sv390.usel, `bg=${sv390rot.bg} h=${sv390rot.hdrH}`);
await page.setViewportSize({ width: 390, height: 844 });
const f390b = await rotRun(1400);
const spf2 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
const dts390b = f390b.map(f => f.dt);
t('SPF390-2a 390 回旋→390×844 恢复 axis=y + 在场', spf2 && spf2.axis === 'y' && spf2.active === true, `axis=${spf2 && spf2.axis}`);
t('SPF390-2b 390 回旋全帧不越视口', f390b.every(f => f.oob === 0), `n=${f390b.length} oobSum=${f390b.reduce((a, f) => a + f.oob, 0)}`);
t('SPF390-2c 390 回旋 p95≤416.8（同档界，R19 SP-F 留档直接 diff）', p95(dts390b) <= 416.8, `p95=${p95(dts390b)} max=${Math.max(...dts390b)}`);
t('SPF390-2d 390 回旋 max≤500.2（留档）', Math.max(...dts390b) <= 500.2, `max=${Math.max(...dts390b)}`);
const sv390back = await paneSnap();
t('SPV390-2 旋回后视觉快照与基准全等（R26 SPV600/R28 V 组口径 phone 档延伸）', sv390back.bg === sv390.bg && sv390back.hdrH === sv390.hdrH && sv390back.hdrPad === sv390.hdrPad && sv390back.rad === sv390.rad && sv390back.usel === sv390.usel, `bg=${sv390back.bg} h=${sv390back.hdrH} pad=${sv390back.hdrPad}`);
t('SPF390-3 390 双向旋转 active 恒 true（R17 SP 在册语义 phone 档复证）', f390a.concat(f390b).every(f => f.active === true), `nAll=${f390a.length + f390b.length}`);
t('SPF390-3b 390 旋转帧产出画像 n≥5×2 段（仪器下限 SP-F-4 同款）', Math.min(f390a.length, f390b.length) >= 5, `n=[${f390a.length},${f390b.length}]`);
const spfExit = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('SPF390-4 390 档收场零挂死', spfExit === 'OK', String(spfExit));

// ============ SPH3B 组·增量③：390 档快照采样链叠加旋转同窗观测 B 类复核（R27 SP-H390 D 类留档直接 diff） ============
console.log('SPH3B 组 390 档快照采样链叠加旋转同窗观测（R27 D 类留档 diff）');
const sphOpen = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({
  appAId: 'calculator', appBId: 'notes',
  rectA: { left: 30, top: 120, width: 140, height: 110 },
  rectB: { left: 200, top: 120, width: 140, height: 110 },
  ratio: 0.5,
}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1300);
const sphPre = await paneSnap();
// 挂快照采样链采样器（R19 SP-C/R23 SP-H/R25 SP-H600/R27 SP-H390 同款：rAF 1000ms 窗）
await page.evaluate(() => {
  window.__visCost = []; window.__vf = [];
  let last = performance.now(); const t0 = last;
  const snap = () => {
    const t1 = performance.now();
    const panes = [...document.querySelectorAll('.split-pane')];
    const hdr = document.querySelector('.split-pane .app-header');
    const cs = panes[0] ? getComputedStyle(panes[0]) : null;
    const ch = hdr ? getComputedStyle(hdr) : null;
    window.__visBg = cs ? String(cs.backgroundColor) : null;
    window.__visH = ch ? String(ch.height) : null;
    window.__visPad = ch ? String(ch.padding) : null;
    window.__visCost.push(+(performance.now() - t1).toFixed(3));
  };
  const tick = (now) => {
    window.__vf.push(now - last); last = now;
    snap();
    if (now - t0 >= 1000) {
      const s = [...window.__vf].sort((a, b) => a - b);
      window.__visStat = { n: window.__vf.length, p95: +(s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)] || 0).toFixed(1), max: +s[s.length - 1].toFixed(1), snapN: window.__visCost.length, snapMax: +Math.max(...window.__visCost).toFixed(3), snapMean: +(window.__visCost.reduce((a, b) => a + b, 0) / window.__visCost.length).toFixed(3) };
    } else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await page.setViewportSize({ width: 844, height: 390 });
await sleep(1500);
const sphStat = await page.evaluate(() => window.__visStat);
const sphPost = await page.evaluate(() => ({ bg: window.__visBg, h: window.__visH, pad: window.__visPad }));
const ltVis = await takeLT();
t('SPH3B-0 390 档分屏重开前置（快照基准在场 axis=y）', sphOpen === 'OK' && sphPre.n === 2 && sphPre.axis === 'y' && sphPre.bg !== 'NO_PANE', `ret=${sphOpen} pre=${JSON.stringify(sphPre)}`);
t('SPH3B-1 单次视觉快照采样均耗≤5ms 且 max≤16.7（1 vsync 留档，R19 SP-C-1 档界原样；R27 SP-H390 留档 0.588-0.594ms 直接 diff）', sphStat && sphStat.snapMean <= 5 && sphStat.snapMax <= 16.7, `snapMax=${sphStat && sphStat.snapMax}ms snapMean=${sphStat && sphStat.snapMean}ms snapN=${sphStat && sphStat.snapN}`);
t('SPH3B-2 快照采样链叠加 390 档旋转重光栅 帧产出 P95≤416.8 且 n≥5', sphStat && sphStat.p95 <= 416.8 && sphStat.n >= 5, `p95=${sphStat && sphStat.p95} max=${sphStat && sphStat.max} n=${sphStat && sphStat.n}`);
t('SPH3B-3 采样期 longtask max≤500.2 留档（对齐 P-6/SP-C-3/SP-H-3/SPH390-3 判据）', ltVis.length === 0 || Math.max(...ltVis) <= 500.2, `lt=[${ltVis.slice(0, 6)}]`);
t('SPH3B-4 视觉快照跨旋转恒等（R18 SP-U/R19 SP-C-4/R22 SP-V/R26 SPV600/R27 SPH390 口径：bg/app-header height/padding 全等）', sphPre.bg === sphPost.bg && sphPre.hdrH === sphPost.h && sphPre.hdrPad === sphPost.pad, `pre=${JSON.stringify(sphPre)} post=${JSON.stringify(sphPost)}`);
const sphExit = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('SPH3B-5 采样链收场零挂死', sphExit === 'OK', String(sphExit));
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(700);

// ============ AA 组收尾：1024 档 tablet 形态（R13/R17/R21/R25 判据原样） ============
console.log('AA 组 tablet 形态收尾（1024 档）');
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(800);
const aa4b = await page.evaluate(async () => {
  const { openAllApps } = await import('/js/all-apps.js');
  openAllApps('r29-reopen');
  await new Promise(r => setTimeout(r, 1000));
  const ov = document.querySelector('.all-apps-overlay');
  return ov ? { form: ov.dataset.form, active: ov.classList.contains('active') } : { form: 'NO_OVERLAY' };
});
t('AA-4 resize 后重开重建为 tablet 形态', aa4b.form === 'tablet' && aa4b.active === true, `form=${aa4b.form} active=${aa4b.active}`);
await page.keyboard.press('Escape');
await sleep(1000);
const aa5 = await page.evaluate(() => ({ destroyed: !document.querySelector('.all-apps-overlay') }));
t('AA-5 tablet 关后销毁零残留（ephemeral）', aa5.destroyed === true, `destroyed=${aa5.destroyed}`);

// ============ T 组：taskbar-transient 阈值档位（R13/R17/R21/R25 判据原样） ============
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
await page.screenshot({ path: 'docs/sweep/s29-device-final.png' });
t('K-1 全程零 pageerror', errors.length === 0, errors.join(';').slice(0, 200));
await ctx.close();
await browser.close();
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
