// ==================== v146-fling-back-r53.test.js — v9.36 预测性返回四期：fling 滑行（#146） ====================
//
// 权威快照（docs/reference/）：
//   - SystemUI/animation/back/FlingOnBackAnimationCallback.kt（168 行，R53 实拉在库）
//   - dynamic-animation/FlingAnimation.java（204 行）+ DynamicAnimation.java（帧骨架）
//
// 断言分组：
//   A. AOSP 快照在册（kt 168 行 / FlingAnimation 204 行 / DynamicAnimation 帧骨架关键行）
//   B. DragForce 纯函数真跑（摩擦标量换算 / 闭式指数解数值锚 / 平衡阈值 / 加速度）
//   C. FlingAnimation 帧骨架真跑（throw 守卫 / 首帧不积分 / 积分推进 / max clamp 结束 /
//      速度阈值结束 / end listener 派发 / cancel）
//   D. FlingOnBackAnimationCallback 真跑（默认 BACK_GESTURE 插值 / LINEAR 注入 / started 时序 /
//      progressed 喂点×100 / invoke 起 fling 动画滑行+结束 invoke / 空事件直调 / cancel /
//      防重入 / reset 摘 listener）
//   E. gestures.js 消费端接线静态锚（import / LINEAR 裁决 / commit fling 化 / cancel 接线 /
//      滑行期挡板 / 幂等门 / tracker 适配）
//   F. 版本真源 9.36.0

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  FLING_FRICTION,
  SCALE_FACTOR,
  MIN_VISIBLE_CHANGE_PIXELS,
  DragForce,
  FlingAnimation,
  FlingOnBackAnimationCallback,
} from '../ios-desktop/js/aosp/fling-back-callback.js';
import { BACK_GESTURE, LINEAR } from '../ios-desktop/js/aosp/back-animation.js';
import { ProgressVelocityTracker } from '../ios-desktop/js/back-pill.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const fbcSrc = () => readFileSync(join(repoRoot, 'ios-desktop/js/aosp/fling-back-callback.js'), 'utf-8');

describe('v9.36 · A. AOSP 快照在册', () => {
  it('A1 FlingOnBackAnimationCallback.kt 168 行快照 + 常量与关键行逐字', () => {
    const src = readFileSync(join(repoRoot, 'docs/reference/frameworks-base/SystemUI/animation/back/FlingOnBackAnimationCallback.kt'), 'utf-8');
    expect(src.trimEnd().split('\n').length).toBe(168);
    expect(src).toContain('private const val FLING_FRICTION = 6f');
    expect(src).toContain('private const val SCALE_FACTOR = 100f');
    expect(src).toContain('abstract class FlingOnBackAnimationCallback');
    expect(src).toContain('progressInterpolator: Interpolator = Interpolators.BACK_GESTURE');
    expect(src).toContain('velocityTracker.computeCurrentVelocity(1000)');
    expect(src).toContain('.setFriction(FLING_FRICTION)');
    expect(src).toContain('// do an animation-frame immediately to prevent idle frame');
    expect(src).toContain('progress / SCALE_FACTOR');
  });

  it('A2 FlingAnimation.java 快照：DragForce 摩擦模型逐字', () => {
    const src = readFileSync(join(repoRoot, 'docs/reference/frameworks-base/dynamic-animation/FlingAnimation.java'), 'utf-8');
    expect(src).toContain('private static final float DEFAULT_FRICTION = -4.2f;');
    expect(src).toContain('private static final float VELOCITY_THRESHOLD_MULTIPLIER = 1000f / 16f;');
    expect(src).toContain('mFriction = frictionScalar * DEFAULT_FRICTION;');
    expect(src).toContain('velocity * Math.exp((deltaT / 1000f) * mFriction)');
    expect(src).toContain('value - velocity / mFriction');
    expect(src).toContain('return Math.abs(velocity) < mVelocityThreshold;');
  });

  it('A3 DynamicAnimation.java 快照：首帧不积分 + MIN_VISIBLE_CHANGE_PIXELS', () => {
    const src = readFileSync(join(repoRoot, 'docs/reference/frameworks-base/dynamic-animation/DynamicAnimation.java'), 'utf-8');
    expect(src).toContain('public static final float MIN_VISIBLE_CHANGE_PIXELS = 1f;');
    expect(src).toContain('if (mLastFrameTime == 0)');
    expect(src).toContain('long deltaT = frameTime - mLastFrameTime;');
    expect(src).toContain('boolean finished = updateValueAndVelocity(deltaT);');
    expect(src).toContain('mVelocity = startVelocity;');
  });
});

describe('v9.36 · B. DragForce 纯函数真跑', () => {
  it('B1 常量组逐字：FLING_FRICTION=6 / SCALE_FACTOR=100 / MIN_VISIBLE_CHANGE_PIXELS=1', () => {
    expect(FLING_FRICTION).toBe(6);
    expect(SCALE_FACTOR).toBe(100);
    expect(MIN_VISIBLE_CHANGE_PIXELS).toBe(1);
  });

  it('B2 摩擦标量换算：setFrictionScalar(6) → mFriction = 6×(-4.2) = -25.2', () => {
    const f = new DragForce();
    expect(f.mFriction).toBe(-4.2); // DEFAULT_FRICTION
    f.setFrictionScalar(6);
    expect(f.mFriction).toBeCloseTo(-25.2, 10);
    expect(f.getFrictionScalar()).toBeCloseTo(6, 10);
  });

  it('B3 闭式指数解数值锚：(50,100,16ms) → (51.316752, 66.817845)', () => {
    const f = new DragForce();
    f.setFrictionScalar(6);
    const st = f.updateValueAndVelocity(50, 100, 16);
    expect(st.mValue).toBeCloseTo(51.316752, 4);
    expect(st.mVelocity).toBeCloseTo(66.817845, 4);
  });

  it('B4 数值锚二：(20,500,32ms) → (30.982888, 223.231221)', () => {
    const f = new DragForce();
    f.setFrictionScalar(6);
    const st = f.updateValueAndVelocity(20, 500, 32);
    expect(st.mValue).toBeCloseTo(30.982888, 4);
    expect(st.mVelocity).toBeCloseTo(223.231221, 4);
  });

  it('B5 平衡阈值：setValueThreshold(MIN_VISIBLE_CHANGE_PIXELS) → |v| < 62.5 判平衡 + 命中置 0', () => {
    const f = new DragForce();
    f.setFrictionScalar(6);
    f.setValueThreshold(MIN_VISIBLE_CHANGE_PIXELS);
    expect(f.mVelocityThreshold).toBeCloseTo(62.5, 10);
    expect(f.isAtEquilibrium(0, 62.5)).toBe(false);
    expect(f.isAtEquilibrium(0, 62.49)).toBe(true);
    // updateValueAndVelocity 命中平衡 → 速度置 0（L185-187 逐字）
    const st = f.updateValueAndVelocity(10, 60, 0);
    expect(st.mVelocity).toBe(0);
  });

  it('B6 getAcceleration = velocity × mFriction（L191-193 逐字）', () => {
    const f = new DragForce();
    f.setFrictionScalar(6);
    expect(f.getAcceleration(0, 100)).toBeCloseTo(-2520, 6);
  });
});

describe('v9.36 · C. FlingAnimation 帧骨架真跑', () => {
  it('C1 setFriction 非正 throw（FlingAnimation.java L67-69 同语义）', () => {
    const a = new FlingAnimation({ scheduleFrame: () => {} });
    expect(() => a.setFriction(0)).toThrow('Friction must be positive');
    expect(() => a.setFriction(-1)).toThrow('Friction must be positive');
  });

  it('C2 start 起始值域 sanity throw（DynamicAnimation L644-652 同语义）', () => {
    const a = new FlingAnimation({ scheduleFrame: () => {} });
    a.setStartValue(101).setMinValue(0).setMaxValue(100);
    expect(() => a.start()).toThrow('Starting value need to be in between min value and max value');
  });

  it('C3 首帧只记录时间+应用当前值不积分（DynamicAnimation L672-676 逐字语义）', () => {
    let scheduled = 0;
    const a = new FlingAnimation({ scheduleFrame: () => { scheduled++; } });
    const seen = [];
    a.addUpdateListener((_anim, v) => seen.push(v));
    a.setStartValue(30).setFriction(6).setStartVelocity(200).setMinValue(0).setMaxValue(100);
    a.start();
    const finished = a.doAnimationFrameSync(1000);
    expect(finished).toBe(false);
    expect(a.mLastFrameTime).toBe(1000);
    expect(seen).toEqual([30]); // 只应用起始值，未积分
    a.endAnimationInternal(false); // 清理
  });

  it('C4 积分帧推进 + max clamp=100 结束 + end listener 派发', () => {
    const a = new FlingAnimation({ scheduleFrame: () => {} });
    const ends = [];
    a.addEndListener((_anim, canceled, value) => ends.push({ canceled, value }));
    a.setStartValue(90).setFriction(6).setStartVelocity(3000).setMinValue(0).setMaxValue(100);
    a.start();
    a.doAnimationFrameSync(1000); // 首帧
    const finished = a.doAnimationFrameSync(1016); // 积分帧：velocity 3000 高速 → 值越 100
    expect(finished).toBe(true);
    expect(a.mValue).toBe(100); // clamp 逐字（L142-144）
    expect(ends.length).toBe(1);
    expect(ends[0].canceled).toBe(false);
    expect(ends[0].value).toBe(100);
    expect(a.isRunning()).toBe(false);
  });

  it('C5 速度阈值结束：低速起滑 → 平衡即止（DragForce isAtEquilibrium 消费位）', () => {
    const a = new FlingAnimation({ scheduleFrame: () => {} });
    let endCalls = 0;
    a.addEndListener(() => endCalls++);
    a.setStartValue(30).setFriction(6).setStartVelocity(10).setMinValue(0).setMaxValue(100);
    a.start();
    a.doAnimationFrameSync(1000);
    const finished = a.doAnimationFrameSync(1016);
    expect(finished).toBe(true); // |v| < 62.5 → 第一积分帧即平衡
    expect(endCalls).toBe(1);
  });

  it('C6 cancel 派发 canceled=true（DynamicAnimation L626-630 语义）', () => {
    const a = new FlingAnimation({ scheduleFrame: () => {} });
    const ends = [];
    a.addEndListener((_anim, canceled) => ends.push(canceled));
    a.setStartValue(10).setFriction(6).setStartVelocity(500).setMinValue(0).setMaxValue(100);
    a.start();
    a.cancel();
    expect(ends).toEqual([true]);
    expect(a.isRunning()).toBe(false);
    a.cancel(); // 二次 cancel no-op（running 守卫）
    expect(ends.length).toBe(1);
  });

  it('C7 removeUpdateListener/removeEndListener 生效（reset L162-163 消费位）', () => {
    const a = new FlingAnimation({ scheduleFrame: () => {} });
    let calls = 0;
    const fn = () => calls++;
    a.addUpdateListener(fn);
    a.removeUpdateListener(fn);
    const endFn = () => calls++;
    a.addEndListener(endFn);
    a.removeEndListener(endFn);
    a.setStartValue(0).setFriction(6).setStartVelocity(5000).setMinValue(0).setMaxValue(100);
    a.start();
    a.doAnimationFrameSync(1000);
    a.doAnimationFrameSync(1016);
    expect(calls).toBe(0);
  });
});

describe('v9.36 · D. FlingOnBackAnimationCallback 真跑', () => {
  /** 构造带记录的回调实例 */
  function make(over = {}) {
    const rec = { started: [], progressed: [], invoked: 0, cancelled: 0 };
    const cb = new FlingOnBackAnimationCallback({
      onBackStartedCompat: (e) => rec.started.push(e),
      onBackProgressedCompat: (e) => rec.progressed.push(e),
      onBackInvokedCompat: () => { rec.invoked++; },
      onBackCancelledCompat: () => { rec.cancelled++; },
      ...over,
    });
    return { cb, rec };
  }
  const ev = (progress, frameTimeMillis = 1000) => ({
    touchX: 10, touchY: 20, progress, swipeEdge: 'EDGE_LEFT', frameTimeMillis,
  });

  it('D1 默认插值器 BACK_GESTURE：progress 0.5 → ≈0.8949（kt L46 默认值语义）', () => {
    const { cb, rec } = make();
    expect(BACK_GESTURE(0.5)).toBeCloseTo(0.8949, 2); // 双源锚（v9.21 离线采样）
    cb.onBackProgressed(ev(0.5));
    expect(rec.progressed[0].progress).toBeCloseTo(0.8949, 2);
  });

  it('D2 LINEAR 注入恒等透传（md3 接线裁决①）', () => {
    const { cb, rec } = make({ progressInterpolator: LINEAR });
    cb.onBackProgressed(ev(0.4));
    expect(rec.progressed[0].progress).toBe(0.4);
  });

  it('D3 onBackStarted：downTime 初始化（L90）+ compat 透传 + reset 先行', () => {
    const { cb, rec } = make();
    cb.onBackProgressed(ev(0.2));
    cb.onBackStarted(ev(0, 900));
    expect(cb.downTime).toBe(900);
    expect(rec.started.length).toBe(1);
    expect(cb.lastBackEvent).toBeNull(); // reset 已清
  });

  it('D4 onBackProgressed：tracker 喂点 x=progress×100（L104）+ lastBackEvent 更新', () => {
    const fed = [];
    const tracker = {
      addMovement(downTime, eventTime, x, y) { fed.push({ downTime, eventTime, x, y }); },
      computeCurrentVelocity() {}, getXVelocity() { return 0; }, clear() {},
    };
    const { cb, rec } = make({ progressInterpolator: LINEAR, velocityTracker: tracker });
    cb.onBackStarted(ev(0, 900));
    cb.onBackProgressed(ev(0.4, 1000));
    expect(fed.length).toBe(1);
    expect(fed[0].downTime).toBe(900);
    expect(fed[0].eventTime).toBe(1000);
    expect(fed[0].x).toBeCloseTo(40, 10); // 0.4 × 100
    expect(fed[0].y).toBe(0);
    expect(cb.lastBackEvent.progress).toBe(0.4);
    expect(rec.progressed.length).toBe(1);
  });

  it('D5 onBackInvoked：fling 动画启动 → 滑行发 progressed → 结束 invoke（kt L130-153 全链）', () => {
    // 真实速度通道：ProgressVelocityTracker + VelocityTracker 适配（与 gestures.js 生产接线同形）
    const impl = new ProgressVelocityTracker();
    const { cb, rec } = make({
      progressInterpolator: LINEAR,
      velocityTracker: {
        addMovement: (_dt, t, x) => impl.addPosition(t, x),
        computeCurrentVelocity: () => {},
        getXVelocity: () => impl.calculateVelocity(),
        clear: () => impl.resetTracking(),
      },
    });
    cb.onBackStarted(ev(0, 900));
    cb.onBackProgressed(ev(0.3, 950));
    cb.onBackProgressed(ev(0.4, 990)); // 速度 = (40-30)/(40ms) = 250 (×100 域)
    cb.onBackInvoked();
    expect(cb.backInvokedFlingAnim).not.toBeNull();
    expect(cb.backInvokedFlingAnim.mValue).toBeCloseTo(40, 6); // startValue = 0.4×100
    expect(cb.backInvokedFlingAnim.mVelocity).toBeCloseTo(250, 6); // tracker xVelocity 同域
    const anim = cb.backInvokedFlingAnim;
    // 滑行帧：手动推进（FlingAnimation rAF 由测试同步驱动等价——直接 doAnimationFrameSync）
    anim.doAnimationFrameSync(1016);
    const progressedBefore = rec.progressed.length;
    expect(rec.progressed[progressedBefore - 1].progress).toBeGreaterThan(0.4); // 滑行推进
    // 推进到结束（高速 250 → 数帧内到 max=100）
    let guard = 0;
    while (cb.backInvokedFlingAnim && guard++ < 200) {
      const a = cb.backInvokedFlingAnim;
      a.doAnimationFrameSync(1016 + guard * 16);
    }
    expect(rec.invoked).toBe(1); // end → onBackInvokedCompat
    expect(cb.lastBackEvent).toBeNull(); // reset 已清
  });

  it('D6 onBackInvoked 空事件（lastBackEvent=null）→ 直调 compat + reset（kt L149-151 else）', () => {
    const { cb, rec } = make();
    cb.onBackInvoked();
    expect(rec.invoked).toBe(1);
    expect(cb.backInvokedFlingAnim).toBeNull();
  });

  it('D7 onBackCancelled：compat + reset（L155-158 逐字）', () => {
    const { cb, rec } = make({ progressInterpolator: LINEAR });
    cb.onBackStarted(ev(0, 900));
    cb.onBackProgressed(ev(0.3, 950));
    cb.onBackCancelled();
    expect(rec.cancelled).toBe(1);
    expect(cb.lastBackEvent).toBeNull();
    expect(cb.downTime).toBeNull();
  });

  it('D8 防重入：fling 活着时 onBackStarted → 兜底 invoke（kt L83-87 注释语义）', () => {
    const { cb, rec } = make({ progressInterpolator: LINEAR });
    cb.onBackStarted(ev(0, 900));
    cb.onBackProgressed(ev(0.3, 950));
    cb.onBackInvoked(); // fling 启动
    const invokedAfterFling = rec.invoked;
    cb.onBackStarted(ev(0, 2000)); // 防重入
    expect(rec.invoked).toBe(invokedAfterFling + 1);
    expect(cb.backInvokedFlingAnim).toBeNull(); // reset 已清
  });

  it('D9 reset 摘 listener：reset 后动画 end 不再触发 compat（kt L162-163 语义）', () => {
    const { cb, rec } = make({ progressInterpolator: LINEAR });
    cb.onBackStarted(ev(0, 900));
    cb.onBackProgressed(ev(0.3, 950));
    cb.onBackInvoked();
    const anim = cb.backInvokedFlingAnim;
    cb.reset(); // 摘 listener（不 cancel 动画——kt 逐字语义）
    const invokedBefore = rec.invoked;
    let guard = 0;
    while (anim.isRunning() && guard++ < 300) anim.doAnimationFrameSync(1020 + guard * 16);
    expect(rec.invoked).toBe(invokedBefore); // end 回调被摘，不再 invoke
  });

  it('D10 时间戳 flag 关闭路径：无 frameTimeMillis、不喂 tracker、invoke 直调（kt else 分支）', () => {
    const fed = [];
    const tracker = {
      addMovement() { fed.push(1); }, computeCurrentVelocity() {}, getXVelocity() { return 0; }, clear() {},
    };
    const { cb, rec } = make({ progressInterpolator: LINEAR, velocityTracker: tracker, predictiveBackTimestampApi: false });
    cb.onBackStarted({ touchX: 1, touchY: 2, progress: 0, swipeEdge: 'EDGE_LEFT' });
    expect(cb.downTime).toBeNull(); // L89 flag 判空
    cb.onBackProgressed({ touchX: 1, touchY: 2, progress: 0.5, swipeEdge: 'EDGE_LEFT' });
    expect(fed.length).toBe(0); // 不喂 tracker
    expect(cb.lastBackEvent.frameTimeMillis).toBeUndefined();
    cb.onBackInvoked();
    expect(rec.invoked).toBe(1); // else 分支直调
  });
});

describe('v9.36 · E. gestures.js 消费端接线静态锚', () => {
  const gs = readFileSync(join(repoRoot, 'ios-desktop/js/gestures.js'), 'utf-8');
  const fbc = fbcSrc();

  it('E1 import 接线：FlingOnBackAnimationCallback + LINEAR（fling-back-callback.js）', () => {
    expect(gs).toContain("import { FlingOnBackAnimationCallback, LINEAR } from './aosp/fling-back-callback.js'");
    expect(gs).toContain("import { backPill, ProgressVelocityTracker } from './back-pill.js'");
  });

  it('E2 LINEAR 防双插值裁决在录 + fling 单例构造', () => {
    expect(gs).toContain('progressInterpolator: LINEAR');
    expect(gs).toContain('new FlingOnBackAnimationCallback({');
    expect(fbc).toContain('md3 接线传 LINEAR 防双插值');
  });

  it('E3 拖拽期喂点：onBackStarted 时序补全 + onBackProgressed（frameTimeMillis 域）', () => {
    expect(gs).toContain('flingBack.onBackStarted({');
    expect(gs).toContain('flingBack.onBackProgressed({');
    expect(gs).toContain('frameTimeMillis: performance.now()');
  });

  it('E4 commit 分支 fling 化：onBackInvoked 接管，closeApp 移入 onBackInvokedCompat', () => {
    expect(gs).toContain('flingBack.onBackInvoked();');
    expect(gs).toContain('flingBackFlingActive = true;');
    expect(gs).toContain('flingBackClosed = false; // 幂等门重置');
  });

  it('E5 cancel 分支接线：flingBack.onBackCancelled()（kt onBackCancelled 同构）', () => {
    expect(gs).toContain('flingBack.onBackCancelled();');
  });

  it('E6 滑行期手势挡板 + compat 双期分工（拖拽期 no-op 防双写）', () => {
    expect(gs).toContain('if (flingBackFlingActive) return;');
    expect(gs).toContain('if (!flingBack.backInvokedFlingAnim) return;');
  });

  it('E7 closeApp 幂等门 + VelocityTracker 适配（addMovement→addPosition / getXVelocity→calculateVelocity）', () => {
    expect(gs).toContain('if (flingBackClosed) return;');
    expect(gs).toContain('this._impl.addPosition(eventTime, x)');
    expect(gs).toContain('return this._impl.calculateVelocity()');
  });

  it('E8 fling-back-callback.js 导出面完整（FLING_FRICTION/SCALE_FACTOR/DragForce/FlingAnimation/Callback）', () => {
    expect(fbc).toContain('export const FLING_FRICTION = 6;');
    expect(fbc).toContain('export const SCALE_FACTOR = 100;');
    expect(fbc).toContain('export class DragForce {');
    expect(fbc).toContain('export class FlingAnimation {');
    expect(fbc).toContain('export class FlingOnBackAnimationCallback {');
  });
});

describe('v9.36 · F. 版本真源', () => {
  it('F1 package.json version = 9.36.0', () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf-8'));
    expect(pkg.version).toBe('9.49.0');
  });

  it('F2 README 版本块 sync', () => {
    const readme = readFileSync(join(repoRoot, 'README.md'), 'utf-8');
    expect(readme).toContain('当前版本 v9.49');
  });

  it('F3 fling-back-callback.js 头注挂权威源路径', () => {
    const fbc = fbcSrc();
    expect(fbc).toContain('SystemUI/animation/back/FlingOnBackAnimationCallback.kt');
    expect(fbc).toContain('dynamic-animation');
    expect(fbc).toContain('FlingAnimation.java');
    expect(fbc).toContain('DynamicAnimation.java');
  });
});
