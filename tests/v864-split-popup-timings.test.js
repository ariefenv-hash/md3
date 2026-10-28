// ==================== v864-split-popup-timings.test.js — #75 二期（分屏分档 + 弹出菜单 U+） ====================
//
// 覆盖（#75 §五 DoD 二期子集）：
//   ① SplitAnimationTimings 原值分档：8 档常量 + QuickstepTransitionManager 配套 2 值 + 断点 768
//   ② 设备分档 splitTimingsFor：412 手机 / 768 平板 / 1280 平板 / 非法值回落
//   ③ AppPairLaunchTimings 分段：stageProgress 段内归一化 + 越界钳制 + appPairStageProgress 四段
//   ④ ArrowPopup 两套时序：经典 6 值 + U+ 6 值 1:1 + SHORTCUT_COLLAPSE_THRESHOLD=6
//   ⑤ 折叠切分 foldShortcuts：>6 折叠 / =6 不折叠 / 空表
//   ⑥ U+ 开/收编排 openSchedule/closeSchedule：子项阶梯 / 收场 150ms 起淡
//   ⑦ 接线源码锚：split-screen.js 分档消费（appPair 窗口/错峰装载/abort 500/桌面淡出 200）；
//      context-menu.js U+ 编排 + 折叠 + 扩展点；pixel-features.css 过渡所有权移交
//   ⑧ 场景（happy-dom）：>6 条折叠渲染 + 折叠行展开 + U+ 开场推进 + 关场中途打断连续性 +
//      淡出期不可交互 + 收场摘除
//   ⑨ 二期第 7 项锚（前台应用返回后台）：native 关=250ms（v8.63 引擎）+ 分屏关场归巢图标在册
//
// 取值纪律：全部常量溯源注释见 js/aosp/split-timings.js 与 js/aosp/popup-timings.js。

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bootDesktop } from './scenario-helpers.js';

import {
  TABLET_ENTER_DURATION, TABLET_CONFIRM_DURATION,
  PHONE_ENTER_DURATION, PHONE_CONFIRM_DURATION,
  ABORT_DURATION, TABLET_APP_PAIR_LAUNCH_DURATION, PHONE_APP_PAIR_LAUNCH_DURATION,
  DESKTOP_FADE_OUT_DURATION, SPLIT_LAUNCH_DURATION, SPLIT_DIVIDER_ANIM_DURATION,
  TABLET_BREAKPOINT, isTabletWidth, splitTimingsFor,
  APP_PAIR_STAGES, stageProgress, appPairStageProgress,
} from '../ios-desktop/js/aosp/split-timings.js';
import {
  CLASSIC_TIMINGS, U_TIMINGS, SHORTCUT_COLLAPSE_THRESHOLD,
  popupTimings, foldShortcuts, openSchedule, closeSchedule,
} from '../ios-desktop/js/aosp/popup-timings.js';
import { CLOSING_TRANSITION_DURATION_MS } from '../ios-desktop/js/animation-presets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(join(__dirname, '../ios-desktop', p), 'utf8');
const SPLIT_SRC = () => R('js/split-screen.js');
const MENU_SRC = () => R('js/context-menu.js');
const MENU_CSS = () => R('css/pixel-features.css');

// ---------- ① SplitAnimationTimings 原值（§1.6 表 1:1） ----------
describe('#75 二期 · §1.6 SplitAnimationTimings 原值', () => {
  test('平板/手机 enter·confirm·appPair + abort + desktopFade 八档原值', () => {
    expect(TABLET_ENTER_DURATION).toBe(866);
    expect(TABLET_CONFIRM_DURATION).toBe(500);
    expect(PHONE_ENTER_DURATION).toBe(517);
    expect(PHONE_CONFIRM_DURATION).toBe(333);
    expect(ABORT_DURATION).toBe(500);
    expect(TABLET_APP_PAIR_LAUNCH_DURATION).toBe(998);
    expect(PHONE_APP_PAIR_LAUNCH_DURATION).toBe(915);
    expect(DESKTOP_FADE_OUT_DURATION).toBe(200);
  });
  test('QuickstepTransitionManager 配套：SPLIT_LAUNCH 370 / 分割条 100', () => {
    expect(SPLIT_LAUNCH_DURATION).toBe(370);
    expect(SPLIT_DIVIDER_ANIM_DURATION).toBe(100);
  });
  test('断点与 #72/#73 同源：TABLET_BREAKPOINT=768', () => {
    expect(TABLET_BREAKPOINT).toBe(768);
    expect(isTabletWidth(767)).toBe(false);
    expect(isTabletWidth(768)).toBe(true);
  });
});

// ---------- ② 设备分档 ----------
describe('#75 二期 · 设备分档 splitTimingsFor', () => {
  test('412 手机档：517/333/915', () => {
    const t = splitTimingsFor(412);
    expect(t.device).toBe('phone');
    expect(t.enter).toBe(517);
    expect(t.confirm).toBe(333);
    expect(t.appPair).toBe(915);
  });
  test('768/1280 平板档：866/500/998', () => {
    for (const w of [768, 1280]) {
      const t = splitTimingsFor(w);
      expect(t.device).toBe('tablet');
      expect(t.enter).toBe(866);
      expect(t.confirm).toBe(500);
      expect(t.appPair).toBe(998);
    }
  });
  test('abort/desktopFade/launch/divider 全档一致', () => {
    for (const w of [412, 768, 1280]) {
      const t = splitTimingsFor(w);
      expect(t.abort).toBe(500);
      expect(t.desktopFade).toBe(200);
      expect(t.launch).toBe(370);
      expect(t.divider).toBe(100);
    }
  });
  test('非法宽度回落手机档（不抛错）', () => {
    expect(splitTimingsFor(undefined).device).toBe('phone');
    expect(splitTimingsFor(NaN).device).toBe('phone');
  });
});

// ---------- ③ AppPairLaunchTimings 分段 ----------
describe('#75 二期 · AppPairLaunchTimings 分段窗口', () => {
  test('四段窗口在册且有序（start<end、[0,1] 域内）', () => {
    for (const k of ['stagedRectSlide', 'iconFade', 'appReveal', 'cellSplit']) {
      const w = APP_PAIR_STAGES[k];
      expect(w.start).toBeGreaterThanOrEqual(0);
      expect(w.end).toBeLessThanOrEqual(1);
      expect(w.end).toBeGreaterThan(w.start);
    }
    expect(APP_PAIR_STAGES.stagedRectSlide).toEqual({ start: 0.0, end: 0.55 });
    expect(APP_PAIR_STAGES.cellSplit).toEqual({ start: 0.0, end: 1.0 });
  });
  test('stageProgress 段内线性归一化（进度 = 毫秒/getDuration 语义）', () => {
    const w = { start: 0.25, end: 0.55 };
    expect(stageProgress(0.25, w)).toBe(0);
    expect(stageProgress(0.4, w)).toBeCloseTo(0.5, 6);
    expect(stageProgress(0.55, w)).toBe(1);
  });
  test('stageProgress 越界钳制 + 非法输入', () => {
    const w = { start: 0.25, end: 0.55 };
    expect(stageProgress(0.0, w)).toBe(0);
    expect(stageProgress(0.9, w)).toBe(1);
    expect(stageProgress(NaN, w)).toBe(0);
  });
  test('appPairStageProgress 一次性四段（t=0 全零、t=1 全满）', () => {
    const z = appPairStageProgress(0);
    expect(z.stagedRectSlide).toBe(0);
    expect(z.iconFade).toBe(0);
    expect(z.appReveal).toBe(0);
    const f = appPairStageProgress(1);
    expect(f.stagedRectSlide).toBe(1);
    expect(f.iconFade).toBe(1);
    expect(f.appReveal).toBe(1);
    expect(f.cellSplit).toBe(1);
  });
  test('窗格错峰参数在册：A 窗口 0.55 / B 装载 0.25、窗口 0.3', async () => {
    const src = await import('../ios-desktop/js/aosp/split-timings.js');
    expect(src.PANE_A_SLIDE_SPAN).toBe(0.55);
    expect(src.PANE_B_ARM_AT).toBe(0.25);
    expect(src.PANE_B_SLIDE_SPAN).toBe(0.3);
  });
});

// ---------- ④⑤⑥ ArrowPopup 两套时序 + 折叠 + 编排 ----------
describe('#75 二期 · §1.7 ArrowPopup 两套时序 + 折叠', () => {
  test('经典套 6 值 1:1（276/38/76/200/50/140）', () => {
    expect(CLASSIC_TIMINGS).toEqual({
      openDuration: 276, openFadeDuration: 38, openChildFadeDuration: 76,
      closeDuration: 200, closeFadeDuration: 50, closeChildFadeDuration: 140,
    });
  });
  test('U+ 套 6 值 1:1（200/83/83/233/150/200）', () => {
    expect(U_TIMINGS).toEqual({
      openDuration: 200, openFadeDuration: 83, openChildFadeDuration: 83,
      closeDuration: 233, closeChildFadeStartDelay: 150, openOvershootDuration: 200,
    });
  });
  test('SHORTCUT_COLLAPSE_THRESHOLD=6 + popupTimings 选择', () => {
    expect(SHORTCUT_COLLAPSE_THRESHOLD).toBe(6);
    expect(popupTimings(true)).toBe(U_TIMINGS);
    expect(popupTimings(false)).toBe(CLASSIC_TIMINGS);
  });
  test('折叠切分：8 条 → 6 可见 + 2 折叠 + 折叠行', () => {
    const f = foldShortcuts([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(f.visible).toHaveLength(6);
    expect(f.folded).toEqual([7, 8]);
    expect(f.foldedCount).toBe(2);
    expect(f.hasFoldRow).toBe(true);
  });
  test('折叠切分：=6 与 <6 不出折叠行；空表安全', () => {
    expect(foldShortcuts([1, 2, 3, 4, 5, 6]).hasFoldRow).toBe(false);
    expect(foldShortcuts([1, 2, 3]).visible).toHaveLength(3);
    expect(foldShortcuts([]).visible).toHaveLength(0);
    expect(foldShortcuts(null).hasFoldRow).toBe(false);
  });
  test('U+ 开场编排：容器 83/200/200 + 子项 i×83 阶梯', () => {
    const s = openSchedule(true, 4);
    expect(s.container).toEqual({ fade: 83, settle: 200, overshoot: 200 });
    expect(s.children.map((c) => c.delay)).toEqual([0, 83, 166, 249]);
    expect(s.children.every((c) => c.duration === 83)).toBe(true);
  });
  test('U+ 收场编排：容器 233 + 子项统一 150ms 起淡', () => {
    const s = closeSchedule(true, 3);
    expect(s.container.fade).toBe(233);
    expect(s.children.map((c) => c.delay)).toEqual([150, 150, 150]);
    expect(s.children.every((c) => c.duration === 83)).toBe(true);
  });
});

// ---------- ⑦ 接线源码锚 ----------
describe('#75 二期 · 接线源码锚', () => {
  test('split-screen.js：appPair 分档消费 + 窗格 A/B 分段窗口 + 错峰装载', () => {
    const src = SPLIT_SRC();
    expect(src).toContain("from './aosp/split-timings.js'");
    expect(src).toContain('splitTimingsFor(window.innerWidth)');
    expect(src).toContain('splitT.appPair * PANE_A_SLIDE_SPAN');
    expect(src).toContain('splitT.appPair * PANE_B_SLIDE_SPAN');
    expect(src).toContain('performance.now() + splitT.appPair * PANE_B_ARM_AT');
    expect(src).toContain('if (p.armAt && now < p.armAt) continue;');
    expect(src).toContain('session.__nativeSplit = nativeSplit');
  });
  test('split-screen.js：native 中止档 ABORT_DURATION=500 收拢 + closing 清装载位', () => {
    const src = SPLIT_SRC();
    expect(src).toContain("session.abortMs = ABORT_DURATION; // #75 二期：native 中止档（500ms）");
    expect(src).toContain("getTransitionRunner('close').kind !== 'timed'");
    expect(src).toContain('p.posSpring.reconfigure(timedDescMs(closeRunner.posDesc, session.abortMs))');
    expect(src).toContain('session.panes.forEach((p) => { p.armAt = 0; })');
  });
  test('split-screen.js：桌面淡出 200ms + appReveal 内容显现 + 归巢图标（二期第 7 项）', () => {
    const src = SPLIT_SRC();
    expect(src).toContain('backdrop.style.transitionDuration = splitT.desktopFade');
    expect(src).toContain('clamp((prog - 0.55) / 0.35, 0, 1)');
    // 二期第 7 项（前台应用返回后台 250ms 收回图标）：分屏关场归巢 + native 关 250ms（v8.63）
    expect(src).toContain('findDesktopIconRect(p.app.id)');
    expect(CLOSING_TRANSITION_DURATION_MS).toBe(250);
  });
  test('context-menu.js：U+ 编排接线 + 折叠 + 扩展点 + 关场不可交互', () => {
    const src = MENU_SRC();
    expect(src).toContain("from './aosp/popup-timings.js'");
    expect(src).toContain('SHORTCUT_COLLAPSE_THRESHOLD');
    expect(src).toContain('foldShortcuts(allShortcuts, SHORTCUT_COLLAPSE_THRESHOLD)');
    expect(src).toContain('window.__APP_SHORTCUTS_EXTRA');
    expect(src).toContain("startMenuAnim('open')");
    expect(src).toContain("startMenuAnim('close')");
    expect(src).toContain('更多快捷方式');
    expect(src).toContain("menuEl.style.pointerEvents = 'none'");
    expect(src).toContain('import { TimedValue }');
  });
  test('pixel-features.css：CSS 过渡所有权移交（旧 0.22s/0.18s 过渡移除）', () => {
    const css = MENU_CSS();
    expect(css).not.toContain('transition: transform 0.22s cubic-bezier(0.2, 0.95, 0.25, 1)');
    expect(css).toContain('will-change: transform, opacity');
    expect(css).toContain('开合时序归 JS 编排');
  });
});

// ---------- ⑧ 场景（happy-dom · scenario-helpers 基座，与 v863 同纪律） ----------
describe('#75 二期 · 场景：>6 折叠 + U+ 开合 + 打断连续性', () => {
  let cm;
  const app = { id: 'calculator', name: '计算器' };

  beforeAll(async () => {
    // bootDesktop 完整启动链已含 initContextMenu（main.js）——勿重复挂载第二个菜单
    await bootDesktop();
    cm = await import('../ios-desktop/js/context-menu.js');
    window.__APP_SHORTCUTS_EXTRA = {
      calculator: [
        { title: '单位换算', icon: '<i></i>', action: () => {} },
        { title: '进制转换', icon: '<i></i>', action: () => {} },
        { title: '房贷计算', icon: '<i></i>', action: () => {} },
        { title: '汇率查询', icon: '<i></i>', action: () => {} },
        { title: '日期计算', icon: '<i></i>', action: () => {} },
        { title: '税率计算', icon: '<i></i>', action: () => {} },
        { title: '科学模式', icon: '<i></i>', action: () => {} },
      ],
    };
  });

  const menu = () => document.getElementById('appContextMenu');
  const settleClose = async () => {
    if (menu().classList.contains('active')) {
      cm.closeContextMenu();
      await new Promise((r) => setTimeout(r, 650));
    }
  };

  test('S1 折叠渲染：8 条快捷方式 → 6 可见 + 折叠行「更多快捷方式（2）」', async () => {
    await settleClose();
    cm.showContextMenu(app, document.createElement('div'), 200, 400);
    expect(menu().classList.contains('active')).toBe(true);
    expect(menu().querySelectorAll('.shortcut-item')).toHaveLength(6);
    const foldRow = menu().querySelector('.shortcut-fold-row');
    expect(foldRow).toBeTruthy();
    expect(foldRow.textContent).toContain('更多快捷方式（2）');
    await settleClose();
  });

  test('S2 U+ 开场推进：同步置初态 opacity=0，随后真实时间推进（83ms 淡入中段 <0.95，终态 >0.95）', async () => {
    await settleClose();
    cm.showContextMenu(app, document.createElement('div'), 200, 400);
    expect(menu().style.opacity).toBe('0');
    await new Promise((r) => setTimeout(r, 40));
    const midOp = parseFloat(menu().style.opacity);
    expect(midOp).toBeGreaterThan(0.05);
    expect(midOp).toBeLessThan(0.95);
    await new Promise((r) => setTimeout(r, 400));
    expect(parseFloat(menu().style.opacity)).toBeGreaterThan(0.95);
    await settleClose();
  });

  test('S3 折叠行展开：点击后 8 条全显 + 折叠行消失 + 菜单保持在场', async () => {
    await settleClose();
    cm.showContextMenu(app, document.createElement('div'), 200, 400);
    menu().querySelector('.shortcut-fold-row').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(menu().querySelectorAll('.shortcut-item')).toHaveLength(8);
    expect(menu().querySelector('.shortcut-fold-row')).toBeNull();
    expect(menu().classList.contains('active')).toBe(true);
    await settleClose();
  });

  test('S4 关场中途打断连续性：开到中段反向关 —— opacity 从当前值接管（|Δ|<0.25），连续衰减不重置', async () => {
    await settleClose();
    cm.showContextMenu(app, document.createElement('div'), 200, 400);
    await new Promise((r) => setTimeout(r, 40)); // 开场中段（fade 83ms 的 ~半程）
    const oOpen = parseFloat(menu().style.opacity);
    expect(oOpen).toBeGreaterThan(0.05);
    cm.closeContextMenu();                       // 立即反向
    const o1 = parseFloat(menu().style.opacity);
    expect(Math.abs(o1 - oOpen)).toBeLessThan(0.25); // 打断接管非重置（零跳变）
    expect(menu().style.pointerEvents).toBe('none'); // 淡出期不可交互
    await new Promise((r) => setTimeout(r, 60));
    const o2 = parseFloat(menu().style.opacity);
    expect(o2).toBeLessThan(o1);      // 连续衰减
    expect(o2).toBeGreaterThan(0);    // 未瞬跳归零
    await new Promise((r) => setTimeout(r, 600));
  });

  test('S5 收场摘除：active 移除 + 内联样式清空 + 可交互性恢复', async () => {
    await settleClose();
    cm.showContextMenu(app, document.createElement('div'), 200, 400);
    await new Promise((r) => setTimeout(r, 300)); // 开场完成
    cm.closeContextMenu();
    await new Promise((r) => setTimeout(r, 650));
    expect(menu().classList.contains('active')).toBe(false);
    expect(menu().style.opacity).toBe('');
    expect(menu().style.transform).toBe('');
    expect(menu().style.pointerEvents).toBe('');
  });

  test('S6 ≤6 条不折叠：无扩展点时 calculator 内置 1 条原样渲染', async () => {
    await settleClose();
    delete window.__APP_SHORTCUTS_EXTRA;
    cm.showContextMenu(app, document.createElement('div'), 200, 400);
    expect(menu().querySelectorAll('.shortcut-item')).toHaveLength(1);
    expect(menu().querySelector('.shortcut-fold-row')).toBeNull();
    cm.closeContextMenu();
  });
});
