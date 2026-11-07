// ==================== status-bar.js — 全局与应用内状态栏统一映射驱动 (真实设备信息 API) ====================

import { dom } from './dom.js';
import { ICONS } from './icons.js';
import { mediaService } from './media-service.js';
import { subscribeBattery } from './battery-service.js';
import { colorProfile, fillFraction, COLOR_PROFILE } from './aosp/battery-drawable-state.js';
// v9.36 #195 一期加餐：隐私使用指示器 —— one-time 会话期（任务存续期）映射 PrivacyItem
// （SystemUI/privacy/PrivacyItem.kt 同构；AOSP 信号源为 AppOps 稼动事件流，md3 无实时
// 稼动信号，用会话期映射诚实标注；chip 落位 = 时间右侧，A12+ 语义）
import { PRIVACY_TYPES } from './aosp/grant-permissions.js';
// v7.28 状态栏通知图标实时化：通知中心数据源（notifications-changed 事件驱动刷新；
// 双方均函数体内互调，ESM 循环安全 —— 与 app-bus↔notifications 同惯例）
import { getNotifications, resolveNotiIcon } from './notifications.js';
// v9.95 #89 状态栏常态图标位策略：PhoneStatusBarPolicy 判定表 + 图标显隐治理（blocklist）
// + MobileIconGroup 分级（AOSP aosp-mirror main 实源核对，规则注解见策略模块头）
import {
  SB_SLOT_ICONS,
  MOBILE_ICON_GROUPS,
  resolveVisibleSlots,
  applyBlocklist,
  resolveMobileIconGroup,
} from './aosp/status-bar-policy.js';
import { getRingerMode } from './sound-haptics.js'; // ringer 三态单一真源（#36；本模块只读）

let batteryLevel = 85;
let isBatteryCharging = false;
let wifiConnected = typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
let isAudioPlaying = false;
/** 隐私指示器当前活动项（privacy-items-changed 事件驱动；空 = 无指示） */
let privacyItems = [];

// ==================== v9.95 #89 常态图标位策略态 ====================
// PhoneStatusBarPolicy 各插槽信号快照（动态 import quick-settings 读取磁贴真值——
// quick-settings 静态依赖本模块 setWifiStatus，反向只能动态导入，syncInternetTile 同惯例）；
// 占位槽（hotspot/data_saver/headset）md3 无信号源恒 false（v9.92 screenshot 占位同款诚实标注）
let policySnapshot = {
  alarmSet: false,
  zenActive: false,
  ringerMode: 'ring',
  headsetConnected: false,
  bluetoothConnected: false,
  hotspotOn: false,
  castActive: false,
  vpnActive: false,
  locationActive: false,
  recording: false,
  dataSaverOn: false,
};
// Network Information API effectiveType → MobileIconGroup（无 API 时 '5g' 承接现状真值）
let effectiveType = (typeof navigator !== 'undefined' && navigator.connection && navigator.connection.effectiveType) || '';
/** 图标显隐治理 blocklist（config_statusBarIconsToExclude 同构；设置 › 系统 › 状态栏 开关组持久化） */
const SB_BLOCKLIST_KEY = 'ios-desktop:statusbar-icon-blocklist';

function statusbarBlocklist() {
  try {
    const raw = localStorage.getItem(SB_BLOCKLIST_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

/** 从 quick-settings 磁贴真值重读策略快照（动态 import 防循环；面板模块未就绪时保留旧值） */
function refreshPolicySnapshot() {
  import('./quick-settings.js').then((m) => {
    try {
      const tile = (id) => { try { return m.getTileActive(id); } catch (e) { return false; } };
      policySnapshot = {
        alarmSet: tile('alarm'),
        zenActive: tile('modes'),
        ringerMode: getRingerMode(),
        headsetConnected: false, // 占位：md3 无耳机插拔信号源
        bluetoothConnected: tile('bluetooth'),
        hotspotOn: false,        // 占位：md3 无热点磁贴
        castActive: tile('cast'),
        vpnActive: tile('vpn'),
        locationActive: privacyItems.some((i) => i && i.privacyType === 'location'),
        recording: tile('screen_record'),
        dataSaverOn: false,      // 占位：md3 无流量节省信号源
      };
      renderPolicyIcons();
    } catch (e) { /* 磁贴注册表未就绪：下次事件驱动自然对齐 */ }
  }).catch(() => { /* 同上 */ });
}

/** 策略插槽 HTML（resolveVisibleSlots 判定表 + blocklist 治理；空列表容器 display:none） */
function buildPolicyIconsHtml() {
  const slots = applyBlocklist(resolveVisibleSlots(policySnapshot), statusbarBlocklist());
  const icons = slots.map((s) =>
    `<span class="status-icon sb-slot" data-sb-slot="${s.slot}" title="${s.slot}" aria-label="${SB_SLOT_ARIA[s.slot] || s.slot}" role="img">${ICONS[SB_SLOT_ICONS[s.slot]] || ''}</span>`
  ).join('');
  return `<span class="sb-policy-inner" style="display:${slots.length ? 'inline-flex' : 'none'};align-items:center;gap:5px;">${icons}</span>`;
}

/** 策略插槽刷新（HTML 级值差分——与 noti icons 同范式，无变化零 DOM 触碰） */
function renderPolicyIcons() {
  const html = buildPolicyIconsHtml();
  document.querySelectorAll('.sb-policy-icons').forEach((el) => {
    if (el.dataset.sbHtml !== html) {
      el.dataset.sbHtml = html;
      el.innerHTML = html;
    }
  });
}

/** MobileIconGroup 徽章（AOSP ic_5g_mobiledata 族为 path 矢量字形，md3 以 SVG text 承载
 *  同字形语义——统一 20×13 视口与全站图标语言，替代旧 5G 纯文本内联样式；分级见策略模块） */
function mobileBadgeSvg(badge) {
  return `<svg viewBox="0 0 32 20" width="20" height="13" role="img" aria-label="${badge}"><text x="16" y="15.5" text-anchor="middle" font-size="13" font-weight="800" fill="currentColor" font-family="inherit" letter-spacing="-0.5">${badge}</text></svg>`;
}

/** 移动数据徽章刷新（分级值差分；none 组隐藏） */
function renderMobileBadge() {
  const group = MOBILE_ICON_GROUPS[resolveMobileIconGroup(effectiveType)];
  const badge = group ? group.badge : '5G';
  const html = badge ? mobileBadgeSvg(badge) : '';
  document.querySelectorAll('.mobile-data-badge').forEach((el) => {
    if (el.dataset.badge !== badge) {
      el.dataset.badge = badge;
      el.innerHTML = html;
      el.style.display = badge ? 'inline-flex' : 'none';
    }
  });
}

/** PrivacyType → 状态栏图标（icons.js 同源键名；camera/microphone/location 三类，
    TYPE_MEDIA_PROJECTION md3 无投屏应用不上指示） */
const PRIVACY_ICONS = {
  camera: 'camera_access',
  microphone: 'mic_access',
  location: 'location_on',
};

/** v10.34 #105 P0（R95 审计帖行一）：title ≠ contentDescription 等价（触屏不可达、
 *  部分读屏器忽略 span+title 组合）→ 全部 title 位点补 aria-label。
 *  插槽 zh 文案 = AOSP PhoneStatusBarPolicy contentDescription 语义映射（md3 本地化，
 *  逐字源串未实拉——热点/耳机占位插槽语义同表在录）；title 保留 tooltip 面不退役。 */
const SB_SLOT_ARIA = {
  alarm_clock: '闹钟',
  zen: '勿扰模式',
  mute: '静音',
  vibrate: '振动',
  headset: '耳机',
  bluetooth: '蓝牙已连接',
  hotspot: '热点',
  cast: '屏幕投射',
  vpn: 'VPN',
  location: '位置信息',
  screen_record: '正在录屏',
  data_saver: '流量节省程序',
};

/** 隐私 chip contentDescription（AOSP PrivacyDialog 语义：正在使用 X） */
const PRIVACY_ARIA = {
  camera: '正在使用摄像头',
  microphone: '正在使用麦克风',
  location: '正在使用位置信息',
};

/** 隐私 chip HTML：活动类型去重排序（ChipBuilder.generateIcons 同构），空列表隐藏 */
function buildPrivacyChipHtml() {
  const types = [...new Set(privacyItems.map((i) => i.privacyType))].filter((t) => PRIVACY_ICONS[t]).sort();
  const icons = types.map((t) => `<span class="privacy-chip-item" title="${t}" aria-label="${PRIVACY_ARIA[t] || t}" role="img">${ICONS[PRIVACY_ICONS[t]] || ''}</span>`).join('');
  return `<span class="privacy-chip" style="display:${types.length ? 'inline-flex' : 'none'};align-items:center;gap:3px;margin-left:6px;padding:1px 6px;border-radius:9px;background:hsl(var(--md-h,215) 80% 60% / 0.16);font-size:11px;color:var(--md-primary,#7df8db);vertical-align:middle;">${icons}</span>`;
}

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
    return `<span class="status-icon noti-st-icon" data-noti-id="${escAttr(n && n.id)}" title="${escAttr(n && n.app)}" aria-label="${escAttr(n && n.app)}${escAttr(n && n.title) ? '：' + escAttr(n.title) : ''}" role="img">${icon}</span>`;
  }).join('');
  if (list.length > 4) {
    const more = list.length - 4;
    html += `<span class="noti-st-more" title="还有 ${more} 条通知" aria-label="还有 ${more} 条通知">+${more > 9 ? '9+' : more}</span>`;
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
      ${buildPrivacyChipHtml()}
      ${notiHTML}
    </div>
    <div class="status-right">
      <span class="sb-policy-icons">${buildPolicyIconsHtml()}</span>
      <span class="status-icon wifi-icon">${wifiConnected ? ICONS.wifi : ICONS.wifi_off}</span>
      <span class="status-icon cellular-icon">${ICONS.cellular}</span>
      <span class="status-icon mobile-data-badge">${mobileBadgeSvg(MOBILE_ICON_GROUPS[resolveMobileIconGroup(effectiveType)].badge)}</span>
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

/**
 * 刷新所有状态栏的电量与充电状态（由 battery-service 广播驱动；值差分写入，无变化不碰 DOM）
 * v8.06 status_bar_show_battery_percent 消费点：System.SHOW_BATTERY_PERCENT 语义映射 →
 * .battery-pct 显隐（store ios-desktop:statusbar-battery-percent，默认开；
 * 设置页电池子页开关 ↔ 此处单一真源联动）
 */
function statusbarPctEnabled() {
  try { return localStorage.getItem('ios-desktop:statusbar-battery-percent') !== '0'; } catch (e) { return true; }
}

function updateBatteryDisplay() {
  // fix(audit-B): 值差分 —— 电量百分比/宽度/充电态没变不重写 DOM，消除每秒无谓 style/layout churn
  // #194：四态 ColorProfile 分态（unified BatteryDrawableState.kt L26-34 同构）——
  // saver 判定与 battery-service.simSaverActive 同口径（body.battery-saver-mode 单一真源）
  let saverOn = false;
  try { saverOn = document.body.classList.contains('battery-saver-mode'); } catch (e) { /* noop */ }
  const profile = colorProfile(batteryLevel, isBatteryCharging, saverOn);
  const fracText = `${Math.round(fillFraction(batteryLevel) * 100)}%`;   // FULL=96 满电折算
  const pctText = `${batteryLevel}%`;
  const pctVisible = statusbarPctEnabled();
  document.querySelectorAll('.battery-pct').forEach((el) => {
    if (el.textContent !== pctText) el.textContent = pctText;
    if (el.style.display !== (pctVisible ? '' : 'none')) el.style.display = pctVisible ? '' : 'none';
  });
  document.querySelectorAll('.battery-icon-level').forEach((el) => {
    if (el.style.width !== fracText) el.style.width = fracText;
  });
  document.querySelectorAll('.battery-pill').forEach((el) => {
    if (el.classList.contains('is-charging') !== isBatteryCharging) {
      el.classList.toggle('is-charging', isBatteryCharging);
    }
    // #194 四态分态 class 差分（互斥：Active→is-charging / Warning→battery-saver /
    // Error→battery-critical / None→三清）
    const want = {
      'battery-critical': profile === COLOR_PROFILE.ERROR,
      'battery-saver': profile === COLOR_PROFILE.WARNING,
    };
    Object.entries(want).forEach(([cls, on]) => {
      if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
    });
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
  // v9.95 #89 策略插槽事件驱动：QS 磁贴翻转（click flip / syncTileState / 蓝牙 sheet 派发）
  // + ringer 三态（sound-haptics setRingerMode 派发，AudioService.RINGER_MODE_CHANGED_ACTION
  // 同构）+ blocklist 设置开关组 + 隐私指示器（location 插槽同源）
  document.addEventListener('qs-tiles-changed', refreshPolicySnapshot);
  document.addEventListener('ringer-mode-changed', (e) => {
    const mode = e && e.detail && e.detail.mode;
    if (mode === 'ring' || mode === 'vibrate' || mode === 'silent') policySnapshot.ringerMode = mode;
    renderPolicyIcons();
  });
  document.addEventListener('statusbar-icon-blocklist-changed', renderPolicyIcons);
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
        // v9.95 #89：effectiveType 变化 → MobileIconGroup 分级即时对齐
        effectiveType = conn.effectiveType || '';
        renderMobileBadge();
      });
    }
  }
}

/** v9.95 #89 图标显隐治理出口（设置页 blocklist 写入后派发 statusbar-icon-blocklist-changed） */
export function setStatusbarBlocklist(list) {
  try { localStorage.setItem(SB_BLOCKLIST_KEY, JSON.stringify(Array.isArray(list) ? list : [])); } catch (e) {}
  document.dispatchEvent(new CustomEvent('statusbar-icon-blocklist-changed'));
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
  // v7.84 统一 Shade：CollapsedShadeHeader 单行小头部（Shade 场景）同步刷新
  document.querySelectorAll('.csh-clock').forEach((el) => {
    if (el.textContent !== timeStr) el.textContent = timeStr;
  });
  document.querySelectorAll('.csh-date').forEach((el) => {
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
  // v8.06 status_bar_show_battery_percent：设置页开关 → 即时显隐 .battery-pct
  document.addEventListener('statusbar-battery-percent-changed', updateBatteryDisplay);

  // v9.36 #195 一期加餐：隐私使用指示器实时化 —— one-time 会话变化（授权/任务移除回收）
  // 即时对齐 chip；值差分重建（与 noti icons 同范式）
  document.addEventListener('privacy-items-changed', (e) => {
    try { privacyItems = (e.detail && e.detail.items) || []; } catch (err) { privacyItems = []; }
    const html = buildPrivacyChipHtml();
    document.querySelectorAll('.status-left .privacy-chip').forEach((el) => {
      if (el.outerHTML !== html) el.outerHTML = html;
    });
    // v9.95 #89：location 插槽同源（isLocationActive 语义 = 应用正使用定位）
    policySnapshot.locationActive = privacyItems.some((i) => i && i.privacyType === 'location');
    renderPolicyIcons();
  });
  initRealNetworkAPI();

  // v9.95 #89 常态图标位：首读磁贴真值 + 网络分级首渲染（qs-tiles-changed 事件后续驱动）
  policySnapshot.ringerMode = getRingerMode();
  refreshPolicySnapshot();
  renderMobileBadge();

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
