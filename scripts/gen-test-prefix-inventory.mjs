#!/usr/bin/env node
// #291 裁决卷备料 v2：tests/ 全量测试文件三档清单生成器（只读扫描，零改动仓库文件）
// 证据源 = 测试文件内容实引（import 路径 / window.__ 核名）+ 名称信号词，非纯名称猜谜
// 输出: docs/audits/test-prefix-inventory.json
import { readdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TESTS = join(ROOT, 'tests');

// 快照信号词（名称 TOKEN 精确匹配，非子串——v833 accounts 误命中 counts 教训）
const SNAP_TOKENS = new Set(['version', 'readme', 'counts', 'matrix', 'baseline', 'precache', 'manifest', 'catalog-dist', 'globals', 'keymap', 'docs-index', 'apps-doc', 'coverage', 'single-source', 'dist-parity', 'docs-history', 'zero-touch', 'refonly', 'visual-token', 'palette-lock', 'workflows', 'purpose-contract', 'naming', 'audit', 'registration', 'registry', 'zerotouch', 'admission']);
function snapHit(stem) {
  return stem.split('-').some(t => SNAP_TOKENS.has(t));
}

function listTestFiles() {
  return readdirSync(TESTS).filter(f => f.endsWith('.test.js')).sort();
}

// 内容实引探针：import/路径引用 + __xxxCore 全局引用 + readFileSync 目标
function contentProbe(full) {
  const src = readFileSync(full, 'utf8');
  const ev = { assetPaths: [], cores: [], missingPaths: [] };
  const pathRe = /(?:ios-desktop|docs|scripts)\/[\w./-]+\.(?:js|mjs|html|css|json|webmanifest|md)/g;
  const seen = new Set();
  for (const m of src.matchAll(pathRe)) {
    const p = m[0];
    if (seen.has(p)) continue;
    seen.add(p);
    if (existsSync(join(ROOT, p))) { ev.assetPaths.push(p); continue; }
    // 扩展名/前缀变体回退（.js→.mjs/.json；裸 js|css|apps → ios-desktop 前缀）
    const variants = [p.replace(/\.js$/, '.mjs'), p.replace(/\.js$/, '.json'), 'ios-desktop/' + p, p.replace(/\.js$/, '.mjs').replace(/^/, 'ios-desktop/')];
    const hitv = variants.find(v => existsSync(join(ROOT, v)));
    if (hitv) ev.assetPaths.push(hitv); else ev.missingPaths.push(p);
  }
  for (const m of src.matchAll(/__([a-z0-9]+(?:[A-Z][a-z0-9]+)*)Core\b/g)) ev.cores.push('__' + m[1] + 'Core');
  // 相对导入 ../ios-desktop/...
  for (const m of src.matchAll(/from\s+['"](\.\.[\w./-]+)['"]/g)) {
    let p = m[1].replace(/^\.\.\//, '');
    if (p.startsWith('js/') || p.startsWith('css/') || p.startsWith('apps/')) p = 'ios-desktop/' + p;
    if (seen.has(p)) continue;
    seen.add(p);
    if (existsSync(join(ROOT, p))) ev.assetPaths.push(p); else ev.missingPaths.push(p);
  }
  // path.join(here|ROOT, '...') / join(dirname(...), '...') 拼接引用（v151 readFileSync(join(here,'../sw.js')) 族）
  for (const m of src.matchAll(/(?:join|resolve)\(\s*(?:here|ROOT|dirname\([^)]*\)|fileURLToPath\([^)]*\))\s*,\s*['"]([^'"]+)['"]/g)) {
    let p = m[1];
    if (!p.includes('/') || p.startsWith('./')) continue;
    p = p.replace(/^\.\.\//, '');
    if (p.startsWith('js/') || p.startsWith('css/') || p.startsWith('apps/') || p.startsWith('assets/')) p = 'ios-desktop/' + p;
    if (seen.has(p)) continue;
    seen.add(p);
    if (existsSync(join(ROOT, p))) ev.assetPaths.push(p); else ev.missingPaths.push(p);
  }
  ev.cores = [...new Set(ev.cores)];
  return ev;
}

function classify(file) {
  const full = join(TESTS, file);
  const m = file.match(/^(v\d+[a-z]?)-(.+)\.test\.js$/);
  const versioned = !!m;
  const stem = versioned ? m[2] : file.replace(/\.test\.js$/, '');
  const ev = contentProbe(full);
  const hasLivingRef = ev.assetPaths.length > 0 || ev.cores.length > 0;
  let tier, confidence, note = '';
  if (!versioned) {
    tier = 'evergreen'; confidence = 'high';
    note = '非版本前缀，已合常青命名范式';
  } else if (snapHit(stem)) {
    tier = 'snapshot'; confidence = 'medium';
    note = '名称含快照/闸门信号 token → 推定交付时点快照；若内容实引行为契约则复核上调 evergreen';
  } else if (hasLivingRef) {
    tier = 'evergreen'; confidence = 'high';
    note = '内容实引现存资产（' + (ev.assetPaths[0] || ev.cores[0]) + (ev.assetPaths.length + ev.cores.length > 1 ? ' 等' + (ev.assetPaths.length + ev.cores.length) : '') + '）→ 行为锚';
  } else {
    tier = 'review'; confidence = 'low';
    note = '内容零资产实引（DOM fixture/注入式行为测或快照）→ 人工复核位（不机器判定快照/退役）';
  }
  return {
    file, version: versioned ? m[1] : null, stem, tier, confidence,
    evidence: { living_assets: ev.assetPaths.slice(0, 6), cores: ev.cores.slice(0, 6), missing: ev.missingPaths.slice(0, 3) },
    note,
  };
}

const rows = listTestFiles().map(classify);

// 人工复核层（R148 窗 Job 2932311 终审，证据在案；机器档位不覆盖，仅按复核结论翻档并留痕）
const OVERRIDES = {
  'v152-launch-boot-anim.test.js': { tier: 'evergreen', why: 'readFileSync(resolve(__dirname,"../launch.html")) 相对拼接逃过探针；launch.html 现存，启动开屏行为锚 → evergreen' },
  'v188-clock-font-fn.test.js': { tier: 'evergreen', why: 'join(__dirname,"..") 多参拼接逃过探针；时钟字体函数行为锚（assets/fonts 现存）→ evergreen' },
  'v216-chess-board-rows.test.js': { tier: 'evergreen', why: 'path.join(root,"ios-desktop","apps","chess","index.html") 多参拼接逃过探针；chess 现存，棋盘行行为锚 → evergreen' },
  'v239-motion-tokens.test.js': { tier: 'evergreen', why: 'motion token 契约锚，js/motion.js 现存 → evergreen' },
  'v930-font-fail-visible.test.js': { tier: 'evergreen', why: '字体加载失败可见性行为锚（字体 vendor 链现存）→ evergreen' },
  'v931-font-fallback-visible.test.js': { tier: 'evergreen', why: '字体回退可见性行为锚（字体 vendor 链现存）→ evergreen' },
  'v181-admission-rework.test.js': { tier: 'evergreen', why: '"admission" token 误中信号词；内容实引 drawcircle/gravity/typing 现存资产+apps-data.js，准入改造行为锚 → evergreen' },
  'v261-word-admission.test.js': { tier: 'evergreen', why: '"admission" token 误中信号词；checkB(PAGE()) 行为断言+word 布局实质断言（grid 模板/卡区），行为锚 → evergreen' },
};
for (const r of rows) {
  const o = OVERRIDES[r.file];
  if (o) { r.tier = o.tier; r.confidence = 'high'; r.note = '人工复核终审：' + o.why; r.reviewed = true; }
}

const counts = { total: rows.length, evergreen: 0, snapshot: 0, review: 0, 'retirable-candidate': 0, unversioned: 0 };
for (const r of rows) {
  if (!r.version) counts.unversioned++;
  counts[r.tier] = (counts[r.tier] || 0) + 1;
}
const byVersion = {};
for (const r of rows) { const k = r.version || '(none)'; byVersion[k] = (byVersion[k] || 0) + 1; }

const out = {
  generated: '2026-11-10T02:2x+08:00 R148 窗 Job 2932311 第 1 系列 · #291 方案裁决卷备料（v2 内容实引探针）',
  method: '证据源=测试文件内容实引（import 路径/window.__*Core 全局/相对导入，含扩展名与 ios-desktop 前缀变体回退）+ 名称快照信号 token（词边界精确匹配）。tier=机器推定档位非终审：evergreen(high)=内容实引现存资产；snapshot(medium)=名称快照信号 token；review(low)=内容零实引人工复核位。retirable 不由机器判定——退役走人工流程（复核后确认+worklog 登记+生成件随再生）。',
  tiers: {
    evergreen: '行为回归锚：测当前活着的行为/契约 → 常青命名（特性名-行为）随特性演进改',
    snapshot: '交付时点快照：测交付当时计数/基线/形态横切 → 显式 @snapshot 标记，允许随快照失义退役（人工复核）',
    review: '人工复核位：机器证据不足（零资产实引的 DOM fixture/注入式测试），快照 or 常青由人工终审；退役候选仅从中产生，不机器判定',
    'retirable-candidate': '退役候选：仅由 review 复核产生（人工确认），机器永不全自动判退役',
  },
  counts,
  version_prefix_distribution: byVersion,
  files: rows,
};
writeFileSync(join(ROOT, 'docs/audits/test-prefix-inventory.json'), JSON.stringify(out, null, 2) + '\n');
console.log('TOTAL', counts.total, JSON.stringify(counts));
const missingRef = rows.filter(r => r.evidence.missing.length);
console.log('files-with-missing-refs:', missingRef.length, missingRef.slice(0, 8).map(r => r.file).join(', '));
