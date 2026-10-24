// ==================== v786：Shade 状态栏渐隐 + 手势尾随 click 吞噬 + 图标字体预热 ====================
// 线上双视口 E2E 实锤三项修复：
//   1. 宽屏 Shade 全开时状态栏（z 900）与 QS 场景大钟叠印 —— AOSP PhoneStatusBarViewController
//      同构修复：状态栏 alpha 由面板 expansion 驱动渐隐（拖拽逐帧 / 开合补间 / 收场清理三通道）
//   2. Shade 场景上滑收起、终点落在通知卡上 → 浏览器合成 click 误开应用 —— AOSP
//      onInterceptTouchEvent 同构：手势提交（开 / 场景切换 / 收起 / 回弹）后捕获阶段吞一次 click
//   3. 首次打开设置 check_circle 连字裸奔 —— woff2 懒加载导致 @font-face 未生效即渲染；
//      requestIdleCallback + document.fonts.load 双家族空闲预热

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');

const gestureJs = src('ios-desktop/js/pull-down-gesture.js');
const html = src('ios-desktop/index.html');
const swJs = src('sw.js');
const fontCss = src('ios-desktop/assets/fonts/material-symbols.css');

describe('v7.86 sw.js 版本推进', () => {
  it('sw.js 升 geek-v100', () => {
    expect(swJs).toContain("const VERSION = 'geek-v100';");
  });
});

describe('v7.86 状态栏随 Shade expansion 渐隐（AOSP PhoneStatusBarViewController 同构）', () => {
  it('纯函数 statusBarAlphaFromExpansion 导出且边界正确', async () => {
    const mod = await import('../ios-desktop/js/pull-down-gesture.js');
    const fn = mod.statusBarAlphaFromExpansion;
    expect(typeof fn).toBe('function');
    expect(fn(0)).toBe(1);                          // 面板全关 → 状态栏全显
    expect(fn(0.3)).toBeCloseTo(0.7);               // 拖拽中途线性渐隐
    expect(fn(1)).toBe(0);                          // 满开 → 全隐
    expect(fn(1.4)).toBe(0);                        // 过拉钳制（rubber-band 段保持全隐）
    expect(fn(-0.2)).toBe(1);                       // 负值钳制
    expect(fn(NaN)).toBe(1);                        // 防御回退
  });

  it('拖拽跟手帧：applyPanelVisual 逐帧驱动状态栏 alpha（与 blur 通道同相位）', () => {
    expect(gestureJs).toMatch(
      /setPanelBlurProgress\(v\.overlayOpacity\);[\s\S]{0,140}applyStatusBarShadeFade\(v\.overlayOpacity\);/
    );
  });

  it('开 / 关 / 回弹三路径补间 + 收场清理全在位', () => {
    expect(gestureJs).toContain('tweenStatusBarShadeFade(true, dur(280));');  // openPullPanel
    expect(gestureJs).toContain('tweenStatusBarShadeFade(true, dur(240));');  // restorePanelVisual（回弹仍全开）
    expect(gestureJs).toContain('tweenStatusBarShadeFade(false, dur(250));'); // closePullPanels
    expect(gestureJs).toContain('resetStatusBarShadeFade();');                // after(260) 收场全清
  });

  it('alpha 全隐时同步禁点（隐形状态栏不吃点击，事件穿透到面板）', () => {
    expect(gestureJs).toContain("bar.style.pointerEvents = expansion > 0.5 ? 'none' : '';");
    expect(gestureJs).toContain("bar.style.pointerEvents = hide ? 'none' : '';");
  });

  it('补间完成后归还 CSS 默认 transition（不污染后续跟手帧）', () => {
    expect(gestureJs).toMatch(/after\(310[\s\S]{0,200}bar\.style\.transition = ''/);
    expect(gestureJs).toMatch(/after\(290[\s\S]{0,320}bar\.style\.transition = ''/);
  });
});

describe('v7.86 面板手势提交后吞尾随 click（AOSP onInterceptTouchEvent 同构）', () => {
  it('捕获阶段一次性拦截器注册于 initPullDownGesture', () => {
    expect(gestureJs).toContain('initPanelClickSwallow();');
    expect(gestureJs).toMatch(/document\.addEventListener\('click'[\s\S]{0,320}\}, true\);/);
    expect(gestureJs).toContain('panelClickSwallowUntil = 0; // 一次性：只吞提交手势后紧跟的那一次');
  });

  it('五条提交路径全部布防（段二满开 / 阈值开 / 场景轨 / 收起提交 / 回弹路径）', () => {
    const arms = gestureJs.match(/suppressTrailingClick\(\);/g) || [];
    expect(arms.length).toBe(5);
    expect(gestureJs).toContain('suppressTrailingClick(); // v7.86：收起提交');
  });

  it('零位移单击展开路径不吞 click（statusTapOpenedAt 既有机制不受影响）', () => {
    expect(gestureJs).toContain('statusTapOpenedAt = performance.now();');
  });
});

describe('v7.86 通知卡垂直意图交还面板（AOSP NotificationSwipeHelper 同构）', () => {
  const notiJs = src('ios-desktop/js/notifications.js');

  it('垂直意图判定（|dy| > 8 且 |dy| > 1.2|dx|）在位且横滑期间不触发', () => {
    expect(notiJs).toContain('!card._isSwiping && Math.abs(dragDy) > 8 && Math.abs(dragDy) > Math.abs(raw) * 1.2');
    expect(notiJs).toContain('startY = e.clientY;');
  });

  it('交还 = 释放捕获 + 复位卡片形态 + 补发虚拟 pointerdown 到面板根', () => {
    expect(notiJs).toContain('releaseCardControl(me.pointerId);');
    expect(notiJs).toContain("document.getElementById('pullPanelsOverlay') || me.target");
    expect(notiJs).toMatch(/new PointerEvent\('pointerdown'[\s\S]{0,220}clientX: me\.clientX, clientY: me\.clientY/);
  });

  it('stopPropagation 收窄为仅横滑期间（垂直交还后真实 move 必须能冒泡到 window）', () => {
    expect(notiJs).toContain('me.stopPropagation(); // 仅横滑期间吞移动事件（垂直意图已交还面板）');
  });
});

describe('v7.86 SplitShade 双列常显上滑全局收起（AOSP VerticalExpandContainerSpec 同构）', () => {
  it('split 断点检测（600px = WindowSizeClass WIDTH_DP_MEDIUM_LOWER_BOUND）在位', () => {
    expect(gestureJs).toContain("window.matchMedia('(min-width: 600px)').matches");
  });

  it('上滑分流改为 (splitShade || atQsScene)，split 直接收起（isVerticalDismissing）', () => {
    expect(gestureJs).toContain('} else if (dy < -5 && (splitShade || atQsScene)) {');
    expect(gestureJs).toMatch(/if \(splitShade\) \{[\s\S]{0,600}isVerticalDismissing = true;/);
  });

  it('滚区底部守卫：可继续下滚的滚区中段先滚动，到底后上滑才收起', () => {
    expect(gestureJs).toContain('const canScrollDown = (el) => !!el && el.scrollTop + el.clientHeight < el.scrollHeight - 2;');
    expect(gestureJs).toContain('!canScrollDown(inQsScroll)');
    expect(gestureJs).toContain('!canScrollDown(inNotiScroll)');
    expect(gestureJs).toContain("const inQsScroll = e.target.closest('#qsInnerScroll');");
    expect(gestureJs).toContain("const inNotiScroll = e.target.closest('#notiPanelScroll');");
  });

  it('窄屏 QS 场景向上收回 Shade 的既有行为保持（shadeColumn 守卫不变）', () => {
    expect(gestureJs).toContain("if (fromScrollTop && !e.target.closest('#shadeColumn')) {");
  });
});

describe('v7.86 Material Symbols 图标字体空闲预热（连字裸奔修复）', () => {
  it('document.fonts.load 双家族预热 + idle 调度在位', () => {
    expect(html).toContain(`document.fonts.load('24px "Material Symbols Rounded"', 'check_circle')`);
    expect(html).toContain(`document.fonts.load('24px "Material Symbols Outlined"', 'check_circle')`);
    expect(html).toContain("requestIdleCallback(warmIconFonts, { timeout: 2000 })");
    expect(html).toContain('else setTimeout(warmIconFonts, 1200);');
  });

  it('font-display: block 既有防线保持（material-symbols.css 两家族）', () => {
    expect((fontCss.match(/font-display: block;/g) || []).length).toBe(2);
  });
});
