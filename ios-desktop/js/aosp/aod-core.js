// ==================== js/aosp/aod-core.js — AOD/Doze 状态机（v9.94 · #35） ====================
// AOSP 对标：SystemUI doze.md（Display state DOZE / DOZE_SUSPEND）+ config_dozeAlwaysOnDisplay*
// 语义：屏超时（screen_off_timeout）→ 显示熄灭 → AOD 常显；电源键显式熄屏 → 直接 doze；
// 任意交互（touch/motion）→ 唤醒回 keyguard（锁屏）。md3 无真实背光：AOD=覆盖层（锁屏之上），
// 唤醒=回锁屏。纯逻辑零 DOM 零 window：时基/调度全注入（schedule/cancel 可注入假时钟）。
// 零 rAF 纪律：AOD 期禁用帧循环（issue 验收「rAF 停用」）——本模块与 DOM 层均只用 setTimeout。

/** 默认闲置熄屏时长（AOSP def_screen_off_timeout=60000；md3 显示页单源 settings:display-v1.timeout 同值族） */
export const AOD_DEFAULT_IDLE_MS = 60000;
/** 闲置时长下限护栏（防误配 0/负数导致即时熄屏抖动） */
export const AOD_MIN_IDLE_MS = 5000;

/** 闲置时长规整：非有限数 / 低于下限 → 默认值（e2e 可配 15000 档，显示页 TIMEOUT_LABELS 权威族） */
export function normalizeIdleMs(v) {
  const n = Number(v);
  return (Number.isFinite(n) && n >= AOD_MIN_IDLE_MS) ? n : AOD_DEFAULT_IDLE_MS;
}

/**
 * AOD 控制器（两态状态机：active ⇄ aod）。
 * 事件（onEvent 订阅）：'expire'（闲置到期，调用方进入 AOD）/ 'enter' / 'wake'（调用方撤覆盖层）。
 * 纪律：enter/wake 幂等（重复进入 'already-aod'、非 AOD 唤醒 'not-aod'）——快速反复熄/亮无死锁（验收①）。
 * @param {{now?:()=>number, schedule?:(fn:Function,ms:number)=>any, cancel?:(t:any)=>void}} deps
 */
export function createAodController({ now = Date.now, schedule = (fn, ms) => setTimeout(fn, ms), cancel = (t) => clearTimeout(t) } = {}) {
  if (typeof schedule !== 'function' || typeof cancel !== 'function') throw new RangeError('createAodController: schedule/cancel 注入必填');
  let enabled = false;
  let idleMs = AOD_DEFAULT_IDLE_MS;
  let state = 'active';
  let timer = null;
  let subs = [];
  const clear = () => { if (timer !== null) { try { cancel(timer); } catch (_) {} timer = null; } };
  const arm = () => { clear(); if (!enabled || state !== 'active') return; timer = schedule(() => { timer = null; if (state === 'active' && enabled) emit('expire'); }, idleMs); };
  const emit = (ev) => { subs.forEach((f) => { try { f(ev); } catch (_) {} }); };
  return {
    /** 配置（enabled/idleMs 任一可省；变更后重排闲置计时） */
    configure(c = {}) {
      if ('enabled' in c) enabled = !!c.enabled;
      if ('idleMs' in c) idleMs = normalizeIdleMs(c.idleMs);
      arm();
      return { enabled, idleMs, state };
    },
    isEnabled() { return enabled; },
    getState() { return state; },
    /** 用户活动（pointer/key）：active 态重排闲置计时（防交互中熄屏）；aod 态忽略（唤醒走显式 wake） */
    activity() { if (state === 'active' && enabled) arm(); },
    /** 进入 AOD（闲置到期路径——仅在 enabled 时可达；显式熄屏同样走此门） */
    requestEnter() {
      if (state === 'aod') return 'already-aod';
      if (!enabled) return 'rejected-disabled';
      state = 'aod';
      clear();
      emit('enter');
      return 'entered';
    },
    /** 唤醒回锁屏（点击/上滑）；非 AOD 态 no-op */
    wake() {
      if (state !== 'aod') return 'not-aod';
      state = 'active';
      arm();
      emit('wake');
      return 'woke';
    },
    /** 解锁通知：active 态重排闲置（解锁手势即活动，双保险） */
    notifyUnlock() {
      if (state !== 'active') return 'ignored';
      arm();
      return 'rearmed';
    },
    onEvent(f) { subs.push(f); return () => { subs = subs.filter((x) => x !== f); }; },
    /** 观测面（vitest/e2e 同步探针） */
    _debug() { return { enabled, idleMs, state, armed: timer !== null }; },
  };
}
