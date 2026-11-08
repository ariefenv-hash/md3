#!/usr/bin/env node
// audit-docs-index.mjs — #295 docs/ 归档与索引策略门禁（处置建议三选一 → 取 c：维持现状 + 索引收敛）
//
// 职责：
//   ① 扫描 docs/ 实树（.gitignore 规则同步排除），分类：版本截图目录（^v\d+[a-z]?$，含 v207c 变体）/
//      其他目录 / 顶层文件；逐目录统计文件数与 png 数；
//   ② 引用依据派生：扫 docs/worklog.md（轮次头 ## R\d+ 上下文）+ docs/*.md + scripts/*.mjs 中的
//      docs/vNNN 引用——只记事实（哪个文件引用了哪个目录），不做版本号语义解码（v100=v10.0? v1.00?
//      歧义如实登记，裁决留 #223）；
//   ③ 生成 docs/index.md（--write）；默认 check 模式重新生成并与盘上文件逐字节比对，不一致 exit 1
//      （生成件单真源，禁手改——check:version 同律）；
//   ④ 门槛规则（#295 建议③，提示级不拦发布）：单版本目录 png > ARCHIVE_HINT_DIR_PNG → 归档提示；
//      docs/ 递归文件总数 > ARCHIVE_HINT_TOTAL_FILES → 瘦身提示。
//
// 边界（零搬迁铁律）：本门禁绝不移动/删除/重命名任何文件——worklog 与议题评论中的相对链接不可断；
// LFS/压缩归档两案缓议（远端 git-lfs 依赖 + 断链风险），联动 #223 重编号裁决。
//
// 零依赖（node:fs/node:path only）；无时间戳输出（生成件必须逐字节可重现，否则 check 永红）。

import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';

const ROOT = join(new URL('..', import.meta.url).pathname);
const DOCS = join(ROOT, 'docs');
const INDEX_PATH = join(DOCS, 'index.md');
const WORKLOG = join(DOCS, 'worklog.md');

const VERSION_DIR_RE = /^v(\d+)([a-z])?$/;
const ARCHIVE_HINT_DIR_PNG = 20; // #295 门槛①：单版本目录 png 上限（提示级）
const ARCHIVE_HINT_TOTAL_FILES = 700; // #295 门槛②：docs/ 递归文件总数上限（提示级）

// ---------- .gitignore 解析（只认 docs/ 前缀的两类规则：目录 docs/x/ 与文件 docs/y） ----------
function parseGitignore() {
  const ig = { dirs: new Set(), files: new Set() };
  const p = join(ROOT, '.gitignore');
  if (!existsSync(p)) return ig;
  for (const raw of readFileSync(p, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const mDir = line.match(/^docs\/([^/]+)\/$/);
    if (mDir) ig.dirs.add(mDir[1]);
    const mFile = line.match(/^docs\/(\S+[^/])$/);
    if (mFile) ig.files.add(mFile[1].split('/').join(sep));
  }
  return ig;
}

// ---------- 递归走 docs/（应用 gitignore 排除），返回相对 docs/ 的文件列表 ----------
function walkFiles(rel = '', ig, out = []) {
  const abs = rel ? join(DOCS, rel) : DOCS;
  for (const name of readdirSync(abs)) {
    const relPath = rel ? `${rel}${sep}${name}` : name;
    if (ig.files.has(relPath)) continue;
    const absPath = join(DOCS, relPath);
    const st = statSync(absPath);
    if (st.isDirectory()) {
      if (!rel && ig.dirs.has(name)) continue; // 顶层 gitignore 目录（docs/sweep/ 等）
      walkFiles(relPath, ig, out);
    } else {
      out.push(relPath);
    }
  }
  return out;
}

// ---------- 引用扫描：docs/worklog.md（带轮次上下文）+ docs/*.md + scripts/*.mjs ----------
function scanRefs() {
  const refs = new Map(); // dirName -> [{ src, round }]
  const put = (dir, src, round) => {
    if (!refs.has(dir)) refs.set(dir, []);
    const arr = refs.get(dir);
    if (!arr.some((r) => r.src === src && r.round === round)) arr.push({ src, round });
  };
  const REF_RE = /docs\/(v\d+[a-z]?)\b/g;

  // worklog.md：轮次头（## R\d+ …）给引用配轮次号与议题号
  if (existsSync(WORKLOG)) {
    let round = null;
    for (const line of readFileSync(WORKLOG, 'utf8').split('\n')) {
      const h = line.match(/^##\s*(R\d+)/);
      if (h) round = h[1];
      let m;
      REF_RE.lastIndex = 0;
      while ((m = REF_RE.exec(line))) put(m[1], 'docs/worklog.md', round);
    }
  }

  // 其他顶层 docs/*.md（排除 index.md 生成件自身与 worklog.md 已扫）+ scripts/*.mjs（排序保确定性）
  const sources = [];
  for (const name of readdirSync(DOCS)) {
    if (name.endsWith('.md') && name !== 'index.md' && name !== 'worklog.md') sources.push(join(DOCS, name));
  }
  for (const name of readdirSync(join(ROOT, 'scripts'))) {
    if (name.endsWith('.mjs')) sources.push(join(ROOT, 'scripts', name));
  }
  sources.sort();
  for (const file of sources) {
    const rel = relative(ROOT, file).split(sep).join('/');
    const text = readFileSync(file, 'utf8');
    let m;
    REF_RE.lastIndex = 0;
    while ((m = REF_RE.exec(text))) put(m[1], rel, null);
  }
  return refs;
}

// ---------- 扫描 docs/ 实树 ----------
function scanDocs() {
  const ig = parseGitignore();
  const files = walkFiles('', ig, []);
  const topEntries = readdirSync(DOCS);
  const versionDirs = [];
  const otherDirs = [];
  const topFiles = [];
  for (const name of topEntries) {
    const st = statSync(join(DOCS, name));
    if (st.isDirectory()) {
      if (VERSION_DIR_RE.test(name)) {
        const dirFiles = files.filter((f) => f === name || f.startsWith(name + sep));
        versionDirs.push({
          name,
          num: parseInt(VERSION_DIR_RE.exec(name)[1], 10),
          suffix: (VERSION_DIR_RE.exec(name)[2] || ''),
          files: dirFiles.length,
          png: dirFiles.filter((f) => extname(f).toLowerCase() === '.png').length,
        });
      } else if (!ig.dirs.has(name)) {
        const dirFiles = files.filter((f) => f === name || f.startsWith(name + sep));
        otherDirs.push({ name, files: dirFiles.length, ignored: ig.dirs.has(name) });
      }
    } else if (!ig.files.has(name)) {
      if (name !== 'index.md') topFiles.push(name); // index.md 生成件自身不入索引（自引用固定点排除）
    }
  }
  versionDirs.sort((a, b) => a.num - b.num || (a.suffix < b.suffix ? -1 : a.suffix > b.suffix ? 1 : 0));
  otherDirs.sort((a, b) => a.name.localeCompare(b.name));
  topFiles.sort();
  const indexSelf = 'index.md';
  const treeFiles = files.filter((f) => f !== indexSelf); // 生成件自身不计文件数（同上固定点排除）
  const totalFiles = treeFiles.length;
  const totalPng = treeFiles.filter((f) => extname(f).toLowerCase() === '.png').length;
  return { versionDirs, otherDirs, topFiles, totalFiles, totalPng, refs: scanRefs() };
}

// ---------- 其他目录/顶层文件说明（仅名称与既有交付事实，不做虚构溯源） ----------
const OTHER_DIR_NOTES = {
  audits: '审计产物（历史轮产出）',
  'diag-r39': 'R39 诊断产物',
  history: '历史归档（#290 根目录杂散中文文档收编 git mv 入此）',
  reference: 'AOSP 语料（#295 议题正文实证 6 子目录）',
  'reports-r120': '巡检报告（R120）',
  'reports-r128': '巡检报告（R128）',
  'shot-baseline': 'shot:diff 视觉基线（门禁对照真源）',
  sweep: 'e2e:sweep 失败截图（.gitignore docs/sweep/ 不入库，#300）',
};
const TOP_FILE_NOTES = [
  [/^HANDOFF\.md$/, '交接快照入口（#234②，新实例先读本件）'],
  [/^ROADMAP\.md$/, '路线图'],
  [/^worklog\.md$/, '轮次真源（#18 SOP 第 2 步）'],
  [/^ios-quirks\.md$/, '浏览器 quirk 台账（#287）'],
  [/^globals-registry\.json$/, '全局注册表（机读）'],
  [/^globals-registry\.md$/, '全局注册表（人读）'],
  [/^visual-admission-baseline\.json$/, '视觉准入基线（#243，机读）'],
  [/^visual-admission-baseline\.md$/, '视觉准入基线（#243，人读）'],
  [/^visual-baseline\.md$/, 'V 清单水位文档'],
  [/^visual-token-adoption\.md$/, '令牌采纳记录'],
  [/^ui-detail-baseline\.md$/, 'UI 细节基线'],
  [/^ops-discipline\.md$/, '运维纪律'],
  [/^research-harmony-multiwindow\.md$/, '研究文档（multiwindow 考证）'],
  [/^external-repos-patrol-r116\.md$/, '外部仓库巡检（R116）'],
  [/^nightsky-.*\.png$/, 'nightsky 截图（#16 交付入库）'],
  [/\.png$/, '顶层散置 png（调试样张）'],
];
function noteFor(name) {
  for (const [re, note] of TOP_FILE_NOTES) if (re.test(name)) return note;
  return '—';
}
function refLabel(refs) {
  if (!refs || refs.length === 0) return '—（引用缺失，重编号裁决留 #223）';
  return refs
    .map((r) => `${r.src}${r.round ? `（${r.round}）` : ''}`)
    .join('、');
}

// ---------- 渲染（确定性：无时间戳、稳定排序） ----------
function render(d) {
  const L = [];
  L.push('# docs/ 索引（#295 · 生成件）');
  L.push('');
  L.push('> 本文件由 `scripts/audit-docs-index.mjs` 生成，`npm run check:docs-index` 逐字节校验一致性——**禁手改**；');
  L.push('> 数据真源 = `docs/` 实树（.gitignore 同步排除）+ `docs/worklog.md` 轮次头 + `scripts/*.mjs` 引用扫描。');
  L.push('');
  L.push('## 策略裁决（#295 处置建议三选一 → 取 c）');
  L.push('');
  L.push('- **c 维持现状 + 索引收敛**（本卡落地）：零搬迁零删除——worklog/议题相对链接不可断；');
  L.push('- a（迁 LFS）：需远端 git-lfs 依赖与历史重写，缓议；');
  L.push('- b（压缩归档/搬迁/Release 附件）：断链风险，缓议；');
  L.push('- #223 联动：目录名 vNNN 语义歧义（v100=v10.0? v1.00? v96=v9.6?）如实登记不擅断，重编号裁决留 #223；');
  L.push('- v207c 带后缀变体与 v\\d+ 纯数字目录同列版本截图档（^v\\d+[a-z]?$ 统一在册）。');
  L.push('');
  L.push('## 门槛规则（#295 建议③，提示级不拦发布）');
  L.push('');
  L.push(`- 单版本目录 png > ${ARCHIVE_HINT_DIR_PNG} → 「归档提示」节列出（提示归档）；`);
  L.push(`- docs/ 递归文件总数 > ${ARCHIVE_HINT_TOTAL_FILES} → 「归档提示」节列出（提示瘦身）；`);
  L.push('- 触发与否均如实登记（无触发即「无」，不留空洞节）。');
  L.push('');
  L.push('## 概览');
  L.push('');
  L.push('| 指标 | 值 |');
  L.push('|---|---|');
  L.push(`| docs/ 顶层条目 | ${d.versionDirs.length + d.otherDirs.length + d.topFiles.length} |`);
  L.push(`| 版本截图目录（含变体） | ${d.versionDirs.length} |`);
  L.push(`| 其他目录 | ${d.otherDirs.length} |`);
  L.push(`| 顶层文件 | ${d.topFiles.length} |`);
  L.push(`| 递归文件总数（.gitignore 排除后） | ${d.totalFiles} |`);
  L.push(`| 其中 png | ${d.totalPng} |`);
  L.push('');
  L.push(`## 版本截图目录（${d.versionDirs.length} 个 · 命名随当时版本号，语义歧义留 #223）`);
  L.push('');
  L.push('| 目录 | 文件 | png | 引用依据 |');
  L.push('|---|---|---|---|');
  for (const v of d.versionDirs) {
    L.push(`| ${v.name} | ${v.files} | ${v.png} | ${refLabel(d.refs.get(v.name))} |`);
  }
  L.push('');
  L.push('## 其他目录');
  L.push('');
  L.push('| 目录 | 文件 | 说明 |');
  L.push('|---|---|---|');
  for (const o of d.otherDirs) {
    L.push(`| ${o.name} | ${o.files} | ${OTHER_DIR_NOTES[o.name] || '—'} |`);
  }
  L.push('');
  L.push('## 顶层文件');
  L.push('');
  L.push('| 文件 | 说明 |');
  L.push('|---|---|');
  for (const f of d.topFiles) {
    L.push(`| ${f} | ${noteFor(f)} |`);
  }
  L.push('');
  L.push('## 归档提示（提示级，不拦发布）');
  L.push('');
  const hints = [];
  for (const v of d.versionDirs) {
    if (v.png > ARCHIVE_HINT_DIR_PNG) hints.push(`- ${v.name}：png ${v.png} > ${ARCHIVE_HINT_DIR_PNG}（提示归档，处置方式留 #223 联动裁决）`);
  }
  if (d.totalFiles > ARCHIVE_HINT_TOTAL_FILES) {
    hints.push(`- docs/ 递归文件总数 ${d.totalFiles} > ${ARCHIVE_HINT_TOTAL_FILES}（提示瘦身：优先清理历史版本截图目录，方式留 #223 联动裁决）`);
  }
  if (hints.length === 0) {
    L.push(`- 无（全部版本目录 png ≤ ${ARCHIVE_HINT_DIR_PNG}，递归文件总数 ≤ ${ARCHIVE_HINT_TOTAL_FILES}）。`);
  } else {
    for (const h of hints) L.push(h);
  }
  L.push('');
  return L.join('\n');
}

// ---------- 主流程 ----------
function main() {
  const write = process.argv.includes('--write');
  const data = scanDocs();
  const md = render(data);

  // 门槛提示同步 stdout（--write 与 check 模式都提示，提示级不改变退出码）
  for (const v of data.versionDirs) {
    if (v.png > ARCHIVE_HINT_DIR_PNG) console.log(`[docs-index] 提示：${v.name} png ${v.png} > ${ARCHIVE_HINT_DIR_PNG}（归档候选，见 docs/index.md）`);
  }
  if (data.totalFiles > ARCHIVE_HINT_TOTAL_FILES) {
    console.log(`[docs-index] 提示：docs/ 递归文件总数 ${data.totalFiles} > ${ARCHIVE_HINT_TOTAL_FILES}（瘦身候选，见 docs/index.md）`);
  }

  if (write) {
    writeFileSync(INDEX_PATH, md);
    console.log(`[docs-index] 已生成 ${relative(ROOT, INDEX_PATH).split(sep).join('/')}（版本目录 ${data.versionDirs.length} · 其他目录 ${data.otherDirs.length} · 顶层文件 ${data.topFiles.length} · 递归文件 ${data.totalFiles}）`);
    return 0;
  }

  if (!existsSync(INDEX_PATH)) {
    console.error('[docs-index] 不一致：docs/index.md 缺失（先 npm run check:docs-index -- --write 生成并入库）');
    return 1;
  }
  const disk = readFileSync(INDEX_PATH, 'utf8');
  if (disk !== md) {
    console.error('[docs-index] 不一致：docs/index.md 与实树扫描结果不吻合（生成件被手改或 docs/ 实树已变）');
    console.error('[docs-index] 修复：npm run check:docs-index -- --write 后复查 diff 并入库');
    return 1;
  }
  console.log(`[docs-index] PASS：docs/index.md 与实树一致（版本目录 ${data.versionDirs.length} · 其他目录 ${data.otherDirs.length} · 顶层文件 ${data.topFiles.length} · 递归文件 ${data.totalFiles} · png ${data.totalPng}）`);
  return 0;
}

process.exit(main());
