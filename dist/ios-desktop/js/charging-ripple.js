import{isReduceMotionActive as V}from"./aosp/a11y-settings.js";const W=1750,q=115/255,J=.3,g=.2,v=0,S=0,P=1,k=3*g-3*S+1,T=3*S-6*g,w=3*g,j=3*v-3*P+1,Q=3*P-6*v,Z=3*v;function b(t){return((k*t+T)*t+w)*t}function $(t){return((j*t+Q)*t+Z)*t}function ee(t){let n=t;for(let r=0;r<8;r++){const a=b(n)-t,i=(3*k*n+2*T)*n+w;if(Math.abs(a)<1e-6)break;n-=a/i}if(n=Math.min(1,Math.max(0,n)),Math.abs(b(n)-t)>.001){let r=0,a=1;n=t;for(let i=0;i<32;i++){const e=(r+a)/2;b(e)<t?r=e:a=e,n=(r+a)/2}}return $(n)}function I(t,n,r){if(t===n)return r>t?1:0;const a=Math.min(t,n),i=Math.max(t,n);return(Math.min(Math.max(r,a),i)-t)/(n-t)}function y(t,n){return Math.min(I(t[0],t[1],n),1-I(t[2],t[3],n))}const te=[0,.1,.3,1],ne=[0,.1,.4,1],re=[0,0,0,.6],ie=`#version 300 es
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
}`,oe=`#version 300 es
layout(location=0) in vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0., 1.); }`;function M(){try{const t=document.createElement("div");t.style.color="var(--md-primary)",t.style.display="none",document.body.appendChild(t);const n=getComputedStyle(t).color;t.remove();const r=/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(n||"");if(r)return[Number(r[1])/255,Number(r[2])/255,Number(r[3])/255]}catch{}return[27/255,114/255,200/255]}let p=0,R=!1,m=0;const A="ios-desktop:ripple-config-v1";(function(){try{if(localStorage.getItem(A)===null){var t=localStorage.getItem("rippleCfg_v1");t!==null&&(localStorage.setItem(A,t),localStorage.removeItem("rippleCfg_v1"))}}catch{}})();function ae(){const t={portPhone:"bc",portTablet:"lc",color:""};try{const n=localStorage.getItem(A);if(!n)return t;const r=JSON.parse(n)||{};return{portPhone:["bc","br","cc"].includes(r.portPhone)?r.portPhone:t.portPhone,portTablet:["lc","rc"].includes(r.portTablet)?r.portTablet:t.portTablet,color:typeof r.color=="string"?r.color:t.color}}catch{return t}}function le(t,n,r){const a=r>=n,i=a?{bc:[.5,1],br:[.82,1],cc:[.5,.5]}:{lc:[0,.5],rc:[1,.5]},[e,u]=i[a?t.portPhone:t.portTablet]||i[a?"bc":"lc"];return{cx:n*e,cy:r*u}}function N(t){const n=!!(t&&t.force);if(R)return;const r=typeof performance<"u"?performance.now():Date.now(),a=2e3*Math.pow(2,Math.min(m,3));if(!n&&p&&r-p<a){m=Math.min(3,m+1),p=r;return}if(m=0,p=r,typeof document>"u"||document.hidden)return;try{if(V())return}catch{}const i=document.createElement("canvas");i.setAttribute("aria-hidden","true"),i.style.cssText="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:98500;",document.body.appendChild(i);const e=i.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(!e){try{i.remove()}catch{}return}const u=Math.min(typeof window<"u"&&window.devicePixelRatio||1,3);i.width=Math.round(window.innerWidth*u),i.height=Math.round(window.innerHeight*u),e.viewport(0,0,i.width,i.height);function x(l,s){const c=e.createShader(l);return e.shaderSource(c,s),e.compileShader(c),c}const f=e.createProgram();if(e.attachShader(f,x(e.VERTEX_SHADER,oe)),e.attachShader(f,x(e.FRAGMENT_SHADER,ie)),e.linkProgram(f),!e.getProgramParameter(f,e.LINK_STATUS)){try{i.remove()}catch{}return}e.useProgram(f);const L=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,L),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA);const o={};for(const l of["in_center","in_size","in_cornerRadius","in_thickness","in_time","in_distort_radial","in_distort_xy","in_fadeSparkle","in_fadeFill","in_fadeRing","in_blur","in_pixelDensity","in_color","in_sparkle_strength","u_resolution"])o[l]=e.getUniformLocation(f,l);const _=ae(),h=_.color?(()=>{const l=_.color.split(",").map(s=>Number(s)/255);return l.length===3&&l.every(s=>Number.isFinite(s))?l:M()})():M(),C=le(_,i.width,i.height),D=C.cx,B=C.cy,H=Math.max(i.width,i.height)*2,O=r;R=!0;function E(l){const s=l-O,c=Math.min(1,s/W);if(c>=1||!i.isConnected){R=!1,e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT);try{i.remove()}catch{}return}const F=ee(c),Y=y(ne,c),G=y(te,c),U=y(re,c),d=H*F,X=1.25+(.5-1.25)*F,z=75*c*(1-c),K=75*(1-c);e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),e.uniform2f(o.in_center,D,B),e.uniform2f(o.in_size,d,d),e.uniform1f(o.in_cornerRadius,d),e.uniform1f(o.in_thickness,d*.5),e.uniform1f(o.in_time,s),e.uniform1f(o.in_distort_radial,z),e.uniform1f(o.in_distort_xy,K),e.uniform1f(o.in_fadeSparkle,Y),e.uniform1f(o.in_fadeFill,U),e.uniform1f(o.in_fadeRing,G),e.uniform1f(o.in_blur,X),e.uniform1f(o.in_pixelDensity,u),e.uniform4f(o.in_color,h[0],h[1],h[2],q),e.uniform1f(o.in_sparkle_strength,J),e.uniform2f(o.u_resolution,i.width,i.height),e.drawArrays(e.TRIANGLES,0,3),requestAnimationFrame(E)}requestAnimationFrame(E)}export function initChargingRipple(){typeof document>"u"||document.addEventListener("battery-charging-started",()=>N())}export function playChargingRipplePreview(){typeof document>"u"||N({force:!0})}
