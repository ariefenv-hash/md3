// ==================== scene-surface.test.js — #83 QQS→QS 同面展开 ====================
// #83 验收：AOSP 二次下拉无「换页」——QQS 2×2 大磁贴 = 全量网格前 4 磁贴本体（同一套
// tile 记录），展开是同一表面生长。旧实现（双独立 DOM 列 + 轨道整页 translate3d(0,-50%×p)
// 翻页）退役。本文件：
//   A. scene-morph.js 纯逻辑（位姿差分/插值/交接滞回阈/渐现曲线/通知退场）——零 DOM 纪律
//   B. 接线锚（pull-down-gesture.js morph 相位机 + quick-settings 重同步钩子 + CSS 叠加层）
// e2e 真跑（rect 连续性/低层零位移/全量磁贴数）见 scripts/e2e-v83-scene-surface.mjs。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');

import {
  SWAP_ON, SWAP_OFF, REVEAL_START, REVEAL_END, NOTI_FADE_END, NOTI_SHIFT_PX,
  clamp01, computePose, isMorphable, poseCssAt,
  shouldSwapOn, shouldSwapOff, foldedRevealAlpha, notiAlpha, notiShiftPx,
} from '../ios-desktop/js/scene-morph.js';

// ==================== A. 纯逻辑 ====================
describe('v8.3 #83 · A scene-morph 纯逻辑：位姿差分与插值', () => {
  // 基准矩形：QQS 大磁贴 → 网格宽磁贴（真实几何量级：位移为主、轻微缩放）
  const FROM = { left: 100, top: 200, width: 180, height: 72 };
  const TO = { left: 96, top: 300, width: 176, height: 72 };

  it('computePose：FLIP 分量 dx/dy/sx/sy（transform-origin 0 0 语义）', () => {
    const pose = computePose(FROM, TO);
    expect(pose.dx).toBeCloseTo(-4, 6);
    expect(pose.dy).toBeCloseTo(100, 6);
    expect(pose.sx).toBeCloseTo(176 / 180, 6);
    expect(pose.sy).toBeCloseTo(1, 6);
  });

  it('poseCssAt：p=0 恒等（空串交还 CSS 单源）；p=1 精确落位 to；p=0.5 线性半程', () => {
    expect(poseCssAt(FROM, TO, 0)).toBe('');
    expect(poseCssAt(FROM, TO, -0.3)).toBe(''); // 越界钳制 → 恒等
    const full = poseCssAt(FROM, TO, 1);
    const m1 = full.match(/translate3d\((-?[\d.]+)px, (-?[\d.]+)px, 0\) scale\((-?[\d.]+), (-?[\d.]+)\)/);
    expect(m1).not.toBeNull();
    expect(parseFloat(m1[1])).toBeCloseTo(-4, 2);
    expect(parseFloat(m1[2])).toBeCloseTo(100, 2);
    expect(parseFloat(m1[3])).toBeCloseTo(176 / 180, 4);
    expect(parseFloat(m1[4])).toBeCloseTo(1, 4);
    const half = poseCssAt(FROM, TO, 0.5);
    const m2 = half.match(/translate3d\((-?[\d.]+)px, (-?[\d.]+)px, 0\) scale\((-?[\d.]+), (-?[\d.]+)\)/);
    expect(parseFloat(m2[1])).toBeCloseTo(-2, 2);       // -4 × 0.5
    expect(parseFloat(m2[2])).toBeCloseTo(50, 2);       // 100 × 0.5
    expect(parseFloat(m2[3])).toBeCloseTo(1 - (1 - 176 / 180) * 0.5, 4);
    expect(parseFloat(m2[4])).toBeCloseTo(1, 4);
  });

  it('poseCssAt 单调性：位移分量随 p 严格单调（rect 连续性的数学前提）', () => {
    let prevDy = -Infinity;
    for (let p = 0; p <= 1.0001; p += 0.1) {
      const s = poseCssAt(FROM, TO, p);
      const dy = s === '' ? 0 : parseFloat(s.match(/, (-?[\d.]+)px/)[1]);
      expect(dy).toBeGreaterThanOrEqual(prevDy);
      prevDy = dy;
    }
  });

  it('isMorphable：量测守卫（零尺寸/非有限/极端缩放拒绝）', () => {
    expect(isMorphable(FROM, TO)).toBe(true);
    expect(isMorphable({ ...FROM, width: 0 }, TO)).toBe(false);
    expect(isMorphable({ ...FROM, left: NaN }, TO)).toBe(false);
    expect(isMorphable(FROM, { ...TO, width: FROM.width * 25 })).toBe(false); // sx=25 > 20
    expect(isMorphable(FROM, null)).toBe(false);
    expect(isMorphable(null, TO)).toBe(false);
  });

  it('clamp01：NaN 防御回 0，越界双端钳制', () => {
    expect(clamp01(NaN)).toBe(0);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(2)).toBe(1);
  });
});

describe('v8.3 #83 · A2 交接滞回阈与渐现曲线', () => {
  it('交接阈：p≥0.995 落定交接 / p≤0.985 反向交接，滞回带 (0.985, 0.995) 双触发互斥', () => {
    expect(SWAP_OFF).toBeLessThan(SWAP_ON);
    expect(shouldSwapOn(SWAP_ON)).toBe(true);
    expect(shouldSwapOn(SWAP_ON - 0.001)).toBe(false);
    expect(shouldSwapOn(0.5)).toBe(false);
    expect(shouldSwapOff(SWAP_OFF)).toBe(true);
    expect(shouldSwapOff(SWAP_OFF + 0.001)).toBe(false);
    // 滞回带内两判定同时为 false（不闪烁的数学前提）
    for (let p = SWAP_OFF; p <= SWAP_ON; p += 0.0005) {
      expect(shouldSwapOn(p) && shouldSwapOff(p)).toBe(false);
    }
  });

  it('折叠磁贴渐现：REVEAL 带外端点收敛，带内线性（0.49 恰为半程 0.5）', () => {
    expect(foldedRevealAlpha(0)).toBe(0);
    expect(foldedRevealAlpha(REVEAL_START)).toBe(0);
    expect(foldedRevealAlpha((REVEAL_START + REVEAL_END) / 2)).toBeCloseTo(0.5, 6);
    expect(foldedRevealAlpha(REVEAL_END)).toBe(1);
    expect(foldedRevealAlpha(1)).toBe(1);
    expect(foldedRevealAlpha(-0.5)).toBe(0);
  });

  it('通知退场：alpha 半程淡尽（NOTI_FADE_END=0.5）；上推位移二次缓出峰 -24px', () => {
    expect(NOTI_FADE_END).toBe(0.5);
    expect(notiAlpha(0)).toBe(1);
    expect(notiAlpha(0.25)).toBeCloseTo(0.5, 6);
    expect(notiAlpha(0.5)).toBeCloseTo(0, 6);
    expect(notiAlpha(1)).toBeCloseTo(0, 6);
    expect(NOTI_SHIFT_PX).toBe(24);
    expect(notiShiftPx(0)).toBeCloseTo(0, 6);
    expect(notiShiftPx(0.5)).toBeCloseTo(-6, 6);   // -24 × 0.25（t² 二次缓出）
    expect(notiShiftPx(1)).toBeCloseTo(-24, 6);
    expect(notiShiftPx(0.2)).toBeCloseTo(-24 * 0.04, 6);
  });
});

// ==================== B. 接线锚 ====================
describe('v8.3 #83 · B 接线锚（同面展开相位机）', () => {
  const gestureJs = read('ios-desktop/js/pull-down-gesture.js');
  const morphJs = read('ios-desktop/js/scene-morph.js');
  const qsJs = read('ios-desktop/js/quick-settings.js');
  const css = read('ios-desktop/css/pull-panels.css');
  const indexHtml = read('ios-desktop/index.html');

  it('scene-morph.js 纯逻辑纪律：零 DOM 访问（纯函数层，与 aosp-* 模块同律）', () => {
    expect(morphJs).not.toContain('document.');
    expect(morphJs).not.toContain('getElementById');
    expect(morphJs).not.toContain('window.');
  });

  it('手势接线：morph 相位机三入口（拖拽双向起拍 + tweenScene 起拍）+ 复位走 applySceneMorph(0)', () => {
    expect(gestureJs).toContain("from './scene-morph.js'");
    // 两处拖拽起拍 + tweenScene 起拍 = 三入口
    expect(gestureJs.match(/startSceneMorphPhase\(\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(gestureJs).toContain('sceneMorphSwap = true');
    expect(gestureJs).toContain('sceneMorphSwap = false');
    expect(gestureJs).toContain('qsColumn.style.visibility = p <= 0.001');
    // 落定态内联 'auto'（空串会回退叠加层 CSS 基线 none → 整层不可交互，探针实锤）
    expect(gestureJs).toContain("qsColumn.style.pointerEvents = p > 0.5 ? 'auto' : 'none'");
    // hover 帧不开新手势（无按键 pointermove 幽灵拖拽历史缺口）
    expect(gestureJs).toContain('e.buttons === 0) return');
    expect(gestureJs).toContain('notiShiftPx(p)');
    expect(gestureJs).toContain('foldedRevealAlpha(p)');
    // 越界清理（v11.30：split 零写入守卫已随分家分支退役，仅保留异常清理）
    expect(gestureJs).toContain('resetSceneMorphInline()');
    expect(gestureJs).not.toContain('SPLIT_SHADE_MQ');
  });

  it('节点交接簿记：QQS 隐/网格显双向（位姿重合帧交接，rect 跨采样连续）', () => {
    expect(gestureJs).toContain("qqsEl.style.opacity = '0'");
    expect(gestureJs).toContain("gridEl.style.opacity = '0'");
    expect(gestureJs).toContain('poseCssAt(fromRect, toRect, p)');
    // 交接后网格 counterpart 恢复 CSS 单源
    expect(gestureJs).toContain("gridEl.style.opacity = ''");
  });

  it('quick-settings 重建重同步：renderQuickSettingsGrid 尾部调 __sceneMorphResync（scene=1 重建防双像）', () => {
    expect(qsJs).toContain('window.__sceneMorphResync');
    expect(gestureJs).toContain('window.__sceneMorphResync = () =>');
  });

  it('CSS：QS 叠加层 + morphing 相位让位 + stagger 收窄 .qqs-grid（v11.30：split 还原块退役，叠加层全断点统一）', () => {
    expect(css).toMatch(/\.pull-panels-track > \.qs-column \{[^}]*position: absolute;[^}]*z-index: 2;/s);
    expect(css).toMatch(/\.pull-panels-track\.scene-morphing \.qs-tile-pill \{[^}]*animation: none !important;/s);
    expect(css).toMatch(/\.pull-panels-canvas\.enter-stagger \.qqs-grid \.qs-tile-pill \{/);
    expect(css).not.toMatch(/\.pull-panels-canvas\.enter-stagger \.qs-tile-pill \{/); // 旧全城作用域退役
    // v11.30 反锚：分家文档流还原块不得回流
    expect(css).not.toMatch(/@media \(min-width: 600px\) \{[\s\S]*?\.pull-panels-track > \.qs-column \{[\s\S]*?position: relative/);
  });

  it('index.html 结构零变化：双列场景 DOM 保持（同面展开只在机制层，不在结构层）', () => {
    expect(indexHtml).toContain('<section class="shade-column" id="shadeColumn">');
    expect(indexHtml).toContain('<section class="qs-column" id="qsColumn">');
    expect(indexHtml).toContain('id="qqsTilesContainer"');
    expect(indexHtml).toContain('id="qsTilesContainer"');
    expect(indexHtml).toContain('id="notiPanelScroll"');
    expect(indexHtml).toContain('id="collapsedShadeHeader"');
  });
});
