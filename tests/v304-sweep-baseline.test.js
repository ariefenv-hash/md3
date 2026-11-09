// ==================== v304-sweep-baseline.test.js — 深测全绿面回归基线（#304） ====================
//
// 覆盖面：
//   A 出口立契：SWEEP_CHANNELS 三通道口径序 / SCHEMA / normalizeCounts 契约与防御
//   B buildBaseline：apps 映射形态 / ok 派生 / summary 汇总 / 重复 id 与缺 id 防御 / meta 透传
//   C compareReportToBaseline 六态状态机：双零 green / 精确相等豁免 / 超基线红 /
//     低于基线改善（含清零改善） / unknown 红 / missing 红 / 防御路径
//   D 真身直连 docs/sweep-baseline.json：schema / 应用面规模 / 逐通道整数 /
//     summary 与 apps 重算一致性 / head/note 登记
//   E sweep 脚本接线面（源文本锚）：lib import / --write-baseline / 对比调用 /
//     豁免命中注记 / 三态标签 / 退出码完整性
//   F npm 脚本面：sweep:write-baseline 入册 / e2e:sweep 原样
//   G 负向锚：基线遭无声劣化（净增异常）必被咬住——本闸存在意义本体

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  buildBaseline, compareReportToBaseline, normalizeCounts,
  SWEEP_CHANNELS, SWEEP_BASELINE_SCHEMA,
} from '../scripts/sweep-baseline-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => readFileSync(path.join(ROOT, p), 'utf8');

const app = (id, pe = 0, cr = 0, nf = 0, dir = null) => ({ id, dir, pageerror: pe, consoleRes: cr, netfail: nf });

// ==================== A 出口立契 ====================
describe('v304 A · 出口立契', () => {
  it('A1 SWEEP_CHANNELS 恰三通道且序固定（pageerror/consoleRes/netfail，与 e2e-app-sweep 三防线口径逐字对齐）', () => {
    expect(SWEEP_CHANNELS).toEqual(['pageerror', 'consoleRes', 'netfail']);
  });
  it('A2 SCHEMA 常量 =1（快照版本化起点，升级走 schema 而非静默改形）', () => {
    expect(SWEEP_BASELINE_SCHEMA).toBe(1);
  });
  it('A3 normalizeCounts 恒等归一（三键全在）', () => {
    expect(normalizeCounts({ pageerror: 2, consoleRes: 0, netfail: 3 })).toEqual({ pageerror: 2, consoleRes: 0, netfail: 3 });
  });
  it('A4 normalizeCounts 防御：负数/非整数/缺通道/null 一律抛错（静默钳制即假绿）', () => {
    expect(() => normalizeCounts({ pageerror: -1, consoleRes: 0, netfail: 0 })).toThrow(TypeError);
    expect(() => normalizeCounts({ pageerror: 1.5, consoleRes: 0, netfail: 0 })).toThrow(TypeError);
    expect(() => normalizeCounts({ pageerror: 0, consoleRes: 0 })).toThrow(TypeError);
    expect(() => normalizeCounts(null)).toThrow(TypeError);
    expect(() => normalizeCounts('x')).toThrow(TypeError);
  });
});

// ==================== B buildBaseline ====================
describe('v304 B · buildBaseline 快照构建', () => {
  it('B1 apps 映射形态：dir 透传 / ok 由三通道和派生 / 计数三键齐（样例 dir 用非应用词，防矩阵生成器消费映射误挂）', () => {
    const bl = buildBaseline([app('a'), app('b', 0, 1, 2, 'zz-noop-dir')]);
    expect(bl.apps.a).toEqual({ dir: null, ok: true, pageerror: 0, consoleRes: 0, netfail: 0 });
    expect(bl.apps.b).toEqual({ dir: 'zz-noop-dir', ok: false, pageerror: 0, consoleRes: 1, netfail: 2 });
  });
  it('B2 summary 汇总：apps/appsWithError/totalErrors 三键与输入精确一致', () => {
    const bl = buildBaseline([app('a'), app('b', 1, 0, 0), app('c', 0, 2, 3)]);
    expect(bl.summary).toEqual({ apps: 3, appsWithError: 2, totalErrors: 6 });
  });
  it('B3 meta 透传：generated/head/stamp/note 原样入快照', () => {
    const bl = buildBaseline([app('a')], { generated: 'g', head: 'h', stamp: 's', note: 'n' });
    expect(bl.generated).toBe('g'); expect(bl.head).toBe('h'); expect(bl.stamp).toBe('s'); expect(bl.note).toBe('n');
  });
  it('B4 防御：重复 id / 缺 id / 空数组一律抛错', () => {
    expect(() => buildBaseline([app('a'), app('a')])).toThrow(/重复/);
    expect(() => buildBaseline([{ pageerror: 0, consoleRes: 0, netfail: 0 }])).toThrow(/id/);
    expect(() => buildBaseline([])).toThrow(TypeError);
  });
});

// ==================== C 对比状态机六态 ====================
describe('v304 C · compareReportToBaseline 状态机', () => {
  it('C1 双零 green：全绿实跑对全绿基线 → verdict green 且无重切提示', () => {
    const bl = buildBaseline([app('a'), app('b')], {});
    const r = compareReportToBaseline([app('a'), app('b')], bl);
    expect(r.verdict).toBe('green');
    expect(r.rebaselineNeeded).toBe(false);
    expect(r.exemptionsHit).toEqual([]);
  });
  it('C2 精确相等豁免：基线钉死已知异常（netfail=2），实测逐通道相等 → 豁免命中不翻红（计数钉死防劣化）', () => {
    const bl = buildBaseline([app('a'), app('b', 0, 0, 2)], {});
    const r = compareReportToBaseline([app('a'), app('b', 0, 0, 2)], bl);
    expect(r.verdict).toBe('green');
    expect(r.exemptionsHit).toEqual([{ id: 'b', channels: ['netfail'] }]);
    expect(r.regressions).toEqual([]);
  });
  it('C3 超基线红：实测 3 > 基线 2 → regression（劣化）verdict red', () => {
    const bl = buildBaseline([app('b', 0, 0, 2)], {});
    const r = compareReportToBaseline([app('b', 0, 0, 3)], bl);
    expect(r.verdict).toBe('red');
    expect(r.regressions).toEqual([{ id: 'b', channels: ['netfail'], reason: '实测超基线（劣化）' }]);
  });
  it('C4 低于基线改善（含清零）：实测 0 < 基线 2 → below 改善、verdict green、rebaselineNeeded=true（#297/#298 修复后清零可断言）', () => {
    const bl = buildBaseline([app('b', 0, 0, 2)], {});
    const r = compareReportToBaseline([app('b')], bl);
    expect(r.verdict).toBe('green');
    expect(r.rebaselineNeeded).toBe(true);
    expect(r.improvements).toEqual([{ id: 'b', channels: ['netfail'], reason: '实测低于基线（改善→建议重切）' }]);
  });
  it('C5 unknown 红：实测出现基线没有的应用 → unknownApps + regressions 非空', () => {
    const bl = buildBaseline([app('a')], {});
    const r = compareReportToBaseline([app('a'), app('new1', 0, 1, 0)], bl);
    expect(r.verdict).toBe('red');
    expect(r.unknownApps).toEqual(['new1']);
    expect(r.regressions[0]).toMatchObject({ id: 'new1', channels: ['consoleRes'] });
  });
  it('C6 missing 红：基线出现实测没有的应用 → missingApps 非空（覆盖面静默收缩即红）', () => {
    const bl = buildBaseline([app('a'), app('gone')], {});
    const r = compareReportToBaseline([app('a')], bl);
    expect(r.verdict).toBe('red');
    expect(r.missingApps).toEqual(['gone']);
  });
  it('C7 混合态：超基线优先于低于基线（同应用一超一降判 regression，净劣化口径）', () => {
    const bl = buildBaseline([app('x', 0, 1, 2)], {});
    const r = compareReportToBaseline([app('x', 1, 0, 2)], bl);
    expect(r.verdict).toBe('red');
    expect(r.regressions[0].channels).toEqual(['pageerror']);
  });
  it('C8 防御：报告重复 id 抛错 / 基线 schema 不合抛错 / apps 空抛错', () => {
    const bl = buildBaseline([app('a')], {});
    expect(() => compareReportToBaseline([app('a'), app('a')], bl)).toThrow(/重复/);
    expect(() => compareReportToBaseline([app('a')], { schema: 99, apps: {} })).toThrow(TypeError);
    expect(() => compareReportToBaseline([], bl)).toThrow(TypeError);
  });
});

// ==================== D 真身直连 docs/sweep-baseline.json ====================
describe('v304 D · 基线快照文件真身直连', () => {
  const RAW = R('docs/sweep-baseline.json');
  const bl = JSON.parse(RAW);
  it('D1 schema=1 且 apps 映射为对象', () => {
    expect(bl.schema).toBe(SWEEP_BASELINE_SCHEMA);
    expect(typeof bl.apps).toBe('object');
    expect(Array.isArray(bl.apps)).toBe(false);
  });
  it('D2 应用面规模 ≥40（桌面图标真源快照，防静默收缩）', () => {
    expect(Object.keys(bl.apps).length).toBeGreaterThanOrEqual(40);
  });
  it('D3 逐应用三通道皆为非负整数（契约面）', () => {
    for (const [id, a] of Object.entries(bl.apps)) {
      expect(a, id).toBeTruthy();
      for (const ch of SWEEP_CHANNELS) expect(Number.isInteger(a[ch]) && a[ch] >= 0, `${id}.${ch}`).toBe(true);
    }
  });
  it('D4 summary 与 apps 重算精确一致（生成件不可手改漂移）', () => {
    const ids = Object.keys(bl.apps);
    let withErr = 0, total = 0;
    for (const id of ids) {
      const s = bl.apps[id].pageerror + bl.apps[id].consoleRes + bl.apps[id].netfail;
      if (s > 0) withErr++;
      total += s;
      expect(bl.apps[id].ok, id).toBe(s === 0);
    }
    expect(bl.summary.apps).toBe(ids.length);
    expect(bl.summary.appsWithError).toBe(withErr);
    expect(bl.summary.totalErrors).toBe(total);
  });
  it('D5 head/note 登记在案（快照可溯源：head 十六进制短串、note 含 #304 与重切指引）', () => {
    expect(bl.head === null || /^[0-9a-f]{7,40}$/.test(bl.head)).toBe(true);
    expect(String(bl.note || '')).toContain('#304');
    expect(String(bl.note || '')).toContain('sweep:write-baseline');
  });
});

// ==================== E sweep 脚本接线面（源文本锚，真身不改语义） ====================
describe('v304 E · e2e-app-sweep.mjs 接线面', () => {
  const SRC = R('scripts/e2e-app-sweep.mjs');
  it('E1 纯逻辑层 import 在案（真身直连同源）', () => {
    expect(SRC).toContain("from './sweep-baseline-lib.mjs'");
    expect(SRC).toContain('compareReportToBaseline(');
    expect(SRC).toContain('buildBaseline(');
  });
  it('E2 --write-baseline 重切入口 + docs/sweep-baseline.json 路径单源', () => {
    expect(SRC).toContain("'--write-baseline'");
    expect(SRC).toContain("docs/sweep-baseline.json");
  });
  it('E3 豁免命中注记与三态标签（已知异常/新增异常/劣化/改善）逐字在案', () => {
    expect(SRC).toContain('#304 豁免命中');
    expect(SRC).toContain('基线未登记（新增异常）');
    expect(SRC).toContain('超基线（劣化）');
    expect(SRC).toContain('低于基线（改善');
  });
  it('E4 基线装载降级口径：解析失败不静默假绿', () => {
    expect(SRC).toContain('按零豁免口径继续');
  });
  it('E5 退出码完整性：基线红计入 fail（fail ? 1 : 0 单一出口）', () => {
    expect(SRC).toContain('process.exit(fail ? 1 : 0)');
  });
});

// ==================== F npm 脚本面 ====================
describe('v304 F · npm 脚本面', () => {
  const pkg = JSON.parse(R('package.json'));
  it('F1 sweep:write-baseline 入册且指向 --write-baseline', () => {
    expect(pkg.scripts['sweep:write-baseline']).toBe('node scripts/e2e-app-sweep.mjs --write-baseline');
  });
  it('F2 e2e:sweep 原样（零改动既有消费面）', () => {
    expect(pkg.scripts['e2e:sweep']).toBe('node scripts/e2e-app-sweep.mjs');
  });
});

// ==================== G 负向锚：本闸存在意义本体 ====================
describe('v304 G · 负向锚（无声劣化必被咬住）', () => {
  it('G1 基线遭无声劣化（净增一例 netfail）→ 必判红并列出通道（防止「无声劣化」的本体断言）', () => {
    const bl = buildBaseline([app('a'), app('b')], {});
    const drifted = [app('a'), app('b', 0, 0, 1)];
    const r = compareReportToBaseline(drifted, bl);
    expect(r.verdict).toBe('red');
    expect(r.regressions).toEqual([{ id: 'b', channels: ['netfail'], reason: '实测超基线（劣化）' }]);
  });
  it('G2 手改基线文件把异常洗零 → 下轮实跑异常将被判「基线未登记」红（改基线绕闸不可达）', () => {
    // 攻击路径：把基线里 b 的 netfail 2 手改成 0，实跑仍报 2 → over 判红
    const bl = buildBaseline([app('b')], {});
    const tampered = JSON.parse(JSON.stringify(bl));
    tampered.apps.b.netfail = 0;
    const r = compareReportToBaseline([app('b', 0, 0, 2)], tampered);
    expect(r.verdict).toBe('red');
    expect(r.regressions[0].channels).toEqual(['netfail']);
  });
});
