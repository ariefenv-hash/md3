// ==================== photos/core.js — 相册编辑器纯函数核（#286 续 · ref-only 补提取第二批 · v10.97） ====================
//
// 职责：photos/index.html 编辑器内联脚本的纯逻辑真身——滤镜预设八档表 /
// 亮度对比饱和三滑条 CSS filter 串构造 / 旋转感知画布尺寸与等比缩放计算。
// 内联主脚本（经典 <script>）经 window.__photoCore 桥消费同一份；
// vitest 侧用 new Function 沙箱提取（drawcircle core.js / fx-core.js 同范式）。
//
// ⚠ 模块形态：经典脚本 IIFE（无 export），由 index.html <script src="./core.js"> 同步加载
// （先于主内联脚本），零依赖，保证测试侧 new Function('window', SRC) 可直接执行提取。
//
// 车道：#286 ref-only 候补池第二批（photo 域，idRefs=23 高频优先首位）。零行为变化——
// 内联原实现整体搬移，调用点等值换算（drawCanvas 尺寸段 + filter 串段 + 预览滤镜表）。

(function () {
  'use strict';

  // ==================== 滤镜预设八档（原内联 filters 常量原样上移） ====================
  var FILTERS = [
    { name: '原图', filter: '' },
    { name: '复古', filter: 'sepia(0.45)' },
    { name: '黑白', filter: 'grayscale(1)' },
    { name: '暖阳', filter: 'sepia(0.25) saturate(1.2)' },
    { name: '冷调', filter: 'hue-rotate(180deg) saturate(0.85)' },
    { name: '高对比', filter: 'contrast(1.35) saturate(1.15)' },
    { name: '柔和', filter: 'brightness(1.08) saturate(0.85) contrast(0.95)' },
    { name: '电影', filter: 'contrast(1.15) saturate(0.9) brightness(0.92)' },
  ];

  // ==================== CSS filter 串构造（原 drawCanvas filterStr 段整体搬移，逐字符等值） ====================
  /**
   * 三滑条基准 100 偏移 + 预设滤镜追加：'brightness(105%) contrast(100%) saturate(95%) [preset]'。
   * presetFilter 空串（原图档）不追加空尾——与原 if (filters[i].filter) 条件语义一致。
   */
  function buildFilterStr(brightness, contrast, saturation, presetFilter) {
    var b = 100 + brightness;
    var c = 100 + contrast;
    var s = 100 + saturation;
    var str = 'brightness(' + b + '%) contrast(' + c + '%) saturate(' + s + '%)';
    if (presetFilter) str += ' ' + presetFilter;
    return str;
  }

  // ==================== 旋转感知画布尺寸（原 drawCanvas 尺寸段整体搬移，逐位等值） ====================
  /**
   * 90°/270° 旋转交换宽高 → maxW/maxH 约束下等比缩放（上限 1 不放大）→
   * 返回 canvas.width/height（下限 1 防 0 尺寸）与 scale（drawImage 的 dw/dh 消费同一值）。
   */
  function editorCanvasSize(imgW, imgH, rotation, maxW, maxH) {
    var rotated = rotation % 180 !== 0;
    var w = rotated ? imgH : imgW;
    var h = rotated ? imgW : imgH;
    var scale = Math.min(maxW / w, maxH / h, 1);
    return {
      width: Math.max(1, Math.floor(w * scale)),
      height: Math.max(1, Math.floor(h * scale)),
      scale: scale,
    };
  }

  // ==================== 出口（window 桥；Node 沙箱 / 浏览器双域零崩） ====================
  var core = {
    FILTERS: FILTERS,
    buildFilterStr: buildFilterStr,
    editorCanvasSize: editorCanvasSize,
  };
  if (typeof window !== 'undefined') window.__photoCore = core;
})();
