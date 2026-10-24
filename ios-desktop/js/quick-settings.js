// ==================== quick-settings.js — Android 16 / Pixel 10 MD3 系统级快速控制中心 ====================

import { state } from './state.js';
import { dom } from './dom.js';
import { openApp } from './app-window.js';
import { initialApps } from './apps-data.js';
import { ICONS } from './icons.js';
import { setWifiStatus } from './status-bar.js';
import { mediaService } from './media-service.js';
// v7.89 remedia 波浪进度条（Media.kt SeekBarTrack 移植版，AOSP 同源）
import { createMediaWave } from './aosp/media-wave.js';
import { closePullPanels } from './pull-down-gesture.js';
import { lockNow } from './lock-screen.js';
import { getResolvedTheme, setThemeMode } from './theme-mode.js';
import { playSfx } from './sound-haptics.js';
// v7.62：Android 16 QPR1 可调磁贴尺寸（1×1 圆瓷贴 ↔ 2×1 宽药丸）纯函数内核
import { QS_TILE_SIZES, loadTileSizes, saveTileSizes, applyTileSizes, sizesFromTiles, setTileSize, resizeFromDrag, clampPreviewDx } from './qs-tiles.js';

// 初始默认已激活磁贴
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
// v7.88：音量状态移交 volume-dialog.js（音量唯一场景 = 音量键对话框，
// QuickSettingsShadeOverlay.kt 无音量滑块）
// fix(audit-B): 移除 isRecordingScreen 死变量（原声明于此，全库无读写；
// 录制真源以 #statusRecIndicator 指示器在场为准）
let recordTimerInterval = null;

/** 初始化快速设置面板内容与事件 */
export function initQuickSettings() {
  restoreBatterySaverState();
  renderQuickSettingsGrid();
  initSliders();
  initQsMediaCard();
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
      openPowerDialog(powerBtn);
    });
  }
}

/** 注入头部矢量图标 */
function initHeaderIcons() {
  document.querySelectorAll('.panel-carrier-icon').forEach(el => {
    el.innerHTML = ICONS.cellular;
  });
}

/** 渲染快速设置磁贴网格 (纯矢量 SVG 图标；v7.79 对齐 1080P 逐帧实锤)
 *  v7.84 统一 Shade 双容器：#qsTilesContainer = QS 场景全量 infinite grid；
 *  #qqsTilesContainer = QQS 大磁贴（源码 DefaultLargeTilesRepository：internet/bt/dnd/cast
 *  各 span2 → 2×2，QuickQuickSettingsRowInteractor.defaultRows=2） */
export function renderQuickSettingsGrid() {
  const container = document.getElementById('qsTilesContainer');
  const qqsContainer = document.getElementById('qqsTilesContainer');
  if (!container) return;

  container.innerHTML = '';
  if (qqsContainer) qqsContainer.innerHTML = '';

  // QQS 磁贴集合：出厂大磁贴集合（源码默认 internet/bt/dnd/cast）中处于激活磁贴列表者，前 4
  const qqsTiles = activeTiles
    .filter((t) => (t.size || FACTORY_TILE_SIZES[t.id]) === QS_TILE_SIZES.WIDE)
    .slice(0, 4);

  activeTiles.forEach((tile) => {
    // 深色模式磁贴：开关状态实时跟随解析后的实际外观（自动档跟随系统）
    const tileActive = tile.id === 'darktheme' ? getResolvedTheme() === 'dark' : tile.active;
    const isSmall = tile.size === QS_TILE_SIZES.SMALL;
    const pill = document.createElement('div');
    pill.className = `qs-tile-pill ${isSmall ? 'size-small' : 'size-wide'} ${tileActive ? 'active' : ''}`;
    pill.dataset.tileId = tile.id;

    // v7.79 矢量图修正：蓝牙激活态带连接侧点（v2 ROSE Ceramics 特写实锤 bluetooth_connected）
    const iconKey = (tile.id === 'bluetooth' && tileActive && ICONS.bluetooth_connected)
      ? 'bluetooth_connected'
      : tile.iconKey;
    const iconSvg = ICONS[iconKey] || ICONS.settings;

    const iconHtml = `<div class="qs-tile-icon-wrap">${iconSvg}</div>`;

    if (isSmall) {
      // 1×1 横卧圆角矩形：纯图标居中（v2 QR/旋转同构；v7.80 实测非胶囊，圆角率同宽磁贴）
      pill.innerHTML = iconHtml;
    } else {
      pill.innerHTML = `
      ${iconHtml}
      <div class="qs-tile-text">
        <span class="qs-tile-title">${tile.name}</span>
        <span class="qs-tile-sub">${tileActive ? (tile.sub || '已开启') : '已关闭'}</span>
      </div>
    `;
    }

    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      tile._sourceRect = pill.getBoundingClientRect(); // 记录磁贴位置，应用从磁贴处起飞
      // 锁屏磁贴：动作型磁贴，不切换开关状态，直接锁屏
      if (tile.id === 'lock_screen') {
        if (navigator.vibrate) navigator.vibrate(20);
        playSfx('tick');
        closePullPanels();
        setTimeout(() => lockNow(), 120);
        return;
      }
      // v7.79 连接类磁贴（Internet/蓝牙/模式）对齐 AOSP 16 语义：点击永远弹内联面板，
      // 开关在面板内（1080P 实锤：蓝牙/模式磁贴无右侧子仓，点击整块即面板）
      if (tile.id === 'internet') {
        if (navigator.vibrate) navigator.vibrate(15);
        openNetworkSheet(pill);
        return;
      }
      if (tile.id === 'bluetooth') {
        if (navigator.vibrate) navigator.vibrate(15);
        openBluetoothSheet(pill);
        return;
      }
      if (tile.id === 'modes') {
        if (navigator.vibrate) navigator.vibrate(15);
        openModesSheet(pill);
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
      // v7.82 源码重做：状态切换动画 = 圆角/颜色同步 spring（CSS transition 承担），
      // 无 JS 侧形变驱动 —— refreshTilePill 切 .active 类即播（源码 animate*AsState 同语义）
      refreshTilePill(tile);
      handleTileAction(tile);
    });

    // v7.79：1×1 蓝牙圆瓷贴长按（480ms）开启已配对设备 —— 与真实 Android 16 同手势
    if (isSmall && tile.id === 'bluetooth') {
      let lpTimer = 0, lpStart = null;
      pill.addEventListener('pointerdown', (e) => {
        lpStart = { x: e.clientX, y: e.clientY };
        clearTimeout(lpTimer);
        lpTimer = setTimeout(() => { lpTimer = 0; if (navigator.vibrate) navigator.vibrate(18); openBluetoothSheet(pill); }, 480);
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

    // v7.84 QQS 双份渲染：同一磁贴在 QQS 区的克隆（点击行为一致——克隆体挂同一 handler 集）
    if (qqsContainer && qqsTiles.includes(tile)) {
      const clone = pill.cloneNode(true);
      clone.addEventListener('click', (e) => {
        e.stopPropagation();
        // 克隆体点击 → 委托主网格对应磁贴执行同一逻辑（保持单一事件源）
        const primary = container.querySelector(`.qs-tile-pill[data-tile-id="${tile.id}"]`);
        if (primary) primary.click();
      });
      qqsContainer.appendChild(clone);
    }
  });
}

// ==================== v7.82 两态动画（AOSP 源码重做版） ====================
//
// 源码真身（android17-release 94b4c163）：Tile.kt / CommonTile.kt ——
// 磁贴状态切换 = animateDpAsState(圆角 50dp↔24dp) + animateColorAsState(底色)
// 同步 spring(DampingRatioNoBouncy=1.0, StiffnessMediumLow=400)：临界阻尼无过冲，
// 无 scale blob、无图标底座分通道重播。web 落地：
//   · 圆角/颜色 → CSS transition 320ms cubic-bezier(0.2,0,0,1)
//     （Material standard 曲线 = 该弹簧归一化形，1% 落定 ≈ 332ms）
//   · 开关路径只需切换 .active 类，动画完全由 CSS 承担（旧 JS 侧形变补播体系
//     随 blob keyframes 一并移除，标识符不再存在）
//   · 面板拖拽期磁贴高度 squish（0.1+0.9×expansion）由 pull-down-gesture.js 驱动
//     --qs-squish 实现（对齐源码 verticalSquish 布局缩放语义）

/** 单磁贴增量刷新：开关切换只改目标磁贴类名/副标题/图标，不再整组 innerHTML 重建（消除闪烁源头） */
function refreshTilePill(tile) {
  // v7.84 统一 Shade 双容器：QQS（#qqsTilesContainer 前 4 大磁贴）+ QS 全量网格
  // 同一磁贴两份 DOM，增量刷新遍历全部命中节点（querySelectorAll）
  const main = document.getElementById('qsTilesContainer');
  const qqs = document.getElementById('qqsTilesContainer');
  let pills = [
    ...(main ? main.querySelectorAll(`.qs-tile-pill[data-tile-id="${tile.id}"]`) : []),
    ...(qqs ? qqs.querySelectorAll(`.qs-tile-pill[data-tile-id="${tile.id}"]`) : []),
  ];
  if (pills.length === 0) {
    renderQuickSettingsGrid();
    pills = [
      ...(main ? main.querySelectorAll(`.qs-tile-pill[data-tile-id="${tile.id}"]`) : []),
      ...(qqs ? qqs.querySelectorAll(`.qs-tile-pill[data-tile-id="${tile.id}"]`) : []),
    ];
    if (pills.length === 0) return;
  }
  // 深色模式磁贴：开关状态实时跟随解析后的实际外观（与全量渲染同一口径）
  const tileActive = tile.id === 'darktheme' ? getResolvedTheme() === 'dark' : tile.active;
  // 尺寸类与当前模型不一致（编辑视图改尺寸后回主面板增量同步）→ 全量重建一次
  const wantSmall = tile.size === QS_TILE_SIZES.SMALL;
  const hasSmall = pills.some((p) => p.classList.contains('size-small'));
  if ((wantSmall && !hasSmall) || (!wantSmall && pills.some((p) => p.classList.contains('size-small')))) {
    renderQuickSettingsGrid();
    return;
  }
  // v7.82：状态切换动画 = CSS spring transition（.active 类驱动），无 JS 侧补播
  // v7.79 矢量图修正：蓝牙激活态图标带连接侧点（增量路径与全量渲染同口径）
  pills.forEach((pill) => {
    pill.classList.toggle('active', tileActive);
    if (tile.id === 'bluetooth') {
      const wrap = pill.querySelector('.qs-tile-icon-wrap');
      const iconKey = (tileActive && ICONS.bluetooth_connected) ? 'bluetooth_connected' : tile.iconKey;
      if (wrap && iconKey) wrap.innerHTML = ICONS[iconKey] || wrap.innerHTML;
    }
    const sub = pill.querySelector('.qs-tile-sub');
    if (sub) sub.textContent = tileActive ? (tile.sub || '已开启') : '已关闭';
  });
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
  /* v7.85 加号脉冲：AOSP qs_battery_saver_icon_on/off 的 pathData morph（200ms ease_out）
     折中为图标整体 pop（scale 1→1.14→1），方向随开/关一致 */
  if (prev !== next) {
    const pill = document.querySelector('.qs-tile-pill[data-tile-id="battery_saver"] svg');
    if (pill) {
      pill.classList.remove('bs-pop');
      void pill.getBoundingClientRect();
      pill.classList.add('bs-pop');
    }
  }
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

/**
 * v7.87 QS 滑条 —— AOSP 源码 1:1 移植（替代 v7.79 M3E 分段竖柄融合方案）。
 *
 * 亮度 = PlatformSlider（compose/core/src/com/android/compose/PlatformSlider.kt +
 * brightness/ui/compose/BrightnessSlider.kt，BrightnessSliderHeight=64dp）：
 * 值由 --v（0-100）驱动，填充宽 = 64px 图标区 + (W-64px)·v%（TrackMeasurePolicy 同构，
 * 0% 时填充仍覆盖图标区）；拖拽中 is-dragging 触发填充右角 32→8dp
 * （DefaultPlatformSliderDraggingCornerRadius=8dp），且图标位切换 formatter "$it%" 文本；
 * label 骑填充沿（isLabelOnTopOfIndicator：被覆盖时驻图标右侧 64px，
 * 否则位于填充沿 + 16dp）。静态图标 ic_brightness_full（VM.icon 无等级切换）。
 *
 * 音量 = Material3 Slider 竖置（res/layout/volume_dialog_slider.xml，52×254dp）：
 * 同一 --v 变量经 CSS calc 驱动填充（250·t-6）/ 横柄（行程 [2,252]）/ 流图标
 * （trackIconActiveEnd）三要素；图标 ic_volume_media / 静音 ic_volume_media_mute
 * （VolumeDialogSliderIconProvider STREAM_MUSIC 映射），点击图标静音切换
 * （legacy VolumeDialogImpl row.icon 同语义）。
 *
 * 共用指针管线：pointerdown 即时响应并缓存 rect，move 写入按帧合并，
 * up/cancel 全量清理，aria-valuenow 同步供无障碍读取。
 */
function initBrightnessSlider() {
  const bar = document.getElementById('qsBrightnessBar');
  const icon = document.getElementById('qsBrightnessIcon');
  const label = document.getElementById('qsBrightnessLabel');
  if (!bar) return;

  let rectCache = null;
  let rafId = 0;
  let pendingX = 0;
  let value = currentBrightness;

  const restoreIcon = () => { if (icon) icon.innerHTML = ICONS.brightness; };

  /** label 位置与配色（LabelIconSpacingAnimation 同构） */
  const syncLabel = () => {
    if (!label) return;
    const rect = rectCache || bar.getBoundingClientRect();
    if (rect.width <= 0) return;
    const fillW = 64 + (rect.width - 64) * (value / 100);
    // isLabelOnTopOfIndicator = labelWidth < indicatorRight - iconWidth
    const covered = fillW - 64 > label.offsetWidth;
    label.style.left = `${Math.round(covered ? 64 : fillW + 16)}px`;
    label.classList.toggle('on-track', !covered);
  };

  const applyValue = (clientX) => {
    const rect = rectCache || bar.getBoundingClientRect();
    value = Math.max(15, Math.min(100, Math.round(((clientX - rect.left) / Math.max(rect.width, 1)) * 100)));
    bar.style.setProperty('--v', String(value));
    bar.setAttribute('aria-valuenow', String(value));
    currentBrightness = value;
    // fix(audit-B): 实际调光手段是 body.filter（全库唯一消费链）
    const val = 0.35 + (value / 100) * 0.65;
    document.body.style.filter = `brightness(${val.toFixed(2)})`;
    if (icon && bar.classList.contains('is-dragging')) {
      icon.innerHTML = `<span class="qs-bs-value">${value}%</span>`;
    }
    syncLabel();
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
      restoreIcon(); // 图标位还原：拖拽百分比 → ic_brightness_full
      if (navigator.vibrate) navigator.vibrate(8);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  });

  restoreIcon();
  bar.style.setProperty('--v', String(currentBrightness));
  syncLabel();
  // 面板宽度变化时骑沿位置重算（rectCache 失效）
  window.addEventListener('resize', () => { rectCache = null; syncLabel(); });
}

/** 初始化亮度滑条（v7.88：QS 面板仅亮度——AOSP QuickSettingsShadeOverlay 无音量滑块） */
function initSliders() {
  initBrightnessSlider();
}

/**
 * v7.79 QS 媒体卡（v2@53s 1080P 实锤：磁贴下方全宽大圆角卡）。
 * mediaService 单一真源订阅：播放中展开，停止折叠；封面渐变/曲名/进度/播放钮全联动。
 */
function initQsMediaCard() {
  const card = document.getElementById('qsMediaCard');
  if (!card) return;
  const titleEl = document.getElementById('qsMediaTitle');
  const artistEl = document.getElementById('qsMediaArtist');
  const coverEl = document.getElementById('qsMediaCover');
  const playBtn = document.getElementById('qsMediaPlayBtn');
  const barEl = document.getElementById('qsMediaProgress');
  const trackEl = document.getElementById('qsMediaProgressTrack');

  // v7.89 remedia 波浪进度条接管轨道（Media.kt SeekBarTrack）；旧填充条退役隐藏
  let qsWave = null;
  if (trackEl) {
    if (barEl) barEl.style.display = 'none';
    trackEl.style.overflow = 'visible'; // 振幅 ±3px 越出 4px 容器（expressive 有机形态）
    trackEl.style.background = 'transparent'; // inactive 平线由波浪自绘（White@30%）
    qsWave = createMediaWave(trackEl);
  }

  mediaService.subscribe((state) => {
    if (!state || !state.track) return;
    const hasMedia = !!state.track && !state.track.isExternal ? true : !!state.track;
    card.classList.toggle('media-hidden', !state.isPlaying && state.progress <= 0);
    if (state.track.coverGradient) card.style.background = state.track.coverGradient;
    if (coverEl) coverEl.innerHTML = ICONS.music_note || ICONS.library_music || ICONS.headphones;
    if (titleEl) titleEl.textContent = state.track.title || '';
    if (artistEl) artistEl.textContent = `${state.track.artist || ''}${state.track.album ? ' • ' + state.track.album : ''}`;
    if (qsWave) {
      qsWave.setProgress((state.progress || 0) / 100);
      qsWave.setPlaying(!!state.isPlaying);
    } else if (barEl) {
      barEl.style.width = `${(state.progress || 0).toFixed(1)}%`;
    }
    if (playBtn) playBtn.innerHTML = state.isPlaying ? ICONS.pause : ICONS.play;
    if (hasMedia && state.isPlaying) card.classList.add('media-playing');
    else card.classList.remove('media-playing');
  });

  if (playBtn) {
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mediaService.togglePlay();
    });
  }
  if (trackEl) {
    trackEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const rect = trackEl.getBoundingClientRect();
      mediaService.seek(((e.clientX - rect.left) / Math.max(rect.width, 1)) * 100);
    });
  }
  card.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.qs-media-progress')) return;
    closePullPanels();
    const idx = initialApps.findIndex(a => a.id === 'music');
    if (idx !== -1) openApp(idx, null, card.getBoundingClientRect());
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
  // v7.78：内容包一层 .qs-sheet-body —— 容器变换期间以反向缩放对冲面板缩放，内容 1:1 不变形
  overlay.innerHTML = '<div class="qs-sheet" role="dialog" aria-modal="true"><div class="qs-sheet-body"><div class="qs-sheet-title"></div><div class="qs-sheet-rows"></div></div></div>';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeQsSheet();
  });
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * v7.78 容器变换面板（AOSP 16/17 语义：面板从源磁贴矩形原地扩张，关闭时收缩回磁贴；
 * 替代旧「自底部整体上滑」底部菜单）。sourceEl 为触发磁贴/子仓元素，
 * JS 将源→终态的位移+缩放写入 CSS 变量 --qs-tf-src，open 后由 CSS 过渡到 none；
 * 内容层 .qs-sheet-body 同步反向缩放对冲（见 pull-panels.css）。
 * @param {string} title
 * @param {Array} rows
 * @param {HTMLElement} [sourceEl] 触发面板的磁贴元素（FLIP 依据）
 */
export function openQsSheet(title, rows, sourceEl) {
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
  // v7.78 容器变换：内容建完后再测量终态矩形（overlay 处于关闭态、无 transform），
  // 由源磁贴矩形反解初始 transform；无源（程序化）或零矩形（happy-dom 等无布局环境）退化为纯淡入。
  const sheet = overlay.querySelector('.qs-sheet');
  const body = overlay.querySelector('.qs-sheet-body');
  const src = sourceEl && typeof sourceEl.getBoundingClientRect === 'function' ? sourceEl.getBoundingClientRect() : null;
  overlay.classList.remove('open');
  let playedTransform = false;
  if (sheet && src && src.width > 0 && src.height > 0) {
    const dst = sheet.getBoundingClientRect();
    if (dst.width > 0 && dst.height > 0) {
      const sx = Math.max(src.width / dst.width, 0.05);
      const sy = Math.max(src.height / dst.height, 0.03);
      const dx = src.left + src.width / 2 - (dst.left + dst.width / 2);
      const dy = src.top + src.height / 2 - (dst.top + dst.height / 2);
      const tf = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      sheet.style.setProperty('--qs-tf-src', tf);
      if (body) body.style.setProperty('--qs-tf-body-src', `scale(${(1 / sx).toFixed(4)}, ${(1 / sy).toFixed(4)})`);
      // v7.80 容器变换改走 WAAPI（确定性播放）：CSS transition 依赖"前次已计算样式"，
      // 源态变量与 .open 同帧结算时（rAF 先于绘制）浏览器拿不到起始态 → 过渡被吞、
      // 面板瞬移（探针实测：computed transform 恒 none、getAnimations 中途清零）。
      // WAAPI 显式给起止关键帧必播；终态仍由 .open 的 CSS 承接，播完视觉零差。
      const reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
      if (!reduced && typeof sheet.animate === 'function') {
        overlay.classList.add('open');
        const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
        sheet.animate([{ transform: tf }, { transform: 'none' }], { duration: 360, easing: EASE });
        if (body) body.animate([{ transform: `scale(${(1 / sx).toFixed(4)}, ${(1 / sy).toFixed(4)})` }, { transform: 'none' }], { duration: 360, easing: EASE });
        overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: EASE });
        playedTransform = true;
      }
    }
  }
  if (!playedTransform) {
    if (sheet) sheet.style.removeProperty('--qs-tf-src');
    if (body) body.style.removeProperty('--qs-tf-body-src');
    requestAnimationFrame(() => overlay.classList.add('open'));
  }
}

export function closeQsSheet() {
  const overlay = document.getElementById('qsSheetOverlay');
  if (!overlay) return;
  const sheet = overlay.querySelector('.qs-sheet');
  const body = overlay.querySelector('.qs-sheet-body');
  // v7.80 收缩回磁贴同样走 WAAPI（与展开对称；CSS transition 同样存在同帧吞过渡风险）
  const tf = sheet ? sheet.style.getPropertyValue('--qs-tf-src') : '';
  const tfBody = body ? body.style.getPropertyValue('--qs-tf-body-src') : '';
  const reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();
  if (tf && !reduced && sheet && typeof sheet.animate === 'function' && overlay.classList.contains('open')) {
    const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
    sheet.animate([{ transform: 'none' }, { transform: tf }], { duration: 280, easing: EASE });
    if (body && tfBody) body.animate([{ transform: 'none' }, { transform: tfBody }], { duration: 280, easing: EASE });
  }
  overlay.classList.remove('open');
}

/** 网络内联面板：Wi-Fi 总开关（同磁贴旧逻辑单一真源 setWifiStatus）+ 可选网络 + 移动数据（飞行模式禁用） */
function openNetworkSheet(sourceEl) {
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
  ], sourceEl);
}

/** 已配对设备清单（v7.79：顶部带蓝牙总开关 —— 磁贴点击即面板后开关功能迁入面板） */
function openBluetoothSheet(sourceEl) {
  const btTile = activeTiles.find((t) => t.id === 'bluetooth');
  const btOn = btTile ? !!btTile.active : false;
  openQsSheet('已配对设备', [
    {
      icon: ICONS.bluetooth, title: '蓝牙', sub: btOn ? '已开启' : '已关闭',
      trailing: 'switch', checked: btOn,
      onChange: (on) => {
        if (btTile) btTile.active = on;
        refreshTilePill(btTile || { id: 'bluetooth' });
        showSystemToast(on ? '蓝牙已开启，已连接 Pixel Buds Pro' : '蓝牙已关闭', on ? ICONS.bluetooth_connected || ICONS.headphones : ICONS.block);
      },
    },
    { icon: ICONS.headphones, title: 'Pixel Buds Pro', sub: '已连接 · 电量 78%', trailing: 'check', onClick: () => showSystemToast('Pixel Buds Pro 已连接', ICONS.headphones) },
    { icon: ICONS.headphones, title: 'Pixel Buds A-Series', sub: '上次连接 · 昨天', onClick: () => showSystemToast('正在连接 Pixel Buds A-Series …', ICONS.headphones) },
    { icon: ICONS.watch || ICONS.person, title: 'Pixel Watch 4', sub: '可用', onClick: () => showSystemToast('正在配对 Pixel Watch 4 …', ICONS.watch || ICONS.person) },
    { icon: ICONS.bluetooth, title: '配对新设备', sub: '在设置中管理', onClick: () => showSystemToast('在「设置 → 已配对设备」中配对新设备', ICONS.bluetooth), dividerAbove: true },
  ], sourceEl);
}

/** 模式清单：勿扰开关 + 场景模式 */
function openModesSheet(sourceEl) {
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
  ], sourceEl);
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
      // v7.79：编辑器磁贴统一宽磁贴结构（图标+文字，v2/v3 1080P 实锤编辑器为双列清单）
      const isSmall = tile.size === QS_TILE_SIZES.SMALL;
      const el = document.createElement('div');
      el.className = `qs-tile-pill active size-wide ${isSmall ? 'is-small-in-editor' : ''}`;
      el.style.position = 'relative';
      const iconSvg = ICONS[tile.iconKey] || ICONS.settings;
      el.innerHTML = `
        <div class="qs-tile-icon-wrap">${iconSvg}</div>
        <div class="qs-tile-text">
          <span class="qs-tile-title">${tile.name}</span>
          <span class="qs-tile-sub">${isSmall ? '1×1 · 点击拖拽手柄还原' : (tile.sub || '')}</span>
        </div>
        <div class="edit-resize-handle" data-handle-index="${index}" title="拖拽调整尺寸">
          <span class="edit-resize-grip"></span>
        </div>
        <div class="edit-badge-remove" data-index="${index}">−</div>
      `;
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
          added.size = QS_TILE_SIZES.SMALL; // Android 16 QPR1：新加入磁贴默认 1×1（9to5Google 实测）
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
      tileSizes = applyTileSizes(activeTiles, {}); // 出厂布局：Internet/Bluetooth/Modes 2×1，其余 1×1（FACTORY_TILE_SIZES）
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

export function openPowerDialog(sourceBtn) {
  const overlay = document.getElementById('powerDialogOverlay');
  if (!overlay) return;
  /* v7.85 容器变换：菜单从电源按钮位置放大到屏幕中央（用户指令实锤）。
     卡片初始 transform = translate(按钮中心-卡片中心) scale(0.35)，
     打开后过渡到 translate(0,0) scale(1)，反向关闭同理。 */
  const card = overlay.querySelector('.power-dialog-card');
  const btn = sourceBtn || document.getElementById('qsPowerBtn');
  if (card && btn) {
    const br = btn.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    if (br.width > 0 && cr.width > 0) {
      const ox = br.left + br.width / 2 - (cr.left + cr.width / 2);
      const oy = br.top + br.height / 2 - (cr.top + cr.height / 2);
      card.style.setProperty('--pw-ox', `${Math.round(ox)}px`);
      card.style.setProperty('--pw-oy', `${Math.round(oy)}px`);
    }
  }
  overlay.classList.add('active');
}

export function closePowerDialog() {
  const overlay = document.getElementById('powerDialogOverlay');
  if (overlay) overlay.classList.remove('active');
}
