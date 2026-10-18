// ==================== v788-qs-volume-dialog.test.js — v7.88 音量键对话框 1:1 移植 ====================
//
// 用户指令实锤：「竖着的样式仅仅应用于按下音量键来调整音量的时候」「全体应用新样式」。
// AOSP main 源码核对结论（aosp-mirror/platform_frameworks_base packages/SystemUI）：
//   1. QuickSettingsShadeOverlay.kt QuickSettingsLayout = Toolbar → BrightnessSliderContainer
//      → TileGrid，全场景无音量滑块；ShadeScene.kt 经典/分栏同样无音量。→ Shade 内竖置音量
//      滑条（v7.87 误置）是「突兀视觉空白」的根源，必须拆除。
//   2. 音量滑条唯一合法场景 = 音量键对话框（res/layout/volume_dialog.xml MotionLayout）：
//      右缘竖置 60dp 胶囊（volume_dialog_width 60dp / background_corner_radius 30dp /
//      panel_transparent_padding_right 8dp），纵列 = 铃声抽屉(volume_ringer_drawer) +
//      主滑条(volume_dialog_slider 52×254dp) + 省略号(volume_dialog_settings 40dp)，
//      components_spacing 8dp。
//   3. 收起语义 = volume/dialog VisibilityInteractor.kt MAX_DIALOG_SHOW_TIME 3.seconds
//      无操作超时（resetDismissTimeout 交互续期）+ 触外界/BACK。
//   4. 图标 = VolumeDialogSliderIconProvider：STREAM_MUSIC → ic_volume_media /
//      ic_volume_media_mute（ic_volume_media_low 为 selector→ic_volume_media，实际两态）；
//      铃声三分支 ring/vibrate/silent → ic_ring_volume / ic_volume_ringer_vibrate /
//      ic_ring_volume_off。
//   5. 网页触发 = 浏览器媒体键（AudioVolumeUp/Down/Mute；Windows 旧版 VolumeUp/Down/Mute），
//      步进对齐 STREAM_MUSIC 15 级（KEY_STEP = 100/15）。
//
// 覆盖：DOM / CSS / JS / 图标 pathData / main.js 接线 / 版本。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

describe('v7.88 · Shade/QS 面板无音量滑块（QuickSettingsShadeOverlay 同构）', () => {
  const html = src('ios-desktop/index.html');
  const css = src('ios-desktop/css/pull-panels.css');
  const qs = src('ios-desktop/js/quick-settings.js');

  test('index.html：qs-volume 全家退役（qsVolumeBar/qsVolumeFill/qsVolumeIcon/qsVolumeHandle/qsVolumeMuteBtn）', () => {
    expect(html).not.toContain('qs-volume');
    expect(html).not.toContain('qsVolume');
    expect(css).not.toContain('.qs-volume');
  });

  test('quick-settings.js：initVolumeSlider 退役、currentVolume 移交、initSliders 仅亮度', () => {
    expect(qs).not.toContain('initVolumeSlider');
    expect(qs).not.toContain('currentVolume');
    expect(qs).toMatch(/function initSliders\(\) \{\s*\n\s*initBrightnessSlider\(\);\s*\n\s*\}/);
  });

  test('亮度滑条原位保留（PlatformSlider 64dp，Shade 唯一滑条）', () => {
    expect(html).toContain('class="qs-brightness" id="qsBrightnessBar"');
    expect(html).toMatch(/id="qsInnerScroll">[\s\S]*?qs-sliders-row[\s\S]*?qs-brightness[\s\S]*?qs-tiles-grid/);
    expect(css).toMatch(/\.qs-brightness \{[^]*?height: 64px;/s);
  });
});

describe('v7.88 · 音量对话框 DOM（volume_dialog.xml 1:1）', () => {
  const html = src('ios-desktop/index.html');

  test('根容器：volume-dialog + 背景胶囊 + 铃声抽屉三钮（silent/vibrate/ring）+ 省略号', () => {
    expect(html).toContain('class="volume-dialog" id="volumeDialog"');
    expect(html).toContain('class="vd-bg"');
    expect(html).toContain('id="vdRingerDrawer"');
    expect(html).toContain('data-mode="silent"');
    expect(html).toContain('data-mode="vibrate"');
    expect(html).toContain('data-mode="ring"');
    expect(html).toContain('id="vdSettingsBtn"');
    expect(html).toContain('aria-hidden="true"');   // 默认收起
  });

  test('主滑条 52×254dp 语义：aria vertical + vd-fill/vd-icon/vd-thumb 三件套', () => {
    expect(html).toMatch(/class="vd-slider" id="vdSlider"[^]*?aria-orientation="vertical"[^]*?aria-valuemin="0"[^]*?aria-valuemax="100"/);
    expect(html).toContain('class="vd-fill"');
    expect(html).toContain('id="vdIcon"');
    expect(html).toContain('class="vd-thumb"');
  });
});

describe('v7.88 · 音量对话框 CSS（volume_dialog 几何/配色）', () => {
  const css = src('ios-desktop/css/pull-panels.css');

  test('右缘竖置胶囊：right 8dp / 宽 60dp / components_spacing 8dp / z 高于电源对话框', () => {
    expect(css).toMatch(/\.volume-dialog \{[^]*?right: 8px;[^]*?gap: 8px;[^]*?width: 60px;[^]*?z-index: 1150;/s);
    expect(css).toMatch(/\.volume-dialog\.visible \{[^]*?opacity: 1;/s);
  });

  test('背景胶囊：30dp 圆角（volume_dialog_background_corner_radius）+ surface 底', () => {
    expect(css).toMatch(/\.vd-bg \{[^]*?border-radius: 30px;[^]*?background: var\(--md-surface-container\);/s);
  });

  test('滑条几何（volume_dialog_slider.xml）：52×254 / 轨角 12dp / insideCorner 2dp / stop 6dp / 横柄 52×4dp', () => {
    expect(css).toMatch(/\.vd-slider \{[^]*?width: 52px;[^]*?height: 254px;/s);
    expect(css).toMatch(/\.vd-slider::before \{[^]*?left: 6px;\s*\n\s*right: 6px;[^]*?border-radius: 12px;/s);
    expect(css).toMatch(/\.vd-fill \{[^]*?height: clamp\(0px, calc\(250px \* \(var\(--v, 60\) \/ 100\) - 6px\), 244px\);/s);
    expect(css).toMatch(/\.vd-fill \{[^]*?border-radius: 2px 2px 12px 12px;/s);
    expect(css).toMatch(/\.vd-thumb \{[^]*?width: 52px;[^]*?height: 4px;/s);
    expect(css).toMatch(/\.vd-thumb \{[^]*?bottom: calc\(2px \+ 250px \* \(var\(--v, 60\) \/ 100\)\);/s);
  });

  test('铃声抽屉 42dp + rows_padding 7dp + 展开高亮；省略号 40dp/圆角 20dp/primary tint', () => {
    expect(css).toMatch(/\.vd-ringer-drawer \{[^]*?gap: 7px;/s);
    expect(css).toMatch(/\.vd-ringer-btn \{[^]*?width: 42px;[^]*?height: 42px;/s);
    expect(css).toContain('.vd-ringer-btn.active { background: var(--md-surface-container-high); }');
    expect(css).toMatch(/\.vd-settings \{[^]*?width: 40px;[^]*?height: 40px;[^]*?border-radius: 20px;[^]*?color: var\(--md-primary\);/s);
  });
});

describe('v7.88 · volume-dialog.js 行为（VisibilityInteractor + 滑条管线 1:1）', () => {
  const vd = src('ios-desktop/js/volume-dialog.js');

  test('3s 无操作自动收起（MAX_DIALOG_SHOW_TIME = 3.seconds）+ 交互续期', () => {
    expect(vd).toContain('const MAX_DIALOG_SHOW_TIME = 3000;');
    expect(vd).toMatch(/setTimeout\(\(\) => dismiss\('timeout'\), MAX_DIALOG_SHOW_TIME\)/);
    expect(vd).toContain("dialogEl.addEventListener('pointerdown', scheduleHide)");
  });

  test('音量键触发：AudioVolumeUp/Down ±（15 级步进 100/15）+ AudioVolumeMute 切换', () => {
    expect(vd).toContain("e.key === 'AudioVolumeUp' || e.key === 'VolumeUp'");
    expect(vd).toContain("e.key === 'AudioVolumeDown' || e.key === 'VolumeDown'");
    expect(vd).toContain("e.key === 'AudioVolumeMute' || e.key === 'VolumeMute'");
    expect(vd).toContain('const KEY_STEP = 100 / 15;');
  });

  test('收起语义：Escape（BACK）+ 触外界（TOUCH_OUTSIDE）', () => {
    expect(vd).toMatch(/e\.key === 'Escape' && isVisible\(\)/);
    expect(vd).toMatch(/document\.addEventListener\('pointerdown', \(e\) => \{\s*\n\s*if \(isVisible\(\) && !e\.target\.closest\('\.volume-dialog'\)\) dismiss\(\);/);
  });

  test('音量单一真源：mediaService.setVolume 同步 + --v/aria 驱动', () => {
    expect(vd).toContain('mediaService.setVolume(currentVolume / 100);');
    expect(vd).toMatch(/sliderEl\.style\.setProperty\('--v', String\(currentVolume\)\)/);
    expect(vd).toMatch(/sliderEl\.setAttribute\('aria-valuenow', String\(currentVolume\)\)/);
  });

  test('铃声抽屉：收起单钮 → 点击展开三钮 → 选定收起（RingerDrawer 语义）+ 三模式图标映射', () => {
    expect(vd).toMatch(/mode === ringerMode && !ringerExpanded/);
    expect(vd).toMatch(/ringerExpanded = true;/);
    expect(vd).toMatch(/if \(mode === 'vibrate'\) return ICONS\.ringer_vibrate;/);
    expect(vd).toMatch(/if \(mode === 'silent'\) return ICONS\.ring_volume_off;/);
    expect(vd).toMatch(/return ICONS\.ring_volume;/);
  });

  test('省略号：收起对话框 + 打开 Settings 应用（真机展开完整音量面板的网页承接）', () => {
    expect(vd).toMatch(/initialApps\.findIndex\(\(a\) => a\.id === 'settings'\)/);
    expect(vd).toMatch(/dismiss\(\);\s*\n\s*const idx = initialApps\.findIndex/);
  });
});

describe('v7.88 · 图标与接线', () => {
  const icons = src('ios-desktop/js/icons.js');

  test('AOSP 原始 pathData：铃声三态 + horizontal_ellipsis', () => {
    expect(icons).toMatch(/ring_volume: `<svg viewBox="0 0 24 24"/);
    expect(icons).toMatch(/ring_volume_off: `<svg viewBox="0 0 24 24"/);
    expect(icons).toContain('M0.8,4.2l8.1,8.1c-2.2,0.5 -5.2,1.6 -7.8,4.4');
    expect(icons).toContain('M1,9h2v6H1V9zM4,17h2V7H4V17zM21,9v6h2V9H21zM18,17h2V7h-2V17z');
    expect(icons).toMatch(/ellipsis: `<svg viewBox="0 0 24 24"/);
    expect(icons).toContain('M6 10c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2z');
  });

  test('main.js：import + 启动序列接线（紧随 initQuickSettings）', () => {
    const main = src('ios-desktop/js/main.js');
    expect(main).toContain("import { initVolumeDialog } from './volume-dialog.js';");
    expect(main).toMatch(/initQuickSettings\(\);\s*\n\s*initVolumeDialog\(\);/);
  });

  test('sw.js 升 geek-v98', () => {
    expect(src('sw.js')).toContain("const VERSION = 'geek-v98';");
  });
});
