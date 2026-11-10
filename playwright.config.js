// ==================== playwright.config.js — e2e playwright 化骨架（#272 批 1） ====================
//
// #272 卡面建议①兑现：retries=2 / 失败 trace+截图保留 / reporter=list+html。
//
// 骨架空跑契约（docs/e2e-playwright-adoption.md §2 登记）：
//   · testDir 指向 e2e-specs/——本批新建、仅 README 占位、零 spec：
//     `playwright test` 零发现零执行，对既有面零行为变更；
//   · 既有裸脚本通道零触碰：npm e2e:dist / e2e:sweep / scripts/e2e-*.mjs 直跑
//     三通道全保留，本批对 230 家脚本只读盘点（三档清单化）零删除零改写零改名；
//   · npm e2e:pw = `playwright test --pass-with-no-tests`——空 spec 期显式空跑通过，
//     首批常青 spec 接入（渐进批 2，卡面建议③）后摘除该旗标；
//   · 渐进接入路线见 docs/e2e-playwright-adoption.md §4；与 settings.js 拆分批异槽。

import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './e2e-specs',
  retries: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
