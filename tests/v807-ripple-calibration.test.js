// ==================== v807-ripple-calibration.test.js — 涟漪坐标域校准回归 ====================
//
// 背景（用户实测报告：Chrome 127 安卓内核涟漪大幅偏上，最新内核正常）：
//   ① fragment 用 gl_FragCoord + uH 翻转 —— 依赖「gl_FragCoord 域 = gl.viewport 域」
//      的内核行为，Chrome ≤127（部分 ANGLE/GLES 后端）Y 域失配 → 涟漪大幅偏上
//   ② buffer 尺寸 = innerWidth/Height × dpr、CSS = 100vw/100vh —— 安卓上
//      100vh = large viewport ≠ innerHeight（URL 栏动态视口），老内核 URL 栏
//      收展 resize 丢失 → 触点注入域与显示域错位
//   ③ mask radius（CSS px）漏乘 dpr
// v8.07 修复：顶点插值 vP（buffer 像素域 y-down）替代 gl_FragCoord 翻转；
//   坐标链全部改为相对 canvas 实测 rect（crect）+ buffer 失配即时重同步。
//
// 守护口径：源码锚定（本仓库对渲染管线的既定测试范式，如 v766/v799）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const engine = readFileSync(join(root, 'ios-desktop/js/aosp/expressive-ripple.js'), 'utf8');
const fx = readFileSync(join(root, 'ios-desktop/js/ripple-fx.js'), 'utf8');

describe('v8.07 涟漪坐标域校准（Chrome ≤127 偏上修复）', () => {
  it('fragment 不再用 gl_FragCoord 计算涟漪坐标域（main 内零出现）', () => {
    const frag = engine.slice(engine.indexOf('RIPPLE_FRAGMENT_SHADER'), engine.indexOf('RIPPLE_VERTEX_SHADER'));
    expect(frag).toContain('vec2 p = vP;');
    expect(frag).not.toMatch(/vec2 p = vec2\(gl_FragCoord/);
    expect(frag).not.toMatch(/uH\s*-\s*gl_FragCoord/);
  });

  it('fragment 不再声明 uH uniform（翻转基准退役）', () => {
    const frag = engine.slice(engine.indexOf('RIPPLE_FRAGMENT_SHADER'), engine.indexOf('RIPPLE_VERTEX_SHADER'));
    expect(frag).not.toMatch(/uniform\s+float\s+uH\b/);
  });

  it('vertex shader 以顶点插值给出 buffer 像素域 y-down 坐标（uBufSize + vP）', () => {
    const vert = engine.slice(engine.indexOf('RIPPLE_VERTEX_SHADER'));
    expect(vert).toContain('uniform vec2 uBufSize;');
    expect(vert).toContain('varying vec2 vP;');
    expect(vert).toContain('(1.0 - aPos.y) * 0.5 * uBufSize.y');
  });

  it('uBufSize 进入 uniform 表（替代 uH 槽位）且构造时写入 buffer 尺寸', () => {
    expect(engine).toContain("'uColor', 'uSparkleColor', 'uHasMask', 'uBufSize',");
    expect(engine).toContain('gl.uniform2f(this.mU.uBufSize, w, h);');
    expect(engine).not.toMatch(/this\.mU\.uH\b/);
  });

  it('共享层 resize 以 canvas 实测 rect 为准（不再信任 innerWidth/innerHeight 推算）', () => {
    const resize = fx.slice(fx.indexOf('_resizeCanvas() {'), fx.indexOf('_syncSurfaceResolution() {'));
    expect(resize).toContain('getBoundingClientRect()');
    expect(resize).toContain('r.width || window.innerWidth');
    expect(resize).toContain('r.height || window.innerHeight');
  });

  it('_syncSurfaceResolution 写入 uBufSize（uH 全库退役）', () => {
    expect(fx).toContain('gl.uniform2f(this.surface.mU.uBufSize, w, h);');
    expect(fx).not.toMatch(/\.mU\.uH\b/);
  });

  it('_handleDown 坐标链相对 canvas 实测 rect（origin/touch/mask 全链 - crect）', () => {
    const down = fx.slice(fx.indexOf('_handleDown(e) {'), fx.indexOf('_handleMove(e) {'));
    expect(down).toContain('const crect = this.canvas.getBoundingClientRect();');
    expect(down).toContain('(rect.left + rect.width / 2 - crect.left) * dpr');
    expect(down).toContain('(e.clientX - crect.left) * dpr, (e.clientY - crect.top) * dpr');
    expect(down).toContain('(cx0 - crect.left) * dpr');
    // buffer 与实测显示失配 → 即时重同步（老内核 resize 丢失兜底）
    expect(down).toContain('Math.abs(crect.width * dpr - this.canvas.width) > 1');
    expect(down).toContain('this._resizeCanvas();');
  });

  it('_handleMove 沿用 down 时 rect（手势中途漂移免疫）', () => {
    expect(fx).toContain('this._downRect = crect;');
    expect(fx).toContain('const cr = this._downRect || this.canvas.getBoundingClientRect();');
    expect(fx).toContain('(e.clientX - cr.left) * dpr');
  });

  it('mask radius 补乘 dpr（CSS px → 设备像素域）', () => {
    expect(fx).toContain('(parseFloat(getComputedStyle(el).borderRadius) || 0) * dpr');
  });

  it('会话时序与配色解析不受影响（既有导入面零破坏）', async () => {
    const mod = await import('../ios-desktop/js/aosp/expressive-ripple.js');
    expect(mod.RippleAnimationSession).toBeTypeOf('function');
    expect(mod.ExpressiveRippleSurface).toBeTypeOf('function');
    expect(mod.computeTurbulenceUniforms).toBeTypeOf('function');
    const fxMod = await import('../ios-desktop/js/ripple-fx.js');
    expect(fxMod.parseColorToVec4('rgba(255,0,0,1)')).toEqual([1, 0, 0, 1]);
  });
});
