// ==================== tests/setup.js — Vitest 全局环境补桩 ====================
//
// happy-dom 覆盖了 window / document / localStorage 等常用全局，
// 但桌面模块导入链上还有少量 Web API 顶层引用需要补齐：
//   · Audio —— media-service.js 等在实例化时 new Audio()；happy-dom 未提供时以最小桩顶替
//   · matchMedia —— 部分模块探测系统主题/减少动效；桩返回恒定假值
//   · requestAnimationFrame —— happy-dom 已提供；此处理兜底为立即帧（保险丝）
//   · #225 开窗看门狗：独立 setTimeout 计时；测试若未走完收敛路径，teardown 后
//     残留回调会触碰 happy-dom AsyncTaskManager（历史同款噪声）。每个测试文件
//     收尾统一清理观测面，产品侧零影响（生产环境无 vitest afterAll）。
//   · v11.30 #240：全环境预载净化单源（apps/_shared/sanitize.js）——壳层/应用
//     escapeHtml 已收敛为 window.__mdEscape 委托（本地正则链退役），模块
//     求值与渲染路径在 happy-dom 内零缺省依赖本预载。

import { afterAll } from 'vitest';
import '../ios-desktop/apps/_shared/sanitize.js';

afterAll(() => {
  try {
    const w = globalThis.window;
    if (w && w.__launchWatchdog) w.__launchWatchdog.clear();
  } catch (e) { /* 环境已销毁则无需清理 */ }
});

if (typeof globalThis.Audio === 'undefined') {
  globalThis.Audio = class Audio {
    constructor() {
      this.paused = true;
      this.currentTime = 0;
      this.volume = 1;
    }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    load() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = () => ({
    matches: false,
    media: '',
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
}

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}
