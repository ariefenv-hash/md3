/**
 * back-pill.js — v8.21 · #42 预测性返回 A17 pill 重做（弃 v7.49 自创边缘条高亮语言）
 *
 * 权威源（aosp-mirror main 实拉取证）：
 * - packages/SystemUI/src/com/android/systemui/navigationbar/gestural/EdgePanelParams.kt
 *   —— v8.94 #148/#149 注释勘误：原文为【六态】dimens（entry / pre_threshold / active /
 *   fullyStretched / cancelled / committed），PathInterpolator 为【8 组独立定义 +
 *   1 组复用】（arrowAngleInterpolator = entryWidthInterpolator），非旧注所称「七态 / 12 组」。
 *   圆角/宽度弹簧【每态独立】（active: edge 2600/0.855、far 1200/0.30），非全局一套。
 * - gestural/BackPanelController.kt（态机 GONE/ENTRY/ACTIVE/COMMITTED/CANCELLED/
 *   FLUNG；handleMoveEvent 进度映射：staticThresholdProgress = xT/16dp、
 *   fullScreenProgress = (xT−activeOffset)/fullyStretchedThreshold、垂直橡皮筋
 *   maxOffset×15 饱和 + verticalTranslationInterpolator；updateYStartPosition：
 *   y = constrain(max(touchY−fingerOffset, minArrowYPosition) − height/2, 0, displaySize.y)）
 * - gestural/BackPanel.kt（stretchBy = resting + amount×(final−resting) 逐维弹簧驱动、
 *   背景 materialColorSecondaryContainer / 箭头 materialColorOnSecondaryContainer、
 *   箭头 stroke 4dp SQUARE cap；springForce?.let 语义：null = 沿用上一态弹簧，非「无弹簧」）
 * - res/values/dimens.xml（navigation_edge_* 全量 dp 实值：entry 0×48 ec6 fc6 margin4 /
 *   preThreshold 51×46 ec16 fc20 / active 48×48 ec24 fc24 margin14 / stretch 60×48 margin18 /
 *   committed scale .86 α0 / cancelled w0 arrow 12×0 ec6 / fingerOffset 64dp /
 *   arrow_min_y 64dp / staticTrigger 16dp / progressThreshold 412dp）
 *
 * Web 移植：十维解析弹簧（k/d ζ 源码值）+ 三次贝塞尔求值器（PathInterpolator 同构，
 * 支持负控制点）；手势中 move 高频只更新弹簧 target（BackPanelController 同构：
 * stretchBy 本就是 spring.animateToFinalPosition(resting + amount×Δ)），自持 rAF 积分写 DOM。
 */

// 六态 dimens（权威 res/values/dimens.xml；v8.94 #142 补齐 cancelled/committed 两态）
const DIMS = {
  entry: { w: 0, h: 48, ec: 6, fc: 6, m: 4, s: 0.98, al: 8.6, ah: 5, aa: 0, ba: 1 },
  pre: { w: 51, h: 46, ec: 16, fc: 20, m: 4, s: 0.98, al: 8, ah: 5.6, aa: 1, ba: 1 },
  active: { w: 48, h: 48, ec: 24, fc: 24, m: 14, s: 1, al: 6.4, ah: 7.2, aa: 1, ba: 1 },
  stretch: { w: 60, h: 48, ec: 24, fc: 24, m: 18, s: 1, al: 5.6, ah: 8, aa: 1, ba: 1 },
  // cancelled：宽→0，箭头拉长压扁 12×0，edge 圆角回 6（navigation_edge_cancelled_*）
  cancelled: { w: 0, h: 48, ec: 6, fc: 6, m: 4, s: 0.98, al: 12, ah: 0, aa: 0, ba: 0 },
  // committed：scale .86 + 背景 α→0
  committed: { w: 48, h: 48, ec: 24, fc: 24, m: 14, s: 0.86, al: 6.4, ah: 7.2, aa: 0, ba: 0 },
};

// PathInterpolator 源码值（EdgePanelParams.kt L157-165 实拉）→ 三次贝塞尔控制点
// 权威 8 组独立定义 + 1 组复用（arrowAngle = entryWidth）；v8.94 #148 补齐
// entryWidthTowardsEdge（原缺失），并删去旧注「12 组」的夸大表述。
const INTERP = {
  entryWidth: [0.19, 1.27, 0.71, 0.86],              // L157
  entryWidthTowardsEdge: [1.0, -3.0, 1.0, 1.2],      // L158（v8.94 #148 补）
  activeWidth: [0.7, -0.24, 0.48, 1.21],             // L159
  arrowAngle: [0.19, 1.27, 0.71, 0.86],              // L160 = entryWidthInterpolator（复用）
  horizontal: [0.2, 1.0, 1.0, 1.0],                  // L161
  vertical: [0.5, 1.15, 0.41, 0.94],                 // L162
  farCorner: [0.03, 0.19, 0.14, 1.09],               // L163
  edgeCorner: [0.0, 1.11, 0.85, 0.84],               // L164
  height: [1.0, 0.05, 0.9, -0.29],                   // L165
};

// 弹簧（EdgePanelParams：createSpring(stiffness, dampingRatio) 源码值）
const SPRING = {
  width: [450, 0.65], height: [1500, 0.45], edgeCorner: [150, 0.5], farCorner: [300, 0.5],
  margin: [800, 0.76], scale: [120, 0.8], arrow: [600, 0.4],
  arrowAlphaPost: [180, 0.9], arrowAlphaPre: [2000, 0.6],
  bgAlphaCommit: [1400, 1], bgAlphaCancel: [450, 1],
  vertical: [30000, 1], scaleCommit: [5700, 1],
};

// v8.94 #143：圆角弹簧【每态独立】——权威 EdgePanelParams 各态 stiffness/dampingRatio 不同，
// active 态 edge 2600（entry 态仅 150，相差 17 倍）正是 A17「进 ACTIVE 后清脆弹到位」的来源。
// stretch/flung 态源码为 null，按 BackPanel.kt `springForce?.let { spring = it }` 语义
// = 沿用上一态弹簧（非「无弹簧」），故此处标 null 交由切换逻辑保持不换。
const CORNER_SPRING = {
  entry:    { ec: [150, 0.5],  fc: [300, 0.5] },
  pre:      { ec: [250, 0.5],  fc: [300, 1.0] },
  active:   { ec: [2600, 0.855], fc: [1200, 0.30] },
  stretch:  null,   // 沿用 active
  cancelled:{ ec: [150, 0.5],  fc: [300, 0.5] },
  committed:{ ec: [10000, 1],  fc: [10000, 1] },
};

const FINGER_OFFSET = 64;      // navigation_edge_finger_offset 64dp
const MIN_ARROW_Y = 64;        // navigation_edge_arrow_min_y 64dp（v8.94 #140 修正）
const STATIC_THRESHOLD = 16;   // navigation_edge_action_drag_threshold 16dp
const PROGRESS_THRESHOLD = 412; // navigation_edge_action_progress_threshold 412dp
const RUBBERBAND = 15;         // BackPanelController rubberbandAmount
const EDGE_PANEL_H = 268;      // navigation_edge_panel_height
const TOUCH_SLOP = 8;          // ViewConfiguration.scaledTouchSlop ≈ 8dp（#148 沿用逻辑用）

/** 三次贝塞尔缓动求值（PathInterpolator 同构；支持负控制点过冲） */
function bezier(p1x, p1y, p2x, p2y) {
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
  const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleDX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {           // 牛顿迭代（Webkit 线性回退兜底可省，6 次足够）
      const d = sampleDX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (sampleX(t) - x) / d;
    }
    return ((ay * t + by) * t + cy) * t;
  };
}
const E = {};
for (const [k, [a, b, c, d]] of Object.entries(INTERP)) E[k] = bezier(a, b, c, d);

class Spring {
  constructor(k, c) { this.k = k; this.c = c; this.pos = 0; this.v = 0; this.target = 0; }
  set(k, c) { this.k = k; this.c = c; }
  snap(p) { this.pos = this.target = p; this.v = 0; }
  step(dt) {
    // 解析弹簧逐帧积分（tile-bounce v7.92 范式）：a = k(t−x) − c·v
    const a = this.k * (this.target - this.pos) - this.c * 2 * Math.sqrt(this.k) * this.v;
    this.v += a * dt;
    this.pos += this.v * dt;
  }
  settled() { return Math.abs(this.target - this.pos) < 0.05 && Math.abs(this.v) < 0.5; }
}

let el = null, arrow = null, side = 'left', state = 'GONE';
let startY = 0, rafId = 0, lastT = 0;
const S = {
  w: new Spring(...SPRING.width), h: new Spring(...SPRING.height),
  ec: new Spring(...SPRING.edgeCorner), fc: new Spring(...SPRING.farCorner),
  m: new Spring(...SPRING.margin), s: new Spring(...SPRING.scale),
  al: new Spring(...SPRING.arrow), ah: new Spring(...SPRING.arrow),
  aa: new Spring(...SPRING.arrowAlphaPre), ba: new Spring(450, 1),
  y: new Spring(...SPRING.vertical),
};

function render() {
  if (!el) return;
  const left = side === 'left';
  const x = left ? S.m.pos : window.innerWidth - S.m.pos - S.w.pos;
  const cy = S.y.pos;
  const ec = Math.max(0, S.ec.pos), fc = Math.max(0, S.fc.pos);
  // edge 圆角 = 贴屏边侧两角，far = 远侧两角（BackPanel drawRoundRect 四角分离语义）
  el.style.borderRadius = left
    ? `${ec}px ${fc}px ${fc}px ${ec}px`
    : `${fc}px ${ec}px ${ec}px ${fc}px`;
  el.style.width = `${Math.max(0, S.w.pos)}px`;
  el.style.height = `${Math.max(0, S.h.pos)}px`;
  el.style.opacity = String(Math.max(0, Math.min(1, S.ba.pos)));
  el.style.transform =
    `translate3d(${x}px, ${cy - S.h.pos / 2}px, 0) scale(${Math.max(0, S.s.pos)})`;
  arrow.style.width = `${Math.max(0, S.al.pos)}px`;
  arrow.style.height = `${Math.max(0, S.ah.pos)}px`;
  arrow.style.opacity = String(Math.max(0, Math.min(1, S.aa.pos)));
}

function tick(t) {
  const dt = Math.min((t - lastT) / 1000, 1 / 30) || 1 / 60;
  lastT = t;
  let live = false;
  for (const s of Object.values(S)) { s.step(dt); if (!s.settled()) live = true; }
  render();
  if (!live && (state === 'COMMITTED' || state === 'CANCELLED')) {
    state = 'GONE';
    el.style.visibility = 'hidden';
    document.body.classList.remove('back-pill-active');
    rafId = 0;
    return;
  }
  rafId = live ? requestAnimationFrame(tick) : 0;
}

function wake() {
  if (!rafId) { lastT = performance.now(); rafId = requestAnimationFrame(tick); }
}

/**
 * v8.94 #143：按态切换圆角两维的弹簧参数（EdgePanelParams 每态独立 spring）。
 * null（stretch/flung）按 BackPanel.kt `springForce?.let{...}` 语义 = 沿用当前弹簧，不换。
 * @param {keyof typeof CORNER_SPRING} stateName
 */
function applyCornerSpring(stateName) {
  const cs = CORNER_SPRING[stateName];
  if (!cs) return; // null → 沿用上一态（stretch 沿用 active 的 2600/0.855）
  S.ec.set(...cs.ec);
  S.fc.set(...cs.fc);
}

/** v8.94 #148：pre-threshold 宽度插值器三分支选择（BackPanelController L587-602 同构） */
let prevPreThresholdInterp = 'entryWidth';
function preThresholdInterp(totalDelta) {
  const isPastSlop = Math.abs(totalDelta) > TOUCH_SLOP;
  const next = isPastSlop
    ? (totalDelta > 0 ? 'entryWidth' : 'entryWidthTowardsEdge')
    : prevPreThresholdInterp;
  prevPreThresholdInterp = next;
  return E[next];
}

function snapToDims(d) {
  S.w.target = S.w.pos = d.w; S.h.target = S.h.pos = d.h;
  S.ec.target = S.ec.pos = d.ec; S.fc.target = S.fc.pos = d.fc;
  S.m.target = S.m.pos = d.m; S.s.target = S.s.pos = d.s;
  S.al.target = S.al.pos = d.al; S.ah.target = S.ah.pos = d.ah;
  S.aa.target = S.aa.pos = d.aa; S.ba.target = S.ba.pos = d.ba;
}

/**
 * v8.94 #140 修正：BackPanelController.updateYStartPosition 权威推导
 *
 * 源码：
 *   var yPosition = touchY - params.fingerOffset          // −64
 *   yPosition = max(yPosition, params.minArrowYPosition)  // max(·, 64)
 *   yPosition -= layoutParams.height / 2.0f               // −134（居中补偿，非钳位下限）
 *   layoutParams.y = constrain(yPosition, 0, displaySize.y)
 *
 * panel 高 268、箭头垂直居中于 panel ⇒ 箭头中心 = panelTop + 134
 *   = [max(touchY − 64, 64) − 134] + 134 = max(touchY − 64, 64)
 *
 * 故本函数返回【箭头中心 y】，钳位区间为 [0, 屏幕高]（旧实现三处背离：
 * 下限误用 134、多出自创 +24、上限少 134 —— 详见 #140）。
 */
function baseY(touchY) {
  const y = Math.max(touchY - FINGER_OFFSET, MIN_ARROW_Y);
  return Math.max(0, Math.min(window.innerHeight, y));
}

export const backPill = {
  init() {
    if (el) return;
    el = document.getElementById('backPill');
    arrow = document.getElementById('backPillArrow');
    if (!el || !arrow) return;
    state = 'GONE';
    el.style.visibility = 'hidden';
  },
  /** 方向确认（activateEdgeBackChannel 同步调用）：ENTRY 态，宽度 0 起步 */
  begin(gestureType, touchY) {
    if (!el) return;
    side = gestureType === 'EDGE_LEFT' ? 'left' : 'right';
    el.classList.toggle('right', side === 'right');
    state = 'ENTRY';
    snapToDims(DIMS.entry);
    applyCornerSpring('entry');
    prevPreThresholdInterp = 'entryWidth'; // 新手势：插值器沿用态复位
    startY = touchY;
    S.y.snap(baseY(touchY));
    el.style.visibility = 'visible';
    document.body.classList.add('back-pill-active');
    wake();
  },
  /**
   * 跟手进度（BackPanelController.handleMoveEvent 同构）：
   * xT = 提交方向投影位移（≥0）；dy = 手指纵向偏移（橡皮筋）
   */
  progress(xT, dy) {
    if (!el || (state !== 'ENTRY' && state !== 'ACTIVE')) return;
    if (state === 'ENTRY' && xT > STATIC_THRESHOLD) {
      state = 'ACTIVE';
      // 态切换：resting 更新为 active 基准（弹簧 pos 保持当前连续，target 走 active 基准）
      const keep = { w: S.w.pos, h: S.h.pos, ec: S.ec.pos, fc: S.fc.pos, m: S.m.pos, al: S.al.pos, ah: S.ah.pos, aa: S.aa.pos };
      snapToDims(DIMS.active);
      Object.assign(S.w, { pos: keep.w, target: DIMS.active.w });
      Object.assign(S.h, { pos: keep.h, target: DIMS.active.h });
      Object.assign(S.ec, { pos: keep.ec, target: DIMS.active.ec });
      Object.assign(S.fc, { pos: keep.fc, target: DIMS.active.fc });
      Object.assign(S.m, { pos: keep.m, target: DIMS.active.m });
      Object.assign(S.al, { pos: keep.al, target: DIMS.active.al });
      Object.assign(S.ah, { pos: keep.ah, target: DIMS.active.ah });
      S.aa.set(...SPRING.arrowAlphaPost);
      S.aa.target = DIMS.active.aa;
      // v8.94 #143：切态时同步换圆角弹簧参数 —— 权威 active 态 edge 2600/0.855、
      // far 1200/0.30（entry 仅 150/0.5），不换则形变黏滞不到位。
      applyCornerSpring('active');
    }
    if (state === 'ENTRY') {
      const p = Math.max(0, Math.min(1, xT / STATIC_THRESHOLD)); // staticThresholdProgress
      // v8.94 #148：宽度插值器按 BackPanelController.preThresholdWidthStretchAmount 三分支选取
      // ——手指朝边缘回拖走 entryWidthTowardsEdge(1,−3,1,1.2)；未过 slop 沿用上一次（防抖动抽搐）。
      const wInterp = preThresholdInterp(xT);
      // stretchEntryBackIndicator：entry 基准 → preThreshold 目标（五维插值器各自驱动）
      S.w.target = DIMS.entry.w + wInterp(p) * (DIMS.pre.w - DIMS.entry.w);
      S.h.target = DIMS.entry.h + E.height(p) * (DIMS.pre.h - DIMS.entry.h);
      S.ec.target = DIMS.entry.ec + E.edgeCorner(p) * (DIMS.pre.ec - DIMS.entry.ec);
      S.fc.target = DIMS.entry.fc + E.farCorner(p) * (DIMS.pre.fc - DIMS.entry.fc);
      S.aa.target = p > 0.165 ? 1 : p * (1 / 0.165); // alphaStep threshold .165 + factor 1.05
      S.m.target = DIMS.entry.m;
    } else {
      const thr = Math.min(window.innerWidth, PROGRESS_THRESHOLD);
      const p = Math.max(0, Math.min(1, (xT - STATIC_THRESHOLD) / Math.max(thr - STATIC_THRESHOLD, 1))); // fullScreenProgress
      // stretchActiveBackIndicator：active 基准 → fullyStretched 目标
      S.w.target = DIMS.active.w + E.activeWidth(p) * (DIMS.stretch.w - DIMS.active.w);
      S.m.target = DIMS.active.m + E.horizontal(p) * (DIMS.stretch.m - DIMS.active.m);
      S.al.target = DIMS.active.al + E.arrowAngle(p) * (DIMS.stretch.al - DIMS.active.al);
      S.ah.target = DIMS.active.ah + E.arrowAngle(p) * (DIMS.stretch.ah - DIMS.active.ah);
    }
    // 垂直橡皮筋：maxOffset = (268−48)/2 = 110，rubberband 15 倍饱和 + vertical 插值器
    const maxOff = (EDGE_PANEL_H - 48) / 2;
    const yp = Math.max(0, Math.min(1, Math.abs(dy) / (maxOff * RUBBERBAND)));
    const off = E.vertical(yp) * maxOff * Math.sign(dy || 0);
    S.y.target = baseY(startY) + off;
    wake();
  },
  /**
   * 提交（v8.94 #142 补齐 committed 态：authority 除 scale .86 + 背景 α→0 外，
   * 还驱动 arrow length/height/width/corners 的 committed 专属弹簧）
   */
  commit() {
    if (!el || state === 'GONE') return;
    state = 'COMMITTED';
    S.s.set(...SPRING.scaleCommit); S.s.target = DIMS.committed.s;
    S.ba.set(...SPRING.bgAlphaCommit); S.ba.target = DIMS.committed.ba;
    S.aa.target = DIMS.committed.aa;
    S.al.target = DIMS.committed.al;
    S.ah.target = DIMS.committed.ah;
    S.ec.target = DIMS.committed.ec;
    S.fc.target = DIMS.committed.fc;
    applyCornerSpring('committed');
    wake();
  },
  /**
   * 取消（v8.94 #142 补齐 cancelled 专属 dimens：箭头先拉长压扁 12×0、edge 圆角回 6，
   * 再随背景一起消失 —— 这是 A17 预测性返回最易辨认的收尾形变，旧实现只会整体淡出）
   */
  cancel() {
    if (!el || state === 'GONE') return;
    state = 'CANCELLED';
    S.ba.set(...SPRING.bgAlphaCancel); S.ba.target = DIMS.cancelled.ba;
    S.aa.target = DIMS.cancelled.aa;
    S.w.target = DIMS.cancelled.w;
    S.m.target = DIMS.cancelled.m;
    S.s.target = DIMS.cancelled.s;
    S.al.target = DIMS.cancelled.al;
    S.ah.target = DIMS.cancelled.ah;
    S.ec.target = DIMS.cancelled.ec;
    S.fc.target = DIMS.cancelled.fc;
    applyCornerSpring('cancelled');
    prevPreThresholdInterp = 'entryWidth'; // 手势结束，插值器沿用态复位
    wake();
  },
  get state() { return state; },
};
