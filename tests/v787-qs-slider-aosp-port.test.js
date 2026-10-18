// ==================== v787-qs-slider-aosp-port.test.js — v7.87 QS 滑条 AOSP 源码 1:1 重植 ====================
//
// 用户实锤：旧实现（v7.79 M3E 分段竖柄）是「新旧样式融合」——横轨道 + 竖柄 + 右端图标，
// 真身不是这个样子。本版从 AOSP main 源码逐文件重植：
//   亮度 = PlatformSlider（packages/SystemUI/compose/core/src/com/android/compose/PlatformSlider.kt
//          + src/com/android/systemui/brightness/ui/compose/BrightnessSlider.kt；
//          qs/ui/composable/QuickSettingsShadeOverlay.kt: BrightnessSliderHeight = 64dp）：
//          64dp 胶囊轨（secondaryContainer）/ 填充 primary 自 64dp 图标区延伸至值位（恒覆盖图标区）/
//          图标 24dp CircleShape 左置 onPrimary / label titleMedium 贴沿
//          （isLabelOnTopOfIndicator 覆盖时驻图标右，否则骑沿 +16dp）/ 拖拽角 32→8dp
//          （DefaultPlatformSliderDraggingCornerRadius）+ 图标位 formatter "$it%" /
//          右端 padding 8dp 4dp 圆点 / sliderBackground 8dp 外扩 halo（shade_scrim_background_dark）
//   音量 = Material3 Slider 竖置（res/layout/volume_dialog_slider.xml）：
//          52×254dp（volume_dialog_slider_width/height）/ trackHeight 40dp / trackCornerSize 12dp /
//          trackInsideCornerSize 2dp / trackStopIndicatorSize 6dp / thumbHeight 52dp × thumbWidth 4dp
//          （竖置转横柄，行程 [2,252]）/ trackIconActiveEnd 流图标
//          （VolumeDialogSliderIconProvider STREAM_MUSIC：ic_volume_media / ic_volume_media_mute）
//   旧方案清除：qs-slider-bar/handle/endcap 三件套、at-zero、on-fill、brightnessIconFor 等级切换。
//   手势守卫（pull-down-gesture.js）三处 .qs-slider-bar → .qs-brightness/.qs-volume。
//   双模式：classic 单面板与 dual 分家共享同一批活节点（dual-shade.js moveInto），样式单源生效。
//
// 覆盖：DOM/CSS/JS 三面 + 图标 pathData + 手势守卫 + 版本。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

describe('v7.87 · 亮度 = PlatformSlider 1:1', () => {
  const html = src('ios-desktop/index.html');
  const css = src('ios-desktop/css/pull-panels.css');
  const js = src('ios-desktop/js/quick-settings.js');

  test('几何：64dp 高胶囊（BrightnessSliderHeight）+ 8dp 外扩 halo（shade_scrim_background_dark）', () => {
    expect(css).toContain('.qs-brightness {');
    expect(css).toMatch(/\.qs-brightness \{[^]*?height: 64px;\s*\n\s*border-radius: 32px;\s*\n\s*background: var\(--md-secondary-container\);/);
    expect(css).toMatch(/\.qs-brightness::before \{[^]*?inset: -8px;\s*\n\s*border-radius: 40px;/s);
  });

  test('填充：indicatorRight = iconSize + (W - iconSize) · value（TrackMeasurePolicy 同构）', () => {
    expect(css).toContain('width: calc(64px + (100% - 64px) * (var(--v, 80) / 100));');
    expect(css).toMatch(/\.qs-brightness-fill \{[^]*?background: var\(--md-primary\);/);
  });

  test('拖拽角 morph：静止 32dp → 拖拽 8dp（DefaultPlatformSliderDraggingCornerRadius），clipPath 防越轨', () => {
    expect(css).toMatch(/\.qs-brightness-fill \{[^]*?border-radius: 32px;[^]*?transition: border-radius 0\.15s ease;/s);
    expect(css).toContain('border-radius: 32px 8px 8px 32px;  /* DefaultPlatformSliderDraggingCornerRadius = 8dp */');
    expect(css).toMatch(/\.qs-brightness-clip \{[^]*?overflow: hidden;/s);
  });

  test('图标位：64dp CircleShape 盒 + 24dp svg（onPrimary）；拖拽中显示 formatter "$it%"', () => {
    expect(css).toMatch(/\.qs-brightness-icon \{[^]*?width: 64px;[^]*?height: 64px;[^]*?border-radius: 50%;/s);
    expect(css).toContain('.qs-brightness-icon svg { width: 24px; height: 24px; }');
    expect(js).toContain("icon.innerHTML = `<span class=\"qs-bs-value\">${value}%</span>`;");
    expect(js).toContain('restoreIcon(); // 图标位还原：拖拽百分比 → ic_brightness_full');
  });

  test('label 骑沿：覆盖时驻 64px（onPrimary）/ 否则填充沿 + 16dp（onSecondaryContainer）', () => {
    expect(js).toMatch(/const covered = fillW - 64 > label\.offsetWidth;/);
    expect(js).toMatch(/label\.style\.left = `\$\{Math\.round\(covered \? 64 : fillW \+ 16\)\}px`;/);
    expect(css).toMatch(/\.qs-brightness-label\.on-track \{ color: var\(--md-on-secondary-container\); \}/);
  });

  test('右端指示圆点：padding 8dp + size 4dp（enabled 恒显）', () => {
    expect(css).toMatch(/\.qs-brightness-dot \{[^]*?right: 8px;\s*\n\s*top: 50%;[^]*?width: 4px;\s*\n\s*height: 4px;/s);
  });

  test('静态图标：VM.icon = ic_brightness_full 无等级切换（brightnessIconFor 退役）', () => {
    expect(js).toContain('restoreIcon = () => { if (icon) icon.innerHTML = ICONS.brightness; }');
    expect(js).not.toContain('brightnessIconFor');
    expect(js).not.toContain('ICONS.brightness_low');
    expect(js).not.toContain('ICONS.brightness_medium');
  });

  test('最小值 15 沿用项目亮度模型（0.35 + 0.65·v body.filter）', () => {
    expect(js).toMatch(/value = Math\.max\(15, Math\.min\(100,/);
    expect(js).toContain('const val = 0.35 + (value / 100) * 0.65;');
  });
});

describe('v7.87 · 音量 = M3E 竖置滑条 1:1（volume_dialog_slider.xml）', () => {
  const html = src('ios-desktop/index.html');
  const css = src('ios-desktop/css/pull-panels.css');
  const js = src('ios-desktop/js/quick-settings.js');

  test('容器 52×254dp；轨 40dp 居中（trackHeight）/ trackCornerSize 12dp', () => {
    expect(css).toMatch(/\.qs-volume \{[^]*?width: 52px;[^]*?height: 254px;/s);
    expect(css).toMatch(/\.qs-volume::before \{[^]*?left: 6px;\s*\n\s*right: 6px;[^]*?border-radius: 12px;/s);
  });

  test('激活轨：fill 高 = 250·t - 6（stopIndicatorSize 6dp gap）；顶角 2dp（trackInsideCornerSize）底角 12dp', () => {
    expect(css).toContain('height: clamp(0px, calc(250px * (var(--v, 60) / 100) - 6px), 244px);');
    expect(css).toContain('border-radius: 2px 2px 12px 12px;      /* 顶角 trackInsideCornerSize 2dp / 底角 12dp */');
  });

  test('横柄 52×4dp（thumbHeight/thumbWidth 竖置转横向），行程 [2, 252]', () => {
    expect(css).toMatch(/\.qs-volume-handle \{[^]*?width: 52px;[^]*?height: 4px;[^]*?border-radius: 2px;/s);
    expect(css).toContain('bottom: calc(2px + 250px * (var(--v, 60) / 100));');
  });

  test('流图标 trackIconActiveEnd：坐激活轨道末端（clamp 钳制），onPrimary/中性双态', () => {
    expect(css).toContain('bottom: clamp(10px, calc(250px * (var(--v, 60) / 100) - 54px), 196px);');
    expect(css).toContain('.qs-volume.covered .qs-volume-icon { color: var(--md-on-primary); }');
  });

  test('AOSP 原始 pathData：ic_volume_media（音符）/ ic_volume_media_mute（斜杠音符）', () => {
    const icons = src('ios-desktop/js/icons.js');
    expect(icons).toContain('M12 3l0.01 10.55c-0.59-0.34-1.27-0.55-2-0.55C7.79 13 6 14.79 6 17s1.79 4 4.01 4S14 19.21 14 17V7h4V3h-6z');
    expect(icons).toContain('M21.19 21.19L14 14l-2-2-9.2-9.2-1.41 1.42 8.79 8.79c-0.06 0-0.12-0.01-0.18-0.01-2.21 0-4 1.79-4 4s1.79 4 4.01 4S14 19.21 14 17v-0.17l5.78 5.78 1.41-1.42zM14 11.17V7h4V3h-6v6.17z');
    expect(js).toContain('ICONS.volume_media_mute || ICONS.volume_mute');
    expect(js).toContain('ICONS.volume_media || ICONS.volume');
  });

  test('竖向取值：行程边距 thumbWidth/2，自底向上', () => {
    expect(js).toMatch(/value = Math\.max\(0, Math\.min\(100, Math\.round\(\(\(rect\.bottom - clientY - 2\) \/ Math\.max\(rect\.height - 4, 1\)\) \* 100\)\)\);/);
    expect(html).toContain('aria-orientation="vertical"');
  });

  test('静音钮 = 图标本体（legacy VolumeDialogImpl row.icon 点击语义），点击切换静音/恢复', () => {
    expect(html).toContain('<button class="qs-volume-mute" id="qsVolumeMuteBtn" title="静音" aria-label="静音切换"></button>');
    expect(js).toMatch(/muteBtn\.addEventListener\('click'[\s\S]*?const next = currentVolume === 0 \? volumeBeforeMute : 0;/);
  });
});

describe('v7.87 · 旧融合方案清除 + 全局一致性', () => {
  const html = src('ios-desktop/index.html');
  const css = src('ios-desktop/css/pull-panels.css');
  const gesture = src('ios-desktop/js/pull-down-gesture.js');

  test('qs-slider-bar/handle/endcap 三件套全库清除（index/css/js 三面）', () => {
    expect(html).not.toContain('qs-slider-bar');
    expect(html).not.toContain('qs-slider-handle');
    expect(html).not.toContain('qs-slider-endcap');
    expect(css).not.toContain('.qs-slider-bar');
    expect(css).not.toContain('.qs-slider-handle');
    expect(css).not.toContain('.qs-slider-endcap');
    expect(gesture).not.toContain('.qs-slider-bar');
  });

  test('at-zero / on-fill / makeSlider 退役', () => {
    expect(css).not.toContain('at-zero');
    expect(css).not.toContain('on-fill');
    expect(src('ios-desktop/js/quick-settings.js')).not.toContain('function makeSlider');
  });

  test('手势守卫三处换新类（滑条拖拽不被面板手势劫持）', () => {
    expect(gesture).toContain("'.noti-card, .qs-tile, .qs-brightness, .qs-volume, .noti-media-card, .noti-footer-btn, .qs-action-btn, button, input, .edit-tiles-view, .qs-media-card'");
    expect(gesture).toMatch(/e\.target\.closest\('\.qs-brightness'\) \|\| e\.target\.closest\('\.qs-volume'\)/);
    expect(gesture).toMatch(/!e\.target\.closest\('\.qs-brightness'\) && !e\.target\.closest\('\.qs-volume'\)/);
  });

  test('双模式共享活节点：滑条 DOM 在 qsPanelScroll 内（dual 迁移链唯一来源）', () => {
    expect(html).toMatch(/id="qsInnerScroll">[\s\S]*?qs-sliders-row[\s\S]*?qs-tiles-grid/);
    expect(src('ios-desktop/js/dual-shade.js')).toContain("moveInto(document.getElementById('qsPanelScroll'), qp);");
  });

  test('sw.js 升 geek-v97', () => {
    expect(src('sw.js')).toContain("const VERSION = 'geek-v97';");
  });
});
