// ==================== v123-gravity.test.js — #123 重力沙盒 N 体物理核（v9.03） ====================
//
// 覆盖（#123 验收原文逐条）：
//   · N 体引力演算：两两万有引力（Newton + Plummer 软化）+ 固定子步辛欧拉（防发散）
//   · 二体圆轨道精确性：v = sqrt(G·m/(4d)) 双星预设轨道半径守恒
//   · 碰撞合并（动量守恒）：p 前后全等 + 质量相加 + 半径 ∝ m^(1/3)
//   · 预设场景：双星/三体（Chenciner–Montgomery 8 字解标度变换 verbatim 常量）/太阳系
//   · 能量有界（长时间演化不发散）+ fixed 钉住语义 + 拖拽 _drag 豁免
//   · 注册链：apps-data 聚合 46 项 / iframe 应用目录 / 终端映射 / README 计数同口径

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/gravity/core.js'), 'utf-8');
const UI_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/gravity/index.html'), 'utf-8');

// ---------- 沙箱提取（经典脚本 IIFE → window.__gravityCore，v840 同范式） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__gravityCore;

describe('v9.03 #123 core：标度常量与体工厂', () => {
  it('标度常量在册（沙盒工程值，头注留痕非 SI）', () => {
    expect(core.G).toBe(1200);
    expect(core.SOFTENING).toBe(6);
    expect(core.SUBSTEPS).toBe(4);
    expect(core.MERGE_OVERLAP).toBe(0.85);
  });
  it('radiusForMass：∝ m^(1/3) 且下限 2.5 钳位', () => {
    expect(core.radiusForMass(0)).toBe(2.5);
    const r1 = core.radiusForMass(8), r8 = core.radiusForMass(64);
    expect(r8 / r1).toBeCloseTo(2, 5); // (64/8)^(1/3) = 2
  });
  it('createBody：默认值与 fixed 语义', () => {
    const b = core.createBody({ x: 1, y: 2 });
    expect(b.vx).toBe(0); expect(b.m).toBe(1); expect(b.fixed).toBe(false);
    expect(b.trail).toEqual([]);
    expect(core.createBody({ x: 0, y: 0, fixed: true }).fixed).toBe(true);
  });
});

describe('v9.03 #123 core：轨道演算精确性', () => {
  it('双星圆轨道：v = sqrt(G·m/(4d)) 预设跑 10s 轨道半径守恒（±8 单位）', () => {
    const bodies = core.presetBinary(300, 300);
    const d = 110;
    const sim = (t) => { for (let f = 0; f < t * 60; f++) core.step(bodies, 1 / 60); };
    sim(10);
    for (const b of bodies) {
      const dist = Math.hypot(b.x - 300, b.y - 300);
      expect(Math.abs(dist - d)).toBeLessThan(8);
    }
  });
  it('系统总动量守恒（双星反向速度严格抵消）', () => {
    const bodies = core.presetBinary(0, 0);
    const p0 = core.totalMomentum(bodies);
    for (let f = 0; f < 600; f++) core.step(bodies, 1 / 60);
    const p1 = core.totalMomentum(bodies);
    expect(p1.x).toBeCloseTo(p0.x, 6);
    expect(p1.y).toBeCloseTo(p0.y, 6);
  });
  it('三体 8 字解：标度变换初值 verbatim（Chenciner–Montgomery 常量）+ 动量归零 + 能量有界', () => {
    const bodies = core.presetThree(300, 300);
    const p = core.totalMomentum(bodies);
    expect(Math.abs(p.x)).toBeLessThan(1e-9);
    expect(Math.abs(p.y)).toBeLessThan(1e-9);
    const e0 = core.totalEnergy(bodies).total;
    for (let f = 0; f < 60 * 20; f++) core.step(bodies, 1 / 60); // 演化 20s
    const e1 = core.totalEnergy(bodies).total;
    expect(Math.abs(e1 - e0) / Math.abs(e0)).toBeLessThan(0.05); // 辛欧拉能量漂移 <5%
    for (const b of bodies) expect(Math.hypot(b.x - 300, b.y - 300)).toBeLessThan(400); // 有界
  });
  it('太阳系预设：五体（恒星 + 四行星）+ 行星近圆轨道半径 10s 漂移 <15%', () => {
    const bodies = core.presetSolar(300, 300);
    expect(bodies.length).toBe(5);
    const radii0 = bodies.slice(1).map((b) => Math.hypot(b.x - 300, b.y - 300));
    for (let f = 0; f < 600; f++) core.step(bodies, 1 / 60);
    bodies.slice(1).forEach((b, i) => {
      const r = Math.hypot(b.x - 300, b.y - 300);
      expect(Math.abs(r - radii0[i]) / radii0[i]).toBeLessThan(0.15);
    });
  });
  it('step 返回被积天数（fixed/拖拽豁免）+ 拖尾上限裁剪', () => {
    const bodies = [
      core.createBody({ x: 0, y: 0, m: 100, fixed: true }),
      core.createBody({ x: 100, y: 0, m: 1 }),
      core.createBody({ x: -100, y: 0, m: 1 }),
    ];
    bodies[2]._drag = true;
    expect(core.step(bodies, 1 / 60)).toBe(1);
    for (let f = 0; f < core.TRAIL_MAX + 40; f++) core.step(bodies, 1 / 60);
    expect(bodies[1].trail.length).toBeLessThanOrEqual(core.TRAIL_MAX * 2);
  });
});

describe('v9.03 #123 core：碰撞合并（动量守恒）', () => {
  it('对撞合并：动量守恒、质量相加、半径 ∝ m^(1/3)、merges 计数', () => {
    const a = core.createBody({ x: 0, y: 0, vx: 10, vy: 0, m: 10, hue: 200 });
    const b = core.createBody({ x: 5, y: 0, vx: -20, vy: 5, m: 30, hue: 40 });
    const p0 = core.totalMomentum([a, b]);
    const keep = core.mergeBodies(a, b);
    expect(keep.m).toBe(40);
    expect(keep.vx).toBeCloseTo(p0.x / 40, 9);
    expect(keep.vy).toBeCloseTo(p0.y / 40, 9);
    expect(keep.r).toBe(core.radiusForMass(40));
    expect(keep.merges).toBe(1);
    expect(keep).toBe(b); // 大质量方继承
    expect(b._absorbed).toBeUndefined();
    expect(a._absorbed).toBe(true); // 小者标记吸收
  });
  it('handleCollisions：重叠对归并返回次数、非重叠零误伤', () => {
    const pair = [core.createBody({ x: 0, y: 0, m: 50 }), core.createBody({ x: 8, y: 0, m: 5 })];
    expect(core.handleCollisions(pair)).toBe(1);
    expect(pair.length).toBe(1);
    const apart = [core.createBody({ x: 0, y: 0, m: 50 }), core.createBody({ x: 200, y: 0, m: 5 })];
    expect(core.handleCollisions(apart)).toBe(0);
    expect(apart.length).toBe(2);
  });
  it('实弹链：对射两体相撞归一后 p/质心速度守恒', () => {
    const bodies = [
      core.createBody({ x: 100, y: 200, vx: 30, vy: 0, m: 20 }),
      core.createBody({ x: 160, y: 200, vx: -30, vy: 0, m: 20 }),
    ];
    const p0 = core.totalMomentum(bodies);
    for (let f = 0; f < 600 && bodies.length > 1; f++) {
      core.step(bodies, 1 / 60);
      core.handleCollisions(bodies);
    }
    expect(bodies.length).toBe(1);
    const p1 = core.totalMomentum(bodies);
    expect(p1.x).toBeCloseTo(p0.x, 6);
    expect(p1.y).toBeCloseTo(p0.y, 6);
  });
});

describe('v9.03 #123 core：预设工厂与源码纪律', () => {
  it('makePreset 四路由（未知名回 empty）', () => {
    expect(core.makePreset('binary', 400, 400).length).toBe(2);
    expect(core.makePreset('three', 400, 400).length).toBe(3);
    expect(core.makePreset('solar', 400, 400).length).toBe(5);
    expect(core.makePreset('empty', 400, 400)).toEqual([]);
    expect(core.makePreset('nope', 400, 400)).toEqual([]);
  });
  it('8 字解文献常量 verbatim 在册（头注 + 代码双锚）', () => {
    expect(CORE_SRC).toContain('0.97000436');
    expect(CORE_SRC).toContain('-0.93240737');
    expect(CORE_SRC).toContain('Chenciner');
  });
  it('UI 面在册：三预设 chip + 暂停/清空/拖尾 + 发射瞄准线 + e2e 只读桥', () => {
    expect(UI_SRC).toContain('data-preset="binary"');
    expect(UI_SRC).toContain('data-preset="three"');
    expect(UI_SRC).toContain('data-preset="solar"');
    expect(UI_SRC).toContain('id="btnPause"');
    expect(UI_SRC).toContain('id="btnClear"');
    expect(UI_SRC).toContain('window.__gravityUI');
    expect(UI_SRC).toContain('core.js'); // 物理核接线
  });
  it('core 沙箱零副作用：new Function 提取后无 document/localStorage 触碰', () => {
    expect(CORE_SRC).not.toMatch(/^\s*document\./m);
    expect(CORE_SRC).not.toMatch(/localStorage\./);
  });
});

describe('v9.03 #123 注册链（46 应用单源同口径）', () => {
  const appsDataSrc = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf-8');
  it('apps-data 聚合含 gravity（import + 第 2 页数组双在册）', () => {
    expect(appsDataSrc).toContain("import gravity from './apps/gravity.js'");
    expect(appsDataSrc).toMatch(/driving, gravity,/);
  });
  it('iframe 应用目录就位（index.html + core.js）', () => {
    const dir = join(ROOT, 'ios-desktop/apps/gravity');
    expect(existsSync(join(dir, 'index.html'))).toBe(true);
    expect(existsSync(join(dir, 'core.js'))).toBe(true);
    const appDirs = readdirSync(join(ROOT, 'ios-desktop/apps'), { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(ROOT, 'ios-desktop/apps', d.name, 'index.html'))).length;
    expect(appDirs).toBe(41); // v10.54 #132：40 → 41（chess 上户，README 同口径）
  });
  it('终端映射行 + 图标注册 + 包装器 iframeAppContent 接线', () => {
    expect(readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf-8')).toContain("['gravity', '重力沙盒', 'gravity', '引力', '轨道', '沙盒']");
    expect(readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf-8')).toMatch(/gravity: `<svg/);
    expect(readFileSync(join(ROOT, 'ios-desktop/js/apps/gravity.js'), 'utf-8')).toContain("iframeAppContent('apps/gravity/index.html')");
  });
});
