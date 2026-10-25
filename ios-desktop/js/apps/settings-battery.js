// ==================== settings-battery.js — 设置电池页实时同步（v7.50 自 settings.js 拆分） ====================
//
// 职责（独立副作用模块，import 即生效）：
//   1. battery-service 快照 → 设置主页电量摘要 + 电池子页（百分比/电量条/充电徽标/
//      估时/速率卡/数据来源）实时渲染（subscribeBattery 订阅，单一真源）
//   2. 省电模式开关：设置页 ↔ 快速设置磁贴双向同步（localStorage + battery-saver-changed 事件）
//   3. 模拟充电器开关（仅模拟电池环境生效）
//   4. v8.06 #23 差距矩阵④：battery_header_text generateLabel 十分支链（AOSP
//      BatteryHeaderTextPreferenceController 同构）+ battery_tip 低电量提示卡
//      （LowBatteryDetector 条件 → BatterySaverAction 点击开省电）+
//      battery_saver_summary 动态摘要（BatterySaverController.getSummary 同构）+
//      status_bar_show_battery_percent 状态栏百分比开关（消费点 status-bar.js .battery-pct）
//
// 拆分纪律：仅依赖 battery-service 叶子模块与全局 document/localStorage；
// 所有元素定位走 getElementById（元素仍由 settings.js 页面模板产出，晚于本模块执行）。
// 行为零变化：代码自 settings.js 尾部原样切割（锚点机械切分），仅新增本头与导入。
// settings.js 已确保 import 本模块（副作用注册保持与拆分前同序）。

import { getBatteryState, subscribeBattery, estimateDischargeSeconds, estimateChargeSeconds, formatDuration, formatPerPct, isSimEngineActive, getSimCharging, setSimCharging } from '../battery-service.js';
import { setSwitchChecked } from '../m3-controls.js'; // #70：程序化开关真值统一入口

// ==================== 电池页实时同步（battery-service 单一真源） ====================
// 状态栏 / 设置电池页 / 查找设备 三处共享同一 Battery Status API 快照，
// 电量、充电状态、预计可用时间全部实时联动，不再使用任何硬编码数值。

const BATTERY_SAVER_KEY = 'ios-desktop:battery-saver';
// v8.06 status_bar_show_battery_percent（System.SHOW_BATTERY_PERCENT 语义映射）：
// 默认开（iOS 状态栏 pill 百分比为视觉核心，Web 现状常显；AOSP
// config_defaultBatteryPercentageSetting=false 平台差异注记——合法超越）
const STATUSBAR_PCT_KEY = 'ios-desktop:statusbar-battery-percent';

/** 省电模式当前态（与 QS 磁贴/设置开关同一 localStorage 真源） */
function isPowerSaveOn() {
  return typeof localStorage !== 'undefined' && localStorage.getItem(BATTERY_SAVER_KEY) === '1';
}

/** 状态栏百分比显示态（默认开，见 STATUSBAR_PCT_KEY 注记） */
function isStatusbarPctEnabled() {
  return typeof localStorage === 'undefined' || localStorage.getItem(STATUSBAR_PCT_KEY) !== '0';
}

/**
 * v8.06 battery_header_text —— AOSP BatteryHeaderTextPreferenceController.generateLabel
 * 十分支链 zh 同构（证据链见 tests/v806-battery-subpage.test.js）：
 *   ①不兼容充电器→「已连接，但未充电」②defender/isExtraDefend(false)→「充电已暂停」
 *   ⑤无线充电 ⑦充电态 battery_state_and_duration(statusLabel, remainingLabel)
 *   ⑧省电态「省电模式已开启 • …」⑨低电量 tip「电池电量低 • …」⑩放电 remainingLabel
 * ——Web 模拟环境仅 ⑦⑧⑨⑩ 与 remainingLabel==null→statusLabel 兜底可达（其余分支
 * 随模拟边界注记）。zh 模板：power_charge_remaining「充电剩余时间：%1$s」/
 * power_discharge_remaining「还可用：%1$s」；battery_state_and_duration zh 未翻译
 * 回退英文格式「%1$s • %2$s」；状态键 battery_info_status_charging「正在充电」/
 * battery_info_status_full「已充满电」/battery_info_status_discharging「未在充电」
 * （SettingsLib res values-zh-rCN 权威值）。
 */
function headerRemainingLabel(s) {
  if (s.charging) {
    if (s.level >= 100) return null; // 充满：ChargeTimeRemaining 未设 → remainingLabel==null
    const secs = estimateChargeSeconds(s);
    return (Number.isFinite(secs) && secs > 0) ? `充电剩余时间：${formatDuration(secs)}` : null;
  }
  const secs = estimateDischargeSeconds(s);
  return (Number.isFinite(secs) && secs > 0) ? `还可用：${formatDuration(secs)}` : null;
}

function generateHeaderLabel(s) {
  const remaining = headerRemainingLabel(s);
  if (s.charging) {
    if (s.level >= 100) return '已充满电'; // remainingLabel==null → statusLabel(full)
    // 充电态：battery_state_and_duration(statusLabel, remainingLabel) 或 statusLabel 兜底
    return remaining ? `正在充电 • ${remaining}` : '正在充电';
  }
  if (isPowerSaveOn()) {
    // 省电态（放电）：battery_state_and_duration(battery_tip_early_heads_up_done_title, remaining)
    return remaining ? `省电模式已开启 • ${remaining}` : '省电模式已开启';
  }
  if (s.level <= 15) {
    // 低电量 tip 态（LowBatteryDetector mWarningLevel=config_low_battery_warning_level=15）
    return remaining ? `电池电量低 • ${remaining}` : '电池电量低';
  }
  return remaining || '未在充电'; // remainingLabel 或 statusLabel(discharging)
}

/** 电量档位对应主题色（低电量红 / 中电量黄 / 良好绿） */
function batteryLevelColor(level) {
  if (level <= 20) return 'var(--md-error, #f2b8b5)';
  if (level <= 45) return 'var(--md-tertiary, #efc76b)';
  return 'var(--md-success, #a8f5bb)';
}

/** 把电池快照渲染进设置电池页（元素不存在/已离场时静默跳过） */
function renderSettingsBatteryPage(s) {
  // 设置主页「电池与电源优化」行右侧的实时电量摘要
  const mainPctEl = document.getElementById('settingsMainBatteryPct');
  if (mainPctEl && mainPctEl.isConnected) {
    // v7.99 #10 二期：TopLevelBatteryPreferenceController.getDashboardLabel 语义 ——
    // 一级菜单电池摘要 = 电量百分比 + 状态（"67% - 正在充电"；放电态估时数据缺失时仅百分比，
    // battery_missing_message 分支对 Web 移植不适用——虚拟电池恒存在）
    mainPctEl.textContent = s.charging ? `${s.level}% - 正在充电` : `${s.level}%`;
  }

  const pctEl = document.getElementById('settingsBatteryPct');
  if (!pctEl || !pctEl.isConnected) return;

  pctEl.textContent = `${s.level}%`;
  pctEl.style.color = batteryLevelColor(s.level);

  const barEl = document.getElementById('settingsBatteryBar');
  if (barEl) {
    barEl.style.width = `${s.level}%`;
    barEl.style.background = batteryLevelColor(s.level);
  }

  const badgeEl = document.getElementById('settingsBatteryChargeBadge');
  if (badgeEl) badgeEl.style.display = s.charging ? 'inline-flex' : 'none';

  // v8.06 battery_header_text：AOSP generateLabel 十分支链（v7.23 估时引擎保留为
  // remainingLabel 数据源；「已充满」→ 权威值「已充满电」，「预计可用 X」→「还可用：X」）
  const r = s.rates || {};
  const estEl = document.getElementById('settingsBatteryEstimate');
  if (estEl) estEl.textContent = generateHeaderLabel(s);

  // v8.06 battery_tip（TipCardPreference 默认隐藏；LowBatteryDetector 同构：
  // discharging && level<=15 && lowBatteryEnabled && !isPowerSaveMode）
  const tipCard = document.getElementById('settingsBatteryTipCard');
  if (tipCard) tipCard.style.display = (!s.charging && s.level <= 15 && !isPowerSaveOn()) ? '' : 'none';

  // v8.06 battery_saver_summary（BatterySaverController.getSummary 同构：
  // isPowerSaveMode→「已开启」；Web 无排程 percent=0→「已关闭」；scheduled/routine 分支不触发）
  const saverSummaryEl = document.getElementById('settingsBatterySaverSummary');
  if (saverSummaryEl) saverSummaryEl.textContent = isPowerSaveOn() ? '已开启' : '已关闭';

  // v8.06 status_bar_show_battery_percent 开关态（BatteryPercentagePreferenceController.updateState 同构）
  const pctSwitch = document.getElementById('settingsStatusBarBatteryPercentSwitch');
  if (pctSwitch) setSwitchChecked(pctSwitch, isStatusbarPctEnabled()); // #70

  // v7.23 速率卡：每格耗时 + 实测次数（滚动窗口）
  const drainEl = document.getElementById('settingsBatteryDrainRate');
  if (drainEl) {
    drainEl.textContent = Number.isFinite(r.dischargeMsPerPct)
      ? `每格耗电 ${formatPerPct(r.dischargeMsPerPct)} · 已实测 ${r.dischargeSamples} 次`
      : '测量中 · 需观察一格电量变化';
  }
  const chargeRateEl = document.getElementById('settingsBatteryChargeRate');
  if (chargeRateEl) {
    chargeRateEl.textContent = Number.isFinite(r.chargeMsPerPct)
      ? `每格充电 ${formatPerPct(r.chargeMsPerPct)} · 已实测 ${r.chargeSamples} 次`
      : (s.charging ? '测量中 · 充满前将持续校准' : '接入充电器后开始测量');
  }

  // v7.23 模拟充电器：仅浏览器无 Battery API（模拟电池）时显示
  const simCard = document.getElementById('settingsSimChargerCard');
  if (simCard) simCard.style.display = isSimEngineActive() ? '' : 'none';
  const simSwitch = document.getElementById('settingsSimChargerSwitch');
  if (simSwitch) setSwitchChecked(simSwitch, getSimCharging()); // #70

  const srcEl = document.getElementById('settingsBatterySource');
  if (srcEl) {
    srcEl.textContent = s.supported
      ? '数据来源：设备电池（耗/充电速率实测）'
      : '数据来源：模拟电池（含耗/充电速率测量）';
  }
}

subscribeBattery(renderSettingsBatteryPage);
document.addEventListener('app-page-active', (e) => {
  // pageIdx 0 = 设置主页（「电池与电源优化」行的实时摘要）
  // pageIdx 2 = 电池子页（v8.06 power_usage_summary 1:1：header/header_text/tip/
  //   用量入口/省电/电池管理器/状态栏百分比开关/footer）
  if (e.detail && e.detail.appId === 'settings' && (e.detail.pageIdx === 0 || e.detail.pageIdx === 2)) {
    renderSettingsBatteryPage(getBatteryState());
    const switchEl = document.getElementById('settingsBatterySaverSwitch');
    if (switchEl) {
      setSwitchChecked(switchEl, (typeof localStorage !== 'undefined' && localStorage.getItem(BATTERY_SAVER_KEY) === '1')); // #70
    }
  }
});

// 省电模式开关：设置页 ↔ 快速设置磁贴 双向同步（经 quick-settings.setBatterySaverActive 单一真源）
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t || t.id !== 'settingsBatterySaverSwitch') return;
  const active = !!t.checked;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(BATTERY_SAVER_KEY, active ? '1' : '0');
  }
  document.body.classList.toggle('battery-saver-mode', active);
  // 动态 import 规避模块循环求值顺序问题（quick-settings 依赖链路含本文件）
  import('../quick-settings.js').then((m) => {
    if (m && typeof m.setBatterySaverActive === 'function') {
      m.setBatterySaverActive(active, { silent: true });
    }
  }).catch(() => {});
});
document.addEventListener('battery-saver-changed', (e) => {
  const switchEl = document.getElementById('settingsBatterySaverSwitch');
  if (switchEl && e.detail && typeof e.detail.active === 'boolean') {
    setSwitchChecked(switchEl, e.detail.active); // #70（battery-saver-changed 双向同步）
  }
  // v8.06：省电态变化联动 battery_header_text（generateLabel 省电分支）/
  // battery_tip 显隐（isPowerSaveMode dismiss）/ battery_saver_summary 摘要
  renderSettingsBatteryPage(getBatteryState());
});

// v8.06 battery_tip 点击 → BatterySaverAction（AOSP LowBatteryTip 点击链：
// BatteryTipUtils.getActionForBatteryTip → BatterySaverAction.handlePositiveAction
// 开启省电模式）；走 quick-settings.setBatterySaverActive 单一真源（与磁贴/开关同链）
document.addEventListener('click', (e) => {
  const card = e.target && e.target.closest && e.target.closest('#settingsBatteryTipCard');
  if (!card) return;
  import('../quick-settings.js').then((m) => {
    if (m && typeof m.setBatterySaverActive === 'function') {
      m.setBatterySaverActive(true, { silent: true });
    }
  }).catch(() => {});
  if (window.showSystemToast) window.showSystemToast('省电模式已开启');
  renderSettingsBatteryPage(getBatteryState());
});

// v8.06 status_bar_show_battery_percent：BatteryPercentagePreferenceController
// onPreferenceChange 同构（Settings.System.SHOW_BATTERY_PERCENT 写入语义映射）→
// 广播 statusbar-battery-percent-changed，消费点 status-bar.js .battery-pct 显隐
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t || t.id !== 'settingsStatusBarBatteryPercentSwitch') return;
  const show = !!t.checked;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STATUSBAR_PCT_KEY, show ? '1' : '0');
  }
  document.dispatchEvent(new CustomEvent('statusbar-battery-percent-changed', { detail: { show } }));
});

document.addEventListener('statusbar-battery-percent-changed', (e) => {
  const switchEl = document.getElementById('settingsStatusBarBatteryPercentSwitch');
  if (switchEl && e.detail && typeof e.detail.show === 'boolean') {
    setSwitchChecked(switchEl, e.detail.show); // #70
  }
});

// v7.23 模拟充电器开关：模拟电池模式下接入/拔出充电器（真实设备上回弹并提示）
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t || t.id !== 'settingsSimChargerSwitch') return;
  const ok = setSimCharging(!!t.checked);
  if (!ok) {
    setSwitchChecked(t, false); // #70（真实设备回滚同样驱动几何）
    if (window.showSystemToast) window.showSystemToast('真实设备上充电状态跟随电源连接');
    return;
  }
  if (window.showSystemToast) {
    window.showSystemToast(t.checked ? '充电器已接入 · 正在测量充电速度' : '充电器已拔出');
  }
});
