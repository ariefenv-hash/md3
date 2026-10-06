// ==================== settings-battery.js — 设置电池页实时同步（v7.50 自 settings.js 拆分） ====================
//
// 职责（独立副作用模块，import 即生效）：
//   1. battery-service 快照 → 设置主页电量摘要 + 电池子页（百分比/电量条/充电徽标/
//      预计时间/速率卡/数据来源）实时渲染（subscribeBattery 订阅，单一真源）
//   2. 省电模式开关：设置页 ↔ 快速设置磁贴双向同步（localStorage + battery-saver-changed 事件）
//   3. 模拟充电器开关（仅模拟电池环境生效）
//
// 拆分纪律：仅依赖 battery-service 叶子模块与全局 document/localStorage；
// 所有元素定位走 getElementById（元素仍由 settings.js 页面模板产出，晚于本模块执行）。
// 行为零变化：代码自 settings.js 尾部原样切割（锚点机械切分），仅新增本头与导入。
// settings.js 已确保 import 本模块（副作用注册保持与拆分前同序）。

import { getBatteryState, subscribeBattery, estimateDischargeSeconds, estimateChargeSeconds, formatDuration, formatPerPct, isSimEngineActive, getSimCharging, setSimCharging } from '../battery-service.js';

// ==================== 电池页实时同步（battery-service 单一真源） ====================
// 状态栏 / 设置电池页 / 查找设备 三处共享同一 Battery Status API 快照，
// 电量、充电状态、预计可用时间全部实时联动，不再使用任何硬编码数值。

const BATTERY_SAVER_KEY = 'ios-desktop:battery-saver';

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
    mainPctEl.textContent = `${s.level}%`;
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

  // v7.23 估时文案：实测速率（耗/充 1 格用时反推）优先，系统值兜底，
  // 两者皆无时明确告知"测量中"而非展示拍脑袋的线性值
  const r = s.rates || {};
  const estEl = document.getElementById('settingsBatteryEstimate');
  if (estEl) {
    if (s.charging) {
      if (s.level >= 100) {
        estEl.textContent = '已充满';
      } else {
        const chargeSecs = estimateChargeSeconds(s);
        estEl.textContent = (chargeSecs !== null && Number.isFinite(chargeSecs) && chargeSecs > 0)
          ? `正在充电 · 预计 ${formatDuration(chargeSecs)}充满`
          : '正在充电 · 正在测量充电速度…';
      }
    } else {
      const hasRate = Number.isFinite(r.dischargeMsPerPct);
      const hasSystem = Number.isFinite(s.dischargingTime) && s.dischargingTime > 0;
      estEl.textContent = (hasRate || hasSystem)
        ? `预计可用 ${formatDuration(estimateDischargeSeconds(s))}`
        : '正在测量耗电速度 · 需观察一格电量变化';
    }
  }

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
  if (simSwitch) simSwitch.checked = getSimCharging();

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
  // pageIdx 2 = 电池子页（大号百分比 / 电量条 / 预计时间 / 省电开关）
  if (e.detail && e.detail.appId === 'settings' && (e.detail.pageIdx === 0 || e.detail.pageIdx === 2)) {
    renderSettingsBatteryPage(getBatteryState());
    const switchEl = document.getElementById('settingsBatterySaverSwitch');
    if (switchEl) {
      switchEl.checked = (typeof localStorage !== 'undefined' && localStorage.getItem(BATTERY_SAVER_KEY) === '1');
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
    switchEl.checked = e.detail.active;
  }
});

// v7.23 模拟充电器开关：模拟电池模式下接入/拔出充电器（真实设备上回弹并提示）
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t || t.id !== 'settingsSimChargerSwitch') return;
  const ok = setSimCharging(!!t.checked);
  if (!ok) {
    t.checked = false;
    if (window.showSystemToast) window.showSystemToast('真实设备上充电状态跟随电源连接');
    return;
  }
  if (window.showSystemToast) {
    window.showSystemToast(t.checked ? '充电器已接入 · 正在测量充电速度' : '充电器已拔出');
  }
});
