// ==================== quick-settings.js — Android 16 / Pixel 10 MD3 系统级快速控制中心 ====================

import { state } from './state.js';
import { isReduceMotionActive } from './aosp/a11y-settings.js';
import { dom } from './dom.js';
import { openApp } from './app-window.js';
import { initialApps } from './apps-data.js';
import { ICONS } from './icons.js';
import { setSwitchChecked } from './m3-controls.js'; // #70：程序化开关真值统一入口
import { setWifiStatus } from './status-bar.js';
import { mediaService } from './media-service.js';
// v7.89 remedia 波浪进度条（Media.kt SeekBarTrack 移植版，AOSP 同源）
import { createMediaWave } from './aosp/media-wave.js';
import { PathInterpolatorCubic } from './aosp/expressive-ripple.js'; // v8.14 #39：U+ 时序 bezier 解析（预采样关键帧）
import { closePullPanels } from './pull-down-gesture.js';
import { lockNow } from './lock-screen.js';
import { aodPowerOff } from './aod-ui.js'; // v9.94 #35：熄屏入口（AOD 开→常显覆盖层；关→沿用 lockNow）
// v9.94 #111：组合键 dispatcher 复用（电源键长按窗常量 + 路由器）
import { createKeyDispatcher, POWER_LONG_PRESS_MS } from './aosp/key-dispatcher.js';
// v9.94 #113：GlobalActionsDialog 纯逻辑层（动作注册表/二次确认机/关机阶段机）
import { GA_ACTIONS, GA_HAPTIC_MS, createConfirmMachine, createShutdownStage, resolveVisibleActions } from './aosp/global-actions.js';
// v10.45 #114：浮层触摸语义公约（GA_CLOSE_TAP_OUTSIDE 同构——面板外 down 拍单击即整窗收起）
import { OutsideMode, createOutsideDismissMachine, declareTouchableRegions, isInsideTouchable } from './aosp/overlay-touch-policy.js';
import { getResolvedTheme, setThemeMode } from './theme-mode.js';
import { playSfx } from './sound-haptics.js';
// v7.62：Android 16 QPR1 可调磁贴尺寸（1×1 圆瓷贴 ↔ 2×1 宽药丸）纯函数内核
import { QS_TILE_SIZES, loadTileSizes, saveTileSizes, applyTileSizes, sizesFromTiles, setTileSize, resizeFromDrag, clampPreviewDx, QS_TILE_ORDER_KEY, loadTileOrder, saveTileOrder, applyTileOrder, reorderTiles } from './qs-tiles.js';
// v9.94 #198 ZenMode 全规格：磁贴 manualRule 直控 + ZenDeviceEffects overlay + ScheduleCalendar 规则每分钟 eval
import {
  zenStore, isZenActive, deviceEffectsOverlayStyle, ZEN_DEVICE_EFFECT,
} from './aosp/zen-mode.js';
// v9.94 #201 QSTileImpl 三通道状态机：三态常量 / 环境约束派生 / 误触守卫 / 长按语义位
import {
  TILE_STATE, TILE_LONG_CLICK_INTENTS, FALSE_LONG_TAP_MIN_MS,
  deriveTileState, tileConstraintReason, isFalseTap,
} from './aosp/qs-tile-state.js';
// v9.94 #202 QSTileViewImpl 五通道状态派生：色彩合流 + 交互派生 + CSS 出口
import {
  getTileViewColors, getTileViewInteractivity, colorIntToCss, argb,
} from './aosp/qs-tile-view.js';
// v9.94 #203 PagedTileLayout 分页布局：容量公式（maxTiles）/ distributeTiles 重分配 /
// PageIndicator 浮点联动 / LEFT/RIGHT 方向翻页 / mPageToRestore 恢复页
import {
  QS_PAGE_COLUMNS, QS_PAGE_ROWS, PAGE_SCROLL_DIRECTION,
  distributeTiles, pageIndicatorState, stepPage, resolveRestorePage,
} from './aosp/qs-paged-layout.js';

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
      { id: 'all_apps', name: 'All apps', sub: '应用抽屉', iconKey: 'apps_grid' },
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
// v9.94 #201：环境依赖磁贴清单（refreshState 广播目标——飞行模式→射频链路四贴；
// 省电模式→torch 受管 disabledByPolicy 通道）
const ENV_DEPENDENT_TILES = ['cast', 'quick_share', 'vpn', 'internet', 'torch'];
// v9.94 #201 长按目的地表（getLongClickIntent 逐磁贴声明同构，目的地实体见 TILE_LONG_CLICK_INTENTS）
const TILE_LONG_CLICK_SHEET = {
  internet: (el) => openNetworkSheet(el),
  bluetooth: (el) => openBluetoothSheet(el),
  modes: (el) => openModesSheet(el),
};

let currentBrightness = 80;
// v7.88：音量状态移交 volume-dialog.js（音量唯一场景 = 音量键对话框，
// QuickSettingsShadeOverlay.kt 无音量滑块）
// fix(audit-B): 移除 isRecordingScreen 死变量（原声明于此，全库无读写；
// 录制真源以 #statusRecIndicator 指示器在场为准）
let recordTimerInterval = null;

/** v9.94 #201：全局环境快照（tileConstraintReason 消费的飞行模式/省电位——
 *  磁贴 active 之外的环境约束单源） */
function qsEnvSnapshot() {
  const ap = activeTiles.find((t) => t.id === 'aeroplane');
  const bs = activeTiles.find((t) => t.id === 'battery_saver');
  return { aeroplane: !!(ap && ap.active), batterySaver: !!(bs && bs.active) };
}

/** v9.94 #201 refreshState 广播（QSTileImpl.handleUpdateState 同构）：环境约束变化后
 *  对受影响磁贴全量重算并增量刷新 DOM（UNAVAILABLE↔恢复双向） */
function refreshEnvDependentTiles() {
  for (const id of ENV_DEPENDENT_TILES) {
    const tile = activeTiles.find((t) => t.id === id);
    if (tile) refreshTilePill(tile);
  }
}

/** v9.94 #202：md token → 三态色板（getComputedStyle 解析，解析失败返回空表——
 *  色彩层合流由 CSS 类兜底，五通道精确值仅在 token 可解析时内联） */
function mdTilePalette() {
  let cs;
  try { cs = getComputedStyle(document.body); } catch (e) { return null; }
  const cv = (n) => (cs.getPropertyValue(n) || '').trim();
  const parse = (s) => {
    if (!s) return null;
    if (s[0] === '#') {
      let h = s.slice(1);
      if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('');
      if (h.length < 6) return null;
      return argb(255, parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
    }
    const m = s.match(/rgba?\(([^)]+)\)/);
    const nums = m ? m[1].split(/[,\s\/]+/).filter(Boolean).map(Number) : s.split(/[\s,/]+/).filter(Boolean).map(Number);
    if (!nums || nums.length < 3 || nums.slice(0, 3).some((n) => Number.isNaN(n))) return null;
    const a = nums[3] === undefined ? 255 : (nums[3] <= 1 ? Math.round(nums[3] * 255) : Math.round(nums[3]));
    return argb(a, Math.round(nums[0]), Math.round(nums[1]), Math.round(nums[2]));
  };
  const p = {
    // shadeDisabled：md3 无 surface-variant 实体 → surface-container-lowest（最暗底面，
    // 禁用灰底视觉同构）；onShadeActiveVariant：md3 无 on-primary-variant 实体 →
    // on-primary 同值（副标签激活色降级一致，在录）
    shadeActive: parse(cv('--md-primary')), shadeInactive: parse(cv('--md-surface-container-high')),
    shadeDisabled: parse(cv('--md-surface-container-lowest')), onShadeActive: parse(cv('--md-on-primary')),
    onShadeInactive: parse(cv('--md-on-surface')), onShadeActiveVariant: parse(cv('--md-on-primary')),
    onShadeInactiveVariant: parse(cv('--md-on-surface-variant')), outline: parse(cv('--md-outline')),
  };
  return p.shadeActive == null ? null : p;
}

/** 初始化快速设置面板内容与事件 */
export function initQuickSettings() {
  // v9.94 #34：磁贴布局顺序恢复（qs-tile-order 持久化，A17 QPR2 QS customizer 语义）
  activeTiles = applyTileOrder(activeTiles, loadTileOrder(typeof localStorage !== 'undefined' ? localStorage : null));
  restoreBatterySaverState();
  // v9.94 #204：单手模式状态 → 磁贴 active 同源（OneHandedTile.setState 语义：
  // 磁贴 active = 已进入态；状态变化事件由 one-handed.js dispatch，零 import 解耦）
  window.addEventListener('one-handed-changed', (e) => {
    const ohTile = activeTiles.find((t) => t.id === 'one_handed');
    if (!ohTile) return;
    ohTile.active = !!(e.detail && e.detail.active);
    refreshTilePill(ohTile);
  });
  renderQuickSettingsGrid();
  initSliders();
  initQsMediaCard();
  initEditTilesView();
  initPowerDialog();
  initHeaderIcons();

  // v9.94 #198：zen 规则每分钟 eval（启动即评一次对齐进行中区间；60s 周期对齐分钟粒度）
  zenEvalRulesTick();
  // v10.45 #235：teardown 后 60s zen 规则 tick 零触碰（v232 同族纪律，CI run#447 族）
  setInterval(() => {
    if (typeof document === 'undefined') return;
    zenEvalRulesTick();
  }, 60000);
  // 存档恢复：manualActive 落盘态 → 磁贴/类/效果 overlay 同步（跨刷新保留，
  // AOSP ZenModeConfig 持久化同语义）。不走 setDndActive（其 setManual 会清
  // ruleDriven 标记，导致 schedule 激活态刷新后无法自动关断）——直接三面同步。
  if (zenStore.getState().manualActive) {
    const dndTile = activeTiles.find((t) => t.id === 'modes');
    if (dndTile) dndTile.active = true;
    document.body.classList.add('dnd-mode-active');
    applyZenDeviceEffects();
    renderQuickSettingsGrid();
  }

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
  // v9.94 #111：AOSP 电源键双语义落地（PhoneWindowManager：短按 = sleep/lock、
  // 长按 ≥0.5s = GlobalActionsDialog 电源菜单）。pointer 系接管原 click：
  //   短按（<500ms 释放）→ lockNow（AOSP POWER_KEY 短按 sleep 同义，#35 AOD 链复用）
  //   长按（≥500ms）→ openPowerDialog（带 toast 标注长按语义 + 震动）
  //   pointerleave/cancel → 取消（移出按钮即弃，防误触）
  // 原 click 语义（开电源对话）由长按分支承接；v785 HTML 结构锚零变化。
  const powerBtn = document.getElementById('qsPowerBtn');
  if (powerBtn) {
    powerBtn.innerHTML = ICONS.power;
    const powerDispatcher = createKeyDispatcher({
      chords: [{ id: 'power_long_press', keys: ['power'], holdMs: POWER_LONG_PRESS_MS }],
      onTrigger: () => {
        // 长按：GlobalActionsDialog（AOSP 长按电源语义）
        if (navigator.vibrate) navigator.vibrate(20);
        openPowerDialog(powerBtn);
        if (window.showSystemToast) {
          window.showSystemToast('电源菜单（长按电源键）', ICONS.power);
        }
      },
    });
    let powerPressing = false;
    powerBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault(); // pointer 系接管：阻止后续 click 双触发
      powerPressing = true;
      powerDispatcher.feed('down', 'power');
    });
    powerBtn.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      if (!powerPressing) return;
      powerPressing = false;
      const r = powerDispatcher.feed('up', 'power');
      if (r.action === 'cancel') {
        // 短按释放：AOSP 短按电源 = sleep（lockNow → #35 AOD/锁屏链单源）
        lockNow();
      }
      // r.action === 'trigger' 已在 onTrigger 开对话
    });
    powerBtn.addEventListener('pointerleave', () => {
      if (!powerPressing) return;
      powerPressing = false;
      powerDispatcher.feed('up', 'power'); // 取消/触发均按既定窗处理
    });
    powerBtn.addEventListener('pointercancel', () => {
      if (!powerPressing) return;
      powerPressing = false;
      powerDispatcher.feed('up', 'power');
    });
    // holdMs=500 需 poll（纯逻辑无定时）：armed 后 250ms 步进 checkDue
    const pollPower = () => {
      const due = powerDispatcher.checkDue();
      if (due.action === 'none' && powerPressing && powerDispatcher.__state().armed.length > 0) {
        setTimeout(pollPower, 250);
      }
    };
    powerBtn.addEventListener('pointerdown', () => setTimeout(pollPower, 250));
  }
}

/** 注入头部矢量图标 */
function initHeaderIcons() {
  document.querySelectorAll('.panel-carrier-icon').forEach(el => {
    el.innerHTML = ICONS.cellular;
  });
}

// ==================== v9.94 #203 PagedTileLayout 分页联动 ====================
// mPageToRestore 恢复页记忆 + PageIndicator.setLocation 浮点联动 + onPageScrolled 桥。
// 纯 DOM 接线在本文件；容量/重分配/浮点状态全部单源在 js/aosp/qs-paged-layout.js。
let qsRestorePage = 0;
let qsPageChromeBound = false;

/** onPageScrolled L707-708 → PageIndicator.setLocation L156-173 桥：viewport scroll 浮点
 *  位置 → 圆点 active（onPageSelected 四舍五入语义）+ index1/index2 alpha 插值（浮点过渡） */
function syncQsPageIndicator(vp, indicator) {
  if (!vp || !indicator) return;
  const pageW = vp.clientWidth;
  const numPages = vp.children.length;
  if (pageW <= 0 || numPages === 0) return;
  const st = pageIndicatorState(numPages, vp.scrollLeft / pageW);
  const sel = Math.round(st.position);
  Array.from(indicator.children).forEach((dot, i) => {
    dot.classList.toggle('active', i === sel);
    dot.setAttribute('aria-selected', i === sel ? 'true' : 'false');
    // setLocation 两点插值：滚动中 index1→index2 圆点 alpha 随 offset 过渡（浮点联动验收面）
    if (i === st.index1) dot.style.setProperty('--dot-alpha', (1 - st.offset * 0.55).toFixed(3));
    else if (i === st.index2) dot.style.setProperty('--dot-alpha', (0.45 + st.offset * 0.55).toFixed(3));
    else dot.style.removeProperty('--dot-alpha');
  });
}

/** mPageToRestore 落位：重分配后恢复记忆页（auto 不平滑；面板隐藏时仅记号不硬置）。
 *  openPullPanel 展开面板时同样调用（innerHTML 重建在隐藏态发生，scrollLeft 已归零） */
export function syncQsPagedViewport() {
  const vp = document.getElementById('qsTilesContainer');
  const indicator = document.getElementById('qsPageIndicator');
  if (!vp) return;
  if (vp.clientWidth > 0) {
    const target = resolveRestorePage(qsRestorePage, vp.children.length);
    vp.scrollLeft = target * vp.clientWidth;
  }
  syncQsPageIndicator(vp, indicator);
}

/** 滚动/键盘/resize/调试钩子一次绑定（PageScrollActionListener LEFT/RIGHT 同构） */
function bindQsPageChrome(vp, indicator) {
  if (qsPageChromeBound || !vp || !indicator) return;
  qsPageChromeBound = true;
  vp.addEventListener('scroll', () => {
    const pageW = vp.clientWidth;
    if (pageW > 0) qsRestorePage = Math.round(vp.scrollLeft / pageW);
    syncQsPageIndicator(vp, indicator);
  }, { passive: true });
  // PageScrollActionListener L298-304：键盘 LEFT/RIGHT 方向翻页（无障碍通道）
  vp.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowLeft' ? PAGE_SCROLL_DIRECTION.LEFT : PAGE_SCROLL_DIRECTION.RIGHT;
    const target = stepPage(Math.round(vp.scrollLeft / Math.max(1, vp.clientWidth)), vp.children.length, dir);
    vp.scrollTo({ left: target * vp.clientWidth, behavior: 'smooth' });
  });
  // 行列资源变化入口（updateResources L440-454 语义）：视口宽度变化 → 重新吸附当前页
  window.addEventListener('resize', () => syncQsPagedViewport());
  // e2e/调试钩子（零 import 惯例，同 __monetReroll/__lockClockFaces）
  window.__qsPageState = () => ({
    pageCount: vp.children.length,
    currentPage: vp.clientWidth > 0 ? Math.round(vp.scrollLeft / vp.clientWidth) : qsRestorePage,
    dots: indicator.children.length,
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

  // v9.94 #203 防御兜底：容器类名缺失（旧缓存 HTML）时补齐分页视口类，vp 永不为 null
  if (!container.classList.contains('qs-paged-viewport')) container.classList.add('qs-paged-viewport');

  // v9.94 #203 mPageToRestore 恢复页采样：重建前记录当前选定页（四舍五入 = onPageSelected
  // 语义）；面板隐藏（clientWidth=0）时用模块记忆值（编辑器增删后不跳回第一页）
  const vp = container.classList.contains('qs-paged-viewport') ? container : null;
  let restorePage = 0;
  if (vp && vp.clientWidth > 0) {
    restorePage = Math.round(vp.scrollLeft / vp.clientWidth);
  } else {
    restorePage = qsRestorePage;
  }

  vp.innerHTML = '';
  if (qqsContainer) qqsContainer.innerHTML = '';

  // QQS 磁贴集合：出厂大磁贴集合（源码默认 internet/bt/dnd/cast）中处于激活磁贴列表者，前 4
  const qqsTiles = activeTiles
    .filter((t) => (t.size || FACTORY_TILE_SIZES[t.id]) === QS_TILE_SIZES.WIDE)
    .slice(0, 4);

  // v9.94 #203 distributeTiles 核心重分配（PagedTileLayout L399-411 同构）：全量磁贴按
  // 4×2=8 格/页容量逐页装填（TileLayout.maxTiles 契约），宽磁贴 span2 占 2 格、
  // 满页即封、溢出进下页；保底一页。增删磁贴后全量重分配 = emptyAndInflateOrRemovePages 语义
  const pages = distributeTiles(activeTiles, {
    columns: QS_PAGE_COLUMNS,
    rows: QS_PAGE_ROWS,
    tileWeight: (t) => ((t.size || FACTORY_TILE_SIZES[t.id]) === QS_TILE_SIZES.WIDE ? 2 : 1),
  });
  // 页 DOM：.qs-page（scroll-snap 页容器，ViewPager 语义）承载 .qs-tiles-grid
  // （TileLayout 单页网格；保留类名使 tile-bounce :scope > 直接子级查询零破坏）
  const pageEls = pages.map((pageTiles) => {
    const pageEl = document.createElement('div');
    pageEl.className = 'qs-page qs-tiles-grid';
    pageEl.dataset.pageTiles = String(pageTiles.length);
    vp.appendChild(pageEl);
    return pageEl;
  });
  // tile → 页容器映射（addTile L347-351 只入总队列，落页由 distributeTiles 唯一分配）
  const tilePage = new Map();
  pages.forEach((pageTiles, pi) => pageTiles.forEach((t) => tilePage.set(t, pageEls[pi])));

  activeTiles.forEach((tile) => {
    // v9.94 #201/#202：三态状态机派生（环境约束 + 受管位全量重算，handleUpdateState 同构）
    const vs = deriveTileState(tile, qsEnvSnapshot());
    // 深色模式磁贴：开关状态实时跟随解析后的实际外观（自动档跟随系统）
    const tileActive = tile.id === 'darktheme' ? getResolvedTheme() === 'dark' : tile.active;
    // v9.94 #202 合流规则：UNAVAILABLE 与 restricted（disabledByPolicy）色彩层合流 → 灰族；
    // active 类在两态下均不出现（colorUnavailable 压制 shadeActive，L769-810 同构）
    const isUnavailable = vs.state === TILE_STATE.UNAVAILABLE;
    const showActive = tileActive && !isUnavailable && !vs.restricted;
    const isSmall = tile.size === QS_TILE_SIZES.SMALL;
    const pill = document.createElement('div');
    pill.className = `qs-tile-pill ${isSmall ? 'size-small' : 'size-wide'} ${showActive ? 'active' : ''} ${isUnavailable ? 'unavailable' : ''} ${vs.restricted && !isUnavailable ? 'restricted' : ''}`;
    pill.dataset.tileId = tile.id;

    // v7.79 矢量图修正：蓝牙激活态带连接侧点（v2 ROSE Ceramics 特写实锤 bluetooth_connected）
    const iconKey = (tile.id === 'bluetooth' && tileActive && ICONS.bluetooth_connected)
      ? 'bluetooth_connected'
      : tile.iconKey;
    const iconSvg = ICONS[iconKey] || ICONS.settings;

    const iconHtml = `<div class="qs-tile-icon-wrap">${iconSvg}</div>`;

    // v9.94 #201 副标签派生：UNAVAILABLE → 「不可用」（getUnavailableText 同位）；
    // restricted → 「受管理」（disabledByPolicy 文案补充通道，L592-595 同构）
    const subText = isUnavailable ? '不可用'
      : (vs.restricted ? '受管理'
        : (tileActive ? (tile.sub || '已开启') : '已关闭'));

    if (isSmall) {
      // 1×1 横卧圆角矩形：纯图标居中（v2 QR/旋转同构；v7.80 实测非胶囊，圆角率同宽磁贴）
      pill.innerHTML = iconHtml;
    } else {
      pill.innerHTML = `
      ${iconHtml}
      <div class="qs-tile-text">
        <span class="qs-tile-title">${tile.name}</span>
        <span class="qs-tile-sub">${subText}</span>
      </div>
    `;
    }

    // v9.94 #202：五通道色彩消费（BACKGROUND/LABEL/SECONDARY_LABEL 三通道真实接线；
    // CHEVRON/OVERLAY 无 DOM 实体在库在录）——禁用/受管态色板可解析时内联精确值，
    // CSS 类兜底双保险；正常态清内联变量交还 CSS 单源
    if (isUnavailable || vs.restricted) {
      const palette = mdTilePalette();
      if (palette) {
        const colors = getTileViewColors(vs, palette);
        // null 通道跳过（空串 setProperty 会清变量，CSS 类兜底接管）
        if (colors.background != null) pill.style.setProperty('--tile-bg', colorIntToCss(colors.background));
        if (colors.label != null) pill.style.setProperty('--tile-fg', colorIntToCss(colors.label));
        if (colors.secondaryLabel != null) pill.style.setProperty('--tile-sub', colorIntToCss(colors.secondaryLabel));
      }
      pill.setAttribute('aria-disabled', isUnavailable ? 'true' : 'false');
      if (vs.restricted) pill.dataset.restrictedReason = vs.restrictedReason || 'admin';
    } else {
      pill.style.removeProperty('--tile-bg');
      pill.style.removeProperty('--tile-fg');
      pill.style.removeProperty('--tile-sub');
      pill.removeAttribute('aria-disabled');
      if (pill.dataset.restrictedReason) delete pill.dataset.restrictedReason;
    }

    pill.addEventListener('pointerdown', (e) => {
      // v9.94 #201 误触守卫采样（isFalseTap 消费：位移/时长双阈值，FalsingManager 同构）
      pill.__pt = { x: e.clientX, y: e.clientY, t: Date.now() };
    });
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      // v9.94 #201 误触守卫：isFalseTap(LOW_PENALTY) 同构（位移 > 24px / 按压 > 700ms 拦截）
      if (pill.__pt && isFalseTap({ dx: e.clientX - pill.__pt.x, ms: Date.now() - pill.__pt.t })) {
        pill.__pt = null;
        return;
      }
      pill.__pt = null;
      tile._sourceRect = pill.getBoundingClientRect(); // 记录磁贴位置，应用从磁贴处起飞
      // v9.94 #201 三重处置（L580/L592 同构）：UNAVAILABLE 禁点击；restricted 点击拦截
      // 并提示受管（AOSP：DevicePolicyManager 拦截 + toast，不改三态值）
      const vsClick = deriveTileState(tile, qsEnvSnapshot());
      if (vsClick.state === TILE_STATE.UNAVAILABLE) {
        if (navigator.vibrate) navigator.vibrate(10);
        showSystemToast(`${tile.name}：不可用（${vsClick.unavailableReason === 'aeroplane' ? '飞行模式开启中' : '当前不可用'}）`, ICONS.block);
        return;
      }
      if (vsClick.restricted) {
        if (navigator.vibrate) navigator.vibrate(10);
        showSystemToast(`${tile.name}：受管理（${vsClick.restrictedReason === 'battery_saver' ? '省电模式限制' : '管理员控制'}）`, ICONS.block);
        return;
      }
      // 锁屏磁贴：动作型磁贴，不切换开关状态，直接锁屏（v9.94 #35：AOD 开时升级为熄屏常显——单源 aodPowerOff）
      if (tile.id === 'lock_screen') {
        if (navigator.vibrate) navigator.vibrate(20);
        playSfx('tick');
        closePullPanels();
        setTimeout(() => { aodPowerOff(); }, 120);
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
      // v9.94 #204：单手模式磁贴（OneHandedTile 同构：active = 已进入态，点击 toggle；
      // toggle 内部走 canEnterOneHanded 大屏禁用/过渡互斥，拒绝时静默）
      if (tile.id === 'one_handed') {
        if (navigator.vibrate) navigator.vibrate(15);
        playSfx('tick');
        closePullPanels();
        setTimeout(() => { if (window.__oneHanded) window.__oneHanded.toggle(); }, 120);
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
      // v9.95 #89：磁贴开关态广播（bluetooth/modes/alarm/cast/screen_record/vpn 等策略插槽消费）
      notifyTilesChanged([tile.id]);
      handleTileAction(tile);
    });

    // v9.94 #201 长按语义位泛化：handlesLongClick 逐磁贴声明（TILE_LONG_CLICK_INTENTS），
    // 有内联面板实体的三贴（internet/bluetooth/modes）统一 480ms 长按（与尺寸无关，
    // AOSP handleLongClick → getLongClickIntent 同构）；误触守卫：10px 位移取消
    // （isFalseLongTap / FALSE_LONG_TAP_MIN_MS=480 单源在 qs-tile-state.js）
    const longClickSheet = TILE_LONG_CLICK_SHEET[tile.id];
    if (longClickSheet && deriveTileState(tile, qsEnvSnapshot()).state !== TILE_STATE.UNAVAILABLE) {
      let lpTimer = 0, lpStart = null;
      pill.addEventListener('pointerdown', (e) => {
        lpStart = { x: e.clientX, y: e.clientY };
        clearTimeout(lpTimer);
        lpTimer = setTimeout(() => { lpTimer = 0; if (navigator.vibrate) navigator.vibrate(18); longClickSheet(pill); }, FALSE_LONG_TAP_MIN_MS);
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

    // v9.94 #203 落页：pill 放入 distributeTiles 分配的页容器（不再是单容器平铺）
    const pageEl = tilePage.get(tile) || pageEls[0];
    if (pageEl) pageEl.appendChild(pill);

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

  // v9.94 #203 收尾：PageIndicator.setNumPages（圆点数=页数，L106-129 语义）
  // + mPageToRestore 落位 + 滚动/键盘/resize 联动一次绑定
  const indicator = document.getElementById('qsPageIndicator');
  qsRestorePage = resolveRestorePage(restorePage, pages.length);
  if (indicator) {
    indicator.innerHTML = '';
    pages.forEach((_, pi) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'qs-page-dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `第 ${pi + 1} 页`);
      // 指示器点击翻页（ViewPager scrollTo 页语义）
      dot.addEventListener('click', () => {
        if (vp.clientWidth > 0) vp.scrollTo({ left: pi * vp.clientWidth, behavior: 'smooth' });
      });
      indicator.appendChild(dot);
    });
  }
  bindQsPageChrome(vp, indicator);
  syncQsPagedViewport();
  // v10.45 #83 同面展开：网格重建后重同步（scene=1 时重建会让 QQS 节点复显/折叠磁贴
  // opacity 复位 → 立即按当前 sceneProgress 重应用交接/渐现态；位姿对由手势侧失效重建）
  if (typeof window !== 'undefined' && window.__sceneMorphResync) window.__sceneMorphResync();
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
  // v9.94 #201/#202 增量路径同步三态：环境约束/受管位全量重算（handleUpdateState 同构），
  // 合流规则与全量渲染同一口径（UNAVAILABLE/restricted 均压制 active 类）
  const vs = deriveTileState(tile, qsEnvSnapshot());
  const isUnavailable = vs.state === TILE_STATE.UNAVAILABLE;
  const showActive = tileActive && !isUnavailable && !vs.restricted;
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
    pill.classList.toggle('active', showActive);
    pill.classList.toggle('unavailable', isUnavailable);
    pill.classList.toggle('restricted', vs.restricted && !isUnavailable);
    // v9.94 #202 五通道色彩消费（增量路径与全量渲染同口径：禁用/受管态内联精确值，
    // 正常态清变量交还 CSS 单源）
    if (isUnavailable || vs.restricted) {
      const palette = mdTilePalette();
      if (palette) {
        const colors = getTileViewColors(vs, palette);
        // null 通道跳过（空串 setProperty 会清变量，CSS 类兜底接管）
        if (colors.background != null) pill.style.setProperty('--tile-bg', colorIntToCss(colors.background));
        if (colors.label != null) pill.style.setProperty('--tile-fg', colorIntToCss(colors.label));
        if (colors.secondaryLabel != null) pill.style.setProperty('--tile-sub', colorIntToCss(colors.secondaryLabel));
      }
      pill.setAttribute('aria-disabled', isUnavailable ? 'true' : 'false');
      if (vs.restricted) pill.dataset.restrictedReason = vs.restrictedReason || 'admin';
    } else {
      pill.style.removeProperty('--tile-bg');
      pill.style.removeProperty('--tile-fg');
      pill.style.removeProperty('--tile-sub');
      pill.removeAttribute('aria-disabled');
      if (pill.dataset.restrictedReason) delete pill.dataset.restrictedReason;
    }
    if (tile.id === 'bluetooth') {
      const wrap = pill.querySelector('.qs-tile-icon-wrap');
      const iconKey = (tileActive && ICONS.bluetooth_connected) ? 'bluetooth_connected' : tile.iconKey;
      if (wrap && iconKey) wrap.innerHTML = ICONS[iconKey] || wrap.innerHTML;
    }
    const sub = pill.querySelector('.qs-tile-sub');
    if (sub) {
      // v9.94 #201 副标签派生（与全量渲染同一口径：不可用/受管理/已开启/已关闭）
      sub.textContent = isUnavailable ? '不可用'
        : (vs.restricted ? '受管理'
          : (tileActive ? (tile.sub || '已开启') : '已关闭'));
    }
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

    case 'all_apps':
      closePullPanels();
      if (window.__allApps) window.__allApps.open('qs-tile');
      break;

    case 'mic_access':
    case 'camera_access':
      updatePrivacyIndicators();
      showSystemToast(tile.active ? `已启用 ${tile.name}` : `已禁用 ${tile.name}`, tile.active ? ICONS.record_dot : ICONS.block);
      break;

    case 'autorotate':
      showSystemToast(tile.active ? '自动旋转已开启' : '方向已锁定', tile.active ? ICONS.autorotate : ICONS.lock);
      break;

    case 'aeroplane':
      // v9.94 #201 refreshState 广播：飞行模式切换 → 射频链路磁贴（cast/quick_share/vpn/internet）
      // 状态全量重算（UNAVAILABLE↔恢复），AOSP WifiTile/CastTile 环境联动同构
      showSystemToast(tile.active ? '飞行模式已开启' : '飞行模式已关闭', tile.active ? ICONS.aeroplane : ICONS.cellular);
      refreshEnvDependentTiles();
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
      // v10.45 #235：teardown 后录屏计时 tick 零触碰自清（v232 同族纪律）
      if (typeof document === 'undefined') { clearInterval(recordTimerInterval); recordTimerInterval = null; return; }
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

/** v9.95 #89 策略插槽广播：磁贴开关态变更后通知状态栏重读快照
 *  （AOSP AudioService/DevicePolicy 广播同构：PhoneStatusBarPolicy 按信号源逐项重算，
 *  md3 以单事件 + 快照重读值差分渲染等价落地；消费点 status-bar.js refreshPolicySnapshot） */
export function notifyTilesChanged(ids) {
  try {
    document.dispatchEvent(new CustomEvent('qs-tiles-changed', { detail: { ids: Array.isArray(ids) ? ids : [] } }));
  } catch (e) { /* 非浏览器环境静默 */ }
}

/** 程序化设置勿扰模式：manual 真源写入 + 生效面应用（quick-settings / profiles / focus 共用单一真源） */
export function setDndActive(active, { silent = false } = {}) {
  // v10.45 #209：手动关闭 = AOSP manual override 语义——同时清空外部来源登记（逃生通道：
  // 宿主程序中途失联/窗口中断不悬挂勿扰，下个进窗边沿重新登记）
  if (!active) zenStore.clearExternalSources();
  // v9.94 #198：manualRule 直控落 zenStore（QS 磁贴为 ZenModeConfig.MANUAL_RULE 同源入口）
  zenStore.setManual(!!active);
  applyDndEffective({ silent, toast: true, toastActive: !!active });
}

/** v10.45 #209：勿扰生效态翻转入账（dnd-changed DOM 事件 → main.js 桥接 app-bus 系统广播） */
let dndEffLast = false;

/** v10.45 #209：勿扰生效面统一应用（磁贴同步/body 类/ZenDeviceEffects overlay/QS 重渲染/
 *  插槽广播/翻转事件）。生效值统一取 isZenActive()（manual ∪ external）——manual
 *  （setDndActive）与外部来源（setDndExternalSource）共用同一应用面，AOSP「各规则独立
 *  请求 zen、生效态统一重算」同构；toast 仅 manual 路径保留（原语义逐字不动）。 */
function applyDndEffective({ silent = false, toast = false, toastActive = false } = {}) {
  const eff = isZenActive();
  const tile = activeTiles.find((t) => t.id === 'modes');
  if (tile) tile.active = eff;
  document.body.classList.toggle('dnd-mode-active', eff);
  // ZenDeviceEffects overlay 同步（灰度/夜灯/夜间模式…随生效态挂卸）
  applyZenDeviceEffects();
  renderQuickSettingsGrid();
  // v9.95 #89：zen 态程序化变更同样广播（mute/vibrate 插槽随 isZenOverridingRinger 双隐联动）
  notifyTilesChanged(['modes']);
  if (toast && !silent) {
    showSystemToast(toastActive ? '勿扰模式已开启 (静音新消息横幅)' : '勿扰模式已关闭', toastActive ? ICONS.bell_off : ICONS.sound_notifications);
  }
  if (eff !== dndEffLast) {
    dndEffLast = eff;
    try { document.dispatchEvent(new CustomEvent('dnd-changed', { detail: { active: eff } })); } catch (e) { /* 非浏览器环境静默 */ }
  }
}

/** v10.45 #209：程序化外部来源 DND 请求（bedtime 睡眠模式等，iframe 经 __system.dnd.set 到达）。
 *  语义三条在录：①外部源零写 manualActive——手动意图零覆盖，出窗回落 manual 真值；
 *  ②生效 = manual ∪ external（AOSP 规则激活期 zen 保持）；③手动关闭（setDndActive(false)）
 *  清空全部外部登记——manual override 逃生通道。灰度等 ZenDeviceEffects 位经 effects 并集
 *  叠加进 #zen-device-effects overlay（复用 #198 通道，零新渲染层）。 */
export function setDndExternalSource(sourceId, active, { effects = 0, silent = true } = {}) {
  zenStore.setExternalSource(sourceId, { active: !!active, effects });
  applyDndEffective({ silent });
}

// ==================== v9.94 #198 ZenDeviceEffects overlay + ScheduleCalendar 规则 eval ====================

/** 全屏效果 overlay：fixed inset0 pointer-events:none，样式由 aosp/zen-mode.js 纯函数合成
 *  （grayscale → backdrop-filter；夜灯/夜间模式/压暗 → 罩面色；零布局侵入不破坏 fixed 定位上下文） */
function applyZenDeviceEffects() {
  let overlay = document.getElementById('zen-device-effects');
  // v10.45 #209：生效位 = 用户配置位（持久化）∪ 激活外部来源位并集（session-only，bedtime 灰度等）
  const style = deviceEffectsOverlayStyle((zenStore.getState().deviceEffects | 0) | zenStore.externalEffects());
  if (!style) {
    if (overlay) overlay.remove(); // 效果位清零 → 挂卸复原（#198 验收「退出即复原」）
    return;
  }
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'zen-device-effects';
    document.body.appendChild(overlay);
  }
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483000;'
    + (style.backdropFilter ? `backdrop-filter:${style.backdropFilter};-webkit-backdrop-filter:${style.backdropFilter};` : '')
    + (style.background ? `background:${style.background};` : '')
    + 'pointer-events:none;';
}

/** ScheduleCalendar 规则每分钟 eval（AOSP ScheduleConditionProvider 同语义）：
 *  到点激活 / 过期自动关断（仅 ruleDriven 态，手动开启不被抢关——zen-mode evalRules 状态机） */
function zenEvalRulesTick() {
  const now = new Date();
  const res = zenStore.evalRules({
    day: now.getDay() + 1, // java.util.Calendar：SUNDAY=1 ↔ JS getDay() 0-6
    minuteOfDay: now.getHours() * 60 + now.getMinutes(),
  });
  // v10.45 #209：evalRules 已在 store 内完成真源变更（manualActive/ruleDriven），
  // 此处仅需生效面重应用（原 setDndActive(manualActive) 的 setManual 同值写入无行为差，
  // 改用 applyDndEffective 免误触外部登记清洗）
  if (res.changed) applyDndEffective({ silent: true });
}

// 只读测试/e2e 观测桥（__headsUpDebug / __desktopPrefsInternal 同款风格：零行为面）
if (typeof window !== 'undefined') {
  window.__zenDebug = {
    state: () => zenStore.getState(),
    isActive: () => isZenActive(),
    evalRules: (day, minuteOfDay) => zenStore.evalRules({ day, minuteOfDay }),
    setDeviceEffects: (mask) => { zenStore.setDeviceEffects(mask); applyZenDeviceEffects(); },
    upsertRule: (r) => zenStore.upsertRule(r),
    hasOverlay: () => !!document.getElementById('zen-device-effects'),
    // v10.45 #209：外部来源观测面 + 直注入口（e2e/单测零行为面风格，__alarmStateProbe 同款）
    externalSources: () => zenStore.getState().externalSources,
    setExternal: (id, on, effects) => setDndExternalSource(id, on, { effects: effects | 0 }),
    // v10.45 #209：手动路径直注（QS 磁贴 click 分发同款真源入口；e2e 互不覆盖断言用）
    setDnd: (on) => setDndActive(!!on, { silent: true }),
  };
}

// v10.45 #209：iframe → 宿主 DND 桥消息面（__system.dnd set/get 的宿主半边；
// notifications.js NOTIFY / app-bus.js BUS_EMIT 同款 per-module message listener 范式）
if (typeof window !== 'undefined') {
  window.addEventListener('message', (e) => {
    const d = e && e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'DND_SET') {
      // effects 入参双形态：{ grayscale:true } 语义别名（iframe 侧无 zen 常量）或数字位掩码
      const fx = d.effects && typeof d.effects === 'object'
        ? (d.effects.grayscale ? ZEN_DEVICE_EFFECT.GRAYSCALE : 0)
        : (Number(d.effects) | 0 || 0);
      setDndExternalSource(d.source, d.active, { effects: fx });
    } else if (d.type === 'DND_GET' && d.requestId) {
      try {
        e.source && e.source.postMessage({
          type: 'DND_RESULT',
          requestId: d.requestId,
          active: isZenActive(),
          sources: Object.keys(zenStore.getState().externalSources),
        }, '*');
      } catch (err) { /* 上下文已销毁 */ }
    }
  });
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
  // v9.95 #89：程序化磁贴同步同样广播（aeroplane refreshState / 时钟闹钟同步等链路消费）
  notifyTilesChanged([id]);
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

// ==================== v7.99 #10 二期：设置子页单一真源 window 桥 ====================
// settings.js 页 17（网络和互联网）的内联 <script> 无模块作用域，经此桥复用
// QS 磁贴状态单一真源（AeroplaneModePreferenceController/InternetPreferenceControllerV2
// 语义的 Web 等价物）：开关查询/同步、网络清单面板（openNetworkSheet = NetworkProviderSettings
// 的项目内同语义实现）、系统 Toast。桥在模块求值时挂载（函数声明已提升，顺序安全）。
if (typeof window !== 'undefined') {
  window.__qsTileState = {
    get: getTileActive,
    sync: syncTileState,
    tile: (id) => activeTiles.find((t) => t.id === id),
  };
  window.__qsNetworkSheet = openNetworkSheet;
  window.__qsToast = showSystemToast;
}

/**
 * v7.90 亮度滑条回归 r1 基准 —— BrightnessSlider.kt 竖条 thumb 版
 * （brightness/ui/compose/BrightnessSlider.kt；替代 v7.87 PlatformSlider 超前路线：
 *  r1 中 QS 亮度渲染唯一入口 = BrightnessSliderContainer，PlatformSlider 无 QS 亮度消费方）。
 *
 * BrightnessSliderDimensions.Default：icon 28dp / thumb 52h×4w（SliderDefaults.Thumb
 * thumbSize 竖条柄）/ track 40dp / verticalPadding 6dp / bg corner 24dp /
 * backgroundFrame 10w×6h；InternalDimensions：SliderTrackRoundedCorner=12dp、
 * IconPadding=6dp、ThumbTrackGapSize=6dp、trackInsideCornerSize=2dp。
 *
 * 轨道几何（SliderDefaults.Track drawWithContent，r1 实测语义）：
 *   activeTrackEnd   = W×fraction − 6（thumb 左侧 gap）
 *   inactiveTrackStart = activeTrackEnd + 12（thumb 两侧各 6dp gap）
 *   图标画在轨内（DrawScope）：
 *   - 不活跃区放得下 → 锚在轨道右端（x = W − IconPadding − 28），inactiveTick 色
 *   - 否则活跃区放得下 → 锚在 thumb 左侧（x = activeTrackEnd − IconPadding − 28），
 *     activeTick 色；双色交叉淡入淡出 appear tween(100ms, delay 33ms) / disappear tween(50ms)
 * 三档图标 getIconForPercentage：percentage ≤ 20 → low；≥ 80 → full；其余 → mid
 * M3 Slider 颜色：active=primary、thumb=primary、inactive=surfaceContainerHighest、
 *   activeTick=onPrimary、inactiveTick=onSurfaceVariant
 *
 * 音量 = Material3 Slider 竖置（res/layout/volume_dialog_slider.xml，52×254dp）：
 * 同一 --v 变量经 CSS calc 驱动填充（250·t-6）/ 横柄（行程 [2,252]）/ 流图标
 * （trackIconActiveEnd）三要素；v7.88 起迁入音量键对话框 volume-dialog.js。
 */
function initBrightnessSlider() {
  const bar = document.getElementById('qsBrightnessBar');
  const track = document.getElementById('qsBsTrack');
  if (!bar || !track) return;
  const activeTrack = document.getElementById('qsBsActive');
  const inactiveTrack = document.getElementById('qsBsInactive');
  const thumb = document.getElementById('qsBsThumb');
  const iconActive = document.getElementById('qsBsIconActive');
  const iconInactive = document.getElementById('qsBsIconInactive');

  // InternalDimensions（BrightnessSlider.kt）+ SliderDefaults.Thumb(thumbSize = 4×52dp)
  // v7.93 双 gap 体系（源码本就两套几何）：
  //   图标锚点 = ThumbTrackGapSize 6（BrightnessSlider.kt drawWithContent L285-288：
  //     activeTrackEnd = frac·trackW − 6 / inactiveTrackStart = +6·2）——恒定，不随按压变
  //   轨道端   = endGap = thumbWidth/2 + thumbTrackGapSize（material3 drawTrack L1916-1919：
  //     endThumbWidth = state.thumbWidth 当下实测宽）→ v8.20 #45 改动态：常态 4/2+6=8、
  //     按压 2/2+6=7（v7.93 曾定死 8，v7.90 曾误用 6）
  const TRACK_H = 40, ICON_SIZE = 28, ICON_PADDING = 6;
  const GAP_ICON = 6;
  const TRACK_CORNER = 12, INSIDE_CORNER = 2;
  const APPEAR_MS = 100, APPEAR_DELAY_MS = 33, DISAPPEAR_MS = 50;
  // 三档图标（getIconForPercentage）→ icons.js v7.85 AOSP 原始 pathData（960 网格）
  const ICON_KEYS = { low: 'brightness_low', mid: 'brightness_medium', full: 'brightness' };

  let value = currentBrightness;   // 15..100（应用调光下限模型）
  let showIconActive = true;
  let currentIconKey = null;
  let rectCache = null;

  const iconKey = () => (value <= 20 ? 'low' : value >= 80 ? 'full' : 'mid');

  const positionIcon = (el, x, y) => {
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y)}px`;
  };

  /** 轨内图标定位与双色切换（drawWithContent if/else 顺序与源码一致；锚点 gap 6） */
  const layoutIcon = (w) => {
    const activeEnd = Math.max(0, w * (value / 100) - GAP_ICON); // activeTrackEnd
    const inactiveWidth = w - (activeEnd + GAP_ICON * 2);        // inactive 段可用宽
    const activeWidth = activeEnd;
    const yOffset = (TRACK_H - ICON_SIZE) / 2;
    let showActive, x;
    if (ICON_SIZE < inactiveWidth - ICON_PADDING * 2) {
      showActive = false;               // 锚在轨道右端（inactiveTrackEnd）
      x = w - ICON_PADDING - ICON_SIZE;
    } else if (ICON_SIZE < activeWidth - ICON_PADDING * 2) {
      showActive = true;                // 锚在 thumb 左侧（activeTrackEnd）
      x = activeEnd - ICON_PADDING - ICON_SIZE;
    } else {
      // 两区都放不下（源码：保持上一次状态，不绘制新位置）
      const keepX = showIconActive
        ? activeEnd - ICON_PADDING - ICON_SIZE
        : w - ICON_PADDING - ICON_SIZE;
      positionIcon(iconActive, keepX, yOffset);
      positionIcon(iconInactive, keepX, yOffset);
      return;
    }
    // 交叉淡入淡出（IconAppearSpec/IconDisappearSpec）
    if (showActive !== showIconActive) {
      showIconActive = showActive;
      iconActive.animate(
        [{ opacity: showActive ? '0' : '1' }, { opacity: showActive ? '1' : '0' }],
        showActive
          ? { duration: APPEAR_MS, delay: APPEAR_DELAY_MS, fill: 'forwards' }
          : { duration: DISAPPEAR_MS, fill: 'forwards' },
      );
      iconInactive.animate(
        [{ opacity: showActive ? '1' : '0' }, { opacity: showActive ? '0' : '1' }],
        showActive
          ? { duration: DISAPPEAR_MS, fill: 'forwards' }
          : { duration: APPEAR_MS, delay: APPEAR_DELAY_MS, fill: 'forwards' },
      );
    }
    const cx = showActive ? activeEnd : w; // 源码锚点：activeTrackEnd / inactiveTrackEnd
    positionIcon(iconActive, cx - ICON_PADDING - ICON_SIZE, yOffset);
    positionIcon(iconInactive, cx - ICON_PADDING - ICON_SIZE, yOffset);
  };

  /** 分段轨道 + thumb + 图标全量重绘。
      v8.20（#45 第三轮）对齐 material3 1.4.0 SliderImpl（L855-880）+ drawTrack（L1912-1985）
      + Thumb（L1211-1241）三层权威语义，全链按压联动：
      ① thumbW = 按压/拖拽中 ? 2 : 4（Thumb：interactions 非空 → thumbSize.width/2）
      ② trackW = 布局区宽 − thumbW（constraints.offset(−thumbW)），margin = thumbW/2
         （trackOffsetX = thumbPlaceable.width / 2，L872）
      ③ endGap = thumbW/2 + 6（drawTrack L1916-1919：endThumbWidth = state.thumbWidth
         当下实测宽 → endGap 常态 8dp/按压 7dp）
      ④ thumb 左缘 = trackW·frac（thumbOffsetX = trackW·frac，L877-879；左缘 travels、
         中心恰达轨道两端点——v7.90「中心 travels 0..W」旧式在端部溢出 2px，退役）
      ⑤ 段消失阈值 enableCornerShrinking=false 分支：active 宽 > cornerSize(12) 才画、
         inactive 仅 frac·trackW < trackW − endGap − cornerSize 才画（高亮度右段完全消失）；
      内角恒 2dp，外角由 track overflow:hidden 单源裁切（v8.17 #78 §五.1，
      与源码分段外角 [12,2]/[2,12] 视觉等价） */
  const render = () => {
    const thumbW = bar.classList.contains('is-dragging') ? 2 : 4; // ① 按压宽减半（无过渡，源码即时）
    track.style.marginLeft = track.style.marginRight = `${thumbW / 2}px`; // ② trackOffsetX
    const w = track.clientWidth;                    // ② trackW = 布局区宽 − thumbW
    const frac = value / 100;
    const endGap = thumbW / 2 + GAP_ICON;           // ③ thumbWidth/2 + ThumbTrackGapSize（8/7）
    // active 段：[0, frac×trackW − endGap]，宽 > 12 才绘制（源码 activeTrackThreshold = startCornerRadius）
    const activeW = Math.max(0, w * frac - endGap);
    activeTrack.style.width = `${activeW > TRACK_CORNER ? activeW : 0}px`;
    activeTrack.style.borderRadius = `0 ${INSIDE_CORNER}px ${INSIDE_CORNER}px 0`;
    // inactive 段：[frac×trackW + endGap, trackW]，仅 frac·trackW < trackW − endGap − 12 时存在
    const showInactive = w * frac < w - endGap - TRACK_CORNER;
    inactiveTrack.style.left = `${Math.min(w, w * frac + endGap)}px`;
    inactiveTrack.style.width = showInactive ? '' : '0';
    inactiveTrack.style.borderRadius = `${INSIDE_CORNER}px 0 0 ${INSIDE_CORNER}px`;
    thumb.style.left = `${w * frac}px`;             // ④ thumbOffsetX = trackW·frac（左缘）
    if (w < 2) return; // 面板未布局（隐藏/首帧）：等 ResizeObserver 触发
    layoutIcon(w);
    const key = iconKey();
    if (key !== currentIconKey) {
      currentIconKey = key;
      const svg = ICONS[ICON_KEYS[key]].replace('width="22" height="22"', 'width="28" height="28"');
      iconActive.innerHTML = svg;
      iconInactive.innerHTML = svg;
    }
  };

  const applyValue = (raw) => {
    value = Math.max(15, Math.min(100, Math.round(raw)));
    bar.style.setProperty('--v', String(value));
    bar.style.setProperty('--vf', String(value / 100)); // v8.20 #45：thumb left CSS 兑底（trackW·frac）
    bar.setAttribute('aria-valuenow', String(value));
    currentBrightness = value;
    // fix(audit-B): 实际调光手段是 body.filter（全库唯一消费链）
    const val = 0.35 + (value / 100) * 0.65;
    document.body.style.filter = `brightness(${val.toFixed(2)})`;
    render();
  };

  // v8.04 #23 差距矩阵②：亮度单一真源桥 —— settings.js 页 1（显示）「亮度」行与
  // QS 亮度滑条同源接线（BrightnessLevelPreferenceController 语义：设置页滑条与
  // 通知栏亮度为同一 System.SCREEN_BRIGHTNESS 真源的 Web 等价物）。
  // get 返回模块级 currentBrightness；set 走 applyValue（含 15..100 应用调光下限模型
  // 与 body.filter 全库唯一消费链）。桥在滑条初始化时挂载（applyValue 为闭包函数）。
  window.__qsBrightness = {
    get: () => currentBrightness,
    set: (v) => applyValue(Number(v)),
  };

  bar.addEventListener('pointerdown', (e) => {
    bar.classList.add('is-dragging');
    render(); // v8.20 #45：按压联动重绘（thumb 宽减半/track 加宽/endGap 8→7，M3 Thumb+SliderImpl 语义）
    // rectCache 必须在联动 render 之后取（margin 2→1px 移动 rect）——tap 解算用按压后布局（sliderTapModifier 同义）
    rectCache = track.getBoundingClientRect();
    const move = (clientX) => {
      const rect = rectCache || track.getBoundingClientRect();
      applyValue(((clientX - rect.left) / Math.max(rect.width, 1)) * 100);
    };
    move(e.clientX);

    const onMove = (me) => move(me.clientX);
    const finish = () => {
      bar.classList.remove('is-dragging');
      render(); // v8.20 #45：松手联动回常态（thumb 4/track 缩回/endGap 8）
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      rectCache = null; // 面板宽度可能变化，下次按下重取
      if (navigator.vibrate) navigator.vibrate(8);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  });

  // 面板开合会改变轨道宽度（DrawScope 的 size 每次布局后可用）→ 重绘图标/轨道几何
  new ResizeObserver(() => render()).observe(track);

  // 初始渲染：三档图标按当前值取档（AOSP：level-list 语义，无静态恒 full）
  bar.style.setProperty('--v', String(currentBrightness));
  bar.style.setProperty('--vf', String(currentBrightness / 100));
  render();
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
    // v7.93 卡底回归 CSS 纯色（coverGradient 渐变底退役，双卡一致）
    if (coverEl) coverEl.innerHTML = ICONS.music_note || ICONS.library_music || ICONS.headphones;
    if (titleEl) titleEl.textContent = state.track.title || '';
    if (artistEl) artistEl.textContent = `${state.track.artist || ''}${state.track.album ? ' • ' + state.track.album : ''}`;
    if (qsWave) {
      qsWave.setProgress((state.progress || 0) / 100);
      // v8.16 #40：进度外推速率（播放中 = 1/duration；暂停/未知 0）——与通知侧同一管线
      qsWave.setRate(state.isPlaying && state.duration > 0 ? 1 / state.duration : 0);
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
        setSwitchChecked(input, !!row.checked); // #70（创建时初始化同走统一入口，绑定时序前派发零副作用）
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
    // fix(v8.14, #39)：测量前中和上次开合残留的 --qs-tf-src —— closeQsSheet 刻意保留
    // 该变量（收缩目标复用），二次 open 时 sheet 仍带旧源变换 → getBoundingClientRect
    // 拿到的是旧变换后的矩形（≈源磁贴大小）→ 新 sx = src/dst ≈ 1 → 容器变换退化成
    // 纯淡入（用户实测「快速连点丢打开动画」主根因：首次开正常、二次开必坏）。
    // transition:none + 强制 reflow 确保测量拿到未变换的终态布局几何。
    sheet.style.transition = 'none';
    sheet.style.setProperty('--qs-tf-src', 'none');
    if (body) {
      body.style.transition = 'none';
      body.style.setProperty('--qs-tf-body-src', 'none');
    }
    void sheet.offsetWidth;
    const dst = sheet.getBoundingClientRect();
    if (dst.width > 0 && dst.height > 0) {
      const sx = Math.max(src.width / dst.width, 0.05);
      const sy = Math.max(src.height / dst.height, 0.03);
      const dx = src.left + src.width / 2 - (dst.left + dst.width / 2);
      const dy = src.top + src.height / 2 - (dst.top + dst.height / 2);
      const tf = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
      sheet.style.setProperty('--qs-tf-src', tf);
      if (body) body.style.setProperty('--qs-tf-body-src', `scale(${(1 / sx).toFixed(4)}, ${(1 / sy).toFixed(4)})`);
      // v7.80 容器变换改走 WAAPI（确定性播放）；v8.14 对齐 #39 补充评论的 U+ 权威时序：
      // open duration 200ms（原 360）/ overlay fade 83ms（原 260）。
      const reduced = isReduceMotionActive();
      if (!reduced && typeof sheet.animate === 'function') {
        overlay.classList.add('open');
        const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
        sheet.animate([{ transform: tf }, { transform: 'none' }], { duration: 200, easing: EASE });
        // fix(v8.14, #39)：body 对冲改「预采样关键帧 + linear」——原实现 sheet/body 两轨
        // 各自插值，乘积不恒 1：sheet=lerp(sx,1,e)、body=lerp(1/sx,1,e) 中间帧乘积达
        // 2.31 倍（sx=0.14, e=0.5）→ 文字先爆大再回落 =「字体进出场怪异」数学根因。
        // 按 eased progress 逐点取 sheet 当帧 scale 的精确倒数烘进关键帧（13 点采样，
        // bezier 平滑点间误差 <0.5%），sheet×body 乘积每采样点恒 1，内容全程 1:1。
        if (body) body.animate(quantizeCounterScale(sx, sy), { duration: 200, easing: 'linear' });
        playedTransform = true;
      }
    }
    // 过渡恢复（测量期临时禁用）
    sheet.style.removeProperty('transition');
    if (body) body.style.removeProperty('transition');
  }
  if (!playedTransform) {
    if (sheet) sheet.style.removeProperty('--qs-tf-src');
    if (body) body.style.removeProperty('--qs-tf-body-src');
    requestAnimationFrame(() => overlay.classList.add('open'));
  }
}

/**
 * v8.14 (#39)：body 反向对冲关键帧预采样——cubic-bezier(0.2,0,0,1)（Material
 * standard，U+ 容器变换曲线）解析求解 eased progress，逐点取 sheet 当帧 scale
 * 的精确倒数。关键帧 easing 用 linear（easing 已烘进 offsets 分布）。
 * @param {number} sx sheet 起始 scale x（= src.width/dst.width）
 * @param {number} sy sheet 起始 scale y
 * @returns {Keyframe[]} 13 点关键帧（offset 0→1）
 */
export function quantizeCounterScale(sx, sy) {
  const bezier = new PathInterpolatorCubic(0.2, 0, 0, 1);
  const frames = [];
  const STEPS = 12;
  for (let i = 0; i <= STEPS; i++) {
    const e = bezier.getInterpolation(i / STEPS);
    const kx = sx + (1 - sx) * e;
    const ky = sy + (1 - sy) * e;
    frames.push({
      transform: `scale(${(1 / kx).toFixed(4)}, ${(1 / ky).toFixed(4)})`,
      offset: i / STEPS,
    });
  }
  return frames;
}

export function closeQsSheet() {
  const overlay = document.getElementById('qsSheetOverlay');
  if (!overlay) return;
  const sheet = overlay.querySelector('.qs-sheet');
  const body = overlay.querySelector('.qs-sheet-body');
  // v7.80 收缩回磁贴同样走 WAAPI（与展开对称；CSS transition 同样存在同帧吞过渡风险）
  const tf = sheet ? sheet.style.getPropertyValue('--qs-tf-src') : '';
  const tfBody = body ? body.style.getPropertyValue('--qs-tf-body-src') : '';
  const reduced = isReduceMotionActive();
  if (tf && !reduced && sheet && typeof sheet.animate === 'function' && overlay.classList.contains('open')) {
    const EASE = 'cubic-bezier(0.2, 0, 0, 1)';
    // v8.14 (#39)：U+ close duration 233ms（原 280）；body 收缩对冲同改预采样关键帧
    //（与展开侧同款乘积恒 1 修正，文字退场不再先爆大/爆缩）
    const m = tf.match(/scale\(([\d.]+), ([\d.]+)\)/);
    if (m && body) {
      body.animate(quantizeCounterScale(parseFloat(m[1]), parseFloat(m[2])),
        { duration: 233, easing: 'linear' });
    }
    sheet.animate([{ transform: 'none' }, { transform: tf }], { duration: 233, easing: EASE });
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
        // v9.95 #89：蓝牙 sheet 总开关广播（updateBluetooth 连接态可见性真源）
        notifyTilesChanged(['bluetooth']);
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

// v8.27 #43：EditMode 容器双轨跟随 —— 经典模式锚在 #qsColumn（Scene 淡切容器），
// dual 模式迁至 #dualQsPanel（v7.85 dual 迁移链同律：活节点 moveInto + 还原记录）；
// close 时归还原位，保证两种 shade 模式下编辑场景都覆盖在激活的 QS 面板内。
let editViewHome = null; // { parent, next } 经典模式原位还原记录
function hostEditViewForCurrentMode() {
  const view = document.getElementById('editTilesView');
  if (!view) return;
  const dual = typeof document !== 'undefined' && document.body.dataset.shadeMode === 'dual';
  const dualPanel = document.getElementById('dualQsPanel');
  const qsColumn = document.getElementById('qsColumn');
  if (dual) {
    if (dualPanel && view.parentElement !== dualPanel) {
      if (!editViewHome) editViewHome = { parent: view.parentNode, next: view.nextSibling };
      dualPanel.appendChild(view);
    }
  } else if (editViewHome && view.parentElement !== editViewHome.parent) {
    editViewHome.parent.insertBefore(view, editViewHome.next);
    editViewHome = null;
  } else if (qsColumn && view.parentElement !== qsColumn) {
    qsColumn.appendChild(view); // 兼容性兑底：非 dual 且无还原记录时锚回 qsColumn
  }
}

export function openEditTilesView() {
  const view = document.getElementById('editTilesView');
  if (!view) return;
  hostEditViewForCurrentMode(); // v8.27 #43：先锚定激活面板容器再淡入（Scene 迁移先于过渡）
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
        persistTileOrder(); // v9.94 #34：增删后顺序持久化
        renderEditTilesLists();
      });
      // v7.62：尺寸拖拽手柄 —— 向左拖过阈值缩为 1×1，向右拖还原 2×1（阈值判定在 qs-tiles.js 纯函数）
      const handle = el.querySelector('.edit-resize-handle');
      if (handle) bindResizeHandle(handle, el, tile);
      // v9.94 #34：拖拽重排（A17 QPR2 QS customizer）—— 主体长拖换位，落位持久化
      el.dataset.tileId = tile.id;
      bindTileDrag(el);
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
        // v9.94 #204：大屏禁用（AOSP sw600dp 平板不出单手功能——磁贴从编辑器目录隐藏，
        // #204 验收 3；matchMedia 600px 与 pull-down-gesture.js L562 同款先例）
        if (tile.id === 'one_handed'
          && typeof window !== 'undefined'
          && window.matchMedia('(min-width: 600px)').matches) return;
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
          persistTileOrder(); // v9.94 #34：新增磁贴垫尾并持久化
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
      persistTileOrder(); // v9.94 #34：出厂序同步持久化（防旧 order 残留覆盖出厂布局）
      renderEditTilesLists();
      if (navigator.vibrate) navigator.vibrate(25);
    });
    resetRow.appendChild(resetBtn);
    availableContainer.appendChild(resetRow);
  }
}

/** v9.94 #34：当前激活序持久化（增删/重排/Reset 三处统一落盘） */
function persistTileOrder() {
  saveTileOrder(activeTiles.map((t) => t.id), typeof localStorage !== 'undefined' ? localStorage : null);
}

/** v9.94 #34：编辑器激活磁贴拖拽重排绑定（Pointer Events 自研，v7.11 状态机纪律）
 *  生命周期：down 记起点 → move 超 7px 阈值进拖拽态（抓起样式+振动）→ 指针下兄弟
 *  hitTest 真换位（appendChild + 基准重置防跳变）→ up 按 DOM 序写回 activeTiles +
 *  saveTileOrder + 重渲染。中断安全：pointercancel 同 up 走同一条落位链（松手在
 *  边界/快速连拖都收敛到 DOM 实序，无幻影位）。子动作优先：resize 手柄/remove
 *  角标 pointerdown 直通，不进拖拽态。 */
function bindTileDrag(el) {
  el.addEventListener('pointerdown', (e) => {
    // v9.94 #34：target 可能无 closest（document 级合成事件/极端代理场景）——安全门
    if (!(e.target && typeof e.target.closest === 'function')) return;
    if (e.target.closest('.edit-resize-handle, .edit-badge-remove')) return; // 子动作优先
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    const grid = document.getElementById('editActiveTilesGrid');
    if (!grid) return;
    let startX = e.clientX, startY = e.clientY, dragging = false;
    const move = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!dragging) {
        if (Math.hypot(dx, dy) < 7) return;
        dragging = true;
        el.classList.add('qs-tile-dragging');
        if (navigator.vibrate) navigator.vibrate(12);
      }
      // 指针下兄弟磁贴 hitTest → 真换位（DOM 序即视觉序）；换位后重置基准防跳变
      const hit = [...grid.children].find((c) => {
        if (c === el) return false;
        const r = c.getBoundingClientRect();
        return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      });
      if (hit) {
        const hr = hit.getBoundingClientRect();
        const after = (ev.clientX > hr.left + hr.width / 2) || (ev.clientY > hr.top + hr.height / 2);
        grid.insertBefore(el, after ? hit.nextSibling : hit);
        startX = ev.clientX; startY = ev.clientY;
        el.style.transform = '';
      } else {
        el.style.transform = `translate(${dx}px, ${dy}px)`;
      }
    };
    const finish = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      if (!dragging) return; // 未过阈值 = 误触，零副作用
      el.classList.remove('qs-tile-dragging');
      el.style.transform = '';
      // DOM 实序写回（dataset.tileId 为准，与 tile.id 弱同步：缺名跳过）
      const domOrder = [...grid.children].map((c) => c.dataset.tileId).filter(Boolean);
      activeTiles = applyTileOrder(activeTiles, domOrder);
      persistTileOrder();
      renderEditTilesLists();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
  });
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

// ==================== 电源对话框（v9.94 #113 GlobalActionsDialog A17 形态对齐） ====================
// 纯逻辑层：aosp/global-actions.js（动作注册表/可见性判定/二次确认状态机/关机阶段机）。
// 修复面：旧 shutdown 分支直接替换 document.body.innerHTML（无 AOSP 对应行为、
// 无重启自恢复区分）→ 关机态页 .md-shutdown-screen（ShutdownThread 完成语义，
// 点击=开机=location.reload()）；重启=黑屏短暂停留后自动 reload。

// 动作项定义表：id → {icon, label, danger}（DOM 装配用；动作语义/确认分派在纯逻辑层）。
const GA_ITEM_DEFS = [
  { id: 'power', icon: 'power', label: '关机', danger: true },
  { id: 'restart', icon: 'restart', label: '重启', danger: false },
  { id: 'aod', icon: 'bedtime', label: '熄屏', danger: false }, // md3 自创扩展（#35，非 AOSP 动作集成员）
  { id: 'lockdown', icon: 'lock', label: '锁定', danger: false },
  { id: 'emergency', icon: 'emergency', label: '紧急求救', danger: false },
];

// 模块级单例（initPowerDialog 幂等门 v9.90 坑①：同一 overlay 节点重复 init 跳过，
// body 重建后新节点无 _gaBound 标记自动重绑；确认机/阶段机跨重建持态）。
let __gaConfirm = null;
let __gaStage = null;
// v10.45 #114：外部收起状态机（initPowerDialog 创建；模块级持有跨 body 重建复用）
let __gaOutside = null;
// #114 可触摸区声明（onComputeInternalInsets 子视图并集同构）：动作列卡 + 确认卡整卡。
const GA_TOUCHABLE = declareTouchableRegions(['.power-dialog-card']);

function gaHaptic(ms) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
    }
  } catch { /* 触感为增益路径，失败静默 */ }
}

/** 关机态页：黑屏覆盖层（.md-shutdown-screen），点击任意处=开机（location.reload()）。 */
function gaShowShutdownScreen(text) {
  const prev = document.getElementById('mdShutdownScreen');
  if (prev) prev.remove();
  const screen = document.createElement('div');
  screen.className = 'md-shutdown-screen';
  screen.id = 'mdShutdownScreen';
  screen.textContent = text;
  screen.addEventListener('click', () => location.reload(), { once: true });
  document.body.appendChild(screen);
  document.body.style.opacity = '1';
  document.body.style.transition = '';
}

function initPowerDialog() {
  const overlay = document.getElementById('powerDialogOverlay');
  if (!overlay) return;

  // 二次确认状态机 + 关机阶段机（纯逻辑单例；模块级持有，body 重建后仍复用状态）。
  if (!__gaConfirm) __gaConfirm = createConfirmMachine();
  if (!__gaStage) __gaStage = createShutdownStage();
  const confirmMachine = __gaConfirm;
  const stage = __gaStage;
  // v10.45 #114：外部收起状态机（GA_CLOSE_TAP_OUTSIDE 同构，GlobalActionsDialogLite
  // L2292-2297 onSingleTapUp → cancel()：面板外单击 = 整窗收起；L2407-2414 窗口
  // MATCH_PARENT 全屏 + dim 遮罩，遮罩落点即外部）。ARM 门免疫开启手势——电源键
  // 长按 0.5s 的 down 拍先于 open()，open 前 feed 一律忽略。
  if (!__gaOutside) {
    __gaOutside = createOutsideDismissMachine({ mode: OutsideMode.DISMISS, onDismiss: () => closePowerDialog() });
  }
  const gaOutside = __gaOutside;

  // 幂等重绑（v9.90 坑①：body 重建后新 overlay 节点无 _gaBound，自动重绑；同节点跳过）。
  if (overlay._gaBound) return;
  overlay._gaBound = true;

  // 动作项 DOM 装配（GA_ITEM_DEFS → 按钮 innerHTML；样式类 .ga-item 在 CSS 层）。
  const defById = new Map(GA_ITEM_DEFS.map((d) => [d.id, d]));
  for (const def of GA_ITEM_DEFS) {
    const btn = overlay.querySelector(`[data-ga="${def.id}"]`);
    if (!btn) continue;
    btn.innerHTML = `${ICONS[def.icon]}<span>${def.label}</span>`;
  }

  // 确认卡元素。
  const col = overlay.querySelector('.ga-col');
  const confirmEl = overlay.querySelector('.ga-confirm');
  const confirmIcon = overlay.querySelector('.ga-confirm-icon');
  const confirmTitle = overlay.querySelector('.ga-confirm-title');
  const confirmBody = overlay.querySelector('.ga-confirm-body');
  const confirmOk = overlay.querySelector('#gaConfirmOk');
  const confirmCancel = overlay.querySelector('#gaConfirmCancel');

  function showConfirm(actionId) {
    const r = confirmMachine.request(actionId);
    if (!r.ok) return;
    const text = r.text;
    const def = defById.get(actionId);
    if (confirmIcon) confirmIcon.innerHTML = def ? ICONS[def.icon] : '';
    if (confirmTitle) confirmTitle.textContent = text.title;
    if (confirmBody) confirmBody.textContent = text.body;
    if (confirmOk) confirmOk.textContent = text.confirmLabel;
    if (col) col.hidden = true;
    if (confirmEl) confirmEl.hidden = false;
  }

  function hideConfirm() {
    confirmMachine.cancel();
    if (col) col.hidden = false;
    if (confirmEl) confirmEl.hidden = true;
  }

  /** 动作执行（确认机 confirmed 后或单击直执行类动作入口）。 */
  function executeAction(actionId) {
    if (actionId === 'power') {
      closePowerDialog();
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.6s ease';
      stage.advance('shutdown').then(() => {
        gaShowShutdownScreen('已关机 · 点击屏幕开机');
      });
    } else if (actionId === 'restart') {
      closePowerDialog();
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.6s ease';
      stage.advance('restart').then(() => location.reload());
    } else if (actionId === 'aod') {
      closePowerDialog();
      aodPowerOff();
    } else if (actionId === 'lockdown') {
      // AOSP Lockdown：立即锁定并要求凭据解锁；md3 无凭据体系（#185 查证在录）
      // → 执行等价 = lockNow() 立即锁屏 + toast 标注语义。
      closePowerDialog();
      lockNow();
      if (window.showSystemToast) {
        window.showSystemToast('已锁定', ICONS.lock);
      }
    } else if (actionId === 'screenshot') {
      // #94 二期（v10.45）：截图能力落地后真捕获接线（resolveVisibleActions
      // screenshotAvailable:true 解锁入列——v113 B3 纯函数锚同参数）
      closePowerDialog();
      if (window.__screenshot && window.__screenshot.capture) window.__screenshot.capture();
      else if (window.showSystemToast) window.showSystemToast('截图服务暂不可用', ICONS.close);
    } else if (actionId === 'emergency') {
      closePowerDialog();
      if (window.showSystemToast) {
        window.showSystemToast('正在拨打紧急电话 110/120/119...', ICONS.call);
      }
    }
  }

  // 动作点击路由：power/restart → 确认卡；其余单击直执行（AOSP 同语义）。
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closePowerDialog();
      return;
    }
    const item = e.target.closest('[data-ga]');
    if (item) {
      const actionId = item.dataset.ga;
      const meta = GA_ACTIONS.find((a) => a.id === actionId);
      gaHaptic(GA_HAPTIC_MS.open);
      if (meta && meta.confirm) showConfirm(actionId);
      else executeAction(actionId);
      return;
    }
    if (e.target === confirmCancel || (e.target.closest && e.target.closest('#gaConfirmCancel'))) {
      gaHaptic(GA_HAPTIC_MS.open);
      hideConfirm();
      return;
    }
    if (e.target === confirmOk || (e.target.closest && e.target.closest('#gaConfirmOk'))) {
      gaHaptic(GA_HAPTIC_MS.confirm);
      const r = confirmMachine.confirm();
      if (col) col.hidden = false;
      if (confirmEl) confirmEl.hidden = true;
      if (r.ok) executeAction(r.actionId);
    }
  });

  // v10.45 #114 外部收起主通道：pointerdown 判定（ACTION_OUTSIDE 于 down 拍派发——
  // GlobalActionsDialogLite L2415-2417 onTouchEvent → GestureDetector 同构；上方 click
  // 通道 e.target===overlay 保留为浏览器兜底，幂等无害）。卡片面落点 = consume，
  // 遮罩落点 = DISMISS（遮罩消费触摸 + 收起，下层不可触——模态语义）。
  overlay.addEventListener('pointerdown', (e) => {
    gaOutside.feedPointerDown(isInsideTouchable(e.target, GA_TOUCHABLE.selector));
  });

  // 调试钩子（e2e/回归用）。
  window.__globalActions = {
    confirmMachine,
    stage,
    showConfirm,
    hideConfirm,
    executeAction,
    visible: (locked) => resolveVisibleActions({ locked, screenshotAvailable: true }),
  };
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
  // 关机/重启执行后 overlay 内列表可能停在确认卡视图——每次打开复位到动作列。
  const col = overlay.querySelector('.ga-col');
  const confirmEl = overlay.querySelector('.ga-confirm');
  if (col) col.hidden = false;
  if (confirmEl) confirmEl.hidden = true;
  if (__gaOutside) __gaOutside.open(); // #114 ARM 门开（此后外部落点才开始判定）
  gaHaptic(GA_HAPTIC_MS.open);
  overlay.classList.add('active');
}

export function closePowerDialog() {
  if (__gaOutside) __gaOutside.close(); // #114 复位（open 前的 feed 不误触发）
  const overlay = document.getElementById('powerDialogOverlay');
  if (overlay) overlay.classList.remove('active');
}
