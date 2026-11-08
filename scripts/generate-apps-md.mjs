#!/usr/bin/env node
// generate-apps-md.mjs — #285 APPS.md 内置应用清单单真源生成器
//
// 职责（#285 主诉「52 定义/41 iframe 的用途只活在行内注释里——APPS.md 生成+对账缺位」）：
//   ① 解析 ios-desktop/js/apps-data.js import 行 → 应用清单（定义数 / #296 用途尾注「用途：」切分随行）；
//   ② 逐定义文件提取 id / name / iframe 目录（iframeAppContent('apps/<dir>/index.html')），
//      无 iframe 目录的应用如实标 native（不硬归 41 家，#286 parseDefFile 同口径）；
//   ③ iframe 实体实数 = ios-desktop/apps/ 下含 index.html 的目录数（#267 同口径）；
//   ④ 输出 docs/APPS.md（生成件单真源禁手改，check:docs-index / check:version 同律；
//      无时间戳，逐字节可重现）；
//   ⑤ 对账锚：汇总表 52/41/11 与 README 计数对账（check-readme-counts.mjs #267）同源，
//      用途尾注覆盖率 52/52 与 #296 注释契约联动固化——缺位即红，绝不编造。
//
// 范式先例：#295 audit-docs-index.mjs（默认校验 / --write 生成 · 逐字节比对）+
//           #286 test-coverage-matrix.mjs（apps-data.js 解析 · 生成件双守护锚）。
//
// 用法：node scripts/generate-apps-md.mjs            # 校验（默认）：重新生成并与盘上逐字节比对（不一致 exit 1）
//       node scripts/generate-apps-md.mjs --write    # 生成/再生 docs/APPS.md 并入库

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = join(new URL('..', import.meta.url).pathname);
const SRC = join(ROOT, 'ios-desktop');
const OUT_PATH = join(ROOT, 'docs', 'APPS.md');

// ---------- ① apps-data.js import 行解析（#286 parseAppData 同款正则） ----------
export function parseAppsData(repoRoot = ROOT) {
  const text = readFileSync(join(repoRoot, 'ios-desktop', 'js', 'apps-data.js'), 'utf8');
  const apps = [];
  const re = /^import\s+(\w+)\s+from\s+'\.\/apps\/([^']+)\.js';[ \t]*\/\/[ \t]*(.*)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    apps.push({ varName: m[1], defFile: `js/apps/${m[2]}.js`, comment: m[3].trim() });
  }
  return apps;
}

// ---------- #296 用途尾注提取（「｜用途：」或行首「用途：」切分；缺位如实返回 ''） ----------
export function extractPurpose(comment) {
  const seg = comment.split('｜').find((p) => p.trim().startsWith('用途：'));
  return seg ? seg.trim().slice(3).trim() : '';
}

// ---------- ② 定义文件 → id / name / iframe 目录（#286 parseDefFile 同款） ----------
export function parseDefFile(repoRoot, rel) {
  const text = readFileSync(join(repoRoot, 'ios-desktop', rel), 'utf8');
  const id = (text.match(/^ {2}id:\s*'([^']+)'/m) || [])[1] || '';
  const name = (text.match(/^ {2}name:\s*'([^']+)'/m) || [])[1] || '';
  const dir = (text.match(/iframeAppContent\('apps\/([^/]+)\/index\.html'\)/) || [])[1] || null;
  return { id, name, dir };
}

// ---------- ③ iframe 实体实数（#267 countIframeApps 同口径） ----------
export function collectIframeDirs(repoRoot = ROOT) {
  const dir = join(repoRoot, 'ios-desktop', 'apps');
  return readdirSync(dir).filter((d) => {
    const full = join(dir, d);
    return statSync(full).isDirectory() && existsSync(join(full, 'index.html'));
  }).sort();
}

// ---------- ④ 生成 docs/APPS.md（无时间戳 · 确定性 · md 表格逐字节可重现） ----------
export function buildAppsMd(repoRoot = ROOT) {
  const apps = parseAppsData(repoRoot);
  const rows = apps.map((a, i) => {
    const def = parseDefFile(repoRoot, a.defFile);
    const purpose = extractPurpose(a.comment);
    const entity = def.dir ? `apps/${def.dir}/` : 'native';
    return { seq: i + 1, id: def.id, name: def.name, defFile: a.defFile, entity, purpose };
  });
  const iframeDirs = collectIframeDirs(repoRoot);
  const iframeCount = iframeDirs.length;
  const nativeCount = rows.filter((r) => r.entity === 'native').length;
  const purposeCovered = rows.filter((r) => r.purpose !== '').length;
  const esc = (s) => s.replace(/\|/g, '\\|'); // md 表格防御性转义（现库零半角 |，实证 2026-11-09）

  const lines = [];
  lines.push('# APPS.md — 内置应用清单（#285 · 生成件）');
  lines.push('');
  lines.push('> 本文件由 `scripts/generate-apps-md.mjs` 生成，`npm run check:apps-md` 逐字节校验一致性——**禁手改**；');
  lines.push('> 数据真源 = `ios-desktop/js/apps-data.js` import 行 + #296 用途尾注（「用途：」切分）+');
  lines.push('> 定义文件 `id`/`name`/`iframeAppContent` 实扫 + `ios-desktop/apps/` 目录实数（#267 同口径）；');
  lines.push('> 无时间戳，逐字节可重现。用途文案修订须改 apps-data.js 行尾注后 `npm run check:apps-md -- --write` 再生。');
  lines.push('');
  lines.push('## 汇总（与 #267 README 计数对账同源）');
  lines.push('');
  lines.push('| 指标 | 值 |');
  lines.push('|---|---|');
  lines.push(`| 应用定义（apps-data.js import 行） | ${rows.length} |`);
  lines.push(`| iframe 应用（apps/ 含 index.html 目录） | ${iframeCount} |`);
  lines.push(`| native 应用（无 iframe 实体） | ${nativeCount} |`);
  lines.push(`| 用途尾注覆盖（#296 注释契约联动水位） | ${purposeCovered}/${rows.length} |`);
  lines.push('');
  lines.push(`## 清单（apps-data.js import 行序 · ${rows.length} 应用）`);
  lines.push('');
  lines.push('| # | id | 名称 | 定义文件 | 实体 | 用途（#296 尾注原文） |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of rows) {
    lines.push(`| ${r.seq} | ${esc(r.id)} | ${esc(r.name)} | ${r.defFile} | ${r.entity} | ${esc(r.purpose)} |`);
  }
  lines.push('');
  lines.push(`> 对账：定义 ${rows.length} = README 计数门（check-readme-counts.mjs #267）；iframe ${iframeCount} = apps/ 目录实数；`);
  lines.push(`> native ${nativeCount} = ${rows.length} − ${iframeCount}（无 iframeAppContent 的定义如实登记）；`);
  lines.push(`> 用途 ${purposeCovered}/${rows.length} 全覆盖为 #296 注释契约联动水位——新增应用未写用途尾注即红（绝不编造）。`);
  lines.push('');
  return lines.join('\n');
}

// ---------- ⑤ CLI：默认校验 / --write 生成（#295 audit-docs-index 同形态） ----------
// 阴性钩子（v296 MD3_APPSDATA_PATH / v279 MD3_VENDOR_DIR 同律）：MD3_APPSDATA_ROOT 指向
// 临时仓库根（测试阴性锚用，不入仓）——重定向真源扫描与生成件路径，验证「用途尾注已变 → 校验红」真实路径。
function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const root = process.env.MD3_APPSDATA_ROOT || ROOT;
  const outPath = join(root, 'docs', 'APPS.md');
  const md = buildAppsMd(root);
  if (write) {
    writeFileSync(outPath, md);
    console.log(`[apps-md] 已生成 ${relative(ROOT, outPath).split(sep).join('/')}（真源根 ${process.env.MD3_APPSDATA_ROOT ? 'MD3_APPSDATA_ROOT 钩子' : '仓库'}）`);
    return 0;
  }
  if (!existsSync(outPath)) {
    console.error('[apps-md] 不一致：docs/APPS.md 缺失（先 npm run check:apps-md -- --write 生成并入库）');
    return 1;
  }
  const disk = readFileSync(outPath, 'utf8');
  if (disk !== md) {
    console.error('[apps-md] 不一致：docs/APPS.md 与真源扫描结果不吻合（生成件被手改或 apps-data.js 用途尾注已变）');
    console.error('[apps-md] 修复：npm run check:apps-md -- --write 后复查 diff 并入库');
    return 1;
  }
  console.log(`[apps-md] PASS：docs/APPS.md 与真源一致（apps-data.js import 行 + #296 用途尾注 + 目录实数）`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main());
}
