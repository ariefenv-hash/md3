// ==================== e2e-playwright-skeleton.test.js — #272 批 1 骨架+三档清单契约锚 ====================
//
// 六组锚（R151 窗批 1 立卡 v11.07 · R152 窗批 2 摘旗+纠偏演进重锚 v11.07 · Job 2932311 · 第 1 定时消息系列）：
//   A 组 骨架契约（config 文件 + npm 入册 + e2e-specs 落点；A6 批 2 摘旗演进重锚）
//   B 组 生成器纯逻辑（v 前缀判别 / 产物写面信号 / 三档分类 / C 档规则性记 0）
//   C 组 产物对账（清单真身 vs 实树扫描：计数/档位/存在性零漂移）
//   D 组 对账闸与负向锚（verifyArtifact 洗账必红 / --check 纪律 / 渐进交接锚）
//   E 组 批 2 契约（TIER_OVERRIDES 纠偏表 / 摘旗兑现 / workers=1 纪律 / 首批 spec 在树）
// 自指防雷：合成名一律短键拼接构造（mk()），不落盘面路径形态；真实名皆实树存在件。

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  V_PREFIX_RE,
  detectArtifactSignals,
  classifyTier,
  buildInventory,
  verifyArtifact,
  TIER_OVERRIDES,
} from '../scripts/gen-e2e-inventory.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = readFileSync(join(ROOT, 'playwright.config.js'), 'utf8');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const ARTIFACT = JSON.parse(readFileSync(join(ROOT, 'docs/audits/e2e-inventory.json'), 'utf8'));

// 短键拼接构造（防雷纪律：源码文本不落完整合成路径形态）
const mkV = () => `e2e-v${9}${9}${9}-mk-${'x'}.mjs`;
const mkA = () => `e2e-mk-${'y'}.mjs`;

describe('A 组 · 骨架契约（#272 卡面建议①逐字兑现）', () => {
  it('A1 retries=2 锚', () => {
    expect(CONFIG).toContain('retries: 2');
  });
  it('A2 失败 trace 保留锚', () => {
    expect(CONFIG).toContain("trace: 'retain-on-failure'");
  });
  it('A3 失败截图锚', () => {
    expect(CONFIG).toContain("screenshot: 'only-on-failure'");
  });
  it('A4 reporter list+html(never) 双锚', () => {
    expect(CONFIG).toContain("['list']");
    expect(CONFIG).toContain("['html', { open: 'never' }]");
  });
  it('A5 testDir 指向 e2e-specs 且落点目录在树', () => {
    expect(CONFIG).toContain("testDir: './e2e-specs'");
    expect(existsSync(join(ROOT, 'e2e-specs'))).toBe(true);
    expect(existsSync(join(ROOT, 'e2e-specs/README.md'))).toBe(true);
  });
  it('A6 npm e2e:pw 入册（批 2 摘旗兑现锚——旗标摘除后裸命令）', () => {
    // R151 批 1 锚原为 `playwright test --pass-with-no-tests`（空跑旗标在位）——
    // 锚自注「首批 spec 接入后摘除该旗标（渐进批 2 交接锚）」，批 2 兑现后演进重锚。
    expect(PKG.scripts['e2e:pw']).toBe('playwright test');
  });
  it('A7 README 摘旗交接登记（批 1 空目录契约留痕 + 批 2 首批接入纪要在卷）', () => {
    const readme = readFileSync(join(ROOT, 'e2e-specs/README.md'), 'utf8');
    expect(readme).toContain('--pass-with-no-tests');
    expect(readme).toContain('批 2');
  });
});

describe('B 组 · 生成器纯逻辑（判据单一真源）', () => {
  it('B1 v 前缀正则：真实前缀件命中（vNNN 与 vNNNc 双形态）', () => {
    expect(V_PREFIX_RE.test('e2e-v862-taskbar-transient.mjs')).toBe(true);
    expect(V_PREFIX_RE.test('e2e-v207c-appnotif.mjs')).toBe(true);
  });
  it('B2 v 前缀正则：中段引用不算前缀（锚定语义）', () => {
    expect(V_PREFIX_RE.test('e2e-live-v779.mjs')).toBe(false);
    expect(V_PREFIX_RE.test('e2e-app-sweep.mjs')).toBe(false);
  });
  it('B3 classifyTier：A/B 双档映射', () => {
    expect(classifyTier(mkV())).toBe('B');
    expect(classifyTier(mkA())).toBe('A');
  });
  it('B4 classifyTier 永不判 C（C 档机械不可判=规则性记 0）', () => {
    for (const n of ['e2e-v1-mk.mjs', 'e2e-x.mjs', 'e2e-v42b-mk.mjs']) {
      expect(classifyTier(n)).not.toBe('C');
    }
  });
  it('B5 产物写面信号：命中与零命中双锚', () => {
    expect(detectArtifactSignals('run --update then exit')).toContain('--update');
    expect(detectArtifactSignals('const x = writeFileSync(p, d);')).toContain('writeFileSync(');
    expect(detectArtifactSignals('plain assert only')).toEqual([]);
  });
  it('B6 buildInventory：计数与行序双锚（合成集）', () => {
    const inv = buildInventory([
      { file: `scripts/${mkA()}`, basename: mkA(), text: '// head\nrun', referencedByNpm: false, referencedByWorkflows: false },
      { file: `scripts/${mkV()}`, basename: mkV(), text: '// x\n--write', referencedByNpm: true, referencedByWorkflows: false },
    ]);
    expect(inv.counts.total).toBe(2);
    expect(inv.counts.A).toBe(1);
    expect(inv.counts.B).toBe(1);
    expect(inv.counts.C).toBe(0);
    expect(inv.scripts[0].basename < inv.scripts[1].basename).toBe(true);
  });
  it('B7 buildInventory：writesArtifacts 信号落账（非档位判据=登记事实）', () => {
    const inv = buildInventory([
      { file: `scripts/${mkA()}`, basename: mkA(), text: 'node x --update', referencedByNpm: false, referencedByWorkflows: false },
    ]);
    expect(inv.scripts[0].tier).toBe('A');
    expect(inv.scripts[0].writesArtifacts).toContain('--update');
  });
});

describe('C 组 · 产物对账（清单真身 vs 实树零漂移）', () => {
  const realNames = readdirSync(join(ROOT, 'scripts')).filter((n) => /^e2e-.*\.mjs$/.test(n)).sort();

  it('C1 counts.total 与实树扫描一致（卡面 227→230 漂移以现值为准）', () => {
    expect(ARTIFACT.counts.total).toBe(realNames.length);
    expect(ARTIFACT.counts.total).toBe(ARTIFACT.scripts.length);
  });
  it('C2 档位算术闭合 A+B+C=total 且 C=0（规则性登记）', () => {
    const c = ARTIFACT.counts;
    expect(c.A + c.B + c.C).toBe(c.total);
    expect(c.C).toBe(0);
    expect(ARTIFACT.tierRules.C).toContain('禁止机械判删');
  });
  it('C3 逐行档位与 classifyTier 零漂移（无人工翻档）', () => {
    for (const row of ARTIFACT.scripts) {
      expect(row.tier).toBe(classifyTier(basename(row.file)));
    }
  });
  it('C4 清单逐行实树存在（新增未再生必被咬住）', () => {
    for (const row of ARTIFACT.scripts) {
      expect(existsSync(join(ROOT, row.file))).toBe(true);
    }
  });
  it('C5 实树逐行在清单（删除未再生必被咬住）+ 双 harness npm 引用在账', () => {
    const listed = new Set(ARTIFACT.scripts.map((s) => basename(s.file)));
    for (const n of realNames) expect(listed.has(n)).toBe(true);
    const byFile = Object.fromEntries(ARTIFACT.scripts.map((s) => [s.file, s]));
    expect(byFile['scripts/e2e-dist-smoke.mjs'].referencedByNpm).toBe(true);
    expect(byFile['scripts/e2e-app-sweep.mjs'].referencedByNpm).toBe(true);
    expect(byFile['scripts/e2e-dist-smoke.mjs'].referencedByWorkflows).toBe(true);
  });
  it('C6 只读盘点承诺在账（零删除零改写零改名锚）', () => {
    expect(ARTIFACT.read_only_pledge).toContain('零删除零改写零改名');
  });
});

describe('D 组 · 对账闸与负向锚（洗账必红）', () => {
  const mkFiles = (n) => [
    { file: `scripts/${mkA()}`, basename: mkA(), text: 'a', referencedByNpm: false, referencedByWorkflows: false },
    { file: `scripts/${mkV()}`, basename: mkV(), text: 'b', referencedByNpm: false, referencedByWorkflows: false },
  ].slice(0, n);

  it('D1 verifyArtifact：全量对账 ok', () => {
    const inv = buildInventory(mkFiles(2));
    expect(verifyArtifact(mkFiles(2), inv).ok).toBe(true);
  });
  it('D2 负向锚：新增脚本未再生 → missing 必红', () => {
    const inv = buildInventory(mkFiles(1));
    const r = verifyArtifact(mkFiles(2), inv);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('missing');
  });
  it('D3 负向锚：删除脚本未再生 → stale 必红', () => {
    const inv = buildInventory(mkFiles(2));
    const r = verifyArtifact(mkFiles(1), inv);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('stale');
  });
  it('D4 生成器 --check 纪律与逐字节校验在源（+渐进入册锚）', () => {
    const src = readFileSync(join(ROOT, 'scripts/gen-e2e-inventory.mjs'), 'utf8');
    expect(src).toContain('--check');
    expect(src).toContain('exit(1)');
    const doc = readFileSync(join(ROOT, 'docs/e2e-playwright-adoption.md'), 'utf8');
    expect(doc).toContain('§4 渐进路线');
    expect(doc).toContain('异槽约束');
  });
});

describe('E 组 · 批 2 契约（纠偏表化 / 摘旗 / workers 纪律 / 首批 spec 在树）', () => {
  it('E1 classifyTier 纠偏表命中：评审批纠偏件归 B，非纠偏件保持机械结果', () => {
    expect(classifyTier('e2e-probe2.mjs')).toBe('B');
    expect(classifyTier('e2e-sweep-a1-compat.mjs')).toBe('B');
    expect(classifyTier('e2e-live-v779.mjs')).toBe('B');
    // 非纠偏件：机械判别原样（常青真源件不被动）
    expect(classifyTier('e2e-app-sweep.mjs')).toBe('A');
    expect(classifyTier('e2e-dist-smoke.mjs')).toBe('A');
    expect(classifyTier(mkA())).toBe('A');
  });
  it('E2 纠偏表纪律：逐行附非空理由 + 纠偏单向（只 A→B，禁止升档回 A）', () => {
    const entries = Object.entries(TIER_OVERRIDES);
    expect(entries.length).toBe(8); // 批 2 评审面=前 10 家中 8 家纠偏；批 3 纠偏时随评审卷演进重锚
    for (const [name, o] of entries) {
      expect(o.reason.length, `${name} 纠偏理由非空`).toBeGreaterThan(10);
      expect(o.tier, `${name} 纠偏单向 A→B`).toBe('B');
      expect(V_PREFIX_RE.test(name), '纠偏件不应是 v 前缀件（机械已 B 无需纠偏）').toBe(false);
    }
  });
  it('E3 产物行 tierOverride 对账：纠偏件随行落理由，非纠偏件空串', () => {
    for (const row of ARTIFACT.scripts) {
      if (TIER_OVERRIDES[row.basename]) {
        expect(row.tier).toBe('B');
        expect(row.tierOverride).toBe(TIER_OVERRIDES[row.basename].reason);
      } else {
        expect(row.tierOverride).toBe('');
      }
    }
  });
  it('E4 批 2 评审面纠偏后计数对账：A 档缩减=纠偏键数，C 仍规则性 0', () => {
    const c = ARTIFACT.counts;
    expect(c.A).toBe(c.total - c.B); // C=0 下的算术闭合
    // 机械 A 档（无纠偏时）= 非 v 前缀全量；纠偏后 A = 机械 A - overrides 键数
    const mechanicalA = ARTIFACT.scripts.filter((s) => !V_PREFIX_RE.test(s.basename)).length;
    expect(mechanicalA - Object.keys(TIER_OVERRIDES).length).toBe(c.A);
    expect(c.B).toBe(ARTIFACT.scripts.filter((s) => s.tier === 'B').length);
  });
  it('E5 批 2 首批 spec 在树（3 件：native 一件 + runner-level 两件）', () => {
    expect(existsSync(join(ROOT, 'e2e-specs/shell-lifecycle.spec.js'))).toBe(true);
    expect(existsSync(join(ROOT, 'e2e-specs/app-sweep-regression.spec.js'))).toBe(true);
    expect(existsSync(join(ROOT, 'e2e-specs/dist-smoke-regression.spec.js'))).toBe(true);
  });
  it('E6 workers=1 顺序纪律入 config（固定端口子进程防撞契约）', () => {
    expect(CONFIG).toContain('workers: 1');
  });
  it('E7 摘旗后裸命令形态：npm e2e:pw 无 --pass-with-no-tests 残留', () => {
    expect(PKG.scripts['e2e:pw']).not.toContain('--pass-with-no-tests');
  });
});
