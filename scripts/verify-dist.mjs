// ==================== verify-dist.mjs — dist 产物完整性自校验（#139 ①③） ====================
//
// 背景（#138 事故复盘）：v8.40~v8.63 新增 14 个 *-core.js 从未进入构建静态通道，
// dist 缺 16 个文件、15 个应用在部署版静默失效；本地源码目录齐全 + e2e 只跑源码
// → 三重掩盖（e2e 源码档 / 构建日志数字正常 / SW 清单由 dist 扫描生成无告警）。
// vite.config.js 收尾断言（v8.94 #138 修复）只覆盖「js 引用 → dist 就位」一环；
// 本脚本是【构建完成后对最终产物的独立复核】——最小权限原则：不信任构建过程，
// 只信任产物，且补齐三块构建期断言管不到的面：
//
//   ① 应用目录平行：源码 ios-desktop/apps/<dir>/index.html 与 dist 一一对应
//      （防子应用 HTML 漏复制——构建期白名单只管 js，不管 HTML 目录清单漂移）
//   ② 引用闭合（最终产物档）：扫描 dist 内全部应用 HTML 的相对引用
//      （src/href/import from），逐个解析到 dist 内文件必须存在——这是对
//      压缩后产物的复核，能抓住「压缩器改写损坏引用」这类构建期断言测不到的问题
//   ③ precache 清单自洽（双向）：precache-manifest.json 的每个 URL 必须真实
//      存在于 dist 且非空文件；反之 dist 内每个文件（除清单自身）必须在清单里
//      ——SW「缓存了但线上 404」与「文件在但 SW 永不缓存」两个方向一起堵死
//
// 用法：npm run build 后运行 node scripts/verify-dist.mjs（CI 与本地 check:dist 同源）
// 退出码：0 = 全部通过；1 = 任何断言失败（错误逐条列出）
//
// 本议题只做校验层，不改任何应用代码（#139 注意条款）。

import { readdirSync, statSync, readFileSync, existsSync, stat } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(rootDir, 'dist');
const PRECACHE_MANIFEST_NAME = 'precache-manifest.json';

const errors = [];
const notes = [];
const err = (msg) => errors.push(msg);
const note = (msg) => notes.push(msg);

// ---------- 0) dist 存在性 ----------
if (!existsSync(distDir)) {
  console.error('[verify-dist] dist/ 不存在 —— 先执行 npm run build 再校验');
  process.exit(1);
}

// ---------- 工具：递归列文件（dist 相对路径，/ 分隔） ----------
function walkRel(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const s = statSync(abs);
    if (s.isDirectory()) out.push(...walkRel(abs, base));
    else out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
  return out;
}

const distFiles = walkRel(distDir);
const distSet = new Set(distFiles);
note(`dist 文件总数：${distFiles.length}`);

// ---------- ① 应用目录平行 ----------
const srcAppsDir = path.join(rootDir, 'ios-desktop', 'apps');
const srcAppDirs = readdirSync(srcAppsDir).filter(
  (d) => d !== '_shared' && statSync(path.join(srcAppsDir, d)).isDirectory()
);
let appHtmlCount = 0;
for (const dir of srcAppDirs) {
  const rel = `ios-desktop/apps/${dir}/index.html`;
  if (!distSet.has(rel)) {
    err(`① 应用目录漏复制：源码 ${rel} 在 dist 中缺失`);
  } else {
    appHtmlCount++;
    const st = statSync(path.join(distDir, rel));
    if (st.size === 0) err(`① 应用 HTML 为空文件：${rel}`);
  }
}
note(`① 应用目录平行：源码 ${srcAppDirs.length} 个应用，dist 命中 ${appHtmlCount} 个 index.html`);

// ---------- ② 引用闭合（最终产物档） ----------
// 相对引用三类：<script src>、<link href>、ESM import/export from —— 覆盖 #138 的
// 经典 <script src="../../js/x.js"> 与 v7.61 的 `from '../../js/x.js'` 两种写法。
const REF_RE = /(?:src|href)\s*=\s*["'](\.{1,2}\/[^"'#?]+)["']|\b(?:from|import)\s*["'](\.{1,2}\/[^"'#?]+)["']/g;
let refTotal = 0;
for (const rel of distFiles) {
  if (!rel.startsWith('ios-desktop/apps/') || !rel.endsWith('.html')) continue;
  const html = readFileSync(path.join(distDir, rel), 'utf-8');
  const baseDir = path.posix.dirname(rel); // ios-desktop/apps/<dir>
  for (const m of html.matchAll(REF_RE)) {
    const ref = m[1] || m[2];
    if (!ref) continue;
    refTotal++;
    // 与浏览器一致：相对 HTML 所在目录解析（query/hash 已剥）
    const resolved = path.posix.normalize(path.posix.join(baseDir, ref));
    if (!distSet.has(resolved)) {
      err(`② 引用悬空：${rel} → ${ref}（解析为 ${resolved}，dist 中不存在）`);
    } else if (statSync(path.join(distDir, resolved)).size === 0) {
      err(`② 引用目标为空文件：${rel} → ${resolved}`);
    }
  }
}
note(`② 引用闭合：扫描应用 HTML 相对引用 ${refTotal} 个，全部解析到 dist 内文件`);

// ---------- ③ precache 清单自洽（双向） ----------
const manifestRel = PRECACHE_MANIFEST_NAME;
if (!distSet.has(manifestRel)) {
  err(`③ precache 清单缺失：${manifestRel} 不在 dist 中（SW install 将降级为按需缓存，#138 类问题失去最后一道防线）`);
} else {
  let urls;
  try {
    const parsed = JSON.parse(readFileSync(path.join(distDir, manifestRel), 'utf-8'));
    urls = parsed.files;
    if (!Array.isArray(urls)) throw new Error('files 字段不是数组');
  } catch (e) {
    err(`③ precache 清单不可解析：${e.message}`);
    urls = null;
  }
  if (urls) {
    // 3a) 清单 → dist：每个 URL 必须存在且非空（等价 HEAD 非 200/空体的本地判定）
    //     例外：.nojekyll 是 GitHub Pages 约定的哨兵空文件（存在即语义），豁免空体判定
    let emptyCount = 0;
    for (const url of urls) {
      if (!distSet.has(url)) {
        err(`③ 清单指向不存在的文件：${url}（SW install 将对它 404）`);
        continue;
      }
      if (statSync(path.join(distDir, url)).size === 0 && url !== '.nojekyll') {
        emptyCount++;
        err(`③ 清单指向空文件：${url}`);
      }
    }
    // 3b) dist → 清单：每个文件（除清单自身）必须入清单，否则 SW 永不预缓存该文件
    const urlSet = new Set(urls);
    const missingFromManifest = distFiles.filter((f) => f !== manifestRel && !urlSet.has(f));
    for (const f of missingFromManifest) err(`③ 文件未入预缓存清单（SW 永不预缓存）：${f}`);
    note(`③ precache 自洽：清单 ${urls.length} 条 URL 全部就位${emptyCount ? `（空文件 ${emptyCount} 个）` : ''}；dist 侧未入清单文件 ${missingFromManifest.length} 个`);
  }
}

// ---------- 汇总 ----------
console.log('');
for (const n of notes) console.log(`  ✔ ${n}`);
if (errors.length) {
  console.error('');
  console.error(`[verify-dist] 校验失败：${errors.length} 处`);
  for (const e of errors) console.error(`  ✘ ${e}`);
  process.exit(1);
}
console.log('');
console.log('[verify-dist] 全部通过：应用目录平行 / 引用闭合 / precache 双向自洽');
