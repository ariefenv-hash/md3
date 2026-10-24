// ==================== v784-unified-shade.test.js — v7.84 统一 Shade 1:1 复刻 ====================
//
// 用户指令：1:1 忠实 AOSP 17 源码（android17-release 94b4c163），弃双面板旧方案——
// 「控制中心与通知中心早就合二为一了」。
//
// 权威源码（本会话 sparse clone 实锤）：
//   · ShadeScene.kt SingleShade：CollapsedShadeHeader → MediaAndQqsLayout(QQS+媒体) → 通知滚动区
//   · ShadeScene.kt SplitShade：CollapsedShadeHeader(isSplitShade) → Row[QS 列 | 通知列]（weight 1:1）
//   · QuickQuickSettings.kt：VerticalSpannedGrid 4 列，间距 8dp，2 行
//   · DefaultLargeTilesRepository：internet/bt/dnd/cast 各 span2（DEFAULT_LARGE_TILE_WIDTH=2）
//   · shade_dimens.xml：TileHeight=72dp / ToggleTarget=56dp / 大磁贴图标 28dp / 小磁贴 32dp /
//     圆角 inactive 50dp / active 24dp / icon active 16dp
//   · QuickSettingsScene.kt：ExpandedShadeHeader → 亮度(顶置 8dp) → TileGrid → media + FooterActions 固定底
//   · config.xml：手机竖屏 4 列 / 横屏 8 列 / split 4 列
//   · FooterActions.kt：按钮 40dp / 图标 20dp
//   · 无 tab 胶囊、无左右双面板、无分页点（infinite grid）
//
// 覆盖：版本锚点 / HTML 结构 / CSS 几何 / JS 手势与渲染 / v7.8x 回归锚点。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

const indexHtml = src('ios-desktop/index.html');
const panelsCss = src('ios-desktop/css/pull-panels.css');
const gestureJs = src('ios-desktop/js/pull-down-gesture.js');
const quickSettingsJs = src('ios-desktop/js/quick-settings.js');
const qsTilesJs = src('ios-desktop/js/qs-tiles.js');
const domJs = src('ios-desktop/js/dom.js');
const swJs = src('sw.js');

// ==================== A. 版本锚点 ====================
describe('v7.84 · A 版本锚点', () => {
  test('sw.js 升 geek-v100', () => {
    expect(swJs).toContain("const VERSION = 'geek-v100';");
    expect(swJs).not.toMatch(/geek-v(9[0-3])\b/);
  });
});

// ==================== B. HTML 结构（单面板两场景，AOSP ShadeScene 同构） ====================
describe('v7.84 · B 统一 Shade HTML 结构', () => {
  test('层次：overlay → canvas（打开动画）→ track（垂直场景轨）', () => {
    expect(indexHtml).toContain('id="pullPanelsOverlay"');
    expect(indexHtml).toContain('class="pull-panels-canvas" id="pullPanelsCanvas"');
    expect(indexHtml).toContain('class="pull-panels-track" id="pullPanelsTrack"');
    expect(indexHtml.indexOf('pullPanelsCanvas')).toBeLessThan(indexHtml.indexOf('pullPanelsTrack'));
  });

  test('双场景列：shadeColumn（QQS+通知）/ qsColumn（大钟+磁贴+footer）', () => {
    expect(indexHtml).toContain('id="shadeColumn"');
    expect(indexHtml).toContain('id="qsColumn"');
    expect(indexHtml).toContain('id="qqsTilesContainer"');
    expect(indexHtml).toContain('id="qsTilesContainer"');
    // QQS 容器在 shade 列内、主网格在 QS 列内
    const shadeScope = indexHtml.split('id="shadeColumn"')[1].split('id="qsColumn"')[0];
    expect(shadeScope).toContain('qqsTilesContainer');
    expect(shadeScope).toContain('notiPanelScroll');
    expect(shadeScope).toContain('pixelMediaCard'); // QQS 区媒体槽
    const qsScope = indexHtml.split('id="qsColumn"')[1];
    expect(qsScope).toContain('qsTilesContainer');
    expect(qsScope).toContain('qsBrightnessBar'); // 亮度在 QS 场景（源码 brightness 顶置）
    expect(qsScope).toContain('panel-big-clock'); // ExpandedShadeHeader 大钟
    expect(qsScope).toContain('qs-footer');
  });

  test('CollapsedShadeHeader 单行小头部（Shade 场景）', () => {
    expect(indexHtml).toContain('class="collapsed-shade-header"');
    expect(indexHtml).toContain('csh-clock');
    expect(indexHtml).toContain('csh-date');
  });

  test('旧方案退役：tab 胶囊 / 横向 slider / 双面板 id / 分页点全清', () => {
    expect(indexHtml).not.toContain('panel-tab-pill');
    expect(indexHtml).not.toContain('pull-panels-slider');
    expect(indexHtml).not.toContain('id="notificationPanel"');
    expect(indexHtml).not.toContain('id="quickSettingsPanel"');
    expect(indexHtml).not.toContain('qs-page-dots');
  });
});

// ==================== C. CSS 源码几何 ====================
describe('v7.84 · C CSS 源码几何', () => {
  test('场景轨：高 200% 双场景各半；canvas 承担打开滑入', () => {
    expect(panelsCss).toMatch(/\.pull-panels-track \{[^}]*height: 200%/);
    expect(panelsCss).toMatch(/\.pull-panels-canvas \{[^}]*translate3d\(0, -100%, 0\)/);
    expect(panelsCss).toMatch(/\.pull-panels-overlay\.active \.pull-panels-canvas \{[^}]*translate3d\(0, 0, 0\)/);
  });

  test('CollapsedShadeHeader：单行 52px（statusBarHeight 同构）+ Clock/Date 14sp', () => {
    const block = panelsCss.match(/\.collapsed-shade-header \{[^}]*\}/)[0];
    expect(block).toContain('height: 52px');
    expect(block).toContain('align-items: center');
    const clock = panelsCss.match(/\.csh-clock \{[^}]*\}/)[0];
    expect(clock).toContain('font-size: 14px');
  });

  test('QQS：上 margin 16dp / 下 padding 16dp / 间距 8dp / 全磁贴 span2（2×2）', () => {
    const area = panelsCss.match(/\.qqs-area \{[^}]*\}/)[0];
    expect(area).toContain('margin-top: 16px');
    expect(area).toContain('padding-bottom: 16px');
    expect(panelsCss).toMatch(/\.qqs-grid \{[^}]*gap: 8px/);
    expect(panelsCss).toMatch(/\.qqs-grid \.qs-tile-pill \{[^}]*grid-column: span 2/);
  });

  test('磁贴 1:1 源码：72dp 高 / 50dp 圆角自动钳制 / 底座 56dp / 大磁贴图标 28dp 小磁贴 32dp', () => {
    expect(panelsCss).toContain('height: calc(72px * var(--qs-squish, 1))');
    expect(panelsCss).toContain('--tile-r-off: 50px');
    expect(panelsCss).toContain('--tile-r-on: 24px');
    expect(panelsCss).toMatch(/\.qs-tile-icon-wrap \{[^}]*width: 56px/);
    expect(panelsCss).toMatch(/\.qs-tile-icon-wrap svg \{[^}]*width: 28px/);
    expect(panelsCss).toMatch(/\.qs-tile-pill\.size-small \.qs-tile-icon-wrap svg \{[^}]*width: 32px/);
  });

  test('平板 split shade ≥600px（源码 WIDTH_DP_MEDIUM_LOWER_BOUND）：单面板双列 + header 跨列 + QQS 隐藏', () => {
    expect(panelsCss).toContain('@media (min-width: 600px)');
    expect(panelsCss).toMatch(/@media \(min-width: 600px\) \{[\s\S]*?\.shade-column \{[\s\S]*?display: contents/);
    expect(panelsCss).toMatch(/@media \(min-width: 600px\) \{[\s\S]*?grid-template-columns: minmax\(0, 1\.2fr\) minmax\(0, 1fr\)/);
    expect(panelsCss).toMatch(/@media \(min-width: 600px\) \{[\s\S]*?\.collapsed-shade-header \{[\s\S]*?grid-column: 1 \/ -1/);
    expect(panelsCss).toMatch(/@media \(min-width: 600px\) \{[\s\S]*?\.qqs-area \{[\s\S]*?display: none/);
    expect(panelsCss).not.toContain('min-width: 640px');
  });
});

// ==================== D. JS 手势与渲染（AOSP 两段连续手势 + 双容器） ====================
describe('v7.84 · D JS 手势与渲染', () => {
  test('手势：两段连续下拉（0.38H 开面板 → 继续下拉驱动场景轨），sceneProgress 跟手', () => {
    expect(gestureJs).toContain('const thresholdPx = screenH * 0.38;');
    expect(gestureJs).toContain('const sceneRangePx = screenH * 0.42;');
    expect(gestureJs).toContain('scheduleSceneVisual');
    expect(gestureJs).toContain('applySceneVisual(pendingSceneProgress)');
    expect(gestureJs).toMatch(/translate3d\(0, \$\{\(-50 \* progress\)\.toFixed\(3\)\}%, 0\)/);
  });

  test('过拉弹性带语义迁移：段二过拉作用于面板层（dy - sceneRangePx）', () => {
    expect(gestureJs).toContain('const over = overPullOffset(dy - sceneRangePx, 0);');
  });

  test('打开/关闭/场景 API：openPullPanel(scene) / closePullPanels 复位场景轨 / switchPullPanel shim', () => {
    expect(gestureJs).toContain('export function openPullPanel(scene = 0)');
    expect(gestureJs).toContain('tweenScene(scene, 320)');
    expect(gestureJs).toContain('sceneProgress = 0;');
    expect(gestureJs).toContain('export function switchPullPanel(scene)');
  });

  test('旧横滑体系退役：无 slider 200% / 无 x 分区 / 无 tab 更新', () => {
    expect(gestureJs).not.toContain('pullPanelsSlider');
    expect(gestureJs).not.toContain('x < window.innerWidth / 2');
    expect(gestureJs).not.toContain('updateTabButtons');
  });

  test('渲染双容器：QQS = 出厂大磁贴（internet/bt/dnd/cast 源码集合）前 4 个；增量刷新遍历双份 DOM', () => {
    expect(quickSettingsJs).toContain('qqsTilesContainer');
    expect(quickSettingsJs).toContain('qqsTiles.includes(tile)');
    expect(quickSettingsJs).toContain("getElementById('qqsTilesContainer')");
    expect(qsTilesJs).toContain('cast: QS_TILE_SIZES.WIDE');
    expect(quickSettingsJs).toMatch(/querySelectorAll\(`\.qs-tile-pill\[data-tile-id/);
  });

  test('dom.js 引用面更新：canvas/track 入册', () => {
    expect(domJs).toContain("document.getElementById('pullPanelsCanvas')");
    expect(domJs).toContain("document.getElementById('pullPanelsTrack')");
    expect(domJs).not.toContain("document.getElementById('pullPanelsSlider')");
  });
});

// ==================== E. v7.8x 回归锚点（不得破坏） ====================
describe('v7.84 · E 回归锚点', () => {
  test('squish / 滑条 / 大钟头部 / 壁纸模糊通道全部在场', () => {
    expect(panelsCss).toContain('var(--qs-squish, 1)');
    expect(panelsCss).toContain('height: 52px'); // 滑条竖柄 52dp
    expect(panelsCss).toContain('min-height: 120px'); // 大钟头部 120dp
    expect(panelsCss).toMatch(/\.panel-big-clock \{[^}]*font-size: 36px/);
    expect(gestureJs).toContain('setPanelBlurProgress');
    expect(gestureJs).toContain('tweenPanelBlurProgress');
  });
});
