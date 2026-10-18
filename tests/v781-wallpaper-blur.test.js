// ==================== v781-wallpaper-blur.test.js — v7.81 壁纸实时模糊（全局开关） ====================
//
// 用户需求原话：「在项目里再加一个壁纸的实时模糊，而且是全局的实时这个开关」
//
// 设计（Android 12+ blur-behind 的 Web 等价实现，复用预烘焙画布零逐帧滤镜）：
//   ① 双通道模糊引擎：app（应用开合，既有）+ panel（下拉通知/控制中心，新增），
//      同一张 #desktopBlurCanvas 取 max 合成 —— 应用全屏时从应用内状态栏拉开面板，
//      面板通道不会把应用通道的模糊拽回 0
//   ② 实时跟手：拖拽进度每帧 → setPanelBlurProgress（opacity 二次曲线），
//      开/关/回弹走 tweenPanelBlurProgress（rAF 补间，时长沿用 motion.dur 令牌）
//   ③ 实时性：视频壁纸激活且模糊可见时按 ~14fps 节流重烘焙当前帧（帧代计数）
//   ④ 全局开关：设置 › 壁纸与动态壁纸 ›「壁纸实时模糊」，localStorage 持久化，
//      关闭时预烘焙通道 + 旧滤镜回退路径全系统一并停用
//
// 覆盖：引擎行为（happy-dom 实测）、接线锚点、设置页、版本锚点。

import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

const engineJs = src('ios-desktop/js/desktop-blur.js');
const gestureJs = src('ios-desktop/js/pull-down-gesture.js');
const appWindowJs = src('ios-desktop/js/app-window.js');
const parallelJs = src('ios-desktop/js/app-window-parallel.js');
const themeEngineJs = src('ios-desktop/js/theme-engine.js');
const desktopCss = src('ios-desktop/css/desktop.css');
const swJs = src('sw.js');

// ==================== A. 版本锚点 ====================
describe('v7.81 · A 版本锚点', () => {
  test('sw.js 升 geek-v94', () => {
    expect(swJs).toContain("const VERSION = 'geek-v94';");
    expect(swJs).not.toContain("'geek-v90'");
  });
});

// ==================== B. 引擎行为（happy-dom 实测） ====================
describe('v7.81 · B 双通道模糊引擎行为', () => {
  let engine;

  beforeEach(async () => {
    // ensureCanvas 需要 #desktop 宿主
    if (!document.getElementById('desktop')) {
      const host = document.createElement('div');
      host.id = 'desktop';
      document.body.appendChild(host);
    }
    engine = await import(join(ROOT, 'ios-desktop/js/desktop-blur.js'));
    // 双通道清零（模块级状态跨 test 持久），再恢复默认开启
    engine.hideDesktopBlur();
    engine.setWallpaperBlurEnabled(true);
    engine.setPanelBlurProgress(0);
  });

  test('panelBlurEase：ease-out cubic 端点保真 + 单调 + 快出缓停', () => {
    expect(engine.panelBlurEase(0)).toBe(0);
    expect(engine.panelBlurEase(1)).toBe(1);
    expect(engine.panelBlurEase(0.5)).toBeCloseTo(0.875, 5);
    expect(engine.panelBlurEase(0.25)).toBeCloseTo(1 - Math.pow(0.75, 3), 5);
    // 越界钳制
    expect(engine.panelBlurEase(-0.5)).toBe(0);
    expect(engine.panelBlurEase(1.5)).toBe(1);
    // 单调
    for (let i = 1; i <= 10; i++) {
      expect(engine.panelBlurEase(i / 10)).toBeGreaterThanOrEqual(engine.panelBlurEase((i - 1) / 10));
    }
  });

  test('面板通道：progress 驱动画布 opacity 二次曲线（0.5 → 0.25）', () => {
    engine.setPanelBlurProgress(0.5);
    const canvas = document.getElementById('desktopBlurCanvas');
    expect(canvas).toBeTruthy();
    expect(canvas.classList.contains('active')).toBe(true);
    expect(parseFloat(canvas.style.opacity)).toBeCloseTo(0.25, 3);
    // 钳制
    engine.setPanelBlurProgress(2);
    expect(parseFloat(canvas.style.opacity)).toBe(1);
    engine.setPanelBlurProgress(-1);
    expect(canvas.classList.contains('active')).toBe(false);
    expect(canvas.style.opacity).toBe('');
  });

  test('双通道 max 合成：面板 0.5 + 应用 0.3 → 0.25；应用归零不掉回清晰', () => {
    engine.setPanelBlurProgress(0.5);
    engine.setDesktopBlurProgress(0.3); // 低一路，不覆盖
    const canvas = document.getElementById('desktopBlurCanvas');
    expect(parseFloat(canvas.style.opacity)).toBeCloseTo(0.25, 3);
    // 应用开合结束（hideDesktopBlur）：面板通道仍在 → 模糊不掉
    engine.hideDesktopBlur();
    expect(canvas.classList.contains('active')).toBe(true);
    expect(parseFloat(canvas.style.opacity)).toBeCloseTo(0.25, 3);
    // 应用开到全屏（1）：取深者
    engine.setDesktopBlurProgress(1);
    expect(parseFloat(canvas.style.opacity)).toBe(1);
  });

  test('全局开关关闭：画布即刻隐藏，双通道全部失效（含重开后无残留）', () => {
    engine.setPanelBlurProgress(0.8);
    engine.setDesktopBlurProgress(0.6);
    const canvas = document.getElementById('desktopBlurCanvas');
    expect(canvas.classList.contains('active')).toBe(true);

    engine.setWallpaperBlurEnabled(false);
    expect(engine.isWallpaperBlurEnabled()).toBe(false);
    expect(canvas.classList.contains('active')).toBe(false);
    expect(canvas.style.opacity).toBe('');
    // 关闭期间写入全部 no-op
    engine.setPanelBlurProgress(1);
    engine.setDesktopBlurProgress(1);
    expect(canvas.classList.contains('active')).toBe(false);
    // 重开：app 通道是持久态（应用仍全屏 → 语义上桌面就该保持虚化）按 0.6 恢复；
    // 面板通道是瞬态手势态已清零 —— 若残留，opacity 会是 1 而非 0.36
    engine.setWallpaperBlurEnabled(true);
    expect(canvas.classList.contains('active')).toBe(true);
    expect(parseFloat(canvas.style.opacity)).toBeCloseTo(0.36, 3);
    // 持久化：'1'/'0' 写入 localStorage
    engine.setWallpaperBlurEnabled(false);
    expect(localStorage.getItem('ios-desktop:wallpaper-blur')).toBe('0');
    engine.setWallpaperBlurEnabled(true);
    expect(localStorage.getItem('ios-desktop:wallpaper-blur')).toBe('1');
  });

  test('补间快路径：durMs=0 立即落位目标', () => {
    engine.setPanelBlurProgress(0.2);
    engine.tweenPanelBlurProgress(1, 0);
    const canvas = document.getElementById('desktopBlurCanvas');
    expect(parseFloat(canvas.style.opacity)).toBe(1);
    engine.tweenPanelBlurProgress(0, 0);
    expect(canvas.classList.contains('active')).toBe(false);
  });
});

// ==================== C. 引擎源锚点 ====================
describe('v7.81 · C 引擎源锚点（desktop-blur.js）', () => {
  test('存储键与开关 API：默认开启，仅显式 0 关闭', () => {
    expect(engineJs).toContain("export const WALLPAPER_BLUR_STORAGE_KEY = 'ios-desktop:wallpaper-blur';");
    expect(engineJs).toContain("localStorage.getItem(WALLPAPER_BLUR_STORAGE_KEY) !== '0'");
    expect(engineJs).toContain('export function isWallpaperBlurEnabled()');
    expect(engineJs).toContain('export function setWallpaperBlurEnabled(on)');
  });

  test('双通道合成：max(lastProgress, panelProgress) + 关闭态短路', () => {
    expect(engineJs).toContain('function combinedProgress() { return Math.max(lastProgress, panelProgress); }');
    expect(engineJs).toMatch(/applyCombinedProgress\(\) \{[^]*?if \(!wallpaperBlurEnabled \|\| p <= 0\.001\)/);
    expect(engineJs).toContain('blurCanvas.style.opacity = (p * p).toFixed(4);');
  });

  test('面板通道 API + 补间 + 关闭期 setPanelBlurProgress 恒零守卫', () => {
    expect(engineJs).toContain('export function setPanelBlurProgress(p)');
    expect(engineJs).toContain('if (!wallpaperBlurEnabled) { panelProgress = 0; return; }');
    expect(engineJs).toContain('export function tweenPanelBlurProgress(target, durMs = 260)');
    expect(engineJs).toContain('export function panelBlurEase(t)');
    expect(engineJs).toContain('function cancelPanelBlurTween()');
  });

  test('视频壁纸实时重烘焙：~14fps 节流 + 帧代计数 force 重画', () => {
    expect(engineJs).toContain('const LIVE_BAKE_INTERVAL_MS = 70;');
    expect(engineJs).toContain('function maybeLiveRebake()');
    expect(engineJs).toContain('refreshBlurSnapshot(true); // 帧代计数：即使 key 相同也取当前帧重画');
    expect(engineJs).toMatch(/maybeLiveRebake\(\) \{[^]*?window\.__videoWallpaper && window\.__videoWallpaper\.isVideoActive\(\)/);
  });

  test('app 通道重构后不再独占画布（走 applyCombinedProgress + 关闭期同样拒记）', () => {
    expect(engineJs).toMatch(/export function setDesktopBlurProgress\(p\) \{[^]*?if \(!wallpaperBlurEnabled\) return;/);
    expect(engineJs).toMatch(/export function setDesktopBlurProgress\(p\) \{[^]*?applyCombinedProgress\(\);/);
    expect(engineJs).toMatch(/export function hideDesktopBlur\(\) \{[^]*?applyCombinedProgress\(\);/);
  });

  test('模糊层层级：桌面 z-index 60（图标之上、文件夹 100 / 面板 850 之下）', () => {
    expect(desktopCss).toMatch(/\.desktop-blur-canvas \{[^]*?z-index: 60;/);
  });
});

// ==================== D. 面板手势接线（pull-down-gesture.js） ====================
describe('v7.81 · D 面板手势接线', () => {
  test('导入面板通道 API', () => {
    expect(gestureJs).toContain(
      "import { setPanelBlurProgress, tweenPanelBlurProgress } from './desktop-blur.js';"
    );
  });

  test('拖拽帧合并函数内实时驱动：overlay 进度 → setPanelBlurProgress', () => {
    expect(gestureJs).toMatch(/function applyPanelVisual\(v\) \{[^]*?setPanelBlurProgress\(v\.overlayOpacity\);/);
  });

  test('开/关/回弹三路补间，时长沿用 motion.dur 令牌（300/250/240）', () => {
    // openPullPanel：入场 300ms 同幅补间
    expect(gestureJs).toMatch(/tweenPanelBlurProgress\(1, dur\(300\)\)/);
    // closePullPanels：收场 250ms
    expect(gestureJs).toMatch(/tweenPanelBlurProgress\(0, dur\(250\)\)/);
    // restorePanelVisual：回弹 240ms
    expect(gestureJs).toMatch(/tweenPanelBlurProgress\(1, dur\(240\)\)/);
  });
});

// ==================== E. 应用开合通道全局门禁 ====================
describe('v7.81 · E 应用开合门禁（旧滤镜回退一并停用）', () => {
  test('app-window.js：全屏保持虚化处先判全局开关', () => {
    expect(appWindowJs).toContain(
      'import { setDesktopBlurProgress, hideDesktopBlur, isBlurSnapshotReady, refreshBlurSnapshot, isWallpaperBlurEnabled } from'
    );
    expect(appWindowJs).toMatch(/if \(!isWallpaperBlurEnabled\(\)\) \{\s*dom\.desktop\.style\.filter = '';\s*\} else if \(isBlurSnapshotReady\(\)\) \{/);
  });

  test('app-window-parallel.js：逐帧渲染路径同样先判全局开关', () => {
    expect(parallelJs).toContain(
      'import { setDesktopBlurProgress, hideDesktopBlur, isBlurSnapshotReady, isWallpaperBlurEnabled } from'
    );
    expect(parallelJs).toMatch(/if \(!isWallpaperBlurEnabled\(\)\) \{\s*dom\.desktop\.style\.filter = '';\s*\} else if \(isBlurSnapshotReady\(\)\) \{/);
  });
});

// ==================== F. 设置页开关 ====================
describe('v7.81 · F 设置页开关（壁纸与动态壁纸）', () => {
  test('页面卡片：标签 + M3 开关 + 说明与提示', () => {
    expect(themeEngineJs).toContain('壁纸实时模糊');
    expect(themeEngineJs).toContain('id="setWallpaperBlurSwitch"');
    expect(themeEngineJs).toContain('全局实时模糊');
    expect(themeEngineJs).toContain('关闭后全系统停用壁纸模糊');
    // M3 开关结构（与 settings.js 同构）
    expect(themeEngineJs).toMatch(/<label class="md3-switch"><input type="checkbox" id="setWallpaperBlurSwitch"[^]*?<span class="thumb"><\/span><\/span><\/label>/);
  });

  test('接线：初始态取自引擎 + change 热生效 + Toast 反馈', () => {
    expect(themeEngineJs).toContain(
      "import { isWallpaperBlurEnabled, setWallpaperBlurEnabled } from './desktop-blur.js';"
    );
    expect(themeEngineJs).toMatch(/blurSwitch\.checked = isWallpaperBlurEnabled\(\);/);
    expect(themeEngineJs).toMatch(/setWallpaperBlurEnabled\(blurSwitch\.checked\);/);
    expect(themeEngineJs).toContain("'壁纸实时模糊已全局开启'");
    expect(themeEngineJs).toContain("'壁纸实时模糊已全局关闭'");
  });
});
