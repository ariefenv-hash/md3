// ==================== v10.91 · #204 单手模式（aosp/one-handed.js + one-handed.js DOM 面） ====================
// AOSP 锚：libs/WindowManager/Shell/src/com/android/wm/shell/onehanded/（main 实拉，
// OneHandedController 31.6KB / OneHandedState / OneHandedTimeoutHandler / OneHandedTouchHandler /
// OneHandedSettingsUtil；wmshell res config.xml）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  STATE_NONE, STATE_ENTERING, STATE_ACTIVE, STATE_EXITING,
  CONFIG_ONE_HANDED_OFFSET, CONFIG_ONE_HANDED_TRANSLATE_ANIMATION_DURATION,
  ONE_HANDED_TIMEOUT_NEVER, ONE_HANDED_TIMEOUT_SHORT_IN_SECONDS,
  ONE_HANDED_TIMEOUT_MEDIUM_IN_SECONDS, ONE_HANDED_TIMEOUT_LONG_IN_SECONDS,
  ONE_HANDED_DEFAULT_TIMEOUT_IN_SECONDS, LARGE_SCREEN_THRESHOLD_PX,
  offsetForHeight, canEnterOneHanded, resolveTimeoutSeconds,
  shouldScheduleTimeout, timeoutExpiresAt, isWithinTouchOutsideRegion,
  createOneHandedState, createOneHandedTouchHandler,
} from '../ios-desktop/js/aosp/one-handed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const js = readFileSync(resolve(__dirname, '../ios-desktop/js/one-handed.js'), 'utf8');
const qs = readFileSync(resolve(__dirname, '../ios-desktop/js/quick-settings.js'), 'utf8');
const nav = readFileSync(resolve(__dirname, '../ios-desktop/js/nav-bar.js'), 'utf8');
const mainJs = readFileSync(resolve(__dirname, '../ios-desktop/js/main.js'), 'utf8');

// ---------- 常量区（AOSP 实锚 1:1） ----------
describe('v10.91 · 常量区（AOSP wmshell 实锚）', () => {
  it('状态常量 = OneHandedState.java 1:1（NONE=0/ENTERING=1/ACTIVE=2/EXITING=3）', () => {
    expect(STATE_NONE).toBe(0);
    expect(STATE_ENTERING).toBe(1);
    expect(STATE_ACTIVE).toBe(2);
    expect(STATE_EXITING).toBe(3);
  });

  it('偏移 = config_one_handed_offset 40%（main 权威值；议题 33% 勘误在录）', () => {
    expect(CONFIG_ONE_HANDED_OFFSET).toBe(0.40);
  });

  it('动画时长 = config_one_handed_translate_animation_duration 600ms', () => {
    expect(CONFIG_ONE_HANDED_TRANSLATE_ANIMATION_DURATION).toBe(600);
  });

  it('超时档位 = OneHandedSettingsUtil.java L58-68 1:1（NEVER=0/4/8/12 秒，默认 MEDIUM）', () => {
    expect(ONE_HANDED_TIMEOUT_NEVER).toBe(0);
    expect(ONE_HANDED_TIMEOUT_SHORT_IN_SECONDS).toBe(4);
    expect(ONE_HANDED_TIMEOUT_MEDIUM_IN_SECONDS).toBe(8);
    expect(ONE_HANDED_TIMEOUT_LONG_IN_SECONDS).toBe(12);
    expect(ONE_HANDED_DEFAULT_TIMEOUT_IN_SECONDS).toBe(8);
  });

  it('大屏禁用断点 600px（AOSP sw600dp 同构，TABLET_MIN_WIDTH 同款）', () => {
    expect(LARGE_SCREEN_THRESHOLD_PX).toBe(600);
  });
});

// ---------- 纯函数：offset / canEnter / 超时档位 / 触摸区域 ----------
describe('v10.91 · 纯函数契约', () => {
  it('offsetForHeight：844×40% = 338（Controller L261-264 Math.round 语义）', () => {
    expect(offsetForHeight(844)).toBe(Math.round(844 * 0.40));
    expect(offsetForHeight(844)).toBe(338);
    expect(offsetForHeight(780)).toBe(312);
    // 非法入参防御
    expect(offsetForHeight(0)).toBe(0);
    expect(offsetForHeight(-100)).toBe(0);
    expect(offsetForHeight(844, 0)).toBe(0);
    expect(offsetForHeight(844, NaN)).toBe(0);
  });

  it('canEnterOneHanded：大屏禁用 reason=large_screen（#204 验收 3 语义）', () => {
    expect(canEnterOneHanded({ enabled: true, screenWidthPx: 390 }).ok).toBe(true);
    expect(canEnterOneHanded({ enabled: true, screenWidthPx: 599 }).ok).toBe(true);
    expect(canEnterOneHanded({ enabled: true, screenWidthPx: 600 }).reason).toBe('large_screen');
    expect(canEnterOneHanded({ enabled: true, screenWidthPx: 1024 }).reason).toBe('large_screen');
    expect(canEnterOneHanded({ enabled: false, screenWidthPx: 390 }).reason).toBe('disabled');
    expect(canEnterOneHanded({ enabled: true, screenWidthPx: 390, transitioning: true }).reason).toBe('transitioning');
  });

  it('resolveTimeoutSeconds：四档直取，非法回落 MEDIUM（SettingsUtil L145 默认参数语义）', () => {
    expect(resolveTimeoutSeconds(0)).toBe(0);
    expect(resolveTimeoutSeconds(4)).toBe(4);
    expect(resolveTimeoutSeconds(8)).toBe(8);
    expect(resolveTimeoutSeconds(12)).toBe(12);
    expect(resolveTimeoutSeconds(99)).toBe(8);
    expect(resolveTimeoutSeconds(-1)).toBe(8);
    expect(resolveTimeoutSeconds(NaN)).toBe(8);
  });

  it('shouldScheduleTimeout：NEVER 零调度（OneHandedTimeoutHandler L92 1:1）', () => {
    expect(shouldScheduleTimeout(0)).toBe(false);
    expect(shouldScheduleTimeout(8)).toBe(true);
    expect(shouldScheduleTimeout(99)).toBe(true); // 非法回落 MEDIUM → 可调度
  });

  it('timeoutExpiresAt：秒→毫秒换算', () => {
    expect(timeoutExpiresAt(1000, 8)).toBe(9000);
    expect(timeoutExpiresAt(1000, 4)).toBe(5000);
  });

  it('isWithinTouchOutsideRegion：round(y) < boundsTop（TouchHandler L119-121 1:1）', () => {
    // 844 高 × 40% = 338 bounds.top
    expect(isWithinTouchOutsideRegion(100, 338)).toBe(true);
    expect(isWithinTouchOutsideRegion(337.4, 338)).toBe(true); // round(337.4)=337 < 338
    expect(isWithinTouchOutsideRegion(337.6, 338)).toBe(false); // round(337.6)=338
    expect(isWithinTouchOutsideRegion(500, 338)).toBe(false);
  });
});

// ---------- 状态机（OneHandedState 同构 + 加固迁移表） ----------
describe('v10.91 · 状态机（OneHandedState.java 同构）', () => {
  it('生命周期 CUJ：NONE→ENTERING→ACTIVE→EXITING→NONE 全链合法', () => {
    const st = createOneHandedState();
    expect(st.getState()).toBe(STATE_NONE);
    expect(st.transitionTo(STATE_ENTERING)).toBe(true);
    expect(st.isTransitioning()).toBe(true);
    expect(st.isInOneHanded()).toBe(false);
    expect(st.transitionTo(STATE_ACTIVE)).toBe(true);
    expect(st.isTransitioning()).toBe(false);
    expect(st.isInOneHanded()).toBe(true);
    expect(st.transitionTo(STATE_EXITING)).toBe(true);
    expect(st.isTransitioning()).toBe(true);
    expect(st.transitionTo(STATE_NONE)).toBe(true);
    expect(st.getState()).toBe(STATE_NONE);
  });

  it('非法迁移加固拒绝（AOSP setState 直赋不校验，web 侧加固在录）', () => {
    const st = createOneHandedState();
    expect(st.transitionTo(STATE_ACTIVE)).toBe(false);   // NONE→ACTIVE
    expect(st.transitionTo(STATE_EXITING)).toBe(false);  // NONE→EXITING
    st.transitionTo(STATE_ENTERING);
    expect(st.transitionTo(STATE_NONE)).toBe(false);     // ENTERING→NONE
    expect(st.transitionTo(STATE_ENTERING)).toBe(false); // ENTERING→ENTERING
    st.transitionTo(STATE_ACTIVE);
    expect(st.transitionTo(STATE_ENTERING)).toBe(false); // ACTIVE→ENTERING
    expect(st.transitionTo(STATE_NONE)).toBe(false);     // ACTIVE→NONE（必须经 EXITING）
  });

  it('setState 直赋派发监听器（AOSP 原语义保留，测试/恢复用）', () => {
    const st = createOneHandedState();
    const seen = [];
    st.addListener((s) => seen.push(s));
    st.transitionTo(STATE_ENTERING);
    expect(seen).toEqual([STATE_ENTERING]);
    st.setState(STATE_ACTIVE);
    expect(seen).toEqual([STATE_ENTERING, STATE_ACTIVE]);
    st.transitionTo(STATE_ACTIVE); // 非法迁移不派发
    expect(seen).toEqual([STATE_ENTERING, STATE_ACTIVE]);
  });
});

// ---------- 触摸语义机（OneHandedTouchHandler.onMotionEvent 同构） ----------
describe('v10.91 · 触摸语义机（TouchHandler L83-102 同构）', () => {
  it('内部区域 down/move → resetTimer；不触发 stop', () => {
    const th = createOneHandedTouchHandler();
    expect(th.consume('down', 500, 338)).toEqual({ resetTimer: true, stop: false });
    expect(th.consume('move', 700, 338)).toEqual({ resetTimer: true, stop: false });
  });

  it('外部区域 up → stop 一次；门标志防重；up 后门复位', () => {
    const th = createOneHandedTouchHandler();
    const r1 = th.consume('up', 100, 338);
    expect(r1.stop).toBe(true);
    const r2 = th.consume('up', 100, 338);
    expect(r2.stop).toBe(false); // !mIsOnStopTransitioning 门（L94-101）
    th.resetStopGate();
    const r3 = th.consume('up', 100, 338);
    expect(r3.stop).toBe(true);
  });

  it('内部区域 up → resetTimer 恒执行、零 stop', () => {
    const th = createOneHandedTouchHandler();
    expect(th.consume('up', 600, 338)).toEqual({ resetTimer: true, stop: false });
  });
});

// ---------- DOM 面（one-handed.js 接线锚） ----------
describe('v10.91 · DOM 面接线锚（js/one-handed.js）', () => {
  it('根容器变换：#desktop translateY + 600ms decel 正典曲线', () => {
    expect(js).toContain('getElementById(DESKTOP_ROOT_ID)');
    expect(js).toContain("DESKTOP_ROOT_ID = 'desktop'");
    expect(js).toContain('translateY(');
    expect(js).toContain('cubic-bezier(0.05, 0.7, 0.1, 1)');
    expect(js).toContain('TRANSITION_SETTLE_MS = CONFIG_ONE_HANDED_TRANSLATE_ANIMATION_DURATION');
  });

  it('进入门 canEnterOneHanded（大屏禁用/过渡互斥走纯逻辑单源）', () => {
    expect(js).toContain('canEnterOneHanded({');
    expect(js).toContain('screenWidthPx: window.innerWidth || 0');
  });

  it('超时三件：NEVER 零调度门 + 到期 exit + 触摸 resetTimer', () => {
    expect(js).toContain('shouldScheduleTimeout(timeoutSeconds)');
    expect(js).toContain("exit('timeout')");
    expect(js).toContain('resetTimeout()');
  });

  it('触摸退出三通道：outside_touch / timeout / navbar_swipe 语义留痕', () => {
    expect(js).toContain("exit('outside_touch')");
    expect(js).toContain('touch.consume(');
    expect(js).toContain('resetStopGate()');
  });

  it('窗口钩子 __oneHanded（零 import 惯例：quick-settings/nav-bar/e2e 消费）', () => {
    expect(js).toContain('window.__oneHanded = {');
    expect(js).toContain('isIn: () =>');
    expect(js).toContain("dispatchEvent(new CustomEvent('one-handed-changed'");
  });

  it('持久化键 one_handed_timeout_v1（Settings.Secure.ONE_HANDED_MODE_TIMEOUT 同构）', () => {
    expect(js).toContain("'one_handed_timeout_v1'");
  });

  it('纯逻辑 import 面：零 DOM 依赖回流（aosp 单源）', () => {
    expect(js).toContain("from './aosp/one-handed.js'");
    // DOM 面不 re-export 纯逻辑内部（防循环）
    expect(js).not.toContain("import { initOneHanded }");
  });
});

// ---------- quick-settings.js 磁贴接线 ----------
describe('v10.91 · QS 磁贴接线锚（quick-settings.js）', () => {
  it('one_handed 磁贴 click 分支：toggle 通道（OneHandedTile 同构）', () => {
    expect(qs).toContain("if (tile.id === 'one_handed')");
    expect(qs).toContain('window.__oneHanded.toggle()');
  });

  it('磁贴 active 同源：one-handed-changed 监听 → refreshTilePill', () => {
    expect(qs).toContain("addEventListener('one-handed-changed'");
    expect(qs).toContain('ohTile.active = !!(e.detail && e.detail.active)');
    expect(qs).toContain('refreshTilePill(ohTile)');
  });

  it('编辑器目录大屏隐藏：600px matchMedia 门（#204 验收 3）', () => {
    expect(qs).toContain("tile.id === 'one_handed'");
    expect(qs).toContain("window.matchMedia('(min-width: 600px)').matches");
  });

  it('幽灵磁贴翻案：one_handed 目录条目仍在（拖出面板后接真实行为）', () => {
    expect(qs).toContain("{ id: 'one_handed', name: 'One-handed mode'");
  });
});

// ---------- nav-bar.js 手势接线 ----------
describe('v10.91 · 导航条手势接线锚（nav-bar.js）', () => {
  it('上滑退出：单手态吞掉系统手势链先退出', () => {
    expect(nav).toContain('window.__oneHanded.isIn()');
    expect(nav).toContain('window.__oneHanded.exit()');
  });

  it('下拉触发：dy>12 纵向意图门 + oneHandedFired 一次性门', () => {
    expect(nav).toContain('dy > 12 && Math.abs(dx) < 24');
    expect(nav).toContain('fusion.oneHandedFired');
    expect(nav).toContain('window.__oneHanded.enter()');
  });

  it('fusionDown 复位一次性门', () => {
    expect(nav).toContain('fusion.oneHandedFired = false');
  });
});

// ---------- main.js 挂载 ----------
describe('v10.91 · main.js 挂载锚', () => {
  it('import + initOneHanded 调用（initXXX 惯例）', () => {
    expect(mainJs).toContain("import { initOneHanded } from './one-handed.js'");
    expect(mainJs).toContain('initOneHanded();');
  });
});
