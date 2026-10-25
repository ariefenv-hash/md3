// ==================== v813-ripple-overlay.test.js — #38 点击涟漪两缺陷修复守护 ====================
//
// 议题 #38 验收面：
//   ① 扩散中心与触点垂直误差 ≤ 2px —— v8.07 坐标域校准已根治（e2e-v813 实测 1.69px，
//      本套件锚定坐标链形态不回退）
//   ② 连续快速点击可见多 ripple 独立扩散层叠 —— 会话模型守护（多实例共存，禁改单例重启）
//   ③ 连点无白块残留 —— sparkle 高 alpha（0.9）多层 over 叠加治理：n≥2 时 ×1/n
//      （议题执行要点授权「透明度按 1/n 或源码规则叠加」；波纹低 alpha over 天然收敛不动）
//
// 测试分层：
//   · 行为级：rippleSparkleAlphaScale 纯函数 + RippleAnimationSession 多会话独立共存时序
//     （真实 Session 类，无 GL 依赖）
//   · 源码锚定：_raf 两段式（先收集后绘制）/ sparkleScale 接线 / 波纹 alpha 不衰减 /
//     多会话 push+filter 结构（共享层与引擎层双锚）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

import {
  RippleAnimationSession,
} from '../ios-desktop/js/aosp/expressive-ripple.js';
import {
  rippleSparkleAlphaScale,
  parseColorToVec4,
} from '../ios-desktop/js/ripple-fx.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FX_SRC = readFileSync(join(root, 'ios-desktop/js/ripple-fx.js'), 'utf-8');
const ENGINE_SRC = readFileSync(join(root, 'ios-desktop/js/aosp/expressive-ripple.js'), 'utf-8');

describe('v8.13 #38 rippleSparkleAlphaScale（sparkle 1/n 叠加治理）', () => {
  it('单会话（n<2）不衰减：1 → 1', () => {
    expect(rippleSparkleAlphaScale(1)).toBe(1);
    expect(rippleSparkleAlphaScale(0)).toBe(1);
  });

  it('防御语义：NaN/负数/undefined 一律视为单会话返回 1', () => {
    expect(rippleSparkleAlphaScale(NaN)).toBe(1);
    expect(rippleSparkleAlphaScale(-3)).toBe(1);
    expect(rippleSparkleAlphaScale(undefined)).toBe(1);
  });

  it('n≥2 严格 1/n（议题执行要点「透明度按 1/n 叠加」）', () => {
    expect(rippleSparkleAlphaScale(2)).toBe(0.5);
    expect(rippleSparkleAlphaScale(3)).toBeCloseTo(1 / 3, 12);
    expect(rippleSparkleAlphaScale(5)).toBe(0.2);
  });

  it('治理后多层 sparkle 峰值不再趋近纯白：5 层 over 合成 ≤ 67%', () => {
    // 单层 0.9：1-(1-0.9)^5 ≈ 99.999%（白块残留根因）
    const raw = 1 - Math.pow(1 - 0.9, 5);
    // 治理后每层 0.9/5=0.18：1-(1-0.18)^5 ≈ 62.3%
    const fixed = 1 - Math.pow(1 - 0.9 * rippleSparkleAlphaScale(5), 5);
    expect(raw).toBeGreaterThan(0.99);
    expect(fixed).toBeLessThan(0.67);
  });
});

describe('v8.13 #38 多会话独立共存时序（RippleAnimationSession 行为级）', () => {
  it('连点 5 会话同时存活、各自 progress 独立推进互不干扰', () => {
    const t0 = 1000;
    const starts = [t0, t0 + 120, t0 + 240, t0 + 360, t0 + 480];
    const sessions = starts.map((st) => new RippleAnimationSession(50, 50, 50, 50, st));
    // 全部按住不松，推进到 t0+600：前 2 会话 elapsed≥450ms enter 完成→0.5；
    // 后 3 会话仍在 enter 且严格递减（互不干扰的直接证据）
    const now = t0 + 600;
    sessions.forEach((s) => s.update(now));
    const p = sessions.map((s) => s.progress);
    expect(p[0]).toBeCloseTo(0.5, 5);
    expect(p[1]).toBeCloseTo(0.5, 5);
    expect(p[2]).toBeGreaterThan(0.45);
    expect(p[2]).toBeLessThan(0.5);
    expect(p[3]).toBeLessThan(p[2]);
    expect(p[4]).toBeLessThan(p[3]);
  });

  it('连点各会话 exit 独立：早按下的先 finished，晚按下的仍在播', () => {
    const t0 = 2000;
    const a = new RippleAnimationSession(50, 50, 50, 50, t0);
    const b = new RippleAnimationSession(50, 50, 50, 50, t0 + 300);
    a.requestExit(t0 + 100);            // a：exitStart = t0+100+max(450-100,0) = t0+450 → 完成 t0+825
    b.requestExit(t0 + 400);            // b：exitStart = t0+400+max(450-100,0) = t0+750 → 完成 t0+1125
    const now = t0 + 700;
    a.update(now); b.update(now);
    expect(a.finished).toBe(false);     // a 播 exit 中（700-450=275 < 375）
    expect(b.finished).toBe(false);     // b 尚未开始 exit（700-750 < 0）
    a.update(t0 + 900);
    b.update(t0 + 900);
    expect(a.finished).toBe(true);      // a 完成（825 < 900）
    expect(b.finished).toBe(false);     // b 仍在播（900-750=150 < 375）
    b.update(t0 + 1130);
    expect(b.finished).toBe(true);      // b 独立完成（1125 < 1130）
  });

  it('exitStartValue 平滑接续语义（快速点击不跳 0.5）不被多会话破坏', () => {
    const t0 = 3000;
    const s = new RippleAnimationSession(50, 50, 50, 50, t0);
    s.update(t0 + 50);                  // enter 极早期
    const earlyProgress = s.progress;
    s.requestExit(t0 + 50);
    expect(s.exitStartValue).toBeCloseTo(earlyProgress, 10);
  });
});

describe('v8.13 #38 源码锚定（防回退）', () => {
  it('_raf 两段式：先收集本帧绘制集（drawing.push + _alphaScale），后统一绘制', () => {
    expect(FX_SRC).toMatch(/const drawing = \[\]/);
    expect(FX_SRC).toMatch(/drawing\.push\(s\)/);
    expect(FX_SRC).toMatch(/s\._alphaScale = alphaScale/);
    // 绘制循环与收集循环分离（for...of drawing 在 filter 之后）
    const collectIdx = FX_SRC.indexOf('drawing.push(s)');
    const drawIdx = FX_SRC.indexOf('for (const s of drawing)');
    expect(collectIdx).toBeGreaterThan(-1);
    expect(drawIdx).toBeGreaterThan(collectIdx);
  });

  it('sparkle 1/n 接线：_raf 内按活跃会话数取 scale 并乘入 uSparkleColor', () => {
    expect(FX_SRC).toMatch(/rippleSparkleAlphaScale\(drawing\.length\)/);
    expect(FX_SRC).toMatch(/s\.sparkle\[3\] \* s\._alphaScale \* sparkleScale/);
  });

  it('波纹 alpha 不衰减（低 alpha over 天然收敛；1/n 仅作用于 sparkle）', () => {
    // uColor 乘 _alphaScale 但绝不乘 sparkleScale
    expect(FX_SRC).toMatch(/s\.color\[3\] \* s\._alphaScale\)/);
    expect(FX_SRC).not.toMatch(/s\.color\[3\][^;]*sparkleScale/);
  });

  it('多会话共存结构：共享层 sessions.push + filter 淘汰（禁改单例重启）', () => {
    expect(FX_SRC).toMatch(/this\.sessions\.push\(session\)/);
    expect(FX_SRC).toMatch(/this\.sessions = this\.sessions\.filter\(/);
    expect(FX_SRC).toMatch(/this\.pointers\.set\(e\.pointerId, session\)/);
    // 引擎层同款共存（ExpressiveRippleSurface 独立事件面亦保持多会话）
    expect(ENGINE_SRC).toMatch(/this\.mSessions\.push\(s\)/);
    expect(ENGINE_SRC).toMatch(/this\.mSessions = this\.mSessions\.filter\(/);
  });

  it('坐标链不回退（v8.07 校准守护延续）：全链实测 rect × dpr', () => {
    expect(FX_SRC).toMatch(/getBoundingClientRect\(\) \* dpr|crect\.left\) \* dpr/);
    expect(FX_SRC).toMatch(/const crect = this\.canvas\.getBoundingClientRect\(\)/);
    // 引擎侧：顶点插值在位（v8.07 修复形态），uH uniform 声明已退役
    // （注释里对旧形态的修复说明不参与匹配——锚 uniform 声明精确形态）
    expect(ENGINE_SRC).toMatch(/vec2 p = vP;/);
    expect(ENGINE_SRC).not.toMatch(/uniform float uH;/);
    expect(ENGINE_SRC).toMatch(/uniform vec2 uBufSize;/);
  });

  it('v8.07 导出面兼容（既有锚点不破坏）', () => {
    expect(parseColorToVec4('rgba(255,0,0,1)')).toEqual([1, 0, 0, 1]);
  });
});
