// ==================== v757-issue8.test.js — 议题 #8 四项工程回归（v7.57） ====================
//
// 议题 #8「继续努力」四项：
//   A. 退后台白边故障态根治 —— rAF 链冻结死亡 → 渲染循环心跳复活 + 桌面残留复位
//      （visibility-heal.js；shot2：壁纸白边 + 只剩 Dock 的「半关闭」故障帧）
//   B. 安装包内「配置讲解 + AI agent 提示词」入口（installer.js 帮助面板）
//   C. 滑动动画 AOSP 1:1 —— 触顶后继续滑动拉伸保持（v7.48 停住回弹移除）
//   D. 小窗多开 —— 多窗同时驻留 + 焦点/层级/关闭/接管全按 appId 路由

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

// ==================== A. visibility-heal 切后台自愈 ====================

describe("A1 — visibility-heal 模块结构与接线", () => {
  const src = read("ios-desktop/js/visibility-heal.js");

  it("模块存在且导出 initVisibilityHeal；双 rAF 后体检（渲染管线恢复后再判态）", () => {
    expect(src).toContain("export function initVisibilityHeal()");
    expect(src).toMatch(/requestAnimationFrame\(\(\) => requestAnimationFrame\(heal\)\)/);
  });

  it("循环复活判定：心跳超时（>600ms）才 cancel + startLoop（健康循环零干预）", () => {
    expect(src).toMatch(/\(now - heartbeat\) < 600/);
    expect(src).toMatch(/cancelAnimationFrame\(state\.rafId\)/);
    expect(src).toMatch(/startLoop\(\)/);
    expect(src).toMatch(/!loopAlive/);
  });

  it("无窗口态桌面残留复位：复用 v7.48 restoreDesktopAfterBatchClear（幂等纪律）", () => {
    expect(src).toContain("restoreDesktopAfterBatchClear()");
    expect(src).toMatch(/!state\.isOpen && !state\.isClosing/);
    expect(src).toMatch(/\.launch-hidden/);
  });

  it("幽灵态保险：isOpen 稳态下窗口 open 类/visibility/opacity 强制恢复", () => {
    expect(src).toMatch(/classList\.contains\('open'\)/);
    expect(src).toMatch(/state\.scaleSpring\.isSettled\(\)/);
  });

  it("视口变化才派发 resize（壁纸 canvas 等尺寸监听者重排）；hidden 时记录视口快照", () => {
    expect(src).toMatch(/prevVw = window\.innerWidth/);
    expect(src).toMatch(/vw !== prevVw \|\| vh !== prevVh/);
    expect(src).toMatch(/dispatchEvent\(new Event\('resize'\)\)/);
  });
});

describe("A2 — 心跳写入与 main 接线", () => {
  it("state.js 增加 _frameHeartbeat 字段", () => {
    const st = read("ios-desktop/js/state.js");
    expect(st).toContain("_frameHeartbeat: 0");
  });

  it("app-window frame() 每帧刷新心跳", () => {
    const aw = read("ios-desktop/js/app-window.js");
    expect(aw).toMatch(/function frame\(now\) \{[\s\S]*?state\._frameHeartbeat = now;/);
  });

  it("main.js 导入并在启动序列接线 initVisibilityHeal", () => {
    const mn = read("ios-desktop/js/main.js");
    expect(mn).toContain('from \'./visibility-heal.js\'');
    expect(mn).toMatch(/initVisibilityHeal\(\);/);
  });
});

// ==================== B. installer 配置讲解 + AI 提示词 ====================

describe("B — 安装包帮助面板（配置讲解 + AI agent 提示词）", () => {
  const src = read("ios-desktop/js/apps/installer.js");
  const css = read("ios-desktop/css/installer-app.css");

  it("入口按钮与帮助面板 DOM 存在（顶栏 ? 按钮 + overlay + 卡片）", () => {
    expect(src).toContain('id="pkgHelpBtn"');
    expect(src).toContain('id="pkgHelpOverlay"');
    expect(src).toContain('id="pkgHelpCard"');
    expect(src).toContain('data-help-close');
  });

  it("讲解覆盖全部 manifest 字段与体量限制（与 pkg-manifest.js 规范一一对应）", () => {
    for (const field of ['<b>id</b>', '<b>name</b>', '<b>version</b>', '<b>entry</b>',
      '<b>icon</b>', '<b>author</b>', '<b>description</b>', '<b>permissions</b>']) {
      expect(src).toContain(field);
    }
    expect(src).toContain('≤30MB');
    expect(src).toContain('≤40MB');
    expect(src).toContain('≤800');
    expect(src).toContain('pkg-&lt;id&gt;');
  });

  it("讲解覆盖 SDK 全能力（与 pkg-sdk.js 注入的 __system 同构）", () => {
    for (const api of ['__system.emit', '__system.openApp', '__system.notify',
      'requestPermission', '__system.fs.write', '__system.clipboard.write', '--md-h']) {
      expect(src).toContain(api);
    }
    expect(src).toContain('localStorage');
  });

  it("AI 提示词全文在场：一次读过即可产出合规安装包（含规范 JSON 示例与输出要求）", () => {
    expect(src).toContain('id="pkgAIPrompt"');
    const prompt = src.match(/id="pkgAIPrompt"[^>]*>([\s\S]*?)<\/pre>/);
    expect(prompt).toBeTruthy();
    const p = prompt[1];
    // 规范关键要素全部在提示词内
    expect(p).toContain('manifest.json');
    expect(p).toContain('"id": "com.example.myapp"');
    expect(p).toContain('小写字母开头');
    expect(p).toContain('camera, microphone, location, notifications, clipboard');
    expect(p).toContain('__system.fs');
    expect(p).toContain('requestPermission');
    expect(p).toContain('localStorage');
    expect(p).toContain('--md-h');
    expect(p).toContain('≤30MB');
    expect(p).toContain('zip -r');
  });

  it("复制交互：clipboard API + execCommand 兜底 + 按钮已复制反馈", () => {
    expect(src).toContain('id="pkgHelpCopy"');
    expect(src).toContain('navigator.clipboard.writeText');
    expect(src).toContain("execCommand('copy')");
    expect(src).toMatch(/function fallbackCopy/);
  });

  it("事件委托路由完整（开/关/复制/点遮罩关闭）", () => {
    expect(src).toMatch(/t\.closest\('#pkgHelpBtn'\)/);
    expect(src).toMatch(/t\.closest\('\[data-help-close\]'\)/);
    expect(src).toMatch(/t\.closest\('#pkgHelpCopy'\)/);
    expect(src).toMatch(/t\.id === 'pkgHelpOverlay'/);
  });

  it("样式落地：按钮/面板/行块/pre 全套 CSS 类", () => {
    for (const cls of ['.pkg-help-btn', '.pkg-help-overlay', '.pkg-help-card',
      '.pkg-help-sec', '.pkg-help-row', '.pkg-help-pre', '.pkg-help-copy']) {
      expect(css).toContain(cls);
    }
  });
});

// ==================== C. 滑动拉伸 AOSP 1:1（触顶保持） ====================

describe("C1 — scroll-fx 拉伸保持语义（v7.48 停住回弹移除）", () => {
  const src = read("ios-desktop/js/scroll-fx.js");

  it("v7.48 停住回弹整体移除（三符号清零）", () => {
    expect(src).not.toContain("_armIdleRelease");
    expect(src).not.toContain("_disarmIdleRelease");
    expect(src).not.toContain("_idleReleaseTimer");
  });

  it("AOSP 1:1 语义注释锚点：松手是唯一回落入口", () => {
    expect(src).toMatch(/松手（onRelease）是拉伸唯一回落入口/);
  });
});

describe("C2 — EdgeEffect PULL 态保持（行为级：拉住不松手 mDistance 恒定）", () => {
  it("onPull 后连续 draw 多帧 mDistance 不衰减；onRelease 后才开始回落", async () => {
    const { vi } = await import("vitest");
    const { EdgeEffect, EDGE_TYPE_STRETCH } = await import("../ios-desktop/js/aosp/edge-effect.js");
    const { AnimationUtils } = await import("../ios-desktop/js/aosp/overscroller.js");
    // 项目移植版 updateSpring()/draw() 为无参签名（内部读 AnimationUtils 时钟，
    // happy-dom 同毫秒调用 deltaT<0.001 早退）→ mock 单调时钟注入帧间隔
    let t = 1_000_000;
    const spy = vi.spyOn(AnimationUtils, "currentAnimationTimeMillis").mockImplementation(() => t);
    try {
      const ef = new EdgeEffect(EDGE_TYPE_STRETCH);
      ef.setSize(320, 640);
      // 模拟拖拽出界：三次 onPull（每次 0.04 归一距离）
      ef.onPull(0.04);
      ef.onPull(0.04);
      ef.onPull(0.04);
      const d0 = ef.getDistance();
      expect(d0).toBeGreaterThan(0);
      // STATE_PULL 下 draw() 不应衰减（AOSP：stretch 模式仅 RECEDE 态推进弹簧）
      t += 16; ef.draw();
      t += 16; ef.draw();
      t += 16; ef.draw();
      expect(ef.getDistance()).toBeCloseTo(d0, 10);
      // 松手 → RECEDE → 阻尼弹簧推进，距离开始单调回落
      ef.onRelease();
      for (let i = 1; i <= 8; i++) { t += 32; ef.draw(); }
      expect(ef.getDistance()).toBeLessThan(d0);
    } finally {
      spy.mockRestore();
    }
  });
});

// ==================== D. 小窗多开 ====================

describe("D1 — mini-window 多开架构（Map 注册表 + appId 路由）", () => {
  const src = read("ios-desktop/js/mini-window.js");

  it("单例 mini 变量移除，Map 注册表 + pendingTakeovers 集合 + LRU 上限导出", () => {
    expect(src).toMatch(/const minis = new Map\(\)/);
    expect(src).toMatch(/const pendingTakeovers = new Set\(\)/);
    expect(src).not.toMatch(/let mini = null/);
    expect(src).toContain("export const MINI_WINDOW_MAX = 4");
    expect(src).toContain("evictOldest");
  });

  it("单例硬编码 id 移除，改 data-app-id 路由；点击置顶 bringToFront + is-back 焦点态", () => {
    expect(src).not.toContain('el.id = \'miniWindow\'');
    expect(src).toContain("el.dataset.appId = app.id");
    expect(src).toContain("function bringToFront(m)");
    expect(src).toMatch(/classList\.toggle\('is-back', other !== m\)/);
  });

  it("同应用去重：已有小窗 flash + 置顶，不重复创建", () => {
    expect(src).toMatch(/const existing = minis\.get\(appId\);\s*\n\s*if \(existing\) \{/);
    expect(src).toMatch(/mini-flash/);
  });

  it("关闭/接管/销毁按 appId 精确路由；无 appId 关闭全部（closeMiniWindow 语义扩展）", () => {
    expect(src).toMatch(/export function closeMiniWindow\(opts = null\) \{[\s\S]*opts\.appId/);
    expect(src).toMatch(/export function takeoverToFullscreen\(appId, customRect = null\)/);
    expect(src).toMatch(/minis\.delete\(m\.appId\)/);
  });

  it("级联入场：第 n 个小窗偏移 n×24px（模 5 回绕），多窗不全重叠", () => {
    expect(src).toMatch(/minis\.size % 5\) \* 24/);
  });

  it("rAF 句柄随实例走：动画循环每帧校验实例仍在册（关闭即终止，无僵尸动画）", () => {
    expect(src).toMatch(/m\.rafId = requestAnimationFrame\(step\)/);
    expect(src).toMatch(/minis\.get\(m\.appId\) !== m\) return;/);
  });

  it("window 桥：__miniWindow(appId?) 精确查询 + expandToFullscreen 闭包捕获自身 appId", () => {
    expect(src).toMatch(/window\.__miniWindow = \(appId\) =>/);
    expect(src).toMatch(/expandToFullscreen: \(rect\) => takeoverToFullscreen\(m\.appId, rect \|\| null\)/);
    expect(src).toContain("__miniWindowAll");
  });

  it("resize 遍历全部小窗收回视口（多开视口适配）", () => {
    expect(src).toMatch(/resize[\s\S]*minis\.forEach\(\(m\) => \{/);
  });
});

describe("D2 — 调用方同步（app-window 守卫按 appId 查询）与 CSS 焦点态", () => {
  it("openApp 小窗守卫改为 __miniWindow(app.id)（多窗下非顶层小窗应用也能正确接管）", () => {
    const aw = read("ios-desktop/js/app-window.js");
    expect(aw).toContain("window.__miniWindow(app.id)");
  });

  it("mini-window.css 增加非顶层焦点态样式（header 变淡 + 阴影弱化）", () => {
    const css = read("ios-desktop/css/mini-window.css");
    expect(css).toMatch(/\.mini-window\.is-back \.mini-header \{[\s\S]*?opacity: 0\.55/);
    expect(css).toMatch(/\.mini-window\.is-back \{[\s\S]*?box-shadow/);
  });

  it("rubberband / softClampPos / softClampSize 导出保持（v7.53 消费方兼容）", async () => {
    const m = await import("../ios-desktop/js/mini-window.js");
    expect(typeof m.rubberband).toBe("function");
    expect(typeof m.softClampPos).toBe("function");
    expect(typeof m.softClampSize).toBe("function");
    expect(m.MINI_WINDOW_MAX).toBe(4);
    // 橡皮筋物理不变回归（v7.53 基准值）
    expect(m.rubberband(10, 120)).toBeCloseTo((10 * 120 * 0.55) / (120 + 0.55 * 10), 8);
  });
});
