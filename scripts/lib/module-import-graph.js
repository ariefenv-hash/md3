// ==================== module-import-graph.js — ESM 相对 import 图纯逻辑核（#260） ====================
//
// 背景（#260 根因）：apps/clock-app/{alarm,timer}.mjs 内部 `import ... from
// '../../js/aosp/alarm-ringtone.js'`——mjs 文件之间的 import 不在 vite 1.6 复制
// 通道的扫描范围（那只扫 apps/**/index.html 内的 '../../js/' 引用）→
// alarm-ringtone.js 从未进 dist → 线上时钟模块图整链静默崩两周（module script
// 404 只报 console error，零 pageerror，三道防线全漏）。
//
// 本核是三道防线共用的单一真源（#256 scripts/lib 先例同律）：
//   ① vite.config.js 1.65 段：dist 内全部 .js/.mjs 的相对 import 闭包 → 缺的
//      从源码补复制（不动点循环）——构建期自动补盲区，此后任何 mjs→js/ 的新
//      import 不再依赖人工白名单
//   ② verify-dist.mjs ②段：引用闭合从「HTML 级」升到「模块图级」——dist 内
//      全部 .js/.mjs 的相对 import 逐一验存在，缺即红
//   ③ e2e-dist-smoke.mjs：同源资源 console error 监控（404 形态一道即拦）
//
// 纪律：纯逻辑零 DOM 零网络零 Node 专属 API（IO 全部注入），供 vitest 直测。

/**
 * 从 ESM 代码文本提取全部【相对 import】说明符（'./' 或 '../' 开头）。
 * 覆盖三类写法：
 *   1) 静态具名/命名空间：import { x } from './y.js' / import * as ns from './y.js' / import def from './y.js'
 *   2) 副作用导入：import './y.js'
 *   3) 动态导入：import('./y.js')（含 await import("./y.js")）
 * export ... from './y.js'（re-export）同样收口（语义上也是运行时依赖）。
 * 豁免：裸包名（'vue'）、绝对路径（'/assets/x.js'）、URL（'https://...'）、
 *       Vite 前缀（'virtual:xxx'）——均不以 './' 或 '../' 开头，天然不匹配。
 * 已剥注释的输入由调用方负责（本函数不做注释剥离，正则按字面匹配；
 *   字符串字面量里的伪 import 代码极罕见，且误收只会导致「多验证一个存在性」，
 *   不产生漏报方向的风险——安全侧偏差设计）。
 * @param {string} code
 * @returns {string[]} 去重后的相对 import 说明符（保序）
 */
export function extractRelImports(code) {
  if (typeof code !== 'string') return [];
  const out = [];
  const seen = new Set();
  // 三类合一：static/re-export（from '...'）| side-effect（import '...'）| dynamic（import('...')）
  // 说明符允许单双引号；rel 要求是 ./ 或 ../ 开头的合法相对段
  const RE = /(?:\bfrom\s*|\bimport\s*\(?\s*|\bexport\s+[\s\S]*?\bfrom\s*)["'](\.{1,2}\/[^"'`\\]+)["']/g;
  for (const m of code.matchAll(RE)) {
    const spec = m[1];
    if (!spec || spec.endsWith('/')) continue; // 目录级 import 非法（浏览器 ESM 要求文件），跳过
    if (!seen.has(spec)) { seen.add(spec); out.push(spec); }
  }
  return out;
}

/**
 * 解析相对 import 说明符为规范路径（posix 语义，调用方保证 baseDir/spec 均为
 * posix 风格）。无扩展名说明符按浏览器 ESM 无自动后缀解析的实际项目约定，
 * 依次尝试补 '.js' / '.mjs' / '/index.js' / '/index.mjs'；带扩展名直接归一。
 * @param {string} baseDir 说明符所在文件的目录（posix，如 'ios-desktop/apps/clock-app'）
 * @param {string} spec 相对说明符（'../../js/aosp/alarm-ringtone.js'）
 * @returns {string|null} 规范 posix 路径；越出根（spec 上跳超界）返回 null
 */
export function resolveImportPath(baseDir, spec) {
  if (typeof baseDir !== 'string' || typeof spec !== 'string' || !baseDir || !spec) return null;
  if (!spec.startsWith('./') && !spec.startsWith('../')) return null;
  // 越界防护：'..' 上跳数超过 baseDir 深度即越出根（pathPosixJoin 会静默吞掉
  // 越界的 '..'，须在 join 前显式计数——否则 '../../../../x' 会归一成 'x'）
  const depth = baseDir === '.' ? 0 : baseDir.split('/').filter(Boolean).length;
  let ups = 0;
  for (const seg of spec.split('/')) if (seg === '..') ups++;
  if (ups > depth) return null;
  const joined = pathPosixNormalize(pathPosixJoin(baseDir, spec));
  if (!joined || joined === '.' || joined.startsWith('..')) return null;
  return joined;
}

/**
 * 带候选扩展名枚举的解析：返回全部候选（调用方逐个 exists 探测）。
 * 有扩展名 → 单候选；无扩展名 → ['', '.js', '.mjs', '/index.js', '/index.mjs'] 组合。
 * @param {string} baseDir
 * @param {string} spec
 * @returns {string[]} 候选规范路径列表（可能为空 = 非法说明符）
 */
export function resolveImportCandidates(baseDir, spec) {
  const base = resolveImportPath(baseDir, spec);
  if (!base) return [];
  if (/\.(js|mjs|css|json|cjs|jsx|ts|tsx)$/i.test(base)) return [base];
  return [
    base,
    `${base}.js`,
    `${base}.mjs`,
    `${base}/index.js`,
    `${base}/index.mjs`,
  ];
}

/**
 * import 闭包遍历（不动点）：从 entries 出发，沿相对 import 递归，全部读到内容
 * 的文件进入 visited；import 目标在任何候选路径下都不存在 → 记入 missing。
 * 循环引用（a↔b）由 visited 集天然终止，不死循环。
 * IO 全注入（readFile(path)→string|null、exists(path)→boolean），纯逻辑可测。
 * @param {object} opts
 * @param {string[]} opts.entries 起始文件路径集（posix，相对调用方根）
 * @param {string} opts.rootDir 闭包遍历的根（resolve 越出该根即 missing/终止）
 * @param {(p:string)=>string|null} opts.readFile
 * @param {(p:string)=>boolean} opts.exists
 * @returns {{visited:string[], missing:{from:string,spec:string,resolved:string[]}[]}}
 */
export function collectImportClosure({ entries, rootDir, readFile, exists }) {
  const visited = new Set();
  const missing = [];
  const queue = [...(entries || [])];
  while (queue.length) {
    const cur = queue.shift();
    if (!cur || visited.has(cur)) continue;
    visited.add(cur);
    const code = readFile(cur);
    if (code == null) continue; // 读不到内容的文件（调用方语义：不在本测域），不发散
    const baseDir = cur.includes('/') ? cur.slice(0, cur.lastIndexOf('/')) : '.';
    for (const spec of extractRelImports(code)) {
      const candidates = resolveImportCandidates(baseDir, spec);
      if (!candidates.length) continue;
      const hit = candidates.find((c) => exists(c));
      if (hit) {
        if (!visited.has(hit)) queue.push(hit);
      } else {
        missing.push({ from: cur, spec, resolved: candidates });
      }
    }
  }
  return { visited: [...visited], missing };
}

// ---------- 极简 posix path 工具（与 node:path.posix 同语义的最小子集，零依赖） ----------
function pathPosixJoin(...segs) {
  const parts = [];
  for (const s of segs.join('/').split('/')) {
    if (!s || s === '.') continue;
    if (s === '..') parts.pop();
    else parts.push(s);
  }
  return parts.join('/');
}
function pathPosixNormalize(p) {
  return pathPosixJoin(p);
}
