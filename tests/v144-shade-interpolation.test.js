// ==================== v144-shade-interpolation.test.js — #144 ShadeInterpolation.kt 移植回归 ====================
//
// 覆盖：
//   · 纯函数四件（constrainedMap / interpolateEaseInOut / getNotificationScrimAlpha /
//     getContentAlpha）曲线关键值 0/0.25/0.5/0.75/1 采样——期望值由源公式独立离线计算后
//     硬编码（cos(3.14159·(1−(f·1.2−0.2))²) 路径），非镜像实现
//   · 预映射死区：interpolateEaseInOut 输入 ≤ 1/6 恒 0（×1.2−0.2 起步延迟带）
//   · 层次语义：scrim 0→0.5 走完 vs content 0.3→1 走完（起步差 0.3；f=0.4 时
//     scrim≈0.992 而 content 仍为 0——「先暗背景、再浮内容」）
//   · constrainedMap 钳位：过拉/负值输入恒落 [resultMin, resultMax] + 退化区间阶跃
//   · dual-shade.js 接线：import 存在 + 跟手帧直写 + 拖拽/交接/瞬收/复位四路径源码断言
//     （v785 同范式）+ CSS dragging/no-anim 硬切块 + 经典轨道不受扰（linear 锚原样）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  constrainedMap,
  interpolateEaseInOut,
  getNotificationScrimAlpha,
  getContentAlpha,
} from '../ios-desktop/js/aosp/shade-interpolation.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dualSrc = readFileSync(path.join(here, '../ios-desktop/js/dual-shade.js'), 'utf8');
const cssSrc = readFileSync(path.join(here, '../ios-desktop/css/pull-panels.css'), 'utf8');
const pdSrc = readFileSync(path.join(here, '../ios-desktop/js/pull-down-gesture.js'), 'utf8');

const closeTo = (actual, expected, eps = 1e-3) =>
  Math.abs(actual - expected) <= eps;

describe('v144 ShadeInterpolation — constrainedMap（MathUtils.constrainedMap 等价）', () => {
  it('线性映射：区间 [0,0.5]→[0,1] 中点命中', () => {
    expect(constrainedMap(0, 1, 0, 0.5, 0.25)).toBe(0.5);
    expect(constrainedMap(0, 1, 0, 0.5, 0.1)).toBe(0.2);
  });
  it('输入钳位：过拉/负值输出恒落 [resultMin, resultMax]', () => {
    expect(constrainedMap(0, 1, 0, 0.5, 2)).toBe(1);
    expect(constrainedMap(0, 1, 0, 0.5, -1)).toBe(0);
    expect(constrainedMap(0, 1, 0.3, 1, -5)).toBe(0);
    expect(constrainedMap(0, 1, 0.3, 1, 5)).toBe(1);
  });
  it('任意目标区间：[0,1]→[2,4] 中点 = 3', () => {
    expect(constrainedMap(2, 4, 0, 1, 0.5)).toBe(3);
  });
  it('退化区间（valueMin===valueMax）：阶跃语义', () => {
    expect(constrainedMap(0, 1, 0.5, 0.5, 0.4)).toBe(0);
    expect(constrainedMap(0, 1, 0.5, 0.5, 0.6)).toBe(1);
  });
});

describe('v144 ShadeInterpolation — interpolateEaseInOut（×1.2−0.2 预映射 + 余弦）', () => {
  it('预映射死区：输入 ≤ 1/6 恒 0（起步延迟带）', () => {
    expect(interpolateEaseInOut(0)).toBe(0);
    expect(interpolateEaseInOut(0.1)).toBe(0);
    expect(interpolateEaseInOut(1 / 6)).toBe(0); // 1/6·1.2−0.2 = 0 → ≤0 分支
  });
  it('越出死区即正增长，关键值命中离线计算值', () => {
    // 离线计算：f=0.2 → m=0.04 → 1−0.5·(1−cos(3.14159·0.96²)) ≈ 0.0151
    expect(closeTo(interpolateEaseInOut(0.2), 0.0151)).toBe(true);
    // f=1/3 → m=0.2 → ≈ 0.2871；f=0.5 → m=0.4 → ≈ 0.7129；f=2/3 → m=0.6 → ≈ 0.9382
    expect(closeTo(interpolateEaseInOut(1 / 3), 0.2871)).toBe(true);
    expect(closeTo(interpolateEaseInOut(0.5), 0.7129)).toBe(true);
    expect(closeTo(interpolateEaseInOut(2 / 3), 0.9382)).toBe(true);
    expect(interpolateEaseInOut(1)).toBe(1); // cos(0)=1 → 恰为 1
  });
});

describe('v144 ShadeInterpolation — getNotificationScrimAlpha（scrim 0→0.5 走完）', () => {
  it('曲线关键值 0/0.25/0.5/0.75/1 采样（离线计算值硬编码）', () => {
    expect(getNotificationScrimAlpha(0)).toBe(0);
    expect(closeTo(getNotificationScrimAlpha(0.25), 0.7129)).toBe(true);
    expect(getNotificationScrimAlpha(0.5)).toBe(1); // 下拉一半遮罩全黑
    expect(getNotificationScrimAlpha(0.75)).toBe(1); // 过拉段钳位恒 1
    expect(getNotificationScrimAlpha(1)).toBe(1);
  });
  it('过拉钳位 + 单调不减（0→1 步长 0.05 全谱）', () => {
    expect(getNotificationScrimAlpha(2)).toBe(1);
    expect(getNotificationScrimAlpha(-0.5)).toBe(0);
    let prev = -1;
    for (let f = 0; f <= 1.0001; f += 0.05) {
      const a = getNotificationScrimAlpha(f);
      expect(a >= prev - 1e-9).toBe(true);
      expect(a >= 0 && a <= 1).toBe(true);
      prev = a;
    }
  });
});

describe('v144 ShadeInterpolation — getContentAlpha（content 0.3→1 走完，晚起步 0.3）', () => {
  it('起步差 0.3：expansion 0.3 前恒 0，1 处满幅', () => {
    expect(getContentAlpha(0)).toBe(0);
    expect(getContentAlpha(0.3)).toBe(0);
    expect(getContentAlpha(0.4)).toBe(0); // 仍在死区：0.4 < 0.3+0.7/6
    expect(getContentAlpha(1)).toBe(1);
    expect(getContentAlpha(2)).toBe(1); // 过拉钳位
  });
  it('曲线关键值采样（离线计算值硬编码）', () => {
    // f=0.5 → g=0.2857 → ease ≈ 0.1639；f=0.65 → g=0.5 → ≈ 0.7129；f=0.75 → g≈0.6429 → ≈ 0.9190
    expect(closeTo(getContentAlpha(0.5), 0.1639)).toBe(true);
    expect(closeTo(getContentAlpha(0.65), 0.7129)).toBe(true);
    expect(closeTo(getContentAlpha(0.75), 0.919)).toBe(true);
  });
  it('层次语义：同 expansion 下 scrim ≥ content（先暗背景再浮内容）', () => {
    for (const f of [0.35, 0.4, 0.5, 0.6, 0.8, 1]) {
      expect(getNotificationScrimAlpha(f) >= getContentAlpha(f)).toBe(true);
    }
    // f=0.4 处对比最强：scrim≈0.992 vs content=0
    expect(closeTo(getNotificationScrimAlpha(0.4), 0.9918)).toBe(true);
    expect(getContentAlpha(0.4)).toBe(0);
  });
});

describe('v144 dual-shade.js 接线（源码断言，v785 范式）', () => {
  it('import 在册：aosp/shade-interpolation.js 单一真源', () => {
    expect(dualSrc).toContain("from './aosp/shade-interpolation.js'");
    expect(dualSrc).toContain('getNotificationScrimAlpha');
  });
  it('跟手帧直写：pointermove 内 expansion→α 连续映射（替代 .open 二元切换）', () => {
    expect(dualSrc).toContain('s.style.opacity = getNotificationScrimAlpha(over / h).toFixed(3)');
    expect(dualSrc).toContain("!p.classList.contains('open')");
  });
  it('拖拽期硬切四路径：down 加 dragging / up·cancel·模式复位摘除', () => {
    expect(dualSrc).toContain("scrimEl(which)?.classList.add('dragging')");
    expect(dualSrc).toContain("s.classList.remove('dragging')");
    expect(dualSrc).toContain("s.classList.remove('open', 'dragging', 'no-anim')");
  });
  it('松手交接：先清内联 α 再交回 CSS 类过渡；开面板路径同样清内联', () => {
    expect(dualSrc).toContain("if (s) s.style.opacity = '';"); // finish 交接
    expect(dualSrc).toContain("if (s) { s.style.opacity = ''; s.classList.add('open'); }"); // openDualPanel
  });
  it('瞬收路径：closePanel instant 对 scrim 同帧 no-anim + 清内联', () => {
    expect(dualSrc).toContain("if (s) { s.classList.add('no-anim'); s.style.opacity = ''; }");
    expect(dualSrc).toContain("if (s) s.classList.remove('no-anim');");
  });
  it('CSS：dragging/no-anim 硬切块（transition+bf 双 none），.open 权威态不被误删', () => {
    const m = cssSrc.match(/\.dual-scrim\.dragging,\s*\.dual-scrim\.no-anim\s*\{([^}]*)\}/);
    expect(m).not.toBeNull();
    expect(m[1]).toContain('transition: none');
    expect(m[1]).toContain('backdrop-filter: none');
    expect(m[1]).toContain('-webkit-backdrop-filter: none');
    expect(cssSrc).toContain('.dual-scrim.open');
    expect(cssSrc).toMatch(/\.dual-scrim\.open\s*\{[^}]*opacity:\s*1/s);
  });
  it('经典轨道不受扰：pull-down-gesture 线性 overlay 锚原样（本议题仅 dual 面接线）', () => {
    expect(pdSrc).toContain('overlayOpacity: progress');
    expect(pdSrc).not.toContain('shade-interpolation');
  });
});
