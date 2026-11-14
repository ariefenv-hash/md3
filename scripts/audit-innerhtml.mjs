#!/usr/bin/env node
// ==================== audit-innerhtml.mjs — #274 一期：innerHTML 数据来源分级审计 ====================
//
// 扫描面：ios-desktop/js + ios-desktop/apps（除 vendor/）所有 `.innerHTML =` / `.innerHTML +=`
// 赋值语句；语句级提取（括号/字符串/模板串深度平衡扫描），三档分类：
//   A = 零插值静态（模板串无 ${} 且拼接全是字面量）→ 内部常量
//   B = 有插值/动态 RHS 且语句内含 escape 助手（escapeHtml / __mdEscape / sanitizeHtml）
//   C = 有插值/动态 RHS 未见 escape → 待人工定性面（二期清退输入）
// 数据来源启发词表（标识符小写精确 token 匹配）：用户输入 / 文件系统 / 网络 / 内部。
// 生成件：docs/innerhtml-inventory.md（默认 check 模式逐字节比对，--write 再生——生成件随树再生纪律）。
// 纯逻辑纪律：extractStatement / classifyStatement 为纯函数，tests/innerhtml-inventory.test.js 单测覆盖。
// 本脚本零运行时消费方（不入 dist），属审计取证工具。

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** escape 助手词表（语句内子串命中即视为 B 档） */
export const ESCAPE_HELPERS = ['escapeHtml(', '__mdEscape(', 'sanitizeHtml('];

/** 数据来源启发词表（标识符按 -/_/大小写边界拆 token 后精确匹配） */
export const SOURCE_WORDS = {
  用户输入: ['msg', 'message', 'text', 'title', 'name', 'content', 'input', 'value', 'query',
    'search', 'clipboard', 'note', 'comment', 'label', 'prompt', 'body', 'cmd', 'command',
    'desc', 'summary', 'subject', 'detail', 'username', 'nickname', 'reply', 'chat'],
  网络: ['url', 'href', 'uri', 'link', 'http', 'fetch', 'remote', 'api', 'feed', 'net', 'rss'],
  文件系统: ['file', 'path', 'dir', 'entry', 'blob', 'storage', 'folder', 'archive', 'zip', 'filename'],
};
/** 静态判定时忽略的语言关键字/字面量词 */
const KEYWORDS = new Set(['true', 'false', 'null', 'undefined', 'typeof', 'new', 'return', 'if',
  'else', 'const', 'let', 'var', 'function', 'for', 'of', 'in', 'and', 'or', 'not', 'this',
  'window', 'document', 'Math', 'String', 'Number', 'Boolean', 'Array', 'Object', 'JSON',
  'Date', 'encodeURIComponent', 'decodeURIComponent', 'parseInt', 'parseFloat', 'String']);

const SCAN_ROOTS = ['ios-desktop/js', 'ios-desktop/apps'];
const OUT_PATH = 'docs/innerhtml-inventory.md';

// ---------------- 语句级提取（括号/字符串/模板串平衡扫描） ----------------

/**
 * 从 src 的 startIdx 起提取一条完整语句（至顶层 '; '）。
 * 追踪 ()/[]/{} 深度、' " ` 字符串态、模板串 ${} 嵌套、行/块注释。
 * @returns {{text: string, endIdx: number}} text 含起始到分号的完整语句
 */
export function extractStatement(src, startIdx, maxLen = 40000) {
  const n = Math.min(src.length, startIdx + maxLen);
  let paren = 0, bracket = 0, brace = 0;
  let quote = null;            // 当前字符串态：' " `
  let tplStack = [];           // 模板串内 ${ } 嵌套栈（每层记录 brace 深度基线）
  let i = startIdx;
  for (; i < n; i++) {
    const c = src[i], d = src[i + 1];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (quote === '`') {
        if (c === '`') { quote = null; continue; }
        if (c === '$' && d === '{') { tplStack.push(brace); brace++; i++; quote = null; continue; }
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '(') paren++;
    else if (c === ')') paren--;
    else if (c === '[') bracket++;
    else if (c === ']') bracket--;
    else if (c === '{') brace++;
    else if (c === '}') {
      if (tplStack.length && brace === tplStack[tplStack.length - 1] + 1) { brace--; quote = '`'; tplStack.pop(); continue; }
      brace--;
    } else if (c === ';' && paren <= 0 && bracket <= 0 && brace <= 0 && tplStack.length === 0) {
      return { text: src.slice(startIdx, i + 1), endIdx: i + 1 };
    }
  }
  return { text: src.slice(startIdx, n), endIdx: n };
}

// ---------------- 分类 ----------------

/** 拆标识符 token（驼峰/下划线/连字符边界） */
function idTokens(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(t => t.toLowerCase());
}

/**
 * 三档分类。
 * @param {string} stmt 完整赋值语句（含分号）
 * @returns {{tier:'A'|'B'|'C', source:string, hits:string[], dynamic:boolean}}
 */
export function classifyStatement(stmt) {
  // 1) 抽出字符串字面量内容与代码部分
  const codeParts = [];
  const strParts = [];
  let buf = '';
  let q = null, tpl = 0;
  for (let i = 0; i < stmt.length; i++) {
    const c = stmt[i], d = stmt[i + 1];
    if (q) {
      if (c === '\\') { buf += d ?? ''; i++; continue; }
      if (q === '`') {
        if (c === '`') { strParts.push({ q, s: buf }); buf = ''; q = null; continue; }
        if (c === '$' && d === '{') { strParts.push({ q, s: buf, interp: true }); buf = ''; q = null; tpl++; codeParts.push('$'); continue; }
        buf += c; continue;
      }
      if (c === q) { strParts.push({ q, s: buf }); buf = ''; q = null; continue; }
      buf += c; continue;
    }
    if (c === '/' && d === '/') { while (i < stmt.length && stmt[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < stmt.length && !(stmt[i] === '*' && stmt[i + 1] === '/')) i++; continue; }
    if (c === "'" || c === '"') { q = c; continue; }
    if (c === '`') { q = c; continue; }
    if (c === '}' && tpl > 0) { tpl--; codeParts.push(buf); buf = ''; q = '`'; continue; }
    buf += c;
  }
  if (buf) (q ? strParts.push({ q, s: buf }) : codeParts.push(buf));

  const code = codeParts.join(' ');
  const hasInterp = strParts.some(p => p.interp);
  const escapeHit = ESCAPE_HELPERS.filter(h => stmt.includes(h));

  // 2) 代码部分标识符 → 动态判定
  const idents = [];
  for (const m of code.matchAll(/[A-Za-z_$][\w$]*/g)) {
    const t = m[0];
    if (t === '$') continue;
    if (KEYWORDS.has(t)) continue;
    if (ESCAPE_HELPERS.some(h => h.startsWith(t))) continue; // escape 助手名不算动态源
    idents.push(t);
  }
  const dynamic = hasInterp || idents.length > 0;

  // 3) 档
  let tier = 'A';
  if (dynamic) tier = escapeHit.length > 0 ? 'B' : 'C';

  // 4) 数据来源（动态面才标注；词表 token 精确匹配）
  const sourceTokens = new Set();
  for (const p of strParts) if (p.interp) for (const t of idTokens(p.s)) sourceTokens.add(t);
  for (const t of idTokens(code)) sourceTokens.add(t);
  const hits = [];
  let source = '内部';
  for (const cat of ['用户输入', '网络', '文件系统']) {
    const hit = [...sourceTokens].filter(t => SOURCE_WORDS[cat].includes(t));
    if (hit.length) { source = cat; hits.push(...hit.slice(0, 6)); break; }
  }
  if (tier === 'A') { source = '内部常量'; hits.length = 0; }
  return { tier, source, hits: [...new Set(hits)].sort(), dynamic };
}

// ---------------- 扫描 ----------------

function listJsFiles(absDir) {
  const out = [];
  if (!existsSync(absDir)) return out;
  for (const name of readdirSync(absDir, { withFileTypes: true })) {
    const p = join(absDir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'vendor' || name.name === 'node_modules') continue;
      out.push(...listJsFiles(p));
    } else if (name.name.endsWith('.js')) out.push(p);
  }
  return out.sort();
}

export function scanRepo(rootDir = ROOT) {
  const entries = [];
  let escapeCallSites = 0;
  for (const rel of SCAN_ROOTS) {
    for (const abs of listJsFiles(join(rootDir, rel))) {
      const src = readFileSync(abs, 'utf8');
      for (const _m of src.matchAll(/(escapeHtml|__mdEscape|sanitizeHtml)\s*\(/g)) escapeCallSites++;
      const re = /\.innerHTML\s*\+?=/g;
      let m;
      while ((m = re.exec(src))) {
        const line = src.slice(0, m.index).split('\n').length;
        const { text } = extractStatement(src, m.index);
        const cls = classifyStatement(text);
        entries.push({
          file: relative(join(rootDir, 'ios-desktop'), abs).split(sep).join('/'),
          line, tier: cls.tier, source: cls.source, hits: cls.hits,
          snippet: text.replace(/\s+/g, ' ').slice(0, 96),
        });
        re.lastIndex = m.index + text.length;
      }
    }
  }
  entries.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : a.line - b.line);
  return { entries, escapeCallSites };
}

// ---------------- 报告渲染（确定性：零时间戳零随机） ----------------

const mdCell = (s) => s.replace(/\|/g, '\\|').replace(/`/g, "'");

export function renderReport(entries, version, escapeCallSites = 0) {
  const total = entries.length;
  const cnt = { A: 0, B: 0, C: 0 };
  for (const e of entries) cnt[e.tier]++;

  const byFile = new Map();
  for (const e of entries) {
    if (!byFile.has(e.file)) byFile.set(e.file, { A: 0, B: 0, C: 0 });
    byFile.get(e.file)[e.tier]++;
  }

  const L = [];
  L.push('# innerHTML 数据来源分级清单（#274 一期 · 生成件）');
  L.push('');
  L.push('> **生成器**：`scripts/audit-innerhtml.mjs`（默认 check 模式逐字节比对，`--write` 再生——生成件随树再生纪律）。');
  L.push('> **扫描面**：`ios-desktop/js` + `ios-desktop/apps`（除 vendor/）`.innerHTML =` 与 `.innerHTML +=` 赋值语句；语句级提取（括号/字符串/模板串平衡）。');
  L.push('> **三档口径**：A 零插值静态（内部常量）· B 有插值/动态 RHS 且语句内含 escape 助手（`escapeHtml` / `__mdEscape` / `sanitizeHtml`）· C 有插值/动态 RHS 未见 escape（**待人工定性面，非确认漏洞**）。');
  L.push('> **数据来源**：标识符启发词表（用户输入/网络/文件系统/内部），token 精确匹配，仅作二期排查引导；`内部` = 词表零命中。');
  L.push(`> **快照**：package.json ${version} · 总数 ${total} = A ${cnt.A} + B ${cnt.B} + C ${cnt.C}（守恒由 tests/innerhtml-inventory.test.js 守护）。`);
  L.push(`> **escape 上下文**：全扫描面 escape 助手调用共 ${escapeCallSites} 处，多数在 builder 函数内预转义后返回成品片段——B 档只统计 innerHTML 语句内**直接可见**的 escape，故 B 计数 ≠ 「全库仅 B 处已转义」；C 档里的 builder 调用（\`xxxHtml(...)\` 形态）需进函数体定性，属二期逐条工作。`);
  L.push('');
  L.push('## 一、三档总览');
  L.push('');
  L.push('| 档 | 含义 | 处数 | 占比 |');
  L.push('|---|---|---|---|');
  const pct = (n) => total ? (n / total * 100).toFixed(1) + '%' : '0%';
  L.push(`| A | 零插值静态 | ${cnt.A} | ${pct(cnt.A)} |`);
  L.push(`| B | 插值含 escape | ${cnt.B} | ${pct(cnt.B)} |`);
  L.push(`| C | 插值未见 escape（待人工定性） | ${cnt.C} | ${pct(cnt.C)} |`);
  L.push(`| 合计 | | ${total} | 100% |`);
  L.push('');
  L.push('## 二、按文件 × 档汇总');
  L.push('');
  L.push('| 文件 | A | B | C | 合计 |');
  L.push('|---|---|---|---|---|');
  for (const [f, c] of byFile) {
    L.push(`| ${mdCell(f)} | ${c.A} | ${c.B} | ${c.C} | ${c.A + c.B + c.C} |`);
  }
  L.push('');
  L.push(`## 三、档 C 全量明细（${cnt.C} 处 · 二期清退输入：改 textContent / 补 escape / 显式豁免理由）`);
  L.push('');
  L.push('| 路径:行 | 数据来源 | 命中标识符 | 语句摘要 |');
  L.push('|---|---|---|---|');
  for (const e of entries.filter(e => e.tier === 'C')) {
    L.push(`| ${mdCell(e.file)}:${e.line} | ${e.source} | ${e.hits.join(' ') || '—'} | ${mdCell(e.snippet)} |`);
  }
  L.push('');
  L.push(`## 四、档 B 全量明细（${cnt.B} 处 · 已见 escape，核对 escape 是否覆盖全部插值点）`);
  L.push('');
  L.push('| 路径:行 | 数据来源 | 语句摘要 |');
  L.push('|---|---|---|');
  for (const e of entries.filter(e => e.tier === 'B')) {
    L.push(`| ${mdCell(e.file)}:${e.line} | ${e.source} | ${mdCell(e.snippet)} |`);
  }
  L.push('');
  L.push(`## 五、档 A 按文件行号聚合（${cnt.A} 处 · 零插值静态，低风险）`);
  L.push('');
  for (const [f, c] of byFile) {
    const lines = entries.filter(e => e.file === f && e.tier === 'A').map(e => e.line);
    if (!lines.length) continue;
    L.push(`- ${mdCell(f)}（${lines.length}）：${lines.join(', ')}`);
  }
  L.push('');
  L.push('## 六、二期口径备忘（#274 处置建议 ②③④ 不在本件）');
  L.push('');
  L.push('- **② 清退**：以档 C 明细为输入逐条定性——用户输入可达点改 `textContent` / 补 escape，或写明「内部受控数据」显式豁免理由；');
  L.push('- **③ CSP 试点**：高风险面集中后评估 report-only CSP 范围（配套议题）；');
  L.push('- **④ 契约**：「新增 innerHTML 需注释标注数据来源」纳入 check:comments（配套议题）。');
  return L.join('\n') + '\n';
}

// ---------------- main ----------------

async function main() {
  const write = process.argv.includes('--write');
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const { entries, escapeCallSites } = scanRepo(ROOT);
  const md = renderReport(entries, pkg.version, escapeCallSites);
  const outAbs = join(ROOT, OUT_PATH);
  if (write) {
    writeFileSync(outAbs, md);
    const cnt = { A: 0, B: 0, C: 0 };
    for (const e of entries) cnt[e.tier]++;
    console.log(`[innerHTML] 已生成 ${OUT_PATH}（总 ${entries.length} = A ${cnt.A} / B ${cnt.B} / C ${cnt.C}）`);
  } else {
    const same = existsSync(outAbs) && readFileSync(outAbs, 'utf8') === md;
    console.log(same
      ? `[innerHTML] PASS：${OUT_PATH} 与实树一致（${entries.length} 处）`
      : `[innerHTML] FAIL：${OUT_PATH} 与实树漂移——请 node scripts/audit-innerhtml.mjs --write 随树再生`);
    process.exitCode = same ? 0 : 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
