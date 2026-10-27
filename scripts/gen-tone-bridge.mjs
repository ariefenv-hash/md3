#!/usr/bin/env node
// ==================== gen-tone-bridge.mjs — v8.51 #56 tone 桥生成器 ====================
// 根因：tone 14.9.17 的 ESM 构建（build/esm/index.js）含跨模块循环 export * 链，
// esbuild（0.24~0.28 均验）无法静态枚举其导出面 → 消费方 `Tone.Synth` 等命名空间成员
// 访问被折叠为 (void 0) → 运行时 "(void 0) is not a constructor"（DrumKit/Player 构造全崩）。
// 修复：绕开 esbuild 的静态视图——
//   1. tone-umd.mjs：预构建 UMD（build/Tone.js）原样内嵌，ESM 顶层执行挂 self.Tone，
//      随后捕获并还原全局，export default 运行时对象；
//   2. tone-named.mjs：从 UMD 沙箱实跑枚举全部 169 个导出名，逐个具名活绑定
//      （export const Synth = __Tone["Synth"] …），使 magenta 的 `import * as Tone`
//      命名空间成员成为真实具名导出（静态可解析 + 运行时取值）。
// 用法：node scripts/midi-build/gen-tone-bridge.mjs（在 midi-build 目录下执行）
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const keys = JSON.parse(readFileSync('/tmp/tone-keys.json', 'utf8'));
if (!Array.isArray(keys) || keys.length < 100) throw new Error('tone keys 枚举异常: ' + keys.length);

const umdSrc = readFileSync('./node_modules/tone/build/Tone.js', 'utf8');

// ---------- tone-umd.mjs ----------
const umdOut = `// ==================== tone-umd.mjs — tone 14.9.17 预构建 UMD 内嵌（AUTO-GENERATED） ====================
// 由 scripts/midi-build/gen-tone-bridge.mjs 生成。为何不直接 bundle tone 的 ESM：
// 其 export * 循环链使 esbuild 静态导出面残缺，命名空间成员被折叠为 void 0（真机实证
// "(void 0) is not a constructor"）。UMD 分支在 ESM 顶层走 t.Tone=e()（挂 self），
// 本文件随后捕获、还原全局并 default 导出运行时对象。
const __prevTone = typeof self !== 'undefined' ? self.Tone : undefined;

${umdSrc}

const Tone = typeof self !== 'undefined' && self.Tone
  ? self.Tone
  : typeof globalThis !== 'undefined' && globalThis.Tone ? globalThis.Tone : undefined;
if (typeof self !== 'undefined') {
  if (__prevTone === undefined) delete self.Tone;
  else self.Tone = __prevTone;
}
export default Tone;
`;
writeFileSync('./tone-umd.mjs', umdOut);

// ---------- tone-named.mjs ----------
const bad = keys.filter((k) => !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k));
if (bad.length) throw new Error('非法导出名: ' + bad.join(','));
const lines = keys.map((k) => `export const ${k} = __Tone[${JSON.stringify(k)}];`);
const namedOut = `// ==================== tone-named.mjs — tone 全量具名活绑定（AUTO-GENERATED） ====================
// 由 scripts/midi-build/gen-tone-bridge.mjs 从 UMD 沙箱实跑枚举（${keys.length} 个导出）生成。
// magenta 的 \`import * as Tone from 'tone'\` 经 esbuild alias 到本文件后，
// 命名空间成员 = 真实具名导出（运行时从 UMD 对象取值），静态折叠 void 0 根治。
import __Tone from './tone-umd.mjs';
if (!__Tone) throw new Error('tone UMD 装载失败（self 全局不可用）');

${lines.join('\n')}

export default __Tone;
`;
writeFileSync('./tone-named.mjs', namedOut);
console.log(`tone-umd.mjs + tone-named.mjs 生成完成（${keys.length} 导出）`);
