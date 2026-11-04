// ==================== aosp/heads-up-timing.js — HeadsUpManagerImpl 时序七常量 + snooze + Avalanche 排队（#197） ====================
//
// 源码锚（aosp-mirror/platform_frameworks_base main，议题 #197 实证值逐项 1:1）：
//   packages/SystemUI/res/values/config.xml：
//     heads_up_notification_decay = 5000「milliseconds before the heads up notification auto-dismisses」
//     auto_heads_up_notification_decay = 3000（自动分流类短驻留）
//     heads_up_notification_minimum_time = 2000（最短驻留，防「闪没」）
//     heads_up_notification_minimum_time_with_throttling = 500（节流期下限）
//     sticky_heads_up_notification_time = 60000（常驻类 60s）
//     heads_up_default_snooze_length_ms = 60000（划掉后同通知 60s 静默）
//     heads_up_notification_touch_acceptance_delay = 700（点按收下缓冲，v9.02 #64 已取用）
//     max_notif_icons_on_lockscreen = 3（锁屏图标上限）
//   statusbar/notification/headsup/HeadsUpManagerImpl.java：
//     setEntryPinned() / shouldHeadsUpBecomePinned() —— 通知置顶常驻不被自动收起
//   statusbar/notification/headsup/AvalancheController.kt：
//     mAvalancheController.update() / isWaiting() —— 通知风暴下单槽等待队列错峰放出
// 纯逻辑层纪律（v9.05 多文件范式同款）：零 DOM / 零共享状态副作用（工厂闭包内自有状态），
// 消费端 notifications.js 接线（#197 落点建议原文「新 js/aosp/heads-up-timing.js」）。
// 快照：v9.84 · 2026-11-03

// —— config.xml 时序七常量（实证值，勿改）——
export const HUN_DECAY_MS = 5000;                  // heads_up_notification_decay（普通横幅驻留）
export const HUN_AUTO_DECAY_MS = 3000;             // auto_heads_up_notification_decay（自动分流档）
export const HUN_MINIMUM_TIME_MS = 2000;           // heads_up_notification_minimum_time（最短驻留）
export const HUN_MINIMUM_TIME_THROTTLING_MS = 500; // ..._with_throttling（节流期下限）
export const HUN_STICKY_MS = 60000;                // sticky_heads_up_notification_time（常驻 60s）
export const HUN_DEFAULT_SNOOZE_MS = 60000;        // heads_up_default_snooze_length_ms（划掉后静默）
export const HUN_TOUCH_ACCEPTANCE_MS = 700;        // ..._touch_acceptance_delay（点按收下缓冲）
// 锁屏图标上限（max_notif_icons_on_lockscreen，#197 实证 3；lock-screen.js 消费）
export const MAX_NOTIF_ICONS_ON_LOCKSCREEN = 3;

/**
 * heads-up 驻留档分流：HeadsUpManagerImpl 按「系统自动分流 vs 应用主动投递」取不同 decay。
 * md3 现通知流均为应用/系统服务主动投递（v9.02 头注在录），缺省 5000；
 * 投递方可标 item.auto（无用户交互意图的系统自动分流类）→ 3000 短驻留。
 */
export function headsUpDecayMs(item) {
  return item && item.auto ? HUN_AUTO_DECAY_MS : HUN_DECAY_MS;
}

/**
 * shouldHeadsUpBecomePinned 同构（HeadsUpManagerImpl）：pin 裁决。
 * md3 通道：投递方标 item.sticky 或 item.pin（闹钟/来电类常驻语义）→ 常驻 60s
 * 不被自动收、不被后续横幅顶掉（顶掉由 Avalanche 队列语义天然杜绝）。
 */
export function shouldHeadsUpBecomePinned(item) {
  return !!(item && (item.sticky === true || item.pin === true));
}

/**
 * 有效驻留时长（armAutoDismiss 取值）：
 *   sticky/pin 类 → HUN_STICKY_MS 60s；
 *   普通类 → 分流 decay，且不早于 minimum_time（防闪没下限）；
 *   节流期（Avalanche isWaiting）下限放宽为 throttling 档 500ms。
 * 现行常量下 decay(3000/5000) ≥ 两档下限，下限为防御性语义（常量若调小仍保真）。
 */
export function headsUpHoldMs(item, opts = {}) {
  if (shouldHeadsUpBecomePinned(item)) return HUN_STICKY_MS;
  const decay = headsUpDecayMs(item);
  const floor = opts.throttled === true ? HUN_MINIMUM_TIME_THROTTLING_MS : HUN_MINIMUM_TIME_MS;
  return Math.max(decay, floor);
}

/**
 * 内容同判：同 id 重发且 title/desc/app 全同 → 视为重复投递（snooze 静默期吞横幅）；
 * 任一字段变化 → 真更新（解除静默正常弹出）。AOSP snooze 按 key 静默，重发同内容
 * 属同 key 重复提醒（日历/重复轮询类），md3 以内容指纹判定（id 相同但内容升级仍放行）。
 */
export function sameNotificationContent(a, b) {
  if (!a || !b) return false;
  return a.title === b.title && a.desc === b.desc && a.app === b.app;
}

/**
 * snooze 状态机（HeadsUpManagerImpl snoozePinned / default_snooze 同构）：
 * 用户划掉（上滑收起）后同 id 通知 60s 内不再弹横幅，中心面板数据层不受影响。
 * now 可注入（测试确定性）；过期自动失忆（惰性删除，无定时器）。
 */
export function createSnoozeStore(options = {}) {
  const now = options.now || (() => Date.now());
  const ttl = options.ttl === undefined ? HUN_DEFAULT_SNOOZE_MS : options.ttl;
  const until = new Map(); // id → expiresAt(epoch ms)
  return {
    isSnoozed(id, at) {
      if (id === undefined || id === null) return false;
      const t = until.get(id);
      if (t === undefined) return false;
      if ((at !== undefined ? at : now()) >= t) { until.delete(id); return false; }
      return true;
    },
    snooze(id) {
      if (id === undefined || id === null) return;
      until.set(id, now() + ttl);
    },
    clear(id) { until.delete(id); },
    size() { return until.size; },
  };
}

/**
 * Avalanche 排队（AvalancheController.kt 单槽等待队列同构，槽宽 = md3 议题规格 3）：
 *   offer(x)：槽未满 → 入 showing 返回 true（立即显示）；槽满 → 入 waiting 返回 false（错峰等待）
 *   free(x) ：显示槽释放 → 返回 waiting 队首（FIFO 错峰放行，调用方重新 offer 入槽）
 *   isWaiting：节流期判定（HeadsUpManagerImpl isWaiting 同名语义）——驱动 minimum_time_with_throttling 档
 * 与旧「堆叠超限挤掉最旧」的本质差：等待而非挤掉——用户未看完的横幅不再被新条顶没。
 */
export function createAvalancheQueue(maxShowing = MAX_NOTIF_ICONS_ON_LOCKSCREEN) {
  const showing = [];
  const waiting = [];
  const same = (a, b) => a === b || (a && b && a.id !== undefined && a.id === b.id);
  return {
    get isWaiting() { return waiting.length > 0; },
    showing() { return showing.slice(); },
    waiting() { return waiting.slice(); },
    offer(x) {
      if (showing.length < maxShowing) { showing.push(x); return true; }
      waiting.push(x);
      return false;
    },
    free(x) {
      const i = showing.findIndex((s) => same(s, x));
      if (i !== -1) showing.splice(i, 1);
      return waiting.length > 0 ? waiting.shift() : null;
    },
  };
}
