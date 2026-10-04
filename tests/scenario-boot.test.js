// ==================== scenario-boot.test.js — 场景：全应用引导冒烟 ====================
//
// 把真实 index.html 骨架装入 happy-dom 并 import main.js，验证启动链完整性：
// 锁屏默认在场、桌面按数据渲染、全局钩子齐备、后台多任务骨架就绪。
// 这是场景体系的地基测试 —— 引导本身失败时，其余场景文件也会一并失败并指向此处。

import { describe, test, expect, beforeAll } from 'vitest';
import { bootDesktop, SCREEN_W, SCREEN_H } from './scenario-helpers.js';

let W;

beforeAll(async () => {
  W = await bootDesktop();
});

describe('场景：全应用引导', () => {
  test('main.js 模块级启动链零崩溃，全局测试钩子齐备', () => {
    expect(W.__state).toBeTruthy();
    expect(W.__lockTest).toBeTruthy();
    expect(typeof W.__lockTest.isLocked).toBe('function');
    expect(typeof W.__handleIframeGesture).toBe('function');
    expect(typeof W.pushSubPage).toBe('function');
    expect(typeof W.showSystemToast).toBe('function');
  });

  test('逻辑屏幕尺寸与真机竖屏一致（412×915）', () => {
    expect(W.innerWidth).toBe(SCREEN_W);
    expect(W.innerHeight).toBe(SCREEN_H);
  });

  test('默认锁屏在场：is-locked 全局态 + 锁屏 DOM 骨架完整', () => {
    expect(W.__lockTest.isLocked()).toBe(true);
    expect(document.body.classList.contains('is-locked')).toBe(true);

    const lockEl = document.getElementById('lockScreen');
    expect(lockEl).toBeTruthy();
    expect(lockEl.querySelector('.lock-clock')).toBeTruthy();
    expect(lockEl.querySelector('.lock-date')).toBeTruthy();
    expect(lockEl.querySelector('.lock-notifications')).toBeTruthy();
    expect(lockEl.querySelector('#lockTorchBtn')).toBeTruthy();
    expect(lockEl.querySelector('#lockCameraBtn')).toBeTruthy();
    expect(lockEl.style.display).toBe('flex');
  });

  test('桌面按持久化数据渲染：图标数量/页点数量与 state.pagesApps 一致', () => {
    W.__lockTest.instantUnlock();
    expect(W.__lockTest.isLocked()).toBe(false);
    expect(document.body.classList.contains('is-locked')).toBe(false);
    expect(document.getElementById('lockScreen').style.display).toBe('none');

    const state = W.__state;
    const totalIcons = state.pagesApps.reduce((n, p) => n + p.length, 0);
    const icons = document.querySelectorAll('.app-icon');
    expect(icons.length).toBe(totalIcons);
    expect(state.pagesApps.length).toBeGreaterThanOrEqual(2);

    // 默认布局：第 1 页 24 个应用
    expect(state.pagesApps[0].length).toBe(24);

    const dots = document.getElementById('pageDots');
    expect(dots.children.length).toBe(state.pagesApps.length);
    expect(dots.children[0].classList.contains('active')).toBe(true);
    expect(dots.getAttribute('aria-hidden')).toBe('true');
  });

  test('图标 a11y 契约：role=button / tabindex=0 / aria-label / 槽位网格定位', () => {
    const first = document.querySelector('.app-icon');
    expect(first.getAttribute('role')).toBe('button');
    expect(first.getAttribute('tabindex')).toBe('0');
    expect(first.getAttribute('aria-label')).toBe(`${first.querySelector('span').textContent}应用`);
    expect(first.dataset.page).toBe('0');
    expect(first.style.gridArea).toMatch(/^\d+ \/ \d+$/);
  });

  test('后台多任务骨架由 initRecentApps 注入，初始历史栈 7 项', async () => {
    const overlay = document.getElementById('recentAppsOverlay');
    expect(overlay).toBeTruthy();
    expect(document.getElementById('recentCardsDeck')).toBeTruthy();
    expect(document.getElementById('recentClearAllBtn')).toBeTruthy();

    const recent = await import('../ios-desktop/js/recent-apps.js');
    expect(recent.getRecentAppsList().length).toBe(7);
  });

  test('锁屏再上锁（快捷设置磁贴路径）：锁屏恢复展示且全局态同步', () => {
    W.__lockTest.instantLock();
    expect(W.__lockTest.isLocked()).toBe(true);
    expect(document.body.classList.contains('is-locked')).toBe(true);
    expect(document.getElementById('lockScreen').style.display).toBe('flex');
    W.__lockTest.instantUnlock();
  });
});
