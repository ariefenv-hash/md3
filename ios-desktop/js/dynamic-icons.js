// ==================== dynamic-icons.js — 动态时钟与日历图标 ====================

import { dom } from './dom.js';

// ==================== v11.52 #330：launcher 动态时钟图标真源化 ====================
// 考证链（证据卷 docs/reference/deskclock/gastown93/）：
//  1. APK res/RJ.xml（axml-all93.txt 实录）= Clock 9.3 launcher 自适应图标：
//     background = launcher_clock_face（表盘位图）；foreground layer-list 5 层 =
//     占位 + <rotate launcher_clock_hour from=300 to=5300> + <rotate launcher_clock_minute
//     from=60 to=60060> + <rotate launcher_clock_second from=180 to=6180 level="300"> +
//     launcher_clock_banner —— pivot 均为 50%/50%，level=300 为秒针层标记。
//  2. Pixel Launcher 侧驱动真源 = AOSP iconloaderlib ClockDrawableWrapper.java
//     （LawnchairLauncher/platform_frameworks_libs_systemui 镜像实拉，/tmp/ClockDrawableWrapper.java）：
//     manifest meta-data 键 com.android.launcher3.{LEVEL_PER_TICK_ICON_ROUND,
//     HOUR_LAYER_INDEX,MINUTE_LAYER_INDEX,SECOND_LAYER_INDEX,DEFAULT_HOUR/
//     MINUTE/SECOND}；applyTime 公式：
//       convertedHour   = (HOUR   + (12 - defaultHour))   % 12 → hour.setLevel(convertedHour * 60 + minute)
//       convertedMinute = (minute + (60 - defaultMinute)) % 60 → minute.setLevel(HOUR * 60 + convertedMinute)
//       convertedSecond = (second + (60 - defaultSecond)) % 60 → second.setLevel(convertedSecond * LEVELS_PER_SECOND /* 10 */)
//     TICK_MS = 200（秒针启时轮询步距）；位图默认时刻 = 10:10:30（Google 经典构图，
//     与 from 反推自洽：300°=10 时 / 60°=10 分 / 180°=30 秒）。
//  3. RotateDrawable 映射：angle = from + (to - from) × level / 10000。
//     由 RJ.xml 实测值解算（IEEE754 逐字节）：时针 0.5°/level·分（12h 一圈）、
//     分针 6°/level·分（每分钟一格）、秒针 0.6°/level·十分之一秒（每秒 +6°）。
//  4. web 侧对齐：资产用 APK 内置位图（launcher_clock_{face,hour,minute,second}.webp，
//     不用 svg/CSS 手绘——用户铁律）；旋转公式逐字 applyTime；轮询调度沿用本项目
//     「1Hz 对齐秒边界」纪律（源码 200ms 轮询是秒针 level 变化检测，web 1Hz 视觉
//     等效且空闲零开销；秒针每秒 +6° 步进与源码 setLevel 离散跳变一致）。

// v11.52 资产单源：相对主文档（/ios-desktop/ 基准）路径 —— iframeAppContent('apps/…')
// 同律（vite.config 注释明录：运行时字符串路径相对 /ios-desktop/ 解析，Rollup 无法
// 静态分析故由 copyStaticAndPrecache 原样复制）。不走模块相对基准：bundle 在 dist
// 落顶层 assets/，模块基准失效；vite 7.3.6 对本模式静态转换不稳定
// （对象字面量仅首条、动态模板残留变量 —— e2e-dist #260/#299 双防线 404 实拦）。
// 相对主文档基准下 dev/dist/gh-pages 子路径三构命中（dist/ios-desktop/assets/… 200 实测）。
const LAUNCHER_CLOCK_BASE = 'assets/icons/launcher-clock/';

/** APK 内置位图资产 URL（face/hour/minute/second，xxxhdpi webp） */
function launcherClockAsset(name) { return LAUNCHER_CLOCK_BASE + name + '.webp'; }

/**
 * ClockDrawableWrapper.applyTime + RJ.xml rotate 层逐字换算（纯函数，导出供测试）。
 * @param {Date} t 当前时刻
 * @returns {{hour:string, minute:string, second:string}} CSS rotate 角度串（未 mod 的
 *   源码原值 —— RotateDrawable 大角度与 mod 360 视觉等效，保留源码映射原貌）
 */
export function launcherClockAngles(t) {
  const h12 = t.getHours() % 12;
  const m = t.getMinutes();
  const s = t.getSeconds();
  const convertedHour = (h12 + (12 - 10)) % 12;   // defaultHour = 10
  const convertedMinute = (m + (60 - 10)) % 60;   // defaultMinute = 10
  const convertedSecond = (s + (60 - 30)) % 60;   // defaultSecond = 30
  const hourLevel = convertedHour * 60 + m;
  const minuteLevel = h12 * 60 + convertedMinute;
  const secondLevel = convertedSecond * 10;       // LEVELS_PER_SECOND = 10
  return {
    hour: (300 + (5300 - 300) * hourLevel / 10000).toFixed(2),
    minute: (60 + (60060 - 60) * minuteLevel / 10000).toFixed(2),
    second: (180 + (6180 - 180) * secondLevel / 10000).toFixed(2),
  };
}

/**
 * 生成动态图标的 innerHTML
 * @param {'clock'|'calendar'} type
 * @param {boolean} isLaunch — true 时 id 前缀为 launch_（启动屏用），false 为 grid_（桌面网格用）
 */
export function createDynamicIconHTML(type, isLaunch = false) {
  const prefix = isLaunch ? 'launch_' : 'grid_';

  if (type === 'clock') {
    // v7.42 语义保留：新建图标首帧即落当前时刻（inline transform 与 1Hz tick 公式
    // 完全同源 launcherClockAngles()），避免「三针齐回 from 再跳走」。
    const a = launcherClockAngles(new Date());
    return `
      <div class="dynamic-clock-icon">
        <img class="lc-face" src="${launcherClockAsset('face')}" alt="" draggable="false">
        <img class="lc-hand" id="${prefix}hourHand" src="${launcherClockAsset('hour')}" style="transform:rotate(${a.hour}deg)" alt="" draggable="false">
        <img class="lc-hand" id="${prefix}minuteHand" src="${launcherClockAsset('minute')}" style="transform:rotate(${a.minute}deg)" alt="" draggable="false">
        <img class="lc-hand" id="${prefix}secondHand" src="${launcherClockAsset('second')}" style="transform:rotate(${a.second}deg)" alt="" draggable="false">
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
  // v7.70 守卫：测试环境拆除（happy-dom teardown）/ 非DOM语境下，游离的自续约定时器
  // 仍可能在 document 已不存在后触发 —— 直达 no-op，杜绝 vitest「uncaught exception」假失败。
  if (typeof document === 'undefined') return;
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

    // v11.52 #330：角度公式翻面 —— ClockDrawableWrapper.applyTime + RJ.xml rotate 层
    // 源码换算（launcherClockAngles），秒针每秒 +6° 步进与源码 setLevel 离散跳变一致；
    // syncIconStyle 值比对去重保留（每秒/每分钟各一次真写，空闲零重绘）
    const a = launcherClockAngles(now);

    ['grid_', 'launch_'].forEach((p) => {
      syncIconStyle(p + 'hourHand', `rotate(${a.hour}deg)`);
      syncIconStyle(p + 'minuteHand', `rotate(${a.minute}deg)`);
      syncIconStyle(p + 'secondHand', `rotate(${a.second}deg)`);
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
