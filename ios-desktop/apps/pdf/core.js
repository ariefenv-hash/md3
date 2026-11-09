// ==================== pdf core — #286 续车道 ref-only 第六批补 core 提取（v10.96 · Job 2931605 · 第 3 定时消息系列） ====================
// 范式：photos/core.js 同款经典 IIFE（零依赖零 export，经典脚本先于主内联同步加载）。
// 真源边界：仅收纳纯函数与常量（体积格式化 / 路径基名 / 缩放钳制 / 页码钳制 / 目录大纲扁平化 /
// 全文搜索命中收集 / 顶栏按压联动数学）；pdf.js 编解码、canvas 渲染、DOM 读写、VFS 桥留 index.html 内联。
// 消费契约：index.html 经 window.__pdfCore.* 委托调用；tests/v286 M 组沙箱提取真身直连（测的即运行真身非孤立副本）。
(function () {
  'use strict';

  // #166 防御常量：全文搜索仅索引前 500 页（zip 炸弹防御同精神）
  var PDF_MAX_PAGES = 500;
  // 缩放边界：0.5x–3.0x，±10% 步进
  var SCALE_MIN = 0.5, SCALE_MAX = 3.0, SCALE_STEP = 0.1;

  // 体积三档格式化：null→'' / <1024 B / <1MB KB（一位小数）/ 其余 MB（一位小数）
  function fmtSize(n) {
    if (n == null) return '';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  // 路径基名：空值防御后按 / 切尾段
  function baseOf(p) { return (p || '').split('/').pop(); }

  // 缩放钳制 [SCALE_MIN, SCALE_MAX]——renderPage 回写 / zoom 步进 / fitScale 适应宽度三调用点共用一式
  function clampScale(v) {
    return Math.min(SCALE_MAX, Math.max(SCALE_MIN, v));
  }

  // 页码钳制：parseInt 非数值回落 1，钳 [1, total]（total 须 ≥1 由调用侧保证）
  function clampPage(n, total) {
    return Math.min(total, Math.max(1, parseInt(n, 10) || 1));
  }

  // 目录大纲递归扁平化：每层 slice(0, 200) 截断 / depth 钳 [0,3] / 标题空回落「(未命名)」/ 未展开更深子级丢弃
  function flattenOutline(items) {
    var flat = [];
    var walk = function (list, depth) {
      list.slice(0, 200).forEach(function (it) {
        flat.push({ title: it.title || '(未命名)', dest: it.dest, depth: Math.min(depth, 3) });
        if (it.items && it.items.length && depth < 3) walk(it.items, depth + 1);
      });
    };
    walk(items, 0);
    return flat;
  }

  // 全文搜索单页命中收集：小写定位 + 上下文窗（前 16 / 后 20 字符，空白归一）+ 单页 guard 20 处封顶
  function collectHits(text, kwLower, page) {
    var tl = text.toLowerCase();
    var hits = [];
    var at = tl.indexOf(kwLower), guard = 0;
    while (at !== -1 && guard < 20) {
      guard++;
      var raw = text.slice(Math.max(0, at - 16), at + kwLower.length + 20).replace(/\s+/g, ' ');
      hits.push({ page: page, at: at, raw: raw });
      at = tl.indexOf(kwLower, at + kwLower.length);
    }
    return hits;
  }

  // 顶栏整排按压联动（准入⑤-3，tile-bounce 数学同构轻量版）——逐按钮纯样式串构造（archive 同式）
  function rippleStyles(idx, originIdx) {
    var d = Math.abs(idx - originIdx);
    var f = d === 0 ? 1 : Math.max(0, 1 - d * 0.45);
    var sc = d === 0 ? 0.88 : 1 - 0.05 * f;
    var shift = d === 0 ? 0 : (idx < originIdx ? 1 : -1) * 2 * f;
    return {
      transform: 'translateX(' + shift.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')',
      borderRadius: (12 + (d === 0 ? 5 : 3) * f) + 'px',
      zIndex: d === 0 ? '1' : '',
    };
  }

  window.__pdfCore = {
    PDF_MAX_PAGES: PDF_MAX_PAGES,
    SCALE_MIN: SCALE_MIN,
    SCALE_MAX: SCALE_MAX,
    SCALE_STEP: SCALE_STEP,
    fmtSize: fmtSize,
    baseOf: baseOf,
    clampScale: clampScale,
    clampPage: clampPage,
    flattenOutline: flattenOutline,
    collectHits: collectHits,
    rippleStyles: rippleStyles,
  };
})();
