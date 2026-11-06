// ==================== volume-dialog.js — 音量对话框（AOSP volume/dialog 1:1 网页移植） ====================
// 源码依据（aosp-mirror/platform_frameworks_base packages/SystemUI）：
//   res/layout/volume_dialog.xml          → DOM 结构（铃声抽屉 + 主滑条 + 省略号，8dp 纵列）
//   res/layout/volume_dialog_slider.xml   → 52×254dp 竖置 M3 Slider（track 40dp/角12dp/
//                                           inside 2dp/stop 6dp/thumb 52×4dp 横柄）
//   volume/dialog/domain/interactor/VolumeDialogVisibilityInteractor.kt
//                                         → MAX_DIALOG_SHOW_TIME = 3.seconds 无操作自动收起
//   volume/dialog/sliders/ui/viewmodel/VolumeDialogSliderIconProvider.kt
//                                         → STREAM_MUSIC 图标三态（ic_volume_media_low 为
//                                           selector→ic_volume_media，实际两态：media / mute）
//   drawable/volume_dialog_background.xml → 60dp 宽 30dp 圆角 materialColorSurface 胶囊
//   QuickSettingsShadeOverlay.kt          → QS/Shade 面板无音量滑块；竖置滑条唯一场景 = 音量键
//   domain/interactor/VolumeDialogSafetyWarningInteractor.kt + shared/model/...Model.kt
//                                         → 安全警告显示判定/双态模型（#193 缺口一，
//                                           纯逻辑下沉 aosp/volume-safety-warning.js）
//   SoundDoseHelper.java（快照 README 行号锚）→ 越线不预落值/确认放行 pending/取消丢弃

import { ICONS } from './icons.js';
import { mediaService } from './media-service.js';
import { openApp } from './app-window.js';
import { initialApps } from './apps-data.js';
import { setRingerMode } from './sound-haptics.js'; // v9.94 #36：RingerMode 三态同步单一真源（silent 抑音）
// v9.94 #111：系统组合键路由（PhoneWindowManager 组合键拦截语义 + AccessibilityShortcutController 同构）
import { createKeyDispatcher, normalizeKeyName, ACCESSIBILITY_CHORD_HOLD_MS } from './aosp/key-dispatcher.js';
// v9.86 #110：媒体键映射（单键即时动作，与 #111 chord 保持语义正交）
import { keyToMediaAction } from './aosp/media-keys.js';
import {
  FLAG_SHOW_UI,
  FLAG_SHOW_UI_WARNINGS,
  SAFE_MEDIA_VOLUME_INACTIVE,
  SAFE_VOLUME_INDEX,
  safetyWarningInvisible,
  safetyWarningVisible,
  isShowingSafetyWarning,
  SafeVolumeState,
} from './aosp/volume-safety-warning.js';
import { buildSlidersModel } from './aosp/volume-sliders.js';
// v9.94 #109：音量键目标流判定（AudioService.getActiveStreamType 同构：通话>闹钟>媒体活跃>铃声）
import {
  resolveVolumeKeyTargetStream,
  targetStreamIconState,
  clampStreamVolume,
} from './aosp/volume-target-stream.js';
// v10.12 #112：面板落位与形态（adjustPositionOnScreen L419-429 同构：侧偏好 ×
// 竖屏 × 折叠半开 → gravity/类/滑入方向决策表；消费面单源）
import {
  VOLUME_SIDE_STORE_KEY,
  normalizeVolumeSide,
  resolveVolumePanelPlacement,
} from './aosp/volume-position.js';
// v9.94 #108：非模态触摸语义（onComputeInternalInsets TouchableRegion + ACTION_OUTSIDE 同构）
import {
  TOUCHABLE_SELECTOR,
  resolvePointerRole,
  DISMISS_REASON_TOUCH_OUTSIDE,
} from './aosp/volume-touch-insets.js';
// v10.12 #92：媒体输出切换器（MediaOutputDialog 纯逻辑层：buildMediaItems 列表模型/
// resolveRoute 路由判定/空间音频等价壳；A17 入口差异标注见 aosp/media-output.js 模块头）
import {
  MEDIA_ITEM_TYPE,
  GROUP_TITLES,
  SPATIAL_AUDIO,
  buildMediaItems,
  currentOutputRow,
  deviceIconKey,
  resolveRoute,
} from './aosp/media-output.js';
// v10.12 #92：降级标注 toast（单向依赖——quick-settings 零反向 import volume-dialog，无环）
import { showSystemToast } from './quick-settings.js';
// v10.12 #92：新浮层遵守 #114 公约（DISMISS 状态机 + 可触摸区声明 + Escape 补充通道）
import { OutsideMode, createOutsideDismissMachine, declareTouchableRegions, isInsideTouchable } from './aosp/overlay-touch-policy.js';
// v10.12 #117：双层音量架构 Layer2 流总线（非媒体流统一走总线落账；媒体持久化恢复；
// 静音提示状态机；首启引导由 media-service 首播派发承载）
import { targetToStream } from './aosp/audio-graph.js';
import { getAudioGraph } from './audio-graph-instance.js';

/** VisibilityInteractor.kt:47 private val MAX_DIALOG_SHOW_TIME: Duration = 3.seconds */
const MAX_DIALOG_SHOW_TIME = 3000;
/** STREAM_MUSIC 15 级步进（AudioManager index 范围 0-15 → 网页 0-100 等效换算） */
const KEY_STEP = 100 / 15;
/** #193 映射口径：音量键/拖拽两入口 flags 均为显式 UI 语义（AudioManager 公开 flag 组合） */
const UI_WARNING_FLAGS = FLAG_SHOW_UI | FLAG_SHOW_UI_WARNINGS;
/** sessionStorage 确认记忆键（#193 建议口径：会话内记忆，重载重置；比 AOSP Settings.Global
    持久化保守，刷新即恢复警告） */
const SAFETY_CONFIRMED_KEY = 'vd.safety.confirmed';

let currentVolume = 60;
let volumeBeforeMute = 60;
let ringerMode = 'ring';            // ring | vibrate | silent（RingerMode 三态）
let ringerExpanded = false;         // RingerDrawerState 抽屉展开态
let hideTimer = 0;
let inited = false;
// v9.94 #109：面板当前目标流（每次 show/步进重判——AOSP mActiveStream 动态跟踪同构）
let activeTarget = 'music';         // 'call' | 'alarm' | 'music' | 'ring'

// #109 ring 流真源 = settings:sound-v1（settings.js 声音页五通道单一真源同键直读写；
// v10.12 #117 起经 audio-graph 持久化适配器读写（同键同值），写入派发
// settings-sound-changed 与设置页滑条双向同步——议题「store 现成的 ring 真源」）
const SOUND_STORE_KEY = 'settings:sound-v1';
const readRingVolume = () => getAudioGraph().getLevel('ring');
const writeRingVolume = (v) => { getAudioGraph().setLevel('ring', v); };

/** 目标流快照（mediaService 流注册表 #193 心跳 + external 上报播放位；call/alarm 占位
 *  诚实标注：md3 无通话引擎，闹钟响铃态在 clock-app iframe 内部无宿主事件面——四档
 *  判定链与图标态全部在位，alarm/call 档以 false 落地，桥接留单列） */
const resolveTarget = () => {
  let mediaActiveTs = 0;
  try {
    mediaService.streams.forEach((rec) => {
      if ((rec.streamId === 'host-radio' || rec.streamId === 'external-music') && rec.lastActiveTs > mediaActiveTs) {
        mediaActiveTs = rec.lastActiveTs;
      }
    });
  } catch (e) {}
  const externalPlaying = !!(mediaService.external && mediaService.external.isPlaying);
  return resolveVolumeKeyTargetStream({
    callActive: false,
    alarmRinging: false,
    mediaPlaying: !!(mediaService.isPlaying || externalPlaying),
    mediaActiveTs,
  });
};

// #193 缺口一：安全警告状态（VolumeDialogSafetyWarningModel + SoundDoseHelper 状态机）
let safetyModel = safetyWarningInvisible();
const safeVolume = new SafeVolumeState(SAFE_VOLUME_INDEX);

let dialogEl = null;
let sliderEl = null;
let iconEl = null;
let ringerDrawerEl = null;
let settingsEl = null;
let safetyEl = null;
let floatColEl = null;
let captionEl = null;   // v10.12 #117：面板底部「应用音量」标注（.vd-layer-caption）

// #193 缺口二期：浮动滑条运行态（runningReduce 累积项——AOSP「滑条不消失」语义）
let prevSliderTypes = [];

let rectCache = null;
let rafId = 0;
let pendingY = 0;

// ==================== v10.12 #92：媒体输出切换器运行态 ====================
let outputRowEl = null;      // 面板顶部当前输出设备行（42dp 图标 + chevron，名称在 aria/title）
let moDialogEl = null;       // 输出对话框（.media-output-dialog：遮罩 + 圆角大卡）
let moListEl = null;
let moSpatialEl = null;
let moDevices = [];          // 设备列表真源（buildDeviceList：内置 + enumerateDevices 合并/降级模拟）
let moActiveId = 'builtin-speaker';
let spatialEnabled = false;  // 空间音频等价壳偏好（localStorage 持久化）
let moOutside = null;        // #114 公约 DISMISS 状态机（ensureMediaOutputDOM 创建）
const MO_TOUCHABLE = declareTouchableRegions(['.mo-card']);
const MO_ACTIVE_KEY = 'media-output:active';
const MO_SPATIAL_KEY = 'media-output:spatial';
const MO_CHEVRON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>';

/** 流图标（VolumeDialogSliderIconProvider 分流扩展 #109：music 两态 + ring/alarm/call 段；
    mute 语义 per-stream——目标流 level==0 即 mute 形态） */
const syncIcon = () => {
  if (!iconEl) return;
  const st = targetStreamIconState(activeTarget, currentVolume);
  iconEl.innerHTML = (ICONS[st.icon] || ICONS.volume)
    || (currentVolume === 0 ? (ICONS.volume_media_mute || ICONS.volume_mute) : (ICONS.volume_media || ICONS.volume));
};

/** 图标完全落入激活轨时切 onPrimary（trackIconActiveColor 视觉，同 v7.87 几何） */
const syncCovered = () => {
  if (!sliderEl) return;
  const t = currentVolume / 100;
  const fillH = 250 * t - 6;
  const iconBottom = Math.min(Math.max(250 * t - 54, 10), 196);
  sliderEl.classList.toggle('covered', fillH >= iconBottom + 40);
};

/** 应用音量值：--v 驱动 CSS 几何 + aria + mediaService 单一真源（music 目标流路径） */
const applyVolume = (value) => {
  currentVolume = Math.max(0, Math.min(100, Math.round(value)));
  if (currentVolume > 0) volumeBeforeMute = currentVolume;
  syncSlider();
  mediaService.setVolume(currentVolume / 100);
  syncIcon();
  syncCovered();
};

/** 滑条几何同步（--v + aria，applyVolume 与 #109 非媒体流路径共用） */
const syncSlider = () => {
  if (!sliderEl) return;
  sliderEl.style.setProperty('--v', String(currentVolume));
  sliderEl.setAttribute('aria-valuenow', String(currentVolume));
};

/** v9.94 #109 非媒体流落值路径：ring 写真源（settings:sound-v1 同键 + 事件同步），
    alarm/call 面板显值（真实通道消费面留单列）；安全警告守门为 STREAM_MUSIC 专属
    （SoundDoseHelper media 语义），其它流直落不预落值门 */
const applyStreamVolume = (value) => {
  const next = clampStreamVolume(value, 0);
  currentVolume = next;
  if (next > 0) volumeBeforeMute = next;
  // v10.12 #117：非媒体流落值统一走 Layer2 总线（targetToStream 桥：ring/alarm/call →
  // 同键持久化 settings:sound-v1 + settings-sound-changed 事件经 graph onChange 统一出口
  // 与设置页双向同步；alarm/call 自本版起同键记账——设置页五通道真源对齐，未来铃声/
  // 闹钟引擎挂节点即生效）；无节点消费面 → 图内仅记账（skipNode 语义由图内自判）
  getAudioGraph().setLevel(targetToStream(activeTarget), next);
  syncSlider();
  syncIcon();
  syncCovered();
};

/** 落值路由：music → 既有守门链；其它流 → #109 独立通道 */
const routeVolume = (value) => {
  if (activeTarget === 'music') { requestVolume(value); return; }
  applyStreamVolume(value);
};

/** 警告层显隐同步（Interactor L30-45 isShowingSafetyWarning 同构消费：
    Visible 无 SHOW_UI flags 时仅在对话框可见时降级显示） */
const syncSafetyVisibility = () => {
  if (!safetyEl) return;
  const showWarning = isShowingSafetyWarning(safetyModel, isVisible());
  safetyEl.hidden = !showWarning;
  safetyEl.setAttribute('aria-hidden', String(!showWarning));
  // 警告可见期间冻结 3s 无操作收起（否则对话框收起后警告层悬空，违背降级语义；
  // AOSP SafetyWarningDialog 由用户操作关闭，无自动超时）；关闭后恢复计时。
  if (showWarning) {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
  } else if (isVisible()) {
    scheduleHide();
  }
};

/** 确认放行（SoundDoseHelper L682-705 disableSafeMediaVolume 同构）：状态转 confirmed
    （sessionStorage 会话记忆）→ 放行 pendingVolumeCommand（onSetStreamVolume 同义） →
    onSafetyWarningDismissed 同义置 Invisible。 */
const confirmSafety = () => {
  try { sessionStorage.setItem(SAFETY_CONFIRMED_KEY, '1'); } catch { /* 隐私模式降级为仅内存 */ }
  const cmd = safeVolume.disableSafeMediaVolume();
  if (cmd) applyVolume(cmd.index);          // 放行暂存目标（含 flags 语义一并消费）
  safetyModel = safetyWarningInvisible();
  syncSafetyVisibility();
  if (navigator.vibrate) navigator.vibrate(8);
};

/** 取消丢弃（SoundDoseHelper L796-801 invalidatePendingVolumeCommand + Interactor L47-49
    onSafetyWarningDismissed 同构）：仅清 pending，音量保持原值（从未预落，无需回落）。 */
const dismissSafety = () => {
  safeVolume.invalidatePendingVolumeCommand();
  safetyModel = safetyWarningInvisible();
  syncSafetyVisibility();
  if (navigator.vibrate) navigator.vibrate(5);
};

/** 落值守门（SoundDoseHelper 状态机消费；adjustStreamVolume 入口 invalidate 同构——
    每次新调整先丢弃旧 pending）：
    - 本会话已确认（sessionStorage）→ 直通落值（SAFE_MEDIA_VOLUME_INACTIVE 语义）；
    - 未确认且越线 → willDisplayWarningAfterCheckVolume 暂存 pending + Visible(flags)，
      applyVolume 不执行（音量保持原值不预落——源码实证修正 #193「停在 60%」建议口径）；
    - 其余 → 正常落值。 */
const requestVolume = (value, flags = UI_WARNING_FLAGS) => {
  const target = Math.max(0, Math.min(100, Math.round(value)));
  let confirmed = false;
  try { confirmed = sessionStorage.getItem(SAFETY_CONFIRMED_KEY) === '1'; } catch { /* 同上 */ }
  if (confirmed || safeVolume.safeMediaVolumeState === SAFE_MEDIA_VOLUME_INACTIVE) {
    applyVolume(target);
    return;
  }
  // adjust 入口 invalidatePendingVolumeCommand 同构：新请求覆盖旧暂存
  safeVolume.invalidatePendingVolumeCommand();
  if (safeVolume.willDisplayWarningAfterCheckVolume(target, flags)) {
    safetyModel = safetyWarningVisible(flags);
    syncSafetyVisibility();
    return;                                   // 越线不预落值，保持原值
  }
  applyVolume(target);
};

/** 铃声模式图标（VolumeDialogSliderIconProvider ringer 分支 +
    RingerButtonUiModel：ring→ic_ring_volume / vibrate→ic_volume_ringer_vibrate /
    silent→ic_ring_volume_off） */
const ringerIcon = (mode) => {
  if (mode === 'vibrate') return ICONS.ringer_vibrate;
  if (mode === 'silent') return ICONS.ring_volume_off;
  return ICONS.ring_volume;
};

/** 渲染铃声抽屉：收起态仅现模式可见（单钮 42dp）；展开态三钮全显 + 现模式高亮 */
const renderRingerDrawer = () => {
  if (!ringerDrawerEl) return;
  const btns = ringerDrawerEl.querySelectorAll('.vd-ringer-btn');
  btns.forEach((btn) => {
    const mode = btn.dataset.mode;
    if (mode === ringerMode) btn.innerHTML = ringerIcon(mode);
    btn.hidden = !ringerExpanded && mode !== ringerMode;
    btn.classList.toggle('active', mode === ringerMode);
  });
};

/** 复位收起（选完即收） */
const collapseRingerDrawer = () => {
  ringerExpanded = false;
  renderRingerDrawer();
};

/** 无操作自动收起（VisibilityInteractor resetDismissTimeout → mapLatest delay(3s)）；
    安全警告可见期间冻结（否则 3s 后对话框收起警告层悬空，违背 Interactor 降级语义） */
const scheduleHide = () => {
  if (safetyEl && isShowingSafetyWarning(safetyModel, isVisible())) return;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => dismiss('timeout'), MAX_DIALOG_SHOW_TIME);
};

// ==================== v10.12 #112：面板落位与形态（adjustPositionOnScreen 同构） ====================

/** 当前侧偏好真源（localStorage 单点；非法值 normalizeVolumeSide 归 'right'——
 *  资源默认 21 RIGHT|CENTER_VERTICAL 同律，防脏值卡死落位） */
const readVolumeSide = () => {
  try { return normalizeVolumeSide(localStorage.getItem(VOLUME_SIDE_STORE_KEY) || ''); }
  catch (e) { return 'right'; }
};

/** Device Posture 特性检测读数（W3C Device Posture API；API 缺席 → ''——
 *  ≡ AOSP mDevicePostureController == null 分支 L406-412 不监听姿态恒原值） */
const readPostureType = () => {
  try { return (navigator.devicePosture && navigator.devicePosture.type) || ''; }
  catch (e) { return ''; }
};

/** 落位重判（onStart → adjustPositionOnScreen() L2569-2574 同构）：决策表单源注入
 *  侧类 / tabletop 类 / 滑入方向 --vd-enter-tx；gravity 整型仅记账于 data-gravity
 *  （等价 lp.gravity 观测面，e2e 断言用，不参与样式） */
const syncPlacement = () => {
  if (!dialogEl) return;
  const isPortrait = window.innerHeight > window.innerWidth;
  const p = resolveVolumePanelPlacement({
    side: readVolumeSide(),
    isPortrait,
    posture: readPostureType(),
  });
  dialogEl.classList.toggle('vd-side-left', !!p.sideClass);
  dialogEl.classList.toggle('vd-tabletop-top', !!p.topClass);
  dialogEl.style.setProperty('--vd-enter-tx', p.enterTranslateX === -1 ? '-16px' : '16px');
  dialogEl.dataset.gravity = String(p.gravity);
  dialogEl.dataset.tabletop = p.isTabletop ? '1' : '0';
};

/** 显示对话框（controller.notifyVisible(true) 同义）；每次显示重判目标流（AOSP
    mActiveStream 动态跟踪同构——静默期弹起面板即显铃声流值与图标）并重置 3s 计时；
    v10.12 #117：流值恢复改走总线单一真源 + 静音提示轮询随面板开合 */
const show = () => {
  if (!dialogEl) return;
  activeTarget = resolveTarget();
  // v10.12 #112：onStart → adjustPositionOnScreen() L2569-2574 同构——每次显示重算落位
  // （侧偏好读真源 + 竖屏 + Device Posture 特性检测；类与 --vd-enter-tx 决策表注入）
  syncPlacement();
  // v10.12 #117：面板流值 = Layer2 总线单一真源（ring 既有同键；media 持久化恢复——
  // 刷新后弹起面板即显落库值，不再是硬编码 60；alarm/call 自 v10.12 起同键记账恢复）
  currentVolume = activeTarget === 'ring'
    ? readRingVolume()
    : getAudioGraph().getLevel(targetToStream(activeTarget));
  if (currentVolume > 0) volumeBeforeMute = currentVolume;
  syncSlider();
  syncIcon();
  syncCovered();
  syncLayerCaption();
  startHintPolling();
  dialogEl.setAttribute('aria-hidden', 'false');
  dialogEl.classList.add('visible');
  rectCache = null;
  scheduleHide();
};

/** 收起对话框（DISMISS_REASON_TIMEOUT / TOUCH_OUTSIDE / BACK 等语义） */
const dismiss = () => {
  if (!dialogEl) return;
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
  collapseRingerDrawer();
  closeMediaOutput();            // #92 面板收起联动输出对话框（音量窗是父面）
  stopHintPolling();             // v10.12 #117：静音提示轮询随面板收起终池
  dialogEl.classList.remove('visible');
  dialogEl.setAttribute('aria-hidden', 'true');
};

const isVisible = () => !!dialogEl && dialogEl.classList.contains('visible');

// ==================== v10.12 #117：面板文案 + 静音提示（认知落差建议处理①③） ====================

/** 面板文案（建议处理③）：底部标注当前为「应用音量」——AOSP 面板顶部流名标签语义位
 *  （网页载体为 60dp 竖列面板底部；双层关系意识面，静态文案不随流切换） */
const syncLayerCaption = () => {
  if (!captionEl) return;
  captionEl.textContent = '应用音量';
};

let hintTimer = 0;
let hintFiredThisShow = false;
/** 静音提示轮询（建议处理①）：面板可见期每 500ms 采样主总线输出峰值；
 *  「播放中 + Layer2 非 0 + 图内路由 + 持续零信号 ≥ 2s」→ 一次性 toast
 *  「若仍无声音，请检查系统音量」（条件式措辞——不能断言系统音量为 0，
 *  网页不可读；跨域直连/无分析面不提示；每次 show 至多一次防噪声） */
const syncMuteHint = () => {
  if (!isVisible()) { stopHintPolling(); return; }
  const playing = !!(mediaService.isPlaying || (mediaService.external && mediaService.external.isPlaying));
  const verdict = getAudioGraph().audibilityHint('media', { playing, now: Date.now() });
  if (verdict === 'check-system-volume' && !hintFiredThisShow) {
    hintFiredThisShow = true;
    try { showSystemToast('若仍无声音，请检查系统音量'); } catch (e) {}
  }
};
const startHintPolling = () => {
  hintFiredThisShow = false;
  if (hintTimer) clearInterval(hintTimer);
  hintTimer = setInterval(syncMuteHint, 500);
  syncMuteHint();
};
const stopHintPolling = () => {
  if (hintTimer) { clearInterval(hintTimer); hintTimer = 0; }
};

// ==================== v10.12 #92：媒体输出切换器（MediaOutputDialog 网页等价） ====================

const loadMoPrefs = () => {
  try {
    moActiveId = localStorage.getItem(MO_ACTIVE_KEY) || 'builtin-speaker';
    spatialEnabled = localStorage.getItem(MO_SPATIAL_KEY) === '1';
  } catch (e) { /* 隐私模式降级仅内存 */ }
};

const saveMoPrefs = () => {
  try {
    localStorage.setItem(MO_ACTIVE_KEY, moActiveId);
    localStorage.setItem(MO_SPATIAL_KEY, spatialEnabled ? '1' : '0');
  } catch (e) { /* 同上 */ }
};

/** 设备列表真源（#77-A 降级链）：内置扬声器恒在 + enumerateDevices 音频输出合并
 *  （能力守卫 + default 剔除）；枚举不可用/为空 → 补模拟蓝牙设备（设置›已连接的
 *  设备 idx18 模拟同语义，simulated 标注随渲染层透出）。 */
const buildDeviceList = async () => {
  const list = [{ id: 'builtin-speaker', name: '内置扬声器', kind: 'speaker' }];
  try {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
      const devs = await navigator.mediaDevices.enumerateDevices();
      (devs || [])
        .filter((d) => d && d.kind === 'audiooutput' && d.deviceId && d.deviceId !== 'default')
        .slice(0, 4)
        .forEach((d) => list.push({ id: 'sink:' + d.deviceId, name: d.label || '音频输出设备', kind: 'speaker' }));
    }
  } catch (e) { /* 能力缺失走降级 */ }
  if (list.length === 1) list.push({ id: 'sim-bt-1', name: '蓝牙耳机（模拟）', kind: 'bluetooth', simulated: true });
  return list;
};

/** 顶部输出行渲染（currentOutputRow 缺省链：connected → speaker 形态兜底） */
const renderOutputRow = () => {
  if (!outputRowEl) return;
  const row = currentOutputRow({ devices: moDevices, connectedId: moActiveId });
  if (!row) { outputRowEl.hidden = true; return; }
  outputRowEl.hidden = false;
  outputRowEl.innerHTML = (ICONS[row.iconKey] || ICONS.volume) +
    '<span class="vd-output-chev" aria-hidden="true">' + MO_CHEVRON + '</span>';
  outputRowEl.setAttribute('aria-label', '媒体输出设备：' + row.name);
  outputRowEl.title = row.name;
};

/** 设备列表渲染（buildMediaItems 消费：组分隔/设备行/连接新设备项三类） */
const renderMoList = () => {
  if (!moListEl) return;
  const items = buildMediaItems({ devices: moDevices, connectedId: moActiveId });
  moListEl.innerHTML = items.map((it) => {
    if (it.type === MEDIA_ITEM_TYPE.GROUP_DIVIDER) {
      return '<div class="mo-divider" role="separator">' + it.title + '</div>';
    }
    if (it.type === MEDIA_ITEM_TYPE.PAIR_NEW_DEVICE) {
      return '<div class="mo-item mo-pair" aria-disabled="true">' + (ICONS.bluetooth || '') +
        '<span class="mo-name">' + GROUP_TITLES.pairNew + '<em>网页等价边界：无配对流程</em></span></div>';
    }
    const d = it.device;
    const active = d.id === moActiveId;
    return '<button type="button" class="mo-item' + (active ? ' active' : '') + '" data-device="' + d.id + '" role="option" aria-selected="' + active + '">' +
      (ICONS[deviceIconKey(d.kind)] || ICONS.volume) +
      '<span class="mo-name">' + d.name + (d.simulated ? ' <em>（模拟）</em>' : '') + '</span>' +
      (active ? '<span class="mo-check">' + (ICONS.check || '') + '</span>' : '') +
      '</button>';
  }).join('');
};

const isMediaOutputOpen = () => !!moDialogEl && moDialogEl.classList.contains('open');

const openMediaOutput = () => {
  if (!moDialogEl) return;
  renderMoList();
  if (moSpatialEl) {
    moSpatialEl.classList.toggle('on', spatialEnabled);
    moSpatialEl.setAttribute('aria-checked', String(spatialEnabled));
  }
  moDialogEl.classList.add('open');
  if (moOutside) moOutside.open(); // #114 ARM 门开
};

const closeMediaOutput = () => {
  if (!moDialogEl) return;
  moDialogEl.classList.remove('open');
  if (moOutside) moOutside.close(); // #114 复位
};

/** 输出对话框 DOM（MediaOutputBaseDialog L101/L262 device_list 同构：圆角大卡 +
 *  设备行 + 组分隔 + 连接新设备项 + 空间音频开关行；#114 公约 DISMISS 接入） */
function ensureMediaOutputDOM() {
  if (moDialogEl || !document.body) return;
  const style = document.createElement('style');
  style.textContent = `
.media-output-dialog{position:fixed;inset:0;z-index:9050;display:none}
.media-output-dialog.open{display:block}
.mo-scrim{position:absolute;inset:0;background:rgba(0,0,0,.5);opacity:0;transition:opacity .24s ease}
.media-output-dialog.open .mo-scrim{opacity:1}
.mo-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-46%) scale(.96);opacity:0;
  transition:transform .3s cubic-bezier(.2,.9,.25,1.02),opacity .2s ease;width:min(360px,calc(100% - 24px));
  max-height:76vh;overflow-y:auto;border-radius:28px;background:var(--md-surface-container,hsl(var(--md-h,215) 18% 14%));
  padding:18px 16px;box-shadow:0 12px 48px rgba(0,0,0,.5);color:var(--md-on-surface,#eee)}
.media-output-dialog.open .mo-card{transform:translate(-50%,-50%) scale(1);opacity:1}
.mo-header{font:600 16px/1.4 var(--md-font,sans-serif);margin-bottom:12px}
.mo-item{display:flex;align-items:center;gap:12px;width:100%;border:none;background:transparent;color:inherit;
  padding:12px 10px;border-radius:16px;cursor:pointer;font:500 14px var(--md-font,sans-serif);text-align:left}
.mo-item svg{width:22px;height:22px;flex-shrink:0}
.mo-item.active{background:var(--md-secondary-container,hsl(var(--md-h,215) 22% 18%));color:var(--md-on-secondary-container,#ddd)}
.mo-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mo-name em{font-style:normal;opacity:.7;font-size:12px}
.mo-check svg{width:18px;height:18px;color:var(--md-primary)}
.mo-divider{font:500 12px/1 var(--md-font,sans-serif);color:var(--md-on-surface-variant,#999);padding:10px 10px 6px}
.mo-pair{opacity:.55;cursor:default}
.mo-spatial{display:flex;align-items:center;gap:12px;padding:12px 10px;border-top:1px solid var(--md-outline-variant,transparent);margin-top:8px;cursor:pointer}
.mo-spatial-icon svg{width:22px;height:22px}
.mo-spatial-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;font:500 14px var(--md-font,sans-serif)}
.mo-spatial-text em{font-style:normal;font-size:11.5px;opacity:.65}
.mo-switch{width:40px;height:22px;border-radius:11px;background:var(--md-surface-container-highest,#444);position:relative;transition:background .2s;flex-shrink:0}
.mo-spatial.on .mo-switch{background:var(--md-primary)}
.mo-switch-thumb{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--md-on-surface,#fff);transition:left .2s}
.mo-spatial.on .mo-switch-thumb{left:21px}
@media (prefers-reduced-motion: reduce){.mo-card,.mo-scrim{transition:none}}
/* a11y 双通道属性副本（v10.12 #105） */
html[data-a11y-reduce-motion] .mo-card,html[data-a11y-reduce-motion] .mo-scrim{transition:none}
`;
  document.head.appendChild(style);
  moDialogEl = document.createElement('div');
  moDialogEl.className = 'media-output-dialog';
  moDialogEl.setAttribute('role', 'dialog');
  moDialogEl.setAttribute('aria-label', '媒体输出设备');
  moDialogEl.innerHTML = `
    <div class="mo-scrim"></div>
    <div class="mo-card">
      <header class="mo-header">媒体输出设备</header>
      <div class="mo-list" role="listbox" aria-label="输出设备列表"></div>
      <div class="mo-spatial" role="switch" aria-checked="false" tabindex="0">
        <span class="mo-spatial-icon">${ICONS.graphic_eq || ICONS.volume || ''}</span>
        <span class="mo-spatial-text">${SPATIAL_AUDIO.label}<em>${SPATIAL_AUDIO.note}</em></span>
        <span class="mo-switch"><span class="mo-switch-thumb"></span></span>
      </div>
    </div>`;
  document.body.appendChild(moDialogEl);
  moListEl = moDialogEl.querySelector('.mo-list');
  moSpatialEl = moDialogEl.querySelector('.mo-spatial');
  // #114 公约：DISMISS 状态机（scrim pointerdown 收起；卡片面 consume；Escape 补充通道）
  moOutside = createOutsideDismissMachine({ mode: OutsideMode.DISMISS, onDismiss: () => closeMediaOutput() });
  moDialogEl.addEventListener('pointerdown', (e) => {
    moOutside.feedPointerDown(isInsideTouchable(e.target, MO_TOUCHABLE.selector));
  }, true);
  moDialogEl.querySelector('.mo-scrim').addEventListener('click', () => closeMediaOutput());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMediaOutputOpen()) closeMediaOutput();
  });
  moListEl.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.mo-item[data-device]');
    if (!btn) return;
    const deviceId = btn.getAttribute('data-device');
    // setSinkId 需 Chromium 121+ 且 md3 无逐元素 sink 真源（mediaService 音频面未暴露）
    // → 恒走降级路径（#77-A：偏好记忆 + 事件广播 + toast 标注；真路由面留单列）
    const sinkCapable = false;
    const r = resolveRoute({ deviceId, sinkCapable, activeId: moActiveId });
    if (!r.changed) return;
    moActiveId = deviceId;
    saveMoPrefs();
    renderOutputRow();
    renderMoList();
    document.dispatchEvent(new CustomEvent('media-output-changed', { detail: { deviceId, routed: r.routed, degraded: r.degraded } }));
    if (r.degraded) showSystemToast('网页环境不支持输出路由，已记忆偏好（等价标注）');
    if (navigator.vibrate) navigator.vibrate(8);
    closeMediaOutput();
  });
  if (moSpatialEl) {
    moSpatialEl.addEventListener('click', () => {
      spatialEnabled = !spatialEnabled;
      moSpatialEl.classList.toggle('on', spatialEnabled);
      moSpatialEl.setAttribute('aria-checked', String(spatialEnabled));
      saveMoPrefs();
      if (navigator.vibrate) navigator.vibrate(6);
    });
  }
}

/** 浮动滑条渲染（#193 缺口二期；AOSP floatingSliderComponent 同义）：
    主滑条锚定本地可控 STREAM_MUSIC 通道（requestVolume→mediaService.setVolume 真源链），
    其余 sliderTypes（RemoteMediaStream/未来 SYSTEM·a11y 段）渲染为对话框左侧窄滑条——
    md3 胶囊 60dp 无下延空间，浮动滑条列与警告层同侧不重叠（警告仅越线时可见），
    缩小几何诚实标注（AOSP 浮动滑条与主滑条同规格同列下延）。 */
const FLOAT_LABELS = {
  'RemoteMediaStream:100': '音乐应用音量',
  'AudioSharingStream:99': '音频共享音量',
  'Stream:1': '系统音量',
  'Stream:10': '无障碍音量',
  'Stream:2': '铃声音量',
  'Stream:5': '通知音量',
};

const renderFloatingSliders = () => {
  if (!floatColEl) return;
  const { sliderTypes } = buildSlidersModel(mediaService.streamModels(), { prevSliderTypes });
  prevSliderTypes = sliderTypes;
  // 主滑条（本地可控 STREAM_MUSIC）不入浮动列；其余按 AOSP 排序渲染
  const floating = sliderTypes.filter((t) => t !== 'Stream:3');
  const alive = new Set(floating);
  [...floatColEl.children].forEach((el) => {
    if (!alive.has(el.dataset.streamKey)) el.remove();      // 流注销 → 滑条移除
  });
  floating.forEach((t) => {
    let el = floatColEl.querySelector(`[data-stream-key="${t}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'vdf-slider';
      el.dataset.streamKey = t;
      el.setAttribute('role', 'slider');
      el.setAttribute('aria-orientation', 'vertical');
      el.setAttribute('aria-valuemin', '0');
      el.setAttribute('aria-valuemax', '100');
      el.setAttribute('aria-label', FLOAT_LABELS[t] || '音量');
      el.innerHTML = '<div class="vdf-fill"></div>';
      // 远程段拖拽 → MEDIA_COMMAND 广播（iframe 音源宿主不可直接落值，遥控语义）
      el.addEventListener('pointerdown', (e) => {
        const rect = el.getBoundingClientRect();
        const setVal = (clientY) => {
          const v = Math.round(Math.max(0, Math.min(1, (rect.bottom - clientY) / Math.max(rect.height, 1))) * 100);
          el.style.setProperty('--v', String(v));
          el.setAttribute('aria-valuenow', String(v));
          mediaService.dispatchMediaCommand('volume', v);
          scheduleHide();
        };
        setVal(e.clientY);
        const onMove = (me) => setVal(me.clientY);
        const finish = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', finish);
          window.removeEventListener('pointercancel', finish);
          if (navigator.vibrate) navigator.vibrate(8);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', finish);
        window.addEventListener('pointercancel', finish);
      });
      floatColEl.appendChild(el);
    }
    // 远程段无宿主侧音量真源（iframe 内部 audio），显示系统音量同值诚实标注
    el.style.setProperty('--v', String(currentVolume));
  });
};

/** 音量键步进（AudioManager adjustStreamVolume 同义：目标流经 #109 getActiveStreamType
    判定——媒体活跃调媒体流，静默回落铃声流；±KEY_STEP per-stream，钳位 0-100；
    music 落值经 #193 安全警告守门 requestVolume） */
const stepVolume = (delta) => {
  activeTarget = resolveTarget();
  if (activeTarget === 'music') {
    requestVolume(currentVolume + delta);
  } else if (activeTarget === 'ring') {
    applyStreamVolume(readRingVolume() + delta);
  } else {
    applyStreamVolume(currentVolume + delta);
  }
  show();
  scheduleHide();
  if (navigator.vibrate) navigator.vibrate(5);
};

/** v9.94 #107：导航栏附加音量键公开入口（步数语义 n×KEY_STEP 15 级单点换算）——
    #109 目标流判定 / #108 非模态面板 / 3s 自动收起全量复用，nav-bar.js 零复制逻辑 */
export const stepVolumeBySteps = (n) => stepVolume(n * KEY_STEP);

const applyValue = (clientY) => {
  const rect = rectCache || sliderEl.getBoundingClientRect();
  // 行程 [2, 252]（thumbWidth/2 边距）：自底向上取值（落值经 #109 路由：music 守门 /
  // ring 真源直落 / 其它流显值）
  const value = ((rect.bottom - clientY - 2) / Math.max(rect.height - 4, 1)) * 100;
  routeVolume(value);
};

const scheduleValue = (clientY) => {
  pendingY = clientY;
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    applyValue(pendingY);
  });
};

/** 初始化音量对话框（main.js 启动序列调用一次） */
export function initVolumeDialog() {
  if (inited) return;
  dialogEl = document.getElementById('volumeDialog');
  sliderEl = document.getElementById('vdSlider');
  iconEl = document.getElementById('vdIcon');
  ringerDrawerEl = document.getElementById('vdRingerDrawer');
  settingsEl = document.getElementById('vdSettingsBtn');
  safetyEl = document.getElementById('vdSafety');
  floatColEl = document.getElementById('vdFloatSliders');
  captionEl = document.getElementById('vdLayerCaption');   // v10.12 #117：面板文案
  if (!dialogEl || !sliderEl) return;
  inited = true;
  syncLayerCaption();
  // v10.12 #117：调试/测试桥（e2e 与控制台；生产零消费，同 v10.12 __themeColorTest 惯例）
  try { window.__audioGraphTest = { graph: getAudioGraph, mediaService }; } catch (e) {}

  // #193 二期：浮动滑条随流注册表变更/音量变化重渲染（subscribe 回调含初值）
  if (floatColEl) {
    mediaService.subscribe(() => renderFloatingSliders());
    renderFloatingSliders();
  }

  // ==================== v10.12 #112：落位联动监听 ====================
  // ① 姿态变更（Device Posture API 特性检测）：onPostureChanged L2509-2512 同构——
  //    dismiss(DISMISS_REASON_POSTURE_CHANGED) 姿态变更即收起（下次 show 重算落位）；
  //    API 缺席不挂监听 ≡ AOSP null controller 分支（callback 置 null）。
  try {
    if (navigator.devicePosture && typeof navigator.devicePosture.addEventListener === 'function') {
      navigator.devicePosture.addEventListener('change', () => {
        if (isVisible()) dismiss();
      });
    }
  } catch (e) { /* API 缺席环境静默（诚实降级，非故障） */ }
  // ② 侧偏好运行时切换（设置›系统导航页派发 volume-side-changed——navbar-changed
  //    同构惯例）：可见期立即重判（AOSP 无 overlay 运行时变更语义，md3 超越项：
  //    偏好即改即生效，无需重开面板）；隐藏态静默（下次 show 重算兜底）。
  window.addEventListener('volume-side-changed', () => {
    if (isVisible()) syncPlacement();
  });

  // 安全警告层两钮（SoundDoseHelper 确认/取消语义 + Interactor onSafetyWarningDismissed）
  if (safetyEl) {
    const iconHost = safetyEl.querySelector('.vd-safety-icon');
    if (iconHost) iconHost.innerHTML = ICONS.hearing_devices || '';   // 听力保护语义（已 vendor 字形）
    safetyEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-safety]');
      if (!btn) return;
      e.stopPropagation();
      if (btn.dataset.safety === 'confirm') confirmSafety();
      else dismissSafety();
    });
  }

  // ==================== v9.94 #111：系统组合键路由 ====================
  // AOSP 同构：①无障碍快捷键 = 音量上+下同时长按 3s（AccessibilityShortcutController
  // triggerAccessibilityShortcut：触发 toast + 震动，音量步进并行不互斥）；
  // ②截图组合键 = Ctrl+Shift+S 齐按即触发（KEYCODE_SYSRQ 电源+音量下 的网页等价映射，
  // 铁律#2 超越边界标注；出口接 #94 截图服务——toast 先行，#94 落地后替换为真捕获）
  const keyDispatcher = createKeyDispatcher({
    chords: [
      { id: 'accessibility_shortcut', keys: ['volume-up', 'volume-down'], holdMs: ACCESSIBILITY_CHORD_HOLD_MS },
      { id: 'screenshot_sysrq', keys: ['control', 'shift', 's'], holdMs: 0 },
    ],
    onTrigger: (chord) => {
      if (chord.id === 'accessibility_shortcut') {
        // AOSP AccessibilityShortcutController：触发时 toast + 震动提示（服务开关语义）
        if (window.showSystemToast) {
          window.showSystemToast('无障碍快捷方式已触发（音量键长按 3 秒）', ICONS.colour_correction || ICONS.accessibility_new || ICONS.auto_awesome);
        }
        if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
      } else if (chord.id === 'screenshot_sysrq') {
        // KEYCODE_SYSRQ → TakeScreenshotService 出口：#94 v10.12 真捕获已接
        // （光栅源 + Shelf + Markup 全链，原「toast 占位」退役——v111 接线锚不变）
        if (window.__screenshot && window.__screenshot.capture) {
          window.__screenshot.capture();
        } else if (window.showSystemToast) {
          window.showSystemToast('截图服务暂不可用', ICONS.screenshot || ICONS.auto_awesome);
        }
        if (navigator.vibrate) navigator.vibrate(30);
      }
    },
  });
  // holdMs=3000 的 chord 需要 poll：keydown 期间的 3s 无事件流（按住不产生 repeat 前
  // 的键也可能无 repeat）→ 双保险 setTimeout poll（接线层职责，纯逻辑零 setTimeout）
  const armPollTimer = () => {
    const due = keyDispatcher.checkDue();
    if (due.action === 'none' && keyDispatcher.__state().armed.length > 0) {
      setTimeout(armPollTimer, 250);
    }
  };
  const origFeed = keyDispatcher.feed.bind(keyDispatcher);
  keyDispatcher.feed = (type, key) => {
    const r = origFeed(type, key);
    if (keyDispatcher.__state().armed.length > 0) setTimeout(armPollTimer, 250);
    return r;
  };

  // 音量键（浏览器媒体键：Chrome key = AudioVolumeUp/Down/Mute，Windows 旧版 = VolumeUp/Down）
  window.addEventListener('keydown', (e) => {
    // v9.86 #110：媒体键路由 —— AOSP dispatchMediaKeyEvent → 唯一 media button
    // session（MediaSessionStack.getPriorityList 三级仲裁，aosp/media-keys.js）；
    // 单键即时动作不喂 dispatcher（chord 保持语义正交划界）；按键值匹配 =
    // 天然特性检测（#77-A：不支持的平台该键值永不出火零报错）。
    const mediaAct = keyToMediaAction(e.key);
    if (mediaAct) {
      e.preventDefault();
      // 播放/暂停类一次性动作忽略 key auto-repeat（AOSP 键重复由 session 侧
      // 处理，toggle 双触发是网页侧伪信号）；next/prev/快进快退保留 repeat（长按连续跳）
      if (!(e.repeat && (mediaAct.action === 'play_pause' || mediaAct.action === 'play' || mediaAct.action === 'pause'))) {
        mediaService.dispatchMediaKey(mediaAct.action);
      }
      return;   // 媒体键已消费：不唤起音量对话框、不入 chord 流（AOSP 媒体键不走音量 UI）
    }
    if (e.key === 'AudioVolumeUp' || e.key === 'VolumeUp') {
      e.preventDefault();
      stepVolume(KEY_STEP);
    } else if (e.key === 'AudioVolumeDown' || e.key === 'VolumeDown') {
      e.preventDefault();
      stepVolume(-KEY_STEP);
    } else if (e.key === 'AudioVolumeMute' || e.key === 'VolumeMute') {
      e.preventDefault();
      // v9.94 #109：静音目标按目标流分道——music 沿既有 0/before 切换（守门免检：
      // 越线判据 index>safe 只对 raise 方向）；ring 切换 settings:sound-v1 真源
      activeTarget = resolveTarget();
      if (activeTarget === 'ring') {
        const cur = readRingVolume();
        applyStreamVolume(cur === 0 ? volumeBeforeMute : 0);
      } else if (activeTarget === 'music') {
        applyVolume(currentVolume === 0 ? volumeBeforeMute : 0);
      } else {
        applyStreamVolume(currentVolume === 0 ? volumeBeforeMute : 0);
      }
      show();
      scheduleHide();
      if (navigator.vibrate) navigator.vibrate(10);
    } else if (e.key === 'Escape' && isVisible()) {
      dismiss();   // back 键收起（DISMISS_REASON_BACK 同义）
    }

    // v9.94 #111：组合键路由 —— 音量键事件流同时喂 dispatcher（AOSP：音量键
    // 照常步进音量 + 组合键并行检测，AccessibilityShortcutController 同款不互斥）
    keyDispatcher.feed('down', normalizeKeyName(e.key));
  });

  // v9.94 #111：keyup 流（组合键释放语义必需——PhoneWindowManager 拦截 up 事件同源）
  window.addEventListener('keyup', (e) => {
    keyDispatcher.feed('up', normalizeKeyName(e.key));
  });

  // 主滑条拖拽管线（与亮度条同构：rAF 节流 + 落点即时应用）
  sliderEl.addEventListener('pointerdown', (e) => {
    rectCache = sliderEl.getBoundingClientRect();
    applyValue(e.clientY);
    show();
    scheduleHide();

    const onMove = (me) => {
      scheduleValue(me.clientY);
      scheduleHide();          // 交互中持续续期（resetDismissTimeout）
    };
    const finish = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      applyValue(pendingY);
      if (navigator.vibrate) navigator.vibrate(8);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  });

  // 触对话框任意处续期（VisibilityInteractor：交互重置超时）
  dialogEl.addEventListener('pointerdown', scheduleHide);

  // 铃声抽屉：点击展开/选择（RingerDrawerViewModel 语义：收起单钮 → 展开三钮 → 选定收起）
  if (ringerDrawerEl) {
    ringerDrawerEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.vd-ringer-btn');
      if (!btn) return;
      e.stopPropagation();
      const mode = btn.dataset.mode;
      if (mode === ringerMode && !ringerExpanded) {
        ringerExpanded = true;                 // 点现模式钮 → 展开抽屉
      } else {
        ringerMode = mode;                     // 选新模式 → 生效并收起
        setRingerMode(mode);                   // v9.94 #36：同步系统音效引擎（silent 抑音 + 持久化）
        collapseRingerDrawer();
      }
      renderRingerDrawer();
      scheduleHide();
      if (navigator.vibrate) navigator.vibrate(8);
    });
  }
  renderRingerDrawer();

  // 省略号：打开系统设置（真机 = 展开完整音量面板，网页以 Settings App 声音区承接）
  if (settingsEl) {
    settingsEl.innerHTML = ICONS.ellipsis;
    settingsEl.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
      const idx = initialApps.findIndex((a) => a.id === 'settings');
      if (idx !== -1) openApp(idx, document.querySelector('[data-id="settings"]'));
    });
  }

  // v10.12 #92：顶部输出行 + 输出对话框（MediaOutputDialog 网页等价；A17 省略号→
  // openVolumePanel 语义的 md3 承接面，入口差异标注见 aosp/media-output.js 模块头）
  outputRowEl = document.getElementById('vdOutputRow');
  loadMoPrefs();
  ensureMediaOutputDOM();
  renderOutputRow();
  buildDeviceList().then((list) => { moDevices = list; renderOutputRow(); });
  if (outputRowEl) {
    outputRowEl.addEventListener('click', (e) => {
      e.stopPropagation();
      openMediaOutput();
      if (navigator.vibrate) navigator.vibrate(8);
    });
  }

  // v9.94 #108 触外界收起（VolumeDialogImpl.onTouchEvent ACTION_OUTSIDE 同构，L2587-2593）+
  // onComputeInternalInsets 触摸面判定（L465-487：触摸面=子视图并集，容器自身零触摸面）。
  // 穿透由 CSS 分层承接（.volume-dialog 容器 pointer-events:none，控件 opt-in auto）——
  // 落在间隙/胶囊背景的触摸按 hit-test 直接落至下层元素，capture 监听按触摸面并集
  // 判角色：控件面 consume / 其余（含 bounds 内非控件区，NOTE L2581-2584 原文）
  // = ACTION_OUTSIDE → dismissH(DISMISS_REASON_TOUCH_OUTSIDE)。
  document.addEventListener('pointerdown', (e) => {
    // v10.12 #92 窗口分层守卫：输出对话框 = body 级独立浮层"窗口"（MediaOutputBaseDialog
    // window TYPE_KEYGUARD_DIALOG 同构）——落点在其内时属上层窗消费，不入音量窗
    // ACTION_OUTSIDE 判定（DOM 无真实窗口边界，以最近浮层祖先代偿）
    if (e.target && e.target.closest && e.target.closest('.media-output-dialog')) return;
    const insideTouchable = !!(e.target.closest && e.target.closest(TOUCHABLE_SELECTOR));
    if (resolvePointerRole({ visible: isVisible(), insideTouchable }) === 'outside') {
      dismiss(DISMISS_REASON_TOUCH_OUTSIDE);
    }
  }, true);

  // v10.12 #117：启动初值 = 总线恢复值（settings:sound-v1 media 键单一真源——原
  // applyVolume(60) 硬编码缺省在每次启动经记账链覆写持久化值；恢复值经
  // mediaService.setVolume 落账同键回写自洽，面板/引擎/存储三者一致）
  currentVolume = getAudioGraph().getLevel('media');
  if (currentVolume > 0) volumeBeforeMute = currentVolume;
  applyVolume(currentVolume);
}

/** 测试导出（vitest happy-dom 状态机真跑入口；生产路径零消费） */
export const __testHooks = () => ({
  safeVolume,
  requestVolume,
  confirmSafety,
  dismissSafety,
  renderFloatingSliders,
  getSafetyModel: () => safetyModel,
  // v9.94 #109：目标流判定/真源读写测试面（生产零消费）
  resolveTarget,
  readRingVolume,
  writeRingVolume,
  stepVolume,
  // v10.12 #92：媒体输出切换器测试面（生产零消费）
  buildDeviceList,
  renderOutputRow,
  renderMoList,
  openMediaOutput,
  closeMediaOutput,
  buildMediaItems,
  resolveRoute,
  get moDevices() { return moDevices; },
  get moActiveId() { return moActiveId; },
  get spatialEnabled() { return spatialEnabled; },
  get activeTarget() { return activeTarget; },
  get currentVolume() { return currentVolume; },
});
