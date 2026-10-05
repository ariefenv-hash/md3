// ===== aosp-fastscroller.js =====
/**
 * ============================================================
 *  aosp-fastscroller.js
 *  android.widget.FastScroller 的忠实 JS 移植（AOSP main）
 *  ------------------------------------------------------------
 *  逐行对应核心逻辑：
 *  · getPosFromItemCount：无 section 时 firstVisible/(total-visible)，
 *    有 section 时按 section 插值 + 末项剩余空间修正
 *  · setThumbPos：thumbMiddle = pos × mThumbRange + mThumbOffset
 *  · 状态机 STATE_NONE/VISIBLE/DRAGGING，FADE_TIMEOUT=1500ms 自动隐藏，
 *    DURATION_FADE_IN=150 / FADE_OUT=300
 *  · onInterceptTouchEvent/onTouchEvent：TAP_TIMEOUT 延迟拖动判定、
 *    getPosFromMotionEvent、scrollTo 反馈
 *  平台依赖替换：ObjectAnimator/AnimatorSet → CSS transition + rAF 时间轴，
 *  ViewGroupOverlay → 覆盖 canvas/绝对定位元素
 * ============================================================
 */
'use strict';

const STATE_NONE = 0;
const STATE_VISIBLE = 1;
const STATE_DRAGGING = 2;

const DURATION_FADE_OUT = 300;
const DURATION_FADE_IN = 150;
const FADE_TIMEOUT = 1500;
const MIN_PAGES = 4;
const TAP_TIMEOUT = 100;   // ViewConfiguration.getTapTimeout()

/**
 * FastScroller 移植。宿主需提供：
 *   getCount() / getChildCount() / getFirstVisiblePosition()
 *   getChildAt(index) -> {top, height} / getHeight() / getPaddingTop/Bottom
 *   scrollToPosition(index) / requestDisallowInterceptTouchEvent(b)
 */
class FastScroller {
    constructor(host, opts = {}) {
        this.mList = host;
        this.mState = STATE_VISIBLE;
        this.mEnabled = opts.enabled !== false;
        this.mAlwaysShow = !!opts.alwaysShow;
        this.mLongList = false;
        this.mFirstVisibleItem = 0;
        this.mScrollCompleted = true;
        this.mPendingDrag = -1;
        this.mInitialTouchY = 0;
        this.mScaledTouchSlop = opts.touchSlop || 8;
        this.mMatchDragPosition = true;   // targetSdk >= HONEYCOMB
        this.mHeaderCount = 0;
        this.mSections = opts.sections || null;   // string[] 或 null
        this.mSectionIndexer = opts.sectionIndexer || null;

        // 布局参数（像素，对应 dimen 默认值）
        this.mMinimumTouchTarget = 48;
        this.mThumbMinWidth = opts.thumbWidth || 12;
        this.mThumbMinHeight = opts.thumbHeight || 48;
        this.mTrackWidth = opts.trackWidth || 4;
        this.mPreviewPadding = 16;
        this.mPreviewMinWidth = 64;
        this.mPreviewMinHeight = 64;

        // 容器几何（updateContainerRect）
        this.mContainerRect = { left: 0, top: 0, right: 0, bottom: 0 };
        this.mThumbOffset = 0;
        this.mThumbRange = 0;
        this.mWidth = Math.max(this.mThumbMinWidth, this.mTrackWidth);

        this.mLayoutFromRight = true;   // SCROLLBAR_POSITION_RIGHT

        // 视图代理（宿主填充实际 DOM/canvas 绘制句柄）
        this.views = {
            thumb: opts.thumbView || null,     // {style} 绝对定位元素
            track: opts.trackView || null,
            preview: opts.previewView || null, // {style, textContent}
        };
        this._hideTimer = 0;
        this._raf = null;
        this._thumbPos = 0;       // isPointInsideY 命中判定用（setThumbPos 同步）
        this._thumbMiddle = 0;
    }

    isEnabled() { return this.mEnabled && (this.mLongList || this.mAlwaysShow); }

    /** 对应 updateLongList：childCount>0 && itemCount/childCount >= MIN_PAGES */
    updateLongList(childCount, itemCount) {
        const longList = childCount > 0 && Math.floor(itemCount / childCount) >= MIN_PAGES;
        if (this.mLongList !== longList) {
            this.mLongList = longList;
            this.onStateDependencyChanged(false);
        }
    }

    onStateDependencyChanged(peekIfEnabled) {
        if (this.isEnabled()) {
            if (this.mAlwaysShow) this.setState(STATE_VISIBLE);
            else if (this.mState === STATE_VISIBLE) this.postAutoHide();
            else if (peekIfEnabled) { this.setState(STATE_VISIBLE); this.postAutoHide(); }
        } else {
            this.stop();
        }
    }

    stop() { this.setState(STATE_NONE); }

    setState(state) {
        clearTimeout(this._hideTimer);
        if (this.mAlwaysShow && state === STATE_NONE) state = STATE_VISIBLE;
        if (state === this.mState) return;
        switch (state) {
            case STATE_NONE: this.transitionToHidden(); break;
            case STATE_VISIBLE: this.transitionToVisible(); break;
            case STATE_DRAGGING: this.transitionToDragging(); break;
        }
        this.mState = state;
    }

    postAutoHide() {
        clearTimeout(this._hideTimer);
        this._hideTimer = setTimeout(() => this.setState(STATE_NONE), FADE_TIMEOUT);
    }

    /* ---- 动画（对应 transitionTo*，CSS transition 替身） ---- */
    _applyTransition(el, props, durationMs) {
        if (!el) return;
        el.style.transition = `opacity ${durationMs}ms, transform ${durationMs}ms`;
        Object.assign(el.style, props);
    }
    /* 合成 thumb transform 时保留纵向位置 —— 直接写 translateX 会抹掉 setThumbPos
       设置的 translateY，导致滑块在状态切换瞬间弹回顶部（松手时尤其明显） */
    _thumbTransform(x) {
        return `translateX(${x}px) translateY(${(this._thumbMiddle || 0) - this.mThumbMinHeight / 2}px)`;
    }
    transitionToHidden() {
        const { thumb, track, preview } = this.views;
        const off = this.mLayoutFromRight ? this.mWidth : -this.mWidth;
        this._applyTransition(thumb, { opacity: '0', transform: this._thumbTransform(off) }, DURATION_FADE_OUT);
        this._applyTransition(track, { opacity: '0', transform: `translateX(${off}px)` }, DURATION_FADE_OUT);
        this._applyTransition(preview, { opacity: '0' }, DURATION_FADE_OUT);
    }
    transitionToVisible() {
        const { thumb, track, preview } = this.views;
        this._applyTransition(thumb, { opacity: '1', transform: this._thumbTransform(0) }, DURATION_FADE_IN);
        this._applyTransition(track, { opacity: '1', transform: 'translateX(0px)' }, DURATION_FADE_IN);
        this._applyTransition(preview, { opacity: '0' }, DURATION_FADE_OUT);
    }
    transitionToDragging() {
        const { thumb, track, preview } = this.views;
        this._applyTransition(thumb, { opacity: '1', transform: this._thumbTransform(0) }, DURATION_FADE_IN);
        this._applyTransition(track, { opacity: '1', transform: 'translateX(0px)' }, DURATION_FADE_IN);
        this._applyTransition(preview, { opacity: '1' }, DURATION_FADE_IN);
    }

    /** 对应 onScroll（AbsListView.OnScrollListener） */
    onScroll(firstVisibleItem, visibleItemCount, totalItemCount) {
        if (!this.isEnabled()) { this.setState(STATE_NONE); return; }
        const hasMoreItems = totalItemCount - visibleItemCount > 0;
        if (hasMoreItems && this.mState !== STATE_DRAGGING) {
            this.setThumbPos(this.getPosFromItemCount(firstVisibleItem, visibleItemCount, totalItemCount));
        }
        this.mScrollCompleted = true;
        if (this.mFirstVisibleItem !== firstVisibleItem) {
            this.mFirstVisibleItem = firstVisibleItem;
            if (this.mState !== STATE_DRAGGING) {
                this.setState(STATE_VISIBLE);
                this.postAutoHide();
            }
        }
    }

    onItemCountChanged(childCount, itemCount) {
        this.updateLongList(childCount, itemCount);
        if (this.mState !== STATE_DRAGGING) {
            this.setThumbPos(this.getPosFromItemCount(
                this.mList.getFirstVisiblePosition(), childCount, itemCount));
        }
    }

    /**
     * 对应 getPosFromItemCount（无 section 路径 + 有 section 插值路径）
     */
    getPosFromItemCount(firstVisibleItem, visibleItemCount, totalItemCount) {
        if (visibleItemCount === 0 || totalItemCount === 0) return 0;
        const hasSections = this.mSectionIndexer && this.mSections && this.mSections.length > 0;
        if (!hasSections || !this.mMatchDragPosition) {
            if (visibleItemCount === totalItemCount) return 0;
            return firstVisibleItem / (totalItemCount - visibleItemCount);
        }
        // section 插值路径（简化：按 section 均匀分布，与 AOSP 一致的核心结构）
        firstVisibleItem -= this.mHeaderCount;
        if (firstVisibleItem < 0) return 0;
        totalItemCount -= this.mHeaderCount;
        const child = this.mList.getChildAt(0);
        const incrementalPos = (child && child.height > 0)
            ? (this.mList.getPaddingTop() - child.top) / child.height : 0;
        const sectionCount = this.mSections.length;
        const section = this.mSectionIndexer.getSectionForPosition(firstVisibleItem);
        const sectionPos = this.mSectionIndexer.getPositionForSection(section);
        const nextSectionPos = section < sectionCount - 1
            ? this.mSectionIndexer.getPositionForSection(section + 1) : totalItemCount - 1;
        const positionsInSection = Math.max(nextSectionPos - sectionPos, 1);
        const posWithinSection = (firstVisibleItem + incrementalPos - sectionPos) / positionsInSection;
        let result = (section + posWithinSection) / sectionCount;
        // 末项剩余空间修正（fake out the scroll bar for the last item）
        if (firstVisibleItem > 0 && firstVisibleItem + visibleItemCount === totalItemCount) {
            const lastChild = this.mList.getChildAt(visibleItemCount - 1);
            const bottomPadding = this.mList.getPaddingBottom();
            const maxSize = lastChild.height + (this.mList.getClipToPadding() ? 0 : bottomPadding);
            const currentVisibleSize = this.mList.getHeight() - lastChild.top
                - (this.mList.getClipToPadding() ? bottomPadding : 0);
            if (currentVisibleSize > 0 && maxSize > 0) {
                result += (1 - result) * (currentVisibleSize / maxSize);
            }
        }
        return result;
    }

    /** 对应 setThumbPos：thumbMiddle = pos × range + offset */
    setThumbPos(position) {
        this._thumbPos = position;   // 供 isPointInsideY 命中判定
        const thumbMiddle = position * this.mThumbRange + this.mThumbOffset;
        this._thumbMiddle = thumbMiddle;   // 供 transition* 合成 transform 时保留 translateY
        const thumbH = this.mThumbMinHeight;
        if (this.views.thumb) {
            this.views.thumb.style.transform =
                `translateY(${thumbMiddle - thumbH / 2}px)`;
        }
        // 预览气泡位置（OVERLAY_ABOVE_THUMB：贴滑块上方）
        if (this.views.preview) {
            const previewH = this.mPreviewMinHeight;
            const minP = this.mContainerRect.top + previewH / 2;
            const maxP = this.mContainerRect.bottom - previewH / 2;
            const previewMiddle = Math.min(Math.max(thumbMiddle, minP), maxP);
            this.views.preview.style.transform = `translateY(${previewMiddle - previewH / 2}px)`;
        }
    }

    /** 对应 updateOffsetAndRange（THUMB_POSITION_MIDPOINT：轨道两端各缩进半个滑块） */
    updateOffsetAndRange() {
        const halfThumb = this.mThumbMinHeight / 2;
        this.mThumbOffset = this.mContainerRect.top + halfThumb;
        this.mThumbRange = (this.mContainerRect.bottom - halfThumb) - this.mThumbOffset;
    }

    updateContainerRect() {
        const r = this.mContainerRect;
        r.left = 0; r.top = 0;
        r.right = this.mList.getWidth();
        r.bottom = this.mList.getHeight();
    }

    layout() {
        this.updateContainerRect();
        this.updateOffsetAndRange();
    }

    /** 对应 getPosFromMotionEvent */
    getPosFromMotionEvent(y) {
        if (this.mThumbRange <= 0) return 0;
        return Math.min(Math.max((y - this.mThumbOffset) / this.mThumbRange, 0), 1);
    }

    /** 对应 scrollTo：由宿主把 pos 换算为列表位置 */
    scrollTo(position) {
        this.mScrollCompleted = false;
        const count = this.mList.getCount();
        let index;
        if (this.mSectionIndexer && this.mSections && this.mSections.length > 1) {
            const sectionCount = this.mSections.length;
            const exactSection = Math.min(Math.max((position * sectionCount) | 0, 0), sectionCount - 1);
            index = this.mSectionIndexer.getPositionForSection(exactSection);
        } else {
            index = Math.min(Math.max((position * count) | 0, 0), count - 1);
        }
        this.mList.scrollToPosition(index);
        this.mScrollCompleted = true;
    }

    /* ---- 触摸（对应 onInterceptTouchEvent / onTouchEvent） ---- */
    isPointInside(x, y) {
        return this.isPointInsideX(x) && this.isPointInsideY(y);
    }
    isPointInsideX(x) {
        const w = this.mList.getWidth();
        return x >= w - Math.max(this.mWidth, this.mMinimumTouchTarget);
    }
    isPointInsideY(y) {
        const thumbTop = this.mThumbOffset + this._thumbPos * this.mThumbRange - this.mThumbMinHeight / 2;
        const adjust = Math.max(0, this.mMinimumTouchTarget - this.mThumbMinHeight) / 2;
        return y >= thumbTop - adjust && y <= thumbTop + this.mThumbMinHeight + adjust;
    }

    onTouchEvent(action, x, y) {
        if (!this.isEnabled()) return false;
        switch (action) {
            case 'down':
                if (this.isPointInside(x, y)) {
                    this.mInitialTouchY = y;
                    this.startPendingDrag();
                    return true;
                }
                return false;
            case 'move':
                if (this.mPendingDrag >= 0 && Math.abs(y - this.mInitialTouchY) > this.mScaledTouchSlop) {
                    this.beginDrag();
                }
                if (this.mState === STATE_DRAGGING) {
                    const pos = this.getPosFromMotionEvent(y);
                    this._thumbPos = pos;
                    this.setThumbPos(pos);
                    if (this.mScrollCompleted) this.scrollTo(pos);
                    return true;
                }
                return this.mPendingDrag >= 0;
            case 'up':
                if (this.mPendingDrag >= 0) {
                    this.beginDrag();
                    const pos = this.getPosFromMotionEvent(y);
                    this._thumbPos = pos;
                    this.setThumbPos(pos);
                    this.scrollTo(pos);
                }
                if (this.mState === STATE_DRAGGING) {
                    this.setState(STATE_VISIBLE);
                    this.postAutoHide();
                    return true;
                }
                return false;
            case 'cancel':
                this.cancelPendingDrag();
                return false;
        }
        return false;
    }

    startPendingDrag() { this.mPendingDrag = Date.now() + TAP_TIMEOUT; }
    cancelPendingDrag() { this.mPendingDrag = -1; }
    beginDrag() {
        this.mPendingDrag = -1;
        this.setState(STATE_DRAGGING);
        this.mList.requestDisallowInterceptTouchEvent(true);
    }
}


export { FastScroller };
export { STATE_NONE, STATE_VISIBLE, STATE_DRAGGING };
