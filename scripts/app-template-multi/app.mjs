/**
 * {{APP_TITLE}} — 多文件子应用主入口（{{APP_ID}}）
 *
 * v9.04 #151 多文件形态约定：
 *   · 本文件为 ESM 入口，由 index.html 以 <script type="module" src="./app.mjs"> 引入
 *   · 按功能模块继续拆分时，新建兄弟 <feature>.mjs 并以相对路径 import：
 *       import { renderTimer } from './timer.mjs';
 *     构建期 vite.config.js 会扫描 index.html 的兄弟引用并断言存在；
 *     模块间 import 由构建期 esbuild 原样保留（相对路径在 dist 中结构不变）。
 *   · 纯逻辑（可单测部分）建议进一步下沉到 js/<app>-core.js，
 *     走 #138 已有的 ../../js 自动扫描通道，与 terminal / word 等应用同构。
 *
 * #179 准入④⑤骨架（v9.46 #181）：SDK 三通道示例（notify/emit/fs）+ 怠速柄滑条
 * --p 同步 + 整排按压联动 pressRipple（tile-bounce.js Bounceable 数学同构轻量版）。
 */

const APP_ID = '{{APP_ID}}';
const APP_TITLE = '{{APP_TITLE}}';

/** 桌面注入的 SDK；直开（不经桌面）时为 null，页面须保持可独立运行 */
const sdk = window.__system || null;

const logEl = document.getElementById('log');

// #230 A 门槛骨架（v10.38 #228 要求③）：入口模块自身消费 --md-* 令牌 ——
// 「令牌全塞 style.css、模块零引用」是 #228 实证过的「过简洁」范式根因之一，模板率先破除
if (logEl) {
  logEl.style.color = 'var(--md-on-surface-variant, var(--md-on-surface, #E2E7EA))';
  logEl.style.borderLeft = '3px solid var(--md-primary, #6750A4)';
  logEl.style.borderRadius = '0 var(--radius-m, 12px) var(--radius-m, 12px) 0';
  logEl.style.background = 'var(--md-surface-container, var(--md-surface, #101418))';
}
function say(msg) {
  if (logEl) logEl.textContent = 'SDK 状态：' + msg;
}

say(sdk ? '已接入桌面（总线 / 通知 / 权限 / fs / 剪贴板 可用）' : '独立运行（未经桌面注入，__system 不可用）');

document.getElementById('btnHello')?.addEventListener('click', () => {
  if (!sdk?.notify) { say('当前环境无通知通道'); return; }
  sdk.notify({ title: APP_TITLE, body: `来自 ${APP_ID} 的测试通知` });   // {title, body} 形态，notifications.js 消费同款
  say('已发系统通知');
});

document.getElementById('btnBus')?.addEventListener('click', () => {
  if (!sdk?.emit) { say('当前环境无总线通道'); return; }
  sdk.emit(`${APP_ID}/ping`, { from: APP_ID, at: Date.now() });
  say(`已广播 ${APP_ID}/ping`);
});

// 准入④：VFS 读写示例（__system.fs IndexedDB 桥；markdown/music 同范式）
document.getElementById('btnFs')?.addEventListener('click', async () => {
  if (!sdk?.fs) { say('当前环境无 VFS 通道'); return; }
  try {
    const path = `/documents/${APP_ID}-demo.json`;
    await sdk.fs.write(path, JSON.stringify({ at: Date.now() }), { mime: 'application/json' });
    say(`已写 VFS ${path}`);
  } catch (e) { say('VFS 写入失败：' + (e && e.message || e)); }
});

// 准入⑤：怠速柄滑条 --p 同步（进度填充两段式渐变由 CSS 消费）
const demoSlider = document.getElementById('demoSlider');
function applyDemo() {
  const v = parseInt(demoSlider.value, 10);
  demoSlider.style.setProperty('--p', v + '%');
  document.getElementById('demoVal').textContent = String(v);
}
demoSlider?.addEventListener('input', applyDemo);
applyDemo();

// 准入⑤：整排按压联动（pressRipple：按压者压缩+圆角增大，邻项按距离衰减让位；
// tile-bounce.js Bounceable 数学同构轻量版，ζ=1 临界阻尼观感，回弹 transition .18s）
const sqs = Array.from(document.querySelectorAll('.squeeze-row .sq'));
function pressRipple(originIdx) {
  sqs.forEach((k, i) => {
    const d = Math.abs(i - originIdx);
    const f = d === 0 ? 1 : Math.max(0, 1 - d * 0.45);
    const sc = d === 0 ? 0.88 : 1 - 0.05 * f;
    const shift = d === 0 ? 0 : (i < originIdx ? 1 : -1) * 2 * f;
    k.style.transform = `translateX(${shift.toFixed(1)}px) scale(${sc.toFixed(3)})`;
    k.style.borderRadius = `${(10 + (d === 0 ? 5 : 3) * f).toFixed(1)}px`;
    k.style.zIndex = d === 0 ? '1' : '';
  });
}
function releaseRipple() {
  sqs.forEach((k) => { k.style.transform = ''; k.style.borderRadius = ''; k.style.zIndex = ''; });
}
sqs.forEach((k, i) => {
  k.addEventListener('pointerdown', () => pressRipple(i));
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => k.addEventListener(ev, releaseRipple));
});
document.addEventListener('pointerup', releaseRipple);

// 准入③：手机态 tab 切换（平板双栏时 tab 条隐藏）
document.getElementById('tabA')?.addEventListener('click', () => { document.body.dataset.tab = 'a'; tabOn('tabA'); });
document.getElementById('tabB')?.addEventListener('click', () => { document.body.dataset.tab = 'b'; tabOn('tabB'); });
function tabOn(id) {
  document.getElementById('tabA')?.classList.toggle('on', id === 'tabA');
  document.getElementById('tabB')?.classList.toggle('on', id === 'tabB');
}

export { APP_ID, APP_TITLE, sdk };
