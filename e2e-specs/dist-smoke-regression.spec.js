// ==================== dist-smoke-regression.spec.js — e2e-dist-smoke 运行器级整合 spec（#272 渐进批 2） ====================
//
// 批 2 接入形态=runner-level adoption（运行器级整合，G6 等强同律）：
// 本 spec 以子进程承载既有断言引擎 scripts/e2e-dist-smoke.mjs（#139②/#260/#299——
// dist 部署档全应用冒烟 + precache HTTP 自校验 + 关键资源清单，45/45 全绿实录在案），
// 退出码与汇总行等强透传为 playwright test 断言。**裸脚本本体是断言真源，零删除零改写
// 零改名**（批 1 只读盘点承诺延续）。
//
// dist 前置：本通道是「构建后」闸——dist/index.html 缺位时显式 skip（reason 注明
// 先 npm run build），不静默假绿不误报；gitignore 构建物不随 fetch 同步（R150 教训③），
// skip 形态=通道前置条件非门禁弱化（e2e:dist 直跑通道在 workflows 侧仍强执）。
//
// 端口纪律：子进程默认档 8088 固定端口——config workers=1 顺序执行防撞（批 2 契约）。

import { test, expect } from 'playwright/test';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test.setTimeout(600_000); // dist-smoke 直跑实录 ~120s 量级；10 分钟帽含重试余量

test('dist 部署档冒烟（e2e-dist-smoke 断言引擎等强透传）', async () => {
  const distReady = existsSync(path.join(root, 'dist/index.html'));
  test.skip(!distReady, 'dist 构建产物缺位（gitignore 构建物不随 fetch 同步）——先 npm run build 再跑 e2e:pw');

  const r = spawnSync(process.execPath, ['scripts/e2e-dist-smoke.mjs'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  const out = `${r.stdout || ''}\n${r.stderr || ''}`;
  const m = out.match(/结果：PASS (\d+) \/ FAIL (\d+)/);
  expect(m, `汇总行缺失（引擎异常退出 status=${r.status}）：${out.slice(-400)}`).toBeTruthy();
  expect(Number(m[1]), 'PASS 数为 0（注册表解析异常）').toBeGreaterThan(0);
  expect(Number(m[2]), `dist-smoke fail=${m[2]}`).toBe(0);
  expect(r.status, '退出码非 0（三防线/precache/关键资源闸红）').toBe(0);
});
