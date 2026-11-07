// ==================== overlay-touch-policy.js — 系统浮层触摸语义公约（#114 v10.57） ====================
// 议题 #114「系统浮层触摸语义统一」：把 #108（v9.94）在音量面板落地的非模态纪律
// 泛化为全部系统浮层的单一真源——每个浮层显式声明 OutsideMode 与可触摸区，
// 「触摸外部 → 收起」统一以 pointerdown（ACTION_OUTSIDE down 拍）判定。
//
// AOSP 源码依据（aosp-mirror/platform_frameworks_base main，2026-11-05 实拉）：
//
// ① 非模态窗口样板（TYPE_VOLUME_OVERLAY，#108 已落地 aosp/volume-touch-insets.js）：
//    VolumeDialogImpl.java L529-532 addFlags(FLAG_NOT_FOCUSABLE | FLAG_NOT_TOUCH_MODAL |
//    FLAG_WATCH_OUTSIDE_TOUCH)；L465-487 onComputeInternalInsets（touchable region =
//    子视图 bounds 并集，容器自身零触摸面）；L2581-2593 onTouchEvent ACTION_OUTSIDE →
//    dismissH(DISMISS_REASON_TOUCH_OUTSIDE)。region 外触摸穿透至下层窗口 + 面板收起
//    并行（NOTE L2581-2584：即使触摸发生在面板 bounds 内、控件区外亦同）。
//
// ② 模态对话框样板（GlobalActionsDialog，本版 #114 对齐）：
//    GlobalActionsDialogLite.java（main 快照 2771 行）——
//    L2407-2414 getWidth()/getHeight() 返回 MATCH_PARENT（对话框窗口全屏 + dim 遮罩，
//    触摸面 = 整窗）；L2415-2417 onTouchEvent → mGestureDetector.onTouchEvent；
//    L2292-2297 onSingleTapUp → mUiEventLogger.log(GA_CLOSE_TAP_OUTSIDE) + cancel()。
//    即：落在菜单面板之外的单击 = 全窗触摸面上的「外部单击」→ 消费该触摸 + 整窗
//    收起（cancel）——下层不可触，与音量面板的穿透语义相反，两态由 OutsideMode 分立。
//
// ③ Launcher3 浮层家族（分享面板 ChooserActivity / 微件选择器 WidgetsFullSheet /
//    任务栏溢出 ArrowPopup）：AbstractFloatingView 开放容器纪律——浮动层激活期间
//    容器外触摸 → closeOpenContainer 收起（tap-outside-dismiss 同范式，md3 以
//    遮罩/面板外 pointerdown 承接）。
//
// 公约（四条，接线层逐浮层遵守）：
//   1. 每个系统浮层必须声明 OutsideMode + 可触摸区选择器集（declareTouchableRegions）：
//      - FALLTHROUGH（非模态）：容器 pointer-events:none + 控件 opt-in auto，
//        触摸面外事件物理穿透至下层元素，同时收起面板（穿透 + 收起并行）。
//      - DISMISS（对话框）：全屏遮罩消费触摸，遮罩上的外部单击 → 收起（下层不可触）。
//   2. 外部收起在 pointerdown 判定（ACTION_OUTSIDE 于 down 拍派发）；click 监听
//      保留为浏览器兼容兜底（幂等二次收起无害），不再是主判定通道。
//   3. Escape 保留为桌面补充通道（触屏无 Esc；AOSP 对应 BACK 收起）。
//   4. 开启手势自身不得触发收起：触发钮 pointerdown 先于 open()，状态机以 open()
//      时刻划界（ARM 门）——open 前的 feed 一律忽略，自关闭免疫无需计时器。
//      （AOSP 同构：Dialog show() 之后 ACTION_OUTSIDE 才开始派发给新窗口，
//      开启手势属于前一窗口的时间线，天然不回流。）

/** 外部触摸处置模式（浮层声明用；与 #108 PointerRole 的映射见下方对齐表）。 */
export const OutsideMode = Object.freeze({
  /** 非模态（音量面板 #108 样板）：触摸面外事件穿透至下层 + 面板收起。 */
  FALLTHROUGH: 'fallthrough',
  /** 对话框（电源菜单/分享页/溢出面板/微件选择器）：遮罩消费触摸 + 收起。 */
  DISMISS: 'dismiss',
});

/** 外部处置动作字面量（feedPointerDown 返回值；接线层可据此记账/埋点）。 */
export const OutsideAction = Object.freeze({
  /** 浮层未显示：零 overlay 语义。 */
  NONE: 'none',
  /** 落点在可触摸区内：控件自身消费，零干预。 */
  CONSUME: 'consume',
  /** 非模态穿透：事件继续落至下层元素 + 面板收起（onDismiss 已回调）。 */
  FALLTHROUGH: 'fallthrough',
  /** 对话框遮罩消费：事件不再下传 + 面板收起（onDismiss 已回调）。 */
  DISMISS: 'dismiss',
});

/**
 * 外部触摸处置判定（resolveOutsideAction）。
 * #108 resolvePointerRole 的公约层泛化——映射对齐：
 *   role 'pass'    ⇔ action NONE
 *   role 'consume' ⇔ action CONSUME
 *   role 'outside' ⇔ action FALLTHROUGH（音量，穿透模式）/ DISMISS（对话框，消费模式）
 * @param {object} input
 * @param {string} input.mode            OutsideMode 之一
 * @param {boolean} input.visible        浮层是否处于显示态
 * @param {boolean} input.insideTouchable 落点是否在可触摸区内
 * @returns {string} OutsideAction 字面量
 */
export function resolveOutsideAction({ mode, visible, insideTouchable }) {
  if (!visible) return OutsideAction.NONE;
  if (insideTouchable) return OutsideAction.CONSUME;
  return mode === OutsideMode.FALLTHROUGH ? OutsideAction.FALLTHROUGH : OutsideAction.DISMISS;
}

/**
 * 外部收起状态机（createOutsideDismissMachine）。
 * 状态：closed（visible=false, armed=false）→ open() → open（visible=true, armed=true）
 *       → feed 外部落点（DISMISS 模式）→ 回 closed（armed 复位，单次消费）。
 * ARM 门：open() 之前的 feedPointerDown 一律返回 NONE——开启手势（触发钮长按/
 * 单击的 down 拍）先于 open() 发生，天然不触发自关闭。
 * @param {object} [opts]
 * @param {string} [opts.mode=OutsideMode.DISMISS]  处置模式
 * @param {Function} [opts.onDismiss]               收起回调（DISMISS 命中时调用一次）
 */
export function createOutsideDismissMachine(opts = {}) {
  const mode = opts.mode || OutsideMode.DISMISS;
  const onDismiss = typeof opts.onDismiss === 'function' ? opts.onDismiss : null;
  let visible = false;
  let armed = false;
  let dismissCount = 0;
  return {
    /** 浮层打开时调用：进入 armed 态（此后外部落点才开始判定）。 */
    open() {
      visible = true;
      armed = true;
      return true;
    },
    /** 浮层收起时调用：复位（open 前的任何 feed 不会误触发）。 */
    close() {
      visible = false;
      armed = false;
      return true;
    },
    /**
     * pointerdown 喂入（接线层：document/overlay 级监听每拍必喂）。
     * @param {boolean} insideTouchable 落点是否在浮层可触摸区内
     * @returns {string} OutsideAction 字面量
     */
    feedPointerDown(insideTouchable) {
      if (!visible || !armed) return OutsideAction.NONE;
      const act = resolveOutsideAction({ mode, visible, insideTouchable });
      if (act === OutsideAction.DISMISS) {
        dismissCount++;
        armed = false; // 单次消费（AOSP cancel 后窗口移除，不存在二次派发）
        visible = false;
        if (onDismiss) onDismiss();
      }
      return act;
    },
    /** 快照（测试/调试）。 */
    __state() {
      return { mode, visible, armed, dismissCount };
    },
  };
}

/**
 * 可触摸区声明（declareTouchableRegions）——onComputeInternalInsets touchable
 * region 的 md3 同构映射：控件面选择器集，命中即 consume，未命中即外部。
 * @param {string[]} selectors 控件面选择器（子视图并集语义，顺序无关）
 * @returns {{selectors: string[], selector: string}} 合并选择器（closest 单调用消费）
 */
export function declareTouchableRegions(selectors) {
  const list = (Array.isArray(selectors) ? selectors : []).filter(Boolean);
  return {
    selectors: Object.freeze(list.slice()),
    selector: list.join(', '),
  };
}

/** 落点判定（isInsideTouchable）：e.target 经 closest 命中选择器集即控件面。
 *  target 非元素（文本节点/程序合成事件无 target）一律视为外部——保守收起。 */
export function isInsideTouchable(target, selector) {
  if (!target || typeof target.closest !== 'function' || !selector) return false;
  return !!target.closest(selector);
}
