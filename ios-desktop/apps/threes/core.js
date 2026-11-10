/* threes/core.js — Threes! 纯数据表与计分/合并纯函数（#286 续 ref-only 第八批补 core 提取 · v11.13 深提增值合流）+ GM AI 核增值合流段（R145 窗 · Job 2933040 · 第 2 定时消息系列）
 * 合流口径：第八批九出口（六表+三契约）为 423e539f 在先契约原样保留（Q 组锚持真）；增值段 9 出口
 * （deckProbs/bonusPool/mergeFreq/chimeFreq + simFlat/evalFlat/expectimaxFlat/chanceFlat/bestDirFlat 期望树全链）
 * 为本侧深提净增（对侧未触及面，类体仍留 index.html 但四方法委托本核），tests/v286 T 组锚持真。
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


  // ==================== GM AI 核增值段（R145 窗 Job 2933040 第 2 系列 · 9 出口，T 组锚持真） ====================

  // 牌堆概率分布（deck 注入；空堆 1/2/3 均分）
  function deckProbs(deck) {
    if (!deck || !deck.length) return { 1: 1/3, 2: 1/3, 3: 1/3 };
    const c = { 1: 0, 2: 0, 3: 0 }, l = deck.length;
    deck.forEach(v => c[v] !== undefined && c[v]++);
    return { 1: c[1]/l, 2: c[2]/l, 3: c[3]/l };
  }

  // 大盘奖励池：max/8 以内的 6/12/24（genNext 15% 奖励抽签域，随机源留 host）
  function bonusPool(max) { return [6, 12, 24].filter(v => v <= max / 8); }

  // 音频频率数学（sound.merge/chime 取频，Oscillator 接线留 host）
  function mergeFreq(v) { return 380 + Math.min(v * 14, 800); }
  function chimeFreq(r) { return 320 * Math.pow(1.12, r); }

  // 平面模拟（ThreesAI.sim 原样上移：Int32Array 16 格四线扫描，纯数据进出零随机）
  function simFlat(flat, dir) {
    const b = new Int32Array(flat), lines = AI_LINES[dir], spawns = [];
    let moved = false;
    for (let i = 0; i < 4; i++) {
      const [i0, i1, i2, i3] = lines[i];
      let lm = false;
      const shift = (a, c) => {
        if (!b[a] && b[c]) { b[a] = b[c]; b[c] = 0; lm = moved = true; }
        else if (b[a] && b[c] && canCombine(b[a], b[c])) {
          b[a] = getMergedVal(b[a], b[c]); b[c] = 0; lm = moved = true;
        }
      };
      shift(i0, i1); shift(i1, i2); shift(i2, i3);
      if (lm) spawns.push(i3);
    }
    return { moved, b, spawns };
  }

  // 估值（ThreesAI.eval 原样上移）：空格 1400/格 + 可合并匹配 950+log2 权 + 倍数链 340 +
  // 蛇形权重（≥3 格 × (log2(v/3)+1) × 35 取六姿态 max）+ 大据角 3600 − 中央大牌罚 − 1/2 失衡罚
  function evalFlat(b) {
    let empty = 0, ones = 0, twos = 0, maxV = 0, matches = 0, chains = 0, pen = 0;
    for (let i = 0; i < 16; i++) {
      const v = b[i];
      if (!v) { empty++; continue; }
      if (v === 1) ones++; else if (v === 2) twos++;
      if (v > maxV) maxV = v;
      const r = (i / 4) | 0, c = i % 4;
      if ((r === 1 || r === 2) && (c === 1 || c === 2) && v >= 24) pen += (Math.log2(v) - 2) * 350;
      if (c < 3 && b[i + 1]) {
        if (canCombine(v, b[i + 1])) matches += 950 + Math.log2(Math.max(v, 3)) * 140;
        else if (v >= 3 && (v === b[i + 1] * 2 || b[i + 1] === v * 2)) chains += 340;
      }
      if (r < 3 && b[i + 4]) {
        if (canCombine(v, b[i + 4])) matches += 950 + Math.log2(Math.max(v, 3)) * 140;
        else if (v >= 3 && (v === b[i + 4] * 2 || b[i + 4] === v * 2)) chains += 340;
      }
    }
    let bestSnake = 0;
    SNAKE_MATS.forEach(m => {
      let s = 0;
      for (let i = 0; i < 16; i++) if (b[i] >= 3) s += m[i] * (Math.log2(b[i] / 3) + 1) * 35;
      if (s > bestSnake) bestSnake = s;
    });
    const corner = [0, 3, 12, 15].some(idx => b[idx] === maxV) ? 3600 : 0;
    return empty * 1400 + matches + chains + bestSnake + corner - pen - Math.pow(ones - twos, 2) * 260;
  }

  // 期望树（expectimax 参数化上移：probs 注入，deck 搜索期不变；isPlayer 假分支隐式 undefined 语义忠实保留）
  function expectimaxFlat(flat, depth, isPlayer, next, probs) {
    if (!depth) return evalFlat(flat);
    if (isPlayer) {
      let best = -Infinity, canMove = false;
      for (const d of ['left', 'up', 'right', 'down']) {
        const s = simFlat(flat, d);
        if (!s.moved) continue;
        canMove = true;
        best = Math.max(best, chanceFlat(s.b, s.spawns, depth - 1, next, probs));
      }
      return canMove ? best : -999999;
    }
  }

  // 机会节点（chance 参数化上移）：next 已知按均值展开 / 未知按牌堆概率加权
  function chanceFlat(flat, spawns, depth, next, probs) {
    if (!spawns.length) return evalFlat(flat);
    if (next !== null) {
      return spawns.reduce((acc, sp) => {
        flat[sp] = next; const v = expectimaxFlat(flat, depth, true, null, probs); flat[sp] = 0; return acc + v;
      }, 0) / spawns.length;
    }
    let total = 0;
    spawns.forEach(sp => {
      [1, 2, 3].forEach(c => {
        if (probs[c] > 0) {
          flat[sp] = c; total += expectimaxFlat(flat, depth, true, null, probs) * probs[c]; flat[sp] = 0;
        }
      });
    });
    return total / spawns.length;
  }

  // GM 决策（getBestDir 参数化上移：depth 由 host 延迟档决定，零改模拟序）
  function bestDirFlat(flat, next, depth, probs) {
    let best = -Infinity, dir = null;
    for (const d of ['left', 'up', 'right', 'down']) {
      const s = simFlat(flat, d);
      if (!s.moved) continue;
      const score = chanceFlat(s.b, s.spawns, depth - 1, next, probs);
      if (score > best) { best = score; dir = d; }
    }
    return dir;
  }

  var root = typeof window !== 'undefined' ? window : globalThis;
  root.__threesCore = { FACES: FACES, PALETTE: PALETTE, TEXT_COLS: TEXT_COLS, DIRS: DIRS, AI_LINES: AI_LINES, SNAKE_MATS: SNAKE_MATS, getScore: getScore, canCombine: canCombine, getMergedVal: getMergedVal, deckProbs: deckProbs, bonusPool: bonusPool, mergeFreq: mergeFreq, chimeFreq: chimeFreq, simFlat: simFlat, evalFlat: evalFlat, expectimaxFlat: expectimaxFlat, chanceFlat: chanceFlat, bestDirFlat: bestDirFlat };
})();
