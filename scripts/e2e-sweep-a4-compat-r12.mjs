// R12 A 类（兼容性）e2e：R8 修复处 computed 零回归 + 降级演练 + 新组件兼容面抽证
// 运行纪律传承 R10/R11：服务根=ios-desktop/，断网 route.abort，armed 前置重试，可控超时
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8100/index.html?nolock=1';
const results = [];
const add = (id, ok, detail) => { results.push({ id, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail || ''}`); };

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e)));
page.setDefaultTimeout(4000);

try {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2500);

  // P1 前置：桌面在场
  const p1 = await page.evaluate(() => ({
    icons: document.querySelectorAll('.icon-box').length,
    dock: document.querySelectorAll('.dock-app-icon').length,
    glogo: !!document.querySelector('.search-g-logo'),
  }));
  add('P1', p1.icons > 0 && p1.dock > 0 && p1.glogo, `icon-box=${p1.icons} dock=${p1.dock} glogo=${p1.glogo}`);

  // A1 桌面图标 user-select（R8 base.css 修复族 computed 抽证）
  const a1 = await page.evaluate(() => {
    const el = document.querySelector('.icon-box');
    if (!el) return { s: 'NO_ICON' };
    const cs = getComputedStyle(el);
    return { s: cs.webkitUserSelect || cs.userSelect, tag: el.tagName };
  });
  add('A1', a1.s === 'none', `desktop-icon user-select=${a1.s}`);

  // A3 dock-app-icon appearance（R8 修复处）
  const a3 = await page.evaluate(() => {
    const b = document.querySelector('.dock-app-icon');
    const cs = getComputedStyle(b);
    return { ap: cs.appearance, wap: cs.webkitAppearance, tag: b.tagName };
  });
  add('A3', a3.ap === 'none' && a3.wap === 'none', `dock-app appearance=${a3.ap} webkit=${a3.wap} tag=${a3.tag}`);

  // A4 search-g-logo background-clip:text（R8 修复处：渐变字双写）
  const a4 = await page.evaluate(() => {
    const el = document.querySelector('.search-g-logo');
    if (!el) return { std: 'NO_EL' };
    const cs = getComputedStyle(el);
    return { std: cs.backgroundClip, wk: cs.webkitBackgroundClip, fill: cs.webkitTextFillColor };
  });
  add('A4', a4.wk === 'text' && a4.std === 'text', `bg-clip std=${a4.std} wk=${a4.wk} fill=${a4.fill}`);

  // A2 开 calculator（真实 import 链，R10 T-0 同口径）→ app-window user-select
  const openRes = await page.evaluate(async () => {
    const { initialApps } = await import('/js/apps-data.js');
    const { openApp } = await import('/js/app-window.js');
    const idx = initialApps.findIndex(a => a.id === 'calculator');
    if (idx === -1) return 'NO-APP';
    openApp(idx);
    return 'OK';
  });
  await page.waitForTimeout(1400);
  const a2 = await page.evaluate(() => {
    const w = document.querySelector('.app-window');
    if (!w) return { s: 'NO_WINDOW' };
    return { s: getComputedStyle(w).webkitUserSelect || getComputedStyle(w).userSelect };
  });
  add('A2', openRes === 'OK' && a2.s === 'none', `app-window open=${openRes} user-select=${a2.s}`);

  // C2 armed（app 全屏 + 5s 自动收纳）→ transient 唤出栏 computed（backdrop-filter 双写 + 999px 圆角）
  let armed = false;
  for (let i = 0; i < 3 && !armed; i++) { await page.waitForTimeout(1600); armed = await page.evaluate(() => import('/js/taskbar-transient.js').then(m => m.__transientTestHooks().armed)); }
  if (!armed) await page.waitForTimeout(4200);
  const c2 = await page.evaluate(async () => {
    const M = await import('/js/taskbar-transient.js');
    const hooks = M.__transientTestHooks();
    if (!hooks.armed) return { err: 'not-armed' };
    hooks.openTransient('sweep');
    return { armed: hooks.armed };
  });
  await page.waitForTimeout(1400);
  const c2b = await page.evaluate(async () => {
    const hooks = (await import('/js/taskbar-transient.js')).__transientTestHooks();
    const el = document.querySelector('.tbt-bar') || hooks.el;
    if (!el) return { err: 'no-el' };
    const cs = getComputedStyle(el);
    return { bf: cs.backdropFilter, wbf: cs.webkitBackdropFilter, radius: cs.borderRadius, open: hooks.openFlag };
  });
  add('C2', c2b.bf && c2b.bf.includes('blur') && c2b.radius === '999px',
    `transient bf=${c2b.bf} radius=${c2b.radius} open=${c2b.open}`);
  await page.evaluate(async () => { (await import('/js/taskbar-transient.js')).__transientTestHooks().stashTransient?.('sweep-end'); });
  await page.waitForTimeout(1200);

  // A5 settings → md3-slider-fill clip-path（R8 修复处；子页常驻 DOM，直接读 computed）
  await page.evaluate(() => { const s = window.__state; s && (s.isOpen = false); });
  await page.evaluate(async () => {
    const { initialApps } = await import('/js/apps-data.js');
    const { openApp } = await import('/js/app-window.js');
    const idx = initialApps.findIndex(a => a.id === 'settings');
    if (idx !== -1) openApp(idx);
  });
  await page.waitForTimeout(1600);
  const a5 = await page.evaluate(() => {
    const f = document.querySelector('.md3-slider-fill, .m3-slider-track-fill');
    if (!f) return { err: 'no-slider', wins: [...document.querySelectorAll('.app-window')].map(w => w.dataset?.id || w.className).slice(0, 3) };
    const cs = getComputedStyle(f);
    return { cp: cs.clipPath, wcp: cs.webkitClipPath, display: cs.display };
  });
  add('A5', !a5.err && a5.cp !== 'none' && a5.cp !== '', a5.err ? `slider miss wins=${JSON.stringify(a5.wins)}` : `slider clipPath=${a5.cp} wk=${a5.wcp} display=${a5.display}`);

  // A6 widget-card user-select（place battery 2×1 → 第 2 页@p1 R9 语义）
  const a6 = await page.evaluate(async () => {
    const B = window.__widgetBoard;
    const res = await B.place('battery');
    await new Promise(r => setTimeout(r, 900));
    const cards = document.querySelectorAll('.widget-card');
    const card = cards[cards.length - 1];
    const probe = card ? (card.querySelector('.widget-inner') || card) : null;
    // live CSSStyleDeclaration 纪律：remove 前立即物化字符串（detached 后求值得 ''）
    const usSnapshot = probe ? (getComputedStyle(probe).webkitUserSelect || getComputedStyle(probe).userSelect) : 'NO_CARD';
    let cleaned = true;
    try { if (res?.id) await B.remove(res.id); else if (res && typeof res === 'object') { const k = Object.keys(res).find(x => res[x]?.id); if (k) await B.remove(res[k].id); } else if (typeof res === 'string') await B.remove(res); } catch (e) { cleaned = String(e); }
    await new Promise(r => setTimeout(r, 600));
    return { placed: !!res, sel: usSnapshot, res: JSON.stringify(res).slice(0, 120), cleaned };
  });
  add('A6', a6.placed && a6.sel === 'none' && a6.cleaned === true, `widget placed=${a6.placed} user-select=${a6.sel} clean=${a6.cleaned}`);

  // B1 降级演练：现场 stub vibrate/getBattery → 真实交互链（R8 教训④：evaluate 现场 stub）
  const b1 = await page.evaluate(async () => {
    navigator.vibrate = undefined;
    navigator.getBattery = undefined;
    const { openAllApps } = await import('/js/all-apps.js');
    openAllApps('sweep-degrade');
    await new Promise(r => setTimeout(r, 1200));
    const ov = document.querySelector('.all-apps-overlay');
    return { opened: !!(ov && (ov.classList.contains('active') || ov.querySelector('.aa-sheet'))) };
  });
  const a7 = await page.evaluate(() => {
    const g = document.querySelector('.all-apps-overlay .aa-grid');
    if (!g) return { s: 'NO_OVERLAY' };
    return { s: getComputedStyle(g).webkitUserSelect || getComputedStyle(g).userSelect };
  });
  add('A7', a7.s === 'none', `all-apps aa-grid user-select=${a7.s}`);
  const c1 = await page.evaluate(() => {
    const scrim = document.querySelector('.all-apps-overlay .aa-scrim');
    if (!scrim) return { bf: 'NO_SCRIM' };
    const cs = getComputedStyle(scrim);
    return { bf: cs.backdropFilter || cs.webkitBackdropFilter };
  });
  add('C1', c1.bf && c1.bf.includes('blur'), `all-apps scrim bf=${c1.bf}`);
  // B1 真实链收尾：Esc 关 AllApps + import 链再开 calculator（重复开窗路径）
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  await page.evaluate(async () => {
    const { initialApps } = await import('/js/apps-data.js');
    const { openApp } = await import('/js/app-window.js');
    const idx = initialApps.findIndex(a => a.id === 'calculator');
    if (idx !== -1) openApp(idx);
  });
  await page.waitForTimeout(900);
  add('B1', b1.opened !== false && b1.opened !== undefined, `degrade chain ok allAppsActive=${JSON.stringify(b1.opened)}`);

  // B2 降级演练后零新增 pageerror
  add('B2', pageErrors.length === 0, `pageErrors=${pageErrors.length}`);

  // 截图留痕
  await page.evaluate(async () => { try { window.closeAllApps?.(); } catch (e) {} try { window.__widgetBoard && 0; } catch (e) {} });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/sweep/s12-desktop-final.png' });

} catch (e) {
  add('FATAL', false, String(e).slice(0, 300));
}

add('K1', pageErrors.length === 0, `total pageerror=${pageErrors.length}${pageErrors.length ? ' :: ' + pageErrors[0].slice(0, 160) : ''}`);

const pass = results.filter(r => r.ok).length;
console.log(`\n== R12 compat sweep: ${pass}/${results.length} PASS ==`);
await browser.close();
process.exit(pass === results.length ? 0 : 1);
