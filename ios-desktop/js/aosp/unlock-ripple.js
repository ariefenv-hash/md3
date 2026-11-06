// ==================== unlock-ripple.js — 解锁波纹涟漪过渡（#19 v10.19） ====================
//
// 议题 #19「解锁动画：锁屏→桌面的 Android 波纹涟漪过渡」。md3 现有解锁 = 上滑弹簧
// 飞离（v7.13）+ 桌面图标涟漪入场（android 风格，v7.13）；本库补齐**锁屏退场面**的
// 波纹编排：提交帧起从波源（触点 / A17 权威轴点）扩散波纹，锁屏内容随波前逐块退场，
// 桌面以 surface-behind 形态自压缩态弹回浮现——与既有上飞弹簧叠加成完整过渡叙事。
//
// AOSP 源码依据（aosp-mirror/platform_frameworks_base main，2026-11-05 实拉；
// 全文入库 docs/reference/frameworks-base/systemui/keyguard-ripple/）：
//
// ① KeyguardUnlockAnimationController.kt（58KB 全文实拉）——A17 解锁过渡权威编排：
//    · surface-behind 范式：launcher 作为锁屏下方 surface，初始
//      SURFACE_BEHIND_START_SCALE_FACTOR 0.95 + SURFACE_BEHIND_START_TRANSLATION_Y
//      0.05（表面高度百分比），缩放轴点 SURFACE_BEHIND_SCALE_PIVOT_Y 0.66
//      （注释原文：the surface will scale up from the point at
//      (width / 2, height * 0.66)——中下部生长，视觉上波纹自中下扩散的权威依据）；
//    · dismiss amount 手势语义：DISMISS_AMOUNT_SHOW_SURFACE_THRESHOLD 0.15（低于此
//      显示下方 surface）→ DISMISS_AMOUNT_EXIT_KEYGUARD_THRESHOLD 0.3（keyguard 退出）；
//    · canned unlock 编排常量：UNLOCK_ANIMATION_DURATION_MS 300（fasterUnlockTransition
//      路径，ALPHA_OUT 锁屏淡出）/ LEGACY_UNLOCK_ANIMATION_DURATION_MS 200 /
//      UNLOCK_ANIMATION_SURFACE_BEHIND_START_DELAY_MS 67（LEGACY 75）/
//      LOCK_WALLPAPER_FADE_OUT_DURATION 150 + START_DELAY 150（锁壁纸后段淡出）/
//      LAUNCHER_ICONS_ANIMATION_DURATION_MS 633（图标入场，md3 v7.13 已有等价物）/
//      SURFACE_BEHIND_SWIPE_FADE_DURATION_MS 175。
//
// ② 指纹解锁波纹 shader（A12 RippleShader.kt，触点扩散彩色涟漪）：A17 main 分支
//    **已移除**——GitHub code search filename:RippleShader total_count=0、
//    packages/SystemUI/src/com/android/systemui/animation/ 目录整体 404（重构迁出）
//    双实证。波纹视觉常数无源码权威可依，按 A12 媒体行为描述（9to5google：按压解锁
//    区域从触点扩散涟漪、波纹推开后锁屏内容淡出）+ ③ 时序语义自创推进，全部自创
//    常数逐个标注（铁律#1 差异在录 + #170「查不到权威值标注自创」裁决惯例）。
//
// ③ NumPadAnimator.java（PIN 数字键按压涟漪，main 实拉，涟漪时序语义等价借源）：
//    EXPAND_ANIMATION_MS = 100（LINEAR 插值）/ CONTRACT_ANIMATION_MS = 417（延迟
//    CONTRACT_ANIMATION_DELAY_MS = 33）/ 半径 mStartRadius = height/2 →
//    mEndRadius = height/4（按压涟漪的收缩语义，本库借其 100/33/417 三拍时序）。
//
// 语义映射（md3 swipe 形态差异，铁律#1 如实在录）：
//    · md3 锁屏无凭证/指纹（#185 密码议题另行），解锁路径 = 上滑手势 → 对应 A17
//      swipe dismiss：手势段保持面板位移跟手（dismiss amount 同构），提交帧起叠加
//      canned unlock 编排（波纹扩散 + 内容随波退场 + surface-behind 弹回）；
//    · 波源缺省 = A17 surface-behind 缩放轴点 (w/2, h*0.66)；手势 pointerdown 有
//      真实触点时波源即触点（A12 涟漪行为：从触点扩散）。
//    · 性能红线（仓库惯例）：波纹层与内容退场全走 transform/opacity/filter 合成器
//      属性；波前几何每提交帧一次采样（machine 单源时间基），元素距离提交帧静态
//      量测一次，零逐帧 getBoundingClientRect。

/** A17 KeyguardUnlockAnimationController.kt 实源常量（main 快照，逐值断言在 tests）。 */
export const A17_UNLOCK = Object.freeze({
  /** 桌面初始缩放（L70）。 */
  SURFACE_BEHIND_START_SCALE_FACTOR: 0.95,
  /** 桌面初始下移（表面高度百分比，L76）。 */
  SURFACE_BEHIND_START_TRANSLATION_Y: 0.05,
  /** 缩放轴点 Y（表面高度百分比，L83；X 恒 w/2）。 */
  SURFACE_BEHIND_SCALE_PIVOT_Y: 0.66,
  /** dismiss amount 低于此显示下方 surface（L92）。 */
  DISMISS_AMOUNT_SHOW_SURFACE_THRESHOLD: 0.15,
  /** dismiss amount 达此 keyguard 退出（L100）。 */
  DISMISS_AMOUNT_EXIT_KEYGUARD_THRESHOLD: 0.3,
  /** canned unlock 时长（fasterUnlockTransition，L108）。 */
  UNLOCK_ANIMATION_DURATION_MS: 300,
  /** legacy 路径时长（L107）。 */
  LEGACY_UNLOCK_ANIMATION_DURATION_MS: 200,
  /** 锁壁纸淡出时长（L114）。 */
  LOCK_WALLPAPER_FADE_OUT_DURATION: 150,
  /** 锁壁纸淡出起始延迟（L115）。 */
  LOCK_WALLPAPER_FADE_OUT_START_DELAY: 150,
  /** 图标入场时长（L124；md3 v7.13 图标涟漪已有等价物，仅供对照）。 */
  LAUNCHER_ICONS_ANIMATION_DURATION_MS: 633,
  /** surface 淡出时长（swipe 场景，L138）。 */
  SURFACE_BEHIND_SWIPE_FADE_DURATION_MS: 175,
  /** surface 弹回起始延迟（fasterUnlockTransition，L145）。 */
  UNLOCK_ANIMATION_SURFACE_BEHIND_START_DELAY_MS: 67,
});

/** NumPadAnimator.java 涟漪时序三拍（main 实拉 L63-66；波纹扩散的时序语义借源）。 */
export const RIPPLE_TIMING = Object.freeze({
  /** 扩散拍：100ms LINEAR（L63 EXPAND_ANIMATION_MS）。 */
  EXPAND_MS: 100,
  /** 收缩拍延迟 33ms（L65 CONTRACT_ANIMATION_DELAY_MS）。 */
  CONTRACT_DELAY_MS: 33,
  /** 收缩拍时长 417ms（L66 CONTRACT_ANIMATION_MS）。 */
  CONTRACT_MS: 417,
});

/**
 * 波纹视觉常数（全部【自创】——A12 RippleShader.kt 已于 main 移除，见头部②；
 * 取值依据：A12 媒体行为描述 + M3 expressive 波纹质感 + 本库 60fps 预算试算）。
 */
export const WAVE = Object.freeze({
  /** 波前扫满全屏用时【自创】：与 A17 canned unlock 300ms 同域（锁屏淡出期间波前到位）。 */
  DURATION_MS: 300,
  /** 波前羽化带宽度【自创】px：波前扫过后内容在该带宽内线性退场（层次感，避免硬边）。 */
  FEATHER_PX: 120,
  /** 内容退场最大放大【自创】：随波 scale 上限（1 + 0.08）——被波推开的视差感。 */
  RETIRE_SCALE_MAX: 1.08,
  /** 内容退场最大模糊【自创】px：blur 上限（滤镜大半径慢，压在 6px 内保帧）。 */
  RETIRE_BLUR_MAX_PX: 6,
  /** 波纹光环起始透明度【自创】。 */
  RING_ALPHA_START: 0.42,
  /** 光环半径相对填充盘的相位差【自创】0~1：光环略滞后于填充波前（两道错峰）。 */
  RING_LAG: 0.12,
});

/** clamp 到 [0,1]。 */
export function clamp01(p) {
  return p < 0 ? 0 : p > 1 ? 1 : p;
}

/** easeOutQuart【自创】：波前快扩慢收（t=1-(1-p)^4），扩散前段迅速、尾段柔和。 */
export function easeOutQuart(p) {
  const q = clamp01(p);
  const inv = 1 - q;
  return 1 - inv * inv * inv * inv;
}

/** easeOutQuad【自创】：surface 弹回缓动（t=1-(1-p)^2），柔和不拖沓。 */
export function easeOutQuad(p) {
  const q = clamp01(p);
  const inv = 1 - q;
  return 1 - inv * inv;
}

/**
 * 波前最大半径：波源到四角的最大距离（波前扫满全屏的几何上界）。
 * @param {number} w 视口宽
 * @param {number} h 视口高
 * @param {number} ox 波源 x
 * @param {number} oy 波源 y
 */
export function rippleMaxRadius(w, h, ox, oy) {
  const dx = Math.max(ox, w - ox);
  const dy = Math.max(oy, h - oy);
  return Math.hypot(dx, dy);
}

/** 波前半径曲线：p∈[0,1] → [0, maxR]，easeOutQuart 快扩慢收【自创曲线】。 */
export function wavefrontRadius(p, maxR) {
  return maxR * easeOutQuart(p);
}

/**
 * 内容退场进度：波前扫过元素距离 dist 后，在羽化带 FEATHER_PX 内线性 0→1。
 * @param {number} dist 元素中心到波源距离（px，提交帧静态量测）
 * @param {number} radius 当前波前半径（px）
 * @param {number} feather 羽化带宽（px）
 */
export function contentRetireProgress(dist, radius, feather) {
  return clamp01((radius - dist) / Math.max(1, feather));
}

/**
 * 内容退场三联动【自创曲线】：p∈[0,1] → {opacity, scale, blurPx}。
 * opacity 线性淡出；scale 1→1.08 随波推起（视差感）；blur 0→6px 轻雾化（错相主次：
 * blur 只在 p>0.15 后起坡，避免首帧大面积滤镜）。
 */
export function contentRetireTransform(p) {
  const q = clamp01(p);
  return {
    opacity: 1 - q,
    scale: 1 + (WAVE.RETIRE_SCALE_MAX - 1) * q,
    blurPx: q <= 0.15 ? 0 : WAVE.RETIRE_BLUR_MAX_PX * ((q - 0.15) / 0.85),
  };
}

/**
 * surface-behind 弹回变换【A17 起值 + 自创缓动】：桌面浮现进度 p∈[0,1] →
 * {scale, tyRatio}。p=0 恒等 A17 起始值（scale 0.95 / ty 5%，轴点 h*0.66 由接线层
 * transform-origin 承载）；p=1 精确归位（scale 1 / ty 0）。
 */
export function surfaceBehindTransform(p) {
  const q = clamp01(p);
  const e = easeOutQuad(q);
  return {
    scale: A17_UNLOCK.SURFACE_BEHIND_START_SCALE_FACTOR +
      (1 - A17_UNLOCK.SURFACE_BEHIND_START_SCALE_FACTOR) * e,
    tyRatio: A17_UNLOCK.SURFACE_BEHIND_START_TRANSLATION_Y * (1 - e),
  };
}

/**
 * 波源解析：有真实触点（pointerdown 采集）用触点（A12 涟漪行为）；否则回 A17 权威
 * 轴点 (w/2, h*0.66)（SURFACE_BEHIND_SCALE_PIVOT_Y 同源，X 恒 w/2）。
 * @param {{x:number|null,y:number|null}|null} pt 触点（可空）
 * @param {number} w 视口宽
 * @param {number} h 视口高
 */
export function resolveRippleOrigin(pt, w, h) {
  if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y) && pt.x >= 0 && pt.y >= 0) {
    return { x: pt.x, y: pt.y, source: 'pointer' };
  }
  return { x: w / 2, y: h * A17_UNLOCK.SURFACE_BEHIND_SCALE_PIVOT_Y, source: 'pivot' };
}

/**
 * 解锁波纹状态机（单一真源，接线层逐帧 sample；中断安全可重入）。
 *
 * - begin()：idle→expanding；expanding 中重入 = 前一动画被顶替（前置清理零残留，
 *   150ms 级「解锁→回锁→再解锁」操作链安全）。
 * - sample(ts)：p = (ts - t0) / DURATION_MS 线性推进；p>=1 自动回 idle（done=true
 *   一次性上报，之后采样恒 idle 零值）。
 * - cancel()：任意态→idle（回锁 / reduced-motion / 异常路径强制收场）。
 *
 * @param {{durationMs?:number}} cfg 可注入时长（测试用；生产缺省 WAVE.DURATION_MS）
 */
export function createUnlockRippleMachine(cfg = {}) {
  const durationMs = cfg.durationMs || WAVE.DURATION_MS;
  let state = 'idle'; // 'idle' | 'expanding'
  let origin = null;
  let maxR = 0;
  let t0 = 0;

  return {
    get state() { return state; },
    get origin() { return origin; },
    get maxRadius() { return maxR; },
    /**
     * 起波。@param {{x:number,y:number}} o 波源 @param {{w:number,h:number}} vp 视口
     * @param {number} startTs 起始时刻（performance.now 同基）
     * @returns {boolean} true=新起（含顶替）；接线层据此挂/换波纹层。
     */
    begin(o, vp, startTs) {
      if (!o || !vp || !Number.isFinite(startTs)) return false;
      origin = { x: o.x, y: o.y };
      maxR = rippleMaxRadius(vp.w, vp.h, o.x, o.y);
      t0 = startTs;
      state = 'expanding';
      return true;
    },
    /**
     * 逐帧采样。@returns {{state:string, p:number, radius:number, alpha:number,
     * done:boolean, origin:{x,y}|null, maxRadius:number}}
     */
    sample(ts) {
      if (state !== 'expanding') {
        return { state: 'idle', p: 0, radius: 0, alpha: 0, done: false, origin: null, maxRadius: 0 };
      }
      const p = (ts - t0) / durationMs;
      if (p >= 1) {
        state = 'idle';
        const r = maxR;
        origin = null;
        maxR = 0;
        return { state: 'idle', p: 1, radius: r, alpha: 0, done: true, origin: null, maxRadius: r };
      }
      const radius = wavefrontRadius(p, maxR);
      return {
        state: 'expanding',
        p,
        radius,
        alpha: 1 - clamp01(p),
        done: false,
        origin: { x: origin.x, y: origin.y },
        maxRadius: maxR,
      };
    },
    /** 强制收场：任意态→idle。@returns {boolean} true=曾有动画被取消。 */
    cancel() {
      const had = state === 'expanding';
      state = 'idle';
      origin = null;
      maxR = 0;
      return had;
    },
  };
}
