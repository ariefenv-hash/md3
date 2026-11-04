// ==================== v103-interruptible-in-out-animator.test.js — #103 Launcher3 InterruptibleInOutAnimator 移植 ====================
//
// 覆盖（R87 窗加餐，Launcher3 anim/InterruptibleInOutAnimator.java 同名同义）：
//   · DIRECTION 字面量 / InterruptibleInOutAnimator API（in/out/progress/setProgress/
//     cancel/update/isSettled）
//   · progress 接续：反向触发从当前值继续（不回 0 重播——#39 类丢动画根因的根治语义）
//   · scaleDuration 距离比例时长缩放（满程翻转满时长 / 剩余距离比例 / MIN_SCALED_MS 钳）
//   · 边界 onStop 单次回调（到 0/1 才触发；中途打断不回调；新一段重新武装）
//   · 开/关不对称（outDurationMs / outInterpolator）
//   · context-menu.js 接线锚（fade 通道 IIO 消费 + progress 消费 + startMenuAnim 名保留）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIRECTION, MIN_SCALED_MS, InterruptibleInOutAnimator, IIOAnimator } from '../ios-desktop/js/aosp/interruptible-in-out-animator.js';
import { U_TIMINGS } from '../ios-desktop/js/aosp/popup-timings.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const CM = readFileSync(R('js/context-menu.js'), 'utf8');
/** 剥注释扫描（R77 同款） */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const step = (a, n, dt = 1 / 60) => { for (let i = 0; i < n; i++) a.update(dt); };

describe('v103-A · API 形态（Launcher3 同名同义）', () => {
  it('A1 DIRECTION 字面量 + 别名导出（IIOAnimator === InterruptibleInOutAnimator）', () => {
    expect(DIRECTION).toEqual({ IN: 'in', OUT: 'out' });
    expect(IIOAnimator).toBe(InterruptibleInOutAnimator);
  });

  it('A2 缺省 progress=0、direction=OUT；update 推进 in() 到 1', () => {
    const a = new InterruptibleInOutAnimator({ durationMs: 100 });
    expect(a.progress).toBe(0);
    expect(a.direction).toBe(DIRECTION.OUT);
    a.in();
    expect(a.direction).toBe(DIRECTION.IN);
    step(a, 60); // 1s ≫ 100ms
    expect(a.progress).toBe(1);
    expect(a.isSettled()).toBe(true);
  });

  it('A3 setProgress 瞬置冻结（target 同写防 update 重锚弹回）', () => {
    const a = new InterruptibleInOutAnimator({ durationMs: 200 });
    a.in();
    step(a, 10);
    a.setProgress(0.62);
    expect(a.progress).toBe(0.62);
    step(a, 60); // 冻结态不再前进
    expect(a.progress).toBe(0.62);
  });

  it('A4 cancel 冻结在当前值（Launcher3 cancel：progress 保留零跳变）', () => {
    const a = new InterruptibleInOutAnimator({ durationMs: 200 });
    a.in();
    step(a, 20);
    const x = a.progress;
    expect(x).toBeGreaterThan(0);
    a.cancel();
    step(a, 60);
    expect(a.progress).toBeCloseTo(x, 6);
  });
});

describe('v103-B · progress 接续（#39 类根因根治语义）', () => {
  it('B1 中途反向：从当前值接续向反方向，不回 0 重播', () => {
    const a = new InterruptibleInOutAnimator({ durationMs: 1000 });
    a.in();
    step(a, 20); // 1/3 处 ≈ 0.33（LINEAR）
    const mid = a.progress;
    expect(mid).toBeGreaterThan(0.25);
    a.out();
    // 反向后第一帧：值从 mid 起步向下（而非跳回 0 再播）
    a.update(1 / 60);
    expect(a.progress).toBeLessThan(mid);
    expect(a.progress).toBeGreaterThan(0.2); // 未崩到 0
  });

  it('B2 快速连点 N 次后终态正确（#103 建议③回归断言）', () => {
    const a = new InterruptibleInOutAnimator({ durationMs: 300 });
    for (let i = 0; i < 8; i++) { if (i % 2 === 0) a.in(); else a.out(); step(a, 2); }
    // 最后一次是 out()（i=7）→ 播完应停边界 0
    step(a, 120);
    expect(a.progress).toBe(0);
    expect(a.direction).toBe(DIRECTION.OUT);
    // 再 in() 播完 → 边界 1
    a.in();
    step(a, 120);
    expect(a.progress).toBe(1);
  });
});

describe('v103-C · scaleDuration 距离比例时长缩放（Launcher3 语义）', () => {
  it('C1 满程翻转（progress=0 起 in）用满时长', () => {
    const a = new InterruptibleInOutAnimator({ durationMs: 1000 });
    a.in();
    // 60fps × 16/60s = 每 update 16ms；1000ms 满 → 不满 40 帧不应到 1
    step(a, 40);
    expect(a.progress).toBeLessThan(1);
    step(a, 30);
    expect(a.progress).toBe(1);
  });

  it('C2 剩余距离比例：半程反向时长 ≈ 半程满时长的比例缩放（更快收敛）', () => {
    const a = new InterruptibleInOutAnimator({ durationMs: 1000 });
    a.in();
    step(a, 30); // ≈ 0.5（LINEAR 500ms/1000ms）
    const half = a.progress;
    expect(half).toBeGreaterThan(0.4);
    a.out(); // 剩余距离 = half → scaled = 1000 × half ≈ 500ms（IIO scaleDuration 唯一口径）
    let frames = 0;
    do { a.update(1 / 60); frames++; } while (!a.isSettled() && frames < 300);
    expect(a.progress).toBe(0);
    // 500ms ≈ 31 帧（±6 帧容差——整数帧推进）
    expect(frames).toBeGreaterThan(20);
    expect(frames).toBeLessThan(42);
  });

  it('C3 贴边微调：剩余距离极小时长钳 MIN_SCALED_MS（防 0ms 空转）', () => {
    const a = new InterruptibleInOutAnimator({ durationMs: 100 });
    a.setProgress(0.97); // 距边界 0.03 > posEps 0.005（未入容差带，真实在飞）
    a.in(); // remain=0.03 → scaled = max(round(100×0.03), 16) = 16ms
    let frames = 0;
    do { a.update(1 / 60); frames++; } while (!a.isSettled() && frames < 100);
    expect(a.progress).toBe(1);
    expect(frames).toBeLessThanOrEqual(3); // 16ms ≈ 1 帧 @60fps
  });

  it('C4 out 方向满程用 outDurationMs 覆写（开/关不对称时序）', () => {
    const a = new InterruptibleInOutAnimator({ durationMs: 100, outDurationMs: 1000 });
    a.setProgress(1);
    a.out(); // 满程 out → 1000ms（非 100ms）
    step(a, 30); // 500ms 不到半程多
    expect(a.progress).toBeGreaterThan(0.2); // 1000ms 满程 500ms 处 ≈ 0.5（EMPHASIZED_ACCELERATE 缺省=LINEAR? 用默认插值）
    step(a, 40);
    expect(a.progress).toBe(0);
  });
});

describe('v103-D · 边界 onStop 单次回调（Launcher3 onStop 同义）', () => {
  it('D1 到边界触发一次；中途打断不触发；新一段重新武装', () => {
    const calls = [];
    const a = new InterruptibleInOutAnimator({ durationMs: 100, onStop: (b, x) => calls.push([b, x]) });
    a.in();
    step(a, 12);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('in');
    expect(calls[0][1]).toBe(1);
    // 已 settle 后继续 update：不重复回调
    step(a, 12);
    expect(calls).toHaveLength(1);
    // 中途打断（out 后立即 in）：第一段不到边界零回调
    a.out();
    step(a, 2);
    a.in();
    step(a, 12);
    expect(calls).toHaveLength(2); // 只有第二段到 in 边界
    expect(calls[1][0]).toBe('in');
  });

  it('D2 中途反向到对面边界：回调方向 = 实际抵达边界', () => {
    const calls = [];
    const a = new InterruptibleInOutAnimator({ durationMs: 100, onStop: (b) => calls.push(b) });
    a.in();
    step(a, 6); // 中途 ≈ 0.5
    a.out();
    step(a, 20);
    expect(calls).toEqual(['out']);
  });
});

describe('v103-E · context-menu.js 接线锚（fade 通道消费）', () => {
  it('E1 import 在位 + fade 通道 IIOAnimator 消费（in/out 具名入口）', () => {
    const src = stripComments(CM);
    expect(src).toContain("import { IIOAnimator } from './aosp/interruptible-in-out-animator.js';");
    expect(src).toContain('if (mode === \'open\') fade.in(); else fade.out();');
    expect(src).toContain('prev.fade instanceof IIOAnimator');
  });

  it('E2 开/关不对称配置注入（in=openFade/out=close + 双插值器）', () => {
    const src = stripComments(CM);
    expect(src).toContain('durationMs: U_TIMINGS.openFadeDuration');
    expect(src).toContain('outDurationMs: U_TIMINGS.closeDuration');
    expect(src).toContain('outInterpolator: EMPHASIZED_ACCELERATE');
  });

  it('E3 progress 消费 + 驱动面零改（update/isSettled 同签名）+ startMenuAnim 名保留（v864 锚）', () => {
    const src = stripComments(CM);
    expect(src).toContain('menuAnim.fade.progress.toFixed(3)');
    expect(src).toContain('menuAnim.fade.update(dt)');
    expect(src).toContain('menuAnim.fade.isSettled()');
    expect(src).toContain("startMenuAnim('open')");
    expect(src).toContain("startMenuAnim('close')");
  });

  it('E4 不对称时序真源一致（openFade 83 / close 233——U_TIMINGS 单源）', () => {
    expect(U_TIMINGS.openFadeDuration).toBe(83);
    expect(U_TIMINGS.closeDuration).toBe(233);
  });
});


