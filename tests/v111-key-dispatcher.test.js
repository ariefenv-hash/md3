// ==================== v111-key-dispatcher.test.js — #111 系统组合键路由 ====================
//
// 覆盖（PhoneWindowManager 组合键拦截语义 + AccessibilityShortcutController 同构纯逻辑 + 接线）：
//   A. 构造校验：chords 必填 / chord 形状（RangeError）
//   B. 音量双键 3s：AOSP 无障碍快捷键语义（凑齐→保持→触发）
//   C. 超时取消：holdMs 内未凑齐 / armed 后 checkDue 未到期
//   D. 提前释放取消：armed 后任一成员 up → cancel
//   E. 集合外键破坏：armed 后 down 其他键 → 下次评估破坏（严格精确匹配）
//   F. repeat 不重置：AOSP repeat 不重置组合键计时
//   G. holdMs=0 齐按即触发（KEYCODE_SYSRQ 网页等价 Ctrl+Shift+S）
//   H. 顺序无关 + 触发后可复触发（状态清干净）
//   I. normalizeKeyName 双平台音量键归一
//   J. 接线锚：volume-dialog 三面 + quick-settings 四面 + 回归锚
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createKeyDispatcher, normalizeKeyName,
  POWER_LONG_PRESS_MS, ACCESSIBILITY_CHORD_HOLD_MS,
} from '../ios-desktop/js/aosp/key-dispatcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repo = join(__dirname, '..');
const read = (p) => readFileSync(join(repo, p), 'utf8');

/** 手动时钟（确定性） */
function makeClock(start = 1000) {
  let t = start;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

describe('A. 构造校验（require 语义）', () => {
  it('空 chords → RangeError', () => {
    expect(() => createKeyDispatcher({ chords: [] })).toThrow(RangeError);
    expect(() => createKeyDispatcher({})).toThrow(RangeError);
  });

  it('坏 chord 形状 → RangeError（负 holdMs / 空键集 / 缺 id）', () => {
    expect(() => createKeyDispatcher({ chords: [{ id: 'x', keys: [], holdMs: 100 }] })).toThrow(RangeError);
    expect(() => createKeyDispatcher({ chords: [{ id: 'x', keys: ['a'], holdMs: -1 }] })).toThrow(RangeError);
    expect(() => createKeyDispatcher({ chords: [{ keys: ['a'], holdMs: 100 }] })).toThrow(RangeError);
  });
});

describe('B. 音量双键 3s（AccessibilityShortcutController 同构）', () => {
  it('凑齐 → 保持 3s → checkDue 触发 accessibility_shortcut', () => {
    const clk = makeClock();
    const fired = [];
    const d = createKeyDispatcher({
      chords: [{ id: 'accessibility_shortcut', keys: ['volume-up', 'volume-down'], holdMs: ACCESSIBILITY_CHORD_HOLD_MS }],
      now: clk.now,
      onTrigger: (c) => fired.push(c.id),
    });
    d.feed('down', 'volume-up');
    expect(d.__state().armed.length).toBe(0); // 单键未凑齐
    clk.advance(1000);
    d.feed('down', 'volume-down');            // 凑齐
    expect(d.__state().armed.length).toBe(1);
    clk.advance(1500);
    expect(d.checkDue().action).toBe('none'); // 未满 3s
    clk.advance(1500);
    const r = d.checkDue();                    // 满 3s
    expect(r.action).toBe('trigger');
    expect(r.chordId).toBe('accessibility_shortcut');
    expect(fired).toEqual(['accessibility_shortcut']);
  });

  it('间隔超 3s 才凑齐 → 首键超窗（armed 时刻以第二键 down 起算，AOSP 同构：窗从凑齐起）', () => {
    const clk = makeClock();
    const d = createKeyDispatcher({
      chords: [{ id: 'a11y', keys: ['volume-up', 'volume-down'], holdMs: 3000 }],
      now: clk.now,
    });
    d.feed('down', 'volume-up');
    clk.advance(10000);
    d.feed('down', 'volume-down');
    // AOSP AccessibilityShortcutController 语义：双键同时按住 3s——第二键落下即凑齐窗起点
    expect(d.__state().armed.length).toBe(1);
    clk.advance(2999);
    expect(d.checkDue().action).toBe('none');
    clk.advance(1);
    expect(d.checkDue().action).toBe('trigger');
  });
});

describe('C. 超时/未到期', () => {
  it('feed 之间不自动触发（纯惰性判定，无隐式定时）', () => {
    const clk = makeClock();
    const d = createKeyDispatcher({
      chords: [{ id: 'a11y', keys: ['volume-up', 'volume-down'], holdMs: 3000 }],
      now: clk.now,
    });
    d.feed('down', 'volume-up');
    d.feed('down', 'volume-down');
    clk.advance(5000);
    // 未调 checkDue 前一切 feed 返回 none（惰性）
    expect(d.feed('repeat', 'volume-up').action).toBe('none');
    expect(d.checkDue().action).toBe('trigger');
  });
});

describe('D. 提前释放取消', () => {
  it('armed 后任一成员 up → cancel + 状态清', () => {
    const clk = makeClock();
    const d = createKeyDispatcher({
      chords: [{ id: 'a11y', keys: ['volume-up', 'volume-down'], holdMs: 3000 }],
      now: clk.now,
    });
    d.feed('down', 'volume-up');
    d.feed('down', 'volume-down');
    clk.advance(1000);
    const r = d.feed('up', 'volume-down');
    expect(r.action).toBe('cancel');
    expect(r.chordId).toBe('a11y');
    clk.advance(5000);
    expect(d.checkDue().action).toBe('none'); // 取消后永不触发
    expect(d.__state().armed.length).toBe(0);
  });

  it('非成员键 up 不影响 armed', () => {
    const clk = makeClock();
    const d = createKeyDispatcher({
      chords: [{ id: 'a11y', keys: ['volume-up', 'volume-down'], holdMs: 3000 }],
      now: clk.now,
    });
    d.feed('down', 'volume-up');
    d.feed('down', 'volume-down');
    expect(d.feed('up', 'meta').action).toBe('none');
    expect(d.__state().armed.length).toBe(1);
  });
});

describe('E. 集合外键破坏（严格精确匹配）', () => {
  it('armed 后 down 第三键 → 该 chord 破坏', () => {
    const clk = makeClock();
    const d = createKeyDispatcher({
      chords: [{ id: 'a11y', keys: ['volume-up', 'volume-down'], holdMs: 3000 }],
      now: clk.now,
    });
    d.feed('down', 'volume-up');
    d.feed('down', 'volume-down');
    expect(d.__state().armed.length).toBe(1);
    d.feed('down', 'meta'); // 集合外键
    clk.advance(5000);
    expect(d.checkDue().action).toBe('none'); // 被破坏
    expect(d.__state().armed.length).toBe(0);
  });
});

describe('F. repeat 不重置（AOSP 语义）', () => {
  it('armed 后 repeat 不刷新 armedAt（保持原窗）', () => {
    const clk = makeClock();
    const d = createKeyDispatcher({
      chords: [{ id: 'a11y', keys: ['volume-up', 'volume-down'], holdMs: 3000 }],
      now: clk.now,
    });
    d.feed('down', 'volume-up');
    d.feed('down', 'volume-down'); // armedAt = 1000
    clk.advance(2000);
    d.feed('repeat', 'volume-up');  // 不重置
    clk.advance(1000);              // 距 armedAt 恰 3000
    expect(d.checkDue().action).toBe('trigger');
  });

  it('repeat 不产生触发', () => {
    const clk = makeClock();
    const fired = [];
    const d = createKeyDispatcher({
      chords: [{ id: 'a11y', keys: ['volume-up', 'volume-down'], holdMs: 3000 }],
      now: clk.now,
      onTrigger: (c) => fired.push(c.id),
    });
    d.feed('down', 'volume-up');
    d.feed('down', 'volume-down');
    for (let i = 0; i < 10; i++) d.feed('repeat', 'volume-up');
    expect(fired).toEqual([]);
  });
});

describe('G. holdMs=0 齐按即触发（KEYCODE_SYSRQ 网页等价）', () => {
  it('Ctrl+Shift+S 三键凑齐瞬间 trigger', () => {
    const clk = makeClock();
    const fired = [];
    const d = createKeyDispatcher({
      chords: [{ id: 'screenshot_sysrq', keys: ['control', 'shift', 's'], holdMs: 0 }],
      now: clk.now,
      onTrigger: (c) => fired.push(c.id),
    });
    d.feed('down', 'control');
    d.feed('down', 'shift');
    const r = d.feed('down', 's');
    expect(r.action).toBe('trigger');
    expect(r.chordId).toBe('screenshot_sysrq');
    expect(fired).toEqual(['screenshot_sysrq']);
  });
});

describe('H. 顺序无关 + 可复触发', () => {
  it('键序任意（down 顺序不影响凑齐）', () => {
    const clk = makeClock();
    const d = createKeyDispatcher({
      chords: [{ id: 'a11y', keys: ['volume-down', 'volume-up'], holdMs: 1000 }],
      now: clk.now,
    });
    d.feed('down', 'volume-down');
    expect(d.__state().armed.length).toBe(0);
    d.feed('down', 'volume-up');
    expect(d.__state().armed.length).toBe(1);
  });

  it('触发后 reset 清态 → 可再次完整触发', () => {
    const clk = makeClock();
    const fired = [];
    const d = createKeyDispatcher({
      chords: [{ id: 'a11y', keys: ['volume-up', 'volume-down'], holdMs: 1000 }],
      now: clk.now,
      onTrigger: (c) => fired.push(c.id),
    });
    d.feed('down', 'volume-up');
    d.feed('down', 'volume-down');
    clk.advance(1000);
    d.checkDue();
    // AOSP：触发后组合键重置（不要求全部释放才能再触发）
    d.feed('down', 'volume-up');
    d.feed('down', 'volume-down');
    clk.advance(1000);
    expect(d.checkDue().action).toBe('trigger');
    expect(fired).toEqual(['a11y', 'a11y']);
  });
});

describe('I. normalizeKeyName 双平台归一', () => {
  it('Chrome/Windows 音量键 → 同一抽象名', () => {
    expect(normalizeKeyName('AudioVolumeUp')).toBe('volume-up');
    expect(normalizeKeyName('VolumeUp')).toBe('volume-up');
    expect(normalizeKeyName('AudioVolumeDown')).toBe('volume-down');
    expect(normalizeKeyName('VolumeDown')).toBe('volume-down');
  });

  it('修饰键归一 + 其他键小写化', () => {
    expect(normalizeKeyName('Control')).toBe('control');
    expect(normalizeKeyName('Shift')).toBe('shift');
    expect(normalizeKeyName('S')).toBe('s');
  });
});

describe('J. 接线锚 — volume-dialog / quick-settings / 回归', () => {
  const vd = read('ios-desktop/js/volume-dialog.js');
  const qs = read('ios-desktop/js/quick-settings.js');
  const lock = read('ios-desktop/js/lock-screen.js');

  it('volume-dialog：key-dispatcher 消费 + 音量双键 chord + 截图 chord + keyup 喂流', () => {
    expect(vd).toContain("from './aosp/key-dispatcher.js'");
    expect(vd).toContain("'accessibility_shortcut'");
    expect(vd).toContain('ACCESSIBILITY_CHORD_HOLD_MS');
    expect(vd).toContain("'screenshot_sysrq'");
    expect(vd).toContain("addEventListener('keyup'");
  });

  it('volume-dialog：既有音量步进零破坏（stepVolume 主链仍在）', () => {
    expect(vd).toContain('stepVolume(KEY_STEP)');
    expect(vd).toContain('stepVolume(-KEY_STEP)');
  });

  it('volume-dialog：无障碍触发走 AOSP toast 语义（showSystemToast + 震动）', () => {
    expect(vd).toContain('showSystemToast');
    expect(vd).toContain('navigator.vibrate');
  });

  it('qsPowerBtn pointer 长按语义（短按锁屏/长按电源对话）+ HTML 结构零变（index.html）', () => {
    expect(qs).toContain("'power_long_press'");
    expect(qs).toContain('POWER_LONG_PRESS_MS');
    expect(qs).toContain('lockNow');
    expect(read('ios-desktop/index.html')).toContain('class="qs-action-btn power" id="qsPowerBtn"');
  });

  it('lock-screen：lockNow 导出面在库（#35 既有链复用）', () => {
    expect(lock).toContain('export function lockNow()');
  });

  it('key-dispatcher.js 纯逻辑纪律：零 DOM / 零 window / 零 setTimeout', () => {
    const src = read('ios-desktop/js/aosp/key-dispatcher.js')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).not.toMatch(/\bdocument\./);
    expect(src).not.toMatch(/\bwindow\./);
    expect(src).not.toMatch(/\bsetTimeout\b/);
  });

  it('常量语义：POWER 0.5s / A11Y 3s（AOSP 源值）', () => {
    expect(POWER_LONG_PRESS_MS).toBe(500);
    expect(ACCESSIBILITY_CHORD_HOLD_MS).toBe(3000);
  });
});
