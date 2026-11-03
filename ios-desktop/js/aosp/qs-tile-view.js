// ==================== qs-tile-view.js — QSTileViewImpl 五通道状态派生 · 纯逻辑层（#202） ====================
//
// 1:1 移植自 AOSP aosp-mirror/platform_frameworks_base main
// packages/SystemUI/src/com/android/systemui/qs/tileimpl/QSTileViewImpl.kt（约 1000 行）：
//   · 一条状态并发驱动五条颜色通道：BACKGROUND / LABEL / SECONDARY_LABEL / CHEVRON / OVERLAY
//     （handleStateChanged L578-706：五通道 PropertyValuesHolder 共用 singleAnimator，
//     QS_ANIM_LENGTH = 350ms（QSIconViewImpl.java）ArgbEvaluator 过渡；无动画需求时
//     setAllColors 直落）
//   · 色彩常量区（L113-134）：背景 shadeActive/shadeInactive/shadeDisabled 三 attr；
//     遮罩 active = applyAlpha(0.11, onShadeActive)、inactive = applyAlpha(0.08, onShadeInactive)；
//     主标签 onShadeActive/onShadeInactive/outline（禁用）；副标签 onShadeActiveVariant/
//     onShadeInactiveVariant/outline；L88 UNAVAILABLE_ALPHA = 0.3f
//   · 合流规则（四个 getXColorForState L769-810）：
//     UNAVAILABLE || disabledByPolicy → colorUnavailable（双通道色彩层合流）
//   · 交互派生（L580-581）：isClickable = state != STATE_UNAVAILABLE；
//     isLongClickable = state.handlesLongClick（逐磁贴状态位，非特例 if）
//   · L684 label.isEnabled = !state.disabledByPolicy（受管 → 标签失能）
//   · L635 颜色重算触发条件含 disabledByPolicy != lastDisabledByPolicy（受管位变化
//     本身就是重绘触发器）
//
// web 落地裁决（在录）：
//   · 颜色以 ARGB int 表达（与 AOSP 同构），配 colorIntToCss 供 DOM 消费；
//     色板由调用方从 getComputedStyle 解析 md token 后传入（主题适配零硬编码）
//   · ArgbEvaluator 按 API 21+ 真身实现：sRGB → linear（2.2 幂）→ 插值 → 回 sRGB
//   · md3 磁贴 DOM 无雪佛龙实体（v7.79 裁决「点击整块即面板」，无右侧子仓）、
//     涟漪遮罩由 expressive-ripple 系统承担 —— CHEVRON/OVERLAY 通道纯函数在库 +
//     测试全锚，DOM 接线仅消费 BACKGROUND/LABEL/SECONDARY_LABEL 三通道（#149 注释=代码纪律）
//   · 过渡动画：md3 磁贴颜色过渡由 v7.82 CSS 单源承担（Tile.kt spring 侧真身，
//     320ms cubic-bezier(0.2,0,0,1)，1% 落定≈332ms 与 350ms 线性同量级）——
//     新增 unavailable/restricted 通道复用同一 CSS transition（不双轨不引入 JS 帧动画，
//     #155「无双曲线打架面」单源纪律）；QS_ANIM_LENGTH_MS=350 常量在库在录
//
// 本模块零 DOM，供 quick-settings.js 渲染层与 tests/v201-qs-tile-state.test.js 直接驱动。

import { TILE_STATE } from './qs-tile-state.js';

/** QSIconViewImpl.QS_ANIM_LENGTH = 350ms（五通道共用 singleAnimator 时长） */
export const QS_ANIM_LENGTH_MS = 350;

/** QSTileViewImpl L88 UNAVAILABLE_ALPHA = 0.3f（禁用态 alpha 契约常量） */
export const UNAVAILABLE_ALPHA = 0.3;

/** 遮罩通道 alpha（L116-125）：active = applyAlpha(0.11, onShadeActive)、
 *  inactive = applyAlpha(0.08, onShadeInactive) */
export const OVERLAY_ALPHA_ACTIVE = 0.11;
export const OVERLAY_ALPHA_INACTIVE = 0.08;

/** ARGB int 组装/拆解（ColorUtils.setAlphaComponent 同构） */
export function argb(a, r, g, b) {
  return ((a & 0xff) << 24) | ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff);
}

/** applyAlpha(alpha, color)：QSTileViewImpl 私有工具 —— alpha 直接替换 a 通道 */
export function applyAlpha(alpha, colorInt) {
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)));
  return (a << 24) | (colorInt & 0x00ffffff);
}

const srgbToLinear = (c) => Math.pow(c, 2.2);
const linearToSrgb = (c) => Math.pow(c, 1 / 2.2);

/**
 * ArgbEvaluator.evaluate 真身（API 21+：sRGB→linear 2.2 幂→逐通道插值→回 sRGB）。
 * @param {number} startInt 起始 ARGB
 * @param {number} endInt 结束 ARGB
 * @param {number} fraction 0..1
 * @returns {number} 插值后 ARGB
 */
export function argbEvaluate(startInt, endInt, fraction) {
  const f = Math.max(0, Math.min(1, Number(fraction) || 0));
  const sA = ((startInt >>> 24) & 0xff) / 255;
  const sR = ((startInt >>> 16) & 0xff) / 255;
  const sG = ((startInt >>> 8) & 0xff) / 255;
  const sB = (startInt & 0xff) / 255;
  const eA = ((endInt >>> 24) & 0xff) / 255;
  const eR = ((endInt >>> 16) & 0xff) / 255;
  const eG = ((endInt >>> 8) & 0xff) / 255;
  const eB = (endInt & 0xff) / 255;
  // convert from sRGB to linear（ArgbEvaluator.java L86-93 同构）
  const lsR = srgbToLinear(sR); const lsG = srgbToLinear(sG); const lsB = srgbToLinear(sB);
  const leR = srgbToLinear(eR); const leG = srgbToLinear(eG); const leB = srgbToLinear(eB);
  // compute the interpolated color in linear space
  let ir = lsR + (leR - lsR) * f;
  let ig = lsG + (leG - lsG) * f;
  let ib = lsB + (leB - lsB) * f;
  // convert back to sRGB in the [0..1] range
  ir = linearToSrgb(ir); ig = linearToSrgb(ig); ib = linearToSrgb(ib);
  // convert back to 0..255 range
  ir = Math.round(ir * 255); ig = Math.round(ig * 255); ib = Math.round(ib * 255);
  const ia = sA + (eA - sA) * f; // alpha 在 sRGB 域直接插值（源码同构）
  return argb(Math.round(ia * 255), ir, ig, ib);
}

/** colorInt → CSS 颜色串（DOM 消费出口） */
export function colorIntToCss(colorInt) {
  if (colorInt == null) return '';
  const a = (colorInt >>> 24) & 0xff;
  const r = (colorInt >>> 16) & 0xff;
  const g = (colorInt >>> 8) & 0xff;
  const b = colorInt & 0xff;
  if (a === 0xff) return `rgb(${r},${g},${b})`;
  return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
}

/**
 * 五通道状态派生总入口（QSTileViewImpl.handleStateChanged 颜色段同构）。
 * @param {{state: number, restricted?: boolean}} viewState deriveTileState 产物（或其子集）
 * @param {object} palette md token 解析后的三态色板（ARGB int）：
 *        shadeActive/shadeInactive/shadeDisabled、onShadeActive/onShadeInactive、
 *        onShadeActiveVariant/onShadeInactiveVariant、outline
 * @returns {{background: number|null, label: number|null, secondaryLabel: number|null,
 *            chevron: number|null, overlay: number|null}}
 */
export function getTileViewColors(viewState, palette) {
  const p = palette || {};
  const st = viewState ? viewState.state : TILE_STATE.INACTIVE;
  // 合流规则：UNAVAILABLE || disabledByPolicy → colorUnavailable（L769-810 四通道同款）
  const disabled = st === TILE_STATE.UNAVAILABLE || !!(viewState && viewState.restricted);
  const background = disabled ? p.shadeDisabled
    : (st === TILE_STATE.ACTIVE ? p.shadeActive : p.shadeInactive);
  const label = disabled ? p.outline
    : (st === TILE_STATE.ACTIVE ? p.onShadeActive : p.onShadeInactive);
  const secondaryLabel = disabled ? p.outline
    : (st === TILE_STATE.ACTIVE ? p.onShadeActiveVariant : p.onShadeInactiveVariant);
  // 雪佛龙与主标签同族（QSTileViewImpl chevron 消费 onShade 侧 attr；md3 无实体在库）
  const chevron = label;
  // 遮罩通道：disabled 不参与（无高光遮罩）；ACTIVE 0.11 / INACTIVE 0.08
  const overlay = disabled ? null
    : (st === TILE_STATE.ACTIVE
      ? applyAlpha(OVERLAY_ALPHA_ACTIVE, p.onShadeActive)
      : applyAlpha(OVERLAY_ALPHA_INACTIVE, p.onShadeInactive));
  return { background, label, secondaryLabel, chevron, overlay };
}

/**
 * 交互派生（QSTileViewImpl L580-581 同构）：
 * isClickable = state != STATE_UNAVAILABLE；isLongClickable = handlesLongClick。
 * 受管（disabledByPolicy）不夺 isClickable —— 点击保留用于展示受管提示
 * （AOSP：DevicePolicyManager 拦截 + toast，#202 交互层三重处置的 web 落地）。
 * @returns {{isClickable: boolean, isLongClickable: boolean, labelEnabled: boolean}}
 */
export function getTileViewInteractivity(viewState) {
  const st = viewState ? viewState.state : TILE_STATE.INACTIVE;
  const restricted = !!(viewState && viewState.restricted);
  return {
    isClickable: st !== TILE_STATE.UNAVAILABLE,
    isLongClickable: st !== TILE_STATE.UNAVAILABLE && !!(viewState && viewState.handlesLongClick),
    // L684 label.isEnabled = !state.disabledByPolicy
    labelEnabled: !restricted,
  };
}
