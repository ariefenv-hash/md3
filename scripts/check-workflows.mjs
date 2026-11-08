#!/usr/bin/env node
// #266 workflow YAML 结构 lint —— IO/CLI 层（纯核见 scripts/lib/workflow-lint-core.js）
// 用法：
//   node scripts/check-workflows.mjs            # lint .github/workflows/*.yml 全部，失败 exit 1
//   node scripts/check-workflows.mjs --file X   # 定向 lint 单文件
//   node scripts/check-workflows.mjs --selftest # 内建 fixture 冒烟（CI 快速自证）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintWorkflow, parseBranchList } from './lib/workflow-lint-core.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WF_DIR = path.join(ROOT, '.github', 'workflows');

const SELFTEST_FIXTURES = [
  { name: 'ok-inline', text: 'on:\n  push:\n    branches: [main]\n  workflow_dispatch:\njobs:\n  a:\n    runs-on: ubuntu-latest\n', expectOk: true },
  { name: 'ok-nextline', text: 'on:\n  push:\n    branches:\n      - main\n  workflow_dispatch:\njobs:\n  a:\n', expectOk: true },
  { name: 'broken-bare-scalar', text: 'on:\n  push:\n    branches: ain]\n  workflow_dispatch:\njobs:\n  a:\n', expectOk: false },
  { name: 'broken-unpaired', text: 'on:\n  push:\n    branches: [main\njobs:\n  a:\n', expectOk: false },
  { name: 'missing-main', text: 'on:\n  push:\n    branches: [dev]\njobs:\n  a:\n', expectOk: false },
  { name: 'no-on', text: 'name: x\njobs:\n  a:\n', expectOk: false },
  { name: 'no-jobs', text: 'on:\n  push:\n    branches: [main]\n', expectOk: false },
];

function runSelftest() {
  let fail = 0;
  for (const f of SELFTEST_FIXTURES) {
    const r = lintWorkflow(f.text);
    const pass = r.ok === f.expectOk;
    console.log(`  ${pass ? 'PASS' : 'FAIL'} ${f.name}${pass ? '' : ' → ' + JSON.stringify(r.errors)}`);
    if (!pass) fail++;
  }
  // parseBranchList 直测
  const p1 = parseBranchList('[main, release]');
  const p2 = parseBranchList('ain]');
  const p3 = parseBranchList('[main');
  const pOk = (p1.list && p1.list.join() === 'main,release' && !p1.error)
    && (!p2.list && p2.error) && (!p3.list && p3.error);
  console.log(`  ${pOk ? 'PASS' : 'FAIL'} parseBranchList`);
  if (!pOk) fail++;
  return fail;
}

function lintFile(file) {
  const text = fs.readFileSync(file, 'utf-8');
  const r = lintWorkflow(text);
  const rel = path.relative(ROOT, file);
  console.log(`  ${r.ok ? 'PASS' : 'FAIL'} ${rel}${r.ok ? '' : '\n' + r.errors.map((e) => '    - ' + e).join('\n')}`);
  return r.ok;
}

const args = process.argv.slice(2);
if (args.includes('--selftest')) {
  const fail = runSelftest();
  console.log(`selftest: ${fail === 0 ? 'ALL PASS' : fail + ' FAILED'}`);
  process.exit(fail === 0 ? 0 : 1);
}

const files = args.includes('--file')
  ? [path.resolve(ROOT, args[args.indexOf('--file') + 1])]
  : fs.readdirSync(WF_DIR).filter((f) => f.endsWith('.yml')).map((f) => path.join(WF_DIR, f));

let bad = 0;
for (const f of files) if (!lintFile(f)) bad++;
console.log(`check-workflows: ${files.length} file(s), ${files.length - bad} pass, ${bad} fail`);
process.exit(bad === 0 ? 0 : 1);
