// ==================== v772-predictive-back-m3e.test.js — 官方预测性返回统一 + M3E 组件全家桶 ====================
//
// 用户需求（值得搜 + 值得还原 前两项）：
//   ① Predictive Back 官方动效规格求证 → 全系统还原
//      （developer.android.com Predictive back design：Exit Scale 100%→90% / Exit Fade
//        35% 阈值全隐 / Enter Scale 110%→100% / Enter Fade 35% 起淡入 / 插值器 (.1,.1,0,1)
//        / 手势进度 STANDARD_DECELERATE 映射）
//   ② M3 Expressive 组件：LoadingIndicator（七形循环形变，48dp）+ SplitButton
//      （拖尾 spin + 内角变形）+ connected ButtonGroup（按压内角变形）
//   ③ QS 磁贴开关：图标随容器挤压同步 pop（真机动效增强）
//
// 交付面：
//   A. 官方预测性返回 —— pbDecelerate 纯函数 / subpageMotion 双通道状态 /
//      renderSubPages 返回通道数学 / page-stack + gestures 三路置位 / files 手势桥官方映射
//   B. M3E 组件 —— m3e.js 纯函数内核（七形序列 / 形变半径）+ 引擎挂载 + 沙箱桥 +
//      files 三组件接线（SplitButton FAB / ButtonGroup 列表网格 / loader snack）
//   C. QS 图标 pop —— 关键帧与同相位锚点 + reduced-motion 禁播

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

const utilsJs = src('ios-desktop/js/utils.js');
const stateJs = src('ios-desktop/js/state.js');
const appWindowJs = src('ios-desktop/js/app-window.js');
const pageStackJs = src('ios-desktop/js/page-stack.js');
const gesturesJs = src('ios-desktop/js/gestures.js');
const filesJs = src('ios-desktop/js/apps/files.js');
const filesCss = src('ios-desktop/css/files-app.css');
const m3eJs = src('ios-desktop/js/m3e.js');
const m3eCss = src('ios-desktop/css/m3e.css');
const pullPanelsCss = src('ios-desktop/css/pull-panels.css');
const mainJs = src('ios-desktop/js/main.js');
const indexHtml = src('ios-desktop/index.html');
const swJs = src('sw.js');

// ==================== A. 官方预测性返回 ====================
describe('v7.72 · A 官方预测性返回（全系统统一）', () => {
  test('pbDecelerate：官方 STANDARD_DECELERATE 同构（三次 ease-out，端点保真）', async () => {
    const { pbDecelerate } = await import(join(ROOT, 'ios-desktop/js/utils.js'));
    expect(pbDecelerate(0)).toBe(0);
    expect(pbDecelerate(1)).toBe(1);
    expect(pbDecelerate(0.5)).toBeCloseTo(0.875, 5); // 前段反馈放大（斜率 3 → 1）
    expect(pbDecelerate(0.25)).toBeCloseTo(1 - Math.pow(0.75, 3), 5);
    expect(pbDecelerate(-1)).toBe(0); // 越界钳制
    expect(pbDecelerate(2)).toBe(1);
  });

  test('state：subpageMotion 字段保留（v7.75 起仅 forward 生效，back 通道退役注释化）', () => {
    expect(stateJs).toContain("subpageMotion: 'forward',");
    expect(stateJs).toContain("'back'    = v7.72 曾用于官方居中缩放淡换通道；v7.75 依用户裁决退役");
  });

  test('renderSubPages 统一卡片通道（v7.75：返回恢复 v7.41 横滑卡片，v7.72 居中缩放淡换退役）', () => {
    // v7.72 分支分派/Exit Fade/Enter 数学全部退役
    expect(appWindowJs).not.toContain("const backMotion = state.subpageMotion === 'back';");
    expect(appWindowJs).not.toContain('const exitFade = clamp(1 - backProgress / 0.35, 0, 1);');
    expect(appWindowJs).not.toContain('const enterT = clamp((backProgress - 0.35) / 0.65, 0, 1);');
    expect(appWindowJs).not.toContain('prevPage.style.opacity = enterT.toFixed(3);');
    // 卡片数学（前进/返回同一套）：顶页方向感知横移 + 缩放 0.90 下限 + 圆角/阴影；底页原位压暗
    expect(appWindowJs).toContain('const tx = dir * backProgress * 100;');
    expect(appWindowJs).toContain('const scale = Math.max(0.90, 1 - 0.10 * backProgress);');
    expect(appWindowJs).toContain('activePage.style.transform = `translate3d(${tx.toFixed(2)}%, ${ty.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;');
    // 底层页不透明度恒 1，仅亮度通道压暗（0.65 基值 + 0.04 档量化增量）
    expect(appWindowJs).toContain("prevPage.style.opacity = '1';");
    expect(appWindowJs).toContain('0.65 + Math.round((0.35 * backProgress) / 0.04) * 0.04');
  });

  test('统一卡片通道置位：popSubPage/手势拖拽不再置 back；手势恢复线性 1:1 跟手映射', () => {
    expect(pageStackJs).toContain("state.subpageMotion = 'forward';");
    expect(pageStackJs).not.toContain("state.subpageMotion = 'back';");
    expect(gesturesJs).not.toContain("state.subpageMotion = 'back';");
    expect(gesturesJs).not.toContain('const eased = pbDecelerate(progress);');
    expect(gesturesJs).toContain('state.drag.startSubP - clamp(clampedDx / (screenW * 0.85), 0, 1)');
    expect(gesturesJs).toContain("import { clamp, pbDecelerate } from './utils.js';");
  });

  test('files 手势桥：v7.70 横滑卡片映射恢复（顶页 1:1 横移 + 底层 -28% 视差压暗）', () => {
    expect(filesJs).not.toContain('var pbEase = function(t)');
    expect(filesJs).toContain("pbDrag.el.style.transform = 'translateX(' + pbDrag.dx.toFixed(1) + 'px)';");
    expect(filesJs).toContain("pbDrag.scr.style.transform = 'translateX(' + (-pbDrag.dx * 0.28) + 'px)';");
    expect(filesJs).toContain("pbDrag.scr.style.filter = 'brightness(' + Math.max(0.62, 1 - p * 0.38).toFixed(3) + ')';");
    // 提交目标 = v7.70 全滑出场；底层页由 fjUnderIn 视差归位通道接管
    expect(filesJs).toContain("el.style.transform = 'translateX(100%)'; // v7.70 全滑出场");
    expect(filesJs).toContain('underAnimate([scr], true); // 底层页视差归位 + 回亮');
    // v7.72 居中缩放/淡换桥退役
    expect(filesJs).not.toContain("pbDrag.el.style.transform = 'scale(' + (1 - 0.1 * p).toFixed(4) + ')';");
    expect(filesJs).not.toContain("el.style.transform = 'scale(0.9)';");
  });
});

// ==================== B. M3E 组件全家桶 ====================
describe('v7.72 · B M3E 组件（LoadingIndicator / SplitButton / ButtonGroup）', () => {
  test('m3e.js 纯函数内核（v7.75 忠实源文件重写）：七形顶点表 + 形变对 + 官方常数 + spring', async () => {
    const m3e = await import(join(ROOT, 'ios-desktop/js/m3e.js'));
    // 官方七形环形序列：SoftBurst→Cookie9→Pentagon→Pill→Sunny→Cookie4→Oval
    // 每形为单位化顶点多边形（M×2 数值数组，buildOutline+normalizeUnit 产物）
    expect(m3e.M3E_LOADER_SHAPES).toHaveLength(7);
    for (const shape of m3e.M3E_LOADER_SHAPES) {
      expect(shape.length).toBeGreaterThanOrEqual(8); // 至少 8 个顶点
      for (const p of shape) {
        expect(Array.isArray(p)).toBe(true);
        expect(typeof p[0]).toBe('number');
        expect(typeof p[1]).toBe('number');
      }
    }
    // 形变对（弧长重采样 M=256 + 两级环形对齐）：环形配对 7 组，{a, b: Float64Array(512)}
    expect(m3e.M3E_LOADER_MORPHS).toHaveLength(7);
    for (const m of m3e.M3E_LOADER_MORPHS) {
      expect(m.a).toBeInstanceOf(Float64Array);
      expect(m.b).toBeInstanceOf(Float64Array);
      expect(m.a.length).toBe(512); // 256 点 × 2 坐标
      expect(m.b.length).toBe(512);
    }
    // 官方常数：MorphInterval=650ms / 全局旋转 4666ms / 形状缩放因子 ∈ (0,1)
    expect(m3e.M3E_LOADER_SEGMENT_MS).toBe(650);
    expect(m3e.M3E_GLOBAL_ROTATION_MS).toBe(4666);
    expect(m3e.M3E_SHAPE_SCALE_FACTOR).toBeGreaterThan(0);
    expect(m3e.M3E_SHAPE_SCALE_FACTOR).toBeLessThan(1);
    // 官方 spring(0.6, 200)：tau=0 静止、充分时间后收敛到 1
    expect(m3e.m3eSpringProgress(0)).toBeGreaterThanOrEqual(0);
    expect(m3e.m3eSpringProgress(0)).toBeLessThan(0.2);
    expect(m3e.m3eSpringProgress(2)).toBeGreaterThan(0.99);
    expect(m3e.m3eSpringProgress(2)).toBeLessThanOrEqual(1);
  });

  test('m3e.css：官方组件形态锚点（48dp/contained 底盘/拖尾 spin/内角变形/连接组）', () => {
    expect(m3eCss).toContain('.m3e-loader');
    expect(m3eCss).toContain('.m3e-loader-contained'); // primary-container 底盘变体
    expect(m3eCss).toContain('.m3e-splitbtn.m3e-sb-open .m3e-sb-trail svg { transform: rotate(180deg); }'); // trail spin
    expect(m3eCss).toContain('.m3e-btngroup'); // connected group
    expect(m3eCss).toContain('.m3e-btngroup .m3e-bg-seg:active { border-radius: 15px; }'); // 按压内角变形
    expect(m3eCss).toContain('prefers-reduced-motion'); // 动效降级
  });

  test('files 三组件接线：SplitButton FAB / ButtonGroup 列表网格 / loader 导入 snack', () => {
    // SplitButton：lead 主操作 + trail 菜单 + spin/open 类同步
    expect(filesJs).toContain('<div class="fj-fab m3e-splitbtn" id="fjFab"');
    expect(filesJs).toContain('id="fjFabLead"');
    expect(filesJs).toContain('id="fjFabMenu"');
    expect(filesJs).toContain("fabLead.onclick = function() { createDir(); };");
    expect(filesJs).toContain("fab.classList.add('m3e-sb-open')");
    expect(filesJs).toContain("function closeSheet() { sheetWrap.classList.remove('on'); fabMenu.classList.remove('spin');");
    // ButtonGroup：列表/网格 chips 升级连接组（data-view 委托路径不变）
    expect(filesJs).toContain('<div class="m3e-btngroup" role="group" aria-label="视图切换">');
    expect(filesJs).toContain("'\" data-view=\"list\">'");
    expect(filesJs).toContain("data-view=\"grid\"");
    // LoadingIndicator：snack loader 分支 + 导入调用点
    expect(filesJs).toContain("if (icn === 'loader')");
    expect(filesJs).toContain("window.__m3eLoader.mount(loaderBox, { size: 17 })");
    expect(filesJs).toContain("'正在导入 ' + (i + 1) + '/' + files.length + ' · ' + f.name, 'loader', true)");
  });

  test('装配链：main.js 侧引 m3e.js（沙箱桥）+ index.html 载 m3e.css', () => {
    expect(mainJs).toContain("import './m3e.js';");
    expect(indexHtml).toContain('<link rel="stylesheet" href="css/m3e.css">');
    expect(m3eJs).toContain('window.__m3eLoader');
  });

  test('沙箱桥运行时（happy-dom）：create/mount/stop 生命周期 + 脱文档自回收', async () => {
    const m3e = await import(join(ROOT, 'ios-desktop/js/m3e.js'));
    const el = document.createElement('div');
    document.body.appendChild(el);
    const inst = m3e.createM3eLoadingIndicator({ size: 24, contained: true });
    expect(inst.el.className).toContain('m3e-loader-contained');
    expect(inst.el.style.width).toBe('24px');
    expect(typeof inst.stop).toBe('function');
    inst.stop();
    // mount：空容器挂载 / 重复挂载复用
    const mounted = m3e.mountM3eLoader(el, { size: 20 });
    expect(mounted).toBeTruthy();
    expect(el.querySelector(':scope > .m3e-loader')).toBeTruthy();
    const again = m3e.mountM3eLoader(el, { size: 20 });
    expect(el.querySelectorAll(':scope > .m3e-loader')).toHaveLength(1);
    void again;
  });
});

// ==================== C. QS 磁贴图标形变（v7.82 演进：blob morph → 两态 spring 体系） ====================
describe('v7.72→v774→v782 · C QS 磁贴：两态 spring 体系（AOSP 源码重做版）', () => {
  test('v7.82：旧轴向/blob morph 关键帧全退役，两态 = 圆角/颜色同步 spring（CSS 320ms standard）', () => {
    expect(pullPanelsCss).not.toContain('@keyframes qs-icon-squish-on {');
    expect(pullPanelsCss).not.toContain('@keyframes qs-icon-squish-off {');
    expect(pullPanelsCss).not.toContain('@keyframes qs-icon-morph-on {');
    expect(pullPanelsCss).not.toContain('@keyframes qs-icon-morph-off {');
    expect(pullPanelsCss).not.toContain('45%  { transform: scale(1.09); opacity: 1;');
    expect(pullPanelsCss).not.toContain('72%  { transform: scale(0.985);');
    // 两态圆角令牌（源码 50dp→封顶 32px / 24dp→24px）+ spring 归一化曲线
    expect(pullPanelsCss).toContain('--tile-r-off: 50px;');
    expect(pullPanelsCss).toContain('--tile-r-on: 24px;');
    expect(pullPanelsCss).toContain('border-radius 0.32s cubic-bezier(0.2, 0, 0, 1),');
    // 旧均匀 pop 保持退役
    expect(pullPanelsCss).not.toContain('@keyframes qs-icon-pop-on {');
  });
});

// ==================== 版本锚点 ====================
describe('v7.72 · 版本与构建', () => {
  test('sw.js 升 geek-v95', () => {
    expect(swJs).toContain("const VERSION = 'geek-v95';");
  });
});
