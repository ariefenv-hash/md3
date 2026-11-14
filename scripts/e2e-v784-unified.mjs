// e2e-v784-unified.mjs — v7.84 统一 Shade（AOSP 17 ShadeScene 1:1）E2E 核验
// ① 手机：顶部下拉 → Shade 场景（小头部 + QQS 2×2 大磁贴 72dp + 通知）
// ② 继续下拉 → QS 场景跟手展开（v9.97 #83 同面展开：QQS 磁贴位姿插值 + 折叠磁贴渐现 +
//    QS 叠加层显现，旧整轨 translateY -50% 翻页退役；大钟头部 + 亮度 + 磁贴 + footer）
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
  const overlay = document.getElementById('pullPanelsOverlay');
  const csh = document.querySelector('.collapsed-shade-header');
  const qqs = document.getElementById('qqsTilesContainer');
  const qsCol = document.getElementById('qsColumn');
  const qqsPills = qqs ? qqs.querySelectorAll('.qs-tile-pill') : [];
  const first = qqsPills[0];
  const R = (el) => el?.getBoundingClientRect();
  return {
    overlayActive: overlay?.classList.contains('active'),
    // v9.97 #83 场景 0 语义：QS 叠加层隐藏（opacity 0）+ QQS 磁贴在场（旧 trackY 断言随翻页退役）
    qsColHidden: qsCol ? getComputedStyle(qsCol).opacity === '0' || getComputedStyle(qsCol).visibility === 'hidden' : false,
    qqsVisible: first ? getComputedStyle(first).opacity !== '0' : false,
    cshVisible: csh && R(csh).height > 30,
    qqsCount: qqsPills.length,
    firstW: R(first)?.width ?? NaN,
    firstH: R(first)?.height ?? NaN,
    panelW: R(document.getElementById('pullPanelsTrack'))?.width ?? NaN,
  };
});
check('P1 面板打开且场景在 Shade 位（QS 叠加层隐藏 + QQS 磁贴在场）',
  shadeState.overlayActive && shadeState.qsColHidden && shadeState.qqsVisible,
  JSON.stringify({ qsColHidden: shadeState.qsColHidden, qqsVisible: shadeState.qqsVisible }));
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
  const qsCol = document.getElementById('qsColumn');
  const qqsFirst = document.querySelector('#qqsTilesContainer .qs-tile-pill');
  const header = document.querySelector('#qsColumn .panel-header');
  const brightness = document.getElementById('qsBrightnessBar');
  const footer = document.querySelector('.qs-footer');
  const gridPills = document.querySelectorAll('#qsTilesContainer .qs-tile-pill');
  const pill = document.querySelector('#qsTilesContainer .qs-tile-pill[data-tile-id="torch"]') // 未激活磁贴;
  const R = (el) => el?.getBoundingClientRect();
  const colStyle = qsCol ? getComputedStyle(qsCol) : {};
  return {
    // v9.97 #83 场景 1 语义：QS 叠加层全显 + 交接完成（QQS 节点隐、全量网格在场）
    qsColShown: colStyle.opacity === '1' && colStyle.visibility === 'visible',
    swapDone: qqsFirst ? getComputedStyle(qqsFirst).opacity === '0' : false,
    gridCount: gridPills.length,
    bigClockVisible: header && R(header).height > 100,
    brightnessVisible: !!brightness && R(brightness).height > 20,
    footerVisible: !!footer && R(footer).height > 20,
    pillH: R(pill)?.height ?? NaN,
    pillRadius: pill ? getComputedStyle(pill).borderRadius : '',
  };
});
check('P5 场景落到 QS 位（v9.97 #83：QS 叠加层全显 + 节点交接完成）',
  qsState.qsColShown && qsState.swapDone && qsState.gridCount > 4,
  JSON.stringify({ shown: qsState.qsColShown, swap: qsState.swapDone, n: qsState.gridCount }));
check('P5b 展开后磁贴 = 全量集合（#83 判据③）', qsState.gridCount >= 19, `n=${qsState.gridCount}`);
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
  const overlay = document.getElementById('pullPanelsOverlay');
  const qsCol = document.getElementById('qsColumn');
  const qqsFirst = document.querySelector('#qqsTilesContainer .qs-tile-pill');
  const colStyle = qsCol ? getComputedStyle(qsCol) : {};
  return {
    active: overlay.classList.contains('active'),
    // v9.97 #83 回程语义：QS 叠加层归隐 + 反向交接完成（QQS 节点复显）
    qsColHidden: colStyle.opacity === '0' || colStyle.visibility === 'hidden',
    swapReverted: qqsFirst ? getComputedStyle(qqsFirst).opacity !== '0' : false,
  };
});
check('P9 QS 上滑回 Shade 场景且面板保持打开（叠加层归隐 + 反向交接）',
  backShade.active && backShade.qsColHidden && backShade.swapReverted,
  JSON.stringify(backShade));

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
await page2.screenshot({ path: `${OUT}/tablet-single-shade.png` });

const tablet = await page2.evaluate(() => {
  const track = document.getElementById('pullPanelsTrack');
  const qqs = document.getElementById('qqsArea');
  const csh = document.querySelector('.collapsed-shade-header');
  const qsCol = document.getElementById('qsColumn');
  const notiCol = document.getElementById('notiPanelScroll');
  const pill = document.querySelector('#qsTilesContainer .qs-tile-pill');
  const R = (el) => el?.getBoundingClientRect();
  const qsR = R(qsCol), notiR = R(notiCol), cshR = R(csh);
  const trackDisplay = track ? getComputedStyle(track).display : '';
  return {
    trackTransform: track ? getComputedStyle(track).transform : '',
    qqsHidden: qqs ? getComputedStyle(qqs).display === 'none' : true,
    headerSpans: cshR && (cshR.width > R(track).width * 0.9),
    // v11.23：分家 grid 退役 → track 非网格布局；通知列纵堆在 header 之下
    stackCol: trackDisplay !== 'grid' && notiR && cshR && notiR.top > cshR.bottom - 6,
    trackDisplay,
    pillH: R(pill)?.height ?? NaN,
  };
});
check('T1 平板开面板（track 基准位无位移）', tablet.trackTransform === 'none' || tablet.trackTransform.includes('matrix(1, 0, 0, 1, 0, 0)'), tablet.trackTransform);
check('T2 QQS 常显（v11.23：宽屏回归 Single 手风琴，分家隐藏退役）', !tablet.qqsHidden, `display=${tablet.qqsHidden ? 'none' : 'shown'}`);
check('T3 CollapsedShadeHeader 全宽单行', tablet.headerSpans);
check('T4 单栏堆叠：无分家 grid + 通知列在 header 之下（v11.23 退役双列）', tablet.stackCol, JSON.stringify(tablet));
check('T5 平板磁贴 72dp（源码基础值全形态同源，96px 拟合退役）', Math.abs(tablet.pillH - 72) < 3, `h=${tablet.pillH}`);
check('T6 平板零 pageerror', page2Errors === 0, `errors=${page2Errors}`);
await ctx2.close();

await browser.close();
log(failures === 0 ? '\n=== ALL PASS ===' : `\n=== ${failures} FAILURES ===`);
process.exit(failures === 0 ? 0 : 1);
