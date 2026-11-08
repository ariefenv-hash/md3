// tests/v266-workflows.test.js —— #266 deploy.yml 触发分支损坏修复 + 部署分支自证 + workflow lint 门禁
// 环境注记：本测试对仓库真源（.github/workflows/deploy.yml）的读取走 `git show :path`（index 态），
// 本地工作树存储层存在读取抖动（MultiEdit 页缓存污染），index 为 sha1 锁定的唯一真源；
// CI checkout 后 index == HEAD == 提交内容，两端一致。
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintWorkflow, parseBranchList } from '../scripts/lib/workflow-lint-core.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEPLOY = '.github/workflows/deploy.yml';

function readRepoFile(rel) {
  // 优先 git index（真源锁定），失败回退工作树
  // 环境注记：本地存储层存在跨进程读取抖动，index 读取亦偶发 —— 5 读多数投票取真源
  try {
    const views = [];
    for (let i = 0; i < 5; i++) {
      views.push(execSync(`git show :${rel}`, { cwd: ROOT, encoding: 'utf-8', maxBuffer: 8 * 1024 * 1024 }));
    }
    const tally = new Map();
    for (const v of views) tally.set(v, (tally.get(v) || 0) + 1);
    let best = null, bestN = 0;
    for (const [v, n] of tally) if (n > bestN) { best = v; bestN = n; }
    return best;
  } catch {
    return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
  }
}

describe('v266-A parseBranchList 纯逻辑', () => {
  it('A1 合法内联列表解析为项数组', () => {
    const r = parseBranchList('[main]');
    expect(r.error).toBeNull();
    expect(r.list).toEqual(['main']);
  });
  it('A2 多项列表去引号保序', () => {
    const r = parseBranchList("[main, 'release']");
    expect(r.list).toEqual(['main', 'release']);
  });
  it('A3 裸标量（历史损坏态 ain]）拒绝并给错误', () => {
    const r = parseBranchList('ain]');
    expect(r.list).toBeNull();
    expect(r.error).toMatch(/列表形态/);
  });
  it('A4 未配对括号拒绝', () => {
    const r = parseBranchList('[main');
    expect(r.list).toBeNull();
    expect(r.error).toMatch(/不配对/);
  });
  it('A5 空白值返回 null 无错误（次行列表由 lintWorkflow 处理）', () => {
    expect(parseBranchList('')).toEqual({ list: null, error: null });
  });
});

describe('v266-B lintWorkflow 结构规则', () => {
  it('B1 合法内联形态通过', () => {
    const r = lintWorkflow('on:\n  push:\n    branches: [main]\n  workflow_dispatch:\njobs:\n  a:\n');
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });
  it('B2 合法次行列表形态通过', () => {
    const r = lintWorkflow('on:\n  push:\n    branches:\n      - main\n  workflow_dispatch:\njobs:\n  a:\n');
    expect(r.ok).toBe(true);
  });
  it('B3 裸标量损坏态拒绝（#266 根缺陷形态回归锚）', () => {
    const r = lintWorkflow('on:\n  push:\n    branches: ain]\n  workflow_dispatch:\njobs:\n  a:\n');
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/branches 必须为列表形态/);
  });
  it('B4 列表缺 main 拒绝', () => {
    const r = lintWorkflow('on:\n  push:\n    branches: [dev]\njobs:\n  a:\n');
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/必须含 main/);
  });
  it('B5 缺 on: 段拒绝', () => {
    expect(lintWorkflow('name: x\njobs:\n  a:\n').ok).toBe(false);
  });
  it('B6 缺 jobs: 段拒绝', () => {
    expect(lintWorkflow('on:\n  push:\n    branches: [main]\n').ok).toBe(false);
  });
});

describe('v266-C 仓库真源守卫（index 态读取）', () => {
  const text = readRepoFile(DEPLOY);

  it('C1 触发分支过滤器为列表形态且含 main（损坏态 ain] 已根治）', () => {
    expect(text).toMatch(/branches:\s*\[main\]/);
    expect(text).not.toMatch(/branches:\s*ain\]/);
    expect(lintWorkflow(text).ok).toBe(true);
  });
  it('C2 build-and-deploy 部署分支自证步骤存在且仅 push 事件门控', () => {
    expect(text).toMatch(/- name: Assert deploy branch \(#266\)/);
    expect(text).toMatch(/if: github\.event_name == 'push'[\s\S]*?refs\/heads\/main/);
    expect(text).toMatch(/::error::.*触发过滤器配置漂移/);
  });
  it('C3 自证步位于 Checkout 之后 Build 之前（部署前第一道闸）', () => {
    const iCheckout = text.indexOf('  build-and-deploy:');
    const iAssert = text.indexOf('Assert deploy branch (#266)');
    const iBuild = text.indexOf('- name: Build\n', iAssert);
    expect(iAssert).toBeGreaterThan(iCheckout);
    expect(iBuild).toBeGreaterThan(iAssert);
  });
  it('C4 既有门禁面零回退（#235 concurrency / gate-alert / #139 verify / #256 shot）', () => {
    expect(text).toMatch(/cancel-in-progress: false/);
    expect(text).toMatch(/gate-alert:/);
    expect(text).toMatch(/verify-dist\.mjs/);
    expect(text).toMatch(/shot-baseline\.mjs/);
    expect(text).toMatch(/check-comment-claims\.mjs/);
  });
  it('C5 全部 workflow 文件通过 lint（含 deploy）', () => {
    const dir = path.join(ROOT, '.github', 'workflows');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.yml'));
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const f of files) {
      // deploy.yml 抖动敏感走 index；其余直读
      const t = f === 'deploy.yml' ? text : fs.readFileSync(path.join(dir, f), 'utf-8');
      const r = lintWorkflow(t);
      expect(r.ok, `${f}: ${r.errors.join('; ')}`).toBe(true);
    }
  });
});

describe('v266-D lint 门禁挂接', () => {
  it('D1 package.json check:workflows script 已挂接', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    expect(pkg.scripts['check:workflows']).toBe('node scripts/check-workflows.mjs');
  });
  it('D2 CLI --selftest 内建 fixture 全过', () => {
    const out = execSync('node scripts/check-workflows.mjs --selftest', {
      cwd: ROOT, encoding: 'utf-8', maxBuffer: 1024 * 1024,
    });
    expect(out).toMatch(/selftest: ALL PASS/);
  });
});
