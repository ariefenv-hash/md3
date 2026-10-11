// e2e-v772.mjs — v7.72 官方预测性返回 + M3E 组件全家桶 真实浏览器核验（Playwright 390×844）
// ① 通用应用（settings）页栈预测性返回：官方映射中途帧（缩放<1/透明度<1/圆角>0）
//    + 取消回弹零残留 + 提交出栈干净
// ② files 手势桥官方映射：progress 居中缩放+淡换（不横滑）+ commit 缩放淡出
// ③ M3E 三组件：SplitButton FAB（lead 直建/trail 菜单+spin）/ connected ButtonGroup
//    列表网格切换 / LoadingIndicator 导入 snack（真实文件导入）
// ④ 子页类转场（fjSubOut 官方关键帧）+ 帧间隙探针 + 全程零 pageerror
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT || 8095;
const BASE = `http://localhost:${PORT}/ios-desktop/index.html?nolock=1`;
const OUT = '/home/z/my-project/e2e-v772';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, cond, detail = '') => {
  log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!cond) failures++;
};
const pose = (mtx) => {
  const m = /matrix\(([^)]+)\)/.exec(mtx || '');
  if (!m) return { a: 1, d: 1 };
  const p = m[1].split(',').map(parseFloat);
  return { a: p[0], d: p[3] }; // scale x/y
};

const browser = await chromium.launch({ args: ['--force-device-scale-factor=2'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
let errors = 0;
page.on('pageerror', (e) => { errors++; log('[pageerror]', e.message.slice(0, 200)); });
await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1400);

// ---------- ⓪ 帧间隙探针 ----------
log('--- ⓪ frame-gap probe armed');
await page.evaluate(() => {
  window.__gaps = [];
  window.__deltas = [];
  window.__frames = 0;
  let last = performance.now();
  const loop = (t) => {
    if (window.__probeOff) return;
    const d = t - last; last = t;
    window.__frames++;
    if (window.__deltas.length < 30000) window.__deltas.push(d);
    if (d > 34) window.__gaps.push(Math.round(d));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});

// ---------- ① 通用应用页栈：官方预测性返回 ----------
log('--- ① settings page-stack predictive back (official)');
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="settings"]');
  if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});
await sleep(1500);
await page.evaluate(() => { window.pushSubPage(1); });
await sleep(560);

// 取消路径：60px（< 25% 屏宽提交阈值）+ 慢速拖拽（末段微移压速度，防 fling 误提交）
const cancelRun = await page.evaluate(async () => {
  const G = window.__handleIframeGesture;
  const active = document.getElementById('app-page-settings-1');
  const prev = document.getElementById('app-page-settings-0');
  G('down', 2, 420, 'EDGE_LEFT');
  await new Promise((r) => setTimeout(r, 100)); // down→首段拉开 100ms（防相邻调用假速度触发 fling 提交）
  G('move', 15, 421); // 过 slop 确认方向（全程慢速分段，速度均值压在 400px/s 以下）
  await new Promise((r) => setTimeout(r, 100));
  G('move', 30, 421);
  await new Promise((r) => setTimeout(r, 100));
  G('move', 45, 421);
  await new Promise((r) => setTimeout(r, 100));
  G('move', 60, 421);
  await new Promise((r) => setTimeout(r, 100));
  const mid = {
    op: getComputedStyle(active).opacity,
    mtx: getComputedStyle(active).transform,
    rad: getComputedStyle(active).borderRadius,
    prevOp: getComputedStyle(prev).opacity,
    prevMtx: getComputedStyle(prev).transform,
  };
  G('up');
  await new Promise((r) => setTimeout(r, 900));
  const rest = {
    op: getComputedStyle(active).opacity,
    mtx: getComputedStyle(active).transform,
    rad: getComputedStyle(active).borderRadius,
    stillOn: !!document.getElementById('appTitle') && document.getElementById('appTitle').textContent !== '设置',
  };
  return { mid, rest };
});
{
  const { a } = pose(cancelRun.mid.mtx);
  check('中途帧：顶页缩放 <1（官方 Exit Scale 100→90%）', a > 0.85 && a < 1, `scale=${a.toFixed(4)} mtx=${cancelRun.mid.mtx}`);
  check('中途帧：顶页透明度 <1（官方 Exit Fade 进行中）', parseFloat(cancelRun.mid.op) < 1, `op=${cancelRun.mid.op}`);
  check('中途帧：圆角已出现（>0）', parseFloat(cancelRun.mid.rad) > 0, `rad=${cancelRun.mid.rad}`);
  check('中途帧：顶页无横向滑动（官方居中缩放，tx=0）', cancelRun.mid.mtx.indexOf('matrix(1, 0, 0, 1, 0,') === 0 || Math.abs((cancelRun.mid.mtx.match(/matrix\(([^)]+)\)/) || [])[1]?.split(',')[4] || 0) < 0.5, cancelRun.mid.mtx);
  const po = parseFloat(cancelRun.mid.prevOp);
  const { a: pa } = pose(cancelRun.mid.prevMtx);
  check('中途帧：底页 Enter 形态（透明度≥0、scale≥1）', po >= 0 && po < 1 && pa >= 1 - 1e-6, `op=${po} scale=${pa.toFixed(4)}`);
  const { a: ra } = pose(cancelRun.rest.mtx);
  check('取消回弹：顶页全屏零残留（scale=1/opacity=1/radius=0）', Math.abs(ra - 1) < 0.01 && parseFloat(cancelRun.rest.op) === 1 && parseFloat(cancelRun.rest.rad) === 0, JSON.stringify(cancelRun.rest));
}
await page.screenshot({ path: `${OUT}/1-settings-after-cancel.png` });

// 提交路径：300px（> 97.5px 阈值，带 fling 速度）
const commitRun = await page.evaluate(async () => {
  const G = window.__handleIframeGesture;
  const active = document.getElementById('app-page-settings-1');
  const prev = document.getElementById('app-page-settings-0');
  G('down', 2, 420, 'EDGE_LEFT');
  G('move', 20, 421);
  await new Promise((r) => setTimeout(r, 40));
  G('move', 300, 421);
  await new Promise((r) => setTimeout(r, 30));
  const midOp = getComputedStyle(active).opacity;
  G('up');
  await new Promise((r) => setTimeout(r, 1100));
  return {
    midOp,
    activeOp: getComputedStyle(active).opacity,
    activeMtx: getComputedStyle(active).transform,
    prevOp: getComputedStyle(prev).opacity,
    prevMtx: getComputedStyle(prev).transform,
    title: document.getElementById('appTitle') ? document.getElementById('appTitle').textContent : '',
  };
});
{
  check('提交中途：顶页已全隐（官方 35% 阈值前完成淡出）', parseFloat(commitRun.midOp) === 0, `op=${commitRun.midOp}`);
  const { a } = pose(commitRun.activeMtx);
  check('提交落定：子页已出栈（回最右侧待命位 100%/opacity 0）', parseFloat(commitRun.activeOp) === 0 && a === 1, `op=${commitRun.activeOp} mtx=${commitRun.activeMtx}`);
  const { a: pa } = pose(commitRun.prevMtx);
  check('提交落定：上级页恢复全显自然位', parseFloat(commitRun.prevOp) === 1 && Math.abs(pa - 1) < 0.01, `op=${commitRun.prevOp} scale=${pa.toFixed(4)}`);
  check('标题已切回根页', commitRun.title === '设置', commitRun.title);
}
await page.screenshot({ path: `${OUT}/2-settings-after-commit.png` });

// 关闭设置应用（归位），转入 files 场景
await page.evaluate(() => { window.closeApp ? window.closeApp() : document.dispatchEvent(new CustomEvent('noop')); });
await sleep(900);

// ---------- ② files 应用：M3E 三组件 + 手势桥官方映射 ----------
log('--- ② files M3E components');
await page.evaluate(async () => {
  const V = window.__vfs;
  await V.ready.catch(() => {});
  await V.mkdir('/m3e').catch(() => {});
  await V.write('/m3e/a.txt', 'alpha', { owner: 'e2e' });
  await V.write('/m3e/b.txt', 'beta', { owner: 'e2e' });
});
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="files"]');
  if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});
await sleep(1500);

const sb = await page.evaluate(() => {
  const fab = document.getElementById('fjFab');
  const lead = document.getElementById('fjFabLead');
  const trail = document.getElementById('fjFabMenu');
  return {
    isSplit: !!fab && fab.classList.contains('m3e-splitbtn'),
    hasLeadTrail: !!lead && !!trail,
    leadLbl: lead ? lead.textContent.trim() : '',
  };
});
check('FAB 已升级 M3E SplitButton（lead+trail）', sb.isSplit && sb.hasLeadTrail, JSON.stringify(sb));

// lead 点击 → 直接新建文件夹对话框
const leadClick = await page.evaluate(async () => {
  document.getElementById('fjFabLead').click();
  await new Promise((r) => setTimeout(r, 160));
  const dlg = document.getElementById('fjDialog');
  return { on: dlg.classList.contains('on'), title: document.getElementById('fjDlgTitle').textContent };
});
check('SplitButton lead：直建对话框（新建文件夹）', leadClick.on && leadClick.title === '新建文件夹', JSON.stringify(leadClick));
await page.evaluate(() => {
  document.getElementById('fjDlgCancel').click();
});
await sleep(240);

// trail 点击 → 菜单弹层 + spin/open 形态
const trailClick = await page.evaluate(async () => {
  document.getElementById('fjFabMenu').click();
  await new Promise((r) => setTimeout(r, 160));
  const fab = document.getElementById('fjFab');
  const sheet = document.getElementById('fjSheetWrap');
  return { open: fab.classList.contains('m3e-sb-open'), sheetOn: sheet.classList.contains('on'), items: document.querySelectorAll('#fjSheet [data-n]').length };
});
check('SplitButton trail：菜单弹层 + m3e-sb-open 拖尾变形', trailClick.open && trailClick.sheetOn && trailClick.items >= 3, JSON.stringify(trailClick));
await page.evaluate(() => {
  document.querySelector('#fjSheetWrap .fj-mscrim').click();
});
await sleep(300);
await page.screenshot({ path: `${OUT}/3-files-splitbtn.png` });

// ButtonGroup：浏览页列表/网格
const bg = await page.evaluate(async () => {
  const tab = document.querySelector('.fj-nitem[data-tab="2"]');
  if (tab) tab.click();
  await new Promise((r) => setTimeout(r, 700));
  const grp = document.querySelector('#fjBrowseList .m3e-btngroup');
  const segN = grp ? grp.querySelectorAll('.m3e-bg-seg').length : 0;
  const gridSeg = grp ? grp.querySelector('[data-view="grid"]') : null;
  if (gridSeg) gridSeg.click();
  await new Promise((r) => setTimeout(r, 300));
  // renderBrowseList 会重建 chips 行 —— 重新查询新节点
  const grp2 = document.querySelector('#fjBrowseList .m3e-btngroup');
  const gridOn = grp2 ? grp2.querySelector('[data-view="grid"]').classList.contains('on') : false;
  const gwrap = !!document.querySelector('#fjBrowseList .fj-gwrap');
  return { hasGrp: !!grp, segN, gridOn, gwrap };
});
check('connected ButtonGroup 在场（列表|网格 两段）', bg.hasGrp && bg.segN === 2, JSON.stringify(bg));
check('网格段激活 + 网格视图渲染', bg.gridOn && bg.gwrap, JSON.stringify(bg));

// LoadingIndicator：真实文件导入 → sticky snack + 七形指示器（先布好逐帧轮询，捕捉短命 loader）
await page.evaluate(() => {
  window.__sawLoader = new Promise((res) => {
    const t0 = performance.now();
    const poll = () => {
      const l = document.getElementById('fjSnackLoader');
      if (l && l.classList.contains('m3e-loader')) return res(JSON.stringify({ canvas: !!l.querySelector('canvas') }));
      if (performance.now() - t0 > 6000) return res(null);
      requestAnimationFrame(poll);
    };
    poll();
  });
});
const fileInput = await page.$('#fjFileInput');
await fileInput.setInputFiles([
  { name: 'e2e-big1.bin', mimeType: 'application/octet-stream', buffer: Buffer.alloc(300 * 1024, 7) },
  { name: 'e2e-big2.bin', mimeType: 'application/octet-stream', buffer: Buffer.alloc(300 * 1024, 9) },
  { name: 'e2e-big3.bin', mimeType: 'application/octet-stream', buffer: Buffer.alloc(300 * 1024, 11) },
]);
const loaderSeen = await page.evaluate(() => window.__sawLoader);
check('M3E LoadingIndicator 挂载（canvas 引擎，导入期间在场）', !!loaderSeen, String(loaderSeen));
await sleep(1800);
const importDone = await page.evaluate(() => document.getElementById('fjSnack').textContent);
check('导入完成收尾（成功 3 个）', /导入完成/.test(importDone) && /3/.test(importDone), importDone);
await page.screenshot({ path: `${OUT}/4-files-import-loader.png` });

// ---------- ③ files 手势桥：官方映射 ----------
log('--- ③ files gesture bridge (official mapping)');
await page.evaluate(async () => {
  // 切回列表视图（ButtonGroup 场景后网格在驶）—— .fj-row 才在场
  const grp = document.querySelector('#fjBrowseList .m3e-btngroup');
  const listSeg = grp ? grp.querySelector('[data-view="list"]') : null;
  if (listSeg && !listSeg.classList.contains('on')) listSeg.click();
  await new Promise((r) => setTimeout(r, 300));
});
await sleep(200);
await page.evaluate(() => {
  const row = [...document.querySelectorAll('#fjBrowse .fj-row')].find((r) => r.dataset.type === 'dir');
  if (row) row.click();
});
await sleep(460);
const ges = await page.evaluate(async () => {
  const PB = window.__filesPB;
  if (!PB) return { err: 'no __filesPB' };
  const scr = document.querySelector('.fj-screen.on');
  const sub = document.getElementById('fjSub');
  PB.beginGesture();
  PB.progressGesture(60);
  const drag = {
    tf: sub.style.transform,
    op: sub.style.opacity,
    rad: sub.style.borderRadius,
    scrTf: scr.style.transform,
    scrOp: scr.style.opacity,
  };
  PB.progressGesture(150);
  const drag2 = { tf: sub.style.transform, op: sub.style.opacity };
  PB.endGesture(true);
  const commit = { tf: sub.style.transform, op: sub.style.opacity, rad: sub.style.borderRadius };
  await new Promise((r) => setTimeout(r, 420));
  return {
    drag, drag2, commit,
    subGone: !sub.classList.contains('on'),
    scrInline: scr.style.transform + '/' + scr.style.opacity,
  };
});
if (ges.err) {
  check('手势桥在位', false, ges.err);
} else {
  // dx=60 → p=ease(60/195)=0.6166 → scale 0.9383 / op 0（0.6166>0.35 已全隐？0.6166/0.35=1.76 → 0）
  check('拖拽 60px：顶页居中缩放（无横滑）', /^scale\(0\.9[0-9]+\)$/.test(ges.drag.tf) || /^scale\(1\.0/.test(ges.drag.tf), ges.drag.tf);
  check('拖拽 60px：圆角随进度出现', parseFloat(ges.drag.rad) > 0 && parseFloat(ges.drag.rad) <= 28, ges.drag.rad);
  check('拖拽 150px：顶页已全隐（官方 35% 阈值）', ges.drag2.op === '0', ges.drag2.tf + ' / ' + ges.drag2.op);
  check('底层页 Enter：scale ≥1 且透明度随进度', /^scale\(1\.0/.test(ges.drag.scrTf) && parseFloat(ges.drag.scrOp) >= 0, ges.drag.scrTf + ' / ' + ges.drag.scrOp);
  check('commit：顶页官方终态 scale(0.9)+透明+28px 圆角', ges.commit.tf === 'scale(0.9)' && ges.commit.op === '0' && ges.commit.rad === '28px', JSON.stringify(ges.commit));
  check('commit settle：子页已关 + 底层 inline 清零', ges.subGone === true && ges.scrInline === '/', ges.scrInline);
}
await page.screenshot({ path: `${OUT}/5-files-after-gesture.png` });

// ---------- ④ 类转场回归：closeSub 官方 fjSubOut ----------
log('--- ④ closeSub class transition');
await page.evaluate(async () => {
  // 确保在列表视图且子页已关（手势桥场景后 S.sub=null）
  const grp = document.querySelector('#fjBrowseList .m3e-btngroup');
  const listSeg = grp ? grp.querySelector('[data-view="list"]') : null;
  if (listSeg && !listSeg.classList.contains('on')) listSeg.click();
  await new Promise((r) => setTimeout(r, 260));
});
const clsRun = await page.evaluate(async () => {
  const row = [...document.querySelectorAll('#fjBrowse .fj-row')].find((r) => r.dataset.type === 'dir');
  if (!row) return { err: 'no dir row' };
  row.click();
  await new Promise((r) => setTimeout(r, 80)); // fjSubIn 0.34s 进行期内采样
  const sub = document.getElementById('fjSub');
  const animIn = getComputedStyle(sub).animationName;
  await new Promise((r) => setTimeout(r, 420)); // 等进场结束再触发返回
  document.getElementById('fjSubBack').click();
  await new Promise((r) => setTimeout(r, 60));
  const outName = getComputedStyle(sub).animationName;
  const outDur = getComputedStyle(sub).animationDuration;
  await new Promise((r) => setTimeout(r, 460));
  return { animIn, outName, outDur, closed: !sub.classList.contains('on') };
});
if (clsRun.err) check('目录行在场', false, clsRun.err);
else {
  check('子页进场 fjSubIn（前进共享轴保留）', clsRun.animIn === 'fjSubIn', clsRun.animIn);
  check('子页退场 fjSubOut（官方缩放淡换）', clsRun.outName === 'fjSubOut', clsRun.outName + ' ' + clsRun.outDur);
  check('退场结束子页关闭零残留', clsRun.closed === true, '');
}

// ---------- ⑤ 帧率收尾 ----------
log('--- ⑤ frame stats');
const stats = await page.evaluate(() => {
  window.__probeOff = true;
  const d = window.__deltas.slice().sort((a, b) => a - b);
  const p95 = d.length ? d[Math.floor(d.length * 0.95)] : 0;
  return { frames: window.__frames, p95, gaps: window.__gaps, max: d.length ? d[d.length - 1] : 0 };
});
check('帧采样充足', stats.frames > 300, `n=${stats.frames}`);
check('P95 帧间隙健康（<50ms）', stats.p95 < 50, `p95=${stats.p95}ms`);
check('无 >250ms 卡死帧', stats.gaps.filter((g) => g > 250).length === 0, `gaps>34ms: ${stats.gaps.length} 个, max=${stats.max}ms`);
check('零 pageerror', errors === 0, `errors=${errors}`);

log(`\n===== e2e-v772: ${failures === 0 ? 'ALL PASS' : failures + ' FAILURES'} =====`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
