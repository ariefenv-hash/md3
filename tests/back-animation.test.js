// ==================== v146 测试 — 预测性返回容器变换（BackAnimationSpec 全家桶 + ST1 接线） ====================
//
// #146 [移植][深水]：md3 预测性返回只有 pill（back-pill.js，#42/#140-143），缺容器变换。
// 本轮一期+二期（#146 分期表）：
//   一期 BackTransformation.kt → js/aosp/back-animation.js（BackTransformation 类 + 两枚举 +
//       applyTo finite 守卫 + pivot 语义）；
//   二期 BackAnimationSpec.kt → createFloatingSurfaceAnimationSpec（公式逐字）+
//       BackAnimationSpecForSysUi 四 ST 预设 + BottomsheetBackAnimationSpec（AT3）+
//       gestures.js 根页面边缘返回接线（自创曲线退役）。
// 权威锚：docs/reference/frameworks-base/SystemUI/animation/back/ 六件快照 +
//   core BackGestureInterpolator.java（PathInterpolator(0.1,0.1,0,1)）+
//   wm.shell Interpolators.java L106（BACK_GESTURE = new BackGestureInterpolator()）双源同值 +
//   OnBackAnimationCallbackExtension.kt L54 progressY = (touchY − initialY)/screenH（带符号）。
// 离线精算（非镜像实现）：cubic-bezier(0.1,0.1,0,1) 牛顿解 —— BG(0.25)=0.683819 /
//   BG(0.5)=0.894886 / BG(0.75)=0.978299；ST1@W1280,H800：maxTX=120 / maxTY=72，
//   progress 0.5 → translateX=107.3863 / scale=0.821023。
//
// 断言面：A. BackTransformation 逐字  B. BACK_GESTURE/LINEAR 曲线  C. floating spec 数学
//         D. SysUI 四 ST 预设 + AT3 bottomsheet  E. gestures.js 接线（自创曲线清零）
//         F. 范围纪律（子页卡片/上滑关闭不受扰）  G. 版本真源 9.26.0

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  BackTransformation,
  SCALE_PIVOT_POSITION,
  BACK_GESTURE,
  LINEAR,
  createFloatingSurfaceAnimationSpec,
  dismissAppForSysUi,
  crossTaskForSysUi,
  innerAreaDismissForSysUi,
  floatingSystemSurfacesForSysUi,
  createBottomsheetAnimationSpec,
  bottomSheetForSysUi,
  MAX_SCALE_DELTA_DP,
} from '../ios-desktop/js/aosp/back-animation.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(path.join(here, '..', p), 'utf-8');

const GESTURES = read('ios-desktop/js/gestures.js');
const MODULE_SRC = read('ios-desktop/js/aosp/back-animation.js');
const PKG = JSON.parse(read('package.json'));

const closeTo = (actual, expected, eps = 1e-3) =>
  Math.abs(actual - expected) <= eps;

// 通用 displayMetrics（W1280 H800 density1 —— 离线精算基准屏）
const DM1280 = () => ({ widthPixels: 1280, heightPixels: 800, density: 1 });

describe('v9.21 #146 一期：BackTransformation.kt 逐字（NaN 默认 + finite 守卫 + pivot）', () => {
  it('A1 data class 默认值：translateX/Y/scale = NaN、scalePivotPosition = null（L25-30）', () => {
    const t = new BackTransformation();
    expect(Number.isNaN(t.translateX)).toBe(true);
    expect(Number.isNaN(t.translateY)).toBe(true);
    expect(Number.isNaN(t.scale)).toBe(true);
    expect(t.scalePivotPosition).toBe(null);
  });

  it('A2 applyTo finite 守卫：NaN 维不写 style（L56-58 isFinite 分支）', () => {
    const t = new BackTransformation();
    const view = { style: {} };
    t.applyTo(view);
    expect(view.style.translate).toBeUndefined();
    expect(view.style.scale).toBeUndefined();
    expect(view.style.transformOrigin).toBeUndefined();
  });

  it('A3 applyTo 写入：translate/scale 落 style，先 pivot 后 scale（L55-63 顺序）', () => {
    const t = new BackTransformation();
    t.translateX = 120;
    t.translateY = 3.6;
    t.scale = 0.8;
    t.scalePivotPosition = SCALE_PIVOT_POSITION.BOTTOM_CENTER;
    const view = { style: {} };
    t.applyTo(view);
    expect(view.style.translate).toBe('120px 3.6px');
    expect(view.style.transformOrigin).toBe('50% 100%'); // BOTTOM_CENTER：pivotY = h（L47）
    expect(view.style.scale).toBe('0.8');
  });

  it('A4 CENTER pivot：50% 50%（pivotX=w/2、pivotY=h/2，L41-42）', () => {
    const t = new BackTransformation();
    t.scale = 0.9;
    t.scalePivotPosition = SCALE_PIVOT_POSITION.CENTER;
    const view = { style: {} };
    t.applyTo(view);
    expect(view.style.transformOrigin).toBe('50% 50%');
    expect(view.style.scale).toBe('0.9');
  });

  it('A5 单轴 finite：translateY 缺席时 translate 串补 0（web 单属性合并语义）', () => {
    const t = new BackTransformation();
    t.translateX = 56;
    const view = { style: {} };
    t.applyTo(view);
    expect(view.style.translate).toBe('56px 0px');
  });
});

describe('v9.21 #146 二期：BACK_GESTURE / LINEAR 权威曲线', () => {
  it('B1 BACK_GESTURE = cubic-bezier(0.1,0.1,0,1)，离线采样命中（BG(0.25)=0.683819）', () => {
    expect(BACK_GESTURE(0)).toBe(0);
    expect(closeTo(BACK_GESTURE(0.25), 0.683819, 1e-4)).toBe(true);
    expect(closeTo(BACK_GESTURE(0.5), 0.894886, 1e-4)).toBe(true);
    expect(closeTo(BACK_GESTURE(0.75), 0.978299, 1e-4)).toBe(true);
    expect(BACK_GESTURE(1)).toBe(1);
  });

  it('B2 强减速语义：x=0.25 已走完 68%（「开头极轻微加速随后减速」，真机预测返回手感）', () => {
    expect(BACK_GESTURE(0.25)).toBeGreaterThan(0.6);
    expect(BACK_GESTURE(0.5)).toBeGreaterThan(0.85);
  });

  it('B3 BACK_GESTURE 钳位：x 越界 [0,1] 收边（PathInterpolator 同语义）', () => {
    expect(BACK_GESTURE(-0.5)).toBe(0);
    expect(BACK_GESTURE(1.5)).toBe(1);
  });

  it('B4 LINEAR 恒等透传不钳位（负向 progressY 必需；LinearInterpolator.getInterpolation=t）', () => {
    expect(LINEAR(0.42)).toBe(0.42);
    expect(LINEAR(-0.1)).toBe(-0.1);
    expect(LINEAR(1.3)).toBe(1.3);
  });
});

describe('v9.21 #146 二期：createFloatingSurfaceAnimationSpec 公式逐字（ST1 离线精算）', () => {
  it('C1 ST1@W1280 边界：maxTX = (1280−1280·0.8)/2−8 = 120、maxTY = (800−640)/2−8 = 72', () => {
    const spec = dismissAppForSysUi(DM1280);
    const t = new BackTransformation();
    spec.getBackTransformation({ progress: 1, swipeEdge: 'EDGE_LEFT' }, 0, t);
    expect(t.translateX).toBe(120);
    expect(t.scale).toBeCloseTo(0.8, 10);
    // translateX=120 + 半宽·scale → 右缘距屏右 8px（margin 语义自洽性：1280−(640+120+512)）
    expect(1280 - (1280 / 2 + 120 + (1280 * 0.8) / 2)).toBe(8);
  });

  it('C2 progress=0.5 EDGE_LEFT：translateX=107.3863 / scale=0.821023（离线 BG(0.5)=0.894886）', () => {
    const spec = dismissAppForSysUi(DM1280);
    const t = new BackTransformation();
    spec.getBackTransformation({ progress: 0.5, swipeEdge: 'EDGE_LEFT' }, 0.05, t);
    expect(closeTo(t.translateX, 107.3863, 1e-3)).toBe(true);
    expect(closeTo(t.scale, 0.821023, 1e-5)).toBe(true);
  });

  it('C3 translateY = LINEAR(progressY)·maxTY 带符号跟手（Extension L54 progressY 直通）', () => {
    const spec = dismissAppForSysUi(DM1280);
    const down = new BackTransformation();
    spec.getBackTransformation({ progress: 0.5, swipeEdge: 'EDGE_LEFT' }, 0.05, down);
    expect(closeTo(down.translateY, 0.05 * 72, 1e-9)).toBe(true); // 3.6
    const up = new BackTransformation();
    spec.getBackTransformation({ progress: 0.5, swipeEdge: 'EDGE_LEFT' }, -0.1, up);
    expect(up.translateY).toBe(-7.2); // 负向透传（LINEAR 不钳位）
  });

  it('C4 方向：EDGE_LEFT → +x / EDGE_RIGHT → −x / 未知 edge → 0（L61-66 direction 三分支）', () => {
    const spec = dismissAppForSysUi(DM1280);
    const tl = new BackTransformation();
    spec.getBackTransformation({ progress: 1, swipeEdge: 'EDGE_LEFT' }, 0, tl);
    const tr = new BackTransformation();
    spec.getBackTransformation({ progress: 1, swipeEdge: 'EDGE_RIGHT' }, 0, tr);
    const tu = new BackTransformation();
    spec.getBackTransformation({ progress: 1, swipeEdge: 'EDGE_TOP' }, 0, tu);
    expect(tl.translateX).toBe(120);
    expect(tr.translateX).toBe(-120);
    expect(tu.translateX).toBe(0);
  });

  it('C5 自定义 easing 通道：translateYEasing 覆写生效（默认参数三入口可换）', () => {
    const spec = createFloatingSurfaceAnimationSpec({
      displayMetricsProvider: DM1280,
      maxMarginXdp: 8,
      maxMarginYdp: 8,
      minScale: 0.8,
      translateXEasing: (x) => x,
      scaleEasing: (x) => x,
    });
    const t = new BackTransformation();
    spec.getBackTransformation({ progress: 0.5, swipeEdge: 'EDGE_LEFT' }, 0, t);
    expect(closeTo(t.translateX, 60, 1e-9)).toBe(true); // 0.5·120
    expect(t.scale).toBeCloseTo(0.9, 10); // 1 − 0.5·0.2
  });

  it('C6 result 复用语义：同实例覆写（Kotlin「mutable for performance」）+ floating 不碰 pivot', () => {
    const spec = dismissAppForSysUi(DM1280);
    const t = new BackTransformation();
    const r1 = spec.getBackTransformation({ progress: 0.5, swipeEdge: 'EDGE_LEFT' }, 0, t);
    const r2 = spec.getBackTransformation({ progress: 1, swipeEdge: 'EDGE_RIGHT' }, 0, t);
    expect(r1).toBe(t);
    expect(r2).toBe(t);
    expect(t.translateX).toBe(-120); // 第二次覆写
    expect(t.scalePivotPosition).toBe(null); // floating spec 无 pivot 语义
  });
});

describe('v9.21 #146 二期：BackAnimationSpecForSysUi 四 ST 预设 + AT3 bottomsheet', () => {
  it('D1 ST1/ST2 = floating(8,8,0.8)：maxTX=120；ST3 = floating(0,0,0.9)：maxTX=64；ST4 = floating(8,8,0.9)：maxTX=56', () => {
    const t1 = new BackTransformation();
    dismissAppForSysUi(DM1280).getBackTransformation({ progress: 1, swipeEdge: 'EDGE_LEFT' }, 0, t1);
    const t2 = new BackTransformation();
    crossTaskForSysUi(DM1280).getBackTransformation({ progress: 1, swipeEdge: 'EDGE_LEFT' }, 0, t2);
    const t3 = new BackTransformation();
    innerAreaDismissForSysUi(DM1280).getBackTransformation({ progress: 1, swipeEdge: 'EDGE_LEFT' }, 0, t3);
    const t4 = new BackTransformation();
    floatingSystemSurfacesForSysUi(DM1280).getBackTransformation({ progress: 1, swipeEdge: 'EDGE_LEFT' }, 0, t4);
    expect(t1.translateX).toBe(120);
    expect(t2.translateX).toBe(120); // ST1/ST2 同参（语义位分立）
    expect(t1.scale).toBeCloseTo(0.8, 10);
    expect(t3.translateX).toBe(64); // (1280−128)/2 − 0
    expect(t3.scale).toBeCloseTo(0.9, 10);
    expect(t4.translateX).toBe(56); // (1280−128)/2 − 8
    expect(t4.scale).toBeCloseTo(0.9, 10);
  });

  it('D2 AT3 bottomsheet：minScale = 1−48/1280 = 0.9625，progress=1 → scale=0.9625', () => {
    expect(MAX_SCALE_DELTA_DP).toBe(48);
    const t = new BackTransformation();
    bottomSheetForSysUi(DM1280).getBackTransformation({ progress: 1, swipeEdge: 'EDGE_LEFT' }, 0, t);
    expect(t.scale).toBeCloseTo(0.9625, 10);
  });

  it('D3 bottomsheet pivot = BOTTOM_CENTER（L39 逐字）；translateX/Y 保持 NaN（finite 守卫跳过）', () => {
    const t = new BackTransformation();
    createBottomsheetAnimationSpec({ displayMetricsProvider: DM1280 })
      .getBackTransformation({ progress: 0.5, swipeEdge: 'EDGE_RIGHT' }, 0, t);
    expect(t.scalePivotPosition).toBe(SCALE_PIVOT_POSITION.BOTTOM_CENTER);
    expect(Number.isNaN(t.translateX)).toBe(true);
    expect(Number.isNaN(t.translateY)).toBe(true);
    const view = { style: {} };
    t.applyTo(view);
    expect(view.style.transformOrigin).toBe('50% 100%');
    expect(view.style.translate).toBeUndefined();
    expect(view.style.scale).toBe(t.scale.toString());
  });

  it('D4 bottomsheet 半进度：scale = 1 − BG(0.5)·(48/1280)（离线 0.96643）', () => {
    const t = new BackTransformation();
    bottomSheetForSysUi(DM1280).getBackTransformation({ progress: 0.5, swipeEdge: 'EDGE_LEFT' }, 0, t);
    expect(closeTo(t.scale, 1 - 0.894886 * (48 / 1280), 1e-4)).toBe(true);
  });
});

describe('v9.21 #146 二期：gestures.js 接线（根页面边缘返回，自创曲线退役）', () => {
  it('E1 import + spec 实例化：dismissAppForSysUi + BackTransformation 顶部模块接入', () => {
    expect(GESTURES).toContain("import { BackTransformation, dismissAppForSysUi } from './aosp/back-animation.js';");
    expect(GESTURES).toContain('const backTr = new BackTransformation();');
    expect(GESTURES).toContain('const backSpec = dismissAppForSysUi(');
    expect(GESTURES).toContain('widthPixels: window.innerWidth');
  });

  it('E2 spec 消费：getBackTransformation 三参调用（backEvent/progressY/result）', () => {
    expect(GESTURES).toContain('backSpec.getBackTransformation(');
    expect(GESTURES).toContain('{ progress, swipeEdge: state.gestureType },');
    expect(GESTURES).toContain('progressY,');
  });

  it('E3 进度同相位：pill fullScreenProgress 同源公式（412dp 阈值 + 16dp 静态阈）', () => {
    expect(GESTURES).toContain('const backThr = Math.min(screenW, 412);');
    expect(GESTURES).toContain('const progress = clamp((xT - 16) / Math.max(backThr - 16, 1), 0, 1);');
  });

  it('E4 progressY 调用方权威公式（Extension L54 同构：dy/screenH 带符号）', () => {
    expect(GESTURES).toContain('const progressY = (y - state.drag.startY) / screenH;');
  });

  it('E5 自创曲线清零：pullRatio·0.35 / 0.3 横移 / 0.15 纵移三系数不再出现在根页面分支', () => {
    expect(GESTURES).not.toContain('const pullRatio = clampedDx / (screenW * 0.5);');
    expect(GESTURES).not.toContain('(x - state.drag.startX) * 0.3;');
    expect(GESTURES).not.toContain('(y - state.drag.startY) * 0.15;');
    expect(GESTURES).not.toContain('clamp(1 - pullRatio * 0.35, 0.65, 1.0)');
  });

  it('E6 spec → 管线桥接：scale 反解 p 通道（iconScaleX 锚定）+ translate 写 cx/cy + 弹簧同源', () => {
    expect(GESTURES).toContain('const p = clamp((backTr.scale - iconScaleX) / (1 - iconScaleX), 0, 1.06);');
    expect(GESTURES).toContain('const targetX = screenW / 2 + backTr.translateX;');
    expect(GESTURES).toContain('const targetY = screenH / 2 + backTr.translateY;');
    expect(GESTURES).toContain('scheduleGestureRender(p, targetX, targetY, { syncRadial: true });');
  });

  it('F1 范围纪律：子页卡片视觉语言（v7.75 用户裁决）不受扰 —— 0.85 跟手映射原样', () => {
    expect(GESTURES).toContain('clamp(state.drag.startSubP - clamp(clampedDx / (screenW * 0.85), 0, 1), 0, 1)');
  });

  it('F2 范围纪律：pill 跟手通道原样（容器变换不抢 pill 的 progress 调用）', () => {
    expect(GESTURES).toContain('backPill.progress(Math.max(0, pillDx), y - state.drag.startY);');
    expect(GESTURES).toContain('backPill.commit();');
    expect(GESTURES).toContain('backPill.cancel();');
  });

  it('F3 权威留痕：模块头注双源验证 + Extension progressY 公式在册（#146 交付可追溯）', () => {
    expect(MODULE_SRC).toContain('BackGestureInterpolator');
    expect(MODULE_SRC).toContain('PathInterpolator(0.1, 0.1, 0, 1)');
    expect(MODULE_SRC).toContain('OnBackAnimationCallbackExtension.kt L54');
    expect(MODULE_SRC).toContain('createFloatingSurfaceAnimationSpec（BackAnimationSpec.kt L39-79 逐字移植）');
  });

  it('G1 版本真源 9.26.0（v150 同口径）', () => {
    expect(PKG.version).toBe('11.24.0');
  });

  it('G2 四期留痕：FlingOnBackAnimationCallback 不在本轮范围（分期表明示，留下一棒）', () => {
    expect(MODULE_SRC).toContain('不在本轮范围');
    expect(MODULE_SRC).not.toContain('FlingAnimation');
  });
});
