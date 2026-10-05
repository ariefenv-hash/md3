// ==================== pull-down-gesture.js — 顶部左右分栏下拉与标签切换物理手势系统 ====================

import { state } from './state.js';
import { dom } from './dom.js';

let currentPanelIndex = 0; // 0: 通知中心, 1: 快速设置
let isPanelPulling = false;
let isHorizSwitching = false;
let isVerticalDismissing = false;
let isClosingAnimation = false;

let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let startTime = 0;
let lastMoveTime = 0;
let velocityX = 0;
let velocityY = 0;
let hasSignificantMovement = false;

// ---------- 元素引用缓存（结构性元素不随磁贴重建；断链时自动重查） ----------
let overlayElCache = null;
let sliderElCache = null;
let panelsCache = null;

function getOverlay() {
  if (!overlayElCache || !overlayElCache.isConnected) {
    overlayElCache = document.getElementById('pullPanelsOverlay');
    panelsCache = null;
  }
  return overlayElCache;
}
function getSlider() {
  if (!sliderElCache || !sliderElCache.isConnected) {
    sliderElCache = document.getElementById('pullPanelsSlider');
    panelsCache = null;
  }
  return sliderElCache;
}
function getPanels() {
  const slider = getSlider();
  if (!slider) return [];
  if (!panelsCache || panelsCache.some((p) => !p.isConnected)) {
    panelsCache = Array.from(slider.querySelectorAll('.pull-panel'));
  }
  return panelsCache;
}

// ---------- 拖拽视觉按帧合并（结束时 flush，防末帧丢失/与收尾动画抢写） ----------
let panelVisualRafId = 0;
let pendingPanelVisual = null;

function applyPanelVisual(v) {
  const overlay = getOverlay();
  if (!overlay) return;
  overlay.style.opacity = v.overlayOpacity.toFixed(3);
  const panels = getPanels();
  const style = v.unit === '%' ? `translate3d(0, ${v.offset.toFixed(1)}%, 0)` : `translate3d(0, ${v.offset.toFixed(1)}px, 0)`;
  panels.forEach((p) => {
    p.style.transform = style;
    p.style.transition = 'none';
  });
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

// slider 横向切换的按帧合并（同上，flush 供松手收尾动画从真实位置起跳）
let sliderRafId = 0;
let pendingSliderPercent = 0;

function flushSliderVisual() {
  if (sliderRafId) {
    cancelAnimationFrame(sliderRafId);
    sliderRafId = 0;
  }
  const slider = getSlider();
  if (slider) slider.style.transform = `translate3d(${pendingSliderPercent.toFixed(2)}%, 0, 0)`;
}

/** 判断下拉通知面板/状态栏当前是否处于激活或拖拽状态（供底层应用或桌面屏蔽操作） */
export function isPullPanelsActive() {
  const overlay = getOverlay();
  return !!(
    isPanelPulling ||
    isVerticalDismissing ||
    isHorizSwitching ||
    isClosingAnimation ||
    (overlay && overlay.classList.contains('active'))
  );
}

/** 初始化顶部下拉手势与面板滑动 */
export function initPullDownGesture() {
  const overlay = getOverlay();
  const slider = getSlider();
  if (!overlay || !slider) return;

  // 1. 点击空白区域直接退出（支持背景遮罩与面板内空白区域）
  overlay.addEventListener('click', (e) => {
    if (isVerticalDismissing || isHorizSwitching || isPanelPulling || isClosingAnimation) return;
    if (hasSignificantMovement) return;

    // 如果点击的是面板内部的具体交互控件（卡片、按钮、滑块、磁贴等），不触发空白退出
    const isInteractive = e.target.closest(
      '.noti-card, .qs-tile, .qs-slider-bar, .panel-tab-pill-bar, .noti-media-card, .noti-footer-btn, .qs-action-btn, button, input, .edit-tiles-view'
    );
    if (!isInteractive) {
      closePullPanels();
    }
  });

  // 2. 顶部双分栏快速 Tab 切换按钮
  document.querySelectorAll('.tab-btn-noti').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchPullPanel(0);
    });
  });

  document.querySelectorAll('.tab-btn-qs').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchPullPanel(1);
    });
  });

  // 3. 状态栏点击快捷展开/收起
  document.querySelectorAll('.status-bar, .app-window-status-bar').forEach(bar => {
    bar.addEventListener('click', (e) => {
      if (isPullPanelsActive()) {
        closePullPanels();
      } else {
        const x = e.clientX;
        const panelIdx = x < window.innerWidth / 2 ? 0 : 1;
        openPullPanel(panelIdx);
      }
    });
  });

  // 4. 核心物理手势监听：PointerDown
  window.addEventListener('pointerdown', (e) => {
    // fix(audit-A): 锁屏期间屏蔽下拉手势 —— 锁屏层(z 98000)盖住面板(z 850)，
    // 旧实现不检查 is-locked：锁屏时从顶部下拉会激活看不见的面板（overlay active +
    // opacity 1 全在锁屏之下），解锁后面板突然弹出；期间 isPullPanelsActive() 为真
    // 还会连带屏蔽桌面手势与其他模块的交互判定（实测确认）。
    if (document.body.classList.contains('is-locked')) return;
    if (state.iconDragState) return;
    const editView = document.getElementById('editTilesView');
    if (editView && editView.classList.contains('open')) return;

    const screenW = window.innerWidth;
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

    // 情况 A：面板未打开，从屏幕顶部 (y <= 55px) 下拉
    if (!isOverlayOpen && e.clientY <= 55) {
      isPanelPulling = true;
      currentPanelIndex = startX < screenW / 2 ? 0 : 1;
      setSliderPosition(currentPanelIndex, 0);

      slider.classList.add('dragging');
      overlay.classList.add('active');
      overlay.style.opacity = '0';
      updateTabButtons(currentPanelIndex);
      return;
    }

    // 情况 B：面板已打开
    if (isOverlayOpen) {
      // 避免干扰滑块拖动与输入框
      if (e.target.closest('.qs-slider-bar') || e.target.closest('input') || e.target.closest('.media-progress-track')) {
        return;
      }
      isHorizSwitching = false;
      isVerticalDismissing = false;
    }
  }, { passive: true });

  // 5. 核心物理手势监听：PointerMove
  window.addEventListener('pointermove', (e) => {
    // 无活跃交互时早退（速度状态由 pointerdown 重置，不影响后续手势采样）
    if (!isPanelPulling && !isHorizSwitching && !isVerticalDismissing &&
        !(overlay.classList.contains('active'))) return;

    const now = performance.now();
    const dt = Math.max(1, now - lastMoveTime);
    velocityX = (e.clientX - currentX) / dt;
    velocityY = (e.clientY - currentY) / dt;
    lastMoveTime = now;

    currentX = e.clientX;
    currentY = e.clientY;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const isOverlayOpen = overlay.classList.contains('active');

    const totalDist = Math.hypot(currentX - startX, currentY - startY);
    if (totalDist > 6) {
      hasSignificantMovement = true;
    }

    // 1. 顶部下拉过程跟随
    if (isPanelPulling) {
      const dy = Math.max(0, currentY - startY);
      const progress = Math.min(1, dy / (screenH * 0.38));
      const translateY = -100 + progress * 100;

      schedulePanelVisual({ overlayOpacity: progress, unit: '%', offset: translateY });
      return;
    }

    // 2. 面板已打开时的实时左右滑动与上下滑动
    if (isOverlayOpen && !e.target.closest('.qs-slider-bar') && !e.target.closest('input') && !e.target.closest('.media-progress-track')) {
      const dx = currentX - startX;
      const dy = currentY - startY;

      // 手势方向判定（超灵敏度响应左右滑动与上滑收起）
      if (!isHorizSwitching && !isVerticalDismissing) {
        if (Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy) * 0.6) {
          isHorizSwitching = true;
          slider.style.transition = 'none';
        } else if (dy < -5 && Math.abs(dy) > Math.abs(dx) * 0.4) {
          isVerticalDismissing = true;
        }
      }

      // 横向左右跟手滑动切换（通知中心 <-> 快速设置）
      if (isHorizSwitching) {
        const basePercent = -currentPanelIndex * 50;
        const dragPercent = (dx / screenW) * 50;
        // 边界弹性阻尼
        let totalPercent = basePercent + dragPercent;
        if (totalPercent > 0) totalPercent = totalPercent * 0.25;
        if (totalPercent < -50) totalPercent = -50 + (totalPercent + 50) * 0.25;

        // 高频 transform 写入走 rAF 合帧（slider 整层为合成器属性）
        if (!sliderRafId) {
          sliderRafId = requestAnimationFrame(() => {
            sliderRafId = 0;
            slider.style.transform = `translate3d(${pendingSliderPercent.toFixed(2)}%, 0, 0)`;
          });
        }
        pendingSliderPercent = totalPercent;
      }

      // 上滑实时跟手收起
      if (isVerticalDismissing && dy < 0) {
        const progress = Math.max(0, 1 + dy / (screenH * 0.4));
        schedulePanelVisual({ overlayOpacity: progress, unit: 'px', offset: dy * 1.08 });
      }
    }
  }, { passive: true });

  // 6. 核心物理手势监听：PointerUp / Cancel / TouchCancel
  const handlePointerEnd = (e) => {
    // v7.38：pointercancel / touchcancel = 浏览器把手势判给原生滚动（或系统打断）。
    // 语义是「取消」而非「释放」—— 绝不走提交结算：旧实现与 pointerup 同路径，
    // 慢速起手滚动时释放速度仍可能过阈值（>0.35）→ 面板被误收起。统一回弹复位。
    if (e && (e.type === 'pointercancel' || e.type === 'touchcancel')) {
      if (isPanelPulling) {
        isPanelPulling = false;
        const slider = getSlider();
        if (slider) slider.classList.remove('dragging');
        flushPanelVisual();
        closePullPanels(); // 下拉进行中被系统夺走：静默归位收起
        return;
      }
      if (isHorizSwitching) {
        isHorizSwitching = false;
        flushSliderVisual();
        setSliderPosition(currentPanelIndex, 240); // 回弹当前面板
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
      slider.classList.remove('dragging');
      flushPanelVisual(); // 先落最后一帧，再从真实视觉位接续开/收动画
      const dy = currentY - startY;

      if (dy > 50 || velocityY > 0.35) {
        openPullPanel(currentPanelIndex);
      } else {
        closePullPanels();
      }
      return;
    }

    // 结束横向左右切换
    if (isHorizSwitching) {
      isHorizSwitching = false;
      flushSliderVisual();
      const dx = currentX - startX;
      slider.style.transition = 'transform 260ms cubic-bezier(0.2, 0.95, 0.25, 1)';

      // 左滑切换到快速设置(1)，右滑切换到通知中心(0)
      if (currentPanelIndex === 0 && (dx < -28 || velocityX < -0.15)) {
        switchPullPanel(1);
      } else if (currentPanelIndex === 1 && (dx > 28 || velocityX > 0.15)) {
        switchPullPanel(0);
      } else {
        // 回弹至当前面板
        setSliderPosition(currentPanelIndex, 240);
      }
      return;
    }

    // 结束上滑收起：滑动程度足够则关闭，不足则自动执行回弹动画恢复，绝不卡住！
    if (isVerticalDismissing) {
      isVerticalDismissing = false;
      flushPanelVisual();
      const dy = currentY - startY;
      const upwardSpeed = -velocityY; // 向上速度

      // 判定阈值：滑动距离足够 (dy < -60) 或 向上快速甩动 (upwardSpeed > 0.35)
      const shouldClose = dy < -60 || upwardSpeed > 0.35 || (dy < -30 && upwardSpeed > 0.18);

      if (shouldClose) {
        closePullPanels();
      } else {
        // 滑动程度不够：回弹恢复全屏态（v7.38 抽取为 restorePanelVisual，与取消路径共用）
        restorePanelVisual();
      }
    }
  };

  window.addEventListener('pointerup', handlePointerEnd, { passive: true });
  window.addEventListener('pointercancel', handlePointerEnd, { passive: true });
  window.addEventListener('touchcancel', handlePointerEnd, { passive: true });
}

/** 打开指定分栏 (0: 通知中心, 1: 快速设置) */
export function openPullPanel(index = 0) {
  const overlay = getOverlay();
  const slider = getSlider();
  if (!overlay || !slider) return;

  isClosingAnimation = false;
  isVerticalDismissing = false;
  isHorizSwitching = false;
  currentPanelIndex = index;

  overlay.classList.add('active');
  overlay.style.opacity = '1';
  overlay.style.transition = 'opacity 280ms ease';

  const panels = getPanels();
  panels.forEach((p) => {
    p.style.transform = 'translate3d(0, 0, 0)';
    p.style.transition = 'transform 300ms cubic-bezier(0.18, 0.9, 0.2, 1.02)';
  });

  setSliderPosition(index, 300);
  updateTabButtons(index);

  setTimeout(() => {
    panels.forEach(p => {
      p.style.transition = '';
    });
    overlay.style.transition = '';
  }, 310);

  if (navigator.vibrate) navigator.vibrate(25);
}

/** 切换分栏 */
export function switchPullPanel(index) {
  currentPanelIndex = index;
  setSliderPosition(index, 280);
  updateTabButtons(index);
  if (navigator.vibrate) navigator.vibrate(15);
}

/** 更新顶部 Tab 按钮高亮 */
function updateTabButtons(index) {
  document.querySelectorAll('.tab-btn-noti').forEach(b => b.classList.toggle('active', index === 0));
  document.querySelectorAll('.tab-btn-qs').forEach(b => b.classList.toggle('active', index === 1));
}

/** 上滑收起未达阈值 / 手势被取消：面板平滑回弹恢复全屏态（v7.38 抽取，两路径共用） */
function restorePanelVisual() {
  const overlay = getOverlay();
  const panels = getPanels();
  panels.forEach((p) => {
    p.style.transition = 'transform 280ms cubic-bezier(0.18, 0.9, 0.2, 1.02)';
    p.style.transform = 'translate3d(0, 0, 0)';
  });
  if (overlay) {
    overlay.style.transition = 'opacity 240ms ease';
    overlay.style.opacity = '1';
  }
  setTimeout(() => {
    panels.forEach((p) => {
      p.style.transition = '';
      p.style.transform = '';
    });
    if (overlay) {
      overlay.style.transition = '';
      overlay.style.opacity = '';
    }
  }, 290);
}

/** 关闭下拉面板并保证彻底清理状态 */
export function closePullPanels() {
  const overlay = getOverlay();
  const slider = getSlider();
  if (!overlay || !slider) return;

  isClosingAnimation = true;
  const panels = getPanels();
  panels.forEach((p) => {
    p.style.transition = 'transform 260ms cubic-bezier(0.4, 0, 0.2, 1)';
    p.style.transform = 'translate3d(0, -100%, 0)';
  });
  overlay.style.transition = 'opacity 250ms ease';
  overlay.style.opacity = '0';

  setTimeout(() => {
    overlay.classList.remove('active');
    overlay.style.opacity = '';
    overlay.style.transition = '';
    panels.forEach((p) => {
      p.style.transform = '';
      p.style.transition = '';
    });
    isClosingAnimation = false;
    isPanelPulling = false;
    isVerticalDismissing = false;
    isHorizSwitching = false;
  }, 260);
}

function setSliderPosition(index, durationMs = 0) {
  const slider = getSlider();
  if (!slider) return;
  slider.style.transition = durationMs > 0 ? `transform ${durationMs}ms cubic-bezier(0.2, 0.95, 0.25, 1)` : 'none';
  slider.style.transform = `translate3d(${-index * 50}%, 0, 0)`;
}
