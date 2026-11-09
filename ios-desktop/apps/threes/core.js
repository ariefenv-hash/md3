/* threes/core.js — Threes! 纯数据表与计分/合并纯函数（#286 续 ref-only 第七批补 core 提取）
 * 范式：photos/core.js 同款经典 IIFE（零依赖、零 export），经 window.__threesCore 桥自注册；
 * index.html 以 <script src="./core.js"> 同步先于主内联脚本加载，常量表与纯函数单源消费。
 * 仅承载无 DOM 副作用的常量表与纯函数：ThreesGame / ThreesAI 类体留在 index.html 内联
 * （类方法经 this 桥委托本 core，canCombine/getMergedVal/getScore 三契约点全走桥）。 */
(function () {
  'use strict';

  // 调色板与表情配置（14 档同键：1..6144）
  var FACES = { 1:'• ‿ •', 2:'¬ ‿ ¬', 3:'◕ ‿ ◕', 6:'•̀ ᴗ •́', 12:'^ ◡ ^', 24:'＊ ‿ ＊', 48:'ᵕ ◡ ᵕ', 96:'＊ ◡ ＊', 192:'v 皿 v', 384:'(•̀_ರ)', 768:'(■_■)', 1536:'王•ᴗ•', 3072:'ᵕ.̫ᵕ', 6144:'神(•̀_•́)神' };
  var PALETTE = { 1: '#5fa8eb', 2: '#eb5757', 3: '#fff', 6: '#fffbe6', 12: '#fff3e0', 24: '#ffe0b2', 48: '#ffebee', 96: '#f3e5f5', 192: '#e8eaf6', 384: '#e0f2f1', 768: '#fff8e1', 1536: '#efebe9', 3072: '#263238', 6144: '#ffd700' };
  var TEXT_COLS = { 1:'#fff', 2:'#fff', 3:'#2b2b2b', 6:'#ff9800', 12:'#f57c00', 24:'#e65100', 48:'#e91e63', 96:'#9c27b0', 192:'#3f51b5', 384:'#00796b', 768:'#ffa000', 1536:'#5d4037', 3072:'#eceff1', 6144:'#fff' };

  // 计分：1/2 计零，v>=3 时 3^(log2(v/3)+1)
  function getScore(v) { return v < 3 ? 0 : 3 ** (Math.log2(v / 3) + 1); }

  // 合并契约：1+2 / 2+1 可合并；v>=3 同值可合并
  function canCombine(a, b) { return (a === 1 && b === 2) || (a === 2 && b === 1) || (a >= 3 && a === b); }
  function getMergedVal(a, b) { return (a === 1 && b === 2) || (a === 2 && b === 1) ? 3 : a + b; }

  // 方向几何：g(i,p) 把「第 i 行/列、行内进度 p」映射到棋盘 (r,c)；s(i) 给出该线新生格 spawn 位
  var DIRS = {
    left:  { g: function (i, p) { return [i, p]; },     s: function (i) { return { r: i, c: 3 }; } },
    right: { g: function (i, p) { return [i, 3 - p]; }, s: function (i) { return { r: i, c: 0 }; } },
    up:    { g: function (i, p) { return [p, i]; },     s: function (i) { return { r: 3, c: i }; } },
    down:  { g: function (i, p) { return [3 - p, i]; }, s: function (i) { return { r: 0, c: i }; } }
  };

  // AI 行序表：四向各四条线的扁平索引序（Int32Array 16 格坐标）
  var AI_LINES = {
    left:  [[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15]],
    right: [[3,2,1,0],[7,6,5,4],[11,10,9,8],[15,14,13,12]],
    up:    [[0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15]],
    down:  [[12,8,4,0],[13,9,5,1],[14,10,6,2],[15,11,7,3]]
  };

  // Grandmaster 蛇形权重矩阵：6 席 × 16 值（eval 求值器蛇形项）
  var SNAKE_MATS = [
    [24,21,18,15,8,9,11,13,7,6,4,2,0,1,2,3], [24,8,7,0,21,9,6,1,18,11,4,2,15,13,2,3],
    [15,18,21,24,13,11,9,8,2,4,6,7,3,2,1,0], [0,7,8,24,1,6,9,21,2,4,11,18,3,2,13,15],
    [0,1,2,3,7,6,4,2,8,9,11,13,24,21,18,15], [15,13,2,3,18,11,4,2,21,9,6,1,24,8,7,0]
  ];

  var root = typeof window !== 'undefined' ? window : globalThis;
  root.__threesCore = { FACES: FACES, PALETTE: PALETTE, TEXT_COLS: TEXT_COLS, DIRS: DIRS, AI_LINES: AI_LINES, SNAKE_MATS: SNAKE_MATS, getScore: getScore, canCombine: canCombine, getMergedVal: getMergedVal };
})();
