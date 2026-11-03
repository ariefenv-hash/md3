// ==================== desktop-visual-indicator.js — DesktopModeVisualIndicator 同构（#199） ====================
//
// AOSP 源：libs/WindowManager/Shell/src/com/android/wm/shell/desktopmode/DesktopModeVisualIndicator.kt
//   （#199 议题正文实证）拖拽 freeform 窗口时的三落点可视化预示：
//   左半（split left）/ 右半（split right）/ 全屏（fullscreen）—— 指示器随拖拽指针位置
//   实时切换，松手按预示落点落位（DragToDesktopTransitionHandler 消费）。
//
// 判定语义（AOSP 拖拽预示阈值惯例 + md3 落地裁决在录）：
//   · 顶边缘（y ≤ 阈值，含两角）→ 全屏落点 —— 顶角判定优先于左右（AOSP 顶部角全屏指示）
//   · 左边缘（x ≤ 阈值，非顶部带）→ 左半落点
//   · 右边缘（x ≥ vw - 阈值）→ 右半落点
//   · 其余 → 无预示
//   · 目标矩形：半屏 = 视口半宽 × 全高；全屏 = 视口全幅。margin 为系统安全边距
//     （md3 消费 EDGE_MARGIN=8 与 mini-window 边距同值，落位窗保留呼吸空间）
//
// md3 落位裁决（在录）：左/右半落位 = 小窗吸附半屏矩形（保持 Freeform 形态：header/grip
// 保留，宽度受 MINI_MIN_W 钳位由调用方执行）；全屏落位 = 走既有 takeoverToFullscreen
// 全屏接管路径（语义等价 AOSP fullscreen drop 的窗口最大化）。getDropTargetBounds 的
// fullscreen 矩形在库在测，供未来窗口系统扩展（最大化矩形）消费。
//
// 零 DOM / 零 window 引用（js/aosp 纯逻辑层纪律）；指示器 DOM 呈现由 mini-window.js 接线。

/** 落点区类型（DesktopModeVisualIndicator 三落点 + 无预示） */
export const DROP_ZONE = {
  NONE: 'none',
  LEFT_HALF: 'left-half',
  RIGHT_HALF: 'right-half',
  FULLSCREEN: 'fullscreen',
};

/** 边缘触发阈值（px）：指针进入距边缘该距离内即预示落点（md3 落地值，AOSP 用系统手势阈值） */
export const EDGE_TRIGGER_PX = 48;

/**
 * 解析拖拽指针位置的落点预示。
 * @param {{ x: number, y: number, vw: number, vh: number }} p 指针位置与视口尺寸
 * @param {{ edge?: number }} [opts] 边缘阈值（默认 EDGE_TRIGGER_PX）
 * @returns {string} DROP_ZONE 之一
 */
export function resolveDropZone(p, opts = null) {
  const edge = (opts && Number.isFinite(opts.edge)) ? opts.edge : EDGE_TRIGGER_PX;
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return DROP_ZONE.NONE;
  const vw = Number.isFinite(p.vw) ? p.vw : 0;
  const vh = Number.isFinite(p.vh) ? p.vh : 0;
  // 顶边缘（含两角）优先 → 全屏（AOSP 顶部角全屏指示语义）
  if (p.y <= edge) return DROP_ZONE.FULLSCREEN;
  if (p.x <= edge) return DROP_ZONE.LEFT_HALF;
  if (vw > 0 && p.x >= vw - edge) return DROP_ZONE.RIGHT_HALF;
  return DROP_ZONE.NONE;
}

/**
 * 落点目标矩形（AOSP DragToDesktopTransitionHandler 落位语义）。
 * @param {string} zone DROP_ZONE 之一
 * @param {number} vw 视口宽
 * @param {number} vh 视口高
 * @param {{ margin?: number }} [opts] 安全边距（md3 默认 8 = mini-window EDGE_MARGIN）
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export function getDropTargetBounds(zone, vw, vh, opts = null) {
  const m = (opts && Number.isFinite(opts.margin)) ? opts.margin : 0;
  if (zone === DROP_ZONE.LEFT_HALF) {
    // 左半：x∈[0, vw/2]，margin 让出呼吸空间（半宽 - 1.5×margin 保证两窗间留缝）
    return { x: m, y: m, w: Math.max(0, vw / 2 - m * 1.5), h: Math.max(0, vh - m * 2) };
  }
  if (zone === DROP_ZONE.RIGHT_HALF) {
    return { x: vw / 2 + m * 0.5, y: m, w: Math.max(0, vw / 2 - m * 1.5), h: Math.max(0, vh - m * 2) };
  }
  if (zone === DROP_ZONE.FULLSCREEN) {
    return { x: m, y: m, w: Math.max(0, vw - m * 2), h: Math.max(0, vh - m * 2) };
  }
  return null;
}

/** 是否应呈现预示层（none 不呈现） */
export function shouldShowIndicator(zone) {
  return zone !== DROP_ZONE.NONE;
}
