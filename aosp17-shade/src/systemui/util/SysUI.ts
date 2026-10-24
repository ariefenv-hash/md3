/** DOM/SVG 小工具 + ColorUtils（对应 com.android.internal.graphics.ColorUtils 的用法子集） */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

export function div(className?: string): HTMLDivElement {
  return el('div', className);
}

/** 渲染 icons.ts 中的 IconDef（等价 Icon.kt / SmallTileContent 的 tint 行为） */
export function renderIcon(
  def: { vw: number; vh: number; svg: string },
  size: number,
  cls?: string,
): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${def.vw} ${def.vh}`);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.classList.add('sysui-icon');
  if (cls) svg.classList.add(cls);
  svg.innerHTML = def.svg;
  return svg;
}

/** ColorUtils.compositeColors(dst, src) — src 叠在 dst 上 */
export function compositeColors(dst: string, src: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = dst;
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = src;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${d[0]},${d[1]},${d[2]},${(d[3] / 255).toFixed(3)})`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** 源码字符串常量 */
export const STRINGS = {
  accessibility_long_click_tile: '长按即可打开或关闭设置',
  accessibility_brightness: '亮度',
  quick_settings_footer_edit: '修改',
  quick_settings_footer_settings: '设置',
  quick_settings_footer_power: '电源',
};
