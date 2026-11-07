// ==================== notification-snooze.js — 通知延后状态机（NotificationSnooze 同构 · 零 DOM） ====================
// v10.38 #90：AOSP A12+ 通知 Snooze 移植（aosp-mirror main 实源核对）：
//   · SystemUI/statusbar/notification/row/NotificationSnooze.java（20.8KB 全文提测）——
//     guts 展开态机 showSnoozeOptions / setSelected / undoSnooze / handleCloseControls 三分支
//   · SystemUI/res/values/config.xml 实源：config_notification_snooze_times = [15,30,60,120]
//     （分钟）+ config_notification_snooze_time_default = 60
//   · createOption 文案语义：minutes >= 60 → 小时格式（showInHours 整除），<60 → 分钟格式；
//     确认文案 snoozed_for_time（「已延后 {desc}」）
//
// 恢复通道边界（诚实标注）：AOSP snooze 由 NotificationManagerService.snoozeNotification
// 跨重启持久（untilMs 落 system_server）；md3 通知为渲染进程内存 + localStorage（会话期），
// 到期复活走 setTimeout + 渲染期惰性清扫双通道，跨重启由持久化 snoozeUntil 字段 + 清扫兜底。

/** 档位表单一真源（config_notification_snooze_times 实源同值，分钟） */
export const SNOOZE_OPTIONS = Object.freeze([15, 30, 60, 120]);

/** 默认档（config_notification_snooze_time_default 实源同值） */
export const DEFAULT_SNOOZE_MINUTES = 60;

/** guts 状态字面量（NotificationSnooze mExpanded/mSelectedOption/mSnoozing 归纳） */
export const SNOOZE_STATE = Object.freeze({
  NORMAL: 'normal',       // 未展开未选择
  EXPANDED: 'expanded',   // 档位行展开
  SNOOZED: 'snoozed',     // 已选定延后（等 handleCloseControls 提交或 undo）
});

/** 档位描述（createOption showInHours 语义：minutes>=60 整除为小时，zh 权威格式） */
export function formatSnoozeDescription(minutes) {
  const m = Number(minutes) || 0;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return h === 1 ? '1 小时' : `${h} 小时`;
  }
  return `${m} 分钟`;
}

/** 确认文案（snoozed_for_time 语义：「已延后 {description}」） */
export function formatSnoozeConfirmation(minutes) {
  return `已延后 ${formatSnoozeDescription(minutes)}`;
}

/**
 * 延后状态机（NotificationSnooze guts 同构；每实例承载单卡语义——AOSP guts 实例同型）
 * @param {Object} [cfg] { options, defaultMinutes }
 */
export function createSnoozeMachine(cfg) {
  const options = (cfg && cfg.options) || SNOOZE_OPTIONS;
  const defaultMinutes = (cfg && cfg.defaultMinutes) != null ? cfg.defaultMinutes : DEFAULT_SNOOZE_MINUTES;
  const items = options.map((minutes) => ({
    minutes,
    description: formatSnoozeDescription(minutes),
    confirmation: formatSnoozeConfirmation(minutes),
    isDefault: minutes === defaultMinutes, // getDefaultSnoozeOptions：i==0 || ==defaultSnooze 为默认档
  }));
  const machine = {
    options: items,
    state: SNOOZE_STATE.NORMAL,
    expanded: false,
    selected: null,
    snoozing: false,
    /** showSnoozeOptions(show) 同构：展开/收起档位行（mExpanded 值差分） */
    showOptions(show) {
      const want = !!show;
      if (machine.expanded !== want) {
        machine.expanded = want;
        machine.state = want ? SNOOZE_STATE.EXPANDED : SNOOZE_STATE.NORMAL;
      }
      return machine;
    },
    toggleOptions() {
      return machine.showOptions(!machine.expanded);
    },
    /** setSelected(option, userAction) 同构：选定 → 确认文案 + 收起 + hideSelectedOption */
    select(option, userAction) {
      if (!option || !items.includes(option)) return machine;
      machine.selected = option;
      machine.expanded = false;
      machine.state = SNOOZE_STATE.SNOOZED;
      return machine;
    },
    selectDefault() {
      const def = items.find((o) => o.isDefault) || items[0];
      return machine.select(def, false);
    },
    /** undoSnooze 同构：撤销选定回 NORMAL（closeControls(save=false) 语义） */
    undo() {
      machine.selected = null;
      machine.snoozing = false;
      machine.expanded = false;
      machine.state = SNOOZE_STATE.NORMAL;
      return machine;
    },
    /**
     * handleCloseControls(save, force) 三分支同构：
     *   ① mExpanded && !force → 仅收起，消费关闭（consumed=true，不提交）
     *   ② mSelectedOption != null → mSnoozing=true，提交 snooze 事件
     *   ③ 兜底 → setSelected(options[0], false) 且不消费（guts 自行关闭）
     * @returns {{consumed:boolean, snooze:option|null}}
     */
    handleCloseControls({ save = true, force = false } = {}) {
      if (machine.expanded && !force) {
        machine.showOptions(false);
        return { consumed: true, snooze: null };
      }
      if (machine.selected != null) {
        machine.snoozing = true;
        return { consumed: true, snooze: machine.selected };
      }
      machine.selectDefault();
      return { consumed: false, snooze: null };
    },
  };
  return machine;
}

/** 复活时刻：now + minutes*60000（NotificationManagerService.snoozeNotification untilMs 同义） */
export function resolveSnoozeWakeAt(minutes, now) {
  return Math.round((now || Date.now()) + minutes * 60000);
}

/**
 * 到期复活清扫（渲染期惰性通道，兜 setTimeout 漏网/跨页驻留）
 * @param {Array<Object>} items 通知数组（含 snoozeUntil 字段）
 * @returns {{due:Array, rest:Array}} due=已到期集合（应复活），rest=仍延后
 */
export function resolveDueSnoozes(items, now) {
  const t = now || Date.now();
  const due = (items || []).filter((n) => n && n.snoozeUntil && n.snoozeUntil <= t);
  const rest = (items || []).filter((n) => !(n && n.snoozeUntil && n.snoozeUntil <= t));
  return { due, rest };
}

/** 档位快照（设置/渲染消费：描述 + 确认 + 默认标记一次成型） */
export function snoozeOptionsSnapshot() {
  return SNOOZE_OPTIONS.map((minutes) => ({
    minutes,
    description: formatSnoozeDescription(minutes),
    confirmation: formatSnoozeConfirmation(minutes),
    isDefault: minutes === DEFAULT_SNOOZE_MINUTES,
  }));
}
