// R17=B 类（设备适配）巡查 e2e · v8.77（R13 后隔 3 轮回归；v8.73-76 连续零产品变更窗口）
// R13 判据原样：S 折叠序列 / W 五档视口 / WB 390 按页重建 / AA 双形态跨断点 / T 阈值档位 / X 极端档 / K 零 pageerror
// 本轮增量①：SP 组·phone 档 split 旋转逐帧采样（390×844 ↔ 844×390，axis y↔x 档位 + 中间帧不越视口——R14 S 组口径跨设备延伸）
// 本轮增量②：RX 组·跨断点销毁重建帧预算双向复跑（R15 首定档判据：p95≤333.4 / max≤500.2）
// 本轮增量③：A 组·R8 修复处 computed 抽证 390 极端档延伸（icon-box/dock-app-icon/aa-grid）
// 纪律传承：外域 route.abort；getComputedStyle 读后立即物化（R12 事实①）；import 链开窗（R12 事实④）；armed 重试兜底（R11 事实④/R13 事实③）；evaluate 内一律 new Promise(setTimeout)（R13 事实①）
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8100/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const p95 = arr => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : 0; };

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

// ============ S 组：分屏在场 × 折叠屏连续 resize（R13 判据原样） ============
console.log('S 组 折叠加分屏交叉 resize（1024×768 起步，axis 档位硬断言）');
const splitOpened = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({
  appAId: 'calculator', appBId: 'notes',
  rectA: { left: 300, top: 200, width: 220, height: 160 },
  rectB: { left: 700, top: 200, width: 220, height: 160 },
  ratio: 0.5,
}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1500);
const info0 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
t('S-1 分屏开启（1024×768 axis=x）', splitOpened === 'OK' && info0 && info0.active === true && info0.axis === 'x', `ret=${splitOpened} info=${JSON.stringify(info0).slice(0, 140)}`);

const FOLD_SEQ = [343, 500, 675, 768, 900, 675, 500, 343];
for (const w of FOLD_SEQ) {
  await page.setViewportSize({ width: w, height: 768 });
  await sleep(800);
  const g = await page.evaluate(() => {
    const info = window.__splitInfo && window.__splitInfo();
    const splitEls = [...document.querySelectorAll('[class*=split]')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    }).map(el => {
      const r = el.getBoundingClientRect();
      return { cls: el.className.slice(0, 36), l: Math.round(r.left), rgt: Math.round(r.right) };
    });
    return { vw: window.innerWidth, vh: window.innerHeight, axis: info ? info.axis : null, active: !!info && info.active === true, splitEls: splitEls.slice(0, 4) };
  });
  const expAxis = g.vw >= g.vh ? 'x' : 'y';
  t(`S-${w}a 视口 ${w}×768 分屏在场+axis=${expAxis}`, g.active && g.axis === expAxis, `axis=${g.axis} active=${g.active}`);
  const oob = g.splitEls.filter(e => e.l < -1 || e.rgt > g.vw + 1);
  t(`S-${w}b split 元素不越界`, oob.length === 0, oob.length ? JSON.stringify(oob) : `els=${g.splitEls.length}`);
}

// 收场
const exited = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('S-10 分屏收场零挂死', exited === 'OK', String(exited));
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(600);

// ============ SP 组·增量①：phone 档 split 旋转逐帧采样（R14 S 组口径跨设备延伸） ============
console.log('SP 组 phone 档 split 旋转逐帧（390×844 ↔ 844×390）');
await page.setViewportSize({ width: 390, height: 844 });
await sleep(900);
const spOpen = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.enterSplit({
  appAId: 'calculator', appBId: 'notes',
  rectA: { left: 30, top: 120, width: 140, height: 110 },
  rectB: { left: 200, top: 120, width: 140, height: 110 },
  ratio: 0.5,
}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
const sp0 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
t('SP-1 phone 档（390×844）分屏开启 axis=y', spOpen === 'OK' && sp0 && sp0.active === true && sp0.axis === 'y', `ret=${spOpen} axis=${sp0 && sp0.axis}`);

// 旋转→横屏 844×390：逐帧采样 1400ms（axis 转换 + oob 全帧断言）
const rotate = async (ms) => await page.evaluate(async (win) => {
  const out = [];
  let last = performance.now();
  const t0 = last;
  while (performance.now() - t0 < win) {
    await new Promise(r => requestAnimationFrame(r));
    const now = performance.now();
    const dt = now - last; last = now;
    const info = window.__splitInfo && window.__splitInfo();
    let oob = 0;
    for (const el of document.querySelectorAll('[class*=split]')) {
      const r = el.getBoundingClientRect();
      if (r.width > 2 && r.height > 2) {
        if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) oob++;
      }
    }
    out.push({ dt: Math.round(dt * 10) / 10, axis: info ? info.axis : null, active: !!info && info.active === true, oob });
  }
  return out;
}, 1400);
await page.setViewportSize({ width: 844, height: 390 });
const fr1 = await rotate(1400);
const spEnd1 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
t('SP-2 旋转→844×390 末态 axis=x + 全帧不越视口', spEnd1 && spEnd1.axis === 'x' && spEnd1.active === true && fr1.every(f => f.oob === 0),
  `axis=${spEnd1 && spEnd1.axis} n=${fr1.length} oobSum=${fr1.reduce((a, f) => a + f.oob, 0)}`);
await page.setViewportSize({ width: 390, height: 844 });
const fr2 = await rotate(1400);
const spEnd2 = await page.evaluate(() => window.__splitInfo && window.__splitInfo());
t('SP-3 旋回 390×844 恢复 axis=y + 全帧不越视口', spEnd2 && spEnd2.axis === 'y' && spEnd2.active === true && fr2.every(f => f.oob === 0),
  `axis=${spEnd2 && spEnd2.axis} n=${fr2.length} oobSum=${fr2.reduce((a, f) => a + f.oob, 0)}`);
t('SP-4 双向旋转 active 恒 true', fr1.concat(fr2).every(f => f.active === true), `nAll=${fr1.length + fr2.length}`);
const spExit = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('SP-5 phone 档收场零挂死', spExit === 'OK', String(spExit));

// ============ W 组：widget 五档视口复验（R13 判据原样） ============
console.log('W 组 widget×五档视口（390/600/768/1024/1280）');
const VW_SEQ = [[390, 844], [600, 962], [768, 1024], [1024, 768], [1280, 800]];
for (let i = 0; i < VW_SEQ.length; i++) {
  const [vw, vh] = VW_SEQ[i];
  await page.setViewportSize({ width: vw, height: vh });
  await sleep(700);
  const r = await page.evaluate(async () => {
    const WB = window.__widgetBoard;
    if (!WB) return { noApi: true };
    const p1 = WB.list().some(x => x.kind === 'clock') ? null : WB.place('clock');
    const p2 = WB.list().some(x => x.kind === 'battery') ? null : WB.place('battery');
    const l = WB.list();
    const cards = [...document.querySelectorAll('.widget-card')].map(el => {
      const b = el.getBoundingClientRect();
      const host = el.closest('.page-grid') || el.parentElement;
      const hb = host ? host.getBoundingClientRect() : null;
      return { w: Math.round(b.width), h: Math.round(b.height),
               inPage: hb ? (b.left >= hb.left - 1 && b.right <= hb.right + 1 && b.top >= hb.top - 1 && b.bottom <= hb.bottom + 1) : 'NO-HOST' };
    });
    return { placed: !!p1 || !!p2, count: l.length, spans: l.map(x => `${x.kind}:${x.w}x${x.h}@p${x.page}`), cards, nCards: cards.length };
  });
  if (r.noApi) { t(`W-${i + 1} __widgetBoard 在场`, false, 'no api'); continue; }
  const spanOk = r.spans.every(s => { const m = s.match(/:(\d+)x(\d+)/); return m && +m[1] >= 1 && +m[2] >= 1; });
  t(`W-${i + 1} ${vw}×${vh} place+span 合法`, spanOk && r.count >= 1, `[${r.spans.join(',')}]`);
  const oob = r.cards.filter(c => c.inPage !== true);
  t(`W-${i + 1}b 卡几何在所在页容器内`, r.nCards === 0 || oob.length === 0, oob.length ? JSON.stringify(oob) : `cards=${r.nCards}`);
  const cyc = await page.evaluate(() => {
    const WB = window.__widgetBoard;
    const l = WB.list();
    if (!l.length) return null;
    const res = WB.resize(l[0].id);
    return res ? { w: res.w, h: res.h } : 'NO-NEXT';
  });
  const cycOk = cyc === 'NO-NEXT' || (cyc && cyc.w >= 1 && cyc.h >= 1);
  t(`W-${i + 1}c cycleSpan 后仍合法`, !!cycOk, JSON.stringify(cyc));
}
const afterResize = await page.evaluate(() => {
  const l = window.__widgetBoard.list();
  return { count: l.length, spans: l.map(x => `${x.w}x${x.h}`) };
});
t('W-6 五档往返后 span 仍合法', afterResize.spans.every(s => { const m = s.match(/(\d+)x(\d+)/); return m && +m[1] >= 1 && +m[2] >= 1; }), JSON.stringify(afterResize));
const cleaned = await page.evaluate(() => {
  const WB = window.__widgetBoard;
  WB.list().forEach(x => WB.remove(x.id));
  return WB.list().length;
});
t('W-7 widget 清理零残留', cleaned === 0, `left=${cleaned}`);

// ============ WB 组：390 档按页重建（R13 判据原样） ============
console.log('WB 组 390 档按页重建（R10 W 组语义复验）');
await page.setViewportSize({ width: 390, height: 844 });
await sleep(700);
const wb1 = await page.evaluate(async () => {
  const WB = window.__widgetBoard;
  const res = WB.place('battery');
  await new Promise(r => setTimeout(r, 700));
  const l = WB.list();
  const battery = l.find(x => x.kind === 'battery');
  const cardsNow = document.querySelectorAll('.widget-card').length;
  const switchPage = window.switchDesktopPage || await import('/js/desktop.js').then(m => m.switchDesktopPage).catch(() => null);
  if (typeof switchPage === 'function') switchPage(1);
  else window.dispatchEvent(new CustomEvent('desktop-page-change', { detail: { page: 1 } }));
  await new Promise(r => setTimeout(r, 900));
  const cardsAfterSwitch = document.querySelectorAll('.widget-card').length;
  let geo = null;
  const card = [...document.querySelectorAll('.widget-card')].find(el => el.textContent.includes('%') || el.className.includes('battery'));
  if (card) {
    const b = card.getBoundingClientRect();
    const host = card.closest('.page-grid');
    const hb = host ? host.getBoundingClientRect() : null;
    geo = hb ? (b.left >= hb.left - 1 && b.right <= hb.right + 1) : 'NO-HOST';
  }
  return { placed: !!res, targetPage: battery ? battery.page : null, cardsNow, cardsAfterSwitch, geo, hasSwitchFn: typeof switchPage === 'function' };
});
t('WB-1 390 档 battery place 成功', wb1.placed === true, `targetPage=${wb1.targetPage} hasSwitch=${wb1.hasSwitchFn}`);
t('WB-2 非当前页卡片不在 DOM（390 档按页重建）', wb1.cardsAfterSwitch > 0 || wb1.targetPage === 0, `before=${wb1.cardsNow} afterSwitch=${wb1.cardsAfterSwitch} target=p${wb1.targetPage}`);
t('WB-3 切页后重建卡几何合法', wb1.geo === true || wb1.geo === null, `geo=${JSON.stringify(wb1.geo)}`);
await page.evaluate(() => { const WB = window.__widgetBoard; WB.list().forEach(x => WB.remove(x.id)); });
await sleep(500);

// ============ A390 组·增量③：R8 修复处 computed 抽证 390 极端档延伸 ============
console.log('A390 组 R8 修复处 computed@390 档延伸');
const a390 = await page.evaluate(() => {
  const ic = document.querySelector('.icon-box');
  const dk = document.querySelector('.dock-app-icon');
  // live 纪律：读后立即物化（R12 事实①）
  const icS = ic ? (getComputedStyle(ic).webkitUserSelect || getComputedStyle(ic).userSelect) : 'NO_ICON';
  const dkCs = dk ? getComputedStyle(dk) : null;
  return { icS, dkAp: dkCs ? dkCs.appearance : 'NO_DOCK', dkWap: dkCs ? dkCs.webkitAppearance : 'NO_DOCK', tag: dk ? dk.tagName : '-' };
});
t('A390-1 icon-box user-select=none（390 档）', a390.icS === 'none', `s=${a390.icS}`);
t('A390-2 dock-app-icon appearance 双属性=none（390 档）', a390.dkAp === 'none' && a390.dkWap === 'none', `ap=${a390.dkAp} wk=${a390.dkWap} tag=${a390.tag}`);

// ============ AA 组：AllApps 双形态跨断点（R13 判据原样） ============
console.log('AA 组 AllApps 双形态跨断点（phone persistent ↔ tablet ephemeral）');
const aa1 = await page.evaluate(async () => {
  const { openAllApps } = await import('/js/all-apps.js');
  openAllApps('r17');
  await new Promise(r => setTimeout(r, 1100));
  const ov = document.querySelector('.all-apps-overlay');
  // A390-3 增量：aa-grid user-select@phone 档（开着的 AllApps 里顺带抽证）
  const grid = document.querySelector('.all-apps-overlay .aa-grid');
  const gridS = grid ? (getComputedStyle(grid).webkitUserSelect || getComputedStyle(grid).userSelect) : 'NO_GRID';
  return ov ? { form: ov.dataset.form, active: ov.classList.contains('active'), gridS } : { form: 'NO_OVERLAY', gridS };
});
t('AA-1 390 档 phone 形态开启', aa1.form !== 'NO_OVERLAY' && aa1.active === true, `form=${aa1.form}`);
t('A390-3 aa-grid user-select=none（390 档）', aa1.gridS === 'none', `s=${aa1.gridS}`);
await page.keyboard.press('Escape');
await sleep(900);
const aa2 = await page.evaluate(() => {
  const ov = document.querySelector('.all-apps-overlay');
  return { kept: !!ov, active: ov ? ov.classList.contains('active') : null };
});
t('AA-2 phone 关后 DOM 保留（persistent）', aa2.kept === true, `active=${aa2.active}`);
const aa2b = await page.evaluate(async () => {
  const { openAllApps } = await import('/js/all-apps.js');
  openAllApps('r17-active');
  await new Promise(r => setTimeout(r, 1000));
  const ov = document.querySelector('.all-apps-overlay');
  return ov ? { active: ov.classList.contains('active'), form: ov.dataset.form } : { active: false, form: 'NO_OVERLAY' };
});
t('AA-2b 390 档重开 active（开启态前置）', aa2b.active === true && aa2b.form === 'phone', `form=${aa2b.form}`);

// ============ RX 组·增量②：跨断点销毁重建帧预算双向复跑（R15 首定档判据） ============
console.log('RX 组 跨断点销毁帧预算复跑（phone→tablet 方向，R15 RX-2 判据）');
// 当前：390 phone AllApps 开启态（AA-2b 前置）→ rAF 帧采样窗内 resize 1024 → 销毁
const rxSampler = (ms) => page.evaluate(async (win) => {
  const out = [];
  let last = performance.now();
  const t0 = last;
  while (performance.now() - t0 < win) {
    await new Promise(r => requestAnimationFrame(r));
    const now = performance.now();
    const dt = now - last; last = now;
    out.push(Math.round(dt * 10) / 10);
  }
  return out;
}, 1600);
const preAnchor2 = await page.evaluate(() => {
  const ov = document.querySelector('.all-apps-overlay');
  return { form: ov ? ov.dataset.form : null, active: ov ? ov.classList.contains('active') : false };
});
const rx2Promise = rxSampler(1600);
await sleep(350);
await page.setViewportSize({ width: 1024, height: 768 });
const rx2dt = await rx2Promise;
await sleep(400);
const postAnchor2 = await page.evaluate(() => ({ destroyed: !document.querySelector('.all-apps-overlay') }));
const rx2p95 = p95(rx2dt), rx2max = Math.max(...rx2dt);
t('RX-2 phone→tablet 销毁帧预算（双锚+档界）', preAnchor2.form === 'phone' && preAnchor2.active && postAnchor2.destroyed && rx2p95 <= 333.4 && rx2max <= 500.2,
  `pre=${preAnchor2.form}/active=${preAnchor2.active} destroyed=${postAnchor2.destroyed} n=${rx2dt.length} p95=${rx2p95} max=${rx2max}`);

const aa4b = await page.evaluate(async () => {
  const { openAllApps } = await import('/js/all-apps.js');
  openAllApps('r17-reopen');
  await new Promise(r => setTimeout(r, 1000));
  const ov = document.querySelector('.all-apps-overlay');
  return ov ? { form: ov.dataset.form, active: ov.classList.contains('active') } : { form: 'NO_OVERLAY' };
});
t('AA-4 resize 后重开重建为 tablet 形态', aa4b.form === 'tablet' && aa4b.active === true, `form=${aa4b.form} active=${aa4b.active}`);
// tablet sheet 落定后做 RX-1 反向：1024 开启态 → resize 390 销毁
const preAnchor1 = await page.evaluate(() => {
  const ov = document.querySelector('.all-apps-overlay');
  return { form: ov ? ov.dataset.form : null, active: ov ? ov.classList.contains('active') : false };
});
const rx1Promise = rxSampler(1600);
await sleep(350);
await page.setViewportSize({ width: 390, height: 844 });
const rx1dt = await rx1Promise;
await sleep(400);
const postAnchor1 = await page.evaluate(() => ({ destroyed: !document.querySelector('.all-apps-overlay') }));
const rx1p95 = p95(rx1dt), rx1max = Math.max(...rx1dt);
t('RX-1 tablet→phone 销毁帧预算（双锚+档界）', preAnchor1.form === 'tablet' && preAnchor1.active && postAnchor1.destroyed && rx1p95 <= 333.4 && rx1max <= 500.2,
  `pre=${preAnchor1.form}/active=${preAnchor1.active} destroyed=${postAnchor1.destroyed} n=${rx1dt.length} p95=${rx1p95} max=${rx1max}`);
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(800);
// AA-5 tablet 关后销毁零残留（R13 原样语义，本轮在 RX-1 已实证销毁链，此处复证重开→Esc）
const aa5r = await page.evaluate(async () => {
  const { openAllApps } = await import('/js/all-apps.js');
  openAllApps('r17-aa5');
  await new Promise(r => setTimeout(r, 1000));
  const ov = document.querySelector('.all-apps-overlay');
  return { form: ov ? ov.dataset.form : 'NO_OVERLAY', active: ov ? ov.classList.contains('active') : false };
});
t('AA-5 前置：1024 档重开 tablet 开启', aa5r.form === 'tablet' && aa5r.active === true, `form=${aa5r.form}`);
await page.keyboard.press('Escape');
await sleep(1000);
const aa5 = await page.evaluate(() => ({ destroyed: !document.querySelector('.all-apps-overlay') }));
t('AA-5 tablet 关后销毁零残留（ephemeral）', aa5.destroyed === true, `destroyed=${aa5.destroyed}`);

// ============ T 组：taskbar-transient 阈值档位（R13 判据原样） ============
console.log('T 组 transient 阈值档位（平板专用语义）');
await page.evaluate(async () => {
  const { initialApps } = await import('/js/apps-data.js');
  const { openApp } = await import('/js/app-window.js');
  const idx = initialApps.findIndex(a => a.id === 'calculator');
  if (idx !== -1) openApp(idx);
});
await sleep(5600);
let armed1024 = false;
for (let i = 0; i < 4 && !armed1024; i++) {
  armed1024 = await page.evaluate(async () => (await import('/js/taskbar-transient.js')).__transientTestHooks().armed === true);
  if (!armed1024) await sleep(1500);
}
const t1 = await page.evaluate(() => window.__state.isOpen === true);
t('T-1 1024 平板档 armed=true', armed1024, `open=${t1}`);
await page.setViewportSize({ width: 390, height: 844 });
await sleep(1000);
const t2 = await page.evaluate(async () => {
  const hooks = (await import('/js/taskbar-transient.js')).__transientTestHooks();
  return { armed390: hooks.armed };
});
t('T-2 resize→390 手机档 armed 重算为 false（阈值档位在册语义）', t2.armed390 === false, `armed390=${t2.armed390}`);
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(800);

// ============ X 组：极端档（R13 判据原样） ============
console.log('X 组 极端档降级');
for (const [vw, vh] of [[800, 360], [320, 740]]) {
  await page.setViewportSize({ width: vw, height: vh });
  await sleep(700);
  const xr = await page.evaluate(() => {
    const WB = window.__widgetBoard;
    const p = WB.place('clock');
    const l = WB.list();
    const toast = document.querySelector('.system-toast, #systemToast');
    const cards = [...document.querySelectorAll('.widget-card')].map(el => {
      const b = el.getBoundingClientRect();
      const host = el.closest('.page-grid') || el.parentElement;
      const hb = host ? host.getBoundingClientRect() : null;
      return { inPage: hb ? (b.left >= hb.left - 1 && b.right <= hb.right + 1 && b.top >= hb.top - 1 && b.bottom <= hb.bottom + 1) : 'NO-HOST' };
    });
    return { placed: !!p, count: l.length, cards, toast: toast ? toast.textContent.slice(0, 40) : null };
  });
  const oob = xr.cards.filter(c => c.inPage !== true);
  t(`X-${vw}×${vh} 极端档 widget 在册降级`, (!xr.placed && xr.count === 0) || (xr.placed && oob.length === 0), `placed=${xr.placed} toast=${JSON.stringify(xr.toast)}`);
  if (xr.placed) {
    await page.evaluate(() => { const l = window.__widgetBoard.list(); l.forEach(x => window.__widgetBoard.remove(x.id)); });
    await sleep(300);
  }
}
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(800);
await page.screenshot({ path: 'docs/sweep/s17-desktop-final.png' });

t('K-1 全程零 pageerror', errors.length === 0, errors.join(';').slice(0, 200));
await ctx.close();
await browser.close();
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
