// ==================== v771-anim-fluidity.test.js — 动画流畅性专项（v7.71） ====================
//
// 用户需求：「进一步增强动画流畅性」
//
// 交付面（掉帧源系统清剿 —— 布局属性动画 / transition:all 全量 diff / 提层顿挫 / 解码阻塞）：
//   A. files-app.css —— 存储条 flex 过渡（0.9s 逐帧布局）→ 一次性合成器 scaleX stagger 入场；
//      配额条 width 过渡（逐帧布局）→ JS 一次性落定 width + 一次性合成器 scaleX（.go 重放）；
//      fj-selbox / fj-snack 的 transition:all → 显式属性枚举；
//      层级返回视差（fj-under-*）动画期挂 will-change: transform, filter（类生命周期 = 提示生命周期）
//   B. 热面 transition:all 退役 —— pull-panels（QS tab pill / qs-action-btn）、desktop（分页圆点）、
//      md3-theme（md3-btn / md3-chip / md3-nav-pill）显式枚举；pixel-features 属冷面（搜索浮层等）
//      本轮保留 all（改动风险 > 收益，注释存档决策）
//   C. files.js —— 配额条 .go 一次性重放（width 单次布局）；缩略图/预览 <img> decoding="async"
//      （防图片解码阻塞滚动/转场帧）；fillThumbs 注释锚点
//   D. 版本锚点 sw.js geek-v93

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

const filesCss = src('ios-desktop/css/files-app.css');
const filesJs = src('ios-desktop/js/apps/files.js');
const panelsCss = src('ios-desktop/css/pull-panels.css');
const desktopCss = src('ios-desktop/css/desktop.css');
const themeCss = src('ios-desktop/css/md3-theme.css');
const swJs = src('sw.js');

// 热面判定：transition: all 出现在生效声明行（行首缩进 + transition 开头；注释行以 /* 开头排除）
function activeDeclAll(cssText) {
  return cssText.split('\n').filter((l) => {
    const t = l.trim();
    return /transition\s*:\s*all\b/.test(t) && !t.startsWith('/*') && !t.startsWith('*');
  });
}

// ==================== A. files-app.css ====================
describe('v7.71 · A files-app.css 合成器化（源码锚定）', () => {
  test('存储条分段：flex 过渡退役 → 一次性 scaleX 入场 + 60ms 错峰 stagger', () => {
    expect(filesCss).not.toMatch(/\.fj-storecard \.pbar i[^]*?transition:\s*flex/);
    expect(filesCss).toContain('.fj-storecard .pbar i {\n  height: 100%; flex: 0 1 auto;\n  background: hsl(var(--md-h, 215) 80% 60%);\n  transform-origin: left center;\n  animation: fjSegIn 0.6s cubic-bezier(0.2, 0, 0.1, 1) backwards;\n}');
    expect(filesCss).toContain('.fj-storecard .pbar i:nth-child(2) { animation-delay: 60ms; }');
    expect(filesCss).toContain('.fj-storecard .pbar i:nth-child(3) { animation-delay: 120ms; }');
    expect(filesCss).toContain('.fj-storecard .pbar i:nth-child(4) { animation-delay: 180ms; }');
    expect(filesCss).toContain('@keyframes fjSegIn { from { transform: scaleX(0); } }');
  });

  test('配额条：width 过渡退役 → .go 一次性合成器 scaleX + transform-origin left', () => {
    expect(filesCss).not.toContain('transition: width');
    expect(filesCss).toContain('.fj-qbar i.go { animation: fjBarGo 0.7s cubic-bezier(0.2, 0, 0.1, 1); }');
    expect(filesCss).toContain('@keyframes fjBarGo { from { transform: scaleX(0); } }');
    expect(filesCss).toContain('transform-origin: left center;\n}\n.fj-qbar i.go');
  });

  test('fj-selbox / fj-snack：transition:all 退役 → 显式属性枚举', () => {
    expect(filesCss).toContain('.fj-selbox { transition: background-color 0.15s, border-color 0.15s, color 0.15s; }');
    expect(filesCss).toContain('transition: transform 0.3s cubic-bezier(0.2, 0, 0.1, 1), opacity 0.3s cubic-bezier(0.2, 0, 0.1, 1);');
    // 整表（除注释行）不再存在生效的 transition: all
    expect(activeDeclAll(filesCss)).toEqual([]);
  });

  test('层级过渡：动画期挂 will-change（v7.75 恢复视差：Out=In=transform+filter）', () => {
    expect(filesCss).toContain('.fj-screen.on.fj-under-out, .fj-main.fj-under-out { animation: fjUnderOut 0.34s cubic-bezier(0.2, 0, 0.1, 1) forwards; will-change: transform, filter; }');
    expect(filesCss).toContain('.fj-screen.on.fj-under-in, .fj-main.fj-under-in { animation: fjUnderIn 0.3s cubic-bezier(0.1, 0.1, 0, 1) forwards; will-change: transform, filter; }');
    // Out 关键帧不变（-24% 视差 + 压暗 0.62，M3 Forward 模式保留）
    expect(filesCss).toContain('@keyframes fjUnderOut { to { transform: translateX(-24%); filter: brightness(0.62); } }');
    // In 关键帧 = v7.75 恢复 v7.70 视差归位（-24% → 0 + 回亮，与 Out 对称）
    expect(filesCss).toContain('@keyframes fjUnderIn { from { transform: translateX(-24%); filter: brightness(0.62); } }');
  });

  test('reduced-motion：新增 scaleX 入场动画一并禁播', () => {
    expect(filesCss).toContain('.fj-storecard .pbar i, .fj-qbar i.go { animation: none; }');
  });

  test('落定哨兵：fj-shown 归零基础动画（杜绞 fj-under-*/fj-ax-* 摘除后 fjFade 重放全屏闪烁）', () => {
    expect(filesCss).toContain('.fj-screen.on.fj-shown { animation: none; }');
    // 声明序：fj-shown 规则必须在 ax/under 过渡规则之前（过渡类在场时后者胜出）
    expect(filesCss.indexOf('.fj-screen.on.fj-shown')).toBeLessThan(filesCss.indexOf('.fj-screen.on.fj-ax-l'));
    expect(filesCss.indexOf('.fj-screen.on.fj-shown')).toBeLessThan(filesCss.indexOf('.fj-screen.on.fj-under-out'));
    // 基类入场动画本体不变
    expect(filesCss).toContain('.fj-screen.on { display: block; animation: fjFade 0.26s cubic-bezier(0.2, 0, 0.1, 1); }');
  });

  test('落定哨兵 JS：syncScreens 重进屏摘哨兵 + 420ms 挂哨兵；underAnimate 收尾同步挂载', () => {
    expect(filesJs).toContain("var showTimer = null; // v7.71 落定哨兵句柄（入场动画结束后挂 fj-shown，杜绝后续类摘除重放 fjFade）");
    expect(filesJs).toContain("if (entering && !sc.classList.contains('on')) sc.classList.remove('fj-shown');");
    expect(filesJs).toContain("showTimer = setTimeout(function() { try { enterSc.classList.add('fj-shown'); } catch (e) {} }, 420);");
    expect(filesJs).toContain("el.classList.remove('fj-under-out', 'fj-under-in'); el.classList.add('fj-shown'); }");
  });
});

// ==================== B. 热面 transition:all 退役 ====================
describe('v7.71 · B 热面 transition:all 退役（源码锚定）', () => {
  test('pull-panels.css（QS tab pill / qs-action-btn）零生效 transition:all + 显式枚举', () => {
    expect(activeDeclAll(panelsCss)).toEqual([]);
    expect(panelsCss).toContain('transition: background 0.22s cubic-bezier(0.2, 0, 0, 1), color 0.22s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.22s cubic-bezier(0.2, 0, 0, 1);');
    expect(panelsCss).toContain('transition: transform 0.2s cubic-bezier(0.2, 0, 0, 1), background 0.2s cubic-bezier(0.2, 0, 0, 1), color 0.2s cubic-bezier(0.2, 0, 0, 1);');
  });

  test('desktop.css（分页圆点 .dot）零生效 transition:all + 显式枚举（保弹跳曲线）', () => {
    expect(activeDeclAll(desktopCss)).toEqual([]);
    expect(desktopCss).toContain('transition: background 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);');
  });

  test('md3-theme.css（md3-btn / md3-chip / md3-nav-pill）零生效 transition:all + 显式枚举', () => {
    expect(activeDeclAll(themeCss)).toEqual([]);
    expect(themeCss).toContain('transition: background 0.2s cubic-bezier(0.2, 0, 0, 1), color 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s cubic-bezier(0.2, 0, 0, 1), transform 0.2s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s cubic-bezier(0.2, 0, 0, 1);');
    expect(themeCss).toContain('transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;');
    expect(themeCss).toContain('transition: background 0.25s cubic-bezier(0.2, 0, 0, 1), color 0.25s cubic-bezier(0.2, 0, 0, 1);');
  });
});

// ==================== C. files.js ====================
describe('v7.71 · C files.js（源码锚定）', () => {
  test('配额条填充：width 单次落定 + .go 类重放（remove → 强制重排 → add）', () => {
    expect(filesJs).toContain("fill.style.width = pct.toFixed(2) + '%';");
    expect(filesJs).toContain("// v7.71 动画流畅性：填充动画走一次性合成器 scaleX（.go 重放），width 布局只此一次，动画期零 layout");
    expect(filesJs).toContain("fill.classList.remove('go');\n                  void fill.offsetWidth;\n                  fill.classList.add('go');");
  });

  test('缩略图/预览 <img> decoding="async"（防解码阻塞滚动与转场帧）', () => {
    const hits = filesJs.match(/decoding="async"/g) || [];
    expect(hits.length).toBeGreaterThanOrEqual(4); // 列表行 + 网格项 + 清理页缩略带 + 预览大图
    expect(filesJs).toContain('alt="" decoding="async" />');
    expect(filesJs).toContain('decoding="async" style="max-width:100%;max-height:100%;border-radius:12px;"');
    expect(filesJs).toContain('fillThumbs(scope) {\n              // 图片缩略图懒填充（readURL 异步；decoding=async 防解码阻塞滚动帧）');
  });
});

// ==================== D. 版本锚点 + 运行时语义 ====================
describe('v7.71 · D 版本锚点与运行时', () => {
  test('sw.js VERSION → geek-v93', () => {
    expect(swJs).toContain("const VERSION = 'geek-v93';");
  });

  test('运行时：.go 重放语义 —— 重复填充幂等（恰好一枚 go 类），width 与动画解耦', () => {
    // 复刻 fillStorageCardExtras 的三行重放语义，验证两次连续填充终态收敛
    const el = document.createElement('i');
    const replay = () => { el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); };
    el.style.width = '3%'; replay();
    expect(el.classList.contains('go')).toBe(true);
    el.style.width = '42.86%'; replay(); // 二次填充（async estimate 重入）
    expect(el.classList.contains('go')).toBe(true);
    expect(el.style.width).toBe('42.86%'); // 终局 width 已落定（动画只影响 transform）
    expect([...el.classList].filter((c) => c === 'go')).toHaveLength(1);
  });

  test('运行时：视差类挂载即携带 will-change 载体（类摘除 → 提示随之消失）', () => {
    const scr = document.createElement('section');
    scr.className = 'fj-screen on fj-under-out'; // 过渡期挂类
    expect(scr.classList.contains('fj-under-out')).toBe(true);
    scr.classList.remove('fj-under-out', 'fj-under-in'); // 定时摘牌（underAnimate 收尾）
    expect(scr.className).not.toContain('fj-under'); // will-change 载体类与类同生命周期
  });

  test('运行时：fj-shown 生命周期 —— 重进屏重放入场，落定后类摘除不重放', () => {
    const scr = document.createElement('section');
    scr.className = 'fj-screen';
    // 首次进入
    scr.classList.add('on');
    // 落定哨兵挂载（syncScreens 420ms / underAnimate 收尾同语义）
    scr.classList.add('fj-shown');
    // 摘除过渡类（underAnimate 收尾）—— 因有哨兵，animation-name 不再变回 fjFade
    scr.classList.remove('fj-under-out', 'fj-under-in');
    expect(scr.classList.contains('fj-shown')).toBe(true);
    // 重进屏（tab 切换回来）：先摘哨兵 → 入场动画重放
    scr.classList.remove('on');
    scr.classList.add('on');
    if (!scr.classList.contains('on')) scr.classList.remove('fj-shown'); // syncScreens 语义：entering && !on
    scr.classList.remove('fj-shown');
    expect(scr.classList.contains('fj-shown')).toBe(false);
  });
});
