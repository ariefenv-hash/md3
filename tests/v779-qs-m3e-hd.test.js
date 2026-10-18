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

describe('v7.79 · M3E 分段滑条（竖柄）', () => {
  const html = src('ios-desktop/index.html');
  const css = src('ios-desktop/css/pull-panels.css');
  const js = src('ios-desktop/js/quick-settings.js');

  test('DOM 结构：fill + handle + 端钮三件套（旧 icon/info/label/pct 结构删除）', () => {
    expect(html).toContain('class="qs-slider-fill" id="qsBrightnessFill"');
    expect(html).toContain('class="qs-slider-handle" id="qsBrightnessHandle"');
    expect(html).toContain('class="qs-slider-handle" id="qsVolumeHandle"');
    expect(html).toContain('id="qsBrightnessIcon"');
    expect(html).toContain('id="qsVolumeMuteBtn"');
    expect(html).not.toContain('qs-slider-info');
    expect(html).not.toContain('qs-slider-label');
    expect(html).not.toContain('qsBrightnessPct');
    expect(html).not.toContain('qsVolumePct');
    expect(html).not.toContain('qsVolumeIcon');
  });

  test('CSS 几何（v7.82 源码重做）：--v 驱动，fill = v% - 6px gap（ThumbTrackGapSize），柄 4×52dp 恒定不加粗', () => {
    expect(css).toContain('width: max(calc(var(--v, 75) * 1% - 6px), 0px);');
    expect(css).toContain('.qs-slider-handle {');
    expect(css).toContain('left: calc(var(--v, 75) * 1%);');
    expect(css).toContain('width: 4px;');
    expect(css).toContain('height: 52px;');
    expect(css).toContain('border-radius: 2px;');
    // 柄色 = 动态主色（v7.80：音量柄同主色，0% 走 at-zero 降饱和）
    expect(css).toMatch(/\.qs-slider-handle \{[^]*?background: var\(--md-primary/);
    expect(css).toContain('.qs-slider-bar.at-zero .qs-slider-handle {');
    // 分段 gap 实感：填充胶囊与柄分离（fill 宽含 -6px），残端由轨道底色天然承担
    expect(css).toContain('background: var(--md-surface-container-highest, rgba(255, 255, 255, 0.18));');
  });

  test('JS 驱动：makeSlider 只写 --v + aria-valuenow，拖拽 rAF 合帧；初始 --v 从状态恢复', () => {
    expect(js).toContain("bar.style.setProperty('--v', String(value));");
    expect(js).toContain("bar.setAttribute('aria-valuenow', String(value));");
    expect(js).not.toContain('fill.style.width');
    expect(js).toContain("if (bBar) bBar.style.setProperty('--v', String(currentBrightness));");
    expect(js).toContain("vBar.classList.toggle('at-zero', currentVolume === 0)");
  });

  test('静音钮：点击在静音/恢复间切换，≥88% 切 on-fill 反色', () => {
    expect(js).toContain("muteBtn.addEventListener('click'");
    expect(js).toContain("vIcon.classList.toggle('on-fill'");
    expect(css).toContain('.qs-slider-endcap.right.on-fill {');
  });

  test('v7.85 亮度图标右置：bs-level-icon 端钮 + 等级图标（low/mid/full，源码阈值 ≤20/≥80）', () => {
    expect(js).toContain('brightnessIconFor(currentBrightness)');
    expect(js).not.toContain('ICONS.settings_brightness || ICONS.brightness');
    expect(src('ios-desktop/js/icons.js')).toMatch(/brightness: `<svg viewBox="0 0 960 960"/);
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
  test('sw.js 升 geek-v95', () => {
    expect(src('sw.js')).toContain("const VERSION = 'geek-v95';");
  });
});
