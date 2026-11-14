// ==================== flow11 core — #286 续车道 ref-only 第十一批补 core 提取（v11.30 · Job 2932311 · 第 1 定时消息系列） ====================
// 范式：photos/core.js 同款经典 IIFE（零依赖零 export，经典脚本先于主内联同步加载）。
// 真源边界（按 R146 加餐备料 6743260765 三族分批）：
//   A 族连线判定：isAdjacent（9 邻域含斜向）/ pathBaseLevel（路径首个数值锚，参数化 path）/ canConnectGems（特殊方块通配+数值锚定）；
//   B 族计分数学：mergeGain（2^baseLvl·count·10·multFactor）/ mergeTargetLevel（+1/+2 与 11 封顶）/
//                 bombCells（3×3 边界裁剪格子清单）/ laserCells（整行整列清单，中心去重幂等置 0 语义等价）；
//   C 族生成权重：GEM_WEIGHTS（45/30/18/7 表）/ SPECIAL_GEMS（W/B/L/2X 序）/ EXPANSION_DROP_P（0.06）/
//                 rollGemLevel（rng 注入参数化+expansion 判定入参，Math.random 逐次新鲜留 host）。
// D 族几何（getCellCenter/getCellFromPoint）与 E 重力补充/F IO 渲染留 index.html 内联（host 侧职责）：
//   D 族实质 DOM 桥接（querySelector+getBoundingClientRect+elementFromPoint），参数化即纯委托无实质，硬提即硬造。
// 消费契约：index.html 经 window.__flow11Core.* 委托调用；tests/v286 Y 组沙箱提取真身直连（测的即运行真身非孤立副本）。
(function () {
  'use strict';

  // ---- C 族：生成权重 ----

  // 普通晶石等级权重表（等级 1-4 → 权重 45/30/18/7，total=100）
  var GEM_WEIGHTS = [
    { lvl: 1, w: 45 },
    { lvl: 2, w: 30 },
    { lvl: 3, w: 18 },
    { lvl: 4, w: 7 },
  ];

  // 特殊晶石种类与注入序（万能彩晶 W / 爆破炸弹 B / 闪电激光 L / 双倍增幅 2X）
  var SPECIAL_GEMS = ['W', 'B', 'L', '2X'];

  // 拓展版模式下普通生成位直接下落特殊方块的概率
  var EXPANSION_DROP_P = 0.06;

  // 普通晶石生成权重核：rng 注入参数化（host 侧传 Math.random 保持逐次新鲜），
  // mode='expansion' 时先掷特殊下落（第二次掷选种类），否则按 GEM_WEIGHTS 累积切分。
  // 语义与内联版逐行等价：rand < w 顺序判入、越界回落 1。
  function rollGemLevel(rng, mode) {
    if (mode === 'expansion' && rng() < EXPANSION_DROP_P) {
      return SPECIAL_GEMS[Math.floor(rng() * SPECIAL_GEMS.length)];
    }
    var total = GEM_WEIGHTS.reduce(function (s, item) { return s + item.w; }, 0);
    var rand = rng() * total;
    for (var i = 0; i < GEM_WEIGHTS.length; i++) {
      if (rand < GEM_WEIGHTS[i].w) return GEM_WEIGHTS[i].lvl;
      rand -= GEM_WEIGHTS[i].w;
    }
    return 1;
  }

  // ---- A 族：连线判定 ----

  // 9 邻域相邻判定（含斜向），自身排除
  function isAdjacent(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
  }

  // 路径基础等级锚：首个数值节点（全特殊方块路径回落 null）
  function pathBaseLevel(path) {
    for (var i = 0; i < path.length; i++) {
      if (typeof path[i].val === 'number') return path[i].val;
    }
    return null;
  }

  // 连线兼容性：特殊方块（W/B/L/2X）与任意方块可连；
  // A 为特殊时按路径数值锚判定（锚为 null 或与 B 同值才可连）；双数值同值可连。
  function canConnectGems(nodeAVal, nodeBVal, path) {
    if (nodeBVal === 'W' || nodeBVal === 'B' || nodeBVal === 'L' || nodeBVal === '2X') return true;
    if (nodeAVal === 'W' || nodeAVal === 'B' || nodeAVal === 'L' || nodeAVal === '2X') {
      var baseLvl = pathBaseLevel(path);
      if (baseLvl === null || baseLvl === nodeBVal) return true;
      return false;
    }
    return nodeAVal === nodeBVal;
  }

  // ---- B 族：计分数学 ----

  // 合成分公式核：2^baseLvl × count × 10 × multFactor（multFactor = 2X 翻倍 × 链长因子 count-1，短链回落 1）
  function mergeGain(count, baseLvl, hasMult) {
    var multFactor = (hasMult ? 2 : 1) * (count > 2 ? (count - 1) : 1);
    return Math.pow(2, baseLvl) * count * 10 * multFactor;
  }

  // 合成目标等级：基础 +1（有 2X 则 +2），11 封顶（board 写入/奇点判定/显示共用）
  function mergeTargetLevel(baseLvl, hasMult, cap) {
    var top = (typeof cap === 'number') ? cap : 11;
    return Math.min(baseLvl + (hasMult ? 2 : 1), top);
  }

  // 炸弹 3×3 清场格子清单（边界裁剪）：宿主按清单置 0，语义与内联循环等价
  function bombCells(r, c, size) {
    var out = [];
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        var nr = r + dr;
        var nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.push({ r: nr, c: nc });
      }
    }
    return out;
  }

  // 激光整行整列清场格子清单（按 i 交替行/列与源码双写序一致；中心去重，幂等置 0 语义等价）
  function laserCells(r, c, size) {
    var out = [];
    var seen = {};
    for (var i = 0; i < size; i++) {
      var a = { r: r, c: i };
      var b = { r: i, c: c };
      if (!seen[a.r + ',' + a.c]) { seen[a.r + ',' + a.c] = 1; out.push(a); }
      if (!seen[b.r + ',' + b.c]) { seen[b.r + ',' + b.c] = 1; out.push(b); }
    }
    return out;
  }

  window.__flow11Core = {
    GEM_WEIGHTS: GEM_WEIGHTS,
    SPECIAL_GEMS: SPECIAL_GEMS,
    EXPANSION_DROP_P: EXPANSION_DROP_P,
    rollGemLevel: rollGemLevel,
    isAdjacent: isAdjacent,
    pathBaseLevel: pathBaseLevel,
    canConnectGems: canConnectGems,
    mergeGain: mergeGain,
    mergeTargetLevel: mergeTargetLevel,
    bombCells: bombCells,
    laserCells: laserCells,
  };
})();
