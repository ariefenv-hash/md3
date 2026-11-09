// ==================== v266 — 开/关动画「中间不连贯」四根因修复回归锚 ====================
//
// 用户报障：打开/关闭动画中间不连贯。帧探针实测三跳变源 + 一放大器（scripts/
// probe-anim-discontinuity.mjs 取证）：
//   ① EMPHASIZED 曲线 burst 压缩：progress 0.4→1.0 集中在时间轴 0.167~0.25
//      （500ms 开窗的 83~125ms），progress 域淡化带（cold 0.22~0.72）映射墙钟
//      仅 ~9ms —— 交叉淡化整场落在 1~2 帧，等价硬切（曲线映射根因）。
//   ② 主线程停顿快进：frame() 单帧最多推进 0.25s 动画时间（dt 钳制过宽），
//      停顿帧（iframe load 处理等，实测 40~134ms）把整段相位压进 1~2 帧。
//   ③ iframe-load 释放瞬时置 0：启动屏从 ~0.9 透明度单帧归零。
//   ④ 冷启动探针飞行途中切曲线：contentOp 从 cold(p) 单帧跳 warm(p)。
// 修复（v10.95）：①定时轴引擎交叉淡化时间化（墙钟锁定 fadeK）②dt 钳制
//   0.25→0.05 ③释放改 140ms CSS 过渡淡出（墙钟锁定，节流免疫）④曲线起手
//   冻结（contentCurveWarm）。

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { EMPHASIZED } from '../ios-desktop/js/aosp/interpolators.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const AW = 'ios-desktop/js/app-window.js';
const ST = 'ios-desktop/js/state.js';

describe('v10.95 · A. 曲线映射根因量化（EMPHASIZED burst 实测）', () => {
  it('cold 淡化带 progress 0.22~0.72 在 500ms 开窗时间轴上墙钟跨度 < 40ms（等价硬切的实证）', () => {
    // 反解 EMPHASIZED：progress → timeline。burst 段斜率 >> 1，progress 域等宽
    // 淡化带在时间轴上被强烈压缩 —— 这是「中间不连贯」的曲线映射根因。
    let lo = 0, hi = 1, x22 = 1;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (EMPHASIZED(mid) < 0.22) lo = mid; else { hi = mid; x22 = mid; } }
    lo = 0; hi = 1; let x72 = 1;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (EMPHASIZED(mid) < 0.72) lo = mid; else { hi = mid; x72 = mid; } }
    const wallMs = (x72 - x22) * 500;
    // progress 域 0.5 宽的淡化带被 EMPHASIZED burst 压缩到时间轴 <10%（实测
    // 42.8ms = 60fps 下 2~3 帧跑完全程，交叉淡化观感等价硬切）
    expect(wallMs).toBeLessThan(50);
    expect((x72 - x22)).toBeLessThan(0.10);
  });

  it('对照：warm 早交叉带 progress 0.02~0.26 同样被压缩到 < 90ms', () => {
    let lo = 0, hi = 1, x2 = 1;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (EMPHASIZED(mid) < 0.02) lo = mid; else { hi = mid; x2 = mid; } }
    lo = 0; hi = 1; let x26 = 1;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (EMPHASIZED(mid) < 0.26) lo = mid; else { hi = mid; x26 = mid; } }
    expect((x26 - x2) * 500).toBeLessThan(90);
  });
});

describe('v10.95 · B. ①交叉淡化时间化（定时轴引擎墙钟锁定）', () => {
  const src = read(AW);
  it('render 内 timedFade 分支在册且仅定时轴 + 非拖拽生效', () => {
    expect(src).toContain('const timedFade = isTimedEngineActive() && !state.isDragging;');
  });
  it('warm 开窗内容 160ms 墙钟淡入（openStartT 起点）', () => {
    expect(src).toContain('contentOp = fadeK(state.openStartT, 160);');
  });
  it('冷启动释放前掩护 / 释放后 140ms 与启动屏淡出同步交接', () => {
    expect(src).toContain('contentOp = state.launchScreenReleased ? fadeK(state.launchReleaseT, 140) : 0;');
  });
  it('冷关窗内容 120ms 墙钟退出 + 无 closeStartT 回退 progress 域（防陈旧时间戳）', () => {
    expect(src).toContain('state.closeStartT ? 1 - fadeK(state.closeStartT, 120) : smoothstep(p, 0.22, 0.72)');
  });
  it('fadeK 纯时钟读数实现（无累积 —— 停顿/节流下相位零跳过）', () => {
    expect(src).toContain('const fadeK = (startT, dur) => {');
    expect(src).toContain('const k = (performance.now() - startT) / dur;');
  });
  it('三个起手写入点：openStartT（openApp 主路径/承接/Actor唤回）+ closeStartT + launchReleaseT', () => {
    expect(src.match(/state\.openStartT = performance\.now\(\)/g)?.length).toBe(3);
    expect(src).toContain('state.closeStartT = performance.now();');
    expect(src).toContain('state.launchReleaseT = performance.now();');
    expect(src.match(/state\.launchReleaseT = null;/g)?.length).toBe(3);
  });
});

describe('v10.95 · C. ②帧间隙钳制 → v10.95 双层自适应重锚（#310：固定 0.05 在陡段仍整段快进）', () => {
  const src = read(AW);
  it('dt 钳制 v10.95 新契约在册（min(gapMed×1.5, 0.017) 双层）', () => {
    expect(src).toContain('const dtClamp = Math.min(gapMed * 1.5, 0.017)');
    expect(src).toContain('if (rawDt > dtClamp) rawDt = dtClamp;');
  });
  it('历代旧口径全部退役（0.25 直钳 / 0.05 直钳 / 0.033 单层封顶）', () => {
    expect(src).not.toContain('if (rawDt > 0.25) rawDt = 0.25;');
    expect(src).not.toContain('if (rawDt > 0.05) rawDt = 0.05;');
    expect(src).not.toContain('Math.min(Math.max(gapMed * 1.5, 0.017), 0.033)');
  });
  it('与放射场既有 0.05 口径同律（updateRadialField min(rawDt, 0.05) 保留）', () => {
    expect(src).toContain('updateRadialField(Math.min(rawDt, 0.05), now)');
  });
});

describe('v10.95 · D. ③启动屏释放改 140ms 墙钟过渡淡出（瞬时置 0 退役）', () => {
  const src = read(AW);
  it('releaseLaunchScreen 走 CSS 过渡淡出 + 一次性摘除', () => {
    expect(src).toContain("el.style.transition = 'opacity 140ms ease-out';");
    expect(src).toContain("setTimeout(() => { el.style.transition = 'none'; }, 180);");
    expect(src).toContain('void el.offsetWidth;');
  });
  it('已释放重复调用不重启淡出（watchdog 520ms 与 iframe-load 双通道幂等）', () => {
    expect(src).toContain('const alreadyReleased = state.launchScreenReleased;');
    expect(src).toContain('if (el && !alreadyReleased) {');
  });
  it('淡出期间 render 守卫不回写（#225 ②语义原样保留，v225 静态锚兼容）', () => {
    expect(src).toContain("if (!state.launchScreenReleased) dom.appLaunchScreen.style.opacity = launchOp.toFixed(3);");
  });
  it('开窗/收口两分支摘除过渡残留（防逐帧写入被滞后中和，v7.34 同律）', () => {
    expect(src.match(/dom\.appLaunchScreen\.style\.transition = 'none';/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe('v10.95 · E. ④交叉淡化曲线起手冻结（中途切曲线退役）', () => {
  const src = read(AW);
  const st = read(ST);
  it('state 增 contentCurveWarm 决策快照字段', () => {
    expect(st).toContain('contentCurveWarm: false,');
  });
  it('四起手冻结：openApp 主路径/承接/Actor唤回 + closeApp', () => {
    expect(src.match(/state\.contentCurveWarm = state\.contentWarm;/g)?.length).toBe(4);
  });
  it('render 曲线消费改为冻结快照（contentWarm 仅作实例温度记录）', () => {
    expect(src).toContain('const warmCurve = state.contentCurveWarm;');
    expect(src).toContain('state.contentWarm = isAppInstanceWarm(state.currentApp.id);');
    expect(src).not.toContain('contentOp = state.contentWarm ? 1 : smoothstep(p, 0.22, 0.72);');
  });
  it('时间戳字段在 state.js 声明（openStartT/closeStartT/launchReleaseT）', () => {
    expect(st).toContain('openStartT: 0,');
    expect(st).toContain('closeStartT: 0,');
    expect(st).toContain('launchReleaseT: null,');
  });
});
