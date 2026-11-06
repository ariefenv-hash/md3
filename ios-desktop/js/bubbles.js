// ==================== bubbles.js — #91 Bubble 一期 DOM 板 ====================
//
// 一期范围（议题 #91 分期①，AOSP Bubbles 对标见 aosp/bubbles.js 头注）：
//   ① 气泡角标 —— 会话类通知（canBubble）投递后在屏缘（右缘）挂气泡入口，
//      与通知 Feed 单源对账（notifications-changed 驱动，进/出全走 reconcile）；
//   ② 点击展开为小窗 —— 复用 mini-window 引擎（enterMiniWindow 实例接管不重载，
//      fromRect 供胶囊展开动画取矩形）；再次点击收起（minimizeMiniWindow）；
//   ③ 展开期通知条目抑制 —— expanded ⇒ renderNotificationsList 过滤该条目
//      （isBubbleNotificationSuppressedFromShade 语义，避免双显），收起/移除即恢复。
// 边界裁决：
//   · 抑制由气泡自身 expanded 标志驱动（非小窗全局状态）：用户手动开的小窗不触发抑制；
//   · 小窗最小化/关闭/全屏接管（mini-window-changed active:false 或 maximized:true）
//     → 气泡收起（抑制解除）；气泡本体在通知仍存活期间保留（AOSP 同语义）；
//   · 通知从 Feed 移除（划掉/清除全部/远端删除）→ 气泡随之移除；
//   · snooze 只是隐藏条目，通知仍在 Feed —— 气泡保留（AOSP snooze ≠ remove）；
//   · 位置：未拖拽气泡按注册序沿右缘自上而下堆叠；拖拽落位（钳制后）不再参与重排；
//     resize 重排未拖拽气泡，拖拽过的保持原 y（钳入新视口）。
// 二期（气泡栈交换/展开成行/dismiss 区）三期（Bubble Bar）不在本板。

import { enterMiniWindow, minimizeMiniWindow } from './mini-window.js';
import { getNotifications, renderNotificationsList, resolveNotiIcon } from './notifications.js';
import {
  BUBBLE_SIZE,
  BUBBLE_EDGE_INSET,
  isBubbleable,
  isDragMovement,
  registerBubble,
  removeBubble,
  hasBubble,
  setExpanded,
  isExpanded,
  expandedIds,
  setBubbleY,
  bubbleY,
  reconcilePositions,
  bubbleCount,
  bubbleSnapshot,
} from './aosp/bubbles.js';

let layer = null;

/** 挂载层：fixed 右缘竖条容器（子项自身 fixed 定位，层只做分组/卸载语义） */
function ensureLayer() {
  if (layer && layer.isConnected) return layer;
  layer = document.createElement('div');
  layer.id = 'bubbleLayer';
  layer.setAttribute('data-test', 'bubble-layer');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:580;'; // 低于 mini-window(590)/pull-panels(850)
  document.body.appendChild(layer);
  return layer;
}

function badgeEl(notiId) {
  return layer ? layer.querySelector(`.bubble-badge[data-noti-id="${CSS.escape(notiId)}"]`) : null;
}

function applyPosition(el, y) {
  el.style.top = `${Math.round(y)}px`;
  el.style.right = `${BUBBLE_EDGE_INSET}px`;
}

/** 对账：Feed 单源 → 气泡增删/位置/展开态全量刷新（幂等，任意次序安全） */
export function renderBubbles() {
  const vh = window.innerHeight || 760;
  const feed = getNotifications();
  const eligible = feed.filter(isBubbleable);

  // ① 通知已从 Feed 消失 → 气泡移除（展开中移除 = 抑制同步解除）
  const feedIds = new Set(feed.map((n) => n.id));
  let structuralChange = false;
  bubbleSnapshot().forEach((b) => {
    if (!feedIds.has(b.id)) {
      removeBubble(b.id);
      structuralChange = true;
    }
  });

  // ② 新资格通知 → 注册（幂等）
  eligible.forEach((item) => {
    if (!hasBubble(item.id)) {
      registerBubble(item.id, item.appId, 0);
      structuralChange = true;
    }
  });

  reconcilePositions(vh);

  // ③ DOM 落地
  const root = ensureLayer();
  eligible.forEach((item) => {
    let el = badgeEl(item.id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'bubble-badge';
      el.dataset.notiId = item.id;
      el.dataset.appId = item.appId;
      el.dataset.test = 'bubble-badge';
      el.style.width = `${BUBBLE_SIZE}px`;
      el.style.height = `${BUBBLE_SIZE}px`;
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `气泡：${item.title || item.app || item.appId}（点击展开小窗）`);
      el.innerHTML = `<span class="bubble-badge__icon">${resolveNotiIcon(item)}</span>`;
      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(item.id); }
      });
      root.appendChild(el);
    }
    el.classList.toggle('bubble-badge--expanded', isExpanded(item.id));
    applyPosition(el, bubbleY(item.id));
  });

  // ④ Feed 中已不合格/消失的气泡 DOM 移除（直接对账层内现存元素——注册表先行删除后
  //    快照已不含被移除 id，按 DOM 现存集合反向比对才无漏）
  root.querySelectorAll('.bubble-badge').forEach((el) => {
    const id = el.dataset.notiId;
    if (!eligible.some((n) => n.id === id)) el.remove();
  });

  if (structuralChange) scheduleSuppressionRefresh();
  return bubbleCount();
}

// 展开态变化 → 通知栏重绘（抑制生效/解除）。合帧防抖：同一手势链内多次切换只重绘一次。
let suppressionRaf = 0;
function scheduleSuppressionRefresh() {
  if (suppressionRaf) return;
  suppressionRaf = requestAnimationFrame(() => {
    suppressionRaf = 0;
    try { renderNotificationsList(); } catch (e) { /* 渲染容器缺席（如单测环境）不阻塞气泡 */ }
  });
}

/** 点击/键盘：收起 ⇄ 展开（展开 = enterMiniWindow 实例接管，fromRect 取气泡矩形） */
export function toggleExpand(notiId) {
  if (!hasBubble(notiId)) return false;
  const snap = bubbleSnapshot().find((b) => b.id === notiId);
  if (!snap) return false;
  const el = badgeEl(notiId);
  if (snap.expanded) {
    // 展开 → 收起：小窗最小化（实例保留为恢复芯片），气泡回到角标态
    try { minimizeMiniWindow(snap.appId); } catch (e) { /* 引擎缺席（单测 mock 面）不阻塞 */ }
    collapse(notiId);
    return true;
  }
  setExpanded(notiId, true);
  const fromRect = el ? el.getBoundingClientRect() : null;
  const ok = enterMiniWindow(snap.appId, fromRect ? { fromRect } : null);
  if (!ok) setExpanded(notiId, false); // 应用不存在等入窗失败 → 回滚，抑制不落空
  if (el) el.classList.toggle('bubble-badge--expanded', isExpanded(notiId));
  scheduleSuppressionRefresh();
  return ok;
}

function collapse(notiId) {
  if (!hasBubble(notiId)) return;
  setExpanded(notiId, false);
  const el = badgeEl(notiId);
  if (el) el.classList.remove('bubble-badge--expanded');
  scheduleSuppressionRefresh();
}

// ==================== 手势：点按展开 / 纵向拖拽换位（touchSlop 判别） ====================
function onPointerDown(e) {
  const el = e.currentTarget;
  const notiId = el.dataset.notiId;
  const startX = e.clientX;
  const startY = e.clientY;
  const startYPos = bubbleY(notiId) || 0;
  let dragging = false;
  try { el.setPointerCapture(e.pointerId); } catch (err) { /* 已释放指针时忽略 */ }

  const onMove = (ev) => {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    if (!dragging && isDragMovement(dx, dy)) {
      dragging = true;
      el.classList.add('bubble-badge--dragging');
    }
    if (dragging) {
      const y = setBubbleY(notiId, startYPos + dy, window.innerHeight || 760) ? bubbleY(notiId) : startYPos;
      applyPosition(el, y);
    }
  };
  const onUp = (ev) => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    el.classList.remove('bubble-badge--dragging');
    if (dragging) {
      setBubbleY(notiId, bubbleY(notiId) || startYPos, window.innerHeight || 760); // 落位记账（dragged=true）
    } else {
      toggleExpand(notiId); // touchSlop 内 = 点击语义
    }
  };
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
}

// ==================== 系统事件接线 ====================
function onNotificationsChanged() {
  renderBubbles();
}

function onMiniWindowChanged(e) {
  const d = e.detail || {};
  if (!d.appId) return;
  // 收起路径：小窗最小化/关闭（active:false）或全屏接管（maximized:true）→ 气泡回落角标态
  if (d.active === false || d.maximized === true) {
    bubbleSnapshot().forEach((b) => {
      if (b.appId === d.appId && b.expanded) collapse(b.id);
    });
  }
}

function onResize() {
  const vh = window.innerHeight || 760;
  reconcilePositions(vh);
  bubbleSnapshot().forEach((b) => {
    const el = badgeEl(b.id);
    if (el) applyPosition(el, bubbleY(b.id));
  });
}

let inited = false;
export function initBubbles() {
  if (inited) return;
  inited = true;
  ensureLayer();
  window.addEventListener('notifications-changed', onNotificationsChanged);
  window.addEventListener('mini-window-changed', onMiniWindowChanged);
  window.addEventListener('resize', onResize);
  renderBubbles();
}

// 只读测试/e2e 桥（__headsUpDebug 同款风格：零写入零行为面，仅状态观测）
if (typeof window !== 'undefined') {
  window.__bubblesDebug = {
    get count() { return bubbleCount(); },
    snapshot: () => bubbleSnapshot(),
    expanded: () => Array.from(expandedIds()),
    suppressedNow: () => getNotifications().filter((n) => isSuppressedNow(n)).map((n) => n.id),
    yOf: (id) => bubbleY(id),
  };
}

function isSuppressedNow(item) {
  return expandedIds().has(item && item.id);
}
