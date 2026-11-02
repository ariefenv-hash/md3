// ==================== clock-core.js — AOSP DeskClock 纯逻辑下沉（#160 第一里程碑 v9.48） ====================
//
// 经典脚本 IIFE（v8.38 fx-core / v8.39 word-core 同款模式：iframe 经典 <script> 下 ESM export
// 会整文件 SyntaxError → 挂 window.__clockCore，页面以 <script src="../../js/clock-core.js">
// 两级上行同步加载，vitest 用 new Function 沙箱提取真跑）。
// 顶层零副作用（不碰 document/localStorage，唯一出口 window.__clockCore）。
//
// 权威源码：LineageOS/android_packages_apps_DeskClock @ lineage-24.0（AOSP main 同名路径的
// 可达镜像，八件快照逐字节入库 docs/reference/deskclock/）：
//   - data/Timer.java（384 行）—— 倒计时不可变领域对象：State 枚举五态 + copy-on-write 转换
//   - data/Stopwatch.java（151 行）—— 秒表不可变领域对象：State 三态 + accumulated 语义
//   - data/StopwatchModel.java（addLap L140-160 / canAddMoreLaps L172 / getLongestLapTime L186）
//   - provider/Alarm.java（getNextAlarmTime L375-400）—— 下次响铃四步权威算法（含 DST 重设时分）
//   - data/Weekdays.java（getDistanceToNextDay L214-228）—— 0-6 天距离循环（仅读 day-of-week）
//   - data/City.java（getTimeZone L71）—— 世界时钟 = IANA TimeZone（DST 由 tz 库承载）
//   - data/AlarmModel.java / alarms/AlarmStateManager.java —— 设置缓存与实例调度（参考锚）
// Web 无对应物诚实标注：Timer.miss()（MISSED 态依赖通知语义 AlarmStateManager L979 调度链，
// md3 无系统通知）——枚举保留同值但不由本层触发；Klaxon 渐强（AsyncRingtonePlayer）音频侧不在本层。
(function () {
  'use strict';

  const SECOND = 1000;
  const MINUTE = 60 * SECOND;

  // ==================== Timer 状态机（data/Timer.java 逐字语义） ====================
  // State 枚举 L40-41：RUNNING(1), PAUSED(2), EXPIRED(3), RESET(4), MISSED(5)
  const TimerState = { RUNNING: 1, PAUSED: 2, EXPIRED: 3, RESET: 4, MISSED: 5 };

  class Timer {
    // 不可变领域对象：每次状态转换返回新实例（L103-114 构造签名同构）
    // o: { id, length, totalLength, state, lastStartTime, remainingTime, label, deleteAfterUse }
    constructor(o) {
      this.id = o.id;
      this.state = o.state;
      this.length = o.length;                 // mLength：创建时长
      this.totalLength = o.totalLength;       // mTotalLength：含用户加分钟的时长
      this.lastStartTime = o.lastStartTime;   // mLastStartTime：最后一次 start 的时基（UNUSED=Long.MIN_VALUE）
      this.remainingTime = o.remainingTime;   // mRemainingTime
      this.label = o.label || '';
      this.deleteAfterUse = !!o.deleteAfterUse;
    }

    // L72：MIN_LENGTH = SECOND_IN_MILLIS
    static get MIN_LENGTH() { return SECOND; }
    // L74：UNUSED = Long.MIN_VALUE
    static get UNUSED() { return -9223372036854775808; }

    // 出厂（TimerModel 创建语义）：RESET 态，totalLength = remaining = length
    static create(id, lengthMs, label) {
      return new Timer({
        id: id, length: lengthMs, totalLength: lengthMs, state: TimerState.RESET,
        lastStartTime: Timer.UNUSED, remainingTime: lengthMs,
        label: label || '', deleteAfterUse: false,
      });
    }

    isReset() { return this.state === TimerState.RESET; }         // L122
    isRunning() { return this.state === TimerState.RUNNING; }     // L123
    isPaused() { return this.state === TimerState.PAUSED; }       // L124
    isExpired() { return this.state === TimerState.EXPIRED; }     // L125

    // L132-142 逐字：PAUSED/RESET → 静止 remaining；RUNNING/EXPIRED/MISSED → remaining - max(0, now-lastStart)
    getRemainingTime(nowMs) {
      if (this.state === TimerState.PAUSED || this.state === TimerState.RESET) {
        return this.remainingTime;
      }
      const timeSinceStart = nowMs - this.lastStartTime;
      return this.remainingTime - Math.max(0, timeSinceStart);
    }

    // L147-153：expiration = lastStart + remaining（仅 RUNNING/EXPIRED/MISSED 合法）
    getExpirationTime() {
      if (this.state !== TimerState.RUNNING && this.state !== TimerState.EXPIRED && this.state !== TimerState.MISSED) {
        throw new Error('cannot compute expiration time in state ' + this.state);
      }
      return this.lastStartTime + this.remainingTime;
    }

    // L160-162：elapsed = totalLength - remaining
    getElapsedTime(nowMs) {
      return this.totalLength - this.getRemainingTime(nowMs);
    }

    // L170-177：RUNNING/EXPIRED/MISSED → 自身；否则转 RUNNING 记 lastStart
    start(nowMs) {
      if (this.state === TimerState.RUNNING || this.state === TimerState.EXPIRED || this.state === TimerState.MISSED) {
        return this;
      }
      return new Timer({ id: this.id, length: this.length, totalLength: this.totalLength,
        state: TimerState.RUNNING, lastStartTime: nowMs, remainingTime: this.getRemainingTime(nowMs),
        label: this.label, deleteAfterUse: this.deleteAfterUse });
    }

    // L182-192：PAUSED/RESET → 自身；EXPIRED/MISSED → reset()；RUNNING → 冻结 remaining
    pause(nowMs) {
      if (this.state === TimerState.PAUSED || this.state === TimerState.RESET) {
        return this;
      } else if (this.state === TimerState.EXPIRED || this.state === TimerState.MISSED) {
        return this.reset();
      }
      return new Timer({ id: this.id, length: this.length, totalLength: this.totalLength,
        state: TimerState.PAUSED, lastStartTime: Timer.UNUSED,
        remainingTime: this.getRemainingTime(nowMs),
        label: this.label, deleteAfterUse: this.deleteAfterUse });
    }

    // L197-205：EXPIRED/RESET/MISSED → 自身；否则 EXPIRED，remaining 钳 min(0,·)，totalLength=0
    expire(nowMs) {
      if (this.state === TimerState.EXPIRED || this.state === TimerState.RESET || this.state === TimerState.MISSED) {
        return this;
      }
      return new Timer({ id: this.id, length: this.length, totalLength: 0,
        state: TimerState.EXPIRED, lastStartTime: nowMs,
        remainingTime: Math.min(0, this.getRemainingTime(nowMs)),
        label: this.label, deleteAfterUse: this.deleteAfterUse });
    }

    // L223-230：RESET → 自身；否则 RESET，totalLength=remaining=length
    reset() {
      if (this.state === TimerState.RESET) {
        return this;
      }
      return new Timer({ id: this.id, length: this.length, totalLength: this.length,
        state: TimerState.RESET, lastStartTime: Timer.UNUSED, remainingTime: this.length,
        label: this.label, deleteAfterUse: this.deleteAfterUse });
    }

    // L288-312 setRemainingTime 逐字：RESET 不变；EXPIRED/MISSED 且 remaining>0 → 转 RUNNING
    setRemainingTime(remainingTime, nowMs) {
      if (this.remainingTime === remainingTime || this.state === TimerState.RESET) {
        return this;
      }
      const delta = remainingTime - this.remainingTime;
      const totalLength = this.totalLength + delta;
      let state = this.state;
      let lastStartTime = this.lastStartTime;
      if (remainingTime > 0 && (this.state === TimerState.EXPIRED || this.state === TimerState.MISSED)) {
        state = TimerState.RUNNING;
        lastStartTime = nowMs;
      }
      return new Timer({ id: this.id, length: this.length, totalLength: totalLength,
        state: state, lastStartTime: lastStartTime, remainingTime: remainingTime,
        label: this.label, deleteAfterUse: this.deleteAfterUse });
    }

    // L318-326 逐字：EXPIRED/MISSED → 重启为 60s；否则 remaining + 60s
    addMinute(nowMs) {
      if (this.state === TimerState.EXPIRED || this.state === TimerState.MISSED) {
        return this.setRemainingTime(MINUTE, nowMs);
      }
      return this.setRemainingTime(this.remainingTime + MINUTE, nowMs);
    }
  }

  // ==================== Stopwatch（data/Stopwatch.java 逐字语义） ====================
  // State 枚举 L30：RESET, RUNNING, PAUSED
  const StopwatchState = { RESET: 'RESET', RUNNING: 'RUNNING', PAUSED: 'PAUSED' };

  class Stopwatch {
    // o: { state, lastStartTime, accumulatedTime }
    constructor(o) {
      this.state = o.state;
      this.lastStartTime = o.lastStartTime;
      this.accumulatedTime = o.accumulatedTime;
    }

    static reset() { return new Stopwatch({ state: StopwatchState.RESET, lastStartTime: Stopwatch.UNUSED, accumulatedTime: 0 }); } // L35 RESET_STOPWATCH

    isReset() { return this.state === StopwatchState.RESET; }       // L59
    isPaused() { return this.state === StopwatchState.PAUSED; }     // L60
    isRunning() { return this.state === StopwatchState.RUNNING; }   // L61

    // L66-76 逐字：非 RUNNING → accumulated；RUNNING → accumulated + max(0, now-lastStart)
    getTotalTime(nowMs) {
      if (this.state !== StopwatchState.RUNNING) {
        return this.accumulatedTime;
      }
      const timeSinceStart = nowMs - this.lastStartTime;
      return this.accumulatedTime + Math.max(0, timeSinceStart);
    }

    // L88-94：RUNNING → 自身；否则 RUNNING，accumulated = getTotalTime()
    start(nowMs) {
      if (this.state === StopwatchState.RUNNING) {
        return this;
      }
      return new Stopwatch({ state: StopwatchState.RUNNING, lastStartTime: nowMs, accumulatedTime: this.getTotalTime(nowMs) });
    }

    // L99-105：仅 RUNNING → PAUSED，accumulated = getTotalTime()
    pause(nowMs) {
      if (this.state !== StopwatchState.RUNNING) {
        return this;
      }
      return new Stopwatch({ state: StopwatchState.PAUSED, lastStartTime: Stopwatch.UNUSED, accumulatedTime: this.getTotalTime(nowMs) });
    }

    // L110-112：无条件回 RESET_STOPWATCH
    reset() {
      return Stopwatch.reset();
    }
  }
  Stopwatch.UNUSED = -9223372036854775808;

  // ==================== Lap（data/StopwatchModel.java addLap L140-160 逐字语义） ====================
  // L172：canAddMoreLaps = laps.size() < 98
  const MAX_LAPS = 98;

  // laps[0] = 最新一圈（L158 laps.add(0, lap)）；lap = { number, lapTime（单圈）, accumulatedTime（累计） }
  function addLap(laps, stopwatch, nowMs) {
    if (!stopwatch.isRunning()) return null;                                    // L141 !mStopwatch.isRunning()
    if (laps.length >= MAX_LAPS) return null;                                   // L142 !canAddMoreLaps()
    const totalTime = stopwatch.getTotalTime(nowMs);                            // L145
    const lapNumber = laps.length + 1;                                          // L147
    const prevAccumulatedTime = laps.length ? laps[0].accumulatedTime : 0;      // L151
    const lapTime = totalTime - prevAccumulatedTime;                            // L152
    return [{ number: lapNumber, lapTime: lapTime, accumulatedTime: totalTime }].concat(laps); // L154+L158
  }

  // 最快/最慢圈标记（视图着色语义；单圈不标记——md3 现有 isF/isS 条件 swLaps.length>1 同构）
  // 返回 { fastest: number|null, slowest: number|null }（按 lapTime 极值，同值取先出现）
  function fastestSlowestLaps(laps) {
    if (laps.length < 2) return { fastest: null, slowest: null };
    let fastest = null, slowest = null;
    for (const lap of laps) {
      if (fastest === null || lap.lapTime < lapById(laps, fastest).lapTime) fastest = lap.number;
      if (slowest === null || lap.lapTime > lapById(laps, slowest).lapTime) slowest = lap.number;
    }
    return { fastest: fastest, slowest: slowest };
  }
  function lapById(laps, number) {
    for (const l of laps) { if (l.number === number) return l; }
    return null;
  }

  // ==================== Alarm 下次响铃（provider/Alarm.java getNextAlarmTime L375-400 逐字） ====================
  // alarm: { hour(1-12), minute, isPm(0/1), days: [0-6]（0=周日，md3 形态）, active }
  function hour24Of(alarm) {
    return alarm.isPm ? (alarm.hour % 12 + 12) : (alarm.hour % 12);
  }

  // data/Weekdays.java getDistanceToNextDay L214-228 循环逐字（仅读 day-of-week）：
  // 返回 0-6（当天启用=0）；无启用日 → -1
  function distanceToNextDay(days, calendarDay) {
    if (!days || !days.length) return -1;
    let d = calendarDay;
    for (let count = 0; count < 7; count++) {
      if (days.indexOf(d) !== -1) return count;
      d++;
      if (d > 6) d = 0; // > SATURDAY → SUNDAY
    }
    return -1;
  }

  // 四步权威算法（L377-399）：
  //   ① 构造今日 hour:minute:00.000（Calendar.getInstance 同时区语义 → 本地时）
  //   ② ≤ currentTime → DAY_OF_YEAR + 1
  //   ③ getDistanceToNextDay（非重复=-1 即当天）> 0 → DAY_OF_WEEK + addDays
  //   ④ DST 修正：加天可能偏移时分（夏令时切换日）→ 重设 HOUR_OF_DAY/MINUTE
  function nextAlarmDate(alarm, now) {
    const h24 = hour24Of(alarm);
    let t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h24, alarm.minute, 0, 0);
    if (t.getTime() <= now.getTime()) {
      t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1, h24, alarm.minute, 0, 0); // ②
    }
    const addDays = distanceToNextDay(alarm.days, t.getDay()); // ③
    if (addDays > 0) {
      t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + addDays, h24, alarm.minute, 0, 0);
    }
    // ④ 重设时分（Calendar.set(HOUR_OF_DAY, hour) 语义）：经 Date 构造截断秒毫秒恒为 :00.000
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), h24, alarm.minute, 0, 0);
  }

  // 响铃分钟判定（对齐 md3 tick 原判定 + AlarmInstance 当天匹配语义）
  function alarmRingsThisMinute(alarm, date) {
    if (!alarm.active) return false;
    if (hour24Of(alarm) !== date.getHours() || alarm.minute !== date.getMinutes()) return false;
    return !alarm.days || !alarm.days.length || alarm.days.indexOf(date.getDay()) !== -1;
  }

  // ==================== 世界时钟（data/City.java getTimeZone L71 语义） ====================
  // 权威：城市时间 = IANA TimeZone（DST 由 tz 库承载，Web 原生 Intl.DateTimeFormat.timeZone 零依赖）。
  // 存量数据兼容：无 tz 的城市（旧 localStorage worldCities）回落固定偏移公式（旧 uWCT 公式逐字保留）。
  const fmtCache = {};
  function tzFormatters(tz) {
    if (!fmtCache[tz]) {
      fmtCache[tz] = {
        disp: new Intl.DateTimeFormat('zh-CN', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }),
        h24: new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }),
        minute: new Intl.DateTimeFormat('en-US', { timeZone: tz, minute: '2-digit', hourCycle: 'h23' }),
        offset: new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }),
      };
    }
    return fmtCache[tz];
  }

  // 返回 { h12, minute, isDay, utcOffsetLabel, inDst }；信息不足回落 null 字段由调用方降级
  function worldClockInfo(date, city) {
    if (city && city.tz) {
      const f = tzFormatters(city.tz);
      const hp = f.h24.formatToParts(date);
      const h24 = Number(hp.filter(function (p) { return p.type === 'hour'; })[0].value);
      const mp = f.minute.formatToParts(date);
      const minute = Number(mp.filter(function (p) { return p.type === 'minute'; })[0].value);
      const disp = f.disp.formatToParts(date);
      const dayPart = disp.filter(function (p) { return p.type === 'dayPeriod'; })[0];
      const hourPart = disp.filter(function (p) { return p.type === 'hour'; })[0];
      // longOffset → 'GMT+01:00'；夏令时判定：一月与七月的偏移不同且当前取其大者（北半球形态）
      const off = f.offset.formatToParts(date);
      const tzName = off.filter(function (p) { return p.type === 'timeZoneName'; })[0].value; // 'GMT+01:00'
      const jan = offsetMinutesFor(date.getFullYear(), city.tz, 1);
      const jul = offsetMinutesFor(date.getFullYear(), city.tz, 7);
      const cur = offsetMinutes(tzName);
      const inDst = jan !== jul && cur === Math.max(jan, jul) && cur !== Math.min(jan, jul);
      return {
        h24: h24,
        minute: minute,
        hour12: Number(hourPart.value),
        dayPeriod: dayPart ? dayPart.value : (h24 >= 12 ? '下午' : '上午'),
        isDay: h24 >= 6 && h24 < 18,
        utcOffsetLabel: tzName,
        inDst: inDst,
      };
    }
    // 存量固定偏移回落（旧 uWCT 公式逐字）：new Date(now + tzOffset*60e3 + offset*36e5)
    if (city && typeof city.offset === 'number') {
      const t = new Date(date.getTime() + (date.getTimezoneOffset() * 60e3) + (city.offset * 36e5));
      return {
        h24: t.getHours(), minute: t.getMinutes(), hour12: t.getHours() % 12 || 12,
        dayPeriod: t.getHours() >= 12 ? '下午' : '上午',
        isDay: t.getHours() >= 6 && t.getHours() < 18,
        utcOffsetLabel: 'UTC' + (city.offset >= 0 ? '+' : '') + city.offset,
        inDst: false, // 固定偏移无 DST 能力（议题实锤的缺口本体，保留仅为存量兼容）
      };
    }
    return null;
  }

  function offsetMinutesFor(year, tz, month) {
    const d = new Date(Date.UTC(year, month - 1, 15, 12, 0, 0));
    const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
    const p = f.formatToParts(d).filter(function (x) { return x.type === 'timeZoneName'; })[0].value;
    return offsetMinutes(p);
  }
  function offsetMinutes(label) {
    const m = /^GMT([+-])(\d{2}):?(\d{2})?$/.exec(label || '');
    if (!m) return 0;
    const sign = m[1] === '-' ? -1 : 1;
    return sign * (Number(m[2]) * 60 + Number(m[3] || 0));
  }

  // ==================== v9.48 #158 加分项：AsyncRingtonePlayer 渐强 + 通话降音量（lineage-24.0 逐字） ====================
  // 快照在库 docs/reference/deskclock/AsyncRingtonePlayer.java（413 行）/ AlarmKlaxon.java（84 行）/
  // SettingsDAO.java（getAlarmCrescendoDuration 默认 "0"=关闭，KEY_ALARM_CRESCENDO 设置驱动）。
  // IN_CALL_VOLUME 逐字：AsyncRingtonePlayer.java L46。
  var IN_CALL_VOLUME = 0.125;
  // isInTelephoneCall 五 audioMode 枚举（L154-163 逐字语义；md3 无 AudioManager 实时信号源，
  // 以字符串枚举形态保留、运行时恒 false 不触发——同 Timer MISSED 态处置纪律，e2e/调试面直测）。
  var IN_CALL_MODES = ['MODE_IN_COMMUNICATION', 'MODE_COMMUNICATION_REDIRECT', 'MODE_CALL_REDIRECT', 'MODE_CALL_SCREENING', 'MODE_IN_CALL'];
  function isInTelephoneCall(audioMode) {
    return IN_CALL_MODES.indexOf(audioMode) !== -1;
  }
  /* computeVolume 逐字：L194-208（javadoc：linear increase in volume (in decibels)）——
     elapsedCrescendoTime = stopTime - currentTime；
     fractionComplete = 1 - elapsed/duration；
     gain = (fractionComplete * 40) - 40  ← -40dB（near silent）→ 0dB（max）线性；
     volume = 10^(gain/20)  ← dB→标量（对数曲线：标量上非线性——fraction 0.5 → 0.1 而非 0.5） */
  function computeVolume(currentTime, stopTime, duration) {
    var elapsedCrescendoTime = stopTime - currentTime;
    var fractionComplete = 1 - (elapsedCrescendoTime / duration);
    var gain = (fractionComplete * 40) - 40;
    var volume = Math.pow(10, gain / 20);
    return volume;
  }

  // ==================== v9.48 #157 一期：Bedtime 睡眠时间纯语义 ====================
  // 权威注记（诚实标注在录）：Google Clock 的 Bedtime 标签页非 AOSP DeskClock 组成部分
  // （DeskClock 无 Bedtime 标签），无权威源码快照可拉——本组纯函数以议题 #157 正文
  // 「权威结构实证」（Google 帮助文档六要素）+ 用户裁定（「睡眠时间达到预定的时间之后，
  // 它也会自动地播放一些助眠相关的音频」）为判据，工程自定语义在录：
  // 分钟数 0-1439、跨午夜归一 (wake-bed+1440)%1440、就寝日=区间起点所在日历日。

  // 睡眠时长（分钟）：跨午夜归一。23:00(1380) 就寝 07:00(420) 起床 → 480；
  // 起卧同刻 → 0（边界在录：dur<=0 视为无窗口，不自动播放）
  function bedtimeDuration(bedMin, wakeMin) {
    return ((wakeMin - bedMin) % 1440 + 1440) % 1440;
  }

  // 下次就寝时刻（Date）：与 nextAlarmDate 四步法同构（②今日时刻已过 → +1 天；
  // ③distanceToNextDay 顺延启用日；全不启用/空 days → null——Bedtime 卡片渲染层
  // 判 enabled 才调本函数，null 分支防御在录）
  function nextBedtimeDate(bedMin, days, now) {
    if (!days || !days.length) return null;
    var t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, bedMin, 0, 0);
    if (t.getTime() <= now.getTime()) {
      t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1, 0, bedMin, 0, 0); // ②
    }
    var addDays = distanceToNextDay(days, t.getDay()); // ③
    if (addDays < 0) return null;
    if (addDays > 0) {
      t = new Date(t.getFullYear(), t.getMonth(), t.getDate() + addDays, 0, bedMin, 0, 0);
    }
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 0, bedMin, 0, 0);
  }

  // 当前是否处于睡眠区间（跨午夜安全）：
  //   candidate 就寝日 = 区间起点所在日历日——nowMin >= bedMin 视为今日已就寝
  //   （含同日不跨午夜情形），否则视为昨日就寝、今晨未起床（23:00-07:00 跨午夜
  //   情形）；就寝日未启用 → false；区间判定 since = (nowMin-bedMin+1440)%1440 < dur
  function isBedtimeWindow(bedMin, wakeMin, days, now) {
    if (!days || !days.length) return false;
    var dur = bedtimeDuration(bedMin, wakeMin);
    if (dur <= 0) return false;
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var bedDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (nowMin >= bedMin ? 0 : 1));
    if (days.indexOf(bedDay.getDay()) === -1) return false;
    var since = ((nowMin - bedMin) % 1440 + 1440) % 1440;
    return since < dur;
  }

  // v9.48 #157 三期：日出渐亮窗口判定（纯逻辑，vitest 真跑锚）。
  // nextMs = 下一闹钟绝对时刻（nextAlarmDate().getTime()），nowMs = 当前时刻，leadMin = 提前量分钟。
  // 返回：在窗 → 剩余秒数（Math.ceil，与 v9.42 就寝提醒同纪律——round 会在 xx:59.8 秒截断漏发）；
  // 不在窗/无闹钟/leadMin<=0 → null（调用侧用 null 判定不触发）。
  function sunriseLeadWindow(nextMs, nowMs, leadMin) {
    if (nextMs == null || !(leadMin > 0)) return null;
    var diff = nextMs - nowMs;
    if (diff <= 0) return null; // 已响过
    if (diff > leadMin * 60000) return null; // 未进窗
    return Math.ceil(diff / 1000);
  }

  // ==================== 出口（唯一：window.__clockCore） ====================
  window.__clockCore = {
    TimerState: TimerState,
    Timer: Timer,
    StopwatchState: StopwatchState,
    Stopwatch: Stopwatch,
    MAX_LAPS: MAX_LAPS,
    addLap: addLap,
    fastestSlowestLaps: fastestSlowestLaps,
    hour24Of: hour24Of,
    distanceToNextDay: distanceToNextDay,
    nextAlarmDate: nextAlarmDate,
    alarmRingsThisMinute: alarmRingsThisMinute,
    worldClockInfo: worldClockInfo,
    IN_CALL_VOLUME: IN_CALL_VOLUME,
    IN_CALL_MODES: IN_CALL_MODES,
    isInTelephoneCall: isInTelephoneCall,
    computeVolume: computeVolume,
    bedtimeDuration: bedtimeDuration,
    nextBedtimeDate: nextBedtimeDate,
    isBedtimeWindow: isBedtimeWindow,
    sunriseLeadWindow: sunriseLeadWindow,
  };
})();
