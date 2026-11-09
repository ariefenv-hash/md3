// ==================== v19-unlock-ripple.test.js — #19 解锁波纹涟漪过渡 v10.96 ====================
//
// 覆盖（R91 窗主作业，锁屏退场面波纹编排）：
//   · aosp/unlock-ripple.js 纯逻辑：A17_UNLOCK 权威常量真源（KeyguardUnlockAnimationController.kt
//     main 实拉逐值）/ RIPPLE_TIMING（NumPadAnimator.java L63-66 实拉）/ WAVE 自创常数
//     标注存在（A12 RippleShader 已于 main 移除，search total_count=0 实证）
//   · 几何：rippleMaxRadius 四角上界（中心源/底部轴点源）/ easeOutQuart、easeOutQuad
//     端点与单调性 / wavefrontRadius 线性映射
//   · 退场：contentRetireProgress 波前三相（未达 0 / 羽化带线性 / 扫过 1）/
//     contentRetireTransform 三联动端值与 blur 错相起坡
//   · surface-behind：p=0 恒等 A17 起始值（0.95/0.05）/ p=1 精确归位 / resolveRippleOrigin
//     触点优先、缺省回 A17 轴点 (w/2, h*0.66)
//   · 状态机七则：begin 起态 / sample 线性推进 / p>=1 自动 done 回 idle / cancel 任意态 /
//     重入 begin 顶替零残留 / idle 采样零值 / 非法 begin 拒绝
//   · 接线锚（剥注释扫描，R77 同款防字面误伤）：import / 起波序列 / 逐帧推进 /
//     三清理路径（completeUnlock/lockNow/unlockAndOpen/instantUnlock）/ reduced-motion 跳过
//   · AOSP 行号锚（防回退）：KeyguardUnlockAnimationController.kt L70/76/83/92/100/108/145
//     + NumPadAnimator.java L63-66（库头注释在录）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  A17_UNLOCK,
  RIPPLE_TIMING,
  WAVE,
  clamp01,
  easeOutQuart,
  easeOutQuad,
  rippleMaxRadius,
  wavefrontRadius,
  contentRetireProgress,
  contentRetireTransform,
  surfaceBehindTransform,
  resolveRippleOrigin,
  createUnlockRippleMachine,
} from '../ios-desktop/js/aosp/unlock-ripple.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', p);
/** 剥注释扫描（防注释字面误伤，v108 同款） */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const LS = stripComments(readFileSync(R('ios-desktop/js/lock-screen.js'), 'utf8'));
const LIB_SRC = readFileSync(R('ios-desktop/js/aosp/unlock-ripple.js'), 'utf8');
const CSS_SRC = readFileSync(R('ios-desktop/css/lock-screen.css'), 'utf8');

describe('v19-A · A17 权威常量真源（KeyguardUnlockAnimationController.kt main 实拉）', () => {
  it('A1 surface-behind 三值（L70/76/83）', () => {
    expect(A17_UNLOCK.SURFACE_BEHIND_START_SCALE_FACTOR).toBe(0.95);
    expect(A17_UNLOCK.SURFACE_BEHIND_START_TRANSLATION_Y).toBe(0.05);
    expect(A17_UNLOCK.SURFACE_BEHIND_SCALE_PIVOT_Y).toBe(0.66);
  });
  it('A2 dismiss 阈值两值（L92/100）', () => {
    expect(A17_UNLOCK.DISMISS_AMOUNT_SHOW_SURFACE_THRESHOLD).toBe(0.15);
    expect(A17_UNLOCK.DISMISS_AMOUNT_EXIT_KEYGUARD_THRESHOLD).toBe(0.3);
  });
  it('A3 canned unlock 时长族（L107/108/114/115/124/138/145）', () => {
    expect(A17_UNLOCK.UNLOCK_ANIMATION_DURATION_MS).toBe(300);
    expect(A17_UNLOCK.LEGACY_UNLOCK_ANIMATION_DURATION_MS).toBe(200);
    expect(A17_UNLOCK.LOCK_WALLPAPER_FADE_OUT_DURATION).toBe(150);
    expect(A17_UNLOCK.LOCK_WALLPAPER_FADE_OUT_START_DELAY).toBe(150);
    expect(A17_UNLOCK.LAUNCHER_ICONS_ANIMATION_DURATION_MS).toBe(633);
    expect(A17_UNLOCK.SURFACE_BEHIND_SWIPE_FADE_DURATION_MS).toBe(175);
    expect(A17_UNLOCK.UNLOCK_ANIMATION_SURFACE_BEHIND_START_DELAY_MS).toBe(67);
  });
  it('A4 NumPadAnimator 涟漪时序三拍（L63/65/66 实拉）', () => {
    expect(RIPPLE_TIMING.EXPAND_MS).toBe(100);
    expect(RIPPLE_TIMING.CONTRACT_DELAY_MS).toBe(33);
    expect(RIPPLE_TIMING.CONTRACT_MS).toBe(417);
  });
  it('A5 WAVE 自创常数全部在录（A12 shader 已移除，#170 自创标注惯例）', () => {
    expect(WAVE.DURATION_MS).toBe(300);
    expect(WAVE.FEATHER_PX).toBe(120);
    expect(WAVE.RETIRE_SCALE_MAX).toBe(1.08);
    expect(WAVE.RETIRE_BLUR_MAX_PX).toBe(6);
    expect(WAVE.RING_ALPHA_START).toBeGreaterThan(0);
    expect(WAVE.RING_ALPHA_START).toBeLessThan(1);
    expect(WAVE.RING_LAG).toBeGreaterThan(0);
    expect(WAVE.RING_LAG).toBeLessThan(0.5);
    // 库头注释必须含「已移除」实证记录 + 自创标注
    expect(LIB_SRC).toContain('已移除');
    expect(LIB_SRC).toContain('自创');
  });
  it('A6 常量容器冻结（防运行时篡改）', () => {
    expect(Object.isFrozen(A17_UNLOCK)).toBe(true);
    expect(Object.isFrozen(RIPPLE_TIMING)).toBe(true);
    expect(Object.isFrozen(WAVE)).toBe(true);
  });
});

describe('v19-B · 波前几何', () => {
  it('B1 rippleMaxRadius 中心源 = 到角距离', () => {
    expect(rippleMaxRadius(390, 844, 195, 422)).toBeCloseTo(Math.hypot(195, 422), 6);
  });
  it('B2 rippleMaxRadius 底部轴点源 (w/2, h*0.66) → 上角更远', () => {
    const r = rippleMaxRadius(390, 844, 195, 557.04);
    expect(r).toBeCloseTo(Math.hypot(195, 557.04), 6); // 源在下方 2/3，最远角 = 上角
  });
  it('B3 rippleMaxRadius 角点源 = 对角距离', () => {
    expect(rippleMaxRadius(390, 844, 0, 0)).toBeCloseTo(Math.hypot(390, 844), 6);
  });
  it('B4 easeOutQuart/easeOutQuad 端点与单调', () => {
    expect(easeOutQuart(0)).toBe(0);
    expect(easeOutQuart(1)).toBe(1);
    expect(easeOutQuad(0)).toBe(0);
    expect(easeOutQuad(1)).toBe(1);
    for (let p = 0.05; p <= 1; p += 0.05) {
      expect(easeOutQuart(p)).toBeGreaterThan(easeOutQuart(p - 0.05));
      expect(easeOutQuad(p)).toBeGreaterThan(easeOutQuad(p - 0.05));
    }
  });
  it('B5 easeOutQuart 前段快（p=0.25 已过半）', () => {
    expect(easeOutQuart(0.25)).toBeGreaterThan(0.5);
  });
  it('B6 wavefrontRadius 线性映射与越界钳制', () => {
    expect(wavefrontRadius(0, 900)).toBe(0);
    expect(wavefrontRadius(1, 900)).toBeCloseTo(900, 6);
    expect(wavefrontRadius(-0.5, 900)).toBe(0);
    expect(wavefrontRadius(2, 900)).toBeCloseTo(900, 6);
  });
  it('B7 clamp01 三相', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(2)).toBe(1);
  });
});

describe('v19-C · 内容退场三联动', () => {
  it('C1 progress 波前三相（未达 0 / 羽化带内线性 / 扫过 1）', () => {
    expect(contentRetireProgress(500, 300, 120)).toBe(0);      // 波前未达
    expect(contentRetireProgress(240, 300, 120)).toBeCloseTo(0.5, 6); // 带内中点
    expect(contentRetireProgress(100, 300, 120)).toBe(1);      // 已扫过
  });
  it('C2 progress feather<=0 防除零（回退 1px 带）', () => {
    expect(contentRetireProgress(299, 300, 0)).toBe(1);
  });
  it('C3 transform 端值：p=0 原位 / p=1 全退场（A5 常数同源）', () => {
    const t0 = contentRetireTransform(0);
    expect(t0.opacity).toBe(1);
    expect(t0.scale).toBe(1);
    expect(t0.blurPx).toBe(0);
    const t1 = contentRetireTransform(1);
    expect(t1.opacity).toBe(0);
    expect(t1.scale).toBe(WAVE.RETIRE_SCALE_MAX);
    expect(t1.blurPx).toBeCloseTo(WAVE.RETIRE_BLUR_MAX_PX, 6);
  });
  it('C4 blur 错相起坡（p<=0.15 零模糊，首帧无大面积滤镜）', () => {
    expect(contentRetireTransform(0.15).blurPx).toBe(0);
    expect(contentRetireTransform(0.16).blurPx).toBeGreaterThan(0);
    expect(contentRetireTransform(0.5).scale).toBeGreaterThan(1);
  });
  it('C5 退场单调性（opacity 降 / scale 升 / blur 升）', () => {
    let prev = contentRetireTransform(0);
    for (let p = 0.1; p <= 1.0001; p += 0.1) {
      const t = contentRetireTransform(Math.min(1, p));
      expect(t.opacity).toBeLessThan(prev.opacity);
      expect(t.scale).toBeGreaterThan(prev.scale);
      expect(t.blurPx).toBeGreaterThanOrEqual(prev.blurPx);
      prev = t;
    }
  });
});

describe('v19-D · surface-behind 弹回与波源解析', () => {
  it('D1 p=0 恒等 A17 起始值（scale 0.95 / tyRatio 0.05）', () => {
    const t = surfaceBehindTransform(0);
    expect(t.scale).toBeCloseTo(0.95, 6);
    expect(t.tyRatio).toBeCloseTo(0.05, 6);
  });
  it('D2 p=1 精确归位（scale 1 / tyRatio 0）', () => {
    const t = surfaceBehindTransform(1);
    expect(t.scale).toBeCloseTo(1, 6);
    expect(t.tyRatio).toBeCloseTo(0, 6);
  });
  it('D3 单调（scale 升 / tyRatio 降）与越界钳制', () => {
    let prev = surfaceBehindTransform(0);
    for (let p = 0.1; p <= 1.0001; p += 0.1) {
      const t = surfaceBehindTransform(Math.min(1, p));
      expect(t.scale).toBeGreaterThan(prev.scale);
      expect(t.tyRatio).toBeLessThan(prev.tyRatio);
      prev = t;
    }
    const over = surfaceBehindTransform(2);
    expect(over.scale).toBeCloseTo(1, 6);
    expect(over.tyRatio).toBeCloseTo(0, 6);
  });
  it('D4 resolveRippleOrigin：有触点用触点（A12 行为）', () => {
    const o = resolveRippleOrigin({ x: 88, y: 700 }, 390, 844);
    expect(o).toEqual({ x: 88, y: 700, source: 'pointer' });
  });
  it('D5 resolveRippleOrigin：无触点回 A17 轴点 (w/2, h*0.66)（L83 同源）', () => {
    const o = resolveRippleOrigin(null, 390, 844);
    expect(o.x).toBe(195);
    expect(o.y).toBeCloseTo(844 * 0.66, 6);
    expect(o.source).toBe('pivot');
  });
  it('D6 resolveRippleOrigin：非法触点（NaN/负值）同样回轴点', () => {
    expect(resolveRippleOrigin({ x: NaN, y: 100 }, 390, 844).source).toBe('pivot');
    expect(resolveRippleOrigin({ x: -5, y: 100 }, 390, 844).source).toBe('pivot');
    expect(resolveRippleOrigin(undefined, 390, 844).source).toBe('pivot');
  });
});

describe('v19-E · 状态机七则（中断安全可重入）', () => {
  const mk = () => createUnlockRippleMachine();
  it('E1 idle 初始 + 采样零值', () => {
    const m = mk();
    expect(m.state).toBe('idle');
    const s = m.sample(12345);
    expect(s.state).toBe('idle');
    expect(s.radius).toBe(0);
    expect(s.done).toBe(false);
  });
  it('E2 begin 起态：origin/maxRadius 记录（maxRadius=对角上界）', () => {
    const m = mk();
    expect(m.begin({ x: 195, y: 557 }, { w: 390, h: 844 }, 1000)).toBe(true);
    expect(m.state).toBe('expanding');
    expect(m.origin).toEqual({ x: 195, y: 557 });
    expect(m.maxRadius).toBeCloseTo(Math.hypot(195, 557), 6);
  });
  it('E3 sample 线性推进（p=(ts-t0)/300，radius easeOutQuart）', () => {
    const m = mk();
    m.begin({ x: 0, y: 0 }, { w: 400, h: 800 }, 1000);
    const s1 = m.sample(1150); // p=0.5
    expect(s1.p).toBeCloseTo(0.5, 6);
    expect(s1.radius).toBeCloseTo(wavefrontRadius(0.5, m.maxRadius), 6);
    expect(s1.alpha).toBeCloseTo(0.5, 6);
    expect(s1.state).toBe('expanding');
  });
  it('E4 p>=1 自动 done 回 idle（done 一次性，后续零值）', () => {
    const m = mk();
    m.begin({ x: 0, y: 0 }, { w: 400, h: 800 }, 1000);
    const s = m.sample(2000);
    expect(s.done).toBe(true);
    expect(m.state).toBe('idle');
    const s2 = m.sample(2500);
    expect(s2.state).toBe('idle');
    expect(s2.done).toBe(false);
    expect(s2.radius).toBe(0);
  });
  it('E5 cancel 任意态→idle（回锁安全通道）', () => {
    const m = mk();
    m.begin({ x: 0, y: 0 }, { w: 400, h: 800 }, 1000);
    expect(m.cancel()).toBe(true);
    expect(m.state).toBe('idle');
    expect(m.maxRadius).toBe(0);
    expect(m.cancel()).toBe(false); // idle 态 cancel 无事发生
  });
  it('E6 重入 begin 顶替零残留（150ms 级解锁→回锁→再解锁链）', () => {
    const m = mk();
    m.begin({ x: 10, y: 10 }, { w: 400, h: 800 }, 1000);
    const s1 = m.sample(1100);
    expect(s1.state).toBe('expanding');
    expect(m.origin).toEqual({ x: 10, y: 10 });
    m.begin({ x: 200, y: 300 }, { w: 400, h: 800 }, 2000); // 顶替
    expect(m.origin).toEqual({ x: 200, y: 300 });
    const s2 = m.sample(2050);
    expect(s2.p).toBeCloseTo(50 / WAVE.DURATION_MS, 6); // 新时间基，无旧动画残留
    expect(m.maxRadius).toBeCloseTo(Math.hypot(200, 500), 6);
  });
  it('E7 非法 begin 拒绝（缺 origin/viewport/ts）', () => {
    const m = mk();
    expect(m.begin(null, { w: 400, h: 800 }, 1000)).toBe(false);
    expect(m.begin({ x: 0, y: 0 }, null, 1000)).toBe(false);
    expect(m.begin({ x: 0, y: 0 }, { w: 400, h: 800 }, NaN)).toBe(false);
    expect(m.state).toBe('idle');
  });
});

describe('v19-F · 接线锚（lock-screen.js 剥注释扫描）', () => {
  it('F1 import 锚（纯逻辑库单一真源，接线零算法）', () => {
    expect(LS).toContain("from './aosp/unlock-ripple.js'");
    expect(LS).toContain('createUnlockRippleMachine()');
  });
  it('F2 起波序列锚（commit 分支：波纹 + surface-behind 同帧启动）', () => {
    expect(LS).toContain('beginUnlockRippleSequence(fromDy); // v10.96 #19：波纹起波 + surface-behind 弹回（A17 canned unlock 编排）');
    expect(LS).toContain('const started = rippleMachine.begin(origin, { w, h }, performance.now());');
    expect(LS).toContain('spawnUnlockRipple(origin, rippleMachine.maxRadius)');
  });
  it('F3 逐帧推进锚（独立 rAF 循环，弹簧完成不冻结波纹）', () => {
    expect(LS).toContain('rippleRafId = requestAnimationFrame(rippleFrameLoop); // v10.96 #19：独立推进（弹簧完成后波纹继续播满 300ms）');
    expect(LS).toContain('applyUnlockRippleFrame(rippleMachine.sample(now));');
    expect(LS).toContain('finishUnlockRippleNaturally(); // v10.96 #19：波纹独立于弹簧自然播完（层挂 body 锁屏隐藏后继续可见）');
  });
  it('F4 触点采集锚（pointerdown 波源候选）', () => {
    expect(LS).toContain('gestureDownPt = { x: e.clientX, y: e.clientY }');
  });
  it('F5 四清理路径锚（completeUnlock/lockNow/unlockAndOpen/instantUnlock 全覆盖）', () => {
    expect(LS.match(/teardownUnlockRipple\(\); \/\/ v10\.96 #19/g) || []).toHaveLength(4);
  });
  it('F6 reduced-motion 跳过锚（用户偏好优先）', () => {
    expect(LS).toContain('if (blocks.length && !prefersReducedMotion()) {');
    expect(LS).toContain('if (desktop && !prefersReducedMotion()) {');
  });
  it('F7 surface-behind WAAPI 锚（A17 权威常量消费）', () => {
    expect(LS).toContain('desktop.animate([');
    expect(LS).toContain("duration: A17_UNLOCK.UNLOCK_ANIMATION_DURATION_MS");
    expect(LS).toContain("delay: A17_UNLOCK.UNLOCK_ANIMATION_SURFACE_BEHIND_START_DELAY_MS");
  });
  it('F8 测试钩子锚（__lockTest.ripple 观测面）', () => {
    expect(LS).toContain('ripple: () => {');
    expect(LS).toContain('wavePresent: !!wave');
  });
});

describe('v19-G · AOSP 行号锚与样式锚（防回退）', () => {
  it('G1 库头 AOSP 行号引用在录（KeyguardUnlockAnimationController L70/76/83/108/145 + NumPadAnimator L63-66）', () => {
    expect(LIB_SRC).toContain('SURFACE_BEHIND_START_SCALE_FACTOR: 0.95');
    expect(LIB_SRC).toContain('UNLOCK_ANIMATION_SURFACE_BEHIND_START_DELAY_MS: 67');
    expect(LIB_SRC).toContain('（main 实拉 L63-66');
    expect(LIB_SRC).toContain('docs/reference/frameworks-base/systemui/keyguard-ripple/');
  });
  it('G2 参考源码文件在库（实拉快照防丢失）', () => {
    const kuc = readFileSync(R('docs/reference/frameworks-base/systemui/keyguard-ripple/KeyguardUnlockAnimationController.kt'), 'utf8');
    expect(kuc).toContain('SURFACE_BEHIND_START_SCALE_FACTOR = 0.95f');
    expect(kuc).toContain('SURFACE_BEHIND_SCALE_PIVOT_Y = 0.66f');
    const npa = readFileSync(R('docs/reference/frameworks-base/systemui/keyguard-ripple/NumPadAnimator.java'), 'utf8');
    expect(npa).toContain('EXPAND_ANIMATION_MS = 100');
    expect(npa).toContain('CONTRACT_ANIMATION_MS = 417');
  });
  it('G3 CSS 波纹层锚（fill/ring 双层 + reduced-motion 隐藏 + md-* 令牌）', () => {
    expect(CSS_SRC).toContain('.unlock-wave-fill');
    expect(CSS_SRC).toContain('.unlock-wave-ring');
    expect(CSS_SRC).toContain('z-index: 98010');
    expect(CSS_SRC).toContain('hsl(var(--md-h, 150)');
    const rmBlock = CSS_SRC.slice(CSS_SRC.indexOf('.unlock-wave {'));
    expect(rmBlock).toContain('@media (prefers-reduced-motion: reduce)');
    expect(rmBlock).toContain('display: none');
  });
  it('G4 性能锚（合成器属性-only：波纹层零 layout/paint 属性动画）', () => {
    expect(LS).toContain('m.el.style.transform = `scale(${t.scale.toFixed(4)})`');
    expect(LS).toContain("m.el.style.filter = t.blurPx > 0.3 ? `blur(${t.blurPx.toFixed(1)}px)` : ''");
    // 逐帧路径零 getBoundingClientRect（距离提交帧静态量测一次）
    const frameFn = LS.slice(LS.indexOf('function applyUnlockRippleFrame'), LS.indexOf('function teardownUnlockRipple'));
    expect(frameFn).not.toContain('getBoundingClientRect');
  });
});
