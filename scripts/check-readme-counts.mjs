#!/usr/bin/env node
// #267 README 应用数字真源对账 —— README 中「N 个应用定义 / N 个 iframe 应用」与目录实数对账，漂移即红。
// 真源口径（#267 实证）：
//   应用定义数 = ios-desktop/js/apps-data.js 中 `from './apps/'` import 行数（注册表语义，52）
//               ——不采 js/apps/*.js 文件数（57 含 5 个非注册辅助文件）
//   iframe 应用数 = ios-desktop/apps/ 下含 index.html 的目录数（41，_shared 共享库不计）
// 纯核导出供 vitest 穷举；CLI 任一对账失败 exit 1。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 应用定义真源计数（apps-data.js import 行数） */
export function countAppDefinitions(repoRoot = ROOT) {
  const src = fs.readFileSync(path.join(repoRoot, 'ios-desktop', 'js', 'apps-data.js'), 'utf-8');
  const matches = src.match(/from\s+['"]\.\/apps\//g) || [];
  return matches.length;
}

/** iframe 应用真源计数（ios-desktop/apps/ 含 index.html 的目录数） */
export function countIframeApps(repoRoot = ROOT) {
  const dir = path.join(repoRoot, 'ios-desktop', 'apps');
  return fs.readdirSync(dir).filter((d) => {
    const full = path.join(dir, d);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, 'index.html'));
  }).length;
}

/** 从 README 文本提取 iframe 应用数声明的两种实态：
 *  P1「N 个 iframe 子应用」（结构图形态）/ P2「index.html`（N 个，单文件自包含）」（速查表形态） */
function extractIframeClaims(readmeText) {
  const p1 = [...readmeText.matchAll(/(\d+)\s*个\s*iframe\s*子?\s*应用/g)].map((m) => Number(m[1]));
  const p2 = [...readmeText.matchAll(/index\.html`（(\d+) 个，单文件自包含）/g)].map((m) => Number(m[1]));
  return [...p1, ...p2];
}

/** 从 README 文本提取「N 个应用定义」与 iframe 应用声明的声明集合 */
export function extractReadmeClaims(readmeText) {
  const defs = [...readmeText.matchAll(/(\d+)\s*个\s*应用定义/g)].map((m) => Number(m[1]));
  return { defs, iframes: extractIframeClaims(readmeText) };
}

/** 对账 → { ok, errors[] }：README 声明必须全部等于真源数（允许零声明=未提及） */
export function reconcileReadme(readmeText, realDefs, realIframes) {
  const errors = [];
  const { defs, iframes } = extractReadmeClaims(readmeText);
  for (const n of defs) {
    if (n !== realDefs) errors.push(`README「${n} 个应用定义」≠ 真源 ${realDefs}（apps-data.js import 数）`);
  }
  for (const n of iframes) {
    if (n !== realIframes) errors.push(`README「${n} 个 iframe 应用」≠ 真源 ${realIframes}（apps/ index.html 目录数）`);
  }
  return { ok: errors.length === 0, errors, realDefs, realIframes };
}

// ---------- CLI ----------
if (import.meta.url === `file://${process.argv[1]}`) {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf-8');
  const defs = countAppDefinitions();
  const iframes = countIframeApps();
  console.log(`真源：应用定义 ${defs}（apps-data.js import）/ iframe 应用 ${iframes}（apps/ index.html 目录）`);
  const r = reconcileReadme(readme, defs, iframes);
  if (!r.ok) {
    for (const e of r.errors) console.log('  FAIL ' + e);
    console.log('check-readme-counts: FAIL');
    process.exit(1);
  }
  console.log('check-readme-counts: PASS（README 声明与真源全部一致）');
}
