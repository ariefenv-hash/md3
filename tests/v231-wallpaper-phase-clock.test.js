// ==================== v231-wallpaper-phase-clock.test.js — #231 壁纸「重新播放/相位跳变」P0 回归 ====================
//
// 分层：A 纯逻辑核假时钟穷举（挂起冻结 / 恢复连续 / rAF 节流封顶 / 门卫四态）；
//       B 接线静态锚（两引擎消费点 + closeApp 起手信号逐字核对）；
// 真实时间渲染回归（指纹连续 / ≤80ms 恢复 / 三预设 / 三视口）见 scripts/e2e-v231-wallpaper-resume.mjs。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isWallpaperSuspended, stepPhaseClock, PHASE_TICK_MAX_STEP,
} from '../ios-desktop/js/aosp/wallpaper-phase-clock.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

describe('v10.60 · #231 A. 挂起门卫（动画进度语义）', () => {
  it('A1 四态：currentApp 且非关窗在途 = 挂起；isClosing 起手即恢复；currentApp 空 = 恢复', () => {
    expect(isWallpaperSuspended({ currentApp: { id: 'msg' }, isClosing: false })).toBe(true);
    expect(isWallpaperSuspended({ currentApp: { id: 'msg' }, isClosing: true })).toBe(false);
    expect(isWallpaperSuspended({ currentApp: null, isClosing: false })).toBe(false);
    expect(isWallpaperSuspended({ currentApp: null, isClosing: true })).toBe(false);
  });

  it('A2 防御：null/undefined 状态切片不炸（模块求值期 early-boot 安全）', () => {
    expect(isWallpaperSuspended(null)).toBe(false);
    expect(isWallpaperSuspended(undefined)).toBe(false);
    expect(isWallpaperSuspended({})).toBe(false);
  });

  it('A3 #231 决定性语义：关窗动画全程（isClosing=true 持续 452ms）不挂起', () => {
    // 旧口径 state.currentApp 恒真 → 动画全程静止；新口径动画在途 = 恢复
    const s = { currentApp: { id: 'msg' }, isClosing: true };
    for (let ms = 0; ms <= 452; ms += 16) expect(isWallpaperSuspended(s)).toBe(false);
  });
});

describe('v10.60 · #231 B. 相位时钟（暂停冻结，恢复连续）', () => {
  const FRAME = 16.7; // 60fps 单帧

  it('B1 常量：单帧增量上限 0.05s（#231 修复方案原值）', () => {
    expect(PHASE_TICK_MAX_STEP).toBe(0.05);
  });

  it('B2 播放态逐帧累加：60fps 一帧 +16.7ms', () => {
    const r = stepPhaseClock(10, 1000, 1000 + FRAME, false, false);
    expect(r.animT).toBeCloseTo(10 + FRAME / 1000, 6);
    expect(r.lastTick).toBe(1000 + FRAME);
  });

  it('B3 挂起态零累积（根因A：旧墙钟暂停期照常累积 → 相位跳变）', () => {
    let { animT, lastTick } = { animT: 10, lastTick: 1000 };
    for (let i = 0; i < 138; i++) { // 模拟挂起 2.3s（#231 实测口径）
      const r = stepPhaseClock(animT, lastTick, lastTick + FRAME, true, false);
      animT = r.animT; lastTick = r.lastTick;
    }
    expect(animT).toBe(10); // 相位纹丝不动
    expect(lastTick).toBeCloseTo(1000 + 138 * FRAME, 0); // 基准照常刷新
  });

  it('B4 恢复连续性：挂起 2.3s 后首帧相位 = 暂停末帧 + 单帧增量（≤ 正常单帧变化量）', () => {
    let animT = 5, lastTick = 1000;
    // 播放 1s
    for (let t = 1000; t < 2000; t += FRAME) {
      ({ animT, lastTick } = stepPhaseClock(animT, lastTick, t + FRAME, false, false));
    }
    const phaseAtPause = animT;
    // 挂起 2300ms（应用全屏）
    for (let t = 2000; t < 4300; t += FRAME) {
      ({ animT, lastTick } = stepPhaseClock(animT, lastTick, t + FRAME, true, false));
    }
    // 关窗起手恢复（isClosing=true → suspended=false）
    const resumed = stepPhaseClock(animT, lastTick, 4300 + FRAME, false, false);
    expect(resumed.animT - phaseAtPause).toBeLessThanOrEqual(FRAME / 1000 + 1e-9);
    // 旧墙钟口径同场景相位差 ≈ 2300ms（指纹 26958→56957 的根因）
  });

  it('B5 rAF 节流封顶：5s 巨差只推 0.05s（后台标签恢复不跳变，与暂停期同防线）', () => {
    const r = stepPhaseClock(3, 1000, 1000 + 5000, false, false);
    expect(r.animT).toBeCloseTo(3 + PHASE_TICK_MAX_STEP, 6);
  });

  it('B6 reduced-motion：静态帧语义，相位一并冻结', () => {
    const r = stepPhaseClock(7, 1000, 1000 + FRAME, false, true);
    expect(r.animT).toBe(7);
  });

  it('B7 基准期：lastTick=0（循环启动首帧）只建立基准不推进', () => {
    const r = stepPhaseClock(0, 0, 1000 + 3000, false, false); // 启动期巨差不可信
    expect(r.animT).toBe(0);
    expect(r.lastTick).toBe(1000 + 3000);
  });

  it('B8 非单调时间戳防御（lastTick ≥ now 只刷新基准）', () => {
    const r = stepPhaseClock(4, 2000, 2000, false, false);
    expect(r.animT).toBe(4);
    expect(r.lastTick).toBe(2000);
  });

  it('B9 maxStep 注入：自定义上限生效（可测性）', () => {
    const r = stepPhaseClock(0, 1000, 1000 + 1000, false, false, 0.2);
    expect(r.animT).toBeCloseTo(0.2, 6);
  });
});

describe('v10.60 · #231 C. 接线静态锚（两引擎 + 关窗起手信号）', () => {
  const proc = read('ios-desktop/js/procedural-wallpaper.js');
  const video = read('ios-desktop/js/video-wallpaper.js');
  const appwin = read('ios-desktop/js/app-window.js');

  it('C1 程序化壁纸：消费纯逻辑核 + drawFrame 由调用方传 t（墙钟读取已根除）', () => {
    expect(proc).toContain("from './aosp/wallpaper-phase-clock.js'");
    expect(proc).toContain('isWallpaperSuspended(state)');
    expect(proc).toContain('stepPhaseClock(animT, lastTick, now');
    expect(proc).toContain('function drawFrame(preset, t)');
    expect(proc).not.toContain('const t = (performance.now() - t0) / 1000;'); // 旧墙钟读取根除（头注史实提及不受锚）
    expect(proc).not.toContain('let t0 = 0;');
  });

  it('C2 程序化壁纸：apply 重置相位三件套（animT/lastTick/lastDraw）+ resize 重画传 animT', () => {
    expect(proc).toContain('animT = 0;');
    expect(proc).toContain('lastTick = 0;');
    expect(proc).toContain('drawFrame(getPreset(activeId), animT);');
    expect(proc).toContain('drawFrame(preset, animT);');
  });

  it('C3 视频壁纸：同一门卫 + 50ms 看门狗（≤80ms 验收线）', () => {
    expect(video).toContain("from './aosp/wallpaper-phase-clock.js'");
    expect(video).toContain('isWallpaperSuspended(state) || reducedMotion');
    expect(video).not.toContain('!!state.currentApp || reducedMotion'); // 旧门卫根除
    expect(video).toMatch(/,\s*50\);\s*\/\/ v10\.\d+ #231/); // 版本字面量无关（随滚版演进）
    expect(video).not.toMatch(/,\s*500\);\s*$/m); // 旧周期根除
  });

  it('C4 视频壁纸：取色采样位置存档还原（根因C：旧实现强制 currentTime=0 根除）', () => {
    expect(video).toContain('const savedTime = video.currentTime || 0;');
    expect(video).toContain('video.currentTime = savedTime;');
    expect(video).not.toContain('video.currentTime = 0;'); // 主动归零根除
  });

  it('C5 关窗起手信号在位：closeApp 同步置 isClosing=true（门卫依赖的前提，回归锚）', () => {
    // closeApp 函数体内同步段即置 isClosing（守卫/清残后立即，无 await/setTimeout 隔断）
    const fn = appwin.slice(appwin.indexOf('export function closeApp'));
    const at = fn.indexOf('state.isClosing = true;');
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(600);
    expect(fn.slice(0, at)).not.toContain('await');
    expect(fn.slice(0, at)).not.toContain('setTimeout');
  });

  it('C6 #231 注释纪律：两引擎头注均声明 isClosing 语义（#149 注释即锚）', () => {
    expect(proc).toContain('关窗动画起手');
    expect(video).toContain('isClosing 关窗起手即恢复');
  });
});
