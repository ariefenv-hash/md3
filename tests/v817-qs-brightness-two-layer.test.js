import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

/**
 * v8.17 · #78 —— QS 亮度滑块回归源码两层结构（方案 A）+ 圆角单源重合
 *
 * 议题三问题与修复映射：
 *  问题一「三层圆角不一致」 → halo（32dp 半透明黑，volume dialog scrim 语义历史包袱）
 *      整层退役 —— 源码 BrightnessSlider.kt sliderBackground（L391-402）只有
 *      track(12dp) + background(24dp) 两层
 *  问题二「最外层被容器裁断」 → halo inset:-8px 左右被 .panel-scroll overflow-x:hidden
 *      裁断 —— 删层即消失（方案 A 自动消解）
 *  问题三「描边与填充没有做到圆角上的重合」 → active/inactive 段不再自绘外角 12dp
 *      圆弧（两相邻元素各画同一条圆弧产生 AA 亚像素错位），track overflow:hidden
 *      单源裁切 —— 外角圆弧全轨只画一次；段仅保留内角 2dp（trackInsideCornerSize）
 *  附带：thumb 52dp>track 40dp 出头不被新裁切域波及 —— 外移至 .qs-bs-row（同宽同顶，
 *      百分比/px 定位数学不变）；frame 底色改 shade_panel_fallback 语义 token
 *      （ContainerColors.defaultContainerColor，非 surface-container 复用、非半透明黑）
 */
describe('v8.17 · #78 亮度滑块两层结构 + 圆角单源重合', () => {
  const html = src('ios-desktop/index.html');
  const css = src('ios-desktop/css/pull-panels.css');
  const js = src('ios-desktop/js/quick-settings.js');

  test('halo 层整体退役：::before 规则与 scrim 色值全无残留（源码两层）', () => {
    expect(css).not.toMatch(/\.qs-brightness::before/);
    expect(css).not.toContain('rgba(0, 0, 0, 0.28)');
    expect(css).not.toContain('inset: -8px;');
    // 防误伤：volume dialog 自身的滑条 ::before（另一语义）必须完好
    expect(css).toMatch(/\.vd-slider::before \{/);
  });

  test('frame：24dp 角 + 6/10 padding + shade_panel_fallback 语义底色（fallback 链）', () => {
    expect(css).toMatch(/\.qs-bs-frame \{[^]*?border-radius: 24px;[^]*?padding: 6px 10px;[^]*?background: var\(--md-shade-panel-fallback, var\(--md-surface-container\)\);/s);
  });

  test('语义 token 双主题落地：--md-shade-panel-fallback = 面板底色（暗 + 亮）', () => {
    const dark = src('ios-desktop/css/md3-theme.css');
    const light = src('ios-desktop/css/theme-mode.css');
    expect(dark).toContain('--md-shade-panel-fallback: var(--md-surface-container);');
    expect(light).toContain('--md-shade-panel-fallback: var(--md-surface-container);');
  });

  test('track 单源圆角权威：overflow hidden + 12dp 圆角一次绘制；row = thumb 宿主', () => {
    expect(css).toMatch(/\.qs-bs-track \{[^]*?height: 40px;[^]*?border-radius: 12px;[^]*?overflow: hidden;/s);
    expect(css).toMatch(/\.qs-bs-row \{[^]*?height: 40px;[^]*?position: relative;/s);
  });

  test('HTML 结构序：thumb 位于 track 闭合之后（row 内）、图标仍在 track 内', () => {
    const iTrackOpen = html.indexOf('id="qsBsTrack"');
    const iIconA = html.indexOf('id="qsBsIconActive"');
    const iIconI = html.indexOf('id="qsBsIconInactive"');
    const iIconClose = html.indexOf('</div>', iIconI);
    const iTrackClose = html.indexOf('</div>', iIconClose + 1);
    const iThumb = html.indexOf('id="qsBsThumb"');
    expect(iTrackOpen).toBeGreaterThan(-1);
    // 图标对在 track 内
    expect(iTrackOpen).toBeLessThan(iIconA);
    expect(iIconA).toBeLessThan(iIconI);
    expect(iIconI).toBeLessThan(iTrackClose);
    // thumb 在 track 闭合之后（row 宿主，不被 overflow:hidden 裁切域波及）
    expect(iTrackClose).toBeLessThan(iThumb);
    // thumb 之上有 v8.17 外移注释锚
    expect(html.slice(iTrackClose, iThumb)).toContain('v8.17');
  });

  test('JS 圆角单源化：段仅内角 2dp，旧双元素外角 12dp 形态全量退役', () => {
    expect(js).toContain('`0 ${INSIDE_CORNER}px ${INSIDE_CORNER}px 0`');
    expect(js).toContain('`${INSIDE_CORNER}px 0 0 ${INSIDE_CORNER}px`');
    // 旧形态不回潮（active 左端 12 / inactive 右端 12 由 track 裁切接管）
    expect(js).not.toContain('`${TRACK_CORNER}px ${INSIDE_CORNER}px ${INSIDE_CORNER}px ${TRACK_CORNER}px`');
    expect(js).not.toContain('`${INSIDE_CORNER}px ${TRACK_CORNER}px ${TRACK_CORNER}px ${INSIDE_CORNER}px`');
  });

  test('源码原值体系不动：thumb 4×52 / track 40 / 角 12·2 / gap 6·8 / 段消失阈值', () => {
    expect(js).toContain('const TRACK_H = 40, ICON_SIZE = 28, ICON_PADDING = 6;');
    expect(js).toContain('const GAP_ICON = 6, GAP_TRACK = 8;');
    expect(js).toContain('const TRACK_CORNER = 12, INSIDE_CORNER = 2;');
    expect(js).toMatch(/activeW = Math\.max\(0, w \* frac - GAP_TRACK\);/);
    expect(js).toMatch(/showInactive = w \* frac < w - GAP_TRACK - TRACK_CORNER;/);
    expect(js).toMatch(/activeW > TRACK_CORNER \? activeW : 0/);
    expect(js).toContain('thumb.style.left = `calc(${frac * 100}% - 2px)`;');
    expect(css).toMatch(/\.qs-bs-thumb \{[^]*?width: 4px;[^]*?height: 52px;[^]*?top: -6px;/s);
  });
});
