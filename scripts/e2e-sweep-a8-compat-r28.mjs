// R28=A 类（兼容性）e2e：R12/R16/R20/R24 口径原样复验 + R25/R26/R27 新增面兼容维度交叉抽证
// 传承：服务根=ios-desktop/，断网 route.abort，armed 重试兜底，live 样式表读后立即物化（R12 事实①）
// R27 遗留指向 verbatim：R24 后隔 4 轮回归窗口（v8.84-87 连续零产品变更，兼容面预期稳定），可查面：
// scan-compat-r12.py 全库前缀配对复扫（R12/R16/R20/R24 四轮口径逐字一致基线直接 diff：22 文件/6465
// 声明/五族配对 user-select 31/31/appearance 2/2/clip-path 2/2/background-clip 1/1/backdrop-filter
// 37/37）+ 观察项维持确认 + R12 A 组 6 处+R16 增量 3 处 computed 抽证原样复跑 + C 组 scrim/tbt-bar
// bf + B 组降级演练 + S 组 @1024 + U 组 @600，增量重点 R25/R26/R27 新增面兼容维度交叉抽证
// （R25 SP-G600 600 档逐帧几何留档/R26 SPV600 视觉快照跨旋转 600 档留档/R27 SPG6D 600 档帧预算+
// SP-H390 390 档快照链 SV 前置锚留档 → V 组 600 档动态旋转 computed 恒定 A 类口径正式化 + W 组 390
// 档静态交叉抽证 A 类口径补档）
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

  // P1 前置：桌面在场（R12 原样 + __widgetBoard 锚）
  const p1 = await page.evaluate(() => ({
    icons: document.querySelectorAll('.icon-box').length,
    dock: document.querySelectorAll('.dock-app-icon').length,
    glogo: !!document.querySelector('.search-g-logo'),
    wb: !!window.__widgetBoard,
  }));
  add('P1', p1.icons > 0 && p1.dock > 0 && p1.glogo && p1.wb, `icon-box=${p1.icons} dock=${p1.dock} glogo=${p1.glogo} wb=${p1.wb}`);

  // A1 桌面图标 user-select（R8 修复族 computed 抽证，R12/R16/R20/R24 原样）
  const a1 = await page.evaluate(() => {
    const el = document.querySelector('.icon-box');
    if (!el) return { s: 'NO_ICON' };
    const cs = getComputedStyle(el);
    return { s: cs.webkitUserSelect || cs.userSelect, tag: el.tagName };
  });
  add('A1', a1.s === 'none', `desktop-icon user-select=${a1.s}`);

  // A3 dock-app-icon appearance（R8 修复处：button 双属性，原样）
  const a3 = await page.evaluate(() => {
    const b = document.querySelector('.dock-app-icon');
    const cs = getComputedStyle(b);
    return { ap: cs.appearance, wap: cs.webkitAppearance, tag: b.tagName };
  });
  add('A3', a3.ap === 'none' && a3.wap === 'none', `dock-app appearance=${a3.ap} webkit=${a3.wap} tag=${a3.tag}`);

  // A4 search-g-logo background-clip:text（R8 修复处：渐变字双写，原样）
  const a4 = await page.evaluate(() => {
    const el = document.querySelector('.search-g-logo');
    if (!el) return { std: 'NO_EL' };
    const cs = getComputedStyle(el);
    return { std: cs.backgroundClip, wk: cs.webkitBackgroundClip, fill: cs.webkitTextFillColor };
  });
  add('A4', a4.wk === 'text' && a4.std === 'text', `bg-clip std=${a4.std} wk=${a4.wk} fill=${a4.fill}`);

  // A8 svg user-select（R8 A1-5 口径回补，原样）
  const a8 = await page.evaluate(() => {
    const sv = document.querySelector('.icon-box svg') || document.querySelector('svg');
    if (!sv) return { s: 'NO_SVG' };
    const cs = getComputedStyle(sv);
    return { s: cs.webkitUserSelect || cs.userSelect, tag: sv.tagName };
  });
  add('A8', a8.s === 'NO_SVG' || a8.s === 'none', `svg user-select=${a8.s}`);

  // A2 开 calculator（真实 import 链）→ app-window user-select（原样）
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

  // C2 armed（app 全屏 + 5s 自动收纳）→ transient 唤出栏 computed（bf 双写 + 999px 圆角，原样 + 重试兜底）
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

  // A5 settings → md3-slider-fill clip-path（R8 修复处，原样）
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

  // A6 widget-card place battery 2×1 → widget-inner user-select（live 物化，原样）
  // C3 widget-card backdrop-filter 兼容面（原样：blur(20px) saturate(1.5) 双写）
  const a6 = await page.evaluate(async () => {
    const B = window.__widgetBoard;
    const res = await B.place('battery');
    await new Promise(r => setTimeout(r, 900));
    const cards = document.querySelectorAll('.widget-card');
    const card = cards[cards.length - 1];
    const probe = card ? (card.querySelector('.widget-inner') || card) : null;
    const usSnapshot = probe ? (getComputedStyle(probe).webkitUserSelect || getComputedStyle(probe).userSelect) : 'NO_CARD';
    const bfSnapshot = card ? (getComputedStyle(card).backdropFilter || getComputedStyle(card).webkitBackdropFilter) : 'NO_CARD';
    const radSnapshot = card ? getComputedStyle(card).borderRadius : 'NO_CARD';
    let cleaned = true;
    try { if (res?.id) await B.remove(res.id); else if (res && typeof res === 'object') { const k = Object.keys(res).find(x => res[x]?.id); if (k) await B.remove(res[k].id); } else if (typeof res === 'string') await B.remove(res); } catch (e) { cleaned = String(e); }
    await new Promise(r => setTimeout(r, 600));
    return { placed: !!res, sel: usSnapshot, bf: bfSnapshot, rad: radSnapshot, cleaned };
  });
  add('A6', a6.placed && a6.sel === 'none' && a6.cleaned === true, `widget placed=${a6.placed} user-select=${a6.sel} clean=${a6.cleaned}`);
  add('C3', a6.bf && a6.bf.includes('blur') && a6.bf.includes('saturate'), `widget-card bf=${a6.bf} radius=${a6.rad}`);

  // A9 mini-btn appearance（原样：存在则断 none，小窗未开时豁免）
  const a9 = await page.evaluate(() => {
    const el = document.querySelector('.mini-window .mini-btn, .mini-btn');
    if (!el) return { s: 'NO-EL' };
    return { s: getComputedStyle(el).appearance };
  });
  add('A9', a9.s === 'NO-EL' || a9.s === 'none', `mini-btn appearance=${a9.s}`);

  // B1 降级演练：现场 stub vibrate/getBattery → 真实交互链（R8 教训④，原样）
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

  // B2 降级演练后零新增 pageerror（原样）
  add('B2', pageErrors.length === 0, `pageErrors=${pageErrors.length}`);

  // ============ S 组：split-pane 兼容维度交叉抽证 @1024（R20/R24 判据原样） ============
  console.log('S 组 split-pane 兼容维度交叉抽证 @1024');
  const spOpen = await page.evaluate(async () => {
    const M = await import('/js/split-screen.js');
    try { M.enterSplit({ appAId: 'calculator', appBId: 'notes', rectA: { left: 300, top: 200, width: 220, height: 160 }, rectB: { left: 700, top: 200, width: 220, height: 160 }, ratio: 0.5 }); return 'OK'; } catch (e) { return 'ERR:' + e.message; }
  });
  await page.waitForTimeout(1500);
  const sGrp = await page.evaluate(() => {
    const pane = document.querySelector('.split-pane');
    const header = document.querySelector('.split-pane .app-header');
    if (!pane) return { err: 'NO_PANE' };
    const cs = getComputedStyle(pane);
    const ch = header ? getComputedStyle(header) : null;
    return {
      bg: String(cs.backgroundColor),
      rad: String(cs.borderRadius),
      us: cs.webkitUserSelect || cs.userSelect,
      h: ch ? String(ch.height) : 'NO_HEADER',
      pad: ch ? String(ch.padding) : 'NO_HEADER',
    };
  });
  add('S0', spOpen === 'OK' && !sGrp.err, `split open=${spOpen} pane=${sGrp.err || 'OK'}`);
  add('S1', sGrp.bg === 'rgb(248, 250, 252)', `split-pane bg=${sGrp.bg}（R19/R20/R24 基准 1024 档交叉抽证）`);
  add('S2', sGrp.rad === '0px', `split-pane border-radius=${sGrp.rad}（R18 事实③ computed 复证）`);
  add('S3', sGrp.h === '48px' && sGrp.pad === '0px 16px', `app-header height=${sGrp.h} padding=${sGrp.pad}`);
  const spExit = await page.evaluate(async () => {
    const M = await import('/js/split-screen.js');
    try { M.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; }
  });
  await page.waitForTimeout(1200);
  add('S4', spExit === 'OK', `split 收场零挂死=${spExit}`);

  // ============ U 组：600 中间档兼容交叉抽证（R24 判据原样） ============
  console.log('U 组 600 中间档兼容交叉抽证（R24 原样复验）');
  await page.setViewportSize({ width: 600, height: 962 });
  await page.waitForTimeout(900);
  const uOpen = await page.evaluate(async () => {
    const M = await import('/js/split-screen.js');
    try { M.enterSplit({ appAId: 'calculator', appBId: 'notes', rectA: { left: 40, top: 120, width: 160, height: 120 }, rectB: { left: 320, top: 120, width: 160, height: 120 }, ratio: 0.5 }); return 'OK'; } catch (e) { return 'ERR:' + e.message; }
  });
  await page.waitForTimeout(1500);
  const uGrp = await page.evaluate(() => {
    const pane = document.querySelector('.split-pane');
    const header = document.querySelector('.split-pane .app-header');
    const info = window.__splitInfo && window.__splitInfo();
    if (!pane) return { err: 'NO_PANE' };
    const cs = getComputedStyle(pane);
    const ch = header ? getComputedStyle(header) : null;
    return {
      n: document.querySelectorAll('.split-pane').length,
      axis: info ? info.axis : null, active: info ? !!info.active : null,
      bg: String(cs.backgroundColor), rad: String(cs.borderRadius),
      us: cs.webkitUserSelect || cs.userSelect,
      h: ch ? String(ch.height) : 'NO_HEADER',
      pad: ch ? String(ch.padding) : 'NO_HEADER',
    };
  });
  add('U0', uOpen === 'OK' && !uGrp.err && uGrp.n === 2 && uGrp.axis === 'y' && uGrp.active === true, `open=${uOpen} n=${uGrp.n} axis=${uGrp.axis} active=${uGrp.active}`);
  add('U1', uGrp.bg === 'rgb(248, 250, 252)', `split-pane bg=${uGrp.bg}（R21 SV-600 留档基准交叉抽证：五轮窗口第六次命中）`);
  add('U2', uGrp.rad === '0px' && uGrp.h === '48px' && uGrp.pad === '0px 16px', `rad=${uGrp.rad} hdrH=${uGrp.h} hdrPad=${uGrp.pad}（三属性基准 600 档全等）`);
  add('U3', uGrp.us === 'none', `split-pane user-select=${uGrp.us}（R8 全局 * 规则命中 @600 档）`);
  const uExit = await page.evaluate(async () => {
    const M = await import('/js/split-screen.js');
    try { M.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; }
  });
  await page.waitForTimeout(1200);
  add('U4', uExit === 'OK', `600 档 split 收场零挂死=${uExit}`);

  // ============ V 组·本轮增量①：600 档动态旋转 computed 恒定 A 类口径正式化（R26 SPV600 口径 A 类视角） ============
  console.log('V 组 600 档动态旋转兼容抽证（R26 SPV600 口径 A 类视角）');
  const vOpen = await page.evaluate(async () => {
    const M = await import('/js/split-screen.js');
    try { M.enterSplit({ appAId: 'calculator', appBId: 'notes', rectA: { left: 40, top: 120, width: 160, height: 120 }, rectB: { left: 320, top: 120, width: 160, height: 120 }, ratio: 0.5 }); return 'OK'; } catch (e) { return 'ERR:' + e.message; }
  });
  await page.waitForTimeout(1500);
  const vBase = await page.evaluate(() => {
    const pane = document.querySelector('.split-pane');
    const header = document.querySelector('.split-pane .app-header');
    const info = window.__splitInfo && window.__splitInfo();
    if (!pane) return { err: 'NO_PANE' };
    const cs = getComputedStyle(pane);
    const ch = header ? getComputedStyle(header) : null;
    return { axis: info ? info.axis : null, active: info ? !!info.active : null,
      bg: String(cs.backgroundColor), rad: String(cs.borderRadius),
      us: cs.webkitUserSelect || cs.userSelect,
      h: ch ? String(ch.height) : 'NO_HEADER', pad: ch ? String(ch.padding) : 'NO_HEADER' };
  });
  add('V0', vOpen === 'OK' && !vBase.err && vBase.axis === 'y' && vBase.active === true, `open=${vOpen} axis=${vBase.axis} active=${vBase.active}`);
  add('V1', vBase.bg === 'rgb(248, 250, 252)' && vBase.rad === '0px' && vBase.h === '48px' && vBase.pad === '0px 16px' && vBase.us === 'none', `base bg=${vBase.bg} rad=${vBase.rad} h=${vBase.h} pad=${vBase.pad} usel=${vBase.us}（R24 U 组口径延续）`);
  // 正向旋转 600×962 → 962×600（R25 SP-G600/R27 SPG6D 同款档位）
  await page.setViewportSize({ width: 962, height: 600 });
  await page.waitForTimeout(1400);
  const vRot = await page.evaluate(() => {
    const pane = document.querySelector('.split-pane');
    const header = document.querySelector('.split-pane .app-header');
    const info = window.__splitInfo && window.__splitInfo();
    if (!pane) return { err: 'NO_PANE' };
    const cs = getComputedStyle(pane);
    const ch = header ? getComputedStyle(header) : null;
    return { axis: info ? info.axis : null, active: info ? !!info.active : null,
      bg: String(cs.backgroundColor), rad: String(cs.borderRadius),
      us: cs.webkitUserSelect || cs.userSelect,
      h: ch ? String(ch.height) : 'NO_HEADER', pad: ch ? String(ch.padding) : 'NO_HEADER' };
  });
  add('V2', vRot.axis === 'x' && vRot.active === true, `rot axis=${vRot.axis} active=${vRot.active}（R25 SP-G600-1a 末态口径）`);
  add('V3', vRot.bg === vBase.bg && vRot.rad === vBase.rad && vRot.h === vBase.h && vRot.pad === vBase.pad && vRot.us === vBase.us, `旋转后 computed 五属性恒定（R26 SPV600 口径 A 类正式化：bg/rad/hdrH/hdrPad/usel）`);
  // 旋回 962×600 → 600×962
  await page.setViewportSize({ width: 600, height: 962 });
  await page.waitForTimeout(1400);
  const vBack = await page.evaluate(() => {
    const pane = document.querySelector('.split-pane');
    const header = document.querySelector('.split-pane .app-header');
    const info = window.__splitInfo && window.__splitInfo();
    if (!pane) return { err: 'NO_PANE' };
    const cs = getComputedStyle(pane);
    const ch = header ? getComputedStyle(header) : null;
    return { axis: info ? info.axis : null, bg: String(cs.backgroundColor), rad: String(cs.borderRadius),
      us: cs.webkitUserSelect || cs.userSelect,
      h: ch ? String(ch.height) : 'NO_HEADER', pad: ch ? String(ch.padding) : 'NO_HEADER' };
  });
  add('V4', vBack.axis === 'y' && vBack.bg === vBase.bg && vBack.rad === vBase.rad && vBack.h === vBase.h && vBack.pad === vBase.pad && vBack.us === vBase.us, `旋回 axis=y + 五属性与基准全等`);
  const vExit = await page.evaluate(async () => {
    const M = await import('/js/split-screen.js');
    try { M.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; }
  });
  await page.waitForTimeout(1200);
  add('V5', vExit === 'OK', `V 组收场零挂死=${vExit}`);

  // ============ W 组·本轮增量②：390 档静态交叉抽证 A 类口径补档（R27 SPH390 SV 前置锚正式化） ============
  console.log('W 组 390 档静态兼容交叉抽证（R27 SPH390 锚 A 类口径）');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(900);
  const wOpen = await page.evaluate(async () => {
    const M = await import('/js/split-screen.js');
    try { M.enterSplit({ appAId: 'calculator', appBId: 'notes', rectA: { left: 30, top: 120, width: 140, height: 110 }, rectB: { left: 200, top: 120, width: 140, height: 110 }, ratio: 0.5 }); return 'OK'; } catch (e) { return 'ERR:' + e.message; }
  });
  await page.waitForTimeout(1500);
  const wGrp = await page.evaluate(() => {
    const pane = document.querySelector('.split-pane');
    const header = document.querySelector('.split-pane .app-header');
    const info = window.__splitInfo && window.__splitInfo();
    if (!pane) return { err: 'NO_PANE' };
    const cs = getComputedStyle(pane);
    const ch = header ? getComputedStyle(header) : null;
    return { n: document.querySelectorAll('.split-pane').length, axis: info ? info.axis : null,
      bg: String(cs.backgroundColor), rad: String(cs.borderRadius),
      us: cs.webkitUserSelect || cs.userSelect,
      h: ch ? String(ch.height) : 'NO_HEADER', pad: ch ? String(ch.padding) : 'NO_HEADER' };
  });
  add('W0', wOpen === 'OK' && !wGrp.err && wGrp.n === 2 && wGrp.axis === 'y', `open=${wOpen} n=${wGrp.n} axis=${wGrp.axis}（R19 SP 同款 rect）`);
  add('W1', wGrp.bg === 'rgb(248, 250, 252)' && wGrp.rad === '0px' && wGrp.h === '48px' && wGrp.pad === '0px 16px' && wGrp.us === 'none', `390 档五属性全命中（R26 U-W 组 A 类口径复核：bg/rad/hdrH/hdrPad/usel）`);
  const wExit = await page.evaluate(async () => {
    const M = await import('/js/split-screen.js');
    try { M.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; }
  });
  await page.waitForTimeout(1200);
  add('W2', wExit === 'OK', `390 档 split 收场零挂死=${wExit}`);

  // 截图留痕（s28）
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(700);
  await page.evaluate(async () => { try { window.closeAllApps?.(); } catch (e) {} });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/sweep/s28-compat-final.png' });

} catch (e) {
  add('FATAL', false, String(e).slice(0, 300));
}

add('K1', pageErrors.length === 0, `total pageerror=${pageErrors.length}${pageErrors.length ? ' :: ' + pageErrors[0].slice(0, 160) : ''}`);

const pass = results.filter(r => r.ok).length;
console.log(`\n== R28 compat sweep: ${pass}/${results.length} PASS ==`);
await browser.close();
process.exit(pass === results.length ? 0 : 1);
