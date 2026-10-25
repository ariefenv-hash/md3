// ==================== m3-controls.js — Material 3 原生触控组件引擎 ====================
// 精准复刻 Android 17 (Material You Expressive) 规范（v7.89 源码重写）：
//   1. 可拖拽 MD3 开关组件 (Draggable Switch) —— androidx compose material3
//      Switch.kt ThumbNode + SwitchTokens 逐值锚定：
//      - ✓/✕ thumbContent（SettingsLib expressive）→ 球两态恒 24px，端隙 4px/4px 对称
//      - 按压态：SnapSpec 瞬时膨胀 28px（中心 16/36 恒定）；拖拽 1:1 跟手（2..22px）
//      - 释放/切换：FastSpatial spring（ζ0.6/k800）RK4 弹簧 JS 直驱，
//        不经 CSS transition → html.no-anim（禁用 CSS 动画）无法杀死开关动效
//   2. 两种 MD3 Expressive 滑块组件 (Slider)
//      - 有级滑块 (Discrete)：均匀刻度圆点，激活区 on-primary 点、未激活区主色点，
//        手柄间隙 ±13px 内自动隐没；竖柄药丸手柄 (6×60px)
//      - 无级滑块 (Continuous)：连续流体调节，末端停止圆点，竖柄药丸手柄 (6×60px)
//      - 24px 厚双段轨道（激活段左 + 未激活段右），竖柄两侧各 10px 物理断开间隙
//      - 全量跟随 --md-primary 动态主题色

import { clamp } from './utils.js';
import { sliderClipPaths } from './slider-geom.js';
import { Spring } from './spring.js';

// ---------- 1. MD3 开关拖拽引擎（v7.89 A17 expressive 源码重写） ----------

// ===== A17 规格常量（androidx-main compose material3 Switch.kt ThumbNode + SwitchTokens.kt）=====
// 尺寸令牌（1dp=1px）：Track 52×32 / UnselectedHandle 16 / SelectedHandle 24 /
// PressedHandle 28 / TrackOutlineWidth 2 / IconSize 16（✓/✕ = thumbContent）。
// ThumbNode 布局算法逐行对齐：
//   size   = isPressed ? 28 : (hasContent || checked ? 24 : 16)
//            —— expressive ✓/✕ 图标 = thumbContent → hasContent 恒真 → 球恒 24dp
//   minBound = (32 − size)/2                静息关（24 球）= 4
//   maxBound = (52 − 24) − (32−24)/2 = 24   静息开 = 24（两端端隙 4px/4px 对称）
//   offset = pressed&&checked ? maxBound−2 : pressed&&!checked ? 2
//          : checked ? maxBound : minBound   按压态 2/22，中心 16/36 与静息一致（纯居中膨胀）
// 动效：按压 = SnapSpec（瞬时）；释放/切换 = FastSpatial spring
//   （ExpressiveMotionTokens ζ0.6 / k800）。弹簧在 JS 侧 RK4 积分并直写 transform，
//   不经 CSS transition → 开发者选项「禁用 CSS 动画与过渡」不再能杀死开关动效
//   （旧版「清缓存后仍只见圆角变换」的根因即 html.no-anim 全局 transition:none）。
const SWITCH_TRACK_W = 52;
const SWITCH_TRACK_H = 32;
const THUMB_REST = 24;                           // hasContent：两态恒 24（SelectedHandleWidth）
const THUMB_PRESSED = 28;                        // PressedHandleWidth
const REST_X_OFF = (SWITCH_TRACK_H - THUMB_REST) / 2;         // 4  静息关 offset
const REST_X_ON = (SWITCH_TRACK_W - THUMB_REST) - REST_X_OFF; // 24 静息开 offset
const PRESS_X_OFF = 2;                           // TrackOutlineWidth（ThumbNode pressed&&!checked）
const PRESS_X_ON = REST_X_ON - 2;                // maxBound − TrackOutlineWidth = 22
const DRAG_MIN = PRESS_X_OFF;                    // 拖拽行程两端 = 按压几何两端
const DRAG_MAX = PRESS_X_ON;
const DRAG_TRAVEL = DRAG_MAX - DRAG_MIN;         // 20
const SPRING_STIFFNESS = 800;                    // ExpressiveMotionTokens SpringFastSpatialStiffness
const SPRING_DAMPING = 2 * 0.6 * Math.sqrt(SPRING_STIFFNESS); // ζ0.6 → c≈33.94

/**
 * 为单个开关元素绑定 1:1 拖拽与高灵敏触控（v7.89 全量重写：几何由 JS 弹簧驱动）
 * @param {HTMLElement} labelEl .md3-switch 包装容器
 */
export function initM3Switch(labelEl) {
  if (!labelEl || labelEl._m3Bound) return;
  labelEl._m3Bound = true;

  const input = labelEl.querySelector('input[type="checkbox"]');
  const thumb = labelEl.querySelector('.thumb');
  const slider = labelEl.querySelector('.slider');
  if (!input || !thumb || !slider) return;

  // ---- A17 Expressive Switch：thumb ✓/✕ 状态图标（Android 17 SettingsLib）----
  // settingslib_expressive_switch_thumb_icon.xml selector：state_checked=true →
  // icon_check、false → icon_close；pathData = SettingsLib expressive_icon_check /
  // expressive_icon_close 的 960 网格原始值逐字搬运（android-17.0.0_r1，已逐字节核对）。
  // 显隐由 CSS 按 input:checked 组合器驱动（无需 JS 状态同步）。
  if (!thumb.querySelector('.a17-thumb-icon')) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'a17-thumb-icon');
    svg.setAttribute('viewBox', '0 0 960 960');
    svg.setAttribute('aria-hidden', 'true');
    const check = document.createElementNS(NS, 'path');
    check.setAttribute('class', 'icon-check');
    check.setAttribute('d', 'M382,720L154,492L211,435L382,606L749,239L806,296L382,720Z');
    const close = document.createElementNS(NS, 'path');
    close.setAttribute('class', 'icon-close');
    close.setAttribute('d', 'M256,760L200,704L424,480L200,256L256,200L480,424L704,200L760,256L536,480L760,704L704,760L480,536L256,760Z');
    svg.append(check, close);
    thumb.appendChild(svg);
  }

  // ---- 几何弹簧（ThumbNode offsetAnim/sizeAnim 等价；RK4 复用 spring.js 引擎）----
  const xSpring = new Spring({
    mass: 1, stiffness: SPRING_STIFFNESS, damping: SPRING_DAMPING,
    initialValue: input.checked ? REST_X_ON : REST_X_OFF,
  });
  const sizeSpring = new Spring({
    mass: 1, stiffness: SPRING_STIFFNESS, damping: SPRING_DAMPING,
    initialValue: THUMB_REST,
  });

  let rafId = 0;
  let lastFrameT = 0;

  // #79：垂直偏移弃用 translateY(-50%)，改显式像素且与 width/height 同源自 sizeSpring.x。
  // 根因：translateY(-50%) 的百分比参考元素自身 height，而 height 逐帧 24→28 —— 浏览器
  // 同帧内按新 height 解析 -50%（-14px）但光栅化仍用旧 height（24px）参与（或反之），
  // 写样式先 transform 后 size 时存在一帧错配窗口：球顶贴死、球底空出 4px（用户看到的
  // 「按压放大时视觉偏上/下方像素级缝隙」）。显式像素 + 先尺寸后 transform + 同源取值
  // 三重消除：-size/2 与 height 恒为同一 spring 值的纯函数，任何帧都不可分叉。
  function render() {
    const size = sizeSpring.x;
    thumb.style.width = `${size.toFixed(2)}px`;
    thumb.style.height = `${size.toFixed(2)}px`;
    thumb.style.transform =
      `translate(${xSpring.x.toFixed(2)}px, ${(-size / 2).toFixed(2)}px)`;
  }

  function loop(now) {
    const dt = Math.min(0.032, Math.max(0.001, (now - lastFrameT) / 1000));
    lastFrameT = now;
    xSpring.update(dt);
    sizeSpring.update(dt);
    render();
    if (!xSpring.isSettled(0.01, 0.5) || !sizeSpring.isSettled(0.01, 0.5)) {
      rafId = requestAnimationFrame(loop);
    } else {
      xSpring.x = xSpring.target;
      sizeSpring.x = sizeSpring.target;
      render();
      rafId = 0;
    }
  }

  function animate() {
    if (rafId) return;
    lastFrameT = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stopAnim() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  /** SnapSpec：瞬时落到指定几何（按压态；ThumbNode isPressed 分支同款） */
  function snapTo(x, size) {
    stopAnim();
    xSpring.x = x; xSpring.v = 0; xSpring.target = x;
    sizeSpring.x = size; sizeSpring.v = 0; sizeSpring.target = size;
    render();
  }

  /** FastSpatial spring：从当前位置/速度落向目标几何（释放/切换态） */
  function settleTo(x, size) {
    stopAnim();
    xSpring.target = x;
    sizeSpring.target = size;
    animate();
  }

  const restGeo = (on) => (on ? [REST_X_ON, THUMB_REST] : [REST_X_OFF, THUMB_REST]);
  const pressGeo = (on) => (on ? [PRESS_X_ON, THUMB_PRESSED] : [PRESS_X_OFF, THUMB_PRESSED]);

  // 初始绑定：无动画落到当前态静息几何（与 CSS 回退落位同值，零跳变）
  snapTo(...restGeo(input.checked));

  let isDown = false;
  let activePointerId = null; // v7.54：仅跟踪发起拖拽的指针（多指不串扰）
  let startX = 0;
  let startRatio = 0;
  let moved = false;
  let lastX = 0;
  let lastT = 0;
  let velX = 0;
  let dragRafId = 0;      // v7.35：拖拽视觉 rAF 合帧（事件率→帧率）
  let pendingRatio = -1;   // 待落帧的最新比例（末事件原则）
  let hasPending = false;  // v7.54：显式待写帧标志 —— 旧「pendingRatio >= 0」判定把
                           // 真实负比例误当空哨兵吞掉，是拖拽卡球的根因
  let visualX = REST_X_OFF; // 拖拽当前视觉 x（速度接力与落位初值来源）
  let lastOn = null;       // 颜色态脏检查
  let selfChange = false;  // change 守卫：引擎派发的 change 不再走外部同步通道

  function beginDragVisual() {
    // 拖拽起始一次性写入恒定量：颜色预览通道关闭过渡（几何通道本就由 JS 直写）
    thumb.style.transition = 'none';
    slider.style.transition = 'none';
  }

  function applyDragVisual(ratio) {
    const r = clamp(ratio, 0, 1);
    visualX = DRAG_MIN + r * DRAG_TRAVEL;  // 拖拽球 = 按压几何 28px @ 2..22（1:1 跟手）
    // #79：拖拽态垂直偏移同样弃用 -50% —— 本方法不写尺寸（pointerdown snapTo 已把
    // sizeSpring 落到 28 并 render 落笔），百分比与另一驱动路径的尺寸耦合更松；
    // 显式 -sizeSpring.x/2 与已落笔的 height 同源（恒 -14px），杜绝跨路径错配。
    thumb.style.transform =
      `translate(${visualX.toFixed(1)}px, ${(-sizeSpring.x / 2).toFixed(2)}px)`;
    // 跨中线方向预览（MD3：拖拽中底槽/小球颜色反映将会落在的状态）
    const on = r >= 0.5;
    if (on !== lastOn) {
      lastOn = on;
      if (on) {
        slider.style.background = 'var(--md-primary, #00875A)';
        slider.style.borderColor = 'var(--md-primary, #00875A)';
        thumb.style.background = 'var(--md-on-primary, #ffffff)';
      } else {
        slider.style.background = 'var(--md-surface-container-highest, #e2e2e9)';
        slider.style.borderColor = 'var(--md-outline, #74777f)';
        thumb.style.background = 'var(--md-outline, #74777f)';
      }
    }
  }

  function flushDragVisual() {
    if (dragRafId) {
      cancelAnimationFrame(dragRafId);
      dragRafId = 0;
    }
    if (hasPending) {
      applyDragVisual(pendingRatio);
      pendingRatio = -1;
      hasPending = false;
    }
  }

  /** 颜色交还 CSS（:checked 组合器接管）；几何不清理 —— 弹簧从当前视觉值继续落位 */
  function releaseDragColors() {
    flushDragVisual();
    lastOn = null;
    thumb.style.transition = '';
    slider.style.transition = '';
    thumb.style.background = '';
    slider.style.background = '';
    slider.style.borderColor = '';
    labelEl.classList.remove('is-dragging');
  }

  // v7.35：阻断 label 原生激活转发 —— pointerup 已手动切换并派发 change，
  // label 转发会二次翻转 checked（实测 change×2 [true,false] 净效果=关，设置全部开关失效）。
  // 仅拦截指针产生的点击（detail≥1）且目标非 input 本体（保留键盘/AT 原生路径）。
  labelEl.addEventListener('click', (e) => {
    if (e.detail > 0 && e.target !== input) e.preventDefault();
  });

  // 外部状态同步：键盘/程序化切换（change 非引擎派发）→ 弹簧滑向新静息几何
  // （ThumbNode：非按压态只有 offset 动画；键盘路径无按压膨胀，与 compose 一致）
  input.addEventListener('change', () => {
    if (selfChange || isDown) return;
    settleTo(...restGeo(input.checked));
  });

  labelEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.button !== undefined) return;
    if (input.disabled) return; // v7.62：禁用开关不可拖拽（Android 16 Beta 3 灰化 + X 标记同源语义）
    if (isDown) return; // v7.54：拖拽进行中忽略第二根手指（旧实现 startX/捕获被顶掉后小球乱跳冻结）
    isDown = true;
    activePointerId = e.pointerId;
    moved = false;
    startX = e.clientX;
    lastX = e.clientX;
    lastT = performance.now();
    velX = 0;
    startRatio = input.checked ? 1 : 0;
    lastOn = null;
    // 按压 = SnapSpec（ThumbNode isPressed 分支）：打断进行中的落位动画，
    // 瞬时膨胀至按压几何（中心 16/36 不动，纯居中生长 24→28）
    snapTo(...pressGeo(input.checked));
    try { labelEl.setPointerCapture(e.pointerId); } catch (err) {}
  });

  labelEl.addEventListener('pointermove', (e) => {
    if (!isDown || e.pointerId !== activePointerId) return; // v7.54：陌生指针的移动不污染拖拽
    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    velX = 0.7 * velX + 0.3 * ((e.clientX - lastX) / dt);
    lastX = e.clientX;
    lastT = now;

    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) {
      if (!moved) {
        moved = true;
        labelEl.classList.add('is-dragging');
        beginDragVisual();
      }
      // v7.35：高频事件只暂存最新比例，每帧至多一次视觉落笔
      // v7.54 根治「拖拽时小球卡住」：比例必须在入队前钳制到 [0,1]。
      // 旧实现直接存原始比例，而 -1 被用作「无待写帧」哨兵 —— 向左拖过起点
      // 20px（每个关断向拖拽都必然发生）后比例恒为负，rAF 回调的
      // pendingRatio >= 0 判定把整段负比例全部吞掉：快速左甩关断时单次 move
      // 从比例 0.9 直跳负值，小球冻结在中途不再跟手（v7.49 只修了
      // pointercancel 回弹，此视觉冻结是其残留根因，即用户报告的「还是卡住」）。
      pendingRatio = clamp(startRatio + dx / DRAG_TRAVEL, 0, 1);
      hasPending = true;
      if (!dragRafId) {
        dragRafId = requestAnimationFrame(() => {
          dragRafId = 0;
          if (hasPending) {
            applyDragVisual(pendingRatio);
            pendingRatio = -1;
            hasPending = false;
          }
        });
      }
    }
  });

  const onEnd = (e, cancelled = false) => {
    if (!isDown) return;
    if (e && e.pointerId !== undefined && e.pointerId !== activePointerId) return; // v7.54：非发起指针的收尾不劫持拖拽
    isDown = false;
    activePointerId = null;
    try { labelEl.releasePointerCapture(e.pointerId); } catch (err) {}

    if (moved) {
      flushDragVisual(); // 先落最后一帧，再按最终值判定（与 v7.32 endDrag 同纪律）
      // v7.49：pointercancel 事件坐标可能无效（0/缺省）—— 用最后一次 move 的
      // 已知位置判定，杜绝回跳
      const endX = cancelled && !(e.clientX > 0) ? lastX : e.clientX;
      const dx = endX - startX;
      let finalRatio = startRatio + dx / DRAG_TRAVEL;
      // 速度助力：快速向右甩动开启，向左甩动关闭
      if (velX > 0.3) finalRatio = 1;
      else if (velX < -0.3) finalRatio = 0;

      const targetChecked = finalRatio >= 0.5;
      const changed = input.checked !== targetChecked;
      // 颜色交还 CSS；几何不改写 —— 弹簧从当前视觉值继续落位（零跳变）
      releaseDragColors();
      if (changed) {
        input.checked = targetChecked;
        selfChange = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        selfChange = false;
        if (navigator.vibrate && !cancelled) navigator.vibrate(12);
      }
      // 几何落位：弹簧初值 = 拖拽当前视觉位置（28 球）+ 同向手指速度接力，
      // 目标 = 最终态静息几何（FastSpatial ζ0.6/k800）
      xSpring.x = visualX;
      xSpring.v = 0;
      sizeSpring.x = THUMB_PRESSED;
      sizeSpring.v = 0;
      const vHandoff = clamp(velX * 1000, -2600, 2600); // px/ms → px/s（跟手 1:1 速度）
      if (Math.sign(vHandoff) === Math.sign(xSpring.target - xSpring.x)) xSpring.v = vHandoff;
      settleTo(...restGeo(input.checked));
    } else {
      releaseDragColors();
      if (cancelled) { // v7.49：无位移的取消不切换（保持点击语义纯净）—— 落回原静息态
        settleTo(...restGeo(input.checked));
        return;
      }
      // 轻点切换（原生转发已被 click 守卫阻断，此处为唯一切换源）
      input.checked = !input.checked;
      selfChange = true;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      selfChange = false;
      if (navigator.vibrate) navigator.vibrate(8);
      // 释放落位：从按压几何（28 球）弹性收拢到新态静息几何（24 球）——纯居中收缩
      settleTo(...restGeo(input.checked));
    }
  };

  labelEl.addEventListener('pointerup', (e) => onEnd(e, false));
  // v7.49：pointercancel 不再丢弃拖拽 —— 浏览器/系统把手势判给滚动、屏幕边缘
  // 返回区或长按菜单时 cancel 代替 up 到达，旧实现直接 resetDragVisual 把小球
  // 弹回起始态（「开关小球拖到返回区滑不到最左侧」的根因）。现按最后已知
  // 位置/速度完成同一次判定：拖到哪里落哪一半，与真实松手语义一致。
  labelEl.addEventListener('pointercancel', (e) => onEnd(e, true));
  // v7.54：捕获丢失兜底 —— WebView/页面重渲染可能在无 up/cancel 的情况下静默
  // 释放指针捕获，旧实现 is-dragging 类与 28px 内联几何永久残留（小球悬停卡死）。
  // 现按最后一次已知位置完成同一次提交（与 pointercancel 同语义，坐标无效时
  // 由 onEnd 内 lastX 兜底）。正常 up/cancel 先行结束拖拽后此处 isDown=false 空转。
  labelEl.addEventListener('lostpointercapture', (e) => {
    if (isDown) onEnd(e, true);
  });
}

// 自动扫描并为容器内所有 .md3-switch 绑定拖拽
export function initAllM3Switches(root = document) {
  if (!root) return;
  const switches = root.querySelectorAll('.md3-switch');
  switches.forEach(initM3Switch);
}

// ---------- 2. MD3 Expressive 滑块组件引擎 ----------

/**
 * 创建并绑定 MD3 Expressive 风格滑块
 * @param {HTMLElement} containerEl 容器元素
 * @param {Object} opts 配置项
 *   - type: 'discrete' (有级) | 'continuous' (无级)
 *   - min: 最小值 (如 0)
 *   - max: 最大值 (如 100)
 *   - step: 步长 (有级建议 1~10，无级建议 0.01)
 *   - value: 初始值
 *   - formatVal: (val) => string 格式化输出 (如 (v) => `${v}%`)
 *   - onChange: (val, formatted) => void 值变动回调
 */
export function createM3Slider(containerEl, opts = {}) {
  if (!containerEl) return null;
  const isDiscrete = opts.type === 'discrete';
  const min = Number.isFinite(opts.min) ? opts.min : 0;
  const max = Number.isFinite(opts.max) ? opts.max : 100;
  const step = opts.step || (isDiscrete ? 1 : 0.01);
  let curVal = clamp(opts.value !== undefined ? opts.value : min, min, max);
  const format = opts.formatVal || ((v) => String(v));

  // 计算刻度点（有级滑块）
  const totalSteps = Math.max(1, Math.round((max - min) / step));
  let dotsHtml = '';
  if (isDiscrete && totalSteps <= 24) {
    dotsHtml = `<div class="m3-slider-ticks">` +
      Array.from({ length: totalSteps + 1 }).map((_, i) => `<span class="m3-slider-dot" data-step="${i}"></span>`).join('') +
      `</div>`;
  } else if (!isDiscrete) {
    dotsHtml = `<span class="m3-slider-stop-dot"></span>`;
  }

  containerEl.classList.add('m3-slider-container');
  if (isDiscrete) containerEl.classList.add('is-discrete');
  else containerEl.classList.add('is-continuous');

  containerEl.innerHTML = `
    <div class="m3-slider-root" role="slider" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${curVal}">
      <div class="m3-slider-track-bg"></div>
      <div class="m3-slider-track-fill"></div>
      ${dotsHtml}
      <div class="m3-slider-thumb-bar"></div>
    </div>
  `;
  // v7.43: fill 从 track-bg 内部提升为兄弟节点（线 < 填充 < 刻度 < 竖柄绘制序不变）。
  // 旧嵌套结构下 track-bg 与 fill 两级 scaleX 叠乘，fill 实际渲染位置/宽度均错
  // （父级缩放同样作用于子树），属隐性几何缺陷；clip-path 方案下兄弟化彻底消除

  const root = containerEl.querySelector('.m3-slider-root');
  const trackBg = containerEl.querySelector('.m3-slider-track-bg');
  const fill = containerEl.querySelector('.m3-slider-track-fill');
  const thumb = containerEl.querySelector('.m3-slider-thumb-bar');
  const dots = Array.from(containerEl.querySelectorAll('.m3-slider-dot'));
  const stopDot = containerEl.querySelector('.m3-slider-stop-dot');
  // v7.39 参考版几何：竖柄两侧各 10px 物理断开间隙
  const GAP = 10;

  function updateVisual(val, fireChange = true) {
    curVal = clamp(val, min, max);
    if (isDiscrete) {
      curVal = min + Math.round((curVal - min) / step) * step;
      curVal = Number(curVal.toFixed(4));
    }
    const ratio = clamp((curVal - min) / (max - min), 0, 1);
    // v7.43 修「手柄移动时两端圆角退化直至消失」：旧 scaleX 方案（v7.38 为治
    // fill/thumb 光栅脱节引入）会把 12px 半圆端帽压成椭圆（水平半径=12×scaleX），
    // 段越短越扁；改 clip-path: inset(round) 裁剪后圆角写在裁剪形状上与段长无关。
    // clip-path 同为零 layout 属性（合成层仅更新裁剪，纹理缓存不重光栅），
    // 拖拽同帧纪律不变。段几何统一由 slider-geom.js 纯函数给出（settings 同源）。
    // 隐藏/零宽时跳过，待 ResizeObserver 可见后重绘
    const w = root ? root.clientWidth : 0;
    if (w > 0) {
      const x = ratio * w;
      const clips = sliderClipPaths(w, x, GAP);
      if (fill) fill.style.clipPath = clips.fill;
      if (trackBg) trackBg.style.clipPath = clips.line;
      if (thumb) thumb.style.transform = 'translateX(' + x.toFixed(1) + 'px) translate(-50%,-50%)';
    }
    if (root) root.setAttribute('aria-valuenow', String(curVal));

    // 更新有级圆点状态：激活 on-primary / 未激活主色；手柄间隙 ±(GAP+3) 内隐没
    if (dots.length > 0 && w > 0) {
      const x = ratio * w;
      const span = w - 4; // ticks 层 left/right 各 2px
      const activeIdx = Math.round(ratio * (dots.length - 1));
      dots.forEach((dot, idx) => {
        const dx = 2 + idx * span / (dots.length - 1);
        dot.classList.toggle('is-hidden', Math.abs(dx - x) <= GAP + 3);
        dot.classList.toggle('is-active', idx <= activeIdx);
      });
    }
    // 无级末端停止点：停止点不再完整落在未激活段上（进入右侧间隙区）即隐没
    if (stopDot && w > 0) {
      stopDot.classList.toggle('is-hidden', ratio * w > w * 0.98 - GAP - 4);
    }

    if (fireChange && typeof opts.onChange === 'function') {
      opts.onChange(curVal, format(curVal));
    }
  }

  let isDragging = false;
  let rafId = 0;
  let pendingE = null;
  let cachedRect = null; // v7.35：pointerdown 快照轨道矩形（拖拽中零逐帧布局读取）

  function handlePointer(e) {
    // 拖拽中轨道不移动（pointer capture 抑制页面滚动）→ 复用快照，
    // 消除「逐帧 getBoundingClientRect + 逐帧 width 写入」读写交错强制布局
    const rect = cachedRect || root.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clientX = e.clientX;
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    const rawVal = min + ratio * (max - min);
    updateVisual(rawVal, true);
  }

  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.button !== undefined) return;
    isDragging = true;
    cachedRect = root.getBoundingClientRect(); // 一次布局读，全程复用
    root.classList.add('is-dragging');
    try { root.setPointerCapture(e.pointerId); } catch (err) {}
    handlePointer(e);
  });

  root.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    pendingE = e;
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (pendingE) { handlePointer(pendingE); pendingE = null; }
      });
    }
  });

  const stopDrag = (e) => {
    if (!isDragging) return;
    isDragging = false;
    cachedRect = null;
    root.classList.remove('is-dragging');
    try { root.releasePointerCapture(e.pointerId); } catch (err) {}
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    if (e) handlePointer(e);
    if (navigator.vibrate) navigator.vibrate(8);
  };

  root.addEventListener('pointerup', stopDrag);
  root.addEventListener('pointercancel', stopDrag);

  // v7.38：尺寸/可见性变化（挂载、分屏、缩放）→ 按当前值重绘（thumb 像素基准跟新轨道宽）
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      if (root.isConnected && root.clientWidth > 0) updateVisual(curVal, false);
    }).observe(root);
  }

  // 初始化首帧视觉
  updateVisual(curVal, false);

  return {
    getValue: () => curVal,
    setValue: (val) => updateVisual(val, true),
    updateVisual,
  };
}

// 全局自动增强观察器：当任何子应用或页面动态挂载时，自动初始化未绑定的开关
if (typeof window !== 'undefined') {
  window.__initM3Controls = (root) => {
    initAllM3Switches(root || document);
  };
  // 页面加载完成后扫描一次
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAllM3Switches());
  } else {
    setTimeout(() => initAllM3Switches(), 100);
  }
}

// 全局动态 DOM 观察器：无论子页面何时推入，自动增强新挂载的 .md3-switch
// v7.35：收敛为「相关性过滤 + 任务合并」—— 旧实现任意 DOM 变更（toast/时钟/动画
// 逐帧节点增删）都触发全文档 querySelectorAll 扫描且永不休止；现仅当变更批次中
// 新增子树确实包含 .md3-switch 时才调度一次扫描（对新增子树的局部匹配，成本 O(新增)，
// 与全文档规模无关），再经 setTimeout 合并同批多记录，空闲零开销。
if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
  let scanScheduled = false;
  const subtreeHasSwitch = (nodes) => {
    for (const n of nodes) {
      if (n.nodeType !== 1) continue;
      if (n.matches && n.matches('.md3-switch')) return true;
      if (n.querySelector && n.querySelector('.md3-switch')) return true;
    }
    return false;
  };
  const switchObserver = new MutationObserver((records) => {
    for (const r of records) {
      if (r.addedNodes && r.addedNodes.length && subtreeHasSwitch(r.addedNodes)) {
        if (scanScheduled) return;
        scanScheduled = true;
        setTimeout(() => {
          scanScheduled = false;
          initAllM3Switches(document);
        }, 0);
        return;
      }
    }
  });
  if (document.body) {
    switchObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      switchObserver.observe(document.body, { childList: true, subtree: true });
    });
  }
  document.addEventListener('app-page-active', () => {
    initAllM3Switches(document);
  });
}
