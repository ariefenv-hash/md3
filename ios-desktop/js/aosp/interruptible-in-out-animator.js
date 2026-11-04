/**
 * interruptible-in-out-animator.js — Launcher3 InterruptibleInOutAnimator 1:1 移植
 * （纯逻辑层，零 DOM；#103 / #54 孵化方向）。
 *
 * AOSP 锚点：packages/apps/Launcher3/src/com/android/launcher3/anim/InterruptibleInOutAnimator.java
 * 核心语义（#103 议题原文）：
 * - 维护 mDirection（进/出）与当前 progress；
 * - 反向触发时**从当前 progress 接续**向反方向播放，而不是先 end 再 start（这正是
 *   md3 #39 类「快速点击丢动画」的根因形态）；
 * - 到边界（0 或 1）才真正结束并回调 onStop。
 * - scaleDuration：反向动画时长与剩余 progress 成比例（距离分数 × 满程时长）——
 *   完整翻转慢、贴边微调快（TimedValue 既有 elapsedFrac 时间分数缩放的互补语义，
 *   Launcher3 原生为距离分数口径）。
 *
 * 单一动画真源纪律：内核委托 animation-presets.js TimedValue（progress/插值/剩余
 * 时长接管既有协议），本模块只做 Launcher3 API 形态增量——direction 状态机 +
 * in()/out() 具名入口 + 边界 onStop 单次回调 + setProgress 瞬置（skipTo/cancel 语义）。
 *
 * 驱动模式：宿主 rAF 循环 update(dt)（与 TimedValue/Spring 同签名同量纲）——
 * 不自建 rAF 循环（零复制；context-menu tickMenu 等既有编排零改驱动面）。
 */
import { TimedValue } from '../animation-presets.js';

/** 线性插值（Launcher3 LinearInterpolator 同义；与 context-menu.js 本地同款定义惯例一致）。 */
const LINEAR = (t) => t;

/** Launcher3 mDirection 字面量（同名同义）。 */
export const DIRECTION = Object.freeze({ IN: 'in', OUT: 'out' });

/** 距离比例缩放下限（ms）——剩余距离趋零时钳最短动画窗，防 0ms 空转一帧直落终态。 */
export const MIN_SCALED_MS = 16;

/**
 * 可中断进出动画器（Launcher3 同名同义）。
 * @param {object} cfg
 * @param {number} cfg.durationMs  满程时长（in 方向基准；Launcher3 mOriginalDuration）
 * @param {number} [cfg.outDurationMs]  out 方向满程覆写（md3 开/关不对称时序面，
 *   如 context-menu openFade 83/close 233——Launcher3 单 duration 的可选扩展，缺省同 durationMs）
 * @param {Function} [cfg.interpolator]  in 方向插值器（缺省 LINEAR——Launcher3 默认 LinearInterpolator）
 * @param {Function} [cfg.outInterpolator]  out 方向插值器覆写（md3 开/关不对称曲线面，缺省同 interpolator）
 * @param {number} [cfg.initialValue]  初始 progress（0=收起态）
 * @param {(boundary:'in'|'out'|null, x:number)=>void} [cfg.onStop]  边界回调
 *   （Launcher3 AnimatorListenerAdapter.onStop 同义；中途被打断不回调——
 *   下一段 in()/out() 重置边界记录）
 */
export class InterruptibleInOutAnimator {
  constructor({ durationMs = 300, outDurationMs = null, interpolator = LINEAR, outInterpolator = null, initialValue = 0, onStop = null } = {}) {
    this._durationMs = Math.max(durationMs, 1);
    this._outDurationMs = outDurationMs ?? durationMs;
    this._interpIn = interpolator;
    this._interpOut = outInterpolator ?? interpolator;
    this._from = 0; // Launcher3 mOriginalFromValue（out 终点）
    this._to = 1;   // Launcher3 mOriginalToValue（in 终点）
    this.direction = initialValue >= (this._from + this._to) / 2 ? DIRECTION.IN : DIRECTION.OUT;
    this.onStop = onStop;
    this.tv = new TimedValue({ durationMs: this._durationMs, interpolator, initialValue });
    this._endMark = undefined; // undefined=在飞未判定；null=settle 但非边界；'in'/'out'=已回调
  }

  /** 当前 progress（Launcher3 getAnimatedFraction 同义，0..1 值域）。 */
  get progress() {
    return this.tv.x;
  }

  /**
   * 瞬置 progress（Launcher3 cancel+setCurrentFraction 语义：冻结在任意值，
   * 不触发边界回调）。下一段 in()/out() 从该值接续。
   */
  setProgress(v) {
    const c = Math.min(Math.max(v, this._from), this._to);
    this.tv.x = c;
    this.tv.v = 0;
    this.tv.target = c;
    this.tv._idle = true;
    this._endMark = undefined;
    return c;
  }

  /** 向 1（展开/进入）接续播放。 */
  in() {
    return this._play(DIRECTION.IN);
  }

  /** 向 0（收起/退出）接续播放。 */
  out() {
    return this._play(DIRECTION.OUT);
  }

  _play(dir) {
    this.direction = dir;
    const target = dir === DIRECTION.IN ? this._to : this._from;
    // Launcher3 scaleDuration：时长 = 满程 × 剩余距离 / 满程距离（距离分数口径）；
    // 钳 MIN_SCALED_MS 防零程（x==target）空转。
    const span = Math.abs(this._to - this._from) || 1;
    const remain = Math.abs(target - this.tv.x);
    const fullMs = dir === DIRECTION.IN ? this._durationMs : this._outDurationMs;
    const scaled = remain >= span - 1e-9
      ? fullMs
      : Math.max(Math.round(fullMs * (remain / span)), Math.min(MIN_SCALED_MS, fullMs));
    // IIO scaleDuration 唯一口径：冻结在飞锚（值保留）——TimedValue 的 elapsedFrac
    // 时间分数接管不参与（否则双重缩放：距离比例 × 时间分数）。下帧 update 走
    // 全新满程锚定（from=当前值、dur=scaled），progress 接续语义不变。
    this.tv._idle = true;
    this.tv.v = 0;
    this.tv.reconfigure({ durationMs: scaled, interpolator: dir === DIRECTION.IN ? this._interpIn : this._interpOut });
    this.tv.target = target;
    this._endMark = undefined; // 新一段：边界回调重新武装
    return this;
  }

  /**
   * 帧推进（宿主 rAF 循环调用；dt 秒）。返回当前 progress。
   * settle 且到边界 → onStop 单次回调（本段内只触发一次）。
   */
  update(dt) {
    this.tv.update(dt);
    if (this._endMark === undefined && this.tv.isSettled()) {
      const x = this.tv.x;
      const boundary = (x >= this._to - 1e-6 && this.direction === DIRECTION.IN) ||
        (x <= this._from + 1e-6 && this.direction === DIRECTION.OUT)
        ? this.direction
        : null;
      this._endMark = boundary;
      if (boundary && typeof this.onStop === 'function') this.onStop(boundary, x);
    }
    return this.tv.x;
  }

  /** 冻结在当前值（Launcher3 cancel 语义：progress 保留，零跳变）。 */
  cancel() {
    this.setProgress(this.tv.x);
  }

  /** 在飞否（宿主编排判断用，与 TimedValue.isSettled 同签名；待播态不算 settled）。 */
  isSettled(posEps = 0.005) {
    return this.tv.isSettled(posEps) && Math.abs(this.tv.x - this.tv.target) < 1e-9;
  }
}

/** 具名短别名（消费面可读性；Launcher3 类名即本名）。 */
export { InterruptibleInOutAnimator as IIOAnimator };
