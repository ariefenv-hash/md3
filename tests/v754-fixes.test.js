// ==================== v7.54 修复锚定测试（v7.89 重锚：A17 expressive 源码重写） ====================
// 用户回访：开关小球拖拽中卡住（v7.49 修了 pointercancel 回弹后仍残留）。
// 根因：rAF 合帧以 pendingRatio >= 0 判「有待写帧」，而真实拖拽比例向左越过
// 起点 20px 后恒为负 → 整段负比例被当作空哨兵吞掉，快速左甩关断时小球冻结
// 在中途不再跟手。本批次：
//   ① 比例入队前钳制 [0,1] + hasPending 显式标志（冻结根治）
//   ② 多指不串扰（isDown 中忽略第二 pointerdown + activePointerId 过滤 move/up）
//   ③ lostpointercapture 兜底提交（无 up/cancel 时不残留拖拽态）
// 同时回归锚定 v7.49 语义：cancel 走同源完成判定、无位移取消不切换。
// v7.89 重写注记：几何改由 JS 弹簧直写 transform（thumb.style.left 退役），
//   行程数值不变（DRAG_MIN=2 / DRAG_MAX=22 / TRAVEL=20）——读取器同步换为
//   transform 解析；释放后内联几何不再清空，改由 FastSpatial 弹簧落位至静息几何。
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
  // v7.89：几何由 JS 弹簧直写 transform（旧 style.left 退役）—— 解析 translate(Npx, -50%)
  const thumbX = (s) => {
    const m = /translate\((-?[\d.]+)px/.exec(s.thumb.style.transform || '');
    return m ? parseFloat(m[1]) : NaN;
  };

  it('快速左甩关断：单次 move 即越过左缘，小球落到 DRAG_MIN=2px 而非冻结', () => {
    const s = makeSwitch(true); // 开态起点
    s.label.dispatchEvent(pev('pointerdown', { clientX: 100 }));
    // dx=-60 → 原始比例 1-3=-2（旧实现被 >=0 哨兵吞掉 → 视觉冻结在中途）
    s.label.dispatchEvent(pev('pointermove', { clientX: 40 }));
    flushFrame();
    expect(thumbX(s)).toBe(2);
  });

  it('连续拖拽逐帧跟手：先中段后越缘，x 单调落边不回跳', () => {
    const s = makeSwitch(true);
    s.label.dispatchEvent(pev('pointerdown', { clientX: 100 }));
    s.label.dispatchEvent(pev('pointermove', { clientX: 90 })); // ratio 0.5 → x 12px
    flushFrame();
    expect(thumbX(s)).toBe(12);
    s.label.dispatchEvent(pev('pointermove', { clientX: 55 })); // 比例转负 → 钳 0
    flushFrame();
    expect(thumbX(s)).toBe(2);
  });

  it('右向拖拽越缘同样钳制到 DRAG_MAX=22px', () => {
    const s = makeSwitch(false);
    s.label.dispatchEvent(pev('pointerdown', { clientX: 100 }));
    s.label.dispatchEvent(pev('pointermove', { clientX: 160 })); // ratio 3 → 钳 1
    flushFrame();
    expect(thumbX(s)).toBe(22);
  });

  it('松手提交语义不变：越缘拖拽按最终位置关断并派发一次 change，弹簧连续落位到静息几何', () => {
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
    // v7.89：释放瞬间视觉连续（从拖拽位置 2px 继续落位，零跳变）
    expect(thumbX(s)).toBe(2);
    expect(parseFloat(s.thumb.style.width)).toBe(28); // 拖拽球径保持，弹簧首帧未落
    // FastSpatial 弹簧落位：连续推进帧时钟 → 静息关几何（x=4，球 24）
    for (let i = 0; i < 600; i++) flushFrame();
    expect(thumbX(s)).toBe(4);   // 静息关 offset=(32−24)/2
    expect(parseFloat(s.thumb.style.width)).toBe(24); // hasContent 恒 24
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
  // v7.89：几何由 JS 弹簧直写 transform —— 解析 translate(Npx, -50%)
  const thumbX = (s) => {
    const m = /translate\((-?[\d.]+)px/.exec(s.thumb.style.transform || '');
    return m ? parseFloat(m[1]) : NaN;
  };

  it('第二根手指按下不顶掉进行中的拖拽（startX 与捕获保持）', () => {
    const s = makeSwitch(true);
    s.label.dispatchEvent(pev('pointerdown', { clientX: 100, pointerId: 1 }));
    s.label.dispatchEvent(pev('pointermove', { clientX: 96, pointerId: 1 })); // ratio 0.8
    flushFrame();
    expect(thumbX(s)).toBe(18);
    // 第二指按下（旧实现重置 startX=300 并顶掉捕获 → 后续 move 用错误 dx 冻结/乱跳）
    s.label.dispatchEvent(pev('pointerdown', { clientX: 300, pointerId: 2 }));
    s.label.dispatchEvent(pev('pointermove', { clientX: 60, pointerId: 1 })); // dx=-40 → 钳 0
    flushFrame();
    expect(thumbX(s)).toBe(2);
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
  // v7.89：几何由 JS 弹簧直写 transform —— 解析 translate(Npx, -50%)
  const thumbX = (s) => {
    const m = /translate\((-?[\d.]+)px/.exec(s.thumb.style.transform || '');
    return m ? parseFloat(m[1]) : NaN;
  };

  it('捕获丢失兜底：无 up/cancel 也按最后已知位置提交并清理拖拽态', () => {
    const s = makeSwitch(true);
    s.label.dispatchEvent(pev('pointerdown', { clientX: 100 }));
    s.label.dispatchEvent(pev('pointermove', { clientX: 85 })); // ratio 0.25 → 关侧
    flushFrame();
    expect(thumbX(s)).toBe(7);
    s.label.dispatchEvent(new Event('lostpointercapture')); // 无坐标，走 lastX 兜底
    expect(s.input.checked).toBe(false); // lastX=85 → dx=-15 → 0.25 < 0.5 → 关
    expect(s.label.classList.contains('is-dragging')).toBe(false);
    expect(parseFloat(s.thumb.style.width)).toBe(28); // 弹簧接管中：球径仍为拖拽态
    for (let i = 0; i < 600; i++) flushFrame();
    expect(thumbX(s)).toBe(4);   // 落位静息关
    expect(parseFloat(s.thumb.style.width)).toBe(24);
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
    // v7.89 重锚：TRAVEL → DRAG_TRAVEL（常量名与 A17 规格段对齐）
    expect(src).toContain('pendingRatio = clamp(startRatio + dx / DRAG_TRAVEL, 0, 1);');
    expect(src).toContain('let hasPending = false;');
    // 旧裸比例赋值退场
    expect(src).not.toContain('pendingRatio = startRatio + dx / TRAVEL;');
  });

  it('v7.89 A17 expressive 几何与动效锚定（SwitchThumbNode + SwitchTokens 逐值）', () => {
    // hasContent 规则：✓/✕ thumbContent → 球两态恒 24dp（端隙 4/4 对称的根源）
    expect(src).toContain('const THUMB_REST = 24;');
    expect(src).toContain('const THUMB_PRESSED = 28;');
    expect(src).toContain('const REST_X_OFF = (SWITCH_TRACK_H - THUMB_REST) / 2;');
    expect(src).toContain('const REST_X_ON = (SWITCH_TRACK_W - THUMB_REST) - REST_X_OFF;');
    // FastSpatial（ExpressiveMotionTokens）：ζ0.6 / k800；按压 SnapSpec 瞬时
    expect(src).toContain('const SPRING_STIFFNESS = 800;');
    expect(src).toContain('2 * 0.6 * Math.sqrt(SPRING_STIFFNESS)');
    expect(src).toContain('snapTo(...pressGeo(input.checked));');
    expect(src).toContain('settleTo(...restGeo(input.checked));');
    // 几何通道 = JS transform 直写（no-anim 免疫）；旧 left/margin-left 写入退役
    expect(src).toContain('thumb.style.transform = `translate(${xSpring.x.toFixed(2)}px, -50%)`;');
    expect(src).not.toContain("thumb.style.left =");
    expect(src).not.toContain('margin-left');
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

