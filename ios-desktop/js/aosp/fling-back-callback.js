// ==================== aosp/fling-back-callback.js — 预测性返回四期：fling 滑行（#146 四期） ====================
//
// 权威源（aosp-mirror/platform_frameworks_base @ main 实拉）：
//   - SystemUI/animation/back/FlingOnBackAnimationCallback.kt（168 行全文，快照
//     docs/reference/frameworks-base/SystemUI/animation/back/）——OnBackAnimationCallback
//     包装器：拖拽期 progress 插值喂 VelocityTracker；松手 commit 起摩擦滑行动画
//     （FlingAnimation，friction=6），动画每帧把 progress/100 继续发 onBackProgressedCompat，
//     结束才 onBackInvokedCompat——「松手后容器变换继续跟手式滑行」语义来源。
//   - core/java/com/android/internal/dynamicanimation/animation/FlingAnimation.java（204 行，
//     快照 docs/reference/frameworks-base/dynamic-animation/）——DragForce 内部类：
//       DEFAULT_FRICTION = -4.2f；setFrictionScalar(s) → mFriction = s × -4.2
//       updateValueAndVelocity 闭式指数解：
//         v' = v · exp((Δt/1000) · mFriction)
//         x' = x − v/mFriction + (v/mFriction) · exp(mFriction · Δt/1000)
//       getAcceleration = v · mFriction；isAtEquilibrium = |v| < mVelocityThreshold；
//       setValueThreshold(t) → mVelocityThreshold = t × (1000/16)
//     FlingAnimation.updateValueAndVelocity：min/max 越界即 clamp 并结束；
//     isAtEquilibrium：value ≥ max || value ≤ min || DragForce 判定。
//   - core/java/com/android/internal/dynamicanimation/animation/DynamicAnimation.java（快照同目录）：
//     doAnimationFrame 首帧语义（mLastFrameTime==0 → 只记录时间+应用当前值，不积分，return false）；
//     MIN_VISIBLE_CHANGE_PIXELS = 1f（FloatValueHolder 构造路径默认值阈值）；
//     start() 起始值域 sanity（越界 throw）；endAnimationInternal 派发 end listeners。
//
// Web 映射纪律（逐字同构 + 三处诚实标注）：
//   ① Choreographer → requestAnimationFrame 循环，frameTime = performance.now()（毫秒域，
//      Choreographer.lastFrameTimeNanos/1e6 同构；kt L146 手动首帧传值同源）。
//   ② ValueAnimator.getDurationScale → Web 无动画时长缩放系统，恒 1（DynamicAnimation
//      L682-683 durationScale==0 → deltaT=MAX 的「关闭动画」路径无对应物，标注在录）。
//   ③ android.view.VelocityTracker（framework native LSQ 估计，frameworks/base 仓库外）
//      → 注入式 velocityTracker（{ addMovement(eventTime, x), computeCurrentVelocity(units),
//      getXVelocity(), clear() }）；md3 生产端复用 ProgressVelocityTracker（wm.shell/back/
//      ProgressVelocityTracker.kt 已移植 v9.22，back-pill.js 导出）——喂点 x = 插值后
//      progress × SCALE_FACTOR(100)（kt L104 逐字），computeCurrentVelocity(1000) 输出
//      (progress×100)/s 域，与 FlingAnimation 的 startValue/startVelocity 同域（×100 缩放域）。
//      ProgressVelocityTracker 的滑窗 Δ/Δt 是 #191 已录的 Web 同构裁决（VelocityTracker
//      horizon ~100ms 同量级），本文件不重复实现。
//
// md3 接线裁决（gestures.js 根页面 commit，在录）：
//   - progressInterpolator 接线传 LINEAR（恒等）——BACK_GESTURE 插值已由 v9.21 裁决在
//     BackAnimationSpec easing 层承载（backSpec 内部 BACK_GESTURE easing），fling 回调层
//     再插值会双重插值破坏「pill 与容器变换严格同相位」。AOSP 默认 BACK_GESTURE 在类
//     默认参数保留同构（本文件 BACK_GESTURE 默认值），插值职责分工差异为管线形态差异，
//     语义锚 kt L46（defaults to Interpolators.BACK_GESTURE）。
//   - predictiveBackTimestampApi() flag → 构造参数 predictiveBackTimestampApi（默认 true）：
//     Web 侧事件恒带时间戳（performance.now()），对应 flag 开启路径；flag 关闭路径
//     （无 frameTimeMillis 的 BackEvent）在类内保留同构分支（kt L89/L97/L118/L131/L149）。
//   - BackEvent 同构：{ touchX, touchY, progress, swipeEdge, frameTimeMillis? }。

import { BACK_GESTURE, LINEAR } from './back-animation.js';

/** FLING_FRICTION（FlingOnBackAnimationCallback.kt L33 逐字） */
export const FLING_FRICTION = 6;
/** SCALE_FACTOR（kt L34 逐字）：progress 与 VelocityTracker/FlingAnimation 的缩放桥 */
export const SCALE_FACTOR = 100;

/** MIN_VISIBLE_CHANGE_PIXELS（DynamicAnimation.java L272 逐字；FloatValueHolder 默认值阈值） */
export const MIN_VISIBLE_CHANGE_PIXELS = 1;

/**
 * DragForce（FlingAnimation.java L165-201 逐字移植）。
 * 摩擦模型：dv/dt = mFriction · v（mFriction 恒负，标量 × DEFAULT_FRICTION=-4.2）。
 */
export class DragForce {
  constructor() {
    this.DEFAULT_FRICTION = -4.2; // L166 逐字
    this.VELOCITY_THRESHOLD_MULTIPLIER = 1000 / 16; // L170 逐字（≈62.5）
    this.mFriction = this.DEFAULT_FRICTION;
    this.mVelocityThreshold = 0;
  }

  /** setFrictionScalar（L175-177 逐字） */
  setFrictionScalar(frictionScalar) {
    this.mFriction = frictionScalar * this.DEFAULT_FRICTION;
  }

  /** getFrictionScalar（L178-180 逐字） */
  getFrictionScalar() {
    return this.mFriction / this.DEFAULT_FRICTION;
  }

  /**
   * updateValueAndVelocity（L181-189 逐字）：闭式指数解。
   * isAtEquilibrium 命中 → 速度置 0（源码同款）。
   * @returns {{mValue: number, mVelocity: number}} MassState 同构
   */
  updateValueAndVelocity(value, velocity, deltaT) {
    const mVelocity = velocity * Math.exp((deltaT / 1000.0) * this.mFriction);
    const mValue = value - velocity / this.mFriction
      + (velocity / this.mFriction) * Math.exp(this.mFriction * deltaT / 1000.0);
    if (this.isAtEquilibrium(mValue, mVelocity)) {
      return { mValue, mVelocity: 0 };
    }
    return { mValue, mVelocity };
  }

  /** getAcceleration（L191-193 逐字） */
  getAcceleration(position, velocity) {
    return velocity * this.mFriction;
  }

  /** isAtEquilibrium（L195-197 逐字） */
  isAtEquilibrium(value, velocity) {
    return Math.abs(velocity) < this.mVelocityThreshold;
  }

  /** setValueThreshold（L198-200 逐字） */
  setValueThreshold(threshold) {
    this.mVelocityThreshold = threshold * this.VELOCITY_THRESHOLD_MULTIPLIER;
  }
}

/**
 * FlingAnimation（FlingAnimation.java + DynamicAnimation.java 帧骨架逐字移植）。
 * Web 驱动：start() 起 requestAnimationFrame 循环（AnimationHandler 对应物），
 * 每帧 doAnimationFrame(performance.now())。durationScale 恒 1（Web 无对应物，见头部②）。
 */
export class FlingAnimation {
  /**
   * @param {object} [opts]
   * @param {(frameTime: number) => void} [opts.scheduleFrame] 帧调度注入（默认 rAF；
   *        测试可注入同步驱动）
   */
  constructor(opts = {}) {
    this.mFlingForce = new DragForce();
    this.mFlingForce.setValueThreshold(MIN_VISIBLE_CHANGE_PIXELS); // 构造器 L55 逐字
    this.mStartValueIsSet = false;
    this.mValue = 0;
    this.mMinValue = Number.NEGATIVE_INFINITY;
    this.mMaxValue = Number.POSITIVE_INFINITY;
    this.mVelocity = 0; // DynamicAnimation.java L296 逐字
    this.mRunning = false;
    this.mLastFrameTime = 0;
    this.mUpdateListeners = [];
    this.mEndListeners = [];
    this.mScheduleFrame = opts.scheduleFrame || null;
    this._rafId = 0;
    this._frameCb = this._onFrame.bind(this);
  }

  /** setStartValue（DynamicAnimation L568-574 语义：置值并标记 mStartValueIsSet） */
  setStartValue(value) {
    this.mValue = value;
    this.mStartValueIsSet = true;
    return this;
  }

  /** setStartVelocity（DynamicAnimation.java L412-416 逐字：直接置 mVelocity——速度状态单一真源） */
  setStartVelocity(startVelocity) {
    this.mVelocity = startVelocity;
    return this;
  }

  /** setFriction（L65-72 逐字：非正 throw） */
  setFriction(friction) {
    if (friction <= 0) {
      throw new Error('Friction must be positive');
    }
    this.mFlingForce.setFrictionScalar(friction);
    return this;
  }

  /** setMinValue（L90-93） */
  setMinValue(minValue) {
    this.mMinValue = minValue;
    return this;
  }

  /** setMaxValue（L102-105） */
  setMaxValue(maxValue) {
    this.mMaxValue = maxValue;
    return this;
  }

  addUpdateListener(fn) { this.mUpdateListeners.push(fn); return this; }
  removeUpdateListener(fn) {
    const i = this.mUpdateListeners.indexOf(fn);
    if (i >= 0) this.mUpdateListeners.splice(i, 1);
    return this;
  }
  addEndListener(fn) { this.mEndListeners.push(fn); return this; }
  removeEndListener(fn) {
    const i = this.mEndListeners.indexOf(fn);
    if (i >= 0) this.mEndListeners.splice(i, 1);
    return this;
  }

  isRunning() { return this.mRunning; }

  /** start（DynamicAnimation.java L599-607 逐字语义：running 守卫 + 起始值域 sanity throw） */
  start() {
    if (!this.mRunning) {
      this.mRunning = true;
      // L644-652 sanity check 逐字：起始值越界 throw
      if (this.mValue > this.mMaxValue || this.mValue < this.mMinValue) {
        throw new Error('Starting value need to be in between min value and max value');
      }
      this.mLastFrameTime = 0; // endAnimationInternal L716 复位语义对齐
      this._schedule();
    }
  }

  /** cancel（L626-630：running 才 end(true)） */
  cancel() {
    if (this.mRunning) {
      this.endAnimationInternal(true);
    }
  }

  _schedule() {
    if (this.mScheduleFrame) {
      this.mScheduleFrame(this._frameCb);
    } else if (typeof requestAnimationFrame === 'function') {
      this._rafId = requestAnimationFrame(this._frameCb);
    }
  }

  _onFrame(frameTime) {
    if (!this.mRunning) return;
    this.doAnimationFrame(frameTime != null ? frameTime : performance.now());
    if (this.mRunning) this._schedule();
  }

  /**
   * doAnimationFrame（DynamicAnimation.java L671-691 逐字）：
   * 首帧（mLastFrameTime==0）只记录时间+应用当前值，不积分，return false；
   * 后续帧 deltaT 积分 → clamp → 派发 update → finished 则 end(false)。
   */
  doAnimationFrame(frameTime) {
    if (this.mLastFrameTime === 0) {
      // First frame.（L672-676 逐字）
      this.mLastFrameTime = frameTime;
      this._setPropertyValue(this.mValue);
      return false;
    }
    const deltaT = frameTime - this.mLastFrameTime; // L678-679
    this.mLastFrameTime = frameTime;
    // durationScale：Web 恒 1（ValueAnimator.getDurationScale 无对应物，头部②）
    const finished = this.updateValueAndVelocity(deltaT);
    // Clamp value & velocity.（L687-688 逐字）
    this.mValue = Math.min(this.mValue, this.mMaxValue);
    this.mValue = Math.max(this.mValue, this.mMinValue);
    this._setPropertyValue(this.mValue);
    if (finished) {
      this.endAnimationInternal(false);
    }
    return finished;
  }

  /** 手动帧推进（kt L145-147 手动 doAnimationFrame 防_idle_frame 对应入口；同步测试用） */
  doAnimationFrameSync(frameTime) {
    return this.doAnimationFrame(frameTime);
  }

  /**
   * updateValueAndVelocity（FlingAnimation.java L133-150 逐字）：
   * DragForce 求值 → <min clamp 并结束 / >max clamp 并结束 / isAtEquilibrium 结束。
   */
  updateValueAndVelocity(deltaT) {
    const state = this.mFlingForce.updateValueAndVelocity(this.mValue, this.mVelocity, deltaT);
    this.mValue = state.mValue;
    this.mVelocity = state.mVelocity;
    // When the animation hits the max/min value, consider animation done.（L137 逐字）
    if (this.mValue < this.mMinValue) {
      this.mValue = this.mMinValue;
      return true;
    }
    if (this.mValue > this.mMaxValue) {
      this.mValue = this.mMaxValue;
      return true;
    }
    if (this.isAtEquilibrium(this.mValue, this.mVelocity)) {
      return true;
    }
    return false;
  }

  /** isAtEquilibrium（L156-160 逐字） */
  isAtEquilibrium(value, velocity) {
    return value >= this.mMaxValue
      || value <= this.mMinValue
      || this.mFlingForce.isAtEquilibrium(value, velocity);
  }

  _setPropertyValue(value) {
    for (const fn of this.mUpdateListeners) fn(this, value, this.mVelocity);
  }

  /** endAnimationInternal（DynamicAnimation.java L695-703 逐字语义） */
  endAnimationInternal(canceled) {
    this.mRunning = false;
    this.mLastFrameTime = 0;
    this.mStartValueIsSet = false;
    if (typeof cancelAnimationFrame === 'function' && this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
    const listeners = this.mEndListeners.slice();
    for (const fn of listeners) fn(this, canceled, this.mValue, this.mVelocity);
  }
}

/**
 * FlingOnBackAnimationCallback（FlingOnBackAnimationCallback.kt 168 行逐字移植）。
 *
 * AOSP 为 abstract class（四 Compat 抽象方法）→ JS 构造参数注入四 compat 回调同构：
 * @param {object} o
 * @param {(backEvent: object) => void} o.onBackStartedCompat
 * @param {(backEvent: object) => void} o.onBackProgressedCompat
 * @param {() => void} o.onBackInvokedCompat
 * @param {() => void} o.onBackCancelledCompat
 * @param {(x: number) => number} [o.progressInterpolator=BACK_GESTURE]（kt L46 默认；
 *        md3 接线传 LINEAR 防双插值——见头部接线裁决）
 * @param {object} [o.velocityTracker] 注入 { addMovement(eventTime, x), computeCurrentVelocity(units),
 *        getXVelocity(), clear() }（android.view.VelocityTracker 对应物，头部③）
 * @param {boolean} [o.predictiveBackTimestampApi=true] flag 同构（Web 事件恒带时间戳）
 */
export class FlingOnBackAnimationCallback {
  constructor(o) {
    this.progressInterpolator = o.progressInterpolator || BACK_GESTURE; // kt L46 默认
    this.velocityTracker = o.velocityTracker || null;
    this.predictiveBackTimestampApi = o.predictiveBackTimestampApi !== false;
    this.onBackStartedCompat = o.onBackStartedCompat;
    this.onBackProgressedCompat = o.onBackProgressedCompat;
    this.onBackInvokedCompat = o.onBackInvokedCompat;
    this.onBackCancelledCompat = o.onBackCancelledCompat;

    this.lastBackEvent = null;      // L50
    this.downTime = null;           // L51
    this.backInvokedFlingAnim = null; // L53
    this._flingUpdate = this._flingUpdate.bind(this);   // L54-67
    this._flingEnd = this._flingEnd.bind(this);         // L68-72
    // listener 引用（reset L162-163 removeUpdateListener/removeEndListener 摘除所需）
    this._flingUpdateRef = (anim, value) => this._flingUpdate(anim, value);
    this._flingEndRef = () => this._flingEnd();
  }

  /** backInvokedFlingUpdateListener（L54-67 逐字）：progress/100 继续发 onBackProgressedCompat */
  _flingUpdate(_anim, progress) {
    const it = this.lastBackEvent;
    if (it) {
      const backEvent = {
        touchX: it.touchX,
        touchY: it.touchY,
        progress: progress / SCALE_FACTOR,
        swipeEdge: it.swipeEdge,
        frameTimeMillis: it.frameTimeMillis,
      };
      this.onBackProgressedCompat(backEvent);
    }
  }

  /** backInvokedFlingEndListener（L68-72 逐字）：invoke 后 reset */
  _flingEnd() {
    this.onBackInvokedCompat();
    this.reset();
  }

  /** onBackStarted（L82-93 final 逐字）：fling 活着 → 兜底 invoke（L83-87 注释语义）；reset；记录 downTime */
  onBackStarted(backEvent) {
    if (this.backInvokedFlingAnim != null) {
      // This should never happen but let's call onBackInvokedCompat() just in case there is
      // still a fling animation in progress（L84-86 注释逐字）
      this.onBackInvokedCompat();
    }
    this.reset();
    if (this.predictiveBackTimestampApi) {
      this.downTime = backEvent.frameTimeMillis; // L90
    }
    this.onBackStartedCompat(backEvent);
  }

  /** onBackProgressed（L95-128 final 逐字）：插值 → 喂 tracker（×100）→ lastBackEvent → compat */
  onBackProgressed(backEvent) {
    const interpolatedProgress = this.progressInterpolator(backEvent.progress); // L96
    if (this.predictiveBackTimestampApi) {
      if (this.downTime != null && this.velocityTracker) { // L98（downTime?.let 同构）
        this.velocityTracker.addMovement( // L99-109（MotionEvent.obtain 同构签名收敛）：
          //   downTime=this.downTime, eventTime=backEvent.frameTimeMillis, ACTION_MOVE,
          //   x=interpolatedProgress*SCALE_FACTOR, y=0
          this.downTime,
          backEvent.frameTimeMillis,
          interpolatedProgress * SCALE_FACTOR,
          0,
        );
      }
      this.lastBackEvent = { // L110-117
        touchX: backEvent.touchX,
        touchY: backEvent.touchY,
        progress: interpolatedProgress,
        swipeEdge: backEvent.swipeEdge,
        frameTimeMillis: backEvent.frameTimeMillis,
      };
    } else {
      this.lastBackEvent = { // L119-125（无时间戳路径）
        touchX: backEvent.touchX,
        touchY: backEvent.touchY,
        progress: interpolatedProgress,
        swipeEdge: backEvent.swipeEdge,
      };
    }
    if (this.lastBackEvent) this.onBackProgressedCompat(this.lastBackEvent); // L127
  }

  /** onBackInvoked（L130-153 final 逐字）：fling 动画接管 / 直调 compat */
  onBackInvoked() {
    if (this.predictiveBackTimestampApi && this.lastBackEvent != null) {
      if (this.velocityTracker) this.velocityTracker.computeCurrentVelocity(1000); // L132
      const xVelocity = this.velocityTracker ? this.velocityTracker.getXVelocity() : 0;
      this.backInvokedFlingAnim = new FlingAnimation() // L133-148 逐字链
        .setStartValue((this.lastBackEvent ? this.lastBackEvent.progress : 0) * SCALE_FACTOR)
        .setFriction(FLING_FRICTION)
        .setStartVelocity(xVelocity)
        .setMinValue(0)
        .setMaxValue(SCALE_FACTOR);
      this.backInvokedFlingAnim.addUpdateListener(this._flingUpdateRef); // L140 逐字
      this.backInvokedFlingAnim.addEndListener(this._flingEndRef); // L141 逐字
      this.backInvokedFlingAnim.start();
      // do an animation-frame immediately to prevent idle frame（L144 注释逐字）；
      // Choreographer.lastFrameTimeNanos/1e6 → performance.now()（毫秒域同构）
      this.backInvokedFlingAnim.doAnimationFrameSync(performance.now());
    } else {
      this.onBackInvokedCompat(); // L150
      this.reset();               // L151
    }
  }

  /** onBackCancelled（L155-158 final 逐字） */
  onBackCancelled() {
    this.onBackCancelledCompat();
    this.reset();
  }

  /** reset（L160-167 逐字）：clear tracker + 摘两 listener + 三态置 null */
  reset() {
    if (this.velocityTracker) this.velocityTracker.clear(); // L161
    // L162-163 逐字：摘两 listener —— 动画若仍在跑，帧回调与结束回调均不再触发
    // （kt 语义：旧实例仅剩裸磨擦衰减无消费端；Web 侧 rAF 循环随之自然终止）
    if (this.backInvokedFlingAnim) {
      this.backInvokedFlingAnim.removeUpdateListener(this._flingUpdateRef);
      this.backInvokedFlingAnim.removeEndListener(this._flingEndRef);
    }
    this.lastBackEvent = null;        // L164
    this.backInvokedFlingAnim = null; // L165
    this.downTime = null;             // L166
  }
}

/** LINEAR 再导出（gestures.js 接线裁决用，防双插值——见头部接线裁决） */
export { LINEAR };
