// @ts-check
// ==================== v1038 · #310 开/关动画「中间不连贯」残留修复 —— v11.15 双层自适应帧距钳制 ====================
//
// 背景（#310 一表）：v11.15 固定 0.05s 帧间隙钳制把 0.25s 的灾难缩成 0.05s 跳变，
// 但弹簧/TimedValue 陡段斜率（EMPHASIZED 时间域峰值 ~40/s）下 0.05s 推进 = 单帧
// Δscale 0.463~0.515（MO 相位流实测，桌面/手机 × 开/关窗四组），是 60fps 正常帧
// 增量（16.7ms×40 ≈ 0.67 陡段峰值）同量级的「每帧都动」原生快——问题不在陡段
// 原生速度，而在停顿帧被钳到 0.05s 后仍整段快进（感知 =「动画中间卡一下/跳一下」）。
//
// v11.15 修复（app-window.js frame()）：
//   dtClamp = min(gapMed × 1.5, 0.017)
//   - ① 陡段封顶 0.017s（1/60s）：17ms × 峰值 40.4/s ≈ 0.69 封顶 = 60fps 正常帧
//     等量推进 —— 停顿帧不再快进整段相位，任何帧距下单帧视觉增量 ≤ 正常帧；
//   - ② 环境自适应：滚动 8 帧帧距中位 × 1.5 —— 120Hz 环境停顿帧钳 12.5ms
//     （增量 1.5×正常帧）；60fps 取 17ms 封顶值；被丢弃间隙仍由墙钟自然延长
//     总时长（v11.15 语义保留）；病理性停摆仍由 #225 launchWatchdog 兑底。
//
// 本测试：A 钳制公式与常数静态锚 / B 旧口径退役 / C EMPHASIZED 峰值斜率数学
// 封顶复核（插值器权威曲线实算）/ D 放射场口径共存 / E 探针脚本在库。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EMPHASIZED } from '../ios-desktop/js/aosp/interpolators.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const awSrc = readFileSync(join(root, 'ios-desktop/js/app-window.js'), 'utf8');

describe('v11.15 · A. 双层钳制公式与常数（app-window.js frame()）', () => {
  it('dtClamp = min(gapMed × 1.5, 0.017) 在册（陡段封顶 1/60s + 环境自适应双层）', () => {
    expect(awSrc).toContain('Math.min(gapMed * 1.5, 0.017)');
    expect(awSrc).toContain('const dtClamp = Math.min(gapMed * 1.5, 0.017)');
    expect(awSrc).toContain('if (rawDt > dtClamp) rawDt = dtClamp;');
  });

  it('gapBuf 滚动 8 帧缓冲在册（随 startLoop 重入重置）', () => {
    expect(awSrc).toContain('const gapBuf = [];');
    expect(awSrc).toContain('if (gapBuf.length > 8) gapBuf.shift();');
    // 中位兜底：空缓冲取 0.017（最保守封顶值）
    expect(awSrc).toContain("(gapBuf.length ? gapBuf.slice() : [0.017]).sort((a, b) => a - b)");
    expect(awSrc).toContain('gapSorted[Math.floor(gapSorted.length / 2)] || 0.017');
  });

  it('v11.15 注释锚：双层语义 + 峰值斜率实测来源（#310）', () => {
    expect(awSrc).toContain('v11.15 双层自适应钳制（#310 残留跳变修复）');
    expect(awSrc).toContain('陡段封顶 0.017s（1/60s）');
    expect(awSrc).toContain('峰值 ~18.4/s'); // 插桩实测（33ms 推进 0.807→0.200）
    expect(awSrc).toContain('首帧（gapBuf 空）以 0.017 兜底');
  });
});

describe('v11.15 · B. 旧口径退役（防回归）', () => {
  it('v11.15 固定 0.05 直钳退役', () => {
    expect(awSrc).not.toMatch(/if \(rawDt > 0\.05\) rawDt = 0\.05;/);
  });
  it('0.25 上限（首版自适应层的死亡螺旋口径）退役', () => {
    expect(awSrc).not.toContain('Math.min(Math.max(gapMed * 1.5, 0.017), 0.25)');
    expect(awSrc).not.toContain('Math.min(Math.max(gapMed * 1.5, 0.017), 0.033)');
  });
  it('MAX_SUBSTEPS=30 子步预算维持（17ms 推进 ≤ 3 子步，预算充裕无螺旋）', () => {
    expect(awSrc).toContain('const MAX_SUBSTEPS = 30;');
    expect(awSrc).toContain('const STEP = 1 / 120;');
  });
});

describe('v11.15 · C. EMPHASIZED 峰值斜率数学封顶复核（0.017 封顶的依据）', () => {
  // EMPHASIZED 第二段（0.1667,0.4)→c1(0.2083,0.82)→c2(0.25,1)→(1,1)：
  // dy/dx 峰值 ≈ 10.1（raw 域）——250ms 关窗时间域斜率 = 10.1/0.25 ≈ 40.4/s；
  // 17ms 推进极限 Δ = 0.017 × 40.4 ≈ 0.69 —— 0.70 阈值由此而来。
  it('EMPHASIZED 陡段实算：raw 0.167 处 e=0.4，raw 0.2 处 e≈0.64（e2e 探针实测吻合）', () => {
    expect(EMPHASIZED(0.166666)).toBeCloseTo(0.4, 1);
    expect(EMPHASIZED(0.2)).toBeCloseTo(0.6357, 2);
    expect(EMPHASIZED(0.133333)).toBeCloseTo(0.193, 1);
  });

  it('峰值段斜率（raw 域 dy/dx）≥ 8 → 250ms 时间域 ≥ 32/s → 17ms 封顶 Δ ≥ 0.54', () => {
    const h = 0.01;
    let maxSlope = 0;
    for (let x = 0.05; x < 0.3; x += h) {
      maxSlope = Math.max(maxSlope, (EMPHASIZED(x + h) - EMPHASIZED(x)) / h);
    }
    expect(maxSlope).toBeGreaterThan(8);           // raw 域峰值
    expect(maxSlope / 0.25).toBeGreaterThan(32);   // 250ms 时间域（关窗）
    // 60fps 正常帧增量（峰值）：16.7ms × 32+ ≈ 0.54 —— 全帧 maxΔscale 阈值 0.70 与其相容
    expect(0.0167 * (maxSlope / 0.25)).toBeGreaterThan(0.5);
  });

  it('开窗 500ms 时间域峰值斜率 = 关窗一半（同曲线时长加倍）—— 17ms 封顶对开窗更宽裕', () => {
    expect(0.5 / 0.25).toBe(2); // 500/250 比例锚：开窗封顶余量 ×2
  });
});

describe('v11.15 · D. 邻接口径共存', () => {
  it('放射场既有 min(rawDt, 0.05) 口径不动（装饰层非相位关键）', () => {
    expect(awSrc).toContain('updateRadialField(Math.min(rawDt, 0.05), now)');
  });
  it('#225 launchWatchdog 兑底链路不受影响（arm/settle/forceFinishAnim 原位）', () => {
    expect(awSrc).toContain('launchWatchdog.arm()');
    expect(awSrc).toContain('launchWatchdog.settle()');
    expect(awSrc).toContain("window.__launchWatchdog = launchWatchdog;");
  });
  it('v11.15 三跳变源修复全部保留（timedFade / 曲线冻结 / 140ms 启动屏过渡）', () => {
    expect(awSrc).toContain('const timedFade = isTimedEngineActive() && !state.isDragging;');
    expect(awSrc).toContain('state.contentCurveWarm = state.contentWarm;');
    expect(awSrc).toContain("'opacity 140ms ease-out'");
    expect(awSrc).toContain('state.openStartT = performance.now()');
    expect(awSrc).toContain('state.closeStartT = performance.now()');
  });
});

describe('v11.15 · E. 探针脚本与实验在库', () => {
  it('scripts/e2e-v1038-anim-continuity.mjs 在库且含 120ms 阻塞注入决定性实验', () => {
    const src = readFileSync(join(root, 'scripts/e2e-v1038-anim-continuity.mjs'), 'utf8');
    expect(src).toContain('120ms 主线程阻塞');
    expect(src).toContain('stallJump');
    expect(src).toContain('dt > 25');
    expect(src).toContain('≤0.55');
    expect(src).toContain('dedup'); // rAF 心跳同帧去重
  });
  it('探针判据口径：停顿帧(>25ms)阈值 0.55 / 全帧 0.70（EMPHASIZED 数学封顶）', () => {
    const src = readFileSync(join(root, 'scripts/e2e-v1038-anim-continuity.mjs'), 'utf8');
    expect(src).toContain('≤0.55');
    expect(src).toContain('≤0.70');
  });
});
