// ==================== clock93-ui-core.test.js — 9.3 Gastown 按源码从零重写（#330 返工） ====================
// 验收三层：① 纯函数逻辑核（对齐 AOSP DeskClock 模型源码 + 9.3 反编译证据）
//          ② 9.3 规格结构逐字锚（字体链翻面 / 预设翻面 / 文案逐字）
//          ③ 桌面注册与 AVD 接线。
// 证据源 docs/reference/deskclock/gastown93/（#330 反编译卷 + scripts/desc93-arsc.py 重放）
//       docs/reference/deskclock/*.java（Timer/StopwatchModel/Weekdays/SettingsDAO/City 逻辑真源）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as C from '../ios-desktop/apps/clock-app/clock93-core.mjs';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const HTML = () => read('ios-desktop/apps/clock-app/index.html');
const APP = () => read('ios-desktop/apps/clock-app/app.mjs');
const CORE = () => read('ios-desktop/apps/clock-app/clock93-core.mjs');
const ASSETS = () => read('ios-desktop/apps/clock-app/avd/gastown93-assets.mjs');

// ================================================================ ① 纯函数逻辑核
describe('9.3 逻辑核 · 纯函数（AOSP 模型逐字）', () => {
  it('五 tab 真机顺序 + 规格常量（预设 5/10/30/45 逐字翻面）', () => {
    expect(C.TAB_ORDER).toEqual(['Alarm', 'World', 'Timer', 'Stopwatch', 'Bedtime']);
    expect(Object.keys(C.TAB_LABELS)).toEqual(C.TAB_ORDER);
    expect(C.TAB_LABELS.Bedtime).toBe('就寝时间'); // menu_bedtime zh 逐字（非「睡眠时间」）
    expect(C.TAB_LABELS.World).toBe('世界时钟'); // gastown_menu_world_clock
    expect(C.TAB_LABELS.Timer).toBe('计时器'); // gastown_menu_timers
    expect(C.GASTOWN93_SPEC.fabSize).toBe(80);
    expect(C.GASTOWN93_SPEC.fabCorner).toBe(24);
    // 计时器预设 = core_time_preset_view 布局 time_digit 属性逐字（v11.50 的 1/3/5/10/15 翻面废弃）
    expect(C.PRESET_MINUTES).toEqual([5, 10, 30, 45]);
    expect(C.GASTOWN93_SPEC.presetChipSize).toBe(80); // SingleUnitTimerPresetViewShapeStyle 80dp
    // 秒表 98 圈上限（StopwatchModel.canLap）+ snooze 缺省 10 分钟（SettingsDAO "10"）
    expect(C.GASTOWN93_SPEC.maxLaps).toBe(98);
    expect(C.GASTOWN93_SPEC.defaultSnoozeMinutes).toBe(10);
  });

  it('字体轴矩阵（fontVariationSettings style bag 逐字 + 家族层 opsz）', () => {
    // TextAppearance.Time.DisplayLarge = 'wght' 450, 'ROND' 100, 'wdth' 80
    expect(C.fontVariation()).toBe("'wght' 450, 'ROND' 100, 'wdth' 80, 'opsz' 57");
    // CityDigitalClockTextStyle = 'wght' 500, 'ROND' 100, 'wdth' 100
    expect(C.fontVariation(C.GASTOWN93_SPEC.cityAxes)).toBe("'wght' 500, 'ROND' 100, 'wdth' 100, 'opsz' 57");
    // GastownTimerCountdownTextPausedStyle = 'wght' 250, 'ROND' 100, 'wdth' 80
    expect(C.fontVariation(C.GASTOWN93_SPEC.pausedAxes)).toBe("'wght' 250, 'ROND' 100, 'wdth' 80, 'opsz' 57");
    // TimerSetupTimeTextStyleBase = 'wght' 500, 'ROND' 100, 'wdth' 70（200sp 大字）
    expect(C.fontVariation(C.GASTOWN93_SPEC.setupAxes)).toBe("'wght' 500, 'ROND' 100, 'wdth' 70, 'opsz' 144");
    // GastownTimerCountdownTextMultipleTimersStyle = 'wght' 500, 'ROND' 100, 'wdth' 80
    expect(C.fontVariation(C.GASTOWN93_SPEC.multiAxes)).toBe("'wght' 500, 'ROND' 100, 'wdth' 80, 'opsz' 57");
  });

  it('Weekdays.java 位掩码逐字（0x01 Mon … 0x40 Sun）', () => {
    expect(C.WEEKDAY_BIT).toEqual({ Mon: 0x01, Tue: 0x02, Wed: 0x04, Thu: 0x08, Fri: 0x10, Sat: 0x20, Sun: 0x40 });
    expect(C.CAL_DAY_TO_BIT).toEqual({ 2: 0x01, 3: 0x02, 4: 0x04, 5: 0x08, 6: 0x10, 7: 0x20, 1: 0x40 });
    expect(C.describeDays(0x7f)).toBe('每天');
    expect(C.describeDays(0)).toBe(''); // 单次闹钟不显示重复行
    expect(C.describeDays(0x05)).toBe('周一、周三');
    expect(C.describeDays(0x60)).toBe('周六、周日');
    // makeAlarm 归一：h/m 取模、掩码截 7 位、snooze 白名单
    const a = C.makeAlarm({ id: 'x', h: 25, m: 70, days: 0xff, snoozeMinutes: 33 });
    expect(a.h).toBe(1); expect(a.m).toBe(10); expect(a.days).toBe(0x7f); expect(a.snoozeMinutes).toBe(10);
    expect(C.makeAlarm({ id: 'y', h: 7, m: 0, snoozeMinutes: 15 }).snoozeMinutes).toBe(15);
  });

  it('下次响铃：单次/周掩码 + 状态行 zh 逐字（alarm_scheduled_for_*）', () => {
    // 2026-01-02 周五 UTC 03:00 → 本地 UTC+8 11:00；单次 07:30 → 次日（本地周六 07:30）
    const now = Date.UTC(2026, 0, 2, 3, 0, 0);
    const daily = C.makeAlarm({ id: 'n', h: 7, m: 30 });
    const at = C.nextAlarmAt(daily, now, 480);
    expect(at).toBe(Date.UTC(2026, 0, 2, 23, 30)); // 本地 2026-01-03 07:30 = UTC 23:30 前日
    expect(C.upcomingText(daily, now, 480)).toBe('时间预定在明天'); // alarm_scheduled_for_tomorrow
    // 周掩码 0x1f = 周一~周五：周五 11:00 本地 → 下一次为周一
    const workday = C.makeAlarm({ id: 'w', h: 7, m: 30, days: 0x1f });
    expect(C.upcomingText(workday, now, 480)).toBe('时间预定在 周一');
    // 今天稍晚 → 今天
    const today = C.makeAlarm({ id: 't', h: 20, m: 0 });
    expect(C.upcomingText(today, now, 480)).toBe('时间预定在今天');
    // 关闭态 = alarm_alert_off_text 逐字
    expect(C.upcomingText({ ...daily, enabled: false }, now, 480)).toBe('闹钟已关闭');
    // 周掩码下一次命中：周六/周日（0x60）——周五本地 11:00 时下一次 = 周六，即明天
    expect(C.upcomingText(C.makeAlarm({ id: 'k', h: 9, m: 0, days: 0x60 }), now, 480)).toBe('时间预定在明天');
    expect(C.sortAlarms([
      C.makeAlarm({ id: 'b', h: 9, m: 0 }), C.makeAlarm({ id: 'a', h: 7, m: 30 }),
    ]).map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('世界时钟：真实 IANA 时区 DST 实时（City.java 语义，非写死偏移）', () => {
    // 伦敦：冬季 GMT(0) / 夏季 BST(+60)——2026-01-02 与 2026-07-02 必须不同（写死偏移做不到）
    expect(C.cityOffsetMinutes('Europe/London', Date.UTC(2026, 0, 2))).toBe(0);
    expect(C.cityOffsetMinutes('Europe/London', Date.UTC(2026, 6, 2))).toBe(60);
    expect(C.cityOffsetMinutes('Asia/Tokyo', Date.UTC(2026, 0, 2))).toBe(540);
    // City.java UtcOffsetComparator：按当前偏移升序，偏移同按名称
    const now = Date.UTC(2026, 0, 2);
    expect(C.sortCities([
      { name: '东京', tzId: 'Asia/Tokyo' }, { name: '伦敦', tzId: 'Europe/London' },
      { name: '上海', tzId: 'Asia/Shanghai' },
    ], now).map((c) => c.name)).toEqual(['伦敦', '上海', '东京']);
    // 时差行 zh 逐字（world_time_ahead/behind）：东京相对 +8 = 早 1 小时；差零 = 隐藏
    expect(C.worldOffsetText('Asia/Tokyo', now, 480)).toBe('早 1 小时');
    expect(C.worldOffsetText('Europe/London', now, 480)).toBe('晚 8 小时');
    expect(C.worldOffsetText('Asia/Shanghai', now, 480)).toBe('');
  });

  it('格式化：Gastown 秒表/倒计时（主显示无厘秒）+ zh 时长', () => {
    expect(C.formatStopwatch(0)).toBe('00:00');
    expect(C.formatStopwatch(65430)).toBe('01:05'); // %1$02d:%2$02d
    expect(C.formatStopwatch(3661000)).toBe('01:01:01'); // %1$02d:%2$02d:%3$02d
    expect(C.formatCountdown(0)).toBe('00:00');
    expect(C.formatCountdown(3661000)).toBe('1:01:01');
    expect(C.formatCountdown(65000)).toBe('01:05');
    expect(C.formatDurationZh(510)).toBe('8 小时 30 分钟');
    expect(C.formatDurationZh(60)).toBe('1 小时');
    expect(C.formatDurationZh(45)).toBe('45 分钟');
    expect(C.formatAlarmTime(7, 5)).toBe('07:05');
  });

  it('计时器：Timer.java 五态 + MIN_LENGTH + 到期排序 + addMinute', () => {
    expect(C.TIMER_STATE).toEqual({ RUNNING: 1, PAUSED: 2, EXPIRED: 3, RESET: 4, MISSED: 5 });
    expect(C.TIMER_MIN_LENGTH).toBe(1000);
    const t = C.makeTimer({ id: 't1', length: 90000 });
    expect(t.state).toBe(C.TIMER_STATE.RESET);
    // start：RESET → RUNNING（记 lastStartTime），剩余随 now 单调递减
    const r1 = C.timerStart(t, 1000);
    expect(r1.state).toBe(C.TIMER_STATE.RUNNING);
    expect(C.timerRemaining(r1, 30000)).toBe(61000);
    // pause：剩余冻结；resume 记新起点
    const p = C.timerPause(r1, 30000);
    expect(p.state).toBe(C.TIMER_STATE.PAUSED);
    expect(C.timerRemaining(p, 99000)).toBe(61000); // 冻结
    const r2 = C.timerStart(p, 120000);
    expect(C.timerRemaining(r2, 150000)).toBe(31000);
    // addMinute：剩余与总长同步 +60000（Timer.java addMinute）
    const plus = C.timerAddMinute(r2, 150000);
    expect(plus.remainingTime).toBe(31000 + 60000);
    expect(plus.totalLength).toBe(90000 + 60000);
    // 到期翻转 + 到期序（MISSED→EXPIRED→RUNNING→PAUSED→RESET）
    const e = C.timerExpireIfDue(r1, 999999);
    expect(e.state).toBe(C.TIMER_STATE.EXPIRED);
    expect(C.timerStateOrder(C.TIMER_STATE.MISSED)).toBeLessThan(C.timerStateOrder(C.TIMER_STATE.EXPIRED));
    expect(C.timerStateOrder(C.TIMER_STATE.RESET)).toBe(4);
    // sortTimers：EXPIRED 在前，同态按剩余升序
    const running = C.timerStart(C.makeTimer({ id: 't2', length: 600000 }), 1000);
    const list = C.sortTimers([running, e, C.timerPause(running, 5000)], 10000);
    expect(list[0].state).toBe(C.TIMER_STATE.EXPIRED);
    // reset 回原长
    expect(C.timerReset(e)).toMatchObject({ state: C.TIMER_STATE.RESET, remainingTime: 90000, totalLength: 90000 });
  });

  it('计时器键盘：左移压入 / 00 / 退格 / 分秒不钳 59（90 分钟合法）+ 预设', () => {
    let s = { digits: '000000' };
    for (const k of ['1', '2', '3', '4', '5', '6']) s = C.keypadReducer(s, k);
    expect(s.digits).toBe('123456');
    expect(C.keypadReducer(s, 'backspace').digits).toBe('012345');
    expect(C.keypadReducer(s, '00').digits).toBe('345600');
    expect(C.keypadReducer(s, 'x').digits).toBe('123456');
    expect(C.keypadReducer(s, 'clear').digits).toBe('000000');
    // AOSP 允许 90 分钟输入（v11.52 的 m/s 钳 59 已废弃）
    expect(C.digitsToSeconds('009000')).toBe(5400);
    expect(C.digitsToSeconds('000061')).toBe(61);
    expect(C.timerColumns('123456')).toEqual([
      { value: '12', unit: '时' }, { value: '34', unit: '分' }, { value: '56', unit: '秒' },
    ]);
    // 预设 5/10/30/45 分钟 → 00+mm+00
    for (const m of C.PRESET_MINUTES) expect(C.presetDigits(m)).toBe(`00${C.pad2(m)}00`);
    expect(C.presetDigits(45)).toBe('004500');
    const p = C.ringProgress(500, 1000, 1000);
    expect(p.fraction).toBe(0.5);
    expect(Number(p.dash) + Number(p.gap)).toBeCloseTo(1000, 2);
  });

  it('秒表：圈对象（lapNumber/lapTime/totalTime）/ 98 圈上限 / 最快最慢', () => {
    const l1 = C.lapReducer([], 1200);
    expect(l1[0]).toEqual({ lapNumber: 1, lapTime: 1200, totalTime: 1200 });
    const l2 = C.lapReducer(l1, 3500);
    expect(l2[1]).toEqual({ lapNumber: 2, lapTime: 2300, totalTime: 3500 });
    expect(C.lapBestWorst(l2)).toEqual({ best: 0, worst: 1 }); // 第 1 圈更快
    const three = C.lapReducer(C.lapReducer(l2, 6000), 9000);
    expect(C.lapBestWorst(three)).toEqual({ best: 0, worst: 3 });
    expect(C.lapBestWorst(l1)).toEqual({ best: -1, worst: -1 }); // <2 圈不标注
    expect(C.canLap(new Array(97).fill(0))).toBe(true);
    expect(C.canLap(new Array(98).fill(0))).toBe(false); // StopwatchModel: size() < 98
    expect(C.formatLap(2300)).toBe('00:02');
  });

  it('就寝：跨零点时长（v11.52 假活动条已废弃）+ tab 键盘循环', () => {
    expect(C.bedtimeDurationMinutes(22, 30, 7, 0)).toBe(510);
    expect(C.bedtimeDurationMinutes(7, 0, 7, 0)).toBe(0);
    expect(C.nextTab('Alarm', 1)).toBe('World');
    expect(C.nextTab('Bedtime', 1)).toBe('Alarm');
    expect(C.nextTab('Alarm', -1)).toBe('Bedtime');
  });

  it('纯函数核纪律：零 DOM / 零 Date.now / 零 Math.random', () => {
    const s = CORE();
    expect(s).not.toMatch(/\bdocument\.[a-zA-Z]/);
    expect(s).not.toMatch(/\bDate\.now\s*\(/);
    expect(s).not.toMatch(/\bMath\.random\s*\(/);
    expect(s).not.toMatch(/\blocalStorage\./);
  });
});

// ================================================================ ② 9.3 规格结构锚
describe('9.3 主壳 · 规格逐字锚', () => {
  it('五 tab DOM 顺序 + animated-selector 双态矢量 + AVD 接线', () => {
    const h = HTML();
    const tabs = [...h.matchAll(/class="nav-item[^"]*"\s+data-tab="(\w+)"/g)].map((m) => m[1]);
    expect(tabs).toEqual(C.TAB_ORDER);
    expect(h).toContain('<nav class="gastown-nav"');
    expect(h).toContain('src="./app.mjs"');
    const app = APP();
    expect(app).toContain("from './avd/gastown-nav.mjs'"); // AVD 接线经 app.mjs 装载
    expect(app).toContain('mountGastownNav()');
    // 静态双态矢量 5×2 逐字来自 9.3 原始资产
    const assets = ASSETS();
    const json = JSON.parse(assets.slice(assets.indexOf('GASTOWN93_TABS = ') + 17, assets.indexOf(';\n', assets.indexOf('GASTOWN93_TABS = '))));
    for (const k of C.TAB_ORDER) {
      expect(h).toContain(json[k].sel);
      expect(h).toContain(json[k].un);
    }
    expect(h.match(/class="p-sel"/g)).toHaveLength(5);
    expect(h.match(/class="p-un"/g)).toHaveLength(5);
  });

  it('AVD 过渡期静态 item 让位，图标动画唯一驱动为 9.3 时间轴', () => {
    const h = HTML();
    expect(h).toContain('.nav-item.avd-playing .gastown-avd-overlay');
    expect(h).toContain('.nav-item.avd-playing .nav-svg');
    expect(h).not.toMatch(/@keyframes[^{]*\{[^}]*\.p-sel/); // 无叠播的 CSS 图标 keyframes
    const app = APP();
    expect(app).toContain("it.classList.toggle('active', sel)"); // 只切 class 触发 AVD
    expect(app).not.toContain('animate-click');
  });

  it('FAB / 卡片 / 大时间 / 城市卡 / 计时器 / 秒表实测值', () => {
    const h = HTML();
    for (const s of [
      '--g93-fab: 80px', '--g93-fab-r: 24px', '--g93-fab-icon: 28px',
      '--g93-card-r: 24px', '--g93-alarm-time: 36px',
      '--g93-main-clock: 56px', '--g93-analog: 240px',
      '--g93-city-name: 24px', '--g93-city-clock: 57px',
      '--g93-ring-track: 12px', '--g93-ring-r: 6px', '--g93-ring-gap: 12px',
      '--g93-timer-text: 80px', '--g93-timer-setup: 200px', '--g93-preset: 80px',
      '--g93-rail: 80px',
    ]) expect(h, s).toContain(s);
    expect(APP()).toContain('viewBox="0 0 340 340"'); // 环形进度 indicatorSize 340dp（运行卡模板）
    expect(h).toContain('width: 48px; height: 48px'); // 前后圈箭头/图标钮 48dp
    expect(h).toContain('grid-template-columns: repeat(3, 1fr)'); // 键盘 3 列
    expect(h).toContain('data-page="Bedtime"'); // 第五页「就寝时间」
    expect(h).toContain('您的就寝时间活动数据将于明天显示在此处'); // bedtime_activity_tomorrow 逐字（假活动条已废弃）
    expect(h).toContain('时间表'); // bedtime_card_title_schedule
    expect(h).toContain('近期就寝时间的活动'); // bedtime_card_title_activity_sleep
  });

  it('字体链翻面：Google Sans Flex 自托管（Roboto Flex 退役）+ 轴矩阵 + tnum', () => {
    const h = HTML();
    expect(h).toContain('google-sans-flex.css'); // OFL 实拉子集自托管
    expect(h).not.toContain('roboto-flex'); // 旧字体决策退役
    expect(h).toContain("'wght' 450, 'ROND' 100, 'wdth' 80, 'opsz' 57");
    expect(h).toContain("'wght' 500, 'ROND' 100, 'wdth' 100, 'opsz' 57");
    expect(h).toContain("'wght' 250, 'ROND' 100, 'wdth' 80, 'opsz' 57");
    expect(h).toContain("'wght' 500, 'ROND' 100, 'wdth' 70, 'opsz' 144");
    expect(h).toContain("font-feature-settings: 'tnum' 1");
    expect(h).toContain('letter-spacing: -0.04em'); // TimeBaseLarge
    const css = read('ios-desktop/assets/fonts/google-sans-flex.css');
    expect(css).toContain("font-family: 'GoogleSansFlex'");
    expect(css).toContain('font-weight: 100 1000');
    expect(css).toContain('font-stretch: 25% 151%');
  });

  it('响应式真布局变体（h600 / h800 / w1536 世界时钟 52% / land NavigationRail 80px）', () => {
    const h = HTML();
    expect(h).toContain('@media (min-height: 600px)');
    expect(h).toContain('@media (min-height: 800px)');
    expect(h).toContain('@media (min-width: 1536px)');
    expect(h).toContain('grid-template-columns: 1fr 52%'); // 宽屏世界时钟 52% 分栏
    expect(h).toContain('flex-direction: column; width: var(--g93-rail)'); // 横屏 NavigationRail
  });

  it('文案逐字锚（zh 字符串池）', () => {
    const h = HTML();
    expect(h).toContain('没有闹钟'); // no_alarms
    expect(h).toContain('时间表'); // bedtime_card_title_schedule
    expect(h).toContain('就寝'); // bedtime 行标签
    const app = APP();
    expect(app).toContain('下次闹钟时间：'); // next_alarm_description
    expect(app).toContain("'时间到'"); // timer_times_up
    const core = CORE();
    expect(core).toContain("'时间预定在今天'"); // alarm_scheduled_for_today
    expect(core).toContain("'时间预定在明天'"); // alarm_scheduled_for_tomorrow
    expect(core).toContain("'闹钟已关闭'"); // alarm_alert_off_text
    expect(core).toContain("diff > 0 ? '早' : '晚'"); // world_time_ahead/behind 方向
    expect(core).toContain('（明天）'); // world_hours_tomorrow 标注位
    expect(core).toContain('每天'); // 周掩码 0x7f
    expect(core).toContain('延后时长'); // snooze_duration_title（闹钟表单）
  });

  it('开关小球使用安卓17样式（A17 Expressive Switch 单一真源，非自绘）', () => {
    const h = HTML();
    const app = APP();
    // 共享样式表 + 标准 DOM + 引擎接线（三者缺一即退回自绘近似）
    expect(h).toContain('href="../../css/md3-theme.css"');
    expect(h).toContain('class="md3-switch"');
    expect(h).toContain('class="slider"><span class="thumb"');
    expect(app).toContain("initM3Switch } from '../../js/m3-controls.js'");
    expect(app).toContain("querySelectorAll('.md3-switch').forEach(initM3Switch)");
    expect(app).toContain('data-toggle=');
    // A17 组件本体的逐值锚
    const ctrl = read('ios-desktop/js/m3-controls.js');
    const css = read('ios-desktop/css/md3-theme.css');
    expect(ctrl).toContain('const THUMB_REST = 24');
    expect(ctrl).toContain('const THUMB_PRESSED = 28');
    expect(ctrl).toContain('M382,720L154,492L211,435L382,606L749,239L806,296L382,720Z');
    expect(css).toContain('.md3-switch input:checked + .slider .thumb');
    expect(css).toContain('.a17-thumb-icon');
  });

  it('转义单源委托（sanitize 纪律）', () => {
    const app = APP();
    expect(app).toContain('window.__mdEscape ? window.__mdEscape(');
  });
});

// ================================================================ ③ 桌面注册
describe('9.3 时钟 · 桌面注册', () => {
  it('独立应用身份 clock93（不复用已退役的旧实现）', () => {
    const d = read('ios-desktop/js/apps/clock93.js');
    expect(d).toContain("id: 'clock93'");
    expect(d).toContain("iframeAppContent('apps/clock-app/index.html')");
    expect(read('ios-desktop/js/apps-data.js')).toContain("import clock93 from './apps/clock93.js'");
    expect(read('ios-desktop/js/apps-data.js')).toContain('clock93, // v11.53 #330');
    expect(read('ios-desktop/js/app-icons.js')).toContain("APP_ICONS['clock93']");
    expect(d).not.toContain('clock_app');
  });

  it('9.3 原始 AVD 三模块原地保留（旧测试锚零改动）', () => {
    expect(read('ios-desktop/apps/clock-app/avd/avd-runtime.mjs')).toContain('export function playAVD');
    expect(read('ios-desktop/apps/clock-app/avd/gastown-nav.mjs')).toContain('MutationObserver');
    expect(ASSETS()).toContain('"objectAnimators": 53');
  });

  it('AXML→Web SVG 兼容层：孤立无参命令字母运行时剥离，原始资产数值零改写', () => {
    const r = read('ios-desktop/apps/clock-app/avd/avd-runtime.mjs');
    expect(r).toContain('function safePathData(d)');
    expect(r).toContain('.replace(/([a-yA-Y])\\s*(?=[a-zA-Z]|$)/g');
    expect(r.match(/safePathData\(/g).length).toBeGreaterThanOrEqual(4); // 定义 + 3 写入点
    // 资产仍逐字保留原始 pathData（不改数值）
    expect(ASSETS()).toContain('10.65,-5.57c');
  });
});
