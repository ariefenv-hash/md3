// ==================== theme-engine.js — Material You 动态色彩主题引擎与壁纸精选 ====================

import { dom } from './dom.js';
import { ICONS } from './icons.js';
import { AOSP_ICONS } from './icons-aosp.js';
import { triggerWallpaperSelect, triggerFontSelect, clearCustomWallpaper, clearSavedPalette, clearCustomFont, getFontName, getFontWeights } from './wallpaper.js';
import { clearVideoWallpaper } from './video-wallpaper.js';
import { getThemeModePref, setThemeMode, getResolvedTheme } from './theme-mode.js';
import { Spring, Spring2D } from './spring.js';
import { setSwitchChecked } from './m3-controls.js'; // #70：程序化开关真值统一入口
import { curOpenParams, curCloseParams } from './animation-presets.js';
import { registerOverlayBack } from './overlay-registry.js';
import { state } from './state.js';
import { initialApps } from './apps-data.js';
import { openApp } from './app-window.js';
import { pushSubPage } from './page-stack.js';
// v9.94 #20：锁屏表盘/时钟字体设置卡（ClockConfig 元数据 + buildFaceHTML 迷你预览；
// 写路径走 window.__lockClockFaces 钩子零 import 解耦——theme-engine↔lock-screen
// 已有 video-wallpaper 运行时环，新增静态边有环化风险，事件总线同 v9.77 惯例）
import { CLOCK_FACES, CLOCK_FONT_SOURCES, LOCK_CLOCK_FACE_KEY, CLOCK_FONT_KEY, buildFaceHTML } from './aosp/clock-faces.js';
// v10.42 #101：AI 生成表盘面板（参数化生成核 + 逐维度锁定/重掷——纯叶子零环）
import { watchfaceGenStore, GEN_DIMENSIONS, dimensionValueLabel } from './aosp/watchface-generator.js';
import { ensureClockFontLoaded } from './clock-font-loader.js';
import {
  PROCEDURAL_PRESETS, applyProceduralWallpaper, clearProceduralWallpaper,
  getActiveProceduralId, renderProceduralThumbnail, getProceduralSnapshotURL,
} from './procedural-wallpaper.js';
// v9.94 #33：Monet 动态取色（AOSP SystemUI monet 同构，js/aosp/monet.js 纯逻辑）
import { createColorScheme, schemeToCssVars, argbToHex } from './aosp/monet.js';
// v10.42 #50：ColorBlendr 式主题色自定义（MonetStyle 10 风格 + 双端 HCT 混色 + 社区主题严格
// codec，js/aosp/theme-color.js 纯逻辑零 DOM；Mahmud0808/ColorBlendr master 2026-11-04 实拉同律）
import { buildCustomScheme, parseCommunityTheme, blendSeeds, PRESET_COLORS, MONET_STYLES } from './aosp/theme-color.js';
// v7.81 壁纸实时模糊（全局开关）：读取/写入由 desktop-blur 引擎持有，页面只做接线
import { isWallpaperBlurEnabled, setWallpaperBlurEnabled } from './desktop-blur.js';

// 当前活动色相（默认 215 科技蓝）
let currentThemeHue = 215;

// 从缓存加载持久化色相
try {
  const savedHue = localStorage.getItem('ios-desktop:theme-hue');
  if (savedHue) {
    currentThemeHue = parseInt(savedHue, 10) || 215;
  }
} catch (e) {}

// 预设高保真壁纸
export const PRESET_WALLPAPERS = [
  {
    name: 'Pixel 10 极光流光',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    hue: 215
  },
  {
    name: 'Material You 抽象几何',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1200&q=80',
    hue: 165
  },
  {
    name: '深邃暗夜星云',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80',
    hue: 275
  },
  {
    name: '赛博落日余晖',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    hue: 35
  }
];

/** 获取当前主题色相 */
export function getCurrentThemeHue() {
  return currentThemeHue;
}

/**
 * 生成 MD3 CSS 变量声明字符串
 * v7.26：mode 感知 —— 'dark'（默认）公式不变；'light' 与 css/theme-mode.css
 * body.light-theme 及 apps/_shared/md3-tokens.css 浅色块逐字一致，保证宿主、
 * 注入、独立打开三方在任意外观下渲染相同。（--md-tertiary 基色与宿主浅色
 * 行为一致：theme-mode.css 浅色仅覆盖 container 系，基色保持同式不漂移）
 */
export function generateMD3CssTokens(hue, mode = 'dark') {
  if (mode === 'light') {
    return `
    --md-h: ${hue};
    --md-primary: hsl(${hue}, 78%, 38%);
    --md-on-primary: #ffffff;
    --md-primary-container: hsl(${hue}, 88%, 90%);
    --md-on-primary-container: hsl(${hue}, 60%, 16%);
    --md-secondary: hsl(${hue}, 32%, 38%);
    --md-on-secondary: #ffffff;
    --md-secondary-container: hsl(${hue}, 30%, 90%);
    --md-on-secondary-container: hsl(${hue}, 30%, 18%);
    --md-tertiary: hsl(${(hue + 60) % 360}, 65%, 40%);
    --md-on-tertiary: #ffffff;
    --md-tertiary-container: hsl(${(hue + 60) % 360}, 55%, 88%);
    --md-on-tertiary-container: hsl(${(hue + 60) % 360}, 50%, 16%);
    --md-surface: hsl(${hue}, 40%, 98%);
    --md-surface-dim: hsl(${hue}, 18%, 88%);
    --md-surface-bright: hsl(${hue}, 40%, 100%);
    --md-surface-container-lowest: hsl(${hue}, 40%, 100%);
    --md-surface-container-low: hsl(${hue}, 36%, 96%);
    --md-surface-container: hsl(${hue}, 32%, 93%);
    --md-surface-container-high: hsl(${hue}, 30%, 90%);
    --md-surface-container-highest: hsl(${hue}, 28%, 87%);
    --md-on-surface: hsl(${hue}, 22%, 12%);
    --md-on-surface-variant: hsl(${hue}, 14%, 32%);
    --md-outline: hsl(${hue}, 10%, 58%);
    --md-outline-variant: hsl(${hue}, 18%, 82%);
    --md-accent: hsl(${hue}, 85%, 40%);
    --md-accent-container: hsl(${hue}, 88%, 90%);
  `;
  }
  return `
    --md-h: ${hue};
    --md-primary: hsl(${hue}, 82%, 36%);
    --md-on-primary: #ffffff;
    --md-primary-container: hsl(${hue}, 85%, 22%);
    --md-on-primary-container: hsl(${hue}, 92%, 92%);
    --md-secondary: hsl(${hue}, 28%, 46%);
    --md-on-secondary: #ffffff;
    --md-secondary-container: hsl(${hue}, 24%, 20%);
    --md-on-secondary-container: hsl(${hue}, 30%, 90%);
    --md-tertiary: hsl(${(hue + 60) % 360}, 65%, 40%);
    --md-on-tertiary: #ffffff;
    --md-tertiary-container: hsl(${(hue + 60) % 360}, 60%, 20%);
    --md-on-tertiary-container: hsl(${(hue + 60) % 360}, 85%, 92%);
    --md-surface: hsl(${hue}, 18%, 8%);
    --md-surface-dim: hsl(${hue}, 20%, 6%);
    --md-surface-bright: hsl(${hue}, 16%, 14%);
    --md-surface-container-lowest: hsl(${hue}, 22%, 5%);
    --md-surface-container-low: hsl(${hue}, 18%, 10%);
    --md-surface-container: hsl(${hue}, 16%, 14%);
    --md-surface-container-high: hsl(${hue}, 14%, 18%);
    --md-surface-container-highest: hsl(${hue}, 13%, 24%);
    --md-on-surface: hsl(${hue}, 10%, 94%);
    --md-on-surface-variant: hsl(${hue}, 12%, 72%);
    --md-outline: hsl(${hue}, 10%, 48%);
    --md-outline-variant: hsl(${hue}, 12%, 24%);
    --md-accent: hsl(${hue}, 92%, 68%);
    --md-accent-container: hsl(${hue}, 85%, 20%);
  `;
}

/** 生成注入到子 iframe 中的动态样式（v7.26：携带外观模式） */
export function generateMD3InjectedStylesheet(hue, mode = 'dark') {
  return `
    :root {
      ${generateMD3CssTokens(hue, mode)}
    }
    .md3-dynamic-accent { color: var(--md-accent) !important; }
    .md3-dynamic-bg { background-color: var(--md-surface) !important; }
    .md3-dynamic-card { background-color: var(--md-surface-container) !important; border-color: var(--md-outline-variant) !important; }
  `;
}

/** 初始化主题引擎 */
export function initThemeEngine() {
  createThemePickerModalDOM();
  window.openThemePicker = openThemePicker;
  // v7.26：测试钩子（与 theme-mode.js 的 __themeModeTest 同惯例）——
  // E2E 在源码版与 dist 版（无源码模块路径）下均可靠触发运行时切色
  window.__themeHueTest = {
    get: () => currentThemeHue,
    set: (hue) => applyThemeHue(hue, false),
  };
  // v7.6：立即回收桥 —— 供应用关闭流程（closeApp）回收壁纸页。
  // v7.8.1 起正常流不再经 closeApp 打开/关闭页面（前台应用保持在场），此桥仅作
  // 防御性回收（主页手势/多任务等关闭路径仍需回收，防止回桌面后页面残留）。
  window.__closeThemePicker = closeThemePicker;
  // v7.8：优雅关闭桥 —— 程序化关闭（Esc / 上传跳转）走动画退场（v7.9.1 起为横向滑出）
  window.__closeThemePickerAnimated = closeThemePickerAnimated;
  initThemePickerGestureBridge();
  // v7.8：注册 page-like 域（边缘滑出 = 整页跟手滑出，透出下层来源）；其他浮层未注册、行为不变
  registerOverlayBack({
    id: 'themePicker',
    isActive: () => {
      const ov = tpOverlay();
      return !!(ov && ov.classList.contains('active') && !tpAnim.dragging && !tpAnim.x);
    },
    beginGesture: (dir) => window.__themePickerGesture.begin(dir),
    progressGesture: (dx) => window.__themePickerGesture.progress(dx),
    commitGesture: (v) => window.__themePickerGesture.commit(v),
    cancelGesture: (v) => window.__themePickerGesture.cancel(v),
  });
  // 启动时应用当前色相
  applyThemeHue(currentThemeHue, false);
  // v9.94 #33：Monet 启动恢复（seed + 开关均在才覆盖）+ 模式切换重擀钩子
  // （theme-mode.js setThemeMode 经 window.__monetReroll 零 import 触发，同 showSystemToast 惯例）
  rerollMonetIfEnabled(false);
  window.__monetReroll = () => rerollMonetIfEnabled(false);
  window.__monetTest = {
    get enabled() { return isMonetEnabled(); },
    get seed() { return getMonetSeed(); },
    apply: (seed) => applyMonetSeed(seed, false),
    setEnabled: (on) => setMonetEnabled(on, false),
  };
  // v10.42 #50：主题色自定义调试/e2e 钩子（与 __monetTest 同惯例）
  window.__themeColorTest = {
    get cfg() { return getCustomThemeColor(); },
    apply: (cfg) => applyCustomThemeColor(cfg, false),
    clear: () => clearCustomThemeColor(false),
    scheme: (cfg) => buildCustomScheme(cfg),
    parse: (text) => parseCommunityTheme(text),
  };
}

// ==================== v7.8：全屏页弹簧动画 + 边缘滑出交互式返回 ====================
// 形态：壁纸页是 page-like 全屏页（占满视口、无遮罩，滑出时透出下层——从设置进入
// 则透出设置应用，从桌面入口进入则透出桌面，v7.8.1）。进出动画全部
// 由弹簧驱动（与开窗动画同一套手感参数）。v7.9.1 起进出统一为横向页面语义
// （此前 v7.8 为触发点缩放进场，观感似"从上方弹出"，与页面身份不符）：
//   打开 —— 整页自右缘外弹簧滑入（curOpenParams：位移 vw+80 → 0）。
//   返回 —— 整页 1:1 跟手平移，反向 0.35 橡皮筋；松手位移过半或速度达标则弹簧滑出
//           提交，否则弹簧回弹（释放速度无缝接力）。
//   程序化关闭（Esc/上传）—— 向右弹簧滑出屏外，与进场镜像、同手势提交通道。
const RUBBER = 0.35;          // 越界橡皮筋阻尼
const VEL_CLAMP = 4000;       // 弹簧初速度限幅（防快速甩动发散）

const tpAnim = {
  loop: 0,            // rAF 句柄（进场/收尾共用一个驱动器）
  pos2: null,         // Spring2D —— 进场位移通道（v7.9.1：横向滑入）
  x: null,            // Spring   —— 平移轴（手势滑出/回弹/程序化关闭，独占写样式）
  dragging: false,
  dir: 1,             // 手势方向：+1 左缘右滑 / -1 右缘左滑
  cleanupTimer: 0,
  closeDone: null,    // 弹簧全部落位后的回调（提交关闭 / 回弹清样式）
};

function tpOverlay() { return document.getElementById('themePickerOverlay'); }
function tpCard() { return document.getElementById('themePickerCard'); }

function tpStopLoop() {
  if (tpAnim.loop) { cancelAnimationFrame(tpAnim.loop); tpAnim.loop = 0; }
}

/** 清理手势/动画内联样式与标记（open/close/手势收尾三路兜底） */
function resetTpGestureStyles() {
  tpStopLoop();
  tpAnim.pos2 = null;
  tpAnim.x = null;
  tpAnim.dragging = false;
  tpAnim.closeDone = null;
  const overlay = tpOverlay();
  const card = tpCard();
  if (card) {
    card.style.transition = '';
    card.style.willChange = '';
    card.style.transform = '';
  }
  if (overlay) {
    overlay.style.transition = '';
    overlay.style.willChange = '';
    overlay.style.opacity = '';
    delete overlay.dataset.gesturing;
  }
}

/** 统一 rAF 驱动器：每帧积分活动弹簧通道并组合写样式，全部落位后停帧并触发 closeDone */
function tpStartLoop() {
  tpStopLoop();
  const card = tpCard();
  if (!card) return;
  let last = performance.now();

  const step = (now) => {
    const dt = Math.min((now - last) / 1000, 1 / 30) || 1 / 60;
    last = now;
    let busy = false;
    let tx = 0, ty = 0, ts = 1;

    // 进场/退场位移通道
    if (tpAnim.pos2) {
      tpAnim.pos2.update(dt);
      tx = tpAnim.pos2.px;
      ty = tpAnim.pos2.py;
      const settled =
        Math.abs(tpAnim.pos2.x.v) < 20 && Math.abs(tpAnim.pos2.y.v) < 20 &&
        Math.abs(tx - tpAnim.pos2.x.target) < 0.5 && Math.abs(ty - tpAnim.pos2.y.target) < 0.5;
      if (settled) tpAnim.pos2 = null; else busy = true;
    }
    // 手势/程序化平移轴（独占样式写入权）
    let xExclusive = false;
    if (tpAnim.x) {
      tpAnim.x.update(dt);
      tx = tpAnim.x.x;
      ty = 0;
      ts = 1;
      xExclusive = true;
      const settled = Math.abs(tpAnim.x.v) < 20 && Math.abs(tx - tpAnim.x.target) < 0.5;
      if (settled) { tpAnim.x = null; xExclusive = false; tx = 0; }
      else busy = true;
    }

    if (tpAnim.pos2 || xExclusive) {
      card.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${ts.toFixed(4)})`;
    } else {
      // 全部落位：回到 CSS 常态（全屏位），再执行收尾回调
      card.style.transform = '';
      card.style.willChange = '';
      const done = tpAnim.closeDone;
      tpAnim.closeDone = null;
      if (done) done();
    }
    tpAnim.loop = (busy || tpAnim.closeDone) ? requestAnimationFrame(step) : 0;
  };
  tpAnim.loop = requestAnimationFrame(step);
}

/** 全屏页打开动画：整页自右缘外弹簧滑入（横向页面语义，v7.9.1）。
 *  srcRect 参数已退役（v7.8 缩放锚点），不再参与动画。 */
function tpOpenWithSpring() {
  const card = tpCard();
  if (!card) return;
  const vw = window.innerWidth;
  const params = curOpenParams();
  // 注意：Spring 构造器的 target 默认 = initialValue，必须显式 setTarget 才会真正运动
  tpAnim.pos2 = new Spring2D(params, vw + 80, 0, 0, 0);
  tpAnim.pos2.setTarget(0, 0, 0, 0);
  tpAnim.x = null;
  card.style.willChange = 'transform';
  // 首帧即落初始位（display 生效同帧，无闪烁）
  card.style.transform = `translate3d(${(vw + 80).toFixed(2)}px, 0, 0)`;
  tpStartLoop();
}

/** 程序化关闭动画：向右弹簧滑出屏外（与进场镜像，同手势提交 x 通道），落位后彻底回收 */
function closeThemePickerAnimated() {
  const overlay = tpOverlay();
  const card = tpCard();
  if (!overlay || !card || !overlay.classList.contains('active')) return;
  if (tpAnim.dragging || tpAnim.x) return; // 手势进行中不抢（其自会收尾）
  if (tpAnim.closeDone) return;            // v7.9：退场已在途，重复 Esc 不重建弹簧（防跳变）
  // v7.9：进场弹簧在途 → 快进定格全屏位再退场 —— 此前 Esc 在进场中被静默吞掉，
  // 用户需按第二次才生效；快进同时避免两套 transform 打架
  if (tpAnim.pos2) {
    tpStopLoop();
    tpAnim.pos2 = null;
    tpAnim.closeDone = null;
    card.style.transform = '';
    card.style.willChange = '';
  }
  overlay.style.transition = 'opacity 0.22s ease';
  overlay.style.opacity = '0';
  tpAnim.x = new Spring({ ...curCloseParams(), initialValue: 0 });
  tpAnim.x.setTarget(window.innerWidth + 80, null);
  tpAnim.closeDone = () => {
    closeThemePicker();
    overlay.style.transition = '';
    overlay.style.opacity = '';
  };
  tpStartLoop();
}

function initThemePickerGestureBridge() {
  window.__themePickerGesture = {
    /** 页面在场且空闲（无收尾弹簧）才可被边缘手势接管 */
    isActive: () => {
      const ov = tpOverlay();
      return !!(ov && ov.classList.contains('active') && !tpAnim.dragging && !tpAnim.x);
    },
    /** 手势开始：dir=+1 左缘右滑（页面向右滑出），-1 右缘左滑 */
    begin(dir) {
      const overlay = tpOverlay();
      const card = tpCard();
      if (!overlay || !card || !overlay.classList.contains('active')) return;
      // 进场动画未落位 → 快进定格（罕见时序；避免两套 transform 打架）
      if (tpAnim.pos2) {
        tpStopLoop();
        tpAnim.pos2 = null;
        card.style.transform = '';
        card.style.willChange = '';
      }
      clearTimeout(tpAnim.cleanupTimer);
      tpAnim.dragging = true;
      tpAnim.dir = dir >= 0 ? 1 : -1;
      card.style.willChange = 'transform';
      overlay.dataset.gesturing = '1'; // 松手 click 穿透防御（拖拽后误触页面内容）
      tpAnim.cleanupTimer = setTimeout(() => { delete tpOverlay()?.dataset.gesturing; }, 1200);
    },
    /** 跟手：dx=提交方向投影位移（≥0 朝提交方向）。提交方向 1:1，反向 RUBBER 橡皮筋 */
    progress(dx) {
      if (!tpAnim.dragging) return;
      const card = tpCard();
      if (!card) return;
      const tx = (dx > 0 ? dx : dx * RUBBER) * tpAnim.dir;
      card.style.transform = `translate3d(${tx.toFixed(2)}px, 0, 0)`;
    },
    /** 提交：从当前位移续弹簧滑出到屏外 → 彻底关闭。v=提交方向投影释放速度(px/s) */
    commit(v) {
      if (!tpAnim.dragging) return;
      tpAnim.dragging = false;
      const card = tpCard();
      if (!card) return;
      const m = /translate3d\(([-\d.]+)px/.exec(card.style.transform || '');
      const startX = m ? parseFloat(m[1]) : 0;
      const vw = window.innerWidth;
      tpAnim.x = new Spring({
        ...curCloseParams(),
        initialValue: startX,
        initialVelocity: Math.max(-VEL_CLAMP, Math.min(VEL_CLAMP, (v || 0) * tpAnim.dir)),
      });
      tpAnim.x.setTarget(tpAnim.dir * (vw + 80), null);
      tpAnim.closeDone = () => closeThemePicker();
      tpStartLoop();
    },
    /** 取消：从当前位移续弹簧回弹归位。v=提交方向投影释放速度(px/s) */
    cancel(v) {
      if (!tpAnim.dragging) return;
      tpAnim.dragging = false;
      const card = tpCard();
      if (!card) return;
      const m = /translate3d\(([-\d.]+)px/.exec(card.style.transform || '');
      const startX = m ? parseFloat(m[1]) : 0;
      tpAnim.x = new Spring({
        ...curCloseParams(),
        initialValue: startX,
        initialVelocity: Math.max(-VEL_CLAMP, Math.min(VEL_CLAMP, (v || 0) * tpAnim.dir)),
      });
      tpAnim.x.setTarget(0, null);
      // 回弹落位立即清 gesturing（防误触拦截只应覆盖手势收尾瞬间，不拖到兜底定时器）
      tpAnim.closeDone = () => { const ov = tpOverlay(); if (ov) delete ov.dataset.gesturing; };
      tpStartLoop();
    },
  };
}

function createThemePickerModalDOM() {
  let overlay = document.getElementById('themePickerOverlay');
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.id = 'themePickerOverlay';
  overlay.className = 'theme-picker-overlay';
  overlay.innerHTML = `
    <div class="theme-picker-card" id="themePickerCard">
      <div class="theme-picker-header">
        <div class="theme-picker-title" id="themePickerTitle">${ICONS.image} 壁纸与动态壁纸</div>
        <span class="theme-picker-header-space"></span>
      </div>

      <!-- 单层页面：所有设置一屏直达；返回 = 边缘滑出（整页跟手，透出桌面）或 Esc -->
      <div class="theme-body" id="themeWallpaperView">
        <!-- 当前壁纸状态行（实时缩略图 + 摘要，不可点击） -->
        <div class="theme-section">
          <div class="theme-nav-row static" id="themeWallpaperNav">
            <div class="theme-nav-preview" id="themeNavWallpaperThumb"></div>
            <div class="theme-nav-texts">
              <div class="theme-nav-title">当前壁纸</div>
              <div class="theme-nav-sub" id="themeNavWallpaperSub">静态 / 动态 / 视频</div>
            </div>
          </div>
        </div>

        <!-- 外观模式：跟随系统 / 浅色 / 深色 -->
        <div class="theme-section theme-mode-section">
          <div class="theme-section-label">外观模式</div>
          <div class="theme-mode-row" id="themeModeRow">
            <div class="theme-mode-opt" data-mode="auto">跟随系统</div>
            <div class="theme-mode-opt" data-mode="light">浅色</div>
            <div class="theme-mode-opt" data-mode="dark">深色</div>
          </div>
        </div>

        <!-- 程序化动态壁纸（大卡位） -->
        <div class="theme-section">
          <div class="theme-section-label">程序化动态壁纸<span class="theme-live-badge">实时渲染 · 高清</span></div>
          <div class="proc-grid" id="themeDynamicGrid"></div>
          <div class="theme-section-hint">代码实时绘制，不占存储空间；动态壁纸与静态/视频壁纸二选一，后选者优先</div>
        </div>

        <!-- 静态壁纸精选库 -->
        <div class="theme-section">
          <div class="theme-section-label">静态壁纸 · 精选库</div>
          <div class="theme-wallpapers-grid compact" id="themeWallpapersGrid"></div>
        </div>

        <!-- 自定义上传（静态/动态自动识别） -->
        <div class="theme-section">
          <div class="theme-section-label">自定义壁纸</div>
          <button class="theme-upload-zone" id="themeUploadAnyBtn">
            ${ICONS.folder}
            <span class="theme-upload-zone-texts">
              <span class="theme-upload-zone-title">上传图片 / 视频</span>
              <span class="theme-upload-zone-sub">自动识别：图片 → 静态壁纸，视频 → 动态壁纸</span>
            </span>
          </button>
          <div class="theme-section-hint">支持 JPG / PNG / WebP 图片与 MP4 / WebM 视频，视频上限 200MB；上传视频后会自动提取画面主题色联动全局配色</div>
        </div>
      </div>
    </div>
  `;

  // v7.8：全屏页无「点遮罩关闭」语义（页面即遮罩）；手势进行中/收尾瞬间的 click
  // 捕获拦截，防松手误触页面内容（如误选壁纸卡片）
  overlay.addEventListener('click', (e) => {
    if (overlay.dataset.gesturing === '1') { e.stopPropagation(); e.preventDefault(); }
  }, true);

  document.body.appendChild(overlay);

  document.getElementById('themeUploadAnyBtn').addEventListener('click', () => {
    triggerWallpaperSelect(); // 统一上传入口：图片/视频自动识别
    closeThemePickerAnimated(); // v7.9.1：横向滑出，与进场镜像
  });

  // 外观模式分段控件
  const modeRow = document.getElementById('themeModeRow');
  if (modeRow) {
    modeRow.querySelectorAll('.theme-mode-opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        setThemeMode(opt.dataset.mode);
        syncThemeModeRow();
      });
    });
  }

  renderThemeModeRow();
  // fix(v7.37 全量审计)：挂载期不再渲染动态壁纸缩略图 —— overlay 未打开时用户
  // 看不见，而三张缩略图同步绘制+编码实测可阻塞主线程数百毫秒~秒级（取证实锤：
  // 启动期 1046ms longtask 的主因）。打开路径 openThemePickerAnimated 内已有
  // renderDynamicWallpapers() 兜底渲染；挂载期仅保留轻量的模式行同步。
  renderPresetWallpapers();
}

// ==================== 壁纸页面（单层，无二级导航） ====================
// 结构说明：壁纸设置自初版起即按「单页直达」设计——打开即壁纸页，所有选项一屏
// 铺开，返回键一键彻底关闭，不做多级导航。这是第 1 版设计时的直接选择，并非对
// 某个旧版二页结构的"纠偏"（不存在这样的演进史）。调色板未纳入本页是产品取舍：
// 壁纸卡片自带主题色联动（选壁纸即联动全局配色），独立调色板与之功能重叠。

/** 状态行摘要：当前壁纸类型一目了然 */
function updateWallpaperNavSummary() {
  const el = document.getElementById('themeNavWallpaperSub');
  if (!el) return;
  let text = '静态 / 动态 / 视频';
  try {
    if (window.__videoWallpaper && window.__videoWallpaper.isVideoActive()) {
      text = '当前使用：视频动态壁纸';
    } else {
      const procId = getActiveProceduralId();
      if (procId) {
        const preset = PROCEDURAL_PRESETS.find(p => p.id === procId);
        text = `当前使用：${preset ? preset.name : '程序化'}动态壁纸`;
      } else {
        const custom = localStorage.getItem('ios-desktop:wallpaper') || '';
        text = custom ? '当前使用：自定义 / 预设静态壁纸' : '静态 / 动态 / 视频';
      }
    }
  } catch (e) {}
  el.textContent = text;
}

/** 导航行缩略图：桌面当前壁纸的实时预览 */
function updateWallpaperNavThumb() {
  const thumb = document.getElementById('themeNavWallpaperThumb');
  if (!thumb) return;
  let url = '';
  try {
    if (window.__videoWallpaper && window.__videoWallpaper.isVideoActive()) {
      url = window.__videoWallpaper.getVideoFrameDataURL() || '';
    } else if (getActiveProceduralId()) {
      url = getProceduralSnapshotURL() || '';
    } else {
      const bg = document.getElementById('desktop')?.style.backgroundImage || '';
      const m = bg.match(/url\(["']?(.+?)["']?\)/);
      url = m ? m[1] : '';
    }
  } catch (e) {}
  thumb.style.backgroundImage = url ? `url('${url}')` : 'none';
  thumb.classList.toggle('empty', !url);
}
// 导出给 openThemePicker 刷新用
function syncWallpaperNav() {
  updateWallpaperNavSummary();
  updateWallpaperNavThumb();
}

/** 外观模式分段控件高亮同步 */
function syncThemeModeRow() {
  const row = document.getElementById('themeModeRow');
  if (!row) return;
  const pref = getThemeModePref();
  row.querySelectorAll('.theme-mode-opt').forEach((opt) => {
    opt.classList.toggle('active', opt.dataset.mode === pref);
  });
}
function renderThemeModeRow() { syncThemeModeRow(); }

/** 动态壁纸大卡位：缩略图用同一套绘制代码生成，与真实画面一致；首张占满整行 */
function renderDynamicWallpapers() {
  const container = document.getElementById('themeDynamicGrid');
  if (!container) return;

  const activeId = getActiveProceduralId();
  container.innerHTML = PROCEDURAL_PRESETS.map((p, i) => `
    <div class="wallpaper-thumb-card proc-card ${i === 0 ? 'proc-hero' : ''} ${p.id === activeId ? 'active' : ''}" data-proc="${p.id}">
      <div class="wallpaper-thumb-img" style="background-image: url('${renderProceduralThumbnail(p.id)}');"></div>
      <span class="proc-live-badge">LIVE</span>
      <span class="wallpaper-thumb-name">${p.name}</span>
    </div>
  `).join('');

  container.querySelectorAll('[data-proc]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.proc;
      const preset = PROCEDURAL_PRESETS.find(x => x.id === id);
      if (!preset) return;

      // 动态壁纸与静态/视频壁纸互斥，清掉其他记录，保证后选者优先
      clearCustomWallpaper();
      clearVideoWallpaper();
      try { localStorage.removeItem('ios-desktop:wallpaper'); sessionStorage.removeItem('ios-desktop:wallpaper'); } catch (e) {}

      applyProceduralWallpaper(id);
      applyThemeHue(preset.hue, false);
      updateWallpaperNavSummary();

      container.querySelectorAll('[data-proc]').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });
}

function renderPresetWallpapers() {
  const container = document.getElementById('themeWallpapersGrid');
  if (!container) return;

  container.innerHTML = PRESET_WALLPAPERS.map((w, idx) => `
    <div class="wallpaper-thumb-card" data-idx="${idx}">
      <div class="wallpaper-thumb-img" style="background-image: url('${w.url}');"></div>
      <span class="wallpaper-thumb-name">${w.name}</span>
    </div>
  `).join('');

  container.querySelectorAll('.wallpaper-thumb-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.idx, 10);
      const w = PRESET_WALLPAPERS[idx];
      if (!w) return;

      // 选预设壁纸时清掉自定义/动态/视频壁纸记录，保证下次启动预设优先生效
      clearCustomWallpaper();
      clearProceduralWallpaper();
      clearVideoWallpaper();
      // fix(audit-C #2): 预设壁纸不携带调色板 —— 作废旧自定义壁纸的调色板持久化，
      // 避免重启后 applySavedTheme 把旧壁纸的 primary/secondary/tertiary 叠加到新壁纸
      clearSavedPalette();
      // 同步面板高亮：静态生效 → 动态卡位与上传区取消高亮
      try {
        document.getElementById('themeUploadAnyBtn')?.classList.remove('active');
        container.querySelectorAll('[data-proc]').forEach(c => c.classList.remove('active'));
      } catch (e) {}

      dom.desktop.style.backgroundImage = `url('${w.url}')`;
      try { localStorage.setItem('ios-desktop:wallpaper', w.url); } catch (e) {}
      applyThemeHue(w.hue, true);

      document.querySelectorAll('iframe').forEach(iframe => {
        try {
          iframe.contentWindow.postMessage({ type: 'set-wallpaper', url: w.url }, '*');
        } catch (e) {}
      });

      if (window.showSystemToast) window.showSystemToast(`已应用壁纸与主题色: ${w.name}`, ICONS.palette);
      updateWallpaperNavSummary();
    });
  });
}

/** 应用并广播主题色（v7.26：携带外观模式 —— 宿主 inline 令牌与 iframe 注入均按当前模式取公式） */
export function applyThemeHue(hue, showToast = true) {
  currentThemeHue = hue;
  const mode = getResolvedTheme() === 'light' ? 'light' : 'dark';
  const light = mode === 'light';
  const root = document.documentElement;
  root.style.setProperty('--md-h', hue);
  root.style.setProperty('--h', hue);
  root.style.setProperty('--md-primary', `hsl(${hue}, ${light ? '78%, 38%' : '82%, 36%'})`);
  root.style.setProperty('--md-on-primary', '#ffffff');
  root.style.setProperty('--md-primary-container', `hsl(${hue}, ${light ? '88%, 90%' : '85%, 22%'})`);
  root.style.setProperty('--md-on-primary-container', light ? `hsl(${hue}, 60%, 16%)` : `hsl(${hue}, 92%, 92%)`);
  root.style.setProperty('--md-secondary', `hsl(${hue}, ${light ? '32%, 38%' : '28%, 46%'})`);
  // fix(audit-C #3): 复位 palette 覆盖型令牌 —— applyPaletteToDocument/applyVideoPalette 会
  // 内联写入 --md-tertiary（primary/secondary 本函数已有覆盖），缺此行时会话内切壁纸后
  // tertiary 系 UI 残留旧壁纸色；取值与 generateMD3CssTokens 的令牌派生式保持一致
  root.style.setProperty('--md-tertiary', `hsl(${(hue + 60) % 360}, 65%, 40%)`);
  root.style.setProperty('--md-surface', `hsl(${hue}, ${light ? '40%, 98%' : '18%, 8%'})`);
  root.style.setProperty('--md-surface-container', `hsl(${hue}, ${light ? '32%, 93%' : '16%, 14%'})`);
  root.style.setProperty('--md-accent', `hsl(${hue}, ${light ? '85%, 40%' : '92%, 68%'})`);
  root.style.setProperty('--md-outline-variant', `hsl(${hue}, ${light ? '18%, 82%' : '12%, 24%'})`);

  try { localStorage.setItem('ios-desktop:theme-hue', String(hue)); } catch (e) {}

  // 广播到所有已加载的 iframe（v7.26：注入样式按模式取公式 + data-theme-mode
  // 直写（与 --md-h 同款双保险，重载窗口内也不丢）+ 消息携带 mode）
  document.querySelectorAll('iframe').forEach(iframe => {
    try {
      const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      if (doc && doc.head) {
        let styleTag = doc.getElementById('md3-dynamic-injected-theme');
        if (!styleTag) {
          styleTag = doc.createElement('style');
          styleTag.id = 'md3-dynamic-injected-theme';
          doc.head.appendChild(styleTag);
        }
        styleTag.textContent = generateMD3InjectedStylesheet(hue, mode);
      }
      // fix(v7.25)：html inline 直写 —— iframe 重载窗口内（如壁纸全屏页引发的应用重载），
      // postMessage 可能在注入 SDK 的消息 handler 注册前到达而丢失，inline 会卡在旧色相；
      // DOM 直写不受消息时序影响，与消息路径（注入 SDK handler 同款双变量写入）双保险
      if (doc && doc.documentElement) {
        doc.documentElement.style.setProperty('--md-h', hue);
        doc.documentElement.style.setProperty('--h', hue);
      }
      if (doc && doc.documentElement) {
        doc.documentElement.dataset.themeMode = mode;
      }
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'set-theme-hue', hue, mode }, '*');
      }
    } catch (e) {}
  });

  if (showToast && window.showSystemToast) {
    window.showSystemToast(`已应用 Material You 主题色 (色相 ${hue}°)`, ICONS.auto_awesome);
  }

  // v9.94 #33：Monet 覆盖层重擀（hsl 派生先写，Monet tonal 覆盖后写赢；关闭时零操作）
  rerollMonetIfEnabled(false);
}

// ==================== v9.94 #33：Monet 动态取色覆盖层 ====================
// AOSP 对标：SystemUI WallpaperColors → monеt ColorScheme → TonalPalette → tone 映射
// （packages/SystemUI/src/com/android/systemui/monet/ColorScheme.java），
// Material You 壁纸一键换主题。存储：seed（ARGB 十进制串）+ 开关；算法与变量派生
// 全部下沉 js/aosp/monet.js 纯逻辑（零 DOM 可单测）。

const MONET_SEED_KEY = 'ios-desktop:monet-seed';
const MONET_ON_KEY = 'ios-desktop:monet-enabled';

/** Monet 开关当前态（#168 收口 v9.94：键不存在默认开——AOSP Material You 出厂语义，
 *  Android 12+ 动态取色即出厂行为；显式 '0' = 用户关闭尊重持久化；'1' 开。
 *  预设壁纸为 CSS 渐变无像素可提 → seed null → reroll early return → hsl 主链诚实降级
 *  （等同视觉不变），上传/换源壁纸取到 seed 的瞬间起全站 tonal 覆盖——#168 目标
 *  「generateMD3CssTokens 消费 TonalPalette」在默认态完整成立） */
export function isMonetEnabled() {
  try {
    const v = localStorage.getItem(MONET_ON_KEY);
    return v === null ? true : v === '1';
  } catch (e) { return true; }
}

/** 当前 seed（ARGB 十进制串；无则 null） */
export function getMonetSeed() {
  try {
    const v = localStorage.getItem(MONET_SEED_KEY);
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch (e) { return null; }
}

function setMonetSeed(seed) {
  try { localStorage.setItem(MONET_SEED_KEY, String(seed)); } catch (e) {}
}

/** Monet 写过的变量键（清除/重擀共用） */
const MONET_VAR_KEYS = [
  'md-primary', 'md-on-primary', 'md-primary-container', 'md-on-primary-container',
  'md-secondary', 'md-on-secondary', 'md-secondary-container', 'md-on-secondary-container',
  'md-tertiary', 'md-on-tertiary', 'md-tertiary-container', 'md-on-tertiary-container',
  'md-surface', 'md-surface-container', 'md-surface-container-high',
  'md-on-surface', 'md-on-surface-variant', 'md-outline', 'md-outline-variant',
  'md-accent', 'monet-seed-hue',
];

function writeMonetVars(vars) {
  // html 与 body 双层 inline：body.light-theme 的 CSS 规则重定义 --md-* 时，
  // body 上的 inline 变量继承就近胜出（与 theme-mode.css 浅色块共存）
  const root = document.documentElement;
  const body = document.body;
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
    if (body) body.style.setProperty(k, v);
  }
  // iframe 同步：直写 html/body style（--md-* 变量内联即生效，零 SDK 改动）
  // + postMessage 广播（子应用未来可订阅；与 --md-h 双保险同惯例）
  document.querySelectorAll('iframe').forEach((iframe) => {
    try {
      const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      if (!doc || !doc.documentElement) return;
      for (const [k, v] of Object.entries(vars)) {
        doc.documentElement.style.setProperty(k, v);
        if (doc.body) doc.body.style.setProperty(k, v);
      }
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'set-monet-vars', vars }, '*');
      }
    } catch (e) {}
  });
}

function clearMonetVars() {
  const root = document.documentElement;
  const body = document.body;
  for (const key of MONET_VAR_KEYS) {
    root.style.removeProperty(`--${key}`);
    if (body) body.style.removeProperty(`--${key}`);
  }
  document.querySelectorAll('iframe').forEach((iframe) => {
    try {
      const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
      if (!doc || !doc.documentElement) return;
      for (const key of MONET_VAR_KEYS) {
        doc.documentElement.style.removeProperty(`--${key}`);
        if (doc.body) doc.body.style.removeProperty(`--${key}`);
      }
    } catch (e) {}
  });
}

// ==================== v10.42 #50：ColorBlendr 式主题色自定义 ====================
// ColorBlendr（GPL-3.0，master 2026-11-04 实拉）语义：手动配色为壁纸取色之上的
// 手动覆盖层（WallpaperColorUtil 默认 / 用户配色覆盖）；存储为单 JSON 配置。

const THEME_COLOR_CUSTOM_KEY = 'ios-desktop:theme-color-custom';

/** 当前自定义配色配置（JSON 反序列化；无/坏 → null） */
export function getCustomThemeColor() {
  try {
    const raw = localStorage.getItem(THEME_COLOR_CUSTOM_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : null;
  } catch (e) { return null; }
}

/** 应用自定义配色：持久化 + 重擀（scheme 构建失败时存储保留，UI 层负责输入校验） */
export function applyCustomThemeColor(cfg, showToast = true) {
  try { localStorage.setItem(THEME_COLOR_CUSTOM_KEY, JSON.stringify(cfg)); } catch (e) {}
  rerollMonetIfEnabled(showToast);
}

/** 清除自定义覆盖层：回壁纸取色默认链（ColorBlendr「重置为壁纸颜色」同语义）。
 *  壁纸 seed 亦不在场时 reroll early return 不清 vars → Monet 残留，须同
 *  setMonetEnabled(false) 回填：clearMonetVars + applyThemeHue（hsl 派生全量）。 */
export function clearCustomThemeColor(showToast = true) {
  try { localStorage.removeItem(THEME_COLOR_CUSTOM_KEY); } catch (e) {}
  rerollMonetIfEnabled(showToast);
  if (!getMonetSeed()) {
    clearMonetVars();
    applyThemeHue(currentThemeHue, false);
  }
}

/** Monet 开且已有自定义配色或 seed → 重算 vars 覆盖（换壁纸/换模式/换色相后由
 *  applyThemeHue 统一触发）。v10.42 #50 优先级：自定义配色覆盖层 > 壁纸取色
 *  （ColorBlendr 手动配色语义：MONET_SEED_COLOR 显式覆盖 WALLPAPER_COLOR_LIST）。 */
function rerollMonetIfEnabled(showToast = false) {
  if (!isMonetEnabled()) return;
  const mode = getResolvedTheme() === 'light' ? 'light' : 'dark';
  // #50：自定义配色启用 → buildCustomScheme（theme-color.js 纯逻辑）→ 同链写 vars
  const custom = getCustomThemeColor();
  if (custom && custom.enabled) {
    const cscheme = buildCustomScheme(custom);
    if (cscheme) {
      writeMonetVars(schemeToCssVars(cscheme, mode));
      if (showToast && window.showSystemToast) {
        window.showSystemToast(`自定义配色已应用（${custom.seed || ''} · ${cscheme.style}）`, ICONS.palette);
      }
      return;
    }
  }
  const seed = getMonetSeed();
  if (seed == null) return;
  const scheme = createColorScheme(seed);
  writeMonetVars(schemeToCssVars(scheme, mode));
  if (showToast && window.showSystemToast) {
    window.showSystemToast(`Material You 取色已应用（seed ${argbToHex(seed)}）`, ICONS.auto_awesome);
  }
}

/**
 * 壁纸取色回调入口：记录 seed（无论开关——下次开启即时生效），开关开时立即覆盖。
 * @param {number} seed ARGB
 * @param {boolean} [showToast=false]
 */
export function applyMonetSeed(seed, showToast = false) {
  if (!Number.isFinite(seed)) return;
  setMonetSeed(seed);
  rerollMonetIfEnabled(showToast);
}

/** 设置页开关：开 → 立即覆盖；关 → 清覆盖并回滚 hsl 派生 */
export function setMonetEnabled(on, showToast = true) {
  try { localStorage.setItem(MONET_ON_KEY, on ? '1' : '0'); } catch (e) {}
  if (on) {
    rerollMonetIfEnabled(showToast);
  } else {
    clearMonetVars();
    applyThemeHue(currentThemeHue, false); // hsl 派生全量回填（含 iframe 广播）
  }
}

/**
 * v7.8：打开壁纸全屏页；v7.8.1：不再收场前台应用（设置应用保持在场）
 *       v7.9.1：进场改为整页自右缘滑入（横向页面语义）
 * @param {DOMRect|null} [_srcRect] 未使用（v7.8 缩放锚点已退役，保留参数兼容旧调用方）
 * 行为：幂等守卫（已打开直接返回，快速重复触发不重启动画）→ 弹簧横向滑入。
 * 页面（z 750）盖于前台应用窗口（z 520）之上：从设置进入则滑出返回透出设置应用，
 * 从桌面入口（搜索/右键菜单）进入则透出桌面；前台应用生命周期不受开关影响。
 */
/**
 * 初始化设置应用内的二级壁纸页面（统一标准预览式返回页面）
 */
export function initWallpaperPage(container) {
  if (!container) return;
  container.innerHTML = `
    <div style="padding:16px 0;">
      <!-- v8.08 #23 差距矩阵⑥ AOSP 来源区：wallpaper_settings.xml 为空壳 PreferenceScreen
           （key=wallpaper_type，title=wallpaper_settings_fragment_title「选择壁纸来源」，零子项），
           WallpaperTypePreferenceController.onStart → populateWallpaperTypes() 以
           Intent.ACTION_SET_WALLPAPER 查询（MATCH_DEFAULT_ONLY）动态填充活动行
           （key=packageName / title=活动 label / icon=活动图标 / 点击跳出）。
           Web 侧解析命中唯一内建选择器「壁纸和样式」；AOSP 行点击跳出 Picker 应用，
           Web 行内滚动直达下方内嵌选择器（铁律#2 合法超越：功能内嵌不跳失）。 -->
      <div class="theme-section" style="margin-bottom:16px;" data-test="wallpaper-source-section">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">壁纸来源</div>
        <div style="background:var(--md-surface-container,#232529);border-radius:16px;overflow:hidden;">
          <div class="md3-list-item" id="setWallpaperSourceRow" data-test="wallpaper-source-row" role="button" tabindex="0" style="cursor:pointer;">
            <span class="md3-list-item-text">
              壁纸和样式
              <span style="display:block;font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">
                主屏幕、锁定屏幕
              </span>
            </span>
            <span style="width:36px;height:36px;flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--md-on-surface-variant,#9a9b9e);">${AOSP_ICONS.appsChevron || ''}</span>
          </div>
        </div>
        <div class="theme-section-hint" data-test="wallpaper-note" style="font-size:11px;color:var(--md-on-surface-variant);margin:6px 4px 0;opacity:0.8;line-height:1.6;">
          AOSP 此页为空壳清单（wallpaper_settings.xml 零子项），运行时由 WallpaperTypePreferenceController
          枚举 ACTION_SET_WALLPAPER 活动动态填充（populateWallpaperTypes / MATCH_DEFAULT_ONLY）；
          本机解析结果：内建「壁纸和样式」选择器 1 项——点击行内直达（桌面端无应用跳转语义，合法超越）。
        </div>
      </div>

      <!-- 当前壁纸状态行 -->
      <div class="theme-section" style="margin-bottom:16px;">
        <div class="theme-nav-row static" id="setNavWallpaperRow" style="display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--md-surface-container,#232529);border-radius:18px;">
          <div class="theme-nav-preview" id="setNavWallpaperThumb" style="width:54px;height:72px;border-radius:10px;background-size:cover;background-position:center;border:1px solid var(--md-outline-variant,rgba(255,255,255,0.12));flex:none;"></div>
          <div class="theme-nav-texts" style="flex:1;">
            <div class="theme-nav-title" style="font-size:15px;font-weight:600;color:var(--md-on-surface);">当前壁纸</div>
            <div class="theme-nav-sub" id="setNavWallpaperSub" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;">静态 / 动态 / 视频</div>
          </div>
        </div>
      </div>

      <!-- 外观模式 -->
      <div class="theme-section theme-mode-section" style="margin-bottom:20px;">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">外观模式</div>
        <div class="theme-mode-row" id="setThemeModeRow" style="display:flex;gap:8px;background:var(--md-surface-container,#232529);padding:4px;border-radius:14px;">
          <div class="theme-mode-opt" data-mode="auto" style="flex:1;text-align:center;padding:10px 0;font-size:13px;font-weight:500;border-radius:10px;cursor:pointer;color:var(--md-on-surface-variant);">跟随系统</div>
          <div class="theme-mode-opt" data-mode="light" style="flex:1;text-align:center;padding:10px 0;font-size:13px;font-weight:500;border-radius:10px;cursor:pointer;color:var(--md-on-surface-variant);">浅色</div>
          <div class="theme-mode-opt" data-mode="dark" style="flex:1;text-align:center;padding:10px 0;font-size:13px;font-weight:500;border-radius:10px;cursor:pointer;color:var(--md-on-surface-variant);">深色</div>
        </div>
      </div>

      <!-- v7.81 壁纸实时模糊（全局开关） -->
      <div class="theme-section" style="margin-bottom:20px;">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">壁纸实时模糊</div>
        <div style="background:var(--md-surface-container,#232529);border-radius:16px;overflow:hidden;">
          <div class="md3-list-item" style="cursor:default;">
            <span class="md3-list-item-text">
              全局实时模糊
              <span style="display:block;font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;line-height:1.5;">
                下拉通知/控制中心时壁纸跟手渐进模糊，视频壁纸逐帧实时跟随；应用开合毛玻璃同受此开关控制
              </span>
            </span>
            <label class="md3-switch"><input type="checkbox" id="setWallpaperBlurSwitch" aria-label="壁纸实时模糊"><span class="slider"><span class="thumb"></span></span></label>
          </div>
        </div>
        <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:6px 4px 0;opacity:0.8;">
          关闭后全系统停用壁纸模糊（实时模糊层不再绘制，性能敏感设备推荐关闭）
        </div>
      </div>

      <!-- v9.94 #33 Monet 动态取色（AOSP SystemUI monеt ColorScheme / Material You） -->
      <div class="theme-section" style="margin-bottom:20px;" data-test="monet-section">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">动态取色</div>
        <div style="background:var(--md-surface-container,#232529);border-radius:18px;padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">壁纸取色主题</div>
              <div id="setMonetSub" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;">从壁纸提取调色板，全系统 UI 跟随（Material You）</div>
            </div>
            <label class="md3-switch"><input type="checkbox" id="setMonetSwitch" data-test="monet-switch" aria-label="Monet 动态取色"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div id="setMonetSwatches" data-test="monet-swatches" style="display:flex;gap:6px;margin-top:12px;"></div>
          <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:8px 4px 0;opacity:0.8;line-height:1.6;">
            AOSP 对标 WallpaperColors → monеt ColorScheme（accent1/2/3 + neutral1/2 五调色板）→
            MD3 tone 映射；CAM16/HCT 色彩空间与 SystemUI monеt 同构。提色仅换壁纸时运行（确定性：同图同色板）。
          </div>
        </div>
      </div>

      <!-- v10.42 #50 ColorBlendr 式主题色自定义（手动配色覆盖层，优先于壁纸取色） -->
      <div class="theme-section" style="margin-bottom:20px;" data-test="theme-color-section">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">主题色</div>
        <div style="background:var(--md-surface-container,#232529);border-radius:18px;padding:14px 16px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">自定义配色</div>
              <div id="setThemeColorSub" data-test="theme-color-sub" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;">手动配色覆盖 Material You 取色（ColorBlendr 式）</div>
            </div>
            <label class="md3-switch"><input type="checkbox" id="setThemeColorSwitch" data-test="theme-color-switch" aria-label="自定义配色"><span class="slider"><span class="thumb"></span></span></label>
          </div>
          <div id="setThemeColorPresets" data-test="theme-color-presets" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;"></div>
          <div id="setThemeColorStyles" data-test="theme-color-styles" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;"></div>
          <div style="margin-top:14px;">
            <div style="font-size:12px;font-weight:600;color:var(--md-on-surface);">双端混色</div>
            <div style="display:flex;gap:10px;align-items:center;margin-top:8px;">
              <input type="color" id="setThemeColorBlendA" value="#0B57D0" aria-label="端色 A" style="width:36px;height:36px;border:none;border-radius:8px;background:none;cursor:pointer;padding:0;">
              <span style="font-size:12px;color:var(--md-on-surface-variant);">→</span>
              <input type="color" id="setThemeColorBlendB" value="#984061" aria-label="端色 B" style="width:36px;height:36px;border:none;border-radius:8px;background:none;cursor:pointer;padding:0;">
              <button id="setThemeColorBlendApply" data-test="theme-color-blend-apply" style="margin-left:auto;padding:7px 14px;border-radius:999px;border:1px solid var(--md-outline-variant,rgba(255,255,255,0.2));background:transparent;color:var(--md-on-surface);font-size:13px;cursor:pointer;">用中点色</button>
            </div>
            <div id="setThemeColorBlendStrip" data-test="theme-color-blend-strip" style="display:flex;height:18px;border-radius:6px;overflow:hidden;margin-top:8px;"></div>
          </div>
          <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px;">
            <label style="font-size:12px;color:var(--md-on-surface-variant);display:flex;align-items:center;gap:10px;">主色饱和<input type="range" id="setThemeColorAccentSat" data-test="tc-slider-accent-sat" min="0" max="200" step="1" value="100" style="flex:1;accent-color:var(--md-primary);"></label>
            <label style="font-size:12px;color:var(--md-on-surface-variant);display:flex;align-items:center;gap:10px;">背景饱和<input type="range" id="setThemeColorBgSat" data-test="tc-slider-bg-sat" min="0" max="200" step="1" value="100" style="flex:1;accent-color:var(--md-primary);"></label>
            <label style="font-size:12px;color:var(--md-on-surface-variant);display:flex;align-items:center;gap:10px;">背景明度<input type="range" id="setThemeColorBgLight" data-test="tc-slider-bg-light" min="0" max="200" step="1" value="100" style="flex:1;accent-color:var(--md-primary);"></label>
            <label style="font-size:12px;color:var(--md-on-surface-variant);display:flex;align-items:center;gap:10px;">对比度<input type="range" id="setThemeColorContrast" data-test="tc-slider-contrast" min="-100" max="100" step="1" value="0" style="flex:1;accent-color:var(--md-primary);"></label>
          </div>
          <input type="file" id="setThemeColorImport" accept=".json,application/json" hidden data-test="theme-color-import">
          <div style="display:flex;gap:8px;margin-top:14px;">
            <button id="setThemeColorImportBtn" data-test="theme-color-import-btn" style="flex:1;padding:10px 12px;border-radius:12px;border:1px solid var(--md-outline-variant,rgba(255,255,255,0.2));background:var(--md-surface-container-high,#2f3136);color:var(--md-on-surface);font-size:13px;cursor:pointer;">导入社区主题 .json</button>
            <button id="setThemeColorResetBtn" data-test="theme-color-reset-btn" style="flex:1;padding:10px 12px;border-radius:12px;border:1px solid var(--md-outline-variant,rgba(255,255,255,0.2));background:transparent;color:var(--md-on-surface);font-size:13px;cursor:pointer;">重置为壁纸取色</button>
          </div>
          <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:8px 4px 0;opacity:0.8;line-height:1.6;">
            ColorBlendr（GPL-3.0）语义移植：预设八色 / MONET 十风格（≈ 为 web 近似档）/ 双端 HCT 混色 /
            三滑杆（0-200，100 原样）/ 对比度。自定义配色启用时优先于壁纸取色；社区主题 .json 严格
            codec 校验（非法输入拒绝，schemaVersion 1/2 兼容）。
          </div>
        </div>
      </div>

      <!-- 程序化动态壁纸 -->
      <div class="theme-section" style="margin-bottom:20px;">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;display:flex;align-items:center;justify-content:space-between;">
          <span>程序化动态壁纸</span>
          <span class="theme-live-badge" style="font-size:10px;padding:2px 6px;border-radius:6px;background:hsl(var(--md-h,215) 80% 55% / 0.18);color:hsl(var(--md-h,215) 85% 65%);">实时渲染 · 高清</span>
        </div>
        <div class="proc-grid" id="setDynamicGrid" style="display:grid;grid-template-columns:repeat(2, 1fr);gap:10px;"></div>
        <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:6px 4px 0;opacity:0.8;">代码实时绘制，不占存储空间；动态壁纸与静态/视频壁纸二选一</div>
      </div>

      <!-- 静态壁纸精选库 -->
      <div class="theme-section" style="margin-bottom:20px;">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">静态壁纸 · 精选库</div>
        <div class="theme-wallpapers-grid compact" id="setWallpapersGrid" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;"></div>
      </div>

      <!-- 自定义壁纸 -->
      <div class="theme-section" style="margin-bottom:20px;">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">自定义壁纸</div>
        <button class="theme-upload-zone" id="setUploadBtn" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--md-surface-container,#232529);border:1.5px dashed var(--md-outline-variant,rgba(255,255,255,0.2));border-radius:16px;cursor:pointer;color:var(--md-on-surface);text-align:left;">
          ${ICONS.folder}
          <span style="display:flex;flex-direction:column;gap:3px;">
            <span style="font-size:14px;font-weight:600;">上传图片 / 视频</span>
            <span style="font-size:12px;color:var(--md-on-surface-variant);">自动识别：图片 → 静态壁纸，视频 → 动态壁纸</span>
          </span>
        </button>
      </div>

      <!-- v9.94 #187 自定义字体：单文件 + zip 多字重字体包（JSZip 复用既有 vendor） -->
      <div class="theme-section" style="margin-bottom:20px;" data-test="font-section">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">字体</div>
        <div style="background:var(--md-surface-container,#232529);border-radius:18px;padding:12px 16px;display:flex;align-items:center;gap:14px;margin-bottom:10px;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);">当前字体</div>
            <div id="setFontSub" data-test="font-status" style="font-size:12px;color:var(--md-on-surface-variant);margin-top:3px;">系统默认</div>
          </div>
          <button id="setFontClearBtn" data-test="font-clear" style="display:none;flex:none;padding:7px 14px;border-radius:999px;border:1px solid var(--md-outline-variant,rgba(255,255,255,0.2));background:transparent;color:var(--md-on-surface);font-size:13px;cursor:pointer;">恢复默认</button>
        </div>
        <button class="theme-upload-zone" id="setFontUploadBtn" data-test="font-upload" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--md-surface-container,#232529);border:1.5px dashed var(--md-outline-variant,rgba(255,255,255,0.2));border-radius:16px;cursor:pointer;color:var(--md-on-surface);text-align:left;">
          ${ICONS.folder}
          <span style="display:flex;flex-direction:column;gap:3px;">
            <span style="font-size:14px;font-weight:600;">导入字体 / 字体包</span>
            <span style="font-size:12px;color:var(--md-on-surface-variant);">.ttf / .otf / .woff / .woff2 单文件，或 .zip 多字重字体包</span>
          </span>
        </button>
        <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:6px 4px 0;opacity:0.8;line-height:1.6;">
          zip 字体包按包内 manifest.json 显式声明或文件名（Regular / Bold / Light…）推断字重档位；
          多字重包为 font-weight 离散选档，非可变字体连续轴插值（后者属可变字体路线）
        </div>
      </div>

      <!-- v9.94 #20 锁屏表盘系统：时钟样式 + 时钟字体双节（Android 13 QPR2「壁纸和样式→锁屏」
           路径映射；本 sheet 即二级菜单元，双节内点选即时应用、锁定屏实时反映）。
           写路径 window.__lockClockFaces（lock-screen.js 暴露唯一持久化入口，零 import）。 -->
      <div class="theme-section" style="margin-bottom:20px;" data-test="lockclock-section">
        <div class="theme-section-label" style="font-size:13px;font-weight:600;color:var(--md-primary);margin:0 4px 8px;">锁屏时钟</div>
        <div style="background:var(--md-surface-container,#232529);border-radius:18px;padding:12px 16px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">时钟样式</div>
          <div id="lockFaceGrid" data-test="lockface-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;"></div>
          <!-- v10.42 #101：AI 生成表盘面板（生成结果落 CLOCK_FACES 第 5 脸 custom——单一状态源） -->
          <div id="watchfaceGenPanel" data-test="watchface-gen-panel" style="margin-top:10px;"></div>
          <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:8px 2px 0;opacity:0.8;line-height:1.6;">
            缩略卡实时渲染当前时间；ClockSize 大小钟档位（通知压缩）与表盘独立并存（AOSP 双帧域分离）
          </div>
        </div>
        <div style="background:var(--md-surface-container,#232529);border-radius:18px;padding:12px 16px;margin-top:10px;">
          <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);margin-bottom:10px;">时钟字体</div>
          <div id="clockFontGrid" data-test="clockfont-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;"></div>
          <div class="theme-section-hint" style="font-size:11px;color:var(--md-on-surface-variant);margin:8px 2px 0;opacity:0.8;line-height:1.6;">
            与时钟应用字体选择共用同一存储（一处实现三处引用）；预览 10:08 实时渲染，
            外链字体离线时回落系统栈
          </div>
        </div>
      </div>
    </div>
  `;

  function refreshStatus() {
    const thumb = container.querySelector('#setNavWallpaperThumb');
    const sub = container.querySelector('#setNavWallpaperSub');
    if (sub) {
      let text = '静态 / 动态 / 视频';
      try {
        if (window.__videoWallpaper && window.__videoWallpaper.isVideoActive()) {
          text = '当前使用：视频动态壁纸';
        } else {
          const procId = getActiveProceduralId();
          if (procId) {
            const preset = PROCEDURAL_PRESETS.find(p => p.id === procId);
            text = `当前使用：${preset ? preset.name : '程序化'}动态壁纸`;
          } else {
            const custom = localStorage.getItem('ios-desktop:wallpaper') || '';
            text = custom ? '当前使用：自定义 / 预设静态壁纸' : '静态 / 动态 / 视频';
          }
        }
      } catch (e) {}
      sub.textContent = text;
    }
    if (thumb) {
      let url = '';
      try {
        if (window.__videoWallpaper && window.__videoWallpaper.isVideoActive()) {
          url = window.__videoWallpaper.getVideoFrameDataURL() || '';
        } else if (getActiveProceduralId()) {
          url = getProceduralSnapshotURL() || '';
        } else {
          const bg = document.getElementById('desktop')?.style.backgroundImage || '';
          const m = bg.match(/url\(["']?(.+?)["']?\)/);
          url = m ? m[1] : '';
        }
      } catch (e) {}
      thumb.style.backgroundImage = url ? `url('${url}')` : 'none';
    }

    const modeRow = container.querySelector('#setThemeModeRow');
    if (modeRow) {
      const pref = getThemeModePref();
      modeRow.querySelectorAll('.theme-mode-opt').forEach((opt) => {
        const active = opt.dataset.mode === pref;
        opt.style.background = active ? 'hsl(var(--md-h,215) 80% 55% / 0.25)' : 'transparent';
        opt.style.color = active ? 'hsl(var(--md-h,215) 85% 65%)' : 'var(--md-on-surface-variant)';
        opt.style.fontWeight = active ? '600' : '500';
      });
    }

    // v9.94 #187：字体状态行（族名 + 字重档数）与清除按钮可见性
    const fontSub = container.querySelector('#setFontSub');
    const fontClear = container.querySelector('#setFontClearBtn');
    if (fontSub) {
      const fname = getFontName();
      const fw = getFontWeights();
      fontSub.textContent = fname
        ? `当前使用：${fname}${fw && fw.length > 1 ? ` · ${fw.length} 档字重` : (fw && fw.length === 1 ? ` · ${fw[0].weight}` : '')}`
        : '系统默认';
    }
    if (fontClear) fontClear.style.display = getFontName() ? '' : 'none';
  }

  // 外观模式
  const modeRow = container.querySelector('#setThemeModeRow');
  if (modeRow) {
    modeRow.querySelectorAll('.theme-mode-opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        setThemeMode(opt.dataset.mode);
        refreshStatus();
      });
    });
  }

  // v7.81 壁纸实时模糊（全局开关）：初始态取自引擎，切换即持久化 + 引擎热生效
  const blurSwitch = container.querySelector('#setWallpaperBlurSwitch');
  if (blurSwitch) {
    setSwitchChecked(blurSwitch, isWallpaperBlurEnabled()); // #70（主题面板重开 DOM 复用后几何对齐）
    blurSwitch.addEventListener('change', () => {
      setWallpaperBlurEnabled(blurSwitch.checked);
      if (window.showSystemToast) {
        window.showSystemToast(
          blurSwitch.checked ? '壁纸实时模糊已全局开启' : '壁纸实时模糊已全局关闭',
          ICONS.colour_correction
        );
      }
    });
  }

  // v9.94 #33 Monet 动态取色开关 + 色板预览
  const monetSwitch = container.querySelector('#setMonetSwitch');
  const monetSub = container.querySelector('#setMonetSub');
  const monetSwatches = container.querySelector('#setMonetSwatches');
  const refreshMonetUI = () => {
    if (monetSwitch) setSwitchChecked(monetSwitch, isMonetEnabled());
    if (monetSub) {
      const seed = getMonetSeed();
      monetSub.textContent = isMonetEnabled()
        ? `已从壁纸取色（seed ${seed != null ? argbToHex(seed) : '默认'}）`
        : '从壁纸提取调色板，全系统 UI 跟随（Material You）';
    }
    if (monetSwatches) {
      monetSwatches.innerHTML = '';
      const seed = getMonetSeed();
      const scheme = seed != null ? createColorScheme(seed) : createColorScheme(0xff215de0);
      const mode = getResolvedTheme() === 'light' ? 'light' : 'dark';
      const previewTones = { accent1: 80, accent2: 80, accent3: 80, neutral1: 40, neutral2: 60 };
      for (const [pal, tone] of Object.entries(previewTones)) {
        const sw = document.createElement('div');
        sw.setAttribute('data-test', `monet-swatch-${pal}`);
        sw.style.cssText = `flex:1;height:26px;border-radius:8px;background:${scheme[pal].toCss(tone)};border:1px solid var(--md-outline-variant,rgba(255,255,255,0.12));`; 
        monetSwatches.appendChild(sw);
      }
    }
  };
  if (monetSwitch) {
    setSwitchChecked(monetSwitch, isMonetEnabled());
    monetSwitch.addEventListener('change', () => {
      setMonetEnabled(monetSwitch.checked, true);
      refreshMonetUI();
    });
    refreshMonetUI();
  }

  // ==================== v10.42 #50 ColorBlendr 式主题色自定义接线 ====================
  const tcSwitch = container.querySelector('#setThemeColorSwitch');
  const tcSub = container.querySelector('#setThemeColorSub');
  const tcPresets = container.querySelector('#setThemeColorPresets');
  const tcStyles = container.querySelector('#setThemeColorStyles');
  const tcBlendA = container.querySelector('#setThemeColorBlendA');
  const tcBlendB = container.querySelector('#setThemeColorBlendB');
  const tcBlendApply = container.querySelector('#setThemeColorBlendApply');
  const tcBlendStrip = container.querySelector('#setThemeColorBlendStrip');
  const tcSliderAccentSat = container.querySelector('#setThemeColorAccentSat');
  const tcSliderBgSat = container.querySelector('#setThemeColorBgSat');
  const tcSliderBgLight = container.querySelector('#setThemeColorBgLight');
  const tcContrast = container.querySelector('#setThemeColorContrast');
  const tcImportFile = container.querySelector('#setThemeColorImport');
  const tcImportBtn = container.querySelector('#setThemeColorImportBtn');
  const tcResetBtn = container.querySelector('#setThemeColorResetBtn');

  // 当前编辑态：持久化配置优先，否则默认（seed 蓝 / TONAL_SPOT / 三滑杆 100 / 对比 0 / 关闭）。
  // tcCfg 仅作 UI 编辑态真源，持久化统一走 applyCustomThemeColor（写路径单一真源）。
  const tcCfg = Object.assign(
    { seed: '#0B57D0', style: 'TONAL_SPOT', secondary: null, tertiary: null, contrast: 0,
      accentSaturation: 100, backgroundSaturation: 100, backgroundLightness: 100, enabled: false },
    getCustomThemeColor() || {}
  );

  const refreshThemeColorUI = () => {
    if (tcSwitch) setSwitchChecked(tcSwitch, !!tcCfg.enabled);
    if (tcSub) {
      tcSub.textContent = tcCfg.enabled
        ? `已应用自定义配色（${tcCfg.seed} · ${tcCfg.style}）——覆盖壁纸取色`
        : '手动配色覆盖 Material You 取色（ColorBlendr 式）';
    }
    if (tcPresets) {
      tcPresets.querySelectorAll('[data-tc-preset]').forEach((el) => {
        const on = el.dataset.tcPreset === String(tcCfg.seed).toUpperCase();
        el.style.outline = on ? '2px solid var(--md-primary)' : 'none';
        el.style.outlineOffset = '2px';
      });
    }
    if (tcStyles) {
      tcStyles.querySelectorAll('[data-tc-style]').forEach((el) => {
        const on = el.dataset.tcStyle === tcCfg.style;
        el.style.background = on ? 'var(--md-primary)' : 'var(--md-surface-container-high,#2f3136)';
        el.style.color = on ? 'var(--md-on-primary,#fff)' : 'var(--md-on-surface)';
      });
    }
    if (tcSliderAccentSat) tcSliderAccentSat.value = String(tcCfg.accentSaturation);
    if (tcSliderBgSat) tcSliderBgSat.value = String(tcCfg.backgroundSaturation);
    if (tcSliderBgLight) tcSliderBgLight.value = String(tcCfg.backgroundLightness);
    if (tcContrast) tcContrast.value = String(Math.round((tcCfg.contrast || 0) * 100));
  };

  if (tcPresets) {
    tcPresets.innerHTML = PRESET_COLORS.map((p) => `
      <div data-tc-preset="${p.hex}" data-test="tc-preset-${p.hex.slice(1)}" role="button" tabindex="0"
        aria-label="预设主题色 ${p.name}" title="${p.name} ${p.hex}"
        style="width:34px;height:34px;border-radius:50%;background:${p.hex};cursor:pointer;border:2px solid var(--md-outline-variant,rgba(255,255,255,0.15));"></div>
    `).join('');
    tcPresets.querySelectorAll('[data-tc-preset]').forEach((el) => {
      const pick = () => {
        tcCfg.seed = el.dataset.tcPreset;
        tcCfg.enabled = true;
        applyCustomThemeColor(tcCfg, true);
        refreshThemeColorUI();
      };
      el.addEventListener('click', pick);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
  }

  if (tcStyles) {
    tcStyles.innerHTML = MONET_STYLES.map((s) => `
      <button data-tc-style="${s.name}" data-test="tc-style-${s.name}" title="${s.desc}"
        style="padding:5px 10px;border-radius:999px;border:1px solid var(--md-outline-variant,rgba(255,255,255,0.2));background:var(--md-surface-container-high,#2f3136);color:var(--md-on-surface);font-size:11px;cursor:pointer;">${s.label}${s.tier !== 'native' ? ' ≈' : ''}</button>
    `).join('');
    tcStyles.querySelectorAll('[data-tc-style]').forEach((el) => {
      el.addEventListener('click', () => {
        tcCfg.style = el.dataset.tcStyle;
        tcCfg.enabled = true;
        applyCustomThemeColor(tcCfg, true);
        refreshThemeColorUI();
      });
    });
  }

  // 双端混色器预览（blendSeeds HCT 域插值；端色变化即刷新色阶条，色块点击即用为 seed）
  const refreshBlendStrip = () => {
    if (!tcBlendStrip || !tcBlendA || !tcBlendB) return;
    const ramp = blendSeeds(tcBlendA.value, tcBlendB.value, 7);
    if (!ramp) { tcBlendStrip.innerHTML = ''; return; }
    tcBlendStrip.innerHTML = ramp.map((r) => `
      <div data-tc-ramp="${r.hex}" title="${r.hex}" style="flex:1;background:${r.hex};cursor:pointer;"></div>
    `).join('');
    tcBlendStrip.querySelectorAll('[data-tc-ramp]').forEach((el) => {
      el.addEventListener('click', () => {
        tcCfg.seed = el.dataset.tcRamp;
        tcCfg.enabled = true;
        applyCustomThemeColor(tcCfg, true);
        refreshThemeColorUI();
      });
    });
  };
  if (tcBlendA && tcBlendB) {
    refreshBlendStrip();
    tcBlendA.addEventListener('input', refreshBlendStrip);
    tcBlendB.addEventListener('input', refreshBlendStrip);
  }
  if (tcBlendApply && tcBlendA && tcBlendB) {
    tcBlendApply.addEventListener('click', () => {
      const ramp = blendSeeds(tcBlendA.value, tcBlendB.value, 5);
      if (!ramp) return;
      tcCfg.seed = ramp[2].hex; // 中点阶
      tcCfg.enabled = true;
      applyCustomThemeColor(tcCfg, true);
      refreshThemeColorUI();
    });
  }

  // 三滑杆（ColorBlendr MONET_ACCENT_SATURATION / BACKGROUND_SATURATION /
  // BACKGROUND_LIGHTNESS 0-200 原样映射）+ 对比度（0-200 → (v-100)/100 → -1..1）
  const tcSliderBinding = [
    [tcSliderAccentSat, 'accentSaturation'],
    [tcSliderBgSat, 'backgroundSaturation'],
    [tcSliderBgLight, 'backgroundLightness'],
  ];
  tcSliderBinding.forEach(([el, key]) => {
    if (!el) return;
    el.addEventListener('input', () => {
      tcCfg[key] = parseInt(el.value, 10) || 100;
      tcCfg.enabled = true;
      applyCustomThemeColor(tcCfg, false);
    });
    el.addEventListener('change', () => refreshThemeColorUI());
  });
  if (tcContrast) {
    tcContrast.addEventListener('input', () => {
      tcCfg.contrast = (parseInt(tcContrast.value, 10) || 0) / 100;
      tcCfg.enabled = true;
      applyCustomThemeColor(tcCfg, false);
    });
    tcContrast.addEventListener('change', () => refreshThemeColorUI());
  }

  // 导入 ColorBlendr 社区主题 .json（严格 codec：非法 → null toast，绝不半成品应用）
  if (tcImportBtn && tcImportFile) {
    tcImportBtn.addEventListener('click', () => tcImportFile.click());
    tcImportFile.addEventListener('change', () => {
      const file = tcImportFile.files && tcImportFile.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const theme = parseCommunityTheme(String(reader.result || ''));
        if (!theme) {
          if (window.showSystemToast) window.showSystemToast('导入失败：非 ColorBlendr 社区主题格式或载荷非法', ICONS.palette);
          return;
        }
        tcCfg.seed = '#' + (theme.seed & 0xffffff).toString(16).padStart(6, '0');
        tcCfg.secondary = theme.secondary ? '#' + (theme.secondary & 0xffffff).toString(16).padStart(6, '0') : null;
        tcCfg.tertiary = theme.tertiary ? '#' + (theme.tertiary & 0xffffff).toString(16).padStart(6, '0') : null;
        tcCfg.style = theme.style;
        tcCfg.accentSaturation = theme.accentSaturation;
        tcCfg.backgroundSaturation = theme.backgroundSaturation;
        tcCfg.backgroundLightness = theme.backgroundLightness;
        tcCfg.enabled = true;
        applyCustomThemeColor(tcCfg, true);
        refreshThemeColorUI();
        if (window.showSystemToast) window.showSystemToast(`社区主题已导入：${theme.name}`, ICONS.palette);
      };
      reader.readAsText(file);
      tcImportFile.value = ''; // 重选同名文件可重复触发
    });
  }

  // 重置为壁纸取色（清自定义覆盖层 → reroll 走壁纸 seed 链；编辑态保留供再开启）
  if (tcResetBtn) {
    tcResetBtn.addEventListener('click', () => {
      clearCustomThemeColor(true);
      tcCfg.enabled = false;
      refreshThemeColorUI();
    });
  }

  if (tcSwitch) {
    tcSwitch.addEventListener('change', () => {
      tcCfg.enabled = tcSwitch.checked;
      if (tcCfg.enabled) applyCustomThemeColor(tcCfg, true);
      else clearCustomThemeColor(true);
      refreshThemeColorUI();
    });
  }
  refreshThemeColorUI();

  // 动态壁纸
  // v8.08：来源行点击 → 滚动直达选择器（动态壁纸网格锚点）+ 高亮脉冲；键盘 Enter/Space 同义
  const sourceRow = container.querySelector('#setWallpaperSourceRow');
  if (sourceRow) {
    const gotoPicker = () => {
      const dyn = container.querySelector('#setDynamicGrid');
      const anchor = dyn ? (dyn.closest('.theme-section') || dyn) : container.querySelector('#setNavWallpaperRow');
      if (anchor && anchor.isConnected) {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        anchor.style.transition = 'box-shadow 0.4s ease';
        anchor.style.boxShadow = '0 0 0 2px hsl(var(--md-h,215) 85% 60%)';
        setTimeout(() => { if (anchor.isConnected) anchor.style.boxShadow = ''; }, 1200);
      }
    };
    sourceRow.addEventListener('click', gotoPicker);
    sourceRow.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); gotoPicker(); }
    });
  }

  const dynGrid = container.querySelector('#setDynamicGrid');
  if (dynGrid) {
    const activeId = getActiveProceduralId();
    // fix(v7.37 全量审计)：卡片骨架先行 + 缩略图逐张 idle 填充 ——
    // 旧实现 map 内同步 renderProceduralThumbnail（实测单张绘制+编码数百毫秒，
    // 冷缓存串行 3 张可阻塞主线程秒级），推入壁纸页的过渡动画被整段拖死。
    // 现在首帧只出卡片骨架（surface 底色 + 名称 + LIVE 徽章），缩略图在
    // requestIdleCallback 里逐张生成/取缓存回填：推页动画进行中不抢占主线程，
    // 滑动/交互优先；缓存命中时每张 <1ms，纯回填。
    dynGrid.innerHTML = PROCEDURAL_PRESETS.map((p, i) => `
      <div class="wallpaper-thumb-card proc-card ${i === 0 ? 'proc-hero' : ''} ${p.id === activeId ? 'active' : ''}" data-proc="${p.id}" style="cursor:pointer;position:relative;border-radius:14px;overflow:hidden;border:1.5px solid ${p.id === activeId ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent'};background:var(--md-surface-container-high,#2f3136);">
        <div data-proc-thumb="${p.id}" style="height:86px;background-color:var(--md-surface-container-high,#2f3136);background-size:cover;background-position:center;"></div>
        <div style="padding:8px 10px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;font-weight:600;color:var(--md-on-surface);">${p.name}</span>
          <span style="font-size:9px;padding:2px 5px;border-radius:4px;background:hsl(var(--md-h,215) 80% 55% / 0.2);color:hsl(var(--md-h,215) 85% 65%);font-weight:700;">LIVE</span>
        </div>
      </div>
    `).join('');

    // 缩略图 idle 逐张回填（元素可能已随页面销毁 → isConnected 守卫静默跳过）
    const thumbEls = Array.from(dynGrid.querySelectorAll('[data-proc-thumb]'));
    let thumbIdx = 0;
    const fillNextThumb = () => {
      if (thumbIdx >= thumbEls.length) return;
      const el = thumbEls[thumbIdx++];
      const url = renderProceduralThumbnail(el.dataset.procThumb);
      if (el.isConnected && url) el.style.backgroundImage = `url('${url}')`;
      if (thumbIdx < thumbEls.length) scheduleNextThumb();
    };
    const scheduleNextThumb = () => {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(fillNextThumb, { timeout: 900 });
      else setTimeout(fillNextThumb, 64);
    };
    if (thumbEls.length) scheduleNextThumb();

    dynGrid.querySelectorAll('[data-proc]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.proc;
        const preset = PROCEDURAL_PRESETS.find(x => x.id === id);
        if (!preset) return;
        clearCustomWallpaper();
        clearVideoWallpaper();
        try { localStorage.removeItem('ios-desktop:wallpaper'); sessionStorage.removeItem('ios-desktop:wallpaper'); } catch (e) {}
        applyProceduralWallpaper(id);
        applyThemeHue(preset.hue, false);
        refreshStatus();
        dynGrid.querySelectorAll('[data-proc]').forEach(c => {
          const isAct = c.dataset.proc === id;
          c.style.borderColor = isAct ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent';
        });
      });
    });
  }

  // 预设壁纸
  const presGrid = container.querySelector('#setWallpapersGrid');
  if (presGrid) {
    presGrid.innerHTML = PRESET_WALLPAPERS.map((w, idx) => `
      <div class="wallpaper-thumb-card" data-idx="${idx}" style="cursor:pointer;border-radius:12px;overflow:hidden;background:var(--md-surface-container-high,#2f3136);border:1.5px solid transparent;">
        <div style="height:90px;background-size:cover;background-position:center;background-image:url('${w.url}');"></div>
        <div style="padding:6px 8px;font-size:11px;font-weight:500;color:var(--md-on-surface);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${w.name}</div>
      </div>
    `).join('');

    presGrid.querySelectorAll('.wallpaper-thumb-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx, 10);
        const w = PRESET_WALLPAPERS[idx];
        if (!w) return;
        clearCustomWallpaper();
        clearProceduralWallpaper();
        clearVideoWallpaper();
        clearSavedPalette(); // fix(audit-C #2): 预设壁纸不携带调色板，作废旧调色板残留（同上）
        dom.desktop.style.backgroundImage = `url('${w.url}')`;
        try { localStorage.setItem('ios-desktop:wallpaper', w.url); } catch (e) {}
        applyThemeHue(w.hue, true);
        document.querySelectorAll('iframe').forEach(iframe => {
          try { iframe.contentWindow.postMessage({ type: 'set-wallpaper', url: w.url }, '*'); } catch (e) {}
        });
        if (window.showSystemToast) window.showSystemToast(`已应用壁纸: ${w.name}`, ICONS.palette);
        refreshStatus();
        if (dynGrid) {
          dynGrid.querySelectorAll('[data-proc]').forEach(c => { c.style.borderColor = 'transparent'; });
        }
      });
    });
  }

  // 上传按钮
  const upBtn = container.querySelector('#setUploadBtn');
  if (upBtn) {
    upBtn.addEventListener('click', () => {
      triggerWallpaperSelect();
    });
  }

  // v9.94 #187：字体导入（走统一 fontInput：单文件 / .zip 多字重包自动分流）与恢复默认
  const fontUpBtn = container.querySelector('#setFontUploadBtn');
  if (fontUpBtn) {
    fontUpBtn.addEventListener('click', () => {
      triggerFontSelect();
    });
  }
  const fontClearBtn = container.querySelector('#setFontClearBtn');
  if (fontClearBtn) {
    fontClearBtn.addEventListener('click', async () => {
      await clearCustomFont();
      if (window.showSystemToast) window.showSystemToast('已恢复默认字体', ICONS.folder);
      refreshStatus();
    });
  }
  // 页外字体变更同步（上传/恢复后 font-changed 广播 → 本页状态行跟手，isConnected 守卫）
  const onFontChanged = () => {
    if (!container.isConnected) {
      window.removeEventListener('font-changed', onFontChanged);
      return;
    }
    refreshStatus();
  };
  window.addEventListener('font-changed', onFontChanged);

  // fix(P2)：页外壁纸变更同步 —— wallpaper/procedural/video 三个模块的应用路径
  // 会广播 'wallpaper-changed'；旧实现本子页只在渲染时取一次选中态，页外改壁纸
  // （上传/恢复/个人-工作模式切换/长按面板）后本页选中框与副标题脱管。
  // 页面元素若已随子页出栈销毁则跳过（isConnected 守卫）。
  const syncFromEvent = () => {
    if (!container.isConnected) return;
    const grid = container.querySelector('#setDynamicGrid');
    const activeId = getActiveProceduralId();
    if (grid) {
      grid.querySelectorAll('[data-proc]').forEach(c => {
        const isAct = c.dataset.proc === activeId && !(
          window.__videoWallpaper && window.__videoWallpaper.isVideoActive());
        c.style.borderColor = isAct ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent';
      });
    }
    refreshStatus();
  };
  window.addEventListener('wallpaper-changed', syncFromEvent);

  // ==================== v9.94 #20 锁屏表盘/时钟字体双节（ClockConfig 元数据渲染） ====================
  const lockFaceGrid = container.querySelector('#lockFaceGrid');
  const renderFaceGrid = () => {
    if (!lockFaceGrid) return;
    let curId = 'double';
    try { curId = JSON.parse(localStorage.getItem(LOCK_CLOCK_FACE_KEY) || '{}').id || 'double'; } catch (e) {}
    lockFaceGrid.innerHTML = CLOCK_FACES.map((f) => {
      const active = f.id === curId;
      // v10.42 #101：custom 脸预览喂入生成参数（其余脸零消费）
      const preview = buildFaceHTML(f, { date: new Date(), size: 'small', customConfig: f.id === 'custom' ? watchfaceGenStore.getConfig() : null });
      return '<button data-lockface="' + f.id + '" data-test="lockface-' + f.id + '" aria-label="锁屏时钟样式 ' + f.label + '" '
        + 'style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px 8px;border-radius:14px;border:2px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';background:' + (active ? 'hsl(var(--md-h,215) 80% 55% / 0.12)' : 'var(--md-surface-container-high,rgba(255,255,255,0.05))') + ';cursor:pointer;color:var(--md-on-surface);">'
        + '<span style="display:flex;align-items:center;justify-content:center;height:52px;width:100%;font-size:19px;line-height:1.1;overflow:hidden;">' + preview + '</span>'
        + '<span style="font-size:11px;font-weight:600;">' + f.label + '</span>'
        + '</button>';
    }).join('');
    // analog 预览缩档（锁屏 88-120px 默认对 52px 预览窗过大）
    lockFaceGrid.querySelectorAll('[data-face="analog"]').forEach((el) => { el.style.setProperty('--analog-size', '44px'); });
  };
  renderFaceGrid();
  if (lockFaceGrid) {
    lockFaceGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-lockface]');
      if (!btn) return;
      const id = btn.getAttribute('data-lockface');
      if (window.__lockClockFaces && window.__lockClockFaces.setFace) {
        window.__lockClockFaces.setFace(id);
        const f = CLOCK_FACES.find((x) => x.id === id);
        if (window.showSystemToast && f) window.showSystemToast('锁屏时钟样式：' + f.label);
      }
      renderFaceGrid();
    });
  }

  // ==================== v10.42 #101 AI 生成表盘面板（参数化生成 + 逐维度锁定/重掷） ====================
  // 议题规格：生成按钮随机组合正交维度 + 锁定某维度后重掷其余（用户控制感）——
  // 约束护栏在核内 sanitizeConfig（可读性下限优先，修正账在录）；生成即应用 custom 脸
  //（AOSP 生成即预览语义近似，选择域落 LOCK_CLOCK_FACE_KEY 既有链零新状态源）。
  const genPanel = container.querySelector('#watchfaceGenPanel');
  const renderGenPanel = () => {
    if (!genPanel) return;
    const cfg = watchfaceGenStore.getConfig();
    const locks = watchfaceGenStore.getLocks();
    genPanel.innerHTML = '<div style="border:1px solid var(--md-outline-variant,rgba(255,255,255,0.08));border-radius:14px;padding:10px 12px;">'
      + '<div style="display:flex;align-items:center;gap:8px;">'
      + '<span style="font-size:12px;color:var(--md-on-surface-variant);flex:1;min-width:0;">AI 生成表盘 · seed ' + cfg.seed + '（可复现）</span>'
      + '<button data-wfgen="reroll" data-test="watchface-gen-btn" style="flex:none;padding:6px 14px;border-radius:999px;border:none;background:hsl(var(--md-h,215) 80% 60%);color:#fff;font-size:12px;font-weight:600;cursor:pointer;">重新生成</button>'
      + '</div>'
      + '<div style="display:flex;flex-wrap:wrap;gap:6px;padding-top:8px;">'
      + GEN_DIMENSIONS.map((dim) => {
          const locked = locks[dim.key] !== undefined;
          return '<button data-wfdim="' + dim.key + '" data-test="watchface-lock-' + dim.key + '" aria-pressed="' + locked + '" aria-label="锁定维度 ' + dim.label + '"'
            + ' style="padding:5px 10px;border-radius:999px;border:1px solid ' + (locked ? 'hsl(var(--md-h,215) 80% 60%)' : 'var(--md-outline-variant,rgba(255,255,255,0.14))') + ';background:' + (locked ? 'hsl(var(--md-h,215) 80% 55% / 0.16)' : 'transparent') + ';color:var(--md-on-surface);font-size:11px;cursor:pointer;">'
            + (locked ? '🔒 ' : '') + dim.label + '：' + dimensionValueLabel(dim.key, cfg[dim.key]) + '</button>';
        }).join('')
      + '</div>'
      + '<div style="font-size:10px;color:var(--md-on-surface-variant);opacity:0.75;padding-top:6px;line-height:1.5;">点维度卡锁定/解锁；重掷仅随机未锁定维度；护栏自动修正不可读组合。非真 AI 模型——参数化生成（seed 可复现）。</div>'
      + '</div>';
  };
  renderGenPanel();
  if (genPanel) {
    genPanel.addEventListener('click', (e) => {
      const lockBtn = e.target.closest('[data-wfdim]');
      if (lockBtn) {
        const key = lockBtn.getAttribute('data-wfdim');
        const wasLocked = watchfaceGenStore.getLocks()[key] !== undefined;
        watchfaceGenStore.toggleLock(key, !wasLocked);
        renderGenPanel();
        return;
      }
      const genBtn = e.target.closest('[data-wfgen="reroll"]');
      if (genBtn) {
        watchfaceGenStore.reroll();
        if (window.__lockClockFaces && window.__lockClockFaces.setFace) window.__lockClockFaces.setFace('custom');
        renderFaceGrid();
        renderGenPanel();
        if (window.showSystemToast) window.showSystemToast('已生成新表盘（seed ' + watchfaceGenStore.getConfig().seed + '）');
      }
    });
  }

  const clockFontGrid = container.querySelector('#clockFontGrid');
  const renderFontGrid = () => {
    if (!clockFontGrid) return;
    let curId = 'system';
    try { curId = JSON.parse(localStorage.getItem(CLOCK_FONT_KEY) || '{}').id || 'system'; } catch (e) {}
    clockFontGrid.innerHTML = CLOCK_FONT_SOURCES.map((f) => {
      const active = f.id === curId;
      const fam = f.id === 'user'
        ? 'var(--custom-user-font, inherit)'
        : (f.family ? "'" + f.family + "','RobotoFlex',monospace" : 'inherit');
      const note = f.id === 'user'
        ? (getFontName() ? '已导入：' + getFontName() : '未导入（上方导入区）')
        : f.note;
      return '<button data-clockfont="' + f.id + '" data-test="clockfont-' + f.id + '" aria-label="时钟字体 ' + f.label + '" '
        + 'style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px 8px;border-radius:14px;border:2px solid ' + (active ? 'hsl(var(--md-h,215) 85% 60%)' : 'transparent') + ';background:' + (active ? 'hsl(var(--md-h,215) 80% 55% / 0.12)' : 'var(--md-surface-container-high,rgba(255,255,255,0.05))') + ';cursor:pointer;color:var(--md-on-surface);min-width:0;">'
        + '<span style="font-family:' + fam + ';font-size:24px;line-height:1.15;font-variant-numeric:tabular-nums;">10:08</span>'
        + '<span style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">' + f.label + '</span>'
        + '<span style="font-size:9px;color:var(--md-on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">' + note + '</span>'
        + '</button>';
    }).join('');
  };
  renderFontGrid();
  // vendor 三字体懒加载（同源 ~17KB）+ gsflex 外链（在线才生效，失败静默——离线回落栈）
  ['aclock', 'acsolid', 'clockopia', 'gsflex'].forEach((id) => {
    ensureClockFontLoaded(id).then((ok) => { if (ok) renderFontGrid(); });
  });
  if (clockFontGrid) {
    clockFontGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-clockfont]');
      if (!btn) return;
      const id = btn.getAttribute('data-clockfont');
      if (window.__lockClockFaces && window.__lockClockFaces.setFont) {
        window.__lockClockFaces.setFont(id);
        const f = CLOCK_FONT_SOURCES.find((x) => x.id === id);
        if (window.showSystemToast && f) window.showSystemToast('时钟字体：' + f.label);
      }
      renderFontGrid();
    });
  }

  // 页外表盘/字体变更同步（时钟应用写入同键后本页选中框跟手；isConnected 守卫）
  const onLockClockChanged = () => {
    if (!container.isConnected) {
      document.removeEventListener('lock-clock-face-changed', onLockClockChanged);
      document.removeEventListener('clock-font-changed', onLockClockChanged);
      return;
    }
    renderFaceGrid();
    renderFontGrid();
  };
  document.addEventListener('lock-clock-face-changed', onLockClockChanged);
  document.addEventListener('clock-font-changed', onLockClockChanged);

  refreshStatus();
}

window.__initWallpaperPage = initWallpaperPage;

// fix(P2)：settings 壁纸子页索引与开窗动画延时原为裸魔法数（13 / 260）——
// 索引对应 settings.js pages 数组顺序（页序变更需同步）；延时需匹配 app-window
// 开窗弹簧的主段落，260ms 后推子页才有可视连续性。常量化便于排查与维护。
const SETTINGS_WALLPAPER_PAGE_IDX = 13;   // 对应 settings.js「壁纸与动态壁纸」子页
const SUBPAGE_OPEN_DELAY_MS = 260;        // 与 app-window 开窗动画主段落对齐

/**
 * 统一壁纸设置入口：直达设置应用中的壁纸二级菜单（享受标准预览式返回）
 */
export function openThemePicker(srcEl = null) {
  const settingsIdx = initialApps.findIndex(a => a.id === 'settings');
  if (settingsIdx !== -1) {
    if (!state.isOpen || !state.currentApp || state.currentApp.id !== 'settings') {
      openApp(settingsIdx, srcEl);
      setTimeout(() => {
        pushSubPage(SETTINGS_WALLPAPER_PAGE_IDX);
      }, SUBPAGE_OPEN_DELAY_MS);
    } else {
      pushSubPage(SETTINGS_WALLPAPER_PAGE_IDX);
    }
    return;
  }

  // 回落覆盖层逻辑（防御）
  const overlay = document.getElementById('themePickerOverlay');
  if (!overlay) return;
  if (overlay.classList.contains('active')) return;
  resetTpGestureStyles();
  renderDynamicWallpapers();
  syncThemeModeRow();
  syncWallpaperNav();
  overlay.classList.add('active');
  const body = document.getElementById('themeWallpaperView');
  if (body) body.scrollTop = 0;
  tpOpenWithSpring();
}

window.openWallpaperSettings = openThemePicker;
window.openThemePicker = openThemePicker;
window.__openWallpaperSubView = openThemePicker;

/** v7.6：立即回收（closeApp 回收桥 / 异常兜底用）——无动画直接移除 */
export function closeThemePicker() {
  const overlay = document.getElementById('themePickerOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    clearTimeout(tpAnim.cleanupTimer);
    resetTpGestureStyles();
  }
}
