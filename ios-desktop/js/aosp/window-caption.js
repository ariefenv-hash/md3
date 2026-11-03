// ==================== window-caption.js — WindowDecorCaptionHandleRepository 同构（#199） ====================
//
// AOSP 源：libs/WindowManager/Shell/src/com/android/wm/shell/desktopmode/
//   WindowDecorCaptionHandleRepository.kt（#199 议题正文实证）
//   窗口题签（caption）句柄的统一管理层：拖拽移动 / 双击最大化句柄集中在此裁决，
//   免得各窗口装饰实现各自为政（Repository 语义 = 句柄状态机单源）。
//
// 三类句柄语义（#199 落点二）：
//   1. 拖拽移动 —— 指针按住题签位移超 slop 即进入拖拽（拖拽后本次手势不再计双击）
//   2. 双击最大化 —— 两次快速点击（间隔 < DOUBLE_TAP_MS、位移 < SLOP）切换最大化/还原
//      （Android 题签双击最大化惯例；A11+ caption handle 同语义）
//   3. 悬停高亮 —— 沉浸态（最大化）题签自动隐藏，hover/拖拽临时唤出
//      （DesktopImmersiveController 语义：captionVisibility 四态裁决）
//
// md3 落地（v9.70 #199，裁决在录）：
//   · md3 题签 = mini-window .mini-header（HEADER_H=40，v7.53 起承担拖拽）——本模块把
//     双击最大化/沉浸可见性判定从 mini-window.js 内联逻辑升格为纯函数单源
//   · 拖拽管线上下文（pointer capture / 速度采样）仍归 mini-window.js（既有 v7.53 纪律
//     不动），本模块只裁决「这是不是双击」「题签该不该显示」两件事
//
// 零 DOM / 零 window 引用；时钟由外部注入（now()，可测性）。

/** 双击判定窗口（ms）：两次抬起间隔小于该值视为双击（Android caption 双击惯例） */
export const CAPTION_DOUBLE_TAP_MS = 300;

/** 双击位移容差（px）：两次抬起位移（与两次按下位移）均小于该值才算双击 */
export const CAPTION_DOUBLE_TAP_SLOP_PX = 12;

/** 拖拽启动位移（px）：按下后位移超该值进入拖拽，本次手势退役双击 */
export const CAPTION_DRAG_SLOP_PX = 6;

/**
 * 创建题签句柄状态机（拖拽/双击统一裁决，WindowDecorCaptionHandleRepository 同构）。
 * @param {{ onToggleMaximize?: () => void, now?: () => number }} [opts]
 * @returns {{
 *   down: (x: number, y: number) => void,
 *   move: (x: number, y: number) => void,
 *   up: (x: number, y: number) => boolean,
 *   isDragging: () => boolean,
 *   reset: () => void,
 * }}
 */
export function createCaptionHandle(opts = {}) {
  const onToggleMaximize = typeof opts.onToggleMaximize === 'function' ? opts.onToggleMaximize : null;
  const now = typeof opts.now === 'function' ? opts.now : () => performance.now();

  let downInfo = null;    // { x, y, t, moved }
  let lastUp = null;      // { x, y, t }
  let dragging = false;

  function dist(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  return {
    down(x, y) {
      downInfo = { x, y, t: now(), moved: false };
      dragging = false;
    },
    move(x, y) {
      if (!downInfo || dragging) return;
      if (dist(x, y, downInfo.x, downInfo.y) > CAPTION_DRAG_SLOP_PX) {
        downInfo.moved = true;
        dragging = true;      // 进入拖拽：本次手势退役双击判定（lastUp 保持，供下一手势双击）
      }
    },
    up(x, y) {
      if (!downInfo) return false;
      const t = now();
      const wasDrag = downInfo.moved;
      const curDown = { x: downInfo.x, y: downInfo.y };
      downInfo = null;
      dragging = false;
      if (wasDrag) return false;    // 拖拽手势不计双击
      // 双击判定：与上次抬起间隔 < MS，且两次抬起位移、按下位移均 < SLOP
      if (lastUp) {
        const dt = t - lastUp.t;
        const upDist = dist(x, y, lastUp.x, lastUp.y);
        const downDist = dist(curDown.x, curDown.y, lastUp.x, lastUp.y);
        if (dt < CAPTION_DOUBLE_TAP_MS && upDist < CAPTION_DOUBLE_TAP_SLOP_PX && downDist < CAPTION_DOUBLE_TAP_SLOP_PX) {
          lastUp = null;      // 消费本次双击（三击不再连发）
          if (onToggleMaximize) onToggleMaximize();
          return true;        // 双击已触发（调用方跳过吸附归位，防互抢 rAF 句柄）
        }
      }
      lastUp = { x, y, t };
      return false;
    },
    isDragging: () => dragging,
    reset() { downInfo = null; lastUp = null; dragging = false; },
  };
}

/**
 * 题签可见性裁决（DesktopImmersiveController 沉浸语义同构）：
 * 非最大化 = 常显；最大化 = 沉浸态自动隐藏，hover / 拖拽临时唤出。
 * @param {{ maximized: boolean, hovered?: boolean, dragging?: boolean }} s
 * @returns {'visible'|'hidden'}
 */
export function captionVisibility(s) {
  if (!s || !s.maximized) return 'visible';
  return (s.hovered || s.dragging) ? 'visible' : 'hidden';
}
