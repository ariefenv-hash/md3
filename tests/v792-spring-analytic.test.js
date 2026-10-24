// ==================== tests/v792-spring-analytic.test.js — 弹簧解析闭式解 + v7.91 合并锚定 ====================
//
// v7.91（并行会话 07c9252）完成按压偏下根治与令牌回抄；本文件承接其未覆盖的增量：
//   ① 弹簧引擎 RK4 → 阻尼谐振子解析闭式解（MotionScheme 同构语义）
//      —— x(t) 为微分方程真解：过冲比精确 = e^(−ζπ/√(1−ζ²))（ζ0.6 → 9.48%），
//         与帧率/帧间隔抖动无关；RK4 为离散近似，存在固有数值耗散
//   ② v7.91 合并实现锚定：::after 触控靶 / checked 描边 transparent /
//      焦点环 Secondary / 禁用令牌 color-mix + @supports 兜底
//
// 源码依据（android-17.0.0_r1 缓存 aosp17/androidx/compose/material3/）：
//   Switch.kt L371 checkedBorderColor = Color.Transparent
//   Switch.kt L139 Modifier.minimumInteractiveComponentSize()
//   SwitchTokens.kt FocusIndicatorColor = Secondary

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Spring, makeSpringParams } from '../ios-desktop/js/spring.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf-8');

const springSrc = read('ios-desktop/js/spring.js');
const css = read('ios-desktop/css/md3-theme.css');

describe('v7.92 → ① 弹簧解析闭式解（RK4 退役）', () => {
  it('RK4 四阶求值退场；exp/cos/sin 闭式解在场', () => {
    expect(springSrc).not.toContain('k1v');
    expect(springSrc).not.toContain('龙格-库塔');
    expect(springSrc).toContain('Math.cos(wd * tau)');
    expect(springSrc).toContain('Math.exp(-zeta * w0 * tau)');
  });

  it('三阻尼分支齐全（欠阻尼 / 临界 / 过阻尼）', () => {
    expect(springSrc).toContain('zeta < 1 - 1e-9');
    expect(springSrc).toContain('zeta <= 1 + 1e-9');
    expect(springSrc).toContain('Math.sqrt(zeta * zeta - 1)');
  });

  it('惰性重锚三通道（target 直写 / reconfigure 纪元 / 外部直写 x·v）', () => {
    expect(springSrc).toContain('this._lastTarget !== this.target');
    expect(springSrc).toContain('this._anchorEpoch !== this._paramsEpoch');
    expect(springSrc).toContain('Math.abs(this.x - this._lastX)');
  });

  it('FastSpatial ζ0.6 过冲比 = 理论值 e^(−ζπ/√(1−ζ²)) ≈ 9.48%（RK4 时代仅近似）', () => {
    // 峰值出现在半周期 wd·t=π，闭式解单步直达（免采样栅格误差）
    const k = 800;
    const c = 2 * 0.6 * Math.sqrt(k); // m3-controls SPRING_DAMPING 同源
    const s = new Spring({ mass: 1, stiffness: k, damping: c, initialValue: 0 });
    s.target = 24;
    const w0 = Math.sqrt(k);
    const zeta = c / (2 * Math.sqrt(k));
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    s.update(Math.PI / wd); // 单步闭式求值 = 峰值精确解
    const ratio = (s.x - 24) / 24;
    const theory = Math.exp((-zeta * Math.PI) / Math.sqrt(1 - zeta * zeta));
    expect(ratio).toBeGreaterThan(0.09);
    expect(ratio).toBeLessThan(0.10);
    expect(Math.abs(ratio - theory)).toBeLessThan(1e-12); // 与闭式理论值逐位一致
  });

  it('解析解与帧率无关：120Hz 与 60Hz 与变步长同一时刻落位一致（RK4 会分叉）', () => {
    // 三种帧计划都精确累加到同一时刻 0.4s（48×1/120 = 24×1/60 = 12×(1/90+1/45)）
    const run = (steps, dts) => {
      const s = new Spring({ ...makeSpringParams(0.38, 0.8, 1), initialValue: 0 });
      s.target = 400;
      for (let i = 0; i < steps; i++) s.update(typeof dts === 'number' ? dts : dts[i % dts.length]);
      return s.x;
    };
    const hi = run(48, 1 / 120);
    const lo = run(24, 1 / 60);
    const mixed = run(24, [1 / 90, 1 / 45]);
    expect(Math.abs(hi - lo)).toBeLessThan(1e-8);
    expect(Math.abs(hi - mixed)).toBeLessThan(1e-8);
  });

  it('外部直写 x/v（速度接力语义）触发重锚且不回跳', () => {
    const s = new Spring({ ...makeSpringParams(0.38, 0.8, 1), initialValue: 0 });
    s.target = 400;
    for (let i = 0; i < 10; i++) s.update(1 / 120);
    // 模拟 m3-controls onEnd：直写位置与同向速度后改 target
    s.x = 300; s.v = 800; s.target = 24;
    for (let i = 0; i < 1200; i++) s.update(1 / 120);
    expect(Math.abs(s.x - 24)).toBeLessThan(0.01);
  });
});

describe('v7.92 → ② v7.91 合并实现锚定（并行会话 07c9252 基准）', () => {
  it('checked 态描边 transparent（Switch.kt L371 checkedBorderColor = Color.Transparent）', () => {
    const m = css.match(/input:checked \+ \.slider \{[\s\S]*?\n\}/);
    expect(m[0]).toContain('border-color: transparent');
  });

  it('触控靶 ::after 上下各外扩 8px（52×48 等效 minimumInteractiveComponentSize）', () => {
    const m = css.match(/\.md3-switch::after \{[\s\S]*?\n\}/);
    expect(m).toBeTruthy();
    expect(m[0]).toContain('top: -8px');
    expect(m[0]).toContain('bottom: -8px');
  });

  it('焦点环 Secondary（FocusIndicatorColor）', () => {
    const m = css.match(/input:focus-visible \+ \.slider \{[\s\S]*?\n\}/);
    expect(m[0]).toContain('var(--md-secondary');
  });

  it('禁用态令牌三档：轨 12% / 球 38% / 开态球 surface@100%', () => {
    expect(css).not.toMatch(/input:disabled \+ \.slider \{\s*\n\s*opacity/);
    expect(css).toContain(
      'color-mix(in srgb, var(--md-surface-container-highest, #e2e2e9) 12%, transparent)'
    );
    expect(css).toContain('color-mix(in srgb, var(--md-on-surface, #1f1f1f) 38%, transparent)');
    const checkedThumb = css.match(/input:disabled:checked \+ \.slider \.thumb \{[\s\S]*?\n\}/);
    expect(checkedThumb[0]).toContain('--md-surface');
  });

  it('color-mix 降级兜底在场（旧内核退回整体灰化）', () => {
    expect(css).toContain('@supports not (color: color-mix');
    expect(css).toContain('opacity: 0.42');
  });
});
