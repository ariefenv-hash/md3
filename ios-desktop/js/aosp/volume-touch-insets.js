// ==================== volume-touch-insets.js — 音量面板非模态触摸语义（#108 v9.94） ====================
// AOSP 源码依据（aosp-mirror/platform_frameworks_base main，VolumeDialogImpl.java 实拉
// 2026-11-05，2858 行快照）：
//
//   L529-532  mWindow.addFlags(FLAG_NOT_FOCUSABLE | FLAG_NOT_TOUCH_MODAL
//             | FLAG_SHOW_WHEN_LOCKED | FLAG_WATCH_OUTSIDE_TOUCH)
//             → 非模态窗口：面板外触摸不归音量窗口所有。
//
//   L465-487  onComputeInternalInsets：touchable region = 子视图 bounds 并集。
//             源码注释原文（L477-478）："We don't use touches on the volume dialog
//             container itself, so this is fine."——容器自身零触摸面；region 外的
//             触摸"should not be delivered to the volume window, and instead go to
//             the window below"（L467-469）。
//
//   L489-509  unionViewBoundsToTouchableRegion：ringer 抽屉收起态顶部预留扩展区
//             不可触摸（md3 同构：收起态非现模式按钮 hidden→display:none，天然
//             不入 hit-test，无需额外几何补偿）。
//
//   L2581-2593  onTouchEvent：mShowing && ACTION_OUTSIDE →
//             dismissH(Events.DISMISS_REASON_TOUCH_OUTSIDE)。NOTE 原文（L2581-2584）：
//             触摸发生在 touchable region 之外就收到 ACTION_OUTSIDE，"even if those
//             touches occurred within the bounds of the volume dialog"——即面板
//             bounds 内、控件区外的触摸 = 穿透至下层窗口 + 同时触发收起。

/** 触摸面选择器集（onComputeInternalInsets 子视图并集的 md3 同构映射：
 *  输出行(#92 v10.17) / mTopContainer(ringer+rows 列) / 主滑条 / 省略号 / 浮动滑条列 / 安全警告层。
 *  间隙（components_spacing 8dp）与 .vd-bg 胶囊背景不在集内 = 穿透区。 */
export const TOUCHABLE_SELECTORS = [
  '.vd-output-row',
  '.vd-ringer-drawer',
  '.vd-slider',
  '.vd-settings',
  '.vd-float-col',
  '.vd-safety',
];

/** 合并选择器串（接线层 e.target.closest 单调用消费） */
export const TOUCHABLE_SELECTOR = TOUCHABLE_SELECTORS.join(', ');

/** 指针事件角色判定（resolvePointerRole）：给定面板可见性与落点是否在触摸面内，
 *  返回三态角色——
 *    'consume'  控件面内：控件自身消费（音量步进/模式切换/警告按钮…），
 *               同时交互续期 3s 超时（VisibilityInteractor resetDismissTimeout）。
 *    'outside'  触摸面外（含面板 bounds 内非控件区与面板外）：ACTION_OUTSIDE 同义
 *               → dismissH(DISMISS_REASON_TOUCH_OUTSIDE)；穿透本身由 CSS
 *               pointer-events 分层承接（容器 none，控件 auto），事件照常落至
 *               下层元素——与 AOSP「穿透 + 收起并行」语义一致。
 *    'pass'     面板未显示：无 overlay 语义，零干预（TYPE_VOLUME_OVERLAY 未挂窗）。 */
export const PointerRole = {
  CONSUME: 'consume',
  OUTSIDE: 'outside',
  PASS: 'pass',
};

export const resolvePointerRole = ({ visible, insideTouchable }) => {
  if (!visible) return PointerRole.PASS;
  return insideTouchable ? PointerRole.CONSUME : PointerRole.OUTSIDE;
};

/** DISMISS_REASON_TOUCH_OUTSIDE 字面量（Events.java dismiss reason 语义对齐，
 *  供 dismiss('touch_outside') 调用点自文档化） */
export const DISMISS_REASON_TOUCH_OUTSIDE = 'touch_outside';
