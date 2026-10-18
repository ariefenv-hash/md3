// e2e-v783-header.mjs — v7.83 QS 头部时间区 AOSP 源码对齐 E2E 核验
// 权威源码：ShadeHeader.kt ExpandedShadeHeader
//   ① 头部 minHeight 120dp 内容底部对齐 + 两行 spacedBy(16.dp)
//   ② 大钟 = 14sp × 2.57f ≈ 36sp（graphicsLayer 左中锚点）
//   ③ 行①大钟左 + 运营商组右（widthIn max 180dp）
//   ④ 行②日期左 + 系统图标/电量胶囊右（Row SpaceBetween）
//   ⑤ 旧左右堆叠容器退役
//
// 用法：MD3_BASE=http://127.0.0.1:8791/md3/ios-desktop/index.html?nolock=1 node scripts/e2e-v783-header.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LIVE = process.env.MD3_BASE || 'https://ariefenv-hash.github.io/md3/ios-desktop/index.html?nolock=1';
const OUT = process.env.E2E_OUT || '/home/z/my-project/e2e-v783';
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

// 头部几何采样（在页面内执行：对 #quickSettingsPanel 内的 .panel-header）
const probeHeader = () => {
  const panel = document.getElementById('qsColumn'); // v7.84 统一 Shade：大钟头部在 QS 场景列
  const header = panel.querySelector('.panel-header');
  const clock = header.querySelector('.panel-big-clock');
  const carrier = header.querySelector('.panel-carrier');
  const dateEl = header.querySelector('.panel-date');
  const battery = header.querySelector('.battery-pill');
  const clockRow = header.querySelector('.panel-clock-row');
  const dateRow = header.querySelector('.panel-date-row');
  const R = (el) => el && el.getBoundingClientRect();
  const hr = R(header), cr = R(clock), car = R(carrier), dr = R(dateEl), br = R(battery);
  const cs = (el) => (el ? getComputedStyle(el) : null);
  return {
    headerH: hr ? hr.height : NaN,
    headerMin: cs(header)?.minHeight || '',
    clockFS: cs(clock)?.fontSize || '',
    clockCY: cr ? cr.y + cr.height / 2 : NaN,
    clockL: cr ? cr.left : NaN,
    carrierCY: car ? car.y + car.height / 2 : NaN,
    carrierR: car ? car.right : NaN,
    carrierMaxW: cs(carrier)?.maxWidth || '',
    dateCY: dr ? dr.y + dr.height / 2 : NaN,
    dateL: dr ? dr.left : NaN,
    battCY: br ? br.y + br.height / 2 : NaN,
    battR: br ? br.right : NaN,
    panelR: panel.getBoundingClientRect().right,
    clockRowBottom: R(clockRow)?.bottom ?? NaN,
    dateRowTop: R(dateRow)?.top ?? NaN,
    dateRowBottom: R(dateRow)?.bottom ?? NaN,
    headerBottom: hr ? hr.bottom : NaN,
    legacyLeft: !!panel.querySelector('.panel-header-left'),
    legacyRight: !!panel.querySelector('.panel-header-right'),
  };
};

const runHeaderChecks = async (page, tag) => {
  const vw = page.viewportSize().width;
  const h = await page.evaluate(probeHeader);
  check(`${tag}1 头部 minHeight 120px 实际渲染≥120`, h.headerMin === '120px' && h.headerH >= 119.5, `min=${h.headerMin} h=${h.headerH.toFixed(1)}`);
  check(`${tag}2 大钟 36px（源码 14sp×2.57f）`, h.clockFS === '36px', `fs=${h.clockFS}`);
  check(`${tag}3a 行① 大钟与运营商同行（中心差<10px）`, Math.abs(h.clockCY - h.carrierCY) < 10, `Δ=${(h.clockCY - h.carrierCY).toFixed(1)}`);
  check(`${tag}3b 行① 运营商在大钟右侧且靠右缘`, h.carrierR > h.clockL + 100 && h.carrierMaxW === '180px', `carrierR=${h.carrierR?.toFixed(0)} maxW=${h.carrierMaxW}`);
  check(`${tag}4a 行② 日期左（left<15%宽）`, h.dateL < vw * 0.15, `dateL=${h.dateL?.toFixed(0)}`);
  // v7.84 平板 split：QS 列约占左半 → 胶囊靠列右缘（panelR-15% 列宽）；手机仍全屏 85%
  const battRightOk = h.battR > vw * 0.85 || h.battR > h.panelR - vw * 0.15;
  check(`${tag}4b 行② 电量胶囊右（列右缘）+ 与日期同行`, battRightOk && Math.abs(h.dateCY - h.battCY) < 10, `battR=${h.battR?.toFixed(0)} panelR=${h.panelR?.toFixed(0)} Δ=${(h.dateCY - h.battCY).toFixed(1)}`);
  check(`${tag}5 两行间距 ≈16px（源码 spacedBy 16dp）`, Math.abs((h.dateRowTop - h.clockRowBottom) - 16) < 4, `gap=${(h.dateRowTop - h.clockRowBottom).toFixed(1)}`);
  check(`${tag}6 内容底部对齐（行②底距头底≈6px padding）`, Math.abs((h.headerBottom - h.dateRowBottom) - 6) < 4, `Δ=${(h.headerBottom - h.dateRowBottom).toFixed(1)}`);
  check(`${tag}7 旧堆叠容器退役（无 header-left/right）`, !h.legacyLeft && !h.legacyRight);
  return h;
};

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
check('P0 应用就绪（磁贴已渲染）', ready);

// 右半区下拉 → 控制中心
await page.mouse.move(300, 8);
await page.mouse.down();
for (let y = 40; y <= 380; y += 30) { await page.mouse.move(300, y); await sleep(24); }
await page.mouse.up();
await sleep(900);
await page.screenshot({ path: `${OUT}/phone-qs-open.png` });

const panelOpen = await page.evaluate(() => {
  const ov = document.getElementById('pullPanelsOverlay');
  return ov && ov.classList.contains('active') &&
    document.getElementById('qsColumn') && document.getElementById('qsColumn').getBoundingClientRect().height > 300;
});
check('P0b 控制中心已打开', panelOpen);

const hPhone = await runHeaderChecks(page, 'P');
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
await page2.screenshot({ path: `${OUT}/tablet-qs-open.png` });
await runHeaderChecks(page2, 'T');
check('T9 全程零 pageerror', page2Errors === 0, `tabletErrors=${page2Errors}`);
await ctx2.close();

check('P9 手机全程零 pageerror', pageErrors === 0, `phoneErrors=${pageErrors}`);

await browser.close();
log(failures === 0 ? '\n=== ALL PASS ===' : `\n=== ${failures} FAILURES ===`);
process.exit(failures === 0 ? 0 : 1);
