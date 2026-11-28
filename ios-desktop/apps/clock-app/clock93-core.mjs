// ==================== clock93-core.mjs — Google Clock 9.3「Gastown」逻辑核（按源码从零重写） ====================
//
// v11.53 #330 返工：v11.53 的自创逻辑全部废弃，本文件逐条对齐反编译源码：
//   · 逻辑真源 = docs/reference/deskclock/*.java（AOSP DeskClock 模型，Google Clock 同源逻辑层）
//     —— Timer.java 五态 / StopwatchModel.java 98 圈 / Weekdays.java 位掩码 / SettingsDAO.java snooze
//     —— City.java 比较器（按当前 UTC 偏移（DST 实时）→ 名称）
//   · 9.3 增量 = gastown93 反编译证据卷（docs/reference/deskclock/gastown93/）：
//     布局 time_digit 属性（预设 5/10/30/45）、样式 bag（fontVariationSettings 矩阵）、
//     字体链（GMS 可下载字体 Google Sans Flex）、zh 字符串（文案逐字）。
// 纪律：零 DOM / 零 Date.now / 零 Math.random（时基与随机源全注入），供 vitest 直接 import。
// DOM 接线在 app.mjs；9.3 原始 AVD 资产在 avd/（逐字证据，禁改）。

/** 9.3 主壳 tab 顺序（gastown_tab_menu，真机序，不可调换） */
export const TAB_ORDER = ['Alarm', 'World', 'Timer', 'Stopwatch', 'Bedtime'];

/** zh 文案（gastown-menu_* / menu_* 字符串逐字） */
export const TAB_LABELS = {
  Alarm: '闹钟', World: '世界时钟', Timer: '计时器',
  Stopwatch: '秒表', Bedtime: '就寝时间',
};

/** 9.3 实测规格（结构断言的单源；Web 以 CSS 变量/px 落地，dp≈px @1x） */
export const GASTOWN93_SPEC = Object.freeze({
  fabSize: 80, fabCorner: 24, fabIcon: 28, fabMargin: 16, // fabMargin ← gastown_fab_margin (gastown_desk_clock TM.xml)
  alarmCardCorner: 24, alarmCardElevation: 0, alarmTimeSp: 36,
  mainClockSp: 56, mainAnalogDp: 240, wideAnalogDp: 300,
  cityNameSp: 24, cityOffsetSp: 16, cityClockSp: 57, cityAnalogDp: 76,
  timerTrackDp: 340, timerTrackThickness: 12, timerTrackCorner: 6, timerGap: 12,
  // ↓ 以下三项取自 gastown93 arsc（layouts-resolved.txt / gastown_timer_card res/N4.xml）
  timerLabelSp: 16,            // timer_label  textSize=16sp
  timerAddMinGuide: 0.68,      // add_one_min_button_end_guide  Guideline percent=0.68
  timerCardSpacer: 0.06,       // timer_card_spacer_size  Space percent=0.06
  stopwatchNavPadding: 12,     // gastown_stopwatch_nav_button_padding
  stopwatchLapMargin: 12,      // gastown_stopwatch_lap_view_margin
  // CircularProgressIndicator 派生量（MDC 几何：drawIndicator 以 trackThickness 为环宽，
  // gap 为 indicator 与 track 的同心断隙，corner 为 stroke cap 的圆角半径钳制）
  ringRadius: (340 - 12) / 2,  // (indicatorSize - trackThickness) / 2 = 164
  ringCircumference: 2 * Math.PI * ((340 - 12) / 2), // ≈ 1030.088
  timerTextSp: 80, timerButtonCorner: 512, timerUnitSp: 16,
  timerSetupDigitsSp: 200, presetChipSize: 80,
  stopwatchNavDp: 48, railWidth: 80,
  /** 预设分钟（core_time_preset_view 布局 time_digit 属性逐字：5/10/30/45 四枚，
   *  HorizontalScrollView 横滚；v11.50 的 1/3/5/10/15 五枚已翻面废弃） */
  presetMinutes: [5, 10, 30, 45],
  /** 秒表圈数上限（StopwatchModel.java canLap(): getLaps().size() < 98） */
  maxLaps: 98,
  /** 闹钟默认延后分钟（SettingsDAO.java: KEY_ALARM_SNOOZE 缺省 "10"） */
  defaultSnoozeMinutes: 10,
  /** 9.3 大时间字体轴（TextAppearance.Time.DisplayLarge + 家族层 opsz 57 合成） */
  fontAxes: { wght: 450, ROND: 100, wdth: 80, opsz: 57 },
  cityAxes: { wght: 500, ROND: 100, wdth: 100, opsz: 57 },
  pausedAxes: { wght: 250, ROND: 100, wdth: 80, opsz: 57 },
  multiAxes: { wght: 500, ROND: 100, wdth: 80, opsz: 57 },
  setupAxes: { wght: 500, ROND: 100, wdth: 70, opsz: 144 },
  letterSpacing: -0.04,
  breakpoints: { height600: 600, height800: 800, width1536: 1536 },
});

/** 计时器预设分钟（布局 time_digit 逐字证据） */
export const PRESET_MINUTES = GASTOWN93_SPEC.presetMinutes;

/** 闹钟延后时长可选值（SettingsActivity 延后时长条目 5~30 分钟步进；缺省 10） */
export const SNOOZE_CHOICES = [5, 10, 15, 20, 25, 30];

// ---------------------------------------------------------------- 星期（Weekdays.java）
/** AOSP Weekdays.java 位掩码：Calendar.MONDAY=0x01 … Calendar.SUNDAY=0x40（逐字移植） */
export const WEEKDAY_BIT = Object.freeze({
  Mon: 0x01, Tue: 0x02, Wed: 0x04, Thu: 0x08, Fri: 0x10, Sat: 0x20, Sun: 0x40,
});
/** Calendar.DAY_OF_WEEK → 位（Weekdays.java sCalendarDayToBit 同表） */
export const CAL_DAY_TO_BIT = Object.freeze({ 2: 0x01, 3: 0x02, 4: 0x04, 5: 0x08, 6: 0x10, 7: 0x20, 1: 0x40 });
/** zh 短标签（getFirstDayOfWeek=zh 惯例日一~六序；getShortWeekdays "周一" 形态） */
export const WEEKDAY_ZH = Object.freeze(['周日', '周一', '周二', '周三', '周四', '周五', '周六']);

// ---------------------------------------------------------------- 时间格式化
export const pad2 = (n) => String(Math.max(0, Math.floor(n))).padStart(2, '0');

/** 时/分 → HH:MM（闹钟卡 36sp TextTime / 就寝行） */
export function formatAlarmTime(h, m) {
  return `${pad2(h)}:${pad2(m)}`;
}

/**
 * 秒表主时间（Gastown zh 格式串逐字）：
 *   gastown_stopwatch_minutes_seconds "%1$02d:%2$02d"（<1 小时）
 *   gastown_stopwatch_hours_minutes_seconds "%1$02d:%2$02d:%3$02d"（≥1 小时）
 * 9.3 Gastown 主显示无厘秒（AutoSizingTextView 单节点，布局无 .cs 子 TextView）。
 */
export function formatStopwatch(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const s = t % 60, m = Math.floor(t / 60) % 60, h = Math.floor(t / 3600);
  return h > 0 ? `${pad2(h)}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

/**
 * 计时器倒计时（80sp 内嵌文本，tnum）：剩余取整秒（AOSP 语义：剩余向下取整显示），
 * <1 小时 → MM:SS，≥1 小时 → H:MM:SS。
 */
export function formatCountdown(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const s = t % 60, m = Math.floor(t / 60) % 60, h = Math.floor(t / 3600);
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

/** zh 时长文案（SettingsDAO/时长条目惯例："X 小时"/"X 小时 Y 分钟"；0 分钟 → "" 由调用方隐藏） */
export function formatDurationZh(mins) {
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  if (h === 0 && m === 0) return '';
  if (h === 0) return `${m} 分钟`;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分钟`;
}

// ---------------------------------------------------------------- 世界时钟（City.java 语义）
/**
 * 城市时区偏移（分钟）——真实 IANA 时区 + DST 实时计算（City.java:
 * TimeZone.getOffset(now) 语义；v11.53 写死固定偏移已废弃）。
 * Intl.DateTimeFormat timeZoneName='longOffset' → "GMT+09:00"。
 */
export function cityOffsetMinutes(tzId, nowMs) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tzId, timeZoneName: 'longOffset' })
      .formatToParts(new Date(nowMs));
    const tz = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT';
    const m = /^GMT([+-])(\d{1,2}):?(\d{2})?$/.exec(tz);
    if (!m) return 0;
    const sign = m[1] === '+' ? 1 : -1;
    return sign * (Number(m[2]) * 60 + Number(m[3] || 0));
  } catch (e) {
    return 0;
  }
}

/** 城市当地时间（注入 now）→ { h, m, text } */
export function cityClockAt(tzId, nowMs) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tzId, hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(nowMs));
    const h = Number(parts.find((p) => p.type === 'hour')?.value || 0);
    const m = Number(parts.find((p) => p.type === 'minute')?.value || 0);
    const d = Number(parts.find((p) => p.type === 'day')?.value || 0);
    return { h, m, d, text: `${pad2(h)}:${pad2(m)}` };
  } catch (e) {
    return { h: 0, m: 0, d: 0, text: '00:00' };
  }
}

/** 城市日序（1=周一 … 7=周日，ISO 语义；与 WEEKDAY_ZH 数组序差一位，此处换算） */
export function cityWeekdayIso(tzId, nowMs) {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tzId, weekday: 'short' });
  const w = dtf.format(new Date(nowMs));
  return { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[w] || 1;
}

/**
 * City.java 比较器：先按当前 UTC 偏移升序（DST 实时），偏移相同按名称。
 * AOSP UtcOffsetComparator(now) + UtcOffsetNameComparator 链式语义。
 */
export function sortCities(cities, nowMs) {
  return [...cities].sort((a, b) => {
    const oa = cityOffsetMinutes(a.tzId, nowMs);
    const ob = cityOffsetMinutes(b.tzId, nowMs);
    if (oa !== ob) return oa - ob;
    return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN');
  });
}

/**
 * 时差行文案（world_* zh 字符串逐字）：
 *   早 %s / 晚 %s（world_time_ahead/behind，纯小时）；跨日城市附 world_day_of_week_label「/ 周X」。
 *   差为零 → 返回 ''（调用方隐藏该行，与真机行隐藏一致）。
 * 早/晚方向：AOSP ClockFragment 语义 = 城市相对本地的偏移差（offset - localOffset）。
 */
export function worldOffsetText(tzId, nowMs, localOffsetMin) {
  const diff = cityOffsetMinutes(tzId, nowMs) - localOffsetMin;
  if (diff === 0) return '';
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60), m = abs % 60;
  const dur = m === 0 ? formatDurationZh(h * 60) : `${formatDurationZh(h * 60)} ${m} 分钟`;
  const dir = diff > 0 ? '早' : '晚';
  // 跨日标注：城市日历日 ≠ 本地日 → world_hours_tomorrow/yesterday「明天/昨天」标注位
  const localIso = cityWeekdayIso('Etc/UTC', nowMs + localOffsetMin * 60000);
  const cityIso = cityWeekdayIso(tzId, nowMs);
  let dayTag = '';
  if (cityIso === (localIso % 7) + 1) dayTag = '（明天）';
  else if (cityIso === ((localIso + 5) % 7) + 1) dayTag = '（昨天）';
  return `${dir} ${dur}${dayTag}`;
}

// ---------------------------------------------------------------- 闹钟（Alarm.java / Weekdays.java）
/** 建闹钟（位掩码 days；label；snooze 分钟缺省 10 —— SettingsDAO 缺省） */
export function makeAlarm({ id, h, m, days = 0, label = '', enabled = true, snoozeMinutes = GASTOWN93_SPEC.defaultSnoozeMinutes }) {
  return {
    id: String(id),
    h: ((Math.trunc(h) % 24) + 24) % 24,
    m: ((Math.trunc(m) % 60) + 60) % 60,
    days: days & 0x7f,
    label: String(label || ''),
    enabled: !!enabled,
    snoozeMinutes: SNOOZE_CHOICES.includes(snoozeMinutes) ? snoozeMinutes : 10,
  };
}

/** 重复日文案：0x7f → 每天；0 → ''（真机单次闹钟不显示该行）；否则「周一、周三」 */
export function describeDays(days) {
  const d = days & 0x7f;
  if (d === 0) return '';
  if (d === 0x7f) return '每天';
  const zh = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const bits = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40];
  return zh.filter((_, i) => d & bits[i]).join('、');
}

/**
 * 下次响铃时刻（毫秒时间戳，注入 now 与本地偏移）。
 * 空掩码 = 单次：只取今天/明天下一次；有掩码 = Weekdays 命中最近未来日（AOSP
 * AlarmInstance.getNextAlarmTime 语义）。
 */
export function nextAlarmAt(alarm, nowMs, localOffsetMin = 0) {
  const local = new Date(nowMs + localOffsetMin * 60000);
  const baseMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - localOffsetMin * 60000;
  // Calendar.MONDAY=0x01 … SUNDAY=0x40（Weekdays.java sCalendarDayToBit 同表）
  const dowBit = { 1: 0x01, 2: 0x02, 3: 0x04, 4: 0x08, 5: 0x10, 6: 0x20, 0: 0x40 };
  for (let i = 0; i < 8; i++) {
    const at = baseMidnight + (alarm.h * 3600 + alarm.m * 60) * 1000 + i * 86400000;
    if (at <= nowMs) continue;
    if (alarm.days === 0) return at;
    const dow = new Date(at + localOffsetMin * 60000).getUTCDay();
    if (alarm.days & dowBit[dow]) return at;
  }
  return -1;
}

/** 下次响铃状态行（alarm_scheduled_for_today/tomorrow/date zh 逐字；关闭态 alarm_is_off） */
export function upcomingText(alarm, nowMs, localOffsetMin = 0) {
  if (!alarm.enabled) return '闹钟已关闭'; // alarm_alert_off_text
  const at = nextAlarmAt(alarm, nowMs, localOffsetMin);
  if (at < 0) return '闹钟已关闭';
  const local = new Date(nowMs + localOffsetMin * 60000);
  const ring = new Date(at + localOffsetMin * 60000);
  const sameDay = local.getUTCFullYear() === ring.getUTCFullYear()
    && local.getUTCMonth() === ring.getUTCMonth() && local.getUTCDate() === ring.getUTCDate();
  const tomorrow = new Date(nowMs + localOffsetMin * 60000 + 86400000);
  const isTomorrow = ring.getUTCDate() === tomorrow.getUTCDate()
    && ring.getUTCMonth() === tomorrow.getUTCMonth() && ring.getUTCFullYear() === tomorrow.getUTCFullYear();
  if (sameDay) return '时间预定在今天'; // alarm_scheduled_for_today
  if (isTomorrow) return '时间预定在明天'; // alarm_scheduled_for_tomorrow
  return `时间预定在 ${WEEKDAY_ZH[ring.getUTCDay()]}`; // alarm_scheduled_for_date %s
}

export const sortAlarms = (list) => [...list].sort((a, b) => a.h - b.h || a.m - b.m || String(a.id).localeCompare(String(b.id)));

// ---------------------------------------------------------------- 计时器（Timer.java 逐字）
/** Timer.java State 枚举值（RUNNING=1, PAUSED=2, EXPIRED=3, RESET=4, MISSED=5） */
export const TIMER_STATE = Object.freeze({ RUNNING: 1, PAUSED: 2, EXPIRED: 3, RESET: 4, MISSED: 5 });

/** Timer.java MIN_LENGTH = SECOND_IN_MILLIS */
export const TIMER_MIN_LENGTH = 1000;

/** Timer.java 到期排序 stateExpiryOrder（MISSED, EXPIRED, RUNNING, PAUSED, RESET） */
const TIMER_EXPIRY_ORDER = [
  TIMER_STATE.MISSED, TIMER_STATE.EXPIRED, TIMER_STATE.RUNNING, TIMER_STATE.PAUSED, TIMER_STATE.RESET,
];

export const timerStateOrder = (s) => TIMER_EXPIRY_ORDER.indexOf(s);

/** 建计时器（RESET 态；length/totalLength 毫秒） */
export function makeTimer({ id, length, label = '' }) {
  return {
    id: String(id),
    state: TIMER_STATE.RESET,
    length,
    totalLength: length,
    remainingTime: length,
    lastStartTime: 0,
    label: String(label || ''),
  };
}

/**
 * Timer.java getRemainingTime：PAUSED/RESET 返回冻结剩余；
 * RUNNING/EXPIRED/MISSED = remainingTime - max(0, now - lastStartTime)（单调递减）。
 */
export function timerRemaining(timer, nowMs) {
  if (timer.state === TIMER_STATE.PAUSED || timer.state === TIMER_STATE.RESET) {
    return timer.remainingTime;
  }
  return timer.remainingTime - Math.max(0, nowMs - timer.lastStartTime);
}

/** Timer.java start()：RESET/PAUSED → RUNNING（记 lastStartTime） */
export function timerStart(timer, nowMs) {
  if (timer.state === TIMER_STATE.RUNNING || timer.state === TIMER_STATE.EXPIRED || timer.state === TIMER_STATE.MISSED) {
    return timer;
  }
  return { ...timer, state: TIMER_STATE.RUNNING, lastStartTime: nowMs };
}

/** Timer.java pause()：RUNNING → PAUSED（剩余冻结） */
export function timerPause(timer, nowMs) {
  if (timer.state !== TIMER_STATE.RUNNING) return timer;
  return { ...timer, state: TIMER_STATE.PAUSED, remainingTime: timerRemaining(timer, nowMs), lastStartTime: 0 };
}

/** Timer.java addMinute()：RUNNING/PAUSED → 剩余与总长各 +60000 */
export function timerAddMinute(timer, nowMs) {
  if (timer.state !== TIMER_STATE.RUNNING && timer.state !== TIMER_STATE.PAUSED) return timer;
  return { ...timer, totalLength: timer.totalLength + 60000, remainingTime: timerRemaining(timer, nowMs) + 60000, lastStartTime: nowMs };
}

/** Timer.java reset()：任意态 → RESET（回到原长） */
export function timerReset(timer) {
  return { ...timer, state: TIMER_STATE.RESET, remainingTime: timer.length, totalLength: timer.length, lastStartTime: 0 };
}

/** 过期翻转（tick 判定：RUNNING 且剩余 ≤0 → EXPIRED） */
export function timerExpireIfDue(timer, nowMs) {
  if (timer.state === TIMER_STATE.RUNNING && timerRemaining(timer, nowMs) <= 0) {
    return { ...timer, state: TIMER_STATE.EXPIRED, remainingTime: 0 };
  }
  return timer;
}

/** 多计时器列表排序（TimerListAdapter stateExpiryOrder 同序） */
export function sortTimers(timers, nowMs) {
  const scored = timers.map((t) => ({ t, r: timerRemaining(t, nowMs) }));
  return scored.sort((a, b) => {
    const so = timerStateOrder(a.t.state) - timerStateOrder(b.t.state);
    if (so !== 0) return so;
    return a.r - b.r;
  }).map((x) => x.t);
}

// ---------------------------------------------------------------- 计时器键盘（TimerSetupView 语义）
/**
 * 3×4 键盘（1-9 / 00 / 0 / 退格）→ 六位数字串 HHMMSS，逐位左移压入（AOSP TimerSetupView
 * shiftLeft 同构）；00 键压入两位。h 上限 99、m/s 不钳制（90 分钟合法，启动后按进位显示）。
 */
export function keypadReducer(state, key) {
  const d = String((state && state.digits) || '000000').padStart(6, '0').slice(-6);
  if (key === 'backspace') return { digits: ('0' + d.slice(0, -1)).slice(-6) };
  if (key === 'clear') return { digits: '000000' };
  const s = String(key);
  if (!/^\d{1,2}$/.test(s)) return { digits: d };
  return { digits: (d + s).slice(-6) };
}

/** 六位数字串 → 总秒数（时 ≤99；分/秒不钳 59——AOSP 允许 90 分钟输入） */
export function digitsToSeconds(digits) {
  const d = String(digits || '000000').padStart(6, '0').slice(-6);
  const h = Number(d.slice(0, 2)), m = Number(d.slice(2, 4)), s = Number(d.slice(4, 6));
  return h * 3600 + m * 60 + s;
}

/** 预设分钟 → 六位数字串（00 + mm + 00；预设全部 <60 分钟，落分位） */
export function presetDigits(minutes) {
  return '00' + pad2(minutes) + '00';
}

/** 三列显示（时/分/秒 + 各自单位标签；timer_setup_description zh 序 = 时 分 秒） */
export function timerColumns(digits) {
  const d = String(digits || '000000').padStart(6, '0').slice(-6);
  return [
    { value: d.slice(0, 2), unit: '时' },
    { value: d.slice(2, 4), unit: '分' },
    { value: d.slice(4, 6), unit: '秒' },
  ];
}

/** 环形进度（indicatorSize 340 / trackThickness 12 / gap 12）→ SVG stroke-dasharray 参数 */
export function ringProgress(remainingMs, totalMs, circumference) {
  const p = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  return { fraction: p, dash: (p * circumference).toFixed(3), gap: (circumference * (1 - p)).toFixed(3) };
}

// ---------------------------------------------------------------- 秒表（StopwatchModel.java 逐字）
/** 记一圈：lapNumber 递增 / lapTime = 本次段时 / totalTime = 累计（StopwatchModel.addLap 同构） */
export function lapReducer(laps, elapsedMs) {
  const prevTotal = laps.length ? laps[laps.length - 1].totalTime : 0;
  const total = Math.max(prevTotal, elapsedMs);
  return [...laps, { lapNumber: laps.length + 1, lapTime: total - prevTotal, totalTime: total }];
}

/** StopwatchModel.canLap(): laps.size() < 98 */
export const canLap = (laps) => laps.length < GASTOWN93_SPEC.maxLaps;

/** 最快/最慢圈序号（StopwatchFragment：lapTime 最小/最大，≥2 圈才标注；同值取先出现） */
export function lapBestWorst(laps) {
  if (laps.length < 2) return { best: -1, worst: -1 };
  let best = 0, worst = 0;
  for (let i = 1; i < laps.length; i++) {
    if (laps[i].lapTime < laps[best].lapTime) best = i;
    if (laps[i].lapTime > laps[worst].lapTime) worst = i;
  }
  return { best: laps[best].lapTime === laps[worst].lapTime ? -1 : best, worst };
}

export const formatLap = (ms) => formatStopwatch(ms);

// ---------------------------------------------------------------- 就寝时间（Bedtime 语义）
/** 就寝→起床时长（分钟，跨零点加一天） */
export function bedtimeDurationMinutes(bedH, bedM, wakeH, wakeM) {
  const bed = bedH * 60 + bedM, wake = wakeH * 60 + wakeM;
  return (wake - bed + 1440) % 1440;
}

/** 9.3 字体轴串（序与源 fontVariationSettings 串逐字同构；含家族层 opsz；
 *  CRSV/FILL/GRAD/HEXP 为 GMS 件轴，OFL 发行缺列——浏览器对未注册轴静默忽略） */
export function fontVariation(axes = GASTOWN93_SPEC.fontAxes) {
  const parts = [`'wght' ${axes.wght}`];
  if (axes.ROND != null) parts.push(`'ROND' ${axes.ROND}`);
  if (axes.wdth != null) parts.push(`'wdth' ${axes.wdth}`);
  if (axes.opsz != null) parts.push(`'opsz' ${axes.opsz}`);
  return parts.join(', ');
}

/** 五 tab 键盘循环（左右键） */
export function nextTab(current, dir = 1) {
  const i = TAB_ORDER.indexOf(current);
  if (i < 0) return TAB_ORDER[0];
  return TAB_ORDER[(i + (dir > 0 ? 1 : -1) + TAB_ORDER.length) % TAB_ORDER.length];
}
