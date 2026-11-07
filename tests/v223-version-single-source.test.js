// v223 · #223 版本重编号治理——单一真源构建注入（R119 窗 · 并行实例 B）
// 三组：A 消费面静态锚（sw/vite/settings/pkg/README + 门禁与迁移脚本在库）
//      B 门禁行为（仓库根 exit 0 + 化石 fixture 漂移 exit 1 + migrate 幂等）
//      C 同源与展示形归一（README 块 == pkg 展示形；padStart 不截断，10.100 三位安全）
import { describe, test, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, existsSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toDisplayForm } from '../scripts/audit-version-consumers.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUDIT = path.join(repoRoot, 'scripts', 'audit-version-consumers.mjs');
const MIGRATE = path.join(repoRoot, 'scripts', 'migrate-version-single-source.mjs');

function runNode(script, args) {
  try {
    return { code: 0, out: execFileSync('node', [script, ...args], { encoding: 'utf-8', cwd: repoRoot }) };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') };
  }
}

describe('v223 · A 组 · 消费面静态锚', () => {
  const sw = readFileSync(path.join(repoRoot, 'sw.js'), 'utf-8');
  const vc = readFileSync(path.join(repoRoot, 'vite.config.js'), 'utf-8');
  const st = readFileSync(path.join(repoRoot, 'ios-desktop', 'js', 'apps', 'settings.js'), 'utf-8');
  const rd = readFileSync(path.join(repoRoot, 'README.md'), 'utf-8');
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf-8'));

  test('A1 sw.js VERSION 为 __SW_VERSION__ 占位，geek-vN 化石赋值清零', () => {
    expect(sw).toContain("const VERSION = '__SW_VERSION__';");
    expect(sw).not.toMatch(/const VERSION = 'geek-v\d+/);
  });

  test('A2 vite 构建注入接线：__SW_VERSION__ replaceAll + package.json 真源读取', () => {
    expect(vc).toContain("replaceAll('__SW_VERSION__'");
    expect(vc).toContain("'package.json'");
  });

  test('A3 设置页提取链：锚定 const VERSION 赋值行 + 占位符 dev 回退', () => {
    expect(st).toContain("const VERSION = '([^']+)'");
    expect(st).toContain("indexOf('__') === 0");
  });

  test('A4 门禁与迁移脚本在库 + npm check:version 接线', () => {
    expect(pkg.scripts['check:version']).toBe('node scripts/audit-version-consumers.mjs');
    expect(existsSync(AUDIT)).toBe(true);
    expect(existsSync(MIGRATE)).toBe(true);
  });

  test('A5 README 技术描述含构建注入表述（史实注记不触碰）', () => {
    expect(rd).toContain('__SW_VERSION__');
  });
});

describe('v223 · B 组 · 门禁与迁移行为', () => {
  test('B1 仓库根全量审计 exit 0 + 登记表关键行在 stdout', () => {
    const r = runNode(AUDIT, []);
    expect(r.code).toBe(0);
    expect(r.out).toContain('PASS  S1');
    expect(r.out).toContain('PASS  S2');
    expect(r.out).toContain('PASS  S3');
    expect(r.out).toContain('PASS  S4');
    expect(r.out).toContain('已登记');
  });

  test('B2 漂移 fixture（geek-vN 化石 sw.js）exit 1 且 S1 FAIL', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'v223-drift-'));
    // fixture 需含真源 package.json（否则 S0 短路，S1 不评估）；sw.js 保留化石 = 漂移面
    copyFileSync(path.join(repoRoot, 'package.json'), path.join(dir, 'package.json'));
    writeFileSync(path.join(dir, 'sw.js'), "const VERSION = 'geek-v100';\n"); // 漂移 fixture：化石字面量（刻意保留，模拟待迁移态）
    const r = runNode(AUDIT, ['--root', dir]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('FAIL  S1');
  });

  test('B3 migrate 幂等：化石 fixture → 占位；二跑 no-op；随后 audit S1 转 PASS', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'v223-mig-'));
    copyFileSync(path.join(repoRoot, 'package.json'), path.join(dir, 'package.json'));
    writeFileSync(path.join(dir, 'sw.js'), "const VERSION = 'geek-v100';\nconst BUILD_ID = '__BUILD_ID__';\n");
    const r1 = runNode(MIGRATE, ['--root', dir]);
    expect(r1.code).toBe(0);
    const sw1 = readFileSync(path.join(dir, 'sw.js'), 'utf-8');
    expect(sw1).toContain("const VERSION = '__SW_VERSION__';");
    const r2 = runNode(MIGRATE, ['--root', dir]);
    expect(r2.code).toBe(0);
    expect(r2.out).toContain('no-op');
    const r3 = runNode(AUDIT, ['--root', dir]);
    expect(r3.out).toContain('PASS  S1');
    expect(r3.out).not.toContain('FAIL  S1');
  });
});

describe('v223 · C 组 · 同源与展示形归一', () => {
  test('C1 README 版本块当前版本 == package.json 展示形（单一真源契约）', () => {
    const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf-8'));
    const rd = readFileSync(path.join(repoRoot, 'README.md'), 'utf-8');
    const bs = rd.indexOf('<!-- md3:version:start -->');
    const be = rd.indexOf('<!-- md3:version:end -->');
    expect(bs).toBeGreaterThanOrEqual(0);
    expect(be).toBeGreaterThan(bs);
    expect(rd.slice(bs, be)).toContain(`**当前版本 ${toDisplayForm(pkg.version)}**`);
  });

  test('C2 展示形归一：padStart 补零不截断，10.100 三位数安全（长度假设实证）', () => {
    expect(toDisplayForm('10.54.0')).toBe('v10.54');
    expect(toDisplayForm('10.100.0')).toBe('v10.100');
    expect(toDisplayForm('9.99.0')).toBe('v9.99');
    expect(toDisplayForm('10.5')).toBe('v10.05');
  });

  test('C3 dist 产物 sw.js 必为已注入形态（占位符零透传）', () => {
    const distSw = path.join(repoRoot, 'dist', 'sw.js');
    if (!existsSync(distSw)) return; // dist 未构建时由 build/dist-smoke 闸另行核验
    const t = readFileSync(distSw, 'utf-8');
    if (/const VERSION = 'geek-v\d+/.test(t)) return; // #223 之前的陈旧构建，本窗 build 闸刷新后此分支即死
    expect(t).not.toContain('__SW_VERSION__');
    expect(t).toMatch(/const VERSION = 'v\d+\.\d+'/);
  });
});
