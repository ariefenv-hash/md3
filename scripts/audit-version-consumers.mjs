#!/usr/bin/env node
/**
 * audit-version-consumers.mjs — 版本消费面登记表 + 单一真源防腐门禁（#223 落地）
 *
 * 真源：package.json "version" 字段（README 版本块由 sync-readme-version.mjs 同源写入）。
 *
 * 实消费面（缺一即 FAIL）：
 *   S0  真源存在且可解析
 *   S1  sw.js          const VERSION = '__SW_VERSION__' 占位注入（禁 geek-vN 化石赋值）
 *   S2  vite.config.js __SW_VERSION__ replaceAll 接线 + package.json 真源读取
 *   S3  settings.js    提取链锚定 const VERSION 赋值行 + 占位符 dev 回退
 *   S4  README.md      版本块「当前版本」== 真源展示形（sync-readme 语义）
 * 登记面（形态登记）：
 *   D1  manifest.webmanifest  version 字段（规范无此字段 → 期望缺省；出现则必须等于展示形）
 *   D2  README.md             技术描述含 __SW_VERSION__ 构建注入表述
 *
 * 展示形归一：10.40.0 → v10.40（padStart 补零不截断 → 10.100.0 → v10.100，
 * #223「长度假设」实证：YZ 计数器按 9.99→10.00 进位惯例永不三位）。
 *
 * 用法：
 *   node scripts/audit-version-consumers.mjs                # 仓库根全量审计（CI/vitest 调用）
 *   node scripts/audit-version-consumers.mjs --root <dir>   # 指定根（漂移行为测试用）
 * 退出码：0 全过；1 任一 FAIL（登记表逐项标注）。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function toDisplayForm(semver) {
  const m = String(semver).trim().match(/^(\d+)\.(\d+)(?:\.(\d+))?$/);
  if (!m) throw new Error(`无法解析版本号：${semver}（期望 X.Y.Z 或 X.Y）`);
  return `v${m[1]}.${String(Number(m[2])).padStart(2, '0')}`;
}

// main 守卫：仅直跑时执行审计并退出；被 vitest import（v223 复用 toDisplayForm）时零副作用，
// 否则顶层 process.exit 会杀掉测试 worker（v223 首跑 33 文件连坐实证）。
const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;

const args = process.argv.slice(2);
const rootIdx = args.indexOf('--root');
const root = rootIdx >= 0 ? path.resolve(args[rootIdx + 1]) : process.cwd();

const rows = [];
const check = (id, ok, desc, detail = '') => rows.push({ id, ok, desc, detail });

let pkg = null;
try {
  pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf-8'));
} catch { /* 真源缺失本身即漂移，下方 S0 记账 */ }

let display = null;
if (!pkg || !pkg.version) {
  check('S0', false, '真源 package.json version 存在', pkg ? 'version 字段缺失' : 'package.json 不可读');
} else {
  try {
    display = toDisplayForm(pkg.version);
    check('S0', true, `真源 package.json version = ${pkg.version}（展示形 ${display}）`);
  } catch (e) {
    check('S0', false, '真源 package.json version 可解析', e.message);
  }
}

const read = (p) => { try { return readFileSync(path.join(root, p), 'utf-8'); } catch { return null; } };

if (display) {
  // S1 sw.js —— VERSION 占位注入
  const sw = read('sw.js');
  if (sw === null) {
    check('S1', false, 'sw.js 存在', '文件不可读');
  } else {
    const placeholder = sw.includes("const VERSION = '__SW_VERSION__';");
    const fossil = /const VERSION = 'geek-v\d+/.test(sw);
    check('S1', placeholder && !fossil, 'sw.js VERSION 占位注入（单一真源）',
      !placeholder ? '未找到 __SW_VERSION__ 占位赋值行' : (fossil ? '仍含 geek-vN 化石赋值' : '__SW_VERSION__ 占位 ✓'));
  }

  // S2 vite.config.js —— 构建注入接线
  const vc = read('vite.config.js');
  if (vc === null) {
    check('S2', false, 'vite.config.js 存在', '文件不可读');
  } else {
    const wired = vc.includes("replaceAll('__SW_VERSION__'");
    const sourced = vc.includes("'package.json'") || vc.includes('"package.json"');
    check('S2', wired && sourced, 'vite 构建期 __SW_VERSION__ ← package.json 注入接线',
      wired ? (sourced ? 'replaceAll 接线 + 真源读取 ✓' : '缺 package.json 真源读取') : '缺 __SW_VERSION__ 替换接线');
  }

  // S3 settings.js —— 设置页「系统版本」提取链
  const st = read(path.join('ios-desktop', 'js', 'apps', 'settings.js'));
  if (st === null) {
    check('S3', false, 'settings.js 存在', '文件不可读');
  } else {
    const extract = st.includes("const VERSION = '([^']+)'");
    const fallback = st.includes("indexOf('__') === 0");
    check('S3', extract && fallback, '设置页提取链（锚定 const VERSION 赋值行 + 占位符 dev 回退）',
      extract ? (fallback ? '提取正则 + dev 回退 ✓' : '缺 __SW_VERSION__ → dev 回退') : '提取正则与 sw.js 失联');
  }

  // S4 README 版本块 == 展示形
  const rd = read('README.md');
  if (rd === null) {
    check('S4', false, 'README.md 存在', '文件不可读');
  } else {
    const bs = rd.indexOf('<!-- md3:version:start -->');
    const be = rd.indexOf('<!-- md3:version:end -->');
    if (bs < 0 || be < 0 || be < bs) {
      check('S4', false, 'README 版本块标记完整', '缺 md3:version:start/end 标记');
    } else {
      const ok = rd.slice(bs, be).includes(`**当前版本 ${display}**`);
      check('S4', ok, `README 版本块当前版本 == ${display}`, ok ? 'sync-readme 同源 ✓' : '块内版本漂移（跑 npm run version:sync）');
    }
  }
}

// D1 manifest.webmanifest（登记）
const mf = read('manifest.webmanifest');
if (mf === null) {
  check('D1', false, 'manifest.webmanifest 存在（登记）', '文件不可读');
} else {
  try {
    const m = JSON.parse(mf);
    if (m.version === undefined) {
      check('D1', true, 'manifest.webmanifest 无 version 字段（登记：规范无版本字段，零消费面）');
    } else {
      check('D1', display !== null && m.version === display, 'manifest.webmanifest version == 展示形', String(m.version));
    }
  } catch (e) {
    check('D1', false, 'manifest.webmanifest 可解析', e.message);
  }
}

// D2 README 技术描述（登记）
const rd2 = read('README.md');
if (rd2 !== null) {
  check('D2', rd2.includes('__SW_VERSION__'), 'README 技术描述含 __SW_VERSION__ 构建注入表述（登记）',
    rd2.includes('__SW_VERSION__') ? '' : 'sw 机制描述仍是 geek-vN 旧口径');
}

const pass = rows.filter((r) => r.ok).length;
const fail = rows.length - pass;
if (!isMain) {
  // import 形态（v223 单测复用 toDisplayForm）：不打印不退出
} else {
  console.log('版本消费面登记表（#223 单一真源防腐门禁）');
  for (const r of rows) console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${r.desc}${r.detail ? ' — ' + r.detail : ''}`);
  console.log(`已登记 ${rows.length} 项消费面 | PASS ${pass} | FAIL ${fail}`);
  process.exit(fail ? 1 : 0);
}
