// ===== aosp-edgeglow.js（API 30 glow） =====
/**
 * ============================================================
 *  aosp-edgeglow.js
 *  android.widget.EdgeEffect（API 30 / Android 11，光晕 glow 版）
 *  的忠实 JS 移植 —— Android 12 之前的经典触边效果。
 *  ------------------------------------------------------------
 *  与 Java 版逐行对应，仅替换平台依赖：
 *    AnimationUtils.currentAnimationTimeMillis() -> performance.now()
 *    Context 主题色                            -> 构造参数 color（默认 0x666666，
 *                                                对应 com.android.internal.R.attr
 *                                                #colorEdgeEffect）
 *    BlendMode.SRC_ATOP                        -> Canvas2D 'source-atop'
 *                                                （宿主可按需切换）
 *  API 与 API 30 完全对齐：无 onPullDistance/getDistance
 *  （API 31 才引入，勿与 stretch 版混用）。
 * ============================================================
 */
'use strict';

import { AnimationUtils } from './overscroller.js';

/* ---- android.view.animation.DecelerateInterpolator (factor=1) ---- */
class EdgeGlowDecelerateInterpolator {
    getInterpolation(input) {
        return 1.0 - (1.0 - input) * (1.0 - input);
    }
}

class EdgeGlow {
    /**
     * @param {number} [color=0x666666]  主题色 RGB（Java 版取 colorEdgeEffect 属性）
     */
    constructor(color = 0x666666) {
        this.mGlowAlpha = 0;
        this.mGlowScaleY = 0;
        this.mGlowAlphaStart = 0;
        this.mGlowAlphaFinish = 0;
        this.mGlowScaleYStart = 0;
        this.mGlowScaleYFinish = 0;

        this.mStartTime = 0;
        this.mDuration = 0;

        this.mInterpolator = new EdgeGlowDecelerateInterpolator();

        this.mState = EdgeGlow.STATE_IDLE;
        this.mPullDistance = 0;

        this.mBounds = { left: 0, top: 0, right: 0, bottom: 0 };
        this.mRadius = 0;
        this.mBaseGlowScale = 0;
        this.mDisplacement = 0.5;
        this.mTargetDisplacement = 0.5;

        // mPaint.setColor((themeColor & 0xffffff) | 0x33000000);
        this.mColor = (color & 0xffffff) | 0x33000000;
        this.mBlendMode = 'source-atop';    // BlendMode.SRC_ATOP
    }

    setSize(width, height) {
        const r = width * EdgeGlow.RADIUS_FACTOR / EdgeGlow.SIN;
        const y = EdgeGlow.COS * r;
        const h = r - y;
        const or = height * EdgeGlow.RADIUS_FACTOR / EdgeGlow.SIN;
        const oy = EdgeGlow.COS * or;
        const oh = or - oy;

        this.mRadius = r;
        this.mBaseGlowScale = h > 0 ? Math.min(oh / h, 1.0) : 1.0;

        this.mBounds.right = width;
        this.mBounds.bottom = Math.min(height, h | 0);
    }

    isFinished() { return this.mState === EdgeGlow.STATE_IDLE; }

    finish() { this.mState = EdgeGlow.STATE_IDLE; }

    onPull(deltaDistance) { this.onPull2(deltaDistance, 0.5); }

    onPull2(deltaDistance, displacement) {
        const now = AnimationUtils.currentAnimationTimeMillis();
        this.mTargetDisplacement = displacement;
        if (this.mState === EdgeGlow.STATE_PULL_DECAY
                && now - this.mStartTime < this.mDuration) {
            return;
        }
        if (this.mState !== EdgeGlow.STATE_PULL) {
            this.mGlowScaleY = Math.max(EdgeGlow.PULL_GLOW_BEGIN, this.mGlowScaleY);
        }
        this.mState = EdgeGlow.STATE_PULL;

        this.mStartTime = now;
        this.mDuration = EdgeGlow.PULL_TIME;

        this.mPullDistance += deltaDistance;

        const absdd = Math.abs(deltaDistance);
        this.mGlowAlpha = this.mGlowAlphaStart = Math.min(EdgeGlow.MAX_ALPHA,
                this.mGlowAlpha + absdd * EdgeGlow.PULL_DISTANCE_ALPHA_GLOW_FACTOR);

        if (this.mPullDistance === 0) {
            this.mGlowScaleY = this.mGlowScaleYStart = 0;
        } else {
            const scale = Math.max(0, 1 - 1 /
                    Math.sqrt(Math.abs(this.mPullDistance) * this.mBounds.bottom) - 0.3) / 0.7;

            this.mGlowScaleY = this.mGlowScaleYStart = scale;
        }

        this.mGlowAlphaFinish = this.mGlowAlpha;
        this.mGlowScaleYFinish = this.mGlowScaleY;
    }

    onRelease() {
        this.mPullDistance = 0;

        if (this.mState !== EdgeGlow.STATE_PULL && this.mState !== EdgeGlow.STATE_PULL_DECAY) {
            return;
        }

        this.mState = EdgeGlow.STATE_RECEDE;
        this.mGlowAlphaStart = this.mGlowAlpha;
        this.mGlowScaleYStart = this.mGlowScaleY;

        this.mGlowAlphaFinish = 0.0;
        this.mGlowScaleYFinish = 0.0;

        this.mStartTime = AnimationUtils.currentAnimationTimeMillis();
        this.mDuration = EdgeGlow.RECEDE_TIME;
    }

    /** @param {number} velocity 撞边速度 px/s */
    onAbsorb(velocity) {
        this.mState = EdgeGlow.STATE_ABSORB;
        velocity = Math.min(Math.max(EdgeGlow.MIN_VELOCITY, Math.abs(velocity)),
                EdgeGlow.MAX_VELOCITY);

        this.mStartTime = AnimationUtils.currentAnimationTimeMillis();
        this.mDuration = 0.15 + velocity * 0.02;

        // The glow depends more on the velocity, and therefore starts out
        // nearly invisible.
        this.mGlowAlphaStart = EdgeGlow.GLOW_ALPHA_START;
        this.mGlowScaleYStart = Math.max(this.mGlowScaleY, 0.0);

        // Growth for the size of the glow should be quadratic to properly respond
        // to a user's scrolling speed. The faster the scrolling speed, the more
        // intense the effect should be for both the size and the saturation.
        this.mGlowScaleYFinish = Math.min(
                0.025 + (velocity * (velocity / 100) * 0.00015) / 2, 1.0);
        // Alpha should change for the glow as well as size.
        this.mGlowAlphaFinish = Math.max(this.mGlowAlphaStart,
                Math.min(velocity * EdgeGlow.VELOCITY_GLOW_FACTOR * 0.00001,
                EdgeGlow.MAX_ALPHA));
        this.mTargetDisplacement = 0.5;
    }

    setColor(color) { this.mColor = color; }
    getColor() { return this.mColor; }
    setBlendMode(blendmode) { this.mBlendMode = blendmode; }
    getBlendMode() { return this.mBlendMode; }

    getMaxHeight() { return this.mBounds.bottom * EdgeGlow.MAX_GLOW_SCALE + 0.5; }

    /* AOSP update() 逐行移植 */
    update() {
        const time = AnimationUtils.currentAnimationTimeMillis();
        const t = Math.min((time - this.mStartTime) / this.mDuration, 1.0);

        const interp = this.mInterpolator.getInterpolation(t);

        this.mGlowAlpha = this.mGlowAlphaStart + (this.mGlowAlphaFinish - this.mGlowAlphaStart) * interp;
        this.mGlowScaleY = this.mGlowScaleYStart + (this.mGlowScaleYFinish - this.mGlowScaleYStart) * interp;
        this.mDisplacement = (this.mDisplacement + this.mTargetDisplacement) / 2;

        if (t >= 1.0 - EdgeGlow.EPSILON) {
            switch (this.mState) {
                case EdgeGlow.STATE_ABSORB:
                    this.mState = EdgeGlow.STATE_RECEDE;
                    this.mStartTime = AnimationUtils.currentAnimationTimeMillis();
                    this.mDuration = EdgeGlow.RECEDE_TIME;

                    this.mGlowAlphaStart = this.mGlowAlpha;
                    this.mGlowScaleYStart = this.mGlowScaleY;

                    // After absorb, the glow should fade to nothing.
                    this.mGlowAlphaFinish = 0.0;
                    this.mGlowScaleYFinish = 0.0;
                    break;
                case EdgeGlow.STATE_PULL:
                    this.mState = EdgeGlow.STATE_PULL_DECAY;
                    this.mStartTime = AnimationUtils.currentAnimationTimeMillis();
                    this.mDuration = EdgeGlow.PULL_DECAY_TIME;

                    this.mGlowAlphaStart = this.mGlowAlpha;
                    this.mGlowScaleYStart = this.mGlowScaleY;

                    // After pull, the glow should fade to nothing.
                    this.mGlowAlphaFinish = 0.0;
                    this.mGlowScaleYFinish = 0.0;
                    break;
                case EdgeGlow.STATE_PULL_DECAY:
                    this.mState = EdgeGlow.STATE_RECEDE;
                    break;
                case EdgeGlow.STATE_RECEDE:
                    this.mState = EdgeGlow.STATE_IDLE;
                    break;
            }
        }
    }

    /**
     * 对应 AOSP draw(Canvas)。
     * @param {CanvasRenderingContext2D} ctx  已按 ScrollView.draw 完成
     *        translate/rotate 的上下文（top 边平移到 min(0,scrollY)，
     *        bottom 边 rotate(π, width, 0)）
     * @returns {boolean} true = 动画未结束，宿主需继续 postInvalidateOnAnimation
     */
    draw(ctx) {
        this.update();

        ctx.save();

        const centerX = (this.mBounds.left + this.mBounds.right) / 2;
        const centerY = this.mBounds.bottom - this.mRadius;

        // canvas.scale(1, min(mGlowScaleY,1)*mBaseGlowScale, centerX, 0)
        const sy = Math.min(this.mGlowScaleY, 1.0) * this.mBaseGlowScale;
        ctx.translate(centerX, 0);
        ctx.scale(1, sy);
        ctx.translate(-centerX, 0);

        const displacement = Math.max(0, Math.min(this.mDisplacement, 1.0)) - 0.5;
        const translateX = this.mBounds.right * displacement / 2;

        // canvas.clipRect(mBounds)
        ctx.beginPath();
        ctx.rect(this.mBounds.left, this.mBounds.top,
                 this.mBounds.right - this.mBounds.left,
                 this.mBounds.bottom - this.mBounds.top);
        ctx.clip();

        ctx.translate(translateX, 0);

        // mPaint.setAlpha(0xff * mGlowAlpha); drawCircle(...)
        ctx.globalAlpha = this.mGlowAlpha;
        ctx.fillStyle = EdgeGlow.cssColor(this.mColor);
        if (this.mBlendMode) ctx.globalCompositeOperation = this.mBlendMode;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.mRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        let oneLastFrame = false;
        if (this.mState === EdgeGlow.STATE_RECEDE && this.mGlowScaleY === 0) {
            this.mState = EdgeGlow.STATE_IDLE;
            oneLastFrame = true;
        }

        return this.mState !== EdgeGlow.STATE_IDLE || oneLastFrame;
    }

    static cssColor(argb) {
        const a = (argb >>> 24) & 0xff, r = (argb >>> 16) & 0xff,
              g = (argb >>> 8) & 0xff, b = argb & 0xff;
        return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
    }
}

/* 常量与 API 30 源码一致 */
EdgeGlow.RECEDE_TIME = 600;          // 光晕完全消退所需 ms
EdgeGlow.PULL_TIME = 167;            // 拉动后光晕开始消退前的 ms
EdgeGlow.PULL_DECAY_TIME = 2000;     // 拉动衰减到部分强度的 ms

EdgeGlow.MAX_ALPHA = 0.15;
EdgeGlow.GLOW_ALPHA_START = 0.09;
EdgeGlow.MAX_GLOW_SCALE = 2.0;
EdgeGlow.PULL_GLOW_BEGIN = 0.0;

EdgeGlow.MIN_VELOCITY = 100;
EdgeGlow.MAX_VELOCITY = 10000;

EdgeGlow.EPSILON = 0.001;
EdgeGlow.ANGLE = Math.PI / 6;        // 0.5235988
EdgeGlow.SIN = Math.sin(EdgeGlow.ANGLE);
EdgeGlow.COS = Math.cos(EdgeGlow.ANGLE);
EdgeGlow.RADIUS_FACTOR = 0.6;

EdgeGlow.PULL_DISTANCE_ALPHA_GLOW_FACTOR = 0.8;
EdgeGlow.VELOCITY_GLOW_FACTOR = 6;

EdgeGlow.STATE_IDLE = 0;
EdgeGlow.STATE_PULL = 1;
EdgeGlow.STATE_ABSORB = 2;
EdgeGlow.STATE_RECEDE = 3;
EdgeGlow.STATE_PULL_DECAY = 4;


/* ============================================================================
 * VelocityTracker —— android.view.VelocityTracker 的简化移植
 * ========================================================================== */

export { EdgeGlow };
