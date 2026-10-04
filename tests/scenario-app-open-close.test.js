// ==================== scenario-app-open-close.test.js — 场景：应用打开与关闭 ====================
//
// 全链路用户路径：图标点按 / 键盘激活（a11y）→ 弹簧展开为全屏 → 底部手势条上滑关闭 /
// 小幅拖拽回弹。打开动作走 drag-reorder 的真实 click 链路，关闭走 main.js 暴露的
// iframe 手势桥接（window.__handleIframeGesture —— 与沙箱应用内手势同一管道）。

import { describe, test, expect, beforeAll, vi } from 'vitest';
import { bootDesktop, SCREEN_W, SCREEN_H, sleep } from './scenario-helpers.js';

let W;
let recent;

beforeAll(async () => {
  W = await bootDesktop();
  recent = await import('../ios-desktop/js/recent-apps.js');
  W.__lockTest.instantUnlock();
});

/** 桌面上第一个目标图标元素 */
function iconEl(appId) {
  return document.querySelector(`.app-icon[data-id="${appId}"]`) || document.querySelector('.app-icon');
}

const gesture = (type, x, y, extra) => {
  W.__handleIframeGesture(type, x, y, extra);
};

describe('场景：应用打开与关闭', () => {
  test('点按图标 → 弹簧展开为全屏应用（真实 click 链路）', async () => {
    const icon = iconEl('settings');
    expect(icon).toBeTruthy();
    icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(W.__state.isOpen).toBe(true);
    }, { timeout: 4000, interval: 40 });
    expect(W.__state.currentApp.id).toBe('settings');
    expect(W.__state.navHistory).toEqual([0]);
    expect(document.getElementById('appWindow').classList.contains('open')).toBe(true);

    // 打开动作计入多任务历史（异步 import 后置顶）
    await vi.waitFor(() => {
      expect(recent.getRecentAppsList()[0]).toBe('settings');
    }, { timeout: 2000, interval: 40 });
  });

  test('应用打开期间桌面分页拖拽被锁（slider 不受桌面手势影响）', () => {
    const slider = document.getElementById('desktopSlider');
    const before = slider.style.transform;

    slider.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 206, clientY: 400 }));
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: 96, clientY: 400 }));
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: 96, clientY: 400 }));

    expect(slider.style.transform).toBe(before);
    expect(W.__state.currentPage).toBe(0);
  });

  test('底部上滑（应用内手势桥接）→ 弹簧收拢关闭，状态完全复位', async () => {
    expect(W.__state.isOpen).toBe(true);
    expect(document.body.classList.contains('is-locked')).toBe(false);

    gesture('down', 206, SCREEN_H - 15, 'BOTTOM');
    expect(W.__state.drag.active).toBe(true);
    expect(document.getElementById('appWindow').classList.contains('dragging')).toBe(true);

    gesture('move', 206, 600);
    gesture('move', 206, 450);
    gesture('up');

    await vi.waitFor(() => {
      expect(W.__state.isOpen).toBe(false);
    }, { timeout: 5000, interval: 40 });
    expect(W.__state.currentApp).toBeNull();
    expect(W.__state.isClosing).toBe(false);
    expect(document.getElementById('appWindow').classList.contains('open')).toBe(false);
  });

  test('键盘激活（Enter）打开应用 —— a11y 与点按同路径', async () => {
    const icon = iconEl('weather') || iconEl();
    icon.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(W.__state.isOpen).toBe(true);
    }, { timeout: 4000, interval: 40 });
    expect(W.__state.currentApp.id).toBe(icon.dataset.id);
  });

  test('底部小幅上拖未达阈值 → 弹簧回弹全屏（不误关）', async () => {
    // 拟人化慢速小拖：总位移 28px（<35 复合速度线 / <128 距离线），
    // 分帧间隔 100ms → 采样速度 ≈ -140px/s（> -220 flick 线，< 380 关闭线）
    gesture('down', 206, SCREEN_H - 15, 'BOTTOM');
    await sleep(100);
    gesture('move', 206, SCREEN_H - 31);
    await sleep(100);
    gesture('move', 206, SCREEN_H - 43);
    await sleep(150);
    gesture('up');

    // 回弹动画后仍处于打开态
    await sleep(700);
    expect(W.__state.isOpen).toBe(true);
    expect(W.__state.currentApp).toBeTruthy();

    // 收尾：上滑关闭复位，避免状态泄漏
    gesture('down', 206, SCREEN_H - 15, 'BOTTOM');
    gesture('move', 206, 500);
    gesture('up');
    await vi.waitFor(() => {
      expect(W.__state.isOpen).toBe(false);
    }, { timeout: 5000, interval: 40 });
  });
});
