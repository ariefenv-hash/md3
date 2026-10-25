// ==================== v810-switch-thumb-vertical.test.js — 开关小球垂直偏移同源守护 ====================
//
// 背景（#79，用户报告：按压/拖拽小球放大过程中「上方占满、下方仍有像素级间隙」）：
//   render()/applyDragVisual() 用 translateY(-50%) —— 百分比参考元素自身 height，
//   而 height 逐帧 24↔28：浏览器同帧内按新 height 解析 -50%（-14px）但光栅化仍用
//   旧 height（24px）参与（或反之），先 transform 后 size 的写入顺序存在一帧错配
//   窗口 → 球顶贴死、球底空出（视觉偏上）。稳定后追平，故只在动画中间帧可见 ——
//   静态测量永远对称（4/4 与 2/2），旧测试全部测不出来。
// v8.10 修复（三重消除，不改任何几何常量）：
//   ① 弃用 -50% → 显式像素 -size/2
//   ② 写入顺序固定：先 width/height，后 transform（transform 求值时尺寸已确定）
//   ③ 垂直偏移与尺寸同源自 sizeSpring.x（同一 spring 值的纯函数，任何帧不可分叉）
//   CSS 无 JS 回退路径（.md3-switch .thumb 两条规则）同步显式像素化（-12px = 24 球半高）。
//
// 测试口径（#79 DoD）：行为级逐帧断言 —— stub rAF 手动步进真实 Spring（解析闭式解，
//   任意 dt 无累积误差），采样 28→24 收敛全程每个中间帧，断言 translateY === -size/2
//   与上下端隙对称（|gapTop−gapBottom| < 0.5px）；叠加源码锚定守护写序与 CSS 形态。

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'ios-desktop/js/m3-controls.js'), 'utf8');
const css = readFileSync(join(root, 'ios-desktop/css/md3-theme.css'), 'utf8');

const { initM3Switch } = await import('../ios-desktop/js/m3-controls.js');

// ---------- 行为级夹具 ----------

function makeSwitch(checked = false) {
  const label = document.createElement('label');
  label.className = 'md3-switch';
  label.innerHTML =
    `<input type="checkbox"${checked ? ' checked' : ''}>` +
    `<span class="slider"><span class="thumb"></span></span>`;
  document.body.appendChild(label);
  return label;
}

// 合成指针事件（happy-dom 无 PointerEvent 构造器；引擎只读 button/pointerId/clientX）
const pe = (type, clientX = 0, pointerId = 1) => {
  const e = new Event(type, { bubbles: true, cancelable: true });
  e.button = 0;
  e.pointerId = pointerId;
  e.clientX = clientX;
  return e;
};

let rafQueue = [];
let simNow = 0;
const startRafStub = () => {
  rafQueue = [];
  simNow = performance.now();
  vi.stubGlobal('requestAnimationFrame', (cb) => { rafQueue.push(cb); return rafQueue.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
};

/** 逐帧步进真实弹簧动画，每帧后采样 thumb 落笔样式（#79 逐帧断言核心） */
function collectFrames(thumb, dtMs = 16.7, maxFrames = 400) {
  const frames = [];
  let guard = 0;
  while (rafQueue.length && guard++ < maxFrames) {
    simNow += dtMs;
    rafQueue.shift()(simNow);
    const w = parseFloat(thumb.style.width);
    const h = parseFloat(thumb.style.height);
    const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(thumb.style.transform || '');
    frames.push({
      w, h,
      tx: m ? parseFloat(m[1]) : NaN,
      ty: m ? parseFloat(m[2]) : NaN,
    });
  }
  return frames;
}

// 轨道系几何（slider padding 盒 52×32，thumb top:50% → 垂直锚 16px）：
//   gapTop = 16 + ty；gapBottom = 16 − ty − h ⇒ 对称 ⇔ ty = −h/2
const gapTop = (f) => 16 + f.ty;
const gapBottom = (f) => 16 - f.ty - f.h;

describe('v8.10 开关小球垂直偏移同源（#79 逐帧断言）', () => {
  beforeEach(startRafStub);
  afterEach(() => vi.unstubAllGlobals());

  it('静息四态稳定几何不变：24 球端隙 4/4、28 球端隙 2/2（常量零改动守护）', () => {
    const label = makeSwitch(false);
    initM3Switch(label);
    const thumb = label.querySelector('.thumb');
    const snap = () => ({
      w: parseFloat(thumb.style.width),
      tx: /translate\(([-\d.]+)px/.exec(thumb.style.transform)[1] | 0,
      ty: /,\s*([-\d.]+)px\)/.exec(thumb.style.transform)[1] | 0,
    });
    const gapOf = (g) => ({ top: 16 + g.ty, bottom: 16 - g.ty - g.w });

    // 静息关：x=4 球 24 → translate(4px, -12px)，垂直 gap 16-12=4 / 32-16-12=4
    let g = snap();
    expect(g).toEqual({ w: 24, tx: 4, ty: -12 });
    expect(gapOf(g)).toEqual({ top: 4, bottom: 4 });

    // 按压关（SnapSpec 瞬时）：x=2 球 28 → translate(2px, -14px)，gap 2/2
    label.dispatchEvent(pe('pointerdown', 100));
    g = snap();
    expect(g).toEqual({ w: 28, tx: 2, ty: -14 });
    expect(gapOf(g)).toEqual({ top: 2, bottom: 2 });

    // 释放（无位移 = 轻点）→ checked 翻转 → 弹簧落定静息开
    label.dispatchEvent(pe('pointerup', 100));
    collectFrames(thumb);
    g = snap();
    expect(g).toEqual({ w: 24, tx: 24, ty: -12 });
    expect(gapOf(g)).toEqual({ top: 4, bottom: 4 });
    expect(label.querySelector('input').checked).toBe(true);

    // 按压开：x=22 球 28
    label.dispatchEvent(pe('pointerdown', 100));
    g = snap();
    expect(g).toEqual({ w: 28, tx: 22, ty: -14 });
    expect(gapOf(g)).toEqual({ top: 2, bottom: 2 });
    label.dispatchEvent(pe('pointerup', 100));
    collectFrames(thumb);
    expect(label.querySelector('input').checked).toBe(false);

    // 程序化切换（change 事件路径）→ 静息开
    const input = label.querySelector('input');
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    collectFrames(thumb);
    g = snap();
    expect(g).toEqual({ w: 24, tx: 24, ty: -12 });
    label.remove();
  });

  it('释放收敛全程逐帧同源：28→24 每个中间帧 translateY === -size/2 且端隙对称 <0.5px', () => {
    const label = makeSwitch(false);
    initM3Switch(label);
    const thumb = label.querySelector('.thumb');

    const allFrames = [];
    // 3 轮按压/释放，每轮换采样步长（16.7/8.35/5ms）：弹簧确定性 → 同 dt 三轮序列全等，
    // 变步长打散采样相位 → 覆盖足量不同中间值
    for (const dt of [16.7, 8.35, 5]) {
      label.dispatchEvent(pe('pointerdown', 100));   // snapTo 28（瞬时）
      expect(rafQueue.length).toBe(0);               // SnapSpec 不走 rAF —— 瞬时语义
      label.dispatchEvent(pe('pointerup', 100));     // settleTo → FastSpatial 弹簧
      const frames = collectFrames(thumb, dt);
      expect(frames.length).toBeGreaterThanOrEqual(15); // 真弹簧逐帧动画（非跳变）
      allFrames.push(...frames);
    }

    // 中间帧量足够覆盖 20 个不同中间值（#79 DoD：模拟 20 个中间值逐个断言）
    const midSizes = new Set(allFrames.filter((f) => f.h > 24 && f.h < 28).map((f) => f.h.toFixed(2)));
    expect(midSizes.size).toBeGreaterThanOrEqual(20);

    for (const f of allFrames) {
      expect(Math.abs(f.ty + f.w / 2)).toBeLessThan(0.06);  // translateY ≡ -size/2（同源，含 2 位小数舍入）
      expect(Math.abs(gapTop(f) - gapBottom(f))).toBeLessThan(0.5); // #79 验收口径：端隙差 < 0.5px
    }
    // 落定值精确回 24 球
    const last = allFrames[allFrames.length - 1];
    expect(last.w).toBe(24);
    expect(last.ty).toBe(-12);
    label.remove();
  });

  it('拖拽全程逐帧同源：applyDragVisual 各 ratio 垂直分量恒 -14（28 球）且与已落笔尺寸同源', () => {
    const label = makeSwitch(false);
    initM3Switch(label);
    const thumb = label.querySelector('.thumb');

    label.dispatchEvent(pe('pointerdown', 100));
    for (const x of [120, 90, 60, 110, 100, 80]) {  // 左右往复拖拽（含跨中线）
      label.dispatchEvent(pe('pointermove', x));
      collectFrames(thumb);                          // 拖拽 rAF 落帧（含 applyDragVisual）
      const w = parseFloat(thumb.style.width);
      const ty = /,\s*([-\d.]+)px\)/.exec(thumb.style.transform)[1] | 0;
      expect(w).toBe(28);                            // 拖拽态恒按压几何 28px
      expect(ty).toBe(-14);                          // 显式像素 = -28/2（不再是 -50%）
      const f = { w, h: w, ty };
      expect(Math.abs(gapTop(f) - gapBottom(f))).toBeLessThan(0.5);
    }
    label.dispatchEvent(pe('pointerup', 80));
    collectFrames(thumb);
    label.remove();
  });

  it('轻点切换落位：28→24 弹簧全程同源，终态 24 球严格居中（无 -50% 遗留观感）', () => {
    const label = makeSwitch(true);
    initM3Switch(label);
    const thumb = label.querySelector('.thumb');
    expect(parseFloat(thumb.style.width)).toBe(24);

    label.dispatchEvent(pe('pointerdown', 100));  // 按压 28
    label.dispatchEvent(pe('pointerup', 100));    // 轻点 → checked 翻转 + settleTo(24)
    const frames = collectFrames(thumb);
    expect(frames.length).toBeGreaterThanOrEqual(15);
    for (const f of frames) {
      expect(Math.abs(f.ty + f.w / 2)).toBeLessThan(0.06);
      expect(Math.abs(gapTop(f) - gapBottom(f))).toBeLessThan(0.5);
    }
    expect(label.querySelector('input').checked).toBe(false);
    label.remove();
  });
});

describe('v8.10 源码锚定（写序 + 显式像素 + CSS 回退路径）', () => {
  it('render()：先尺寸后 transform（写入顺序守护）+ 垂直分量与尺寸同源 (-size/2)', () => {
    const block = src.slice(src.indexOf('function render() {'), src.indexOf('function loop('));
    const iW = block.indexOf('thumb.style.width');
    const iH = block.indexOf('thumb.style.height');
    const iT = block.indexOf('thumb.style.transform');
    expect(iW).toBeGreaterThan(-1);
    expect(iH).toBeGreaterThan(iW);   // width 先于 height
    expect(iT).toBeGreaterThan(iH);   // transform 最后 —— 求值时尺寸已确定（#79 DoD）
    expect(block).toContain('(-size / 2).toFixed(2)');
  });

  it('render()/applyDragVisual() 旧形态 translate(..., -50%) 全库清零', () => {
    expect(src).not.toContain('translate(${xSpring.x.toFixed(2)}px, -50%)');
    expect(src).not.toContain('translate(${visualX.toFixed(1)}px, -50%)');
  });

  it('applyDragVisual()：垂直偏移同源取自 sizeSpring.x（不再依赖另一驱动路径的尺寸）', () => {
    const block = src.slice(src.indexOf('function applyDragVisual('), src.indexOf('function flushDragVisual('));
    expect(block).toContain('(-sizeSpring.x / 2)');
    expect(block).not.toContain('-50%)`');
  });

  it('CSS 无 JS 回退路径：两条 .thumb 规则 transform 全部显式像素（零百分比）', () => {
    const thumbBlock = css.slice(css.indexOf('.md3-switch .thumb {'), css.indexOf('.md3-switch input:checked + .slider {'));
    const checkedBlock = css.slice(css.indexOf('.md3-switch input:checked + .slider .thumb {'), css.indexOf('/* v7.91：键盘焦点环'));
    for (const [name, block] of [['.md3-switch .thumb', thumbBlock], ['checked .thumb', checkedBlock]]) {
      const decls = block.match(/transform:\s*[^;]+;/g) || [];
      expect(decls.length, name).toBeGreaterThan(0);
      for (const d of decls) expect(d, name).not.toContain('%');   // 显式像素，无 -50%
    }
    expect(thumbBlock).toContain('translate(4px, -12px)');          // 静息关（24 球半高）
    expect(checkedBlock).toContain('translate(24px, -12px)');       // 静息开
  });

  it('几何常量零改动（#79 §七：只改表达方式，不动任何源码数值）', () => {
    expect(src).toContain('const THUMB_REST = 24;');
    expect(src).toContain('const THUMB_PRESSED = 28;');
    expect(src).toContain('const REST_X_OFF = (SWITCH_TRACK_H - THUMB_REST) / 2;');
    expect(src).toContain('const REST_X_ON = (SWITCH_TRACK_W - THUMB_REST) - REST_X_OFF;');
    expect(src).toContain('const PRESS_X_OFF = 2;');
    expect(src).toContain('const PRESS_X_ON = REST_X_ON - 2;');
  });

  it('§七 同模式排查锚定：静态尺寸竖柄的 translate(-50%,-50%) 有意保留（无动态耦合）', () => {
    // m3-slider-thumb-bar 6×60 静态尺寸 —— 百分比参考值恒定，无时序错配窗口；
    // 守护其存在以防未来误删，同时守护开关球路径不回退到此形态
    expect(src).toContain("'translateX(' + x.toFixed(1) + 'px) translate(-50%,-50%)'");
  });
});
