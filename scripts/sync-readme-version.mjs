#!/usr/bin/env node
// ==================== sync-readme-version.mjs — README 版本单一真源同步（#150） ====================
//
// 真源：package.json 的 version（semver）。README 顶部的版本块由本脚本生成，
// 杜绝手工维护双处版本号；漂移由 tests/v150-readme-version.test.js 门禁拦截
//（CI vitest 步先于 build 执行，不等即红，见 #150 方案 B 与方案 A 的合流：
// 写入自动化用本脚本，强制力用 vitest 门禁——README 不入 dist，prebuild 写回无产物收益）。
//
// 用法：
//   node scripts/sync-readme-version.mjs          # 仅按 package.json 现值重写 README 版本块
//   node scripts/sync-readme-version.mjs 9.00     # 先把 package.json 升到 9.0.0，再重写 README 块
//   node scripts/sync-readme-version.mjs v9.00    # 同上（容 v 前缀）
//
// 版本映射：semver「X.Y.0」⇄ 展示「vX.YZ」（minor 两位补零，v9.00 ⇄ 9.0.0、v8.99 ⇄ 8.99.0）。
// 每次 vX.YZ 提交的惯例：先跑本脚本带新版本号，再 git commit（commit message 版本号与本值一致，门禁保证）。

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PKG = path.join(ROOT, 'package.json');
const README = path.join(ROOT, 'README.md');
const START = '<!-- md3:version:start -->';
const END = '<!-- md3:version:end -->';

// 「9.00」/「v9.00」/「9.0.0」→ 严格 semver「9.0.0」；非法即退出非零（门禁友好）
// 注意：npm 拒绝前导零（「9.00.0」Invalid Version，npm ci 直接红），minor 必须数值化去零，
// 展示层 v9.00 的两位补零由 display() 负责。
function normalize(input) {
  const m = String(input).trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)(?:\.(\d+))?$/);
  if (!m) throw new Error(`无法解析版本号：${input}（期望 X.YZ 或 X.Y.Z）`);
  return `${Number(m[1])}.${Number(m[2])}.0`;
}

// semver「X.Y.0」→ 展示「vX.YZ」（minor 两位补零）
function display(semver) {
  const [maj, min] = semver.split('.');
  return `v${maj}.${String(min).padStart(2, '0')}`;
}

const pkg = JSON.parse(readFileSync(PKG, 'utf8'));

const arg = process.argv[2];
if (arg) {
  pkg.version = normalize(arg);
  writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`[sync-version] package.json → ${pkg.version}`);
}

const ver = display(pkg.version);
let md = readFileSync(README, 'utf8');
const i0 = md.indexOf(START);
const i1 = md.indexOf(END);
if (i0 === -1 || i1 === -1 || i1 < i0) {
  throw new Error(`README 缺少版本块标记（${START} … ${END}），请先手工补上`);
}
const block = [
  START,
  `> **当前版本 ${ver}** · 单一真源 \`package.json\`（version 字段）→ \`scripts/sync-readme-version.mjs\` 写入本块，`,
  `> 漂移由 \`tests/v150-readme-version.test.js\` 门禁拦截 · 逐版演进史见 [ROADMAP.md](ROADMAP.md)`,
  END,
].join('\n');
md = md.slice(0, i0) + block + md.slice(i1 + END.length);
writeFileSync(README, md);
console.log(`[sync-version] README 版本块 → ${ver}`);
