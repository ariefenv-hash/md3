// ==================== quick-settings.js — Android 16 / Pixel 10 MD3 系统级快速控制中心 ====================

import { state } from './state.js';
import { dom } from './dom.js';
import { openApp } from './app-window.js';
import { initialApps } from './apps-data.js';
import { ICONS } from './icons.js';
import { setWifiStatus } from './status-bar.js';
import { mediaService } from './media-service.js';
import { closePullPanels } from './pull-down-gesture.js';
import { lockNow } from './lock-screen.js';
import { getResolvedTheme, setThemeMode } from './theme-mode.js';
import { playSfx } from './sound-haptics.js';
// v7.62：Android 16 QPR1 可调磁贴尺寸（1×1 圆瓷贴 ↔ 2×1 宽药丸）纯函数内核
import { QS_TILE_SIZES, loadTileSizes, saveTileSizes, applyTileSizes, sizesFromTiles, setTileSize, resizeFromDrag, clampPreviewDx } from './qs-tiles.js';

// 初始默认已激活磁贴
const ZONE2_CHEVRON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';

const DEFAULT_ACTIVE_TILES = [
  { id: 'internet', name: 'Internet', sub: '中国移动 5G Wi-Fi', iconKey: 'wifi', active: true },
  { id: 'bluetooth', name: 'Bluetooth', sub: 'Pixel Buds Pro', iconKey: 'bluetooth', active: true },
  { id: 'darktheme', name: 'Dark theme', sub: '深色模式', iconKey: 'darktheme', active: true },
  { id: 'torch', name: 'Torch', sub: '手电筒', iconKey: 'torch', active: false },
  { id: 'modes', name: 'Modes', sub: '勿扰模式', iconKey: 'modes', active: false },
  { id: 'focus', name: 'Focus', sub: '番茄钟 · 专注', iconKey: 'focus_mode', active: false },
  { id: 'profile', name: 'Profile', sub: '个人 / 工作模式', iconKey: 'person', active: false },
  { id: 'autorotate', name: 'Auto-rotate', sub: '自动旋转', iconKey: 'autorotate', active: true },
  { id: 'battery_saver', name: 'Battery Saver', sub: '省电模式', iconKey: 'battery_saver', active: false },
  { id: 'lock_screen', name: '锁屏', sub: '立即锁定屏幕', iconKey: 'lock', active: false },
  { id: 'qrcode', name: 'QR code', sub: '扫一扫', iconKey: 'qrcode', active: false },
  { id: 'screen_record', name: 'Screen record', sub: '屏幕录制', iconKey: 'screen_record', active: false },
  { id: 'wallet', name: 'Wallet', sub: '谷歌钱包', iconKey: 'wallet', active: false },
  { id: 'mic_access', name: 'Mic access', sub: '麦克风权限', iconKey: 'mic_access', active: true },
  { id: 'camera_access', name: 'Camera access', sub: '相机权限', iconKey: 'camera_access', active: true },
  { id: 'quick_share', name: 'Quick Share', sub: '快传服务', iconKey: 'quick_share', active: true },
  { id: 'cast', name: 'Cast', sub: '无线投屏', iconKey: 'cast', active: false },
  { id: 'alarm', name: 'Alarm', sub: '未设置闹钟', iconKey: 'alarm', active: false },
  { id: 'aeroplane', name: 'Aeroplane', sub: '飞行模式', iconKey: 'aeroplane', active: false },
];

const DEFAULT_AVAILABLE_CATEGORIES = [
  {
    category: 'Accessibility / 无障碍辅助',
    tiles: [
      { id: 'colour_correction', name: 'Colour correction', sub: '色彩校正', iconKey: 'colour_correction' },
      { id: 'colour_inversion', name: 'Colour inversion', sub: '色彩反转', iconKey: 'colour_inversion' },
      { id: 'hearing_devices', name: 'Hearing devices', sub: '助听设备', iconKey: 'hearing_devices' },
      { id: 'one_handed', name: 'One-handed mode', sub: '单手模式', iconKey: 'one_handed' },
    ]
  },
  {
    category: 'From system apps / 系统功能',
    tiles: [
      { id: 'calculator', name: 'Calculator', sub: '计算器', iconKey: 'calculator' },
      { id: 'focus_mode', name: 'Focus mode', sub: '专注模式', iconKey: 'focus_mode' },
      { id: 'live_caption', name: 'Live Caption', sub: '实时字幕', iconKey: 'live_caption' },
      { id: 'live_transcribe', name: 'Live Transcribe', sub: '实时转写', iconKey: 'live_transcribe' },
      { id: 'recorder', name: 'Recorder', sub: '录音机', iconKey: 'recorder' },
      { id: 'song_search', name: 'Song search', sub: '听歌识曲', iconKey: 'song_search' },
      { id: 'sound_notifications', name: 'Sound notifications', sub: '声音通知', iconKey: 'sound_notifications' },
      { id: 'storage', name: 'Storage', sub: '存储空间', iconKey: 'storage' },
      { id: 'vpn', name: 'VPN', sub: '虚拟网络', iconKey: 'vpn' },
    ]
  }
];

let activeTiles = [...DEFAULT_ACTIVE_TILES];
let availableCategories = JSON.parse(JSON.stringify(DEFAULT_AVAILABLE_CATEGORIES));
let editHistory = [];
// v7.62：磁贴尺寸表（id → 'wide' | 'small'），启动时从 localStorage 恢复（跨会话保留）
let tileSizes = applyTileSizes(activeTiles, loadTileSizes(typeof localStorage !== 'undefined' ? localStorage : null));
let currentBrightness = 80;
let currentVolume = 60;
// fix(audit-B): 移除 isRecordingScreen 死变量（原声明于此，全库无读写；
// 录制真源以 #statusRecIndicator 指示器在场为准）
let recordTimerInterval = null;

/** 初始化快速设置面板内容与事件 */
export function initQuickSettings() {
  restoreBatterySaverState();
  renderQuickSettingsGrid();
  initSliders();
  initEditTilesView();
  initPowerDialog();
  initHeaderIcons();

  // 绑定编辑小铅笔按钮
  const editBtn = document.getElementById('qsEditBtn');
  if (editBtn) {
    editBtn.innerHTML = ICONS.edit;
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditTilesView();
    });
  }

  // 绑定设置齿轮按钮
  const settingsBtn = document.getElementById('qsSettingsBtn');
  if (settingsBtn) {
    settingsBtn.innerHTML = ICONS.settings;
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePullPanels();
      const idx = initialApps.findIndex(a => a.id === 'settings');
      if (idx !== -1) {
        const iconEl = document.querySelector(`[data-id="settings"]`);
        openApp(idx, iconEl);
      }
    });
  }

  // 绑定电源按钮
  const powerBtn = document.getElementById('qsPowerBtn');
  if (powerBtn) {
    powerBtn.innerHTML = ICONS.power;
    powerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openPowerDialog();
    });
  }
}

/** 注入头部矢量图标 */
function initHeaderIcons() {
  document.querySelectorAll('.panel-carrier-icon').forEach(el => {
    el.innerHTML = ICONS.cellular;
  });
}

/** 渲染快速设置磁贴网格 (纯矢量 SVG 图标) */
export function renderQuickSettingsGrid() {
  const container = document.getElementById('qsTilesContainer');
  if (!container) return;

  container.innerHTML = '';

  activeTiles.forEach((tile) => {
    // 深色模式磁贴：开关状态实时跟随解析后的实际外观（自动档跟随系统）
    const tileActive = tile.id === 'darktheme' ? getResolvedTheme() === 'dark' : tile.active;
    // v7.62：尺寸类（Android 16 QPR1：1×1 圆瓷贴 / 2×1 宽药丸）
    const isSmall = tile.size === QS_TILE_SIZES.SMALL;
    const pill = document.createElement('div');
    pill.className = `qs-tile-pill ${isSmall ? 'size-small' : 'size-wide'} ${tileActive ? 'active' : ''}`;
    pill.dataset.tileId = tile.id;

    const iconSvg = ICONS[tile.iconKey] || ICONS.settings;

    // v7.3 回归：手电筒磁贴移除拟物物理开关（Uiverse 缝合③退场）——
    // 红色开关体遮挡原生图标、与瓷贴视觉冲突，回归统一的「图标 + 状态色」瓷贴语言
    const iconHtml = `<div class="qs-tile-icon-wrap">${iconSvg}</div>`;

    // v7.62：双分区磁贴（宽磁贴专属）——蓝牙/Modes 右侧独立子仓开启设备/模式清单
    const zone2Html = (!isSmall && (tile.id === 'bluetooth' || tile.id === 'modes'))
      ? `<button class="qs-tile-zone2" data-zone2="${tile.id}" aria-label="${tile.id === 'bluetooth' ? '已配对设备' : '模式清单'}">${ZONE2_CHEVRON}</button>`
      : '';

    if (isSmall) {
      // 1×1 圆瓷贴：文字标签移除，仅图标居中（与真实 Android 16 同规格）
      pill.innerHTML = iconHtml;
    } else {
      pill.innerHTML = `
      ${iconHtml}
      <div class="qs-tile-text">
        <span class="qs-tile-title">${tile.name}</span>
        <span class="qs-tile-sub">${tileActive ? (tile.sub || '已开启') : '已关闭'}</span>
      </div>
      ${zone2Html}
    `;
    }

    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      tile._sourceRect = pill.getBoundingClientRect(); // 记录磁贴位置，应用从磁贴处起飞
      // 锁屏磁贴：动作型磁贴，不切换开关状态，直接锁屏
      if (tile.id === 'lock_screen') {
        if (navigator.vibrate) navigator.vibrate(20);
        playSfx('tick'); // fix(P3)：磁贴通用 tap 音已移除（防一击双声），动作磁贴统一此处发声
        closePullPanels();
        setTimeout(() => lockNow(), 120); // 等面板收起后再上锁，避免遮挡收起动画
        return;
      }
      // v7.62：Internet 磁贴对齐 Android 16 语义 —— 点击永远弹出内联网络面板（无直接开关）
      if (tile.id === 'internet') {
        if (navigator.vibrate) navigator.vibrate(15);
        openNetworkSheet();
        return;
      }
      // 模式切换磁贴：动作型磁贴，点击即在「个人 / 工作」间切换（见 profiles.js）
      if (tile.id === 'profile') {
        if (navigator.vibrate) navigator.vibrate(20);
        playSfx('profile');
        closePullPanels();
        setTimeout(() => { if (window.__profiles) window.__profiles.toggle(); }, 160);
        return;
      }
      // fix(audit-B): 开应用类动作磁贴（扫码/钱包/计算器）与 lock_screen/profile 同款提前
      // return —— 不翻转 active 开关态（动作型磁贴不该有「已开启/已关闭」状态）
      if (tile.id === 'qrcode' || tile.id === 'wallet' || tile.id === 'calculator') {
        if (navigator.vibrate) navigator.vibrate(20);
        playSfx('tick');
        handleTileAction(tile); // 内部各自 closePullPanels + 以磁贴为动画源 openApp
        return;
      }
      playSfx('tick');
      tile.active = !tile.active;
      if (tile.id === 'darktheme') {
        // 外观切换交由 theme-mode 单一真源：切到当前实际模式的相反面
        setThemeMode(getResolvedTheme() === 'dark' ? 'light' : 'dark');
        tile.active = getResolvedTheme() === 'dark';
      }
      if (navigator.vibrate) navigator.vibrate(20);
      refreshTilePill(tile);
      handleTileAction(tile);
    });

    // v7.62：双分区磁贴右子仓（宽磁贴专属）——点击开启设备/模式清单，不翻转开关态
    const zone2Btn = pill.querySelector('.qs-tile-zone2');
    if (zone2Btn) {
      zone2Btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (navigator.vibrate) navigator.vibrate(15);
        if (tile.id === 'bluetooth') openBluetoothSheet();
        else if (tile.id === 'modes') openModesSheet();
      });
    }

    // v7.62：1×1 蓝牙圆瓷贴长按（480ms）开启已配对设备 —— 与真实 Android 16 同手势
    if (isSmall && tile.id === 'bluetooth') {
      let lpTimer = 0, lpStart = null;
      pill.addEventListener('pointerdown', (e) => {
        lpStart = { x: e.clientX, y: e.clientY };
        clearTimeout(lpTimer);
        lpTimer = setTimeout(() => { lpTimer = 0; if (navigator.vibrate) navigator.vibrate(18); openBluetoothSheet(); }, 480);
      });
      const lpCancel = (e) => {
        if (!lpTimer) return;
        clearTimeout(lpTimer); lpTimer = 0;
      };
      pill.addEventListener('pointerup', lpCancel);
      pill.addEventListener('pointercancel', lpCancel);
      pill.addEventListener('pointermove', (e) => {
        if (lpTimer && lpStart && Math.hypot(e.clientX - lpStart.x, e.clientY - lpStart.y) > 10) {
          clearTimeout(lpTimer); lpTimer = 0;
        }
      });
    }

    container.appendChild(pill);
  });
}

/** 单磁贴增量刷新：开关切换只改目标磁贴类名/副标题，不再整组 innerHTML 重建（消除闪烁源头） */
function refreshTilePill(tile) {
  const container = document.getElementById('qsTilesContainer');
  const pill = container ? container.querySelector(`.qs-tile-pill[data-tile-id="${tile.id}"]`) : null;
  if (!pill) {
    renderQuickSettingsGrid();
    return;
  }
  // 深色模式磁贴：开关状态实时跟随解析后的实际外观（与全量渲染同一口径）
  const tileActive = tile.id === 'darktheme' ? getResolvedTheme() === 'dark' : tile.active;
  // v7.62：尺寸类与当前模型不一致（编辑视图改尺寸后回主面板增量同步）→ 全量重建一次
  const wantSmall = tile.size === QS_TILE_SIZES.SMALL;
  const hasSmall = pill.classList.contains('size-small');
  if (wantSmall !== hasSmall) {
    renderQuickSettingsGrid();
    return;
  }
  pill.classList.toggle('active', tileActive);
  const sub = pill.querySelector('.qs-tile-sub');
  if (sub) sub.textContent = tileActive ? (tile.sub || '已开启') : '已关闭';
}

/** 系统级真实交互控制逻辑 */
function handleTileAction(tile) {
  switch (tile.id) {
    case 'darktheme':
      // 状态已由点击处的 setThemeMode 应用，这里只播报与磁贴态同步
      tile.active = getResolvedTheme() === 'dark';
      showSystemToast(tile.active ? '已开启深色主题' : '已切换为浅色主题', tile.active ? ICONS.bedtime : ICONS.weather_sunny);
      break;

    case 'torch':
      toggleTorch(tile.active);
      break;

    case 'internet':
      setWifiStatus(tile.active);
      showSystemToast(tile.active ? '已连接至中国移动 5G Wi-Fi' : '网络已断开连接', tile.active ? ICONS.wifi : ICONS.wifi_off);
      break;

    case 'bluetooth':
      showSystemToast(tile.active ? '蓝牙已开启，已连接 Pixel Buds Pro' : '蓝牙已关闭', tile.active ? ICONS.headphones : ICONS.block);
      break;

    case 'modes':
      // 勿扰单一真源：setDndActive 统一处理类切换 + 磁贴同步 + 播报（profiles 场景快照同样走这里）
      setDndActive(tile.active);
      break;

    case 'focus':
      // 番茄钟引擎在 focus.js：专注期自动勿扰，休息期自动恢复
      if (window.__focus) window.__focus.onTileToggle(tile.active);
      break;

    case 'battery_saver':
      // 单一真源：统一走 setBatterySaverActive（body 类 + 持久化 + 设置页开关同步）
      setBatterySaverActive(tile.active);
      break;

    case 'screen_record':
      toggleScreenRecord(tile.active);
      break;

    case 'qrcode':
      closePullPanels();
      const cameraIdx = initialApps.findIndex(a => a.id === 'camera');
      if (cameraIdx !== -1) {
        openApp(cameraIdx, null, tile._sourceRect || null);
      }
      break;

    case 'wallet':
      closePullPanels();
      const walletIdx = initialApps.findIndex(a => a.id === 'wallet');
      if (walletIdx !== -1) {
        openApp(walletIdx, null, tile._sourceRect || null);
      }
      break;

    case 'calculator':
      closePullPanels();
      const calcIdx = initialApps.findIndex(a => a.id === 'calculator');
      if (calcIdx !== -1) {
        openApp(calcIdx, null, tile._sourceRect || null);
      }
      break;

    case 'mic_access':
    case 'camera_access':
      updatePrivacyIndicators();
      showSystemToast(tile.active ? `已启用 ${tile.name}` : `已禁用 ${tile.name}`, tile.active ? ICONS.record_dot : ICONS.block);
      break;

    case 'autorotate':
      showSystemToast(tile.active ? '自动旋转已开启' : '方向已锁定', tile.active ? ICONS.autorotate : ICONS.lock);
      break;

    default:
      showSystemToast(`${tile.name}: ${tile.active ? '已开启' : '已关闭'}`);
      break;
  }
}

/** 手电筒高亮遮罩 */
function toggleTorch(active) {
  let torchLayer = document.getElementById('screenTorchLayer');
  if (!torchLayer) {
    torchLayer = document.createElement('div');
    torchLayer.id = 'screenTorchLayer';
    torchLayer.style.cssText = `
      position: fixed; inset: 0; background: #FFFFFF; z-index: 99999;
      opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; color: #000; font-family: sans-serif;
    `;
    torchLayer.innerHTML = `
      <div style="font-size:48px;margin-bottom:12px;">${ICONS.torch}</div>
      <div style="font-size:18px;font-weight:600;">屏幕手电筒高亮中</div>
      <div style="font-size:13px;opacity:0.6;margin-top:6px;">点击任意位置退出</div>
    `;
    torchLayer.addEventListener('click', () => {
      const tile = activeTiles.find(t => t.id === 'torch');
      if (tile) tile.active = false;
      renderQuickSettingsGrid();
      toggleTorch(false);
    });
    document.body.appendChild(torchLayer);
  }

  if (active) {
    torchLayer.style.pointerEvents = 'auto';
    torchLayer.style.opacity = '0.96';
  } else {
    torchLayer.style.opacity = '0';
    torchLayer.style.pointerEvents = 'none';
  }
}

/** 屏幕录制模拟 */
function toggleScreenRecord(active) {
  const statusBar = document.getElementById('statusBar');
  if (!statusBar) return;

  let recIndicator = document.getElementById('statusRecIndicator');
  if (active) {
    if (!recIndicator) {
      recIndicator = document.createElement('div');
      recIndicator.id = 'statusRecIndicator';
      recIndicator.style.cssText = `
        display: flex; align-items: center; gap: 4px; background: rgba(239, 68, 68, 0.2);
        color: #ef4444; font-size: 11px; font-weight: bold; padding: 2px 8px;
        border-radius: 12px; animation: pulse 1.5s infinite;
      `;
      recIndicator.innerHTML = `<span style="width:7px;height:7px;background:#ef4444;border-radius:50%;"></span><span id="recTimerText">00:01</span>`;
      const rightSection = statusBar.querySelector('.status-right') || statusBar;
      rightSection.prepend(recIndicator);
    }
    let sec = 1;
    clearInterval(recordTimerInterval);
    recordTimerInterval = setInterval(() => {
      sec++;
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      const tEl = document.getElementById('recTimerText');
      if (tEl) tEl.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }, 1000);
    showSystemToast('屏幕录制已启动', ICONS.record_dot);
  } else {
    clearInterval(recordTimerInterval);
    if (recIndicator) recIndicator.remove();
    showSystemToast('屏幕录制已停止并已保存', ICONS.stop_record);
  }
}

/** 隐私小绿点指示器 (Android 12+ Privacy Pill) */
function updatePrivacyIndicators() {
  const micTile = activeTiles.find(t => t.id === 'mic_access');
  const camTile = activeTiles.find(t => t.id === 'camera_access');
  const showGreenDot = (micTile && micTile.active) || (camTile && camTile.active);

  let dot = document.getElementById('statusPrivacyDot');
  const statusBar = document.getElementById('statusBar');
  if (!statusBar) return;

  if (showGreenDot) {
    if (!dot) {
      dot = document.createElement('div');
      dot.id = 'statusPrivacyDot';
      dot.style.cssText = `
        width: 8px; height: 8px; background: #22c55e; border-radius: 50%;
        box-shadow: 0 0 6px rgba(34, 197, 94, 0.8);
      `;
      const rightSection = statusBar.querySelector('.status-right') || statusBar;
      rightSection.appendChild(dot);
    }
  } else {
    if (dot) dot.remove();
  }
}

/** 查询磁贴开关状态（供桌面级模块读取，如录音机的全局麦克风闸门） */
export function getTileActive(id) {
  const t = activeTiles.find((x) => x.id === id);
  return t ? !!t.active : false;
}

/** 程序化设置勿扰模式：类切换 + 磁贴同步 + 可选播报（quick-settings / profiles / focus 共用单一真源） */
export function setDndActive(active, { silent = false } = {}) {
  const tile = activeTiles.find((t) => t.id === 'modes');
  if (tile) tile.active = !!active;
  document.body.classList.toggle('dnd-mode-active', !!active);
  renderQuickSettingsGrid();
  if (!silent) {
    showSystemToast(active ? '勿扰模式已开启 (静音新消息横幅)' : '勿扰模式已关闭', active ? ICONS.bell_off : ICONS.sound_notifications);
  }
}

/** 省电模式持久化键（设置电池页开关与快速设置磁贴共享同一真源） */
const BATTERY_SAVER_KEY = 'ios-desktop:battery-saver';

/**
 * 程序化设置省电模式：body 类 + 磁贴同步 + 持久化 + 广播（快速设置磁贴 / 设置电池页开关共用单一真源）
 * @param {boolean} active
 * @param {{ silent?: boolean }} [opts]
 */
export function setBatterySaverActive(active, { silent = false } = {}) {
  const tile = activeTiles.find((t) => t.id === 'battery_saver');
  const prev = tile ? !!tile.active : false;
  const next = !!active;
  if (tile) tile.active = next;
  document.body.classList.toggle('battery-saver-mode', next);
  try { localStorage.setItem(BATTERY_SAVER_KEY, next ? '1' : '0'); } catch (e) { /* 隐私模式等场景忽略 */ }
  renderQuickSettingsGrid();
  if (!silent && prev !== next) {
    showSystemToast(next ? '省电模式已启动 (降低背景功耗)' : '已退出省电模式', next ? ICONS.battery_saver : ICONS.bolt);
  }
  if (prev !== next) {
    document.dispatchEvent(new CustomEvent('battery-saver-changed', { detail: { active: next } }));
  }
}

/** 启动时恢复上次会话的省电模式状态（静默，无 Toast） */
export function restoreBatterySaverState() {
  let on = false;
  try { on = localStorage.getItem(BATTERY_SAVER_KEY) === '1'; } catch (e) { /* 忽略 */ }
  const tile = activeTiles.find((t) => t.id === 'battery_saver');
  if (tile) tile.active = on;
  document.body.classList.toggle('battery-saver-mode', on);
}

/** 程序化同步磁贴状态与副标题（focus.js 每秒倒计时用轻量 DOM patch，不重建监听） */
export function syncTileState(id, { active, sub } = {}) {
  const tile = activeTiles.find((t) => t.id === id);
  if (!tile) return;
  if (active !== undefined) tile.active = !!active;
  if (sub !== undefined) tile.sub = sub;
  const pill = document.querySelector('.qs-tile-pill[data-tile-id="' + id + '"]');
  if (pill) {
    pill.classList.toggle('active', !!tile.active);
    const subEl = pill.querySelector('.qs-tile-sub');
    if (subEl) subEl.textContent = tile.active ? (tile.sub || '已开启') : '已关闭';
  }
}

/** 弹出系统级悬浮 Toast 气泡（可选携带矢量图标） */
export function showSystemToast(msg, iconSvg) {
  let toast = document.getElementById('systemGlobalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'systemGlobalToast';
    toast.style.cssText = `
      position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: rgba(23, 29, 27, 0.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      color: #FFFFFF; font-size: 13px; font-weight: 500; padding: 10px 20px; border-radius: 24px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2); z-index: 10000; opacity: 0; pointer-events: none;
      transition: all 0.25s cubic-bezier(0.2, 0.9, 0.3, 1);
    `;
    document.body.appendChild(toast);
  }

  if (iconSvg) {
    toast.innerHTML = `<span class="toast-icon">${iconSvg}</span>`;
    const textSpan = document.createElement('span');
    textSpan.className = 'toast-text';
    textSpan.textContent = msg; // 动态文本走 textContent，杜绝注入
    toast.appendChild(textSpan);
  } else {
    toast.textContent = msg;
  }
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2200);
}

/** 初始化亮度与音量双滑块（共用同一套生命周期；拖拽中 rect 缓存 + 写入按帧合并） */
function initSliders() {
  // 1. 亮度滑块 (真实调节网页滤镜)
  const bPct = document.getElementById('qsBrightnessPct');
  if (document.getElementById('qsBrightnessIcon')) {
    document.getElementById('qsBrightnessIcon').innerHTML = ICONS.brightness;
  }
  makeSlider({
    bar: document.getElementById('qsBrightnessBar'),
    fill: document.getElementById('qsBrightnessFill'),
    pct: bPct,
    min: 15,
    onInput: (value) => {
      currentBrightness = value;
      // fix(audit-B): 实际调光手段是 body.filter（全库唯一消费链）；
      // --system-brightness CSS 变量无任何消费方，移除死写入
      const val = 0.35 + (value / 100) * 0.65;
      document.body.style.filter = `brightness(${val.toFixed(2)})`;
    },
  });

  // 2. 音量滑块 (真实联动底层 HTML5 <audio> 发声引擎)
  const vIcon = document.getElementById('qsVolumeIcon');
  if (vIcon) vIcon.innerHTML = ICONS.volume;
  let lastMutedIcon = null;
  makeSlider({
    bar: document.getElementById('qsVolumeBar'),
    fill: document.getElementById('qsVolumeFill'),
    pct: document.getElementById('qsVolumePct'),
    min: 0,
    onInput: (value) => {
      currentVolume = value;
      // 真实设置 HTML5 Audio 音量
      mediaService.setVolume(value / 100);
      // 静音图标只在跨越零点时切换（避免每帧重写 innerHTML）
      const muted = value === 0;
      if (vIcon && muted !== lastMutedIcon) {
        vIcon.innerHTML = muted ? ICONS.volume_mute : ICONS.volume;
        lastMutedIcon = muted;
      }
    },
  });
}

/**
 * 通用滑块生命周期：pointerdown 即时响应并缓存 rect（拖拽中滑块不动），
 * move 写入按帧合并，up/cancel 全量清理（pointercancel 不再泄漏 window 监听）。
 */
function makeSlider({ bar, fill, pct, min = 0, onInput }) {
  if (!bar || !fill) return;

  let rectCache = null;
  let rafId = 0;
  let pendingX = 0;

  const applyValue = (clientX) => {
    const rect = rectCache || bar.getBoundingClientRect();
    const value = Math.max(min, Math.min(100, Math.round(((clientX - rect.left) / Math.max(rect.width, 1)) * 100)));
    fill.style.width = `${value}%`;
    if (pct) pct.textContent = `${value}%`;
    onInput(value);
  };
  const scheduleValue = (clientX) => {
    pendingX = clientX;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      applyValue(pendingX);
    });
  };

  bar.addEventListener('pointerdown', (e) => {
    rectCache = bar.getBoundingClientRect();
    pendingX = e.clientX;
    bar.classList.add('is-dragging');
    applyValue(e.clientX);

    const onMove = (me) => scheduleValue(me.clientX);
    const finish = () => {
      bar.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      applyValue(pendingX);
      if (navigator.vibrate) navigator.vibrate(8);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  });
}

// ==================== v7.62 磁贴底部面板（内联面板：设备/网络/模式清单） ====================
// Android 16 QPR1 语义：Internet 磁贴点击永远弹内联面板（无直接开关）；
// 蓝牙/Modes 宽磁贴右侧子仓开启对应清单；飞行模式开启时移动数据开关禁用（禁用态手柄 X 标记）。

function ensureSheetDom() {
  let overlay = document.getElementById('qsSheetOverlay');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'qsSheetOverlay';
  overlay.className = 'qs-sheet-overlay';
  overlay.innerHTML = '<div class="qs-sheet" role="dialog" aria-modal="true"><div class="qs-sheet-title"></div><div class="qs-sheet-rows"></div></div>';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeQsSheet();
  });
  document.body.appendChild(overlay);
  return overlay;
}

export function openQsSheet(title, rows) {
  const overlay = ensureSheetDom();
  const titleEl = overlay.querySelector('.qs-sheet-title');
  const rowsEl = overlay.querySelector('.qs-sheet-rows');
  if (titleEl) titleEl.textContent = title || '';
  if (rowsEl) {
    rowsEl.innerHTML = '';
    (rows || []).forEach((row) => {
      const el = document.createElement('div');
      el.className = 'qs-sheet-row' + (row.dividerAbove ? ' divider-above' : '');
      const iconWrap = document.createElement('div');
      iconWrap.className = 'qs-sheet-row-icon';
      iconWrap.innerHTML = row.icon || '';
      el.appendChild(iconWrap);
      const text = document.createElement('div');
      text.className = 'qs-sheet-row-text';
      const t = document.createElement('span');
      t.className = 'qs-sheet-row-title';
      t.textContent = row.title || ''; // 动态文本走 textContent，杜绝注入
      text.appendChild(t);
      if (row.sub) {
        const s = document.createElement('span');
        s.className = 'qs-sheet-row-sub';
        s.textContent = row.sub;
        text.appendChild(s);
      }
      el.appendChild(text);
      if (row.trailing === 'check') {
        const c = document.createElement('span');
        c.className = 'qs-sheet-row-check';
        c.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5.2 5.2L20 6.8"/></svg>';
        el.appendChild(c);
      } else if (row.trailing === 'switch') {
        const label = document.createElement('label');
        label.className = 'md3-switch';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!row.checked;
        input.disabled = !!row.disabled; // 禁用态 → CSS 灰化 + 手柄 X 标记（Android 16 Beta 3）
        input.addEventListener('change', () => {
          if (row.onChange) row.onChange(input.checked);
        });
        const slider = document.createElement('span');
        slider.className = 'slider';
        const thumb = document.createElement('span');
        thumb.className = 'thumb';
        slider.appendChild(thumb);
        label.appendChild(input);
        label.appendChild(slider);
        el.appendChild(label);
      }
      if (row.onClick) {
        el.classList.add('clickable');
        el.addEventListener('click', (e) => {
          if (e.target.closest('.md3-switch')) return; // 开关行不触发行点击
          if (navigator.vibrate) navigator.vibrate(12);
          row.onClick();
        });
      }
      rowsEl.appendChild(el);
    });
  }
  requestAnimationFrame(() => overlay.classList.add('open'));
}

export function closeQsSheet() {
  const overlay = document.getElementById('qsSheetOverlay');
  if (overlay) overlay.classList.remove('open');
}

/** 网络内联面板：Wi-Fi 总开关（同磁贴旧逻辑单一真源 setWifiStatus）+ 可选网络 + 移动数据（飞行模式禁用） */
function openNetworkSheet() {
  const internetTile = activeTiles.find((t) => t.id === 'internet');
  const aeroplaneTile = activeTiles.find((t) => t.id === 'aeroplane');
  const wifiOn = internetTile ? !!internetTile.active : false;
  openQsSheet('网络与互联网', [
    {
      icon: ICONS.wifi, title: 'Wi-Fi', sub: wifiOn ? '已开启 · 中国移动 5G Wi-Fi' : '已关闭',
      trailing: 'switch', checked: wifiOn,
      onChange: (on) => {
        if (internetTile) internetTile.active = on;
        setWifiStatus(on);
        showSystemToast(on ? '已连接至中国移动 5G Wi-Fi' : '网络已断开连接', on ? ICONS.wifi : ICONS.wifi_off);
        refreshTilePill(internetTile || { id: 'internet' });
      },
    },
    { icon: ICONS.wifi, title: '中国移动 5G Wi-Fi', sub: wifiOn ? '已连接' : '范围内', trailing: wifiOn ? 'check' : null, onClick: () => { closeQsSheet(); showSystemToast('已连接至中国移动 5G Wi-Fi', ICONS.wifi); } },
    { icon: ICONS.wifi, title: 'CoffeeShop_Free', sub: '开放网络', onClick: () => showSystemToast('正在加入 CoffeeShop_Free …', ICONS.wifi) },
    { icon: ICONS.wifi, title: 'AndroidAP_5G', sub: '已保存（需验证）', onClick: () => showSystemToast('AndroidAP_5G 需要验证', ICONS.wifi), dividerAbove: true },
    {
      icon: ICONS.cellular, title: '移动数据', sub: (aeroplaneTile && aeroplaneTile.active) ? '飞行模式已开启，不可用' : '中国移动 5G',
      trailing: 'switch', checked: !(aeroplaneTile && aeroplaneTile.active), disabled: !!(aeroplaneTile && aeroplaneTile.active),
      onChange: (on) => showSystemToast(on ? '移动数据已开启' : '移动数据已关闭', ICONS.cellular),
    },
  ]);
}

/** 蓝牙已配对设备清单 */
function openBluetoothSheet() {
  openQsSheet('已配对设备', [
    { icon: ICONS.headphones, title: 'Pixel Buds Pro', sub: '已连接 · 电量 78%', trailing: 'check', onClick: () => showSystemToast('Pixel Buds Pro 已连接', ICONS.headphones) },
    { icon: ICONS.headphones, title: 'Pixel Buds A-Series', sub: '上次连接 · 昨天', onClick: () => showSystemToast('正在连接 Pixel Buds A-Series …', ICONS.headphones) },
    { icon: ICONS.watch || ICONS.person, title: 'Pixel Watch 4', sub: '可用', onClick: () => showSystemToast('正在配对 Pixel Watch 4 …', ICONS.watch || ICONS.person) },
    { icon: ICONS.bluetooth, title: '配对新设备', sub: '在设置中管理', onClick: () => showSystemToast('在「设置 → 已配对设备」中配对新设备', ICONS.bluetooth), dividerAbove: true },
  ]);
}

/** 模式清单：勿扰开关 + 场景模式 */
function openModesSheet() {
  const dndTile = activeTiles.find((t) => t.id === 'modes');
  openQsSheet('模式', [
    {
      icon: ICONS.modes, title: '勿扰', sub: dndTile && dndTile.active ? '已开启' : '已关闭',
      trailing: 'switch', checked: !!(dndTile && dndTile.active),
      onChange: (on) => setDndActive(on),
    },
    { icon: ICONS.driving || ICONS.cast, title: '驾驶模式', sub: '连接车载蓝牙时自动开启', onClick: () => showSystemToast('驾驶模式：已保存偏好', ICONS.cast) },
    { icon: ICONS.bedtime, title: '睡前模式', sub: '日落至日出静音', onClick: () => showSystemToast('睡前模式：已保存偏好', ICONS.bedtime) },
    { icon: ICONS.work || ICONS.person, title: '工作模式', sub: '仅显示工作应用与通知', onClick: () => showSystemToast('工作模式：已保存偏好', ICONS.person) },
  ]);
}

// ==================== 磁贴编辑界面 ====================

function initEditTilesView() {
  const backBtn = document.getElementById('editTilesBackBtn');
  const undoBtn = document.getElementById('editTilesUndoBtn');

  if (backBtn) {
    backBtn.innerHTML = ICONS.back;
    backBtn.addEventListener('click', closeEditTilesView);
  }
  if (undoBtn) {
    undoBtn.innerHTML = `${ICONS.undo} <span>Undo</span>`;
    undoBtn.addEventListener('click', undoEditTiles);
  }
}

export function openEditTilesView() {
  const view = document.getElementById('editTilesView');
  if (!view) return;
  editHistory = [];
  renderEditTilesLists();
  view.classList.add('open');
}

export function closeEditTilesView() {
  const view = document.getElementById('editTilesView');
  if (!view) return;
  view.classList.remove('open');
  renderQuickSettingsGrid();
}

function undoEditTiles() {
  if (editHistory.length === 0) return;
  const lastState = editHistory.pop();
  activeTiles = JSON.parse(JSON.stringify(lastState.activeTiles));
  availableCategories = JSON.parse(JSON.stringify(lastState.availableCategories));
  // v7.62：尺寸属于磁贴模型的一部分，撤销后同步尺寸表与持久层
  tileSizes = applyTileSizes(activeTiles, sizesFromTiles(activeTiles));
  saveTileSizes(tileSizes, typeof localStorage !== 'undefined' ? localStorage : null);
  renderEditTilesLists();
  if (navigator.vibrate) navigator.vibrate(25);
}

function saveEditHistory() {
  editHistory.push({
    activeTiles: JSON.parse(JSON.stringify(activeTiles)),
    availableCategories: JSON.parse(JSON.stringify(availableCategories)),
  });
}

function renderEditTilesLists() {
  const activeBox = document.getElementById('editActiveTilesGrid');
  if (activeBox) {
    activeBox.innerHTML = '';
    activeTiles.forEach((tile, index) => {
      // v7.62：编辑视图同样区分 1×1 圆瓷贴 / 2×1 宽药丸（真实 Android 16 编辑器同构）
      const isSmall = tile.size === QS_TILE_SIZES.SMALL;
      const el = document.createElement('div');
      el.className = `qs-tile-pill active ${isSmall ? 'size-small' : 'size-wide'}`;
      el.style.position = 'relative';
      const iconSvg = ICONS[tile.iconKey] || ICONS.settings;
      if (isSmall) {
        el.innerHTML = `<div class="qs-tile-icon-wrap">${iconSvg}</div><div class="edit-resize-handle edit-resize-handle-sm" data-handle-index="${index}" title="拖拽还原 2×1"><span class="edit-resize-grip"></span></div><div class="edit-badge-remove" data-index="${index}">−</div>`;
      } else {
        el.innerHTML = `
        <div class="qs-tile-icon-wrap">${iconSvg}</div>
        <div class="qs-tile-text">
          <span class="qs-tile-title">${tile.name}</span>
          <span class="qs-tile-sub">${tile.sub || ''}</span>
        </div>
        <div class="edit-resize-handle" data-handle-index="${index}" title="拖拽调整尺寸">
          <span class="edit-resize-grip"></span>
        </div>
        <div class="edit-badge-remove" data-index="${index}">−</div>
      `;
      }
      el.querySelector('.edit-badge-remove').addEventListener('click', (e) => {
        e.stopPropagation();
        saveEditHistory();
        const removed = activeTiles.splice(index, 1)[0];
        const fallbackCat = availableCategories[1] || availableCategories[0];
        if (fallbackCat) fallbackCat.tiles.push(removed);
        renderEditTilesLists();
      });
      // v7.62：尺寸拖拽手柄 —— 向左拖过阈值缩为 1×1，向右拖还原 2×1（阈值判定在 qs-tiles.js 纯函数）
      const handle = el.querySelector('.edit-resize-handle');
      if (handle) bindResizeHandle(handle, el, tile);
      activeBox.appendChild(el);
    });
  }

  const availableContainer = document.getElementById('editAvailableCategories');
  if (availableContainer) {
    availableContainer.innerHTML = '';
    availableCategories.forEach((cat) => {
      const catTitle = document.createElement('div');
      catTitle.className = 'edit-category-title';
      catTitle.textContent = cat.category;
      availableContainer.appendChild(catTitle);

      const grid = document.createElement('div');
      grid.className = 'qs-tiles-grid';

      cat.tiles.forEach((tile, tIdx) => {
        const el = document.createElement('div');
        el.className = 'qs-tile-pill';
        el.style.position = 'relative';
        const iconSvg = ICONS[tile.iconKey] || ICONS.settings;
        el.innerHTML = `
          <div class="qs-tile-icon-wrap">${iconSvg}</div>
          <div class="qs-tile-text">
            <span class="qs-tile-title">${tile.name}</span>
            <span class="qs-tile-sub">${tile.sub || ''}</span>
          </div>
          <div class="edit-badge-add" data-cat="${cat.category}" data-index="${tIdx}">+</div>
        `;
        el.querySelector('.edit-badge-add').addEventListener('click', (e) => {
          e.stopPropagation();
          saveEditHistory();
          const added = cat.tiles.splice(tIdx, 1)[0];
          added.active = true;
          added.size = QS_TILE_SIZES.WIDE; // v7.62：新加入磁贴默认出厂 2×1 尺寸
          activeTiles.push(added);
          renderEditTilesLists();
        });
        grid.appendChild(el);
      });

      availableContainer.appendChild(grid);
    });
  }

  // v7.62：Reset（Android 16：重置按钮位于编辑界面最末端）—— 恢复出厂磁贴布局与尺寸
  const oldReset = document.getElementById('editTilesResetRow');
  if (oldReset) oldReset.remove();
  if (availableContainer) {
    const resetRow = document.createElement('div');
    resetRow.className = 'edit-reset-row';
    resetRow.id = 'editTilesResetRow';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'edit-reset-btn';
    resetBtn.id = 'editTilesResetBtn';
    resetBtn.type = 'button';
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => {
      saveEditHistory();
      activeTiles = JSON.parse(JSON.stringify(DEFAULT_ACTIVE_TILES));
      availableCategories = JSON.parse(JSON.stringify(DEFAULT_AVAILABLE_CATEGORIES));
      tileSizes = applyTileSizes(activeTiles, {}); // 出厂全部 2×1
      saveTileSizes(tileSizes, typeof localStorage !== 'undefined' ? localStorage : null);
      renderEditTilesLists();
      if (navigator.vibrate) navigator.vibrate(25);
    });
    resetRow.appendChild(resetBtn);
    availableContainer.appendChild(resetRow);
  }
}

/** v7.62：尺寸手柄拖拽绑定（pointer 捕获 + 位移钳制预览 + 松手阈值判定） */
function bindResizeHandle(handle, tileEl, tile) {
  let startX = 0, dragging = false, dx = 0;
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    startX = e.clientX;
    dx = 0;
    try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    tileEl.classList.add('resize-preview');
  });
  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dx = clampPreviewDx(e.clientX - startX);
    tileEl.style.transform = dx ? `translateX(${dx}px)` : '';
    // 越阈预告：将缩小时轻透 + 将放大时微亮，与真实系统反馈一致
    const r = resizeFromDrag(tile.size, dx);
    tileEl.classList.toggle('would-change', r.changed);
  });
  const finish = () => {
    if (!dragging) return;
    dragging = false;
    tileEl.classList.remove('resize-preview', 'would-change');
    tileEl.style.transform = '';
    const r = resizeFromDrag(tile.size, dx);
    if (r.changed) {
      saveEditHistory();
      tile.size = r.size;
      tileSizes = setTileSize(tileSizes, tile.id, r.size);
      saveTileSizes(tileSizes, typeof localStorage !== 'undefined' ? localStorage : null);
      if (navigator.vibrate) navigator.vibrate(18);
    }
    renderEditTilesLists(); // 重建以切换 1×1/2×1 结构
  };
  handle.addEventListener('pointerup', finish);
  handle.addEventListener('pointercancel', finish);
}

// ==================== 电源对话框 ====================

function initPowerDialog() {
  const overlay = document.getElementById('powerDialogOverlay');
  if (!overlay) return;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closePowerDialog();
  });

  const restartBtn = document.getElementById('powerRestartBtn');
  const shutdownBtn = document.getElementById('powerShutdownBtn');
  const emergencyBtn = document.getElementById('powerEmergencyBtn');

  if (shutdownBtn) {
    shutdownBtn.innerHTML = `${ICONS.power}<span>关机</span>`;
    shutdownBtn.addEventListener('click', () => {
      closePowerDialog();
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.6s ease';
      setTimeout(() => {
        document.body.innerHTML = '<div style="display:flex;height:100vh;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;font-size:18px;">已关机 (点击屏幕重启)</div>';
        document.body.style.opacity = '1';
        document.body.onclick = () => location.reload();
      }, 600);
    });
  }

  if (restartBtn) {
    restartBtn.innerHTML = `${ICONS.restart}<span>重启</span>`;
    restartBtn.addEventListener('click', () => {
      closePowerDialog();
      location.reload();
    });
  }

  if (emergencyBtn) {
    emergencyBtn.innerHTML = `${ICONS.emergency}<span>紧急呼叫</span>`;
    emergencyBtn.addEventListener('click', () => {
      closePowerDialog();
      showSystemToast('正在拨打紧急电话 110/120/119...', ICONS.call);
    });
  }
}

export function openPowerDialog() {
  const overlay = document.getElementById('powerDialogOverlay');
  if (overlay) overlay.classList.add('active');
}

export function closePowerDialog() {
  const overlay = document.getElementById('powerDialogOverlay');
  if (overlay) overlay.classList.remove('active');
}
