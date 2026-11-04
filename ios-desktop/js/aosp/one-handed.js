// ==================== one-handed.js — AOSP OneHanded 全机制 · 纯逻辑层（#204） ====================
//
// 1:1 移植自 AOSP aosp-mirror/platform_frameworks_base main
// libs/WindowManager/Shell/src/com/android/wm/shell/onehanded/（OneHandedController 31.6KB /
// OneHandedState / OneHandedTimeoutHandler / OneHandedTouchHandler / OneHandedSettingsUtil，
// 2026-11-04 raw 实拉）：
//
// 【状态机 OneHandedState.java】
//   STATE_NONE=0 / STATE_ENTERING=1 / STATE_ACTIVE=2 / STATE_EXITING=3
//   生命周期 CUJ：NONE → ENTERING → ACTIVE → EXITING → NONE
//   isTransitioning() = ENTERING || EXITING；isInOneHanded() = ACTIVE；
//   setState 派发 OnStateChangedListener。
//   （web 侧加固：transitionTo 校验合法迁移表并返回 boolean——AOSP setState 直赋不校验，
//   加固行为注释在录，主链语义 1:1。）
//
// 【偏移常量 OneHandedController.java L261-264】
//   offsetPercentageConfig = getFraction(R.fraction.config_one_handed_offset, 1, 1)
//   → main 分支 wmshell res values config.xml：config_one_handed_offset = 40%
//   （议题 #204 引 33% 为旧版本/设备 overlay 值，main 权威 40%，勘误在录）
//   计算式：Math.round(offsetPercentageConfig * 100.0f) 存百分比，应用时按显示高度取比例。
//
// 【动画时长 wmshell res config.xml】
//   config_one_handed_translate_animation_duration = 600（ms）
//
// 【超时 OneHandedSettingsUtil.java L58-68 + OneHandedTimeoutHandler.java L39-41】
//   ONE_HANDED_TIMEOUT_NEVER = 0
//   ONE_HANDED_TIMEOUT_SHORT_IN_SECONDS = 4
//   ONE_HANDED_TIMEOUT_MEDIUM_IN_SECONDS = 8
//   ONE_HANDED_TIMEOUT_LONG_IN_SECONDS = 12
//   默认 = MEDIUM（TimeoutHandler L39-41 「Default timeout is ONE_HANDED_TIMEOUT_MEDIUM」，
//   Settings.Secure.ONE_HANDED_MODE_TIMEOUT 默认取 MEDIUM——SettingsUtil L145）
//   NEVER 时零 schedule（TimeoutHandler L92）。
//
// 【触摸语义 OneHandedTouchHandler.java L83-121】
//   isWithinTouchOutsideRegion(x, y) = Math.round(y) < mLastUpdatedBounds.top（L119-121）
//   ACTION_DOWN/MOVE 在内部区域 → mTimeoutHandler.resetTimer()（L87-90）
//   ACTION_UP/CANCEL：resetTimer 恒执行；外部区域且 !mIsOnStopTransitioning → onStop() 一次，
//   门标志复位防重（L93-102）
//   bounds.top = 迁移后 DisplayArea 顶 = 显示高度 × offset（40%）。
//
// 【大屏禁用】
//   AOSP 平板/展开态（sw600dp）不启用单手模式（config_supportsOneHanded_mode 设备级 +
//   大屏形态不出此功能；#204 表格「大屏禁用」行）。web 落地以 600px 断点同构
//   （md3 TABLET_MIN_WIDTH / pull-down-gesture.js L562 matchMedia 同款先例），纯逻辑收
//   screenWidthPx 参数，DOM 面喂 matchMedia 结果。
//
// 【触发 OneHandedTouchHandler + SettingsUtil L174】
//   导航条下拉触发（swipe_down_to_enter / SWIPE_BOTTOM_TO_NOTIFICATION_ENABLED 设置键）；
//   上滑导航条退出；点外部区域退出（外部区域 = bounds.top 以上）。
//
// 纯逻辑纪律：零 DOM / 零 window / 零 Math.random；setTimeout 由 DOM 面承担，本模块只算
// 到期时刻与调度语义。

/** 状态常量（OneHandedState.java 1:1） */
export const STATE_NONE = 0;
export const STATE_ENTERING = 1;
export const STATE_ACTIVE = 2;
export const STATE_EXITING = 3;

/**
 * 默认下移比例（wmshell config.xml config_one_handed_offset = 40%，main 分支权威值；
 * 议题 #204 引 33% 为旧值勘误在录）
 */
export const CONFIG_ONE_HANDED_OFFSET = 0.40;

/** 迁移动画时长（config_one_handed_translate_animation_duration，ms） */
export const CONFIG_ONE_HANDED_TRANSLATE_ANIMATION_DURATION = 600;

/** 超时档位（OneHandedSettingsUtil.java 1:1，单位秒） */
export const ONE_HANDED_TIMEOUT_NEVER = 0;
export const ONE_HANDED_TIMEOUT_SHORT_IN_SECONDS = 4;
export const ONE_HANDED_TIMEOUT_MEDIUM_IN_SECONDS = 8;
export const ONE_HANDED_TIMEOUT_LONG_IN_SECONDS = 12;
/** 默认超时 = MEDIUM（OneHandedTimeoutHandler.java L39-41） */
export const ONE_HANDED_DEFAULT_TIMEOUT_IN_SECONDS = ONE_HANDED_TIMEOUT_MEDIUM_IN_SECONDS;

/** 大屏禁用断点（web 裁决：md3 TABLET_MIN_WIDTH 同款 600px，AOSP sw600dp 同构） */
export const LARGE_SCREEN_THRESHOLD_PX = 600;

/** 导航条下拉触发最小位移（px；web 裁决值——AOSP swipe_down_to_enter 为手势覆盖层实现，
 *  无公开数值常量，取 md3 手势族既有阈值量级（60px），注释在录） */
export const SWIPE_DOWN_ENTER_THRESHOLD_PX = 60;

/**
 * 合法迁移表（web 侧加固——AOSP OneHandedState.setState 直赋不校验；此处按生命周期 CUJ
 * NONE→ENTERING→ACTIVE→EXITING→NONE 收紧，返回 boolean 供调用方裁决）
 */
const VALID_TRANSITIONS = {
  [STATE_NONE]: [STATE_ENTERING],
  [STATE_ENTERING]: [STATE_ACTIVE, STATE_EXITING],
  [STATE_ACTIVE]: [STATE_EXITING],
  [STATE_EXITING]: [STATE_NONE],
};

/**
 * 偏移像素（OneHandedController.java L261-264 Math.round 语义同构：fraction × 100 存百分比，
 * 应用时按显示高度取比例取整）
 * @param {number} displayHeight 显示高度（px）
 * @param {number} [percentage] 偏移比例（0-1，默认 config 值 0.40）
 * @returns {number} translateY 像素（四舍五入）
 */
export function offsetForHeight(displayHeight, percentage = CONFIG_ONE_HANDED_OFFSET) {
  if (!Number.isFinite(displayHeight) || displayHeight <= 0) return 0;
  if (!Number.isFinite(percentage) || percentage <= 0) return 0;
  return Math.round(displayHeight * percentage);
}

/**
 * 进入资格判定（Controller 聚合语义：开关 × 大屏禁用 × 过渡互斥三通道）
 * @param {{ enabled: boolean, screenWidthPx: number, transitioning?: boolean }} cond
 * @returns {{ ok: boolean, reason?: 'disabled'|'large_screen'|'transitioning' }}
 */
export function canEnterOneHanded(cond) {
  const { enabled, screenWidthPx, transitioning } = cond || {};
  if (!enabled) return { ok: false, reason: 'disabled' };
  if (Number.isFinite(screenWidthPx) && screenWidthPx >= LARGE_SCREEN_THRESHOLD_PX) {
    return { ok: false, reason: 'large_screen' };
  }
  if (transitioning) return { ok: false, reason: 'transitioning' };
  return { ok: true };
}

/**
 * 超时档位解析（Settings.Secure.ONE_HANDED_MODE_TIMEOUT 消费语义同构：合法档位直取，
 * 非法值静默回落默认 MEDIUM——SettingsUtil L145 默认参数语义）
 * @param {number} seconds 设置值（0/4/8/12 或非法值）
 * @returns {number} 归一化后的秒数
 */
export function resolveTimeoutSeconds(seconds) {
  if (seconds === ONE_HANDED_TIMEOUT_NEVER
    || seconds === ONE_HANDED_TIMEOUT_SHORT_IN_SECONDS
    || seconds === ONE_HANDED_TIMEOUT_MEDIUM_IN_SECONDS
    || seconds === ONE_HANDED_TIMEOUT_LONG_IN_SECONDS) {
    return seconds;
  }
  return ONE_HANDED_DEFAULT_TIMEOUT_IN_SECONDS;
}

/** NEVER 零调度（OneHandedTimeoutHandler.java L92 同构） */
export function shouldScheduleTimeout(seconds) {
  return resolveTimeoutSeconds(seconds) !== ONE_HANDED_TIMEOUT_NEVER;
}

/** 到期时刻（DOM 面 setTimeout(ms) 的纯计算件） */
export function timeoutExpiresAt(nowMs, seconds) {
  return nowMs + resolveTimeoutSeconds(seconds) * 1000;
}

/**
 * 触摸区域判定（OneHandedTouchHandler.java L119-121 1:1）：
 * 外部区域 = 单手迁移后 bounds.top 之上（y 小于顶边）
 * @param {number} y 指针 y（px）
 * @param {number} boundsTop 迁移后 bounds 顶（px，= 显示高度 × offset）
 * @returns {boolean}
 */
export function isWithinTouchOutsideRegion(y, boundsTop) {
  return Math.round(y) < boundsTop;
}

/**
 * 创建状态机实例（OneHandedState.java 同构：setState 派发监听器）
 * 加固：transitionTo 校验合法迁移表，非法迁移返回 false 不派发。
 */
export function createOneHandedState() {
  let current = STATE_NONE;
  const listeners = [];
  return {
    getState() { return current; },
    /** isTransitioning()（OneHandedState 同构） */
    isTransitioning() { return current === STATE_ENTERING || current === STATE_EXITING; },
    /** isInOneHanded()（OneHandedState 同构） */
    isInOneHanded() { return current === STATE_ACTIVE; },
    addListener(fn) { listeners.push(fn); },
    /** 合法迁移校验 + 派发（加固行为在录） */
    transitionTo(next) {
      if (!(VALID_TRANSITIONS[current] || []).includes(next)) return false;
      current = next;
      for (const fn of listeners) fn(next);
      return true;
    },
    /** 测试/恢复用直赋（AOSP setState 原语义，直赋派发） */
    setState(next) {
      current = next;
      for (const fn of listeners) fn(next);
    },
  };
}

/**
 * 创建触摸语义机（OneHandedTouchHandler.onMotionEvent L83-102 同构）：
 * - down/move 在内部区域 → resetTimer 信号（调用方喂给超时处理）
 * - up/cancel：resetTimer 恒执行；外部区域且未在停止过渡 → onStop 信号一次（门标志防重）
 * 返回 { consume(action, x, y, boundsTop) }，产出 { resetTimer, stop, insideRegion } 语义对象。
 */
export function createOneHandedTouchHandler() {
  let isOnStopTransitioning = false;
  return {
    /**
     * @param {'down'|'move'|'up'|'cancel'} action
     * @param {number} y 指针 y
     * @param {number} boundsTop 迁移后 bounds 顶
     * @returns {{ resetTimer: boolean, stop: boolean }}
     */
    consume(action, y, boundsTop) {
      const inOutsideRegion = isWithinTouchOutsideRegion(y, boundsTop);
      const result = { resetTimer: false, stop: false };
      if (action === 'down' || action === 'move') {
        if (!inOutsideRegion) result.resetTimer = true;
      } else if (action === 'up' || action === 'cancel') {
        result.resetTimer = true;
        if (inOutsideRegion && !isOnStopTransitioning) {
          result.stop = true;
          isOnStopTransitioning = true; // 门保持到过渡落定（L94-101 1:1：复位的是
                                        // mIsInOutsideRegion 局部量，本实现为无状态
                                        // 每次重算；门由 resetStopGate 复位）
        }
      }
      return result;
    },
    /** 停止过渡完成（exit→NONE 落定后由 DOM 面通知复位门标志） */
    resetStopGate() { isOnStopTransitioning = false; },
  };
}

/** 模块级冒烟自检（node --input-type=module 直跑本文件时执行） */
if (typeof process !== 'undefined' && process.argv && process.argv[1]
  && process.argv[1].endsWith('one-handed.js')) {
  const st = createOneHandedState();
  console.assert(st.getState() === STATE_NONE, 'init NONE');
  console.assert(st.transitionTo(STATE_ACTIVE) === false, 'NONE→ACTIVE 非法拒绝');
  console.assert(st.transitionTo(STATE_ENTERING) === true, 'NONE→ENTERING 合法');
  st.transitionTo(STATE_ACTIVE);
  console.assert(st.isInOneHanded() && !st.isTransitioning(), 'ACTIVE 语义');
  console.assert(offsetForHeight(844) === Math.round(844 * 0.40), 'offset 844×40%');
  console.assert(canEnterOneHanded({ enabled: true, screenWidthPx: 1024 }).reason === 'large_screen', '大屏禁用');
  console.assert(resolveTimeoutSeconds(99) === 8, '非法档位回落 MEDIUM');
  console.assert(shouldScheduleTimeout(0) === false, 'NEVER 零调度');
  const th = createOneHandedTouchHandler();
  const r1 = th.consume('down', 500, 338);
  console.assert(r1.resetTimer && !r1.stop, '内部区域 reset');
  const r2 = th.consume('up', 100, 338);
  console.assert(r2.stop, '外部区域 stop 一次');
  console.log('one-handed.js smoke OK');
}
