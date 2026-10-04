// ==================== scenario-lock.test.js — 场景：锁屏与解锁 ====================
//
// 覆盖真实交互路径而非只测钩子：
//   · Pointer 事件驱动的上滑解锁手势（跟手位移 → 释放提交/回弹的弹簧物理）
//   · 快捷入口语义（相机按钮 = 解锁 + 直开应用）
//   · 解锁后系统手势管道解锁（gestures.onDown 的 is-locked 闸门）

import { describe, test, expect, beforeAll, vi } from 'vitest';
import { bootDesktop, SCREEN_H, sleep } from './scenario-helpers.js';

let W;
const pointer = (el, type, x, y) =>
  el.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, pointerId: 1, clientX: x, clientY: y,
  }));

beforeAll(async () => {
  W = await bootDesktop();
});

describe('场景：锁屏与解锁', () => {
  test('慢速小幅上滑（未达距离/速度阈值）→ 弹簧回弹，保持锁定', async () => {
    const lockEl = document.getElementById('lockScreen');
    W.__lockTest.instantLock();

    pointer(lockEl, 'pointerdown', 206, 700);
    // 跟手上滑 60px（915*0.25≈229 提交线，60px 远未达），分多帧移动模拟拖拽
    for (let y = 700; y >= 640; y -= 20) {
      pointer(window, 'pointermove', 206, y);
      await sleep(16);
    }
    // 释放前停顿压低速度（<260ms 快扫窗口之外的速度不被采信）
    await sleep(300);
    pointer(window, 'pointerup', 206, 640);

    // 回弹动画结束后仍在锁屏
    await vi.waitFor(() => {
      expect(lockEl.style.transform).toBe('translate3d(0, 0, 0)');
    }, { timeout: 3000, interval: 40 });
    expect(W.__lockTest.isLocked()).toBe(true);
  });

  test('大幅上滑超过屏高 25% → 弹簧提交飞出，完成解锁', async () => {
    const lockEl = document.getElementById('lockScreen');
    expect(W.__lockTest.isLocked()).toBe(true);

    pointer(lockEl, 'pointerdown', 206, 700);
    for (let y = 700; y >= 380; y -= 40) {
      pointer(window, 'pointermove', 206, y);
      await sleep(12);
    }
    pointer(window, 'pointerup', 206, 380);

    await vi.waitFor(() => {
      expect(W.__lockTest.isLocked()).toBe(false);
    }, { timeout: 4000, interval: 40 });
    expect(document.body.classList.contains('is-locked')).toBe(false);
    expect(lockEl.style.display).toBe('none');
    // 提交解锁后拖拽尾随的 click 应被抑制容忍：锁屏仍存在于 DOM（display:none）
    expect(lockEl.isConnected).toBe(true);
  });

  test('快速轻扫（位移超屏高 10% + 释放速度达标）→ 同样提交解锁', async () => {
    W.__lockTest.instantLock();
    const lockEl = document.getElementById('lockScreen');

    pointer(lockEl, 'pointerdown', 206, 500);
    // 快速连帧：120px 位移在 <260ms 内完成且每帧速度 > 0.55px/ms
    pointer(window, 'pointermove', 206, 470);
    await sleep(8);
    pointer(window, 'pointermove', 206, 410);
    await sleep(8);
    pointer(window, 'pointermove', 206, 360);
    pointer(window, 'pointerup', 206, 360);

    await vi.waitFor(() => {
      expect(W.__lockTest.isLocked()).toBe(false);
    }, { timeout: 4000, interval: 40 });
  });

  test('锁屏相机快捷键：解锁并直开相机应用（带源矩形动画路径）', async () => {
    W.__lockTest.instantLock();
    const cameraBtn = document.querySelector('#lockCameraBtn');
    cameraBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(W.__state.isOpen).toBe(true);
    }, { timeout: 4000, interval: 40 });
    expect(W.__lockTest.isLocked()).toBe(false);
    expect(W.__state.currentApp.id).toBe('camera');
  });

  test('锁屏状态下全局手势管道被闸门屏蔽（onDown 直接短路）', async () => {
    W.__lockTest.instantLock();

    // 模拟沙箱应用手势桥接：锁屏期间不应产生任何拖拽态
    W.__handleIframeGesture('down', 206, 900, 'BOTTOM');
    W.__handleIframeGesture('move', 206, 700);
    W.__handleIframeGesture('up');

    expect(W.__state.isDragging).toBe(false);
    expect(W.__state.drag.active).toBe(false);
    W.__lockTest.instantUnlock();
  });

  test('解锁后手势管道放行：上滑手势真实接管打开中的应用并关闭', async () => {
    // 相机应用仍处于打开态（上一场景遗留）
    expect(W.__lockTest.isLocked()).toBe(false);
    expect(W.__state.isOpen).toBe(true);

    W.__handleIframeGesture('down', 206, 900, 'BOTTOM');
    expect(W.__state.drag.active).toBe(true);
    expect(W.__state.isDragging).toBe(true);
    expect(W.__state.gestureType).toBe('BOTTOM');
    expect(document.getElementById('appWindow').classList.contains('dragging')).toBe(true);

    W.__handleIframeGesture('move', 206, 600);
    W.__handleIframeGesture('up');

    await vi.waitFor(() => {
      expect(W.__state.isOpen).toBe(false);
    }, { timeout: 4000, interval: 40 });
    expect(W.__state.currentApp).toBeNull();
    expect(W.__state.isDragging).toBe(false);
  });
});
