// ==================== app.mjs — Google Clock 9.3「Gastown」DOM 接线（按源码从零重写） ====================
//
// v11.53 #330 返工：v11.53 自创交互面全部废弃。本模块只做接线，全部语义来自
// clock93-core.mjs（AOSP 模型逐字）+ gastown93 布局证据：
//   · 闹钟页 = 城市列表壳：主时钟帧（AutoSizing 56sp + 日期 + 下次闹钟行）+ 城市卡
//     （fragment_world_clock / gastown_world_clock_item；城市按 City.java 比较器实时排序）
//   · 闹钟页 = 卡列表（gastown_alarm_time_collapsed：头行 天数·状态·标签 / 主行 36sp+开关）
//   · 计时器 = 多计时器（Timer.java 五态 + sortTimers 到期序；键盘 1-9/00/0/退格；
//     预设 5/10/30/45 分钟逐字取证；+1 分钟 = addMinute 剩余与总长同步加）
//   · 秒表 = StopwatchModel（98 圈上限 / 最快最慢标注 / H:MM:SS·MM:SS Gastown 格式串）
//   · 就寝 = 时间表卡（就寝/起床/开关 + 睡眠时长）+ 近期活动卡（无数据空态文案逐字）
// 9.3 原始 AVD 过渡由 avd/gastown-nav.mjs 监听 .nav-item.active 自动驱动，本模块只切 class。

import * as C from './clock93-core.mjs';
import { mountGastownNav } from './avd/gastown-nav.mjs';
// 9.3 动效层：时长/缓动/几何逐值对照 gastown93 arsc 与 RippleShader.java（见文件头注释）
import * as M93 from './g93-motion.mjs';
import { initM3Switch } from '../../js/m3-controls.js'; // 安卓17 Expressive Switch 引擎（单一真源）

const $ = (id) => document.getElementById(id);
const esc = (s) => (window.__mdEscape ? window.__mdEscape(String(s)) : String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
)));

// ---------------------------------------------------------------- 持久化（新键 + 旧键一次性迁移）
const KEY = 'ios-desktop:clock93-v1';
const LEGACY_KEYS = ['clock93:state-v1'];

const CITY_PRESETS = [
  { id: 'shanghai', name: '上海', tzId: 'Asia/Shanghai' },
  { id: 'beijing', name: '北京', tzId: 'Asia/Shanghai' },
  { id: 'hongkong', name: '香港', tzId: 'Asia/Hong_Kong' },
  { id: 'taipei', name: '台北', tzId: 'Asia/Taipei' },
  { id: 'singapore', name: '新加坡', tzId: 'Asia/Singapore' },
  { id: 'tokyo', name: '东京', tzId: 'Asia/Tokyo' },
  { id: 'seoul', name: '首尔', tzId: 'Asia/Seoul' },
  { id: 'sydney', name: '悉尼', tzId: 'Australia/Sydney' },
  { id: 'auckland', name: '奥克兰', tzId: 'Pacific/Auckland' },
  { id: 'bangkok', name: '曼谷', tzId: 'Asia/Bangkok' },
  { id: 'dubai', name: '迪拜', tzId: 'Asia/Dubai' },
  { id: 'moscow', name: '莫斯科', tzId: 'Europe/Moscow' },
  { id: 'istanbul', name: '伊斯坦布尔', tzId: 'Europe/Istanbul' },
  { id: 'cairo', name: '开罗', tzId: 'Africa/Cairo' },
  { id: 'paris', name: '巴黎', tzId: 'Europe/Paris' },
  { id: 'berlin', name: '柏林', tzId: 'Europe/Berlin' },
  { id: 'london', name: '伦敦', tzId: 'Europe/London' },
  { id: 'newyork', name: '纽约', tzId: 'America/New_York' },
  { id: 'toronto', name: '多伦多', tzId: 'America/Toronto' },
  { id: 'chicago', name: '芝加哥', tzId: 'America/Chicago' },
  { id: 'mexico', name: '墨西哥城', tzId: 'America/Mexico_City' },
  { id: 'losangeles', name: '洛杉矶', tzId: 'America/Los_Angeles' },
  { id: 'honolulu', name: '檀香山', tzId: 'Pacific/Honolulu' },
  { id: 'saopaulo', name: '圣保罗', tzId: 'America/Sao_Paulo' },
];

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw) return raw;
    for (const lk of LEGACY_KEYS) {
      const old = JSON.parse(localStorage.getItem(lk) || 'null');
      if (old) { localStorage.removeItem(lk); return migrateLegacy(old); }
    }
  } catch (e) { /* 隐私模式静默降级 */ }
  return null;
}

/** v11.53 旧结构（days 数组 / 固定 offset 城市）一次性迁移到位掩码 + IANA tzId */
function migrateLegacy(o) {
  const daysBit = (arr) => ((arr || []).reduce((m, d) => m | ({ 1: 0x01, 2: 0x02, 3: 0x04, 4: 0x08, 5: 0x10, 6: 0x20, 0: 0x40 }[d] || 0), 0));
  return {
    alarms: (o.alarms || []).map((a, i) => C.makeAlarm({ id: a.id || `a${i}`, h: a.h, m: a.m, days: daysBit(a.days), label: a.label || '', enabled: a.enabled !== false })),
    cities: (o.cities || []).map((c) => ({ id: c.id, name: c.name, tzId: legacyTz(c.id, c.name) })),
    bed: o.bed || { bedH: 22, bedM: 30, wakeH: 7, wakeM: 0, enabled: true },
    tab: C.TAB_ORDER.includes(o.tab) ? o.tab : 'Alarm',
  };
}

const LEGACY_TZ = {
  beijing: 'Asia/Shanghai', shanghai: 'Asia/Shanghai', tokyo: 'Asia/Tokyo', seoul: 'Asia/Seoul',
  london: 'Europe/London', paris: 'Europe/Paris', newyork: 'America/New_York', sydney: 'Australia/Sydney',
  dubai: 'Asia/Dubai',
};
const legacyTz = (id, name) => LEGACY_TZ[id] || CITY_PRESETS.find((p) => p.name === name)?.tzId || 'Asia/Shanghai';

const state = Object.assign(loadState() || {
  alarms: [
    C.makeAlarm({ id: 'a1', h: 7, m: 0, days: 0x1f, label: '工作日起床' }), // 周一~周五
    C.makeAlarm({ id: 'a2', h: 9, m: 30, days: 0x60, label: '周末', enabled: false }),
  ],
  cities: [
    { id: 'shanghai', name: '上海', tzId: 'Asia/Shanghai' },
    { id: 'tokyo', name: '东京', tzId: 'Asia/Tokyo' },
    { id: 'london', name: '伦敦', tzId: 'Europe/London' },
  ],
  bed: { bedH: 22, bedM: 30, wakeH: 7, wakeM: 0, enabled: true },
  tab: 'Alarm',
}, {
  timers: [], // 多计时器（Timer.java 五态；运行态不入存档——重启即失，与真机进程模型一致）
});
if (!Array.isArray(state.alarms)) state.alarms = [];
if (!Array.isArray(state.cities)) state.cities = [];
if (!Array.isArray(state.timers)) state.timers = [];
if (!state.bed) state.bed = { bedH: 22, bedM: 30, wakeH: 7, wakeM: 0, enabled: true };

let sw = { state: 4, elapsedMs: 0, lastStartMs: 0, laps: [], view: -1 }; // AOSP Stopwatch.State RESET=4/RUNNING=1/PAUSED=2
let timerDraft = { digits: '000000' };
let timerSetupOpen = state.timers.length === 0;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      alarms: state.alarms, cities: state.cities, bed: state.bed, tab: state.tab,
    }));
  } catch (e) { /* 隐私模式静默降级 */ }
}

// ---------------------------------------------------------------- 通用工具
const NOW = () => Date.now();
const LOCAL_OFFSET = -new Date().getTimezoneOffset();

// ---------------------------------------------------------------- 导航（9.3 AVD 驱动）
function selectTab(tab, opts = {}) {
  if (!C.TAB_ORDER.includes(tab)) return;
  state.tab = tab;
  $('g93App').dataset.tab = tab;
  $('g93Title').textContent = C.TAB_LABELS[tab];
  document.querySelectorAll('.g93-page').forEach((p) => {
    p.classList.toggle('is-active', p.dataset.page === tab);
  });
  document.querySelectorAll('.gastown-nav .nav-item').forEach((it) => {
    const sel = it.dataset.tab === tab;
    it.classList.toggle('active', sel);
    it.setAttribute('aria-selected', sel ? 'true' : 'false');
  });
  const fab = $('g93Fab');
  const show = tab === 'Alarm' || tab === 'World' || (tab === 'Timer' && !timerSetupOpen);
  fab.hidden = !show;
  fab.setAttribute('aria-label', tab === 'World' ? '添加城市' : tab === 'Timer' ? C.TAB_LABELS.Timer + '：添加定时器' : '添加闹钟');
  if (!opts.silent) save();
}

document.querySelectorAll('.gastown-nav .nav-item').forEach((it) => {
  it.addEventListener('click', () => selectTab(it.dataset.tab));
});

// ---------------------------------------------------------------- 闹钟页（gastown_alarm_time_collapsed 结构）
// v11.53 拆分：renderAlarms = 结构重建（增删/开关/编辑交互路径）；tickAlarms =
// 每秒文本级增量（upcoming 文本值比对写入）。旧实现在主循环里每秒全量重建
// innerHTML —— 全新 DOM 导致开关 transition 重放（「开关小球乱飞」根因之二：
// 每秒一次小球从初始位置动画到选中位） + 每秒无谓重排，为性能杀手。
function renderAlarms() {
  const list = $('alarmList');
  const items = C.sortAlarms(state.alarms);
  $('alarmEmpty').hidden = items.length > 0; // no_alarms = 没有闹钟（zh 逐字）
  list.innerHTML = items.map((a) => {
    const days = C.describeDays(a.days);
    const up = C.upcomingText(a, NOW(), LOCAL_OFFSET);
    return `<article class="g93-alarm-card" data-alarm="${esc(a.id)}">
      <div class="g93-alarm-head">
        <span class="g93-alarm-days">${esc(days)}</span>
        <span class="g93-alarm-upcoming" data-upcoming>${esc(up)}</span>
        ${a.label ? `<span class="g93-alarm-label">${esc(a.label)}</span>` : ''}
        <button type="button" class="g93-icon-btn" data-edit="${esc(a.id)}" aria-label="编辑闹钟">✎</button>
      </div>
      <div class="g93-alarm-mainrow">
        <div class="g93-alarm-time g93-time${a.enabled ? '' : ' is-paused'}">${C.formatAlarmTime(a.h, a.m)}</div>
        <label class="md3-switch">
          <input type="checkbox" data-toggle="${esc(a.id)}" ${a.enabled ? 'checked' : ''} aria-label="启用闹钟">
          <span class="slider"><span class="thumb"></span></span>
        </label>
      </div>
    </article>`;
  }).join('');
  list.querySelectorAll('.md3-switch').forEach(initM3Switch);
}

/** 每秒文本级增量：upcoming 值比对写入（结构不重建 → 开关不重绑不重放） */
function tickAlarms(now) {
  $('alarmList').querySelectorAll('[data-upcoming]').forEach((el) => {
    const card = el.closest('[data-alarm]');
    const a = card && state.alarms.find((x) => x.id === card.dataset.alarm);
    if (!a) return;
    const up = C.upcomingText(a, now, LOCAL_OFFSET);
    if (el.textContent !== up) el.textContent = up;
  });
}

$('alarmList').addEventListener('change', (e) => {
  const id = e.target.dataset.toggle;
  if (!id) return;
  const a = state.alarms.find((x) => x.id === id);
  if (a) { a.enabled = e.target.checked; save(); renderAlarms(); }
});
$('alarmList').addEventListener('click', (e) => {
  const id = e.target.closest('[data-edit]')?.dataset.edit;
  if (id) openAlarmSheet(state.alarms.find((x) => x.id === id));
});

function alarmSheetBody(a) {
  const days = a ? a.days : 0;
  const zhOrder = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const bitOrder = [0x40, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20];
  return `
    <div class="g93-sheet-row"><span>时间</span><input type="time" id="sheetTime" value="${a ? C.formatAlarmTime(a.h, a.m) : '07:00'}"></div>
    <div class="g93-sheet-row"><span>名称</span><input type="text" id="sheetLabel" value="${a ? esc(a.label) : ''}" maxlength="32" placeholder="${esc('闹钟名称')}"></div>
    <div class="g93-sheet-blocktitle">重复</div>
    <div class="g93-days" id="sheetDays" role="group" aria-label="重复日">${zhOrder.map((d, i) =>
      `<button type="button" class="g93-day${days & bitOrder[i] ? ' on' : ''}" data-bit="${bitOrder[i]}" aria-pressed="${!!(days & bitOrder[i])}">${d}</button>`).join('')}</div>
    <div class="g93-sheet-row"><span>延后时长</span>
      <select id="sheetSnooze" aria-label="延后时长">${C.SNOOZE_CHOICES.map((m) =>
        `<option value="${m}" ${a && a.snoozeMinutes === m ? 'selected' : ''}>${m} 分钟</option>`).join('')}</select>
    </div>`;
}

function openAlarmSheet(a) {
  const editing = !!a;
  openSheet(editing ? '修改' : '添加闹钟', alarmSheetBody(a), () => {
    const [h, m] = ($('sheetTime').value || '07:00').split(':').map(Number);
    const days = Array.from(document.querySelectorAll('#sheetDays .g93-day.on'))
      .reduce((mask, b) => mask | Number(b.dataset.bit), 0);
    const snooze = Number($('sheetSnooze')?.value || 10);
    if (editing) {
      Object.assign(a, C.makeAlarm({ ...a, h, m, days, label: $('sheetLabel').value.trim(), snoozeMinutes: snooze }));
    } else {
      state.alarms.push(C.makeAlarm({
        id: `a${NOW()}`, h, m, days, label: $('sheetLabel').value.trim(), snoozeMinutes: snooze,
      }));
    }
    save(); renderAlarms();
  });
  if (editing) {
    const del = document.createElement('button');
    del.type = 'button'; del.className = 'g93-sheet-danger'; del.textContent = '删除';
    del.setAttribute('aria-label', `删除${a.label || '闹钟'}`);
    del.addEventListener('click', () => {
      state.alarms = state.alarms.filter((x) => x.id !== a.id);
      save(); renderAlarms(); closeSheet();
    });
    $('sheetBody').appendChild(del);
  }
}

// ---------------------------------------------------------------- 世界时钟页（主时钟帧 + 城市卡）
// v11.53 同闹钟页拆分：renderWorld = 结构重建（城市增删交互路径）；tickWorld =
// 每秒文本级增量（时间/时差值比对写入），主循环不再每秒全量重建 innerHTML。
function renderWorld() {
  const now = NOW();
  const list = C.sortCities(state.cities, now);
  $('cityList').innerHTML = list.map((c) => {
    const t = C.cityClockAt(c.tzId, now);
    const off = C.worldOffsetText(c.tzId, now, LOCAL_OFFSET);
    return `<article class="g93-city-card" data-city="${esc(c.id)}">
      <div class="g93-city-left">
        <div class="g93-city-name">${esc(c.name)}</div>
        ${off ? `<div class="g93-city-offset" data-offset>${esc(off)}</div>` : ''}
      </div>
      <div class="g93-city-right">
        <div class="g93-city-clock g93-time is-city" data-clock>${t.text}</div>
        <button type="button" class="g93-icon-btn" data-city-del="${esc(c.id)}" aria-label="移除${esc(c.name)}">✕</button>
      </div>
    </article>`;
  }).join('') || '<div class="g93-empty">还没有城市 · 点右下角 + 添加</div>';
}

/** 每秒文本级增量：城市钟/时差值比对写入（DST 边界自动跟进，结构不动） */
function tickWorld(now) {
  $('cityList').querySelectorAll('[data-city]').forEach((card) => {
    const c = state.cities.find((x) => x.id === card.dataset.city);
    if (!c) return;
    const clock = card.querySelector('[data-clock]');
    if (clock) {
      const t = C.cityClockAt(c.tzId, now).text;
      if (clock.textContent !== t) clock.textContent = t;
    }
    const off = card.querySelector('[data-offset]');
    if (off) {
      const text = C.worldOffsetText(c.tzId, now, LOCAL_OFFSET);
      if (off.textContent !== text) off.textContent = text;
    }
  });
}
$('cityList').addEventListener('click', (e) => {
  const id = e.target.closest('[data-city-del]')?.dataset.cityDel;
  if (!id) return;
  state.cities = state.cities.filter((c) => c.id !== id);
  save(); renderWorld();
});

function openCitySheet() {
  const avail = CITY_PRESETS.filter((p) => !state.cities.some((c) => c.id === p.id));
  openSheet('添加城市', `
    <div class="g93-sheet-row"><span>城市</span>
      <select id="sheetCity" aria-label="选择城市">${avail.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
    </div>
    ${avail.length ? '' : '<div class="g93-empty">预设城市已全部添加</div>'}
  `, () => {
    const p = CITY_PRESETS.find((x) => x.id === $('sheetCity')?.value);
    if (p) { state.cities.push({ ...p }); save(); renderWorld(); }
  });
}

// 主时钟帧（gastown_main_clock_frame：AutoSizing 56sp + 日期 + 下次闹钟行）
function tickMainClock() {
  const now = NOW();
  const d = new Date(now);
  $('mainClock').textContent = `${C.pad2(d.getHours())}:${C.pad2(d.getMinutes())}`;
  $('mainDateText').textContent = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 ${C.WEEKDAY_ZH[d.getDay()]}`;
  const next = C.sortAlarms(state.alarms.filter((a) => a.enabled))
    .map((a) => ({ a, at: C.nextAlarmAt(a, now, LOCAL_OFFSET) }))
    .filter((x) => x.at > 0)
    .sort((x, y) => x.at - y.at)[0];
  $('nextAlarmText').textContent = next ? `下次闹钟时间：${C.formatAlarmTime(next.a.h, next.a.m)}` : '未设置闹钟';
}

// ---------------------------------------------------------------- 计时器页（Timer.java 五态 + 键盘 + 预设）
// 由 gastown93 arsc 令牌派生：indicatorSize 340 − trackThickness 12 → r=164
// （等值于 C.ringCircumference，此处保留局部常量避免热路径重复取属性）
const RING_C = C.ringCircumference;

function renderTimerSetup() {
  const cols = C.timerColumns(timerDraft.digits);
  $('timerDisplay').innerHTML = cols.map((c) =>
    `<div class="g93-timer-col"><span class="v g93-setup-digits">${c.value}</span><span class="u">${c.unit}</span></div>`).join('');
  $('timerStart').disabled = C.digitsToSeconds(timerDraft.digits) < C.TIMER_MIN_LENGTH / 1000;
  $('timerPresets').innerHTML = C.PRESET_MINUTES.map((m) =>
    `<button type="button" class="g93-preset" data-min="${m}" aria-label="${m} 分钟">
      <span class="p g93-preset-num">${m}</span><span class="u">分钟</span></button>`).join('');
}

function renderKeypad() {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'backspace'];
  $('timerKeypad').innerHTML = keys.map((k) =>
    `<button type="button" class="g93-key" data-key="${k}" aria-label="${k === 'backspace' ? '退格键' : k}">${k === 'backspace' ? '⌫' : k}</button>`).join('');
}

function renderTimerCards() {
  const wrap = $('timerCards');
  const now = NOW();
  const items = C.sortTimers(state.timers, now);
  timerSetupOpen = items.length === 0 || state.__addingTimer === true;
  $('timerSetup').hidden = !timerSetupOpen;
  wrap.innerHTML = items.map((t) => {
    const rem = Math.max(0, C.timerRemaining(t, now));
    const paused = t.state === C.TIMER_STATE.PAUSED;
    const expired = t.state === C.TIMER_STATE.EXPIRED || t.state === C.TIMER_STATE.MISSED;
    const p = M93.ringGeometry(expired ? 0 : rem, t.totalLength, RING_C, C.GASTOWN93_SPEC.timerGap);
    const axisCls = items.length > 1 ? ' is-multi' : paused ? ' is-paused' : '';
    const btn = expired ? '<span class="g93-timer-state">时间到</span>'
      : `<button type="button" class="g93-timer-btn" data-timer-toggle="${esc(t.id)}" aria-label="${paused ? '继续' : '暂停'}">${paused ? '继续' : '暂停'}</button>`;
    return `<article class="g93-timer-card" data-timer="${esc(t.id)}">
      <div class="g93-ring-wrap">
        <svg class="g93-ring" viewBox="0 0 340 340" aria-hidden="true">
          <circle class="track" cx="170" cy="170" r="164"/>
          <circle class="indicator ${expired ? 'expired' : ''}" cx="170" cy="170" r="164"
            stroke-dasharray="${p.dash} ${p.gap}" stroke-dashoffset="${p.offset}"/>
        </svg>
        <!-- @id/timer_track_expired  src=@drawable/timer_expired_round（gastown_timer_card res/N4.xml） -->
        <span class="g93-timer-track-expired" ${expired ? '' : 'hidden'} aria-hidden="true"></span>
        <div class="g93-ring-center">
          <div class="g93-timer-text g93-time${axisCls}">${expired ? '时间到' : C.formatCountdown(rem)}</div>
          ${t.label ? `<div class="g93-timer-label">${esc(t.label)}</div>` : ''}
        </div>
      </div>
      <div class="g93-timer-actions">
        <button type="button" class="g93-icon-round" data-timer-del="${esc(t.id)}" aria-label="删除">✕</button>
        <button type="button" class="g93-icon-round" data-timer-plus="${esc(t.id)}" aria-label="增加 1 分钟" ${expired ? 'hidden' : ''}>+1分</button>
        ${btn}
      </div>
    </article>`;
  }).join('');
}

function startDraftTimer() {
  const s = C.digitsToSeconds(timerDraft.digits) * 1000;
  if (s < C.TIMER_MIN_LENGTH) return;
  state.timers.push(C.makeTimer({ id: `t${NOW()}`, length: s, label: '' }));
  state.__addingTimer = false;
  timerDraft = { digits: '000000' };
  renderTimerCards();
  renderTimerSetup();
  selectTab('Timer', { silent: true });
}

$('timerKeypad').addEventListener('click', (e) => {
  const k = e.target.dataset.key;
  if (!k) return;
  timerDraft = C.keypadReducer(timerDraft, k);
  renderTimerSetup();
});
$('timerPresets').addEventListener('click', (e) => {
  const m = Number(e.target.closest('[data-min]')?.dataset.min);
  if (!m) return;
  timerDraft = { digits: C.presetDigits(m) };
  renderTimerSetup();
});
$('timerStart').addEventListener('click', startDraftTimer);
$('timerCards').addEventListener('click', (e) => {
  const card = e.target.closest('[data-timer]');
  if (!card) return;
  const id = card.dataset.timer;
  const now = NOW();
  let t = state.timers.find((x) => x.id === id);
  if (!t) return;
  if (e.target.closest('[data-timer-del]')) {
    state.timers = state.timers.filter((x) => x.id !== id);
  } else if (e.target.closest('[data-timer-plus]')) {
    t = C.timerAddMinute(t, now);
    state.timers = state.timers.map((x) => (x.id === id ? t : x));
  } else if (e.target.closest('[data-timer-toggle]')) {
    t = t.state === C.TIMER_STATE.RUNNING ? C.timerPause(t, now) : C.timerStart(t, now);
    state.timers = state.timers.map((x) => (x.id === id ? t : x));
  } else return;
  renderTimerCards();
});

// ---------------------------------------------------------------- 秒表页（StopwatchModel 语义）
function renderStopwatch() {
  const running = sw.state === 1;
  const elapsed = sw.state === 4 ? 0 : (running ? sw.elapsedMs + (NOW() - sw.lastStartMs) : sw.elapsedMs);
  $('swTime').textContent = C.formatStopwatch(elapsed);
  const laps = sw.laps;
  const bw = C.lapBestWorst(laps);
  if (sw.view >= 0 && sw.view < laps.length) {
    const lap = laps[sw.view];
    $('lapCurrent').innerHTML = `<span class="g93-lap-num">第${C.pad2(lap.lapNumber)}圈</span>` +
      `<span class="g93-lap-time g93-lap">${C.formatLap(lap.lapTime)}</span>`;
  } else if (laps.length) {
    $('lapCurrent').innerHTML = `<span class="g93-lap-num">总时长</span><span class="g93-lap-time g93-lap">${C.formatLap(elapsed)}</span>`;
  } else {
    $('lapCurrent').innerHTML = '<span class="g93-lap-num">—</span>';
  }
  $('lapPrev').disabled = !laps.length;
  $('lapNext').disabled = !laps.length;
  $('swLap').disabled = !running || !C.canLap(laps);
  $('swReset').disabled = sw.state === 4 || (!running && elapsed === 0 && !laps.length);
  $('swMain').textContent = running ? '暂停' : (sw.state === 2 ? '继续' : '开始'); // sw_pause/resume/start_button
  const lapsList = laps.length ? laps.slice().reverse().map((l, idx) => {
    const i = laps.length - 1 - idx;
    const cls = i === bw.best ? ' best' : i === bw.worst ? ' worst' : '';
    return `<li class="g93-lap-row${cls}"><span>第${C.pad2(l.lapNumber)}圈</span>` +
      `<span class="g93-lap">${C.formatLap(l.lapTime)}</span><span class="g93-lap">${C.formatLap(l.totalTime)}</span></li>`;
  }).join('') : '';
  $('lapList').innerHTML = lapsList;
  $('lapListWrap').hidden = !laps.length;
}
$('swMain').addEventListener('click', () => {
  const now = NOW();
  if (sw.state === 1) { // RUNNING → PAUSED
    sw.elapsedMs += now - sw.lastStartMs;
    sw.state = 2; sw.lastStartMs = 0;
  } else if (sw.state === 2 || sw.state === 4) { // PAUSED/RESET → RUNNING
    sw.state = 1; sw.lastStartMs = now;
  }
  sw.view = -1;
  renderStopwatch();
});
$('swLap').addEventListener('click', () => {
  if (sw.state !== 1 || !C.canLap(sw.laps)) return;
  const elapsed = sw.elapsedMs + (NOW() - sw.lastStartMs);
  sw.laps = C.lapReducer(sw.laps, elapsed);
  sw.view = sw.laps.length - 1;
  renderStopwatch();
});
$('swReset').addEventListener('click', () => {
  sw = { state: 4, elapsedMs: 0, lastStartMs: 0, laps: [], view: -1 };
  renderStopwatch();
});
$('lapPrev').addEventListener('click', () => {
  if (!sw.laps.length) return;
  sw.view = sw.view <= 0 ? 0 : sw.view - 1;
  renderStopwatch();
});
$('lapNext').addEventListener('click', () => {
  const n = sw.laps.length;
  if (!n) { sw.view = -1; renderStopwatch(); return; }
  sw.view = sw.view < 0 ? n - 1 : Math.min(n - 1, sw.view + 1);
  renderStopwatch();
});

// ---------------------------------------------------------------- 就寝页（时间表卡 + 近期活动卡空态）
function renderBedtime() {
  const b = state.bed;
  $('bedTime').textContent = C.formatAlarmTime(b.bedH, b.bedM);
  $('wakeTime').textContent = C.formatAlarmTime(b.wakeH, b.wakeM);
  const dur = C.formatDurationZh(C.bedtimeDurationMinutes(b.bedH, b.bedM, b.wakeH, b.wakeM));
  $('bedDuration').textContent = dur ? `睡眠时长：${dur}` : '';
  $('bedSwitch').checked = !!b.enabled;
  $('bedSwitch').setAttribute('aria-label', '开启睡眠时间表');
}
$('bedSwitch').addEventListener('change', (e) => { state.bed.enabled = e.target.checked; save(); });
$('bedEdit').addEventListener('click', () => {
  const b = state.bed;
  openSheet('时间表', `
    <div class="g93-sheet-row"><span>就寝</span><input type="time" id="sheetBed" value="${C.formatAlarmTime(b.bedH, b.bedM)}"></div>
    <div class="g93-sheet-row"><span>起床</span><input type="time" id="sheetWake" value="${C.formatAlarmTime(b.wakeH, b.wakeM)}"></div>
  `, () => {
    const [bh, bm] = ($('sheetBed').value || '22:30').split(':').map(Number);
    const [wh, wm] = ($('sheetWake').value || '07:00').split(':').map(Number);
    state.bed = { ...b, bedH: bh, bedM: bm, wakeH: wh, wakeM: wm };
    save(); renderBedtime();
  });
});

// ---------------------------------------------------------------- 通用弹层
let sheetOk = null;
function openSheet(title, body, onOk) {
  $('sheetTitle').textContent = title;
  $('sheetBody').innerHTML = body;
  sheetOk = onOk;
  $('sheetMask').hidden = false;
  $('sheetBody').querySelectorAll('.g93-day').forEach((b) => {
    b.addEventListener('click', () => {
      const on = b.classList.toggle('on');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  });
}
function closeSheet() { $('sheetMask').hidden = true; sheetOk = null; }
$('sheetCancel').addEventListener('click', closeSheet);
$('sheetOk').addEventListener('click', () => { if (sheetOk) sheetOk(); closeSheet(); });
$('sheetMask').addEventListener('click', (e) => { if (e.target === $('sheetMask')) closeSheet(); });
$('g93Fab').addEventListener('click', () => {
  if (state.tab === 'World') openCitySheet();
  else if (state.tab === 'Timer') { state.__addingTimer = true; renderTimerCards(); renderTimerSetup(); }
  else openAlarmSheet(null);
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!$('g93Menu').hidden) { closeMenu(); return; }
    if (!$('sheetMask').hidden) { closeSheet(); return; }
  }
  if (!$('sheetMask').hidden) return;
  if (e.key === 'ArrowRight') { selectTab(C.nextTab(state.tab, 1)); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { selectTab(C.nextTab(state.tab, -1)); e.preventDefault(); }
});

// ---------------------------------------------------------------- 顶栏溢出菜单（menu_item_* zh 逐字）
// 9.3 Toolbar overflow 实锚（zh-strings.tsv L381-386：帮助/设置/发送反馈/
// 开源许可/屏保/隐私权政策）；v11.53 半成品缺失即用户报告的「设置图标飞到
// 哪里去了」。菜单项为系统级入口，桌面复刻仅展开/收起（不伪造行为）。
function closeMenu() {
  $('g93Menu').hidden = true;
  $('g93MenuBtn').setAttribute('aria-expanded', 'false');
}
$('g93MenuBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  const open = $('g93Menu').hidden;
  $('g93Menu').hidden = !open;
  $('g93MenuBtn').setAttribute('aria-expanded', String(open));
});
$('g93Menu').addEventListener('click', (e) => {
  if (!e.target.closest('[data-menu-item]')) return;
  closeMenu();
});
document.addEventListener('click', (e) => {
  if ($('g93Menu').hidden) return;
  if ($('g93Menu').contains(e.target) || $('g93MenuBtn').contains(e.target)) return;
  closeMenu();
});

// ---------------------------------------------------------------- 主循环（单一 rAF；tick 全部经 Timer.java 语义）
let lastClockSec = -1;
function loop() {
  const now = NOW();
  // 计时器：运行帧只就地更新文本与环形进度；EXPIRED 翻转才全量重渲（rAF 面不重排 DOM）
  if (state.timers.some((t) => t.state === C.TIMER_STATE.RUNNING || t.state === C.TIMER_STATE.PAUSED)) {
    let flipped = false;
    state.timers.forEach((t, i) => {
      const next = C.timerExpireIfDue(t, now);
      if (next !== t) { state.timers[i] = next; flipped = true; }
    });
    if (flipped) { renderTimerCards(); }
    else {
      $('timerCards').querySelectorAll('.g93-timer-card').forEach((card) => {
        const t = state.timers.find((x) => x.id === card.dataset.timer);
        if (!t || t.state !== C.TIMER_STATE.RUNNING) return;
        const rem = Math.max(0, C.timerRemaining(t, now));
        card.querySelector('.g93-timer-text').textContent = C.formatCountdown(rem);
        const p = M93.ringGeometry(rem, t.totalLength, RING_C, C.GASTOWN93_SPEC.timerGap);
        const ind = card.querySelector('.indicator');
        ind.setAttribute('stroke-dasharray', `${p.dash} ${p.gap}`);
        ind.setAttribute('stroke-dashoffset', `${p.offset}`);
      });
    }
  }
  if (sw.state === 1) $('swTime').textContent = C.formatStopwatch(sw.elapsedMs + (now - sw.lastStartMs));
  const sec = Math.floor(now / 1000);
  if (sec !== lastClockSec) {
    lastClockSec = sec;
    tickMainClock();
    // v11.53：每秒文本级增量（值比对写），结构重建仅由交互路径触发 ——
    // 旧版每秒 renderWorld/renderAlarms 全量 innerHTML 是「开关小球乱飞」
    // （transition 重放）与滚动帧抖动的共同根因。
    tickWorld(now);
    tickAlarms(now);
  }
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- boot
mountGastownNav(); // 9.3 原始 AVD 过渡接线（avd/ 逐字资产）
renderAlarms();
renderWorld();
renderKeypad();
renderTimerSetup();
renderTimerCards();
renderStopwatch();
renderBedtime();
document.querySelectorAll('.md3-switch').forEach(initM3Switch);
selectTab(state.tab, { silent: true });

// g93 动效层接线（g93-motion.mjs —— M3 状态层涟漪，RippleShader.java ENTER 450 / EXIT 375）
// 必须在 selectTab 之后：卡片/预设按钮由 render* 生成，早于此则 querySelectorAll 命中为空。
// 卡片为 innerHTML 重建，故在 renderTimerCards 后重绑一次，避免重建后丢失状态层。
const RIPPLE_SEL = '.g93-timer-btn, .g93-preset, .g93-key, #swMain, #swLap, #swReset, #timerStart';
// createReduceGuard 返回 getter（无参），reduced-motion 变更时置脏以便重绑
const isReduced = M93.createReduceGuard();
const bindRipplesNow = () => M93.bindRipple(document, RIPPLE_SEL, isReduced());
bindRipplesNow();
// 卡片为 innerHTML 重建，重建后状态层丢失：用微任务在本次渲染提交后补绑，
// 不改写 renderTimerCards 本身（函数声明不可重新赋值）。
const _rafBind = requestAnimationFrame;
_rafBind(() => { bindRipplesNow(); });
if (typeof window !== 'undefined' && window.__clock93) {
  window.__clock93.bindRipples = bindRipplesNow;
}

tickMainClock();
requestAnimationFrame(loop);

// 观测面（e2e / 调试）
window.__clock93 = {
  state, core: C, selectTab, renderAlarms, tickAlarms, renderWorld, tickWorld,
  renderTimerCards, renderStopwatch,
  keypad: (k) => { timerDraft = C.keypadReducer(timerDraft, k); renderTimerSetup(); },
  startTimer: startDraftTimer,
  sw: () => sw,
  swMain: () => $('swMain').click(), swLap: () => $('swLap').click(), swReset: () => $('swReset').click(),
  openAlarmSheet, openCitySheet,
  closeMenu,
  motion: M93,   // g93 动效层（DUR/EASE/ringGeometry）
};
