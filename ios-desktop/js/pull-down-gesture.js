// ==================== pull-down-gesture.js — 统一 Shade 手势系统（AOSP 17 ShadeScene 1:1） ====================
//
// v7.84 重写：弃左右双面板横滑旧方案（源码无此物），对齐 AOSP android17-release
// ShadeScene.kt / QuickSettingsScene.kt 的单面板两场景结构：
//   · 面板 = overlay(scrim) → canvas(打开滑入) → track(垂直场景轨)
//   · 场景轨 = Scenes.Shade（小头部 + QQS 2×2 + 通知）↔ Scenes.QuickSettings（大钟 + 亮度 + 全量磁贴）
//   · 顶部下拉 → 打开 Shade 场景；继续下拉 → 跟手展开 QS 场景（AOSP 同款两段连续手势）
//   · QS 场景顶部上滑 → 回 Shade 场景；Shade 场景上滑 → 收起面板
//   · 平板 ≥600px：split shade 双列，场景轨停用（CSS transform none !important）
//
// 保留体系：v7.59 过拉弹性带 / v7.81 壁纸实时模糊通道 / v7.82 磁贴 verticalSquish
// （源码 constrainSquishiness = 0.1 + expansion × 0.9，由面板开合进度驱动）
//
// v7.86 两项线上实测修复：
//   · 状态栏随 Shade expansion 渐隐（AOSP PhoneStatusBarViewController 同构）——
//     此前状态栏 z 900 恒亮悬浮于面板（z 850）之上，宽屏 Shade 全开时与 QS 大钟叠印
//   · 面板手势提交后吞掉尾随 click（AOSP onInterceptTouchEvent 同构）——
//     上滑收起终点落在通知卡上时，浏览器合成 click 误开应用

import { state } from './state.js';
import { dom } from './dom.js';
// v7.46 统一动效编排器：曲线令牌（gentle/emphasized）+ 速度倍率时长
import { dur, after, cssEase } from './motion.js';
// v7.81 壁纸实时模糊：面板拖拽进度实时驱动预烘焙模糊层（全局开关在 desktop-blur 内部判定）
import { setPanelBlurProgress, tweenPanelBlurProgress } from './desktop-blur.js';

// ---------- v7.82 QS 磁贴高度 squish（源码 verticalSquish + constrainSquishiness） ----------
// AOSP android17-release：Tile.kt verticalSquish 把 squishiness 作用在磁贴【布局高度】上
// （非 transform，内容居中）；驱动源 QSFragmentComposeViewModel.constrainSquishiness：
//   (0.1 + expansion × 0.9).coerceIn(0, 1) —— 下限 0.1 防过小视觉伪影（源码注释同义）。
// web 落地：--qs-squish 自定义属性 → .qs-tile-pill height: calc(72px × var) —— 真实布局
// 高度缩放，网格随拖拽逐帧压缩（源码同构）；开/合/回弹走同幅补间（与 blur 补间对齐）。

/**
 * 面板展开进度 → 磁贴高度 squish（源码公式逐字对齐；纯函数导出供测试）
 * @param {number} expansion 面板展开进度 0..1（越拉越 >1 时钳回 1，同源码 coerce）
 * @returns {number} squish ∈ [0.1, 1]
 */
export function qsSquishFromExpansion(expansion) {
  const v = 0.1 + expansion * 0.9;
  if (Number.isNaN(v)) return 1;
  return Math.min(1, Math.max(0.1, v));
}

function getShadePanel() {
  return document.getElementById('pullPanelsTrack');
}

function setQsSquish(value) {
  const panel = getShadePanel();
  if (panel) panel.style.setProperty('--qs-squish', value.toFixed(4));
}

let squishRafId = 0;
let squishTweenToken = 0;

function stopSquishTween() {
  squishTweenToken++;
  if (squishRafId) {
    cancelAnimationFrame(squishRafId);
    squishRafId = 0;
  }
}

/** cubic-bezier(0.2,0,0,1)（Material standard = 源码 spring(1.0,400) 归一化形）采样 */
function bezierStandard(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const x1 = 0.2, y1 = 0, x2 = 0, y2 = 1;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sampleX = (u) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u) => ((ay * u + by) * u + cy) * u;
  let u = t;
  for (let i = 0; i < 8; i++) {
    const e = sampleX(u) - t;
    if (Math.abs(e) < 1e-5) break;
    const d = sampleDX(u);
    if (Math.abs(d) < 1e-6) break;
    u -= e / d;
  }
  return sampleY(u);
  function sampleDX(x) { return (3 * ax * x + 2 * bx) * x + cx; }
}

/** rAF 补间磁贴 squish（对齐 blur tween 模式） */
export function tweenQsSquish(target, durationMs = 300) {
  const panel = getShadePanel();
  if (!panel) return;
  const from = parseFloat(panel.style.getPropertyValue('--qs-squish')) || 1;
  const token = ++squishTweenToken; // ++ 即作废旧动画（旧 step 首帧自退）
  if (squishRafId) {
    cancelAnimationFrame(squishRafId);
    squishRafId = 0;
  }
  if (Math.abs(from - target) < 0.001) {
    setQsSquish(target);
    return;
  }
  const t0 = performance.now();
  squishRafId = requestAnimationFrame(function step() {
    if (token !== squishTweenToken) return;
    const p = Math.min(1, (performance.now() - t0) / durationMs);
    setQsSquish(from + (target - from) * bezierStandard(p));
    if (p < 1) squishRafId = requestAnimationFrame(step);
  });
}

// ---------- v7.86 状态栏随 Shade expansion 渐隐（AOSP PhoneStatusBarViewController 同构） ----------
// AOSP：Shade/QS 展开时状态栏内容透明度由 expansion 驱动渐隐，顶部信息区交给 Shade
// 头部（ShadeHeaderController 时钟/日期）。此前 web 版状态栏（z 900）恒亮悬浮于
// 统一 Shade 面板（z 850）之上，宽屏 Shade 全开时与 QS 场景大钟/日期叠印。
// 纯函数导出供测试；DOM 应用点：拖拽跟手（applyPanelVisual 逐帧）与开/关/回弹补间。

/**
 * Shade 展开进度 → 状态栏透明度（纯函数导出供测试）
 * @param {number} expansion 面板展开进度 0..1（NaN 防御回退 1）
 * @returns {number} 状态栏 alpha ∈ [0, 1]：expansion 0 → 1（全显），≥1 → 0（全隐）
 */
export function statusBarAlphaFromExpansion(expansion) {
  if (Number.isNaN(expansion)) return 1;
  const p = Math.min(1, Math.max(0, expansion));
  return 1 - p;
}

function getStatusBar() {
  return document.getElementById('statusBar');
}

/** 拖拽跟手帧：禁过渡逐帧写 alpha（与面板 blur/squish 通道同相位） */
function applyStatusBarShadeFade(expansion) {
  const bar = getStatusBar();
  if (!bar) return;
  bar.style.transition = 'none';
  bar.style.opacity = statusBarAlphaFromExpansion(expansion).toFixed(3);
  bar.style.pointerEvents = expansion > 0.5 ? 'none' : '';
}

/** 开/关/回弹补间：与面板同曲线（emphasized）同幅过渡 */
function tweenStatusBarShadeFade(hide, durationMs) {
  const bar = getStatusBar();
  if (!bar) return;
  bar.style.transition = `opacity ${durationMs}ms ${cssEase('emphasized')}`;
  bar.style.opacity = hide ? '0' : '1';
  bar.style.pointerEvents = hide ? 'none' : '';
}

/** 收场清理：摘除内联样式，交还 CSS 默认（opacity 1 + .22s ease） */
function resetStatusBarShadeFade() {
  const bar = getStatusBar();
  if (!bar) return;
  bar.style.transition = '';
  bar.style.opacity = '';
  bar.style.pointerEvents = '';
}

// ---------- v7.86 面板手势提交后吞掉尾随 click（AOSP onInterceptTouchEvent 同构） ----------
// 现场复现：Shade 场景上滑收起、手指终点落在通知卡上 → closePullPanels 提交后浏览器
// 合成的 click 命中 .noti-card → 关面板同时误开应用。AOSP 中面板拖拽由父级
// onInterceptTouchEvent 接管后子 View 不再收到该手势的 click；web 同构 = 手势提交
// （开/场景切换/收起/回弹四路径）后在捕获阶段吞掉紧随而至的一次 click。
let panelClickSwallowUntil = 0;

/** 吞掉紧随面板手势提交而至的下一次 click（400ms 窗口，一次性） */
function suppressTrailingClick() {
  panelClickSwallowUntil = performance.now() + 400;
}

function initPanelClickSwallow() {
  document.addEventListener('click', (e) => {
    if (performance.now() > panelClickSwallowUntil) return;
    panelClickSwallowUntil = 0; // 一次性：只吞提交手势后紧跟的那一次
    e.stopPropagation();
    e.preventDefault();
  }, true);
}

// ---------- 手势状态 ----------
let isPanelPulling = false;      // 顶部下拉（面板未开 → 开）
let isSceneDragging = false;     // 场景轨拖拽（面板已开，Shade ↔ QS）
let isVerticalDismissing = false; // 上滑收起
let isClosingAnimation = false;
// fix(P3)：状态栏单击快捷展开的时间戳 —— pointer 链展开面板后，随后到达的 click
// 事件不得再触发一次关闭（见状态栏 click 处理器）
let statusTapOpenedAt = 0;

let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let startTime = 0;
let lastMoveTime = 0;
let velocityX = 0;
let velocityY = 0;
let hasSignificantMovement = false;

// 场景进度：0 = Shade 场景（通知优先），1 = QS 场景（全量磁贴）
let sceneProgress = 0;
// 拖拽期间面板已满开的标记（下拉两段连续手势：第二段驱动场景轨）
let pullReachedFull = false;

// ---------- 元素引用缓存（结构性元素不随磁贴重建；断链时自动重查） ----------
let overlayElCache = null;
let canvasElCache = null;
let trackElCache = null;

function getOverlay() {
  if (!overlayElCache || !overlayElCache.isConnected) {
    overlayElCache = document.getElementById('pullPanelsOverlay');
  }
  return overlayElCache;
}
function getCanvas() {
  if (!canvasElCache || !canvasElCache.isConnected) {
    canvasElCache = document.getElementById('pullPanelsCanvas');
  }
  return canvasElCache;
}
function getTrack() {
  if (!trackElCache || !trackElCache.isConnected) {
    trackElCache = document.getElementById('pullPanelsTrack');
  }
  return trackElCache;
}

// ---------- 打开/收起视觉按帧合并（结束时 flush，防末帧丢失/与收尾动画抢写） ----------
let panelVisualRafId = 0;
let pendingPanelVisual = null;

function applyPanelVisual(v) {
  const overlay = getOverlay();
  const canvas = getCanvas();
  if (!overlay || !canvas) return;
  overlay.style.opacity = v.overlayOpacity.toFixed(3);
  // v7.81 壁纸实时模糊：拖拽/过拉/上滑收起的每一帧都把 overlay 进度同步给模糊层
  //（跟手渐进；全局开关关闭时内部自动 no-op）
  setPanelBlurProgress(v.overlayOpacity);
  // v7.86 状态栏渐隐：跟手帧同步（AOSP status bar alpha 由 expansion 驱动）
  applyStatusBarShadeFade(v.overlayOpacity);
  // v7.82 QS 磁贴高度 squish：拖拽途中逐帧跟手（源码 verticalSquish 由 expansion 驱动同构）
  stopSquishTween();
  setQsSquish(qsSquishFromExpansion(v.overlayOpacity));
  const style = v.unit === '%' ? `translate3d(0, ${v.offset.toFixed(1)}%, 0)` : `translate3d(0, ${v.offset.toFixed(1)}px, 0)`;
  canvas.style.transform = style;
  canvas.style.transition = 'none';
}

function schedulePanelVisual(v) {
  pendingPanelVisual = v;
  if (panelVisualRafId) return;
  panelVisualRafId = requestAnimationFrame(() => {
    panelVisualRafId = 0;
    const vis = pendingPanelVisual;
    pendingPanelVisual = null;
    if (vis) applyPanelVisual(vis);
  });
}

function flushPanelVisual() {
  if (panelVisualRafId) {
    cancelAnimationFrame(panelVisualRafId);
    panelVisualRafId = 0;
  }
  const vis = pendingPanelVisual;
  pendingPanelVisual = null;
  if (vis) applyPanelVisual(vis);
}

// ---------- 场景轨跟手（rAF 合帧；flush 供松手收尾从真实位置起跳） ----------
let sceneRafId = 0;
let pendingSceneProgress = 0;
let sceneTweenToken = 0;

function applySceneVisual(progress) {
  sceneProgress = progress;
  const track = getTrack();
  if (!track) return;
  // 平板 split（CSS transform none !important）自动免疫；拖拽中禁用 transition
  track.style.transition = 'none';
  track.style.transform = `translate3d(0, ${(-50 * progress).toFixed(3)}%, 0)`;
}

function scheduleSceneVisual(progress) {
  pendingSceneProgress = progress;
  if (sceneRafId) return;
  sceneRafId = requestAnimationFrame(() => {
    sceneRafId = 0;
    applySceneVisual(pendingSceneProgress);
  });
}

function flushSceneVisual() {
  if (sceneRafId) {
    cancelAnimationFrame(sceneRafId);
    sceneRafId = 0;
  }
  applySceneVisual(pendingSceneProgress);
}

/**
 * v7.59 过拉弹性带（rubber-band）：下拉超过满开阈值后，面板继续跟手但带渐进阻力，
 * 渐近封顶 48px —— Android 14/iOS 通知栏同款手感。
 * 纯函数导出供测试；松手后由 openPullPanel/closePullPanels 的既有过渡从 flushed
 * 真实位置起跳回弹（flushPanelVisual 保证无跳变）。
 * @param {number} dy 当前下拉位移（px）
 * @param {number} thresholdPx 满开阈值（px）
 * @returns {number} 过拉偏移量（px），≤ 阈值时为 0，渐近上限 48
 */
export function overPullOffset(dy, thresholdPx) {
  const over = dy - thresholdPx;
  if (over <= 0) return 0;
  return Math.round(48 * (1 - Math.exp(-over / 140)) * 10) / 10;
}

/** 判断统一 Shade 当前是否处于激活或拖拽状态（供底层应用或桌面屏蔽操作） */
export function isPullPanelsActive() {
  const overlay = getOverlay();
  return !!(
    isPanelPulling ||
    isSceneDragging ||
    isVerticalDismissing ||
    isClosingAnimation ||
    (overlay && overlay.classList.contains('active'))
  );
}

/** 场景切换补间（松手结算/程序化切换共用）：track transition 由 CSS 承担 */
function tweenScene(target, durationMs = 320) {
  const track = getTrack();
  if (!track) return;
  const token = ++sceneTweenToken; // ++ 即作废旧补间（同帧 CSS transition 竞态免疫，rAF 逐帧）
  if (sceneRafId) {
    cancelAnimationFrame(sceneRafId);
    sceneRafId = 0;
  }
  const from = sceneProgress;
  const clamped = Math.min(1, Math.max(0, target));
  if (Math.abs(from - clamped) < 0.001) {
    applySceneVisual(clamped);
    return;
  }
  const t0 = performance.now();
  requestAnimationFrame(function step() {
    if (token !== sceneTweenToken) return;
    const p = Math.min(1, (performance.now() - t0) / durationMs);
    applySceneVisual(from + (clamped - from) * bezierStandard(p));
    if (p < 1) requestAnimationFrame(step);
  });
}

/** 磁贴网格自愈体检（打开面板时检查两个容器） */
function ensureTilesRendered() {
  const tilesEl = document.getElementById('qsTilesContainer');
  if (tilesEl && tilesEl.children.length === 0) {
    import('./quick-settings.js').then((m) => {
      if (document.getElementById('qsTilesContainer')?.children.length === 0) {
        m.renderQuickSettingsGrid();
      }
    }).catch(() => {});
  }
}

/** 初始化统一 Shade 手势 */
export function initPullDownGesture() {
  const overlay = getOverlay();
  const canvas = getCanvas();
  const track = getTrack();
  if (!overlay || !canvas || !track) return;

  // v7.86：手势提交后吞尾随 click（捕获阶段一次性拦截，见上方说明）
  initPanelClickSwallow();

  // 1. 点击空白区域直接退出（支持背景遮罩与面板内空白区域）
  overlay.addEventListener('click', (e) => {
    if (isVerticalDismissing || isSceneDragging || isPanelPulling || isClosingAnimation) return;
    if (hasSignificantMovement) return;

    // 如果点击的是面板内部的具体交互控件（卡片、按钮、滑块、磁贴等），不触发空白退出
    const isInteractive = e.target.closest(
      '.noti-card, .qs-tile, .qs-slider-bar, .noti-media-card, .noti-footer-btn, .qs-action-btn, button, input, .edit-tiles-view, .qs-media-card'
    );
    if (!isInteractive) {
      closePullPanels();
    }
  });

  // 2. 状态栏点击快捷展开/收起
  document.querySelectorAll('.status-bar, .app-window-status-bar').forEach(bar => {
    bar.addEventListener('click', (e) => {
      // fix(P3)：单击状态栏面板已被 pointer 链（零位移释放 → openPullPanel）展开，
      // 此处不再立即关闭；旧链路 pointerup 走 closePullPanels → isClosingAnimation
      // 保持 260ms → click 命中 isPullPanelsActive() 再关一次 → 面板永远打不开
      if (performance.now() - statusTapOpenedAt < 450) return;
      if (isPullPanelsActive()) {
        closePullPanels();
      } else {
        openPullPanel(0); // 统一 Shade：任意 x 位置打开 Shade 场景（源码无左右分区）
      }
    });
  });

  // 3. 核心物理手势监听：PointerDown
  window.addEventListener('pointerdown', (e) => {
    // fix(audit-A): 锁屏期间屏蔽下拉手势 —— 锁屏层(z 98000)盖住面板(z 850)
    if (document.body.classList.contains('is-locked')) return;
    if (state.iconDragState) return;
    const editView = document.getElementById('editTilesView');
    if (editView && editView.classList.contains('open')) return;

    const isOverlayOpen = overlay.classList.contains('active');

    startX = e.clientX;
    startY = e.clientY;
    currentX = e.clientX;
    currentY = e.clientY;
    startTime = performance.now();
    lastMoveTime = startTime;
    velocityX = 0;
    velocityY = 0;
    hasSignificantMovement = false;
    pullReachedFull = false;

    // 情况 A：面板未打开，从屏幕顶部 (y <= 55px) 下拉
    if (!isOverlayOpen && e.clientY <= 55) {
      isPanelPulling = true;
      canvas.classList.add('dragging');
      overlay.classList.add('active');
      overlay.style.opacity = '0';
      return;
    }

    // 情况 B：面板已打开（场景轨拖拽/上滑收起判定在 move 中按方向分流）
    if (isOverlayOpen) {
      // 避免干扰滑块拖动与输入框
      if (e.target.closest('.qs-slider-bar') || e.target.closest('input') || e.target.closest('.media-progress-track')) {
        return;
      }
      isSceneDragging = false;
      isVerticalDismissing = false;
      // v7.84 场景轨非整位落定：上一手势中断/鼠标悬空 move 遗留的中间态，
      // 按下瞬间落定到最近场景（否则 move 方向分流以 atShadeScene/atQsScene
      // 判定会拿非整位基线，三个分支全不进 → 手势死锁（E2E 实锤 -42.842% 冻结））
      if (sceneProgress > 0.001 && sceneProgress < 0.999) {
        tweenScene(Math.round(sceneProgress), 200);
      }
    }
  }, { passive: true });

  // 4. 核心物理手势监听：PointerMove
  window.addEventListener('pointermove', (e) => {
    // 无活跃交互时早退（速度状态由 pointerdown 重置，不影响后续手势采样）
    if (!isPanelPulling && !isSceneDragging && !isVerticalDismissing &&
        !(overlay.classList.contains('active'))) return;

    const now = performance.now();
    const dt = Math.max(1, now - lastMoveTime);
    velocityX = (e.clientX - currentX) / dt;
    velocityY = (e.clientY - currentY) / dt;
    lastMoveTime = now;

    currentX = e.clientX;
    currentY = e.clientY;
    const screenH = window.innerHeight;
    const isOverlayOpen = overlay.classList.contains('active');

    const totalDist = Math.hypot(currentX - startX, currentY - startY);
    if (totalDist > 6) {
      hasSignificantMovement = true;
    }

    // 1. 顶部下拉（两段连续：0.38H 前开面板；满开后继续下拉驱动场景轨 0→1）
    if (isPanelPulling) {
      const dy = Math.max(0, currentY - startY);
      const thresholdPx = screenH * 0.38;
      const sceneRangePx = screenH * 0.42;

      if (dy <= thresholdPx) {
        // 段一：面板滑入（v7.59 弹性带不再适用——此处未满开，无过拉）
        const progress = Math.min(1, dy / thresholdPx);
        const translateY = -100 + progress * 100;
        schedulePanelVisual({ overlayOpacity: progress, unit: '%', offset: translateY });
      } else {
        // 段二：面板满开 + 场景轨跟手（继续下拉 → QS 场景展开）
        pullReachedFull = true;
        const over = overPullOffset(dy - sceneRangePx, 0);
        const sceneTarget = Math.min(1, (dy - thresholdPx) / sceneRangePx);
        // 过拉仅作用于面板层（渐近 48px），场景轨钳在 1
        schedulePanelVisual({ overlayOpacity: 1, unit: 'px', offset: over });
        scheduleSceneVisual(over > 0 ? 1 : sceneTarget);
      }
      return;
    }

    // 2. 面板已打开：方向分流（场景切换 / 上滑收起）
    if (isOverlayOpen && !e.target.closest('.qs-slider-bar') && !e.target.closest('input') && !e.target.closest('.media-progress-track')) {
      const dy = currentY - startY;
      const notiScroll = document.getElementById('notiPanelScroll');
      const qsInnerScroll = document.getElementById('qsInnerScroll');

      if (!isSceneDragging && !isVerticalDismissing) {
        const atShadeScene = sceneProgress < 0.5;
        const atQsScene = sceneProgress >= 0.5;
        // v7.86（SplitShade 同构）：≥600px 分家模式双列常显、场景轨渲染停用（CSS
        // transform none !important），sceneProgress 仅剩内部记账意义 —— 上滑必须
        // 全局收起面板（AOSP split 无场景语义，VerticalExpandContainerSpec 上滑
        // = dismiss，与起手在通知列/磁贴列无关）。此前拖拽开面板的 fling 落定
        // QS 场景后，通知列上滑被 !closest('#shadeColumn') 守卫吞掉 → 面板
        // 收不起、终点卡 click 误开应用（第三方体检 E2E 双实锤）。
        // 滚区守卫：起手在可继续下滚的滚区中段时先滚动内容，到底后继续上滑才收起。
        const splitShade = window.matchMedia('(min-width: 600px)').matches;
        const canScrollDown = (el) => !!el && el.scrollTop + el.clientHeight < el.scrollHeight - 2;
        if (dy > 5 && atShadeScene) {
          // Shade 场景向下：QQS/header 区或通知滚区在顶 → 展开 QS 场景
          const fromScrolableTop = !e.target.closest('#notiPanelScroll') ||
            (notiScroll && notiScroll.scrollTop <= 0);
          if (fromScrolableTop && !e.target.closest('.qs-column')) {
            isSceneDragging = true;
            track.classList.add('dragging');
          }
        } else if (dy < -5 && (splitShade || atQsScene)) {
          if (splitShade) {
            const inQsScroll = e.target.closest('#qsInnerScroll');
            const inNotiScroll = e.target.closest('#notiPanelScroll');
            if ((!inQsScroll || !canScrollDown(inQsScroll)) &&
                (!inNotiScroll || !canScrollDown(inNotiScroll))) {
              isVerticalDismissing = true;
            }
          } else {
            // 窄屏 QS 场景向上：磁贴滚区在顶 → 收回 Shade 场景
            const fromScrollTop = !e.target.closest('#qsInnerScroll') ||
              (qsInnerScroll && qsInnerScroll.scrollTop <= 0);
            if (fromScrollTop && !e.target.closest('#shadeColumn')) {
              isSceneDragging = true;
              track.classList.add('dragging');
            }
          }
        } else if (dy < -5 && atShadeScene && Math.abs(dy) > Math.abs(currentX - startX) * 0.4) {
          // Shade 场景向上：收起面板
          isVerticalDismissing = true;
        }
      }

      // 场景轨跟手（Shade→QS：dy 正驱动；QS→Shade：dy 负驱动；基线 = 起手时场景）
      if (isSceneDragging) {
        const dragProgress = dy / (screenH * 0.5);
        const base = sceneProgress >= 0.5 ? 1 : 0;
        // 起手瞬间 sceneProgress 仍为旧值：以第一帧方向锁定基准
        const baseLocked = (dragProgress >= 0) && dy > 0 ? 0 : (dy < 0 ? 1 : base);
        const next = Math.min(1, Math.max(0, baseLocked + dragProgress));
        scheduleSceneVisual(next);
        return;
      }

      // 上滑实时跟手收起
      if (isVerticalDismissing && dy < 0) {
        const progress = Math.max(0, 1 + dy / (screenH * 0.4));
        schedulePanelVisual({ overlayOpacity: progress, unit: 'px', offset: dy * 1.08 });
      }
    }
  }, { passive: true });

  // 5. 核心物理手势监听：PointerUp / Cancel / TouchCancel
  const handlePointerEnd = (e) => {
    // v7.38：pointercancel / touchcancel = 浏览器把手势判给原生滚动（或系统打断）。
    // 语义是「取消」而非「释放」—— 绝不走提交结算：统一回弹复位。
    if (e && (e.type === 'pointercancel' || e.type === 'touchcancel')) {
      if (isPanelPulling) {
        isPanelPulling = false;
        canvas.classList.remove('dragging');
        flushPanelVisual();
        closePullPanels(); // 下拉进行中被系统夺走：静默归位收起
        return;
      }
      if (isSceneDragging) {
        isSceneDragging = false;
        track.classList.remove('dragging');
        flushSceneVisual();
        tweenScene(Math.round(sceneProgress)); // 回弹最近场景
        return;
      }
      if (isVerticalDismissing) {
        isVerticalDismissing = false;
        flushPanelVisual();
        restorePanelVisual(); // 回弹全屏态，绝不提交收起
      }
      return;
    }

    // 结束下拉
    if (isPanelPulling) {
      isPanelPulling = false;
      canvas.classList.remove('dragging');
      flushPanelVisual(); // 先落最后一帧，再从真实视觉位接续开/收动画
      const dy = currentY - startY;

      if (pullReachedFull) {
        // 已进入段二：面板必开，按场景进度/速度结算目标场景
        suppressTrailingClick(); // v7.86：拖拽提交，吞掉落点元素的尾随 click
        const flungDown = velocityY > 0.9;
        const targetScene = (sceneProgress > 0.5 || (flungDown && sceneProgress > 0.05)) ? 1 : 0;
        openPullPanel(targetScene);
        return;
      }
      if (dy > 50 || velocityY > 0.35) {
        suppressTrailingClick(); // v7.86：拖拽提交，吞掉落点元素的尾随 click
        openPullPanel(0);
      } else if (!hasSignificantMovement && dy <= 6) {
        // fix(P3)：零位移按下-释放就是「单击」→ 直接展开而非收起；
        // 同时压制随后 click 事件在状态栏上的二次收起（见 statusTapOpenedAt）
        statusTapOpenedAt = performance.now();
        openPullPanel(0);
      } else {
        closePullPanels();
      }
      return;
    }

    // 结束场景轨拖拽
    if (isSceneDragging) {
      isSceneDragging = false;
      track.classList.remove('dragging');
      flushSceneVisual();
      const dy = currentY - startY;
      const flung = Math.abs(velocityY) > 0.35;
      // 速度方向优先：向下甩 → QS；向上甩 → Shade；否则按进度过半结算
      let target;
      if (flung && velocityY > 0 && sceneProgress < 0.98) target = 1;
      else if (flung && velocityY < 0 && sceneProgress > 0.02) target = 0;
      else target = Math.round(sceneProgress);
      suppressTrailingClick(); // v7.86：场景轨拖拽提交，吞掉落点磁贴/通知卡的尾随 click
      tweenScene(target);
      if (target !== Math.round(sceneProgress) || flung) {
        if (navigator.vibrate) navigator.vibrate(12);
      }
      return;
    }

    // 结束上滑收起：滑动程度足够则关闭，不足则自动执行回弹动画恢复，绝不卡住！
    if (isVerticalDismissing) {
    if (typeof window !== 'undefined') (window.__dbg3 = window.__dbg3 || []).push(['v-commit', 'dy=' + (currentY - startY).toFixed(0), 'vel=' + velocityY.toFixed(2), 'move=' + hasSignificantMovement]);
      isVerticalDismissing = false;
      flushPanelVisual();
      const dy = currentY - startY;
      const upwardSpeed = -velocityY; // 向上速度

      // 判定阈值：滑动距离足够 (dy < -60) 或 向上快速甩动 (upwardSpeed > 0.35)
      const shouldClose = dy < -60 || upwardSpeed > 0.35 || (dy < -30 && upwardSpeed > 0.18);

      if (shouldClose) {
        suppressTrailingClick(); // v7.86：收起提交，吞掉终点通知卡的尾随 click（误开应用实锤修复）
        closePullPanels();
      } else {
        // 滑动程度不够：回弹恢复全屏态（与取消路径共用）
        suppressTrailingClick(); // v7.86：拖拽发生过，回弹同样吞尾随 click
        restorePanelVisual();
      }
    }
  };

  window.addEventListener('pointerup', handlePointerEnd, { passive: true });
  window.addEventListener('pointercancel', handlePointerEnd, { passive: true });
  window.addEventListener('touchcancel', handlePointerEnd, { passive: true });
}

/**
 * 打开统一 Shade 并落到指定场景
 * @param {number} scene 0 = Shade 场景（通知优先），1 = QS 场景（全量磁贴）
 */
export function openPullPanel(scene = 0) {
  const overlay = getOverlay();
  const canvas = getCanvas();
  if (!overlay || !canvas) return;

  isClosingAnimation = false;
  isVerticalDismissing = false;
  isSceneDragging = false;

  overlay.classList.add('active');
  overlay.style.opacity = '1';
  overlay.style.transition = `opacity ${dur(280)}ms ${cssEase('emphasized')}`;
  // v7.81：模糊从当前拖拽进度（状态栏点击时为 0）补间到全模糊，与面板入场同幅
  tweenPanelBlurProgress(1, dur(300));
  // v7.82：磁贴 squish 从当前进度补间到全展开（1），与面板入场同幅
  tweenQsSquish(1, dur(300));
  // v7.86：状态栏随面板展开淡出（AOSP 同构；拖拽路径已在 applyPanelVisual 逐帧写）
  tweenStatusBarShadeFade(true, dur(280));

  canvas.style.transform = 'translate3d(0, 0, 0)';
  canvas.style.transition = `transform ${dur(300)}ms ${cssEase('gentle')}`;

  // 场景落位（打开手势段二跟手中途松手时，从当前进度补间到目标）
  tweenScene(scene, 320);

  // v7.59 内容入场编排：通知卡片/快捷磁贴错峰浮升
  // （原生 Android 13+ 同款；backwards 填充保证 delay 期间不可见；尊重减弱动态）
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.classList.remove('enter-stagger');
    void canvas.offsetWidth; // 强制重排：连续两次打开也能重放入场
    canvas.classList.add('enter-stagger');
    after(620, () => canvas.classList.remove('enter-stagger'));
  }

  // v7.47：面板内容自愈 —— 磁贴网格由 JS 启动期构建，若此前初始化链路被异常打断，
  // 打开面板时体检重建（动态导入避免与 quick-settings 的循环依赖）
  ensureTilesRendered();

  after(310, () => {
    canvas.style.transition = '';
    overlay.style.transition = '';
    const bar = getStatusBar();
    if (bar) bar.style.transition = ''; // v7.86：补间完归还 CSS 默认 transition（opacity 保持 0）
  });

  if (navigator.vibrate) navigator.vibrate(25);
}

/** 场景切换（保留旧导出名作兼容 shim：0 = Shade 场景，1 = QS 场景） */
export function switchPullPanel(scene) {
  tweenScene(scene, 280);
  if (navigator.vibrate) navigator.vibrate(15);
}

/** 上滑收起未达阈值 / 手势被取消：面板平滑回弹恢复全屏态（两路径共用） */
function restorePanelVisual() {
  const overlay = getOverlay();
  const canvas = getCanvas();
  // v7.46：曲线令牌统一（gentle 微过冲浮升）+ 速度倍率缩放
  canvas.style.transition = `transform ${dur(280)}ms ${cssEase('gentle')}`;
  canvas.style.transform = 'translate3d(0, 0, 0)';
  if (overlay) {
    overlay.style.transition = `opacity ${dur(240)}ms ${cssEase('emphasized')}`;
    overlay.style.opacity = '1';
  }
  // v7.81：回弹恢复全屏态，模糊层同步补间回全模糊
  tweenPanelBlurProgress(1, dur(240));
  // v7.82：磁贴 squish 同步补间回全展开
  tweenQsSquish(1, dur(240));
  // v7.86：状态栏同步保持全隐（面板仍在全屏态）
  tweenStatusBarShadeFade(true, dur(240));
  after(290, () => {
    canvas.style.transition = '';
    canvas.style.transform = '';
    if (overlay) {
      overlay.style.transition = '';
      overlay.style.opacity = '';
    }
    const bar = getStatusBar();
    if (bar) bar.style.transition = ''; // v7.86：归还默认 transition（opacity 保持 0）
  });
}

/** 关闭统一 Shade 并保证彻底清理状态（场景轨复位到 Shade） */
export function closePullPanels() {
  const overlay = getOverlay();
  const canvas = getCanvas();
  if (!overlay || !canvas) return;

  isClosingAnimation = true;
  // v7.46：曲线令牌统一（emphasized 强调收场）+ 速度倍率缩放
  canvas.style.transition = `transform ${dur(260)}ms ${cssEase('emphasized')}`;
  canvas.style.transform = 'translate3d(0, -100%, 0)';
  overlay.style.transition = `opacity ${dur(250)}ms ${cssEase('emphasized')}`;
  overlay.style.opacity = '0';
  // v7.81：面板收场，模糊层同步补间回清晰
  tweenPanelBlurProgress(0, dur(250));
  // v7.82：磁贴 squish 同步压回闭合态（0.1，源码 constrainSquishiness 下限）
  tweenQsSquish(qsSquishFromExpansion(0), dur(250));
  // v7.86：状态栏随面板收场淡回全显
  tweenStatusBarShadeFade(false, dur(250));

  after(260, () => {
    overlay.classList.remove('active');
    overlay.style.opacity = '';
    overlay.style.transition = '';
    canvas.style.transform = '';
    canvas.style.transition = '';
    // 场景轨复位 Shade（无动画瞬时归位）
    sceneProgress = 0;
    const track = getTrack();
    if (track) {
      track.style.transition = 'none';
      track.style.transform = 'translate3d(0, 0, 0)';
    }
    isClosingAnimation = false;
    isPanelPulling = false;
    isVerticalDismissing = false;
    isSceneDragging = false;
    pullReachedFull = false;
    resetStatusBarShadeFade(); // v7.86：内联样式全清，交还 CSS 默认全显
  });
}
