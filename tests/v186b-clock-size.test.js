// ==================== v186b-clock-size.test.js — v9.27 锁屏时钟双档 + DYNAMIC 策略（#186 二期） ====================
//
// AOSP main 实证（快照 docs/reference/frameworks-base/systemui/keyguard/，R49 加餐
// api.github.com contents 端点实拉入库）：
//   ClockSize.kt（63 行）
//     L23-42  enum ClockSize(SMALL(KeyguardClockSwitch.SMALL)/LARGE(KeyguardClockSwitch.LARGE))
//             + fromLegacy 未识别兜底 LARGE（Log.e → 返回兜底语义）
//     L44-63  enum ClockSizeSetting(DYNAMIC(1)/SMALL(0))
//             + fromSettingValue 未识别兜底 DYNAMIC（无 LARGE 档）
//   KeyguardClockSwitch.java（501 行，main 分支为 .java 非 .kt——路径考证在录）
//     L54-59  @IntDef({LARGE, SMALL}) + LARGE=0 / SMALL=1（legacyValue 真值）
//     L368-381 updateClockViews 非动画路径：out INVISIBLE + in VISIBLE
//     L448-461 switchToClock：同值短路 return false + mDisplayedClockSize 记忆
//   KeyguardClockSwitchController.java（696 行）
//     L93     mCurrentClockSize = SMALL 初值
//     L455-457 displayClock 的 mCanShowDoubleLineClock 门（false 时拒绝 LARGE）
//     L617-626 updateDoubleLineClock：false → displayClock(SMALL)
//
// 覆盖：A 三快照在册 / B 枚举与真值 / C 兜底真跑 / D DYNAMIC 决策表真跑 /
//       E 门控与 switchToClock 真跑 / F 消费端接线（lock-screen.js + lock-screen.css）
//       / G 版本真源 9.27.0

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  KEYGUARD_CLOCK_SWITCH, ClockSize, fromLegacy,
  ClockSizeSetting, fromSettingValue,
  resolveDisplayedClockSize, applyDoubleLineGate, switchToClock,
} from '../ios-desktop/js/aosp/clock-size.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const src = (p) => readFileSync(path.join(ROOT, p), 'utf8');

describe('v9.27 · A. AOSP 三快照在册', () => {
  test('A1 ClockSize.kt 快照逐字锚（双枚举 + 双兜底）', () => {
    const t = src('docs/reference/frameworks-base/systemui/keyguard/ClockSize.kt');
    expect(t).toContain('enum class ClockSize(');
    expect(t).toContain('SMALL(KeyguardClockSwitch.SMALL)');
    expect(t).toContain('LARGE(KeyguardClockSwitch.LARGE)');
    expect(t).toContain('Unrecognized legacy clock size value: $value');
    expect(t).toContain('return LARGE');
    expect(t).toContain('enum class ClockSizeSetting(');
    expect(t).toContain('DYNAMIC(1)');
    expect(t).toContain('SMALL(0)');
    expect(t).toContain('Unrecognized clock setting value: $value');
    expect(t).toContain('return DYNAMIC');
    expect(t.replace(/\n$/, '').split('\n').length).toBe(63);
  });

  test('A2 KeyguardClockSwitch.java 快照逐字锚（LARGE=0/SMALL=1 真值 + 同值短路）', () => {
    const t = src('docs/reference/frameworks-base/systemui/keyguard/KeyguardClockSwitch.java');
    expect(t).toContain('public static final int LARGE = 0;');
    expect(t).toContain('public static final int SMALL = 1;');
    expect(t).toContain('mDisplayedClockSize != null && clockSize == mDisplayedClockSize');
    expect(t).toContain('return false');
    expect(t).toContain('mDisplayedClockSize = clockSize');
    expect(t).toContain('out.setVisibility(INVISIBLE)');
    expect(t).toContain('in.setVisibility(VISIBLE)');
    expect(t.replace(/\n$/, '').split('\n').length).toBe(501);
  });

  test('A3 KeyguardClockSwitchController.java 快照逐字锚（SMALL 初值 + 双行门）', () => {
    const t = src('docs/reference/frameworks-base/systemui/keyguard/KeyguardClockSwitchController.java');
    expect(t).toContain('private int mCurrentClockSize = SMALL;');
    expect(t).toContain('private boolean mCanShowDoubleLineClock = true;');
    expect(t).toContain('!mCanShowDoubleLineClock && clockSize == KeyguardClockSwitch.LARGE');
    expect(t).toContain('displayClock(KeyguardClockSwitch.SMALL');
    expect(t).toContain('Settings.Secure.LOCKSCREEN_USE_DOUBLE_LINE_CLOCK');
    expect(t.replace(/\n$/, '').split('\n').length).toBe(696);
  });
});

describe('v9.27 · B. 枚举与真值逐字', () => {
  test('B1 KeyguardClockSwitch legacyValue 真值（LARGE=0/SMALL=1）', () => {
    expect(KEYGUARD_CLOCK_SWITCH.LARGE).toBe(0);
    expect(KEYGUARD_CLOCK_SWITCH.SMALL).toBe(1);
    expect(ClockSize.LARGE.legacyValue).toBe(0);
    expect(ClockSize.SMALL.legacyValue).toBe(1);
  });

  test('B2 ClockSizeSetting settingValue 真值（DYNAMIC(1)/SMALL(0)，无 LARGE 档）', () => {
    expect(ClockSizeSetting.DYNAMIC.settingValue).toBe(1);
    expect(ClockSizeSetting.SMALL.settingValue).toBe(0);
    expect(ClockSizeSetting.LARGE).toBeUndefined();
  });
});

describe('v9.27 · C. 兜底真跑（fromLegacy/fromSettingValue）', () => {
  test('C1 fromLegacy：0→LARGE 1→SMALL 未识别→LARGE 兜底', () => {
    expect(fromLegacy(0)).toBe(ClockSize.LARGE);
    expect(fromLegacy(1)).toBe(ClockSize.SMALL);
    expect(fromLegacy(999)).toBe(ClockSize.LARGE); // 未识别兜底 LARGE（ClockSize.kt L39）
    expect(fromLegacy(-1)).toBe(ClockSize.LARGE);
  });

  test('C2 fromSettingValue：1→DYNAMIC 0→SMALL 未识别→DYNAMIC 兜底', () => {
    expect(fromSettingValue(1)).toBe(ClockSizeSetting.DYNAMIC);
    expect(fromSettingValue(0)).toBe(ClockSizeSetting.SMALL);
    expect(fromSettingValue(2)).toBe(ClockSizeSetting.DYNAMIC); // 未识别兜底 DYNAMIC（ClockSize.kt L60）
    expect(fromSettingValue(-7)).toBe(ClockSizeSetting.DYNAMIC);
  });
});

describe('v9.27 · D. DYNAMIC 决策表真跑（resolveDisplayedClockSize）', () => {
  test('D1 DYNAMIC：有通知→SMALL / 无通知→LARGE', () => {
    expect(resolveDisplayedClockSize(ClockSizeSetting.DYNAMIC, true)).toBe(ClockSize.SMALL);
    expect(resolveDisplayedClockSize(ClockSizeSetting.DYNAMIC, false)).toBe(ClockSize.LARGE);
  });

  test('D2 SMALL：恒 SMALL（通知有无无关）', () => {
    expect(resolveDisplayedClockSize(ClockSizeSetting.SMALL, true)).toBe(ClockSize.SMALL);
    expect(resolveDisplayedClockSize(ClockSizeSetting.SMALL, false)).toBe(ClockSize.SMALL);
  });
});

describe('v9.27 · E. 门控与 switchToClock 真跑', () => {
  test('E1 applyDoubleLineGate：门关时 LARGE 降档 SMALL（Controller L455-457 同构）', () => {
    expect(applyDoubleLineGate(ClockSize.LARGE, false)).toBe(ClockSize.SMALL);
    expect(applyDoubleLineGate(ClockSize.LARGE, true)).toBe(ClockSize.LARGE);
    expect(applyDoubleLineGate(ClockSize.SMALL, false)).toBe(ClockSize.SMALL); // SMALL 请求原样通过
  });

  test('E2 switchToClock：同值短路 + null 初始化必切换 + 记忆', () => {
    expect(switchToClock(ClockSize.SMALL, ClockSize.SMALL)).toEqual({ changed: false, displayed: ClockSize.SMALL });
    expect(switchToClock(ClockSize.LARGE, ClockSize.LARGE).changed).toBe(false);
    expect(switchToClock(null, ClockSize.SMALL)).toEqual({ changed: true, displayed: ClockSize.SMALL }); // L128 未初始化
    expect(switchToClock(ClockSize.SMALL, ClockSize.LARGE)).toEqual({ changed: true, displayed: ClockSize.LARGE });
    // changed=false 时 displayed 维持 prev（调用方不得改档）
    expect(switchToClock(ClockSize.LARGE, ClockSize.LARGE).displayed).toBe(ClockSize.LARGE);
  });
});

describe('v9.27 · F. 消费端接线（lock-screen.js + lock-screen.css）', () => {
  test('F1 lock-screen.js 双容器 + DYNAMIC 接线锚', () => {
    const js = src('ios-desktop/js/lock-screen.js');
    expect(js).toContain("from './aosp/clock-size.js'");
    expect(js).toContain('lock-clock-large');
    expect(js).toContain('function updateLockClockSize()');
    expect(js).toContain('resolveDisplayedClockSize(clockSizeSetting, hasNotifications)');
    expect(js).toContain('applyDoubleLineGate(resolved, CAN_SHOW_DOUBLE_LINE_CLOCK)');
    expect(js).toContain('switchToClock(displayedClockSize, desired)');
    // 接线位：renderLockNotifications 尾部 DYNAMIC 通知判定（通知增删即重判）
    expect(js).toMatch(/renderLockNotifications[\s\S]{0,600}updateLockClockSize\(\)/);
    // 双容器常驻 DOM（显隐切换非重建）
    expect(js).toContain('small.style.visibility');
    expect(js).toContain("large.style.display = 'none'");
    expect(js).toContain("large.style.display = 'block'");
  });

  test('F2 lock-screen.css 大钟容器 region 语义锚', () => {
    const css = src('ios-desktop/css/lock-screen.css');
    expect(css).toContain('.lock-clock-large');
    expect(css).toMatch(/\.lock-clock-large\s*\{[\s\S]*?display:\s*none/); // 默认 GONE
    expect(css).toMatch(/\.lock-clock-large\s*\{[\s\S]*?position:\s*absolute/); // getLargeClockRegion 语义
    expect(css).toMatch(/\.lock-clock-large\s*\{[\s\S]*?font-variation-settings/); // 四轴兜底双保险
    expect(css).toMatch(/\.lock-clock-large\s*\{[\s\S]*?RobotoFlex/); // 字体栈与小钟同源
  });
});

describe('v9.27 · G. 版本真源', () => {
  test('G1 package.json 9.27.0 + README 当前版本 v9.27', () => {
    const pkg = JSON.parse(src('package.json'));
    expect(pkg.version).toBe('9.77.0');
    expect(src('README.md')).toContain('**当前版本 v9.77**');
  });

  test('G2 本文件自含 v9.27 锚', () => {
    expect(src('tests/v186b-clock-size.test.js')).toContain('v9.77');
  });
});
