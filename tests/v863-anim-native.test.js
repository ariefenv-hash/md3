// ==================== v863-anim-native.test.js — #75 动画曲线「原生」预设（双引擎 + AOSP 打断协议） ====================
//
// 覆盖（#75 §五 DoD 逐条）：
//   ① 预设结构：恰 2 张卡（果冻+原生）、snappy（利落）已退役、bouncy 原参数零改动、
//      native 全字段（kind/durations/插值器/tiltDisabled/scrim 0.2·0.8）
//   ② 旧存档迁移：localStorage 存 snappy/脏值/空 → 一律回落新默认 native；bouncy 保留
//   ③ 曲线求解器：emphasized / app_open_x 两段 pathData 与独立参考实现（纯二分）逐点比对
//      （<1e-3，DoD「误差 <1%」）；端点 0/1 归位；单调性；曲线族常量与源码控制点一致
//   ④ createTransitionRunner 双引擎分派：bouncy=spring 参数、native=timed（时长+插值器）；
//      ANIM_SPEED 倍率对定时轴 duration ÷ 倍率生效（插值器不变）
//   ⑤ TimedValue 定时轴：推进/端点钳制/确定性收敛；AOSP 打断协议 ——
//      剩余时长接管（起点=当前值非 0、曲线正向非镜像、时长=原时长×(1−已播分数)）；
//      速度接管（起点=progress+velocity×单帧）；收尾阈值 0.95 直接收尾无拖尾
//   ⑥ Timed2D 双轴独立插值器（X=app_open_x / Y=emphasized）+ fromLegacy 引擎切换保 x/v/target
//   ⑦ 引擎随预设切换（源码锚 + 场景行为：native 下主窗口 __timedEngine=true 且 transform
//      串无 rotateX/rotateY/skew/matrix3d；切回 bouncy 倾斜恢复）
//   ⑧ 并行能力保留：radialField 恒弹簧（超越部分不裁剪）+ demote Actor 引擎随预设 +
//      #appLaunchScrim 遮罩层在册
//
// 取值纪律：全部 AOSP 常量溯源注释见 js/aosp/interpolators.js 与 animation-presets.js。

import { describe, test, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  ANIM_PRESETS, DEFAULT_PRESET_ID,
  APP_LAUNCH_DURATION_MS, CLOSING_TRANSITION_DURATION_MS,
  ANIMATION_COMPLETE_THRESHOLD, SINGLE_FRAME_MS,
  getAnimPresetId, setAnimPresetId, getAnimPreset,
  getAnimSpeed, setAnimSpeed,
  curOpenParams, curCloseParams,
  createTransitionRunner, getTransitionRunner, isTimedEngineActive,
  TimedValue, Timed2D,
} from '../ios-desktop/js/animation-presets.js';
import {
  EMPHASIZED, APP_OPEN_X, EMPHASIZED_PATH, APP_OPEN_X_PATH,
  STANDARD, EMPHASIZED_DECELERATE, EMPHASIZED_ACCELERATE, FAST_OUT_SLOW_IN,
  DECELERATE_1_5, cubicBezier, pathInterpolator,
} from '../ios-desktop/js/aosp/interpolators.js';
import { makeSpringParams } from '../ios-desktop/js/spring.js';
import { bootDesktop, sleep } from './scenario-helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_WINDOW_SRC = readFileSync(join(__dirname, '../ios-desktop/js/app-window.js'), 'utf8');
const PARALLEL_SRC = readFileSync(join(__dirname, '../ios-desktop/js/app-window-parallel.js'), 'utf8');
const SPLIT_SRC = readFileSync(join(__dirname, '../ios-desktop/js/split-screen.js'), 'utf8');
const INDEX_SRC = readFileSync(join(__dirname, '../ios-desktop/index.html'), 'utf8');

const PRESET_KEY = 'ios-desktop:anim-preset';
const SPEED_KEY = 'ios-desktop:anim-speed';

/** 参考实现：纯二分法解 x(t)=x（与被测 Newton 求解器完全独立） */
function refSolve(segments, x) {
  const segs = [];
  let px = 0;
  let py = 0;
  for (const s of segments) {
    segs.push({ x0: px, y0: py, c1x: s[0], c1y: s[1], c2x: s[2], c2y: s[3], x1: s[4], y1: s[5] });
    px = s[4];
    py = s[5];
  }
  const bez = (seg, t) => {
    const u = 1 - t;
    return {
      x: u * u * u * seg.x0 + 3 * u * u * t * seg.c1x + 3 * u * t * t * seg.c2x + t * t * t * seg.x1,
      y: u * u * u * seg.y0 + 3 * u * u * t * seg.c1y + 3 * u * t * t * seg.c2y + t * t * t * seg.y1,
    };
  };
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let seg = segs[segs.length - 1];
  for (const s of segs) {
    if (x <= s.x1 + 1e-12) { seg = s; break; }
  }
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (bez(seg, mid).x < x) lo = mid;
    else hi = mid;
  }
  return bez(seg, (lo + hi) / 2).y;
}

beforeEach(() => {
  localStorage.removeItem(PRESET_KEY);
  localStorage.removeItem(SPEED_KEY);
});

describe('v8.63 #75 · ① 预设结构（snappy 退役 + 双引擎定稿）', () => {
  test('恰 2 张预设卡：果冻 + 原生；snappy（利落）已从 ANIM_PRESETS 移除', () => {
    expect(ANIM_PRESETS).toHaveLength(2);
    expect(ANIM_PRESETS.map((p) => p.id)).toEqual(['bouncy', 'native']);
    expect(ANIM_PRESETS.some((p) => p.id === 'snappy')).toBe(false);
    // 名称/emoji/desc 重写在册（设置页卡片数据驱动渲染）
    const [bouncy, native] = ANIM_PRESETS;
    expect(bouncy.name).toBe('果冻');
    expect(bouncy.emoji).toBe('🍮');
    expect(native.name).toBe('原生');
    expect(native.emoji).toBe('🤖');
    expect(native.desc).toContain('无 3D 倾斜');
  });

  test('bouncy 果冻原参数零改动（弹簧引擎 · #75「保持原样」约束）', () => {
    const bouncy = ANIM_PRESETS.find((p) => p.id === 'bouncy');
    expect(bouncy.kind).toBe('spring');
    expect(bouncy.open).toEqual(makeSpringParams(0.38, 0.79, 1));
    expect(bouncy.close).toEqual(makeSpringParams(0.32, 0.88, 1));
  });

  test('native 原生全字段：kind/durations/双插值器/tiltDisabled/scrim 0.2·0.8（AOSP 原值）', () => {
    const native = ANIM_PRESETS.find((p) => p.id === 'native');
    expect(native.kind).toBe('timed');
    expect(native.openDuration).toBe(500);   // QuickstepTransitionManager.APP_LAUNCH_DURATION
    expect(native.closeDuration).toBe(250);  // CLOSING_TRANSITION_DURATION_MS
    expect(APP_LAUNCH_DURATION_MS).toBe(500);
    expect(CLOSING_TRANSITION_DURATION_MS).toBe(250);
    expect(typeof native.interpolator).toBe('function');
    expect(typeof native.xInterpolator).toBe('function');
    expect(native.interpolator).toBe(EMPHASIZED);      // mOpeningInterpolator
    expect(native.xInterpolator).toBe(APP_OPEN_X);     // mOpeningXInterpolator
    expect(native.tiltDisabled).toBe(true);            // 核心约束：无 3D 倾斜
    expect(native.scrimLight).toBe(0.2);               // MAX_SCRIM_ALPHA_LIGHT
    expect(native.scrimDark).toBe(0.8);                // MAX_SCRIM_ALPHA_DARK
    // 兼容回落弹簧参数在册（folder/page-stack/subpage 等非 runner 消费点）
    expect(native.open).toHaveProperty('stiffness');
    expect(native.open).toHaveProperty('damping');
  });

  test('AOSP 打断协议常量在册（ANIMATION_COMPLETE_THRESHOLD=0.95 / SINGLE_FRAME_MS=60Hz）', () => {
    expect(ANIMATION_COMPLETE_THRESHOLD).toBe(0.95);
    expect(SINGLE_FRAME_MS).toBeCloseTo(1000 / 60, 9);
  });
});

describe('v8.63 #75 · ② 旧存档迁移（snappy → 新默认，不空档不报错）', () => {
  test('无存档回落新默认 native', () => {
    expect(DEFAULT_PRESET_ID).toBe('native');
    expect(getAnimPresetId()).toBe('native');
    expect(getAnimPreset().id).toBe('native');
    expect(isTimedEngineActive()).toBe(true);
  });

  test('曾选 snappy 的存档读取回落 native（不得空档/报错）', () => {
    localStorage.setItem(PRESET_KEY, 'snappy');
    expect(getAnimPresetId()).toBe('native');
    expect(getAnimPreset().id).toBe('native');
  });

  test('脏值/任意未知 id 同样回落 native；bouncy 合法保留', () => {
    localStorage.setItem(PRESET_KEY, 'garbage-id');
    expect(getAnimPresetId()).toBe('native');
    localStorage.setItem(PRESET_KEY, 'bouncy');
    expect(getAnimPresetId()).toBe('bouncy');
    expect(isTimedEngineActive()).toBe(false);
  });

  test('setAnimPresetId 拒绝退役 id 持久化', () => {
    setAnimPresetId('snappy');
    expect(localStorage.getItem(PRESET_KEY)).toBe(null);
  });
});

describe('v8.63 #75 · ③ 曲线求解器（pathData 两段 · 与独立参考实现逐点比对）', () => {
  const samples = Array.from({ length: 21 }, (_, i) => i / 20);

  test('emphasized 与 pathData 参考实现逐点比对（误差 < 1e-3，DoD <1%）', () => {
    for (const x of samples) {
      expect(Math.abs(EMPHASIZED(x) - refSolve(EMPHASIZED_PATH, x))).toBeLessThan(1e-3);
    }
  });

  test('app_open_x 与 pathData 参考实现逐点比对（误差 < 1e-3）', () => {
    for (const x of samples) {
      expect(Math.abs(APP_OPEN_X(x) - refSolve(APP_OPEN_X_PATH, x))).toBeLessThan(1e-3);
    }
  });

  test('端点归位 + 全程单调不减（emphasized / app_open_x）', () => {
    for (const fn of [EMPHASIZED, APP_OPEN_X]) {
      expect(fn(0)).toBe(0);
      expect(fn(1)).toBe(1);
      let prev = -1;
      for (const x of samples) {
        const y = fn(x);
        expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = y;
      }
    }
  });

  test('曲线族常量与源码控制点一致（standard / emphasized_decelerate / accelerate / fosi）', () => {
    // frameworks res/interpolator 原值：standard (0.2,0)(0,1)
    expect(STANDARD(0.5)).toBeCloseTo(cubicBezier(0.2, 0, 0, 1)(0.5), 12);
    expect(EMPHASIZED_DECELERATE(0.5)).toBeCloseTo(cubicBezier(0.05, 0.7, 0.1, 1)(0.5), 12);
    expect(EMPHASIZED_ACCELERATE(0.5)).toBeCloseTo(cubicBezier(0.3, 0, 0.8, 0.15)(0.5), 12);
    expect(FAST_OUT_SLOW_IN(0.5)).toBeCloseTo(cubicBezier(0.4, 0, 0.2, 1)(0.5), 12);
    // DECELERATE_1_5：解析式 1 − (1−x)^1.5（blur/scrim 通道）
    expect(DECELERATE_1_5(0.25)).toBeCloseTo(1 - Math.pow(0.75, 1.5), 12);
    expect(DECELERATE_1_5(1)).toBe(1);
  });

  test('pathInterpolator 复现：同 pathData 两次构造结果一致（纯函数无状态）', () => {
    const again = pathInterpolator(EMPHASIZED_PATH);
    for (const x of samples) expect(again(x)).toBe(EMPHASIZED(x));
  });
});

describe('v8.63 #75 · ④ createTransitionRunner 双引擎分派 + 倍率贯穿', () => {
  test('默认（native）→ timed runner：时长原值 + 双插值器 + tiltDisabled + 现成 desc', () => {
    const r = getTransitionRunner('open');
    expect(r.kind).toBe('timed');
    expect(r.phase).toBe('open');
    expect(r.durationMs).toBe(500);
    expect(r.main).toBe(EMPHASIZED);
    expect(r.x).toBe(APP_OPEN_X);
    expect(r.tiltDisabled).toBe(true);
    expect(r.posDesc.xAxis.interpolator).toBe(APP_OPEN_X);   // mDx 走 app_open_x
    expect(r.posDesc.yAxis.interpolator).toBe(EMPHASIZED);   // mDy 走主时间轴
    expect(r.scaleDesc.interpolator).toBe(EMPHASIZED);
    const rc = getTransitionRunner('close');
    expect(rc.durationMs).toBe(250);
  });

  test('ANIM_SPEED 倍率对定时轴 = duration ÷ 倍率（插值器不变）', () => {
    setAnimSpeed(2);
    expect(getTransitionRunner('open').durationMs).toBe(250);  // 500 ÷ 2
    expect(getTransitionRunner('close').durationMs).toBe(125); // 250 ÷ 2
    setAnimSpeed(0.5);
    expect(getTransitionRunner('open').durationMs).toBe(1000);
    expect(getTransitionRunner('open').main).toBe(EMPHASIZED); // 插值器不受倍率影响
    setAnimSpeed(1);
  });

  test('bouncy → spring runner：预设弹簧参数经倍率缩放（既有语义）', () => {
    setAnimPresetId('bouncy');
    const r = getTransitionRunner('open');
    expect(r.kind).toBe('spring');
    expect(r.params).toEqual(curOpenParams());
    expect(r.params).toEqual(makeSpringParams(0.38, 0.79, 1));
    const rc = getTransitionRunner('close');
    expect(rc.params).toEqual(makeSpringParams(0.32, 0.88, 1));
  });

  test('curOpenParams/curCloseParams 兼容回落通道恒为弹簧参数（两套预设皆有）', () => {
    for (const id of ['native', 'bouncy']) {
      setAnimPresetId(id);
      expect(curOpenParams()).toHaveProperty('stiffness');
      expect(curCloseParams()).toHaveProperty('damping');
    }
  });
});

describe('v8.63 #75 · ⑤ TimedValue 定时轴 + AOSP 打断协议', () => {
  test('基础推进：满时长确定性收敛 + 端点钳制（超出 update 不越界）', () => {
    const tv = new TimedValue({ durationMs: 500, interpolator: EMPHASIZED, initialValue: 0, target: 1 });
    tv.update(0.2);   // 锚定（空闲 → 全新满时长）+ 推进 200ms
    expect(tv.x).toBeCloseTo(EMPHASIZED(0.4), 6);
    expect(tv.x).toBeGreaterThan(0);
    expect(tv.x).toBeLessThan(1);
    tv.update(0.4);   // 累计 600ms > 500ms → 收敛锁定
    expect(tv.x).toBe(1);
    expect(tv.isSettled()).toBe(true);
    tv.update(0.5);   // 继续推进不越界
    expect(tv.x).toBe(1);
  });

  test('打断协议·剩余时长接管：起点=当前值（非 0 非镜像）、时长=原时长×(1−已播分数)', () => {
    // 复现真实链路时序：open 500ms 在飞 → closeApp 注入 close 250ms desc + setTarget(0)
    const tv = new TimedValue({ durationMs: 500, interpolator: EMPHASIZED, initialValue: 0, target: 1 });
    tv.update(0.2);                       // 开到 40% 时间轴（200/500ms）
    const xAtInterrupt = tv.x;            // = EMPHASIZED(0.4)，非 0 非 1
    expect(xAtInterrupt).toBeCloseTo(EMPHASIZED(0.4), 6);
    tv.reconfigure({ durationMs: 250, interpolator: EMPHASIZED }); // startLoop(curCloseParams) 装载
    tv.setTarget(0);                      // closeApp 反向关闭
    tv.update(1e-6);                      // 锚定：打断接管
    // 剩余时长 = 250 × (1 − 0.4) = 150ms：149ms 未收敛、+5ms 后收敛
    tv.update(0.142);
    expect(tv.isSettled()).toBe(false);
    tv.update(0.01);                      // 累计 152ms ≥ 150ms 剩余时长
    expect(tv.isSettled()).toBe(true);
    expect(tv.x).toBe(0);
    // 曲线正向（非镜像）：中断锚点下 t=75ms（半程）值 = from + (to−from)·EMPHASIZED(0.5)
    const tv2 = new TimedValue({ durationMs: 500, interpolator: EMPHASIZED, initialValue: 0, target: 1 });
    tv2.update(0.2);
    const from2 = tv2.x;
    tv2.reconfigure({ durationMs: 250, interpolator: EMPHASIZED });
    tv2.setTarget(0);
    tv2.update(1e-6);
    tv2.update(0.075);                    // 150ms 的一半
    expect(tv2.x).toBeCloseTo(from2 * (1 - EMPHASIZED(0.5)), 5); // 正向曲线从 from2 收向 0
  });

  test('打断协议·速度接管：起点 = progress + velocity × 单帧时长', () => {
    const tv = new TimedValue({ durationMs: 300, interpolator: EMPHASIZED, initialValue: 0.5, target: 0.5 });
    tv.setTarget(0, -2.4);                // cvs=-2.4 进度/s（closeApp 钳制上界）
    // 速度推进：0.5 − 2.4 × (1000/60)/1000 = 0.5 − 0.04 = 0.46
    tv.update(1e-6);                      // 锚定后微推进
    expect(tv.x).toBeLessThan(0.5);
    expect(tv.x).toBeGreaterThan(0.44);   // 起点自 0.46 起（非 0 —— 速度已消费）
  });

  test('打断协议·收尾阈值：在飞进度 >0.95 直接收尾到当前目标（无拖尾无瞬移）', () => {
    const tv = new TimedValue({ durationMs: 250, interpolator: EMPHASIZED, initialValue: 1, target: 0 });
    tv.update(0.2425);                    // 关闭 97% 时间轴 → 视觉已几乎收拢
    expect(tv.x).toBeLessThan(0.02);
    tv.setTarget(1);                      // 中途反转打开
    expect(tv.x).toBe(0);                 // forceFinish：旧关闭轴立即收尾到旧目标（无拖尾）
    tv.update(1e-6);                      // 新过渡锚定：从收尾值整段开始
    expect(tv._dur).toBeCloseTo(0.25, 6); // 全新 250ms 轴（无瞬移 —— 从 p=0 平滑展开）
    expect(tv.isSettled()).toBe(false);   // 新轴在飞
    tv.update(0.25);
    expect(tv.x).toBe(1);
    expect(tv.isSettled()).toBe(true);
  });

  test('外置直写/目标改道均触发重锚（与 Spring 懒重锚同构）', () => {
    const tv = new TimedValue({ durationMs: 300, interpolator: EMPHASIZED, initialValue: 0, target: 1 });
    tv.update(0.1);
    tv.x = 0.5;                           // 外部直写（手势通道）
    tv.update(1e-6);                      // 重锚：从新 x 继续
    expect(tv.x).toBeGreaterThan(0.49);   // 自 0.5 起步
    expect(tv.target).toBe(1);
  });
});

describe('v8.63 #75 · ⑥ Timed2D 双轴独立插值器 + 引擎切换保真', () => {
  test('X 轴 app_open_x / Y 轴 emphasized 独立求解；px/py/vx/vy 同构 getters', () => {
    const d = new Timed2D({
      xAxis: { durationMs: 500, interpolator: APP_OPEN_X },
      yAxis: { durationMs: 500, interpolator: EMPHASIZED },
    }, 0, 0, 0, 0);
    d.x.target = 100;
    d.y.target = 100;
    d.update(0.25);
    expect(d.px).toBeCloseTo(100 * APP_OPEN_X(0.5), 4);
    expect(d.py).toBeCloseTo(100 * EMPHASIZED(0.5), 4);
    expect(d.px).not.toBeCloseTo(d.py, 1);  // 两曲线 0.5 处分离
    expect(Math.abs(d.vx)).toBeGreaterThan(0);
    d.update(0.25);
    d.update(0.25);                          // 累计 750ms > 500ms
    expect(d.isSettled()).toBe(true);
    expect(d.px).toBe(100);
    expect(d.py).toBe(100);
  });

  test('fromLegacy 原位接管：保 x/v/target（引擎切换零跳变前提）', () => {
    const s = { x: 0.3, v: 2, target: 1 };   // Spring 接口的最小同构桩（x/v/target 三通道）
    const tv = TimedValue.fromLegacy(s, { durationMs: 500, interpolator: EMPHASIZED });
    expect(tv.x).toBe(0.3);
    expect(tv.v).toBe(2);
    expect(tv.target).toBe(1);
    expect(tv.__timedEngine).toBe(true);
  });

  test('Timed2D.setTarget 速度双轴推进（demote 速度接力通道）', () => {
    const d = new Timed2D({
      xAxis: { durationMs: 250, interpolator: APP_OPEN_X },
      yAxis: { durationMs: 250, interpolator: EMPHASIZED },
    }, 300, 200, 0, 0);
    d.setTarget(0, 0, -600, 300);            // vx/vy px/s
    d.update(1e-6);
    // 一帧推进 + 微小时间轴前移（APP_OPEN_X 初斜率 ≈0.38 → 290−290·0.38·1.7e-5 ≈ 289.9996）
    expect(d.px).toBeCloseTo(300 - 600 * (1 / 60), 3);   // -10px 一帧推进
    expect(d.py).toBeCloseTo(200 + 300 * (1 / 60), 3);   // +5px
    expect(d.px).toBeLessThan(300);
    expect(d.py).toBeGreaterThan(200);
  });
});

describe('v8.63 #75 · ⑦⑧ 源码锚：引擎分派 / 倾斜归零 / 并行保留 / scrim 层', () => {
  test('startLoop 经 getTransitionRunner 分派引擎（含定时轴 desc 与弹簧 params 双分支）', () => {
    expect(APP_WINDOW_SRC).toContain('const runner = getTransitionRunner(phase);');
    expect(APP_WINDOW_SRC).toContain('syncMainEngineKind(true)');
    expect(APP_WINDOW_SRC).toContain('syncMainEngineKind(false)');
    expect(APP_WINDOW_SRC).toContain('state.posSpring.reconfigure(runner.posDesc)');
    expect(APP_WINDOW_SRC).toContain('state.scaleSpring.reconfigure(runner.scaleDesc)');
    expect(APP_WINDOW_SRC).toContain('state.posSpring.reconfigure(runner.params)');
  });

  test('主窗口 render：原生门控 + transform 串条件拼接（非 fx 不含 rotate/skew/matrix3d）', () => {
    expect(APP_WINDOW_SRC).toContain('const nativeDeco = isTimedEngineActive();');
    expect(APP_WINDOW_SRC).toContain('(fx ? ` rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) skewX(${skewX.toFixed(2)}deg) skewY(${skewY.toFixed(2)}deg)` : \'\')');
    expect(APP_WINDOW_SRC).toContain("(fx ? funnelM : '')");
    expect(APP_WINDOW_SRC).toContain('const shadowAlpha = nativeDeco');
  });

  test('__animPresets.apply 双语义：定时轴下次过渡生效 / 弹簧 reconfigure 零跳变', () => {
    expect(APP_WINDOW_SRC).toContain("if (getAnimPreset().kind === 'timed') return; // 定时轴热切换：下次过渡生效");
    expect(APP_WINDOW_SRC).toContain('closingActors.forEach((a) => {');
  });

  test('demote Actor 引擎随预设（timed 分支 + 速度接力 setTarget）', () => {
    expect(APP_WINDOW_SRC).toContain("const closeRunner = getTransitionRunner('close');");
    expect(APP_WINDOW_SRC).toContain('actorPosSpring = new Timed2D(closeRunner.posDesc,');
    expect(APP_WINDOW_SRC).toContain('actorScaleSpring = new TimedValue({ ...closeRunner.scaleDesc');
  });

  test('并行能力保留：radialField 恒弹簧（超越部分不裁剪）+ retargetRadialField 不变', () => {
    expect(PARALLEL_SRC).toContain('const RADIAL_PARAMS = makeSpringParams(0.34, 0.78, 1);');
    expect(PARALLEL_SRC).toContain('const RADIAL_STAGGER_MS = 130;');
    expect(PARALLEL_SRC).toContain('export function retargetRadialField(target)');
    expect(PARALLEL_SRC).toContain('export function syncRadialFieldToProgress(p)');
  });

  test('Closing Actor 渲染原生门控（fxActor 双条件 + transform 条件拼接 + 模糊归零）', () => {
    expect(PARALLEL_SRC).toContain('const fxActor = !REDUCED_MOTION && !isTimedEngineActive();');
    expect(PARALLEL_SRC).toContain("(fxActor ? funnelM : '')");
    expect(PARALLEL_SRC).toContain('const genieBlur = fxActor ? BLUR_PEAK');
  });

  test('split-screen 窗格引擎随预设（开/收双分支）+ renderPane 倾斜门控', () => {
    expect(SPLIT_SRC).toContain("const openRunner = getTransitionRunner('open');");
    expect(SPLIT_SRC).toContain("const closeRunner = getTransitionRunner('close');");
    expect(SPLIT_SRC).toContain('const fxPane = !REDUCED_MOTION && !isTimedEngineActive();');
    expect(SPLIT_SRC).toContain("(fxPane ? ` rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)` : '')");
  });

  test('#appLaunchScrim 遮罩层在册（z 538 恒在阴影层/窗口之下）+ 收尾熄灭在册', () => {
    expect(INDEX_SRC).toContain('id="appLaunchScrim"');
    expect(INDEX_SRC.indexOf('appLaunchScrim')).toBeLessThan(INDEX_SRC.indexOf('id="windowShadowLayer"'));
    expect(APP_WINDOW_SRC).toContain("cachedEl('appLaunchScrim')");
    expect(APP_WINDOW_SRC).toContain('preset.scrimDark');
    expect(APP_WINDOW_SRC).toContain('preset.scrimLight');
  });
});

// ==================== 场景：真实 DOM 链路（bootDesktop） ====================
describe('v8.63 #75 · 场景：引擎随预设切换 + 倾斜归零/恢复（真实 click 链路）', () => {
  let W;
  beforeAll(async () => {
    W = await bootDesktop();
    W.__lockTest.instantUnlock();
  });

  const iconEl = (appId) =>
    document.querySelector(`.app-icon[data-id="${appId}"]`) || document.querySelector('.app-icon');

  beforeEach(() => {
    localStorage.removeItem(PRESET_KEY); // 每场景回归默认 native
  });

  test('native 默认：开窗在飞 transform 串无 rotateX/rotateY/skew/matrix3d + 引擎为定时轴', async () => {
    const icon = iconEl('settings');
    icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await sleep(150); // 500ms 在飞中段采样
    const tf = document.getElementById('appWindow').style.transform || '';
    expect(tf).toContain('translate3d');
    expect(tf).toContain('scale(');
    expect(tf).not.toContain('rotateX');
    expect(tf).not.toContain('rotateY');
    expect(tf).not.toContain('skew');
    expect(tf).not.toContain('matrix3d');
    expect(W.__state.scaleSpring.__timedEngine).toBe(true);   // 定时轴引擎在场
    expect(W.__state.posSpring.__timedEngine).toBe(true);
    await vi.waitFor(() => { expect(W.__state.scaleSpring.isSettled()).toBe(true); }, { timeout: 3000, interval: 40 });
    // scrim 稳态熄灭
    const scrim = document.getElementById('appLaunchScrim');
    expect(scrim).toBeTruthy();
    expect(parseFloat(scrim.style.opacity || '0')).toBe(0);
  });

  test('native 关闭：250ms 确定性收拢 + 零残留', async () => {
    expect(W.__state.isOpen).toBe(true);
    const { closeApp } = await import('../ios-desktop/js/app-window.js');
    closeApp(0, 0, 0);
    await sleep(140); // 250ms 中段采样
    const tf = document.getElementById('appWindow').style.transform || '';
    expect(tf).not.toContain('rotateX');
    await vi.waitFor(() => {
      expect(W.__state.isOpen).toBe(false);
      expect(W.__state.isClosing).toBe(false);
    }, { timeout: 3000, interval: 40 });
    await sleep(120);
    expect(window.__parallelDebug().actors.length).toBe(0);
  });

  test('切回 bouncy：3D 倾斜恢复（transform 串重新含 rotateX）+ 引擎换回弹簧', async () => {
    window.__animPresets.apply('bouncy');
    expect(window.__animPresets.currentId()).toBe('bouncy');
    const icon = iconEl('calculator');
    icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await sleep(120); // 弹簧在飞中段
    const tf = document.getElementById('appWindow').style.transform || '';
    expect(tf).toContain('rotateX');       // 3D 倾斜恢复（果冻语义）
    expect(!W.__state.scaleSpring.__timedEngine).toBe(true); // 弹簧引擎在场
    await vi.waitFor(() => { expect(W.__state.scaleSpring.isSettled()).toBe(true); }, { timeout: 3000, interval: 40 });
  });

  test('两套预设互切：native 再开窗回归零倾斜 + 旧存档 snappy 迁移在真实 boot 下生效', async () => {
    // bouncy → native（模拟用户切回）
    window.__animPresets.apply('native');
    expect(window.__animPresets.currentKind()).toBe('timed');
    const icon = iconEl('notes');
    icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await sleep(120);
    const tf = document.getElementById('appWindow').style.transform || '';
    expect(tf).not.toContain('rotateX');
    expect(W.__state.scaleSpring.__timedEngine).toBe(true);
    await vi.waitFor(() => { expect(W.__state.scaleSpring.isSettled()).toBe(true); }, { timeout: 3000, interval: 40 });
    // 旧存档迁移：snappy 落盘 → 读取回落 native（不空档不报错）
    localStorage.setItem(PRESET_KEY, 'snappy');
    expect(window.__animPresets.currentId()).toBe('native');
    localStorage.removeItem(PRESET_KEY);
  });
});
