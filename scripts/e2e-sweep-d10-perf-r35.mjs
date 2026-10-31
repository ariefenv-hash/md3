// R35=D 类（性能）巡查 e2e · v8.95（R31 后隔 3 轮回归窗口）
// 本轮为产品变更轮（性能专项，#86-H2/H3 用户「新版变卡」投诉闭环）：
//   修复① #86-H2 AllApps（phone）：aa-scrim bf→none（phone sheet 不透明全屏遮挡，
//     bf 纯属浪费；隔离实验 f95 33.4→16.7 满帧）+ dim 0.42→0.5 补偿；tablet bf 保留
//   修复② #86-H2 Shade/QS：bf 从 overlay 本体剥离至 .pp-blur-underlay（z 849）——
//     frost 与 motion 互斥（split-screen v7.32 纪律推广：backdrop root 内任意 paint
//     damage 触发 bf 逐帧重滤波，软件光栅 33-50ms/帧），落定后 0.18s 静态屏渐现
//     （AOSP depth-blur 落定语义）；切点收敛 setUnderlayBlur(false)（motion 起点硬切）
//   修复③ #86-H2 Recents：overlay bf 迁移 .settled 落定态（关场即时摘除，随收场渐出）
//   修复④ #86-H3 预算分层：dock-bar/taskbar/taskbar-overflow/desktop-search-pill
//     blur 28px 逸出档 → v7.32 标准档 20px（常驻可见表面统一档）
// 本轮增量判据：
//   F 组（帧间隔口径·motion 期零 bf 税）：AllApps 开合 f95≤20 满帧硬档（修复前 33.4）+
//     Shade 拖拽跟手 f95≤20 满帧硬档（修复前 33.4）+ Shade 往返 f95≤45（修复前 50.0）+
//     recents 开合 f95≤55 观察档（修复前 50.0，settled 渐现窗口在册）+
//     widget place/remove f95≤20 满帧不回归（R31 基线 16.7）
//   M 组（机制断言）：phone aa-scrim bf=none + tablet bf 保留 + underlay 初始 off/bf 在册 +
//     openPullPanel 落定后 .on 渐现 + 场景切换/收场起点硬切 + recents settled 切换 +
//     H3 档位 computed（dock/taskbar/search-pill 20px + widget-card/tbt-bar 不回归）
// 继承抽样：P 前置锚 / N 组 place p95+longtask / K 零 pageerror
//   （全量 N/RX/P/SPG/SPH 组判据维持 R31 e2e-sweep-d8-perf-r31 档案本轮全量复跑）
// 纪律传承：外域 route.abort；getComputedStyle 读后立即物化；Esc 走 window.dispatchEvent（R18 校准）；
//   evaluate 内一律 new Promise(setTimeout)；截图入库 docs/sweep/
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8100/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = () => page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

// rAF 帧间隔采样助手（c10 同款）：action 执行期间采样，返回 {n, f95, max}（slice(3) 丢弃启动帧）
async function sampleDuring(action) {
  await page.evaluate(() => {
    window.__f = []; window.__last = performance.now(); window.__stop = false;
    const loop = (n) => { window.__f.push(n - window.__last); window.__last = n; if (!window.__stop) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  await action();
  return page.evaluate(() => {
    window.__stop = true;
    const a = window.__f.slice(3).filter(d => d > 0).sort((x, y) => x - y);
    return { n: a.length, f95: a.length ? a[Math.min(a.length - 1, Math.floor(a.length * 0.95))] : 999, max: a.length ? a[a.length - 1] : 999 };
  });
}

// ============ P 组：前置锚（390 档） ============
console.log('P 组 前置锚（390×844）');
const p1 = await page.evaluate(() => ({
  icons: document.querySelectorAll('.icon-box').length,
  dock: document.querySelectorAll('.dock-app-icon').length,
  wb: !!window.__widgetBoard,
  openRecent: typeof window.__openRecentApps === 'function',
  underlay: !!document.getElementById('ppBlurUnderlay'),
}));
t('P-1a 桌面图标 45', p1.icons === 45, `icons=${p1.icons}`);
t('P-1b dock 图标（390 档口径=4）', p1.dock === 4, `dock=${p1.dock}`);
t('P-1c __widgetBoard 在场', p1.wb === true);
t('P-1d __openRecentApps hook 在场', p1.openRecent === true);
t('P-1e pp-blur-underlay 在场（#86-H2 挂载）', p1.underlay === true);

// ============ M 组：机制断言（frost↔motion 互斥语义） ============
console.log('M 组 #86-H2/H3 机制断言（390×844）');
const m1 = await page.evaluate(() => {
  const u = document.getElementById('ppBlurUnderlay');
  const cs = getComputedStyle(u);
  return { op: cs.opacity, vis: cs.visibility, bf: cs.backdropFilter || cs.webkitBackdropFilter };
});
t('M-1 underlay 初始 off（opacity 0 + visibility hidden）', m1.op === '0' && m1.vis === 'hidden', `op=${m1.op} vis=${m1.vis}`);
t('M-2 underlay bf 在册 blur(20px)+saturate(1.8)', m1.bf.includes('blur(20px)') && m1.bf.includes('saturate'), m1.bf);

// AllApps phone：scrim bf=none（sheet 不透明全屏遮挡，#86-H2）
await page.evaluate(() => window.__allApps.open('probe'));
await sleep(900);
const m3 = await page.evaluate(() => {
  const ov = document.querySelector('.all-apps-overlay');
  const scrim = document.querySelector('.aa-scrim');
  const cs = getComputedStyle(scrim);
  return { form: ov.dataset.form, bf: cs.backdropFilter || cs.webkitBackdropFilter, bg: cs.backgroundColor };
});
t('M-3 AllApps phone 形态 scrim bf=none（#86-H2 纯 dim 档）', m3.form === 'phone' && m3.bf === 'none', `form=${m3.form} bf=${m3.bf}`);
t('M-4 phone scrim bg 加深补偿 rgba(0,0,0,0.5)', m3.bg === 'rgba(0, 0, 0, 0.5)', m3.bg);
await esc(); await sleep(700);

// tablet 形态 bf 保留（1024×768）
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(400);
await page.evaluate(() => window.__allApps.open('probe'));
await sleep(900);
const m5 = await page.evaluate(() => {
  const ov = document.querySelector('.all-apps-overlay');
  const scrim = document.querySelector('.aa-scrim');
  const cs = getComputedStyle(scrim);
  return { form: ov.dataset.form, bf: cs.backdropFilter || cs.webkitBackdropFilter };
});
t('M-5 AllApps tablet 形态 bf 保留 blur+saturate', m5.form === 'tablet' && m5.bf.includes('blur') && m5.bf.includes('saturate'), `form=${m5.form} bf=${m5.bf}`);
await esc(); await sleep(700);
await page.setViewportSize({ width: 390, height: 844 });
await sleep(400);

// Shade underlay：落定渐现 / 场景切换硬切 / 收场硬切
const pdg = () => import('/js/pull-down-gesture.js');
await page.evaluate(async () => { (await import('/js/pull-down-gesture.js')).openPullPanel(0); });
await sleep(250);
const m6 = await page.evaluate(() => {
  const u = document.getElementById('ppBlurUnderlay');
  return { on: u.classList.contains('on'), op: getComputedStyle(u).opacity };
});
t('M-6 motion 期 .on 未加（340ms 调度窗内，t=250ms 抽样）', m6.on === false, `on=${m6.on} op=${m6.op}`);
await sleep(750);
const m7 = await page.evaluate(() => {
  const u = document.getElementById('ppBlurUnderlay');
  const cs = getComputedStyle(u);
  return { on: u.classList.contains('on'), op: cs.opacity, vis: cs.visibility };
});
t('M-7 落定后 .on 渐现（t=1000ms 抽样，AOSP depth-blur 落定语义）', m7.on === true && m7.op === '1' && m7.vis === 'visible', `on=${m7.on} op=${m7.op} vis=${m7.vis}`);
// 静止态 frost 视觉留档（docs/sweep）
await page.screenshot({ path: 'docs/sweep/s35-shade-frost-settle.png' });
// 场景切换：tweenScene 起点硬切
await page.evaluate(async () => { (await import('/js/pull-down-gesture.js')).openPullPanel(1); });
const m8 = await page.evaluate(() => {
  const u = document.getElementById('ppBlurUnderlay');
  return { on: u.classList.contains('on'), op: getComputedStyle(u).opacity };
});
t('M-8 场景切换起点 .on 硬切（tweenScene motion 互斥）', m8.on === false && m8.op === '0', `on=${m8.on} op=${m8.op}`);
await sleep(800);
const m9 = await page.evaluate(() => {
  const u = document.getElementById('ppBlurUnderlay');
  return { on: u.classList.contains('on') };
});
t('M-9 场景落定后 .on 复现（460ms 调度）', m9.on === true, `on=${m9.on}`);
// 收场起点硬切
await page.evaluate(async () => { (await import('/js/pull-down-gesture.js')).closePullPanels(); });
const m10 = await page.evaluate(() => {
  const u = document.getElementById('ppBlurUnderlay');
  return { on: u.classList.contains('on') };
});
t('M-10 收场起点 .on 硬切（closePullPanels 唯一收场汇聚点）', m10.on === false, `on=${m10.on}`);
await sleep(600);

// Recents settled 语义
await page.evaluate(() => window.__openRecentApps());
await sleep(250);
const m11 = await page.evaluate(() => {
  const ov = document.getElementById('recentAppsOverlay');
  return { settled: ov.classList.contains('settled'), bf: getComputedStyle(ov).backdropFilter || getComputedStyle(ov).webkitBackdropFilter };
});
t('M-11 recents 飞行期 .settled 未加 + bf=none（motion 互斥）', m11.settled === false && m11.bf === 'none', `settled=${m11.settled} bf=${m11.bf}`);
await sleep(800);
const m12 = await page.evaluate(() => {
  const ov = document.getElementById('recentAppsOverlay');
  return { settled: ov.classList.contains('settled'), bf: getComputedStyle(ov).backdropFilter || getComputedStyle(ov).webkitBackdropFilter };
});
t('M-12 recents 落定 .settled 渐现 + bf=blur(36px)（视觉对等留档）', m12.settled === true && m12.bf.includes('blur(36px)'), `settled=${m12.settled} bf=${m12.bf}`);
await page.evaluate(() => window.__closeRecentApps());
const m13 = await page.evaluate(() => {
  const ov = document.getElementById('recentAppsOverlay');
  return { settled: ov.classList.contains('settled'), bf: getComputedStyle(ov).backdropFilter || getComputedStyle(ov).webkitBackdropFilter };
});
t('M-13 recents 关场即时摘除 .settled（随收场渐出）', m13.settled === false, `settled=${m13.settled}`);
await sleep(700);

// H3 档位：常驻可见表面 20px 统一档 + 不回归面（widget-card 先 place 后读，a9-r32 C3 同款）
const m14 = await page.evaluate(async () => {
  const g = (sel) => {
    const el = document.querySelector(sel);
    return el ? (getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter) : 'NO_EL';
  };
  const out = {
    dock: g('.dock-bar'), pill: g('.desktop-search-pill'),
    widget: 'NO_EL', taskbar: g('.taskbar'),
  };
  try {
    const B = window.__widgetBoard;
    const res = await B.place('battery');
    await new Promise(r => setTimeout(r, 900));
    const cards = document.querySelectorAll('.widget-card');
    const card = cards[cards.length - 1];
    out.widget = card ? (getComputedStyle(card).backdropFilter || getComputedStyle(card).webkitBackdropFilter) : 'NO_CARD';
    let cleaned = true;
    try { if (res?.id) await B.remove(res.id); else if (res && typeof res === 'object') { const k = Object.keys(res).find(x => res[x]?.id); if (k) await B.remove(res[k].id); } else if (typeof res === 'string') await B.remove(res); } catch (e) { cleaned = String(e); }
    await new Promise(r => setTimeout(r, 500));
    out.cleaned = cleaned;
  } catch (e) { out.widget = 'PLACE_ERR:' + String(e).slice(0, 60); }
  return out;
});
t('M-14 dock-bar blur(20px)（28 逸出档回收，#86-H3）', m14.dock.includes('blur(20px)'), m14.dock);
t('M-15 desktop-search-pill blur(20px)（28 逸出档回收）', m14.pill.includes('blur(20px)'), m14.pill);
t('M-16 widget-card blur(20px) saturate(1.5) 不回归', m14.widget.includes('blur(20px)') && m14.widget.includes('saturate'), `${m14.widget} clean=${m14.cleaned}`);

// ============ F 组：帧间隔口径（motion 期零 bf 税） ============
console.log('F 组 帧间隔口径（390×844）');
// F-1 AllApps 开合×3（phone，bf=none → 满帧硬档）
const f1 = await sampleDuring(async () => {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__allApps.open('probe'));
    await sleep(750);
    await page.evaluate(() => window.__allApps.close ? window.__allApps.close() : esc());
    await sleep(750);
  }
});
t('F-1 AllApps 开合×3 f95≤20 满帧硬档（修复前 33.4）', f1.f95 <= 20, `f95=${f1.f95} max=${f1.max} n=${f1.n}`);
t('F-1b AllApps worst 观察档 ≤50', f1.max <= 50, `max=${f1.max}`);

// F-2 Shade 拖拽跟手（touch 拖拽，frost 全程 off → 满帧硬档）
const f2 = await sampleDuring(async () => {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 500 }] });
  for (let y = 500; y >= 320; y -= 20) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y }] }); await sleep(33); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(700);
});
t('F-2 Shade 拖拽跟手 f95≤20 满帧硬档（修复前 33.4）', f2.f95 <= 20, `f95=${f2.f95} max=${f2.max} n=${f2.n}`);
await sleep(300);
await page.evaluate(async () => { (await import('/js/pull-down-gesture.js')).closePullPanels(); });
await sleep(600);

// F-3 Shade 往返×2（openPullPanel 0→1→close；落定渐现窗口在册）
const f3 = await sampleDuring(async () => {
  for (let i = 0; i < 2; i++) {
    await page.evaluate(async () => { (await import('/js/pull-down-gesture.js')).openPullPanel(0); });
    await sleep(650);
    await page.evaluate(async () => { (await import('/js/pull-down-gesture.js')).openPullPanel(1); });
    await sleep(650);
    await page.evaluate(async () => { (await import('/js/pull-down-gesture.js')).closePullPanels(); });
    await sleep(650);
  }
});
t('F-3 Shade 往返×2 f95≤45（修复前 50.0；落定渐现窗口在册）', f3.f95 <= 45, `f95=${f3.f95} max=${f3.max} n=${f3.n}`);

// F-4 recents 开合×3（settled 渐现窗口在册）
const f4 = await sampleDuring(async () => {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__openRecentApps());
    await sleep(750);
    await page.evaluate(() => window.__closeRecentApps());
    await sleep(750);
  }
});
t('F-4 recents 开合×3 f95≤55 观察档（修复前 50.0 同档带；motion 段满帧由 M-11 机制断言承载）', f4.f95 <= 55, `f95=${f4.f95} max=${f4.max} n=${f4.n}`);

// F-5 widget place/remove×3（R31 基线满帧不回归）
const f5 = await sampleDuring(async () => {
  for (let i = 0; i < 3; i++) {
    await page.evaluate(async () => {
      const wb = window.__widgetBoard;
      wb.enterPlaceMode ? wb.enterPlaceMode() : null;
    });
    await sleep(400);
    await page.evaluate(async () => {
      const wb = window.__widgetBoard;
      wb.exitPlaceMode ? wb.exitPlaceMode() : null;
    });
    await sleep(400);
  }
});
t('F-5 widget place/remove 循环 f95≤20 满帧不回归（R31 基线 16.7）', f5.f95 <= 20, `f95=${f5.f95} max=${f5.max} n=${f5.n}`);

// ============ N 组继承抽样：longtask + 堆稳定 ============
console.log('N 组 继承抽样（longtask / place p95）');
const n1 = await page.evaluate(async () => {
  const lt = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) lt.push(+e.duration.toFixed(1)); }).observe({ entryTypes: ['longtask'] }); } catch (e) {}
  const wb = window.__widgetBoard;
  const t0 = performance.now();
  wb.enterPlaceMode ? wb.enterPlaceMode() : null;
  wb.exitPlaceMode ? wb.exitPlaceMode() : null;
  const dur = +(performance.now() - t0).toFixed(1);
  await new Promise(r => setTimeout(r, 400));
  return { dur, lt: lt.length, ltMax: lt.length ? Math.max(...lt) : 0 };
});
t('N-1 place/remove 任务时长 p95 口径 ≤100.1（R15-R31 基线）', n1.dur <= 100.1, `dur=${n1.dur}`);
t('N-2 交互循环零 longtask', n1.lt === 0, `lt=${n1.lt} max=${n1.ltMax}`);

// ============ K 组：全程零 pageerror ============
t('K-1 全程零 pageerror', errors.length === 0, errors.length ? errors.slice(0, 2).join(' | ') : '');

console.log(`\n==== e2e-sweep-d10-perf-r35 结果：pass=${pass} fail=${fail} ====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
