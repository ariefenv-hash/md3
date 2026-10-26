// ==================== v802-accessibility-subpage.test.js — #10 五期回归守护 ====================
// ①无障碍子页（页 20）accessibility_settings.xml 权威条目链与分区序（27 keys/8 分区，渲染 5 区 15 行）
// ②values-zh-rCN 权威文案锚定（含 SettingsLib tts_settings_title 跨仓库实证、rtt 空串注记）
// ③controller 门控裁决（BasePreferenceController.isAvailable 白名单；even_dimmer 取代语义
//   config_evenDimmerEnabled=false 实证；空区隐藏 = 空预装数组 + updatePreferenceCategoryVisibility）
// ④单一真源 __settingsA11yStore（localStorage settings:accessibility-v1）+ 极暗 CSS filter
//   真实现（#22 超越点：documentElement 层与 body.filter 亮度链乘法合成，brightness(0.5)）
// ⑤13 枚 layer-list 徽章图标（#5F6368/#F50D60 + 白色前景 18dp）
// ⑥一级菜单 accessibility 行直通页 20
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

describe('v8.02 #10 五期 — 一级菜单 accessibility 行直通', () => {
  const tp = R('ios-desktop/js/apps/settings-two-pane.js');

  it('accessibility 行 idx 直通页 20（脱离 STUB_IDX 占位）', () => {
    expect(tp).toContain("key: 'accessibility', icon: 'topAccessibility', plate: 'purple', label: '无障碍功能', sub: '显示、互动、音频', idx: 20");
  });

  it('STUB 注释更新为剩余 7 项（v8.02 无障碍转正页 20）', () => {
    expect(tp).toContain('v8.29 位置信息转正页 24，剩余 5 项仍占位');
  });
});

describe('v8.02 #10 五期 — 无障碍子页（页 20）权威条目链', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('PreferenceScreen 标题 = accessibility_settings「无障碍功能」+ 副题 accessibility_settings_summary「显示、互动、音频」', () => {
    expect(s).toContain("title: '无障碍功能',");
    expect(s).toContain('AOSP AccessibilitySettings');
    expect(s).toContain('显示、互动、音频（AOSP AccessibilitySettings）');
  });

  it('分区 ③ display_category「显示」', () => {
    expect(s).toContain('>显示</div>');
  });

  it('分区 ④ interaction_control_category「互动控制」', () => {
    expect(s).toContain('>互动控制</div>');
  });

  it('分区 ⑤ captions_category「字幕」', () => {
    expect(s).toContain('>字幕</div>');
  });

  it('分区 ⑥ audio_category「音频」', () => {
    expect(s).toContain('>音频</div>');
  });

  it('分区 ⑧ general_category「常规」（general_category_title，XML 无 key 注记）', () => {
    expect(s).toContain('>常规</div>');
  });

  it('text_reading_options「显示大小和文字」（TextReadingFragmentForA11ySettingsController 基类 AVAILABLE）', () => {
    expect(s).toContain('text_reading_options（order 1）：TextReadingFragmentForA11ySettingsController');
    expect(s).toContain('显示大小和文字');
  });

  it('accessibility_color_and_motion「色彩和动画」', () => {
    expect(s).toContain('色彩和动画');
  });

  it('reduce_bright_colors_preference（order 3）「极暗」PrimarySwitchPreference + 开关', () => {
    expect(s).toContain('reduce_bright_colors_preference（order 3）：PrimarySwitchPreference');
    expect(s).toContain('id="a11yRbcToggle"');
  });

  it('magnification_preference_screen「放大功能」+ getServiceSummary 默认组合摘要「已关闭/放大屏幕上的内容」', () => {
    expect(s).toContain('放大功能');
    expect(s).toContain('已关闭/放大屏幕上的内容');
    expect(s).toContain('preference_summary_default_combination');
  });

  it('tap_assistance_preference_screen「定时控制」', () => {
    expect(s).toContain('定时控制');
  });

  it('system_controls_preference_screen「系统控制」', () => {
    expect(s).toContain('系统控制');
  });

  it('vibration_preference_screen「振动和触感反馈」+ 动态摘要 VIBRATE_ON 默认开 → state_on「已开启」', () => {
    expect(s).toContain('振动和触感反馈');
    expect(s).toContain('accessibility_vibration_settings_state_on');
    expect(s).toContain('已开启');
  });

  it('pointer_and_touchpad「指针和触控板无障碍功能」+ 权威摘要「指针颜色、指针大小等」', () => {
    expect(s).toContain('指针和触控板无障碍功能');
    expect(s).toContain('指针颜色、指针大小等');
  });

  it('live_caption「实时字幕」+ 权威摘要「自动生成媒体字幕」', () => {
    expect(s).toContain('实时字幕');
    expect(s).toContain('自动生成媒体字幕');
  });

  it('captioning_preference_screen「字幕偏好设置」', () => {
    expect(s).toContain('字幕偏好设置');
  });

  it('toggle_audio_description「语音描述」+ 权威摘要全文 + 开关（persistent=false）', () => {
    expect(s).toContain('语音描述');
    expect(s).toContain('以语音的形式描述当前画面呈现的内容（仅限支持该设置的电影或电视节目）');
    expect(s).toContain('id="a11yAudioDescToggle"');
    expect(s).toContain('persistent=false');
  });

  it('hearing_aid_preference「助听装置」+ 未连接态摘要「未连接任何助听装置」', () => {
    expect(s).toContain('助听装置');
    expect(s).toContain('未连接任何助听装置');
  });

  it('audio_adjustment_preference_screen「音频调整」', () => {
    expect(s).toContain('音频调整');
  });

  it('accessibility_shortcuts_preference_screen「无障碍快捷方式」（XML 无 android:icon 忠实无图标）', () => {
    expect(s).toContain('无障碍快捷方式');
    expect(s).toContain('XML 无 android:icon 忠实无图标');
  });

  it('tts_settings_preference「文字转语音输出」（SettingsLib zh-rCN 跨仓库实证）', () => {
    expect(s).toContain('文字转语音输出');
    expect(s).toContain('SettingsLib');
  });
});

describe('v8.02 #10 五期 — controller 门控语义注记（实证裁决链）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('门控裁决权威注记：BasePreferenceController.isAvailable 白名单', () => {
    expect(s).toContain('BasePreferenceController.isAvailable');
    expect(s).toContain('CONDITIONALLY_UNAVAILABLE');
    expect(s).toContain('UNSUPPORTED_ON_DEVICE');
  });

  it('user_installed_services_category 整区隐藏注记（0 服务整区移除）', () => {
    expect(s).toContain('user_installed_services_category「已下载的应用」');
    expect(s).toContain('getPreferenceCount()==0 → removePreference');
  });

  it('screen_reader_category 整区隐藏注记（config_preinstalled_screen_reader_services 空数组）', () => {
    expect(s).toContain('config_preinstalled_screen_reader_services');
    expect(s).toContain('updatePreferenceCategoryVisibility');
  });

  it('even_dimmer_activated 门控注记（evenDimmer flag + config_evenDimmerEnabled=false 双证 → UNSUPPORTED）', () => {
    expect(s).toContain('even_dimmer_activated（order 4）：EvenDimmerPreferenceController 门控隐藏注记');
    expect(s).toContain('config_evenDimmerEnabled=false');
    expect(s).toContain('Successor to this feature is Even Dimmer');
  });

  it('RBC 取代语义注记：config=false 时 RBC 保持可用（二者取其一）', () => {
    expect(s).toContain('ReduceBrightColorsPreferenceController');
    expect(s).toContain('isReduceBrightColorsAvailable');
  });

  it('physical_keyboard_a11y 门控注记（无实体全键盘 → CONDITIONALLY_UNAVAILABLE）', () => {
    expect(s).toContain('physical_keyboard_a11y（order 10）：PhysicalKeyboardA11yPreferenceController 门控隐藏注记');
    expect(s).toContain('isAnyHardKeyboardsExist');
  });

  it('rtt_setting 门控注记（默认拨号器 RTT + zh-rCN 标题权威空串）', () => {
    expect(s).toContain('rtt_setting（order 13）：RTTSettingPreferenceController 门控隐藏注记');
    expect(s).toContain('isDefaultDialerSupportedRTT');
    expect(s).toContain('权威空串');
  });

  it('flash_notifications_preference_accessibility 门控注记（同 v8.01 FeatureFlagUtils 实证）', () => {
    expect(s).toContain('flash_notifications_preference_accessibility（order 15）');
    expect(s).toContain('SETTINGS_FLASH_NOTIFICATIONS 无键 → false');
  });

  it('speech_category 整区隐藏注记（config_preinstalled_speech_services 空数组）', () => {
    expect(s).toContain('config_preinstalled_speech_services 空数组');
  });
});

describe('v8.02 #10 五期 — 单一真源与交互接线', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('单源 store：window.__settingsA11yStore + localStorage settings:accessibility-v1', () => {
    expect(s).toContain('window.__settingsA11yStore');
    expect(s).toContain("settings:accessibility-v1");
  });

  it('AOSP 默认值：rbc=false（REDUCE_BRIGHT_COLORS_ACTIVATED=0）/ audioDescription=false（persistent=false）', () => {
    expect(s).toContain('{ rbc: false, audioDescription: false }');
  });

  it('超越点：极暗 CSS filter 真实现（documentElement 层 brightness(0.5)）', () => {
    expect(s).toContain('function applyRbc(on)');
    expect(s).toContain("el.style.filter = on ? 'brightness(0.5)' : ''");
    expect(s).toContain('documentElement');
  });

  it('与 body.filter 亮度链分层合成（quick-settings 既有消费链不受写冲突）', () => {
    expect(s).toContain('body.filter（quick-settings.js 全库唯一既有消费链）');
  });

  it('activated 态持久化（Secure 表语义）+ audio_description 会话态注记', () => {
    expect(s).toContain('REDUCE_BRIGHT_COLORS_ACTIVATED 1/0');
    expect(s).toContain('persistent=false 仅会话内状态');
  });

  it('app-page-active 页 20 激活刷新（v7.99 桥惯例）', () => {
    expect(s).toContain('e.detail.pageIdx === 20');
  });

  it('页 16 STUB 文案移除 AccessibilitySettings 引用并指向页 20', () => {
    expect(s).toContain('v8.02 已转正 AccessibilitySettings → 页 20');
    expect(s).toContain('ModesDashboardFragment、SecurityDashboardFragment 等');
    expect(s).not.toContain('ModesDashboardFragment、AccessibilitySettings');
  });
});

describe('v8.02 #10 五期 — 13 枚 layer-list 徽章图标实证', () => {
  const ic = R('ios-desktop/js/icons-aosp.js');
  const s = R('ios-desktop/js/apps/settings.js');

  it('icons-aosp 增量 13 个 a11y* 键（前景白色 glyph）', () => {
    const keys = ['a11yTextReading', 'a11yColorMotion', 'a11yDim', 'a11yMagnify', 'a11yTap',
      'a11ySysControls', 'a11yVibration', 'a11yPointer', 'a11yLiveCaption', 'a11yCaptioning',
      'a11yAudioDesc', 'a11yHearingAid', 'a11yAudioAdjust'];
    keys.forEach((k) => expect(ic).toContain(`${k}: \`<svg`));
  });

  it('前景尺寸 = accessibility_icon_foreground_size 18dp + fill #ffffff', () => {
    expect(ic).toContain('accessibility_icon_size=32dp / accessibility_icon_foreground_size=18dp');
    expect((ic.match(/width="18" height="18" fill="#ffffff"/g) || []).length).toBe(13);
  });

  it('magnification evenOdd fill-rule 保留（ic_accessibility_magnification fillType=evenOdd）', () => {
    expect(ic).toContain('fill-rule="evenodd"');
  });

  it('徽章底色：accessibility_feature_background #5F6368 + magnification 特例 #F50D60', () => {
    expect(ic).toContain('#5F6368');
    expect(ic).toContain('#F50D60');
    expect(s).toContain('background:#5F6368;border-radius:27%');
    expect(s).toContain('background:#F50D60;border-radius:27%');
  });

  it('页面引用 13 枚徽章图标 + shortcuts/tts 两行无图标', () => {
    const keys = ['a11yTextReading', 'a11yColorMotion', 'a11yDim', 'a11yMagnify', 'a11yTap',
      'a11ySysControls', 'a11yVibration', 'a11yPointer', 'a11yLiveCaption', 'a11yCaptioning',
      'a11yAudioDesc', 'a11yHearingAid', 'a11yAudioAdjust'];
    keys.forEach((k) => expect(s).toContain(`AOSP_ICONS.${k}`));
  });
});
