// ==================== v160-clock-core.test.js — #160 时钟状态机下沉（R56 窗 v10.16） ====================
//
// 分层断言（word-core v8.39 同款沙箱范式 + 快照逐字锚 + 应用接线静态锚）：
//   A. 权威快照在库（docs/reference/deskclock/ 八件）+ 关键行逐字
//   B. Timer 状态机真跑（data/Timer.java L132-142/L170-230/L288-326 逐字语义）
//   C. Stopwatch + Lap 真跑（Stopwatch.java L66-112 + StopwatchModel.addLap L140-160）
//   D. Alarm 下次响铃真跑（provider/Alarm.java getNextAlarmTime L375-400 四步 + Weekdays L214-228 距离循环）
//   E. 世界时钟 DST 决定性观测（City.getTimeZone 语义：IANA tz；伦敦 BST 夏令时 ±1h 实证 + 存量固定偏移回落）
//   F. 应用接线静态锚（index.html 消费点 + 经典 script 引入）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

// ---------- 沙箱：经典脚本 IIFE 无 export——new Function 注入 stub window 提取 ----------
function loadClockCore() {
  const sandboxWindow = {};
  const fn = new Function('window', `${read('ios-desktop/js/clock-core.js')}\n;return window.__clockCore;`);
  return fn(sandboxWindow, undefined);
}
const CC = loadClockCore();

// ==================== A. 权威快照在库 ====================
describe('v10.16 · A. DeskClock 权威快照（docs/reference/deskclock/ 八件）', () => {
  it('A1 八件快照在库且非空', () => {
    const files = ['Timer.java', 'Stopwatch.java', 'StopwatchModel.java', 'Alarm.java',
      'Weekdays.java', 'City.java', 'AlarmModel.java', 'AlarmStateManager.java'];
    for (const f of files) {
      const src = read('docs/reference/deskclock/' + f);
      expect(src.length).toBeGreaterThan(1000);
    }
  });

  it('A2 Timer.java State 枚举五态逐字（L41）+ getRemainingTime 归一化注释锚（L137-141）', () => {
    const src = read('docs/reference/deskclock/Timer.java');
    expect(src).toContain('RUNNING(1), PAUSED(2), EXPIRED(3), RESET(4), MISSED(5)');
    expect(src).toContain('public long getRemainingTime()');
    expect(src).toContain('return mRemainingTime - Math.max(0, timeSinceStart);');
  });

  it('A3 Alarm.java getNextAlarmTime 四步权威（L375-400）：+1 天/距离/DST 重设时分', () => {
    const src = read('docs/reference/deskclock/Alarm.java');
    expect(src).toContain('public Calendar getNextAlarmTime(Calendar currentTime)');
    expect(src).toContain('nextInstanceTime.add(Calendar.DAY_OF_YEAR, 1);');
    expect(src).toContain('final int addDays = daysOfWeek.getDistanceToNextDay(nextInstanceTime);');
    expect(src).toContain('// Daylight Savings Time can alter the hours and minutes when adjusting the day above.');
    expect(src).toContain('nextInstanceTime.set(Calendar.HOUR_OF_DAY, hour);');
  });

  it('A4 Weekdays.java getDistanceToNextDay 距离循环逐字（0-6/-1 语义）+ StopwatchModel addLap 语义', () => {
    const wd = read('docs/reference/deskclock/Weekdays.java');
    expect(wd).toContain('public int getDistanceToNextDay(Calendar time)');
    expect(wd).toContain('is always between 0 and 6 inclusive');
    const sm = read('docs/reference/deskclock/StopwatchModel.java');
    expect(sm).toContain('final long prevAccumulatedTime = laps.isEmpty() ? 0 : laps.get(0).getAccumulatedTime();');
    expect(sm).toContain('final Lap lap = new Lap(lapNumber, lapTime, totalTime);');
    expect(sm).toContain('laps.add(0, lap);');
    expect(sm).toContain('return getLaps().size() < 98;');
  });

  it('A5 City.java IANA TimeZone 语义（getTimeZone L71）', () => {
    const src = read('docs/reference/deskclock/City.java');
    expect(src).toContain('private final TimeZone mTimeZone;');
    expect(src).toContain('public TimeZone getTimeZone() { return mTimeZone; }');
  });
});

// ==================== B. Timer 状态机真跑 ====================
describe('v10.16 · B. Timer 状态机（data/Timer.java 逐字语义真跑）', () => {
  it('B1 出厂 RESET 态：totalLength=remaining=length（TimerModel 创建语义 + L122-125 谓词）', () => {
    const t = CC.Timer.create(1, 60000, '泡面');
    expect(t.state).toBe(CC.TimerState.RESET);
    expect(t.isReset()).toBe(true);
    expect(t.getRemainingTime(1000)).toBe(60000);
    expect(t.getElapsedTime(1000)).toBe(0);
  });

  it('B2 start→RUNNING 记 lastStart；getRemainingTime = remaining - max(0, now-lastStart)（L132-142 逐字）', () => {
    const t = CC.Timer.create(1, 60000).start(1000);
    expect(t.isRunning()).toBe(true);
    expect(t.getRemainingTime(1000)).toBe(60000);
    expect(t.getRemainingTime(11000)).toBe(50000);
    expect(t.getElapsedTime(11000)).toBe(10000);
  });

  it('B3 倒流归一化：now < lastStart 时时间段钳 0（L137-140 注释语义：单调递减保证）', () => {
    const t = CC.Timer.create(1, 60000).start(10000);
    expect(t.getRemainingTime(5000)).toBe(60000); // max(0, 5000-10000)=0
  });

  it('B4 pause 冻结 remaining（L182-192）；再 start 从冻结值续走（不可变 copy-on-write）', () => {
    const t0 = CC.Timer.create(1, 60000).start(1000);
    const t1 = t0.pause(11000);
    expect(t1.isPaused()).toBe(true);
    expect(t1.remainingTime).toBe(50000);
    expect(t1.lastStartTime).toBe(CC.Timer.UNUSED); // L190 UNUSED
    expect(t0.isRunning()).toBe(true); // 旧实例不受影响
    const t2 = t1.start(60000);
    expect(t2.getRemainingTime(61000)).toBe(49000); // 50000 - 1000
  });

  it('B5 expire：remaining 钳 min(0,·)、totalLength=0（L197-205）', () => {
    const t = CC.Timer.create(1, 3000).start(0);
    const e = t.expire(5000);
    expect(e.isExpired()).toBe(true);
    expect(e.remainingTime).toBe(-2000); // 权威语义（L129-130 文档「expired will return a negative amount」）：超时多久可查
    expect(e.totalLength).toBe(0);
  });

  it('B6 addMinute：RUNNING → remaining+60s 且 totalLength 同加（L318-326）', () => {
    const t = CC.Timer.create(1, 30000).start(0);
    const t1 = t.addMinute(1000);
    expect(t1.remainingTime).toBe(90000);
    expect(t1.totalLength).toBe(90000);
    expect(t1.lastStartTime).toBe(0); // 非 EXPIRED→RUNNING 分支不重置（L306-307）
    expect(t1.getRemainingTime(2000)).toBe(88000); // 90000 - (2000-0)：addMinute 不重置 lastStart（L304-308）
  });

  it('B7 addMinute：EXPIRED → 重启为 60s RUNNING（L319-321 + setRemainingTime L300-303 转 RUNNING）', () => {
    const t = CC.Timer.create(1, 1000).start(0);
    const e = t.expire(2000);
    const r = e.addMinute(5000);
    expect(r.isRunning()).toBe(true);
    expect(r.remainingTime).toBe(60000);
    expect(r.lastStartTime).toBe(5000);
    expect(r.getRemainingTime(6000)).toBe(59000);
  });

  it('B8 reset：totalLength=remaining=length、lastStart=UNUSED（L223-230）', () => {
    const t = CC.Timer.create(1, 30000).start(0).pause(5000);
    const r = t.reset();
    expect(r.isReset()).toBe(true);
    expect(r.totalLength).toBe(30000);
    expect(r.remainingTime).toBe(30000);
    expect(r.lastStartTime).toBe(CC.Timer.UNUSED);
  });

  it('B9 五态枚举同值（State.getValue 逐字：RUNNING=1/PAUSED=2/EXPIRED=3/RESET=4/MISSED=5）', () => {
    expect(CC.TimerState).toEqual({ RUNNING: 1, PAUSED: 2, EXPIRED: 3, RESET: 4, MISSED: 5 });
  });
});

// ==================== C. Stopwatch + Lap 真跑 ====================
describe('v10.16 · C. Stopwatch + Lap（Stopwatch.java + StopwatchModel.addLap 逐字语义真跑）', () => {
  it('C1 出厂 RESET；start→RUNNING；getTotalTime = accumulated + max(0, now-lastStart)（L66-76）', () => {
    const s0 = CC.Stopwatch.reset();
    expect(s0.isReset()).toBe(true);
    expect(s0.getTotalTime(1000)).toBe(0);
    const s1 = s0.start(1000);
    expect(s1.isRunning()).toBe(true);
    expect(s1.getTotalTime(6000)).toBe(5000);
  });

  it('C2 pause 冻结 accumulated；再 start 续走不丢（L88-105）', () => {
    const s0 = CC.Stopwatch.reset().start(0);
    const p = s0.pause(10000);
    expect(p.isPaused()).toBe(true);
    expect(p.accumulatedTime).toBe(10000);
    expect(p.getTotalTime(99999)).toBe(10000); // 非 RUNNING 恒 accumulated
    const s2 = p.start(50000);
    expect(s2.getTotalTime(52000)).toBe(12000);
  });

  it('C3 reset 清零（L110-112 RESET_STOPWATCH）+ 倒流归一化 max(0,·)', () => {
    const s = CC.Stopwatch.reset().start(0).pause(5000).reset();
    expect(s.isReset()).toBe(true);
    expect(s.accumulatedTime).toBe(0);
    const s2 = CC.Stopwatch.reset().start(10000);
    expect(s2.getTotalTime(8000)).toBe(0); // now < lastStart 钳 0
  });

  it('C4 addLap：lapTime = total - prevAccum、laps.add(0,·) 保序、非 running 返回 null（L140-160）', () => {
    const sw = CC.Stopwatch.reset().start(0);
    let laps = CC.addLap([], sw, 10000);
    expect(laps).toEqual([{ number: 1, lapTime: 10000, accumulatedTime: 10000 }]);
    laps = CC.addLap(laps, sw, 25000);
    expect(laps[0]).toEqual({ number: 2, lapTime: 15000, accumulatedTime: 25000 });
    expect(laps[1].number).toBe(1); // 新圈在前（unshift 语义）
    const paused = sw.pause(30000);
    expect(CC.addLap(laps, paused, 31000)).toBe(null); // L141 !isRunning
  });

  it('C5 addLap 98 圈上限（StopwatchModel L172 canAddMoreLaps）', () => {
    const sw = CC.Stopwatch.reset().start(0);
    let laps = [];
    for (let i = 0; i < CC.MAX_LAPS; i++) laps = CC.addLap(laps, sw, (i + 1) * 1000);
    expect(laps.length).toBe(98);
    expect(CC.addLap(laps, sw, 99000)).toBe(null);
  });

  it('C6 fastestSlowestLaps：最快/最慢圈号；单圈不标记（视图 isF/isS 条件同构）', () => {
    const laps = [
      { number: 1, lapTime: 5000, accumulatedTime: 5000 },
      { number: 2, lapTime: 3000, accumulatedTime: 8000 },
      { number: 3, lapTime: 7000, accumulatedTime: 15000 },
    ];
    const fs = CC.fastestSlowestLaps(laps);
    expect(fs).toEqual({ fastest: 2, slowest: 3 });
    expect(CC.fastestSlowestLaps([{ number: 1, lapTime: 100, accumulatedTime: 100 }])).toEqual({ fastest: null, slowest: null });
  });
});

// ==================== D. Alarm 下次响铃真跑 ====================
describe('v10.16 · D. Alarm 下次响铃（provider/Alarm.java getNextAlarmTime 四步 + Weekdays 距离循环真跑）', () => {
  const NO_REPEAT = { hour: 9, minute: 0, isPm: 0, days: [] };

  it('D1 今日同时刻未过 → 今日（getNextAlarmTime 步骤①②：不 +1 天）', () => {
    const now = new Date(2026, 10, 2, 7, 0, 0, 0); // 周一 07:00
    const next = CC.nextAlarmDate(NO_REPEAT, now);
    expect(next.getDate()).toBe(2);
    expect(next.getHours()).toBe(9);
    expect(next.getMinutes()).toBe(0);
    expect(next.getSeconds()).toBe(0);
  });

  it('D2 今日同时刻已过 → 明日（步骤②：DAY_OF_YEAR + 1）', () => {
    const now = new Date(2026, 10, 2, 10, 0, 0, 0);
    const next = CC.nextAlarmDate(NO_REPEAT, now);
    expect(next.getDate()).toBe(3);
    expect(next.getHours()).toBe(9);
  });

  it('D3 重复闹钟跳到下一个启用日（步骤③：getDistanceToNextDay）', () => {
    // 2026-11-02 是周一；days=[0,6]（周日/周六）→ 下次 = 周六 11-07
    const now = new Date(2026, 10, 2, 10, 0, 0, 0);
    const next = CC.nextAlarmDate({ hour: 9, minute: 0, isPm: 0, days: [0, 6] }, now);
    expect(next.getDay()).toBe(6);
    expect(next.getDate()).toBe(7);
  });

  it('D4 distanceToNextDay 逐字：当天启用=0；顺延循环；无启用日=-1（Weekdays L214-228）', () => {
    expect(CC.distanceToNextDay([1, 2, 3, 4, 5], 1)).toBe(0); // 周一→周一
    expect(CC.distanceToNextDay([1, 2, 3, 4, 5], 5)).toBe(0); // 周五→周五
    expect(CC.distanceToNextDay([1, 2, 3, 4, 5], 6)).toBe(2); // 周六→周一
    expect(CC.distanceToNextDay([0, 6], 1)).toBe(5); // 周一→周六
    expect(CC.distanceToNextDay([], 3)).toBe(-1);
    expect(CC.distanceToNextDay(null, 3)).toBe(-1);
  });

  it('D5 步骤④ DST 重设时分：返回值恒为整分整秒（minute:00.000，跨日加法后重设语义）', () => {
    const now = new Date(2026, 6, 15, 10, 0, 0, 123); // 毫秒不为 0
    const next = CC.nextAlarmDate({ hour: 9, minute: 30, isPm: 1, days: [0, 1, 2, 3, 4, 5, 6] }, now);
    expect(next.getMinutes()).toBe(30);
    expect(next.getSeconds()).toBe(0);
    expect(next.getMilliseconds()).toBe(0);
    expect(next.getHours()).toBe(21); // 下午 9:30 → 21
  });

  it('D6 alarmRingsThisMinute：hour24/minute/days 三域判定（active=false 恒不响）', () => {
    const at = new Date(2026, 10, 2, 9, 30, 0, 0);
    expect(CC.alarmRingsThisMinute({ hour: 9, minute: 30, isPm: 0, days: [1], active: 1 }, at)).toBe(true);
    expect(CC.alarmRingsThisMinute({ hour: 9, minute: 30, isPm: 0, days: [2], active: 1 }, at)).toBe(false);
    expect(CC.alarmRingsThisMinute({ hour: 9, minute: 30, isPm: 0, days: [], active: 1 }, at)).toBe(true);
    expect(CC.alarmRingsThisMinute({ hour: 9, minute: 31, isPm: 0, days: [1], active: 1 }, at)).toBe(false);
    expect(CC.alarmRingsThisMinute({ hour: 9, minute: 30, isPm: 0, days: [1], active: 0 }, at)).toBe(false);
    expect(CC.alarmRingsThisMinute({ hour: 12, minute: 0, isPm: 1, days: [], active: 1 }, new Date(2026, 10, 2, 12, 0, 0))).toBe(true); // 下午 12 点=正午 h24=12
  });

  it('D7 hour24Of 与 md3 旧式逐字同构（isPm?(h%12+12):(h%12)）', () => {
    expect(CC.hour24Of({ hour: 12, isPm: 0 })).toBe(0);
    expect(CC.hour24Of({ hour: 12, isPm: 1 })).toBe(12);
    expect(CC.hour24Of({ hour: 9, isPm: 1 })).toBe(21);
    expect(CC.hour24Of({ hour: 8, isPm: 0 })).toBe(8);
  });
});

// ==================== E. 世界时钟 DST 决定性观测 ====================
describe('v10.16 · E. 世界时钟 IANA DST（City.getTimeZone 语义：修固定偏移真实 bug）', () => {
  it('E1 伦敦 1 月（GMT）与 7 月（BST）决定性 ±1h：固定偏移旧实现 7 月错 1 小时', () => {
    const london = { tz: 'Europe/London' };
    const jan = CC.worldClockInfo(new Date('2026-01-15T12:00:00Z'), london);
    const jul = CC.worldClockInfo(new Date('2026-07-15T12:00:00Z'), london);
    expect(jan.h24).toBe(12);
    expect(jan.utcOffsetLabel).toBe('GMT+00:00');
    expect(jan.inDst).toBe(false);
    expect(jul.h24).toBe(13); // 旧固定 offset=0 实现会给 12 → 议题实锤的错 1 小时
    expect(jul.utcOffsetLabel).toBe('GMT+01:00');
    expect(jul.inDst).toBe(true);
  });

  it('E2 纽约 7 月 EDT（GMT-04:00）+ isDay 昼夜判定', () => {
    const ny = { tz: 'America/New_York' };
    const jul = CC.worldClockInfo(new Date('2026-07-15T12:00:00Z'), ny);
    expect(jul.h24).toBe(8);
    expect(jul.utcOffsetLabel).toBe('GMT-04:00');
    expect(jul.inDst).toBe(true);
    expect(jul.isDay).toBe(true); // 08:00 白天
  });

  it('E3 dayPeriod/hour12 中文语义（zh-CN Intl 同源）', () => {
    const sh = { tz: 'Asia/Shanghai' };
    const am = CC.worldClockInfo(new Date('2026-01-15T01:00:00Z'), sh); // 北京 09:00
    const pm = CC.worldClockInfo(new Date('2026-01-15T09:00:00Z'), sh); // 北京 17:00
    expect(am.h24).toBe(9);
    expect(am.dayPeriod).toBe('上午');
    expect(am.hour12).toBe(9);
    expect(pm.h24).toBe(17);
    expect(pm.dayPeriod).toBe('下午');
    expect(pm.hour12).toBe(5);
  });

  it('E4 存量固定偏移回落：无 tz 城市输出与旧 uWCT 公式一致（inDst=false 诚实标注无 DST 能力）', () => {
    const legacy = { offset: 8 }; // 旧 localStorage 城市形态
    const info = CC.worldClockInfo(new Date('2026-01-15T12:00:00Z'), legacy);
    // 旧公式：new Date(now + tzOffset*60e3 + offset*36e5)；沙箱本地时区无关——用 UTC 分量断言
    const t = new Date(new Date('2026-01-15T12:00:00Z').getTime() + (new Date('2026-01-15T12:00:00Z').getTimezoneOffset() * 60e3) + 8 * 36e5);
    expect(info.h24).toBe(t.getHours());
    expect(info.minute).toBe(t.getMinutes());
    expect(info.inDst).toBe(false);
  });

  it('E5 无 offset 无 tz 返回 null（调用方降级）', () => {
    expect(CC.worldClockInfo(new Date(), {})).toBe(null);
    expect(CC.worldClockInfo(new Date(), null)).toBe(null);
  });
});

// ==================== F. 应用接线静态锚 ====================
// v10.16 #160 二期：clock-app 拆为 app.mjs 组合根 + 五域模块，静态锚按「七文件拼接读取」命中
const CLOCK_APP_ALL = ['index.html','app.mjs','alarm.mjs','world.mjs','timer.mjs','stopwatch.mjs','bedtime.mjs'];
describe('v10.16 · F. 五文件拆分接线静态锚（#160 二期：alarm/world/timer/stopwatch/bedtime.mjs）', () => {
  const page = CLOCK_APP_ALL.map((f) => read('ios-desktop/apps/clock-app/' + f)).join('\n');

  it('F1 经典 script 两级上行引入 + ESM 五文件入口（v10.16 #160 二期拆分）', () => {
    expect(page).toContain('<script src="../../js/clock-core.js"></script>');
    expect(page).toContain('<script type="module" src="./app.mjs"></script>');
    expect(CLOCK_APP_ALL).toEqual(['index.html','app.mjs','alarm.mjs','world.mjs','timer.mjs','stopwatch.mjs','bedtime.mjs']);
  });

  it('F2 五消费点接 core（uNH/uWCT/tick 响铃/计时器/秒表）', () => {
    expect(page).toContain('window.__clockCore.nextAlarmDate(a,now)');
    expect(page).toContain('window.__clockCore.worldClockInfo(new Date(),c)');
    expect(page).toContain('window.__clockCore.alarmRingsThisMinute(a,n)');
    expect(page).toContain('window.__clockCore.Timer.create');
    expect(page).toContain('window.__clockCore.addLap(swLaps,sw,performance.now())');
    expect(page).toContain('window.__clockCore.fastestSlowestLaps(swLaps)');
    expect(page).toContain('window.__clockCore.Stopwatch.reset()');
  });

  it('F3 Timer 操作走逐字转换 + tick deadline 语义', () => {
    expect(page).toContain('tm.t.isExpired()?tm.t.reset().start(Date.now())');
    expect(page).toContain('tm.t.addMinute(Date.now())');
    expect(page).toContain('t.t.getRemainingTime(Date.now())');
    expect(page).toContain('t.t=t.t.expire(Date.now())');
  });

  it('F4 CD 预置表带 IANA tz + select-city 透传 tz + pin payload 带 tz', () => {
    expect(page).toContain("tz:'Europe/London'");
    expect(page).toContain("tz:'America/New_York'");
    expect(page).toContain("tz:c.tz});save();iWC();}");
    expect(page).toContain("offset: c.offset, tz: c.tz });");
  });

  it('F5 clock-core.js IIFE 零 export（经典 <script> 纪律）+ 唯一出口', () => {
    const src = read('ios-desktop/js/clock-core.js');
    expect(src).toContain('(function () {');
    expect(src).toContain('window.__clockCore = {');
    expect(src).not.toContain('export ');
    expect(src).not.toContain('localStorage.');
    expect(src).not.toContain('document.');
  });
});
