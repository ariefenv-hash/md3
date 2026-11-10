// ==================== game2048 core — #286 续车道 ref-only 第七批补 core 提取（v11.06 深提增值合流）+ 深提增值合流段（R145 窗 · Job 2933040 · 第 2 定时消息系列） ====================
// 合流口径：第七批十出口（概率核/AI 模拟器/估值/救场/历史）为 035bf11f 在先契约原样保留（P 组锚持真）；
// 增值段 11 出口（卡 id/万能牌/合并数值/炸弹清除/布局数学/出牌资格/拖拽倾斜/工具禁用/提示高亮）
// 为本侧深提净增（对侧未触及面），tests/v286 S 组持真；P1 键集扩展 10→21 增值合流重锚。
// 范式：photos/core.js 同款经典 IIFE（零依赖零 export，经典脚本先于主内联同步加载）。
// 真源边界：仅收纳纯函数与常量（卡值分布表与概率核 / 连击得分公式 / AI 2-Ply 虚拟出牌模拟器 /
// 启发式棋盘估值 / AI 救场最长列判定 / #181 对局历史记录构造与容量截断）；DOM 读写、localStorage、
// SDK 双通道（notify/fs）、AI 调度与手牌序列状态留 index.html 内联（host 侧职责）。
// 消费契约：index.html 经 window.__game2048Core.* 委托调用；tests/v286 P 组沙箱提取真身直连（测的即运行真身非孤立副本）。
(function () {
  'use strict';

  // 卡值分布表（genCard 普通牌抽取域：低值高权重）
  var VALS = [2, 2, 2, 4, 4, 4, 8, 8, 16, 32, 64];

  // genCard 概率阈值：rKind < 0.04 炸弹；rKind < 0.08 翻倍；其余按 rVal 抽 VALS
  var ROLL_BOMB = 0.04;
  var ROLL_DOUBLE = 0.08;

  // 卡牌概率核（genCard 纯化）：rKind/rVal 为两次独立随机数（与原实现 bomb/double 判定用
  // 第一个随机值、VALS 抽取用第二个随机值的分布语义逐点等价）
  function rollCardKind(rKind, rVal) {
    if (rKind < ROLL_BOMB) return { val: '💣', isBomb: true };
    if (rKind < ROLL_DOUBLE) return { val: '⚡', isDouble: true };
    return { val: VALS[Math.floor(rVal * VALS.length)] };
  }

  // 连击得分公式（checkAndMerge pts = 合并值 × 连击数）
  function mergePoints(val, comboCount) {
    return val * comboCount;
  }

  // AI 虚拟出牌模拟器（findBest2PlyMove 核，纯函数——slice 五列不改原盘；炸弹 300 分
  // 单 combo / 翻倍计分 / 同值或万能牌触发级联合并，tv 判定：双方均非数值回落 64）
  function fastSimulate(board, card, cIdx) {
    var cols = [board[0].slice(), board[1].slice(), board[2].slice(), board[3].slice(), board[4].slice()];
    var gain = 0, combos = 0;
    var col = cols[cIdx];

    if (card.isBomb) {
      if (col.length) col.pop();
      if (col.length) col.pop();
      return { cols: cols, gain: 300, combos: 1 };
    }

    if (card.isDouble) {
      if (col.length && typeof col[col.length - 1].val === 'number') {
        var top = Object.assign({}, col[col.length - 1]); top.val *= 2;
        gain += top.val; col[col.length - 1] = top;
      }
    } else {
      col.push(card);
    }

    while (col.length >= 2) {
      var t = col[col.length - 1], n = col[col.length - 2];
      if (t.val === n.val || t.isWildcard || n.isWildcard) {
        combos++;
        var tv = typeof t.val === 'number' ? t.val : (typeof n.val === 'number' ? n.val : 64);
        var v = tv * 2;
        gain += v * combos;
        col.pop(); col.pop();
        col.push({ val: v, isWildcard: false });
      } else break;
    }
    return { cols: cols, gain: gain, combos: combos };
  }

  // 启发式棋盘估值（Domino Cascade Heuristic，纯函数）：收益 2.8 倍 + 连击 950 /
  // 列高惩罚梯度（8 满列 -90000 / 7 -3800 / 6 -900 / ≤4 +120）/ 相邻对单调序 +65、
  // 倍距 +280、逆序 -400×min(r,6)、深牌 ≥64 追罚 -1400 / 空列 +380
  function evaluateBoard(cols, gain, combos) {
    var ev = gain * 2.8 + combos * 950;
    var emptyCount = 0;

    for (var c = 0; c < 5; c++) {
      var col = cols[c], len = col.length;
      if (len === 0) { emptyCount++; continue; }

      if (len >= 8) ev -= 90000;
      else if (len === 7) ev -= 3800;
      else if (len === 6) ev -= 900;
      else if (len <= 4) ev += 120;

      for (var i = 0; i < len - 1; i++) {
        var up = col[i].val, down = col[i + 1].val;
        if (typeof up === 'number' && typeof down === 'number') {
          if (up >= down) {
            ev += 65;
            if (up === down * 2) ev += 280;
          } else {
            var r = down / up;
            ev -= 400 * Math.min(r, 6);
            if (down >= 64) ev -= 1400;
          }
        }
      }
    }

    ev += emptyCount * 380;
    return ev;
  }

  // AI 救场判定（findWorstBlockedCol 参数化）：最长列且长度 ≥ minLen 时返回其下标，否则 -1
  function worstBlockedCol(board, minLen) {
    var maxCol = -1, maxLen = -1;
    for (var i = 0; i < 5; i++) {
      if (board[i].length > maxLen) { maxLen = board[i].length; maxCol = i; }
    }
    return maxLen >= minLen ? maxCol : -1;
  }

  // #181 准入④对局历史记录构造（kind/mode/score/best/combo/has2048/ts 七字段，!! 归一）
  function buildHistoryRecord(kind, mode, score, best, maxCombo, has2048, ts) {
    return { kind: kind, mode: mode, score: score, best: best, combo: maxCombo, has2048: !!has2048, ts: ts };
  }

  // 历史容量截断（G2048_HISTORY_CAP=20 语义：保尾 cap 条，超限删头——splice 原地语义的纯函数化）
  function capHistory(records, cap) {
    return records.length > cap ? records.slice(records.length - cap) : records;
  }


  // ==================== 深提增值段（R145 窗 Job 2933040 第 2 系列 · 11 出口，S 组锚持真） ====================

  // 卡 id 构造：'c-' + 随机数 36 进制第 3 位起 7 字符（host 传随机源保持纯）
  function cardId(r) { return 'c-' + r.toString(36).slice(2, 9); }

  // 万能牌构造（wildcard 工具 / AI 破局共用形状）
  function wildcardCard(id) { return { id: id, val: '★', isWildcard: true }; }

  // 合并数值（checkAndMerge 语义，与 mergePoints 分工：本函数定 val，pts 由 mergePoints 定）
  function mergeVal(t, n) {
    return (t.isWildcard && n.isWildcard) ? 64 : (t.isWildcard ? n.val * 2 : (n.isWildcard ? t.val * 2 : t.val * 2));
  }

  // 炸弹清除计数：列尾弹 2 张（现存不足按现存数弹）
  function bombPopCount(len) { if (len >= 2) return 2; if (len === 1) return 1; return 0; }

  // 渲染布局数学（renderAll）：卡宽钳 [32, min(colW-8, 60)] / 卡高 1.32 比例取整 /
  // 叠距 = min(cardH*0.46, max(12, (colH-cardH-8-10)/(n-1)))，n≤1 时 0（padT 常量 8 内联在案）
  function layoutMetrics(colW, colH, n) {
    var cardW = Math.max(32, Math.min(colW - 8, 60));
    var cardH = Math.round(cardW * 1.32);
    var padT = 8;
    var step = n > 1 ? Math.min(cardH * 0.46, Math.max(12, (colH - cardH - padT - 10) / (n - 1))) : 0;
    return { cardW: cardW, cardH: cardH, step: step };
  }

  // 出牌资格：普通模式全部可出 / 困难模式仅首张（placeCard 守卫与 renderAll 手牌锁定同源）
  function canPlay(mode, idx) { return mode === 'normal' || (mode === 'hard' && idx === 0); }

  // AI 可用手牌索引域（findBest2PlyMove 第一层遍历域）
  function aiPlayable(mode) { return mode === 'normal' ? [0, 1, 2] : [0]; }

  // 拖拽倾斜钳制（±12°，dx 0.1 线性）
  function dragTilt(dx) { return Math.max(-12, Math.min(12, dx * 0.1)); }

  // 工具按钮禁用判定：undo 还需历史栈非空，其余按余量
  function toolDisabled(kind, tools, historyLen) {
    return kind === 'undo' ? (tools.undo <= 0 || !historyLen) : tools[kind] <= 0;
  }

  // 提示条高亮语义（setTip highlight 档正则真源）
  var TIP_HIGHLIGHT_RE = /AI|翻倍|连击|炸弹|万能|救场|消除/;
  function isTipHighlight(msg) { return TIP_HIGHLIGHT_RE.test(msg); }

  window.__game2048Core = {
    VALS: VALS,
    ROLL_BOMB: ROLL_BOMB,
    ROLL_DOUBLE: ROLL_DOUBLE,
    rollCardKind: rollCardKind,
    mergePoints: mergePoints,
    fastSimulate: fastSimulate,
    evaluateBoard: evaluateBoard,
    worstBlockedCol: worstBlockedCol,
    buildHistoryRecord: buildHistoryRecord,
    capHistory: capHistory,
    cardId: cardId,
    wildcardCard: wildcardCard,
    mergeVal: mergeVal,
    bombPopCount: bombPopCount,
    layoutMetrics: layoutMetrics,
    canPlay: canPlay,
    aiPlayable: aiPlayable,
    dragTilt: dragTilt,
    toolDisabled: toolDisabled,
    TIP_HIGHLIGHT_RE: TIP_HIGHLIGHT_RE,
    isTipHighlight: isTipHighlight,
  };
})();
