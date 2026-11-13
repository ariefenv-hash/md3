// ==================== shade-blur.test.js — #155 下拉 blur 半径跟手渐进 v11.20 ====================
//
// 覆盖（R71 窗加餐，#144 后半段补齐）：
//   · aosp/shade-interpolation.js 新增 getShadeBlurRadius/getShadeBlurStrength：线性 0→20px
//     （BlurUtils.setBlurRadius 拖拽连续驱动同构；议题建议 1 主曲线，验收一「50% ≈ 一半」逐字）
//   · desktop-blur.js panel 通道单源化：√ 预畸 + 合成 p² → 线性观感（f=0.5 → opacity 0.5）；
//     app 通道 p² 既有曲线零变化；max 合成语义保持（app 全屏恒全糊）
//   · 性能裁决锚：underlay frost 与 motion 互斥保留（#86-H2：bf 逐帧重滤波 33-50ms/帧），
//     拖拽中渐进观感由 canvas 预烘焙层承担（纯合成器 opacity，零重滤波）
//   · 回归锚：#144 ShadeInterpolation 三函数零触碰 / v7.81 双通道架构零变化

import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  constrainedMap, interpolateEaseInOut,
  getNotificationScrimAlpha, getContentAlpha,
  SHADE_BLUR_MAX_PX, getShadeBlurRadius, getShadeBlurStrength,
} from '../ios-desktop/js/aosp/shade-interpolation.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');
const INTERP = src('ios-desktop/js/aosp/shade-interpolation.js');
const BLUR = src('ios-desktop/js/desktop-blur.js');
const GESTURE = src('ios-desktop/js/pull-down-gesture.js');

describe('v11.20 #155 getShadeBlurRadius：线性 0→20px（BlurUtils.setBlurRadius 同构）', () => {
  test('验收一「拖拽至 50% 时已呈现约一半模糊强度」：0.5 → 10px', () => {
    expect(SHADE_BLUR_MAX_PX).toBe(20); // .pp-blur-underlay v7.32 实证值
    expect(getShadeBlurRadius(0)).toBe(0);
    expect(getShadeBlurRadius(0.25)).toBeCloseTo(5, 6);
    expect(getShadeBlurRadius(0.5)).toBeCloseTo(10, 6);
    expect(getShadeBlurRadius(0.75)).toBeCloseTo(15, 6);
    expect(getShadeBlurRadius(1)).toBeCloseTo(20, 6);
  });
  test('越界钳位（constrainedMap 语义）+ 自定义 maxPx + 归一化强度', () => {
    expect(getShadeBlurRadius(-0.3)).toBe(0);
    expect(getShadeBlurRadius(1.4)).toBe(20);
    expect(getShadeBlurRadius(0.5, 12)).toBeCloseTo(6, 6);
    expect(getShadeBlurStrength(0.5)).toBeCloseTo(0.5, 6);
    expect(getShadeBlurStrength(0)).toBe(0);
    expect(getShadeBlurStrength(1)).toBe(1);
  });
  test('曲线与 #144 scrim α 解耦（同源 fraction 独立映射，无双曲线打架）', () => {
    // scrim α 0→0.5 区间：拉程 50% 时 α 已≈1（遮罩先全黑）
    expect(getNotificationScrimAlpha(0.5)).toBeCloseTo(1, 3);
    // blur 半径 0→1 全程线性：拉程 50% 时约一半（模糊跟手不抢跑不滞后）
    expect(getShadeBlurStrength(0.5)).toBeCloseTo(0.5, 6);
  });
});

describe('v11.20 #155 desktop-blur panel 通道：√ 预畸 + 合成 p² → 线性观感（happy-dom 实测）', () => {
  let engine;
  beforeEach(async () => {
    if (!document.getElementById('desktop')) {
      const host = document.createElement('div');
      host.id = 'desktop';
      document.body.appendChild(host);
    }
    engine = await import(join(ROOT, 'ios-desktop/js/desktop-blur.js'));
    engine.hideDesktopBlur();
    engine.setWallpaperBlurEnabled(true);
    engine.setPanelBlurProgress(0);
  });
  test('面板通道：f=0.5 → opacity 0.5（50% 拉程 ≈ 一半强度，v781 二次曲线 0.25 退役）', () => {
    engine.setPanelBlurProgress(0.5);
    const canvas = document.getElementById('desktopBlurCanvas');
    expect(canvas.classList.contains('active')).toBe(true);
    expect(parseFloat(canvas.style.opacity)).toBeCloseTo(0.5, 3);
    engine.setPanelBlurProgress(1);
    expect(parseFloat(canvas.style.opacity)).toBe(1);
    engine.setPanelBlurProgress(0);
    expect(canvas.style.opacity).toBe('');
  });
  test('app 通道 p² 既有曲线零变化（setDesktopBlurProgress 0.5 → 0.25）', () => {
    engine.setDesktopBlurProgress(0.5);
    const canvas = document.getElementById('desktopBlurCanvas');
    expect(parseFloat(canvas.style.opacity)).toBeCloseTo(0.25, 3);
  });
  test('max 合成语义保持：app 全屏（1）时拉开面板恒全糊（v7.81 语义不退）', () => {
    engine.setDesktopBlurProgress(1);
    engine.setPanelBlurProgress(0.3);
    const canvas = document.getElementById('desktopBlurCanvas');
    expect(parseFloat(canvas.style.opacity)).toBe(1);
  });
  test('单源接线锚：setPanelBlurProgress 内消费 getShadeBlurStrength + √ 预畸在录', () => {
    expect(BLUR).toContain("import { getShadeBlurStrength } from './aosp/shade-interpolation.js'");
    expect(BLUR).toContain('getShadeBlurStrength(Math.max(0, Math.min(1, p)))');
    expect(BLUR).toContain('Math.sqrt(f)');
  });
});

describe('v11.20 #155 性能裁决与回归锚', () => {
  test('underlay frost/motion 互斥保留（#86-H2：bf 逐帧重滤波 33-50ms/帧，#155 裁决在录）', () => {
    expect(GESTURE).toContain('#86-H2 隔离实验证实 bf 层逐帧重滤波');
    expect(GESTURE).toContain('v11.20 #155 裁决在录');
    expect(GESTURE).toContain('setUnderlayBlur(on)');
    // 拖拽帧链路不变：applyPanelVisual 每帧 setPanelBlurProgress（单源 fraction）
    expect(GESTURE).toContain('setPanelBlurProgress(v.overlayOpacity)');
  });
  test('#144 ShadeInterpolation 三函数零触碰（源码锚）', () => {
    expect(INTERP).toContain('export function getNotificationScrimAlpha(fraction)');
    expect(INTERP).toContain('export function getContentAlpha(fraction)');
    expect(INTERP).toContain('export function interpolateEaseInOut(fraction)');
    expect(INTERP).toContain('3.14159'); // 源码 Float 字面量直译保留
    // 纯逻辑纪律：无 DOM 副作用
    expect(INTERP).not.toMatch(/document\./);
  });
  test('v7.81 双通道架构零变化（canvas 预烘焙 + tween 补间 + 全局开关）', () => {
    expect(BLUR).toContain('function combinedProgress() { return Math.max(lastProgress, panelProgress); }');
    expect(BLUR).toContain('blurCanvas.style.opacity = (p * p).toFixed(4);'); // 合成层平方公式在位
    expect(BLUR).toContain('export function tweenPanelBlurProgress(target, durMs = 260)');
    expect(BLUR).toContain("WALLPAPER_BLUR_STORAGE_KEY = 'ios-desktop:wallpaper-blur'");
  });
});
