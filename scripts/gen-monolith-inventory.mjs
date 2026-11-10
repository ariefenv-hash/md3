#!/usr/bin/env node
// gen-monolith-inventory.mjs — #284 巨石文件审计卷生成器（R150 窗 · Job 2933040 · 第 2 定时消息系列）
//
// 职责：
//   ① 对六份手写巨石文件（issue #284 证据表六件，vendor 三巨体 three/cannon-es/phosphor 不在本卡
//      范围——#280 另卡在案）做机械盘点：行数 / 段落 banner / 顶层声明（js）/ 内联脚本块与函数
//      （html）/ 规则块（css），全部内容派生零时间戳，逐字节可重现（check:docs-index 同律单真源）；
//   ② 按「单文件 >3000 行」阈值分档：存量豁免名单（EXEMPT，只出不进防乒乓）→ K-存量曝光；
//      非豁免超阈 → K-违规（增量拦截）。分档规则与数据落库（#291 裁决卷 3ab4b147 先例同律），
//      audit-app-quality K 段接线 + tests 已落（#284 批 1 · v11.05：报告级曝光 + K-违规
//      hardFailures 进位 + 三字段自洽防腐，不入 ITEM_KEYS 九项制）；
//   ③ 输出 docs/audits/monolith-inventory.json；--check 模式重新生成并与盘上文件逐字节比对，
//      不一致 exit 1。
//
// 零依赖（node:fs/node:path only）；无时间戳输出。

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(new URL('..', import.meta.url).pathname);
const OUT = join(ROOT, 'docs/audits/monolith-inventory.json');
const CHECK = process.argv.includes('--check');

const THRESHOLD = 3000;
// 存量豁免名单（#284 审计卷盘点时点 = v11.03/28f5a243 唯一 >3000 手写文件；只出不进：
// 文件缩行不退出豁免，防「拆到 2999 行被拦截」乒乓）
const EXEMPT = [
  'ios-desktop/js/apps/settings.js',
];

// issue #284 证据表六件（v10.72 实测口径；行数随树演进以生成时现值为准）
const MONOLITHS = [
  { path: 'ios-desktop/js/apps/settings.js', kind: 'js' },
  { path: 'ios-desktop/apps/music/index.html', kind: 'html' },
  { path: 'ios-desktop/css/pull-panels.css', kind: 'css' },
  { path: 'ios-desktop/js/app-window.js', kind: 'js' },
  { path: 'ios-desktop/js/quick-settings.js', kind: 'js' },
  { path: 'ios-desktop/js/recent-apps.js', kind: 'js' },
];

function scanJs(lines) {
  const banners = [];
  const topLevel = [];
  const RE_BANNER = /^\/\/\s*=+\s*(.+?)\s*=+\s*$/;
  const RE_FN = /^async\s+function\s+([A-Za-z_$][\w$]*)\s*\(|^function\s+([A-Za-z_$][\w$]*)\s*\(/;
  const RE_CONST = /^const\s+([A-Za-z_$][\w$]*)\s*=/;
  const RE_LET = /^let\s+([A-Za-z_$][\w$]*)\s*=/;
  const RE_CLASS = /^class\s+([A-Za-z_$][\w$]*)/;
  let functions = 0, consts = 0, lets = 0, classes = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const b = line.match(RE_BANNER);
    if (b) { banners.push({ line: i + 1, text: b[1] }); continue; }
    let m = line.match(RE_FN);
    if (m) { topLevel.push({ line: i + 1, kind: 'function', name: m[1] || m[2] }); functions++; continue; }
    m = line.match(RE_CONST);
    if (m) { topLevel.push({ line: i + 1, kind: 'const', name: m[1] }); consts++; continue; }
    m = line.match(RE_LET);
    if (m) { topLevel.push({ line: i + 1, kind: 'let', name: m[1] }); lets++; continue; }
    m = line.match(RE_CLASS);
    if (m) { topLevel.push({ line: i + 1, kind: 'class', name: m[1] }); classes++; }
  }
  return { banners, topLevel, counts: { functions, consts, lets, classes, banners: banners.length } };
}

function scanHtml(lines) {
  const banners = [];
  const scriptBlocks = [];
  let cur = null;
  const RE_BANNER_HTML = /^\s*\/\/\s*=+\s*(.+?)\s*=+\s*$/;
  const RE_FN_ANY = /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/;
  let inlineFnCount = 0;
  const inlineFns = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (cur === null) {
      const open = line.match(/<script\b([^>]*)>/);
      if (open) {
        const attrs = open[1] || '';
        const src = attrs.match(/src="([^"]+)"/);
        const rest = line.slice(line.indexOf(open[0]) + open[0].length);
        if (rest.includes('</script>')) {
          // 单行自闭合 <script src=…></script>：开合同行，不入内联态
          scriptBlocks.push({ openLine: i + 1, closeLine: i + 1, src: src ? src[1] : null, inlineFns: 0 });
        } else {
          cur = { openLine: i + 1, src: src ? src[1] : null, fns: 0 };
        }
      }
    } else {
      const b = line.match(RE_BANNER_HTML);
      if (b) banners.push({ line: i + 1, text: b[1] });
      const fn = line.match(RE_FN_ANY);
      if (fn) { inlineFns.push({ line: i + 1, name: fn[1] }); inlineFnCount++; cur.fns++; }
      if (/<\/script>/.test(line)) {
        scriptBlocks.push({ openLine: cur.openLine, closeLine: i + 1, src: cur.src, inlineFns: cur.fns });
        cur = null;
      }
    }
  }
  const externals = scriptBlocks.filter((s) => s.src).map((s) => s.src);
  return { banners, scriptBlocks, externals, inlineFns,
    counts: { banners: banners.length, scriptBlocks: scriptBlocks.length,
      inlineScriptBlocks: scriptBlocks.filter((s) => !s.src).length,
      externalScripts: externals.length, inlineFunctions: inlineFnCount } };
}

function scanCss(lines) {
  const banners = [];
  let blocks = 0;
  // 兼容单行（…==== */）与跨行开行（…==== 后注释正文续行）两种 banner 形态
  const RE_BANNER_CSS = /^\s*\/\*\s*=+\s*(.+?)\s*=+\s*(?:\*\/)?\s*$/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const b = line.match(RE_BANNER_CSS);
    if (b) banners.push({ line: i + 1, text: b[1] });
    if (/\{\s*$/.test(line)) blocks++;
  }
  return { banners, counts: { banners: banners.length, ruleBlocks: blocks } };
}

function build() {
  const files = [];
  let totalLines = 0, over = 0, violations = 0, exemptHits = 0;
  for (const m of MONOLITHS) {
    const abs = join(ROOT, m.path);
    const content = readFileSync(abs, 'utf8');
    const lines = content.split('\n');
    // 行数口径对齐 wc -l（换行符计数）：文件以换行结尾时去除末尾空元素
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    const linesCount = lines.length;
    const exceeds = linesCount > THRESHOLD;
    const exempt = EXEMPT.includes(m.path);
    let status = 'ok';
    if (exceeds && exempt) { status = 'K-存量曝光'; exemptHits++; over++; }
    else if (exceeds && !exempt) { status = 'K-违规'; violations++; over++; }
    const scan = m.kind === 'js' ? scanJs(lines) : m.kind === 'html' ? scanHtml(lines) : scanCss(lines);
    files.push({ path: m.path, kind: m.kind, lines: linesCount,
      threshold: THRESHOLD, exceeds3000: exceeds, exempt, status, ...scan });
    totalLines += linesCount;
  }
  return {
    generator: 'scripts/gen-monolith-inventory.mjs',
    note: '#284 巨石文件审计卷机械盘点（数据驱动零硬编码簇名；行数/段落/声明以文件现值为准，无时间戳逐字节可重现；vendor 三巨体 three/cannon-es/phosphor 不在范围——#280 另卡）',
    threshold: THRESHOLD,
    exemptRule: '存量豁免只出不进（缩行不退出，防乒乓）；非豁免超阈 = K-违规（audit hardFailures 增量拦截已接线——#284 批 1 v11.05，不入 ITEM_KEYS 九项制、不动 A–I 锚与 v294 J6 负向锚；三字段 exceeds3000/exempt/status 唯一判据输入）',
    files,
    totals: { files: files.length, lines: totalLines, over3000: over, violations, exemptHits },
  };
}

const json = JSON.stringify(build(), null, 2) + '\n';
if (CHECK) {
  if (!existsSync(OUT)) { console.error('[monolith-inventory] --check: 盘上无 ' + relativeShort()); process.exit(1); }
  const disk = readFileSync(OUT, 'utf8');
  if (disk !== json) {
    console.error('[monolith-inventory] --check: 生成件与盘上文件不一致（需 node scripts/gen-monolith-inventory.mjs 再生）');
    process.exit(1);
  }
  console.log('[monolith-inventory] --check OK（逐字节一致）');
} else {
  writeFileSync(OUT, json);
  const d = build();
  console.log('[monolith-inventory] 再生完成：files=%d lines=%d over3000=%d violations=%d exempt=%d',
    d.totals.files, d.totals.lines, d.totals.over3000, d.totals.violations, d.totals.exemptHits);
}

function relativeShort() {
  return 'docs/audits/monolith-inventory.json';
}
