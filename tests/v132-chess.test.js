// ==================== v132-chess.test.js — #132 国际象棋（v11.01） ====================
// 纯逻辑核 ios-desktop/js/chess-core.js（IIFE 沙箱提取）：
//   A. perft 金标（走法生成正确性唯一权威：初始 20/400/8902/197281 + Kiwipete 48/2039）
//   B. 特殊规则（易位四门槛/过路兵/升变四选择）
//   C. 终局判定（将死/逼和/三次重复/五十步/子力不足）+ SAN（含 # 后缀/升变/消歧）
//   D. AI（一步杀可解/走法合法性/确定性/深度档位）+ 悔棋 + 应用接线锚
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// ---------- 沙箱提取（IIFE → window.__chessCore） ----------
const CORE_SRC = read('ios-desktop/js/chess-core.js');
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const C = ctx.window.__chessCore;

// FEN 棋盘行 → 局面（只设 board/turn，castle 权默认全开）
function fromFen(s) {
  const b = new Array(64).fill(null);
  s.split(' ')[0].split('/').forEach((row, r) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { f += parseInt(ch, 10); continue; }
      b[r * 8 + f] = { c: ch === ch.toUpperCase() ? 'w' : 'b', t: ch.toLowerCase() };
      f++;
    }
  });
  const g = C.createGame();
  g.board = b;
  g.turn = s.split(' ')[1] || 'w';
  return g;
}
const sq = (s) => C.parseSquare(s);

// ==================== A. perft 金标 ====================
describe('v11.01 #132 · A perft 金标（走法生成唯一权威）', () => {
  it('初始局面 perft 1/2/3 = 20/400/8902', () => {
    const g = C.createGame();
    expect(C.perft(g, 1)).toBe(20);
    expect(C.perft(g, 2)).toBe(400);
    expect(C.perft(g, 3)).toBe(8902);
  });

  it('初始局面 perft 4 = 197281（王安全过滤 + 易位 + 过路兵全路径）', () => {
    const g = C.createGame();
    expect(C.perft(g, 4)).toBe(197281);
  });

  it('Kiwipete 高覆盖位 perft 1/2 = 48/2039（含双侧易位与攻击穿越禁）', () => {
    const g = fromFen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq -');
    g.castling = { wK: true, wQ: true, bK: true, bQ: true };
    expect(C.perft(g, 1)).toBe(48);
    expect(C.perft(g, 2)).toBe(2039);
  });
});

// ==================== B. 特殊规则 ====================
describe('v11.01 #132 · B 特殊规则', () => {
  it('王车易位：双侧权利可走；O-O 后车随王移 + 权利消失', () => {
    const g = fromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq -');
    const castles = C.legalMoves(g, sq('e1')).filter((m) => m.castle);
    expect(castles.map((m) => m.castle).sort()).toEqual(['K', 'Q']);
    const r = C.makeMove(g, sq('e1'), sq('g1'));
    expect(r.san).toBe('O-O');
    expect(g.board[sq('f1')]).toMatchObject({ c: 'w', t: 'r' }); // 车随王移
    expect(g.castling.wK).toBe(false);
    expect(g.castling.wQ).toBe(false);
  });

  it('易位被将军禁走（王在将军时无易位走法）', () => {
    // 黑车 e8 沿 e 线将军 e1 王（e 线中间全空）
    const g = fromFen('4r3/8/8/8/8/8/8/R3K2R w KQ -');
    const castles = C.legalMoves(g, sq('e1')).filter((m) => m.castle);
    expect(castles.length).toBe(0);
  });

  it('穿越格受攻击禁易位（K 侧 f1 被黑象攻击 → 仅 Q 侧可走）', () => {
    // 黑象 a6 攻击 f1 对角线（a6-b5-c4-d3-e2-f1），王不被将军
    const g = fromFen('r3k3/8/b7/8/8/8/8/R3K2R w KQ -');
    const castles = C.legalMoves(g, sq('e1')).filter((m) => m.castle);
    expect(castles.map((m) => m.castle)).toEqual(['Q']);
  });

  it('吃过路兵：exd6 移除被吃兵（d5 清空）', () => {
    const g = C.createGame();
    [['e2', 'e4'], ['a7', 'a6'], ['e4', 'e5'], ['d7', 'd5'], ['e5', 'd6']].forEach(([a, b]) => {
      expect(C.makeMove(g, sq(a), sq(b)).ok).toBe(true);
    });
    expect(g.sanHistory[4]).toBe('exd6');
    expect(g.board[sq('d5')]).toBeNull();
  });

  it('兵升变：四选择（q/r/b/n）+ SAN a8=Q 带将后缀', () => {
    const g = fromFen('8/P7/8/8/8/8/k6K/8 w - -');
    const promos = C.legalMoves(g, sq('a7'));
    expect(promos.length).toBe(4);
    expect(promos.map((m) => m.promo).sort()).toEqual(['b', 'n', 'q', 'r']);
    const r = C.makeMove(g, sq('a7'), sq('a8'), 'q');
    expect(r.san).toBe('a8=Q+');
    expect(g.board[sq('a8')]).toMatchObject({ c: 'w', t: 'q' });
  });

  it('非法走法拒绝：走子后露王（钉住）不合法', () => {
    // 白王 e1、白车 e2（挡黑车 e8 将军）、e2 车横移即露将
    const g = fromFen('4r3/8/8/8/8/8/4R3/4K3 w - -');
    expect(C.makeMove(g, sq('e2'), sq('a2')).ok).toBe(false);
    expect(C.makeMove(g, sq('e2'), sq('e8')).ok).toBe(true); // 吃掉钉子合法
  });
});

// ==================== C. 终局判定 + SAN ====================
describe('v11.01 #132 · C 终局判定与 SAN', () => {
  it('学者四步杀：checkmate + SAN Qxf7#（杀后缀）', () => {
    const g = C.createGame();
    [['e2', 'e4'], ['e7', 'e5'], ['f1', 'c4'], ['b8', 'c6'], ['d1', 'h5'], ['g8', 'f6'], ['h5', 'f7']]
      .forEach(([a, b]) => { expect(C.makeMove(g, sq(a), sq(b)).ok).toBe(true); });
    expect(g.sanHistory[6]).toBe('Qxf7#');
    expect(C.gameStatus(g)).toBe('checkmate');
  });

  it('逼和：无合法走法但不在将军 → stalemate', () => {
    const g = fromFen('k7/8/1Q6/8/8/8/8/K7 b - -');
    expect(C.gameStatus(g)).toBe('stalemate');
  });

  it('三次重复：双方来回四回 → threefold', () => {
    const g = C.createGame();
    [['g1', 'f3'], ['g8', 'f6'], ['f3', 'g1'], ['f6', 'g8'], ['g1', 'f3'], ['g8', 'f6'], ['f3', 'g1'], ['f6', 'g8']]
      .forEach(([a, b]) => { expect(C.makeMove(g, sq(a), sq(b)).ok).toBe(true); });
    expect(C.gameStatus(g)).toBe('threefold');
  });

  it('升变后缀只落在末行（promo 参数泄漏防御——v11.01 e2e 实测坑）', () => {
    const g = C.createGame();
    // makeMove 传 promo='q' 但走法为非末行普通吃子（e4 兵不存在吃子——用 d2→d4 双步 + promo 泄漏场景）
    const r = C.makeMove(g, sq('d2'), sq('d4'), 'q');
    expect(r.san).toBe('d4'); // 非末行绝不加 =Q
    expect(g.board[sq('d4')]).toMatchObject({ t: 'p' }); // 也不实际升变
  });

  it('SAN 消歧：双马可达同格 → file 消歧（Nbd2 范式）', () => {
    // 白马 b1 与 f3 均可到 d2（d2 兵移开腾出目标格）
    const g = fromFen('rnbqkb1r/pppppppp/8/8/8/5N2/PPP1PPPP/RNBQKB1R w KQkq -');
    const r = C.makeMove(g, sq('b1'), sq('d2'));
    expect(r.san).toBe('Nbd2');
  });

  it('sanOf 将后缀（+）与纯推进无后缀', () => {
    const g = C.createGame();
    const r1 = C.makeMove(g, sq('e2'), sq('e4'));
    expect(r1.san).toBe('e4');
    const g2 = fromFen('4k3/8/8/8/8/8/8/R6K w - -');
    const r2 = C.makeMove(g2, sq('a1'), sq('e1'));
    expect(r2.san).toBe('Re1+'); // e 线直指 e8 王（白王在 h1 让开 e 线）
  });
});

// ==================== D. AI + 悔棋 + 接线 ====================
describe('v11.01 #132 · D AI 与悔棋', () => {
  it('AI depth 3 解一步杀（背杀 Re8#）', () => {
    const g = fromFen('6k1/5ppp/8/8/8/8/8/4R2K w - -');
    const bm = C.bestMove(g, 3);
    expect(bm).not.toBeNull();
    expect(C.squareName(bm.from) + C.squareName(bm.to)).toBe('e1e8');
  });

  it('AI 返回合法走法且同局面确定性（两次调用同结果）', () => {
    const g = C.createGame();
    const a = C.bestMove(g, 2);
    const b = C.bestMove(C.createGame(), 2);
    expect(a.from).toBe(b.from);
    expect(a.to).toBe(b.to);
    // 合法性：在 legalMoves 集内
    const legal = C.legalMoves(C.createGame());
    expect(legal.some((m) => m.from === a.from && m.to === a.to)).toBe(true);
  });

  it('AI 三档深度档位有效（depth 1/2/3 均返回）', () => {
    for (const d of [1, 2, 3]) {
      const g = C.createGame();
      expect(C.bestMove(g, d)).not.toBeNull();
    }
  });

  it('悔棋：快照回滚棋盘与轮次；SAN 历史同步弹出', () => {
    const g = C.createGame();
    C.makeMove(g, sq('e2'), sq('e4'));
    C.makeMove(g, sq('e7'), sq('e5'));
    expect(g.sanHistory.length).toBe(2);
    expect(C.undoMove(g)).toBe(true);
    expect(g.sanHistory.length).toBe(1);
    expect(g.turn).toBe('b'); // 回到黑走
    expect(g.board[sq('e7')]).toMatchObject({ t: 'p' });
    expect(C.undoMove(g)).toBe(true);
    expect(g.turn).toBe('w');
    expect(C.undoMove(g)).toBe(false); // 空栈拒绝
  });
});

// ==================== E. 应用接线锚 ====================
describe('v11.01 #132 · E 应用接线（准入六条对齐）', () => {
  const appHtml = read('ios-desktop/apps/chess/index.html');
  const shell = read('ios-desktop/js/apps/chess.js');
  const icons = read('ios-desktop/js/app-icons.js');
  const appsData = read('ios-desktop/js/apps-data.js');

  it('壳注册三件套：chess.js 壳 + iframe 内容 + 图标 + apps-data 第 52 号', () => {
    expect(shell).toContain("id: 'chess'");
    expect(shell).toContain("iframeAppContent('apps/chess/index.html')");
    expect(icons).toContain('chess:');
    expect(appsData).toContain("import chess from './apps/chess.js'");
    expect(appsData).toContain('chess, //');
  });

  it('准入① MD3 令牌：禁裸色（棋盘格例外须注释）+ 大量 --md-* 引用', () => {
    expect(appHtml).toContain('var(--md-surface)');
    expect(appHtml.match(/var\(--md-/g).length).toBeGreaterThanOrEqual(15);
  });

  it('准入② 响应式 @media 断点在列', () => {
    expect(appHtml.match(/@media/g).length).toBeGreaterThanOrEqual(1);
  });

  it('准入③ 平板分栏：棋盘/棋谱双栏布局', () => {
    expect(appHtml).toContain('.ch-wide');
  });

  it('准入④ SDK 接入：VFS 棋谱存档 + 系统通知 + 纯逻辑核引入', () => {
    expect(appHtml).toContain('<script src="../../js/chess-core.js"></script>');
    expect(appHtml).toContain('/documents/chess/');
    expect(appHtml).toContain('sysNotify');
    expect(appHtml).toContain('window.__system.fs');
  });

  it('接入锚：AI 三档 + 双人模式 + 悔棋 + 新局按钮', () => {
    expect(appHtml).toContain('bestMove');
    expect(appHtml).toContain('chUndo');
    expect(appHtml).toContain('chNew');
  });
});
