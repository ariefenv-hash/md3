// ==================== volume-touch-insets.test.js — #108 音量面板非模态化 v11.08 ====================
//
// 覆盖（R86 窗主作业，VolumeDialogImpl 非模态触摸语义对标）：
//   · aosp/volume-touch-insets.js 纯逻辑：resolvePointerRole 三态判定表（pass/consume/
//     outside）、TOUCHABLE_SELECTORS 子视图并集（onComputeInternalInsets L465-487 同构）、
//     DISMISS_REASON_TOUCH_OUTSIDE 字面量
//   · volume-dialog 接线（happy-dom 真跑）：面板外 pointerdown → dismiss；控件面
//     （滑条/铃声抽屉/警告层）pointerdown → 保持；面板未显示时零干预；胶囊背景
//     （.vd-bg 非控件区）落点 = ACTION_OUTSIDE 收起（NOTE L2581-2584 同构）
//   · CSS 分层锚：.volume-dialog.visible 容器 pointer-events:none + 控件 opt-in auto
//     （FLAG_NOT_TOUCH_MODAL L530 同构）；源码行号锚（防回退）
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TOUCHABLE_SELECTORS,
  TOUCHABLE_SELECTOR,
  PointerRole,
  resolvePointerRole,
  DISMISS_REASON_TOUCH_OUTSIDE,
} from '../ios-desktop/js/aosp/volume-touch-insets.js';
import { mediaService } from '../ios-desktop/js/media-service.js';

const R = (p) => join(dirname(fileURLToPath(import.meta.url)), '..', 'ios-desktop', p);
const VT = readFileSync(R('js/aosp/volume-touch-insets.js'), 'utf8');
const VD = readFileSync(R('js/volume-dialog.js'), 'utf8');
const CSS = readFileSync(R('css/pull-panels.css'), 'utf8');
/** 剥注释扫描（R77 同款：防注释字面误伤） */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** 合成 pointerdown（capture 监听消费 e.target；bubbles 冒泡至 document） */
const pointerDown = (el) => {
  el.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
};

describe('v108-A · resolvePointerRole 三态判定表', () => {
  it('A1 面板未显示 → pass（TYPE_VOLUME_OVERLAY 未挂窗，零 overlay 语义）', () => {
    expect(resolvePointerRole({ visible: false, insideTouchable: true })).toBe(PointerRole.PASS);
    expect(resolvePointerRole({ visible: false, insideTouchable: false })).toBe(PointerRole.PASS);
  });

  it('A2 显示 + 触摸面内 → consume（子视图 bounds 并集，控件自身消费）', () => {
    expect(resolvePointerRole({ visible: true, insideTouchable: true })).toBe(PointerRole.CONSUME);
  });

  it('A3 显示 + 触摸面外 → outside（ACTION_OUTSIDE 同义；含 bounds 内非控件区——NOTE L2581-2584 原文）', () => {
    expect(resolvePointerRole({ visible: true, insideTouchable: false })).toBe(PointerRole.OUTSIDE);
  });

  it('A4 三态常量字面量稳定（接线层字符串比较契约）', () => {
    expect(PointerRole).toEqual({ CONSUME: 'consume', OUTSIDE: 'outside', PASS: 'pass' });
  });
});

describe('v108-B · TOUCHABLE_SELECTORS 子视图并集（onComputeInternalInsets 同构映射）', () => {
  it('B1 六控件容器在集（v11.08 #92 重锚：顶部输出行入集）：输出行/mTopContainer(铃声列)/主滑条/省略号/浮动滑条列/安全警告层', () => {
    expect(TOUCHABLE_SELECTORS).toEqual([
      '.vd-output-row',
      '.vd-ringer-drawer',
      '.vd-slider',
      '.vd-settings',
      '.vd-float-col',
      '.vd-safety',
    ]);
  });

  it('B2 合并选择器串 = 逗号连接（closest 单调用消费）', () => {
    expect(TOUCHABLE_SELECTOR).toBe('.vd-output-row, .vd-ringer-drawer, .vd-slider, .vd-settings, .vd-float-col, .vd-safety');
  });

  it('B3 .vd-bg 胶囊背景不在集内（容器装饰非子视图控件——L477 注释「container itself 不参与触摸」）', () => {
    expect(TOUCHABLE_SELECTOR).not.toContain('vd-bg');
    expect(TOUCHABLE_SELECTOR).not.toContain('volume-dialog');
  });
});

describe('v108-C · volume-dialog 接线（happy-dom 真跑）', () => {
  let hooks;
  const dialog = () => document.getElementById('volumeDialog');
  // DOM 持久化（beforeAll 一次）：initVolumeDialog 的 inited 幂等门使 body 重建后
  // 模块仍持 detached 旧节点——单模块实例 + 持久 DOM 才能断言 visible 类真跳变
  beforeAll(async () => {
    document.body.innerHTML = `
      <div id="volumeDialog"><div class="vd-bg"></div><div class="vd-slider" id="vdSlider"></div><div id="vdIcon"></div>
        <div class="vd-ringer-drawer" id="vdRingerDrawer"></div><button class="vd-settings" id="vdSettingsBtn"></button>
        <div class="vd-safety" id="vdSafety"></div><div class="vd-float-col" id="vdFloatSliders"></div></div>
      <div id="desktopArea"></div>`;
    const mod = await import('../ios-desktop/js/volume-dialog.js');
    mod.initVolumeDialog();
    hooks = mod.__testHooks();
  });
  beforeEach(() => {
    localStorage.removeItem('settings:sound-v1');
    mediaService.isPlaying = false;
    mediaService.external = null;
    mediaService.streams.get('host-radio').lastActiveTs = 0;
    mediaService.streams.get('external-music').lastActiveTs = 0;
  });
  afterEach(() => {
    localStorage.removeItem('settings:sound-v1');
  });

  it('C1 面板外 pointerdown → dismiss（ACTION_OUTSIDE 收起主路径）', () => {
    hooks.stepVolume(100 / 15);                       // 静默步进唤起面板（ring 档）
    expect(dialog().classList.contains('visible')).toBe(true);
    pointerDown(document.getElementById('desktopArea'));
    expect(dialog().classList.contains('visible')).toBe(false);
  });

  it('C2 主滑条 pointerdown → consume 不收起（unionViewBounds 子视图面）', () => {
    hooks.stepVolume(100 / 15);
    pointerDown(document.getElementById('vdSlider'));
    expect(dialog().classList.contains('visible')).toBe(true);
  });

  it('C3 铃声抽屉容器 pointerdown → consume 不收起（mTopContainer 同构）', () => {
    hooks.stepVolume(100 / 15);
    pointerDown(document.getElementById('vdRingerDrawer'));
    expect(dialog().classList.contains('visible')).toBe(true);
  });

  it('C4 安全警告层 pointerdown → consume 不收起（SafetyWarningDialog 交互面）', () => {
    hooks.stepVolume(100 / 15);
    pointerDown(document.getElementById('vdSafety'));
    expect(dialog().classList.contains('visible')).toBe(true);
  });

  it('C5 胶囊背景 .vd-bg 落点 → outside 收起（bounds 内非控件区，NOTE 同构）', () => {
    hooks.stepVolume(100 / 15);
    expect(dialog().classList.contains('visible')).toBe(true);
    pointerDown(dialog().querySelector('.vd-bg'));
    expect(dialog().classList.contains('visible')).toBe(false);
  });

  it('C6 面板未显示时 pointerdown → pass 零干预（不误收、不误唤；Escape 先归零自足化）', () => {
    hooks.stepVolume(100 / 15);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));   // DISMISS_REASON_BACK 同义归零
    expect(dialog().classList.contains('visible')).toBe(false);
    // 面板外与胶囊背景两落点均零唤起（滑条 pointerdown 自带 show() 属控件消费面，
    // 不在 pass 语义面内；隐藏态控件本就 hit-test 不可达）
    pointerDown(document.getElementById('desktopArea'));
    pointerDown(dialog().querySelector('.vd-bg'));
    expect(dialog().classList.contains('visible')).toBe(false);
  });
});

describe('v108-D · CSS 分层与源码锚（防回退）', () => {
  it('D1 .volume-dialog.visible 容器 pointer-events:none（显示态仍零触摸面）', () => {
    const s = stripComments(CSS);
    const m = s.match(/\.volume-dialog\.visible\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    expect(m[0]).toContain('pointer-events: none');
  });

  it('D2 控件 opt-in auto 并集块在位（五选择器齐全）', () => {
    const s = stripComments(CSS);
    const m = s.match(/\.volume-dialog\.visible \.vd-ringer-drawer[\s\S]*?\{[^}]*pointer-events:\s*auto[^}]*\}/);
    expect(m).not.toBeNull();
    for (const sel of ['.vd-slider', '.vd-settings', '.vd-float-col', '.vd-safety']) {
      expect(m[0]).toContain(sel);
    }
  });

  it('D3 接线消费角色判定 + 合并选择器 closest + TOUCH_OUTSIDE 收起（剥注释扫描）', () => {
    const s = stripComments(VD);
    expect(s).toContain('resolvePointerRole({ visible: isVisible(), insideTouchable })');
    expect(s).toContain('e.target.closest(TOUCHABLE_SELECTOR)');
    expect(s).toContain("dismiss(DISMISS_REASON_TOUCH_OUTSIDE)");
  });

  it('D4 纯逻辑层 AOSP 行号锚（flag 组合 L529-532 / insets L465-509 / onTouchEvent L2581-2593）', () => {
    expect(VT).toContain('L529-532');
    expect(VT).toContain('FLAG_NOT_TOUCH_MODAL');
    expect(VT).toContain('L465-487');
    expect(VT).toContain('L489-509');
    expect(VT).toContain('L2581-2593');
    expect(VT).toContain('dismissH(Events.DISMISS_REASON_TOUCH_OUTSIDE)');
  });

  it('D5 旧实现防回退：容器级 .volume-dialog closest 收起判据已退役', () => {
    const s = stripComments(VD);
    expect(s).not.toContain("!e.target.closest('.volume-dialog')");
  });
});
