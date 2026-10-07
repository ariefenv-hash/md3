// ==================== v7.54 修复锚定测试 ====================
// 用户回访：开关小球拖拽中卡住（v7.49 修了 pointercancel 回弹后仍残留）。
// 根因：rAF 合帧以 pendingRatio >= 0 判「有待写帧」，而真实拖拽比例向左越过
// 起点 20px 后恒为负 → 整段负比例被当作空哨兵吞掉，快速左甩关断时小球冻结
// 在中途不再跟手。本批次：
//   ① 比例入队前钳制 [0,1] + hasPending 显式标志（冻结根治）
//   ② 多指不串扰（isDown 中忽略第二 pointerdown + activePointerId 过滤 move/up）
//   ③ lostpointercapture 兜底提交（无 up/cancel 时不残留拖拽态）
// 同时回归锚定 v7.49 语义：cancel 走同源完成判定、无位移取消不切换。
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initM3Switch } from '../ios-desktop/js/m3-controls.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf-8');

/** 构造真实 DOM 开关并绑定拖拽引擎（几何常量与线上 CSS 同源：52px 轨道，行程 20px） */
function makeSwitch(checked) {
  const label = document.createElement('label');
  label.className = 'md3-switch';
  label.innerHTML = '<input type="checkbox"><span class="slider"><span class="thumb"></span></span>';
  const input = label.querySelector('input');
  input.checked = checked;
  document.body.appendChild(label);
  initM3Switch(label);
  return { label, input, thumb: label.querySelector('.thumb'), slider: label.querySelector('.slider') };
}

function pev(type, opts = {}) {
  return new PointerEvent(type, {
    pointerId: 1, pointerType: 'touch', button: 0, bubbles: true,
    clientX: 100, clientY: 0,
    ...opts,
  });
}

describe('v7.54 → ① 拖拽负比例冻结根治（用户报告「拖拽时小球还是卡住」）', () => {
  let rafQ;
  beforeEach(() => {
    rafQ = [];
    vi.stubGlobal('requestAnimationFrame', (cb) => { rafQ.push(cb); return rafQ.length; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    document.body.innerHTML = '';
  });
  afterEach(() => vi.unstubAllGlobals());

  const flushFrame = () => { const cb = rafQ.shift(); if (cb) cb(performance.now()); };
  // happy-dom 读回 style.left 会把 '2.0px' 规范化为 '2px' —— 用数值断言跨实现稳健
  const leftPx = (s) => parseFloat(s.thumb.style.left);

  it('快速左甩关断：单次 move 即越过左缘，小球落到 MIN_LEFT=2px 而非冻结', () => {
    const s = makeSwitch(true); // 开态起点
    s.label.dispatchEvent(pev('pointerdown', { clientX: 100 }));
    // dx=-60 → 原始比例 1-3=-2（旧实现被 >=0 哨兵吞掉 → 视觉冻结在中途）
    s.label.dispatchEvent(pev('pointermove', { clientX: 40 }));
    flushFrame();
    expect(leftPx(s)).toBe(2);
  });

  it('连续拖拽逐帧跟手：先中段后越缘，left 单调落边不回跳', () => {
    const s = makeSwitch(true);
    s.label.dispatchEvent(pev('pointerdown', { clientX: 100 }));
    s.label.dispatchEvent(pev('pointermove', { clientX: 90 })); // ratio 0.5 → left 12px
    flushFrame();
    expect(leftPx(s)).toBe(12);
    s.label.dispatchEvent(pev('pointermove', { clientX: 55 })); // 比例转负 → 钳 0
    flushFrame();
    expect(leftPx(s)).toBe(2);
  });

  it('右向拖拽越缘同样钳制到 MAX_LEFT=22px', () => {
    const s = makeSwitch(false);
    s.label.dispatchEvent(pev('pointerdown', { clientX: 100 }));
    s.label.dispatchEvent(pev('pointermove', { clientX: 160 })); // ratio 3 → 钳 1
    flushFrame();
    expect(leftPx(s)).toBe(22);
  });

  it('松手提交语义不变：越缘拖拽按最终位置关断并派发一次 change', () => {
    const s = makeSwitch(true);
    let changes = 0;
    s.input.addEventListener('change', () => changes++);
    s.label.dispatchEvent(pev('pointerdown', { clientX: 100 }));
    s.label.dispatchEvent(pev('pointermove', { clientX: 40 }));
    flushFrame();
    s.label.dispatchEvent(pev('pointerup', { clientX: 40 }));
    expect(s.input.checked).toBe(false);
    expect(changes).toBe(1);
    expect(s.label.classList.contains('is-dragging')).toBe(false);
    expect(s.thumb.style.left).toBe(''); // 内联几何清空，交还 CSS 过渡
  });
});

describe('v7.54 → ② 多指不串扰', () => {
  let rafQ;
  beforeEach(() => {
    rafQ = [];
    vi.stubGlobal('requestAnimationFrame', (cb) => { rafQ.push(cb); return rafQ.length; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    document.body.innerHTML = '';
  });
  afterEach(() => vi.unstubAllGlobals());

  const flushFrame = () => { const cb = rafQ.shift(); if (cb) cb(performance.now()); };
  const leftPx = (s) => parseFloat(s.thumb.style.left);

  it('第二根手指按下不顶掉进行中的拖拽（startX 与捕获保持）', () => {
    const s = makeSwitch(true);
    s.label.dispatchEvent(pev('pointerdown', { clientX: 100, pointerId: 1 }));
    s.label.dispatchEvent(pev('pointermove', { clientX: 96, pointerId: 1 })); // ratio 0.8
    flushFrame();
    expect(leftPx(s)).toBe(18);
    // 第二指按下（旧实现重置 startX=300 并顶掉捕获 → 后续 move 用错误 dx 冻结/乱跳）
    s.label.dispatchEvent(pev('pointerdown', { clientX: 300, pointerId: 2 }));
    s.label.dispatchEvent(pev('pointermove', { clientX: 60, pointerId: 1 })); // dx=-40 → 钳 0
    flushFrame();
    expect(leftPx(s)).toBe(2);
    s.label.dispatchEvent(pev('pointerup', { clientX: 60, pointerId: 1 }));
    expect(s.input.checked).toBe(false);
    expect(s.label.classList.contains('is-dragging')).toBe(false);
  });

  it('非发起指针的 move/up 不污染拖拽也不劫持提交', () => {
    // 速度助力按真实时距计算：假时钟拉开事件间隔，避免同毫秒派发被误判为甩动
    vi.useFakeTimers({ toFake: ['performance'] });
    try {
      const s = makeSwitch(true);
      s.label.dispatchEvent(pev('pointerdown', { clientX: 100, pointerId: 1 }));
      vi.advanceTimersByTime(50);
      s.label.dispatchEvent(pev('pointermove', { clientX: 96, pointerId: 1 })); // 慢速 ratio 0.8
      flushFrame();
      // 陌生指针的移动与抬起均被忽略
      vi.advanceTimersByTime(50);
      s.label.dispatchEvent(pev('pointermove', { clientX: 500, pointerId: 2 }));
      flushFrame();
      s.label.dispatchEvent(pev('pointerup', { clientX: 200, pointerId: 2 }));
      expect(s.label.classList.contains('is-dragging')).toBe(true);
      expect(s.input.checked).toBe(true);
      // 发起指针收尾才真正提交（ratio 0.8 ≥ 0.5 → 保持开态）
      vi.advanceTimersByTime(50);
      s.label.dispatchEvent(pev('pointerup', { clientX: 96, pointerId: 1 }));
      expect(s.input.checked).toBe(true);
      expect(s.label.classList.contains('is-dragging')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('v7.54 → ③ lostpointercapture 兜底 + v7.49 语义回归', () => {
  let rafQ;
  beforeEach(() => {
    rafQ = [];
    vi.stubGlobal('requestAnimationFrame', (cb) => { rafQ.push(cb); return rafQ.length; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    document.body.innerHTML = '';
  });
  afterEach(() => vi.unstubAllGlobals());

  const flushFrame = () => { const cb = rafQ.shift(); if (cb) cb(performance.now()); };
  const leftPx = (s) => parseFloat(s.thumb.style.left);

  it('捕获丢失兜底：无 up/cancel 也按最后已知位置提交并清理拖拽态', () => {
    const s = makeSwitch(true);
    s.label.dispatchEvent(pev('pointerdown', { clientX: 100 }));
    s.label.dispatchEvent(pev('pointermove', { clientX: 85 })); // ratio 0.25 → 关侧
    flushFrame();
    expect(leftPx(s)).toBe(7);
    s.label.dispatchEvent(new Event('lostpointercapture')); // 无坐标，走 lastX 兜底
    expect(s.input.checked).toBe(false); // lastX=85 → dx=-15 → 0.25 < 0.5 → 关
    expect(s.label.classList.contains('is-dragging')).toBe(false);
    expect(s.thumb.style.left).toBe('');
  });

  it('v7.49 回归：cancel 坐标无效时以最后 move 位置提交', () => {
    const s = makeSwitch(true);
    s.label.dispatchEvent(pev('pointerdown', { clientX: 100 }));
    s.label.dispatchEvent(pev('pointermove', { clientX: 75 }));
    s.label.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true, clientX: 0 }));
    expect(s.input.checked).toBe(false);
  });

  it('v7.49 回归：无位移取消不切换（点击语义保持）', () => {
    const s = makeSwitch(false);
    s.label.dispatchEvent(pev('pointerdown', { clientX: 100 }));
    s.label.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true, clientX: 0 }));
    expect(s.input.checked).toBe(false);
  });

  it('轻点仍切换一次且 change 恰一次', () => {
    const s = makeSwitch(false);
    let changes = 0;
    s.input.addEventListener('change', () => changes++);
    s.label.dispatchEvent(pev('pointerdown', { clientX: 100 }));
    s.label.dispatchEvent(pev('pointerup', { clientX: 101 }));
    expect(s.input.checked).toBe(true);
    expect(changes).toBe(1);
  });
});

describe('v7.54 源码锚定', () => {
  const src = read('ios-desktop/js/m3-controls.js');

  it('比例入队前钳制 [0,1]（哨兵冲突根治）', () => {
    expect(src).toContain('pendingRatio = clamp(startRatio + dx / TRAVEL, 0, 1);');
    expect(src).toContain('let hasPending = false;');
    // 旧裸比例赋值退场
    expect(src).not.toContain('pendingRatio = startRatio + dx / TRAVEL;');
  });

  it('多指守卫与指针过滤在场', () => {
    expect(src).toContain('if (isDown) return; // v7.54：拖拽进行中忽略第二根手指');
    expect(src).toContain('e.pointerId !== activePointerId');
  });

  it('lostpointercapture 兜底提交在场', () => {
    expect(src).toContain("addEventListener('lostpointercapture'");
  });

  it('v7.49 语义保留：cancel 走同源完成判定与 lastX 兜底', () => {
    expect(src).toContain("labelEl.addEventListener('pointercancel', (e) => onEnd(e, true))");
    expect(src).toContain('const endX = cancelled && !(e.clientX > 0) ? lastX : e.clientX;');
  });
});

describe('v7.54 → ⓪ 「桌面与 Dock」设置入口补挂（v7.53 孤岛页根治）', () => {
  const tp = read('ios-desktop/js/apps/settings-two-pane.js');

  it('清单含 idx: 14「桌面与 Dock」行（home 图标 + 语义副标题）', () => {
    expect(tp).toContain("idx: 14, icon: 'home', label: '桌面与 Dock', sub: '图标网格 · Dock 栏 · 神奇效果'");
  });

  it('清单覆盖全部一级导航目标 1..14（页 3「已移除的应用」为二级页除外，防再次孤岛）', () => {
    for (const idx of [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
      expect(tp).toContain(`idx: ${idx},`);
    }
  });
});

