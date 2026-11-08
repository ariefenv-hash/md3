// v245 · #245 批 1「统一档」曲线令牌收口守护（R127 窗 · 2026-11-08 08:00 槽 · Job 2931605）
// 范围：#239 令牌组 + spring-legacy 自创档的精确等值收口（192 处）+ 主壳 tokens 引入链
//       + audit checkF 令牌化率 detail + check-motion-tokens.mjs 水位防回退。
// 边界：JS 语境（WAAPI easing 不支持 var()）与映射表外曲线批 2 处理（水位固化不拦截）。
import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tokens = readFileSync(path.join(root, 'ios-desktop/apps/_shared/md3-tokens.css'), 'utf-8');
const shellIndex = readFileSync(path.join(root, 'ios-desktop/index.html'), 'utf-8');
const AUDIT = path.join(root, 'scripts', 'audit-app-quality.mjs');
const CHECK = path.join(root, 'scripts', 'check-motion-tokens.mjs');
const BASELINE = path.join(root, 'scripts', 'motion-token-baseline.json');

// 批 1 精确等值映射表（值归一键 → 令牌；与收口脚本/check 脚本三方一致）
const MAP = new Map([
  ['0.2,0,0,1', '--md-easing-emphasized'],
  ['0,0,0,1', '--md-easing-standard-decelerate'],
  ['0.3,0,1,1', '--md-easing-standard-accelerate'],
  ['0.05,0.7,0.1,1', '--md-easing-emphasized-decelerate'],
  ['0.3,0,0.8,0.15', '--md-easing-emphasized-accelerate'],
  ['0.42,1.67,0.21,0.9', '--md-easing-spring-fast-spatial'],
  ['0.38,1.21,0.22,1', '--md-easing-spring-default-spatial'],
  ['0.27,1.06,0.18,1', '--md-easing-spring-slow-spatial'],
  ['0.31,0.94,0.34,1', '--md-easing-spring-fast-effects'],
  ['0.34,0.8,0.34,1', '--md-easing-spring-default-effects'],
  ['0.34,0.88,0.34,1', '--md-easing-spring-slow-effects'],
  ['0.34,1.56,0.64,1', '--md-easing-spring-legacy'],
]);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'vendor' || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(css|html)$/.test(e.name) && !/\.min\./.test(e.name)) out.push(full);
  }
  return out;
}

describe('v245 A · 令牌组 legacy 档与过冲语义', () => {
  test('A1 spring-legacy 档逐字锚 + 【自创】标注在位（#170 自创纪律）', () => {
    expect(tokens).toContain('--md-easing-spring-legacy: cubic-bezier(0.34, 1.56, 0.64, 1);');
    const m = tokens.match(/\/\* 【自创】spring legacy 档[\s\S]*?\*\/\s*--md-easing-spring-legacy:/);
    expect(m, 'legacy 档头部【自创】注释块在位').toBeTruthy();
    expect(m[0]).toContain('批 2');
  });

  test('A2 过冲语义：legacy 与 spring-spatial 三档末控制点 y>1；classic 族与 effects 档全部 y≤1', () => {
    const grab = (name) => {
      const m = tokens.match(new RegExp(`--md-easing-${name}: cubic-bezier\\(([^)]*)\\)`));
      return m ? m[1].split(',').map(Number) : null;
    };
    for (const n of ['spring-fast-spatial', 'spring-default-spatial', 'spring-slow-spatial', 'spring-legacy']) {
      const v = grab(n);
      expect(v, n).toBeTruthy();
      expect(Math.max(v[1], v[3]), `${n} 允许过冲（y>1）`).toBeGreaterThan(1);
    }
    for (const n of ['standard', 'standard-accelerate', 'standard-decelerate', 'emphasized', 'emphasized-decelerate', 'emphasized-accelerate', 'spring-fast-effects', 'spring-default-effects', 'spring-slow-effects']) {
      const v = grab(n);
      expect(v, n).toBeTruthy();
      expect(Math.max(v[1], v[3]), `${n} 不得过冲（y≤1）`).toBeLessThanOrEqual(1);
    }
  });
});

describe('v245 B · 收口完整性与引入链', () => {
  const files = walk(path.join(root, 'ios-desktop')).filter((f) => !f.endsWith(path.join('_shared', 'md3-tokens.css')));

  test('B1 收口完整性：全库非注释非 script 裸曲线中映射表内值 = 0（批 1 精确等值全收）', () => {
    const NUM = /^-?\d*\.?\d+$/;
    let offenders = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      const spans = [];
      for (const m of src.matchAll(/\/\*[\s\S]*?\*\//g)) spans.push([m.index, m.index + m[0].length]);
      for (const m of src.matchAll(/<!--[\s\S]*?-->/g)) spans.push([m.index, m.index + m[0].length]);
      for (const m of src.matchAll(/<script\b[\s\S]*?<\/script>/gi)) spans.push([m.index, m.index + m[0].length]);
      const mask = src.replace(/var\(--md-easing-[a-z-]+,\s*cubic-bezier\([^)]*\)/g, (x) => '\u0000'.repeat(x.length));
      for (const m of mask.matchAll(/cubic-bezier\(\s*([^)]*?)\s*\)/g)) {
        if (spans.some(([a, b]) => a <= m.index && m.index < b)) continue;
        const parts = m[1].split(',').map((s) => s.trim());
        if (parts.length !== 4 || !parts.every((p) => NUM.test(p))) continue;
        const key = parts.map(Number).join(',');
        if (MAP.has(key)) offenders.push(`${path.relative(root, f)}: cubic-bezier(${parts.join(', ')}) → 应为 ${MAP.get(key)}`);
      }
    }
    expect(offenders, offenders.slice(0, 6).join('\n')).toEqual([]);
  });

  test('B2 主壳引入链：index.html 在 md3-theme.css 之前 link 共享令牌层（主壳 var() 真源）', () => {
    const i = shellIndex.indexOf('apps/_shared/md3-tokens.css');
    const j = shellIndex.indexOf('css/md3-theme.css');
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(-1);
    expect(i, 'tokens link 先于主题 link（主题同名令牌后置覆盖，色彩零漂移）').toBeLessThan(j);
  });

  test('B3 零 var 嵌套：不存在 var(--md-easing-x, var(--md-easing-… 双层包裹（收口脚本盲区回归锚）', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      expect(src.match(/var\(--md-easing-[a-z-]+,\s*var\(--md-easing/g), path.relative(root, f)).toBeNull();
    }
  });
});

describe('v245 C · audit checkF 令牌化率 detail 契约', () => {
  test('C1 pass 语义不变（动效锚 ≥3）+ detail 含曲线令牌化计数', async () => {
    const { checkF } = await import('file://' + AUDIT);
    const bareOnly = 'transition: opacity .2s cubic-bezier(0.2, 0, 0, 1); animation: f .2s cubic-bezier(0.2, 0, 0, 1); @keyframes f {}';
    const tokenized = 'transition: opacity .2s var(--md-easing-emphasized, cubic-bezier(0.2, 0, 0, 1)); animation: f .2s var(--md-easing-emphasized, cubic-bezier(0.2, 0, 0, 1)); @keyframes f {}';
    const r1 = checkF(bareOnly);
    expect(r1.pass).toBe(true);
    expect(r1.detail).toContain('曲线令牌化 0/2（0%）');
    const r2 = checkF(tokenized);
    expect(r2.pass).toBe(true);
    expect(r2.detail).toContain('曲线令牌化 2/2（100%）');
    // pass 条件批 1 不收紧：令牌化率 0% 也不因曲线失分（#246 建议三「先告警分档」同律）
    expect(checkF('transition: opacity .2s;').pass).toBe(false);
  });
});

describe('v245 D · check-motion-tokens 水位防回退契约', () => {
  test('D1 水位文件字段完整（tokenConsumed/bareTotal/bareDist）且与实跑一致', () => {
    const base = JSON.parse(readFileSync(BASELINE, 'utf-8'));
    expect(base.tokenConsumed).toBeGreaterThan(0);
    expect(base.bareTotal).toBeGreaterThan(0);
    expect(Object.keys(base.bareDist).length).toBeGreaterThan(0);
    expect(base.tokenConsumed + base.bareTotal).toBe(302);
  });

  test('D2 --check 实跑 exit 0（水位不降不增）+ 报告模式输出令牌化率', () => {
    const out = execFileSync('node', [CHECK, '--check'], { encoding: 'utf-8', cwd: root });
    expect(out).toContain('PASS');
    const rep = execFileSync('node', [CHECK], { encoding: 'utf-8', cwd: root });
    expect(rep).toContain('令牌化率');
  });
});
