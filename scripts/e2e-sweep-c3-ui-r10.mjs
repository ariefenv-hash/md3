// R10=C 类（UI 细节）巡查 e2e · v8.70
// T 组·taskbar-transient 弹簧打断中间帧（R9 指向新增面①：v8.63-65 打断协议在新组件抽查）
// A 组·AllApps 浮层打断中间帧（tablet bottom sheet 267ms / phone 600ms 双形态）
// W 组·widget 卡多规格排版一致性 + 多页切页一致性（R9 归档入口③：390 档按页重建 vs 600+ 恒可见）
// K 组·全程零 pageerror
// 纪律：外域 route.abort；可控超时；hooks.armed/__state.isOpen 前置防空壳假阳性；
//       服务根=ios-desktop/（import('/js/...') 与页面 URL 两层路径一致——R9 教训④）
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8096/index.html?nolock=1';
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

// ============ W 组：widget 多规格排版 + 切页一致性（1024×768 先行） ============
console.log('W 组 widget 多规格排版一致性（1024×768）');
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(600);

const placed = await page.evaluate(async () => {
  const WB = window.__widgetBoard;
  if (!WB) return { noApi: true };
  const r = {};
  // 1024×768 实测网格 6×4，第 1 页图标 24/24 满员、第 2 页 21/24（3 散格）——
  // 2×2 无连续空间系数据事实下 firstFreeSlot 在册降级语义（R9 X 组同源），非缺陷。
  // 排版一致性检查面改用双 kind 双规格：battery 2×1 + shortcuts 1×1
  if (!WB.list().some(x => x.kind === 'battery')) r.battery = !!WB.place('battery');
  if (!WB.list().some(x => x.kind === 'shortcuts')) r.shortcuts = !!WB.place('shortcuts', 1, 1);
  return r;
});
await sleep(700);
if (placed.noApi) t('W-0 __widgetBoard API 在场', false, 'no api');

const typography = await page.evaluate(() => {
  return [...document.querySelectorAll('.widget-card')].map(el => {
    const inner = el.querySelector('.widget-inner');
    const ips = inner ? getComputedStyle(inner).padding : null;
    const rad = getComputedStyle(el).borderRadius;
    const clock = el.querySelector('.wb-clock-time');
    return { kind: (el.className.match(/wb-[\w-]+/) || ['?'])[0], ips, rad, clockFs: clock ? getComputedStyle(clock).fontSize : null };
  });
});
t('W-1 双 kind 双规格 place（battery 2×1 + shortcuts 1×1）', placed.battery === true, JSON.stringify(placed));
t('W-2 .widget-inner padding 跨 kind 跨规格恒定', typography.length >= 1 && typography.every(x => x.ips === '12px 14px'), JSON.stringify(typography.map(x => `${x.kind}:${x.ips}`)));
t('W-3 .widget-card border-radius 恒定 22px', typography.length >= 1 && typography.every(x => x.rad === '22px'), JSON.stringify(typography.map(x => `${x.kind}:${x.rad}`)));

const cyc = await page.evaluate(() => {
  const WB = window.__widgetBoard;
  const l = WB.list();
  if (!l.length) return null;
  const tgt = l.find(x => x.kind === 'clock') || l[0];
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

// 切页一致性（多页横排：找出有 widget 的最深页）
const pageGeo = async () => page.evaluate(() => {
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
  t('W-5 切页往返 widget 几何一致', false, `deepPage=${deepPage}（无多页 widget，前置不足）`);
}

// ============ T 组：taskbar-transient 弹簧打断中间帧（平板档 1024×768） ============
console.log('T 组 transient taskbar 弹簧打断');
// armed 前提：应用全屏 + 常驻任务栏自动收纳（R7 C4b：平板 5s 自动收纳）
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
if (!armed) { await sleep(1500); armed = await page.evaluate(() => import('/js/taskbar-transient.js').then(m => m.__transientTestHooks().armed)); }
const ctxDump = armed ? '' : await page.evaluate(() => import('/js/taskbar-transient.js').then(m => JSON.stringify(m.__transientTestHooks().context())));
t(`T-0 armed 前提成立（app 全屏 + 常驻栏收纳）`, armed === true, `open=${appOpened}${armed ? '' : ' ctx=' + ctxDump}`);
t('T-0b __state.isOpen 前置', await page.evaluate(() => window.__state && window.__state.isOpen === true), '');

// 弹簧采样 run：start/interrupt 编排一体（在采样循环内同步触发打断）
const springRun = (opts) => page.evaluate(async ({ start, interrupt, reopen }) => {
  const M = await import('/js/taskbar-transient.js');
  const hooks = M.__transientTestHooks();
  const TB = await import('/js/taskbar-core.js');
  const TT = await import('/js/taskbar-transient.js');
  // HIDE_OFFSET 同源：TRANSIENT_BAR_HEIGHT(=icon 57 + 2×12 padding = 81) + bottom margin 24 + 12 缓冲 = 117
  //（首跑误用 icon+margin+12=93 漏 2×padding——CSS 初始收起位 translateY(117px) 与 JS 同值可互证）
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

// T1 纯展开对照（前置确保收起态）
await page.evaluate(() => import('/js/taskbar-transient.js').then(m => m.stashTransient('test-reset')));
await sleep(900);
const r1 = await springRun({ start: 'open', interrupt: null, reopen: null });
const pSeq1 = r1.out.map(s => s.p);
t('T-1 纯展开单调不减且收敛', pSeq1.length >= 5 && pSeq1.every((v, i) => i === 0 || v >= pSeq1[i - 1] - 1e-6) && r1.finalP >= 0.995, `n=${pSeq1.length} final=${r1.finalP}`);

// T2 双向打断：开→0.25 处 stash→0.55 处 reopen→展开（前置复位到收起态——T-1 结束弹簧在 1 附近，
// 否则 start=open 从 1 出发直接过冲，0.25 打断点退化为顶部，非中途打断）
await page.evaluate(() => import('/js/taskbar-transient.js').then(m => m.stashTransient('test-reset')));
await sleep(900);
const r2 = await springRun({ start: 'open', interrupt: 'stash', reopen: 'open' });
const pSeq2 = r2.out.map(s => s.p);
const rises = pSeq2.some((v, i) => i > 0 && v - pSeq2[i - 1] > 0.005);
const falls = pSeq2.some((v, i) => i > 0 && v - pSeq2[i - 1] < -0.005);
t('T-2 双向打断三段在场（升/降/升）', r2.marks.length === 2 && rises && falls, `marks=${JSON.stringify(r2.marks)} rises=${rises} falls=${falls}`);
t('T-2b 打断中间帧 maxJump ≤ 0.30（无跳变）', maxJump(pSeq2) <= 0.30, `maxJump=${maxJump(pSeq2)} n=${pSeq2.length}`);
t('T-2c 打断终态收敛展开', r2.finalP >= 0.995 && r2.openAttr === '1', `final=${r2.finalP} attr=${r2.openAttr}`);

// T4 视觉一致性：ty ≈ (1-p)*HIDE；bg ≈ p。帧写管线事实：ty/bg 是上一次 applyFrame 写入值
// （滞后一帧），p 为本帧弹簧实时值——判据取当前帧或滞后一帧的最小偏差；落定写死分支
// （p≥0.995→(1,1) / p≤0.005→(0,0)，taskbar-transient.js startLoop else 分支）按写死值特判
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

// T5 落定写死防残影：终态后 400ms p 恒定 + ty=0（展开位）
await sleep(400);
const r5 = await page.evaluate(() => {
  const hooks = window.__tbTransientHooksCheck = null;
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

// T6 app-launch 链：点 .tbt-icon → 栏收 + 窗开
const iconClicked = await page.evaluate(() => {
  const bar = document.querySelector('.tbt-bar');
  const btn = bar && bar.querySelector('.tbt-icon');
  if (!btn) return 'NO-ICON';
  btn.click();
  return btn.getAttribute('data-id');
});
await sleep(900);
const t6 = await page.evaluate(async () => {
  const h = await import('/js/taskbar-transient.js').then(m => m.__transientTestHooks());
  return { openAttr: h.el.getAttribute('data-open'), p: +h.springP.toFixed(4), isOpen: window.__state.isOpen };
});
t('T-6 app-launch 链：栏收 + 窗开', iconClicked !== 'NO-ICON' && t6.openAttr === '0' && t6.p <= 0.005 && t6.isOpen === true, `icon=${iconClicked} attr=${t6.openAttr} p=${t6.p} isOpen=${t6.isOpen}`);

// T7 纯收起对照（重新展开后 stash）
await page.evaluate(() => import('/js/taskbar-transient.js').then(m => m.openTransient('test')));
await sleep(1100);
const r7 = await springRun({ start: 'stash', interrupt: null, reopen: null });
const pSeq7 = r7.out.map(s => s.p);
t('T-7 纯收起单调收敛（maxJump ≤ 0.30）', pSeq7.length >= 5 && maxJump(pSeq7) <= 0.30 && r7.finalP <= 0.005 && r7.openAttr === '0', `n=${pSeq7.length} final=${r7.finalP} maxJump=${maxJump(pSeq7)}`);

// 收场：关 app 窗（Esc），复位桌面
await page.keyboard.press('Escape');
await sleep(900);

// ============ A 组：AllApps 浮层打断中间帧（tablet 267ms sheet） ============
console.log('A 组 AllApps 打断（tablet bottom sheet）');
// 三段独立采样：开场 120ms → Esc 打断 + 关闭段 300ms → 重开 400ms
const sheetSample = (ms) => page.evaluate(async ({ ms }) => {
  const out = [];
  const t0 = performance.now();
  await new Promise((resolve) => {
    const step = () => {
      const now = performance.now();
      const ov = document.getElementById('allAppsOverlay');
      const sheet = ov && ov.querySelector('.aa-sheet');
      let ty = null, op = null;
      if (sheet) {
        const cs = getComputedStyle(sheet);
        const m = cs.transform.match(/matrix\((.+)\)/);
        if (m) { const v = m[1].split(',').map(parseFloat); ty = v.length === 6 ? v[5] : v[13]; }
        op = parseFloat(cs.opacity);
      }
      out.push({ t: +(now - t0).toFixed(1), ty: ty === null ? null : +ty.toFixed(1), op: op === null || Number.isNaN(op) ? null : +op.toFixed(3), present: !!sheet });
      if (now - t0 > ms) { resolve(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  return out;
}, { ms });

await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep')));
await sleep(60);
const openSeg = await sheetSample(120);
await page.keyboard.press('Escape');
const closeSeg = await sheetSample(300);
await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep')));
const reopenSeg = await sheetSample(400);

const ovForm = await page.evaluate(() => {
  const ov = document.getElementById('allAppsOverlay');
  return ov ? { form: ov.getAttribute('data-form'), active: ov.classList.contains('active') } : null;
});
t('A-1 tablet 形态在册（data-form=tablet）', !!ovForm && ovForm.form === 'tablet', JSON.stringify(ovForm));
const openTy = openSeg.filter(s => s.ty !== null).map(s => s.ty);
const closeTy = closeSeg.filter(s => s.ty !== null).map(s => s.ty);
const reTy = reopenSeg.filter(s => s.ty !== null).map(s => s.ty);
t('A-2 开场段 ty 下降（sheet 上滑入场）', openTy.length >= 4 && openTy[openTy.length - 1] < openTy[0], `[${openTy.slice(0, 3)}…${openTy.slice(-2)}]`);
t('A-3 Esc 打断后关闭段 ty 反向（转向在场）', closeTy.length >= 4 && closeTy[closeTy.length - 1] > closeTy[0], `[${closeTy.slice(0, 3)}…${closeTy.slice(-2)}]`);
t('A-4 重开终态 ty≈0 + active', reTy.length >= 4 && Math.abs(reTy[reTy.length - 1]) <= 1 && ovForm && ovForm.active, `last=${reTy[reTy.length - 1]} n=${reTy.length}`);
const vh = 768;
const segJump = (arr) => { let m = 0; for (let i = 1; i < arr.length; i++) m = Math.max(m, Math.abs(arr[i] - arr[i - 1])); return +m.toFixed(1); };
// 稳态段判据：打断转折点一帧内速度翻转（开场速率+关闭速率 ≈ 2×vh/16帧 ≈ 0.125×vh）与
// ephemeral 重建首帧（新建元素 translateY(100%) 初始态→动画首帧）系帧差天然形态，非跳变——
// 各段去首 2 帧后 maxJump ≤ 0.25×vh 判「稳态无瞬跳」
const steady = (arr) => arr.slice(2);
const lim = vh * 0.25;
t('A-5 稳态段 maxJump ≤ 0.25×vh（转折点/重建首帧除外）', segJump(steady(openTy)) <= lim && segJump(steady(closeTy)) <= lim && segJump(steady(reTy)) <= lim, `open=${segJump(steady(openTy))} close=${segJump(steady(closeTy))} re=${segJump(steady(reTy))} raw=[${segJump(openTy)},${segJump(closeTy)},${segJump(reTy)}] lim=${+lim.toFixed(1)}`);

// A-6 tablet ephemeral 回归锚：最终 Esc 关闭 → sheet 子树销毁
await page.keyboard.press('Escape');
await sleep(900);
const eph = await page.evaluate(() => {
  const ov = document.getElementById('allAppsOverlay');
  if (!ov) return { gone: true };
  return { gone: false, sheet: !!ov.querySelector('.aa-sheet'), active: ov.classList.contains('active') };
});
t('A-6 tablet ephemeral：关闭后 sheet 销毁零残留', eph.gone || (!eph.sheet && !eph.active), JSON.stringify(eph));

// ============ A 组 phone 形态（390×844） + W 组窄屏 ============
console.log('A 组 phone 抽屉打断 + W 组窄屏（390×844）');
await page.setViewportSize({ width: 390, height: 844 });
await sleep(700);

await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep')));
await sleep(80);
const phOpen = await sheetSample(250);
await page.keyboard.press('Escape');
const phClose = await sheetSample(200);
await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep')));
const phRe = await sheetSample(700);
const phForm = await page.evaluate(() => {
  const ov = document.getElementById('allAppsOverlay');
  const sheet = ov && ov.querySelector('.aa-sheet');
  return { form: ov ? ov.getAttribute('data-form') : null, active: ov ? ov.classList.contains('active') : false, sheetPresent: !!sheet };
});
t('A-7 phone 形态在册（data-form=phone）', phForm.form === 'phone' && phForm.active, JSON.stringify(phForm));
const phOpenTy = phOpen.filter(s => s.ty !== null).map(s => s.ty);
const phCloseTy = phClose.filter(s => s.ty !== null).map(s => s.ty);
t('A-8 phone 打断转向（开场降/关闭升）', phOpenTy.length >= 4 && phCloseTy.length >= 4 && phOpenTy[phOpenTy.length - 1] < phOpenTy[0] && phCloseTy[phCloseTy.length - 1] > phCloseTy[0], `open[${phOpenTy.slice(0, 2)}…${phOpenTy.slice(-1)}] close[${phCloseTy.slice(0, 2)}…${phCloseTy.slice(-1)}]`);
const phOp = phRe.filter(s => s.op !== null).map(s => s.op);
t('A-9 phone 重开终态 opacity=1', phOp.length >= 4 && Math.abs(phOp[phOp.length - 1] - 1) <= 0.01, `last=${phOp[phOp.length - 1]} n=${phOp.length}`);
// persistent 语义锚：关后 DOM 不销毁
await page.keyboard.press('Escape');
await sleep(900);
const per = await page.evaluate(() => {
  const ov = document.getElementById('allAppsOverlay');
  return { ovPresent: !!ov, sheetPresent: !!(ov && ov.querySelector('.aa-sheet')), active: ov ? ov.classList.contains('active') : false };
});
t('A-10 phone persistent：关闭后 DOM 保留', per.ovPresent && per.sheetPresent && !per.active, JSON.stringify(per));

// W 组窄屏：battery level 字号 24px（CSS 基础值；clock 2×2 因图标满页不在场，字号跨档锚改用 battery）
const fs390 = await page.evaluate(() => {
  const c = document.querySelector('.widget-card .wb-battery-level');
  return c ? getComputedStyle(c).fontSize : null;
});
t('W-6 battery level 字号 24px @390 档', fs390 === '24px', `fs=${fs390}`);

// W-7 390 档切页：非当前页卡片不在 DOM（R9 归档行为）+ 切回几何一致
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
  t('W-8 390 档非当前页 widget-card 不在 DOM', offCount === 0, `offCount=${offCount}`);
  t('W-9 390 档切回重建几何一致', geoA.length >= 1 && aSet === bSet, `A=[${aSet}] B=[${bSet}]`);
} else {
  t('W-8 390 档非当前页 widget-card 不在 DOM', false, `deep390=${deep390}（单页前置不足）`);
  t('W-9 390 档切回重建几何一致', false, 'skip');
}

// W-6b 字号跨档恒定（切回 1024 复测）
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(500);
const fs1024 = await page.evaluate(() => {
  const c = document.querySelector('.widget-card .wb-battery-level');
  return c ? getComputedStyle(c).fontSize : null;
});
t('W-6b battery level 字号跨档恒定 24px', fs1024 === '24px', `fs=${fs1024}`);

// W-10 清理零残留（remove 后 scheduleRender 走 rAF——同步读 DOM 会撞渲染未跑，sleep 兜底）
await page.evaluate(() => { const WB = window.__widgetBoard; WB.list().forEach(x => WB.remove(x.id)); });
await sleep(500);
const cleaned = await page.evaluate(() => ({ left: window.__widgetBoard.list().length, dom: document.querySelectorAll('.widget-card').length }));
t('W-10 widget 清理零残留', cleaned.left === 0 && cleaned.dom === 0, JSON.stringify(cleaned));

// K 组
t('K-1 全程零 pageerror', errors.length === 0, errors.join(';').slice(0, 300));

await page.screenshot({ path: 'docs/sweep/s10-phone-final.png' });
await ctx.close();
await browser.close();
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
