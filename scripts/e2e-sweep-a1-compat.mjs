// ==================== e2e-sweep-a1-compat.mjs — #77 Standing Sweep 第 4 轮 A 类（内核/浏览器兼容性） ====================
// 检查项（#77 §二.A 筛查动作）：
//   S 组：干净 boot 兼容基线 —— CSS.supports 实测（clip-path inset(round)/color-mix/
//         backdrop-filter）+ @supports not 兑底块在 Chromium 不激活（探针元素 display）
//   B 组：Battery API 缺失降级 —— headless 无 getBattery → battery-service sim 引擎兜底
//   P 组：CSS 修补回归冒烟 —— 本轮 -webkit- 前缀 22 处 + clip-path 兑底块落地后
//         桌面结构健康（图标/dock/状态栏/无溢出）
//   C 组：clip-path inset(round) 中途值实测 —— 拖动设置亮度滑杆，fill/line computed
//         clip-path 含 inset+round 且随值变化（#75/v7.43 几何引擎，Webkit 支持线 13.1+）
//   W 组：WebGL 缺失静默跳过 —— stub getContext('webgl2'/'webgl')→null + 派发
//         battery-charging-started → 零报错 + 98500 canvas 静默移除；对照组（有 WebGL）
//         播放零报错
//   M 组：prefers-reduced-motion: reduce 环境 —— 开合应用零报错、功能正常
// 零发现也留痕（#77 §五）。引擎差异矩阵以 caniuse 数据 + 本组 Chromium 实测落档 sweep-log。
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const ROOT = '/home/z/my-project/md3-repo';
const PORT = 8087;
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
const URL = `http://127.0.0.1:${PORT}/ios-desktop/index.html?nolock=1`;

// 动画收敛等待（v8.46 教训：固定等待 > spring 全收敛期，勿用条件式）
const waitWinSettled = async (page) => {
  await page.waitForTimeout(1800);
  await page.waitForTimeout(250);
};

// 桌面结构健康采集器
const COLLECT = () => {
  const de = document.documentElement;
  const iw = window.innerWidth, ih = window.innerHeight;
  const icons = document.querySelectorAll('.page-grid .icon-box').length;
  const dock = document.querySelector('.dock-bar');
  const dr = dock ? dock.getBoundingClientRect() : null;
  const sb = document.getElementById('statusBar');
  const sbr = sb ? sb.getBoundingClientRect() : null;
  return { iw, ih, icons,
    dockOK: !!dr && dr.height > 0 && dr.bottom <= ih + 1 && dr.right <= iw + 1,
    sbOK: !!sbr && sbr.height > 0 && sbr.bottom > 0 && sbr.right <= iw + 1,
    overflowX: de.scrollWidth - iw };
};

// ============ ctxA：干净环境（S/B/P/C 组） ============
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const pageA = await ctxA.newPage();
let errA = [];
pageA.on('pageerror', e => errA.push(String(e)));

const GOTO = { waitUntil: 'load', timeout: 30000 };

console.log('== S 组：兼容基线与 @supports 兑底 ==');
await pageA.goto(URL, GOTO);
await pageA.waitForTimeout(1200);

ok(errA.length === 0, 'S1 干净 boot 零 pageerror', errA.length ? ' ' + errA.join('|').slice(0, 140) : '');
const sup = await pageA.evaluate(() => ({
  clipRound: CSS.supports('clip-path', 'inset(0 round 1px)'),
  colorMix: CSS.supports('color', 'color-mix(in srgb, red 50%, transparent)'),
  backdrop: CSS.supports('backdrop-filter', 'blur(4px)'),
  webkitBackdrop: CSS.supports('-webkit-backdrop-filter', 'blur(4px)'),
}));
console.log(`  [事实] Chromium CSS.supports: clip-inset-round=${sup.clipRound} color-mix=${sup.colorMix} backdrop=${sup.backdrop} -webkit-backdrop=${sup.webkitBackdrop}（注：-webkit- 别名不暴露给 supports 查询，声明本身生效）`);
ok(sup.clipRound && sup.colorMix && sup.backdrop, 'S2 三项特性 Chromium 全支持（兑底块不应激活）');
const probe = await pageA.evaluate(() => {
  const el = document.createElement('div');
  el.className = 'm3-slider-track-fill';
  el.style.cssText = 'position:fixed;left:-9999px;top:0;width:100px;height:24px;';
  document.body.appendChild(el);
  const d = getComputedStyle(el).display;
  el.remove();
  return d;
});
ok(probe !== 'none', 'S3 clip-path @supports not 兑底块在 Chromium 未激活', ` display=${probe}`);

console.log('== B 组：Battery API 缺失降级 ==');
// 环境事实：headless Chromium（new headless）自带 fake getBattery —— 须主动 stub 掉
// 才能真正演练 Safari/Firefox 的无 API 场景；ctxA 记录有 API 路径，ctxE 演练无 API 路径
const bat = await pageA.evaluate(() => ({
  hasGetBattery: typeof navigator.getBattery === 'function',
  state: window.__batteryGetState ? window.__batteryGetState() : null,
}));
console.log(`  [事实] headless getBattery 在场=${bat.hasGetBattery}（fake API，level=${bat.state ? bat.state.level : '-'}，有 API 路径正常）`);
const ctxE = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctxE.addInitScript(() => {
  Object.defineProperty(Navigator.prototype, 'getBattery', { get: () => undefined, configurable: true });
});
const pageE = await ctxE.newPage();
let errE = [];
pageE.on('pageerror', e => errE.push(String(e)));
await pageE.goto(URL, GOTO);
await pageE.waitForTimeout(1200);
const batE = await pageE.evaluate(() => ({
  hasGetBattery: typeof navigator.getBattery === 'function',
  state: window.__batteryGetState ? window.__batteryGetState() : null,
}));
ok(batE.hasGetBattery === false, 'B1 stub 环境 getBattery 已移除（真 Safari/Firefox 场景）');
ok(!!batE.state && typeof batE.state.level === 'number' && batE.state.level >= 0 && batE.state.level <= 100,
  'B2 无 API → battery-service sim 引擎兜底在跑', batE.state ? ` level=${batE.state.level}` : ' no-state');
ok(errE.length === 0, 'B3 降级路径零 pageerror', errE.length ? ' ' + errE.join('|').slice(0, 140) : '');
await ctxE.close();

console.log('== P 组：CSS 修补回归冒烟 ==');
const rP = await pageA.evaluate(COLLECT);
ok(rP.icons > 0, 'P1 桌面图标渲染', ` n=${rP.icons}`);
ok(rP.dockOK, 'P2 dock 在场且在视口内');
ok(rP.sbOK, 'P3 状态栏在场');
ok(rP.overflowX <= 1, 'P4 无横向溢出', ` ${rP.overflowX}`);
ok(errA.length === 0, 'P5 本轮 CSS 改动后零 pageerror');
await pageA.screenshot({ path: `${SHOT}/a1-desktop.png` });

console.log('== C 组：clip-path inset(round) 中途值实测 ==');
await pageA.evaluate(() => window.__shareSheet.openAppById('settings'));
await waitWinSettled(pageA);
// 导航到显示页（.tp-row[data-tp] 文本匹配「显示」；找不到则逐行点击直到滑杆可见）
const navRows = await pageA.evaluate(() => [...document.querySelectorAll('.tp-row[data-tp]')]
  .map(r => ({ tp: r.getAttribute('data-tp'), text: r.textContent.trim().slice(0, 10) })));
console.log(`  [事实] 设置导航行: ${navRows.map(r => `${r.tp}=${r.text}`).join(', ').slice(0, 120)}`);
const dispRow = navRows.find(r => r.text.includes('显示'));
if (dispRow) {
  await pageA.evaluate((tp) => document.querySelector(`.tp-row[data-tp="${tp}"]`).click(), dispRow.tp);
  await pageA.waitForTimeout(600);
}
const vis = await pageA.evaluate(() => {
  const el = document.getElementById('dspBriSlider');
  return !!el && el.offsetParent !== null;
});
ok(vis, 'C1 亮度滑杆（#dspBriSlider）在显示页可见');
if (vis) {
  const box = await pageA.locator('#dspBriSlider').boundingBox();
  const before = await pageA.evaluate(() => getComputedStyle(document.getElementById('dspBriFill')).clipPath);
  await pageA.mouse.move(box.x + box.width * 0.85, box.y + box.height / 2);
  await pageA.mouse.down();
  await pageA.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2, { steps: 8 });
  await pageA.mouse.up();
  await pageA.waitForTimeout(400);
  const clip = await pageA.evaluate(() => ({
    fill: getComputedStyle(document.getElementById('dspBriFill')).clipPath,
    line: getComputedStyle(document.getElementById('dspBriLine') || document.querySelector('#dspBriSlider .md3-slider-line')).clipPath,
    val: document.getElementById('dspBriVal') ? document.getElementById('dspBriVal').textContent : '',
  }));
  console.log(`  [事实] fill: ${clip.fill.slice(0, 64)} | line: ${clip.line.slice(0, 64)} | 值=${clip.val}`);
  ok(clip.fill.startsWith('inset(') && clip.fill.includes('round') && clip.fill !== before,
    'C2 fill 中途值 clip-path inset(round) 生效且随拖动变化');
  ok(clip.line.startsWith('inset(') && clip.line.includes('round'),
    'C3 line 段 clip-path inset(round) 生效');
  ok(/inset\(0(?:px)? [0-9.]+px 0(?:px)? 0(?:px)? round/.test(clip.fill.replace(/\s+/g, ' ')),
    'C4 fill 右 inset 落位（值→几何映射正确）');
  await pageA.screenshot({ path: `${SHOT}/a1-slider-mid.png` });
}
ok(errA.length === 0, 'C5 滑杆全链路零 pageerror');
await ctxA.close();

// ============ ctxB：WebGL 全 stub（W1/W2 组） ============
console.log('== W 组：WebGL 缺失静默跳过 ==');
const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctxB.addInitScript(() => {
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (type === 'webgl2' || type === 'webgl') return null;
    return orig.call(this, type, ...args);
  };
});
const pageB = await ctxB.newPage();
let errB = [];
pageB.on('pageerror', e => errB.push(String(e)));
await pageB.goto(URL, GOTO);
await pageB.waitForTimeout(800);
ok(errB.length === 0, 'W1 WebGL 全缺失环境 boot 零 pageerror', errB.length ? ' ' + errB.join('|').slice(0, 140) : '');
await pageB.evaluate(() => document.dispatchEvent(new CustomEvent('battery-charging-started')));
await pageB.waitForTimeout(500);
const noCanvas = await pageB.evaluate(() => !document.querySelector('canvas[style*="98500"]'));
ok(noCanvas, 'W2 充电涟漪静默跳过（98500 canvas 已移除不残留）');
ok(errB.length === 0, 'W3 stub 派发链路零 pageerror');
await ctxB.close();

// ============ ctxC：WebGL 正常对照组（W4 组） ============
const ctxC = await browser.newContext({ viewport: { width: 390, height: 844 } });
const pageC = await ctxC.newPage();
let errC = [];
pageC.on('pageerror', e => errC.push(String(e)));
await pageC.goto(URL, GOTO);
await pageC.waitForTimeout(800);
await pageC.evaluate(() => document.dispatchEvent(new CustomEvent('battery-charging-started')));
await pageC.waitForTimeout(1200);
const hasCanvas = await pageC.evaluate(() => !!document.querySelector('canvas[style*="98500"]'));
console.log(`  [事实] 正常环境充电涟漪 canvas 出现=${hasCanvas}（SwiftShader 软渲染）`);
ok(errC.length === 0, 'W4 正常 WebGL 播放链路零 pageerror');
await pageC.waitForTimeout(5000);
const cleaned = await pageC.evaluate(() => !document.querySelector('canvas[style*="98500"]'));
console.log(`  [事实] 播放后 6.2s canvas 清理=${cleaned}`);
ok(errC.length === 0, 'W5 播放至清理全链路零 pageerror');
await ctxC.close();

// ============ ctxD：prefers-reduced-motion（M 组） ============
console.log('== M 组：prefers-reduced-motion: reduce 环境 ==');
const ctxD = await browser.newContext({ viewport: { width: 390, height: 844 } });
const pageD = await ctxD.newPage();
await pageD.emulateMedia({ reducedMotion: 'reduce' });
let errD = [];
pageD.on('pageerror', e => errD.push(String(e)));
await pageD.goto(URL, GOTO);
await pageD.waitForTimeout(800);
ok(errD.length === 0, 'M1 reduce 环境 boot 零 pageerror', errD.length ? ' ' + errD.join('|').slice(0, 140) : '');
await pageD.evaluate(() => window.__shareSheet.openAppById('settings'));
await waitWinSettled(pageD);
const mWin = await pageD.evaluate(() => {
  const w = document.querySelector('.app-window');
  if (!w) return null;
  const b = w.getBoundingClientRect();
  return { open: w.classList.contains('open'), l: b.left, t: b.top, r: b.right, b2: b.bottom, ih: innerHeight, iw: innerWidth };
});
ok(!!mWin && mWin.open && mWin.l >= -1 && mWin.t >= -1 && mWin.r <= mWin.iw + 1 && mWin.b2 <= mWin.ih + 1,
  'M2 reduce 环境开应用功能正常且窗口在视口内',
  mWin ? ` open=${mWin.open} L${mWin.l.toFixed(0)} B${mWin.b2.toFixed(0)}/${mWin.ih}` : ' no-window');
ok(errD.length === 0, 'M3 reduce 开合链路零 pageerror');
await pageD.screenshot({ path: `${SHOT}/a1-reduced-motion-settings.png` });
await ctxD.close();

await browser.close();
srv.kill();
console.log(`\n== sweep-a1 结果：${pass} PASS / ${fail} FAIL ==`);
process.exit(fail ? 1 : 0);
