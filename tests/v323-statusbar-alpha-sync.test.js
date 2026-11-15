// ==================== v323-statusbar-alpha-sync.test.js — #323 状态栏/面板通道同步 ====================
//
// 卡面（#259-⑥）：快速下拉控制中心/合体模式时「状态栏重叠两次」。逐帧探针
// （scripts/e2e-v1144-statusbar-double-render.mjs，六组手势 × 三视口）实证缺陷闭环：
//   · pointerdown 挂 .active 即触发 `.pull-panels-canvas` 的 0.34s CSS 滑入（与手指解耦）；
//   · canvas.dragging 类无样式效果 → 滑道不被压制；事件迟到/低帧率时面板先于手指到达
//     （ty≈0）而壳状态栏 α 通道仍跟手指（≈1）→ 全亮状态栏叠在面板 CollapsedShadeHeader
//     上 = 「状态栏重叠两次」；
//   · pointerup 提交时 pendingPanelVisual 可能落后于最新指针位 → flush 冲出陈旧值 →
//     面板被拽回中部二次下滑（第二重穿帮）。
//
// 本文件四闸（#265 锚点制：每条带 `路径:行号` 锚）：
//   A 组 纯函数：dragVisualAt 段映射（move 跟手与 commit 共用单一真源）——直接 import 实算；
//   B 组 commit 权威终态：pointerup 分支以 currentY 重算段映射并覆写 pending（三行序）；
//   C 组 强制重算：flushPanelVisual 在 applyPanelVisual 后强制 reflow（补间起点=真实值）；
//   D 组 CSS 压制：.pull-panels-canvas.dragging { transition:none !important }（拖拽期
//      面板严格跟手，.active 滑道仅剩 openPullPanel 补间路径）。
//
// 常青声明：v323-<行为> 常青锚。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dragVisualAt } from '../ios-desktop/js/pull-down-gesture.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

describe('v323 · A 组：dragVisualAt 段映射纯函数', () => {
  const TH = (h) => h * 0.38;
  const SR = (h) => h * 0.42;

  it('段一：dy=0 → 面板全隐（-100%）且 alpha=1、无场景驱动', () => {
    const r = dragVisualAt(0, 900);
    expect(r.reachedFull).toBe(false);
    expect(r.sceneTarget).toBeNull();
    expect(r.visual.unit).toBe('%');
    expect(r.visual.offset).toBe(-100);
    expect(r.visual.overlayOpacity).toBe(0);
  });

  it('段一边界：dy=0.38H → 面板恰满开（0%）且 alpha=0', () => {
    const r = dragVisualAt(TH(900), 900);
    expect(r.visual.offset).toBeCloseTo(0, 6);
    expect(r.visual.overlayOpacity).toBeCloseTo(1, 6);
  });

  it('段二：dy>0.38H → reachedFull + 场景线性钳 1', () => {
    const r = dragVisualAt(TH(900) + SR(900) * 0.5, 900);
    expect(r.reachedFull).toBe(true);
    expect(r.sceneTarget).toBeCloseTo(0.5, 6);
    expect(r.visual.unit).toBe('px');
    expect(r.visual.overlayOpacity).toBe(1);
  });

  it('段二满开：dy=0.38H+0.42H → sceneTarget=1、过拉 0（未超总程）', () => {
    const r = dragVisualAt(TH(900) + SR(900), 900);
    expect(r.sceneTarget).toBe(1);
    expect(r.visual.offset).toBe(0);
  });
});

describe('v323 · B/C 组：pull-down-gesture.js 接线锚', () => {
  const g = src('ios-desktop/js/pull-down-gesture.js');

  it('B commit 权威终态：pointerup 以 currentY 重算段映射并覆写 pending（序：commit→flush）', () => {
    expect(g).toContain('const commit = dragVisualAt(dyCommit, window.innerHeight);');
    expect(g).toContain('pendingSceneProgress = commit.sceneTarget;');
    expect(g).toContain('pendingPanelVisual = commit.visual;');
    expect(g.indexOf('pendingPanelVisual = commit.visual;'))
      .toBeLessThan(g.indexOf('flushPanelVisual(); // 先落真实终帧'));
  });

  it('B move 跟手与 commit 同源（move 分支消费 dragVisualAt）', () => {
    expect(g).toContain('const { visual, sceneTarget, reachedFull } = dragVisualAt(dy, screenH);');
    // 旧的双处内联段映射退役（防两处分叉漂移）
    expect(g).not.toContain("schedulePanelVisual({ overlayOpacity: progress, unit: '%', offset: translateY })");
  });

  it('C 强制重算：flushPanelVisual 在 applyPanelVisual 后 reflow（补间起点=真实值）', () => {
    expect(g).toMatch(/if \(vis\) \{\s*applyPanelVisual\(vis\);[\s\S]{0,400}?void c\.offsetWidth;/);
  });
});

describe('v323 · D 组：滑道与 α 通道锚', () => {
  const css = src('ios-desktop/css/pull-panels.css');

  it('.active 滑道规则本体原样（openPullPanel 补间路径不受影响）', () => {
    expect(css).toContain('.pull-panels-overlay.active .pull-panels-canvas {\n  transform: translate3d(0, 0, 0);\n}');
  });

  it('dragging 压制试挂已回滚（净负向实测：ghost 从快速组 1-2 帧扩散到全组 1-5 帧）+ 登记在录', () => {
    // 负向锚匹配「实规则形态」（选择器+换行声明体）；登记注释内的行内提及不误伤
    expect(css).not.toMatch(/\.pull-panels-canvas\.dragging \{\s*\n\s*transition: none !important;/);
    expect(css).toContain('#323 诚实登记');
  });

  it('状态栏 α 通道语义原样（AOSP expansion → alpha 反向映射）', () => {
    const g2 = src('ios-desktop/js/pull-down-gesture.js');
    expect(g2).toContain('return 1 - p;');
    expect(g2).toContain('applyStatusBarShadeFade(v.overlayOpacity);');
  });
});
