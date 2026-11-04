// ==================== v95-clipboard-overlay.test.js — #95 剪贴板预览浮层（v9.72） ====================
// 纯逻辑核 ios-desktop/js/aosp/clipboard-overlay.js（ESM import 直测）：
//   A. summarizeClipboardItem 三类分档（换行折叠/截断/URL 检测/文件计数剪切标记）
//   B. resolveOverlayActions 动作分档（text→share/edit/open？URL 驱动；image→share；files→无）
//   C. createOverlayScheduler 状态机（show→4s expire 注入时钟/reShow 重置计时/hide 即刻/remainingMs）
//   D. 接线锚（clipboard.js 数据层零触碰 / main.js 挂载 / DOM 层消费 share-sheet / z 域 / visualViewport）
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CLIPBOARD_OVERLAY_AUTO_DISMISS_MS, CLIPBOARD_SUMMARY_MAX_LEN,
  summarizeClipboardItem, firstHttpUrl, resolveOverlayActions, createOverlayScheduler,
} from '../ios-desktop/js/aosp/clipboard-overlay.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// ==================== A. 摘要 ====================
describe('v9.72 #95 · A summarizeClipboardItem 三类分档', () => {
  it('常量实证：自动收起 4000ms + 摘要截断 100', () => {
    expect(CLIPBOARD_OVERLAY_AUTO_DISMISS_MS).toBe(4000);
    expect(CLIPBOARD_SUMMARY_MAX_LEN).toBe(100);
  });

  it('text：换行折叠 + 截断加省略号 + 空载荷安全', () => {
    expect(summarizeClipboardItem({ kind: 'text', text: 'a\nb\t c' }).summary).toBe('a b c');
    const long = 'x'.repeat(120);
    const r = summarizeClipboardItem({ kind: 'text', text: long });
    expect(r.summary.length).toBe(101); // 100 + …
    expect(r.summary.endsWith('…')).toBe(true);
    expect(summarizeClipboardItem(null).summary).toBe('');
    expect(summarizeClipboardItem({ kind: 'text', text: null }).summary).toBe('');
  });

  it('text：URL 检测（http/https 命中 → isUrl true；纯文本 false）', () => {
    expect(summarizeClipboardItem({ kind: 'text', text: '看这个 https://example.com/a?b=1 很棒' }).isUrl).toBe(true);
    expect(summarizeClipboardItem({ kind: 'text', text: '纯文本无链接' }).isUrl).toBe(false);
    expect(firstHttpUrl('前缀 http://a.b/c 后缀')).toBe('http://a.b/c');
    expect(firstHttpUrl('无链接')).toBeNull();
  });

  it('image：名称摘要；files：计数 + 剪切标记', () => {
    expect(summarizeClipboardItem({ kind: 'image', dataUrl: 'data:image/png;base64,x', name: 'shot.png' }).summary).toBe('图片 · shot.png');
    expect(summarizeClipboardItem({ kind: 'files', paths: ['/a', '/b'], cut: true }).summary).toBe('剪切 2 个文件');
    expect(summarizeClipboardItem({ kind: 'files', paths: ['/a'], cut: false }).summary).toBe('拷贝 1 个文件');
    expect(summarizeClipboardItem({ kind: 'files', paths: [] }).summary).toBe('拷贝 0 个文件');
  });
});

// ==================== B. 动作分档 ====================
describe('v9.72 #95 · B resolveOverlayActions 动作分档', () => {
  it('text：share+edit 常驻，open 仅 URL 出现（AOSP ClipboardOverlayView 动作行语义）', () => {
    expect(resolveOverlayActions({ kind: 'text', text: 'https://a.b/c' })).toEqual(['share', 'edit', 'open']);
    expect(resolveOverlayActions({ kind: 'text', text: 'hello' })).toEqual(['share', 'edit']);
  });
  it('image：仅 share；files：无动作；非法载荷安全', () => {
    expect(resolveOverlayActions({ kind: 'image', dataUrl: 'data:image/png;base64,x' })).toEqual(['share']);
    expect(resolveOverlayActions({ kind: 'files', paths: ['/a'] })).toEqual([]);
    expect(resolveOverlayActions(null)).toEqual([]);
  });
});

// ==================== C. 调度器状态机 ====================
describe('v9.72 #95 · C createOverlayScheduler 状态机', () => {
  function makeClock() {
    let t = 1000;
    return { now: () => t, advance: (ms) => { t += ms; } };
  }
  it('构造校验：autoDismissMs 非正数 RangeError', () => {
    expect(() => createOverlayScheduler({ autoDismissMs: 0 })).toThrow(RangeError);
    expect(() => createOverlayScheduler({ autoDismissMs: -1 })).toThrow(RangeError);
  });

  it('show → 4s 自动 expire（注入时钟）；hide 即刻收起不再触发', () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    const s = createOverlayScheduler({ autoDismissMs: 4000, onExpire });
    expect(s.visible()).toBe(false);
    s.show();
    expect(s.visible()).toBe(true);
    expect(s.remainingMs()).toBe(4000);
    vi.advanceTimersByTime(3999);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(s.visible()).toBe(false);
    // hide 即刻：不再 expire
    s.show();
    s.hide();
    vi.advanceTimersByTime(10000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('连续 show 重置计时（reShow 语义——AOSP 连续复制重新计时）', () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    const s = createOverlayScheduler({ autoDismissMs: 4000, onExpire });
    s.show();
    vi.advanceTimersByTime(3000);
    s.show(); // 重置
    expect(s.remainingMs()).toBe(4000);
    vi.advanceTimersByTime(3999);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

// ==================== D. 接线锚 ====================
describe('v9.72 #95 · D 接线（数据层零触碰 + 消费链）', () => {
  const uiSrc = read('ios-desktop/js/clipboard-overlay-ui.js');
  const mainSrc = read('ios-desktop/js/main.js');
  const clipSrc = read('ios-desktop/js/clipboard.js');

  it('main.js 挂载 initClipboardOverlay（initClipboard 之后同区）', () => {
    expect(mainSrc).toContain("import { initClipboardOverlay } from './clipboard-overlay-ui.js'");
    expect(mainSrc).toContain('initClipboardOverlay();');
    expect(mainSrc.indexOf('initClipboard();')).toBeLessThan(mainSrc.indexOf('initClipboardOverlay();'));
  });

  it('DOM 层消费 subscribe 广播（数据层零触碰：clipboard.js 无浮层逻辑渗入）', () => {
    expect(uiSrc).toContain("import { subscribe } from './clipboard.js'");
    expect(uiSrc).toContain('scheduler.show();');
    expect(clipSrc).not.toContain('clipboardOverlay'); // 数据层零渗入
    expect(clipSrc).toContain('function notifyChange()'); // 广播机制原样
  });

  it('动作真实消费 #200 share-sheet + safari 深链（emitToApp navigate）', () => {
    expect(uiSrc).toContain('window.__shareSheet.open(payload)');
    expect(uiSrc).toContain("emitToApp('safari', 'navigate', { url");
  });

  it('z 域 9100（系统浮层域 HUN 10005 之下）+ visualViewport 软键盘避让（#77-B 首用）', () => {
    expect(uiSrc).toContain('z-index:9100');
    expect(uiSrc).toContain('window.visualViewport');
    expect(uiSrc).toContain("vv.addEventListener('resize', avoid)");
  });

  it('点击外部收起（pointerdown 捕获 + 卡内豁免）+ 无头观测钩子', () => {
    expect(uiSrc).toContain("document.addEventListener('pointerdown'");
    expect(uiSrc).toContain('rootEl.contains(e.target)');
    expect(uiSrc).toContain('window.__clipboardOverlayTest');
  });
});
