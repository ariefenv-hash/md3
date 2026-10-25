/**
 * v8.20 · #45 竖柄滑块第三轮源码级对齐 —— material3 1.4.0 布局/按压全链语义锚定
 *
 * 源码基准（本轮实拉取证）：
 * - material3-android 1.4.0 sources jar（maven 镜像实拉）：
 *   Slider.kt SliderImpl L855-880（布局：trackW = 布局区宽 − thumbW、trackOffsetX = thumbW/2、
 *   thumbOffsetX = trackW·frac 无步进分支）；drawTrack L1912-1919（endGap =
 *   endThumbWidth/2 + thumbTrackGapSize，endThumbWidth = state.thumbWidth 当下实测宽）
 *   + L1971-1985（inactive 阈值 sliderEnd − endGap − cornerSize，enableCornerShrinking=false）
 *   + Thumb L1211-1241（interactions 非空 → thumbSize.width/2，HandleShape=CornerFull，
 *   Spacer TopStart 左缘锚定，无缩放动画、无 indication/涟漪）
 * - AOSP SystemUI android17-release BrightnessSlider.kt（LineageOS lineage-24.0 镜像实拉）：
 *   SliderDefaults.Thumb(interactionSource, thumbSize = DpSize(4, 52))、
 *   SliderDefaults.Track(trackCornerSize=12dp, trackInsideCornerSize=2dp,
 *   thumbTrackGapSize=6dp, drawStopIndicator=null)、sliderBackground(10w×6h, 24dp)
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(repoRoot, p), 'utf8');

describe('v8.20 · #45 竖柄滑块第三轮：M3 1.4.0 布局语义（SliderImpl 权威）', () => {
  const css = src('ios-desktop/css/pull-panels.css');
  const js = src('ios-desktop/js/quick-settings.js');
  const html = src('ios-desktop/index.html');

  test('① track 布局内缩：margin 0 2px（trackOffsetX = thumbW/2 = SliderImpl L872）+ 本底透明（drawTrack 无全宽 inactive 底）', () => {
    expect(css).toMatch(/\.qs-bs-track \{[^]*?margin: 0 2px;\s*\/\* trackOffsetX/s);
    // v8.17 残留偏差修正：track 不再垫 inactive 色——段消失（v=0/100）露 sliderBackground（frame）底色
    const trackBlock = css.slice(css.indexOf('.qs-bs-track {'), css.indexOf('.qs-bs-track-active'));
    expect(trackBlock).not.toMatch(/background\s*:/);
    // inactive 色由段元素自绘（surfaceContainerHighest）
    expect(css).toMatch(/\.qs-bs-track-inactive \{[^]*?background: var\(--md-surface-container-highest\);/s);
  });

  test('② thumb 左缘 travels [0, trackW]：calc((100% − 4px)·--vf)（thumbOffsetX = trackW·frac，L877-879）——v7.90「中心 travels 0..W − 2px」旧式全链退役', () => {
    expect(css).toMatch(/\.qs-bs-thumb \{[^]*?left: calc\(\(100% - 4px\) \* var\(--vf, 0\.8\)\);/s);
    expect(css).not.toContain('left: calc(var(--v, 80) * 1% - 2px);');
    expect(js).toContain("thumb.style.left = `${w * frac}px`;             // ④ thumbOffsetX = trackW·frac（左缘）");
    expect(js).not.toMatch(/thumb\.style\.left = `calc\(/);
  });

  test('③ endGap 动态 = thumbW/2 + ThumbTrackGapSize（drawTrack L1916-1919：endThumbWidth = state.thumbWidth 当下实测）——常态 8 / 按压 7，v7.93 定死 8 退役', () => {
    expect(js).toMatch(/const endGap = thumbW \/ 2 \+ GAP_ICON;\s+\/\/ ③ thumbWidth\/2 \+ ThumbTrackGapSize（8\/7）\n/);
    expect(js).not.toContain('GAP_TRACK');
    // 图标锚 gap 恒 6（BrightnessSlider.kt drawWithContent 用常量 ThumbTrackGapSize，不随按压联动）
    expect(js).toMatch(/const activeEnd = Math\.max\(0, w \* \(value \/ 100\) - GAP_ICON\);/);
  });

  test('④ 按压全链联动重绘：thumbW = is-dragging ? 2 : 4 → margin thumbW/2 → endGap → 段几何（Thumb interactions 语义 + SliderImpl 重测）', () => {
    expect(js).toMatch(/const thumbW = bar\.classList\.contains\('is-dragging'\) \? 2 : 4;/);
    expect(js).toMatch(/track\.style\.marginLeft = track\.style\.marginRight = `\$\{thumbW \/ 2\}px`;/);
    // 按压/松手各触发一次联动 render（值不变时 applyValue 不会触发 → 必须显式调用）
    expect(js).toMatch(/bar\.classList\.add\('is-dragging'\);\s*\n\s*render\(\);/);
    expect(js).toMatch(/bar\.classList\.remove\('is-dragging'\);\s*\n\s*render\(\);/);
  });

  test('⑤ 按压态 CSS：thumb 宽减半 4→2px + CornerFull 圆角随宽 2→1px（Thumb L1226-1238），左缘锚定（无 translate 补偿——Spacer TopStart 语义）', () => {
    expect(css).toMatch(/\.qs-brightness\.is-dragging \.qs-bs-thumb \{\s*\n\s*width: 2px;\s*\/\* thumbSize\.width \/ 2 \*\/\s*\n\s*border-radius: 1px;\s*\/\* CornerFull = width\/2 \*\/\s*\n\s*\}/);
    // 按压态块内无缩放动画/过渡/涟漪（1.4.0 Thumb 无 indication——涟漪半径属性对齐结论 = N/A）
    const pressStart = css.indexOf('.qs-brightness.is-dragging .qs-bs-thumb');
    const pressBlock = css.slice(pressStart, css.indexOf('}', pressStart));
    expect(pressBlock).not.toMatch(/transition|animation|ripple/i);
  });

  test('⑥ --vf 变量链：applyValue/初始渲染双写（CSS 兜底 left 用），--v 保留（旧消费方兼容）', () => {
    expect(js).toMatch(/bar\.style\.setProperty\('--vf', String\(value \/ 100\)\)/);
    expect(js).toMatch(/bar\.style\.setProperty\('--vf', String\(currentBrightness \/ 100\)\)/);
  });

  test('⑦ rectCache 取值时序：必须在按压联动 render 之后（margin 2→1px 移动 rect，tap 解算用按压后布局）', () => {
    const downBlock = js.slice(js.indexOf("bar.addEventListener('pointerdown'"), js.indexOf('const onMove'));
    const addIdx = downBlock.indexOf("bar.classList.add('is-dragging')");
    const renderIdx = downBlock.indexOf('render();');
    const rectIdx = downBlock.indexOf('rectCache = track.getBoundingClientRect()');
    expect(addIdx).toBeGreaterThanOrEqual(0);
    expect(rectIdx).toBeGreaterThan(renderIdx);
    expect(renderIdx).toBeGreaterThan(addIdx);
  });

  test('⑧ DOM 结构兼容：thumb 仍在 row（v8.17 裁切域外）；track 四子元素序不变', () => {
    const iRow = html.indexOf('class="qs-bs-row"');
    const iTrack = html.indexOf('id="qsBsTrack"');
    const iThumb = html.indexOf('id="qsBsThumb"');
    expect(iRow).toBeGreaterThanOrEqual(0);
    expect(iTrack).toBeGreaterThan(iRow);
    expect(iThumb).toBeGreaterThan(iTrack);
    const trackBlock = html.slice(iTrack, iThumb);
    expect(trackBlock.indexOf('id="qsBsActive"')).toBeLessThan(trackBlock.indexOf('id="qsBsInactive"'));
    expect(trackBlock.indexOf('id="qsBsIconActive"')).toBeLessThan(trackBlock.indexOf('id="qsBsIconInactive"'));
  });
});
