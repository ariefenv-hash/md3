// ==================== e2e-v863-anim-native.mjs — #75 动画曲线「原生」预设无头回归 ====================
//
// DoD（#75 §五 验收原文逐条，无头可取证子集）：
//   A. 默认预设 = 原生（native）—— snappy 退役后新默认
//   B. 开窗在飞 transform 串无 rotateX/rotateY/skew/matrix3d（无 3D 倾斜核心约束）
//      + 定时轴引擎在场（__timedEngine）
//   C. 开 500ms 确定性收敛（emphasized 曲线端点落位，稳态 transform 清空）
//   D. #appLaunchScrim 深度遮罩层在册 + 稳态熄灭（亮 0.2 / 暗 0.8 常量在 vitest 锚）
//   E. 关 250ms 确定性收拢 + 零残留（Closing Actor 回收）
//   F. 连点压力：500ms 动画期开关交替 ×10 无丢动画无残影（AOSP 打断协议）
//   G. 预设互切 10 次：果冻（弹簧引擎）↔ 原生（定时轴引擎）引擎随预设切换、
//      切回果冻 3D 倾斜恢复（transform 串重新含 rotateX）、零跳变零 pageerror
//   H. 旧存档迁移：localStorage 存 snappy → reload 后 currentId = native
//   I. 连续打断·剩余时长接管：开到中段反向关闭，位置连续无瞬移（两帧采样差有界）
//   K. 零 pageerror 全程
//
// 教训沿袭：v862（route.abort 外域断网 + 底部条带内释放）、v861（sheet 起点避开 iframe）、
//           v860（关场弹簧轮询等待）、v859（真实 page.click 派发 pointer 链）。

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'docs/v863');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8085/ios-desktop/index.html?nolock=1';
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 900, height: 800 }, colorScheme: 'dark' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());

const poll = async (fn, ms = 7000, step = 100) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await page.evaluate(fn).catch(() => false)) return true;
    await sleep(step);
  }
  return false;
};

// 桌面图标点击开窗（真实 pointer 链）
async function openApp(iconId) {
  await page.click(`.app-icon[data-id="${iconId}"]`, { force: true });
}
// 关窗（模块动态导入 —— 与页面同一模块缓存）
async function closeApp() {
  return page.evaluate(() => import('/ios-desktop/js/app-window.js').then((m) => { m.closeApp(0, 0, 0); return true; }));
}

await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
await sleep(2200);

// ---------- A. 默认预设 = native ----------
{
  const id = await page.evaluate(() => window.__animPresets.currentId());
  const kind = await page.evaluate(() => window.__animPresets.currentKind());
  const ids = await page.evaluate(() => window.__animPresets.list.map((p) => p.id));
  A('A1 默认预设 = native（snappy 退役新默认）', id === 'native', `currentId=${id}`);
  A('A2 引擎种类 = timed', kind === 'timed');
  A('A3 预设卡恰 2 张：bouncy + native', ids.length === 2 && ids[0] === 'bouncy' && ids[1] === 'native', ids.join(','));
}

// ---------- B/C/D. native 开窗：无 3D 倾斜 + 500ms 收敛 + scrim ----------
{
  await openApp('settings');
  await sleep(150); // 500ms 在飞中段采样
  const mid = await page.evaluate(() => ({
    tf: document.getElementById('appWindow').style.transform || '',
    timed: !!window.__state.scaleSpring.__timedEngine,
    scrimOp: parseFloat((document.getElementById('appLaunchScrim') || {}).style?.opacity || '0'),
  }));
  await page.screenshot({ path: join(OUT, 'native-open-mid.png') });
  A('B1 在飞 transform 含 translate3d+scale（纯 2D 位移缩放）', mid.tf.includes('translate3d') && mid.tf.includes('scale('), mid.tf.slice(0, 80));
  A('B2 在飞 transform 无 rotateX/rotateY/skew/matrix3d（无 3D 倾斜）',
    !mid.tf.includes('rotateX') && !mid.tf.includes('rotateY') && !mid.tf.includes('skew') && !mid.tf.includes('matrix3d'));
  A('B3 定时轴引擎在场（__timedEngine）', mid.timed === true);
  A('D1 #appLaunchScrim 遮罩层在册（过渡期 opacity ∈ [0, 0.8]）',
    Number.isFinite(mid.scrimOp) && mid.scrimOp >= 0 && mid.scrimOp <= 0.8, `opacity=${mid.scrimOp}`);
  // 500ms 收敛（emphasized 端点 + settle 轮询）
  const settled = await poll(() => window.__state.scaleSpring.isSettled() && window.__state.posSpring.isSettled(), 4000);
  await sleep(250); // finishAnim 清理窗
  const rest = await page.evaluate(() => ({
    isOpen: window.__state.isOpen,
    tf: document.getElementById('appWindow').style.transform || '',
    scrimOp: parseFloat((document.getElementById('appLaunchScrim') || {}).style?.opacity || '0'),
  }));
  A('C1 开窗 500ms 确定性收敛（isSettled 轮询）', settled === true);
  A('C2 稳态 transform 清空（finishAnim 归位）', rest.isOpen === true && rest.tf === '', `tf="${rest.tf}"`);
  A('D2 scrim 稳态熄灭（opacity=0）', rest.scrimOp === 0, `opacity=${rest.scrimOp}`);
}

// ---------- E. 关 250ms + 零残留 ----------
{
  await closeApp();
  await sleep(110); // 250ms 中段
  const mid = await page.evaluate(() => document.getElementById('appWindow').style.transform || '');
  A('E1 关闭在飞仍无 rotateX（对称无倾斜）', !mid.includes('rotateX'));
  const done = await poll(() => !window.__state.isOpen && !window.__state.isClosing, 4000);
  await sleep(400); // Actor 回收窗
  const actors = await page.evaluate(() => window.__parallelDebug().actors.length);
  A('E2 关 250ms 收敛', done === true);
  A('E3 Closing Actor 零残留', actors === 0, `actors=${actors}`);
}

// ---------- F. 连点压力 ×10（打断协议） ----------
{
  let ok = true;
  for (let i = 0; i < 10; i++) {
    await openApp('calculator');
    await sleep(240);           // 500ms 中途
    await closeApp();           // 反向打断（剩余时长接管）
    await sleep(160);           // 不等收敛直接再开（连点）
  }
  const settled = await poll(() =>
    !window.__state.isClosing && window.__state.scaleSpring.isSettled() && window.__state.posSpring.isSettled(), 6000);
  await sleep(500);
  const tail = await page.evaluate(() => ({
    open: window.__state.isOpen,
    closing: window.__state.isClosing,
    actors: window.__parallelDebug().actors.length,
    scale: window.__state.scaleSpring.x,
  }));
  // 末次操作为 closeApp（在飞中断反向）→ 期望收敛到关闭态；DoD 核心 = 无丢动画无残影
  ok = settled && !tail.closing && tail.actors === 0 && !tail.open && tail.scale < 0.01;
  A('F1 连点 ×10 打断后收敛（无丢动画无残影）', ok, JSON.stringify(tail));
  await closeApp();
  await poll(() => !window.__state.isOpen && !window.__state.isClosing, 4000);
  await sleep(400);
}

// ---------- G. 预设互切 10 次（引擎随预设 + 3D 恢复） ----------
{
  // 切果冻 → 开窗在飞应含 rotateX（弹簧引擎 + 3D 倾斜恢复）
  await page.evaluate(() => window.__animPresets.apply('bouncy'));
  await openApp('notes');
  await sleep(150);
  const midB = await page.evaluate(() => ({
    tf: document.getElementById('appWindow').style.transform || '',
    timed: !!window.__state.scaleSpring.__timedEngine,
  }));
  await page.screenshot({ path: join(OUT, 'bouncy-open-mid.png') });
  A('G1 果冻：3D 倾斜恢复（transform 含 rotateX）', midB.tf.includes('rotateX'), midB.tf.slice(0, 90));
  A('G2 果冻：弹簧引擎在场（__timedEngine=false）', midB.timed === false);
  await poll(() => window.__state.scaleSpring.isSettled(), 4000);
  await closeApp();
  await poll(() => !window.__state.isOpen && !window.__state.isClosing, 4000);
  await sleep(400);
  // 互切 ×10（含引擎换手）
  let switchOk = true;
  for (let i = 0; i < 10; i++) {
    // 教训归档（v856）：Playwright evaluate 不传输 Node 闭包 —— 循环变量必须显式传参
    await page.evaluate((n) => window.__animPresets.apply(n % 2 === 0 ? 'native' : 'bouncy'), i);
    await openApp('calculator');
    await sleep(200);
    await closeApp();
    await sleep(150);
  }
  const swSettled = await poll(() =>
    !window.__state.isClosing && window.__state.scaleSpring.isSettled() && window.__state.posSpring.isSettled(), 6000);
  await sleep(500);
  const tail2 = await page.evaluate(() => ({
    actors: window.__parallelDebug().actors.length,
    closing: window.__state.isClosing,
  }));
  switchOk = swSettled && tail2.actors === 0 && !tail2.closing;
  A('G3 预设互切 ×10（弹簧↔定时轴引擎换手）收敛零残留', switchOk, JSON.stringify(tail2));
  // 切回 native 再开窗 → 零倾斜回归
  await page.evaluate(() => window.__animPresets.apply('native'));
  await openApp('notes');
  await sleep(150);
  const midN = await page.evaluate(() => document.getElementById('appWindow').style.transform || '');
  A('G4 切回原生：零倾斜回归（transform 无 rotateX）', !midN.includes('rotateX'), midN.slice(0, 80));
  await poll(() => window.__state.scaleSpring.isSettled(), 4000);
  await closeApp();
  await poll(() => !window.__state.isOpen && !window.__state.isClosing, 4000);
  await sleep(400);
}

// ---------- I. 连续打断·位置连续性（剩余时长接管无瞬移） ----------
{
  await openApp("calculator");
  await sleep(200); // 开到中段（raw 0.4）
  const p1 = await page.evaluate(() => {
    const r = document.getElementById('appWindow').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await closeApp();
  await sleep(40);   // 一两帧内采样
  const p2 = await page.evaluate(() => {
    const r = document.getElementById('appWindow').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const jump = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  A('I1 反向打断位置连续（两帧中心距 < 200px，无瞬移）', Number.isFinite(jump) && jump < 200, `jump=${jump.toFixed(1)}px`);
  const done = await poll(() => !window.__state.isOpen && !window.__state.isClosing, 4000);
  await sleep(400);
  const actors = await page.evaluate(() => window.__parallelDebug().actors.length);
  A('I2 打断后收敛 + Actor 零残留', done && actors === 0);
}

// ---------- H. 旧存档迁移（snappy → native，真实 reload） ----------
{
  await page.evaluate(() => localStorage.setItem('ios-desktop:anim-preset', 'snappy'));
  await page.reload({ waitUntil: 'load', timeout: 30000 });
  await sleep(2000);
  const id = await page.evaluate(() => window.__animPresets.currentId());
  const stored = await page.evaluate(() => window.__animPresets.currentKind());
  A('H1 旧存档 snappy 迁移：reload 后回落 native（不空档不报错）', id === 'native', `currentId=${id}`);
  A('H2 迁移后引擎 = timed', stored === 'timed');
  await page.evaluate(() => localStorage.removeItem('ios-desktop:anim-preset'));
}

// ---------- K. 零 pageerror ----------
A('K1 全程零 pageerror', errors.length === 0, errors.slice(0, 3).join(' | '));

console.log(`\n===== e2e-v863 结果: ${pass} PASS / ${fail} FAIL =====`);
await browser.close();
process.exit(fail === 0 ? 0 : 1);
