// ==================== launch-watchdog.js — #225 根壳开窗动画看门狗（纯逻辑核） ====================
//
// 背景（#225 真实 Chromium 实测）：app-window.js 的 render loop 只在「主窗口 + 全部
// Closing Actor + 放射场全部 settle」时才调用 finishAnim()。嵌套 iframe 的 rAF 节流、
// iOS 低电量模式 / Safari 后台标签 / Windows 能效模式 / Android WebView 省电策略会让
// rAF 近乎停摆（实测 12s 仅 22 帧）→ 弹簧不收敛 → finishAnim 永不执行 → 三重永久卡死：
//   ① 窗口停在图标起始帧 44×44（子应用 iframe 44×36，内容已渲染但不可见）
//   ② appLaunchScreen opacity=1 常驻整片遮挡
//   ③ setAnimFreezeLock(false) 永不执行 → bg-freeze 的 animFreezeLock 恒 true
// 根壳自身有 setTimeout(hideSplash, 3000) 兜底，桌面开窗动画却没有 —— 不对称漏洞。
//
// 本模块是**与 DOM / rAF 完全解耦的状态机**：独立 setTimeout 计时（不受 rAF 节流影响），
// 到期强制收敛；正常路径收敛则取消。零 import、零全局副作用，便于穷举单测。

export const LAUNCH_WATCHDOG_MS = 2000;       // #225 议题建议区间取中值（端点见议题正文；注释不复述数值以守 #149 纪律①）
export const LAUNCH_SCREEN_RELEASE_MS = 520;  // 启动画面独立解耦隐藏（不依赖弹簧）

/** 纯判定：正常收敛 / 已强制 → 不再动作；未收敛且超时 → 强制收敛 */
export function resolveLaunchAction({ settled = false, forced = false, elapsedMs = 0, watchdogMs = LAUNCH_WATCHDOG_MS }) {
  if (settled || forced) return 'none';
  return elapsedMs >= watchdogMs ? 'force-finish' : 'wait';
}

/**
 * 创建看门狗。定时器经注入（单测用假时钟，运行侧用 window.setTimeout）。
 * onRelease(reason)    —— 启动画面独立隐藏（与弹簧解耦，#225 要求②）
 * onForceFinish(info)  —— 强制走 finishAnim（解锁 + 窗口终值 + 隐藏，#225 要求①③⑤）
 * arm() 每次重新起算并取消旧定时器；settle() 正常收敛后所有回调一律 no-op。
 */
export function createLaunchWatchdog(opts) {
  const {
    schedule, cancel, now = () => Date.now(),
    watchdogMs = LAUNCH_WATCHDOG_MS,
    releaseMs = LAUNCH_SCREEN_RELEASE_MS,
    onRelease = () => {}, onForceFinish = () => {},
  } = opts || {};
  if (typeof schedule !== 'function' || typeof cancel !== 'function') {
    throw new TypeError('createLaunchWatchdog 需要 schedule/cancel 注入');
  }
  let gen = 0;
  let releaseTimer = null;
  let forceTimer = null;
  let settled = false;
  let forced = false;
  let armedAt = null;

  function clearTimers() {
    if (releaseTimer !== null) { cancel(releaseTimer); releaseTimer = null; }
    if (forceTimer !== null) { cancel(forceTimer); forceTimer = null; }
  }

  function arm() {
    clearTimers();
    gen += 1;
    const myGen = gen;
    settled = false;
    forced = false;
    armedAt = now();
    const start = armedAt;
    releaseTimer = schedule(() => {
      releaseTimer = null;
      if (myGen !== gen || settled || forced) return;
      onRelease({ gen: myGen, elapsedMs: now() - start, reason: 'launch-screen-timeout' });
    }, releaseMs);
    forceTimer = schedule(() => {
      forceTimer = null;
      if (myGen !== gen || settled || forced) return;
      forced = true;
      onForceFinish({ gen: myGen, elapsedMs: now() - start, reason: 'watchdog' });
    }, watchdogMs);
    return myGen;
  }

  /** 正常收敛：取消全部定时器并标记，杜绝后续误触发（兜底只兜异常，不抢正常路径） */
  function settle() {
    settled = true;
    clearTimers();
    return { gen, settled, forced };
  }

  /** 直接强制（e2e / 调试注入），幂等：重复调用只触发一次 */
  function force() {
    if (settled || forced) return { gen, settled, forced, noop: true };
    forced = true;
    clearTimers();
    onForceFinish({ gen, elapsedMs: armedAt === null ? 0 : now() - armedAt, reason: 'manual' });
    return { gen, settled, forced };
  }

  function isArmed() { return releaseTimer !== null || forceTimer !== null; }
  function state() { return { gen, settled, forced, armed: isArmed(), armedAt }; }
  return { arm, settle, force, clear: clearTimers, isArmed, state };
}
