// @ts-check
// ==================== spring.js — Apple 官方弹簧模型 + 解析闭式解引擎 ====================
// TS 渐进迁移（批次五）：本文件已开启严格类型检查（@ts-check），
// 修改时请同步维护 JSDoc 类型标注；未标注文件的类型推断仍正常工作。
//
// v7.92：RK4 数值积分 → 阻尼谐振子解析闭式解（androidx MotionScheme 同构语义）。
// RK4 每帧四阶求值仍是离散近似，固有微小数值耗散；闭式解 x(t) 为真解，
// 高刚度（k800）下过冲比精确等于理论值 exp(−ζπ/√(1−ζ²))（ζ0.6 → 9.48%），
// 且与帧率/帧间隔抖动完全无关（RK4 在掉帧大 dt 时精度退化）。
// 欠阻尼：  x(t) = T + e^(−ζω₀t)·(A·cos ω_d·t + B·sin ω_d·t)，A = x₀−T，B = (v₀+ζω₀A)/ω_d
// 临界阻尼：x(t) = T + e^(−ω₀t)·(A + (v₀+ω₀A)·t)
// 过阻尼：  x(t) = T + C₁e^(r₁t) + C₂e^(r₂t)，r₁,₂ = −ω₀(ζ ∓ √(ζ²−1))
// 目标改道 / 参数重配 / 外部直写 x·v（手势速度接力）→ 惰性重锚：以当前 x/v 为新初值重启解析解。

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
 * 一维弹簧 — 阻尼谐振子解析闭式解（v7.92 起，RK4 数值积分退役）。
 * x(t) 为微分方程真解：任意帧率/帧间隔下无累积误差，高刚度不发散，
 * 过冲比精确等于理论值。目标改道/参数重配/外部直写均惰性重锚续新解。
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
    // ---- 解析解锚点：x(t) 以 (x₀, v₀, t=0) 为初值条件闭合求值 ----
    this._x0 = initialValue;
    this._v0 = initialVelocity;
    this._t = 0;                 // 自最近一次重锚起累计的时间（秒）
    this._lastTarget = this.target;
    this._paramsEpoch = 0;       // reconfigure 时 +1，触发惰性重锚
    this._anchorEpoch = 0;       // 最近一次重锚时的参数纪元
    this._lastX = initialValue;  // 引擎最近一次写入的 x（外部直写检测基准）
    this._lastV = initialVelocity; // 引擎最近一次写入的 v
  }

  /** 重锚：以当前 x/v 为新初值条件，解析解时钟归零 */
  _reanchor() {
    this._x0 = this.x;
    this._v0 = this.v;
    this._t = 0;
    this._lastTarget = this.target;
    this._lastX = this.x;
    this._lastV = this.v;
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

  /**
   * @param {SpringParams} params
   */
  reconfigure(params) {
    this.mass = params.mass;
    this.stiffness = params.stiffness;
    this.damping = params.damping;
    this._paramsEpoch++; // 参数变更使解析解失效 → 下次 update 惰性重锚
  }

  /**
   * 解析闭式解推进；dt 为帧间隔（秒）。
   * 与数值积分不同：任意 dt（掉帧/高帧率/变帧率）下 x(t) 均为真解，无累积误差。
   * 惰性重锚：target 被直接赋值改变 / reconfigure / 外部直写 x·v（速度接力）
   * 均以「当前 x/v + 时钟归零」重启解析解，语义与 RK4 续积分完全一致。
   * @param {number} dt
   */
  update(dt) {
    // 惰性重锚（三通道）：① target 被直接赋值改变 ② reconfigure 纪元变更
    // ③ 外部直写 x/v（手势速度接力、runSpring 式测试锚定）—— 与引擎上次
    // 写入值比对，任意时刻（含 _t=0 首帧前）都能抓到外部改写。
    if (this._lastTarget !== this.target || this._anchorEpoch !== this._paramsEpoch ||
        Math.abs(this.x - this._lastX) > 1e-12 * (1 + Math.abs(this._lastX)) ||
        Math.abs(this.v - this._lastV) > 1e-12 * (1 + Math.abs(this._lastV))) {
      this._reanchor();
      this._anchorEpoch = this._paramsEpoch;
    }
    // 时钟推进 + 闭式求值
    this._t += dt;
    const s = this._evaluate(this._t);
    this.x = s.x;
    this.v = s.v;
    this._lastX = this.x;
    this._lastV = this.v;
  }

  /**
   * 阻尼谐振子闭式解：给定距锚点时刻 tau 的精确 (x, v)。
   * @param {number} tau
   * @returns {{x: number, v: number}}
   */
  _evaluate(tau) {
    const m = this.mass, k = this.stiffness, c = this.damping;
    const w0 = Math.sqrt(k / m);
    const zeta = c / (2 * Math.sqrt(k * m));
    const A = this._x0 - this.target;
    if (tau === 0) {
      return { x: this._x0, v: this._v0 };
    }
    if (zeta < 1 - 1e-9) {
      // 欠阻尼（ζ<1）：compose FastSpatial ζ0.6 落此分支，过冲比 = e^(−ζπ/√(1−ζ²))
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      const B = (this._v0 + zeta * w0 * A) / wd;
      const e = Math.exp(-zeta * w0 * tau);
      const cos = Math.cos(wd * tau), sin = Math.sin(wd * tau);
      return {
        x: this.target + e * (A * cos + B * sin),
        v: e * ((-zeta * w0 * A + wd * B) * cos + (-zeta * w0 * B - wd * A) * sin),
      };
    }
    if (zeta <= 1 + 1e-9) {
      // 临界阻尼（ζ=1）：单调收敛无过冲
      const e = Math.exp(-w0 * tau);
      const B = this._v0 + w0 * A;
      return {
        x: this.target + e * (A + B * tau),
        v: e * (B - w0 * (A + B * tau)),
      };
    }
    // 过阻尼（ζ>1）：两个实特征根
    const s = w0 * Math.sqrt(zeta * zeta - 1);
    const r1 = -zeta * w0 + s;
    const r2 = -zeta * w0 - s;
    const C2 = (this._v0 - A * r1) / (r2 - r1);
    const C1 = A - C2;
    const e1 = Math.exp(r1 * tau), e2 = Math.exp(r2 * tau);
    return {
      x: this.target + C1 * e1 + C2 * e2,
      v: C1 * r1 * e1 + C2 * r2 * e2,
    };
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
