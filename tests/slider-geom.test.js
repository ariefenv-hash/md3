// ==================== tests/slider-geom.test.js — 双段轨道 clip 几何（v7.43） ====================
//
// 守护 v7.43「手柄移动时轨道两端圆角退化直至消失」修复：
//   旧实现全宽基数 + scaleX 表达激活/未激活段，transform 横向缩放把 12px 半圆
//   端帽压成椭圆（水平半径 = 12×scaleX），段越短越扁，行程端点处圆角完全消失。
//   新实现 clip-path: inset(round) 裁剪 —— 本文件锁定其几何不变量：
//   · 可见段宽精确等于 x-gap / w-(x+gap)（间隙对称、无累积误差）
//   · 端点退化：x=0 激活段完全隐藏、x=w 未激活段完全隐藏（inset 钳制到 w）
//   · 圆角半径恒为 12px/6px 且与段长无关（防回归 scaleX 的核心断言）
//   · 任意采样点无 NaN/Infinity，输出恒为合法 CSS inset(round) 形状

import { describe, it, expect } from 'vitest';
import { sliderClipPaths, M3_SLIDER_GAP, FILL_RADII, LINE_RADII } from '../ios-desktop/js/slider-geom.js';

const parseRightInset = (clip) => parseFloat(clip.match(/inset\(0 ([\d.]+)px 0 0 round/)[1]);
const parseLeftInset = (clip) => parseFloat(clip.match(/inset\(0 0 0 ([\d.]+)px round/)[1]);

describe('sliderClipPaths — 中段常规位置', () => {
  it('w=600, x=300：两段裁剪边各留 10px 间隙，几何精确', () => {
    const { fill, line } = sliderClipPaths(600, 300);
    expect(parseRightInset(fill)).toBe(310); // 600-(300-10) → 激活段可见 [0,290]
    expect(parseLeftInset(line)).toBe(310);  // 300+10 → 未激活段可见 [310,600]
    expect(fill).toBe('inset(0 310.0px 0 0 round 12px 6px 6px 12px)');
    expect(line).toBe('inset(0 0 0 310.0px round 6px 12px 12px 6px)');
  });

  it('可见段宽 = x-gap 与 w-(x+gap)（间隙数学恒等式；渲染边容差 ≤0.1px 量化）', () => {
    for (let i = 0; i <= 20; i++) {
      const w = 373; // 非整除宽度，暴露舍入误差
      const x = (i / 20) * w;
      const { fill, line } = sliderClipPaths(w, x);
      const fillVisible = w - parseRightInset(fill);
      const lineVisible = w - parseLeftInset(line);
      // 边缘坐标经 toFixed(1) 量化，与真值误差必 ≤0.05px（留 0.01 余量）
      expect(Math.abs(fillVisible - Math.max(0, x - M3_SLIDER_GAP))).toBeLessThanOrEqual(0.06);
      expect(Math.abs(lineVisible - Math.max(0, w - x - M3_SLIDER_GAP))).toBeLessThanOrEqual(0.06);
    }
  });
});

describe('sliderClipPaths — 行程端点退化', () => {
  it('x=0：激活段完全隐藏（右 inset 钳到 w → 可见宽 0），未激活段从 gap 起', () => {
    const { fill, line } = sliderClipPaths(600, 0);
    expect(parseRightInset(fill)).toBe(600);
    expect(parseLeftInset(line)).toBe(M3_SLIDER_GAP);
  });

  it('x=w：未激活段完全隐藏（左 inset 钳到 w），激活段到 w-gap', () => {
    const { fill, line } = sliderClipPaths(600, 600);
    expect(parseLeftInset(line)).toBe(600);
    expect(parseRightInset(fill)).toBe(M3_SLIDER_GAP);
  });

  it('x 越界（<0 / >w）钳制不破形：负 x 整轨未激活（line 从 0 起），超 w 整轨激活', () => {
    const a = sliderClipPaths(600, -50);
    const b = sliderClipPaths(600, 650);
    expect(parseRightInset(a.fill)).toBe(600);   // fill 隐藏
    expect(parseLeftInset(a.line)).toBe(0);      // line 从 0 起（调用方已先行钳 x∈[0,w]，此处仅验函数自身不产生负 inset/NaN）
    expect(parseLeftInset(b.line)).toBe(600);    // line 隐藏
    expect(parseRightInset(b.fill)).toBe(0);     // x>w → 右 inset 钳 0 → 整轨激活（同语义自然外推）
  });
});

describe('sliderClipPaths — 圆角与段长无关（防 scaleX 回归核心断言）', () => {
  it('任意位置两段都携带完整 round 12px/6px 半径（半圆端帽不随段长退化）', () => {
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * 480;
      const { fill, line } = sliderClipPaths(480, x);
      expect(fill).toContain('round 12px 6px 6px 12px');
      expect(line).toContain('round 6px 12px 12px 6px');
    }
  });

  it('输出不含 scaleX / transform 残留（几何驱动载体锁定为 clip-path）', () => {
    const { fill, line } = sliderClipPaths(600, 300);
    expect(fill).not.toMatch(/scaleX|matrix/);
    expect(line).not.toMatch(/scaleX|matrix/);
    expect(fill.startsWith('inset(')).toBe(true);
    expect(line.startsWith('inset(')).toBe(true);
  });

  it('自定义 gap 生效（其他消费方可调间隙）', () => {
    const { fill, line } = sliderClipPaths(600, 300, 20);
    expect(parseRightInset(fill)).toBe(320);
    expect(parseLeftInset(line)).toBe(320);
  });

  it('半径常量与 v7.39 设计一致（外端 12px 半圆 / 近柄端 6px）', () => {
    expect(FILL_RADII).toBe('12px 6px 6px 12px');
    expect(LINE_RADII).toBe('6px 12px 12px 6px');
    expect(M3_SLIDER_GAP).toBe(10);
  });
});
