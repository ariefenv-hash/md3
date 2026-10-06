// ==================== app-window-parallel.js — 并行动画子系统（v7.50 自 app-window.js 拆分） ====================
//
// 职责（纯渲染/物理，不含窗口生命周期）：
//   1. 放射状多图标并行物理场（Radial Dispersion & Convergence，逐图标独立 1D 弹簧 + 错峰起爆）
//   2. macOS Genie 透视漏斗 matrix3d 形变核心（GENIE 参数 / genieFunnelMatrix / 低端机模糊降档）
//   3. 桌面壁纸景深/毛玻璃/文件夹面板 多图层并行动画（renderParallelAnimations）
//   4. Closing Actor 渲染器（并行关闭窗口的 Genie 收束/果冻/高光/阴影合成层驱动）
//   5. 图标「接收」恢复 popHomeIcon（幂等，v7.11.1 语义）
//   6. 共享可变态：closingActors 队列 / REDUCED_MOTION 开关 / cachedEl 断链自愈缓存
//
// 拆分纪律：本文件不 import app-window.js（防循环）；app-window.js 反向 import 本模块
// 并 re-export 对外符号（gestures.js 等外部引用路径零改动）。
// 行为零变化：代码自 app-window.js 原样切割（锚点机械切分），仅新增本头与导入/导出。

import { state } from './state.js';
import { dom } from './dom.js';
import { Spring, makeSpringParams } from './spring.js';
import { scaleAnimSpeed } from './animation-presets.js';
import { clamp, smoothstep } from './utils.js';
import { setDesktopBlurProgress, hideDesktopBlur, isBlurSnapshotReady } from './desktop-blur.js';

// ==================== 放射状多图标并行物理场 ====================
// 每个图标持有独立 1D 弹簧（真正多体并行），并按与源点的距离错峰起爆，形成波浪传导
const radialField = {
  items: [],        // { el, dirX, dirY, push, startAt, spring: Spring }
  context: 'none',  // 'folder' | 'desktop' | 'none'
  originCX: 0,
  originCY: 0,
  isIdle: false,    // 全部弹簧稳定在当前目标（挂起逐帧写入）
};
const RADIAL_PARAMS = makeSpringParams(0.34, 0.78, 1); // 基准参数；构建时经 scaleAnimSpeed 套用开发者动画倍率
const RADIAL_STAGGER_MS = 130; // 最远图标相对最近图标的起爆延迟

// ==================== macOS Genie 透视漏斗（v7.15「神奇效果」扭曲核心） ====================
//
// 原理：在 transform 链末位（局部坐标系中最早应用）追加一个带 w 行分量的
// matrix3d 单应矩阵：w = 1 + qx·x + qy·y，透视除法使靠图标一侧的窗口边缘沿
// 飞行轴向消失点收敛 —— 真实的梯形漏斗形变（macOS「神奇效果」最小化的招牌
// 轮廓），而不是旧版均匀 scale 压扁（矩形始终是矩形）。
//
// 数学推导（b = 吸入边收敛比，t = 远边放大比，两者都随强度 g 从 1 插值）：
//   设 d = q·h_ax（h_ax 为矩形沿飞行轴的半跨度），则吸入边缩放 = k/(1+d)、
//   远边缩放 = k/(1-d)。解两约束：d = (t-b)/(t+b)，k = 2bt/(b+t) ——
//   恰好吸入边精确落 b、远边精确落 t，且中间按透视双曲线连续过渡。
//   归一因子 k 同时提供整体 ~0.8× 的均匀收束，复现「被吸走」的体积感。
//
// 性能：matrix3d 仍是合成器 transform（浏览器在 GPU 上做透视除法顶点插值），
// 与既有 rotateX/skew 同类，不触发内容重绘 —— 每帧只多拼接一段字符串。
const GENIE = {
  // 关闭（吸入图标）：满强度时吸入边收敛到 62%、远边微涨到 110% —— 梯形收束轮廓
  closeSuction: 0.62,
  closeFar: 1.10,
  closeEngage: 0.92, // p 自 0.92 起开始成形（关窗首帧零突变 —— 根治旧版 p=1 瞬间压扁的可见跳变）
  closeFull: 0.14,   // p ≤ 0.14 满强度（此刻渐隐交接已在进行，与图标恢复重叠成经典溶解）
  // 打开（自图标倾泻而出）：反向漏斗随展开释放，强度收敛为关闭的 ~68%（含蓄但可感知）
  openSuction: 0.74,
  openFar: 1.06,
  openRelease: 0.62, // p ≥ 0.62 后完全释放为矩形（约前 140ms 的「倾泻」窗口期）
  openLift: 0.68,    // 打开漏斗强度系数（相对关闭满强度）
  // v7.17 模糊通道与形变解耦：engage 自 0.92 后移到 0.55 —— 内容可读期零失焦，
  // 只在最后一段收束时才起雾；量化 1px→2px（6 次全屏滤镜→3 次，移动端单次
  // 全屏高斯模糊可达 10ms+，是关闭掉帧主源之一）
  blurPeak: 6,
  blurEngageHi: 0.55,
  blurEngageLo: 0.12,
  axisFadePx: 160,   // 图标距屏幕中心小于该距离时漏斗按比例淡出（居中来源对称展开）
};

// v7.17 弱机降档：全屏模糊在低端 SoC 上单次滤镜即可顶满帧预算，
// 逻辑核 <6 的设备峰值减半（渐进增强：形变/位移零损失，仅失焦幅度降低）
const BLUR_PEAK = ((typeof navigator !== 'undefined' && (navigator.hardwareConcurrency || 8)) < 6)
  ? Math.ceil(GENIE.blurPeak / 2)
  : GENIE.blurPeak;

/**
 * 计算 Genie 透视漏斗 matrix3d 片段。
 * @param {number} g     漏斗强度 0~1（0 附近直通返回 ''，transform 保持纯 2D 链）
 * @param {number} suction 吸入边（靠图标一侧）收敛比目标，<1
 * @param {number} far    远边放大比目标，≥1
 * @param {number} ax    飞行轴 X 分量（图标中心 − 屏幕中心，未归一化）
 * @param {number} ay    飞行轴 Y 分量
 * @param {number} hw    元素局部半宽（全屏窗口 = screenW/2）
 * @param {number} hh    元素局部半高
 * @returns {string} 带『前导空格』的 matrix3d 片段；不可用时返回 ''
 */
function genieFunnelMatrix(g, suction, far, ax, ay, hw, hh) {
  if (!(g > 0.004)) return '';
  const len = Math.hypot(ax, ay);
  // 图标贴近屏幕中心（Spotlight 居中展开等）：飞行轴退化 → 扭曲按距离淡出，对称展开无歪斜
  const fade = clamp(len / GENIE.axisFadePx, 0, 1);
  if (len < 0.001 || fade <= 0.004) return '';
  ax /= len; ay /= len;
  g *= fade;
  // 目标边缩放比随强度线性插值（g=0 时 b=t=1 → 恒等矩阵，与包络零强度端点自然衔接）
  const b = 1 + (suction - 1) * g;
  const t = 1 + (far - 1) * g;
  const d = (t - b) / (t + b);   // = q·h_ax
  const k = (2 * b * t) / (b + t); // 归一均匀因子：吸入边精确落 b、远边精确落 t
  // 矩形沿飞行轴的半跨度（L1 投影；对角轴向时为角点跨度，透视收敛仍正确）
  const hAx = Math.abs(ax) * hw + Math.abs(ay) * hh;
  const q = d / Math.max(hAx, 1);
  const kk = k.toFixed(4);
  return ` matrix3d(${kk},0,0,${(q * ax).toFixed(5)},0,${kk},0,${(q * ay).toFixed(5)},0,0,${kk},0,0,0,0,1)`;
}

// v7.15 无障碍：prefers-reduced-motion 时关闭全部装饰性扭曲（漏斗/倾斜/剪切/果冻），
// 保留纯缩放位移的功能动效 —— 与锁屏入场动效的降级策略一致；测试桩 matchMedia
// 返回恒假值，单测路径自动走常规动效分支
let REDUCED_MOTION = false;
try {
  if (typeof matchMedia === 'function') {
    const _rmq = matchMedia('(prefers-reduced-motion: reduce)');
    REDUCED_MOTION = !!_rmq.matches;
    const _rmSync = () => { REDUCED_MOTION = !!_rmq.matches; };
    if (_rmq.addEventListener) _rmq.addEventListener('change', _rmSync);
    else if (_rmq.addListener) _rmq.addListener(_rmSync);
  }
} catch (e) { /* 环境不支持时按常规动效处理 */ }

// 正在并行执行返回关闭动画的应用 Actors 队列
const closingActors = [];

/** 带断链失效的元素缓存：桌面小部件可能随 renderDesktopPages 重建，isConnected 变化时自动重查 */
const elCache = new Map();
function cachedEl(id) {
  let el = elCache.get(id);
  if (!el || !el.isConnected) {
    el = document.getElementById(id);
    if (el) elCache.set(id, el);
  }
  return el;
}

/**
 * 采样并构建放射状多图标并行物理场
 * 每个图标独立 1D 弹簧 + 按距离错峰起爆（真正的多体并行动画，而非单进度全局插值）
 * @param {HTMLElement|null} clickedIconEl — 源图标（可空：多任务卡片/搜索路径）
 * @param {number} initialValue — 场初始进度（0=归位态；1=已散开态，用于文件夹等来源关闭时的桌面场重建）
 */
function prepareRadialField(clickedIconEl, initialValue = 0) {
  // v7.9.1：重建前收集旧场各图标的当前视觉进度 —— 快速切换应用（B→C）时新场
  // 从旧进度平滑续飞，消灭"全部图标瞬跳归位再重新散开"的闪变（图标与应用
  // 内容交错观感的主要来源）
  const prevS = new Map();
  for (const it of radialField.items) {
    if (it.el && it.el.isConnected && Number.isFinite(it.lastS)) {
      prevS.set(it.el, clamp(it.lastS, 0, 1));
    }
  }
  clearRadialField();
  radialField.originCX = state.iconCX;
  radialField.originCY = state.iconCY;

  let source = null;
  if (dom.folderOverlay && dom.folderOverlay.classList.contains('active') &&
      clickedIconEl && dom.folderGrid.contains(clickedIconEl)) {
    radialField.context = 'folder';
    source = dom.folderGrid.querySelectorAll('.app-icon');
  } else {
    radialField.context = 'desktop';
    const currentGrid = dom.desktopSlider ? dom.desktopSlider.children[state.currentPage] : null;
    source = currentGrid ? currentGrid.querySelectorAll('.app-icon, .app-folder') : null;
  }
  if (!source || source.length === 0) return;

  let maxDist = 1;
  const sampled = [];
  source.forEach((item) => {
    if (item === clickedIconEl) return;
    const rect = item.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(cx - radialField.originCX, cy - radialField.originCY);
    sampled.push({ el: item, cx, cy, dist });
    if (dist > maxDist) maxDist = dist;
  });
  if (sampled.length === 0) return;

  const now = performance.now();
  radialField.items = sampled.map((s) => {
    const dist = Math.max(1, s.dist);
    const carried = prevS.get(s.el);
    // v7.9.1：入场 CSS 动画占用期内场起爆延后 —— animation both fill 优先于
    // inline 样式，提前接管会让图标在动画结束帧跳到 inline 位置。延后到动画
    // 结束后从既有进度接管，交接零跳变：
    //   unlock-icon-in*：解锁入场（lock-screen.js v7.13，0.52~0.62s + 错峰 delay）
    //   icon-receive-pop：关闭收场图标 pop（app-window.css 0.34s）
    let guard = 0;
    if (s.el.classList.contains('unlock-icon-in') || s.el.classList.contains('unlock-icon-in-ios') || s.el.classList.contains('unlock-icon-in-android')) {
      // v7.13：优先读取动画的真实剩余时长（getAnimations），读不到再退回
      // 静态保守值（delay + 700ms 覆盖最长入场 620ms + 落位裕量）
      let remain = 0;
      try {
        const anims = s.el.getAnimations ? s.el.getAnimations() : [];
        for (const a of anims) {
          const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
          if (t && Number.isFinite(t.endTime)) {
            remain = Math.max(remain, t.endTime - (a.currentTime || 0));
          }
        }
      } catch (err) { /* 环境不支持时走静态兜底 */ }
      guard = Math.max(remain, 0) + 60;
      if (remain <= 0) guard = (parseFloat(s.el.style.animationDelay) || 0) + 700;
    } else if (s.el.classList.contains('icon-receive-pop')) {
      guard = 280;
    } else if (s.el.classList.contains('icon-receive-fade')) {
      // v7.11.1：图标接收轻淡入占用期同样延后接管（动画 both fill 优先于
      // inline 样式，提前接管会跳到 inline 位）—— 0.16s 动画 + 余量
      guard = 200;
    }
    return {
      el: s.el,
      dirX: (s.cx - radialField.originCX) / dist,
      dirY: (s.cy - radialField.originCY) / dist,
      push: 40 + 20 * Math.min(dist / 350, 1.2),
      startAt: now + (s.dist / maxDist) * RADIAL_STAGGER_MS + guard,
      spring: new Spring({
        ...scaleAnimSpeed(RADIAL_PARAMS),
        initialValue: carried !== undefined ? carried : initialValue,
        initialVelocity: 0,
      }),
    };
  });
  radialField.items.forEach((i) => {
    i.el.style.willChange = 'transform, opacity';
    // v7.9.1：携带旧进度的图标在场重建同帧立即落旧视觉位 —— 填补 clearRadialField
    // 清空 inline 到 startAt 起爆之间的空窗（否则该窗口期图标闪现归位态）
    if (i.spring.x > 0.0005) applyRadialItemStyle(i, clamp(i.spring.x, 0, 1.2));
  });
}

/** 清空放射场并复位所有被驱动图标的内联样式 */
function clearRadialField() {
  radialField.items.forEach((i) => {
    i.el.style.transform = '';
    i.el.style.opacity = '';
    i.el.style.willChange = '';
  });
  radialField.items = [];
  if (radialField.context === 'folder') resetFolderPanelVisual();
  radialField.context = 'none';
  radialField.isIdle = false;
}

/** 复位文件夹面板在并行动画中的内联样式 */
function resetFolderPanelVisual() {
  if (!dom.folderOverlay) return;
  const panel = dom.folderOverlay.querySelector('.folder-panel');
  if (panel) {
    panel.style.transform = '';
    panel.style.opacity = '';
  }
}

/** 保留当前值与速度无缝重定向放射场目标（开启↔关闭中途反转不瞬移） */
export function retargetRadialField(target) {
  radialField.items.forEach((i) => i.spring.setTarget(target));
  radialField.isIdle = false;
}

/** 单个图标按场进度 s 应用放射位移/缩放/透明度（lastS 供场重建时进度接力）
 * v7.12 帧率：全部视觉通道量化跳写 —— opacity 1/32 档、位移 0.5px 档、scale 1/1000 档，
 * 帧间变化不足一档不写 style。波场是大幅波浪传导（人眼对 3%/0.5px 步进无感），
 * 弹簧活跃段照常逐帧写；收敛段与 120Hz 高刷设备上（帧间增量减半）自动大幅减写 ——
 * 实测 StyleRecalc 失效次数显著下降，高刷下主线程每帧余量翻倍。
 * lastS 保持连续值供场重建进度接力（不量化）。 */
function applyRadialItemStyle(item, s) {
  item.lastS = s;
  if (s > 0.0005) {
    const transX = item.dirX * item.push * s;
    const transY = item.dirY * item.push * s;
    const itemScale = Math.max(0.78, 1 - 0.22 * s);
    const itemOpacity = Math.max(0, 1 - 1.15 * s);
    // 三通道量化档位（0.5px / 0.001 / 1/32）
    const txQ = Math.round(transX * 2) / 2;
    const tyQ = Math.round(transY * 2) / 2;
    const scQ = Math.round(itemScale * 1000) / 1000;
    const opQ = Math.round(itemOpacity * 32) / 32;
    if (item.lastTxQ !== txQ || item.lastTyQ !== tyQ || item.lastScQ !== scQ) {
      item.lastTxQ = txQ; item.lastTyQ = tyQ; item.lastScQ = scQ;
      item.el.style.transform = `translate3d(${txQ.toFixed(1)}px, ${tyQ.toFixed(1)}px, 0) scale(${scQ.toFixed(3)})`;
    }
    if (item.lastOpQ !== opQ) {
      item.lastOpQ = opQ;
      item.el.style.opacity = opQ.toFixed(3);
    }
  } else {
    if (item.lastTxQ !== 0) {
      item.lastTxQ = 0; item.lastTyQ = 0; item.lastScQ = 1; item.lastOpQ = 1;
      item.el.style.transform = '';
      item.el.style.opacity = '';
    }
  }
}

/**
 * 逐帧推进放射并行物理场 — 由统一渲染循环调用
 * 独立于窗口缩放弹簧：每个图标按自己的节奏错峰响应，形成波浪传导
 */
function updateRadialField(dt, now) {
  if (radialField.items.length === 0) return;
  const target = (state.isOpen && !state.isClosing) ? 1 : 0;

  if (radialField.isIdle) {
    // 已稳定：仅当目标被外部改变时才恢复逐帧推进
    let allAtTarget = true;
    for (const i of radialField.items) {
      if (i.spring.target !== target) { allAtTarget = false; break; }
    }
    if (allAtTarget) return;
    radialField.isIdle = false;
  }

  let allSettled = true;
  for (const item of radialField.items) {
    if (item.spring.target !== target) item.spring.setTarget(target);
    if (now >= item.startAt) item.spring.update(dt);
    const s = clamp(item.spring.x, -0.1, 1.2);
    if (!item.spring.isSettled(0.004, 0.4)) allSettled = false;
    applyRadialItemStyle(item, s);
  }

  if (allSettled) {
    if (target === 0) {
      clearRadialField(); // 完全归位：释放缓存与内联样式
    } else {
      radialField.isIdle = true; // 完全散开：挂起逐帧写入，等待关闭时恢复
    }
  }
}

/** 拖拽期间将放射场进度与窗口缩放进度 1:1 手动同步（跟手；释放后交还弹簧驱动） */
export function syncRadialFieldToProgress(p) {
  if (radialField.items.length === 0) return;
  const s = clamp(p, 0, 1);
  radialField.items.forEach((i) => {
    i.spring.x = s;
    i.spring.v = 0;
    i.spring.target = s;
    applyRadialItemStyle(i, s);
  });
}

/** 是否存在仍在飞行的并行动画（Closing Actor 或未稳定的放射场） */
export function isParallelAnimationActive() {
  return closingActors.length > 0 || (radialField.items.length > 0 && !radialField.isIdle);
}

/**
 * 渲染窗口进度联动的多图层并行动画（壁纸景深与文件夹面板）
 * 注：放射状图标动画已升级为独立物理场（updateRadialField），不再随窗口进度全局插值
 * 毛玻璃已预烘焙：优先推动预模糊图层 opacity（纯合成器操作）；快照不可用时回退旧滤镜路径
 */
function renderParallelAnimations(p) {
  // ---------- 1. 桌面壁纸与景深多图层并行动画 (非线性平滑过渡) ----------
  const brightness = 1 - 0.16 * p;
  const desktopScale = 1 - 0.05 * p;

  if (p > 0.001) {
    dom.desktop.style.transform = `scale(${desktopScale.toFixed(4)})`;
    if (isBlurSnapshotReady()) {
      // 预烘焙路径：只改透明度，零逐帧滤镜；压暗已烘焙进快照
      dom.desktop.style.filter = '';
      setDesktopBlurProgress(p);
    } else {
      // 回退路径：与旧实现一致（快照未就绪时仍保证正确视觉）
      const blurPx = 12 * (p * p); // 二次非线性曲线，起步零模糊突变，终点自然深景深
      dom.desktop.style.filter = `blur(${blurPx.toFixed(1)}px) brightness(${brightness.toFixed(3)})`;
    }
    if (dom.pageDots) {
      dom.pageDots.style.opacity = Math.max(0, 1 - p * 2).toFixed(3);
      dom.pageDots.style.transform = `translate3d(0, ${(16 * p).toFixed(1)}px, 0)`;
    }
    const glanceWidget = cachedEl('pixelAtAGlance');
    if (glanceWidget) {
      // v7.34 过渡对抗中和：元素常态带 opacity/transform 过渡（hover/入场用），
      // 逐帧 JS 写入会把每帧都变成「重启一次 0.22s 过渡」——渲染值永久滞后于
      // 弹簧目标 + 每帧双份样式重算（本次全项目动画审计的掉帧主源之一）。
      // 驱动期 inline transition:none（同值写入零成本），复位分支清空恢复常态。
      glanceWidget.style.transition = 'none';
      glanceWidget.style.opacity = Math.max(0, 1 - p * 2.5).toFixed(3);
      glanceWidget.style.transform = `translate3d(0, ${(-16 * p).toFixed(1)}px, 0)`;
    }
    const searchPill = cachedEl('desktopSearchWidget');
    if (searchPill) {
      searchPill.style.transition = 'none'; // v7.34：同上（.desktop-search-pill 常态 transition:all 0.25s）
      searchPill.style.opacity = Math.max(0, 1 - p * 2.5).toFixed(3);
      searchPill.style.transform = `translateX(-50%) translate3d(0, ${(20 * p).toFixed(1)}px, 0)`;
    }
  } else {
    dom.desktop.style.filter = '';
    dom.desktop.style.transform = '';
    hideDesktopBlur();
    if (dom.pageDots) {
      dom.pageDots.style.opacity = '';
      dom.pageDots.style.transform = '';
    }
    const glanceWidget = cachedEl('pixelAtAGlance');
    if (glanceWidget) {
      glanceWidget.style.opacity = '';
      glanceWidget.style.transform = '';
      glanceWidget.style.transition = ''; // v7.34：恢复常态过渡（hover/入场）
    }
    const searchPill = cachedEl('desktopSearchWidget');
    if (searchPill) {
      searchPill.style.opacity = '';
      searchPill.style.transform = '';
      searchPill.style.transition = '';
    }
  }

  // ---------- 2. 文件夹面板并行动画 ----------
  if (radialField.context === 'folder' && dom.folderOverlay) {
    const panel = dom.folderOverlay.querySelector('.folder-panel');
    if (panel) {
      const panelScale = 1 + 0.12 * p;
      const panelOpacity = Math.max(0, 1 - p * 1.5);
      panel.style.transform = `scale(${panelScale.toFixed(3)})`;
      panel.style.opacity = panelOpacity.toFixed(3);
    }
    // 遮罩（含毛玻璃背景）与面板同步淡入淡出：开应用渐隐收场、关应用渐隐归还
    dom.folderOverlay.style.opacity = Math.max(0, 1 - p * 1.6).toFixed(3);
  }
}



/**
 * 图标"接收"恢复（v7.11.1 幂等重写）：窗口/Actor 缩回图标落位时恢复原图标。
 *
 * 与旧版 pop 弹跳的本质区别（根治三类视觉泄漏）：
 *  1. 幂等全恢复 —— 不管图标处于哪种损坏态（launch-hidden 残留=消失、
 *     receive 动画中断残留=半途淡化、波场/手势遗留 inline 冻结），一次调用全部归零。
 *     恢复路径不再依赖「动画正常走完」，任何中断路径的下一站必然修复。
 *  2. 静默模式（opts.silent）—— 在被其他窗口/Actor 遮挡的下层恢复时零动画零闪现，
 *     彻底消除"幽灵图标弹跳"（旧版 Actor settle 前的 pop 弹跳透过收缩中的窗口可见）。
 *  3. 轻淡入模式（默认）—— 主窗口关闭尾段用户直视，图标随 genie 收缩渐显
 *     （交叉淡入质感）。fade 是纯 opacity CSS 动画：both fill 终态恒为正常，
 *     中断天然免疫 —— 不再有任何逐帧 inline 写入可被冻结。
 * 幂等守卫：图标已处于正常态时直接返回，render 循环逐帧调用安全（不会重启动画）。
 * @param {HTMLElement|null} iconEl
 * @param {{silent?: boolean}} [opts] silent=true 时静默恢复（下层无闪现）
 */
function popHomeIcon(iconEl, opts) {
  if (!iconEl || !iconEl.classList) return;
  const silent = !!(opts && opts.silent);
  // 幂等守卫：仅当图标确实处于隐藏/损坏/动画残留态才执行恢复
  const needsRestore = iconEl.classList.contains('launch-hidden')
    || iconEl.classList.contains('icon-receive-pop')
    || iconEl.classList.contains('icon-receive-fade')
    || iconEl.style.opacity !== ''
    || iconEl.style.transform !== ''
    || iconEl.style.visibility !== '';
  if (!needsRestore) return;
  iconEl.classList.remove('launch-hidden', 'icon-receive-pop');
  delete iconEl.dataset.iconFadePending;
  iconEl.style.opacity = '';
  iconEl.style.transform = '';
  iconEl.style.visibility = '';
  iconEl.style.willChange = '';
  if (silent) return;
  // 轻淡入：0.16s 纯 opacity（无位移弹跳）。动画 both fill 终态=正常，
  // 即使 animationend 丢失/动画被打断，视觉也停留在 opacity 1 —— 无冻结可能
  iconEl.classList.add('icon-receive-fade');
  iconEl.dataset.iconFadePending = '1';
  let cleared = false;
  const clear = () => {
    if (cleared) return;
    cleared = true;
    iconEl.classList.remove('icon-receive-fade');
    delete iconEl.dataset.iconFadePending;
    iconEl.removeEventListener('animationend', clear);
  };
  iconEl.addEventListener('animationend', clear);
  setTimeout(clear, 400); // 兜底：animationend 在极端掉帧/页面隐藏场景下可能丢失
}


/**
 * 渲染正在并行返回关闭中的独立 Actor 元素
 */
function renderClosingActor(actor, progress, cx, cy) {
  const p = clamp(progress, 0, 1);
  // v7.7：元素透明后（p<0.002 前一帧已写 opacity 0）跳过全部样式写入，
  // 仅保留弹簧积分与 settle 判定 —— 退场末段不再白耗主线程
  if (p < 0.002) {
    // v7.18 自愈兜底：Actor 自 p≈0 出生（demote 锁零路径已显式置零）或极端
    // 掉帧跳帧时，上一帧未必写过 opacity 0 —— 补一次显式归零，杜绝全屏实体残留
    if (actor.element.style.opacity !== '0') {
      actor.element.style.opacity = '0';
      if (actor.shadowEl) actor.shadowEl.style.opacity = '0';
      if (actor.glowEl) actor.glowEl.style.opacity = '0';
    }
    return;
  }
  const fxActor = !REDUCED_MOTION; // 装饰性形变总开关（与主窗口 render 同源降级）
  const screenW = window.innerWidth || document.documentElement.clientWidth;
  const screenH = window.innerHeight || document.documentElement.clientHeight;

  const iconW = actor.iconW || 58;
  const iconH = actor.iconH || 58;

  // 几何无畸变缩放
  const iconScaleX = iconW / screenW;
  const iconScaleY = iconH / screenH;
  const sx = iconScaleX + (1 - iconScaleX) * p;
  const sy = iconScaleY + (1 - iconScaleY) * p;

  const tx = cx - screenW / 2;
  const ty = cy - screenH / 2;

  // 3D 浮起微透视（随动量出现，与主窗口 render 同一物理策略）
  const screenCX = screenW / 2;
  const screenCY = screenH / 2;
  const normX = screenCX > 0 ? (actor.iconCX - screenCX) / screenCX : 0;
  const normY = screenCY > 0 ? (actor.iconCY - screenCY) / screenCY : 0;
  const momentum = fxActor ? clamp(
    Math.abs(actor.scaleSpring.v) + Math.hypot(actor.posSpring.vx, actor.posSpring.vy) / 900,
    0, 1
  ) : 0;
  const tiltEnvelope = Math.sin(Math.PI * p) * (0.35 + 0.65 * momentum);
  const rotX = fxActor ? (-normY * 5.5 * tiltEnvelope) : 0;
  const rotY = fxActor ? (normX * 5.5 * tiltEnvelope) : 0;

  // 3.5 macOS Genie 透视漏斗 + iOS 26 果冻弹性 (Squash & Stretch)
  const scaleVel = fxActor ? clamp(actor.scaleSpring.v, -3.8, 3.8) : 0;
  const jellyFactor = fxActor ? clamp(scaleVel * 0.022, -0.045, 0.055) : 0;

  const distCX = cx - actor.iconCX;
  const distCY = cy - actor.iconCY;
  const distHypot = Math.hypot(distCX, distCY) || 1;
  const dirX = Math.abs(distCX / distHypot);
  const dirY = Math.abs(distCY / distHypot);

  // 体积守恒原则 (Volume Preservation)：沿主运动方向弹性拉伸，正交轴产生微幅收缩反弹
  const stretchX = 1 + jellyFactor * (dirX - 0.5 * dirY);
  const stretchY = 1 + jellyFactor * (dirY - 0.5 * dirX);

  // macOS Genie 透视漏斗（v7.15 与主窗口同款；Actor 全程都是关闭态）：
  // 包络自 closeEngage 起成形 —— 降级瞬间（p≈1）零突变，吸入渐强；
  // v7.17 模糊独立包络（engage 后移 + 2px 量化，与主窗口同源）
  const genieG = fxActor ? (1 - smoothstep(p, GENIE.closeFull, GENIE.closeEngage)) : 0;
  const genieBlur = BLUR_PEAK * (1 - smoothstep(p, GENIE.blurEngageLo, GENIE.blurEngageHi));
  const funnelM = genieFunnelMatrix(
    genieG, GENIE.closeSuction, GENIE.closeFar,
    actor.iconCX - screenW / 2, actor.iconCY - screenH / 2,
    screenW / 2, screenH / 2
  );

  // 流体剪切扭曲：偏心图标在加速移动时产生微幅梯形剪切，模拟液态胶体在空间中的柔性形变
  const skewEnvelope = Math.sin(Math.PI * p) * (0.35 + 0.65 * momentum);
  const MAX_SKEW = (actor.iconW > 120) ? 1.0 : 2.2;
  const skewX = fxActor ? (-normX * normY * MAX_SKEW * skewEnvelope) : 0;
  const skewY = fxActor ? (normX * (1 - p * 0.45) * MAX_SKEW * 0.65 * skewEnvelope) : 0;

  // v7.15：均匀 genieSx 移除，收束交给透视漏斗（与主窗口同源）
  const sxRender = sx * stretchX;
  const syRender = sy * stretchY;
  // v7.7：与主窗口同款量化步进（v7.17 放宽到 2px），档位不变不写 filter
  const genieQ = Math.round(genieBlur / 2) * 2;

  // 圆角平滑连续转换（打开与关闭全程连贯形变）
  const iconCornerR = (actor.iconW > 120) ? 28 : 16;
  const windowCornerR = 36;
  const visualR = iconCornerR + (windowCornerR - iconCornerR) * smoothstep(p, 0, 1);
  const rx = visualR / Math.max(sxRender, 0.001);
  const ry = visualR / Math.max(syRender, 0.001);

  actor.element.style.transform =
    `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0px) scale(${sxRender.toFixed(5)}, ${syRender.toFixed(5)}) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) skewX(${skewX.toFixed(2)}deg) skewY(${skewY.toFixed(2)}deg)` + funnelM;
  // v7.7：圆角 0.5px 量化（与主窗口 v7.5 同款）—— border-radius 连续变值触发
  // 全元素每帧重绘，是切换动画掉帧元凶之一
  const rQx = Math.round(rx * 2) / 2;
  const rQy = Math.round(ry * 2) / 2;
  if (rQx !== actor._lastRQx || rQy !== actor._lastRQy) {
    const rVal = `${rQx.toFixed(1)}px / ${rQy.toFixed(1)}px`;
    actor.element.style.borderRadius = rVal;
    if (actor.shadowEl) actor.shadowEl.style.borderRadius = rVal;
    if (actor.glowEl) actor.glowEl.style.borderRadius = rVal;
    actor._lastRQx = rQx;
    actor._lastRQy = rQy;
  }
  // v7.17：高光独立兄弟层直驱 opacity（替代 --glass-glow 变量驱动的 ::after 全窗重绘）；
  // Actor 渐隐包络同源相乘，杜绝 Actor 已淡出后高光残留
  // v7.18：包络区间与主窗口关闭渐隐 smoothstep(p,0.002,0.12) 对齐 —— 降级瞬间
  // （任一中段 p）透明度严格连续，旧 (0.002,0.20) 在 p∈(0.05,0.2) 段比主窗口淡
  // 最多 8 个百分点，快速切换时可感知一次变暗跳变
  const actorFade = smoothstep(p, 0.002, 0.12);
  const glowQ = Math.round(0.85 * Math.sin(Math.PI * p) * 20) / 20;
  if (actor.glowEl) {
    const glowOp = Math.round(glowQ * actorFade * 20) / 20;
    if (glowOp !== actor._lastGlowQ) {
      actor.glowEl.style.opacity = glowOp.toFixed(2);
      actor._lastGlowQ = glowOp;
    }
    // transform 逐帧跟随（档位守卫只约束 opacity，可见期内必须同帧同步）
    if (glowOp > 0.001) actor.glowEl.style.transform = actor.element.style.transform;
  }
  if (genieQ !== actor._lastGenieQ) {
    actor.element.style.filter = genieQ >= 2 ? `blur(${genieQ}px)` : '';
    actor._lastGenieQ = genieQ;
  }

  // 阴影合成层化（v7.7）：旧实现逐帧改写 actor box-shadow（blur 15→40 连续插值）
  // 全窗口每帧重绘。现改为静态双阴影独立兄弟层（同主窗口 v7.5 方案），
  // JS 只驱动 opacity / transform / 量化圆角 —— 全部合成器属性，动画期零重绘；
  // v7.17：乘 Actor 渐隐包络 —— 修复 Actor 淡出后游离阴影残留数帧的瑕疵
  if (actor.shadowEl) {
    actor.shadowEl.style.transform = actor.element.style.transform;
    actor.shadowEl.style.opacity = ((1 - smoothstep(p, 0.85, 1.0)) * actorFade).toFixed(3);
  }

  // 逆缩放补偿
  const fullIconSize = 120;
  const targetIconSize = Math.min(iconW, 58);
  const iconTargetScale = (targetIconSize / fullIconSize) + (1 - targetIconSize / fullIconSize) * p;
  const invScaleX = iconTargetScale / Math.max(sx, 0.001);
  const invScaleY = iconTargetScale / Math.max(sy, 0.001);
  if (actor.launchIconContainer) {
    actor.launchIconContainer.style.transform = `scale(${invScaleX.toFixed(4)}, ${invScaleY.toFixed(4)})`;
  }

  // v7.17 实况内容优先：Actor 全程都是关闭态，且托管的是活实例（或占位卡片回退）——
  // 内容恒显、启动屏恒隐，收尾由 Actor 整体渐隐包络接管（根治切换退场的「假截图卡」：
  // 旧实现内容 p<0.22 淡出、启动屏反向淡入，Actor 后半程变成纯色+图标卡飞行）
  if (actor.header) actor.header.style.opacity = '1';
  if (actor.pageStackEl) actor.pageStackEl.style.opacity = '1';
  if (actor.gestureEl) actor.gestureEl.style.opacity = '0.25';
  if (actor.windowStatusBar) actor.windowStatusBar.style.opacity = '1';
  if (actor.launchScreen) actor.launchScreen.style.opacity = '0';

  // 渐隐消失并提前无缝交接原图标
  // （v7.11.1：删除 p<0.06 的提前 popHomeIcon —— Actor 主体虽已近透明，但新窗口/
  //  其他 Actor 仍以半透明态在场，此处 pop 的弹跳会透出成"幽灵图标弹跳"。
  //  图标恢复统一收敛到 Actor settle 移除时的静默恢复（零闪现），见 frame 循环。）
  const actorOpacity = smoothstep(p, 0.002, 0.20);
  actor.element.style.opacity = actorOpacity.toFixed(3);
}


export {
  GENIE, BLUR_PEAK, genieFunnelMatrix, REDUCED_MOTION,
  closingActors, cachedEl, radialField,
  prepareRadialField, clearRadialField,
  updateRadialField, renderParallelAnimations, popHomeIcon,
  renderClosingActor,
};
// retargetRadialField / syncRadialFieldToProgress / isParallelAnimationActive
// 已在原声明处带 inline export（切割时原样保留）。
