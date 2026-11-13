// ==================== v191 测试 — WM Shell 侧预测性返回三机制（差异 1/2/3） ====================
//
// #191 [移植][返回手势]：back-pill（v8.21 SystemUI 侧）之外的 Shell 侧缺口：
//   差异 1（P0）：ProgressVelocityTracker.kt（50 行全文实拉）→ back-pill.js 内建同名类
//       （100ms 滑窗，#191 建议口径）+ ACTIVE 段喂 raw fullScreenProgress + gestures.js
//       根页面松手速度通道 400px/s → 400/(412−16) ≈ 1.01 progress/s（412dp 阈值屏宽处
//       严格等值，窄视口 min(w,412) 不再致灵敏度漂移）。
//   差异 2：BackAnimationConstants.java UPDATE_SYSUI_FLAGS_THRESHOLD = 0.20f 逐字导出；
//       Web 消费位 = pre-commit 状态栏外观进度门（#191 建议口径；AOSP main 消费位于
//       CrossActivityBackAnimation.kt L305 post-commit progress > 1−T，映射关系诚实标注）。
//   差异 3（P1）：BackAnimationBackground.java（167 行全文实拉）逐字移植 ——
//       亮度一次性判定 calculateLuminance < 0.5 / top > statusbarHeight/2 边缘触发 /
//       crop 圆角 / removeBackground 复位；层级映射 z-index 0（壁纸之上、桌面与窗口之下）；
//       层可见性延迟到 commit（#191 议题口径，偏差①②③见 back-animation.js 头部）。
//   P2：docs/reference/frameworks-base/wm-shell/back/ 五件快照 + README 状态机注释勘误。
// 权威锚：wm-shell/back/ 目录快照（本轮 Contents API 实拉，sha 在 README）；
//   背景色权威链 getBackgroundColor L167-173：enteringTarget.taskDescription.backgroundColor
//   → md3 映射壁纸主色（palette.primary HSL → hslToRgb）。
//
// 断言面：A. ProgressVelocityTracker 真跑  B. pill 采样接线  C. gestures.js 速度通道
//         D. 常量/亮度/HSL 真跑  E. BackAnimationBackground 真跑（happy-dom）
//         F. gestures.js 背景层接线  G. CSS 映射  H. docs 快照在册  I. 版本真源 9.26.0

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { backPill, ProgressVelocityTracker } from '../ios-desktop/js/back-pill.js';
import {
  UPDATE_SYSUI_FLAGS_THRESHOLD,
  calculateLuminance,
  hslToRgb,
  BackAnimationBackground,
} from '../ios-desktop/js/aosp/back-animation.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(path.join(here, '..', p), 'utf-8');

const PILL = read('ios-desktop/js/back-pill.js');
const GESTURES = read('ios-desktop/js/gestures.js');
const MODULE_SRC = read('ios-desktop/js/aosp/back-animation.js');
const CSS = read('ios-desktop/css/base.css');
const PKG = JSON.parse(read('package.json'));
const README = read('README.md');

const closeTo = (a, e, eps = 1e-3) => Math.abs(a - e) <= eps;

// ==================== A. ProgressVelocityTracker 真跑 ====================

describe('v9.26 #191 差异 1：ProgressVelocityTracker 真跑（progress/s 归一化速度）', () => {
  it('A1 匀速滑进：0→1 历时 0.5s（60Hz 采样）→ calculateVelocity() ≈ 2.0 progress/s', () => {
    const t = new ProgressVelocityTracker();
    for (let i = 0; i <= 30; i++) t.addPosition(i * 1000 / 60, i / 30); // 0.5s 线性推进
    expect(closeTo(t.calculateVelocity(), 2.0, 1e-6)).toBe(true);
  });

  it('A2 静止采样：进度不变 → 速度 ≈ 0（防误判 FLUNG）', () => {
    const t = new ProgressVelocityTracker();
    for (let i = 0; i <= 10; i++) t.addPosition(i * 16, 0.5);
    expect(Math.abs(t.calculateVelocity())).toBeLessThan(1e-9);
  });

  it('A3 滑窗地平线：超窗旧样本脱落，速度只反映最近 100ms（回撤后甩出为正）', () => {
    const t = new ProgressVelocityTracker();
    t.addPosition(0, 0.9);       // 旧窗口：0.9 高进度
    t.addPosition(50, 0.95);
    t.addPosition(1000, 0.97);   // 1s 后仍在边缘附近回拉
    t.addPosition(1050, 0.99);
    // 窗口内样本只剩 [1000,0.97] 与 [1050,0.99]（0/50 两点已被 1000-100 地平线裁掉）
    expect(t.samples.some((s) => s.t === 0)).toBe(false);
    expect(closeTo(t.calculateVelocity(), (0.99 - 0.97) / 0.05, 1e-6)).toBe(true);
  });

  it('A4 resetTracking()（kt L46-49）：清空样本，速度归零', () => {
    const t = new ProgressVelocityTracker();
    t.addPosition(0, 0.1);
    t.addPosition(50, 0.9);
    t.resetTracking();
    expect(t.calculateVelocity()).toBe(0);
    expect(t.samples).toHaveLength(0);
  });

  it('A5 采样不足两点 → 0（kt VelocityTracker clear 后同语义）', () => {
    const t = new ProgressVelocityTracker();
    t.addPosition(100, 0.5);
    expect(t.calculateVelocity()).toBe(0);
  });
});

// ==================== B. pill 采样接线 ====================

describe('v9.26 #191 差异 1：back-pill 内建采样接线（ACTIVE 段喂入 / begin 复位）', () => {
  it('B1 ACTIVE 段喂 raw fullScreenProgress（CrossActivityBackAnimation L251 同构位）', () => {
    expect(PILL).toContain('velocityTracker.addPosition(performance.now(), p);');
    expect(PILL).toContain('const velocityTracker = new ProgressVelocityTracker();');
  });

  it('B2 begin() 复位采样（finishAnimation L359 resetTracking 同语义）', () => {
    expect(PILL).toContain('velocityTracker.resetTracking();');
  });

  it('B3 backPill.calculateVelocity() 面世（ProgressVelocityTracker.kt L40 同名）', () => {
    expect(typeof backPill.calculateVelocity).toBe('function');
    expect(backPill.calculateVelocity()).toBe(0); // 无手势 → 无样本 → 0
  });
});

// ==================== C. gestures.js 速度通道 ====================

describe('v9.26 #191 差异 1：根页面松手判定归一化（速度通道口径切换）', () => {
  it('C1 阈值常量：COMMIT_PROGRESS_VELOCITY = 400/(412−16)（旧口径在权威阈值处等效）', () => {
    expect(GESTURES).toContain('const COMMIT_PROGRESS_VELOCITY = 400 / (412 - 16);');
    expect(closeTo(400 / 396, 1.010101, 1e-4)).toBe(true);
  });

  it('C2 消费位：isCommitRoot 用 backPill.calculateVelocity()（progress/s）', () => {
    expect(GESTURES).toContain('const progressVelocity = backPill.calculateVelocity();');
    expect(GESTURES).toContain('progressVelocity >= COMMIT_PROGRESS_VELOCITY && rawDx > 30');
  });

  it('C3 距离通道不变：25% 屏宽判定原样保留（仅速度通道换口径）', () => {
    expect(GESTURES).toContain('const isCommitRoot = rawDx > screenW * 0.25');
  });

  it('C4 子页路径既有契约保留：isCommit 像素口径不动（#191 范围外）', () => {
    expect(GESTURES).toContain('const isCommit = rawDx > screenW * 0.25 || (speed > 400 && rawDx > 30);');
  });
});

// ==================== D. 常量 / 亮度 / HSL 真跑 ====================

describe('v9.26 #191 差异 2/3：BackAnimationConstants / ColorUtils 同构真跑', () => {
  it('D1 UPDATE_SYSUI_FLAGS_THRESHOLD = 0.2 逐字（BackAnimationConstants.java L23）', () => {
    expect(UPDATE_SYSUI_FLAGS_THRESHOLD).toBe(0.2);
    expect(MODULE_SRC).toContain('UPDATE_SYSUI_FLAGS_THRESHOLD = 0.2;');
  });

  it('D2 calculateLuminance：黑 0 / 白 1 / 纯红 ≈ 0.2126（Rec.601 线性化系数）', () => {
    expect(calculateLuminance(0, 0, 0)).toBe(0);
    expect(closeTo(calculateLuminance(255, 255, 255), 1, 1e-6)).toBe(true);
    expect(closeTo(calculateLuminance(255, 0, 0), 0.2126, 1e-3)).toBe(true);
    // 中灰 128 → 线性化后亮度 < 0.5（< 0.5f 判定阈值实际落在 ≈188 之上才翻亮）
    expect(calculateLuminance(128, 128, 128)).toBeLessThan(0.5);
    expect(calculateLuminance(200, 200, 200)).toBeGreaterThan(0.5);
  });

  it('D3 hslToRgb：三基色锚点 + 壁纸默认主色 [215,80,25] 可解释', () => {
    expect(hslToRgb(0, 100, 50)).toEqual([255, 0, 0]);
    expect(hslToRgb(120, 100, 50)).toEqual([0, 255, 0]);
    expect(hslToRgb(240, 100, 50)).toEqual([0, 0, 255]);
    const [r, g, b] = hslToRgb(215, 80, 25);
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(80);
    expect(b).toBeGreaterThan(r); // 蓝相主色 B 通道占优
  });
});

// ==================== E. BackAnimationBackground 真跑 ====================

function makeBg(color = [40, 40, 60]) {
  const calls = [];
  const bg = new BackAnimationBackground({
    customizeStatusBarAppearance(region) { calls.push(region); },
  });
  bg.ensureBackground(
    { left: 0, top: 0, right: 800, bottom: 600 },
    { r: color[0], g: color[1], b: color[2] },
    28,
  );
  return { bg, calls };
}

describe('v9.26 #191 差异 3：BackAnimationBackground 真跑（BackAnimationBackground.java 逐字）', () => {
  it('E1 ensureBackground 建层：类名/背景色/幂等守卫（L80-82 源码同款）', () => {
    const { bg } = makeBg([40, 40, 60]);
    const el = document.querySelector('.back-animation-background');
    expect(el).toBeTruthy();
    expect(el.style.background).toBe('rgb(40, 40, 60)');
    bg.ensureBackground({ left: 0, top: 0, right: 1, bottom: 1 }, { r: 1, g: 1, b: 1 }, 28);
    expect(document.querySelectorAll('.back-animation-background')).toHaveLength(1);
    bg.removeBackground();
  });

  it('E2 亮度一次性判定：暗背景 → appearanceLight=false（NO_APPEARANCE 浅图标）；亮背景 → true', () => {
    const dark = makeBg([20, 20, 30]);   // luminance ≈ 0.01 < 0.5
    dark.bg.customizeStatusBarAppearance(100, null);
    expect(dark.calls[0]).toEqual({ appearanceLight: false, region: { left: 0, top: 0, right: 800, bottom: 600 } });
    dark.bg.removeBackground();

    const light = makeBg([230, 230, 235]); // luminance > 0.5
    light.bg.customizeStatusBarAppearance(100, null);
    expect(light.calls[0].appearanceLight).toBe(true);
    light.bg.removeBackground();
  });

  it('E3 top 门 + 边缘触发：半高下不请求 / 越线请求一次 / 重复帧 no-op / 回落 reset(null)', () => {
    const { bg, calls } = makeBg([230, 230, 235]);
    bg.customizeStatusBarAppearance(14, null); // 14 = 28/2，不越线（top > sbH/2 严格大于）
    expect(calls).toHaveLength(0);
    bg.customizeStatusBarAppearance(15, null); // 越线 → 请求一次
    expect(calls).toHaveLength(1);
    bg.customizeStatusBarAppearance(200, null); // 同态重复帧 → no-op（L145-147 防抖逐字）
    expect(calls).toHaveLength(1);
    bg.customizeStatusBarAppearance(5, null);  // 回落 → reset(null)
    expect(calls[1]).toBe(null);
    bg.removeBackground();
  });

  it('E4 0.20 进度门（#191 建议口径）：progress<0.2 抑制翻转，≥0.2 放行', () => {
    const { bg, calls } = makeBg([230, 230, 235]);
    bg.customizeStatusBarAppearance(100, 0.15);
    expect(calls).toHaveLength(0); // top 已越线但进度不足 → 抑制
    bg.customizeStatusBarAppearance(100, 0.2);
    expect(calls).toHaveLength(1); // 双门齐 → 请求
    bg.removeBackground();
  });

  it('E5 层可见性延迟（#191 议题口径）：showLayer:false 隐藏 → showLayer() 可见', () => {
    const bg = new BackAnimationBackground({ customizeStatusBarAppearance() {} });
    bg.ensureBackground({ left: 0, top: 0, right: 800, bottom: 600 }, { r: 0, g: 0, b: 0 }, 28, { showLayer: false });
    const el = document.querySelector('.back-animation-background');
    expect(el.style.visibility).toBe('hidden');
    bg.showLayer();
    expect(el.style.visibility).toBe('visible');
    bg.removeBackground();
  });

  it('E6 removeBackground：移层 + 复位外观请求 + 幂等（无层静默）+ 重建可用', () => {
    const { bg, calls } = makeBg([230, 230, 235]);
    bg.customizeStatusBarAppearance(100, null); // 请求中
    bg.removeBackground();
    expect(document.querySelector('.back-animation-background')).toBe(null);
    expect(calls[calls.length - 1]).toBe(null); // 复位广播
    bg.removeBackground(); // 无层再拆 → 静默不抛
    bg.ensureBackground({ left: 0, top: 0, right: 800, bottom: 600 }, { r: 0, g: 0, b: 0 }, 28);
    expect(document.querySelector('.back-animation-background')).toBeTruthy();
    bg.removeBackground();
  });

  it('E7 crop 圆角（L99-102）：cropBounds 非空 → 定尺 + borderRadius（露出壁纸语义）', () => {
    const bg = new BackAnimationBackground({ customizeStatusBarAppearance() {} });
    bg.ensureBackground(
      { left: 0, top: 0, right: 800, bottom: 600 },
      { r: 0, g: 0, b: 0 }, 28,
      { cropBounds: { left: 100, top: 50, right: 700, bottom: 550 }, cornerRadius: 12 },
    );
    const el = document.querySelector('.back-animation-background');
    expect(el.style.width).toBe('600px');
    expect(el.style.height).toBe('500px');
    expect(el.style.borderRadius).toBe('12px');
    bg.removeBackground();
  });
});

// ==================== F. gestures.js 背景层接线 ====================

describe('v9.26 #191 差异 3：gestures.js 接线（武装/联动/展示/拆层）', () => {
  it('F1 导入与单例：BackAnimationBackground + getPalette（壁纸主色权威链）', () => {
    expect(GESTURES).toContain("import { BackAnimationBackground, hslToRgb } from './aosp/back-animation.js';");
    expect(GESTURES).toContain("import { getPalette } from './wallpaper.js';");
    expect(GESTURES).toContain('const backBackground = new BackAnimationBackground({');
  });

  it('F2 武装位：根页面边缘返回 ensureBackground（showLayer:false 机制武装）', () => {
    expect(GESTURES).toContain('backBackground.ensureBackground(');
    expect(GESTURES).toContain('{ showLayer: false },');
    expect(GESTURES).toContain('backBackgroundColor()');
  });

  it('F3 联动位：每帧 customizeStatusBarAppearance(closingTop, progress)（L247 同构）', () => {
    expect(GESTURES).toContain('backBackground.customizeStatusBarAppearance(closingTop, progress);');
    expect(GESTURES).toContain('const closingTop = (screenH / 2 + backTr.translateY) - (screenH * backTr.scale) / 2;');
  });

  it('F4 生命周期：commit showLayer / cancel removeBackground / 打断拆层 / 关窗终点拆层', () => {
    expect(GESTURES).toContain('backBackground.showLayer();');
    expect(GESTURES).toContain("document.addEventListener('app-window-closed', () => backBackground.removeBackground());");
    expect(GESTURES.match(/backBackground\.removeBackground\(\)/g).length).toBeGreaterThanOrEqual(3);
  });

  it('F5 customizer 映射：appearanceLight ↔ body.back-sysui-light-icons', () => {
    expect(GESTURES).toContain("document.body.classList.toggle('back-sysui-light-icons', !!(region && region.appearanceLight));");
  });
});

// ==================== G. CSS 映射 ====================

describe('v9.26 #191：背景垫层与状态栏外观 CSS（base.css）', () => {
  it('G1 层级映射：z-index 0（壁纸-1 之上 / 桌面 1 之下）+ 默认隐藏 + 不吃指针', () => {
    expect(CSS).toContain('.back-animation-background {');
    const block = CSS.slice(CSS.indexOf('.back-animation-background {'), CSS.indexOf('.back-animation-background {') + 400);
    expect(block).toContain('z-index: 0;');
    expect(block).toContain('visibility: hidden;');
    expect(block).toContain('pointer-events: none;');
  });

  it('G2 外观翻转规则：back-sysui-light-icons → 深色图标（!important 压内联色）', () => {
    expect(CSS).toContain('body.back-sysui-light-icons .status-bar');
    const idx = CSS.indexOf('body.back-sysui-light-icons .status-bar');
    expect(CSS.slice(idx, idx + 300)).toContain('!important');
    expect(CSS.slice(idx, idx + 300)).toContain('hsl(var(--md-h)');
  });

  it('G3 零裸色纪律：新块无裸 hex（令牌系 hsl(var(--md-h)) 惯用法；注释先剥离防 #191 议题号误报）', () => {
    const start = CSS.indexOf('.back-animation-background {');
    let block = CSS.slice(start, CSS.indexOf('hsl(var(--md-h) 12% 16%) !important') + 40);
    block = block.replace(/\/\*[\s\S]*?\*\//g, ''); // 剥注释（"#191" 为议题号非色值）
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

// ==================== H. docs 快照在册 ====================

describe('v9.26 #191 P2：wm-shell/back 快照沉淀（docs/reference）', () => {
  const DIR = 'docs/reference/frameworks-base/wm-shell/back';
  it('H1 五件快照 + README 齐备', () => {
    for (const f of ['BackAnimationConstants.java', 'ProgressVelocityTracker.kt', 'BackAnimationBackground.java', 'CrossActivityBackAnimation.kt', 'DefaultCrossActivityBackAnimation.kt', 'README.md']) {
      expect(existsSync(path.join(here, '..', DIR, f))).toBe(true);
    }
  });

  it('H2 快照内容锚：常量/速度单位/亮度判定逐字在册', () => {
    expect(read(`${DIR}/BackAnimationConstants.java`)).toContain('UPDATE_SYSUI_FLAGS_THRESHOLD = 0.20f');
    expect(read(`${DIR}/ProgressVelocityTracker.kt`)).toContain('fun calculateVelocity(): Float');
    expect(read(`${DIR}/BackAnimationBackground.java`)).toContain('calculateLuminance(color) < 0.5f');
  });

  it('H3 README 状态机勘误：控制器不引用 tracker，速度消费在 CrossActivityBackAnimation', () => {
    const rm = read(`${DIR}/README.md`);
    expect(rm).toContain('不引用');
    expect(rm).toContain('CrossActivityBackAnimation.kt');
  });
});

// ==================== I. 版本真源 ====================

describe('v9.26 #191 版本真源', () => {
  it('I1 package.json 9.26.0（v150 同口径）', () => {
    expect(PKG.version).toBe('11.19.0');
  });
  it('I2 README 当前版本 v9.28（version:sync 写入）', () => {
    expect(README).toContain('当前版本 v11.19');
  });
});
