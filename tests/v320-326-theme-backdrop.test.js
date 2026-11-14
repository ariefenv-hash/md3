// ==================== v320-326-theme-backdrop.test.js — #320 首帧令牌先行门 + #326 壁纸直映退役 ====================
//
// #320（P1 FOUC）：应用开窗首帧以「注入前默认令牌」渲染，主题令牌注入后「闪一下」。
//   v11.25 根因取证（diag-fouc-320.mjs，dist v11.25 实测）：
//   - weather 冷开窗 t≈620ms 启动屏仍在掩护、iframeLoaded=false；
//     t≈827ms 启动屏已被 520ms 看门狗独立释放档放行而 iframe 仍未 loaded
//     → 放行到 onload 之间默认令牌帧进可见区 → 令牌注入即闪。
//   - msg/photo（load<520ms）零闪帧（首个可见帧 = 首个当前主题令牌帧）。
//   修复：520ms 独立释放档加 iframe 就绪门（未就绪改由 iframe-load 档接管，
//   load 捕获监听与 onload 属性同任务先后执行，令牌注入先于下一帧绘制）；
//   2000ms force-finish（reason='watchdog'）为无条件硬上限，#225 语义完整保留；
//   typed 应用启动屏 #FFFFFF → var(--md-surface)（暗色主题白闪消除，AOSP splash
//   = 主题窗口底色语义）。
//
// #326（P2 形态）：应用内 blanket 壁纸直映退役 ——「应用内直接映射下面的壁纸伤害
//   可读性，取壁纸的主题色作为底板颜色」（#259 用户原话）。透明体应用透出窗口
//   底板 var(--md-surface)（Monet 开启时 = 壁纸取色派生主题色）；显式 opt-in 壁纸面
//   （#P / data-wallpaper-target，现树 clock_app）保留壁纸映射；recents 热任务预览
//   壳底板随之统一主题面（显式白名单应用除外），#319 壁纸实拍通道保留为白名单
//   通道 + wallpaperBackdropCSS 工具函数。
//
// 锚点纪律：源码锚（toContain/正则）+ 语义锚（模块行为）；无运行时依赖注入面。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AW = readFileSync(path.join(ROOT, 'ios-desktop/js/app-window.js'), 'utf-8');
const MAIN = readFileSync(path.join(ROOT, 'ios-desktop/js/main.js'), 'utf-8');
const PKG_SDK = readFileSync(path.join(ROOT, 'ios-desktop/js/pkg-sdk.js'), 'utf-8');
const PREVIEW = readFileSync(path.join(ROOT, 'ios-desktop/js/recent-preview.js'), 'utf-8');
const WATCHDOG = readFileSync(path.join(ROOT, 'ios-desktop/js/aosp/launch-watchdog.js'), 'utf-8');

describe('#320 令牌先行门：520ms 独立释放档 iframe 就绪门', () => {
  it('A1 就绪门存在：launch-screen-timeout 档先过 currentAppIframesReady，未就绪转 iframe-load 档', () => {
    expect(AW).toContain("if (reason === 'launch-screen-timeout' && !currentAppIframesReady())");
    expect(AW).toContain('armIframeLoadRelease(); // 幂等：loop 起始已挂；此处补挂防漏（就绪门延迟路径）');
  });

  it('A2 就绪判定语义：零 iframe=就绪（模块应用即时释放）；缺 dataset.loaded=1 即未就绪', () => {
    expect(AW).toMatch(/function currentAppIframesReady\(\)[\s\S]{0,400}if \(!frames\.length\) return true;/);
    expect(AW).toMatch(/currentAppIframesReady[\s\S]{0,400}f\.dataset\.loaded !== '1'/);
  });

  it('A3 force-finish 硬上限不被门拦截：watchdog 档无条件释放（#225 防永久遮挡语义保留）', () => {
    // 门条件只命中 launch-screen-timeout；forceFinishAnim 走 'watchdog' 直达释放体
    expect(AW).toContain("onRelease: () => releaseLaunchScreen('launch-screen-timeout')");
    expect(AW).toContain("releaseLaunchScreen('watchdog')");
    expect(WATCHDOG).toContain('export const LAUNCH_WATCHDOG_MS = 2000');
    expect(WATCHDOG).toContain('export const LAUNCH_SCREEN_RELEASE_MS = 520');
  });

  it('A4 load 捕获释放档保留：与 iframe onload 属性同任务，令牌注入先于下一帧绘制', () => {
    expect(AW).toMatch(/function armIframeLoadRelease\(\)[\s\S]{0,500}addEventListener\('load', launchLoadHandler, true\)/);
  });

  it('B1 typed 应用启动屏底色 = var(--md-surface)（暗色白闪消除）；clock 固定深底保留', () => {
    expect(AW).toContain("state.currentApp.type === 'clock' ? '#18181B' : 'var(--md-surface, #1a1b1e)'");
    // openApp 作用域内不再有 typed 分支 #FFFFFF 直写（app-icons 的 #FFFFFF 与本面无关）
    expect(AW).not.toContain("? '#18181B' : '#FFFFFF'");
  });
});

describe('#326 blanket 壁纸直映退役：显式 opt-in 面保留', () => {
  it('C1 主壳注入 SDK：#P 与 data-wallpaper-target 壁纸映射保留', () => {
    expect(MAIN).toContain("var P = document.getElementById('P')");
    expect(MAIN).toContain("document.querySelectorAll('[data-wallpaper-target]')");
    expect(MAIN).toContain("P.classList.add('has-wallpaper')");
  });

  it('C2 主壳注入 SDK：blanket body 壁纸直映退役（负向锚）', () => {
    // 旧兜底三件套（body.style.backgroundImage/size/position）在 main.js 注入 SDK 不复存在
    expect(MAIN).not.toContain("document.body.style.backgroundImage = 'url(' + d.url + ')'");
    expect(MAIN).not.toContain("document.body.style.backgroundSize = 'cover'");
    expect(MAIN).not.toContain("document.body.style.backgroundPosition = 'center'");
    // 退役注记在场（防无声回滚）
    expect(MAIN).toContain('#326 已退役');
  });

  it('C3 pkg-sdk：同样退役 blanket body 兜底（安装包应用与主壳同语义）', () => {
    expect(PKG_SDK).toContain("document.querySelectorAll('[data-wallpaper-target]')");
    expect(PKG_SDK).not.toContain("document.body.style.backgroundImage = 'url(' + d.url + ')'");
    expect(PKG_SDK).not.toContain("document.body.style.backgroundSize = 'cover'");
  });

  it('D1 recents 热任务预览壳底板统一主题面；显式壁纸应用（clock_app）保留壁纸实拍通道', () => {
    expect(PREVIEW).toContain("const PREVIEW_WALLPAPER_APPS = new Set(['clock_app'])");
    expect(PREVIEW).toContain('PREVIEW_WALLPAPER_APPS.has(app.id)');
    // 非白名单应用底板 = 常量主题面（不再是壁纸实拍兜底链）
    expect(PREVIEW).toMatch(/PREVIEW_WALLPAPER_APPS\.has\(app\.id\)\s*\n\s*\? \(wallpaperBackdropCSS\(\) \|\| 'background:var\(--md-surface,#121418\)'\)\s*\n\s*: 'background:var\(--md-surface,#121418\)'/);
    // 冷任务占位卡恒 surface（AOSP 冷任务 = 图标+主题面）
    expect(PREVIEW).toMatch(/buildColdTaskHTML[\s\S]{0,400}background:linear-gradient\(180deg, var\(--md-surface/);
  });

  it('D2 wallpaperBackdropCSS 工具函数保留（#319 三源实拍能力，白名单通道消费）', () => {
    expect(PREVIEW).toContain('export function wallpaperBackdropCSS(doc)');
  });
});

describe('#326 可读性量化：底板（--md-surface）与正文（--md-on-surface）对比度', () => {
  // WCAG 相对亮度 + 对比度（令牌公式值 = generateMD3CssTokens 权威式，theme-engine.js L83-145）
  const L = (r, g, b) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const hslToRgb = (h, s, l) => {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  };
  const contrast = (c1, c2) => {
    const [l1, l2] = [L(...c1), L(...c2)].sort((a, b) => b - a);
    return (l1 + 0.05) / (l2 + 0.05);
  };

  it('E1 暗色主题：surface hsl(h,18%,8%) vs on-surface hsl(h,10%,94%) ≥ WCAG AA(4.5):1', () => {
    for (const hue of [0, 120, 215, 320]) {
      const ratio = contrast(hslToRgb(hue, 18, 8), hslToRgb(hue, 10, 94));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('E2 浅色主题：surface hsl(h,40%,98%) vs on-surface hsl(h,22%,12%) ≥ WCAG AA(4.5):1', () => {
    for (const hue of [0, 120, 215, 320]) {
      const ratio = contrast(hslToRgb(hue, 40, 98), hslToRgb(hue, 22, 12));
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });
});
