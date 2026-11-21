// ==================== app.mjs — Google Clock 9.3「Gastown」UI 交互核心（DOM 接线） ====================
//
// 从零移植的第一阶段：五 tab 导航 + 原始 AVD 过渡 + 闹钟/世界时钟/计时器/秒表/就寝
// 五页交互 + localStorage 持久化 + 响应式四档（布局在 index.html）。
// 纯状态机在 clock93-core.mjs；9.3 animated-selector 过渡由 avd/gastown-nav.mjs
// 监听 .nav-item.active 自动驱动，本模块只切 class，不叠 CSS keyframes。

import * as C from './clock93-core.mjs';

const $ = (id) => document.getElementById(id);
const NOW = () => Date.now();
const LOCAL_OFFSET = -new Date().getTimezoneOffset();

// ---------------------------------------------------------------- 持久化
const KEY = 'clock93:state-v1';
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      alarms: Array.isArray(raw.alarms) ? raw.alarms : [
        C.makeAlarm({ id: 'a1', h: 7, m: 0, label: '起床', days: [1, 2, 3, 4, 5] }),
        C.makeAlarm({ id: 'a2', h: 9, m: 30, label: '周末', days: [0, 6], enabled: false }),
      ],
      cities: Array.isArray(raw.cities) ? raw.cities : [
        { id: 'tokyo', name: '东京', offset: 540 },
        { id: 'london', name: '伦敦', offset: 60 },
        { id: 'newyork', name: '纽约', offset: -240 },
      ],
      bed: raw.bed || { bedH: 22, bedM: 30, wakeH: 7, wakeM: 0, enabled: true },
      tab: C.TAB_ORDER.includes(raw.tab) ? raw.tab : 'Alarm',
    };
  } catch (e) { return {}; }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      alarms: state.alarms, cities: state.cities, bed: state.bed, tab: state.tab,
    }));
  } catch (e) { /* 隐私模式静默降级 */ }
}

const state = {
  ...load(),
  timer: { digits: '000000', remainingMs: 0, totalMs: 0, running: false, lastAt: 0 },
  sw: { elapsedMs: 0, running: false, lastAt: 0, laps: [], lapIndex: -1 },
};
if (!Array.isArray(state.alarms)) state.alarms = [];
if (!Array.isArray(state.cities)) state.cities = [];
if (!state.bed) state.bed = { bedH: 22, bedM: 30, wakeH: 7, wakeM: 0, enabled: true };

// ---------------------------------------------------------------- 通用工具
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const fmtDuration = (mins) => {
  const h = Math.floor(mins / 60), m = mins % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分`;
};

// ---------------------------------------------------------------- 导航（触发 9.3 AVD）
function selectTab(tab, opts = {}) {
  if (!C.TAB_ORDER.includes(tab)) return;
  state.tab = tab;
  $('g93App').dataset.tab = tab;
  $('g93Title').textContent = C.TAB_LABELS[tab];
  document.querySelectorAll('.g93-page').forEach((p) => {
    p.classList.toggle('is-active', p.dataset.page === tab);
  });
  // .active class 变化 → gastown-nav.mjs 的 MutationObserver 播原始 AVD 过渡
  document.querySelectorAll('.gastown-nav .nav-item').forEach((it) => {
    const sel = it.dataset.tab === tab;
    it.classList.toggle('active', sel);
    it.setAttribute('aria-selected', sel ? 'true' : 'false');
  });
  movePill();
  // FAB 只承载「添加」语义：闹钟 / 世界时钟；其余页各有页内动作
  const fab = $('g93Fab');
  const show = tab === 'Alarm' || tab === 'World';
  fab.hidden = !show;
  fab.setAttribute('aria-label', tab === 'World' ? '添加城市' : '添加闹钟');
  $('g93Status').textContent = `Google Clock 9.3 · ${C.TAB_LABELS[tab]}`;
  if (!opts.silent) save();
}
function movePill() {
  const active = document.querySelector('.gastown-nav .nav-item.active');
  const pill = $('g93Pill');
  const nav = $('g93Nav');
  if (!active || !pill || !nav) return;
  const r = active.getBoundingClientRect(), n = nav.getBoundingClientRect();
  const w = Math.min(52, r.width * 0.55);
  pill.style.width = `${w}px`;
  pill.style.transform = `translateX(${(r.left - n.left + (r.width - w) / 2).toFixed(1)}px)`;
}
document.querySelectorAll('.gastown-nav .nav-item').forEach((it) => {
  it.addEventListener('click', () => selectTab(it.dataset.tab));
});
window.addEventListener('resize', movePill, { passive: true });

// ---------------------------------------------------------------- 闹钟
function renderAlarms() {
  const list = $('alarmList');
  const items = C.sortAlarms(state.alarms);
  $('alarmEmpty').hidden = items.length > 0;
  list.innerHTML = items.map((a) => {
    const up = a.enabled ? C.upcomingText(a, NOW(), LOCAL_OFFSET) : '已关闭';
    return `<article class="g93-alarm-card" data-alarm="${esc(a.id)}">
      <div class="g93-alarm-head">
        <div>
          <div class="g93-alarm-time g93-time-var${a.enabled ? '' : ' is-paused'}">${C.alarmTimeText(a)}</div>
          <div class="g93-alarm-meta">
            <span class="g93-chip">${esc(C.describeDays(a.days))}</span>
            <span>${esc(up)}</span>
          </div>
        </div>
        <label class="g93-switch">
          <input type="checkbox" data-toggle="${esc(a.id)}" ${a.enabled ? 'checked' : ''} aria-label="启用闹钟">
          <span class="sw-track"></span><span class="sw-handle"></span>
        </label>
      </div>
      <div class="g93-alarm-foot">
        <span class="g93-alarm-label">${esc(a.label)}</span>
        <button type="button" class="g93-icon-btn" data-del="${esc(a.id)}" aria-label="删除闹钟">✕</button>
      </div>
    </article>`;
  }).join('');
}
$('alarmList').addEventListener('change', (e) => {
  const id = e.target.dataset.toggle;
  if (!id) return;
  const a = state.alarms.find((x) => x.id === id);
  if (a) { a.enabled = e.target.checked; save(); renderAlarms(); }
});
$('alarmList').addEventListener('click', (e) => {
  const id = e.target.dataset.del;
  if (!id) return;
  state.alarms = state.alarms.filter((x) => x.id !== id);
  save(); renderAlarms();
});

function openAlarmSheet() {
  openSheet('添加闹钟', `
    <div class="g93-sheet-row"><span>时间</span><input type="time" id="sheetTime" value="07:00"></div>
    <div class="g93-sheet-row"><span>标签</span><input type="text" id="sheetLabel" value="闹钟" maxlength="16"></div>
    <div style="font-size:13px;color:var(--md-on-surface-variant)">重复（不选 = 每天）</div>
    <div class="g93-days" id="sheetDays">${C.WEEK_DAYS.map((d, i) =>
      `<button type="button" class="g93-day" data-day="${i}" aria-pressed="false">${d}</button>`).join('')}</div>
  `, () => {
    const [h, m] = ($('sheetTime').value || '07:00').split(':').map(Number);
    const days = Array.from(document.querySelectorAll('#sheetDays .g93-day.on')).map((b) => Number(b.dataset.day));
    state.alarms.push(C.makeAlarm({
      id: `a${NOW()}`, h, m, label: $('sheetLabel').value || '闹钟', days,
    }));
    save(); renderAlarms();
  });
}

// ---------------------------------------------------------------- 世界时钟
const CITY_PRESETS = [
  { id: 'beijing', name: '北京', offset: 480 }, { id: 'tokyo', name: '东京', offset: 540 },
  { id: 'seoul', name: '首尔', offset: 540 }, { id: 'london', name: '伦敦', offset: 60 },
  { id: 'paris', name: '巴黎', offset: 120 }, { id: 'newyork', name: '纽约', offset: -240 },
  { id: 'sydney', name: '悉尼', offset: 600 }, { id: 'dubai', name: '迪拜', offset: 240 },
];
function renderCities() {
  $('cityList').innerHTML = state.cities.map((c) => {
    const t = C.clockAt(NOW(), c.offset);
    const off = C.formatOffset(LOCAL_OFFSET, c.offset);
    return `<article class="g93-city-card" data-city="${esc(c.id)}">
      <div>
        <div class="g93-city-name">${esc(c.name)}</div>
        <div class="g93-city-offset">${esc(off)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <div class="g93-city-clock g93-time-var is-city">${t.text}</div>
        <button type="button" class="g93-icon-btn" data-city-del="${esc(c.id)}" aria-label="移除城市">✕</button>
      </div>
    </article>`;
  }).join('') || '<div class="g93-empty">还没有城市 · 点右下角 + 添加</div>';
}
$('cityList').addEventListener('click', (e) => {
  const id = e.target.dataset.cityDel;
  if (!id) return;
  state.cities = state.cities.filter((c) => c.id !== id);
  save(); renderCities();
});
function openCitySheet() {
  const avail = CITY_PRESETS.filter((p) => !state.cities.some((c) => c.id === p.id));
  openSheet('添加城市', `
    <div class="g93-sheet-row"><span>城市</span>
      <select id="sheetCity">${avail.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
    </div>
    ${avail.length ? '' : '<div class="g93-empty">预设城市已全部添加</div>'}
  `, () => {
    const p = CITY_PRESETS.find((x) => x.id === $('sheetCity')?.value);
    if (p) { state.cities.push({ ...p }); save(); renderCities(); }
  });
}

// ---------------------------------------------------------------- 主时钟帧 / 模拟表盘
(function buildTicks() {
  const g = $('analogTicks');
  let s = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    const x1 = 120 + Math.cos(a) * 100, y1 = 120 + Math.sin(a) * 100;
    const x2 = 120 + Math.cos(a) * (i % 3 === 0 ? 88 : 94), y2 = 120 + Math.sin(a) * (i % 3 === 0 ? 88 : 94);
    s += `<line class="tick" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }
  g.innerHTML = s;
})();
function tickClocks() {
  const t = C.clockAt(NOW(), LOCAL_OFFSET);
  $('mainClock').textContent = t.text;
  const d = new Date(NOW());
  $('mainDateText').textContent = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · 周${C.WEEK_DAYS[d.getDay()]}`;
  const next = C.sortAlarms(state.alarms.filter((a) => a.enabled))[0];
  $('nextAlarmText').textContent = next ? `下次闹钟 ${C.alarmTimeText(next)}` : '未设置闹钟';
  const hourA = ((t.h % 12) + t.m / 60) * 30 - 90;
  const minA = (t.m + t.s / 60) * 6 - 90;
  const pos = (ang, len) => [120 + Math.cos(ang * Math.PI / 180) * len, 120 + Math.sin(ang * Math.PI / 180) * len];
  const [hx, hy] = pos(hourA, 54), [mx, my] = pos(minA, 78);
  $('handHour').setAttribute('x2', hx.toFixed(1)); $('handHour').setAttribute('y2', hy.toFixed(1));
  $('handMin').setAttribute('x2', mx.toFixed(1)); $('handMin').setAttribute('y2', my.toFixed(1));
  // 城市卡每分钟刷新（秒级只对主钟生效，避免逐秒整列表重排）
  if (t.s === 0) renderCities();
  if (state.tab === 'Alarm' && t.s === 0) renderAlarms();
}

// ---------------------------------------------------------------- 计时器
const RING_C = 2 * Math.PI * 164;
function renderTimerSetup() {
  const cols = C.timerColumns(state.timer.digits);
  $('timerDisplay').innerHTML = cols.map((c) =>
    `<div class="g93-timer-col"><span class="v">${c.value}</span><span class="u">${c.unit}</span></div>`).join('');
  $('timerStart').disabled = C.digitsToSeconds(state.timer.digits) <= 0;
}
(function buildKeypad() {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'backspace'];
  $('timerKeypad').innerHTML = keys.map((k) =>
    `<button type="button" class="g93-key" data-key="${k}" aria-label="${k === 'backspace' ? '退格' : k}">${k === 'backspace' ? '⌫' : k}</button>`).join('');
  $('timerPresets').innerHTML = C.PRESET_MINUTES.map((m) =>
    `<button type="button" class="g93-preset" data-min="${m}"><span class="p">${m}</span><span class="u">分钟</span></button>`).join('');
})();
$('timerKeypad').addEventListener('click', (e) => {
  const k = e.target.dataset.key;
  if (!k) return;
  state.timer.digits = C.keypadReducer({ digits: state.timer.digits }, k).digits;
  renderTimerSetup();
});
$('timerPresets').addEventListener('click', (e) => {
  const m = Number(e.target.closest('[data-min]')?.dataset.min);
  if (!m) return;
  state.timer.digits = String(Math.floor(m / 60)).padStart(2, '0') + String(m % 60).padStart(2, '0') + '00';
  renderTimerSetup();
});
function startTimer() {
  const s = C.digitsToSeconds(state.timer.digits);
  if (s <= 0) return;
  state.timer.totalMs = s * 1000;
  state.timer.remainingMs = s * 1000;
  state.timer.running = true;
  state.timer.lastAt = performance.now();
  $('timerSetup').hidden = true;
  $('timerRunning').hidden = false;
  $('timerPause').textContent = '暂停';
  $('timerText').classList.remove('is-paused');
  renderTimerRunning();
}
function renderTimerRunning() {
  $('timerText').textContent = C.formatCountdown(state.timer.remainingMs);
  const p = C.ringProgress(state.timer.remainingMs, state.timer.totalMs, RING_C);
  $('ringIndicator').setAttribute('stroke-dasharray', `${p.dash} ${RING_C}`);
  $('ringIndicator').setAttribute('stroke-dashoffset', '0');
}
function stopTimer() {
  state.timer.running = false;
  $('timerSetup').hidden = false;
  $('timerRunning').hidden = true;
  $('timerPause').textContent = '暂停';
  renderTimerSetup();
}
$('timerStart').addEventListener('click', startTimer);
$('timerPause').addEventListener('click', () => {
  state.timer.running = !state.timer.running;
  state.timer.lastAt = performance.now();
  $('timerPause').textContent = state.timer.running ? '暂停' : '继续';
  $('timerText').classList.toggle('is-paused', !state.timer.running);
});
$('timerAddMin').addEventListener('click', () => {
  state.timer.remainingMs += 60000;
  state.timer.totalMs = Math.max(state.timer.totalMs, state.timer.remainingMs);
  renderTimerRunning();
});
$('timerDelete').addEventListener('click', stopTimer);

// ---------------------------------------------------------------- 秒表
function renderStopwatch() {
  $('swTime').textContent = C.formatStopwatch(state.sw.elapsedMs);
  const deltas = C.lapDeltas(state.sw.laps);
  const best = deltas.length ? Math.min(...deltas) : -1;
  $('lapList').innerHTML = deltas.map((d, i) =>
    `<li class="${d === best && deltas.length > 1 ? 'best' : ''}"><span>第 ${i + 1} 圈</span><span>${C.formatLap(d)}</span></li>`).join('');
  const idx = state.sw.lapIndex;
  $('lapCurrent').textContent = idx >= 0 && idx < deltas.length ? `第 ${idx + 1} 圈 · ${C.formatLap(deltas[idx])}` : (deltas.length ? '总览' : '—');
  $('swLap').disabled = !state.sw.running;
  $('swReset').disabled = state.sw.elapsedMs === 0;
  $('swMain').textContent = state.sw.running ? '暂停' : (state.sw.elapsedMs > 0 ? '继续' : '开始');
}
$('swMain').addEventListener('click', () => {
  state.sw.running = !state.sw.running;
  state.sw.lastAt = performance.now();
  renderStopwatch();
});
$('swLap').addEventListener('click', () => {
  state.sw.laps = C.lapReducer(state.sw.laps, state.sw.elapsedMs);
  state.sw.lapIndex = state.sw.laps.length - 1;
  renderStopwatch();
});
$('swReset').addEventListener('click', () => {
  state.sw = { elapsedMs: 0, running: false, lastAt: 0, laps: [], lapIndex: -1 };
  renderStopwatch();
});
$('lapPrev').addEventListener('click', () => {
  const n = C.lapDeltas(state.sw.laps).length;
  if (!n) return;
  state.sw.lapIndex = state.sw.lapIndex <= 0 ? 0 : state.sw.lapIndex - 1;
  renderStopwatch();
});
$('lapNext').addEventListener('click', () => {
  const n = C.lapDeltas(state.sw.laps).length;
  if (!n) return;
  state.sw.lapIndex = state.sw.lapIndex >= n - 1 ? n - 1 : state.sw.lapIndex + 1;
  renderStopwatch();
});

// ---------------------------------------------------------------- 就寝时间
function renderBedtime() {
  $('bedTime').textContent = C.formatAlarmTime(state.bed.bedH, state.bed.bedM);
  $('wakeTime').textContent = C.formatAlarmTime(state.bed.wakeH, state.bed.wakeM);
  $('bedDuration').textContent = fmtDuration(C.bedtimeDurationMinutes(state.bed.bedH, state.bed.bedM, state.bed.wakeH, state.bed.wakeM));
  $('bedSwitch').checked = !!state.bed.enabled;
  const bars = C.activityBuckets(state.bed.bedH + state.bed.wakeM / 60);
  $('activityBars').innerHTML = bars.map((v) => `<span style="height:${v}%"></span>`).join('');
}
$('bedSwitch').addEventListener('change', (e) => { state.bed.enabled = e.target.checked; save(); });
$('bedEdit').addEventListener('click', () => {
  openSheet('调整就寝时间', `
    <div class="g93-sheet-row"><span>就寝</span><input type="time" id="sheetBed" value="${C.formatAlarmTime(state.bed.bedH, state.bed.bedM)}"></div>
    <div class="g93-sheet-row"><span>起床</span><input type="time" id="sheetWake" value="${C.formatAlarmTime(state.bed.wakeH, state.bed.wakeM)}"></div>
  `, () => {
    const [bh, bm] = ($('sheetBed').value || '22:30').split(':').map(Number);
    const [wh, wm] = ($('sheetWake').value || '07:00').split(':').map(Number);
    state.bed.bedH = bh; state.bed.bedM = bm; state.bed.wakeH = wh; state.bed.wakeM = wm;
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
  // 重复日按钮（添加闹钟弹层内）
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
  else openAlarmSheet();
});

// 键盘：← → 切 tab，Esc 关弹层（预测式返回属后续批次）
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('sheetMask').hidden) { closeSheet(); return; }
  if (!$('sheetMask').hidden) return;
  if (e.key === 'ArrowRight') { selectTab(C.nextTab(state.tab, 1)); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { selectTab(C.nextTab(state.tab, -1)); e.preventDefault(); }
});

// ---------------------------------------------------------------- 主循环（单一 rAF，按 delta 驱动计时器/秒表）
let lastClockSec = -1;
function loop(now) {
  if (state.timer.running) {
    const dt = now - state.timer.lastAt;
    state.timer.lastAt = now;
    const r = C.timerTick(state.timer, dt);
    state.timer.remainingMs = r.remainingMs;
    if (r.done) {
      state.timer.running = false;
      $('timerText').textContent = '00:00';
      $('timerPause').textContent = '计时结束';
      $('g93Status').textContent = '计时结束 · 9.3 Gastown';
    } else renderTimerRunning();
  }
  if (state.sw.running) {
    const dt = now - state.sw.lastAt;
    state.sw.lastAt = now;
    state.sw.elapsedMs += dt;
    $('swTime').textContent = C.formatStopwatch(state.sw.elapsedMs);
  }
  const sec = Math.floor(now / 1000);
  if (sec !== lastClockSec) { lastClockSec = sec; tickClocks(); }
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- boot
renderAlarms();
renderCities();
renderTimerSetup();
renderStopwatch();
renderBedtime();
selectTab(state.tab, { silent: true });
tickClocks();
requestAnimationFrame(loop);

// 观测面（e2e / 调试）
window.__clock93 = {
  state, core: C, selectTab, renderAlarms, renderCities,
  keypad: (k) => { state.timer.digits = C.keypadReducer({ digits: state.timer.digits }, k).digits; renderTimerSetup(); },
  startTimer, stopTimer,
  swMain: () => $('swMain').click(), swLap: () => $('swLap').click(), swReset: () => $('swReset').click(),
  openAlarmSheet, openCitySheet,
};
