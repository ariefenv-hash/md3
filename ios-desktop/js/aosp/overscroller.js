
/**
 * ============================================================
 *  aosp-overscroller.js
 *  android.widget.OverScroller 的忠实 JS 移植（AOSP main 分支）
 *  ------------------------------------------------------------
 *  与 Java 版逐行对应，仅替换平台依赖：
 *    AnimationUtils.currentAnimationTimeMillis() -> performance.now()
 *    ViewConfiguration.getScrollFriction()       -> 常量 0.015
 *    SensorManager.GRAVITY_EARTH                 -> 常量 9.80665
 *    Context.getResources().getDisplayMetrics().density
 *                                                -> 构造函数参数 density
 *    float（32 位）                               -> number（64 位，精度更高）
 *  所有 public API 名称、m 字段名、常量值与 AOSP 保持一致。
 * ============================================================
 */
'use strict';

/* ---- 平台依赖的最小替身 ------------------------------------ */

const AnimationUtils = {
    currentAnimationTimeMillis() { return performance.now(); }
};

const ViewConfiguration = {
    getScrollFriction() { return 0.015; }   // android/view/ViewConfiguration.java
};

const SensorManager = {
    GRAVITY_EARTH: 9.80665                  // android/hardware/SensorManager.java
};

/* ---- android.widget.Scroller.ViscousFluidInterpolator -------- */

class ViscousFluidInterpolator {
    constructor() {
        this.mViscousFluidNormalize =
            1.0 / ViscousFluidInterpolator.viscousFluid(1.0);
    }
    static viscousFluid(x) {
        x *= 8.0;   // VISCOUS_FLUID_SCALE
        if (x < 1.0) {
            x -= (1.0 - Math.exp(-x));
        } else {
            const start = 0.36787944117;    // 1/e == exp(-1)
            x = 1.0 - Math.exp(1.0 - x);
            x = start + x * (1.0 - start);
        }
        return x;
    }
    getInterpolation(input) {
        const interpolated =
            this.mViscousFluidNormalize * ViscousFluidInterpolator.viscousFluid(input);
        return interpolated > 0 ? interpolated : 0;
    }
}

/* ---- android.widget.OverScroller ------------------------------ */

const DEFAULT_DURATION = 250;
const SCROLL_MODE = 0;
const FLING_MODE = 1;

class OverScroller {
    /**
     * @param {number} density  DisplayMetrics.density（如 2.0 表示 2x 屏）
     * @param {object|null} interpolator  需实现 getInterpolation(input)
     * @param {boolean} flywheel
     */
    constructor(density = 1.0, interpolator = null, flywheel = true) {
        this.mMode = SCROLL_MODE;
        this.mInterpolator = interpolator || new ViscousFluidInterpolator();
        this.mFlywheel = flywheel;
        this.mScrollerX = new SplineOverScroller(density);
        this.mScrollerY = new SplineOverScroller(density);
    }

    setFriction(friction) {
        this.mScrollerX.setFriction(friction);
        this.mScrollerY.setFriction(friction);
    }

    isFinished() {
        return this.mScrollerX.mFinished && this.mScrollerY.mFinished;
    }

    forceFinished(finished) {
        this.mScrollerX.mFinished = this.mScrollerY.mFinished = finished;
    }

    getCurrX() { return this.mScrollerX.mCurrentPosition; }
    getCurrY() { return this.mScrollerY.mCurrentPosition; }

    getCurrVelocity() {
        return Math.hypot(this.mScrollerX.mCurrVelocity, this.mScrollerY.mCurrVelocity);
    }

    getStartX() { return this.mScrollerX.mStart; }
    getStartY() { return this.mScrollerY.mStart; }
    getFinalX() { return this.mScrollerX.mFinal; }
    getFinalY() { return this.mScrollerY.mFinal; }
    getDuration() { return Math.max(this.mScrollerX.mDuration, this.mScrollerY.mDuration); }

    extendDuration(extend) {
        this.mScrollerX.extendDuration(extend);
        this.mScrollerY.extendDuration(extend);
    }

    setFinalX(newX) { this.mScrollerX.setFinalPosition(newX); }
    setFinalY(newY) { this.mScrollerY.setFinalPosition(newY); }

    computeScrollOffset() {
        if (this.isFinished()) {
            return false;
        }

        switch (this.mMode) {
            case SCROLL_MODE: {
                const time = AnimationUtils.currentAnimationTimeMillis();
                // Any scroller can be used for time, since they were started
                // together in scroll mode. We use X here.
                const elapsedTime = time - this.mScrollerX.mStartTime;

                const duration = this.mScrollerX.mDuration;
                if (elapsedTime < duration) {
                    const q = this.mInterpolator.getInterpolation(elapsedTime / duration);
                    const q2 = this.mInterpolator.getInterpolation((elapsedTime - 1) / duration);
                    this.mScrollerX.updateScroll(q, q2);
                    this.mScrollerY.updateScroll(q, q2);
                } else {
                    this.abortAnimation();
                }
                break;
            }

            case FLING_MODE:
                if (!this.mScrollerX.mFinished) {
                    if (!this.mScrollerX.update()) {
                        if (!this.mScrollerX.continueWhenFinished()) {
                            this.mScrollerX.finish();
                        }
                    }
                }

                if (!this.mScrollerY.mFinished) {
                    if (!this.mScrollerY.update()) {
                        if (!this.mScrollerY.continueWhenFinished()) {
                            this.mScrollerY.finish();
                        }
                    }
                }
                break;
        }

        return true;
    }

    startScroll(startX, startY, dx, dy) {
        this.startScroll(startX, startY, dx, dy, DEFAULT_DURATION);
    }

    startScroll(startX, startY, dx, dy, duration) {
        this.mMode = SCROLL_MODE;
        this.mScrollerX.startScroll(startX, dx, duration);
        this.mScrollerY.startScroll(startY, dy, duration);
    }

    springBack(startX, startY, minX, maxX, minY, maxY) {
        this.mMode = FLING_MODE;

        // Make sure both methods are called.
        const spingbackX = this.mScrollerX.springback(startX, minX, maxX);
        const spingbackY = this.mScrollerY.springback(startY, minY, maxY);
        return spingbackX || spingbackY;
    }

    fling(startX, startY, velocityX, velocityY, minX, maxX, minY, maxY) {
        this.fling(startX, startY, velocityX, velocityY, minX, maxX, minY, maxY, 0, 0);
    }

    fling(startX, startY, velocityX, velocityY, minX, maxX, minY, maxY, overX, overY) {
        // Continue a scroll or fling in progress
        if (this.mFlywheel && !this.isFinished()) {
            const oldVelocityX = this.mScrollerX.mCurrVelocity;
            const oldVelocityY = this.mScrollerY.mCurrVelocity;
            if (Math.sign(velocityX) === Math.sign(oldVelocityX) &&
                Math.sign(velocityY) === Math.sign(oldVelocityY)) {
                velocityX += oldVelocityX;
                velocityY += oldVelocityY;
            }
        }

        this.mMode = FLING_MODE;
        this.mScrollerX.fling(startX, velocityX, minX, maxX, overX);
        this.mScrollerY.fling(startY, velocityY, minY, maxY, overY);
    }

    notifyHorizontalEdgeReached(startX, finalX, overX) {
        this.mScrollerX.notifyEdgeReached(startX, finalX, overX);
    }

    notifyVerticalEdgeReached(startY, finalY, overY) {
        this.mScrollerY.notifyEdgeReached(startY, finalY, overY);
    }

    isOverScrolled() {
        return ((!this.mScrollerX.mFinished &&
                    this.mScrollerX.mState !== SplineOverScroller.SPLINE) ||
                (!this.mScrollerY.mFinished &&
                    this.mScrollerY.mState !== SplineOverScroller.SPLINE));
    }

    abortAnimation() {
        this.mScrollerX.finish();
        this.mScrollerY.finish();
    }

    timePassed() {
        const time = AnimationUtils.currentAnimationTimeMillis();
        const startTime = Math.min(this.mScrollerX.mStartTime, this.mScrollerY.mStartTime);
        return time - startTime;
    }

    isScrollingInDirection(xvel, yvel) {
        const dx = this.mScrollerX.mFinal - this.mScrollerX.mStart;
        const dy = this.mScrollerY.mFinal - this.mScrollerY.mStart;
        return !this.isFinished() && Math.sign(xvel) === Math.sign(dx) &&
                Math.sign(yvel) === Math.sign(dy);
    }

    getSplineFlingDistance(velocity) {
        return this.mScrollerY.getSplineFlingDistance(velocity);
    }
}

/* ---- android.widget.OverScroller$SplineOverScroller ----------- */

const GRAVITY = 2000.0;

const DECELERATION_RATE = Math.log(0.78) / Math.log(0.9);
const INFLEXION = 0.35;                 // Tension lines cross at (INFLEXION, 1)
const START_TENSION = 0.5;
const END_TENSION = 1.0;
const P1 = START_TENSION * INFLEXION;
const P2 = 1.0 - END_TENSION * (1.0 - INFLEXION);

const NB_SAMPLES = 100;
const SPLINE_POSITION = new Array(NB_SAMPLES + 1);
const SPLINE_TIME = new Array(NB_SAMPLES + 1);

/* static 初始化块：样条表二分拟合，与 AOSP 完全一致 */
{
    let x_min = 0.0;
    let y_min = 0.0;
    for (let i = 0; i < NB_SAMPLES; i++) {
        const alpha = i / NB_SAMPLES;

        let x_max = 1.0;
        let x, tx, coef;
        for (;;) {
            x = x_min + (x_max - x_min) / 2.0;
            coef = 3.0 * x * (1.0 - x);
            tx = coef * ((1.0 - x) * P1 + x * P2) + x * x * x;
            if (Math.abs(tx - alpha) < 1E-5) break;
            if (tx > alpha) x_max = x; else x_min = x;
        }
        SPLINE_POSITION[i] = coef * ((1.0 - x) * START_TENSION + x) + x * x * x;

        let y_max = 1.0;
        let y, dy;
        for (;;) {
            y = y_min + (y_max - y_min) / 2.0;
            coef = 3.0 * y * (1.0 - y);
            dy = coef * ((1.0 - y) * START_TENSION + y) + y * y * y;
            if (Math.abs(dy - alpha) < 1E-5) break;
            if (dy > alpha) y_max = y; else y_min = y;
        }
        SPLINE_TIME[i] = coef * ((1.0 - y) * P1 + y * P2) + y * y * y;
    }
    SPLINE_POSITION[NB_SAMPLES] = SPLINE_TIME[NB_SAMPLES] = 1.0;
}

class SplineOverScroller {
    constructor(density) {
        // Initial position
        this.mStart = 0;
        // Current position
        this.mCurrentPosition = 0;
        // Final position
        this.mFinal = 0;
        // Initial velocity
        this.mVelocity = 0;
        // Current velocity
        this.mCurrVelocity = 0;
        // Constant current deceleration
        this.mDeceleration = 0;
        // Animation starting time, in system milliseconds
        this.mStartTime = 0;
        // Animation duration, in milliseconds
        this.mDuration = 0;
        // Duration to complete spline component of animation
        this.mSplineDuration = 0;
        // Distance to travel along spline animation
        this.mSplineDistance = 0;
        // Whether the animation is currently in progress
        this.mFinished = false;
        // The allowed overshot distance before boundary is reached.
        this.mOver = 0;
        // Fling friction
        this.mFlingFriction = ViewConfiguration.getScrollFriction();
        // Current state of the animation.
        this.mState = SplineOverScroller.SPLINE;

        this.mFinished = true;
        const ppi = density * 160.0;
        this.mPhysicalCoeff = SensorManager.GRAVITY_EARTH   // g (m/s^2)
                * 39.37                                     // inch/meter
                * ppi
                * 0.84;                                     // look and feel tuning
    }

    setFriction(friction) { this.mFlingFriction = friction; }

    updateScroll(q, q2) {
        const distance = this.mFinal - this.mStart;
        this.mCurrentPosition = this.mStart + Math.round(q * distance);
        // q2 is 1ms before q1
        this.mCurrVelocity = 1000.0 * (q - q2) * distance;
    }

    /* Get a signed deceleration that will reduce the velocity. */
    static getDeceleration(velocity) {
        return velocity > 0 ? -GRAVITY : GRAVITY;
    }

    /*
     * Modifies mDuration to the duration it takes to get from start to
     * newFinal using the spline interpolation. The previous duration was
     * needed to get to oldFinal.
     */
    adjustDuration(start, oldFinal, newFinal) {
        const oldDistance = oldFinal - start;
        const newDistance = newFinal - start;
        const x = Math.abs(newDistance / oldDistance);
        const index = (NB_SAMPLES * x) | 0;
        if (index < NB_SAMPLES) {
            const x_inf = index / NB_SAMPLES;
            const x_sup = (index + 1) / NB_SAMPLES;
            const t_inf = SPLINE_TIME[index];
            const t_sup = SPLINE_TIME[index + 1];
            const timeCoef = t_inf + (x - x_inf) / (x_sup - x_inf) * (t_sup - t_inf);
            this.mDuration *= timeCoef;
        }
    }

    startScroll(start, distance, duration) {
        this.mFinished = false;

        this.mCurrentPosition = this.mStart = start;
        this.mFinal = start + distance;

        this.mStartTime = AnimationUtils.currentAnimationTimeMillis();
        this.mDuration = duration;

        // Unused
        this.mDeceleration = 0.0;
        this.mVelocity = 0;
    }

    finish() {
        this.mCurrentPosition = this.mFinal;
        // Not reset since WebView relies on this value for fast fling.
        // TODO: restore when WebView uses the fast fling implemented in this class.
        // this.mCurrVelocity = 0.0;
        this.mFinished = true;
    }

    setFinalPosition(position) {
        this.mFinal = position;
        this.mSplineDistance = this.mFinal - this.mStart;
        this.mFinished = false;
    }

    extendDuration(extend) {
        const time = AnimationUtils.currentAnimationTimeMillis();
        const elapsedTime = (time - this.mStartTime) | 0;
        this.mDuration = this.mSplineDuration = elapsedTime + extend;
        this.mFinished = false;
    }

    springback(start, min, max) {
        this.mFinished = true;

        this.mCurrentPosition = this.mStart = this.mFinal = start;
        this.mVelocity = 0;

        this.mStartTime = AnimationUtils.currentAnimationTimeMillis();
        this.mDuration = 0;

        if (start < min) {
            this.startSpringback(start, min, 0);
        } else if (start > max) {
            this.startSpringback(start, max, 0);
        }

        return !this.mFinished;
    }

    startSpringback(start, end, velocity) {
        // mStartTime has been set
        this.mFinished = false;
        this.mState = SplineOverScroller.CUBIC;
        this.mCurrentPosition = this.mStart = start;
        this.mFinal = end;
        const delta = start - end;
        this.mDeceleration = SplineOverScroller.getDeceleration(delta);
        // TODO take velocity into account
        this.mVelocity = -delta;    // only sign is used
        this.mOver = Math.abs(delta);
        this.mDuration = (1000.0 * Math.sqrt(-2.0 * delta / this.mDeceleration)) | 0;
    }

    fling(start, velocity, min, max, over) {
        this.mOver = over;
        this.mFinished = false;
        this.mCurrVelocity = this.mVelocity = velocity;
        this.mDuration = this.mSplineDuration = 0;
        this.mStartTime = AnimationUtils.currentAnimationTimeMillis();
        this.mCurrentPosition = this.mStart = start;

        if (start > max || start < min) {
            this.startAfterEdge(start, min, max, velocity);
            return;
        }

        this.mState = SplineOverScroller.SPLINE;
        let totalDistance = 0.0;

        if (velocity !== 0) {
            this.mDuration = this.mSplineDuration = this.getSplineFlingDuration(velocity);
            totalDistance = this.getSplineFlingDistance(velocity);
        }

        this.mSplineDistance = (totalDistance * Math.sign(velocity)) | 0;
        this.mFinal = start + this.mSplineDistance;

        // Clamp to a valid final position
        if (this.mFinal < min) {
            this.adjustDuration(this.mStart, this.mFinal, min);
            this.mFinal = min;
        }

        if (this.mFinal > max) {
            this.adjustDuration(this.mStart, this.mFinal, max);
            this.mFinal = max;
        }
    }

    getSplineDeceleration(velocity) {
        return Math.log(INFLEXION * Math.abs(velocity) / (this.mFlingFriction * this.mPhysicalCoeff));
    }

    getSplineFlingDistance(velocity) {
        const l = this.getSplineDeceleration(velocity);
        const decelMinusOne = DECELERATION_RATE - 1.0;
        return this.mFlingFriction * this.mPhysicalCoeff *
                Math.exp(DECELERATION_RATE / decelMinusOne * l);
    }

    /* Returns the duration, expressed in milliseconds */
    getSplineFlingDuration(velocity) {
        const l = this.getSplineDeceleration(velocity);
        const decelMinusOne = DECELERATION_RATE - 1.0;
        return (1000.0 * Math.exp(l / decelMinusOne)) | 0;
    }

    fitOnBounceCurve(start, end, velocity) {
        // Simulate a bounce that started from edge
        const durationToApex = -velocity / this.mDeceleration;
        // The float cast below is necessary to avoid integer overflow.
        const velocitySquared = velocity * velocity;
        const distanceToApex = velocitySquared / 2.0 / Math.abs(this.mDeceleration);
        const distanceToEdge = Math.abs(end - start);
        const totalDuration = Math.sqrt(
                2.0 * (distanceToApex + distanceToEdge) / Math.abs(this.mDeceleration));
        this.mStartTime -= (1000.0 * (totalDuration - durationToApex)) | 0;
        this.mCurrentPosition = this.mStart = end;
        this.mVelocity = (-this.mDeceleration * totalDuration) | 0;
    }

    startBounceAfterEdge(start, end, velocity) {
        this.mDeceleration = SplineOverScroller.getDeceleration(velocity === 0 ? start - end : velocity);
        this.fitOnBounceCurve(start, end, velocity);
        this.onEdgeReached();
    }

    startAfterEdge(start, min, max, velocity) {
        if (start > min && start < max) {
            console.error('OverScroller', 'startAfterEdge called from a valid position');
            this.mFinished = true;
            return;
        }
        const positive = start > max;
        const edge = positive ? max : min;
        const overDistance = start - edge;
        const keepIncreasing = overDistance * velocity >= 0;
        if (keepIncreasing) {
            // Will result in a bounce or a to_boundary depending on velocity.
            this.startBounceAfterEdge(start, edge, velocity);
        } else {
            const totalDistance = this.getSplineFlingDistance(velocity);
            if (totalDistance > Math.abs(overDistance)) {
                this.fling(start, velocity, positive ? min : start, positive ? start : max, this.mOver);
            } else {
                this.startSpringback(start, edge, velocity);
            }
        }
    }

    notifyEdgeReached(start, end, over) {
        // mState is used to detect successive notifications
        if (this.mState === SplineOverScroller.SPLINE) {
            this.mOver = over;
            this.mStartTime = AnimationUtils.currentAnimationTimeMillis();
            // We were in fling/scroll mode before: current velocity is such
            // that distance to edge is increasing. This ensures that
            // startAfterEdge will not start a new fling.
            this.startAfterEdge(start, end, end, this.mCurrVelocity | 0);
        }
    }

    onEdgeReached() {
        // mStart, mVelocity and mStartTime were adjusted to their values
        // when edge was reached.
        // The float cast below is necessary to avoid integer overflow.
        const velocitySquared = this.mVelocity * this.mVelocity;
        let distance = velocitySquared / (2.0 * Math.abs(this.mDeceleration));
        const sign = Math.sign(this.mVelocity);

        if (distance > this.mOver) {
            // Default deceleration is not sufficient to slow us down before boundary
            this.mDeceleration = -sign * velocitySquared / (2.0 * this.mOver);
            distance = this.mOver;
        }

        this.mOver = distance | 0;
        this.mState = SplineOverScroller.BALLISTIC;
        this.mFinal = this.mStart + (this.mVelocity > 0 ? distance : -distance) | 0;
        this.mDuration = (-(1000.0 * this.mVelocity / this.mDeceleration)) | 0;
    }

    continueWhenFinished() {
        switch (this.mState) {
            case SplineOverScroller.SPLINE:
                // Duration from start to null velocity
                if (this.mDuration < this.mSplineDuration) {
                    // If the animation was clamped, we reached the edge
                    this.mCurrentPosition = this.mStart = this.mFinal;
                    // TODO Better compute speed when edge was reached
                    this.mVelocity = this.mCurrVelocity | 0;
                    this.mDeceleration = SplineOverScroller.getDeceleration(this.mVelocity);
                    this.mStartTime += this.mDuration;
                    this.onEdgeReached();
                } else {
                    // Normal stop, no need to continue
                    return false;
                }
                break;
            case SplineOverScroller.BALLISTIC:
                this.mStartTime += this.mDuration;
                this.startSpringback(this.mFinal, this.mStart, 0);
                break;
            case SplineOverScroller.CUBIC:
                return false;
        }

        this.update();
        return true;
    }

    /*
     * Update the current position and velocity for current time. Returns
     * true if update has been done and false if animation duration has
     * been reached.
     */
    update() {
        const time = AnimationUtils.currentAnimationTimeMillis();
        const currentTime = time - this.mStartTime;

        if (currentTime === 0) {
            // Skip work but report that we're still going if we have a nonzero duration.
            return this.mDuration > 0;
        }
        if (currentTime > this.mDuration) {
            return false;
        }

        let distance = 0.0;
        switch (this.mState) {
            case SplineOverScroller.SPLINE: {
                const t = currentTime / this.mSplineDuration;
                const index = (NB_SAMPLES * t) | 0;
                let distanceCoef = 1.0;
                let velocityCoef = 0.0;
                if (index < NB_SAMPLES) {
                    const t_inf = index / NB_SAMPLES;
                    const t_sup = (index + 1) / NB_SAMPLES;
                    const d_inf = SPLINE_POSITION[index];
                    const d_sup = SPLINE_POSITION[index + 1];
                    velocityCoef = (d_sup - d_inf) / (t_sup - t_inf);
                    distanceCoef = d_inf + (t - t_inf) * velocityCoef;
                }

                distance = distanceCoef * this.mSplineDistance;
                this.mCurrVelocity =
                    velocityCoef * this.mSplineDistance / this.mSplineDuration * 1000.0;
                break;
            }

            case SplineOverScroller.BALLISTIC: {
                const t = currentTime / 1000.0;
                this.mCurrVelocity = this.mVelocity + this.mDeceleration * t;
                distance = this.mVelocity * t + this.mDeceleration * t * t / 2.0;
                break;
            }

            case SplineOverScroller.CUBIC: {
                const t = currentTime / this.mDuration;
                const t2 = t * t;
                const sign = Math.sign(this.mVelocity);
                distance = sign * this.mOver * (3.0 * t2 - 2.0 * t * t2);
                this.mCurrVelocity = sign * this.mOver * 6.0 * (-t + t2);
                break;
            }
        }

        this.mCurrentPosition = this.mStart + Math.round(distance);

        return true;
    }
}

/* 状态常量与 AOSP 主分支一致（注意：顺序与旧版不同！） */
SplineOverScroller.SPLINE = 0;
SplineOverScroller.CUBIC = 1;
SplineOverScroller.BALLISTIC = 2;

/* Node/CommonJS 导出 */

export { OverScroller, SplineOverScroller, ViscousFluidInterpolator, AnimationUtils, ViewConfiguration, SensorManager };
