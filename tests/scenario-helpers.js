// ==================== scenario-helpers.js — 场景测试基座 ====================
//
// 与单元测试（spring/utils 纯函数）不同，场景测试把「真实 index.html 的 body 骨架」
// 装载进 happy-dom，再动态 import main.js —— 触发与真机完全一致的模块级启动链
// （initDOM → 各 init* → renderDesktopPages → initLockScreen），
// 然后用真实 DOM 事件 / 已有测试钩子（window.__lockTest / __handleIframeGesture / __state）
// 驱动用户场景，对行为做端到端断言。
//
// 边界约定：
//   · 不修改任何源码 —— 画布 2D 上下文在测试层打桩（happy-dom 未实现 canvas，
//     返回 null；源码多处 getContext 后直接使用，桩保证返回全 no-op 代理）
//   · 动画走真实 rAF（happy-dom 由内部定时器驱动），弹簧收敛用 vi.waitFor 等待
//   · 每个测试文件独立模块图（Vitest 默认 isolate），文件内只引导一次，避免
//     main.js 的 window 级监听器重复安装

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TESTS_DIR, '..');
const INDEX_PATH = path.join(ROOT, 'ios-desktop', 'index.html');

/** 场景测试统一屏幕尺寸（与真机竖屏一致的 412×915 逻辑分辨率） */
export const SCREEN_W = 412;
export const SCREEN_H = 915;

/** 读取真实 index.html 并剥离脚本/外链样式/`<noscript>`，返回 body 内部骨架 */
export function buildShellHTML() {
  let html = readFileSync(INDEX_PATH, 'utf8');
  html = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script\b[^>]*\/>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
  const m = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (!m) throw new Error('index.html 中未找到 <body> 骨架');
  return m[1];
}

/** 全方法 no-op 的 2D 上下文代理（渐变等工厂方法返回可链式 no-op 对象） */
function create2DContextStub() {
  const noop = () => {};
  const gradient = { addColorStop: noop };
  const target = {};
  return new Proxy(target, {
    get(_t, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createConicGradient') {
        return () => gradient;
      }
      if (prop === 'measureText') return () => ({ width: 0 });
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      if (prop === 'canvas') return null;
      return noop;
    },
    set() { return true; },
  });
}

/** 一次性安装 canvas 桩（getContext / toDataURL），场景链路上的 procedural-wallpaper、
 *  desktop-blur、dev-options 火花图等全部安全通过 */
export function installCanvasStub() {
  const proto = window.HTMLCanvasElement.prototype;
  if (proto.__scenarioStubbed) return;
  proto.__scenarioStubbed = true;
  Object.defineProperty(proto, 'getContext', {
    value: () => create2DContextStub(),
    configurable: true,
  });
  Object.defineProperty(proto, 'toDataURL', {
    value: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    configurable: true,
  });
}

/** 锁定逻辑屏幕尺寸（happy-dom 默认 1024×768，需与真机竖屏对齐） */
export function setScreenSize(w = SCREEN_W, h = SCREEN_H) {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
}

/** 用键值表重置 localStorage（值为对象时自动 JSON 序列化） */
export function seedLocalStorage(map = {}) {
  localStorage.clear();
  for (const [k, v] of Object.entries(map)) {
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
}

/** 断网桩：at-a-glance 天气同步等启动期 fetch 一律立刻失败（源码已 catch 降级），
 *  保证场景测试零真实网络依赖、零随机噪声 */
export function installFetchStub() {
  if (window.__fetchStubbed) return;
  window.__fetchStubbed = true;
  window.fetch = () => Promise.reject(new Error('scenario-test: network disabled'));
}

/**
 * 完整引导桌面：装载骨架 → 环境修正 → 动态 import main.js。
 * 返回 window（其上挂有 __state / __lockTest / __handleIframeGesture 等钩子）。
 */
export async function bootDesktop() {
  document.body.innerHTML = buildShellHTML();
  installCanvasStub();
  installFetchStub();
  setScreenSize();
  await import('../ios-desktop/js/main.js');
  return window;
}

/** 等待窗口尺寸读写便捷函数（后台卡片尺寸档位断言用） */
export function currentWindowSize() {
  return { w: window.innerWidth, h: window.innerHeight };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export { sleep };
