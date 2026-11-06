// ==================== a11y-settings.js — 无障碍基线纯逻辑（#105 v10.22 一期） ====================
//
// AOSP 真源锚点（aosp-mirror main 实拉入库 · 2026-11-06，非记忆）：
//   - frameworks/base/core/java/android/view/accessibility/AccessibilityManager.java
//     （docs/reference/frameworks-base/accessibility/AccessibilityManager.java 全文入库）：
//       DALTONIZER_DISABLED = -1
//       DALTONIZER_SIMULATE_MONOCHROMACY = 0
//       DALTONIZER_CORRECT_DEUTERANOMALY = 12
//   - packages/apps/Settings res/values/arrays.xml 实拉：
//       daltonizer_mode_keys = [deuteranomaly, protanomaly, tritanomaly, grayscale]
//       daltonizer_type_values = [12, 11, 13, 0]
//   - packages/apps/Settings res/xml/accessibility_color_and_motion.xml 实拉入库
//     （docs/reference/packages-apps-settings/color-and-motion/）：
//       渲染序 = daltonizer_preference(色彩校正) → toggle_inversion_preference(颜色反转)
//         → dark_ui_mode_accessibility(深色主题) → toggle_force_invert(使所有应用采用深色主题)
//         → animator_duration_scale(移除动画) → toggle_large_pointer_icon(大号鼠标指针)
//         → experimental_category(实验性功能，空区隐藏)
//   - packages/apps/Settings res/xml/accessibility_text_reading_options.xml 实拉入库：
//       渲染序 = preview → font_size(字体大小) → display_size(显示大小)
//         → toggle_force_bold_text(粗体文字) → toggle_high_text_contrast_preference(高对比度文字)
//         → reset
//   - DaltonizerSaturationSeekbarPreferenceController 实拉：
//       SATURATION_MIN=1 / SATURATION_MAX=10 / DEFAULT_SATURATION_LEVEL=7
//   - ToggleDaltonizerPreferenceFragment 实拉：ENABLED = Secure
//     ACCESSIBILITY_DISPLAY_DALTONIZER_ENABLED（primary switch「使用色彩校正」）
//   - 文案 = values-zh-rCN/strings.xml 实拉（色彩校正标题注记：Settings 主仓库
//     accessibility_display_daltonizer_preference_title zh-rCN 与 values 双缺失 →
//     frameworks_base SettingsLib res/values-zh-rCN 实证 =「色彩校正」，v8.02
//     tts_settings_title 同律先例）
//
// 移除动画语义（DisableAnimationsPreferenceController ← animator_duration_scale）：
//   AOSP 写 Settings.Secure.ANIMATOR_DURATION_SCALE=0（全局动画时长归零）。
//   Web 等价 = 双通道判定（R95 审计帖 6661310578 方案采纳）：
//     通道① 系统 @media (prefers-reduced-motion: reduce)（跟随系统，存量 36 处 CSS + JS 读取面）
//     通道② 用户开关 html[data-a11y-reduce-motion]（设置页写属性，全局即时生效）
//   两通道 OR 合成 = resolveReduceMotion；CSS 侧 17 文件已迁移为
//   `@media + [data-a11y-reduce-motion]` 双通道（v10.22 迁移脚本在录）。
//
// Web 映射（诚实标注）：
//   - 色彩校正/反转 = CSS filter 链真实现（html 层与 v8.02 RBC 亮度同一消费点合成，
//     与 body 层 QS 亮度滑条分层乘法互不冲突）；AOSP daltonizer 走 SurfaceFlinger
//     色彩变换管线，md3 以 SVG feColorMatrix 矩阵近似（Machado et al. 2009 同源矩阵），
//     管线差异诚实标注，非逐帧等价
//   - 粗体文字 = FontWeightAdjustment(=1000) 语义 → 全局 font-weight 提升属性通道
//   - 高对比度文字 = token 覆盖通道（--md-on-* 家族按主题极性提极值；裸写颜色不覆盖——
//     既有消费链以 var(--md-*) 为主，裸色残留属 #80 准入整改域）
//   - 字体大小 = html 根字号通道（rem 族生效；md3 全库 px 化文本不随动——px→rem
//     迁移列为后续阶段，与 #105 二期同批评估，预览区真实演示）
//   - 显示大小 = 应用内容层 zoom 通道（.app-body；壳层状态栏/手势/ dock 保持 1:1——
//     手势阈值 px 语义不随 density 缩放，输入安全边界诚实标注）
//
// 纯逻辑层：零 DOM 零 window 默认（doc/media 以参数注入，vitest 伪造真跑）；
// DOM 接线见 settings.js 页 20/32/33 内联脚本与各壳层消费点。

/** AccessibilityManager.DALTONIZER_*（实源逐字） */
export const DALTONIZER_DISABLED = -1;
export const DALTONIZER_SIMULATE_MONOCHROMACY = 0;
export const DALTONIZER_CORRECT_DEUTERANOMALY = 12;

/** 移除动画双通道契约 */
export const REDUCE_MOTION_ATTR = 'data-a11y-reduce-motion';
export const REDUCE_MOTION_EVENT = 'a11y-reduce-motion-changed';
export const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** 色彩校正模式注册表（arrays.xml keys×values 权威序 + zh-rCN 权威文案） */
export const DALTONIZER_MODES = [
  { value: 12, key: 'deuteranomaly', title: '红绿色盲、绿色弱', summary: '绿色弱视' },
  { value: 11, key: 'protanomaly', title: '红绿色盲、红色弱', summary: '红色弱视' },
  { value: 13, key: 'tritanomaly', title: '蓝黄色盲', summary: '蓝色弱视' },
  { value: 0, key: 'grayscale', title: '灰度模式', summary: '' },
];

/** 饱和度档位（DaltonizerSaturationSeekbarPreferenceController 实源逐字） */
export const SATURATION_MIN = 1;
export const SATURATION_MAX = 10;
export const DEFAULT_SATURATION_LEVEL = 7;

/** SVG feColorMatrix 滤镜 id（settings 页 32 按需注入 defs；Machado 同源矩阵，诚实标注近似） */
export const DALTONIZER_FILTER_IDS = {
  12: 'a11y-daltonizer-deuteranomaly',
  11: 'a11y-daltonizer-protanomaly',
  13: 'a11y-daltonizer-tritanomaly',
};

/** 模式值合法性（未收录值 = AOSP daltonizer 服务不可达档位，诚实降级为无滤镜） */
export const isValidDaltonizerMode = (mode) => DALTONIZER_MODES.some((m) => m.value === mode);

/** 饱和度档位收敛（越界钳制到 AOSP MIN/MAX） */
export const clampSaturationLevel = (level) => {
  const n = Math.round(Number(level));
  if (!Number.isFinite(n)) return DEFAULT_SATURATION_LEVEL;
  return Math.min(SATURATION_MAX, Math.max(SATURATION_MIN, n));
};

/**
 * 移除动画双通道判定（OR 合成）。
 * @param {{mediaMatches?: boolean, attrPresent?: boolean}} input
 *   mediaMatches — 通道① @media prefers-reduced-motion 当前匹配态
 *   attrPresent  — 通道② html[data-a11y-reduce-motion] 属性在场
 * @returns {boolean}
 */
export const resolveReduceMotion = ({ mediaMatches = false, attrPresent = false } = {}) =>
  !!(mediaMatches || attrPresent);

/** 通道① 运行时读取（异常环境降级 false；matchMedia 缺席 ≡ AOSP 无动画服务查询分支） */
export const readReduceMotionMedia = () => {
  try {
    return typeof matchMedia === 'function' && matchMedia(REDUCE_MOTION_QUERY).matches;
  } catch (e) {
    return false;
  }
};

/**
 * 全量判定入口（双通道实时读，免缓存陈旧）。
 * @param {{doc?: Document, mediaMatches?: boolean}} [input] — 测试注入；缺省走运行时全局
 */
export const isReduceMotionActive = (input = {}) => {
  const doc = input.doc !== undefined ? input.doc : (typeof document !== 'undefined' ? document : undefined);
  const mediaMatches = input.mediaMatches !== undefined ? input.mediaMatches : readReduceMotionMedia();
  const attrPresent = !!(doc && doc.documentElement && doc.documentElement.hasAttribute(REDUCE_MOTION_ATTR));
  return resolveReduceMotion({ mediaMatches, attrPresent });
};

/**
 * 双通道订阅（MQ change + 自定义事件桥），订阅即回调当前值，返回退订函数。
 * 供缓存型消费点（dock/mini-window 等）在开关切换时同步缓存。
 */
export const watchReduceMotion = (doc, cb) => {
  if (!doc || typeof cb !== 'function') return () => {};
  let mq = null;
  const onMq = () => cb(isReduceMotionActive({ doc }));
  try {
    if (typeof matchMedia === 'function') {
      mq = matchMedia(REDUCE_MOTION_QUERY);
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
  } catch (e) { /* 老引擎忽略 */ }
  let evt = null;
  try {
    evt = new CustomEvent(REDUCE_MOTION_EVENT);
    doc.addEventListener(REDUCE_MOTION_EVENT, onMq);
  } catch (e) { /* 测试桩无 CustomEvent */ }
  onMq();
  return () => {
    try { if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', onMq); else if (mq.removeListener) mq.removeListener(onMq); } } catch (e) {}
    try { if (evt) doc.removeEventListener(REDUCE_MOTION_EVENT, onMq); } catch (e) {}
  };
};

/**
 * html 层 filter 合成器（单点真源：RBC 亮度 × 色彩校正 × 颜色反转）。
 * 应用序 = brightness（RBC）→ daltonizer（矩阵+饱和度）→ invert（反转），
 * CSS filter 链序即应用序；多设置同时开启 = 乘法合成（v8.02 RBC 消费链扩容）。
 * @param {{rbc?: boolean, daltonizerEnabled?: boolean, daltonizerMode?: number,
 *          daltonizerSaturation?: number, colorInversion?: boolean}} input
 * @returns {string} filter 值（空串 = 无滤镜，调用方直接清 inline style）
 */
export const resolveHtmlFilter = ({
  rbc = false,
  daltonizerEnabled = false,
  daltonizerMode = DALTONIZER_CORRECT_DEUTERANOMALY,
  daltonizerSaturation = DEFAULT_SATURATION_LEVEL,
  colorInversion = false,
} = {}) => {
  const chain = [];
  if (rbc) chain.push('brightness(0.5)');
  if (daltonizerEnabled) {
    if (daltonizerMode === DALTONIZER_SIMULATE_MONOCHROMACY) {
      // 灰度 = SIMULATE_MONOCHROMACY(0)：饱和度档位不可用（zh-rCN
      // daltonizer_saturation_unavailable_summary 权威语义）
      chain.push('grayscale(1)');
    } else if (isValidDaltonizerMode(daltonizerMode)) {
      const id = DALTONIZER_FILTER_IDS[daltonizerMode];
      chain.push(`url(#${id}) saturate(${clampSaturationLevel(daltonizerSaturation) / 10})`);
    }
    // 未收录模式：诚实降级无滤镜（isValidDaltonizerMode 负例）
  }
  if (colorInversion) chain.push('invert(1) hue-rotate(180deg)');
  return chain.join(' ');
};

/**
 * 字体大小收敛（HTML 根字号通道）。AOSP FONT_SCALE 连续浮点；md3 slider 档位
 * 85%~150% 本地化（未逐值实拉 AOSP 档位表，诚实标注），步进 5%。
 */
export const FONT_SCALE_MIN = 85;
export const FONT_SCALE_MAX = 150;
export const DEFAULT_FONT_SCALE = 100;

export const clampFontScale = (scale) => {
  const n = Math.round(Number(scale));
  if (!Number.isFinite(n)) return DEFAULT_FONT_SCALE;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, n));
};

/**
 * 显示大小收敛（应用内容层 zoom 通道）。AOSP display size 连续密度档；
 * md3 slider 85%~130% 本地化（壳层不缩放边界见头注），步进 5%。
 */
export const DISPLAY_SCALE_MIN = 85;
export const DISPLAY_SCALE_MAX = 130;
export const DEFAULT_DISPLAY_SCALE = 100;

export const clampDisplayScale = (scale) => {
  const n = Math.round(Number(scale));
  if (!Number.isFinite(n)) return DEFAULT_DISPLAY_SCALE;
  return Math.min(DISPLAY_SCALE_MAX, Math.max(DISPLAY_SCALE_MIN, n));
};

/** 单一真源 store 默认值（localStorage settings:accessibility-v1；v8.02 既有 rbc/
 *  audioDescription 键序保留 + v10.22 #105 新增键；settings.js A11Y_PAGE_SCRIPT 的
 *  DEFAULTS 文本守护测试与本表对账——漂移即红）。 */
export const A11Y_STORE_DEFAULTS = Object.freeze({
  rbc: false,                 // v8.02 极暗（REDUCE_BRIGHT_COLORS_ACTIVATED，html 层 brightness(0.5)）
  audioDescription: false,    // v8.02 语音描述（persistent=false 会话态）
  removeAnimations: false,    // 移除动画（Secure ANIMATOR_DURATION_SCALE=0 语义 → 属性通道）
  colorInversion: false,      // 颜色反转（Secure ACCESSIBILITY_DISPLAY_INVERSION）
  daltonizerEnabled: false,   // 使用色彩校正（Secure ACCESSIBILITY_DISPLAY_DALTONIZER_ENABLED）
  daltonizerMode: DALTONIZER_CORRECT_DEUTERANOMALY, // 模式（Secure ACCESSIBILITY_DISPLAY_DALTONIZER，默认 12）
  daltonizerSaturation: DEFAULT_SATURATION_LEVEL,   // 强度 1..10 默认 7（controller 实源）
  fontScale: DEFAULT_FONT_SCALE,   // 字体大小 %（根字号通道）
  displayScale: DEFAULT_DISPLAY_SCALE, // 显示大小 %（应用内容层 zoom）
  boldText: false,            // 粗体文字（FONT_WEIGHT_ADJUSTMENT=1000 语义）
  highContrastText: false,    // 高对比度文字
});

/** A11Y_STORE_KEY 惯例常量（纯逻辑层零 localStorage；读写消费点见 a11y-apply.js / settings 页脚本） */
export const A11Y_STORE_KEY = 'settings:accessibility-v1';

/**
 * 色彩校正 SVG feColorMatrix defs 构建器（Machado et al. 2009 同源矩阵，severity 1.0；
 * AOSP daltonizer 走 SurfaceFlinger 色彩变换管线，Web 以 SVG 滤镜近似——管线差异
 * 诚实标注，非逐帧等价）。idempotent 挂载由接线层负责（a11y-apply.js ensure）。
 * @returns {string} svg outerHTML（position:absolute 零占位）
 */
export const buildDaltonizerDefsSvg = () => {
  const rows = (m) => `${m[0]} 0 0 0 0 ${m[1]} 0 0 0 0 ${m[2]} 0 0 0 0 0 0 0 1 0`;
  // 每模式 3 系数 = R'/G'/B' 行（Machado 1.0），A 行恒等保 alpha
  const matrices = {
    [DALTONIZER_FILTER_IDS[11]]: [0.152286, 0.114503, -0.003882],  // protanomaly
    [DALTONIZER_FILTER_IDS[12]]: [0.367322, 0.280085, -0.011820],  // deuteranomaly
    [DALTONIZER_FILTER_IDS[13]]: [1.255528, -0.078411, 0.004733],  // tritanomaly
  };
  const filters = Object.entries(matrices).map(([id, m]) =>
    `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${rows(m)}"/></filter>`
  ).join('');
  return `<svg id="a11yDaltonizerDefs" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">${filters}</svg>`;
};

