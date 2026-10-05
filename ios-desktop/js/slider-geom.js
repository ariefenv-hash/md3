// ==================== slider-geom.js — MD3 Expressive 双段轨道几何（纯函数） ====================
// v7.43 修复「手柄移动时轨道两端圆角退化直至消失」（用户报告）：
//   旧实现以「全宽基数 + scaleX」表达激活/未激活段（v7.38 为根治 fill/thumb 光栅
//   脱节引入）。但 transform 横向缩放会把 12px 半圆端帽压成椭圆 —— 水平半径 =
//   12px × scaleX，段越短越扁；手柄逼近行程端点时该段 scaleX → 0，圆角完全消失。
//   新实现：元素保持全宽、永不缩放，几何改由 clip-path: inset(... round ...) 裁剪
//   表达 —— 圆角半径写在裁剪形状上，与段长完全无关，任意位置均为完美半圆。
//   clip-path 与 scaleX 同为无 layout 属性：在合成层（will-change: clip-path）上
//   仅更新裁剪、纹理缓存不重光栅，v7.38「拖拽零 layout、fill/thumb 同帧」纪律不变。
//
// 段四角半径沿用 v7.39 设计（border-radius 语义顺序：左上/右上/右下/左下）：
//   激活段 fill  —— 外端(左) 12px 全圆半圆，近手柄端(右) 6px
//   未激活段 line —— 近手柄端(左) 6px，外端(右) 12px 全圆半圆
// 消费方：settings.js __md3SliderSet（4 个设置滑杆）、m3-controls.js createM3Slider。
// clock-app 白噪音滑杆为经典脚本（无法 import 模块），按本文件同一公式内联实现，
// 修改几何时须两处同步。

export const M3_SLIDER_GAP = 10;

/** 激活段（fill，左锚）四角半径：外左 12px 半圆 / 内右 6px */
export const FILL_RADII = '12px 6px 6px 12px';
/** 未激活段（line，右锚）四角半径：内左 6px / 外右 12px 半圆 */
export const LINE_RADII = '6px 12px 12px 6px';

/**
 * 计算双段轨道两段的 clip-path CSS 值
 * @param {number} w 轨道总宽 px（须 > 0，调用方负责零宽守卫）
 * @param {number} x 手柄（竖柄）中心 px，0..w
 * @param {number} [gap=M3_SLIDER_GAP] 手柄两侧物理断开间隙 px
 * @returns {{fill: string, line: string}} fill=激活段 / line=未激活段 的 clip-path
 *   可见区域：fill [0, x-gap]（右 inset = w-(x-gap)，x≤gap 时 inset≥w → 完全隐藏）；
 *   line [x+gap, w]（左 inset = x+gap，x+gap≥w 时 → 完全隐藏）。
 *   段短于 24px 时 CSS 按比例收缩圆角（与 border-radius 同规则），自然收拢不破形。
 */
export function sliderClipPaths(w, x, gap = M3_SLIDER_GAP) {
  const fillRight = Math.min(w, Math.max(0, w - (x - gap)));
  const lineLeft = Math.min(w, Math.max(0, x + gap));
  return {
    fill: 'inset(0 ' + fillRight.toFixed(1) + 'px 0 0 round ' + FILL_RADII + ')',
    line: 'inset(0 0 0 ' + lineLeft.toFixed(1) + 'px round ' + LINE_RADII + ')',
  };
}
