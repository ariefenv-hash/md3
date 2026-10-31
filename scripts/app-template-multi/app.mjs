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
 */

const APP_ID = '{{APP_ID}}';
const APP_TITLE = '{{APP_TITLE}}';

/** 桌面注入的 SDK；直开（不经桌面）时为 null，页面须保持可独立运行 */
const sdk = window.__system || null;

const logEl = document.getElementById('log');
function say(msg) {
  if (logEl) logEl.textContent = 'SDK 状态：' + msg;
}

say(sdk ? '已接入桌面（总线 / 通知 / 权限 / fs / 剪贴板 可用）' : '独立运行（未经桌面注入，__system 不可用）');

document.getElementById('btnHello')?.addEventListener('click', () => {
  if (!sdk?.notify) { say('当前环境无通知通道'); return; }
  sdk.notify({ appId: APP_ID, title: APP_TITLE, desc: `来自 ${APP_ID} 的测试通知` });
});

document.getElementById('btnBus')?.addEventListener('click', () => {
  if (!sdk?.emit) { say('当前环境无总线通道'); return; }
  sdk.emit(`${APP_ID}/ping`, { from: APP_ID, at: Date.now() });
  say(`已广播 ${APP_ID}/ping`);
});

export { APP_ID, APP_TITLE, sdk };
