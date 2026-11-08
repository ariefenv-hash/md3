// ==================== scan-globals.mjs — window.__ 全局命名空间全库扫描器（v10.48 #242） ====================
// 议题 #242 建议①：为 window.__ 全局建登记表（名字/定义文件/消费方/类别/加载序契约）。
// 本脚本是登记表的单一真源生成器：
//   node scripts/scan-globals.mjs            → 写 docs/globals-registry.json + docs/globals-registry.md
//   node scripts/scan-globals.mjs --check    → 只校验源树与登记表一致（不一致 exit 1，供 CI/手跑）
// 纯函数（extractGlobals/classify）可被 tests/v242 直接 import 锚定；扫描范围：ios-desktop/**/*.{js,mjs,html}，
// 豁免 *.min.js（vendor）与 dist（构建产物非源）。括号形式 window["__X"] 全库实测为零，不设规则（负向锚在测试）。
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOTS = ['ios-desktop'];
const SKIP_PARTS = new Set(['node_modules', 'dist', '.git']);
const NAME_RE = /window\.(__[a-zA-Z0-9_]+)/g;
const DEF_RE = /window\.(__[a-zA-Z0-9_]+)\s*=[^=]/;

/** 议题点名的刻意契约面（SDK 门面/测试钩子）——人工确认清单，新名字进这表需在登记表备注理由 */
export const CURATED_KINDS = {
  __system: 'sdk-facade',
  __systemSDK: 'sdk-facade',
  __pkgInstallerAPI: 'sdk-facade',
  __m3eMini: 'sdk-facade',
  __m3ePull: 'sdk-facade',
  __chatbotCore: 'sdk-facade',
  __messagesRichCore: 'sdk-facade',
  // #281 错误捕获层：刻意契约的只读消费 API 门面（本地错误面板/驾驶舱/简报消费方
  // 以守卫式访问 window.__md3ErrorHub && 取数；零后端零上报边界见 error-hub.js 头注）
  __md3ErrorHub: 'sdk-facade',
  __clockCore: 'implicit-coupling',
  __chessCore: 'implicit-coupling',
  __sttTest: 'test-hook',
  __chessTest: 'test-hook',
};

/** 类别判定：先查人工清单，再按名字形态（*Test → 测试钩子），其余归隐式耦合/契约（待人工复核） */
export function classify(name) {
  if (CURATED_KINDS[name]) return CURATED_KINDS[name];
  if (/Test$|^__test/.test(name)) return 'test-hook';
  return 'implicit-coupling';
}

/** 单文件提取：返回 { names: Set, definers: Set }（definer = window.__X = 赋值形态，== 排除） */
export function extractGlobals(src) {
  const names = new Set();
  const definers = new Set();
  let m;
  NAME_RE.lastIndex = 0;
  while ((m = NAME_RE.exec(src)) !== null) names.add(m[1]);
  const lines = src.split('\n');
  for (const line of lines) {
    const d = line.match(DEF_RE);
    if (d) definers.add(d[1]);
  }
  return { names, definers };
}

/** 全库扫描：返回有序 Map name -> { definers:[], consumers:[], kind }（路径为仓库相对 POSIX） */
export function scanSource(rootDir = ROOT, scanRoots = SCAN_ROOTS) {
  const found = new Map(); // name -> { definers:Set, consumers:Set }
  const ensure = (name) => {
    if (!found.has(name)) found.set(name, { definers: new Set(), consumers: new Set() });
    return found.get(name);
  };
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (SKIP_PARTS.has(entry)) continue;
      const abs = join(dir, entry);
      const st = statSync(abs);
      if (st.isDirectory()) { walk(abs); continue; }
      if (!/\.(js|mjs|html)$/.test(entry)) continue;
      if (/\.min\.js$/.test(entry)) continue;
      const rel = relative(rootDir, abs).split('\\').join('/');
      let src;
      try { src = readFileSync(abs, 'utf8'); } catch (e) { continue; }
      const { names, definers } = extractGlobals(src);
      for (const n of names) ensure(n).consumers.add(rel);
      for (const n of definers) ensure(n).definers.add(rel);
    }
  };
  for (const r of scanRoots) walk(join(rootDir, r));
  const out = new Map();
  for (const name of [...found.keys()].sort()) {
    const v = found.get(name);
    out.set(name, {
      definers: [...v.definers].sort(),
      consumers: [...v.consumers].sort(),
      kind: classify(name),
    });
  }
  return out;
}

/** 登记表 JSON 结构（确定性：无时间戳/无随机，key 已排序，保证逐字节可复现） */
export function toRegistryJSON(scanned) {
  const names = {};
  for (const [name, v] of scanned) {
    names[name] = { kind: v.kind, definers: v.definers, consumers: v.consumers };
  }
  return JSON.stringify({ registry: 'window.__ globals', names }, null, 2) + '\n';
}

/** 校验：重扫源树并与登记 JSON 对账；返回 { ok, added:[], removed:[] } */
export function checkRegistry(rootDir = ROOT) {
  const jsonPath = join(rootDir, 'docs/globals-registry.json');
  if (!existsSync(jsonPath)) return { ok: false, error: 'missing docs/globals-registry.json（先跑 node scripts/scan-globals.mjs 生成）' };
  let registered;
  try { registered = JSON.parse(readFileSync(jsonPath, 'utf8')).names; } catch (e) { return { ok: false, error: 'registry JSON 解析失败: ' + e.message }; }
  const now = scanSource(rootDir);
  const added = [...now.keys()].filter((n) => !registered[n]);
  const removed = Object.keys(registered).filter((n) => !now.has(n));
  return { ok: added.length === 0 && removed.length === 0, added, removed };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  if (checkOnly) {
    const r = checkRegistry();
    if (r.error) { console.error('[scan-globals] FAIL：' + r.error); process.exit(1); }
    if (!r.ok) {
      console.error('[scan-globals] FAIL：登记表与源树不一致');
      if (r.added.length) console.error('  未登记新全局（先补登记表并给分类）：' + r.added.join(', '));
      if (r.removed.length) console.error('  登记表冗余项（源树已无）：' + r.removed.join(', '));
      process.exit(1);
    }
    console.log('[scan-globals] 登记表与源树一致 ✓');
    return;
  }
  const scanned = scanSource();
  writeFileSync(join(ROOT, 'docs/globals-registry.json'), toRegistryJSON(scanned));
  writeFileSync(join(ROOT, 'docs/globals-registry.md'), toRegistryMD(scanned));
  const kinds = {};
  for (const v of scanned.values()) kinds[v.kind] = (kinds[v.kind] || 0) + 1;
  console.log(`[scan-globals] 共 ${scanned.size} 个全局：` + Object.entries(kinds).map(([k, n]) => `${k}=${n}`).join(' / '));
  console.log('[scan-globals] 已写 docs/globals-registry.json + docs/globals-registry.md');
}

// ---------- MD 生成（确定性内容；表列：名字/类别/定义文件/消费文件） ----------
export function toRegistryMD(scanned) {
  const lines = [];
  lines.push('# window.__ 全局命名空间登记表（v10.48 #242）');
  lines.push('');
  lines.push('> **本文档由 `node scripts/scan-globals.mjs` 生成**（单一真源 = `docs/globals-registry.json`，本 md 供人读）');
  lines.push('> 手工编辑无效——修改分类请改脚本内 `CURATED_KINDS` 后重新生成；源树出现未登记全局时构建与 CI 双闸 fail（vite.config.js 断言 + tests/v242 一致性锚）。');
  lines.push('');
  lines.push('## 背景（#242）');
  lines.push('');
  lines.push('#226 修复了 stopwatch 顶层直读 `window.__clockCore` 崩溃的单点，但其土壤——无登记的全局命名空间——此前是全库常态。本表把「谁定义、谁消费、属于什么类别」固化为可机检清单：');
  lines.push('');
  lines.push('- **sdk-facade**：刻意契约的 SDK 门面/共享组件挂载点（__system / __m3eMini / __m3ePull / __pkgInstallerAPI / __chatbotCore / __messagesRichCore 等），消费方以守卫式访问（`window.__X &&`）为契约；');
  lines.push('- **test-hook**：测试钩子（*Test 命名或人工确认），仅供自动化锚定；');
  lines.push('- **implicit-coupling**：模块间隐式耦合——classic script 暴露、他处消费（#226 型加载顺序脆弱点所在），**整改方向 = 惰性访问器**（alarm instCore / v10.36 ensureSw 范式已在库，推广即可不新造轮子）。');
  lines.push('');
  const rows = [...scanned.entries()];
  lines.push(`## 清单（共 ${rows.length} 个全局）`);
  lines.push('');
  lines.push('| 名字 | 类别 | 定义文件（window.__X =） | 消费文件数 | 消费文件 |');
  lines.push('|---|---|---|---|---|');
  for (const [name, v] of rows) {
    const def = v.definers.length ? v.definers.map((p) => '`' + p + '`').join('<br>') : '（无赋值形态·仅读取）';
    const cons = v.consumers;
    const consCell = cons.length <= 3
      ? cons.map((p) => '`' + p + '`').join('<br>')
      : '`' + cons[0] + '`' + ' …等 ' + cons.length + ' 处';
    lines.push(`| ${name} | ${v.kind} | ${def} | ${cons.length} | ${consCell} |`);
  }
  lines.push('');
  lines.push('## 加载序契约与整改路线（建议③·不新造轮子）');
  lines.push('');
  lines.push('- 定义文件与消费文件**跨文件**的名字即潜在加载序脆弱点：classic 脚本按 `<script>` 文档序同步执行，iframe 应用晚于宿主壳层；跨形态（宿主↔iframe）依赖必须走 `window.addEventListener(\'message\')` / `__system` 总线或守卫式惰性访问器，不得顶层直读。');
  lines.push('- 消费方整改范式（在库先例）：`alarm.mjs` instCore 注入 / `v10.36 ensureSw` 懒就绪——推广顺序按「implicit-coupling × 跨文件」子集逐名推进，每名一处惰性化即从脆弱点清单除名（届时更新本表备注）。');
  lines.push('- 关联 #169（SDK 面）/ #226（单点实锤与修复范式）/ #230（CI 评分卡同机制）/ #156（兄弟引用断言同机制）。');
  lines.push('');
  return lines.join('\n') + '\n';
}

const IS_MAIN = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (IS_MAIN) {
  main();
}
