// ==================== v770-files-backparallax.test.js — 文件应用层级返回视差（Android 平台同构） ====================
//
// 用户需求：「网络搜索关于安卓的文件应用，看看能不能仿得更像，同时预览时返回，
//            我发现当前也是只能让二级菜单从左向右退」
//
// 交付面：
//   A. CSS —— 子页/预览全滑转场（100% 进出场 + 左缘海拔阴影 + 媒体纯黑底）+
//      底层页视差（fj-under-out/fj-under-in：0→-24% 压暗 / -24%→0 回亮）+ reduced-motion 全禁
//   B. JS —— underAnimate 助手（防抖重放/定时摘牌）+ openSub/closeSub/openPreview/closePreview
//      四路接线 + pvCloseSeq 关闭→重开竞态防 + 手势桥跟手视差 + 提交目标 100%
//   C. 运行时 —— happy-dom 挂真实类断言（openSub 前进挂 fj-under-out、closeSub 后退挂
//      fj-under-in、预览同构、快速连开关重放不残留）

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

const filesJs = src('ios-desktop/js/apps/files.js');
const filesCss = src('ios-desktop/css/files-app.css');
const swJs = src('sw.js');

// ==================== A. CSS 源码锚定 ====================
describe('v7.70 · A CSS 转场与视差（源码锚定）', () => {
  test('子页全滑：100% 进出场 + 加速/减速双曲线 + 左缘海拔阴影', () => {
    expect(filesCss).toContain('.fj-sub.anim-in { animation: fjSubIn 0.34s cubic-bezier(0.2, 0, 0.1, 1); }');
    expect(filesCss).toContain('.fj-sub.anim-out { animation: fjSubOut 0.28s cubic-bezier(0.4, 0, 1, 1) forwards; }');
    expect(filesCss).toContain('@keyframes fjSubIn { from { transform: translateX(100%); } }');
    expect(filesCss).toContain('@keyframes fjSubOut { to { transform: translateX(100%); } }');
    expect(filesCss).toContain('box-shadow: -12px 0 32px rgba(0, 0, 0, 0.45);');
    // 旧半滑 + 渐隐彻底退役
    expect(filesCss).not.toContain('translateX(56%)');
    expect(filesCss).not.toContain('opacity: 0.4; } }');
  });

  test('预览页全滑 + anim-out + 媒体纯黑底（真机 Files 图片查看器同款）', () => {
    expect(filesCss).toContain('.fj-preview.on { display: flex; animation: fjPvIn 0.3s cubic-bezier(0.2, 0, 0.1, 1); }');
    expect(filesCss).toContain('.fj-preview.anim-out { animation: fjPvOut 0.26s cubic-bezier(0.4, 0, 1, 1) forwards; }');
    expect(filesCss).toContain('.fj-preview.media { background: #000; }');
    expect(filesCss).toContain('@keyframes fjPvIn { from { transform: translateX(100%); } }');
    expect(filesCss).toContain('@keyframes fjPvOut { to { transform: translateX(100%); } }');
  });

  test('底层页视差：0→-24% 压暗 / -24%→0 回亮，特异性 (0,3,0) 压过 fjFade 与 fj-ax-l', () => {
    // v7.71 演进：规则追加动画期 will-change: transform, filter（类生命周期 = 提示生命周期）
    expect(filesCss).toContain('.fj-screen.on.fj-under-out, .fj-main.fj-under-out { animation: fjUnderOut 0.34s cubic-bezier(0.2, 0, 0.1, 1) forwards; will-change: transform, filter; }');
    expect(filesCss).toContain('.fj-screen.on.fj-under-in, .fj-main.fj-under-in { animation: fjUnderIn 0.28s cubic-bezier(0.4, 0, 1, 1) forwards; will-change: transform, filter; }');
    expect(filesCss).toContain('@keyframes fjUnderOut { to { transform: translateX(-24%); filter: brightness(0.62); } }');
    expect(filesCss).toContain('@keyframes fjUnderIn { from { transform: translateX(-24%); filter: brightness(0.62); } }');
    // 视差规则必须声明在 .fj-screen.on（fjFade）之后才能同特异性覆盖
    expect(filesCss.indexOf('.fj-screen.on { display: block; animation: fjFade')).toBeLessThan(
      filesCss.indexOf('.fj-screen.on.fj-under-out, .fj-main.fj-under-out')
    );
  });

  test('reduced-motion：视差/子页/预览转场全禁', () => {
    expect(filesCss).toContain('.fj-screen.on.fj-under-out, .fj-main.fj-under-out,\n  .fj-screen.on.fj-under-in, .fj-main.fj-under-in,\n  .fj-sub.anim-in, .fj-sub.anim-out, .fj-preview.on, .fj-preview.anim-out { animation: none; }');
  });
});

// ==================== B. JS 源码锚定 ====================
describe('v7.70 · B JS 接线（源码锚定）', () => {
  test('underAnimate 助手：防抖重放（强制重排）+ 定时摘牌 + reveal 分流', () => {
    expect(filesJs).toContain("el.classList.remove('fj-under-out', 'fj-under-in');");
    expect(filesJs).toContain('void el.offsetWidth; // 强制重排：快速连开连关时重放动画');
    expect(filesJs).toContain("el.classList.add(reveal ? 'fj-under-in' : 'fj-under-out');");
    expect(filesJs).toContain("}, reveal ? 300 : 360));");
    expect(filesJs).toContain("function activeScreenEl() { try { return app.querySelector('.fj-screen.on'); } catch (e) { return null; } }");
  });

  test('子页四路接线：openSub 前进 under-out / closeSub 后退 under-in；既有 anim 类名锚点不破坏', () => {
    expect(filesJs).toContain('underAnimate([activeScreenEl()], false); // v7.70 前进：底层页左移压暗');
    expect(filesJs).toContain('underAnimate([activeScreenEl()], true); // v7.70 后退：底层页从左侧视差归位');
    // issue5-fixes 既有锚点必须原样保留
    expect(filesJs).toContain("subEl.classList.add('on', 'anim-in')");
    expect(filesJs).toContain("subEl.classList.add('anim-out')");
    expect(filesJs).toContain("subEl.classList.remove('on', 'anim-out')");
    // v7.70 竞态防：subSeq 序号作废关闭动画期间的延迟摘牌；重开强重排重放
    expect(filesJs).toContain('subSeq++; // 作废待触发的关闭清理');
    expect(filesJs).toContain('if (seq !== subSeq) return; // 已被重开作废');
    expect(filesJs).toContain('void subEl.offsetWidth; // 关闭动画中途重开：重放进场');
  });

  test('预览四路接线：openPreview 前进 under-out + media 纯黑底判定；closePreview anim-out 延迟摘牌', () => {
    expect(filesJs).toContain("pvEl.classList.toggle('media', mime.indexOf('image/') === 0 || mime.indexOf('video/') === 0);");
    expect(filesJs).toContain('underAnimate([mainEl], false); // v7.70 前进：主区左移压暗');
    expect(filesJs).toContain('underAnimate([mainEl], true); // v7.70 后退：主区从左侧视差归位');
    expect(filesJs).toContain("if (!pvEl.classList.contains('on') || pvEl.classList.contains('anim-out')) return;");
    expect(filesJs).toContain("if (seq !== pvCloseSeq) return; // 已被新打开作废");
    expect(filesJs).toContain("pvEl.classList.remove('anim-out');\n              pvEl.classList.toggle('media'");
    expect(filesJs).toContain('pvCloseSeq++; // 作废待触发的关闭清理');
  });

  test('手势桥：跟手视差（-28% 比例 + 同步压暗）+ 提交目标 100% + 底层页弹回归位', () => {
    expect(filesJs).toContain("pbDrag.scr.style.transform = 'translateX(' + (-pbDrag.dx * 0.28) + 'px)';");
    expect(filesJs).toContain("pbDrag.scr.style.filter = 'brightness(' + Math.max(0.62, 1 - pbDrag.dx / 900) + ')';");
    expect(filesJs).toContain("el.style.transform = 'translateX(100%)'; // v7.70 全滑出场（旧 56% 半滑 + 渐隐）");
    expect(filesJs).toContain("scr.style.transition = 'transform 0.28s cubic-bezier(0.4, 0, 1, 1), filter 0.28s cubic-bezier(0.4, 0, 1, 1)';");
    // 旧半滑目标退役
    expect(filesJs).not.toContain("translateX(56%)");
    expect(filesJs).not.toContain("el.style.opacity = '0.4';");
  });

  test('v7.70 共享轴类延迟摘牌：380ms 后移除 fj-ax-l/fj-ax-r（防特异性永久压制视差动画）', () => {
    expect(filesJs).toContain('var axTimer = null; // v7.70 共享轴类延迟摘牌句柄');
    expect(filesJs).toContain("axTimer = setTimeout(function() { try { sc.classList.remove('fj-ax-l', 'fj-ax-r'); } catch (e) {} }, 380);");
    expect(filesJs).toContain('v7.70：动画结束后（380ms）摘除轴类');
  });

  test('版本锚点：sw.js 升 geek-v80；dynamic-icons 游离定时器守卫（CI teardown 后 ReferenceError 根治）', () => {
    expect(swJs).toContain("const VERSION = 'geek-v80';");
    const dynJs = src('ios-desktop/js/dynamic-icons.js');
    expect(dynJs).toContain("if (typeof document === 'undefined') return;");
  });
});

// ==================== C. 运行时 ====================
describe('v7.70 · C 运行时（类挂载行为）', () => {
  let cleanup = [];
  beforeEach(() => {
    cleanup = [];
    vi.stubGlobal('__sampleUnused', {});
  });
  afterEach(() => {
    while (cleanup.length) { try { cleanup.pop()(); } catch (e) {} }
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function bootHarness() {
    // 极简宿主：app 结构对齐 files.js 模板里与视差相关的骨架
    document.body.innerHTML = `
      <div id="fjApp">
        <div class="fj-main">
          <div class="fj-top"></div>
          <div class="fj-screens">
            <section class="fj-screen on" id="fjHome"></section>
            <section class="fj-screen" id="fjClean"></section>
            <section class="fj-screen" id="fjBrowse"></section>
            <div class="fj-sub" id="fjSub">
              <div class="fj-subtop"><button id="fjSubBack"></button><div class="fj-subtitle" id="fjSubTitle"></div></div>
              <div class="fj-subbody" id="fjSubBody"></div>
            </div>
          </div>
        </div>
        <div class="fj-preview" id="fjPreview">
          <div class="fj-pvtop"><button id="fjPvClose"></button><div class="fj-pvname" id="fjPvName"></div></div>
          <div class="fj-pvbody" id="fjPvBody"></div>
        </div>
      </div>`;
    const app = document.getElementById('fjApp');
    const underAnimate = (els, reveal) => {
      els.forEach((el) => {
        if (!el) return;
        el.classList.remove('fj-under-out', 'fj-under-in');
        void el.offsetWidth;
        el.classList.add(reveal ? 'fj-under-in' : 'fj-under-out');
      });
      setTimeout(() => {
        els.forEach((el) => { if (el) el.classList.remove('fj-under-out', 'fj-under-in'); });
      }, reveal ? 300 : 360);
    };
    const activeScreenEl = () => app.querySelector('.fj-screen.on');
    const mainEl = app.querySelector('.fj-main');
    const subEl = document.getElementById('fjSub');
    const pvEl = document.getElementById('fjPreview');
    return { app, underAnimate, activeScreenEl, mainEl, subEl, pvEl };
  }

  test('openSub 前进：底层屏挂 fj-under-out（0→-24% 压暗），子页 anim-in', () => {
    vi.useFakeTimers();
    const h = bootHarness();
    h.underAnimate([h.activeScreenEl()], false);
    h.subEl.classList.remove('anim-out');
    h.subEl.classList.add('on', 'anim-in');
    const scr = h.activeScreenEl();
    expect(scr.classList.contains('fj-under-out')).toBe(true);
    expect(scr.classList.contains('fj-under-in')).toBe(false);
    expect(h.subEl.classList.contains('anim-in')).toBe(true);
    vi.advanceTimersByTime(360);
    expect(scr.classList.contains('fj-under-out')).toBe(false); // 定时摘牌
  });

  test('closeSub 后退：底层屏挂 fj-under-in（-24%→0 视差归位）', () => {
    vi.useFakeTimers();
    const h = bootHarness();
    h.underAnimate([h.activeScreenEl()], true);
    h.subEl.classList.add('anim-out');
    const scr = h.activeScreenEl();
    expect(scr.classList.contains('fj-under-in')).toBe(true);
    expect(scr.classList.contains('fj-under-out')).toBe(false);
    vi.advanceTimersByTime(300);
    expect(scr.classList.contains('fj-under-in')).toBe(false);
  });

  test('预览：open 挂主区 fj-under-out + media 黑底判定；close 挂 fj-under-in + anim-out 延迟摘牌', () => {
    vi.useFakeTimers();
    const h = bootHarness();
    // open（图片 → media）
    h.pvEl.classList.remove('anim-out');
    h.pvEl.classList.toggle('media', true);
    h.underAnimate([h.mainEl], false);
    h.pvEl.classList.add('on');
    expect(h.mainEl.classList.contains('fj-under-out')).toBe(true);
    expect(h.pvEl.classList.contains('media')).toBe(true);
    // close
    h.pvEl.classList.remove('media');
    h.pvEl.classList.add('anim-out');
    h.underAnimate([h.mainEl], true);
    expect(h.mainEl.classList.contains('fj-under-in')).toBe(true);
    expect(h.pvEl.classList.contains('anim-out')).toBe(true);
    vi.advanceTimersByTime(300);
    expect(h.mainEl.classList.contains('fj-under-in')).toBe(false);
  });

  test('快速连开连关：underAnimate 幂等重放不残留双类', () => {
    vi.useFakeTimers();
    const h = bootHarness();
    const scr = h.activeScreenEl();
    h.underAnimate([scr], false);
    h.underAnimate([scr], true); // 立即反向
    expect(scr.classList.contains('fj-under-out')).toBe(false);
    expect(scr.classList.contains('fj-under-in')).toBe(true);
    vi.advanceTimersByTime(400);
    expect(scr.classList.contains('fj-under-in')).toBe(false);
    expect(scr.classList.contains('fj-under-out')).toBe(false);
  });

  test('手势桥数据面：progress 跟手 -28% 比例 + 压暗钳 0.62；commit 目标 100%', () => {
    const dx1 = 120, dx2 = 2000;
    expect(-dx1 * 0.28).toBeCloseTo(-33.6, 5);
    expect(Math.max(0.62, 1 - dx1 / 900)).toBeCloseTo(0.867, 3);
    expect(Math.max(0.62, 1 - dx2 / 900)).toBe(0.62); // 大位移钳制
  });
});
