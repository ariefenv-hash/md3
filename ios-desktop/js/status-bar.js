// ==================== status-bar.js — 全局与应用内状态栏统一映射驱动 (真实设备信息 API) ====================

import { dom } from './dom.js';
import { ICONS } from './icons.js';
import { mediaService } from './media-service.js';
import { subscribeBattery } from './battery-service.js';
// v7.28 状态栏通知图标实时化：通知中心数据源（notifications-changed 事件驱动刷新；
// 双方均函数体内互调，ESM 循环安全 —— 与 app-bus↔notifications 同惯例）
import { getNotifications, resolveNotiIcon } from './notifications.js';

let batteryLevel = 85;
let isBatteryCharging = false;
let wifiConnected = typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
let isAudioPlaying = false;

/** 属性转义（通知 id / 应用名为应用可控文本，插入 title/data 属性前必须转义） */
function escAttr(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** v7.28 状态栏通知图标 HTML：最近 4 条真实通知的对应图标（与通知中心面板同源
    解析 —— 有真实应用图标用桌面本体图标）+ 溢出计数 + 音乐播放指示 */
function buildNotiIconsHtml() {
  let list = [];
  try { list = getNotifications() || []; } catch (e) { list = []; }
  const shown = list.slice(0, 4);
  let html = shown.map((n) => {
    const icon = resolveNotiIcon(n);
    return `<span class="status-icon noti-st-icon" data-noti-id="${escAttr(n && n.id)}" title="${escAttr(n && n.app)}">${icon}</span>`;
  }).join('');
  if (list.length > 4) {
    const more = list.length - 4;
    html += `<span class="noti-st-more" title="还有 ${more} 条通知">+${more > 9 ? '9+' : more}</span>`;
  }
  // 音乐播放指示（媒体会话状态，随通知图标一并重建，播放态取当前真值）
  html += `<span class="status-icon noti-music-icon" style="display:${isAudioPlaying ? 'inline-flex' : 'none'};color:var(--md-primary,#7df8db);">${ICONS.music_note}</span>`;
  return html;
}

/** 生成状态栏的统一 HTML 结构 */
export function getStatusBarInnerHtml(showNotiIcons = true) {
  const notiHTML = showNotiIcons
    ? `
    <span class="status-noti-icons">${buildNotiIconsHtml()}</span>`
    : '';

  return `
    <div class="status-left">
      <span class="status-time">12:00</span>
      ${notiHTML}
    </div>
    <div class="status-right">
      <span class="status-icon wifi-icon">${wifiConnected ? ICONS.wifi : ICONS.wifi_off}</span>
      <span class="status-icon cellular-icon">${ICONS.cellular}</span>
      <span class="status-icon" style="font-size:11px;font-weight:700;letter-spacing:-0.2px;">5G</span>
      <div class="battery-pill ${isBatteryCharging ? 'is-charging' : ''}">
        <span class="battery-charging-indicator" style="display:${isBatteryCharging ? 'inline-flex' : 'none'};margin-right:2px;color:var(--md-primary,#7df8db);">${ICONS.battery_charging}</span>
        <span class="battery-pct">${batteryLevel}%</span>
        <div class="battery-icon-shape">
          <div class="battery-icon-level" style="width:${batteryLevel}%"></div>
        </div>
      </div>
    </div>
  `;
}

/** 刷新所有状态栏的电量与充电状态（由 battery-service 广播驱动；值差分写入，无变化不碰 DOM） */
function updateBatteryDisplay() {
  // fix(audit-B): 值差分 —— 电量百分比/宽度/充电态没变不重写 DOM，消除每秒无谓 style/layout churn
  const pctText = `${batteryLevel}%`;
  const widthText = `${batteryLevel}%`;
  document.querySelectorAll('.battery-pct').forEach((el) => {
    if (el.textContent !== pctText) el.textContent = pctText;
  });
  document.querySelectorAll('.battery-icon-level').forEach((el) => {
    if (el.style.width !== widthText) el.style.width = widthText;
  });
  document.querySelectorAll('.battery-pill').forEach((el) => {
    if (el.classList.contains('is-charging') !== isBatteryCharging) {
      el.classList.toggle('is-charging', isBatteryCharging);
    }
  });
  const chgDisplay = isBatteryCharging ? 'inline-flex' : 'none';
  document.querySelectorAll('.battery-charging-indicator').forEach((el) => {
    if (el.style.display !== chgDisplay) el.style.display = chgDisplay;
  });
}

/** v7.28 刷新全部状态栏实例的通知图标区（HTML 级值差分） */
function renderNotiIcons() {
  const html = buildNotiIconsHtml();
  document.querySelectorAll('.status-noti-icons').forEach((el) => {
    if (el.dataset.notiHtml !== html) {
      el.dataset.notiHtml = html;
      el.innerHTML = html;
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('notifications-changed', renderNotiIcons);
}

/** 接入真实网络状态监听 */

// fix(audit-B): 真实网络状态 → 快捷设置 Internet 磁贴单向同步。
// 此前 online/offline 只更新状态栏图标，磁贴与真实网络脱钩（用户关磁贴后
// 网络波动点亮状态栏而磁贴仍“关”）。走 syncTileState 增量 patch（无 Toast，
// 不会与用户手动开关磁贴的播报重复）；动态 import 规避 status-bar ↔
// quick-settings 静态循环依赖（quick-settings 已静态依赖本模块的 setWifiStatus）。
function syncInternetTile(active) {
  import('./quick-settings.js').then((m) => {
    try { m.syncTileState('internet', { active }); } catch (e) {}
  }).catch(() => { /* 面板模块未就绪时静默跳过（磁贴数据下次渲染自然对齐） */ });
}

function initRealNetworkAPI() {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { setWifiStatus(true); syncInternetTile(true); });
    window.addEventListener('offline', () => { setWifiStatus(false); syncInternetTile(false); });

    // 如果浏览器支持 Network Information API
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      conn.addEventListener('change', () => {
        const isOnline = navigator.onLine !== false && conn.effectiveType !== 'none';
        setWifiStatus(isOnline);
        syncInternetTile(isOnline);
      });
    }
  }
}

/** 更新所有状态栏实例的时间与状态 */
export function updateAllStatusBars() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // fix(audit-B): 值差分写入 —— 分钟级时钟字符串没变不重写 textContent
  document.querySelectorAll('.status-time, #clock').forEach((el) => {
    if (el.textContent !== timeStr) el.textContent = timeStr;
  });

  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const dayName = days[now.getDay()];
  const dateStr = `${dayName}, ${months[now.getMonth()]}${now.getDate()}日`;

  document.querySelectorAll('.panel-big-clock').forEach((el) => {
    if (el.textContent !== timeStr) el.textContent = timeStr;
  });
  document.querySelectorAll('.panel-date').forEach((el) => {
    if (el.textContent !== dateStr) el.textContent = dateStr;
  });

  updateBatteryDisplay();
}

/** 设置 WiFi 状态 */
export function setWifiStatus(connected) {
  wifiConnected = connected;
  document.querySelectorAll('.wifi-icon').forEach((el) => {
    el.innerHTML = wifiConnected ? ICONS.wifi : ICONS.wifi_off;
  });
}

/** fix(audit-B): 分钟边界刷新调度器（取代每秒 setInterval 的常驻轮询） */
let _minuteTimer = 0;
function scheduleNextMinuteUpdate() {
  clearTimeout(_minuteTimer);
  const now = Date.now();
  const nextMinute = (Math.floor(now / 60000) + 1) * 60000 + 1000; // 下一整分钟 + 1s 冗余
  _minuteTimer = setTimeout(() => {
    updateAllStatusBars();
    scheduleNextMinuteUpdate();
  }, Math.max(1000, nextMinute - Date.now()));
}

/** 注入并初始化状态栏 */
export function initStatusBar() {
  const desktopStatusBar = document.querySelector('.status-bar');
  if (desktopStatusBar) {
    desktopStatusBar.innerHTML = getStatusBarInnerHtml(true);
  }

  if (dom.appWindow) {
    let appStatusBar = dom.appWindow.querySelector('.app-window-status-bar');
    if (!appStatusBar) {
      appStatusBar = document.createElement('div');
      appStatusBar.className = 'app-window-status-bar';
      dom.appWindow.insertBefore(appStatusBar, dom.appWindow.firstChild);
    }
    appStatusBar.innerHTML = getStatusBarInnerHtml(false);
  }

  // 监听媒体播放状态
  mediaService.subscribe((state) => {
    isAudioPlaying = state.isPlaying;
    document.querySelectorAll('.noti-music-icon').forEach((el) => {
      el.style.display = isAudioPlaying ? 'inline-flex' : 'none';
    });
  });

  // 接入真实设备 API（电量单一真源：battery-service，设置/查找等同源同步）
  subscribeBattery((s) => {
    batteryLevel = s.level;
    isBatteryCharging = s.charging;
    updateBatteryDisplay();
  });
  initRealNetworkAPI();

  // v7.28 通知图标实时化：通知中心增/删/清空/日历动态同步 → 状态栏图标即时对齐
  // （notifications-changed 为 setTimeout(0) 合并派发，天然防事件风暴；此处再做
  //  HTML 级值差分，无变化零 DOM 触碰）
  renderNotiIcons();


  updateAllStatusBars();
  // fix(audit-B): 分钟边界调度取代每秒 setInterval —— 时钟为分钟级粒度，
  // 对齐下一整分钟（+1s 冗余，防临界跳变）唤醒一次；每次唤醒按 Date.now()
  // 重新计算下个边界，后台节流导致的晚醒可自愈校正。电量仍由 battery-service
  // 订阅广播驱动（原有语义不变），值差分写入兜底覆盖新挂载的状态栏实例。
  scheduleNextMinuteUpdate();
}
