// ==================== aod-ui.js — AOD 息屏常显覆盖层（v9.80 · #35 doze/AOD） ====================
// AOSP doze 语义映射：闲置（settings:display-v1.timeout=screen_off_timeout 单源复用，AOSP doze
// 入屏=屏超时之后）或电源对话「熄屏」→ 锁屏 + AOD 覆盖层（z=99000，锁屏 98000 之上）；点击/上滑
// → 唤醒回锁屏（#19 解锁动画衔接）；解锁 → 桌面（闲置计时随解锁手势重排）。
// 零 rAF 纪律（issue 验收）：时钟分钟跳变用 setTimeout 链（对齐下一分钟边界），呼吸感纯 CSS 动画。
// 单源：settings:display-v1.aod（默认关——首启不自动常显，#157 bedtime 保守初值同纪律）。
import { lockNow, isLockedNow } from './lock-screen.js';
import { createAodController, normalizeIdleMs } from './aosp/aod-core.js';
import { getNotifications, resolveNotiIcon } from './notifications.js';
// v9.80 #20：AOD 表盘联动（AOSP dozeFraction 低亮度权威 = ClockController.initialize；
// mDrawAlpha/onSetAlpha KeyguardClockSwitch L211 同义——.lock-face--aod 低亮度档）
import { LOCK_CLOCK_FACE_KEY, FACE_CHANGED_EVENT, CLOCK_FONT_CHANGED_EVENT, parseFacePref, resolveFace, buildFaceHTML } from './aosp/clock-faces.js';
import { getActiveClockFontStack } from './clock-font-loader.js';

let core = null;
let overlay = null, clockEl = null, dateEl = null, notifEl = null;
let minuteTimer = null;

/** 读取单源配置（settings:display-v1：aod 布尔 + timeout 屏超时毫秒） */
function readCfg() {
  let enabled = false, timeout = 0;
  try {
    const s = JSON.parse(localStorage.getItem('settings:display-v1') || '{}');
    enabled = !!s.aod;
    timeout = Number(s.timeout) || 0;
  } catch (_) {}
  return { enabled, idleMs: normalizeIdleMs(timeout) };
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function ensureDOM() {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.id = 'aodOverlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = '<div class="aod-inner"><div class="aod-clock" id="aodClock">--:--</div>' +
    '<div class="aod-date" id="aodDate"></div>' +
    '<div class="aod-notifs" id="aodNotifs" aria-hidden="true"></div>' +
    '<div class="aod-hint">轻点或上滑唤醒</div></div>';
  document.body.appendChild(overlay);
  clockEl = overlay.querySelector('#aodClock');
  dateEl = overlay.querySelector('#aodDate');
  notifEl = overlay.querySelector('#aodNotifs');
  overlay.addEventListener('click', () => wakeAod());
  /* 上滑唤醒（>24px 判定；pointerdown 起点记录，move 上滑即醒——与锁屏手势方向一致） */
  let y0 = null;
  overlay.addEventListener('pointerdown', (e) => { y0 = e.clientY; });
  overlay.addEventListener('pointermove', (e) => { if (y0 !== null && y0 - e.clientY > 24) { y0 = null; wakeAod(); } });
  overlay.addEventListener('pointerup', () => { y0 = null; });
}

function renderNotifs() {
  if (!notifEl) return;
  try {
    const items = getNotifications().slice(0, 6);
    notifEl.innerHTML = items.map((n) => '<span class="aod-notif-ic">' + (resolveNotiIcon(n) || '') + '</span>').join('');
  } catch (_) { notifEl.innerHTML = ''; }
}

function renderClock() {
  if (!clockEl) return;
  const d = new Date();
  // v9.80 #20：表盘感知（ClockController.smallClock 小视图 AOD 同源；dozeFraction 低亮度
  // 走 .lock-face--aod；expressive 弹簧恒关——零 rAF 纪律）；analog 渲 SVG，其余脸
  // 小视图均单行结构（Pixel AOD 单行原生风，textContent 锚 HH:MM 不变）
  let faceId = 'double';
  try { faceId = parseFacePref(localStorage.getItem(LOCK_CLOCK_FACE_KEY)); } catch (e) {}
  const face = resolveFace(faceId);
  clockEl.innerHTML = buildFaceHTML(face, { date: d, size: 'small', aod: true, fontStack: getActiveClockFontStack(), animate: false });
  if (dateEl) dateEl.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 周' + WEEK[d.getDay()];
}

/** 分钟跳变：对齐下一分钟边界的 setTimeout 链（零 rAF——AOD 期停用帧循环纪律） */
function tickMinute() {
  renderClock();
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0);
  minuteTimer = setTimeout(tickMinute, Math.max(250, next - now + 50));
}

function stopMinuteTimer() {
  if (minuteTimer) { clearTimeout(minuteTimer); minuteTimer = null; }
}

function showOverlay() {
  ensureDOM();
  renderNotifs();
  tickMinute(); // 首帧立即渲染 + 链式对齐
  overlay.style.display = 'flex';
  overlay.classList.add('aod-on');
}

function hideOverlay() {
  stopMinuteTimer();
  if (overlay) { overlay.style.display = 'none'; overlay.classList.remove('aod-on'); }
}

/** 进入 AOD：锁屏兜底（闲置时未锁→先锁；AOSP doze 恒在 keyguard 语义）→ 覆盖层 */
function enterAod() {
  if (!core || core.requestEnter() !== 'entered') return;
  if (!isLockedNow()) lockNow();
  showOverlay();
}

/** 唤醒：core.wake() 幂等，'wake' 事件统一撤层 */
function wakeAod() {
  if (core) core.wake();
}

/** 电源对话「熄屏」/ 锁定磁贴入口：AOD 开→熄屏常显；关→沿用 lockNow（显示熄灭=锁屏语义） */
export function aodPowerOff() {
  if (!readCfg().enabled) { lockNow(); return false; }
  if (core) core.activity();
  enterAod();
  return true;
}

/** 初始化：单源配置装载 + 全局活动监听（pointer/key 捕获，交互中永不熄屏）+ 设置变更跟随 */
export function initAod() {
  if (core) return;
  core = createAodController();
  core.configure(readCfg());
  core.onEvent((ev) => {
    if (ev === 'expire') enterAod();          // 闲置到期（仅 enabled 时会被排程）
    else if (ev === 'wake') hideOverlay();    // 唤醒撤层
  });
  document.addEventListener('pointerdown', () => { if (core) core.activity(); }, true);
  document.addEventListener('keydown', () => { if (core) core.activity(); }, true);
  /* 设置变更（aod 开关 / timeout 时长）即时跟随；AOD 中关掉开关→立刻撤层回锁屏 */
  document.addEventListener('settings-display-changed', (e) => {
    const k = e && e.detail && e.detail.key;
    if (k === 'aod' || k === 'timeout') {
      core.configure(readCfg());
      if (!readCfg().enabled && core.getState() === 'aod') core.wake();
    }
  });
  /* v9.80 #20：表盘/时钟字体变更即时跟随（AOD 活动中直接重渲，下次进入天然新脸） */
  document.addEventListener(FACE_CHANGED_EVENT, () => { if (overlay && overlay.style.display === 'flex') renderClock(); });
  document.addEventListener(CLOCK_FONT_CHANGED_EVENT, () => { if (overlay && overlay.style.display === 'flex') renderClock(); });
  /* 观测面（e2e/vitest 同步探针，零定时器依赖——无头节流坑纪律） */
  window.__aodTest = {
    state: () => core.getState(),
    debug: () => core._debug(),
    overlayOn: () => !!(overlay && overlay.style.display === 'flex'),
    enter: () => enterAod(),
    wake: () => wakeAod(),
    clockText: () => (clockEl ? clockEl.textContent : ''),
    dateText: () => (dateEl ? dateEl.textContent : ''),
    notifCount: () => (notifEl ? notifEl.querySelectorAll('.aod-notif-ic').length : 0),
  };
}
