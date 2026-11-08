// ==================== chess-core.js — 国际象棋纯逻辑核（v9.94 #132） ====================
// #132（daedalOS Chess 借鉴，一期+二期+三期简版单窗合并交付）：
//   · 完整规则：合法走法（马跳/滑子射线/兵单双步斜吃过路兵升变）/ 王车易位（双侧权利+穿越格攻击禁+被将禁）
//     / 吃过路兵 / 兵升变四选择 / 将军·将死·逼和 / 三次重复 / 五十步 / 子力不足
//   · AI 对手：minimax + α-β 剪枝，三档难度 = 搜索深度 1/2/3，MVV-LVA 吃子优先排序，同局面确定性
//   · 棋谱：SAN 简版（棋子字母/吃子 x/消歧 file|rank/升变 =Q/易位 O-O·O-O-O/将 +/杀 #）
// 本文件 = 纯函数核（chatbot-core 十三代同款 IIFE，顶层零 DOM/网络副作用）；页面侧只做接线。
// 棋盘表示：64 一维数组，idx = rank*8 + file；rank 0 = 第 8 横线（黑方底线，白方视角棋盘顶）。
// 棋子编码：{c:'w'|'b', t:'p'|'n'|'b'|'r'|'q'|'k'}；空格 null。
// 正确性金标：perft 走法计数（perft(1)=20 / perft(2)=400 / perft(3)=8902 / perft(4)=197281）。
(function () {
  'use strict';

  // ---------- 常量 ----------
  var PIECE_VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  // 简版 piece-square：中心偏好（pawn/knight 用切比雪夫距离惩罚，其余走子力即可）
  function centerBias(t, idx) {
    if (t !== 'p' && t !== 'n' && t !== 'b') return 0;
    var f = idx % 8, r = Math.floor(idx / 8);
    var d = Math.max(Math.abs(f - 3.5), Math.abs(r - 3.5)); // 0.5~3.5
    return Math.round((3.5 - d) * (t === 'p' ? 4 : 6));
  }
  var KNIGHT_D = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  var KING_D = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  var BISHOP_D = [[-1,-1],[-1,1],[1,-1],[1,1]];
  var ROOK_D = [[-1,0],[1,0],[0,-1],[0,1]];

  // ---------- 基础 ----------
  function idx(f, r) { return r * 8 + f; }
  function onBoard(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8; }
  /** idx → 代数坐标（'e4'）。rank 0 = 第 8 横线。 */
  function squareName(i) {
    return 'abcdefgh'[i % 8] + (8 - Math.floor(i / 8));
  }
  /** 代数坐标 → idx；非法返回 -1 */
  function parseSquare(s) {
    if (typeof s !== 'string' || !/^[a-h][1-8]$/.test(s)) return -1;
    var f = 'abcdefgh'.indexOf(s[0]);
    var r = 8 - parseInt(s[1], 10);
    return idx(f, r);
  }

  // ---------- 无障碍（#241 键盘可达 · 纯函数，页面接线消费） ----------
  var PIECE_ZH = {
    w: { k: '白王', q: '白后', r: '白车', b: '白象', n: '白马', p: '白兵' },
    b: { k: '黑王', q: '黑后', r: '黑车', b: '黑象', n: '黑马', p: '黑兵' },
  };
  /** 格子读屏标签：代数坐标 + 棋子中文名，空格如实「空」 */
  function cellA11yLabel(i, piece) {
    var zh = (piece && PIECE_ZH[piece.c] && PIECE_ZH[piece.c][piece.t]) || '空';
    return squareName(i) + ' ' + zh;
  }
  /** 方向键焦点步进：行/列双维钳制（不回绕、不跨行边界，h8 右进停在本行）；
   *  非方向键原位返回 */
  function focusStep(i, key) {
    var df = { ArrowLeft: -1, ArrowRight: 1 }[key];
    var dr = { ArrowUp: -1, ArrowDown: 1 }[key];
    if (!df && !dr) return i;
    var f = (i % 8) + (df || 0);
    var r = Math.floor(i / 8) + (dr || 0);
    if (f < 0) f = 0;
    if (f > 7) f = 7;
    if (r < 0) r = 0;
    if (r > 7) r = 7;
    return r * 8 + f;
  }

  // ---------- 局面 ----------
  function initialBoard() {
    var b = new Array(64).fill(null);
    var back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (var f = 0; f < 8; f++) {
      b[idx(f, 0)] = { c: 'b', t: back[f] };   // 第 8 横线（黑）
      b[idx(f, 1)] = { c: 'b', t: 'p' };       // 第 7 横线
      b[idx(f, 6)] = { c: 'w', t: 'p' };       // 第 2 横线
      b[idx(f, 7)] = { c: 'w', t: back[f] };   // 第 1 横线（白）
    }
    return b;
  }
  function createGame() {
    var g = {
      board: initialBoard(),
      turn: 'w',
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      epTarget: null,          // 可被吃过路兵的目标格 idx
      halfmove: 0,
      fullmove: 1,
      sanHistory: [],
      snapHistory: [],         // 悔棋快照栈（整局面深拷贝）
      positions: {},           // 三次重复计数（局面指纹 → 次数）
    };
    g.positions[fingerprint(g)] = 1;
    return g;
  }
  /**
   * 局面指纹（board+turn+castle 权+ep 目标）——三次重复判定
   * v10.72 #237：ep 目标仅在「存在合法过路兵吃法」时计入 —— FIDE 局面同一性以
   * 「可能存在的着法」为准；旧实现把任何兵双步后的 ep 格都写进指纹，导致本可判
   * 三次重复的局面少报（方向安全但定义不符）。无合法 ep 吃法时该格不构成着法差异。
   */
  function fingerprint(g) {
    var s = '';
    for (var i = 0; i < 64; i++) {
      var p = g.board[i];
      s += p ? (p.c === 'w' ? p.t.toUpperCase() : p.t) : '.';
    }
    s += '|' + g.turn;
    s += '|' + (g.castling.wK ? 'K' : '') + (g.castling.wQ ? 'Q' : '') + (g.castling.bK ? 'k' : '') + (g.castling.bQ ? 'q' : '');
    s += '|' + (epCaptureAvailable(g) ? g.epTarget : '-');
    return s;
  }

  /**
   * 是否存在「合法的」过路兵吃法（v10.72 #237）。
   * 只扫伪合法 ep 走法再逐个做王安全过滤 —— ep 目标最多存在一着，开销可忽略。
   */
  function epCaptureAvailable(g) {
    if (g.epTarget === null || g.epTarget === undefined) return false;
    var cands = pseudoMoves(g, g.turn).filter(function (m) { return m.ep && m.to === g.epTarget; });
    for (var i = 0; i < cands.length; i++) {
      if (!inCheck(simulate(g, cands[i]), g.turn)) return true;
    }
    return false;
  }
  function cloneGame(g) {
    return {
      board: g.board.map(function (p) { return p ? { c: p.c, t: p.t } : null; }),
      turn: g.turn,
      castling: { wK: g.castling.wK, wQ: g.castling.wQ, bK: g.castling.bK, bQ: g.castling.bQ },
      epTarget: g.epTarget,
      halfmove: g.halfmove,
      fullmove: g.fullmove,
      sanHistory: g.sanHistory.slice(),
      snapHistory: g.snapHistory.slice(), // 快照栈浅引用转移（悔棋语义）
      positions: Object.assign({}, g.positions),
    };
  }

  // ---------- 攻击判定 ----------
  function isSquareAttacked(board, target, by) {
    // 兵攻击：by 兵位于 target 斜下（by='w' 攻击方向向上 = rank 减）
    var f = target % 8, r = Math.floor(target / 8);
    var pr = by === 'w' ? r + 1 : r - 1;
    if (onBoard(f - 1, pr) && is(board, idx(f - 1, pr), by, 'p')) return true;
    if (onBoard(f + 1, pr) && is(board, idx(f + 1, pr), by, 'p')) return true;
    // 马
    for (var i = 0; i < 8; i++) {
      var nf = f + KNIGHT_D[i][0], nr = r + KNIGHT_D[i][1];
      if (onBoard(nf, nr) && is(board, idx(nf, nr), by, 'n')) return true;
    }
    // 王
    for (i = 0; i < 8; i++) {
      nf = f + KING_D[i][0]; nr = r + KING_D[i][1];
      if (onBoard(nf, nr) && is(board, idx(nf, nr), by, 'k')) return true;
    }
    // 滑子射线
    var rays = [[BISHOP_D, 'b'], [ROOK_D, 'r']];
    for (i = 0; i < 2; i++) {
      var dirs = rays[i][0], pt = rays[i][1];
      for (var d = 0; d < dirs.length; d++) {
        var cf = f + dirs[d][0], cr = r + dirs[d][1];
        while (onBoard(cf, cr)) {
          var p = board[idx(cf, cr)];
          if (p) {
            if (p.c === by && (p.t === pt || p.t === 'q')) return true;
            break;
          }
          cf += dirs[d][0]; cr += dirs[d][1];
        }
      }
    }
    return false;
  }
  function is(board, i, c, t) {
    var p = board[i];
    return !!p && p.c === c && p.t === t;
  }
  function findKing(board, c) {
    for (var i = 0; i < 64; i++) if (is(board, i, c, 'k')) return i;
    return -1;
  }
  function inCheck(g, c) {
    var k = findKing(g.board, c);
    return k >= 0 && isSquareAttacked(g.board, k, c === 'w' ? 'b' : 'w');
  }

  // ---------- 伪合法走法生成 ----------
  /** 返回 [{from,to,promo?,ep?,castle?}]（不含王安全过滤） */
  function pseudoMoves(g, color) {
    var board = g.board, out = [];
    for (var from = 0; from < 64; from++) {
      var p = board[from];
      if (!p || p.c !== color) continue;
      var f = from % 8, r = Math.floor(from / 8);
      if (p.t === 'p') {
        var dir = color === 'w' ? -1 : 1;       // 白向上（rank 减）
        var startR = color === 'w' ? 6 : 1;
        var lastR = color === 'w' ? 0 : 7;
        // 单步
        if (onBoard(f, r + dir) && !board[idx(f, r + dir)]) {
          pushPawn(out, from, idx(f, r + dir), r + dir === lastR);
          // 双步
          if (r === startR && !board[idx(f, r + 2 * dir)]) out.push({ from: from, to: idx(f, r + 2 * dir) });
        }
        // 斜吃（含过路兵）
        for (var df = -1; df <= 1; df += 2) {
          if (!onBoard(f + df, r + dir)) continue;
          var to = idx(f + df, r + dir);
          var tp = board[to];
          if (tp && tp.c !== color) pushPawn(out, from, to, r + dir === lastR);
          else if (!tp && g.epTarget === to) out.push({ from: from, to: to, ep: true });
        }
      } else if (p.t === 'n' || p.t === 'k') {
        var D = p.t === 'n' ? KNIGHT_D : KING_D;
        for (var i = 0; i < D.length; i++) {
          var nf = f + D[i][0], nr = r + D[i][1];
          if (!onBoard(nf, nr)) continue;
          var t2 = board[idx(nf, nr)];
          if (!t2 || t2.c !== color) out.push({ from: from, to: idx(nf, nr) });
        }
      } else {
        var dirs = p.t === 'b' ? BISHOP_D : p.t === 'r' ? ROOK_D : BISHOP_D.concat(ROOK_D);
        for (i = 0; i < dirs.length; i++) {
          var cf = f + dirs[i][0], cr = r + dirs[i][1];
          while (onBoard(cf, cr)) {
            var tq = board[idx(cf, cr)];
            if (!tq) out.push({ from: from, to: idx(cf, cr) });
            else { if (tq.c !== color) out.push({ from: from, to: idx(cf, cr) }); break; }
            cf += dirs[i][0]; cr += dirs[i][1];
          }
        }
      }
    }
    // 王车易位（权利在 + 中间空 + 王不在将军 + 穿越格与落格不被攻击）
    var enemy = color === 'w' ? 'b' : 'w';
    var kIdx = findKing(board, color);
    if (kIdx >= 0 && !isSquareAttacked(board, kIdx, enemy)) {
      var kr = color === 'w' ? 7 : 0;
      if (kIdx === idx(4, kr) && is(board, kIdx, color, 'k')) {
        // K 侧：f/g 空且不被攻击，h 车在位
        if ((color === 'w' ? g.castling.wK : g.castling.bK) &&
            !board[idx(5, kr)] && !board[idx(6, kr)] &&
            is(board, idx(7, kr), color, 'r') &&
            !isSquareAttacked(board, idx(5, kr), enemy) && !isSquareAttacked(board, idx(6, kr), enemy)) {
          out.push({ from: kIdx, to: idx(6, kr), castle: 'K' });
        }
        // Q 侧：b/c/d 空且 c/d 不被攻击，a 车在位
        if ((color === 'w' ? g.castling.wQ : g.castling.bQ) &&
            !board[idx(1, kr)] && !board[idx(2, kr)] && !board[idx(3, kr)] &&
            is(board, idx(0, kr), color, 'r') &&
            !isSquareAttacked(board, idx(3, kr), enemy) && !isSquareAttacked(board, idx(2, kr), enemy)) {
          out.push({ from: kIdx, to: idx(2, kr), castle: 'Q' });
        }
      }
    }
    return out;
  }
  function pushPawn(out, from, to, promo) {
    if (promo) ['q', 'r', 'b', 'n'].forEach(function (t) { out.push({ from: from, to: to, promo: t }); });
    else out.push({ from: from, to: to });
  }

  // ---------- 合法走法（王安全过滤） ----------
  function legalMoves(g, from) {
    var color = g.turn;
    var all = pseudoMoves(g, color);
    return all.filter(function (m) {
      if (from !== undefined && m.from !== from) return false;
      var sim = simulate(g, m);
      return !inCheck(sim, color);
    });
  }
  /** 应用走法到克隆局面（不写历史/SAN） */
  function simulate(g, m) {
    var s = cloneGame(g);
    applyMove(s, m, null);
    return s;
  }

  // ---------- 走子应用（写真局面） ----------
  /** promo：升变子类型（'q'|'r'|'b'|'n'，默认 'q'） */
  function applyMove(g, m, promo) {
    var board = g.board;
    var p = board[m.from];
    var color = p.c, enemy = color === 'w' ? 'b' : 'w';
    var isPawn = p.t === 'p', isCapture = !!board[m.to] || !!m.ep;
    // 快照（悔棋）由调用方在 makeMove 里压栈
    // 移动
    board[m.to] = p;
    board[m.from] = null;
    // 过路兵吃兵
    if (m.ep) {
      var capIdx = m.to + (color === 'w' ? 8 : -8);
      board[capIdx] = null;
    }
    // 易位：车随王移
    if (m.castle) {
      var kr = color === 'w' ? 7 : 0;
      if (m.castle === 'K') { board[idx(5, kr)] = board[idx(7, kr)]; board[idx(7, kr)] = null; }
      else { board[idx(3, kr)] = board[idx(0, kr)]; board[idx(0, kr)] = null; }
    }
    // 升变
    if (m.promo || (isPawn && (Math.floor(m.to / 8) === 0 || Math.floor(m.to / 8) === 7))) {
      board[m.to] = { c: color, t: m.promo || promo || 'q' };
    }
    // 易位权利维护（王动/车动/车被吃）
    if (p.t === 'k') { if (color === 'w') { g.castling.wK = false; g.castling.wQ = false; } else { g.castling.bK = false; g.castling.bQ = false; } }
    if (m.from === idx(0, 7) || m.to === idx(0, 7)) g.castling.wQ = false;
    if (m.from === idx(7, 7) || m.to === idx(7, 7)) g.castling.wK = false;
    if (m.from === idx(0, 0) || m.to === idx(0, 0)) g.castling.bQ = false;
    if (m.from === idx(7, 0) || m.to === idx(7, 0)) g.castling.bK = false;
    // ep 目标（兵双步）
    g.epTarget = (isPawn && Math.abs(m.to - m.from) === 16) ? (m.from + m.to) / 2 : null;
    // 半步/全步
    g.halfmove = (isPawn || isCapture) ? 0 : g.halfmove + 1;
    if (color === 'b') g.fullmove++;
    g.turn = enemy;
    return g;
  }

  // ---------- SAN ----------
  function sanOf(g, m, promo) {
    var board = g.board, p = board[m.from];
    var captured = !!board[m.to] || !!m.ep;
    var s;
    if (m.castle) {
      s = m.castle === 'K' ? 'O-O' : 'O-O-O';
    } else if (p.t === 'p') {
      s = (captured ? 'abcdefgh'[m.from % 8] + 'x' : '') + squareName(m.to);
      // 升变后缀只在兵到达末行时添加（v9.94 e2e 实测坑：调用方传入的 promo 参数
      // 不得泄漏到非升变走法 —— AI 侧 makeMove(..., promotion || 'q') 会对普通走法带上 'q'）
      var lastRow = Math.floor(m.to / 8) === 0 || Math.floor(m.to / 8) === 7;
      if (lastRow) s += '=' + (m.promo || promo || 'q').toUpperCase();
    } else {
      // 消歧：同型同色子也能合法到达同一目标
      var sameTargets = legalMoves(g).filter(function (x) {
        return x.to === m.to && x.from !== m.from && board[x.from] && board[x.from].t === p.t && board[x.from].c === p.c;
      });
      var dis = '';
      if (sameTargets.length) {
        var sameFile = sameTargets.some(function (x) { return x.from % 8 === m.from % 8; });
        var sameRank = sameTargets.some(function (x) { return Math.floor(x.from / 8) === Math.floor(m.from / 8); });
        if (!sameFile) dis = 'abcdefgh'[m.from % 8];
        else if (!sameRank) dis = String(8 - Math.floor(m.from / 8));
        else dis = squareName(m.from);
      }
      s = p.t.toUpperCase() + dis + (captured ? 'x' : '') + squareName(m.to);
    }
    // 将/杀后缀：走后对手视角
    var after = simulate(g, Object.assign({}, m));
    var opp = g.turn === 'w' ? 'b' : 'w';
    if (inCheck(after, opp)) {
      var anyLegal = legalMoves(after).length > 0;
      s += anyLegal ? '+' : '#';
    }
    return s;
  }

  // ---------- 状态 ----------
  function gameStatus(g) {
    var legal = legalMoves(g);
    var check = inCheck(g, g.turn);
    if (!legal.length) return check ? 'checkmate' : 'stalemate';
    if (g.halfmove >= 100) return 'fifty-move';
    var fp = fingerprint(g);
    if ((g.positions[fp] || 0) >= 3) return 'threefold';
    if (insufficientMaterial(g)) return 'insufficient';
    return check ? 'check' : 'playing';
  }
  /**
   * 子力不足（死局）判定。
   * v10.72 #237：K+B vs K+B 必须比较**象所在格颜色** —— 异色格象存在辅助将杀
   * （FIDE 非死局，不得自动判和）；同色格象才是死局。旧实现只判「两侧各一象」
   * 即返回 true，把大量可下局面误判和棋（KBvKB 异色格实测假阳性）。
   */
  function insufficientMaterial(g) {
    var pieces = [];
    for (var i = 0; i < 64; i++) {
      var p = g.board[i];
      if (p && p.t !== 'k') {
        // 格子颜色：file+rank 奇偶（a1=0 深色，与棋盘渲染同一坐标律）
        pieces.push({ t: p.t, c: p.c, dark: (i % 8 + Math.floor(i / 8)) % 2 === 0 });
      }
    }
    if (!pieces.length) return true;                       // 王对王
    if (pieces.length === 1 && (pieces[0].t === 'n' || pieces[0].t === 'b')) return true; // 王+单轻子
    if (pieces.length === 2 && pieces.every(function (q) { return q.t === 'b'; }) &&
        pieces[0].c !== pieces[1].c) {
      return pieces[0].dark === pieces[1].dark;            // 同色格象=死局；异色格=仍可杀
    }
    return false;
  }

  // ---------- 顶层 API ----------
  /** 走子（写真局面 + SAN + 历史 + 重复计数）。返回 {ok, san, status} */
  function makeMove(g, from, to, promo) {
    var m = legalMoves(g, from).find(function (x) { return x.to === to; });
    if (!m) return { ok: false, reason: 'illegal' };
    if (m.promo && promo && m.promo !== promo) {
      var alt = legalMoves(g, from).find(function (x) { return x.to === to && x.promo === promo; });
      if (!alt) return { ok: false, reason: 'illegal' };
      m = alt;
    }
    // 悔棋快照（深拷贝整局面）
    g.snapHistory.push({
      board: g.board.map(function (p2) { return p2 ? { c: p2.c, t: p2.t } : null; }),
      castling: Object.assign({}, g.castling), epTarget: g.epTarget,
      halfmove: g.halfmove, fullmove: g.fullmove, turn: g.turn,
    });
    var san = sanOf(g, m, promo || null);
    applyMove(g, m, promo || null);
    g.sanHistory.push(san);
    var fp = fingerprint(g);
    g.positions[fp] = (g.positions[fp] || 0) + 1;
    var st = gameStatus(g);
    return { ok: true, san: san, status: st, move: m };
  }
  /** 悔棋一步（弹出快照）。返回 true/false */
  function undoMove(g) {
    var snap = g.snapHistory.pop();
    if (!snap) return false;
    g.board = snap.board;
    g.castling = snap.castling;
    g.epTarget = snap.epTarget;
    g.halfmove = snap.halfmove;
    g.fullmove = snap.fullmove;
    g.turn = snap.turn;
    g.sanHistory.pop();
    g.positions = {}; // 指纹计数与快照栈不逐条回滚（悔棋后重开计数，保守正确——不误报三次重复）
    g.positions[fingerprint(g)] = 1;
    return true;
  }

  // ---------- AI：minimax + α-β ----------
  /** 评估（白为正） */
  function evaluate(g) {
    var s = 0;
    for (var i = 0; i < 64; i++) {
      var p = g.board[i];
      if (!p) continue;
      var v = PIECE_VALUE[p.t] + centerBias(p.t, i);
      s += p.c === 'w' ? v : -v;
    }
    return s;
  }
  /** 走法排序：吃子优先（MVV-LVA 简版），保证同局面确定性 */
  function orderMoves(g, moves) {
    return moves.slice().sort(function (a, b) {
      return score(b) - score(a) || (a.to - b.to) || (a.from - b.from);
    });
    function score(m) {
      var t = g.board[m.to];
      var v = t ? PIECE_VALUE[t.t] * 10 - PIECE_VALUE[g.board[m.from].t] : 0;
      if (m.ep) v = PIECE_VALUE.p * 10;
      if (m.promo) v += PIECE_VALUE[m.promo];
      if (m.castle) v += 50;
      return v;
    }
  }
  function minimax(g, depth, alpha, beta, deadline) {
    if (deadline && Date.now() > deadline) throw TIMEOUT;   // v10.72 #237 耗时上限（迭代加深回退信号）
    var moves = legalMoves(g);
    if (!moves.length) {
      if (inCheck(g, g.turn)) return g.turn === 'w' ? -99999 + depth : 99999 - depth; // 杀（越浅越烈→偏好速杀）
      return 0; // 逼和
    }
    if (depth === 0) return evaluate(g);
    var isMax = g.turn === 'w';
    var best = isMax ? -Infinity : Infinity;
    var ordered = orderMoves(g, moves);
    for (var i = 0; i < ordered.length; i++) {
      var sim = simulate(g, ordered[i]);
      var v = minimax(sim, depth - 1, alpha, beta, deadline);
      if (isMax) { if (v > best) best = v; if (best > alpha) alpha = best; }
      else { if (v < best) best = v; if (best < beta) beta = best; }
      if (beta <= alpha) break;
    }
    return best;
  }
  var TIMEOUT = { timeout: true };  // 单例标记：仅用于迭代加深的层间回退，不对外暴露
  /**
   * AI 选步：depth 1/2/3（三档）。返回 {from,to,promotion?,score} 或 null（无步可走）
   *
   * v10.72 #237 三项增强（全部 **opt-in**，不传 opts 时行为与旧版逐位一致 → 既有
   * 确定性断言零破坏）：
   *   · opts.timeBudgetMs：迭代加深 + 时限。超预算丢弃未完成层、回退上一层结果，
   *     主线程冻结时间有上界（中局深度 3 全量搜索原本是半秒级冻结，有预算后极端
   *     局面最多冻结约预算值而非无界；预算值由调用方给，核内不写死）。
   *   · opts.rng + opts.jitter：同分（含 jitter 厘兵容差）着法随机取一 —— 旧实现
   *     「同局面恒等走子」使对局可被镜像复现，可玩性坍缩；默认不传 = 保持确定性。
   *   · opts.rng 只决定同分候选的选取，不改变评估函数 —— 难度档实力不含水分。
   */
  function bestMove(g, depth, opts) {
    opts = opts || {};
    var d = depth === 1 || depth === 2 || depth === 3 ? depth : 2;
    var color = g.turn;
    var moves = orderMoves(g, legalMoves(g));
    if (!moves.length) return null;
    var isMax = color === 'w';
    var rng = typeof opts.rng === 'function' ? opts.rng : null;
    var jitter = rng && typeof opts.jitter === 'number' && opts.jitter > 0 ? opts.jitter : 0;
    var budget = typeof opts.timeBudgetMs === 'number' && opts.timeBudgetMs > 0 ? opts.timeBudgetMs : 0;
    var deadline = budget ? Date.now() + budget : 0;
    var scores = null, doneDepth = 0;
    for (var dep = 1; dep <= d; dep++) {
      var round = new Array(moves.length);
      var aborted = false;
      for (var i = 0; i < moves.length; i++) {
        try {
          var sim = simulate(g, moves[i]);
          round[i] = minimax(sim, dep - 1, -Infinity, Infinity, deadline);
        } catch (e) {
          if (e === TIMEOUT) { aborted = true; break; }
          throw e;
        }
      }
      if (aborted) break;                                  // 未完成层整体丢弃（不留半层分数）
      scores = round; doneDepth = dep;
    }
    if (!scores) {                                         // 预算极小（<1 层）→ 退回静态评估首着
      scores = moves.map(function (m) { return evaluate(simulate(g, m)); });
      doneDepth = 0;
    }
    var bestV = isMax ? -Infinity : Infinity;
    for (var k = 0; k < scores.length; k++) {
      if (isMax ? scores[k] > bestV : scores[k] < bestV) bestV = scores[k];
    }
    var cands = [];
    for (k = 0; k < scores.length; k++) {
      if (isMax ? scores[k] >= bestV - jitter : scores[k] <= bestV + jitter) cands.push(k);
    }
    var pickIdx;
    if (!rng) {
      pickIdx = scores.indexOf(bestV);                     // 无随机源：首个最优（旧语义逐位一致）
      if (pickIdx < 0) pickIdx = 0;
    } else {
      pickIdx = cands.length ? cands[Math.floor(rng() * cands.length) % cands.length] : 0;
    }
    var best = moves[pickIdx];
    return { from: best.from, to: best.to, promotion: best.promo || null, score: scores[pickIdx], depth: doneDepth };
  }

  // ---------- perft（测试金标） ----------
  function perft(g, depth) {
    if (depth === 0) return 1;
    var n = 0, moves = legalMoves(g);
    for (var i = 0; i < moves.length; i++) n += perft(simulate(g, moves[i]), depth - 1);
    return n;
  }

  window.__chessCore = {
    initialBoard: initialBoard,
    createGame: createGame,
    cloneGame: cloneGame,
    legalMoves: legalMoves,
    makeMove: makeMove,
    undoMove: undoMove,
    gameStatus: gameStatus,
    inCheck: inCheck,
    sanOf: sanOf,
    squareName: squareName,
    parseSquare: parseSquare,
    fingerprint: fingerprint,
    bestMove: bestMove,
    evaluate: evaluate,
    perft: perft,
    insufficientMaterial: insufficientMaterial,
    epCaptureAvailable: epCaptureAvailable,
    cellA11yLabel: cellA11yLabel,
    focusStep: focusStep,
    PIECE_VALUE: PIECE_VALUE,
  };
})();
