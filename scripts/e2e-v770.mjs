// e2e-v770.mjs — v7.70 文件应用层级返回视差（Android 平台同构）真实浏览器核验
// ① 子页前进：底层屏挂 fj-under-out，中途帧 transform 负值 + brightness<1；子页 100%→0 全滑
// ② 子页后退：底层屏挂 fj-under-in 视差归位；子页 0→100% 全滑出场；settle 后零残留
// ③ 预览前进/后退：主区同构视差；图片预览 media 纯黑底
// ④ 手势桥：progress 跟手 -28% 比例 + 压暗；commit 后子页 100% 出场
// ⑤ 全程零 pageerror
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT || 8097;
const BASE = `http://localhost:${PORT}/ios-desktop/index.html?nolock=1`;
const OUT = '/home/z/my-project/e2e-v770';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (name, cond, detail = '') => {
  log(`${cond ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`);
  if (!cond) failures++;
};
const m41 = (mtx) => {
  const m = /matrix\(([^)]+)\)/.exec(mtx || '');
  return m ? parseFloat(m[1].split(',')[4]) : null;
};

const browser = await chromium.launch({ args: ['--force-device-scale-factor=2'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
let errors = 0;
page.on('pageerror', (e) => { errors++; log('[pageerror]', e.message.slice(0, 200)); });
await page.addInitScript(() => {
  try {
    const store = JSON.parse(localStorage.getItem('ios-desktop:permissions') || '{}');
    store.weather = Object.assign({ __name: '天气' }, store.weather, { location: false });
    localStorage.setItem('ios-desktop:permissions', JSON.stringify(store));
  } catch (e) {}
});
await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1400);

// ---------- 准备：造目录与文件，打开文件应用 ----------
log('--- ⓪ seed + open files app');
await page.evaluate(async () => {
  const V = window.__vfs;
  await V.ready.catch(() => {});
  await V.mkdir('/parallax').catch(() => {});
  await V.write('/parallax/inside.txt', 'inner', { owner: 'e2e' });
  await V.write('/parallax-read.txt', 'readable text content for preview', { owner: 'e2e' });
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 32;
  const c2 = canvas.getContext('2d');
  c2.fillStyle = '#f60'; c2.fillRect(0, 0, 32, 32);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  await V.write('/parallax-pic.png', blob, { owner: 'e2e' });
});
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="files"]');
  if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});
await sleep(1600);
// 切到浏览页（根目录以 fj-row 列表呈现，含目录行）；额外等 600ms 让 fj-ax-l 摘牌（避免动画属性覆盖视差类）
await page.evaluate(() => {
  const b = document.querySelector('.fj-nitem[data-tab="2"]');
  if (b) b.click();
});
await sleep(650);

// ---------- ① 子页前进：中途帧视差采样 ----------
log('--- ① sub open (forward) mid-flight');
const fwd = await page.evaluate(async () => {
  const scr = document.querySelector('.fj-screen.on');
  const row = [...document.querySelectorAll('#fjBrowse .fj-row')].find((r) => r.dataset.type === 'dir');
  if (!row) return { err: 'no dir row' };
  const before = { mtx: getComputedStyle(scr).transform, filt: getComputedStyle(scr).filter };
  row.click();
  await new Promise((r) => setTimeout(r, 130)); // 340ms 减速曲线的前段
  const cs = getComputedStyle(scr);
  const sub = document.getElementById('fjSub');
  const csub = getComputedStyle(sub);
  return {
    out: scr.classList.contains('fj-under-out'),
    mtx: cs.transform, filt: cs.filter,
    subIn: sub.classList.contains('anim-in'),
    subOn: sub.classList.contains('on'),
    subMtx: csub.transform,
  };
});
if (fwd.err) { check('子页前进：目录行存在', false, fwd.err); }
else {
  check('底层屏挂 fj-under-out', fwd.out === true, JSON.stringify(fwd));
  const x = m41(fwd.mtx);
  check('底层屏中途左移（0 > x > -120px）', x !== null && x < 0 && x > -120, `x=${x} ${fwd.mtx}`);
  const br = /brightness\(([\d.]+)\)/.exec(fwd.filt);
  check('底层屏压暗 brightness<1', !!br && parseFloat(br[1]) < 1, `filt=${fwd.filt}`);
  check('子页 anim-in 在场 + 100% 侧滑入中', fwd.subIn && fwd.subOn, `subMtx=${fwd.subMtx}`);
  const sx = m41(fwd.subMtx);
  check('子页中途位于右侧（x>0）', sx !== null && sx > 0, `sx=${sx}`);
}
await page.screenshot({ path: `${OUT}/1-sub-open-midflight.png` });

// ---------- ② 子页后退：中途帧视差归位 + settle 零残留 ----------
log('--- ② sub close (back) mid-flight');
await sleep(420); // 等前进完全 settle
const settled1 = await page.evaluate(() => {
  const scr = document.querySelector('.fj-screen.on');
  const sub = document.getElementById('fjSub');
  return { scrCls: scr.className, subMtx: getComputedStyle(sub).transform };
});
check('settle：底层屏零残留类', !/fj-under-(out|in)/.test(settled1.scrCls), settled1.scrCls);
check('settle：子页归位 translateX=0', settled1.subMtx === 'none' || m41(settled1.subMtx) === 0, settled1.subMtx);

const back = await page.evaluate(async () => {
  const scr = document.querySelector('.fj-screen.on');
  const sub = document.getElementById('fjSub');
  document.getElementById('fjSubBack').click();
  await new Promise((r) => setTimeout(r, 110)); // 280ms 加速曲线的前段
  const cs = getComputedStyle(scr);
  return {
    inn: scr.classList.contains('fj-under-in'),
    mtx: cs.transform, filt: cs.filter,
    subOut: sub.classList.contains('anim-out'),
    subMtx: getComputedStyle(sub).transform,
  };
});
check('底层屏挂 fj-under-in', back.inn === true, JSON.stringify(back));
const bx = m41(back.mtx);
check('底层屏从左侧视差归位中（0 > x > -120px）', bx !== null && bx < 0 && bx > -120, `x=${bx}`);
const bbr = /brightness\(([\d.]+)\)/.exec(back.filt);
check('底层屏回亮中 brightness<1（过渡态）', !!bbr && parseFloat(bbr[1]) < 1, `filt=${back.filt}`);
check('子页 anim-out 在场（0→100% 全滑出场）', back.subOut === true, `subMtx=${back.subMtx}`);
await page.screenshot({ path: `${OUT}/2-sub-close-midflight.png` });
await sleep(420);
const settled2 = await page.evaluate(() => {
  const scr = document.querySelector('.fj-screen.on');
  const sub = document.getElementById('fjSub');
  return { scrCls: scr.className, subOn: sub.classList.contains('on'), scrMtx: getComputedStyle(scr).transform, scrFilt: getComputedStyle(scr).filter };
});
check('后退 settle：子页已摘 on', settled2.subOn === false);
check('后退 settle：底层屏 transform/filter 全清', settled2.scrMtx === 'none' && settled2.scrFilt === 'none', `${settled2.scrMtx} ${settled2.scrFilt}`);

// ---------- ③ 预览：前进视差 + 图片纯黑底 + 后退同构 ----------
log('--- ③ preview open/close');
const pv = await page.evaluate(async () => {
  const main = document.querySelector('.fj-main');
  const row = [...document.querySelectorAll('#fjBrowse .fj-row')].find((r) => r.dataset.type === 'file' && /parallax-pic\.png$/.test(r.dataset.path));
  if (!row) return { err: 'no img row' };
  row.click();
  // openPreview 是 async（await readURL 后才挂 .on），轮询等 on
  const pvEl = document.getElementById('fjPreview');
  const t0 = Date.now();
  while (!pvEl.classList.contains('on') && Date.now() - t0 < 2000) await new Promise((r) => setTimeout(r, 40));
  await new Promise((r) => setTimeout(r, 120)); // 300ms 进场前段
  const cs = getComputedStyle(main);
  return {
    media: pvEl.classList.contains('media'),
    bg: getComputedStyle(pvEl).backgroundColor,
    out: main.classList.contains('fj-under-out'),
    mtx: cs.transform,
    pvMtx: getComputedStyle(pvEl).transform,
  };
});
if (pv.err) { check('预览：图片行存在', false, pv.err); }
else {
  check('图片预览 media 纯黑底', pv.media === true && pv.bg === 'rgb(0, 0, 0)', `bg=${pv.bg}`);
  check('主区挂 fj-under-out', pv.out === true);
  const px = m41(pv.mtx);
  check('主区中途左移（0 > x > -120px）', px !== null && px < 0 && px > -120, `x=${px} ${pv.mtx}`);
  const pvx = m41(pv.pvMtx);
  check('预览页中途位于右侧（x>0）', pvx !== null && pvx > 0, `pvx=${pvx}`);
}
await page.screenshot({ path: `${OUT}/3-preview-midflight.png` });

const pvBack = await page.evaluate(async () => {
  const main = document.querySelector('.fj-main');
  document.getElementById('fjPvClose').click();
  await new Promise((r) => setTimeout(r, 100));
  const cs = getComputedStyle(main);
  const pvEl = document.getElementById('fjPreview');
  return { inn: main.classList.contains('fj-under-in'), mtx: cs.transform, pvOut: pvEl.classList.contains('anim-out'), pvMtx: getComputedStyle(pvEl).transform };
});
check('预览后退：主区挂 fj-under-in', pvBack.inn === true, JSON.stringify(pvBack));
const pbx = m41(pvBack.mtx);
check('预览后退：主区从左侧视差归位中', pbx !== null && pbx < 0 && pbx > -120, `x=${pbx}`);
check('预览后退：anim-out 全滑出场', pvBack.pvOut === true, pvBack.pvMtx);
await sleep(420);
const pvSettled = await page.evaluate(() => {
  const pvEl = document.getElementById('fjPreview');
  const main = document.querySelector('.fj-main');
  return { on: pvEl.classList.contains('on'), body: pvEl.querySelector('#fjPvBody').innerHTML, mainCls: main.className, mainMtx: getComputedStyle(main).transform };
});
check('预览 settle：on 摘除 + body 清空', pvSettled.on === false && pvSettled.body === '', `body=${(pvSettled.body || '').slice(0, 40)}`);
check('预览 settle：主区 transform 归零零残留', pvSettled.mainMtx === 'none' && !/fj-under-(out|in)/.test(pvSettled.mainCls), pvSettled.mainCls);

// ---------- ④ 手势桥：跟手视差 + commit 100% ----------
log('--- ④ gesture bridge');
await page.evaluate(() => {
  const row = [...document.querySelectorAll('#fjBrowse .fj-row')].find((r) => r.dataset.type === 'dir');
  if (row) row.click();
});
await sleep(420);
const ges = await page.evaluate(async () => {
  const PB = window.__filesPB;
  if (!PB) return { err: 'no __filesPB' };
  const scr = document.querySelector('.fj-screen.on');
  const sub = document.getElementById('fjSub');
  PB.beginGesture();
  PB.progressGesture(150);
  const dragMtx = scr.style.transform;
  const dragFilt = scr.style.filter;
  PB.endGesture(true);
  const commitTf = sub.style.transform;
  const commitOp = sub.style.opacity;
  await new Promise((r) => setTimeout(r, 380));
  return { dragMtx, dragFilt, commitTf, commitOp, subGone: !sub.classList.contains('on'), scrInline: scr.style.transform + '/' + scr.style.filter };
});
if (ges.err) { check('手势桥在位', false, ges.err); }
else {
  check('拖拽 150px → 底层 -42px（-28% 比例）', ges.dragMtx === 'translateX(-42px)', ges.dragMtx);
  check('拖拽压暗亮度钳制正确（150/900 → 0.833）', /brightness\(0\.833/.test(ges.dragFilt), ges.dragFilt);
  check('commit：子页 100% 全滑出场 + 不透明', ges.commitTf === 'translateX(100%)' && ges.commitOp === '1', `${ges.commitTf} ${ges.commitOp}`);
  check('commit settle：子页已关 + 底层 inline 清零', ges.subGone === true && (ges.scrInline === '/'), ges.scrInline);
}
await page.screenshot({ path: `${OUT}/4-after-gesture.png` });

// ---------- ⑤ 快速连开连关幂等 ----------
log('--- ⑤ rapid toggle');
const rapid = await page.evaluate(async () => {
  const scr = document.querySelector('.fj-screen.on');
  const rows = [...document.querySelectorAll('#fjBrowse .fj-row')];
  const dirRow = rows.find((r) => r.dataset.type === 'dir');
  if (!dirRow) return { err: 'no dir row' };
  dirRow.click();
  await new Promise((r) => setTimeout(r, 60));
  document.getElementById('fjSubBack').click();
  await new Promise((r) => setTimeout(r, 40));
  dirRow.click();
  await new Promise((r) => setTimeout(r, 500));
  const sub = document.getElementById('fjSub');
  const cl = scr.className;
  return { on: sub.classList.contains('on'), doubleCls: /fj-under-out.*fj-under-in|fj-under-in.*fj-under-out/.test(cl), cls: cl };
});
check('快速连开连关：最终子页开、底层单类无混挂', rapid.on === true && !rapid.doubleCls, rapid.cls);

// ---------- 收尾 ----------
check('零 pageerror', errors === 0, `errors=${errors}`);
await browser.close();
log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
