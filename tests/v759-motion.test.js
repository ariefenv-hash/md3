// ==================== v759-motion.test.js — 全面体检修复 + 动画优化（v7.59） ====================
//
// 三块内容：
//   A. 字体契约补全（旧版残存清理）—— 无图浏览器全 32 应用 + 桌面 477 元素巡检实锤：
//      md3-theme.css --md-font 仍是 'Roboto' → 状态栏/下拉面板/文件/安装包与桌面衬线割裂；
//      calendar 7 处 / phone 4 处硬编码；reminders 死链；camera 死载 Google Sans；
//      md3-tokens.css 同文件双写 --md-font（重排即翻车的陷阱）
//   B. 下拉面板过拉弹性带（rubber-band）—— 满开后继续下拉渐进阻力，渐近 48px 封顶，
//      消除「拖过满开后面板死了」的死区手感
//   C. 面板内容入场编排 —— 打开瞬间通知卡片/快捷磁贴错峰浮升（原生 Android 13+ 同款）

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

// ==================== A. 字体契约补全 ====================

describe("A1 — 桌面 --md-font 契约补全（477 元素割裂根治）", () => {
  const theme = read("ios-desktop/css/md3-theme.css");

  it("md3-theme.css --md-font 与宿主 base.css 同衬线栈（不再 Roboto）", () => {
    expect(theme).toMatch(/--md-font:\s*'Noto Serif SC',\s*'Songti SC',\s*'SimSun',\s*serif;/);
    expect(theme).not.toMatch(/--md-font:\s*'Roboto'/);
  });

  it("--md-font-num 数字专用 tabular 语义保留（时钟走字豁免项）", () => {
    expect(theme).toMatch(/--md-font-num:\s*'Roboto',\s*'Quicksand',\s*system-ui,\s*tabular-nums;/);
  });

  it("四个 var(--md-font) 消费方回落栈同步衬线（status-bar/files/installer/pull-panels）", () => {
    for (const f of [
      "ios-desktop/css/status-bar.css",
      "ios-desktop/css/files-app.css",
      "ios-desktop/css/installer-app.css",
      "ios-desktop/css/pull-panels.css",
    ]) {
      const src = read(f);
      const fallback = src.match(/var\(--md-font,\s*([^)]+)\)/);
      expect(fallback, f).toBeTruthy();
      expect(fallback[1]).toContain("Noto Serif SC");
      expect(fallback[1]).not.toContain("Roboto");
    }
  });
});

describe("A2 — 子应用硬编码字体残存清零", () => {
  it("calendar：0 处 'Roboto' font 简写，全部 var(--md-text-font)；fonts 链接只留 JetBrains Mono", () => {
    const src = read("ios-desktop/apps/calendar/index.html");
    expect(src).not.toContain("'Roboto', sans-serif");
    expect(src).not.toContain("family=Roboto");
    expect(src.match(/var\(--md-text-font\)/g).length).toBeGreaterThanOrEqual(7);
    expect(src).toContain("family=JetBrains+Mono");
  });

  it("phone：typescale 四档全部 var(--md-text-font)，0 处 Roboto", () => {
    const src = read("ios-desktop/apps/phone/index.html");
    expect(src).not.toContain("'Roboto', sans-serif");
    const typescales = src.match(/--md-sys-typescale-[a-z-]+:[^;]+;/g) || [];
    const serifed = typescales.filter((t) => t.includes("var(--md-text-font)"));
    expect(serifed.length).toBe(4);
  });

  it("reminders：死链移除（fonts.googleapis 不再加载无人消费的 Roboto）", () => {
    const src = read("ios-desktop/apps/reminders/index.html");
    expect(src).not.toContain("family=Roboto");
  });

  it("camera：Google Sans 死载移除，实际消费的 Roboto Mono 保留", () => {
    const src = read("ios-desktop/apps/camera/index.html");
    expect(src).not.toContain("family=Google+Sans");
    expect(src).toContain("family=Roboto+Mono");
    expect(src.match(/'Roboto Mono'/g).length).toBe(2);
  });

  it("md3-tokens.css：--md-font 唯一真源（末尾 v7.58 契约块），文件内恰好定义一次", () => {
    const src = read("ios-desktop/apps/_shared/md3-tokens.css");
    const defs = src.match(/--md-font:/g) || [];
    expect(defs.length).toBe(1);
    expect(src).toMatch(/--md-font:\s*var\(--md-text-font\)/);
    expect(src).not.toMatch(/--md-font:\s*'Roboto'/);
  });

  it("桌面仍保留的 Roboto 均属豁免作用域（时钟数字/SDK 自定义字体回落/SVG 徽标字形）", () => {
    expect(read("ios-desktop/css/status-bar.css")).toMatch(/--md-font-num, 'Roboto'/);
    expect(read("ios-desktop/js/pkg-sdk.js")).toContain("font-family:'\" + d.name + \"'");
    expect(read("ios-desktop/js/app-icons.js")).toContain("font-family=\"-apple-system, Roboto, sans-serif\"");
  });
});

// ==================== B. 下拉面板过拉弹性带 ====================

describe("B1 — overPullOffset 纯函数行为", () => {
  let overPullOffset;
  beforeAll(async () => {
    ({ overPullOffset } = await import("../ios-desktop/js/pull-down-gesture.js"));
  });

  it("阈值内（含边界）恒为 0 —— 正常跟手相零干预", () => {
    expect(overPullOffset(0, 219)).toBe(0);
    expect(overPullOffset(100, 219)).toBe(0);
    expect(overPullOffset(219, 219)).toBe(0);
  });

  it("过拉渐增且渐近封顶：永不达到 48px，大幅过拉趋于封顶", () => {
    expect(overPullOffset(219 + 10, 219)).toBeGreaterThan(0);
    expect(overPullOffset(219 + 10, 219)).toBeLessThan(48);
    expect(overPullOffset(219 + 140, 219)).toBeGreaterThan(25); // e^-1 ≈ 0.368 → ~30.3
    expect(overPullOffset(219 + 1400, 219)).toBeGreaterThan(45); // e^-10 ≈ 0 → 封顶
    expect(overPullOffset(219 + 100000, 219)).toBeLessThanOrEqual(48);
  });

  it("单调不减：手指越拉越深，阻力偏移只增不减（弹性带无回吞）", () => {
    let prev = -1;
    for (let d = 0; d <= 800; d += 20) {
      const v = overPullOffset(d, 219);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe("B2 — 移动路径接线（源锚定）", () => {
  const src = read("ios-desktop/js/pull-down-gesture.js");

  it("下拉跟随调用 overPullOffset，满开后切换 px 相位叠加过拉量", () => {
    expect(src).toContain("const over = overPullOffset(dy, thresholdPx);");
    expect(src).toMatch(/offset:\s*\(progress - 1\) \* screenH \+ over/);
  });

  it("过拉相遮罩保持全亮（overlayOpacity: 1），正常相仍按进度渐亮", () => {
    expect(src).toMatch(/\{ overlayOpacity: 1, unit: 'px', offset: \(progress - 1\) \* screenH \+ over \}/);
    expect(src).toMatch(/\{ overlayOpacity: progress, unit: '%', offset: translateY \}/);
  });

  it("松手收尾复用既有 flush + 过渡链路（无跳变从真实位置起跳）", () => {
    expect(src).toMatch(/flushPanelVisual\(\); \/\/ 先落最后一帧/);
    expect(src).toMatch(/export function overPullOffset\(dy, thresholdPx\)/);
  });
});

// ==================== C. 面板内容入场编排 ====================

describe("C1 — 入场编排挂载/摘除生命周期（源锚定）", () => {
  const src = read("ios-desktop/js/pull-down-gesture.js");

  it("openPullPanel 挂 enter-stagger；620ms 后摘除（after 令牌时长受全局倍率缩放）", () => {
    expect(src).toMatch(/activePanel\.classList\.add\('enter-stagger'\)/);
    expect(src).toMatch(/after\(620, \(\) => activePanel\.classList\.remove\('enter-stagger'\)\)/);
  });

  it("强制重排重放：连续两次打开也能重新入场；尊重 prefers-reduced-motion", () => {
    expect(src).toContain("void activePanel.offsetWidth;");
    expect(src).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
  });
});

describe("C2 — 编排 CSS（源锚定）", () => {
  const css = read("ios-desktop/css/pull-panels.css");

  it("pp-card-in 关键帧：浮升 14px + 淡入，M3 emphasized-decelerate 曲线", () => {
    expect(css).toMatch(/@keyframes pp-card-in \{/);
    expect(css).toMatch(/from \{ opacity: 0; transform: translateY\(14px\); \}/);
    expect(css).toMatch(/cubic-bezier\(0\.05, 0\.7, 0\.1, 1\) backwards/);
  });

  it("通知卡片 8 级错峰（28ms 步进）+ 封顶兜底延迟；磁贴 12 级错峰（16ms 步进）", () => {
    expect(css).toMatch(/\.pull-panel\.enter-stagger \.noti-card:nth-child\(8\) \{ animation-delay: 236ms; \}/);
    expect(css).toMatch(/animation-delay: 240ms;\s*\}/);
    expect(css).toMatch(/\.pull-panel\.enter-stagger \.qs-tile-pill:nth-child\(12\) \{ animation-delay: 216ms; \}/);
    expect(css).toMatch(/animation-delay: 230ms;\s*\}/);
  });

  it("prefers-reduced-motion 整体关闭编排", () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?animation: none;/);
  });
});

// ==================== 版本锚点 ====================

describe("V — 版本锚点", () => {
  it("sw.js VERSION = 'geek-v76'", () => {
    expect(read("sw.js")).toContain("const VERSION = 'geek-v76';");
  });
});
