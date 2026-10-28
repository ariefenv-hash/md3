// ==================== e2e-v864-split-popup.mjs — #75 二期无头回归（分屏分档 + 弹出菜单 U+） ====================
//
// DoD（#75 §五 二期子集，无头可取证子集）：
//   M1 菜单 U+ 开场：同步初态 opacity=0 → 真实时间推进 → 终态 >0.95（JS 逐帧编排接管 CSS）
//   M2 菜单折叠：>6 条 → 6 可见 + 「更多快捷方式（N）」行 + 展开全显
//   M3 菜单打断连续性：开→关 |Δ|<0.25（接管非重置）+ 淡出期不可交互；关场中途重开同样连续（#39 场景）
//   T1 分屏进入（平板 998 档）：overlay 在册 + 桌面淡出 200ms 内联 + __nativeSplit 型编排
//   T2 staged 错峰：窗格 B 装载前 transform 冻结（armAt=0.25×T），窗格 A 先行
//   T3 落位：phase-open 于 2000ms 内（0.55×998≈549ms 引擎窗口 + 余量）
//   T4 收场：exitSplit → overlay 摘除（250ms closeRunner + 260ms grace）
//   T5 中止档：opening 期 exitSplit → ABORT_DURATION=500ms 收拢后摘除（无挂死）
//   P1 手机档 915：同链路可用，phase-open 于 2000ms 内
//   K  零 pageerror 全程
//
// 教训沿袭：v863（evaluate 显式传参/前台实跑）、v861（serve spawn+kill 同命令）、
//           v860（弹簧收敛轮询等待）、v859（真实事件链派发）。

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v864');
mkdirSync(OUT, { recursive: true });
const PORT = 8087;
const BASE = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const poll = async (pg, fn, ms = 7000, step = 100) => {
  const t0 = Date.now();
  for (;;) {
    try { if (await fn()) return true; } catch (e) {}
    if (Date.now() - t0 > ms) return false;
    await sleep(step);
  }
};

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

// 起服 + 跑 + kill 同命令（v857 纪律：防后台进程被会话回收）
const server = spawn('node', [join(root, 'scripts', 'serve.mjs'), '--port', String(PORT), '--no-open'], {
  stdio: 'ignore',
});
await sleep(1500);

const browser = await chromium.launch({ headless: true, executablePath: EXE });

// ==================== 平板视口 1280×800 ====================
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(1800);

// ---------- M. 弹出菜单 U+ 时序 ----------
{
  // 注册 >6 条扩展快捷方式（window.__APP_SHORTCUTS_EXTRA 扩展点，读取于渲染时）
  await page.evaluate(() => {
    window.__APP_SHORTCUTS_EXTRA = {
      calculator: Array.from({ length: 8 }, (_, i) => ({
        title: '扩展项' + (i + 1), icon: '<i></i>', action: () => {},
      })),
    };
  });
  const m1 = await page.evaluate(() => import('/ios-desktop/js/context-menu.js').then((m) => {
    const app = { id: 'calculator', name: '计算器' };
    m.showContextMenu(app, document.createElement('div'), 640, 500);
    const el = document.getElementById('appContextMenu');
    // 同步读：showContextMenu 同步置初态后、首个 rAF 前（防闪现语义）
    return { active: el.classList.contains('active'), op0: el.style.opacity, items: el.querySelectorAll('.shortcut-item').length };
  }));
  A('M1a 菜单同步初态 opacity=0 + 在场', m1.active && m1.op0 === '0', `op0=${m1.op0}`);
  A('M2a 折叠：9 条（内置1+扩展8）→ 6 可见', m1.items === 6, `items=${m1.items}`);
  const fold = await page.evaluate(() => {
    const el = document.getElementById('appContextMenu');
    const row = el.querySelector('.shortcut-fold-row');
    return { has: !!row, text: row ? row.textContent.trim() : '' };
  });
  A('M2b 折叠行「更多快捷方式（3）」', fold.has && fold.text.includes('更多快捷方式（3）'), fold.text);
  await sleep(40);
  const m2 = await page.evaluate(() => parseFloat(document.getElementById('appContextMenu').style.opacity));
  A('M1b 开场中段推进中（0.05<op<0.95）', m2 > 0.05 && m2 < 0.95, `op=${m2.toFixed(3)}`);
  // 打断：开到中段立即反向
  await page.evaluate(() => import('/ios-desktop/js/context-menu.js').then((m) => m.closeContextMenu()));
  const o1 = await page.evaluate(() => parseFloat(document.getElementById('appContextMenu').style.opacity));
  const pe = await page.evaluate(() => document.getElementById('appContextMenu').style.pointerEvents);
  A('M3a 打断接管非重置（|Δ|<0.25）+ 不可交互', Math.abs(o1 - m2) < 0.25 && pe === 'none', `o1=${o1.toFixed(3)} pe=${pe}`);
  // 关场中途重开（#39 场景）：首帧 tick 后 opacity 从引擎当前值继续，不重置不归零
  await sleep(50);
  const oMid = await page.evaluate(() => parseFloat(document.getElementById('appContextMenu').style.opacity));
  await page.evaluate(() => import('/ios-desktop/js/context-menu.js').then((m) => {
    m.showContextMenu({ id: 'calculator', name: '计算器' }, document.createElement('div'), 640, 500);
  }));
  await sleep(30); // 首帧 tick 已接管（同步置 '0' 仅防首帧闪现）
  const oRe = await page.evaluate(() => parseFloat(document.getElementById('appContextMenu').style.opacity));
  A('M3b 关场重开连续（|Δ|<0.35 不归零）', Math.abs(oRe - oMid) < 0.35, `oMid=${oMid.toFixed(3)} oRe=${oRe.toFixed(3)}`);
  await sleep(500);
  const mEnd = await page.evaluate(() => parseFloat(document.getElementById('appContextMenu').style.opacity));
  A('M1c 重开后终态全亮（>0.95）', mEnd > 0.95, `op=${mEnd.toFixed(3)}`);
  // 折叠行展开 + 收场
  await page.evaluate(() => {
    const row = document.querySelector('#appContextMenu .shortcut-fold-row');
    if (row) row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  const mExp = await page.evaluate(() => document.querySelectorAll('#appContextMenu .shortcut-item').length);
  A('M2c 展开后 9 条全显', mExp === 9, `items=${mExp}`);
  await page.evaluate(() => import('/ios-desktop/js/context-menu.js').then((m) => m.closeContextMenu()));
  await sleep(650);
  const mClosed = await page.evaluate(() => {
    const el = document.getElementById('appContextMenu');
    return { active: el.classList.contains('active'), op: el.style.opacity, pe: el.style.pointerEvents };
  });
  A('M3c 收场摘除 + 样式清空', !mClosed.active && mClosed.op === '' && mClosed.pe === '');
}

// ---------- T. 分屏分档（平板 998 档 · staged 错峰） ----------
{
  await page.evaluate(() => import('/ios-desktop/js/split-screen.js').then((m) => {
    m.enterSplit({
      appAId: 'calculator', appBId: 'notes',
      rectA: { left: 300, top: 200, width: 220, height: 160 },
      rectB: { left: 700, top: 200, width: 220, height: 160 },
      ratio: 0.5,
    });
  }));
  await sleep(40);
  const t1 = await page.evaluate(() => {
    const ov = document.getElementById('splitScreenOverlay');
    if (!ov) return null;
    const bd = ov.querySelector('.split-backdrop');
    return { overlay: !!ov, bdDur: bd ? bd.style.transitionDuration : '', panes: ov.querySelectorAll('.split-pane').length };
  });
  A('T1 平板分屏进入：overlay + 双窗格 + 桌面淡出 200ms 内联',
    !!t1 && t1.overlay && t1.panes === 2 && t1.bdDur === '200ms', `bdDur=${t1 && t1.bdDur}`);

  // staged 错峰采样：窗格 B 于 armAt=0.25×998≈250ms 前冻结
  const pb0 = await page.evaluate(() => {
    const p = document.querySelectorAll('#splitScreenOverlay .split-pane')[1];
    return p ? p.style.transform : '';
  });
  await sleep(120); // ~160ms：< armAt
  const pb1 = await page.evaluate(() => {
    const p = document.querySelectorAll('#splitScreenOverlay .split-pane')[1];
    return p ? p.style.transform : '';
  });
  await sleep(320); // ~480ms：> armAt（250ms）+ 已推进
  const pb2 = await page.evaluate(() => {
    const p = document.querySelectorAll('#splitScreenOverlay .split-pane')[1];
    return p ? p.style.transform : '';
  });
  A('T2a 窗格 B 装载前冻结（armAt 前两采样相等）', pb0 !== '' && pb0 === pb1);
  A('T2b 窗格 B 装载后推进（transform 变化）', pb2 !== '' && pb2 !== pb1);
  const paMove = await page.evaluate(() => {
    const p = document.querySelectorAll('#splitScreenOverlay .split-pane')[0];
    return p ? p.style.transform : '';
  });
  A('T2c 窗格 A 先行推进（transform 在场）', paMove !== '' && paMove !== pb1);

  // 落位：phase-open（0.55×998≈549ms 引擎窗 + 余量）
  const settledT = await poll(page, () => page.evaluate(() =>
    document.getElementById('splitScreenOverlay')?.classList.contains('phase-open')), 2500, 100);
  A('T3 平板落位 phase-open（998 档窗口内）', settledT === true);

  // 收场：exitSplit → overlay 摘除
  await page.evaluate(() => import('/ios-desktop/js/split-screen.js').then((m) => m.exitSplit()));
  const goneT = await poll(page, () => page.evaluate(() =>
    !document.getElementById('splitScreenOverlay')), 2000, 80);
  A('T4 收场摘除（250ms closeRunner + grace）', goneT === true);
  await sleep(400);
}

// ---------- T5. 中止档（opening 期退出 → ABORT 500ms 收拢） ----------
{
  await page.evaluate(() => import('/ios-desktop/js/split-screen.js').then((m) => {
    m.enterSplit({
      appAId: 'calculator', appBId: 'notes',
      rectA: { left: 300, top: 200, width: 220, height: 160 },
      rectB: { left: 700, top: 200, width: 220, height: 160 },
      ratio: 0.5,
    });
  }));
  await sleep(80); // opening 中段
  await page.evaluate(() => import('/ios-desktop/js/split-screen.js').then((m) => m.exitSplit()));
  const t = Date.now();
  const gone = await poll(page, () => page.evaluate(() =>
    !document.getElementById('splitScreenOverlay')), 2500, 80);
  const dt = Date.now() - t;
  A('T5 中止档收拢摘除（500ms abort + grace，无挂死）', gone === true && dt < 2400, `dt=${dt}ms`);
  await sleep(400);
}

// ==================== 手机视口 412×915 ====================
const ppage = await browser.newPage({ viewport: { width: 412, height: 915 }, colorScheme: 'dark' });
const perrors = [];
ppage.on('pageerror', (e) => perrors.push(String(e)));
await ppage.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
await ppage.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(1800);

{
  await ppage.evaluate(() => import('/ios-desktop/js/split-screen.js').then((m) => {
    m.enterSplit({
      appAId: 'calculator', appBId: 'notes',
      rectA: { left: 60, top: 300, width: 140, height: 110 },
      rectB: { left: 220, top: 300, width: 140, height: 110 },
      ratio: 0.5,
    });
  }));
  await sleep(60);
  const p1 = await ppage.evaluate(() => {
    const ov = document.getElementById('splitScreenOverlay');
    const bd = ov && ov.querySelector('.split-backdrop');
    return { overlay: !!ov, bdDur: bd ? bd.style.transitionDuration : '' };
  });
  A('P1a 手机分屏进入 + 桌面淡出 200ms', !!p1 && p1.overlay && p1.bdDur === '200ms', `bdDur=${p1 && p1.bdDur}`);
  const settledP = await poll(ppage, () => ppage.evaluate(() =>
    document.getElementById('splitScreenOverlay')?.classList.contains('phase-open')), 2500, 100);
  A('P1b 手机落位 phase-open（915 档窗口内）', settledP === true);
  await ppage.evaluate(() => import('/ios-desktop/js/split-screen.js').then((m) => m.exitSplit()));
  await sleep(900);
}

// ---------- K. 零 pageerror ----------
A('K1 全程零 pageerror（双视口）', errors.length === 0 && perrors.length === 0,
  [...errors, ...perrors].slice(0, 3).join(' | '));

console.log(`\n===== e2e-v864 结果: ${pass} PASS / ${fail} FAIL =====`);
await browser.close();
server.kill();
process.exit(fail === 0 ? 0 : 1);
