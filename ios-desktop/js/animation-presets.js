// ==================== animation-presets.js — 应用开/关动画曲线预设 ====================
//
// 设计目标：
//   1. 把「iOS 26 液态玻璃」开/关动画的弹簧手感做成多套可选曲线，经
//      设置 › 动画与动效 一键切换，选择持久化 localStorage；
//   2. 单一真源：app-window.js（全屏窗口）与 split-screen.js（分屏窗格）
//      在每次创建 / reconfigure 开关弹簧时都从本模块读取当前预设，
//      切换后下一次开/关立即生效，运行中的弹簧经 window.__animPresets.apply
//      热更新（reconfigure 保持位置与速度，切换零跳变）；
//   3. 预设只调 (response, dampingRatio, mass)，不触碰几何与渲染路径；
//      spring.test.js 的开/关对称性约束针对 spring.js 导出的 OPEN/CLOSE_PARAMS
//      兜底常量（未改动），预设值不进入该测试的断言范围。

import { makeSpringParams } from './spring.js';

/** @typedef {{id:string, name:string, emoji:string, desc:string, open:*, close:*}} AnimPreset */

/**
 * 动画曲线预设清单。
 * open/close 均为 makeSpringParams(response, ζ, mass) 产物：
 *   - response 越大动画越慢，ζ 越小过冲越明显，mass 放大整体惯量。
 *
 * v7.15 iOS 26 / macOS Genie 双重校准（默认预设「果冻」）：
 *   - open (0.38, 0.79)：Apple snappy 预设手感（response≈0.5·bounce 0.15 族），
 *     ~2% 缩放微过冲 —— 玻璃柔性落位微弹，配合透视漏斗形成「倾泻而出 → 收平」
 *     的连续叙事；速度反转期果冻拉伸同步可见。
 *   - close (0.32, 0.88)：前段加速更陡（吸入感），尾部近临界阻尼 —— 与
 *     Genie 漏斗的 closeEngage/closeFull 包络同相位：扭曲成形时窗口恰在
 *     高速段，失焦模糊与梯形收束同步增强。
 */
export const ANIM_PRESETS = [
  {
    id: 'snappy',
    name: '利落',
    emoji: '⚡',
    desc: '快速收敛一步到位 · 效率优先不拖泥带水',
    open: makeSpringParams(0.24, 0.98, 1),
    close: makeSpringParams(0.22, 1.04, 1),
  },
  {
    id: 'bouncy',
    name: '果冻',
    emoji: '🍮',
    desc: '液态玻璃柔性微弹 · macOS 神奇收束扭曲',
    open: makeSpringParams(0.38, 0.79, 1),
    close: makeSpringParams(0.32, 0.88, 1),
  },
];

const PRESET_KEY = 'ios-desktop:anim-preset';

// ==================== 动画倍率（v7.18 · 开发者选项） ====================
// 全局速度倍率：>1 加速、<1 减速（0.25× 慢放供逐帧检视，3× 极速验收手感）。
// 数学上等价于 response ÷ 倍率：k' = k·m²，c' = c·m（阻尼比与质量不变 —— 曲线
// 形状逐点保真，仅拉伸/压缩时间轴）。作用面：应用开/关/切换（主窗口 + 并行
// Closing Actor + 分屏窗格 + 主题全页覆盖层，均经 curOpen/curCloseParams 消费）、
// 子页面导航弹簧（page-stack）与放射状图标场（app-window）。
const SPEED_KEY = 'ios-desktop:anim-speed';
export const ANIM_SPEED_MIN = 0.25;
export const ANIM_SPEED_MAX = 3;

/** 当前动画倍率（无存档/脏值回落 1） */
export function getAnimSpeed() {
  try {
    const v = parseFloat(localStorage.getItem(SPEED_KEY));
    return Number.isFinite(v) && v >= ANIM_SPEED_MIN && v <= ANIM_SPEED_MAX ? v : 1;
  } catch (e) {
    return 1;
  }
}

/**
 * 设定动画倍率（钳制在 [0.25, 3]），并热应用到飞行中的弹簧：
 * window.__animPresets.apply（app-window 注入）reconfigure 主窗口与全部 Actor
 * （保位置/速度零跳变）；子页弹簧与放射场在下次过渡构建时自动带新倍率。
 * @returns {number} 实际落地的倍率
 */
export function setAnimSpeed(mult) {
  const v = Number(mult);
  if (!Number.isFinite(v)) return getAnimSpeed();
  const clamped = Math.min(ANIM_SPEED_MAX, Math.max(ANIM_SPEED_MIN, v));
  try {
    localStorage.setItem(SPEED_KEY, String(clamped));
  } catch (e) { /* 隐私模式静默降级：本次会话仍生效 */ }
  if (typeof window !== 'undefined' && window.__animPresets &&
      typeof window.__animPresets.apply === 'function') {
    try { window.__animPresets.apply(getAnimPresetId()); } catch (e) {}
  }
  return clamped;
}

/**
 * 任意 {mass, stiffness, damping} 参数组按当前倍率做时间轴缩放（k·m²，c·m）。
 * 供硬编码弹簧参数的消费点（子页导航 / 放射场）接入同一倍率。
 */
export function scaleAnimSpeed(p) {
  const s = getAnimSpeed();
  if (!Number.isFinite(s) || s === 1 || s <= 0) return p;
  return { mass: p.mass, stiffness: p.stiffness * s * s, damping: p.damping * s };
}

/** 当前选中的预设 id（无存档时回落 bouncy，损坏值同样回落） */
export function getAnimPresetId() {
  try {
    const id = localStorage.getItem(PRESET_KEY);
    return ANIM_PRESETS.some((p) => p.id === id) ? id : 'bouncy';
  } catch (e) {
    return 'bouncy';
  }
}

/** @returns {AnimPreset} 当前预设对象（永不返回 undefined） */
export function getAnimPreset() {
  return ANIM_PRESETS.find((p) => p.id === getAnimPresetId()) || ANIM_PRESETS[0];
}

/** 持久化预设 id */
export function setAnimPresetId(id) {
  if (!ANIM_PRESETS.some((p) => p.id === id)) return;
  try {
    localStorage.setItem(PRESET_KEY, id);
  } catch (e) { /* 隐私模式等场景静默降级：本次会话仍生效 */ }
}

/** 当前预设的「打开」弹簧参数（app-window / split-screen 每次开窗读取；含倍率缩放） */
export function curOpenParams() {
  return scaleAnimSpeed(getAnimPreset().open);
}

/** 当前预设的「关闭」弹簧参数（含倍率缩放） */
export function curCloseParams() {
  return scaleAnimSpeed(getAnimPreset().close);
}

// 面向设置页与测试的桥（apply 回调由 app-window.js 注入：需要访问活跃弹簧实例）
if (typeof window !== 'undefined') {
  window.__animPresets = {
    list: ANIM_PRESETS,
    currentId: getAnimPresetId,
    currentName: () => getAnimPreset().name,
    getSpeed: getAnimSpeed,
    setSpeed: setAnimSpeed,
    /** @type {(id:string)=>void|null} 运行中弹簧热更新（app-window.js 注入） */
    apply: null,
  };
}
