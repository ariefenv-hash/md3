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

// v7.74 对齐官方 LoadingIndicator.kt 常数（issue #9 参考件 2.html）：
// MorphInterval = 650ms（原 900ms 自定值）；全局旋转 360°/4666ms 线性顺时针；
// 形变进度由 spring(dampingRatio=0.6, stiffness=200) 驱动（约 0.4s 落定，余段保持）。
export const M3E_LOADER_SEGMENT_MS = 650; // 官方 MorphIntervalMillis
export const M3E_GLOBAL_ROTATION_MS = 4666; // 官方 GlobalRotationDurationMillis
const SPRING_DAMPING = 0.6; // 官方 dampingRatio
const SPRING_STIFFNESS = 200; // 官方 stiffness

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

// ---------- 官方 spring 进度（LoadingIndicator.kt：spring(0.6, 200, visibilityThreshold=0.1)） ----------
// 临界阻尼以下欠阻尼弹簧的解析解；t≥t_hold 后视为完全落定（阈值 1.25→0.1 的对数判据）。
const SPRING_W = Math.sqrt(SPRING_STIFFNESS);
const SPRING_WD = SPRING_W * Math.sqrt(1 - SPRING_DAMPING * SPRING_DAMPING);
const SPRING_T_HOLD = Math.log(1.25 / 0.1) / (SPRING_DAMPING * SPRING_W);
/**
 * 官方 spring 形变进度：@param tau 段内秒数 [0,∞) → 进度 [0,1]
 */
export function m3eSpringProgress(tau) {
  if (tau >= SPRING_T_HOLD) return 1;
  return 1 - Math.exp(-SPRING_DAMPING * SPRING_W * tau)
    * (Math.cos(SPRING_WD * tau) + SPRING_DAMPING * SPRING_W / SPRING_WD * Math.sin(SPRING_WD * tau));
}

/** 单段内部进度 → 形变窗口映射（v7.74 改用官方 spring 驱动，全段连续形变约 0.4s 落定） */
function segmentMorphT(segT) {
  return m3eSpringProgress(Math.max(0, segT));
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
  const t0 = (typeof performance !== 'undefined' ? performance.now() : 0); // v7.74 实例自有时钟原点（官方 dt）
  let lastRender = t0;
  let watchdog = 0;

  function drawFrame(now) {
    // v7.74 官方 dt 时钟（钳 0 防负时间）：段序/形变/旋转全部由 dt 推导
    const dt = Math.max(0, now - t0);
    const seg = Math.floor(dt / M3E_LOADER_SEGMENT_MS);
    const segT = (dt % M3E_LOADER_SEGMENT_MS) / M3E_LOADER_SEGMENT_MS;
    const N = M3E_LOADER_SHAPES.length;
    const shapeA = M3E_LOADER_SHAPES[((seg % N) + N) % N];
    const shapeB = M3E_LOADER_SHAPES[(((seg + 1) % N) + N) % N];
    const mt = segmentMorphT(segT);
    // v7.74 官方旋转公式（LoadingIndicator.kt）：prog×90° + 段序累计 90° + 360°/4666ms 全局线性顺时针
    const rotDeg = mt * 90
      + ((((seg % 4) + 4) % 4) + 1) * 90
      + (dt / M3E_GLOBAL_ROTATION_MS * 360) % 360;
    const baseRot = rotDeg * Math.PI / 180;

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
  }

  function frame(now) {
    if (stopped) return;
    // 元素脱文档 → 自回收（snack 重建等场景零泄漏）
    if (!el.isConnected) { stopped = true; teardownWatchdog(); return; }
    // 页面隐藏 → 暂停积分（恢复由下一帧重入；visibility-heal 兜底）
    if (typeof document !== 'undefined' && document.hidden) {
      raf = requestAnimationFrame(frame);
      return;
    }
    drawFrame(now);
    lastRender = now;
    raf = requestAnimationFrame(frame);
  }

  // ---------- v7.74：rAF 看门狗（参考件 2.html 同款） ----------
  // 后台标签回前台 / 主线程长任务后 rAF 停滞 >250ms 时，由 100ms 定时器巡检补帧；
  // rAF 恢复后自动让回（lastRender 已刷新，无双驱动）。停止时同步拆除。
  function teardownWatchdog() { if (watchdog) { clearInterval(watchdog); watchdog = 0; } }
  if (typeof setInterval === 'function') {
    watchdog = setInterval(() => {
      if (stopped || !el.isConnected) { stopped = true; teardownWatchdog(); return; }
      if (typeof document !== 'undefined' && document.hidden) return;
      const now = (typeof performance !== 'undefined' ? performance.now() : 0);
      if (now - lastRender > 250) { drawFrame(now); lastRender = now; }
    }, 100);
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
    // v7.74 同步首帧：挂载即呈现，不等首个 rAF（防节流环境白屏，参考件同款）
    drawFrame(t0);
    raf = requestAnimationFrame(frame);
  }

  return {
    el,
    stop() {
      stopped = true;
      teardownWatchdog();
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
