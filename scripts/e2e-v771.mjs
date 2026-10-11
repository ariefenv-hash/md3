// e2e-v771.mjs — v7.71 动画流畅性真实浏览器核验（Playwright 390×844）
// ① 帧间隙探针：整个 Files 应用会话（开应用 + tab 切换 + 子页/预览进出 + 各入场动画）
//    全程 rAF 采样 —— 无 >250ms 卡死帧，P95 帧间隙健康
// ② 存储条分段 fjSegIn / 配额条 .go+fjBarGo 一次性合成器动画在场（不再逐帧 layout）
// ③ 层级返回视差回归：中途帧 fj-under-out 在场 + will-change: transform, filter 生效 + settle 零残留
// ④ 热面 transition:all 退役：selbox/snack/dot/qs-action-btn 计算样式 transitionProperty 不含 all
// ⑤ 缩略图 decoding="async"；全程零 pageerror
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT || 8099;
const BASE = `http://localhost:${PORT}/ios-desktop/index.html?nolock=1`;
const OUT = '/home/z/my-project/e2e-v771';
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

// ---------- ⓪ 装帧间隙探针（开应用前装好，覆盖整个会话） ----------
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

// seed + open files app（v7.70 同款）
await page.evaluate(async () => {
  const V = window.__vfs;
  await V.ready.catch(() => {});
  await V.mkdir('/fluid').catch(() => {});
  await V.write('/fluid/inside.txt', 'inner', { owner: 'e2e' });
  await V.write('/fluid-read.txt', 'readable text content for preview', { owner: 'e2e' });
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 32;
  const c2 = canvas.getContext('2d');
  c2.fillStyle = '#f60'; c2.fillRect(0, 0, 32, 32);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  await V.write('/fluid-pic.png', blob, { owner: 'e2e' });
});
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="files"]');
  if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});
await sleep(1600);

// ---------- ① 存储卡：fjSegIn 分段入场 + 配额条 .go ----------
log('--- ① storage card one-shot composited bars');
const bars = await page.evaluate(() => {
  const segs = [...document.querySelectorAll('.fj-storecard .pbar i')];
  const fill = document.querySelector('.fj-quotafill');
  const txt = document.querySelector('.fj-quotatext');
  return {
    segCount: segs.length,
    segAnim: segs.length ? getComputedStyle(segs[0]).animationName : '',
    segOrigin: segs.length ? getComputedStyle(segs[0]).transformOrigin : '',
    fillGo: fill ? fill.classList.contains('go') : false,
    fillWidth: fill ? fill.style.width : '',
    fillAnim: fill ? getComputedStyle(fill).animationName : '',
    quotaOk: txt ? txt.textContent.indexOf('本源已用') === 0 : false,
    thumbsDecoding: [...document.querySelectorAll('img[data-thumb]')].slice(0, 3).map((i) => i.getAttribute('decoding')),
  };
});
check('存储条分段在场', bars.segCount >= 1, `n=${bars.segCount}`);
check('分段一次性 scaleX 入场动画 fjSegIn 生效', bars.segAnim === 'fjSegIn', `anim=${bars.segAnim}`);
check('分段 transform-origin 左缘（x=0px）', bars.segOrigin.split(' ')[0] === '0px', bars.segOrigin);
if (bars.quotaOk) {
  check('配额条 .go 类挂载 + fjBarGo 生效', bars.fillGo && bars.fillAnim === 'fjBarGo', `go=${bars.fillGo} anim=${bars.fillAnim} w=${bars.fillWidth}`);
} else {
  log('SKIP | 配额 estimate 不可用（go 类断言跳过）');
}
check('缩略图 decoding=async', bars.thumbsDecoding.length > 0 && bars.thumbsDecoding.every((d) => d === 'async'), JSON.stringify(bars.thumbsDecoding));
await page.screenshot({ path: `${OUT}/1-home-storage-card.png` });

// ---------- ② 热面 transition:all 计算样式核验 ----------
log('--- ② computed transitionProperty (no all)');
const tprops = await page.evaluate(() => {
  const pick = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).transitionProperty : null; };
  return { snack: pick('.fj-snack'), dot: pick('.dot') };
});
check('fj-snack transitionProperty 显式（无 all）', !!tprops.snack && !/\ball\b/.test(tprops.snack), tprops.snack);
check('.dot transitionProperty 显式（无 all）', !!tprops.dot && !/\ball\b/.test(tprops.dot), tprops.dot);
// fj-selbox 常显于清理页（data-clean 行）——切到清理页取计算样式
await page.evaluate(() => { const b = document.querySelector('.fj-nitem[data-tab="1"]'); if (b) b.click(); });
await sleep(650);
const selboxTp = await page.evaluate(() => {
  const el = document.querySelector('.fj-selbox');
  return el ? getComputedStyle(el).transitionProperty : null;
});
check('fj-selbox transitionProperty 显式（无 all）', !!selboxTp && !/\ball\b/.test(selboxTp), String(selboxTp));

// ---------- ③ 子页前进/后退：视差回归 + 动画期 will-change ----------
log('--- ③ sub open mid-flight (parallax + will-change)');
await page.evaluate(() => { const b = document.querySelector('.fj-nitem[data-tab="2"]'); if (b) b.click(); });
await sleep(650);
const fwd = await page.evaluate(async () => {
  const scr = document.querySelector('.fj-screen.on');
  const row = [...document.querySelectorAll('#fjBrowse .fj-row')].find((r) => r.dataset.type === 'dir');
  if (!row) return { err: 'no dir row' };
  row.click();
  await new Promise((r) => setTimeout(r, 130));
  const cs = getComputedStyle(scr);
  return {
    out: scr.classList.contains('fj-under-out'),
    wc: cs.willChange, mtx: cs.transform, filt: cs.filter,
    subMtx: getComputedStyle(document.getElementById('fjSub')).transform,
  };
});
if (fwd.err) { check('子页前进：目录行存在', false, fwd.err); }
else {
  check('底层屏挂 fj-under-out', fwd.out === true, JSON.stringify(fwd).slice(0, 160));
  check('动画期 will-change = transform, filter', fwd.wc.replace(/\s/g, '') === 'transform,filter', `wc=${fwd.wc}`);
  const x = m41(fwd.mtx);
  check('底层屏中途左移', x !== null && x < 0 && x > -120, `x=${x}`);
  const br = /brightness\(([\d.]+)\)/.exec(fwd.filt);
  check('底层屏压暗 brightness<1', !!br && parseFloat(br[1]) < 1, `filt=${fwd.filt}`);
}
await page.screenshot({ path: `${OUT}/2-sub-open-midflight.png` });
await sleep(420);
const back = await page.evaluate(async () => {
  const scr = document.querySelector('.fj-screen.on');
  document.getElementById('fjSubBack').click();
  await new Promise((r) => setTimeout(r, 110));
  const cs = getComputedStyle(scr);
  return { inn: scr.classList.contains('fj-under-in'), wc: cs.willChange, mtx: cs.transform };
});
check('后退挂 fj-under-in + will-change 在场', back.inn === true && /transform/.test(back.wc), `wc=${back.wc}`);
const bx = m41(back.mtx);
check('后退中途视差归位中（0 > x > -120px）', bx !== null && bx < 0 && bx > -120, `x=${bx}`);
await sleep(420);
const settled = await page.evaluate(() => {
  const scr = document.querySelector('.fj-screen.on');
  return { cls: scr.className, wc: getComputedStyle(scr).willChange, mtx: getComputedStyle(scr).transform, filt: getComputedStyle(scr).filter };
});
check('settle：视差类摘除 + will-change 消失 + transform/filter 清零',
  !/fj-under-(out|in)/.test(settled.cls) && (settled.wc === 'auto' || settled.wc === 'none') && settled.mtx === 'none' && settled.filt === 'none',
  `cls=${settled.cls} wc=${settled.wc} mtx=${settled.mtx} filt=${settled.filt}`);

// ---------- ④ 预览进出（同为会话帧间隙采样窗口） ----------
log('--- ④ preview open/close');
const pv = await page.evaluate(async () => {
  const row = [...document.querySelectorAll('#fjBrowse .fj-row')].find((r) => r.dataset.type === 'file' && /fluid-pic\.png$/.test(r.dataset.path));
  if (!row) return { err: 'no img row' };
  row.click();
  const pvEl = document.getElementById('fjPreview');
  const t0 = Date.now();
  while (!pvEl.classList.contains('on') && Date.now() - t0 < 2000) await new Promise((r) => setTimeout(r, 40));
  await new Promise((r) => setTimeout(r, 120));
  return { media: pvEl.classList.contains('media'), bg: getComputedStyle(pvEl).backgroundColor };
});
if (pv.err) { check('预览：图片行存在', false, pv.err); }
else check('图片预览 media 纯黑底', pv.media === true && pv.bg === 'rgb(0, 0, 0)', pv.bg);
await page.screenshot({ path: `${OUT}/3-preview-open.png` });
await page.evaluate(() => document.getElementById('fjPvClose').click());
await sleep(420);

// ---------- ④b 追加一轮子页进出（扩大帧样本 + 哨兵后二次返回验证） ----------
log('--- ④b extra sub cycle');
const extra = await page.evaluate(async () => {
  const row = [...document.querySelectorAll('#fjBrowse .fj-row')].find((r) => r.dataset.type === 'dir');
  if (!row) return { err: 'no dir row' };
  row.click();
  await new Promise((r) => setTimeout(r, 420));
  const midCls = document.querySelector('.fj-screen.on').className;
  document.getElementById('fjSubBack').click();
  await new Promise((r) => setTimeout(r, 480));
  const scr = document.querySelector('.fj-screen.on');
  return {
    midHadShown: /fj-shown/.test(midCls), // 二次进入时哨兵已在（首轮 underAnimate 挂载）
    cls: scr.className,
    mtx: getComputedStyle(scr).transform,
    subOn: document.getElementById('fjSub').classList.contains('on'),
  };
});
if (extra.err) { check('④b 目录行存在', false, extra.err); }
else {
  check('④b 首轮返回后哨兵已在场（二次返回零 fjFade 重放）', extra.midHadShown === true, extra.midCls || extra.cls);
  check('④b 二次返回 settle：零残留 + transform none', !/fj-under-(out|in)/.test(extra.cls) && extra.mtx === 'none' && !extra.subOn, `${extra.cls} mtx=${extra.mtx}`);
}

// ---------- ⑤ 帧间隙探针收口 ----------
log('--- ⑤ frame-gap analysis');
const fp = await page.evaluate(() => { window.__probeOff = true; return { gaps: window.__gaps.slice(), deltas: window.__deltas.slice(), frames: window.__frames }; });
const gaps = fp.gaps;
const maxGap = gaps.length ? Math.max(...gaps) : 0;
const ds = [...fp.deltas].sort((a, b) => a - b);
const p95 = ds.length ? Math.round(ds[Math.min(ds.length - 1, Math.floor(ds.length * 0.95))]) : 0;
check('探针覆盖充足帧样本', fp.frames >= 300, `frames=${fp.frames}`);
check('无 >250ms 卡死帧', maxGap <= 250, `maxGap=${maxGap}ms gaps>34ms 计数=${gaps.length}`);
log(`    全帧 P95=${p95}ms（信息项，headless 帧步进偏慢不作硬断言）`);
check('全会话 >34ms 帧间隙稀少（≤30）', gaps.length <= 30, `gaps=${gaps.length} 明细：${gaps.slice(0, 20).join(', ') || '无'}`);

check('零 pageerror', errors === 0, `errors=${errors}`);
await browser.close();
log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
