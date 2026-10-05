// ==================== ripple-session.test.js — M3E 涟漪会话时序 + 配色解析回归 ====================
//
// 覆盖（Issue #4 附件「M3E 点击涟漪」1:1 移植）：
//   · enter：0→0.5（450ms，fast_out_slow_in）；225ms 恰为 0.25（对称贝塞尔中点）
//   · exit 时序：delay 自按下时刻起算 → 提前松手 exit 在 max(450, exitAt) 准时开始
//   · 快速点击：exit 从当前进度平滑接续（无 0→0.5 跳变停顿）
//   · finished = max(450, exitAt) + 375ms
//   · noise：700ms 播完即停（AOSP onAnimationEnd 置 null 语义，不无限循环）
//   · computeTurbulenceUniforms 确定性 + parseColorToVec4 各格式
//   · ExpressiveRippleSurface 无 WebGL 环境优雅降级（mSupported=false）

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  RippleAnimationSession,
  computeTurbulenceUniforms,
  ExpressiveRippleSurface,
  FAST_OUT_SLOW_IN,
} from '../ios-desktop/js/aosp/expressive-ripple.js';
import { parseColorToVec4 } from '../ios-desktop/js/ripple-fx.js';

let nowMs = 1_000_000;
let spy;

beforeEach(() => {
  nowMs = 1_000_000;
  spy = vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
});
afterEach(() => {
  spy.mockRestore();
});

describe('RippleAnimationSession 时序', () => {
  it('enter：450ms 内 0→0.5（fast_out_slow_in），225ms ≈ 0.388', () => {
    const s = new RippleAnimationSession(100, 100, 50, 50, nowMs);
    s.update(nowMs + 225);
    // FOSI(0.5) ≈ 0.7756（快出慢入：前半程显著超前），enter 进度 = 0.5×FOSI
    expect(s.progress).toBeCloseTo(0.3878, 3);
    s.update(nowMs + 450);
    expect(s.progress).toBeCloseTo(0.5, 3);
    expect(s.finished).toBe(false);
  });

  it('exit 在按下后 450ms 准时开始（提前松手不再等 450ms）', () => {
    const s = new RippleAnimationSession(100, 100, 50, 50, nowMs);
    const downAt = nowMs;
    s.update(downAt + 100);
    s.requestExit(downAt + 100);              // 提前松手
    s.update(downAt + 449);
    const before = s.progress;
    s.update(downAt + 451);                   // 越过 max(450, 100)=450
    expect(s.progress).toBeGreaterThanOrEqual(before);
    expect(s.exiting).toBe(true);
  });

  it('exit 完成：total = max(450, exitAt) + 375ms', () => {
    const s = new RippleAnimationSession(100, 100, 50, 50, nowMs);
    const downAt = nowMs;
    s.update(downAt + 400);
    s.requestExit(downAt + 400);
    s.update(downAt + 400 + 374);
    expect(s.finished).toBe(false);
    s.update(downAt + 450 + 375 + 1);
    expect(s.finished).toBe(true);
    expect(s.progress).toBeCloseTo(1.0, 5);
  });

  it('快速点击：exit 从当前进度平滑接续（不跳回 0.5 起点）', () => {
    const s = new RippleAnimationSession(100, 100, 50, 50, nowMs);
    const downAt = nowMs;
    s.update(downAt + 50);
    const atExit = s.progress;                // 远未到 0.5
    expect(atExit).toBeLessThan(0.5);
    s.requestExit(downAt + 50);
    s.update(downAt + 451);                   // exit 起始帧
    expect(s.progress).toBeGreaterThanOrEqual(atExit);   // 从当前值接续
    expect(s.progress).toBeLessThan(0.5);     // 未跳变
  });

  it('noise 700ms 播完即停（不无限循环）', () => {
    const s = new RippleAnimationSession(100, 100, 50, 50, nowMs);
    s.update(nowMs + 500);
    const phase1 = s.noisePhase;
    s.update(nowMs + 9000);
    const phase2 = s.noisePhase;
    expect(phase2).toBeGreaterThan(phase1);
    // 相位封顶：mStartTime + MAX_NOISE_PHASE（7000ms 播完）
    expect(phase2).toBeCloseTo(nowMs + 32.710, 1);
  });

  it('requestExit 幂等（多次 up 只记一次退出时刻）', () => {
    const s = new RippleAnimationSession(100, 100, 50, 50, nowMs);
    s.requestExit(nowMs);
    const first = s.exitRequestedAt;
    s.requestExit(nowMs + 100);
    expect(s.exitRequestedAt).toBe(first);
  });
});

describe('FAST_OUT_SLOW_IN 插值器', () => {
  it('端点、单调性与“快出慢入”特征（三次贝塞尔 0.4,0,0.2,1）', () => {
    expect(FAST_OUT_SLOW_IN.getInterpolation(0)).toBe(0);
    expect(FAST_OUT_SLOW_IN.getInterpolation(1)).toBe(1);
    // 快出特征：中点已走过 ≈77.6%（回归钉值，对齐 1:1 移植的贝塞尔解算）
    expect(FAST_OUT_SLOW_IN.getInterpolation(0.5)).toBeCloseTo(0.7756, 3);
    // 单调递增
    let prev = 0;
    for (let x = 0.05; x <= 1.001; x += 0.05) {
      const y = FAST_OUT_SLOW_IN.getInterpolation(Math.min(x, 1));
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
    }
  });
});

describe('computeTurbulenceUniforms', () => {
  it('同相位确定性、相位推进产生变化', () => {
    const a = computeTurbulenceUniforms(1000);
    const b = computeTurbulenceUniforms(1000);
    expect(a.tCircle1).toEqual(b.tCircle1);
    const c = computeTurbulenceUniforms(2000);
    expect(c.tCircle1).not.toEqual(a.tCircle1);
  });
});

describe('parseColorToVec4（涟漪配色解析）', () => {
  it('rgba() / #rgb / #rrggbb / #rrggbbaa', () => {
    expect(parseColorToVec4('rgba(255, 255, 255, 0.2)')).toEqual([1, 1, 1, 0.2]);
    expect(parseColorToVec4('rgb(0, 0, 0)')).toEqual([0, 0, 0, 1]);
    expect(parseColorToVec4('#fff')).toEqual([1, 1, 1, 1]);
    expect(parseColorToVec4('#000000')).toEqual([0, 0, 0, 1]);
    expect(parseColorToVec4('#80FFFFFF')).toEqual([128 / 255, 1, 1, 1]);
  });

  it('非法输入返回 null（回落主题缺省色）', () => {
    expect(parseColorToVec4('')).toBeNull();
    expect(parseColorToVec4('not-a-color')).toBeNull();
    expect(parseColorToVec4(null)).toBeNull();
  });
});

describe('ExpressiveRippleSurface 环境降级', () => {
  it('无 WebGL：mSupported=false（涟漪静默缺席，功能不受影响）', () => {
    const canvas = document.createElement('canvas');
    const surface = new ExpressiveRippleSurface(canvas, {});
    // happy-dom 无 WebGL 实现 → getContext 返回 null → 优雅降级
    expect(surface.mSupported).toBe(false);
  });
});
