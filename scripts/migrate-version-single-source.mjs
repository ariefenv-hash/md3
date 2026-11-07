#!/usr/bin/env node
/**
 * migrate-version-single-source.mjs — 版本消费面一次性迁移脚本（#223 ③，幂等可重跑）
 *
 * 迁移内容：
 *   M1 sw.js：const VERSION = 'geek-vN' 化石 → '__SW_VERSION__' 占位（真源构建注入）；
 *      已是占位则 no-op。
 *   M2 settings.js：版本提取链后若无「__SW_VERSION__ → dev」回退行则插入
 *      （幂等锚：indexOf('__') === 0）。
 *   M3 README：核对技术描述与版本块 sync 状态（只核对不代写——README 块由
 *      npm run version:sync / roll-version.py 管理，史实注记按 #205 契约一概不动）。
 *
 * 用法：
 *   node scripts/migrate-version-single-source.mjs               # 实迁移（幂等）
 *   node scripts/migrate-version-single-source.mjs --dry-run     # 预览不落盘
 *   node scripts/migrate-version-single-source.mjs --root <dir>  # 指定根（测试用）
 * 退出码：0 完成（含 no-op）；1 迁移失败（化石形态缺失等）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const get = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const root = get('--root') ? path.resolve(get('--root')) : process.cwd();
const dry = args.includes('--dry-run');
const actions = [];

// M1 sw.js
const swPath = path.join(root, 'sw.js');
let sw = readFileSync(swPath, 'utf-8');
if (sw.includes("const VERSION = '__SW_VERSION__';")) {
  actions.push('M1 sw.js：已是 __SW_VERSION__ 占位（no-op）');
} else {
  const re = /const VERSION = 'geek-v\d+[^']*';/;
  if (!re.test(sw)) {
    console.error('M1 sw.js：未找到 geek-vN 化石赋值行，无法自动迁移（人工核对）');
    process.exit(1);
  }
  if (!dry) writeFileSync(swPath, sw.replace(re, "const VERSION = '__SW_VERSION__';"), 'utf-8');
  actions.push(`M1 sw.js：化石 VERSION → __SW_VERSION__ 占位${dry ? '（dry-run 未落盘）' : ''}`);
}

// M2 settings.js（文件缺失/不可读时跳过不阻断——迁移工具对可选面必须容忍）
const stPath = path.join(root, 'ios-desktop', 'js', 'apps', 'settings.js');
let st = null;
try {
  st = readFileSync(stPath, 'utf-8');
} catch {
  actions.push('M2 settings.js：不可读，跳过（可选面）');
}
if (st !== null) {
  if (st.includes("indexOf('__') === 0")) {
    actions.push('M2 settings.js：dev 回退已存在（no-op）');
  } else {
    const anchor = /( {16}var v = \(t\.match\(\/const VERSION = '\(\[\^'\]\+\)'\/\) \|\| \[''\]\)\[1\];\n)/;
    if (!anchor.test(st)) {
      actions.push('M2 settings.js：未找到版本提取行，跳过（人工核对）');
    } else {
      if (!dry) {
        st = st.replace(
          anchor,
          (m) =>
            m +
            "                // #223：构建注入后 VERSION 为真源版本；源树未构建态提取到的是\n" +
            "                // __SW_VERSION__ 占位符，映射为 dev 展示，不透传双下划线化石。\n" +
            "                if (v && v.indexOf('__') === 0) v = 'dev';\n",
        );
        writeFileSync(stPath, st, 'utf-8');
      }
      actions.push(`M2 settings.js：插入 dev 回退行${dry ? '（dry-run 未落盘）' : ''}`);
    }
  }
}

// M3 README 核对（不代写）
try {
  const rd = readFileSync(path.join(root, 'README.md'), 'utf-8');
  if (rd.includes('__SW_VERSION__')) actions.push('M3 README：技术描述已含构建注入表述（no-op）');
  else actions.push('M3 README：技术描述待更新（本脚本不代写，随交付提交更新）');
} catch {
  actions.push('M3 README：不可读，跳过');
}

console.log('版本单一真源迁移（#223 ③）：');
for (const a of actions) console.log('  ' + a);
console.log(dry ? 'dry-run 完成，未落盘' : '迁移完成（幂等，可重跑）');
