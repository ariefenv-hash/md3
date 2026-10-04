// ==================== vitest.config.js — 单元测试配置（批次五） ====================
//
// environment: happy-dom —— utils.js 的导入链（state → apps-data → 31 个应用模块）
// 会触到 window/document/localStorage/Audio 等浏览器全局，用 DOM 模拟环境承载。
// setup.js 补齐 happy-dom 未覆盖的全局桩。

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    // 场景测试（scenario-*）在 happy-dom 里引导真实 main.js：
    //   · iframe 子应用页面不真实加载（无网络依赖，无 teardown AbortError 噪声）
    environmentOptions: {
      'happy-dom': {
        settings: { disableIframePageLoading: true },
      },
    },
    // 弹簧收敛测试使用真实数值迭代，给足单测超时
    testTimeout: 15000,
  },
});
