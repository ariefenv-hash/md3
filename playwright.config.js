// ==================== playwright.config.js — e2e playwright 化（#272 批 1 骨架 · 批 2 接入） ====================
//
// #272 卡面建议①兑现：retries=2 / 失败 trace+截图保留 / reporter=list+html。
// 批 2（v11.07）兑现：首批 spec 接入 + `--pass-with-no-tests` 摘除（§2 交接锚）+
// workers=1 顺序纪律——app-sweep(8097)/dist-smoke(8088) 运行器级整合 spec 以固定端口
// 子进程承载断言引擎，并行 worker 必撞端口，顺序执行=端口纪律+确定性内存足迹。
//
// 既有裸脚本通道零触碰：npm e2e:dist / e2e:sweep / node scripts/e2e-*.mjs 直跑
// 三通道全保留；230 家脚本只读盘点承诺延续（零删除零改写零改名）。
// 渐进接入路线见 docs/e2e-playwright-adoption.md §4/§6；与 settings.js 拆分批异槽。

import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './e2e-specs',
  retries: 2,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
