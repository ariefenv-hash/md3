#!/usr/bin/env node
// gen-duplicate-inventory.mjs — #269 同内容多副本检测生成器（R156 窗 · v11.19 维持 · 纯 scripts+tests+docs 零滚版）
//
// 职责（#269 处置①「CI 加同 md5 多副本检测（超出 N 份同名同内容文件即警告清单化）」+③「若已有更多此类副本一并清单化」
// 的可执行化——与 gen-vendor-audit.mjs / gen-pm-inventory.mjs 先例同律：零依赖 / 无时间戳 / 逐字节可重现 / --check 闸）：
//   ① 枚举 ios-desktop/{apps,js,css} 三根全文件（.js/.mjs/.css/.html；_shared/vendor 与 dist/node_modules 排除
//      ——第三方与构建产物不属单文件自包含范式管辖面）；
//   ② sha256 内容分组，≥2 副本成组（minBytes 200 噪声下限：占位壳/空文件不计）；
//   ③ 生成 docs/audits/duplicate-inventory.json（--write）；默认 check 模式重生成并逐字节比对，
//      不一致 exit 1（生成件单真源禁手改——check:version / audit-docs-index 同律）。
//   ④ 增量拦截语义：新增同内容组 = tests/v269-duplicates.test.js B1 组清单守恒锚红——
//      先在 #269 登记、扩 KNOWN_GROUPS 白名单、随卷再生生成件后放行（#272 F2 终态值锚演进先例同律）。

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOTS = ['ios-desktop/apps', 'ios-desktop/js', 'ios-desktop/css'];
const EXT = new Set(['.js', '.mjs', '.css', '.html']);
const MIN_BYTES = 200;
const SKIP_DIRS = new Set(['node_modules', 'dist']);
const SKIP_SUBSTR = ['_shared/vendor'];

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(p, out);
    } else if (EXT.has(name.slice(name.lastIndexOf('.'))) && st.size >= MIN_BYTES && !SKIP_SUBSTR.some((s) => p.includes(s))) {
      out.push(p);
    }
  }
  return out;
}

const files = [];
for (const r of SCAN_ROOTS) walk(join(ROOT, r), files);
const map = new Map();
for (const p of files) {
  const data = readFileSync(p);
  const h = createHash('sha256').update(data).digest('hex');
  if (!map.has(h)) map.set(h, []);
  map.get(h).push({ path: p.slice(ROOT.length + 1).split(sep).join('/'), bytes: data.length });
}
const groups = [...map.entries()]
  .filter(([, fs]) => fs.length > 1)
  .map(([h, fs]) => ({ hash: h, bytes: fs[0].bytes, count: fs.length, files: fs.map((f) => f.path).sort() }))
  .sort((a, b) => b.count - a.count || (a.files[0] < b.files[0] ? -1 : 1));
const inv = {
  schema: 1,
  scan: { roots: SCAN_ROOTS, ext: [...EXT], minBytes: MIN_BYTES, skip: { dirs: [...SKIP_DIRS], substr: SKIP_SUBSTR } },
  totalFiles: files.length,
  groups,
};
const out = JSON.stringify(inv, null, 2) + '\n';
const TARGET = join(ROOT, 'docs/audits/duplicate-inventory.json');
if (process.argv.includes('--write')) {
  writeFileSync(TARGET, out);
  console.log(`[dup-inventory] --write OK：scanned ${files.length} / groups ${groups.length} / 组员 ${groups.reduce((s, g) => s + g.count, 0)}`);
} else {
  let cur = '';
  try { cur = readFileSync(TARGET, 'utf-8'); } catch { console.error('[dup-inventory] --check FAIL：生成件不存在（先 --write）'); process.exit(1); }
  if (cur !== out) {
    console.error('[dup-inventory] --check FAIL：与登记件不一致（生成件单真源禁手改，随树再生）');
    process.exit(1);
  }
  console.log(`[dup-inventory] --check OK（逐字节一致）：scanned ${files.length} / groups ${groups.length}`);
}
