#!/usr/bin/env node
// gen-apps-doc.mjs — #285 应用清单真源生成器（APPS.md 生成 + 对账闸落地）
//
// 职责（#285 处置建议 ①② 的生成面；建议③ README 数字对账已由 #267 车道 check-readme-counts.mjs 落地）：
//   ① 解析 ios-desktop/js/apps-data.js 52 个 import 行——「用途：」尾注为清单级用途契约
//      （#296 契约、check:comments 强检），本生成器是头注明示的「同源消费切分点」接线（生成车道 #285）；
//   ② 逐定义文件提取 id / name / iframeAppContent 目录（v286 parseDefFile 同律）；
//      形态：有 iframe 目录 = iframe（单文件自包含），否则 = native（js/apps/<file>.js 定义）；
//   ③ 三源对账（#285 主诉「零真源」的核心闸）：
//      apps-data.js import 行数 == 定义文件解析数 == 表格行数（52）；
//      iframeAppContent 引用数 == ios-desktop/apps/ 含 index.html 目录数（#267 countIframeApps 口径，41）；
//      任一失配 exit 1；
//   ④ 生成 docs/APPS.md + docs/apps-inventory.json（生成件单真源禁手改，check:docs-index / check:version 同律；
//      无时间戳，逐字节可重现，否则 --check 永红）；
//   ⑤ 外部站点（catalog.json externals，#172 轻量壳）与演示安装包（catalog.json apps，.mdapp 全链）
//      一并登记——52 定义是注册表口径，catalog 是安装面口径，两口径分开列不混计（#267 实证先例）。
//
// 阴性钩子（仅测试用，CI 不设）：MD3_APPSDATA_PATH 可指向临时副本（check-comment-claims 二期同律）——
//   用途缺失 / 用途重复 → gate 即红（exit 1），守护「注释即契约」。
//
// 用法：node scripts/gen-apps-doc.mjs            # 生成两件 + stdout 汇总
//       node scripts/gen-apps-doc.mjs --check    # 重新生成并与盘上逐字节比对（不一致 exit 1）

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(new URL('..', import.meta.url).pathname);
const SRC = join(ROOT, 'ios-desktop');
const DOCS = join(ROOT, 'docs');
const MODE_CHECK = process.argv.includes('--check');
const APPSDATA = process.env.MD3_APPSDATA_PATH || join(SRC, 'js/apps-data.js');

// ---------- ① apps-data.js import 行（用途尾注 = #296 契约真源） ----------
function parseAppData() {
  const text = readFileSync(APPSDATA, 'utf8');
  const apps = [];
  const seen = new Set();
  const re = /^import\s+(\w+)\s+from\s+'\.\/apps\/([^']+)\.js';[ \t]*\/\/[ \t]*(.*)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const tail = m[3].trim();
    const cut = tail.indexOf('用途：');
    const purpose = cut >= 0 ? tail.slice(cut + 3).trim() : '';
    apps.push({ varName: m[1], defFile: `js/apps/${m[2]}.js`, purpose, tail });
    if (seen.has(m[1])) fail(`apps-data.js import 变量名重复：${m[1]}`);
    seen.add(m[1]);
  }
  return apps;
}

// ---------- ② 定义文件 → id / name / iframe 目录 ----------
function parseDefFile(rel) {
  const text = readFileSync(join(SRC, rel), 'utf8');
  const id = (text.match(/^ {2}id:\s*'([^']+)'/m) || [])[1] || '';
  const name = (text.match(/^ {2}name:\s*'([^']+)'/m) || [])[1] || '';
  const dir = (text.match(/iframeAppContent\('apps\/([^/]+)\/index\.html'\)/) || [])[1] || null;
  return { id, name, dir };
}

// ---------- ③ #267 口径：ios-desktop/apps/ 含 index.html 的目录数 ----------
function countIframeDirs() {
  const base = join(SRC, 'apps');
  return readdirSync(base).filter((d) => {
    const full = join(base, d);
    return statSync(full).isDirectory() && existsSync(join(full, 'index.html'));
  }).length;
}

// ---------- catalog.json（安装面口径） ----------
function parseCatalog() {
  const p = join(SRC, 'catalog.json');
  if (!existsSync(p)) return { externals: [], apps: [] };
  const j = JSON.parse(readFileSync(p, 'utf8'));
  return { externals: j.externals || [], apps: j.apps || [] };
}

// ---------- 表格转义（用途/描述含 | 时转义，防破表） ----------
function esc(s) {
  return String(s).replaceAll('|', '\\|');
}

function fail(msg) {
  console.error(`gen-apps-doc: ${msg}`);
  process.exit(1);
}

// ---------- 组装（gate 与 check 共用；返回 {md, json, stats} 或 fail） ----------
function build() {
  const appsRaw = parseAppData();
  if (appsRaw.length === 0) fail('apps-data.js 零 import 行解析——正则或文件结构漂移');

  const rows = [];
  const seenId = new Set();
  const seenPurpose = new Map();
  let iframeN = 0;
  let nativeN = 0;
  for (const a of appsRaw) {
    const def = parseDefFile(a.defFile);
    const form = def.dir ? 'iframe' : 'native';
    const entry = def.dir ? `apps/${def.dir}/index.html` : a.defFile;
    if (!a.purpose) fail(`#296 用途契约缺口：${a.defFile}（${a.varName}）行尾注无「用途：」段`);
    if (seenPurpose.has(a.purpose)) fail(`用途尾注重复（复制粘贴嫌疑，#296 两两唯一）：${a.varName} ≡ ${seenPurpose.get(a.purpose)}`);
    seenPurpose.set(a.purpose, a.varName);
    if (def.id && seenId.has(def.id)) fail(`定义文件 id 重复：${def.id}`);
    if (def.id) seenId.add(def.id);
    if (form === 'iframe') iframeN++; else nativeN++;
    rows.push({ varName: a.varName, id: def.id, name: def.name, purpose: a.purpose, form, defFile: a.defFile, entry });
  }

  const iframeDirs = countIframeDirs();
  if (iframeN !== iframeDirs) {
    fail(`三源对账失配：iframeAppContent 引用 ${iframeN} ≠ apps/ 含 index.html 目录 ${iframeDirs}（#267 口径）`);
  }
  if (rows.length !== appsRaw.length) fail('内部对账失配：rows ≠ import 行数');

  const catalog = parseCatalog();

  const mdLines = [];
  mdLines.push('<!-- docs/APPS.md — 应用清单真源（#285 生成件，scripts/gen-apps-doc.mjs 产物，禁手改） -->');
  mdLines.push('');
  mdLines.push('# 应用清单（APPS.md）');
  mdLines.push('');
  mdLines.push('> 真源：`ios-desktop/js/apps-data.js` 52 个 import 行尾注「用途：」（#296 清单级用途契约，`check:comments` 强检）——');
  mdLines.push('> 本生成件为 #285「应用清单零真源」处置建议①的落地：应用名/一句话用途/形态/入口路径全量清单化。');
  mdLines.push('> 对账闸：`npm run check:apps-doc`（--check 逐字节，单真源禁手改）；README 数字对账属 #267 车道（`check-readme-counts.mjs`）。');
  mdLines.push('');
  mdLines.push('## 汇总对账');
  mdLines.push('');
  mdLines.push(`- 应用定义（注册表口径）：**${rows.length}**（apps-data.js \`from './apps/'\` import 行，#267 同口径）`);
  mdLines.push(`- 形态分布：iframe **${iframeN}**（单文件自包含，\`apps/<dir>/index.html\`）+ native **${nativeN}**（\`js/apps/<file>.js\` 定义）`);
  mdLines.push(`- 三源对账：import 行 ${rows.length} = 定义解析 ${rows.length} = 表格行 ${rows.length}；iframeAppContent 引用 ${iframeN} = apps/ 含 index.html 目录 ${iframeDirs}（#267 countIframeApps 口径）`);
  mdLines.push(`- 「用途：」尾注：${rows.length} 条非空且两两唯一（#296 契约，生成时强检，缺失/重复即红）`);
  mdLines.push(`- 安装面口径（catalog.json，两口径分开列不混计）：外部站点（externals）**${catalog.externals.length}**（#172 轻量壳）+ 演示安装包（apps）**${catalog.apps.length}**（.mdapp 全链）`);
  mdLines.push('');
  mdLines.push('## 52 个应用定义（apps-data.js 顺序）');
  mdLines.push('');
  mdLines.push('| # | id | 名称 | 用途（尾注） | 形态 | 入口 |');
  mdLines.push('|---|---|---|---|---|---|');
  rows.forEach((r, i) => {
    mdLines.push(`| ${i + 1} | ${esc(r.id)} | ${esc(r.name)} | ${esc(r.purpose)} | ${r.form} | ${esc(r.entry)} |`);
  });
  mdLines.push('');
  if (catalog.externals.length > 0) {
    mdLines.push(`## 外部站点（catalog.json externals · #172 外部 Pages 项目轻量壳）`);
    mdLines.push('');
    mdLines.push('| # | id | 名称 | URL | 描述 |');
    mdLines.push('|---|---|---|---|---|');
    catalog.externals.forEach((e, i) => {
      mdLines.push(`| ${i + 1} | ${esc(e.id)} | ${esc(e.name)} | ${esc(e.url)} | ${esc(e.description || '')} |`);
    });
    mdLines.push('');
  }
  if (catalog.apps.length > 0) {
    mdLines.push(`## 演示安装包（catalog.json apps · .mdapp 安装全链）`);
    mdLines.push('');
    mdLines.push('| # | id | 名称 | 包 | 描述 |');
    mdLines.push('|---|---|---|---|---|');
    catalog.apps.forEach((a, i) => {
      mdLines.push(`| ${i + 1} | ${esc(a.id)} | ${esc(a.name)} | ${esc(a.downloadUrl)} | ${esc(a.description || '')} |`);
    });
    mdLines.push('');
  }

  const md = mdLines.join('\n');
  const json = JSON.stringify({
    issue: 285,
    source: 'ios-desktop/js/apps-data.js',
    stats: {
      appsTotal: rows.length,
      appsIframe: iframeN,
      appsNative: nativeN,
      iframeDirs,
      externals: catalog.externals.length,
      catalogApps: catalog.apps.length,
    },
    apps: rows,
    externals: catalog.externals.map((e) => ({ id: e.id, name: e.name, url: e.url, description: e.description || '' })),
    catalogApps: catalog.apps.map((a) => ({ id: a.id, name: a.name, downloadUrl: a.downloadUrl, description: a.description || '' })),
  }, null, 2) + '\n';

  return { md, json, stats: { total: rows.length, iframe: iframeN, native: nativeN, ext: catalog.externals.length, pkg: catalog.apps.length } };
}

const MD_PATH = join(DOCS, 'APPS.md');
const JSON_PATH = join(DOCS, 'apps-inventory.json');
const { md, json, stats } = build();

if (MODE_CHECK) {
  const curMd = existsSync(MD_PATH) ? readFileSync(MD_PATH, 'utf8') : '';
  const curJson = existsSync(JSON_PATH) ? readFileSync(JSON_PATH, 'utf8') : '';
  if (curMd !== md) fail(`docs/APPS.md 与再生结果不一致（--check 永红口径；跑 node scripts/gen-apps-doc.mjs 再生）`);
  if (curJson !== json) fail(`docs/apps-inventory.json 与再生结果不一致（--check 永红口径）`);
  console.log('check:apps-doc PASS — APPS.md / apps-inventory.json 逐字节可重现');
} else {
  writeFileSync(MD_PATH, md);
  writeFileSync(JSON_PATH, json);
  console.log(`gen-apps-doc OK — 应用 ${stats.total}（iframe ${stats.iframe} + native ${stats.native}）· 外部站点 ${stats.ext} · 演示包 ${stats.pkg} → docs/APPS.md + docs/apps-inventory.json`);
}
