// ==================== aosp/bubbles.js — #91 Bubble 一期纯逻辑核 ====================
//
// AOSP 对标：platform_frameworks_base/packages/SystemUI/src/com/android/wm/shell/bubbles/
//   · BubbleController.isBubbleNotificationSuppressedFromShade —— 气泡展开后对应通知从
//     通知栏抑制（避免双显）；收起即恢复。本文件以 expandedIds 集合承载同一语义。
//   · BubbleData（expanded/selected 标志 + 沿屏缘堆叠）—— 一期以 Map<notiId, Bubble> 承载，
//     二期（多气泡栈交换/展开成行/dismiss 区）与三期（A17 Bubble Bar）在本状态机上扩容，
//     不回改消费面签名。
//   · md3 资格映射：AOSP「MessagingStyle + 会话 shortcut + 用户/系统允许」三条件在 md3
//     对应为「会话通知（NEW_MESSAGE_NOTIFICATION 投递方自动置 canBubble）或任意通知显式
//     canBubble 标记」+ id/appId 可路由（气泡点击须能落到对应应用小窗）。
// 一期范围（议题 #91 分期①）：气泡角标资格 + 展开期通知条目抑制 + 屏缘定位钳制。
// 本文件为零 DOM 零 import 叶子模块（notifications.js 消费抑制查询、bubbles.js DOM 板
// 消费注册表，双向共用同一模块单例，无环）。

/** 气泡直径 px（工程定值；AOSP BubblePositioner 随窗宽/手势区浮动，md3 单档桌面） */
export const BUBBLE_SIZE = 48;
/** 距屏缘 inset px */
export const BUBBLE_EDGE_INSET = 12;
/** 顶部安全区 inset px（状态栏 + at-a-glance 之下起排） */
export const BUBBLE_TOP_INSET = 96;
/** 多气泡纵向堆叠间距 px */
export const BUBBLE_GAP = 10;
/** 拖拽判别位移阈值 px（AOSP ViewConfiguration touchSlop 同构；工程定值） */
export const BUBBLE_DRAG_SLOP = 6;

/**
 * 气泡资格裁决（一期）。三个条件全缺一不可：
 *   ① item.id —— 抑制/移除语义按通知 id 精确路由；
 *   ② item.appId —— 点击展开必须能落到对应应用小窗（enterMiniWindow 路由键）；
 *   ③ canBubble —— 会话通知投递方自动置 true，或任意通知显式 opt-in。
 * @param {{id?:string, appId?:string, canBubble?:boolean}|null} item
 */
export function isBubbleable(item) {
  return !!(item && item.id && item.appId && item.canBubble);
}

/**
 * 抑制语义（isBubbleNotificationSuppressedFromShade 同名同义）：仅「展开中」的气泡
 * 抑制其通知栏条目；收起/最小化/全屏接管即恢复（AOSP expanded 语义，避免双显）。
 * @param {{id?:string}|null} item
 * @param {Set<string>|null} expandedIds 展开中气泡的 notiId 集合
 */
export function isSuppressedFromShade(item, expandedIds) {
  return !!(item && item.id && expandedIds && expandedIds.has(item.id));
}

/**
 * 屏缘纵向钳制：y ∈ [topInset, vh - size - edgeInset]。
 * 视口过矮时 hi 收缩到 lo（不产生负区间）。
 */
export function clampBubbleY(y, vh, size = BUBBLE_SIZE, topInset = BUBBLE_TOP_INSET, edgeInset = BUBBLE_EDGE_INSET) {
  const lo = topInset;
  const hi = Math.max(lo, vh - size - edgeInset);
  return Math.min(hi, Math.max(lo, y));
}

/** 第 i 个未拖拽气泡的默认堆叠 y（自上而下；溢出视口的槽位钳在底部） */
export function bubbleSlotY(i, vh, size = BUBBLE_SIZE, gap = BUBBLE_GAP, topInset = BUBBLE_TOP_INSET) {
  return clampBubbleY(topInset + i * (size + gap), vh, size, topInset);
}

/** 拖拽判别：位移超过 touchSlop 即为拖拽（否则视为点击展开） */
export function isDragMovement(dx, dy, slop = BUBBLE_DRAG_SLOP) {
  return Math.hypot(dx, dy) > slop;
}

// ==================== 注册表（模块单例，双向消费面共享） ====================
// 一期记录：{ appId, expanded, y, dragged }。二期扩容为 BubbleData 栈语义时，
// 以 registry 对象为唯一改造点，notifications.js / bubbles.js 消费面签名不变。
const bubbles = new Map();

/** 注册（已存在则幂等返回 false，不覆盖既有展开态/位置） */
export function registerBubble(notiId, appId, y) {
  if (!notiId || !appId || bubbles.has(notiId)) return false;
  bubbles.set(notiId, { appId, expanded: false, y, dragged: false });
  return true;
}

/** 移除（不存在幂等返回 false）；展开中移除 = 抑制同步解除 */
export function removeBubble(notiId) {
  return bubbles.delete(notiId);
}

export function hasBubble(notiId) {
  return bubbles.has(notiId);
}

/** 展开态切换（未注册的 id 返回 false，不隐式创建） */
export function setExpanded(notiId, expanded) {
  const b = bubbles.get(notiId);
  if (!b || b.expanded === !!expanded) return false;
  b.expanded = !!expanded;
  return true;
}

export function isExpanded(notiId) {
  const b = bubbles.get(notiId);
  return !!b && b.expanded;
}

/** 抑制查询的集合视图（每次返回新 Set，消费方可安全持有） */
export function expandedIds() {
  const out = new Set();
  bubbles.forEach((b, id) => { if (b.expanded) out.add(id); });
  return out;
}

/** 拖拽落位（钳制后写入 + 标记 dragged，重排不再挪动该气泡） */
export function setBubbleY(notiId, y, vh) {
  const b = bubbles.get(notiId);
  if (!b) return false;
  b.y = clampBubbleY(y, vh);
  b.dragged = true;
  return true;
}

export function bubbleY(notiId) {
  const b = bubbles.get(notiId);
  return b ? b.y : null;
}

export function isDragged(notiId) {
  const b = bubbles.get(notiId);
  return !!b && b.dragged;
}

export function bubbleCount() {
  return bubbles.size;
}

/** 未拖拽气泡按注册序分配堆叠槽位（重排一致性：dragged 项保持原位） */
export function reconcilePositions(vh, size = BUBBLE_SIZE, gap = BUBBLE_GAP, topInset = BUBBLE_TOP_INSET) {
  let slot = 0;
  bubbles.forEach((b) => {
    if (!b.dragged) b.y = bubbleSlotY(slot++, vh, size, gap, topInset);
  });
}

/** 快照（测试/调试桥只读面） */
export function bubbleSnapshot() {
  const out = [];
  bubbles.forEach((b, id) => out.push({ id, appId: b.appId, expanded: b.expanded, y: b.y, dragged: b.dragged }));
  return out;
}

/** 仅测试：清空注册表（vitest 单文件单模块实例内复位） */
export function __resetBubbles() {
  bubbles.clear();
}

// ==================== 二期：气泡栈语义（v10.60 #91 分期②） ====================
//
// AOSP 对标：BubbleData（单 selected + expanded 整栈态）/ BubbleStackView
// （栈扇出选泡 showStackView / dismiss target 高亮）。三期（A17 Bubble Bar）仍不在。
// md3 映射：「整栈展开」的可见形态即扇出成行；「selected」= 当前展开小窗的那枚气泡。

/** 底部 dismiss 区高度 px（拖拽松手判定带；工程定值，AOSP dismiss target 为底部磁吸区） */
export const DISMISS_ZONE_HEIGHT = 96;
/** dismiss 区横向敏感带占视口宽比例（居中带；工程定值） */
export const DISMISS_ZONE_SIDE_RATIO = 0.6;

/** 拖拽点位是否落在底部 dismiss 区（居中横向敏感带） */
export function inDismissZone(x, y, vw, vh, h = DISMISS_ZONE_HEIGHT, ratio = DISMISS_ZONE_SIDE_RATIO) {
  if (y < vh - h) return false;
  const half = (vw * ratio) / 2;
  return Math.abs(x - vw / 2) <= half;
}

/**
 * 扇出行几何：count 枚气泡横向展开为居中一行（间距 size+gap；行宽超视口时左缘钳到 8px）。
 * 返回每枚的行内 x（视口坐标，左→右与注册序一致）。
 */
export function fanOutRow(count, vw, size = BUBBLE_SIZE, gap = BUBBLE_GAP) {
  if (count <= 0) return [];
  const step = size + gap;
  const total = count * size + (count - 1) * gap;
  const startX = Math.max(8, (vw - total) / 2);
  return Array.from({ length: count }, (_, i) => startX + i * step);
}

/** 单展开不变量的注册表侧出口：收起除 keepId 外的全部展开成员（DOM 板切换时调用） */
export function collapseOthers(keepId) {
  let n = 0;
  bubbles.forEach((b, id) => {
    if (b.expanded && id !== keepId) { b.expanded = false; n++; }
  });
  return n;
}
