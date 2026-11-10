// ==================== v243-visual-admission.test.js — #243 新增应用视觉准入基线 ====================
// @snapshot · 交付时点快照（#291 §1 裁决）：钉扎对象=视觉准入九项挂接面（#243 交付时点）；允许随快照失义退役（docs/test-naming-evergreen.md §4 登记制）——R149 改名机械批注入
//
// 覆盖（#243 建议①②③④ 收口锚；判定语义本体由 v1037/v230 锚守护，本文件不重复）：
//   · 建议① 准入清单文档存在且口径真源同源（9 项 A–I 引用 / 分档阈值 ≥7·4–6·≤3 与 audit 脚本一致）
//   · 建议② CI 挂接：package.json `audit:app` script 指向评分卡；deploy.yml test job 含
//     App quality audit 步骤（vitest 门禁之后）—— 分档曝光非硬阻断
//   · 建议③ 新建即达标联动结构：双脚手架模板占位符与 new-app 渲染链路存在 +
//     audit 实跑 templates 双 9/9（视觉八项生成即过的模板前提）
//   · 机器可读快照 docs/visual-admission-baseline.json 结构完整（41 应用 + 分组 21/20 +
//     tally 自洽 + 新增组里程碑字段）且应用集与 audit 实跑对齐（不锁死 tier 值——
//     分档回退防护归 scripts/quality-baseline.json 门禁，双门禁不互相打架）
//   · 负向锚：快照不引入第二把分档锁（quality-baseline 门禁为唯一 tier 防护面）；
//     deploy.yml audit 步骤不得置于 build-and-deploy job（分档属 test job 曝光层）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runQualityAudit } from '../scripts/audit-app-quality.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC = () => readFileSync(join(ROOT, 'docs/visual-admission-baseline.md'), 'utf-8');
const SNAP = () => JSON.parse(readFileSync(join(ROOT, 'docs/visual-admission-baseline.json'), 'utf-8'));
const PKG = () => JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
const YML = () => readFileSync(join(ROOT, '.github/workflows/deploy.yml'), 'utf-8');
const NEWAPP = () => readFileSync(join(ROOT, 'scripts/new-app.mjs'), 'utf-8');

describe('#243 建议① 准入清单文档（口径同源，不重复定义）', () => {
  it('A1 文档存在且引用 9 项判定真源与分档阈值', () => {
    const doc = DOC();
    expect(doc).toContain('scripts/audit-app-quality.mjs');
    for (const item of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
      expect(doc).toContain(`| ${item} |`);
    }
    expect(doc).toContain('≥7'); // 达标线（#229 §二 9 项制阈值）
    expect(doc).toContain('不重写'); // #243 边界：不重写 #228/#230 实现
  });

  it('A2 准入线 = 新增 9/9 全达标，严于存量 ≥7；脚手架承诺含视觉八项', () => {
    const doc = DOC();
    expect(doc).toContain('9/9');
    expect(doc).toContain('A/B/C/D/E/F/G/I');
    expect(doc).toContain('8/9 达标档'); // probe 实测证据（唯一缺口 H）
    expect(doc).toContain('H（测试覆盖');
  });

  it('A3 分组口径真源引用 visual-token-adoption.md（bulk 21 / 逐建 20）', () => {
    const doc = DOC();
    expect(doc).toContain('docs/visual-token-adoption.md');
    expect(doc).toContain('10-04 bulk');
    expect(doc).toContain('10-26');
  });
});

describe('#243 建议② CI 挂接（分档曝光非硬阻断）', () => {
  it('B1 package.json 提供 audit:app 且指向评分卡脚本', () => {
    const s = PKG().scripts;
    expect(s['audit:app']).toBe('node scripts/audit-app-quality.mjs');
  });

  it('B2 deploy.yml test job 含 App quality audit 步骤且位于 vitest 门禁之后', () => {
    const yml = YML();
    const vitestAt = yml.indexOf('Run vitest');
    const auditAt = yml.indexOf('App quality audit (#243)');
    expect(vitestAt).toBeGreaterThan(-1);
    expect(auditAt).toBeGreaterThan(vitestAt);
    expect(yml).toContain('npm run audit:app');
  });

  it('B3 负向锚：audit 步骤属 test job，不落在 build-and-deploy job（曝光层不耦合部署产物）', () => {
    const yml = YML();
    const auditAt = yml.indexOf('App quality audit (#243)');
    const testJobAt = yml.indexOf('  test:');
    const buildJobAt = yml.indexOf('  build-and-deploy:');
    expect(testJobAt).toBeLessThan(auditAt);
    expect(auditAt).toBeLessThan(buildJobAt);
  });

  it('B4 步骤注释明示分档非硬阻断边界（#235 教训）与既有硬门禁归属', () => {
    const yml = YML();
    expect(yml).toContain('#235');
    expect(yml).toContain('不拦截部署');
    expect(yml).toContain('quality-baseline');
  });
});

describe('#243 建议③ 新建即达标（脚手架联动结构 + 模板同审实跑）', () => {
  it('C1 new-app.mjs 双形态渲染链路存在（模板占位符 {{APP_ID}}/{{APP_TITLE}}）', () => {
    const src = NEWAPP();
    expect(src).toContain('--multi');
    expect(src).toContain('TEMPLATE_MULTI_DIR');
    expect(src).toContain('{{APP_ID}}');
    expect(src).toContain('{{APP_TITLE}}');
  });

  it('C2 audit 实跑：双脚手架模板 9/9 达标零缺口（视觉八项生成即过的模板前提）', async () => {
    const res = await runQualityAudit(ROOT, { log: () => {} });
    expect(res.templates).toHaveLength(2);
    for (const t of res.templates) {
      expect(t.score).toBe(9);
      expect(t.tier).toBe('达标');
      expect(t.failed).toEqual([]);
    }
  });
});

describe('机器可读快照（41 应用逐项分档 + 分组横切，可公示数值）', () => {
  it('D1 快照结构完整：41 应用 + 分组 21/20 + tally 自洽 + 里程碑字段', () => {
    const snap = SNAP();
    expect(snap.apps).toHaveLength(41);
    expect(snap.checked).toBe(41);
    const g = snap.groups;
    expect(g.legacy_bulk_21.ids).toHaveLength(21);
    expect(g.new_incremental_20.ids).toHaveLength(20);
    const t = snap.tally;
    expect(t['达标'] + t['偏薄'] + t['严重']).toBe(41);
    expect(snap.headline.new_group_pass_rate_milestone).toContain('10%');
    expect(snap.headline.new_group_pass_rate_milestone).toContain('75%');
    // 分组内计数与 ids 长度自洽
    expect(g.legacy_bulk_21.standard + g.legacy_bulk_21.thin + g.legacy_bulk_21.severe).toBe(21);
    expect(g.new_incremental_20.standard + g.new_incremental_20.thin + g.new_incremental_20.severe).toBe(20);
  });

  it('D2 快照应用集与 audit 实跑对齐（ID 对齐；不锁死 tier 值——回退防护归 quality-baseline 门）', async () => {
    const snap = SNAP();
    const res = await runQualityAudit(ROOT, { log: () => {} });
    const live = new Map(res.results.map((r) => [r.appId, r.score]));
    for (const a of snap.apps) {
      expect(live.has(a.id)).toBe(true);           // 零漂移：快照应用集 == 实跑应用集
      expect(a.failed.length).toBe(9 - a.score);   // 自洽：9 项制分数与缺口数吻合
    }
    // tally 与快照 apps 逐行汇总一致
    const sum = { '达标': 0, '偏薄': 0, '严重': 0 };
    for (const a of snap.apps) sum[a.tier] += 1;
    expect(sum).toEqual(snap.tally);
  });

  it('D3 分组横切数值可复算：新增组达标率字段与 apps 分档重算一致', () => {
    const snap = SNAP();
    const newIds = new Set(snap.groups.new_incremental_20.ids);
    const std = snap.apps.filter((a) => newIds.has(a.id) && a.tier === '达标').length;
    expect(snap.groups.new_incremental_20.standard).toBe(std);
    expect(snap.groups.new_incremental_20.pass_rate).toBeCloseTo(std / 20, 4);
  });

  it('D4 负向锚：快照仅公示不设第二把分档硬门禁（回退门唯一真源 = scripts/quality-baseline.json）', () => {
    const snap = SNAP();
    expect(snap._readme).toContain('quality-baseline.json');
    expect(snap._readme).toContain('不锁死 tier 值');
  });
});

describe('余量排期引用（存量车道不混槽）', () => {
  it('E1 余量分列互斥且结构自洽：new/legacy 并集 == 快照中 tier≠达标 的全部应用（余量随整改批次递减属预期演进，不锁死数量）', () => {
    const snap = SNAP();
    const nr = snap.thin_remaining.new_group;
    const lr = snap.thin_remaining.legacy_group;
    expect(nr.filter((x) => lr.includes(x))).toEqual([]);          // 互斥
    const newIds = new Set(snap.groups.new_incremental_20.ids);
    const legacyIds = new Set(snap.groups.legacy_bulk_21.ids);
    for (const x of nr) expect(newIds.has(x), `${x} 属新增组`).toBe(true);
    for (const x of lr) expect(legacyIds.has(x), `${x} 属存量组`).toBe(true);
    // 结构自洽：余量并集 == 实际偏薄集合
    const thinIds = snap.apps.filter((a) => a.tier !== '达标').map((a) => a.id).sort();
    expect([...nr, ...lr].sort()).toEqual(thinIds);
    expect(snap.thin_remaining.schedule_ref).toContain('#229');
    expect(snap.thin_remaining.schedule_ref).toContain('#177');
  });

  it('E2 文档排期表覆盖 #261 施工面 5 家（word 标注批 1 完成属预期；文档为施工清单快照）', () => {
    const doc = DOC();
    for (const id of ['word', 'chess', 'driving', 'piano', 'reaction']) {
      expect(doc).toContain(`| ${id} |`);
    }
    expect(doc).toContain('#177 盘点车道');
    expect(doc).toContain('80%'); // v11.16 里程碑（#261 批 1 word 升档）
  });
});
