/**
 * back-pill.js — v8.21 · #42 预测性返回 A17 pill 重做（弃 v7.49 自创边缘条高亮语言）
 *
 * 权威源（aosp-mirror main 实拉取证）：
 * - packages/SystemUI/src/com/android/systemui/navigationbar/gestural/EdgePanelParams.kt
 *   （七态 dimens + 12 组 PathInterpolator + 全套弹簧 stiffness/dampingRatio）
 * - gestural/BackPanelController.kt（态机 GONE/ENTRY/ACTIVE/COMMITTED/CANCELLED/
 *   FLUNG；handleMoveEvent 进度映射：staticThresholdProgress = xT/16dp、
 *   fullScreenProgress = (xT−activeOffset)/fullyStretchedThreshold、垂直橡皮筋
 *   maxOffset×15 饱和 + verticalTranslationInterpolator）
 * - gestural/BackPanel.kt（stretchBy = resting + amount×(final−resting) 逐维弹簧驱动、
 *   背景 materialColorSecondaryContainer / 箭头 materialColorOnSecondaryContainer、
 *   箭头 stroke 4dp SQUARE cap）
 * - res/values/dimens.xml（navigation_edge_* 全量 dp 实值：entry 0×48 ec6 fc6 margin4 /
 *   preThreshold 51×46 ec16 fc20 / active 48×48 ec24 fc24 margin14 / stretch 60×48 margin18 /
 *   committed scale .86 α0 / fingerOffset 64dp / staticTrigger 16dp / progressThreshold 412dp）
 *
 * Web 移植：十维解析弹簧（k/d ζ 源码值）+ 三次贝塞尔求值器（PathInterpolator 同构，
 * 支持负控制点）；手势中 move 高频只更新弹簧 target（BackPanelController 同构：
 * stretchBy 本就是 spring.animateToFinalPosition(resting + amount×Δ)），自持 rAF 积分写 DOM。
 */

const DIMS = {
  entry: { w: 0, h: 48, ec: 6, fc: 6, m: 4, s: 0.98, al: 8.6, ah: 5, aa: 0, ba: 1 },
  pre: { w: 51, h: 46, ec: 16, fc: 20, m: 4, s: 0.98, al: 8, ah: 5.6, aa: 1, ba: 1 },
  active: { w: 48, h: 48, ec: 24, fc: 24, m: 14, s: 1, al: 6.4, ah: 7.2, aa: 1, ba: 1 },
  stretch: { w: 60, h: 48, ec: 24, fc: 24, m: 18, s: 1, al: 5.6, ah: 8, aa: 1, ba: 1 },
};

// PathInterpolator 源码值（EdgePanelParams.update L281-291）→ 三次贝塞尔控制点
const INTERP = {
  entryWidth: [0.19, 1.27, 0.71, 0.86],
  activeWidth: [0.7, -0.24, 0.48, 1.21],
  horizontal: [0.2, 1.0, 1.0, 1.0],
  farCorner: [0.03, 0.19, 0.14, 1.09],
  edgeCorner: [0.0, 1.11, 0.85, 0.84],
  height: [1.0, 0.05, 0.9, -0.29],
  arrowAngle: [0.19, 1.27, 0.71, 0.86],
  vertical: [0.5, 1.15, 0.41, 0.94],
};

// 弹簧（EdgePanelParams：createSpring(stiffness, dampingRatio) 源码值）
const SPRING = {
  width: [450, 0.65], height: [1500, 0.45], edgeCorner: [150, 0.5], farCorner: [300, 0.5],
  margin: [800, 0.76], scale: [120, 0.8], arrow: [600, 0.4],
  arrowAlphaPost: [180, 0.9], arrowAlphaPre: [2000, 0.6],
  bgAlphaCommit: [1400, 1], bgAlphaCancel: [450, 1],
  vertical: [30000, 1], scaleCommit: [5700, 1],
};

const FINGER_OFFSET = 64;      // navigation_edge_finger_offset 64dp
const STATIC_THRESHOLD = 16;   // navigation_edge_action_drag_threshold 16dp
const PROGRESS_THRESHOLD = 412; // navigation_edge_action_progress_threshold 412dp
const RUBBERBAND = 15;         // BackPanelController rubberbandAmount
const EDGE_PANEL_H = 268;      // navigation_edge_panel_height

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

function snapToDims(d) {
  S.w.target = S.w.pos = d.w; S.h.target = S.h.pos = d.h;
  S.ec.target = S.ec.pos = d.ec; S.fc.target = S.fc.pos = d.fc;
  S.m.target = S.m.pos = d.m; S.s.target = S.s.pos = d.s;
  S.al.target = S.al.pos = d.al; S.ah.target = S.ah.pos = d.ah;
  S.aa.target = S.aa.pos = d.aa; S.ba.target = S.ba.pos = d.ba;
}

/** BackPanelController.updateYStartPosition：pill 顶 = touchY − fingerOffset(64)，钳屏内 */
function baseY(touchY) {
  return Math.max(EDGE_PANEL_H / 2, Math.min(window.innerHeight - EDGE_PANEL_H / 2, touchY - FINGER_OFFSET + 24));
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
    }
    if (state === 'ENTRY') {
      const p = Math.max(0, Math.min(1, xT / STATIC_THRESHOLD)); // staticThresholdProgress
      // stretchEntryBackIndicator：entry 基准 → preThreshold 目标（五维插值器各自驱动）
      S.w.target = DIMS.entry.w + E.entryWidth(p) * (DIMS.pre.w - DIMS.entry.w);
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
  /** 提交（committedIndicator：scale .86 spring 5700/1 + 背景 α→0 spring 1400/1） */
  commit() {
    if (!el || state === 'GONE') return;
    state = 'COMMITTED';
    S.s.set(...SPRING.scaleCommit); S.s.target = 0.86;
    S.ba.set(...SPRING.bgAlphaCommit); S.ba.target = 0;
    S.aa.target = 0;
    wake();
  },
  /** 取消（cancelledIndicator：宽→0 α→0 spring 450/1 弹回边缘） */
  cancel() {
    if (!el || state === 'GONE') return;
    state = 'CANCELLED';
    S.ba.set(...SPRING.bgAlphaCancel); S.ba.target = 0;
    S.aa.target = 0;
    S.w.target = 0;
    S.m.target = DIMS.entry.m;
    S.s.target = DIMS.entry.s;
    wake();
  },
  get state() { return state; },
};
