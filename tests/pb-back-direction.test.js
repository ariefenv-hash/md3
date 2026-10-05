// ==================== pb-back-direction.test.js — v7.41 预测式返回方向/垂直跟随 ====================
//
// 覆盖（Issue：右缘左滑时菜单应左移 + 上下跟随；上级菜单仅压暗无弹入弹出）：
//   · beginGesture({dir:-1})（右缘左滑）→ 栈顶卡片 translate3d 为负百分比（左移）
//   · beginGesture({dir:+1})（左缘右滑）→ 正百分比（右移，原行为）
//   · progressGesture(dy) → 卡片纵向位移 = dy × 0.18 × q（上下跟随，随返回进度出现）
//   · 纵向增益钳制 ±72px
//   · 手势取消回弹落定 → backDir 复位 0（后续按钮返回走规范右滑）
//   · 手势提交落定 → 出栈且 backDir 复位
//   · push（前进）→ backDir 强制 0（自右滑入）
//   · 下层视图：全程 translate3d(0,0,0) scale(1) + 仅 brightness 压暗（无弹入弹出）

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import '../ios-desktop/apps/_shared/pb-nav.js';

function mount() {
  const mk = (id) => {
    const el = document.createElement('section');
    el.id = id;
    el.style.background = '#000';
    document.body.appendChild(el);
    return '#' + id;
  };
  return { root: mk('dRoot'), a: mk('dA'), b: mk('dB') };
}

/** 与 tests/pb-nav.test.js 同款 rAF 手动队列（16.7ms 步进） */
function makeRaf() {
  const q = [];
  let t = 0;
  let ids = 1;
  return {
    install() {
      vi.stubGlobal('requestAnimationFrame', (cb) => { q.push(cb); return ids++; });
      vi.stubGlobal('cancelAnimationFrame', () => {});
    },
    flush(maxFrames = 600) {
      let frames = 0;
      while (q.length && frames < maxFrames) {
        const cb = q.shift();
        t += 16.7;
        cb(t);
        frames++;
      }
      return frames;
    },
  };
}

const raf = makeRaf();

beforeEach(() => {
  raf.install();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** happy-dom 窗口宽 1024 → 满行程 = 1024×0.85 ≈ 870.4px */
const FULL_TRACK = 1024 * 0.85;

function txOf(transform) {
  const m = /translate3d\((-?[\d.]+)%,\s*(-?[\d.]+)px/.exec(transform || '');
  return m ? { txPct: parseFloat(m[1]), tyPx: parseFloat(m[2]) } : null;
}

function setup() {
  const v = mount();
  const pb = window.PBNav.init({ views: { root: v.root, a: v.a, b: v.b }, root: 'root' });
  pb.push('a');
  raf.flush();
  return { v, pb };
}

describe('PBNav v7.41 方向感知', () => {
  it('右缘左滑（dir=-1）：卡片向左移动', () => {
    const { v, pb } = setup();
    pb.beginGesture({ dir: -1 });
    pb.progressGesture(300, 0);
    const st = pb.__state();
    expect(st.backDir).toBe(-1);
    const t = txOf(document.querySelector(v.a).style.transform);
    expect(t).not.toBeNull();
    expect(t.txPct).toBeLessThan(0);   // 左移
  });

  it('左缘右滑（dir=+1）：卡片向右移动（规范方向）', () => {
    const { v, pb } = setup();
    pb.beginGesture({ dir: 1 });
    pb.progressGesture(300, 0);
    expect(pb.__state().backDir).toBe(1);
    const t = txOf(document.querySelector(v.a).style.transform);
    expect(t.txPct).toBeGreaterThan(0);   // 右移
  });

  it('缺省 beginGesture（无参/按钮路径）保持规范右移', () => {
    const { v, pb } = setup();
    pb.beginGesture();
    pb.progressGesture(300, 0);
    const t = txOf(document.querySelector(v.a).style.transform);
    expect(t.txPct).toBeGreaterThan(0);
  });
});

describe('PBNav v7.41 垂直跟随', () => {
  it('progressGesture dy → 纵向位移 = dy×0.18×q，随返回进度出现', () => {
    const { v, pb } = setup();
    pb.beginGesture({ dir: 1 });
    pb.progressGesture(FULL_TRACK / 2, 100);   // 半程 + 手指下移 100px → q≈0.5
    const t = txOf(document.querySelector(v.a).style.transform);
    expect(t.tyPx).toBeGreaterThan(5);
    expect(t.tyPx).toBeLessThan(20);   // 100×0.18×0.5 = 9px
  });

  it('纵向增益钳制 ±72px（极端长距拖拽不再放大）', () => {
    const { v, pb } = setup();
    pb.beginGesture({ dir: 1 });
    pb.progressGesture(FULL_TRACK, 2000);   // 未钳制将达 360px
    const t = txOf(document.querySelector(v.a).style.transform);
    expect(t.tyPx).toBeLessThanOrEqual(72.5);
    expect(pb.__state().backTy).toBeLessThanOrEqual(72.1);
  });

  it('向上拖动 dy 为负 → 卡片上移', () => {
    const { v, pb } = setup();
    pb.beginGesture({ dir: 1 });
    pb.progressGesture(FULL_TRACK / 2, -120);
    const t = txOf(document.querySelector(v.a).style.transform);
    expect(t.tyPx).toBeLessThan(0);
  });
});

describe('PBNav v7.41 方向复位生命周期', () => {
  it('手势取消回弹落定 → backDir 复位 0', () => {
    const { pb } = setup();
    pb.beginGesture({ dir: -1 });
    pb.progressGesture(200, 40);
    pb.endGesture(false, 0);
    raf.flush();
    const st = pb.__state();
    expect(st.p).toBe(1);
    expect(st.backDir).toBe(0);
    expect(st.backTy).toBe(0);
  });

  it('手势提交落定 → 出栈且 backDir 复位', () => {
    const { v, pb } = setup();
    pb.push('b');
    raf.flush();

    pb.beginGesture({ dir: -1 });
    pb.progressGesture(600, 30);
    pb.endGesture(true, 600);
    raf.flush();
    const st = pb.__state();
    expect(st.stack).toEqual(['root', 'a']);
    expect(st.backDir).toBe(0);
  });

  it('push（前进）→ backDir 强制 0（新视图自右滑入）', () => {
    const { pb } = setup();
    // 制造左移遗留后直接前进反转
    pb.beginGesture({ dir: -1 });
    pb.progressGesture(300, 50);
    pb.push('b');   // 返回途中前进 = 反转
    expect(pb.__state().backDir).toBe(0);
    raf.flush();
  });
});

describe('PBNav v7.41 上级菜单仅压暗（无弹入弹出）', () => {
  it('返回手势全程：下层 transform 恒 translate3d(0,0,0) scale(1)，仅 brightness 变化', () => {
    const { v, pb } = setup();
    pb.beginGesture({ dir: -1 });
    for (let dx = 50; dx <= 500; dx += 50) {
      pb.progressGesture(dx, 20);
      const prevStyle = document.querySelector(v.root).style;
      expect(prevStyle.transform).toBe('translate3d(0,0,0) scale(1)');
      expect(['0', '0px']).toContain(prevStyle.borderRadius);
      expect(prevStyle.boxShadow).toBe('');
      if (dx > 50) {
        // 仅压暗/复明（brightness ∈ [0.65, 1]），绝无 scale/translate 弹入弹出
        const m = /^brightness\(([\d.]+)\)$/.exec(prevStyle.filter);
        expect(m).not.toBeNull();
        const b = parseFloat(m[1]);
        expect(b).toBeGreaterThanOrEqual(0.65);
        expect(b).toBeLessThanOrEqual(1.0);
      }
    }
  });
});

describe('PBNav v7.41 宿主消息协议', () => {
  it('PB_GESTURE begin{dir:-1} + progress{dx,dy} → 左移 + 纵向跟随', () => {
    const { v, pb } = setup();
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'PB_GESTURE', phase: 'begin', dir: -1 },
    }));
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'PB_GESTURE', phase: 'progress', dx: FULL_TRACK / 2, dy: 90 },
    }));
    const st = pb.__state();
    expect(st.backDir).toBe(-1);
    const t = txOf(document.querySelector(v.a).style.transform);
    expect(t.txPct).toBeLessThan(0);
    expect(t.tyPx).toBeGreaterThan(0);
  });
});
