#!/usr/bin/env node
// gen-vendor-audit.mjs — #280 vendor 大库按需加载审计：消费矩阵 + 孤儿库检测生成器（R154 窗 · v11.12 维持 · 纯 docs+scripts 零滚版）
//
// 职责（#280 处置建议④「vendor 消费方=0 的孤儿库检测」的可执行化——独立生成器形态，
// 与 #276 gen-pm-inventory.mjs 先例同律：零依赖 / 无时间戳 / 逐字节可重现 / --check 闸）：
//   ① 枚举 ios-desktop/apps/_shared/vendor/ 全目录文件（含 geometries/ phosphor/ ocr/ 子目录）；
//   ② 扫描消费面源文件（apps/*/index.html + apps/**/*.mjs|js + js/**/*.{js,mjs}（aosp 镜像跳过）+
//      根壳 index.html / ios-desktop/index.html / launch.html / sw.js），字面 basename 匹配 +
//      两类专案解析（见下）；
//   ③ 交叉引用 dist/precache-manifest.json（存在时）：预缓存成员 + dist 压缩复制字节；
//   ④ 生成 docs/audits/vendor-consumers.json（--write）；默认 check 模式重生成并逐字节比对，
//      不一致 exit 1（生成件单真源禁手改——check:version / audit-docs-index 同律）。
//
// 专案解析（字面扫描覆盖不到的运行时构造装载，规则确定性可复核）：
//   A. tesseract 家族（ocr/langs/*.traineddata.gz + ocr/tesseract-core-*.wasm.js +
//      ocr/tesseract-bundle.mjs）：真实消费方经 [Tt]esseract 命名空间/路径构造引用
//      （tesseract-bundle 装载 + worker langPath 运行时拼 langs 路径）——消费方 =
//      源文本匹配 /[Tt]esseract/ 的文件（ocr 应用 + js/ocr-core.js 等；radio-core/stt-core
//      仅「ocr-core 九代同款 IIFE」注释、不含 Tesseract 命名空间，零误报）。
//   B. phosphor/Phosphor.woff2：真身仅被 vendor/phosphor/style.css @font-face 内部引用 →
//      消费方 = phosphor/style.css 的消费方（R154 实测：全仓仅 dice/index.html 一家引用）。
//
// 边界：本生成器只读源码树 + dist 清单，零改动零搬迁；「预缓存字节账」以盘上 dist/ 为准
// （未构建时 precache=null 如实登记）；#280 建议②③施工方案与锚面漂移预登记见
// docs/perf/dice-vendor-load-audit.md（本卷零施工，防与 #284 批 5 滚版竞速）。

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(new URL('..', import.meta.url).pathname);
const VENDOR = join(ROOT, 'ios-desktop/apps/_shared/vendor');
const OUT = join(ROOT, 'docs/audits/vendor-consumers.json');
const PRECACHE_MANIFEST = join(ROOT, 'dist/precache-manifest.json');

// ---------- ① vendor 全目录枚举 ----------
function* walk(p) {
  for (const e of readdirSync(p)) {
    const f = join(p, e);
    const st = statSync(f);
    if (st.isDirectory()) yield* walk(f);
    else yield f;
  }
}
const vendorFiles = [...walk(VENDOR)].sort();

// ---------- ② 消费面源文件枚举 ----------
function* walkSrc(p) {
  const st = statSync(p);
  if (st.isFile()) { if (/\.(html|js|mjs)$/.test(p)) yield p; return; }
  for (const e of readdirSync(p)) {
    if (e === 'node_modules' || e === 'aosp' || e === '_shared') continue;
    yield* walkSrc(join(p, e));
  }
}
const srcRoots = ['ios-desktop/apps', 'ios-desktop/js', 'index.html', 'ios-desktop/index.html', 'launch.html', 'sw.js']
  .map((r) => join(ROOT, r))
  .filter((p) => existsSync(p));
// needle 覆写表：basename 非唯一（子串误吞风险）的文件用路径尾段精确匹配。
//   R154 实证两处：'worker.min.js'（ocr）会被 'pdf.worker.min.js' 引用误吞；
//   'style.css'（phosphor）会误吞任意自身 css 引用文本。其余 basename 全目录唯一。
const NEEDLE_OVERRIDE = {
  'ocr/worker.min.js': 'ocr/worker.min.js',
  'phosphor/style.css': 'phosphor/style.css',
};
const sources = [];
for (const r of srcRoots) {
  for (const f of walkSrc(r)) sources.push(f);
}
const srcTexts = new Map(
  sources.sort().map((f) => [f, readFileSync(f, 'utf8')]),
);

function kindOf(f) {
  const rel = relative(ROOT, f);
  if (rel === 'index.html' || rel === 'ios-desktop/index.html') return 'shell';
  if (rel === 'launch.html') return 'shell';
  if (rel === 'sw.js') return 'sw';
  if (rel.startsWith('ios-desktop/apps/')) return 'app';
  return 'js';
}
function refName(f) {
  const rel = relative(ROOT, f);
  if (rel === 'index.html') return 'root-shell';
  if (rel === 'ios-desktop/index.html') return 'desktop-shell';
  if (rel === 'launch.html') return 'launch';
  if (rel === 'sw.js') return 'sw';
  if (rel.startsWith('ios-desktop/apps/')) return rel.split('/')[2];
  return rel.split('/').pop();
}

// ---------- ③ 消费方判定（字面 basename + 专案 A/B） ----------
function consumersFor(vf) {
  const rel = relative(VENDOR, vf); // e.g. 'three.module.js' / 'ocr/langs/eng.traineddata.gz'
  const base = rel.split('/').pop();
  const resolution = 'literal';
  let consumers = [];
  if (rel.startsWith('ocr/langs/') || /tesseract-core-.*\.wasm\.js$/.test(base) || base === 'tesseract-bundle.mjs') {
    // 专案 A：tesseract 家族运行时构造装载
    consumers = [...srcTexts.entries()].filter(([, t]) => /[Tt]esseract/.test(t)).map(([f]) => f);
    return { consumers, resolution: 'tesseract-namespace' };
  }
  if (rel === 'phosphor/Phosphor.woff2') {
    // 专案 B：经 phosphor/style.css @font-face 传递消费
    const cssConsumers = [...srcTexts.entries()]
      .filter(([, t]) => t.includes('phosphor/style.css'))
      .map(([f]) => f);
    consumers = cssConsumers;
    return { consumers, resolution: 'via-phosphor-style.css' };
  }
  // 字面 needle（默认 basename；覆写表内文件用路径尾段）
  const needle = NEEDLE_OVERRIDE[rel] || base;
  consumers = [...srcTexts.entries()]
    .filter(([f, t]) => f !== vf && t.includes(needle))
    .map(([f]) => f);
  return { consumers, resolution };
}

// ---------- ④ dist/precache 交叉引用 ----------
let precache = null;
let precacheFiles = [];
if (existsSync(PRECACHE_MANIFEST)) {
  const m = JSON.parse(readFileSync(PRECACHE_MANIFEST, 'utf8'));
  precacheFiles = m.files || [];
  precache = true;
}

// ---------- 组装 ----------
const outFiles = vendorFiles.map((vf) => {
  const relVendor = relative(VENDOR, vf);
  const relRoot = relative(ROOT, vf); // ios-desktop/apps/_shared/vendor/<rel>
  const st = statSync(vf);
  const { consumers, resolution } = consumersFor(vf);
  const distPath = join(ROOT, 'dist', relRoot);
  const hasDist = existsSync(distPath);
  const precached = precacheFiles.includes(relRoot.split('/').join('/'));
  // 去重：同 kind+ref 多文件命中（index.html + app.mjs 双引用）合并为一消费方
  const seen = new Map();
  for (const f of consumers) {
    const k = kindOf(f) + ':' + refName(f);
    if (!seen.has(k)) seen.set(k, { kind: kindOf(f), ref: refName(f) });
  }
  const entry = {
    path: 'vendor/' + relVendor.split('/').join('/'),
    bytes: st.size,
    distPath: 'dist/' + relRoot,
    distBytes: hasDist ? statSync(distPath).size : null,
    precache: precached,
    resolution,
    consumers: [...seen.values()].sort((a, b) => (a.kind + a.ref).localeCompare(b.kind + b.ref)),
    consumerCount: 0,
    classification: '',
  };
  entry.consumerCount = entry.consumers.length;
  entry.classification = entry.consumerCount === 0 ? 'orphan' : entry.consumerCount === 1 ? 'single-consumer' : 'shared';
  return entry;
});

const totals = {
  files: outFiles.length,
  sourceBytes: outFiles.reduce((a, f) => a + f.bytes, 0),
  distBytes: outFiles.reduce((a, f) => a + (f.distBytes || 0), 0),
  precacheEntries: outFiles.filter((f) => f.precache).length,
  precacheBytes: outFiles.reduce((a, f) => a + (f.precache ? f.distBytes || 0 : 0), 0),
  orphans: outFiles.filter((f) => f.classification === 'orphan').length,
  singleConsumer: outFiles.filter((f) => f.classification === 'single-consumer').length,
  shared: outFiles.filter((f) => f.classification === 'shared').length,
};

const doc = {
  schema: 1,
  generator: 'scripts/gen-vendor-audit.mjs（#280 · 零依赖无时间戳逐字节可重现）',
  vendorRoot: 'ios-desktop/apps/_shared/vendor',
  scanRoots: ['ios-desktop/apps（_shared 除外）', 'ios-desktop/js（aosp 除外）', 'index.html', 'ios-desktop/index.html', 'launch.html', 'sw.js'],
  resolutionRules: {
    literal: '字面 basename 匹配',
    'tesseract-namespace': '#280 专案 A：ocr/langs + tesseract-core wasm + tesseract-bundle 经 [Tt]esseract 运行时构造装载',
    'via-phosphor-style.css': '#280 专案 B：Phosphor.woff2 仅被 phosphor/style.css @font-face 内部引用 → 消费方传递',
  },
  precacheManifest: precache ? 'dist/precache-manifest.json（dist 全产物扫描自动纳入，vite.config.js copyStaticAndPrecache）' : null,
  totals,
  files: outFiles,
};

const json = JSON.stringify(doc, null, 2) + '\n';

const write = process.argv.includes('--write');
if (write) {
  writeFileSync(OUT, json);
  console.log(`[gen-vendor-audit] written ${relative(ROOT, OUT)}（files=${totals.files} precache=${totals.precacheEntries} orphans=${totals.orphans} single=${totals.singleConsumer} shared=${totals.shared}）`);
} else {
  if (!existsSync(OUT)) {
    console.error('[gen-vendor-audit] 盘上生成件缺失：docs/audits/vendor-consumers.json（先 --write 落库）');
    process.exit(1);
  }
  const disk = readFileSync(OUT, 'utf8');
  if (disk !== json) {
    console.error('[gen-vendor-audit] 生成件漂移：盘上 docs/audits/vendor-consumers.json 与重生成不一致（禁手改，单真源纪律）');
    process.exit(1);
  }
  console.log(`[gen-vendor-audit] --check PASS（files=${totals.files} precache=${totals.precacheEntries} orphans=${totals.orphans} single=${totals.singleConsumer} shared=${totals.shared}）`);
}
