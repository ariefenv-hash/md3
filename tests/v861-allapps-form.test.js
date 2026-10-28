// ==================== v861-allapps-form.test.js — #73 应用抽屉手机/平板双形态分化 ====================
//
// 覆盖（#73 验收原文逐条）：
//   · 纯函数核（allapps-form.js）：断点形态选择（<768 phone / ≥768 tablet）/ 生命周期
//     （phone persistent / tablet ephemeral）/ AOSP 原值时长（600/300 vs 267/267）与阈值
//     （0.5 vs 0.3）/ 顶部留白 = 视口高/6 / 列数 4/6/8 + 列宽降级（先压 borderSpace 再压
//     iconSize）/ 下拉关闭进度
//   · 场景 DOM：平板视口浮层形态（data-form=tablet + 顶部留白变量）/ ephemeral 开建关毁
//     （close 后 DOM 移除、再开重建、监听不残留）/ 守卫矩阵（锁屏拒 / 手机应用内拒 /
//     平板应用内允许 + 点条目切换应用）/ resize 跨断点销毁重建
//   · 接线：taskbar.js 导航三键抽屉优先（sysBack/sysHome）+ All Apps 按钮 source=taskbar
//
// 教训沿袭：v858（boot 先于模块 import，state.js 初始化链）；v860（flex 收缩反馈回路、
// elementFromPoint 暴露裁剪）。

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { bootDesktop } from './scenario-helpers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');

let af;   // allapps-form.js
let aa;   // all-apps.js
const W = (v) => { Object.defineProperty(window, 'innerWidth', { value: v, configurable: true }); };
const H = (v) => { Object.defineProperty(window, 'innerHeight', { value: v, configurable: true }); };
const realW = () => Object.getOwnPropertyDescriptor(window, 'innerWidth');

beforeAll(async () => {
  // boot 先于模块 import（state.js←procedural-wallpaper 初始化链依赖完整引导序，
  // v858/v860 同款纪律）
  const W_ = await bootDesktop();
  W_.__lockTest.instantUnlock();
  af = await import('../ios-desktop/js/allapps-form.js');
  aa = await import('../ios-desktop/js/all-apps.js');
});

// ==================== A. 断点形态与生命周期 ====================

describe('A. formFor / lifecycleFor（两形态架构差异的核心承载）', () => {
  test('断点二分：<768 phone / ≥768 tablet（TABLET_MIN_WIDTH 同源）', () => {
    expect(af.formFor(0)).toBe('phone');
    expect(af.formFor(412)).toBe('phone');
    expect(af.formFor(767)).toBe('phone');
    expect(af.formFor(768)).toBe('tablet');
    expect(af.formFor(1280)).toBe('tablet');
  });

  test('生命周期：phone=persistent（Launcher 状态机常驻 state）/ tablet=ephemeral（开建关毁）', () => {
    expect(af.lifecycleFor('phone')).toBe('persistent');
    expect(af.lifecycleFor('tablet')).toBe('ephemeral');
  });
});

// ==================== B. AOSP 原值（时长/阈值/留白/列数） ====================

describe('B. AOSP 原值常量（#54 取值纪律）', () => {
  test('手机 600/300ms（config_allAppsOpenDuration/CloseDuration）', () => {
    expect(af.PHONE_OPEN_MS).toBe(600);
    expect(af.PHONE_CLOSE_MS).toBe(300);
    expect(af.openMsFor('phone')).toBe(600);
    expect(af.closeMsFor('phone')).toBe(300);
  });
  test('平板 267/267ms（config_bottomSheetOpenDuration/CloseDuration）', () => {
    expect(af.SHEET_OPEN_MS).toBe(267);
    expect(af.SHEET_CLOSE_MS).toBe(267);
    expect(af.openMsFor('tablet')).toBe(267);
    expect(af.closeMsFor('tablet')).toBe(267);
  });
  test('阈值：手机 0.5 / 平板 0.3（LauncherAnimUtils:48-49）', () => {
    expect(af.PHONE_SUCCESS_PROGRESS).toBe(0.5);
    expect(af.TABLET_SUCCESS_PROGRESS).toBe(0.3);
    expect(af.successThresholdFor('phone')).toBe(0.5);
    expect(af.successThresholdFor('tablet')).toBe(0.3);
  });
  test('顶部留白 = 视口高/6（BottomSheetProfile.derivedTopPadding，Int 除法 floor）；手机 0', () => {
    expect(af.topPaddingFor(800, 'tablet')).toBe(133);   // 800/6=133.33 → floor
    expect(af.topPaddingFor(853, 'tablet')).toBe(142);   // 853/6=142.16 → floor
    expect(af.topPaddingFor(1200)).toBe(200);            // 缺省形态 = tablet 语义
    expect(af.topPaddingFor(800, 'phone')).toBe(0);      // 手机全屏无留白语义
  });
  test('列数：手机 4 / 平板 6 / 大屏（≥1440）8（device_profiles 更大档位折算）', () => {
    expect(af.allAppsColumnsFor(412)).toBe(4);
    expect(af.allAppsColumnsFor(767)).toBe(4);
    expect(af.allAppsColumnsFor(768)).toBe(6);
    expect(af.allAppsColumnsFor(1280)).toBe(6);
    expect(af.allAppsColumnsFor(1439)).toBe(6);
    expect(af.allAppsColumnsFor(1440)).toBe(8);
  });
  test('gridColumnsFor 既有导出与 allAppsColumnsFor 在 <1440 全域一致（v858 锚零破坏）', () => {
    for (const w of [320, 412, 600, 767, 768, 900, 1280, 1439]) {
      expect(aa.gridColumnsFor(w)).toBe(af.allAppsColumnsFor(w));
    }
  });
});

// ==================== C. 列宽降级（AllAppsProfile 策略） ====================

describe('C. fitAllAppsGrid：先压 borderSpace，仍不足压 iconSize', () => {
  test('充足：原值保留', () => {
    const r = af.fitAllAppsGrid(800, 6, {});
    expect(r.cols).toBe(6);
    expect(r.iconSize).toBe(52);
    expect(r.borderSpace).toBe(8);
  });
  test('略窄：压 borderSpace 至恰好容下 iconSize（逐级 -2）', () => {
    // 6 列：cellW=(W-5*bs)/6；W=340 → bs=8:50<52 → bs=6:51.67<52 → bs=4:53.33≥52 停
    const r = af.fitAllAppsGrid(340, 6, {});
    expect(r.borderSpace).toBe(4);
    expect(r.iconSize).toBe(52);
    expect(r.cellWidth).toBeCloseTo((340 - 5 * 4) / 6, 5);
  });
  test('极窄：borderSpace=0 且 iconSize=min(52, cellWidth) 向下取整', () => {
    // 6 列 W=240 → cellW=40 < 52 → iconSize=floor(40)=40
    const r = af.fitAllAppsGrid(240, 6, {});
    expect(r.borderSpace).toBe(0);
    expect(r.iconSize).toBe(40);
  });
  test('未布局（宽 0）：不降级返回原值（happy-dom/隐藏态防线）', () => {
    const r = af.fitAllAppsGrid(0, 6, {});
    expect(r.iconSize).toBe(52);
    expect(r.borderSpace).toBe(8);
    expect(r.cellWidth).toBe(0);
  });
});

// ==================== D. 下拉关闭进度 ====================

describe('D. sheetDismissProgress（平板下拉关闭）', () => {
  test('位移/sheet 高，向下为正，钳 0~1', () => {
    expect(af.sheetDismissProgress(0, 600)).toBe(0);
    expect(af.sheetDismissProgress(-10, 600)).toBe(0);
    expect(af.sheetDismissProgress(180, 600)).toBeCloseTo(0.3, 5);
    expect(af.sheetDismissProgress(999, 600)).toBe(1);
  });
  test('sheet 高 0 防线（未布局）', () => {
    expect(af.sheetDismissProgress(100, 0)).toBe(0);
  });
});

// ==================== E. 场景 DOM：平板浮层形态 + ephemeral 生命周期 ====================

describe('E. 场景：平板视口（≥768）浮层形态', () => {
  test('E1. open → data-form=tablet + 顶部留白变量 = innerHeight/6 + active', () => {
    W(1280); H(840);
    expect(window.__allApps.open('tablet-test')).toBe(true);
    const overlay = document.getElementById('allAppsOverlay');
    expect(overlay).toBeTruthy();
    expect(overlay.dataset.form).toBe('tablet');
    expect(overlay.classList.contains('active')).toBe(true);
    expect(overlay.style.getPropertyValue('--aa-top-pad')).toBe('140px'); // 840/6
    window.__allApps.close();
  });

  test('E2. ephemeral：close 动画收尾后 overlay DOM 移除（关时毁）', async () => {
    W(1280); H(840);
    window.__allApps.open('ephemeral-1');
    expect(document.getElementById('allAppsOverlay')).toBeTruthy();
    window.__allApps.close();
    expect(aa.isAllAppsActive()).toBe(false);
    await new Promise((r) => setTimeout(r, 350)); // 267ms 收尾
    expect(document.getElementById('allAppsOverlay')).toBe(null); // 已销毁
  });

  test('E3. ephemeral：再开重建（开时建），条目/监听完整', async () => {
    W(1280); H(840);
    expect(window.__allApps.open('ephemeral-2')).toBe(true);
    const overlay = document.getElementById('allAppsOverlay');
    expect(overlay).toBeTruthy();
    expect(overlay.querySelectorAll('.aa-item').length).toBe(45); // 全注册表
    window.__allApps.close();
    await new Promise((r) => setTimeout(r, 350));
  });

  test('E4. close 后立即再开（动画期内）：不销毁、状态连续', async () => {
    W(1280); H(840);
    window.__allApps.open('reopen-fast');
    window.__allApps.close();
    expect(window.__allApps.open('reopen-fast-2')).toBe(true); // hideTimer 被取消，销毁不发生
    expect(aa.isAllAppsActive()).toBe(true);
    expect(document.getElementById('allAppsOverlay')).toBeTruthy();
    window.__allApps.close();
    await new Promise((r) => setTimeout(r, 350));
    expect(document.getElementById('allAppsOverlay')).toBe(null);
  });

  test('E5. 手机形态 close：persistent 常驻 DOM（不销毁，仅隐藏）', async () => {
    W(412); H(850);
    window.__allApps.open('phone-close');
    expect(document.getElementById('allAppsOverlay').dataset.form).toBe('phone');
    window.__allApps.close();
    await new Promise((r) => setTimeout(r, 420)); // 300ms 收尾
    const overlay = document.getElementById('allAppsOverlay');
    expect(overlay).toBeTruthy();        // persistent：DOM 保留
    expect(overlay.style.visibility).toBe('hidden'); // 仅隐藏
  });
});

// ==================== F. 守卫矩阵（#73 DoD） ====================

describe('F. 守卫矩阵：锁屏 / 手机应用内拒 / 平板应用内允许（§三.9 效率来源）', () => {
  test('F1. 锁屏态两形态均拒绝（is-locked）', () => {
    document.body.classList.add('is-locked');
    W(412);
    expect(window.__allApps.open('locked-phone')).toBe(false);
    W(1280);
    expect(window.__allApps.open('locked-tablet')).toBe(false);
    document.body.classList.remove('is-locked');
  });

  test('F2. 手机视口 + 应用窗口开 → 拒绝（Launcher 状态机 state 不可达）', async () => {
    W(412);
    const { state } = await import('../ios-desktop/js/state.js');
    const prev = state.isOpen;
    state.isOpen = true;
    expect(window.__allApps.open('inapp-phone')).toBe(false);
    state.isOpen = prev;
  });

  test('F3. 平板视口 + 应用窗口开 → 允许（任务栏常驻，应用内可拉起浮层）', async () => {
    W(1280);
    const { state } = await import('../ios-desktop/js/state.js');
    const prev = state.isOpen;
    state.isOpen = true;
    expect(window.__allApps.open('inapp-tablet')).toBe(true);
    const overlay = document.getElementById('allAppsOverlay');
    expect(overlay.dataset.form).toBe('tablet');
    // 点条目 = 切换应用（openAppById → openApp 既有切换链）：抽屉收 + 应用窗保持开
    const target = overlay.querySelector('.aa-item[data-app-id="weather"]');
    expect(target).toBeTruthy();
    target.click();
    await new Promise((r) => setTimeout(r, 120));
    expect(aa.isAllAppsActive()).toBe(false);
    expect(state.isOpen).toBe(true); // 切换而非退出
    state.isOpen = prev;
    const { closeApp } = await import('../ios-desktop/js/app-window.js');
    closeApp();
    await new Promise((r) => setTimeout(r, 60));
  });

  test('F4. 手机视口 + 桌面态 → 允许（常态入口不受影响）', () => {
    W(412);
    expect(window.__allApps.open('phone-desk')).toBe(true);
    window.__allApps.close();
    W(1280); // 复原平板视口供后续场景
  });
});

// ==================== G. resize 跨断点销毁重建 ====================

describe('G. resize 跨 768 断点：旧形态销毁、新形态重建、无残留', () => {
  test('G1. 平板开着 → resize 到手机：立即关闭 + DOM 销毁', async () => {
    W(1280); H(840);
    window.__allApps.open('resize-tablet');
    expect(aa.isAllAppsActive()).toBe(true);
    W(600);
    window.dispatchEvent(new Event('resize'));
    expect(aa.isAllAppsActive()).toBe(false);
    expect(document.getElementById('allAppsOverlay')).toBe(null);
    // 新形态重建可用
    expect(window.__allApps.open('after-resize')).toBe(true);
    expect(document.getElementById('allAppsOverlay').dataset.form).toBe('phone');
    window.__allApps.close();
    W(1280);
    window.dispatchEvent(new Event('resize'));
  });

  test('G2. 手机开着 → resize 到平板：立即关闭 + DOM 销毁', () => {
    W(600);
    window.__allApps.open('resize-phone');
    expect(aa.isAllAppsActive()).toBe(true);
    W(1280);
    window.dispatchEvent(new Event('resize'));
    expect(aa.isAllAppsActive()).toBe(false);
    expect(document.getElementById('allAppsOverlay')).toBe(null);
  });

  test('G3. 同断点内 resize：不触发销毁（overlay 保留）', () => {
    W(1280);
    window.__allApps.open('same-form');
    W(1400);
    window.dispatchEvent(new Event('resize'));
    expect(aa.isAllAppsActive()).toBe(true);
    expect(document.getElementById('allAppsOverlay')).toBeTruthy();
    window.__allApps.close();
    W(1280);
  });
});

// ==================== H. 接线锚点 ====================

describe('H. 接线锚点（taskbar 导航抽屉优先 / allapps-form 引用 / CSS 形态样式）', () => {
  test('H1. all-apps.js：import allapps-form 全量 + ephemeral 销毁 + 锁屏守卫', () => {
    const m = src('ios-desktop/js/all-apps.js');
    expect(m).toContain("from './allapps-form.js'");
    expect(m).toContain("lifecycleFor(form) === 'ephemeral') destroyOverlay()");
    expect(m).toContain("classList.contains('is-locked')");
    expect(m).toContain('all-apps-form-changed');
  });

  test('H2. taskbar.js：sysBack/sysHome 抽屉优先关闭（#73 §三.11 返回键路径）', () => {
    const t = src('ios-desktop/js/taskbar.js');
    expect(t).toContain("import { openAllApps, closeAllApps, isAllAppsActive } from './all-apps.js'");
    expect(t).toContain('if (isAllAppsActive()) { closeAllApps(\'nav-back\'); return; }');
    expect(t).toContain('if (isAllAppsActive()) { closeAllApps(\'nav-home\'); return; }');
  });

  test('H3. css/all-apps.css：平板浮层样式（留白/267ms/z 848/圆角）+ icon 变量', () => {
    const c = src('ios-desktop/css/all-apps.css');
    expect(c).toContain(".all-apps-overlay[data-form='tablet']");
    expect(c).toContain('var(--aa-top-pad, calc(100% / 6))');
    expect(c).toContain('transition-duration: 0.267s');
    expect(c).toContain('z-index: 848');
    expect(c).toContain('border-radius: 28px 28px 0 0');
    expect(c).toContain('var(--aa-icon-size, 52px)');
  });

  test('H4. taskbar All Apps 按钮仍走 openAllApps(\'taskbar\')（#72 锚保持）', () => {
    const t = src('ios-desktop/js/taskbar.js');
    expect(t).toContain("openAllApps('taskbar')");
  });
});
