// ==================== v253 测试 — 三段手势侧边栏小窗 状态机纯核（#253 R125 窗） ====================
//
// #253 §五 可拆路径第一段：状态机核 + 单测先行轻档（壳层 pointer 接线与侧边栏 UI 留下一窗）。
// 命名说明：验收口径原文「v231-* 命名」按仓库惯例（v+议题号：v230/v241/v246 同律）判断为
// 立卡笔误（#231 为壁纸 P0 议题），本套件取 v253-* 命名；认领帖 6713606838 已声明。
//
// 断言面：
//  A. 状态机合法转移（一段捕获 → 二段分离 → 三段呼出 → 点选/收起）
//  B. 可逆性（二段拉回阈值下降回一段，两态图标 arrow↔circle 往返）
//  C. 松手分流（未达阈值回弹 REBOUND / 达阈值呼出 SIDEBAR）+ POINTER_CANCEL 清账
//  D. 非法转移拒绝（rejected 且状态不变）
//  E. 右缘捕获区判定（边界值 + 非法入参守卫）
//  F. 弧形液滴几何（progress 端点/单调性/sin 弧形起终为零中段峰值/半径渐变/负值钳制）
//  G. 两态图标判定（阈值边界两侧）
//  H. 能力开关旗标化判定（总开关 + 宽度门槛，默认 0 = 手机/平板双口径全可用，验收①）
//  I. 自创标注锚（源文件 ≥3 处「自创」+ 专利号 WO2026108297A1 在案，#253 验收⑧ / §7.2b 退级规则）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf-8');

const CORE = read('ios-desktop/js/gesture-bubble-core.js');
const {
  BUBBLE_STATE,
  BUBBLE_EVENT,
  BUBBLE_EFFECT,
  EDGE_CAPTURE_WIDTH_PX,
  SEPARATE_DISTANCE_PX,
  DROPLET_MIN_RADIUS_PX,
  DROPLET_MAX_RADIUS_PX,
  bubbleEnabled,
  isEdgeCapture,
  bubbleIconState,
  dropletGeometry,
  createBubbleMachine,
} = await import('../ios-desktop/js/gesture-bubble-core.js');

/** 标准剧本：从 IDLE 一路推进到 SEPARATED（跟手过阈值） */
function toSeparated(m) {
  const r0 = m.send(BUBBLE_EVENT.POINTER_DOWN, { x: 800, y: 400, windowWidthPx: 812 });
  return { r0, r1: m.send(BUBBLE_EVENT.POINTER_MOVE, { pullPx: SEPARATE_DISTANCE_PX, anchorY: 400, windowWidthPx: 812 }) };
}

// ---------- A. 状态机合法转移 ----------
describe('v253 A · 状态机合法转移', () => {
  it('IDLE 捕获区按下 → DROPLET + RENDER_DROPLET（初始几何 radius=MIN）', () => {
    const m = createBubbleMachine();
    const r = m.send(BUBBLE_EVENT.POINTER_DOWN, { x: 800, y: 400, windowWidthPx: 812 });
    expect(r.state).toBe(BUBBLE_STATE.DROPLET);
    expect(r.effects).toEqual([BUBBLE_EFFECT.RENDER_DROPLET]);
    expect(r.geometry.radius).toBe(DROPLET_MIN_RADIUS_PX);
    expect(m.state).toBe(BUBBLE_STATE.DROPLET);
  });

  it('一段跟手未达阈值维持 DROPLET，几何随 pull 前进', () => {
    const m = createBubbleMachine();
    m.send(BUBBLE_EVENT.POINTER_DOWN, { x: 800, y: 400, windowWidthPx: 812 });
    const r = m.send(BUBBLE_EVENT.POINTER_MOVE, { pullPx: 40, anchorY: 400, windowWidthPx: 812 });
    expect(r.state).toBe(BUBBLE_STATE.DROPLET);
    expect(r.geometry.progress).toBeCloseTo(40 / SEPARATE_DISTANCE_PX, 10);
  });

  it('一段跟手达阈值 → SEPARATED + RENDER_SEPARATED', () => {
    const m = createBubbleMachine();
    m.send(BUBBLE_EVENT.POINTER_DOWN, { x: 800, y: 400, windowWidthPx: 812 });
    const r = m.send(BUBBLE_EVENT.POINTER_MOVE, { pullPx: SEPARATE_DISTANCE_PX, anchorY: 400, windowWidthPx: 812 });
    expect(r.state).toBe(BUBBLE_STATE.SEPARATED);
    expect(r.effects).toEqual([BUBBLE_EFFECT.RENDER_SEPARATED]);
    expect(r.geometry.icon).toBe('circle');
  });

  it('三段：SEPARATED 松手 → SIDEBAR + SHOW_SIDEBAR；SELECT(appId) → IDLE + OPEN_MINI_WINDOW/HIDE_BUBBLE 且 appId 透传', () => {
    const m = createBubbleMachine();
    toSeparated(m);
    const up = m.send(BUBBLE_EVENT.POINTER_UP);
    expect(up.state).toBe(BUBBLE_STATE.SIDEBAR);
    expect(up.effects).toEqual([BUBBLE_EFFECT.SHOW_SIDEBAR]);
    const sel = m.send(BUBBLE_EVENT.SIDEBAR_SELECT, { appId: 'notes' });
    expect(sel.state).toBe(BUBBLE_STATE.IDLE);
    expect(sel.effects).toEqual([BUBBLE_EFFECT.OPEN_MINI_WINDOW, BUBBLE_EFFECT.HIDE_BUBBLE]);
    expect(sel.appId).toBe('notes');
  });

  it('三段：SIDEBAR 态 DISMISS → IDLE + HIDE_BUBBLE（小球收回）', () => {
    const m = createBubbleMachine();
    toSeparated(m);
    m.send(BUBBLE_EVENT.POINTER_UP);
    const r = m.send(BUBBLE_EVENT.SIDEBAR_DISMISS);
    expect(r.state).toBe(BUBBLE_STATE.IDLE);
    expect(r.effects).toEqual([BUBBLE_EFFECT.HIDE_BUBBLE]);
  });
});

// ---------- B. 可逆性 ----------
describe('v253 B · 二段可逆（两态图标可逆）', () => {
  it('SEPARATED 拉回阈值下 → DROPLET + 图标回 arrow', () => {
    const m = createBubbleMachine();
    toSeparated(m);
    const r = m.send(BUBBLE_EVENT.POINTER_MOVE, { pullPx: SEPARATE_DISTANCE_PX - 1, anchorY: 400, windowWidthPx: 812 });
    expect(r.state).toBe(BUBBLE_STATE.DROPLET);
    expect(r.geometry.icon).toBe('arrow');
  });

  it('往返多次（arrow→circle→arrow→circle）状态机与图标同步一致', () => {
    const m = createBubbleMachine();
    m.send(BUBBLE_EVENT.POINTER_DOWN, { x: 800, y: 400, windowWidthPx: 812 });
    const seq = [0, SEPARATE_DISTANCE_PX, SEPARATE_DISTANCE_PX - 1, SEPARATE_DISTANCE_PX + 5, 0];
    const got = seq.map((pull) => {
      const r = m.send(BUBBLE_EVENT.POINTER_MOVE, { pullPx: pull, anchorY: 400, windowWidthPx: 812 });
      return [r.state, r.geometry.icon];
    });
    expect(got).toEqual([
      [BUBBLE_STATE.DROPLET, 'arrow'],
      [BUBBLE_STATE.SEPARATED, 'circle'],
      [BUBBLE_STATE.DROPLET, 'arrow'],
      [BUBBLE_STATE.SEPARATED, 'circle'],
      [BUBBLE_STATE.DROPLET, 'arrow'],
    ]);
  });
});

// ---------- C. 松手分流 + CANCEL 清账 ----------
describe('v253 C · 松手分流与系统打断', () => {
  it('未达阈值松手 → IDLE + REBOUND（回弹取消，不呼出）', () => {
    const m = createBubbleMachine();
    m.send(BUBBLE_EVENT.POINTER_DOWN, { x: 800, y: 400, windowWidthPx: 812 });
    const r = m.send(BUBBLE_EVENT.POINTER_UP);
    expect(r.state).toBe(BUBBLE_STATE.IDLE);
    expect(r.effects).toEqual([BUBBLE_EFFECT.REBOUND]);
  });

  it('POINTER_CANCEL 各在途态（DROPLET/SEPARATED）→ IDLE + HIDE_BUBBLE 清账', () => {
    for (const pull of [10, SEPARATE_DISTANCE_PX]) {
      const m = createBubbleMachine();
      m.send(BUBBLE_EVENT.POINTER_DOWN, { x: 800, y: 400, windowWidthPx: 812 });
      m.send(BUBBLE_EVENT.POINTER_MOVE, { pullPx: pull, anchorY: 400, windowWidthPx: 812 });
      const r = m.send(BUBBLE_EVENT.POINTER_CANCEL);
      expect(r.state).toBe(BUBBLE_STATE.IDLE);
      expect(r.effects).toEqual([BUBBLE_EFFECT.HIDE_BUBBLE]);
    }
  });
});

// ---------- D. 非法转移拒绝 ----------
describe('v253 D · 非法转移拒绝（rejected 且状态不变）', () => {
  it('IDLE 态 MOVE/UP/CANCEL 一律拒绝', () => {
    const m = createBubbleMachine();
    for (const ev of [BUBBLE_EVENT.POINTER_MOVE, BUBBLE_EVENT.POINTER_UP, BUBBLE_EVENT.POINTER_CANCEL]) {
      const r = m.send(ev, { pullPx: 10 });
      expect(r.rejected).toBe(true);
      expect(r.effects).toEqual([]);
      expect(r.state).toBe(BUBBLE_STATE.IDLE);
    }
  });

  it('捕获区外按下拒绝（不在右缘 EDGE_CAPTURE_WIDTH_PX 内）', () => {
    const m = createBubbleMachine();
    const r = m.send(BUBBLE_EVENT.POINTER_DOWN, { x: 812 - EDGE_CAPTURE_WIDTH_PX - 1, y: 400, windowWidthPx: 812 });
    expect(r.rejected).toBe(true);
    expect(m.state).toBe(BUBBLE_STATE.IDLE);
  });

  it('DROPLET 态不接受侧边栏事件；SIDEBAR 态不接受 pointer 事件', () => {
    const m1 = createBubbleMachine();
    m1.send(BUBBLE_EVENT.POINTER_DOWN, { x: 800, y: 400, windowWidthPx: 812 });
    expect(m1.send(BUBBLE_EVENT.SIDEBAR_SELECT, { appId: 'x' }).rejected).toBe(true);

    const m2 = createBubbleMachine();
    toSeparated(m2);
    m2.send(BUBBLE_EVENT.POINTER_UP);
    expect(m2.send(BUBBLE_EVENT.POINTER_UP).rejected).toBe(true);
    expect(m2.send(BUBBLE_EVENT.POINTER_MOVE, { pullPx: 5 }).rejected).toBe(true);
    expect(m2.state).toBe(BUBBLE_STATE.SIDEBAR);
  });

  it('未知事件拒绝', () => {
    const m = createBubbleMachine();
    expect(m.send('nope').rejected).toBe(true);
  });
});

// ---------- E. 右缘捕获区判定 ----------
describe('v253 E · 捕获区判定', () => {
  it('右缘边界值：恰在捕获区内为真，越界 1px 为假，超出屏宽为假', () => {
    const W = 812;
    expect(isEdgeCapture(W - EDGE_CAPTURE_WIDTH_PX, W)).toBe(true);
    expect(isEdgeCapture(W, W)).toBe(true);
    expect(isEdgeCapture(W - EDGE_CAPTURE_WIDTH_PX - 0.5, W)).toBe(false);
    expect(isEdgeCapture(W + 1, W)).toBe(false);
  });

  it('非法入参守卫（NaN/零宽/负宽）一律为假', () => {
    expect(isEdgeCapture(NaN, 812)).toBe(false);
    expect(isEdgeCapture(800, 0)).toBe(false);
    expect(isEdgeCapture(800, -5)).toBe(false);
  });
});

// ---------- F. 弧形液滴几何 ----------
describe('v253 F · 弧形液滴几何（自创轨迹模型）', () => {
  it('progress=0：贴边起点，radius=MIN，弧形偏移为 0', () => {
    const g = dropletGeometry(0, 400, 812);
    expect(g.progress).toBe(0);
    expect(g.radius).toBe(DROPLET_MIN_RADIUS_PX);
    expect(g.y).toBe(400);
    expect(g.separated).toBe(false);
  });

  it('progress=1：radius=MAX，弧形偏移归零（终点贴边）', () => {
    const g = dropletGeometry(SEPARATE_DISTANCE_PX, 400, 812);
    expect(g.progress).toBe(1);
    expect(g.radius).toBeCloseTo(DROPLET_MAX_RADIUS_PX, 10);
    expect(g.y).toBe(400);
    expect(g.separated).toBe(true);
  });

  it('中段弧形上拱（y < anchorY），峰值约 ARC_BULGE_RATIO×SEPARATE_DISTANCE_PX', () => {
    const g = dropletGeometry(SEPARATE_DISTANCE_PX / 2, 400, 812);
    expect(g.y).toBeLessThan(400);
    expect(400 - g.y).toBeCloseTo(0.35 * SEPARATE_DISTANCE_PX, 6);
  });

  it('半径随 pull 单调不减；x 随 pull 单调左移', () => {
    let prevR = -1;
    let prevX = Infinity;
    for (let pull = 0; pull <= SEPARATE_DISTANCE_PX; pull += 8) {
      const g = dropletGeometry(pull, 400, 812);
      expect(g.radius).toBeGreaterThanOrEqual(prevR);
      expect(g.x).toBeLessThanOrEqual(prevX);
      prevR = g.radius;
      prevX = g.x;
    }
  });

  it('负 pull 钳制为 0（不反向）；非法 anchorY 落 0 不抛', () => {
    const g = dropletGeometry(-50, 400, 812);
    expect(g.progress).toBe(0);
    expect(g.radius).toBe(DROPLET_MIN_RADIUS_PX);
    expect(() => dropletGeometry(10, NaN, 812)).not.toThrow();
  });
});

// ---------- G. 两态图标判定 ----------
describe('v253 G · 两态图标（阈值边界两侧）', () => {
  it('阈值-1 → arrow；阈值恰值 → circle；2×阈值 → circle；0 → arrow', () => {
    expect(bubbleIconState(SEPARATE_DISTANCE_PX - 1)).toBe('arrow');
    expect(bubbleIconState(SEPARATE_DISTANCE_PX)).toBe('circle');
    expect(bubbleIconState(SEPARATE_DISTANCE_PX * 2)).toBe('circle');
    expect(bubbleIconState(0)).toBe('arrow');
  });

  it('非法入参（NaN/负值）安全落 arrow（可逆基态）', () => {
    expect(bubbleIconState(NaN)).toBe('arrow');
    expect(bubbleIconState(-10)).toBe('arrow');
  });
});

// ---------- H. 能力开关旗标化判定 ----------
describe('v253 H · 能力开关（旗标化模型）', () => {
  it('总开关关闭永不可用（无论宽度）', () => {
    expect(bubbleEnabled({ enabled: false }, 812)).toBe(false);
    expect(bubbleEnabled({ enabled: false, minWindowPx: 0 }, 2000)).toBe(false);
  });

  it('默认门槛 0：手机态（812）与平板态（1280）均可用（验收①双口径）', () => {
    expect(bubbleEnabled({ enabled: true }, 812)).toBe(true);
    expect(bubbleEnabled({ enabled: true }, 1280)).toBe(true);
  });

  it('宽度门槛参数生效：minWindowPx=900 时 812 不可用、1280 可用（旗标位）', () => {
    const cfg = { enabled: true, minWindowPx: 900 };
    expect(bubbleEnabled(cfg, 812)).toBe(false);
    expect(bubbleEnabled(cfg, 1280)).toBe(true);
  });

  it('非法入参守卫（null 配置/非数宽度）为假', () => {
    expect(bubbleEnabled(null, 812)).toBe(false);
    expect(bubbleEnabled({ enabled: true }, NaN)).toBe(false);
  });
});

// ---------- I. 自创标注锚 ----------
describe('v253 I · 自创标注与权界（#253 §二/验收⑧）', () => {
  it('源文件「自创」标注 ≥3 处（头注 + 常量区逐条 + 轨迹模型）', () => {
    const n = (CORE.match(/【自创】|【自创】/g) || []).length + (CORE.match(/自创/g) || []).length;
    expect(n).toBeGreaterThanOrEqual(3);
  });

  it('专利号 WO2026108297A1 思路提取标注在案（非权威值声明）', () => {
    expect(CORE).toContain('WO2026108297A1');
    expect(CORE).toContain('非权威值');
  });

  it('零 DOM / 零新全局（#253 边界：不引入新全局注册表，纯 ESM export）——负向断言只查非注释代码行', () => {
    const code = CORE.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(code).not.toMatch(/window\.__/);
    expect(code).not.toMatch(/\bdocument\./);
    expect(CORE).toContain('export function');
  });
});
