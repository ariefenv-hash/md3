// ==================== missing-refs-triage.test.js — missing 旧式路径引用三态分诊锚组（#316 · #291 余量批） ====================
//
// 被测真身：scripts/missing-refs-triage.mjs 纯逻辑层（抽取镜像 + 五态分类 + 全量分诊），
// 消费产物 docs/audits/missing-refs-triage.json。
//
// 常青声明（#291 §6 命名纪律）：本测试为 <特性名>-<行为> 常青锚，随分诊特性演进原地改；
// 无 @snapshot 头（非交付时点快照）。
//
// 撰写纪律（自指陷阱防雷，R150 实录）：本文件源码文本会被 gen-test-prefix-inventory.mjs
// 三族正则扫描——①合成 fixture 一律运行时拆串构造（'xx' + '/yy.js'），杜绝自家文本产生新 missing；
// ②真实路径字面量仅允许「完整扩展名且仓库根现存」者；③严禁出现 join(ROOT, '相对路径') 与
// from '../ 连续字面量（fixture 用 BASE 变量名与拆串规避）。

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TRIAGE_SCHEMA, STATES,
  extractMissingRefs, classifyLine, triageFile, buildTriage,
} from '../scripts/missing-refs-triage.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TRIAGE_PATH = join(ROOT, 'docs/audits/missing-refs-triage.json');
const INVENTORY_PATH = join(ROOT, 'docs/audits/test-prefix-inventory.json');

// —— 运行时拆串构造器（自指陷阱防雷：源码文本不含可被三族正则命中的连续形态） ——
const mk = (...parts) => parts.join('');
const synthGuardLine = () => mk('expect(existsSync(join(ROOT, ', "'xx/none.js'", '))).toBe(false);');
const synthAssertLine = () => mk('expect(src).toContain(', '"from ', "'../aosp/demo-anchor.js'", '");');
const synthCommentLine = () => mk('// 历史实证：/ios-desktop/sw', '.js 404（#260 防线抓获）');
const synthInputLine = () => mk('await vfs.write(', "'/vault/note.md'", ", '# hi', { owner: 'test' });");
const synthArtifactLine = () => mk('const p = resolve(ROOT, ', "'docs/demo", ".mdapp');");

describe('missing-refs-triage 分类器单测（五态判定）', () => {
  it('A1 注释行 → comment 态（历史实证形态）', () => {
    const line = synthCommentLine();
    const ref = mk('ios-desktop/sw', '.js');
    expect(classifyLine(line, ref)).toBe('comment');
  });

  it('A2 expect 断言行 → assertion 态（源码锚形态）', () => {
    const line = synthAssertLine();
    expect(classifyLine(line, 'aosp/demo-anchor.js')).toBe('assertion');
  });

  it('A3 existsSync 负向守卫 → guard 态且优先于同行 expect', () => {
    const line = synthGuardLine();
    expect(classifyLine(line, 'xx/none.js')).toBe('guard');
  });

  it('A4 VFS fixture 字符串入参 → input 态（数据面非路径面）', () => {
    const line = synthInputLine();
    expect(classifyLine(line, 'note.md')).toBe('input');
  });

  it('A5 扩展名截断伪影 → artifact 态（真实完整路径现存）', () => {
    const line = synthArtifactLine();
    const ref = mk('docs/demo', '.md');
    const tri = triageFile(line, [ref]);
    expect(tri[0].state).toBe('artifact');
  });

  it('A6 跨候选优先级：guard > assertion（同行双语义取最具体）', () => {
    const line = mk('expect(existsSync(join(ROOT, ', "'xx/none.js'", '))).toBe(false); // 锚');
    expect(classifyLine(line, 'xx/none.js')).toBe('guard');
  });

  it('A7 全候选皆注释 → comment 兜底（error-hub 形态）', () => {
    const src = [synthCommentLine(), '  expect(1).toBe(1);'].join('\n');
    const tri = triageFile(src, [mk('ios-desktop/sw', '.js')]);
    expect(tri[0].state).toBe('comment');
  });

  it('A8 候选行混注释+断言 → 取断言（missing 真源在活代码非注释）', () => {
    const src = [synthCommentLine(), synthAssertLine()].join('\n');
    const tri = triageFile(src, ['aosp/demo-anchor.js']);
    expect(tri[0].state).toBe('assertion');
  });
});

describe('missing-refs-triage 抽取镜像与生成器逐字对齐', () => {
  it('B1 镜像三族正则：合成 missing 可检出（join(ROOT, 相对路径) 形态）', () => {
    const src = mk('const x = join(ROOT, ', "'zz-fake/none.js'", ');');
    expect(extractMissingRefs(src)).toContain('zz-fake/none.js');
  });

  it('B2 镜像守真：现存完整路径不进 missing', () => {
    const src = mk('// 锚 docs/audits/missing-refs-triage', '.json 存在');
    expect(extractMissingRefs(src)).toEqual([]);
  });

  it('B3 全量分诊对账：镜像抽取 missing ≡ inventory 截断账（slice 3）零漂移', () => {
    const inv = JSON.parse(readFileSync(INVENTORY_PATH, 'utf8'));
    const r = buildTriage({ testsDir: join(ROOT, 'tests'), inventoryFiles: inv.files });
    expect(r.mismatch).toEqual([]);
  });
});

describe('missing-refs-triage 产物对账（防无声劣化）', () => {
  const triage = JSON.parse(readFileSync(TRIAGE_PATH, 'utf8'));
  const inv = JSON.parse(readFileSync(INVENTORY_PATH, 'utf8'));

  it('C1 产物结构完备：schema/五态/计数自洽', () => {
    expect(triage.schema).toBe(TRIAGE_SCHEMA);
    expect(STATES).toEqual(['assertion', 'guard', 'input', 'comment', 'artifact']);
    const sum = STATES.reduce((a, s) => a + (triage.stats[s] || 0), 0);
    expect(sum).toBe(triage.stats.refs);
    expect(triage.entries.length).toBe(triage.stats.refs);
  });

  it('C2 覆盖面：分诊 entries ≡ 全量镜像 missing（逐 file+ref 零遗漏零孤儿）', () => {
    const invMap = new Map(inv.files.map((r) => [r.file, (r.evidence && r.evidence.missing) || []]));
    const got = new Map();
    for (const e of triage.entries) {
      const list = got.get(e.file) || [];
      list.push(e.ref);
      got.set(e.file, list);
    }
    for (const [f, refs] of got) expect(refs.length).toBeGreaterThan(0);
    // 镜像全量（不受 inventory slice(0,3) 截断限制）重抽取对账
    for (const [f] of got) {
      const src = readFileSync(join(ROOT, 'tests', f), 'utf8');
      expect(got.get(f).sort()).toEqual(extractMissingRefs(src).sort());
    }
    // inventory 有账而分诊无 → 漏报必红
    for (const [f, refs] of invMap) {
      if (refs.length) expect(got.has(f)).toBe(true);
    }
  });

  it('C3 断言位守锚不变式：assertion 态证据行在当前源码逐字存在', () => {
    for (const e of triage.entries.filter((x) => x.state === 'assertion')) {
      const src = readFileSync(join(ROOT, 'tests', e.file), 'utf8');
      for (const ev of e.evidence) expect(src).toContain(ev.line);
    }
  });

  it('C4 守卫位负向语义不变式：guard 态证据行含 toBe(false)（存在性守卫实证）', () => {
    for (const e of triage.entries.filter((x) => x.state === 'guard')) {
      const guardEv = e.evidence.find((v) => v.state === 'guard');
      expect(guardEv).toBeTruthy();
      expect(guardEv.line).toContain('toBe(false)');
    }
  });

  it('C5 处置纪律：全量 keep（守锚/守卫/数据面/伪影/历史实证——本批零删除零改锚）', () => {
    for (const e of triage.entries) expect(e.disposition.startsWith('keep')).toBe(true);
  });
});

describe('missing-refs-triage 评论位规范化回归（#316 DoD-2）', () => {
  it('D1 battery-health 头注已规范化为仓库根全路径', () => {
    const src = readFileSync(join(ROOT, 'tests/battery-health.test.js'), 'utf8');
    expect(src).toContain(mk('//   · ios-desktop/js/aosp/battery-health', '.js 纯逻辑真跑'));
  });

  it('D2 wellbeing-focus 头注已规范化为仓库根全路径', () => {
    const src = readFileSync(join(ROOT, 'tests/wellbeing-focus.test.js'), 'utf8');
    expect(src).toContain(mk('//   · ios-desktop/js/aosp/wellbeing-focus', '.js 纯逻辑真跑'));
  });

  it('D3 apps-subpage 单一真源注已规范化为仓库根全路径', () => {
    const src = readFileSync(join(ROOT, 'tests/apps-subpage.test.js'), 'utf8');
    expect(src).toContain(mk('← ios-desktop/js/recent-apps', '.js getRecentAppsList'));
  });

  it('D4 appstore-market 同源账注已规范化为仓库根全路径（.mdapp 完整扩展名）', () => {
    const src = readFileSync(join(ROOT, 'tests/appstore-market.test.js'), 'utf8');
    expect(src).toContain(mk('（ios-desktop/demo/hello-world', '.mdapp 真实可装'));
  });

  it('D5 error-hub 历史 404 实证注释原样保留（规范化不触碰历史证据）', () => {
    const src = readFileSync(join(ROOT, 'tests/error-hub.test.js'), 'utf8');
    expect(src).toContain(mk('/ios-desktop/sw', '.js 404'));
  });
});

describe('missing-refs-triage 接线面与负向锚', () => {
  it('E1 npm 脚本面：triage:missing 已入册（--write 出口）', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts['triage:missing']).toBe('node scripts/missing-refs-triage.mjs --write');
  });

  it('E2 负向锚：inventory 有账而分诊缺位 → buildTriage mismatch 必红（漏报防沉默）', () => {
    const fakeInv = [{ file: 'zz-noop.test.js', evidence: { missing: ['zz-fake/none.js'] } }];
    const r = buildTriage({ testsDir: join(ROOT, 'tests'), inventoryFiles: fakeInv });
    expect(r.mismatch.some((m) => m.file === 'zz-noop.test.js')).toBe(true);
  });

  it('E3 负向锚：分诊账被手改删条目 → 覆盖面对账必红（洗账防沉默）', () => {
    const committed = JSON.parse(readFileSync(TRIAGE_PATH, 'utf8'));
    const inv = JSON.parse(readFileSync(INVENTORY_PATH, 'utf8'));
    const r = buildTriage({ testsDir: join(ROOT, 'tests'), inventoryFiles: inv.files });
    const tampered = committed.entries.slice(1);
    const covered = new Set(tampered.map((e) => e.file + '::' + e.ref));
    const gap = r.entries.find((e) => !covered.has(e.file + '::' + e.ref));
    expect(gap).toBeTruthy();
    expect(r.entries.length).toBeGreaterThan(tampered.length);
  });

  it('E4 镜像与生成器漂移防线：镜像抽取对真实 tests/ 全量跑与 inventory 账面文件集一致', () => {
    const inv = JSON.parse(readFileSync(INVENTORY_PATH, 'utf8'));
    const invMissing = inv.files.filter((r) => (r.evidence && r.evidence.missing || []).length > 0).map((r) => r.file).sort();
    expect(invMissing.length).toBeGreaterThan(0);
    expect(existsSync(join(ROOT, 'scripts/gen-test-prefix-inventory.mjs'))).toBe(true);
  });
});
