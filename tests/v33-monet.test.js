// ==================== v33-monet.test.js — #33 Monet 动态取色主题引擎 ====================
//
// 覆盖（AOSP packages/SystemUI/src/com/android/systemui/monet/ ColorScheme.java /
//       TonalPalette.java + material-color-utils Hct/Cam16 同构纯逻辑 + 接线）：
//   A. tone = CIE L* 数学硬锚（Python 独立实算值）
//   B. CAM16/HCT 感知 round-trip：forward(reverse(hct)) ≈ 原 hct（31 样本）
//   C. TonalPalette 不变量：hue/chroma 固定、tone 单调、边界黑/白
//   D. ColorScheme 结构：TONAL_SPOT 五调色板常量（a1 chroma≥48 / a3 hue+60 / n1 c=4）
//   E. schemeToCssVars：MD3 蓝图 tone 映射（dark 80 / light 40）+ 双轨差异 + 键集完整
//   F. 确定性量化：同输入同输出（#33 验收「同图同色板」）+ 纯色 seed + 暖色主导簇
//   G. 接线锚：theme-engine 六面 + wallpaper 三面 + 设置页卡片 + 回归锚
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  lstarFromArgb, cam16FromArgb, hctFromArgb, hctToInt,
  TonalPalette, createColorScheme, schemeToCssVars,
  quantizeColors, seedFromQuantized, monetFromRgbaData, argbToHex,
} from '../ios-desktop/js/aosp/monet.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = join(__dirname, '..');
const read = (p) => readFileSync(join(repo, p), 'utf8');

// ---------- A. tone = CIE L* 数学硬锚 ----------

describe('A. lstarFromArgb — tone=CIE L* 数学锚（Python 独立实算）', () => {
  const anchors = [
    [[128, 128, 128], 53.585],
    [[255, 0, 0], 53.2329],
    [[0, 255, 0], 87.737],
    [[0, 0, 255], 32.3026],
    [[255, 255, 255], 100.0],
    [[0, 0, 0], 0.0],
  ];
  for (const [[r, g, b], expected] of anchors) {
    it(`sRGB(${r},${g},${b}) → L*=${expected}`, () => {
      expect(Math.abs(lstarFromArgb(r, g, b) - expected)).toBeLessThan(0.01);
    });
  }
});

// ---------- B. CAM16/HCT 感知 round-trip ----------

describe('B. CAM16/HCT 感知 round-trip（forward(reverse)≈原值）', () => {
  // 高彩度等色异解下 sRGB 通道不可直接比较，但 JCH 感知量必须守恒
  const samples = [
    [255, 0, 0], [0, 255, 0], [0, 0, 255], [128, 128, 128],
    [255, 255, 255], [0, 0, 0], [103, 80, 164], [66, 133, 244],
    [250, 250, 210], [10, 200, 100], [200, 30, 90],
  ];
  let s = 42;
  const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 20; i++) {
    samples.push([Math.round(rnd() * 255), Math.round(rnd() * 255), Math.round(rnd() * 255)]);
  }

  it('31 样本 round-trip 后 h ±2° / c ±5 / t ±1.5', () => {
    let misses = [];
    for (const [r, g, b] of samples) {
      const { h, c, t } = hctFromArgb(r, g, b);
      const [r2, g2, b2] = hctToInt(h, c, t);
      const back = hctFromArgb(r2, g2, b2);
      const dh = Math.abs(((back.h - h + 540) % 360) - 180);
      if (dh > 2 || Math.abs(back.c - c) > 5 || Math.abs(back.t - t) > 1.5) {
        misses.push(`${r},${g},${b}`);
      }
    }
    expect(misses, `round-trip miss: ${misses.join(' | ')}`).toEqual([]);
  });

  it('CAM16 中性色 chroma 极小（非折扣光源白点残留，标准行为）/ 纯红 chroma 高', () => {
    expect(cam16FromArgb(128, 128, 128).c).toBeLessThan(3);
    expect(cam16FromArgb(255, 0, 0).c).toBeGreaterThan(80);
  });

  it('hctToInt 非法参数兜底中性灰', () => {
    const g = hctToInt(NaN, NaN, 50);
    expect(g.every((v) => v === Math.round(50 * 2.55) || v === Math.round(50 * 2.55))).toBe(true);
  });
});

// ---------- C. TonalPalette 不变量 ----------

describe('C. TonalPalette（SystemUI TonalPalette.java 同构）', () => {
  const pal = TonalPalette.fromInt(0xff4285f4);

  it('fromInt → hue/chroma 固定于 seed HCT', () => {
    const seedHct = hctFromArgb(66, 133, 244);
    expect(pal.h).toBeCloseTo(seedHct.h, 4);
    expect(pal.c).toBeCloseTo(seedHct.c, 4);
  });

  it('tone(0)≈黑 / tone(100)≈白', () => {
    expect(pal.tone(0).every((v) => v <= 3)).toBe(true);
    expect(pal.tone(100).every((v) => v >= 252)).toBe(true);
  });

  it('tone 0→100 亮度单调递增', () => {
    let last = -1;
    for (let t = 0; t <= 100; t += 10) {
      const l = lstarFromArgb(...pal.tone(t));
      expect(l).toBeGreaterThanOrEqual(last - 0.5);
      last = l;
    }
  });

  it('tone 表缓存 → 两次调用同引用（确定性快照锚稳定）', () => {
    expect(pal.tone(60)).toBe(pal.tone(60));
  });
});

// ---------- D. ColorScheme 结构（TONAL_SPOT 常量同构） ----------

describe('D. createColorScheme — 五调色板 TONAL_SPOT 常量', () => {
  const scheme = createColorScheme(0xff4285f4);

  it('accent1 chroma = max(seedChroma, 48)', () => {
    const seedC = hctFromArgb(66, 133, 244).c;
    expect(scheme.accent1.c).toBeGreaterThanOrEqual(48);
    expect(scheme.accent1.c).toBeCloseTo(Math.max(48, seedC), 4);
  });

  it('accent2/neutral1/neutral2 色度常量 16/4/8', () => {
    expect(scheme.accent2.c).toBeCloseTo(16, 3);
    expect(scheme.neutral1.c).toBeCloseTo(4, 3);
    expect(scheme.neutral2.c).toBeCloseTo(8, 3);
  });

  it('a1/n1/n2 同 hue，a3 = hue+60', () => {
    expect(scheme.accent1.h).toBeCloseTo(scheme.neutral1.h, 4);
    expect(scheme.neutral2.h).toBeCloseTo(scheme.seedHue, 4);
    expect(Math.abs(scheme.accent3.h - ((scheme.seedHue + 60) % 360))).toBeLessThan(0.5);
  });

  it('seed 落盘 + argbToHex 十六进制', () => {
    expect(scheme.seed).toBe(0xff4285f4);
    expect(argbToHex(0xff4285f4)).toBe('#4285f4');
  });
});

// ---------- E. schemeToCssVars — MD3 蓝图 tone 映射 ----------

describe('E. schemeToCssVars — MD3 蓝图深浅双轨', () => {
  const scheme = createColorScheme(0xff4285f4);
  const dark = schemeToCssVars(scheme, 'dark');
  const light = schemeToCssVars(scheme, 'light');

  it('键集完整（21 键：20 --md-* + seed hue）', () => {
    const keys = Object.keys(dark);
    expect(keys.length).toBe(21);
    for (const k of ['--md-primary', '--md-surface', '--md-outline', '--md-accent', '--monet-seed-hue']) {
      expect(keys).toContain(k);
    }
  });

  it('dark primary tone≈80 / light primary tone≈40（±3）', () => {
    const parse = (s) => s.match(/\((\d+),(\d+),(\d+)\)/).slice(1).map(Number);
    const [dr, dg, db] = parse(dark['--md-primary']);
    expect(Math.abs(lstarFromArgb(dr, dg, db) - 80)).toBeLessThan(3);
    const [lr, lg, lb] = parse(light['--md-primary']);
    expect(Math.abs(lstarFromArgb(lr, lg, lb) - 40)).toBeLessThan(3);
  });

  it('深浅双轨输出不同 + seed hue 一致', () => {
    expect(dark['--md-primary']).not.toBe(light['--md-primary']);
    expect(dark['--monet-seed-hue']).toBe(light['--monet-seed-hue']);
  });

  it('surface 中性低彩（dark surface tone=6）', () => {
    const [r, g, b] = dark['--md-surface'].match(/\((\d+),(\d+),(\d+)\)/).slice(1).map(Number);
    expect(Math.abs(lstarFromArgb(r, g, b) - 6)).toBeLessThan(3);
  });

  it('未知 mode 回落 dark（防御）', () => {
    expect(schemeToCssVars(scheme, 'xxx')['--md-primary']).toBe(dark['--md-primary']);
  });
});

// ---------- F. 确定性量化 ----------

describe('F. quantizeColors — 确定性（#33「同图同色板」验收）', () => {
  const px = [];
  for (let i = 0; i < 600; i++) px.push([200 + (i % 40), 80, 60]);
  for (let i = 0; i < 100; i++) px.push([30, 90, 220]);

  it('同输入两次量化输出恒等', () => {
    const q1 = quantizeColors(px, 8);
    const q2 = quantizeColors(px, 8);
    expect(JSON.stringify(q1.map((c) => [c.argb, c.weight]))).toBe(
      JSON.stringify(q2.map((c) => [c.argb, c.weight]))
    );
  });

  it('主导簇 = 频次×色度最高（暖橙红权重 6:1 胜蓝）', () => {
    const top = quantizeColors(px, 8)[0];
    const r = (top.argb >> 16) & 255, g = (top.argb >> 8) & 255, b = top.argb & 255;
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });

  it('纯色图 seed=该色（±6 容差）', () => {
    const pure = [];
    for (let i = 0; i < 100; i++) pure.push([90, 200, 120]);
    const seed = seedFromQuantized(quantizeColors(pure, 8));
    expect(Math.abs(((seed >> 16) & 255) - 90)).toBeLessThanOrEqual(6);
    expect(Math.abs(((seed >> 8) & 255) - 200)).toBeLessThanOrEqual(6);
    expect(Math.abs((seed & 255) - 120)).toBeLessThanOrEqual(6);
  });

  it('空像素回落默认科技蓝', () => {
    expect(seedFromQuantized([])).toBe(0xff215de0);
  });

  it('monetFromRgbaData：RGBA 数组端到端（alpha 剔除）', () => {
    const data = new Uint8ClampedArray(16 * 4);
    for (let i = 0; i < 12; i++) {
      data[i * 4] = 60; data[i * 4 + 1] = 130; data[i * 4 + 2] = 246; data[i * 4 + 3] = 255;
    }
    for (let i = 12; i < 16; i++) {
      data[i * 4] = 255; data[i * 4 + 1] = 0; data[i * 4 + 2] = 0; data[i * 4 + 3] = 0; // 透明剔除
    }
    const vars = schemeToCssVars(monetFromRgbaData(data), 'dark');
    expect(vars['--md-primary']).toMatch(/^rgb\(/);
  });
});

// ---------- G. 接线锚 ----------

describe('G. 接线锚 — theme-engine / wallpaper / 设置页 / 回归', () => {
  const te = read('ios-desktop/js/theme-engine.js');
  const wp = read('ios-desktop/js/wallpaper.js');
  const tm = read('ios-desktop/js/theme-mode.js');

  it('theme-engine：monet.js 消费 + 函数面 + 存储键', () => {
    expect(te).toContain("from './aosp/monet.js'");
    expect(te).toContain('export function isMonetEnabled()');
    expect(te).toContain('export function getMonetSeed()');
    expect(te).toContain('export function applyMonetSeed(seed, showToast = false)');
    expect(te).toContain('export function setMonetEnabled(on, showToast = true)');
    expect(te).toContain("const MONET_SEED_KEY = 'ios-desktop:monet-seed'");
    expect(te).toContain("const MONET_ON_KEY = 'ios-desktop:monet-enabled'");
  });

  it('theme-engine：applyThemeHue 尾钩子 + 启动恢复 + iframe 直写', () => {
    expect(te).toContain('rerollMonetIfEnabled(false);\n}');
    expect(te).toContain("window.__monetReroll = () => rerollMonetIfEnabled(false);");
    expect(te).toContain("window.__monetTest = {");
    expect(te).toContain("type: 'set-monet-vars'");
  });

  it('theme-mode：setThemeMode 触发 __monetReroll（零 import 防循环）', () => {
    expect(tm).toContain('window.__monetReroll');
  });

  it('wallpaper：取色回调接 monetFromRgbaData + Math.random 质心退役（确定性）', () => {
    expect(wp).toContain("import { monetFromRgbaData } from './aosp/monet.js'");
    expect(wp).toContain('applyMonetSeed(scheme.seed, false)');
    expect(wp).toContain('#33 确定性修复');
    expect(wp).not.toMatch(/Math\.random\(\) \* pixels\.length/);
  });

  it('设置页：Monet 卡片 + 开关 + 色板预览', () => {
    expect(te).toContain('data-test="monet-section"');
    expect(te).toContain('id="setMonetSwitch" data-test="monet-switch"');
    expect(te).toContain('data-test="monet-swatches"');
    expect(te).toContain("sw.setAttribute('data-test', `monet-swatch-${pal}`)");
  });

  it('回归锚：v7.x hsl 派生主链零破坏（--md-h 双写 + iframe 注入仍在）', () => {
    expect(te).toContain("root.style.setProperty('--md-h', hue)");
    expect(te).toContain("md3-dynamic-injected-theme");
    expect(te).toContain('generateMD3InjectedStylesheet(hue, mode)');
  });

  it('monet.js 纯逻辑纪律：零 DOM / 零 window / 零 Math.random（剥注释后判定）', () => {
    const src = read('ios-desktop/js/aosp/monet.js')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/\bdocument\./);
    expect(src).not.toMatch(/\bwindow\./);
    expect(src).not.toMatch(/Math\.random/);
  });
});
