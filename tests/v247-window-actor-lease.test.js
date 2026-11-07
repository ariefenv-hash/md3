// ==================== v247-window-actor-lease.test.js — #247 窗口快速切换标题/内容错位治理 ====================
//
// 用户真机截图（2026-11-07 21:12，平板 2176×1600）：快速切换应用时标题栏显示
// ByteBeat，正文渲染的却是设置 › 位置信息页 ——「切换的太快会出现标签错误」。
//
// 根因（v10.57 截图入库后定位）：Closing Actor 在渲染循环（rAF 链）内自然落定回收；
// 一旦循环因异常/页签冻结死亡，在途 Actor 永远到不了 settle 判定 —— 其托管的活
// 实例带 __actorHosted 标记被 renderPageStack 永久豁免隐藏，表现为「旧应用内容
// 驻留 + 新应用标题」错位。
//
// 治理（v10.57）：window-actor-lease-core.js 租约判定纯核（bornAt + 双通道共用阈值）
//   · 帧循环内：settle 判定 OR 租约期满 → 走同一条 disposeActorElements 回收路径
//   · setTimeout 看门狗：rAF 链死亡仍会触发，期满 Actor 强制回收 + renderPageStack
//     重新落位（主窗口空闲时 finishAnim 收口）
//
// 覆盖：A 源码锚 / B 租约判定行为（纯核直测）/ C 装配面（出生戳/双通道/回收路径）。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  leaseExpired,
  collectExpiredActorIndices,
  CLOSING_ACTOR_LEASE_MS_DEFAULT,
} from '../ios-desktop/js/window-actor-lease-core.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

const coreJs = src('ios-desktop/js/window-actor-lease-core.js');
const appWindowJs = src('ios-desktop/js/app-window.js');
const pageStackJs = src('ios-desktop/js/page-stack.js');

// ==================== A. 源码锚 ====================
describe('#247 · A 源码锚', () => {
  test('租约纯核存在且默认租约 5000ms（远超退场动画 ≤1s 生命周期）', () => {
    expect(coreJs).toContain('CLOSING_ACTOR_LEASE_MS_DEFAULT = 5000');
    expect(CLOSING_ACTOR_LEASE_MS_DEFAULT).toBe(5000);
  });

  test('纯核纪律：时钟回拨与非法输入一律不误杀', () => {
    expect(coreJs).toContain('if (now < bornAt) return false;');
    expect(coreJs).toContain('if (!Number.isFinite(bornAt) || !Number.isFinite(now) || !Number.isFinite(leaseMs)) return false;');
  });

  test('app-window.js：纯核 import + Actor 出生戳 bornAt + 看门狗武装', () => {
    expect(appWindowJs).toContain("import { collectExpiredActorIndices, leaseExpired, CLOSING_ACTOR_LEASE_MS_DEFAULT } from './window-actor-lease-core.js'");
    expect(appWindowJs).toContain('bornAt: performance.now()');
    expect(appWindowJs).toMatch(/armActorLeaseWatchdog\(\);\s*\n\s*if \(homeEl\) \{/);
  });

  test('app-window.js：帧循环 recycle 判定含租约兜底（与看门狗共用阈值）', () => {
    expect(appWindowJs).toContain('const leaseGone = leaseExpired(actor.bornAt, now);');
    expect(appWindowJs).toContain('|| leaseGone)');
  });

  test('page-stack.js：__actorHosted 豁免语义未被弱化（回收后营救实例必须能被正确隐藏）', () => {
    expect(pageStackJs).toContain("!el.__actorHosted && !el.__miniHosted");
  });
});

// ==================== B. 租约判定行为（纯核直测） ====================
describe('#247 · B 租约判定行为', () => {
  test('未期满：now - bornAt < leaseMs → false', () => {
    expect(leaseExpired(1000, 1000 + 4999, 5000)).toBe(false);
    expect(leaseExpired(0, 1, 5000)).toBe(false);
  });

  test('期满：now - bornAt >= leaseMs → true（含边界时刻）', () => {
    expect(leaseExpired(1000, 1000 + 5000, 5000)).toBe(true);
    expect(leaseExpired(1000, 1000 + 5001, 5000)).toBe(true);
  });

  test('默认租约：省略 leaseMs 参数按 5000ms 判定', () => {
    expect(leaseExpired(0, 4999)).toBe(false);
    expect(leaseExpired(0, 5000)).toBe(true);
  });

  test('时钟回拨（now < bornAt）→ false 不误杀在途动画', () => {
    expect(leaseExpired(10000, 9999, 5000)).toBe(false);
  });

  test('非法输入（NaN/Infinity/负租约）→ false 宁可多看一帧', () => {
    expect(leaseExpired(NaN, 1000, 5000)).toBe(false);
    expect(leaseExpired(1000, NaN, 5000)).toBe(false);
    expect(leaseExpired(1000, 2000, NaN)).toBe(false);
    expect(leaseExpired(1000, 2000, Infinity)).toBe(false);
    expect(leaseExpired(1000, 2000, 0)).toBe(false);
    expect(leaseExpired(1000, 2000, -1)).toBe(false);
  });

  test('批量扫面：仅收集期满下标，升序稳定，无 bornAt 视为未期满', () => {
    const actors = [
      { bornAt: 0 },      // 期满（now=6000 ≥ 5000）
      {},                 // 无 bornAt → 不收集
      { bornAt: 5500 },   // 未期满
      { bornAt: 100 },    // 期满
    ];
    expect(collectExpiredActorIndices(actors, 6000)).toEqual([0, 3]);
    expect(collectExpiredActorIndices(actors, 5099)).toEqual([0]);
  });

  test('批量扫面：空数组 / 非数组 / 自定义租约阈值', () => {
    expect(collectExpiredActorIndices([], 10000)).toEqual([]);
    expect(collectExpiredActorIndices(null, 10000)).toEqual([]);
    expect(collectExpiredActorIndices([{ bornAt: 0 }], 100, 50)).toEqual([0]);
  });
});

// ==================== C. 装配面（双通道回收路径） ====================
describe('#247 · C 装配面', () => {
  test('强制回收路径：dispose → 静默恢复图标 → renderPageStack 重新落位 → 空闲收口', () => {
    expect(appWindowJs).toMatch(/function forceRecycleExpiredActors\(now\) \{[\s\S]*?disposeActorElements\(actor\);[\s\S]*?popHomeIcon\(actor\.iconEl, \{ silent: true \}\);[\s\S]*?renderPageStack\(\);[\s\S]*?finishAnim\(\);[\s\S]*?return expired\.length;/);
  });

  test('看门狗：setTimeout 与 rAF 解耦，单发 + 续看（阈值 = 租约 + 250ms 缓冲）', () => {
    expect(appWindowJs).toContain('CLOSING_ACTOR_LEASE_MS_DEFAULT + 250');
    expect(appWindowJs).toMatch(/actorLeaseTimer = setTimeout\(\(\) => \{[\s\S]*?forceRecycleExpiredActors\(performance\.now\(\)\);[\s\S]*?if \(closingActors\.length > 0\) armActorLeaseWatchdog\(\);/);
  });

  test('出生武装点位于 bornActor 首帧渲染之后（幂等守卫在前）', () => {
    expect(appWindowJs).toMatch(/armActorLeaseWatchdog\(\);[\s\S]*?if \(homeEl\) \{\s*\n\s*clearIconEntranceAnim/);
    expect(appWindowJs).toMatch(/function armActorLeaseWatchdog\(\) \{\s*\n  if \(actorLeaseTimer\) return;/);
  });
});
