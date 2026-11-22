// @ts-check
// ==================== aosp/ripple-engine.js — AOSP 涟漪 WebGL2 引擎（asset-drop 第 24 轮移植卷） ====================
//
// 来源与谱系（用户 2026-11-22 指令：「我在另一边又给你弄了另外一个仓库……里面就直接有
// 移植完成的样例，你直接拿过去就能用」）—— asset-drop 仓 aosp-ripple-port-web-src.zip
// 第 24 轮 src/aosp/{RippleEngine,shaders,interpolators}.ts 逐字转译 JS ESM；上游
// 考证链见该仓 MANIFEST.md 与 PACKAGE-INFO.txt（AOSP Android 17 android-17.0.0_r1）：
//   · framework 着色器 = frameworks/base/graphics/java/android/graphics/drawable/RippleShader.java
//   · systemui 着色器 = frameworks/base/packages/SystemUI/.../surfaceeffects/ripple/RippleShader.kt
//   · 会话状态机 = RippleAnimationSession.java（ENTER 450ms FOSI ×0.5 / EXIT 375ms LINEAR /
//     noise 7000ms → MAX_NOISE_PHASE 32）
//   · SystemUI 时长 = Android 17 DEFAULT_RIPPLE_EFFECT_DURATION = 3000ms（旧 750ms 已废）
// 与本仓既有 aosp/expressive-ripple.js 的关系：后者是 framework 单模式旧移植（QS 磁贴
// 消费中，不 retire）；本文件为 asset-drop 全量版（双模式 + maskRadii 四角 SDF + 会话
// release/finish 语义 + 共享离屏渲染器多面复用），供开关状态层等新消费面使用。
//
// 去降采样决策（用户指令：「当前那个仓库内部貌似为了性能妥协，做了部分降采样工作，
// 但实际上对于性能优化没有多大用处，反倒是让视觉观感感觉很模糊」）：
//   asset-drop 上游全部消费面写死 `Math.min(devicePixelRatio, 2.5)` 钳制 —— 旗舰机
//   dpr 3.0~3.5 被砍到 2.5。对 40×40 状态层这类小面幅，物理像素 120×120 与 100×100
//   的填充差不足 0.04 MPix，钳制性能收益趋零，而星斑高频细节（triangleNoise 网格 +
//   turbulence 三圆场）在低分辨率下被抹糊，视觉损失显著。故本移植在引擎侧【不设任何
//   dpr 钳制】，dpr 由调用方原值传入（状态层调用点传 devicePixelRatio 全值）；大面幅
//   消费面若需限流由调用方自行决策，引擎不再代做。
//
// GLSL 与会话公式逐字保留（asset-drop GLSL ES 3.00 直译 AGSL 原文，含 SDF 圆角矩形
// evalMask）；平台替换同上游：RuntimeShader → WebGL2 全屏四边形。

import { FAST_OUT_SLOW_IN, STANDARD } from './interpolators.js';

/** @typedef {{r:number,g:number,b:number,a:number}} RippleColorRGBA */
/** @typedef {'framework'|'systemui'} AospRippleEngineMode */
/** @typedef {'circle'|'rounded_box'|'ellipse'} SystemUiRippleShape */

/* ---- Exact AOSP RippleAnimationSession.java constants ---- */
export const AOSP_ENTER_ANIM_DURATION = 450;
export const AOSP_EXIT_ANIM_DURATION = 375;
export const AOSP_NOISE_ANIMATION_DURATION = 7000;
export const AOSP_MAX_NOISE_PHASE = Math.floor(AOSP_NOISE_ANIMATION_DURATION / 214); // 32
export const AOSP_MAX_RIPPLES = 10;
export const AOSP_RADIUS_MULTIPLIER = 2.3;
export const AOSP_DENSITY_SCALE = 2.1;
/** Android 17 SystemUI DEFAULT_RIPPLE_EFFECT_DURATION = 3000ms */
export const AOSP_SYSTEMUI_DURATION = 3000;

const PI_ROTATE_RIGHT = Math.PI * 0.0078125;
const PI_ROTATE_LEFT = Math.PI * -0.0078125;
const TURBULENCE_SCALE = 1.5;
/** @param {number} t @returns {number} */
const LINEAR = (t) => Math.max(0, Math.min(1, t));

/**
 * @param {number} start @param {number} end @param {number} progress
 */
function subProgress(start, end, progress) {
  if (start === end) return progress > start ? 1 : 0;
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  const sub = Math.min(Math.max(progress, min), max);
  return (sub - start) / (end - start);
}

/**
 * @param {number} fadeInStart @param {number} fadeInEnd @param {number} fadeOutStart
 * @param {number} fadeOutEnd @param {number} rawProgress @returns {number}
 */
function getSystemUiFade(fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd, rawProgress) {
  const fadeIn = subProgress(fadeInStart, fadeInEnd, rawProgress);
  const fadeOut = 1 - subProgress(fadeOutStart, fadeOutEnd, rawProgress);
  return Math.min(fadeIn, fadeOut);
}

/**
 * @typedef {Object} RippleSessionConfig
 * @property {'framework'|'systemui'} mode
 * @property {number} touchX @property {number} touchY
 * @property {number} originX @property {number} originY
 * @property {number} width @property {number} height @property {number} dpr
 * @property {number|null} [maxRadiusOverride]
 * @property {RippleColorRGBA} color @property {RippleColorRGBA} sparkleColor
 * @property {number} sparkleStrength @property {number} distortionStrength
 * @property {SystemUiRippleShape} systemUiShape
 * @property {boolean} hasMask @property {number} maskRadius
 * @property {[number, number, number, number]} [maskRadii]
 * @property {number} densityScale @property {number} speedMultiplier
 * @property {number} [durationMs]
 */

/**
 * AOSP RippleAnimationSession 会话（ENTER/HOLD/EXIT 状态机，release 后定时退出）。
 * 时钟累积（advanceClock×speedMultiplier）与上游逐字；systemui 模式 3000ms 单段。
 */
export class RippleSession {
  /**
   * @param {number} id @param {RippleSessionConfig} config @param {number} nowMs
   */
  constructor(id, config, nowMs) {
    this.id = id;
    this.config = { ...config };
    this.startTimeMs = nowMs;
    this.releaseTimeMs = /** @type {number|null} */ (null);
    this.isHolding = true;
    this.finished = false;
    this._startPhaseSeed = nowMs % 10000;
    this._lastTickMs = nowMs;
    this._accumulatedElapsedMs = 0;
    this._accumulatedAtReleaseMs = /** @type {number|null} */ (null);
  }

  /** @param {number} nowMs */
  release(nowMs) {
    if (this.releaseTimeMs === null) {
      this._advanceClock(nowMs);
      this.releaseTimeMs = nowMs;
      this._accumulatedAtReleaseMs = this._accumulatedElapsedMs;
      this.isHolding = false;
    }
  }

  /** @param {number} nowMs @returns {number} */
  _advanceClock(nowMs) {
    const dt = Math.max(0, nowMs - this._lastTickMs);
    this._lastTickMs = nowMs;
    const speed = Math.max(0.05, this.config.speedMultiplier);
    this._accumulatedElapsedMs += dt * speed;
    return this._accumulatedElapsedMs;
  }

  /** @param {number} nowMs @returns {{progress:number, rawProgress:number, noisePhase:number, elapsedMs:number, stage:'ENTER'|'HOLD'|'EXIT'|'DONE'}} */
  computeState(nowMs) {
    const elapsedMs = this._advanceClock(nowMs);

    if (this.config.mode === 'systemui') {
      const duration = this.config.durationMs ?? AOSP_SYSTEMUI_DURATION;
      const rawProgress = Math.min(1, Math.max(0, elapsedMs / duration));
      const progress = STANDARD(rawProgress);
      if (rawProgress >= 1) this.finished = true;
      return {
        progress,
        rawProgress,
        noisePhase: elapsedMs,
        elapsedMs,
        stage: rawProgress >= 1 ? 'DONE' : rawProgress < 0.35 ? 'ENTER' : 'EXIT',
      };
    }

    const enterT = Math.min(1, Math.max(0, elapsedMs / AOSP_ENTER_ANIM_DURATION));
    const enterProgress = 0.5 * FAST_OUT_SLOW_IN(enterT);
    const noiseT = Math.min(1, elapsedMs / AOSP_NOISE_ANIMATION_DURATION);
    const noisePhase = this._startPhaseSeed + AOSP_MAX_NOISE_PHASE * noiseT;

    if (this._accumulatedAtReleaseMs === null) {
      return {
        progress: enterProgress,
        rawProgress: enterT * 0.5,
        noisePhase,
        elapsedMs,
        stage: enterT < 1 ? 'ENTER' : 'HOLD',
      };
    }

    const timePassedAtRelease = this._accumulatedAtReleaseMs;
    const exitDelayMs = Math.max(AOSP_ENTER_ANIM_DURATION - timePassedAtRelease, 0);
    const exitStartScaled = timePassedAtRelease + exitDelayMs;

    if (elapsedMs < exitStartScaled) {
      return {
        progress: enterProgress,
        rawProgress: enterT * 0.5,
        noisePhase,
        elapsedMs,
        stage: 'ENTER',
      };
    }

    const exitElapsed = elapsedMs - exitStartScaled;
    const exitT = Math.min(1, Math.max(0, exitElapsed / AOSP_EXIT_ANIM_DURATION));
    const progress = 0.5 + 0.5 * LINEAR(exitT);
    if (exitT >= 1) this.finished = true;

    return {
      progress,
      rawProgress: 0.5 + 0.5 * exitT,
      noisePhase,
      elapsedMs,
      stage: exitT >= 1 ? 'DONE' : 'EXIT',
    };
  }
}

/* ---- GLSL ES 3.00 直译（上游 shaders.ts 逐字；两段 fragment + 共享 vertex） ---- */

const VERTEX_SHADER_GLSL = `#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
out vec2 v_uv;

void main() {
  // Map clip-space [-1, 1] to top-left origin UV [0, 1] matching Android Canvas (y-down)
  v_uv = vec2((a_position.x + 1.0) * 0.5, 1.0 - (a_position.y + 1.0) * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAMEWORK_FRAGMENT_SHADER_GLSL = `#version 300 es
precision highp float;

#define saturate(x) clamp(x, 0.0, 1.0)

in vec2 v_uv;
out vec4 fragColor;

// Exact AOSP RippleShader.java SHADER_UNIFORMS
uniform vec2 in_origin;
uniform vec2 in_touch;
uniform float in_progress;
uniform float in_maxRadius;
uniform vec2 in_resolutionScale;
uniform vec2 in_noiseScale;
uniform float in_hasMask;
uniform float in_noisePhase;
uniform float in_turbulencePhase;
uniform vec2 in_tCircle1;
uniform vec2 in_tCircle2;
uniform vec2 in_tCircle3;
uniform vec2 in_tRotation1;
uniform vec2 in_tRotation2;
uniform vec2 in_tRotation3;
uniform vec4 in_color;
uniform vec4 in_sparkleColor;

// Host canvas uniforms for top-left pixel coordinate reconstruction & SDF mask
uniform vec2 u_resolution;
uniform vec4 u_maskRadii; // (topLeft, topRight, bottomRight, bottomLeft) in px

// Exact AOSP RippleShader.java SHADER_LIB
float triangleNoise(vec2 n) {
  n  = fract(n * vec2(5.3987, 5.4421));
  n += dot(n.yx, n.xy + vec2(21.5351, 14.3137));
  float xy = n.x * n.y;
  return fract(xy * 95.4307) + fract(xy * 75.04961) - 1.0;
}

const float PI = 3.1415926535897932384626;

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
  return saturate(s) * in_sparkleColor.a;
}

float softCircle(vec2 uv, vec2 xy, float radius, float blur) {
  float blurHalf = blur * 0.5;
  float d = distance(uv, xy);
  float safeRadius = max(radius, 0.0001);
  return 1.0 - smoothstep(1.0 - blurHalf, 1.0 + blurHalf, d / safeRadius);
}

float softRing(vec2 uv, vec2 xy, float radius, float progress, float blur) {
  float thickness = 0.05 * radius;
  float currentRadius = radius * progress;
  float circle_outer = softCircle(uv, xy, currentRadius + thickness, blur);
  float circle_inner = softCircle(uv, xy, max(currentRadius - thickness, 0.0), blur);
  return saturate(circle_outer - circle_inner);
}

float subProgress(float start, float end, float progress) {
  float sub = clamp(progress, start, end);
  return (sub - start) / (end - start);
}

mat2 rotate2d(vec2 rad) {
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
  float g1 = circle_grid(scale, uv, t, in_tCircle1, in_tRotation1, 0.17);
  float g2 = circle_grid(scale, uv, t, in_tCircle2, in_tRotation2, 0.2);
  float g3 = circle_grid(scale, uv, t, in_tCircle3, in_tRotation3, 0.275);
  float v = (g1 * g1 + g2 - g3) * 0.5;
  return saturate(0.45 + 0.8 * v);
}

// Analytical per-corner rounded rect mask equivalent for RippleDrawable's in_shader.eval(p).a > 0.
float evalMask(vec2 p) {
  if (in_hasMask < 0.5) return 1.0;
  vec2 halfSize = u_resolution * 0.5;
  vec2 rel = p - halfSize;
  float r = rel.x > 0.0
    ? (rel.y > 0.0 ? u_maskRadii.z : u_maskRadii.y)
    : (rel.y > 0.0 ? u_maskRadii.w : u_maskRadii.x);
  r = min(r, min(halfSize.x, halfSize.y));
  vec2 d = abs(rel) - (halfSize - vec2(r));
  float sdf = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
  return sdf <= 0.0 ? 1.0 : 0.0;
}

void main() {
  vec2 p = v_uv * u_resolution;

  float fadeIn = subProgress(0.0, 0.13, in_progress);
  float scaleIn = subProgress(0.0, 1.0, in_progress);
  float fadeOutNoise = subProgress(0.4, 0.5, in_progress);
  float fadeOutRipple = subProgress(0.4, 1.0, in_progress);
  vec2 center = mix(in_touch, in_origin, saturate(in_progress * 2.0));
  float ring = softRing(p, center, in_maxRadius, scaleIn, 1.0);
  float alpha = min(fadeIn, 1.0 - fadeOutNoise);
  vec2 uv = p * in_resolutionScale;
  vec2 densityUv = uv - mod(uv, in_noiseScale);
  float turb = turbulence(uv, in_turbulencePhase);
  float sparkleAlpha = sparkles(densityUv, in_noisePhase) * ring * alpha * turb;
  float fade = min(fadeIn, 1.0 - fadeOutRipple);
  float waveAlpha = softCircle(p, center, in_maxRadius * scaleIn, 1.0) * fade * in_color.a;
  vec4 waveColor = vec4(in_color.rgb * waveAlpha, waveAlpha);
  vec4 sparkleColor = vec4(in_sparkleColor.rgb * in_sparkleColor.a, in_sparkleColor.a);
  float mask = evalMask(p);

  fragColor = mix(waveColor, sparkleColor, sparkleAlpha) * mask;
}
`;

const SYSTEMUI_FRAGMENT_SHADER_GLSL = `#version 300 es
precision highp float;

#define saturate(x) clamp(x, 0.0, 1.0)

in vec2 v_uv;
out vec4 fragColor;

// Exact AOSP SystemUI RippleShader.kt SHADER_UNIFORMS
uniform vec2 in_center;
uniform vec2 in_size;
uniform float in_cornerRadius;
uniform float in_thickness;
uniform float in_time;
uniform float in_distort_radial;
uniform float in_distort_xy;
uniform float in_fadeSparkle;
uniform float in_fadeFill;
uniform float in_fadeRing;
uniform float in_blur;
uniform float in_pixelDensity;
uniform vec4 in_color;
uniform float in_sparkle_strength;

// Host canvas uniforms
uniform vec2 u_resolution;
uniform int u_shape; // 0 = CIRCLE, 1 = ROUNDED_BOX, 2 = ELLIPSE
uniform float u_hasMask;
uniform vec4 u_maskRadii; // (topLeft, topRight, bottomRight, bottomLeft) in px

const float PI = 3.1415926535897932384626;

// Exact AOSP ShaderUtilLibrary.kt
float triangleNoise(vec2 n) {
  n  = fract(n * vec2(5.3987, 5.4421));
  n += dot(n.yx, n.xy + vec2(21.5351, 14.3137));
  float xy = n.x * n.y;
  return fract(xy * 95.4307) + fract(xy * 75.04961) - 1.0;
}

float sparkles(vec2 uv, float t) {
  float n = triangleNoise(uv);
  float s = 0.0;
  for (float i = 0.0; i < 4.0; i += 1.0) {
    float l = i * 0.01;
    float h = l + 0.1;
    float o = smoothstep(n - l, h, n);
    o *= abs(sin(PI * o * (t + 0.55 * i)));
    s += o;
  }
  return s;
}

vec2 distort(vec2 p, float time, float distort_amount_radial, float distort_amount_xy) {
  float angle = atan(p.y, p.x);
  return p + vec2(sin(angle * 8.0 + time * 0.003 + 1.641),
                  cos(angle * 5.0 + 2.14 + time * 0.00412)) * distort_amount_radial
           + vec2(sin(p.x * 0.01 + time * 0.00215 + 0.8123),
                  cos(p.y * 0.01 + time * 0.005931)) * distort_amount_xy;
}

// Exact AOSP SdfShaderLibrary.kt
float soften(float d, float blur) {
  float blurHalf = blur * 0.5;
  return smoothstep(-blurHalf, blurHalf, d);
}

float subtract(float outer, float inner) {
  return max(outer, -inner);
}

float sdCircle(vec2 p, float r) {
  float safeR = max(r, 0.0001);
  return (length(p) - safeR) / safeR;
}

float circleRing(vec2 p, float radius) {
  float thicknessHalf = radius * 0.25;
  float outerCircle = sdCircle(p, radius + thicknessHalf);
  float innerCircle = sdCircle(p, radius);
  return subtract(outerCircle, innerCircle);
}

float sdRoundedBox(vec2 p, vec2 size, float cornerRadius) {
  size = max(size * 0.5, vec2(0.0001));
  cornerRadius *= 0.5;
  vec2 d = abs(p) - size + cornerRadius;
  float outside = length(max(d, 0.0));
  float inside = min(max(d.x, d.y), 0.0);
  return (outside + inside - cornerRadius) / size.y;
}

float roundedBoxRing(vec2 p, vec2 size, float cornerRadius, float borderThickness) {
  float outerRoundBox = sdRoundedBox(p, size + vec2(borderThickness), cornerRadius + borderThickness);
  float innerRoundBox = sdRoundedBox(p, size, cornerRadius);
  return subtract(outerRoundBox, innerRoundBox);
}

float sdEllipse(vec2 p, vec2 wh) {
  wh = max(wh * 0.5, vec2(0.0001));
  if (wh.x > wh.y) {
    wh = wh.yx;
    p = abs(p.yx);
  } else {
    p = abs(p);
  }
  vec2 u = wh * p;
  vec2 v = wh * wh;
  float U1 = u.y / 2.0;
  float U2 = v.y - v.x;
  float U3 = u.x - U2;
  float U4 = u.x + U2;
  float U5 = 4.0 * U1;
  float U6 = 6.0 * U1;
  float U7 = 3.0 * U3;
  float t = 0.5;
  for (int i = 0; i < 3; i++) {
    float F1 = t * (t * t * (U1 * t + U3) + U4) - U1;
    float F2 = t * t * (U5 * t + U7) + U4;
    float F3 = t * (U6 * t + U7);
    float denom = F1 * F3 - F2 * F2;
    t += abs(denom) > 1e-6 ? (F1 * F2) / denom : 0.0;
  }
  t = clamp(t, 0.0, 1.0);
  float d = distance(p, wh * vec2(1.0 - t * t, 2.0 * t) / (t * t + 1.0));
  d /= wh.y;
  return (dot(p / wh, p / wh) > 1.0) ? d : -d;
}

float ellipseRing(vec2 p, vec2 wh) {
  vec2 thicknessHalf = wh * 0.25;
  float outerEllipse = sdEllipse(p, wh + thicknessHalf);
  float innerEllipse = sdEllipse(p, wh);
  return subtract(outerEllipse, innerEllipse);
}

float evalMask(vec2 p) {
  if (u_hasMask < 0.5) return 1.0;
  vec2 halfSize = u_resolution * 0.5;
  vec2 rel = p - halfSize;
  float r = rel.x > 0.0
    ? (rel.y > 0.0 ? u_maskRadii.z : u_maskRadii.y)
    : (rel.y > 0.0 ? u_maskRadii.w : u_maskRadii.x);
  r = min(r, min(halfSize.x, halfSize.y));
  vec2 d = abs(rel) - (halfSize - vec2(r));
  float sdf = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
  return sdf <= 0.0 ? 1.0 : 0.0;
}

void main() {
  vec2 p = v_uv * u_resolution;

  float sparkleRing = 1.0;
  float inside = 1.0;

  if (u_shape == 0) {
    vec2 p_distorted = distort(p, in_time, in_distort_radial, in_distort_xy);
    float radius = in_size.x * 0.5;
    sparkleRing = soften(circleRing(p_distorted - in_center, radius), in_blur);
    inside = soften(sdCircle(p_distorted - in_center, radius * 1.25), in_blur);
  } else if (u_shape == 1) {
    sparkleRing = soften(roundedBoxRing(p - in_center, in_size, in_cornerRadius, in_thickness), in_blur);
    inside = soften(sdRoundedBox(p - in_center, in_size * 1.25, in_cornerRadius), in_blur);
  } else {
    vec2 p_distorted = distort(p, in_time, in_distort_radial, in_distort_xy);
    sparkleRing = soften(ellipseRing(p_distorted - in_center, in_size), in_blur);
    inside = soften(sdEllipse(p_distorted - in_center, in_size * 1.2), in_blur);
  }

  float stepDensity = max(in_pixelDensity * 0.8, 0.1);
  float sparkle = sparkles(p - mod(p, stepDensity), in_time * 0.00175)
    * (1.0 - sparkleRing) * in_fadeSparkle;
  float rippleInsideAlpha = (1.0 - inside) * in_fadeFill;
  float rippleRingAlpha = (1.0 - sparkleRing) * in_fadeRing;
  float rippleAlpha = max(rippleInsideAlpha, rippleRingAlpha) * in_color.a;
  vec4 ripple = vec4(in_color.rgb, 1.0) * rippleAlpha;
  float mask = evalMask(p);
  float sparkleClamped = saturate(sparkle);

  fragColor = mix(ripple, vec4(sparkleClamped), saturate(sparkle * in_sparkle_strength)) * mask;
}
`;

/** @typedef {{program: WebGLProgram, uniforms: Record<string, WebGLUniformLocation|null>}} ProgramHandle */

/**
 * @param {WebGL2RenderingContext} gl @param {number} type @param {string} source
 */
function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create WebGL shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

/**
 * @param {WebGL2RenderingContext} gl @param {string} vertexSrc @param {string} fragmentSrc
 * @param {string[]} uniformNames @returns {ProgramHandle}
 */
function createProgram(gl, vertexSrc, fragmentSrc, uniformNames) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create WebGL program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  /** @type {Record<string, WebGLUniformLocation|null>} */
  const uniforms = {};
  for (const name of uniformNames) uniforms[name] = gl.getUniformLocation(program, name);
  return { program, uniforms };
}

const FRAMEWORK_UNIFORM_NAMES = [
  'in_origin', 'in_touch', 'in_progress', 'in_maxRadius', 'in_resolutionScale',
  'in_noiseScale', 'in_hasMask', 'in_noisePhase', 'in_turbulencePhase',
  'in_tCircle1', 'in_tCircle2', 'in_tCircle3', 'in_tRotation1', 'in_tRotation2',
  'in_tRotation3', 'in_color', 'in_sparkleColor', 'u_resolution', 'u_maskRadii',
];

const SYSTEMUI_UNIFORM_NAMES = [
  'in_center', 'in_size', 'in_cornerRadius', 'in_thickness', 'in_time',
  'in_distort_radial', 'in_distort_xy', 'in_fadeSparkle', 'in_fadeFill',
  'in_fadeRing', 'in_blur', 'in_pixelDensity', 'in_color', 'in_sparkle_strength',
  'u_resolution', 'u_shape', 'u_hasMask', 'u_maskRadii',
];

/**
 * 共享离屏 WebGL2 渲染器：一个 context 渲染所有会话，宿主把结果 drawImage 进
 * 各自 2D canvas（asset-drop getSharedRippleRenderer 同构）。面幅随请求即时调整。
 */
export class WebGL2RippleRenderer {
  /** @param {HTMLCanvasElement} [canvas] */
  constructor(canvas) {
    this.canvas = canvas ?? document.createElement('canvas');
    let gl = null;
    try {
      gl = this.canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        preserveDrawingBuffer: false,
      });
    } catch (e) { /* WebGL2 不可用 → isSupported()=false，调用方走 CSS 兜底 */ }
    this.gl = gl;
    if (!gl) return;

    this.frameworkProgram = createProgram(gl, VERTEX_SHADER_GLSL, FRAMEWORK_FRAGMENT_SHADER_GLSL, FRAMEWORK_UNIFORM_NAMES);
    this.systemUiProgram = createProgram(gl, VERTEX_SHADER_GLSL, SYSTEMUI_FRAGMENT_SHADER_GLSL, SYSTEMUI_UNIFORM_NAMES);

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.quadVao = vao;
    this.quadVbo = vbo;
  }

  isSupported() { return this.gl !== null; }

  /**
   * 渲染全部未完成会话到离屏 canvas（物理像素 = CSS × dpr，dpr 不设钳制）。
   * @param {RippleSession[]} sessions @param {number} widthCss @param {number} heightCss
   * @param {number} dpr @param {number} nowMs
   */
  renderSessions(sessions, widthCss, heightCss, dpr, nowMs) {
    const gl = this.gl;
    if (!gl || !this.frameworkProgram || !this.systemUiProgram || !this.quadVao) return;

    const pw = Math.max(1, Math.round(widthCss * dpr));
    const ph = Math.max(1, Math.round(heightCss * dpr));
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }

    gl.viewport(0, 0, pw, ph);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (sessions.length === 0) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(this.quadVao);

    for (const session of sessions) {
      const { progress, rawProgress, noisePhase, elapsedMs } = session.computeState(nowMs);
      if (session.finished) continue;

      const cfg = session.config;
      const effDpr = cfg.dpr;
      const w = Math.max(1, cfg.width * effDpr);
      const h = Math.max(1, cfg.height * effDpr);

      if (cfg.mode === 'framework') {
        const { program, uniforms: u } = this.frameworkProgram;
        gl.useProgram(program);

        const autoRadius = Math.hypot(w * 0.5, h * 0.5);
        const radius = cfg.maxRadiusOverride && cfg.maxRadiusOverride > 0
          ? cfg.maxRadiusOverride * effDpr
          : autoRadius;

        gl.uniform1f(u.in_maxRadius, radius * AOSP_RADIUS_MULTIPLIER);
        gl.uniform2f(u.in_origin, cfg.originX * effDpr, cfg.originY * effDpr);
        gl.uniform2f(u.in_touch, cfg.touchX * effDpr, cfg.touchY * effDpr);
        gl.uniform1f(u.in_progress, progress);
        gl.uniform2f(u.in_resolutionScale, 1.0 / w, 1.0 / h);
        gl.uniform2f(u.in_noiseScale, cfg.densityScale / w, cfg.densityScale / h);
        gl.uniform1f(u.in_noisePhase, noisePhase * 0.001);
        gl.uniform1f(u.in_turbulencePhase, noisePhase);
        gl.uniform2f(u.in_tCircle1,
          TURBULENCE_SCALE * 0.5 + noisePhase * 0.01 * Math.cos(TURBULENCE_SCALE * 0.55),
          TURBULENCE_SCALE * 0.5 + noisePhase * 0.01 * Math.sin(TURBULENCE_SCALE * 0.55));
        gl.uniform2f(u.in_tCircle2,
          TURBULENCE_SCALE * 0.2 + noisePhase * -0.0066 * Math.cos(TURBULENCE_SCALE * 0.45),
          TURBULENCE_SCALE * 0.2 + noisePhase * -0.0066 * Math.sin(TURBULENCE_SCALE * 0.45));
        gl.uniform2f(u.in_tCircle3,
          TURBULENCE_SCALE + noisePhase * -0.0066 * Math.cos(TURBULENCE_SCALE * 0.35),
          TURBULENCE_SCALE + noisePhase * -0.0066 * Math.sin(TURBULENCE_SCALE * 0.35));

        const rotation1 = noisePhase * PI_ROTATE_RIGHT + 1.7 * Math.PI;
        const rotation2 = noisePhase * PI_ROTATE_LEFT + 2.0 * Math.PI;
        const rotation3 = noisePhase * PI_ROTATE_RIGHT + 2.75 * Math.PI;
        gl.uniform2f(u.in_tRotation1, Math.cos(rotation1), Math.sin(rotation1));
        gl.uniform2f(u.in_tRotation2, Math.cos(rotation2), Math.sin(rotation2));
        gl.uniform2f(u.in_tRotation3, Math.cos(rotation3), Math.sin(rotation3));

        gl.uniform4f(u.in_color, cfg.color.r, cfg.color.g, cfg.color.b, cfg.color.a);
        gl.uniform4f(u.in_sparkleColor, cfg.sparkleColor.r, cfg.sparkleColor.g, cfg.sparkleColor.b, cfg.sparkleColor.a);
        const radii = cfg.maskRadii ?? [cfg.maskRadius, cfg.maskRadius, cfg.maskRadius, cfg.maskRadius];
        gl.uniform1f(u.in_hasMask, cfg.hasMask ? 1.0 : 0.0);
        gl.uniform2f(u.u_resolution, w, h);
        gl.uniform4f(u.u_maskRadii, radii[0] * effDpr, radii[1] * effDpr, radii[2] * effDpr, radii[3] * effDpr);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      } else {
        const { program, uniforms: u } = this.systemUiProgram;
        gl.useProgram(program);

        // Android 17 SystemUI：最大扩散尺寸由调用方传入视图实际尺寸
        const autoMax = Math.max(w, h);
        const maxSizeW = cfg.maxRadiusOverride && cfg.maxRadiusOverride > 0
          ? cfg.maxRadiusOverride * 2.0 * effDpr
          : autoMax;
        const maxSizeH = cfg.systemUiShape === 'ellipse'
          ? maxSizeW * 0.68
          : cfg.systemUiShape === 'rounded_box'
            ? maxSizeW * (h / Math.max(w, 1))
            : maxSizeW;

        const curW = maxSizeW * progress;
        const curH = maxSizeH * progress;

        gl.uniform2f(u.in_center, cfg.touchX * effDpr, cfg.touchY * effDpr);
        gl.uniform2f(u.in_size, curW, curH);
        gl.uniform1f(u.in_thickness, curH * 0.5);
        gl.uniform1f(u.in_cornerRadius, Math.min(curW, curH));
        gl.uniform1f(u.in_time, elapsedMs);

        const dist = (1 - rawProgress) * cfg.distortionStrength;
        gl.uniform1f(u.in_distort_radial, 75.0 * rawProgress * dist);
        gl.uniform1f(u.in_distort_xy, 75.0 * dist);

        gl.uniform1f(u.in_fadeSparkle, getSystemUiFade(0, 0.1, 0.4, 1.0, rawProgress));
        gl.uniform1f(u.in_fadeRing, getSystemUiFade(0, 0.1, 0.3, 1.0, rawProgress));
        gl.uniform1f(u.in_fadeFill, getSystemUiFade(0, 0.0, 0.0, 0.6, rawProgress));
        gl.uniform1f(u.in_blur, 1.25 + (0.5 - 1.25) * progress);
        // Android 17 SystemUI pixelDensity = displayMetrics.density；Web 近似取渲染 dpr（诚实标注同上游）
        gl.uniform1f(u.in_pixelDensity, cfg.dpr);
        gl.uniform4f(u.in_color, cfg.color.r, cfg.color.g, cfg.color.b, cfg.color.a);
        gl.uniform1f(u.in_sparkle_strength, cfg.sparkleStrength);

        gl.uniform2f(u.u_resolution, w, h);
        const shapeInt = cfg.systemUiShape === 'circle' ? 0 : cfg.systemUiShape === 'rounded_box' ? 1 : 2;
        gl.uniform1i(u.u_shape, shapeInt);
        const radii = cfg.maskRadii ?? [cfg.maskRadius, cfg.maskRadius, cfg.maskRadius, cfg.maskRadius];
        gl.uniform1f(u.u_hasMask, cfg.hasMask ? 1.0 : 0.0);
        gl.uniform4f(u.u_maskRadii, radii[0] * effDpr, radii[1] * effDpr, radii[2] * effDpr, radii[3] * effDpr);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    }

    gl.bindVertexArray(null);
  }

  dispose() {
    const gl = this.gl;
    if (!gl) return;
    if (this.frameworkProgram) gl.deleteProgram(this.frameworkProgram.program);
    if (this.systemUiProgram) gl.deleteProgram(this.systemUiProgram.program);
    if (this.quadVbo) gl.deleteBuffer(this.quadVbo);
    if (this.quadVao) gl.deleteVertexArray(this.quadVao);
  }
}

/** @type {WebGL2RippleRenderer|null} */
let sharedOffscreenRenderer = null;

/** @returns {WebGL2RippleRenderer} 全站共享单例（惰性创建；WebGL2 缺席时 isSupported()=false） */
export function getSharedRippleRenderer() {
  if (!sharedOffscreenRenderer) sharedOffscreenRenderer = new WebGL2RippleRenderer();
  return sharedOffscreenRenderer;
}

/**
 * hex / rgb 串 → RGBA（0..1）。开关状态层从主题令牌取色用（--md-primary 等 hex 值）。
 * @param {string} css @param {number} [alphaOverride]
 * @returns {RippleColorRGBA}
 */
export function cssColorToRipple(css, alphaOverride) {
  const s = String(css).trim();
  let r = 0, g = 0, b = 0, a = 1;
  const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length === 8) {
      a = parseInt(h.slice(6, 8), 16) / 255;
      h = h.slice(0, 6);
    }
    r = parseInt(h.slice(0, 2), 16) / 255;
    g = parseInt(h.slice(2, 4), 16) / 255;
    b = parseInt(h.slice(4, 6), 16) / 255;
  } else {
    const rgb = /rgba?\(([^)]+)\)/i.exec(s);
    if (rgb) {
      const parts = rgb[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      r = (parts[0] || 0) / 255; g = (parts[1] || 0) / 255; b = (parts[2] || 0) / 255;
      if (parts.length > 3) a = parts[3] > 1 ? parts[3] / 255 : parts[3];
    }
  }
  return { r, g, b, a: alphaOverride != null ? alphaOverride : a };
}
