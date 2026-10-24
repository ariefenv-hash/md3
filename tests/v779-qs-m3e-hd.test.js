// ==================== v779-qs-m3e-hd.test.js — v7.79 QS 彻底重做（1080P 逐帧实锤） ====================
//
// 参考升级：B 站 4 段录屏重下为 1080P（try_look=1 免登录高清通道），逐帧重测：
//   ① 滑条 = M3E 分段结构（填充胶囊 → gap → 竖柄 → gap → 未填充残端），
//      竖柄宽 ~6px、比轨道高（上下出头）、圆角小、颜色 = 动态主色；
//      亮度左端内嵌 settings_brightness 图标钮（v2@53s），音量右端内嵌静音钮（v4@9.4s）
//   ② 磁贴 = 统一 stadium 胶囊（激活/未激活形状一致只变色）；分体磁贴（蓝牙/模式）
//      图标底座圆 ↔ 方圆角（v7.82 源码 ActiveIconCornerRadius 16dp）+ 动态主色；zone2 子仓不存在 → 删除
//   ③ grow/squeeze 持久类删除（磁贴溢出截断 + 归位拥挤的根因）
//   ④ 页脚 = 构建号 + 页码点（激活点长条）+ 幽灵铅笔 + 主色电源钮
//   ⑤ QS 媒体卡（v2@53s 实锤：磁贴下方全宽大圆角卡）
//   ⑥ 矢量图：bluetooth_connected（激活带侧点）/ settings_brightness / volume_off 官方路径
//
// 覆盖：滑条结构/驱动方式、磁贴体系、页脚、媒体卡、图标、旧体系清除。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

describe('v7.79→v7.87 · QS 滑条（AOSP 源码 1:1 重植：PlatformSlider + M3E 竖置）', () => {
  const html = src('ios-desktop/index.html');
  const css = src('ios-desktop/css/pull-panels.css');
  const js = src('ios-desktop/js/quick-settings.js');

  test('DOM 结构：亮度 PlatformSlider 三层（clip/fill+icon+label+dot）；音量滑条已迁出 Shade（v7.88 音量键对话框接管）', () => {
    expect(html).toContain('class="qs-brightness" id="qsBrightnessBar"');
    expect(html).toContain('class="qs-brightness-clip"');
    expect(html).toContain('class="qs-brightness-fill" id="qsBrightnessFill"');
    expect(html).toContain('class="qs-brightness-icon" id="qsBrightnessIcon"');
    expect(html).toContain('class="qs-brightness-label" id="qsBrightnessLabel"');
    expect(html).toContain('class="qs-brightness-dot"');
    // v7.88：QS/Shade 面板无音量滑块（QuickSettingsShadeOverlay.kt 仅 BrightnessSliderContainer）
    expect(html).not.toContain('qsVolumeBar');
    expect(html).not.toContain('qs-volume');
    // 音量唯一场景 = 音量键对话框（volume_dialog.xml 1:1）
    expect(html).toContain('class="volume-dialog" id="volumeDialog"');
    expect(html).toContain('class="vd-slider" id="vdSlider"');
    expect(html).toContain('id="vdRingerDrawer"');
    expect(html).toContain('id="vdSettingsBtn"');
    // 旧竖柄融合方案清除（v7.79/v7.82 分段三件套）
    expect(html).not.toContain('qs-slider-bar');
    expect(html).not.toContain('qs-slider-handle');
    expect(html).not.toContain('qs-slider-endcap');
    expect(html).not.toContain('qsBrightnessHandle');
    expect(html).toContain('aria-orientation="vertical"');
  });

  test('亮度 CSS = PlatformSlider：64dp 胶囊 / secondaryContainer 轨 / 填充 64px 图标区起算 / 拖拽角 8dp / 4dp dot / 8dp halo', () => {
    expect(css).toContain('.qs-brightness {');
    expect(css).toContain('height: 64px;');
    expect(css).toContain('background: var(--md-secondary-container);');
    expect(css).toContain('width: calc(64px + (100% - 64px) * (var(--v, 80) / 100));');
    expect(css).toContain('border-radius: 32px 8px 8px 32px;');
    expect(css).toContain('.qs-brightness.is-dragging .qs-brightness-fill {');
    expect(css).toMatch(/\.qs-brightness-icon \{[^]*?border-radius: 50%;/);
    expect(css).toContain('.qs-brightness-icon svg { width: 24px; height: 24px; }');
    expect(css).toMatch(/\.qs-brightness-dot \{[^]*?right: 8px;[^]*?width: 4px;/s);
    expect(css).toMatch(/\.qs-brightness::before \{[^]*?inset: -8px;/s);
  });

  test('音量 CSS = M3E 竖置迁入对话框（volume_dialog_slider.xml）：52×254 / 轨 40dp 角 12dp / insideCorner 2dp / stop 6dp / 横柄 52×4dp', () => {
    expect(css).toContain('width: 52px;');
    expect(css).toContain('height: 254px;');
    expect(css).toMatch(/\.vd-slider::before \{[^]*?border-radius: 12px;/s);
    expect(css).toMatch(/\.vd-fill \{[^]*?height: clamp\(0px, calc\(250px \* \(var\(--v, 60\) \/ 100\) - 6px\), 244px\);/s);
    expect(css).toMatch(/\.vd-fill \{[^]*?border-radius: 2px 2px 12px 12px;/s);
    expect(css).toMatch(/\.vd-thumb \{[^]*?width: 52px;[^]*?height: 4px;/s);
    expect(css).toMatch(/\.vd-icon \{[^]*?bottom: clamp\(10px, calc\(250px \* \(var\(--v, 60\) \/ 100\) - 54px\), 196px\);/s);
    expect(css).toContain('.vd-slider.covered .vd-icon');
  });

  test('JS 驱动：只写 --v + aria-valuenow（CSS calc 承担几何），拖拽 rAF 合帧，初始 --v 从状态恢复', () => {
    expect(js).toContain("bar.style.setProperty('--v', String(value));");
    expect(js).toContain("bar.setAttribute('aria-valuenow', String(value));");
    expect(js).not.toContain('fill.style.width');
    expect(js).toContain("bar.style.setProperty('--v', String(currentBrightness));");
    // v7.88：音量状态移交 volume-dialog.js
    expect(js).not.toContain('currentVolume');
    expect(js).not.toContain("at-zero");
  });

  test('亮度拖拽：图标位切换 formatter "$it%"（BrightnessSlider.kt），释放还原 ic_brightness_full；静态图标无等级切换', () => {
    expect(js).toContain("icon.innerHTML = `<span class=\"qs-bs-value\">${value}%</span>`;");
    expect(js).toContain('restoreIcon(); // 图标位还原：拖拽百分比 → ic_brightness_full');
    expect(js).not.toContain('brightnessIconFor');
    expect(js).not.toContain('ICONS.brightness_low');
  });

  test('音量流图标 = AOSP 原始 pathData：ic_volume_media（音符）/ ic_volume_media_mute（斜杠音符），由 volume-dialog.js 驱动', () => {
    const vd = src('ios-desktop/js/volume-dialog.js');
    expect(vd).toContain('ICONS.volume_media_mute || ICONS.volume_mute');
    expect(vd).toContain('ICONS.volume_media || ICONS.volume');
    expect(src('ios-desktop/js/icons.js')).toMatch(/volume_media: `<svg viewBox="0 0 24 24"/);
    expect(src('ios-desktop/js/icons.js')).toMatch(/volume_media_mute: `<svg viewBox="0 0 24 24"/);
  });

  test('v7.88：静音语义由音量键承接（AudioVolumeMute 切换），QS 面板静音钮退役', () => {
    expect(js).not.toContain('muteBtn');
    expect(src('ios-desktop/js/volume-dialog.js')).toContain("e.key === 'AudioVolumeMute'");
  });
});

describe('v7.79 · 磁贴体系（stadium / 图标底座 / zone2 清除）', () => {
  const css = src('ios-desktop/css/pull-panels.css');
  const js = src('ios-desktop/js/quick-settings.js');

  test('磁贴统一 stadium：激活不再变形（旧 18px 圆角与 grow/squeeze 全清）', () => {
    expect(css).toContain('.qs-tile-pill:active {\n  transform: scale(0.985);\n}');
    expect(css).not.toContain('qs-grow');
    expect(css).not.toContain('qs-squeeze');
    expect(css).not.toContain('border-radius: 18px;');
  });

  test('分体磁贴图标底座：未激活中性圆底 → 激活方圆角 16dp（v7.82 源码常量）+ 动态主色反色', () => {
    expect(css).toContain('.qs-tile-pill[data-tile-id="bluetooth"] > .qs-tile-icon-wrap,\n.qs-tile-pill[data-tile-id="modes"] > .qs-tile-icon-wrap {\n  background: var(--md-surface-container-highest, rgba(255, 255, 255, 0.2));\n}');
    expect(css).toContain('border-radius: 16px;');
    expect(css).not.toContain('border-radius: 15px;');
  });

  test('zone2 清除：JS/CSS/测试三面无残留，蓝牙/模式点击直达面板', () => {
    expect(js).not.toContain('qs-tile-zone2');
    expect(css).not.toContain('.qs-tile-zone2');
    expect(js).toContain('openBluetoothSheet(pill);');
    expect(js).toContain('openModesSheet(pill);');
  });

  test('蓝牙激活图标切换：bluetooth_connected（v2 ROSE Ceramics 特写带侧点）', () => {
    expect(js).toContain("tile.id === 'bluetooth' && tileActive && ICONS.bluetooth_connected");
    expect(js).toContain("const iconKey = (tileActive && ICONS.bluetooth_connected) ? 'bluetooth_connected' : tile.iconKey;");
    expect(src('ios-desktop/js/icons.js')).toMatch(/bluetooth_connected: `<svg viewBox="0 -960 960 960"/);
  });

  test('蓝牙面板带总开关（开关功能自磁贴迁入面板）', () => {
    expect(js).toMatch(/function openBluetoothSheet\(sourceEl\) \{[^]*?trailing: 'switch'/);
  });

  test('编辑视图统一双列宽磁贴清单（v2/v3 编辑器实锤）', () => {
    expect(css).toContain('.edit-tiles-view .qs-tiles-grid {\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n}');
    expect(js).toContain("el.className = `qs-tile-pill active size-wide ${isSmall ? 'is-small-in-editor' : ''}`;");
  });
});

describe('v7.79 · 页脚与媒体卡', () => {
  const html = src('ios-desktop/index.html');
  const css = src('ios-desktop/css/pull-panels.css');
  const js = src('ios-desktop/js/quick-settings.js');

  test('页脚：构建号 + 页码点（激活长条）+ 幽灵铅笔 + 主色电源钮', () => {
    expect(html).toContain('16 (BP31.250502.008)');
    // v7.84 统一 Shade 1:1：infinite grid 无分页点（源码无 qs-page-dots），页脚 = 构建号 + 三按钮
    expect(html).not.toContain('qs-page-dots');
    expect(html).toContain('qs-build-version');
    expect(html).toContain('class="qs-action-btn ghost" id="qsEditBtn"');
    expect(html).toContain('class="qs-action-btn power" id="qsPowerBtn"');
    expect(css).toContain('.qs-action-btn.power {\n  background: var(--md-primary, #a8c7fa);');
  });

  test('QS 媒体卡 DOM 存在且默认折叠（media-hidden）', () => {
    expect(html).toContain('class="qs-media-card media-hidden" id="qsMediaCard"');
    expect(html).toContain('id="qsMediaPlayBtn"');
    expect(html).toContain('id="qsMediaProgressTrack"');
    expect(css).toContain('.qs-media-card.media-hidden {');
  });

  test('媒体卡逻辑：mediaService 订阅 + 播放钮 + 进度条 seek + 点击开音乐应用', () => {
    expect(js).toContain('function initQsMediaCard()');
    expect(js).toContain('mediaService.subscribe((state) => {');
    expect(js).toContain('mediaService.togglePlay();');
    expect(js).toContain('mediaService.seek(');
    expect(js).toContain("initialApps.findIndex(a => a.id === 'music')");
  });
});

describe('v7.79 · 版本与构建', () => {
  test('sw.js 升 geek-v99', () => {
    expect(src('sw.js')).toContain("const VERSION = 'geek-v99';");
  });
});
