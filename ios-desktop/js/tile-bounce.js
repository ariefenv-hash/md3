/**
 * v7.93 QS 磁贴按压 bounce 联动 —— AOSP expressive Bounceable 体系 1:1 移植。
 *
 * 源码蓝本（android-17.0.0_r1，逐条对齐）：
 *   packages/SystemUI/compose/core/src/com/android/compose/animation/Bounceable.kt
 *     · BounceableImpl：bounce Animatable 0→bounceSize→0，spring() 默认参数
 *       （DampingRatioNoBouncy ζ=1 + StiffnessMediumLow stiffness=400 + mass 1）
 *     · MINIMUM_BOUNCE_RATIO=.75 / MAX_WAIT_TIME_MILLIS=1000：快速轻点也保证
 *       呈现 ≥75% bounce 再回弹（Material Expressive ButtonGroup 同款 waitUntil）
 *     · BounceableNode.measure 布局联动：
 *         sizePrevious = bounceable.bounce − previousBounceable.bounce（prev 存在才计）
 *         sizeNext     = bounceable.bounce − nextBounceable.bounce（next 存在才计；
 *                        无 next 且 bounceEnd → += bounceable.bounce）
 *         animatedWidth = idle + sizePrevious + sizeNext，place(−sizePrevious, 0)
 *       —— 按压者向两侧膨胀、左邻右缘被吃 b、右邻左缘让位 b、其余磁贴不动。
 *   .../qs/panels/ui/viewmodel/BounceableTileViewModel.kt：BounceSize = 8.dp
 *   .../qs/panels/ui/compose/BounceableInfo.kt：邻居仅限同行（same row），
 *     bounceEnd = !onLastColumn（行尾对齐网格右缘的磁贴按压缩量不含右向增量）
 *   .../qs/panels/ui/compose/infinitegrid/Tile.kt L269：bounceContainer =
 *     isToggleable && … → toggleable 磁贴按压驱动容器联动、无内容缩放
 *     （iconBounceScale/textBounceScale 场景 web 版暂无消费磁贴，未移植）
 *
 * web 落地：grid 列宽固定，布局联动等价为 width + margin 联动（真实布局变化、
 * 内容随 flex 收缩，与 Compose measure 语义同构）：
 *   按压者  marginLeft = −sizePrev, marginRight = −sizeNext, width = idle + Δ
 *   左邻    Δ = −b, margin 0（右缘内缩）
 *   右邻    Δ = −b, marginLeft = +b（左缘让位、右缘不动）
 * 逐帧由 v7.92 解析闭式解弹簧驱动（与源码 Animatable+spring 同一数学形态）。
 */

import { Spring } from './spring.js';

const BOUNCE_SIZE = 8;                 // BounceableTileViewModel.BounceSize = 8dp（1px@1x）
const MIN_BOUNCE = BOUNCE_SIZE * 0.75; // BounceableImpl.MINIMUM_BOUNCE_RATIO
const MAX_WAIT_MS = 1000;              // BounceableImpl.MAX_WAIT_TIME_MILLIS
// Compose spring() 默认：dampingRatio = 1（NoBouncy 临界阻尼）、stiffness = 400（MediumLow）
const SPRING_PARAMS = { mass: 1, stiffness: 400, damping: 40 };

/**
 * 布局联动纯函数（BounceableNode.measure 同构；导出供测试）
 * @param {number} b 按压者当前 bounce（px）
 * @param {{hasPrev:boolean, hasNext:boolean, lastAlignedRight:boolean}} row
 *        lastAlignedRight ≙ 源码 !bounceEnd（磁贴右缘对齐网格最后一列）
 * @returns {{widthDelta:number, marginLeft:number, marginRight:number}}
 */
export function bounceLayout(b, { hasPrev, hasNext, lastAlignedRight }) {
  const sizePrev = hasPrev ? b : 0;
  const sizeNext = hasNext ? b : (lastAlignedRight ? 0 : b);
  return {
    widthDelta: sizePrev + sizeNext,
    marginLeft: -sizePrev || 0,   // placeRelative(−sizePrevious, 0)；||0 归一负零
    marginRight: -sizeNext || 0,  // grid 右向溢出的等价表达
  };
}

/** 邻居右缘/左缘让位量（BounceableNode.measure 对 bounce=0 邻居的求值：
    sizePrevious = 0 − b、sizeNext = 0 − b —— 均随按压者 b 实时变化，非常量） */
function neighborLayouts(b) {
  return {
    prev: { widthDelta: -b, marginLeft: 0, marginRight: 0 },   // 右缘内缩（place 0）
    next: { widthDelta: -b, marginLeft: b, marginRight: 0 },   // 左缘让位（place(+b)，随 b 回弹归 0）
  };
}

/** 单磁贴 bounce 动画器（BounceableImpl 同构） */
class TileBounceable {
  constructor(onFrame) {
    this.spring = new Spring({ ...SPRING_PARAMS, initialValue: 0 });
    this.onFrame = onFrame;      // (bounce:number) => void
    this.waitingMin = false;     // animateToRest 的 waitUntil 阶段
    this.waitStart = 0;
    this.raf = 0;
    this.lastT = 0;
  }

  /** 按下：animateTo(bounceSize, spring)（BounceOnPressNode pressed=true 路径） */
  animateExpansion() {
    this.waitingMin = false;
    this.spring.target = BOUNCE_SIZE;
    this._start();
  }

  /** 释放：waitUntil(bounce > 75%·size)（至多 1s）→ animateTo(0, spring) */
  animateToRest() {
    if (this.spring.x < MIN_BOUNCE) {
      this.waitingMin = true;
      this.waitStart = performance.now();
    } else {
      this.spring.target = 0;
    }
    this._start();
  }

  /** 外部硬复位（面板关闭/新按压打断） */
  cancel() {
    this.waitingMin = false;
    this.raf && cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.spring.target = 0;
    this.spring.x = 0;
    this.spring.v = 0;
    this.onFrame(0);
  }

  _start() {
    if (this.raf) return;
    this.lastT = performance.now();
    this.raf = requestAnimationFrame((t) => this._tick(t));
  }

  _tick(now) {
    const dt = Math.min((now - this.lastT) / 1000, 0.05); // 秒；钳制大间隔（切后台回来）
    this.lastT = now;
    if (this.waitingMin) {
      if (this.spring.x >= MIN_BOUNCE || now - this.waitStart > MAX_WAIT_MS) {
        this.waitingMin = false;   // 源码 waitUntil：凑够 75% 或超时 1s 即回弹
        this.spring.target = 0;
      }
    }
    this.spring.update(dt);
    this.onFrame(this.spring.x);
    const settled =
      !this.waitingMin &&
      Math.abs(this.spring.x - this.spring.target) < 0.05 &&
      Math.abs(this.spring.v) < 0.05;
    this.raf = settled ? 0 : requestAnimationFrame((t) => this._tick(t));
  }
}

// ---------- 行内邻居判定（BounceableInfo 同构：仅同行、按列序） ----------

/**
 * @returns {{prev:Element|null, next:Element|null, lastAlignedRight:boolean}}
 *   lastAlignedRight：磁贴右缘对齐容器内容右缘（源码 onLastColumn ≙ bounceEnd=false）
 */
function rowNeighbors(pill) {
  const grid = pill.parentElement;
  if (!grid) return { prev: null, next: null, lastAlignedRight: true };
  const all = Array.from(grid.querySelectorAll(':scope > .qs-tile-pill'))
    .filter((el) => el.offsetParent !== null);
  const row = all.filter((el) => Math.abs(el.offsetTop - pill.offsetTop) < pill.offsetHeight / 2);
  row.sort((a, b) => a.offsetLeft - b.offsetLeft);
  const i = row.indexOf(pill);
  const gridPadR = parseFloat(getComputedStyle(grid).paddingRight) || 0;
  const gridRect = grid.getBoundingClientRect();
  const pillRect = pill.getBoundingClientRect();
  // 右缘与容器内容右缘差 ≤2px ≙ onLastColumn（bounceEnd = !onLastColumn）
  const lastAlignedRight = Math.abs(pillRect.right - (gridRect.right - gridPadR)) <= 2;
  return { prev: row[i - 1] || null, next: row[i + 1] || null, lastAlignedRight };
}

// ---------- 活动按压会话（同源码：一次一个 interactionSource 链） ----------

let active = null;

function paint(state, b) {
  const { pill, neighbors, idles } = state;
  const me = bounceLayout(b, {
    hasPrev: !!neighbors.prev,
    hasNext: !!neighbors.next,
    lastAlignedRight: neighbors.lastAlignedRight,
  });
  pill.style.width = `${idles.pill + me.widthDelta}px`;
  pill.style.marginLeft = `${me.marginLeft}px`;
  pill.style.marginRight = `${me.marginRight}px`;
  const nb = neighborLayouts(b);
  if (neighbors.prev) {
    const el = neighbors.prev;
    el.style.width = `${idles.prev + nb.prev.widthDelta}px`;
    el.style.marginLeft = `${nb.prev.marginLeft}px`;
    el.style.marginRight = `${nb.prev.marginRight}px`;
  }
  if (neighbors.next) {
    const el = neighbors.next;
    el.style.width = `${idles.next + nb.next.widthDelta}px`;
    el.style.marginLeft = `${nb.next.marginLeft}px`;
    el.style.marginRight = `${nb.next.marginRight}px`;
  }
}

function clearPaint(state) {
  for (const el of [state.pill, state.neighbors.prev, state.neighbors.next]) {
    if (!el) continue;
    el.style.width = '';
    el.style.marginLeft = '';
    el.style.marginRight = '';
  }
}

/** pointerdown → BounceOnPressNode：pressed=true → animateExpansion */
function press(pill, pointerId) {
  if (active) {
    if (active.pill === pill) return;
    // 新按压打断旧按压（源码 collectLatest 语义：旧会话立即收尾）
    clearPaint(active);
    active.bounceable.cancel();
    active = null;
  }
  const neighbors = rowNeighbors(pill);
  const rect = pill.getBoundingClientRect();
  const state = {
    pill,
    neighbors,
    pointerId,
    idles: {
      pill: rect.width,
      prev: neighbors.prev ? neighbors.prev.getBoundingClientRect().width : 0,
      next: neighbors.next ? neighbors.next.getBoundingClientRect().width : 0,
    },
    bounceable: null,
  };
  state.bounceable = new TileBounceable((b) => paint(state, b));
  active = state;
  state.bounceable.animateExpansion();
}

/** pointerup/cancel → animateToRest；回弹落定后清布局（视觉收尾 = 源码归位） */
function release(pointerId) {
  if (!active || (pointerId != null && active.pointerId !== pointerId)) return;
  const state = active;
  state.bounceable.animateToRest();
  // 落定清扫：轮询弹簧 rAF 归零；无头/极端节流下由 2.5s 兜底强制清（真实环境 ~0.5s 落定）
  const started = performance.now();
  const sweep = () => {
    if (active !== state) return; // 已被新按压接管
    const done = state.bounceable.raf === 0 && !state.bounceable.waitingMin;
    if (done || performance.now() - started > 2500) {
      clearPaint(state);
      if (done) state.bounceable.cancel(); // 兑现归位（|x|≤0.05 残差归零）
      active = null;
    } else {
      setTimeout(sweep, 40);
    }
  };
  setTimeout(sweep, 40);
}

function onDown(e) {
  if (e.button !== 0 && e.pointerType === 'mouse') return;
  // html.no-anim 全局动效关闭（项目惯例：v7.89 起交互动效免疫该开关）
  if (document.documentElement.classList.contains('no-anim')) return;
  const pill = e.target && e.target.closest && e.target.closest('.qs-tile-pill');
  if (!pill || !pill.offsetParent) return;
  press(pill, e.pointerId);
}

function onUp(e) {
  release(e.pointerId);
}

let initialized = false;

/** 挂载全局事件委托（main.js 启动调用一次；磁贴为动态渲染 DOM） */
export function initTileBounce() {
  if (initialized) return;
  initialized = true;
  document.addEventListener('pointerdown', onDown, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onUp, true);
}
