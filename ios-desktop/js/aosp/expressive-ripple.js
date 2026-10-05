
// ===== aosp-expressive-ripple.js =====
/**
 * ============================================================
 *  aosp-expressive-ripple.js
 *  M3E 点击涟漪（Android 16 / API 36 Expressive Ripple）
 *  的忠实 JS 移植 —— 逐行对应：
 *    graphics/java/android/graphics/drawable/RippleShader.java
 *    graphics/java/android/graphics/drawable/RippleAnimationSession.java
 *  ------------------------------------------------------------
 *  修正记录（对照 AOSP 源码逐行核对）：
 *  · noise 循环：enterSoftware() 的 loop 是 ofFloat(mStartTime,
 *    mStartTime + MAX_NOISE_PHASE)，7000ms 播完即停
 *    （onAnimationEnd 置 mLoopAnimation=null），不循环 —— 上一版误为无限循环
 *  · exit 时序：expand.setStartDelay(computeDelay())，delay 自按下时刻起算；
 *    提前松手时 exit 在 t=450ms 准时开始（而非松手后再等 450ms）
 *  · shader：补回 in_hasMask / in_shader 遮罩分支与 setRadius 的 ×2.3
 *  ------------------------------------------------------------
 *  平台依赖替换：RenderNodeAnimator/ValueAnimator → rAF 时间轴，
 *  RuntimeShader+RecordingCanvas → WebGL 全屏四边形
 * ============================================================
 */
'use strict';

import { AnimationUtils } from './overscroller.js';

/* ---- android.view.animation.PathInterpolator（三次贝塞尔，FOSI = (0.4,0,0.2,1)） ---- */
class PathInterpolatorCubic {
    constructor(x1, y1, x2, y2) {
        this.mX1 = x1; this.mY1 = y1; this.mX2 = x2; this.mY2 = y2;
    }
    getInterpolation(x) {
        if (x <= 0.0) return 0.0;
        if (x >= 1.0) return 1.0;
        return this.getBezierY(this.solveForX(x));
    }
    getBezierY(t) {
        const u = 1.0 - t;
        return 3.0 * u * u * t * this.mY1 + 3.0 * u * t * t * this.mY2 + t * t * t;
    }
    getBezierX(t) {
        const u = 1.0 - t;
        return 3.0 * u * u * t * this.mX1 + 3.0 * u * t * t * this.mX2 + t * t * t;
    }
    getSlopeX(t) {
        const u = 1.0 - t;
        return 3.0 * u * u * this.mX1 + 6.0 * u * t * (this.mX2 - this.mX1) + 3.0 * t * t * (1.0 - this.mX2);
    }
    solveForX(x) {
        let t = x;
        for (let i = 0; i < 8; i++) {
            const err = this.getBezierX(t) - x;
            if (Math.abs(err) < 1e-6) return t;
            const d = this.getSlopeX(t);
            if (Math.abs(d) < 1e-6) break;
            t -= err / d;
        }
        let lo = 0.0, hi = 1.0;
        t = x;
        for (let i = 0; i < 32; i++) {
            const v = this.getBezierX(t);
            if (Math.abs(v - x) < 1e-6) break;
            if (v < x) lo = t; else hi = t;
            t = (lo + hi) / 2;
        }
        return t;
    }
}

/* ---- RippleAnimationSession 常量（AOSP 原值） ---- */
const ENTER_ANIM_DURATION = 450;              // 进入动画 ms
const EXIT_ANIM_DURATION = 375;               // 退出动画 ms
const NOISE_ANIMATION_DURATION = 7000;        // 噪声动画 ms（播完即停，见 onAnimationEnd）
const MAX_NOISE_PHASE = NOISE_ANIMATION_DURATION / 214;   // ≈32.710

/* Matches R.interpolator.fast_out_slow_in */
const FAST_OUT_SLOW_IN = new PathInterpolatorCubic(0.4, 0, 0.2, 1);

/**
 * 对应 RippleAnimationSession 的软件动画路径（enterSoftware/exitSoftware）。
 * 时序模型（与 AOSP 完全一致）：
 *   enter:  progress 0→0.5（450ms，FOSI）；noisePhase mStartTime→mStartTime+MAX_NOISE_PHASE
 *           （7000ms，LINEAR，播完即停 —— 不循环）
 *   exit:   expand.setStartDelay(computeDelay())，progress 0.5→1（375ms，LINEAR）
 *           —— delay 自按下时刻起算；exit 结束时 session 结束
 */
class RippleAnimationSession {
    /**
     * @param originX/originY 涟漪原点（通常为视图中心，设备像素）
     * @param touchX/touchY   触摸点（设备像素）
     */
    constructor(originX, originY, touchX, touchY, startTime) {
        this.originX = originX;
        this.originY = originY;
        this.touchX = touchX;
        this.touchY = touchY;
        this.mStartTime = startTime;
        this.progress = 0;
        this.noisePhase = startTime;
        this.exiting = false;
        this.exitRequestedAt = 0;
        this.finished = false;
    }
    /** 对应 RippleAnimationSession.exit() */
    requestExit(now) {
        if (!this.exiting) {
            this.exiting = true;
            this.exitRequestedAt = now;
            // 记录退出时的进度，exit 从该值平滑接续到 1（避免快速点击时
            // progress 未走完 enter 就跳到 0.5 造成的视觉停顿；
            // AOSP 的 exitSoftware 固定从 0.5 起，快速点击会先跳变到 0.5）
            this.exitStartValue = this.progress;
        }
    }
    /** 每帧推进（对应软件路径的 ValueAnimator 更新回调） */
    update(now) {
        const elapsed = now - this.mStartTime;
        // enterSoftware() 的 loop：ofFloat(mStartTime, mStartTime + MAX_NOISE_PHASE)
        // 7000ms 播完即停（onAnimationEnd: mLoopAnimation = null），不循环
        this.noisePhase = this.mStartTime
                + MAX_NOISE_PHASE * Math.min(elapsed / NOISE_ANIMATION_DURATION, 1.0);
        if (!this.exiting) {
            // enterSoftware() 的 expand：0f→0.5f，450ms，FAST_OUT_SLOW_IN
            const t = Math.min(elapsed / ENTER_ANIM_DURATION, 1.0);
            this.progress = 0.5 * FAST_OUT_SLOW_IN.getInterpolation(t);
        } else {
            // exitSoftware()：expand.setStartDelay(computeDelay())
            // delay 自按下时刻起算 → exit 起点 = mStartTime + max(450 - (exitAt - mStartTime), 0)
            const delay = Math.max(ENTER_ANIM_DURATION - (this.exitRequestedAt - this.mStartTime), 0);
            const exitStart = this.exitRequestedAt + delay;   // = max(450, exitAt) 相对按下时刻
            const exitElapsed = now - exitStart;
            if (exitElapsed >= 0) {
                const t = Math.min(exitElapsed / EXIT_ANIM_DURATION, 1.0);
                this.progress = this.exitStartValue + (1.0 - this.exitStartValue) * t;
                this.finished = exitElapsed >= EXIT_ANIM_DURATION;
            }
        }
    }
}

/* ---- RippleShader：AGSL → GLSL ES 1.0（逐行映射，含 in_hasMask 分支） ---- */
const RIPPLE_FRAGMENT_SHADER = `
precision highp float;

uniform vec2  uOrigin;            // in_origin（涟漪原点，像素）
uniform vec2  uTouch;             // in_touch
uniform float uProgress;          // in_progress
uniform float uMaxRadius;         // in_maxRadius（setRadius 已乘 2.3）
uniform vec2  uResolutionScale;   // in_resolutionScale = (1/w, 1/h)
uniform vec2  uNoiseScale;        // in_noiseScale = (2.1/w, 2.1/h)
uniform float uNoisePhase;        // in_noisePhase = phase * 0.001
uniform float uTurbulencePhase;   // in_turbulencePhase = phase
uniform vec2  uTCircle1;          // in_tCircle1..3
uniform vec2  uTCircle2;
uniform vec2  uTCircle3;
uniform vec2  uTRotation1;        // in_tRotation1..3（cos/sin 对）
uniform vec2  uTRotation2;
uniform vec2  uTRotation3;
uniform vec4  uColor;             // in_color（波颜色，含 alpha）
uniform vec4  uSparkleColor;      // in_sparkleColor
uniform float uHasMask;           // in_hasMask（0 = 无遮罩，1 = 有遮罩）
uniform float uH;                 // 画布高度（gl_FragCoord y 翻转用）
uniform vec4  uMaskRect;          // 遮罩矩形（设备像素，y 向下；xy=min, zw=max）
uniform float uMaskRadius;        // 遮罩圆角 px

float triangleNoise(vec2 n) {
  n  = fract(n * vec2(5.3987, 5.4421));
  n += dot(n.yx, n.xy + vec2(21.5351, 14.3137));
  float xy = n.x * n.y;
  return fract(xy * 95.4307) + fract(xy * 75.04961) - 1.0;
}
const float PI = 3.1415926535897932384626;

float sat(float v) { return clamp(v, 0.0, 1.0); }

float threshold(float v, float l, float h) {
    return step(l, v) * (1.0 - step(h, v));
}
float sparkles(vec2 uv, float t) {
  float n = triangleNoise(uv);
  float s = 0.0;
  for (float i = 0.0; i < 4.0; i += 1.0) {
    float l = i * 0.1;
    float h = l + 0.05;
    float o = sin(PI * (t + 0.35 * i));
    s += threshold(n + o, l, h);
  }
  return sat(s) * uSparkleColor.a;
}
float softCircle(vec2 uv, vec2 xy, float radius, float blur) {
  float blurHalf = blur * 0.5;
  float d = distance(uv, xy);
  return 1.0 - smoothstep(1.0 - blurHalf, 1.0 + blurHalf, d / radius);
}
float softRing(vec2 uv, vec2 xy, float radius, float progress, float blur) {
  float thickness = 0.05 * radius;
  float currentRadius = radius * progress;
  float circle_outer = softCircle(uv, xy, currentRadius + thickness, blur);
  float circle_inner = softCircle(uv, xy, max(currentRadius - thickness, 0.0), blur);
  return sat(circle_outer - circle_inner);
}
float subProgress(float start, float end, float progress) {
    float sub = clamp(progress, start, end);
    return (sub - start) / (end - start);
}
mat2 rotate2d(vec2 rad){
  return mat2(rad.x, -rad.y, rad.y, rad.x);
}
float circle_grid(vec2 resolution, vec2 coord, float time, vec2 center,
    vec2 rotation, float cell_diameter) {
  coord = rotate2d(rotation) * (center - coord) + center;
  coord = mod(coord, cell_diameter) / resolution;
  float normal_radius = cell_diameter / resolution.y * 0.5;
  float radius = 0.65 * normal_radius;
  return softCircle(coord, vec2(normal_radius), radius, radius * 50.0);
}
float turbulence(vec2 uv, float t) {
  const vec2 scale = vec2(0.8);
  uv = uv * scale;
  float g1 = circle_grid(scale, uv, t, uTCircle1, uTRotation1, 0.17);
  float g2 = circle_grid(scale, uv, t, uTCircle2, uTRotation2, 0.2);
  float g3 = circle_grid(scale, uv, t, uTCircle3, uTRotation3, 0.275);
  float v = (g1 * g1 + g2 - g3) * 0.5;
  return sat(0.45 + 0.8 * v);
}
void main() {
    // gl_FragCoord y 向上，Android 像素 y 向下 → 翻转
    vec2 p = vec2(gl_FragCoord.x, uH - gl_FragCoord.y);

    float fadeIn = subProgress(0.0, 0.13, uProgress);
    float scaleIn = subProgress(0.0, 1.0, uProgress);
    float fadeOutNoise = subProgress(0.4, 0.5, uProgress);
    float fadeOutRipple = subProgress(0.4, 1.0, uProgress);
    vec2 center = mix(uTouch, uOrigin, sat(uProgress * 2.0));
    float ring = softRing(p, center, uMaxRadius, scaleIn, 1.0);
    float alpha = min(fadeIn, 1.0 - fadeOutNoise);
    vec2 uv = p * uResolutionScale;
    vec2 densityUv = uv - mod(uv, uNoiseScale);
    float turb = turbulence(uv, uTurbulencePhase);
    float sparkleAlpha = sparkles(densityUv, uNoisePhase) * ring * alpha * turb;
    float fade = min(fadeIn, 1.0 - fadeOutRipple);
    float waveAlpha = softCircle(p, center, uMaxRadius * scaleIn, 1.0) * fade * uColor.a;
    vec4 waveColor = vec4(uColor.rgb * waveAlpha, waveAlpha);
    vec4 sparkleColor = vec4(uSparkleColor.rgb * uSparkleColor.a, uSparkleColor.a);
    // AOSP: in_hasMask == 1. ? (in_shader.eval(p).a > 0. ? 1. : 0.) : 1.
    // in_hasMask = 0 → mask = 1；= 1 时由宿主提供遮罩。
    // Web 集成：宿主无 in_shader 纹理，遮罩退化为圆角矩形 SDF（元素 bounds + 圆角，
    // 1.5px 软边抗锯齿）—— 对应 RippleDrawable 以 View 边界为涟漪遮罩的行为。
    float mask = 1.0;
    if (uHasMask > 0.5) {
      vec2 halfSz = (uMaskRect.zw - uMaskRect.xy) * 0.5;
      vec2 c2 = (uMaskRect.xy + uMaskRect.zw) * 0.5;
      vec2 q = abs(p - c2) - (halfSz - vec2(uMaskRadius));
      float sdf = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uMaskRadius;
      mask = 1.0 - smoothstep(-1.5, 1.5, sdf);
    }
    gl_FragColor = mix(waveColor, sparkleColor, sparkleAlpha) * mask;
}
`;

const RIPPLE_VERTEX_SHADER = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/* ---- 对应 RippleShader.setNoisePhase() 的 uniform 计算（逐行） ---- */
const PI_ROTATE_RIGHT = Math.PI * 0.0078125;
const PI_ROTATE_LEFT = Math.PI * -0.0078125;
function computeTurbulenceUniforms(phase) {
    const scale = 1.5;
    const tCircle1 = [
        scale * 0.5 + (phase * 0.01 * Math.cos(scale * 0.55)),
        scale * 0.5 + (phase * 0.01 * Math.sin(scale * 0.55))];
    const tCircle2 = [
        scale * 0.2 + (phase * -0.0066 * Math.cos(scale * 0.45)),
        scale * 0.2 + (phase * -0.0066 * Math.sin(scale * 0.45))];
    const tCircle3 = [
        scale + (phase * -0.0066 * Math.cos(scale * 0.35)),
        scale + (phase * -0.0066 * Math.sin(scale * 0.35))];
    const rotation1 = phase * PI_ROTATE_RIGHT + 1.7 * Math.PI;
    const rotation2 = phase * PI_ROTATE_LEFT + 2 * Math.PI;
    const rotation3 = phase * PI_ROTATE_RIGHT + 2.75 * Math.PI;
    return {
        tCircle1, tCircle2, tCircle3,
        tRotation1: [Math.cos(rotation1), Math.sin(rotation1)],
        tRotation2: [Math.cos(rotation2), Math.sin(rotation2)],
        tRotation3: [Math.cos(rotation3), Math.sin(rotation3)],
    };
}

/** argb int → [r,g,b,a] 0..1 */
function colorToVec4(argb) {
    return [((argb >>> 16) & 0xff) / 255, ((argb >>> 8) & 0xff) / 255,
            (argb & 0xff) / 255, ((argb >>> 24) & 0xff) / 255];
}

/**
 * 对应 RippleDrawable 的表达性涟漪绘制宿主（WebGL 替身）：
 *   maxRadius = 视图半对角线（RippleComponent.getTargetRadius），
 *   入 shader 时 × 2.3（RippleShader.setRadius）
 */
class ExpressiveRippleSurface {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {object} opts color/sparkleColor（argb 整数，AOSP 从主题取色，此处为演示默认值）
     */
    constructor(canvas, { color = 0x73FFFFFF, sparkleColor = 0xE6FFFFFF } = {}) {
        // color: AOSP 从 colorControlHighlight 取色（M3 典型 12-24% 黑/白），
        // 演示默认 0x59FFFFFF (35%) 以在深色底上达到真机观感；sparkleColor 恒白
        this.mCanvas = canvas;
        this.mColor = color;
        this.mSparkleColor = sparkleColor;
        this.mSessions = [];
        this.mDownPointers = new Map();   // pointerId -> session

        const gl = canvas.getContext('webgl', {
            alpha: true, premultipliedAlpha: true, antialias: false,
        });
        this.mGl = gl;
        if (!gl) { this.mSupported = false; return; }
        this.mSupported = true;

        const compile = (type, src) => {
            const s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                throw new Error('shader: ' + gl.getShaderInfoLog(s));
            }
            return s;
        };
        const prog = gl.createProgram();
        gl.attachShader(prog, compile(gl.VERTEX_SHADER, RIPPLE_VERTEX_SHADER));
        gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, RIPPLE_FRAGMENT_SHADER));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            throw new Error('link: ' + gl.getProgramInfoLog(prog));
        }
        gl.useProgram(prog);
        this.mProg = prog;

        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const aPos = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);

        this.mU = {};
        for (const name of ['uOrigin', 'uTouch', 'uProgress', 'uMaxRadius',
                'uResolutionScale', 'uNoiseScale', 'uNoisePhase', 'uTurbulencePhase',
                'uTCircle1', 'uTCircle2', 'uTCircle3',
                'uTRotation1', 'uTRotation2', 'uTRotation3',
                'uColor', 'uSparkleColor', 'uHasMask', 'uH',
                'uMaskRect', 'uMaskRadius']) {
            this.mU[name] = gl.getUniformLocation(prog, name);
        }

        // 立即初始化（含着色器编译），避免首次点击时的编译卡顿。
        // 尺寸用 getBoundingClientRect（此时 CSS 布局已完成，clientWidth 也可靠）。
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const w = canvas.width = (rect.width || canvas.clientWidth || 1) * dpr;
        const h = canvas.height = (rect.height || canvas.clientHeight || 1) * dpr;
        // RippleShader.setResolution(w, h)：densityScale = 2.1
        const densityScale = 2.1;
        gl.uniform2f(this.mU.uResolutionScale, 1 / w, 1 / h);
        gl.uniform2f(this.mU.uNoiseScale, densityScale / w, densityScale / h);
        gl.uniform1f(this.mU.uH, h);
        // RippleShader.setColor
        gl.uniform4fv(this.mU.uColor, colorToVec4(color));
        gl.uniform4fv(this.mU.uSparkleColor, colorToVec4(sparkleColor));
        // 无遮罩（in_hasMask = 0）
        gl.uniform1f(this.mU.uHasMask, 0.0);
        // 原点 = 视图中心（bounds 中心，设备像素）
        this.mOriginX = w / 2;
        this.mOriginY = h / 2;
        // RippleComponent.getTargetRadius(bounds) = sqrt(w²+h²)/2，
        // RippleShader.setRadius 内部 ×2.3
        this.mMaxRadius = Math.hypot(w / 2, h / 2) * 2.3;
        gl.uniform1f(this.mU.uMaxRadius, this.mMaxRadius);
        gl.uniform2f(this.mU.uOrigin, this.mOriginX, this.mOriginY);

        // 预热：1x1 视口绘制一帧，强制 GPU 驱动完成着色器/管线的惰性编译，
        // 避免首次真实点击时的驱动级卡顿（WebGL 的 compileShader 仅提交源码，
        // 机器码编译发生在首次 drawArrays）。
        gl.viewport(0, 0, 1, 1);
        gl.uniform1f(this.mU.uProgress, 0.5);
        gl.uniform1f(this.mU.uNoisePhase, 0.0);
        gl.uniform1f(this.mU.uTurbulencePhase, 0.0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.clear(gl.COLOR_BUFFER_BIT);

        this._raf = this._raf.bind(this);
        this._running = false;
    }

    /** 按下：开启新 session（对应 startRippleAnimation / enter(canvas)） */
    onTouchDown(pointerId, x, y) {
        const dpr = window.devicePixelRatio || 1;
        const now = AnimationUtils.currentAnimationTimeMillis();
        const s = new RippleAnimationSession(
            this.mOriginX, this.mOriginY, x * dpr, y * dpr, now);
        this.mSessions.push(s);
        this.mDownPointers.set(pointerId, s);
        this._ensureLoop();
    }
    /** 抬起/取消：触发 exit（对应 RippleAnimationSession.exit()） */
    onTouchUp(pointerId) {
        const s = this.mDownPointers.get(pointerId);
        if (s) {
            s.requestExit(AnimationUtils.currentAnimationTimeMillis());
            this.mDownPointers.delete(pointerId);
        }
    }
    /** 长按移动：更新触摸点（对应 RippleForeground.move，M3E 中影响 center 插值） */
    onTouchMove(pointerId, x, y) {
        const s = this.mDownPointers.get(pointerId);
        if (s) {
            const dpr = window.devicePixelRatio || 1;
            s.touchX = x * dpr;
            s.touchY = y * dpr;
        }
    }

    _ensureLoop() {
        if (!this._running) {
            this._running = true;
            requestAnimationFrame(this._raf);
        }
    }
    _raf() {
        const gl = this.mGl;
        const now = AnimationUtils.currentAnimationTimeMillis();
        gl.viewport(0, 0, this.mCanvas.width, this.mCanvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.mSessions = this.mSessions.filter(s => {
            s.update(now);
            if (s.finished) return false;
            // 性能：exit 阶段 noise 已停（AOSP 的 loop animator 同样被 cancel），
            // turbulence uniforms 冻结为按下时缓存的值，避免每帧大量三角函数计算
            if (!s.exiting || s.turbCache === undefined) {
                s.turbCache = computeTurbulenceUniforms(s.noisePhase);
            }
            const tu = s.turbCache;
            gl.uniform2f(this.mU.uTouch, s.touchX, s.touchY);
            gl.uniform1f(this.mU.uProgress, s.progress);
            gl.uniform1f(this.mU.uNoisePhase, s.noisePhase * 0.001);
            gl.uniform1f(this.mU.uTurbulencePhase, s.noisePhase);
            gl.uniform2f(this.mU.uTCircle1, tu.tCircle1[0], tu.tCircle1[1]);
            gl.uniform2f(this.mU.uTCircle2, tu.tCircle2[0], tu.tCircle2[1]);
            gl.uniform2f(this.mU.uTCircle3, tu.tCircle3[0], tu.tCircle3[1]);
            gl.uniform2f(this.mU.uTRotation1, tu.tRotation1[0], tu.tRotation1[1]);
            gl.uniform2f(this.mU.uTRotation2, tu.tRotation2[0], tu.tRotation2[1]);
            gl.uniform2f(this.mU.uTRotation3, tu.tRotation3[0], tu.tRotation3[1]);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            return true;
        });
        if (this.mSessions.length > 0 || this.mDownPointers.size > 0) {
            requestAnimationFrame(this._raf);
        } else {
            this._running = false;
        }
    }
}

export { PathInterpolatorCubic, RippleAnimationSession, ExpressiveRippleSurface,
         computeTurbulenceUniforms, colorToVec4, FAST_OUT_SLOW_IN,
         ENTER_ANIM_DURATION, EXIT_ANIM_DURATION, NOISE_ANIMATION_DURATION, MAX_NOISE_PHASE };
