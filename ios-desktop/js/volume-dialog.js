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
// v9.94 #108：非模态触摸语义（onComputeInternalInsets TouchableRegion + ACTION_OUTSIDE 同构）
import {
  TOUCHABLE_SELECTOR,
  resolvePointerRole,
  DISMISS_REASON_TOUCH_OUTSIDE,
} from './aosp/volume-touch-insets.js';

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
// 写入派发 settings-sound-changed 与设置页滑条双向同步——议题「store 现成的 ring 真源」）
const SOUND_STORE_KEY = 'settings:sound-v1';
const readRingVolume = () => {
  try {
    const s = JSON.parse(localStorage.getItem(SOUND_STORE_KEY) || '{}');
    const v = Number(s.ring);
    return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 70; // DEFAULTS.ring=70 同源
  } catch (e) { return 70; }
};
const writeRingVolume = (v) => {
  try {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(SOUND_STORE_KEY) || '{}') || {}; } catch (e) {}
    s.ring = Math.max(0, Math.min(100, Math.round(v)));
    localStorage.setItem(SOUND_STORE_KEY, JSON.stringify(s));
    document.dispatchEvent(new CustomEvent('settings-sound-changed', { detail: { key: 'ring', value: s.ring } }));
  } catch (e) { /* 隐私模式降级仅内存 */ }
};

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

// #193 缺口二期：浮动滑条运行态（runningReduce 累积项——AOSP「滑条不消失」语义）
let prevSliderTypes = [];

let rectCache = null;
let rafId = 0;
let pendingY = 0;

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
  if (activeTarget === 'ring') writeRingVolume(next);
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

/** 显示对话框（controller.notifyVisible(true) 同义）；每次显示重判目标流（AOSP
    mActiveStream 动态跟踪同构——静默期弹起面板即显铃声流值与图标）并重置 3s 计时 */
const show = () => {
  if (!dialogEl) return;
  activeTarget = resolveTarget();
  if (activeTarget === 'ring') {
    currentVolume = readRingVolume();
    if (currentVolume > 0) volumeBeforeMute = currentVolume;
    syncSlider();
    syncIcon();
    syncCovered();
  }
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
  dialogEl.classList.remove('visible');
  dialogEl.setAttribute('aria-hidden', 'true');
};

const isVisible = () => !!dialogEl && dialogEl.classList.contains('visible');

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
  if (!dialogEl || !sliderEl) return;
  inited = true;

  // #193 二期：浮动滑条随流注册表变更/音量变化重渲染（subscribe 回调含初值）
  if (floatColEl) {
    mediaService.subscribe(() => renderFloatingSliders());
    renderFloatingSliders();
  }

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
        // KEYCODE_SYSRQ → TakeScreenshotService 出口：#94 截图+Markup 服务 toast 先行
        if (window.showSystemToast) {
          window.showSystemToast('截图组合键已触发（#94 截图服务落地后接入真捕获）', ICONS.screenshot || ICONS.auto_awesome);
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

  // v9.94 #108 触外界收起（VolumeDialogImpl.onTouchEvent ACTION_OUTSIDE 同构，L2587-2593）+
  // onComputeInternalInsets 触摸面判定（L465-487：触摸面=子视图并集，容器自身零触摸面）。
  // 穿透由 CSS 分层承接（.volume-dialog 容器 pointer-events:none，控件 opt-in auto）——
  // 落在间隙/胶囊背景的触摸按 hit-test 直接落至下层元素，capture 监听按触摸面并集
  // 判角色：控件面 consume / 其余（含 bounds 内非控件区，NOTE L2581-2584 原文）
  // = ACTION_OUTSIDE → dismissH(DISMISS_REASON_TOUCH_OUTSIDE)。
  document.addEventListener('pointerdown', (e) => {
    const insideTouchable = !!(e.target.closest && e.target.closest(TOUCHABLE_SELECTOR));
    if (resolvePointerRole({ visible: isVisible(), insideTouchable }) === 'outside') {
      dismiss(DISMISS_REASON_TOUCH_OUTSIDE);
    }
  }, true);

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
  get activeTarget() { return activeTarget; },
  get currentVolume() { return currentVolume; },
});
