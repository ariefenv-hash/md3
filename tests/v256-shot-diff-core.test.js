// ==================== v256-shot-diff-core.test.js — #256 截图指纹 diff 纯逻辑核回归 ====================
//
// 背景：#246 建议③「视觉快照回归」承载卡（#256 · R127 窗主任务 · Job 2932311）。
// #246 已 closed 但建议③明确遗留（关单帖 6713041575 交付建议①②，R124/R125/R126 三窗账
// 续点候选连续在列「#246 建议③ 待下窗立卡」）——本卡立卡即实施。
//
// 覆盖（#256 验收②逐条对应）：
//   A. 指纹距离（L1 平均：相同→0 / 单调性 / 全反相→1 / 长度不等与非法输入→null）
//   B. 分档边界语义（<0.02 match / 0.02≤d<0.08 drift / ≥0.08 major / invalid）
//   C. 报告组装（六桶语义：match/drift/major/missing/resized/skip + 指纹不可比兜底）
//   D. 报告渲染（计数行 + 分档明细行 + 非阻断提示）
//   E. 退出码（#235 教训固化：默认恒 0 告警不阻断；--strict 漂移及以上才 fail；skip 不计 fail）
//   F. CLI 参数（--update/--strict/--apps/--port/--threshold + 默认组 10 家双视口口径）
//
// 纪律：纯逻辑零 DOM 零网络零 Playwright（IO 层 scripts/shot-baseline.mjs 不在本测域，
// 浏览器截图路径由 dist-smoke 与真跑门禁覆盖）。
//
// 关联 #256 #246 #230 #229 #246 边界④（零第三方像素 diff） #18 §5/§9/§7.5。

import { describe, test, expect } from 'vitest';
import {
  FP_SIZE, DRIFT_THRESHOLD, MAJOR_THRESHOLD, DEFAULT_APPS, VIEWPORTS,
  fingerprintDistance, classifyDiff, buildReport, renderReport, computeExitCode, parseArgs,
} from '../scripts/lib/shot-fingerprint-core.js';

// ==================== A. 指纹距离 ====================

describe('A. fingerprintDistance（L1 平均）', () => {
  test('A1 相同指纹 → 0', () => {
    const fp = Array.from({ length: FP_SIZE * FP_SIZE }, (_, i) => (i % 7) / 7);
    expect(fingerprintDistance(fp, [...fp])).toBe(0);
  });

  test('A2 单调性：差异越大分数越大', () => {
    const base = Array(256).fill(0.5);
    const small = Array(256).fill(0.52);   // 平均差 0.02
    const large = Array(256).fill(0.7);    // 平均差 0.2
    const s1 = fingerprintDistance(base, small);
    const s2 = fingerprintDistance(base, large);
    expect(s1).toBeGreaterThan(0);
    expect(s2).toBeGreaterThan(s1);
    expect(s1).toBeCloseTo(0.02, 6);
  });

  test('A3 全反相 → 1（0 vs 1 亮度）', () => {
    const black = Array(256).fill(0);
    const white = Array(256).fill(1);
    expect(fingerprintDistance(black, white)).toBe(1);
  });

  test('A4 长度不等 → null（不虚构分数，IO 层按 resized 兜底）', () => {
    expect(fingerprintDistance([0.1, 0.2], [0.1])).toBeNull();
  });

  test('A5 空数组 / 非数组 / 非有限值 → null', () => {
    expect(fingerprintDistance([], [])).toBeNull();
    expect(fingerprintDistance(null, [0.1])).toBeNull();
    expect(fingerprintDistance([0.1], 'x')).toBeNull();
    expect(fingerprintDistance([0.1], [Number.NaN])).toBeNull();
    expect(fingerprintDistance([0.1], [Infinity])).toBeNull();
  });
});

// ==================== B. 分档边界语义 ====================

describe('B. classifyDiff 边界（#256 验收② 阈值语义固化）', () => {
  test('B1 边界口径：score < DRIFT match；恰好 DRIFT → drift；恰好 MAJOR → major', () => {
    expect(classifyDiff(0).level).toBe('match');
    expect(classifyDiff(DRIFT_THRESHOLD - 0.0001).level).toBe('match');
    expect(classifyDiff(DRIFT_THRESHOLD).level).toBe('drift');       // 边界值归 drift（不含式上界）
    expect(classifyDiff(MAJOR_THRESHOLD - 0.0001).level).toBe('drift');
    expect(classifyDiff(MAJOR_THRESHOLD).level).toBe('major');
    expect(classifyDiff(0.5).level).toBe('major');
  });

  test('B2 invalid：null / NaN → invalid 档（不冒充分档）', () => {
    expect(classifyDiff(null)).toEqual({ level: 'invalid', score: null });
    expect(classifyDiff(Number.NaN).level).toBe('invalid');
  });

  test('B3 阈值常量与 #256 正文口径一致（drift=0.02 / major=0.08）', () => {
    expect(DRIFT_THRESHOLD).toBe(0.02);
    expect(MAJOR_THRESHOLD).toBe(0.08);
    expect(FP_SIZE).toBe(16);
  });
});

// ==================== C. 报告组装 ====================

const cur = (key, fp, size) => ({ key, app: key.split('-')[0], vp: key.split('-')[1], ok: true, fp, size });

describe('C. buildReport 六桶语义', () => {
  const fpA = Array(256).fill(0.3);
  const fpB = Array(256).fill(0.32);   // 距离 0.02 → drift
  const fpC = Array(256).fill(0.5);    // 距离 0.2 → major
  const base = {
    'a-phone': { fp: fpA, size: [300, 500], at: '2026-11-08T00:00:00Z' },
    'b-phone': { fp: fpB, size: [300, 500], at: '2026-11-08T00:00:00Z' },
    'c-phone': { fp: fpC, size: [300, 500], at: '2026-11-08T00:00:00Z' },
    'd-phone': { fp: fpA, size: [320, 520], at: '2026-11-08T00:00:00Z' },  // 与 e 尺寸不符 → resized
    'e-phone': { fp: fpA, size: [390, 700], at: '2026-11-08T00:00:00Z' },
  };

  test('C1 match/drift/major/resized/missing/skip 各归其桶', () => {
    const report = buildReport([
      cur('a-phone', fpA, [300, 500]),                    // match（0）
      cur('b-phone', fpA, [300, 500]),                    // drift（0.02）
      cur('c-phone', fpA, [300, 500]),                    // major（0.2）
      cur('d-phone', fpA, [390, 700]),                    // resized
      cur('zz-phone', fpA, [300, 500]),                   // missing（基线无）
      { key: 'f-phone', app: 'f', vp: 'phone', ok: false, why: 'iframe 未挂载' },  // skip
    ], base);
    expect(report.match.map((e) => e.key)).toEqual(['a-phone']);
    expect(report.drift.map((e) => e.key)).toEqual(['b-phone']);
    expect(report.major.map((e) => e.key)).toEqual(['c-phone']);
    expect(report.resized.map((e) => e.key)).toEqual(['d-phone']);
    expect(report.missing.map((e) => e.key)).toEqual(['zz-phone']);
    expect(report.skip.map((e) => e.key)).toEqual(['f-phone']);
  });

  test('C2 指纹不可比（长度漂移）→ skip 兜底，不虚构分数', () => {
    const report = buildReport([cur('a-phone', Array(200).fill(0.3), [300, 500])], base);
    expect(report.skip.length).toBe(1);
    expect(report.match.length).toBe(0);
  });

  test('C3 基线对象缺省/损坏 → 全部 missing 不抛错', () => {
    expect(buildReport([cur('a-phone', fpA, [300, 500])], null).missing.length).toBe(1);
    expect(buildReport([cur('a-phone', fpA, [300, 500])], 'junk').missing.length).toBe(1);
    expect(buildReport([], base).match.length).toBe(0);
  });
});

// ==================== D. 报告渲染 ====================

describe('D. renderReport', () => {
  test('D1 计数行 + MAJOR/DRIFT/MISS 明细 + 非阻断提示在案', () => {
    const report = buildReport([
      cur('a-phone', Array(256).fill(0.3), [300, 500]),
      cur('c-phone', Array(256).fill(0.3), [300, 500]),   // vs 基线 0.5 → 距离 0.2 → major
      cur('zz-phone', Array(256).fill(0.3), [300, 500]),
    ], { 'a-phone': { fp: Array(256).fill(0.3), size: [300, 500] }, 'c-phone': { fp: Array(256).fill(0.5), size: [300, 500] } });
    const text = renderReport(report);
    expect(text).toContain('一致 1');
    expect(text).toContain('显著 1');
    expect(text).toContain('缺基线 1');
    expect(text).toContain('MAJOR  c-phone');
    expect(text).toContain('MISS   zz-phone');
    expect(text).toContain('非硬阻断');
    expect(text).toContain('--strict');
  });

  test('D2 全绿报告零明细行不抛错', () => {
    const text = renderReport({ match: [{ key: 'a-phone', score: 0 }], drift: [], major: [], missing: [], resized: [], skip: [] });
    expect(text).toContain('一致 1');
    expect(text).not.toContain('MAJOR');
  });
});

// ==================== E. 退出码（#235 教训固化） ====================

describe('E. computeExitCode（默认恒 0 告警不阻断）', () => {
  const bad = { match: [], drift: [{ key: 'x' }], major: [{ key: 'y' }], missing: [{ key: 'z' }], resized: [], skip: [] };
  const allSkip = { match: [], drift: [], major: [], missing: [], resized: [], skip: [{ key: 'dead', why: 'iframe 未挂载' }] };
  const allMatch = { match: [{ key: 'a-phone', score: 0 }], drift: [], major: [], missing: [], resized: [], skip: [] };

  test('E1 默认（非 strict）恒 exit 0 —— 即使 major/missing 在案（#256 验收① / #246 边界①）', () => {
    expect(computeExitCode(bad, false)).toBe(0);
    expect(computeExitCode(bad, undefined)).toBe(0);
  });

  test('E2 strict：drift/major/missing 任一非空 → 1', () => {
    expect(computeExitCode(bad, true)).toBe(1);
    expect(computeExitCode({ ...bad, drift: [], major: [], missing: [{ key: 'z' }] }, true)).toBe(1);
    expect(computeExitCode({ ...bad, major: [], missing: [] }, true)).toBe(1);
  });

  test('E3 strict + 全 match → 0；skip 不计入 fail（基建不为产品缺陷变红）', () => {
    expect(computeExitCode(allMatch, true)).toBe(0);
    expect(computeExitCode(allSkip, true)).toBe(0);
  });
});

// ==================== F. CLI 参数 + 默认口径 ====================

describe('F. parseArgs + 默认目标组口径', () => {
  test('F1 全参数解析', () => {
    const p = parseArgs(['--update', '--strict', '--apps', 'a, b ,c', '--port', '8099', '--threshold', '0.03']);
    expect(p.update).toBe(true);
    expect(p.strict).toBe(true);
    expect(p.apps).toEqual(['a', 'b', 'c']);
    expect(p.port).toBe(8099);
    expect(p.threshold).toBeCloseTo(0.03);
  });

  test('F2 默认：diff 巡检（update=false）非阻断 + 端口默认', () => {
    const p = parseArgs([]);
    expect(p.update).toBe(false);
    expect(p.strict).toBe(false);
    expect(p.apps).toBeNull();
    expect(p.port).toBe(8096);
    expect(p.threshold).toBeNull();
  });

  test('F3 默认组 10 家（v10.54 P0 批 3 + v10.89 P1 二批 7）双视口（#256 正文口径）', () => {
    expect(DEFAULT_APPS).toHaveLength(10);
    for (const id of ['terminal', 'driving', 'code-editor', 'drawcircle', 'markdown', 'ocr', 'bytebeat', 'midi-player', 'archive', 'ping']) {
      expect(DEFAULT_APPS).toContain(id);
    }
    expect(VIEWPORTS.map((v) => v.name)).toEqual(['phone', 'tablet']);
    expect(VIEWPORTS[0]).toEqual({ name: 'phone', width: 390, height: 844 });
    expect(VIEWPORTS[1]).toEqual({ name: 'tablet', width: 800, height: 1080 });
  });
});
