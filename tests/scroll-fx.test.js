// ==================== scroll-fx.test.js — AOSP 滚动体验集成回归（Stretch + FastScroller） ====================
//
// 覆盖（scroll-fx.js 全局集成纪律）：
//   · 容器增强幂等（__scrollFx 标记）
//   · 长列表自动创建 FastScroller 覆盖层（sticky overlay + track/thumb）
//   · 边缘外拉 engage：EdgeEffect.onPullDistance 驱动 + 容器 scale 拉伸
//   · 松手 → onRelease → 弹簧回弹后 transform 清除
//   · 宿主手势占用中（BOTTOM 上滑关应用）不 engage（防 renderSubPages 互写）
//   · FastScroller thumb 命中消费（down 返回 true → 拖拽滚动直跳）
//   · 滚动事件驱动 thumb 位置与自动隐藏
//
// 注：PULL 态 draw() 恒返回 true（需要持续动画直到松手）——帧泵必须逐帧有界，
//     禁止"排空队列"式驱动；回弹收敛用假定时器推进（AnimationUtils 读 performance.now）。

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { state } from '../ios-desktop/js/state.js';
import {
  enhanceScrollContainer,
  getScrollFxInstances,
} from '../ios-desktop/js/scroll-fx.js';

/** 构造可滚动容器替身：happy-dom 无真实布局，几何全部显式 stub */
function makeContainer({ scrollHeight = 8000, clientHeight = 800, clientWidth = 400 } = {}) {
  const el = document.createElement('div');
  el.className = 'app-page';
  document.body.appendChild(el);
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(el, 'scrollTop', {
    configurable: true, value: 0, writable: true,
  });
  el.getBoundingClientRect = () => ({
    left: 0, top: 0, right: clientWidth, bottom: clientHeight,
    width: clientWidth, height: clientHeight, x: 0, y: 0,
  });
  return el;
}

function pointerEvent(type, opts = {}) {
  return new PointerEvent(type, {
    pointerId: 1, pointerType: 'touch', button: 0, bubbles: true,
    clientX: 100, clientY: 400, timeStamp: performance.now(),
    ...opts,
  });
}

describe('scroll-fx 容器增强', () => {
  let rafQ;
  beforeEach(() => {
    rafQ = [];
    // 有界帧泵：每帧手动推进（PULL 态 draw 恒 active，队列永远非空）
    vi.stubGlobal('requestAnimationFrame', (cb) => { rafQ.push(cb); return rafQ.length; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
    vi.useFakeTimers({ toFake: ['performance', 'setTimeout', 'clearTimeout'] });
    state.isDragging = false;
    state.popInProgress = false;
    state.gestureType = 'NONE';
    // 子页弹簧已落定（hostGestureBusy 判定之一）
    state.subpageSpring.x = state.subpageSpring.target = 1;
    state.subpageSpring.v = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** 推进一帧（rAF 回调 + 16.7ms 假时间） */
  const frame = () => {
    if (!rafQ.length) return;
    const cb = rafQ.shift();
    vi.advanceTimersByTime(16.7);
    cb(performance.now());
  };
  /** 推进至边缘效果收敛（有界，600 帧上限 ≈ 10s 假时间） */
  const settleEdge = (fx) => {
    for (let i = 0; i < 600 && !fx.edgeTop.isFinished(); i++) frame();
    for (let i = 0; i < 600 && !fx.edgeBottom.isFinished(); i++) frame();
    frame();
  };

  it('增强幂等：同一容器重复 enhance 返回 null', () => {
    const el = makeContainer();
    const fx1 = enhanceScrollContainer(el);
    const fx2 = enhanceScrollContainer(el);
    expect(fx1).not.toBeNull();
    expect(fx2).toBeNull();
    fx1.destroy();
    expect(getScrollFxInstances()).toHaveLength(0);
  });

  it('长列表自动创建 FastScroller 覆盖层（sticky overlay + track/thumb）', () => {
    const el = makeContainer();   // 8000px 内容 / 800px 视口 = 10 屏 ≥ 4
    const fx = enhanceScrollContainer(el);
    const overlay = el.querySelector('.md-fastscroller');
    expect(overlay).not.toBeNull();
    expect(el.querySelector('.md-fs-track')).not.toBeNull();
    expect(el.querySelector('.md-fs-thumb')).not.toBeNull();
    expect(fx.fastScroller.mLongList).toBe(true);
    fx.destroy();
  });

  it('短列表不显示 thumb（AOSP MIN_PAGES 门控）', () => {
    const el = makeContainer({ scrollHeight: 1600 });   // 2 屏 < 4
    const fx = enhanceScrollContainer(el);
    expect(el.querySelector('.md-fastscroller')).not.toBeNull();   // 覆盖层在
    expect(fx.fastScroller.mLongList).toBe(false);
    expect(fx.fastScroller.isEnabled()).toBe(false);
    fx.destroy();
  });

  it('顶缘向下外拉 engage：拉伸距离累积 + 容器 scale(1, s>1)', () => {
    const el = makeContainer();
    const fx = enhanceScrollContainer(el);
    expect(el.scrollTop).toBe(0);

    el.dispatchEvent(pointerEvent('pointerdown', { clientY: 300 }));
    window.dispatchEvent(pointerEvent('pointermove', { clientY: 340 }));   // 手指下移 40px（外拉）
    expect(fx._pullEngaged).toBe(true);
    expect(fx.edgeTop.mDistance).toBeGreaterThan(0);
    frame();
    const t = el.style.transform;
    expect(t).toMatch(/^scale\(1,\s*1\.00/);
    expect(el.style.transformOrigin).toBe('0 0');
    expect(el.classList.contains('md-fx-pulling')).toBe(true);

    // 拉伸中反向拖：先消拉伸（对侧 onPullDistance 语义）
    window.dispatchEvent(pointerEvent('pointermove', { clientY: 320 }));
    expect(fx.edgeTop.mDistance).toBeLessThan(0.05);

    window.dispatchEvent(pointerEvent('pointerup', { clientY: 360 }));
    expect(fx.edgeTop.isFinished()).toBe(false);   // 进入 receede
    expect(el.classList.contains('md-fx-pulling')).toBe(false);
    fx.destroy();
  });

  it('未在边缘的正常拖动不 engage（原生滚动不受干扰）', () => {
    const el = makeContainer();
    el.scrollTop = 4000;   // 页面中部
    const fx = enhanceScrollContainer(el);
    el.dispatchEvent(pointerEvent('pointerdown', { clientY: 300 }));
    window.dispatchEvent(pointerEvent('pointermove', { clientY: 340 }));
    expect(fx._pullEngaged).toBe(false);
    expect(fx.edgeTop.isFinished()).toBe(true);
    window.dispatchEvent(pointerEvent('pointerup', { clientY: 360 }));
    fx.destroy();
  });

  it('宿主手势占用中（BOTTOM 拖拽）不 engage', () => {
    const el = makeContainer();
    const fx = enhanceScrollContainer(el);
    state.isDragging = true;
    state.gestureType = 'BOTTOM';
    el.dispatchEvent(pointerEvent('pointerdown', { clientY: 300 }));
    window.dispatchEvent(pointerEvent('pointermove', { clientY: 340 }));
    expect(fx._pullEngaged).toBe(false);
    window.dispatchEvent(pointerEvent('pointerup', { clientY: 360 }));
    fx.destroy();
  });

  it('松手回弹落定后 transform 清除（且绝不覆盖非拉伸 transform）', () => {
    const el = makeContainer();
    const fx = enhanceScrollContainer(el);
    el.dispatchEvent(pointerEvent('pointerdown', { clientY: 300 }));
    window.dispatchEvent(pointerEvent('pointermove', { clientY: 400 }));
    window.dispatchEvent(pointerEvent('pointerup', { clientY: 420 }));
    settleEdge(fx);
    expect(fx.edgeTop.isFinished()).toBe(true);
    expect(el.style.transform).toBe('');
    // 保护语义：renderSubPages 写入的卡片 transform 不会被清除
    el.style.transform = 'translate3d(12%, 0px, 0) scale(0.95)';
    frame();
    expect(el.style.transform).toBe('translate3d(12%, 0px, 0) scale(0.95)');
    el.style.transform = '';
    fx.destroy();
  });

  it('FastScroller thumb 命中消费（down=true）→ 拖拽滚动直跳', () => {
    const el = makeContainer();
    const fx = enhanceScrollContainer(el);
    fx.fastScroller.layout();
    fx.fastScroller.onScroll(0, Math.ceil(el.clientHeight / 56), Math.round(el.scrollHeight / 56));
    fx.fastScroller.setThumbPos(0);
    const thumbY = fx.fastScroller.mThumbOffset;
    const down = fx.fastScroller.onTouchEvent('down', el.clientWidth - 10, thumbY);
    expect(down).toBe(true);   // thumb 命中（ScrollFx 指针管线让位给滑动条）
    fx.destroy();
  });

  it('scroll 事件驱动 thumb 位置 + 惯性撞边吸收脉冲', () => {
    const el = makeContainer();
    const fx = enhanceScrollContainer(el);
    // 首次 scroll 建立基准速度：仅驱动 fastscroller
    el.scrollTop = 400;
    el.dispatchEvent(new Event('scroll'));
    expect(fx.fastScroller.mState).toBe(1);   // STATE_VISIBLE
    // 高速向上撞顶（直接注入 EMA 速度，验证吸收通道）
    fx._scrollV = -2000;
    el.scrollTop = 0;
    el.dispatchEvent(new Event('scroll'));
    expect(fx.edgeTop.isFinished()).toBe(false);   // absorb 脉冲注入
    fx.destroy();
  });
});
