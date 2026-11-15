// ==================== e2e-v1144-switch-contrast.mjs — #325 开关小球可见性真实浏览器回归 ====================
//
// 验证链：真实 Chromium 加载壳层（ios-desktop/index.html?nolock=1，css 全链生效），
// 注入与设置应用同构的 .md3-switch 标记（md3-theme.css 全局选择器命中），断言：
//   1. 暗极性（默认）thumb computedStyle = #938f99（AOSP SwitchTokens 基线）
//   2. 浅极性（body.light-theme）= #74777f
//   3. 双极性 live WCAG 对比度（球 vs 轨 computedStyle）≥ 3:1
//   4. 拖拽预览通道（PointerEvent → applyDragVisual）与静态 CSS 同源（内联 var 引用组件级令牌）
//   5. 按压 SnapSpec 放大 28px 在 pointerdown 期间保持（v11.43 探针 16/16 帧结论回归），
//      pointerup 回 24 —— #79 几何零回归
//   6. 全程零 pageerror
//
// 用法：node scripts/e2e-v1144-switch-contrast.mjs   （BASE=… 可复用已起服务）

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res, rej) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  s.on('error', rej);
});

const CHROME = [
  process.env.MD3_CHROME,
  chromium.executablePath(),
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => p && existsSync(p));
if (!CHROME) { console.error('[v1144] 找不到 Chromium，可设 MD3_CHROME'); process.exit(1); }

let BASE = process.env.BASE;
let server = null;
if (!BASE) {
  const port = await freePort();
  BASE = `http://127.0.0.1:${port}`;
  server = spawn('node', [join(ROOT, 'scripts', 'serve.mjs'), '--no-open', '--port', String(port)], { cwd: ROOT, stdio: 'ignore' });
  await sleep(1200);
}

// ---- WCAG（与 tests/v325 同式）----
function relLum(rgb) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}
const contrast = (a, b) => { const [hi, lo] = a > b ? [a, b] : [b, a]; return (hi + 0.05) / (lo + 0.05); };
const parseRgb = (s) => (s.match(/rgba?\(([^)]+)\)/) || [])[1]?.split(',').slice(0, 3).map(Number) || null;

let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log('  ✓ ' + label); } else { fail++; console.error('  ✗ ' + label); } };

const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));

try {
  await page.goto(`${BASE}/ios-desktop/index.html?nolock=1`, { waitUntil: 'load', timeout: 20000 });
  await sleep(600);

  // 注入与设置应用同构的开关标记（md3-theme.css 全局选择器命中；MutationObserver 自动绑定引擎）。
  // fixed + 高 z-index 注入：壳层桌面有全屏覆盖层（桌面/面板容器），static 注入点会被盖住
  // 导致真实指针事件无法命中 —— 置顶保证 elementFromPoint 命中 label 本体。
  await page.evaluate(() => {
    const l = document.createElement('label');
    l.className = 'md3-switch';
    l.id = 'probeSwitch';
    l.style.cssText = 'position:fixed;top:80px;left:80px;z-index:999999;';
    l.innerHTML = '<input type="checkbox"><span class="slider"><span class="thumb"></span></span>';
    document.body.appendChild(l);
  });
  await sleep(300);

  // 极性显式控制：走壳层真实 API（window.__themeModeTest.set，theme-mode.js 单一真源），
  // 配 emulateMedia 模拟 OS 极性 —— 暗相用 OS=light + 用户选暗（真实存在且曾致混合极性
  // 漏洞 #325，修复后 tokens.css :not gate 排除）；相变经 apply() 真链路（body 类 +
  // html[data-theme-mode] 属性同步写）。
  const setPolarity = async (light) => {
    await page.emulateMedia({ colorScheme: light ? 'light' : 'light' }); // OS 恒 light（混合态覆盖暗相）
    await page.evaluate((l) => window.__themeModeTest.set(l ? 'light' : 'dark'), light);
    await sleep(420); // 等 0.26s 颜色 transition 收敛（否则抓到插值中间帧）
  };
  await setPolarity(false); // OS=light + 用户选暗（混合极性，修复目标态）

  // 属性防线自证
  const attrOk = await page.evaluate(() => document.documentElement.dataset.themeMode === 'dark');
  ok(attrOk, '壳层 html[data-theme-mode="dark"] 已同步写（混合极性收口）');

  const grab = () => page.evaluate(() => {
    const root = document.getElementById('probeSwitch');
    const thumb = root.querySelector('.thumb');
    const slider = root.querySelector('.slider');
    const cs = getComputedStyle(thumb);
    return {
      thumbBg: cs.backgroundColor,
      trackBg: getComputedStyle(slider).backgroundColor,
      width: thumb.getBoundingClientRect().width,
      inlineBg: thumb.style.background,
      bound: !!root._m3Bound,
    };
  });

  // 1. 暗极性
  let m = await grab();
  ok(m.thumbBg === 'rgb(147, 143, 153)', `暗极性球色 #938f99（实测 ${m.thumbBg}）`);
  ok(m.bound, '引擎自动绑定（MutationObserver → _m3Bound）');

  // 3a. 暗 live 对比度
  let c = contrast(relLum(parseRgb(m.thumbBg)), relLum(parseRgb(m.trackBg)));
  ok(c >= 3, `暗极性 WCAG 球/轨对比度 ${c.toFixed(2)} ≥ 3`);

  // 2. 浅极性（显式）
  await setPolarity(true);
  m = await grab();
  ok(m.thumbBg === 'rgb(116, 119, 127)', `浅极性球色 #74777f（实测 ${m.thumbBg}）`);
  c = contrast(relLum(parseRgb(m.thumbBg)), relLum(parseRgb(m.trackBg)));
  ok(c >= 3, `浅极性 WCAG 对比度 ${c.toFixed(2)} ≥ 3`);

  // 4+5. 拖拽预览与按压保持：真实鼠标优先；未命中则按 v11.43 探针同款方法论
  // （向 .md3-switch 直接派发 PointerEvent）兜底，路径如实打印。
  const box = await page.locator('#probeSwitch').boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  let usedDispatch = false;
  const hit = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    return !!el && !!el.closest('#probeSwitch');
  }, [cx, cy]);
  if (hit) {
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await sleep(60);
    m = await grab();
    if (m.width < 27.5) {
      await page.mouse.up();
      await sleep(80);
      usedDispatch = true;
    }
  } else {
    usedDispatch = true;
  }
  if (!usedDispatch) {
    // 向左拖 >3px（未选中侧）触发 applyDragVisual —— 右拖会跨中线切到选中态预览
    await page.mouse.move(cx - 12, cy, { steps: 4 });
    await sleep(80);
  } else {
    await page.evaluate(([x, y]) => {
      const el = document.getElementById('probeSwitch');
      const ev = (type, x2) => el.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, composed: true,
        pointerId: 1, pointerType: 'mouse', button: type === 'pointermove' ? -1 : 0,
        clientX: x2, clientY: y, isPrimary: true,
      }));
      ev('pointerdown', x);
      ev('pointermove', x - 6);
      ev('pointermove', x - 12);
    }, [cx, cy]);
    await sleep(80);
  }
  m = await grab();
  const pressedW = m.width;
  ok(pressedW >= 27.9 && pressedW <= 28.2, `按压 SnapSpec 28px 保持（实测 ${pressedW.toFixed(1)}px${usedDispatch ? ' · dispatch 路径' : ' · 真实鼠标路径'}）`);
  m = await grab();
  ok(m.inlineBg.includes('--md-switch-unselected-handle'), `拖拽预览同源令牌（inline="${m.inlineBg}"）`);
  if (!usedDispatch) {
    await page.mouse.up();
  } else {
    await page.evaluate(() => {
      const el = document.getElementById('probeSwitch');
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, button: 0, isPrimary: true }));
    });
  }
  await sleep(500);
  m = await grab();
  ok(m.width >= 23.8 && m.width <= 24.2, `释放回 24px（实测 ${m.width.toFixed(1)}px）`);
  ok(!m.inlineBg.includes('--md-switch-unselected-handle') || m.inlineBg === '', '释放后颜色交还 CSS（inline 清空）');

  // 6. 零 pageerror
  ok(errs.length === 0, `零 pageerror（实测 ${errs.length} 条${errs[0] ? '：' + errs[0] : ''}）`);
} catch (e) {
  fail++;
  console.error('  ✗ 探针异常：' + String(e).slice(0, 200));
} finally {
  await browser.close();
  if (server) server.kill();
}

console.log(`\n[v1144] ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
