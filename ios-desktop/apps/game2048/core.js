// ==================== game2048 core — #286 续车道 ref-only 第七批补 core 提取（v10.96 · Job 2933040 · 第 2 定时消息系列） ====================
// 范式：photos/core.js 同款经典 IIFE（零依赖零 export，经典脚本先于主内联同步加载）。
// 真源边界：仅收纳纯函数与常量（VALS 概率表 / 出牌特判概率映射 / 卡 id 与万能牌构造 / 合并数学 /
// 炸弹清除计数 / 渲染布局数学 / 出牌资格与 AI 手牌域 / 2-Ply AI 推演引擎全纯核 / 拖拽倾斜钳制 /
// 工具禁用判定 / 容量裁剪 / 落档记录构造 / 提示高亮正则）；DOM 读写、LS 持久化、随机源、
// VFS/notify 桥、THEMES 主题表留 index.html 内联（host 侧职责）。
// 消费契约：index.html 经 window.__game2048Core.* 委托调用；tests/v286 P 组沙箱提取真身直连（测的即运行真身非孤立副本）。
(function () {
  'use strict';

  // 手牌数值概率表：2/4 各三份、8 两份、16/32/64 各一份（11 档抽签池，genCard 数值域）
  var VALS = [2, 2, 2, 4, 4, 4, 8, 8, 16, 32, 64];

  // 出牌特判概率映射（genCard 阈值序）：r<0.04 炸弹 / r<0.08 翻倍 / 其余 null（走 VALS 数值抽签）
  function specialKind(r) {
    if (r < 0.04) return 'bomb';
    if (r < 0.08) return 'double';
    return null;
  }

  // VALS 抽签（host 侧生成随机索引，索引→数值纯查表）
  function pickVal(i) { return VALS[i]; }

  // 卡 id 构造：'c-' + 随机数 36 进制第 3 位起 7 字符（host 传随机源保持纯）
  function cardId(r) { return 'c-' + r.toString(36).slice(2, 9); }

  // 万能牌构造（wildcard 工具 / AI 破局共用形状）
  function wildcardCard(id) { return { id: id, val: '★', isWildcard: true }; }

  // 合并数值（checkAndMerge 语义）：双万能 64 / 单万能对侧翻倍 / 同值翻倍
  function mergeVal(t, n) {
    return (t.isWildcard && n.isWildcard) ? 64 : (t.isWildcard ? n.val * 2 : (n.isWildcard ? t.val * 2 : t.val * 2));
  }

  // 合并得分：连击数线性放大
  function mergePts(val, combo) { return val * combo; }

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

  // AI 可用手牌索引域（2-Ply 前瞻第一层遍历域）
  function aiPlayable(mode) { return mode === 'normal' ? [0, 1, 2] : [0]; }

  // 2-Ply 决策 null 阈值：最高期望 ≤ 阈值即放弃出牌转工具救场
  var AI_NULL_EV = -8000;

  // 高性能虚拟出牌与递归模拟（fastSimulate 原样上移：纯数据进出，零 DOM 零随机）
  function fastSimulate(board, card, cIdx) {
    const cols = [board[0].slice(), board[1].slice(), board[2].slice(), board[3].slice(), board[4].slice()];
    let gain = 0, combos = 0;
    const col = cols[cIdx];

    if (card.isBomb) {
      if (col.length) col.pop();
      if (col.length) col.pop();
      return { cols, gain: 300, combos: 1 };
    }

    if (card.isDouble) {
      if (col.length && typeof col[col.length - 1].val === 'number') {
        const top = { ...col[col.length - 1] }; top.val *= 2;
        gain += top.val; col[col.length - 1] = top;
      }
    } else {
      col.push(card);
    }

    while (col.length >= 2) {
      const t = col[col.length - 1], n = col[col.length - 2];
      if (t.val === n.val || t.isWildcard || n.isWildcard) {
        combos++;
        const tv = typeof t.val === 'number' ? t.val : (typeof n.val === 'number' ? n.val : 64);
        const v = tv * 2;
        gain += v * combos;
        col.pop(); col.pop();
        col.push({ val: v, isWildcard: false });
      } else break;
    }
    return { cols, gain, combos };
  }

  // 启发式棋盘估值（evaluateBoard 原样上移）：收益 2.8x + 连击 950/次 + 满列重罚梯度 +
  // 相邻序列势（升序 +65 / 倍序 +280 / 逆序 -400·min(r,6) / 大牌压底 -1400）+ 空列奖励 380
  function evaluateBoard(cols, gain, combos) {
    let ev = gain * 2.8 + combos * 950;
    let emptyCount = 0;

    for (let c = 0; c < 5; c++) {
      const col = cols[c], len = col.length;
      if (len === 0) { emptyCount++; continue; }

      if (len >= 8) ev -= 90000;
      else if (len === 7) ev -= 3800;
      else if (len === 6) ev -= 900;
      else if (len <= 4) ev += 120;

      for (let i = 0; i < len - 1; i++) {
        const up = col[i].val, down = col[i + 1].val;
        if (typeof up === 'number' && typeof down === 'number') {
          if (up >= down) {
            ev += 65;
            if (up === down * 2) ev += 280;
          } else {
            const r = down / up;
            ev -= 400 * Math.min(r, 6);
            if (down >= 64) ev -= 1400;
          }
        }
      }
    }

    ev += emptyCount * 380;
    return ev;
  }

  // 2-Ply 前瞻决策（findBest2PlyMove 参数化上移：board/hand/mode 注入，零随机零 DOM）
  function best2Ply(board, hand, gameMode) {
    const playable = aiPlayable(gameMode);
    let best = null, maxEv = -Infinity;

    for (const h1 of playable) {
      const card1 = hand[h1]; if (!card1) continue;
      for (let c1 = 0; c1 < 5; c1++) {
        if (board[c1].length >= 8) continue;
        const sim1 = fastSimulate(board, card1, c1);
        let step2Best = -Infinity;

        if (gameMode === 'normal') {
          const remHand = hand.filter((_, idx) => idx !== h1);
          for (let h2 = 0; h2 < remHand.length; h2++) {
            for (let c2 = 0; c2 < 5; c2++) {
              if (sim1.cols[c2].length >= 8) continue;
              const sim2 = fastSimulate(sim1.cols, remHand[h2], c2);
              const ev = evaluateBoard(sim2.cols, sim1.gain + sim2.gain, sim1.combos + sim2.combos);
              if (ev > step2Best) step2Best = ev;
            }
          }
        } else {
          step2Best = evaluateBoard(sim1.cols, sim1.gain, sim1.combos);
        }

        if (step2Best > maxEv) {
          maxEv = step2Best;
          best = { h: h1, c: c1 };
        }
      }
    }

    return (maxEv <= AI_NULL_EV) ? null : best;
  }

  // AI 救场定位：最长列（参数化上移，≥5 判危）
  function worstBlockedCol(cols) {
    let maxCol = -1, maxLen = -1;
    for (let i = 0; i < 5; i++) {
      if (cols[i].length > maxLen) { maxLen = cols[i].length; maxCol = i; }
    }
    return maxLen >= 5 ? maxCol : -1;
  }

  // 拖拽倾斜钳制（±12°，dx 0.1 线性）
  function dragTilt(dx) { return Math.max(-12, Math.min(12, dx * 0.1)); }

  // 工具按钮禁用判定：undo 还需历史栈非空，其余按余量
  function toolDisabled(kind, tools, historyLen) {
    return kind === 'undo' ? (tools.undo <= 0 || !historyLen) : tools[kind] <= 0;
  }

  // 容量裁剪（就地保尾）：对局快照栈 10 / VFS 落档历史 20 共用（shift 逐步与 splice(0,len-cap) 终态等值）
  function capInPlace(arr, cap) { while (arr.length > cap) arr.shift(); return arr; }

  // 落档记录构造（ts 注入保持纯；has2048 归一布尔）
  function historyRecord(kind, mode, score, best, combo, has2048, ts) {
    return { kind: kind, mode: mode, score: score, best: best, combo: combo, has2048: !!has2048, ts: ts };
  }

  // 提示条高亮语义（setTip highlight 档正则真源）
  var TIP_HIGHLIGHT_RE = /AI|翻倍|连击|炸弹|万能|救场|消除/;
  function isTipHighlight(msg) { return TIP_HIGHLIGHT_RE.test(msg); }

  window.__game2048Core = {
    VALS: VALS,
    specialKind: specialKind,
    pickVal: pickVal,
    cardId: cardId,
    wildcardCard: wildcardCard,
    mergeVal: mergeVal,
    mergePts: mergePts,
    bombPopCount: bombPopCount,
    layoutMetrics: layoutMetrics,
    canPlay: canPlay,
    aiPlayable: aiPlayable,
    AI_NULL_EV: AI_NULL_EV,
    fastSimulate: fastSimulate,
    evaluateBoard: evaluateBoard,
    best2Ply: best2Ply,
    worstBlockedCol: worstBlockedCol,
    dragTilt: dragTilt,
    toolDisabled: toolDisabled,
    capInPlace: capInPlace,
    historyRecord: historyRecord,
    TIP_HIGHLIGHT_RE: TIP_HIGHLIGHT_RE,
    isTipHighlight: isTipHighlight,
  };
})();
