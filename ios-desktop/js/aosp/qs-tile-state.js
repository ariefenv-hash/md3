// ==================== qs-tile-state.js — QSTileImpl 三通道状态机 · 纯逻辑层（#201） ====================
//
// 1:1 移植自 AOSP aosp-mirror/platform_frameworks_base main
// packages/SystemUI/src/com/android/systemui/qs/tileimpl/QSTileImpl.java（805 行）：
//   · Tile.STATE_UNAVAILABLE / INACTIVE / ACTIVE 三态（Tile.java 常量 0/1/2）
//   · BooleanState.value 布尔通道（state 三态 + value 双字段解耦）
//   · disabledByPolicy 受管通道（RestrictedLockUtils.EnforcedAdmin 语义）——独立于三态，
//     与 UNAVAILABLE 在视觉层合流（#202 getTileViewColors），在交互层独立处置（可点击但拦截提示）
//   · refreshState(arg) → H.REFRESH_STATE → handleUpdateState 全量重算；
//     L436-446 注释原文 "state.copy() post 成 Runnable 同帧去重——状态变更只保留最后一份"
//   · 陈旧自愈：DEFAULT_STALE_TIMEOUT = 10 * DateUtils.MINUTE_IN_MILLIS，
//     handleStale 在有监听时强制 refreshState、无监听时挂 staleListener
//   · 误触守卫：mFalsingManager.isFalseTap(LOW_PENALTY) / isFalseLongTap
//     （web 落地 = 位移/时长双阈值纯函数；长按阈值 480ms 与 quick-settings.js lpTimer 既有
//     实现同源，常量单源在本模块）
//   · 长按语义位：handlesLongClick 是逐磁贴状态位（QSTileViewImpl L581 isLongClickable 消费），
//     不是特例 if —— AOSP 中无 getLongClickIntent 目的地的磁贴如实声明 false
//   · secondaryClick() 默认委托 handleClick（QSTileImpl.java handleSecondaryClick 注释原文）
//
// 本模块零 DOM / 零共享状态（工厂闭包 + 纯函数），供 quick-settings.js 渲染层与
// tests/v201-qs-tile-state.test.js 直接驱动 —— 与 zen-mode.js 同款「纯函数守护」策略。

/** Tile.java 三态常量（frameworks/base android.service.quicksettings.Tile） */
export const TILE_STATE = Object.freeze({
  UNAVAILABLE: 0,
  INACTIVE: 1,
  ACTIVE: 2,
});

/** QSTileImpl.DEFAULT_STALE_TIMEOUT = 10 * DateUtils.MINUTE_IN_MILLIS（源码 L92 同值） */
export const DEFAULT_STALE_TIMEOUT_MS = 10 * 60 * 1000;

/** FalsingManager 误触守卫阈值（web 落地标定）：
 *  点击位移 > 24px 视为滑动误触；按压 > 700ms 视为长按误判点击；
 *  长按最短 480ms（与 quick-settings.js lpTimer 既有 480ms 同源，常量单源在此）。 */
export const FALSE_TAP_MAX_DX = 24;
export const FALSE_TAP_MAX_MS = 700;
export const FALSE_LONG_TAP_MIN_MS = 480;

/** 长按目的地注册表（getLongClickIntent 逐磁贴声明同构）：
 *  md3 中仅存在真实内联面板实体的三贴（internet/bluetooth/modes，v7.79 裁决
 *  「点击整块即面板」）；其余磁贴无详情面板实体 —— 如实声明 false（不空转硬造目的地，
 *  AOSP 同构：无 getLongClickIntent 的磁贴 handlesLongClick 亦为 false）。 */
export const TILE_LONG_CLICK_INTENTS = Object.freeze({
  internet: 'network-sheet',
  bluetooth: 'bluetooth-sheet',
  modes: 'modes-sheet',
});

/** 环境约束下的可用性裁决（缺口表 #1：UNAVAILABLE 语义全贴通用）。
 *  飞行模式开启 → 依赖无线链路的磁贴 UNAVAILABLE（reason='aeroplane'）；
 *  返回 null 表示无环境约束（走磁贴自身 active 三态）。
 *  @param {string} tileId 磁贴 id
 *  @param {{aeroplane?: boolean}} env 全局环境快照
 *  @returns {string|null} 不可用原因（受管 reason 前缀 'policy:' 表示 disabledByPolicy 通道） */
export function tileConstraintReason(tileId, env) {
  const e = env || {};
  if (e.aeroplane) {
    // 飞行模式：cast / quick_share / vpn / internet 依赖射频链路（internet 磁贴本身即飞行
    // 模式的对偶开关，AOSP 中飞行模式开启时 WifiTile 亦标 unavailable）
    if (tileId === 'cast' || tileId === 'quick_share' || tileId === 'vpn' || tileId === 'internet') {
      return 'aeroplane';
    }
  }
  // 省电模式（battery saver）：torch 高耗贴受系统策略限制 —— disabledByPolicy 通道
  // （EnforcedAdmin 语义：受管不是 UNAVAILABLE，视觉合流、点击拦截提示受管）
  if (e.batterySaver && tileId === 'torch') {
    return 'policy:battery_saver';
  }
  return null;
}

/**
 * 磁贴状态派生（QSTileImpl.handleUpdateState 全量重算同构）。
 * @param {{id: string, active?: boolean, restricted?: boolean|string}} tile 磁贴模型
 *        （active 既有布尔字段保持兼容；restricted 受管说明串或布尔）
 * @param {{aeroplane?: boolean, batterySaver?: boolean, now?: number}} env 环境快照
 * @returns {{state: number, value: boolean, restricted: boolean, restrictedReason: string|null,
 *            handlesLongClick: boolean, unavailableReason: string|null, lastRefresh: number}}
 */
export function deriveTileState(tile, env) {
  const e = env || {};
  const now = typeof e.now === 'number' ? e.now : 0;
  const constraint = tileConstraintReason(tile.id, e);
  const restricted = !!tile.restricted || (constraint ? constraint.startsWith('policy:') : false);
  const unavailableReason = constraint && !constraint.startsWith('policy:') ? constraint : null;
  const active = !!tile.active;
  // UNAVAILABLE 优先级最高（AOSP：state===UNAVAILABLE 时 value 语义失活）；
  // 受管（disabledByPolicy）不改三态值——仅色彩合流 + 交互拦截（#202 L592-595/L644 同构）
  const state = unavailableReason != null
    ? TILE_STATE.UNAVAILABLE
    : (active ? TILE_STATE.ACTIVE : TILE_STATE.INACTIVE);
  return {
    state,
    value: state === TILE_STATE.ACTIVE ? true : (state === TILE_STATE.INACTIVE ? false : !!tile.active),
    restricted,
    restrictedReason: restricted ? (constraint && constraint.startsWith('policy:') ? constraint.slice(7) : (typeof tile.restricted === 'string' ? tile.restricted : 'admin')) : null,
    handlesLongClick: !!TILE_LONG_CLICK_INTENTS[tile.id],
    unavailableReason,
    lastRefresh: now,
  };
}

/**
 * refreshState 同帧去重（QSTileImpl L436-446：state.copy() post 成 Runnable，
 * 同帧多次 refreshState 只保留最后一份）。
 * @param {Array<{tileId: string, arg: *}>} queue 既有待处理队列
 * @param {string} tileId 目标磁贴
 * @param {*} arg refreshState 参数
 * @returns {Array<{tileId: string, arg: *}>} 新队列（同 tileId 旧条目被移除，新条目压尾）
 */
export function refreshStateCoalesce(queue, tileId, arg) {
  const rest = (queue || []).filter((q) => q.tileId !== tileId);
  rest.push({ tileId, arg });
  return rest;
}

/** 批量广播去重（多磁贴同时 refreshState 的便捷入口：同 tileId 去重，顺序保持首现位置） */
export function refreshStateBatch(queue, tileIds, argOf) {
  let out = queue || [];
  for (const id of tileIds) out = refreshStateCoalesce(out, id, argOf ? argOf(id) : undefined);
  return out;
}

/**
 * 陈旧自愈判定（QSTileImpl.handleStale 同构：lastRefresh 距 now 超过 timeout 即陈旧，
 * 有监听时强制 refreshState、无监听时挂 staleListener —— web 落地：QS 面板展开渲染
 * 即全量重算 = 天然自愈，本判定供增量刷新路径决定是否强制重算）。
 * @param {number} lastRefreshMs 上次 refreshState 时间戳
 * @param {number} nowMs 当前时间
 * @param {number} [timeoutMs] 超时阈值（缺省 DEFAULT_STALE_TIMEOUT_MS）
 */
export function isStale(lastRefreshMs, nowMs, timeoutMs) {
  const t = typeof timeoutMs === 'number' ? timeoutMs : DEFAULT_STALE_TIMEOUT_MS;
  if (typeof lastRefreshMs !== 'number' || typeof nowMs !== 'number') return false;
  return nowMs - lastRefreshMs > t;
}

/** 误触守卫：isFalseTap(LOW_PENALTY) 同构（位移/时长双阈值，任一越界即误触） */
export function isFalseTap(pt) {
  if (!pt) return false;
  const dx = typeof pt.dx === 'number' ? Math.abs(pt.dx) : 0;
  const ms = typeof pt.ms === 'number' ? pt.ms : 0;
  if (dx > FALSE_TAP_MAX_DX) return true;
  if (ms > FALSE_TAP_MAX_MS) return true;
  return false;
}

/** 长按误触守卫：isFalseLongTap 同构（时长不足 FALSE_LONG_TAP_MIN_MS 即非有效长按） */
export function isFalseLongTap(ms) {
  if (typeof ms !== 'number') return true;
  return ms < FALSE_LONG_TAP_MIN_MS;
}
