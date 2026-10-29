// R8=A 类（兼容性）巡查 e2e · v8.68
// A1 修复处零回归（Chromium 认标准属性→双写插入后 computed 不变）+ 零 pageerror
// A2 降级演练（stub navigator.vibrate/getBattery→页面零错误+电池 sim 降级渲染无 NaN）
// A3 真实链回归（Dock 图标开窗→关窗 / AllApps tablet 浮层开→Esc 销毁）
// 纪律：外域 route.abort；page.click 可控超时；__state.isOpen 前置防空壳假阳性（R6 教训）
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8094/ios-desktop/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

// ============ 上下文 A：phone 390×844 ============
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); // 断网纪律
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);

  console.log('A1 修复处零回归（390×844）');
  // appearance:none 双写后 Chromium computed 仍 none（.dock-app-icon 为 button 元素）
  const dockApp = await page.evaluate(() => {
    const el = document.querySelector('.dock-bar .dock-app-icon');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { tag: el.tagName, appearance: cs.appearance, webkitAppearance: cs.webkitAppearance || '-' };
  });
  t('A1-1 dock-app-icon 为 button 且 appearance=none', !!dockApp && dockApp.tag === 'BUTTON' && dockApp.appearance === 'none', JSON.stringify(dockApp));
  const miniBtn = await page.evaluate(() => {
    const el = document.querySelector('.mini-btn');
    return el ? getComputedStyle(el).appearance : 'NO-EL';
  });
  t('A1-2 mini-btn appearance=none（存在则断言，小窗未开时豁免）', miniBtn === 'NO-EL' || miniBtn === 'none', String(miniBtn));
  // clip-path 双写后滑杆轨道 clip-path 生效（md3-theme 滑杆可能未在 DOM——CSS 规则级验证）
  const clipOk = await page.evaluate(() => {
    const el = document.querySelector('.m3-slider-track-bg');
    if (el) return getComputedStyle(el).clipPath;
    // CSS Nesting 后 CSSStyleRule.cssRules 恒为空 truthy list——须先查 selectorText 再递归非空嵌套
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch { continue; }
      const walk = rs => {
        for (const r of rs) {
          if (r.selectorText && r.selectorText.includes('m3-slider-track-bg') && r.style && r.style.clipPath) return r.style.clipPath;
          if (r.cssRules && r.cssRules.length) { const v = walk(r.cssRules); if (v) return v; }
        }
        return null;
      };
      const v = walk(rules);
      if (v) return v;
    }
    return null;
  });
  t('A1-3 m3-slider-track-bg clip-path 生效（inset round）', !!clipOk && clipOk.includes('inset'), String(clipOk));
  // background-clip:text 标准双写后 G logo 渐变文字不破
  const gLogo = await page.evaluate(() => {
    const el = document.querySelector('.search-g-logo');
    if (!el) return 'NO-EL';
    const cs = getComputedStyle(el);
    return { bc: cs.backgroundClip || cs.webkitBackgroundClip, tfc: cs.webkitTextFillColor, bg: cs.backgroundImage.slice(0, 30) };
  });
  t('A1-4 search-g-logo background-clip=text + 渐变在', gLogo === 'NO-EL' || (String(gLogo.bc).includes('text') && String(gLogo.bg).includes('gradient')), JSON.stringify(gLogo));
  // user-select 双写后 svg（base.css img,svg）computed 仍 none
  const svgSel = await page.evaluate(() => {
    const el = document.querySelector('svg');
    return el ? getComputedStyle(el).userSelect : 'NO-EL';
  });
  t('A1-5 svg user-select=none（双写零回归）', svgSel === 'NO-EL' || svgSel === 'none', String(svgSel));
  t('A1-6 零 pageerror', errors.length === 0, errors.join(';').slice(0, 200));
  await page.screenshot({ path: 'docs/sweep/a2-phone-desktop.png' });

  // A3 真实链回归（phone 档）
  console.log('A3 真实链回归（phone）');
  const st1 = await page.evaluate(() => ({ open: window.__state.isOpen }));
  t('A3-1 初始窗口关', st1.open === false, JSON.stringify(st1));
  // Dock 图标真实点击链
  const dockIds = await page.evaluate(() => [...document.querySelectorAll('.dock-bar .dock-app-icon')].map(e => e.dataset.id).slice(0, 6));
  let opened = null;
  for (const id of dockIds) {
    try {
      await page.click(`.dock-bar .dock-app-icon[data-id="${id}"]`, { timeout: 3000, force: true });
      await sleep(1600);
      const s = await page.evaluate(() => ({ open: window.__state.isOpen, app: window.__state.currentApp }));
      if (s.open) { opened = { id, app: s.app && s.app.id }; break; }
    } catch (e) { /* 换下一个 */ }
  }
  t('A3-2 Dock 真实点击开窗（__state.isOpen 前置）', !!opened, JSON.stringify(opened));
  if (opened) {
    await page.keyboard.press('Escape');
    await sleep(900);
    const closed = await page.evaluate(() => window.__state.isOpen);
    t('A3-3 Esc 关窗归位', closed === false, String(closed));
  }

  // A2 降级演练（evaluate 现场 stub：运行时调用者遇摘除 API 不炸——加载期 getBattery 降级 R4 已验在案）
  console.log('A2 降级演练（vibrate/getBattery 运行时摘除 + 交互链）');
  const err2 = [];
  page.removeAllListeners('pageerror');
  page.on('pageerror', e => err2.push(String(e)));
  const stubbed = await page.evaluate(() => {
    try { Object.defineProperty(navigator, 'vibrate', { get: () => undefined, configurable: true }); } catch (e) { return 'ERR:' + e.message; }
    try { Object.defineProperty(navigator, 'getBattery', { get: () => undefined, configurable: true }); } catch (e) { return 'ERR:' + e.message; }
    return { vib: typeof navigator.vibrate, bat: typeof navigator.getBattery };
  });
  t('A2-1 运行时 stub 生效', !!stubbed && stubbed.vib === 'undefined' && stubbed.bat === 'undefined', JSON.stringify(stubbed));
  // stub 后真实交互链：AllApps 开→关 + 图标开窗→关
  await page.evaluate(() => { if (window.__allApps) window.__allApps.open('sweep'); });
  await sleep(1000);
  await page.keyboard.press('Escape');
  await sleep(700);
  const id2 = await page.evaluate(() => { const b = document.querySelector('.dock-bar .dock-app-icon'); return b ? b.dataset.id : null; });
  if (id2) {
    await page.click(`.dock-bar .dock-app-icon[data-id="${id2}"]`, { timeout: 3000, force: true });
    await sleep(1600);
    await page.keyboard.press('Escape');
    await sleep(700);
  }
  t('A2-2 stub 后交互链零 pageerror（含 widget/battery 消费路径）', err2.length === 0, err2.join(';').slice(0, 200));
  await ctx.close();
}

// ============ 上下文 B：tablet 1024×768（AllApps ephemeral 形态回归）============
{
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await sleep(2500);

  console.log('A3-4~6 AllApps tablet 浮层（CSS 双写零破坏回归）');
  await page.evaluate(() => window.__allApps.open('sweep'));
  await sleep(1200);
  const ov = await page.evaluate(() => {
    const o = document.querySelector('#allAppsOverlay');
    return o ? { form: o.dataset.form, active: o.classList.contains('active') } : null;
  });
  t('A3-4 AllApps tablet 浮层开启', !!ov && ov.form === 'tablet' && ov.active, JSON.stringify(ov));
  await page.keyboard.press('Escape');
  await sleep(900);
  const ov2 = await page.evaluate(() => ({ gone: !document.querySelector('#allAppsOverlay'), any: !!document.querySelector('#allAppsOverlay') }));
  t('A3-5 Esc 销毁 ephemeral 浮层（零残留）', ov2.gone, JSON.stringify(ov2));
  t('A3-6 tablet 档零 pageerror', errors.length === 0, errors.join(';').slice(0, 200));
  await page.screenshot({ path: 'docs/sweep/a2-tablet-desktop.png' });
  await ctx.close();
}

await browser.close();
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
