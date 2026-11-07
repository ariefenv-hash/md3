// ==================== v201-theme-color.test.js — #50 ColorBlendr 式主题色自定义 v10.51 ====================
//
// 覆盖（R93 窗主作业，设置›壁纸和样式›主题色）：
//   · aosp/theme-color.js 纯逻辑：MONET_STYLES 10 风格注册表（ColorBlendr MonetStyle.kt 实拉
//     权威名逐字 + tier 三档标注）、blendSeeds 双端 HCT 混色（hue 最短弧 + 端点保留）、
//     buildCustomScheme 四参数配色（seed/secondary/tertiary/contrast + 三滑杆 0-200），
//     与 monet.js createColorScheme 同构（schemeToCssVars 零改动消费）
//   · parseCommunityTheme 社区主题严格 codec（CommunityThemeCodec.kt 同律：非法输入 → null
//     绝不半成品；schemaVersion 1/2、id/hex 正则、滑杆 0-200、字节上限、v1 禁 v2 专有键）
//   · PRESET_COLORS 预设八色（M3 key colors 锚 + hue 环分布）
//   · theme-engine.js 接线锚（剥注释扫描）：import 链 / 存储键 / reroll 优先级（自定义覆盖 >
//     壁纸取色）/ 五 UI 挂点 data-test / __themeColorTest 钩子
//   · ColorBlendr 源锚（GPL-3.0 master 2026-11-04 GitHub contents API 实拉，防记忆漂移）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MONET_STYLES,
  PRESET_COLORS,
  buildCustomScheme,
  blendSeeds,
  parseCommunityTheme,
  parseHexColor,
  normalizeSeedColor,
  resolveStyle,
} from '../ios-desktop/js/aosp/theme-color.js';
import { schemeToCssVars, createColorScheme, hctFromArgb } from '../ios-desktop/js/aosp/monet.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', p);
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const TE = stripComments(readFileSync(R('ios-desktop/js/theme-engine.js'), 'utf8'));
const TC = stripComments(readFileSync(R('ios-desktop/js/aosp/theme-color.js'), 'utf8'));

// ---------- A 组：MONET 风格注册表权威锚 ----------

describe('A · MONET_STYLES 注册表（ColorBlendr MonetStyle.kt 权威名逐字）', () => {
  it('A1 恰 10 风格，权威名集合逐字（枚举序一致）', () => {
    expect(MONET_STYLES.map((s) => s.name)).toEqual([
      'SPRITZ', 'MONOCHROMATIC', 'TONAL_SPOT', 'VIBRANT', 'RAINBOW',
      'EXPRESSIVE', 'FIDELITY', 'CONTENT', 'FRUIT_SALAD', 'CMF',
    ]);
  });

  it('A2 TONAL_SPOT 为 native 基准（AOSP 12+ 默认），其余近似档标注 ≈', () => {
    const tonal = MONET_STYLES.find((s) => s.name === 'TONAL_SPOT');
    expect(tonal.tier).toBe('native');
    expect(tonal.chromaMult).toBe(1);
    expect(tonal.hueShift).toBe(0);
    for (const s of MONET_STYLES) {
      if (s.name !== 'TONAL_SPOT') expect(s.tier).not.toBe('native');
    }
  });

  it('A3 FIDELITY/CONTENT/CMF 降档 stub（ColorBlendr 侧须 root 的 isAvailable 门同律）', () => {
    for (const name of ['FIDELITY', 'CONTENT', 'CMF']) {
      expect(MONET_STYLES.find((s) => s.name === name).tier).toBe('stub');
    }
  });

  it('A4 风格变换参数表：SPRITZ 0.3× / VIBRANT 1.25× / MONOCHROMATIC 0× / FRUIT_SALAD +90° / EXPRESSIVE +15°', () => {
    const m = Object.fromEntries(MONET_STYLES.map((s) => [s.name, s]));
    expect(m.SPRITZ.chromaMult).toBeCloseTo(0.3);
    expect(m.VIBRANT.chromaMult).toBeCloseTo(1.25);
    expect(m.MONOCHROMATIC.chromaMult).toBe(0);
    expect(m.FRUIT_SALAD.hueShift).toBe(90);
    expect(m.EXPRESSIVE.hueShift).toBe(15);
  });

  it('A5 resolveStyle 未知回落 TONAL_SPOT（toEnumMonet 同律）', () => {
    expect(resolveStyle('NOT_A_STYLE').name).toBe('TONAL_SPOT');
    expect(resolveStyle(undefined).name).toBe('TONAL_SPOT');
  });
});

// ---------- B 组：blendSeeds 双端 HCT 混色 ----------

describe('B · blendSeeds 双端混色（HCT 域插值）', () => {
  it('B1 端点保留原色（HCT 往返 sRGB 域内无损）', () => {
    const ramp = blendSeeds('#0B57D0', '#984061', 5);
    expect(ramp).not.toBeNull();
    expect(ramp[0].hex).toBe('#0b57d0');
    expect(ramp[4].hex).toBe('#984061');
  });

  it('B2 阶数与 t 参数单调（0 → 1 均匀）', () => {
    const ramp = blendSeeds('#0B57D0', '#984061', 5);
    expect(ramp).toHaveLength(5);
    ramp.forEach((r, i) => expect(r.t).toBeCloseTo(i / 4));
  });

  it('B3 hue 最短弧插值：蓝(≈270°)→红(≈0°) 不绕远路（中点 hue ∈ [300°,360°]∪[0°,30°]）', () => {
    const ramp = blendSeeds('#0000FF', '#FF0000', 3);
    const midHue = ramp[1].hct.h;
    expect(midHue <= 30 || midHue >= 330).toBe(true);
  });

  it('B4 非法输入 → null（hex 形态 / 步数 <2 / >24 / 非法端色）', () => {
    expect(blendSeeds('red', '#984061', 5)).toBeNull();
    expect(blendSeeds('#0B57D0', 'not-hex', 5)).toBeNull();
    expect(blendSeeds('#0B57D0', '#984061', 1)).toBeNull();
    expect(blendSeeds('#0B57D0', '#984061', 25)).toBeNull();
    expect(blendSeeds('#0B57D0', '#984061', 2.7)).toBeNull();
    expect(blendSeeds('#0B57D0', '#984061', 24)).not.toBeNull();
  });
});

// ---------- C 组：buildCustomScheme 四参数配色 ----------

describe('C · buildCustomScheme（createColorScheme 同构）', () => {
  it('C1 产出与 createColorScheme 同构：五 palette + seed/seedHue/seedChroma，schemeToCssVars 直接消费', () => {
    const s = buildCustomScheme({ seed: '#215DE0' });
    const base = createColorScheme(parseHexColor('#215DE0'));
    expect(s.accent1).toBeDefined();
    expect(s.neutral1).toBeDefined();
    expect(s.neutral2).toBeDefined();
    expect(s.seed).toBe(base.seed);
    expect(Math.round(s.seedHue)).toBe(Math.round(base.seedHue));
    const vars = schemeToCssVars(s, 'dark');
    expect(Object.keys(vars)).toHaveLength(21);
    expect(vars['--md-primary']).toMatch(/^rgb\(/);
  });

  it('C2 FRUIT_SALAD hue+90 旋转生效（seed 蓝 ≈270° → accent1 ≈0°）', () => {
    const s = buildCustomScheme({ seed: '#215DE0', style: 'FRUIT_SALAD' });
    const [r, g, b] = s.accent1.tone(80);
    const hct = hctFromArgb(r, g, b);
    const expected = (s.seedHue + 90) % 360;
    const diff = Math.abs(((hct.h - expected + 540) % 360) - 180);
    expect(diff).toBeLessThanOrEqual(6); // solver 精度容差
  });

  it('C3 MONOCHROMATIC accent 零彩度（tone80 近灰：RGB 通道极差 ≤6）', () => {
    const s = buildCustomScheme({ seed: '#B3261E', style: 'MONOCHROMATIC' });
    const [r, g, b] = s.accent1.tone(80);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(6);
  });

  it('C4 显式 secondary/tertiary 覆盖 accent2/accent3 hue', () => {
    const s = buildCustomScheme({ seed: '#0B57D0', secondary: '#386A20', tertiary: '#B93815' });
    const [r2, g2, b2] = s.accent2.tone(40);
    const h2 = hctFromArgb(r2, g2, b2).h;
    const secHct = hctFromArgb(0x38, 0x6a, 0x20);
    expect(Math.abs(((h2 - secHct.h + 540) % 360) - 180)).toBeLessThanOrEqual(6);
    const [r3, g3, b3] = s.accent3.tone(40);
    const h3 = hctFromArgb(r3, g3, b3).h;
    const terHct = hctFromArgb(0xb9, 0x38, 0x15);
    expect(Math.abs(((h3 - terHct.h + 540) % 360) - 180)).toBeLessThanOrEqual(6);
  });

  it('C5 contrast 正向 → dark 主色更亮（tone 80 偏移 +4）；contrast 钳制 ±1', () => {
    const s0 = buildCustomScheme({ seed: '#0B57D0', contrast: 0 });
    const s1 = buildCustomScheme({ seed: '#0B57D0', contrast: 1 });
    const s2 = buildCustomScheme({ seed: '#0B57D0', contrast: 9 }); // 钳到 1
    const [r0] = s0.accent1.tone(80);
    const [r1] = s1.accent1.tone(80);
    const [r2] = s2.accent1.tone(80);
    expect(r1).toBeGreaterThanOrEqual(r0);
    expect(r2).toBe(r1);
  });

  it('C6 backgroundLightness 200 → surface 更亮（neutral tone 偏移 +10）', () => {
    const s0 = buildCustomScheme({ seed: '#0B57D0' });
    const s2 = buildCustomScheme({ seed: '#0B57D0', backgroundLightness: 200 });
    const [r0, g0, b0] = s0.neutral1.tone(6);
    const [r2, g2, b2] = s2.neutral1.tone(6);
    const lum0 = r0 + g0 + b0;
    const lum2 = r2 + g2 + b2;
    expect(lum2).toBeGreaterThan(lum0);
  });

  it('C7 accentSaturation 0 → accent1 彩度近零；200 → 显著高于 100 档（tone40 色域中心测，避开 tone80 高亮度 sRGB 钳制）', () => {
    const s0 = buildCustomScheme({ seed: '#0B57D0', accentSaturation: 0 });
    const [r0, g0, b0] = s0.accent1.tone(40);
    expect(hctFromArgb(r0, g0, b0).c).toBeLessThanOrEqual(4);
    const s1 = buildCustomScheme({ seed: '#0B57D0', accentSaturation: 100 });
    const s2 = buildCustomScheme({ seed: '#0B57D0', accentSaturation: 200 });
    const [r1, g1, b1] = s1.accent1.tone(40);
    const [r2, g2, b2] = s2.accent1.tone(40);
    const c1 = hctFromArgb(r1, g1, b1).c;
    const c2 = hctFromArgb(r2, g2, b2).c;
    expect(c2).toBeGreaterThan(c1);
    expect(c1).toBeGreaterThanOrEqual(48); // TONAL_SPOT 48 下限在色域中心可行
  });

  it('C8 非法输入 → null（seed hex/int 双形态，非法拒绝）', () => {
    expect(buildCustomScheme({ seed: 'red' })).toBeNull();
    expect(buildCustomScheme({})).toBeNull();
    expect(buildCustomScheme({ seed: 1234 })).not.toBeNull(); // ARGB int 形态
    expect(buildCustomScheme({ seed: -5 })).toBeNull();
    expect(buildCustomScheme({ seed: '#0B57D0', accentSaturation: 300 })).not.toBeNull(); // 越界滑杆回落默认 100
    expect(buildCustomScheme({ seed: '#0B57D0', style: 'NOT_A_STYLE' })).not.toBeNull(); // 未知风格回落
  });
});

// ---------- D 组：parseCommunityTheme 严格 codec ----------

const GOOD_V1 = JSON.stringify({
  schemaVersion: 1,
  id: 'ocean-dawn',
  name: 'Ocean Dawn',
  description: 'A calm blue theme',
  author: 'z',
  style: 'TONAL_SPOT',
  seedColor: '#0B57D0',
  secondaryColor: '#386A20',
  tertiaryColor: '#B93815',
  accentSaturation: 120,
  backgroundSaturation: 90,
  backgroundLightness: 110,
  colorSpecVersion: 0,
});

describe('D · parseCommunityTheme（CommunityThemeCodec.kt 同律）', () => {
  it('D1 合法 v1 全字段通过：seed/secondary/tertiary 归一 ARGB + 滑杆保真', () => {
    const t = parseCommunityTheme(GOOD_V1);
    expect(t).not.toBeNull();
    expect(t.id).toBe('ocean-dawn');
    expect(t.name).toBe('Ocean Dawn');
    expect(t.style).toBe('TONAL_SPOT');
    expect(t.seed).toBe(parseHexColor('#0B57D0'));
    expect(t.secondary).toBe(parseHexColor('#386A20'));
    expect(t.tertiary).toBe(parseHexColor('#B93815'));
    expect(t.accentSaturation).toBe(120);
    expect(t.backgroundSaturation).toBe(90);
    expect(t.backgroundLightness).toBe(110);
    expect(t.colorSpecVersion).toBe(0);
    expect(t.tintText).toBe(true);
    expect(t.pitchBlack).toBe(false);
  });

  it('D2 合法 v2（tokenOverrides/pitchBlackContainers 在场）通过；v2 缺省滑杆回落主值', () => {
    const v2 = JSON.stringify({
      schemaVersion: 2,
      id: 'tok-thm',
      name: 'Token Theme',
      description: 'v2 payload',
      author: 'z',
      style: 'VIBRANT',
      seedColor: '#6750A4',
      accentSaturation: 130,
      backgroundSaturation: 100,
      backgroundLightness: 100,
      tokenOverrides: {},
      pitchBlackContainers: true,
      engineVersion: 2,
    });
    const t = parseCommunityTheme(v2);
    expect(t).not.toBeNull();
    expect(t.schemaVersion).toBe(2);
    expect(t.style).toBe('VIBRANT');
  });

  it('D3 v1 混入 v2 专有键 → null（codec V2_KEYS.any(json::has) 同律）', () => {
    const bad = JSON.stringify({ ...JSON.parse(GOOD_V1), tokenOverrides: {} });
    expect(parseCommunityTheme(bad)).toBeNull();
  });

  it('D4 十三形态非法输入 → null（永不半成品）', () => {
    expect(parseCommunityTheme('not json {')).toBeNull();
    expect(parseCommunityTheme('[]')).toBeNull();
    expect(parseCommunityTheme('')).toBeNull();
    expect(parseCommunityTheme(null)).toBeNull();
    // schemaVersion 越域
    expect(parseCommunityTheme(JSON.stringify({ ...JSON.parse(GOOD_V1), schemaVersion: 3 }))).toBeNull();
    // id 形态（大写/超长/非法字符）
    expect(parseCommunityTheme(JSON.stringify({ ...JSON.parse(GOOD_V1), id: 'Ocean-Dawn' }))).toBeNull();
    expect(parseCommunityTheme(JSON.stringify({ ...JSON.parse(GOOD_V1), id: '-ocean' }))).toBeNull();
    // name 空
    expect(parseCommunityTheme(JSON.stringify({ ...JSON.parse(GOOD_V1), name: '' }))).toBeNull();
    // description 空
    expect(parseCommunityTheme(JSON.stringify({ ...JSON.parse(GOOD_V1), description: '' }))).toBeNull();
    // style 未知
    expect(parseCommunityTheme(JSON.stringify({ ...JSON.parse(GOOD_V1), style: 'NOT_A_STYLE' }))).toBeNull();
    // seedColor 非法 hex
    expect(parseCommunityTheme(JSON.stringify({ ...JSON.parse(GOOD_V1), seedColor: 'red' }))).toBeNull();
    expect(parseCommunityTheme(JSON.stringify({ ...JSON.parse(GOOD_V1), seedColor: '#0B57D' }))).toBeNull();
    // 滑杆越界
    expect(parseCommunityTheme(JSON.stringify({ ...JSON.parse(GOOD_V1), accentSaturation: 300 }))).toBeNull();
    expect(parseCommunityTheme(JSON.stringify({ ...JSON.parse(GOOD_V1), backgroundLightness: -1 }))).toBeNull();
    expect(parseCommunityTheme(JSON.stringify({ ...JSON.parse(GOOD_V1), backgroundSaturation: 99.5 }))).toBeNull();
    // colorSpecVersion 越域
    expect(parseCommunityTheme(JSON.stringify({ ...JSON.parse(GOOD_V1), colorSpecVersion: 5 }))).toBeNull();
    // secondaryColor 非法
    expect(parseCommunityTheme(JSON.stringify({ ...JSON.parse(GOOD_V1), secondaryColor: '#GGGGGG' }))).toBeNull();
  });

  it('D5 载荷字节上限：v1 >8KB → null；v2 允许 16KB', () => {
    const fat = JSON.stringify({ ...JSON.parse(GOOD_V1), description: 'A'.repeat(9000) });
    expect(fat.length).toBeGreaterThan(8 * 1024);
    expect(parseCommunityTheme(fat)).toBeNull();
    const fatV2 = JSON.stringify({
      schemaVersion: 2, id: 'fat-v2', name: 'Fat', description: 'B'.repeat(15000),
      author: 'z', style: 'TONAL_SPOT', seedColor: '#0B57D0',
      accentSaturation: 100, backgroundSaturation: 100, backgroundLightness: 100,
      tokenOverrides: {},
    });
    expect(parseCommunityTheme(fatV2)).not.toBeNull();
    const fatterV2 = fatV2.replace('B'.repeat(15000), 'C'.repeat(20000));
    expect(parseCommunityTheme(fatterV2)).toBeNull();
  });

  it('D6 滑杆缺省形态：undefined 回落主值（parseSliderOr 同律）；存在但非法 → null', () => {
    const t = parseCommunityTheme(GOOD_V1);
    expect(t.accentSaturationLight).toBe(120); // 缺省 = 主值
    const bad = JSON.stringify({ ...JSON.parse(GOOD_V1), accentSaturationLight: 500 });
    expect(parseCommunityTheme(bad)).toBeNull();
  });

  it('D7 文本清洗：控制字符剥离 + 截断 40（sanitizeText 同律）', () => {
    const t = parseCommunityTheme(JSON.stringify({
      ...JSON.parse(GOOD_V1),
      name: 'Ocean\u0000\u0008Dawn'.padEnd(60, 'x'),
    }));
    expect(t).not.toBeNull();
    expect(t.name.startsWith('OceanDawn')).toBe(true);
    expect(t.name.length).toBeLessThanOrEqual(40);
  });
});

// ---------- E 组：PRESET_COLORS 预设八色 ----------

describe('E · PRESET_COLORS 预设八色（M3 key colors 锚）', () => {
  it('E1 恰八色，hex 形态合法且互异', () => {
    expect(PRESET_COLORS).toHaveLength(8);
    const hexes = PRESET_COLORS.map((p) => p.hex);
    for (const hex of hexes) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    expect(new Set(hexes).size).toBe(8);
  });

  it('E2 M3 权威锚在场：baseline 紫 #6750A4 / error 红 #B3261E / M3 蓝 #0B57D0', () => {
    const hexes = PRESET_COLORS.map((p) => p.hex);
    expect(hexes).toContain('#6750A4');
    expect(hexes).toContain('#B3261E');
    expect(hexes).toContain('#0B57D0');
  });

  it('E3 预设色可直接作 seed 构建 scheme（链路闭合）', () => {
    for (const p of PRESET_COLORS) {
      expect(buildCustomScheme({ seed: p.hex })).not.toBeNull();
    }
  });
});

// ---------- F 组：theme-engine 接线锚 ----------

describe('F · theme-engine.js 接线锚（剥注释扫描）', () => {
  it('F1 import 链：buildCustomScheme/parseCommunityTheme/blendSeeds/PRESET_COLORS/MONET_STYLES 五具全接', () => {
    expect(TE).toContain("from './aosp/theme-color.js'");
    for (const name of ['buildCustomScheme', 'parseCommunityTheme', 'blendSeeds', 'PRESET_COLORS', 'MONET_STYLES']) {
      expect(TE).toContain(name);
    }
  });

  it('F2 存储键单一真源：ios-desktop:theme-color-custom', () => {
    expect(TE).toContain("'ios-desktop:theme-color-custom'");
    expect((TE.match(/theme-color-custom/g) || []).length).toBe(1);
  });

  it('F3 reroll 优先级：自定义配色覆盖层先于壁纸 seed 链（getCustomThemeColor 在 getMonetSeed 之前）', () => {
    const rerollBody = TE.slice(TE.indexOf('function rerollMonetIfEnabled'));
    const customIdx = rerollBody.indexOf('getCustomThemeColor()');
    const seedIdx = rerollBody.indexOf('getMonetSeed()');
    expect(customIdx).toBeGreaterThan(-1);
    expect(seedIdx).toBeGreaterThan(customIdx);
  });

  it('F4 UI 五挂点 data-test 全在场', () => {
    for (const t of ['theme-color-section', 'theme-color-switch', 'theme-color-presets',
      'theme-color-styles', 'theme-color-blend-strip', 'theme-color-import-btn',
      'theme-color-reset-btn', 'theme-color-blend-apply']) {
      expect(TE).toContain(`data-test="${t}"`);
    }
  });

  it('F5 __themeColorTest 调试钩子（与 __monetTest 同惯例）', () => {
    expect(TE).toContain('__themeColorTest');
    expect(TE).toContain('applyCustomThemeColor');
    expect(TE).toContain('clearCustomThemeColor');
  });

  it('F6 优先级文案与 codec 拒绝语义在 UI 提示在场', () => {
    expect(TE).toContain('覆盖壁纸取色');
    expect(TE).toContain('导入失败');
    expect(TE).toContain('重置为壁纸取色');
  });
});

// ---------- G 组：ColorBlendr 源锚与文件在库 ----------

describe('G · ColorBlendr 源锚（GPL-3.0 master 实拉标注）', () => {
  it('G1 theme-color.js 在库且标注实拉通道（防记忆漂移）', () => {
    const raw = readFileSync(R('ios-desktop/js/aosp/theme-color.js'), 'utf8');
    expect(raw).toContain('Mahmud0808/ColorBlendr');
    expect(raw).toContain('MonetStyle.kt');
    expect(raw).toContain('CommunityThemeCodec.kt');
    expect(raw).toContain('Constant.kt');
    expect(raw).toContain('2026-11-04');
  });

  it('G2 algorithm 基底复用 monet.js（#33 引擎零改动：theme-color 只 import 不改写）', () => {
    expect(TC).toContain("from './monet.js'");
    expect(TC).toContain('hctFromArgb');
    expect(TC).toContain('TonalPalette');
    expect(TC).toContain('createColorScheme');
  });

  it('G3 codec 权威常量锚：schemaVersion 1|2 / 8KB|16KB / id 正则 / hex 正则 / 滑杆 0-200', () => {
    expect(TC).toContain('[a-z0-9][a-z0-9-]{0,63}');
    expect(TC).toContain('#[0-9a-fA-F]{6}');
    expect(TC).toContain('8 * 1024');
    expect(TC).toContain('16 * 1024');
    expect(TC).toContain("'tokenOverrides'");
    expect(TC).toContain("'pitchBlackContainers'");
  });

  it('G4 normalizeSeedColor 双形态归一（hex 与 ARGB int）', () => {
    expect(normalizeSeedColor('#0B57D0')).toBe(parseHexColor('#0B57D0'));
    expect(normalizeSeedColor(0xff0b57d0)).toBe(parseHexColor('#0B57D0'));
    expect(normalizeSeedColor(0x0b57d0)).toBe(parseHexColor('#0B57D0'));
    expect(normalizeSeedColor('xyz')).toBeNull();
    expect(normalizeSeedColor(-1)).toBeNull();
  });
});
