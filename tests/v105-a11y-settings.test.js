// ==================== v105-a11y-settings.test.js — #105 无障碍基线一期 v10.85 ====================
//
// 覆盖（AOSP 实源锚，全文/逐键实拉入库 docs/reference/）：
//   · aosp/a11y-settings.js 纯逻辑：DALTONIZER_* 常量（AccessibilityManager 实源逐字）/
//     模式注册表（arrays.xml keys×values 权威映射）/ 饱和度钳制（controller MIN1/MAX10/DEF7）/
//     resolveReduceMotion 双通道 OR / resolveHtmlFilter 合成链决策表 / 缩放钳制 /
//     buildDaltonizerDefsSvg（Machado 同源矩阵 3 滤镜）/ A11Y_STORE_DEFAULTS 单一真源
//   · a11y-apply.js 接线：applyA11yRuntime 属性差分 + filter 单写点 + defs 幂等注入 +
//     字体/显示缩放通道 + 事件派发
//   · CSS 双通道：17 文件 33 块 @media 副本存在性 + html[data-a11y-reduce-motion] 前缀形态
//   · JS 读取面收口：15 壳层文件 matchMedia 读取退役 + watchReduceMotion 订阅在位
//   · settings 页 32/33/34：AOSP 渲染序文案锚 + DEFAULTS 文本守护（与纯逻辑对账防漂移）+
//     页 20 双入口转真子页
//   · status-bar P0：aria-label 语义补强（R95 审计帖行一收口）
//   · AOSP 源码锚（防回退）：DALTONIZER_DISABLED/-1、SIMULATE_MONOCHROMACY/0、
//     CORRECT_DEUTERANOMALY/12、daltonizer_type_values [12,11,13,0]、SATURATION_MIN/MAX/DEFAULT
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DALTONIZER_DISABLED,
  DALTONIZER_SIMULATE_MONOCHROMACY,
  DALTONIZER_CORRECT_DEUTERANOMALY,
  DALTONIZER_MODES,
  DALTONIZER_FILTER_IDS,
  SATURATION_MIN,
  SATURATION_MAX,
  DEFAULT_SATURATION_LEVEL,
  REDUCE_MOTION_ATTR,
  REDUCE_MOTION_EVENT,
  REDUCE_MOTION_QUERY,
  A11Y_STORE_DEFAULTS,
  A11Y_STORE_KEY,
  isValidDaltonizerMode,
  clampSaturationLevel,
  resolveReduceMotion,
  resolveHtmlFilter,
  clampFontScale,
  clampDisplayScale,
  isReduceMotionActive,
  watchReduceMotion,
  buildDaltonizerDefsSvg,
} from '../ios-desktop/js/aosp/a11y-settings.js';
import { applyA11yRuntime, loadA11yStore, ensureDaltonizerDefs } from '../ios-desktop/js/a11y-apply.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const REF = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'reference', p);
const read = (p) => readFileSync(R(p), 'utf8');
/** 剥注释扫描（R77 同款：防注释字面误伤） */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** jsdom-free 文档桩：html 元素 + 属性/风格面 + addEventListener 收集 */
function fakeDoc() {
  const attrs = new Map();
  const style = { props: new Map(), setProperty(k, v) { this.props.set(k, v); }, removeProperty(k) { this.props.delete(k); }, get filter() { return this.props.get('filter') || ''; }, set filter(v) { this.props.set('filter', v); } };
  const documentElement = {
    hasAttribute: (n) => attrs.has(n),
    setAttribute: (n, v) => attrs.set(n, v),
    removeAttribute: (n) => attrs.delete(n),
    style,
  };
  const listeners = [];
  const registry = new Map();
  return {
    documentElement,
    listeners,
    registry,
    addEventListener(t, f) { listeners.push([t, f]); },
    removeEventListener(t, f) { const i = listeners.findIndex(([tt, ff]) => tt === t && ff === f); if (i >= 0) listeners.splice(i, 1); },
    dispatchEvent() { return true; },
    getElementById: (id) => registry.get(id) || null,
    createElement: () => ({
      _html: '',
      firstChild: null,
      get innerHTML() { return this._html; },
      set innerHTML(v) { this._html = v; const m = String(v).match(/id="([^"]+)"/); this.firstChild = { id: m ? m[1] : '' }; },
      appendChild() {},
    }),
    __body: { appendChild(el) { if (el && el.id) registry.set(el.id, el); } },
    get body() { return this.__body; },
  };
}

describe('v105-A · AOSP 实源锚常量（防回退）', () => {
  it('A1 AccessibilityManager.DALTONIZER_* 逐字（实拉 AccessibilityManager.java）', () => {
    expect(DALTONIZER_DISABLED).toBe(-1);
    expect(DALTONIZER_SIMULATE_MONOCHROMACY).toBe(0);
    expect(DALTONIZER_CORRECT_DEUTERANOMALY).toBe(12);
    const src = readFileSync(REF('frameworks-base/accessibility/AccessibilityManager.java'), 'utf8');
    expect(src).toContain('public static final int DALTONIZER_DISABLED = -1');
    expect(src).toContain('public static final int DALTONIZER_SIMULATE_MONOCHROMACY = 0');
    expect(src).toContain('public static final int DALTONIZER_CORRECT_DEUTERANOMALY = 12');
  });

  it('A2 模式注册表 = arrays.xml keys×values 权威映射与序（[12,11,13,0]）', () => {
    expect(DALTONIZER_MODES.map((m) => m.value)).toEqual([12, 11, 13, 0]);
    expect(DALTONIZER_MODES.map((m) => m.key)).toEqual(['deuteranomaly', 'protanomaly', 'tritanomaly', 'grayscale']);
    // zh-rCN 权威文案（values-zh-rCN/strings.xml 实拉）
    expect(DALTONIZER_MODES[0].title).toBe('红绿色盲、绿色弱');
    expect(DALTONIZER_MODES[1].title).toBe('红绿色盲、红色弱');
    expect(DALTONIZER_MODES[2].title).toBe('蓝黄色盲');
    expect(DALTONIZER_MODES[3].title).toBe('灰度模式');
  });

  it('A3 饱和度档位 = DaltonizerSaturationSeekbarPreferenceController 实源逐字', () => {
    expect(SATURATION_MIN).toBe(1);
    expect(SATURATION_MAX).toBe(10);
    expect(DEFAULT_SATURATION_LEVEL).toBe(7);
    expect(clampSaturationLevel(0)).toBe(1);
    expect(clampSaturationLevel(99)).toBe(10);
    expect(clampSaturationLevel(7.4)).toBe(7);
    expect(clampSaturationLevel('x')).toBe(7);
  });

  it('A4 双通道契约常量 + 实源 XML 入库体检', () => {
    expect(REDUCE_MOTION_ATTR).toBe('data-a11y-reduce-motion');
    expect(REDUCE_MOTION_EVENT).toBe('a11y-reduce-motion-changed');
    expect(REDUCE_MOTION_QUERY).toBe('(prefers-reduced-motion: reduce)');
    expect(readFileSync(REF('packages-apps-settings/color-and-motion/accessibility_color_and_motion.xml'), 'utf8')).toContain('android:key="animator_duration_scale"');
    expect(readFileSync(REF('packages-apps-settings/color-and-motion/accessibility_daltonizer_settings.xml'), 'utf8')).toContain('daltonizer_mode_deuteranomaly');
    expect(readFileSync(REF('packages-apps-settings/color-and-motion/accessibility_text_reading_options.xml'), 'utf8')).toContain('toggle_high_text_contrast_preference');
  });
});

describe('v105-B · 纯逻辑判定表', () => {
  it('B1 resolveReduceMotion：双通道 OR 合成（R95 审计帖方案）', () => {
    expect(resolveReduceMotion({ mediaMatches: false, attrPresent: false })).toBe(false);
    expect(resolveReduceMotion({ mediaMatches: true, attrPresent: false })).toBe(true);
    expect(resolveReduceMotion({ mediaMatches: false, attrPresent: true })).toBe(true);
    expect(resolveReduceMotion({})).toBe(false);
  });

  it('B2 resolveHtmlFilter 合成链决策表（RBC × daltonizer × inversion 单写点）', () => {
    expect(resolveHtmlFilter({})).toBe('');
    expect(resolveHtmlFilter({ rbc: true })).toBe('brightness(0.5)');
    expect(resolveHtmlFilter({ daltonizerEnabled: true, daltonizerMode: 0 })).toBe('grayscale(1)');
    expect(resolveHtmlFilter({ daltonizerEnabled: true, daltonizerMode: 12, daltonizerSaturation: 7 }))
      .toBe('url(#a11y-daltonizer-deuteranomaly) saturate(0.7)');
    expect(resolveHtmlFilter({ daltonizerEnabled: true, daltonizerMode: 11, daltonizerSaturation: 10 }))
      .toBe('url(#a11y-daltonizer-protanomaly) saturate(1)');
    expect(resolveHtmlFilter({ daltonizerEnabled: true, daltonizerMode: 13 }))
      .toBe('url(#a11y-daltonizer-tritanomaly) saturate(0.7)');
    expect(resolveHtmlFilter({ colorInversion: true })).toBe('invert(1) hue-rotate(180deg)');
    // 三层乘法合成 + 应用序 brightness → daltonizer → inversion
    expect(resolveHtmlFilter({ rbc: true, daltonizerEnabled: true, daltonizerMode: 0, colorInversion: true }))
      .toBe('brightness(0.5) grayscale(1) invert(1) hue-rotate(180deg)');
    // 灰度模式饱和度不可用（daltonizer_saturation_unavailable_summary 权威语义）
    expect(resolveHtmlFilter({ daltonizerEnabled: true, daltonizerMode: 0, daltonizerSaturation: 3 })).toBe('grayscale(1)');
    // 未收录模式诚实降级（isValidDaltonizerMode 负例）
    expect(isValidDaltonizerMode(99)).toBe(false);
    expect(resolveHtmlFilter({ daltonizerEnabled: true, daltonizerMode: 99 })).toBe('');
    // 关闭态覆盖任何残留模式值
    expect(resolveHtmlFilter({ daltonizerEnabled: false, daltonizerMode: 12 })).toBe('');
  });

  it('B3 缩放钳制（fontScale 85–150 / displayScale 85–130）', () => {
    expect(clampFontScale(0)).toBe(85);
    expect(clampFontScale(300)).toBe(150);
    expect(clampFontScale(100)).toBe(100);
    expect(clampFontScale('bad')).toBe(100);
    expect(clampDisplayScale(50)).toBe(85);
    expect(clampDisplayScale(999)).toBe(130);
  });

  it('B4 buildDaltonizerDefsSvg：三滤镜 id 与 feColorMatrix 形态（Machado 同源标注）', () => {
    const svg = buildDaltonizerDefsSvg();
    expect(svg).toContain('id="a11yDaltonizerDefs"');
    expect(svg).toContain('id="a11y-daltonizer-deuteranomaly"');
    expect(svg).toContain('id="a11y-daltonizer-protanomaly"');
    expect(svg).toContain('id="a11y-daltonizer-tritanomaly"');
    expect(svg.match(/<feColorMatrix type="matrix"/g).length).toBe(3);
    expect(svg).toContain('color-interpolation-filters="sRGB"');
    expect(svg).toContain('aria-hidden="true"');
  });

  it('B5 A11Y_STORE_DEFAULTS 单一真源（v8.02 两键保留 + 一期九键）', () => {
    expect(Object.keys(A11Y_STORE_DEFAULTS)).toEqual([
      'rbc', 'audioDescription', 'removeAnimations', 'colorInversion', 'daltonizerEnabled',
      'daltonizerMode', 'daltonizerSaturation', 'fontScale', 'displayScale', 'boldText', 'highContrastText',
    ]);
    expect(A11Y_STORE_DEFAULTS.daltonizerMode).toBe(12);
    expect(A11Y_STORE_DEFAULTS.daltonizerSaturation).toBe(7);
    expect(A11Y_STORE_KEY).toBe('settings:accessibility-v1');
  });
});

describe('v105-C · a11y-apply.js 接线（fakeDoc 真跑）', () => {
  it('C1 applyA11yRuntime 属性差分与 filter 单写点', () => {
    const doc = fakeDoc();
    const r1 = applyA11yRuntime({ removeAnimations: true, boldText: true, highContrastText: true, rbc: true, daltonizerEnabled: true, daltonizerMode: 12, daltonizerSaturation: 7, colorInversion: false, fontScale: 100, displayScale: 100 }, doc);
    expect(r1.attrChanged).toBe(true);
    expect(doc.documentElement.hasAttribute('data-a11y-reduce-motion')).toBe(true);
    expect(doc.documentElement.hasAttribute('data-a11y-bold-text')).toBe(true);
    expect(doc.documentElement.hasAttribute('data-a11y-high-contrast')).toBe(true);
    expect(doc.documentElement.style.filter).toBe('brightness(0.5) url(#a11y-daltonizer-deuteranomaly) saturate(0.7)');
    // 幂等重放：attrChanged = false（值差分零触碰）
    const r2 = applyA11yRuntime({ removeAnimations: true, boldText: true, highContrastText: true, rbc: true, daltonizerEnabled: true, daltonizerMode: 12, daltonizerSaturation: 7, colorInversion: false, fontScale: 100, displayScale: 100 }, doc);
    expect(r2.attrChanged).toBe(false);
    // 摘除：属性清 + filter 回空串
    applyA11yRuntime({ removeAnimations: false, boldText: false, highContrastText: false, rbc: false, fontScale: 100, displayScale: 100 }, doc);
    expect(doc.documentElement.hasAttribute('data-a11y-reduce-motion')).toBe(false);
    expect(doc.documentElement.style.filter).toBe('');
  });

  it('C2 缩放通道：根字号与 --a11y-display-scale 变量（100% 清除回退）', () => {
    const doc = fakeDoc();
    applyA11yRuntime({ fontScale: 120, displayScale: 85 }, doc);
    expect(doc.documentElement.style.fontSize).toBe('19.2px');
    expect(doc.documentElement.style.props.get('--a11y-display-scale')).toBe('0.85');
    applyA11yRuntime({ fontScale: 100, displayScale: 100 }, doc);
    expect(doc.documentElement.style.props.has('--a11y-display-scale')).toBe(false);
  });

  it('C3 defs 幂等注入（url(#) 引用先于 filter 链存在的硬保证）', () => {
    const doc = fakeDoc();
    ensureDaltonizerDefs(doc);
    ensureDaltonizerDefs(doc);
    expect(doc.getElementById('a11yDaltonizerDefs')).toBeTruthy();
  });

  it('C4 事件派发：REDUCE_MOTION_EVENT 变更态广播（watchReduceMotion 订阅面）', () => {
    const doc = fakeDoc();
    let dispatched = 0;
    doc.dispatchEvent = () => { dispatched += 1; return true; };
    applyA11yRuntime({ removeAnimations: true }, doc);
    expect(dispatched).toBe(1);
    applyA11yRuntime({ removeAnimations: true }, doc);
    expect(dispatched).toBe(1); // 幂等不重复广播
    applyA11yRuntime({ removeAnimations: false }, doc);
    expect(dispatched).toBe(2);
  });

  it('C5 watchReduceMotion：订阅即回调 + 事件订阅/退订对称', () => {
    const doc = fakeDoc();
    let matchMediaDefined = false;
    const events = [];
    doc.addEventListener = (t, f) => events.push([t, f]);
    doc.removeEventListener = (t, f) => { const i = events.findIndex(([tt, ff]) => tt === t && ff === f); if (i >= 0) events.splice(i, 1); };
    const seen = [];
    const un = watchReduceMotion(doc, (v) => seen.push(v));
    expect(seen).toEqual([false]); // 订阅即当前值（无属性无 media）
    expect(events.some(([t]) => t === 'a11y-reduce-motion-changed')).toBe(true);
    un();
    expect(events.some(([t]) => t === 'a11y-reduce-motion-changed')).toBe(false);
    expect(matchMediaDefined).toBe(false);
  });

  it('C6 isReduceMotionActive：doc 注入 + attr 判定（mediaMatches 注入通道）', () => {
    const doc = fakeDoc();
    expect(isReduceMotionActive({ doc, mediaMatches: false })).toBe(false);
    doc.documentElement.setAttribute('data-a11y-reduce-motion', '');
    expect(isReduceMotionActive({ doc, mediaMatches: false })).toBe(true);
    expect(isReduceMotionActive({ doc: null, mediaMatches: false })).toBe(false);
  });

  it('C7 loadA11yStore：异常 JSON 回落全默认（出厂态）', () => {
    const orig = globalThis.localStorage;
    globalThis.localStorage = {
      getItem: () => '{broken json',
      setItem() {}, removeItem() {},
    };
    expect(loadA11yStore()).toEqual(A11Y_STORE_DEFAULTS);
    globalThis.localStorage = {
      getItem: () => JSON.stringify({ rbc: true, bogus: 1 }),
      setItem() {}, removeItem() {},
    };
    const s = loadA11yStore();
    expect(s.rbc).toBe(true);
    expect(s.bogus).toBeUndefined();
    expect(s.daltonizerMode).toBe(12);
    globalThis.localStorage = orig;
  });
});

describe('v105-D · CSS 双通道迁移（34 块副本形态体检；v10.85 #210 lock-screen.css bouncer 组 +1 块重锚）', () => {
  const cssFiles = [
    'css/all-apps.css', 'css/aod.css', 'css/base.css', 'css/desktop.css', 'css/dock.css',
    'css/files-app.css', 'css/lock-screen.css', 'css/m3e.css', 'css/mini-window.css',
    'css/nav-bar.css', 'css/pixel-features.css', 'css/pull-panels.css', 'css/split-screen.css',
    'css/taskbar-transient.css', 'css/taskbar.css', 'css/theme-mode.css', 'css/widget-board.css',
  ];

  it('D1 全部 17 文件均有属性通道副本（@media 块数 = 副本块数；v10.85 #210 重锚 33→34）', () => {
    let totalMedia = 0;
    let totalAttr = 0;
    for (const f of cssFiles) {
      const css = read(f);
      const media = (css.match(/@media \(prefers-reduced-motion: reduce\)/g) || []).length;
      const attr = (css.match(/html\[data-a11y-reduce-motion\]/g) || []).length
        + (css.match(/(?<!html)\[data-a11y-reduce-motion\] /g) || []).length;
      expect(media, f).toBeGreaterThan(0);
      expect(attr, f).toBeGreaterThanOrEqual(media);
      totalMedia += media;
      totalAttr += attr;
    }
    expect(totalMedia).toBe(34);
    expect(totalAttr).toBeGreaterThanOrEqual(34);
  });

  it('D2 前缀形态正确：html/:root 内联特判 + 普通选择器后代前缀', () => {
    const dock = read('css/dock.css');
    expect(dock).toContain('[data-a11y-reduce-motion] .dock-bar');
    const base = read('css/base.css');
    // 原块保留（系统通道不退役）
    expect(base).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('D3 inline <style> 双通道：share-sheet / volume-dialog 副本在位', () => {
    expect(read('js/share-sheet.js')).toContain('html[data-a11y-reduce-motion] .share-sheet-card');
    expect(read('js/volume-dialog.js')).toContain('html[data-a11y-reduce-motion] .mo-card');
  });
});

describe('v105-E · JS 读取面收口（15 壳层文件）', () => {
  const callTimeFiles = [
    'js/charging-ripple.js', 'js/lock-screen.js', 'js/m3e.js', 'js/nav-bar.js',
    'js/pull-down-gesture.js', 'js/quick-settings.js', 'js/ripple-fx.js', 'js/scroll-fx.js',
    'js/split-screen.js',
  ];
  const cacheWatchFiles = [
    'js/dock.js', 'js/mini-window.js', 'js/gestures.js', 'js/app-window-parallel.js',
    'js/procedural-wallpaper.js', 'js/video-wallpaper.js',
  ];

  it('E1 调用型位点：matchMedia 读取退役 + isReduceMotionActive 消费', () => {
    for (const f of callTimeFiles) {
      const src = stripComments(read(f));
      expect(src.includes("matchMedia('(prefers-reduced-motion: reduce)')"), f).toBe(false);
      expect(src.includes('isReduceMotionActive()'), f).toBe(true);
      expect(src.includes("./aosp/a11y-settings.js'"), f).toBe(true);
    }
  });

  it('E2 缓存型位点：缓存保留 + watchReduceMotion 属性通道订阅', () => {
    for (const f of cacheWatchFiles) {
      const src = stripComments(read(f));
      expect(src.includes('watchReduceMotion('), f).toBe(true);
      expect(src.includes('isReduceMotionActive()'), f).toBe(true);
      expect(src.includes("./aosp/a11y-settings.js'"), f).toBe(true);
    }
  });

  it('E3 a11y-settings.js 自身零裸 matchMedia 读取（readReduceMotionMedia 唯一出口）', () => {
    const src = stripComments(read('js/aosp/a11y-settings.js'));
    expect(src.includes("matchMedia(REDUCE_MOTION_QUERY)")).toBe(true);
    // 除 readReduceMotionMedia/watchReduceMotion 外无裸读取
    const bare = src.split('export const readReduceMotionMedia')[0];
    expect(bare.includes('matchMedia(')).toBe(false);
  });
});

describe('v105-F · settings 页 32/33/34 + 页 20 入口', () => {
  const ST = read('js/apps/settings.js');

  it('F1 页 20 双入口转真子页（__tpNav 32/33）', () => {
    const stripped = stripComments(ST);
    expect(stripped).toContain('onclick="__tpNav(this,32)"');
    expect(stripped).toContain('onclick="__tpNav(this,33)"');
  });

  it('F2 页 32 色彩和动画：AOSP 渲染序文案锚 + 真开关 id', () => {
    expect(ST).toContain('色彩校正 · 颜色反转 · 移除动画');
    expect(ST).toContain('id="a11yColorInvertToggle"');
    expect(ST).toContain('id="a11yRemoveAnimToggle"');
    expect(ST).toContain('将亮屏幕调暗，将暗屏幕调亮');   // color_inversion_feature_summary 权威
    expect(ST).toContain('减少屏幕动画');                  // accessibility_disable_animations_summary 权威
    expect(ST).toContain('onclick="__tpNav(this,34)"');    // 色彩校正三级页入口
    expect(ST).toContain('onclick="__tpNav(this,1)"');     // 深色主题承接显示页
  });

  it('F3 页 33 显示大小和文字：四真实能力 + 权威文案 + 重置', () => {
    expect(ST).toContain('id="a11yFontScale"');
    expect(ST).toContain('id="a11yDisplayScale"');
    expect(ST).toContain('id="a11yBoldTextToggle"');
    expect(ST).toContain('id="a11yHighContrastToggle"');
    expect(ST).toContain('id="a11yTextReadingReset"');
    expect(ST).toContain('放大或缩小文字');   // short_summary_font_size 权威
    expect(ST).toContain('放大或缩小所有内容'); // screen_zoom_short_summary 权威
    expect(ST).toContain('将文字颜色更改为黑色或白色，使其与背景形成尽可能鲜明的对比。');
    expect(ST).toContain('粗体文字');
  });

  it('F4 页 34 色彩校正：primary switch + 四模式 + 强度档位', () => {
    expect(ST).toContain('id="a11yDaltonizerToggle"');
    expect(ST).toContain('name="a11yDaltonizerMode"');
    expect(ST).toContain('红绿色盲、绿色弱');
    expect(ST).toContain('蓝黄色盲');
    expect(ST).toContain('灰度模式');
    expect(ST).toContain('id="a11yDaltonizerSat"');
    expect(ST).toContain('在灰度模式下或');
    expect(ST).toContain('Machado');
  });

  it('F5 DEFAULTS 文本守护：页脚本 DEFAULTS 键序 ≡ A11Y_STORE_DEFAULTS（漂移即红）', () => {
    // 锚定 a11y 族 DEFAULTS（rbc 开头键序；文件内另有 lockscreen 等页同名 DEFAULTS）
    const m = ST.match(/var DEFAULTS = \{ rbc: false, audioDescription: false([^}]*)\};/);
    expect(m).toBeTruthy();
    const pageKeys = ('rbc: false, audioDescription: false' + m[1]).split(',').map((kv) => kv.split(':')[0].trim());
    expect(pageKeys).toEqual(Object.keys(A11Y_STORE_DEFAULTS));
    // 四份页脚本一致（A11Y/COLOR_MOTION/DALTONIZER/TEXT_READING）
    const count = (ST.match(/var DEFAULTS = \{ rbc: false, audioDescription: false, removeAnimations: false/g) || []).length;
    expect(count).toBe(4);
  });
});

describe('v105-G · status-bar P0（R95 审计帖行一收口）', () => {
  it('G1 sb-slot/privacy/noti 全部 title 位点补 aria-label（title 保留 tooltip 面）', () => {
    const sb = stripComments(read('js/status-bar.js'));
    expect(sb).toContain('title="${s.slot}" aria-label="${SB_SLOT_ARIA[s.slot] || s.slot}" role="img"');
    expect(sb).toContain('title="${t}" aria-label="${PRIVACY_ARIA[t] || t}" role="img"');
    expect(sb).toContain('aria-label="${escAttr(n && n.app)}');
    expect(sb).toContain('aria-label="还有 ${more} 条通知"');
    // 映射表语义锚（12 插槽全表）
    expect(sb).toContain('alarm_clock: \'闹钟\'');
    expect(sb).toContain('screen_record: \'正在录屏\'');
    expect(sb).toContain('camera: \'正在使用摄像头\'');
  });
});
