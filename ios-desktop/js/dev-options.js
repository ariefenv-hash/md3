// ==================== dev-options.js — 开发者选项（批次二·真设置 / 批次五·性能面板） ====================
//
// 设置 › 开发者选项 页的真实能力由本模块落地：
//   1. 性能面板：FPS + 平均帧耗时 + 60s 火花图 + JS 堆内存 + 卡顿帧计数悬浮层
//      （MD3 胶囊样式，pointer-events:none 不干扰触控；批次五由纯 FPS 数字升级）
//   2. 禁用动画：html.no-anim 类统一关闭 CSS transition/animation
//      （Spring2D 物理弹簧为 JS transform 驱动，不在其列 —— 架构红线不动，
//        本开关服务的是排查样式过渡问题的场景）
//   3. 重置桌面布局：清除 pages-apps / removed-apps 后刷新
//   4. 清空全部数据：localStorage + IndexedDB + Cache Storage + SW 注销后刷新
//      （恢复出厂语义 —— 与「备份与恢复」配合使用）
//   5. 动画倍率（v7.18）：全局开合/切换/退场动画速度倍率（0.25× 慢放逐帧检视 ~
//      3× 极速），热应用不跳变，持久化保持；实现在 animation-presets.js
//
// 持久化键：ios-desktop:dev-fps / ios-desktop:dev-no-anim / ios-desktop:anim-speed

import { getAnimSpeed, setAnimSpeed } from './animation-presets.js';

const FPS_KEY = 'ios-desktop:dev-fps';
const NO_ANIM_KEY = 'ios-desktop:dev-no-anim';

let fpsOverlay = null;
let fpsRafId = null;

function flagOn(key) {
  try { return localStorage.getItem(key) === '1'; } catch (e) { return false; }
}
function setFlag(key, v) {
  try { localStorage.setItem(key, v ? '1' : '0'); } catch (e) {}
}

// ==================== 性能面板（FPS / 帧耗时 / 火花图 / 堆内存 / 卡顿） ====================

const PERF_SAMPLE_SEC = 60;   // 火花图保存最近 60 个每秒样本
const JANK_MS = 32;           // 单帧耗时超过 32ms（<31fps）计为一次卡顿

function startFps() {
  if (fpsRafId) return;
  if (!fpsOverlay) {
    fpsOverlay = document.createElement('div');
    fpsOverlay.id = 'devFpsOverlay';
    fpsOverlay.style.cssText = `
      position: fixed; top: 34px; left: 10px; z-index: 10100; pointer-events: none;
      background: rgba(20, 24, 22, 0.9); color: #7df8db;
      /* v7.7：移除 backdrop-filter —— 面板背后是每帧都在变化的动画画面，
         逐帧重算模糊会把自己的测量结果污染出 10~20 次/场的假卡顿 */
      font: 600 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-variant-numeric: tabular-nums; padding: 6px 10px 7px; border-radius: 12px;
      border: 1px solid rgba(125, 248, 219, 0.25); box-shadow: 0 4px 14px rgba(0,0,0,0.3);
    `;
    const line1 = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.width = 96; canvas.height = 26;
    canvas.style.cssText = 'display:block; margin: 3px 0 2px; width:96px; height:26px;';
    const line2 = document.createElement('div');
    line2.style.cssText = 'opacity: 0.85; font-size: 10.5px;';
    fpsOverlay.append(line1, canvas, line2);
    document.body.appendChild(fpsOverlay);
    fpsOverlay.__line1 = line1;
    fpsOverlay.__line2 = line2;
    fpsOverlay.__canvas = canvas;
  }

  const ctx = fpsOverlay.__canvas.getContext('2d');
  const samples = [];   // 每秒一个 FPS 样本
  let janks = 0;        // 最近 60s 内超过 JANK_MS 的帧数
  let frames = 0;
  let frameMsSum = 0;
  let last = performance.now();
  let lastFrame = last;

  const drawSparkline = () => {
    const w = fpsOverlay.__canvas.width, h = fpsOverlay.__canvas.height;
    ctx.clearRect(0, 0, w, h);
    const n = samples.length;
    if (!n) return;
    const bw = w / PERF_SAMPLE_SEC;
    const barW = Math.max(1, bw - 1);
    for (let i = 0; i < n; i++) {
      const fps = samples[i];
      const bh = Math.max(1.5, Math.min(1, fps / 60) * (h - 2));
      ctx.fillStyle = fps >= 55 ? 'rgba(125,248,219,0.9)' : fps >= 40 ? 'rgba(255,196,80,0.9)' : 'rgba(255,105,97,0.95)';
      ctx.fillRect(w - (n - i) * bw, h - bh, barW, bh);
    }
  };

  const loop = (now) => {
    const delta = now - lastFrame;
    lastFrame = now;
    frames++;
    frameMsSum += delta;
    if (delta > JANK_MS) janks++;

    if (now - last >= 1000) {
      const fps = Math.round((frames * 1000) / (now - last));
      const avgMs = frames ? (frameMsSum / frames).toFixed(1) : '0';
      samples.push(fps);
      if (samples.length > PERF_SAMPLE_SEC) samples.shift();
      // 每 60s 重置卡顿窗口，避免长期计数只增不减失去实时性
      const jankShow = janks;
      if (samples.length >= PERF_SAMPLE_SEC) janks = 0;

      fpsOverlay.__line1.textContent = `${fps} FPS \u00b7 ${avgMs}ms/\u5e27`;
      // performance.memory 仅 Chromium 系提供，缺失时优雅降级不显示
      const mem = performance.memory;
      const memText = mem
        ? ` \u00b7 \u5806 ${(mem.usedJSHeapSize / 1048576).toFixed(1)}/${(mem.jsHeapSizeLimit / 1048576).toFixed(0)}MB`
        : '';
      fpsOverlay.__line2.textContent = `60\u79d2\u5185\u5361\u987f ${jankShow} \u6b21${memText}`;
      drawSparkline();

      frames = 0;
      frameMsSum = 0;
      last = now;
    }
    fpsRafId = requestAnimationFrame(loop);
  };
  fpsRafId = requestAnimationFrame(loop);
}

function stopFps() {
  if (fpsRafId) { cancelAnimationFrame(fpsRafId); fpsRafId = null; }
  if (fpsOverlay) { fpsOverlay.remove(); fpsOverlay = null; }
}

export function setFpsEnabled(on) {
  setFlag(FPS_KEY, on);
  if (on) startFps(); else stopFps();
}
export function isFpsEnabled() { return flagOn(FPS_KEY); }

// ==================== 禁用动画 ====================

const NO_ANIM_CSS_ID = 'dev-no-anim-style';

function applyNoAnim(on) {
  let style = document.getElementById(NO_ANIM_CSS_ID);
  if (on) {
    if (!style) {
      style = document.createElement('style');
      style.id = NO_ANIM_CSS_ID;
      style.textContent = `
        html.no-anim *, html.no-anim *::before, html.no-anim *::after {
          transition: none !important; animation: none !important;
        }`;
      document.head.appendChild(style);
    }
    document.documentElement.classList.add('no-anim');
  } else {
    document.documentElement.classList.remove('no-anim');
    if (style) style.remove();
  }
}

export function setNoAnimEnabled(on) {
  setFlag(NO_ANIM_KEY, on);
  applyNoAnim(on);
}
export function isNoAnimEnabled() { return flagOn(NO_ANIM_KEY); }

// ==================== 重置与清空 ====================

/** 重置桌面布局（图标排列 + 已移除应用），刷新生效 */
export function resetDesktopLayout() {
  try {
    localStorage.removeItem('ios-desktop:pages-apps');
    localStorage.removeItem('ios-desktop:removed-apps');
    localStorage.removeItem('ios-desktop:folders');
  } catch (e) {}
  setTimeout(() => location.reload(), 120);
}

/** 清空全部数据 = 恢复出厂：localStorage + IndexedDB + Cache Storage + SW 注销，随后刷新 */
export async function wipeAllData() {
  try { localStorage.clear(); } catch (e) {}
  try { sessionStorage.clear(); } catch (e) {}
  try {
    const { idbClearStore } = await import('./storage.js');
    await idbClearStore();
  } catch (e) {}
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch (e) {}
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch (e) {}
  setTimeout(() => location.reload(), 200);
}

// ==================== 初始化 ====================

export function initDevOptions() {
  // 恢复上次会话的开关状态（刷新后保持）
  applyNoAnim(isNoAnimEnabled());
  if (isFpsEnabled()) startFps();

  window.__devOptions = {
    setFpsEnabled, isFpsEnabled,
    setNoAnimEnabled, isNoAnimEnabled,
    getAnimSpeed, setAnimSpeed,
    resetDesktopLayout,
    wipeAllData,
  };
}
