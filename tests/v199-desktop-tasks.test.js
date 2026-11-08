// ==================== v199-desktop-tasks.test.js — #199 WM Shell desktopmode 治理层 ====================
//
// 覆盖（AOSP DesktopTasksLimiter.kt / DesktopModeVisualIndicator.kt /
//       WindowDecorCaptionHandleRepository.kt 同构纯逻辑 + mini-window 接线）：
//   1. limiter 构造：require(maxTasksLimit > 0)（RangeError）+ 默认值
//   2. admitTask 语义：新窗口永不拒绝（admitted 恒 true）+ 超限送走栈底 + 隐藏任务不计入
//   3. z 序语义：touchTask 触顶转移栈底 + visibleOrderedTasks top-first
//   4. 上限重配：setMaxTasksLimit require > 0 + 收紧后下次入场收敛
//   5. visual indicator：三落点判定（顶含两角优先全屏）+ 目标矩形 + shouldShowIndicator
//   6. caption：双击判定（间隔/位移/拖拽退役）+ 沉浸可见性四态
//   7. 接线锚：mini-window 三模块消费 + limiter 五面接线 + CSS 三态类 + 回归锚
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const read = (p) => readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', p), 'utf8');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

import { createDesktopTasksLimiter, DEFAULT_MAX_TASKS_LIMIT } from '../ios-desktop/js/aosp/desktop-tasks-limiter.js';
import { DROP_ZONE, resolveDropZone, getDropTargetBounds, shouldShowIndicator, EDGE_TRIGGER_PX } from '../ios-desktop/js/aosp/desktop-visual-indicator.js';
import { createCaptionHandle, captionVisibility, CAPTION_DOUBLE_TAP_MS, CAPTION_DOUBLE_TAP_SLOP_PX, CAPTION_DRAG_SLOP_PX } from '../ios-desktop/js/aosp/window-caption.js';

describe('A — DesktopTasksLimiter 构造（AOSP require(maxTasksLimit > 0) 同构）', () => {
  it('合法构造：默认上限 = 6（#199 落点建议值）', () => {
    const L = createDesktopTasksLimiter();
    expect(L.maxTasksLimit()).toBe(DEFAULT_MAX_TASKS_LIMIT);
    expect(DEFAULT_MAX_TASKS_LIMIT).toBe(6);
  });

  it('require(maxTasksLimit > 0)：0/负数/NaN/Infinity 一律 RangeError（构造期即崩，不带病运行）', () => {
    expect(() => createDesktopTasksLimiter({ maxTasksLimit: 0 })).toThrow(RangeError);
    expect(() => createDesktopTasksLimiter({ maxTasksLimit: -1 })).toThrow(RangeError);
    expect(() => createDesktopTasksLimiter({ maxTasksLimit: NaN })).toThrow(RangeError);
    expect(() => createDesktopTasksLimiter({ maxTasksLimit: Infinity })).toThrow(RangeError);
    expect(() => createDesktopTasksLimiter({ maxTasksLimit: 1 })).not.toThrow();
  });
});

describe('B — admitTask：新窗口永不拒绝 + 超限自动最小化栈底（DesktopTasksLimiter.kt 同构）', () => {
  it('上限内逐个放行：minimizeTaskId 恒 null', () => {
    const L = createDesktopTasksLimiter({ maxTasksLimit: 3 });
    expect(L.admitTask('a')).toEqual({ admitted: true, minimizeTaskId: null });
    expect(L.admitTask('b')).toEqual({ admitted: true, minimizeTaskId: null });
    expect(L.admitTask('c')).toEqual({ admitted: true, minimizeTaskId: null });
    expect(L.visibleCount()).toBe(3);
  });

  it('第 N+1 个入场 → admitted 仍为 true（新窗口永不拒绝）+ 栈底任务被送走（visibleOrderedTasks.last()）', () => {
    const L = createDesktopTasksLimiter({ maxTasksLimit: 3 });
    L.admitTask('t1'); L.admitTask('t2'); L.admitTask('t3');
    const v = L.admitTask('t4');
    expect(v.admitted).toBe(true);            // 永不拒绝（AOSP 语义：代价由栈底承担）
    expect(v.minimizeTaskId).toBe('t1');      // 栈底 = 最早且最久未触顶
    L.setVisible('t1', false);                // 调用方执行最小化后
    expect(L.visibleCount()).toBe(3);         // 可见数回落 = 上限（t2/t3/t4）
    expect(L.getTaskIdToMinimize()).toBe('t2'); // 下一个栈底顺延
  });

  it('隐藏（最小化）任务不计入上限：restore 后重新计入', () => {
    const L = createDesktopTasksLimiter({ maxTasksLimit: 2 });
    L.admitTask('a'); L.admitTask('b');
    L.setVisible('a', false);
    expect(L.visibleCount()).toBe(1);
    const v = L.admitTask('c');
    expect(v.minimizeTaskId).toBeNull();      // 隐藏任务让位，无需再收
    L.setVisible('a', true);
    expect(L.visibleCount()).toBe(3);         // restore 重新计入（超限由下次入场收敛）
  });

  it('重复入场（同 id）不重复计数：仅触顶', () => {
    const L = createDesktopTasksLimiter({ maxTasksLimit: 2 });
    L.admitTask('a'); L.admitTask('b');
    const v = L.admitTask('a');               // 同应用重复请求 → 触顶不重复注册
    expect(v.minimizeTaskId).toBeNull();
    expect(L.visibleCount()).toBe(2);
  });

  it('unregisterTask 离场即注销：空注册表 getTaskIdToMinimize 返回 null', () => {
    const L = createDesktopTasksLimiter({ maxTasksLimit: 1 });
    L.admitTask('only');
    L.unregisterTask('only');
    expect(L.visibleCount()).toBe(0);
    expect(L.getTaskIdToMinimize()).toBeNull();
    expect(L.admitTask('next').minimizeTaskId).toBeNull();
  });
});

describe('C — z 序语义：touchTask 触顶转移栈底（AOSP visibleOrderedTasks z-order）', () => {
  it('visibleOrderedTasks top-first：index 0 = 最近触顶；栈底 = 最久未触顶', () => {
    const L = createDesktopTasksLimiter({ maxTasksLimit: 10 });
    L.admitTask('a'); L.admitTask('b'); L.admitTask('c');
    expect(L.visibleOrderedTasks()).toEqual(['c', 'b', 'a']); // 后开者在顶
    L.touchTask('a');                          // 点击置顶 a
    expect(L.visibleOrderedTasks()).toEqual(['a', 'c', 'b']);
    expect(L.getTaskIdToMinimize()).toBe('b'); // 栈底从 a 转移到 b
  });

  it('AOSP getTaskIdToMinimize = visibleOrderedTasks.last()：z 序末位即最早未触顶', () => {
    const L = createDesktopTasksLimiter({ maxTasksLimit: 10 });
    L.admitTask('x'); L.admitTask('y');
    L.touchTask('x'); L.touchTask('y'); L.touchTask('x');
    expect(L.visibleOrderedTasks()[L.visibleOrderedTasks().length - 1]).toBe('y');
    expect(L.getTaskIdToMinimize()).toBe('y');
  });

  it('超限送走的栈底排除新任务自身（md3 防御裁决：新窗开即自最小化为观感悖论）', () => {
    const L = createDesktopTasksLimiter({ maxTasksLimit: 1 });
    const v = L.admitTask('solo');
    // 上限 1 且注册表空：solo 入场后 visible=1 ≤ 1 不触发
    expect(v.minimizeTaskId).toBeNull();
    L.admitTask('second');
    // second 入场时 visible=2 > 1 → 栈底 = solo（second 自身被排除）
    L.setVisible('solo', false);
    expect(L.visibleCount()).toBe(1);
  });
});

describe('D — 上限重配（#199 验收四：可配置，对齐 maxTasksLimit 构造注入语义）', () => {
  it('setMaxTasksLimit require > 0：非法值 RangeError，合法值即时生效', () => {
    const L = createDesktopTasksLimiter({ maxTasksLimit: 2 });
    expect(() => L.setMaxTasksLimit(0)).toThrow(RangeError);
    expect(() => L.setMaxTasksLimit(-3)).toThrow(RangeError);
    L.setMaxTasksLimit(5);
    expect(L.maxTasksLimit()).toBe(5);
  });

  it('收紧后由下一次入场事件收敛（不主动批量清理 —— AOSP 事件驱动语义）', () => {
    const L = createDesktopTasksLimiter({ maxTasksLimit: 5 });
    ['a', 'b', 'c'].forEach((id) => L.admitTask(id));
    L.setMaxTasksLimit(2);                      // 存量 3 > 新上限 2
    expect(L.visibleCount()).toBe(3);           // 不主动清理（裁决在录）
    const v = L.admitTask('d');                 // 下次入场触发收敛
    expect(v.minimizeTaskId).toBe('a');         // 送走栈底
  });
});

describe('E — DesktopModeVisualIndicator：三落点判定与目标矩形', () => {
  it('常量区：DROP_ZONE 四值 + EDGE_TRIGGER_PX = 48', () => {
    expect(DROP_ZONE.NONE).toBe('none');
    expect(DROP_ZONE.LEFT_HALF).toBe('left-half');
    expect(DROP_ZONE.RIGHT_HALF).toBe('right-half');
    expect(DROP_ZONE.FULLSCREEN).toBe('fullscreen');
    expect(EDGE_TRIGGER_PX).toBe(48);
  });

  it('左边缘 → left-half；右边缘 → right-half；内部 → none', () => {
    const vw = 400, vh = 800;
    expect(resolveDropZone({ x: 10, y: 400, vw, vh })).toBe(DROP_ZONE.LEFT_HALF);
    expect(resolveDropZone({ x: vw - 10, y: 400, vw, vh })).toBe(DROP_ZONE.RIGHT_HALF);
    expect(resolveDropZone({ x: 200, y: 400, vw, vh })).toBe(DROP_ZONE.NONE);
    expect(resolveDropZone({ x: 47, y: 400, vw, vh })).toBe(DROP_ZONE.LEFT_HALF);   // 阈值边界内
    expect(resolveDropZone({ x: 49, y: 400, vw, vh })).toBe(DROP_ZONE.NONE);        // 阈值外
  });

  it('顶边缘（含两角）优先 → fullscreen（AOSP 顶部角全屏指示语义）', () => {
    const vw = 400, vh = 800;
    expect(resolveDropZone({ x: 200, y: 10, vw, vh })).toBe(DROP_ZONE.FULLSCREEN);
    expect(resolveDropZone({ x: 5, y: 5, vw, vh })).toBe(DROP_ZONE.FULLSCREEN);     // 左角
    expect(resolveDropZone({ x: vw - 5, y: 5, vw, vh })).toBe(DROP_ZONE.FULLSCREEN); // 右角
  });

  it('自定义阈值 + 非法输入回退 none', () => {
    expect(resolveDropZone({ x: 30, y: 400, vw: 400, vh: 800 }, { edge: 24 })).toBe(DROP_ZONE.NONE);
    expect(resolveDropZone({ x: 20, y: 400, vw: 400, vh: 800 }, { edge: 24 })).toBe(DROP_ZONE.LEFT_HALF);
    expect(resolveDropZone(null)).toBe(DROP_ZONE.NONE);
    expect(resolveDropZone({ x: NaN, y: 400, vw: 400, vh: 800 })).toBe(DROP_ZONE.NONE);
  });

  it('目标矩形：半屏各半宽留缝 + 全屏内缩 + none 返回 null', () => {
    const b = getDropTargetBounds(DROP_ZONE.LEFT_HALF, 400, 800, { margin: 8 });
    expect(b).toEqual({ x: 8, y: 8, w: 188, h: 784 });          // 400/2 - 12 = 188（两窗留缝）
    const r = getDropTargetBounds(DROP_ZONE.RIGHT_HALF, 400, 800, { margin: 8 });
    expect(r.x).toBe(204);                                       // 200 + 4（左右缘 8/中缝 8 对称）
    expect(r.w).toBe(188);
    const f = getDropTargetBounds(DROP_ZONE.FULLSCREEN, 400, 800, { margin: 8 });
    expect(f).toEqual({ x: 8, y: 8, w: 384, h: 784 });
    expect(getDropTargetBounds(DROP_ZONE.NONE, 400, 800)).toBeNull();
  });

  it('shouldShowIndicator：none 不呈现', () => {
    expect(shouldShowIndicator(DROP_ZONE.NONE)).toBe(false);
    expect(shouldShowIndicator(DROP_ZONE.LEFT_HALF)).toBe(true);
    expect(shouldShowIndicator(DROP_ZONE.FULLSCREEN)).toBe(true);
  });
});

describe('F — WindowDecorCaptionHandle：双击判定与沉浸可见性', () => {
  const MS = CAPTION_DOUBLE_TAP_MS, SLOP = CAPTION_DOUBLE_TAP_SLOP_PX, DRAG = CAPTION_DRAG_SLOP_PX;

  it('常量区：双击窗口 300ms / 位移容差 12px / 拖拽 slop 6px', () => {
    expect(MS).toBe(300);
    expect(SLOP).toBe(12);
    expect(DRAG).toBe(6);
  });

  it('快速两击 → 双击触发 toggleMaximize（位移小 + 间隔 < 300ms）', () => {
    let t = 0;
    let toggled = 0;
    const h = createCaptionHandle({ onToggleMaximize: () => toggled++, now: () => t });
    h.down(100, 100); h.up(100, 100);       // 第一击
    t = 150;                                 // 间隔 150ms < 300
    h.down(102, 102); h.up(102, 102);       // 第二击（位移 2 < 12）
    expect(toggled).toBe(1);
  });

  it('间隔超时 / 大位移 / 三击不连发，均不误判（每组独立实例隔离）', () => {
    let t = 0;
    // 超时：两击间隔 500ms > 300ms
    let toggled = 0;
    let h = createCaptionHandle({ onToggleMaximize: () => toggled++, now: () => t });
    h.down(100, 100); h.up(100, 100);
    t = 500;
    h.down(100, 100); h.up(100, 100);
    expect(toggled).toBe(0);
    // 大位移：两击位移 50 > 12（间隔合法）
    toggled = 0; t = 1000;
    h = createCaptionHandle({ onToggleMaximize: () => toggled++, now: () => t });
    h.down(100, 100); h.up(100, 100);
    t = 1100;
    h.down(150, 150); h.up(150, 150);
    expect(toggled).toBe(0);
    // 三击不连发：双击触发后 lastUp 消费重置，第三击不再成对
    toggled = 0; t = 2000;
    h = createCaptionHandle({ onToggleMaximize: () => toggled++, now: () => t });
    h.down(100, 100); h.up(100, 100);
    t = 2100; h.down(100, 100); h.up(100, 100); // 双击 #1
    expect(toggled).toBe(1);
    t = 2200; h.down(100, 100); h.up(100, 100); // 第三击（lastUp 已消费置空）
    expect(toggled).toBe(1);
  });

  it('拖拽手势退役双击：move 超 slop 后 up 不计入', () => {
    let t = 0;
    let toggled = 0;
    const h = createCaptionHandle({ onToggleMaximize: () => toggled++, now: () => t });
    h.down(100, 100);
    h.move(140, 100);                        // 拖拽启动（> 6px）
    expect(h.isDragging()).toBe(true);
    h.up(140, 100);                          // 拖拽松手
    t = 100;
    h.down(140, 100); h.up(140, 100);        // 紧接一击（与拖拽松手间不成双击）
    expect(toggled).toBe(0);
    expect(h.isDragging()).toBe(false);
  });

  it('captionVisibility 沉浸四态：非最大化常显；最大化隐藏，hover/拖拽唤出', () => {
    expect(captionVisibility({ maximized: false })).toBe('visible');
    expect(captionVisibility({ maximized: true })).toBe('hidden');
    expect(captionVisibility({ maximized: true, hovered: true })).toBe('visible');
    expect(captionVisibility({ maximized: true, dragging: true })).toBe('visible');
    expect(captionVisibility(null)).toBe('visible');
  });
});

describe('G — mini-window 接线锚（v10.62 #199 真实消费，#149 注释=代码纪律）', () => {
  it('三模块 import 在场（limiter / indicator / caption）', () => {
    const src = read('ios-desktop/js/mini-window.js');
    expect(src).toContain("from './aosp/desktop-tasks-limiter.js'");
    expect(src).toContain("from './aosp/desktop-visual-indicator.js'");
    expect(src).toContain("from './aosp/window-caption.js'");
  });

  it('limiter 实例与五面接线：admitTask / touchTask / setVisible / unregisterTask / setDesktopTasksLimit', () => {
    const src = read('ios-desktop/js/mini-window.js');
    expect(src).toMatch(/const tasksLimiter = createDesktopTasksLimiter\(\{ maxTasksLimit: DESKTOP_TASKS_LIMIT \}\)/);
    expect(src).toMatch(/const admitVerdict = tasksLimiter\.admitTask\(appId\);/);
    expect(src).toMatch(/if \(admitVerdict\.minimizeTaskId\) minimizeMiniWindow\(admitVerdict\.minimizeTaskId\);/);
    expect(src).toContain('tasksLimiter.touchTask(m.appId)');
    expect(src).toContain('tasksLimiter.setVisible(appId, false)');
    expect(src).toContain('tasksLimiter.setVisible(appId, true)');
    expect(src).toContain('tasksLimiter.unregisterTask(m.appId)');
    expect(src).toContain('tasksLimiter.unregisterTask(appId)');
    expect(src).toMatch(/export function setDesktopTasksLimit\(n\) \{ tasksLimiter\.setMaxTasksLimit\(n\); \}/);
    expect(src).toContain('export const DESKTOP_TASKS_LIMIT = 6');
  });

  it('入场失败回滚：app 查找失败 / ensureMiniState 失败双路径 unregisterTask', () => {
    const src = read('ios-desktop/js/mini-window.js');
    expect(src).toMatch(/if \(!app\) \{ tasksLimiter\.unregisterTask\(appId\); return false; \}/);
    expect(src).toMatch(/const admitted = !!ensureMiniState\(appId, fromRect\);\s*\n\s*if \(!admitted\) tasksLimiter\.unregisterTask\(appId\);/);
  });

  it('题签双击接线：caption handle 绑 header + toggleMiniMaximize 消费 getDropTargetBounds(FULLSCREEN)', () => {
    const src = read('ios-desktop/js/mini-window.js');
    expect(src).toMatch(/createCaptionHandle\(\{ onToggleMaximize: \(\) => toggleMiniMaximize\(m\) \}\)/);
    expect(src).toContain('caption.down(e.clientX, e.clientY)');
    expect(src).toContain('caption.move(e.clientX, e.clientY)');
    expect(src).toContain('caption.up(e.clientX, e.clientY)');
    expect(src).toMatch(/function toggleMiniMaximize\(m\)/);
    expect(src).toMatch(/getDropTargetBounds\(DROP_ZONE\.FULLSCREEN, window\.innerWidth, window\.innerHeight, \{ margin: EDGE_MARGIN \}\)/);
    expect(src).toContain('m.preMaxRect');
    expect(src).toContain("classList.add('mini-maximized')");
  });

  it('三落点接线：move 判定预示 + endDrag 消费（半屏 startDropSettle / 全屏 takeover）', () => {
    const src = read('ios-desktop/js/mini-window.js');
    expect(src).toMatch(/resolveDropZone\(\{ x: e\.clientX, y: e\.clientY, vw: window\.innerWidth, vh: window\.innerHeight \}\)/);
    expect(src).toContain('drag.zone = zone');
    expect(src).toContain('updateVisualIndicator(zone)');
    expect(src).toContain('hideVisualIndicator()');
    expect(src).toMatch(/if \(zone === DROP_ZONE\.LEFT_HALF \|\| zone === DROP_ZONE\.RIGHT_HALF\) \{/);
    expect(src).toMatch(/startDropSettle\(m, target\.x, target\.y, tw, th, vx, vy\)/);
    expect(src).toMatch(/if \(zone === DROP_ZONE\.FULLSCREEN\) \{\s*\n\s*takeoverToFullscreen\(m\.appId\);/);
  });

  it('指示器 DOM：#desktopVisualIndicator 动建 + 三态类 + aria-hidden', () => {
    const src = read('ios-desktop/js/mini-window.js');
    expect(src).toContain("indicatorEl.id = 'desktopVisualIndicator'");
    expect(src).toContain("indicatorEl.setAttribute('aria-hidden', 'true')");
    expect(src).toContain("el.classList.toggle('zone-left', zone === DROP_ZONE.LEFT_HALF)");
    expect(src).toContain("el.classList.toggle('zone-right', zone === DROP_ZONE.RIGHT_HALF)");
    expect(src).toContain("el.classList.toggle('zone-full', zone === DROP_ZONE.FULLSCREEN)");
  });

  it('startDropSettle 四通道单循环：位置+尺寸同 rAF（互不抢柄）+ 实例离场终止', () => {
    const src = read('ios-desktop/js/mini-window.js');
    expect(src).toMatch(/function startDropSettle\(m, tx, ty, tw, th, vx, vy\)/);
    expect(src).toMatch(/m\.posSpring\.update\(dt\);\s*\n\s*m\.wSpring\.update\(dt\);\s*\n\s*m\.hSpring\.update\(dt\);/);
    expect(src).toMatch(/minis\.get\(m\.appId\) !== m\) return;\s*\/\/ 已关闭\/被替换/);
  });

  it('CSS 消费：三落点预示层三态类 + 沉浸题签 hover 唤出', () => {
    const css = read('ios-desktop/css/mini-window.css');
    expect(css).toMatch(/\.desktop-visual-indicator \{/);
    expect(css).toMatch(/\.desktop-visual-indicator\.zone-left::before/);
    expect(css).toMatch(/\.desktop-visual-indicator\.zone-right::before/);
    expect(css).toMatch(/\.desktop-visual-indicator\.zone-full::before/);
    expect(css).toMatch(/\.mini-window\.mini-maximized \.mini-header \{[\s\S]*?opacity: 0/);
    expect(css).toMatch(/\.mini-window\.mini-maximized:hover \.mini-header/);
    expect(css).toContain('z-index: 585');
  });

  it('v9.08 #153 回归锚：visibleCount 函数体与 chipOldest 实体保持（v757 在册），MINI_WINDOW_MAX 兼容导出', () => {
    const src = read('ios-desktop/js/mini-window.js');
    expect(src).toMatch(/function visibleCount\(\) \{[\s\S]*?if \(!m\.minimized\) n\+\+;/);
    expect(src).toContain('export const MINI_WINDOW_MAX = 4');
    expect(src).toMatch(/function chipOldest\(\) \{[\s\S]*?minimizeMiniWindow\(m\.appId\)/);
  });

  it('模块导入冒烟：mini-window 可在 happy-dom 下加载且新导出在场', async () => {
    const m = await import('../ios-desktop/js/mini-window.js');
    expect(m.MINI_WINDOW_MAX).toBe(4);
    expect(m.DESKTOP_TASKS_LIMIT).toBe(6);
    expect(typeof m.setDesktopTasksLimit).toBe('function');
    expect(typeof m.rubberband).toBe('function'); // v7.53 消费兼容回归
  });
});
