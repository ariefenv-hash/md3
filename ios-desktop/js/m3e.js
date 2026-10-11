// ==================== m3e.js — Material 3 Expressive 组件内核（v7.72） ====================
//
// 官方依据（m3.material.io，2025-05 M3 Expressive 更新）：
//   • Loading indicator —— "The active indicator is a looping shape morph sequence
//     composed of seven unique Material 3 shapes"；默认 48dp（shape container 38dp）；
//     用于 <5s 短等待、下拉刷新；颜色角色 Primary（contained 变体 on-primary-container
//     / primary-container）。
//   • Split button —— 主按钮 + 菜单图标按钮两段：激活时拖尾按钮 "spins and changes
//     shape"，内角随 hover/focus/pressed 变形。
//   • Button group（connected）—— 相邻按钮共享边界，按压时内角变形。
//
// 本模块提供：
//   1. 纯函数内核（可测试）：七形序列 + 形变半径函数 + 姿态插值
//   2. LoadingIndicator 引擎（canvas 逐帧描形，颜色跟随 currentColor）
//   3. window.__m3eLoader 桥（沙箱应用脚本经此挂载，如文件应用导入 snack）
//   4. SplitButton / ButtonGroup 的 DOM 工厂（供宿主模块使用；沙箱应用用静态类 + m3e.css）
//
// 性能纪律：单 rAF 循环、document.hidden 自动暂停、元素脱文档自回收、
// prefers-reduced-motion 降级为静态首形。

import { state } from './state.js';

// ---------- 七形循环序列（web 近似实现，参数 { n: 瓣频, a: 振幅, s: 纵向压扁 }） ----------
// 依据官方 "seven unique Material 3 shapes" 描述，取 M3 形状族的七种代表形态：
// sunny(8瓣浅波) / clover4(四叶) / softburst(12瓣柔芒) / cookie6(六边曲奇)
// / pill(单瓣椭圆偏置) / clover8(八叶) / burst(5瓣尖峰)，循环形变 + 旋转。
export const M3E_LOADER_SHAPES = [
  { n: 8, a: 0.12, s: 1.0 },   // sunny
  { n: 4, a: 0.22, s: 1.0 },   // clover-4
  { n: 12, a: 0.08, s: 1.0 },  // softburst
  { n: 6, a: 0.16, s: 0.96 },  // cookie-6
  { n: 1, a: 0.30, s: 0.80 },  // pill（椭圆偏置）
  { n: 8, a: 0.22, s: 1.0 },   // clover-8
  { n: 5, a: 0.18, s: 1.0 },   // burst-5
];

export const M3E_LOADER_SEGMENT_MS = 900; // 单形停留+形变时长（七形全环 ≈ 6.3s）

/**
 * 形变半径函数（纯函数，供测试与逐帧描形共用）：
 * r(θ) = R · (1 + a(t)·cos(n(t)·θ)) · s(t)，n/a/s 由两形态按 eased t 线性插值。
 * @param {number} theta 角度（弧度）
 * @param {{n:number,a:number,s:number}} shapeA 起始形
 * @param {{n:number,a:number,s:number}} shapeB 目标形
 * @param {number} t 插值进度 [0,1]
 * @param {number} radius 基准半径
 * @returns {number}
 */
export function m3eLoaderRadius(theta, shapeA, shapeB, t, radius) {
  const k = Math.max(0, Math.min(1, t));
  // 瓣频必须整数化插值（中途取整），否则余弦接缝撕裂
  const n = Math.round(shapeA.n + (shapeB.n - shapeA.n) * k);
  const a = shapeA.a + (shapeB.a - shapeA.a) * k;
  const s = shapeA.s + (shapeB.s - shapeA.s) * k;
  return radius * (1 + a * Math.cos(n * theta)) * s;
}

/** 减速插值（与 utils.pbDecelerate 同构；独立实现避免沙箱桥再引依赖链） */
function easeOutCubic(t) {
  const x = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - x, 3);
}

/** 单段内部进度 → 形变窗口映射：前 55% 保持 A 形，后 45% 完成形变（带减速回弹感） */
function segmentMorphT(segT) {
  if (segT < 0.55) return 0;
  return easeOutCubic((segT - 0.55) / 0.45);
}

// ---------- LoadingIndicator 引擎 ----------

/**
 * 创建 M3E LoadingIndicator（48dp 默认，contained 变体带 primary-container 底盘）。
 * @param {{ size?: number, contained?: boolean }} [opts]
 * @returns {{ el: HTMLDivElement, stop: () => void }}
 */
export function createM3eLoadingIndicator(opts = {}) {
  const size = opts.size || 48;
  const el = document.createElement('div');
  el.className = 'm3e-loader' + (opts.contained ? ' m3e-loader-contained' : '');
  el.style.width = size + 'px';
  el.style.height = size + 'px';

  const canvas = document.createElement('canvas');
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  el.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return { el, stop() {} };

  const R = (size / 2) * 0.79; // shape container 38/48 ≈ 0.79
  let raf = 0;
  let stopped = false;
  let colorCache = '';
  let colorAge = 0;

  function frame(now) {
    if (stopped) return;
    // 元素脱文档 → 自回收（snack 重建等场景零泄漏）
    if (!el.isConnected) { stopped = true; return; }
    // 页面隐藏 → 暂停积分（恢复由下一帧重入；visibility-heal 兜底）
    if (typeof document !== 'undefined' && document.hidden) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const total = M3E_LOADER_SEGMENT_MS * M3E_LOADER_SHAPES.length;
    const t = now % total;
    const seg = Math.floor(t / M3E_LOADER_SEGMENT_MS);
    const segT = (t % M3E_LOADER_SEGMENT_MS) / M3E_LOADER_SEGMENT_MS;
    const shapeA = M3E_LOADER_SHAPES[seg % M3E_LOADER_SHAPES.length];
    const shapeB = M3E_LOADER_SHAPES[(seg + 1) % M3E_LOADER_SHAPES.length];
    const mt = segmentMorphT(segT);
    // 旋转：每段累计 360/7 度 + 段内轻微摆动（官方旋进感）
    const baseRot = (seg / M3E_LOADER_SHAPES.length) * Math.PI * 2 + segT * 0.22;

    // 颜色每秒回读一次（主题切换 ≤1s 生效，避免每帧 getComputedStyle）
    if ((colorAge++ & 63) === 0 || !colorCache) {
      try { colorCache = getComputedStyle(el).color || '#a8c7fa'; } catch (e) { colorCache = '#a8c7fa'; }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(size / 2, size / 2);
    ctx.rotate(baseRot);
    ctx.beginPath();
    const STEPS = 72;
    for (let i = 0; i <= STEPS; i++) {
      const th = (i / STEPS) * Math.PI * 2;
      const r = m3eLoaderRadius(th, shapeA, shapeB, mt, R);
      const x = Math.cos(th) * r;
      const y = Math.sin(th) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = colorCache;
    ctx.fill();
    ctx.restore();
    raf = requestAnimationFrame(frame);
  }

  // prefers-reduced-motion：静态首形（不启动循环）
  let reduced = false;
  try {
    reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* 环境缺失按未开启处理 */ }

  if (reduced) {
    // 静帧：画第一形（无循环）
    try { colorCache = getComputedStyle(el).color || '#a8c7fa'; } catch (e) { colorCache = '#a8c7fa'; }
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(size / 2, size / 2);
    ctx.beginPath();
    const STEPS = 72;
    for (let i = 0; i <= STEPS; i++) {
      const th = (i / STEPS) * Math.PI * 2;
      const r = m3eLoaderRadius(th, M3E_LOADER_SHAPES[0], M3E_LOADER_SHAPES[0], 0, R);
      const x = Math.cos(th) * r, y = Math.sin(th) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = colorCache;
    ctx.fill();
    ctx.restore();
  } else {
    raf = requestAnimationFrame(frame);
  }

  return {
    el,
    stop() {
      stopped = true;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    },
  };
}

/** 便捷挂载：向容器内挂载一枚加载指示器（已有则复用） */
export function mountM3eLoader(container, opts = {}) {
  if (!container || typeof container.appendChild !== 'function') return null;
  const existing = container.querySelector(':scope > .m3e-loader');
  if (existing) return { el: existing, stop() {} };
  const inst = createM3eLoadingIndicator(opts);
  container.appendChild(inst.el);
  return inst;
}

// ---------- 沙箱应用桥（files 导入 snack 等经 window.__m3eLoader 使用） ----------
export function initM3eBridge() {
  if (typeof window === 'undefined') return;
  window.__m3eLoader = {
    mount: (el, opts) => mountM3eLoader(el, opts),
    create: (opts) => createM3eLoadingIndicator(opts),
  };
}

// ---------- SplitButton / ButtonGroup DOM 工厂（宿主模块用） ----------

/**
 * M3E SplitButton：主按钮（icon+label）+ 菜单图标按钮（激活 spin + 变形）。
 * @param {{ icon?: string, label?: string, onPrimary?: Function, onMenu?: Function, menuIcon?: string }} opts
 * @returns {{ el: HTMLDivElement, setMenuOpen: (open: boolean) => void }}
 */
export function createM3eSplitButton(opts = {}) {
  const el = document.createElement('div');
  el.className = 'm3e-splitbtn';
  const lead = document.createElement('button');
  lead.type = 'button';
  lead.className = 'm3e-sb-lead';
  lead.innerHTML = (opts.icon || '') + (opts.label ? '<span class="m3e-sb-lbl"></span>' : '');
  if (opts.label) lead.querySelector('.m3e-sb-lbl').textContent = opts.label;
  const trail = document.createElement('button');
  trail.type = 'button';
  trail.className = 'm3e-sb-trail';
  trail.setAttribute('aria-label', 'menu');
  trail.innerHTML = opts.menuIcon || '';
  el.appendChild(lead);
  el.appendChild(trail);
  if (typeof opts.onPrimary === 'function') lead.addEventListener('click', opts.onPrimary);
  if (typeof opts.onMenu === 'function') {
    trail.addEventListener('click', (e) => {
      e.stopPropagation();
      opts.onMenu();
    });
  }
  return {
    el,
    setMenuOpen(open) { el.classList.toggle('m3e-sb-open', !!open); },
  };
}

/**
 * M3E connected ButtonGroup：相邻共享边界，激活段 secondary-container，按压内角变形。
 * @param {{ segments: Array<{ id: string, icon?: string, label: string, active?: boolean }>, onChange?: (id: string) => void }} opts
 * @returns {{ el: HTMLDivElement, setActive: (id: string) => void }}
 */
export function createM3eButtonGroup(opts = {}) {
  const el = document.createElement('div');
  el.className = 'm3e-btngroup';
  el.setAttribute('role', 'group');
  const segs = [];
  (opts.segments || []).forEach((seg) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'm3e-bg-seg' + (seg.active ? ' on' : '');
    b.dataset.segId = seg.id;
    b.innerHTML = (seg.icon || '') + '<span></span>';
    b.querySelector('span').textContent = seg.label;
    b.addEventListener('click', () => {
      el.querySelectorAll('.m3e-bg-seg').forEach((x) => x.classList.toggle('on', x === b));
      if (typeof opts.onChange === 'function') opts.onChange(seg.id);
    });
    el.appendChild(b);
    segs.push(b);
  });
  return {
    el,
    setActive(id) {
      segs.forEach((b) => b.classList.toggle('on', b.dataset.segId === id));
    },
  };
}

// 自动装配沙箱桥（main.js 侧 import 即生效）
if (typeof window !== 'undefined') {
  try { initM3eBridge(); } catch (e) { /* 桥装配失败不阻断启动 */ }
  // state 引用保活（与全局状态单一真源对齐；供未来动效倍率接入）
  void state;
}
