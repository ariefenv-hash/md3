// ==================== overlay-registry.js — 全屏浮层边缘返回注册表（v7.8 最小版） ====================
// 背景：v7.7-B 在 gestures.js 中硬编码了唯一目标（themePickerOverlay），无法扩展。
// v7.8 引入最小注册表：page-like 域（全屏页形态浮层）注册统一的边缘返回协议，
// 手势系统按「谁激活谁接管」查询，不再认识任何具体浮层。
//
// 设计边界（刻意保持最小）：
// - 只服务「page-like 全屏页」的边缘滑出返回这一个交互域；
//   dialog-like（居中卡：电源对话框等）与 immersive（最近任务/搜索）暂不纳入，
//   它们维持各自现状（点外部关闭 / 自有手势）。
// - 未注册的浮层行为完全不变（查不到 def = 走原有关闭路径）。
//
// def 协议（全部必填，调用方 gestures.js 保证时序 down→progress*→up）：
//   id              : 调试标识
//   isActive()      : 当前是否可被边缘手势接管（通常 = overlay 有 active class）
//   beginGesture(dir)      : 手势开始。dir=+1 左缘右滑（页面向右滑出），-1 右缘左滑
//   progressGesture(dx, vx): 跟手。dx=提交方向投影位移(px,带符号)，vx=横向速度(px/s)
//   commitGesture(vx)      : 松手提交（位移过半或速度达标）。vx=释放横向速度
//   cancelGesture(vx)      : 松手取消（回弹）。vx=释放横向速度

const pageLikeDefs = new Set();

/** 注册一个 page-like 全屏页浮层；返回注销函数 */
export function registerOverlayBack(def) {
  pageLikeDefs.add(def);
  return () => pageLikeDefs.delete(def);
}

/** 边缘手势按下时查询：返回当前激活且可接管的浮层 def（至多一个） */
export function findActiveOverlayBack() {
  for (const def of pageLikeDefs) {
    try {
      if (def.isActive()) return def;
    } catch (e) { /* 单个 def 异常不拖垮手势系统 */ }
  }
  return null;
}
