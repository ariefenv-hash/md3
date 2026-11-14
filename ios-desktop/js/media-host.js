// ==================== media-host.js — 媒体卡片单源投影协调器（v8.15 #37） ====================
// AOSP 语义（Android 13+ MediaControls / MediaCarouselController）：
//  * 同一 MediaSession 的媒体控件视图是**单实例**，在多个 MediaHost 挂载点之间
//    reparent（移动而非复制）——任何展开状态下媒体控件只出现一处，不双投影。
//  * AOSP 17 dual shade（ShadeMode.Dual，OverlayShade.kt）：浮动通知面板 =
//    CollapsedShadeHeader + 通知列表，**无媒体槽**；媒体控件只属 QS 浮动面板域。
//  * AOSP 17 single shade（SingleShadeNestedScrollLayout.kt）：媒体属「Media+QQS 可折叠
//    头部」域（ShadeScene.kt mediaAndQqsHeader），单实例单呈现。v11.28 起本仓宽屏不再有
//    split 分家双列（#259 P14：A17 ShadeMode.Split 已 @Deprecated）——classic 全断点
//    = 同一手风琴（窄屏场景轨机制）：Shade 场景（MediaAndQqsLayout media 槽 = 通知侧紧凑卡）
//    ↔ QS 场景（磁贴上方宽版卡）两场景各一卡，场景轨垂直平移天然互斥渲染，
//    同一时刻视口内只有一处 —— 等价于 AOSP reparent 语义，无需压制。
//
// 本模块不改变两卡各自的 media-hidden 会话门控（有会话才挂载，quick-settings.js /
// notifications.js 既有判定不动），只做**宿主裁决**：裁决为 QS 单源时对通知侧卡
// 施加结构性压制（display:none，非折叠动画——宿主裁决不是会话变化）。

/**
 * 权威宿主裁决（纯函数，可单测）。
 * @param {{shadeMode: string, viewportWidth: number}} ctx viewportWidth 仅作入参兼容保留
 *        （v11.28 起 classic 宿主与视口宽度无关；A17 Split 形态退役后无宽窄分家）
 * @returns {'qs'|'both'} 'qs' = 仅 QS 侧宽版卡为权威（通知侧压制，dual 分家面板无媒体槽）；
 *          'both' = classic 手风琴场景轨，两场景各一卡由场景轨互斥渲染。
 */
export function resolveMediaHost({ shadeMode, viewportWidth }) {
  void viewportWidth;
  return shadeMode === 'dual' ? 'qs' : 'both';
}

/** 按 getShadeMode() + 当前视口宽度落地 body[data-media-host]，CSS 据此压制非权威宿主 */
export function applyMediaHostPolicy() {
  let mode = 'classic';
  try {
    // 懒动态导入防启动期循环依赖：dual-shade.js 不反向依赖本模块，静态 import 亦无环，
    // 但 main.js 初始化链要求 media-host 不阻塞 dual-shade 的 try/catch 防护语义，
    // 故读取走 dataset 优先（applyMode 已同步写入）——与 getShadeMode() 判定同源。
    mode = document.body.dataset.shadeMode || mode;
  } catch (e) { /* 忽略 */ }
  const w = (typeof window !== 'undefined' && window.innerWidth) ||
    (typeof document !== 'undefined' && document.documentElement && document.documentElement.clientWidth) || 0;
  document.body.dataset.mediaHost = resolveMediaHost({ shadeMode: mode, viewportWidth: w });
}

/** 初始化：resize 兜底 + 模式切换广播 + 初始一次（v11.28：classic 宿主已与视口宽度无关，
 *  resize/MQL 监听保留为 dual↔classic 切换与防御性重算通道，零行为成本） */
export function initMediaHost() {
  applyMediaHostPolicy();
  window.addEventListener('resize', applyMediaHostPolicy);
  document.addEventListener('md3-shade-mode-changed', applyMediaHostPolicy);
}
