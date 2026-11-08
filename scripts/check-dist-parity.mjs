#!/usr/bin/env node
// ==================== check-dist-parity.mjs — dist 与源码资产对账门禁（#301） ====================
//
// 背景（#301）：catalog.json 源码有 dist 无（#298 实证 404/403）、alarm-ringtone.js 源码有
// dist 无（#297 实证 404）——「源码有、dist 没有」的部署级缺件事故两度线上现形。现副本
// 通道已有四道防漏（构建内 1.05 兄弟引用断言 / 1.6 js 引用白名单+断言 / 1.65 import 闭包
// 不动点 / verify-dist+e2e:dist precache HTTP 自校验），但均为「引用驱动」——**未被引用的
// 静态资产缺漏无任何门禁**，且 demo/docs 的排除意图从未文档化（豁免无登记即无从审计）。
// 本脚本是【源→dist 方向】的常驻对账门禁，与 verify-dist（dist→自身自洽）互补成对。
//
// 四通道对账（按 vite.config copyStaticAndPrecache 实际拷贝架构分道，防打包类误报）：
//   A 全量拷贝通道：ios-desktop/apps/** 与 ios-desktop/assets/** 源码逐文件 → dist 同路径
//     存在性+非空（这两目录构建期整树复制；html/js/css 会被压缩故不做字节比对）
//   B 运行时 fetch 拼路径白名单：无法静态分析、由 js 运行时拼 URL 的数据资产
//     （ios-desktop/catalog.json = #298 实证族；apps/*/index.html 已被 A 通道覆盖）
//   C 入口三件：index.html（根）/ ios-desktop/index.html（壳）/ launch.html（第二入口，
//     #293 盘点对象）——源文件存在且 dist 对应产物存在
//   D 排除意图表（EXEMPT，#301 建议②文档化）：demo/（开发示例，非运行时资产）、
//     docs/（文档，非运行时资产）——有意不进 dist；登记于此即审计基准，翻转须改本表
//     + 交付帖披露。（vite.config 内联注释因 #223 活跃租约车道「roll-version+vite-config
//     +sw」在途而延后——租约到期后可由后续实例补注，本表为唯一真源。）
//
// 判定纪律：源码存在而 dist 缺失 = FAIL（#297/#298 形态）；EXEMPT 登记项不参与判定。
// 用法：npm run check:dist-parity（需先 npm run build；无 dist 时提示而非误报）
// 退出码：0 = 全绿；1 = 任何对账失败
// 关联：#301 #297 #298 #139（verify-dist 方向）#299（e2e:dist 网络层+关键资源清单）

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

let pass = 0, fail = 0;
const A = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  PASS ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); }
};

if (!existsSync(path.join(distDir, 'index.html'))) {
  console.error('[check:dist-parity] dist/ 不存在或未构建 —— 先 npm run build（本门禁面向构建产物对账）');
  process.exit(1);
}

/** 通道 D：排除意图表（#301 建议②——唯一真源；翻转须改表+交付帖披露） */
const EXEMPT_INTENT = [
  { prefix: 'ios-desktop/demo/', reason: '开发示例（.mdapp 模板），非运行时资产，有意不进 dist' },
  { prefix: 'ios-desktop/docs/', reason: '项目文档（md/说明），非运行时资产，有意不进 dist' },
];
const isExempt = (rel) => EXEMPT_INTENT.some((e) => rel.replace(/\\/g, '/').startsWith(e.prefix));

/** 递归收集源码相对路径（posix 分隔） */
const walkRel = (dir, base = dir, out = []) => {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, name.name);
    if (name.isDirectory()) walkRel(abs, base, out);
    else out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
  return out;
};
const nonEmpty = (p) => { try { return statSync(p).size > 0; } catch { return false; } };

// ---------- 通道 A：apps/** 与 assets/** 全量拷贝通道 ----------
console.log('A 全量拷贝通道：apps/** + assets/** 源码逐文件 → dist 存在性+非空（压缩类不做字节比对）');
let aTotal = 0, aBad = [];
for (const dir of ['apps', 'assets']) {
  const srcAbs = path.join(root, 'ios-desktop', dir);
  if (!existsSync(srcAbs)) { aBad.push(`ios-desktop/${dir}/（源目录缺失？）`); continue; }
  for (const rel of walkRel(srcAbs)) {
    const srcRel = `ios-desktop/${dir}/${rel}`;
    if (isExempt(srcRel)) continue;
    aTotal++;
    const distAbs = path.join(distDir, 'ios-desktop', dir, rel);
    if (!existsSync(distAbs)) aBad.push(`${srcRel} → dist 缺失`);
    else if (!nonEmpty(distAbs)) aBad.push(`${srcRel} → dist 空体`);
  }
}
A(`apps+assets 全量通道 ${aTotal} 个源文件全数就位`, aBad.length === 0, aBad.length === 0 ? '' : aBad.slice(0, 5).join('；'));

// ---------- 通道 B：运行时 fetch 拼路径白名单 ----------
console.log('B 运行时 fetch 白名单：js 运行时拼 URL 的数据资产（静态分析不可达，#298 实证族）');
const RUNTIME_FETCH = [
  'ios-desktop/catalog.json', // #298：市场目录，appstore pkg-catalog 同源首选位
];
let bBad = [];
for (const rel of RUNTIME_FETCH) {
  const srcAbs = path.join(root, rel);
  const distAbs = path.join(distDir, rel);
  if (!existsSync(srcAbs)) bBad.push(`${rel} → 源码缺失（白名单腐化，先查源）`);
  else if (!existsSync(distAbs) || !nonEmpty(distAbs)) bBad.push(`${rel} → dist 缺失/空体（#298 同型事故）`);
}
A(`fetch 白名单 ${RUNTIME_FETCH.length} 项源↔dist 双侧就位`, bBad.length === 0, bBad.length === 0 ? '' : bBad.join('；'));

// ---------- 通道 C：入口三件 ----------
console.log('C 入口三件：根 index.html / 壳 ios-desktop/index.html / 第二入口 launch.html');
const ENTRIES = ['index.html', 'ios-desktop/index.html', 'launch.html'];
let cBad = [];
for (const rel of ENTRIES) {
  if (!existsSync(path.join(root, rel))) { cBad.push(`${rel} → 源码缺失`); continue; }
  if (!existsSync(path.join(distDir, rel)) || !nonEmpty(path.join(distDir, rel))) cBad.push(`${rel} → dist 缺失/空体`);
}
A(`入口 ${ENTRIES.length} 件源↔dist 双侧就位`, cBad.length === 0, cBad.length === 0 ? '' : cBad.join('；'));

// ---------- 通道 D：排除意图在册自证（#301 建议②文档化落点） ----------
console.log('D 排除意图表：demo/、docs/ 有意不进 dist（登记即审计基准）');
A('EXEMPT_INTENT 表非空且含 demo/ docs/ 双登记',
  EXEMPT_INTENT.some((e) => e.prefix === 'ios-desktop/demo/') && EXEMPT_INTENT.some((e) => e.prefix === 'ios-desktop/docs/'),
  EXEMPT_INTENT.map((e) => `${e.prefix}（${e.reason.slice(0, 18)}…）`).join(' '));
// 源码侧登记项确实现存（防表腐化：登记者已消失应清表）
const demoExists = existsSync(path.join(root, 'ios-desktop', 'demo'));
const docsExists = existsSync(path.join(root, 'ios-desktop', 'docs'));
A(`登记项源码实存在场（防表腐化）demo=${demoExists} docs=${docsExists}`, demoExists || docsExists);

console.log('');
console.log(`[check:dist-parity] 结果：PASS ${pass} / FAIL ${fail}（#301 源→dist 对账：A 全量通道 ${aTotal} 件 / B fetch 白名单 / C 入口三件 / D 排除意图表；与 verify-dist、e2e:dist #299 防线互补）`);
process.exit(fail === 0 ? 0 : 1);
