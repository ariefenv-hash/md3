// ==================== clock-core.js — AOSP DeskClock 纯逻辑下沉（#160 第一里程碑 v9.94） ====================
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

  // ==================== v9.94 #158 加分项：AsyncRingtonePlayer 渐强 + 通话降音量（lineage-24.0 逐字） ====================
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

  // ==================== v9.94 #157 一期：Bedtime 睡眠时间纯语义 ====================
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

  // v9.94 #157 三期：日出渐亮窗口判定（纯逻辑，vitest 真跑锚）。
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

  // ==================== v10.26 #208 前置：AlarmInstance 生命周期状态机（AlarmStateManager 移植） ====================
  // 权威快照（lineage-24.0）：alarms/AlarmStateManager.java（979 行在库）+
  // provider/AlarmInstance.java（454 行 sha cf7414c8919fd8a7ac914f2e9159455beafe6d5a blob 实拉入库）+
  // provider/ClockContract.java（InstancesColumns 九态数值）。
  // 常量同源锚（判据⑤系）：
  //   ALARM_FIRE_BUFFER=15（AlarmStateManager.java L129 "Buffer time in seconds to fire alarm instead of marking it missed"）
  //   九态数值逐字（ClockContract.java InstancesColumns）：SILENT 0 / LOW_NOTIFICATION 1 /
  //   HIDE_NOTIFICATION 2 / HIGH_NOTIFICATION 3 / SNOOZE 4 / FIRED 5 / MISSED 6 / DISMISSED 7 / PREDISMISSED 8
  //   LOW_NOTIFICATION_HOUR_OFFSET=-2（AlarmInstance.java L43）/ HIGH_NOTIFICATION_MINUTE_OFFSET=-30（L48）/
  //   MISSED_TIME_TO_LIVE_HOUR_OFFSET=12（L53）/ INVALID_ID=-1（L58）
  //   auto-silence 与 snooze 默认 "10"（SettingsDAO.java getAlarmTimeout L341-346 / getSnoozeLength L350-353
  //   "Default value must match the one in res/xml/settings.xml"）
  var ALARM_FIRE_BUFFER = 15;
  var AlarmInstanceState = {
    SILENT: 0, LOW_NOTIFICATION: 1, HIDE_NOTIFICATION: 2, HIGH_NOTIFICATION: 3,
    SNOOZE: 4, FIRED: 5, MISSED: 6, DISMISSED: 7, PREDISMISSED: 8,
  };
  var ALARM_INSTANCE_INVALID_ID = -1;

  // AlarmInstance 不可变领域对象（copy-on-write，Timer.java 同范式；本体重构建而非原地改）。
  // AlarmInstance.java 构造 L283-296：出厂 mId=INVALID_ID / mAlarmState=SILENT_STATE / mLabel=""。
  // o: { id, alarmId, alarmTime(Date), state, label }（Calendar Y/M/D/H/Min 五字段 → Date 形态等价承载）
  class AlarmInstance {
    constructor(o) {
      this.id = (o && o.id != null) ? o.id : ALARM_INSTANCE_INVALID_ID;
      this.alarmId = (o && o.alarmId != null) ? o.alarmId : null; // mAlarmId Long nullable（一次性闹钟 null）
      this.alarmTime = o.alarmTime;
      this.state = (o && o.state != null) ? o.state : AlarmInstanceState.SILENT;
      this.label = (o && o.label) || '';
    }

    // L378-382：alarmTime + LOW_NOTIFICATION_HOUR_OFFSET
    getLowNotificationTime() { return new Date(this.alarmTime.getTime() + (-2) * 3600000); }

    // L389-393：alarmTime + HIGH_NOTIFICATION_MINUTE_OFFSET
    getHighNotificationTime() { return new Date(this.alarmTime.getTime() + (-30) * 60000); }

    // L400-404：alarmTime + MISSED_TIME_TO_LIVE_HOUR_OFFSET
    getMissedTimeToLive() { return new Date(this.alarmTime.getTime() + 12 * 3600000); }

    // L411-422：alarmTime + timeoutMinutes；timeoutMinutes<0（"None"）→ null（永不超时）
    getTimeout(autoSilenceMinutes) {
      if (autoSilenceMinutes == null || autoSilenceMinutes < 0) return null;
      return new Date(this.alarmTime.getTime() + autoSilenceMinutes * 60000);
    }

    withState(state) { return new AlarmInstance({ id: this.id, alarmId: this.alarmId, alarmTime: this.alarmTime, state: state, label: this.label }); }
    withAlarmTime(alarmTime) { return new AlarmInstance({ id: this.id, alarmId: this.alarmId, alarmTime: alarmTime, state: this.state, label: this.label }); }
  }

  // Alarm.createInstanceAfter 语义：nextAlarmDate 四步法（provider/Alarm.java getNextAlarmTime L375-400，
  // 本文件既有）+ AlarmInstance 构造出厂 SILENT（AlarmInstance.java L283-296）
  function createInstanceFromAlarm(alarm, now) {
    return new AlarmInstance({
      alarmId: (alarm && alarm.id != null) ? alarm.id : null,
      alarmTime: nextAlarmDate(alarm, now),
      state: AlarmInstanceState.SILENT,
      label: (alarm && alarm.label) || '',
    });
  }

  // setSnoozeState L438-458 语义：newAlarmTime = now + snoozeMinutes；state=SNOOZE；
  // FIRED 调度转换（L457-458 scheduleInstanceStateChange(getAlarmTime(), FIRED)）由驱动侧承担
  function snoozedInstance(instance, nowMs, snoozeMinutes) {
    return new AlarmInstance({
      id: instance.id, alarmId: instance.alarmId,
      alarmTime: new Date(nowMs + snoozeMinutes * 60000),
      state: AlarmInstanceState.SNOOZE, label: instance.label,
    });
  }

  // registerInstance L615-708 决策树逐字（纯判定——AOSP 在此处做的是 DB 写+调度，md3 抽成
  // 返回 { state, action, note, reactivated } 由承载侧执行出口）。Java after/before 语义：
  // after(x)=now>x（严格）；before(x)=now<x（严格）。
  // opts.autoSilenceMinutes：SettingsDAO.getAlarmTimeout 形态（默认 10；<0 → "None" 永不超时）。
  function registerInstanceState(instance, nowMs, opts) {
    var autoSilence = (opts && typeof opts.autoSilenceMinutes === 'number') ? opts.autoSilenceMinutes : 10;
    var now = nowMs;
    var alarmMs = instance.alarmTime.getTime();
    var timeoutMs = instance.getTimeout(autoSilence);
    var st = AlarmInstanceState;

    // L628-631：DISMISSED → deleteInstanceAndUpdateParent（"never re-activated"）
    if (instance.state === st.DISMISSED) {
      return { state: st.DISMISSED, action: 'delete', note: 'L628-631' };
    }
    // L633-639：FIRED keep firing unless timeout passed（落穿到时窗修复段）
    if (instance.state === st.FIRED) {
      var hasTimeout = timeoutMs != null && now > timeoutMs.getTime();
      if (!hasTimeout) {
        return { state: st.FIRED, action: 'fire', note: 'L633-638' };
      }
    }
    // L640-658：MISSED + 时间回拨（now<alarmTime）→ 父闹钟 re-enable 并落穿到常规时窗（不 return）
    var missedReactivated = instance.state === st.MISSED && now < alarmMs;
    // L659-665：PREDISMISSED 两分支（都 return）
    if (instance.state === st.PREDISMISSED) {
      if (now < alarmMs) {
        return { state: st.PREDISMISSED, action: 'predismiss', note: 'L659-662' };
      }
      return { state: st.PREDISMISSED, action: 'delete', note: 'L662-664' };
    }

    // L668-702 时窗修复段
    if (now > instance.getMissedTimeToLive().getTime()) {
      // L669-671：老到没救，直接清账
      return { state: instance.state, action: 'delete', note: 'L669-671', reactivated: missedReactivated };
    }
    if (now > alarmMs) {
      // L672-683：过点——15s fire buffer 内补响，否则 MISSED
      var bufferMs = alarmMs + ALARM_FIRE_BUFFER * 1000; // L676-678 add(Calendar.SECOND, ALARM_FIRE_BUFFER)
      if (now < bufferMs) {
        return { state: st.FIRED, action: 'fire', note: 'L679-680', reactivated: missedReactivated };
      }
      return { state: st.MISSED, action: 'missed', note: 'L681-682', reactivated: missedReactivated };
    }
    if (instance.state === st.SNOOZE) {
      // L684-689：只展示 snooze 通知不更新时间，FIRED 调度继续
      return { state: st.SNOOZE, action: 'snooze-notify', note: 'L684-689' };
    }
    if (now > instance.getHighNotificationTime().getTime()) {
      return { state: st.HIGH_NOTIFICATION, action: 'high', note: 'L690-691', reactivated: missedReactivated };
    }
    if (now > instance.getLowNotificationTime().getTime()) {
      // L692-698：曾被用户隐藏 → 保持 HIDE（"only show low notification if it wasn't hidden"）
      if (instance.state === st.HIDE_NOTIFICATION) {
        return { state: st.HIDE_NOTIFICATION, action: 'hide', note: 'L693-695', reactivated: missedReactivated };
      }
      return { state: st.LOW_NOTIFICATION, action: 'low', note: 'L696-698', reactivated: missedReactivated };
    }
    // L699-701：还很远，静默等待
    return { state: st.SILENT, action: 'silent', note: 'L699-701', reactivated: missedReactivated };
  }

  // updateParentAlarm L223-255 决策（纯判定）：dismissed/missed 后父闹钟三出路。
  // md3 形态映射：isRepeating() ⇔ alarm.days.length>0（days 空=一次性）；
  // createInstanceAfter ⇔ nextAlarmDate（本文件四步法）。
  // 返回 { op: 'disable'|'delete'|'reschedule', nextAlarmTime: Date|null }
  function updateParentAlarmDecision(alarm, instance, nowMs) {
    var repeating = !!(alarm && alarm.days && alarm.days.length);
    if (!repeating) {
      if (alarm && alarm.deleteAfterUse) {
        return { op: 'delete', nextAlarmTime: null, note: 'L232-234 deleteAfterUse' };
      }
      return { op: 'disable', nextAlarmTime: null, note: 'L236-239 enabled=false' };
    }
    // L244：next = alarm.createInstanceAfter(getCurrentTime())
    var next = nextAlarmDate(alarm, new Date(nowMs));
    // L245-248：实例状态 > FIRED（MISSED/DISMISSED/PREDISMISSED）且新实例时刻=旧实例时刻
    //（时间跳变回拨场景）→ 从旧实例时刻再顺延
    if (instance && instance.state > AlarmInstanceState.FIRED && next.getTime() === instance.alarmTime.getTime()) {
      next = nextAlarmDate(alarm, instance.alarmTime);
    }
    return { op: 'reschedule', nextAlarmTime: next, note: 'L240-253 repeating' };
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
    ALARM_FIRE_BUFFER: ALARM_FIRE_BUFFER,
    AlarmInstanceState: AlarmInstanceState,
    ALARM_INSTANCE_INVALID_ID: ALARM_INSTANCE_INVALID_ID,
    AlarmInstance: AlarmInstance,
    createInstanceFromAlarm: createInstanceFromAlarm,
    snoozedInstance: snoozedInstance,
    registerInstanceState: registerInstanceState,
    updateParentAlarmDecision: updateParentAlarmDecision,
  };
})();
