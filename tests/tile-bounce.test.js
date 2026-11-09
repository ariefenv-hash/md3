/**
 * v7.93 · QS 磁贴按压 bounce 联动 —— AOSP Bounceable 体系锚定
 *
 * 源码蓝本（android-17.0.0_r1）：
 *   compose/core/.../Bounceable.kt（BounceableImpl / MINIMUM_BOUNCE_RATIO .75 /
 *     MAX_WAIT_TIME_MILLIS 1000 / spring() 默认 ζ1·k400 / BounceableNode.measure）
 *   qs/panels/ui/viewmodel/BounceableTileViewModel.kt（BounceSize = 8dp）
 *   qs/panels/ui/compose/BounceableInfo.kt（同行邻居 / bounceEnd = !onLastColumn）
 *   qs/panels/ui/compose/infinitegrid/Tile.kt（bounceable 接线 / bounceContainer 判定）
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bounceLayout } from '../ios-desktop/js/tile-bounce.js';

const root = resolve(import.meta.dirname, '..');
const src = (p) => readFileSync(resolve(root, p), 'utf8');

describe('v7.93 · 磁贴按压 bounce 联动（AOSP Bounceable 1:1）', () => {
  const tb = src('ios-desktop/js/tile-bounce.js');
  const main = src('ios-desktop/js/main.js');
  const css = src('ios-desktop/css/pull-panels.css');

  it('bounce 布局公式 = BounceableNode.measure：按压者 Δ=sizePrev+sizeNext / ml=−sizePrev', () => {
    // 中间磁贴（有 prev 有 next）：两侧各扩 b
    expect(bounceLayout(8, { hasPrev: true, hasNext: true, lastAlignedRight: true }))
      .toEqual({ widthDelta: 16, marginLeft: -8, marginRight: -8 });
    // 行首（无 prev）：仅右扩
    expect(bounceLayout(8, { hasPrev: false, hasNext: true, lastAlignedRight: true }))
      .toEqual({ widthDelta: 8, marginLeft: 0, marginRight: -8 });
    // 行尾对齐右缘（lastAlignedRight ≙ 源码 bounceEnd=false）：仅左扩
    expect(bounceLayout(8, { hasPrev: true, hasNext: false, lastAlignedRight: true }))
      .toEqual({ widthDelta: 8, marginLeft: -8, marginRight: 0 });
    // 行尾未对齐（bounceEnd=true）：两侧扩（源码 else if (bounceEnd) sizeNext += bounce）
    expect(bounceLayout(8, { hasPrev: true, hasNext: false, lastAlignedRight: false }))
      .toEqual({ widthDelta: 16, marginLeft: -8, marginRight: -8 });
    // 孤磁贴（同行无邻居 + 对齐）：无联动
    expect(bounceLayout(8, { hasPrev: false, hasNext: false, lastAlignedRight: true }))
      .toEqual({ widthDelta: 0, marginLeft: 0, marginRight: 0 });
  });

  it('弹簧参数 = Compose spring() 默认（ζ=1 NoBouncy、stiffness=400 MediumLow、mass=1）', () => {
    expect(tb).toContain('const SPRING_PARAMS = { mass: 1, stiffness: 400, damping: 40 };');
    // 阻尼 2ζ√(k·m) = 2·1·20 = 40（临界阻尼，无过冲 —— 源码 spring() 默认单调）
    const damping = 2 * 1 * Math.sqrt(400 * 1);
    expect(damping).toBe(40);
  });

  it('BounceSize 8dp + 快速轻点保护（75% 阈值 / 1000ms 上限）逐值锚定', () => {
    expect(tb).toContain('const BOUNCE_SIZE = 8;');                 // BounceSize = 8.dp
    expect(tb).toContain('const MIN_BOUNCE = BOUNCE_SIZE * 0.75;'); // MINIMUM_BOUNCE_RATIO
    expect(tb).toContain('const MAX_WAIT_MS = 1000;');              // MAX_WAIT_TIME_MILLIS
  });

  it('按压者+双邻居三元素联动：邻居增量随 b 实时变化（左邻 Δ−b/margin0、右邻 Δ−b/ml+b）', () => {
    // 源码 measure：邻居 sizePrevious/sizeNext = 0 − b —— 让位量随按压者弹簧实时变化
    expect(tb).toMatch(/function neighborLayouts\(b\) \{/);
    expect(tb).toMatch(/prev: \{ widthDelta: -b, marginLeft: 0, marginRight: 0 \},/);
    expect(tb).toMatch(/next: \{ widthDelta: -b, marginLeft: b, marginRight: 0 \},/);
    expect(tb).toMatch(/el\.style\.width = `\$\{idles\.prev \+ nb\.prev\.widthDelta\}px`;/);
    expect(tb).toMatch(/el\.style\.width = `\$\{idles\.next \+ nb\.next\.widthDelta\}px`;/);
    expect(tb).toMatch(/el\.style\.marginLeft = `\$\{nb\.next\.marginLeft\}px`;/);
  });

  it('释放路径：animateToRest 先 waitUntil(≥75%) 或超时 1s 再回 0（BounceableImpl 同构）', () => {
    expect(tb).toMatch(/if \(this\.spring\.x < MIN_BOUNCE\) \{[^]*?this\.waitingMin = true;/s);
    expect(tb).toMatch(/this\.spring\.x >= MIN_BOUNCE \|\| now - this\.waitStart > MAX_WAIT_MS/);
    expect(tb).toMatch(/_tick\(now\) \{[^]*?this\.spring\.update\(dt\);/s);
  });

  it('接线：main.js initTileBounce() + pointerdown 委托 .qs-tile-pill + up/cancel 释放', () => {
    expect(main).toContain("import { initTileBounce } from './tile-bounce.js';");
    expect(main).toContain('initTileBounce();');
    expect(tb).toMatch(/e\.target\.closest && e\.target\.closest\('\.qs-tile-pill'\)/);
    expect(tb).toMatch(/window\.addEventListener\('pointerup', onUp, true\);/);
    expect(tb).toMatch(/window\.addEventListener\('pointercancel', onUp, true\);/);
  });

  it('同行判定：仅取同 offsetTop 行内 pill，按 offsetLeft 排序取 i±1（BounceableInfo 同构）', () => {
    expect(tb).toMatch(/Math\.abs\(el\.offsetTop - pill\.offsetTop\) < pill\.offsetHeight \/ 2/);
    expect(tb).toMatch(/row\.sort\(\(a, b\) => a\.offsetLeft - b\.offsetLeft\);/);
    expect(tb).toMatch(/row\[i - 1\] \|\| null/);
    expect(tb).toMatch(/row\[i \+ 1\] \|\| null/);
  });

  it('no-anim 免疫 + 旧 :active scale 退役（源码按压无 scale，容器 bounce 主导）', () => {
    expect(tb).toContain("document.documentElement.classList.contains('no-anim')");
    expect(css).not.toContain('.qs-tile-pill:active {\n  transform: scale(0.985);\n}');
    // 按压灰盘保留（v4 实锤项，非 bounce 职责）
    expect(css).toContain('.qs-tile-pill:active .qs-tile-icon-wrap {');
  });

  it('解析弹簧复用：v7.92 Spring 闭式解驱动（与源码 Animatable+spring 同一数学形态）', () => {
    expect(tb).toContain("import { Spring } from './spring.js';");
    expect(tb).toMatch(/new Spring\(\{ \.\.\.SPRING_PARAMS, initialValue: 0 \}\)/);
  });
});
