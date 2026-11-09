// ==================== v225-launch-watchdog.test.js — #225 根壳开窗动画 P0 回归 ====================
//
// 分层：A 纯逻辑核假时钟穷举（rAF 节流 / 正常收敛 / 重入 / 幂等）；
//       B 接线静态锚（六条要求逐条落地，app-window.js 源码逐字核对）；
//       C 跨 ICU 基线修复回归（E3 已在 v160-clock-core.test.js 内）。
// 真实根壳入口 + 三视口 + rAF 节流渲染回归见 scripts/e2e-v225-launch-watchdog.mjs。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createLaunchWatchdog, resolveLaunchAction,
  LAUNCH_WATCHDOG_MS, LAUNCH_SCREEN_RELEASE_MS,
} from '../ios-desktop/js/aosp/launch-watchdog.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

/** 确定性假时钟：定时器按到期时刻排序推进，零真实等待 */
function fakeClock() {
  let t = 0; let seq = 0; const jobs = new Map();
  return {
    now: () => t,
    schedule(fn, ms) { const id = ++seq; jobs.set(id, { at: t + ms, fn }); return id; },
    cancel(id) { jobs.delete(id); },
    pending: () => jobs.size,
    tick(ms) {
      const end = t + ms;
      for (;;) {
        let pick = null;
        for (const [id, j] of jobs) {
          if (j.at <= end && (!pick || j.at < pick.at || (j.at === pick.at && id < pick.id))) {
            pick = { id, j, at: j.at };
          }
        }
        if (!pick) break;
        jobs.delete(pick.id);
        t = pick.at;
        pick.j.fn();
      }
      t = end;
    },
  };
}

function make(overrides = {}) {
  const clk = fakeClock();
  const released = []; const forced = [];
  const wd = createLaunchWatchdog({
    schedule: clk.schedule, cancel: clk.cancel, now: clk.now,
    onRelease: (i) => released.push(i), onForceFinish: (i) => forced.push(i),
    ...overrides,
  });
  return { clk, released, forced, wd };
}

describe('v10.89 · #225 A. 看门狗纯逻辑核（rAF 无关的 setTimeout 兜底）', () => {
  it('A1 resolveLaunchAction 四态：正常收敛/已强制恒 none，未收敛超时才 force', () => {
    expect(resolveLaunchAction({ elapsedMs: 0 })).toBe('wait');
    expect(resolveLaunchAction({ elapsedMs: 1999 })).toBe('wait');
    expect(resolveLaunchAction({ elapsedMs: 2000 })).toBe('force-finish');
    expect(resolveLaunchAction({ elapsedMs: 9999, settled: true })).toBe('none');
    expect(resolveLaunchAction({ elapsedMs: 9999, forced: true })).toBe('none');
    expect(resolveLaunchAction({ elapsedMs: 500, watchdogMs: 400 })).toBe('force-finish');
  });

  it('A2 常量落在 #225 建议 1500~2500ms 区间，且启动画面释放早于强制收敛', () => {
    expect(LAUNCH_WATCHDOG_MS).toBeGreaterThanOrEqual(1500);
    expect(LAUNCH_WATCHDOG_MS).toBeLessThanOrEqual(2500);
    expect(LAUNCH_SCREEN_RELEASE_MS).toBeLessThan(LAUNCH_WATCHDOG_MS);
  });

  it('A3 arm 后两个独立定时器在册（release / force 分离，不共用 rAF）', () => {
    const { clk, wd } = make();
    expect(wd.isArmed()).toBe(false);
    expect(wd.arm()).toBe(1);
    expect(wd.isArmed()).toBe(true);
    expect(clk.pending()).toBe(2);
  });

  it('A4 启动画面独立释放：520ms 先隐藏，强制收敛未触发（内容可见性不依赖弹簧）', () => {
    const { clk, released, forced, wd } = make();
    wd.arm();
    clk.tick(LAUNCH_SCREEN_RELEASE_MS - 1);
    expect(released).toHaveLength(0);
    clk.tick(1);
    expect(released).toHaveLength(1);
    expect(released[0].reason).toBe('launch-screen-timeout');
    expect(forced).toHaveLength(0);
    expect(clk.pending()).toBe(1);
  });

  it('A5 rAF 节流模拟：弹簧永不收敛 → 到期强制 finishAnim（解锁+终值+隐藏一次落地）', () => {
    const { clk, released, forced, wd } = make();
    wd.arm();
    clk.tick(LAUNCH_WATCHDOG_MS);
    expect(released).toHaveLength(1);
    expect(forced).toHaveLength(1);
    expect(forced[0].reason).toBe('watchdog');
    expect(forced[0].elapsedMs).toBeGreaterThanOrEqual(LAUNCH_WATCHDOG_MS);
    expect(wd.state().forced).toBe(true);
    expect(clk.pending()).toBe(0);
  });

  it('A6 正常收敛 settle 后看门狗静默：远超超时也不误触发（兜底只兜异常）', () => {
    const { clk, released, forced, wd } = make();
    wd.arm();
    wd.settle();
    expect(clk.pending()).toBe(0);
    clk.tick(LAUNCH_WATCHDOG_MS * 5);
    expect(released).toHaveLength(0);
    expect(forced).toHaveLength(0);
    expect(wd.state().settled).toBe(true);
  });

  it('A7 重新 arm 取消旧定时器（快速连点不重复强制收敛）', () => {
    const { clk, forced, wd } = make();
    wd.arm();
    clk.tick(LAUNCH_WATCHDOG_MS - 1);
    expect(wd.arm()).toBe(2); // 新代次起算
    expect(clk.pending()).toBe(2);
    clk.tick(LAUNCH_WATCHDOG_MS);
    expect(forced).toHaveLength(1);
    expect(forced[0].gen).toBe(2);
  });

  it('A8 force() 幂等：重复注入只触发一次', () => {
    const { forced, wd } = make();
    wd.arm();
    wd.force(); wd.force(); wd.force();
    expect(forced).toHaveLength(1);
    expect(forced[0].reason).toBe('manual');
    expect(wd.force().noop).toBe(true);
  });

  it('A9 缺少定时器注入直接抛错（防接线退化成无兜底）', () => {
    expect(() => createLaunchWatchdog({})).toThrow(TypeError);
  });
});

describe('v10.89 · #225 B. 六条要求接线静态锚（app-window.js 逐字核对）', () => {
  const src = read('ios-desktop/js/app-window.js');
  const core = read('ios-desktop/js/aosp/launch-watchdog.js');

  it('① finishAnim watchdog 超时兜底 + loopGen 旧帧早退守卫', () => {
    expect(src).toContain("import { createLaunchWatchdog } from './aosp/launch-watchdog.js'");
    expect(src).toContain('launchWatchdog.arm()');
    expect(src).toContain('if (state.launchLoopGen !== loopGen) return;');
    expect(src).toContain('function forceFinishAnim(info)');
    expect(src).toContain('finishAnim();\n  } finally {');
  });

  it('② appLaunchScreen 与动画解耦：render 跳过回写 + iframe load 捕获 + 独立短超时', () => {
    expect(src).toContain('if (!state.launchScreenReleased) dom.appLaunchScreen.style.opacity = launchOp.toFixed(3);');
    expect(src).toContain("document.addEventListener('load', launchLoadHandler, true)");
    expect(src).toContain("onRelease: () => releaseLaunchScreen('launch-screen-timeout')");
    expect(core).toContain('export const LAUNCH_SCREEN_RELEASE_MS');
  });

  it('③ 冻结锁 finally 兜底：finishAnim 抛错也必解锁', () => {
    expect(src).toContain('try { setAnimFreezeLock(false); } catch (e) {}');
    expect(src.indexOf('} finally {')).toBeLessThan(src.indexOf('try { setAnimFreezeLock(false); } catch (e) {}\n    disarmIframeLoadRelease();'));
  });

  it('④ 窗口终值稳态：弹簧吸附 + 正常收敛仍走原 finishAnim 打开分支', () => {
    expect(src).toContain('function snapSpringsToTarget()');
    expect(src).toContain("dom.appWindow.style.transform = ''");
    expect(src).toContain('launchWatchdog.settle(); // #225 正常收敛');
  });

  it('⑤ 每次开窗/关闭复位释放标记 + 观测面（e2e 可注入强制收敛）', () => {
    expect(src).toContain('state.launchScreenReleased = false; // #225 每次开窗复位启动画面释放标记');
    expect(src).toContain('state.launchScreenReleased = false; // #225 关闭复位（下次开窗重新计时）');
    expect(src).toContain('window.__forceLaunchSettle');
    expect(src).toContain('window.__launchWatchdog');
  });

  it('⑥ 纯核零 DOM 零 import（可穷举单测，不被浏览器环境绑死）', () => {
    expect(core).not.toMatch(/^\s*(import|require)\s/m);
    expect(core).not.toContain('document.');
    expect(core).not.toContain('requestAnimationFrame');
  });
});
