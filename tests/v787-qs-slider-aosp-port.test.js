// ==================== v787-qs-slider-aosp-port.test.js — QS 滑条 AOSP 源码 1:1 重植 ====================
//
// v7.87 初版按 PlatformSlider 重植；v7.90 亮度段回归 r1 基准：
//   亮度 = BrightnessSlider.kt 竖条 thumb 版（brightness/ui/compose/BrightnessSlider.kt）：
//          r1 中 QS 亮度渲染唯一入口 = BrightnessSliderContainer（grep 实锤），
//          PlatformSlider 无 QS 亮度消费方——采它属跟随 AOSP main 的超前路线，不跟。
//          BrightnessSliderDimensions.Default：icon 28dp / thumb 52h×4w（SliderDefaults.Thumb
//          thumbSize 竖条柄）/ track 40dp / verticalPadding 6dp / bg corner 24dp /
//          backgroundFrame 10w×6h；InternalDimensions：SliderTrackRoundedCorner=12dp、
//          IconPadding=6dp、ThumbTrackGapSize=6dp、trackInsideCornerSize=2dp。
//          M3 颜色：active=primary、thumb=primary、inactive=surfaceContainerHighest、
//          activeTick=onPrimary、inactiveTick=onSurfaceVariant；三档图标
//          getIconForPercentage（≤20 low / ≥80 full / 其余 mid）画在轨内：
//          inactive 贴右端 inactiveTick 色、被 thumb 覆盖时随 thumb 左侧 activeTick 色，
//          交叉淡入淡出 appear tween(100ms, delay 33ms) / disappear tween(50ms)。
//          v7.90 回归同时响应上轮教训：竖条 thumb 曾落在被退役的 aosp17-shade 子应用内，
//          子应用删除后未移植进主应用——本次直接落地 ios-desktop 本体。
//   音量 = Material3 Slider 竖置（res/layout/volume_dialog_slider.xml；v7.88 起迁入音量键
//          对话框，见 v788-qs-volume-dialog.test.js——QuickSettingsShadeOverlay.kt 无音量滑块）：
//          52×254dp（volume_dialog_slider_width/height）/ trackHeight 40dp / trackCornerSize 12dp /
//          trackInsideCornerSize 2dp / trackStopIndicatorSize 6dp / thumbHeight 52dp × thumbWidth 4dp
//          （竖置转横柄，行程 [2,252]）/ trackIconActiveEnd 流图标
//          （VolumeDialogSliderIconProvider STREAM_MUSIC：ic_volume_media / ic_volume_media_mute）
//   旧方案清除：qs-slider-bar/handle/endcap 三件套、at-zero、on-fill、brightnessIconFor 等级切换、
//          v7.87 PlatformSlider 填充/clip/label/dot/百分比 formatter 全套（v7.90）。
//   手势守卫（pull-down-gesture.js）：.qs-slider-bar → .qs-brightness（v7.88 移除 .qs-volume）。
//   双模式：classic 单面板与 dual 分家共享同一批活节点（dual-shade.js moveInto），样式单源生效。
//
// 覆盖：DOM/CSS/JS 三面 + 图标 pathData + 手势守卫 + 版本。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

describe('v7.90 · 亮度 = BrightnessSlider.kt 竖条 thumb 1:1（回归 r1 基准）', () => {
  const html = src('ios-desktop/index.html');
  const css = src('ios-desktop/css/pull-panels.css');
  const js = src('ios-desktop/js/quick-settings.js');

  test('几何：track 40dp 角 12dp + overflow hidden 单源圆角（v8.17）+ frame 24dp 角（6/10 padding，shade_panel_fallback 语义）+ halo 退役（源码两层）\n       + v8.20 #45：trackW = 布局区宽 − thumbW（margin 0 2px = trackOffsetX）+ track 本底透明（drawTrack 无全宽 inactive 底，v=0/100 露 frame 色）', () => {
    expect(css).toContain('.qs-brightness {');
    expect(css).toMatch(/\.qs-bs-track \{[^]*?height: 40px;[^]*?margin: 0 2px;[^]*?border-radius: 12px;[^]*?overflow: hidden;/);
    expect(css).toMatch(/\.qs-bs-frame \{[^]*?border-radius: 24px;[^]*?padding: 6px 10px;[^]*?background: var\(--md-shade-panel-fallback, var\(--md-surface-container\)\);/s);
    expect(css).not.toMatch(/\.qs-brightness::before/);
  });

  test('竖条 thumb：52h×4w（SliderDefaults.Thumb thumbSize），top −6px 出头 + v8.20 左缘 travels [0, trackW]（calc((100% − 4px)·--vf)，旧「中心 −2px」式退役）', () => {
    expect(css).toMatch(/\.qs-bs-thumb \{[^]*?width: 4px;[^]*?height: 52px;[^]*?top: -6px;[^]*?border-radius: 2px;[^]*?background: var\(--md-primary\);/s);
    expect(css).toContain('left: calc((100% - 4px) * var(--vf, 0.8));');
    expect(css).not.toContain('left: calc(var(--v, 80) * 1% - 2px);');
  });

  test('分段轨道（v8.20 重锚）：active [0, trackW·v−endGap]（endGap = thumbW/2+6 动态：常态 8/按压 7）/ inactive [trackW·v+endGap, trackW]\n       + 双 gap 体系（图标锚恒 6 / 轨道端动态）+ 段消失阈值（active>12 / frac·trackW<trackW−endGap−12）+ 内角 2dp', () => {
    expect(js).toContain('const GAP_ICON = 6;');
    expect(js).toMatch(/const endGap = thumbW \/ 2 \+ GAP_ICON;/);
    expect(js).toMatch(/activeW = Math\.max\(0, w \* frac - endGap\);/);
    expect(js).toMatch(/activeW > TRACK_CORNER \? activeW : 0/);
    expect(js).toMatch(/showInactive = w \* frac < w - endGap - TRACK_CORNER;/);
    expect(js).toMatch(/inactiveTrack\.style\.left = `\$\{Math\.min\(w, w \* frac \+ endGap\)\}px`;/);
    expect(js).toContain('`0 ${INSIDE_CORNER}px ${INSIDE_CORNER}px 0`');
    expect(js).toContain('`${INSIDE_CORNER}px 0 0 ${INSIDE_CORNER}px`');
    expect(css).toMatch(/\.qs-bs-track-active \{[^]*?background: var\(--md-primary\);/s);
  });

  test('轨内图标 28dp：三档 getIconForPercentage（≤20 low / ≥80 full）+ 双份交叉淡入淡出', () => {
    expect(css).toMatch(/\.qs-bs-icon \{[^]*?width: 28px;\s*\n\s*height: 28px;/s);
    expect(js).toContain("const ICON_KEYS = { low: 'brightness_low', mid: 'brightness_medium', full: 'brightness' };");
    expect(js).toMatch(/value <= 20 \? 'low' : value >= 80 \? 'full' : 'mid'/);
    expect(js).toContain('const APPEAR_MS = 100, APPEAR_DELAY_MS = 33, DISAPPEAR_MS = 50;');
    expect(js).toMatch(/\{ duration: APPEAR_MS, delay: APPEAR_DELAY_MS, fill: 'forwards' \}/);
  });

  test('双色锚点：inactive 贴右端（inactiveTick）/ 覆盖时随 thumb 左侧（activeTick）', () => {
    expect(js).toMatch(/showActive = false;               \/\/ 锚在轨道右端（inactiveTrackEnd）/);
    expect(js).toMatch(/x = w - ICON_PADDING - ICON_SIZE;/);
    expect(js).toMatch(/showActive = true;                \/\/ 锚在 thumb 左侧（activeTrackEnd）/);
    expect(js).toMatch(/const cx = showActive \? activeEnd : w;/);
    expect(css).toContain('#qsBsIconActive { opacity: 1; color: var(--md-on-primary); }');
    expect(css).toContain('#qsBsIconInactive { opacity: 0; color: var(--md-on-surface-variant); }');
  });

  test('拖拽管线：track 基准取值 + ResizeObserver 重绘（面板开合改轨宽）', () => {
    expect(js).toMatch(/rectCache = track\.getBoundingClientRect\(\);/);
    expect(js).toMatch(/new ResizeObserver\(\(\) => render\(\)\)\.observe\(track\);/);
    expect(js).toContain(".replace('width=\"22\" height=\"22\"', 'width=\"28\" height=\"28\"')");
  });

  test('v7.87 PlatformSlider 方案清除：填充/clip/label/dot/百分比 formatter 全套退役', () => {
    expect(html).not.toContain('qs-brightness-fill');
    expect(html).not.toContain('qs-brightness-clip');
    expect(html).not.toContain('qs-brightness-label');
    expect(html).not.toContain('qs-brightness-dot');
    expect(html).not.toContain('qsBrightnessFill');
    expect(css).not.toContain('.qs-brightness-fill');
    expect(css).not.toContain('.qs-brightness-clip');
    expect(css).not.toContain('.qs-brightness-label');
    expect(css).not.toContain('.qs-brightness-dot');
    expect(css).not.toContain('.qs-brightness-icon');
    expect(js).not.toContain('qs-bs-value');
    expect(js).not.toContain('syncLabel');
    expect(js).not.toContain('restoreIcon');
  });

  test('最小值 15 沿用项目亮度模型（0.35 + 0.65·v body.filter）', () => {
    expect(js).toMatch(/value = Math\.max\(15, Math\.min\(100,/);
    expect(js).toContain('const val = 0.35 + (value / 100) * 0.65;');
  });
});

describe('v7.87→v7.88 · 音量 = M3E 竖置滑条 1:1（volume_dialog_slider.xml，迁入音量键对话框）', () => {
  const html = src('ios-desktop/index.html');
  const css = src('ios-desktop/css/pull-panels.css');
  const vd = src('ios-desktop/js/volume-dialog.js');

  test('容器 52×254dp；轨 40dp 居中（trackHeight）/ trackCornerSize 12dp', () => {
    expect(css).toMatch(/\.vd-slider \{[^]*?width: 52px;[^]*?height: 254px;/s);
    expect(css).toMatch(/\.vd-slider::before \{[^]*?left: 6px;\s*\n\s*right: 6px;[^]*?border-radius: 12px;/s);
  });

  test('激活轨：fill 高 = 250·t - 6（stopIndicatorSize 6dp gap）；顶角 2dp（trackInsideCornerSize）底角 12dp', () => {
    expect(css).toContain('height: clamp(0px, calc(250px * (var(--v, 60) / 100) - 6px), 244px);');
    expect(css).toContain('border-radius: 2px 2px 12px 12px;      /* 顶角 trackInsideCornerSize 2dp / 底角 12dp */');
  });

  test('横柄 52×4dp（thumbHeight/thumbWidth 竖置转横向），行程 [2, 252]', () => {
    expect(css).toMatch(/\.vd-thumb \{[^]*?width: 52px;[^]*?height: 4px;[^]*?border-radius: 2px;/s);
    expect(css).toContain('bottom: calc(2px + 250px * (var(--v, 60) / 100));');
  });

  test('流图标 trackIconActiveEnd：坐激活轨道末端（clamp 钳制），onPrimary/中性双态', () => {
    expect(css).toContain('bottom: clamp(10px, calc(250px * (var(--v, 60) / 100) - 54px), 196px);');
    expect(css).toContain('.vd-slider.covered .vd-icon { color: var(--md-on-primary); }');
  });

  test('AOSP 原始 pathData：ic_volume_media（音符）/ ic_volume_media_mute（斜杠音符）', () => {
    const icons = src('ios-desktop/js/icons.js');
    expect(icons).toContain('M12 3l0.01 10.55c-0.59-0.34-1.27-0.55-2-0.55C7.79 13 6 14.79 6 17s1.79 4 4.01 4S14 19.21 14 17V7h4V3h-6z');
    expect(icons).toContain('M21.19 21.19L14 14l-2-2-9.2-9.2-1.41 1.42 8.79 8.79c-0.06 0-0.12-0.01-0.18-0.01-2.21 0-4 1.79-4 4s1.79 4 4.01 4S14 19.21 14 17v-0.17l5.78 5.78 1.41-1.42zM14 11.17V7h4V3h-6v6.17z');
    expect(vd).toContain('ICONS.volume_media_mute || ICONS.volume_mute');
    expect(vd).toContain('ICONS.volume_media || ICONS.volume');
  });

  test('竖向取值：行程边距 thumbWidth/2，自底向上（volume-dialog.js 拖拽管线）', () => {
    expect(vd).toMatch(/const value = \(\(rect\.bottom - clientY - 2\) \/ Math\.max\(rect\.height - 4, 1\)\) \* 100;/);
    expect(html).toContain('aria-orientation="vertical"');
  });

  test('v7.88：静音由音量键承接（AudioVolumeMute 切换/恢复），图标本体不可点（M3E trackIconActiveEnd 非交互）', () => {
    expect(html).not.toContain('qsVolumeMuteBtn');
    expect(vd).toContain("e.key === 'AudioVolumeMute'");
    expect(vd).toMatch(/applyVolume\(currentVolume === 0 \? volumeBeforeMute : 0\);/);
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

  test('手势守卫三处仅亮度（v7.88：音量滑条已迁出 Shade，不再入守卫名单）', () => {
    expect(gesture).toContain("'.noti-card, .qs-tile, .qs-brightness, .noti-media-card, .noti-footer-btn, .qs-action-btn, button, input, .edit-tiles-view, .qs-media-card'");
    expect(gesture).toMatch(/e\.target\.closest\('\.qs-brightness'\) \|\| e\.target\.closest\('input'\)/);
    expect(gesture).toMatch(/!e\.target\.closest\('\.qs-brightness'\) && !e\.target\.closest\('input'\)/);
    expect(gesture).not.toContain('qs-volume');
  });

  test('双模式共享活节点：滑条 DOM 在 qsPanelScroll 内（dual 迁移链唯一来源）', () => {
    expect(html).toMatch(/id="qsInnerScroll">[\s\S]*?qs-sliders-row[\s\S]*?qs-tiles-grid/);
    expect(src('ios-desktop/js/dual-shade.js')).toContain("moveInto(document.getElementById('qsPanelScroll'), qp);");
  });

  test('sw.js 升 geek-v100', () => {
    expect(src('sw.js')).toContain("const VERSION = 'geek-v100';");
  });
});
