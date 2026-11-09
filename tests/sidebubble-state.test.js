// ==================== v253 — #253 三段手势侧边栏小窗 守护套件 ====================
// 覆盖：A 弧形几何纯函数 / B 三段状态机全迁移 / C squeeze-row 按压整排联动 /
// D 停顿消歧仲裁（集成：让位返回手势 + 接管全链路）/ E I 断言同口径自检（css 令牌面）/
// F 纪律负向锚（零新全局、零 hex 裸色）/ G 自创标注可见 / H Esc 纪律。
// 状态机核 import 自 ios-desktop/js/sidebubble.js（零 DOM 纯函数）。

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SB,
  arcY, dropR, dropIcon, isDetached, clampRestY, squeezeRow,
  createGesture, gBegin, gPending, gDrag, gRelease,
  gCancel, gRestTap, gCollapse, gDismiss,
  isSideBubbleActive, initSideBubble,
} from '../ios-desktop/js/sidebubble.js';
import { checkI } from '../scripts/audit-app-quality.mjs';

const ROOT = resolve(__dirname, '..');
const JS_SRC = readFileSync(resolve(ROOT, 'ios-desktop/js/sidebubble.js'), 'utf8');
const CSS_SRC = readFileSync(resolve(ROOT, 'ios-desktop/css/sidebubble.css'), 'utf8');

const W = 1024, H = 768; // happy-dom 默认视口

describe('v253 A · 弧形几何纯函数（自创几何锚定）', () => {
  it('A1 arcY：pull=0 贴缘（不跟手 y），pull=ARC_RANGE 追平指针 y（弧线端点）', () => {
    expect(arcY(300, 500, 0)).toBe(300);
    expect(arcY(300, 500, SB.ARC_RANGE)).toBe(500);
  });
  it('A2 arcY：中段位于 0 与全距之间（弧形渐进，二次缓动）', () => {
    const mid = arcY(300, 500, SB.ARC_RANGE / 2);
    expect(mid).toBeGreaterThan(300);
    expect(mid).toBeLessThan(500);
    // 二次缓动：t=0.5 → t²=0.25（后段加速追指，前段贴缘滑——弧形轨迹语义）
    expect(mid).toBeCloseTo(300 + 200 * 0.25, 5);
  });
  it('A3 dropR：起始 R_MIN → 分离阈值处恰为 R_MAX（小→大渐变端点）', () => {
    expect(dropR(0)).toBe(SB.DROP_R_MIN);
    expect(dropR(SB.SEPARATE_DIST)).toBe(SB.DROP_R_MAX);
  });
  it('A4 dropIcon/isDetached：两态可逆（< 阈值箭头，≥ 阈值圆形）', () => {
    expect(dropIcon(0)).toBe('arrow');
    expect(dropIcon(SB.SEPARATE_DIST - 1)).toBe('arrow');
    expect(dropIcon(SB.SEPARATE_DIST)).toBe('circle');
    expect(isDetached(SB.SEPARATE_DIST)).toBe(true);
    expect(isDetached(SB.SEPARATE_DIST - 1)).toBe(false);
  });
  it('A5 clampRestY：钳入 [REST_TOP, H−REST_BOTTOM]（避让状态栏/导航条）', () => {
    expect(clampRestY(0, H)).toBe(SB.REST_TOP_MARGIN);
    expect(clampRestY(H, H)).toBe(H - SB.REST_BOTTOM_MARGIN);
    expect(clampRestY(H / 2, H)).toBe(H / 2);
  });
});

describe('v253 B · 三段状态机全迁移', () => {
  it('B1 gBegin：仅右缘带内受理；带外拒绝且保持 idle', () => {
    const g = createGesture();
    expect(gBegin(g, { x: W - SB.EDGE_ZONE + 4, y: 300, t: 0 }, W)).toBe(true);
    expect(g.phase).toBe('pending');
    const g2 = createGesture();
    expect(gBegin(g2, { x: W - SB.EDGE_ZONE - 1, y: 300, t: 0 }, W)).toBe(false);
    expect(g2.phase).toBe('idle');
  });
  it('B2 gPending：停顿时长未满 keep；满 HOLD_CONFIRM_MS armed（进入一段）', () => {
    const g = createGesture();
    gBegin(g, { x: W - 10, y: 300, t: 1000 }, W);
    expect(gPending(g, { x: W - 10, y: 300, t: 1000 + SB.HOLD_CONFIRM_MS - 1 })).toBe('keep');
    expect(g.phase).toBe('pending');
    expect(gPending(g, { x: W - 10, y: 300, t: 1000 + SB.HOLD_CONFIRM_MS })).toBe('armed');
    expect(g.phase).toBe('drip');
  });
  it('B3 gPending：停顿前移动超 slop → abort 让位（快速滑动 = 返回手势，不误触多窗）', () => {
    const g = createGesture();
    gBegin(g, { x: W - 10, y: 300, t: 1000 }, W);
    expect(gPending(g, { x: W - 10 - SB.HOLD_MOVE_SLOP - 3, y: 300, t: 1100 })).toBe('abort');
    expect(g.phase).toBe('idle');
  });
  it('B4 gPending：停顿期抖动 ≤ slop 不 abort（静止判定带容差；单轴满额抖动）', () => {
    const g = createGesture();
    gBegin(g, { x: W - 10, y: 300, t: 1000 }, W);
    expect(gPending(g, { x: W - 10 + SB.HOLD_MOVE_SLOP, y: 300, t: 1200 })).toBe('keep');
  });
  it('B5 gDrag：一段跟手渲染量（x 跟手左移、y 走弧线、icon=arrow）', () => {
    const g = createGesture();
    gBegin(g, { x: W - 10, y: 300, t: 0 }, W);
    gPending(g, { x: W - 10, y: 300, t: SB.HOLD_CONFIRM_MS }, W);
    const o = gDrag(g, { x: W - 30, y: 360 }, W, H);
    expect(o.phase).toBe('drip');
    expect(o.icon).toBe('arrow');
    expect(g.pull).toBe(20); // x0 − x = (W−10) − (W−30)
    expect(o.x).toBe(W - 20 - o.r); // 中心 x = 视口宽 − pull − r
    expect(o.y).toBe(arcY(300, 360, 20));
  });
  it('B6 gDrag：跨过 SEPARATE_DIST 自动分离 drip→orb（justDetached 沿一次性；分离后解除弧线完全跟手）', () => {
    const g = createGesture();
    gBegin(g, { x: W - 10, y: 300, t: 0 }, W);
    gPending(g, { x: W - 10, y: 300, t: SB.HOLD_CONFIRM_MS }, W);
    const o1 = gDrag(g, { x: W - 10 - SB.SEPARATE_DIST - 5, y: 380 }, W, H);
    expect(o1.phase).toBe('orb');
    expect(o1.icon).toBe('circle');
    expect(o1.justDetached).toBe(true);
    expect(o1.y).toBe(380); // orb 态 y 直取指针（弧线约束已解除）
    const o2 = gDrag(g, { x: W - 10 - SB.SEPARATE_DIST - 6, y: 380 }, W, H);
    expect(o2.justDetached).toBe(false); // 沿只触发一次
  });
  it('B7 gRelease：二段松手 → panel（呼出侧边栏 + restY 钳制）；一段松手 → cancel 回吸', () => {
    const g = createGesture();
    gBegin(g, { x: W - 10, y: 300, t: 0 }, W);
    gPending(g, { x: W - 10, y: 300, t: SB.HOLD_CONFIRM_MS }, W);
    gDrag(g, { x: W - 10 - SB.SEPARATE_DIST - 5, y: 380 }, W, H);
    expect(gRelease(g, W, H)).toBe('panel');
    expect(g.phase).toBe('panel');
    expect(g.restY).toBe(clampRestY(380, H));
    const g2 = createGesture();
    gBegin(g2, { x: W - 10, y: 300, t: 0 }, W);
    gPending(g2, { x: W - 10, y: 300, t: SB.HOLD_CONFIRM_MS }, W);
    gDrag(g2, { x: W - 30, y: 320 }, W, H); // 未达分离阈值
    expect(gRelease(g2, W, H)).toBe('cancel');
    expect(g2.phase).toBe('idle');
  });
  it('B8 gRestTap/gCollapse/gDismiss：停驻球复呼 → 收起保留停驻 → 清球', () => {
    const g = createGesture();
    g.phase = 'resting';
    expect(gRestTap(g)).toBe(true);
    expect(g.phase).toBe('panel');
    expect(gCollapse(g)).toBe(true);
    expect(g.phase).toBe('resting');
    expect(gDismiss(g)).toBe(true);
    expect(g.phase).toBe('idle');
  });
  it('B9 gCancel：任意活跃态一键回 idle（pointercancel/Esc 底座）', () => {
    const g = createGesture();
    g.phase = 'orb'; g.pull = 100;
    gCancel(g);
    expect(g.phase).toBe('idle');
    expect(g.pull).toBe(0);
  });
  it('B10 验收边界④：非右缘松手（drip 起步即松）不呼出面板——预设距离未达语义', () => {
    const g = createGesture();
    gBegin(g, { x: W - 4, y: 300, t: 0 }, W);
    gPending(g, { x: W - 4, y: 300, t: SB.HOLD_CONFIRM_MS }, W);
    gDrag(g, { x: W - 6, y: 302 }, W, H); // pull=2 < 阈值
    expect(gRelease(g, W, H)).toBe('cancel');
  });
});

describe('v253 C · squeeze-row 按压整排联动（自创公式锚定）', () => {
  it('C1 中心项压扁到 SQUEEZE_MAX_SQUASH，圆角增量满额', () => {
    const rows = squeezeRow(2, 6);
    expect(rows[2].scale).toBe(SB.SQUEEZE_MAX_SQUASH);
    expect(rows[2].radius).toBe(SB.SQUEEZE_RADIUS_GAIN);
  });
  it('C2 邻项按距离线性衰减（压强扩散单调：越近压扁越强 scaleY 越小）', () => {
    const rows = squeezeRow(2, 6);
    expect(rows[1].scale).toBeGreaterThan(rows[2].scale); // 邻项弱于中心
    expect(rows[1].scale).toBeLessThan(rows[0].scale); // 距离 1 强于距离 2
    expect(rows[3].scale).toBeCloseTo(rows[1].scale, 10); // 对称
    expect(rows[0].radius).toBeLessThan(rows[1].radius);
  });
  it('C3 联动半径外（> SQUEEZE_REACH）零扰动', () => {
    const rows = squeezeRow(2, 6);
    rows.forEach((r, i) => {
      if (Math.abs(i - 2) > SB.SQUEEZE_REACH) {
        expect(r.scale).toBe(1);
        expect(r.radius).toBe(0);
      }
    });
  });
  it('C4 无按压（-1）全复位；单元素列表只压自身', () => {
    expect(squeezeRow(-1, 4).every((r) => r.scale === 1 && r.radius === 0)).toBe(true);
    const one = squeezeRow(0, 1);
    expect(one[0].scale).toBe(SB.SQUEEZE_MAX_SQUASH);
  });
});

describe('v253 D · 停顿消歧仲裁 + 全链路集成（happy-dom）', () => {
  beforeAll(() => { initSideBubble(); });

  const down = (x, y) => document.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, button: 0 }));
  const move = (x, y) => window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y }));
  const up = (x, y) => window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: x, clientY: y }));
  // spy 时钟（零真实 sleep：不占用并发窗口，避免 happy-dom frame 销毁竞态压力放大）
  let clock = 0;
  let clockSpy = null;
  const armClock = () => {
    clock = 0;
    clockSpy = vi.spyOn(performance, 'now').mockImplementation(() => clock);
  };
  const disarmClock = () => { if (clockSpy) { clockSpy.mockRestore(); clockSpy = null; } };

  it('D1 快速滑动（停顿前移动超 slop）→ 不接管（让位 EDGE_RIGHT 返回手势）', async () => {
    armClock();
    down(W - 10, 300);
    clock += 50; // 未满停顿时长
    move(W - 40, 300); // 30px 位移 > slop
    expect(isSideBubbleActive()).toBe(false);
    up(W - 60, 300);
    expect(isSideBubbleActive()).toBe(false);
    disarmClock();
  });

  it('D2 全链路：停顿确认 → 拉出分离 → 松手 → 停驻球 + 面板展开（验收①⑤）', async () => {
    armClock();
    down(W - 8, 300);
    clock += SB.HOLD_CONFIRM_MS + 1; // 停顿期满
    move(W - 8, 300); // 首次 move → armed
    expect(isSideBubbleActive()).toBe(true);
    // 拉出过分离阈值（垂直位移大）
    move(W - 8 - SB.SEPARATE_DIST - 10, 420);
    const orb = document.getElementById('mdSidebubbleOrb');
    expect(orb.classList.contains('on')).toBe(true);
    expect(orb.classList.contains('orb')).toBe(true);
    // 松手 → panel
    up(W - 8 - SB.SEPARATE_DIST - 10, 420);
    const panel = document.getElementById('mdSidebubblePanel');
    expect(panel.classList.contains('open')).toBe(true);
    expect(panel.getAttribute('aria-hidden')).toBe('false');
    // 最近应用列 = getRecentAppsList 单源渲染（非空、非硬编码清单由 recent-apps 提供）
    const items = panel.querySelectorAll('.sb-item');
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].dataset.appId).toBeTruthy();
    disarmClock();
  });

  it('D3 squeeze-row 接线：按压列表项 → 中心项 scaleY 压扁写入（验收⑤ DOM 面）', async () => {
    const panel = document.getElementById('mdSidebubblePanel');
    const first = panel.querySelector('.sb-item');
    expect(first).toBeTruthy();
    first.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(first.style.transform).toContain(`scaleY(${SB.SQUEEZE_MAX_SQUASH.toFixed(3)})`);
    window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
  });

  it('D4 Esc 收起面板保留停驻球（#55 纪律 · 验收⑥收起语义）；停驻球点击复呼', async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const panel = document.getElementById('mdSidebubblePanel');
    const orb = document.getElementById('mdSidebubbleOrb');
    expect(panel.classList.contains('open')).toBe(false);
    expect(orb.classList.contains('resting')).toBe(true);
    // 停驻球点击 → 复呼（gRestTap 路径）
    orb.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(panel.classList.contains('open')).toBe(true);
    // 面板外点击 → 收起保留停驻
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100 }));
    expect(panel.classList.contains('open')).toBe(false);
    expect(orb.classList.contains('resting')).toBe(true);
  });

  it('D5 一段内松手（未达分离阈值）→ 回吸消失不呼出（gRelease cancel 接线面）', async () => {
    armClock();
    down(W - 8, 200);
    clock += SB.HOLD_CONFIRM_MS + 1;
    move(W - 8, 200); // armed
    move(W - 30, 210); // pull=22 < 阈值 → drip
    const orb = document.getElementById('mdSidebubbleOrb');
    expect(orb.classList.contains('on')).toBe(true);
    up(W - 30, 210);
    expect(document.getElementById('mdSidebubblePanel').classList.contains('open')).toBe(false);
    expect(isSideBubbleActive()).toBe(false);
    disarmClock();
  });
});

describe('v253 E · I 断言同口径自检（#230 评分卡第 I 项 · 验收②）', () => {
  it('E1 sidebubble.css 过 checkI（状态层 --md-state- ≥1 通道）', () => {
    const r = checkI(CSS_SRC);
    expect(r.pass).toBe(true);
    expect((CSS_SRC.match(/var\(--md-state-/g) || []).length).toBeGreaterThanOrEqual(1);
  });
  it('E2 全 --md-* 令牌 + @media 760 双断点（准入①②）+ 字体契约', () => {
    expect((CSS_SRC.match(/var\(--md-/g) || []).length).toBeGreaterThanOrEqual(15);
    expect(CSS_SRC.match(/@media\s*\(min-width:\s*760px\)/)).toBeTruthy();
    expect(CSS_SRC).toContain('--md-font'); // 字体契约（I 替代通道构成面）
  });
});

describe('v253 F/G/H · 纪律负向锚（#242 全局闸门 / 准入① / 自创标注 / Esc）', () => {
  it('F1 零新 window.__ 全局（#242 登记表闸门：新模块不挂新全局；比较运算不误报）', () => {
    // sidebubble.js 自身不新增 window.__ 赋值（消费既有 __miniWindowAll 只读除外）
    const adds = JS_SRC.match(/window\.__[A-Za-z0-9_]+\s*=(?![=>])/g) || [];
    expect(adds).toEqual([]);
  });
  it('F2 JS 源零 hex 裸色（准入①：色彩一律 --md-* 令牌；议题号 #NNN 与 rgba fallback 存量同律排除）', () => {
    // hex 必须含 a-f 字母，纯数字 #253 是议题号引用非颜色
    const hexRe = /#(?=[0-9a-fA-F]*[a-fA-F])[0-9a-fA-F]{3,8}\b/g;
    expect(JS_SRC.match(hexRe) || []).toEqual([]);
    expect(CSS_SRC.match(hexRe) || []).toEqual([]);
  });
  it('G1 自创标注可见 ≥3 处 + 专利思路提取来源 ≥2 处（#253 §二 退级规则）', () => {
    expect((JS_SRC.match(/自创/g) || []).length).toBeGreaterThanOrEqual(3);
    expect((JS_SRC.match(/WO2026108297A1/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(CSS_SRC).toContain('WO2026108297A1');
  });
  it('H1 Esc 可关在案（#55 纪律）+ 常量集中单文件头部（#253 §四）', () => {
    expect(JS_SRC).toContain("'Escape'");
    expect(JS_SRC.indexOf('export const SB')).toBeLessThan(JS_SRC.indexOf('export function arcY'));
  });
});
