// ==================== alarm-state.test.js — #208 AlarmStateManager 状态机移植（R105 窗 v11.24） ====================
//
// 分层断言（v160-clock-core / v157-bedtime 同款范式）：
//   A. 权威快照在库（AlarmInstance.java + ClockContract.java 本窗实拉入库 + SettingsDAO 默认值锚）+ 关键行逐字
//   B. clock-core 纯逻辑真跑（九态决策矩阵 = registerInstance L615-708 逐字 + AlarmInstance 时窗四出口
//      + snoozedInstance = setSnoozeState L438-458 + updateParentAlarmDecision = updateParentAlarm L223-255）
//   C. alarm.mjs 承载面静态锚（预通知两段 / 超时静音 / SNOOZE 散件退役 / dismiss 父处置 / 观测面）
//   D. 版本真源（package.json 11.24.0 + 本文件标题锚 v11.24）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

// ---------- 沙箱：经典脚本 IIFE 无 export——new Function 注入 stub window 提取（v160 同款） ----------
function loadClockCore() {
  const sandboxWindow = {};
  const fn = new Function('window', `${read('ios-desktop/js/clock-core.js')}\n;return window.__clockCore;`);
  return fn(sandboxWindow, undefined);
}
const CC = loadClockCore();
const ST = CC.AlarmInstanceState;
// 实例工厂：alarmTime 指定当日 h:m，state 指定（registerInstanceState 真跑入参）
const mkInst = (h, m, state, day = 6) => new CC.AlarmInstance({ alarmId: 7, alarmTime: new Date(2026, 10, day, h, m, 0, 0), state, label: 'e2e' });
// 决策简写：action/state
const decide = (inst, nowMs, opts) => CC.registerInstanceState(inst, nowMs, opts);
const NOW = new Date(2026, 10, 6, 9, 0, 0, 0).getTime();

// ==================== A. 权威快照在库 ====================
describe('v11.24 · A. AlarmStateManager 移植权威快照（docs/reference/deskclock/）', () => {
  it('A1 AlarmInstance.java + ClockContract.java 在库且非空（本窗 blob 实拉）', () => {
    expect(read('docs/reference/deskclock/AlarmInstance.java').length).toBeGreaterThan(5000);
    expect(read('docs/reference/deskclock/ClockContract.java').length).toBeGreaterThan(2000);
    expect(read('docs/reference/deskclock/AlarmStateManager.java').length).toBeGreaterThan(20000);
  });

  it('A2 AlarmInstance.java 三偏移常量逐字（L43/L48/L53）+ INVALID_ID（L58）+ 出厂 SILENT（构造）', () => {
    const src = read('docs/reference/deskclock/AlarmInstance.java');
    expect(src).toContain('public static final int LOW_NOTIFICATION_HOUR_OFFSET = -2;');
    expect(src).toContain('public static final int HIGH_NOTIFICATION_MINUTE_OFFSET = -30;');
    expect(src).toContain('private static final int MISSED_TIME_TO_LIVE_HOUR_OFFSET = 12;');
    expect(src).toContain('public static final long INVALID_ID = -1;');
    expect(src).toContain('mAlarmState = SILENT_STATE;');
    expect(src).toContain('calendar.add(Calendar.HOUR_OF_DAY, LOW_NOTIFICATION_HOUR_OFFSET)');
    expect(src).toContain('calendar.add(Calendar.MINUTE, HIGH_NOTIFICATION_MINUTE_OFFSET)');
    expect(src).toContain('calendar.add(Calendar.HOUR, MISSED_TIME_TO_LIVE_HOUR_OFFSET)');
    expect(src).toContain('if (timeoutMinutes < 0)');
  });

  it('A3 ClockContract.java InstancesColumns 九态数值逐字（0-8）', () => {
    const src = read('docs/reference/deskclock/ClockContract.java');
    expect(src).toContain('int SILENT_STATE = 0;');
    expect(src).toContain('int LOW_NOTIFICATION_STATE = 1;');
    expect(src).toContain('int HIDE_NOTIFICATION_STATE = 2;');
    expect(src).toContain('int HIGH_NOTIFICATION_STATE = 3;');
    expect(src).toContain('int SNOOZE_STATE = 4;');
    expect(src).toContain('int FIRED_STATE = 5;');
    expect(src).toContain('int MISSED_STATE = 6;');
    expect(src).toContain('int DISMISSED_STATE = 7;');
    expect(src).toContain('int PREDISMISSED_STATE = 8;');
  });

  it('A4 AlarmStateManager.java registerInstance 决策树 + fire buffer + snooze/parent 逐字行', () => {
    const src = read('docs/reference/deskclock/AlarmStateManager.java');
    expect(src).toContain('public static final int ALARM_FIRE_BUFFER = 15;');
    expect(src).toContain('if (instance.mAlarmState == AlarmInstance.DISMISSED_STATE)');
    expect(src).toContain('boolean hasTimeout = timeoutTime != null && currentTime.after(timeoutTime);');
    expect(src).toContain('if (currentTime.after(missedTTL))');
    expect(src).toContain('alarmBuffer.add(Calendar.SECOND, ALARM_FIRE_BUFFER);');
    expect(src).toContain('} else if (instance.mAlarmState == AlarmInstance.SNOOZE_STATE)');
    expect(src).toContain('if (instance.mAlarmState == AlarmInstance.HIDE_NOTIFICATION_STATE)');
    expect(src).toContain('newAlarmTime.add(Calendar.MINUTE, snoozeMinutes);');
    expect(src).toContain('if (!alarm.daysOfWeek.isRepeating())');
    expect(src).toContain('nextRepeatedInstance = alarm.createInstanceAfter(instance.getAlarmTime());');
  });

  it('A5 SettingsDAO.java auto-silence 与 snooze 默认 "10" 同源（L341-353）', () => {
    const src = read('docs/reference/deskclock/SettingsDAO.java');
    expect(src).toContain('prefs.getString(SettingsActivity.KEY_AUTO_SILENCE, "10")');
    expect(src).toContain('prefs.getString(SettingsActivity.KEY_ALARM_SNOOZE, "10")');
    expect(src).toContain('Default value must match the one in res/xml/settings.xml');
  });
});

// ==================== B. clock-core 纯逻辑真跑 ====================
describe('v11.24 · B. registerInstanceState 决策矩阵真跑（registerInstance L615-708 逐字）', () => {
  it('B1 九态枚举数值逐字（ClockContract InstancesColumns）', () => {
    expect(ST).toEqual({
      SILENT: 0, LOW_NOTIFICATION: 1, HIDE_NOTIFICATION: 2, HIGH_NOTIFICATION: 3,
      SNOOZE: 4, FIRED: 5, MISSED: 6, DISMISSED: 7, PREDISMISSED: 8,
    });
    expect(CC.ALARM_FIRE_BUFFER).toBe(15);
    expect(CC.ALARM_INSTANCE_INVALID_ID).toBe(-1);
  });

  it('B2 AlarmInstance 四时窗出口：low=-2h / high=-30min / missedTTL=+12h / timeout=+min（<0→null）', () => {
    const inst = mkInst(9, 0, ST.SILENT);
    expect(inst.getLowNotificationTime().getTime()).toBe(inst.alarmTime.getTime() - 2 * 3600000);
    expect(inst.getHighNotificationTime().getTime()).toBe(inst.alarmTime.getTime() - 30 * 60000);
    expect(inst.getMissedTimeToLive().getTime()).toBe(inst.alarmTime.getTime() + 12 * 3600000);
    expect(inst.getTimeout(10).getTime()).toBe(inst.alarmTime.getTime() + 10 * 60000);
    expect(inst.getTimeout(0).getTime()).toBe(inst.alarmTime.getTime());
    expect(inst.getTimeout(-1)).toBe(null);
    expect(inst.getTimeout(null)).toBe(null);
  });

  it('B3 不可变 copy-on-write：withState/withAlarmTime 返回新实例且原实例不被改动', () => {
    const inst = mkInst(9, 0, ST.SILENT);
    const s = inst.withState(ST.LOW_NOTIFICATION);
    expect(s.state).toBe(ST.LOW_NOTIFICATION);
    expect(inst.state).toBe(ST.SILENT);
    expect(s.alarmTime).toBe(inst.alarmTime); // 时刻共享（不可变纪律）
    const t = inst.withAlarmTime(new Date(2026, 10, 7, 8, 30));
    expect(t.alarmTime.getDate()).toBe(7);
    expect(inst.alarmTime.getDate()).toBe(6);
    expect(t.id).toBe(inst.id);
  });

  it('B4 时窗三段：远处 SILENT / low 窗（-2h~）LOW / high 窗（-30min~）HIGH（Java after 严格语义：恰在窗沿=下一档）', () => {
    // 11:00 实例，now 9:00:00.000：low=9:00:00.000，after(9:00)=false → SILENT（窗沿严格）
    expect(decide(mkInst(11, 0, ST.SILENT), NOW).action).toBe('silent');
    // now 9:00:00.001：>low 且 <=high(10:30) → LOW_NOTIFICATION
    expect(decide(mkInst(11, 0, ST.SILENT), NOW + 1).action).toBe('low');
    // 9:20 实例（-20min）：>high(8:50) 且未过点 → HIGH_NOTIFICATION
    expect(decide(mkInst(9, 20, ST.SILENT), NOW).action).toBe('high');
  });

  it('B5 过点 15s fire buffer：buffer 内补响 FIRED / 超过 → MISSED（L676-683）', () => {
    const past5s = new CC.AlarmInstance({ alarmId: 7, alarmTime: new Date(NOW - 5000), state: ST.SILENT });
    expect(decide(past5s, NOW).action).toBe('fire');
    const past16s = new CC.AlarmInstance({ alarmId: 7, alarmTime: new Date(NOW - 16000), state: ST.SILENT });
    expect(decide(past16s, NOW).action).toBe('missed');
    // 恰在 buffer 沿（+15000ms）：before(15s)=false → MISSED（严格语义）
    const atBuffer = new CC.AlarmInstance({ alarmId: 7, alarmTime: new Date(NOW - 15000), state: ST.SILENT });
    expect(decide(atBuffer, NOW).action).toBe('missed');
  });

  it('B6 MISSED TTL 12h 清账 + DISMISSED 不可复活（L628-631/L669-671）', () => {
    const ancient = new CC.AlarmInstance({ alarmId: 7, alarmTime: new Date(2026, 10, 5, 20, 0), state: ST.SILENT }); // 13h 前
    expect(decide(ancient, NOW).action).toBe('delete');
    expect(decide(mkInst(9, 5, ST.DISMISSED), NOW).action).toBe('delete');
    expect(decide(mkInst(9, 5, ST.DISMISSED), NOW).state).toBe(ST.DISMISSED);
  });

  it('B7 FIRED 保响铃 + 超时落穿 MISSED（L633-639 严格边界：恰在 timeout=仍响）', () => {
    const firing = new CC.AlarmInstance({ alarmId: 7, alarmTime: new Date(NOW), state: ST.FIRED });
    expect(decide(firing, NOW).action).toBe('fire'); // timeout=now+10min 未过 → 保持
    const pastTimeout = new CC.AlarmInstance({ alarmId: 7, alarmTime: new Date(NOW - 10 * 60000), state: ST.FIRED });
    expect(decide(pastTimeout, NOW).action).toBe('fire'); // timeout=NOW 恰沿（after 严格语义→尚未超时，仍响）
    expect(decide(pastTimeout, NOW + 1).action).toBe('missed'); // +1ms 越沿 → 落穿时窗段 → MISSED
    const neverTimeout = new CC.AlarmInstance({ alarmId: 7, alarmTime: new Date(NOW - 20 * 60000), state: ST.FIRED });
    expect(decide(neverTimeout, NOW, { autoSilenceMinutes: -1 }).action).toBe('fire'); // "None" 永不超时
  });

  it('B8 SNOOZE 保通知不更新时间 + MISSED 时间回拨复活标记（L640-658/L684-689）', () => {
    expect(decide(mkInst(9, 5, ST.SNOOZE), NOW).action).toBe('snooze-notify');
    expect(decide(mkInst(9, 5, ST.SNOOZE), NOW).state).toBe(ST.SNOOZE);
    const reactivated = decide(mkInst(9, 30, ST.MISSED), NOW); // 回拨：now < alarmTime
    expect(reactivated.action).toBe('low'); // 落穿到常规时窗（9:30-2h=7:30 已过）
    expect(reactivated.reactivated).toBe(true);
    expect(decide(mkInst(9, 30, ST.SILENT), NOW).reactivated).toBe(false);
  });

  it('B9 PREDISMISSED 两分支：未到点保持 / 过点删除（L659-665）+ HIDE 保持隐藏（L693-695）', () => {
    expect(decide(mkInst(9, 5, ST.PREDISMISSED), NOW).action).toBe('predismiss');
    expect(decide(mkInst(8, 0, ST.PREDISMISSED), NOW).action).toBe('delete');
    expect(decide(mkInst(10, 30, ST.HIDE_NOTIFICATION), NOW).action).toBe('hide'); // low 窗内曾隐藏
    expect(decide(mkInst(10, 30, ST.SILENT), NOW).action).toBe('low');
  });

  it('B10 snoozedInstance：alarmTime=now+snooze / state=SNOOZE / id·alarmId 保留（L444-453）', () => {
    const src = mkInst(9, 0, ST.FIRED);
    const s = CC.snoozedInstance(src, NOW, 10);
    expect(s.state).toBe(ST.SNOOZE);
    expect(s.alarmTime.getTime()).toBe(NOW + 10 * 60000);
    expect(s.alarmId).toBe(7);
    expect(s.id).toBe(src.id);
    expect(src.alarmTime.getTime()).toBe(new Date(2026, 10, 6, 9, 0).getTime()); // 原实例不变
  });

  it('B11 updateParentAlarmDecision 三出路：非重复 disable / deleteAfterUse delete / 重复 reschedule 顺延（L223-255）', () => {
    expect(CC.updateParentAlarmDecision({ id: 7, days: [] }, mkInst(9, 0, ST.MISSED), NOW)).toMatchObject({ op: 'disable' });
    expect(CC.updateParentAlarmDecision({ id: 7, days: [], deleteAfterUse: true }, mkInst(9, 0, ST.MISSED), NOW)).toMatchObject({ op: 'delete' });
    const rep = CC.updateParentAlarmDecision({ id: 7, hour: 9, minute: 0, isPm: 0, days: [0, 1] }, mkInst(9, 0, ST.MISSED), NOW);
    expect(rep.op).toBe('reschedule');
    expect(rep.nextAlarmTime).not.toBe(null); // 下一启用日实例（四步法同构）
    // L245-248：state>FIRED 且新实例时刻=旧实例时刻 → 从旧实例时刻再顺延
    const sameEdge = CC.updateParentAlarmDecision(
      { id: 7, hour: 9, minute: 0, isPm: 0, days: [0, 1, 2, 3, 4, 5, 6] },
      mkInst(9, 0, ST.MISSED, 7), // 实例在 11-07（周六），days 全周 → 下一实例=11-07 09:00 撞同一时刻
      new Date(2026, 10, 7, 9, 30).getTime(),
    );
    expect(sameEdge.op).toBe('reschedule');
    expect(sameEdge.nextAlarmTime.getTime()).toBe(new Date(2026, 10, 8, 9, 0).getTime()); // 顺延到 11-08
  });

  it('B12 createInstanceFromAlarm：出厂 SILENT + alarmTime=nextAlarmDate 四步法', () => {
    const inst = CC.createInstanceFromAlarm({ id: 42, hour: 9, minute: 0, isPm: 0, days: [1], label: '工作日' }, new Date(2026, 10, 6, 9, 0));
    expect(inst.state).toBe(ST.SILENT);
    expect(inst.alarmId).toBe(42);
    expect(inst.label).toBe('工作日');
    expect(inst.alarmTime.getTime()).toBe(CC.nextAlarmDate({ hour: 9, minute: 0, isPm: 0, days: [1] }, new Date(2026, 10, 6, 9, 0)).getTime());
  });
});

// ==================== C. alarm.mjs 承载面静态锚 ====================
describe('v11.24 · C. alarm.mjs 实例状态机接线静态锚', () => {
  const ALARM = read('ios-desktop/apps/clock-app/alarm.mjs');

  it('C1 常量同源：SNOOZE/AUTO_SILENCE 默认 10（SettingsDAO 同源）+ tick 委派链', () => {
    expect(ALARM).toContain('const ALARM_SNOOZE_MINUTES=10,ALARM_AUTO_SILENCE_MINUTES=10;');
    expect(ALARM).toContain('alarmStateTick(n,ap,h12,m);');
    expect(ALARM).toContain('maybeSunrise(n);');
    expect(read('ios-desktop/apps/clock-app/app.mjs')).toContain('alarmTick(n,h,m,ap,h12);');
  });

  it('C2 预通知两段：LOW -2h / HIGH -30min 实例键去重 + __system.notify 统一 SDK', () => {
    expect(ALARM).toContain("notifyViaHost('闹钟预提醒'");
    expect(ALARM).toContain("notifyViaHost('闹钟即将响铃'");
    expect(ALARM).toContain('rec.lowKey=instKeyOf(rec.instance);');
    expect(ALARM).toContain("appId:'clock',appName:'时钟'");
    expect(ALARM).toContain('window.__system&&typeof window.__system.notify===\'function\'');
  });

  it('C3 MISSED 超时自动静音：ringStart 时基 + 错过的闹钟通知 + 非重复 disable', () => {
    expect(ALARM).toContain('nowMs-firingStart>silenceMin()*60000');
    expect(ALARM).toContain("notifyViaHost('错过的闹钟'");
    expect(ALARM).toContain('if(a&&(!a.days||!a.days.length))a.active=0;');
    expect(ALARM).toContain('withState(st.MISSED)');
  });

  it('C4 SNOOZE 散件退役：snoozedInstance 接管 + 降级兜底保留 + dismiss 出账父处置', () => {
    expect(ALARM).toContain('rec.instance=core.snoozedInstance(rec.instance,Date.now(),snoozeMin());');
    expect(ALARM).toContain("setTimeout(()=>sR('稍后提醒','10分钟Snooze时间到'),6e5);"); // 登记表缺失降级路径
    expect(ALARM).toContain('withState(core.AlarmInstanceState.DISMISSED)');
    expect(ALARM).toContain('SNOOZE→FIRED 调度转换');
    // 旧「响铃即 disable 一次性闹钟」提前量退役（rA() 不再出现在响铃分支）
    const ringBranch = ALARM.slice(ALARM.indexOf('const alarmTick='), ALARM.indexOf('const onCustomRingtone='));
    expect(ringBranch).not.toContain('a.active=0');
    expect(ringBranch).toContain('firingIds.push(a.id)');
  });

  it('C5 观测面 + e2e 直改入口（__clockPhoneMode 同款先例）', () => {
    expect(ALARM).toContain('window.__alarmStateProbe');
    expect(ALARM).toContain('window.__clockAlarmSilenceMin');
    expect(ALARM).toContain('window.__clockAlarmSnoozeMin');
    expect(ALARM).toContain('SNOOZE 进行中（实例时刻已被覆写为 snooze 目标）或 FIRED 响铃中 →保留');
  });
});

// ==================== D. 版本真源 ====================
describe('v11.24 · D. 版本真源', () => {
  it('D1 package.json 11.24.0', () => {
    expect(JSON.parse(read('package.json')).version).toBe('11.24.0');
  });
  it('D2 本文件标题锚 v11.24', () => {
    expect(read('tests/alarm-state.test.js')).toContain('v11.24');
  });
  it('D3 clock-core.js 出口扩容（状态机七出口）', () => {
    expect(read('ios-desktop/js/clock-core.js')).toContain('registerInstanceState: registerInstanceState');
    expect(read('ios-desktop/js/clock-core.js')).toContain('updateParentAlarmDecision: updateParentAlarmDecision');
    expect(read('ios-desktop/js/clock-core.js')).toContain('snoozedInstance: snoozedInstance');
    // v11.24 重锚：#225 基线修复新增 normalizeGmtOffsetLabel 出口（跨 ICU 的
    // GMT±HH:MM 规范化），出口 28→29 为合法增长，非状态机语义变化。
    expect(Object.keys(CC).length).toBe(29);
  });
});
