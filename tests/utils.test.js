// ==================== tests/utils.test.js — 通用工具边界测试（批次五） ====================
//
// 覆盖 ROADMAP 批次五「Vitest 单元测试：utils 边界」：
//   · clamp：区间内原值 / 下越界 / 上越界 / 等值区间 / NaN 透传
//   · smoothstep：端点映射 / 中点值 / 区间外钳制 / 单调性 / 退化区间
//
// 注：getGridColumns / getIconRect 依赖真实视口与布局，属集成测试范畴，
//     由 agent-browser 端到端覆盖，不在单元测试之列。

import { describe, it, expect } from 'vitest';
import { clamp, smoothstep } from '../ios-desktop/js/utils.js';

describe('clamp — 钳制', () => {
  it('区间内原值返回', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
    expect(clamp(-3.5, -5, 5)).toBe(-3.5);
  });

  it('越界钳到边界', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(1e9, 0, 10)).toBe(10);
  });

  it('min === max 时恒返回该值（桌面页号钳制 maxPage=0 的场景）', () => {
    expect(clamp(-5, 3, 3)).toBe(3);
    expect(clamp(99, 3, 3)).toBe(3);
    expect(clamp(3, 3, 3)).toBe(3);
  });

  it('NaN 透传（Math.max/min 的语义）——调用方需自行保证入参', () => {
    expect(clamp(NaN, 0, 10)).toBeNaN();
  });
});

describe('smoothstep — Hermite 平滑映射', () => {
  it('端点精确映射：e0 → 0，e1 → 1', () => {
    expect(smoothstep(2, 2, 8)).toBe(0);
    expect(smoothstep(8, 2, 8)).toBe(1);
  });

  it('中点返回 0.5（Hermite 对称性）', () => {
    expect(smoothstep(5, 2, 8)).toBeCloseTo(0.5, 12);
  });

  it('区间外钳制到 0 / 1（平滑启停窗口的经典用法）', () => {
    expect(smoothstep(-100, 0, 1)).toBe(0);
    expect(smoothstep(100, 0, 1)).toBe(1);
  });

  it('区间内单调不减（不会出现回退抖动）', () => {
    let prev = -1;
    for (let t = 0; t <= 10; t += 0.25) {
      const v = smoothstep(t, 0, 10);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('负向区间（e0 > e1）端点语义不变（e0→0，e1→1），走向单调递减', () => {
    expect(smoothstep(1, 1, 0)).toBe(0); // t = e0 → 0
    expect(smoothstep(0, 1, 0)).toBe(1); // t = e1 → 1
    let prev = 2;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = smoothstep(t, 1, 0);
      expect(v).toBeLessThanOrEqual(prev); // 递减
      prev = v;
    }
  });

  it('退化区间 e0 === e1：分母 ±0 → ±Infinity，钳制后与端点同向（用例固化实现语义）', () => {
    expect(smoothstep(0.5, 1, 1)).toBe(0);  // (t-e0)/0 = -Inf → 钳到 0
    expect(smoothstep(1.5, 1, 1)).toBe(1);  // (t-e0)/0 = +Inf → 钳到 1
    expect(smoothstep(1, 1, 1)).toBeNaN();  // 0/0 才产生 NaN
  });
});
