import{FAST_OUT_SLOW_IN as L,STANDARD as F}from"./interpolators.js";export const AOSP_ENTER_ANIM_DURATION=450,AOSP_EXIT_ANIM_DURATION=375,AOSP_NOISE_ANIMATION_DURATION=7e3,AOSP_MAX_NOISE_PHASE=Math.floor(AOSP_NOISE_ANIMATION_DURATION/214),AOSP_MAX_RIPPLES=10,AOSP_RADIUS_MULTIPLIER=2.3,AOSP_DENSITY_SCALE=2.1,AOSP_SYSTEMUI_DURATION=3e3;const C=Math.PI*.0078125,D=Math.PI*-.0078125,m=1.5,z=r=>Math.max(0,Math.min(1,r));function U(r,o,i){if(r===o)return i>r?1:0;const s=Math.min(r,o),l=Math.max(r,o);return(Math.min(Math.max(i,s),l)-r)/(o-r)}function P(r,o,i,s,l){const u=U(r,o,l),e=1-U(i,s,l);return Math.min(u,e)}export class RippleSession{constructor(o,i,s){this.id=o,this.config={...i},this.startTimeMs=s,this.releaseTimeMs=null,this.isHolding=!0,this.finished=!1,this._startPhaseSeed=s%1e4,this._lastTickMs=s,this._accumulatedElapsedMs=0,this._accumulatedAtReleaseMs=null}release(o){this.releaseTimeMs===null&&(this._advanceClock(o),this.releaseTimeMs=o,this._accumulatedAtReleaseMs=this._accumulatedElapsedMs,this.isHolding=!1)}_advanceClock(o){const i=Math.max(0,o-this._lastTickMs);this._lastTickMs=o;const s=Math.max(.05,this.config.speedMultiplier);return this._accumulatedElapsedMs+=i*s,this._accumulatedElapsedMs}computeState(o){const i=this._advanceClock(o);if(this.config.mode==="systemui"){const A=this.config.durationMs??AOSP_SYSTEMUI_DURATION,t=Math.min(1,Math.max(0,i/A)),c=F(t);return t>=1&&(this.finished=!0),{progress:c,rawProgress:t,noisePhase:i,elapsedMs:i,stage:t>=1?"DONE":t<.35?"ENTER":"EXIT"}}const s=Math.min(1,Math.max(0,i/AOSP_ENTER_ANIM_DURATION)),l=.5*L(s),u=Math.min(1,i/AOSP_NOISE_ANIMATION_DURATION),e=this._startPhaseSeed+AOSP_MAX_NOISE_PHASE*u;if(this._accumulatedAtReleaseMs===null)return{progress:l,rawProgress:s*.5,noisePhase:e,elapsedMs:i,stage:s<1?"ENTER":"HOLD"};const _=this._accumulatedAtReleaseMs,n=Math.max(AOSP_ENTER_ANIM_DURATION-_,0),f=_+n;if(i<f)return{progress:l,rawProgress:s*.5,noisePhase:e,elapsedMs:i,stage:"ENTER"};const g=i-f,h=Math.min(1,Math.max(0,g/AOSP_EXIT_ANIM_DURATION)),d=.5+.5*z(h);return h>=1&&(this.finished=!0),{progress:d,rawProgress:.5+.5*h,noisePhase:e,elapsedMs:i,stage:h>=1?"DONE":"EXIT"}}}const T=`#version 300 es
precision highp float;

layout(location = 0) in vec2 a_position;
out vec2 v_uv;

void main() {
  // Map clip-space [-1, 1] to top-left origin UV [0, 1] matching Android Canvas (y-down)
  v_uv = vec2((a_position.x + 1.0) * 0.5, 1.0 - (a_position.y + 1.0) * 0.5);
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`,H=`#version 300 es
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
`,B=`#version 300 es
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
`;function w(r,o,i){const s=r.createShader(o);if(!s)throw new Error("Failed to create WebGL shader");if(r.shaderSource(s,i),r.compileShader(s),!r.getShaderParameter(s,r.COMPILE_STATUS)){const l=r.getShaderInfoLog(s);throw r.deleteShader(s),new Error(`Shader compile error: ${l}`)}return s}function O(r,o,i,s){const l=w(r,r.VERTEX_SHADER,o),u=w(r,r.FRAGMENT_SHADER,i),e=r.createProgram();if(!e)throw new Error("Failed to create WebGL program");if(r.attachShader(e,l),r.attachShader(e,u),r.linkProgram(e),r.deleteShader(l),r.deleteShader(u),!r.getProgramParameter(e,r.LINK_STATUS)){const n=r.getProgramInfoLog(e);throw r.deleteProgram(e),new Error(`Program link error: ${n}`)}const _={};for(const n of s)_[n]=r.getUniformLocation(e,n);return{program:e,uniforms:_}}const V=["in_origin","in_touch","in_progress","in_maxRadius","in_resolutionScale","in_noiseScale","in_hasMask","in_noisePhase","in_turbulencePhase","in_tCircle1","in_tCircle2","in_tCircle3","in_tRotation1","in_tRotation2","in_tRotation3","in_color","in_sparkleColor","u_resolution","u_maskRadii"],G=["in_center","in_size","in_cornerRadius","in_thickness","in_time","in_distort_radial","in_distort_xy","in_fadeSparkle","in_fadeFill","in_fadeRing","in_blur","in_pixelDensity","in_color","in_sparkle_strength","u_resolution","u_shape","u_hasMask","u_maskRadii"];export class WebGL2RippleRenderer{constructor(o){this.canvas=o??document.createElement("canvas");let i=null;try{i=this.canvas.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,preserveDrawingBuffer:!1})}catch{}if(this.gl=i,!i)return;this.frameworkProgram=O(i,T,H,V),this.systemUiProgram=O(i,T,B,G);const s=i.createVertexArray(),l=i.createBuffer();i.bindVertexArray(s),i.bindBuffer(i.ARRAY_BUFFER,l),i.bufferData(i.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),i.STATIC_DRAW),i.enableVertexAttribArray(0),i.vertexAttribPointer(0,2,i.FLOAT,!1,0,0),i.bindVertexArray(null),this.quadVao=s,this.quadVbo=l}isSupported(){return this.gl!==null}renderSessions(o,i,s,l,u){const e=this.gl;if(!e||!this.frameworkProgram||!this.systemUiProgram||!this.quadVao)return;const _=Math.max(1,Math.round(i*l)),n=Math.max(1,Math.round(s*l));if((this.canvas.width!==_||this.canvas.height!==n)&&(this.canvas.width=_,this.canvas.height=n),e.viewport(0,0,_,n),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),o.length!==0){e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.bindVertexArray(this.quadVao);for(const f of o){const{progress:g,rawProgress:h,noisePhase:d,elapsedMs:A}=f.computeState(u);if(f.finished)continue;const t=f.config,c=t.dpr,p=Math.max(1,t.width*c),v=Math.max(1,t.height*c);if(t.mode==="framework"){const{program:y,uniforms:a}=this.frameworkProgram;e.useProgram(y);const E=Math.hypot(p*.5,v*.5),x=t.maxRadiusOverride&&t.maxRadiusOverride>0?t.maxRadiusOverride*c:E;e.uniform1f(a.in_maxRadius,x*AOSP_RADIUS_MULTIPLIER),e.uniform2f(a.in_origin,t.originX*c,t.originY*c),e.uniform2f(a.in_touch,t.touchX*c,t.touchY*c),e.uniform1f(a.in_progress,g),e.uniform2f(a.in_resolutionScale,1/p,1/v),e.uniform2f(a.in_noiseScale,t.densityScale/p,t.densityScale/v),e.uniform1f(a.in_noisePhase,d*.001),e.uniform1f(a.in_turbulencePhase,d),e.uniform2f(a.in_tCircle1,m*.5+d*.01*Math.cos(m*.55),m*.5+d*.01*Math.sin(m*.55)),e.uniform2f(a.in_tCircle2,m*.2+d*-.0066*Math.cos(m*.45),m*.2+d*-.0066*Math.sin(m*.45)),e.uniform2f(a.in_tCircle3,m+d*-.0066*Math.cos(m*.35),m+d*-.0066*Math.sin(m*.35));const M=d*C+1.7*Math.PI,k=d*D+2*Math.PI,S=d*C+2.75*Math.PI;e.uniform2f(a.in_tRotation1,Math.cos(M),Math.sin(M)),e.uniform2f(a.in_tRotation2,Math.cos(k),Math.sin(k)),e.uniform2f(a.in_tRotation3,Math.cos(S),Math.sin(S)),e.uniform4f(a.in_color,t.color.r,t.color.g,t.color.b,t.color.a),e.uniform4f(a.in_sparkleColor,t.sparkleColor.r,t.sparkleColor.g,t.sparkleColor.b,t.sparkleColor.a);const R=t.maskRadii??[t.maskRadius,t.maskRadius,t.maskRadius,t.maskRadius];e.uniform1f(a.in_hasMask,t.hasMask?1:0),e.uniform2f(a.u_resolution,p,v),e.uniform4f(a.u_maskRadii,R[0]*c,R[1]*c,R[2]*c,R[3]*c),e.drawArrays(e.TRIANGLES,0,6)}else{const{program:y,uniforms:a}=this.systemUiProgram;e.useProgram(y);const E=Math.max(p,v),x=t.maxRadiusOverride&&t.maxRadiusOverride>0?t.maxRadiusOverride*2*c:E,M=t.systemUiShape==="ellipse"?x*.68:t.systemUiShape==="rounded_box"?x*(v/Math.max(p,1)):x,k=x*g,S=M*g;e.uniform2f(a.in_center,t.touchX*c,t.touchY*c),e.uniform2f(a.in_size,k,S),e.uniform1f(a.in_thickness,S*.5),e.uniform1f(a.in_cornerRadius,Math.min(k,S)),e.uniform1f(a.in_time,A);const R=(1-h)*t.distortionStrength;e.uniform1f(a.in_distort_radial,75*h*R),e.uniform1f(a.in_distort_xy,75*R),e.uniform1f(a.in_fadeSparkle,P(0,.1,.4,1,h)),e.uniform1f(a.in_fadeRing,P(0,.1,.3,1,h)),e.uniform1f(a.in_fadeFill,P(0,0,0,.6,h)),e.uniform1f(a.in_blur,1.25+(.5-1.25)*g),e.uniform1f(a.in_pixelDensity,t.dpr),e.uniform4f(a.in_color,t.color.r,t.color.g,t.color.b,t.color.a),e.uniform1f(a.in_sparkle_strength,t.sparkleStrength),e.uniform2f(a.u_resolution,p,v);const N=t.systemUiShape==="circle"?0:t.systemUiShape==="rounded_box"?1:2;e.uniform1i(a.u_shape,N);const b=t.maskRadii??[t.maskRadius,t.maskRadius,t.maskRadius,t.maskRadius];e.uniform1f(a.u_hasMask,t.hasMask?1:0),e.uniform4f(a.u_maskRadii,b[0]*c,b[1]*c,b[2]*c,b[3]*c),e.drawArrays(e.TRIANGLES,0,6)}}e.bindVertexArray(null)}}dispose(){const o=this.gl;o&&(this.frameworkProgram&&o.deleteProgram(this.frameworkProgram.program),this.systemUiProgram&&o.deleteProgram(this.systemUiProgram.program),this.quadVbo&&o.deleteBuffer(this.quadVbo),this.quadVao&&o.deleteVertexArray(this.quadVao))}}let I=null;export function getSharedRippleRenderer(){return I||(I=new WebGL2RippleRenderer),I}export function cssColorToRipple(r,o){const i=String(r).trim();let s=0,l=0,u=0,e=1;const _=/^#([0-9a-f]{3,8})$/i.exec(i);if(_){let n=_[1];n.length===3&&(n=n.split("").map(f=>f+f).join("")),n.length===8&&(e=parseInt(n.slice(6,8),16)/255,n=n.slice(0,6)),s=parseInt(n.slice(0,2),16)/255,l=parseInt(n.slice(2,4),16)/255,u=parseInt(n.slice(4,6),16)/255}else{const n=/rgba?\(([^)]+)\)/i.exec(i);if(n){const f=n[1].split(/[,\s/]+/).filter(Boolean).map(Number);s=(f[0]||0)/255,l=(f[1]||0)/255,u=(f[2]||0)/255,f.length>3&&(e=f[3]>1?f[3]/255:f[3])}}return{r:s,g:l,b:u,a:o??e}}
