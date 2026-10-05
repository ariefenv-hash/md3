/**
 * ============================================================
 *  aosp-edgeeffect.js
 *  android.widget.EdgeEffect 的忠实 JS 移植（AOSP main 分支）
 *  ------------------------------------------------------------
 *  · TYPE_STRETCH（Android 12+ 默认）：onPull / onPullDistance /
 *    onRelease / onAbsorb + updateSpring() 欠阻尼弹簧解析解，
 *    接近终点时 LINEAR_VELOCITY_TAKE_OVER 线性接管 —— 全部逐行对应。
 *  · TYPE_GLOW：状态机（update()）同步移植；发光圆的绘制需要
 *    RecordingCanvas，JS 由宿主读取 mGlowAlpha/mGlowScaleY 自行渲染。
 *  · 与 AOSP 的差异仅在于：JS 没有 RecordingCanvas/RenderNode，
 *    draw() 负责推进动画并返回"是否继续绘制"，实际形变由宿主
 *    通过 getStretch() 读取后自行应用（如 CSS transform）。
 * ============================================================
 */
'use strict';

import { AnimationUtils } from './overscroller.js';

const EDGE_TYPE_NONE = -1;
const EDGE_TYPE_GLOW = 0;
const EDGE_TYPE_STRETCH = 1;

const STATE_IDLE = 0;
const STATE_PULL = 1;
const STATE_ABSORB = 2;
const STATE_RECEDE = 3;
const STATE_PULL_DECAY = 4;

const RECEDE_TIME = 600;
const PULL_TIME = 167;
const PULL_DECAY_TIME = 2000;

const MAX_ALPHA = 0.15;
const GLOW_ALPHA_START = .09;
const MAX_GLOW_SCALE = 2.0;
const PULL_GLOW_BEGIN = 0.0;

const MIN_VELOCITY = 100;
const MAX_VELOCITY = 10000;

const EPSILON = 0.001;
const ANGLE = Math.PI / 6;
const SIN = Math.sin(ANGLE);
const COS = Math.cos(ANGLE);
const RADIUS_FACTOR = 0.6;

const PULL_DISTANCE_ALPHA_GLOW_FACTOR = 0.8;
const VELOCITY_GLOW_FACTOR = 6;

/* ---- stretch 弹簧参数（AOSP 原注释保留） ---- */
/** 弹簧被认为静止的速度阈值：每秒 0.1 像素以下 */
const VELOCITY_THRESHOLD = 0.01;
/** 接近终点时开始线性插值的速度，弹簧速度指数衰减会在终点附近变得非常慢 */
const LINEAR_VELOCITY_TAKE_OVER = 200.0;
/** 弹簧被认为"足够接近终点"的位移阈值（约 0.01 像素） */
const VALUE_THRESHOLD = 0.001;
/** 开始线性接管的最大距离（像素） */
const LINEAR_DISTANCE_TAKE_OVER = 8.0;
/** 拉伸弹簧的自然频率 */
const NATURAL_FREQUENCY = 24.657;
/** 拉伸弹簧的阻尼比 */
const DAMPING_RATIO = 0.98;
/** 撞边吸收时对速度的增益：>1 会放大运动的吸收效果 */
const ON_ABSORB_VELOCITY_ADJUSTMENT = 13.0;

const LINEAR_STRETCH_INTENSITY = 0.016;
const EXP_STRETCH_INTENSITY = 0.016;
const SCROLL_DIST_AFFECTED_BY_EXP_STRETCH = 0.33;

/* android.view.animation.DecelerateInterpolator (factor=1) */
class DecelerateInterpolator {
    getInterpolation(input) {
        return 1.0 - (1.0 - input) * (1.0 - input);
    }
}

class EdgeEffect {
    /**
     * @param {number} edgeEffectType  EDGE_TYPE_GLOW | EDGE_TYPE_STRETCH
     */
    constructor(edgeEffectType = EDGE_TYPE_STRETCH) {
        this.mGlowAlpha = 0;
        this.mGlowScaleY = 0;
        /** 拉伸距离（占视图尺寸的比例，0..1） */
        this.mDistance = 0;
        /** 仅用于 stretch 动画 */
        this.mVelocity = 0;

        this.mGlowAlphaStart = 0;
        this.mGlowAlphaFinish = 0;
        this.mGlowScaleYStart = 0;
        this.mGlowScaleYFinish = 0;

        this.mStartTime = 0;
        this.mDuration = 0;

        this.mInterpolator = new DecelerateInterpolator();

        this.mState = STATE_IDLE;

        this.mPullDistance = 0;

        this.mBounds = { left: 0, top: 0, right: 0, bottom: 0 };
        this.mWidth = 0;
        this.mHeight = 0;
        this.mRadius = 0;
        this.mBaseGlowScale = 0;
        this.mDisplacement = 0.5;
        this.mTargetDisplacement = 0.5;

        this.mEdgeEffectType = edgeEffectType;
    }

    setSize(width, height) {
        const r = width * RADIUS_FACTOR / SIN;
        const y = COS * r;
        const h = r - y;
        const or = height * RADIUS_FACTOR / SIN;
        const oy = COS * or;
        const oh = or - oy;

        this.mRadius = r;
        this.mBaseGlowScale = h > 0 ? Math.min(oh / h, 1.0) : 1.0;

        this.mBounds.right = width;
        this.mBounds.bottom = Math.min(height, h);

        this.mWidth = width;
        this.mHeight = height;
    }

    isFinished() { return this.mState === STATE_IDLE; }

    finish() {
        this.mState = STATE_IDLE;
        this.mDistance = 0;
        this.mVelocity = 0;
    }

    onPull(deltaDistance) { this.onPull2(deltaDistance, 0.5); }

    onPull2(deltaDistance, displacement) {
        if (this.mEdgeEffectType === EDGE_TYPE_NONE) {
            this.finish();
            return;
        }
        const now = AnimationUtils.currentAnimationTimeMillis();
        this.mTargetDisplacement = displacement;
        if (this.mState === STATE_PULL_DECAY && now - this.mStartTime < this.mDuration
                && this.mEdgeEffectType === EDGE_TYPE_GLOW) {
            return;
        }
        if (this.mState !== STATE_PULL) {
            if (this.mEdgeEffectType === EDGE_TYPE_STRETCH) {
                // Restore the mPullDistance to the fraction it is currently
                // showing -- we want to "catch" the current stretch value.
                this.mPullDistance = this.mDistance;
            } else {
                this.mGlowScaleY = Math.max(PULL_GLOW_BEGIN, this.mGlowScaleY);
            }
        }
        this.mState = STATE_PULL;

        this.mStartTime = now;
        this.mDuration = PULL_TIME;

        this.mPullDistance += deltaDistance;
        if (this.mEdgeEffectType === EDGE_TYPE_STRETCH) {
            // Don't allow stretch beyond 1
            this.mPullDistance = Math.min(1.0, this.mPullDistance);
        }
        this.mDistance = Math.max(0.0, this.mPullDistance);
        this.mVelocity = 0;

        if (this.mPullDistance === 0) {
            this.mGlowScaleY = this.mGlowScaleYStart = 0;
            this.mGlowAlpha = this.mGlowAlphaStart = 0;
        } else {
            const absdd = Math.abs(deltaDistance);
            this.mGlowAlpha = this.mGlowAlphaStart = Math.min(MAX_ALPHA,
                    this.mGlowAlpha + absdd * PULL_DISTANCE_ALPHA_GLOW_FACTOR);

            const scale = Math.max(0, 1 - 1 /
                    Math.sqrt(Math.abs(this.mPullDistance) * this.mBounds.bottom) - 0.3) / 0.7;

            this.mGlowScaleY = this.mGlowScaleYStart = scale;
        }

        this.mGlowAlphaFinish = this.mGlowAlpha;
        this.mGlowScaleYFinish = this.mGlowScaleY;
        if (this.mEdgeEffectType === EDGE_TYPE_STRETCH && this.mDistance === 0) {
            this.mState = STATE_IDLE;
        }
    }

    /**
     * @returns 实际消耗的 deltaDistance（0..deltaDistance）
     */
    onPullDistance(deltaDistance, displacement) {
        if (this.mEdgeEffectType === EDGE_TYPE_NONE) {
            return 0.0;
        }
        const finalDistance = Math.max(0.0, deltaDistance + this.mDistance);
        const delta = finalDistance - this.mDistance;
        if (delta === 0.0 && this.mDistance === 0.0) {
            return 0.0;     // No pull, don't do anything.
        }

        if (this.mState !== STATE_PULL && this.mState !== STATE_PULL_DECAY
                && this.mEdgeEffectType === EDGE_TYPE_GLOW) {
            // Catch the edge glow in the middle of an animation.
            this.mPullDistance = this.mDistance;
            this.mState = STATE_PULL;
        }
        this.onPull2(delta, displacement);
        return delta;
    }

    /** 消除当前效果所需释放的拉动距离 */
    getDistance() { return this.mDistance; }

    onRelease() {
        this.mPullDistance = 0;

        if (this.mState !== STATE_PULL && this.mState !== STATE_PULL_DECAY) {
            return;
        }

        this.mState = STATE_RECEDE;
        this.mGlowAlphaStart = this.mGlowAlpha;
        this.mGlowScaleYStart = this.mGlowScaleY;

        this.mGlowAlphaFinish = 0.0;
        this.mGlowScaleYFinish = 0.0;
        this.mVelocity = 0.0;

        this.mStartTime = AnimationUtils.currentAnimationTimeMillis();
        this.mDuration = RECEDE_TIME;
    }

    /** @param {number} velocity 撞边速度，px/s */
    onAbsorb(velocity) {
        if (this.mEdgeEffectType === EDGE_TYPE_STRETCH) {
            this.mState = STATE_RECEDE;
            this.mVelocity = velocity * ON_ABSORB_VELOCITY_ADJUSTMENT;
            this.mStartTime = AnimationUtils.currentAnimationTimeMillis();
        } else if (this.mEdgeEffectType === EDGE_TYPE_GLOW) {
            this.mState = STATE_ABSORB;
            this.mVelocity = 0;
            velocity = Math.min(Math.max(MIN_VELOCITY, Math.abs(velocity)), MAX_VELOCITY);

            this.mStartTime = AnimationUtils.currentAnimationTimeMillis();
            this.mDuration = 0.15 + velocity * 0.02;

            this.mGlowAlphaStart = GLOW_ALPHA_START;
            this.mGlowScaleYStart = Math.max(this.mGlowScaleY, 0.0);

            this.mGlowScaleYFinish = Math.min(
                    0.025 + (velocity * (velocity / 100) * 0.00015) / 2, 1.0);
            this.mGlowAlphaFinish = Math.max(this.mGlowAlphaStart,
                    Math.min(velocity * VELOCITY_GLOW_FACTOR * 0.00001, MAX_ALPHA));
            this.mTargetDisplacement = 0.5;
        } else {
            this.finish();
        }
    }

    getMaxHeight() { return this.mHeight; }

    /* ---- glow 状态机（AOSP update() 逐行移植） ---- */
    update() {
        const time = AnimationUtils.currentAnimationTimeMillis();
        const t = Math.min((time - this.mStartTime) / this.mDuration, 1.0);

        const interp = this.mInterpolator.getInterpolation(t);

        this.mGlowAlpha = this.mGlowAlphaStart + (this.mGlowAlphaFinish - this.mGlowAlphaStart) * interp;
        this.mGlowScaleY = this.mGlowScaleYStart + (this.mGlowScaleYFinish - this.mGlowScaleYStart) * interp;
        if (this.mState !== STATE_PULL) {
            this.mDistance = this.calculateDistanceFromGlowValues(this.mGlowScaleY, this.mGlowAlpha);
        }
        this.mDisplacement = (this.mDisplacement + this.mTargetDisplacement) / 2;

        if (t >= 1.0 - EPSILON) {
            switch (this.mState) {
                case STATE_ABSORB:
                    this.mState = STATE_RECEDE;
                    this.mStartTime = AnimationUtils.currentAnimationTimeMillis();
                    this.mDuration = RECEDE_TIME;

                    this.mGlowAlphaStart = this.mGlowAlpha;
                    this.mGlowScaleYStart = this.mGlowScaleY;

                    this.mGlowAlphaFinish = 0.0;
                    this.mGlowScaleYFinish = 0.0;
                    break;
                case STATE_PULL:
                    this.mState = STATE_PULL_DECAY;
                    this.mStartTime = AnimationUtils.currentAnimationTimeMillis();
                    this.mDuration = PULL_DECAY_TIME;

                    this.mGlowAlphaStart = this.mGlowAlpha;
                    this.mGlowScaleYStart = this.mGlowScaleY;

                    this.mGlowAlphaFinish = 0.0;
                    this.mGlowScaleYFinish = 0.0;
                    break;
                case STATE_PULL_DECAY:
                    this.mState = STATE_RECEDE;
                    break;
                case STATE_RECEDE:
                    this.mState = STATE_IDLE;
                    break;
            }
        }
    }

    /* ---- stretch 弹簧（AOSP updateSpring() 逐行移植） ---- */
    updateSpring() {
        const time = AnimationUtils.currentAnimationTimeMillis();
        const deltaT = (time - this.mStartTime) / 1000.0;   // ms -> s
        if (deltaT < 0.001) {
            return;     // Must have at least 1 ms difference
        }
        this.mStartTime = time;

        if (Math.abs(this.mVelocity) <= LINEAR_VELOCITY_TAKE_OVER
                && Math.abs(this.mDistance * this.mHeight) < LINEAR_DISTANCE_TAKE_OVER
                && Math.sign(this.mVelocity) === -Math.sign(this.mDistance)) {
            // 已经很接近终点，弹簧会指数级减速，线性接管更快到达
            this.mVelocity = Math.sign(this.mVelocity) * LINEAR_VELOCITY_TAKE_OVER;

            const targetDistance = this.mDistance + (this.mVelocity * deltaT / this.mHeight);
            if (Math.sign(targetDistance) !== Math.sign(this.mDistance)) {
                // We have arrived
                this.mDistance = 0;
                this.mVelocity = 0;
            } else {
                this.mDistance = targetDistance;
            }
            return;
        }
        const mDampedFreq = NATURAL_FREQUENCY * Math.sqrt(1 - DAMPING_RATIO * DAMPING_RATIO);

        // 始终欠阻尼，直接使用解析解：
        const cosCoeff = this.mDistance * this.mHeight;
        const sinCoeff = (1 / mDampedFreq) * (DAMPING_RATIO * NATURAL_FREQUENCY
                * this.mDistance * this.mHeight + this.mVelocity);
        const distance = Math.exp(-DAMPING_RATIO * NATURAL_FREQUENCY * deltaT)
                * (cosCoeff * Math.cos(mDampedFreq * deltaT)
                + sinCoeff * Math.sin(mDampedFreq * deltaT));
        const velocity = distance * (-NATURAL_FREQUENCY) * DAMPING_RATIO
                + Math.exp(-DAMPING_RATIO * NATURAL_FREQUENCY * deltaT)
                * (-mDampedFreq * cosCoeff * Math.sin(mDampedFreq * deltaT)
                + mDampedFreq * sinCoeff * Math.cos(mDampedFreq * deltaT));
        this.mDistance = distance / this.mHeight;
        this.mVelocity = velocity;
        if (this.mDistance > 1) {
            this.mDistance = 1;
            this.mVelocity = 0;
        }
        if (this.isAtEquilibrium()) {
            this.mDistance = 0;
            this.mVelocity = 0;
        }
    }

    /** 由 mGlowScaleY 估算的 pull 距离（AOSP calculateDistanceFromGlowValues） */
    calculateDistanceFromGlowValues(scale, alpha) {
        if (scale >= 1.0) {
            return 1.0;
        }
        if (scale > 0.0) {
            const v = 1.0 / 0.7 / (this.mGlowScaleY - 1.0);
            return v * v / this.mBounds.bottom;
        }
        return alpha / PULL_DISTANCE_ALPHA_GLOW_FACTOR;
    }

    isAtEquilibrium() {
        const displacement = this.mDistance * this.mHeight;     // 像素
        const velocity = this.mVelocity;
        // 位移不允许 <0（不向反方向拉伸），且足够接近终点即停止
        return displacement < 0 || (Math.abs(velocity) < VELOCITY_THRESHOLD
                && displacement < VALUE_THRESHOLD);
    }

    /**
     * 对应 AOSP draw() 中 RenderNode.stretch 的强度计算（vecY）。
     * 垂直滚动时 vecX 恒为 0（拖点 x 坐标前后相同）。
     */
    getStretch() {
        return EdgeEffect.dampStretchVector(
                Math.max(-1.0, Math.min(1.0, this.mDistance)));
    }

    /**
     * 对应 AOSP draw(Canvas)：
     *  - stretch：RECEDE 时推进弹簧；返回是否继续绘制
     *  - glow：推进 glow 状态机
     * JS 无 RecordingCanvas，实际形变由宿主按 getStretch() 应用。
     */
    draw() {
        if (this.mEdgeEffectType === EDGE_TYPE_GLOW) {
            this.update();
        } else if (this.mEdgeEffectType === EDGE_TYPE_STRETCH) {
            if (this.mState === STATE_RECEDE) {
                this.updateSpring();
            }
        } else {
            this.mState = STATE_IDLE;
            this.mDistance = 0;
            this.mVelocity = 0;
        }

        let oneLastFrame = false;
        if (this.mState === STATE_RECEDE && this.mDistance === 0 && this.mVelocity === 0) {
            this.mState = STATE_IDLE;
            oneLastFrame = true;
        }

        return this.mState !== STATE_IDLE || oneLastFrame;
    }

    /** AOSP dampStretchVector() 逐行移植 */
    static dampStretchVector(normalizedVec) {
        const sign = normalizedVec > 0 ? 1.0 : -1.0;
        const overscroll = Math.abs(normalizedVec);
        const linearIntensity = LINEAR_STRETCH_INTENSITY * overscroll;
        const scalar = Math.E / SCROLL_DIST_AFFECTED_BY_EXP_STRETCH;
        const expIntensity = EXP_STRETCH_INTENSITY * (1 - Math.exp(-overscroll * scalar));
        return sign * (linearIntensity + expIntensity);
    }
}


export { EdgeEffect };
export {
  EDGE_TYPE_NONE, EDGE_TYPE_GLOW, EDGE_TYPE_STRETCH,
  STATE_IDLE, STATE_PULL, STATE_ABSORB, STATE_RECEDE, STATE_PULL_DECAY,
};
