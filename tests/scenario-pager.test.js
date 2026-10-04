// ==================== scenario-pager.test.js — 场景：桌面 Live Pager 跟手分页 ====================
//
// 通过 main.js 真实接线的鼠标事件链（mousedown → mousemove → mouseup）驱动 Live Pager，
// 断言闪屏修复轮确立的交互契约：
//   · 拖拽 1:1 跟手（纯合成器写入，transition 关闭）
//   · 越界 0.35 橡皮筋阻尼
//   · 位移过半吸附翻页 / 快速轻甩按速度惯性翻页 / 慢速小位移不误翻
//   · 飞行中接管基点来自 computed matrix —— readSliderTx 的 matrix/matrix3d 双格式解析
//     （历史 bug：正则误写 matrix3d?\( 永远匹配不到 2D matrix，导致从第 2 页起滑剧跳）
//   · 图标起点按下不触发分页拖拽（防误触）
//   · 滑动收尾 350ms 内吞掉落点 click（防误开另一页图标）

import { describe, test, expect, beforeAll } from 'vitest';
import { bootDesktop, SCREEN_W, sleep } from './scenario-helpers.js';

let W;
let desktop;
let slider;

const mouse = (el, type, x, y) =>
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));

beforeAll(async () => {
  W = await bootDesktop();
  desktop = await import('../ios-desktop/js/desktop.js');
  slider = document.getElementById('desktopSlider');
  W.__lockTest.instantUnlock();
});

/** 归零分页状态（前一用例可能停在第 2 页） */
function resetToPage0() {
  desktop.switchDesktopPage(0, false);
}

describe('场景：桌面 Live Pager', () => {
  test('拖拽 1:1 跟手：位移精确映射，transition 关闭（纯合成器写入）', () => {
    resetToPage0();
    mouse(slider, 'mousedown', 206, 400); // slider 本身非图标 → 允许发起
    mouse(window, 'mousemove', 96, 400);  // dx=-110 → 水平意图判定（>12px）

    expect(desktop.isLiveSwipeActive()).toBe(true);
    expect(slider.style.transition).toBe('none');
    expect(slider.style.transform).toBe('translate3d(-110.0px, 0, 0)');

    mouse(window, 'mouseup', 96, 400);
    desktop.settleLiveSwipe(); // 保险（mouseup 已 settle，二次调用幂等）
  });

  test('越界橡皮筋：第 0 页向右拖 60px → 阻尼后仅 21px（0.35）', () => {
    resetToPage0();
    mouse(slider, 'mousedown', 206, 400);
    mouse(window, 'mousemove', 266, 400); // dx=+60，pageF<0

    expect(slider.style.transform).toBe('translate3d(21.0px, 0, 0)');

    mouse(window, 'mouseup', 266, 400);
  });

  test('位移过半吸附：慢速拖 316px 松手 → 翻至第 1 页，落回 100vw 基准', async () => {
    resetToPage0();
    mouse(slider, 'mousedown', 206, 400);
    // 人速分 5 帧：每帧约 16px，确保释放速度不达标（纯位移判定）
    let x = 206;
    for (let i = 0; i < 5; i++) {
      x -= 63;
      mouse(window, 'mousemove', x, 400);
      await sleep(50);
    }
    await sleep(120); // 尾部停顿：释放速度彻底归零语义
    mouse(window, 'mouseup', x, 400);

    expect(W.__state.currentPage).toBe(1);
    expect(slider.style.transition).toBe('');
    expect(slider.style.transform).toBe('translate3d(-100vw, 0, 0)');
    const dots = document.getElementById('pageDots');
    expect(dots.children[1].classList.contains('active')).toBe(true);
  });

  test('快速轻甩：越阈帧 + 后续高速帧 → 惯性翻页（真实轻扫事件序列）', () => {
    resetToPage0();
    mouse(slider, 'mousedown', 206, 400);
    mouse(window, 'mousemove', 193, 400); // 越阈帧：进入 live（速度采样建立基准）
    mouse(window, 'mousemove', 176, 400); // 高速帧：dt≈1ms → instV≈-17px/ms
    mouse(window, 'mouseup', 176, 400);

    expect(W.__state.currentPage).toBe(1);
  });

  test('慢速小位移：既不过半也无速度 → 保持原页（防误翻）', async () => {
    resetToPage0();
    mouse(slider, 'mousedown', 206, 400);
    let x = 206;
    for (let i = 0; i < 3; i++) {
      x -= 10;
      mouse(window, 'mousemove', x, 400);
      await sleep(60);
    }
    await sleep(120);
    mouse(window, 'mouseup', x, 400);

    expect(W.__state.currentPage).toBe(0);
  });

  test('飞行接管基点·2D matrix：从 matrix(…,-296.7,0) 无缝续算（readSliderTx 回归）', () => {
    resetToPage0();
    // 模拟浏览器飞行中的 CSS 插值矩阵（真实浏览器 computed transform 恒为 matrix 形式）
    slider.style.transform = 'matrix(1, 0, 0, 1, -296.7, 0)';
    desktop.beginLiveSwipe(206);
    expect(desktop.isLiveSwipeActive()).toBe(true);

    // 从接管点反向拖 20px：基点 296.7/412≈0.72 页 + 20px 1:1 续算
    desktop.moveLiveSwipe(186);
    expect(slider.style.transform).toBe('translate3d(-316.7px, 0, 0)');
    desktop.settleLiveSwipe();
  });

  test('飞行接管基点·matrix3d：tx 取第 13 分量（-412 → 第 1 页基准）', () => {
    resetToPage0();
    // 模拟吸附飞行中 CSS 插值的 matrix3d 形式；-412 = 第 1 页（末页）基准
    slider.style.transform = 'matrix3d(1,0,0,0, 0,1,0,0, 0,0,1,0, -412,0,0,1)';
    desktop.beginLiveSwipe(206);

    desktop.moveLiveSwipe(216); // 手指右移 10px → pageF=1-10/412=0.9757（界内）
    expect(slider.style.transform).toBe('translate3d(-402.0px, 0, 0)');
    desktop.settleLiveSwipe();
    expect(desktop.isLiveSwipeActive()).toBe(false);
  });

  test('none 矩阵与畸形值兜底：readSliderTx 静默归零不抛错', () => {
    resetToPage0();
    slider.style.transform = 'none';
    desktop.beginLiveSwipe(206);
    desktop.moveLiveSwipe(196); // dx=-10 → pageF=10/412
    expect(slider.style.transform).toBe('translate3d(-10.0px, 0, 0)');
    desktop.settleLiveSwipe();

    slider.style.transform = 'translate3d(-100px, 0, 0)'; // 非 matrix 形式 → 匹配失败 → 0
    desktop.beginLiveSwipe(206);
    desktop.moveLiveSwipe(196);
    expect(slider.style.transform).toBe('translate3d(-10.0px, 0, 0)');
    desktop.settleLiveSwipe();
  });

  test('防误触：图标上按下拖动不激活分页拖拽（639 行守卫）', () => {
    resetToPage0();
    const icon = document.querySelector('.app-icon[data-page="0"]');
    const before = slider.style.transform;

    icon.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 60, clientY: 400 }));
    mouse(window, 'mousemove', 20, 400);
    mouse(window, 'mouseup', 20, 400);

    expect(desktop.isLiveSwipeActive()).toBe(false);
    expect(slider.style.transform).toBe(before);
    expect(W.__state.currentPage).toBe(0);
  });

  test('滑动收尾 350ms 内吞掉落点 click（防误开图标），窗口期后恢复', async () => {
    resetToPage0();
    mouse(slider, 'mousedown', 206, 400);
    mouse(window, 'mousemove', 96, 400);
    mouse(window, 'mouseup', 96, 400); // live 收尾 → suppressDesktopClick

    const icon = document.querySelector('.app-icon[data-page="0"]');
    icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(W.__state.isOpen).toBe(false); // 抑制窗口内：未误开

    await sleep(380); // 越过 350ms 抑制窗
    icon.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(W.__state.isOpen).toBe(true); // 正常路径恢复：点按开应用
    expect(W.__state.currentApp.id).toBe(icon.dataset.id);
  });
});
