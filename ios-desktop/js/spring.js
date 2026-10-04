// @ts-check
// ==================== spring.js — Apple 官方弹簧模型 + RK4 积分引擎 ====================
// TS 渐进迁移（批次五）：本文件已开启严格类型检查（@ts-check），
// 修改时请同步维护 JSDoc 类型标注；未标注文件的类型推断仍正常工作。

/**
 * @typedef {Object} SpringParams
 * @property {number} mass      质量 m（影响惯性）
 * @property {number} stiffness 刚度 k（越大到位越快）
 * @property {number} damping   阻尼 c（耗散能量，决定是否回弹）
 */

/**
 * 根据 Apple CASpringAnimation 的 response / dampingRatio / mass
 * 计算出 stiffness 与 damping 系数。
 * @param {number} response      响应时长（秒，约等于到达时间尺度）
 * @param {number} dampingRatio  阻尼比 ζ（<1 欠阻尼回弹，1 临界，>1 过阻尼）
 * @param {number} [mass=1]      质量，默认 1
 * @returns {SpringParams}
 */
export function makeSpringParams(response, dampingRatio, mass = 1) {
  const stiffness = mass * Math.pow((2 * Math.PI) / response, 2);
  const damping = 2 * dampingRatio * Math.sqrt(stiffness * mass);
  return { mass, stiffness, damping };
}

// 应用打开 / 关闭的弹簧参数
// iOS 26「液态玻璃」手感校准：
//   打开 —— response 0.38 / ζ 0.80：比旧参数更快落位，仅带一丝受控过冲（玻璃柔性，不弹跳）
//   关闭 —— response 0.35 / ζ 0.85：加速吸入图标、收场更紧致（对齐 macOS 最小化的"吸走"感），
//          同时保持与 OPEN 的尾迹衰减率比 ≈ 13%，尊重 spring.test.js 的开/关对称性约束（<15%）
export const OPEN_PARAMS  = makeSpringParams(0.38, 0.80, 1);
export const CLOSE_PARAMS = makeSpringParams(0.35, 0.85, 1);

/**
 * 一维弹簧 — 使用 RK4（四阶龙格-库塔）数值积分
 * 比欧拉法稳定得多，在高刚度场景下不会发散。
 */
export class Spring {
  /**
   * @param {SpringParams & { initialValue?: number, initialVelocity?: number }} cfg
   *        弹簧参数 + 可选初值/初速度
   */
  constructor({ mass, stiffness, damping, initialValue = 0, initialVelocity = 0 }) {
    // 字段类型由上方 @param 解构推断：mass/stiffness/damping/x/v/target 均为 number
    this.mass = mass;
    this.stiffness = stiffness;
    this.damping = damping;
    this.x = initialValue;      // 当前位置
    this.v = initialVelocity;   // 当前速度
    this.target = initialValue; // 目标位置
  }

  /**
   * 设定目标位置；可选注入初速度（手势释放速度接力）。
   * @param {number} target
   * @param {number|null} [initialVelocity=null] 传 null 保持当前速度
   */
  setTarget(target, initialVelocity = null) {
    this.target = target;
    if (initialVelocity !== null) this.v = initialVelocity;
  }

  /** @param {SpringParams} params */
  reconfigure({ mass, stiffness, damping }) {
    this.mass = mass;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  /**
   * RK4 一步积分；dt 为帧间隔（秒），建议 ≤ 1/30 保证高刚度下的精度。
   * @param {number} dt
   */
  update(dt) {
    const m = this.mass, k = this.stiffness, c = this.damping;
    /** 加速度函数 a(x, v) = (-k·(x - target) - c·v) / m
     * @param {number} x
     * @param {number} v
     */
    const f = (x, v) => {
      const disp = x - this.target;
      return (-k * disp - c * v) / m;
    };

    const k1v = f(this.x, this.v),                         k1x = this.v;
    const k2v = f(this.x + 0.5 * dt * k1x, this.v + 0.5 * dt * k1v), k2x = this.v + 0.5 * dt * k1v;
    const k3v = f(this.x + 0.5 * dt * k2x, this.v + 0.5 * dt * k2v), k3x = this.v + 0.5 * dt * k2v;
    const k4v = f(this.x + dt * k3x, this.v + dt * k3v),             k4x = this.v + dt * k3v;

    this.v += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    this.x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
  }

  /**
   * 是否已收敛（位置与速度双阈值）。
   * @param {number} [posEps=0.005] 位置误差阈值
   * @param {number} [velEps=0.5]   速度阈值
   * @returns {boolean}
   */
  isSettled(posEps = 0.005, velEps = 0.5) {
    return Math.abs(this.x - this.target) < posEps && Math.abs(this.v) < velEps;
  }
}

/**
 * 二维弹簧 — 两个独立的一维弹簧分别管理 X / Y 轴。
 * 用于应用窗口的位置追踪。
 */
export class Spring2D {
  /**
   * @param {SpringParams} params
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @param {number} [vx=0]
   * @param {number} [vy=0]
   */
  constructor(params, x = 0, y = 0, vx = 0, vy = 0) {
    this.x = new Spring({ ...params, initialValue: x, initialVelocity: vx });
    this.y = new Spring({ ...params, initialValue: y, initialVelocity: vy });
  }

  /**
   * 双轴设目标；速度参数传 null 保持当前轴速度（与 Spring.setTarget 一致）。
   * @param {number} tx
   * @param {number} ty
   * @param {number|null} [vx=null]
   * @param {number|null} [vy=null]
   */
  setTarget(tx, ty, vx = null, vy = null) {
    this.x.setTarget(tx, vx);
    this.y.setTarget(ty, vy);
  }

  /** @param {SpringParams} params */
  reconfigure(params) {
    this.x.reconfigure(params);
    this.y.reconfigure(params);
  }

  /** @param {number} dt */
  update(dt) {
    this.x.update(dt);
    this.y.update(dt);
  }

  /** @returns {number} X 轴当前位置 */
  get px() { return this.x.x; }
  /** @returns {number} Y 轴当前位置 */
  get py() { return this.y.x; }
  /** @returns {number} X 轴当前速度 */
  get vx() { return this.x.v; }
  /** @returns {number} Y 轴当前速度 */
  get vy() { return this.y.v; }

  /**
   * 双轴是否均已收敛。
   * @param {number} [posEps=0.005]
   * @param {number} [velEps=0.5]
   * @returns {boolean}
   */
  isSettled(posEps = 0.005, velEps = 0.5) {
    return this.x.isSettled(posEps, velEps) && this.y.isSettled(posEps, velEps);
  }
}
