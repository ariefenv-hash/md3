// ==================== scroll-fx.js — AOSP 滚动体验全局集成（Issue #4 采纳） ====================
//
// 把 Issue #4《滑动列表动画可以全局采用这个》附件的 AOSP 1:1 移植接入宿主滚动容器：
//   · OverScroller  — 原生 fling 物理可接管（保留原生滚动为主，惯性撞边做视觉吸收脉冲）
//   · EdgeEffect    — Android 12+ Stretch（拉伸）：边缘拖拽以顶/底边为锚点 scale 跟手，
//                     松手欠阻尼弹簧回弹（ω=24.657, ζ=0.98），fling 撞边 onAbsorb 注入
//   · EdgeGlow      — Android 11- Glow（光晕）备选模式（opts.edgeMode='glow'）
//   · FastScroller  — AOSP 滑动条：长列表（≥4 屏）右侧 thumb + 轨道，1500ms 自动隐藏、
//                     150/300ms 淡入淡出、48px 最小触摸目标、拖拽直跳滚动位置
//
// 接管策略（与原生滚动共存）：
//   · 垂直滚动保持原生动量滚动；仅在「已滚到边缘继续向外拉」时 engage 拉伸 ——
//     此时浏览器无原生滚动可执行、不会发 pointercancel，pointer 流完整
//   · touch/pen/mouse 统一走 pointer 事件；fling 撞边吸收由 scroll 事件测速触发
//   · 宿主手势系统占用量（BOTTOM 上滑关应用 / 子页返回弹簧飞行中）时禁用 engage，
//     杜绝与 renderSubPages 卡片 transform 的同帧互写
//   · prefers-reduced-motion：禁用拉伸/光晕（装饰性形变），FastScroller（功能性）保留

import { state } from './state.js';
import { OverScroller } from './aosp/overscroller.js';
import { EdgeEffect, EDGE_TYPE_STRETCH, EDGE_TYPE_NONE } from './aosp/edge-effect.js';
import { EdgeGlow } from './aosp/edge-glow.js';
import { FastScroller } from './aosp/fast-scroller.js';

// ---- 常量（对齐 demo SimpleScrollView 与 AOSP ViewConfiguration） ----
const DENSITY = 2.0;                 // 设备密度替身（demo 同款，friction/speed 缩放基准）
const TOUCH_SLOP = 8;                // 越过 slop 才算拉拽（FastScroller 同值）
const MIN_FLING_VEL = 50 * DENSITY;  // 松手最小 fling 速度 px/s
const MAX_FLING_VEL = 8000 * DENSITY;
const ITEM_H = 56;                   // FastScroller 虚拟行高（AOSP 列表行高量级）
const SCROLL_V_ABSORB = 900;         // scroll 事件撞边吸收速度阈值 px/s（惯性流）
const TRACK_RATIO = 0.85;            // 拉伸满行程 = 视口高 × 0.85（同子页返回映射）

const ENHANCE_SELECTOR = '.app-page, .panel-scroll, .theme-body';

const instances = new Set();
let initialized = false;

/** 宿主手势占用中：BOTTOM 上滑关应用 / 分屏退出 / 子页返回弹簧未落定 —— 让位不 engage
 *  v7.49：①EDGE 手势进行中同样让位 —— EDGE 子页预览写的是同一个 .app-page 的
 *  transform，两套 RAF 同帧互写曾造成「返回预览 ↔ 无手势态」反复横跳；
 *  ②开/关窗弹簧在途也让位（主窗口 render 循环同样写容器位姿） */
function hostGestureBusy() {
  if (state.isDragging) return true;
  if (state.popInProgress) return true;
  if (!state.subpageSpring.isSettled()) return true;
  if (!state.scaleSpring.isSettled() || !state.posSpring.isSettled()) return true;
  return false;
}

export class ScrollFx {
  /**
   * @param {HTMLElement} el 滚动容器（overflow-y:auto）
   * @param {{edgeMode?: 'stretch'|'glow', fastScroller?: boolean}} [opts]
   */
  constructor(el, opts = {}) {
    this.el = el;
    this.edgeMode = opts.edgeMode || 'stretch';
    this.useFastScroller = opts.fastScroller !== false;

    this.scroller = new OverScroller(DENSITY);
    this._rafPending = false;

    // ---- 边缘效果（stretch / glow 双模） ----
    this._initEdgeEffects();

    // ---- 指针状态 ----
    this._pointerId = null;
    this._startY = 0;
    this._lastY = 0;
    this._dragging = false;      // 越过 slop、edge 拉拽进行中
    this._pullEngaged = false;   // 已处于边缘外拉状态
    this._velTracker = { samples: [] };
    // v7.48：手指停住（不松手）不保持拉伸态 —— 拉伸只随单次滑动显示
    this._idleReleaseTimer = 0;

    // ---- scroll 测速（惯性撞边吸收） ----
    this._lastScrollTop = el.scrollTop;
    this._lastScrollT = 0;
    this._scrollV = 0;

    this._onScroll = () => this._handleScroll();
    this._onPointerDown = (e) => this._handlePointerDown(e);
    this._onPointerMove = (e) => this._handlePointerMove(e);
    this._onPointerUp = (e) => this._handlePointerUp(e, false);
    this._onPointerCancel = (e) => this._handlePointerUp(e, true);

    el.addEventListener('scroll', this._onScroll, { passive: true });
    el.addEventListener('pointerdown', this._onPointerDown);

    // ---- FastScroller（AOSP 滑动条） ----
    if (this.useFastScroller) this._initFastScroller();

    // ---- 尺寸自适应 ----
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this.layout());
      this._ro.observe(el);
    }
    this.layout();
  }

  _initEdgeEffects() {
    const reduced = typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const type = reduced ? EDGE_TYPE_NONE : (this.edgeMode === 'glow' ? 0 : EDGE_TYPE_STRETCH);
    if (this.edgeMode === 'glow' && !reduced) {
      // AOSP colorEdgeEffect 灰；深色面板可见性采用 demo 增强蓝（布局/动画逻辑不受影响）
      this.edgeTop = new EdgeGlow(0x8ab4f8);
      this.edgeBottom = new EdgeGlow(0x8ab4f8);
      this.edgeTop.mBlendMode = 'source-over';
      this.edgeBottom.mBlendMode = 'source-over';
      this.edgeTop.mColor = 0xAA8AB4F8;
      this.edgeBottom.mColor = 0xAA8AB4F8;
      this._glowCanvas = document.createElement('canvas');
      this._glowCanvas.className = 'md-fx-glow';
      Object.assign(this._glowCanvas.style, {
        position: 'sticky', top: '0', display: 'block', height: '0',
        zIndex: '6', pointerEvents: 'none',
      });
      this.el.appendChild(this._glowCanvas);
    } else {
      this.edgeTop = new EdgeEffect(type);
      this.edgeBottom = new EdgeEffect(type);
    }
  }

  _initFastScroller() {
    const el = this.el;
    // sticky 悬浮层：随 scrollport 钉在顶部、不随内容滚动、不产生滚动贡献
    // v7.49 重构：此层曾挂在内容末尾 + height:0，两个致命缺陷：
    // ①sticky 只「推迟离场」不「提前入场」，位于末尾意味着它永远钉不到视口顶 ——
    //   track/thumb 恒在内容末尾（视口外），FastScroller 自落地起从未可用；
    // ②内部 absolute 定位的 track(height=视口高) 溢出会计入祖先滚动区 ——
    //   每个增强容器被隐形撑出一个视口高的滚动余量，列表一甩到底视口全落在
    //   空白区（「列表太长、一滑就啥内容也没有」的全局根因）。
    //   现改为：首个子元素 + sticky top:0 + height:scrollport高 + 上下负 margin
    //   （上抵 padding-top、下抵自身高）—— 流内净占位归零、全程钉在视口顶、
    //   scrollHeight 回归真实内容高度，thumb 定位/命中与滚动容器精确对齐。
    const overlay = document.createElement('div');
    overlay.className = 'md-fastscroller';
    Object.assign(overlay.style, {
      position: 'sticky', top: '0', height: '0', zIndex: '6', pointerEvents: 'none',
    });
    const track = document.createElement('div');
    track.className = 'md-fs-track';
    Object.assign(track.style, {
      position: 'absolute', right: '2px', top: '0', width: '4px',
      borderRadius: '2px', background: 'rgba(154,160,166,0.25)',
      opacity: '0',
    });
    const thumb = document.createElement('div');
    thumb.className = 'md-fs-thumb';
    Object.assign(thumb.style, {
      position: 'absolute', right: '0', top: '0', width: '12px', height: '48px',
      borderRadius: '6px', background: 'rgba(154,160,166,0.7)',
      opacity: '0',
    });
    overlay.appendChild(track);
    overlay.appendChild(thumb);
    // v7.49：置于首个子元素之前 —— sticky top:0 才能从首帧起钉在视口顶
    //（末尾放置的 sticky 只能在滚过自身流内位置后约束，永远到不了顶）
    if (el.firstChild) el.insertBefore(overlay, el.firstChild);
    else el.appendChild(overlay);

    this._fsOverlay = overlay;
    this._fsTrack = track;
    this._fsThumb = thumb;

    this.fastScroller = new FastScroller({
      getCount: () => Math.round(Math.max(el.scrollHeight, 0) / ITEM_H),
      getChildCount: () => Math.ceil(Math.max(el.clientHeight, 1) / ITEM_H),
      getFirstVisiblePosition: () => Math.max(0, Math.round(el.scrollTop / ITEM_H)),
      getChildAt: (i) => ({
        top: (Math.round(el.scrollTop / ITEM_H) + i) * ITEM_H - el.scrollTop,
        height: ITEM_H,
      }),
      getHeight: () => el.clientHeight,
      getWidth: () => el.clientWidth,
      getPaddingTop: () => 0,
      getPaddingBottom: () => 0,
      getClipToPadding: () => true,
      scrollToPosition: (i) => {
        this.scroller.forceFinished(true);
        el.scrollTop = i * ITEM_H;
      },
      requestDisallowInterceptTouchEvent: () => {},
    }, {
      thumbView: thumb,
      trackView: track,
      // 长列表无字母分区：不启用预览气泡（AOSP 无 section 同样隐藏 preview）
      previewView: null,
      touchSlop: TOUCH_SLOP,
    });
    this.fastScroller.layout();
  }

  layout() {
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    if (!w || !h) return;
    if (this.edgeTop && this.edgeTop.setSize) {
      this.edgeTop.setSize(w, h);
      this.edgeBottom.setSize(w, h);
    }
    if (this._fsTrack) this._fsTrack.style.height = h + 'px';
    // v7.49：FastScroller 轨道层净占位归零 ——
    //   height = scrollport 高（clientHeight），margin-top 抵消容器 padding-top
    //   （把流内位置上提到 scrollport 顶），margin-bottom 抵消剩余占位。
    //   盒子全程贴在 scrollport 视区内，不再向 scrollHeight 贡献任何隐形余量。
    if (this._fsOverlay) {
      const pt = parseFloat(getComputedStyle(this.el).paddingTop) || 0;
      this._fsOverlay.style.height = h + 'px';
      this._fsOverlay.style.marginTop = -pt + 'px';
      this._fsOverlay.style.marginBottom = -(h - pt) + 'px';
    }
    if (this.fastScroller) this.fastScroller.layout();
    // 长列表判定（≥4 屏才显示 thumb，AOSP updateLongList）
    if (this.fastScroller) {
      const visible = Math.ceil(h / ITEM_H);
      const total = Math.round(this.el.scrollHeight / ITEM_H);
      this.fastScroller.updateLongList(visible, total);
      this.fastScroller.onScroll(Math.max(0, Math.round(this.el.scrollTop / ITEM_H)), visible, total);
    }
    if (this._glowCanvas) {
      const dpr = window.devicePixelRatio || 1;
      this._glowCanvas.width = w * dpr;
      this._glowCanvas.height = h * dpr;
      this._glowCanvas.style.height = h + 'px';
      this._glowCanvas.style.marginTop = -h + 'px'; // sticky 高 0 撑开画布
      this._glowCtx = this._glowCanvas.getContext('2d');
    }
  }

  // ==================== 指针管线 ====================

  _handlePointerDown(e) {
    if (this._pointerId !== null) return;      // 已在处理一手
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const rect = this.el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    // FastScroller 优先消费（对应 AbsListView 先派发给 FastScroller.onTouchEvent）
    this._fsDrag = false;
    if (this.fastScroller && this.fastScroller.onTouchEvent('down', px, py)) {
      this._pointerId = e.pointerId;
      this._fsDrag = true;
      try { this.el.setPointerCapture(e.pointerId); } catch (_) {}
      window.addEventListener('pointermove', this._onPointerMove, { passive: true });
      window.addEventListener('pointerup', this._onPointerUp, { passive: true });
      window.addEventListener('pointercancel', this._onPointerCancel, { passive: true });
      return;
    }
    this._pointerId = e.pointerId;
    this._startY = this._lastY = e.clientY;
    this._dragging = false;
    this._pullEngaged = false;
    this._disarmIdleRelease();   // v7.48：新手势起步，清上一手停住回弹计时
    this._velTracker.samples = [];
    this._velTracker.samples.push({ y: e.clientY, t: e.timeStamp });
    // stretch（API 31）：按下时捕住在途的边缘效果（onPullDistance(0) 语义）
    if (this.edgeMode === 'stretch' && this.edgeTop.onPullDistance) {
      const w = Math.max(1, this.el.clientWidth);
      if (!this.edgeTop.isFinished()) this.edgeTop.onPullDistance(0, px / w);
      if (!this.edgeBottom.isFinished()) this.edgeBottom.onPullDistance(0, 1 - px / w);
    }
    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    window.addEventListener('pointerup', this._onPointerUp, { passive: true });
    window.addEventListener('pointercancel', this._onPointerCancel, { passive: true });
  }

  _handleFastScrollerMove(e) {
    const rect = this.el.getBoundingClientRect();
    return this.fastScroller.onTouchEvent('move', e.clientX - rect.left, e.clientY - rect.top);
  }

  _handlePointerMove(e) {
    if (e.pointerId !== this._pointerId) return;
    if (this._fsDrag) { this._handleFastScrollerMove(e); return; }
    const y = e.clientY;
    const dy = this._lastY - y;   // 手指上移 → 内容上滚方向为正
    this._lastY = y;
    this._velTracker.samples.push({ y, t: e.timeStamp });
    const cutoff = e.timeStamp - 200;
    const s = this._velTracker.samples;
    while (s.length > 2 && s[0].t < cutoff) s.shift();

    if (!this._dragging) {
      if (Math.abs(y - this._startY) <= TOUCH_SLOP) return;
      this._dragging = true;
    }

    // v7.48：每次位移事件即视为「滑动进行中」，重置停住回弹计时（stretch 模式）
    if (this.edgeMode === 'stretch') this._armIdleRelease();

    const el = this.el;
    const range = Math.max(0, el.scrollHeight - el.clientHeight);
    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop >= range - 0.5;

    // 边缘外拉 engage：处于边缘且拖动方向朝外
    if (!this._pullEngaged) {
      if (hostGestureBusy()) return;               // 宿主手势占用中让位
      if ((atTop && dy < 0) || (atBottom && dy > 0)) {
        if (range > 0) {                            // 内容可滚才有边缘效果（OVER_SCROLL_IF_CONTENT_SCROLLS）
          this._pullEngaged = true;
          el.classList.add('md-fx-pulling');
        }
      }
      if (!this._pullEngaged) return;
    }

    const h = Math.max(1, el.clientHeight);
    if (dy === 0) return;

    if (this.edgeMode === 'stretch') {
      // 反向先消拉伸（API 31 对侧消耗，getDistance 判定）
      if (dy < 0 && this.edgeBottom.getDistance() !== 0) {
        this.edgeBottom.onPullDistance(dy / h, 0.5);
        return;
      }
      if (dy > 0 && this.edgeTop.getDistance() !== 0) {
        this.edgeTop.onPullDistance(-dy / h, 0.5);
        return;
      }
    }

    const displacedTop = el.scrollTop <= 0 && dy < 0;
    const displacedBottom = el.scrollTop >= range - 0.5 && dy > 0;
    if (displacedTop) {
      if (this.edgeMode === 'stretch' && this.edgeTop.onPullDistance) {
        this.edgeTop.onPullDistance(-dy / h, this._displacement(e));
      } else {
        this.edgeTop.onPull(dy / h, this._displacement(e));   // glow：向外拉 deltaDistance 取正
      }
      if (!this.edgeBottom.isFinished()) this.edgeBottom.onRelease();
    } else if (displacedBottom) {
      if (this.edgeMode === 'stretch' && this.edgeBottom.onPullDistance) {
        this.edgeBottom.onPullDistance(dy / h, this._displacement(e));
      } else {
        this.edgeBottom.onPull(-dy / h, 1 - this._displacement(e));
      }
      if (!this.edgeTop.isFinished()) this.edgeTop.onRelease();
    }
    this._ensureRaf();
  }

  _displacement(e) {
    const rect = this.el.getBoundingClientRect();
    return clamp01((e.clientX - rect.left) / Math.max(1, this.el.clientWidth));
  }

  // ==================== v7.48：停住回弹（stretch 只随单次滑动显示） ====================
  // AOSP 语义是拉伸保持到 onRelease（松手），但实测「按住不放拉伸永久钉屏」
  // 违背直觉（issue 用户明确要求）：手指停止移动 ≥140ms 即就地回弹，
  // 保持 _pullEngaged —— 手指再次移动可重新拉出。
  _armIdleRelease() {
    clearTimeout(this._idleReleaseTimer);
    this._idleReleaseTimer = setTimeout(() => {
      if (!this._pullEngaged) return;
      let released = false;
      if (this.edgeTop && !this.edgeTop.isFinished()) { this.edgeTop.onRelease(); released = true; }
      if (this.edgeBottom && !this.edgeBottom.isFinished()) { this.edgeBottom.onRelease(); released = true; }
      if (released) this._ensureRaf();
    }, 140);
  }

  _disarmIdleRelease() {
    clearTimeout(this._idleReleaseTimer);
    this._idleReleaseTimer = 0;
  }

  _handlePointerUp(e, cancelled) {
    if (e.pointerId !== this._pointerId) return;
    this._pointerId = null;
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerCancel);
    this.el.classList.remove('md-fx-pulling');
    if (this._fsDrag) {
      this._fsDrag = false;
      const rect = this.el.getBoundingClientRect();
      this.fastScroller.onTouchEvent(cancelled ? 'cancel' : 'up', e.clientX - rect.left, e.clientY - rect.top);
      return;
    }
    if (this._pullEngaged) {
      this._pullEngaged = false;
      this._dragging = false;
      this._disarmIdleRelease();
      this.edgeTop.onRelease();
      this.edgeBottom.onRelease();
      this._ensureRaf();
      return;
    }
    // 未 engage 边缘：惯性 fling 由原生滚动继续（物理归浏览器），仅快速滚动时
    // 用 OverScroller 精神补充撞边吸收（scroll 事件测速通道）。
    this._dragging = false;
  }

  // ==================== scroll 测速 → 惯性撞边吸收 ====================

  _handleScroll() {
    const el = this.el;
    const now = performance.now();
    if (this._lastScrollT) {
      const dt = Math.max(1, now - this._lastScrollT);
      const v = (el.scrollTop - this._lastScrollTop) / dt * 1000;   // px/s
      this._scrollV = this._scrollV * 0.7 + v * 0.3;                // EMA 平滑
    }
    this._lastScrollTop = el.scrollTop;
    this._lastScrollT = now;
    clearTimeout(this._scrollIdleTimer);
    this._scrollIdleTimer = setTimeout(() => { this._scrollV = 0; this._lastScrollT = 0; }, 120);

    const range = Math.max(0, el.scrollHeight - el.clientHeight);
    const v = this._scrollV;
    // 惯性撞边：顶部（v<0 表示向上滚）或底部（v>0 向下滚）瞬间注入吸收脉冲
    // v7.49：宿主手势/转场占用中不注入 —— 拉伸与预览位姿同元素互写的另一个入口
    if ((el.scrollTop <= 0 && v < -SCROLL_V_ABSORB) || (el.scrollTop >= range - 0.5 && v > SCROLL_V_ABSORB)) {
      const edge = el.scrollTop <= 0 ? this.edgeTop : this.edgeBottom;
      if (edge.isFinished() && !hostGestureBusy()) {
        edge.onAbsorb(Math.min(Math.abs(v), 4000) | 0);
        this._ensureRaf();
      }
    }

    // FastScroller 跟随滚动（AOSP OnScrollListener 通道）
    if (this.fastScroller) {
      const total = Math.round(el.scrollHeight / ITEM_H);
      const visible = Math.ceil(el.clientHeight / ITEM_H);
      const first = Math.max(0, Math.round(el.scrollTop / ITEM_H));
      this.fastScroller.onScroll(first, visible, total);
    }
  }

  // ==================== 渲染循环 ====================

  _ensureRaf() {
    if (this._rafPending) return;
    this._rafPending = true;
    requestAnimationFrame(() => { this._rafPending = false; this._frame(); });
  }

  _frame() {
    let active = false;
    // 边缘效果推进：stretch → receede 弹簧；glow → 状态机
    if (this.edgeTop && !this.edgeTop.isFinished()) { this.edgeTop.draw(); active = true; }
    if (this.edgeBottom && !this.edgeBottom.isFinished()) { this.edgeBottom.draw(); active = true; }
    this._renderEdge();
    if (active) this._ensureRaf();
    else this._renderEdgeClear();
  }

  _renderEdge() {
    const el = this.el;
    if (this.edgeMode === 'glow') { this._renderGlow(); return; }
    // v7.49：宿主手势/转场占用（EDGE 子页预览、页面栈切换、开/关窗弹簧）时，
    // 拉伸立即 finish 并清场让位 —— 旧实现只挡 engage 不挡在途回弹，回弹 RAF
    // 会把手势渲染刚写的预览位姿覆盖回 scale(1,sT)/空串，同帧互写即横跳
    if (hostGestureBusy()) {
      if (!this.edgeTop.isFinished()) this.edgeTop.finish();
      if (!this.edgeBottom.isFinished()) this.edgeBottom.finish();
      this._renderEdgeClear();
      return;
    }
    const dT = this.edgeTop.mDistance || 0, dB = this.edgeBottom.mDistance || 0;
    const sT = dT > 0 ? 1 + this.edgeTop.getStretch() : 1;
    const sB = dB > 0 ? 1 + this.edgeBottom.getStretch() : 1;
    if (sT > 1.0005 && sT >= sB) {
      el.style.transformOrigin = '0 0';
      el.style.transform = `scale(1, ${sT.toFixed(4)})`;
    } else if (sB > 1.0005) {
      el.style.transformOrigin = '0 100%';
      el.style.transform = `scale(1, ${sB.toFixed(4)})`;
    }
    // 落定态不主动清 transform：交由 _renderEdgeClear，避免与页面栈 transform 互写竞争
  }

  _renderEdgeClear() {
    const el = this.el;
    if (this.edgeMode === 'glow') {
      if (this._glowCtx) {
        const dpr = window.devicePixelRatio || 1;
        this._glowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this._glowCtx.clearRect(0, 0, this.el.clientWidth, this.el.clientHeight);
      }
      return;
    }
    // 仅当容器 transform 是我们写入的拉伸态时才清空（防止覆盖 renderSubPages 卡片位姿）
    if (el.style.transform && el.style.transform.startsWith('scale(1,')) {
      el.style.transform = '';
      el.style.transformOrigin = '';
    }
  }

  _renderGlow() {
    const ctx = this._glowCtx;
    if (!ctx) return;
    const el = this.el;
    const dpr = window.devicePixelRatio || 1;
    const w = el.clientWidth, h = el.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const scrollTop = el.scrollTop;
    const range = Math.max(0, el.scrollHeight - h);
    if (!this.edgeTop.isFinished()) {
      ctx.save();
      ctx.translate(0, Math.min(0, scrollTop));
      this.edgeTop.draw(ctx);
      ctx.restore();
    }
    if (!this.edgeBottom.isFinished()) {
      ctx.save();
      // AOSP ScrollView.draw：底边 = rotate(π) 后绘制（视口坐标等价式，demo 同款）
      ctx.translate(-w, Math.max(range, scrollTop) + h - scrollTop);
      ctx.translate(w, 0);
      ctx.rotate(Math.PI);
      ctx.translate(-w, 0);
      this.edgeBottom.draw(ctx);
      ctx.restore();
    }
  }

  destroy() {
    this.el.removeEventListener('scroll', this._onScroll);
    this.el.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerCancel);
    if (this._ro) this._ro.disconnect();
    clearTimeout(this._scrollIdleTimer);
    if (this._fsOverlay && this._fsOverlay.parentNode) this._fsOverlay.parentNode.removeChild(this._fsOverlay);
    if (this._glowCanvas && this._glowCanvas.parentNode) this._glowCanvas.parentNode.removeChild(this._glowCanvas);
    if (this.el.style.transform && this.el.style.transform.startsWith('scale(1,')) {
      this.el.style.transform = '';
      this.el.style.transformOrigin = '';
    }
    this.el.classList.remove('md-fx-pulling');
    this.el.__scrollFx = null;
    instances.delete(this);
  }
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

/** 增强单个容器（幂等） */
export function enhanceScrollContainer(el, opts = {}) {
  if (!el || el.__scrollFx) return null;
  const fx = new ScrollFx(el, opts);
  el.__scrollFx = fx;
  instances.add(fx);
  return fx;
}

/** 扫描并增强当前文档中所有匹配容器（幂等，可反复调用） */
export function enhanceAllScrollContainers(root = document) {
  if (typeof root.querySelectorAll !== 'function') return;
  root.querySelectorAll(ENHANCE_SELECTOR).forEach((el) => enhanceScrollContainer(el));
}

export function getScrollFxInstances() { return Array.from(instances); }

export function initScrollFx() {
  if (initialized) return;
  initialized = true;
  enhanceAllScrollContainers();
  // 应用实例 / 面板内容动态挂载：子树变更后补扫（幂等）
  const mo = new MutationObserver(() => enhanceAllScrollContainers());
  try {
    mo.observe(document.body, { childList: true, subtree: true });
  } catch (e) { /* 环境兜底：仅初始扫描 */ }
  // FastScroller 暴露给滚动条拖拽（FastScroller 内部已绑定容器 pointer 流，无需额外注册）
}
