// ==================== m3-controls.js — Material 3 原生触控组件引擎 ====================
// 精准复刻 Android 16 (Material You) 规范：
//   1. 可拖拽 MD3 开关组件 (Draggable Switch)
//      - 开启态：全填充强调色、无边框、纯白大号圆球 (24px)
//      - 关闭态：微暗底槽、2px 轮廓边框、灰色小号圆球 (16px)
//      - 拖拽态：小球动态膨胀为 28px，手指 1:1 跟手拖曳，跨越中线/速度判定吸附，防误触
//   2. 两种 MD3 Expressive 滑块组件 (Slider)
//      - 有级滑块 (Discrete)：均匀刻度圆点，激活区 on-primary 点、未激活区主色点，
//        手柄间隙 ±13px 内自动隐没；竖柄药丸手柄 (6×60px)
//      - 无级滑块 (Continuous)：连续流体调节，末端停止圆点，竖柄药丸手柄 (6×60px)
//      - 24px 厚双段轨道（激活段左 + 未激活段右），竖柄两侧各 10px 物理断开间隙
//      - 全量跟随 --md-primary 动态主题色

import { clamp } from './utils.js';
import { sliderClipPaths } from './slider-geom.js';

// ---------- 1. MD3 开关拖拽引擎 ----------

/**
 * 为单个开关元素绑定 1:1 拖拽与高灵敏触控
 * @param {HTMLElement} labelEl .md3-switch 包装容器
 */
export function initM3Switch(labelEl) {
  if (!labelEl || labelEl._m3Bound) return;
  labelEl._m3Bound = true;

  const input = labelEl.querySelector('input[type="checkbox"]');
  const thumb = labelEl.querySelector('.thumb');
  const slider = labelEl.querySelector('.slider');
  if (!input || !thumb || !slider) return;

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
  let lastLeftPx = -1;     // 脏检查：同值不重写
  let lastOn = null;       // 颜色态脏检查

  // 轨道宽度 52px，内边距各 2px，可用宽度 48px
  // 正常未拖拽时：关态 thumb=16px (left=6px), 开态 thumb=24px (left=22px)
  // 拖拽激活态 thumb 膨胀为 28px，活动范围 left 从 2px 到 22px (travel = 20px)
  const MIN_LEFT = 2;
  const MAX_LEFT = 22;
  const TRAVEL = MAX_LEFT - MIN_LEFT; // 20px

  function beginDragVisual() {
    // 拖拽起始一次性写入恒定量（旧实现逐事件重复写 7 个内联属性）
    thumb.style.top = '50%';
    thumb.style.transform = 'translateY(-50%)';
    thumb.style.width = '28px';
    thumb.style.height = '28px';
    thumb.style.transition = 'none';
    slider.style.transition = 'none';
  }

  function applyDragVisual(ratio) {
    const r = clamp(ratio, 0, 1);
    const leftPx = MIN_LEFT + r * TRAVEL;
    if (Math.abs(leftPx - lastLeftPx) > 0.05) {
      lastLeftPx = leftPx;
      thumb.style.left = `${leftPx.toFixed(1)}px`;
    }
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

  function resetDragVisual() {
    flushDragVisual();
    lastLeftPx = -1;
    lastOn = null;
    thumb.style.left = '';
    thumb.style.top = '';
    thumb.style.transform = '';
    thumb.style.width = '';
    thumb.style.height = '';
    thumb.style.background = '';
    thumb.style.transition = '';
    slider.style.background = '';
    slider.style.borderColor = '';
    slider.style.transition = '';
    labelEl.classList.remove('is-dragging');
  }

  // v7.35：阻断 label 原生激活转发 —— pointerup 已手动切换并派发 change，
  // label 转发会二次翻转 checked（实测 change×2 [true,false] 净效果=关，设置全部开关失效）。
  // 仅拦截指针产生的点击（detail≥1）且目标非 input 本体（保留键盘/AT 原生路径）。
  labelEl.addEventListener('click', (e) => {
    if (e.detail > 0 && e.target !== input) e.preventDefault();
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
      pendingRatio = clamp(startRatio + dx / TRAVEL, 0, 1);
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
      let finalRatio = startRatio + dx / TRAVEL;
      // 速度助力：快速向右甩动开启，向左甩动关闭
      if (velX > 0.3) finalRatio = 1;
      else if (velX < -0.3) finalRatio = 0;

      const targetChecked = finalRatio >= 0.5;
      const changed = input.checked !== targetChecked;
      resetDragVisual();
      if (changed) {
        input.checked = targetChecked;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        if (navigator.vibrate && !cancelled) navigator.vibrate(12);
      }
    } else {
      resetDragVisual();
      if (cancelled) return; // v7.49：无位移的取消不切换（保持点击语义纯净）
      // 轻点切换（原生转发已被 click 守卫阻断，此处为唯一切换源）
      input.checked = !input.checked;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      if (navigator.vibrate) navigator.vibrate(8);
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
