// e2e-v83-scene-surface.mjs — #83 QQS→QS 同面展开三判据 E2E 核验（真跑）
// 判据①：同一 tile-id 在 QQS 与展开网格中位姿连续插值（progress 0/0.25/0.5/0.75 采样
//         rect 与 lerp(QQS位姿, 网格位姿, p) 逐分量吻合；交换帧两侧 rect 连续）
// 判据②：展开全程 #shadeColumn 零整列 translate 位移（rect 恒定断言）
// 判据③：展开后磁贴数量 = 全量集合（QQS 4 隐、网格 19 显）
// 附加：通知区退场/回程反向交接/零 pageerror/p=0.5 形态截图
//
// 用法：MD3_BASE=http://127.0.0.1:8080/ios-desktop/index.html?nolock=1 node scripts/e2e-v83-scene-surface.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'http://127.0.0.1:8080/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/e2e-v83';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, cond, detail = '') => {
  log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!cond) failures++;
};

const browser = await chromium.launch({
  executablePath: '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});

// ==================== 手机视口 412×915（QQS 场景语义仅窄屏） ====================
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
let pageErrors = 0;
page.on('pageerror', (e) => { pageErrors++; log('[pageerror]', e.message.slice(0, 200)); });

await page.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
await sleep(2500);
await page.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(400);
let ready = false;
for (let i = 0; i < 90; i++) {
  ready = await page.evaluate(() => document.querySelectorAll('.qs-tile-pill').length > 0);
  if (ready) break;
  await sleep(500);
}
check('S0 应用就绪（磁贴已渲染）', ready);

// 手势几何（与 pull-down-gesture 常量同源）：thresholdPx = 0.38H，sceneRangePx = 0.42H
const H = 915;
const TH = Math.round(H * 0.38);   // ≈348
const SR = H * 0.42;               // ≈384.3
const yFor = (p) => Math.round(8 + TH + SR * p); // 起手 y=8

// ① 段一：下拉开面板（Shade 场景）——末步精确落到 dy=TH（progress=1 → canvas 归零、
//    sceneTarget=0），保证基线采样时面板完全展开且场景进度为 0
await page.mouse.move(206, 8);
await page.mouse.down();
for (let y = 40; y <= 340; y += 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.move(206, Math.round(8 + TH));
await sleep(500); // 面板落定（squish→1、canvas 0%，位姿量测基准态）

const base = await page.evaluate(() => {
  const R = (el) => el.getBoundingClientRect();
  const qqsFirst = document.querySelector('#qqsTilesContainer .qs-tile-pill');
  return {
    qqsId: qqsFirst.dataset.tileId,
    r0: R(qqsFirst),
    shadeTop: R(document.getElementById('shadeColumn')).top,
  };
});
check('S1 Shade 场景基线：QQS 首磁贴在场 + tile-id 取得', !!base.qqsId && base.r0.width > 100,
  JSON.stringify({ id: base.qqsId, w: Math.round(base.r0.width) }));
const shadeTop0 = base.shadeTop;

// ② 段二：继续下拉驱动同面展开，途中采样 p=0.25/0.5/0.75（不松手）
const samples = {};
for (const p of [0.25, 0.5, 0.75]) {
  await page.mouse.move(206, yFor(p), { steps: 6 });
  await sleep(120); // rAF 帧落地
  samples[p] = await page.evaluate(() => {
    const R = (el) => el.getBoundingClientRect();
    const qqsFirst = document.querySelector('#qqsTilesContainer .qs-tile-pill');
    const col = document.getElementById('qsColumn');
    return {
      morph: R(qqsFirst),
      shadeTop: R(document.getElementById('shadeColumn')).top,
      qsOpacity: getComputedStyle(col).opacity,
    };
  });
  if (p === 0.5) await page.screenshot({ path: `${OUT}/morph-mid.png` });
}
check('S2 判据②：#shadeColumn 全程零整列位移（top 恒定）',
  Math.abs(samples[0.25].shadeTop - shadeTop0) < 0.5 &&
  Math.abs(samples[0.5].shadeTop - shadeTop0) < 0.5 &&
  Math.abs(samples[0.75].shadeTop - shadeTop0) < 0.5,
  JSON.stringify([shadeTop0, samples[0.25].shadeTop, samples[0.5].shadeTop, samples[0.75].shadeTop]));
check('S3 QS 叠加层透明度跟随（p=0.5 → opacity≈0.5）',
  Math.abs(parseFloat(samples[0.5].qsOpacity) - 0.5) < 0.02, samples[0.5].qsOpacity);

// 松手结算：p=0.75 → 过半结算 QS 场景（tweenScene(1) → 交接）
await page.mouse.up();
await sleep(900);

const end1 = await page.evaluate(() => {
  const R = (el) => el.getBoundingClientRect();
  const col = document.getElementById('qsColumn');
  const gridFirst = document.querySelector('#qsTilesContainer .qs-tile-pill');
  const gridAll = document.querySelectorAll('#qsTilesContainer .qs-tile-pill');
  return {
    gridFirstRect: R(gridFirst),
    gridCount: gridAll.length,
    gridVisible: [...gridAll].filter((el) => getComputedStyle(el).opacity !== '0').length,
    colShown: getComputedStyle(col).opacity === '1',
    notiAlpha: getComputedStyle(document.getElementById('notiPanelScroll')).opacity,
  };
});
// 用真实 tile-id 重取 QQS 首磁贴（S1 已存 id）
const end1b = await page.evaluate((id) => {
  const el = document.querySelector(`#qqsTilesContainer .qs-tile-pill[data-tile-id="${id}"]`);
  return { qqsHiddenById: el ? getComputedStyle(el).opacity === '0' : false };
}, base.qqsId);

check('S4 场景落定 QS：叠加层全显 + 交接完成（QQS 节点隐）',
  end1.colShown && end1b.qqsHiddenById,
  JSON.stringify({ shown: end1.colShown, swap: end1b.qqsHiddenById }));

// 判据①右端：交接后网格首磁贴 rect = lerp(r0, r1, 1)（位姿连续右端点）
const r1 = end1.gridFirstRect;
const lerp = (a, b, p) => a + (b - a) * p;
const poseErr = (rect, p) => ({
  x: Math.abs(rect.left - lerp(base.r0.left, r1.left, p)),
  y: Math.abs(rect.top - lerp(base.r0.top, r1.top, p)),
  w: Math.abs(rect.width - lerp(base.r0.width, r1.width, p)),
  h: Math.abs(rect.height - lerp(base.r0.height, r1.height, p)),
});
const TOL = 3.0;
let maxErr = 0;
for (const p of [0.25, 0.5, 0.75]) {
  const e = poseErr(samples[p].morph, p);
  maxErr = Math.max(maxErr, e.x, e.y, e.w, e.h);
  check(`S5 判据① p=${p} 位姿连续（lerp 偏差 <${TOL}px）`,
    e.x < TOL && e.y < TOL && e.w < TOL && e.h < TOL, JSON.stringify(e));
}
check('S6 判据③：展开后磁贴 = 全量集合（≥19 且全可见）',
  end1.gridCount >= 19 && end1.gridVisible === end1.gridCount,
  `n=${end1.gridCount} visible=${end1.gridVisible}`);
check('S7 QS 场景通知区已退场（opacity≈0）', parseFloat(end1.notiAlpha) < 0.05, end1.notiAlpha);

// ③ 回程：QS 场景上滑 → 途中反向采样 p≈0.5 → 松手回 Shade
// （反向拖拽基准=1：next = 1 + dy/(0.5H)；p=0.5 → dy=-229 → y=471）
await page.mouse.move(206, 700);
await page.mouse.down();
await sleep(80);
await page.mouse.move(206, 471, { steps: 6 });
await sleep(120);
const backMid = await page.evaluate(() => {
  const R = (el) => el.getBoundingClientRect();
  const qqsFirst = document.querySelector('#qqsTilesContainer .qs-tile-pill');
  return { morph: R(qqsFirst), shadeTop: R(document.getElementById('shadeColumn')).top };
});
const eBack = poseErr(backMid.morph, 0.5);
check('S8 判据① 回程 p=0.5 位姿连续（反向插值同轨）',
  eBack.x < TOL && eBack.y < TOL && eBack.w < TOL && eBack.h < TOL, JSON.stringify(eBack));
check('S9 判据② 回程同样成立（shadeColumn 零位移）', Math.abs(backMid.shadeTop - shadeTop0) < 0.5);
await page.mouse.move(206, TH, { steps: 6 });
await page.mouse.up();
await sleep(800);

const backEnd = await page.evaluate(() => {
  const col = document.getElementById('qsColumn');
  const qqsFirst = document.querySelector('#qqsTilesContainer .qs-tile-pill');
  const gridFirst = document.querySelector('#qsTilesContainer .qs-tile-pill');
  return {
    colHidden: getComputedStyle(col).opacity === '0' || getComputedStyle(col).visibility === 'hidden',
    qqsBack: qqsFirst ? getComputedStyle(qqsFirst).opacity !== '0' : false,
    gridHidden: gridFirst ? getComputedStyle(gridFirst).opacity === '0' : false,
    notiBack: parseFloat(getComputedStyle(document.getElementById('notiPanelScroll')).opacity) > 0.9,
    overlayActive: document.getElementById('pullPanelsOverlay').classList.contains('active'),
  };
});
check('S10 反向交接完成：面板保持打开 + QQS 复显 + 网格隐 + 通知回归',
  backEnd.overlayActive && backEnd.colHidden && backEnd.qqsBack && backEnd.gridHidden && backEnd.notiBack,
  JSON.stringify(backEnd));

check('S11 零 pageerror', pageErrors === 0, `errors=${pageErrors}`);
await page.screenshot({ path: `${OUT}/back-shade.png` });
await ctx.close();

// ==================== 平板视口 1180×820：split 分家免疫（叠加层还原） ====================
const ctx2 = await browser.newContext({ viewport: { width: 1180, height: 820 } });
const page2 = await ctx2.newPage();
let page2Errors = 0;
page2.on('pageerror', (e) => { page2Errors++; log('[pageerror][tablet]', e.message.slice(0, 200)); });
await page2.goto(LIVE, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
await sleep(2500);
await page2.evaluate(() => {
  const btn = document.querySelector('.power-dialog-card button[data-act="once"]');
  if (btn) btn.click();
});
await sleep(400);
let ready2 = false;
for (let i = 0; i < 90; i++) {
  ready2 = await page2.evaluate(() => document.querySelectorAll('.qs-tile-pill').length > 0);
  if (ready2) break;
  await sleep(500);
}
check('T0 平板就绪', ready2);
await page2.click('#statusBar', { position: { x: Math.round(1180 * 0.85), y: 14 }, force: true });
await sleep(1000);
const tablet = await page2.evaluate(() => {
  const col = document.getElementById('qsColumn');
  const s = getComputedStyle(col);
  return { position: s.position, opacity: s.opacity, visible: s.visibility };
});
check('T1 split 分家：QS 列还原文档流（relative + 全显）',
  tablet.position === 'relative' && tablet.opacity === '1' && tablet.visible === 'visible',
  JSON.stringify(tablet));
check('T2 平板零 pageerror', page2Errors === 0, `errors=${page2Errors}`);
await ctx2.close();

await browser.close();
log(failures === 0 ? '\n=== ALL PASS ===' : `\n=== ${failures} FAILURES ===`);
process.exit(failures === 0 ? 0 : 1);
