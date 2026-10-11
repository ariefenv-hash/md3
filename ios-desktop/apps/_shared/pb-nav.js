/**
 * pb-nav.js — iframe 应用共享「预览式返回」导航器（Android 14 Predictive Back 规范）
 * ============================================================================
 * v7.28 全应用预览式返回：任何 apps/<id>/index.html 以
 *     <script src="../_shared/pb-nav.js"></script>
 * 引入即可获得与宿主模块应用（page-stack 弹簧）完全同源的返回体验：
 *
 *   · 前进（push）   —— 新视图自右侧滑入（弹簧驱动，卡片随位移微缩/圆角，与宿主同曲线）
 *   · 返回（pop）    —— 当前视图缩为悬浮卡片（scale 0.90 / 圆角 28px / 深投影），
 *                       逐帧揭示下层视图（亮度 0.65→1），松手/落定完成或回弹
 *   · 手势（gesture）—— 宿主把左右边缘拖拽转发进来（begin/progress/commit/cancel），
 *                       1:1 跟手 + 释放速度接力（与 overlay-registry def 协议同构）
 *   · 宿主通信       —— 自动上报 {type:'PB_STATE', canBack}；接收
 *                       {type:'PB_TRIGGER_BACK'}（导航栏返回键）与 {type:'PB_GESTURE'}
 *
 * 卡片数学与宿主 app-window.js renderSubPages 完全一致（同一视觉语言）：
 *   进度 p ∈ [0,1]（1 = 全屏在场；0 = 完全退出）· q = 1-p
 *   transform = translate3d(q·100%,0,0) scale(max(0.90, 1-0.10q))
 *   radius = q·28px · shadow = 0 16px 44px rgba(0,0,0,0.45q) + …
 *   下层 brightness = 0.65 + 0.35q
 *
 * 视图要求：各视图元素 position:absolute（或 fixed）inset:0、共用同一层叠上下文；
 * 注册项可带 z（层叠基值，缺省 0：top=z+2 / prev=z+1）与 fade（透明淡入，适配
 * 全屏媒体查看器类黑色页面）。
 *
 * ⚠ v7.31 契约：视图必须自带不透明 background —— 揭示层设计使下层视图在动画
 * 期与落定后始终 display 在场，透明顶视图会透出下层内容造成文字重合
 * （日历 v7.28-v7.30 曾现此坑）。init 后开发期自动检测透明视图并 console.warn。
 * classic script（无模块依赖），暴露 window.PBNav。
 */
window.PBNav = (function () {
  'use strict';

  // ---------- 常量（与宿主卡片语言一字不差） ----------
  var MIN_SCALE = 0.90;     // 悬浮卡片最小缩放
  var SCALE_SPAN = 0.10;    // 全程缩放行程
  var CARD_RADIUS = 28;     // 悬浮卡片圆角(px)
  var SHADOW_MAX = 0.45;    // 主投影峰值透明度
  var DIM_BASE = 0.65;      // 上层在场时下层压暗基值
  var TRACK_RATIO = 0.85;   // 拖拽位移→进度映射（屏宽×0.85 = 满行程）
  var SPRING_K = 220;       // 弹簧刚度（临界阻尼 C=2√K ≈ 29.7 → ~260ms 利落无回弹）
  var SETTLE_P = 0.0015;    // 位置收敛阈值
  var SETTLE_V = 0.004;     // 速度收敛阈值
  var SUBSTEP = 0.008;      // 物理子步长(s)——低帧率下的积分稳定性

  var REDUCED = false;
  try { REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  // ---------- 状态 ----------
  var views = {};            // id -> {el, z, fade, display}
  var stack = [];            // 视图 id 栈（栈底为根；可为空 = 应用壳即根，push 悬浮其上）
  var shellMode = false;     // v7.28 壳模式：init 不带 root（文档流即根，允许弹空栈回到应用壳）
  var backGate = null;       // v7.28 返回门闸：应用侧消费返回输入（如关闭对话框），true = 已消费
  var onChange = null;       // 应用回调 ({top, canBack, stack, revealing}) —— 业务 UI 同步钩子
  var prog = { p: 1, v: 0, target: 1 };   // 栈顶视图在场进度（唯一真源）
  var pendingPop = null;     // 返回落定前的待弹信息 {count, revealTo}（settle 时才真正出栈）
  var gesture = { active: false, startP: 1 };
  // v7.41 预测式返回方向/垂直跟随（与宿主 renderSubPages 同源）：
  // backDir = 0 规范右滑入场 / 1 左缘右滑（页面右移）/ -1 右缘左滑（页面左移）；
  // backTy = 手势期页面纵向位移 px（渲染 × q，随返回进度出现，落定自动归零）
  var backDir = 0, backTy = 0;
  var TY_GAIN = 0.18, TY_MAX = 72;
  var rafId = 0, lastT = 0;

  /** 壳模式下栈内任意一层都可返回（>0）；根视图模式下需 >1 */
  function minStack() { return shellMode ? 0 : 1; }

  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }

  function viewRec(id) {
    var v = views[id];
    if (v && !v.el && v.selector) v.el = document.querySelector(v.selector);
    return v;
  }

  // ---------- 渲染（卡片数学：与宿主 renderSubPages 同源） ----------
  function render() {
    var n = stack.length;
    if (!n) return;
    var topId = stack[n - 1];
    var top = viewRec(topId);
    if (!top) return;
    var tEl = top.el;
    var p = clamp(prog.p, 0, 1);
    var q = 1 - p;

    // 栈顶：悬浮卡片（拖拽/动画期）↔ 全屏页（落定）
    tEl.style.display = top.display || 'flex';
    if (q < 0.001) {
      tEl.style.transform = '';
      tEl.style.borderRadius = '';
      tEl.style.boxShadow = '';
      tEl.style.overflow = '';
      tEl.style.pointerEvents = 'auto';
    } else {
      var scale = Math.max(MIN_SCALE, 1 - SCALE_SPAN * q);
      // v7.41：横向位移跟随手势方向（右缘左滑 → 页面左移）；纵向位移 = backTy×q
      // （随返回进度出现）；前进/按钮返回 backDir=0 → 规范右滑
      var dirSign = (backDir === -1) ? -1 : 1;
      var txPct = dirSign * q * 100;
      var tyPx = backTy * q;
      tEl.style.transform = 'translate3d(' + txPct.toFixed(2) + '%,' + tyPx.toFixed(1) + 'px,0) scale(' + scale.toFixed(4) + ')';
      tEl.style.borderRadius = (q * CARD_RADIUS).toFixed(1) + 'px';
      tEl.style.boxShadow = q > 0.01
        ? '0 16px 44px rgba(0,0,0,' + (SHADOW_MAX * q).toFixed(3) + '), 0 2px 10px rgba(0,0,0,0.2)'
        : '';
      tEl.style.transformOrigin = 'center center';
      tEl.style.overflow = 'hidden';
      tEl.style.pointerEvents = 'none';
    }
    tEl.style.opacity = top.fade ? p.toFixed(3) : '';
    tEl.style.zIndex = String((top.z || 0) + 2);
    tEl.style.visibility = '';

    // 下层：原位全尺寸，仅随返回进度压暗/复明
    if (n > 1) {
      var prev = viewRec(stack[n - 2]);
      if (prev) {
        var pEl = prev.el;
        pEl.style.display = prev.display || 'flex';
        pEl.style.transform = 'translate3d(0,0,0) scale(1)';
        pEl.style.opacity = prev.fade ? '1' : '';
        pEl.style.filter = q > 0.001 ? 'brightness(' + (DIM_BASE + 0.35 * q).toFixed(3) + ')' : '';
        pEl.style.borderRadius = '0';
        pEl.style.boxShadow = '';
        pEl.style.zIndex = String((prev.z || 0) + 1);
        pEl.style.pointerEvents = 'none';
        pEl.style.visibility = '';
      }
    }

    // 更深层：全部收起
    for (var i = 0; i < n - 2; i++) {
      var deep = viewRec(stack[i]);
      if (deep) hideEl(deep);
    }
  }

  function hideEl(v) {
    v.el.style.display = 'none';
    v.el.style.visibility = 'hidden';
    v.el.style.transform = '';
    v.el.style.filter = '';
    v.el.style.opacity = '';
    v.el.style.pointerEvents = '';
    v.el.style.zIndex = '';
  }

  // ---------- 弹簧循环（半隐式欧拉 + 定长子步；仅动画期占用 rAF） ----------
  function animateTo(target, v0) {
    prog.target = target;
    if (typeof v0 === 'number') prog.v = v0;
    if (REDUCED) { // 减少动效：瞬时到位（保留状态机语义）
      prog.p = target; prog.v = 0;
      onFrame(); return;
    }
    if (!rafId) {
      lastT = 0;
      rafId = requestAnimationFrame(tick);
    }
  }

  function stopAnim() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  function tick(now) {
    var dt = lastT ? (now - lastT) / 1000 : 0.016;
    lastT = now;
    dt = clamp(dt, 0.001, 0.05);
    var remain = dt;
    while (remain > 1e-6) {
      var h = Math.min(SUBSTEP, remain);
      var a = SPRING_K * (prog.target - prog.p) - 2 * Math.sqrt(SPRING_K) * prog.v;
      prog.v += a * h;
      prog.p += prog.v * h;
      remain -= h;
    }
    onFrame();
    if (Math.abs(prog.target - prog.p) < SETTLE_P && Math.abs(prog.v) < SETTLE_V) {
      rafId = 0;
      prog.p = prog.target; prog.v = 0;
      settle();
    } else {
      rafId = requestAnimationFrame(tick);
    }
  }

  function onFrame() { render(); }

  /** 弹簧落定：返回（target=0）时真正出栈并复位进度；前进落定仅收尾 */
  function settle() {
    if (prog.target === 0) {
      if (pendingPop) {
        var pp = pendingPop; pendingPop = null;
        // 揭示目标在栈内 → 截到其上一级；否则回落根视图（popTo 兜底路径）
        var revealId = pp.revealTo && stack.indexOf(pp.revealTo) >= 0 ? pp.revealTo : null;
        var cut = revealId ? stack.indexOf(revealId) : stack.length - 2;
        // v7.28 壳模式允许弹空（cut=-1 → 栈清空回到应用壳）；根视图模式防御性保底 0
        if (cut < 0) cut = shellMode ? -1 : 0;
        for (var i = stack.length - 1; i > cut; i--) {
          var gone = viewRec(stack[i]);
          if (gone) hideEl(gone);
        }
        stack = stack.slice(0, cut + 1);
        // popTo 兜底：根不是目标 → 瞬时压入目标层（单次动画完成“换页”）
        if (pp.revealTo && stack[stack.length - 1] !== pp.revealTo && views[pp.revealTo]) {
          stack.push(pp.revealTo);
        }
      } else if (stack.length) {
        var top = viewRec(stack.pop());
        if (top) hideEl(top);
      }
      prog.p = 1; prog.v = 0; prog.target = 1;
      backDir = 0; backTy = 0; // v7.41：弹出落定复位方向/纵向偏移
      render();
      reportState();
      fireChange();
      return;
    }
    // 前进落定 / 手势取消回满屏：方向复位（后续按钮返回走规范右滑）
    backDir = 0; backTy = 0;
    render();
    reportState(); // 前进落定同样回报（canBack 状态在 push 时即已上报，此处幂等）
  }

  // ---------- 应用回调与宿主回报 ----------
  function fireChange(extra) {
    if (onChange) {
      var payload = {
        top: stack[stack.length - 1] || null,
        canBack: stack.length > minStack(),
        stack: stack.slice(),
        revealing: null,
      };
      if (extra) { Object.keys(extra).forEach(function (k) { payload[k] = extra[k]; }); }
      try { onChange(payload); } catch (e) {}
    }
  }

  function reportState() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'PB_STATE', canBack: stack.length > minStack() }, '*');
      }
    } catch (e) {}
  }

  /** v7.28 返回门闸：应用侧消费返回输入（如关闭对话框/浮层），true = 已消费不再出栈 */
  function setBackGate(fn) { backGate = typeof fn === 'function' ? fn : null; }

  function safeGate() {
    try { return backGate() === true; } catch (e) { return false; }
  }

  // ---------- 栈操作 ----------
  function init(opts) {
    opts = opts || {};
    views = {};
    var defs = opts.views || {};
    Object.keys(defs).forEach(function (id) {
      var d = defs[id];
      var el = typeof d === 'string' ? document.querySelector(d) : (d.el || (d.selector ? document.querySelector(d.selector) : null));
      if (!el) return; // 视图元素缺失：跳过注册（应用侧防呆）
      views[id] = { el: el, z: d.z || 0, fade: !!d.fade, display: d.display || 'flex', selector: d.selector || null };
    });
    onChange = typeof opts.onChange === 'function' ? opts.onChange : null;
    stack = [];
    shellMode = !opts.root; // v7.28 壳模式：不带 root = 文档流即根（push 悬浮其上，可弹空）
    prog = { p: 1, v: 0, target: 1 };
    pendingPop = null;
    gesture.active = false;
    stopAnim();
    // 初始视图（可选）：与 push 的区别是不播前进动画（首屏直给）
    if (opts.root && views[opts.root]) {
      stack = [opts.root];
    }
    Object.keys(views).forEach(function (id) {
    var v = views[id];
      if (stack.indexOf(id) === -1) hideEl(v);
    });
    render();
    reportState();
    fireChange();
    auditViewOpacity(); // v7.31：开发期透明视图告警（文档契约的运行时护栏）
    return api;
  }

  /** v7.31 开发期护栏：注册视图若全透明（无背景且无 fade 语义豁免），落定态会
   *  透出下层内容 —— 文档加载后检查一次并 console.warn（零运行期成本） */
  function auditViewOpacity() {
    function check() {
      Object.keys(views).forEach(function (id) {
        var v = views[id];
        if (!v || !v.el) return;
        var bg;
        try { bg = getComputedStyle(v.el).backgroundColor; } catch (e) { return; }
        var alpha = /rgba\(\s*[\d.]+,\s*[\d.]+,\s*[\d.]+,\s*0\s*\)/.test(bg) || bg === 'transparent';
        if (alpha && !v.fade) {
          try { console.warn('[PBNav] 视图 "' + id + '" 背景全透明：揭示层设计下层视图在场，' +
            '透明顶视图会与其内容重合 —— 请为该视图补充不透明 background'); } catch (e) {}
        }
      });
    }
    if (document.readyState === 'complete') { setTimeout(check, 0); return; }
    try { window.addEventListener('load', function () { setTimeout(check, 0); }, { once: true }); }
    catch (e) { setTimeout(check, 800); }
  }

  /** 前进导航：新视图自右侧滑入；同顶幂等（仅回调刷新）；返回途中 push = 无缝反转 */
  function push(id) {
    var v = viewRec(id);
    if (!v) return false;
    if (gesture.active) { // 手势中前进：取消手势（视图回满屏）后继续
      gesture.active = false;
    }
    if (pendingPop) pendingPop = null; // 取消待弹栈（与宿主 pushSubPage 反转语义一致）
    var topId = stack[stack.length - 1];
    if (topId === id) { fireChange(); return true; } // 同页幂等（防双击重入）
    if (stack.indexOf(id) >= 0) { // 已在栈中非顶：瞬时重排到该层（防环）
      var cut = stack.indexOf(id);
      for (var i = stack.length - 1; i > cut; i--) hideEl(viewRec(stack[i]));
      stack = stack.slice(0, cut + 1);
      prog.p = 1; prog.v = 0; stopAnim();
      render(); reportState(); fireChange();
      return true;
    }
    stack.push(id);
    prog.p = 0; prog.v = 0;
    backDir = 0; backTy = 0; // v7.41：前进永远自右侧滑入（清手势遗留方向）
    render();
    animateTo(1, 0);
    reportState();
    fireChange();
    return true;
  }

  /** 预览式返回（按钮/键盘/宿主触发）：target 0 弹簧 + 落定出栈 */
  function pop(velocity) {
    if (stack.length <= minStack()) { reportState(); return false; }
    if (pendingPop) return false; // 返回动画进行中忽略连点（与 iOS / 宿主一致）
    if (gesture.active) gesture.active = false;
    pendingPop = { count: 1 };
    // v7.28：返回起点即回调 revealing —— 揭示层内容在动画期间就须在场（而非落定后才渲染）
    fireChange({ revealing: stack.length > 1 ? stack[stack.length - 2] : null });
    if (typeof velocity !== 'number') velocity = 0;
    animateTo(0, clamp(velocity, -6, 6));
    reportState(); // canBack 立即按“弹出一层后”语义？——保持当前真值，落定时再报
    return true;
  }

  /** 返回并揭示指定视图：栈内目标 = 落定截栈直达；栈外目标 = 弹空后瞬时压入（单次动画换页） */
  function popTo(id) {
    if (!views[id]) return pop();
    if (stack.indexOf(id) >= 0 && stack[stack.length - 1] === id) { fireChange(); return true; }
    if (stack.indexOf(id) < 0 && stack.length <= minStack()) return push(id); // 栈空/仅根：等价前进
    // v7.28：返回动画飞行中到达的导航意图（深链等）不静默吞掉 —— 取消待弹栈，
    // 当前动画无缝转为本次目标（与 push 的「返回途中前进 = 反转」语义对称）
    if (pendingPop) pendingPop = null;
    if (gesture.active) gesture.active = false;
    pendingPop = { count: 1, revealTo: id }; // 栈内目标：settle 按 revealTo 截栈直达该层
    fireChange({ revealing: stack.length > 1 ? stack[stack.length - 2] : null });
    animateTo(0, 0);
    reportState();
    return true;
  }

  /** 重置为某视图（瞬时，无动画）——深链/初始化 */
  function resetTo(id) {
    if (!views[id]) return false;
    stopAnim();
    pendingPop = null; gesture.active = false;
    stack = [id];
    prog = { p: 1, v: 0, target: 1 };
    Object.keys(views).forEach(function (k) {
      if (k !== id) hideEl(views[k]);
    });
    render();
    reportState();
    fireChange();
    return true;
  }

  function canBack() { return stack.length > minStack(); }
  function top() { return stack[stack.length - 1] || null; }
  function isAnimating() { return !!rafId || !!pendingPop; }

  // ---------- 手势协议（宿主转发；与 overlay-registry def 同构） ----------
  /** @param {{dir?: number}} [opts] dir=-1 右缘左滑（页面左移）；缺省 +1 规范右移 */
  function beginGesture(opts) {
    if (!stack.length) return;
    gesture.active = true;
    gesture.startP = clamp(prog.p, 0, 1);
    backDir = (opts && opts.dir === -1) ? -1 : 1;
    backTy = 0;
    pendingPop = null; // 手势接管进行中的返回
    stopAnim();
  }

  function progressGesture(dx, dy) {
    if (!gesture.active) return;
    var w = Math.max(1, window.innerWidth);
    var step = clamp(dx / (w * TRACK_RATIO), 0, 1);
    prog.p = clamp(gesture.startP - step, 0, 1);
    prog.v = 0;
    prog.target = prog.p;
    // v7.41：纵向跟随手指（渲染时 × q，随返回进度出现）
    backTy = clamp((typeof dy === 'number' ? dy : 0) * TY_GAIN, -TY_MAX, TY_MAX);
    render();
  }

  function endGesture(commit, vx) {
    if (!gesture.active) return;
    gesture.active = false;
    var w = Math.max(1, window.innerWidth);
    var v = 0;
    if (typeof vx === 'number') v = clamp(-vx / (w * TRACK_RATIO), -6, 6); // px/s → 进度/s（p 减小方向为正）
    if (commit) {
      if (stack.length <= minStack()) { // 根层误触发：回满屏
        animateTo(1, v); return;
      }
      pendingPop = { count: 1 };
      animateTo(0, v);
      reportState();
    } else {
      animateTo(1, -v); // 回弹（速度反向接力）
    }
  }

  // ---------- 宿主消息 ----------
  window.addEventListener('message', function (e) {
    if (window.parent !== window && e.source !== window.parent) return;
    var d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'PB_TRIGGER_BACK') { if (backGate && safeGate()) return; pop(); return; }
    if (d.type === 'PB_SYNC_REQ') { reportState(); return; }
    if (d.type === 'PB_GESTURE') {
      if (d.phase === 'begin') { if (backGate && safeGate()) return; beginGesture({ dir: d.dir }); }
      else if (d.phase === 'progress') progressGesture(d.dx || 0, d.dy || 0);
      else if (d.phase === 'end') endGesture(!!d.commit, d.vx || 0);
    }
  });

  // ---------- 调试透视（E2E 用） ----------
  function __state() {
    return { stack: stack.slice(), p: +prog.p.toFixed(4), v: +prog.v.toFixed(4),
      target: prog.target, canBack: stack.length > minStack(), shellMode: shellMode, pendingPop: !!pendingPop,
      gesture: gesture.active, animating: !!rafId, backDir: backDir, backTy: +backTy.toFixed(1) };
  }

  var api = {
    init: init, push: push, pop: pop, popTo: popTo, resetTo: resetTo,
    canBack: canBack, top: top, isAnimating: isAnimating, setBackGate: setBackGate,
    beginGesture: beginGesture, progressGesture: progressGesture, endGesture: endGesture,
    __state: __state,
  };
  return api;
})();
