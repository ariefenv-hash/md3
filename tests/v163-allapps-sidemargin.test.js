// ==================== v163-allapps-sidemargin.test.js — #163 应用抽屉平板态两侧留白 v9.11 ====================
//
// 覆盖（#163 验收原文逐条，AOSP 权威 AllAppsProfile.calculateallAppsLeftRightMargin · AllAppsProfile.kt:271-288）：
//   · leftRightMarginFor 逐字同构：手机 0（else 分支）/ 大屏 max(1,(可用宽−used)/2)
//   · 常量：ALL_APPS_HORIZONTAL_PADDING=16（styles.xml:514-515）/ AA_CELL_WIDTH_PX=88（工程近似留痕）
//   · CSS：tablet .aa-sheet left/right var(--aa-side-pad, 0px)（无 JS 回退 0 保持现状）
//   · JS 注入：--aa-side-pad setProperty/removeProperty 对称（open tablet 分支）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FORM_SRC = readFileSync(join(ROOT, 'ios-desktop/js/allapps-form.js'), 'utf-8');
const CSS_SRC = readFileSync(join(ROOT, 'ios-desktop/css/all-apps.css'), 'utf-8');
const AA_SRC = readFileSync(join(ROOT, 'ios-desktop/js/all-apps.js'), 'utf-8');

// ESM 模块直接 import（allapps-form.js 无初始化环，v73 起即为裸 import 纪律）
import {
  leftRightMarginFor, ALL_APPS_HORIZONTAL_PADDING, AA_CELL_WIDTH_PX,
  AA_TABLET_MIN_WIDTH, TABLET_COLUMNS, WIDE_COLUMNS, DEFAULT_BORDER_SPACE,
} from '../ios-desktop/js/allapps-form.js';

describe('v9.11 #163 core：calculateallAppsLeftRightMargin 逐字同构', () => {
  it('手机形态返回 0（权威 else 分支：填满无留白）', () => {
    expect(leftRightMarginFor(390)).toBe(0);
    expect(leftRightMarginFor(767)).toBe(0);
    expect(leftRightMarginFor(0)).toBe(0);
    expect(leftRightMarginFor(-5)).toBe(0);
  });
  it('平板 800：used=88×6+8×5+16×2=600 → 每侧留白 (800−600)/2=100', () => {
    expect(leftRightMarginFor(800)).toBe(100);
  });
  it('平板 768（阈值起点）：used=600 → 每侧 (768−600)/2=84', () => {
    expect(leftRightMarginFor(768)).toBe(84);
  });
  it('大屏 1440（8 列）：used=88×8+8×7+32=792 → 每侧 (1440−792)/2=324', () => {
    expect(leftRightMarginFor(1440)).toBe(324);
  });
  it('下界钳 1：内容超宽时仍保底 1px（权威 max(1,·)）', () => {
    expect(leftRightMarginFor(768, 500)).toBe(1); // 500×6+40+32=3072 ≫ 768
  });
  it('显式参数覆盖默认（cellWidthPx/columns/borderSpace 可注入）', () => {
    expect(leftRightMarginFor(800, 88, 6, 8)).toBe(100);
    expect(leftRightMarginFor(800, 60, 6, 8)).toBe(184); // used=60×6+8×5+32=432 → (800−432)/2=184
  });
  it('常量原值：padding 16 / cell 88 / 阈值与列数联动在册', () => {
    expect(ALL_APPS_HORIZONTAL_PADDING).toBe(16);
    expect(AA_CELL_WIDTH_PX).toBe(88);
    expect(AA_TABLET_MIN_WIDTH).toBe(768);
    expect(TABLET_COLUMNS).toBe(6);
    expect(WIDE_COLUMNS).toBe(8);
    expect(DEFAULT_BORDER_SPACE).toBe(8);
  });
});

describe('v9.11 #163 接线：CSS 变量承载 + JS 注入对称', () => {
  it('CSS：tablet .aa-sheet 补 left/right var(--aa-side-pad, 0px)（无 JS 回退 0）', () => {
    expect(CSS_SRC).toMatch(/\.all-apps-overlay\[data-form='tablet'\] \.aa-sheet \{[^}]*left: var\(--aa-side-pad, 0px\);[^}]*right: var\(--aa-side-pad, 0px\);/s);
  });
  it('JS：open tablet 分支 setProperty --aa-side-pad / else removeProperty 对称', () => {
    expect(AA_SRC).toContain("overlayEl.style.setProperty('--aa-side-pad', `${leftRightMarginFor(window.innerWidth)}px`)");
    expect(AA_SRC).toContain("overlayEl.style.removeProperty('--aa-side-pad')");
  });
  it('公式来源留痕：AOSP 锚点注释在册（AllAppsProfile.kt:271-288 / #163）', () => {
    expect(FORM_SRC).toContain('AllAppsProfile.kt:271-288');
    expect(FORM_SRC).toContain('#163');
  });
});
