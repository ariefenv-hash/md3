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

  test('state：subpageMotion 双通道字段（forward 前进滑入 / back 官方缩放淡换）', () => {
    expect(stateJs).toContain("subpageMotion: 'forward',");
    expect(stateJs).toContain("'back'    = 返回（官方全屏表面规范");
  });

  test('renderSubPages 返回通道：居中缩放 90% + Exit Fade 35% 全隐 + Enter 110→100', () => {
    // 模式分派
    expect(appWindowJs).toContain("const backMotion = state.subpageMotion === 'back';");
    // 官方 Exit 数学：scale 1→0.90、opacity 35% 进度全隐、radius 0→28px
    expect(appWindowJs).toContain('const exitFade = clamp(1 - backProgress / 0.35, 0, 1);');
    expect(appWindowJs).toContain('const scale = Math.max(0.90, 1 - 0.10 * backProgress);');
    expect(appWindowJs).toContain('activePage.style.opacity = exitFade.toFixed(3);');
    // 官方 Enter 数学：110%→100%，35% 起淡入（0.35 阈值）
    expect(appWindowJs).toContain('const enterT = clamp((backProgress - 0.35) / 0.65, 0, 1);');
    expect(appWindowJs).toContain('const enterScale = 1.10 - 0.10 * enterT;');
    expect(appWindowJs).toContain('prevPage.style.opacity = enterT.toFixed(3);');
    // 返回通道不再横滑（tx 恒 0），纵向跟手保留（shared-element y-shift 同构）
    expect(appWindowJs).toContain('activePage.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;');
    // 前进通道逐字保留（横滑 tx + 底层压暗）
    expect(appWindowJs).toContain('const tx = dir * backProgress * 100;');
  });

  test('三路置位：pushSubPage=forward / popSubPage=back / 手势拖拽=back+减速映射', () => {
    expect(pageStackJs).toContain("state.subpageMotion = 'forward';");
    expect(pageStackJs).toContain("state.subpageMotion = 'back';");
    expect(gesturesJs).toContain("state.subpageMotion = 'back';");
    expect(gesturesJs).toContain('const eased = pbDecelerate(progress);');
    expect(gesturesJs).toContain("import { clamp, pbDecelerate } from './utils.js';");
  });

  test('files 手势桥：官方映射（减速 + 居中缩放/淡换，不横滑）', () => {
    expect(filesJs).toContain('var pbEase = function(t) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3); };');
    expect(filesJs).toContain("pbDrag.el.style.transform = 'scale(' + (1 - 0.1 * p).toFixed(4) + ')';");
    expect(filesJs).toContain("pbDrag.el.style.opacity = String(Math.max(0, Math.min(1, 1 - p / 0.35)));");
    expect(filesJs).toContain("pbDrag.scr.style.transform = 'scale(' + (1.1 - 0.1 * et).toFixed(4) + ')';");
    expect(filesJs).not.toContain('-pbDrag.dx * 0.28'); // 旧横滑视差桥退役
  });
});

// ==================== B. M3E 组件全家桶 ====================
describe('v7.72 · B M3E 组件（LoadingIndicator / SplitButton / ButtonGroup）', () => {
  test('m3e.js 纯函数内核：七形循环序列 + 形变半径函数（整数化瓣频防接缝撕裂）', async () => {
    const m3e = await import(join(ROOT, 'ios-desktop/js/m3e.js'));
    expect(m3e.M3E_LOADER_SHAPES).toHaveLength(7); // 官方：seven unique Material 3 shapes
    for (const s of m3e.M3E_LOADER_SHAPES) {
      expect(s.n).toBeGreaterThan(0);
      expect(s.a).toBeGreaterThanOrEqual(0);
      expect(s.s).toBeGreaterThan(0);
    }
    // 半径函数：端点 = 两形态精确值；中途瓣频整数化
    const A = { n: 8, a: 0.12, s: 1.0 }, B = { n: 4, a: 0.22, s: 0.9 };
    expect(m3e.m3eLoaderRadius(0, A, B, 0, 10)).toBeCloseTo(10 * 1.12, 5);
    expect(m3e.m3eLoaderRadius(0, A, B, 1, 10)).toBeCloseTo(10 * 1.22 * 0.9, 5);
    const mid = m3e.m3eLoaderRadius(Math.PI / 8, A, B, 0.5, 10);
    expect(mid).toBeGreaterThan(0);
    expect(m3e.M3E_LOADER_SEGMENT_MS).toBeGreaterThan(0);
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

// ==================== C. QS 磁贴图标真挤压（v7.74 演进：均匀 pop → 轴向 squash&stretch） ====================
describe('v7.72→v774 · C QS 磁贴：图标轴向挤压（真机动效增强）', () => {
  test('关键帧与容器 squish 同相位（38% 压扁峰值 / 62|72% 反向回弹）+ reduced-motion 禁播', () => {
    expect(pullPanelsCss).toContain('.qs-tile-pill.squish-on .qs-tile-icon-wrap {');
    expect(pullPanelsCss).toContain('.qs-tile-pill.squish-off .qs-tile-icon-wrap {');
    expect(pullPanelsCss).toContain('@keyframes qs-icon-squish-on {');
    expect(pullPanelsCss).toContain('@keyframes qs-icon-squish-off {');
    // 轴向挤压：38% 处横向胖纵向扁（非均匀放大），回弹反向过冲
    expect(pullPanelsCss).toContain('38%  { transform: scale(1.12, 0.85);');
    expect(pullPanelsCss).toContain('72%  { transform: scale(0.96, 1.04);');
    // 与容器同周期（380/300ms）——相位对齐
    expect(pullPanelsCss).toContain('animation: qs-icon-squish-on 380ms both;');
    expect(pullPanelsCss).toContain('animation: qs-icon-squish-off 300ms both;');
    // 旧均匀 pop 已退役
    expect(pullPanelsCss).not.toContain('@keyframes qs-icon-pop-on {');
    expect(pullPanelsCss).toContain('.qs-tile-pill.squish-on .qs-tile-icon-wrap,\n  .qs-tile-pill.squish-off .qs-tile-icon-wrap {\n    animation: none;\n  }');
  });
});

// ==================== 版本锚点 ====================
describe('v7.72 · 版本与构建', () => {
  test('sw.js 升 geek-v83', () => {
    expect(swJs).toContain("const VERSION = 'geek-v83';");
  });
});
