// ==================== animation-presets.js — 应用开/关动画曲线预设（#75 双引擎架构） ====================
//
// 设计目标：
//   1. 把开/关动画的多套可选曲线经 设置 › 动画与动效 一键切换，选择持久化 localStorage；
//   2. 单一真源：app-window.js（全屏窗口）/ split-screen.js（分屏窗格）/
//      app-window-parallel.js（Closing Actor）在每次过渡起点经 createTransitionRunner()
//      消费当前预设 —— 调用方只认 runner，不感知底层引擎（#75 §四.3 架构约束）；
//   3. 双引擎并存（#75 §1.3.1 已定稿）：
//        - 果冻 bouncy：弹簧引擎（spring.js 解析闭式解），保留 3D 倾斜/透视漏斗/果冻拉伸；
//          切换预设时经 window.__animPresets.apply → reconfigure —— 保位置/速度飞行中零跳变；
//        - 原生 native：定时轴引擎（时长 + 插值器），AOSP QuickstepTransitionManager 原值
//          （open 500ms / close 250ms，主曲线 emphasized、X 位移曲线 app_open_x），
//          无任何 3D 倾斜（rotateX/rotateY/skew/透视漏斗恒零 —— 原生启动动画本就没有，
//          见 QuickstepTransitionManager FloatProp 属性清单）；
//          热切换语义 = 下次过渡生效：在飞动画用旧引擎自然跑完，不强行打断不跳变；
//   4. 定时轴引擎实现 AOSP 打断协议（#75 §1.8-D 硬性要求，源码 InterruptibleInOutAnimator
//      + AnimatorPlaybackController.startWithVelocity）：
//        - 剩余时长接管：打断后起点 = 当前值（非 0）、同一条曲线正向（非镜像回放）、
//          时长 = 原时长 × (1 − 已播时间分数)，钳制 ≥ 0；
//        - 速度接管：setTarget 注入速度时起点 = 当前值 + 速度 × 单帧时长（getSingleFrameMs）；
//        - 收尾阈值：在飞进度 > ANIMATION_COMPLETE_THRESHOLD(0.95) 直接收尾到当前目标
//          （forceFinishIfCloseToEnd），新过渡从收尾值整段起新轴，无瞬移无拖尾；
//   5. ANIM_SPEED 倍率对两套引擎均生效：弹簧 response ÷ 倍率（k·m²/c·m 缩放，曲线保真）；
//      定时轴 duration ÷ 倍率（直接缩放时长，插值器不变）。
//
// 兼容回落：curOpenParams()/curCloseParams() 恒返回弹簧参数（folder/page-stack/subpage 等
// 非 runner 消费点与既有测试锚继续工作）；native 预设携带临界阻尼近似弹簧参数作为这些
// 消费点的回落动力学（500ms emphasized ≈ response 0.42 临界阻尼的手感近似，非原生引擎）。

import { makeSpringParams } from './spring.js';
import { EMPHASIZED, APP_OPEN_X } from './aosp/interpolators.js';

/** @typedef {{id:string, name:string, emoji:string, desc:string, kind:'spring'|'timed', open:*, close:*}} AnimPreset */

/** 新默认预设（#75 §四.1：snappy 退役后回落新默认；旧存档迁移同此值） */
export const DEFAULT_PRESET_ID = 'native';

/** AOSP 原值时长（QuickstepTransitionManager 实测常量） */
export const APP_LAUNCH_DURATION_MS = 500;        // APP_LAUNCH_DURATION
export const CLOSING_TRANSITION_DURATION_MS = 250; // CLOSING_TRANSITION_DURATION_MS

/** AOSP 打断协议：进度 >95% 直接收尾（AnimatorPlaybackController.ANIMATION_COMPLETE_THRESHOLD） */
export const ANIMATION_COMPLETE_THRESHOLD = 0.95;
/** 单帧时长（getSingleFrameMs 语义，60Hz 基准 —— 速度接管的一帧推进量） */
export const SINGLE_FRAME_MS = 1000 / 60;

/**
 * 动画曲线预设清单（#75 后共 2 套：果冻 + 原生；snappy（利落）已退役）。
 */
export const ANIM_PRESETS = [
  {
    id: 'bouncy',
    name: '果冻',
    emoji: '🍮',
    desc: '液态玻璃柔性微弹 · macOS 神奇收束扭曲（弹簧引擎 · 含 3D 倾斜）',
    kind: 'spring',
    // v7.15 iOS 26 / macOS Genie 双重校准（原值保留不动 —— #75 §四.2「保持原样」）
    open: makeSpringParams(0.38, 0.79, 1),
    close: makeSpringParams(0.32, 0.88, 1),
  },
  {
    id: 'native',
    name: '原生',
    emoji: '🤖',
    desc: 'AOSP Launcher3 原始手感 · 开 500ms / 关 250ms · 无 3D 倾斜（定时轴引擎）',
    kind: 'timed',
    // QuickstepTransitionManager 原值（§1.3 源码实测）
    openDuration: APP_LAUNCH_DURATION_MS,
    closeDuration: CLOSING_TRANSITION_DURATION_MS,
    interpolator: EMPHASIZED,      // mOpeningInterpolator（主时间轴：缩放/圆角/alpha）
    xInterpolator: APP_OPEN_X,     // mOpeningXInterpolator（X 位移专用）
    tiltDisabled: true,            // 核心约束：无 3D 倾斜（rotate/skew/透视漏斗恒零）
    scrimLight: 0.2,               // MAX_SCRIM_ALPHA_LIGHT（背景遮罩 亮）
    scrimDark: 0.8,                // MAX_SCRIM_ALPHA_DARK（背景遮罩 暗）
    // 兼容回落弹簧参数：folder / page-stack / 子页弹簧等非 runner 消费点继续拿
    // 弹簧参数（临界阻尼近似，无过冲 —— 原生无回弹语义）
    open: makeSpringParams(0.42, 1.0, 1),
    close: makeSpringParams(0.30, 1.0, 1),
  },
];

const PRESET_KEY = 'ios-desktop:anim-preset';

// ==================== 动画倍率（v7.18 · 开发者选项） ====================
// 全局速度倍率：>1 加速、<1 减速（0.25× 慢放供逐帧检视，3× 极速验收手感）。
// 弹簧引擎：response ÷ 倍率（k' = k·m²，c' = c·m —— 曲线形状逐点保真，仅拉伸时间轴）；
// 定时轴引擎：duration ÷ 倍率（直接缩放时长，插值器不变）（#75 §四.9）。
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
 * （保位置/速度零跳变）；定时轴引擎在下次过渡起点以新倍率计时长。
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

/** 当前选中的预设 id（无存档/退役 id（如 snappy）/脏值一律回落新默认 native —— #75 迁移语义） */
export function getAnimPresetId() {
  try {
    const id = localStorage.getItem(PRESET_KEY);
    return ANIM_PRESETS.some((p) => p.id === id) ? id : DEFAULT_PRESET_ID;
  } catch (e) {
    return DEFAULT_PRESET_ID;
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

/** 当前引擎是否为定时轴（native）。app-window/split-screen 据此归零全部装饰性形变。 */
export function isTimedEngineActive() {
  return getAnimPreset().kind === 'timed';
}

/** 当前预设的「打开」弹簧参数（兼容回落通道：folder/page-stack/subpage；含倍率缩放） */
export function curOpenParams() {
  return scaleAnimSpeed(getAnimPreset().open);
}

/** 当前预设的「关闭」弹簧参数（兼容回落通道；含倍率缩放） */
export function curCloseParams() {
  return scaleAnimSpeed(getAnimPreset().close);
}

// ==================== 过渡运行器（#75 §四.3 统一切换面） ====================

/**
 * 构造当前预设指定相位的过渡运行器描述。
 * 调用方（app-window/split-screen/app-window-parallel）只消费本函数产物，
 * 不直接判断预设种类 —— 「选了原生却还在跑弹簧积分」的结构性杜绝。
 *
 * @param {AnimPreset} preset 预设对象
 * @param {'open'|'close'} phase 过渡相位
 * @returns {{kind:'spring', phase:string, params:SpringParams}|
 *           {kind:'timed', phase:string, durationMs:number, main:Function, x:Function,
 *            tiltDisabled:boolean, scrimLight:number, scrimDark:number,
 *            posDesc:*, scaleDesc:*}}
 *   - spring：params 为倍率缩放后的弹簧参数（直接喂 Spring/Spring2D.reconfigure）
 *   - timed：durationMs 已除以倍率；main=主时间轴插值器、x=X 位移插值器；
 *     posDesc/scaleDesc 为 Timed2D/TimedValue.reconfigure 的现成描述
 */
export function createTransitionRunner(preset, phase) {
  const speed = getAnimSpeed();
  if (preset.kind === 'timed') {
    const base = phase === 'open' ? preset.openDuration : preset.closeDuration;
    const durationMs = (Number.isFinite(base) && base > 0 ? base : 300) / (speed > 0 ? speed : 1);
    const posDesc = {
      xAxis: { durationMs, interpolator: preset.xInterpolator || preset.interpolator },
      yAxis: { durationMs, interpolator: preset.interpolator },
    };
    const scaleDesc = { durationMs, interpolator: preset.interpolator };
    return {
      kind: 'timed',
      phase,
      durationMs,
      main: preset.interpolator,
      x: preset.xInterpolator || preset.interpolator,
      tiltDisabled: preset.tiltDisabled !== false,
      scrimLight: Number.isFinite(preset.scrimLight) ? preset.scrimLight : 0.2,
      scrimDark: Number.isFinite(preset.scrimDark) ? preset.scrimDark : 0.8,
      posDesc,
      scaleDesc,
    };
  }
  return { kind: 'spring', phase, params: scaleAnimSpeed(phase === 'open' ? preset.open : preset.close) };
}

/** 当前预设 + 指定相位的运行器（app-window/split-screen 的消费入口） */
export function getTransitionRunner(phase) {
  return createTransitionRunner(getAnimPreset(), phase);
}

// ==================== 定时轴引擎（AOSP 打断协议落地） ====================

/**
 * 一维定时轴值 —— 与 spring.js Spring 接口同构的可替换驱动（x/v/target 可直写、
 * update(dt)/setTarget(t,v)/reconfigure(desc)/isSettled()），供引擎按预设整体切换。
 *
 * 时间轴模型：锚点 (from, to, t=0, dur) + 插值器正向求解 x = from + (to−from)·e(t/dur)。
 *
 * 打断协议（#75 §1.8-D，硬性要求）：
 *   1. reconfigure(desc) 只装载「下次过渡」的时长/插值器（惰性）——与 Spring.reconfigure
 *      的懒重锚同构；真正的锚定发生在下一次 update()；
 *   2. update() 锚定分派：
 *        - 时间轴空闲（上一段已播完/从未锚定）→ 全新过渡：满时长锚定（from=当前值）；
 *        - 时间轴在飞（目标改道/reconfigure 到来）→ 打断接管：起点 = 当前值、同曲线
 *          正向、剩余时长 = 原时长 × (1 − 已播时间分数)（InterruptibleInOutAnimator.animate）；
 *   3. setTarget(t, v)：v ≠ null 时起点先按 速度 × 单帧时长 前进（startWithVelocity
 *      的一帧推进量语义）；若在飞进度 > ANIMATION_COMPLETE_THRESHOLD 则先对当前锚点
 *      直接收尾（forceFinishIfCloseToEnd —— 消灭尾巴拖帧），新过渡从收尾值整段开始；
 *   4. v 为逐帧有限差分（值/秒），与 Spring.v 同量纲 —— 动量/速度接力通道零改动。
 */
export class TimedValue {
  /**
   * @param {{durationMs?:number, interpolator?:Function, initialValue?:number,
   *           initialVelocity?:number, target?:number}} cfg
   */
  constructor({ durationMs = 300, interpolator = EMPHASIZED, initialValue = 0, initialVelocity = 0, target = null } = {}) {
    this.x = initialValue;
    this.v = initialVelocity;
    this.target = (target === null || target === undefined) ? initialValue : target;
    this._baseMs = durationMs;
    this._interp = interpolator;
    this._frameMs = SINGLE_FRAME_MS;
    // 时间轴锚点状态
    this._t = 0;        // 当前锚点已播时间（秒）
    this._dur = 0;      // 当前锚点总时长（秒）
    this._from = this.x;
    this._to = this.target;
    this._idle = true;  // 无在飞时间轴
    this._pending = null; // reconfigure 暂存（下次 update 锚定）
    this._lastX = this.x;
    this._lastTarget = this.target;
    // 引擎嗅探标记（跨模块 instance 判定用；与 Spring 的判别互补）
    this.__timedEngine = true;
  }

  /**
   * 从旧引擎（Spring 接口实例）原位接管：保 x/v/target —— 引擎切换零跳变。
   * @param {{x:number, v:number, target:number}} legacy
   * @param {{durationMs?:number, interpolator?:Function}} desc
   * @returns {TimedValue}
   */
  static fromLegacy(legacy, desc) {
    return new TimedValue({
      durationMs: desc && desc.durationMs,
      interpolator: desc && desc.interpolator,
      initialValue: legacy.x,
      initialVelocity: legacy.v,
      target: legacy.target,
    });
  }

  /**
   * 设定目标；可选注入初速度（手势速度接力 —— startWithVelocity 语义）。
   * 在飞进度 > ANIMATION_COMPLETE_THRESHOLD 时先对当前锚点直收尾（无拖尾）。
   * @param {number} t
   * @param {number|null} [initialVelocity=null] 值/秒（进度域 0~1，位置域 px/s）
   */
  setTarget(t, initialVelocity = null) {
    if (!this._idle && this._dur > 0) {
      const span = Math.abs(this._to - this._from);
      if (span > 1e-9) {
        const frac = 1 - Math.abs(this.x - this._to) / span; // 朝当前锚点终点的进度
        if (frac > ANIMATION_COMPLETE_THRESHOLD) {
          this.x = this._to;
          this.v = 0;
          this._t = this._dur;
          this._idle = true;
        }
      }
    }
    this.target = t;
    if (initialVelocity !== null && Number.isFinite(initialVelocity) && initialVelocity !== 0) {
      // 速度接管：起点 = 当前值 + 速度 × 单帧时长（钳进 [0,1] 进度域由插值端点保证）
      this.x = this.x + initialVelocity * (this._frameMs / 1000);
    }
  }

  /**
   * 装载下次过渡的时长/插值器（惰性 —— 真正锚定在下次 update()，与 Spring 懒重锚同构）。
   * @param {{durationMs?:number, interpolator?:Function}|null} desc
   */
  reconfigure(desc) {
    if (desc) this._pending = desc;
  }

  /** 锚定：pending 装载 + 空闲（全新满时长）与在飞（打断剩余时长）分派 */
  _anchor() {
    const desc = this._pending;
    this._pending = null;
    if (desc) {
      if (Number.isFinite(desc.durationMs) && desc.durationMs > 0) this._baseMs = desc.durationMs;
      if (typeof desc.interpolator === 'function') this._interp = desc.interpolator;
    }
    const reversing = !this._idle && Math.abs(this.target - this.x) > 1e-12;
    if (reversing) {
      // 打断接管（InterruptibleInOutAnimator.animate）：起点=当前值、同曲线正向、
      // 剩余时长 = 原时长 × (1 − 已播时间分数)，钳制 ≥ 0
      const elapsedFrac = this._dur > 0 ? Math.min(Math.max(this._t / this._dur, 0), 1) : 0;
      const remaining = Math.max(0, this._baseMs * (1 - elapsedFrac));
      this._from = this.x;
      this._to = this.target;
      this._t = 0;
      this._dur = remaining / 1000;
      this._idle = remaining <= 0;
      if (this._idle) { this.x = this._to; this.v = 0; }
    } else {
      // 全新过渡：满时长锚定（含 x==target 的零程特例 —— 直接收尾）
      this._from = this.x;
      this._to = this.target;
      this._t = 0;
      this._dur = this._baseMs / 1000;
      this._idle = this._dur <= 0 || Math.abs(this._to - this._from) < 1e-12;
      if (this._idle) { this.x = this._to; this.v = 0; }
    }
    this._lastX = this.x;
    this._lastTarget = this.target;
  }

  /**
   * 时间轴推进；dt 为帧间隔（秒）——与 Spring.update(dt) 同签名同量纲。
   * @param {number} dt
   */
  update(dt) {
    if (!(dt > 0)) return;
    const targetChanged = this._lastTarget !== this.target;
    const extWrite = Math.abs(this.x - this._lastX) > 1e-9 * (1 + Math.abs(this._lastX));
    // 构造时/稳态下 target≠x 亦是「待播过渡」（如 demote 构造后 setTarget、fromLegacy
    // 接管在途弹簧）—— 与 Spring 首帧 update 即从初值条件启动解算同构
    const pendingTransition = this._idle && Math.abs(this.target - this.x) > 1e-12;
    if (this._pending || targetChanged || extWrite || pendingTransition) {
      this._anchor();
    }
    if (this._idle) {
      // 空闲稳态：值锁定目标（与 Spring settle 后 x=target/v=0 同语义）
      this.x = this.target;
      this.v = 0;
      this._lastX = this.x;
      this._lastTarget = this.target;
      return;
    }
    this._t += dt;
    const raw = this._dur > 0 ? Math.min(Math.max(this._t / this._dur, 0), 1) : 1;
    const e = this._interp(raw);
    const prevX = this.x;
    this.x = this._from + (this._to - this._from) * e;
    this.v = dt > 0 ? (this.x - prevX) / dt : 0;
    if (raw >= 1) {
      this.x = this._to;
      this.v = 0;
      this._idle = true;
    }
    this._lastX = this.x;
    this._lastTarget = this.target;
  }

  /**
   * 是否已收敛（时间轴播完且值落在目标）。中断语义下不要求速度阈值 ——
   * 定时轴终点速度由曲线端点斜率决定，位置/值到位即视觉终态。
   * @param {number} [posEps=0.005]
   * @param {number} [_velEps=0.5] 与 Spring.isSettled 签名兼容（定时轴不消费）
   */
  isSettled(posEps = 0.005, _velEps = 0.5) {
    return this._idle && Math.abs(this.x - this.target) < posEps;
  }
}

/**
 * 二维定时轴 —— 两个独立的一维定时轴分别管理 X / Y 轴（与 Spring2D 同构可替换）。
 * AOSP 位移通道：mDx 走 mOpeningXInterpolator（app_open_x），mDy 走主时间轴
 * （emphasized）—— 由 posDesc.xAxis/yAxis 分别承载。
 */
export class Timed2D {
  /**
   * @param {{xAxis:{durationMs?:number, interpolator?:Function},
   *           yAxis:{durationMs?:number, interpolator?:Function}}} params
   * @param {number} [x=0]
   * @param {number} [y=0]
   * @param {number} [vx=0]
   * @param {number} [vy=0]
   */
  constructor(params, x = 0, y = 0, vx = 0, vy = 0) {
    const xa = (params && params.xAxis) || {};
    const ya = (params && params.yAxis) || {};
    this.x = new TimedValue({ durationMs: xa.durationMs, interpolator: xa.interpolator, initialValue: x, initialVelocity: vx });
    this.y = new TimedValue({ durationMs: ya.durationMs, interpolator: ya.interpolator, initialValue: y, initialVelocity: vy });
    this.__timedEngine = true;
  }

  /** 从旧 Spring2D 原位接管（保 x/v/target） */
  static fromLegacy(legacy, desc) {
    const d = desc || {};
    const inst = new Timed2D(
      { xAxis: d.xAxis || {}, yAxis: d.yAxis || {} },
      legacy.px, legacy.py, legacy.vx, legacy.vy
    );
    inst.x.target = legacy.x.target;
    inst.y.target = legacy.y.target;
    return inst;
  }

  /**
   * 双轴设目标；速度参数传 null 保持当前轴语义（与 Spring2D.setTarget 一致）。
   * @param {number} tx
   * @param {number} ty
   * @param {number|null} [vx=null]
   * @param {number|null} [vy=null]
   */
  setTarget(tx, ty, vx = null, vy = null) {
    this.x.setTarget(tx, vx);
    this.y.setTarget(ty, vy);
  }

  /** @param {{xAxis?:*, yAxis?:*}} desc */
  reconfigure(desc) {
    if (!desc) return;
    if (desc.xAxis) this.x.reconfigure(desc.xAxis);
    if (desc.yAxis) this.y.reconfigure(desc.yAxis);
  }

  /** @param {number} dt */
  update(dt) {
    this.x.update(dt);
    this.y.update(dt);
  }

  /** @returns {number} X 轴当前值 */
  get px() { return this.x.x; }
  /** @returns {number} Y 轴当前值 */
  get py() { return this.y.x; }
  /** @returns {number} X 轴当前速度 */
  get vx() { return this.x.v; }
  /** @returns {number} Y 轴当前速度 */
  get vy() { return this.y.v; }

  /**
   * 双轴是否均已收敛。
   * @param {number} [posEps=0.005]
   * @param {number} [velEps=0.5]
   */
  isSettled(posEps = 0.005, velEps = 0.5) {
    return this.x.isSettled(posEps, velEps) && this.y.isSettled(posEps, velEps);
  }
}

// 面向设置页与测试的桥（apply 回调由 app-window.js 注入：需要访问活跃弹簧实例）
if (typeof window !== 'undefined') {
  window.__animPresets = {
    list: ANIM_PRESETS,
    currentId: getAnimPresetId,
    currentName: () => getAnimPreset().name,
    currentKind: () => getAnimPreset().kind,
    getSpeed: getAnimSpeed,
    setSpeed: setAnimSpeed,
    runner: getTransitionRunner,
    /** @type {(id:string)=>void|null} 运行中弹簧热更新（app-window.js 注入） */
    apply: null,
  };
}
