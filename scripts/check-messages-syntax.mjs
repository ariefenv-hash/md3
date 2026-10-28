// scripts/check-messages-syntax.mjs — 提取 messages 页内联脚本做语法校验（v8.56）
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'ios-desktop/apps/messages/index.html'), 'utf8');

const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!blocks.length) { console.error('NO_INLINE_SCRIPT'); process.exit(1); }
let ok = true;
blocks.forEach((code, i) => {
  try {
    // 仅语法检查（不执行——脚本依赖 DOM）
    new Function(code);
    console.log(`inline script #${i + 1}: syntax OK (${code.length} chars)`);
  } catch (e) {
    ok = false;
    console.error(`inline script #${i + 1}: SYNTAX ERROR → ${e.message}`);
    const lines = code.split('\n');
    const m = /<anonymous>:(\d+)/.exec(e.stack || '');
    if (m) {
      const ln = parseInt(m[1], 10) - 2; // Function 包裹偏移
      console.error('  near line', ln, ':', (lines[ln - 1] || '').slice(0, 120));
    }
  }
});
process.exit(ok ? 0 : 1);
