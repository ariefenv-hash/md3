// ==================== threes core — #286 续车道 ref-only 第七批补 core 提取（v10.96 · Job 2933040 · 第 2 定时消息系列） ====================
// 范式：photos/core.js 同款经典 IIFE（零依赖零 export，经典脚本先于主内联同步加载）。
// 真源边界：仅收纳纯函数与常量（FACES/PALETTE/TEXT_COLS 三表 / DIRS 方向几何 / AI_LINES 扫描线 /
// SNAKE_MATS 蛇形权重 / 幂指计分 / 合并语义 / 牌堆概率 / 大盘奖励池 / GM AI 平面模拟·估值·期望树·决策 /
// 音频频率数学）；DOM 读写、AudioContext 本体、canvas 签名板与拍立得绘制、随机源留 index.html 内联（host 侧职责）。
// 消费契约：index.html 经 window.__threesCore.* 委托调用；tests/v286 Q 组沙箱提取真身直连（测的即运行真身非孤立副本）。
(function () {
  'use strict';

  // 表情表（tile 正面文案，拍立得同源）
  var FACES = { 1:'• ‿ •', 2:'¬ ‿ ¬', 3:'◕ ‿ ◕', 6:'•̀ ᴗ •́', 12:'^ ◡ ^', 24:'＊ ‿ ＊', 48:'ᵕ ◡ ᵕ', 96:'＊ ◡ ＊', 192:'v 皿 v', 384:'(•̀_ರ)', 768:'(■_■)', 1536:'王•ᴗ•', 3072:'ᵕ.̫ᵕ', 6144:'神(•̀_•́)神' };
  // 底色表（updateTile / nextCard / 拍立得共用，越界回落 '#ffd700' 在 host）
  var PALETTE = { 1: '#5fa8eb', 2: '#eb5757', 3: '#fff', 6: '#fffbe6', 12: '#fff3e0', 24: '#ffe0b2', 48: '#ffebee', 96: '#f3e5f5', 192: '#e8eaf6', 384: '#e0f2f1', 768: '#fff8e1', 1536: '#efebe9', 3072: '#263238', 6144: '#ffd700' };
  // 字色表（与 PALETTE 同键域）
  var TEXT_COLS = { 1:'#fff', 2:'#fff', 3:'#2b2b2b', 6:'#ff9800', 12:'#f57c00', 24:'#e65100', 48:'#e91e63', 96:'#9c27b0', 192:'#3f51b5', 384:'#00796b', 768:'#ffa000', 1536:'#5d4037', 3072:'#eceff1', 6144:'#fff' };

  // 方向扫描几何：g(i,p) = 方向 dir 上第 i 条线第 p 格的 [r,c]；s(i) = 该线队尾落子格
  var DIRS = {
    left:  { g: (i, p) => [i, p],     s: i => ({ r: i, c: 3 }) },
    right: { g: (i, p) => [i, 3 - p], s: i => ({ r: i, c: 0 }) },
    up:    { g: (i, p) => [p, i],     s: i => ({ r: 3, c: i }) },
    down:  { g: (i, p) => [3 - p, i], s: i => ({ r: 0, c: i }) }
  };

  // GM AI 逐方向扫描线（16 格平面索引，sim/getMovingIds 同源）
  var AI_LINES = {
    left:  [[0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15]],
    right: [[3,2,1,0],[7,6,5,4],[11,10,9,8],[15,14,13,12]],
    up:    [[0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15]],
    down:  [[12,8,4,0],[13,9,5,1],[14,10,6,2],[15,11,7,3]]
  };

  // 蛇形估值权重矩阵六姿态（evalFlat snake 势取 max）
  var SNAKE_MATS = [
    [24,21,18,15,8,9,11,13,7,6,4,2,0,1,2,3], [24,8,7,0,21,9,6,1,18,11,4,2,15,13,2,3],
    [15,18,21,24,13,11,9,8,2,4,6,7,3,2,1,0], [0,7,8,24,1,6,9,21,2,4,11,18,3,2,13,15],
    [0,1,2,3,7,6,4,2,8,9,11,13,24,21,18,15], [15,13,2,3,18,11,4,2,21,9,6,1,24,8,7,0]
  ];

  // 幂指计分：v<3 零分 / 其余 3^(log2(v/3)+1)（init/move/tally 结算共用）
  function getScore(v) { return v < 3 ? 0 : Math.pow(3, (Math.log2(v / 3) + 1)); }

  // 合并资格：1+2 / 2+1 / ≥3 同值
  function canCombine(a, b) { return (a === 1 && b === 2) || (a === 2 && b === 1) || (a >= 3 && a === b); }
  // 合并数值：1+2 归 3 / 其余相加
  function getMergedVal(a, b) { return (a === 1 && b === 2) || (a === 2 && b === 1) ? 3 : a + b; }

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

  // 期望树（expectimax 参数化上移：probs 注入，deck 搜索期不变先例同律；isPlayer 假分支隐式 undefined 语义忠实保留）
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

  window.__threesCore = {
    FACES: FACES,
    PALETTE: PALETTE,
    TEXT_COLS: TEXT_COLS,
    DIRS: DIRS,
    AI_LINES: AI_LINES,
    SNAKE_MATS: SNAKE_MATS,
    getScore: getScore,
    canCombine: canCombine,
    getMergedVal: getMergedVal,
    deckProbs: deckProbs,
    bonusPool: bonusPool,
    mergeFreq: mergeFreq,
    chimeFreq: chimeFreq,
    simFlat: simFlat,
    evalFlat: evalFlat,
    expectimaxFlat: expectimaxFlat,
    chanceFlat: chanceFlat,
    bestDirFlat: bestDirFlat,
  };
})();
