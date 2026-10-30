// R22=C 类（UI 细节）巡查 e2e · v8.82（R18 后隔 3 轮回归；v8.78-81 连续零产品变更窗口）
// R21 遗留指向 verbatim：复验面 R10/R14 T 组 transient 弹簧打断（armed/单调/双向三段/ty≈(1-p)×117/
//   bg≈p/落定写死/app-launch/收起）+ A 组 AllApps 双形态打断（tablet sheet 三段/phone 抽屉/persistent
//   保留，R18 判据升级双通道先例继续适用）+ W 组 widget 排版一致性（padding 12px 14px/radius 22px/
//   cycleSpan 基准/字号锚）复验，增量重点 R19/R20/R21 新增面 UI 细节维度延伸（R18 SP-U/R20 S/R21 SV
//   视觉快照基准（三属性+无圆角）已四档全等在案可引用 + R21 SP-M 中间档逐帧几何 oobSum=0 可作 UI
//   细节「不破相」几何面基线引用）
// 本轮增量 SP-V 组：SP-U 视觉快照跨旋转恒等口径从 phone 档（390×844↔844×390，R18）延伸至 768 中间档
//   （768×1024↔1024×768，R21 SP-M 几何面已留档 oobSum=0，本轮补视觉快照面）+ 与 R21 SV-768 留档
//   基准（bg=rgb(248, 250, 252)/height=48px/padding=0px 16px/radius=0px）逐字比对
// 纪律传承：外域 route.abort；getComputedStyle 读后立即物化（R12 事实①）；armed 重试兜底（R11/R13）；
//   Esc 走 window.dispatchEvent（R18 校准，R12 事实③）；evaluate 内一律 new Promise(setTimeout)（R13 事实①）
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8100/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
// R18 校准：page.keyboard.press('Escape') 落点=当前 focus 元素，间歇漂移致 Esc 不到达 window handler——
// 统一走 window.dispatchEvent(KeyboardEvent)（R12 事实③：handler 挂 window keydown、untrusted 照常触发）
const esc = () => page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

// ============ P 组：前置锚（R12 事实④：桌面 45 / dock 7） ============
const p1 = await page.evaluate(() => ({
  icons: document.querySelectorAll('.icon-box').length,
  dock: document.querySelectorAll('.dock-app-icon').length,
  wb: !!window.__widgetBoard,
}));
t('P-1a 桌面图标 45（.icon-box）', p1.icons === 45, `icons=${p1.icons}`);
t('P-1b dock 7（.dock-app-icon）', p1.dock === 7, `dock=${p1.dock}`);
t('P-1c __widgetBoard API 在场', p1.wb === true, `wb=${p1.wb}`);

const gridDump = await page.evaluate(() => {
  const pg = document.querySelector('.page-grid');
  if (!pg) return null;
  const cs = getComputedStyle(pg);
  return { cols: cs.gridTemplateColumns.split(' ').length, rows: cs.gridTemplateRows.split(' ').length };
});
console.log(`  [dump] 网格 ${JSON.stringify(gridDump)}`);

// ============ W 组：widget 排版一致性（1024×768 先行，R14 判据原样） ============
console.log('W 组 widget 排版一致性（1024×768）');
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(600);

const placed = await page.evaluate(async () => {
  const WB = window.__widgetBoard;
  const r = {};
  // 1024×768 网格 6×4：第 1 页图标 24/24 满员——battery 2×1 落第 2 页（firstFreeSlot 在册语义）；
  // shortcuts 1×1 系变体规格表不含（在册 null，R10 事实④），detail 记录不判 FAIL
  if (!WB.list().some(x => x.kind === 'battery')) r.battery = !!WB.place('battery');
  if (!r.battery) r.battery = WB.list().some(x => x.kind === 'battery');
  r.shortcuts11 = WB.place('shortcuts', 1, 1);
  return r;
});
await sleep(700);
t('W-1 battery 2×1 place（shortcuts 1×1 在册 null）', placed.battery === true, JSON.stringify(placed));

const typography = await page.evaluate(() => {
  return [...document.querySelectorAll('.widget-card')].map(el => {
    const inner = el.querySelector('.widget-inner');
    const ips = inner ? getComputedStyle(inner).padding : null;
    const rad = getComputedStyle(el).borderRadius;
    return { kind: (el.className.match(/wb-[\w-]+/) || ['?'])[0], ips, rad };
  });
});
t('W-2 .widget-inner padding 跨 kind 恒定 12px 14px', typography.length >= 1 && typography.every(x => x.ips === '12px 14px'), JSON.stringify(typography.map(x => `${x.kind}:${x.ips}`)));
t('W-3 .widget-card border-radius 恒定 22px', typography.length >= 1 && typography.every(x => x.rad === '22px'), JSON.stringify(typography.map(x => `${x.kind}:${x.rad}`)));

const cyc = await page.evaluate(() => {
  const WB = window.__widgetBoard;
  const l = WB.list();
  if (!l.length) return null;
  const tgt = l.find(x => x.kind === 'battery') || l[0];
  const res = WB.resize(tgt.id);
  return res ? { w: res.w, h: res.h, id: tgt.id } : 'NO-NEXT';
});
await sleep(600);
const typography2 = await page.evaluate(() => {
  return [...document.querySelectorAll('.widget-card')].map(el => {
    const inner = el.querySelector('.widget-inner');
    return { ips: inner ? getComputedStyle(inner).padding : null, rad: getComputedStyle(el).borderRadius };
  });
});
t('W-4 cycleSpan 后排版基准不变（padding/radius）', cyc !== null && typography2.every(x => x.ips === '12px 14px' && x.rad === '22px'), `cyc=${JSON.stringify(cyc)} [${typography2.map(x => `${x.ips}/${x.rad}`).join(',')}]`);

const pageGeo = () => page.evaluate(() => {
  const pages = [...document.querySelectorAll('.page-grid')];
  const out = [];
  for (const pg of pages) {
    for (const el of pg.querySelectorAll('.widget-card')) {
      const b = el.getBoundingClientRect();
      const hb = pg.getBoundingClientRect();
      out.push({ page: pg.dataset.page, x: +(b.left - hb.left).toFixed(1), y: +(b.top - hb.top).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) });
    }
  }
  return out;
});
const deepPage = await page.evaluate(() => {
  const l = window.__widgetBoard.list();
  return l.length ? Math.max(...l.map(x => x.page || 0)) : 0;
});
if (deepPage >= 1) {
  await page.evaluate((p) => import('/js/desktop.js').then(m => m.switchDesktopPage(p, false)), deepPage);
  await sleep(500);
  const geoA = await pageGeo();
  await page.evaluate(() => import('/js/desktop.js').then(m => m.switchDesktopPage(0, false)));
  await sleep(400);
  await page.evaluate((p) => import('/js/desktop.js').then(m => m.switchDesktopPage(p, false)), deepPage);
  await sleep(500);
  const geoB = await pageGeo();
  const key = o => `${o.page}:${o.x},${o.y},${o.w}x${o.h}`;
  const aSet = geoA.map(key).sort().join('|');
  const bSet = geoB.map(key).sort().join('|');
  t('W-5 切页往返 widget 几何一致（1024 档恒可见）', geoA.length >= 1 && aSet === bSet, `A=[${aSet}] B=[${bSet}]`);
} else {
  t('W-5 切页往返 widget 几何一致', false, `deepPage=${deepPage}（前置不足）`);
}

// ============ T 组：transient 弹簧打断中间帧（平板档 1024×768，R14 判据原样） ============
console.log('T 组 transient taskbar 弹簧打断');
const appOpened = await page.evaluate(async () => {
  const { initialApps } = await import('/js/apps-data.js');
  const { openApp } = await import('/js/app-window.js');
  const idx = initialApps.findIndex(a => a.id === 'calculator');
  if (idx === -1) return 'NO-APP';
  openApp(idx);
  return 'OK';
});
await sleep(5600);
let armed = await page.evaluate(() => import('/js/taskbar-transient.js').then(m => m.__transientTestHooks().armed));
for (let i = 0; i < 3 && !armed; i++) { await sleep(1500); armed = await page.evaluate(() => import('/js/taskbar-transient.js').then(m => m.__transientTestHooks().armed)); }
const ctxDump = armed ? '' : await page.evaluate(() => import('/js/taskbar-transient.js').then(m => JSON.stringify(m.__transientTestHooks().context())));
t('T-0 armed 前提成立（app 全屏 + 常驻栏收纳）', armed === true, `open=${appOpened}${armed ? '' : ' ctx=' + ctxDump}`);
t('T-0b __state.isOpen 前置', await page.evaluate(() => window.__state && window.__state.isOpen === true), '');

const springRun = (opts) => page.evaluate(async ({ start, interrupt, reopen }) => {
  const M = await import('/js/taskbar-transient.js');
  const hooks = M.__transientTestHooks();
  const TB = await import('/js/taskbar-core.js');
  const TT = await import('/js/taskbar-transient.js');
  // HIDE 同源：TRANSIENT_BAR_HEIGHT(icon 57+2×12 padding=81)+bottom margin 24+12=117（CSS 收起位同值互证）
  const HIDE = TT.TRANSIENT_BAR_HEIGHT + TB.TRANSIENT_TASKBAR_BOTTOM_MARGIN + 12;
  const bar = document.querySelector('.tbt-bar');
  const out = [];
  const marks = [];
  let phase = 0;
  const t0 = performance.now();
  if (start === 'open') M.openTransient('test');
  if (start === 'stash') M.stashTransient('test');
  await new Promise((resolve) => {
    const step = () => {
      const now = performance.now();
      const p = hooks.springP;
      const tr = bar ? getComputedStyle(bar).transform : 'none';
      let ty = null;
      if (tr && tr !== 'none') {
        const m = tr.match(/matrix\((.+)\)/);
        if (m) { const v = m[1].split(',').map(parseFloat); ty = v.length === 6 ? v[5] : v[13]; }
      }
      const bgRaw = bar ? bar.style.getPropertyValue('--tbt-bg-alpha') : '';
      out.push({ t: +(now - t0).toFixed(1), p: +p.toFixed(4), ty: ty === null ? null : +ty.toFixed(2), bg: bgRaw === '' ? null : parseFloat(bgRaw) });
      if (interrupt === 'stash' && phase === 0 && p >= 0.25) { phase = 1; M.stashTransient('test-interrupt'); marks.push({ ev: 'stash@0.25', t: +(now - t0).toFixed(1), p: +p.toFixed(4) }); }
      else if (reopen === 'open' && phase === 1 && p <= 0.55) { phase = 2; M.openTransient('test-reopen'); marks.push({ ev: 'reopen@0.55', t: +(now - t0).toFixed(1), p: +p.toFixed(4) }); }
      const settled = hooks.springTarget < 0.5 ? p <= 0.005 : p >= 0.995;
      const done = interrupt || reopen ? phase >= (reopen ? 2 : 1) : true;
      if ((now - t0 > 4000) || (settled && done)) { resolve(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return { out, marks, HIDE, finalP: +hooks.springP.toFixed(4), target: hooks.springTarget, openAttr: hooks.el.getAttribute('data-open'), openFlag: hooks.openFlag };
}, opts);

const maxJump = (arr) => { let m = 0; for (let i = 1; i < arr.length; i++) m = Math.max(m, Math.abs(arr[i] - arr[i - 1])); return +m.toFixed(4); };

await page.evaluate(() => import('/js/taskbar-transient.js').then(m => m.stashTransient('test-reset')));
await sleep(900);
const r1 = await springRun({ start: 'open', interrupt: null, reopen: null });
const pSeq1 = r1.out.map(s => s.p);
t('T-1 纯展开单调不减且收敛', pSeq1.length >= 5 && pSeq1.every((v, i) => i === 0 || v >= pSeq1[i - 1] - 1e-6) && r1.finalP >= 0.995, `n=${pSeq1.length} final=${r1.finalP}`);

await page.evaluate(() => import('/js/taskbar-transient.js').then(m => m.stashTransient('test-reset')));
await sleep(900);
const r2 = await springRun({ start: 'open', interrupt: 'stash', reopen: 'open' });
const pSeq2 = r2.out.map(s => s.p);
const rises = pSeq2.some((v, i) => i > 0 && v - pSeq2[i - 1] > 0.005);
const falls = pSeq2.some((v, i) => i > 0 && v - pSeq2[i - 1] < -0.005);
t('T-2 双向打断三段在场（升/降/升）', r2.marks.length === 2 && rises && falls, `marks=${JSON.stringify(r2.marks)} rises=${rises} falls=${falls}`);
t('T-2b 打断中间帧 maxJump ≤ 0.30（无跳变）', maxJump(pSeq2) <= 0.30, `maxJump=${maxJump(pSeq2)} n=${pSeq2.length}`);
t('T-2c 打断终态收敛展开', r2.finalP >= 0.995 && r2.openAttr === '1', `final=${r2.finalP} attr=${r2.openAttr}`);

const settlePin = (p) => p >= 0.995 ? 1 : (p <= 0.005 ? 0 : null);
const visBad = r2.out.filter((s, i) => {
  if (s.ty === null) return false;
  const pin = settlePin(s.p);
  if (pin !== null) return Math.abs(s.ty - (1 - pin) * r2.HIDE) > 0.5;
  const cur = Math.abs(s.ty - (1 - s.p) * r2.HIDE);
  const prev = i > 0 ? Math.abs(s.ty - (1 - r2.out[i - 1].p) * r2.HIDE) : cur;
  return Math.min(cur, prev) > 1.5;
});
const bgBad = r2.out.filter((s, i) => {
  if (s.bg === null) return false;
  const pin = settlePin(s.p);
  if (pin !== null) return Math.abs(s.bg - pin) > 0.02;
  const cur = Math.abs(s.bg - s.p);
  const prev = i > 0 ? Math.abs(s.bg - r2.out[i - 1].p) : cur;
  return Math.min(cur, prev) > 0.04;
});
t('T-4a bar translateY 与弹簧进度公式一致（帧滞后容差）±1.5px', visBad.length === 0, visBad.length ? JSON.stringify(visBad.slice(0, 3)) : `n=${r2.out.length} HIDE=${r2.HIDE}`);
t('T-4b --tbt-bg-alpha 与进度一致（帧滞后容差）±0.04', bgBad.length === 0, bgBad.length ? JSON.stringify(bgBad.slice(0, 3)) : `n=${r2.out.length}`);

await sleep(400);
const r5 = await page.evaluate(() => {
  return import('/js/taskbar-transient.js').then(async m => {
    const h = m.__transientTestHooks();
    const p1 = h.springP;
    const bar = document.querySelector('.tbt-bar');
    const tr = bar ? getComputedStyle(bar).transform : 'none';
    let ty = null;
    if (tr !== 'none') { const mm = tr.match(/matrix\((.+)\)/); if (mm) { const v = mm[1].split(',').map(parseFloat); ty = v.length === 6 ? v[5] : v[13]; } }
    await new Promise(r => setTimeout(r, 350));
    return { p1: +p1.toFixed(4), p2: +h.springP.toFixed(4), ty: ty === null ? null : +ty.toFixed(2) };
  });
});
t('T-5 落定写死：p 恒定 + 展开位 ty=0', r5.p1 === r5.p2 && r5.p1 >= 0.995 && r5.ty !== null && Math.abs(r5.ty) <= 0.5, JSON.stringify(r5));

const iconClicked = await page.evaluate(() => {
  const bar = document.querySelector('.tbt-bar');
  const btn = bar && bar.querySelector('.tbt-icon');
  if (!btn) return 'NO-ICON';
  btn.click();
  return btn.getAttribute('data-id');
});
const t6read = () => page.evaluate(async () => {
  const h = await import('/js/taskbar-transient.js').then(m => m.__transientTestHooks());
  return { openAttr: h.el.getAttribute('data-open'), p: +h.springP.toFixed(4), isOpen: window.__state.isOpen };
});
await sleep(900);
let t6 = await t6read();
let t6tries = 0;
// R14 二跑校准：弹簧收尾尾巴在光栅档下落定后移——重试 ≤3×600ms 兜底（R13 事实③同款）
while (t6.openAttr === '0' && t6.isOpen === true && t6.p > 0.005 && t6tries < 3) { await sleep(600); t6 = await t6read(); t6tries++; }
t('T-6 app-launch 链：栏收 + 窗开', iconClicked !== 'NO-ICON' && t6.openAttr === '0' && t6.p <= 0.005 && t6.isOpen === true, `icon=${iconClicked} attr=${t6.openAttr} p=${t6.p} isOpen=${t6.isOpen} retries=${t6tries}`);

await page.evaluate(() => import('/js/taskbar-transient.js').then(m => m.openTransient('test')));
await sleep(1100);
const r7 = await springRun({ start: 'stash', interrupt: null, reopen: null });
const pSeq7 = r7.out.map(s => s.p);
t('T-7 纯收起单调收敛（maxJump ≤ 0.30）', pSeq7.length >= 5 && maxJump(pSeq7) <= 0.30 && r7.finalP <= 0.005 && r7.openAttr === '0', `n=${pSeq7.length} final=${r7.finalP} maxJump=${maxJump(pSeq7)}`);

await esc();
await sleep(900);

// ============ A 组：AllApps tablet 打断（267ms sheet，R18 双通道判据） ============
console.log('A 组 AllApps 打断（tablet bottom sheet）');
// R14/R18 校准：AllApps scrim blur(20px) 系 R11 N-4 归档光栅贵档 ~116-233ms/帧——
// 分段 IPC 采样窗加宽（去前置 sleep，evaluate 往返本身提供动画偏移）；close 段双通道判据（R18 校准）
const sheetSample = (ms) => page.evaluate(async ({ ms }) => {
  const out = [];
  const t0 = performance.now();
  await new Promise((resolve) => {
    const step = () => {
      const now = performance.now();
      const ov = document.querySelector('.all-apps-overlay') || document.getElementById('allAppsOverlay');
      const sheet = ov && ov.querySelector('.aa-sheet');
      let ty = null, op = null;
      if (sheet) {
        const cs = getComputedStyle(sheet);
        const m = cs.transform.match(/matrix\((.+)\)/);
        if (m) { const v = m[1].split(',').map(parseFloat); ty = v.length === 6 ? v[5] : v[13]; }
        op = parseFloat(cs.opacity);
      }
      out.push({ t: +(now - t0).toFixed(1), ty: ty === null ? null : +ty.toFixed(1), op: op === null || Number.isNaN(op) ? null : +op.toFixed(3), present: !!sheet, cls: ov ? ov.classList.contains('active') : null, ovIn: !!ov });
      if (now - t0 > ms) { resolve(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return out;
}, { ms });

await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep')));
const openSeg = await sheetSample(1000);
await esc();
let closeSeg = await sheetSample(1000);
// R18 校准：close 段双通道兜底——全零且 overlay 仍 active 时重发 Esc + 重采样一次
const closeAllZero = closeSeg.filter(s => s.ty !== null).length > 0 && closeSeg.filter(s => s.ty !== null).every(s => s.ty === 0);
const ovStillActive = await page.evaluate(() => {
  const ov = document.querySelector('.all-apps-overlay') || document.getElementById('allAppsOverlay');
  return !!(ov && ov.classList.contains('active'));
});
if (closeAllZero && ovStillActive) {
  await esc();
  closeSeg = await sheetSample(1000);
}
await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep')));
const reopenSeg = await sheetSample(800);

const ovForm = await page.evaluate(() => {
  const ov = document.querySelector('.all-apps-overlay') || document.getElementById('allAppsOverlay');
  return ov ? { form: ov.getAttribute('data-form'), active: ov.classList.contains('active') } : null;
});
t('A-1 tablet 形态在册（data-form=tablet）', !!ovForm && ovForm.form === 'tablet', JSON.stringify(ovForm));
const openTy = openSeg.filter(s => s.ty !== null).map(s => s.ty);
const closeTy = closeSeg.filter(s => s.ty !== null).map(s => s.ty);
const reTy = reopenSeg.filter(s => s.ty !== null).map(s => s.ty);
t('A-2 开场段 ty 下降（sheet 上滑入场）', openTy.length >= 4 && openTy[openTy.length - 1] < openTy[0], `[${openTy.slice(0, 3)}…${openTy.slice(-2)}]`);
// A-3 双通道（R18 校准判据）：ty 上升（动画可观测时）OR class 移除+段内拆除（R13 在册关闭语义）；
// 真实「Esc 未关」（class 恒 true+overlay 恒在场+ty 恒 0）仍 FAIL
const closeClsOff = closeSeg.some(s => s.cls === false);
const closeGone = closeSeg.length > 0 && closeSeg[closeSeg.length - 1].ovIn === false;
t('A-3 Esc 打断后关闭段转向在场（ty 上升 或 class 移除+拆除）', (closeTy.length >= 3 && closeTy[closeTy.length - 1] > closeTy[0]) || (closeClsOff && closeGone), `ty=[${closeTy.slice(0, 3)}…${closeTy.slice(-2)}] clsOff=${closeClsOff} gone=${closeGone}`);
t('A-4 重开终态 ty≈0 + active', reTy.length >= 3 && Math.abs(reTy[reTy.length - 1]) <= 1 && ovForm && ovForm.active, `last=${reTy[reTy.length - 1]} n=${reTy.length}`);
const vh768 = 768;
const segJump = (arr) => { let m = 0; for (let i = 1; i < arr.length; i++) m = Math.max(m, Math.abs(arr[i] - arr[i - 1])); return +m.toFixed(1); };
const steady = (arr) => arr.slice(2);
// R14 二跑校准：光栅档下 267ms 过渡最多跨 1-2 采样间隙——打断转折点在稀疏帧下呈单帧方向性追赶跳变；
// 判据升级：每段豁免 ≤2 个与段落运动方向一致的过渡追赶帧，其余稳态 maxJump ≤ 0.25×vh 不变
const steadyMaxDir = (vals, dir) => {
  const js = [];
  for (let i = 1; i < vals.length; i++) js.push(vals[i] - vals[i - 1]);
  const isDir = d => dir > 0 ? d > 0 : d < 0;
  const directional = js.filter(d => isDir(d)).sort((a, b) => Math.abs(b) - Math.abs(a)).slice(2);
  const rest = js.filter(d => !isDir(d));
  const all = [...directional, ...rest];
  return all.length ? +Math.max(...all.map(d => Math.abs(d))).toFixed(1) : 0;
};
const lim = vh768 * 0.25;
t('A-5 稳态段 maxJump ≤ 0.25×vh（转折点/重建首帧/方向性追赶帧除外）', steadyMaxDir(steady(openTy), -1) <= lim && steadyMaxDir(steady(closeTy), +1) <= lim && steadyMaxDir(steady(reTy), -1) <= lim, `open=${steadyMaxDir(steady(openTy), -1)} close=${steadyMaxDir(steady(closeTy), +1)} re=${steadyMaxDir(steady(reTy), -1)} raw=[${segJump(openTy)},${segJump(closeTy)},${segJump(reTy)}] lim=${+lim.toFixed(1)}`);

// ============ AA 组：跨断点重建后 sheet UI 细节与首开一致性（R14 判据原样） ============
console.log('AA 组 跨断点重建后 sheet 几何/圆角/留白一致性');
const sheetSnap = () => page.evaluate(() => {
  const ov = document.querySelector('.all-apps-overlay') || document.getElementById('allAppsOverlay');
  if (!ov || !ov.classList.contains('active')) return { absent: true };
  const sheet = ov.querySelector('.aa-sheet');
  if (!sheet) return { absent: true, ovYes: true };
  const cs = getComputedStyle(sheet);
  const r = sheet.getBoundingClientRect();
  const scrim = ov.querySelector('.aa-scrim');
  return {
    absent: false, form: ov.getAttribute('data-form'),
    x: +r.left.toFixed(1), y: +r.top.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
    rad: cs.borderRadius, pad: cs.padding,
    scrimBf: scrim ? (getComputedStyle(scrim).backdropFilter || getComputedStyle(scrim).webkitBackdropFilter || 'none') : 'NO_SCRIM',
  };
});

await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep')));
await sleep(600);
const snap1 = await sheetSnap();
t('AA-1 tablet 重建基准快照在场（form=tablet active）', snap1 && !snap1.absent && snap1.form === 'tablet', JSON.stringify(snap1));
await esc();
await sleep(900);

await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep')));
await sleep(400);
await page.setViewportSize({ width: 390, height: 844 });
await sleep(700);
const aaCross = await page.evaluate(() => {
  const ov = document.querySelector('.all-apps-overlay') || document.getElementById('allAppsOverlay');
  return { present: !!ov, active: ov ? ov.classList.contains('active') : false, sheet: !!(ov && ov.querySelector('.aa-sheet')) };
});
t('AA-2 开启态跨断点 resize：立即关闭+销毁 DOM（在册语义）', aaCross.present === false || (!aaCross.active && !aaCross.sheet), JSON.stringify(aaCross));

await page.setViewportSize({ width: 1024, height: 768 });
await sleep(700);
await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep')));
await sleep(600);
const snap2 = await sheetSnap();
t('AA-3 跨断点销毁后重开重建 form=tablet active', snap2 && !snap2.absent && snap2.form === 'tablet' && snap2.w > 0, JSON.stringify(snap2));
const geoEq = snap1 && snap2 && !snap1.absent && !snap2.absent &&
  Math.abs(snap1.x - snap2.x) <= 1 && Math.abs(snap1.y - snap2.y) <= 1 &&
  Math.abs(snap1.w - snap2.w) <= 1 && Math.abs(snap1.h - snap2.h) <= 1;
t('AA-4 重建后 sheet 几何与首开一致（±1px）', geoEq, `snap1=[${snap1.absent ? '-' : `${snap1.x},${snap1.y},${snap1.w}x${snap1.h}`}] snap2=[${snap2.absent ? '-' : `${snap2.x},${snap2.y},${snap2.w}x${snap2.h}`}]`);
t('AA-5 重建后圆角/留白/scrim backdrop-filter 与首开恒定', geoEq && snap1.rad === snap2.rad && snap1.pad === snap2.pad && snap1.scrimBf === snap2.scrimBf, `rad=[${snap1.rad}|${snap2.rad}] pad=[${snap1.pad}|${snap2.pad}] bf=[${snap1.scrimBf}|${snap2.scrimBf}]`);
await esc();
await sleep(900);

// ============ S 组：split 旋转中间帧几何不越视口（R14 判据原样） ============
console.log('S 组 split 旋转中间帧不越视口（1024×768 起步）');
const splitOpened = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({
  appAId: 'calculator', appBId: 'notes',
  rectA: { left: 300, top: 200, width: 220, height: 160 },
  rectB: { left: 700, top: 200, width: 220, height: 160 },
  ratio: 0.5,
}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1500);
const info0 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
t('S-1 分屏开启（1024×768 axis=x）', splitOpened === 'OK' && !!info0 && info0.active === true && info0.axis === 'x', `ret=${splitOpened} info=${JSON.stringify(info0).slice(0, 160)}`);

const splitFrames = (ms) => page.evaluate(async ({ ms }) => {
  const frames = [];
  const t0 = performance.now();
  await new Promise((resolve) => {
    const step = () => {
      const now = performance.now();
      const vw = window.innerWidth, vh = window.innerHeight;
      const info = window.__splitInfo && window.__splitInfo();
      const els = [...document.querySelectorAll('[class*=split]')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2;
      }).map(el => {
        const r = el.getBoundingClientRect();
        return { l: +r.left.toFixed(1), t: +r.top.toFixed(1), rgt: +r.right.toFixed(1), b: +r.bottom.toFixed(1) };
      });
      frames.push({ vw, vh, axis: info ? info.axis : null, active: info ? !!info.active : null, n: els.length, els });
      if (now - t0 > ms) { resolve(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return frames;
}, { ms });

const ROT_SEQ = [900, 675, 900, 675];
const rotResults = [];
for (const w of ROT_SEQ) {
  await page.setViewportSize({ width: w, height: 768 });
  const frames = await splitFrames(800);
  const expAxis = w >= 768 ? 'x' : 'y';
  const badAxis = frames.filter(f => f.axis !== expAxis).length;
  const oobFrames = frames.filter(f => f.els.some(e => e.l < -1 || e.t < -1 || e.rgt > f.vw + 1 || e.b > f.vh + 1));
  const activeAll = frames.every(f => f.active === true);
  t(`S-${w}a 旋转中间帧 axis 全程=${expAxis}（${w}×768→w${w >= 768 ? '≥' : '<'}h 档位）`, frames.length >= 2 && badAxis === 0, `n=${frames.length} badAxis=${badAxis} final=${JSON.stringify(frames[frames.length - 1] && frames[frames.length - 1].axis)}`);
  t(`S-${w}b 旋转中间帧 split 元素不越视口（横纵双向 ±1px）`, frames.length >= 2 && oobFrames.length === 0, `n=${frames.length} oob=${oobFrames.length}${oobFrames.length ? ' ' + JSON.stringify(oobFrames[0]).slice(0, 200) : ''}`);
  t(`S-${w}c 旋转全程会话在场（active 恒 true）`, activeAll, `n=${frames.length}`);
  rotResults.push({ w, frames: frames.length, oob: oobFrames.length, badAxis });
  await sleep(500);
}
console.log('  [dump] 旋转序列:', rotResults.map(r => `${r.w}:n=${r.frames} oob=${r.oob} badAxis=${r.badAxis}`).join(' '));

const exited = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('S-2 分屏收场零挂死', exited === 'OK', String(exited));
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(500);

// ============ SP-U 组：phone 档旋转的 UI 细节面（R18 判据原样） ============
console.log('SP-U 组 phone 档旋转 UI 细节（视觉属性快照跨旋转恒定）');
// .split-pane 无圆角（surface 直角分区式，split-screen.css:50）——「不破相」断言面=视觉属性快照
// （pane backgroundColor + .app-header height/padding）跨旋转恒等，几何面已由逐帧口径覆盖
await page.setViewportSize({ width: 390, height: 844 });
await sleep(700);
const spuOpen = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({
  appAId: 'calculator', appBId: 'notes',
  rectA: { left: 30, top: 120, width: 140, height: 110 },
  rectB: { left: 200, top: 120, width: 140, height: 110 },
  ratio: 0.5,
}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1300);
const paneSnap = () => page.evaluate(() => {
  const panes = [...document.querySelectorAll('.split-pane')];
  const hdr = document.querySelector('.split-pane .app-header');
  const info = window.__splitInfo && window.__splitInfo();
  return {
    n: panes.length, axis: info ? info.axis : null, active: info ? !!info.active : null,
    bg: panes[0] ? getComputedStyle(panes[0]).backgroundColor : 'NO_PANE',
    hdrH: hdr ? getComputedStyle(hdr).height : null,
    hdrPad: hdr ? getComputedStyle(hdr).padding : null,
  };
});
const spuA = await paneSnap();
t('SP-U-1 phone 档 pane 基准快照在场（n=2 axis=y）', spuOpen === 'OK' && spuA.n === 2 && spuA.axis === 'y' && spuA.bg !== 'NO_PANE', JSON.stringify(spuA));
await page.setViewportSize({ width: 844, height: 390 });
await sleep(1100);
const spuB = await paneSnap();
t('SP-U-2 旋转→844×390 视觉属性恒定 + 末态 axis=x', spuB.axis === 'x' && spuB.bg === spuA.bg && (spuA.hdrH === null || spuB.hdrH === spuA.hdrH) && (spuA.hdrPad === null || spuB.hdrPad === spuA.hdrPad), `A=${JSON.stringify(spuA)} B=${JSON.stringify(spuB)}`);
await page.setViewportSize({ width: 390, height: 844 });
await sleep(1100);
const spuC = await paneSnap();
t('SP-U-3 旋回 390×844 视觉属性与基准全等 + axis=y', spuC.axis === 'y' && spuC.bg === spuA.bg && (spuA.hdrH === null || spuC.hdrH === spuA.hdrH) && (spuA.hdrPad === null || spuC.hdrPad === spuA.hdrPad), JSON.stringify(spuC));
const spuExit = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('SP-U-4 收场零挂死', spuExit === 'OK', String(spuExit));
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(500);

// ============ SP-V 组·本轮增量：768 中间档旋转的 UI 细节面（R21 指向） ============
console.log('SP-V 组 768 中间档旋转 UI 细节（SP-U 口径延伸至中间档）');
// R21 留档：SP-M 768 旋转逐帧几何 oobSum=0（几何面）+ SV-768 静态三属性全等（bg=rgb(248, 250, 252)/
// rad=0px/h=48px/pad=0px 16px）——本轮补「视觉快照跨旋转恒等」面并与留档基准逐字比对
await page.setViewportSize({ width: 768, height: 1024 });
await sleep(700);
const spvOpen = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({
  appAId: 'calculator', appBId: 'notes',
  rectA: { left: 60, top: 160, width: 200, height: 140 },
  rectB: { left: 420, top: 160, width: 200, height: 140 },
  ratio: 0.5,
}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1300);
const spvA = await paneSnap();
t('SP-V-1 768 档 pane 基准快照在场+R21 SV-768 留档基准逐字比对（n=2 axis=y bg=rgb(248, 250, 252)）', spvOpen === 'OK' && spvA.n === 2 && spvA.axis === 'y' && spvA.bg === 'rgb(248, 250, 252)', JSON.stringify(spvA));
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(1100);
const spvB = await paneSnap();
t('SP-V-2 旋转→1024×768 视觉属性恒定 + 末态 axis=x', spvB.axis === 'x' && spvB.bg === spvA.bg && (spvA.hdrH === null || spvB.hdrH === spvA.hdrH) && (spvA.hdrPad === null || spvB.hdrPad === spvA.hdrPad), `A=${JSON.stringify(spvA)} B=${JSON.stringify(spvB)}`);
await page.setViewportSize({ width: 768, height: 1024 });
await sleep(1100);
const spvC = await paneSnap();
t('SP-V-3 旋回 768×1024 视觉属性与基准全等 + axis=y', spvC.axis === 'y' && spvC.bg === spvA.bg && (spvA.hdrH === null || spvC.hdrH === spvA.hdrH) && (spvA.hdrPad === null || spvC.hdrPad === spvA.hdrPad), JSON.stringify(spvC));
const spvExit = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('SP-V-4 收场零挂死', spvExit === 'OK', String(spvExit));
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(500);

// ============ A 组 phone 打断 + AA 组 phone persistent 一致性 + W 组窄屏（390×844） ============
console.log('A 组 phone 抽屉打断 + AA phone persistent + W 组窄屏（390×844）');
await page.setViewportSize({ width: 390, height: 844 });
await sleep(700);

await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep')));
const phOpen = await sheetSample(600);
await esc();
const phClose = await sheetSample(800);
await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep')));
const phRe = await sheetSample(1000);
const phForm = await page.evaluate(() => {
  const ov = document.querySelector('.all-apps-overlay') || document.getElementById('allAppsOverlay');
  const sheet = ov && ov.querySelector('.aa-sheet');
  return { form: ov ? ov.getAttribute('data-form') : null, active: ov ? ov.classList.contains('active') : false, sheetPresent: !!sheet };
});
t('A-7 phone 形态在册（data-form=phone）', phForm.form === 'phone' && phForm.active, JSON.stringify(phForm));
const phOpenTy = phOpen.filter(s => s.ty !== null).map(s => s.ty);
const phCloseTy = phClose.filter(s => s.ty !== null).map(s => s.ty);
t('A-8 phone 打断转向（开场降/关闭升）', phOpenTy.length >= 4 && phCloseTy.length >= 4 && phOpenTy[phOpenTy.length - 1] < phOpenTy[0] && phCloseTy[phCloseTy.length - 1] > phCloseTy[0], `open[${phOpenTy.slice(0, 2)}…${phOpenTy.slice(-1)}] close[${phCloseTy.slice(0, 2)}…${phCloseTy.slice(-1)}]`);
const phOp = phRe.filter(s => s.op !== null).map(s => s.op);
t('A-9 phone 重开终态 opacity=1', phOp.length >= 4 && Math.abs(phOp[phOp.length - 1] - 1) <= 0.01, `last=${phOp[phOp.length - 1]} n=${phOp.length}`);

const snapP1 = await sheetSnap();
await esc();
await sleep(900);
const per = await page.evaluate(() => {
  const ov = document.querySelector('.all-apps-overlay') || document.getElementById('allAppsOverlay');
  return { ovPresent: !!ov, sheetPresent: !!(ov && ov.querySelector('.aa-sheet')), active: ov ? ov.classList.contains('active') : false };
});
t('A-10 phone persistent：关闭后 DOM 保留', per.ovPresent && per.sheetPresent && !per.active, JSON.stringify(per));
await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep')));
await sleep(800);
const snapP2 = await sheetSnap();
t('AA-6 phone persistent 重开 form=phone active', snapP2 && !snapP2.absent && snapP2.form === 'phone' && snapP2.w > 0, JSON.stringify(snapP2));
const geoEqP = snapP1 && snapP2 && !snapP1.absent && !snapP2.absent &&
  Math.abs(snapP1.x - snapP2.x) <= 1 && Math.abs(snapP1.y - snapP2.y) <= 1 &&
  Math.abs(snapP1.w - snapP2.w) <= 1 && Math.abs(snapP1.h - snapP2.h) <= 1 &&
  snapP1.rad === snapP2.rad && snapP1.pad === snapP2.pad && snapP1.scrimBf === snapP2.scrimBf;
t('AA-7 phone 重开 sheet 几何/圆角/留白与首开一致（±1px）', geoEqP, `p1=[${snapP1.absent ? '-' : `${snapP1.x},${snapP1.y},${snapP1.w}x${snapP1.h}/${snapP1.rad}/${snapP1.pad}`}] p2=[${snapP2.absent ? '-' : `${snapP2.x},${snapP2.y},${snapP2.w}x${snapP2.h}/${snapP2.rad}/${snapP2.pad}`}]`);
await esc();
await sleep(700);

// W 组窄屏
const fs390 = await page.evaluate(() => {
  const c = document.querySelector('.widget-card .wb-battery-level');
  return c ? getComputedStyle(c).fontSize : null;
});
t('W-6 battery level 字号 24px @390 档', fs390 === '24px', `fs=${fs390}`);

const wList = await page.evaluate(() => window.__widgetBoard.list().map(x => ({ kind: x.kind, page: x.page })));
const deep390 = wList.length ? Math.max(...wList.map(x => x.page || 0)) : 0;
if (deep390 >= 1) {
  await page.evaluate((p) => import('/js/desktop.js').then(m => m.switchDesktopPage(p, false)), deep390);
  await sleep(500);
  const geoA = await pageGeo();
  await page.evaluate(() => import('/js/desktop.js').then(m => m.switchDesktopPage(0, false)));
  await sleep(500);
  const offCount = await page.evaluate((p) => {
    let n = 0;
    document.querySelectorAll('.page-grid').forEach(pg => { if (pg.dataset.page !== String(p)) n += pg.querySelectorAll('.widget-card').length; });
    return n;
  }, deep390);
  await page.evaluate((p) => import('/js/desktop.js').then(m => m.switchDesktopPage(p, false)), deep390);
  await sleep(500);
  const geoB = await pageGeo();
  const key = o => `${o.x},${o.y},${o.w}x${o.h}`;
  const aSet = geoA.map(key).sort().join('|');
  const bSet = geoB.map(key).sort().join('|');
  t('W-8 390 档非当前页 widget-card 不在 DOM（按页重建）', offCount === 0, `offCount=${offCount}`);
  t('W-9 390 档切回重建几何一致', geoA.length >= 1 && aSet === bSet, `A=[${aSet}] B=[${bSet}]`);
} else {
  t('W-8 390 档非当前页 widget-card 不在 DOM', false, `deep390=${deep390}（前置不足）`);
  t('W-9 390 档切回重建几何一致', false, 'skip');
}

// W-6b 字号跨档恒定（切回 1024 复测）+ W-10 清理零残留
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(500);
const fs1024 = await page.evaluate(() => {
  const c = document.querySelector('.widget-card .wb-battery-level');
  return c ? getComputedStyle(c).fontSize : null;
});
t('W-6b battery level 字号跨档恒定 24px', fs1024 === '24px', `fs=${fs1024}`);

await page.evaluate(() => { const WB = window.__widgetBoard; WB.list().forEach(x => WB.remove(x.id)); });
await sleep(500);
const cleaned = await page.evaluate(() => ({ left: window.__widgetBoard.list().length, dom: document.querySelectorAll('.widget-card').length }));
t('W-10 widget 清理零残留', cleaned.left === 0 && cleaned.dom === 0, JSON.stringify(cleaned));

// K 组 + 截图留痕
t('K-1 全程零 pageerror', errors.length === 0, errors.join(';').slice(0, 300));
await page.screenshot({ path: 'docs/sweep/s22-ui-final.png' });
await ctx.close();
await browser.close();
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
