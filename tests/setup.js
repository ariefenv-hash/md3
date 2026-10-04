// ==================== tests/setup.js — Vitest 全局环境补桩 ====================
//
// happy-dom 覆盖了 window / document / localStorage 等常用全局，
// 但桌面模块导入链上还有少量 Web API 顶层引用需要补齐：
//   · Audio —— media-service.js 等在实例化时 new Audio()；happy-dom 未提供时以最小桩顶替
//   · matchMedia —— 部分模块探测系统主题/减少动效；桩返回恒定假值
//   · requestAnimationFrame —— happy-dom 已提供；此处理兜底为立即帧（保险丝）

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
