#!/usr/bin/env node
// ==================== gen-hex-audit.mjs — js 内硬编码 hex 色值热点清单生成器（#277） ====================
//
// 卡面（#277）：ios-desktop/js（非 aosp/）中 #rrggbb 字面量 805 处（v10.72 时点基线），
// token 化纪律的旁路洪区。建议①「出 hex 热点清单（按文件计数 top 20），区分设计常量 /
// 画布绘制（可豁免）/ 遗留」——本生成器产出机器清单 docs/audits/hex-inventory.json（schema 1）：
//   · files[]：每文件计数（注释剥离后代码面）+ canvasHint（文件含 canvas 绘制面线索）；
//   · total：Σ文件计数（守恒自检由 tests/v277-hex-audit.test.js 钉扎）；
//   · 卡面基线 805 仅作 baselineRef 信息位（树已滚多版，不作为断言值）。
//
// 纪律（gen-dual-name-audit #271 / gen-duplicate-inventory #269 先例同律）：
//   零依赖 · 无时间戳 · 逐字节可重现 · --check 单真源闸 · 注释态剥离（audit-innerhtml
//   语句级扫描同源思路：块注释/行注释状态机，字符串与模板串保留扫描——hex 常量多在
//   字符串字面量内，剥离字符串反而失真）。
//
// 口径（诚实标注，md 报告同步）：
//   · 计数 = 形如 #RGB/#RGBA/#RRGGBB/#RRGGBBAA 的 token 序列（词边界），不判定色彩语义；
//     `this.#dec` 类私有字段名（3 位全 hex 字符）理论上可能误计——实扫面 js 树无私有字段
//     命中（--write 时 stderr 报告命中数为 0 即证），发生即清单化；
//   · canvasHint 是启发式线索非豁免裁定：文件源码含 `getContext(` / `fillStyle` 即标记，
//     豁免裁定（卡面三分）由 md 报告人工判读。
//
// 用法：node scripts/gen-hex-audit.mjs           # 扫描 + 与盘上件比对（不一致退出 1）
//       node scripts/gen-hex-audit.mjs --write   # 再生覆盖

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'ios-desktop', 'js');
const OUT = join(ROOT, 'docs', 'audits', 'hex-inventory.json');

/** 剥离块注释与行注释（保留字符串/模板串内容——hex 常量多在字符串内） */
function stripComments(src) {
  let out = '';
  let i = 0;
  let state = 'code'; // code | block | line | squote | dquote | template
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (state === 'code') {
      if (c === '/' && n === '*') { state = 'block'; i += 2; continue; }
      if (c === '/' && n === '/') { state = 'line'; i += 2; continue; }
      if (c === "'") { state = 'squote'; out += c; i++; continue; }
      if (c === '"') { state = 'dquote'; out += c; i++; continue; }
      if (c === '`') { state = 'template'; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (state === 'block') {
      if (c === '*' && n === '/') { state = 'code'; i += 2; continue; }
      if (c === '\n') out += '\n'; // 保行号结构
      i++; continue;
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; out += '\n'; }
      i++; continue;
    }
    // 字符串态：保留内容（含换行转义忽略），出串回 code
    const quote = state === 'squote' ? "'" : state === 'dquote' ? '"' : '`';
    if (c === '\\') { out += c + (n ?? ''); i += 2; continue; }
    out += c;
    if (c === quote) state = 'code';
    i++;
  }
  return out;
}

// 卡面口径：js 全树（排除 aosp/ 子目录——AOSP 字面值锚豁免域，#147/#54 口径）
const walk = (dir, acc = []) => {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name === 'aosp' || f.name === 'node_modules') continue;
      walk(p, acc);
    } else if (f.name.endsWith('.js')) acc.push(p);
  }
  return acc;
};

const HEX_RE = /#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])/g;
const CANVAS_RE = /getContext\(|fillStyle/;

const files = [];
let privateFieldSuspects = 0;
for (const p of walk(JS)) {
  const raw = readFileSync(p, 'utf-8');
  const rel = p.slice(ROOT.length + 1).replaceAll('\\', '/');
  const code = stripComments(raw);
  // 私有字段误计监测：/#(?!这里是hex)/——简化为：类体内 # 词后接非色彩语义很难自动判，
  // 只统计 8 位以上或含非常见色长度的命中告警面；实态 0 即证口径干净
  const matches = code.match(HEX_RE) || [];
  if (matches.length === 0) continue;
  privateFieldSuspects += (code.match(/\.#[0-9a-fA-F]{3,8}\b/g) || []).length; // `x.#dec` 形态
  files.push({
    file: rel,
    count: matches.length,
    canvasHint: CANVAS_RE.test(code),
  });
}
files.sort((a, b) => b.count - a.count || (a.file < b.file ? -1 : 1));
const total = files.reduce((s, f) => s + f.count, 0);

const doc = {
  schema: 1,
  generator: 'scripts/gen-hex-audit.mjs',
  scope: 'ios-desktop/js/**（排除 aosp/ 子目录——AOSP 源码字面值锚豁免域）',
  countingRule: '#RGB/#RGBA/#RRGGBB/#RRGGBBAA 词边界 token；注释剥离后代码面（字符串内计入）',
  baselineRef: { issue: 277, baselineTotal: 805, baselineTree: 'v10.72 时点（信息位，不作断言）' },
  privateFieldSuspects,
  total,
  fileCount: files.length,
  canvasHintFiles: files.filter((f) => f.canvasHint).length,
  top20: files.slice(0, 20).map((f) => ({ file: f.file, count: f.count, canvasHint: f.canvasHint })),
  files,
};

const json = JSON.stringify(doc, null, 2) + '\n';
const prev = (() => { try { return readFileSync(OUT, 'utf-8'); } catch { return null; } })();
if (process.argv.includes('--write') || prev === null) {
  writeFileSync(OUT, json);
  console.error(`[hex-audit] 已再生 ${OUT}（total=${total} / files=${files.length} / 私有字段误计=${privateFieldSuspects}）`);
} else if (prev !== json) {
  console.error('[hex-audit] --check 失败：盘上件与现值不一致（先登记后再生）');
  process.exit(1);
} else {
  console.error(`[hex-audit] --check OK（total=${total} / files=${files.length}）`);
}
