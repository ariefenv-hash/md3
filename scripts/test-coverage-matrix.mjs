#!/usr/bin/env node
// test-coverage-matrix.mjs — #286 core 提取范式覆盖矩阵生成器
//
// 职责（#286 处置建议 ①②③ 的量化基座）：
//   ① 解析 ios-desktop/js/apps-data.js import 行 → 应用清单（定义数 / 用途尾注随行）；
//   ② 逐定义文件提取 id / name / iframe 目录（iframeAppContent('apps/<dir>/index.html')），
//      无 iframe 目录的应用如实标 native（不硬归 41 家）；
//   ③ core 出口全集：ios-desktop/js/** 与 ios-desktop/apps/**（js+html 内联）中
//      window.__xxxCore 范式出口（#278 全量出口注册表为另一车道，本工具只取 *Core 范式）；
//   ④ 应用域归属（数据驱动，零硬编码变体表）：core 宿主文件 ∈ 应用域文件集
//      （js/apps/<file>.js + ios-desktop/apps/<dir>/**）或 core 名在该域文件中被引用 → 归属；
//      多应用引用如实多列；零应用引用归「共享层」——绝不硬造归属；
//   ⑤ tests 消费三层映射：core 名被 tests/*.test.js 提及（vitest 沙箱提取范式）/
//      apps/<dir>/ 路径引用（audit H 项同口径）/ app id 引用；
//   ⑥ 输出 docs/test-coverage-matrix.md + docs/test-coverage-matrix.json
//      （生成件单真源禁手改，check:docs-index / check:version 同律；无时间戳，逐字节可重现）；
//   ⑦ 触达档位：core-full（core 全消费）/ core-gap（core 有但未全消费）/
//      ref-only（零 core 但有 tests 引用）/ zero-touch（零 core 零引用）——
//      zero-touch 内再分 P0（高频集合）/ P1（非高频）风险序。
//
// 边界（车道纪律）：
//   - 只读扫描 + 写 docs/ 两个生成件；零应用源码/测试源码改动；
//   - 高频集合口径 = #286 原文点名（music/files/settings 子页优先）+ messages（即时会话），
//     共 4 家，不入库为常量语义（矩阵 JSON 内登记口径来源，裁决变更走议题）。
//
// 用法：node scripts/test-coverage-matrix.mjs            # 生成两件 + stdout 汇总
//       node scripts/test-coverage-matrix.mjs --check    # 重新生成并与盘上逐字节比对（不一致 exit 1）

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = join(new URL('..', import.meta.url).pathname);
const SRC = join(ROOT, 'ios-desktop');
const DOCS = join(ROOT, 'docs');

// ---------- ① 应用清单（apps-data.js import 行） ----------
function parseAppData() {
  const text = readFileSync(join(SRC, 'js/apps-data.js'), 'utf8');
  const apps = [];
  const re = /^import\s+(\w+)\s+from\s+'\.\/apps\/([^']+)\.js';[ \t]*\/\/[ \t]*(.*)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    apps.push({ varName: m[1], defFile: `js/apps/${m[2]}.js`, purpose: m[3].trim() });
  }
  return apps;
}

// ---------- ② 定义文件 → id / name / iframe 目录 ----------
function parseDefFile(rel) {
  const text = readFileSync(join(SRC, rel), 'utf8');
  const id = (text.match(/^ {2}id:\s*'([^']+)'/m) || [])[1] || '';
  const name = (text.match(/^ {2}name:\s*'([^']+)'/m) || [])[1] || '';
  const dir = (text.match(/iframeAppContent\('apps\/([^/]+)\/index\.html'\)/) || [])[1] || null;
  return { id, name, dir, text };
}

// ---------- 文件集遍历（确定性排序；跳过 vendor/ 与 *.min.*，与 audit collectFiles 同口径） ----------
function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'vendor') continue;
      walkFiles(p, out);
    } else if (/\.(js|mjs|html)$/.test(extname(e.name)) && !/\.min\./.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

// ---------- ③ core 出口全集（宿主 → core 名） ----------
function scanCoreHosts() {
  const hosts = new Map(); // coreName -> Set(宿主相对路径)
  const files = [...walkFiles(join(SRC, 'js')), ...walkFiles(join(SRC, 'apps'))];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    const rel = relative(ROOT, f);
    for (const m of text.matchAll(/window\.__([A-Za-z0-9_]+Core)\b/g)) {
      if (!hosts.has(m[1])) hosts.set(m[1], new Set());
      hosts.get(m[1]).add(rel);
    }
  }
  return hosts;
}

// ---------- 主流程 ----------
function buildMatrix() {
  const appData = parseAppData();
  const coreHosts = scanCoreHosts();
  const testsDir = join(ROOT, 'tests');
  const testFiles = walkFiles(testsDir).filter((f) => f.endsWith('.test.js'));
  const testsAgg = testFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
  const testRelOf = (needle) =>
    testFiles.filter((f) => readFileSync(f, 'utf8').includes(needle)).map((f) => relative(testsDir, f));

  // 应用域文件集与文本（归属证据面）
  const rows = [];
  const claimedCores = new Set(); // 已归属应用的 core（剩余→共享层）
  for (const a of appData) {
    const def = parseDefFile(a.defFile);
    const domainFiles = [join(SRC, a.defFile)];
    if (def.dir) domainFiles.push(...walkFiles(join(SRC, 'apps', def.dir)));
    const domainText = domainFiles.map((f) => (existsSync(f) ? readFileSync(f, 'utf8') : '')).join('\n');

    // 该应用域内出现（宿主或引用）的 core
    const cores = [];
    for (const [coreName, hostSet] of coreHosts) {
      const hostIn = [...hostSet].some((h) => domainFiles.some((f) => relative(ROOT, f) === h));
      const referenced = domainText.includes(coreName);
      if (hostIn || referenced) {
        cores.push(coreName);
        claimedCores.add(coreName);
      }
    }
    cores.sort();

    const dirRefFiles = def.dir ? testRelOf(`apps/${def.dir}/`) : [];
    const idRefFiles = def.id ? testRelOf(def.id) : [];
    const coreRefFiles = [...new Set(cores.flatMap((c) => testRelOf(c)))];
    const coreConsumed = cores.filter((c) => testsAgg.includes(c));

    const refHits = dirRefFiles.length + idRefFiles.length;
    let tier;
    if (cores.length > 0) tier = coreConsumed.length === cores.length ? 'core-full' : 'core-gap';
    else tier = refHits > 0 ? 'ref-only' : 'zero-touch';

    rows.push({
      defFile: a.defFile,
      varName: a.varName,
      id: def.id,
      name: def.name,
      form: def.dir ? 'iframe' : 'native',
      dir: def.dir,
      purpose: a.purpose,
      cores,
      coreConsumed,
      coreRefFileCount: coreRefFiles.length,
      dirRefFiles: dirRefFiles.length,
      idRefFiles: idRefFiles.length,
      tier,
    });
  }

  // 共享层 core（零应用归属）
  const sharedCores = [...coreHosts.keys()].filter((c) => !claimedCores.has(c)).sort()
    .map((c) => ({ core: c, hosts: [...coreHosts.get(c)].sort(), consumed: testsAgg.includes(c) }));

  // 高频集合（口径：#286 原文点名 + messages；详见文件头注）
  const HOT = ['music', 'files', 'settings', 'messages'];
  const zeroTouch = rows.filter((r) => r.tier === 'zero-touch')
    .map((r) => ({ ...r, risk: HOT.includes(r.dir) || HOT.includes(r.varName.replace(/App$/, '').toLowerCase()) ? 'P0' : 'P1' }))
    .sort((a, b) => (a.risk === b.risk ? String(a.dir ?? '').localeCompare(String(b.dir ?? '')) : a.risk.localeCompare(b.risk)));

  const iframes = rows.filter((r) => r.form === 'iframe');
  const allCores = [...coreHosts.keys()].sort();
  const consumedCores = allCores.filter((c) => testsAgg.includes(c));
  const stats = {
    appsTotal: rows.length,
    appsIframe: iframes.length,
    appsNative: rows.length - iframes.length,
    coresTotal: allCores.length,
    coresConsumed: consumedCores.length,
    coresCoveragePct: allCores.length ? Math.round((consumedCores.length / allCores.length) * 100) : 100,
    coreFull: rows.filter((r) => r.tier === 'core-full').length,
    coreGap: rows.filter((r) => r.tier === 'core-gap').length,
    refOnly: rows.filter((r) => r.tier === 'ref-only').length,
    zeroTouch: zeroTouch.length,
    zeroTouchP0: zeroTouch.filter((r) => r.risk === 'P0').length,
  };
  return { rows, sharedCores, zeroTouch, allCores, consumedCores, coreHosts, testFiles, stats };
}

// ---------- ⑥ 渲染 MD / JSON（确定性：排序稳定 + 无时间戳） ----------
function renderMd({ rows, sharedCores, zeroTouch, allCores, consumedCores, coreHosts, testFiles, stats }) {
  const L = [];
  L.push('# core 提取范式覆盖矩阵（#286）');
  L.push('');
  L.push('> 本文件为**生成件**（单真源 = `scripts/test-coverage-matrix.mjs`，禁手改；check:docs-index / check:version 同律）。');
  L.push('> 再生：`node scripts/test-coverage-matrix.mjs`；校验：`node scripts/test-coverage-matrix.mjs --check`。');
  L.push('> 口径详见脚本头注；全量 window.__ 出口注册表属 #278 车道，本矩阵只取 `window.__xxxCore` 范式。');
  L.push('');
  L.push('## 汇总');
  L.push('');
  L.push(`- 应用定义：**${stats.appsTotal}**（iframe ${stats.appsIframe} / native ${stats.appsNative}）`);
  L.push(`- core 出口（\`window.__*Core\` 范式）：**${stats.coresTotal}** 个，被 vitest 消费 **${stats.coresConsumed}** 个（覆盖率 ${stats.coresCoveragePct}%）`);
  L.push(`- 应用档位：core-full **${stats.coreFull}** / core-gap **${stats.coreGap}** / ref-only **${stats.refOnly}** / zero-touch **${stats.zeroTouch}**（其中高频 P0 **${stats.zeroTouchP0}**）`);
  L.push(`- 测试文件：${testFiles.length} 个（tests/*.test.js）`);
  L.push('');
  L.push('## 应用 × core × 测试触达矩阵');
  L.push('');
  L.push('| 应用 | name | 形态 | iframe 目录 | core 出口 | 被消费 | tests 目录引用 | tests id 引用 | 档位 |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    L.push(`| ${r.varName} | ${r.name} | ${r.form} | ${r.dir || '—'} | ${r.cores.length ? r.cores.map((c) => `\`${c}\``).join('、') : '—'} | ${r.cores.length ? `${r.coreConsumed.length}/${r.cores.length}` : '—'} | ${r.dirRefFiles} | ${r.idRefFiles} | ${r.tier} |`);
  }
  L.push('');
  L.push('## 共享层 core（零单应用归属，如实登记）');
  L.push('');
  if (sharedCores.length === 0) L.push('（无——全部 core 均有应用域归属）');
  else {
    L.push('| core | 宿主文件 | 被 vitest 消费 |');
    L.push('|---|---|---|');
    for (const s of sharedCores) L.push(`| \`${s.core}\` | ${s.hosts.map((h) => `\`${h}\``).join('、')} | ${s.consumed ? '✓' : '✗'} |`);
  }
  L.push('');
  L.push('## 零触达应用风险序（zero-touch · 补 core 提取候补）');
  L.push('');
  if (zeroTouch.length === 0) L.push('（无——全部应用至少有 tests 引用或 core 提取）');
  else {
    L.push('| 风险 | 应用 | iframe 目录 | 形态 | 建议处置 |');
    L.push('|---|---|---|---|---|');
    for (const z of zeroTouch) L.push(`| ${z.risk} | ${z.varName} | ${z.dir || '—'} | ${z.form} | 补 core 提取 + tests 锚（分批，#229 批次先例同律） |`);
  }
  L.push('');
  L.push('## core ↔ 测试消费映射');
  L.push('');
  L.push('| core | 宿主 | vitest 消费 |');
  L.push('|---|---|---|');
  for (const c of allCores) {
    const hosts = [...coreHosts.get(c)].sort();
    L.push(`| \`${c}\` | ${hosts.map((h) => `\`${h}\``).join('、')} | ✓（${consumedCores.includes(c) ? 'tests 提及' : '**零提及**'}） |`);
  }
  L.push('');
  L.push('## 档位口径');
  L.push('');
  L.push('- `core-full`：应用域持有 core 出口且全部被 tests 提及（沙箱提取范式触达）；');
  L.push('- `core-gap`：持有 core 但存在零提及 core（触达有缺口）；');
  L.push('- `ref-only`：零 core 出口，但 tests 有 `apps/<dir>/` 或 app id 引用（audit H 项同口径）；');
  L.push('- `zero-touch`：零 core 零引用（audit H 项亦不达）；P0 = 高频集合（music/files/settings/messages，#286 原文口径），P1 = 其余。');
  L.push('');
  return L.join('\n') + '\n';
}

function renderJson(m) {
  return JSON.stringify({
    generated_by: 'scripts/test-coverage-matrix.mjs',
    issue: 286,
    hot_set_rationale: '#286 原文点名 music/files/settings 子页优先 + messages（即时会话）；裁决变更走议题',
    stats: m.stats,
    apps: m.rows,
    shared_cores: m.sharedCores,
    zero_touch_risk_order: m.zeroTouch.map(({ defFile, varName, id, dir, form, risk }) => ({ defFile, varName, id, dir, form, risk })),
  }, null, 2) + '\n';
}

// ---------- 入口 ----------
const check = process.argv.includes('--check');
const matrix = buildMatrix();
const md = renderMd(matrix);
const json = renderJson(matrix);
const MD_PATH = join(DOCS, 'test-coverage-matrix.md');
const JSON_PATH = join(DOCS, 'test-coverage-matrix.json');

if (check) {
  const okMd = existsSync(MD_PATH) && readFileSync(MD_PATH, 'utf8') === md;
  const okJson = existsSync(JSON_PATH) && readFileSync(JSON_PATH, 'utf8') === json;
  if (!okMd || !okJson) {
    console.error('[coverage-matrix] 不一致：生成件与盘上不符（先 node scripts/test-coverage-matrix.mjs 再生并入库）');
    process.exit(1);
  }
  console.log(`[coverage-matrix] check PASS（${statsLine(matrix.stats)}）`);
} else {
  writeFileSync(MD_PATH, md);
  writeFileSync(JSON_PATH, json);
  console.log(`[coverage-matrix] 生成 docs/test-coverage-matrix.md + .json（${statsLine(matrix.stats)}）`);
}

function statsLine(s) {
  return `应用 ${s.appsTotal}=iframe ${s.appsIframe}+native ${s.appsNative}；core ${s.coresConsumed}/${s.coresTotal} 消费（${s.coresCoveragePct}%）；档位 full ${s.coreFull}/gap ${s.coreGap}/ref ${s.refOnly}/zero ${s.zeroTouch}(P0 ${s.zeroTouchP0})`;
}
