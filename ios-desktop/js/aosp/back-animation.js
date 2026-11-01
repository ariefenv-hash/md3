// ==================== aosp/back-animation.js — 预测性返回容器变换（#146 一期+二期） ====================
//
// 权威源（aosp-mirror/platform_frameworks_base @ main 实拉；快照 docs/reference/frameworks-base/
// SystemUI/animation/back/ 六件 —— pill 之外的另一半，#146）：
//   - BackTransformation.kt（63 行）：translateX/translateY/scale 默认 Float.NaN +
//     scalePivotPosition null；applyTo 只应用 finite 属性（NaN 跳过）、先 pivot 后 scale。
//     ScalePivotPosition 两枚举：CENTER（pivot w/2,h/2）/ BOTTOM_CENTER（pivot w/2,h）。
//   - BackAnimationSpec.kt（79 行）：createFloatingSurfaceAnimationSpec ——
//       maxTranslationXByScale = (screenW − screenW·minScale)/2
//       maxTranslationX = maxTranslationXByScale − maxMarginXdp·density
//       maxTranslationYByScale = (screenH − screenH·minScale)/2
//       maxTranslationY = maxTranslationYByScale − maxMarginYdp·density
//       minScaleReversed = 1 − minScale
//       direction：EDGE_LEFT → +1 / EDGE_RIGHT → −1 / else 0
//       translateX = translateXEasing(progress)·direction·maxTranslationX   （默认 BACK_GESTURE）
//       translateY = translateYEasing(progressY)·maxTranslationY            （默认 LINEAR）
//       scale      = 1 − scaleEasing(progress)·minScaleReversed             （默认 BACK_GESTURE）
//   - BackAnimationSpecForSysUi.kt（83 行）：四 ST 预设 ——
//       dismissApp ST1 = floating(8dp,8dp,0.8) / crossTask ST2 = floating(8dp,8dp,0.8)
//       innerAreaDismiss ST3 = floating(0dp,0dp,0.9) / floatingSystemSurfaces ST4 = floating(8dp,8dp,0.9)
//       bottomSheet AT3 = createBottomsheetAnimationSpec
//   - BottomsheetBackAnimationSpec.kt（42 行）：MAX_SCALE_DELTA_DP = 48；
//       minScale = 1 − 48dp/screenW；scale = 1 − ratioScale·(1 − minScale)；pivot BOTTOM_CENTER
//   - OnBackAnimationCallbackExtension.kt L54（progressY 调用方权威公式）：
//       progressY = (backEvent.touchY − initialY) / displayMetrics.heightPixels   —— 带符号
//   - OnBackAnimationCancelled/FlingOnBackAnimationCallback.kt：四期 fling 对接，不在本轮范围
//     （#146 分期明示「gestures.js 已有 fling 判定，可对接」，留下一棒）
//
// BACK_GESTURE 插值器权威（双源交叉验证，com.android.app.animation.Interpolators 所在共享库
// 未入 GitHub 镜像，以同值两源锚定）：
//   ① core/java/android/view/animation/BackGestureInterpolator.java（2024 新文件）：
//      「Decelerating interpolator with a very slight acceleration phase at the beginning」
//      —— extends PathInterpolator(0.1f, 0.1f, 0f, 1f)
//   ② libs/WindowManager/Shell/shared/.../animation/Interpolators.java L106：
//      BACK_GESTURE = new BackGestureInterpolator()（「predictive-back-typical decelerate motion」）
//   → BACK_GESTURE = cubic-bezier(0.1, 0.1, 0, 1)。离线采样：BG(0.25)=0.6838 / BG(0.5)=0.8949 /
//     BG(0.75)=0.9783（强减速——变换前半程即走完大半，真机预测性返回手感来源）。
//
// LINEAR 语义（android.view.animation.LinearInterpolator.getInterpolation = 恒等，不钳位）：
//   progressY 带符号且可越界（手指上移为负），必须恒等透传；不可用 cubicBezier（x≤0/y≤0
//   钳位会吃掉负向跟随）。translateY = progressY·maxTranslationY 天然双向跟手。
//
// Web 映射纪律：
//   - dp→px：density=1（px=dp 惯例同 back-pill.js 十维、412dp 阈值全谱）；displayMetricsProvider
//     惰性调用（窗尺寸逐帧取新），密度字段可覆盖（Kotlin dpToPx = round(dp·density)）。
//   - BackTransformation.applyTo → View.translationX/Y + scaleX/Y + pivotX/Y 三组独立 View 属性
//     的 CSS 对应物：style.translate / style.scale（individual transform properties，
//     合成序 translate→scale 与 View「平移后绕 pivot 缩放」矩阵同构）+ transform-origin 承载
//     pivot（CENTER='50% 50%' / BOTTOM_CENTER='50% 100%'）。
//   - 消费方两条路：①数值直读（gestures.js #146 接线——translateX/translateY/scale 写弹簧
//     与 cx/cy，不落 DOM）；②applyTo 整体应用（三期 bottomsheet 场景预留）。
//
// 本轮接线（#146 二期）：gestures.js 根页面边缘返回 —— 自创曲线（pullRatio·0.35 缩放 /
// 0.3 横移 / 0.15 纵移三系数）退役，改 ST1 dismissAppForSysUi 驱动；进度取 pill
// fullScreenProgress 同源公式（412dp 阈值，BackPanelController handleMoveEvent 同构）——
// #146 交底「pill 与容器变换严格同相位」由此保证。子页卡片区（v7.75 用户裁决视觉语言）
// 与上滑关闭（BOTTOM 家族）不在本议题范围，原样保留。

import { cubicBezier } from './interpolators.js';

/** BACK_GESTURE —— BackGestureInterpolator（PathInterpolator(0.1, 0.1, 0, 1)，双源同值） */
export const BACK_GESTURE = cubicBezier(0.1, 0.1, 0, 1);

/** LINEAR —— LinearInterpolator 恒等透传（不钳位，负向 progressY 必需） */
export const LINEAR = (x) => x;

/** ScalePivotPosition 枚举（BackTransformation.kt L33-36） */
export const SCALE_PIVOT_POSITION = Object.freeze({
  CENTER: 'CENTER',
  BOTTOM_CENTER: 'BOTTOM_CENTER',
});

/**
 * BackTransformation（BackTransformation.kt L25-30 data class 逐字）。
 * 属性可变复用（源码注释「mutable for performance reasons」——spec 每帧写入同一实例）。
 */
export class BackTransformation {
  constructor() {
    this.translateX = NaN;
    this.translateY = NaN;
    this.scale = NaN;
    this.scalePivotPosition = null;
  }

  /** ScalePivotPosition.applyTo（L38-51）：pivotX 恒 w/2；CENTER→h/2、BOTTOM_CENTER→h */
  applyPivot(view) {
    if (!this.scalePivotPosition) return;
    view.style.transformOrigin = this.scalePivotPosition === SCALE_PIVOT_POSITION.BOTTOM_CENTER
      ? '50% 100%'
      : '50% 50%';
  }

  /**
   * BackTransformation.applyTo（L55-63 逐字语义）：finite 守卫（NaN 跳过该维），
   * 先 pivot 后 scale（源码顺序：translation → pivot → scale）。
   * View.translationX/Y → style.translate；scaleX/Y → style.scale；pivot → transform-origin。
   */
  applyTo(view) {
    const hasTx = Number.isFinite(this.translateX);
    const hasTy = Number.isFinite(this.translateY);
    if (hasTx || hasTy) {
      view.style.translate = `${hasTx ? this.translateX : 0}px ${hasTy ? this.translateY : 0}px`;
    }
    this.applyPivot(view);
    if (Number.isFinite(this.scale)) view.style.scale = `${this.scale}`;
  }
}

/** dp→px（SystemUI util.dpToPx = round(dp·density)）；md3 惯例 density=1 */
function dpToPx(dp, displayMetrics) {
  return Math.round(dp * (displayMetrics.density || 1));
}

/**
 * createFloatingSurfaceAnimationSpec（BackAnimationSpec.kt L39-79 逐字移植）。
 * @param {object} o
 * @param {() => {widthPixels: number, heightPixels: number, density?: number}} o.displayMetricsProvider
 *        惰性取窗尺寸（Kotlin displayMetricsProvider 同构，每帧调用取新值）
 * @param {number} o.maxMarginXdp / o.maxMarginYdp / o.minScale
 * @param {(x: number) => number} [o.translateXEasing=BACK_GESTURE]
 * @param {(x: number) => number} [o.translateYEasing=LINEAR]
 * @param {(x: number) => number} [o.scaleEasing=BACK_GESTURE]
 * @returns {{ getBackTransformation: (backEvent: {progress: number, swipeEdge: string},
 *            progressY: number, result: BackTransformation) => BackTransformation }}
 */
export function createFloatingSurfaceAnimationSpec({
  displayMetricsProvider,
  maxMarginXdp,
  maxMarginYdp,
  minScale,
  translateXEasing = BACK_GESTURE,
  translateYEasing = LINEAR,
  scaleEasing = BACK_GESTURE,
}) {
  return {
    getBackTransformation(backEvent, progressY, result) {
      const displayMetrics = displayMetricsProvider();
      const screenWidthPx = displayMetrics.widthPixels;
      const screenHeightPx = displayMetrics.heightPixels;

      const maxMarginXPx = dpToPx(maxMarginXdp, displayMetrics);
      const maxMarginYPx = dpToPx(maxMarginYdp, displayMetrics);
      const maxTranslationXByScale = (screenWidthPx - screenWidthPx * minScale) / 2;
      const maxTranslationX = maxTranslationXByScale - maxMarginXPx;
      const maxTranslationYByScale = (screenHeightPx - screenHeightPx * minScale) / 2;
      const maxTranslationY = maxTranslationYByScale - maxMarginYPx;
      const minScaleReversed = 1 - minScale;

      const direction =
        backEvent.swipeEdge === 'EDGE_LEFT' ? 1 :
        backEvent.swipeEdge === 'EDGE_RIGHT' ? -1 : 0;
      const progressX = backEvent.progress;

      const ratioTranslateX = translateXEasing(progressX);
      const ratioTranslateY = translateYEasing(progressY);
      const ratioScale = scaleEasing(progressX);

      // result.apply{}（Kotlin）：三字段覆写；scalePivotPosition 不动（floating 无 pivot 语义）
      result.translateX = ratioTranslateX * direction * maxTranslationX;
      result.translateY = ratioTranslateY * maxTranslationY;
      result.scale = 1 - ratioScale * minScaleReversed;
      return result;
    },
  };
}

/** BackAnimationSpecForSysUi ST1 dismissApp（L25-33）：floating(8dp, 8dp, 0.8) */
export function dismissAppForSysUi(displayMetricsProvider) {
  return createFloatingSurfaceAnimationSpec({
    displayMetricsProvider, maxMarginXdp: 8, maxMarginYdp: 8, minScale: 0.8,
  });
}

/** ST2 crossTask（L39-47）：floating(8dp, 8dp, 0.8)——与 ST1 同参，语义位分立保留 */
export function crossTaskForSysUi(displayMetricsProvider) {
  return createFloatingSurfaceAnimationSpec({
    displayMetricsProvider, maxMarginXdp: 8, maxMarginYdp: 8, minScale: 0.8,
  });
}

/** ST3 innerAreaDismiss（L53-61）：floating(0dp, 0dp, 0.9) */
export function innerAreaDismissForSysUi(displayMetricsProvider) {
  return createFloatingSurfaceAnimationSpec({
    displayMetricsProvider, maxMarginXdp: 0, maxMarginYdp: 0, minScale: 0.9,
  });
}

/** ST4 floatingSystemSurfaces（L67-75）：floating(8dp, 8dp, 0.9) */
export function floatingSystemSurfacesForSysUi(displayMetricsProvider) {
  return createFloatingSurfaceAnimationSpec({
    displayMetricsProvider, maxMarginXdp: 8, maxMarginYdp: 8, minScale: 0.9,
  });
}

/** MAX_SCALE_DELTA_DP（BottomsheetBackAnimationSpec.kt L24） */
export const MAX_SCALE_DELTA_DP = 48;

/**
 * createBottomsheetAnimationSpec（BottomsheetBackAnimationSpec.kt L27-42 逐字移植）：
 * 仅 scale + pivot BOTTOM_CENTER（translateX/Y 保持 NaN——applyTo finite 守卫天然跳过）。
 */
export function createBottomsheetAnimationSpec({ displayMetricsProvider, scaleEasing = BACK_GESTURE }) {
  return {
    getBackTransformation(backEvent, _progressY, result) {
      const displayMetrics = displayMetricsProvider();
      const screenWidthPx = displayMetrics.widthPixels;
      const minScale = 1 - dpToPx(MAX_SCALE_DELTA_DP, displayMetrics) / screenWidthPx;
      const progressX = backEvent.progress;
      const ratioScale = scaleEasing(progressX);
      result.scale = 1 - ratioScale * (1 - minScale);
      result.scalePivotPosition = SCALE_PIVOT_POSITION.BOTTOM_CENTER;
      return result;
    },
  };
}

/** AT3 bottomSheetForSysUi（BackAnimationSpecForSysUi.kt L81-83） */
export function bottomSheetForSysUi(displayMetricsProvider) {
  return createBottomsheetAnimationSpec({ displayMetricsProvider });
}

// ==================== #191 差异 2/3：wm.shell.back 背景层 + 状态栏联动 ====================
//
// 权威源（aosp-mirror main 实拉，快照 docs/reference/frameworks-base/wm-shell/back/）：
//   - BackAnimationConstants.java（25 行全文）：唯一常量 UPDATE_SYSUI_FLAGS_THRESHOLD = 0.20f。
//     AOSP main 消费位：CrossActivityBackAnimation.kt L305 post-commit 段
//     `if (progress > 1 - UPDATE_SYSUI_FLAGS_THRESHOLD)`（动画末 20% 才刷新 sysui flags）。
//     md3 Web 消费位（#191 建议口径，诚实标注为映射而非逐字）：pre-commit 状态栏外观联动的
//     进度防抖门 —— progress ≥ 0.20 才允许 appearance 翻转（与 top > statusbarHeight/2
//     双阈值防抖，防边缘抖动反复横跳）。post-commit 位待 #146 四期 fling 弹簧接线时评估。
//   - BackAnimationBackground.java（167 行全文）：跨 Activity 返回时在 DisplayArea 底部
//     （BACKGROUND_LAYER = -1）垫纯色背景层「back-animation-background」，
//     mBackgroundIsDark = ColorUtils.calculateLuminance(color) < 0.5f（ensure 时一次性判定）；
//     customizeStatusBarAppearance(top)：closing target top 越过状态栏半高
//     （top > mStatusbarHeight/2）才请求 AppearanceRegion，边缘触发（状态相同直接 return，
//     防抖语义）；背景亮 → APPEARANCE_LIGHT_STATUS_BARS（深色图标），背景暗 → 无外观（浅色图标）。
//   - 背景色权威链（CrossActivityBackAnimation.kt L167-173 getBackgroundColor）：
//     customizedBackgroundColor → letterboxColor → enteringTarget.taskDescription.backgroundColor → 0。
//     md3 映射：entering target = 桌面，其「窗口背景色」= 壁纸主色（wallpaper.js 取色管线
//     palette.primary，HSL 三元组）—— #191 差异 3 建议口径。
//
// Web 映射偏差（诚实标注）：
//   ① 层级：AOSP LAYER=-1 在 DisplayArea 底部（两个 target 之下，仅缝隙可见——entering 是
//      不透明 activity）；md3 根页关闭的 entering target = 桌面（非不透明），若垫在桌面之下
//      则完全不可见。映射为 z-index 0：壁纸(-1) 之上、桌面图标(1) 与应用窗口(500) 之下 ——
//      即 #191 差异 3「wallpaper 层之上垫过渡层」口径。
//   ② 时序：AOSP ensureBackground 于 transition start（pre-commit 交互期层已在）；#191 建议
//      「committed 后、收场动画期间」垫层。md3 取：机制（亮度判定/外观状态机）在手势 begin
//      即武装（同源 startAnimation 时序），DOM 层可见性延迟到 commit（议题口径）——
//      pre-commit 期桌面保持壁纸原貌，仅状态栏外观联动先行。
//   ③ 形态：AOSP 为纯色 setColor 层（无模糊）；#191 建议的 backdrop-filter blur 不采纳
//      （源码无对应物，超越项须单独议题）。

/** UPDATE_SYSUI_FLAGS_THRESHOLD（BackAnimationConstants.java L23 逐字） */
export const UPDATE_SYSUI_FLAGS_THRESHOLD = 0.2;

/**
 * ColorUtils.calculateLuminance 同构（com.android.internal.graphics.ColorUtils）：
 * 非线性 sRGB → 线性化 → Rec.601 系数加权和（0.2126R + 0.7152G + 0.0722B，XyzUtils 权威）。
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @returns {number} 0-1 相对亮度
 */
export function calculateLuminance(r, g, b) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** HSL(h 0-360, s/l 0-100) → RGB 0-255 三元组（wallpaper.js palette.primary 消费前置） */
export function hslToRgb(h, s, l) {
  const sn = s / 100, ln = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/**
 * BackAnimationBackground（BackAnimationBackground.java 逐字移植）。
 *
 * @param {object} customizer StatusBarCustomizer 对应物：
 *        { customizeStatusBarAppearance(regionOrNull) } —— region = { appearanceLight, region }，
 *        appearanceLight = APPEARANCE_LIGHT_STATUS_BARS（背景亮 → 深色图标）；null = reset。
 * @param {Document} [doc] 注入文档（测试友好；默认全局 document）
 */
export class BackAnimationBackground {
  constructor(customizer, doc = (typeof document !== 'undefined' ? document : null)) {
    this.mCustomizer = customizer;
    this.mDoc = doc;
    this.mBackgroundEl = null;
    this.mIsRequestingStatusBarAppearance = false; // L44 NO_APPEARANCE 语义位
    this.mBackgroundIsDark = false;
    this.mStartBounds = null;
    this.mStatusbarHeight = 0;
  }

  /**
   * ensureBackground（L77-106 逐字语义）：幂等（已存在直接 return，源码同款守卫）。
   * @param {object} startRect closing target 起始 bounds {left, top, right, bottom}
   * @param {{r: number, g: number, b: number}} color 背景色（RGB 0-255）
   * @param {number} statusbarHeight 状态栏高度 px
   * @param {{cropBounds?: object|null, cornerRadius?: number, showLayer?: boolean}} [opts]
   *        cropBounds 非空 → 层裁剪到该矩形并带圆角（源码：露出壁纸，多窗口/浮动任务场景）；
   *        showLayer=false → 机制武装但 DOM 层不可见（#191 议题口径：层可见性延迟到 commit）
   */
  ensureBackground(startRect, color, statusbarHeight, opts = {}) {
    if (this.mBackgroundEl) return; // L80-82 幂等守卫逐字

    this.mBackgroundIsDark = calculateLuminance(color.r, color.g, color.b) < 0.5; // L84 逐字
    this.mStartBounds = { ...startRect };                                          // L103
    this.mIsRequestingStatusBarAppearance = false;                                 // L104
    this.mStatusbarHeight = statusbarHeight;                                       // L105

    if (!this.mDoc) return;
    const el = this.mDoc.createElement('div');
    el.className = 'back-animation-background'; // L90 setName('back-animation-background')
    el.style.background = `rgb(${color.r}, ${color.g}, ${color.b})`; // L96 setColor 同构
    const crop = opts.cropBounds || null;
    if (crop && crop.right > crop.left && crop.bottom > crop.top) { // L99-102 crop 语义
      el.style.left = `${crop.left}px`;
      el.style.top = `${crop.top}px`;
      el.style.width = `${crop.right - crop.left}px`;
      el.style.height = `${crop.bottom - crop.top}px`;
      el.style.borderRadius = `${opts.cornerRadius || 0}px`;
    }
    el.style.visibility = opts.showLayer === false ? 'hidden' : 'visible';
    this.mDoc.body.appendChild(el);
    this.mBackgroundEl = el;
  }

  /** md3 映射扩展：层可见性延迟到 commit（#191 议题口径，见头部偏差②） */
  showLayer() {
    if (this.mBackgroundEl) this.mBackgroundEl.style.visibility = 'visible';
  }

  /**
   * customizeStatusBarAppearance（L139-158 逐字语义）+ #191 建议的 0.20 进度防抖门。
   * @param {number} top closing target 顶边 y（px）
   * @param {number|null} [progress] 当前面板进度（0-1）；null = 不做进度门（仅 top 门 +
   *        边缘触发防抖，源码口径）。md3 接线传 fullScreenProgress。
   */
  customizeStatusBarAppearance(top, progress = null) {
    if (!this.mCustomizer || !this.mStartBounds) return; // L140-142 逐字
    const shouldCustomizeSystemBar = top > this.mStatusbarHeight / 2; // L144 逐字
    // #191 建议口径：进度 ≥ UPDATE_SYSUI_FLAGS_THRESHOLD 才允许翻转（与 top 门双阈值防抖）；
    // AOSP main 该常量消费位于 post-commit L305（progress > 1−T），此处为 Web 映射消费位。
    const progressGate = progress === null || progress >= UPDATE_SYSUI_FLAGS_THRESHOLD;
    const effective = shouldCustomizeSystemBar && progressGate;
    if (effective === this.mIsRequestingStatusBarAppearance) return; // L145-147 边缘触发逐字

    this.mIsRequestingStatusBarAppearance = effective; // L149
    if (this.mIsRequestingStatusBarAppearance) { // L150-155
      // 背景 !dark → APPEARANCE_LIGHT_STATUS_BARS（深色图标）；背景 dark → NO_APPEARANCE（浅图标）
      this.mCustomizer.customizeStatusBarAppearance({
        appearanceLight: !this.mBackgroundIsDark,
        region: this.mStartBounds,
      });
    } else {
      this.resetStatusBarCustomization(); // L156-157
    }
  }

  /** resetStatusBarCustomization（L163-165 逐字） */
  resetStatusBarCustomization() {
    if (this.mCustomizer) this.mCustomizer.customizeStatusBarAppearance(null);
  }

  /**
   * removeBackground（L113-123 逐字语义）：移层 + 复位外观请求态。
   */
  removeBackground() {
    if (!this.mBackgroundEl) {
      // 源码 L114-116：无层时仅静默返回（mIsRequestingStatusBarAppearance 已在层下复位语义）
      this.mIsRequestingStatusBarAppearance = false;
      return;
    }
    this.mBackgroundEl.remove();
    this.mBackgroundEl = null;
    this.mIsRequestingStatusBarAppearance = false; // L122
    this.resetStatusBarCustomization();
  }
}
