// ==================== v8.31 #22⑤⑥：安全和隐私页 SafetyCenter 合流 1:1 转正 ====================
//
// 议题 #22 ⑤ safety + ⑥ security 转正守护（aosp-mirror main 实源逐 key 取证，考证链见
// settings.js SAFETY_PAGE_SCRIPT 头注）：
//   页 28 = res/xml/security_dashboard_settings.xml（screen key=security_dashboard_page +
//           8 keys：security_status(order -10) / dashboard_tile_placeholder(order 1) /
//           security_category(order 10) / unlock_set_or_change / fingerprint_settings /
//           face_settings / biometric_settings / security_advanced_settings(order 100)）
//   ① 形态门控实证（二者取其一）：TopLevelSafetyCenterEntryPreferenceController（SafetyCenter
//      isEnabled → AVAILABLE，点击 = ACTION_SAFETY_CENTER → PermissionController）+
//      TopLevelSecurityEntryPreferenceController（SafetyCenter isEnabled →
//      CONDITIONALLY_UNAVAILABLE）——A17 手机默认 SafetyCenter 启用 → 一级菜单显示
//      「安全和隐私」、传统「安全」隐藏（two-pane hidden:true，communal 同律）
//   ② 安全状态卡/权限扫描摘要 = #22⑤「卡片可虚构安全状态+权限扫描结果」许可（确定性呈现）
//   ③ 硬件门控零虚构：指纹/人脸解锁/人脸解锁和指纹解锁 = isFingerprintHardwareDetected /
//      isFaceHardwareDetected → Web 无硬件 → 隐藏注记（v8.01 SIM 门控 + v8.30 同律）
//   ④ 权限使用行 → 页 5 隐私（权限管理真数据源，v8.30 勿扰→页 9 映射同律）
//
// 测试纪律（worklog 惯例）：indexOf 切片锚点用定义形态；负断言用 not.toMatch 正则
// 防注释误报；\u 零出现（源文件为字面 CJK）。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v8.31 #22⑤ SAFETY_PAGE_SCRIPT：守卫与确定性扫描语义', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('const SAFETY_PAGE_SCRIPT = `');
  expect(i).toBeGreaterThan(-1);
  const seg = s.slice(i, s.indexOf('// ==================== APPS_PAGE_SCRIPT', i));

  it('幂等守卫：window.__settingsSafetyV831（v8.26/v8.30 同律）+ 导出面挂载', () => {
    expect(seg).toContain('if (window.__settingsSafetyV831) return;');
    expect(seg).toContain('window.__settingsSafetyV831 = true;');
    expect(seg).toContain('window.__settingsSafetyV831 = { rescan: rescan, toastLock: toastLock, toastAdvanced: toastAdvanced };');
  });

  it('重新扫描 = 确定性扫描 toast（#22⑤「可虚构安全状态+权限扫描结果」许可）', () => {
    expect(seg).toContain('扫描完成，未发现安全问题');
    expect(seg).toContain('setTimeout');
    expect(seg).toContain('safetyRescanBtn');
  });

  it('屏幕锁定/更多安全设置 toast：Web 等价提示（v8.30 toastAddMode 同律）', () => {
    expect(seg).toContain('屏幕锁定方式选择后续版本转正');
    expect(seg).toContain('更多安全设置页后续版本转正');
    expect(seg).toContain('window.showSystemToast');
  });
});

describe('v8.31 #22⑤ 页 28 content：security_dashboard_settings.xml 四分区合流 1:1', () => {
  const s = src('ios-desktop/js/apps/settings.js');
  const i = s.indexOf('v8.31 #22⑤⑥：安全和隐私页');
  expect(i).toBeGreaterThan(-1);
  const seg = s.slice(i, s.indexOf('  ],\n};', i));

  it('页标题「安全和隐私」（safety_center_title zh-rCN 权威值）+ safety_center_summary 逐字', () => {
    expect(seg).toContain('安全和隐私');
    expect(seg).toContain('应用安全性、设备锁定、权限');
  });

  it('security_status 分区（order -10）：「安全状态」标题 + 虚构保护卡（#22⑤ 许可留痕注记）', () => {
    expect(seg).toContain('安全状态');
    expect(seg).toContain('已受到保护');
    expect(seg).toContain('您的设备已通过安全检查');
    expect(seg).toContain('可虚构安全状态');
  });

  it('dashboard_tile_placeholder 分区（order 1）：权限使用行 → 页 5 隐私（真数据源映射注记）', () => {
    expect(seg).toContain('权限使用');
    expect(seg).toContain('window.pushSubPage(5)');
    expect(seg).toContain('v8.30 勿扰→页 9 映射同律');
  });

  it('security_category 分区（order 10）：「设备安全性」+ 屏幕锁定行（unlock_set_or_change）', () => {
    expect(seg).toContain('设备安全性');
    expect(seg).toContain('屏幕锁定');
    expect(seg).toContain('ChooseLockGeneric');
  });

  it('硬件门控零虚构：指纹/人脸/人脸解锁和指纹解锁隐藏注记（isFingerprint/isFaceHardwareDetected 实源 key 留痕）', () => {
    expect(seg).toContain('isFingerprintHardwareDetected');
    expect(seg).toContain('isFaceHardwareDetected');
    expect(seg).toContain('fingerprint_settings「指纹」');
    expect(seg).toContain('face_settings「人脸解锁」');
    expect(seg).toContain('biometric_settings「人脸解锁和指纹解锁」');
  });

  it('security_advanced_settings（order 100）：「更多安全设置」行 + toast 接线', () => {
    expect(seg).toContain('更多安全设置');
    expect(seg).toContain('window.__settingsSafetyV831.toastAdvanced()');
  });

  it('图标接线：状态卡 topSafety + 屏幕锁定行 topSecurity + 权限使用行 topPrivacy', () => {
    expect(seg).toContain("${AOSP_ICONS.topSafety || ''}");
    expect(seg).toContain("${AOSP_ICONS.topSecurity || ''}");
    expect(seg).toContain("${AOSP_ICONS.topPrivacy || ''}");
  });

  it('四分区 order 权威序注记：-10 / 1 / 10 / 100', () => {
    expect(seg).toContain('order -10');
    expect(seg).toContain('order 1');
    expect(seg).toContain('order 10');
    expect(seg).toContain('order 100');
  });
});

describe('v8.31 #22⑥ two-pane 转正与形态门控', () => {
  const tp = src('ios-desktop/js/apps/settings-two-pane.js');

  it('safety 项 idx STUB→28（页 28 转正）+ kw 修正为安全语义', () => {
    expect(tp).toContain("{ key: 'safety', icon: 'topSafety', plate: 'red', label: '安全和隐私', sub: '应用安全性、设备锁定、权限', idx: 28, kw: '安全 隐私 应用安全 设备锁定 权限 扫描' }");
  });

  it('security 项 hidden:true 门控隐藏（TopLevelSecurityEntryPreferenceController 实证注记）', () => {
    expect(tp).toContain("{ key: 'security', icon: 'topSecurity', plate: 'cyan', label: '安全', sub: '屏幕锁定、查找我的设备、应用安全性', hidden: true, kw: '锁屏 指纹 人脸 解锁 查找设备' }");
    expect(tp).toContain('CONDITIONALLY_UNAVAILABLE');
  });

  it('负断言：safety/security 均不再指向 STUB 占位', () => {
    expect(tp.match(/key: 'safety'[^\n]*idx:\s*STUB_IDX/)).toBeNull();
    expect(tp.match(/key: 'security'[^\n]*idx:\s*STUB_IDX/)).toBeNull();
  });

  it('STUB 注记更新：v8.31 安全和隐私转正页 28、v8.32 安全和紧急情况转正页 29，剩余 2 项仍占位', () => {
    expect(tp).toContain('v8.31 安全和隐私转正页 28、v8.32 安全和紧急情况转正页 29，剩余 2 项仍占位');
  });

  it('渲染层 hidden 过滤既有机制承接（communal 先例同律）', () => {
    expect(tp).toContain('return AOSP_TOP_LEVEL.filter((i) => !i.hidden).map(navRow).join(\'\');');
  });
});

describe('v8.31 #22⑤ 字符纪律', () => {
  const s = src('ios-desktop/js/apps/settings.js');

  it('零 \\u 转义：safety 段全部字面 CJK（Character Safety 源文件纪律）', () => {
    const i = s.indexOf('const SAFETY_PAGE_SCRIPT = `');
    const seg = s.slice(i, s.indexOf('// ==================== APPS_PAGE_SCRIPT', i));
    expect(seg).not.toMatch(/\\u[0-9a-fA-F]{4}/);
  });
});
