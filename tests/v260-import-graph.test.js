// ==================== v260-import-graph.test.js — #260 模块图 import 闭包纯逻辑核回归 ====================
//
// 背景（#260 根因链）：v9.75（#158）给 apps/clock-app/alarm.mjs、timer.mjs 加了
// `import ... from '../../js/aosp/alarm-ringtone.js'`——mjs 文件之间的 import 不在
// vite 1.6 复制通道扫描范围（只扫 apps/**/index.html 内的 '../../js/' 引用）→
// alarm-ringtone.js 从未进 dist → 线上时钟模块图整链静默崩两周（module script
// 404 只报 console error、零 pageerror；秒表按钮点了没反应、闹钟列表空）。
//
// 本卡三道防线（vite 1.65 补复制 / verify-dist ②b 模块图闭合 / e2e-dist-smoke
// 同源 console error 监控 + 时钟功能级断言）共用纯逻辑核 scripts/lib/
// module-import-graph.js——本文件对核做直测 + 三道防线文面锚 + 根因面实况锚。
//
// 覆盖：
//   A. extractRelImports（三类写法 + 豁免 + 去重保序）
//   B. resolveImportPath / resolveImportCandidates（扩展名策略 + 越出根）
//   C. collectImportClosure（不动点收敛 / 循环引用 / missing 收集 / 链式发散）
//   D. 根因面实况锚（clock-app mjs import 实况 + alarm-ringtone.js 源码在位）
//   E. 三道防线文面锚（vite 1.65 段 / verify-dist ②b / e2e-dist-smoke 监控面）
//
// 纪律：纯逻辑零 DOM 零网络零 Playwright。
//
// 关联 #260 #158 #226 #139 #138 #256（scripts/lib 先例） #18 §5/§9/§7.5。

import { describe, test, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractRelImports, resolveImportPath, resolveImportCandidates, collectImportClosure,
} from '../scripts/lib/module-import-graph.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ==================== A. extractRelImports ====================

describe('A. extractRelImports（三类相对 import 收口）', () => {
  test('A1 静态具名 import（#260 根因形态）', () => {
    const code = `import { findAlarmRingtone, alarmRingtoneUrl } from '../../js/aosp/alarm-ringtone.js';`;
    expect(extractRelImports(code)).toEqual(['../../js/aosp/alarm-ringtone.js']);
  });

  test('A2 三类写法全覆盖（static from / side-effect / dynamic + re-export）', () => {
    const code = [
      `import { x } from './a.js';`,
      `import * as ns from "../b.mjs";`,
      `import def from './c.js';`,
      `import './side-effect.js';`,
      `const m = await import('./dyn.js');`,
      `import('./dyn2.js');`,
      `export { helper } from './reexport.js';`,
      `export * from '../up/reexport2.js';`,
    ].join('\n');
    const got = extractRelImports(code);
    expect(got).toEqual([
      './a.js', '../b.mjs', './c.js', './side-effect.js', './dyn.js', './dyn2.js', './reexport.js', '../up/reexport2.js',
    ]);
  });

  test('A3 豁免：裸包名 / 绝对路径 / URL / 无扩展名目录级', () => {
    const code = [
      `import vue from 'vue';`,
      `import x from '/assets/chunk-abc.js';`,
      `import y from 'https://cdn.example.com/z.js';`,
      `import z from 'virtual:mod';`,
      `import w from './dir/';`,
    ].join('\n');
    expect(extractRelImports(code)).toEqual([]);
  });

  test('A4 去重保序 + 非字符串入参安全', () => {
    const code = `import { b } from './b.js';\nimport { a } from './a.js';\nimport { b2 } from './b.js';`;
    expect(extractRelImports(code)).toEqual(['./b.js', './a.js']);
    expect(extractRelImports('')).toEqual([]);
    expect(extractRelImports(null)).toEqual([]);
    expect(extractRelImports(42)).toEqual([]);
  });

  test('A5 多说明符单行（import a from "./x.js", { b } from "./y.js" 形态）逐个收口', () => {
    const code = `import a from './x.js';\nimport { b } from "./y.js";`;
    expect(extractRelImports(code)).toEqual(['./x.js', './y.js']);
  });
});

// ==================== B. resolveImportPath / resolveImportCandidates ====================

describe('B. 相对 import 解析（扩展名策略 + 越界防护）', () => {
  test('B1 带扩展名直接归一（#260 真实形态：apps/clock-app → js/aosp）', () => {
    expect(resolveImportPath('ios-desktop/apps/clock-app', '../../js/aosp/alarm-ringtone.js'))
      .toBe('ios-desktop/js/aosp/alarm-ringtone.js');
  });

  test('B2 无扩展名候选序列（原样 / .js / .mjs / /index.js / /index.mjs）', () => {
    expect(resolveImportCandidates('ios-desktop/apps/clock-app', './alarm'))
      .toEqual([
        'ios-desktop/apps/clock-app/alarm',
        'ios-desktop/apps/clock-app/alarm.js',
        'ios-desktop/apps/clock-app/alarm.mjs',
        'ios-desktop/apps/clock-app/alarm/index.js',
        'ios-desktop/apps/clock-app/alarm/index.mjs',
      ]);
  });

  test('B3 带扩展名 → 单候选（不发散）', () => {
    expect(resolveImportCandidates('ios-desktop/js', './pkg/zip-reader.js'))
      .toEqual(['ios-desktop/js/pkg/zip-reader.js']);
  });

  test('B4 越出根返回 null / 非相对说明符拒绝', () => {
    expect(resolveImportPath('ios-desktop/apps/x', '../../../../outside.js')).toBe(null);
    expect(resolveImportPath('ios-desktop/apps/x', 'vue')).toBe(null);
    expect(resolveImportPath('ios-desktop/apps/x', '')).toBe(null);
    expect(resolveImportPath('', './a.js')).toBe(null);
  });

  test('B5 多级相对段归一（./ 与 ../ 混合）', () => {
    expect(resolveImportPath('ios-desktop/apps/clock-app', './sub/../alarm.mjs'))
      .toBe('ios-desktop/apps/clock-app/alarm.mjs');
  });
});

// ==================== C. collectImportClosure（不动点闭包遍历） ====================

/** 内存 FS 组装（path → content），exists 按 path 集判定 */
function memFs(files) {
  const set = new Set(Object.keys(files));
  return {
    readFile: (p) => (p in files ? files[p] : null),
    exists: (p) => set.has(p),
  };
}

describe('C. collectImportClosure（不动点 / 循环 / missing）', () => {
  test('C1 #260 根因场景：入口 alarm.mjs → 缺失 alarm-ringtone.js 记入 missing', () => {
    const io = memFs({
      'ios-desktop/apps/clock-app/alarm.mjs': `import { x } from '../../js/aosp/alarm-ringtone.js';`,
    });
    const r = collectImportClosure({
      entries: ['ios-desktop/apps/clock-app/alarm.mjs'],
      rootDir: 'ios-desktop',
      ...io,
    });
    expect(r.visited).toEqual(['ios-desktop/apps/clock-app/alarm.mjs']);
    expect(r.missing).toHaveLength(1);
    expect(r.missing[0].spec).toBe('../../js/aosp/alarm-ringtone.js');
    expect(r.missing[0].resolved).toContain('ios-desktop/js/aosp/alarm-ringtone.js');
  });

  test('C2 补齐后闭包收敛（目标在集内 → 零 missing + 目标入 visited）', () => {
    const io = memFs({
      'ios-desktop/apps/clock-app/alarm.mjs': `import { x } from '../../js/aosp/alarm-ringtone.js';`,
      'ios-desktop/js/aosp/alarm-ringtone.js': `export const x = 1;`,
    });
    const r = collectImportClosure({
      entries: ['ios-desktop/apps/clock-app/alarm.mjs'],
      rootDir: 'ios-desktop',
      ...io,
    });
    expect(r.missing).toHaveLength(0);
    expect(r.visited).toContain('ios-desktop/js/aosp/alarm-ringtone.js');
  });

  test('C3 链式发散（a→b→c 三跳全部入 visited）', () => {
    const io = memFs({
      'a.js': `import './b.js';`,
      'b.js': `import { c } from './c.js';`,
      'c.js': `export const c = 3;`,
    });
    const r = collectImportClosure({ entries: ['a.js'], rootDir: '.', ...io });
    expect(r.missing).toHaveLength(0);
    expect(r.visited).toEqual(['a.js', 'b.js', 'c.js']);
  });

  test('C4 循环引用不死循环（a↔b 双向 import 有限收敛）', () => {
    const io = memFs({
      'a.js': `import './b.js';`,
      'b.js': `import './a.js';`,
    });
    const r = collectImportClosure({ entries: ['a.js'], rootDir: '.', ...io });
    expect(r.missing).toHaveLength(0);
    expect(r.visited).toEqual(['a.js', 'b.js']);
  });

  test('C5 无扩展名说明符按候选序列命中 .js', () => {
    const io = memFs({
      'a.js': `import './peer';`,
      'peer.js': `export {};`,
    });
    const r = collectImportClosure({ entries: ['a.js'], rootDir: '.', ...io });
    expect(r.missing).toHaveLength(0);
    expect(r.visited).toContain('peer.js');
  });

  test('C6 空 entries / 读不到内容的入口不发散', () => {
    const io = memFs({});
    const r1 = collectImportClosure({ entries: [], rootDir: '.', ...io });
    expect(r1.visited).toEqual([]);
    const r2 = collectImportClosure({ entries: ['ghost.js'], rootDir: '.', ...io });
    expect(r2.visited).toEqual(['ghost.js']);
    expect(r2.missing).toHaveLength(0);
  });
});

// ==================== D. 根因面实况锚 ====================

describe('D. 根因面实况（源码在位 + import 链真实）', () => {
  test('D1 alarm.mjs / timer.mjs 确有 alarm-ringtone import（根因面真实存在，防锚空转）', () => {
    const alarm = readFileSync(path.join(ROOT, 'ios-desktop/apps/clock-app/alarm.mjs'), 'utf-8');
    const timer = readFileSync(path.join(ROOT, 'ios-desktop/apps/clock-app/timer.mjs'), 'utf-8');
    expect(alarm).toMatch(/import\s+\{[^}]+\}\s+from\s+'\.\.\/\.\.\/js\/aosp\/alarm-ringtone\.js'/);
    expect(timer).toMatch(/import\s+\{[^}]+\}\s+from\s+'\.\.\/\.\.\/js\/aosp\/alarm-ringtone\.js'/);
  });

  test('D2 alarm-ringtone.js 源码在位（补复制通道的数据源）', () => {
    expect(existsSync(path.join(ROOT, 'ios-desktop/js/aosp/alarm-ringtone.js'))).toBe(true);
  });

  test('D3 对 alarm.mjs 跑闭包 → alarm-ringtone.js 被闭环（根因文件从 missing 消除）', () => {
    const alarmCode = readFileSync(path.join(ROOT, 'ios-desktop/apps/clock-app/alarm.mjs'), 'utf-8');
    const ringCode = readFileSync(path.join(ROOT, 'ios-desktop/js/aosp/alarm-ringtone.js'), 'utf-8');
    const io = memFs({
      'ios-desktop/apps/clock-app/alarm.mjs': alarmCode,
      'ios-desktop/js/aosp/alarm-ringtone.js': ringCode,
      // app.mjs（alarm.mjs 的兄弟依赖）置空内容：入 visited 不发散，测域聚焦根因文件
      'ios-desktop/apps/clock-app/app.mjs': `/* content not needed for this anchor */`,
    });
    const r = collectImportClosure({
      entries: ['ios-desktop/apps/clock-app/alarm.mjs'],
      rootDir: 'ios-desktop',
      ...io,
    });
    expect(r.visited).toContain('ios-desktop/js/aosp/alarm-ringtone.js');
    expect(r.missing.some((m) => /alarm-ringtone/.test(m.spec))).toBe(false);
  });
});

// ==================== E. 三道防线文面锚 ====================

describe('E. 三道防线文面（构建器 / verify-dist / e2e-dist-smoke）', () => {
  test('E1 vite.config.js 1.65 段在位（模块图 import 闭包补复制通道）', () => {
    const cfg = readFileSync(path.join(ROOT, 'vite.config.js'), 'utf-8');
    expect(cfg).toContain('1.65');
    expect(cfg).toContain('module-import-graph');
    expect(cfg).toContain('extractRelImports');
    expect(cfg).toContain('resolveImportCandidates');
    expect(cfg).toMatch(/1\.65.*#260/s);
  });

  test('E2 verify-dist ②b 模块图闭合段在位（HTML 级升到模块图级）', () => {
    const v = readFileSync(path.join(ROOT, 'scripts/verify-dist.mjs'), 'utf-8');
    expect(v).toContain('②b');
    expect(v).toContain('module-import-graph');
    expect(v).toMatch(/模块图 import 悬空/);
  });

  test('E3 e2e-dist-smoke console error 监控 + 时钟功能级断言在位', () => {
    const e = readFileSync(path.join(ROOT, 'scripts/e2e-dist-smoke.mjs'), 'utf-8');
    expect(e).toContain('attachConsoleGuard');
    expect(e).toMatch(/Failed to load resource/);
    expect(e).toMatch(/clockFunctionalProbe/);
    expect(e).toMatch(/#260 时钟功能级：秒表走动/);
    expect(e).toMatch(/#260 时钟功能级：闹钟 seed 渲染/);
  });

  test('E4 纯逻辑核零 Node 专属 API（纯逻辑纪律：fs/path 不入核）', () => {
    const lib = readFileSync(path.join(ROOT, 'scripts/lib/module-import-graph.js'), 'utf-8');
    expect(lib).not.toMatch(/require\(/);
    expect(lib).not.toMatch(/from\s+'node:/);
    expect(lib).not.toMatch(/import\s+fs|readFileSync|readdirSync/);
  });
});
