// ==================== v198-zen-mode.test.js — #198 ZenMode/ZenPolicy/ZenDeviceEffects 全规格 v9.81 ====================
//
// 覆盖（R71 窗主作业）：
//   · aosp/zen-mode.js 纯逻辑真跑：ZenPolicy 九类×三态×会话发送者×七位视觉（实证 0-8/0-2/0-3/0-6）/
//     Policy.SUPPRESSED_EFFECT_* 九位真值 + DEFAULT 157 逐位分解（010011101）/
//     ZenDeviceEffects 13 位（16-QPR2 FIELD_* 实拉）/ ScheduleCalendar 同日+跨零点区间 /
//     通知三层裁决（进 feed DISALLOW 拦截 / 横幅 ALLOW 穿透 / UNSET 全局禁）/ 存储版本化
//   · 接线锚：notifications.js 进 feed 闸+横幅闸（zenStore 单例）/ quick-settings.js
//     setDndActive 接 manualRule + 设备效果 overlay + 规则每分钟 eval / lock-screen.js
//     锁屏列 NOTIFICATION_LIST 视觉抑制
//   · 回归锚：#197 heads-up 七常量零触碰 / 既有 dnd-mode-active 语义（UNSET 横幅禁）保持

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRIORITY_CATEGORY, PRIORITY_CATEGORY_KEYS, ZEN_STATE, CONVERSATION_SENDERS, PEOPLE_TYPE,
  ZEN_POLICY_VISUAL_EFFECT, SUPPRESSED_EFFECT, DEFAULT_SUPPRESSED_VISUAL_EFFECTS,
  ZEN_DEVICE_EFFECT, ZEN_STORAGE_KEY, ZEN_SCHEMA_VERSION, MANUAL_RULE_ID,
  zenPolicyEffectBit, isVisualSuppressed, suppressedVisualsFor,
  daysToBitmask, bitmaskToDays, nextDay, prevDay, isScheduleInRange, evalScheduleRules,
  categoryAllows, categoryFromNotification, shouldEnqueueNotification, shouldPeekNotification,
  deviceEffectsOverlayStyle, defaultZenState, normalizeZenState, createZenStore,
} from '../ios-desktop/js/aosp/zen-mode.js';
import {
  HUN_DECAY_MS, HUN_TOUCH_ACCEPTANCE_MS,
} from '../ios-desktop/js/aosp/heads-up-timing.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ZEN = readFileSync(join(ROOT, 'ios-desktop/js/aosp/zen-mode.js'), 'utf-8');
const NOTI = readFileSync(join(ROOT, 'ios-desktop/js/notifications.js'), 'utf-8');
const QS = readFileSync(join(ROOT, 'ios-desktop/js/quick-settings.js'), 'utf-8');
const LOCK = readFileSync(join(ROOT, 'ios-desktop/js/lock-screen.js'), 'utf-8');

// —— 内存 storage 桩（工厂隔离测试用） ——
function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('v9.81 #198 ZenPolicy 九类 × 三态 × 发送者 × 人员类型（实证值）', () => {
  it('九类 PRIORITY_CATEGORY_*：REMINDERS 0 … CONVERSATIONS 8（逐项 1:1）', () => {
    expect(PRIORITY_CATEGORY).toEqual({
      REMINDERS: 0, EVENTS: 1, MESSAGES: 2, CALLS: 3, REPEAT_CALLERS: 4,
      ALARMS: 5, MEDIA: 6, SYSTEM: 7, CONVERSATIONS: 8,
    });
    expect(PRIORITY_CATEGORY_KEYS).toEqual([
      'REMINDERS', 'EVENTS', 'MESSAGES', 'CALLS', 'REPEAT_CALLERS',
      'ALARMS', 'MEDIA', 'SYSTEM', 'CONVERSATIONS',
    ]);
  });
  it('三态 STATE_UNSET/ALLOW/DISALLOW = 0/1/2；会话发送者 0-3；人员类型 0-4', () => {
    expect(ZEN_STATE).toEqual({ UNSET: 0, ALLOW: 1, DISALLOW: 2 });
    expect(CONVERSATION_SENDERS).toEqual({ UNSET: 0, ANYONE: 1, IMPORTANT: 2, NONE: 3 });
    expect(PEOPLE_TYPE).toEqual({ UNSET: 0, ANYONE: 1, CONTACTS: 2, STARRED: 3, NONE: 4 });
  });
  it('ZenPolicy 七位视觉枚举序 0-6（位掩码 = 1 << ordinal）', () => {
    expect(ZEN_POLICY_VISUAL_EFFECT).toEqual({
      FULL_SCREEN_INTENT: 0, LIGHTS: 1, PEEK: 2, STATUS_BAR: 3, BADGE: 4, AMBIENT: 5, NOTIFICATION_LIST: 6,
    });
    expect(zenPolicyEffectBit(ZEN_POLICY_VISUAL_EFFECT.FULL_SCREEN_INTENT)).toBe(1);
    expect(zenPolicyEffectBit(ZEN_POLICY_VISUAL_EFFECT.NOTIFICATION_LIST)).toBe(64);
  });
});

describe('v9.81 #198 Policy.SUPPRESSED_EFFECT_* 位真值 + DEFAULT 157（010011101）', () => {
  it('九位真值：SCREEN_OFF 1<<0 … NOTIFICATION_LIST 1<<8（SCREEN_ON 弃用老位在录）', () => {
    expect(SUPPRESSED_EFFECT).toEqual({
      SCREEN_OFF: 1, SCREEN_ON: 2, FULL_SCREEN_INTENT: 4, LIGHTS: 8, PEEK: 16,
      STATUS_BAR: 32, BADGE: 64, AMBIENT: 128, NOTIFICATION_LIST: 256,
    });
  });
  it('DEFAULT_SUPPRESSED_VISUAL_EFFECTS = 157 = SCREEN_OFF|FSI|LIGHTS|PEEK|AMBIENT（ZenModeConfig 注释原文逐位）', () => {
    expect(DEFAULT_SUPPRESSED_VISUAL_EFFECTS).toBe(157);
    const d = DEFAULT_SUPPRESSED_VISUAL_EFFECTS;
    expect(d & SUPPRESSED_EFFECT.SCREEN_OFF).toBeTruthy();
    expect(d & SUPPRESSED_EFFECT.FULL_SCREEN_INTENT).toBeTruthy();
    expect(d & SUPPRESSED_EFFECT.LIGHTS).toBeTruthy();
    expect(d & SUPPRESSED_EFFECT.PEEK).toBeTruthy();
    expect(d & SUPPRESSED_EFFECT.AMBIENT).toBeTruthy();
    expect(d & SUPPRESSED_EFFECT.SCREEN_ON).toBe(0);
    expect(d & SUPPRESSED_EFFECT.STATUS_BAR).toBe(0);
    expect(d & SUPPRESSED_EFFECT.BADGE).toBe(0);
    expect(d & SUPPRESSED_EFFECT.NOTIFICATION_LIST).toBe(0);
    expect(d.toString(2)).toBe('10011101'); // 二进制 010011101（补齐前导零即源码注释）
  });
  it('isVisualSuppressed / suppressedVisualsFor：开启用掩码（缺省 157）/ 关闭归零', () => {
    expect(isVisualSuppressed(157, SUPPRESSED_EFFECT.PEEK)).toBe(true);
    expect(isVisualSuppressed(157, SUPPRESSED_EFFECT.BADGE)).toBe(false);
    expect(isVisualSuppressed(0, SUPPRESSED_EFFECT.PEEK)).toBe(false);
    expect(suppressedVisualsFor(true)).toBe(157);
    expect(suppressedVisualsFor(true, 64)).toBe(64);
    expect(suppressedVisualsFor(false, 157)).toBe(0);
    expect(suppressedVisualsFor(false)).toBe(0);
  });
});

describe('v9.81 #198 ZenDeviceEffects 13 位（16-QPR2 FIELD_* 实拉）', () => {
  it('FIELD_GRAYSCALE 1<<0 … FIELD_BRIGHTNESS_CAP 1<<12（EXTRA_EFFECTS 1<<10 旗标在录）', () => {
    expect(ZEN_DEVICE_EFFECT).toEqual({
      GRAYSCALE: 1, SUPPRESS_AMBIENT_DISPLAY: 2, DIM_WALLPAPER: 4, NIGHT_MODE: 8,
      DISABLE_AUTO_BRIGHTNESS: 16, DISABLE_TAP_TO_WAKE: 32, DISABLE_TILT_TO_WAKE: 64,
      DISABLE_TOUCH: 128, MINIMIZE_RADIO_USAGE: 256, MAXIMIZE_DOZE: 512,
      EXTRA_EFFECTS: 1024, NIGHT_LIGHT: 2048, BRIGHTNESS_CAP: 4096,
    });
  });
  it('overlay 合成：灰度 backdrop-filter / 夜灯暖罩 / 夜间暗罩 / 压暗 / 亮度帽（#198 验收「灰度 = 全屏 filter 级」）', () => {
    expect(deviceEffectsOverlayStyle(0)).toBe(null);
    const gray = deviceEffectsOverlayStyle(ZEN_DEVICE_EFFECT.GRAYSCALE);
    expect(gray.backdropFilter).toBe('grayscale(1)');
    expect(gray.pointerEvents).toBe('none');
    const nl = deviceEffectsOverlayStyle(ZEN_DEVICE_EFFECT.NIGHT_LIGHT);
    expect(nl.background).toContain('255,147,41');
    const combo = deviceEffectsOverlayStyle(ZEN_DEVICE_EFFECT.GRAYSCALE | ZEN_DEVICE_EFFECT.NIGHT_MODE);
    expect(combo.backdropFilter).toBe('grayscale(1)');
    expect(combo.background).toContain('rgba(0,0,0');
    const cap = deviceEffectsOverlayStyle(ZEN_DEVICE_EFFECT.BRIGHTNESS_CAP);
    expect(cap.backdropFilter).toContain('brightness(0.55)');
    // 纯设备语义位（web 无实体）：不产出样式但状态机照常在位
    expect(deviceEffectsOverlayStyle(ZEN_DEVICE_EFFECT.DISABLE_TOUCH)).toBe(null);
  });
});

describe('v9.81 #198 ScheduleCalendar（AOSP 同构：星期位掩码 + 起止分钟 + 跨零点）', () => {
  it('daysToBitmask / bitmaskToDays / nextDay：Calendar 常量 1-7 → 1 << (day-1) 往返', () => {
    expect(daysToBitmask([])).toBe(0);
    expect(daysToBitmask([1, 2, 3, 4, 5])).toBe(0b11111); // 工作日（SUNDAY=1 → bit0）
    expect(daysToBitmask([2, 3, 4, 5, 6])).toBe(0b111110); // 周一至周五
    expect(bitmaskToDays(127)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(bitmaskToDays(daysToBitmask([6, 7]))).toEqual([6, 7]);
    expect(daysToBitmask([0, 8, 'x'])).toBe(0); // 越界/非法天防御
    expect(nextDay(7)).toBe(1);
    expect(nextDay(1)).toBe(2);
    expect(prevDay(1)).toBe(7);
    expect(prevDay(7)).toBe(6);
  });
  it('同日区间：工作日 09:00-18:00（540/1080）', () => {
    const rule = { days: [2, 3, 4, 5, 6], startMinute: 540, endMinute: 1080 };
    expect(isScheduleInRange(rule, { day: 2, minuteOfDay: 539 })).toBe(false);
    expect(isScheduleInRange(rule, { day: 2, minuteOfDay: 540 })).toBe(true);
    expect(isScheduleInRange(rule, { day: 6, minuteOfDay: 1079 })).toBe(true);
    expect(isScheduleInRange(rule, { day: 6, minuteOfDay: 1080 })).toBe(false);
    expect(isScheduleInRange(rule, { day: 7, minuteOfDay: 600 })).toBe(false); // 周六不在集
  });
  it('跨零点：每晚 22:00-07:00（1320/420）——AOSP 出厂 EVERY_NIGHT 形态，跨零点昨夜延续分支（isInSchedule(-1) 同构）', () => {
    const rule = { days: [1, 2, 3, 4, 5, 6, 7], startMinute: 1320, endMinute: 420 };
    expect(isScheduleInRange(rule, { day: 3, minuteOfDay: 1320 })).toBe(true);  // 当日 22:00 起（offset 0）
    expect(isScheduleInRange(rule, { day: 3, minuteOfDay: 1439 })).toBe(true);  // 23:59
    expect(isScheduleInRange(rule, { day: 4, minuteOfDay: 0 })).toBe(true);     // 次日零点（昨夜延续）
    expect(isScheduleInRange(rule, { day: 4, minuteOfDay: 419 })).toBe(true);   // 06:59
    expect(isScheduleInRange(rule, { day: 4, minuteOfDay: 420 })).toBe(false);  // 07:00 退出
    // 周五夜规则（days 仅含周五+周日）：周五 22:00 → 周六晨在区间（昨夜 prevDay(7)=6 ∈ days 延续）
    const friSun = { days: [6, 1], startMinute: 1320, endMinute: 420 };
    expect(isScheduleInRange(friSun, { day: 6, minuteOfDay: 1380 })).toBe(true);  // 周五 23:00（offset 0）
    expect(isScheduleInRange(friSun, { day: 7, minuteOfDay: 300 })).toBe(true);   // 周六 05:00（昨夜周五延续）
    expect(isScheduleInRange(friSun, { day: 7, minuteOfDay: 420 })).toBe(false);  // 周六 07:00 退出
    expect(isScheduleInRange(friSun, { day: 7, minuteOfDay: 1380 })).toBe(false); // 周六 23:00（周六∉days）
    expect(isScheduleInRange(friSun, { day: 2, minuteOfDay: 300 })).toBe(true);   // 周一晨（周日夜 prevDay(2)=1 ∈ days 延续）
  });
  it('start === end 永不激活（歧义防误开，头注在录）+ evalScheduleRules 按 enabled 过滤', () => {
    expect(isScheduleInRange({ days: [1], startMinute: 600, endMinute: 600 }, { day: 1, minuteOfDay: 600 })).toBe(false);
    const rules = [
      { id: 'a', days: [1, 2, 3, 4, 5], startMinute: 540, endMinute: 1080, enabled: true },
      { id: 'b', days: [1, 2, 3, 4, 5], startMinute: 540, endMinute: 1080, enabled: false },
    ];
    expect(evalScheduleRules(rules, { day: 3, minuteOfDay: 600 })).toEqual(['a']);
    expect(evalScheduleRules([], { day: 3, minuteOfDay: 600 })).toEqual([]);
    expect(evalScheduleRules(null, { day: 3, minuteOfDay: 600 })).toEqual([]);
  });
});

describe('v9.81 #198 通知三层裁决（九类 × 三态）', () => {
  const states = {
    REMINDERS: 0, EVENTS: 0, MESSAGES: 2, CALLS: 1, REPEAT_CALLERS: 0,
    ALARMS: 1, MEDIA: 0, SYSTEM: 2, CONVERSATIONS: 0,
  };
  it('categoryAllows：UNSET 继承放行 / ALLOW 放行 / DISALLOW 拦截；未知类别放行', () => {
    expect(categoryAllows(states, PRIORITY_CATEGORY.MESSAGES)).toBe(false); // DISALLOW
    expect(categoryAllows(states, PRIORITY_CATEGORY.SYSTEM)).toBe(false);
    expect(categoryAllows(states, PRIORITY_CATEGORY.CALLS)).toBe(true);      // ALLOW
    expect(categoryAllows(states, PRIORITY_CATEGORY.MEDIA)).toBe(true);      // UNSET 继承
    expect(categoryAllows({}, PRIORITY_CATEGORY.CALLS)).toBe(true);
    expect(categoryAllows(states, 99)).toBe(true);
  });
  it('categoryFromNotification：zenCategory 显式通道（大小写不敏感）→ kind 映射 → 未知 SYSTEM', () => {
    expect(categoryFromNotification({ zenCategory: 'calls' })).toBe(PRIORITY_CATEGORY.CALLS);
    expect(categoryFromNotification({ zenCategory: 'ALARMS' })).toBe(PRIORITY_CATEGORY.ALARMS);
    expect(categoryFromNotification({ kind: 'message' })).toBe(PRIORITY_CATEGORY.MESSAGES);
    expect(categoryFromNotification({ kind: 'alarm' })).toBe(PRIORITY_CATEGORY.ALARMS);
    expect(categoryFromNotification({ kind: 'music' })).toBe(PRIORITY_CATEGORY.MEDIA);
    expect(categoryFromNotification({ app: 'x', title: 't' })).toBe(PRIORITY_CATEGORY.SYSTEM);
    expect(categoryFromNotification(null)).toBe(PRIORITY_CATEGORY.SYSTEM);
  });
  it('shouldEnqueueNotification（AOSP：被拦截通知不进 shade）：勿扰开 DISALLOW 拦 / 关全放', () => {
    const item = { zenCategory: 'MESSAGES' };
    expect(shouldEnqueueNotification({ priorityStates: states }, item, true)).toBe(false);
    expect(shouldEnqueueNotification({ priorityStates: states }, { zenCategory: 'ALARMS' }, true)).toBe(true);
    expect(shouldEnqueueNotification({ priorityStates: states }, item, false)).toBe(true);
  });
  it('shouldPeekNotification（横幅）：勿扰开仅 ALLOW 穿透 / UNSET 维持全局横幅禁（md3 既有语义）', () => {
    const st = { priorityStates: states };
    expect(shouldPeekNotification(st, { zenCategory: 'ALARMS' }, true)).toBe(true);
    expect(shouldPeekNotification(st, { zenCategory: 'MESSAGES' }, true)).toBe(false);
    expect(shouldPeekNotification(st, { app: 'x' }, true)).toBe(false); // UNSET → 全局禁
    expect(shouldPeekNotification(st, { app: 'x' }, false)).toBe(true);
  });
});

describe('v9.81 #198 出厂默认态 + 存储版本化（XML_VERSION_MODES_UI 迁移锚同构）', () => {
  it('defaultZenState：AOSP getDefaultZenPolicy 布尔语义 → 三态（allow=true→ALLOW/false→UNSET）', () => {
    const s = defaultZenState();
    expect(s.version).toBe(1);
    expect(s.manualActive).toBe(false);
    expect(s.suppressedVisuals).toBe(157);
    expect(s.priorityStates.ALARMS).toBe(1);
    expect(s.priorityStates.MEDIA).toBe(1);
    expect(s.priorityStates.CALLS).toBe(1);
    expect(s.priorityStates.MESSAGES).toBe(1);
    expect(s.priorityStates.REPEAT_CALLERS).toBe(1);
    expect(s.priorityStates.CONVERSATIONS).toBe(1);
    expect(s.priorityStates.SYSTEM).toBe(0);
    expect(s.priorityStates.REMINDERS).toBe(0);
    expect(s.priorityStates.EVENTS).toBe(0);
    expect(s.conversationSenders).toBe(2); // DEFAULT_ALLOW_CONV_FROM = IMPORTANT
    expect(s.rules).toEqual([]);
    expect(s.deviceEffects).toBe(0);
  });
  it('normalizeZenState：损坏/数组/版本高于当前 → 走默认；字段逐项兜底；规则清洗', () => {
    expect(normalizeZenState(null).version).toBe(1);
    expect(normalizeZenState('x').version).toBe(1);
    expect(normalizeZenState([]).version).toBe(1);
    expect(normalizeZenState({ version: 99 }).version).toBe(1);
    expect(normalizeZenState({ version: 0 }).version).toBe(1);
    const s = normalizeZenState({
      version: 1, manualActive: true, ruleDriven: true, suppressedVisuals: 64,
      priorityStates: { MESSAGES: 2, BOGUS: 9, CALLS: 7 },
      conversationSenders: 1, deviceEffects: 3,
      rules: [{ id: 'r1', days: [2, 3, 4, 5, 6], startMinute: 540, endMinute: 1080, enabled: false },
        { id: 'r2', days: [9], startMinute: -5, endMinute: 99999 },
        { nope: 1 }],
    });
    expect(s.manualActive).toBe(true);
    expect(s.ruleDriven).toBe(true);
    expect(s.suppressedVisuals).toBe(64);
    expect(s.priorityStates.MESSAGES).toBe(2);
    expect(s.priorityStates.CALLS).toBe(1);   // 非法值兜底回出厂默认（DEFAULT_ALLOW_CALLS=true）
    expect(s.priorityStates.BOGUS).toBeUndefined();
    expect(s.conversationSenders).toBe(1);
    expect(s.deviceEffects).toBe(3);
    expect(s.rules).toHaveLength(2);
    expect(s.rules[0]).toEqual({ id: 'r1', label: '', days: [2, 3, 4, 5, 6], startMinute: 540, endMinute: 1080, enabled: false });
    expect(s.rules[1].days).toEqual([]);      // 越界天清空
    expect(s.rules[1].startMinute).toBe(0);   // 越界分钟钳制
    expect(s.rules[1].endMinute).toBe(1439);
  });
  it('createZenStore：损坏存档回退 / 往返持久化 / setManual 清 ruleDriven', () => {
    const st = memStorage();
    st.setItem(ZEN_STORAGE_KEY, '{broken json');
    const s1 = createZenStore({ storage: st });
    expect(s1.getState().version).toBe(1);
    s1.setManual(true);
    expect(s1.getState().manualActive).toBe(true);
    s1.__reset(normalizeZenState(JSON.parse(st.getItem(ZEN_STORAGE_KEY))));
    expect(s1.getState().manualActive).toBe(true); // 已落盘
    s1.getState().ruleDriven = true;
    s1.setManual(true);
    expect(s1.getState().ruleDriven).toBe(false);  // 手动开启清规则驱动标记
  });
  it('createZenStore：规则 upsert/remove/setEnabled 与 evalRules 激活→自动关断状态机', () => {
    const st = memStorage();
    const s = createZenStore({ storage: st });
    s.upsertRule({ label: '工作日勿扰', days: [2, 3, 4, 5, 6], startMinute: 540, endMinute: 1080 });
    expect(s.getState().rules[0].id).toBe('zen-rule-1');
    s.upsertRule({ id: 'zen-rule-1', label: '改名', days: [2, 3, 4, 5, 6], startMinute: 540, endMinute: 1080 });
    expect(s.getState().rules).toHaveLength(1);
    expect(s.getState().rules[0].label).toBe('改名');
    // 到点激活
    const r1 = s.evalRules({ day: 3, minuteOfDay: 600 });
    expect(r1.changed).toBe(true);
    expect(r1.activated).toBe(true);
    expect(s.getState().manualActive).toBe(true);
    expect(s.getState().ruleDriven).toBe(true);
    // 仍在区间：不抖动
    const r2 = s.evalRules({ day: 3, minuteOfDay: 601 });
    expect(r2.changed).toBe(false);
    expect(s.getState().manualActive).toBe(true);
    // 出区间：ruleDriven 才自动关断
    const r3 = s.evalRules({ day: 3, minuteOfDay: 1081 });
    expect(r3.deactivated).toBe(true);
    expect(s.getState().manualActive).toBe(false);
    expect(s.getState().ruleDriven).toBe(false);
    // 手动开启后规则过期不抢关（manual 优先）
    s.setManual(true);
    const r4 = s.evalRules({ day: 3, minuteOfDay: 1200 });
    expect(r4.changed).toBe(false);
    expect(s.getState().manualActive).toBe(true);
    s.removeRule('zen-rule-1');
    expect(s.getState().rules).toHaveLength(0);
  });
  it('持久化键与 schema 版本常量（AOMP MANUAL_RULE_ID / 版本化迁移锚）', () => {
    expect(ZEN_STORAGE_KEY).toBe('ios-desktop:zen-mode');
    expect(ZEN_SCHEMA_VERSION).toBe(1);
    expect(MANUAL_RULE_ID).toBe('MANUAL_RULE');
  });
});

describe('v9.81 #198 接线锚（真实消费不空转，#149 纪律）', () => {
  it('notifications.js：import zen-mode + 进 feed 闸（shouldEnqueue）+ 横幅闸（shouldPeek ALLOW 穿透）', () => {
    expect(NOTI).toContain("from './aosp/zen-mode.js'");
    expect(NOTI).toContain('shouldEnqueueNotification');
    expect(NOTI).toContain('shouldPeekNotification');
    expect(NOTI).toContain('zenStore');
  });
  it('quick-settings.js：setDndActive 接 zenStore.setManual + 设备效果 overlay 消费 + 规则每分钟 eval', () => {
    expect(QS).toContain("from './aosp/zen-mode.js'");
    expect(QS).toContain('setManual');
    expect(QS).toContain('deviceEffectsOverlayStyle');
    expect(QS).toContain('evalRules');
    expect(QS).toContain('zen-device-effects'); // overlay DOM id
  });
  it('lock-screen.js：锁屏列 NOTIFICATION_LIST 视觉抑制消费（currentSuppressedVisuals）', () => {
    expect(LOCK).toContain("from './aosp/zen-mode.js'");
    expect(LOCK).toContain('NOTIFICATION_LIST');
    expect(LOCK).toContain('currentSuppressedVisuals');
  });
});

describe('v9.81 #198 回归锚（既有语义零触碰）', () => {
  it('#197 heads-up 七常量零触碰（decay 5000 / touch 700 仍在位）', () => {
    expect(HUN_DECAY_MS).toBe(5000);
    expect(HUN_TOUCH_ACCEPTANCE_MS).toBe(700);
  });
  it('notifications.js 既有 dnd-mode-active 守卫语义保持（UNSET 类横幅禁）', () => {
    expect(NOTI).toContain("dnd-mode-active");
    expect(QS).toContain("dnd-mode-active");
  });
  it('zen-mode.js 纯逻辑纪律：单例仅 zenStore，其余零共享副作用（工厂闭包）', () => {
    expect(ZEN).toMatch(/export const zenStore = createZenStore\(\)/);
    expect(ZEN).not.toMatch(/document\./);
    expect(ZEN).not.toMatch(/window\./);
    expect(ZEN).not.toMatch(/querySelector/);
  });
});
