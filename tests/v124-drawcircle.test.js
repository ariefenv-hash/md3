// ==================== v124-drawcircle.test.js — #124 画圆挑战评分核（v9.05） ====================
//
// 覆盖（#124 一期验收原文逐条）：
//   · Kåsa 圆拟合：理想圆点列反演圆心/半径精确命中；共线退化/点数不足 → null
//   · 三指标：圆度（径向 CV）/ 闭合（角覆盖，跨 ±π 连续展开）/ 重合（起止点距比直径）
//   · 理想圆高分带：闭合 1.0 邻域、总分 ≥95 人形圆规档
//   · 扰动敏感性：椭圆化压圆度、半弧压闭合、开口压重合（三通道各自独立下探）
//   · 有效性门：半径过小（误触）→ null；权重和恒为 1
//   · 注册链：apps-data 聚合项数 / iframe 应用目录 / 包装器 / 终端映射 / 图标在册 / 版本真源

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/drawcircle/core.js'), 'utf-8');
const UI_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/drawcircle/index.html'), 'utf-8');

// ---------- 沙箱提取（经典脚本 IIFE → window.__drawCircleCore，v840/v123 同范式） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__drawCircleCore;

// ---------- 合成点列工厂（确定性，零随机） ----------
function circlePoints(cx, cy, r, opts = {}) {
  const { from = 0, to = Math.PI * 2, steps = 72, squash = 1, jitter = 0, openGap = 0, phase = 0 } = opts;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = from + (to - from) * (i / steps);
    const jx = jitter ? jitter * Math.sin(i * 2.3 + phase) : 0;
    const jy = jitter ? jitter * Math.cos(i * 1.7 + phase) : 0;
    pts.push({ x: cx + r * Math.cos(t) * squash + jx, y: cy + r * Math.sin(t) + jy });
  }
  if (openGap) {
    const n = pts.length;
    pts[n - 1] = { x: pts[n - 1].x + r * openGap, y: pts[n - 1].y };
  }
  return pts;
}

describe('v9.05 #124 core：Kåsa 圆拟合', () => {
  it('理想圆点列精确反演圆心与半径', () => {
    const fit = core.fitCircle(circlePoints(200, 180, 90));
    expect(fit).not.toBeNull();
    expect(fit.cx).toBeCloseTo(200, 3);
    expect(fit.cy).toBeCloseTo(180, 3);
    expect(fit.r).toBeCloseTo(90, 3);
  });

  it('平移不变（同形状不同位置同拟合半径）', () => {
    const a = core.fitCircle(circlePoints(50, 50, 70)).r;
    const b = core.fitCircle(circlePoints(300, 420, 70)).r;
    expect(b).toBeCloseTo(a, 6);
  });

  it('点数不足 / 共线退化 → null', () => {
    expect(core.fitCircle(null)).toBeNull();
    expect(core.fitCircle([{ x: 0, y: 0 }])).toBeNull();
    expect(core.fitCircle([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBeNull();
    const line = [];
    for (let i = 0; i < 12; i++) line.push({ x: i * 10, y: i * 10 });
    expect(core.fitCircle(line)).toBeNull();
  });
});

describe('v9.05 #124 core：三指标与总分', () => {
  it('理想闭合圆：闭合 ≈ 1、重合高位、总分 ≥ 95（人形圆规档）', () => {
    const res = core.scoreStroke(circlePoints(190, 200, 110, { jitter: 1.2 }));
    expect(res).not.toBeNull();
    expect(res.closure).toBeGreaterThan(0.99);
    expect(res.overlap).toBeGreaterThan(0.9);
    expect(res.score).toBeGreaterThanOrEqual(95);
  });

  it('椭圆化（squash 0.82）压圆度但不至于归零', () => {
    const good = core.scoreStroke(circlePoints(200, 200, 100, { jitter: 1 }));
    const bad = core.scoreStroke(circlePoints(200, 200, 100, { squash: 0.82, jitter: 1 }));
    expect(bad.roundness).toBeLessThan(good.roundness);
    expect(bad.roundness).toBeGreaterThan(0);
  });

  it('半弧（180°）闭合 ≈ 0.5', () => {
    const res = core.scoreStroke(circlePoints(200, 200, 100, { from: 0, to: Math.PI }));
    expect(res.closure).toBeGreaterThan(0.45);
    expect(res.closure).toBeLessThan(0.55);
  });

  it('开口笔画压重合度（起止点距拉大）', () => {
    const closed = core.scoreStroke(circlePoints(200, 200, 100, { jitter: 1 }));
    const open = core.scoreStroke(circlePoints(200, 200, 100, { jitter: 1, openGap: 0.5 }));
    expect(open.overlap).toBeLessThan(closed.overlap - 0.2);
  });

  it('跨 ±π 起笔不误断（方位角从 π 邻域起步）', () => {
    const res = core.scoreStroke(circlePoints(200, 200, 100, { from: Math.PI * 0.98, to: Math.PI * 2 + Math.PI * 0.96, jitter: 1 }));
    expect(res.closure).toBeGreaterThan(0.95);
  });

  it('误触小笔画 → null（有效性门）', () => {
    expect(core.scoreStroke(circlePoints(100, 100, 5))).toBeNull();
    expect(core.scoreStroke(circlePoints(100, 100, 3, { steps: 10 }))).toBeNull();
  });

  it('权重和恒为 1 且导出阈值在册', () => {
    const w = core.WEIGHTS;
    expect(w.roundness + w.closure + w.overlap).toBeCloseTo(1, 10);
    expect(core.THRESH.minR).toBeGreaterThan(0);
    expect(core.THRESH.cv).toBeGreaterThan(0);
    expect(core.THRESH.gap).toBeGreaterThan(0);
  });

  it('分级五档边界', () => {
    expect(core.grade(96)).toBe('人形圆规');
    expect(core.grade(88.5)).toBe('宗师级');
    expect(core.grade(80)).toBe('熟练');
    expect(core.grade(65)).toBe('入门');
    expect(core.grade(20)).toBe('灵魂画手');
  });
});

describe('v9.05 #124 UI 与注册链', () => {
  it('UI 面：画布/成绩面板/最佳 chip/只读桥在册', () => {
    for (const id of ['id="cv"', 'id="panel"', 'id="chipBest"', 'id="chipReset"', '__drawCircleUI', 'drawcircle.best.v1']) {
      expect(UI_SRC).toContain(id);
    }
    expect(UI_SRC).toContain('__drawCircleCore');
    expect(UI_SRC).toContain('md3-tokens.css');
    expect(UI_SRC).toContain('freeze-shim.js');
  });

  it('注册链：apps-data 聚合 47 项 + 包装器 + 终端映射 + 图标在册', () => {
    // v123 同范式：apps-data 聚合断言走源码读取（裸动态 import 会踩
    // state.js↔apps-data.js 初始化环——state 顶层急切读 initialApps，
    // 须 bootDesktop 引导后方可动态导入，见 v861「boot 先于模块 import」教训）
    const appsDataSrc = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf-8');
    const importCount = (appsDataSrc.match(/from '\.\/apps\/[\w-]+\.js'/g) || []).length;
    expect(importCount).toBe(52); // v9.94 #132：51 → 52（chess 上户）
    expect(appsDataSrc).toContain("import drawcircle from './apps/drawcircle.js'");
    // 第 2 页数组末位在册（v9.05 入列位）
    expect(appsDataSrc).toContain('gravity, drawcircle, typing,'); // v9.06 后 drawcircle 让出末位

    expect(existsSync(join(ROOT, 'ios-desktop/apps/drawcircle/index.html'))).toBe(true);
    expect(existsSync(join(ROOT, 'ios-desktop/js/apps/drawcircle.js'))).toBe(true);

    const wrapper = readFileSync(join(ROOT, 'ios-desktop/js/apps/drawcircle.js'), 'utf-8');
    expect(wrapper).toContain("id: 'drawcircle'");
    expect(wrapper).toContain('iframeAppContent');

    const terminal = readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf-8');
    expect(terminal).toContain('画圆');
    expect(terminal).toContain('drawcircle');

    const icons = readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf-8');
    expect(icons).toContain('drawcircle:');
  });

  it('版本真源与 README 同步（v150 同口径）', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    expect(pkg.version).toBe('9.94.0'); // v9.19 #176 二期
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf-8');
    expect(readme).toContain('48');
  });
});
