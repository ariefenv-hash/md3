import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

/**
 * v8.19 · #41 —— 桌面图标拖拽与页面滚动解耦（拖图标仅图标动）
 *
 * 根因（触摸流时序）：
 *   touchstart 落在图标时 state.iconDragState 尚未创建（长按 380ms 才 lift），
 *   main.js 桌面翻页手势（Live Pager）此时武装且 touchmove 不检查 lift 状态——
 *   图标 lift 后继续横移 → desktopLiveMode 激活 → 页面跟随图标移动（议题实锤）。
 *   mouse 版因 mousedown 即排除 .app-icon 目标而无此问题。
 * 修复（生命周期让位，非 touchstart 目标排除）：
 *   touchmove 顶部检测 iconDragState/isEditMode → 解除武装（+防御 settle）并 return；
 *   保留「从图标起手横滑翻页」的 AOSP 行为（lift 前的横向位移仍归工作区翻页）。
 * 附带（议题执行要点）：边缘翻页区 48→60、驻留 300→500ms（~60dp/~500ms 才翻页）。
 */
describe('v8.19 · #41 图标拖拽与页面滚动解耦', () => {
  const mainJs = src('ios-desktop/js/main.js');
  const dragJs = src('ios-desktop/js/drag-reorder.js');

  const slice = (s, startRe, endRe) => {
    const a = s.search(startRe);
    const b = s.slice(a + 1).search(endRe);
    return s.slice(a, a + 1 + b);
  };

  test('touchmove 生命周期让位：lift 后解除武装 + 防御 settle + return（不误入 Live Pager）', () => {
    const block = slice(mainJs, /dom\.desktop\.addEventListener\('touchmove'/, /dom\.desktop\.addEventListener\('touchend'/);
    expect(block).toContain('if (state.iconDragState || state.isEditMode) {');
    expect(block).toContain('if (desktopSwipeActive || desktopLiveMode) {');
    expect(block).toContain('if (desktopLiveMode) settleLiveSwipe();');
    expect(block).toContain('desktopSwipeActive = false;');
    expect(block).toContain('v8.19（#41）');
    // 让位分支必须先于武装检查（return 在 moveLiveSwipe 之前）
    expect(block.indexOf('state.iconDragState || state.isEditMode')).toBeLessThan(block.indexOf('moveLiveSwipe'));
  });

  test('触摸流不排除图标目标（保留从图标起手横滑翻页）；mouse 版排除保持对称', () => {
    const ts = slice(mainJs, /dom\.desktop\.addEventListener\('touchstart'/, /dom\.desktop\.addEventListener\('touchmove'/);
    expect(ts).not.toContain("closest('.app-icon')"); // 生命周期让位方案：touchstart 不加目标排除
    const md = slice(mainJs, /dom\.desktop\.addEventListener\('mousedown'/, /window\.addEventListener\('mousemove'/);
    expect(md).toContain("closest('.app-icon')"); // mouse 版既有排除不回潮
    expect(md).toContain('state.iconDragState || state.isEditMode');
  });

  test('边缘翻页参数（议题执行要点）：边缘区 60 / 驻留 500ms（左右两分支同值）', () => {
    const fn = slice(dragJs, /function checkEdgeAutoPaging/, /function updateTargetOnNewPage/);
    expect(fn).toContain('const edgeWidth = 60;');
    expect(fn).toContain('}, 500);');
    const hits = fn.match(/}, 500\);/g) || [];
    expect(hits).toHaveLength(2); // 左/右两分支
    expect(fn).not.toContain('}, 300);'); // 旧驻留退役
    expect(fn).not.toContain('= 48;'); // 旧边缘区退役
  });

  test('lift 动画体系在位（放大 + 双层投影，v7.84）：拖起跟手仍 1:1', () => {
    const css = src('ios-desktop/css/desktop.css');
    expect(css).toMatch(/\.app-icon\.dragging-active,[^]*?filter: drop-shadow\(0 20px 30px[^]*?drop-shadow\(0 0 16px/s);
    expect(css).toContain('will-change: transform;');
    expect(dragJs).toContain('scale(1.15)'); // JS lift 放大（跟手克隆体）
  });
});
