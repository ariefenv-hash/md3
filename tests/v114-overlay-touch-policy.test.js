// ==================== v114-overlay-touch-policy.test.js — #114 浮层触摸语义公约 v10.11 ====================
//
// 覆盖（R90 窗主作业，四浮层外部收起统一 + 公约纯逻辑层）：
//   · aosp/overlay-touch-policy.js 纯逻辑：resolveOutsideAction 四态判定表（none/
//     consume/fallthrough/dismiss）、createOutsideDismissMachine 状态机（ARM 门免疫
//     开启手势 / DISMISS 单次消费 / FALLTHROUGH 不消费回调）、declareTouchableRegions
//     + isInsideTouchable（onComputeInternalInsets 子视图并集 md3 同构）
//   · 与 #108 音量样板语义对齐：resolvePointerRole（pass/consume/outside）⇔
//     resolveOutsideAction（none/consume/fallthrough|dismiss）映射等价
//   · 接线锚 E 组（剥注释扫描，R77 同款防字面误伤）：电源菜单（GA_CLOSE_TAP_OUTSIDE
//     同构）/ 分享页 / 任务栏溢出（旧 click 通道退役）/ 微件选择器，各浮层
//     OutsideMode.DISMISS + 可触摸区声明 + open/close ARM 门同步
//   · AOSP 行号锚（防回退）：VolumeDialogImpl L529-532/L465-487/L2581-2593 +
//     GlobalActionsDialogLite L2292-2297/L2407-2414/L2415-2417
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OutsideMode,
  OutsideAction,
  resolveOutsideAction,
  createOutsideDismissMachine,
  declareTouchableRegions,
  isInsideTouchable,
} from '../ios-desktop/js/aosp/overlay-touch-policy.js';
import { PointerRole, resolvePointerRole } from '../ios-desktop/js/aosp/volume-touch-insets.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', p);
/** 剥注释扫描（防注释字面误伤，v108 同款） */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const QS = stripComments(readFileSync(R('ios-desktop/js/quick-settings.js'), 'utf8'));
const SS = stripComments(readFileSync(R('ios-desktop/js/share-sheet.js'), 'utf8'));
const TB = stripComments(readFileSync(R('ios-desktop/js/taskbar.js'), 'utf8'));
const WB = stripComments(readFileSync(R('ios-desktop/js/widget-board.js'), 'utf8'));
const POLICY_SRC = readFileSync(R('ios-desktop/js/aosp/overlay-touch-policy.js'), 'utf8');

describe('v114-A · resolveOutsideAction 四态判定表', () => {
  it('A1 浮层未显示 → none（零 overlay 语义，两模式一致）', () => {
    expect(resolveOutsideAction({ mode: OutsideMode.FALLTHROUGH, visible: false, insideTouchable: true })).toBe(OutsideAction.NONE);
    expect(resolveOutsideAction({ mode: OutsideMode.DISMISS, visible: false, insideTouchable: false })).toBe(OutsideAction.NONE);
  });

  it('A2 显示 + 可触摸区内 → consume（控件自身消费，零干预）', () => {
    expect(resolveOutsideAction({ mode: OutsideMode.FALLTHROUGH, visible: true, insideTouchable: true })).toBe(OutsideAction.CONSUME);
    expect(resolveOutsideAction({ mode: OutsideMode.DISMISS, visible: true, insideTouchable: true })).toBe(OutsideAction.CONSUME);
  });

  it('A3 显示 + 区外 + FALLTHROUGH → fallthrough（穿透 + 收起并行，音量 #108 同语义）', () => {
    expect(resolveOutsideAction({ mode: OutsideMode.FALLTHROUGH, visible: true, insideTouchable: false })).toBe(OutsideAction.FALLTHROUGH);
  });

  it('A4 显示 + 区外 + DISMISS → dismiss（遮罩消费 + 收起，对话框语义）', () => {
    expect(resolveOutsideAction({ mode: OutsideMode.DISMISS, visible: true, insideTouchable: false })).toBe(OutsideAction.DISMISS);
  });

  it('A5 常量字面量稳定（接线层字符串比较契约）', () => {
    expect(OutsideMode).toEqual({ FALLTHROUGH: 'fallthrough', DISMISS: 'dismiss' });
    expect(OutsideAction).toEqual({ NONE: 'none', CONSUME: 'consume', FALLTHROUGH: 'fallthrough', DISMISS: 'dismiss' });
  });
});

describe('v114-B · createOutsideDismissMachine 状态机（ARM 门 + 单次消费）', () => {
  it('B1 初始 closed：open 前 feed 一律 none（ARM 门免疫开启手势——电源键长按 down 拍先于 open）', () => {
    let dismissed = 0;
    const m = createOutsideDismissMachine({ mode: OutsideMode.DISMISS, onDismiss: () => dismissed++ });
    expect(m.feedPointerDown(false)).toBe(OutsideAction.NONE);   // 开启手势 down 拍
    expect(m.feedPointerDown(true)).toBe(OutsideAction.NONE);
    expect(dismissed).toBe(0);
    expect(m.__state().visible).toBe(false);
  });

  it('B2 open 后外部落点 → DISMISS 单次消费（onDismiss 恰好一次 + 状态复位）', () => {
    let dismissed = 0;
    const m = createOutsideDismissMachine({ mode: OutsideMode.DISMISS, onDismiss: () => dismissed++ });
    m.open();
    expect(m.feedPointerDown(false)).toBe(OutsideAction.DISMISS);
    expect(dismissed).toBe(1);
    // AOSP cancel 后窗口移除：不存在二次派发——同拍再喂为 none
    expect(m.feedPointerDown(false)).toBe(OutsideAction.NONE);
    expect(dismissed).toBe(1);
    expect(m.__state().visible).toBe(false);
    expect(m.__state().armed).toBe(false);
  });

  it('B3 open 后区内落点 → consume（不消费不收起，可继续区内交互）', () => {
    let dismissed = 0;
    const m = createOutsideDismissMachine({ mode: OutsideMode.DISMISS, onDismiss: () => dismissed++ });
    m.open();
    expect(m.feedPointerDown(true)).toBe(OutsideAction.CONSUME);
    expect(dismissed).toBe(0);
    expect(m.feedPointerDown(false)).toBe(OutsideAction.DISMISS); // 后续外部照常收起
    expect(dismissed).toBe(1);
  });

  it('B4 FALLTHROUGH 模式：外部落点返回 fallthrough 且不触发 onDismiss（穿透语义无消费）', () => {
    let dismissed = 0;
    const m = createOutsideDismissMachine({ mode: OutsideMode.FALLTHROUGH, onDismiss: () => dismissed++ });
    m.open();
    expect(m.feedPointerDown(false)).toBe(OutsideAction.FALLTHROUGH);
    expect(dismissed).toBe(0);                                   // 收起由接线层自理（音量 dismissH 同构）
    expect(m.__state().visible).toBe(true);                      // 状态机不代收面板可见性
  });

  it('B5 close 复位：close 后 feed 为 none，重开恢复判定', () => {
    let dismissed = 0;
    const m = createOutsideDismissMachine({ mode: OutsideMode.DISMISS, onDismiss: () => dismissed++ });
    m.open();
    m.close();
    expect(m.feedPointerDown(false)).toBe(OutsideAction.NONE);
    m.open();
    expect(m.feedPointerDown(false)).toBe(OutsideAction.DISMISS);
    expect(dismissed).toBe(1);
  });

  it('B6 默认模式 = DISMISS（对话框家族主语义，调用方可省 mode）', () => {
    const m = createOutsideDismissMachine({});
    m.open();
    expect(m.feedPointerDown(false)).toBe(OutsideAction.DISMISS);
  });
});

describe('v114-C · declareTouchableRegions + isInsideTouchable（onComputeInternalInsets 同构）', () => {
  it('C1 选择器集合并且合并串（closest 单调用消费契约）', () => {
    const t = declareTouchableRegions(['.a-card', '.b-btn']);
    expect(t.selectors).toEqual(['.a-card', '.b-btn']);
    expect(t.selector).toBe('.a-card, .b-btn');
  });

  it('C2 空/非法输入退化为空声明（selector 空串 → isInsideTouchable 恒 false = 保守外部）', () => {
    const t = declareTouchableRegions([]);
    expect(t.selectors).toEqual([]);
    expect(t.selector).toBe('');
    expect(isInsideTouchable(null, t.selector)).toBe(false);
  });

  it('C3 happy-dom 真跑：元素命中声明区 = consume，外部节点 = false', () => {
    document.body.innerHTML = '<div class="ga-card"><button id="in1">ok</button></div><div id="out"></div>';
    const { selector } = declareTouchableRegions(['.ga-card']);
    expect(isInsideTouchable(document.getElementById('in1'), selector)).toBe(true);
    expect(isInsideTouchable(document.querySelector('.ga-card'), selector)).toBe(true);
    expect(isInsideTouchable(document.getElementById('out'), selector)).toBe(false);
    expect(isInsideTouchable(document.getElementById('out'), '')).toBe(false);
  });

  it('C4 四浮层可触摸区声明与实例接线一致', () => {
    expect(QS).toContain("GA_TOUCHABLE = declareTouchableRegions(['.power-dialog-card'])");
    expect(SS).toContain("SHARE_TOUCHABLE = declareTouchableRegions(['.share-sheet-card'])");
    expect(TB).toContain("OVERFLOW_TOUCHABLE = declareTouchableRegions(['.taskbar-overflow', '.taskbar-overflow-btn'])");
    expect(WB).toContain("PICKER_TOUCHABLE = declareTouchableRegions(['.wp-sheet'])");
  });
});

describe('v114-D · 与 #108 音量样板语义对齐（resolvePointerRole 映射等价）', () => {
  it('D1 pass/consume 两态逐条等价（两模式一致）', () => {
    expect(resolvePointerRole({ visible: false, insideTouchable: false })).toBe(PointerRole.PASS);
    expect(resolveOutsideAction({ mode: OutsideMode.DISMISS, visible: false, insideTouchable: false })).toBe(OutsideAction.NONE);
    expect(resolvePointerRole({ visible: false, insideTouchable: true })).toBe(PointerRole.PASS);
    expect(resolveOutsideAction({ mode: OutsideMode.DISMISS, visible: false, insideTouchable: true })).toBe(OutsideAction.NONE);
    expect(resolvePointerRole({ visible: true, insideTouchable: true })).toBe(PointerRole.CONSUME);
    expect(resolveOutsideAction({ mode: OutsideMode.DISMISS, visible: true, insideTouchable: true })).toBe(OutsideAction.CONSUME);
  });

  it('D2 outside 态分叉：FALLTHROUGH 模式承接音量穿透语义 / DISMISS 承接对话框消费语义', () => {
    expect(resolvePointerRole({ visible: true, insideTouchable: false })).toBe(PointerRole.OUTSIDE);
    expect(resolveOutsideAction({ mode: OutsideMode.FALLTHROUGH, visible: true, insideTouchable: false })).toBe(OutsideAction.FALLTHROUGH);
    expect(resolveOutsideAction({ mode: OutsideMode.DISMISS, visible: true, insideTouchable: false })).toBe(OutsideAction.DISMISS);
  });
});

describe('v114-E · 接线锚 E 组（四浮层公约落地）', () => {
  it('E1 电源菜单：DISMISS 状态机 + GA_TOUCHABLE 判定 + open/close ARM 门同步', () => {
    expect(QS).toContain("createOutsideDismissMachine({ mode: OutsideMode.DISMISS, onDismiss: () => closePowerDialog() })");
    expect(QS).toContain('gaOutside.feedPointerDown(isInsideTouchable(e.target, GA_TOUCHABLE.selector))');
    expect(QS).toContain('if (__gaOutside) __gaOutside.open();');
    expect(QS).toContain('if (__gaOutside) __gaOutside.close();');
    // A17 源码行号锚（GlobalActionsDialogLite.java main 快照）
    expect(POLICY_SRC).toContain('L2292-2297');
    expect(POLICY_SRC).toContain('GA_CLOSE_TAP_OUTSIDE');
  });

  it('E2 分享页：遮罩 pointerdown 主通道 + click 兜底共存 + ARM 门同步', () => {
    expect(SS).toContain("createOutsideDismissMachine({ mode: OutsideMode.DISMISS, onDismiss: () => closeShareSheet() })");
    expect(SS).toContain('outsideMachine.feedPointerDown(isInsideTouchable(e.target, SHARE_TOUCHABLE.selector))');
    expect(SS).toContain("addEventListener('pointerdown'");
    // click 兜底保留（幂等无害）：scrim click → close 仍在
    expect(SS).toContain(".share-sheet-scrim').addEventListener('click', closeShareSheet)");
  });

  it('E3 任务栏溢出：pointerdown 主通道落地 + 旧 document click 通道退役', () => {
    expect(TB).toContain("createOutsideDismissMachine({ mode: OutsideMode.DISMISS, onDismiss: () => closeOverflowPanel() })");
    expect(TB).toContain('overflowOutsideMachine.feedPointerDown(isInsideTouchable(e.target, OVERFLOW_TOUCHABLE.selector))');
    expect(TB).toContain('overflowOutsideMachine.close();');
    // 旧通道退役（stripComments 后不得再出现 document click 外部关闭分支）
    expect(TB).not.toMatch(/document\.addEventListener\('click'[\s\S]{0,200}taskbar-overflow-btn[\s\S]{0,120}closeOverflowPanel/);
  });

  it('E4 微件选择器：scrim pointerdown 主通道 + open/close ARM 门同步', () => {
    expect(WB).toContain("createOutsideDismissMachine({ mode: OutsideMode.DISMISS, onDismiss: () => closeWidgetPicker() })");
    expect(WB).toContain('pickerOutside.feedPointerDown(isInsideTouchable(e.target, PICKER_TOUCHABLE.selector))');
    expect(WB).toContain('if (pickerOutside) pickerOutside.open();');
    expect(WB).toContain('if (pickerOutside) pickerOutside.close();');
    expect(WB).toContain(".wp-scrim').addEventListener('click', () => closeWidgetPicker())");
  });

  it('E5 公约模块零 DOM 纪律（纯逻辑层不触碰 document/window）', () => {
    expect(POLICY_SRC).not.toMatch(/document\./);
    expect(POLICY_SRC).not.toMatch(/window\./);
    expect(POLICY_SRC).not.toMatch(/querySelector|getElementById|addEventListener/);
  });
});
