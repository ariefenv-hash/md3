// tests/v267-readme-counts.test.js —— #267 README 应用数字真源对账（51/40 收敛零互搏 + 门禁挂接）
// @snapshot · 交付时点快照（#291 §1 裁决）：钉扎对象=README 计数对账时点账；允许随快照失义退役（docs/test-naming-evergreen.md §4 登记制）——R149 改名机械批注入
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  countAppDefinitions,
  countIframeApps,
  extractReadmeClaims,
  reconcileReadme,
} from '../scripts/check-readme-counts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('v267-A 真源计数', () => {
  it('A1 应用定义真源 = apps-data.js import 行数 = 51（chess 第 51 号注释锚）', () => {
    const n = countAppDefinitions(ROOT);
    expect(n).toBe(51);
    const src = fs.readFileSync(path.join(ROOT, 'ios-desktop', 'js', 'apps-data.js'), 'utf-8');
    expect(src).toMatch(/chess 第 52 号/);
  });
  it('A2 iframe 应用真源 = apps/ 含 index.html 目录数 = 40（_shared 不计）', () => {
    expect(countIframeApps(ROOT)).toBe(40);
  });
  it('A3 js/apps/*.js 文件数 57 含非注册辅助文件（不采文件数口径的实证锚）', () => {
    const dir = path.join(ROOT, 'ios-desktop', 'js', 'apps');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).length;
    expect(files).toBeGreaterThan(51); // 文件数 > 注册数，证 57 口径不可采
  });
});

describe('v267-B extract/reconcile 纯逻辑', () => {
  it('B1 提取「N 个应用定义」与 iframe 应用声明（两种实态）', () => {
    const t = 'A（50 个应用定义）B（51 个应用定义）E：index.html`（21 个，单文件自包含）F：40 个 iframe 子应用';
    const c = extractReadmeClaims(t);
    expect(c.defs.sort()).toEqual([50, 51]);
    expect(c.iframes.sort()).toEqual([21, 40]);
  });
  it('B2 对账：漂移声明报错', () => {
    const r = reconcileReadme('（50 个应用定义）', 51, 40);
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/50 个应用定义.*51/);
  });
  it('B3 对账：正确声明通过', () => {
    const r = reconcileReadme('（51 个应用定义）（40 个 iframe 应用）', 51, 40);
    expect(r.ok).toBe(true);
  });
  it('B4 零声明不报错（未提及即不管）', () => {
    expect(reconcileReadme('无关文本', 51, 40).ok).toBe(true);
  });
});

describe('v267-C README 真源对账（仓库实文件）', () => {
  it('C1 README 全部应用数字声明与真源一致（50/21 互搏态根治）', () => {
    const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf-8');
    const r = reconcileReadme(readme, countAppDefinitions(ROOT), countIframeApps(ROOT));
    expect(r.ok, r.errors.join('; ')).toBe(true);
  });
  it('C2 历史 50/21 错值不再出现', () => {
    const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf-8');
    expect(readme).not.toMatch(/50 个应用定义/);
    expect(readme).toMatch(/51 个应用定义/);
    expect(readme).toMatch(/40 个，单文件自包含/);
  });
});

describe('v267-D 门禁挂接', () => {
  it('D1 CLI 实跑 exit 0（对账通过）', () => {
    const out = execSync('node scripts/check-readme-counts.mjs', {
      cwd: ROOT, encoding: 'utf-8', maxBuffer: 1024 * 1024,
    });
    expect(out).toMatch(/PASS（README 声明与真源全部一致）/);
  });
  it('D2 CLI 对漂移文本红（reconcile 负向）', () => {
    const r = reconcileReadme('（21 个 iframe 应用）', 51, 40);
    expect(r.ok).toBe(false);
  });
});
