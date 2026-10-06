// @ts-check
// ==================== motion.js — 统一动效编排器（v7.46「一气呵成」基建） ====================
//
// 病根（v7.45 审计结论）：桌面动效长期分裂为两个物理世界 ——
//   ① 弹簧世界（app-window / split-screen / page-stack）：RK4 物理，速度可接力；
//   ② 定时贝塞尔世界（recents / folder / pull-down）：固定时长 + 12 种互异曲线 +
//      setTimeout 魔法数字编排，接缝处速度湮灭（如回桌甩动 3000px/s 经两级衰减
//      只剩 0.29px/s），落定签名互不相同 —— 单段动画各自流畅，整体却不成一体。
//
// 本模块补上缺失的「编排层」：不是替换 spring.js，而是给所有仍走定时补间的
// 表面提供同一套物理与同一张时间表 ——
//   1. onFrame       单一共享帧心跳（dt 钳制，无订阅自动停摆）——替换各自为政的 RAF；
//   2. tweenValue    RK4 弹簧值补间（初速度接力 / 飞行中重定向 / 逼近事件 / 落定回调）
//                    ——定时贝塞尔的物理化替代，参数来自 animation-presets 当前预设；
//   3. tokens        三条正典 CSS 曲线（emphasized / decel / gentle）—— retire 12 家族；
//   4. dur / after   速度倍率统一缩放的时长与延时 —— setTimeout 魔法数字的替身，
//                    预设切换与开发者倍率从此贯穿全部表面（此前只管主窗口）。
//
// 消费约定：任何新表面禁止再手写 `transition: Xs cubic-bezier(...)` + setTimeout
// 编排；统一经 tokens/dur/after/tweenValue 表达（v7.46 起的动效纪律）。

import { Spring } from './spring.js';
import { getAnimSpeed } from './animation-presets.js';

// ==================== 1. 共享帧心跳 ====================

const subscribers = new Set();
let tickerRafId = null;
let tickerLast = 0;

function tickerLoop(now) {
  // dt 钳制：页签挂起 / 低光栅环境保护（与 app-window startLoop 同纪律）
  let dt = (now - tickerLast) / 1000;
  tickerLast = now;
  if (!Number.isFinite(dt) || dt < 0) dt = 0;
  if (dt > 0.25) dt = 0.25;

  // 迭代副本：订阅者可能在回调中退订
  Array.from(subscribers).forEach((fn) => {
    try { fn(dt, now); } catch (e) { subscribers.delete(fn); }
  });

  tickerRafId = subscribers.size > 0 ? requestAnimationFrame(tickerLoop) : null;
}

/**
 * 订阅共享帧心跳。返回退订函数。
 * @param {(dt: number, now: number) => void} fn 每帧回调（dt 秒，已钳制）
 * @returns {() => void} unsubscribe
 */
export function onFrame(fn) {
  subscribers.add(fn);
  if (tickerRafId === null) {
    tickerLast = performance.now();
    tickerRafId = requestAnimationFrame(tickerLoop);
  }
  return () => { subscribers.delete(fn); };
}

// ==================== 2. 正典曲线令牌 ====================

/**
 * 全系统仅存三条 CSS 缓动（M3 语义化命名，retire 历史 12 个家族）：
 *   emphasized —— 标准强调曲线（进出主角色）；decel —— 减速入场；gentle —— 微过冲浮升。
 * JS 侧飞行/补间一律走弹簧（tweenValue），曲线令牌只服务保留下来的短 CSS 过渡。
 */
export const tokens = {
  emphasized: [0.2, 0, 0, 1],
  decel: [0.05, 0.7, 0.1, 1],
  gentle: [0.2, 0.9, 0.25, 1.02],
};

/** @param {'emphasized'|'decel'|'gentle'} name */
export function cssEase(name) {
  const c = tokens[name] || tokens.emphasized;
  return `cubic-bezier(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})`;
}

// ==================== 3. 速度倍率统一的时长 / 延时 ====================

/** 毫秒时长按全局动画倍率缩放（开发者选项 0.25×~3×） */
export function dur(ms) {
  const s = getAnimSpeed();
  return Math.max(16, Math.round(ms / (Number.isFinite(s) && s > 0 ? s : 1)));
}

/**
 * 速度倍率统一的延时回调（setTimeout 的动效替身）。返回取消函数。
 * @param {number} ms 未缩放毫秒
 * @param {() => void} fn
 * @returns {() => void} cancel
 */
export function after(ms, fn) {
  const id = setTimeout(fn, dur(ms));
  return () => clearTimeout(id);
}

// ==================== 4. RK4 弹簧值补间 ====================

/**
 * @typedef {Object} TweenHandle
 * @property {(to: number, velocity?: number | null) => void} retarget 飞行中重定向（保持速度语义同 Spring.setTarget）
 * @property {() => void} cancel 静默取消（不再触发 onComplete）
 * @property {() => boolean} isSettled
 */

/**
 * 单通道弹簧值补间 —— 定时贝塞尔的物理化替代。
 * 固定子步积分（1/120s，掉帧不慢放），与 app-window startLoop 同款数值纪律。
 *
 * @param {Object} spec
 * @param {number} spec.from 初值
 * @param {number} spec.to 目标值
 * @param {number} [spec.velocity=0] 初速度（单位/秒 —— 接力上一段的出射速度）
 * @param {{mass:number, stiffness:number, damping:number}} spec.params 弹簧参数
 * @param {(value: number, velocity: number) => void} spec.onUpdate 每帧写表面
 * @param {() => void} [spec.onComplete] 收敛回调（cancel 不触发）
 * @param {() => void} [spec.onApproach] 首次进入逼近区回调（编排锚点，物理触发替代 setTimeout）
 * @param {number} [spec.approachAt=0.42] 逼近区阈值（剩余距离 / 初始距离 ≤ 该值时触发一次）
 * @param {number} [spec.posEps=0.004] 收敛位置阈值
 * @param {number} [spec.velEps=0.6] 收敛速度阈值
 * @returns {TweenHandle}
 */
export function tweenValue(spec) {
  const {
    from, to, velocity = 0, params,
    onUpdate, onComplete = null, onApproach = null,
    approachAt = 0.42, posEps = 0.004, velEps = 0.6,
  } = spec;

  const spring = new Spring({ ...params, initialValue: from, initialVelocity: velocity });
  spring.target = to;

  const span = to - from;
  const total = Math.abs(span);
  let approachFired = total < 1e-9; // 零距离无逼近概念，直接视为已触发
  let settled = false;
  let alive = true;

  const STEP = 1 / 120;
  const MAX_SUBSTEPS = 30;
  let accumulator = 0;

  const unsubscribe = onFrame((dt) => {
    if (!alive || settled) return;
    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < MAX_SUBSTEPS) {
      spring.update(STEP);
      accumulator -= STEP;
      steps++;
    }
    if (accumulator >= STEP) accumulator = 0; // 防死亡螺旋

    onUpdate(spring.x, spring.v);

    if (!approachFired && total > 1e-9) {
      const remaining = Math.abs(to - spring.x);
      if (remaining <= total * approachAt) {
        approachFired = true;
        try { onApproach(); } catch (e) { /* 编排锚点失败不阻断物理 */ }
      }
    }

    if (spring.isSettled(posEps, velEps)) {
      // 终值精确写入（防亚像素残差）
      spring.x = to;
      spring.v = 0;
      onUpdate(to, 0);
      settled = true;
      alive = false;
      unsubscribe();
      if (onComplete) { try { onComplete(); } catch (e) {} }
    }
  });

  return {
    retarget(nextTo, nextVelocity = null) {
      if (!alive) return;
      spring.setTarget(nextTo, nextVelocity);
    },
    cancel() {
      alive = false;
      settled = true;
      unsubscribe();
    },
    isSettled() { return settled; },
  };
}

// ==================== 5. 多通道弹簧补间（面板级便利层） ====================

/**
 * 同时驱动 tx / ty / scale 三通道（共享同一组弹簧参数），可选 opacity 跟随
 * scale 进度（0→1 钳制，不独立振荡 —— 面板浮升的「形与透明度同相位」纪律）。
 * radius 可选由 scale 进度线性导出（from→to），杜绝半径与缩放异相的弹性感。
 *
 * @param {Object} spec
 * @param {HTMLElement} spec.el
 * @param {{tx:number, ty:number, scale:number, opacity?:number}} spec.from
 * @param {{tx:number, ty:number, scale:number, opacity?:number, radius?:number}} spec.to
 * @param {number} [spec.fromRadius] 半径起点（缺省 36）
 * @param {{mass:number, stiffness:number, damping:number}} spec.params
 * @param {number} [spec.velocity] {{x:number,y:number,s:number}|number|null} 各通道初速度（px/s、scale/s）
 * @param {() => void} [spec.onComplete]
 * @param {() => void} [spec.onApproach]
 * @param {number} [spec.approachAt]
 * @returns {TweenHandle}
 */
export function tweenPanel(spec) {
  const {
    el, from, to, fromRadius = 36, params,
    velocity = null, onComplete = null, onApproach = null, approachAt = 0.42,
  } = spec;
  const v = velocity && typeof velocity === 'object' ? velocity : { x: 0, y: 0, s: 0 };
  const hasOpacity = to.opacity !== undefined || from.opacity !== undefined;
  const oFrom = hasOpacity ? (from.opacity !== undefined ? from.opacity : 1) : 1;
  const oTo = hasOpacity ? (to.opacity !== undefined ? to.opacity : 1) : 1;
  const scaleSpan = to.scale - from.scale;

  let latest = { tx: from.tx, ty: from.ty, scale: from.scale };

  function paint() {
    const s = latest.scale;
    el.style.transform = `translate3d(${latest.tx.toFixed(2)}px, ${latest.ty.toFixed(2)}px, 0) scale(${s.toFixed(4)})`;
    if (hasOpacity) {
      // 透明度与缩放同相位：按 scale 归一化进度走，钳制 [0,1]
      const p = scaleSpan !== 0 ? (s - from.scale) / scaleSpan : 1;
      const clamped = Math.max(0, Math.min(1, p));
      el.style.opacity = (oFrom + (oTo - oFrom) * clamped).toFixed(3);
    }
    if (to.radius !== undefined) {
      const p = scaleSpan !== 0 ? (s - from.scale) / scaleSpan : 1;
      const clamped = Math.max(0, Math.min(1, p));
      el.style.borderRadius = (fromRadius + (to.radius - fromRadius) * clamped).toFixed(1) + 'px';
    }
  }

  let remaining = 3;
  let settledAll = false;
  const tryComplete = () => {
    if (settledAll || remaining > 0) return;
    settledAll = true;
    if (onComplete) { try { onComplete(); } catch (e) {} }
  };
  const dec = () => { remaining--; tryComplete(); };
  let approachFired = false;
  const fireApproach = () => {
    if (approachFired) return;
    approachFired = true;
    if (onApproach) { try { onApproach(); } catch (e) {} }
  };

  const handles = [
    tweenValue({ from: from.tx, to: to.tx, velocity: v.x || 0, params, onUpdate: (x) => { latest.tx = x; }, onComplete: dec, onApproach: fireApproach, approachAt }),
    tweenValue({ from: from.ty, to: to.ty, velocity: v.y || 0, params, onUpdate: (y) => { latest.ty = y; }, onComplete: dec, onApproach: fireApproach, approachAt }),
    tweenValue({ from: from.scale, to: to.scale, velocity: v.s || 0, params, onUpdate: (s) => { latest.scale = s; paint(); }, onComplete: dec, onApproach: fireApproach, approachAt }),
  ];
  paint();

  return {
    retarget(next, vel = null) {
      handles[0].retarget(next.tx, vel ? (vel.x ?? null) : null);
      handles[1].retarget(next.ty, vel ? (vel.y ?? null) : null);
      handles[2].retarget(next.scale, vel ? (vel.s ?? null) : null);
      if (vel) Object.assign(v, { x: vel.x || 0, y: vel.y || 0, s: vel.s || 0 });
    },
    cancel() { handles.forEach((h) => h.cancel()); },
    isSettled() { return settledAll; },
  };
}

// ==================== 6. 弹簧 ETA（编排时间轴估算） ====================

/**
 * 粗估弹簧从 (from, v0) 收敛到 to 的耗时（60Hz 离散步进仿真，上限 1500ms）。
 * 仅供编排层做时间轴预估（如清理延时），不参与逐帧渲染。
 * @param {{mass:number, stiffness:number, damping:number}} params
 * @param {number} from @param {number} to @param {number} [v0=0]
 * @returns {number} 毫秒
 */
export function springEta(params, from, to, v0 = 0) {
  const s = new Spring({ ...params, initialValue: from, initialVelocity: v0 });
  s.target = to;
  const step = 1 / 60;
  for (let i = 1; i <= 90; i++) {
    s.update(step);
    if (s.isSettled(0.004, 0.6)) return Math.round(i * step * 1000);
  }
  return 1500;
}
