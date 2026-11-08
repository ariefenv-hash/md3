// ==================== theme-color.js — ColorBlendr 式主题色自定义引擎（v10.59 #50） ====================
// 移植对标：Mahmud0808/ColorBlendr（GPL-3.0 开源 Material You 自定义取色应用，master 分支
// 2026-11-04 GitHub contents API 实拉，非记忆）。三块核心在库：
//   ① MONET 风格枚举 10 种 —— data/enums/MonetStyle.kt 实拉：
//      SPRITZ / MONOCHROMATIC / TONAL_SPOT / VIBRANT / RAINBOW / EXPRESSIVE /
//      FIDELITY / CONTENT / FRUIT_SALAD / CMF。
//      AOSP 语义映射：TONAL_SPOT 为基准（ColorScheme.java 常量同构，monet.js 已有）；
//      SPRITZ 低饱和 / VIBRANT 高彩度 / MONOCHROMATIC 零彩度 / FRUIT_SALAD hue+90 /
//      EXPRESSIVE hue+15 等 —— web 端以「chroma 缩放 + hue 偏移」近似实现（tier:'approx'），
//      FIDELITY/CONTENT/CMF 在 ColorBlendr 侧亦须 root 才可得（isAvailable rootMode 门），
//      web 端按 TONAL_SPOT 基线降档并诚实标注（tier:'stub'）。
//   ② 四参数配色体系 —— data/common/Constant.kt 实拉：MONET_SEED_COLOR / MONET_SECONDARY_COLOR /
//      MONET_TERTIARY_COLOR / MONET_CONTRAST + 三滑杆 MONET_ACCENT_SATURATION /
//      MONET_BACKGROUND_SATURATION / MONET_BACKGROUND_LIGHTNESS（0-200，100 原样）。
//   ③ 社区主题严格 codec —— utils/community/CommunityThemeCodec.kt 实拉同律：
//      「一切外来输入不可信：非法输入 → null，绝不产出半成品主题」。
//      schemaVersion ∈ {1,2}（v1 不得含 v2 专有键 tokenOverrides/pitchBlackContainers）、
//      id 正则 ^[a-z0-9][a-z0-9-]{0,63}$、颜色 ^#[0-9a-fA-F]{6}$、滑杆整数 0-200、
//      colorSpecVersion 0-2、载荷字节上限 8KB(v1)/16KB(v2)、name≤40/author≤40。
// 算法基底：js/aosp/monet.js 的 HCT / TonalPalette / createColorScheme（#33 引擎零改动复用），
// buildCustomScheme 产出与 createColorScheme 同构的 scheme（五 TonalPalette + 元数据），
// schemeToCssVars 可直接消费 —— 自定义配色与壁纸取色共享同一条 vars 写入链。

import { hctFromArgb, hctToInt, TonalPalette, createColorScheme } from './monet.js';

// ---------- ① MONET 风格注册表（ColorBlendr MonetStyle.kt 10 风格权威名逐字） ----------

export const MONET_STYLES = [
  { name: 'SPRITZ', label: '淡雅', tier: 'approx', chromaMult: 0.3, hueShift: 0,
    desc: '低饱和近似（A13 起可用；web 以 chroma 0.3× 近似）' },
  { name: 'MONOCHROMATIC', label: '单色', tier: 'approx', chromaMult: 0, hueShift: 0,
    desc: '零彩度仅 tone 阶（A14 起可用）' },
  { name: 'TONAL_SPOT', label: '色调点缀', tier: 'native', chromaMult: 1, hueShift: 0,
    desc: 'AOSP 12+ 默认风格，monet.js createColorScheme 基线同构' },
  { name: 'VIBRANT', label: '活力', tier: 'approx', chromaMult: 1.25, hueShift: 0,
    desc: '高彩度近似（chroma 1.25×，上限 131 钳制）' },
  { name: 'RAINBOW', label: '彩虹', tier: 'approx', chromaMult: 0.8, hueShift: 0,
    desc: '中性面低彩近似（chroma 0.8×）' },
  { name: 'EXPRESSIVE', label: '表现', tier: 'approx', chromaMult: 1.1, hueShift: 15,
    desc: 'hue +15° / chroma 1.1× 近似' },
  { name: 'FIDELITY', label: '保真', tier: 'stub', chromaMult: 1, hueShift: 0,
    desc: 'seed 原彩度不加 48 下限；ColorBlendr 侧须 root，web 端 TONAL_SPOT 降档近似' },
  { name: 'CONTENT', label: '内容', tier: 'stub', chromaMult: 1, hueShift: 0,
    desc: 'ColorBlendr 侧须 root，web 端 TONAL_SPOT 降档近似' },
  { name: 'FRUIT_SALAD', label: '缤纷水果', tier: 'approx', chromaMult: 1, hueShift: 90,
    desc: 'hue +90° 旋转近似' },
  { name: 'CMF', label: 'CMF', tier: 'stub', chromaMult: 1, hueShift: 0,
    desc: 'ColorSpec 2026 专属（colorSpecVersion==2），web 端 TONAL_SPOT 降档近似' },
];

/** 风格名 → 注册表项（未知回落 TONAL_SPOT，MonetStyle.kt toEnumMonet 同律） */
export function resolveStyle(name) {
  return MONET_STYLES.find((s) => s.name === name)
    || MONET_STYLES.find((s) => s.name === 'TONAL_SPOT');
}

// ---------- ② 社区主题严格 codec（CommunityThemeCodec.kt 同律常量） ----------

const SCHEMA_VERSION = 1;
const SCHEMA_VERSION_TOKENS = 2;
const MAX_PAYLOAD_BYTES = 8 * 1024;
const MAX_PAYLOAD_BYTES_TOKENS = 16 * 1024;
const MAX_NAME_LENGTH = 40;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_AUTHOR_LENGTH = 40;
const SLIDER_MIN = 0;
const SLIDER_MAX = 200;
const ID_REGEX = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B-\u001F\u007F]/g; // \p{Cntrl} 去 \n(\u000A)
const V2_KEYS = ['tokenOverrides', 'pitchBlackContainers'];

/** '#RRGGBB' → ARGB int（0xFFRRGGBB）；非法 → null（CommunityThemeCodec parseHexColor 同律） */
export function parseHexColor(value) {
  if (typeof value !== 'string' || !HEX_COLOR_REGEX.test(value)) return null;
  return (parseInt(value.slice(1), 16) | 0xff000000) >>> 0;
}

/** hex 或 ARGB int → ARGB int（UI 层双形态输入归一）；非法 → null */
export function normalizeSeedColor(value) {
  if (typeof value === 'string') return parseHexColor(value);
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 0xffffffff) {
    return (value | 0xff000000) >>> 0;
  }
  return null;
}

/** ARGB → {r,g,b} */
function argbToRgb(argb) {
  return [(argb >> 16) & 255, (argb >> 8) & 255, argb & 255];
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/** 滑杆值：整数 0-200（CommunityThemeCodec parseSlider 同律；非法 → null） */
function parseSlider(value) {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < SLIDER_MIN || value > SLIDER_MAX) return null;
  return value;
}

/** 滑杆缺省形态：undefined → fallback（parseSliderOr 同律）；存在但非法 → null */
function parseSliderOr(value, fallback) {
  if (value === undefined) return fallback;
  return parseSlider(value);
}

/** 文本清洗：剥控制字符（保 \n）+ 截断；sanitizeText/sanitizeMultiline 同律 */
function sanitizeText(text, maxLength) {
  if (typeof text !== 'string') return '';
  return text.replace(CONTROL_CHARS_REGEX, '').slice(0, maxLength);
}

function sanitizeMultiline(text, maxLength) {
  if (typeof text !== 'string') return '';
  return text.replace(CONTROL_CHARS_REGEX, '').slice(0, maxLength);
}

/**
 * 社区主题载荷严格解析（CommunityThemeCodec.parseTheme 同律移植）。
 * 一切非法输入 → null，绝不返回半成品主题。
 * @param {string} jsonText 原始 JSON 字符串
 * @returns {object|null} 标准化主题（seed/secondary/tertiary 为 ARGB int）
 */
export function parseCommunityTheme(jsonText) {
  if (typeof jsonText !== 'string' || jsonText.length === 0) return null;
  let obj;
  try { obj = JSON.parse(jsonText); } catch (e) { return null; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;

  const schemaVersion = obj.schemaVersion;
  if (schemaVersion !== SCHEMA_VERSION && schemaVersion !== SCHEMA_VERSION_TOKENS) return null;
  const maxBytes = schemaVersion === SCHEMA_VERSION ? MAX_PAYLOAD_BYTES : MAX_PAYLOAD_BYTES_TOKENS;
  // UTF-8 字节口径（CommunityThemeCodec toByteArray 口径同律）
  let byteLength = 0;
  try { byteLength = new TextEncoder().encode(jsonText).length; } catch (e) { byteLength = jsonText.length; }
  if (byteLength > maxBytes) return null;
  // v1 不得含 v2 专有键（codec: V2_KEYS.any(json::has) → null）
  if (schemaVersion === SCHEMA_VERSION && V2_KEYS.some((k) => k in obj)) return null;

  const id = typeof obj.id === 'string' ? obj.id : '';
  if (!ID_REGEX.test(id)) return null;

  const name = sanitizeText(obj.name, MAX_NAME_LENGTH);
  if (!name) return null;
  const description = sanitizeMultiline(obj.description, MAX_DESCRIPTION_LENGTH);
  if (!description) return null;
  const author = sanitizeText(obj.author, MAX_AUTHOR_LENGTH);

  const style = MONET_STYLES.find((s) => s.name === obj.style);
  if (!style) return null;

  const seed = parseHexColor(obj.seedColor);
  if (seed == null) return null;
  // secondaryColor/tertiaryColor 可选：parseOptionalColor 语义（absent → null 不判死）
  const secondary = 'secondaryColor' in obj ? parseHexColor(obj.secondaryColor) : null;
  if ('secondaryColor' in obj && secondary == null) return null;
  const tertiary = 'tertiaryColor' in obj ? parseHexColor(obj.tertiaryColor) : null;
  if ('tertiaryColor' in obj && tertiary == null) return null;

  const accentSaturation = parseSlider(obj.accentSaturation);
  if (accentSaturation == null) return null;
  const backgroundSaturation = parseSlider(obj.backgroundSaturation);
  if (backgroundSaturation == null) return null;
  const backgroundLightness = parseSlider(obj.backgroundLightness);
  if (backgroundLightness == null) return null;

  // Absent = 0（2021 spec，旧载荷确定性复现同律）
  const colorSpecVersion = obj.colorSpecVersion === undefined ? 0 : obj.colorSpecVersion;
  if (colorSpecVersion !== 0 && colorSpecVersion !== 1 && colorSpecVersion !== 2) return null;

  // Light 模式变体滑杆：absent = 主值（parseSliderOr 同律）
  const accentSaturationLight = parseSliderOr(obj.accentSaturationLight, accentSaturation);
  if (accentSaturationLight == null) return null;
  const backgroundSaturationLight = parseSliderOr(obj.backgroundSaturationLight, backgroundSaturation);
  if (backgroundSaturationLight == null) return null;
  const backgroundLightnessLight = parseSliderOr(obj.backgroundLightnessLight, backgroundLightness);
  if (backgroundLightnessLight == null) return null;

  return {
    schemaVersion,
    id,
    name,
    description,
    author,
    style: style.name,
    seed,
    secondary,
    tertiary,
    accentSaturation,
    backgroundSaturation,
    backgroundLightness,
    accentSaturationLight,
    backgroundSaturationLight,
    backgroundLightnessLight,
    colorSpecVersion,
    pitchBlack: obj.pitchBlack === true,
    tintText: obj.tintText !== false,
  };
}

// ---------- ③ 四参数配色 → scheme（ColorBlendr ThemeEngine 主链） ----------

/** 滑杆默认值（Constant.kt：MONET_*_SATURATION/LIGHTNESS 默认 100） */
const SLIDER_DEFAULT = 100;

/**
 * tone 偏移包装（AOSP contrast 双向拉伸的 web 近似）：
 * 产出与 TonalPalette 接口兼容（tone/toCss），schemeToCssVars 零改动可消费。
 */
function withToneOffset(palette, offset) {
  if (!offset) return palette;
  return {
    tone: (t) => palette.tone(clamp(Math.round(t) + offset, 0, 100)),
    toCss: (t) => palette.toCss(clamp(Math.round(t) + offset, 0, 100)),
  };
}

/**
 * 自定义配色 scheme 构建：seed + 可选 secondary/tertiary + 风格 + 三滑杆 + 对比度。
 * 与 createColorScheme 同构（五 TonalPalette + seed/seedHue/seedChroma），
 * schemeToCssVars 直接消费 —— 全系统 CSS 变量链复用 #33 通道。
 *
 * @param {object} cfg
 *   seed {string|number} '#RRGGBB' 或 ARGB（必填，非法 → null）
 *   secondary/tertiary {string|number|null} 显式双端色（ColorBlendr MONET_SECONDARY/TERTIARY_COLOR）
 *   style {string} MONET_STYLES 项名（缺省 TONAL_SPOT）
 *   contrast {number} -1..1（ColorBlendr slider 0-200 由 UI 层换算 (v-100)/100）
 *   accentSaturation/backgroundSaturation/backgroundLightness {number} 0-200（缺省 100）
 * @returns {object|null} scheme 或 null（非法输入）
 */
export function buildCustomScheme(cfg = {}) {
  const seed = normalizeSeedColor(cfg.seed);
  if (seed == null) return null;
  const style = resolveStyle(cfg.style);
  const contrast = typeof cfg.contrast === 'number' && Number.isFinite(cfg.contrast)
    ? clamp(cfg.contrast, -1, 1) : 0;
  const accentSat = typeof cfg.accentSaturation === 'number' && Number.isInteger(cfg.accentSaturation)
    && cfg.accentSaturation >= SLIDER_MIN && cfg.accentSaturation <= SLIDER_MAX
    ? cfg.accentSaturation : SLIDER_DEFAULT;
  const bgSat = typeof cfg.backgroundSaturation === 'number' && Number.isInteger(cfg.backgroundSaturation)
    && cfg.backgroundSaturation >= SLIDER_MIN && cfg.backgroundSaturation <= SLIDER_MAX
    ? cfg.backgroundSaturation : SLIDER_DEFAULT;
  const bgL = typeof cfg.backgroundLightness === 'number' && Number.isInteger(cfg.backgroundLightness)
    && cfg.backgroundLightness >= SLIDER_MIN && cfg.backgroundLightness <= SLIDER_MAX
    ? cfg.backgroundLightness : SLIDER_DEFAULT;

  const base = createColorScheme(seed);
  const styleHue = ((base.seedHue + style.hueShift) % 360 + 360) % 360;

  // accent1：seed 彩度（FIDELITY/CONTENT 不加 48 下限 = 保真语义）→ 风格缩放 → 滑杆缩放
  const floorC = style.noChromaFloor ? base.seedChroma : Math.max(48, base.seedChroma);
  const a1c = clamp(floorC * style.chromaMult * (accentSat / 100), 0, 131);

  // neutral：风格 hue 同步旋转，彩度按 backgroundSaturation 缩放（MONOCHROMATIC → 0）
  const n1c = clamp(4 * style.chromaMult * (bgSat / 100), 0, 24);
  const n2c = clamp(8 * style.chromaMult * (bgSat / 100), 0, 24);
  // a2/a3 基线 chroma（TONAL_SPOT 常量：16 / 32）同样吃风格与滑杆
  const a2c = clamp(16 * style.chromaMult * (accentSat / 100), 0, 48);
  const a3c = clamp(32 * style.chromaMult * (accentSat / 100), 0, 131);

  const scheme = {
    seed,
    seedHue: base.seedHue,
    seedChroma: base.seedChroma,
    accent1: TonalPalette.fromHueAndChroma(styleHue, a1c),
    accent2: TonalPalette.fromHueAndChroma(styleHue, a2c),
    accent3: TonalPalette.fromHueAndChroma((styleHue + 60) % 360, a3c),
    neutral1: TonalPalette.fromHueAndChroma(styleHue, n1c),
    neutral2: TonalPalette.fromHueAndChroma(styleHue, n2c),
    style: style.name,
  };

  // 显式 secondary/tertiary 覆盖（ColorBlendr 双端色启用语义）：
  // 取该色 HCT 的 hue/chroma（低彩度钳到 a2/a3 基线，防灰白端色产生隐形差异）
  if (cfg.secondary != null) {
    const sec = normalizeSeedColor(cfg.secondary);
    if (sec != null) {
      const hct = hctFromArgb(...argbToRgb(sec));
      scheme.accent2 = TonalPalette.fromHueAndChroma(hct.h, Math.max(a2c, hct.c));
    }
  }
  if (cfg.tertiary != null) {
    const ter = normalizeSeedColor(cfg.tertiary);
    if (ter != null) {
      const hct = hctFromArgb(...argbToRgb(ter));
      scheme.accent3 = TonalPalette.fromHueAndChroma(hct.h, Math.max(a3c, hct.c));
    }
  }

  // tone 偏移（contrast / backgroundLightness，AOSP 双向拉伸的 web 近似）：
  //   contrast -1..1 → accent +4t / neutral -6t（高对比：主色更亮、表面更暗）
  //   backgroundLightness 0-200 → neutral ±10 tone（100 原样）
  const accentOffset = Math.round(contrast * 4);
  const neutralOffset = Math.round((bgL - SLIDER_DEFAULT) / 10) - Math.round(contrast * 6);
  if (accentOffset) {
    scheme.accent1 = withToneOffset(scheme.accent1, accentOffset);
    scheme.accent2 = withToneOffset(scheme.accent2, accentOffset);
    scheme.accent3 = withToneOffset(scheme.accent3, accentOffset);
  }
  if (neutralOffset) {
    scheme.neutral1 = withToneOffset(scheme.neutral1, neutralOffset);
    scheme.neutral2 = withToneOffset(scheme.neutral2, neutralOffset);
  }
  return scheme;
}

// ---------- ④ 双端混色器（ColorBlendr 自定义混色核心） ----------

/**
 * 双端色 HCT 域插值 → 中间色阶（hue 走最短弧；端点保留原色）。
 * @param {string} hexA 端色 A '#RRGGBB'
 * @param {string} hexB 端色 B '#RRGGBB'
 * @param {number} steps 阶数 2-24
 * @returns {Array<{hex:string,t:number,hct:{h,c,t}}|null>[]} 或 null（非法输入）
 */
export function blendSeeds(hexA, hexB, steps = 5) {
  const a = parseHexColor(hexA);
  const b = parseHexColor(hexB);
  if (a == null || b == null) return null;
  // 严格整数步数（ColorBlendr 滑杆整数语义；分数/越界拒绝）
  if (typeof steps !== 'number' || !Number.isInteger(steps) || steps < 2 || steps > 24) return null;
  const n = steps;
  const [ar, ag, ab] = argbToRgb(a);
  const [br, bg2, bb] = argbToRgb(b);
  const hctA = hctFromArgb(ar, ag, ab);
  const hctB = hctFromArgb(br, bg2, bb);
  // hue 插值走最短弧（|dh| ≤ 180）
  let dh = hctB.h - hctA.h;
  if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const h = ((hctA.h + dh * t) % 360 + 360) % 360;
    const c = hctA.c + (hctB.c - hctA.c) * t;
    const tone = hctA.t + (hctB.t - hctA.t) * t;
    // hctToInt 返回 [r,g,b] 数组（monet.js TonalPalette.tone 同款解构消费）
    const [r, g, b] = hctToInt(h, c, tone);
    out.push({
      hex: '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0'),
      t,
      hct: { h, c, t: tone },
    });
  }
  return out;
}

// ---------- ⑤ 预设色板（Google 标准 8 色锚） ----------

// M3 规范稳定色锚八色（baseline primary #6750A4 / baseline secondary secondaryContainer
// 系 / error #B3261E / tonal 参考色），按 hue 环八向分布 —— ColorBlendr 预设色板
// 取自 AOSP WallpaperPicker 色盘语义（八色快捷盘），网页端以 M3 key colors 充当锚。
export const PRESET_COLORS = [
  { name: '蓝', hex: '#0B57D0', hue: 215 },
  { name: '青', hex: '#00796B', hue: 172 },
  { name: '绿', hex: '#386A20', hue: 100 },
  { name: '黄', hex: '#7A5900', hue: 45 },
  { name: '橙', hex: '#B93815', hue: 20 },
  { name: '红', hex: '#B3261E', hue: 356 },
  { name: '紫', hex: '#6750A4', hue: 271 },
  { name: '粉', hex: '#984061', hue: 343 },
];
