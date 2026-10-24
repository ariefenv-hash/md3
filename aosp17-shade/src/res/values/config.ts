/**
 * res/values/config.ts — 移植自 frameworks/base/packages/SystemUI/res/values/shade_config.xml
 */
/** <bool name="config_isFullWidthShade">true</bool>
 *  true: 全宽布局（通知/快捷设置各自可占满整屏）；false: 浮动布局（各占半屏） */
export const CONFIG_IS_FULL_WIDTH_SHADE = true as boolean;

/** <bool name="config_notificationShadeOnTopEnd">false</bool>
 *  Dual Shade 模式下，通知面板是否位于屏幕"末端"（LTR 下右侧）。false = 通知在左 */
export const CONFIG_NOTIFICATION_SHADE_ON_TOP_END = false as boolean;

/** <bool name="config_dualShadeEnabledByDefault">true</bool>
 *  用户未显式设置时，Dual Shade（双栏分栏）是否为默认模式 */
export const CONFIG_DUAL_SHADE_ENABLED_BY_DEFAULT = true as boolean;

/** <bool name="config_qsInlinePowerMenu">false</bool> */
export const CONFIG_QS_INLINE_POWER_MENU = false as boolean;

/** <item name="config_invocationGestureSplitRatio" type="dimen">0.75</item>
 *  Dual Shade 顶部下滑手势分界：起始边 0~75% 归通知，75%~100% 归快捷设置 */
export const CONFIG_INVOCATION_GESTURE_SPLIT_RATIO = 0.75 as number;

/**
 * ShadeMode — 移植自 com/android/systemui/shade/shared/model/ShadeMode.kt
 *  Single: "二合一"手风琴式，QS 与通知上下叠放于同一面板
 *  Dual  : "双栏分栏"，QS 与通知各自独立面板（大屏分居两侧，小屏共享空间）
 *  Split : 旧版平板左右分栏（SceneContainer 下已废弃，保留枚举以对齐源码）
 */
export type ShadeMode = 'Single' | 'Dual' | 'Split';

/** 当前生效模式（等价 shadeModeInteractor.shadeMode，由 demo 控件切换） */
export const ShadeModeState = {
  current: (CONFIG_DUAL_SHADE_ENABLED_BY_DEFAULT ? 'Dual' : 'Single') as ShadeMode,
};

/** Flags.notificationShadeBlur() → 面板毛玻璃 */
export const FLAG_NOTIFICATION_SHADE_BLUR = true as boolean;

/** SceneContainerFlag.isEnabledOnVariant = true（scene/shared/flag/SceneContainerFlag.kt） */
export const SCENE_CONTAINER_ENABLED = true as boolean;
