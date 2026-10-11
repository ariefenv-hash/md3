// e2e-v766.mjs — v7.66 真实浏览器核验
// ① game2048 主题色自动穿透（宿主切色相 → iframe --sol-* computed 实时联动）
// ② 文件应用 M3E 表达性涟漪（.fj-rpl 接入共享层；旧 fj-ink 退役）
// ③ 文件清理页丰富（重复文件预勾选 → 删除释放累计）+ 浏览页（集合网格/实时过滤/全库搜索）
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.env.PORT || 8096;
const BASE = `http://localhost:${PORT}/ios-desktop/index.html?nolock=1`;
const OUT = '/home/z/my-project/e2e-v766';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const browser = await chromium.launch({ args: ['--force-device-scale-factor=2'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
let errors = 0;
page.on('pageerror', (e) => { errors++; log('[pageerror]', e.message.slice(0, 200)); });
page.on('console', (m) => { if (m.type() === 'error') log('[console.error]', m.text().slice(0, 160)); });

await page.goto(BASE, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1200);

// ---------- ① game2048 主题穿透 ----------
log('--- ① game2048 theme penetration');
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="game2048"]');
  if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});
await sleep(1600);
const hueProbe = () => page.evaluate(() => {
  const f = document.querySelector('.app-window iframe[src*="game2048"]');
  if (!f || !f.contentDocument) return { found: false };
  const doc = f.contentDocument;
  const cs = doc.defaultView.getComputedStyle(doc.documentElement);
  return {
    found: true,
    themeType: (f.contentWindow.__g2048 && f.contentWindow.__g2048.themeType) ? f.contentWindow.__g2048.themeType() : '?',
    solPrimary: cs.getPropertyValue('--sol-primary').trim(),
    mdH: doc.documentElement.style.getPropertyValue('--md-h').trim(),
    bodyBg: cs.backgroundColor,
    mode: doc.documentElement.dataset.themeMode || '(unset)',
  };
});
const before = await hueProbe();
log('before:', JSON.stringify(before));
// 宿主切色相 320（E2E 桥）
await page.evaluate(() => { window.__themeHueTest && window.__themeHueTest.set(320); });
await sleep(500);
const after = await hueProbe();
log('after hue=320:', JSON.stringify(after));
const penetrated = before.found && after.found
  && before.solPrimary !== after.solPrimary
  && before.themeType === 'follow';
log('PENETRATION:', penetrated ? 'PASS' : 'FAIL', `(${before.solPrimary} -> ${after.solPrimary})`);
await page.screenshot({ path: `${OUT}/1-g2048-follow-hue320.png` });
// 预设覆盖：applyTheme(1) 后内联接管，宿主再切色响应不再变化
await page.evaluate(() => {
  const f = document.querySelector('iframe[src*="game2048"]');
  f.contentWindow.__g2048.applyTheme(1);
});
await sleep(300);
const preset1 = await hueProbe();
await page.evaluate(() => { window.__themeHueTest && window.__themeHueTest.set(90); });
await sleep(400);
const preset2 = await hueProbe();
const presetOverride = preset1.solPrimary === preset2.solPrimary && preset1.themeType === 'preset';
log('PRESET OVERRIDE:', presetOverride ? 'PASS' : 'FAIL', `(${preset1.solPrimary} stays @hue90)`);
// 回到跟随
await page.evaluate(() => {
  const f = document.querySelector('iframe[src*="game2048"]');
  f.contentWindow.__g2048.applyFollowTheme();
});
await sleep(300);
const followAgain = await hueProbe();
log('BACK TO FOLLOW:', followAgain.themeType === 'follow' ? 'PASS' : 'FAIL');

// 关闭应用回桌面
await page.keyboard.press('Escape');
await sleep(900);

// ---------- ② 文件应用表达性涟漪 ----------
log('--- ② files expressive ripple');
await page.evaluate(() => {
  const icon = document.querySelector('.app-icon[data-id="files"]');
  if (icon) icon.dispatchEvent(new PointerEvent('click', { bubbles: true }));
});
await sleep(1500);
// 准备真实数据：三个文件（两组同名同体积 = 重复文件），两个空文件夹
const seeded = await page.evaluate(async () => {
  const V = window.__vfs; if (!V) return 'no-vfs';
  await V.mkdir('/docs').catch(() => {});
  await V.mkdir('/empty-a').catch(() => {});
  await V.mkdir('/empty-b').catch(() => {});
  await V.write('/notes.txt', 'hello files v766\n'.repeat(40), { owner: 'files' });
  await V.mkdir('/docs').catch(() => {});
  await V.write('/docs/notes.txt', 'hello files v766\n'.repeat(40), { owner: 'files' });
  await V.write('/big.bin', 'x'.repeat(70000), { owner: 'files' });
  return 'ok';
});
log('seed:', seeded);
await sleep(600);

// 涟漪共享层存在 + 旧 ink 不再生效：tap 一行文件
const rippleProbe = await page.evaluate(async () => {
  const layerCanvas = !!document.querySelector('canvas.md-ripple-layer');
  // 直接在宿主文档里找 files 行（模块应用渲染在宿主文档）
  const row = document.querySelector('.fj-row.fj-rpl[data-path]');
  if (!row) return { layerCanvas, row: false };
  const rect = row.getBoundingClientRect();
  const x = rect.left + rect.width / 2, y = rect.top + Math.min(20, rect.height / 2);
  row.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerId: 91, button: 0 }));
  await new Promise((r) => setTimeout(r, 90));
  const inkCount = document.querySelectorAll('.fj-ink').length;
  row.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y, pointerId: 91 }));
  return { layerCanvas, row: true, inkCount };
});
log('ripple probe:', JSON.stringify(rippleProbe), rippleProbe.layerCanvas && rippleProbe.inkCount === 0 ? 'PASS' : 'CHECK');
await page.screenshot({ path: `${OUT}/2-files-home.png` });

// ---------- ③ 清理页 ----------
log('--- ③ clean tab');
await page.evaluate(() => { window.__filesPB && null; });
// 点底部导航「清理」（data-tab=1）
const tabClicked = await page.evaluate(() => {
  const b = document.querySelector('.fj-nitem[data-tab="1"]');
  if (!b) return false;
  b.click(); return true;
});
await sleep(700);
const cleanProbe = await page.evaluate(() => {
  const clean = document.getElementById('fjClean');
  if (!clean) return { clean: false };
  const cards = [...clean.querySelectorAll('.fj-kcard')].map((c) => ({
    id: c.id || '(sum)',
    title: c.querySelector('.tt') && c.querySelector('.tt').textContent,
    rows: c.querySelectorAll('.fj-row[data-clean]').length,
    preChecked: c.querySelectorAll('.fj-selbox.on').length,
    hasDelBtn: !!c.querySelector('.fj-cleanbtn'),
  }));
  const sum = clean.textContent.match(/可释放约 ([^居]*)/);
  return { clean: true, cards, sum: sum && sum[1], chips: clean.querySelectorAll('[data-jump]').length };
});
log('clean:', JSON.stringify(cleanProbe, null, 1));
await page.screenshot({ path: `${OUT}/3-clean-tab.png` });
// 全选重复文件卡 → 删除 → freedTotal 增加
const freedBefore = await page.evaluate(() => +localStorage.getItem('files_clean_freed_total') || 0);
const delFlow = await page.evaluate(async () => {
  const card = document.getElementById('fjCardDup');
  if (!card) return { skip: 'no dup card' };
  const btn = card.querySelector('.fj-cleanbtn');
  if (!btn) return { skip: 'no del btn' };
  btn.click();
  await new Promise((r) => setTimeout(r, 350));
  const dlg = document.getElementById('fjDialog');
  const on = dlg.classList.contains('on');
  const okBtn = document.getElementById('fjDlgOk');
  if (on && okBtn) okBtn.click();
  await new Promise((r) => setTimeout(r, 600));
  const snack = document.getElementById('fjSnack');
  return { dialogShown: on, snack: snack && snack.textContent, freed: +localStorage.getItem('files_clean_freed_total') || 0 };
});
const freedAfter = await page.evaluate(() => +localStorage.getItem('files_clean_freed_total') || 0);
log('clean delete:', JSON.stringify(delFlow), 'freed:', freedBefore, '->', freedAfter,
  freedAfter > freedBefore ? 'PASS' : 'CHECK');

// ---------- ④ 浏览页 ----------
log('--- ④ browse tab');
await page.evaluate(() => {
  const b = document.querySelector('.fj-nitem[data-tab="2"]');
  if (b) b.click();
});
await sleep(700);
const browseProbe = await page.evaluate(() => {
  const br = document.getElementById('fjBrowse');
  if (!br) return { browse: false };
  return {
    browse: true,
    collections: br.querySelectorAll('.fj-cgrid .fj-ccard').length,
    hasSearch: !!document.getElementById('fjBSearch'),
    listRows: document.querySelectorAll('#fjBrowseList .fj-row').length,
  };
});
log('browse:', JSON.stringify(browseProbe));
await page.screenshot({ path: `${OUT}/4-browse-tab.png` });
// 实时过滤 + 全库搜索
const filterProbe = await page.evaluate(async () => {
  const inp = document.getElementById('fjBSearch');
  if (!inp) return { hasInput: false };
  inp.value = 'notes';
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 250));
  const sections = [...document.querySelectorAll('#fjBrowseList .fj-sechead .h')].map((e) => e.textContent);
  const rows = document.querySelectorAll('#fjBrowseList .fj-row').length;
  // 清除按钮
  const clr = document.getElementById('fjBClear');
  const clrOn = clr && clr.classList.contains('on');
  clr && clr.click();
  await new Promise((r) => setTimeout(r, 200));
  const rowsAfterClear = document.querySelectorAll('#fjBrowseList .fj-row').length;
  return { hasInput: true, sections, rowsWhileFilter: rows, clrOn, rowsAfterClear };
});
log('filter:', JSON.stringify(filterProbe));
await page.screenshot({ path: `${OUT}/5-browse-filtered.png` });

log('--- summary');
log('pageerrors:', errors);
log(penetrated && presetOverride ? '① theme penetration PASS' : '① CHECK LOGS');
log(rippleProbe.layerCanvas && rippleProbe.inkCount === 0 ? '② ripple PASS' : '② CHECK LOGS');
log(freedAfter > freedBefore ? '③ clean PASS' : '③ CHECK LOGS');
log(browseProbe.collections === 6 && filterProbe.rowsWhileFilter > 0 ? '④ browse PASS' : '④ CHECK LOGS');

await browser.close();
