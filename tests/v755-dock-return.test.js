// ==================== v755-dock-return.test.js — v7.55 同名图标打开/关闭归属回归 ====================
//
// 用户报告：Dock 与桌面存在同名（同应用）图标时，从 Dock 打开的窗口关闭后
// 会缩回桌面图标而不是 Dock 图标 ——「打开的是哪个，返回时就该回到哪个地方」。
//
// 根因：Dock 最近应用列表变化（每次开应用 650ms 后 recordAppOpened 广播
// dock-refresh-requested）/ 视口跨断点 / 偏好变更都会让 dock.js 用 innerHTML
// 整体重建按钮 —— state.currentIconEl（开窗来源图标）随即变成游离节点，
// 关窗归巢的实时重校准（findRealtimeTargetRect 第 2 步 isConnected 校验）
// 失效后退化为桌面同名图标坐标。
//
// 修复（三层）：
//   ① dock.js renderDock 重建前记住来源按钮，重建后把引用接力到同 id 活按钮
//   ② app-window.js findRealtimeTargetRect 新增 2.5 步：来源是 Dock 按钮但
//     引用失效 → 按应用 id 重解析 Dock 在场按钮；实在不在场（最近槽被顶掉/
//     被移出 Dock）→ 回退开窗时记录的 Dock 原位坐标，绝不落桌面同名图标
//   ③ utils.js getIconRect 识别 .dock-icon-box —— Dock 开窗/归巢精确到图标
//     字形而非按钮外框
//
// 测试分层：
//   · 场景层（bootDesktop 真实启动链）：Dock 打开 → 真实 650ms 重建接力 →
//     手势关窗 → 归巢坐标断言；桌面打开优先级；Dock 按钮被顶掉的回退
//   · 单元层（dock.js 裸 DOM）：renderDock 接力的直接验证
//   · 锚定层：三处修复源码 + sw 版本 geek-v65
//
// 注：happy-dom 无真实布局（getBoundingClientRect 恒 0 → getIconRect 回退
// 屏幕中心），场景测试给 Dock 字形与桌面字形打上完全不同的坐标桩，
// 归巢落点落在哪一边一测便知。

import { describe, test, expect, beforeAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { bootDesktop, SCREEN_H, sleep } from './scenario-helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

let W;

// 两套互斥坐标桩：Dock 在屏幕底部（y≈850），桌面图标在网格上部（y≈200）
const DOCK_RECT = { left: 120, top: 850, width: 54, height: 54 };   // 中心 (147, 877)
const DESK_RECT = { left: 100, top: 200, width: 58, height: 58 };   // 中心 (129, 229)
const stub = (el, rect) => {
  if (!el) return;
  el.getBoundingClientRect = () => ({
    left: rect.left, top: rect.top, width: rect.width, height: rect.height,
    right: rect.left + rect.width, bottom: rect.top + rect.height,
    x: rect.left, y: rect.top, toJSON() {},
  });
};

/** 给当前在场的 camera 两个入口（Dock 字形 / 桌面字形）打坐标桩 */
function stubSourceRects() {
  stub(document.querySelector('.dock-bar .dock-app-icon[data-id="camera"] .dock-icon-box'), DOCK_RECT);
  stub(document.querySelector('.page-grid .app-icon[data-id="camera"] .icon-box'), DESK_RECT);
}

const gesture = (type, x, y, extra) => W.__handleIframeGesture(type, x, y, extra);

beforeAll(async () => {
  // Dock 播种：camera 固定在 Dock（模块级 loadDockItems 在 import 时读取）
  localStorage.setItem('ios-desktop:dock-items', JSON.stringify(['camera', 'safari']));
  W = await bootDesktop();
  W.__lockTest.instantUnlock();
});

describe('v7.55 场景：同名图标重合（Dock × 桌面）的打开/关闭归属', () => {
  test('① 从 Dock 打开 → 真实 650ms 链路重建 Dock → 来源引用接力到活按钮', async () => {
    const dockBtn = document.querySelector('.dock-bar .dock-app-icon[data-id="camera"]');
    expect(dockBtn).toBeTruthy();
    // 重合前提：同名图标同时在桌面网格在场
    expect(document.querySelector('.page-grid .app-icon[data-id="camera"]')).toBeTruthy();
    stubSourceRects();

    dockBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(W.__state.isOpen).toBe(true), { timeout: 4000, interval: 40 });
    expect(W.__state.currentApp.id).toBe('camera');
    // 开窗来源 = Dock 按钮，起点坐标 = Dock 字形中心（修复③精确测量）
    expect(W.__state.currentIconEl.classList.contains('dock-app-icon')).toBe(true);
    expect(W.__state.iconCX).toBe(147);
    expect(W.__state.iconCY).toBe(877);

    // 真实链路：openApp 的 650ms 延时 → recordAppOpened → dock-refresh-requested
    // → renderDock innerHTML 重建 → ①接力：引用换到同 id 活按钮
    await vi.waitFor(() => {
      expect(W.__state.currentIconEl).not.toBe(dockBtn);      // 旧按钮已被重建替换
      expect(W.__state.currentIconEl.isConnected).toBe(true); // 引用仍连在文档上
    }, { timeout: 4000, interval: 60 });
    expect(W.__state.currentIconEl.classList.contains('dock-app-icon')).toBe(true);
    expect(W.__state.currentIconEl.dataset.id).toBe('camera');
  });

  test('② 关窗归巢：Dock 打开 + 重建后 → 缩回 Dock 图标坐标而非桌面同名图标', async () => {
    expect(W.__state.isOpen).toBe(true);
    stubSourceRects();
    gesture('down', 206, SCREEN_H - 15, 'BOTTOM');
    gesture('move', 206, 600);
    gesture('move', 206, 450);
    gesture('up');
    await vi.waitFor(() => expect(W.__state.isOpen).toBe(false), { timeout: 5000, interval: 40 });

    // closeApp 动态重校准的归巢坐标 = Dock 字形中心；桌面桩中心 (129,229) 不许胜出
    expect(W.__state.iconCX).toBe(147);
    expect(W.__state.iconCY).toBe(877);
  });

  test('③ 重合优先级：从桌面打开同名应用 → 归巢仍是桌面图标（Dock 不抢）', async () => {
    stubSourceRects();
    const deskIcon = document.querySelector('.page-grid .app-icon[data-id="camera"]');
    expect(deskIcon).toBeTruthy();
    deskIcon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(W.__state.isOpen).toBe(true), { timeout: 4000, interval: 40 });
    expect(W.__state.currentApp.id).toBe('camera');
    expect(W.__state.currentIconEl).toBe(deskIcon);

    // 归巢目标实时校验：桌面坐标胜出
    const t = W.__findTarget('camera');
    expect(t.cx).toBe(129);
    expect(t.cy).toBe(229);

    // 收尾关窗：归巢同样落桌面（从哪来回哪去）
    gesture('down', 206, SCREEN_H - 15, 'BOTTOM');
    gesture('move', 206, 500);
    gesture('up');
    await vi.waitFor(() => expect(W.__state.isOpen).toBe(false), { timeout: 5000, interval: 40 });
    expect(W.__state.iconCX).toBe(129);
    expect(W.__state.iconCY).toBe(229);
  });

  test('④ Dock 按钮被顶掉（最近槽翻滚/移出）→ 回退开窗原位，绝不落桌面', () => {
    // 构造：来源引用 = 已游离的 Dock 按钮（类名契约保留 Dock 语义）
    const orphan = document.createElement('button');
    orphan.className = 'dock-app-icon';
    orphan.dataset.id = 'camera';
    W.__state.currentIconEl = orphan;

    // 现场移除 camera 的 Dock 按钮（模拟最近槽被新近应用顶替）
    const live = document.querySelector('.dock-bar .dock-app-icon[data-id="camera"]');
    const parent = live && live.parentNode;
    const next = live && live.nextSibling;
    if (live) live.remove();

    // 开窗时记录的 Dock 原位（与 Dock 桩中心一致）
    W.__state.iconCX = 147; W.__state.iconCY = 877;
    W.__state.iconW = 54; W.__state.iconH = 54;

    try {
      const t = W.__findTarget('camera');
      expect(t.cx).toBe(147);
      expect(t.cy).toBe(877);
      expect(t.cx).not.toBe(129); // 桌面桩中心从未胜出
    } finally {
      if (parent) parent.insertBefore(live, next); // 还原现场
    }
  });

  test('⑤ 承接语义：应用全屏时再点 Dock 图标 → 来源跟随最后一次点按', async () => {
    stubSourceRects();
    const dockBtn = document.querySelector('.dock-bar .dock-app-icon[data-id="camera"]');
    dockBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(W.__state.isOpen).toBe(true), { timeout: 4000, interval: 40 });
    // 本体快速承接：来源引用改挂 Dock 按钮（最后点按的入口胜出）
    expect(W.__state.currentIconEl.classList.contains('dock-app-icon')).toBe(true);

    // 收尾：关窗复位，防状态泄漏（归巢坐标为 Dock 侧）
    gesture('down', 206, SCREEN_H - 15, 'BOTTOM');
    gesture('move', 206, 500);
    gesture('up');
    await vi.waitFor(() => expect(W.__state.isOpen).toBe(false), { timeout: 5000, interval: 40 });
    expect(W.__state.iconCX).toBe(147);
    expect(W.__state.iconCY).toBe(877);
  });
});

// ==================== 单元层拆分见 v755-dock-unit.test.js（每文件独立模块图） ====================

// ==================== 锚定层：源码与版本 ====================

describe('v7.55 源码锚定', () => {
  test('dock.js：renderDock 重建接力块在场', () => {
    const src = R('ios-desktop/js/dock.js');
    expect(src).toContain('v7.55：重建前接力「开窗来源图标」引用');
    expect(src).toContain('itemsEl.contains(state.currentIconEl)');
    expect(src).toContain('state.currentIconEl = freshBtn;');
  });

  test('app-window.js：归巢 2.5 步 Dock 重解析 + 开窗原位回退在场', () => {
    const src = R('ios-desktop/js/app-window.js');
    expect(src).toContain("classList.contains('dock-app-icon')");
    expect(src).toContain('.dock-bar .dock-app-icon[data-id');
    expect(src).toContain('return { cx: state.iconCX, cy: state.iconCY, w: state.iconW, h: state.iconH, el: null };');
  });

  test('utils.js：getIconRect 识别 .dock-icon-box', () => {
    expect(R('ios-desktop/js/utils.js')).toContain("el.querySelector('.dock-icon-box')");
  });

  test('sw.js VERSION = geek-v65', () => {
    expect(R('sw.js')).toContain("const VERSION = 'geek-v65';");
  });
});
