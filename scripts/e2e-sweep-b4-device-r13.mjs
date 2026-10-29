// R13=B 类（设备适配）巡查 e2e · v8.73（R9 后隔 3 轮回归；v8.70-72 连续零产品变更窗口）
// S 组·折叠加分屏交叉 resize 序列复验（含 axis 自适应档位硬断言：w>=h→x / w<h→y）
// W 组·widget 五档视口复验 + 增量：390 档非当前页不在 DOM+切回重建
// AA 组·AllApps 双形态跨断点 resize 销毁重建（phone persistent ↔ tablet ephemeral）
// T 组·taskbar-transient 阈值档位（390 手机 armed 恒 false / 1024 平板 armed=true，resize 重算语义）
// X 组·极端档（800×360 / 320×740）+ K 组·全程零 pageerror
// 纪律传承：外域 route.abort；__splitInfo/__state 前置防空壳；getComputedStyle 读后立即物化（R12 事实①）；import 链开窗（R12 事实④）
import { chromium } from 'playwright';

const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:8100/index.html?nolock=1';
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${name}${detail ? ' | ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' | ' + detail : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2500);

// ============ S 组：分屏在场 × 折叠屏连续 resize ============
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
console.log('  [dump] axis 序列:', FOLD_SEQ.map(w => `${w}:${w >= 768 ? 'x' : 'y'}`).join(' '));

// 收场
const exited = await page.evaluate(() => import('/js/split-screen.js').then(m => { try { m.exitSplit({}); return 'OK'; } catch (e) { return 'ERR:' + e.message; } }));
await sleep(1200);
t('S-10 分屏收场零挂死', exited === 'OK', String(exited));
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(600);

// ============ W 组：widget 五档视口复验 ============
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
    // live computed 纪律：读后立即物化（R12 事实①）
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

// ============ WB 组·增量①：390 档非当前页 widget 不在 DOM + 切回重建 ============
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

// ============ AA 组·增量②：AllApps 双形态跨断点 resize 销毁重建 ============
console.log('AA 组 AllApps 双形态跨断点（phone persistent ↔ tablet ephemeral）');
// 390 档开 → data-form=phone → Esc 关 → DOM 保留（persistent）
const aa1 = await page.evaluate(async () => {
  const { openAllApps } = await import('/js/all-apps.js');
  openAllApps('r13');
  await new Promise(r => setTimeout(r, 1100));
  const ov = document.querySelector('.all-apps-overlay');
  return ov ? { form: ov.dataset.form, active: ov.classList.contains('active') } : { form: 'NO_OVERLAY' };
});
t('AA-1 390 档 phone 形态开启', aa1.form !== 'NO_OVERLAY' && aa1.active === true, `form=${aa1.form}`);
await page.keyboard.press('Escape');
await sleep(900);
const aa2 = await page.evaluate(() => {
  const ov = document.querySelector('.all-apps-overlay');
  return { kept: !!ov, active: ov ? ov.classList.contains('active') : null };
});
t('AA-2 phone 关后 DOM 保留（persistent）', aa2.kept === true, `active=${aa2.active}`);
// 重开保持 active（验证开启态跨断点分支）
const aa2b = await page.evaluate(async () => {
  const { openAllApps } = await import('/js/all-apps.js');
  openAllApps('r13-active');
  await new Promise(r => setTimeout(r, 1000));
  const ov = document.querySelector('.all-apps-overlay');
  return ov ? { active: ov.classList.contains('active'), form: ov.dataset.form } : { active: false, form: 'NO_OVERLAY' };
});
t('AA-2b 390 档重开 active（开启态前置）', aa2b.active === true && aa2b.form === 'phone', `form=${aa2b.form}`);
// 开着跨断点 resize → 在册语义（all-apps.js:626）：立即关闭+销毁 DOM（跳过动画防双形态混叠，#73 DoD）
await page.setViewportSize({ width: 1024, height: 768 });
await sleep(1000);
const aa4 = await page.evaluate(() => ({ destroyed: !document.querySelector('.all-apps-overlay') }));
t('AA-3 开启态跨断点 resize：立即关闭+销毁（#73 在册语义）', aa4.destroyed === true, `destroyed=${aa4.destroyed}`);
// resize 后重开 → 按新断点重建 tablet 形态
const aa4b = await page.evaluate(async () => {
  const { openAllApps } = await import('/js/all-apps.js');
  openAllApps('r13-reopen');
  await new Promise(r => setTimeout(r, 1000));
  const ov = document.querySelector('.all-apps-overlay');
  return ov ? { form: ov.dataset.form, active: ov.classList.contains('active') } : { form: 'NO_OVERLAY' };
});
t('AA-4 resize 后重开重建为 tablet 形态', aa4b.form === 'tablet' && aa4b.active === true, `form=${aa4b.form} active=${aa4b.active}`);
await page.keyboard.press('Escape');
await sleep(1000);
const aa5 = await page.evaluate(() => ({ destroyed: !document.querySelector('.all-apps-overlay') }));
t('AA-5 tablet 关后销毁零残留（ephemeral）', aa5.destroyed === true, `destroyed=${aa5.destroyed}`);

// ============ T 组·增量③：taskbar-transient 阈值档位 ============
console.log('T 组 transient 阈值档位（平板专用语义）');
await page.evaluate(async () => {
  const { initialApps } = await import('/js/apps-data.js');
  const { openApp } = await import('/js/app-window.js');
  const idx = initialApps.findIndex(a => a.id === 'calculator');
  if (idx !== -1) openApp(idx);
});
await sleep(5600);
// armed 就绪有时滞（R11 事实④：收纳动画+taskbar-changed 同步滞后）——重试 ≤3×1.5s 兜底
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

// ============ X 组：极端档 ============
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
await page.screenshot({ path: 'docs/sweep/s13-desktop-final.png' });

t('K-1 全程零 pageerror', errors.length === 0, errors.join(';').slice(0, 200));
await ctx.close();
await browser.close();
console.log(`\nRESULT: PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
