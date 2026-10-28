// ==================== v860-taskbar.test.js — #72 平板任务栏 Taskbar ====================
//
// 覆盖（#72 DoD 逐条）：
//   · 纯函数核（taskbar-core）：TaskbarProfile.kt 三分支构造 / TaskbarStashController
//     标志位（位值与 lineage-24.0 源码一致）与 isStashed 掩码 / computeStash 语境映射 /
//     TaskbarView.calculateMaxNumIcons 容量算式 / partitionApps 溢出不丢项 / runningProjection 单源投影
//   · 场景 DOM：断点切换（<768 Dock / ≥768 Taskbar 两态互斥）/ 三段内容（固定+运行+导航+
//     All Apps）/ 运行指示条（recent-apps 单源）/ 溢出面板不丢项 / 收纳-解收纳双态（JS 弹簧
//     0.5 缩放）/ 设置开关持久化 / --taskbar-space 让位
//   · 接线锚：main.js 引入+初始化 / index.html 样式链接 / desktop-prefs 默认开 /
//     settings.js 开关双向 / dock.js taskbar-changed 互斥同步 / 数值原值锚（56/48/12/44/16/220×4/417/5000/0.5/1.1）
//   · 弹簧纪律：不经 CSS transition（html.no-anim 不杀动效）

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bootDesktop, setScreenSize } from './scenario-helpers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');

// scheduleRender / syncPresence 走 rAF（happy-dom 由定时器驱动）—— DOM 断言前等一帧落定
const tick = () => new Promise((r) => setTimeout(r, 80));

let core;
let tb;     // taskbar.js 模块（__taskbarTestHooks）
let W;      // 场景 window
let hooks;

beforeAll(async () => {
  W = await bootDesktop(); // 手机断点 412×915 引导（锁屏由 nolock 等价跳过：boot 后即解锁态）
  W.__lockTest.instantUnlock();
  core = await import('../ios-desktop/js/taskbar-core.js');
  tb = await import('../ios-desktop/js/taskbar.js');
  hooks = tb.__taskbarTestHooks();
});

// ==================== A. 纯函数核（lineage-24.0 源码实证） ====================

describe('A1. TaskbarProfile.kt 三分支构造（§1.4 实测值）', () => {
  test("persistent：iconSize=44 / height=56 / bottomMargin=0 / stashedHeight=24(taskbar_stashed_size)", () => {
    expect(core.taskbarProfile('persistent')).toEqual({
      iconSize: 44, height: 56, bottomMargin: 0, stashedHeight: 24,
    });
  });
  test("transient：iconSize=57 / bottomMargin=24 / stashedHeight=32", () => {
    expect(core.taskbarProfile('transient')).toEqual({
      iconSize: 57, height: 56, bottomMargin: 24, stashedHeight: 32,
    });
  });
  test("'none'：全 0（手机断点走 Dock 范式）", () => {
    expect(core.taskbarProfile('none')).toEqual({
      iconSize: 0, height: 0, bottomMargin: 0, stashedHeight: 0,
    });
  });
});

describe('A2. 收纳状态机标志位（TaskbarStashController.java 位值）', () => {
  test('标志位值与源码一致（1<<0 / 1<<3 / 1<<4 / 1<<5 / 1<<8 / 1<<11 / 1<<14）', () => {
    expect(core.FLAG_IN_APP).toBe(1 << 0);
    expect(core.FLAG_STASHED_IME).toBe(1 << 3);
    expect(core.FLAG_IN_STASHED_LAUNCHER_STATE).toBe(1 << 4);
    expect(core.FLAG_STASHED_IN_TASKBAR_ALL_APPS).toBe(1 << 5);
    expect(core.FLAG_STASHED_IN_APP_AUTO).toBe(1 << 8);
    expect(core.FLAG_IN_OVERVIEW).toBe(1 << 11);
    expect(core.FLAG_TASKBAR_HIDDEN).toBe(1 << 14);
  });
  test('isStashed 掩码语义：AUTO/IME/ALL_APPS/HIDDEN/LAUNCHER 收纳；IN_APP 与 IN_OVERVIEW 不收纳', () => {
    expect(core.isStashedFlags(core.FLAG_STASHED_IN_APP_AUTO)).toBe(true);
    expect(core.isStashedFlags(core.FLAG_STASHED_IME)).toBe(true);
    expect(core.isStashedFlags(core.FLAG_STASHED_IN_TASKBAR_ALL_APPS)).toBe(true);
    expect(core.isStashedFlags(core.FLAG_TASKBAR_HIDDEN)).toBe(true);
    expect(core.isStashedFlags(core.FLAG_IN_STASHED_LAUNCHER_STATE)).toBe(true);
    expect(core.isStashedFlags(core.FLAG_IN_APP)).toBe(false);
    expect(core.isStashedFlags(core.FLAG_IN_OVERVIEW)).toBe(false);
    expect(core.isStashedFlags(0)).toBe(false);
  });
  test('computeStash 语境映射：锁屏→HIDDEN / 应用内+超时→AUTO / All Apps→ALL_APPS / 概览不收纳', () => {
    const locked = core.computeStash({ locked: true });
    expect(locked.flags & core.FLAG_TASKBAR_HIDDEN).toBeTruthy();
    expect(locked.stashed).toBe(true);

    const auto = core.computeStash({ inApp: true, autoStash: true });
    expect(auto.flags & core.FLAG_IN_APP).toBeTruthy();
    expect(auto.flags & core.FLAG_STASHED_IN_APP_AUTO).toBeTruthy();
    expect(auto.stashed).toBe(true);

    const inAppFresh = core.computeStash({ inApp: true, autoStash: false });
    expect(inAppFresh.stashed).toBe(false); // 应用内未超时：任务栏可见（transient 展开态）

    const aa = core.computeStash({ allAppsOpen: true });
    expect(aa.flags & core.FLAG_STASHED_IN_TASKBAR_ALL_APPS).toBeTruthy();
    expect(aa.stashed).toBe(true);

    const ov = core.computeStash({ overviewOpen: true });
    expect(ov.flags & core.FLAG_IN_OVERVIEW).toBeTruthy();
    expect(ov.stashed).toBe(false); // 概览中任务栏仍可见（IN_OVERVIEW 不入掩码）
  });
});

describe('A3. 容量与溢出（TaskbarView.calculateMaxNumIcons 同构）', () => {
  test('iconSize = 2×margin + touch = 72：整数倍边界精确落位', () => {
    // available=72 → 恰好 1 格 + additional 1 = 2
    expect(core.calculateMaxNumIcons(72 + 252, { reservedW: 252 })).toBe(2);
    // available=71 → 0 格 + 1 = 1，但不低于恒显下限 2
    expect(core.calculateMaxNumIcons(71 + 252, { reservedW: 252 })).toBe(2);
  });
  test('宽容器线性扩展（1280 平板：reserved 252 → available 1028 → 14+1）', () => {
    expect(core.calculateMaxNumIcons(1280, { reservedW: 252 })).toBe(15);
  });
  test('恒显下限 = NUM_ALWAYS_VISIBLE_TASKBAR_ICONS(2)，零宽/负宽不崩', () => {
    expect(core.calculateMaxNumIcons(0, { reservedW: 252 })).toBe(2);
    expect(core.calculateMaxNumIcons(-50, { reservedW: 252 })).toBe(2);
    expect(core.NUM_ALWAYS_VISIBLE_TASKBAR_ICONS).toBe(2);
  });
  test('partitionApps：切分无损、保序（visible+overflow === 原序列）', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const r = core.partitionApps(ids, 3);
    expect(r.visible).toEqual(['a', 'b', 'c']);
    expect(r.overflow).toEqual(['d', 'e']);
    expect(r.visible.concat(r.overflow)).toEqual(ids);
  });
  test('partitionApps：上限 0 / 空 / 脏值过滤', () => {
    expect(core.partitionApps(['a'], 0).overflow).toEqual(['a']);
    expect(core.partitionApps([], 5)).toEqual({ visible: [], overflow: [] });
    const r = core.partitionApps(['ok', 12, null, 'ok2', ''], 2);
    expect(r.visible).toEqual(['ok', 'ok2']);
    expect(r.overflow).toEqual([]);
  });
});

describe('A4. 运行区投影（recent-apps 单源）', () => {
  test('recent ∩ openSet − fixed：保序去固定', () => {
    const out = core.runningProjection(
      ['r1', 'f1', 'r2', 'ghost'],
      new Set(['r1', 'r2']), // ghost 在 recent 但已不在打开中集合 → 排除
      ['f1'],
    );
    expect(out).toEqual(['r1', 'r2']);
  });
  test('openSet 空 → 运行区空（重载后无运行应用）', () => {
    expect(core.runningProjection(['a', 'b'], new Set(), [])).toEqual([]);
  });
});

// ==================== B. 场景 DOM（断点互斥 / 三段内容 / 收纳双态） ====================

describe('B1. 断点两态互斥（<768 Dock / ≥768 Taskbar）', () => {
  test('手机断点：taskbar 隐藏、dock-on 在场、--taskbar-space=0', () => {
    expect(W.document.body.classList.contains('taskbar-on')).toBe(false);
    expect(hooks.el.classList.contains('hidden')).toBe(true);
    expect(W.document.body.classList.contains('dock-on')).toBe(true);
    expect(W.document.documentElement.style.getPropertyValue('--taskbar-space')).toBe('0px');
  });
  test('跨断点 1024：taskbar-on 在场、dock-on 移除、--taskbar-space=68', async () => {
    setScreenSize(1024, 768);
    W.dispatchEvent(new W.Event('resize'));
    await tick();
    expect(W.document.body.classList.contains('taskbar-on')).toBe(true);
    expect(hooks.el.classList.contains('hidden')).toBe(false);
    expect(W.document.body.classList.contains('dock-on')).toBe(false);
    expect(W.document.documentElement.style.getPropertyValue('--taskbar-space')).toBe('68px');
  });
  test('回到手机断点：taskbar 让位、dock 复位', async () => {
    setScreenSize(412, 915);
    W.dispatchEvent(new W.Event('resize'));
    await tick();
    expect(W.document.body.classList.contains('taskbar-on')).toBe(false);
    expect(W.document.body.classList.contains('dock-on')).toBe(true);
  });
});

describe('B2. 任务栏三段内容（taskbar.xml 结构对齐）', () => {
  beforeAll(async () => {
    setScreenSize(1280, 800); // 宽平板：容量充足，固定 4 项全可见
    W.dispatchEvent(new W.Event('resize'));
    await tick();
  });

  test('固定区 = dock 列表同源（默认播种 phone/camera/msg/safari）', () => {
    const fixedIds = [...hooks.el.querySelectorAll('.taskbar-fixed .taskbar-icon')]
      .map((b) => b.getAttribute('data-id'));
    expect(fixedIds.length).toBeGreaterThanOrEqual(4);
    expect(fixedIds).toContain('phone');
    expect(fixedIds).toContain('safari');
  });
  test('All Apps 入口 + 导航三键（back/home/recents）在册', () => {
    expect(hooks.el.querySelector('.taskbar-allapps')).toBeTruthy();
    const navs = [...hooks.el.querySelectorAll('.taskbar-nav-btn')].map((b) => b.getAttribute('data-nav'));
    expect(navs).toEqual(['back', 'home', 'recents']);
  });
  test('运行区初始为空、无指示条（重载后无运行应用）', () => {
    expect(hooks.el.querySelectorAll('.taskbar-running .taskbar-icon').length).toBe(0);
  });
  test('运行应用实时增（recordAppOpened 广播 → 指示条在场）；固定项不重复出现在运行区', async () => {
    const { recordAppOpened } = await import('../ios-desktop/js/recent-apps.js');
    recordAppOpened('phone'); // 已固定 → 只进 recent 不进运行区
    recordAppOpened('calc');  // 未固定 → 运行区 + 指示条
    await tick();
    const runIds = [...hooks.el.querySelectorAll('.taskbar-running .taskbar-icon')]
      .map((b) => b.getAttribute('data-id'));
    expect(runIds).toContain('calc');
    expect(runIds).not.toContain('phone');
    const calcBtn = hooks.el.querySelector('.taskbar-running .taskbar-icon[data-id="calc"]');
    expect(calcBtn.classList.contains('is-running')).toBe(true);
    expect(calcBtn.querySelector('.taskbar-indicator')).toBeTruthy();
  });
  test('运行应用实时减（app-window-closed → 移出运行区）', async () => {
    W.document.dispatchEvent(new W.CustomEvent('app-window-closed', { detail: { appId: 'calc' } }));
    await tick();
    const runIds = [...hooks.el.querySelectorAll('.taskbar-running .taskbar-icon')]
      .map((b) => b.getAttribute('data-id'));
    expect(runIds).not.toContain('calc');
  });
  test('容量治理：窄容器（768px）+ 多运行项 → 溢出把手在场且面板不丢项', async () => {
    const { recordAppOpened } = await import('../ios-desktop/js/recent-apps.js');
    for (const id of ['calc', 'notes', 'weather', 'clock', 'files']) recordAppOpened(id); // 4 固定 + 5 运行
    setScreenSize(768, 700);
    W.dispatchEvent(new W.Event('resize'));
    await tick();
    const btn = hooks.el.querySelector('.taskbar-overflow-btn');
    expect(btn.hidden).toBe(false);
    btn.click();
    await tick();
    const items = [...hooks.el.querySelectorAll('.taskbar-overflow-item')].map((b) => b.getAttribute('data-id'));
    const visibleCount = hooks.el.querySelectorAll('.taskbar-fixed .taskbar-icon, .taskbar-running .taskbar-icon').length;
    // 不丢项：可见区 + 溢出面板 = 全量（4 固定 + 5 运行 = 9）
    expect(visibleCount + items.length).toBeGreaterThanOrEqual(9);
    expect(items.length).toBeGreaterThan(0);
  });
  test('All Apps 按钮触发 #66 抽屉（source=taskbar）；Esc/收起后 stash 解除', async () => {
    // 直接调用接线语义层（click 已被容量用例占面板；此处走 all-apps-changed 驱动收纳）
    W.dispatchEvent(new W.CustomEvent('all-apps-changed', { detail: { open: true, source: 'taskbar' } }));
    await tick();
    expect(hooks.el.getAttribute('data-stashed')).toBe('1');
    expect(Number(hooks.el.getAttribute('data-stash-flags')) & core.FLAG_STASHED_IN_TASKBAR_ALL_APPS).toBeTruthy();
    W.dispatchEvent(new W.CustomEvent('all-apps-changed', { detail: { open: false, source: '' } }));
    await tick();
    expect(hooks.el.getAttribute('data-stashed')).toBe('0');
  });
});

describe('B3. 收纳双态与弹簧（417ms / 0.5 / 手柄 220×4）', () => {
  // AUTO 位语义 = inApp && autoStash（源码同构）—— 场景无真实开窗，直改 state.isOpen
  // （state.js 单一真源，evaluateStash 同源读取；结束复位不污染其他用例）
  beforeAll(() => { W.__state.isOpen = true; W.__state.currentApp = { id: 'calc' }; });
  afterAll(() => {
    W.__state.isOpen = false; W.__state.currentApp = null;
    hooks.evaluateStash(); // inApp=false → disarmAutoStash（清 5s 挂起计时器，防泄漏）
  });

  test('forceStash(true)：stashed 类 + AUTO 标志 + 弹簧目标 1（进度向 1 推进）', async () => {
    hooks.forceStash(true);
    await tick();
    expect(hooks.el.classList.contains('stashed')).toBe(true);
    expect(hooks.el.getAttribute('data-stashed')).toBe('1');
    expect(Number(hooks.el.getAttribute('data-stash-flags')) & core.FLAG_STASHED_IN_APP_AUTO).toBeTruthy();
    expect(hooks.springTarget()).toBe(1);
    expect(hooks.stashProgress()).toBeGreaterThan(0.001); // 弹簧已启动
  });
  test('unstash：AUTO 位清除 + 弹簧回摆目标 0', async () => {
    hooks.unstash('tap');
    await tick();
    expect(hooks.springTarget()).toBe(0);
    expect(Number(hooks.el.getAttribute('data-stash-flags')) & core.FLAG_STASHED_IN_APP_AUTO).toBe(0);
  });
  test('弹簧落定：图标缩放目标 STASHED_TASKBAR_SCALE=0.5（data-scale-target）', async () => {
    hooks.forceStash(true);
    await tick();
    expect(hooks.el.getAttribute('data-scale-target')).toBe('0.5');
    hooks.unstash('tap');
    await tick();
    expect(hooks.el.getAttribute('data-scale-target')).toBe('1');
  });
});

describe('B4. 设置开关持久化（桌面与 Dock 单源）', () => {
  test('taskbarEnabled=false → taskbar 让位 + dock 复位；刷新后保持（localStorage）', async () => {
    setScreenSize(1024, 768);
    W.dispatchEvent(new W.Event('resize'));
    await tick();
    expect(W.document.body.classList.contains('taskbar-on')).toBe(true);

    W.__desktopPrefs.set('taskbarEnabled', false);
    await tick();
    expect(W.document.body.classList.contains('taskbar-on')).toBe(false);
    expect(W.document.body.classList.contains('dock-on')).toBe(true);
    const saved = JSON.parse(W.localStorage.getItem('ios-desktop:desktop-prefs') || '{}');
    expect(saved.taskbarEnabled).toBe(false);

    W.__desktopPrefs.set('taskbarEnabled', true);
    await tick();
    expect(W.document.body.classList.contains('taskbar-on')).toBe(true);
  });
});

// ==================== C. 接线与源码锚 ====================

describe('C. 接线锚与原值锚', () => {
  test('main.js：initTaskbar 引入 + 初始化（initDock 之后）', () => {
    const m = src('ios-desktop/js/main.js');
    expect(m).toContain("import { initTaskbar } from './taskbar.js'");
    expect(m.indexOf('initDock();')).toBeGreaterThan(-1);
    expect(m.indexOf('initTaskbar();')).toBeGreaterThan(m.indexOf('initDock();'));
  });
  test('index.html：taskbar.css 样式链接在册', () => {
    expect(src('ios-desktop/index.html')).toContain('css/taskbar.css');
  });
  test('desktop-prefs.js：taskbarEnabled 默认 true（单源持久化）', () => {
    const p = src('ios-desktop/js/desktop-prefs.js');
    expect(p).toContain('taskbarEnabled: true');
  });
  test('settings.js：dpTaskbarEnabled 开关 + 渲染同步 + change 绑定', () => {
    const s = src('ios-desktop/js/apps/settings.js');
    expect(s).toContain('id="dpTaskbarEnabled"');
    expect(s).toContain("if (swT)");
    expect(s).toContain("P.set('taskbarEnabled', !!t.checked)");
  });
  test('dock.js：taskbar-changed 监听 + dock-on 互斥判定', () => {
    const d = src('ios-desktop/js/dock.js');
    expect(d).toContain("addEventListener('taskbar-changed'");
    expect(d).toContain("classList.contains('taskbar-on')");
  });
  test('taskbar.js：core 单源引用（computeStash/calculateMaxNumIcons/partitionApps/runningProjection）', () => {
    const t = src('ios-desktop/js/taskbar.js');
    expect(t).toContain("from './taskbar-core.js'");
    for (const fn of ['computeStash', 'calculateMaxNumIcons', 'partitionApps', 'runningProjection']) {
      expect(t).toContain(fn);
    }
  });
  test('弹簧纪律：收纳动效不经 CSS transition（html.no-anim 不杀动效）', () => {
    const t = src('ios-desktop/js/taskbar.js');
    expect(t).not.toContain('style.transition');
    expect(t).toContain('STASH_SPRING_STIFFNESS');
  });
  test('原值锚：417ms / 5000ms / 0.5 / 1.1 / 400dp·s⁻¹（源码实测常量在册）', () => {
    expect(core.TRANSIENT_TASKBAR_STASH_DURATION).toBe(417);
    expect(core.NO_TOUCH_TIMEOUT_TO_STASH_MS).toBe(5000);
    expect(core.STASHED_TASKBAR_SCALE).toBe(0.5);
    expect(core.UNSTASHED_TASKBAR_HANDLE_HINT_SCALE).toBe(1.1);
    expect(core.STASH_SPRING_INITIAL_VELOCITY_DP_PER_S).toBe(400);
    expect(core.TASKBAR_STASHED_HANDLE_WIDTH).toBe(220);
    expect(core.TASKBAR_STASHED_HANDLE_HEIGHT).toBe(4);
    expect(core.TASKBAR_FRAME_HEIGHT).toBe(56);
    expect(core.TASKBAR_ICON_TOUCH).toBe(48);
    expect(core.TASKBAR_ICON_SPACING).toBe(12);
    expect(core.TASKBAR_NAV_BUTTONS_SIZE).toBe(44);
    expect(core.PERSISTENT_TASKBAR_CORNER_RADIUS).toBe(16);
  });
});
