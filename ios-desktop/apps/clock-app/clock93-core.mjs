// ==================== clock93-core.mjs — Google Clock 9.3「Gastown」UI 交互核心（纯函数核） ====================
//
// 移植口径（docs/reference/deskclock/gastown93/README.md，#330 反编译证据卷）：
//   · 五 tab 真机顺序 = 闹钟 → 世界时钟 → 计时器 → 秒表 → 就寝时间
//   · 计时器 = 3×4 键盘直输（时/分/秒各两位）→ 运行卡环形进度
//   · 秒表 = 顶部大时间 + 中心圈速 + 底部圆钮组
//   · 大时间排版基线 wght450/ROND100/wdth80（城市 500/100、计时器暂停 250）
//
// 纪律：零 DOM / 零 Date.now / 零 Math.random（时基与随机源全注入），供 vitest 直接 import。
// 本文件只承载状态机与格式化；DOM 接线在 app.mjs，9.3 原始 AVD 资产在 avd/。

/** 9.3 主壳 tab 顺序（gastown_tab_menu，真机序，不可调换） */
export const TAB_ORDER = ['Alarm', 'World', 'Timer', 'Stopwatch', 'Bedtime'];

export const TAB_LABELS = {
  Alarm: '闹钟', World: '世界时钟', Timer: '计时器',
  Stopwatch: '秒表', Bedtime: '就寝时间',
};

/** 9.3 实测规格（结构断言的单源；Web 以 CSS 变量/px 落地，dp≈px @1x） */
export const GASTOWN93_SPEC = Object.freeze({
  fabSize: 80, fabCorner: 24, fabIcon: 28,
  alarmCardCorner: 24, alarmCardElevation: 0, alarmTimeSp: 36,
  mainClockSp: 56, mainAnalogDp: 240, wideAnalogDp: 300,
  cityNameSp: 24, cityOffsetSp: 16, cityClockSp: 57, cityAnalogDp: 76,
  timerTrackDp: 340, timerTrackThickness: 12, timerTrackCorner: 6, timerGap: 12,
  timerTextSp: 80, timerButtonCorner: 512, timerUnitSp: 16,
  stopwatchNavDp: 48,
  railWidth: 80,
  fontAxes: { wght: 450, ROND: 100, wdth: 80 },
  cityAxes: { wght: 500, ROND: 100, wdth: 100 },
  pausedAxes: { wght: 250, ROND: 100, wdth: 80 },
  letterSpacing: -0.04,
  /** 四档响应式真布局变体（#264 指路标：h600×11 / h800×4 / w1536×2 / land×14） */
  breakpoints: { height600: 600, height800: 800, width1536: 1536 },
});

/** 计时器预设（dex 侧取值集未取证 → 按常用 1/3/5/10/15 分诚实标注） */
export const PRESET_MINUTES = [1, 3, 5, 10, 15];

export const WEEK_DAYS = ['日', '一', '二', '三', '四', '五', '六'];

// ---------------------------------------------------------------- 时间格式化
export const pad2 = (n) => String(Math.max(0, Math.floor(n))).padStart(2, '0');

/** 时/分/秒 → HH:MM（闹钟卡 36sp 文案） */
export function formatAlarmTime(h, m) {
  return `${pad2(h)}:${pad2(m)}`;
}

/** 毫秒 → 秒表 MM:SS.cc（9.3 圈速容器同款两位厘秒） */
export function formatStopwatch(ms) {
  const t = Math.max(0, Math.round(ms));
  const cs = Math.floor(t / 10) % 100;
  const s = Math.floor(t / 1000) % 60;
  const m = Math.floor(t / 60000);
  return `${pad2(m)}:${pad2(s)}.${pad2(cs)}`;
}

/** 毫秒 → 倒计时 H:MM:SS / MM:SS（80sp 内嵌，tnum） */
export function formatCountdown(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

/** 注入时基的本地钟（nowMs 为时间戳，tzOffsetMin 为相对 UTC 的分钟偏移） */
export function clockAt(nowMs, tzOffsetMin = 0) {
  const d = new Date(nowMs + tzOffsetMin * 60000);
  return {
    h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds(),
    text: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`,
  };
}

/** 城市时差文案（相对本地 UTC 偏移差，9.3 hours_ahead 行 16sp） */
export function formatOffset(localOffsetMin, cityOffsetMin) {
  const diff = cityOffsetMin - localOffsetMin;
  if (diff === 0) return '与本地时间相同';
  const sign = diff > 0 ? '快' : '慢';
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60), m = abs % 60;
  const t = m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`;
  return `比本地${sign} ${t}`;
}

// ---------------------------------------------------------------- 闹钟
/** 建闹钟（id 由调用方注入，保持纯函数） */
export function makeAlarm({ id, h, m, label = '闹钟', days = [], enabled = true }) {
  return {
    id: String(id), h: ((h % 24) + 24) % 24, m: ((m % 60) + 60) % 60,
    label: String(label), days: Array.from(new Set(days)).sort((a, b) => a - b),
    enabled: !!enabled,
  };
}

export const alarmTimeText = (a) => formatAlarmTime(a.h, a.m);

/** 重复日文案：空/全周 → 每天；否则「周一 · 周三」 */
export function describeDays(days) {
  const d = Array.from(new Set(days || [])).sort((a, b) => a - b);
  if (d.length === 0 || d.length === 7) return '每天';
  return d.map((x) => `周${WEEK_DAYS[((x % 7) + 7) % 7]}`).join(' · ');
}

/** 距下次响铃的毫秒数（注入 now；空 days = 每天，重复日按最近未来命中） */
export function nextAlarmMs(a, nowMs, localOffsetMin = 0) {
  const local = new Date(nowMs + localOffsetMin * 60000);
  const base = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), a.h, a.m, 0);
  const dayW = local.getUTCDay();
  // 空 days = 每天（与 describeDays([]) 语义同源）：候选全周取最近未来，
  // 不按「当天过期就 +7 天」跳一整周。
  const days = a.days.length ? a.days : [0, 1, 2, 3, 4, 5, 6];
  const localNow = nowMs + localOffsetMin * 60000;
  const candidates = days.map((w) => {
    const delta = ((w - dayW) % 7 + 7) % 7;
    const t = base + delta * 86400000;
    return t > localNow ? t : t + 7 * 86400000;
  });
  return Math.min(...candidates) - localNow;
}

export const sortAlarms = (list) => [...list].sort((a, b) => a.h - b.h || a.m - b.m || a.id.localeCompare(b.id));

/** 下次响铃文案（9.3 upcoming 行） */
export function upcomingText(a, nowMs, localOffsetMin = 0) {
  const ms = nextAlarmMs(a, nowMs, localOffsetMin);
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return '即将响铃';
  if (mins < 60) return `${mins} 分钟后`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m === 0 ? `${h} 小时后` : `${h} 小时 ${m} 分后`;
}

// ---------------------------------------------------------------- 计时器键盘状态机
/**
 * 3×4 键盘（1-9 / 00 / 0 / 退格）→ 六位数字串 HHMMSS，逐位左移压入。
 * state = { digits: '000000' }；返回新 state（零副作用）。
 */
export function keypadReducer(state, key) {
  const d = String((state && state.digits) || '000000').padStart(6, '0').slice(-6);
  if (key === 'backspace') return { digits: ('0' + d.slice(0, -1)).slice(-6) };
  if (key === 'clear') return { digits: '000000' };
  const s = String(key);
  if (!/^\d{1,2}$/.test(s)) return { digits: d };
  return { digits: (d + s).slice(-6) };
}

/** 六位数字串 → 总秒数（时/分/秒各两位，9.3 三列等宽） */
export function digitsToSeconds(digits) {
  const d = String(digits || '000000').padStart(6, '0').slice(-6);
  const h = Number(d.slice(0, 2)), m = Number(d.slice(2, 4)), s = Number(d.slice(4, 6));
  return h * 3600 + Math.min(59, m) * 60 + Math.min(59, s);
}

/** 三列显示（时/分/秒 + 各自单位标签） */
export function timerColumns(digits) {
  const d = String(digits || '000000').padStart(6, '0').slice(-6);
  return [
    { value: d.slice(0, 2), unit: '时' },
    { value: d.slice(2, 4), unit: '分' },
    { value: d.slice(4, 6), unit: '秒' },
  ];
}

/** 定时器 tick：remainingMs 递减，归零钳制并给 done */
export function timerTick(state, deltaMs) {
  const remainingMs = Math.max(0, (state.remainingMs || 0) - Math.max(0, deltaMs));
  return { ...state, remainingMs, done: remainingMs === 0 };
}

/** 环形进度（9.3 indicatorSize 340 / track 12 / gap 12）→ SVG stroke dash 参数 */
export function ringProgress(remainingMs, totalMs, circumference) {
  const p = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  return { fraction: p, dash: (p * circumference).toFixed(3), gap: (circumference * (1 - p)).toFixed(3) };
}

// ---------------------------------------------------------------- 秒表
/** 记一圈：laps 存累计毫秒，返回新数组 */
export function lapReducer(laps, elapsedMs) {
  const prev = laps.length ? laps[laps.length - 1] : 0;
  return [...laps, Math.max(prev, elapsedMs)];
}

/** 累计圈时 → 每圈分段用时（9.3 中心圈速容器） */
export function lapDeltas(laps) {
  let prev = 0;
  return laps.map((x) => { const d = x - prev; prev = x; return d; });
}

export const formatLap = (ms) => formatStopwatch(ms);

// ---------------------------------------------------------------- 就寝时间
/** 就寝→起床时长（分钟，跨零点自动加一天） */
export function bedtimeDurationMinutes(bedH, bedM, wakeH, wakeM) {
  const bed = bedH * 60 + bedM, wake = wakeH * 60 + wakeM;
  return (wake - bed + 1440) % 1440;
}

/** 8 连排睡眠活动可视化条（#264：8×ActivityVisualizerView；本批只做 UI 占位强度） */
export function activityBuckets(seed = 0) {
  const arr = [];
  for (let i = 0; i < 8; i++) {
    const v = Math.abs(Math.sin((i + 1) * 1.7 + seed * 0.3));
    arr.push(Math.round(18 + v * 82));
  }
  return arr;
}

/** 9.3 字体轴串（ROND 为 Google 专有轴：传入不近似，浏览器忽略） */
export function fontVariation(axes = GASTOWN93_SPEC.fontAxes) {
  return `'wght' ${axes.wght}, 'ROND' ${axes.ROND}, 'wdth' ${axes.wdth}`;
}

/** 五 tab 键盘循环（预测式返回之外的左右切换） */
export function nextTab(current, dir = 1) {
  const i = TAB_ORDER.indexOf(current);
  if (i < 0) return TAB_ORDER[0];
  return TAB_ORDER[(i + (dir > 0 ? 1 : -1) + TAB_ORDER.length) % TAB_ORDER.length];
}
