// ==================== tests/spring.test.js — 弹簧物理收敛性测试（批次五） ====================
//
// 覆盖 ROADMAP 批次五「Vitest 单元测试：弹簧收敛性」：
//   · makeSpringParams 与 Apple CASpringAnimation 公式一致性
//   · RK4 数值积分的收敛性（到位精度 / 速度归零 / 无 NaN）
//   · 高刚度（response=0.1s）下不发散 —— RK4 相对欧拉法的核心价值
//   · 欠阻尼 ζ=0.72 的过冲有界；临界阻尼 ζ=1 无过冲
//   · 开/关（0→500 vs 500→0）收敛步数对称
//   · Spring2D 双轴独立收敛与 getter
//
// 全部为纯数值测试，不依赖 DOM。

import { describe, it, expect } from 'vitest';
import {
  makeSpringParams,
  OPEN_PARAMS,
  CLOSE_PARAMS,
  Spring,
  Spring2D,
} from '../ios-desktop/js/spring.js';

const DT = 1 / 120;        // 120Hz 帧间隔（与桌面高频刷新一致）
const MAX_SECONDS = 8;     // 收敛判定上限模拟时长

/** 以固定步长推进弹簧直至 settled 或超时，返回 {steps, maxOvershoot, maxAbsX} */
function runSpring(spring, from, to) {
  spring.x = from;
  spring.v = 0;
  spring.target = to;
  const maxSteps = Math.ceil(MAX_SECONDS / DT);
  const over = Math.abs(to - from);
  let maxOvershoot = 0;
  let maxAbsX = 0;
  let steps = 0;
  for (let i = 0; i < maxSteps; i++) {
    spring.update(DT);
    steps++;
    maxAbsX = Math.max(maxAbsX, Math.abs(spring.x));
    const past = (spring.x - to) / (to - from); // 越过目标的比例（>0 即过冲）
    if (past > 0) maxOvershoot = Math.max(maxOvershoot, past * over);
    if (spring.isSettled()) break;
  }
  return { steps, maxOvershoot, maxAbsX, settled: spring.isSettled() };
}

describe('makeSpringParams — Apple CASpringAnimation 参数换算', () => {
  it('stiffness = m·(2π/response)²，damping = 2ζ√(k·m)', () => {
    const p = makeSpringParams(0.4, 0.72, 1);
    const k = Math.pow((2 * Math.PI) / 0.4, 2);
    expect(p.mass).toBe(1);
    expect(p.stiffness).toBeCloseTo(k, 6);
    expect(p.damping).toBeCloseTo(2 * 0.72 * Math.sqrt(k), 6);
  });

  it('缺省 mass=1；OPEN/CLOSE 参数均为合法正数且 CLOSE 阻尼更高（回弹更收敛）', () => {
    expect(makeSpringParams(0.3, 0.9).mass).toBe(1);
    expect(OPEN_PARAMS.stiffness).toBeGreaterThan(0);
    expect(OPEN_PARAMS.damping).toBeGreaterThan(0);
    expect(CLOSE_PARAMS.damping).toBeGreaterThan(OPEN_PARAMS.damping);
  });
});

describe('Spring — RK4 收敛性', () => {
  it('0→500 常规参数在时限内收敛到目标（位置误差 < 0.5，速度 < 0.5）', () => {
    const s = new Spring({ ...OPEN_PARAMS, initialValue: 0 });
    const r = runSpring(s, 0, 500);
    expect(r.settled).toBe(true);
    expect(Math.abs(s.x - 500)).toBeLessThan(0.5);
    expect(Math.abs(s.v)).toBeLessThan(0.5);
  });

  it('全程无 NaN / Infinity（数值稳定性）', () => {
    const s = new Spring({ ...OPEN_PARAMS, initialValue: 0 });
    s.setTarget(500);
    for (let i = 0; i < Math.ceil(3 / DT); i++) {
      s.update(DT);
      expect(Number.isFinite(s.x)).toBe(true);
      expect(Number.isFinite(s.v)).toBe(true);
    }
  });

  it('高刚度 response=0.1s 在 60Hz 步长下仍收敛且不发散（RK4 稳定性优势）', () => {
    const stiff = makeSpringParams(0.1, 0.72, 1); // k ≈ 3948，欧拉法在此会发散
    const s = new Spring({ ...stiff, initialValue: 0 });
    s.setTarget(300);
    const dt60 = 1 / 60;
    let maxAbs = 0;
    for (let i = 0; i < Math.ceil(3 / dt60); i++) {
      s.update(dt60);
      maxAbs = Math.max(maxAbs, Math.abs(s.x));
      expect(Number.isFinite(s.x)).toBe(true);
    }
    expect(maxAbs).toBeLessThan(600);            // 未发散（远小于欧拉法的爆炸值）
    expect(Math.abs(s.x - 300)).toBeLessThan(1); // 且已实质到位
  });

  it('欠阻尼 ζ=0.72 过冲有界（< 15% 行程）', () => {
    const s = new Spring({ ...OPEN_PARAMS, initialValue: 0 });
    const r = runSpring(s, 0, 400);
    // 理论过冲 ≈ exp(-ζπ/√(1-ζ²)) ≈ 3.8%，数值离散允许到 15%
    expect(r.maxOvershoot).toBeLessThan(400 * 0.15);
  });

  it('临界阻尼 ζ=1 无过冲', () => {
    const crit = makeSpringParams(0.4, 1, 1);
    const s = new Spring({ ...crit, initialValue: 0 });
    const r = runSpring(s, 0, 400);
    expect(r.maxOvershoot).toBe(0);
    expect(r.settled).toBe(true);
  });

  it('开与关（0→500 vs 500→0）收敛步数对称（误差 < 15%）', () => {
    const open = new Spring({ ...OPEN_PARAMS });
    const close = new Spring({ ...CLOSE_PARAMS });
    const rOpen = runSpring(open, 0, 500);
    const rClose = runSpring(close, 500, 0);
    const ratio = Math.abs(rOpen.steps - rClose.steps) / Math.max(rOpen.steps, rClose.steps);
    expect(ratio).toBeLessThan(0.15);
  });

  it('setTarget 可中途改道且收敛到新目标；初速度参与积分', () => {
    const s = new Spring({ ...OPEN_PARAMS, initialValue: 0 });
    s.setTarget(300);
    for (let i = 0; i < 60; i++) s.update(DT); // 0.5s
    s.setTarget(-200);
    for (let i = 0; i < Math.ceil(5 / DT); i++) {
      s.update(DT);
      if (s.isSettled()) break;
    }
    expect(s.target).toBe(-200);
    expect(Math.abs(s.x - -200)).toBeLessThan(0.5);

    const kicked = new Spring({ ...OPEN_PARAMS, initialValue: 0 });
    const still = new Spring({ ...OPEN_PARAMS, initialValue: 0 });
    kicked.setTarget(400, 3000); // 强初速
    still.setTarget(400);
    kicked.update(DT);
    still.update(DT);
    expect(kicked.x).not.toBeCloseTo(still.x, 1); // 初速确实影响轨迹
  });
});

describe('Spring2D — 双轴独立收敛', () => {
  it('x/y 两轴各自收敛到目标，getter 正确', () => {
    const s2 = new Spring2D(OPEN_PARAMS, 0, 0);
    s2.setTarget(320, -240);
    for (let i = 0; i < Math.ceil(6 / DT); i++) {
      s2.update(DT);
      if (s2.isSettled(0.5, 0.5)) break;
    }
    expect(Math.abs(s2.px - 320)).toBeLessThan(0.5);
    expect(Math.abs(s2.py - -240)).toBeLessThan(0.5);
    expect(Math.abs(s2.vx)).toBeLessThan(0.5);
    expect(Math.abs(s2.vy)).toBeLessThan(0.5);
    expect(s2.isSettled(0.5, 0.5)).toBe(true);
  });

  it('reconfigure 同步作用于两轴；单轴未 settled 时整体视为未 settled', () => {
    const s2 = new Spring2D(CLOSE_PARAMS, 0, 0);
    s2.reconfigure(makeSpringParams(0.2, 1, 1));
    expect(s2.x.stiffness).toBe(s2.y.stiffness);
    s2.x.setTarget(100);
    s2.y.setTarget(0);
    s2.y.x = 0; s2.y.v = 0;
    expect(s2.isSettled(0.005, 0.5)).toBe(false); // x 仍在途中
  });
});
