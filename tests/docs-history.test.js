// ==================== v290 测试 — #290 根目录杂散中文文档收编（R134 窗 §7.5 加餐 Job 2931605 第 3 定时消息系列） ====================
//
// 背景：#290 证据面——仓库根目录并存 worklog.md / 审计报告-v7.14.md / 改动说明.md 三个中文文档，
// 与 docs/ 体系脱节，新读者分不清活文档与历史快照。
//
// 本卡处置（#290 建议①②③落地）：
//   ① 审计报告-v7.14.md / 改动说明.md → git mv docs/history/（历史保留）；
//   ② 根 worklog.md = 落后真源 538 行的断层镜像（停 R122「R123 续点」，头注自述 untracked
//      实际 tracked 的历史矛盾）→ git rm 删除，真源唯一化 = docs/worklog.md（#18 §5 引用路径
//      本即 docs/worklog.md；#18 SOP 第 2 步读的 /home/z/my-project/worklog.md 是沙箱本地
//      文件系统路径，与仓库根 worklog.md 是两个文件，删除零影响）；
//   ③ README.md 三处 + docs/ROADMAP.md 三处引用路径同步更新 + 活跃真源指引注记；
//   ④ docs/ 顶层 index 核对结论：HANDOFF.md（#234② 结构化快照）即入口指路快照，
//      全量 index 策略留 #295 车道（本卡不越界）。
//
// 关联：#290（本卡）/ #295（docs 归档与索引策略车道）/ #18 §5（真源路径）/ §7.5/§7.6/§7.7

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('v290 · #290 根目录杂散中文文档收编', () => {
  it('A1 · docs/history/ 两历史文档归位且根目录无残留', () => {
    expect(existsSync(join(ROOT, 'docs/history/审计报告-v7.14.md')), '审计报告应在 docs/history/').toBe(true);
    expect(existsSync(join(ROOT, 'docs/history/改动说明.md')), '改动说明应在 docs/history/').toBe(true);
    expect(existsSync(join(ROOT, '审计报告-v7.14.md')), '根目录审计报告应已移除').toBe(false);
    expect(existsSync(join(ROOT, '改动说明.md')), '根目录改动说明应已移除').toBe(false);
    expect(existsSync(join(ROOT, 'worklog.md')), '根目录断层镜像 worklog.md 应已删除').toBe(false);
  });

  it('A2 · 真源唯一化：docs/worklog.md 在位（#18 §5 引用路径）', () => {
    expect(existsSync(join(ROOT, 'docs/worklog.md')), 'docs/worklog.md 活跃真源应在位').toBe(true);
    const wl = readFileSync(join(ROOT, 'docs/worklog.md'), 'utf-8');
    expect(wl).toMatch(/R 续点|R134|R135/);
  });

  it('B1 · README 引用路径三处更新 + 活跃真源指引', () => {
    const rm = readFileSync(join(ROOT, 'README.md'), 'utf-8');
    expect(rm).toContain('docs/history/改动说明.md');
    expect(rm).toContain('：v7.x 时代改动记录');
    expect(rm).toContain('docs/history/           历史文档归档');
    expect(rm).toContain('（v7.x 系列见 `docs/history/改动说明.md`）');
    expect(rm).toContain('活跃变更日志见 `docs/worklog.md`');
    // 过时指令清除：旧「提交前请追加」不再指向已归档文档
    expect(rm).not.toContain('- **`改动说明.md`**：每个版本一节，记录改动文件 / 关键设计决策 / 验证记录——提交前请追加');
  });

  it('B2 · docs/ROADMAP.md 三处裸 worklog.md 引用更新为真源路径', () => {
    const rd = readFileSync(join(ROOT, 'docs/ROADMAP.md'), 'utf-8');
    expect(rd).toContain('读 `docs/ROADMAP.md`（本文件）+ `docs/worklog.md` 末两条');
    expect(rd).toContain('并追加 docs/worklog.md；');
    expect(rd).toContain('详见 `docs/history/改动说明.md` 与 docs/worklog.md。');
    expect(rd).not.toMatch(/详见 `改动说明\.md` 与 worklog\.md。/);
  });

  it('C1 · 归档文档内容完整性：历史快照原文在位', () => {
    const audit = readFileSync(join(ROOT, 'docs/history/审计报告-v7.14.md'), 'utf-8');
    expect(audit.length, '审计报告内容应完整保留').toBeGreaterThan(1000);
    const changes = readFileSync(join(ROOT, 'docs/history/改动说明.md'), 'utf-8');
    expect(changes).toMatch(/^## v7\./m);
    expect(changes.length, '改动说明内容应完整保留').toBeGreaterThan(50000);
  });
});
