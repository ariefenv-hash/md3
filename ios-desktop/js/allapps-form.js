// ==================== allapps-form.js — #73 应用抽屉手机/平板双形态分化（纯函数核） ====================
//
// 源码基准（#73 §一 实测，Launcher3 lineage-24.0）：
//   · 手机 = LauncherAllAppsContainerView + AllAppsTransitionController（Launcher 状态机里的
//     常驻 state：ALL_APPS）；平板 = TaskbarAllAppsContainerView + TaskbarAllAppsController
//     （「随开随建、随关随毁」的独立浮层窗口——TaskbarAllAppsController.java 头注释原文
//     "The all apps window is created and destroyed upon opening and closing all apps"）。
//     这是两形态最本质的架构差异，md3 以 lifecycleFor(form) = persistent | ephemeral 承载。
//
// AOSP 原值（#54 全局取值纪律：源码能取到值的一律按原值落地，不因 md3 既有手感调整）：
//   · config_allAppsOpenDuration = 600ms / config_allAppsCloseDuration = 300ms（手机）
//   · config_bottomSheetOpenDuration = 267ms / config_bottomSheetCloseDuration = 267ms（平板）
//   · SUCCESS_TRANSITION_PROGRESS = 0.5（手机手势成功阈值，LauncherAnimUtils.java:48）
//   · TABLET_BOTTOM_SHEET_SUCCESS_TRANSITION_PROGRESS = 0.3（平板，LauncherAnimUtils.java:49
//     ——平板更容易成功，因为行程短）
//   · BottomSheetProfile.derivedTopPadding = deviceProperties.heightPx / 6（平板顶部留白
//     = 屏高 1/6，Android 平板 All Apps 的标志性观感：不铺满屏，上方始终露出桌面/壁纸）
//   · numAllAppsColumns：2_by_2/3_by_3 显式 4；4_by_5~5_by_7 缺省 = numColumns（4/5）；
//     6_by_5 Tablet = 6；更大档位 = 8（res/xml/device_profiles.xml + attrs.xml:218
//     "numAllAppsColumns defaults to numColumns, if not specified"）。md3 折算：手机断点
//     4 列、平板 6 列、桌面级大屏（≥1440px，对应「更大档位」）8 列。
//   · 列宽不足降级（AllAppsProfile）：先压缩 borderSpace，仍不足则 borderSpace = 0 且
//     iconSize = min(iconSize, cellWidth)
//   · maxAllAppsTextLineCount = 1（标签单行截断，css ellipsis 既有语义）
//
// 刻意偏离记录（#73 §八 纪律要求标注）：
//   · bottomSheetWorkspaceScale / bottomSheetDepth（平板背后桌面缩放+景深）：议题仅给出
//     字段名未给实测数值，本版不落地数值级反馈，以 scrim 蒙层（blur(20px) saturate(1.8)
//     与 shade 同源）承载景深观感，待实测源码值后补齐（v8.61 注）。
//   · 平板桌面保留上滑入口（#73 §三.1 只列任务栏按钮）：Launcher3 平板从 home 上滑拉起
//     all apps 为标准手势，且 e2e-v858 A1 已锚定该通道——保留入口、形态按断点分化。
//
// @ts-check

/** 平板断点（与 desktop-prefs.TABLET_MIN_WIDTH 同源：≥768px 为平板形态） */
export const AA_TABLET_MIN_WIDTH = 768;

/** 大屏 8 列档位（device_profiles「更大档位 → 8」的 md3 折算断点，见文件头注） */
export const AA_WIDE_MIN_WIDTH = 1440;

/** 手机开抽屉时长：config_allAppsOpenDuration 原值 */
export const PHONE_OPEN_MS = 600;
/** 手机关抽屉时长：config_allAppsCloseDuration 原值 */
export const PHONE_CLOSE_MS = 300;
/** 平板浮层开/关时长：config_bottomSheetOpenDuration / CloseDuration 原值（同为 267） */
export const SHEET_OPEN_MS = 267;
export const SHEET_CLOSE_MS = 267;

/** 手机手势成功阈值：SUCCESS_TRANSITION_PROGRESS 原值 */
export const PHONE_SUCCESS_PROGRESS = 0.5;
/** 平板手势成功阈值：TABLET_BOTTOM_SHEET_SUCCESS_TRANSITION_PROGRESS 原值 */
export const TABLET_SUCCESS_PROGRESS = 0.3;

/** 手机网格列数（numAllAppsColumns 缺省 = numColumns = 4） */
export const PHONE_COLUMNS = 4;
/** 平板网格列数（6_by_5 Tablet 档） */
export const TABLET_COLUMNS = 6;
/** 大屏网格列数（「更大档位」） */
export const WIDE_COLUMNS = 8;

/** 默认图标尺寸（md3 allapps 既有 52px 格栅基线） */
export const DEFAULT_ICON_SIZE = 52;
/** 默认列间距（md3 allapps 既有 8px） */
export const DEFAULT_BORDER_SPACE = 8;

/**
 * 形态判定：≥768px 平板浮层（bottom sheet），否则手机全屏抽屉。
 * @param {number} viewportW
 * @returns {'phone'|'tablet'}
 */
export function formFor(viewportW) {
  return (viewportW || 0) >= AA_TABLET_MIN_WIDTH ? 'tablet' : 'phone';
}

/**
 * 生命周期语义（两形态架构差异的核心承载）：
 *   phone = persistent（Launcher 状态机常驻 state，View 复用）
 *   tablet = ephemeral（TaskbarAllAppsController「开建关毁」独立浮层窗口）
 * @param {'phone'|'tablet'} form
 * @returns {'persistent'|'ephemeral'}
 */
export function lifecycleFor(form) {
  return form === 'tablet' ? 'ephemeral' : 'persistent';
}

/** 开启时长（按形态取 AOSP 原值） */
export function openMsFor(form) {
  return form === 'tablet' ? SHEET_OPEN_MS : PHONE_OPEN_MS;
}

/** 关闭时长（按形态取 AOSP 原值） */
export function closeMsFor(form) {
  return form === 'tablet' ? SHEET_CLOSE_MS : PHONE_CLOSE_MS;
}

/** 手势成功阈值（平板 0.3 更易成功——行程短；手机 0.5） */
export function successThresholdFor(form) {
  return form === 'tablet' ? TABLET_SUCCESS_PROGRESS : PHONE_SUCCESS_PROGRESS;
}

/**
 * 平板浮层顶部留白：BottomSheetProfile.derivedTopPadding = heightPx / 6（Kotlin Int
 * 除法 = floor）。手机形态无此语义（全屏覆盖），返回 0。
 * @param {number} viewportH
 * @param {'phone'|'tablet'} [form]
 * @returns {number}
 */
export function topPaddingFor(viewportH, form) {
  if (form && form !== 'tablet') return 0;
  return Math.floor((viewportH || 0) / 6);
}

/**
 * 网格列数：手机 4 / 平板 6 / 大屏（≥1440）8。
 * @param {number} viewportW
 * @returns {number}
 */
export function allAppsColumnsFor(viewportW) {
  const w = viewportW || 0;
  if (w >= AA_WIDE_MIN_WIDTH) return WIDE_COLUMNS;
  if (w >= AA_TABLET_MIN_WIDTH) return TABLET_COLUMNS;
  return PHONE_COLUMNS;
}

/**
 * 列宽降级（AllAppsProfile 降级策略原语义）：
 *   先压缩 borderSpace（每次 -2 至 0），仍不足则 iconSize = min(iconSize, cellWidth)。
 * @param {number} containerW 容器内容宽（已扣除左右 padding）
 * @param {number} cols 列数
 * @param {{iconSize?: number, borderSpace?: number}} [opts]
 * @returns {{cols:number, iconSize:number, borderSpace:number, cellWidth:number}}
 */
export function fitAllAppsGrid(containerW, cols, opts = {}) {
  const iconSize0 = opts.iconSize ?? DEFAULT_ICON_SIZE;
  const borderSpace0 = opts.borderSpace ?? DEFAULT_BORDER_SPACE;
  if (!(containerW > 0) || !(cols > 0)) {
    // 未布局（happy-dom/隐藏态）：不降级，返回原值
    return { cols, iconSize: iconSize0, borderSpace: borderSpace0, cellWidth: 0 };
  }
  let borderSpace = borderSpace0;
  let iconSize = iconSize0;
  const cellOf = (bs) => (containerW - (cols - 1) * bs) / cols;
  let cellWidth = cellOf(borderSpace);
  while (cellWidth < iconSize && borderSpace > 0) {
    borderSpace = Math.max(0, borderSpace - 2);
    cellWidth = cellOf(borderSpace);
  }
  if (cellWidth < iconSize) {
    borderSpace = 0;
    cellWidth = cellOf(0);
    iconSize = Math.min(iconSize, Math.floor(cellWidth));
  }
  return { cols, iconSize, borderSpace, cellWidth };
}

/**
 * 背后桌面反馈参数（两形态与 shade 视觉一致条款：scrim blur/saturate 同 pull-panels）。
 * workspaceScale/depth 数值未实测（见文件头「刻意偏离记录」），置 null 不落地。
 * @param {'phone'|'tablet'} form
 * @returns {{scrimBlur:number, scrimSaturate:number, workspaceScale:number|null, depth:number|null}}
 */
export function decorFor(form) {
  void form;
  return { scrimBlur: 20, scrimSaturate: 1.8, workspaceScale: null, depth: null };
}

/**
 * 浮层下拉关闭进度（平板关闭手势）：位移 / sheet 高。
 * @param {number} dyPx 下拉位移（向下为正）
 * @param {number} sheetH 浮层高
 * @returns {number} 进度 0~1
 */
export function sheetDismissProgress(dyPx, sheetH) {
  if (!(sheetH > 0) || dyPx <= 0) return 0;
  return Math.min(1, dyPx / sheetH);
}
