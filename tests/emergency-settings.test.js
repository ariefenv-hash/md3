// ==================== v8.32 #22⑧：安全和紧急情况页 emergency_settings 1:1 转正 ====================
//
// 议题 #22 ⑧ emergency 转正守护（aosp-mirror main 实源逐 key 取证，考证链见
// settings.js 页 29 头注与 icons-aosp.js emgGesture 注记）：
//   页 29 = res/xml/emergency_settings.xml（2331B 全文实拉，screen
//           safety_and_emergency_screen + more_emergency_settings(order 0) /
//           gesture_emergency_summary(order 100) / app_and_notif_cell_broadcast_settings
//           (order 200) + 无 key no_label 分区(order 170)）
//   ① more_emergency_settings = LayoutPreference more_settings_button（ActionPrimaryButton
//      主按钮形态）；MoreSettingsPreferenceController.getButtonText = open_app_button
//      「打开%s」动态应用名（AOSP 纯净出厂 EmergencyInfo「紧急信息」；open_app_button
//      zh 权威值跨仓库缺失注记留痕）
//   ② gesture_emergency_summary：EmergencyGestureEntrypointPreferenceController 实拉——
//      getSummary = gesture_setting_on「已开启」/gesture_setting_off「已关闭」；
//      config_show_emergency_gesture_settings 出厂默认 true → 出厂态「已开启」；
//      icon = ic_emergency_gesture_24dp（emgGesture 3 path viewport 48 移植）
//   ③ app_and_notif_cell_broadcast_settings：「无线紧急警报」RestrictedPreference intent
//      CellBroadcastSettings → 静态行（页 19 通知页同名 key 行形态一致 v8.01 先例）
//
// 测试纪律（worklog 惯例）：indexOf 切片锚点用定义形态；负断言用 not.toMatch 正则
// 防注释误报；\u 零出现（源文件为字面 CJK）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v8.32 #22⑧ 页 29 content：emergency_settings.xml 1:1', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('v8.32 #22⑧：安全和紧急情况页');
  expect(i).toBeGreaterThan(-1);
  const seg = s.slice(i, s.indexOf('  ],\n};', i));

  it('页标题「安全和紧急情况」（emergency_settings_preference_title zh-rCN 权威值）+ sub 逐字', () => {
    expect(seg).toContain('安全和紧急情况');
    expect(seg).toContain('紧急求救、医疗信息、警报');
  });

  it('more_emergency_settings（order 0）：ActionPrimaryButton 主按钮「打开紧急信息」+ toast 接线', () => {
    expect(seg).toContain('打开紧急信息');
    expect(seg).toContain('open_app_button');
    expect(seg).toContain('紧急信息应用后续版本转正');
  });

  it('gesture_emergency_summary（order 100）：「紧急求救」+ 出厂态摘要「已开启」（gesture_setting_on）', () => {
    expect(seg).toContain('紧急求救');
    expect(seg).toContain('已开启');
    expect(seg).toContain('gesture_setting_on');
    expect(seg).toContain('config_show_emergency_gesture_settings');
  });

  it('手势图标接线：emgGesture（ic_emergency_gesture_24dp 3 path 移植）', () => {
    expect(seg).toContain("${AOSP_ICONS.emgGesture || ''}");
  });

  it('EmergencyGestureSettings toast：详情页后续转正注记 + #22⑧ 侧键 SOS 对接注记', () => {
    expect(seg).toContain('紧急求救设置页后续版本转正');
    expect(seg).toContain('电源键 5 连按');
  });

  it('app_and_notif_cell_broadcast_settings（order 200）：「无线紧急警报」静态行（无 onclick——页 19 同名 key 形态一致）', () => {
    const j = seg.indexOf('无线紧急警报</span>');
    expect(j).toBeGreaterThan(-1);
    const rowStart = seg.lastIndexOf('md3-list-item', j);
    const rowSeg = seg.slice(rowStart, j);
    expect(rowSeg).not.toContain('onclick');
  });
});

describe('v8.32 #22⑧ icons-aosp：emgGesture 逐 path 移植', () => {
  const ic = src('ios-desktop/js/icons-aosp.js');

  it('emgGesture 键：48 viewport + 3 path（ic_emergency_gesture_24dp 实引）', () => {
    expect(ic).toContain('viewBox="0 0 48 48"');
    expect(ic).toContain('M4,34L5,30H12V26H8C5.79,26 4,24.21 4,22V18C4,15.79 5.79,14 8,14H16L15,18H8V22H12C14.21,22 16,23.79 16,26V30C16,32.21 14.21,34 12,34H4Z');
    expect(ic).toContain('M32,34L33,30H40V26H36C33.79,26 32,24.21 32,22V18C32,15.79 33.79,14 36,14H44L43,18H36V22H40C42.21,22 44,23.79 44,26V30C44,32.21 42.21,34 40,34H32Z');
    expect(ic).toContain('M22,30H26V18H22V30ZM18,30C18,32.21 19.79,34 22,34H26C28.21,34 30,32.21 30,30V18C30,15.79 28.21,14 26,14H22C19.79,14 18,15.79 18,18V30Z');
  });
});

describe('v8.32 #22⑧ two-pane 转正与注记', () => {
  const tp = src('ios-desktop/js/apps/settings-two-pane.js');

  it('emergency 项 idx STUB→29（页 29 转正）', () => {
    expect(tp).toContain("{ key: 'emergency', icon: 'topEmergency', plate: 'red', label: '安全和紧急情况', sub: '紧急求救、医疗信息、警报', idx: 29, kw: '求救 医疗 警报 地震' }");
  });

  it('STUB 注记更新：v8.32 安全和紧急情况转正页 29、v8.33 密码通行密钥和账号转正页 30，剩余 0 项——v8.34 #22⑪ support 实证 UNSUPPORTED_ON_DEVICE 门控隐藏，#22 十一项全处置完毕', () => {
    expect(tp).toContain('v8.32 安全和紧急情况转正页 29、v8.33 密码通行密钥和账号转正页 30，剩余 0 项——v8.34 #22⑪ support 实证 UNSUPPORTED_ON_DEVICE 门控隐藏，#22 十一项全处置完毕');
  });

  it('负断言：emergency 不再指向 STUB 占位', () => {
    expect(tp.match(/key: 'emergency'[^\n]*idx:\s*STUB_IDX/)).toBeNull();
  });
});

describe('v8.32 #22⑧ 字符纪律', () => {
  const s = src('ios-desktop/js/apps/settings.js');

  it('零 \\u 转义：emergency 段全部字面 CJK（Character Safety 源文件纪律）', () => {
    const i = s.indexOf('v8.32 #22⑧：安全和紧急情况页');
    const seg = s.slice(i, s.indexOf('  ],\n};', i));
    expect(seg).not.toMatch(/\\u[0-9a-fA-F]{4}/);
  });
});
