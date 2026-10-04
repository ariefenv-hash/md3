// ==================== tests/anim-speed.test.js — 动画倍率（v7.18 开发者选项）测试 ====================
//
// 覆盖 animation-presets.js 新增的动画倍率能力：
//   · getAnimSpeed 默认 1 / 脏值回落 1 / 持久化读取
//   · setAnimSpeed 钳制在 [0.25, 3]，localStorage 落盘，返回实际落地值
//   · scaleAnimSpeed 数学等价性：倍率 m 等价于 response ÷ m（k'=k·m²，c'=c·m）
//     —— 阻尼比 ζ = c / (2√(km)) 在缩放后保持不变（曲线形状逐点保真）
//   · curOpenParams / curCloseParams 随倍率联动；倍率复原后参数逐字段还原
//   · 倍率不影响 spring.js 导出的 OPEN/CLOSE_PARAMS 兜底常量（对称性测试的断言面）

import { describe, it, expect, beforeEach } from 'vitest';
import { makeSpringParams, OPEN_PARAMS, CLOSE_PARAMS } from '../ios-desktop/js/spring.js';
import {
  ANIM_SPEED_MIN,
  ANIM_SPEED_MAX,
  getAnimSpeed,
  setAnimSpeed,
  scaleAnimSpeed,
  curOpenParams,
  curCloseParams,
} from '../ios-desktop/js/animation-presets.js';

/** 阻尼比 ζ = c / (2·√(k·m)) */
function zeta(p) {
  return p.damping / (2 * Math.sqrt(p.stiffness * p.mass));
}

describe('动画倍率（开发者选项 v7.18）', () => {
  beforeEach(() => {
    localStorage.removeItem('ios-desktop:anim-speed');
  });

  it('默认倍率为 1，脏值/越界存档回落 1', () => {
    expect(getAnimSpeed()).toBe(1);
    localStorage.setItem('ios-desktop:anim-speed', 'abc');
    expect(getAnimSpeed()).toBe(1);
    localStorage.setItem('ios-desktop:anim-speed', '99');
    expect(getAnimSpeed()).toBe(1);
    localStorage.setItem('ios-desktop:anim-speed', '0.01');
    expect(getAnimSpeed()).toBe(1);
  });

  it('setAnimSpeed 钳制在 [0.25, 3] 并持久化', () => {
    expect(setAnimSpeed(0.5)).toBe(0.5);
    expect(getAnimSpeed()).toBe(0.5);
    expect(localStorage.getItem('ios-desktop:anim-speed')).toBe('0.5');
    expect(setAnimSpeed(99)).toBe(ANIM_SPEED_MAX);
    expect(setAnimSpeed(0.01)).toBe(ANIM_SPEED_MIN);
    expect(setAnimSpeed(1)).toBe(1);
  });

  it('scaleAnimSpeed：k·m² / c·m 数学等价于 response÷m，ζ 逐点保真', () => {
    const base = makeSpringParams(0.38, 0.79, 1);
    for (const m of [0.25, 0.5, 1, 1.5, 2, 3]) {
      localStorage.setItem('ios-desktop:anim-speed', String(m));
      const scaled = scaleAnimSpeed(base);
      if (m === 1) {
        expect(scaled.stiffness).toBe(base.stiffness);
        expect(scaled.damping).toBe(base.damping);
      } else {
        expect(scaled.stiffness).toBeCloseTo(base.stiffness * m * m, 9);
        expect(scaled.damping).toBeCloseTo(base.damping * m, 9);
      }
      expect(scaled.mass).toBe(base.mass);
      // 阻尼比不变：曲线形状（过冲/收敛包络）逐点保真，仅时间轴缩放
      expect(zeta(scaled)).toBeCloseTo(zeta(base), 12);
      // 与 response÷m 的直接构造逐字段一致
      const direct = makeSpringParams(0.38 / m, 0.79, 1);
      expect(scaled.stiffness).toBeCloseTo(direct.stiffness, 7);
      expect(scaled.damping).toBeCloseTo(direct.damping, 7);
    }
  });

  it('curOpenParams / curCloseParams 随倍率联动且可复原', () => {
    localStorage.setItem('ios-desktop:anim-speed', '1');
    const p1 = curOpenParams();
    const c1 = curCloseParams();
    localStorage.setItem('ios-desktop:anim-speed', '2');
    const p2 = curOpenParams();
    expect(p2.stiffness).toBeCloseTo(p1.stiffness * 4, 9);
    expect(p2.damping).toBeCloseTo(p1.damping * 2, 9);
    expect(curCloseParams().stiffness).toBeCloseTo(c1.stiffness * 4, 9);
    // 复原
    localStorage.setItem('ios-desktop:anim-speed', '1');
    const p3 = curOpenParams();
    expect(p3.stiffness).toBe(p1.stiffness);
    expect(p3.damping).toBe(p1.damping);
  });

  it('倍率缩放后的弹簧仍收敛（RK4 数值稳定性）', () => {
    localStorage.setItem('ios-desktop:anim-speed', '3');
    const p = curOpenParams();
    const spring = { ...p, x: 0, v: 0, target: 1 };
    // 手写 RK4 单步循环（与 Spring.update 同式）验证收敛
    const dt = 1 / 120;
    let steps = 0;
    while (Math.abs(spring.x - 1) > 0.005 || Math.abs(spring.v) > 0.5) {
      const f = (x, v) => (-p.stiffness * (x - spring.target) - p.damping * v) / p.mass;
      const k1v = f(spring.x, spring.v), k1x = spring.v;
      const k2v = f(spring.x + 0.5 * dt * k1x, spring.v + 0.5 * dt * k1v), k2x = spring.v + 0.5 * dt * k1v;
      const k3v = f(spring.x + 0.5 * dt * k2x, spring.v + 0.5 * dt * k2v), k3x = spring.v + 0.5 * dt * k2v;
      const k4v = f(spring.x + dt * k3x, spring.v + dt * k3v), k4x = spring.v + dt * k3v;
      spring.v += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
      spring.x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
      steps++;
      if (steps > 120 * 8) break;
    }
    expect(steps).toBeLessThan(120 * 8);
    expect(spring.x).toBeCloseTo(1, 2);
    expect(Number.isFinite(spring.x)).toBe(true);
  });

  it('倍率不触碰 spring.js 兜底常量（对称性测试断言面隔离）', () => {
    localStorage.setItem('ios-desktop:anim-speed', '2');
    expect(OPEN_PARAMS.stiffness).toBeCloseTo(makeSpringParams(0.38, 0.80, 1).stiffness, 12);
    expect(CLOSE_PARAMS.stiffness).toBeCloseTo(makeSpringParams(0.35, 0.85, 1).stiffness, 12);
  });
});
