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

import { ICONS } from './icons.js';
import { mediaService } from './media-service.js';
import { openApp } from './app-window.js';
import { initialApps } from './apps-data.js';

/** VisibilityInteractor.kt:47 private val MAX_DIALOG_SHOW_TIME: Duration = 3.seconds */
const MAX_DIALOG_SHOW_TIME = 3000;
/** STREAM_MUSIC 15 级步进（AudioManager index 范围 0-15 → 网页 0-100 等效换算） */
const KEY_STEP = 100 / 15;

let currentVolume = 60;
let volumeBeforeMute = 60;
let ringerMode = 'ring';            // ring | vibrate | silent（RingerMode 三态）
let ringerExpanded = false;         // RingerDrawerState 抽屉展开态
let hideTimer = 0;
let inited = false;

let dialogEl = null;
let sliderEl = null;
let iconEl = null;
let ringerDrawerEl = null;
let settingsEl = null;

let rectCache = null;
let rafId = 0;
let pendingY = 0;

/** 流图标（VolumeDialogSliderIconProvider STREAM_MUSIC 分支）：
    level==0/isMuted → ic_volume_media_mute；否则 ic_volume_media（low selector 同源） */
const syncIcon = () => {
  if (!iconEl) return;
  iconEl.innerHTML = currentVolume === 0
    ? (ICONS.volume_media_mute || ICONS.volume_mute)
    : (ICONS.volume_media || ICONS.volume);
};

/** 图标完全落入激活轨时切 onPrimary（trackIconActiveColor 视觉，同 v7.87 几何） */
const syncCovered = () => {
  if (!sliderEl) return;
  const t = currentVolume / 100;
  const fillH = 250 * t - 6;
  const iconBottom = Math.min(Math.max(250 * t - 54, 10), 196);
  sliderEl.classList.toggle('covered', fillH >= iconBottom + 40);
};

/** 应用音量值：--v 驱动 CSS 几何 + aria + mediaService 单一真源 */
const applyVolume = (value) => {
  currentVolume = Math.max(0, Math.min(100, Math.round(value)));
  if (currentVolume > 0) volumeBeforeMute = currentVolume;
  if (sliderEl) {
    sliderEl.style.setProperty('--v', String(currentVolume));
    sliderEl.setAttribute('aria-valuenow', String(currentVolume));
  }
  mediaService.setVolume(currentVolume / 100);
  syncIcon();
  syncCovered();
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

/** 无操作自动收起（VisibilityInteractor resetDismissTimeout → mapLatest delay(3s)） */
const scheduleHide = () => {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => dismiss('timeout'), MAX_DIALOG_SHOW_TIME);
};

/** 显示对话框（controller.notifyVisible(true) 同义）；每次显示重置 3s 计时 */
const show = () => {
  if (!dialogEl) return;
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

/** 音量键步进（AudioManager adjustStreamVolume 同义：±KEY_STEP，钳位 0-100） */
const stepVolume = (delta) => {
  applyVolume(currentVolume + delta);
  show();
  scheduleHide();
  if (navigator.vibrate) navigator.vibrate(5);
};

const applyValue = (clientY) => {
  const rect = rectCache || sliderEl.getBoundingClientRect();
  // 行程 [2, 252]（thumbWidth/2 边距）：自底向上取值
  const value = ((rect.bottom - clientY - 2) / Math.max(rect.height - 4, 1)) * 100;
  applyVolume(value);
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
  if (!dialogEl || !sliderEl) return;
  inited = true;

  // 音量键（浏览器媒体键：Chrome key = AudioVolumeUp/Down/Mute，Windows 旧版 = VolumeUp/Down）
  window.addEventListener('keydown', (e) => {
    if (e.key === 'AudioVolumeUp' || e.key === 'VolumeUp') {
      e.preventDefault();
      stepVolume(KEY_STEP);
    } else if (e.key === 'AudioVolumeDown' || e.key === 'VolumeDown') {
      e.preventDefault();
      stepVolume(-KEY_STEP);
    } else if (e.key === 'AudioVolumeMute' || e.key === 'VolumeMute') {
      e.preventDefault();
      applyVolume(currentVolume === 0 ? volumeBeforeMute : 0);
      show();
      scheduleHide();
      if (navigator.vibrate) navigator.vibrate(10);
    } else if (e.key === 'Escape' && isVisible()) {
      dismiss();   // back 键收起（DISMISS_REASON_BACK 同义）
    }
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

  // 触外界收起（DISMISS_REASON_TOUCH_OUTSIDE 同义）
  document.addEventListener('pointerdown', (e) => {
    if (isVisible() && !e.target.closest('.volume-dialog')) dismiss();
  }, true);

  applyVolume(currentVolume);
}
