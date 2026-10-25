// ==================== v806-battery-subpage.test.js — #23 差距矩阵④回审计守护 ====================
// ①电池子页（页 2）power_usage_summary.xml 权威条目链（9 keys，PowerUsageSummary.java 声明序）
// ②values-zh-rCN 权威文案锚定（电池使用情况/查看自上次充满电后的电池使用情况/电池管理器/
//   电池电量百分比/剩余电量为大致数据…/已充满电/还可用：X/充电剩余时间：X 等非直译值）
// ③controller 门控裁决实证（isBatteryUsageEnabled=true；isBatteryManagerSupported=true +
//   config_battery_manager_consider_ac=false:782 短路 AVAILABLE + adaptive=false→summary_unsupported；
//   config_battery_percentage_setting_available=true frameworks:5222 + default=false :5225；
//   TipCard displayPreference 默认隐藏 + LowBatteryDetector 条件；battery_help_message 虚拟电池恒隐藏）
// ④battery_header_text generateLabel 十分支链（BatteryHeaderTextPreferenceController 同构）
// ⑤单一真源：statusbar-battery-percent store ↔ status-bar.js .battery-pct 消费点；
//   battery_saver_summary ↔ QS setBatterySaverActive 既有链
// ⑥battery_tip 点击 → BatterySaverAction（开省电）
// ⑦图标忠实性：XML 全文无 android:icon → 条目行零图标（ICONS.battery_saver 退役）
// ⑧Web 扩展区保留（铁律#2 合法超越：速率卡/模拟充电器/充电涟漪/数据来源）
// ⑨旧假数据移除（「上次充电完成：今天 08:15」）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

describe('v8.06 #23④ — 页 2 标题与 XML 权威条目链（9 keys 声明序）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('PreferenceScreen 标题 = power_usage_summary_title「电池」', () => {
    expect(s).toContain('title: \'电池\',');
    expect(s).toContain('R.xml.power_usage_summary');
  });

  it('9 keys 权威序全链锚定（PowerUsageSummary.java 声明序）', () => {
    expect(s).toContain('battery_header → battery_header_text → battery_help_message(隐藏) → battery_tip →');
    expect(s).toContain('battery_usage_summary → battery_saver_summary → smart_battery_manager →');
    expect(s).toContain('status_bar_show_battery_percent → power_usage_footer');
  });

  it('fragment = fuelgauge/batteryusage/PowerUsageSummary（use() 双注册）', () => {
    expect(s).toContain('fuelgauge/batteryusage/PowerUsageSummary.java');
    expect(s).toContain('use(BatteryHeaderTextPreferenceController + BatteryTipPreferenceController)');
  });

  it('议题口径勘正：#23 写 10 keys 系含注释行，XML 全文实为 9 keys', () => {
    expect(s).toContain('#23 议题口径 10 keys 系含 battery_help_message');
  });
});

describe('v8.06 #23④ — 渲染行 data-test 钩子与 zh 权威文案', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('battery_header：UsageProgressBarPreference + setBottomSummary("") 语义', () => {
    expect(s).toContain('data-test="battery-header"');
    expect(s).toContain('setBottomSummary("")');
    expect(s).toContain('id="settingsBatteryPct"');
    expect(s).toContain('id="settingsBatteryBar"');
  });

  it('battery_header_text 行存在（generateLabel 渲染点）', () => {
    expect(s).toContain('data-test="battery-header-text"');
    expect(s).toContain('id="settingsBatteryEstimate"');
  });

  it('battery_usage_summary 行：标题/摘要权威值 + 子页未转正忠实入口行', () => {
    expect(s).toContain('data-test="battery-usage-summary"');
    expect(s).toContain('>电池使用情况</span>');
    expect(s).toContain('查看自上次充满电后的电池使用情况');
    expect(s).toContain('fragment=PowerUsageAdvanced 子页未转正，忠实入口行');
  });

  it('battery_saver_summary 行：权威 title + 动态摘要渲染点 + 开关保留', () => {
    expect(s).toContain('data-test="battery-saver-summary"');
    expect(s).toContain('>省电模式</span>');
    expect(s).toContain('id="settingsBatterySaverSummary"');
    expect(s).toContain('id="settingsBatterySaverSwitch"');
  });

  it('smart_battery_manager 行：「电池管理器」权威值（非「自适应偏好设置」直译）', () => {
    expect(s).toContain('data-test="smart-battery-manager"');
    expect(s).toContain('>电池管理器</span>');
    expect(s).toContain('检测应用大量消耗电池电量的情况');
    expect(s).toContain('fragment=SmartBatterySettings 子页未转正，忠实入口行');
  });

  it('status_bar_show_battery_percent 行：title/summary 权威值 + 开关', () => {
    expect(s).toContain('data-test="status-bar-battery-percent"');
    expect(s).toContain('>电池电量百分比</span>');
    expect(s).toContain('在状态栏中显示电池电量百分比');
    expect(s).toContain('id="settingsStatusBarBatteryPercentSwitch"');
  });

  it('power_usage_footer：battery_footer_summary 权威值', () => {
    expect(s).toContain('data-test="power-usage-footer"');
    expect(s).toContain('剩余电量为大致数据，且可能会因使用情形而变化');
  });

  it('battery_tip 卡：title/summary 权威值（battery_tip_low_battery_title/summary）', () => {
    expect(s).toContain('data-test="battery-tip"');
    expect(s).toContain('>电池电量低</div>');
    expect(s).toContain('开启省电模式可延长电池续航时间');
  });
});

describe('v8.06 #23④ — controller 门控裁决注记（全实拉实证）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('battery_help_message：默认 setVisible(false) + 虚拟电池恒存在 → 恒隐藏注记', () => {
    expect(s).toContain('initPreference mHelpPreference');
    expect(s).toContain('Web 虚拟电池恒存在 → 恒隐藏注记');
  });

  it('battery_usage_summary：isBatteryUsageEnabled()=true（Impl 默认实现）→ 恒渲染', () => {
    expect(s).toContain('isBatteryUsageEnabled()');
    expect(s).toContain('PowerUsageFeatureProviderImpl 默认实现 return true → 恒渲染');
  });

  it('smart_battery_manager 门控链：supported=true + consider_ac=false:782 短路 + summary_unsupported', () => {
    expect(s).toContain('config_battery_manager_consider_ac');
    expect(s).toContain('config.xml:782=false');
    expect(s).toContain('battery_manager_summary_unsupported');
  });

  it('status_bar_show_battery_percent 门控：available=true frameworks:5222 + 默认值差异注记', () => {
    expect(s).toContain('config_battery_percentage_setting_available');
    expect(s).toContain('config.xml:5222=true');
    expect(s).toContain('config_defaultBatteryPercentageSetting');
    expect(s).toContain('config 差异注记（合法超越）');
  });

  it('battery_tip 门控：TipCard 默认隐藏 + LowBatteryDetector 三条件', () => {
    expect(s).toContain('Set preference as invisible since there is no default tips');
    expect(s).toContain('dischargingLowBatteryState = discharging &&');
    expect(s).toContain('batteryLevel <= mWarningLevel（config_low_battery_warning_level=15）');
    expect(s).toContain('!isPowerSaveMode');
  });

  it('battery_saver_summary：getSummary 四分支 + 行内开关合法超越注记', () => {
    expect(s).toContain('battery_saver_on_summary「已开启」');
    expect(s).toContain('battery_saver_off_scheduled_summary');
    expect(s).toContain('battery_saver_pref_auto_routine_summary');
    expect(s).toContain('Web 行内 md-switch 合法超越');
  });
});

describe('v8.06 #23④ — battery_header_text generateLabel 十分支链（settings-battery.js）', () => {
  const b = R('ios-desktop/js/apps/settings-battery.js');

  it('充电态：battery_state_and_duration 同构「正在充电 • 充电剩余时间：X」', () => {
    expect(b).toContain('`正在充电 • ${remaining}`');
    expect(b).toContain('充电剩余时间：');
    expect(b).toContain("return remaining ? `正在充电 • ${remaining}` : '正在充电';");
  });

  it('充满分支：battery_info_status_full 权威值「已充满电」（非旧「已充满」）', () => {
    expect(b).toContain("return '已充满电';");
    expect(b).not.toContain("'已充满';");
  });

  it('省电分支：battery_tip_early_heads_up_done_title「省电模式已开启 • 还可用：X」', () => {
    expect(b).toContain('`省电模式已开启 • ${remaining}`');
  });

  it('低电量分支：「电池电量低 • 还可用：X」（mWarningLevel=15）', () => {
    expect(b).toContain('`电池电量低 • ${remaining}`');
    expect(b).toContain('s.level <= 15');
  });

  it('放电默认：power_discharge_remaining「还可用：X」+ 兜底 statusLabel「未在充电」', () => {
    expect(b).toContain('还可用：${formatDuration(secs)}');
    expect(b).toContain("return remaining || '未在充电';");
  });

  it('remainingLabel 数据源保留 v7.23 估时引擎（estimateCharge/DischargeSeconds）', () => {
    expect(b).toContain('estimateChargeSeconds(s)');
    expect(b).toContain('estimateDischargeSeconds(s)');
    expect(b).toContain('formatDuration');
  });
});

describe('v8.06 #23④ — battery_tip 行为（LowBatteryDetector → BatterySaverAction）', () => {
  const b = R('ios-desktop/js/apps/settings-battery.js');

  it('显隐条件同构：!charging && level<=15 && !isPowerSaveOn()', () => {
    expect(b).toContain("(!s.charging && s.level <= 15 && !isPowerSaveOn()) ? '' : 'none'");
  });

  it('点击 → setBatterySaverActive(true) 单一真源（与 QS 磁贴/设置开关同链）', () => {
    expect(b).toContain("closest('#settingsBatteryTipCard')");
    expect(b).toContain("m.setBatterySaverActive(true, { silent: true })");
  });

  it('省电态变化联动三处渲染（header_text/tip/saver_summary）', () => {
    expect(b).toContain('renderSettingsBatteryPage(getBatteryState());');
  });
});

describe('v8.06 #23④ — 单一真源矩阵：状态栏百分比开关', () => {
  const b = R('ios-desktop/js/apps/settings-battery.js');
  const sb = R('ios-desktop/js/status-bar.js');

  it('store = ios-desktop:statusbar-battery-percent（默认开，iOS pill 视觉核心注记）', () => {
    expect(b).toContain("const STATUSBAR_PCT_KEY = 'ios-desktop:statusbar-battery-percent';");
    expect(b).toContain('config_defaultBatteryPercentageSetting=false 平台差异注记');
  });

  it('写入链：change 监听 → localStorage → statusbar-battery-percent-changed 广播', () => {
    expect(b).toContain("localStorage.setItem(STATUSBAR_PCT_KEY, show ? '1' : '0')");
    expect(b).toContain("new CustomEvent('statusbar-battery-percent-changed'");
  });

  it('消费点：status-bar.js .battery-pct 显隐（System.SHOW_BATTERY_PERCENT 语义映射）', () => {
    expect(sb).toContain("statusbarPctEnabled()");
    expect(sb).toContain("localStorage.getItem('ios-desktop:statusbar-battery-percent') !== '0'");
    expect(sb).toContain("el.style.display = pctVisible ? '' : 'none'");
    expect(sb).toContain("document.addEventListener('statusbar-battery-percent-changed', updateBatteryDisplay)");
  });

  it('开关态回读渲染（updateState 同构）', () => {
    // v8.11 重锚（#70）：裸赋值收敛 setSwitchChecked 统一入口（驱动 JS 几何）
    expect(b).toContain('setSwitchChecked(pctSwitch, isStatusbarPctEnabled())');
  });
});

describe('v8.06 #23④ — 图标忠实性与旧实现退役', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('XML 全文无 android:icon → AOSP 条目行零图标注记（v8.04 先例）', () => {
    expect(s).toContain('XML 全文无 android:icon → AOSP 条目行零图标');
  });

  it('battery_saver 图标随旧行退役（ICONS.battery_saver 零引用）', () => {
    expect(s).not.toContain('ICONS.battery_saver');
  });

  it('旧假数据行移除（「上次充电完成：今天 08:15」仅存注记）', () => {
    expect(s).toContain('「上次充电完成：今天 08:15」写死假数据行移除');
    expect(s).not.toContain('>上次充电完成：今天 08:15</p>');
  });

  it('Web 扩展区保留（铁律#2）：速率卡/模拟充电器/充电涟漪/数据来源', () => {
    expect(s).toContain('id="settingsBatteryDrainRate"');
    expect(s).toContain('id="settingsBatteryChargeRate"');
    expect(s).toContain('id="settingsSimChargerCard"');
    expect(s).toContain('id="ripplePreviewBtn"');
    expect(s).toContain('id="settingsBatterySource"');
    expect(s).toContain('Web 扩展区（铁律#2 合法超越：AOSP XML 无对应条目的真实功能保留）');
  });
});

describe('v8.06 #23④ — 一级菜单电池行既有锚点稳定（pageIdx 0）', () => {
  const b = R('ios-desktop/js/apps/settings-battery.js');

  it('仪表盘标签语义保留（power_usage_level_and_status「%1$s - %2$s」同构）', () => {
    expect(b).toContain('`${s.level}% - 正在充电`');
  });

  it('pageIdx 2 覆盖 v8.06 渲染清单', () => {
    expect(b).toContain('v8.06 power_usage_summary 1:1：header/header_text/tip/');
  });
});
