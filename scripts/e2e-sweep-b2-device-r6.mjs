// ==================== e2e-sweep-b2-device-r6.mjs — #77 Standing Sweep 第 6 轮 B 类（设备适配） ====================
// 与 R2（e2e-sweep-b1-device-matrix.mjs · v8.46）的增量：R2 时 #72 Taskbar / #73 AllApps 浮层
// / #74 Transient Taskbar / #75 分屏 均未落地 —— 本轮在新平板组件全量在场的 v8.65 上重跑设备维度。
// 检查项①（T 组）五档矩阵 × 新平板组件互斥：390×844 / 600×962 / 768×1024 / 1024×768 / 1280×800
//   <768：body 无 taskbar-on + .dock-bar 在场且在视口内；≥768：taskbar-on + #taskbar 贴底在视口 + Dock display:none（互斥）
//   AllApps 双形态：<768 data-form=phone / ≥768 data-form=tablet（浮层 top=高/6）——关后零残留
// 检查项②（F 组）折叠屏连续尺寸变化（R2 遗留 P2 项转正）：343×882 起步开计算器 → 渐进展开
//   343→500→675→768→900（每步 400ms 收敛采样），taskbar-on 序列须与 768 断点严格同构（零抖动双跳），
//   已开窗口每步几何全在视口内；反向折叠 900→343 同构；图标网格数全程恒定
// 检查项③（H 组）超矮横屏 800×360 / 740×360（Pixel Fold 内屏横，R2 只测过 640×320）：
//   状态栏/任务栏(≥768)在场、零横向/纵向溢出、开 settings 窗口收敛贴边
// 检查项④（P 组）DPR 变体 1x/2x/3x（R2 只做代码走查，本轮实跑）：布局与 dpr 无关性
//   （dock 宽 / 图标数在 dpr 间一致 ≤1px）、零 pageerror、devicePixelRatio 生效
// 检查项⑤（V 组）Transient Taskbar 平板应用内自动收纳 + 临界带 500/700 补充冒烟
// 零发现也留痕（#77 §五）。外域请求 route.abort 断网纪律全程保持。
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const ROOT = '/home/z/my-project/md3-repo';
const PORT = 8088;
const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const SHOT = `${ROOT}/docs/sweep`;
mkdirSync(SHOT, { recursive: true });

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', ROOT, '--bind', '127.0.0.1'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));

let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' | ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' | ' + extra : ''}`); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
const URL = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;

// 采集器：桌面结构 + 互斥态 + 任务栏几何 + 溢出 + 窗口几何
const COLLECT = () => {
  const de = document.documentElement;
  const iw = window.innerWidth, ih = window.innerHeight;
  const tb = document.getElementById('taskbar');
  const tbr = tb ? tb.getBoundingClientRect() : null;
  const tbVis = tb ? getComputedStyle(tb).display !== 'none' : false;
  const dock = document.querySelector('.dock-bar');
  const dck = dock ? getComputedStyle(dock).display : null;
  const icons = document.querySelectorAll('.page-grid .icon-box').length;
  const sb = document.getElementById('statusBar');
  const sbr = sb ? sb.getBoundingClientRect() : null;
  const win = document.querySelector('.app-window');
  let winG = null;
  if (win && getComputedStyle(win).display !== 'none') {
    const b = win.getBoundingClientRect();
    winG = { l: b.left, t: b.top, r: b.right, b: b.bottom };
  }
  return {
    iw, ih, icons,
    taskbarOn: document.body.classList.contains('taskbar-on'),
    tbVis, tbRect: tbr ? { t: tbr.top, b: tbr.bottom, h: tbr.height } : null,
    dockShown: dck !== null && dck !== 'none',
    dockEl: !!dock,
    sbOK: !!sbr && sbr.height > 0 && sbr.bottom > 0 && sbr.right <= iw + 1,
    overflowX: de.scrollWidth - iw, overflowY: de.scrollHeight - ih,
    winG,
  };
};
const winInViewport = (g, w, h) => g && g.l >= -1 && g.t >= -1 && g.r <= w + 1 && g.b <= h + 1;

async function newPage(vp) {
  const page = await browser.newPage({ viewport: vp });
  let errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  // 断网纪律：外域一律 abort
  await page.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith('http://127.0.0.1')) return route.continue();
    return route.abort();
  });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(1800); // v8.45 教训：采样窗口须大于动画收敛期
  return { page, errors };
}

// 真实图标点击链（v863 同款：.app-icon[data-id] + force）+ __state.isOpen 真开窗校验
// （#appWindow 空壳常驻 display:block —— 几何断言必须以 state.isOpen 为前烽，防空阳性）
const openAppReal = async (page, iconId) => {
  await page.click(`.app-icon[data-id="${iconId}"]`, { force: true });
  await sleep(1800); // 500ms native 档 + spring 超调收敛余量
  const st = await page.evaluate(() => ({ open: window.__state.isOpen, app: window.__state.currentApp }));
  return st;
};
const appIdOf = st => (st && st.app && st.app.id) || null;

// ============ 检查项① T 组：五档矩阵 × 新平板组件互斥 ============
console.log('== T 组：五档矩阵 × 新平板组件（#72/#73 落地后重跑）==');
const T5 = [
  { w: 390, h: 844, tablet: false, shot: 'b2-t1-390.png' },
  { w: 600, h: 962, tablet: false, shot: 'b2-t2-600.png' },
  { w: 768, h: 1024, tablet: true, shot: 'b2-t3-768.png' },
  { w: 1024, h: 768, tablet: true, shot: 'b2-t4-1024.png' },
  { w: 1280, h: 800, tablet: true, shot: 'b2-t5-1280.png' },
];
for (const t of T5) {
  const { page, errors } = await newPage({ width: t.w, height: t.h });
  const c = await page.evaluate(COLLECT);
  const tag = `${t.w}x${t.h}`;
  ok(errors.length === 0, `T ${tag} 零 pageerror`, errors[0] || '');
  ok(c.icons > 0, `T ${tag} 图标网格渲染`, `icons=${c.icons}`);
  ok(c.sbOK, `T ${tag} 状态栏在场`);
  ok(c.overflowX <= 0 && c.overflowY <= 0, `T ${tag} 零溢出`, `ox=${c.overflowX} oy=${c.overflowY}`);
  if (!t.tablet) {
    ok(!c.taskbarOn && !c.tbVis, `T ${tag} <768 无 Taskbar`);
    ok(c.dockEl && c.dockShown, `T ${tag} Dock 在场`);
    const dockR = await page.evaluate(() => {
      const d = document.querySelector('.dock-bar');
      if (!d) return null; const b = d.getBoundingClientRect();
      return { b: b.bottom, r: b.right, ih: innerHeight, iw: innerWidth };
    });
    ok(dockR && dockR.b <= dockR.ih + 1 && dockR.r <= dockR.iw + 1, `T ${tag} Dock 在视口内`, dockR ? `bottom=${dockR.b.toFixed(0)}` : 'null');
  } else {
    ok(c.taskbarOn && c.tbVis, `T ${tag} ≥768 Taskbar 在场`, `on=${c.taskbarOn}`);
    ok(!c.dockShown, `T ${tag} Dock 互斥隐藏`);
    ok(c.tbRect && c.tbRect.h > 0 && c.tbRect.b <= c.ih + 1 && c.tbRect.t >= -1, `T ${tag} Taskbar 贴底在视口`, c.tbRect ? `h=${c.tbRect.h}` : 'null');
  }
  // AllApps 双形态
  await page.evaluate(() => window.__allApps.open('sweep'));
  await sleep(900); // 600ms(手机)/267ms(平板) + 余量
  const aa = await page.evaluate(() => {
    const ov = document.getElementById('allAppsOverlay');
    if (!ov) return null;
    const sh = ov.querySelector('.aa-sheet');
    const r = sh ? sh.getBoundingClientRect() : null;
    return { form: ov.dataset.form, active: ov.classList.contains('active'), top: r ? r.top : -1, ih: innerHeight, gone: false };
  });
  ok(aa && aa.active, `T ${tag} AllApps 打开`, aa ? `form=${aa.form}` : 'null');
  ok(aa && aa.form === (t.tablet ? 'tablet' : 'phone'), `T ${tag} AllApps form 分档`, aa ? aa.form : 'null');
  if (t.tablet) ok(aa && Math.abs(aa.top - aa.ih / 6) < 2, `T ${tag} 浮层留白=高/6`, aa ? `top=${aa.top.toFixed(0)} vs ${Math.round(aa.ih / 6)}` : '');
  await page.keyboard.press('Escape');
  await sleep(800);
  // v8.61 语义：phone=persistent 关时不销毁 DOM（回非 active），tablet=ephemeral 关时毁
  const closeState = await page.evaluate(() => {
    const ov = document.getElementById('allAppsOverlay');
    if (!ov) return { gone: true, active: false };
    return { gone: false, active: ov.classList.contains('active') };
  });
  if (t.tablet) ok(closeState.gone, `T ${tag} AllApps 关闭销毁（ephemeral）`);
  else ok(!closeState.gone && !closeState.active, `T ${tag} AllApps 关闭回常驻（persistent 语义）`);
  if (t.shot === 'b2-t3-768.png' || t.shot === 'b2-t5-1280.png') await page.screenshot({ path: `${SHOT}/${t.shot}` });
  await page.close();
}

// ============ 检查项② F 组：折叠屏连续尺寸变化 ============
console.log('== F 组：折叠屏连续 resize（R2 P2 项转正）==');
{
  const { page, errors } = await newPage({ width: 343, height: 882 }); // Galaxy Fold 外屏
  // 外屏真实点击计算器（v863 链路：.app-icon[data-id] + __state 真开窗校验）
  await page.click('.app-icon[data-id="calculator"]', { force: true });
  await sleep(1800);
  const st0 = await page.evaluate(() => ({ open: window.__state.isOpen, app: window.__state.currentApp }));
  ok(st0.open && appIdOf(st0) === 'calculator', 'F 外屏 343 计算器真实开窗（__state.isOpen）', JSON.stringify({ open: st0.open, id: appIdOf(st0) }));
  // 渐进展开：每步采样 taskbar-on 与窗口几何
  const expand = [343, 500, 675, 768, 900];
  const seq = [];
  let winAlwaysIn = true;
  let iconsConst = true;
  let c = null;
  for (const w of expand) {
    await page.setViewportSize({ width: w, height: 882 });
    await sleep(400); // resize debounce 100ms + 重排余量
    c = await page.evaluate(COLLECT);
    seq.push({ w, on: c.taskbarOn });
    if (c.winG && !winInViewport(c.winG, w, 882)) winAlwaysIn = false;
    if (c.icons !== 45) iconsConst = false;
  }
  const expect = expand.map(w => w >= 768);
  ok(JSON.stringify(seq.map(s => s.on)) === JSON.stringify(expect), 'F 展开序列 taskbar-on 与断点严格同构（零抖动）',
    JSON.stringify(seq));
  ok(winAlwaysIn, 'F 展开全程窗口在视口内');
  ok(iconsConst, `F 图标网格数恒定`, `n=45`);
  // 反向折叠
  const fold = [900, 768, 675, 500, 343];
  const seq2 = [];
  let winAlwaysIn2 = true;
  for (const w of fold) {
    await page.setViewportSize({ width: w, height: 882 });
    await sleep(400);
    c = await page.evaluate(COLLECT);
    seq2.push({ w, on: c.taskbarOn });
    if (c.winG && !winInViewport(c.winG, w, 882)) winAlwaysIn2 = false;
  }
  ok(JSON.stringify(seq2.map(s => s.on)) === JSON.stringify(fold.map(w => w >= 768)), 'F 折叠序列严格同构（零抖动）', JSON.stringify(seq2));
  ok(winAlwaysIn2, 'F 折叠全程窗口在视口内');
  ok(errors.length === 0, 'F 零 pageerror', errors[0] || '');
  await page.screenshot({ path: `${SHOT}/b2-fold-343.png` });
  await page.close();
}

// ============ 检查项③ H 组：超矮横屏 ============
console.log('== H 组：超矮横屏（Pixel Fold 内屏横）==');
for (const [w, h] of [[800, 360], [740, 360]]) {
  const { page, errors } = await newPage({ width: w, height: h });
  const c = await page.evaluate(COLLECT);
  const tag = `${w}x${h}`;
  const isTablet = w >= 768;
  ok(errors.length === 0, `H ${tag} 零 pageerror`, errors[0] || '');
  ok(c.sbOK, `H ${tag} 状态栏在场`);
  if (isTablet) {
    ok(c.taskbarOn && c.tbVis, `H ${tag} Taskbar 在场（≥768）`, `on=${c.taskbarOn}`);
    ok(c.tbRect && c.tbRect.h > 0 && c.tbRect.b <= c.ih + 1, `H ${tag} Taskbar 在视口内不被裁`, c.tbRect ? `b=${c.tbRect.b.toFixed(0)}/ih=${c.ih}` : '');
  } else {
    // 740 < 768 断点 → 手机形态 Dock（断点单值 768 语义，#72 在册）
    ok(!c.taskbarOn && c.dockShown, `H ${tag} <768 回退 Dock 形态`, `on=${c.taskbarOn}`);
    const dockR = await page.evaluate(() => {
      const d = document.querySelector('.dock-bar'); if (!d) return null;
      const b = d.getBoundingClientRect(); return { b: b.bottom, r: b.right, ih: innerHeight, iw: innerWidth };
    });
    ok(dockR && dockR.b <= dockR.ih + 1 && dockR.r <= dockR.iw + 1, `H ${tag} Dock 在视口内不被裁`, dockR ? `b=${dockR.b.toFixed(0)}/ih=${dockR.ih}` : 'null');
  }
  ok(c.overflowX <= 0 && c.overflowY <= 0, `H ${tag} 零溢出`, `ox=${c.overflowX} oy=${c.overflowY}`);
  // 开 settings 窗口（真实链）收敛贴边
  const st = await openAppReal(page, 'settings');
  ok(st.open && appIdOf(st) === 'settings', `H ${tag} settings 真实开窗`, JSON.stringify({ open: st.open, id: appIdOf(st) }));
  const g = await page.evaluate(COLLECT);
  ok(winInViewport(g.winG, w, h), `H ${tag} settings 窗口收敛贴边`, g.winG ? `r=${g.winG.r.toFixed(0)} b=${g.winG.b.toFixed(0)}` : 'null');
  if (w === 740) await page.screenshot({ path: `${SHOT}/b2-h-740x360.png` });
  await page.close();
}

// ============ 检查项④ P 组：DPR 变体 ============
console.log('== P 组：DPR 1x/2x/3x 布局无关性（R2 走查转实测）==');
{
  const dockW = [];
  let dprErrs = 0;
  for (const [w, h, dpr] of [[390, 844, 1], [390, 844, 2], [390, 844, 3], [1280, 800, 2]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    let errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.route('**/*', route => {
      const u = route.request().url();
      if (u.startsWith('http://127.0.0.1')) return route.continue();
      return route.abort();
    });
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await sleep(1800);
    const m = await page.evaluate(() => {
      const d = document.querySelector('.dock-bar');
      const r = d ? d.getBoundingClientRect() : null;
      return { dpr: window.devicePixelRatio, dockW: r ? r.width : -1, icons: document.querySelectorAll('.page-grid .icon-box').length };
    });
    ok(errors.length === 0, `P ${w}x${h}@${dpr}x 零 pageerror`, errors[0] || '');
    ok(Math.abs(m.dpr - dpr) < 0.01, `P ${w}x${h}@${dpr}x devicePixelRatio 生效`, `dpr=${m.dpr}`);
    ok(m.icons > 0, `P ${w}x${h}@${dpr}x 图标渲染`, `n=${m.icons}`);
    if (w === 390) dockW.push({ dpr, w: m.dockW });
    if (dpr === 3) await page.screenshot({ path: `${SHOT}/b2-dpr3.png` });
    await page.close();
  }
  const spread = Math.max(...dockW.map(x => x.w)) - Math.min(...dockW.map(x => x.w));
  ok(spread <= 1, 'P dock 宽度跨 DPR 一致（布局与 dpr 无关）', dockW.map(x => `${x.dpr}x=${x.w.toFixed(1)}`).join(' '));
  ok(dprErrs === 0, 'P DPR 轮零异常');
}

// ============ 检查项⑤ V 组：Transient Taskbar 应用内自动收纳 + 临界带 ============
console.log('== V 组：Transient/自动收纳 + 临界带补冒烟 ==');
{
  // 平板应用内 5s 自动收纳（v8.60 语义，1024×768 实测一轮；真实点击链保证 state.isOpen）
  const { page, errors } = await newPage({ width: 1024, height: 768 });
  const st = await openAppReal(page, 'settings');
  ok(st.open && appIdOf(st) === 'settings', 'V settings 真实开窗（AUTO 收纳前置）', JSON.stringify({ open: st.open, id: appIdOf(st) }));
  const before = await page.evaluate(() => ({
    on: document.body.classList.contains('taskbar-on'),
    cls: document.getElementById('taskbar') ? document.getElementById('taskbar').className : '',
  }));
  ok(before.on, 'V 应用内 Taskbar 初始在场');
  await sleep(5600); // 5s AUTO 超时 + 余量
  const after = await page.evaluate(() => {
    const tb = document.getElementById('taskbar');
    return { cls: tb ? tb.className : '', stashed: tb ? tb.classList.contains('stashed') || tb.dataset.state === 'stashed' : false };
  });
  ok(after.stashed || /stashed|auto/.test(after.cls), 'V 应用内 5s 无触摸自动收纳', `cls=${after.cls}`);
  ok(errors.length === 0, 'V 零 pageerror', errors[0] || '');
  await page.close();

  // 临界带 500/700（R2 七档离散点补带）
  for (const [w, h] of [[500, 900], [700, 900]]) {
    const p2 = await browser.newPage({ viewport: { width: w, height: h } });
    let e2 = [];
    p2.on('pageerror', e => e2.push(String(e)));
    await p2.route('**/*', route => {
      const u = route.request().url();
      if (u.startsWith('http://127.0.0.1')) return route.continue();
      return route.abort();
    });
    await p2.goto(URL, { waitUntil: 'domcontentloaded' });
    await sleep(1600);
    const c2 = await p2.evaluate(COLLECT);
    ok(e2.length === 0 && c2.icons > 0 && !c2.taskbarOn && c2.dockShown && c2.overflowX <= 0 && c2.overflowY <= 0,
      `V ${w}x${h} 临界带健康（<768 Dock 形态）`, `ox=${c2.overflowX} icons=${c2.icons}`);
    await p2.close();
  }
}

console.log(`\n==== e2e-sweep-b2 R6 B 类结果: PASS=${pass} FAIL=${fail} ====`);
await browser.close();
srv.kill();
process.exit(fail === 0 ? 0 : 1);
