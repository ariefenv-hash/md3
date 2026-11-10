// ==================== monolith-gate.test.js — 巨石文件「>3000 行」K 段接线锚组（#284 批 1） ====================
//
// 被测真身：scripts/audit-app-quality.mjs K 段（checkMonolithK 纯逻辑层 + runQualityAudit
// 报告/拦截接线 + --json 曝光），数据真源 = docs/audits/monolith-inventory.json 生成件
// （exceeds3000/exempt/status 三字段唯一判据输入，零硬编码文件名——boundary-map §4 设计点 4）。
//
// 常青声明（#291 §6 命名纪律）：本测试为 <特性名>-<行为> 常青锚，随 K 段演进原地改；
// 无 @snapshot 头（B 组盘面锚为「增量拦截就绪」不变式：violations===0 与豁免名单只出不进
// 是治理语义而非交付时点快照，盘面演进时按对账改锚）。
//
// 撰写纪律（自指陷阱防雷，R150 实录）：本文件源码文本会被 gen-test-prefix-inventory.mjs
// 三族正则扫描——①合成 fixture 一律运行时拆串/变量构造；②真实路径字面量仅允许
// 「完整扩展名且仓库根现存」者（docs/audits/monolith-inventory.json、
// ios-desktop/js/apps/settings.js 均现存）；③严禁合成 missing 形态（join(ROOT, 不存在路径)）。

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import {
  checkMonolithK,
  runQualityAudit,
  ITEM_KEYS,
} from '../scripts/audit-app-quality.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INVENTORY_PATH = join(ROOT, 'docs/audits/monolith-inventory.json');
const AUDIT_SRC = readFileSync(join(ROOT, 'scripts/audit-app-quality.mjs'), 'utf-8');
const VITE_CFG = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');

// 豁免名单口径真源（boundary-map §4 设计点 2：MONOLITH_EXEMPT=[settings.js]，
// 只出不进——新增豁免须议题卷对账，本锚即对账闸）
const REGISTERED_EXEMPT = ['ios-desktop/js/apps/settings.js'];

// ---------- 合成清单构造器（分类器纯逻辑测试用，运行时构造零路径字面量风险） ----------
function synthInv(files, threshold = 3000) {
  return { generator: 'synthetic', threshold, files, totals: {} };
}
const fExemptOver = { path: 'a/big.js', kind: 'js', lines: 3500, exceeds3000: true, exempt: true, status: 'K-存量曝光' };
const fFreeOver = { path: 'a/wild.js', kind: 'js', lines: 3200, exceeds3000: true, exempt: false, status: 'K-违规' };
const fOk = { path: 'a/small.js', kind: 'js', lines: 800, exceeds3000: false, exempt: false, status: 'ok' };
// 缩行不退出豁免（防乒乓语义）：exempt 文件缩到阈值下 → ok（不产生假阳性曝光）
const fExemptShrunk = { path: 'a/big.js', kind: 'js', lines: 2999, exceeds3000: false, exempt: true, status: 'ok' };

// ---------- 临时夹具（接线行为测试：tmp root + 最小 app + 合成清单） ----------
function mkTmpRoot(inventoryJson) {
  const dir = join(tmpdir(), `md3-monolith-fx-${process.pid}-${Math.random().toString(36).slice(2, 7)}`);
  const appDir = join(dir, 'ios-desktop', 'apps', 'fxapp');
  mkdirSync(appDir, { recursive: true });
  writeFileSync(join(appDir, 'index.html'), `<!DOCTYPE html><html><head><style>
    .a { color: var(--md-primary, #6750a4); border: 1px solid var(--md-outline-variant, #ccc); background: var(--md-surface, #fff); }
    .b { color: var(--md-on-surface, #111); background: var(--md-surface-container, #eee); }
    .row { display: flex; }
    @media (min-width: 760px) { .row { grid-template-columns: 1fr 1fr; display: grid; } }
    </style></head><body><p class="a">静态页</p></body></html>\n`);
  if (inventoryJson !== null) {
    const invDir = join(dir, 'docs', 'audits');
    mkdirSync(invDir, { recursive: true });
    writeFileSync(join(invDir, 'monolith-inventory.json'), JSON.stringify(inventoryJson, null, 2) + '\n');
  }
  return dir;
}

describe('monolith-gate · A checkMonolithK 分类器纯逻辑（三字段唯一判据）', () => {
  it('A1 超阈+豁免 → K-存量曝光分档（报告级 exposure 命中，violations=0）', () => {
    const r = checkMonolithK(synthInv([fExemptOver, fOk]));
    expect(r.available).toBe(true);
    expect(r.exemptHits).toBe(1);
    expect(r.violations).toBe(0);
    expect(r.over).toBe(1);
    expect(r.exposure[0]).toContain('a/big.js');
    expect(r.exposure[0]).toContain('3500');
    expect(r.offending).toEqual([]);
    expect(r.anomalies).toBe(0);
  });

  it('A2 超阈+非豁免 → K-违规分档（offending 命中，供 hardFailures 进位）', () => {
    const r = checkMonolithK(synthInv([fFreeOver, fOk]));
    expect(r.violations).toBe(1);
    expect(r.exemptHits).toBe(0);
    expect(r.offending[0]).toContain('a/wild.js');
    expect(r.offending[0]).toContain('3200');
  });

  it('A3 缩行不退出豁免（防乒乓）：exempt 文件缩到阈值下 → ok 不曝光', () => {
    const r = checkMonolithK(synthInv([fExemptShrunk, fOk]));
    expect(r.over).toBe(0);
    expect(r.exemptHits).toBe(0);
    expect(r.violations).toBe(0);
    expect(r.exposure).toEqual([]);
  });

  it('A4 未超阈非豁免 → ok 零误报（分类器零假阳性基线）', () => {
    const r = checkMonolithK(synthInv([fOk]));
    expect(r.over).toBe(0);
    expect(r.violations).toBe(0);
    expect(r.exemptHits).toBe(0);
    expect(r.anomalies).toBe(0);
    expect(r.detail).toContain('超阈×0');
  });

  it('A5 三字段失自洽 → anomalies 指认且不入分档（数据真源防腐）', () => {
    const drifted = { ...fExemptOver, status: 'ok' }; // status 手改漂移：布尔判定仍为存量曝光
    const r = checkMonolithK(synthInv([drifted]));
    expect(r.anomalies).toBe(1);
    expect(r.anomalyDetails[0]).toContain('a/big.js');
    expect(r.anomalyDetails[0]).toContain('期望=K-存量曝光');
    expect(r.exemptHits).toBe(0); // 漂移条目不入分档（不计入任何桶）
    expect(r.over).toBe(0);
  });

  it('A6 生成件缺失/结构异常 → available=false N/A 不入判', () => {
    for (const bad of [null, undefined, {}, { files: 'not-array' }]) {
      const r = checkMonolithK(bad);
      expect(r.available).toBe(false);
      expect(r.detail).toContain('N/A');
    }
  });

  it('A7 threshold 数据透传零硬编码（非 3000 阈值清单同法分类）', () => {
    const r = checkMonolithK(synthInv([fFreeOver, fOk], 3200));
    expect(r.available).toBe(true);
    expect(r.threshold).toBe(3200);
    expect(r.violations).toBe(1); // 判定源自 exceeds3000 布尔，不依赖 3000 字面量
  });
});

describe('monolith-gate · B 生成件真源对账（盘上 docs/audits/monolith-inventory.json）', () => {
  const inv = JSON.parse(readFileSync(INVENTORY_PATH, 'utf-8'));

  it('B1 盘上生成件三字段自洽（checkMonolithK anomalies=0）', () => {
    const r = checkMonolithK(inv);
    expect(r.available).toBe(true);
    expect(r.anomalies).toBe(0);
    expect(r.anomalyDetails).toEqual([]);
  });

  it('B2 盘面「增量拦截就绪」不变式：violations===0（无存量违规）+ 总账自洽', () => {
    const r = checkMonolithK(inv);
    expect(r.violations).toBe(0);
    expect(r.over).toBe(r.exemptHits + r.violations);
    expect(r.detail).toContain('违规×0');
  });

  it('B3 豁免名单只出不进负向锚：盘上 exempt 集合 ⊆ REGISTERED_EXEMPT（新增豁免必红=须议题卷对账）', () => {
    const exempted = inv.files.filter((x) => x.exempt).map((x) => x.path);
    for (const p of exempted) {
      expect(REGISTERED_EXEMPT).toContain(p);
    }
    // 名单口径：批 1 时点唯一豁免 = settings.js（缩行不退出；拆分收窄合法，放宽须对账）
    expect(exempted).toEqual(REGISTERED_EXEMPT);
  });

  it('B4 status 词汇表锚：三态 {K-存量曝光, K-违规, ok}（词汇漂移必红）', () => {
    for (const x of inv.files) {
      expect(['K-存量曝光', 'K-违规', 'ok']).toContain(x.status);
    }
  });

  it('B5 生成器 --check 联动：逐字节校验 exit 0（真源防腐闸，spawn 先例同律）', () => {
    const res = spawnSync('node', [join(ROOT, 'scripts/gen-monolith-inventory.mjs'), '--check'], {
      cwd: ROOT, encoding: 'utf-8', timeout: 30000,
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('--check OK');
  });
});

describe('monolith-gate · C runQualityAudit 接线行为（真源端到端）', () => {
  let real;
  beforeAll(async () => {
    real = await runQualityAudit(ROOT, { phase: 1, log: () => {} });
  });

  it('C1 真根接线：monolithK.available=true + 生成件数据端到端透传', () => {
    expect(real.monolithK.available).toBe(true);
    expect(real.monolithK.threshold).toBe(3000);
    expect(real.monolithK.exemptHits).toBe(1);
    expect(real.monolithK.violations).toBe(0);
    expect(real.monolithK.exposure[0]).toContain('settings.js');
  });

  it('C2 盘面干净时零 K 拦截：hardFailures 零 K 消息（存量曝光不入判）', () => {
    const kMsgs = real.hardFailures.filter((s) => s.includes('[K ') || s.includes('K-存量'));
    expect(kMsgs).toEqual([]);
  });

  it('C3 合成 K-违规 → hardFailures 进位（[app-quality][K 违规] 前缀契约）', async () => {
    const dir = mkTmpRoot(synthInv([fFreeOver]));
    try {
      const r = await runQualityAudit(dir, { phase: 1, log: () => {} });
      expect(r.monolithK.available).toBe(true);
      expect(r.monolithK.violations).toBe(1);
      const kMsgs = r.hardFailures.filter((s) => s.startsWith('[app-quality][K 违规]'));
      expect(kMsgs.length).toBe(1);
      expect(kMsgs[0]).toContain('a/wild.js');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('C4 生成件缺失 → N/A 不拦截（--check 闸守护，K 段不重复报红）', async () => {
    const dir = mkTmpRoot(null);
    try {
      const r = await runQualityAudit(dir, { phase: 1, log: () => {} });
      expect(r.monolithK.available).toBe(false);
      expect(r.monolithK.detail).toContain('生成件缺失');
      const kMsgs = r.hardFailures.filter((s) => s.includes('[K '));
      expect(kMsgs).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('monolith-gate · E 负向锚与车道边界（J 段先例同律）', () => {
  it('E1 ITEM_KEYS 九项制不动：K 段不入制（A–I 锚面零变化，v294 J6 负向锚先例）', () => {
    expect(ITEM_KEYS).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
    expect(ITEM_KEYS).not.toContain('K');
  });

  it('E2 hardFailures 消息形态契约在源（防洗账：K 违规/结构双前缀 + 存量曝光报告级字面量）', () => {
    expect(AUDIT_SRC).toContain('[app-quality][K 违规]');
    expect(AUDIT_SRC).toContain('[app-quality][K 结构]');
    expect(AUDIT_SRC).toContain('K-存量曝光（豁免只出不进');
    expect(AUDIT_SRC).toContain('checkMonolithK');
  });

  it('E3 数据真源唯一判据：接线处零硬编码文件名（消费 JSON 而非源内点名）', () => {
    const wiring = AUDIT_SRC.slice(AUDIT_SRC.indexOf('巨石文件 K 段报告'));
    expect(wiring).toContain('monolith-inventory.json');
    // 接线段不得出现具体文件名字面量（六文件池身份由生成件唯一承载）
    expect(wiring).not.toContain('settings.js');
    expect(wiring).not.toContain('pull-panels');
  });

  it('E4 构建闸链路在位：vite.config 消费 hardFailures（K-违规随构建进位）', () => {
    expect(VITE_CFG).toContain('hardFailures');
    expect(VITE_CFG).toMatch(/runQualityAudit\(rootDir, \{ phase: 1, log \}\)/);
  });
});
