// ==================== v11.16 #295：docs/ 归档与索引策略门禁（选项 c：维持现状 + 索引收敛） ====================
//
// #295 交付守护（P3 文档：docs/ 89 个版本截图目录只增不收敛 + 无索引 + 与 #223 重编号纠缠）：
//   ① 生成件单真源：docs/index.md 由 scripts/audit-docs-index.mjs 生成，check 模式逐字节校验
//      （与 check:version 同律——生成件禁手改，手改或实树漂移即红）；
//   ② 零搬迁铁律：脚本不得携带 rename/unlink/rmdir 行为——worklog/议题相对链接不可断；
//      LFS/压缩归档两案缓议（断链/远端依赖风险），联动 #223 重编号裁决；
//   ③ 门槛规则（#295 建议③，提示级不拦发布）：单版本目录 png > 20 提示归档、递归文件 > 700 提示瘦身；
//   ④ 确定性前提：生成件无时间戳（Date.now/new Date 禁入）——否则 check 永红；
//   ⑤ .gitignore 同步排除（docs/sweep/ #300 先例）+ 生成件自身自引用固定点排除（index.md
//      不入索引不计数——自吞尾巴 bug 实录：写入后再扫顶层文件 23→24 恒不一致）。
//
// 与既有防线互补：#290（根目录收编 + "全量 index 留 #295" 接口）/ #300（docs/sweep/ gitignore）/
// #223（重编号裁决——本索引只记事实不做 vNNN 语义解码）。

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v11.16 #295 门禁脚本结构契约', () => {
  const s = () => src('scripts/audit-docs-index.mjs');

  it('① package.json 登记 check:docs-index（门禁链可 invocation）', () => {
    const pkg = JSON.parse(src('package.json'));
    expect(pkg.scripts['check:docs-index']).toBe('node scripts/audit-docs-index.mjs');
  });

  it('② 零搬迁铁律：脚本无 rename/unlink/rmdir 行为（worklog/议题相对链接不可断）', () => {
    expect(s()).not.toMatch(/renameSync|unlinkSync|rmdirSync|rmSync|rename\(/);
    expect(s()).toContain('零搬迁');
  });

  it('③ 门槛规则常量在册（#295 建议③：20/700 提示级双阈值）', () => {
    expect(s()).toContain('ARCHIVE_HINT_DIR_PNG = 20');
    expect(s()).toContain('ARCHIVE_HINT_TOTAL_FILES = 700');
  });

  it('④ 确定性前提：生成件无时间戳（Date.now/new Date 禁入，否则 check 永红）', () => {
    expect(s()).not.toMatch(/Date\.now|new Date\(/);
  });

  it('⑤ check 模式不一致 exit 1 逻辑在册（生成件单真源非空洞绿）', () => {
    expect(s()).toContain("return 1");
    expect(s()).toContain('不一致');
    expect(s()).toContain('--write');
  });

  it('⑥ .gitignore 同步排除在册（docs/sweep/ #300 先例）', () => {
    expect(s()).toContain('parseGitignore');
    expect(s()).toContain("ig.dirs.has(name)");
  });
});

describe('v11.16 #295 生成件实物对账（真实对账非仅字符串锚）', () => {
  const INDEX = 'docs/index.md';
  const s = (p) => src(p);

  it('⑦ 生成件在场 + 禁手改警示 + 策略裁决 c 在册', () => {
    expect(existsSync(resolve(ROOT, INDEX))).toBe(true);
    const idx = src(INDEX);
    expect(idx).toContain('禁手改');
    expect(idx).toContain('三选一 → 取 c');
    expect(idx).toContain('零搬迁');
  });

  it('⑧ #223 联动 + v207c 带后缀变体在册（^v\\d+[a-z]?$ 统一收录）', () => {
    const idx = src(INDEX);
    expect(idx).toContain('#223');
    expect(idx).toContain('| v207c |');
    expect(s('scripts/audit-docs-index.mjs')).toMatch(/\^v\(\\d\+\)\(\[a-z\]\)\?\$/);
  });

  it('⑨ 版本目录表覆盖实数：索引行数 === docs/ 实树版本目录数（真实对账）', () => {
    const idx = src(INDEX);
    const rows = idx.split('\n').filter((l) => /^\| v\d+[a-z]? \| \d+ \| \d+ \|/.test(l));
    const actual = readdirSync(resolve(ROOT, 'docs')).filter((n) => {
      try {
        return statSync(join(resolve(ROOT, 'docs'), n)).isDirectory() && /^v\d+[a-z]?$/.test(n);
      } catch {
        return false;
      }
    });
    expect(rows.length).toBe(actual.length);
    expect(rows.length).toBeGreaterThan(80); // #295 议题正文实证 89 个量级，防表塌缩
  });

  it('⑩ sweep gitignore 排除：索引无 sweep 目录行（不入库目录不入索引）', () => {
    const idx = src(INDEX);
    expect(idx).not.toMatch(/^\| sweep \|/m);
  });

  it('⑪ check 模式终树实跑 PASS（exit 0：生成件与实树逐字节一致）', () => {
    const r = spawnSync('node', ['scripts/audit-docs-index.mjs'], { cwd: ROOT, encoding: 'utf8' });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('PASS');
  });
});
