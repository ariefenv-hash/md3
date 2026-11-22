// ==================== v1153-switch-ripple-port.test.js — v11.53 四线交付锚 ====================
// 用户指令四条：① asset-drop 涟漪移植直接拿过来用（去降采样）②开关小球乱飞修复
// ③时钟横屏半成品修复（标题右上/FAB 跑左/设置图标丢失）+ 动态图标小一圈
// ④全仓拟物感增强型高光剔除。锚定三层：引擎语义（AOSP 逐字）/ 接线结构 / 剔除断言。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');
const ENGINE = () => read('ios-desktop/js/aosp/ripple-engine.js');
const CONTROLS = () => read('ios-desktop/js/m3-controls.js');
const THEME = () => read('ios-desktop/css/md3-theme.css');
const CLOCK_HTML = () => read('ios-desktop/apps/clock-app/index.html');
const CLOCK_APP = () => read('ios-desktop/apps/clock-app/app.mjs');
const ICONS_CSS = () => read('ios-desktop/css/dynamic-icons.css');
const INDEX = () => read('ios-desktop/index.html');
const AW_CSS = () => read('ios-desktop/css/app-window.css');
const AW_JS = () => read('ios-desktop/js/app-window.js');
const AW_PAR = () => read('ios-desktop/js/app-window-parallel.js');
const DOCK = () => read('ios-desktop/css/dock.css');
const DESKTOP = () => read('ios-desktop/css/desktop.css');
const APPICONS = () => read('ios-desktop/js/app-icons.js');

// ================================================================ ① 涟漪引擎（asset-drop 第 24 轮入库）
describe('v11.53 涟漪引擎入库（asset-drop aosp-ripple-port → aosp/ripple-engine.js）', () => {
  it('AOSP RippleAnimationSession 常量逐字（ENTER 450/EXIT 375/noise 7000→32/RADIUS 2.3/density 2.1）', () => {
    const E = ENGINE();
    expect(E).toContain('AOSP_ENTER_ANIM_DURATION = 450');
    expect(E).toContain('AOSP_EXIT_ANIM_DURATION = 375');
    expect(E).toContain('AOSP_NOISE_ANIMATION_DURATION = 7000');
    expect(E).toContain('AOSP_NOISE_ANIMATION_DURATION / 214'); // MAX_NOISE_PHASE = 32
    expect(E).toContain('AOSP_MAX_RIPPLES = 10');
    expect(E).toContain('AOSP_RADIUS_MULTIPLIER = 2.3');
    expect(E).toContain('AOSP_DENSITY_SCALE = 2.1');
    expect(E).toContain('AOSP_SYSTEMUI_DURATION = 3000'); // Android 17 DEFAULT_RIPPLE_EFFECT_DURATION
  });

  it('双着色器直译在场（framework RippleShader.java + systemui RippleShader.kt + SDF mask）', () => {
    const E = ENGINE();
    // framework 星斑：triangleNoise + turbulence 三圆场 + softRing
    expect(E).toContain('float triangleNoise(vec2 n)');
    expect(E).toContain('float turbulence(vec2 uv, float t)');
    expect(E).toContain('circle_grid(scale, uv, t, in_tCircle1, in_tRotation1, 0.17)');
    expect(E).toContain('float evalMask(vec2 p)');
    // systemui：SDF 库逐字（sdCircle/roundedBoxRing/sdEllipse/distort）
    expect(E).toContain('float sdRoundedBox(vec2 p, vec2 size, float cornerRadius)');
    expect(E).toContain('float ellipseRing(vec2 p, vec2 wh)');
    expect(E).toContain('vec2 distort(vec2 p, float time');
    // 会话公式：FOSI ×0.5 enter + linear exit
    expect(E).toContain('0.5 * FAST_OUT_SLOW_IN(enterT)');
    expect(E).toContain('0.5 + 0.5 * LINEAR(exitT)');
  });

  it('去降采样：引擎与开关调用点无 devicePixelRatio 钳制（用户裁决 2.5 封顶废弃）', () => {
    const clampRe = /Math\.min\([^)]*devicePixelRatio[^)]*,\s*2\.5\)/;
    // 仅扫非注释行（引擎头注释引述上游问题属说明性文本）
    const code = (s) => s.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n');
    expect(clampRe.test(code(ENGINE()))).toBe(false);
    expect(code(CONTROLS())).toContain('Math.max(1, window.devicePixelRatio || 1)');
    expect(clampRe.test(code(CONTROLS()))).toBe(false);
  });

  it('cssColorToRipple：hex/#rrggbbaa/rgba() 三态解析（状态层主题取色）', async () => {
    const { cssColorToRipple } = await import('../ios-desktop/js/aosp/ripple-engine.js');
    const hex = cssColorToRipple('#6750A4');
    expect(hex.r).toBeCloseTo(0x67 / 255, 5);
    expect(hex.g).toBeCloseTo(0x50 / 255, 5);
    expect(hex.b).toBeCloseTo(0xa4 / 255, 5);
    expect(hex.a).toBe(1);
    const hex8 = cssColorToRipple('#FFFFFF8D'); // #RRGGBBAA：半透明白（AOSP 0x8d alpha 同语义）
    expect(hex8.a).toBeCloseTo(0x8d / 255, 5);
    expect(hex8.r).toBe(1);
    const rgba = cssColorToRipple('rgba(103, 80, 164, 0.5)');
    expect(rgba.a).toBe(0.5);
  });

  it('RippleSession framework 状态机：HOLD→release→EXIT→finished（AOSP 时序）', async () => {
    const { RippleSession } = await import('../ios-desktop/js/aosp/ripple-engine.js');
    const cfg = {
      mode: 'framework', touchX: 20, touchY: 20, originX: 20, originY: 20,
      width: 40, height: 40, dpr: 1, color: { r: 0.4, g: 0.31, b: 0.64, a: 0.2 },
      sparkleColor: { r: 1, g: 1, b: 1, a: 0.553 }, sparkleStrength: 0.3,
      distortionStrength: 1, systemUiShape: 'circle', hasMask: true,
      maskRadius: 20, densityScale: 2.1, speedMultiplier: 1,
    };
    const s = new RippleSession(1, cfg, 0);
    let st = s.computeState(0);
    expect(st.stage).toBe('ENTER');
    st = s.computeState(450);
    expect(st.stage).toBe('HOLD');        // enter 满 450ms 未释放 = HOLD
    s.release(600);
    st = s.computeState(600);             // release 时刻 exitDelay = max(450-600,0)=0 → 立即 EXIT 起点
    expect(st.stage).toBe('EXIT');
    expect(s.isHolding).toBe(false);
    st = s.computeState(600 + 376);       // EXIT 375ms 满 → DONE + finished
    expect(st.stage).toBe('DONE');
    expect(s.finished).toBe(true);
  });
});

// ================================================================ ② 开关星斑状态层接线
describe('v11.53 开关星斑状态层（官方 md-switch 40×40 几何 + asset-drop 着色器）', () => {
  it('m3-controls 接线锚：engine import + canvas 状态层 + pointerdown spawn + onEnd release', () => {
    const C = CONTROLS();
    expect(C).toContain("from './aosp/ripple-engine.js'");
    expect(C).toContain("stateLayer.className = 'm3-state-layer'");
    expect(C).toContain('spawnStateLayer(e.clientX, e.clientY)');
    expect(C).toContain('releaseStateLayer();');
    // 官方语义参数：40×40 状态层 / mask 半径 20 / wave 0.26×0.75 / sparkle 0x8d/255 / strength 0.3
    expect(C).toContain('const STATE_LAYER_SIZE = 40');
    expect(C).toContain('sparkleStrength: 0.3');
    expect(C).toContain('a: 0.553'); // AOSP DEFAULT_EFFECT_COLOR 0x8d/255
    expect(C).toContain('densityScale: AOSP_DENSITY_SCALE');
    // TDZ 纪律：声明先于初始 snapTo（render→syncStateLayerPos→currentVisualX 闭包读 moved/visualX）
    const movedIdx = C.indexOf('let moved = false;');
    const snapIdx = C.indexOf('snapTo(...restGeo(input.checked));');
    expect(movedIdx).toBeGreaterThan(-1);
    expect(snapIdx).toBeGreaterThan(movedIdx);
  });

  it('md3-theme 状态层 CSS：canvas z:1 球 z:2（涟漪不盖球）+ CSS 兜底 0.12', () => {
    const T = THEME();
    expect(T).toContain('.md3-switch .m3-state-layer');
    expect(T).toMatch(/\.md3-switch \.m3-state-layer \{[\s\S]*?z-index: 1/);
    expect(T).toMatch(/\.md3-switch \.m3-state-layer\.is-css-fallback\.is-pressed \{[\s\S]*?opacity: 0\.12/);
    expect(T).toContain('input:checked ~ .m3-state-layer.is-css-fallback');
  });
});

// ================================================================ ③ 时钟应用修复
describe('v11.53 时钟 9.3 半成品修复（横屏布局/开关乱飞/overflow 菜单）', () => {
  it('局部 .md3-switch 冲突几何已删除（乱飞根因一：两套坐标系叠加）', () => {
    const H = CLOCK_HTML();
    expect(H).not.toContain('.md3-switch .thumb');
    expect(H).not.toContain('top: 8px; left: 8px');
    expect(H).toContain('引擎单一真源');
  });

  it('主循环增量更新（乱飞根因二：每秒全量 innerHTML → 开关 transition 重放）', () => {
    const A = CLOCK_APP();
    expect(A).toContain('function tickAlarms(now)');
    expect(A).toContain('function tickWorld(now)');
    expect(A).toContain('tickWorld(now);');
    expect(A).toContain('tickAlarms(now);');
    // loop 内不再全量重建
    expect(A).not.toMatch(/sec !== lastClockSec[\s\S]{0,220}renderAlarms\(\)/);
    expect(A).not.toMatch(/sec !== lastClockSec[\s\S]{0,220}renderWorld\(\)/);
    // 增量写值比对（空闲零重绘纪律）
    expect(A).toMatch(/tickAlarms[\s\S]{0,400}el\.textContent !== up/);
    expect(A).toMatch(/tickWorld[\s\S]{0,600}clock\.textContent !== t/);
  });

  it('横屏 grid 重排：header 右列顶部横贯（row-reverse 退役）+ FAB 源码右下 margin16', () => {
    const H = CLOCK_HTML();
    expect(H).not.toContain('flex-direction: row-reverse');
    expect(H).not.toContain('right: calc(100% - 40px)'); // 加号跑左的实锚
    expect(H).toContain('grid-template-columns: var(--g93-rail) 1fr');
    expect(H).toContain('#g93Fab { bottom: 24px; right: 16px; }');
    expect(H).toMatch(/\.g93-topbar \{ grid-column: 2; grid-row: 1; \}/);
    expect(H).toMatch(/\.gastown-nav \{[\s\S]*?grid-column: 1; grid-row: 1 \/ 3;/);
  });

  it('顶栏 overflow 菜单：menu_item_* zh 逐字六项（设置图标丢失实锚）', () => {
    const H = CLOCK_HTML();
    for (const label of ['设置', '帮助', '发送反馈', '开源许可', '屏保', '隐私权政策']) {
      expect(H).toContain(`>${label}</button>`);
    }
    expect(H).toContain('data-menu-item="settings"');
    const A = CLOCK_APP();
    expect(A).toContain('function closeMenu()');
    expect(A).toContain("g93MenuBtn").length ? expect(A).toContain("g93MenuBtn") : null;
    expect(A).toContain("aria-expanded");
    // Escape 先菜单后弹层
    expect(A).toMatch(/Escape'[\s\S]{0,120}closeMenu\(\)[\s\S]{0,120}closeSheet\(\)/);
  });
});

// ================================================================ ④ 动态图标 mask 对齐
describe('v11.53 动态时钟图标 launcher mask 对齐（小一圈修复）', () => {
  it('72/108 mask 缩放：img 150% 铺满 + inset -25%（中心 2/3 可视区放大）', () => {
    const C = ICONS_CSS();
    expect(C).toMatch(/\.dynamic-clock-icon img \{[\s\S]*?width: 150%;[\s\S]*?left: -25%;[\s\S]*?top: -25%;/);
    expect(C).not.toMatch(/\.dynamic-clock-icon img \{[\s\S]*?inset: 0;/);
  });
  it('桌面/全部应用/文件夹等消费面 innerHTML 结构不动（资产仍是 APK 位图原片）', async () => {
    const { createDynamicIconHTML } = await import('../ios-desktop/js/dynamic-icons.js');
    const html = createDynamicIconHTML('clock', false);
    expect(html).toContain('lc-face');
    expect(html).toContain('face.webp');
    expect(html).toContain('rotate(');
  });
});

// ================================================================ ⑤ 拟物感增强型高光剔除
describe('v11.53 拟物高光剔除（用户裁决：对拟物与扁平两侧均无作用）', () => {
  it('窗口 rim/specular 高光层整体退役：DOM 元素 + CSS 规则 + 双文件驱动面', () => {
    expect(INDEX()).not.toContain('id="windowGlowLayer"');
    expect(AW_CSS()).not.toMatch(/^\.window-glow-layer \{/m);
    expect(AW_CSS()).not.toContain('.window-glow-layer.closing-actor-glow');
    expect(AW_CSS()).not.toContain('radial-gradient(130% 55% at 50% -14%');
    expect(AW_JS()).not.toMatch(/windowGlowLayer\.style/);
    expect(AW_PAR()).not.toMatch(/actor\.glowEl/);
    expect(AW_JS()).not.toContain('_lastGlowQ = glowOp');
  });

  it('dock border-top 亮边 / 拖拽白 rim / 相机反光点剔除（功能性发光保留）', () => {
    expect(DOCK()).not.toContain('border-top-color: rgba(255, 255, 255, 0.28)');
    expect(DESKTOP()).not.toContain('drop-shadow(0 0 16px rgba(255, 255, 255, 0.15))');
    expect(DESKTOP()).not.toContain('0 0 0 1px rgba(255, 255, 255, 0.25)');
    // 功能性指示（页面圆点选中 glow / drop-indicator）不受影响
    expect(DESKTOP()).toContain('.dot.active');
    expect(DESKTOP()).toContain('.drop-indicator');
    expect(APPICONS()).not.toContain('纯白圆形反光高光点');
    expect(APPICONS()).not.toContain('<circle cx="45" cy="49" r="4"');
  });
});
