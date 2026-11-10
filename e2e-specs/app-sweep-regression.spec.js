// ==================== app-sweep-regression.spec.js — e2e-app-sweep 运行器级整合 spec（#272 渐进批 2） ====================
//
// 批 2 接入形态=runner-level adoption（运行器级整合，G6 等强同律）：
// 本 spec 以子进程承载既有断言引擎 scripts/e2e-app-sweep.mjs（#300 全应用 sweep +
// #304 基线对比闸——52+ 应用×三通道计数断言引擎，52/52 全绿实录在案），退出码与
// 汇总行等强透传为 playwright test 断言。**裸脚本本体是断言真源，零删除零改写零改名**
// （批 1 只读盘点承诺延续；native re-expression 全量面留批 3+ 逐脚本评审执行）。
//
// 等强对账（adoption §6）：npm run e2e:sweep（直跑通道）与 npm run e2e:pw（本 spec）
// 同窗各自实跑，两者须同为 0 fail——结论等强由实跑值对账非声明。
//
// 端口纪律：子进程默认档 8097 固定端口——config workers=1 顺序执行防撞（批 2 契约）。

import { test, expect } from 'playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test.setTimeout(600_000); // sweep 直跑实录 214–228s 量级；10 分钟帽含重试余量

test('全应用 sweep 回归（e2e-app-sweep 断言引擎等强透传）', async () => {
  const r = spawnSync(process.execPath, ['scripts/e2e-app-sweep.mjs'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const m = out.match(/汇总：(\d+) pass \/ (\d+) fail/);
  expect(m, `汇总行缺失（引擎异常退出 status=${r.status}）：${out.slice(-400)}`).toBeTruthy();
  expect(Number(m[1]), 'pass 数为 0（桌面图标收集异常）').toBeGreaterThan(0);
  expect(Number(m[2]), `sweep fail=${m[2]}`).toBe(0);
  expect(r.status, '退出码非 0（三防线/基线闸红——见 stdout FAIL 清单）').toBe(0);
});
