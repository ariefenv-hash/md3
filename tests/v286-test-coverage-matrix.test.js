// tests/v286-test-coverage-matrix.test.js — #286 core 提取范式覆盖矩阵锚
//
// 覆盖面：
//   A 生成器结构锚：scripts/test-coverage-matrix.mjs 头注立契（#286 + 单真源禁手改 + *Core 范式口径）；
//   B 生成件对账：docs/test-coverage-matrix.md/.json 存在且 --check 逐字节可重现（check:docs-index 同律）；
//   C 汇总对账：52 应用 = 41 iframe + 11 native（与 apps-data.js 定义数逐项吻合）；
//   D 治理水位：全部 *Core 出口被 vitest 消费（100%）——新增 core 必带测试的固化门；
//   E #286 主诉面水位：41 iframe 零 zero-touch + 高频集合（music/files/settings/messages）零 zero-touch；
//   F 矩阵内容锚：高频 4 家口径行 + 四档口径段齐备；
//   G audit H 项量化接线（#286 建议③）：三参 detail 增强且 pass 判据零变化；
//   H 阴性回归：checkH 两参调用与旧版逐字节一致（向后兼容）；coreStatsOf 纯函数三态；
//   I 真实数据抽查：calculator 域 fxCore（沙箱提取范式在案，#286 原文先例）。
//
// 车道边界：本文件只锚 #286 交付面（生成器 + 生成件 + H 项量化 detail）；不改应用源码/测试源码。

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkH, coreStatsOf } from '../scripts/audit-app-quality.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MD_PATH = join(ROOT, 'docs/test-coverage-matrix.md');
const JSON_PATH = join(ROOT, 'docs/test-coverage-matrix.json');

describe('v286 · A 生成器结构锚', () => {
  it('scripts/test-coverage-matrix.mjs 存在且头注立契 #286（单真源禁手改 + *Core 范式口径）', () => {
    const p = join(ROOT, 'scripts/test-coverage-matrix.mjs');
    expect(existsSync(p)).toBe(true);
    const head = readFileSync(p, 'utf8').slice(0, 2200);
    expect(head).toContain('#286');
    expect(head).toContain('单真源');
    expect(head).toContain('#278'); // 车道边界声明：全量出口注册表属 #278
  });
});

describe('v286 · B 生成件对账', () => {
  it('docs/test-coverage-matrix.md/.json 存在且 --check 逐字节可重现', () => {
    expect(existsSync(MD_PATH)).toBe(true);
    expect(existsSync(JSON_PATH)).toBe(true);
    execSync('node scripts/test-coverage-matrix.mjs --check', { cwd: ROOT, stdio: 'pipe' });
  });
});

describe('v286 · C 汇总对账', () => {
  const j = () => JSON.parse(readFileSync(JSON_PATH, 'utf8'));

  it('52 应用 = 41 iframe + 11 native（与 apps-data.js 定义数逐项吻合）', () => {
    const s = j().stats;
    expect(s.appsTotal).toBe(52);
    expect(s.appsIframe).toBe(41);
    expect(s.appsNative).toBe(11);
  });

  it('issue 归属与统计字段齐备', () => {
    const x = j();
    expect(x.issue).toBe(286);
    for (const k of ['coreFull', 'coreGap', 'refOnly', 'zeroTouch', 'zeroTouchP0', 'coresCoveragePct']) {
      expect(x.stats).toHaveProperty(k);
    }
  });

  it('每行应用记录字段齐备（defFile/id/name/form/dir/cores/coreConsumed/tier）', () => {
    for (const a of j().apps) {
      for (const k of ['defFile', 'varName', 'id', 'name', 'form', 'dir', 'cores', 'coreConsumed', 'tier']) {
        expect(a).toHaveProperty(k);
      }
      expect(['iframe', 'native']).toContain(a.form);
      expect(['core-full', 'core-gap', 'ref-only', 'zero-touch']).toContain(a.tier);
    }
  });
});

describe('v286 · D 治理水位', () => {
  it('全部 *Core 出口被 vitest 消费（100% 覆盖率固化；新增 core 必带测试）', () => {
    const s = JSON.parse(readFileSync(JSON_PATH, 'utf8')).stats;
    expect(s.coresTotal).toBeGreaterThanOrEqual(23); // 当前实测 23，新增只增不减
    expect(s.coresConsumed).toBe(s.coresTotal);
    expect(s.coresCoveragePct).toBe(100);
  });
});

describe('v286 · E #286 主诉面水位', () => {
  it('41 iframe 应用零 zero-touch（core 提取或 tests 引用至少一项触达）', () => {
    const x = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
    const iframeZero = x.apps.filter((a) => a.form === 'iframe' && a.tier === 'zero-touch');
    expect(iframeZero).toHaveLength(0);
  });

  it('高频集合（music/files/settings/messages）零 zero-touch（P0=0）', () => {
    const s = JSON.parse(readFileSync(JSON_PATH, 'utf8')).stats;
    expect(s.zeroTouchP0).toBe(0);
  });
});

describe('v286 · F 矩阵内容锚', () => {
  const md = () => readFileSync(MD_PATH, 'utf8');

  it('高频 4 家口径行在矩阵中（#286 原文点名口径）', () => {
    const m = md();
    for (const hot of ['music', 'files', 'settings', 'messages']) {
      expect(m).toContain(`| ${hot} |`);
    }
  });

  it('四档口径段齐备 + 零触达风险序表存在', () => {
    const m = md();
    for (const t of ['core-full', 'core-gap', 'ref-only', 'zero-touch']) {
      expect(m).toContain(`\`${t}\``);
    }
    expect(m).toContain('零触达应用风险序');
  });
});

describe('v286 · G audit H 项量化接线（#286 建议③）', () => {
  it('三参调用 detail 追加 core 消费比，pass 判据仍由 hits 决定（零弱化）', () => {
    const r = checkH('x apps/calculator/ y', 'calculator', { coreTotal: 1, coreConsumed: 1 });
    expect(r.pass).toBe(true);
    expect(r.detail).toBe('tests 引用×1 · core 1/1 被测试消费');
    const r0 = checkH('no ref', 'calculator', { coreTotal: 2, coreConsumed: 0 });
    expect(r0.pass).toBe(false);
    expect(r0.detail).toBe('tests 引用×0 · core 0/2 被测试消费');
  });
});

describe('v286 · H 阴性回归（向后兼容）', () => {
  it('checkH 两参调用与旧版逐字节一致（阴性锚）', () => {
    expect(checkH('x apps/calculator/ yy zz', 'calculator')).toEqual({ pass: true, detail: 'tests 引用×1' });
    expect(checkH('', 'calculator')).toEqual({ pass: false, detail: 'tests 引用×0' });
  });

  it('coreStatsOf 纯函数三态：无 core→null / 去重计数 / 消费按 testsText 提及', () => {
    expect(coreStatsOf('no core here', 'x')).toBeNull();
    const cs = coreStatsOf('window.__aCore(); window.__aCore.b; window.__bCore.c', 'uses aCore only');
    expect(cs).toEqual({ coreTotal: 2, coreConsumed: 1 });
    const csFull = coreStatsOf('window.__aCore.x', 'has aCore');
    expect(csFull).toEqual({ coreTotal: 1, coreConsumed: 1 });
  });
});

describe('v286 · I 真实数据抽查', () => {
  it('calculator 域 fxCore 且被 tests 消费（#286 原文沙箱提取范式先例在案）', () => {
    const x = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
    const calc = x.apps.find((a) => a.varName === 'calculator');
    expect(calc.cores).toContain('fxCore');
    expect(calc.coreConsumed).toContain('fxCore');
    expect(calc.tier).toBe('core-full');
  });

  it('music 域 lyricCore（iframe 应用 core 提取非 js 顶层独有）', () => {
    const x = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
    const music = x.apps.find((a) => a.varName === 'music');
    expect(music.cores).toContain('lyricCore');
    expect(music.form).toBe('iframe');
  });
});
