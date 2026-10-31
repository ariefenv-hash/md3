// ==================== v150-readme-version.test.js — README 版本单一真源门禁（#150） ====================
//
// 断言三事：
//   ① README 最大版本号 == package.json version 的展示形（vX.YZ，minor 两位补零）
//      —— 双向拦：README 落后（本议题立案时的 v7.5x 失血症）与 package.json 未随版同升都红；
//   ② 版本块标记在册且块内含当前版本（防手工挪块/删块后同步脚本失锚）；
//   ③ README 应用数宣称 == apps-data.js 实际聚合定义数（#149「注释 35 实际 45」同款失血，
//      文档侧同门看护；iframe 子应用目录数同口径）。
// 历史到达注记（如「v7.52 新增…」）是史实，允许低于当前版本——门禁只比对最大值，不拦历史。

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
const appsDataSrc = readFileSync(path.join(root, 'ios-desktop/js/apps-data.js'), 'utf8');

const displayVer =
  'v' + pkg.version.split('.').slice(0, 2).map((n, i) => (i === 1 ? String(n).padStart(2, '0') : n)).join('.');

const verTokens = [...readme.matchAll(/v\d+\.\d{2}\b/g)].map((m) => m[0]);
const maxVer = verTokens.sort((a, b) => {
  const pa = a.slice(1).split('.').map(Number);
  const pb = b.slice(1).split('.').map(Number);
  return (pa[0] - pb[0]) || (pa[1] - pb[1]);
}).at(-1);

describe('v150 README 版本单一真源（#150 门禁）', () => {
  it('package.json version 在册且可展示为 vX.YZ', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.0$/);
    expect(displayVer).toMatch(/^v\d+\.\d{2}$/);
  });

  it('README 最大版本号 == package.json 展示版（双向拦漂移）', () => {
    expect(verTokens.length).toBeGreaterThan(0);
    expect(maxVer).toBe(displayVer);
  });

  it('版本块标记在册，块内含当前版本与真源/门禁指引', () => {
    const m = readme.match(/<!-- md3:version:start -->\n([\s\S]*?)<!-- md3:version:end -->/);
    expect(m).not.toBeNull();
    expect(m[1]).toContain(displayVer);
    expect(m[1]).toContain('package.json');
    expect(m[1]).toContain('sync-readme-version.mjs');
  });

  it('README 应用数宣称 == apps-data.js 聚合定义数（iframe 子应用目录数同口径）', () => {
    const importCount = (appsDataSrc.match(/^import\s+\w+\s+from\s+'\.\s*\/apps\//gm) || []).length;
    expect(importCount).toBe(45); // 现状锚：#149 实证恰 45 项（apps/*.js 单一真源）
    expect(readme).toContain(`${importCount} 个内置应用`);
    expect(readme).not.toMatch(/32 个应用/); // 旧失血值不得回流
    const appDirs = readdirSync(path.join(root, 'ios-desktop/apps'), { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(path.join(root, 'ios-desktop/apps', d.name, 'index.html')))
      .length;
    const m = readme.match(/(\d+) 个 iframe 子应用/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBe(appDirs); // 宣称数 == 实际含 index.html 的子应用目录数（现状 34）
  });
});
