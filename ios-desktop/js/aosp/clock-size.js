// ==================== clock-size.js — AOSP 锁屏时钟双档（SMALL/LARGE）+ DYNAMIC 策略 ====================
// v9.27 #186 二期（R50 窗）。权威快照（api.github.com contents 端点实拉，R49 加餐入库）：
//   docs/reference/frameworks-base/systemui/keyguard/ClockSize.kt（63 行）
//   docs/reference/frameworks-base/systemui/keyguard/KeyguardClockSwitch.java（501 行）
//   docs/reference/frameworks-base/systemui/keyguard/KeyguardClockSwitchController.java（696 行）
//
// 移植锚（逐字同构对照）：
//   ClockSize.kt L23-42   enum ClockSize(SMALL/LARGE) + fromLegacy 未识别兜底 LARGE
//                         （Log.e → console.error，返回兜底语义逐字保留）
//   ClockSize.kt L44-63   enum ClockSizeSetting(DYNAMIC(1)/SMALL(0)) + fromSettingValue
//                         未识别兜底 DYNAMIC（无 LARGE 档——用户设置只有「动态/小」两档，
//                         LARGE 只能由 DYNAMIC 决策或二级显示器路径产生）
//   KeyguardClockSwitch.java L58-59   public static final int LARGE = 0 / SMALL = 1
//                         （legacyValue 真值，.java 非 .kt——路径考证在录）
//   KeyguardClockSwitch.java L448-461 switchToClock：同值短路 return false +
//                         mDisplayedClockSize 记忆（null=未初始化必切换）
//   KeyguardClockSwitchController.java L455-461 displayClock 的
//   KeyguardClockSwitchController.java L617-626   mCanShowDoubleLineClock 门
//                         （LOCKSCREEN_USE_DOUBLE_LINE_CLOCK，false 时强制 SMALL）
//
// md3 桌面语境映射标注（诚实移植边界，#85-F3 同范式）：
//   ① ClockSizeSetting 双档决策表在 AOSP 中由 KeyguardClockInteractor/ClockEventController
//      订阅通知栈空态驱动（上游文件未 vendor）——本模块按「DYNAMIC: 有通知→SMALL,
//      无通知→LARGE；SMALL: 恒 SMALL」语义下沉（AOSP DYNAMIC 行为公理，md3 由
//      lock-screen.js renderLockNotifications 现成数据源接线）。
//   ② mCanShowDoubleLineClock：md3 无 Settings.Secure.LOCKSCREEN_USE_DOUBLE_LINE_CLOCK
//      设置面（AOSP config_doublelineClockDefault 默认 1 → 初值 true 同构），门控消费位
//      保留为 applyDoubleLineGate 纯函数，设置面落地后改读设置值。
//   ③ switchToClock 的 mChildrenAreLaidOut 门（L455）映射为 DOM 在场判定，由
//      lock-screen.js 消费侧承担（ensureLockDOM 先建 DOM 后判档）。

const TAG = 'ClockSize';

/** KeyguardClockSwitch.java L54-59：@IntDef({LARGE, SMALL}) + legacyValue 真值 */
export const KEYGUARD_CLOCK_SWITCH = Object.freeze({
  LARGE: 0,
  SMALL: 1,
});

/**
 * ClockSize.kt L23-42 enum ClockSize(@KeyguardClockSwitch.ClockSize val legacyValue: Int)
 * SMALL(KeyguardClockSwitch.SMALL) / LARGE(KeyguardClockSwitch.LARGE)
 */
export const ClockSize = Object.freeze({
  SMALL: Object.freeze({ name: 'SMALL', legacyValue: KEYGUARD_CLOCK_SWITCH.SMALL }),
  LARGE: Object.freeze({ name: 'LARGE', legacyValue: KEYGUARD_CLOCK_SWITCH.LARGE }),
});

/**
 * ClockSize.kt L31-40 fromLegacy：遍历枚举按 legacyValue 匹配；未识别
 * console.error（Log.e 同位）+ 兜底 return LARGE（逐字语义）。
 */
export function fromLegacy(value) {
  const values = [ClockSize.SMALL, ClockSize.LARGE];
  for (const enumVal of values) {
    if (enumVal.legacyValue === value) return enumVal;
  }
  console.error(TAG, `Unrecognized legacy clock size value: ${value}`);
  return ClockSize.LARGE;
}

/**
 * ClockSize.kt L44-63 enum ClockSizeSetting(val settingValue: Int)
 * DYNAMIC(1) / SMALL(0)（无 LARGE 档，注释见模块头）
 */
export const ClockSizeSetting = Object.freeze({
  DYNAMIC: Object.freeze({ name: 'DYNAMIC', settingValue: 1 }),
  SMALL: Object.freeze({ name: 'SMALL', settingValue: 0 }),
});

/**
 * ClockSize.kt L52-62 fromSettingValue：遍历枚举按 settingValue 匹配；未识别
 * console.error（Log.e 同位）+ 兜底 return DYNAMIC（逐字语义）。
 */
export function fromSettingValue(value) {
  const values = [ClockSizeSetting.DYNAMIC, ClockSizeSetting.SMALL];
  for (const enumVal of values) {
    if (enumVal.settingValue === value) return enumVal;
  }
  console.error(TAG, `Unrecognized clock setting value: ${value}`);
  return ClockSizeSetting.DYNAMIC;
}

/**
 * DYNAMIC 双档决策表（模块头标注①：通知栈空态驱动，md3 接线由
 * lock-screen.js renderLockNotifications 数据源承担）。
 * DYNAMIC → 有通知 SMALL / 无通知 LARGE；SMALL → 恒 SMALL。
 */
export function resolveDisplayedClockSize(setting, hasNotifications) {
  if (setting === ClockSizeSetting.SMALL) return ClockSize.SMALL;
  return hasNotifications ? ClockSize.SMALL : ClockSize.LARGE;
}

/**
 * KeyguardClockSwitchController.java L455-457 门控同构：
 * if (!mCanShowDoubleLineClock && clockSize == LARGE) return（拒绝切换，
 * mCurrentClockSize 维持原值）→ 纯函数化：不可显示时把 LARGE 请求降档回 SMALL，
 * SMALL 请求原样通过。md3 映射标注②（常量 true，见模块头）。
 */
export function applyDoubleLineGate(desired, canShowDoubleLineClock) {
  if (!canShowDoubleLineClock && desired === ClockSize.LARGE) return ClockSize.SMALL;
  return desired;
}

/**
 * KeyguardClockSwitch.java L448-461 switchToClock 同构：
 *   if (mDisplayedClockSize != null && clockSize == mDisplayedClockSize) return false（同值短路）；
 *   否则 mDisplayedClockSize = clockSize 并返回 true。
 * 纯函数化：入参 prev（null=未初始化，L128 Integer mDisplayedClockSize 语义），
 * 返回 { changed, displayed }——changed=false 时 displayed 维持 prev（调用方不得改档）。
 */
export function switchToClock(prev, next) {
  if (prev !== null && prev !== undefined && next === prev) {
    return { changed: false, displayed: prev };
  }
  return { changed: true, displayed: next };
}
