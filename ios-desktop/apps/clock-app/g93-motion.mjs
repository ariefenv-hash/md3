// ==================== g93-motion.mjs — 9.3 Gastown 动效层（逐值移植） ====================
// 铁律：不自造样式 / 保证视觉语言 / 没有的诚实说明。
//
// 真源（全部可机读回溯）：docs/reference/deskclock/gastown93/motion-spec.json
//   · 由该目录 arsc93-full.tsv（109,910 条）+ axml-all93.txt（1,535 个 res 文件）逐行解析生成
//   · 源 APK：com.google.android.deskclock 9.3 (1003616371) / targetSdk 37 / android-17.0.0_r1
//
// 本文件所有数值均取自 motion-spec.json，不保留任何"语义档位猜测"。
// 例外（明确标注）：Ripple ENTER/EXIT 来自 asset-drop 已核对的 AOSP RippleShader.java，
//   不在本 APK 的 arsc 中（RippleDrawable 由 framework 提供，DeskClock 不内置资源）。
// -------------------------------------------------------------------------------------

/** M3 系统时长（ms）—— motion-spec.json → duration_ms，m3_sys_motion_duration_* 全量 */
export const MOTION = Object.freeze({
  short1: 50, short2: 100, short3: 150, short4: 200,
  medium1: 250, medium2: 300, medium3: 350, medium4: 400,
  long1: 450, long2: 500, long3: 550, long4: 600,
  extraLong1: 700, extraLong2: 800, extraLong3: 900, extraLong4: 1000,
  bottomSheetSlide: 150,          // bottom_sheet_slide_duration
  appBarElevation: 150,           // app_bar_elevation_anim_duration
  tabIndicator: 300,              // design_tab_indicator_anim_duration_ms
  tabIndicatorMtrl: 250,          // mtrl_tab_indicator_anim_duration_ms
  button: 100,                    // m3_btn_anim_duration_ms / mtrl_btn_anim_duration_ms
  card: 120,                      // mtrl_card_anim_duration_ms
  activityDefault: 220,           // abc_config_activityDefaultDur
  activityShort: 150,             // abc_config_activityShortDur
  rippleEnter: 450,               // AOSP RippleShader.java（asset-drop 已核对，非本 APK）
  rippleExit: 375,                // AOSP RippleShader.java
});

/**
 * M3 系统缓动 —— motion-spec.json → easing（control_x1/y1/x2/y2 dimen）。
 * emphasized 为分段三次贝塞尔 path，非单段，见 makePathEasing。
 */
export const EASE = Object.freeze({
  standard: [0.2, 0, 0, 1],
  standardDecelerate: [0, 0, 0, 1],
  standardAccelerate: [0.3, 0, 1, 1],
  emphasizedDecelerate: [0.1, 0.7, 0.1, 1],
  emphasizedAccelerate: [0.3, 0, 0.8, 0.2],
  linear: [0, 0, 1, 1],
  // m3_sys_motion_easing_emphasized_path_data：两段三次贝塞尔
  emphasizedPath: 'M 0,0 C 0.05, 0, 0.133333, 0.06, 0.166666, 0.4 C 0.208333, 0.82, 0.25, 1, 1, 1',
  // interpolator 资源（motion-spec.json → interpolator）
  mtrlLinearOutSlowIn: [0, 0, 0.2, 1],
  mtrlFastOutLinearIn: [0.4, 0, 1, 1],
  mtrlFastOutSlowIn: [0.4, 0, 0.2, 1],
});

/**
 * FAB 显隐规格 —— mtrl_fab_show/hide（F8.xml / c21.xml）与 design_fab_show/hide
 * （Aa.xml / UE.xml）逐 objectAnimator 解析。interpolator 已解到控制点。
 * 9.3 使用 mtrl_* 组（MDC 1.14）；design_* 为 appcompat 兼容组，留档对照。
 */
export const FAB_SPEC = Object.freeze({
  show: Object.freeze({
    source: 'mtrl_fab_show_motion_spec / res/F8.xml',
    opacity: { duration: 15, startOffset: 30, easing: EASE.linear },
    scale: { duration: 330, startOffset: 0, easing: EASE.mtrlLinearOutSlowIn },
    iconScale: { duration: 240, startOffset: 90, easing: EASE.mtrlLinearOutSlowIn },
  }),
  hide: Object.freeze({
    source: 'mtrl_fab_hide_motion_spec / res/c21.xml',
    opacity: { duration: 15, startOffset: 150, easing: EASE.linear },
    scale: { duration: 135, startOffset: 0, easing: EASE.mtrlFastOutLinearIn },
    iconScale: { duration: 180, startOffset: 0, easing: EASE.mtrlFastOutLinearIn },
  }),
  designShow: { opacity: 200, scale: 200, iconScale: 0, file: 'Aa.xml' },
  designHide: { opacity: 200, scale: 200, iconScale: 0, file: 'UE.xml' },
});

/**
 * Fragment 切换规格 —— Sc1/BJ2/q6/5z.xml，float 位模式已解：
 * 0x3f59999a=0.85 / 0x3f933333=1.15 / 0x3f8ccccd=1.1 / 0x3f666666=0.9
 */
export const FRAGMENT_SPEC = Object.freeze({
  openEnter: { alphaHold: 50, alphaFade: 50, scaleDuration: 300, scaleFrom: 0.85, scaleTo: 1.0, interpolator: EASE.standard },
  openExit: { alphaHold: 50, alphaFade: 50, scaleDuration: 300, scaleFrom: 1.0, scaleTo: 1.15 },
  closeEnter: { alphaHold: 66, alphaFade: 50, scaleDuration: 300, scaleFrom: 1.1, scaleTo: 1.0 },
  closeExit: { alphaHold: 66, alphaFade: 50, scaleDuration: 300, scaleFrom: 1.0, scaleTo: 0.9 },
});

/** BottomSheet 滑入/滑出 —— rI2.xml / QP.xml，duration=bottom_sheet_slide_duration=150ms */
export const SHEET_SPEC = Object.freeze({
  duration: MOTION.bottomSheetSlide,
  translateFrom: '20%',    // @0x19999a31/t06 → fraction 20%
  translateTo: '0%',
  alphaFrom: 0, alphaTo: 1,
});

/** tab 图标 AVD 专用 pathInterpolator —— ic_tab_* anim 资源 */
export const TAB_ICON_EASE = Object.freeze({
  clock0: 'M 0.0,0.0 c 0.45921046959,0.0 1.0,1.0 1.0,1.0',
  clock1: 'M 0.0,0.0 c 0.0,0.0 0.618865688196,1.0 1.0,1.0',
  stopwatch0: 'M 0,0 C 0.2,0 0.1,0.5 0.5,0.5 C 0.7,0.5 0.6,1 1,1',
});

/** 兼容别名：旧调用点用 DUR */
export const DUR = Object.freeze({
  rippleIn: MOTION.rippleEnter, rippleOut: MOTION.rippleExit,
  short: MOTION.short4, medium: MOTION.medium2,
  fab: FAB_SPEC.show.scale.duration,       // 330（原猜测 250 已作废）
  tab: FRAGMENT_SPEC.openEnter.scaleDuration, // 300（原猜测 320 已作废）
  sheet: SHEET_SPEC.duration,
});

/**
 * 单段三次贝塞尔缓动（与 avd-runtime.mjs makeEasing 同构）。
 * 以 x(t) 牛顿迭代反解 t，再求 y(t)——对齐 AOSP PathInterpolator 语义。
 */
export function makeEasing([cx1, cy1, cx2, cy2]) {
  if (![cx1, cy1, cx2, cy2].every((v) => typeof v === 'number')) return (t) => t;
  const ax = 3 * cx1, bx = 3 * (cx2 - cx1) - ax, cx = 1 - ax - bx;
  const ay = 3 * cy1, by = 3 * (cy2 - cy1) - ay, cy = 1 - ay - by;
  const xOf = (t) => ((cx * t + bx) * t + ax) * t;
  const dxOf = (t) => (3 * cx * t + 2 * bx) * t + ax;
  const yOf = (t) => ((cy * t + by) * t + ay) * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 10; i++) {
      const err = xOf(t) - x;
      if (Math.abs(err) < 1e-6) break;
      const d = dxOf(t);
      if (Math.abs(d) < 1e-7) break;
      t -= err / d;
    }
    return yOf(Math.max(0, Math.min(1, t)));
  };
}

/**
 * 分段三次贝塞尔（AOSP PathInterpolator pathData 语义）。
 * emphasized 为 "M 0,0 C ... C ..." 两段，按 x 落点选段后各自反解。
 */
export function makePathEasing(pathData) {
  const nums = (pathData.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || []).map(Number);
  // 每段 C 六个控制点：x1,y1,x2,y2,x3,y3（起点取上一段终点）
  const segs = [];
  let px = 0, py = 0, i = 0;
  const m = /^M\s*([-\d.]+)[,\s]+([-\d.]+)/.exec(pathData);
  if (m) { px = Number(m[1]); py = Number(m[2]); }
  const cmds = pathData.match(/[Cc]\s*([^CcMm]+)/g) || [];
  for (const c of cmds) {
    const v = (c.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || []).map(Number);
    if (v.length < 6) continue;
    const [x1, y1, x2, y2, x3, y3] = v.slice(0, 6);
    segs.push({ x0: px, y0: py, x1, y1, x2, y2, x3, y3 });
    px = x3; py = y3; i += 6;
  }
  if (!segs.length) return (t) => t;
  const bez = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  };
  const dbez = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return 3 * u * u * (p1 - p0) + 6 * u * t * (p2 - p1) + 3 * t * t * (p3 - p2);
  };
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    for (const g of segs) {
      if (x > g.x3 && g !== segs[segs.length - 1]) continue;
      let t = (x - g.x0) / (g.x3 - g.x0 || 1);
      for (let k = 0; k < 10; k++) {
        const err = bez(g.x0, g.x1, g.x2, g.x3, t) - x;
        if (Math.abs(err) < 1e-6) break;
        const d = dbez(g.x0, g.x1, g.x2, g.x3, t);
        if (Math.abs(d) < 1e-7) break;
        t = Math.max(0, Math.min(1, t - err / d));
      }
      return bez(g.y0, g.y1, g.y2, g.y3, t);
    }
    return x;
  };
}

/** prefers-reduced-motion 覆盖（与 avd-runtime.mjs 判定同源） */
export function createReduceGuard() {
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reduced = mq ? mq.matches : false;
  if (mq && mq.addEventListener) mq.addEventListener('change', (e) => { reduced = e.matches; });
  return () => reduced;
}

/**
 * 播放 CSS 动画类，返回 Promise。
 * 以 animationend 为准而非固定定时器；reduce 或未启动时限即 resolve，绝不悬挂。
 */
export function anim(el, cls, dur, isReduced) {
  return new Promise((resolve) => {
    if (!el || isReduced) { resolve(); return; }
    el.classList.remove(cls);
    void el.offsetWidth;              // 强制 reflow，使同名动画可重入
    el.classList.add(cls);
    let done = false;
    const fin = () => {
      if (done) return;
      done = true;
      el.classList.remove(cls);
      el.removeEventListener('animationend', onEnd);
      resolve();
    };
    const onEnd = (ev) => { if (ev.target === el) fin(); };
    el.addEventListener('animationend', onEnd);
    // FAB 的 opacity/scale/iconScale 是三段并行且 iconScale 落在子树 svg 上：
    // 用 getAnimations({subtree:true}) 等全部结束，避免首个动画结束就提前 resolve。
    if (typeof el.getAnimations === 'function') {
      const list = el.getAnimations({ subtree: true });
      if (list.length) {
        Promise.all(list.map((a) => a.finished.catch(() => {}))).then(fin);
      }
    }
    setTimeout(fin, (dur || MOTION.medium2) + 120);   // 兜底：display:none 吞掉事件
  });
}

/**
 * 涟漪绑定：对齐 RippleDrawable 语义（pointerdown 起振，ENTER 450ms）。
 * 类名沿用 index.html 既有 `.g93-ripple-dot`。
 */
export function bindRipple(root, selector, isReduced) {
  if (!root || isReduced) return;
  root.querySelectorAll(selector).forEach((el) => {
    if (el.dataset.g93Ripple === '1') return;
    el.dataset.g93Ripple = '1';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.addEventListener('pointerdown', (ev) => {
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const dot = document.createElement('span');
      dot.className = 'g93-ripple-dot';
      dot.style.cssText = 'left:' + (ev.clientX - r.left - size / 2) + 'px;top:'
        + (ev.clientY - r.top - size / 2) + 'px;width:' + size + 'px;height:' + size + 'px';
      el.appendChild(dot);
      dot.addEventListener('animationend', () => dot.remove());
      setTimeout(() => dot.remove(), MOTION.rippleEnter + 120);
    }, { passive: true });
  });
}

/**
 * FAB 显隐：按 mtrl_fab_show/hide_motion_spec 的三段并行编排。
 * Web 以两个 CSS 变量 --g93-fab-dur / --g93-icon-dur 驱动同元素上的分层关键帧，
 * opacity 的 startOffset 用 animation-delay 表达。
 */
export function fabAnim(fab, show, isReduced, helpers) {
  const { anim: runAnim } = helpers || {};
  if (!fab || isReduced || !runAnim) { if (fab) fab.hidden = !show; return; }
  const sp = show ? FAB_SPEC.show : FAB_SPEC.hide;
  fab.style.setProperty('--g93-fab-dur', sp.scale.duration + 'ms');
  fab.style.setProperty('--g93-icon-dur', sp.iconScale.duration + 'ms');
  fab.style.setProperty('--g93-op-delay', sp.opacity.startOffset + 'ms');
  fab.style.setProperty('--g93-icon-delay', sp.iconScale.startOffset + 'ms');
  if (show && fab.hidden) {
    fab.hidden = false;
    requestAnimationFrame(() => runAnim(fab, 'g93-anim-in', sp.scale.duration + sp.opacity.startOffset));
  } else if (!show && !fab.hidden) {
    runAnim(fab, 'g93-anim-out', sp.scale.duration + sp.opacity.startOffset).then(() => { fab.hidden = true; });
  }
}

/**
 * 计时器环进度 → MDC CircularProgressIndicator 几何（逐值）。
 * gastown_timer_card res/N4.xml：
 *   indicatorSize=340dp / trackThickness=12dp / trackCornerRadius=6dp
 *   indicatorTrackGapSize=12dp
 * Web 映射：stroke-linecap:round 的 cap 半径 = thickness/2 = 6dp，恰对应 corner=6；
 *   gap 由 indicator 弧两端各内缩 gap/2 表达（stroke-dashoffset 偏移）。
 */
export function ringGeometry(remainingMs, totalMs, circumference, trackGap = 0) {
  const p = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const c = circumference || (2 * Math.PI * 164);
  const halfGap = Math.max(0, trackGap) / 2;
  // 弧长按 trackGap 两端内缩；进度极小时不留负长
  const arc = Math.max(0, p * c - trackGap);
  return {
    fraction: p,
    dash: arc.toFixed(3),
    gap: (c - arc).toFixed(3),
    offset: (-halfGap).toFixed(3),   // 负 offset 使起始端内缩 halfGap
    trackGap,
    expired: totalMs > 0 && remainingMs <= 0,
  };
}
