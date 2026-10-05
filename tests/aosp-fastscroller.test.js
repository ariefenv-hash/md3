// ==================== aosp-fastscroller.test.js — AOSP FastScroller（滑动条）移植回归 ====================
//
// 覆盖（Issue #4「滑动条样式」附件 1:1 移植）：
//   · 长列表门控：updateLongList（≥4 屏才启用，AOSP MIN_PAGES）
//   · getPosFromItemCount：无 section 路径 firstVisible/(total-visible)
//   · setThumbPos：thumbMiddle = pos × range + offset → thumb transform 同步
//   · 状态机：STATE_VISIBLE 淡入 / FADE_TIMEOUT=1500ms 自动隐藏 / DRAGGING 保持
//   · 触摸：thumb 命中（含 48px 最小触摸目标）→ 拖拽 → scrollTo 直跳
//   · 轨道两端缩进半个滑块（updateOffsetAndRange，THUMB_POSITION_MIDPOINT）

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FastScroller, STATE_NONE, STATE_VISIBLE, STATE_DRAGGING } from '../ios-desktop/js/aosp/fast-scroller.js';

describe('FastScroller', () => {
  const W = 400, H = 800;
  const ITEM_H = 56;
  const TOTAL = 200;         // 200 行 ≈ 11200px ≈ 14 屏（长列表）
  let host, views, scrolledTo;

  const build = () => {
    host = {
      getCount: () => TOTAL,
      getChildCount: () => Math.ceil(H / ITEM_H),
      getFirstVisiblePosition: () => Math.round((views.scrollTop || 0) / ITEM_H),
      getChildAt: (i) => ({
        top: (Math.round((views.scrollTop || 0) / ITEM_H) + i) * ITEM_H - (views.scrollTop || 0),
        height: ITEM_H,
      }),
      getHeight: () => H,
      getWidth: () => W,
      getPaddingTop: () => 0,
      getPaddingBottom: () => 0,
      getClipToPadding: () => true,
      scrollToPosition: (i) => { scrolledTo = i; views.scrollTop = i * ITEM_H; },
      requestDisallowInterceptTouchEvent: () => {},
    };
    views = {
      scrollTop: 0,
      thumb: { style: {} },
      track: { style: {} },
      preview: null,
    };
    scrolledTo = null;
    return new FastScroller(host, {
      thumbView: views.thumb,
      trackView: views.track,
      touchSlop: 8,
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('长列表门控：≥4 屏启用、短列表停用（STATE_NONE）', () => {
    const fs = build();
    fs.updateLongList(Math.ceil(H / ITEM_H), TOTAL);   // 200 行 / 15 行 ≈ 13 ≥ 4
    expect(fs.mLongList).toBe(true);
    expect(fs.isEnabled()).toBe(true);

    const short = build();
    short.updateLongList(Math.ceil(H / ITEM_H), 30);   // 30 行 / 15 行 = 2 < 4
    expect(short.mLongList).toBe(false);
    expect(short.isEnabled()).toBe(false);
    short.onScroll(0, 15, 30);
    expect(short.mState).toBe(STATE_NONE);
  });

  it('getPosFromItemCount：first/(total-visible) 线性映射', () => {
    const fs = build();
    fs.layout();
    const visible = Math.ceil(H / ITEM_H);             // 15
    const p0 = fs.getPosFromItemCount(0, visible, TOTAL);
    const pMid = fs.getPosFromItemCount(90, visible, TOTAL);
    expect(p0).toBe(0);
    expect(pMid).toBeCloseTo(90 / (TOTAL - visible), 5);
  });

  it('setThumbPos：thumb translateY = middle − thumbH/2（中点锚定）', () => {
    const fs = build();
    fs.layout();
    fs.onScroll(0, Math.ceil(H / ITEM_H), TOTAL);
    fs.setThumbPos(0.5);
    const halfThumb = fs.mThumbMinHeight / 2;
    const expectedMiddle = 0.5 * fs.mThumbRange + fs.mThumbOffset;
    expect(views.thumb.style.transform).toBe(
      `translateY(${expectedMiddle - halfThumb}px)`,
    );
    // 轨道两端各缩进半个滑块
    expect(fs.mThumbOffset).toBe(halfThumb);
  });

  it('onScroll：滚动即 VISIBLE + 1500ms 无操作自动隐藏（AOSP FADE_TIMEOUT）', () => {
    const fs = build();
    fs.layout();
    fs.updateLongList(Math.ceil(H / ITEM_H), TOTAL);
    fs.onScroll(10, Math.ceil(H / ITEM_H), TOTAL);
    expect(fs.mState).toBe(STATE_VISIBLE);
    vi.advanceTimersByTime(1501);
    expect(fs.mState).toBe(STATE_NONE);
    // 隐藏态 thumb/track 已渐隐（transitionToHidden 写 opacity 0 + 移出位移）
    expect(views.thumb.style.opacity).toBe('0');
  });

  it('拖拽中不自动隐藏（STATE_DRAGGING 保持）', () => {
    const fs = build();
    fs.layout();
    fs.updateLongList(Math.ceil(H / ITEM_H), TOTAL);
    fs.onScroll(0, Math.ceil(H / ITEM_H), TOTAL);
    // thumb 中点命中（x 在右缘 48px 内、y 在 thumb 中段）
    fs.setThumbPos(0.5);
    const thumbY = fs.mThumbOffset + 0.5 * fs.mThumbRange;
    const consumed = fs.onTouchEvent('down', W - 10, thumbY);
    expect(consumed).toBe(true);
    expect(fs.mPendingDrag).toBeGreaterThan(0);
    // 越过 slop → 进入 DRAGGING
    vi.advanceTimersByTime(200);   // 超过 TAP_TIMEOUT 也仍可起拖（move 判定）
    fs.onTouchEvent('move', W - 10, thumbY + 30);
    expect(fs.mState).toBe(STATE_DRAGGING);
    // 拖拽期 onScroll 不改状态
    fs.onScroll(60, Math.ceil(H / ITEM_H), TOTAL);
    expect(fs.mState).toBe(STATE_DRAGGING);
  });

  it('拖拽 → scrollTo 直跳对应行', () => {
    const fs = build();
    fs.layout();
    fs.updateLongList(Math.ceil(H / ITEM_H), TOTAL);
    fs.onScroll(0, Math.ceil(H / ITEM_H), TOTAL);
    fs.setThumbPos(0);
    const thumbY = fs.mThumbOffset;
    fs.onTouchEvent('down', W - 10, thumbY);
    fs.onTouchEvent('move', W - 10, thumbY + fs.mThumbRange);   // 拖到底
    expect(scrolledTo).not.toBeNull();
    expect(scrolledTo).toBeGreaterThanOrEqual(TOTAL - Math.ceil(H / ITEM_H) - 2);
  });

  it('thumb 右缘最小触摸目标 48px（isPointInsideX）', () => {
    const fs = build();
    fs.layout();
    expect(fs.isPointInsideX(W - 47)).toBe(true);
    expect(fs.isPointInsideX(W - 49)).toBe(false);
  });

  it('transitionToDragging/Visible：CSS transition 时长对齐 AOSP（150/300ms）', () => {
    const fs = build();
    fs.layout();
    fs.transitionToVisible();
    expect(views.thumb.style.transition).toContain('150ms');
    fs.transitionToHidden();
    expect(views.thumb.style.transition).toContain('300ms');
  });
});
