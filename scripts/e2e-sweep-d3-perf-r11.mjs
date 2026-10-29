// R11=D 类（性能）巡查 e2e · v8.71
// N 组·v8.58-70 新组件独立帧预算（R10 指向新增面①：R7 D 组混合循环未单独覆盖——
//   taskbar-transient 弹簧开合 / AllApps 双形态 sheet / widget-board place-remove）
// P 组·split axis 自适应旋转瞬间帧预算（R10 指向新增面②：R9 新发现的 axis x↔y 切换）
// Q 组·新组件交互循环 longtask + heap（R7 D 组判据同款）
// K 组·全程零 pageerror
// 判据纪律（R7 传承）：rAF delta 采样 P95 主判据 + max 档界留档；阈值置于 vsync 档界
//   （16.7ms 整数倍+0.1，绝对 max 落档间隙必间歇翻转）；longtask 观察器 goto 前置挂载
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8098/index.html?nolock=1';
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
await sleep(3000); // boot 快照前置（R7 教训①：后读 longtask 桶会混入巡查自身交互）

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
    else if (trigger === 'aa-open-tablet') { const m = await import('/js/all-apps.js'); m.openAllApps('sweep'); }
    else if (trigger === 'aa-close') { const ov = document.getElementById('allAppsOverlay'); const btn = ov && ov.querySelector('.aa-close, [class*=close]'); if (btn) btn.click(); else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }
    else if (trigger === 'wb-place') { window.__widgetBoard.place('battery'); }
    else if (trigger === 'wb-remove') { const l = window.__widgetBoard.list(); if (l.length) window.__widgetBoard.remove(l[l.length - 1].id); }
  };
  await fire();
  await new Promise(res => { const tick = (now) => { d.push(now - last); last = now; if (now - t0 >= 900) res(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  const s = [...d].sort((a, b) => a - b);
  const p95 = s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)] || 0;
  return { n: d.length, p95: +p95.toFixed(1), max: +s[s.length - 1].toFixed(1), mean: +(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1) };
}, { trigger });

// ============ N3：widget-board place/remove 帧预算（桌面态先行） ============
console.log('N 组 新组件独立帧预算');
const wb0 = await page.evaluate(() => window.__widgetBoard ? window.__widgetBoard.list().length : -1);
t('N-0 __widgetBoard 在场', wb0 === 0, `n=${wb0}`);
const placeStat = await rafRun('wb-place');
t('N-3a widget place 帧预算 P95≤100.1（6 vsync 档界）', placeStat.p95 <= 100.1, `p95=${placeStat.p95} max=${placeStat.max} n=${placeStat.n}`);
t('N-3b widget place max≤183.4（11 vsync 档界留档）', placeStat.max <= 183.4, `max=${placeStat.max}`);
const ltPlace = await takeLT();
t('N-3c widget place 期 longtask ≤50ms 事件数 ≤2', ltPlace.filter(x => x > 50).length <= 2, `lt=[${ltPlace}]`);
await sleep(400);
const rmStat = await rafRun('wb-remove');
t('N-3d widget remove 帧预算 P95≤100.1', rmStat.p95 <= 100.1, `p95=${rmStat.p95} max=${rmStat.max}`);
await sleep(400);

// ============ N1/N2：taskbar-transient 弹簧开合帧预算（armed 前提） ============
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
for (let i = 0; i < 3 && !armed; i++) { await sleep(1500); armed = await page.evaluate(() => import('/js/taskbar-transient.js').then(m => m.__transientTestHooks().armed)); } // R10 同款重试（收纳动画+taskbar-changed 同步滞后）
t('N-1pre armed 前提成立', armed === true && appOpened === 'OK', `open=${appOpened} armed=${armed}`);
await page.evaluate(() => import('/js/taskbar-transient.js').then(m => m.stashTransient('perf-reset')));
await sleep(900);
// N-1/N-2：3 轮采样取中位（iframe 光栅档下 900ms 窗仅 ~7 帧，P95 退化为 max——单轮间歇翻转
// R3/R7 档间隙教训同源；实测展开 p95 150-166、收起 150-283）
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
t('N-1 transient 弹簧展开 中位P95≤333.4（20 vsync 档界，iframe 光栅档）', openMedP95 <= 333.4, `med=${openMedP95} all=[${openStats.map(x => x.p95).join(',')}] maxAll=${openMaxAll}`);
t('N-1b transient 弹簧展开 max≤500.2（30 vsync 留档）', openMaxAll <= 500.2, `maxAll=${openMaxAll}`);
t('N-2 transient 弹簧收起 中位P95≤333.4（同 iframe 光栅档）', stashMedP95 <= 333.4, `med=${stashMedP95} all=[${stashStats.map(x => x.p95).join(',')}] maxAll=${stashMaxAll}`);
t('N-2b transient 弹簧收起 max≤500.2 留档', stashMaxAll <= 500.2, `maxAll=${stashMaxAll}`);

// ============ N3b：AllApps tablet sheet 267ms（app 窗关，armed 失守无关 sheet） ============
await page.keyboard.press('Escape');
await sleep(800);
// N-4：3 轮取中位（scrim backdrop-filter blur(20px) 软渲染光栅波动——单轮 p95 实测 116-233 跨 7-14 vsync，
// n=12 小样本 P95=max 退化，同 N-1 教训）
const aaTStats = [];
let aaTClose = null;
for (let i = 0; i < 3; i++) {
  aaTStats.push(await rafRun('aa-open-tablet'));
  await sleep(500);
  aaTClose = await rafRun('aa-close');
  await sleep(650);
}
const aaTMedP95 = med(aaTStats, 'p95'), aaTMaxAll = Math.max(...aaTStats.map(x => x.max));
t('N-4 AllApps tablet sheet 中位P95≤200.1（12 vsync 档界，scrim blur 软渲染光栅波动）', aaTMedP95 <= 200.1, `med=${aaTMedP95} all=[${aaTStats.map(x => x.p95).join(',')}] maxAll=${aaTMaxAll}`);
t('N-4b AllApps tablet sheet maxAll≤416.8（25 vsync 档界留档）', aaTMaxAll <= 416.8, `maxAll=${aaTMaxAll}`);
t('N-4c AllApps tablet 关闭 P95≤250.1（15 vsync 留档）', aaTClose && aaTClose.p95 <= 250.1, `p95=${aaTClose && aaTClose.p95} max=${aaTClose && aaTClose.max}`);
await sleep(700);

// ============ N5：AllApps phone 600ms（390×844） ============
await page.setViewportSize({ width: 390, height: 844 });
await sleep(700);
const aaPStat = await rafRun('aa-open-tablet'); // openAllApps 按视口自选形态
const phForm = await page.evaluate(() => (document.getElementById('allAppsOverlay') || {}).getAttribute?.('data-form'));
t('N-5pre phone 形态确认', phForm === 'phone', `form=${phForm}`);
t('N-5 AllApps phone 抽屉 P95≤150.1（600ms 全屏抽屉）', aaPStat.p95 <= 150.1, `p95=${aaPStat.p95} max=${aaPStat.max} n=${aaPStat.n}`);
t('N-5b AllApps phone 抽屉 max≤416.8 留档', aaPStat.max <= 416.8, `max=${aaPStat.max}`);
await page.keyboard.press('Escape');
await sleep(800);
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(700);

// ============ P 组：split axis 旋转瞬间帧预算（R9 新发现） ============
console.log('P 组 split axis 旋转瞬间');
const splitOpen = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({ appAId: 'calculator', appBId: 'notes', rectA: { left: 300, top: 200, width: 220, height: 160 }, rectB: { left: 700, top: 200, width: 220, height: 160 }, ratio: 0.5 }); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1500);
const axis0 = await page.evaluate(() => (window.__splitInfo && window.__splitInfo().axis) || null);
t('P-1 分屏开启 axis=x（1024×768 横档）', splitOpen === 'OK' && axis0 === 'x', `ret=${splitOpen} axis=${axis0}`);
// P-3/P-5：2 次往返采样（x→y 正向 ×2 / y→x 回旋 ×2）取均值降间歇翻转（n 小样本 P95=max 教训）
const armSampling = () => page.evaluate(() => {
  window.__d = []; let last = performance.now(); const t0 = last;
  const tick = (now) => { window.__d.push(now - last); last = now; if (now - t0 >= 1000) { const s = [...window.__d].sort((a, b) => a - b); window.__dStat = { n: window.__d.length, p95: +(s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)] || 0).toFixed(1), max: +s[s.length - 1].toFixed(1) }; } else requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
const rotXY = [], rotYX = [];
let firstAxis = null;
for (let i = 0; i < 2; i++) {
  await armSampling();
  await page.setViewportSize({ width: 343, height: 900 });
  await sleep(1300);
  const ax = await page.evaluate(() => { const inf = window.__splitInfo(); return { axis: inf.axis, active: inf.active }; });
  if (i === 0) firstAxis = ax;
  rotXY.push(await page.evaluate(() => window.__dStat));
  await armSampling();
  await page.setViewportSize({ width: 1024, height: 768 });
  await sleep(1300);
  rotYX.push(await page.evaluate(() => window.__dStat));
}
const avg = (arr, k) => +(arr.reduce((s, x) => s + x[k], 0) / arr.length).toFixed(1);
const xyAvgP95 = avg(rotXY, 'p95'), xyMaxAll = Math.max(...rotXY.map(x => x.max));
const yxAvgP95 = avg(rotYX, 'p95'), yxMaxAll = Math.max(...rotYX.map(x => x.max));
t('P-2 旋转瞬间 axis x→y 切换 + 会话在场', firstAxis && firstAxis.active === true && firstAxis.axis === 'y', `axis=${firstAxis && firstAxis.axis} active=${firstAxis && firstAxis.active}`);
t('P-3 正向旋转 均值P95≤200.1（12 vsync 档界，分屏重排+双 iframe——实测 133-183 跨 8-11 vsync）', xyAvgP95 <= 200.1, `avg=${xyAvgP95} all=[${rotXY.map(x => x.p95).join(',')}] maxAll=${xyMaxAll}`);
t('P-4 正向旋转 max≤416.8（25 vsync 档界留档）', xyMaxAll <= 416.8, `maxAll=${xyMaxAll}`);
const axis2 = await page.evaluate(() => (window.__splitInfo && window.__splitInfo().axis) || null);
t('P-5 回旋 y→x 中位均值P95≤416.8（回旋=竖→横面积扩大+双 iframe 重光栅档，实测 216-367）+ 最终 axis=x', axis2 === 'x' && yxAvgP95 <= 416.8, `axis=${axis2} avg=${yxAvgP95} all=[${rotYX.map(x => x.p95).join(',')}] maxAll=${yxMaxAll}`);
const ltRot = await takeLT();
t('P-6 旋转期 longtask max≤500.2 留档', ltRot.length === 0 || Math.max(...ltRot) <= 500.2, `lt=[${ltRot.slice(0, 6)}]`);
const exited = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('P-7 分屏收场零挂死', exited === 'OK', String(exited));

// ============ Q 组：新组件交互循环 longtask + heap ============
console.log('Q 组 交互循环 + heap');
await page.evaluate(() => { window.__lt = []; });
const cyc = await page.evaluate(async () => {
  const AA = await import('/js/all-apps.js');
  const WB = window.__widgetBoard;
  const D = await import('/js/desktop.js');
  const stats = { aa: 0, wb: 0, pg: 0 };
  for (let i = 0; i < 3; i++) { AA.openAllApps('sweep'); await new Promise(r => setTimeout(r, 450)); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await new Promise(r => setTimeout(r, 420)); stats.aa++; }
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
await page.screenshot({ path: 'docs/sweep/s11-desktop-final.png' });
await ctx.close();
await browser.close();
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
