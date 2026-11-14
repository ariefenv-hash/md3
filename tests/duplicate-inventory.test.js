// ==================== duplicate-inventory.test.js — #269 同内容多副本守护（R156 窗 · v11.28 零滚版卷） ====================
// 常青命名（#291 §1 裁决 · 2026-11-13 改名批）：本文件测的是「新增同内容组即拦截」的**活行为闸**
// （B1 组清单守恒 / B2 生成器 --check / C1 零时间戳），不是交付时点快照 → 去 vNNN- 前缀、**不标 @snapshot**。
// 旧名 v269-duplicates.test.js 见 docs/HANDOFF.md / docs/worklog.md 史实注记（#205 注释即锚，不原地改写）。
//
// 承 #269 处置①「CI 加同 md5 多副本检测（超出 N 份同名同内容文件即警告清单化）」+③「若已有更多此类副本一并清单化」：
// 全库现值实测（gen-duplicate-inventory.mjs 扫 381 文件）= 唯一多副本组 m3e-mini.js×3
// （apps/_shared + messages + translate，21,411B 逐字节相同）——盘面干净，无更多失控副本。
// 本文件即「清单化+增量拦截」闸：新增同内容组必须先在 #269 登记、扩 KNOWN_GROUPS 白名单、
// 随卷再生生成件后放行（#272 F2 终态值锚演进先例同律）。
// 处置②（单源化路线 a 三份改 _shared 相对引用（破坏自包含，需评估 file:// 直开场景）/
// b 保留拷贝但构建期从 _shared 同步生成+门禁校验一致）留维护者裁决，不在本卷。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INV = JSON.parse(readFileSync(join(ROOT, 'docs/audits/duplicate-inventory.json'), 'utf-8'));

// 已知同内容组白名单（sha256）：新增组即红——红=提醒先登记 #269 再扩此清单（增量拦截语义）
const KNOWN_GROUPS = ['367aac9d1f2f2caf54e8f35e6c37f205a2d956ae525d4ca9f7a817c0cbb656b8'];
const M3E_FILES = [
  'ios-desktop/apps/_shared/m3e-mini.js',
  'ios-desktop/apps/messages/m3e-mini.js',
  'ios-desktop/apps/translate/m3e-mini.js',
];

describe('v11.28 #269 同内容多副本清单（duplicate-inventory 单真源）', () => {
  it('A1 m3e-mini 三副本逐字节相同（#269 证据现值锚：sha256 一致）', () => {
    const hs = M3E_FILES.map((p) => createHash('sha256').update(readFileSync(join(ROOT, p))).digest('hex'));
    expect(new Set(hs).size).toBe(1);
    expect(hs[0]).toBe(KNOWN_GROUPS[0]);
  });

  it('A2 三副本组在录：hash/count=3/files 路径全对', () => {
    const g = INV.groups.find((x) => x.hash === KNOWN_GROUPS[0]);
    expect(g).toBeDefined();
    expect(g.count).toBe(3);
    expect(g.files).toEqual(M3E_FILES);
    expect(g.bytes).toBe(21411);
  });

  it('B1 组清单守恒：全库同内容组 sha256 集合 === KNOWN_GROUPS（新增组即红=先登记后放行）', () => {
    expect(INV.groups.map((x) => x.hash).sort()).toEqual([...KNOWN_GROUPS].sort());
  });

  it('B2 生成器 --check 闸零失配（逐字节可重现，单真源禁手改）', () => {
    const res = execFileSync('node', ['scripts/gen-duplicate-inventory.mjs'], { cwd: ROOT, encoding: 'utf-8', timeout: 60000 });
    expect(res).toContain('--check OK');
  });

  it('C1 逐字节可重现负向锚：登记件零时间戳字段（R155 vendor-audit 先例同律）', () => {
    expect(JSON.stringify(INV)).not.toMatch(/generatedAt|createdAt|timestamp/i);
  });
});
