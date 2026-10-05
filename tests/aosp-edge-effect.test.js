// ==================== aosp-edge-effect.test.js — AOSP EdgeEffect / EdgeGlow 移植回归 ====================
//
// 覆盖（Issue #4 附件 1:1 移植）：
//   · stretch：onPull 拉伸距离累积、getStretch 经 dampStretchVector 有界
//   · onPullDistance 消耗语义（API 31）：返回实际消耗、getDistance 同步
//   · onRelease → receede 弹簧 → 收敛归 IDLE（时间驱动）
//   · onAbsorb → 速度注入弹簧 → 回弹归零
//   · glow（API 30 双模）：状态机 PULL → PULL_DECAY → RECEDE → IDLE 时间推进
//   · EdgeGlow.draw(ctx) 用最小 Canvas2D 替身完成绘制推进并返回活跃标记

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EdgeEffect, EDGE_TYPE_STRETCH, EDGE_TYPE_GLOW, EDGE_TYPE_NONE } from '../ios-desktop/js/aosp/edge-effect.js';
import { EdgeGlow } from '../ios-desktop/js/aosp/edge-glow.js';

let nowMs = 1_000_000;
let spy;

beforeEach(() => {
  nowMs = 1_000_000;
  spy = vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
});

afterEach(() => {
  spy.mockRestore();
});

const tick = (ms) => { nowMs += ms; };

describe('EdgeEffect（stretch, Android 12+）', () => {
  it('onPull 累积拉伸距离，getStretch 有界（dampStretchVector）', () => {
    const e = new EdgeEffect(EDGE_TYPE_STRETCH);
    e.setSize(400, 800);
    expect(e.isFinished()).toBe(true);
    e.onPull(0.1, 0.5);
    expect(e.isFinished()).toBe(false);
    expect(e.mDistance).toBeCloseTo(0.1, 5);
    const s = e.getStretch();
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(0.05);   // 满程形变 ≈3.2%（dampStretchVector 上限内）
    e.onPull(0.1, 0.5);
    expect(e.mDistance).toBeCloseTo(0.2, 5);
  });

  it('onPull 距离钳制 1.0（不许无限拉伸）', () => {
    const e = new EdgeEffect(EDGE_TYPE_STRETCH);
    e.setSize(400, 800);
    e.onPull(0.8, 0.5);
    e.onPull(0.8, 0.5);
    expect(e.mDistance).toBeLessThanOrEqual(1.0);
  });

  it('onPullDistance 返回实际消耗量并同步 getDistance', () => {
    const e = new EdgeEffect(EDGE_TYPE_STRETCH);
    e.setSize(400, 800);
    const consumed = e.onPullDistance(0.15, 0.5);
    expect(consumed).toBeCloseTo(0.15, 5);
    expect(e.getDistance()).toBeCloseTo(0.15, 5);
    // 反向回收：delta 为负、返回负消耗
    const back = e.onPullDistance(-0.05, 0.5);
    expect(back).toBeCloseTo(-0.05, 5);
    expect(e.getDistance()).toBeCloseTo(0.10, 5);
  });

  it('onRelease → receede 弹簧收敛回 IDLE（拉伸归零）', () => {
    const e = new EdgeEffect(EDGE_TYPE_STRETCH);
    e.setSize(400, 800);
    e.onPull(0.3, 0.5);
    e.onRelease();
    // draw() 推进弹簧；时间步进直到收敛
    for (let i = 0; i < 600 && !e.isFinished(); i++) {
      tick(16.7);
      e.draw();
    }
    expect(e.isFinished()).toBe(true);
    expect(e.mDistance).toBe(0);
  });

  it('onAbsorb 速度注入（fling 撞边）→ 弹簧回零', () => {
    const e = new EdgeEffect(EDGE_TYPE_STRETCH);
    e.setSize(400, 800);
    e.onAbsorb(1200);
    expect(e.isFinished()).toBe(false);
    // 首帧 deltaT < 0.001ms 直返（AOSP updateSpring 纪律），推进一帧后拉伸出现
    tick(16.7);
    e.draw();
    expect(e.mDistance).toBeGreaterThan(0);
    for (let i = 0; i < 900 && !e.isFinished(); i++) {
      tick(16.7);
      e.draw();
    }
    expect(e.isFinished()).toBe(true);
    expect(e.mDistance).toBe(0);
  });

  it('反向拉动优先消耗当前拉伸（对侧 onPullDistance 语义）', () => {
    const e = new EdgeEffect(EDGE_TYPE_STRETCH);
    e.setSize(400, 800);
    e.onPull(0.4, 0.5);
    const consumed = e.onPullDistance(-0.1, 0.5);
    expect(consumed).toBeCloseTo(-0.1, 5);
    expect(e.getDistance()).toBeCloseTo(0.3, 5);
  });

  it('EDGE_TYPE_NONE：一切操作即刻 finish', () => {
    const e = new EdgeEffect(EDGE_TYPE_NONE);
    e.setSize(400, 800);
    e.onPull(0.3, 0.5);
    expect(e.isFinished()).toBe(true);
    expect(e.onPullDistance(0.3, 0.5)).toBe(0);
  });
});

describe('EdgeEffect glow 双模状态机', () => {
  it('PULL → 167ms 后 PULL_DECAY → 衰减到零后落 IDLE（draw 终态检查）', () => {
    const e = new EdgeEffect(EDGE_TYPE_GLOW);
    e.setSize(400, 800);
    e.onPull(0.2, 0.5);
    expect(e.mState).toBe(1);   // STATE_PULL

    tick(200);
    e.draw();                    // 越过 PULL_TIME=167 → PULL_DECAY
    expect(e.mState).toBe(4);

    tick(2100);
    e.draw();                    // PULL_DECAY 期满：glow 已衰减到 0 →
                                 // RECEDE 与 draw() 终态检查（scaleY=0 → IDLE）同帧完成
    expect(e.isFinished()).toBe(true);
  });

  it('onAbsorb glow：峰值 α ≤ MAX_ALPHA 且随后消退', () => {
    const e = new EdgeEffect(EDGE_TYPE_GLOW);
    e.setSize(400, 800);
    e.onAbsorb(3000);
    expect(e.mState).toBe(2);   // STATE_ABSORB
    expect(e.mGlowAlphaFinish).toBeLessThanOrEqual(0.15);
    for (let i = 0; i < 2000 && !e.isFinished(); i++) {
      tick(16.7);
      e.draw();
    }
    expect(e.isFinished()).toBe(true);
  });
});

describe('EdgeGlow（API 30 独立类）', () => {
  /** 最小 Canvas2D 替身（draw 只用这些方法） */
  const fakeCtx = () => {
    const calls = { clip: 0, arc: 0, fill: 0 };
    const ctx = {
      save: () => {}, restore: () => {},
      translate: () => {}, scale: () => {}, rotate: () => {},
      beginPath: () => {}, rect: () => {}, clip: () => { calls.clip++; },
      arc: () => { calls.arc++; }, fill: () => { calls.fill++; },
      calls,
    };
    return ctx;
  };

  it('构造：默认基色 = color | 0x33000000（AOSP colorEdgeEffect 透明度）', () => {
    const g = new EdgeGlow(0x8ab4f8);
    expect(g.mColor).toBe(0x338ab4f8);
    expect(g.mBlendMode).toBe('source-atop');
  });

  it('onPull → draw 推进状态机并绘制圆弧', () => {
    const g = new EdgeGlow(0x8ab4f8);
    g.setSize(400, 800);
    g.onPull(0.3, 0.5);
    expect(g.mState).toBe(EdgeGlow.STATE_PULL);
    const ctx = fakeCtx();
    tick(16.7);
    const active = g.draw(ctx);
    expect(ctx.calls.arc).toBe(1);
    expect(ctx.calls.fill).toBe(1);
    expect(typeof active).toBe('boolean');
  });

  it('onAbsorb → 快速脉冲 → RECEDE → IDLE', () => {
    const g = new EdgeGlow(0x8ab4f8);
    g.setSize(400, 800);
    g.onAbsorb(2500);
    expect(g.mState).toBe(EdgeGlow.STATE_ABSORB);
    for (let i = 0; i < 2000 && !g.isFinished(); i++) {
      tick(16.7);
      g.draw(fakeCtx());
    }
    expect(g.isFinished()).toBe(true);
  });

  it('PULL 按住 167ms 后进入 PULL_DECAY 缓慢衰减（AOSP 行为）', () => {
    const g = new EdgeGlow(0x8ab4f8);
    g.setSize(400, 800);
    g.onPull(0.3, 0.5);
    tick(200);
    g.draw(fakeCtx());
    expect(g.mState).toBe(EdgeGlow.STATE_PULL_DECAY);
  });
});
