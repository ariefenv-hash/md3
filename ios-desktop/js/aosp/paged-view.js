/**
 * paged-view.js — Launcher3 PagedView 翻页常量单一真源 + snap 判定链（纯逻辑，零 DOM）。
 *
 * AOSP 锚点（lineage-24.0 packages/apps/Launcher3/src/com/android/launcher3/PagedView.java
 * + frameworks/base ViewConfiguration）：
 * - PAGING_TOUCH_SLOP = TOUCH_SLOP × 2 = 16dp（ViewConfiguration 分页手势 slop——
 *   横向意图判定阈值，替代 md3 历史自定 12px）；
 * - fling_threshold_velocity = R.dimen.fling_threshold_velocity = 500dp/s
 *   （easy_fling 400dp/s 为 quickswitch 专用，本模块不引入——settings-two-pane 既有裁决沿用）；
 * - SIGNIFICANT_MOVE_THRESHOLD = 0.4f（显著位移 = |Δx| > 页宽 × 0.4 → 提交翻页）；
 * - RETURN_TO_ORIGINAL_PAGE_THRESHOLD = 0.33f（位移落在 0.33~0.4 带域 → 回弹原页，
 *   不提交——「拖了一点点就松手」不翻页的迟滞带）。
 *
 * #102 盘点结论（收编面）：
 * - settings-two-pane.js TP_ 四常量 = Launcher3 值（v8.93 核对通过面）→ 本模块 import 收编；
 * - desktop.js livePager 意图判定 12px → PAGING_TOUCH_SLOP 16（AOSP 对齐）；
 * - desktop.js settleLiveSwipe 惯性投影+round → resolveSnapTarget 判定链（本模块）；
 * - main.js 兜底轻扫 50px：Launcher3 无对应语义（live 模式外的 fallback），保留自定
 *   并在盘点表标注——非本模块收编面。
 * - all-apps.js 无分页（单滚动，#66 单页证据）——不适用。
 *
 * 密度约定：md3 全站 1px ≈ 1dp 历史惯例（500dp/s = 500px/s），速度入参 px/s。
 */

/** Launcher3 PagedView 常量（同名同义，单一真源）。 */
export const PAGED_VIEW = Object.freeze({
  PAGING_TOUCH_SLOP: 16,             // dp/px（TOUCH_SLOP 8dp × 2）
  FLING_THRESHOLD_VELOCITY: 500,     // px/s（R.dimen.fling_threshold_velocity）
  SIGNIFICANT_MOVE_FACTOR: 0.4,      // 页宽分数
  RETURN_TO_ORIGINAL_FACTOR: 0.33,   // 页宽分数（0.33~0.4 迟滞带下界）
});

/** snap 判定输出（消费方按方向翻页/回弹/保持）。 */
export const SNAP = Object.freeze({ NEXT: 'next', PREV: 'prev', CURRENT: 'current' });

/**
 * Launcher3 PagedView ACTION_UP 翻页判定链同构。
 * 判定顺序与源码一致：fling 优先（速度达标直接翻页）→ 显著位移（0.4f）→
 * 迟滞带（位移超过 RETURN_TO_ORIGINAL 0.33 但未达 0.4 → 回原页）→ 最近页兜底。
 *
 * @param {object} input
 * @param {number} input.dxPx  本手势累计水平位移（右负左正约定与屏幕坐标一致：
 *   向左滑（看右页）dx < 0）
 * @param {number} input.velocityPxPerSec  释放水平速度（px/s，向左为负）
 * @param {number} input.pageWidthPx  页宽（px；md3 桌面 = viewport 宽）
 * @param {number} [input.slopPx]  slop 修正（位移先扣 slop 再判定——
 *   Launcher3 mTotalMotionX 含 slop 内段，md3 意图判定已先行消费 16px，
 *   缺省 0 保持两端对称；two-pane 传入 16 消费同一真源）
 * @returns {'next'|'prev'|'current'}
 *
 * 方向映射（屏幕坐标）：向左滑 dx<0 → 看下一页（next）；向右滑 dx>0 → prev。
 */
export function resolveSnapTarget(input) {
  const { dxPx, velocityPxPerSec, pageWidthPx, slopPx = 0 } = input || {};
  const w = pageWidthPx > 0 ? pageWidthPx : 1;
  const dx = dxPx - Math.sign(dxPx || 0) * Math.min(Math.abs(slopPx), Math.abs(dxPx || 0));
  const v = velocityPxPerSec || 0;

  // ① fling（Launcher3：mFlingThresholdVelocity 判定先于显著位移——速度达标直接翻）
  if (v <= -PAGED_VIEW.FLING_THRESHOLD_VELOCITY) return SNAP.NEXT;
  if (v >= PAGED_VIEW.FLING_THRESHOLD_VELOCITY) return SNAP.PREV;

  // ② 显著位移 0.4f（Launcher3 isSignificantMove：|Δ| **严格大于** 页宽 × 0.4 才提交）
  const frac = dx / w;
  if (frac < -PAGED_VIEW.SIGNIFICANT_MOVE_FACTOR) return SNAP.NEXT;
  if (frac > PAGED_VIEW.SIGNIFICANT_MOVE_FACTOR) return SNAP.PREV;

  // ③ 迟滞带 0.33~0.4：未达显著位移 → 回原页（RETURN_TO_ORIGINAL_PAGE_THRESHOLD 语义）
  return SNAP.CURRENT;
}

/**
 * 浮点页坐标吸附判定（livePager 消费形态：pageF = 浮点页坐标）。
 * 与 resolveSnapTarget 同链，但以「位移分数」入参（pageF − basePageF），
 * 供桌面跟手滑动直接复用（winW 换算内置）。
 *
 * @param {object} input
 * @param {number} input.displacementF  位移分数（页单位，向左滑为正）
 * @param {number} input.velocityPxPerSec  释放水平速度（px/s）
 * @param {number} input.winW  页宽 px
 * @returns {'next'|'prev'|'current'}
 */
export function resolveSnapFromDisplacement(input) {
  const { displacementF, velocityPxPerSec, winW } = input || {};
  const w = (winW && winW > 0) ? winW : 1;
  // displacementF 向左滑（翻向下一页）为正；dx 屏幕坐标向左为负——符号镜像换算
  const dxPx = -displacementF * w;
  return resolveSnapTarget({ dxPx, velocityPxPerSec, pageWidthPx: w });
}
