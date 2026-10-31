// ==================== v804-display-subpage.test.js — #23 差距矩阵②回审计守护 ====================
// ①显示子页（页 1）display_settings.xml 权威条目链（5 分区 23 keys，渲染 7 行 + 隐藏 16 项注记）
// ②values-zh-rCN 权威文案锚定（自动锁屏/锁定显示屏/显示大小和文字/已开启 / 时钟等非直译值）
// ③controller 门控裁决实证（config_automatic_brightness_available=false；config_setColorTransformAccelerated
//   同链 night_display；config_displayWhiteBalanceAvailable=false；config_show_smooth_display=false；
//   config_cameraLaunchGestureSensorType=-1；config_supportDoubleTapWake=false；color flag 无 default）
// ④单一真源矩阵：亮度=__qsBrightness 桥（QS body.filter 消费链）；深色=__settingsTheme；
//   旋转=__qsTileState autorotate 磁贴；自动锁屏=__settingsDisplayStore（settings:display-v1）
// ⑤动态摘要语义：getTimeoutSummary「闲置 %1$s后」默认 1 分钟；AutoDarkTheme MODE_NIGHT_NO
//   「一律不自动关闭/永不自动开启」；getSummaryResource「显示所有通知内容」；
//   getSummaryTextFromBackend「已开启 / 时钟」（config_dreamsDefaultComponent=deskclock）
// ⑥XML 无 android:icon → 行零图标（v7.99 忠实呈现先例）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

describe('v8.04 #23② — 一级菜单 display 行', () => {
  const tp = R('ios-desktop/js/apps/settings-two-pane.js');

  it('display 行 idx 1 + 权威 label「显示」+ 副题对齐渲染内容', () => {
    expect(tp).toContain("key: 'display', icon: 'topDisplay', plate: 'orange', label: '显示', sub: '深色主题、字体大小、亮度', idx: 1");
  });
});

describe('v8.04 #23② — 页 1 标题与 XML 权威条目链（5 分区 23 keys）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('PreferenceScreen 标题 = display_settings「显示」（脱离旧「显示与亮度」历史实现）', () => {
    expect(s).toContain("title: '显示',");
    expect(s).not.toContain("title: '显示与亮度',");
    expect(s).toContain('亮度、深色主题、自动锁屏（AOSP DisplaySettings）');
  });

  it('旧页假开关彻底移除（护眼夜览/自适应光感「敬请期待」回弹件退役）', () => {
    expect(s).not.toContain('dispNightToggle');
    expect(s).not.toContain('dispAutoBrightToggle');
    expect(s).not.toContain('dispBriSlider\'');
    expect(s).not.toContain('敬请期待');
  });

  it('分区一 category_name_brightness「亮度」（order -200）', () => {
    expect(s).toContain('category_name_brightness「亮度」（order -200）');
    expect(s).toContain('>亮度</div>');
  });

  it('分区二 category_name_lock_display「锁定显示屏」（order -190）', () => {
    expect(s).toContain('category_name_lock_display「锁定显示屏」（order -190）');
    expect(s).toContain('>锁定显示屏</div>');
  });

  it('分区三 category_name_appearance「外观」（order -180）', () => {
    expect(s).toContain('category_name_appearance「外观」（order -180）');
    expect(s).toContain('>外观</div>');
  });

  it('分区四 category_name_color「颜色」（order -170）三项全门控隐藏 → 整区注记', () => {
    expect(s).toContain('category_name_color「颜色」（order -170）：三项全门控隐藏 → 整区隐藏注记');
    expect(s).not.toContain('>颜色</div>');
  });

  it('分区五 category_name_display_controls「显示控制」（order -150）', () => {
    expect(s).toContain('category_name_display_controls「显示控制」（order -150）');
    expect(s).toContain('>显示控制</div>');
  });
});

describe('v8.04 #23② — 渲染 7 行（controller 门控 AVAILABLE 实证）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('preference_key_brightness_level：BrightnessLevelPreferenceController AVAILABLE + __qsBrightness 桥', () => {
    expect(s).toContain('preference_key_brightness_level');
    expect(s).toContain('BrightnessLevelPreferenceController');
    expect(s).toContain('id="dspBriSlider"');
    expect(s).toContain('window.__qsBrightness.set(Math.round(p * 100))');
  });

  it('lockscreen_from_display_settings：LockScreenPreferenceController AVAILABLE + 摘要「显示所有通知内容」', () => {
    expect(s).toContain('lockscreen_from_display_settings');
    expect(s).toContain('LockScreenPreferenceController');
    expect(s).toContain('lock_screen_notifications_summary_show「显示所有通知内容」（v8.01 页 19 同链同值）');
    expect(s).toContain('data-test="dsp-lockscreen"');
    expect(s).toContain('锁定的屏幕');
  });

  it('screen_timeout：ScreenTimeoutPreferenceController AVAILABLE + 动态摘要「闲置 1 分钟后」', () => {
    expect(s).toContain('screen_timeout：RestrictedPreference + ScreenTimeoutPreferenceController');
    expect(s).toContain('def_screen_off_timeout=60000');
    expect(s).toContain('data-test="dsp-timeout"');
    expect(s).toContain('id="dspTimeoutSub"');
    expect(s).toContain("return '闲置 ' + (TIMEOUT_LABELS[state.timeout] || '1 分钟') + '后';");
  });

  it('dark_ui_mode：DarkModePreference extends PrimarySwitchPreference + __settingsTheme 单一真源', () => {
    expect(s).toContain('dark_ui_mode：DarkModePreference extends PrimarySwitchPreference');
    expect(s).toContain('DarkUIPreferenceController');
    expect(s).toContain('id="dspDarkToggle"');
    expect(s).toContain('window.__settingsTheme.set(dk.checked ? \'dark\' : \'light\')');
  });

  it('dark 摘要 AutoDarkTheme.getStatus 默认 MODE_NIGHT_NO 权威值（非直译）', () => {
    expect(s).toContain('dark_ui_summary_on/off_auto_mode_never');
    expect(s).toContain("'一律不自动关闭'");
    expect(s).toContain("'永不自动开启'");
  });

  it('text_reading_options：TextReadingFragmentForDisplaySettingsController + 页 20 合法映射', () => {
    expect(s).toContain('text_reading_options：Preference + TextReadingFragmentForDisplaySettingsController');
    expect(s).toContain('onclick="__tpNav(this,20)"');
    expect(s).toContain('显示大小和文字');
    expect(s).toContain('data-test="dsp-text-reading"');
  });

  it('auto_rotate：AutoRotatePreferenceController AVAILABLE + QS autorotate 磁贴单一真源', () => {
    expect(s).toContain('auto_rotate：SwitchPreferenceCompat + AutoRotatePreferenceController');
    expect(s).toContain('RotationPolicy.isRotationLockToggleVisible');
    expect(s).toContain("window.__qsTileState.sync('autorotate', { active: on })");
    expect(s).toContain('id="dspRotateToggle"');
    expect(s).toContain('自动旋转屏幕');
  });

  it('screensaver：ScreenSaverPreferenceController + 「已开启 / 时钟」（config_dreamsDefaultComponent=deskclock）', () => {
    expect(s).toContain('screensaver：Preference + ScreenSaverPreferenceController');
    expect(s).toContain('config_dreamsEnabledByDefault=true');
    expect(s).toContain('config_dreamsDefaultComponent=');
    expect(s).toContain('已开启 / 时钟');
    expect(s).toContain('data-test="dsp-screensaver"');
  });
});

describe('v8.04 #23② — 隐藏 16 项注记（controller 实证逐条）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('screen_brightness_mode：config_automatic_brightness_available=false（core/res:500）', () => {
    expect(s).toContain('screen_brightness_mode：PrimarySwitchPreference +');
    expect(s).toContain('config_automatic_brightness_available=false');
  });

  it('even_dimmer_activated：Flags.evenDimmer 无 default + config_evenDimmerEnabled=false 双证（v8.02 同链）', () => {
    expect(s).toContain('even_dimmer_activated：EvenDimmerPreferenceController Flags.evenDimmer 无 default');
    expect(s).toContain('config_evenDimmerEnabled=false 双证');
  });

  it('fold_lock_behavior：折叠形态专用 UNSUPPORTED（手机形态）', () => {
    expect(s).toContain('fold_lock_behavior：FoldLockBehaviorPreferenceController');
    expect(s).toContain('折叠形态专用');
  });

  it('night_display：config_nightDisplayAvailable=@bool/config_setColorTransformAccelerated=false 同链', () => {
    expect(s).toContain('night_display：PrimarySwitchPreference + NightDisplayPreferenceController');
    expect(s).toContain('config_setColorTransformAccelerated=false');
  });

  it('color_mode：isDeviceColorManaged 运行时设备属性 DISABLED_FOR_USER', () => {
    expect(s).toContain('color_mode：ColorModePreferenceController isDeviceColorManaged');
    expect(s).toContain('DISABLED_FOR_USER');
  });

  it('color_contrast：enable_color_contrast_control aconfig 无 default=默认 false', () => {
    expect(s).toContain('color_contrast：ContrastPreferenceController');
    expect(s).toContain('无 default 行');
  });

  it('device_state_auto_rotate：折叠形态 → UNSUPPORTED（与 auto_rotate 二者取其一）', () => {
    expect(s).toContain('device_state_auto_rotate：DeviceStateAutoRotateOverviewController');
    expect(s).toContain('二者取其一，手机形态取标准旋转开关');
  });

  it('screen_resolution：checkSupportedResolutions 运行时多分辨率 → UNSUPPORTED', () => {
    expect(s).toContain('screen_resolution：ScreenResolutionController checkSupportedResolutions');
    expect(s).toContain('项目模拟设备单一分辨率形态');
  });

  it('display_white_balance：config_displayWhiteBalanceAvailable=false（core/res:1004）', () => {
    expect(s).toContain('display_white_balance：DisplayWhiteBalancePreferenceController');
    expect(s).toContain('config_displayWhiteBalanceAvailable=false');
  });

  it('peak_refresh_rate：config_show_smooth_display=false（Settings 仓库 config:571）', () => {
    expect(s).toContain('peak_refresh_rate：PeakRefreshRatePreferenceController');
    expect(s).toContain('config_show_smooth_display=false');
  });

  it('show_operator_name：CarrierConfig KEY_SHOW_OPERATOR_NAME_IN_STATUSBAR_BOOL 默认 false', () => {
    expect(s).toContain('show_operator_name：ShowOperatorNamePreferenceController CarrierConfig');
    expect(s).toContain('KEY_SHOW_OPERATOR_NAME_IN_STATUSBAR_BOOL 默认 false');
  });

  it('camera_gesture：config_cameraLaunchGestureSensorType=-1（core/res:4253）', () => {
    expect(s).toContain('camera_gesture：CameraGesturePreferenceController isAvailable');
    expect(s).toContain('config_cameraLaunchGestureSensorType != -1');
    expect(s).toContain('core/res:4253 = -1');
  });

  it('lift_to_wake：TYPE_WAKE_GESTURE legacy 传感器未声明（类比 v8.02 实体键盘形态裁决）', () => {
    expect(s).toContain('lift_to_wake：LiftToWakePreferenceController isAvailable');
    expect(s).toContain('TYPE_WAKE_GESTURE');
    expect(s).toContain('类比 v8.02 实体键盘形态裁决');
  });

  it('tap_to_wake：config_supportDoubleTapWake=false（core/res:4103）', () => {
    expect(s).toContain('tap_to_wake：TapToWakePreferenceController isAvailable');
    expect(s).toContain('config_supportDoubleTapWake=false');
  });

  it('theme：OverlayManager 可用主题数 > 1（AOSP 通用单主题）', () => {
    expect(s).toContain('theme：ListPreference(device_theme) + ThemePreferenceController');
    expect(s).toContain('可用主题数 > 1');
  });

  it('vr_display_pref：FEATURE_VR_MODE_HIGH_PERFORMANCE（A17 已移除）', () => {
    expect(s).toContain('vr_display_pref：VrDisplayPreferenceController isAvailable');
    expect(s).toContain('FEATURE_VR_MODE_HIGH_PERFORMANCE');
  });
});

describe('v8.04 #23② — 单一真源矩阵与接线', () => {
  const s = R('ios-desktop/js/apps/settings.js');
  const qs = R('ios-desktop/js/quick-settings.js');

  it('DISPLAY_PAGE_SCRIPT 模块级常量 + settings:display-v1 单源', () => {
    expect(s).toContain('const DISPLAY_PAGE_SCRIPT = `');
    expect(s).toContain("var LS_KEY = 'settings:display-v1';");
    expect(s).toContain('window.__settingsDisplayStore = store;');
    expect(s).toContain("'settings-display-changed'");
  });

  it('页 1 挂载接线 pageIdx === 1（app-page-active 回同步）', () => {
    expect(s).toContain('e.detail.pageIdx === 1) initOnce();');
  });

  it('QS 亮度桥（quick-settings.js）：get 返回 currentBrightness、set 走 applyValue 消费链', () => {
    expect(qs).toContain('window.__qsBrightness = {');
    expect(qs).toContain('get: () => currentBrightness,');
    expect(qs).toContain('set: (v) => applyValue(Number(v)),');
    expect(qs).toContain('v8.04 #23 差距矩阵②：亮度单一真源桥');
  });

  it('自动锁屏 TIMEOUT_LABELS = zh arrays screen_timeout_entries 权威七档', () => {
    for (const seg of ["15000: '15 秒'", "30000: '30 秒'", "60000: '1 分钟'", "120000: '2 分钟'", "300000: '5 分钟'", "600000: '10 分钟'", "1800000: '30 分钟'"]) {
      expect(s).toContain(seg);
    }
  });
});

describe('v8.04 #23② — 图标忠实性（XML 无 android:icon）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('页 1 行零 AOSP_ICONS 引用（XML 无 android:icon 按源码不渲染图标，v7.99 先例）', () => {
    const start = s.indexOf("title: '显示',");
    const end = s.indexOf("title: '电池',");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = s.slice(start, end);
    expect(block).not.toContain('AOSP_ICONS.');
    expect(block).not.toContain('ICONS.');
  });
});
