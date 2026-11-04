// ==================== monet.js — Material You 动态取色主题引擎（#33） ====================
//
// AOSP 同构（packages/SystemUI/src/com/android/systemui/monet/ + material-color-utils）：
//   · ColorScheme.java  —— seed → accent1/2/3 + neutral1/2 五调色板（TONAL_SPOT 风格常量：
//                          a1 chroma = max(seedChroma, 48) / a2 16 / a3 32@hue+60 / n1 4 / n2 8）
//   · TonalPalette.java —— (hue, chroma) 固定，tone(t) 生成指定亮度级
//   · Hct.java          —— HCT 色彩空间（T 分量 = CIE L*，与 material-color-utils 语义一致）
//   · QuantizerCelebi.java —— 壁纸像素量化 → seed 提取（Web 侧简化为确定性加权 k-means，
//                          频次桶初始化 + 色度加权评分，确定性等价：同图必同色板）
//
// 色彩科学：CAM16（Li et al. 2017, CIE 认可色彩外观模型）标准公式实现，
// sRGB D65 默认观察条件与 material-color-utils 一致（白点 95.047/100/108.883、
// 适应亮度 La = 200/π ≈ 63.619、背景 L*=50、surround=AVERAGE、非折扣光源）。
// 反向求解（JCH → sRGB）用 3×3 线性系统闭式解（p2/A、a、b 三方程严格等价正向方程组），
// 出域时按 material-color-utils Hct.solver 同构语义先二分 J、再二分降 chroma。
//
// 纯逻辑纪律：本模块零 DOM、零 window、零 Math.random（确定性验收 #33「同图同色板」）。

// ---------- 常量（sRGB D65 标准观察条件，material-color-utils 默认值同构） ----------

const WHITE_POINT = [95.047, 100.0, 108.883]; // D65 白点（XYZ，Y=100）
const ADAPTING_LUMINANCE = 200.0 / Math.PI;   // La：medium gray 表面适应亮度
const BACKGROUND_L_STAR = 50.0;               // 背景亮度（L*）
const SURROUND_F = 1.0;                       // AVERAGE surround 的 F 系数
const DISCOUNT_ILLUMINANT = false;            // sRGB 屏幕不折扣光源

// 由背景 L* 派生的 CAM16 环境因子
const BG_Y = 100 * Math.pow((BACKGROUND_L_STAR + 16) / 116, 3); // 背景相对亮度 Y_b
const N_RATIO = BG_Y / WHITE_POINT[1];                          // n = Y_b / Y_w
const Z_FACTOR = 1.48 + Math.sqrt(N_RATIO);                     // z
const C_SURROUND = 0.69;                                        // c（AVERAGE surround）
const FL = (() => {
  // 亮度适应因子（标准 CAM16 公式）
  const k = 1.0 / (5.0 * ADAPTING_LUMINANCE + 1.0);
  const k4 = k * k * k * k;
  const la5 = 5.0 * ADAPTING_LUMINANCE;
  return 0.2 * k4 * la5 + 0.1 * Math.pow(1 - k4, 2) * Math.cbrt(la5);
})();
// 光源适应系数 D（clamp 0.8–1.0；折扣时为 1）
const D_FACTOR = (() => {
  if (DISCOUNT_ILLUMINANT) return 1.0;
  const d = SURROUND_F - 0.32 * Math.log10(ADAPTING_LUMINANCE);
  return Math.min(1.0, Math.max(0.8, d));
})();

// 白点通道的预计算值（正向/反向共用）
const WHITE_PRE = (() => {
  const [rL, gL, bL] = xyzToCam16RgbLinear(WHITE_POINT);
  const rgbA = applyAdaptation([rL, gL, bL]);
  const rgbP = nonlinearCompress(rgbA);
  return {
    rgbA,
    rgbP,
    a: 2 * rgbP[0] + rgbP[1] + rgbP[2] / 20 - 0.305, // Aw
  };
})();

// ---------- sRGB ↔ XYZ（D65） ----------

/** sRGB [0,255]³ → XYZ（Y=100 尺度） */
export function argbToXyz(r, g, b) {
  const lin = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  // sRGB D65 → XYZ 矩阵（Y=100 尺度）
  return [
    (0.4124564 * lin[0] + 0.3575761 * lin[1] + 0.1804375 * lin[2]) * 100,
    (0.2126729 * lin[0] + 0.7151522 * lin[1] + 0.072175 * lin[2]) * 100,
    (0.0193339 * lin[0] + 0.119192 * lin[1] + 0.9503041 * lin[2]) * 100,
  ];
}

/** XYZ（Y=100 尺度）→ sRGB [0,255]³（clamp 前的原始三通道，可能出域） */
export function xyzToArgbLinear(xyz) {
  const [x, y, z] = xyz;
  const lin = [
    3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
    -0.969266 * x + 1.8760108 * y + 0.041556 * z,
    0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
  ];
  return lin.map((c) => {
    const v0 = c / 100; // XYZ Y=100 尺度 → 线性 sRGB [0,1]（出域时可为负/超 1）
    const v = v0 <= 0.0031308 ? v0 * 12.92 : 1.055 * Math.pow(v0, 1 / 2.4) - 0.055;
    return v * 255;
  });
}

/** CIE L*（Y=100 尺度）——即 Material tone（material-color-utils: tone = L*） */
export function lstarFromY(y) {
  const yr = y / 100;
  const e = 216.0 / 24389.0;
  const kappa = 24389.0 / 27.0;
  const f = yr > e ? Math.cbrt(yr) : (kappa * yr + 16) / 116;
  return 116 * f - 16;
}

/** sRGB → CIE L* */
export function lstarFromArgb(r, g, b) {
  return lstarFromY(argbToXyz(r, g, b)[1]);
}

// ---------- CAM16 正向（XYZ → CAM16） ----------

/** XYZ → HPE 空间预适应线性通道（CAT02 逆矩阵系数） */
function xyzToCam16RgbLinear(xyz) {
  const [x, y, z] = xyz;
  return [
    0.401288 * x + 0.650173 * y - 0.051461 * z,
    -0.250268 * x + 1.204414 * y + 0.045854 * z,
    -0.002079 * x + 0.048952 * y + 0.953127 * z,
  ];
}

/** CAT02 色适应（逐通道） */
function applyAdaptation(rgbL) {
  const d = D_FACTOR;
  return rgbL.map((c, i) => {
    const whiteChannel = xyzToCam16RgbLinear(WHITE_POINT)[i];
    return c * (d * WHITE_POINT[1] / whiteChannel + 1 - d);
  });
}

/** 非线性压缩（HPE → 压缩通道 r'g'b'） */
function nonlinearCompress(rgbA) {
  return rgbA.map((c) => {
    const x = (FL * c) / 100;
    if (x < 0) return -signCompress(-x);
    return signCompress(x);
  });
}
function signCompress(x) {
  return (400 * Math.pow(x, 0.42)) / (Math.pow(x, 0.42) + 27.13);
}

/**
 * CAM16 正向：sRGB → { j, c, h }（明度 J、彩度 C、色相 h°）。
 * 标准公式（Li et al. 2017）。
 */
export function cam16FromArgb(r, g, b) {
  const xyz = argbToXyz(r, g, b);
  const rgbL = xyzToCam16RgbLinear(xyz);
  const rgbA = applyAdaptation(rgbL);
  const rgbP = nonlinearCompress(rgbA);
  const [rp, gp, bp] = rgbP;

  const aCam = rp - (12 * gp) / 11 + bp / 11;
  const bCam = (rp + gp - 2 * bp) / 9;
  const h = normalizeHue((Math.atan2(bCam, aCam) * 180) / Math.PI);

  const et = 0.25 * (Math.cos((h * Math.PI) / 180 + 2) + 3.8);
  const aMag = Math.sqrt(aCam * aCam + bCam * bCam);
  const t = ((50000 / 13) * SURROUND_F * SURROUND_F * et * aMag) /
    (rp + gp + (21 * bp) / 20);
  const aw = WHITE_PRE.a;
  const aAbs = 2 * rp + gp + bp / 20 - 0.305;
  const j = 100 * Math.pow(aAbs / aw, C_SURROUND * Z_FACTOR);
  const c = Math.pow(t, 0.9) * Math.sqrt(j / 100) * (1.64 - Math.pow(0.29, N_RATIO));

  return { j, c, h };
}

function normalizeHue(h) {
  let x = h % 360;
  if (x < 0) x += 360;
  return x;
}

// ---------- CAM16 反向（JCH → sRGB） ----------

/**
 * JCH → XYZ：解 3×3 线性系统（数学上严格等价 CAM16 正向方程组）：
 *   L1: 2r' + g' + b'/20 = p2          （A 方程，p2 = A/Aw + 0.305）
 *   L2: r' - 12g'/11 + b'/11 = α·D3·cos(h)
 *   L3: (r' + g' - 2b')/9   = α·D3·sin(h)
 * 其中 α = t/p1（t 由 C/J 反解），D3 = r' + g' + b'/20（右端含 D3 后移项仍线性）。
 * 返回压缩通道 r'g'b'；无效（t 非有限/超界）返回 null。
 */
function jchToCompressed(j, c, h) {
  if (!(j > 0) || !(c >= 0) || !Number.isFinite(c)) return null;
  const hRad = (h * Math.PI) / 180;
  const rootJ = Math.sqrt(j / 100);
  const achroma = 1.64 - Math.pow(0.29, N_RATIO);
  const denom = rootJ * achroma;
  if (denom <= 0) return null;
  const t = Math.pow(c / denom, 1 / 0.9);
  if (!Number.isFinite(t) || t < 0) return null;

  const et = 0.25 * (Math.cos(hRad + 2) + 3.8);
  const p1 = (50000 / 13) * SURROUND_F * SURROUND_F * et;
  const alpha = t / p1;
  const cosH = Math.cos(hRad);
  const sinH = Math.sin(hRad);
  const aw = WHITE_PRE.a;
  // A/Aw = (J/100)^(1/(c·z))；p2 = 2r'+g'+b'/20 = Aw·(J/100)^(1/(c·z)) + 0.305
  // （0.305 常数不随 Aw 归一——正向 A = (p2−0.305)·Aw）
  const p2 = aw * Math.pow(j / 100, 1 / (C_SURROUND * Z_FACTOR)) + 0.305;

  // 系数矩阵（行 = [r', g', b']；D4 = r' + g' + (21/20)b' 为 t 定义分母）：
  //   L1: [2, 1, 1/20] · v = p2
  //   L2: [1 - α·cosH, -12/11 - α·cosH, 1/11 - (21/20)·α·cosH] · v = 0
  //   L3: [1/9 - α·sinH, 1/9 - α·sinH, -2/9 - (21/20)·α·sinH] · v = 0
  const m = [
    [2, 1, 1 / 20, p2],
    [1 - alpha * cosH, -12 / 11 - alpha * cosH, 1 / 11 - (21 / 20) * alpha * cosH, 0],
    [1 / 9 - alpha * sinH, 1 / 9 - alpha * sinH, -2 / 9 - (21 / 20) * alpha * sinH, 0],
  ];
  const sol = solve3(m);
  if (!sol) return null;
  return sol;
}

/** 高斯消元解 3×3（带部分主元）；奇异返回 null */
function solve3(m) {
  const a = m.map((row) => row.slice());
  const n = 3;
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
    }
    if (Math.abs(a[piv][col]) < 1e-12) return null;
    if (piv !== col) {
      const tmp = a[piv];
      a[piv] = a[col];
      a[col] = tmp;
    }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let k = col; k <= n; k++) a[r][k] -= f * a[col][k];
    }
  }
  return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]];
}

/** 压缩通道 r'g'b' → sRGB（逆压缩 + 逆适应 + 逆 HPE + XYZ + sRGB），返回 clamp 后 [r,g,b] */
function compressedToArgb(rgbP) {
  const [rp, gp, bp] = rgbP;
  // 逆非线性压缩（负通道对称处理，与正向 nonlinearCompress 镜像）
  const inv = (p) => {
    const sign = p < 0 ? -1 : 1;
    const a = Math.abs(p);
    const denom = 400 - a;
    if (denom <= 0) return 0;
    const x = Math.pow((a * 27.13) / denom, 1 / 0.42); // 回到 FL·c/100 尺度
    return (sign * x * 100) / FL;
  };
  const rgbA = [inv(rp), inv(gp), inv(bp)];
  // 逆 CAT02 适应
  const whiteL = xyzToCam16RgbLinear(WHITE_POINT);
  const d = D_FACTOR;
  const rgbL = rgbA.map((c, i) => {
    const whiteChannel = whiteL[i];
    return c / (d * WHITE_POINT[1] / whiteChannel + 1 - d);
  });
  // HPE → XYZ（CAM16RGB_TO_XYZ 矩阵）
  const xyz = [
    1.8620678 * rgbL[0] - 1.0112546 * rgbL[1] + 0.1491867 * rgbL[2],
    0.3875265 * rgbL[0] + 0.6214474 * rgbL[1] - 0.0089739 * rgbL[2],
    -0.0158412 * rgbL[0] - 0.0341229 * rgbL[1] + 1.0499644 * rgbL[2],
  ];
  const srgb = xyzToArgbLinear(xyz);
  return srgb.map((v) => Math.round(Math.min(255, Math.max(0, v))));
}

/** JCH → sRGB（可能出域：出域返回 null 语义不可行） */
function jchToArgb(j, c, h) {
  const rgbP = jchToCompressed(j, c, h);
  if (!rgbP) return null;
  return compressedToArgb(rgbP);
}

// ---------- HCT ----------

/** sRGB → HCT：{ h（CAM16 色相°）, c（CAM16 彩度）, t（CIE L*，即 tone） } */
export function hctFromArgb(r, g, b) {
  const cam = cam16FromArgb(r, g, b);
  return { h: cam.h, c: cam.c, t: lstarFromArgb(r, g, b) };
}

const TONE_SEARCH_EPSILON = 0.1;

/**
 * 固定 (h, cReq) 下对 J 粗扫 41 点找 tone=t 的全部符号变化区间并细化，
 * 每候选做彩度复检（出域 clamp 会虚增彩度，mcu solver 拒收语义同构），
 * 按 tone 偏差为主、彩度偏差为辅的代价取最优。
 * tone(J) 在高彩度区非单调（α=t/p1 随 J 反解而降），故不假设单调性。
 * 返回 [r,g,b] | null。
 */
function solveToneAndChroma(h, cReq, t) {
  let bestArgb = null;
  let bestScore = Infinity;
  const cTol = Math.max(2, cReq * 0.03);
  const consider = (argb) => {
    const tone = lstarFromArgb(argb[0], argb[1], argb[2]);
    const dT = Math.abs(tone - t);
    const cChk = cam16FromArgb(argb[0], argb[1], argb[2]).c;
    const dC = Math.abs(cChk - cReq);
    const score = dT + dC * 0.05;
    if (dT < 0.25 && dC < cTol && score < bestScore) {
      bestScore = score;
      bestArgb = argb;
    }
    return tone;
  };
  const N = 40;
  let prev = null; // { j, tone }
  for (let i = 0; i <= N; i++) {
    const j = (i / N) * 100;
    const argb = jchToArgb(j, cReq, h);
    if (!argb) {
      prev = null;
      continue;
    }
    const tone = consider(argb);
    if (prev && (prev.tone - t) * (tone - t) < 0) {
      // 符号变化区间 → 14 步二分细化
      let lo = prev.j;
      let hi = j;
      let loMiss = prev.tone - t;
      for (let k = 0; k < 14; k++) {
        const mid = (lo + hi) / 2;
        const a2 = jchToArgb(mid, cReq, h);
        if (!a2) {
          hi = mid;
          continue;
        }
        const tone2 = consider(a2);
        if ((tone2 - t) * loMiss < 0) hi = mid;
        else {
          lo = mid;
          loMiss = tone2 - t;
        }
      }
    }
    prev = { j, tone };
  }
  return bestArgb;
}

/**
 * HCT → sRGB（material-color-utils Hct.solver 同构）：
 * ① 请求彩度下粗扫+细化求 tone=t；② 出域时降 chroma 二分重试（保持 hue/tone）。
 * 返回 [r,g,b]；极端参数（hue 非法）返回中性灰兜底。
 */
export function hctToInt(h, c, t) {
  if (!Number.isFinite(h) || !Number.isFinite(c) || !Number.isFinite(t)) {
    const g = Math.round(Math.min(255, Math.max(0, t * 2.55)));
    return [g, g, g];
  }
  h = normalizeHue(h);
  c = Math.max(0, c);
  t = Math.min(100, Math.max(0, t));

  // ① 请求彩度直接求解
  const direct = solveToneAndChroma(h, c, t);
  if (direct) return direct;

  // ② 降 chroma 二分（取可行最大彩度，保持 hue/tone 目标）
  let lowC = 0;
  let highC = c;
  let bestC = null;
  while (highC - lowC > 0.4) {
    const midC = (lowC + highC) / 2;
    const found = solveToneAndChroma(h, midC, t);
    if (found) {
      bestC = found;
      lowC = midC; // 可行 → 尝试更高彩度
    } else {
      highC = midC;
    }
  }
  if (bestC) return bestC;
  // 全失败 → 中性灰兜底（tone 折算）
  const g2 = Math.round(Math.min(255, Math.max(0, (t / 100) * 255)));
  return [g2, g2, g2];
}

// ---------- TonalPalette ----------

/**
 * TonalPalette（SystemUI monеt 同构）：(hue, chroma) 固定，tone(t) 生成指定亮度级。
 * tone 表按需生成并缓存（确定性快照锚稳定）。
 */
export class TonalPalette {
  constructor(h, c) {
    this.h = h;
    this.c = c;
    this._cache = new Map();
  }
  static fromInt(argb) {
    const hct = hctFromArgb((argb >> 16) & 255, (argb >> 8) & 255, argb & 255);
    return new TonalPalette(hct.h, hct.c);
  }
  static fromHueAndChroma(h, c) {
    return new TonalPalette(h, c);
  }
  tone(t) {
    const key = Math.round(t);
    if (!this._cache.has(key)) {
      this._cache.set(key, hctToInt(this.h, this.c, key));
    }
    return this._cache.get(key);
  }
  toCss(t) {
    const [r, g, b] = this.tone(t);
    return `rgb(${r},${g},${b})`;
  }
}

// ---------- ColorScheme（SystemUI monеt TONAL_SPOT 同构） ----------

/**
 * seed 色五调色板（AOSP SystemUI monеt ColorScheme TONAL_SPOT 常量同构）：
 *   accent1 = seed（chroma 下限 48） / accent2 = hue, 16 / accent3 = hue+60, 32
 *   neutral1 = hue, 4 / neutral2 = hue, 8
 */
export function createColorScheme(seedArgb) {
  const seedHct = hctFromArgb((seedArgb >> 16) & 255, (seedArgb >> 8) & 255, seedArgb & 255);
  const hue = seedHct.h;
  const seedChroma = Math.max(48, seedHct.c);
  return {
    seed: seedArgb,
    seedHue: hue,
    seedChroma: seedHct.c,
    accent1: TonalPalette.fromHueAndChroma(hue, seedChroma),
    accent2: TonalPalette.fromHueAndChroma(hue, 16),
    accent3: TonalPalette.fromHueAndChroma((hue + 60) % 360, 32),
    neutral1: TonalPalette.fromHueAndChroma(hue, 4),
    neutral2: TonalPalette.fromHueAndChroma(hue, 8),
  };
}

// ---------- MD3 蓝图 tone 映射 → CSS 变量 ----------

// MD3 动态色蓝图（Material 动态色规范稳定映射）：
//   dark: primary=a1.80 onPrimary=a1.20 primaryContainer=a1.30 onPrimaryContainer=a1.90
//         secondary=a2.80/20/30/90 tertiary=a3.80/20/30/90
//         surface=n1.06 surfaceContainer=n1.12 surfaceContainerHigh=n1.17 onSurface=n1.90
//         onSurfaceVariant=n2.80 outline=n2.60 outlineVariant=n1.30 accent=a1.80
//   light: 40/100/90/10 · 40/100/90/10 · 40/100/90/10 · surface=n1.98 sc=n1.94 sch=n1.90
//          onSurface=n1.10 onSurfaceVariant=n2.30 outline=n2.50 outlineVariant=n1.80 accent=a1.40
const MD3_TONE_MAP = {
  dark: {
    'md-primary': ['accent1', 80], 'md-on-primary': ['accent1', 20],
    'md-primary-container': ['accent1', 30], 'md-on-primary-container': ['accent1', 90],
    'md-secondary': ['accent2', 80], 'md-on-secondary': ['accent2', 20],
    'md-secondary-container': ['accent2', 30], 'md-on-secondary-container': ['accent2', 90],
    'md-tertiary': ['accent3', 80], 'md-on-tertiary': ['accent3', 20],
    'md-tertiary-container': ['accent3', 30], 'md-on-tertiary-container': ['accent3', 90],
    'md-surface': ['neutral1', 6], 'md-surface-container': ['neutral1', 12],
    'md-surface-container-high': ['neutral1', 17],
    'md-on-surface': ['neutral1', 90], 'md-on-surface-variant': ['neutral2', 80],
    'md-outline': ['neutral2', 60], 'md-outline-variant': ['neutral1', 30],
    'md-accent': ['accent1', 80],
  },
  light: {
    'md-primary': ['accent1', 40], 'md-on-primary': ['accent1', 100],
    'md-primary-container': ['accent1', 90], 'md-on-primary-container': ['accent1', 10],
    'md-secondary': ['accent2', 40], 'md-on-secondary': ['accent2', 100],
    'md-secondary-container': ['accent2', 90], 'md-on-secondary-container': ['accent2', 10],
    'md-tertiary': ['accent3', 40], 'md-on-tertiary': ['accent3', 100],
    'md-tertiary-container': ['accent3', 90], 'md-on-tertiary-container': ['accent3', 10],
    'md-surface': ['neutral1', 98], 'md-surface-container': ['neutral1', 94],
    'md-surface-container-high': ['neutral1', 90],
    'md-on-surface': ['neutral1', 10], 'md-on-surface-variant': ['neutral2', 30],
    'md-outline': ['neutral2', 50], 'md-outline-variant': ['neutral1', 80],
    'md-accent': ['accent1', 40],
  },
};

/**
 * scheme + 模式 → CSS 变量 Map（键含 --md- 前缀直覆盖现有消费面）。
 * 确定性：同 seed 同 mode 输出恒等（tone 表缓存 + 纯函数）。
 */
export function schemeToCssVars(scheme, mode = 'dark') {
  const map = MD3_TONE_MAP[mode] || MD3_TONE_MAP.dark;
  const out = {};
  for (const [key, [pal, tone]] of Object.entries(map)) {
    out[`--${key}`] = scheme[pal].toCss(tone);
  }
  out['--monet-seed-hue'] = String(Math.round(scheme.seedHue));
  return out;
}

// ---------- 量化（QuantizerCelebi 确定性简化） ----------

/**
 * 壁纸像素量化：确定性加权 k-means（k=8）。
 * 初始质心 = RGB 高 4 位桶频次排序前 k（同图必同初值 → 同图必同色板，#33 验收）；
 * 评分 = 频次 × min(CAM16 彩度, 48)（频次 × 色度优先，SystemUI seed 语义同构）。
 * @param {number[][]} pixels sRGB 像素 [[r,g,b],...]（透明像素由调用方剔除）
 * @param {number} [k=8] 簇数上限
 * @returns {{argb:number, weight:number, chroma:number}[]} 按评分降序
 */
export function quantizeColors(pixels, k = 8) {
  if (!pixels || pixels.length === 0) return [];
  // ① RGB 高 4 位桶计数（确定性初值来源）
  const buckets = new Map();
  for (const [r, g, b] of pixels) {
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  const sortedBuckets = [...buckets.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const centroids = sortedBuckets.slice(0, k).map(([key]) => [
    (((key >> 8) & 15) << 4) + 8,
    (((key >> 4) & 15) << 4) + 8,
    ((key & 15) << 4) + 8,
  ]);
  while (centroids.length < k) centroids.push(centroids[centroids.length - 1] || [128, 128, 128]);

  // ② 加权 k-means（10 轮收敛）
  for (let round = 0; round < 10; round++) {
    const sums = centroids.map(() => [0, 0, 0, 0]);
    for (const [r, g, b] of pixels) {
      let minD = Infinity;
      let minI = 0;
      for (let ci = 0; ci < centroids.length; ci++) {
        const dr = r - centroids[ci][0];
        const dg = g - centroids[ci][1];
        const db = b - centroids[ci][2];
        const d = dr * dr + dg * dg + db * db;
        if (d < minD) {
          minD = d;
          minI = ci;
        }
      }
      const s = sums[minI];
      s[0] += r; s[1] += g; s[2] += b; s[3] += 1;
    }
    let moved = 0;
    for (let ci = 0; ci < centroids.length; ci++) {
      if (sums[ci][3] === 0) continue;
      const next = [sums[ci][0] / sums[ci][3], sums[ci][1] / sums[ci][3], sums[ci][2] / sums[ci][3]];
      moved += Math.abs(next[0] - centroids[ci][0]) + Math.abs(next[1] - centroids[ci][1]) + Math.abs(next[2] - centroids[ci][2]);
      centroids[ci] = next;
    }
    if (moved < 0.5) break;
  }

  // ③ 统计簇权重 + 色度评分
  const counts = centroids.map(() => 0);
  for (const [r, g, b] of pixels) {
    let minD = Infinity;
    let minI = 0;
    for (let ci = 0; ci < centroids.length; ci++) {
      const dr = r - centroids[ci][0];
      const dg = g - centroids[ci][1];
      const db = b - centroids[ci][2];
      const d = dr * dr + dg * dg + db * db;
      if (d < minD) {
        minD = d;
        minI = ci;
      }
    }
    counts[minI]++;
  }
  const out = [];
  for (let ci = 0; ci < centroids.length; ci++) {
    if (counts[ci] === 0) continue;
    const [r, g, b] = centroids[ci].map(Math.round);
    const cam = cam16FromArgb(r, g, b);
    out.push({
      argb: (255 << 24) | (r << 16) | (g << 8) | b,
      weight: counts[ci] / pixels.length,
      chroma: cam.c,
    });
  }
  out.sort((a, b) => b.weight * Math.min(b.chroma, 48) - a.weight * Math.min(a.chroma, 48));
  return out;
}

/** 量化结果 → seed ARGB（评分最高簇；全无彩色时按频次最高，色度评分已兜底排序） */
export function seedFromQuantized(clusters) {
  if (!clusters || clusters.length === 0) return 0xff215de0; // 默认科技蓝兜底
  return clusters[0].argb;
}

/**
 * RGBA 数组（canvas ImageData.data 语义）→ ColorScheme。
 * 透明像素（alpha<128）剔除；全透明回落默认蓝。
 */
export function monetFromRgbaData(data, opts = {}) {
  const step = opts.step || 1;
  const pixels = [];
  for (let i = 0; i < data.length; i += 4 * step) {
    if (data[i + 3] > 128) pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  const clusters = quantizeColors(pixels, opts.k || 8);
  return createColorScheme(seedFromQuantized(clusters));
}

/** 十进制 seed → '#rrggbb'（预览/持久化友好） */
export function argbToHex(argb) {
  return '#' + ((argb & 0xffffff) | 0x1000000).toString(16).slice(1);
}
