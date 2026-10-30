// R27=D 类（性能）巡查 e2e · v8.87（R23 后隔 3 轮回归窗口，v8.84-86 连续零产品变更，性能面预期
// 稳定；R26=C 轮换指向 D 类，复验 R23 D 类判据原样：N 组帧预算（widget place/remove p95=16.7-16.8
// 基线/transient 弹簧 armed 语境 333.4/500.2 档/AllApps sheet blur 贵档 233.4 档/phone 抽屉 150.1 档）
// + RX 组跨断点销毁帧预算 + P 组 split 旋转瞬间帧预算（R11 判据）+ Q 组交互循环（零 longtask+heap
// 稳定）；增量重点 R24/R25/R26 新增面性能维度延伸（R25 SP-G600 600 中间档旋转帧预算 B 类留档正向
// p95=154/143.2 回旋 168.4/165.5 已落档可作基线直接 diff → SPG6D 组 600 档 D 类视角复验；R19 SP-C
// phone 档快照链 0.705-1.071/R23 SP-H 768 档 0.409-0.625/R25 SP-H600 600 档 0.944-1.211 已三连留档
// → SP-H390 组 390 档 D 类复核跨档四连；R24 U 组 600 档三属性+user-select 留档/R26 SPV600 视觉快照
// 600 档留档可作 D 类 computed 前置锚引用））
// 判据纪律（R7/R11/R15/R19/R23 传承）：rAF delta P95 主判据 + max 档界留档；多轮中位/均值降间歇翻转；
//   阈值置于 vsync 档界（16.7 整数倍+0.1）；longtask 观察器 goto 前置挂载；armed 重试兜底
// R18 教训传承：close 系过渡系合成器时钟驱动——全部判据基于 rAF delta 与状态机事实，不依赖 CSS
//   transition 插值可见性
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8100/index.html?nolock=1';
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
await sleep(3000); // boot 快照前置（R7 教训①）

// longtask 观察器前置挂载
await page.evaluate(() => {
  window.__lt = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(+e.duration.toFixed(1)); }).observe({ entryTypes: ['longtask'] }); } catch (e) {}
});
const takeLT = async () => { const v = await page.evaluate(() => window.__lt.splice(0)); return v; };

// rAF delta 统计（同 evaluate 内触发+采样，时序零缝隙）
const rafRun = (trigger) => page.evaluate(async ({ trigger }) => {
  const d = []; let last = performance.now(); const t0 = last;
  const fire = async () => {
    if (trigger === 'tbt-open') { const m = await import('/js/taskbar-transient.js'); m.openTransient('perf'); }
    else if (trigger === 'tbt-stash') { const m = await import('/js/taskbar-transient.js'); m.stashTransient('perf'); }
    else if (trigger === 'aa-open') { const m = await import('/js/all-apps.js'); m.openAllApps('sweep'); }
    else if (trigger === 'aa-close') { const m = await import('/js/all-apps.js'); m.closeAllApps('sweep'); }
    else if (trigger === 'wb-place') { window.__widgetBoard.place('battery'); }
    else if (trigger === 'wb-remove') { const l = window.__widgetBoard.list(); if (l.length) window.__widgetBoard.remove(l[l.length - 1].id); }
  };
  await fire();
  await new Promise(res => { const tick = (now) => { d.push(now - last); last = now; if (now - t0 >= 900) res(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  const s = [...d].sort((a, b) => a - b);
  const p95 = s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)] || 0;
  return { n: d.length, p95: +p95.toFixed(1), max: +s[s.length - 1].toFixed(1), mean: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1) };
}, { trigger });

// 前置锚：armD 1000ms 窗 rAF delta 采样（R14 教训①：光栅档下窗宽必须 ≥1000ms）
const armD = () => page.evaluate(() => {
  window.__d = []; let last = performance.now(); const t0 = last;
  const tick = (now) => { window.__d.push(now - last); last = now; if (now - t0 >= 1000) { const s = [...window.__d].sort((a, b) => a - b); window.__dStat = { n: window.__d.length, p95: +(s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)] || 0).toFixed(1), max: +s[s.length - 1].toFixed(1), mean: +(window.__d.reduce((a, b) => a + b, 0) / window.__d.length).toFixed(1) }; } else requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});

// 视觉快照（R18 SP-U/R22 SP-V 同款：live 物化三属性 + usel）
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

// ============ N 组：新组件独立帧预算复验（R15/R19/R23 判据原样） ============
console.log('N 组 新组件独立帧预算复验');
const wb0 = await page.evaluate(() => window.__widgetBoard ? window.__widgetBoard.list().length : -1);
t('N-0 __widgetBoard 在场', wb0 === 0, `n=${wb0}`);
const placeStat = await rafRun('wb-place');
t('N-3a widget place P95≤100.1（6 vsync 档界）', placeStat.p95 <= 100.1, `p95=${placeStat.p95} max=${placeStat.max} n=${placeStat.n}`);
t('N-3b widget place max≤183.4（11 vsync 留档）', placeStat.max <= 183.4, `max=${placeStat.max}`);
const ltPlace = await takeLT();
t('N-3c widget place 期 longtask ≤50ms 事件数 ≤2', ltPlace.filter(x => x > 50).length <= 2, `lt=[${ltPlace}]`);
await sleep(400);
const rmStat = await rafRun('wb-remove');
t('N-3d widget remove P95≤100.1', rmStat.p95 <= 100.1, `p95=${rmStat.p95} max=${rmStat.max}`);
await sleep(400);

// N-1/N-2：3 轮中位（iframe 光栅档，R11/R15/R19/R23 同款）
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
t('N-1pre armed 前提成立', armed === true && appOpened === 'OK', `open=${appOpened} armed=${armed}`);
await page.evaluate(() => import('/js/taskbar-transient.js').then(m => m.stashTransient('perf-reset')));
await sleep(900);
const openStats = [], stashStats = [];
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => import('/js/taskbar-transient.js').then(m => m.stashTransient('perf-reset')));
  await sleep(750);
  openStats.push(await rafRun('tbt-open'));
  await sleep(400);
  stashStats.push(await rafRun('tbt-stash'));
  await sleep(400);
}
const med = (arr, k) => { const s = arr.map(x => x[k]).sort((a, b) => a - b); return +(s[Math.floor(s.length / 2)]).toFixed(1); };
const openMedP95 = med(openStats, 'p95'), openMaxAll = Math.max(...openStats.map(x => x.max));
const stashMedP95 = med(stashStats, 'p95'), stashMaxAll = Math.max(...stashStats.map(x => x.max));
t('N-1 transient 弹簧展开 中位P95≤333.4（20 vsync，iframe 光栅档）', openMedP95 <= 333.4, `med=${openMedP95} all=[${openStats.map(x => x.p95).join(',')}] maxAll=${openMaxAll}`);
t('N-1b transient 展开 max≤500.2（30 vsync 留档）', openMaxAll <= 500.2, `maxAll=${openMaxAll}`);
t('N-2 transient 弹簧收起 中位P95≤333.4', stashMedP95 <= 333.4, `med=${stashMedP95} all=[${stashStats.map(x => x.p95).join(',')}] maxAll=${stashMaxAll}`);
t('N-2b transient 收起 max≤500.2 留档', stashMaxAll <= 500.2, `maxAll=${stashMaxAll}`);

// N-4：AllApps tablet sheet 3 轮中位（scrim blur 贵档，R19 校准后档界 233.4）
await page.keyboard.press('Escape');
await sleep(800);
const aaTStats = [];
let aaTClose = null;
for (let i = 0; i < 3; i++) {
  aaTStats.push(await rafRun('aa-open'));
  await sleep(500);
  aaTClose = await rafRun('aa-close');
  await sleep(650);
}
const aaTMedP95 = med(aaTStats, 'p95'), aaTMaxAll = Math.max(...aaTStats.map(x => x.max));
t('N-4 AllApps tablet sheet 中位P95≤233.4（14 vsync，scrim blur 贵档上沿=R11 在册光栅档 116-233，R19 仪器侧校准档）', aaTMedP95 <= 233.4, `med=${aaTMedP95} all=[${aaTStats.map(x => x.p95).join(',')}] maxAll=${aaTMaxAll}`);
t('N-4b AllApps tablet sheet maxAll≤416.8（25 vsync 留档）', aaTMaxAll <= 416.8, `maxAll=${aaTMaxAll}`);
t('N-4c AllApps tablet 关闭 P95≤250.1（15 vsync 留档）', aaTClose && aaTClose.p95 <= 250.1, `p95=${aaTClose && aaTClose.p95} max=${aaTClose && aaTClose.max}`);
await sleep(700);

// N-5：phone 抽屉（390×844）
await page.setViewportSize({ width: 390, height: 844 });
await sleep(700);
const aaPStat = await rafRun('aa-open');
const phForm = await page.evaluate(() => { const ov = document.querySelector('.all-apps-overlay') || document.getElementById('allAppsOverlay'); return ov ? ov.getAttribute('data-form') : null; });
t('N-5pre phone 形态确认', phForm === 'phone', `form=${phForm}`);
t('N-5 AllApps phone 抽屉 P95≤150.1（600ms 全屏抽屉）', aaPStat.p95 <= 150.1, `p95=${aaPStat.p95} max=${aaPStat.max} n=${aaPStat.n}`);
t('N-5b AllApps phone 抽屉 max≤416.8 留档', aaPStat.max <= 416.8, `max=${aaPStat.max}`);
await page.keyboard.press('Escape');
await sleep(800);
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(700);

// ============ RX 组：跨断点销毁重建瞬间帧预算复验（R15/R19/R23 判据原样） ============
console.log('RX 组 跨断点销毁瞬间帧预算复验');
await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep')));
await sleep(700);
const rx1Pre = await page.evaluate(() => { const ov = document.querySelector('.all-apps-overlay') || document.getElementById('allAppsOverlay'); return ov ? { form: ov.getAttribute('data-form'), active: ov.classList.contains('active') } : null; });
t('RX-0a tablet 开启态前置', !!rx1Pre && rx1Pre.form === 'tablet' && rx1Pre.active === true, JSON.stringify(rx1Pre));
await armD();
await page.setViewportSize({ width: 390, height: 844 });
await sleep(1300);
const rx1 = await page.evaluate(() => window.__dStat);
const rx1Gone = await page.evaluate(() => { const ov = document.querySelector('.all-apps-overlay') || document.getElementById('allAppsOverlay'); return { present: !!ov, active: ov ? ov.classList.contains('active') : false, sheet: !!(ov && ov.querySelector('.aa-sheet')) }; });
t('RX-1 跨断点销毁在场（开启态 resize→关闭+销毁，防空壳假阳性）', rx1Gone.present === false || (!rx1Gone.active && !rx1Gone.sheet), JSON.stringify(rx1Gone));
t('RX-1a tablet→phone 销毁瞬间 P95≤333.4（20 vsync 档界：scrim blur teardown+grid 销毁+全量重排）', rx1 && rx1.p95 <= 333.4, `p95=${rx1 && rx1.p95} max=${rx1 && rx1.max} n=${rx1 && rx1.n} mean=${rx1 && rx1.mean}`);
t('RX-1b tablet→phone 销毁瞬间 max≤500.2（30 vsync 留档）', rx1 && rx1.max <= 500.2, `max=${rx1 && rx1.max}`);
await sleep(600);

await page.setViewportSize({ width: 390, height: 844 });
await sleep(700);
await page.evaluate(() => import('/js/all-apps.js').then(m => m.openAllApps('sweep')));
await sleep(1000);
const rx2Pre = await page.evaluate(() => { const ov = document.querySelector('.all-apps-overlay') || document.getElementById('allAppsOverlay'); return ov ? { form: ov.getAttribute('data-form'), active: ov.classList.contains('active') } : null; });
t('RX-0b phone 开启态前置', !!rx2Pre && rx2Pre.form === 'phone' && rx2Pre.active === true, JSON.stringify(rx2Pre));
await armD();
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(1300);
const rx2 = await page.evaluate(() => window.__dStat);
const rx2Gone = await page.evaluate(() => { const ov = document.querySelector('.all-apps-overlay') || document.getElementById('allAppsOverlay'); return { present: !!ov, active: ov ? ov.classList.contains('active') : false, sheet: !!(ov && ov.querySelector('.aa-sheet')) }; });
t('RX-2 跨断点销毁在场（phone persistent 同语义）', rx2Gone.present === false || (!rx2Gone.active && !rx2Gone.sheet), JSON.stringify(rx2Gone));
t('RX-2a phone→tablet 销毁瞬间 P95≤333.4（同档）', rx2 && rx2.p95 <= 333.4, `p95=${rx2 && rx2.p95} max=${rx2 && rx2.max} n=${rx2 && rx2.n} mean=${rx2 && rx2.mean}`);
t('RX-2b phone→tablet 销毁瞬间 max≤500.2（留档）', rx2 && rx2.max <= 500.2, `max=${rx2 && rx2.max}`);
await sleep(600);
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(700);

// ============ P 组：split axis 旋转瞬间帧预算复验 + 画像比对（R11/R15/R19/R23 判据原样） ============
console.log('P 组 split axis 旋转瞬间 + 光栅画像');
const splitOpen = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({ appAId: 'calculator', appBId: 'notes', rectA: { left: 300, top: 200, width: 220, height: 160 }, rectB: { left: 700, top: 200, width: 220, height: 160 }, ratio: 0.5 }); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1500);
const axis0 = await page.evaluate(() => (window.__splitInfo && window.__splitInfo().axis) || null);
t('P-1 分屏开启 axis=x（1024×768 横档）', splitOpen === 'OK' && axis0 === 'x', `ret=${splitOpen} axis=${axis0}`);
const rotXY = [], rotYX = [];
let firstAxis = null;
for (let i = 0; i < 2; i++) {
  await armD();
  await page.setViewportSize({ width: 343, height: 900 });
  await sleep(1300);
  const ax = await page.evaluate(() => { const inf = window.__splitInfo(); return { axis: inf.axis, active: inf.active }; });
  if (i === 0) firstAxis = ax;
  rotXY.push(await page.evaluate(() => window.__dStat));
  await armD();
  await page.setViewportSize({ width: 1024, height: 768 });
  await sleep(1300);
  rotYX.push(await page.evaluate(() => window.__dStat));
}
const avg = (arr, k) => +(arr.reduce((s, x) => s + x[k], 0) / arr.length).toFixed(1);
const xyAvgP95 = avg(rotXY, 'p95'), xyMaxAll = Math.max(...rotXY.map(x => x.max));
const yxAvgP95 = avg(rotYX, 'p95'), yxMaxAll = Math.max(...rotYX.map(x => x.max));
t('P-2 旋转瞬间 axis x→y 切换 + 会话在场', firstAxis && firstAxis.active === true && firstAxis.axis === 'y', `axis=${firstAxis && firstAxis.axis} active=${firstAxis && firstAxis.active}`);
t('P-3 正向旋转 均值P95≤200.1（12 vsync 档界，分屏重排+双 iframe——R11 实测 133-183）', xyAvgP95 <= 200.1, `avg=${xyAvgP95} all=[${rotXY.map(x => x.p95).join(',')}] maxAll=${xyMaxAll}`);
t('P-4 正向旋转 max≤416.8（25 vsync 留档）', xyMaxAll <= 416.8, `maxAll=${xyMaxAll}`);
const axis2 = await page.evaluate(() => (window.__splitInfo && window.__splitInfo().axis) || null);
t('P-5 回旋 y→x 均值P95≤416.8（回旋=竖→横面积扩大+重光栅档，R11 实测 216-367）+ 最终 axis=x', axis2 === 'x' && yxAvgP95 <= 416.8, `axis=${axis2} avg=${yxAvgP95} all=[${rotYX.map(x => x.p95).join(',')}] maxAll=${yxMaxAll}`);
const nAll = [...rotXY.map(x => x.n), ...rotYX.map(x => x.n)];
const nMin = Math.min(...nAll);
t('P-8 旋转光栅画像与 R14/R15/R23 留档同档（n≥8/1000ms 窗）', nMin >= 8, `nAll=[${nAll.join(',')}] nMin=${nMin}`);
const ltRot = await takeLT();
t('P-6 旋转期 longtask max≤500.2 留档', ltRot.length === 0 || Math.max(...ltRot) <= 500.2, `lt=[${ltRot.slice(0, 6)}]`);
const exited = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('P-7 分屏收场零挂死', exited === 'OK', String(exited));

// ============ SPG6D 组·增量①：600 中间档旋转帧预算 D 类复验（R25 SP-G600 B 类留档直接 diff） ============
console.log('SPG6D 组 600 中间档旋转帧预算 D 类复验（R25 留档 diff）');
await page.setViewportSize({ width: 600, height: 962 });
await sleep(900);
const spgOpen = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({
  appAId: 'calculator', appBId: 'notes',
  rectA: { left: 40, top: 120, width: 160, height: 120 },
  rectB: { left: 320, top: 120, width: 160, height: 120 },
  ratio: 0.5,
}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1300);
const spgA0 = await page.evaluate(() => { const i = window.__splitInfo(); return { axis: i.axis, active: i.active }; });
t('SPG6D-0 600×962 开启 axis=y + 会话在场（R21/R25 同款 rect）', spgOpen === 'OK' && spgA0.axis === 'y' && spgA0.active === true, `ret=${spgOpen} axis=${spgA0.axis} active=${spgA0.active}`);
// 正向 600×962 → 962×600
await armD();
await page.setViewportSize({ width: 962, height: 600 });
await sleep(1300);
const spgF1 = await page.evaluate(() => window.__dStat);
const spgAx1 = await page.evaluate(() => { const i = window.__splitInfo(); return { axis: i.axis, active: i.active }; });
t('SPG6D-1a 正向末态 axis=x + 在场', spgAx1.axis === 'x' && spgAx1.active === true, `axis=${spgAx1.axis} active=${spgAx1.active}`);
t('SPG6D-1b 600 正向 P95≤416.8（25 vsync 档界，R25 B 类留档 143.2-154 直接 diff）', spgF1 && spgF1.p95 <= 416.8, `p95=${spgF1 && spgF1.p95} max=${spgF1 && spgF1.max} n=${spgF1 && spgF1.n} mean=${spgF1 && spgF1.mean}`);
t('SPG6D-1c 600 正向 max≤500.2（30 vsync 留档）', spgF1 && spgF1.max <= 500.2, `max=${spgF1 && spgF1.max}`);
// 回旋 962×600 → 600×962
await armD();
await page.setViewportSize({ width: 600, height: 962 });
await sleep(1300);
const spgF2 = await page.evaluate(() => window.__dStat);
const spgAx2 = await page.evaluate(() => { const i = window.__splitInfo(); return { axis: i.axis, active: i.active }; });
t('SPG6D-2a 回旋末态 axis=y + 在场', spgAx2.axis === 'y' && spgAx2.active === true, `axis=${spgAx2.axis} active=${spgAx2.active}`);
t('SPG6D-2b 600 回旋 P95≤416.8（同档界，R25 留档 165.5-168.4 直接 diff）', spgF2 && spgF2.p95 <= 416.8, `p95=${spgF2 && spgF2.p95} max=${spgF2 && spgF2.max} n=${spgF2 && spgF2.n} mean=${spgF2 && spgF2.mean}`);
t('SPG6D-2c 600 回旋 max≤500.2（留档）', spgF2 && spgF2.max <= 500.2, `max=${spgF2 && spgF2.max}`);
const spgNAll = [spgF1 && spgF1.n, spgF2 && spgF2.n].filter(x => x !== null);
t('SPG6D-3 双向 active 恒 true + 帧产出 n≥5/1000ms 窗', spgA0.active === true && spgAx1.active === true && spgAx2.active === true && spgNAll.length === 2 && Math.min(...spgNAll) >= 5, `active 3/3 nAll=[${spgNAll.join(',')}]`);
const ltSp6 = await takeLT();
t('SPG6D-3b 600 旋转期 longtask max≤500.2 留档', ltSp6.length === 0 || Math.max(...ltSp6) <= 500.2, `lt=[${ltSp6.slice(0, 6)}]`);
const spgExit = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('SPG6D-4 600 档收场零挂死', spgExit === 'OK', String(spgExit));

// ============ SP-H390 组·增量②：390 档快照采样链叠加旋转同窗观测（R19 SP-C 口径 D 类复核，跨档四连） ============
console.log('SP-H390 组 390 档快照采样链叠加旋转同窗观测');
await page.setViewportSize({ width: 390, height: 844 });
await sleep(900);
const sphOpen = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({
  appAId: 'calculator', appBId: 'notes',
  rectA: { left: 30, top: 120, width: 140, height: 110 },
  rectB: { left: 200, top: 120, width: 140, height: 110 },
  ratio: 0.5,
}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1300);
const sphPre = await paneSnap();
t('SPH390-0 390×844 开启 axis=y + 快照基准在场（R19 SP/SP-C 同款 rect）+ SV 前置锚（R24 U/R26 SPV600 口径）', sphOpen === 'OK' && sphPre.n === 2 && sphPre.axis === 'y' && sphPre.bg === 'rgb(248, 250, 252)' && sphPre.usel === 'none', `ret=${sphOpen} pre=${JSON.stringify(sphPre)}`);
// 挂快照采样链采样器（R19 SP-C/R23 SP-H/R25 SP-H600 同款：rAF 1000ms 窗，每帧一次三属性 live 物化快照+计时）
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
await sleep(1300);
const sphStat = await page.evaluate(() => window.__visStat);
const sphPost = await page.evaluate(() => ({ bg: window.__visBg, h: window.__visH, pad: window.__visPad }));
const ltVis = await takeLT();
t('SPH390-1 单次视觉快照采样均耗≤5ms 且 max≤16.7（1 vsync 留档，R19 SP-C-1 校准档界原样；R19 0.705-1.071 直接 diff）', sphStat && sphStat.snapMean <= 5 && sphStat.snapMax <= 16.7, `snapMax=${sphStat && sphStat.snapMax}ms snapMean=${sphStat && sphStat.snapMean}ms snapN=${sphStat && sphStat.snapN}`);
t('SPH390-2 快照采样链叠加旋转重光栅 帧产出 P95≤416.8 且 n≥5', sphStat && sphStat.p95 <= 416.8 && sphStat.n >= 5, `p95=${sphStat && sphStat.p95} max=${sphStat && sphStat.max} n=${sphStat && sphStat.n}`);
t('SPH390-3 采样期 longtask max≤500.2 留档（对齐 P-6/SP-C-3/SP-H-3 判据）', ltVis.length === 0 || Math.max(...ltVis) <= 500.2, `lt=[${ltVis.slice(0, 6)}]`);
t('SPH390-4 视觉快照跨旋转恒等（R18 SP-U/R19 SP-C-4/R22 SP-V/R26 SPV600 口径：bg/app-header height/padding 全等）', sphPre.bg === sphPost.bg && sphPre.hdrH === sphPost.h && sphPre.hdrPad === sphPost.pad, `pre=${JSON.stringify(sphPre)} post=${JSON.stringify(sphPost)}`);
const sphExit = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('SPH390-5 采样链收场零挂死', sphExit === 'OK', String(sphExit));
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(700);

// ============ Q 组：新组件交互循环 longtask + heap 复验（R7/R11/R15/R19/R23 判据同款） ============
console.log('Q 组 交互循环 + heap');
await page.evaluate(() => { window.__lt = []; });
const cyc = await page.evaluate(async () => {
  const AA = await import('/js/all-apps.js');
  const WB = window.__widgetBoard;
  const D = await import('/js/desktop.js');
  const stats = { aa: 0, wb: 0, pg: 0 };
  for (let i = 0; i < 3; i++) { AA.openAllApps('sweep'); await new Promise(r => setTimeout(r, 450)); AA.closeAllApps('sweep'); await new Promise(r => setTimeout(r, 420)); stats.aa++; }
  for (let i = 0; i < 4; i++) { WB.place('battery'); await new Promise(r => setTimeout(r, 220)); const l = WB.list(); if (l.length) WB.remove(l[l.length - 1].id); await new Promise(r => setTimeout(r, 220)); stats.wb++; }
  for (let i = 0; i < 6; i++) { D.switchDesktopPage(i % 2, true); await new Promise(r => setTimeout(r, 330)); stats.pg++; }
  return stats;
});
const ltCyc = await takeLT();
const ltMax = ltCyc.length ? Math.max(...ltCyc) : 0;
t('Q-1 混合循环 longtask max≤500（R7 D 组判据同款）', ltMax <= 500, `cycles=${JSON.stringify(cyc)} lt n=${ltCyc.length} max=${ltMax}`);
t('Q-2 混合循环零 pageerror（累计）', errors.length === 0, errors.join(';').slice(0, 200));
const heapSeq = [];
for (let i = 0; i < 5; i++) {
  await sleep(900);
  const h = await page.evaluate(() => (performance.memory ? performance.memory.usedJSHeapSize : null));
  if (h) heapSeq.push(Math.round(h / 1048576));
}
const heapOk = heapSeq.length < 3 || (heapSeq[heapSeq.length - 1] - heapSeq[0]) <= 8;
t('Q-3 heap 5 轮无单调涨（末轮-首轮 ≤ 8MB，GC 锯齿内）', heapOk, `heap=[${heapSeq.join(',')}]MB`);

// K 组
t('K-1 全程零 pageerror', errors.length === 0, errors.join(';').slice(0, 300));
await page.screenshot({ path: 'docs/sweep/s27-perf-final.png' });
await ctx.close();
await browser.close();
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
