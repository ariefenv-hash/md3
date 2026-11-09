#!/usr/bin/env node
// ==================== missing-refs-triage.mjs — missing 旧式路径引用三态分诊器（#316 · #291 余量批） ====================
//
// #291 改名机械批（v11.02=70fb9c3）诚实边界②：26 家 missing 旧式路径引用多为活断言
// （toContain("from './…')") 源码锚）与注释位混处，留后续独立批三态分诊（评论位/断言位/守卫位）——本卡即该批。
//
// 分诊五态（三态主轴 + 两类如实登记扩展，判据逐行取证）：
//   assertion 断言位 —— 候选行含 expect( （toContain 源码锚 / not.toContain 负向防循环锚 /
//                       appFromSrc 纯解析入参 / sanitize fixture）→ 不动（活断言守锚，改即破坏锚语义）
//   guard     守卫位 —— 候选行含 existsSync/accessSync（vendor 禁入 / 旧户口清退的负向存在性守卫，
//                       语义即「不得存在」）→ 不动
//   input     输入位 —— 引用处于字符串字面量但非断言行（VFS fixture / 图遍历入参 /
//                       indexOf 切片锚 / 模块 import 行）→ 不动（数据面非路径面）
//   comment   评论位 —— 唯一候选行为注释（历史实证记录，如 error-hub /ios-desktop/sw.js 404 案）
//                       → 保留（规范化仅限文档卫生头注，不改 missing 账面）
//   artifact  伪影位 —— 全部候选行中引用后紧随文字字符（生成器扩展名交替无词边界：
//                       `.mdapp` 截成 `.md`、`.md/.json` 截成 `.md/.js`；真实完整路径现存）→ 登记保留
//
// 跨候选行优先级：artifact(全部候选截断) > guard(任一) > assertion(任一) > input(任一) > comment(兜底)——
// 守卫位最具体（存在性语义唯一）；断言位次之（#291 边界②「多为活断言」实录）；评论位仅当全部候选皆注释。
//
// 抽取逻辑与 scripts/gen-test-prefix-inventory.mjs v2 三族正则逐字镜像（本文件不改 #291 交付面，
// 镜像一致性由 tests/missing-refs-triage.test.js 对账锚保证：镜像抽取全量 missing ≡ inventory
// evidence.missing 截断账 slice(0,3)）。零依赖零 DOM 零副作用（消费方 = 本 CLI --write + 测试锚组）。

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TRIAGE_SCHEMA = 1;
export const STATES = ['assertion', 'guard', 'input', 'comment', 'artifact'];

const DISPOSITION = {
  assertion: 'keep（活断言源码锚/纯函数入参·守锚不动——#291 边界②，改即破坏锚语义）',
  guard: 'keep（负向存在性守卫·vendor 禁入/旧户口清退纪律——语义即不得存在）',
  input: 'keep（字符串字面量锚/VFS fixture/图遍历入参·数据面非路径面）',
  comment: 'keep（历史实证注释·规范化仅限文档卫生头注不改账面）',
  artifact: 'keep（生成器扩展名交替无词边界截断伪影——真实完整路径现存）',
};

// —— 抽取镜像（逐字对齐 gen-test-prefix-inventory.mjs contentProbe 三族） ——
const F1 = /(?:ios-desktop|docs|scripts)\/[\w./-]+\.(?:js|mjs|html|css|json|webmanifest|md)/g;
const F2 = /from\s+['"](\.\.[\w./-]+)['"]/g;
const F3 = /(?:join|resolve)\(\s*(?:here|ROOT|dirname\([^)]*\)|fileURLToPath\([^)]*\))\s*,\s*['"]([^'"]+)['"]/g;

export function extractMissingRefs(src) {
  const missing = [];
  const seen = new Set();
  const probe = (p) => {
    if (seen.has(p)) return;
    seen.add(p);
    if (existsSync(join(REPO_ROOT, p))) return;
    const variants = [p.replace(/\.js$/, '.mjs'), p.replace(/\.js$/, '.json'), 'ios-desktop/' + p, p.replace(/\.js$/, '.mjs').replace(/^/, 'ios-desktop/')];
    if (variants.some((v) => existsSync(join(REPO_ROOT, v)))) return;
    missing.push(p);
  };
  for (const m of src.matchAll(F1)) probe(m[0]);
  for (const m of src.matchAll(F2)) {
    let p = m[1].replace(/^\.\.\//, '');
    if (p.startsWith('js/') || p.startsWith('css/') || p.startsWith('apps/')) p = 'ios-desktop/' + p;
    probe(p);
  }
  for (const m of src.matchAll(F3)) {
    let p = m[1];
    if (!p.includes('/') || p.startsWith('./')) continue;
    p = p.replace(/^\.\.\//, '');
    if (p.startsWith('js/') || p.startsWith('css/') || p.startsWith('apps/') || p.startsWith('assets/')) p = 'ios-desktop/' + p;
    probe(p);
  }
  return missing;
}

// —— 单行判定 ——
export function classifyLine(line, ref) {
  const t = line.trim();
  if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) return 'comment';
  if (/existsSync|accessSync/.test(line)) return 'guard';
  if (/\bexpect\s*\(/.test(line)) return 'assertion';
  if (new RegExp(`['"][^'"]*${escapeRe(ref)}`).test(line)) return 'input';
  return 'input';
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 截断伪影：行内引用后紧随文字字符（\w）→ 抽取 token 只是更长真实路径的前缀
function truncatedAt(line, ref) {
  let i = line.indexOf(ref);
  while (i >= 0) {
    const after = line[i + ref.length];
    if (after !== undefined && /\w/.test(after)) return true;
    i = line.indexOf(ref, i + 1);
  }
  return false;
}

/**
 * 单文件分诊：对每条 missing 引用定位全部候选行 → 跨候选优先级定态。
 * @returns [{ref, state, disposition, evidence:[{lineNo, line, state}]}]
 */
export function triageFile(src, refs) {
  const lines = src.split('\n');
  const entries = [];
  for (const ref of refs) {
    const evidence = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(ref)) {
        evidence.push({ lineNo: i + 1, line: lines[i].slice(0, 200), state: classifyLine(lines[i], ref) });
      }
    }
    if (evidence.length === 0) {
      entries.push({ ref, state: 'artifact', disposition: DISPOSITION.artifact, evidence: [], note: '无候选行（跨行拼接 token）' });
      continue;
    }
    const allTruncated = evidence.every((e) => truncatedAt(e.line, ref));
    let state;
    if (allTruncated) state = 'artifact';
    else if (evidence.some((e) => e.state === 'guard')) state = 'guard';
    else if (evidence.some((e) => e.state === 'assertion')) state = 'assertion';
    else if (evidence.some((e) => e.state === 'input')) state = 'input';
    else state = 'comment';
    const entry = { ref, state, disposition: DISPOSITION[state], evidence };
    if (state === 'guard') entry.note = /toBe\(\s*false\s*\)/.test(lines[evidence.find((e) => e.state === 'guard').lineNo - 1]) ? '负向守卫（toBe(false) 实证）' : '存在性守卫';
    entries.push(entry);
  }
  return entries;
}

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 全量分诊：读 tests/ 全文件 + inventory missing 账（含截断恢复），产出 entries+stats */
export function buildTriage({ testsDir, inventoryFiles }) {
  const files = readdirSync(testsDir).filter((f) => f.endsWith('.test.js')).sort();
  const entries = [];
  const perFile = [];
  for (const f of files) {
    const src = readFileSync(join(testsDir, f), 'utf8');
    const missing = extractMissingRefs(src);
    if (missing.length === 0) continue;
    const tri = triageFile(src, missing);
    perFile.push({ file: f, refs: missing.length });
    for (const e of tri) entries.push({ file: f, ...e });
  }
  const stats = { files: perFile.length, refs: entries.length };
  for (const s of STATES) stats[s] = entries.filter((e) => e.state === s).length;
  // inventory 对账：镜像抽取全量 missing 的前 3 条 ≡ inventory evidence.missing（截断账）
  const invMap = new Map(inventoryFiles.map((r) => [r.file, r.evidence && r.evidence.missing ? r.evidence.missing : []]));
  const mismatch = [];
  for (const pf of perFile) {
    const full = entries.filter((e) => e.file === pf.file).map((e) => e.ref);
    const inv = invMap.get(pf.file);
    if (!inv || JSON.stringify(inv) !== JSON.stringify(full.slice(0, 3))) {
      mismatch.push({ file: pf.file, inventory: inv || null, mirror: full.slice(0, 3) });
    }
  }
  for (const [f, inv] of invMap) {
    if (inv.length && !perFile.some((p) => p.file === f)) mismatch.push({ file: f, inventory: inv, mirror: [] });
  }
  return { entries, stats, perFile, mismatch };
}

// —— CLI ——
const IS_MAIN = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (IS_MAIN) {
  const inventory = JSON.parse(readFileSync(join(REPO_ROOT, 'docs/audits/test-prefix-inventory.json'), 'utf8'));
  const result = buildTriage({ testsDir: join(REPO_ROOT, 'tests'), inventoryFiles: inventory.files });
  const out = {
    schema: TRIAGE_SCHEMA,
    generated: new Date().toISOString(),
    method: '三态分诊（#316·#291 余量批）：抽取逻辑镜像 gen-test-prefix-inventory.mjs v2 三族正则；五态=断言位/守卫位/评论位（主轴）+输入位/伪影位（如实登记扩展）；跨候选优先级 artifact>guard>assertion>input>comment；处置全量 keep（守锚/守卫/数据面/伪影/历史实证）——评论位规范化仅限文档卫生头注不改账面。',
    stats: result.stats,
    perFile: result.perFile,
    inventoryParity: { mismatchCount: result.mismatch.length, mismatch: result.mismatch },
    entries: result.entries,
  };
  if (process.argv.includes('--write')) {
    writeFileSync(join(REPO_ROOT, 'docs/audits/missing-refs-triage.json'), JSON.stringify(out, null, 2) + '\n');
    console.log('WROTE docs/audits/missing-refs-triage.json');
  }
  console.log('STATS', JSON.stringify(result.stats));
  console.log('INVENTORY_PARITY mismatch:', result.mismatch.length);
  for (const m of result.mismatch.slice(0, 5)) console.log('  MISMATCH', m.file, JSON.stringify(m.inventory), 'vs', JSON.stringify(m.mirror));
  process.exitCode = result.mismatch.length ? 1 : 0;
}
