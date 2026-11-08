// ==================== check-motion-tokens.mjs — 全库曲线令牌化率报告与水位防回退（#245 批 1） ====================
//
// #245「统一」档批 1（R127 窗）：全库裸 cubic-bezier 精确等值收口到
// --md-easing-* 运动令牌（#239 令牌组 + spring-legacy 自创档）后的护栏：
//
//   默认（报告）：扫描 ios-desktop/**/*.css + *.html，输出令牌消费/裸曲线/
//     令牌化率与裸曲线值分布（批 2 遗留清单）
//   --check（防回退门禁）：与 scripts/motion-token-baseline.json 水位对账，
//     令牌消费数低于水位 或 非遗留裸曲线数高于水位 → exit 1
//   --update（重录水位）：以当前实跑数固化水位文件
//
// 统计口径（与 tests/v245 B 组锚、audit checkF detail 三方一致）：
//   · 令牌消费 = var(--md-easing-*, cubic-bezier(...))（fallback 裸值属令牌引用的一部分）
//   · 裸曲线 = 非 var fallback 内、非注释内、非 <script> 块内的 cubic-bezier(
//   · 遗留白名单 = scripts/motion-token-baseline.json 的 legacyValues（#245 批 2 范围）
//
// 用法：node scripts/check-motion-tokens.mjs [--check|--update]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = path.join(root, 'ios-desktop');
const BASELINE = path.join(root, 'scripts', 'motion-token-baseline.json');
const argv = process.argv.slice(2);
const MODE = argv.includes('--check') ? 'check' : argv.includes('--update') ? 'update' : 'report';

// ---------- 收集文件（css + html，跳过 vendor/min） ----------
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'vendor' || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(css|html)$/.test(e.name) && !/\.min\./.test(e.name)) out.push(full);
  }
  return out;
}

const files = walk(TARGET);
let tokenConsumed = 0, bareTotal = 0;
const bareDist = {}; // 值 → 计数（批 2 遗留清单）
const perFile = [];

const CONSUME_RE = /var\(--md-easing-[a-z-]+,\s*cubic-bezier\([^)]*\)/g;
const BEZ_RE = /cubic-bezier\(\s*([^)]*?)\s*\)/g;
const NUM = /^-?\d*\.?\d+$/;

for (const f of files) {
  // 令牌真源豁免：md3-tokens.css 定义行的裸曲线就是令牌本体（单一真源），不属收口对象
  if (f.endsWith(path.join('_shared', 'md3-tokens.css'))) continue;
  const src = readFileSync(f, 'utf-8');
  // 排除区间：CSS 注释 / HTML 注释 / <script> 块（WAAPI easing 不支持 var()，批 2 处理）
  const spans = [];
  for (const m of src.matchAll(/\/\*[\s\S]*?\*\//g)) spans.push([m.index, m.index + m[0].length]);
  for (const m of src.matchAll(/<!--[\s\S]*?-->/g)) spans.push([m.index, m.index + m[0].length]);
  for (const m of src.matchAll(/<script\b[\s\S]*?<\/script>/gi)) spans.push([m.index, m.index + m[0].length]);
  const inSpan = (pos) => spans.some(([a, b]) => a <= pos && pos < b);
  // 掩码：先标记消费实例，再于剩余文本找裸值（防止 fallback 内裸值双计）
  const consumed = src.match(CONSUME_RE) || [];
  const mask = src.replace(CONSUME_RE, (m) => '\u0000'.repeat(m.length));
  let c = 0, b = 0;
  for (const m of mask.matchAll(BEZ_RE)) {
    if (inSpan(m.index)) continue;
    b++;
    const parts = m[1].split(',').map((s) => s.trim());
    if (parts.length === 4 && parts.every((p) => NUM.test(p))) {
      const key = `cubic-bezier(${parts.join(', ')})`;
      bareDist[key] = (bareDist[key] || 0) + 1;
    }
  }
  c = consumed.filter((_, i) => !inSpan(src.indexOf(consumed[i]))).length;
  if (c || b) perFile.push(`${path.relative(root, f)}: tokens=${c} bare=${b}`);
  tokenConsumed += c;
  bareTotal += b;
}

const total = tokenConsumed + bareTotal;
const pct = total ? ((tokenConsumed / total) * 100).toFixed(1) : '100.0';

if (MODE === 'report' || MODE === 'check') {
  console.log(`[motion-tokens] 扫描 ${files.length} 文件：令牌消费 ${tokenConsumed} / 裸曲线 ${bareTotal}（共 ${total}，令牌化率 ${pct}%）`);
  console.log('[motion-tokens] 裸曲线值分布（#245 批 2 遗留清单）：');
  for (const [k, v] of Object.entries(bareDist).sort((a, x) => x[1] - a[1])) console.log(`  ${String(v).padStart(3)} × ${k}`);
}

if (MODE === 'update') {
  // v10.63 批 2（R128 窗）：legacyValues/legacyVerdict 为批 2 逐档评估结论固化字段，
  // --update 透传不抹（评估结论「保持原值」是水位语义的一部分，脚本逻辑/门禁不变）
  let prev = {};
  try { prev = JSON.parse(readFileSync(BASELINE, 'utf-8')); } catch {}
  writeFileSync(BASELINE, JSON.stringify({
    generated: 'R130 窗 #245 批 3 固化水位（进阶档共享轴转场+空状态入场令牌消费后重固化；legacyValues/legacyVerdict 评估字段透传）',
    files: files.length,
    tokenConsumed,
    bareTotal,
    bareDist,
    ...(prev.legacyValues ? { legacyValues: prev.legacyValues, legacyVerdict: prev.legacyVerdict } : {}),
  }, null, 2) + '\n');
  console.log(`[motion-tokens] 水位已固化 → ${path.relative(root, BASELINE)}（tokens=${tokenConsumed} bare=${bareTotal}）`);
  process.exit(0);
}

if (MODE === 'check') {
  if (!existsSync(BASELINE)) {
    console.error('[motion-tokens] --check 缺水位文件：先 node scripts/check-motion-tokens.mjs --update');
    process.exit(1);
  }
  const base = JSON.parse(readFileSync(BASELINE, 'utf-8'));
  const violations = [];
  if (tokenConsumed < base.tokenConsumed) violations.push(`令牌消费回退：${tokenConsumed} < 水位 ${base.tokenConsumed}`);
  if (bareTotal > base.bareTotal) violations.push(`裸曲线回退：${bareTotal} > 水位 ${base.bareTotal}`);
  for (const [k, v] of Object.entries(base.bareDist || {})) {
    const now = bareDist[k] || 0;
    if (now > v) violations.push(`遗留裸曲线回退：${k} ${now} > 水位 ${v}`);
  }
  if (violations.length) {
    console.error('[motion-tokens] 防回退门禁 FAIL：\n  ' + violations.join('\n  '));
    process.exit(1);
  }
  console.log('[motion-tokens] --check 水位对账 PASS（令牌消费不降、裸曲线不增）');
}
