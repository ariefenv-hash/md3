// ==================== v102-paged-view.test.js — #102 PagedView 常量单一真源 + 判定链 ====================
//
// 覆盖（R87 窗加餐二，Launcher3 PagedView.java / ViewConfiguration 对标）：
//   · PAGED_VIEW 四常量（PAGING_TOUCH_SLOP 16 / FLING_THRESHOLD 500 /
//     SIGNIFICANT_MOVE 0.4 / RETURN_TO_ORIGINAL 0.33）
//   · resolveSnapTarget 判定链（fling 优先 → 显著位移 → 迟滞带回弹 → 最近页兜底）
//   · resolveSnapFromDisplacement 位移分数镜像换算
//   · 接线锚：main.js 意图判定 16（12 退役）/ desktop.js settle 判定链消费 /
//     settings-two-pane 四常量收编（别名绑定）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGED_VIEW, SNAP, resolveSnapTarget, resolveSnapFromDisplacement } from '../ios-desktop/js/aosp/paged-view.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const MAIN = readFileSync(R('js/main.js'), 'utf8');
const DESKTOP = readFileSync(R('js/desktop.js'), 'utf8');
const TP = readFileSync(R('js/apps/settings-two-pane.js'), 'utf8');
/** 剥注释扫描（R77 同款） */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('v102-A · PAGED_VIEW 常量单一真源（Launcher3 同值）', () => {
  it('A1 四常量精确值', () => {
    expect(PAGED_VIEW).toEqual({
      PAGING_TOUCH_SLOP: 16,
      FLING_THRESHOLD_VELOCITY: 500,
      SIGNIFICANT_MOVE_FACTOR: 0.4,
      RETURN_TO_ORIGINAL_FACTOR: 0.33,
    });
  });

  it('A2 SNAP 字面量稳定（消费方字符串契约）', () => {
    expect(SNAP).toEqual({ NEXT: 'next', PREV: 'prev', CURRENT: 'current' });
  });
});

describe('v102-B · resolveSnapTarget 判定链（ACTION_UP 同构）', () => {
  const W = 390; // md3 手机视口页宽

  it('B1 fling 优先：|v| ≥ 500px/s 直接翻页（位移无论大小）', () => {
    // 向左快甩（v<−500）→ next；位移 0.1 页不足显著位移也翻
    expect(resolveSnapTarget({ dxPx: -0.1 * W, velocityPxPerSec: -600, pageWidthPx: W })).toBe(SNAP.NEXT);
    expect(resolveSnapTarget({ dxPx: 0.1 * W, velocityPxPerSec: 600, pageWidthPx: W })).toBe(SNAP.PREV);
  });

  it('B2 fling 边界：恰 500 达标（≥ 判定），499 不翻（走位移链）', () => {
    expect(resolveSnapTarget({ dxPx: 0, velocityPxPerSec: -500, pageWidthPx: W })).toBe(SNAP.NEXT);
    expect(resolveSnapTarget({ dxPx: 0, velocityPxPerSec: 500, pageWidthPx: W })).toBe(SNAP.PREV);
    expect(resolveSnapTarget({ dxPx: 0, velocityPxPerSec: -499, pageWidthPx: W })).toBe(SNAP.CURRENT);
  });

  it('B3 显著位移 0.4f：慢拖过 0.4 页提交，朝位移方向', () => {
    expect(resolveSnapTarget({ dxPx: -0.41 * W, velocityPxPerSec: 0, pageWidthPx: W })).toBe(SNAP.NEXT);
    expect(resolveSnapTarget({ dxPx: 0.41 * W, velocityPxPerSec: 0, pageWidthPx: W })).toBe(SNAP.PREV);
    expect(resolveSnapTarget({ dxPx: -0.4 * W, velocityPxPerSec: 0, pageWidthPx: W })).toBe(SNAP.CURRENT); // 恰 0.4 未超
  });

  it('B4 迟滞带 0.33~0.4 + 0~0.33：一律回原页（RETURN_TO_ORIGINAL 语义）', () => {
    expect(resolveSnapTarget({ dxPx: -0.39 * W, velocityPxPerSec: 0, pageWidthPx: W })).toBe(SNAP.CURRENT);
    expect(resolveSnapTarget({ dxPx: -0.34 * W, velocityPxPerSec: 0, pageWidthPx: W })).toBe(SNAP.CURRENT);
    expect(resolveSnapTarget({ dxPx: -0.1 * W, velocityPxPerSec: 0, pageWidthPx: W })).toBe(SNAP.CURRENT);
  });

  it('B5 slop 修正：位移先扣 slop（two-pane 消费形态）', () => {
    // 原始位移 0.42 页含 16px slop → 扣后 (0.42×390−16)/390 ≈ 0.379 < 0.4 → 回原页
    expect(resolveSnapTarget({ dxPx: -0.42 * W, velocityPxPerSec: 0, pageWidthPx: W, slopPx: 16 })).toBe(SNAP.CURRENT);
    // 扣后仍超 → next
    expect(resolveSnapTarget({ dxPx: -0.5 * W, velocityPxPerSec: 0, pageWidthPx: W, slopPx: 16 })).toBe(SNAP.NEXT);
  });

  it('B6 零输入兜底 current（pageWidth 非法除零防护）', () => {
    expect(resolveSnapTarget({ dxPx: 0, velocityPxPerSec: 0, pageWidthPx: 0 })).toBe(SNAP.CURRENT);
    expect(resolveSnapTarget(null)).toBe(SNAP.CURRENT);
  });
});

describe('v102-C · resolveSnapFromDisplacement（livePager 消费形态）', () => {
  it('C1 位移分数镜像换算：displacementF 正（向左滑）→ next', () => {
    expect(resolveSnapFromDisplacement({ displacementF: 0.5, velocityPxPerSec: 0, winW: 390 })).toBe(SNAP.NEXT);
    expect(resolveSnapFromDisplacement({ displacementF: -0.5, velocityPxPerSec: 0, winW: 390 })).toBe(SNAP.PREV);
    expect(resolveSnapFromDisplacement({ displacementF: 0.2, velocityPxPerSec: 0, winW: 390 })).toBe(SNAP.CURRENT);
  });

  it('C2 fling 速度直传（px/s）→ 方向镜像', () => {
    expect(resolveSnapFromDisplacement({ displacementF: 0.1, velocityPxPerSec: -600, winW: 390 })).toBe(SNAP.NEXT);
    expect(resolveSnapFromDisplacement({ displacementF: 0.1, velocityPxPerSec: 600, winW: 390 })).toBe(SNAP.PREV);
  });

  it('C3 winW 非法兜底除零防护', () => {
    expect(resolveSnapFromDisplacement({ displacementF: 0.5, velocityPxPerSec: 0, winW: 0 })).toBe(SNAP.NEXT); // 1px 页宽下 0.5 页=0.5px 无意义但安全
  });
});

describe('v102-D · 接线锚（三处收编，防回退）', () => {
  it('D1 main.js：横向意图判定用 PAGING_TOUCH_SLOP（旧 12px 自定退役）', () => {
    const src = stripComments(MAIN);
    expect(src).toContain("import { PAGED_VIEW } from './aosp/paged-view.js';");
    expect(src).toContain('Math.abs(dx) > PAGED_VIEW.PAGING_TOUCH_SLOP');
    expect(src).not.toContain('Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)');
  });

  it('D2 desktop.js：settle 判定链消费（旧 140ms 投影退役）', () => {
    const src = stripComments(DESKTOP);
    expect(src).toContain("import { resolveSnapFromDisplacement, SNAP } from './aosp/paged-view.js';");
    expect(src).toContain('resolveSnapFromDisplacement({');
    expect(src).toContain('velocityPxPerSec: livePager.velX * 1000');
    expect(src).not.toContain('livePager.velX * 140');
  });

  it('D3 settings-two-pane.js：四常量收编别名绑定（消费点零改）', () => {
    const src = stripComments(TP);
    expect(src).toContain("import { PAGED_VIEW } from '../aosp/paged-view.js';");
    expect(src).toContain('const TP_PAGED_SLOP = PAGED_VIEW.PAGING_TOUCH_SLOP;');
    expect(src).toContain('const TP_FLING_THRESHOLD = PAGED_VIEW.FLING_THRESHOLD_VELOCITY;');
    expect(src).toContain('const TP_SIGNIFICANT_RATIO = PAGED_VIEW.SIGNIFICANT_MOVE_FACTOR;');
    expect(src).toContain('const TP_RETURN_ORIG_RATIO = PAGED_VIEW.RETURN_TO_ORIGINAL_FACTOR;');
    // 旧字面量退役
    expect(src).not.toContain('const TP_PAGED_SLOP = 16;');
  });
});
