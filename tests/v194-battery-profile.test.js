// ==================== v194-battery-profile.test.js — v9.26 电池四态 ColorProfile（#194） ====================
//
// AOSP main 实证（快照 docs/reference/frameworks-base/battery/ 两件）：
//   1. BatteryDrawableState.kt L26-34：ColorProfile { None/Active/Warning/Error } 四态互斥
//   2. ThemedBatteryDrawable.kt L418 CRITICAL_LEVEL=20；L231 <=CRITICAL && !charging →
//      error（!charging 实锤：充电优先于低电）；L246 powerSave → errorPaint+scaledPlus；
//      L256-261 batteryColorForLevel（charging||powerSave → fillColor）；L317 迟滞 67/33
//   3. BatteryMeterDrawableBase.java L66 FULL=96；L68 BOLT_LEVEL_THRESHOLD=0.3f
//
// 覆盖：A 快照在册 / B 常量 / C colorProfile 真跑 / D 迟滞真跑 / E fillFraction+bolt /
//       F status-bar 接线 / G CSS / H 版本真源 9.26.0

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

import {
  CRITICAL_LEVEL, INVERT_FILL_HIGH, INVERT_FILL_LOW, FULL_LEVEL, BOLT_LEVEL_THRESHOLD,
  COLOR_PROFILE, colorProfile, invertFillIcon, fillFraction, boltOpaque,
} from '../ios-desktop/js/aosp/battery-drawable-state.js';

describe('v9.26 · A. AOSP 快照在册 + 常量真值', () => {
  test('BatteryDrawableState.kt 四态枚举逐字锚', () => {
    const t = src('docs/reference/frameworks-base/battery/BatteryDrawableState.kt');
    expect(t).toContain('enum class ColorProfile {');
    expect(t).toContain('None,');
    expect(t).toContain('Active,');
    expect(t).toContain('Warning,');
    expect(t).toContain('Error,');
  });

  test('ThemedBatteryDrawable.kt 判据锚（CRITICAL_LEVEL=20 / 迟滞 67/33 / batteryColorForLevel）', () => {
    const t = src('docs/reference/frameworks-base/battery/ThemedBatteryDrawable.kt');
    expect(t).toContain('private const val CRITICAL_LEVEL = 20');
    expect(t).toContain('invertFillIcon = if (l >= 67) true else if (l <= 33) false else invertFillIcon');
    expect(t).toContain('charging || powerSaveEnabled -> fillColor');
  });

  test('常量真值（20/67/33/96/0.3）', () => {
    expect(CRITICAL_LEVEL).toBe(20);
    expect(INVERT_FILL_HIGH).toBe(67);
    expect(INVERT_FILL_LOW).toBe(33);
    expect(FULL_LEVEL).toBe(96);
    expect(BOLT_LEVEL_THRESHOLD).toBe(0.3);
  });
});

describe('v9.26 · C. colorProfile 真跑（四态互斥映射）', () => {
  test('C1 低电边界两向：20→Error / 21 非充电→None（L231 <= 判据）', () => {
    expect(colorProfile(20, false, false)).toBe('Error');
    expect(colorProfile(21, false, false)).toBe('None');
  });

  test('C2 充电优先于低电（L231 !charging 实锤）：低电充电 → Active 非 Error', () => {
    expect(colorProfile(10, true, false)).toBe('Active');
    expect(colorProfile(0, true, false)).toBe('Active');
  });

  test('C3 省电 → Warning；省电+低电（非充电）→ Warning（绘制顺序 L231 先画 L246 后画覆盖推导，诚实标注）', () => {
    expect(colorProfile(50, false, true)).toBe('Warning');
    expect(colorProfile(15, false, true)).toBe('Warning');
  });

  test('C4 充电+省电并发 → Active（L258 when 合并支 fillColor 外部设 Active 语义）', () => {
    expect(colorProfile(50, true, true)).toBe('Active');
  });

  test('C5 正常态 → None（灰默认）', () => {
    expect(colorProfile(85, false, false)).toBe('None');
  });
});

describe('v9.26 · D. invertFillIcon 迟滞真跑（L317 逐字）', () => {
  test('D1 >=67 → true / <=33 → false', () => {
    expect(invertFillIcon(false, 67)).toBe(true);
    expect(invertFillIcon(false, 100)).toBe(true);
    expect(invertFillIcon(true, 33)).toBe(false);
    expect(invertFillIcon(true, 0)).toBe(false);
  });

  test('D2 中间区（34-66）保持 prev 不翻转（迟滞防抖）', () => {
    expect(invertFillIcon(true, 50)).toBe(true);
    expect(invertFillIcon(false, 50)).toBe(false);
    expect(invertFillIcon(true, 66)).toBe(true);
    expect(invertFillIcon(false, 34)).toBe(false);
  });

  test('D3 序列穿越：33→false 升至 67→true 中途 50 保持', () => {
    let inv = true;
    inv = invertFillIcon(inv, 33);   // → false
    expect(inv).toBe(false);
    inv = invertFillIcon(inv, 50);   // 中间区保持 false
    expect(inv).toBe(false);
    inv = invertFillIcon(inv, 67);   // → true
    expect(inv).toBe(true);
  });
});

describe('v9.26 · E. fillFraction + boltOpaque（BatteryMeterDrawableBase L66/L68）', () => {
  test('E1 FULL=96 满电折算：95→0.95 / 96→1 / 100→1', () => {
    expect(fillFraction(95)).toBe(0.95);
    expect(fillFraction(96)).toBe(1);
    expect(fillFraction(100)).toBe(1);
  });

  test('E2 boltOpaque：<0.3 → true（不透明保对比度）/ ≥0.3 → false', () => {
    expect(boltOpaque(0.29)).toBe(true);
    expect(boltOpaque(0.3)).toBe(false);
    expect(boltOpaque(0.85)).toBe(false);
  });
});

describe('v9.26 · F. status-bar.js 接线（静态断言）', () => {
  const sb = src('ios-desktop/js/status-bar.js');

  test('F1 colorProfile 消费 + saver 与 battery-service.simSaverActive 同口径（body class 单一真源）', () => {
    expect(sb).toContain("from './aosp/battery-drawable-state.js'");
    expect(sb).toContain("document.body.classList.contains('battery-saver-mode')");
    expect(sb).toContain('const profile = colorProfile(batteryLevel, isBatteryCharging, saverOn);');
  });

  test('F2 FULL=96 折算进填充宽度 + 四态 class 差分', () => {
    expect(sb).toContain('Math.round(fillFraction(batteryLevel) * 100)');
    expect(sb).toContain("'battery-critical': profile === COLOR_PROFILE.ERROR");
    expect(sb).toContain("'battery-saver': profile === COLOR_PROFILE.WARNING");
  });
});

describe('v9.26 · G. CSS 分态（--md-error / --md-tertiary / colorError 加号伪元素）', () => {
  const css = src('ios-desktop/css/status-bar.css');

  test('G1 低电红（meter+shape 同染）+ 省电黄近似 + 加号伪元素', () => {
    expect(css).toMatch(/\.battery-pill\.battery-critical \.battery-icon-level \{[^]*?background: var\(--md-error/s);
    expect(css).toMatch(/\.battery-pill\.battery-saver \.battery-icon-level \{[^]*?background: var\(--md-tertiary/s);
    expect(css).toMatch(/\.battery-pill\.battery-saver \.battery-icon-shape::before \{[^]*?content: '\+';[^]*?color: var\(--md-error/s);
  });
});

describe('v9.26 · H. 版本真源', () => {
  test('H1 package.json 9.26.0（v150 同口径）', () => {
    const pkg = JSON.parse(src('package.json'));
    expect(pkg.version).toBe('10.93.0');
  });

  test('H2 README 当前版本 v9.28（version:sync 写入）', () => {
    expect(src('README.md')).toMatch(/v10\.93/);
  });
});
