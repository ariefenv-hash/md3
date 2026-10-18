// ==================== v782-qs-source-motion.test.js — v7.82 控制中心动画 AOSP 源码重做版 ====================
//
// 源码依据（android17-release @ 94b4c163，清华镜像 sparse checkout）：
//   ① 两态圆角  shade_dimens.xml common_tile_default_inactive_tile_corner_radius=50dp /
//               common_tile_default_active_tile_corner_radius=24dp；Tile.kt tileRadius 按状态切值；
//               animateDpAsState/animateColorAsState 默认 spring(NoBouncy=1.0, StiffnessMediumLow=400)
//               → CSS 以 320ms cubic-bezier(0.2,0,0,1)（该弹簧归一化形）表达，无 blob 过冲
//   ② 展开过渡  Tile.kt verticalSquish：squishiness 作用在磁贴布局高度（内容居中）；
//               QSFragmentComposeViewModel.constrainSquishiness = (0.1 + expansion×0.9).coerceIn(0,1)
//   ③ 亮度滑条  BrightnessSlider.kt BrightnessSliderDimensions.Default：track 40dp /
//               圆角 24dp / thumb 4×52dp（上下各出 6dp）/ ThumbTrackGapSize 6dp / 图标 28dp
//   ④ 图标底座  CommonTile.kt LargeTileContent：Box = ToggleTargetSize 56dp，clip 圆↔16dp 方圆角，
//               glyph = LargeTileIconSize 32dp；双目标激活色在图标底（surfaceEffect2↔primary）

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

describe('v7.82 · 版本锚点', () => {
  test('sw.js 升 geek-v97', () => {
    expect(src('sw.js')).toContain("const VERSION = 'geek-v97';");
  });
});

describe('v7.82 · ① 两态圆角 spring（源码常量 + 无过冲）', () => {
  const css = src('ios-desktop/css/pull-panels.css');
  const js = src('ios-desktop/js/quick-settings.js');

  test('圆角令牌 = 源码绝对值：OFF 50px（50dp，72dp 高 CSS 自动钳制=全胶囊）/ ON 24px（24dp）', () => {
    expect(css).toContain('--tile-r-off: 50px;');
    expect(css).toContain('--tile-r-on: 24px;   /* 24dp 激活（绝对值，源码常量） */');
  });

  test('两态切换 = 320ms standard 曲线（spring(1.0,400) 归一化形），圆角/底色/前色/阴影同步', () => {
    expect(css).toMatch(/\.qs-tile-pill \{[^]*?transition:\s*\n\s*background-color 0\.32s cubic-bezier\(0\.2, 0, 0, 1\),\s*\n\s*color 0\.32s cubic-bezier\(0\.2, 0, 0, 1\),\s*\n\s*box-shadow 0\.32s cubic-bezier\(0\.2, 0, 0, 1\),\s*\n\s*border-radius 0\.32s cubic-bezier\(0\.2, 0, 0, 1\)/);
  });

  test('激活态 = 整底 primary（单目标 activeTileColors 语义）', () => {
    expect(css).toMatch(/\.qs-tile-pill\.active \{[^]*?border-radius: var\(--tile-r-on\);[^]*?background: var\(--md-primary[^]*?color: var\(--md-on-primary/);
  });

  test('blob 过冲体系全量退役（视频推演结论让位源码 spring 单调性）', () => {
    expect(css).not.toContain('@keyframes qs-body-morph-on');
    expect(css).not.toContain('@keyframes qs-body-morph-off');
    expect(css).not.toContain('@keyframes qs-icon-morph-on');
    expect(css).not.toContain('@keyframes qs-icon-morph-off');
    expect(css).not.toContain('cubic-bezier(0.34, 1.32, 0.64, 1)');
    expect(js).not.toContain('playTileMorph');
    expect(js).not.toContain('QS_MORPH_MS');
    expect(js).not.toContain('_morphPending');
  });

  test('图标底座 = 源码 ToggleTargetSize 56dp + ActiveIconCornerRadius 16dp + glyph 32dp', () => {
    expect(css).toMatch(/\.qs-tile-icon-wrap \{\s*\n\s*width: 56px;\s*\n\s*height: 56px;\s*\n\s*border-radius: 50%;/);
    expect(css).toMatch(/\.qs-tile-pill\.active\[data-tile-id="bluetooth"\] > \.qs-tile-icon-wrap,\s*\n\.qs-tile-pill\.active\[data-tile-id="modes"\] > \.qs-tile-icon-wrap \{\s*\n\s*border-radius: 16px;/);
    expect(css).toMatch(/\.qs-tile-icon-wrap svg \{\s*\n\s*width: 32px;\s*\n\s*height: 32px;\s*\n\}/);
  });
});

describe('v7.82 · ② 展开过渡（verticalSquish 布局高度 squish）', () => {
  const css = src('ios-desktop/css/pull-panels.css');
  const js = src('ios-desktop/js/pull-down-gesture.js');

  test('磁贴高度 = calc(基高 × var(--qs-squish, 1))（真实布局高度缩放，非 transform）', () => {
    expect(css).toContain('height: calc(72px * var(--qs-squish, 1));');
    // v7.84 平板 split 同源码基础值（sw600dp 覆盖全带 desktop_sizing 门，96px 拟合值退役）
  });

  test('squish 纯函数 = 源码 constrainSquishiness：(0.1 + expansion×0.9) 钳 [0.1,1]', () => {
    expect(js).toContain('const v = 0.1 + expansion * 0.9;');
    expect(js).toContain('return Math.min(1, Math.max(0.1, v));');
  });

  test('拖拽逐帧驱动 + 开/合/回弹三路补间（对齐 blur 补间模式）', () => {
    expect(js).toContain('stopSquishTween();\n  setQsSquish(qsSquishFromExpansion(v.overlayOpacity));');
    expect(js).toContain('tweenQsSquish(1, dur(300));');                      // openPullPanel
    expect(js).toContain('tweenQsSquish(1, dur(240));');                      // restorePanelVisual
    expect(js).toContain('tweenQsSquish(qsSquishFromExpansion(0), dur(250));'); // closePullPanels
    expect(js).toContain('function bezierStandard(t) {');
  });
});

describe('v7.82 · ③ 亮度/音量滑条（v7.87 AOSP 源码 1:1 重植）', () => {
  const css = src('ios-desktop/css/pull-panels.css');

  test('亮度 PlatformSlider：轨 64dp 全胶囊（secondaryContainer）/ 填充 primary 自 64px 图标区起算', () => {
    expect(css).toMatch(/\.qs-brightness \{\s*\n\s*position: relative;\s*\n\s*height: 64px;\s*\n\s*border-radius: 32px;/);
    expect(css).toMatch(/\.qs-brightness-fill \{[^]*?background: var\(--md-primary\);/);
  });

  test('音量 M3E 竖置：轨 40dp 角 12dp / insideCorner 2dp / stop 6dp / 横柄 52×4dp', () => {
    expect(css).toMatch(/\.qs-volume::before \{[^]*?border-radius: 12px;/s);
    expect(css).toContain('border-radius: 2px 2px 12px 12px;      /* 顶角 trackInsideCornerSize 2dp / 底角 12dp */');
    expect(css).toContain('width: 52px;            /* thumbHeight 52dp 竖置转横向，两侧出轨 6dp */');
    expect(css).toContain('height: 4px;            /* thumbWidth 4dp */');
  });

  test('流图标 24dp；拖拽只变形填充右角（32→8dp）不变形柄；平板 62px 覆盖移除', () => {
    expect(css).toMatch(/\.qs-volume-icon svg \{\s*width: 24px;/);
    expect(css).toContain('.qs-brightness.is-dragging .qs-brightness-fill {');
    expect(css).not.toContain('height: 62px');
  });
});

describe('v7.82 · ④ 分体磁贴配色（双目标激活语义）', () => {
  const css = src('ios-desktop/css/pull-panels.css');

  test('双目标（蓝牙/模式）激活：本体保持中性 surfaceEffect1，仅图标底座变 primary + 16dp 方圆角', () => {
    expect(css).toMatch(/\.qs-tile-pill\.active\[data-tile-id="bluetooth"\],\s*\n\.qs-tile-pill\.active\[data-tile-id="modes"\] \{\s*\n\s*background: var\(--md-surface-container-high/);
    expect(css).toMatch(/\.qs-tile-pill\.active\[data-tile-id="bluetooth"\] > \.qs-tile-icon-wrap,[^]*?\{\s*\n\s*border-radius: 16px;\s*\n\s*background: var\(--md-primary/);
  });
});
