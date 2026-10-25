// ==================== v803-sound-subpage.test.js — #23 差距矩阵①回审计守护 ====================
// ①提示音和振动子页（页 4）sound_settings.xml 权威条目链（26 keys，渲染 18 行 + 隐藏 8 项注记）
// ②values-zh-rCN 权威文案锚定（媒体播放到/阻止响铃的快捷方式/使用振动模式时一律显示振动图标等非直译值）
// ③controller 门控裁决实证（config_single_volume=false 五通道全渲染；has_boot_sounds=false；
//   PHONE_TYPE_CDMA 非 GSM；modesUi 反向门控；CONDITIONALLY_UNAVAILABLE/DISABLED_FOR_USER 白名单外）
// ④单一真源 __settingsSoundStore（localStorage settings:sound-v1）——alarm 通道为 #11 时钟前置依赖
// ⑤touch_sounds（System.SOUND_EFFECTS_ENABLED）与 sound-haptics 引擎 sfxEnabled 同一真源融合
// ⑥5 枚音量图标（ic_media_stream/ic_local_phone_24_lib/ic_ring_volume/ic_notifications/ic_audio_alarm）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

describe('v8.03 #23① — 一级菜单 sound 行（权威 label 不变）', () => {
  const tp = R('ios-desktop/js/apps/settings-two-pane.js');

  it('sound 行 idx 4 + 权威 label「提示音和振动」（sound_settings title）', () => {
    expect(tp).toContain("key: 'sound', icon: 'topSound', label: '提示音和振动', sub: '音量、振动、勿扰', idx: 4");
  });
});

describe('v8.03 #23① — 页 4 标题与 XML 权威条目链（order -185→100）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('PreferenceScreen 标题 = sound_settings「提示音和振动」（脱离旧「声音与震动」历史实现）', () => {
    expect(s).toContain("title: '提示音和振动',");
    expect(s).not.toContain('title: \'声音与震动\',');
    expect(s).toContain('音量、铃声、提示音（AOSP SoundSettings）');
  });

  it('media_volume（-180）媒体音量滑条 + __settingsMedia 真实联动', () => {
    expect(s).toContain('media_volume（order -180）：MediaVolumePreferenceController（config_show_media_volume=true）');
    expect(s).toContain('id="sndMediaSlider"');
    expect(s).toContain('if (window.__settingsMedia) window.__settingsMedia.setVolume(p)');
  });

  it('media_output（-175）动态标题「音频播放位置：」+ 摘要「此设备」', () => {
    expect(s).toContain('settings_audio_switcher');
    expect(s).toContain('音频播放位置：');
    expect(s).toContain('此设备');
  });

  it('call_volume（-170）通话音量滑条（config_show_call_volume=true && !isSingleVolume）', () => {
    expect(s).toContain('call_volume（order -170）：CallVolumePreferenceController');
    expect(s).toContain('config_show_call_volume=true');
    expect(s).toContain('id="sndCallSlider"');
  });

  it('separate_ring_volume（-155）铃声音量滑条（铃声与通知分轨）', () => {
    expect(s).toContain('separate_ring_volume（order -155）');
    expect(s).toContain('铃声与通知分轨');
    expect(s).toContain('id="sndRingSlider"');
  });

  it('notification_volume（-150）通知音量滑条（RINGER_MODE_NORMAL 联动语义）', () => {
    expect(s).toContain('notification_volume（order -150）');
    expect(s).toContain('RINGER_MODE_NORMAL');
    expect(s).toContain('id="sndNotifSlider"');
  });

  it('alarm_volume（-140）闹钟音量滑条 + #11 时钟前置依赖声明', () => {
    expect(s).toContain('alarm_volume（order -140）：AlarmVolumePreferenceController');
    expect(s).toContain('config_show_alarm_volume=true');
    expect(s).toContain('id="sndAlarmSlider"');
    expect(s).toContain('#11 时钟应用前置依赖');
  });

  it('phone_ringtone（-120）手机铃声（isVoiceCapable）+ summary_placeholder 忠实空呈现', () => {
    expect(s).toContain('phone_ringtone（order -120）：DefaultRingtonePreference');
    expect(s).toContain('isVoiceCapable');
    expect(s).toContain('summary_placeholder 忠实空呈现');
    expect(s).toContain('手机铃声');
  });

  it('media_controls_summary（-100）「媒体」动态摘要 MEDIA_CONTROLS_RESUME 默认「显示播放器」', () => {
    expect(s).toContain('media_controls_summary（order -100）：MediaControlsParentPreferenceController AVAILABLE');
    expect(s).toContain('MEDIA_CONTROLS_RESUME');
    expect(s).toContain('显示播放器');
  });

  it('vibration_and_haptics（-90）「振动和触感反馈」动态摘要 VIBRATE_ON「已开启」', () => {
    expect(s).toContain('vibration_and_haptics（order -90）：VibrationPreferenceController');
    expect(s).toContain('VIBRATE_ON');
  });

  it('gesture_prevent_ringing_sound（-80）「阻止响铃的快捷方式」PrimarySwitch + 开关', () => {
    expect(s).toContain('gesture_prevent_ringing_sound（order -80）：PreventRingingParentPreferenceController');
    expect(s).toContain('config_volumeHushGestureEnabled=true');
    expect(s).toContain('id="sndPreventRingingToggle"');
  });

  it('notification_ringtone（-70）/ alarm_ringtone（-60）默认提示音选择行', () => {
    expect(s).toContain('notification_ringtone（order -70）：DefaultRingtonePreference');
    expect(s).toContain('config_show_notification_ringtone=true');
    expect(s).toContain('默认通知提示音');
    expect(s).toContain('alarm_ringtone（order -60）：DefaultRingtonePreference');
    expect(s).toContain('默认闹钟提示音');
  });

  it('六枚提示音开关行（dtmf/screenLock/charging/docking/touchSounds/vibrateIcon）', () => {
    expect(s).toContain('拨号键盘提示音');
    expect(s).toContain('id="sndDtmfToggle"');
    expect(s).toContain('屏幕锁定提示音');
    expect(s).toContain('id="sndScreenLockToggle"');
    expect(s).toContain('充电提示音和振动');
    expect(s).toContain('id="sndChargingToggle"');
    expect(s).toContain('基座提示音');
    expect(s).toContain('id="sndDockingToggle"');
    expect(s).toContain('点按和点击提示音');
    expect(s).toContain('id="sndTouchSoundsToggle"');
    expect(s).toContain('使用振动模式时一律显示振动图标');
    expect(s).toContain('id="sndVibrateIconToggle"');
  });

  it('条目链序：18 渲染行按 XML order 权威序排列（indexOf 递增链）', () => {
    const chain = [
      'id="sndMediaSlider"', '音频播放位置：', 'id="sndCallSlider"', 'id="sndRingSlider"',
      'id="sndNotifSlider"', 'id="sndAlarmSlider"', '手机铃声', 'media_controls_summary（order -100）',
      'vibration_and_haptics（order -90）', 'id="sndPreventRingingToggle"', '默认通知提示音',
      '默认闹钟提示音', 'id="sndDtmfToggle"', 'id="sndScreenLockToggle"', 'id="sndChargingToggle"',
      'id="sndDockingToggle"', 'id="sndTouchSoundsToggle"', 'id="sndVibrateIconToggle"',
    ];
    let pos = -1;
    for (const c of chain) {
      const i = s.indexOf(c);
      expect(i).toBeGreaterThan(pos);
      pos = i;
    }
  });
});

describe('v8.03 #23① — controller 门控隐藏注记（8 项全实证）', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('remote_media_group（-185）：mRoutingSessionInfos 空 → CONDITIONALLY_UNAVAILABLE 白名单外', () => {
    expect(s).toContain('remote_media_group（order -185）：RemoteVolumeGroupController');
    expect(s).toContain('CONDITIONALLY_UNAVAILABLE');
  });

  it('take_call_on_output（-165）：无 HFP/HAP 设备运行时 setVisible(false)', () => {
    expect(s).toContain('take_call_on_output（order -165）：HandsFreeProfileOutputPreferenceController');
    expect(s).toContain('setVisible(false)');
  });

  it('zen_mode（-130）：Flags.modesUi() 反向门控 UNSUPPORTED（v8.01 一致性裁决）', () => {
    expect(s).toContain('zen_mode（order -130）：ZenModePreferenceController');
    expect(s).toContain('Flags.modesUi()');
    expect(s).toContain('UNSUPPORTED');
  });

  it('spatial_audio_summary（-107）：Spatializer IMMERSIVE_LEVEL_NONE → UNSUPPORTED_ON_DEVICE', () => {
    expect(s).toContain('spatial_audio_summary（order -107）：SpatialAudioParentPreferenceController');
    expect(s).toContain('IMMERSIVE_LEVEL_NONE');
  });

  it('dock_audio_media（-20）：SettingPref.isApplicable has_dock_settings(false) → removePreference', () => {
    expect(s).toContain('dock_audio_media（order -20）：DockAudioMediaPreferenceController');
    expect(s).toContain('has_dock_settings(false)');
  });

  it('boot_sounds（-15）：has_boot_sounds=false → UNSUPPORTED', () => {
    expect(s).toContain('boot_sounds（order -15）：BootSoundPreferenceController');
    expect(s).toContain('has_boot_sounds(false)');
  });

  it('emergency_tone（-10）：PHONE_TYPE_CDMA isApplicable → GSM/LTE Pixel false', () => {
    expect(s).toContain('emergency_tone（order -10）：EmergencyTonePreferenceController');
    expect(s).toContain('PHONE_TYPE_CDMA');
  });

  it('sound_work_settings（100）：DISABLED_FOR_USER 白名单外 + Live Caption/Now Playing 注释行注记', () => {
    expect(s).toContain('sound_work_settings（order 100）：WorkSoundsPreferenceController');
    expect(s).toContain('DISABLED_FOR_USER');
    expect(s).toContain('Live Caption（-110）/ Now Playing（-105）');
  });
});

describe('v8.03 — 单一真源 __settingsSoundStore 与真实接线', () => {
  const s = R('ios-desktop/js/apps/settings.js');

  it('SOUND_PAGE_SCRIPT 模块级常量 + 页 4 script 挂接 + pageIdx===4 激活刷新', () => {
    expect(s).toContain('const SOUND_PAGE_SCRIPT = `');
    expect(s).toContain('` + SOUND_PAGE_SCRIPT + `');
    expect(s).toContain("e.detail.pageIdx === 4) initOnce();");
  });

  it('单一真源：localStorage settings:sound-v1 + window.__settingsSoundStore + settings-sound-changed 事件', () => {
    expect(s).toContain("var LS_KEY = 'settings:sound-v1'");
    expect(s).toContain('window.__settingsSoundStore = store;');
    expect(s).toContain("new CustomEvent('settings-sound-changed'");
  });

  it('四通道默认值（AOSP stream 语义换算 Web 0-100）：call 50 / ring 70 / notification 70 / alarm 70', () => {
    expect(s).toContain("{ call: 50, ring: 70, notification: 70, alarm: 70, preventRinging: true, vibrateIcon: false, dtmf: true, screenLock: true, charging: true, docking: true }");
  });

  it('#11 时钟消费点：闹钟响铃音量读 store.get(\'alarm\') 前置声明', () => {
    expect(s).toContain("store.get('alarm')");
    expect(s).toContain('window.__settingsSoundStore.get(\'alarm\')');
  });

  it('touch_sounds = System.SOUND_EFFECTS_ENABLED 语义融合 sound-haptics sfxEnabled（同一真源）', () => {
    expect(s).toContain('touch_sounds（order -30）：TouchSoundPreferenceController config_show_touch_sounds=true');
    expect(s).toContain('sound-haptics 引擎 sfxEnabled');
    expect(s).toContain('if (sfx) { sfx.setSfxEnabled(tsToggle.checked); if (tsToggle.checked) sfx.play(\'tick\'); }');
  });

  it('Web 扩展卡保留（铁律#2 合法超越）：sfx 音量滑条 + 触感振动反馈开关', () => {
    expect(s).toContain('id="sfxVolSlider"');
    expect(s).toContain('id="sndHapticToggle"');
    expect(s).toContain('sfx.setHapticsEnabled(hapToggle.checked)');
    expect(s).toContain('AOSP XML 无对应条目');
  });

  it('rAF 合帧 + __md3SliderSet 合成器驱动桥（v7.38 惯例）+ 激活回同步真值', () => {
    expect(s).toContain('if (window.__md3SliderSet) window.__md3SliderSet(slider, fill, thumb, p, down);');
    expect(s).toContain('requestAnimationFrame(slPaint)');
  });
});

describe('v8.03 — 5 枚音量图标（icons-aosp 逐 path 实证转换）', () => {
  const ic = R('ios-desktop/js/icons-aosp.js');

  it('volMedia/volCall/volRing/volNotif/volAlarm 五键注册（总键 42→47）', () => {
    expect(ic).toContain('volMedia: `<svg viewBox="0 0 24.0 24.0"');
    expect(ic).toContain('volCall: `<svg viewBox="0 0 24.0 24.0"');
    expect(ic).toContain('volRing: `<svg viewBox="0 0 24.0 24.0"');
    expect(ic).toContain('volNotif: `<svg viewBox="0 0 24.0 24.0"');
    expect(ic).toContain('volAlarm: `<svg viewBox="0 0 48.0 48.0"');
  });

  it('图标 path 抽样比对源 drawable pathData（逐字符一致）', () => {
    // ic_media_stream（Settings res/drawable 实源 path）
    expect(ic).toContain('M12,3l0.01,10.55c-0.59,-0.34 -1.27,-0.55 -2,-0.55C7.79,13 6,14.79 6,17c0,2.21 1.79,4 4.01,4S14,19.21 14,17V7h4V3H12z');
    // ic_audio_alarm（frameworks @*android:drawable 48 viewport 实源 path 首段）
    expect(ic).toContain('M44.0,11.44l-9.19,-7.71 -2.57,3.06 9.19,7.71 2.57,-3.06z');
    // ic_local_phone_24_lib 尾段特征
    expect(ic).toContain('C8.9,2.47 8.3,2 7.61,2z');
  });

  it('页 4 五滑条行引用 volMedia/volCall/volRing/volNotif/volAlarm', () => {
    const s = R('ios-desktop/js/apps/settings.js');
    expect(s).toContain('${AOSP_ICONS.volMedia || \'\'}');
    expect(s).toContain('${AOSP_ICONS.volCall || \'\'}');
    expect(s).toContain('${AOSP_ICONS.volRing || \'\'}');
    expect(s).toContain('${AOSP_ICONS.volNotif || \'\'}');
    expect(s).toContain('${AOSP_ICONS.volAlarm || \'\'}');
  });
});
