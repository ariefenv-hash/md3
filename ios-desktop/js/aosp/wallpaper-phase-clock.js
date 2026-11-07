// ==================== wallpaper-phase-clock.js — 壁纸挂起/相位时钟纯逻辑核（#231） ====================
//
// #231 实测两根因的纯逻辑抽取（与 DOM/rAF 完全解耦，假时钟可穷举）：
//   根因 A（相位跳变）：程序化壁纸时间轴原为墙钟 performance.now()-t0，应用全屏暂停期间
//     照常累积 2.3s+ → 回桌面首帧相位大跳（「重新播放」观感，比回起点更突兀）。
//     修复 = 自维护相位时钟 animT：仅可见播放期累加，暂停期冻结，恢复首帧 = 暂停末帧 + 单帧增量。
//   根因 B（恢复时机）：门卫原为 state.currentApp，而它在 finishAnim（动画终点）才清空 →
//     壁纸静止贯穿整个关窗动画（452ms 实测），恢复必然落在动画结束后。
//     修复 = 门卫改动画进度语义：closeApp 起手（isClosing=true）即视为恢复。
//
// 消费方：procedural-wallpaper.js（rAF 逐帧调用 stepPhaseClock + isWallpaperSuspended）、
//         video-wallpaper.js（看门狗 isWallpaperSuspended 决定 pause/play）。
//         两引擎共用同一门卫 ⇒ 恢复时刻天然一致。

/** 单帧相位增量上限（秒）：rAF 后台节流/标签页休眠恢复时 now-lastTick 可达数秒，
 *  不封顶则恢复首帧相位跳变 —— 与暂停期累积同型的 bug，必须同防线。 */
export const PHASE_TICK_MAX_STEP = 0.05;

/**
 * 壁纸是否应处于挂起（暂停绘制/播放）态。
 * #231 语义：应用全屏挂起，但**关窗动画在途（isClosing）即视为已恢复**——
 * 关窗动画起手窗口就开始收缩让位，桌面与壁纸随之渐显，壁纸应同步起播，
 * 而非等 finishAnim 在动画终点翻转布尔。开窗动画期（currentApp 已置位）维持挂起，
 * 与旧行为一致（开窗方向无用户报障，不扩面）。
 * @param {{currentApp: unknown, isClosing: boolean}} s 应用窗口状态机切片
 */
export function isWallpaperSuspended(s) {
  return !!s && !!s.currentApp && !s.isClosing;
}

/**
 * 相位时钟单步推进。
 * @param {number} animT  当前相位（秒）
 * @param {number} lastTick 上次 tick 的 rAF 时间戳（0 = 尚无基准，本步只建立基准）
 * @param {number} now    本次 rAF 时间戳
 * @param {boolean} suspended  挂起态（isWallpaperSuspended 结果）
 * @param {boolean} reducedMotion 减少动态偏好（静态帧语义：相位一并冻结）
 * @param {number} [maxStep] 单帧增量上限（秒），默认 PHASE_TICK_MAX_STEP
 * @returns {{animT: number, lastTick: number}}
 */
export function stepPhaseClock(animT, lastTick, now, suspended, reducedMotion, maxStep = PHASE_TICK_MAX_STEP) {
  // lastTick=0：循环（重）启动后的首个 tick，只建立基准不推进（基准期时长不可信）
  if (!lastTick || lastTick >= now) return { animT, lastTick: now };
  if (suspended || reducedMotion) return { animT, lastTick: now };
  const dt = Math.min((now - lastTick) / 1000, maxStep);
  return { animT: animT + dt, lastTick: now };
}
