// ==================== v756-dock-magnify.test.js — v7.56 Dock 放大 1:1 复刻守护 ====================
// ①Apple 全余弦曲线（Juankpro 逆向 + BuildUI 1:1 参数双源一致）
// ②spreadLayout 悬停锚定水平回流（邻居让位 / Dock 变宽 / 守恒）
// ③帧引擎（进出场落定 / 追踪零滞后 / bar 拥抱内容 / 名称气泡 / reduced-motion）
// ④desktop-prefs.dockMagnify 偏好（设置页放大倍率滑杆数据源）
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

// ==================== ① magnifyScale：Apple 全余弦曲线 ====================

describe('v7.56 — magnifyScale 1:1 曲线', () => {
  it('默认参数 = BuildUI/Apple 双源一致（maxScale 2.25、range 2.75×）', async () => {
    const { magnifyScale, MAGNIFY_RANGE_K, MAGNIFY_MAX_SCALE } = await import('../ios-desktop/js/dock.js');
    expect(MAGNIFY_RANGE_K).toBe(2.75);   // BuildUI DISTANCE=110 / 图标 40px
    expect(MAGNIFY_MAX_SCALE).toBe(2.25); // BuildUI SCALE / macOS 默认档观感
    const size = 54;
    expect(magnifyScale(0, size)).toBeCloseTo(2.25, 5);       // 指针正下方 = 倍率上限
    expect(magnifyScale(size * 2.75, size)).toBe(1);           // 作用域边界回归 1
    expect(magnifyScale(size * 3, size)).toBe(1);              // 界外恒 1
    expect(magnifyScale(-3, size)).toBe(1);
    expect(magnifyScale(NaN, size)).toBe(1);
  });

  it('邻位图标仍显著放大（macOS 观感：一档距 ≈ 1.76×，两档距 ≈ 1.06×）', async () => {
    const { magnifyScale } = await import('../ios-desktop/js/dock.js');
    const size = 54, pitch = 64; // 54 图标 + 10 间距
    const n1 = magnifyScale(pitch, size);
    expect(n1).toBeGreaterThan(1.6);   // 紧邻图标一眼可见放大（旧版只有 1.36 → 不明显根因）
    expect(n1).toBeLessThan(2.0);
    const n2 = magnifyScale(pitch * 2, size);
    expect(n2).toBeGreaterThan(1.02);
    expect(n2).toBeLessThan(1.12);
    expect(magnifyScale(pitch * 3, size)).toBe(1); // 三档之外收干净
  });

  it('单调递减且边界无断崖（余弦路径平滑，无线性递进抖动）', async () => {
    const { magnifyScale } = await import('../ios-desktop/js/dock.js');
    const size = 54, range = 2.75 * size;
    let prev = 3;
    for (let d = 0; d <= range + 1e-6; d += 3) {
      const s = magnifyScale(d, size);
      expect(s).toBeLessThanOrEqual(prev + 1e-9);
      prev = s;
    }
    // 边界前一采样与边界值差 < 0.03（无断崖）
    const near = magnifyScale(range - 3, size);
    expect(near - 1).toBeLessThan(0.03);
    // 中心附近导数趋零（峰值平顶，cos 端点性质）
    expect(magnifyScale(0, size) - magnifyScale(3, size)).toBeLessThan(0.01);
  });

  it('可配参数：maxScale 覆盖生效；maxScale ≤ 1 时恒为 1', async () => {
    const { magnifyScale } = await import('../ios-desktop/js/dock.js');
    const size = 54;
    expect(magnifyScale(0, size, { maxScale: 2.8 })).toBeCloseTo(2.8, 5);
    expect(magnifyScale(0, size, { maxScale: 1.4 })).toBeCloseTo(1.4, 5);
    expect(magnifyScale(0, size, { maxScale: 1 })).toBe(1);
    expect(magnifyScale(0, size, { maxScale: 0.5 })).toBe(1);
    expect(magnifyScale(0, size, { range: 0.1 })).toBeCloseTo(2.25, 5); // range 覆盖：半径 = 0.1×54 = 5.4，中心仍在峰顶
    expect(magnifyScale(10, size, { range: 0.1 })).toBe(1);            // 10 > 5.4 → 界外
    expect(magnifyScale(3, size, { range: 0.1 })).toBeGreaterThan(1);  // 3 < 5.4 → 界内
  });
});

// ==================== ② spreadLayout：悬停锚定水平回流 ====================

describe('v7.56 — spreadLayout 水平回流', () => {
  it('全部静止（scales 全 1）→ 零位移、span = 静止总宽、delta = 0', async () => {
    const { spreadLayout } = await import('../ios-desktop/js/dock.js');
    const r = spreadLayout([1, 1, 1, 1], 54, [10, 10, 10]);
    expect(r.dx).toEqual([0, 0, 0, 0]);
    expect(r.span).toBe(4 * 54 + 30);
    expect(r.delta).toBe(0);
    expect(r.hovered).toBe(0); // 全 1 时取首个 argmax
  });

  it('悬停图标锚定（dx=0），左侧负位移右侧正位移，端点悬停全部让位', async () => {
    const { spreadLayout } = await import('../ios-desktop/js/dock.js');
    const w = 54, gaps = [10, 10, 10];
    // 悬停第 2 个（index 1）
    const r1 = spreadLayout([1.8, 2.25, 1.8, 1], w, gaps);
    expect(r1.hovered).toBe(1);
    expect(r1.dx[1]).toBeCloseTo(0, 9);
    expect(r1.dx[0]).toBeLessThan(0);
    expect(r1.dx[2]).toBeGreaterThan(0);
    expect(r1.dx[3]).toBeGreaterThan(r1.dx[2]); // 越远让位越多
    // 悬停首图标：其余全部右移
    const r0 = spreadLayout([2.25, 1.8, 1.8, 1], w, gaps);
    expect(r0.hovered).toBe(0);
    expect(r0.dx[0]).toBeCloseTo(0, 9);
    r0.dx.slice(1).forEach((d) => expect(d).toBeGreaterThan(0));
  });

  it('相邻中心间距 = (wᵢ+wⱼ)/2 + gap（放大宽度精确让位）；守恒：span−静止 = Σextra', async () => {
    const { spreadLayout } = await import('../ios-desktop/js/dock.js');
    const w = 54, gaps = [10, 10, 10];
    const scales = [1.8, 2.25, 1.8, 1.06];
    const r = spreadLayout(scales, w, gaps);
    for (let i = 0; i < 3; i++) {
      const expected = (w * scales[i] + w * scales[i + 1]) / 2 + gaps[i];
      // dx 差即中心差（rest 间距均匀 w+gap）
      const centerGap = (r.dx[i + 1] - r.dx[i]) + (w + gaps[i]);
      expect(centerGap).toBeCloseTo(expected, 6);
    }
    const restSpan = 4 * w + 30;
    const extra = w * scales.reduce((a, s) => a + (s - 1), 0);
    expect(r.span - restSpan).toBeCloseTo(extra, 6);
  });

  it('分隔线场景：非均匀 gaps 被尊重（近槽前间距 33px）', async () => {
    const { spreadLayout } = await import('../ios-desktop/js/dock.js');
    const w = 54, gaps = [10, 33, 10];
    const r = spreadLayout([1, 2.25, 1.8, 1], w, gaps);
    expect(r.hovered).toBe(1);
    const centerGap01 = (r.dx[1] - r.dx[0]) + (w + gaps[0]);
    const centerGap12 = (r.dx[2] - r.dx[1]) + (w + gaps[1]);
    expect(centerGap01).toBeCloseTo((w * 1 + w * 2.25) / 2 + 10, 6);
    expect(centerGap12).toBeCloseTo((w * 2.25 + w * 1.8) / 2 + 33, 6);
    expect(r.span).toBeCloseTo(w * (1 + 2.25 + 1.8 + 1) + 53, 6);
  });
});

// ==================== ④ desktop-prefs.dockMagnify ====================

describe('v7.56 — dockMagnify 偏好', () => {
  let mod;
  beforeEach(async () => {
    vi.resetModules();
    localStorage.removeItem('ios-desktop:desktop-prefs');
    mod = await import('../ios-desktop/js/desktop-prefs.js');
  });

  it('默认 2.25；合法值写入并持久化；越界钳到 1.4–2.8', () => {
    expect(mod.getDesktopPrefs().dockMagnify).toBe(2.25);
    expect(mod.setDesktopPref('dockMagnify', 2.6)).toBe(true);
    expect(mod.getDesktopPrefs().dockMagnify).toBe(2.6);
    expect(JSON.parse(localStorage.getItem('ios-desktop:desktop-prefs')).dockMagnify).toBe(2.6);
    mod.setDesktopPref('dockMagnify', 5);
    expect(mod.getDesktopPrefs().dockMagnify).toBe(2.8);
    mod.setDesktopPref('dockMagnify', -1);
    expect(mod.getDesktopPrefs().dockMagnify).toBe(1.4);
  });

  it('非法值静默拒绝；损坏档回落默认', () => {
    expect(mod.setDesktopPref('dockMagnify', 'abc')).toBe(false);
    expect(mod.setDesktopPref('dockMagnify', NaN)).toBe(false);
    expect(mod.getDesktopPrefs().dockMagnify).toBe(2.25);
    localStorage.setItem('ios-desktop:desktop-prefs', JSON.stringify({ dockMagnify: 'oops' }));
    localStorage.setItem('ios-desktop:desktop-prefs', JSON.stringify({ dockMacEffect: true, dockMagnify: 9 }));
    const reloaded = window.__desktopPrefsInternal ? window.__desktopPrefsInternal.reload() : mod.getDesktopPrefs();
    expect(reloaded.dockMagnify).toBe(2.8); // 损坏值钳到上界，布尔偏好照常生效
  });
});

// ==================== ③ 帧引擎（happy-dom 全链路） ====================

describe('v7.56 — 放大帧引擎（DOM 级）', () => {
  let rafQ;
  let rectMap;
  let clockT; // 持久时钟：rAF 时间戳单调递增（跨 pump 不回拨）

  const makeRect = (left, width, top = 700) => ({
    left, top, right: left + width, bottom: top + 76,
    width, height: 76, x: left, y: top, toJSON() {},
  });

  function pump(n) {
    for (let i = 0; i < n; i++) {
      clockT += 16.7;
      const q = rafQ.slice();
      rafQ.length = 0;
      q.forEach((cb) => cb(clockT));
      if (!rafQ.length) break; // 链已终止（落定/清理），提前结束
    }
  }

  const boxScale = (btn) => parseFloat((btn.querySelector('.dock-icon-box').style.transform || 'scale(1)').replace('scale(', ''));
  const btnDx = (btn) => {
    const s = btn.style.transform;
    return s ? parseFloat(s.replace('translateX(', '')) : 0;
  };

  async function boot({ magnify = null, reducedMotion = false } = {}) {
    vi.resetModules(); // 每用例独立模块实例（dock.js 与其绑定的 desktop-prefs 均重求值）
    document.body.innerHTML = '';
    clockT = 1000;
    rectMap = new Map();
    rafQ = [];
    vi.stubGlobal('requestAnimationFrame', (cb) => { rafQ.push(cb); return rafQ.length; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      const r = rectMap.get(this);
      return r || makeRect(0, 0, 0);
    });
    if (reducedMotion) {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} }));
    }
    // 显式固定项 + 关闭最近槽（happy-dom 视口 1024 命中平板断点，
    // recent-apps 模块种子会额外渲染 3 个最近图标干扰几何断言）
    localStorage.setItem('ios-desktop:dock-items', JSON.stringify(['phone', 'camera', 'msg', 'safari']));
    localStorage.setItem('ios-desktop:desktop-prefs', JSON.stringify(
      magnify == null ? { dockMacEffect: true, dockRecents: false }
                      : { dockMacEffect: true, dockRecents: false, dockMagnify: magnify },
    ));
    const dock = await import('../ios-desktop/js/dock.js');
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: reducedMotion, addEventListener() {}, removeEventListener() {} });
    dock.initDock();
    const bar = document.getElementById('dockBar');
    const btns = Array.from(document.querySelectorAll('.dock-app-icon'));
    // 桩布局：4 个图标，静止位 left = 200 + i×64（54 图标 + 10 间距）
    btns.forEach((b, i) => rectMap.set(b, makeRect(200 + i * 64, 54, 712)));
    rectMap.set(bar, makeRect(365, 270, 700));
    Object.defineProperty(bar, 'offsetWidth', { configurable: true, value: 270 });
    return { dock, bar, btns, tip: bar.querySelector('.dock-tip') };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.removeItem('ios-desktop:desktop-prefs');
    localStorage.removeItem('ios-desktop:dock-items');
  });
  it('追踪：悬停图标钉在指针下方放至 2.25×，邻位让位、bar 变宽、气泡在场', async () => {
    const { dock, bar, btns, tip } = await boot();
    const { magnifyScale } = dock;
    const cx1 = 200 + 64 + 27; // 图标 1 静止中心 = 291
    const ev = new Event('pointerenter');
    ev.clientX = cx1;
    bar.dispatchEvent(ev);
    pump(45); // 强度 → 1（进场 ≈80ms 指数趋近后钳位）

    expect(boxScale(btns[1])).toBeCloseTo(2.25, 2);          // 悬停 = 上限
    const s0 = magnifyScale(64, 54);
    expect(s0).toBeGreaterThan(1.6);
    expect(boxScale(btns[0])).toBeCloseTo(s0, 2);            // 邻位 = 曲线值
    expect(btnDx(btns[1])).toBeCloseTo(0, 6);                // 悬停锚定：零位移
    expect(btnDx(btns[0])).toBeLessThan(0);                  // 左让位
    expect(btnDx(btns[2])).toBeGreaterThan(0);               // 右让位
    // bar 宽 = 内容总宽 + 内边距（旧版固定 270 → 现在 ~423，肉眼可见变宽）
    const expectW = 54 * [s0, 2.25, s0, magnifyScale(128, 54)].reduce((a, b) => a + b, 0) + 30 + 24;
    expect(parseFloat(bar.style.width)).toBeCloseTo(expectW, 0);
    expect(expectW).toBeGreaterThan(400);
    // 气泡：名称 = data-name，show 在场
    expect(tip.classList.contains('show')).toBe(true);
    expect(tip.textContent).toBe(btns[1].getAttribute('data-name'));
    // dock-tip 有定位（跟随悬停图标）
    expect(tip.style.left).toContain('px');
  });

  it('进场渐变：首帧强度未满（无瞬跳），追踪期每帧随新指针即时重算', async () => {
    const { bar, btns } = await boot();
    const ev = new Event('pointerenter');
    ev.clientX = 200 + 27;
    bar.dispatchEvent(ev);
    pump(1);
    const s1 = boxScale(btns[0]);
    expect(s1).toBeGreaterThan(1.05);
    expect(s1).toBeLessThan(2.2); // 渐变中途，非瞬跳到 2.25
    // 指针移到图标 3 → 下一帧悬停易主（零滞后、可反向；clientY 保持在判界内）
    const mv = new Event('pointermove');
    mv.clientX = 200 + 3 * 64 + 27;
    mv.clientY = 730;
    document.dispatchEvent(mv);
    pump(45);
    expect(boxScale(btns[3])).toBeCloseTo(2.25, 2);
    expect(boxScale(btns[0])).toBeLessThan(1.1);
  });

  it('离场落定：指针远离后 ≤0.17s 量级内全部清理，bar 恢复静止宽', async () => {
    const { bar, btns, tip } = await boot();
    const ev = new Event('pointerenter');
    ev.clientX = 200 + 27;
    bar.dispatchEvent(ev);
    pump(45);
    expect(bar.style.width).not.toBe('');
    const far = new Event('pointermove');
    far.clientX = 200 + 27;
    far.clientY = 5000; // 远离 bar（判界 bottom+24 之外）
    document.dispatchEvent(far);
    pump(80); // 离场 τ≈170ms 指数落定
    btns.forEach((b) => {
      expect(b.style.transform).toBe('');
      expect(b.querySelector('.dock-icon-box').style.transform).toBe('');
    });
    expect(bar.style.width).toBe('');
    expect(bar.style.maxWidth).toBe('');
    expect(bar.style.transform).toBe('');
    expect(tip.classList.contains('show')).toBe(false);
  });

  it('触屏抬手即落定；鼠标 click 不落定（指针仍悬停）', async () => {
    const { bar, btns } = await boot();
    const enter = new Event('pointerenter');
    enter.clientX = 200 + 27;
    bar.dispatchEvent(enter);
    pump(45);
    expect(boxScale(btns[0])).toBeCloseTo(2.25, 2);
    // 鼠标 pointerup：不落定
    const mUp = new Event('pointerup');
    mUp.pointerType = 'mouse';
    bar.dispatchEvent(mUp);
    pump(5);
    expect(boxScale(btns[0])).toBeCloseTo(2.25, 2);
    // 触屏 pointerup：落定
    const tUp = new Event('pointerup');
    tUp.pointerType = 'touch';
    bar.dispatchEvent(tUp);
    pump(80);
    expect(btns[0].querySelector('.dock-icon-box').style.transform).toBe('');
  });

  it('放大倍率偏好驱动上限（dockMagnify 2.8 → 悬停 2.8×）', async () => {
    const { bar, btns } = await boot({ magnify: 2.8 });
    const ev = new Event('pointerenter');
    ev.clientX = 200 + 27;
    bar.dispatchEvent(ev);
    pump(45);
    expect(boxScale(btns[0])).toBeCloseTo(2.8, 2);
  });

  it('reduced-motion：无 mac-effect 类，指针进入不产生任何变换', async () => {
    const { bar, btns } = await boot({ reducedMotion: true });
    expect(bar.classList.contains('mac-effect')).toBe(false);
    const ev = new Event('pointerenter');
    ev.clientX = 200 + 27;
    bar.dispatchEvent(ev);
    pump(45);
    btns.forEach((b) => {
      expect(b.querySelector('.dock-icon-box').style.transform).toBe('');
      expect(b.style.transform).toBe('');
    });
    expect(bar.style.width).toBe('');
  });
});

// ==================== 源码锚定 + 版本 ====================

describe('v7.56 — 源码锚定', () => {
  it('dock.js：1:1 引擎三件套在场（曲线常量 / spreadLayout / document 级跟踪）', () => {
    const src = R('ios-desktop/js/dock.js');
    expect(src).toContain('export const MAGNIFY_RANGE_K = 2.75;');
    expect(src).toContain('export const MAGNIFY_MAX_SCALE = 2.25;');
    expect(src).toContain('export function spreadLayout');
    expect(src).toMatch(/Math\.cos\(\(dist \/ range\) \* Math\.PI\)/);
    expect(src).toContain('function magDocMove');
    expect(src).toContain("document.addEventListener('pointermove', magDocMove, { passive: true })");
    expect(src).toContain('magInvalidate();');
    expect(src).toContain('data-name=');
  });
  it('settings.js：放大倍率滑杆（1.4–2.8，input 实时反馈）', () => {
    const src = R('ios-desktop/js/apps/settings.js');
    expect(src).toContain('id="dpMagnify" min="1.4" max="2.8"');
    expect(src).toContain("P.set('dockMagnify', parseFloat(t.value))");
    expect(src).toContain("bindDoc('settings', 'input'");
    expect(src).toContain('dpMagnifyVal');
  });
  it('dock.css：名称气泡样式；desktop-prefs.js：倍率边界导出', () => {
    expect(R('ios-desktop/css/dock.css')).toContain('.dock-tip');
    const src = R('ios-desktop/js/desktop-prefs.js');
    expect(src).toContain('export const DOCK_MAGNIFY_MIN = 1.4;');
    expect(src).toContain('export const DOCK_MAGNIFY_MAX = 2.8;');
  });
  it('dock.js：默认播种 id 修正（msg 而非不存在的 messages，Dock 默认 4 应用齐全）', () => {
    const src = R('ios-desktop/js/dock.js');
    expect(src).toContain("const DEFAULT_DOCK_IDS = ['phone', 'camera', 'msg', 'safari'];");
  });
  it("sw.js VERSION = geek-v65", () => {
    expect(R('sw.js')).toContain("const VERSION = 'geek-v65';");
  });
});
