// ==================== dynamic-icons.js — 动态时钟与日历图标 ====================

import { dom } from './dom.js';

/**
 * 生成动态图标的 innerHTML
 * @param {'clock'|'calendar'} type
 * @param {boolean} isLaunch — true 时 id 前缀为 launch_（启动屏用），false 为 grid_（桌面网格用）
 */
export function createDynamicIconHTML(type, isLaunch = false) {
  const prefix = isLaunch ? 'launch_' : 'grid_';

  if (type === 'clock') {
    // fix(v7.42)：新建图标指针首帧即落当前时刻 —— 旧模板无内联 transform（三针全指
    // 12 点），要等下一个秒边界 tick（最长 ~1s）才跳到真实时间；开应用时启动屏
    // 图标/桌面网格重建瞬间用户看到「三针齐回 12 再跳走」。角度公式与 1Hz tick
    // 完全一致（秒针含 ms 量化、分/时针含低权进位），首帧后 tick 无缝续写。
    const now = new Date();
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const s = now.getSeconds();
    const ms = now.getMilliseconds();
    const hA = `rotate(${((h + m / 60) * 30).toFixed(2)}deg)`;
    const mA = `rotate(${((m + s / 60) * 6).toFixed(2)}deg)`;
    const sA = `rotate(${Math.floor((s + ms / 1000) * 6)}deg)`;
    return `
      <div class="dynamic-clock-icon">
        <div class="clock-face">
          <div class="clock-tick tick-12"></div>
          <div class="clock-tick tick-3"></div>
          <div class="clock-tick tick-6"></div>
          <div class="clock-tick tick-9"></div>
          <div class="clock-hand hour-hand" id="${prefix}hourHand" style="transform:${hA}"></div>
          <div class="clock-hand minute-hand" id="${prefix}minuteHand" style="transform:${mA}"></div>
          <div class="clock-hand second-hand" id="${prefix}secondHand" style="transform:${sA}"></div>
          <div class="clock-center-dot"></div>
        </div>
      </div>`;
  }

  if (type === 'calendar') {
    const now = new Date();
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `
      <div class="dynamic-calendar-icon">
        <div class="cal-header" id="${prefix}calHeader">${days[now.getDay()]}</div>
        <div class="cal-body" id="${prefix}calBody">${now.getDate()}</div>
      </div>`;
  }

  return '';
}

// ==================== 动态图标引用缓存（断链自动重查） ====================
// 桌面图标随 renderDesktopPages 重建、启动屏图标随开/关应用重建，
// 每帧 getElementById × 10 的开销改为缓存命中 + isConnected 校验。
const iconElCache = new Map();   // id → Element（命中即免查 DOM）
const iconNegCache = new Map();  // id → 最近一次未命中的时间戳（负缓存，节流挂载空窗期的重查）
const ICON_NEG_TTL = 1000;       // 负缓存 1s：既有节流收益，又不影响元素稍后挂载的正常绑定

function getIconPart(id) {
  let el = iconElCache.get(id);
  if (el && el.isConnected) return el;
  // fix(P3)：查询不到时按 TTL 节流 —— 元素尚未挂载期间动画帧照跑，
  // 旧实现每帧 getElementById 且永不缓存，负缓存把重查频率限制在 1s 一次
  const miss = iconNegCache.get(id);
  const now = performance.now();
  if (miss != null && now - miss < ICON_NEG_TTL) return null;
  el = document.getElementById(id);
  if (el) {
    iconElCache.set(id, el);
    iconNegCache.delete(id);
  } else {
    iconNegCache.set(id, now);
  }
  return el;
}

let recentOverlayCache = null;
function isRecentsActive() {
  if (!recentOverlayCache || !recentOverlayCache.isConnected) {
    recentOverlayCache = document.getElementById('recentAppsOverlay');
  }
  return !!(recentOverlayCache && recentOverlayCache.classList.contains('active'));
}

/** 仅在「值变化或元素被重建」时写入：消除每帧无谓重写，同时保证新建图标首帧即归位 */
const lastWrite = new Map(); // id -> { el, value }

function syncIconStyle(id, value) {
  const el = getIconPart(id);
  if (!el) return;
  const prev = lastWrite.get(id);
  if (prev && prev.el === el && prev.value === value) return;
  lastWrite.set(id, { el, value });
  el.style.transform = value;
}

function syncIconText(id, text) {
  const el = getIconPart(id);
  if (!el) return;
  const prev = lastWrite.get(id);
  if (prev && prev.el === el && prev.value === text) return;
  lastWrite.set(id, { el, value: text });
  el.textContent = text;
}

// ==================== v7.34 调度升级：永续 rAF 循环 → 事件驱动 1Hz 对齐秒边界 ====================
// 旧实现每帧（60–120Hz）执行 Date 解析 + 10 次去重比对 + 3 项遮挡检查，
// 即使写入被 syncIconStyle 去重（秒针整度量化后实际仅 6 次/秒变化），
// 循环本身仍阻止主线程进入空闲省电态 —— 违反项目「空闲零开销」纪律。
// 新调度：秒针本就按整度步进（1 步/秒）、分针 0.1°/s、时针 0.5°/min，
// 1Hz 定时对齐下一秒边界即可 100% 复现原视觉；遮挡期跳过写入仅续约下一拍。
// 页签隐藏时浏览器把 timer 节流到 ≥1Hz —— 与视觉更新率恰好同档，恢复可见
// 时由 visibilitychange 立即补拍，指针最多滞后一拍（≤1s）后自动对齐。
let iconTimerId = 0;

/** 取消挂起的下一拍（测试/热重载用） */
export function cancelDynamicIconTicker() {
  if (iconTimerId) { clearTimeout(iconTimerId); iconTimerId = 0; }
}

/** 续约下一拍：对齐下一秒边界 +30ms 容差（≤250ms 快速兜底档防时钟畸变） */
function scheduleNextIconTick() {
  if (iconTimerId) return;
  const msToBoundary = 1000 - (Date.now() % 1000) + 30;
  iconTimerId = setTimeout(() => {
    iconTimerId = 0;
    updateDynamicIcons();
  }, Math.max(250, msToBoundary));
}

// 页签从后台恢复：立即补拍一帧（隐藏期被节流的最长一拍误差就地清零）
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !iconTimerId) updateDynamicIcons();
  });
}

/** 刷新所有动态图标（时钟指针 + 日历日期）并续约下一拍 —— 语义从「单帧回调」升级为「自续约定时刷新」 */
export function updateDynamicIcons() {
  // 遮挡期降载：页面后台化 / 锁屏 / 多任务后台打开时，桌面图标不可见，
  // 跳过样式写入（下一拍照常续约，恢复可见后自动续上）
  const occluded = document.hidden
    || document.body.classList.contains('is-locked')
    || isRecentsActive();

  if (!occluded) {
    const now = new Date();
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dayName = days[now.getDay()];
    const dateNum = String(now.getDate());

    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const s = now.getSeconds();
    const ms = now.getMilliseconds();

    // v7.13 性能：秒针角度量化到整度（15px 图标上 1° ≈ 0.12px，视觉无损），
    // 配合 syncIconStyle 的值比对去重，样式写入频率 60 次/秒 → 6 次/秒，
    // 消除桌面空闲期持续不断的合成器失效（GPU 常驻 60fps 重绘主源之一）
    const sAngle = `rotate(${Math.floor((s + ms / 1000) * 6)}deg)`;
    const mAngle = `rotate(${((m + s / 60) * 6).toFixed(2)}deg)`;
    const hAngle = `rotate(${((h + m / 60) * 30).toFixed(2)}deg)`;

    ['grid_', 'launch_'].forEach((p) => {
      syncIconStyle(p + 'hourHand', hAngle);
      syncIconStyle(p + 'minuteHand', mAngle);
      syncIconStyle(p + 'secondHand', sAngle);
      syncIconText(p + 'calHeader', dayName);
      syncIconText(p + 'calBody', dateNum);
    });
  }

  scheduleNextIconTick();
}

/** 更新状态栏时钟 */
export function updateClock() {
  const n = new Date();
  dom.clock.textContent =
    n.getHours().toString().padStart(2, '0') + ':' +
    n.getMinutes().toString().padStart(2, '0');
}
