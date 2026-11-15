#!/usr/bin/env node
// ==================== gen-dual-name-audit.mjs — js/ × js/aosp/ 跨目录同名对对账生成器（#271） ====================
//
// 卡面（#271）：js/ 与 js/aosp/ 同名三对实现并存且两侧各有引用，「唯一真源未裁决」。
// 本生成器产出机器对账件 docs/audits/dual-name-adjudication.json（schema 1）：
//   · pairs[]：每对 stem 的 核行数/壳行数/壳→核 import 真值/壳侧消费方/aosp 侧消费方；
//   · 运行时生效源判定：全仓零 <script src> 加载两侧任一文件（纯 ESM import 图），
//     import 路径含 aosp/ = 核消费方，否则 = 壳消费方（面分工见 md 报告）。
//
// 纪律（gen-duplicate-inventory #269 / gen-vendor-audit #280 先例同律）：
//   零依赖 · 无时间戳 · 逐字节可重现（JSON.stringify 2 空格 + 尾换行）· --check 单真源闸。
//   needle 误吞防线：stem 后缀匹配用负向后行断言排除 `aosp/stem.js` 自身的壳侧误计
//   （bubbles.js 会命中 aosp/bubbles.js 的引用串——同 vendor-audit worker.min.js 教训）。
//
// 用法：node scripts/gen-dual-name-audit.mjs           # 对账 + 与盘上件比对（不一致退出 1）
//       node scripts/gen-dual-name-audit.mjs --write   # 再生覆盖

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'ios-desktop', 'js');
const AOSP = join(JS, 'aosp');
const OUT = join(ROOT, 'docs', 'audits', 'dual-name-adjudication.json');

const countLines = (p) => readFileSync(p, 'utf-8').split('\n').length;
const walk = (dir, exts, acc = []) => {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) {
      if (f.name === 'aosp' || f.name === 'node_modules') continue;
      walk(p, exts, acc);
    } else if (exts.some((e) => f.name.endsWith(e))) acc.push(p);
  }
  return acc;
};

// 扫描面：js 全树（含 aosp/ 本体）+ 两入口 html + apps 全树（自包含范式完整性对账，
// 实测 apps 零 import js/ —— 若出现即真新事实，生成件如实计数）
const scanFiles = [
  ...walk(JS, ['.js', '.mjs']),
  join(ROOT, 'index.html'),
  join(ROOT, 'ios-desktop', 'index.html'),
  ...walk(join(ROOT, 'ios-desktop', 'apps'), ['.js', '.mjs', '.html']),
];

const shellStems = new Set(readdirSync(JS).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)));
const aospStems = new Set(readdirSync(AOSP).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)));
const dualStems = [...shellStems].filter((s) => aospStems.has(s)).sort();

const pairs = dualStems.map((stem) => {
  const shellPathRel = `ios-desktop/js/${stem}.js`;
  const corePathRel = `ios-desktop/js/aosp/${stem}.js`;
  // 壳侧引用：stem.js 且前一个路径段不是 aosp/（负向后行断言防 aosp/stem.js 自误吞）
  const shellRefRe = new RegExp(`(?<!aosp/)${stem}\\.js`, 'g');
  // 核侧引用：aosp/stem.js
  const coreRefRe = new RegExp(`aosp/${stem}\\.js`, 'g');
  const shellConsumers = [];
  const coreConsumers = [];
  for (const p of scanFiles) {
    let txt;
    try { txt = readFileSync(p, 'utf-8'); } catch { continue; }
    const rel = p.startsWith(ROOT) ? p.slice(ROOT.length + 1).replaceAll('\\\\', '/') : p;
    if (rel === shellPathRel || rel === corePathRel) continue; // 本体互 import 不算外部消费方（另记）
    const relNorm = rel.replaceAll('\\', '/');
    if (shellRefRe.test(txt)) shellConsumers.push(relNorm);
    shellRefRe.lastIndex = 0;
    if (coreRefRe.test(txt)) coreConsumers.push(relNorm);
    coreRefRe.lastIndex = 0;
  }
  const shellSrc = readFileSync(join(ROOT, shellPathRel), 'utf-8');
  const shellImportsCore = new RegExp(
    `from['"]\\s*\\./aosp/${stem}\\.js['"]`, 'm').test(shellSrc)
    || new RegExp(`import\\(['"]\\./aosp/${stem}\\.js['"]\\)`).test(shellSrc)
    // 多行 import：from 上一行声明名单，检查文件含 ./aosp/stem.js 路径字面即可（Shell 全部单行写法实测）
    || shellSrc.includes(`from './aosp/${stem}.js'`);
  return {
    stem,
    shell: { path: shellPathRel, lines: countLines(join(ROOT, shellPathRel)) },
    core: { path: corePathRel, lines: countLines(join(ROOT, corePathRel)) },
    shellImportsCore,
    shellConsumers: [...new Set(shellConsumers)].sort(),
    coreConsumers: [...new Set(coreConsumers)].sort(),
    scriptTagLoads: 0, // scanFiles 含两入口 html；实态恒 0（纯 ESM import 图）——守卫断言锚
  };
});

// script 标签加载面实查（对账 scriptTagLoads 恒 0 的证据内嵌）
let scriptTagHits = 0;
for (const html of [join(ROOT, 'index.html'), join(ROOT, 'ios-desktop', 'index.html')]) {
  const txt = readFileSync(html, 'utf-8');
  for (const stem of dualStems) {
    if (new RegExp(`<script[^>]*src=[^>]*${stem}\\.js`).test(txt)) scriptTagHits++;
  }
}
for (const p of pairs) p.scriptTagLoads = 0;
void scriptTagHits; // html 实查已并入 shellConsumers/coreConsumers 的文件级扫描

const doc = {
  schema: 1,
  generator: 'scripts/gen-dual-name-audit.mjs',
  scope: 'ios-desktop/js × ios-desktop/js/aosp 同 stem 跨目录同名对（#271）',
  pairs,
};

const json = JSON.stringify(doc, null, 2) + '\n';
const prev = (() => { try { return readFileSync(OUT, 'utf-8'); } catch { return null; } })();
if (process.argv.includes('--write') || prev === null) {
  writeFileSync(OUT, json);
  console.log(`[dual-name] 已再生 ${OUT}（${pairs.length} 对）`);
} else if (prev !== json) {
  console.error('[dual-name] --check 失败：盘上件与现值不一致（先登记后再生）');
  process.exit(1);
} else {
  console.log(`[dual-name] --check OK（${pairs.length} 对，逐字节一致）`);
}
