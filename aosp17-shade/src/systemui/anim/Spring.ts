/**
 * anim/Spring.ts — androidx.compose.animation.core Spring 的 JS 等价实现。
 *
 * 对应源码：androidx/compose/animation/core/Spring.kt（常量）与
 * SpringSimulation（dampingRatio 物理模型）。
 *
 * 供 qs/Tile.ts 使用，替代此前自造的 CSS transition / 关键帧：
 *  - animateDpAsState 默认规格 = spring(NoBouncy, StiffnessMediumLow)（圆角形状动画）
 *  - animateColorAsState 默认规格 = spring(StiffnessMediumLow)（dampingRatio 取
 *    spring() 形参默认 = MediumBouncy）
 *  - BounceableImpl 容器弹性 = spring() 默认（MediumBouncy, StiffnessMedium）
 *
 * 重定向（retarget）语义与 Compose Animatable 一致：以当前 value/velocity 起算。
 */

/** Spring.kt 常量 */
export const SpringStiffnessMediumLow = 400;
export const SpringStiffnessMedium = 1500;
export const SpringDampingRatioNoBouncy = 1.0;
export const SpringDampingRatioMediumBouncy = 0.75;

/** 单帧 dt 上限（ms），rAF 掉帧时防数值发散 */
const MAX_DT = 32;

const activeSprings = new Set<SpringValue>();
let tickerRunning = false;
let lastTick: number | undefined;

function tick() {
  const now = performance.now();
  const dt = Math.min(MAX_DT, now - (lastTick ?? now));
  lastTick = now;
  for (const s of [...activeSprings]) {
    s.tick(dt / 1000);
    if (s.settled) activeSprings.delete(s);
  }
  if (activeSprings.size > 0) {
    requestAnimationFrame(tick);
  } else {
    tickerRunning = false;
    lastTick = undefined;
  }
}

/** 解析 #rrggbb → [r,g,b] */
function parseHex(c: string): [number, number, number] | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(c.trim());
  if (!m) return null;
  const h = m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export class SpringValue {
  value: number;
  private velocity = 0;
  private target: number;
  private dampingRatio: number;
  private stiffness: number;
  private onChange: (v: number) => void;

  constructor(
    initial: number,
    dampingRatio: number,
    stiffness: number,
    onChange: (v: number) => void,
  ) {
    this.value = initial;
    this.target = initial;
    this.dampingRatio = dampingRatio;
    this.stiffness = stiffness;
    this.onChange = onChange;
  }

  /** Animatable.animateTo(target, spring(...)) */
  animateTo(target: number) {
    if (target === this.target && this.settled) return;
    this.target = target;
    if (Math.abs(target - this.value) < 0.001 && Math.abs(this.velocity) < 0.001) {
      this.value = target;
      this.velocity = 0;
      this.onChange(target);
      return;
    }
    activeSprings.add(this);
    if (!tickerRunning) {
      tickerRunning = true;
      requestAnimationFrame(tick);
    }
  }

  get settled(): boolean {
    return (
      Math.abs(this.value - this.target) < 0.01 && Math.abs(this.velocity) < 0.05
    );
  }

  /** 半隐式欧拉积分（每帧调用） */
  tick(dt: number) {
    const c = this.dampingRatio;
    const k = this.stiffness;
    const m = 1;
    // F = -k(x - target) - c_v * v ; c_v = 2 * dampingRatio * sqrt(k * m)
    const cv = 2 * c * Math.sqrt(k * m);
    const steps = Math.max(1, Math.ceil(dt / 0.008)); // ≤8ms 子步，稳定性
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const a = (-k * (this.value - this.target) - cv * this.velocity) / m;
      this.velocity += a * h;
      this.value += this.velocity * h;
    }
    if (this.settled) {
      this.value = this.target;
      this.velocity = 0;
    }
    this.onChange(this.value);
  }

  snapTo(v: number) {
    this.value = v;
    this.target = v;
    this.velocity = 0;
    activeSprings.delete(this);
    this.onChange(v);
  }
}

/** animateColorAsState — RGB 三通道各一个 spring（spec 见类注释） */
export class SpringColor {
  private channels: SpringValue[];
  private cur: [number, number, number];
  private onChange: (css: string) => void;

  constructor(
    initialHex: string,
    dampingRatio: number,
    stiffness: number,
    onChange: (css: string) => void,
  ) {
    this.cur = parseHex(initialHex) ?? [0, 0, 0];
    this.onChange = onChange;
    this.channels = [0, 1, 2].map(
      (i) => new SpringValue(this.cur[i], dampingRatio, stiffness, () => this.emit()),
    );
  }

  private emit() {
    const [r, g, b] = this.channels.map((c) => Math.round(c.value));
    this.onChange(`rgb(${r},${g},${b})`);
  }

  animateTo(hex: string) {
    const t = parseHex(hex);
    if (!t) {
      // 非 hex（transparent/rgba 等，如 unavailable 态的 surface@18%）无法插值 → 即时落位
      this.setImmediate(hex);
      return;
    }
    this.channels.forEach((c, i) => c.animateTo(t[i]));
  }

  /** 直接落位（首帧/主题刷新/不可插值目标） */
  setImmediate(raw: string) {
    const t = parseHex(raw);
    if (t) {
      this.channels.forEach((c, i) => c.snapTo(t[i]));
    } else {
      this.channels.forEach((c) => c.snapTo(c.value));
      this.onChange(raw);
    }
  }
}
