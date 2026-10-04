// ==================== theme-engine.js — Material You 动态色彩主题引擎与壁纸精选 ====================

import { dom } from './dom.js';
import { ICONS } from './icons.js';
import { triggerWallpaperSelect, clearCustomWallpaper, clearSavedPalette } from './wallpaper.js';
import { clearVideoWallpaper } from './video-wallpaper.js';
import { getThemeModePref, setThemeMode, getResolvedTheme } from './theme-mode.js';
import { Spring, Spring2D } from './spring.js';
import { curOpenParams, curCloseParams } from './animation-presets.js';
import { registerOverlayBack } from './overlay-registry.js';
import { state } from './state.js';
import { initialApps } from './apps-data.js';
import { openApp } from './app-window.js';
import { pushSubPage } from './page-stack.js';
import {
  PROCEDURAL_PRESETS, applyProceduralWallpaper, clearProceduralWallpaper,
  getActiveProceduralId, renderProceduralThumbnail, getProceduralSnapshotURL,
} from './procedural-wallpaper.js';

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

  // 动态壁纸
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

  refreshStatus();
}

window.__initWallpaperPage = initWallpaperPage;

/**
 * 统一壁纸设置入口：直达设置应用中的壁纸二级菜单（享受标准预览式返回）
 */
export function openThemePicker(srcEl = null) {
  const settingsIdx = initialApps.findIndex(a => a.id === 'settings');
  if (settingsIdx !== -1) {
    if (!state.isOpen || !state.currentApp || state.currentApp.id !== 'settings') {
      openApp(settingsIdx, srcEl);
      setTimeout(() => {
        pushSubPage(13);
      }, 260);
    } else {
      pushSubPage(13);
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
