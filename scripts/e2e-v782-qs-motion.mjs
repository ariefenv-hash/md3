// e2e-v782-qs-motion.mjs — v7.82 控制中心动画 AOSP 源码重做版 E2E 核验
// ① 拖拽途中磁贴高度 squish 中间态存在（--qs-squish ≈ 0.1+0.9×progress，非 1）—— 用户遗留问题②直击
// ② 全开后 squish 归 1；关闭后压回 0.1（源码 constrainSquishiness 下限）
// ③ 两态圆角：未激活 ≈ 32px（50dp 封顶）→ 点击后 ≈ 24px（源码常量）
// ④ 图标底座 56px / svg 32px；蓝牙激活底座方圆角 16px
// ⑤ 滑条源码几何：轨道 40px / 圆角 24px / 竖柄 4×52px
// ⑥ 平板 4 列近方磁贴（96px 基高 × squish）+ ON 24px
// ⑦ 全程零 pageerror
//
// 用法：MD3_BASE=http://127.0.0.1:8791/md3/ios-desktop/index.html?nolock=1 node scripts/e2e-v782-qs-motion.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'https://ariefenv-hash.github.io/md3/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/e2e-v782';
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

// ==================== 手机视口 ====================
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const page = await ctx.newPage();
let pageErrors = 0;
page.on('pageerror', (e) => { pageErrors++; log('[pageerror]', e.message.slice(0, 200)); });

// GitHub Pages 链路抖动兜底：domcontentloaded + 长就绪轮询
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
check('应用就绪（磁贴已渲染）', ready);

// ① 拖拽途中：squish 中间态（阈值 915×0.38 ≈ 348 全开；途中 ~45% 处采样）
await page.mouse.move(206, 8);
await page.mouse.down();
for (let y = 40; y <= 160; y += 20) { await page.mouse.move(206, y); await sleep(24); }
const midDrag = await page.evaluate(() => {
  const p = document.getElementById('pullPanelsTrack'); // v7.84 统一 Shade：squish 变量挂场景轨
  const v = p ? parseFloat(p.style.getPropertyValue('--qs-squish')) : NaN;
  const pill = document.querySelector('.qs-tile-pill');
  return { squish: v, pillH: pill ? pill.getBoundingClientRect().height : NaN };
});
check('① 拖拽途中磁贴 squish 中间态（0.1 < --qs-squish < 0.95）',
  Number.isFinite(midDrag.squish) && midDrag.squish > 0.1 && midDrag.squish < 0.95,
  JSON.stringify(midDrag));
for (let y = 200; y <= 380; y += 30) { await page.mouse.move(206, y); await sleep(24); }
await page.mouse.up();
await sleep(900); // 开场补间 300ms + 余量
await page.screenshot({ path: `${OUT}/phone-qs-open.png` });

const opened = await page.evaluate(() => {
  const p = document.getElementById('pullPanelsTrack'); // v7.84 统一 Shade：squish 变量挂场景轨
  const pill = document.querySelector('.qs-tile-pill');
  return {
    squish: parseFloat(p.style.getPropertyValue('--qs-squish')),
    pillH: pill ? pill.getBoundingClientRect().height : NaN,
  };
});
check('② 面板全开 squish = 1（磁贴 72dp 源码满高）', Math.abs(opened.squish - 1) < 0.03 && Math.abs(opened.pillH - 72) < 2, JSON.stringify(opened));

// ③ 两态圆角：未激活 ≈ 32px
const offRadius = await page.evaluate(() => {
  const pill = document.querySelector('.qs-tile-pill[data-tile-id="torch"]');
  return pill ? parseFloat(getComputedStyle(pill).borderRadius) : NaN;
});
check('③a 未激活磁贴圆角指定值 50px（源码 50dp 绝对值，72dp 高渲染钳制全胶囊）', Math.abs(offRadius - 50) < 1.5, `r=${offRadius}`);

// 点亮手电 → 等弹簧落定（320ms + 余量）→ ≈ 24px
await page.evaluate(() => document.querySelector('.qs-tile-pill[data-tile-id="torch"]').click());
await sleep(600);
const onState = await page.evaluate(() => {
  const pill = document.querySelector('.qs-tile-pill[data-tile-id="torch"]');
  const cs = getComputedStyle(pill);
  return { r: parseFloat(cs.borderRadius), active: pill.classList.contains('active'), bg: cs.backgroundColor };
});
check('③b 激活磁贴圆角 ≈ 24px（源码 24dp）+ .active 挂上', onState.active && Math.abs(onState.r - 24) < 1.5, JSON.stringify(onState));

// ④ 图标底座 56 / svg 32；蓝牙底座圆角随其实际连接态（默认已连接 Pixel Buds → active → 16px）
const wrapState = await page.evaluate(() => {
  const wrap = document.querySelector('.qs-tile-pill[data-tile-id="torch"] .qs-tile-icon-wrap');
  const btPill = document.querySelector('.qs-tile-pill[data-tile-id="bluetooth"]');
  const bt = btPill.querySelector('.qs-tile-icon-wrap');
  const btActive = btPill.classList.contains('active');
  return { w: wrap ? wrap.getBoundingClientRect().width : NaN, btR: bt ? getComputedStyle(bt).borderRadius : NaN, btActive };
});
const btExpect = wrapState.btActive ? '16px' : '28px'; // 56 盒上半径解析：50%→28 / 激活 16dp→16
check('④ 图标底座 56px（ToggleTargetSize）+ 蓝牙底座圆角随连接态', Math.abs(wrapState.w - 56) < 1.5 && wrapState.btR === btExpect, JSON.stringify(wrapState));

// ⑤ 滑条几何
const sliderState = await page.evaluate(() => {
  const bar = document.getElementById('qsBrightnessBar');
  const handle = document.getElementById('qsBrightnessHandle');
  const bcs = bar ? getComputedStyle(bar) : null;
  const hcs = handle ? getComputedStyle(handle) : null;
  return {
    h: bcs ? parseFloat(bcs.height) : NaN,
    br: bcs ? bcs.borderRadius : NaN,
    hw: hcs ? parseFloat(hcs.width) : NaN,
    hh: hcs ? parseFloat(hcs.height) : NaN,
  };
});
check('⑤a 亮度轨道 40px / 圆角 24px', Math.abs(sliderState.h - 40) < 1.5 && sliderState.br.includes('24'), JSON.stringify(sliderState));
check('⑤b 竖柄 4×52px', Math.abs(sliderState.hw - 4) < 0.6 && Math.abs(sliderState.hh - 52) < 1.5, JSON.stringify(sliderState));

// 熄灭手电（toggleTorch 会拉起 z-index 99999 全屏白光层，必须先关掉否则遮挡后续点击）
await page.evaluate(() => document.querySelector('.qs-tile-pill[data-tile-id="torch"]').click());
await sleep(600);
const torchLayerGone = await page.evaluate(() => {
  const l = document.getElementById('screenTorchLayer');
  return !l || l.style.opacity === '0' || !l.isConnected;
});
check('⑤c 手电白光层已熄灭（不遮挡收起路径）', torchLayerGone);

// ⑥ 关闭 → squish 压回 0.1
await page.click('#statusBar', { position: { x: Math.round(412 * 0.85), y: 14 }, force: true });
await sleep(800);
const closed = await page.evaluate(() => {
  const p = document.getElementById('pullPanelsTrack'); // v7.84 统一 Shade：squish 变量挂场景轨
  const ov = document.getElementById('pullPanelsOverlay');
  return { squish: parseFloat(p.style.getPropertyValue('--qs-squish')), ovActive: ov.classList.contains('active') };
});
check('⑥ 面板关闭 squish = 0.1（源码下限）且 overlay 退场', Math.abs(closed.squish - 0.1) < 0.03 && !closed.ovActive, JSON.stringify(closed));
check('⑦ 全程零 pageerror', pageErrors === 0, `errors=${pageErrors}`);
await ctx.close();

// ==================== 平板视口 ====================
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
check('T1 平板就绪', ready2);
await page2.click('#statusBar', { position: { x: Math.round(1180 * 0.85), y: 14 }, force: true });
await sleep(1000);
await page2.screenshot({ path: `${OUT}/tablet-qs-open.png` });
const tablet = await page2.evaluate(() => {
  const pill = document.querySelector('.qs-tile-pill[data-tile-id="torch"]');
  const p = document.getElementById('pullPanelsTrack'); // v7.84 统一 Shade：squish 变量挂场景轨
  const cols = getComputedStyle(document.getElementById('qsTilesContainer')).gridTemplateColumns.split(' ').length;
  return {
    squish: parseFloat(p.style.getPropertyValue('--qs-squish')),
    h: pill ? pill.getBoundingClientRect().height : NaN,
    r: pill ? parseFloat(getComputedStyle(pill).borderRadius) : NaN,
    cols,
  };
});
check('T2 平板 4 列磁贴（6 列废弃）', tablet.cols === 4, `cols=${tablet.cols}`);
check('T3 平板全开 squish=1，磁贴 72dp 源码满高（96px 拟合退役）', Math.abs(tablet.squish - 1) < 0.03 && Math.abs(tablet.h - 72) < 2, JSON.stringify(tablet));
check('T4 平板未激活圆角 50px（源码绝对值）', Math.abs(tablet.r - 50) < 1.5, `r=${tablet.r}`);
check('T5 平板零 pageerror', page2Errors === 0, `errors=${page2Errors}`);
await ctx2.close();

await browser.close();
log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
