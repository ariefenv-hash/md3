// ==================== aosp/clock-faces.js — 锁屏表盘注册表（v9.94 · #20） ====================
// AOSP 对标（aosp-mirror/platform_frameworks_base @ main 实拉 api.github.com contents，
// 快照 2026-11-04，KeyguardClockSwitch.java 502 行 / ClockController.kt 45 行）：
//
//  KeyguardClockSwitch.java（packages/SystemUI/src/com/android/keyguard/）
//   L97-98   mSmallClockFrame / mLargeClockFrame 双帧（lockscreen_clock_view[_large]）
//   L246-261 setClock：mSmallClockFrame.removeAllViews() + mLargeClockFrame.removeAllViews()
//            → mSmallClockFrame.addView(clock.getSmallClock().getView())
//            → mLargeClockFrame.addView(clock.getLargeClock().getView())
//            —— 表盘切换权威 = 向既有双帧注入表盘视图（帧常驻、内容重建）。
//            md3 映射：.lock-clock / .lock-clock-large 双帧保留（ClockSize 门控域不触碰，
//            #186 二期链路零改动），帧内内容按表盘重建（double-small 走 textContent
//            旧路径保 v9.26/v9.27 锚零漂移，其余脸 innerHTML 重建）
//   L114/211-212 mDrawAlpha（onSetAlpha）—— doze 变暗权威；ClockController.kt
//            initialize(isDarkTheme, dozeFraction, foldFraction) dozeFraction 同义。
//            md3 映射：.lock-face--aod 低亮度档（AOD 覆盖层）
//  plugin/src/com/android/systemui/plugins/clocks/ClockController.kt
//   L29-34   smallClock「appropriate for smaller viewports」/ largeClock「bigger viewport」
//            —— 每表盘必须同时提供小/大两视图；md3 buildFaceHTML(size) 同构
//   L38      config: ClockConfig —— 表盘身份（getClockId L210-217 KeyguardClockSwitch）
//
// 表盘清单（#20 初版四档 + AOSP 语义映射标注）：
//  double     Digital 双线 —— AOSP 锁屏大字双行（config_doubleLineClockDefault 默认 1；
//                            小视图单行 / 大视图时、分两段堆叠 = Pixel 双行大钟）。
//                            md3 默认脸。
//  expressive Expressive 圆润 —— Google Clock 8.1 M3 Expressive（#20 素材④）；胶囊容器
//                            圆角与分钟跳变弹簧参数为演示自创（#170 同口径「查不到
//                            权威值标注自创」，AOSP 锁屏插件域无此脸源码）
//  analog     Analog 表盘 —— framework widget AnalogClock（android.widget，API 1 起
//                            族系）语义移植；SystemUI 锁屏插件域无内置 analog
//                            （Pixel 表盘面板另供，无 AOSP 源码可逐值），表盘几何
//                            （12 刻度/时针 0.48R/分针 0.76R）为工程自定
//  minimal    Minimal 极简 —— doze/AOD 单行原生风（dozeFraction 低亮度形态）
//
// 纯逻辑纪律：零 DOM / 零 window / 零 Date.now（时基全注入）/ 零 Math.random。
// 字体源数据 CLOCK_FONT_SOURCES 与 apps/clock-app/app.mjs CLOCK_FONTS 同 id 同族名
//（#188 交付，v9.29 vendor 化），存储键 ios-desktop:clock-font-v1 系 app.mjs L96
// 预留声明的 #20 共用键——一处实现（本文件数据 + clock-font-loader.js 加载器）三处
// 消费（锁屏 / AOD / 设置侧字体卡）。url 为宿主文档相对路径（clock-app iframe 内
// 用 '../../assets/...'，宿主用 'assets/...'，同一 vendor 资产两套相对前缀）。

// v10.53 #101：AI 生成脸 custom 分支委托（watchface-generator 纯叶子零依赖零环——
// 生成参数真源在 ios-desktop:watchface-gen-v1，与表盘选择域本键分离；opts.customConfig
// 由调用方从 watchfaceGenStore 喂入，缺席回落 GEN_DEFAULT_CONFIG 确定性缺省脸）
import { buildCustomFaceHTML, GEN_DEFAULT_CONFIG } from './watchface-generator.js';

/** 表盘存储键（#20 新增单一真源；与 clock-font-v1 键分离——表盘与字体是两个 AOSP 设置域） */
export const LOCK_CLOCK_FACE_KEY = 'ios-desktop:lock-clock-face-v1';
/** 时钟字体存储键（#188 已交付、app.mjs L96 预留 #20 共用声明，本窗启用共用） */
export const CLOCK_FONT_KEY = 'ios-desktop:clock-font-v1';

/** 表盘注册表（ClockConfig 语义：id 身份 + 展示元数据；顺序 = 设置页网格顺序） */
export const CLOCK_FACES = [
  { id: 'double', label: 'Digital 双线', note: 'AOSP 锁屏大字双行（doubleLineClock 默认）' },
  { id: 'expressive', label: 'Expressive 圆润', note: 'Google Clock 8.1 M3E 风；胶囊/弹簧自创值' },
  { id: 'analog', label: 'Analog 表盘', note: 'framework AnalogClock 语义移植；几何自定' },
  { id: 'minimal', label: 'Minimal 极简', note: 'doze/AOD 单行原生风' },
  // v10.53 #101：第 5 脸 = 参数化生成器产物（单一状态源——选择域本键/参数域 watchface-gen-v1 分离）
  { id: 'custom', label: 'AI 生成', note: '#101 参数化生成器产物（seed 可复现，可逐维度锁定重掷）' },
];

export const DEFAULT_FACE_ID = CLOCK_FACES[0].id;

/** 表盘解析：未知/缺载 → 默认脸（ClockRegistry 兜底 DEFAULT_CLOCK_ID 语义） */
export function resolveFace(id) {
  return CLOCK_FACES.find((f) => f.id === id) || CLOCK_FACES[0];
}

/** 存储值解析：损坏 JSON / 未知 id / 裸值 → 默认（clock-app parseClockFontPref 同构） */
export function parseFacePref(raw) {
  try {
    const id = JSON.parse(raw).id;
    return CLOCK_FACES.some((f) => f.id === id) ? id : DEFAULT_FACE_ID;
  } catch (e) {
    return DEFAULT_FACE_ID;
  }
}

/**
 * 时钟字体 id 解析（validIds = CLOCK_FONT_SOURCES 全量 id；clock-app parseClockFontPref
 * 同构回落 'system'——两处共用键读侧同规则，防一侧加字体另一侧炸）
 */
export function parseClockFontId(raw, validIds) {
  try {
    const id = JSON.parse(raw).id;
    return validIds.includes(id) ? id : 'system';
  } catch (e) {
    return 'system';
  }
}

/**
 * 时钟字体源（数据域；与 clock-app CLOCK_FONTS 同 id 同 family——v9.29 vendor 三字体
 * + gsflex 外链 + system 兜底；'user' 为 #20 新增第五项：联动 #187 全局字体
 * （wallpaper.js --custom-user-font CSS 变量，font-changed 事件域），无独立 URL）
 */
export const CLOCK_FONT_SOURCES = [
  { id: 'system', label: '系统默认', family: null, url: null, note: 'Roboto Flex 数字链（vendor）' },
  { id: 'gsflex', label: 'Google Sans Flex', family: 'Google Sans Flex', css: true,
    url: 'https://fonts.googleapis.com/css2?family=Google+Sans+Flex&display=swap',
    note: 'Expressive 官方公开对应物（外链，离线回落）' },
  { id: 'aclock', label: 'AndroidClock 双线', family: 'AndroidClockClockV849',
    url: 'assets/fonts/AndroidClock.ttf', note: 'AOSP 锁屏大字原版（vendor 5.1KB）' },
  { id: 'acsolid', label: 'AndroidClock 实心', family: 'AndroidClockSolidV849',
    url: 'assets/fonts/AndroidClock_Solid.ttf', note: '实心变体（vendor 4.8KB）' },
  { id: 'clockopia', label: 'Clockopia 经典', family: 'ClockopiaClockV849',
    url: 'assets/fonts/Clockopia.ttf', note: '经典 Android 风（vendor 6.9KB）' },
  { id: 'user', label: '用户字体', family: null, userVar: true,
    note: '#187 全局导入字体联动（未导入时回落系统）' },
];

export const CLOCK_FONT_IDS = CLOCK_FONT_SOURCES.map((f) => f.id);

/**
 * 字体栈合成（纯函数）：字体 id → CSS font-family 值；null = 调用方回落脸默认栈。
 * - 有 family：'族','RobotoFlex',... 收尾等宽——clock-app setClockDigitVar 同纪律
 *   （数字回落链以等宽收尾，防加载失败逐帧宽度漂移，v9.28 实测锚）
 * - user：整段 var(--custom-user-font, ...)（#187 值本身即完整族链）
 * - system：null（锁屏帧保留 .lock-clock CSS 既有 RobotoFlex 栈）
 */
export function clockFontStack(fontId) {
  const f = CLOCK_FONT_SOURCES.find((x) => x.id === fontId);
  if (!f) return null;
  if (f.userVar) return "var(--custom-user-font, 'RobotoFlex', 'Noto Serif SC', sans-serif)";
  if (f.family) return `'${f.family}','RobotoFlex','Noto Serif SC',ui-monospace,'DejaVu Sans Mono',monospace`;
  return null;
}

/** 模拟表盘针角（纯函数；Android AnalogClock 语义：时针含分钟连续偏移，分针整分步进） */
export function analogAngles(d) {
  const m = d.getMinutes();
  const s = d.getSeconds();
  const h = d.getHours() % 12;
  return {
    hour: (h + m / 60) * 30,
    minute: (m + s / 60) * 6,
  };
}

const pad2 = (n) => String(n).padStart(2, '0');

/** 12 刻度 + 双针 + 轴心（确定性 toFixed 字符串；着色走 CSS 类非内联色） */
function analogSvg(angles) {
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    const sn = Math.sin(a);
    const cs = Math.cos(a);
    ticks += `<line x1="${(100 + 84 * sn).toFixed(1)}" y1="${(100 - 84 * cs).toFixed(1)}"`
      + ` x2="${(100 + 92 * sn).toFixed(1)}" y2="${(100 - 92 * cs).toFixed(1)}" class="an-tick"/>`;
  }
  return `<svg class="lock-face-analog" viewBox="0 0 200 200" aria-hidden="true">`
    + `<circle cx="100" cy="100" r="94" class="an-face"/>${ticks}`
    + `<line x1="100" y1="100" x2="100" y2="52" class="an-hand an-hand-h" transform="rotate(${angles.hour.toFixed(2)} 100 100)"/>`
    + `<line x1="100" y1="100" x2="100" y2="24" class="an-hand an-hand-m" transform="rotate(${angles.minute.toFixed(2)} 100 100)"/>`
    + `<circle cx="100" cy="100" r="5" class="an-pin"/></svg>`;
}

/**
 * 表盘 HTML 构建（ClockController.smallClock/largeClock 双视图同构；纯字符串零 DOM）。
 * @param {object} face resolveFace() 产物
 * @param {{date:Date, size?:'small'|'large', aod?:boolean, fontStack?:string|null, animate?:boolean}} opts
 *   date 时基注入；aod=true 追加 --aod 低亮度档（dozeFraction 语义）；
 *   animate=true 追加分钟跳变弹簧（仅锁屏 expressive 消费；AOD 零 rAF 纪律恒 false）
 * @returns {string}
 */
export function buildFaceHTML(face, opts) {
  const d = opts.date;
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const size = opts.size === 'large' ? 'large' : 'small';
  const aod = opts.aod ? ' lock-face--aod' : '';
  const pop = opts.animate ? ' lock-face-pop' : '';
  const fontAttr = opts.fontStack ? ` style="font-family:${opts.fontStack};"` : '';
  const rootCls = `lock-face lock-face--${size}${aod}`;

  if (face.id === 'analog') {
    return `<div class="${rootCls}" data-face="analog"${fontAttr}>${analogSvg(analogAngles(d))}</div>`;
  }
  if (face.id === 'expressive') {
    return `<div class="${rootCls}${pop}" data-face="expressive"${fontAttr}>`
      + `<div class="lock-face-pill"><div class="lock-face-time">${hh}:${mm}</div></div></div>`;
  }
  if (face.id === 'minimal') {
    return `<div class="${rootCls}" data-face="minimal"${fontAttr}>`
      + `<div class="lock-face-time lock-face-minimal-time">${hh}:${mm}</div></div>`;
  }
  // v10.53 #101：custom = 参数化生成脸（样式/布局全由 customConfig 派生——Monet
  // hue 派生零裸色；fontStack 沿用帧级 fontAttr 域，脸节点零 inline family 覆写）
  if (face.id === 'custom') {
    return `<div class="${rootCls}" data-face="custom"${fontAttr}>`
      + buildCustomFaceHTML(opts.customConfig || GEN_DEFAULT_CONFIG, { date: d, size }) + `</div>`;
  }
  // double：小视图单行（v9.26 既有形态延续——调用方走 textContent 旧路径时以本返回值
  // 语义为准）；大视图 = AOSP 双行堆叠（时/分两段，Pixel 大钟形态）
  if (size === 'large') {
    return `<div class="${rootCls}" data-face="double"${fontAttr}>`
      + `<div class="lock-face-time lock-face-hh">${hh}</div>`
      + `<div class="lock-face-time lock-face-mm">${mm}</div></div>`;
  }
  return `<div class="${rootCls}" data-face="double"${fontAttr}>`
    + `<div class="lock-face-time">${hh}:${mm}</div></div>`;
}

/** face 变更事件名（同页 CustomEvent 总线；锁屏 / AOD / 设置三方零 import 解耦） */
export const FACE_CHANGED_EVENT = 'lock-clock-face-changed';
export const CLOCK_FONT_CHANGED_EVENT = 'clock-font-changed';
