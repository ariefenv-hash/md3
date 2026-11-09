// ==================== v8.24 #47：设置一级菜单 A17 expressive 彩色圆底 ====================
//
// 议题 #47：Android 16+ 一级菜单图标带彩色圆形容器；当前实现未对齐。
// v7.98 曾依「非 Expressive 路径」源码移除 v7.51 底板 —— 本版以 A17 Expressive 路径
// 实源勘正（LineageOS lineage-24.0 = A17 基线，api.github raw media type 实拉）：
//   - top_level_settings_expressive.xml：21 项全部 ic_homepage_* = layer-list：
//     AdaptiveIconShapeDrawable 40dp 彩色圆底（dashboard_tile_image_size）+ glyph 24dp
//     （dashboard_tile_foreground_image_size，inset 8dp 恰居中；TintDrawable 包
//     ic_settings_*_filled 同 path + tint=homepage_X_foreground）
//   - 逐项色：homepage_X_background → m3_ref_palette_{family}90（日）/80（夜）；
//     homepage_X_foreground → 30 档恒定（values-night 仅覆盖 bg）
//   - hex 权威源：material-components-android extended_palette_tokens.xml（字节级）
// 测试纪律：indexOf 切片锚点用定义形态；负断言 not.toMatch 防注释误报；\b 防前缀误匹配。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8');

describe('v8.24 #47 TP_PLATE 色板（m3_ref_palette 权威 hex 防调参守卫）', () => {
  const tp = src('ios-desktop/js/apps/settings-two-pane.js');

  const iPlate = tp.indexOf('const TP_PLATE = {');
  const iPlateEnd = tp.indexOf('};', iPlate);
  const plate = tp.slice(iPlate, iPlateEnd);

  it('10 色族全量在位且 hex 与 extended_palette_tokens.xml 字节级一致', () => {
    expect(iPlate).toBeGreaterThan(-1);
    // bgDark = X80 档 / bgLight = X90 档 / fg = X30 档
    expect(plate).toContain("blueVariant: { bgDark: '#67D4FF', bgLight: '#BDE9FF', fg: '#004D68' }");
    expect(plate).toContain("blue:        { bgDark: '#A1C9FF', bgLight: '#D0E4FF', fg: '#04409F' }");
    expect(plate).toContain("pink:        { bgDark: '#FFAEE4', bgLight: '#FFD8EF', fg: '#8D0053' }");
    expect(plate).toContain("orange:      { bgDark: '#FFB683', bgLight: '#FFDCC3', fg: '#753403' }");
    expect(plate).toContain("yellow:      { bgDark: '#FCBD00', bgLight: '#FFE07C', fg: '#6D3A01' }");
    expect(plate).toContain("green:       { bgDark: '#80DA88', bgLight: '#BEEFBB', fg: '#00522C' }");
    expect(plate).toContain("grey:        { bgDark: '#C7C7C7', bgLight: '#E3E3E3', fg: '#474747' }");
    expect(plate).toContain("cyan:        { bgDark: '#60D5F3', bgLight: '#ACEDFF', fg: '#004E5D' }");
    expect(plate).toContain("red:         { bgDark: '#FFB3AE', bgLight: '#FFDADC', fg: '#8A1A16' }");
    expect(plate).toContain("purple:      { bgDark: '#D9BAFD', bgLight: '#EEDCFE', fg: '#5629A4' }");
  });

  it('21 项一级清单逐项 plate 映射齐全（A17 expressive ic_homepage_* 实引族）', () => {
    // network/connected → blue_variant（homepage_network/connected_device_background）
    expect(tp).toMatch(/key: 'network', icon: 'topWireless', plate: 'blueVariant'/);
    expect(tp).toMatch(/key: 'connected', icon: 'topDevices', plate: 'blueVariant'/);
    // apps → blue；notifications/sound/modes → pink；communal/display/wallpaper → orange
    expect(tp).toMatch(/key: 'apps',[^\n]*plate: 'blue'/);
    expect(tp).toMatch(/key: 'notifications',[^\n]*plate: 'pink'/);
    expect(tp).toMatch(/key: 'sound',[^\n]*plate: 'pink'/);
    expect(tp).toMatch(/key: 'modes',[^\n]*plate: 'pink'/);
    expect(tp).toMatch(/key: 'communal',[^\n]*plate: 'orange'/);
    expect(tp).toMatch(/key: 'display',[^\n]*plate: 'orange'/);
    expect(tp).toMatch(/key: 'wallpaper',[^\n]*plate: 'orange'/);
    // storage → yellow；battery → green；system/about → grey
    expect(tp).toMatch(/key: 'storage',[^\n]*plate: 'yellow'/);
    expect(tp).toMatch(/key: 'battery',[^\n]*plate: 'green'/);
    expect(tp).toMatch(/key: 'system',[^\n]*plate: 'grey'/);
    expect(tp).toMatch(/key: 'about',[^\n]*plate: 'grey'/);
    // security/privacy/location/accounts → cyan（privacy 随 ic_homepage_privacy 实引 security 底）
    // safety/emergency → red（emergency 随 ic_homepage_emergency 实引 safety 底）
    // accessibility/support → purple
    expect(tp).toMatch(/key: 'security',[^\n]*plate: 'cyan'/);
    expect(tp).toMatch(/key: 'privacy',[^\n]*plate: 'cyan'/);
    expect(tp).toMatch(/key: 'location',[^\n]*plate: 'cyan'/);
    expect(tp).toMatch(/key: 'accounts',[^\n]*plate: 'cyan'/);
    expect(tp).toMatch(/key: 'safety',[^\n]*plate: 'red'/);
    expect(tp).toMatch(/key: 'emergency',[^\n]*plate: 'red'/);
    expect(tp).toMatch(/key: 'accessibility',[^\n]*plate: 'purple'/);
    expect(tp).toMatch(/key: 'support',[^\n]*plate: 'purple'/);
  });

  it('navRow 圆容器形态：border-radius 50% + 40px + 逐项 CSS 变量（缺省回退 blue）', () => {
    const iNav = tp.indexOf('function navRow(item) {');
    const iNavEnd = tp.indexOf('export function renderSettingsListHTML', iNav);
    const nav = tp.slice(iNav, iNavEnd);
    expect(nav).toContain('border-radius:50%;background:var(--tpc-${plate},var(--tpc-blue))');
    expect(nav).toContain('color:var(--tpc-${plate}-fg,var(--tpc-blue-fg))');
    expect(nav).toContain('width:40px;height:40px');
    expect(nav).toMatch(/const plate = item\.plate \|\| 'blue';/);
  });
});

describe('v8.24 #47 CSS 变量两套明暗（settings-two-pane.css）', () => {
  const css = src('ios-desktop/css/settings-two-pane.css');

  const iRoot = css.indexOf(':root {');
  const iLight = css.indexOf('body.light-theme {', iRoot);
  const rootSeg = css.slice(iRoot, iLight);
  const lightSeg = css.slice(iLight, iLight + 700);

  it(':root（暗色默认）10 族 bg 80 档 + fg 30 档', () => {
    expect(rootSeg).toContain('--tpc-blueVariant: #67D4FF; --tpc-blueVariant-fg: #004D68;');
    expect(rootSeg).toContain('--tpc-blue: #A1C9FF;        --tpc-blue-fg: #04409F;');
    expect(rootSeg).toContain('--tpc-pink: #FFAEE4;        --tpc-pink-fg: #8D0053;');
    expect(rootSeg).toContain('--tpc-orange: #FFB683;      --tpc-orange-fg: #753403;');
    expect(rootSeg).toContain('--tpc-yellow: #FCBD00;      --tpc-yellow-fg: #6D3A01;');
    expect(rootSeg).toContain('--tpc-green: #80DA88;       --tpc-green-fg: #00522C;');
    expect(rootSeg).toContain('--tpc-grey: #C7C7C7;        --tpc-grey-fg: #474747;');
    expect(rootSeg).toContain('--tpc-cyan: #60D5F3;        --tpc-cyan-fg: #004E5D;');
    expect(rootSeg).toContain('--tpc-red: #FFB3AE;         --tpc-red-fg: #8A1A16;');
    expect(rootSeg).toContain('--tpc-purple: #D9BAFD;      --tpc-purple-fg: #5629A4;');
  });

  it('body.light-theme 覆盖 10 族 bg 90 档；fg 不覆盖（恒定，A17 values-night 同构）', () => {
    for (const [fam, v] of [
      ['--tpc-blueVariant', '#BDE9FF'], ['--tpc-blue', '#D0E4FF'], ['--tpc-pink', '#FFD8EF'],
      ['--tpc-orange', '#FFDCC3'], ['--tpc-yellow', '#FFE07C'], ['--tpc-green', '#BEEFBB'],
      ['--tpc-grey', '#E3E3E3'], ['--tpc-cyan', '#ACEDFF'], ['--tpc-red', '#FFDADC'],
      ['--tpc-purple', '#EEDCFE'],
    ]) {
      expect(lightSeg).toContain(`${fam}: ${v};`);
    }
    expect(lightSeg).not.toMatch(/-fg:/); // fg 30 档不随明暗切换
  });

  it('glyph 仍复用 icons-aosp.js（TintDrawable=同 path 换 tint，无新 path 转换必要）', () => {
    const tp = src('ios-desktop/js/apps/settings-two-pane.js');
    expect(tp).toContain("from '../icons-aosp.js'");
    expect(tp).toContain('AOSP_ICONS[item.icon]');
  });
});

describe('v8.24 #47 防回潮与勘正留痕', () => {
  const tp = src('ios-desktop/js/apps/settings-two-pane.js');

  it('旧 colorPrimary 单色形态退役（v7.98 非 Expressive 结论勘正后不再回锚）', () => {
    const iNav = tp.indexOf('function navRow(item) {');
    const nav = tp.slice(iNav, tp.indexOf('export function renderSettingsListHTML', iNav));
    expect(nav).not.toMatch(/tp-home-icon[^`]*color:var\(--md-primary/);
  });

  it('头注释留勘正痕迹（Expressive 路径证据链，防止下轮再依旧路径误删）', () => {
    expect(tp).toContain('【v8.24 #47 勘正】');
    expect(tp).toContain('homepage_preference_expressive');
    expect(tp).toContain('top_level_settings_expressive.xml');
    expect(tp).toContain('extended_palette_tokens.xml');
  });
});
