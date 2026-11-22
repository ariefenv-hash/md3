// ==================== transition-blur.test.js — v11.52 开合动画分层高斯模糊时序 ====================
// 验收：模糊强度与窗口可见期对齐（打开早饱和 / 关闭晚退场），且调用端 sqrt 预畸
// 抵消合成层 opacity=p²；回退路径全屏 filter 写入量化，杜绝逐帧重滤波。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { transitionBlurStrength } from '../ios-desktop/js/app-window-parallel.js';

const ROOT = join(process.cwd());
const PARALLEL = () => readFileSync(join(ROOT, 'ios-desktop/js/app-window-parallel.js'), 'utf-8');
const WINDOW = () => readFileSync(join(ROOT, 'ios-desktop/js/app-window.js'), 'utf-8');

describe('v11.52 分层高斯模糊时序（纯函数）', () => {
  it('端点保真：两相位 0→0 / 1→1', () => {
    expect(transitionBlurStrength(0, false)).toBe(0);
    expect(transitionBlurStrength(1, false)).toBe(1);
    expect(transitionBlurStrength(0, true)).toBe(0);
    expect(transitionBlurStrength(1, true)).toBe(1);
    expect(transitionBlurStrength(-1, false)).toBe(0);
    expect(transitionBlurStrength(2, true)).toBe(1);
  });

  it('两相位全程单调不降', () => {
    for (const closing of [false, true]) {
      for (let i = 1; i <= 20; i++) {
        expect(transitionBlurStrength(i / 20, closing)).toBeGreaterThanOrEqual(transitionBlurStrength((i - 1) / 20, closing));
      }
    }
  });

  it('打开早饱和：p=0.2 强度 > 旧 p² 曲线（0.04）一个数量级', () => {
    const v = transitionBlurStrength(0.2, false);
    expect(v).toBeGreaterThan(0.2 * 0.2 * 5);
    expect(v).toBeGreaterThan(0.4);
    expect(transitionBlurStrength(0.42, false)).toBeCloseTo(1, 5);
  });

  it('关闭晚退场：p=0.3 仍保有景深（旧 p² 仅 0.09）', () => {
    const v = transitionBlurStrength(0.3, true);
    expect(v).toBeGreaterThan(0.09 * 2);
    expect(v).toBeGreaterThan(0.2);
    expect(transitionBlurStrength(0.3, false)).toBeGreaterThan(transitionBlurStrength(0.3, true));
  });

  it('sqrt 预畸接线：合成层 opacity=p² 时最终 opacity 恰为 strength', () => {
    for (const p of [0.1, 0.3, 0.6, 0.9]) {
      for (const closing of [false, true]) {
        const strength = transitionBlurStrength(p, closing);
        expect(Math.pow(Math.sqrt(strength), 2)).toBeCloseTo(strength, 10);
      }
    }
    const src = PARALLEL();
    expect(src).toContain('setDesktopBlurProgress(Math.sqrt(blurStrength))');
    expect(src).toContain('const closing = !!state.isClosing');
    expect(src).toContain('const blurStrength = transitionBlurStrength(p, closing)');
  });
});

describe('v11.52 流畅性接线（合成侧零逐帧重滤波 / 零整层重合成）', () => {
  it('回退路径 blur 半径量化 1px 档，档位不变不重写全屏 filter', () => {
    const src = PARALLEL();
    expect(src).toContain('const blurPxQ = Math.round(12 * blurStrength)');
    expect(src).toContain('if (blurPxQ !== _lastFallbackBlurPx)');
    expect(src).not.toContain('blur(12 * (p * p)');
  });

  it('桌面整层 transform 量化 0.005 档', () => {
    const src = PARALLEL();
    expect(src).toContain('Math.round(desktopScale * 200) / 200');
    expect(src).toContain('if (scaleQ !== _lastDesktopScaleQ)');
  });

  it('窗口展开期保持不透明：层次由背景虚化 + 启动屏交叉淡入承载，不叠全窗口 opacity 合成层', () => {
    const src = WINDOW();
    expect(src).toContain("dom.appWindow.style.opacity = '1'");
    expect(src).toContain('内容交叉渐显由启动屏');
    expect(src).not.toContain('const openFade');
  });
});
