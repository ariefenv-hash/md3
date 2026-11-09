// ==================== window-actor-lease-core.js — Closing Actor 租约判定纯核 ====================
// v10.92 #247（窗口快速切换标题/内容错位治理）配套纯核：
// 并行 Closing Actor 在渲染循环（rAF 链）内自然落定回收；一旦循环因异常/页签
// 冻结死亡，在途 Actor 将永远无法到达 settle 判定 —— 其托管的活实例带
// __actorHosted 标记被 renderPageStack 永久豁免隐藏，表现为「旧应用内容驻留 +
// 新应用标题」错位（#247 真机截图实证）。
//
// 本核只做纯判定，不触 DOM：
//   · leaseExpired(bornAt, now, leaseMs) —— 租约是否期满（rAF 内扫面 + setTimeout
//     看门狗共用同一阈值，双通道判定恒一致）；
//   · collectExpiredActorIndices(actors, now, leaseMs) —— 批量扫面（帧循环侧兜底）。
// 判定纪律：bornAt 非法/时钟回拨（now < bornAt）一律视为未期满（宁可多看一帧，
// 不误杀在途动画）；租约默认 5000ms，远超正常退场动画生命周期（≤1s）。

export const CLOSING_ACTOR_LEASE_MS_DEFAULT = 5000;

/**
 * 租约是否期满。
 * @param {number} bornAt Actor 出生时间戳（performance.now() 或 Date.now()，单位 ms）
 * @param {number} now 当前时间戳（与 bornAt 必须同源同单位）
 * @param {number} [leaseMs] 租约时长，默认 5000
 * @returns {boolean}
 */
export function leaseExpired(bornAt, now, leaseMs = CLOSING_ACTOR_LEASE_MS_DEFAULT) {
  if (!Number.isFinite(bornAt) || !Number.isFinite(now) || !Number.isFinite(leaseMs)) return false;
  if (leaseMs <= 0) return false;
  if (now < bornAt) return false; // 时钟回拨/同源校验失败 → 不误杀
  return (now - bornAt) >= leaseMs;
}

/**
 * 批量扫面：返回租约已期满的 Actor 下标数组（供帧循环倒序强制回收）。
 * @param {Array<{bornAt?: number}>} actors
 * @param {number} now
 * @param {number} [leaseMs]
 * @returns {number[]}
 */
export function collectExpiredActorIndices(actors, now, leaseMs = CLOSING_ACTOR_LEASE_MS_DEFAULT) {
  const out = [];
  if (!Array.isArray(actors)) return out;
  for (let i = 0; i < actors.length; i++) {
    const a = actors[i];
    if (a && leaseExpired(a.bornAt, now, leaseMs)) out.push(i);
  }
  return out;
}
