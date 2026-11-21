"use strict";import{AnimationUtils as h}from"./overscroller.js";class T{constructor(e,i,o,t){this.mX1=e,this.mY1=i,this.mX2=o,this.mY2=t}getInterpolation(e){return e<=0?0:e>=1?1:this.getBezierY(this.solveForX(e))}getBezierY(e){const i=1-e;return 3*i*i*e*this.mY1+3*i*e*e*this.mY2+e*e*e}getBezierX(e){const i=1-e;return 3*i*i*e*this.mX1+3*i*e*e*this.mX2+e*e*e}getSlopeX(e){const i=1-e;return 3*i*i*this.mX1+6*i*e*(this.mX2-this.mX1)+3*e*e*(1-this.mX2)}solveForX(e){let i=e;for(let r=0;r<8;r++){const s=this.getBezierX(i)-e;if(Math.abs(s)<1e-6)return i;const n=this.getSlopeX(i);if(Math.abs(n)<1e-6)break;i-=s/n}let o=0,t=1;i=e;for(let r=0;r<32;r++){const s=this.getBezierX(i);if(Math.abs(s-e)<1e-6)break;s<e?o=i:t=i,i=(o+t)/2}return i}}const m=450,d=375,g=7e3,S=g/214,C=new T(.4,0,.2,1);class M{constructor(e,i,o,t,r){this.originX=e,this.originY=i,this.touchX=o,this.touchY=t,this.mStartTime=r,this.progress=0,this.noisePhase=r,this.exiting=!1,this.exitRequestedAt=0,this.finished=!1}requestExit(e){this.exiting||(this.exiting=!0,this.exitRequestedAt=e,this.exitStartValue=this.progress)}update(e){const i=e-this.mStartTime;if(this.noisePhase=this.mStartTime+S*Math.min(i/g,1),this.exiting){const o=Math.max(m-(this.exitRequestedAt-this.mStartTime),0),t=this.exitRequestedAt+o,r=e-t;if(r>=0){const s=Math.min(r/d,1);this.progress=this.exitStartValue+(1-this.exitStartValue)*s,this.finished=r>=d}}else{const o=Math.min(i/m,1);this.progress=.5*C.getInterpolation(o)}}}const w=`
precision highp float;

uniform vec2  uOrigin;            // in_origin\uFF08\u6D9F\u6F2A\u539F\u70B9\uFF0C\u50CF\u7D20\uFF09
uniform vec2  uTouch;             // in_touch
uniform float uProgress;          // in_progress
uniform float uMaxRadius;         // in_maxRadius\uFF08setRadius \u5DF2\u4E58 2.3\uFF09
uniform vec2  uResolutionScale;   // in_resolutionScale = (1/w, 1/h)
uniform vec2  uNoiseScale;        // in_noiseScale = (2.1/w, 2.1/h)
uniform float uNoisePhase;        // in_noisePhase = phase * 0.001
uniform float uTurbulencePhase;   // in_turbulencePhase = phase
uniform vec2  uTCircle1;          // in_tCircle1..3
uniform vec2  uTCircle2;
uniform vec2  uTCircle3;
uniform vec2  uTRotation1;        // in_tRotation1..3\uFF08cos/sin \u5BF9\uFF09
uniform vec2  uTRotation2;
uniform vec2  uTRotation3;
uniform vec4  uColor;             // in_color\uFF08\u6CE2\u989C\u8272\uFF0C\u542B alpha\uFF09
uniform vec4  uSparkleColor;      // in_sparkleColor
uniform float uHasMask;           // in_hasMask\uFF080 = \u65E0\u906E\u7F69\uFF0C1 = \u6709\u906E\u7F69\uFF09
uniform vec4  uMaskRect;          // \u906E\u7F69\u77E9\u5F62\uFF08\u8BBE\u5907\u50CF\u7D20\uFF0Cy \u5411\u4E0B\uFF1Bxy=min, zw=max\uFF09
uniform float uMaskRadius;        // \u906E\u7F69\u5706\u89D2 px

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
varying vec2 vP;

void main() {
    // vP\uFF1A\u9876\u70B9\u63D2\u503C\u7684 buffer \u50CF\u7D20\u5750\u6807\uFF08y-down\uFF09\uFF0C\u66FF\u4EE3 gl_FragCoord \u7FFB\u8F6C
    // \uFF08Chrome \u2264127 \u4E0A gl_FragCoord \u4E0E viewport \u57DF\u5931\u914D\u81F4\u6D9F\u6F2A\u504F\u4E0A\uFF0Cv8.07 \u4FEE\u590D\uFF09
    vec2 p = vP;

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
    // in_hasMask = 0 \u2192 mask = 1\uFF1B= 1 \u65F6\u7531\u5BBF\u4E3B\u63D0\u4F9B\u906E\u7F69\u3002
    // Web \u96C6\u6210\uFF1A\u5BBF\u4E3B\u65E0 in_shader \u7EB9\u7406\uFF0C\u906E\u7F69\u9000\u5316\u4E3A\u5706\u89D2\u77E9\u5F62 SDF\uFF08\u5143\u7D20 bounds + \u5706\u89D2\uFF0C
    // 1.5px \u8F6F\u8FB9\u6297\u952F\u9F7F\uFF09\u2014\u2014 \u5BF9\u5E94 RippleDrawable \u4EE5 View \u8FB9\u754C\u4E3A\u6D9F\u6F2A\u906E\u7F69\u7684\u884C\u4E3A\u3002
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
`,I=`
attribute vec2 aPos;
uniform vec2 uBufSize;
varying vec2 vP;
void main() {
  // buffer \u50CF\u7D20\u57DF\uFF08y-down\uFF0CAndroid \u50CF\u7D20\u7EA6\u5B9A\uFF09\u7531\u9876\u70B9\u63D2\u503C\u76F4\u63A5\u7ED9\u51FA\u3002
  // \u65E7\u5B9E\u73B0\u4E8E fragment \u7528 vec2(gl_FragCoord.x, uH - gl_FragCoord.y) \u7FFB\u8F6C \u2014\u2014
  // \u4F9D\u8D56\u201Cgl_FragCoord \u57DF = gl.viewport \u57DF\u201D\u7684\u5185\u6838\u884C\u4E3A\uFF0CChrome \u2264127\uFF08\u90E8\u5206
  // ANGLE/GLES \u540E\u7AEF\uFF09\u5B9E\u6D4B Y \u57DF\u5931\u914D \u2192 \u6D9F\u6F2A\u5927\u5E45\u504F\u4E0A\uFF1B\u9876\u70B9\u63D2\u503C\u7EAF\u6570\u5B66\uFF0C\u5168\u5185\u6838\u4E00\u81F4\u3002
  vP = vec2((aPos.x + 1.0) * 0.5 * uBufSize.x, (1.0 - aPos.y) * 0.5 * uBufSize.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`,x=Math.PI*.0078125,k=Math.PI*-.0078125;function A(a){const i=[.75+a*.01*Math.cos(.8250000000000001),.75+a*.01*Math.sin(.8250000000000001)],o=[1.5*.2+a*-.0066*Math.cos(1.5*.45),1.5*.2+a*-.0066*Math.sin(1.5*.45)],t=[1.5+a*-.0066*Math.cos(1.5*.35),1.5+a*-.0066*Math.sin(1.5*.35)],r=a*x+1.7*Math.PI,s=a*k+2*Math.PI,n=a*x+2.75*Math.PI;return{tCircle1:i,tCircle2:o,tCircle3:t,tRotation1:[Math.cos(r),Math.sin(r)],tRotation2:[Math.cos(s),Math.sin(s)],tRotation3:[Math.cos(n),Math.sin(n)]}}function v(a){return[(a>>>16&255)/255,(a>>>8&255)/255,(a&255)/255,(a>>>24&255)/255]}class E{constructor(e,{color:i=1946157055,sparkleColor:o=3875536895}={}){this.mCanvas=e,this.mColor=i,this.mSparkleColor=o,this.mSessions=[],this.mDownPointers=new Map;const t=e.getContext("webgl",{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(this.mGl=t,!t){this.mSupported=!1;return}this.mSupported=!0;const r=(f,b)=>{const c=t.createShader(f);if(t.shaderSource(c,b),t.compileShader(c),!t.getShaderParameter(c,t.COMPILE_STATUS))throw new Error("shader: "+t.getShaderInfoLog(c));return c},s=t.createProgram();if(t.attachShader(s,r(t.VERTEX_SHADER,I)),t.attachShader(s,r(t.FRAGMENT_SHADER,w)),t.linkProgram(s),!t.getProgramParameter(s,t.LINK_STATUS))throw new Error("link: "+t.getProgramInfoLog(s));t.useProgram(s),this.mProg=s;const n=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,n),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW);const R=t.getAttribLocation(s,"aPos");t.enableVertexAttribArray(R),t.vertexAttribPointer(R,2,t.FLOAT,!1,0,0),t.enable(t.BLEND),t.blendFunc(t.ONE,t.ONE_MINUS_SRC_ALPHA),t.clearColor(0,0,0,0),this.mU={};for(const f of["uOrigin","uTouch","uProgress","uMaxRadius","uResolutionScale","uNoiseScale","uNoisePhase","uTurbulencePhase","uTCircle1","uTCircle2","uTCircle3","uTRotation1","uTRotation2","uTRotation3","uColor","uSparkleColor","uHasMask","uBufSize","uMaskRect","uMaskRadius"])this.mU[f]=t.getUniformLocation(s,f);const p=window.devicePixelRatio||1,_=e.getBoundingClientRect(),u=e.width=(_.width||e.clientWidth||1)*p,l=e.height=(_.height||e.clientHeight||1)*p,P=2.1;t.uniform2f(this.mU.uResolutionScale,1/u,1/l),t.uniform2f(this.mU.uNoiseScale,P/u,P/l),t.uniform2f(this.mU.uBufSize,u,l),t.uniform4fv(this.mU.uColor,v(i)),t.uniform4fv(this.mU.uSparkleColor,v(o)),t.uniform1f(this.mU.uHasMask,0),this.mOriginX=u/2,this.mOriginY=l/2,this.mMaxRadius=Math.hypot(u/2,l/2)*2.3,t.uniform1f(this.mU.uMaxRadius,this.mMaxRadius),t.uniform2f(this.mU.uOrigin,this.mOriginX,this.mOriginY),t.viewport(0,0,1,1),t.uniform1f(this.mU.uProgress,.5),t.uniform1f(this.mU.uNoisePhase,0),t.uniform1f(this.mU.uTurbulencePhase,0),t.drawArrays(t.TRIANGLE_STRIP,0,4),t.clear(t.COLOR_BUFFER_BIT),this._raf=this._raf.bind(this),this._running=!1}onTouchDown(e,i,o){const t=window.devicePixelRatio||1,r=h.currentAnimationTimeMillis(),s=new M(this.mOriginX,this.mOriginY,i*t,o*t,r);this.mSessions.push(s),this.mDownPointers.set(e,s),this._ensureLoop()}onTouchUp(e){const i=this.mDownPointers.get(e);i&&(i.requestExit(h.currentAnimationTimeMillis()),this.mDownPointers.delete(e))}onTouchMove(e,i,o){const t=this.mDownPointers.get(e);if(t){const r=window.devicePixelRatio||1;t.touchX=i*r,t.touchY=o*r}}_ensureLoop(){this._running||(this._running=!0,requestAnimationFrame(this._raf))}_raf(){const e=this.mGl,i=h.currentAnimationTimeMillis();e.viewport(0,0,this.mCanvas.width,this.mCanvas.height),e.clear(e.COLOR_BUFFER_BIT),this.mSessions=this.mSessions.filter(o=>{if(o.update(i),o.finished)return!1;(!o.exiting||o.turbCache===void 0)&&(o.turbCache=A(o.noisePhase));const t=o.turbCache;return e.uniform2f(this.mU.uTouch,o.touchX,o.touchY),e.uniform1f(this.mU.uProgress,o.progress),e.uniform1f(this.mU.uNoisePhase,o.noisePhase*.001),e.uniform1f(this.mU.uTurbulencePhase,o.noisePhase),e.uniform2f(this.mU.uTCircle1,t.tCircle1[0],t.tCircle1[1]),e.uniform2f(this.mU.uTCircle2,t.tCircle2[0],t.tCircle2[1]),e.uniform2f(this.mU.uTCircle3,t.tCircle3[0],t.tCircle3[1]),e.uniform2f(this.mU.uTRotation1,t.tRotation1[0],t.tRotation1[1]),e.uniform2f(this.mU.uTRotation2,t.tRotation2[0],t.tRotation2[1]),e.uniform2f(this.mU.uTRotation3,t.tRotation3[0],t.tRotation3[1]),e.drawArrays(e.TRIANGLE_STRIP,0,4),!0}),this.mSessions.length>0||this.mDownPointers.size>0?requestAnimationFrame(this._raf):this._running=!1}}export{T as PathInterpolatorCubic,M as RippleAnimationSession,E as ExpressiveRippleSurface,A as computeTurbulenceUniforms,v as colorToVec4,C as FAST_OUT_SLOW_IN,m as ENTER_ANIM_DURATION,d as EXIT_ANIM_DURATION,g as NOISE_ANIMATION_DURATION,S as MAX_NOISE_PHASE};
