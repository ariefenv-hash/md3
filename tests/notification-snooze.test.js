// ==================== notification-snooze.test.js — #90 通知 Snooze 状态机 ====================
//
// 覆盖（R88 窗加餐，NotificationSnooze.java aosp-mirror main 实源核对）：
//   · SNOOZE_OPTIONS/DEFAULT 常量（SystemUI config.xml 实源同值）
//   · formatSnoozeDescription/Confirmation（createOption showInHours 整除语义）
//   · createSnoozeMachine 三态机 + handleCloseControls 三分支（updateXxx 逐条同构）
//   · resolveSnoozeWakeAt/resolveDueSnoozes（复活双通道真源）
//   · 接线锚：notifications.js 档位机/清扫/已延后区/undo/getNotifications 过滤
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SNOOZE_OPTIONS,
  DEFAULT_SNOOZE_MINUTES,
  SNOOZE_STATE,
  formatSnoozeDescription,
  formatSnoozeConfirmation,
  createSnoozeMachine,
  resolveSnoozeWakeAt,
  resolveDueSnoozes,
  snoozeOptionsSnapshot,
} from '../ios-desktop/js/aosp/notification-snooze.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const NOTIS = readFileSync(R('js/notifications.js'), 'utf8');

describe('v90-A · 常量真源（SystemUI config.xml 实源同值）', () => {
  it('A1 档位表 [15,30,60,120] 分钟 + 默认档 60', () => {
    expect(SNOOZE_OPTIONS).toEqual([15, 30, 60, 120]);
    expect(Object.isFrozen(SNOOZE_OPTIONS)).toBe(true);
    expect(DEFAULT_SNOOZE_MINUTES).toBe(60);
  });

  it('A2 档位快照：描述/确认/默认标记一次成型', () => {
    const snap = snoozeOptionsSnapshot();
    expect(snap.map((o) => o.minutes)).toEqual([15, 30, 60, 120]);
    expect(snap.find((o) => o.isDefault).minutes).toBe(60);
    expect(snap[0].description).toBe('15 分钟');
    expect(snap[2].confirmation).toBe('已延后 1 小时');
  });
});

describe('v90-B · 文案（createOption showInHours 整除语义）', () => {
  it('B1 分钟/小时分档 + 非整除小时整除向下', () => {
    expect(formatSnoozeDescription(15)).toBe('15 分钟');
    expect(formatSnoozeDescription(59)).toBe('59 分钟');
    expect(formatSnoozeDescription(60)).toBe('1 小时');
    expect(formatSnoozeDescription(90)).toBe('1 小时'); // 90/60 整除=1（AOSP minutes/60 整除语义）
    expect(formatSnoozeDescription(120)).toBe('2 小时');
  });

  it('B2 确认文案 snoozed_for_time 同构', () => {
    expect(formatSnoozeConfirmation(30)).toBe('已延后 30 分钟');
    expect(formatSnoozeConfirmation(60)).toBe('已延后 1 小时');
  });
});

describe('v90-C · createSnoozeMachine 三态机（guts 同构）', () => {
  it('C1 初始 NORMAL + toggleOptions 展开/收起（mExpanded 值差分）', () => {
    const m = createSnoozeMachine();
    expect(m.state).toBe(SNOOZE_STATE.NORMAL);
    expect(m.expanded).toBe(false);
    m.toggleOptions();
    expect(m.expanded).toBe(true);
    expect(m.state).toBe(SNOOZE_STATE.EXPANDED);
    m.showOptions(false); // showSnoozeOptions(false) 幂等同构
    expect(m.expanded).toBe(false);
    expect(m.state).toBe(SNOOZE_STATE.NORMAL);
  });

  it('C2 setSelected 同构：选定 → SNOOZED + 档位收起', () => {
    const m = createSnoozeMachine();
    m.toggleOptions();
    const opt = m.options.find((o) => o.minutes === 30);
    m.select(opt, true);
    expect(m.state).toBe(SNOOZE_STATE.SNOOZED);
    expect(m.expanded).toBe(false);
    expect(m.selected).toBe(opt);
    expect(m.selected.confirmation).toBe('已延后 30 分钟');
  });

  it('C3 handleCloseControls 分支①：展开态且非 force → 仅收起消费关闭（不提交）', () => {
    const m = createSnoozeMachine();
    m.toggleOptions();
    const res = m.handleCloseControls();
    expect(res.consumed).toBe(true);
    expect(res.snooze).toBe(null);
    expect(m.expanded).toBe(false); // 收起即消化本次关闭
  });

  it('C4 handleCloseControls 分支②：已选定 → mSnoozing 提交档位', () => {
    const m = createSnoozeMachine();
    const opt = m.options.find((o) => o.minutes === 15);
    m.select(opt, true);
    const res = m.handleCloseControls();
    expect(res.consumed).toBe(true);
    expect(res.snooze).toBe(opt);
    expect(m.snoozing).toBe(true);
  });

  it('C5 handleCloseControls 分支③：未选定兜底 setSelected(options 默认档) 且不消费', () => {
    const m = createSnoozeMachine();
    const res = m.handleCloseControls();
    expect(res.consumed).toBe(false);
    expect(m.selected.isDefault).toBe(true);
    expect(m.selected.minutes).toBe(60); // config_notification_snooze_time_default 实源
  });

  it('C6 undoSnooze 同构：撤销回 NORMAL + 清 snoozing', () => {
    const m = createSnoozeMachine();
    m.select(m.options[0], true);
    m.handleCloseControls();
    m.undo();
    expect(m.state).toBe(SNOOZE_STATE.NORMAL);
    expect(m.selected).toBe(null);
    expect(m.snoozing).toBe(false);
  });

  it('C7 非法档位拒绝（防御面）', () => {
    const m = createSnoozeMachine();
    m.select({ minutes: 999 }, true);
    expect(m.selected).toBe(null);
  });
});

describe('v90-D · 复活双通道真源', () => {
  it('D1 resolveSnoozeWakeAt = now + minutes*60000', () => {
    const now = 1700000000000;
    expect(resolveSnoozeWakeAt(15, now)).toBe(now + 15 * 60000);
    expect(resolveSnoozeWakeAt(120, now)).toBe(now + 120 * 60000);
    expect(resolveSnoozeWakeAt(15)).toBeGreaterThan(Date.now() + 14 * 60000);
  });

  it('D2 resolveDueSnoozes 分区：due 到期复活 / rest 仍延后', () => {
    const now = 1000;
    const items = [
      { id: 'a', snoozeUntil: 900 },   // 已到期
      { id: 'b', snoozeUntil: 1000 },  // 恰好到期（<= 边界含等号）
      { id: 'c', snoozeUntil: 2000 },  // 未到期
      { id: 'd' },                      // 未延后
    ];
    const { due, rest } = resolveDueSnoozes(items, now);
    expect(due.map((n) => n.id)).toEqual(['a', 'b']);
    expect(rest.map((n) => n.id)).toEqual(['c', 'd']);
  });

  it('D3 空表安全', () => {
    expect(resolveDueSnoozes([])).toEqual({ due: [], rest: [] });
    expect(resolveDueSnoozes(null)).toEqual({ due: [], rest: [] });
  });
});

describe('v90-E · notifications.js 接线锚', () => {
  it('E1 档位机导入 + 每卡一机 + 提交链', () => {
    expect(NOTIS).toContain("from './aosp/notification-snooze.js'");
    expect(NOTIS).toContain('createSnoozeMachine()');
    expect(NOTIS).toContain('snoozeMachine.handleCloseControls()');
    expect(NOTIS).toContain('applySnooze(item, res.snooze)');
    expect(NOTIS).toContain('scheduleSnoozeWake(item)');
  });

  it('E2 getNotifications 过滤延后期（shade/锁屏/状态栏同真源）', () => {
    expect(NOTIS).toContain('return [...notifications].filter((n) => !(n && n.snoozeUntil));');
  });

  it('E3 渲染期惰性清扫 + 复活定时双通道', () => {
    expect(NOTIS).toContain('resolveDueSnoozes(notifications)');
    expect(NOTIS).toContain('function scheduleSnoozeWake(item)');
    expect(NOTIS).toContain('function wakeSnoozed(id)');
  });

  it('E4 卡片延后钮/档位行/已延后区/撤销入口', () => {
    expect(NOTIS).toContain('noti-snooze-btn');
    expect(NOTIS).toContain('noti-snooze-options');
    expect(NOTIS).toContain('renderSnoozedSection(container, snoozedNotis)');
    expect(NOTIS).toContain('noti-snoozed-header');
    expect(NOTIS).toContain('noti-snooze-undo');
    // 钮/片 pointerdown 截停（不入卡滑手势链：延后钮 + 档位片两处）
    expect(NOTIS.match(/pointerdown', \(e\) => e\.stopPropagation\(\)/g)?.length).toBe(2);
  });

  it('E5 撤销复活即持久化 + 广播', () => {
    const idx = NOTIS.indexOf('noti-snooze-undo');
    const seg = NOTIS.slice(idx, idx + 600);
    expect(seg).toContain('delete item.snoozeUntil');
    expect(seg).toContain('persistNotifications()');
    expect(seg).toContain('scheduleNotificationsChanged()');
  });
});
