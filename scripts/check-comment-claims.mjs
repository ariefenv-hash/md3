// ==================== check-comment-claims.mjs — 「注释 = 代码」数值声明核对器（#149 纪律①） ====================
//
// 背景（#149 审计结论）：项目反复出现「注释写了权威考证结论，代码没跟着落地」
// 的失血模式——危害比没写注释更大：后来者照着注释信，不再核验（#135 设置图标
// 40dp vs 34px 长期无人发现；#142「七态」vs DIMS 6 键；#148「12 组」vs 8 组）。
// 6 处实证里 4 处集中在文件头注释——「一次性写完的总结性头注释」是重灾区。
//
// 本脚本落地 #149 建议纪律①「数值型注释必须可被机器核对」：
//   扫描注释中的数值声明（dp / px / ms / 「N 组 / 态 / 项 / 维」），在同文件
//   【代码区】（非注释区）检索同一数值是否出现；不出现 → 列为失配候选。
//
// 误报治理（三层）：
//   1. 叙述性引用（AOSP 源码条目数、历史版本号、测试基线等）≠ 本文件结构声明
//      → 复核后经 allowlist 显式豁免（file + 数值token 粒度，必须写理由）
//   2. allowlist 基线模式：CI 只对【新增】失配（不在 allowlist 的 file+token）报错，
//      存量经人工复核豁免一次后永久固化
//   3. --update 模式重建基线（输出前必须人工过目，禁止 CI 内自动刷新）
//
// 用法：
//   node scripts/check-comment-claims.mjs             # CI 门禁：新失配即退出码 1
//   node scripts/check-comment-claims.mjs --audit     # 全量列出失配候选（含已豁免）
//   node scripts/check-comment-claims.mjs --update    # 以当前扫描结果重建 allowlist
//
// 范围：ios-desktop/**/*.js、ios-desktop/**/*.css、sw.js（dist/ 产物不入库不扫）

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWLIST_PATH = path.join(rootDir, 'scripts', 'comment-claims-allowlist.json');
const MODE = process.argv.includes('--update') ? 'update' : process.argv.includes('--audit') ? 'audit' : 'gate';

// ---------- 收集目标文件 ----------
function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const abs = path.join(dir, name);
    const s = statSync(abs, { throwIfNoEntry: false });
    if (!s) continue;
    if (s.isDirectory()) walk(abs, exts, out);
    else if (exts.includes(path.extname(name))) out.push(abs);
  }
  return out;
}
const files = [
  ...walk(path.join(rootDir, 'ios-desktop'), ['.js', '.css']),
  path.join(rootDir, 'sw.js'),
].filter((f) => existsSync(f));

// ---------- 注释/代码区切分（best-effort：字符串字面量内不产生注释；CSS url(...) 内不产生注释） ----------
function splitComments(src) {
  // 先遮蔽 CSS url(...)（可能含 https:// 与 data:image/svg+xml;utf8,<svg .../>，均会伪触发注释切分）
  let srcMasked = src.replace(/\burl\(\s*['"]?[^)]*?\)/g, (m) => 'url(' + '\0'.repeat(m.length - 5) + ')');
  const spans = []; // {start,end,type:'line'|'block'}
  let i = 0, n = srcMasked.length;
  let strCh = null;
  while (i < n) {
    const c = srcMasked[i], next = srcMasked[i + 1];
    if (strCh) {
      if (c === '\\') { i += 2; continue; }
      if (c === strCh) strCh = null;
      i++; continue;
    }
    if (c === '"' || c === "'" || c === '`') { strCh = c; i++; continue; }
    if (c === '/' && next === '/') {
      let j = srcMasked.indexOf('\n', i);
      if (j === -1) j = n;
      spans.push({ start: i, end: j, type: 'line' });
      i = j; continue;
    }
    if (c === '/' && next === '*') {
      let j = srcMasked.indexOf('*/', i + 2);
      j = j === -1 ? n : j + 2;
      spans.push({ start: i, end: j, type: 'block' });
      i = j; continue;
    }
    i++;
  }
  return spans;
}

// ---------- 数值声明 token ----------
// 单位集：实现类物理量（dp/px/ms）+ 结构计数（组/态/项/维）
// 「个/条/行/枚/倍/键/文件/批/轮」叙述性强、误报率高，不扫（如需扩面先过 allowlist 复核）
// 前缀排除 \w . v V L #：版本引用（v7.33）/ 源码行号（L157）/ issue 号（#9 组件）非结构声明
// 后缀排除 件势目度：拒绝「组件 / 态度 / 项目 / 维度」等把计数单位当词素的误匹配
const CLAIM_RE = /(?<![\w.vVL#])(\d+(?:\.\d+)?)\s*(dp|px|ms|组|态|项|维)(?![件势目度])/g;

const results = []; // {file, rel, token, num, unit, line, snippet}
for (const f of files) {
  const src = readFileSync(f, 'utf-8');
  const rel = path.relative(rootDir, f).split(path.sep).join('/');
  const spans = splitComments(src);
  const codeParts = [];
  let cursor = 0;
  for (const s of spans) { codeParts.push(src.slice(cursor, s.start)); cursor = s.end; }
  codeParts.push(src.slice(cursor));
  const codeRegion = codeParts.join(' ');
  const lineStarts = [...src.matchAll(/\n/g)].map((m) => m.index);

  for (const s of spans) {
    const text = src.slice(s.start, s.end);
    for (const m of text.matchAll(CLAIM_RE)) {
      const token = m[1] + m[2];
      // 数值必须在同文件代码区出现（原样 grep 语义；1 与 1.0 视为不同 token，保简单可解释）
      // 前缀排除 v/L：v7.33组（版本引用）/ L157（源码行号引用）非结构声明
      const re = new RegExp('(?<![\\w.vVL])' + m[1].replace('.', '\\.') + '(?!\\d)');
      const inCode = re.test(codeRegion);
      if (inCode) continue;
      const line = lineStarts.filter((idx) => idx < s.start).length + 1;
      results.push({ rel, token, num: m[1], unit: m[2], line, snippet: text.replace(/\s+/g, ' ').slice(0, 100) });
    }
  }
}

// 去重（file+token+line）
const seen = new Set();
const uniq = results.filter((r) => {
  const k = `${r.rel}:${r.token}:${r.line}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

// ---------- allowlist ----------
let allowlist = { note: '#149 纪律①：注释数值声明失配豁免表（file + token 粒度，每条必须写 reason）', entries: [] };
if (existsSync(ALLOWLIST_PATH)) {
  try { allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf-8')); } catch { /* 重建 */ }
}
const allowSet = new Set((allowlist.entries || []).map((e) => `${e.file}::${e.token}`));

const active = uniq.filter((r) => !allowSet.has(`${r.rel}::${r.token}`));
const exempted = uniq.filter((r) => allowSet.has(`${r.rel}::${r.token}`));

if (MODE === 'update') {
  const merged = new Map();
  for (const e of allowlist.entries || []) merged.set(`${e.file}::${e.token}`, e);
  for (const r of uniq) merged.set(`${r.rel}::${r.token}`, { file: r.rel, token: r.token, reason: 'PENDING-REVIEW（--update 自动落入，必须人工改写 reason 后再提交）' });
  allowlist.entries = [...merged.values()].sort((a, b) => (a.file + a.token).localeCompare(b.file + b.token));
  writeFileSync(ALLOWLIST_PATH, JSON.stringify(allowlist, null, 2) + '\n');
  console.log(`[check-comment-claims] allowlist 已重建：${allowlist.entries.length} 条（含 PENDING-Review 标记，提交前必须人工复核改写）`);
  process.exit(0);
}

console.log(`[check-comment-claims] 扫描 ${files.length} 个文件：失配候选 ${uniq.length} 处（豁免 ${exempted.length} / 生效 ${active.length}）`);
if (MODE === 'audit') {
  for (const r of exempted) console.log(`  [豁免] ${r.rel}:${r.line} ${r.token} ─ ${r.snippet}`);
}
for (const r of active) console.log(`  [失配] ${r.rel}:${r.line} 「${r.token}」注释声明但代码区无此数值 ─ ${r.snippet}`);
if (MODE === 'gate' && active.length) {
  console.error('');
  console.error(`[check-comment-claims] 门禁失败：${active.length} 处新增失配（#149 纪律①「注释 = 代码」）。`);
  console.error('  处置：或修正注释/代码使之一致；或确认属「叙述性引用」后加入 scripts/comment-claims-allowlist.json 并写明 reason。');
  process.exit(1);
}
if (active.length === 0) console.log('[check-comment-claims] 门禁通过：无新增失配');
