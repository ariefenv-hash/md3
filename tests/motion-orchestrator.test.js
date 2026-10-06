// ==================== motion-orchestrator.test.js — v7.46 统一动效编排器回归 ====================
// 锚定「桌面动画集结成一个流畅整体」的结构性修复：
//   A. motion.js 编排器 API（共享帧心跳 / RK4 弹簧值补间 / 曲线令牌 / 倍率时长）
//   B. 接缝速度契约 —— closeApp 不再两级衰减、flyAppToCard 弹簧飞行+速度继承
//   C. 双物理世界合流 —— deck 吸附弹簧化、folder/pull-down 接入编排器
//   D. 物理编排 —— setTimeout 时钟编排改 onApproach 物理锚点
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { onFrame, tweenValue, tokens, cssEase, dur, after, springEta } from '../ios-desktop/js/motion.js';
import { makeSpringParams } from '../ios-desktop/js/spring.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf-8');

// ---------- A. motion.js 编排器 ----------

describe('motion.js — 统一动效编排器 API', () => {
  it('正典曲线令牌恰好三条（emphasized/decel/gentle），cssEase 输出合法 cubic-bezier', () => {
    expect(Object.keys(tokens).sort()).toEqual(['decel', 'emphasized', 'gentle']);
    expect(cssEase('emphasized')).toBe('cubic-bezier(0.2, 0, 0, 1)');
    expect(cssEase('gentle')).toMatch(/^cubic-bezier\([\d.,\s-]+\)$/);
    // 未知令牌安全回落 emphasized
    expect(cssEase('nonexistent')).toBe(cssEase('emphasized'));
  });

  it('tweenValue 从 from 收敛到 to，onComplete 恰好一次且终值精确写入', async () => {
    const seen = [];
    const done = vi.fn();
    const params = makeSpringParams(0.12, 1.0, 1); // 快弹簧，~150ms 收敛
    tweenValue({
      from: 0, to: 1, velocity: 0, params,
      onUpdate: (v) => seen.push(v),
      onComplete: done,
    });
    await vi.waitFor(() => { expect(done).toHaveBeenCalledTimes(1); }, { timeout: 3000 });
    expect(seen[seen.length - 1]).toBe(1);
    await new Promise((r) => setTimeout(r, 60));
    expect(done).toHaveBeenCalledTimes(1); // 收敛后不再触发
  });

  it('tweenValue 初速度非零时确实更快接近目标（速度接力生效）', async () => {
    const params = makeSpringParams(0.25, 1.0, 1);
    let probeA = 0, probeB = 0;
    const doneA = vi.fn(() => { });
    const doneB = vi.fn(() => { });
    tweenValue({ from: 0, to: 100, velocity: 0, params, onUpdate: (v) => { probeA = v; }, onComplete: doneA });
    tweenValue({ from: 0, to: 100, velocity: 300, params, onUpdate: (v) => { probeB = v; }, onComplete: doneB });
    // 早期时刻：带初速者应领先
    await new Promise((r) => setTimeout(r, 60));
    expect(probeB).toBeGreaterThan(probeA);
    await vi.waitFor(() => expect(doneA).toHaveBeenCalled(), { timeout: 3000 });
    await vi.waitFor(() => expect(doneB).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('cancel 后不再触发 onComplete（静默取消语义）', async () => {
    const done = vi.fn();
    const t = tweenValue({
      from: 0, to: 1, velocity: 0,
      params: makeSpringParams(0.4, 0.8, 1),
      onUpdate: () => {},
      onComplete: done,
    });
    await new Promise((r) => setTimeout(r, 30));
    t.cancel();
    await new Promise((r) => setTimeout(r, 120));
    expect(done).not.toHaveBeenCalled();
    expect(t.isSettled()).toBe(true);
  });

  it('retarget 改目标后最终收敛到新目标', async () => {
    const done = vi.fn();
    const t = tweenValue({
      from: 0, to: 100, velocity: 0,
      params: makeSpringParams(0.18, 1.0, 1),
      onUpdate: () => {},
      onComplete: done,
    });
    await new Promise((r) => setTimeout(r, 30));
    t.retarget(50, null);
    await vi.waitFor(() => expect(done).toHaveBeenCalledTimes(1), { timeout: 3000 });
  });

  it('springEta 对快弹簧给出毫秒级估计且不超过上限', () => {
    const fast = springEta(makeSpringParams(0.2, 1.0, 1), 0, 1, 0);
    expect(fast).toBeGreaterThan(50);
    expect(fast).toBeLessThanOrEqual(1500);
    // 有初速度者更快
    const boosted = springEta(makeSpringParams(0.2, 1.0, 1), 0, 1, 4);
    expect(boosted).toBeLessThanOrEqual(fast);
  });

  it('after 返回取消函数且 dur 随倍率缩放（默认 1×）', () => {
    const cancel = after(50, () => {});
    expect(typeof cancel).toBe('function');
    cancel();
    expect(dur(400)).toBe(400); // 无倍率存档时 1:1
  });

  it('onFrame 退订后不再被调用', async () => {
    let calls = 0;
    const unsub = onFrame(() => { calls++; });
    await new Promise((r) => setTimeout(r, 50));
    expect(calls).toBeGreaterThan(0);
    const snap = calls;
    unsub();
    await new Promise((r) => setTimeout(r, 60));
    expect(calls).toBe(snap); // 冻结
  });
});

// ---------- B. 接缝速度契约 ----------

describe('app-window.js — closeApp 速度契约重建', () => {
  const src = read('ios-desktop/js/app-window.js');

  it('废除 ×0.08 / ×0.06 两级衰减（3000px/s 甩动不再被湮灭到 0.29px/s）', () => {
    expect(src).not.toContain('clamp(vx * 0.08');
    expect(src).not.toContain('clamp(vy * 0.08');
    expect(src).not.toContain('clamp(vs * 0.06');
  });

  it('新契约：px/s 直接力簧 + 量纲可信钳制（位置 ±2600 / 缩放 [-2.4, 0.25]）', () => {
    expect(src).toContain('const cvx = clamp(vx, -2600, 2600);');
    expect(src).toContain('const cvy = clamp(vy, -2600, 2600);');
    expect(src).toContain('const cvs = clamp(vs, -2.4, 0.25);');
  });
});

describe('app-window.js — flyAppToCard RK4 弹簧飞行', () => {
  const src = read('ios-desktop/js/app-window.js');

  it('cubicBezierEase 求解器已整体退役（飞行不再走固定时长贝塞尔）', () => {
    expect(src).not.toContain('cubicBezierEase');
  });

  it('飞行三通道均为 Spring 实例且参数来自 curCloseParams()（预设/倍率贯穿）', () => {
    expect(src).toContain('const flightParams = curCloseParams();');
    expect(src).toMatch(/tx: new Spring\(\{ \.\.\.flightParams/);
    expect(src).toMatch(/ty: new Spring\(\{ \.\.\.flightParams/);
    expect(src).toMatch(/p: new Spring\(\{ \.\.\.flightParams/);
  });

  it('初速度继承：opts.velocity 注入 flight 初速（手势「掷入后台」）', () => {
    expect(src).toContain('const vel = opts && opts.velocity ? opts.velocity : null;');
    expect(src).toContain('vel.vx || 0');
    expect(src).toContain('vel.vy || 0');
    expect(src).toContain('vel.vs || 0');
  });

  it('物理编排锚点 onApproach 存在且只触发一次', () => {
    expect(src).toContain('approachFired = true;');
    expect(src).toContain('opts.onApproach()');
  });

  it('v7.42 接管契约保留：flightActive 标记 + 静默退场守卫', () => {
    expect(src).toContain('state.flightActive = true;');
    expect(src).toMatch(/if \(!state\.flightActive\) return;/);
  });

  it('每帧同步状态弹簧携带真实速度（接管零断层）', () => {
    expect(src).toContain('syncStateSprings(s, W / 2 + tx, H / 2 + ty, flight.tx.v, flight.ty.v, flight.p.v)');
  });
});

describe('gestures.js — 手势→弹簧速度交接', () => {
  const src = read('ios-desktop/js/gestures.js');

  it('回桌甩动直接传屏幕物理速度（不再 ×0.0012 归一化误用）', () => {
    expect(src).toContain('closeApp(vx, vy, scaleVel);');
    expect(src).not.toContain('clamp(vx * VEL_SCALE');
  });

  it('停顿唤出后台时把松指速度交给 flyAppToCard（初速继承源头）', () => {
    expect(src).toContain('const relV = getReleaseVelocity();');
    expect(src).toContain('openRecentApps(currentAppId, { vx: relV.vx, vy: relV.vy, vs: 0 });');
  });
});

// ---------- C. 双物理世界合流 ----------

describe('recent-apps.js — deck 吸附弹簧化与编排物理化', () => {
  const src = read('ios-desktop/js/recent-apps.js');

  it('quartic 定时补间退役，吸附改走 tweenValue 弹簧', () => {
    expect(src).not.toContain('1 - Math.pow(1 - progress, 4)');
    expect(src).toContain('deckSettleTween = tweenValue({');
    expect(src).toContain('params: scaleAnimSpeed(makeSpringParams(0.3, 0.92, 1)),');
  });

  it('甩出速度注入吸附弹簧初速（px/s → 卡片/s）', () => {
    expect(src).toContain('let flingVelocityPx = 0;');
    expect(src).toContain('flingVelocityPx = velocityX * 1000;');
    expect(src).toContain('const vCards = clamp(flingVelocityPx / Math.max(CARD_STEP_PX, 1), -8, 8);');
  });

  it('拖拽接管时取消在途吸附弹簧（位姿即中断位姿，零重启）', () => {
    expect(src).toMatch(/pointerdown[\s\S]{0,400}deckSettleTween\.cancel\(\)/);
  });

  it('closeRecentApps 回收吸附弹簧与速度样本', () => {
    expect(src).toMatch(/export function closeRecentApps\(\)[\s\S]{0,1200}deckSettleTween\.cancel\(\)/);
  });

  it('邻卡浮现由 flyAppToCard 物理锚点触发（替代 setTimeout(160) 时钟对齐）', () => {
    expect(src).toContain('onApproach: startNeighborWaves,');
    expect(src).not.toContain("}, 160);");
  });

  it('后台编排全部延时经 after()（随速度倍率缩放）——波浪清除/卡片展开/恢复路径无裸 setTimeout', () => {
    expect(src).toContain('after(260, () => {');
    expect(src).not.toMatch(/setTimeout\(\s*\(\)\s*=>\s*\{\s*closeRecentApps\(\)/);
    expect(src).not.toContain('}, delayMs);');
    expect(src).not.toContain('}, totalTime);');
  });
});

describe('folder.js — 面板弹簧化', () => {
  const src = read('ios-desktop/js/folder.js');

  it('开/关/收缩三路径均走 tweenPanel（同一族弹簧参数）', () => {
    expect(src.match(/tweenPanel\(\{/g) || []).toHaveLength(3);
    expect(src).toContain('params: curOpenParams(),');
    expect(src.match(/params: curCloseParams\(\),/g) || []).toHaveLength(2);
  });

  it('双 RAF hack 与 0.25,1,0.5,1 贝塞尔家族退役', () => {
    expect(src).not.toContain('cubic-bezier(0.25, 1, 0.5, 1)');
    expect(src).not.toContain('cubic-bezier(0.2, 0.95, 0.25, 1.05)');
    expect(src).not.toMatch(/requestAnimationFrame\(\(\) => \{\s*requestAnimationFrame\(/);
  });

  it('归还路径（reopenFolderForReturn）先取消在途弹簧再硬切', () => {
    expect(src).toMatch(/export function reopenFolderForReturn[\s\S]{0,120}cancelFolderPanelTween\(\);/);
  });
});

describe('pull-down-gesture.js — 曲线令牌统一', () => {
  const src = read('ios-desktop/js/pull-down-gesture.js');

  it('0.18,0.9 / 0.4,0 家族退役，全部走 gentle/emphasized 令牌', () => {
    expect(src).not.toContain('cubic-bezier(0.18, 0.9, 0.2, 1.02)');
    expect(src).not.toContain('cubic-bezier(0.4, 0, 0.2, 1)');
    expect(src.match(/cssEase\('gentle'\)/g) || []).toHaveLength(4);
    expect(src).toContain("cssEase('emphasized')");
  });

  it('清理延时经 after()（速度倍率缩放）', () => {
    expect(src).toContain('after(310, () => {');
    expect(src).toContain('after(260, () => {');
    expect(src).not.toContain('}, 310);');
  });
});
