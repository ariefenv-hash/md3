// ==================== charging-ripple.js — 充电涟漪（v7.74，issue #9 组件移植之一） ====================
//
// 来源：Android SystemUI WiredChargingRippleController / RippleView / RippleShader
// 的 1:1 Web 移植（AGSL → GLSL ES 3.00），参考件为 issue #9 附件 1.html。
// 移植后升级为系统级组件：
//   • 触发源 = battery-service.applyState 的充电沿（真实 Battery API 与模拟充电器共用）
//   • 涟漪起点 = 底部中央（physical_charger_port_location 语义）
//   • 涟漪颜色 = 主题 --md-primary（对应官方 ?android:attr/colorAccent）
//   • 层级 98500：盖过锁屏内容（AOSP 即在锁屏之上播放），低于手电筒遮罩 99999
//   • 纪律：prefers-reduced-motion 不播；WebGL2 缺失静默跳过；页签隐藏不播；
//     仅播放期占用 rAF，播放完自回收（画布移除、回调解除）。
//
// 官方常数（frameworks/base SystemUI）：1750ms 线性时长 · STANDARD =
// PathInterpolator(0.2,0,0,1) 只作用于尺寸/模糊 · fades 用线性 rawProgress ·
// baseRing 0→0.1/0.3→1 · sparkleRing 0→0.1/0.4→1 · centerFill 0→0.6 ·
// blur 1.25→0.5 · distort_radial=75·raw·(1-raw) · distort_xy=75·(1-raw) ·
// alpha 115/255 · sparkle 0.3 · maxDiameter = 2·max(w,h)

const DURATION = 1750;
const RIPPLE_ALPHA = 115 / 255;
const SPARKLE_STRENGTH = 0.3;

// PathInterpolator(0.2f, 0f, 0f, 1f) —— Interpolators.STANDARD（牛顿迭代 + 二分兜底）
const CX1 = 0.2, CY1 = 0, CX2 = 0, CY2 = 1;
const AX = 3 * CX1 - 3 * CX2 + 1, BX = 3 * CX2 - 6 * CX1, CXP = 3 * CX1;
const AY = 3 * CY1 - 3 * CY2 + 1, BY = 3 * CY2 - 6 * CY1, CYP = 3 * CY1;
function bezierX(t) { return ((AX * t + BX) * t + CXP) * t; }
function bezierY(t) { return ((AY * t + BY) * t + CYP) * t; }
function standardEasing(x) {
  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = bezierX(t) - x, d = (3 * AX * t + 2 * BX) * t + CXP;
    if (Math.abs(err) < 1e-6) break;
    t -= err / d;
  }
  t = Math.min(1, Math.max(0, t));
  if (Math.abs(bezierX(t) - x) > 1e-3) {
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; (bezierX(m) < x) ? (lo = m) : (hi = m); t = (lo + hi) / 2; }
  }
  return bezierY(t);
}
function subProgress(start, end, p) {
  if (start === end) return p > start ? 1 : 0;
  const lo = Math.min(start, end), hi = Math.max(start, end);
  const s = Math.min(Math.max(p, lo), hi);
  return (s - start) / (end - start);
}
function getFade(fp, raw) {
  return Math.min(subProgress(fp[0], fp[1], raw), 1 - subProgress(fp[2], fp[3], raw));
}
const FADE_BASE_RING = [0, 0.1, 0.3, 1];
const FADE_SPARKLE_RING = [0, 0.1, 0.4, 1];
const FADE_CENTER_FILL = [0, 0, 0, 0.6];

// RippleShader(CIRCLE) + ShaderUtilLibrary + SdfShaderLibrary（GLSL ES 3.00，与参考件逐字一致）
const FRAG = `#version 300 es
precision highp float;

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

uniform vec2 u_resolution;
out vec4 fragColor;

float triangleNoise(vec2 n) {
    n  = fract(n * vec2(5.3987, 5.4421));
    n += dot(n.yx, n.xy + vec2(21.5351, 14.3137));
    float xy = n.x * n.y;
    return fract(xy * 95.4307) + fract(xy * 75.04961) - 1.0;
}

const float PI = 3.1415926535897932384626;

float sparkles(vec2 uv, float t) {
    float n = triangleNoise(uv);
    float s = 0.0;
    for (float i = 0.; i < 4.; i += 1.) {
        float l = i * 0.01;
        float h = l + 0.1;
        float o = smoothstep(n - l, h, n);
        o *= abs(sin(PI * o * (t + 0.55 * i)));
        s += o;
    }
    return s;
}

vec2 distort(vec2 p, float time, float distort_amount_radial,
    float distort_amount_xy) {
        float angle = atan(p.y, p.x);
          return p + vec2(sin(angle * 8.0 + time * 0.003 + 1.641),
                    cos(angle * 5.0 + 2.14 + time * 0.00412)) * distort_amount_radial
             + vec2(sin(p.x * 0.01 + time * 0.00215 + 0.8123),
                    cos(p.y * 0.01 + time * 0.005931)) * distort_amount_xy;
}

vec3 screen(vec3 dest, vec3 src) {
    return dest + src - dest * src;
}

float soften(float d, float blur) {
    float blurHalf = blur * 0.5;
    return smoothstep(-blurHalf, blurHalf, d);
}

float subtract(float outer, float inner) {
    return max(outer, -inner);
}

float sdCircle(vec2 p, float r) {
    return (length(p)-r) / r;
}

float circleRing(vec2 p, float radius) {
    float thicknessHalf = radius * 0.25;

    float outerCircle = sdCircle(p, radius + thicknessHalf);
    float innerCircle = sdCircle(p, radius);

    return subtract(outerCircle, innerCircle);
}

void main() {
    vec2 p = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);

    vec2 p_distorted = distort(p, in_time, in_distort_radial, in_distort_xy);
    float radius = in_size.x * 0.5;
    float sparkleRing = soften(circleRing(p_distorted-in_center, radius), in_blur);
    float inside = soften(sdCircle(p_distorted-in_center, radius * 1.25), in_blur);
    float sparkle = sparkles(p - mod(p, in_pixelDensity * 0.8), in_time * 0.00175)
        * (1.-sparkleRing) * in_fadeSparkle;

    float rippleInsideAlpha = (1.-inside) * in_fadeFill;
    float rippleRingAlpha = (1.-sparkleRing) * in_fadeRing;
    float rippleAlpha = max(rippleInsideAlpha, rippleRingAlpha) * in_color.a;
    vec4 ripple = vec4(in_color.rgb, 1.0) * rippleAlpha;
    fragColor = mix(ripple, vec4(sparkle), sparkle * in_sparkle_strength);
}`;

const VERT = `#version 300 es
layout(location=0) in vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0., 1.); }`;

/** 读取主题强调色（--md-primary）为 RGB 三元组；解析失败回退官方 Pixel 蓝 */
function readAccentRGB() {
  try {
    const probe = document.createElement('div');
    probe.style.color = 'var(--md-primary)';
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(c || '');
    if (m) return [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255];
  } catch (e) { /* 主题读取失败走回退 */ }
  return [0x1b / 255, 0x72 / 255, 0xc8 / 255];
}

let lastTriggerAt = 0;
let playing = false;
let debounceLevel = 0;

// ==================== v7.80 充电涟漪可配置（用户升级件对齐） ====================
// localStorage rippleCfg_v1 = { portPhone: 'bc'|'br'|'cc', portTablet: 'lc'|'rc', color: ''|'r,g,b' }
// portPhone：bc=底部中央（官方 physical_charger_port_location）/ br=底部偏右 / cc=屏幕中央
// portTablet：lc=左侧中央 / rc=右侧中央（平板/横屏充电口在侧边，用户演示件同款）
// color：空 = 跟随主题 --md-primary；非空 = 'r,g,b' 自定义
const RIPPLE_CFG_KEY = 'rippleCfg_v1';
function readRippleCfg() {
  const def = { portPhone: 'bc', portTablet: 'lc', color: '' };
  try {
    const raw = localStorage.getItem(RIPPLE_CFG_KEY);
    if (!raw) return def;
    const v = JSON.parse(raw) || {};
    return {
      portPhone: ['bc', 'br', 'cc'].includes(v.portPhone) ? v.portPhone : def.portPhone,
      portTablet: ['lc', 'rc'].includes(v.portTablet) ? v.portTablet : def.portTablet,
      color: typeof v.color === 'string' ? v.color : def.color,
    };
  } catch (e) { return def; }
}
function resolveOrigin(cfg, w, h) {
  const portrait = h >= w; // 竖屏 = 手机形态（底部充电口），横屏 = 平板形态（侧边充电口）
  const map = portrait
    ? { bc: [0.5, 1.0], br: [0.82, 1.0], cc: [0.5, 0.5] }
    : { lc: [0.0, 0.5], rc: [1.0, 0.5] };
  const [fx, fy] = map[portrait ? cfg.portPhone : cfg.portTablet] || map[portrait ? 'bc' : 'lc'];
  return { cx: w * fx, cy: h * fy };
}

/**
 * 播放一次充电涟漪。
 * @param {{force?: boolean}} opts force=true（设置预览）跳过防抖退避，但仍尊重 playing/reduced-motion
 */
function playRipple(opts) {
  const force = !!(opts && opts.force);
  if (playing) return;
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  // 防抖退避（用户演示件同款）：2s×2^level 指数退避，连点不重播（充电口接触不良场景）
  const interval = 2000 * Math.pow(2, Math.min(debounceLevel, 3));
  if (!force && lastTriggerAt && now - lastTriggerAt < interval) {
    debounceLevel = Math.min(3, debounceLevel + 1);
    lastTriggerAt = now;
    return;
  }
  debounceLevel = 0;
  lastTriggerAt = now;
  if (typeof document === 'undefined' || document.hidden) return;
  try {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  } catch (e) { /* 按未开启处理 */ }

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:98500;';
  document.body.appendChild(canvas);
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) { try { canvas.remove(); } catch (e) {} return; } // WebGL2 缺失：静默降级

  const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 3);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  gl.viewport(0, 0, canvas.width, canvas.height);

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    try { canvas.remove(); } catch (e) {} return;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const U = {};
  for (const n of ['in_center', 'in_size', 'in_cornerRadius', 'in_thickness', 'in_time',
    'in_distort_radial', 'in_distort_xy', 'in_fadeSparkle', 'in_fadeFill',
    'in_fadeRing', 'in_blur', 'in_pixelDensity', 'in_color',
    'in_sparkle_strength', 'u_resolution']) U[n] = gl.getUniformLocation(prog, n);

  const cfg = readRippleCfg();
  const colorRGB = cfg.color
    ? (() => { const p = cfg.color.split(',').map((n) => Number(n) / 255); return p.length === 3 && p.every((x) => Number.isFinite(x)) ? p : readAccentRGB(); })()
    : readAccentRGB();
  // 涟漪起点：随横竖屏解析配置位置（v7.80：竖屏底部中央/底部偏右/屏幕中央，横屏侧边中央）
  const origin = resolveOrigin(cfg, canvas.width, canvas.height);
  const cx = origin.cx;
  const cy = origin.cy;
  const maxDiameter = Math.max(canvas.width, canvas.height) * 2;
  const startTime = now;

  playing = true;
  function frame(ts) {
    const elapsed = ts - startTime;
    const raw = Math.min(1, elapsed / DURATION);
    if (raw >= 1 || !canvas.isConnected) {
      playing = false;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      try { canvas.remove(); } catch (e) {}
      return;
    }
    const eased = standardEasing(raw);
    const fadeSparkle = getFade(FADE_SPARKLE_RING, raw);
    const fadeRing = getFade(FADE_BASE_RING, raw);
    const fadeFill = getFade(FADE_CENTER_FILL, raw);
    const curW = maxDiameter * eased;
    const blur = 1.25 + (0.5 - 1.25) * eased;
    const distortRadial = 75 * raw * (1 - raw);
    const distortXY = 75 * (1 - raw);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(U.in_center, cx, cy);
    gl.uniform2f(U.in_size, curW, curW); // 官方 CIRCLE：等宽高（RippleView 以 max(w,h) 驱动）
    gl.uniform1f(U.in_cornerRadius, curW);
    gl.uniform1f(U.in_thickness, curW * 0.5);
    gl.uniform1f(U.in_time, elapsed);
    gl.uniform1f(U.in_distort_radial, distortRadial);
    gl.uniform1f(U.in_distort_xy, distortXY);
    gl.uniform1f(U.in_fadeSparkle, fadeSparkle);
    gl.uniform1f(U.in_fadeFill, fadeFill);
    gl.uniform1f(U.in_fadeRing, fadeRing);
    gl.uniform1f(U.in_blur, blur);
    gl.uniform1f(U.in_pixelDensity, dpr);
    gl.uniform4f(U.in_color, colorRGB[0], colorRGB[1], colorRGB[2], RIPPLE_ALPHA);
    gl.uniform1f(U.in_sparkle_strength, SPARKLE_STRENGTH);
    gl.uniform2f(U.u_resolution, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/** 安装：监听 battery-service 的充电沿事件（applyState 统一漏斗） */
export function initChargingRipple() {
  if (typeof document === 'undefined') return;
  document.addEventListener('battery-charging-started', () => playRipple());
}

/** v7.80 设置页预览入口：跳过防抖立即播一次（不依赖真实充电沿） */
export function playChargingRipplePreview() {
  if (typeof document === 'undefined') return;
  playRipple({ force: true });
}
