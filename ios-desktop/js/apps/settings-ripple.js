// ==================== settings-ripple.js — 设置「充电涟漪」卡交互（v7.80） ====================
//
// 职责（独立副作用模块，import 即生效，模式同 settings-battery.js）：
//   1. 充电涟漪配置（localStorage rippleCfg_v1）↔ 设置电池页「充电涟漪」卡双向同步：
//      手机/平板充电口位置 chip + 涟漪颜色 swatch（跟随主题 / 六色自选）
//   2. 预览按钮 → playChargingRipplePreview()（跳过防抖立即播一次）
//   3. 事件走 document 级委托（页面重渲染无需重绑）；chip/swatch 活动态由
//      syncRippleCfgUi() 按 localStorage 真值回写（电池订阅 tick + 初始 rAF 双保险）
//
// 配置真源与涟漪引擎共用 charging-ripple.js 的 rippleCfg_v1 键（readRippleCfg 同构）。

import { playChargingRipplePreview } from '../charging-ripple.js';
import { subscribeBattery } from '../battery-service.js';

const RIPPLE_CFG_KEY = 'rippleCfg_v1';
const DEFAULTS = { portPhone: 'bc', portTablet: 'lc', color: '' };

function readCfg() {
  try {
    const v = JSON.parse(localStorage.getItem(RIPPLE_CFG_KEY) || '{}') || {};
    return {
      portPhone: ['bc', 'br', 'cc'].includes(v.portPhone) ? v.portPhone : DEFAULTS.portPhone,
      portTablet: ['lc', 'rc'].includes(v.portTablet) ? v.portTablet : DEFAULTS.portTablet,
      color: typeof v.color === 'string' ? v.color : DEFAULTS.color,
    };
  } catch (e) { return { ...DEFAULTS }; }
}

function writeCfg(patch) {
  const next = { ...readCfg(), ...patch };
  try { localStorage.setItem(RIPPLE_CFG_KEY, JSON.stringify(next)); } catch (e) { /* 隐私模式静默 */ }
  syncRippleCfgUi();
}

/** 把 localStorage 真值回写到设置卡 chip/swatch 活动态（元素离场静默跳过） */
export function syncRippleCfgUi() {
  const cfg = readCfg();
  document.querySelectorAll('#ripplePortPhoneSeg .ripple-chip').forEach((chip) => {
    chip.setAttribute('aria-pressed', String(chip.dataset.port === cfg.portPhone));
  });
  document.querySelectorAll('#ripplePortTabletSeg .ripple-chip').forEach((chip) => {
    chip.setAttribute('aria-pressed', String(chip.dataset.port === cfg.portTablet));
  });
  document.querySelectorAll('#rippleColorRow .ripple-swatch').forEach((sw) => {
    sw.setAttribute('aria-pressed', String((sw.dataset.color || '') === cfg.color));
  });
}

document.addEventListener('click', (e) => {
  const preview = e.target.closest('#ripplePreviewBtn');
  if (preview) {
    if (navigator.vibrate) navigator.vibrate(12);
    playChargingRipplePreview();
    return;
  }
  const chip = e.target.closest('.ripple-chip[data-port]');
  if (chip && chip.closest('#ripplePortPhoneSeg, #ripplePortTabletSeg')) {
    const isPhone = !!chip.closest('#ripplePortPhoneSeg');
    writeCfg(isPhone ? { portPhone: chip.dataset.port } : { portTablet: chip.dataset.port });
    if (navigator.vibrate) navigator.vibrate(8);
    return;
  }
  const sw = e.target.closest('.ripple-swatch[data-color]');
  if (sw && sw.closest('#rippleColorRow')) {
    writeCfg({ color: sw.dataset.color || '' });
    if (navigator.vibrate) navigator.vibrate(8);
  }
});

// 初始同步：rAF（页面模板可能晚于本模块执行）+ 电池订阅 tick 双保险
if (typeof requestAnimationFrame === 'function') {
  requestAnimationFrame(() => requestAnimationFrame(syncRippleCfgUi));
}
try {
  subscribeBattery(() => syncRippleCfgUi());
} catch (e) { /* 电池服务缺席时仅剩 rAF 通道 */ }
