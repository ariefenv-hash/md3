// =============================================================================
// avd-runtime.mjs — AOSP VectorDrawable / AnimatedVectorDrawable 三层运行时
//
// 逐字执行 Google Clock 9.3 (1003616371) base.apk 的 AXML 原始资源：
//   ① <vector>              → SVG <g name> / <path name pathData>
//   ② <animated-vector>     → <target name="..."> 绑定到 SVG 元素
//   ③ <objectAnimator>      → 时间轴插值（pathData morph / rotation / scale /
//                              translateX / translateXY）+ <pathInterpolator>
//                              三次贝塞尔缓动
//
// 不是 CSS keyframes、不是「换两张图」：53 个 objectAnimator / 12 段 pathData
// 形变 / 46 条 pathInterpolator 曲线全部来自 #330 反编译证据卷。
// =============================================================================

import { GASTOWN93_TABS } from './gastown93-assets.mjs';

const SVGNS = 'http://www.w3.org/2000/svg';
const NUMRE = /-?\d*\.?\d+(?:[eE][-+]?\d+)?/g;
// Web SVG 兼容层：9.3 AE 导出有 11 段 pathData 含「孤立相对命令字母」——
// 收尾型 "...,-5.57c"（SVG 报 Unexpected end of attribute）与中段型
// "...,-8,8c  M2.83"（SVG 报 Expected number）。AXML 允许而 SVG 不允许。
// 仅删除后随另一命令字母或字符串结尾的无参命令字母；全部数值、正常命令
// 与 Z/z 闭合命令逐字保留，原始资产零改写。
function safePathData(d) {
  return String(d == null ? '' : d).replace(/([a-yA-Y])\s*(?=[a-zA-Z]|$)/g, '').trim();
}

// ---- ③ pathInterpolator：M 0,0 c x1,y1 x2,y2 1,1 → cubic-bezier(t) ----
const EASE_CACHE = new Map();
export function makeEasing(c) {
  if (!c || c.length !== 4) return (x) => x;
  const key = c.join(',');
  if (EASE_CACHE.has(key)) return EASE_CACHE.get(key);
  const [x1, y1, x2, y2] = c;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  const fn = (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 10; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-7) break;
      t -= e / d;
    }
    t = Math.max(0, Math.min(1, t));
    return sy(t);
  };
  EASE_CACHE.set(key, fn);
  return fn;
}

// ---- ③ pathData morph：AE 导出保证 valueFrom/valueTo 命令序列同构 ----
export function morphPath(from, to, p) {
  if (typeof from !== 'string' || typeof to !== 'string') return p < 0.5 ? from : to;
  const A = from.match(NUMRE) || [];
  const B = to.match(NUMRE) || [];
  if (A.length !== B.length || A.length === 0) return p < 0.5 ? from : to;
  let i = 0;
  return from.replace(NUMRE, () => {
    const v = Number(A[i]) + (Number(B[i]) - Number(A[i])) * p;
    i++;
    return (Math.round(v * 10000) / 10000).toString();
  });
}

function lerpValue(from, to, p, prop) {
  if (prop === 'pathData') return morphPath(from, to, p);
  if (prop === 'translateXY') {
    const a = Array.isArray(from) ? from : [0, 0];
    const b = Array.isArray(to) ? to : [0, 0];
    return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];
  }
  const a = Number(from) || 0, b = Number(to) || 0;
  return a + (b - a) * p;
}

function applyProp(state, prop, val) {
  switch (prop) {
    case 'pathData': state.pathData = val; break;
    case 'rotation': state.rotation = val; break;
    case 'scaleX': state.scaleX = val; break;
    case 'scaleY': state.scaleY = val; break;
    case 'translateX': state.tx = val; break;
    case 'translateY': state.ty = val; break;
    case 'translateXY': state.tx = val[0]; state.ty = val[1]; break;
    case 'fillAlpha': state.fillAlpha = val; break;
    case 'trimPathEnd': state.trimPathEnd = val; break;
    default: break;
  }
}

// ---- ① <vector> → SVG DOM ----
function setTransform(el, base, dyn) {
  const tx = dyn.tx ?? base.translateX;
  const ty = dyn.ty ?? base.translateY;
  const r = dyn.rotation ?? base.rotation;
  const sx = dyn.scaleX ?? base.scaleX;
  const sy = dyn.scaleY ?? base.scaleY;
  const px = base.pivotX || 0, py = base.pivotY || 0;
  el.setAttribute(
    'transform',
    `translate(${tx} ${ty}) rotate(${r} ${px} ${py}) scale(${sx} ${sy})`
  );
}

export function buildVector(vec) {
  const vw = vec.viewport || 24, vh = vec.viewportH || vw;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  svg.setAttribute('class', 'gastown-avd-svg');
  svg.setAttribute('aria-hidden', 'true');
  const index = new Map();

  const walk = (nodes, parent) => {
    for (const n of nodes) {
      if (n.t === 'g') {
        const g = document.createElementNS(SVGNS, 'g');
        g.setAttribute('data-avd-name', n.name || '');
        const base = {
          translateX: n.translateX || 0, translateY: n.translateY || 0,
          rotation: n.rotation || 0,
          scaleX: n.scaleX === undefined ? 1 : n.scaleX,
          scaleY: n.scaleY === undefined ? 1 : n.scaleY,
          pivotX: n.pivotX || 0, pivotY: n.pivotY || 0,
        };
        setTransform(g, base, {});
        parent.appendChild(g);
        if (n.name) index.set(n.name, { el: g, base, type: 'g' });
        walk(n.children || [], g);
      } else if (n.t === 'p') {
        const p = document.createElementNS(SVGNS, 'path');
        p.setAttribute('data-avd-name', n.name || '');
        p.setAttribute('d', safePathData(n.d));
        if (n.stroke) {
          p.setAttribute('fill', 'none');
          p.setAttribute('stroke', 'currentColor');
          p.setAttribute('stroke-width', String(n.strokeWidth || 2));
          p.setAttribute('stroke-linecap', 'round');
          p.setAttribute('stroke-linejoin', 'round');
        } else {
          p.setAttribute('fill', 'currentColor');
          p.setAttribute('stroke', 'none');
        }
        if (n.fillAlpha !== undefined && n.fillAlpha !== 1) p.setAttribute('fill-opacity', String(n.fillAlpha));
        parent.appendChild(p);
        if (n.name) index.set(n.name, { el: p, base: { d: safePathData(n.d) }, type: 'p' });
      }
    }
  };
  walk(vec.nodes || [], svg);
  return { svg, index };
}

// ---- ② <animated-vector> + ③ <objectAnimator> 时间轴 ----
export function playAVD(host, tabKey, opts = {}) {
  const tab = GASTOWN93_TABS[tabKey];
  if (!tab || !host) return () => {};
  const onDone = opts.onDone || (() => {});
  const reduce = opts.reduced ?? (
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const { svg, index } = buildVector(tab.vector);
  host.replaceChildren(svg);
  host.hidden = false;

  const timeline = [];
  for (const t of tab.targets || []) {
    const rec = index.get(t.name);
    if (!rec) continue;
    for (const a of t.animators || []) {
      timeline.push({
        rec, property: a.property, duration: a.duration || 0,
        startOffset: a.startOffset || 0,
        from: a.valueFrom, to: a.valueTo,
        ease: a.easing ? makeEasing(a.easing) : (x) => x,
      });
    }
  }
  timeline.sort((a, b) => a.startOffset - b.startOffset);
  const total = Math.max(1, ...timeline.map((x) => x.startOffset + x.duration));
  const reverse = !!opts.reverse;

  if (reduce || timeline.length === 0) { onDone(); return () => {}; }

  let raf = 0, cancelled = false, t0 = performance.now();
  const frame = (now) => {
    if (cancelled) return;
    let elapsed = now - t0;
    const t = Math.max(0, Math.min(total, reverse ? total - elapsed : elapsed));
    const cur = new Map();
    for (const a of timeline) {
      if (t < a.startOffset) continue;
      const p = a.duration > 0 ? Math.min(1, (t - a.startOffset) / a.duration) : 1;
      const val = lerpValue(a.from, a.to, a.ease(p), a.property);
      let s = cur.get(a.rec.el);
      if (!s) { s = {}; cur.set(a.rec.el, s); }
      applyProp(s, a.property, val);
    }
    for (const [, rec] of index) {
      const s = cur.get(rec.el) || {};
      if (rec.type === 'p') {
        if (s.pathData !== undefined) rec.el.setAttribute('d', safePathData(s.pathData));
        else rec.el.setAttribute('d', rec.base.d);
      } else {
        setTransform(rec.el, rec.base, s);
      }
    }
    const running = reverse ? elapsed < total : elapsed < total;
    if (running) raf = requestAnimationFrame(frame);
    else { host.hidden = true; host.replaceChildren(); onDone(); }
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelled = true; cancelAnimationFrame(raf); };
}

export const AVD_TAB_KEYS = Object.keys(GASTOWN93_TABS);
