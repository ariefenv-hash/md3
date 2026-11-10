#!/usr/bin/env node
// gen-storage-keys-registry.mjs — #283 localStorage 键名注册表生成器（零依赖 · 无时间戳 · 逐字节可重现）
// 卡面处置建议①（docs/storage-keys-registry.md 注册表）+ ③的前置盘点（裸键清单如实登记，硬门禁留②收编后另批）
// 扫描口径：
//   Pass1 直接调用点字面键：localStorage.(getItem|setItem|removeItem)('<literal>')
//   Pass2 键常量定义：const|var|let *KEY* = '<literal>'（值无空格/无 ${ 插值），且同文件出现 localStorage 访问
//   排除：apps/_shared/vendor/（第三方库内部键，非项目命名空间）、dist/、node_modules/
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOTS = ['ios-desktop', 'index.html', 'launch.html', 'sw.js'];
const EXCLUDE = /(_shared[/\\]vendor|node_modules|dist[/\\]|\.test\.)/;
const EXT = /\.(js|mjs|html)$/;

function walk(p, out = []) {
  const st = statSync(p);
  if (st.isDirectory()) {
    if (EXCLUDE.test(p + '/')) return out;
    for (const f of readdirSync(p)) walk(join(p, f), out);
  } else if (EXT.test(p) && !EXCLUDE.test(p)) out.push(p);
  return out;
}
const files = [];
for (const r of ROOTS) {
  try { files.push(...walk(r)); } catch { /* 单文件根 */ files.push(r); }
}

const keys = new Map(); // name -> {name, group, form:Set, files:Set}
const touch = (name, form, file) => {
  if (!/^[A-Za-z0-9_:\-.]+$/.test(name) || name.length < 2 || name.length > 80) return;
  if (!keys.has(name)) keys.set(name, { name, form: new Set(), files: new Set() });
  keys.get(name).form.add(form);
  keys.get(name).files.add(file);
};

for (const f of files) {
  let src;
  try { src = readFileSync(f, 'utf-8'); } catch { continue; }
  const rel = relative('.', f).split(sep).join('/');
  // Pass1 直接调用点
  const re1 = /localStorage\s*\.\s*(getItem|setItem|removeItem)\s*\(\s*(['"`])([^'"`\n]+)\2/g;
  for (const m of src.matchAll(re1)) touch(m[3], 'direct', rel);
  // Pass2 键常量（仅同文件确有 localStorage 访问时计入，防误捕非键常量）
  if (!/localStorage\s*\.\s*(getItem|setItem|removeItem)/.test(src)) continue;
  const re2 = /(?:const|var|let)\s+(\w*(?:KEY|Key|_KEY)\w*)\s*=\s*(['"])([^'"\n]+)\2/g;
  for (const m of src.matchAll(re2)) {
    const v = m[3];
    if (/\s|\$\{/.test(v)) continue;
    if (!/^([a-z0-9_-]+:)?[a-z0-9_:\-.]+$/i.test(v)) continue;
    touch(v, 'constant', rel);
  }
}

const groupOf = (n) => n.startsWith('ios-desktop:') ? 'ios-desktop' : n.startsWith('settings:') ? 'settings' : n.startsWith('android17:') ? 'android17' : 'bare';
const groups = { 'ios-desktop': [], settings: [], android17: [], bare: [] };
const sorted = [...keys.values()].sort((a, b) => a.name.localeCompare(b.name));
for (const k of sorted) {
  const g = groupOf(k.name);
  groups[g].push({ name: k.name, forms: [...k.form].sort(), files: [...k.files].sort() });
}
const totals = Object.fromEntries(Object.entries(groups).map(([g, a]) => [g, a.length]));
const out = {
  schema: 1,
  generator: 'scripts/gen-storage-keys-registry.mjs（#283 · 零依赖无时间戳逐字节可重现）',
  scanRoots: ROOTS,
  exclusion: 'apps/_shared/vendor（第三方库内部键）/ dist / *.test.*',
  totals: { all: sorted.length, ...totals },
  groups,
};
const OUT = 'docs/audits/storage-keys-registry.json';
const json = JSON.stringify(out, null, 2) + '\n';
const CHECK = process.argv.includes('--check');
if (CHECK) {
  const { existsSync } = await import('node:fs');
  if (!existsSync(OUT)) { console.error('[storage-keys] --check: 盘上无 ' + OUT); process.exit(1); }
  const disk = readFileSync(OUT, 'utf8');
  if (disk !== json) {
    console.error('[storage-keys] --check: 生成件与盘上文件不一致（需 node scripts/gen-storage-keys-registry.mjs 再生）');
    process.exit(1);
  }
  console.log('[storage-keys] --check OK（逐字节一致）');
} else {
  writeFileSync(OUT, json);
  console.log(`[storage-keys] ${sorted.length} 键 = ios-desktop:${totals['ios-desktop']} / settings:${totals.settings} / android17:${totals.android17} / bare:${totals.bare}`);
}
