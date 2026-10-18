// e2e-v784-unified.mjs — v7.84 统一 Shade（AOSP 17 ShadeScene 1:1）E2E 核验
// ① 手机：顶部下拉 → Shade 场景（小头部 + QQS 2×2 大磁贴 72dp + 通知）
// ② 继续下拉 → QS 场景跟手展开（track translateY -50% + 大钟头部 + 亮度 + 磁贴 + footer）
// ③ QS 场景上滑 → 回 Shade 场景；Shade 场景上滑 → 收起
// ④ 磁贴源码几何：72dp 高 / 未激活圆角 50px（72 高钳制全胶囊）/ 底座 56 / QQS span2（≈半面板宽）
// ⑤ 平板 ≥600px：split 双列（QS 列 | 通知列）+ header 跨列 + QQS 隐藏 + 无场景切换
// ⑥ 双端零 pageerror
//
// 用法：MD3_BASE=http://127.0.0.1:8791/md3/ios-desktop/index.html?nolock=1 node scripts/e2e-v784-unified.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'https://ariefenv-hash.github.io/md3/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/e2e-v784';
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

// ==================== 手机视口 412×915 ====================
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
check('P0 应用就绪（磁贴已渲染，双容器合计）', ready);

// ① 段一下拉（0.38H≈348px 停手）→ Shade 场景
await page.mouse.move(206, 8);
await page.mouse.down();
for (let y = 40; y <= 340; y += 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.up();
await sleep(900);
await page.screenshot({ path: `${OUT}/phone-shade-scene.png` });

const shadeState = await page.evaluate(() => {
  const track = document.getElementById('pullPanelsTrack');
  const overlay = document.getElementById('pullPanelsOverlay');
  const csh = document.querySelector('.collapsed-shade-header');
  const qqs = document.getElementById('qqsTilesContainer');
  const qqsPills = qqs ? qqs.querySelectorAll('.qs-tile-pill') : [];
  const first = qqsPills[0];
  const R = (el) => el?.getBoundingClientRect();
  return {
    overlayActive: overlay?.classList.contains('active'),
    trackY: track ? track.style.transform : '',
    cshVisible: csh && R(csh).height > 30,
    qqsCount: qqsPills.length,
    firstW: R(first)?.width ?? NaN,
    firstH: R(first)?.height ?? NaN,
    panelW: R(track)?.width ?? NaN,
  };
});
check('P1 面板打开且场景轨在 Shade 位（translateY 0）',
  shadeState.overlayActive && (shadeState.trackY.includes('0px') || shadeState.trackY.includes('matrix')),
  shadeState.trackY);
check('P2 CollapsedShadeHeader 单行小头部可见', shadeState.cshVisible);
check('P3 QQS = 4 大磁贴（internet/bt/dnd/cast 源码集合）', shadeState.qqsCount === 4, `n=${shadeState.qqsCount}`);
check('P4 QQS 大磁贴 span2 ≈ 内容区半宽（±8px）+ 72dp 高（squish=1 时）',
  Math.abs(shadeState.firstW - (shadeState.panelW - 40) / 2) < 8 && Math.abs(shadeState.firstH - 72) < 3,
  JSON.stringify({ w: shadeState.firstW, h: shadeState.firstH, expect: (shadeState.panelW - 40) / 2 }));

// ② 段二继续下拉 → QS 场景
await page.mouse.move(206, 400);
await page.mouse.down();
for (let y = 430; y <= 700; y += 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.up();
await sleep(900);
await page.screenshot({ path: `${OUT}/phone-qs-scene.png` });

const qsState = await page.evaluate(() => {
  const track = document.getElementById('pullPanelsTrack');
  const header = document.querySelector('#qsColumn .panel-header');
  const brightness = document.getElementById('qsBrightnessBar');
  const footer = document.querySelector('.qs-footer');
  const pill = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="torch"]') // 未激活磁贴;
  const R = (el) => el?.getBoundingClientRect();
  return {
    trackY: track ? track.style.transform : '',
    trackTransition: track ? track.style.transition : '',
    bigClockVisible: header && R(header).height > 100,
    brightnessVisible: !!brightness && R(brightness).height > 20,
    footerVisible: !!footer && R(footer).height > 20,
    pillH: R(pill)?.height ?? NaN,
    pillRadius: pill ? getComputedStyle(pill).borderRadius : '',
  };
});
check('P5 场景轨补间落到 QS 位（translateY -50%）', qsState.trackY.includes('-50') || /matrix\(1, 0, 0, 1, 0, -\d+/.test(qsState.trackY), qsState.trackY);
check('P6 QS 场景：大钟头部（120dp）+ 亮度 + footer 全可见',
  qsState.bigClockVisible && qsState.brightnessVisible && qsState.footerVisible);
check('P7 QS 磁贴 72dp（源码 TileHeight）', Math.abs(qsState.pillH - 72) < 3, `h=${qsState.pillH}`);
// getComputedStyle.borderRadius 返回指定值（源码字面 50dp）；渲染时浏览器按比例钳制
// （50+50=100 > 72 高 → f=0.72 → 视觉 36px 全胶囊，源码 50dp 在 72dp 高同构钳制）
check('P8 未激活圆角指定值 = 50px（源码 common_tile_default_inactive_tile_corner_radius）', qsState.pillRadius === '50px', `r=${qsState.pillRadius}`);

// ③ QS 场景上滑 → 回 Shade
await page.mouse.move(206, 300);
await page.mouse.down();
for (let y = 280; y >= 120; y -= 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.up();
await sleep(900);
const backShade = await page.evaluate(() => {
  const track = document.getElementById('pullPanelsTrack');
  const overlay = document.getElementById('pullPanelsOverlay');
  return { y: track.style.transform, active: overlay.classList.contains('active') };
});
check('P9 QS 上滑回 Shade 场景且面板保持打开', backShade.active && (backShade.y.includes('0px') || backShade.y.includes('matrix(1, 0, 0, 1, 0, 0)')), backShade.y);

// ④ Shade 场景上滑 → 收起
await page.mouse.move(206, 300);
await page.mouse.down();
for (let y = 280; y >= 80; y -= 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.up();
await sleep(800);
const closed = await page.evaluate(() => !document.getElementById('pullPanelsOverlay').classList.contains('active'));
check('P10 Shade 上滑收起面板', closed);
check('P11 手机零 pageerror', pageErrors === 0, `errors=${pageErrors}`);
await ctx.close();

// ==================== 平板视口 1180×820 ====================
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
await page2.screenshot({ path: `${OUT}/tablet-split-shade.png` });

const tablet = await page2.evaluate(() => {
  const track = document.getElementById('pullPanelsTrack');
  const qqs = document.getElementById('qqsArea');
  const csh = document.querySelector('.collapsed-shade-header');
  const qsCol = document.getElementById('qsColumn');
  const notiCol = document.getElementById('notiPanelScroll');
  const pill = document.querySelector('#qsTilesContainer .qs-tile-pill');
  const R = (el) => el?.getBoundingClientRect();
  const qsR = R(qsCol), notiR = R(notiCol), cshR = R(csh);
  return {
    trackTransform: track ? getComputedStyle(track).transform : '',
    qqsHidden: qqs ? getComputedStyle(qqs).display === 'none' : true,
    headerSpans: cshR && (cshR.width > R(track).width * 0.9),
    qsLeft: qsR && qsR.left < 100,
    notiRight: notiR && notiR.left > R(track).width * 0.45,
    sameRow: qsR && notiR && Math.abs(qsR.top - notiR.top) < 80,
    pillH: R(pill)?.height ?? NaN,
  };
});
check('T1 平板无场景切换（track 无位移）', tablet.trackTransform === 'none' || tablet.trackTransform.includes('matrix(1, 0, 0, 1, 0, 0)'), tablet.trackTransform);
check('T2 QQS 隐藏（split 无 QQS 概念）', tablet.qqsHidden);
check('T3 CollapsedShadeHeader 跨双列', tablet.headerSpans);
check('T4 双列布局：QS 列左 | 通知列右 | 同行', tablet.qsLeft && tablet.notiRight && tablet.sameRow);
check('T5 平板磁贴 72dp（源码基础值全形态同源，96px 拟合退役）', Math.abs(tablet.pillH - 72) < 3, `h=${tablet.pillH}`);
check('T6 平板零 pageerror', page2Errors === 0, `errors=${page2Errors}`);
await ctx2.close();

await browser.close();
log(failures === 0 ? '\n=== ALL PASS ===' : `\n=== ${failures} FAILURES ===`);
process.exit(failures === 0 ? 0 : 1);
