// tests/v285-apps-md.test.js — #285 APPS.md 单真源生成件锚
//
// 覆盖面：
//   A 生成器结构锚：scripts/generate-apps-md.mjs 头注立契（#285 + 单真源禁手改 + #296 切分点 + #267 同口径）；
//   B 生成件对账：docs/APPS.md 存在且 CLI 校验逐字节可重现（check:docs-index 同律）；
//   C 汇总对账：52 定义 / 41 iframe / 11 native / 用途 52/52 与 #267 真源计数同源吻合；
//   D 清单完整性：52 数据行 · id 非空且唯一 · 名称非空 · 定义文件在盘；
//   E 用途尾注水位固化：52 行用途列全非空（#296 注释契约联动——新增应用未写尾注即红，绝不编造）；
//   F README 接线锚：README.md 源码地图含 docs/APPS.md 引用；
//   G 阴性必红：MD3_APPSDATA_ROOT 钩子指向临时仓库（tmp 副本不入仓）——篡改 apps-data.js
//      用途尾注后 CLI 校验红（exit 1），验证「生成件被手改或真源已变」真实路径（v296/v279 钩子同律）；
//   H 真实数据抽查：safari/chess 用途原文 + wallet native + calculator iframe 实体列；
//   I 门禁接线锚：package.json scripts 含 check:apps-md。
//
// 车道边界：本文件只锚 #285 交付面（生成器 + 生成件 + README 接线）；不改应用源码/测试源码；
//   G 锚临时副本写 os.tmpdir 不入仓（check:dist-parity / #295 docs-index 对实树扫描零干扰）。

import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, cpSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildAppsMd, parseAppsData, extractPurpose } from '../scripts/generate-apps-md.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MD_PATH = join(ROOT, 'docs/APPS.md');
const md = readFileSync(MD_PATH, 'utf8');

// ---- md 表格数据行解析（| seq | id | 名称 | 定义文件 | 实体 | 用途 |） ----
function parseRows(text) {
  return text
    .split('\n')
    .filter((l) => /^\| \d+ \| /.test(l))
    .map((l) => l.split('|').slice(1, 7).map((c) => c.trim()));
}

describe('v285 · A 生成器结构锚', () => {
  it('scripts/generate-apps-md.mjs 存在且头注立契（#285 单真源禁手改 + #296 切分点 + #267 同口径）', () => {
    const p = join(ROOT, 'scripts/generate-apps-md.mjs');
    expect(existsSync(p)).toBe(true);
    const head = readFileSync(p, 'utf8').slice(0, 2000);
    expect(head).toContain('#285');
    expect(head).toContain('单真源');
    expect(head).toContain('禁手改');
    expect(head).toContain('#296');
    expect(head).toContain('#267');
  });
});

describe('v285 · B 生成件对账', () => {
  it('docs/APPS.md 存在且 CLI 校验逐字节可重现（exit 0）', () => {
    expect(existsSync(MD_PATH)).toBe(true);
    const r = spawnSync('node', ['scripts/generate-apps-md.mjs'], { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('PASS');
  });
});

describe('v285 · C 汇总对账（与 #267 真源同源）', () => {
  it('汇总表 52/41/11 与 apps-data.js import 行数、apps/ 目录实数逐项吻合', () => {
    expect(md).toContain('| 应用定义（apps-data.js import 行） | 52 |');
    expect(md).toContain('| iframe 应用（apps/ 含 index.html 目录） | 41 |');
    expect(md).toContain('| native 应用（无 iframe 实体） | 11 |');
    expect(md).toContain('| 用途尾注覆盖（#296 注释契约联动水位） | 52/52 |');
    const apps = parseAppsData(ROOT);
    expect(apps.length).toBe(52);
    // 41 = 52 − native 11（生成件口径与目录实数一致，由 B 锚 CLI 双重保证）
    expect(md).toContain('> native 11 = 52 − 41（无 iframeAppContent 的定义如实登记）');
  });
});

describe('v285 · D 清单完整性', () => {
  it('52 数据行 · id 非空且唯一 · 名称非空 · 定义文件在盘', () => {
    const rows = parseRows(md);
    expect(rows.length).toBe(52);
    const ids = rows.map((r) => r[1]);
    expect(ids.every((x) => x !== '')).toBe(true);
    expect(new Set(ids).size).toBe(52);
    const names = rows.map((r) => r[2]);
    expect(names.every((x) => x !== '')).toBe(true);
    const seq = rows.map((r) => Number(r[0]));
    expect(seq).toEqual(Array.from({ length: 52 }, (_, i) => i + 1));
    for (const r of rows) {
      expect(existsSync(join(ROOT, 'ios-desktop', r[3]))).toBe(true);
    }
  });
});

describe('v285 · E 用途尾注水位固化（#296 契约联动）', () => {
  it('52 行用途列全非空——新增应用未写「用途：」尾注即红，绝不编造', () => {
    const rows = parseRows(md);
    for (const r of rows) {
      expect(r[5]).not.toBe('');
    }
  });
  it('用途切分点纯函数：extractPurpose 两形态 + 缺位如实空串', () => {
    expect(extractPurpose('批次三：文件管理器（数据层）｜用途：VFS 目录浏览与文件操作')).toBe('VFS 目录浏览与文件操作');
    expect(extractPurpose('用途：浏览器——网页访问与书签管理')).toBe('浏览器——网页访问与书签管理');
    expect(extractPurpose('v7.29：2048 纸牌接龙（替换原播客位）')).toBe('');
  });
});

describe('v285 · F README 接线锚', () => {
  it('README.md 源码地图含 docs/APPS.md 引用（#285 主诉「README 无逐应用清单」收口）', () => {
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf8');
    expect(readme).toContain('docs/APPS.md');
  });
});

describe('v285 · G 阴性必红（MD3_APPSDATA_ROOT 钩子 · tmp 副本不入仓）', () => {
  it('篡改临时仓库 apps-data.js 用途尾注 → CLI 校验红（exit 1）', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'v285-neg-'));
    try {
      // 组装临时仓库结构：真源（apps-data.js + 全部定义文件）+ iframe 目录 + 生成件
      const jsDir = join(tmp, 'ios-desktop/js/apps');
      const appsDir = join(tmp, 'ios-desktop/apps/chess');
      const docsDir = join(tmp, 'docs');
      mkdirSync(jsDir, { recursive: true });
      mkdirSync(appsDir, { recursive: true });
      mkdirSync(docsDir, { recursive: true });
      cpSync(join(ROOT, 'ios-desktop/js/apps-data.js'), join(tmp, 'ios-desktop/js/apps-data.js'));
      cpSync(join(ROOT, 'ios-desktop/js/apps'), jsDir, { recursive: true });
      writeFileSync(join(appsDir, 'index.html'), '<!doctype html><title>x</title>');
      // 篡改前：生成件与真源吻合 → 校验 PASS
      writeFileSync(join(docsDir, 'APPS.md'), buildAppsMd(tmp));
      const pass = spawnSync('node', ['scripts/generate-apps-md.mjs'], {
        cwd: ROOT, stdio: 'pipe', encoding: 'utf8',
        env: { ...process.env, MD3_APPSDATA_ROOT: tmp },
      });
      expect(pass.status).toBe(0);
      // 篡改真源用途尾注（模拟「apps-data.js 用途已变而生成件未再生」）→ 校验必红
      const dataPath = join(tmp, 'ios-desktop/js/apps-data.js');
      const tampered = readFileSync(dataPath, 'utf8').replace('规则对弈与 AI 对局', '规则对弈与 AI 对局（修订）');
      expect(tampered).not.toBe(readFileSync(dataPath, 'utf8'));
      writeFileSync(dataPath, tampered);
      const fail = spawnSync('node', ['scripts/generate-apps-md.mjs'], {
        cwd: ROOT, stdio: 'pipe', encoding: 'utf8',
        env: { ...process.env, MD3_APPSDATA_ROOT: tmp },
      });
      expect(fail.status).toBe(1);
      expect(fail.stderr).toContain('不一致');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('v285 · H 真实数据抽查', () => {
  it('safari/chess 用途原文 · wallet native · calculator iframe 实体列与真源一致', () => {
    const rows = parseRows(md);
    const byId = new Map(rows.map((r) => [r[1], r]));
    expect(byId.get('safari')[5]).toBe('浏览器——网页访问与书签管理');
    expect(byId.get('chess')[5]).toBe('规则对弈与 AI 对局');
    expect(byId.get('wallet')[4]).toBe('native');
    expect(byId.get('calculator')[4]).toBe('apps/calculator/');
    expect(byId.get('calculator')[2]).toBe('计算器');
  });
});

describe('v285 · I 门禁接线锚', () => {
  it('package.json scripts 含 check:apps-md → generate-apps-md.mjs', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts['check:apps-md']).toBe('node scripts/generate-apps-md.mjs');
  });
});
