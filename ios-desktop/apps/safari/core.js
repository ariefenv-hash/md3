// ==================== safari/core.js — 浏览器返回手势纯函数核（#286 续 · ref-only 补提取第四批 · v10.98） ====================
//
// 职责：safari/index.html PB 返回手势段的纯逻辑真身——PBK 五键常量组 /
// 进度钳制与反推 / 手势步进归一 / 卡片滑出三样式串构造（transform/borderRadius/boxShadow）。
// 内联主脚本（经典 <script>）经 window.__safariCore 桥消费同一份；
// vitest 侧用 new Function 沙箱提取（photos/core.js / drawcircle core.js 同范式）。
//
// ⚠ 模块形态：经典脚本 IIFE（无 export），由 index.html <script src="./core.js"> 同步加载
// （先于主内联脚本），零依赖，保证测试侧 new Function('window', SRC) 可直接执行提取。
//
// 车道：#286 ref-only 候补池第四批（safari 域，高频顺延位——contacts 评估暂缓、
// camera/notes 纯逻辑薄后池内首实）。零行为变化——内联原实现整体搬移，调用点
// 等值换算（钳制/步进/三样式串构造委托，DOM 写回与 q<=0.001 复位语义留在内联）。

(function () {
  'use strict';

  // ==================== PBK 五键常量组（原内联 PBK 常量原样上移） ====================
  // MIN_SCALE=缩小下限 / SPAN=缩放行程 / RADIUS=圆角行程 / SHADOW=阴影行程 / TRACK=跟手行程比
  var PBK = { MIN_SCALE: 0.90, SPAN: 0.10, RADIUS: 28, SHADOW: 0.45, TRACK: 0.85 };

  // ==================== 进度反推（原 pbApply q 段整体搬移，逐位等值） ====================
  /** p∈[0,1] 手势进度 → q=1-clamp(p) 揭示量；q∈[0,1] 闭合。 */
  function pbQ(p) {
    return 1 - Math.max(0, Math.min(1, p));
  }

  // ==================== 手势步进归一（原 progress 段 step 整体搬移，逐位等值） ====================
  /** dx 位移 → 视口宽×TRACK 行程比归一步进∈[0,1]；负位移钳 0。 */
  function pbStep(dx, w) {
    return Math.max(0, Math.min(1, dx / (w * PBK.TRACK)));
  }

  // ==================== 卡片滑出三样式串构造（原 pbApply 样式段整体搬移，逐字符等值） ====================
  /**
   * transform：translate3d(q*100 两位小数 %) + scale(1-SPAN*q 四位小数，MIN_SCALE 下限)；
   * borderRadius：q*RADIUS 一位小数 px；boxShadow：0 16px 44px rgba(0,0,0,SHADOW*q 三位小数) + 固定环境影。
   * q<=0.001 的复位分支不在本核（DOM 复位语义留内联）。
   */
  function pbFrameStyles(q) {
    var scale = Math.max(PBK.MIN_SCALE, 1 - PBK.SPAN * q);
    return {
      transform: 'translate3d(' + (q * 100).toFixed(2) + '%,0,0) scale(' + scale.toFixed(4) + ')',
      borderRadius: (q * PBK.RADIUS).toFixed(1) + 'px',
      boxShadow: '0 16px 44px rgba(0,0,0,' + (PBK.SHADOW * q).toFixed(3) + '), 0 2px 10px rgba(0,0,0,0.2)',
    };
  }

  // ==================== 出口（window 桥；Node 沙箱 / 浏览器双域零崩） ====================
  var core = {
    PBK: PBK,
    pbQ: pbQ,
    pbStep: pbStep,
    pbFrameStyles: pbFrameStyles,
  };
  if (typeof window !== 'undefined') window.__safariCore = core;
})();
