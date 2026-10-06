// ==================== issue6-followup.test.js — issue #6 用户实测回访修复回归 ====================
// v7.48：v7.47 上站后用户实测回访（文字反馈，无新截图）四项：
//   ① 滑动列表全局治理 —— 宽屏 480px 窄栏 padding 钳制取消（「实际屏幕宽度完全够用」）
//   ② 横向滑出屏幕钳死 —— overflow-y:auto 令 overflow-x 计算值 auto 的容器全部显式 hidden
//   ③ 移除电池健康 —— 上下文菜单假快捷项 + 设置电池页写死 98% 假数据行
//   ④ stretch 拉伸只随单次滑动 —— 手指停住不松手不再保持拉伸态（140ms 就地回弹）

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

describe("① 面板窄栏移除 — 内容随面板铺开", () => {
  const css = read("ios-desktop/css/pull-panels.css");

  it(".pull-panel 不再用 (100vw-480px)/2 宽屏窄栏 padding", () => {
    expect(css).not.toContain("calc((100vw - 480px) / 2)");
    // 自适应安全边距落地
    expect(css).toMatch(/\.pull-panel \{[^}]*clamp\(16px, 3vw, 40px\)/);
  });

  it(".qs-tiles-grid 自适应列数（宽屏铺开多列）", () => {
    expect(css).toMatch(/\.qs-tiles-grid \{[^}]*repeat\(auto-fill, minmax\(230px, 1fr\)\)/);
    expect(css).not.toContain("repeat(2, 1fr)");
  });
});

describe("② 横向滑出钳死 — 纵滚容器 overflow-x 显式 hidden", () => {
  const panels = read("ios-desktop/css/pull-panels.css");
  const base = read("ios-desktop/css/base.css");

  it(".panel-scroll overflow-x:hidden + 子项宽度上限", () => {
    expect(panels).toMatch(/\.panel-scroll \{[^}]*overflow-x:\s*hidden/);
    expect(panels).toContain(".panel-scroll > * {\n  max-width: 100%;\n}");
  });

  it("系统级纵滚容器统一 overflow-x:hidden（base.css 纪律块）", () => {
    // 纪律块五容器：app-page / folder-grid / panel-scroll / edit-tiles-view /
    // search-items-wrap / theme-body —— search-quick-chips 例外（横向芯片设计）
    for (const sel of [".app-page", ".folder-grid", ".edit-tiles-view", ".search-items-wrap", ".theme-body"]) {
      expect(base).toContain(sel);
    }
    expect(base).toMatch(/v7\.48 纵向滚动容器横向溢出一律钳死[\s\S]*?overflow-x: hidden;/);
    // 子项上限规则存在
    expect(base).toMatch(/\.app-page > \*,[\s\S]*?max-width: 100%;/);
  });

  it(".search-quick-chips 保持横向芯片设计不被钳死", () => {
    // 例外容器不出现在 overflow-x:hidden 规则的选择器列表（横向滚动是其设计意图）
    const block = base.match(/\n\.app-page,\n\.folder-grid,\n\.panel-scroll,\n\.edit-tiles-view,\n\.search-items-wrap,\n\.theme-body \{\n  overflow-x: hidden;\n\}/);
    expect(block).toBeTruthy();
  });
});

describe("③ 移除电池健康 — 无实际用处的假功能下架", () => {
  const ctx = read("ios-desktop/js/context-menu.js");
  const settings = read("ios-desktop/js/apps/settings.js");

  it("长按设置图标的快捷菜单不再含「电池健康」项", () => {
    expect(ctx).not.toContain("title: '电池健康'");
    expect(ctx).not.toContain('"电池健康"');
    expect(ctx).toMatch(/v7\.48：移除「电池健康」快捷项/);
  });

  it("设置电池页不再含写死 98% 的「电池最大健康容量」行", () => {
    expect(settings).not.toContain(">电池最大健康容量</span>");
    expect(settings).not.toContain(">98%</span>");
    // 省电模式行保留（真实功能）
    expect(settings).toContain("settingsBatterySaverSwitch");
  });
});

describe("④ stretch 只随单次滑动 — 停住回弹", () => {
  const src = read("ios-desktop/js/scroll-fx.js");

  it("停住回弹计时器：140ms 无新位移即 onRelease 就地回弹", () => {
    expect(src).toContain("_armIdleRelease");
    expect(src).toContain("_disarmIdleRelease");
    expect(src).toMatch(/_armIdleRelease\(\) \{[\s\S]*?setTimeout[\s\S]*?140\);/s);
  });

  it("回弹保持 engage（手指再动可重新拉出），仅释放边缘效果", () => {
    const arm = src.match(/_armIdleRelease\(\) \{[\s\S]*?\n  \}/);
    expect(arm).toBeTruthy();
    expect(arm[0]).toContain("this._pullEngaged) return"); // 未 engage 不动作
    expect(arm[0]).toContain(".onRelease()");
    expect(arm[0]).not.toContain("this._pullEngaged = false");
  });

  it("pointerdown 清残留计时 + pointerup/pull 释放路径同步清计时", () => {
    expect(src).toMatch(/_pullEngaged = false;\n    this\._disarmIdleRelease\(\);/);
    expect(src).toMatch(/_pullEngaged = false;\n      this\._dragging = false;\n      this\._disarmIdleRelease\(\);/);
  });
});

describe("⑤ 清空全部回桌面复位 — 空白壁纸闪现根治", () => {
  const aw = read("ios-desktop/js/app-window.js");
  const ra = read("ios-desktop/js/recent-apps.js");

  it("restoreDesktopAfterBatchClear 导出且复位项与 finishAnim 同源", () => {
    expect(aw).toContain("export function restoreDesktopAfterBatchClear()");
    expect(aw).toMatch(/restoreDesktopAfterBatchClear\(\) \{[\s\S]*?desktop\.style\.transform = ''/);
    expect(aw).toMatch(/restoreDesktopAfterBatchClear\(\) \{[\s\S]*?hideDesktopBlur\(\)/);
    expect(aw).toMatch(/restoreDesktopAfterBatchClear\(\) \{[\s\S]*?launch-hidden[\s\S]*?visibility = ''/);
    expect(aw).toMatch(/restoreDesktopAfterBatchClear\(\) \{[\s\S]*?clearRadialField\(\)/);
  });

  it("清空全部编排收尾调用复位（closeRecentApps 之后）", () => {
    const seg = ra.match(/closeRecentApps\(\);[\s\S]*?restoreDesktopAfterBatchClear/);
    expect(seg).toBeTruthy();
    expect(ra).toContain("import { restoreDesktopAfterBatchClear } from './app-window.js'");
  });
});

describe("⑥ 通知卡滑移阻尼 — 不再能拖出屏幕任意远", () => {
  const src = read("ios-desktop/js/notifications.js");

  it("onMove 滑移带外 0.35 阻尼（可视拖距钳 ±220px）", () => {
    expect(src).toMatch(/v7\.48：滑移阻尼上限[\s\S]*?0\.35/);
    expect(src).toContain("const damp = 160 + (Math.abs(raw) - 160) * 0.35;");
  });
});

describe("⑦ SW 版本推进", () => {
  it("sw.js VERSION = geek-v58", () => {
    expect(read("sw.js")).toContain("const VERSION = 'geek-v58';");
  });
});
