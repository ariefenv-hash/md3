// ==================== app-window.js — 真正多应用并发并行动画物理引擎与“指哪打哪”高精度追踪 ====================
//
// 核心亮点:
//   1. “指哪打哪”动态空间追踪引擎：无论从桌面图标、文件夹内、Dock栏、Spotlight搜索还是多任务卡片打开，
//      打开时从源坐标无缝形变展开，关闭时实时重校准归巢物理坐标，精准飞回目标图标或所属文件夹，零漂移！
//   2. 真正多应用并发并行动画：前一个应用正在返回关闭的过程中，快速点击下一个应用，前一个应用的返回动画保持独立继续执行，绝不中断或瞬移
//   3. 严格层级与硬件加速：活动打开窗口 (z-index: 520) 严格位于关闭过渡窗口 (z-index: 501~510) 之上，互不干扰且无点击穿透
//   4. 几何无畸变非等比缩放 + 3D 真实透视偏转 + 逆向圆角与图标缩放补偿
//   5. 放射状多图标并行动画 (Radial Dispersion & Convergence)
//   6. 桌面壁纸、景深缩放、毛玻璃模糊与多图层联动并行
//   7. 120 FPS RK4 高精度物理弹簧积分循环
//   8. macOS Genie 透视漏斗（v7.15）：transform 链末位追加带 w 行分量的 matrix3d
//      单应矩阵 —— 靠图标一侧窗口边缘向消失点收敛的真·梯形「神奇效果」形变，
//      仍是纯合成器属性（GPU 顶点插值），iframe 内容零重绘、零额外层

import { state } from './state.js';
import { dom } from './dom.js';
import { makeSpringParams, Spring, Spring2D } from './spring.js';
import { curOpenParams, curCloseParams, setAnimPresetId, scaleAnimSpeed } from './animation-presets.js';
import { clamp, smoothstep, getIconRect } from './utils.js';
import { createDynamicIconHTML } from './dynamic-icons.js';
import { getAppIconSVG } from './app-icons.js';
import { renderPageStack, isAppInstanceWarm } from './page-stack.js';
import { initialApps } from './apps-data.js';
import { reopenFolderForReturn } from './folder.js'; // 循环引用安全：双端均为函数声明，仅运行时互调
import { playSfx } from './sound-haptics.js';
import { setLiveApps, setAnimFreezeLock } from './bg-freeze.js';

// v7.50 拆分：放射场 / Genie 漏斗 / 并行 Actor 渲染子系统 → app-window-parallel.js（本文件反向依赖，无环）
import {
  GENIE, BLUR_PEAK, genieFunnelMatrix, REDUCED_MOTION,
  closingActors, cachedEl, radialField,
  prepareRadialField, clearRadialField, retargetRadialField,
  updateRadialField, syncRadialFieldToProgress, isParallelAnimationActive,
  renderParallelAnimations, popHomeIcon, renderClosingActor,
} from './app-window-parallel.js';
// 对外 API 保持既有导入路径（gestures.js 等零改动）
export { retargetRadialField, syncRadialFieldToProgress, isParallelAnimationActive } from './app-window-parallel.js';
import { setDesktopBlurProgress, hideDesktopBlur, isBlurSnapshotReady, refreshBlurSnapshot } from './desktop-blur.js';

/**
 * 核心渲染函数 — 主活动窗口 (DOM #appWindow)
 * 几何无畸变缩放 + 3D 透视 + 逆缩放补偿 + 并行动画驱动
 * @param {number} progress — 0(图标态) → 1(全屏态)
 * @param {number} cx — 当前窗口中心 X
 * @param {number} cy — 当前窗口中心 Y
 */
// 圆角量化缓存（v7.5）：render() 跨帧复用，0.5px 一档，档位不变不写 style
let _lastRQx = null;
let _lastRQy = null;
// v7.7：玻璃高光/景深模糊量化缓存 —— filter 与自定义属性每帧变值都会触发全窗口
// 重绘/重滤镜（关闭动画中位帧耗 33ms 的元凶），量化后每场动画至多改写十几次
let _lastGlowQ = null;
let _lastGenieQ = null;

export function render(progress, cx, cy) {
  const p = clamp(progress, 0, 1);
  const screenW = window.innerWidth || document.documentElement.clientWidth;
  const screenH = window.innerHeight || document.documentElement.clientHeight;

  // v7.23 cardZoom（缩进多任务卡片）：纯几何缩放通道 —— 关闭漏斗/倾斜/剪切/果冻
  // 等全部装饰性形变，窗口全程不透明地连续缩放进卡片矩形，与卡片静态预览
  // 严丝合缝交接（「真正的缩放进入，中间完整不断裂」）
  const cardZoom = state.isClosing && state.shrinkToCard;

  const iconW = state.iconW || 58;
  const iconH = state.iconH || 58;

  // 1. 非等比几何变换，保证图标/卡片 → 全屏无畸变过渡
  // v7.15：缩放通道单独允许弹簧微过冲上探 6%（iOS 26 玻璃柔性落位微弹），
  // 其余通道（圆角/透明度/并行动画/子页）继续消费钳制后的 p —— 稳态视觉不变，
  // 落位瞬间多一层「回弹收平」的液态质感（配合果冻拉伸在速度反转期的形变）
  const pScale = clamp(progress, 0, 1.06);
  const iconScaleX = iconW / screenW;
  const iconScaleY = iconH / screenH;
  const sx = iconScaleX + (1 - iconScaleX) * pScale;
  const sy = iconScaleY + (1 - iconScaleY) * pScale;
  const fx = !REDUCED_MOTION && !cardZoom; // 装饰性形变总开关（reduced-motion / cardZoom 降级：仅保留纯缩放位移）

  // 2. 窗口中心位移（基于屏幕物理中心点）
  const tx = cx - screenW / 2;
  const ty = cy - screenH / 2;

  // 3. 3D 浮起斜向透视（随动量出现：速度峰值时倾斜最明显，落位前自然衰减 —— 物理质感）
  const screenCX = screenW / 2;
  const screenCY = screenH / 2;
  const normX = screenCX > 0 ? (state.iconCX - screenCX) / screenCX : 0;
  const normY = screenCY > 0 ? (state.iconCY - screenCY) / screenCY : 0;

  // 动量因子：缩放速度主导 + 位移速度辅助，钳制到 0~1
  const momentum = fx ? clamp(
    Math.abs(state.scaleSpring.v) + Math.hypot(state.posSpring.vx, state.posSpring.vy) / 900,
    0, 1
  ) : 0;
  const tiltEnvelope = Math.sin(Math.PI * p) * (0.35 + 0.65 * momentum);
  const MAX_TILT = (iconW > 120) ? 2.5 : 5.5; // 如果是从多任务大卡片展开，减小旋转倾斜幅度
  const rotX = fx ? (-normY * MAX_TILT * tiltEnvelope) : 0;
  const rotY = fx ? (normX * MAX_TILT * tiltEnvelope) : 0;

  // 3.5 macOS Genie 透视漏斗 + iOS 26 果冻弹性 (Squash & Stretch)
  // 3.5.1 果冻弹性 (Jelly Physics)：基于瞬时缩放速度与位移矢量推导动态挤压与拉伸（体积守恒）
  const scaleVel = fx ? clamp(state.scaleSpring.v, -3.8, 3.8) : 0;
  const jellyFactor = fx ? clamp(scaleVel * 0.022, -0.045, 0.055) : 0;

  const distCX = cx - state.iconCX;
  const distCY = cy - state.iconCY;
  const distHypot = Math.hypot(distCX, distCY) || 1;
  const dirX = Math.abs(distCX / distHypot);
  const dirY = Math.abs(distCY / distHypot);

  // 体积守恒原则 (Volume Preservation)：沿主运动方向弹性拉伸，正交轴产生微幅收缩反弹
  const stretchX = 1 + jellyFactor * (dirX - 0.5 * dirY);
  const stretchY = 1 + jellyFactor * (dirY - 0.5 * dirX);

  // 3.5.2 macOS Genie 透视漏斗（v7.15 重写）——「神奇效果」的真·梯形投射形变
  // 关闭：p 自 1→0 途中漏斗自 closeEngage 起成形、closeFull 满强度 —— 包络在
  // p=1 处恒为 0，顺带根治旧版在关窗首帧瞬间写入 0.84 压扁的可见跳变；
  // 打开：反向漏斗在 p<openRelease 内释放（窗口像液体自图标「倾泻而出」）；
  // v7.17 模糊通道独立包络（engage 后移到 p<0.55）：与形变解耦，内容可读期零失焦
  let genieG = 0;
  let genieBlur = 0;
  if (fx) {
    if (state.isClosing) {
      genieG = 1 - smoothstep(p, GENIE.closeFull, GENIE.closeEngage);
      genieBlur = BLUR_PEAK * (1 - smoothstep(p, GENIE.blurEngageLo, GENIE.blurEngageHi));
    } else {
      genieG = GENIE.openLift * (1 - smoothstep(p, 0.04, GENIE.openRelease));
    }
  }
  const funnelM = genieFunnelMatrix(
    genieG,
    state.isClosing ? GENIE.closeSuction : GENIE.openSuction,
    state.isClosing ? GENIE.closeFar : GENIE.openFar,
    state.iconCX - screenW / 2, state.iconCY - screenH / 2,
    screenW / 2, screenH / 2
  );

  // 流体剪切扭曲：偏心图标在加速移动时产生微幅梯形剪切，模拟液态胶体在空间中的柔性形变
  const skewEnvelope = Math.sin(Math.PI * p) * (0.35 + 0.65 * momentum);
  const MAX_SKEW = (iconW > 120) ? 1.0 : 2.2;
  const skewX = fx ? (-normX * normY * MAX_SKEW * skewEnvelope) : 0;
  const skewY = fx ? (normX * (1 - p * 0.45) * MAX_SKEW * 0.65 * skewEnvelope) : 0;

  // v7.15：旧版均匀 genieSx 压扁移除 —— 横向收束全部交给透视漏斗（真梯形），
  // 避免与漏斗的归一因子 k 叠加双重压缩
  const sxRender = sx * stretchX;
  const syRender = sy * stretchY;
  // v7.7：genie 模糊量化步进（v7.17 放宽到 2px 一档 —— 全屏滤镜重跑是移动端
  // 关闭掉帧主源，步进减半后整场至多 3 次重滤镜，其余帧纯合成器 transform）

  // 4. 圆角平滑连续转换（打开与关闭全程连贯形变）：
  // 从桌面图标圆角（16px / 多任务大卡片 28px）平滑过渡到窗口视口大圆角（36px），全程无突兀跳变
  const iconCornerR = (iconW > 120) ? 28 : 16;
  const windowCornerR = 36;
  const visualR = iconCornerR + (windowCornerR - iconCornerR) * smoothstep(p, 0, 1);
  const rx = visualR / Math.max(sxRender, 0.001);
  const ry = visualR / Math.max(syRender, 0.001);

  const winTransform =
    `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0px) scale(${sxRender.toFixed(5)}, ${syRender.toFixed(5)}) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) skewX(${skewX.toFixed(2)}deg) skewY(${skewY.toFixed(2)}deg)` + funnelM;
  dom.appWindow.style.transform = winTransform;
  // 圆角量化步进（v7.5）：0.5px 一档，档位不变不写 style —— 砍掉近半 paint 触发帧；
  // 阴影/高光合成层与窗口圆角同步
  const rQx = Math.round(rx * 2) / 2;
  const rQy = Math.round(ry * 2) / 2;
  if (rQx !== _lastRQx || rQy !== _lastRQy) {
    const rVal = `${rQx.toFixed(1)}px / ${rQy.toFixed(1)}px`;
    dom.appWindow.style.borderRadius = rVal;
    if (dom.windowShadowLayer) dom.windowShadowLayer.style.borderRadius = rVal;
    if (dom.windowGlowLayer) dom.windowGlowLayer.style.borderRadius = rVal;
    _lastRQx = rQx;
    _lastRQy = rQy;
  }
  // 关闭尾段窗口整体渐隐包络（v7.17 提前计算 —— 高光/阴影兄弟层同源跟随，杜绝游离层）
  // v7.23 cardZoom：全程不透明（渐隐关闭）——落位帧与卡片严丝合缝，settle 后
  // 窗口瞬时隐藏、卡片原位接管，杜绝「窗口淡出↔卡片淡入」中途透出暗背景的断裂带
  const closingFade = (state.isClosing && !cardZoom) ? smoothstep(p, 0.002, 0.12) : 1;
  // 液态玻璃边缘高光（v7.17 合成层化）：0.05 步进量化直驱 opacity（纯合成器零重绘，
  // 替代旧 --glass-glow 变量驱动的 ::after 逐帧全窗重绘）；transform 同源跟随；
  // 关闭尾段乘窗口渐隐包络（旧 ::after 在窗口内天然继承透明度，兄弟层需手动同源）
  const glowQ = Math.round(0.85 * Math.sin(Math.PI * p) * 20) / 20;
  if (dom.windowGlowLayer) {
    const glowOp = Math.round(glowQ * closingFade * 20) / 20;
    if (glowOp !== _lastGlowQ) {
      dom.windowGlowLayer.style.opacity = glowOp.toFixed(2);
      _lastGlowQ = glowOp;
    }
    // transform 逐帧跟随（与阴影层同策略）：档位守卫只约束 opacity，
    // 高光可见期内窗口每帧移动，transform 必须同帧同步
    if (glowOp > 0.001) dom.windowGlowLayer.style.transform = winTransform;
  }
  // Genie 景深模糊（仅关闭末段收束期，峰值随设备档位）：v7.17 2px 步进量化
  const genieQ = Math.round(genieBlur / 2) * 2;
  if (genieQ !== _lastGenieQ) {
    dom.appWindow.style.filter = genieQ >= 2 ? `blur(${genieQ}px)` : '';
    _lastGenieQ = genieQ;
  }

  // 5. 逆缩放补偿：启动屏图标缩放补偿
  const fullIconSize = 120;
  const targetIconSize = Math.min(iconW, 58);
  const iconTargetScale = (targetIconSize / fullIconSize) + (1 - targetIconSize / fullIconSize) * p;

  const invScaleX = iconTargetScale / Math.max(sx, 0.001);
  const invScaleY = iconTargetScale / Math.max(sy, 0.001);
  dom.launchIconContainer.style.transform = `scale(${invScaleX.toFixed(4)}, ${invScaleY.toFixed(4)})`;

  // 6. v7.17 实况内容优先交叉淡入 —— 根治「静态截图卡」观感（issue 实拍实证）：
  // 旧实现开/关双向复用同一条 smoothstep(p, 0.22, 0.72)，导致：
  //   关闭后半程：纯色背景+居中图标的启动屏反向淡入盖住真实内容（飞的是假截图卡）；
  //   打开前段：温热实例（内容早已在内存）也被启动屏遮到 p=0.72 才见实况。
  // 现按「收缩/展开」与「温热/冷启动」双维自适应：
  //   收缩（关闭/拖拽中/目标非全屏）+ warm ⇒ 内容全程可见、启动屏恒隐（iOS 真实行为：
  //     实况内容一路缩小淡入图标，收尾由窗口整体渐隐与 icon-receive-fade 接管）；
  //   收缩 + cold（iframe 尚未加载完）⇒ 保留旧曲线，启动屏回落掩护空白内容；
  //   展开 + warm ⇒ 早交叉 (0.02, 0.26)：图标形态保留前 ~10%，随后实况接管；
  //   展开 + cold ⇒ 旧慢曲线 (0.22, 0.72) 掩护首次加载；加载完成即刻升级 warm
  const shrinking = state.isClosing || state.isDragging || state.scaleSpring.target < 1;
  if (!state.contentWarm && !shrinking && state.currentApp) {
    // 冷启动升级探针：iframe 在飞行途中完成加载 → 立即切早交叉（实况提前接管）
    state.contentWarm = isAppInstanceWarm(state.currentApp.id);
  }
  let contentOp;
  if (shrinking) {
    contentOp = state.contentWarm ? 1 : smoothstep(p, 0.22, 0.72);
  } else {
    contentOp = state.contentWarm
      ? smoothstep(p, 0.02, 0.26)
      : smoothstep(p, 0.22, 0.72);
  }
  dom.header.style.opacity = contentOp.toFixed(3);
  dom.pageStack.style.opacity = contentOp.toFixed(3);
  dom.gesture.style.opacity = (contentOp * 0.25).toFixed(3);
  if (dom.appWindowStatusBar) {
    dom.appWindowStatusBar.style.opacity = contentOp.toFixed(3);
  }
  if (dom.statusBar) {
    dom.statusBar.style.opacity = (1 - smoothstep(p, 0.1, 0.7)).toFixed(3);
  }

  // 启动屏：展开期按交叉区间淡出；收缩 warm 期恒隐（实况直飞到底），
  // 收缩 cold 期与内容互补回落（掩护未加载完的空白内容）
  const launchOp = shrinking
    ? (state.contentWarm ? 0 : 1 - smoothstep(p, 0.22, 0.72))
    : 1 - contentOp;
  dom.appLaunchScreen.style.opacity = launchOp.toFixed(3);

  // 阴影合成层化（v7.5）：旧实现逐帧改写 box-shadow（blur 15→40 连续插值）触发全窗口
  // 每帧重绘，是开窗动画掉帧主因。现改为独立兄弟层只驱动 opacity/transform（均为合成器
  // 属性，零重绘）；blur/offset 取定值双阴影近似原曲线，0.5s 弹簧内肉眼不可辨。
  // v7.17：关闭尾段乘窗口整体渐隐包络 —— 修复窗口已淡出后游离阴影残留数帧的瑕疵。
  const shadowAlpha = 0.3 * (1 - smoothstep(p, 0.85, 1.0));
  if (dom.windowShadowLayer) {
    dom.windowShadowLayer.style.opacity = (shadowAlpha / 0.3 * closingFade).toFixed(3);
    dom.windowShadowLayer.style.transform = winTransform;
  }

  if (state.isClosing) {
    if (cardZoom) {
      // v7.23：缩进卡片通道 —— 窗口全程不透明；落位帧与卡片几何完全重合，
      // settle 后 finishAnim 瞬时隐藏窗口，视觉上由卡片无缝接管（零交叉淡入）
      if (dom.appWindow.style.opacity !== '1') dom.appWindow.style.opacity = '1';
    } else {
      const winOp = smoothstep(p, 0.002, 0.12);
      dom.appWindow.style.opacity = p <= 0.12 ? winOp.toFixed(3) : '1';
      if (p < 0.06 && state.currentIconEl) {
        popHomeIcon(state.currentIconEl);
      }
    }
  } else {
    dom.appWindow.style.opacity = '1';
  }

  // 7. 驱动多元素联动并行动画 (壁纸、景深、放射状图标推开/聚拢)
  renderParallelAnimations(p);

  // 8. 并行渲染：多级子页面弹簧驱动
  renderSubPages();
}

// ==================== 手势期渲染合帧（rAF 节流） ====================
// 高频 pointermove 每事件直达 render() 会以事件率（可达 120Hz+）写 ~20 处样式，
// 造成合成层抖动与闪屏。改为：状态/弹簧即时更新，DOM 写入按帧合并（每帧最多一次，
// 永远取最新值）；手势结束先 flush 再交接物理，保证弹簧初值与画面零偏差。

let pendingGestureVisual = null;
let gestureVisualRafId = 0;

function applyGestureVisual(v) {
  if (v.main) {
    if (v.syncRadial) syncRadialFieldToProgress(v.p);
    render(v.p, v.cx, v.cy);
  }
  if (v.forceSub) renderSubPages(true);
}

/**
 * 调度一帧手势渲染（同帧重复调用只保留最新参数， DOM 每帧至多写一次）
 * @param {number} p 缩放进度
 * @param {number} cx 窗口中心 X
 * @param {number} cy 窗口中心 Y
 * @param {{main?: boolean, syncRadial?: boolean, forceSub?: boolean}} [opts] main=false 时只刷子页面（子页面拖拽通道）
 */
export function scheduleGestureRender(p, cx, cy, opts = {}) {
  pendingGestureVisual = { p, cx, cy, main: opts.main !== false, syncRadial: !!opts.syncRadial, forceSub: !!opts.forceSub };
  if (gestureVisualRafId) return;
  gestureVisualRafId = requestAnimationFrame(() => {
    gestureVisualRafId = 0;
    const v = pendingGestureVisual;
    pendingGestureVisual = null;
    if (v) applyGestureVisual(v);
  });
}

/** 立即应用尚未落帧的手势渲染（手势结束时调用，防末帧丢失/错帧交接） */
export function flushGestureRender() {
  if (gestureVisualRafId) {
    cancelAnimationFrame(gestureVisualRafId);
    gestureVisualRafId = 0;
  }
  const v = pendingGestureVisual;
  pendingGestureVisual = null;
  if (v) applyGestureVisual(v);
}

/**
 * 多级子页面渲染 —— subpageSpring 是唯一真源。
 * 推入/弹出/边缘拖拽全部写同一个弹簧，保证来回物理完全对称。
 * @param {boolean} force 拖拽期间手势需要手动刷帧时传 true（循环自身会跳过拖拽）
 */
// v7.34 重绘属性量化缓存：renderSubPages 在预测式返回手势与子页弹簧期间被逐帧调用，
// 其中 borderRadius / boxShadow / filter 是重绘（或重滤镜）属性 —— 原实现每帧直写，
// 整场返回动画伴随 50+ 次全页重绘。量化到视觉无损档位（半径 2px / 阴影 α 0.05 /
// 亮度 0.04）+ 字符串脏检查后，重绘次数降至 ~10 次；transform 仍逐帧写（纯合成器）。
// WeakMap 键元素销毁自动回收（页面实例随导航栈重建）。
const _subPageQ = new WeakMap();
function quantSubPage(el, key, value, write) {
  let cache = _subPageQ.get(el);
  if (!cache) { cache = {}; _subPageQ.set(el, cache); }
  if (cache[key] === value) return;
  cache[key] = value;
  write(value);
}

export function renderSubPages(force = false) {
  if (!state.currentApp || state.navHistory.length < 2) return;
  if (state.isDragging && !force) return;

  let subP = clamp(state.subpageSpring.x, 0, 1);
  // v7.50 铺满吸附：subpageSpring 落定精度 posEps 内停机，残差 ~0.5% 永久留在
  // 表面（二级页边缘露出底色细缝，「二级菜单没能铺满整个应用内容窗口」根因）。
  // 距目标 <0.5% 即视为完全在场，rest 态几何严格归位。
  if (1 - subP < 0.005) subP = 1;
  const activeIdx = state.navHistory[state.navHistory.length - 1];
  const prevIdx = state.navHistory[state.navHistory.length - 2];
  const activePage = document.getElementById(`app-page-${state.currentApp.id}-${activeIdx}`);
  const prevPage = document.getElementById(`app-page-${state.currentApp.id}-${prevIdx}`);

  if (activePage && prevPage) {
    // 预览式返回 (Android Predictive Back 规范)：
    // 1. 上层一级菜单 (prevPage)：位置尺寸始终保持在原位 (scale 1.0, tx 0)，仅随返回进度压暗与恢复
    const backProgress = 1 - subP; // 0=二级菜单全屏在场, 1=已完全返回一级菜单
    prevPage.style.transform = 'translate3d(0, 0, 0) scale(1)';
    prevPage.style.opacity = '1';
    // 亮度量化：基值 0.65 保端点，增量按 0.04 档量化（终值钳回 1）
    const prevBrightness = Math.min(1,
      0.65 + Math.round((0.35 * backProgress) / 0.04) * 0.04).toFixed(2);
    quantSubPage(prevPage, 'filter', subP < 1 ? `brightness(${prevBrightness})` : '',
      (v) => { prevPage.style.filter = v; });
    prevPage.style.borderRadius = '0';

    // 2. 拖动的二级菜单 (activePage)：横向位移 + 大小缩放 (缩放有上限：最小 0.90) + 悬浮大圆角与景深阴影
    // v7.41 方向感知 + 垂直跟随（Android 14 预测式返回）：
    //   · dir 由手势入口写入（左缘右滑=+1 / 右缘左滑=-1；按钮触发=0 → 规范右滑）
    //   · tx 跟随手势方向：右缘左滑时页面左移揭示上级，左缘右滑时右移（原行为）
    //   · ty = subpageBackTy × backProgress：纵向随手指上下位移，随返回进度出现，
    //     松手后随同一弹簧返回/弹出自动收敛；上级菜单仍仅压暗（无弹入弹出）
    const dir = state.subpageBackDir === -1 ? -1 : 1;
    const tx = dir * backProgress * 100;
    const ty = clamp(state.subpageBackTy || 0, -200, 200) * backProgress;
    const scale = Math.max(0.90, 1 - 0.10 * backProgress);
    const radius = Math.round((backProgress * 28) / 2) * 2;
    // 阴影 α 按 0.05 档量化（0 与 0.45 端点保真），blur/offset 恒定
    const shadowAlpha = (Math.round((0.45 * backProgress) / 0.05) * 0.05).toFixed(2);
    const shadow = backProgress > 0.01
      ? `0 16px 44px rgba(0,0,0,${shadowAlpha}), 0 2px 10px rgba(0,0,0,0.2)`
      : '';

    activePage.style.transform = `translate3d(${tx.toFixed(2)}%, ${ty.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
    quantSubPage(activePage, 'radius', `${radius}px`,
      (v) => { activePage.style.borderRadius = v; });
    quantSubPage(activePage, 'shadow', shadow,
      (v) => { activePage.style.boxShadow = v; });
    activePage.style.transformOrigin = 'center center';
    // v7.38：overflow 锁只在动画/拖拽进行期（backProgress > 0.01）持有，落定帧恢复 ''。
    // 旧实现每帧无条件写 'hidden' 且全程无恢复点 —— 子页推入后 .app-page 的滚动通道
    // 被内联样式永久压死（E2E 实锤：设置→壁纸子页 348px 内容触摸零滚动）。
    // 阈值 0.01 > 弹簧 settle 精度 posEps=0.005，保证落定帧（backProgress≤0.005）必然走恢复分支。
    quantSubPage(activePage, 'overflow', backProgress > 0.01 ? 'hidden' : '',
      (v) => { activePage.style.overflow = v; });
  }
}

// ==================== 统一多应用物理渲染循环 ====================

/** 启动统一 RK4 物理积分循环（时间累积器：掉帧不慢放；主窗口 / Actor / 放射场同循环驱动） */
export function startLoop(params) {
  if (params) {
    state.posSpring.reconfigure(params);
    state.scaleSpring.reconfigure(params);
  }
  // v7.42：在途卡片飞行（flyAppToCard）被渲染循环接管（开窗承接/关闭归巢）——
  // 旧实现飞行循环持有 state.rafId 且不被任何路径取消，承接路径 startLoop
  // 早退后飞行继续把窗口缩进卡片，应用「打不开」。这里显式中止飞行：
  // 飞行帧检测 flightActive=false 后静默退场（不碰 rafId），本循环接管动画。
  if (state.flightActive) {
    state.flightActive = false;
    if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
  }
  if (state.rafId) return;

  const STEP = 1 / 120;
  const MAX_SUBSTEPS = 30; // 单帧最多补偿 250ms，超出部分丢弃（防死亡螺旋，杜绝慢放）
  let accumulator = 0;
  let lastTime = performance.now();

  function frame(now) {
    let rawDt = (now - lastTime) / 1000;
    lastTime = now;
    if (rawDt > 0.25) rawDt = 0.25; // 页签挂起等极端场景保护
    accumulator += rawDt;

    let steps = 0;
    while (accumulator >= STEP && steps < MAX_SUBSTEPS) {
      // 1. 主活动窗口弹簧（拖拽期间由手势手动跟踪，循环跳过避免相互对抗）
      if ((state.isOpen || state.isClosing) && !state.isDragging) {
        state.posSpring.update(STEP);
        state.scaleSpring.update(STEP);
        // 返回关闭时彻底切断下穿反弹：一旦到达或越过 0，立即锁定归零，绝无二次弹跳
        if ((state.isClosing || state.scaleSpring.target === 0) && state.scaleSpring.x <= 0) {
          state.scaleSpring.x = 0;
          state.scaleSpring.v = 0;
        }
        state.subpageSpring.update(STEP);
      }
      // 2. 并行 Closing Actors — 各自独立积分，绝不互相阻塞
      for (let idx = 0; idx < closingActors.length; idx++) {
        const actor = closingActors[idx];
        actor.posSpring.update(STEP);
        actor.scaleSpring.update(STEP);
        if (actor.scaleSpring.target === 0 && actor.scaleSpring.x <= 0) {
          actor.scaleSpring.x = 0;
          actor.scaleSpring.v = 0;
        }
      }
      accumulator -= STEP;
      steps++;
    }
    if (accumulator >= STEP) accumulator = 0;

    // 3. 放射状多图标并行物理场（装饰层，整帧推进，dt 夹紧保证 RK4 稳定）
    updateRadialField(Math.min(rawDt, 0.05), now);

    // 4. 渲染主活动窗口
    if (state.isOpen || state.isClosing) {
      const curCX = state.iconCX + state.posSpring.px;
      const curCY = state.iconCY + state.posSpring.py;
      render(state.scaleSpring.x, curCX, curCY);
    }

    // 5. 渲染并回收 Closing Actors
    for (let idx = closingActors.length - 1; idx >= 0; idx--) {
      const actor = closingActors[idx];
      const actorCX = actor.iconCX + actor.posSpring.px;
      const actorCY = actor.iconCY + actor.posSpring.py;
      renderClosingActor(actor, actor.scaleSpring.x, actorCX, actorCY);

      // 如果该关闭 Actor 已稳定到达目标（图标位置，scale <= 0）
      // v7.19：scale 锁零 = 内容已缩放到 0 且渐隐包络到头（renderClosingActor 的
      // p≤0.002 早退分支保证 opacity 恒 '0'），Actor 在视觉上已完全消失 ——
      // 位置弹簧残存的亚像素收敛（posEps=0.005px）不再有任何可见意义。
      // 慢光栅环境（headless 软渲染/录屏，rAF 可低至 ~7fps，物理时间每帧仅
      // 钳制推进 0.25s）下该收敛尾部可拖长数秒，造成「不可见 Actor 常驻 DOM +
      // 渲染循环空转」。故 scale 锁零即视觉终态，直接回收（E2E C 场景实证）。
      const actorVisuallyGone = actor.scaleSpring.x <= 0.0001;
      if (actor.scaleSpring.isSettled() && (actor.posSpring.isSettled() || actorVisuallyGone)) {
        // v7.17：统一经 disposeActorElements 回收（先营救活实例回 page-stack 续命，
        // 再移除内容/阴影/高光三层 DOM）
        disposeActorElements(actor);
        if (actor.iconEl) {
          // v7.11.1：静默恢复（非旧版 pop 弹跳）—— 此刻图标可能仍被新窗口/其他
          // 在途 Actor 遮挡，零动画恢复无任何可见变化；即便完全裸露（直视关闭），
          // 图标也只是"直接就位"，与 iOS 真实行为一致，无弹跳闪现
          popHomeIcon(actor.iconEl, { silent: true });
        }
        closingActors.splice(idx, 1);
      }
    }

    // 5.5 子页面返回弹簧收敛 → 真正弹出导航栈
    // （物理到位后才交接，取代 setTimeout 硬切，返回动画与推入完全对称、零跳变）
    if (state.popInProgress && !state.isDragging && state.subpageSpring.isSettled()) {
      state.popInProgress = false;
      if (state.navHistory.length > 1) {
        state.navHistory.pop();
        renderPageStack();
      }
    }

    // 6. 稳定判定：主窗口 + 全部 Actor + 放射场全部归位才停循环
    const mainIdle = !state.isOpen && !state.isClosing;
    const mainSettled = mainIdle || (
      state.scaleSpring.isSettled() &&
      state.posSpring.isSettled() &&
      state.subpageSpring.isSettled()
    );
    const radialIdle = radialField.items.length === 0 || radialField.isIdle;

    if (mainSettled && closingActors.length === 0 && radialIdle) {
      // v7.50 落定终值吸附：主循环 settle 后直接停机，三根弹簧的收敛阈值内残差
      // （subpage ~0.5% → 二级页边缘 2px 露底缝）不写终值就永久留在表面。
      // 停机前精确吸附到目标 + 补一次终帧渲染，rest 态严格归位。
      // 拖拽期不吸附不补帧（弹簧由手势手动跟踪，渲染走手势自己的通道）。
      if (!state.isDragging) {
        [state.posSpring, state.scaleSpring, state.subpageSpring].forEach((s) => {
          if (typeof s.isSettled !== 'function' || !s.isSettled()) return;
          if (s.x && typeof s.x === 'object') {
            // Spring2D（posSpring）：双轴分别吸附（.x/.y 为内部一维弹簧）
            s.x.x = s.x.target; s.x.v = 0;
            s.y.x = s.y.target; s.y.v = 0;
          } else {
            s.x = s.target;
            s.v = 0;
          }
        });
        renderSubPages(true);
      }
      finishAnim();
      return;
    }

    state.rafId = requestAnimationFrame(frame);
  }

  state.rafId = requestAnimationFrame(frame);
}

/** 弹簧稳定后的清理 */
function finishAnim() {
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }

  // v7.38 自愈兜底：动画收尾时清空子页残留的 overflow 锁。正常路径已由
  // renderSubPages 落定帧恢复（backProgress≤0.01 → ''）；此处兜住极端掉帧
  // settle 边界 / 历史会话残留 —— 与 v7.18「Actor 落定自愈」同型纪律。
  // 仅命中带内联 overflow 的 app-page 元素（files 舞台锁等其它内联锁不在其列）。
  document.querySelectorAll('[id^="app-page-"]').forEach((p) => {
    if (p.style.overflow) p.style.overflow = '';
  });

  // v7.12 帧率：动画终点解锁内容冻结锁 —— 打开/关闭动画均已走完，恢复
  // app 实例 live 更新（锁压制期间最后一次 setLiveApps 申请自动生效）
  try { setAnimFreezeLock(false); } catch (e) {}

  if (state.scaleSpring.target === 1 && state.isOpen && !state.isClosing) {
    // 打开完成：全屏无 transform，提升性能
    dom.appWindow.style.transform = '';
    dom.appWindow.style.transition = ''; // v7.23：快速切换回弹残留兜底清理
    state.shrinkToCard = false;
    dom.appWindow.style.borderRadius = '';
    dom.appWindow.style.boxShadow = '';
    dom.appWindow.style.visibility = ''; // v7.35：可见性归还 .open 类管（防内联残留压死 CSS）
    // v7.9-B：清理连续缩放/卡片展开路径的临时内联 z（deck 之上展开后归队）
    dom.appWindow.style.zIndex = '';
    if (dom.windowShadowLayer) dom.windowShadowLayer.style.zIndex = '';
    if (dom.windowShadowLayer) {
      dom.windowShadowLayer.style.transform = '';
      dom.windowShadowLayer.style.borderRadius = '';
      dom.windowShadowLayer.style.opacity = '0';
    }
    // v7.17：高光合成层复位（打开完成 → 稳态零开销）
    if (dom.windowGlowLayer) {
      dom.windowGlowLayer.style.opacity = '0';
      dom.windowGlowLayer.style.transform = '';
      dom.windowGlowLayer.style.borderRadius = '';
    }
    _lastRQx = null;
    _lastRQy = null;
    _lastGlowQ = null;
    _lastGenieQ = null;
    dom.appWindow.style.opacity = '1';
    dom.appWindow.style.filter = '';
    dom.launchIconContainer.style.transform = '';
    dom.appLaunchScreen.style.opacity = '0';
    dom.header.style.opacity = '1';
    dom.pageStack.style.opacity = '1';
    dom.gesture.style.opacity = '0.25';
    if (dom.appWindowStatusBar) dom.appWindowStatusBar.style.opacity = '1';
    if (dom.statusBar) dom.statusBar.style.opacity = '0';
    // 应用全屏后桌面保持虚化态：优先预烘焙图层（零持续滤镜开销），回退静态滤镜
    dom.desktop.style.transform = 'scale(0.95)';
    if (isBlurSnapshotReady()) {
      dom.desktop.style.filter = '';
      refreshBlurSnapshot(); // 视频壁纸取当前帧，静态壁纸命中缓存直接返回
      setDesktopBlurProgress(1);
    } else {
      dom.desktop.style.filter = 'blur(12px) brightness(0.84)';
    }
    dom.appWindow.style.pointerEvents = 'auto';

    // v7.11.1 安全网：打开态下桌面不应有任何 launch-hidden 图标残留 ——
    // 正常语义下仅当前应用的图标（currentIconEl）隐藏。快速切换的中断路径
    // （demote 后唤回竞态、承接反转等）可能让旧应用图标残留隐藏态（opacity:0
    // !important），图标"消失"直到下次窗口完全关闭才被恢复。在此统一兜底摘除，
    // 摘类即恢复，不触碰波场托管的其他图标 inline 样式。
    document.querySelectorAll('.launch-hidden').forEach((el) => {
      if (el === state.currentIconEl) return;
      el.classList.remove('launch-hidden');
    });

    // 应用已全屏：收起文件夹浮层（从文件夹打开的淡出已随动画完成，此处仅收尾复位）
    if (dom.folderOverlay && dom.folderOverlay.classList.contains('active')) {
      dom.folderOverlay.classList.remove('active');
      dom.folderOverlay.style.background = '';
      dom.folderOverlay.style.backdropFilter = '';
      dom.folderOverlay.style.webkitBackdropFilter = '';
      dom.folderOverlay.style.opacity = '';
      dom.folderOverlay.style.transition = '';
      dom.folderOverlay.style.pointerEvents = 'auto';
      const fp = dom.folderOverlay.querySelector('.folder-panel');
      if (fp) { fp.style.transition = ''; fp.style.transform = ''; fp.style.opacity = ''; }
    }
  } else if (state.isClosing || state.scaleSpring.target === 0) {
    // 渲染最终第 0 帧，确保窗口在销毁前完全吻合到 0 位置
    render(0, state.iconCX, state.iconCY);
    state.shrinkToCard = false; // v7.23：关闭完成，cardZoom 语义终结
    // v7.53：在 currentApp 置空前捕获关闭的应用 id（小窗接管信号需要）
    const closedAppId = state.currentApp ? state.currentApp.id : null;

    // 关闭完成：重置所有状态与样式
    dom.appWindow.classList.remove('open', 'closing');
    dom.appWindow.style.visibility = ''; // v7.35：防内联残留压死 .open 类（可见性归还类管）
    dom.appWindow.style.transform = '';
    dom.appWindow.style.transition = ''; // v7.23：快速切换回弹残留兜底清理
    dom.appWindow.style.borderRadius = '';
    dom.appWindow.style.boxShadow = '';
    // v7.9-B：清理缩进卡片路径的临时内联 z（窗口已隐藏，归位 CSS 层级）
    dom.appWindow.style.zIndex = '';
    if (dom.windowShadowLayer) dom.windowShadowLayer.style.zIndex = '';
    if (dom.windowShadowLayer) {
      dom.windowShadowLayer.style.transform = '';
      dom.windowShadowLayer.style.borderRadius = '';
      dom.windowShadowLayer.style.opacity = '0';
    }
    // v7.17：高光合成层复位（关闭完成 → 稳态零开销）
    if (dom.windowGlowLayer) {
      dom.windowGlowLayer.style.opacity = '0';
      dom.windowGlowLayer.style.transform = '';
      dom.windowGlowLayer.style.borderRadius = '';
    }
    _lastRQx = null;
    _lastRQy = null;
    _lastGlowQ = null;
    _lastGenieQ = null;
    dom.appWindow.style.opacity = '';
    dom.appWindow.style.filter = '';
    dom.launchIconContainer.style.transform = '';
    dom.desktop.style.filter = '';
    dom.desktop.style.transform = '';
    hideDesktopBlur();
    if (dom.folderOverlay) {
      if (state.returnToFolderOnClose) {
        // 归还文件夹：浮层保持打开且可交互，仅复位动画接管的内联样式
        dom.folderOverlay.style.background = '';
        dom.folderOverlay.style.backdropFilter = '';
        dom.folderOverlay.style.webkitBackdropFilter = '';
        dom.folderOverlay.style.opacity = '';
        dom.folderOverlay.style.transition = '';
        dom.folderOverlay.style.pointerEvents = 'auto';
        const fp = dom.folderOverlay.querySelector('.folder-panel');
        if (fp) { fp.style.transition = ''; fp.style.transform = ''; fp.style.opacity = ''; }
      } else {
        dom.folderOverlay.classList.remove('active');
        dom.folderOverlay.style.background = '';
        dom.folderOverlay.style.backdropFilter = '';
        dom.folderOverlay.style.webkitBackdropFilter = '';
        dom.folderOverlay.style.opacity = '';
        dom.folderOverlay.style.pointerEvents = 'auto';
      }
    }
    if (state.currentIconEl) {
      popHomeIcon(state.currentIconEl);
    }
    // 确保桌面上所有可能残留 launch-hidden 的图标均被安全恢复
    document.querySelectorAll('.launch-hidden').forEach(el => {
      el.classList.remove('launch-hidden');
      el.style.visibility = '';
    });
    dom.header.style.opacity = '';
    dom.pageStack.style.opacity = '';
    dom.gesture.style.opacity = '';
    dom.appLaunchScreen.style.opacity = '';
    if (dom.appWindowStatusBar) dom.appWindowStatusBar.style.opacity = '';
    if (dom.statusBar) dom.statusBar.style.opacity = '1';
    dom.appWindow.style.pointerEvents = '';

    // 重置所有并行动画元素
    clearRadialField();

    state.isOpen = false;
    state.isClosing = false;
    state.returnToFolderOnClose = false;
    state.currentIconEl = null;
    state.currentApp = null;
    state.navHistory = [0];
    // v7.6：关闭完成后正式隐藏后台实例容器 —— 此前 wrapper 保持 display:block，
    // 全靠窗口级 visibility:hidden 遮盖；实例内任何显式可见元素（如 v7.6 前录音
    // 音波条的 inline visibility:visible）都能击穿并悬浮在桌面。此调用兜底收敛。
    try { renderPageStack(); } catch (e) {}
    // v7.53：关闭完成广播 —— mini-window（真小窗）依赖此信号接管实例元素
    //（关窗动画期间实例必须留在 pageStack 内随窗口收缩，动画终点才能搬走）
    try { document.dispatchEvent(new CustomEvent('app-window-closed', { detail: { appId: closedAppId } })); } catch (e) {}
  }
}

/**
 * v7.48：批量清空后台后的桌面复位（issue 用户实测「清空返回闪现/空白壁纸」实锤根因）
 * 路径：应用全屏（桌面 scale(0.95)+预烘焙虚化+当前图标 launch-hidden+pageDots/
 * glance/searchPill 隐藏）→ 多任务 → 清空全部 → clearAllAppInstances 直接销毁实例
 * + closeRecentApps 摘 overlay —— 全程不经过 closeApp 的 finishAnim 复位段，
 * 桌面以「应用打开背景态」残留：缩小 + 虚化 + 图标不可见 = 空白壁纸闪现。
 * 复位项与 renderParallelAnimations(p→0) 分支 + finishAnim 桌面段同源。
 */
export function restoreDesktopAfterBatchClear() {
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
    glanceWidget.style.transition = '';
  }
  const searchPill = cachedEl('desktopSearchWidget');
  if (searchPill) {
    searchPill.style.opacity = '';
    searchPill.style.transform = '';
    searchPill.style.transition = '';
  }
  // 图标恢复：与 finishAnim 同款双保险（launch-hidden 摘类 + 可见性清 inline）
  document.querySelectorAll('.launch-hidden').forEach(el => {
    el.classList.remove('launch-hidden');
    el.style.visibility = '';
  });
  clearRadialField();
  if (dom.statusBar) dom.statusBar.style.opacity = '1';
  if (dom.gesture) dom.gesture.style.opacity = '';
  // 窗口壳兜底：清空路径窗口可能仍挂 .open（无 closeApp 收尾）——摘除防点击层残留
  dom.appWindow.classList.remove('open');
  dom.appWindow.style.pointerEvents = '';
  state.isOpen = false;
  state.isClosing = false;
  state.currentIconEl = null;
  state.currentApp = null;
}

// ==================== “指哪打哪”高精度动态坐标校准 ====================

/**
 * 测量图标“静止坐标系”下的屏幕矩形：若图标位于文件夹面板内，先临时剥离面板的
 * 并行动画缩放（开/关应用进行中面板处于 1±0.12p 的瞬态），避免把动画中间态
 * 坐标当成归巢原位（实测会偏离面板回弹后的真实图标位置十余像素）
 */
function measureIconRestingRect(el) {
  const inFolderPanel = !!(dom.folderOverlay && dom.folderGrid && dom.folderGrid.contains(el));
  const panel = inFolderPanel ? dom.folderOverlay.querySelector('.folder-panel') : null;
  const prevTransform = panel ? panel.style.transform : '';
  const prevTransition = panel ? panel.style.transition : '';
  if (panel) panel.style.setProperty('transform', 'none', 'important');
  const rect = getIconRect(el);
  if (panel) {
    panel.style.transform = prevTransform;
    panel.style.transition = prevTransition;
  }
  return rect;
}

/**
 * 实时动态寻找并校准当前应用在屏幕中的真实物理归巢目标矩形
 * @param {Object} app
 * @returns {{cx: number, cy: number, w: number, h: number, el: HTMLElement|null}}
 */
/** 矩形 → 归巢目标对象（尺寸异常时兜底 58px 图标规格） */
function rectToTarget(rect, el) {
  return {
    cx: rect.left + rect.width / 2,
    cy: rect.top + rect.height / 2,
    w: rect.width || 58,
    h: rect.height || 58,
    el,
  };
}

function findRealtimeTargetRect(app) {
  const fallbackCX = window.innerWidth / 2;
  const fallbackCY = window.innerHeight / 2;

  if (!app) return { cx: fallbackCX, cy: fallbackCY, w: 58, h: 58, el: null };

  // 1. 如果当前文件夹正打开，优先在打开的文件夹网格中查找
  if (dom.folderOverlay && dom.folderOverlay.classList.contains('active')) {
    const folderIcon = dom.folderGrid.querySelector(`[data-id="${app.id}"]`);
    if (folderIcon) {
      return rectToTarget(measureIconRestingRect(folderIcon), folderIcon);
    }
  }

  // 2. 如果 state.currentIconEl 仍有效且属于该应用（不可见元素测量值不可信：display:none
  //    会拿到全零矩形并触发 getIconRect 的屏幕中心回退，把关闭动画带到屏幕中心）
  if (state.currentIconEl && state.currentIconEl.dataset && state.currentIconEl.dataset.id === app.id &&
      state.currentIconEl.isConnected && state.currentIconEl.getClientRects().length > 0) {
    const rect = measureIconRestingRect(state.currentIconEl);
    if (rect.width > 0 && rect.height > 0) {
      return rectToTarget(rect, state.currentIconEl);
    }
  }

  // 3. 在当前桌面所有页面中查找该应用的图标
  const desktopIcon = document.querySelector(`.page-grid .app-icon[data-id="${app.id}"]`);
  if (desktopIcon) {
    const rect = getIconRect(desktopIcon);
    if (rect.width > 0 && rect.height > 0) {
      return rectToTarget(rect, desktopIcon);
    }
  }

  // 4. 检查应用是否属于桌面上的某个文件夹（此时文件夹已关闭）
  const allFolders = document.querySelectorAll('.app-folder');
  for (let fEl of allFolders) {
    const fId = fEl.dataset.id;
    let containsApp = false;
    for (let page of state.pagesApps) {
      for (let item of page) {
        if (item.id === fId && item.apps && item.apps.some(a => a.id === app.id)) {
          containsApp = true;
          break;
        }
      }
      if (containsApp) break;
    }
    if (containsApp) {
      return rectToTarget(getIconRect(fEl), fEl);
    }
  }

  // 5. 退化使用应用打开时记录的 iconCX/CY
  return {
    cx: state.iconCX || fallbackCX,
    cy: state.iconCY || fallbackCY,
    w: state.iconW || 58,
    h: state.iconH || 58,
    el: state.currentIconEl || null
  };
}

// ==================== 应用打开 / 关闭与并发流转 ====================

/**
 * 查找包含指定应用的桌面文件夹（关闭时“归还文件夹”的归属依据）
 * @param {string} appId
 * @returns {Object|null} 文件夹对象
 */
function findHomeFolder(appId) {
  for (const page of state.pagesApps) {
    for (const item of page) {
      if (item && item.type === 'folder' && Array.isArray(item.apps) && item.apps.some(a => a.id === appId)) {
        return item;
      }
    }
  }
  return null;
}

/**
 * v7.17：从 Actor 克隆体中营救活实例 wrapper —— 搬回主窗口页面栈隐藏待命。
 * Actor 销毁（settle 归位）或中途召回（再点同一应用）时调用：iframe 浏览上下文
 * 随 DOM 移动保留，实例续命 → 下次打开 warm 秒开（含全部滚动/输入/播放状态）。
 * @param {{element?: HTMLElement}} actor
 */
function salvageActorInstance(actor) {
  if (!actor || !actor.element) return;
  const ps = actor.element.querySelector('.page-stack');
  if (!ps) return;
  ps.querySelectorAll('.app-instance-wrapper').forEach((w) => {
    if (w.__actorHosted) {
      w.__actorHosted = null;
      w.style.display = 'none';
      if (dom.pageStack && dom.pageStack !== w.parentNode) {
        dom.pageStack.appendChild(w);
      }
    }
  });
}

/** 移除 Actor 全部关联 DOM（内容/阴影/高光），移除前先营救活实例 */
function disposeActorElements(actor) {
  salvageActorInstance(actor);
  if (actor.element && actor.element.parentNode) {
    actor.element.parentNode.removeChild(actor.element);
  }
  if (actor.shadowEl && actor.shadowEl.parentNode) {
    actor.shadowEl.parentNode.removeChild(actor.shadowEl);
  }
  if (actor.glowEl && actor.glowEl.parentNode) {
    actor.glowEl.parentNode.removeChild(actor.glowEl);
  }
}

/**
 * 将当前正处于打开或关闭过程中的主窗口应用无缝降级为独立的硬件加速 Closing Actor
 * v7.17 升级点：活实例整体搬迁（iframe 浏览上下文随 DOM 移动保留 —— Actor 展示
 * 真实活内容而非「背景色+图标」假截图占位）；窗口框架浅克隆（跳过 page-stack
 * 深克隆 —— 重应用数千节点克隆曾是切换动画起始帧 50~127ms 长任务的元凶）；
 * 独立高光合成层随 Actor 创建；继承降级瞬间透明度 + 归巢目标实时重校准
 */
/** v7.23：外部矩形可用性宽松校验（横向退场目标允许在视口外 —— 与入场源矩形不同，
 * 退场终点不需要看见，只需要坐标有限、尺寸为正） */
function isFiniteRect(rect) {
  return !!rect && typeof rect === 'object' &&
    Number.isFinite(rect.left) && Number.isFinite(rect.top) &&
    rect.width > 0 && rect.height > 0;
}

/**
 * v7.23：清除快速切换回弹残留的内联 transition/transform。
 * 回弹用 CSS 过渡归位；若新动画/新手势在中途接管，逐帧 render 的 transform
 * 写入会被残留过渡滞后一帧（跟手感断裂），任何动画入口必须先清零。
 * 打开态的残留 transform 一并清零；关闭态的 transform 由 render 逐帧接管不动。
 */
export function clearPendingSwitchRebound() {
  const w = dom.appWindow;
  if (!w) return;
  if (w.style.transition) w.style.transition = '';
  if (w.style.transform && w.classList.contains('open')) w.style.transform = '';
}

/**
 * 把当前主窗口降级为并行 Closing Actor 继续退场动画。
 * @param {{ exitTo?: {left:number,top:number,width:number,height:number}, initialOffsetX?: number, initialOffsetY?: number }} [opts]
 *   v7.23 快速切换：exitTo = 横向退场几何（旧应用缩向屏幕侧缘而非图标）；
 *   initialOffsetX/Y = 降级瞬间窗口的视觉横移量（拖拽中途降级的连续性接力）
 */
export function demoteCurrentAppToClosingActor(opts = null) {
  if (!state.currentApp || (!state.isOpen && !state.isClosing)) return;

  // v7.23：降级即终结 cardZoom 语义 —— 主窗口身份即将移交给新应用，
  // 纯缩放通道标记必须随旧窗口一并交给 Actor（renderClosingActor 不消费该标记，
  // 但新主窗口的 render 不能再被旧标记污染）
  state.shrinkToCard = false;

  const prevApp = state.currentApp;
  const prevIconEl = state.currentIconEl;
  const prevPosSpring = state.posSpring;
  const prevScaleSpring = state.scaleSpring;
  const prevIconCX = state.iconCX;
  const prevIconCY = state.iconCY;

  // 1. 归巢目标实时重校准：多任务卡片 / 搜索等非图标来源一律回归真实桌面图标（指哪打哪）
  //    v7.23：exitTo 横向退场覆盖（快速切换 —— 旧应用缩向屏幕侧缘，不涉意图标归位）
  const exitRect = opts && isFiniteRect(opts.exitTo) ? opts.exitTo : null;
  const offX = opts && Number.isFinite(opts.initialOffsetX) ? opts.initialOffsetX : 0;
  const offY = opts && Number.isFinite(opts.initialOffsetY) ? opts.initialOffsetY : 0;

  let homeCX;
  let homeCY;
  let homeW;
  let homeH;
  let homeEl;
  if (exitRect) {
    homeCX = exitRect.left + exitRect.width / 2;
    homeCY = exitRect.top + exitRect.height / 2;
    homeW = exitRect.width;
    homeH = exitRect.height;
    homeEl = null; // 横向退场：图标保持原状，无归位交互
  } else {
    const targetInfo = findRealtimeTargetRect(prevApp);
    homeCX = targetInfo.cx;
    homeCY = targetInfo.cy;
    homeW = targetInfo.w;
    homeH = targetInfo.h;
    homeEl = targetInfo.el || prevIconEl;
  }

  // 2. 创建 Closing Actor：浅克隆窗口框架 + 活实例搬迁
  const closingEl = document.createElement('div');
  closingEl.className = 'app-window closing-actor';
  // z-index 分段策略：
  // closing-actor 与对应阴影/高光使用 501~535 频段（每 actor 占 3 层：阴影、内容、高光）
  // windowShadowLayer 使用 539，主活动窗口 #appWindow 使用 540。
  // 后创建的 actor 拥有更高 z-index，且新打开的主窗口恒定最高置顶。
  const actorBaseZ = 501 + Math.min(closingActors.length, 16) * 2;
  const shadowEl = document.createElement('div');
  shadowEl.className = 'window-shadow-layer closing-actor-shadow';
  shadowEl.style.zIndex = `${actorBaseZ}`;
  closingEl.style.zIndex = `${actorBaseZ + 1}`;
  // v7.17：Actor 专属高光合成层（与主窗口同源驱动，销毁时一并回收）
  const glowEl = document.createElement('div');
  glowEl.className = 'window-glow-layer closing-actor-glow';
  glowEl.style.zIndex = `${Math.min(actorBaseZ + 2, 535)}`;

  // 严格 DOM 堆叠序：所有 Closing Actors 与其独立阴影恒定插入在主活动窗口及其阴影之前，
  // 结合 transform-style: flat 与 z-index 双重防护，彻底杜绝并发退场过程中的 3D 穿插与交错。
  const insertBeforeRef = dom.windowShadowLayer || dom.appWindow;
  if (insertBeforeRef && insertBeforeRef.parentNode === dom.stage) {
    dom.stage.insertBefore(shadowEl, insertBeforeRef);
    dom.stage.insertBefore(closingEl, insertBeforeRef);
    dom.stage.insertBefore(glowEl, insertBeforeRef);
  } else {
    dom.stage.appendChild(shadowEl);
    dom.stage.appendChild(closingEl);
    dom.stage.appendChild(glowEl);
  }

  // v7.17：窗口框架浅克隆 —— 仅复制轻量 chrome（状态栏/启动屏/头部/手势条），
  // .app-body 只克隆外壳并挂一个全新空 .page-stack：旧深克隆 page-stack（含全部
  // 后台实例的隐藏 DOM）是切换动画起始帧长任务的元凶；真实内容由下方活实例搬迁提供
  Array.from(dom.appWindow.childNodes).forEach((node) => {
    if (node.nodeType !== 1) return;
    if (node.classList && node.classList.contains('app-body')) {
      const bodyClone = node.cloneNode(false);
      const psClone = document.createElement('div');
      psClone.className = 'page-stack';
      bodyClone.appendChild(psClone);
      closingEl.appendChild(bodyClone);
    } else {
      closingEl.appendChild(node.cloneNode(true));
    }
  });

  // 3. 清理克隆体：剥离全部 id 防止与活动窗口的 DOM 查询冲突；移除脚本防止重复执行
  //    （此时 page-stack 为空壳，剥离不会波及稍后搬入的活实例 —— 其 id 必须保留：
  //    renderSubPages/renderPageStack 按 app-page-<id>-<n> 精确查询，且新主窗口
  //    是不同应用，id 前缀天然错开，无冲突）
  closingEl.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  closingEl.querySelectorAll('script').forEach((s) => s.remove());

  // 4. v7.17 活实例整体搬迁：page-stack 里的 .app-instance-wrapper（含活 iframe /
  //    模块应用 DOM / 当前滚动与子页状态）直接移入 Actor —— iframe 浏览上下文随
  //    DOM 移动保留（appendChild 移动而非克隆），Actor 全程展示真实内容；
  //    __actorHosted 标记让 renderPageStack 跳过对它的 display:none 隐藏。
  //    防御回退：实例不可得时退回旧「静态占位卡」方案（背景色+居中图标）。
  const clonedPs = closingEl.querySelector('.page-stack');
  const liveWrapper = dom.pageStack
    ? dom.pageStack.querySelector(`.app-instance-wrapper#app-instance-${prevApp.id}`)
    : null;
  if (clonedPs && liveWrapper) {
    liveWrapper.__actorHosted = actorBaseZ; // truthy 标记（renderPageStack 守卫用）
    clonedPs.appendChild(liveWrapper);      // move：浏览上下文与全部状态无损保留
  } else if (clonedPs) {
    // 回退：克隆当前可见页并以静态占位卡顶替 iframe（旧行为，正常路径不触发）
    const activePageIdx = state.navHistory[state.navHistory.length - 1] || 0;
    const activePageEl = document.getElementById(`app-page-${prevApp.id}-${activePageIdx}`);
    if (activePageEl) {
      const wrapDiv = document.createElement('div');
      wrapDiv.className = 'app-instance-wrapper';
      wrapDiv.style.cssText = 'width:100%;height:100%;position:absolute;inset:0;';
      wrapDiv.appendChild(activePageEl.cloneNode(true));
      clonedPs.appendChild(wrapDiv);
      closingEl.querySelectorAll('iframe').forEach((iframe) => {
        const ph = document.createElement('div');
        ph.className = 'iframe-ghost-placeholder';
        ph.style.backgroundColor = prevApp.type === 'clock'
          ? '#18181B'
          : (prevApp.bgColor || 'var(--md-surface, #1a1b1e)');
        const iconHTML = prevApp.type
          ? createDynamicIconHTML(prevApp.type, true)
          : `<div class="launch-icon">${getAppIconSVG(prevApp.id)}</div>`;
        ph.innerHTML = `<div class="launch-icon-container">${iconHTML}</div>`;
        iframe.replaceWith(ph);
      });
    }
  }

  // 5. 复制弹簧动力学状态（速度无缝连续），并按重校准后的归巢坐标重写位置偏移，
  //    保证降级瞬间窗口在屏幕上的绝对物理位置分毫不动
  //    v7.23：+ 拖拽中途降级的视觉横移量接力（快速切换旧窗口带着横向位移起飞）
  const actorPosSpring = new Spring2D(
    curCloseParams(),
    (prevIconCX + prevPosSpring.px + offX) - homeCX,
    (prevIconCY + prevPosSpring.py + offY) - homeCY,
    prevPosSpring.vx,
    prevPosSpring.vy
  );
  actorPosSpring.setTarget(0, 0);

  const actorScaleSpring = new Spring({
    ...curCloseParams(),
    initialValue: prevScaleSpring.x,
    initialVelocity: prevScaleSpring.v,
  });
  actorScaleSpring.setTarget(0);

  closingActors.push({
    id: `${prevApp.id}_${Date.now()}`,
    app: prevApp,
    iconEl: homeEl,
    element: closingEl,
    shadowEl,
    glowEl,
    _lastRQx: null,
    _lastRQy: null,
    _lastGlowQ: null,
    _lastGenieQ: null,
    launchIconContainer: closingEl.querySelector('.launch-icon-container'),
    launchScreen: closingEl.querySelector('.app-launch-screen'),
    header: closingEl.querySelector('.app-header'),
    pageStackEl: closingEl.querySelector('.page-stack'),
    gestureEl: closingEl.querySelector('.gesture-bar'),
    windowStatusBar: closingEl.querySelector('.app-window-status-bar'),
    posSpring: actorPosSpring,
    scaleSpring: actorScaleSpring,
    iconCX: homeCX,
    iconCY: homeCY,
    iconW: homeW,
    iconH: homeH,
  });

  // v7.18 根治「并行动画中返回的应用一帧跳变到全屏」（用户实拍实证）：
  // Actor 在 DOM 中出现的瞬间必须已携带正确位姿 —— 旧实现完全依赖下一帧 rAF 的
  // renderClosingActor 补写 transform/opacity，存在两条闪现路径：
  //   A. demote 同帧主线程被 iframe 搬迁重排阻塞（实测 0.5~1s）：无 transform 的
  //      Actor（.app-window 全屏尺寸 + opacity 默认 1）会被合成器原样提交呈现 ——
  //      中段退场的窗口瞬间突变回全屏不透明实体；
  //   B. 关闭尾段缩放弹簧已锁零（scale=0、posSpring 仍在途）时被快速切换承接：
  //      renderClosingActor 的 p<0.002 早退守卫使 Actor 永远得不到任何一次渲染，
  //      全屏实体一直挂到位置弹簧 settle 随 DOM 移除才消失 —— 实拍「返回的那个
  //      应用突然有一帧跳变到全屏（在打开的应用层级之下）」正是该路径。
  // 修复：出生即同步渲染首帧（与降级前窗口位姿/透明度严格连续）；p≈0 时以全透明
  // 实体出生（仅承担活实例营救与图标恢复职责，零视觉足迹）。
  const bornActor = closingActors[closingActors.length - 1];
  if (bornActor.scaleSpring.x > 0.002) {
    renderClosingActor(
      bornActor,
      bornActor.scaleSpring.x,
      bornActor.iconCX + bornActor.posSpring.px,
      bornActor.iconCY + bornActor.posSpring.py
    );
  } else {
    bornActor.element.style.opacity = '0';
    if (bornActor.shadowEl) bornActor.shadowEl.style.opacity = '0';
    if (bornActor.glowEl) bornActor.glowEl.style.opacity = '0';
  }

  if (homeEl) {
    clearIconEntranceAnim(homeEl);
    homeEl.classList.add('launch-hidden');
    homeEl.style.visibility = '';
  }
  // v7.11.1：demote 后必须确保渲染循环在跑（startLoop 幂等守卫防双循环）——
  // 文件夹调度等路径会单独调用 demote 而不经过 openApp，若此时主循环已停
  // （主窗口稳定 finishAnim 已跑），Actor 无人驱动冻在首帧，图标 launch-hidden
  // 永不恢复 = 图标"消失"。startLoop(null) 只启动循环不重配弹簧（params 判空跳过），
  // Actor 弹簧已在构造时设好 target=0，即刻开始退场积分。
  startLoop(null);
}

/**
 * 打开应用 — 支持真正并发并行动画、“指哪打哪”与中途无缝反转/接续！
 * @param {number} index - 应用在 initialApps 中的索引
 * @param {HTMLElement} iconEl - 被点击的图标 DOM 元素
 * @param {DOMRect|Object} [customRect] - 可选的自定义矩形坐标 (如多任务卡片/搜索栏坐标)
 */
/**
 * 校验外部传入的动画源矩形是否可用（有限坐标、正尺寸、中心点大致在视口内）
 * 防止隐藏/离屏元素（如未展开文件夹内图标、已销毁面板）的脏测量值把动画源带到屏外
 */
function isValidSourceRect(rect) {
  if (!rect || typeof rect !== 'object') return false;
  if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top)) return false;
  if (!(rect.width > 0) || !(rect.height > 0)) return false;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const margin = 80;
  return cx >= -margin && cx <= window.innerWidth + margin &&
         cy >= -margin && cy <= window.innerHeight + margin;
}

/** v7.9.1：清除图标上残留的解锁飞入动画类（CSS animation both 会压过场驱动与
 *  launch-hidden 的 inline 预期，开窗前必须摘除） */
function clearIconEntranceAnim(el) {
  if (!el || !el.classList) return;
  if (el.classList.contains('unlock-icon-in') || el.classList.contains('unlock-icon-in-ios') || el.classList.contains('unlock-icon-in-android')) {
    el.classList.remove('unlock-icon-in', 'unlock-icon-in-ios', 'unlock-icon-in-android');
    el.style.animationDelay = '';
    el.style.removeProperty('--radial-dx');
    el.style.removeProperty('--radial-dy');
  }
}

export function openApp(index, iconEl, customRect = null, opts = null) {
  const app = initialApps[index];
  if (!app) return;

  // v7.23：任何开窗即终结 cardZoom 纯缩放通道（新窗口身份启用常规动画语言）；
  // 同时清掉快速切换回弹可能残留的内联 transition（防逐帧 render 被过渡滞后）
  state.shrinkToCard = false;
  clearPendingSwitchRebound();

  // fix(audit-B #4): 开窗前置守卫 —— 分屏(760)/多任务(750)在场时直接开窗会被遮蔽
  // （应用“隐形打开”、state.isOpen 变真），分屏场景还与窗格形成同 id 双实例
  // （enterSplit 已销毁实例、这里又重建 page-stack 实例 → 监听/定时器双份）。
  // 先收多任务 overlay，再退出分屏会话；幂等可重入（重复关闭为无害 no-op），
  // 不影响从最近任务卡片点开应用的原有路径：该路径本就在 overlay 收起流程内
  // （卡片矩形在调用前已量取，提前收起仅让卡片淡出提前约 160ms）。
  // 循环依赖规避：recent-apps/split-screen 均静态依赖本模块 —— 走 window 桥
  // （__closeRecentApps / __splitGestures，先例：recent-apps 的 __splitInfo 桥），
  // 桥未注册时以动态 import 兜底（本文件 recordAppOpened 延迟记录已有动态 import 先例）。
  try {
    if (!opts || !opts.skipCloseRecents) {
      const recentsOverlay = document.getElementById('recentAppsOverlay');
      if (recentsOverlay && recentsOverlay.classList.contains('active')) {
        if (typeof window.__closeRecentApps === 'function') {
          window.__closeRecentApps();
        } else {
          import('./recent-apps.js').then((m) => { try { m.closeRecentApps(); } catch (e) {} }).catch(() => {});
        }
      }
    }
    // v7.53：小窗在场且为同一应用 → 原地接管升级全屏：实例归还 pageStack，
    // 从小窗当前矩形弹簧展开（原则 7 空间一致性 —— 窗口从它现在所在的位置长大，
    // 而非从图标重新开始；内容温热，无启动屏）
    if (typeof window !== 'undefined' && window.__miniWindow && !(opts && opts.skipMiniCheck)) {
      const mw = window.__miniWindow();
      if (mw && mw.appId === app.id) {
        mw.expandToFullscreen(customRect || null);
        return;
      }
    }
    // 分屏会话在场（__splitInfo 桥仅在 split-screen.js 求值后存在；会话在场 ⇒ 模块必已加载）
    if (typeof window !== 'undefined' && window.__splitInfo && window.__splitInfo().active) {
      // v7.33：应用顶替分屏 → 静默组合保存（不播动画与新开窗动画抢主线程，配对不丢）
      const g = window.__splitGestures;
      if (g && typeof g.dismissSilently === 'function') {
        g.dismissSilently();
      } else if (g && typeof g.dismiss === 'function') {
        g.dismiss();
      } else {
        import('./split-screen.js').then((m) => { try { m.exitSplit({ instant: true }); } catch (e) {} }).catch(() => {});
      }
    }
    // v7.53（分屏修复②）：应用属于某保存组合/隐藏会话 → 点图标恢复分屏组合，
    // 不再总是全屏打开（显式全屏入口如多任务单卡直开传 skipSplitRestore 跳过）
    if (typeof window !== 'undefined' && window.__splitRestoreForApp && !(opts && opts.skipSplitRestore)) {
      let restored = false;
      try { restored = !!window.__splitRestoreForApp(app.id, customRect); } catch (e) { restored = false; }
      if (restored) return;
    }
  } catch (e) { /* 桥不可用时静默降级：按旧路径直接开窗 */ }

  playSfx('app_open'); // 应用展开音效（受「全局音效」开关管辖，见 sound-haptics.js）
  state.popInProgress = false; // 新开应用时丢弃可能残留的待弹栈状态
  if (iconEl) clearIconEntranceAnim(iconEl); // v7.9.1：解锁飞入动画期内点图标 → 摘除动画再开窗

  // v7.12 帧率：开窗动画期全局内容冻结锁 —— 动画期间全部 app 实例 timer 暂停，
  // 内容 DOM 静止（剖析实锤：动画期 app live 更新 DOM 造成的 Layout 是掉帧主源）。
  // finishAnim 打开分支终点解锁；媒体播放 app 由 freezeApp 既有豁免跳过（音画不中断）
  try { setAnimFreezeLock(true); } catch (e) {}

  // v7.5：最近任务记录 defer 到开窗动画结束之后 —— 首次动态 import 的模块解析
  // 执行会与弹簧动画争抢主线程（实测 50ms+ 长任务落在动画前段敏感期，掉帧感明显）
  setTimeout(() => {
    import('./recent-apps.js').then(m => m.recordAppOpened(app.id)).catch(() => {});
  }, 650);

  // 1. 【本体快速承接】如果当前点击的是同一个正在关闭或打开的应用：从当时的那一帧开始，承接之后执行打开动画
  if (state.currentApp && state.currentApp.id === app.id && (state.isOpen || state.isClosing)) {
    state.isClosing = false;
    state.isOpen = true;
    state.returnToFolderOnClose = false; // 重开时重置归属标志，下次关闭重新推导
    // v7.17 实况内容优先：承接路径按实例真实温度选曲线
    state.contentWarm = isAppInstanceWarm(app.id);
    dom.appWindow.classList.remove('closing');
    dom.appWindow.classList.add('open');
    dom.appWindow.style.pointerEvents = 'auto';
    if (iconEl) {
      state.currentIconEl = iconEl;
      iconEl.classList.add('launch-hidden');
      iconEl.style.visibility = '';
    } else if (state.currentIconEl) {
      clearIconEntranceAnim(state.currentIconEl);
      state.currentIconEl.classList.add('launch-hidden');
      state.currentIconEl.style.visibility = '';
    }
    const targetX = window.innerWidth / 2 - state.iconCX;
    const targetY = window.innerHeight / 2 - state.iconCY;
    // 切换到开启动力学参数，并将目标重设为全屏 (1.0)，物理弹簧将从当前瞬时速度和进度无缝反转加速展开
    state.posSpring.reconfigure(curOpenParams());
    state.scaleSpring.reconfigure(curOpenParams());
    state.posSpring.setTarget(targetX, targetY);
    state.scaleSpring.setTarget(1);
    // v7.11.1：承接时重建放射场（携带当前窗口进度，零跳变）——
    // 旧波场的散开集合以原波源（上次点击/打开的图标位置）为中心，与承接后的
    // 窗口状态脱节；若仅 retarget，过期集合的淡化/散开 inline 会一直挂起，
    // 直到下次关闭才恢复 —— 快速操作下表现为"图标淡化不恢复"。
    prepareRadialField(state.currentIconEl || null, state.scaleSpring.x);
    retargetRadialField(1);
    // v7.36：承接分支同步调试探针 —— 承接不重新量取源矩形（从在途弹簧位姿无缝反转），
    // 此前不更新 __lastOpenSource 导致探针残留上次开窗源（实测卡片回放承接时仍显示
    // 桌面图标位置）。以承接时刻的 iconCX/CY 为准：cardZoom 挂起态下它已被同步为
    // 卡片中心（closeApp shrinkTo 通道），探针如实反映「从卡片在途位姿展开」。
    if (typeof window !== 'undefined') {
      window.__lastOpenSource = { cx: state.iconCX, cy: state.iconCY, w: state.iconW, h: state.iconH };
      window.__lastOpenStack = state.currentApp.id + ' <- 承接(本体快速承接) ' + (new Error().stack || '').split('\n').slice(2, 4).map(s => s.trim().slice(0, 80)).join(' | ');
    }
    startLoop(curOpenParams());
    return;
  }

  // 1.1 检查该应用是否正在 closingActors 队列中独立退场，若是则直接从其当前在途帧唤回并承接打开
  const existingActorIdx = closingActors.findIndex(act => act.app && act.app.id === app.id);
  if (existingActorIdx !== -1) {
    const actor = closingActors[existingActorIdx];
    // v7.17：统一回收 Actor 三层 DOM（先营救活实例回 page-stack —— 随后
    // renderPageStack 即可在原位重新显示它，滚动/输入/播放状态无损续接）
    disposeActorElements(actor);
    closingActors.splice(existingActorIdx, 1);

    // 如果当前主窗口有其它应用，先将其降级为 closingActor
    // v7.23：透传快速切换的横向退场几何（旧应用缩向屏幕侧缘）
    if (state.currentApp && (state.isOpen || state.isClosing) && state.currentApp.id !== app.id) {
      demoteCurrentAppToClosingActor(opts && opts.prevExitRect ? {
        exitTo: opts.prevExitRect,
        initialOffsetX: opts.prevOffsetX,
        initialOffsetY: opts.prevOffsetY,
      } : null);
    }

    state.isOpen = true;
    state.isClosing = false;
    state.returnToFolderOnClose = false; // 从在途 Actor 唤回同样重置归属标志
    state.currentApp = app;
    state.currentIconEl = iconEl || actor.iconEl;
    // v7.17 实况内容优先：召回的实例必为 warm（刚从 Actor 营救回 page-stack）
    state.contentWarm = isAppInstanceWarm(app.id);
    if (state.currentIconEl) {
      clearIconEntranceAnim(state.currentIconEl);
      state.currentIconEl.classList.add('launch-hidden');
      state.currentIconEl.style.visibility = '';
    }
    state.iconCX = actor.iconCX;
    state.iconCY = actor.iconCY;
    state.iconW = actor.iconW;
    state.iconH = actor.iconH;

    state.posSpring.x.x = actor.posSpring.x.x;
    state.posSpring.x.v = actor.posSpring.x.v;
    state.posSpring.y.x = actor.posSpring.y.x;
    state.posSpring.y.v = actor.posSpring.y.v;
    state.scaleSpring.x = actor.scaleSpring.x;
    state.scaleSpring.v = actor.scaleSpring.v;

    const targetX = window.innerWidth / 2 - state.iconCX;
    const targetY = window.innerHeight / 2 - state.iconCY;
    state.posSpring.reconfigure(curOpenParams());
    state.scaleSpring.reconfigure(curOpenParams());
    state.posSpring.setTarget(targetX, targetY);
    state.scaleSpring.setTarget(1);

    renderPageStack();
    render(state.scaleSpring.x, state.iconCX + state.posSpring.px, state.iconCY + state.posSpring.py);
    dom.appWindow.classList.remove('closing');
    dom.appWindow.classList.add('open');
    dom.appWindow.style.zIndex = '540';
    if (dom.windowShadowLayer) dom.windowShadowLayer.style.zIndex = '539';
    dom.appWindow.style.pointerEvents = 'auto';
    // v7.11.1：Actor 唤回承接同样重建放射场（携带弹簧进度零跳变）——
    // 波源从旧退场 Actor 的图标切换为当前承接图标，散开集合与窗口状态同步，
    // 杜绝过期波场 inline 挂起导致的"图标淡化不恢复"。
    prepareRadialField(state.currentIconEl || null, state.scaleSpring.x);
    retargetRadialField(1);
    // v7.36：Actor 唤回承接同样同步探针（同上，iconCX 取 Actor 在途图标位）
    if (typeof window !== 'undefined') {
      window.__lastOpenSource = { cx: state.iconCX, cy: state.iconCY, w: state.iconW, h: state.iconH };
      window.__lastOpenStack = state.currentApp.id + ' <- 承接(Actor唤回) ' + (new Error().stack || '').split('\n').slice(2, 4).map(s => s.trim().slice(0, 80)).join(' | ');
    }
    startLoop(curOpenParams());
    return;
  }

  // 2. 【多应用并发】如果当前有其它正在打开或关闭的应用：将其无缝转换为并行的 Closing Actor 继续播放退场动画
  //    v7.23：透传快速切换的横向退场几何（旧应用缩向屏幕侧缘 + 拖拽中途视觉位移接力）
  if (state.currentApp && (state.isOpen || state.isClosing)) {
    demoteCurrentAppToClosingActor(opts && opts.prevExitRect ? {
      exitTo: opts.prevExitRect,
      initialOffsetX: opts.prevOffsetX,
      initialOffsetY: opts.prevOffsetY,
    } : null);
  }

  // 3. 初始化新被点击的应用 (App B)
  state.isOpen = true;
  state.isClosing = false;
  state.returnToFolderOnClose = false; // 新开应用重置文件夹归属标志
  state.currentIconEl = iconEl;
  state.currentApp = app;
  state.navHistory = [0];
  dom.appWindow.classList.remove('closing');
  dom.appWindow.classList.add('open');
  dom.appWindow.style.zIndex = '540';
  if (dom.windowShadowLayer) dom.windowShadowLayer.style.zIndex = '539';
  dom.appWindow.style.pointerEvents = 'auto';

  // 精准计算起始源矩形（指哪打哪；外部矩形先过健壮性校验，脏值自动回退）
  let rect = isValidSourceRect(customRect) ? customRect : null;
  if (!rect && iconEl) {
    rect = measureIconRestingRect(iconEl);
  }
  if (!rect) {
    const targetInfo = findRealtimeTargetRect(app);
    rect = {
      left: targetInfo.cx - targetInfo.w / 2,
      top: targetInfo.cy - targetInfo.h / 2,
      width: targetInfo.w,
      height: targetInfo.h,
    };
  }

  state.iconCX = rect.left + rect.width / 2;
  state.iconCY = rect.top + rect.height / 2;
  state.iconW = rect.width || 58;
  state.iconH = rect.height || 58;

  // 调试钩子：记录最近一次打开的动画源中心（回归测试校验"指哪打哪"）
  if (typeof window !== 'undefined') {
    window.__lastOpenSource = { cx: state.iconCX, cy: state.iconCY, w: state.iconW, h: state.iconH };
    window.__lastOpenStack = app.id + ' <- ' + (new Error().stack || '').split('\n').slice(2, 5).map(s => s.trim().slice(0, 90)).join(' | ');
  }

  // 构建放射状多图标并行物理场（所有来源统一：桌面/文件夹/卡片/搜索）
  prepareRadialField(iconEl || null);

  // 文件夹归属处理：从文件夹内打开时，浮层不瞬间消失，而是作为并行动画参与者
  // 随窗口展开进度淡出（面板缩放/图标散射/遮罩渐隐均由逐帧渲染接管）；
  // 非文件夹来源的打开则照旧收起残留浮层
  if (dom.folderOverlay && dom.folderOverlay.classList.contains('active')) {
    if (iconEl && dom.folderGrid.contains(iconEl)) {
      // 仅解除交互拦截，展开动画期间底层桌面/浮层均不可误触
      dom.folderOverlay.style.pointerEvents = 'none';
      // 逐帧样式即将接管：禁用 CSS 过渡，避免落后于弹簧驱动
      dom.folderOverlay.style.transition = 'none';
      const panel0 = dom.folderOverlay.querySelector('.folder-panel');
      if (panel0) panel0.style.transition = 'none';
    } else {
      dom.folderOverlay.classList.remove('active');
      dom.folderOverlay.style.background = '';
      dom.folderOverlay.style.backdropFilter = '';
      dom.folderOverlay.style.webkitBackdropFilter = '';
      dom.folderOverlay.style.opacity = '';
      dom.folderOverlay.style.transition = '';
      dom.folderOverlay.style.pointerEvents = 'auto';
    }
  }

  renderPageStack();

  // v7.17 实况内容优先：新开应用按实例温度选交叉曲线 ——
  // 模块应用（无 iframe）首次即 warm；iframe 应用首次 cold（render 逐帧探针升级），
  // 二次起恒 warm（实例常驻 + dataset.loaded 持久标记）
  state.contentWarm = isAppInstanceWarm(app.id);

  // 设置启动屏图标与背景色
  if (state.currentApp.type) {
    dom.launchIconContainer.innerHTML = createDynamicIconHTML(state.currentApp.type, true);
    dom.appLaunchScreen.style.backgroundColor = state.currentApp.type === 'clock' ? '#18181B' : '#FFFFFF';
  } else {
    dom.launchIconContainer.innerHTML = `<div class="launch-icon">${getAppIconSVG(state.currentApp.id)}</div>`;
    dom.appLaunchScreen.style.backgroundColor = state.currentApp.bgColor || 'var(--md-surface, #1a1b1e)';
  }

  // 目标位置：窗口中心从 iconCX/iconCY 移动到屏幕中心
  const targetX = window.innerWidth / 2 - state.iconCX;
  const targetY = window.innerHeight / 2 - state.iconCY;

  // 初始物理状态：从 0 (图标/卡片源位置) 开始
  state.posSpring.x.x = 0;
  state.posSpring.x.v = 0;
  state.posSpring.x.target = targetX;

  state.posSpring.y.x = 0;
  state.posSpring.y.v = 0;
  state.posSpring.y.target = targetY;

  state.scaleSpring.x = 0;
  state.scaleSpring.v = 0;
  state.scaleSpring.target = 1;

  // 渲染第 0 帧，确保窗口一开始就在图标所在的位置与尺寸
  render(0, state.iconCX, state.iconCY);

  if (iconEl) {
    iconEl.classList.add('launch-hidden');
    iconEl.style.visibility = '';
  }

  startLoop(curOpenParams());
}

/**
 * 关闭应用 — 从全屏/当前拖拽位置弹簧回归到原图标位置（动态重校准“指哪打哪”）
 * v7.9：重入守卫（已在关闭中仅重校准不重播音效）+ opts.shrinkTo 归巢几何覆盖
 * （多任务连续缩放：窗口精确缩进后台卡片矩形，而非 genie 回图标）
 */
/**
 * 前台应用平滑连续缩放落入多任务卡片（全流程单一连续变换，零突变零间断）
 * v7.35 重写为「屏幕中心原点」约定 —— 与 render() 完全同一套几何：
 *   窗口静态位为全屏 (inset:0)，transform-origin 保持 CSS 默认 center center，
 *   transform = translate3d(cx - W/2, cy - H/2) scale(s) 使窗口视觉中心落于 (cx, cy)。
 *   旧实现改写 transformOrigin='0 0' 且落定/中断均不还原 → 之后每次开/关窗动画
 *   （render 全部按中心原点数学）几何整体错位 + 落定跳变；同时内联
 *   visibility:hidden 压死 .open 类的 CSS 可见性，应用「隐形打开」（实测复现）。
 * v7.46 动画驱动重写（二次）：v7.42 固定时长贝塞尔虽可编排但对动画预设/
 * 速度倍率完全不响应，且初速度为零（接缝断片）—— 改为 RK4 弹簧飞行
 * （三通道共享 curCloseParams），初速度经 opts.velocity 继承手势出射速度，
 * 邻卡/操作栏编排改由 opts.onApproach 物理锚点触发（替代 setTimeout 时钟对齐）。
 * 几何、每帧 syncStateSprings 在途位姿+速度同步与落定终态精确写入全部保留。
 * @param {DOMRect} targetRect 目标卡片矩形（调用方应传预览区矩形，见 recent-apps）
 * @param {Function} onDone 落定回调
 * @param {Object|null} [opts=null] v7.46：{velocity:{vx,vy,vs}, onApproach, approachAt}
 *        velocity 为松指物理速度（px/s 与缩放进度/s）；onApproach 为物理逼近区编排锚点
 */
export function flyAppToCard(targetRect, onDone, opts = null) {
  if (!dom.appWindow || !targetRect) {
    if (onDone) onDone();
    return;
  }

  // 1. 停止当前可能在途的其它动画循环
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  // v7.42：标记飞行在途 —— startLoop 接管时据此中止本飞行（防吞开窗/关闭动画）
  state.flightActive = true;

  // 2. 测量当前窗口瞬时实际矩形 → 换算为中心原点约定（与 render 同构）
  const winRect = dom.appWindow.getBoundingClientRect();
  const W = window.innerWidth, H = window.innerHeight;
  const s0 = clamp(winRect.width / Math.max(W, 1), 0.2, 1.2);
  const cx0 = winRect.left + winRect.width / 2;
  const cy0 = winRect.top + winRect.height / 2;
  const tx0 = cx0 - W / 2;
  const ty0 = cy0 - H / 2;
  const r0 = parseFloat(getComputedStyle(dom.appWindow).borderRadius) || 0;

  const s1 = targetRect.width / Math.max(W, 1);
  const tx1 = targetRect.left + targetRect.width / 2 - W / 2;
  const ty1 = targetRect.top + targetRect.height / 2 - H / 2;
  const r1 = 28; // 与多任务卡片圆角严格一致

  // 2.5 状态弹簧同步（v7.35→v7.36 重写）：坐标系闭环 —— startLoop/render 的消费约定为
  //     窗口中心 = iconCX + posSpring.px、几何 sx = iconW/W + (1-iconW/W)·p（scaleSpring.x = p）。
  //     本飞行以卡片为逻辑源：iconCX/W 先同步为卡片矩形，p/pos 按该约定换算。
  //     承接（卡片回放 openApp）时弹簧从真实在途位姿连续反转展开，落定态恰为
  //     p=0 / pos=0（卡片位姿）—— 修复 v7.33 以来「挂起落定后 scaleSpring 残留 1.0
  //     + pos 坐标系错写 → 承接瞬间全屏硬切 + 位置错乱漂移」的动画回归
  //     （此前仅在启动时同步一次 s0/tx0，且把中心偏移直接写进 posSpring.px）。
  state.iconCX = targetRect.left + targetRect.width / 2;
  state.iconCY = targetRect.top + targetRect.height / 2;
  state.iconW = targetRect.width;
  state.iconH = targetRect.height;
  const iScaleX = Math.max(targetRect.width / Math.max(W, 1), 0.001);
  // v7.46：同步携带真实速度 —— 旧实现在途位姿同步硬置 v=0，被渲染循环/
  // 开窗承接接管时速度断层（「整体感」断裂点之一）。现由飞行弹簧逐帧回写
  // 自身速度，接管瞬间与飞行尾迹完全同相位。
  const syncStateSprings = (s, winCX, winCY, vPx = 0, vPy = 0, vP = 0) => {
    state.posSpring.x.x = winCX - state.iconCX;
    state.posSpring.y.x = winCY - state.iconCY;
    state.posSpring.x.v = vPx;
    state.posSpring.y.v = vPy;
    state.scaleSpring.x = clamp((s - iScaleX) / (1 - iScaleX), 0, 1);
    state.scaleSpring.v = vP;
  };
  syncStateSprings(s0, cx0, cy0);

  // 3. 将主窗口抬到 deck 背景 (z 750) 之上 (z 760)，确保缩放全程清晰可见
  //    （不触碰 transformOrigin / visibility —— 中心原点由 CSS 默认提供，
  //     可见性由 .open 类管理，落定摘类即隐，全程零内联残留）
  dom.appWindow.style.zIndex = '760';
  dom.appWindow.style.transition = 'none';
  dom.appWindow.style.opacity = '1';
  dom.appWindow.style.filter = '';
  if (dom.windowShadowLayer) dom.windowShadowLayer.style.opacity = '0';
  if (dom.windowGlowLayer) dom.windowGlowLayer.style.opacity = '0';

  // 4. v7.46：RK4 弹簧飞行（替换 v7.42 固定时长贝塞尔）——
  //    ① 三通道（tx/ty/归一化缩放进度 p）共享 curCloseParams()：动画预设与
  //    开发者速度倍率从此贯穿飞行段（旧贝塞尔对预设切换完全不响应）；
  //    ② 初速度继承：手势暂停唤出后台时，openRecentApps 把松指速度注入
  //    飞行初速 —— 全屏→卡片的「被掷入」感（旧实现从静止重启，接缝断片）；
  //    ③ 编排由时钟改物理：onApproach（剩余距离进入阀值区）替代 setTimeout(160)，
  //    邻卡浮现/操作栏入场与真实物理进度同相位，落定迟早不再影响观感连贯；
  //    ④ 圆角不再独立插值，由缩放进度线性导出（形与圆角同相位，杜绝
  //    「位置已停、圆角还在弹」的异相弹性感）。
  const flightParams = curCloseParams();
  const vel = opts && opts.velocity ? opts.velocity : null;
  const p0 = clamp((s0 - iScaleX) / (1 - iScaleX), 0, 1);
  const flight = {
    tx: new Spring({ ...flightParams, initialValue: tx0, initialVelocity: clamp(vel ? (vel.vx || 0) : 0, -2600, 2600) }),
    ty: new Spring({ ...flightParams, initialValue: ty0, initialVelocity: clamp(vel ? (vel.vy || 0) : 0, -2600, 2600) }),
    p: new Spring({ ...flightParams, initialValue: p0, initialVelocity: clamp(vel ? (vel.vs || 0) : 0, -2.4, 0.6) }),
  };
  flight.tx.target = tx1;
  flight.ty.target = ty1;
  flight.p.target = 0; // 卡片位姿 = p 0（p=1 为满屏）—— 满屏→卡片即 p: p0→0
  const flightSpanP = Math.max(Math.abs(p0 - 0), 1e-6);
  let approachFired = false;

  // 固定子步积分（与 startLoop 同纪律：掉帧不慢放、防死亡螺旋）
  const STEP = 1 / 120;
  const MAX_SUBSTEPS = 30;
  let accumulator = 0;
  let lastT = performance.now();

  function stepPhysics(dt) {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP && steps < MAX_SUBSTEPS) {
      flight.tx.update(STEP);
      flight.ty.update(STEP);
      flight.p.update(STEP);
      accumulator -= STEP;
      steps++;
    }
    if (accumulator >= STEP) accumulator = 0;
  }

  function frame(now) {
    // v7.42：被渲染循环接管（开窗承接/关闭归巢）→ 静默退场，不碰 state.rafId
    //（新循环已持有它），不写任何样式/状态副作用
    if (!state.flightActive) return;
    stepPhysics(Math.min((now - lastT) / 1000, 0.25));
    lastT = now;

    const tx = flight.tx.x;
    const ty = flight.ty.x;
    const pNow = clamp(flight.p.x, -0.08, 1.12);
    const s = iScaleX + (1 - iScaleX) * pNow;
    // 圆角由缩放进度导出（p0 起点 → r1 终点，过冲段夹紧避免半径反鬼）
    const rProgress = clamp((p0 - pNow) / flightSpanP, 0, 1);
    const r = r0 + (r1 - r0) * rProgress;

    dom.appWindow.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0px) scale(${s.toFixed(5)})`;
    dom.appWindow.style.borderRadius = `${r.toFixed(1)}px`;
    // v7.36/v7.46：每帧同步状态弹簧（含真实速度 —— 被打断/承接时从
    // 真实在途位姿与速度连续反转，零断层）
    syncStateSprings(s, W / 2 + tx, H / 2 + ty, flight.tx.v, flight.ty.v, flight.p.v);

    // v7.46 物理编排锚点：剩余距离进入阀值区（默认 42%）触发一次
    if (!approachFired && opts && typeof opts.onApproach === 'function') {
      const remainingP = Math.abs(0 - flight.p.x);
      if (remainingP <= flightSpanP * (typeof opts.approachAt === 'number' ? opts.approachAt : 0.42)) {
        approachFired = true;
        try { opts.onApproach(); } catch (e) { /* 编排锚点失败不阻断物理 */ }
      }
    }

    const landed =
      flight.tx.isSettled(0.01, 2) &&
      flight.ty.isSettled(0.01, 2) &&
      flight.p.isSettled(0.004, 0.6);
    if (landed) {
      // 落地落定瞬刻：卡片原位接管，窗口摘类隐去（CSS 基态 visibility:hidden 接管，
      // 不写任何内联 visibility —— 内联残留会压死 .open 类导致后续开窗隐形）
      state.flightActive = false;
      dom.appWindow.classList.remove('open', 'closing');
      dom.appWindow.style.transform = '';
      dom.appWindow.style.borderRadius = '';
      dom.appWindow.style.zIndex = '';
      dom.appWindow.style.transition = '';
      state.isClosing = false;
      state.isOpen = true;
      state.rafId = null;
      // v7.36：落定终态精确写入（p=0/pos=0 = 卡片位姿；防小数残差）
      syncStateSprings(s1, W / 2 + tx1, H / 2 + ty1);
      if (onDone) onDone();
      return;
    }

    state.rafId = requestAnimationFrame(frame);
  }

  lastT = performance.now();
  state.rafId = requestAnimationFrame(frame);
}

export function closeApp(vx = 0, vy = 0, vs = 0, opts = null) {
  if (!state.isOpen && !state.isClosing) return;

  // v7.23：清掉快速切换回弹可能残留的内联 transition（防逐帧 render 被过渡滞后）
  clearPendingSwitchRebound();

  // v7.9：重入守卫 —— 快速连点主页/多任务时，后续 closeApp 只重校准归巢与目标，
  // 不再叠播音效（放射场重建/retarget 均幂等，无需守卫）
  const reentrant = state.isClosing;
  if (!reentrant) playSfx('app_close'); // 应用收拢音效
  state.popInProgress = false; // 关闭应用：丢弃未完成的子页面返回状态
  state.isClosing = true;

  // v7.12 帧率：关窗动画期全局内容冻结锁 —— 剖析实锤：关闭动画期间在途应用
  // live 更新 DOM（city-chip 列表增删等）每帧触发 5.7ms 全量 Layout，是移动端
  // 关闭掉帧主源。动画期 timer 全停，DOM 静止；finishAnim 终点解锁恢复 live
  // （下方 setLiveApps 的申请会被锁压制暂存，解锁瞬间自动生效，语义不变）
  try { setAnimFreezeLock(true); } catch (e) {}

  // v7.6：壁纸选择菜单（themePickerOverlay）是根文档独立覆盖层，不参与页面栈 ——
  // 任何关闭路径（主页手势/多任务/文件夹归返）都必须同步回收，防止回桌面后菜单残留
  try { if (window.__closeThemePicker) window.__closeThemePicker(); } catch (e) {}

  // 智能冻结策略：刚被推到后台的应用保持实时运行，其余后台任务冻结（bg-freeze.js）
  if (state.currentApp) {
    try { setLiveApps([state.currentApp.id]); } catch (e) {}
  }
  // 关键：关闭时窗口立即加上 closing 类并释放 pointer-events，使得桌面图标可即时接收高优先级触控
  dom.appWindow.classList.add('closing');
  dom.appWindow.style.pointerEvents = 'none';

  // 动态重校准：实时查询该应用的最新真实屏幕坐标，确保无论桌面怎么滑动，都精准弹回原图标
  if (state.currentApp) {
    // ★ 文件夹归属语义：该应用源自某桌面文件夹时，先无动画恢复该文件夹浮层，
    //   让应用缩回面板内该应用图标的原位，浮层在关闭完成后保持打开（从哪来回哪去）
    const homeFolder = findHomeFolder(state.currentApp.id);
    if (homeFolder) {
      const overlayOn = dom.folderOverlay.classList.contains('active');
      const sameFolderOpen = overlayOn && dom.folderTitle.dataset.folderId === homeFolder.id;
      if (!sameFolderOpen) {
        reopenFolderForReturn(homeFolder, state.currentApp.id);
      } else {
        // 同一文件夹仍在场（开→关中途反转）：仅确保动画接管状态一致
        dom.folderOverlay.style.transition = 'none';
        dom.folderOverlay.style.pointerEvents = 'none';
      }
      const panel0 = dom.folderOverlay.querySelector('.folder-panel');
      if (panel0) panel0.style.transition = 'none';
      state.returnToFolderOnClose = true;
      // currentIconEl 必须指向在场网格中的活图标（网格可能已重建，旧元素已脱离文档）
      const liveIcon = dom.folderGrid.querySelector(`.app-icon[data-id="${state.currentApp.id}"]`);
      if (liveIcon) state.currentIconEl = liveIcon;
    }

    const targetInfo = findRealtimeTargetRect(state.currentApp);
    if (targetInfo.el && !state.currentIconEl) {
      state.currentIconEl = targetInfo.el;
    }
    // 平滑重校准 iconCX 与 iconCY，修正 posSpring 当前偏差
    const oldIconCX = state.iconCX;
    const oldIconCY = state.iconCY;
    // v7.9-B：shrinkTo 覆盖归巢几何 —— 图标态(p=0)落位矩形改为调用方指定的卡片矩形，
    // 弹簧目标仍是 0，缩放全程连续、落位与卡片严丝合缝；同时把窗口抬到 deck 背景
    // 之上（deck z 750，窗口临时 z 760/759，finishAnim 两分支统一清理内联 z）
    const shrink = opts && isValidSourceRect(opts.shrinkTo) ? opts.shrinkTo : null;
    if (shrink) {
      state.iconCX = shrink.left + shrink.width / 2;
      state.iconCY = shrink.top + shrink.height / 2;
      state.iconW = shrink.width;
      state.iconH = shrink.height;
      dom.appWindow.style.zIndex = '760';
      if (dom.windowShadowLayer) dom.windowShadowLayer.style.zIndex = '759';
      // v7.23：纯缩放通道（cardZoom）—— render 关闭漏斗/倾斜/渐隐，
      // 窗口全程不透明落进卡片，与卡片静态预览零交叉淡入；图标无归位语义
      // （launch-hidden 由 finishAnim 兜底恢复，无需中途 pop 动画）
      state.shrinkToCard = true;
      state.currentIconEl = null;
    } else {
      state.shrinkToCard = false;
      state.iconCX = targetInfo.cx;
      state.iconCY = targetInfo.cy;
      state.iconW = targetInfo.w;
      state.iconH = targetInfo.h;
    }

    // 维持当前窗口在屏幕中的瞬时实际物理位置不变：当前绝对位置 = oldIconCX + posSpring.px = newIconCX + newPosPx
    state.posSpring.x.x += (oldIconCX - state.iconCX);
    state.posSpring.y.x += (oldIconCY - state.iconCY);
  }

  // 放射并行场：上下文失效（文件夹等来源）时以“已散开”状态重建桌面场，再统一波浪收敛归位
  if (radialField.context !== 'desktop' || radialField.items.length === 0) {
    prepareRadialField(state.currentIconEl || null, 1);
  }
  retargetRadialField(0);

  // v7.46 速度契约重建：入参即真实物理速度 —— (vx, vy) = 屏幕像素/秒，
  // vs = 缩放进度/秒。旧实现「手势侧 ×0.0012（当作 px 用实为屏宽归一化）
  // × 本侧再 ×0.08」两级衰减，把 3000px/s 的回桌甩动湮灭到 0.29px/s ——
  // 位置动量被消灭四个数量级，窗口永远「自己飘回去」，甩动的投掷感归零，
  // 是「动画不成整体」的第一元凶。现在：直接接力 + 量纲可信钳制；
  // 防穿透仍由 startLoop 的 scale≤0 硬锁保障（位置过冲 = 真实投掷感，
  // ζ≈0.85 近临界弹簧自动回稳，无二次弹跳）。
  const cvx = clamp(vx, -2600, 2600);
  const cvy = clamp(vy, -2600, 2600);
  const cvs = clamp(vs, -2.4, 0.25); // 穿透动量仍单向截断（只吞向下分量）

  // 目标位置：posSpring 归零（即中心点完美回到 state.iconCX/state.iconCY）
  state.posSpring.setTarget(0, 0, cvx, cvy);
  state.scaleSpring.setTarget(0, cvs);
  startLoop(curCloseParams());
}

// ==================== 全局高优先级触控调度分发器 (Touch Priority Dispatcher) ====================

let isTouchPriorityInitialized = false;

export function initTouchPriorityDispatcher() {
  if (isTouchPriorityInitialized) return;
  isTouchPriorityInitialized = true;

  const handleTouchPriority = (e) => {
    // 若在拖拽图标或编辑模式中，不干预
    if (state.isEditMode || state.iconDragState) return;

    // 拖拽手势的收尾事件（如底部上滑关闭应用后的 mouseup/click）不是"轻点"：
    // 若忽略此判断，释放落点下的桌面图标会被误打开
    if (state.lastGestureMoved && performance.now() - state.lastGestureEndedAt < 500) return;

    // v7.23：多任务 overlay 内的点击属于 deck 手势域（点卡片启动 / 点空白关闭）。
    // 卡片点击启动应用时，合成 click 事件与开窗过渡期重叠，且 overlay 正在淡出
    // （pointer-events 已 none）—— 旧逻辑会经 elementsFromPoint 深挖"穿透"淡出层
    // 命中桌面图标，把「点卡片启动」劫持成「点图标开窗」。凡事件目标在 overlay
    // 内一律放行（deck 自行消费），不进入图标劫持调度。
    if (e.target && e.target.closest && e.target.closest('#recentAppsOverlay')) return;

    // 仅在应用正在关闭返回桌面 (isClosing) 或处于开启动画过渡期 (isOpen 且 scale < 0.96) 时调度
    const isTransitional = state.isClosing || (state.isOpen && state.scaleSpring.x < 0.96);
    if (!isTransitional) return;

    const x = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : null));
    const y = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : null));
    if (x === null || y === null) return;

    // 1. 获取点击落点最底层的真实桌面目标元素（穿透正在退场的应用全屏/半屏窗口容器）
    let hitEl = document.elementFromPoint(x, y) || e.target;
    if (!hitEl) return;

    let iconEl = hitEl.closest ? hitEl.closest('.app-icon') : null;
    let folderEl = hitEl.closest ? hitEl.closest('.app-folder') : null;

    // 如果落点被正在收缩的 app-window 或 closing-actor 遮挡，使用 elementsFromPoint 深入穿透寻找桌面图标/文件夹
    if (!iconEl && !folderEl && document.elementsFromPoint) {
      const stackedElements = document.elementsFromPoint(x, y);
      for (const el of stackedElements) {
        if (!iconEl && el.closest) {
          iconEl = el.closest('.app-icon');
        }
        if (!folderEl && el.closest) {
          folderEl = el.closest('.app-folder');
        }
        if (iconEl || folderEl) break;
      }
    }

    // 1. 如果点中了桌面应用图标（包括正在退场的应用原图标，或任意其他图标）
    if (iconEl && iconEl.dataset && iconEl.dataset.id) {
      const appId = iconEl.dataset.id;
      const initialIdx = initialApps.findIndex((a) => a.id === appId);
      if (initialIdx !== -1) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        openApp(initialIdx, iconEl);
        return;
      }
    }

    // 2. 如果点中了文件夹
    if (folderEl && folderEl.dataset && folderEl.dataset.id) {
      const folderId = folderEl.dataset.id;
      let foundFolder = null;
      for (let page of state.pagesApps) {
        for (let item of page) {
          if (item && item.id === folderId && item.type === 'folder') {
            foundFolder = item;
            break;
          }
        }
        if (foundFolder) break;
      }
      if (foundFolder) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        if (state.currentApp && (state.isOpen || state.isClosing)) {
          demoteCurrentAppToClosingActor();
        }
        import('./folder.js').then((m) => m.openFolder(foundFolder, folderEl));
        return;
      }
    }

    // 3. 如果点击了正在缩小返回的当前应用窗口自身（用户在中途未点击任何图标，而是点击正在收缩的窗口画面空白区域希望重新唤起）
    if (state.isClosing && state.currentApp) {
      const appWinEl = hitEl.closest ? hitEl.closest('.app-window') : null;
      if (appWinEl && !appWinEl.classList.contains('closing-actor')) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        const initialIdx = initialApps.findIndex((a) => a.id === state.currentApp.id);
        if (initialIdx !== -1) {
          openApp(initialIdx, state.currentIconEl);
          return;
        }
      }
    }
  };

  // 在捕获阶段以最高优先级拦截并分发
  window.addEventListener('pointerdown', handleTouchPriority, { capture: true, passive: false });
  window.addEventListener('touchstart', handleTouchPriority, { capture: true, passive: false });
  window.addEventListener('click', handleTouchPriority, { capture: true, passive: false });
}

// 自动初始化触控优先级分发器
if (typeof window !== 'undefined') {
  initTouchPriorityDispatcher();

  // 调试钩子：暴露并行动画内部状态（不影响生产逻辑）
  window.__parallelDebug = () => ({
    actors: closingActors.map((a) => ({
      z: parseInt(a.element.style.zIndex, 10),
      iconW: Math.round(a.iconW),
      iconCX: Math.round(a.iconCX),
      iconCY: Math.round(a.iconCY),
      hasContent: !!(a.pageStackEl || a.header),
      contentChildren: a.element.children.length,
    })),
  });
  window.__findTarget = (appId) => {
    const app = initialApps.find((a) => a.id === appId) || null;
    const t = findRealtimeTargetRect(app);
    return { cx: Math.round(t.cx), cy: Math.round(t.cy), w: Math.round(t.w), el: t.el ? (t.el.dataset.id || t.el.className) : null };
  };

  // 动画曲线预设热更新（设置 › 动画与动效 调用）：
  // reconfigure 只换动力学参数，保留弹簧当前位置/速度 —— 正在播放的开/关动画零跳变换曲线
  window.__animPresets.apply = (id) => {
    setAnimPresetId(id);
    const o = curOpenParams();
    const c = curCloseParams();
    if (state.posSpring) {
      state.posSpring.reconfigure(o);
      if (state.scaleSpring) state.scaleSpring.reconfigure(o);
    }
    closingActors.forEach((a) => {
      if (a.posSpring) a.posSpring.reconfigure(c);
      if (a.scaleSpring) a.scaleSpring.reconfigure(c);
    });
  };
}

