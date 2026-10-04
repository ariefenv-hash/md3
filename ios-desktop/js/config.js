// ==================== config.js — 全局常量配置 ====================

// 手势触发阈值
export const BOTTOM_TRIGGER      = 120;   // 底部手势触发区高度 (px)
export const EDGE_TRIGGER_WIDTH  = 38;    // 左右边缘触发宽度 (px)

// 缩放约束
export const MIN_PREVIEW_SCALE   = 0.88;  // 边缘拖拽时窗口最小缩放
export const MAX_DRAG_RATIO      = 0.75;  // 底部拖拽最大距离 / 屏幕高度

// 关闭判定阈值
export const DISMISS_DIST_RATIO  = 0.14;  // 拖拽距离 / 屏幕高度 > 此值 → 关闭
export const DISMISS_VEL         = 380;   // 释放速度 > 此值 → 关闭
export const FLICK_VEL           = 220;   // 快速上滑轻弹判定阈值

// 速度缩放（将像素/秒映射到弹簧初速度）
export const VEL_SCALE           = 0.0012;
export const SCALE_VEL_SCALE     = 0.0012;
export const MAX_INITIAL_VEL     = 18;    // 弹簧初速度上限
