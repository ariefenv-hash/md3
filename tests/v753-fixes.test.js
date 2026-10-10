// ==================== v753-fixes.test.js — v7.53 六项批次回归守护 ====================
// ①vfs 删除修复 ②真小窗（freeform 可调长宽）③桌面网格行列设置 ④Dock（≤6+平板最近槽）
// ⑤分屏组合修复（后台实况预览 + 点图标恢复组合）⑥Dock macOS 神奇效果开关
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');

// ==================== 行为层：desktop-prefs（③④ 的单一真源） ====================

describe('v7.53 — desktop-prefs 偏好真源（③④）', () => {
  let mod;
  beforeEach(async () => {
    // 每用例独立模块实例（vi.resetModules 清缓存，静态路径重新求值），隔离状态
    vi.resetModules();
    localStorage.removeItem('ios-desktop:desktop-prefs');
    localStorage.removeItem('ios-desktop:pages-apps');
    mod = await import('../ios-desktop/js/desktop-prefs.js');
  });

  it('默认档位：cols/rows auto、dock 开启 4 个、最近槽开启、macOS 效果关闭', () => {
    const p = mod.getDesktopPrefs();
    expect(p.cols).toBe('auto');
    expect(p.rows).toBe('auto');
    expect(p.dockEnabled).toBe(true);
    expect(p.dockCount).toBe(4);
    expect(p.dockRecents).toBe(true);
    expect(p.dockMacEffect).toBe(false);
  });

  it('Dock 数量上限硬钳 6（超出/负数/小数均收敛）', () => {
    expect(mod.setDesktopPref('dockCount', 99)).toBe(true);
    expect(mod.getDesktopPrefs().dockCount).toBe(6);
    expect(mod.setDesktopPref('dockCount', 0)).toBe(true);
    expect(mod.getDesktopPrefs().dockCount).toBe(1);
    mod.setDesktopPref('dockCount', 4.7);
    expect(mod.getDesktopPrefs().dockCount).toBe(5);
  });

  it('非法档位静默拒绝：未知列数/行数/类型错误均 false 且不改状态', () => {
    expect(mod.setDesktopPref('cols', 7)).toBe(false);
    expect(mod.setDesktopPref('cols', 'x')).toBe(false);
    expect(mod.setDesktopPref('rows', 3)).toBe(false);
    expect(mod.setDesktopPref('dockEnabled', 'yes')).toBe(false);
    expect(mod.setDesktopPref('dockMacEffect', 1)).toBe(false);
    expect(mod.setDesktopPref('unknown-key', 1)).toBe(false);
    expect(mod.getDesktopPrefs().cols).toBe('auto');
  });

  it('显式行列档位生效并持久化，auto 回落响应式', async () => {
    expect(mod.setDesktopPref('cols', 5)).toBe(true);
    expect(mod.setDesktopPref('rows', 7)).toBe(true);
    expect(mod.effGridCols()).toBe(5);
    expect(mod.effGridRows()).toBe(7);
    // 持久化：重置模块注册表后新实例从 localStorage 读到同值
    vi.resetModules();
    const m2 = await import('../ios-desktop/js/desktop-prefs.js');
    expect(m2.getDesktopPrefs().cols).toBe(5);
    expect(m2.getDesktopPrefs().rows).toBe(7);
  });

  it('容量缩减重排：超容量条目按页序顺延，slot 连续且次序保持', async () => {
    // 造 41 条旧数据（模拟 6×6 大容量布局），收窄到 4×4=16 容量
    const mk = (n, base) => Array.from({ length: n }, (_, i) => ({ appId: `a${base + i}`, slot: i }));
    const { state } = await import('../ios-desktop/js/state.js');
    // 先设最小容量档（此时桌面数据尚未注入，自动重排无害），再注入旧数据
    mod.setDesktopPref('cols', 4);
    mod.setDesktopPref('rows', 4);
    expect(mod.gridCapacity()).toBe(16);
    state.pagesApps = [mk(6, 0), mk(6, 10), mk(3, 20), mk(16, 30), mk(10, 50)];
    state.currentPage = 4;
    expect(mod.reflowPagesForCapacity()).toBe(true);
    // 41 条按 16 容量重排 → 3 页（16+16+9）
    expect(state.pagesApps.length).toBe(3);
    const flat = state.pagesApps.flat();
    expect(flat.length).toBe(41);
    // slot 连续性
    state.pagesApps.forEach((page) => {
      page.forEach((item, i) => expect(item.slot).toBe(i));
    });
    // 相对次序保持（跨页稳定）
    const ids = flat.map((x) => x.appId);
    expect(ids[0]).toBe('a0');
    expect(ids[40]).toBe('a59');
    // currentPage 收敛到合法页
    expect(state.currentPage).toBe(2);
  });

  it('gridChanged 变更广播 desktop-prefs-changed；非网格变更不广播 gridChanged', () => {
    let evt = null;
    const handler = (e) => { evt = e; };
    window.addEventListener('desktop-prefs-changed', handler);
    mod.setDesktopPref('dockMacEffect', true);
    expect(evt).not.toBeNull();
    expect(evt.detail.key).toBe('dockMacEffect');
    expect(evt.detail.gridChanged).toBe(false);
    evt = null;
    mod.setDesktopPref('cols', 6);
    expect(evt.detail.gridChanged).toBe(true);
    window.removeEventListener('desktop-prefs-changed', handler);
  });
});

// ==================== 行为层：Dock 放大纯函数（⑥）与小窗边界（②） ====================

describe('v7.53 — dock.js macOS 放大曲线（⑥，v7.56 同步 1:1 参数）', () => {
  it('magnifyScale：中心最大、range 外恒 1、单调递减、可配参数', async () => {
    const { magnifyScale } = await import('../ios-desktop/js/dock.js');
    const size = 54;
    // 中心 = maxScale（v7.56 1:1：默认 2.25）
    expect(magnifyScale(0, size)).toBeCloseTo(2.25, 5);
    // 超出作用域 = 1（v7.56 range = 2.75×）
    expect(magnifyScale(size * 2.75, size)).toBe(1);
    expect(magnifyScale(-3, size)).toBe(1);
    expect(magnifyScale(NaN, size)).toBe(1);
    // 单调递减（0 → range 之间）
    let prev = 3;
    for (let d = 0; d <= size * 2.75; d += 6) {
      const s = magnifyScale(d, size);
      expect(s).toBeLessThanOrEqual(prev + 1e-9);
      prev = s;
    }
    // 自定义参数生效
    expect(magnifyScale(0, size, { maxScale: 2 })).toBeCloseTo(2, 5);
    expect(magnifyScale(0, size, { maxScale: 1 })).toBe(1);
  });
});

describe('v7.53 — mini-window 橡皮筋与软约束（②）', () => {
  it('rubberband：界内恒等、越界渐进阻力（跟随量 < 超出量）、永不无限增长', async () => {
    const { rubberband } = await import('../ios-desktop/js/mini-window.js');
    expect(rubberband(0, 120)).toBe(0);
    // 超出 30px → 跟随少于 30（阻尼）
    expect(rubberband(30, 120)).toBeLessThan(30);
    expect(rubberband(30, 120)).toBeGreaterThan(0);
    // 大幅超出：饱和但不失控（跟随 << 超出）
    expect(rubberband(5000, 120)).toBeLessThan(200);
  });

  it('softClampPos/softClampSize：界内 1:1，界外橡皮筋阻尼', async () => {
    const { softClampPos, softClampSize } = await import('../ios-desktop/js/mini-window.js');
    expect(softClampPos(50, 0, 100)).toBe(50);
    expect(softClampPos(-30, 0, 100)).toBeLessThan(0);
    expect(softClampPos(-30, 0, 100)).toBeGreaterThan(-30); // 阻尼：不贴死界外
    expect(softClampPos(130, 0, 100)).toBeGreaterThan(100);
    expect(softClampPos(130, 0, 100)).toBeLessThan(130);
    expect(softClampSize(160, 200, 400)).toBeLessThan(200);
    expect(softClampSize(450, 200, 400)).toBeGreaterThan(400);
    expect(softClampSize(450, 200, 400)).toBeLessThan(450);
  });
});

// ==================== 行为层：模块公共 API ====================

describe('v7.53 — dock.js 公共 API（④）', () => {
  it('addToDock 满员拒绝 / 去重 / removeFromDock 命中', async () => {
    localStorage.removeItem('ios-desktop:dock-items');
    const dock = await import('../ios-desktop/js/dock.js');
    // 重置为默认 4 个
    dock.removeFromDock('phone');
    dock.removeFromDock('camera');
    dock.removeFromDock('messages');
    dock.removeFromDock('safari');
    dock.getDockItems().forEach((id) => dock.removeFromDock(id));
    // 空仓加满 6
    const ids = ['phone', 'camera', 'messages', 'safari', 'settings', 'calculator'];
    ids.forEach((id) => expect(dock.addToDock(id)).toBe(true));
    expect(dock.getDockItems().length).toBe(6);
    // 第 7 个拒绝（用户需求：上限 6）
    expect(dock.addToDock('clock')).toBe(false);
    // 去重
    expect(dock.addToDock('phone')).toBe(false);
    // 移除命中
    expect(dock.removeFromDock('phone')).toBe(true);
    expect(dock.removeFromDock('phone')).toBe(false);
    expect(dock.getDockItems().length).toBe(5);
  });
});

// ==================== 源码锚定：接线完整性 ====================

describe('v7.53 — vfs 删除修复（①）', () => {
  it('files.js：单项目录菜单删除/复制/移动以显式 paths 为准（不再读空 S.sel）', () => {
    const src = R('ios-desktop/js/apps/files.js');
    expect(src).toContain('deleteSelected(pathsOverride)');
    expect(src).toContain('await deleteSelected(paths)');
    expect(src).toContain('pasteInto(dir, m === \'move\', paths)');
    expect(src).toContain('function collectCleanSel()');
    expect(src).toContain('deleteSelected(collectCleanSel())');
  });
  it('vfs.js：持久层不可用时如实报 ok:false（不再 ok 掩盖故障）', () => {
    const src = R('ios-desktop/js/vfs.js');
    expect(src).toContain("return { ok: false, error: '删除失败（存储不可用或条目受保护）', removed: 0 }");
  });
});

describe('v7.53 — 真小窗接线（②）', () => {
  it('index.html：入口按钮 + 两块新样式表', () => {
    const html = R('ios-desktop/index.html');
    expect(html).toContain('id="miniWindowBtn"');
    expect(html).toContain('css/dock.css');
    expect(html).toContain('css/mini-window.css');
  });
  it('app-window.js：关闭完成广播 app-window-closed（携带关窗前 appId）', () => {
    const src = R('ios-desktop/js/app-window.js');
    expect(src).toContain("const closedAppId = state.currentApp ? state.currentApp.id : null");
    expect(src).toMatch(/dispatchEvent\(new CustomEvent\('app-window-closed', \{ detail: \{ appId: closedAppId \} \}\)/);
  });
  it('app-window.js：小窗在场同应用 → 原地展开全屏（空间一致性）；openApp 支持 skipMiniCheck', () => {
    const src = R('ios-desktop/js/app-window.js');
    expect(src).toContain('export function openApp(index, iconEl, customRect = null, opts = null)');
    expect(src).toContain('mw.expandToFullscreen(customRect || null)');
    expect(src).toContain('opts && opts.skipMiniCheck');
  });
  it('page-stack.js：ensureAppInstance 按 id 构建实例；__miniHosted 托管豁免隐藏', () => {
    const src = R('ios-desktop/js/page-stack.js');
    expect(src).toContain('export function ensureAppInstance(appId)');
    expect(src).toMatch(/!el\.__actorHosted && !el\.__miniHosted/g);
  });
  it('bg-freeze.js：钉住集在 setLiveApps 整表替换与动画解锁双路径回填', () => {
    const src = R('ios-desktop/js/bg-freeze.js');
    expect(src).toContain('export function pinLiveApp(appId)');
    expect(src).toContain('export function unpinLiveApp(appId)');
    expect(src).toMatch(/pinnedLiveIds\.forEach\(\(id\) => \{ liveAppIds\.add\(id\); \}\)/g);
  });
  it('main.js：initDock + initMiniWindow 引导 + 小窗入口按钮接线', () => {
    const src = R('ios-desktop/js/main.js');
    expect(src).toContain("import './desktop-prefs.js';");
    expect(src).toContain('initDock();');
    expect(src).toContain('initMiniWindow();');
    expect(src).toContain('dom.miniWindowBtn');
  });
  it('mini-window 弹簧参数 = Apple 画中画实测值（damping 1.0 / response 0.4/0.3）', () => {
    const src = R('ios-desktop/js/mini-window.js');
    expect(src).toContain('makeSpringParams(0.4, 1.0, 1)');
    expect(src).toContain('makeSpringParams(0.3, 1.0, 1)');
    expect(src).toContain('setPointerCapture');
  });
});

describe('v7.53 — Dock 接线（④⑥）', () => {
  it('dock.js：数量上限 6、平板断点 768、最近槽 ≤3、macOS 效果 reduced-motion 守卫', () => {
    const src = R('ios-desktop/js/dock.js');
    expect(src).toContain('DOCK_MAX');
    expect(src).toContain('export function magnifyScale');
    expect(src).toMatch(/Math\.cos\(\(dist \/ range\) \* Math\.PI\)/);
    expect(src).toContain("(prefers-reduced-motion: reduce)");
  });
  it('desktop-prefs.js：DOCK_MAX=6 与 DOCK_RECENTS_MAX=3（用户明确限定）', () => {
    const src = R('ios-desktop/js/desktop-prefs.js');
    expect(src).toContain('export const DOCK_MAX = 6;');
    expect(src).toContain('export const DOCK_RECENTS_MAX = 3;');
    expect(src).toContain('export const TABLET_MIN_WIDTH = 768;');
  });
  it('context-menu.js：长按菜单提供 Dock 增删与小窗入口', () => {
    const src = R('ios-desktop/js/context-menu.js');
    expect(src).toContain("import { getDockItems, addToDock, removeFromDock } from './dock.js';");
    expect(src).toContain("import { DOCK_MAX } from './desktop-prefs.js';");
    expect(src).toContain('action-dock');
    expect(src).toContain('以小窗打开');
  });
  it('utils.js：getGridColumns 经 __effGridCols 桥取用户档位（降级安全）', () => {
    const src = R('ios-desktop/js/utils.js');
    expect(src).toContain('globalThis.__effGridCols');
  });
  it('desktop.js：网格模板由偏好真源内联驱动 + 偏好变更重渲染', () => {
    const src = R('ios-desktop/js/desktop.js');
    expect(src).toContain('grid.style.gridTemplateColumns = `repeat(${effGridCols()}, 1fr)`');
    expect(src).toContain('grid.style.gridTemplateRows = `repeat(${effGridRows()}, 1fr)`');
    expect(src).toContain("'desktop-prefs-changed'");
  });
});

describe('v7.53 — 分屏组合修复（⑤）', () => {
  it('split-screen.js：组合退场 → parkSession 保活（替代 finishClose 销毁）', () => {
    const src = R('ios-desktop/js/split-screen.js');
    expect(src).toContain('function parkSession()');
    expect(src).toContain('export function destroyParked()');
    expect(src).toContain('export function revealParked(fromRect)');
    expect(src).toContain("overlay.classList.add('session-parked')");
    expect(src).toContain('parkSession();');
  });
  it('split-screen.js：openApp 恢复守卫查隐藏会话 + 持久组合池；窗格实况源桥', () => {
    const src = R('ios-desktop/js/split-screen.js');
    expect(src).toContain('window.__splitRestoreForApp');
    expect(src).toContain("localStorage.getItem('ios-desktop:split-groups')");
    expect(src).toContain('window.__splitPaneLiveSource');
    expect(src).toContain('window.__splitDestroyParked');
    expect(src).toContain('window.__splitHasParked');
  });
  it('split-screen.js：__splitInfo 上报 parked 态（后台卡片预览探测）', () => {
    const src = R('ios-desktop/js/split-screen.js');
    expect(src).toMatch(/if \(parked\) return \{\s*active: false,\s*parked: true,/);
  });
  it('recent-preview.js：预览来源扩展到分屏窗格（活跃/隐藏会话）', () => {
    const src = R('ios-desktop/js/recent-preview.js');
    expect(src).toContain('function findLiveSourceEl(appId)');
    expect(src).toContain('window.__splitPaneLiveSource');
    expect(src).toContain('.split-pane-page');
  });
  it('recent-apps.js：清空全部/销毁组合卡 → 隐藏会话一并销毁；单卡直开不走组合恢复', () => {
    const src = R('ios-desktop/js/recent-apps.js');
    expect(src).toMatch(/window\.__splitDestroyParked && window\.__splitDestroyParked\(\)/g);
    expect(src).toContain('skipSplitRestore: true');
  });
  it('expandToFullScreenAndDismiss 拖带展开 = 显式全屏意图（skipSplitRestore）', () => {
    const src = R('ios-desktop/js/split-screen.js');
    expect(src).toContain('{ instant: true, skipSplitRestore: true }');
  });
  it('split-screen.css：session-parked 驻留样式（display:none）', () => {
    const css = R('ios-desktop/css/split-screen.css');
    expect(css).toMatch(/\.session-parked/);
  });
});

describe('v7.53 — 设置页（③④⑥）', () => {
  it('settings.js：新增「桌面与 Dock」页（行列 chips / Dock 开关与数量 / macOS 效果开关 / 应用管理）', () => {
    const src = R('ios-desktop/js/apps/settings.js');
    expect(src).toContain("title: '桌面与 Dock'");
    expect(src).toContain('dpColChips');
    expect(src).toContain('dpRowChips');
    expect(src).toContain('dpDockEnabled');
    expect(src).toContain('dpDockRecents');
    expect(src).toContain('dpMacEffect');
    expect(src).toContain('dpCountChips');
    expect(src).toContain('dpDockItems');
    expect(src).toContain('dpDockPool');
  });
  it('settings.js：window 桥暴露偏好与 Dock 管理 API（内联脚本访问模块作用域）', () => {
    const src = R('ios-desktop/js/apps/settings.js');
    expect(src).toContain('window.__desktopPrefs');
    expect(src).toContain('window.__dockPrefs');
  });
});

describe('v7.53 — 版本锚点', () => {
  it('sw.js VERSION = geek-v70', () => {
    expect(R('sw.js')).toContain("const VERSION = 'geek-v70';");
  });
});
