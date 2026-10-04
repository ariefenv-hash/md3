// ==================== pb-nav.test.js — iframe 应用共享「预览式返回」导航器状态机测试（v7.28） ====================
//
// 覆盖：
//   · init/push/pop/popTo/resetTo 栈状态机（含同顶幂等、栈内重排防环、popTo 揭示）
//   · 壳模式（v7.28）：init 不带 root 时文档流即根 —— 单层可返回（canBack=true）、
//     可弹空栈回应用壳（settle 后栈为空、视图隐藏）
//   · 返回门闸 setBackGate（v7.28）：PB_TRIGGER_BACK / PB_GESTURE begin 被应用消费时不出栈
//   · 视图 display/visibility 生命周期（在场=display flex、离场=display none）
//
// rAF 以手动队列驱动（固定 16.7ms 步进），弹簧收敛确定性复现，无需真实等待。

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 经典脚本：引入即挂 window.PBNav（happy-dom 环境）
import '../ios-desktop/apps/_shared/pb-nav.js';

function mount() {
  const mk = (id) => {
    const el = document.createElement('section');
    el.id = id;
    document.body.appendChild(el);
    return '#' + id;
  };
  return { root: mk('vRoot'), a: mk('vA'), b: mk('vB'), c: mk('vC') };
}

function makeRaf() {
  const q = [];
  let t = 0;
  let ids = 1;
  return {
    install() {
      vi.stubGlobal('requestAnimationFrame', (cb) => { q.push(cb); return ids++; });
      vi.stubGlobal('cancelAnimationFrame', (id) => { /* 手动驱动下无需真取消 */ });
    },
    /** 推进到弹簧收敛（或 maxFrames 上限），返回推进帧数 */
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

describe('pb-nav 根视图模式（init 带 root）', () => {
  it('init：根视图在场、canBack=false、其余视图隐藏', () => {
    const v = mount();
    window.PBNav.init({ views: { root: v.root, a: v.a }, root: 'root' });
    const st = window.PBNav.__state();
    expect(st.stack).toEqual(['root']);
    expect(st.canBack).toBe(false);
    expect(st.shellMode).toBe(false);
    expect(document.querySelector(v.root).style.display).toBe('flex');
    expect(document.querySelector(v.a).style.display).toBe('none');
  });

  it('push：前进动画启动、canBack=true、目标在场', () => {
    const v = mount();
    window.PBNav.init({ views: { root: v.root, a: v.a }, root: 'root' });
    expect(window.PBNav.push('a')).toBe(true);
    const st = window.PBNav.__state();
    expect(st.stack).toEqual(['root', 'a']);
    expect(st.canBack).toBe(true);
    expect(document.querySelector(v.a).style.display).toBe('flex');
  });

  it('push 同顶幂等 / 栈内重排防环', () => {
    const v = mount();
    window.PBNav.init({ views: { root: v.root, a: v.a, b: v.b }, root: 'root' });
    window.PBNav.push('a');
    window.PBNav.push('b');
    expect(window.PBNav.push('b')).toBe(true); // 同顶幂等
    expect(window.PBNav.__state().stack).toEqual(['root', 'a', 'b']);
    window.PBNav.push('a'); // 已在栈中非顶：瞬时重排（截栈）
    expect(window.PBNav.__state().stack).toEqual(['root', 'a']);
  });

  it('pop：返回落定后出栈、canBack 回落、被弹视图隐藏', () => {
    const v = mount();
    window.PBNav.init({ views: { root: v.root, a: v.a }, root: 'root' });
    window.PBNav.push('a');
    expect(window.PBNav.pop()).toBe(true);
    const mid = window.PBNav.__state();
    expect(mid.pendingPop).toBe(true); // 待弹（落定才真正出栈）
    raf.flush();
    const st = window.PBNav.__state();
    expect(st.stack).toEqual(['root']);
    expect(st.canBack).toBe(false);
    expect(st.pendingPop).toBe(false);
    expect(document.querySelector(v.a).style.display).toBe('none');
    expect(document.querySelector(v.root).style.display).toBe('flex');
  });

  it('pop 根层守卫：根视图模式单层不可返回', () => {
    const v = mount();
    window.PBNav.init({ views: { root: v.root }, root: 'root' });
    expect(window.PBNav.pop()).toBe(false);
    expect(window.PBNav.__state().stack).toEqual(['root']);
  });

  it('popTo：揭示栈内目标（截栈到其上一级）与栈外目标（弹空后压入）', () => {
    const v = mount();
    window.PBNav.init({ views: { root: v.root, a: v.a, b: v.b, c: v.c }, root: 'root' });
    window.PBNav.push('a'); window.PBNav.push('b'); window.PBNav.push('c');
    window.PBNav.popTo('a');
    raf.flush();
    expect(window.PBNav.__state().stack).toEqual(['root', 'a']);
    // 栈外目标：换页语义（弹到根后瞬时压入目标）
    window.PBNav.popTo('c');
    raf.flush();
    expect(window.PBNav.__state().stack).toEqual(['root', 'c']);
  });

  it('popTo 在返回动画飞行中不静默吞掉（深链场景）：取消待弹栈并接管目标', () => {
    const v = mount();
    window.PBNav.init({ views: { root: v.root, a: v.a, b: v.b }, root: 'root' });
    window.PBNav.push('a'); window.PBNav.push('b');
    window.PBNav.pop();            // 返回动画开始（pendingPop 在飞）
    expect(window.PBNav.__state().pendingPop).toBe(true);
    const ok = window.PBNav.popTo('a'); // 深链在飞行中到达：不 no-op
    expect(ok).toBe(true);
    raf.flush();
    // 落定：栈直达 a（而非被早先的 pendingPop 语义带偏）
    expect(window.PBNav.__state().stack).toEqual(['root', 'a']);
    // 栈外目标同理：飞行中 popTo('b') → 弹空后压入 b（换页）
    window.PBNav.pop();
    window.PBNav.popTo('b');
    raf.flush();
    expect(window.PBNav.__state().stack).toEqual(['root', 'b']);
  });

  it('resetTo：瞬时重置（深链/初始化路径）', () => {
    const v = mount();
    window.PBNav.init({ views: { root: v.root, a: v.a, b: v.b }, root: 'root' });
    window.PBNav.push('a'); window.PBNav.push('b');
    window.PBNav.resetTo('root');
    expect(window.PBNav.__state().stack).toEqual(['root']);
    expect(document.querySelector(v.b).style.display).toBe('none');
  });

  it('onChange：pop 起点即回调 revealing（揭示层内容在动画期间就绪）', () => {
    const v = mount();
    const seen = [];
    window.PBNav.init({
      views: { root: v.root, a: v.a, b: v.b },
      root: 'root',
      onChange: (st) => seen.push([st.top, st.revealing, st.canBack]),
    });
    window.PBNav.push('a'); window.PBNav.push('b');
    seen.length = 0;
    window.PBNav.pop();
    // 起点回调：top 仍为 b，revealing=a（动画期间揭示层渲染依据）
    expect(seen[0]).toEqual(['b', 'a', true]);
    raf.flush();
    // 落定回调：top=a
    expect(seen[seen.length - 1][0]).toBe('a');
  });
});

describe('pb-nav 壳模式（v7.28：init 不带 root，文档流即根）', () => {
  it('空栈 canBack=false；单层 push 后 canBack=true（可一路弹空回应用壳）', () => {
    const v = mount();
    window.PBNav.init({ views: { viewer: v.a, editor: v.b } });
    let st = window.PBNav.__state();
    expect(st.stack).toEqual([]);
    expect(st.canBack).toBe(false);
    expect(st.shellMode).toBe(true);
    window.PBNav.push('viewer');
    st = window.PBNav.__state();
    expect(st.stack).toEqual(['viewer']);
    expect(st.canBack).toBe(true); // 壳模式核心：单层即有「返回」语义
  });

  it('pop：弹空栈 → 视图隐藏、canBack=false（应用壳自然在场）', () => {
    const v = mount();
    window.PBNav.init({ views: { viewer: v.a, editor: v.b } });
    window.PBNav.push('viewer');
    expect(window.PBNav.pop()).toBe(true);
    raf.flush();
    const st = window.PBNav.__state();
    expect(st.stack).toEqual([]);
    expect(st.canBack).toBe(false);
    expect(document.querySelector(v.a).style.display).toBe('none');
  });

  it('双层：editor → viewer 逐层返回', () => {
    const v = mount();
    window.PBNav.init({ views: { viewer: v.a, editor: v.b } });
    window.PBNav.push('viewer'); window.PBNav.push('editor');
    expect(window.PBNav.__state().canBack).toBe(true);
    window.PBNav.pop(); raf.flush();
    expect(window.PBNav.__state().stack).toEqual(['viewer']);
    window.PBNav.pop(); raf.flush();
    expect(window.PBNav.__state().stack).toEqual([]);
  });

  it('手势提交守卫：壳模式单层提交可弹出', () => {
    const v = mount();
    window.PBNav.init({ views: { viewer: v.a } });
    window.PBNav.push('viewer');
    window.PBNav.beginGesture();
    window.PBNav.progressGesture(200);
    window.PBNav.endGesture(true, 0);
    raf.flush();
    expect(window.PBNav.__state().stack).toEqual([]);
  });
});

describe('pb-nav 返回门闸 setBackGate（v7.28）', () => {
  function send(data) {
    window.dispatchEvent(new MessageEvent('message', { data }));
  }

  it('门闸消费 PB_TRIGGER_BACK：不出栈', () => {
    const v = mount();
    window.PBNav.init({ views: { root: v.root, a: v.a }, root: 'root' });
    window.PBNav.push('a');
    let gated = 0;
    window.PBNav.setBackGate(() => { gated++; return true; });
    send({ type: 'PB_TRIGGER_BACK' });
    expect(gated).toBe(1);
    expect(window.PBNav.__state().stack).toEqual(['root', 'a']); // 未出栈
    raf.flush();
    expect(window.PBNav.__state().stack).toEqual(['root', 'a']);
  });

  it('门闸放行：正常返回', () => {
    const v = mount();
    window.PBNav.init({ views: { root: v.root, a: v.a }, root: 'root' });
    window.PBNav.push('a');
    window.PBNav.setBackGate(() => false);
    send({ type: 'PB_TRIGGER_BACK' });
    raf.flush();
    expect(window.PBNav.__state().stack).toEqual(['root']);
  });

  it('门闸消费 PB_GESTURE begin：手势不接管', () => {
    const v = mount();
    window.PBNav.init({ views: { root: v.root, a: v.a }, root: 'root' });
    window.PBNav.push('a');
    window.PBNav.setBackGate(() => true);
    send({ type: 'PB_GESTURE', phase: 'begin' });
    send({ type: 'PB_GESTURE', phase: 'progress', dx: 300 });
    send({ type: 'PB_GESTURE', phase: 'end', commit: true, vx: 0 });
    raf.flush();
    expect(window.PBNav.__state().stack).toEqual(['root', 'a']); // 门闸在场：手势全程无效果
  });

  it('PB_SYNC_REQ：回状态不崩（无宿主环境静默）', () => {
    const v = mount();
    window.PBNav.init({ views: { root: v.root }, root: 'root' });
    expect(() => send({ type: 'PB_SYNC_REQ' })).not.toThrow();
  });
});
