// ==================== issue6-fixes.test.js — issue #6 十截图修复回归 ====================
// v7.47：issue #6「自己看」10 张截图的逐项修复锚定。
// img1 设置电池图标 / img2 相机模式条 / img4 空状态对比度 / img5 快切提示残留
// v7.49：版本断言随 SW bump 同步 geek-v67
// img6 分屏合并卡空白预览 / img9-10 面板磁贴自愈 / sw 版本 geek-v56

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

describe("issue #6 img6 — 分屏合并卡预览几何重写", () => {
  const src = read("ios-desktop/js/recent-apps.js");

  it("buildSplitGroupCard 弃用 translate 百分比锚定（未缩放盒解析导致内容飘出窗格）", () => {
    // 旧实现的两个致命锚定：translate(-100%,-100%) / translate(-50%,-50%) + scale 组合
    expect(src).not.toContain("translate(-100%,-50%)");
    expect(src).not.toContain("translate(-50%,-100%)");
    expect(src).not.toContain("'left:0;top:50%;transform:translate(0,-50%)'");
    expect(src).not.toContain("'left:50%;top:0;transform:translate(-50%,0)'");
  });

  it("新几何：transform-origin 钉死 0 0 + 像素偏移（缩放安全）", () => {
    expect(src).toContain("transform-origin:0 0");
    expect(src).toContain("paneH - scaledH"); // B 窗格尾部对齐
    expect(src).toContain("paneW - scaledW"); // x 轴 B 窗格右侧对齐
    expect(src).toContain("coverScale = isX ? paneH / M.baseH : paneW / M.baseW");
  });

  it("预览容器 align-items:stretch —— 窗格无固有高度，居中对齐会压成 0 高", () => {
    expect(src).toMatch(/align-items:stretch;gap:\$\{gap\}px/);
  });

  it("A/B 窗格分别消费 offAX/offAY 与 offBX/offBY", () => {
    expect(src).toContain("paneHTML(appA, offAX, offAY)");
    expect(src).toContain("paneHTML(appB, offBX, offBY)");
  });
});

describe("issue #6 img2 — 相机模式条并入底部泊坞", () => {
  const src = read("ios-desktop/apps/camera/index.html");

  it("bottom-dock 容器存在且包裹 mode-selector 与 bottom-controls", () => {
    const dockStart = src.indexOf('<div class="bottom-dock">');
    const modeSel = src.indexOf('<div class="mode-selector" id="modeSelector">');
    const bottomCtl = src.indexOf('<div class="bottom-controls" id="bottomControls">');
    const dockEnd = src.indexOf("</div><!-- /bottom-dock -->");
    expect(dockStart).toBeGreaterThan(-1);
    expect(dockEnd).toBeGreaterThan(dockStart);
    expect(modeSel).toBeGreaterThan(dockStart);
    expect(modeSel).toBeLessThan(dockEnd);
    expect(bottomCtl).toBeGreaterThan(modeSel);
    expect(bottomCtl).toBeLessThan(dockEnd);
  });

  it("bottom-dock CSS：流式子块 + 纵向排布", () => {
    expect(src).toContain(".bottom-dock {");
    expect(src).toMatch(/\.bottom-dock \{[^}]*flex-direction:\s*column/);
  });
});

describe("issue #6 img1 — 设置电池图标改普通电池字形", () => {
  const icons = read("ios-desktop/js/icons.js");
  const settings = read("ios-desktop/js/apps/settings.js");

  it("icons.js 新增 battery_full（无加号路径）", () => {
    expect(icons).toContain("battery_full: `<svg");
    // battery_full 路径不得包含 battery_saver 的加号笔画（M13 14h-2v3H9v-3H7v-2h2v-3h2v3h2v2z）
    const full = icons.match(/battery_full: `<svg[^`]+`/)[0];
    expect(full).not.toContain("M13 14h-2v3H9v-3H7v-2h2v-3h2v3h2v2z");
  });

  it("设置主页「电池与电源优化」行使用 battery_full；省电模式行保留 battery_saver", () => {
    // v7.51 issue#7：主页清单行迁移至 settings-two-pane.js 统一生成（双栏分屏改造），
    // 图标语义契约不变 —— 双栏清单中电池行仍用 battery_full
    const twoPane = read("ios-desktop/js/apps/settings-two-pane.js");
    const row = twoPane.slice(
      twoPane.indexOf("idx: 2,"),
      twoPane.indexOf("电池与电源优化")
    );
    expect(row).toContain("battery_full");
    expect(settings).toContain("ICONS.battery_saver"); // 省电模式行（语义正确）
  });
});

describe("issue #6 img4 — 多任务空状态副标题对比度", () => {
  const src = read("ios-desktop/js/recent-apps.js");
  it("副标题 opacity 提至 0.82 并显式指定 on-surface 色", () => {
    expect(src).toContain('opacity:0.82;color:var(--md-on-surface,#fff)');
    expect(src).not.toContain("opacity:0.65;margin-top:6px");
  });
});

describe("issue #6 img5 — 快速切换提示浮层防残留看门狗", () => {
  const src = read("ios-desktop/js/gestures.js");

  it("armHintWatchdog 存在：无活跃手势即强制回收，长拖拽续期有上限", () => {
    expect(src).toContain("function armHintWatchdog()");
    expect(src).toMatch(/qs\.active && qs\.hintWatchdogArms < 4/);
    expect(src).toContain("cancelQuickSwitch();"); // 双重兜底：连会话一起取消
  });

  it("hideQuickSwitchHint 撤销布防并复位续期计数", () => {
    const fn = src.slice(src.indexOf("function hideQuickSwitchHint"), src.indexOf("function applyQuickSwitchVisual"));
    expect(fn).toContain("clearTimeout(qs.hintWatchdog)");
    expect(fn).toContain("qs.hintWatchdogArms = 0");
  });

  it("updateQuickSwitchHint 在浮层在场时布防", () => {
    expect(src).toMatch(/armHintWatchdog\(\); \/\/ v7\.47：浮层在场即布防/);
  });
});

describe("issue #6 img9/img10 — 控制中心磁贴自愈", () => {
  const src = read("ios-desktop/js/pull-down-gesture.js");

  it("openPullPanel 检测空磁贴网格并动态导入渲染器重建", () => {
    expect(src).toContain("qsTilesContainer");
    expect(src).toContain("children.length === 0");
    expect(src).toContain("renderQuickSettingsGrid");
    expect(src).toContain("import('./quick-settings.js')");
  });
});

describe("issue #6 — SW 版本推进", () => {
  it("sw.js VERSION = geek-v67", () => {
    expect(read("sw.js")).toContain("const VERSION = 'geek-v67';");
  });
});
