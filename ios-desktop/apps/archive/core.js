// ==================== archive core — #286 续车道 ref-only 第六批补 core 提取（v11.26 · Job 2931605 · 第 3 定时消息系列） ====================
// 范式：photos/core.js 同款经典 IIFE（零依赖零 export，经典脚本先于主内联同步加载）。
// 真源边界：仅收纳纯函数与常量（体积三档格式化 / 压缩包命名净化 / 路径基名 / zip 炸弹防御常量 /
// 顶栏按压联动数学 / 分栏钳制）；DOM 读写、VFS 桥、JSZip 编解码本体留 index.html 内联（host 侧职责）。
// 消费契约：index.html 经 window.__archiveCore.* 委托调用；tests/v286 L 组沙箱提取真身直连（测的即运行真身非孤立副本）。
(function () {
  'use strict';

  // VFS 扫描目录（与 archive 域文档口径一致：文档/照片/音乐/压缩包四目录）
  var VFS_DIRS = ['/documents', '/photos', '/music', '/archives'];

  // #166 zip 炸弹防御常量：条目上限 500；声明解压总量上限 200MB
  var ZIP_MAX_ENTRIES = 500;
  var ZIP_MAX_TOTAL = 200 * 1048576;

  // 体积三档格式化：null→'' / <1024 B / <1MB KB（一位小数）/ 其余 MB（一位小数）
  function fmtSize(n) {
    if (n == null) return '';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  // 压缩包命名净化：剥 .zip 后缀 → 非法字符 [\\/:*?"<>|] 换 _ → 截 60 字 → 空回落「新压缩包」→ ext 可选追加
  function safeName(v, ext) {
    var n = (v || '').trim().replace(/\.(zip)$/i, '').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60) || '新压缩包';
    return ext ? n + ext : n;
  }

  // 路径基名：空值防御后按 / 切尾段
  function baseOf(p) { return (p || '').split('/').pop(); }

  // 顶栏整排按压联动（准入⑤-3，tile-bounce 数学同构轻量版）——逐按钮纯样式串构造：
  // d=距离；f=衰减（d=0 满档 1，否则 max(0, 1-d*0.45)）；主位 scale .88 / 邻位 1-0.05f；
  // shift 主位 0 / 前位 +2f / 后位 -2f；圆角主位 12+5f / 邻位 12+3f；zIndex 主位 '1'。
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

  // 分栏拖宽钳制（平板）：比例钳 [0.22, 0.78]
  function clampSplitPct(pct) {
    return Math.min(0.78, Math.max(0.22, pct));
  }

  window.__archiveCore = {
    VFS_DIRS: VFS_DIRS,
    ZIP_MAX_ENTRIES: ZIP_MAX_ENTRIES,
    ZIP_MAX_TOTAL: ZIP_MAX_TOTAL,
    fmtSize: fmtSize,
    safeName: safeName,
    baseOf: baseOf,
    rippleStyles: rippleStyles,
    clampSplitPct: clampSplitPct,
  };
})();
