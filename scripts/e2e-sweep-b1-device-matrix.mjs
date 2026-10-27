// ==================== e2e-sweep-b1-device-matrix.mjs — #77 Standing Sweep 第二轮 B 类（设备适配）检查项①② ====================
// 检查项①（P 组）：七档尺寸冒烟矩阵 —— #77 §二.B 筛查动作原文：
//   360×640（小屏手机）/ 390×844（主流手机）/ 768×1024（平板竖）/ 1024×768（平板横）
//   / 1280×800（桌面）+ 极窄 320 与极宽 2560 边界
//   每档断言：零 pageerror / 图标网格渲染 / dock 在场且在视口内 / 状态栏在场
//             / 无横向溢出 / settings 窗口几何全在视口内 / 截图留痕
// 检查项②（R 组）：跨 768 断点旋转（不重载，考验运行时重算 —— resize debounce 100ms
//   + orientationchange 200ms 双路同函数 rebalanceViewportLayout，main.js:897/905）：
//   R1 手机横竖 390×844↔844×390 / R2 手机横→平板竖（跨入 768）
//   R3 平板竖↔横（false→true）/ R4 带已开窗口跨断点旋转（窗口是否跟随视口）
//   R5 极窄横屏 640×320（旋转后小短边）
// 零发现也留痕（#77 §五：明确写出检查了什么、均正常，避免下次重复查）。
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const ROOT = '/home/z/my-project/md3-repo';
const PORT = 8086;
const CHROME = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const SHOT = `${ROOT}/docs/sweep`;
mkdirSync(SHOT, { recursive: true });

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', ROOT, '--bind', '127.0.0.1'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));

let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra}`); }
  else { fail++; console.log(`  FAIL ${name}${extra}`); }
};

const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
let errors = [];
page.on('pageerror', e => errors.push(String(e)));

const URL = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;

// 通用几何采集器：桌面结构健康 + 溢出 + （可选）窗口几何
const COLLECT = () => {
  const de = document.documentElement;
  const iw = window.innerWidth, ih = window.innerHeight;
  const icons = document.querySelectorAll('.page-grid .icon-box').length;
  const dockIcons = document.querySelectorAll('.dock-app-icon').length;
  const dock = document.querySelector('.dock-bar');
  const dr = dock ? dock.getBoundingClientRect() : null;
  const sb = document.getElementById('statusBar');
  const sbr = sb ? sb.getBoundingClientRect() : null;
  const win = document.querySelector('.app-window');
  let winG = null;
  if (win) { const b = win.getBoundingClientRect(); winG = { l: b.left, t: b.top, r: b.right, b: b.bottom }; }
  return { iw, ih, icons, dockIcons,
    dockOK: !!dr && dr.height > 0 && dr.bottom <= ih + 1 && dr.right <= iw + 1 && dr.left >= -1,
    sbOK: !!sbr && sbr.height > 0 && sbr.bottom > 0 && sbr.right <= iw + 1,
    overflowX: de.scrollWidth - iw, overflowY: de.scrollHeight - ih, winG };
};

// 动画收敛等待（v8.45 C 类教训 B 类复现两次）：
//   ①全屏应用打开 = 图标起飞 Actor + spring 超调振荡，过渡期内任一时刻抓拍都可能命中
//     bounding>视口的中间帧（超调 ~1.4% 或 Actor 小窗）——探针实测收敛终态 transform:none、
//     rect 完美贴边（2560 下 1200ms 后 scale 残差仅 0.013%）
//   ②「窗口 bounding ≤ 视口」作等待条件不可用：Actor 小窗阶段恒满足 → 拍到展开前中间态
//   正解 = 固定等待 > spring 全收敛期（实测 1200ms 已收敛，1800ms 留裕度），超时后断言终态
const waitWinSettled = async () => {
  await page.waitForTimeout(1800);
  await page.waitForTimeout(250);
};

// ---------- P 组：七档尺寸冒烟（每档干净重载） ----------
console.log('== P 组：尺寸冒烟矩阵 ==');
const SIZES = [
  [320, 640, '320x640-极窄'],
  [360, 640, '360x640-小屏'],
  [390, 844, '390x844-主流'],
  [768, 1024, '768x1024-平板竖'],
  [1024, 768, '1024x768-平板横'],
  [1280, 800, '1280x800-桌面'],
  [2560, 1440, '2560x1440-极宽'],
];
for (const [w, h, tag] of SIZES) {
  const before = errors.length;
  await page.setViewportSize({ width: w, height: h });
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(600);
  const r = await page.evaluate(COLLECT);
  ok(errors.length === before, `${tag} 零 pageerror`, errors.length > before ? ' ' + errors.slice(before).join('|').slice(0, 140) : '');
  ok(r.icons > 0, `${tag} 桌面图标渲染`, ` n=${r.icons}`);
  ok(r.dockIcons > 0 && r.dockOK, `${tag} dock 在场且在视口内`, ` n=${r.dockIcons} dockOK=${r.dockOK}`);
  ok(r.sbOK, `${tag} 状态栏在场`);
  ok(r.overflowX <= 1, `${tag} 无横向溢出`, ` scrollW-iw=${r.overflowX}`);
  await page.evaluate(() => window.__shareSheet.openAppById('settings'));
  await waitWinSettled();
  const r2 = await page.evaluate(COLLECT);
  const g = r2.winG;
  ok(!!g && g.l >= -1 && g.t >= -1 && g.r <= r2.iw + 1 && g.b <= r2.ih + 1,
    `${tag} settings 窗口几何在视口内`,
    g ? ` L${g.l.toFixed(0)} T${g.t.toFixed(0)} R${g.r.toFixed(0)}/${r2.iw} B${g.b.toFixed(0)}/${r2.ih}` : ' no-window');
  await page.screenshot({ path: `${SHOT}/b1-${w}x${h}.png` });
}

// ---------- R 组：跨断点旋转（不重载，考验运行时重算） ----------
console.log('== R 组：旋转与跨断点 ==');
// 干净重置到手机竖屏
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(600);

const rotate = async (w, h) => {
  await page.setViewportSize({ width: w, height: h });
  // main.js:905 orientationchange → rebalanceViewportLayout（200ms 后）；resize debounce 100ms 双路同函数
  await page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
  await page.waitForTimeout(600);
};

// R1 手机竖→横
let before = errors.length;
await rotate(844, 390);
let r = await page.evaluate(COLLECT);
ok(errors.length === before, 'R1 旋转零 pageerror');
ok(r.icons > 0 && r.dockIcons > 0 && r.dockOK && r.sbOK, 'R1 手机横屏结构健康', ` icons=${r.icons} dock=${r.dockIcons}`);
ok(r.overflowX <= 1, 'R1 横屏无横向溢出', ` ${r.overflowX}`);
await page.screenshot({ path: `${SHOT}/b1-r1-landscape-phone.png` });

// R2 手机横→平板竖（跨入 768 断点，isTabletSize false 临界）
await rotate(768, 1024);
r = await page.evaluate(COLLECT);
ok(r.icons > 0 && r.dockIcons > 0 && r.dockOK && r.overflowX <= 1, 'R2 平板竖(768 临界)结构健康', ` icons=${r.icons} ox=${r.overflowX}`);

// R3 平板竖→横（true 侧）
await rotate(1024, 768);
r = await page.evaluate(COLLECT);
ok(r.icons > 0 && r.dockIcons > 0 && r.dockOK && r.sbOK && r.overflowX <= 1, 'R3 平板横屏结构健康', ` icons=${r.icons} ox=${r.overflowX}`);

// R4 带已开窗口跨断点旋转（窗口是否跟随视口 —— B 类核心关切：布局重算是否完整）
await page.evaluate(() => window.__shareSheet.openAppById('settings'));
await waitWinSettled();
await rotate(768, 1024);
await waitWinSettled();
r = await page.evaluate(COLLECT);
const g4 = r.winG;
ok(!!g4 && g4.l >= -1 && g4.t >= -1 && g4.r <= r.iw + 1 && g4.b <= r.ih + 1,
  'R4 已开窗口跨断点旋转仍在视口内',
  g4 ? ` L${g4.l.toFixed(0)} T${g4.t.toFixed(0)} R${g4.r.toFixed(0)}/${r.iw} B${g4.b.toFixed(0)}/${r.ih}` : ' no-window');
ok(r.dockOK && r.overflowX <= 1, 'R4 旋转后桌面结构健康', ` ox=${r.overflowX}`);
await page.screenshot({ path: `${SHOT}/b1-r4-window-rotate.png` });

// R5 极窄横屏 640×320（小短边）
await rotate(640, 320);
await waitWinSettled();
r = await page.evaluate(COLLECT);
const g5 = r.winG;
ok(!!g5 && g5.l >= -1 && g5.t >= -1 && g5.r <= r.iw + 1 && g5.b <= r.ih + 1,
  'R5 极窄横屏 640×320 窗口仍在视口内',
  g5 ? ` L${g5.l.toFixed(0)} T${g5.t.toFixed(0)} R${g5.r.toFixed(0)}/${r.iw} B${g5.b.toFixed(0)}/${r.ih}` : ' no-window');
ok(r.overflowX <= 1, 'R5 极窄横屏无横向溢出', ` ox=${r.overflowX}`);
await page.screenshot({ path: `${SHOT}/b1-r5-640x320.png` });

await browser.close();
srv.kill();
console.log(`\n== sweep-b1 结果：${pass} PASS / ${fail} FAIL ==`);
process.exit(fail ? 1 : 0);
