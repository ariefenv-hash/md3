// ==================== v174 测试 — 设置双栏一级菜单选中态 A17 对齐（v9.20 R45 加餐） ====================
//
// #174 [移植][设置]：md3 双栏选中态仍是 Android 16「on-surface 实底反色」（CSS 注释自述
// 「Android 16 同款反差」），A17 已改 accent 色背景 + 28dp 圆角。三差异（#174 三节）：
//   ① 选中底色：on-surface 实底 → accent 色系（homepage_highlighted_item_background →
//      accent_select_background；framework 色表数值未定位 —— #174 四节诚实标注路径②，
//      以 res/color/preference_highlight_color.xml = alpha 0.26 colorAccent 落地）
//   ② 选中文字：不做反色（权威 drawable 无文字色语义，label/sub/chev 保持 on-surface）
//   ③ 圆角：999px 全圆 → 28dp（homepage_preference_corner_radius，dimens.xml:102）
// 双栏专用 padding（icon 8dp / text 24dp）v8.98 #137 已落（#174 三节表格滞后，回帖说明）。
//
// 断言面：A. A17 三差异落地  B. A16 旧形态清零  C. 诚实标注在册  D. 版本真源 9.26.0

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const CSS = read('ios-desktop/css/settings-two-pane.css');
const PKG = JSON.parse(read('package.json'));
const README = read('README.md');

describe('v9.20 #174：双栏一级菜单选中态 A17 对齐（纯移植，无超越空间）', () => {
  it('A1 ①选中底色 = accent 26%（preference_highlight_color alpha 0.26 colorAccent 落地）', () => {
    expect(CSS).toContain(
      'background: color-mix(in srgb, var(--md-primary, #7df8db) 26%, transparent);'
    );
  });

  it('A2 ②文字不做反色：tp-sel 下无 label/sub/chev 反色块（on-surface 原色）', () => {
    expect(CSS).not.toMatch(/\.tp-row\.tp-sel\s+\.tp-row-label\s*\{[^}]*--md-surface/);
    expect(CSS).not.toMatch(/\.tp-row\.tp-sel\s+\.tp-row-sub[\s\S]{0,120}?--md-surface/);
  });

  it('A3 ③圆角 28dp（homepage_preference_corner_radius，非全圆胶囊）', () => {
    expect(CSS).toContain('border-radius: 28px; /* homepage_preference_corner_radius 28dp');
    // 仅锚定行/选中行（.tp-search 全圆属 #137 app_bar 权威，不在 #174 范围）
    expect(CSS).not.toMatch(/\.tp-row\s*\{[^}]*999px/);
    expect(CSS).not.toMatch(/\.tp-row\.tp-sel[^{]*\{[^}]*999px/);
  });

  it('B1 A16 旧形态清零：on-surface 实底选中 + 注释自述「Android 16 同款反差」撤销', () => {
    expect(CSS).not.toMatch(/\.tp-row\.tp-sel\s*\{[^}]*--md-on-surface/);
    expect(CSS).not.toContain('Android 16 同款反差');
  });

  it('C1 诚实标注在册：framework 色表未定位 + preference_highlight_color 落地参考依据', () => {
    expect(CSS).toContain('accent_select_background');
    expect(CSS).toContain('preference_highlight_color.xml');
    expect(CSS).toContain('诚实标注');
  });

  it('D1 版本真源 9.26.0（v150 同口径）', () => {
    expect(PKG.version).toBe('10.66.0');
    expect(README).toContain('**当前版本 v10.66**');
  });
});
