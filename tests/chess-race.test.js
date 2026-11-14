// ==================== chess-race.test.js — #237 chess 竞态/升变/判和（v11.24） ====================
// 议题 #237 三连竞态 + 升变恒升后 + KBvKB 异色格误判和 + 同局面恒等走子，全部由无头
// Chromium 运行时复现。本套件按「纯逻辑可测先行」原则覆盖可确定性断言的部分：
//   A. 子力不足：K+B vs K+B 象格颜色判定（同色=死局 / 异色=仍可杀）
//   B. 局面指纹：ep 目标仅在存在合法过路兵吃法时计入（FIDE 局面同一性）
//   C. AI：默认零 opts 与旧版逐位一致（确定性）；rng+jitter 同分随机；时限回退可返回
//   D. 接线静态锚：AI 代际令牌 / 新局撤销在途回调 / 升变四选择弹层 / 唯一调度入口
// 运行时竞态三连由 scripts/e2e-v237-chess.mjs 真浏览器验证（静态锚无法替代）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// ---------- 沙箱提取（IIFE → window.__chessCore，与 v132 同款） ----------
const CORE_SRC = read('ios-desktop/js/chess-core.js');
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const C = ctx.window.__chessCore;
const HTML = read('ios-desktop/apps/chess/index.html');

function fromFen(fen) {
  const b = new Array(64).fill(null);
  fen.split(' ')[0].split('/').forEach((row, r) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { f += parseInt(ch, 10); continue; }
      b[r * 8 + f] = { c: ch === ch.toUpperCase() ? 'w' : 'b', t: ch.toLowerCase() };
      f++;
    }
  });
  const g = C.createGame();
  g.board = b;
  g.turn = fen.split(' ')[1] || 'w';
  return g;
}
const sq = (s) => C.parseSquare(s);

// ==================== A. 子力不足：象格颜色 ====================
describe('v11.24 #237 · A 子力不足（K+B vs K+B 象格颜色）', () => {
  it('A1 异色格象不判和（FIDE：异色 KBvKB 存在辅助将杀）', () => {
    // 白象 c1（深色系）+ 黑象 h1（浅色系）→ 异色
    const g = fromFen('4k3/8/8/8/8/8/8/2B1K2b w - -');
    expect(C.insufficientMaterial(g)).toBe(false);
    expect(C.gameStatus(g)).not.toBe('insufficient');
  });

  it('A2 同色格象判和（真死局）', () => {
    // 白象 c1 + 黑象 a1：两格同色（file+rank 奇偶一致）
    const g = fromFen('4k3/8/8/8/8/8/8/b1B1K3 w - -');
    expect(C.insufficientMaterial(g)).toBe(true);
    expect(C.gameStatus(g)).toBe('insufficient');
  });

  it('A3 王对王 / 王+单轻子 仍判死局（回归锚，#132 语义零回退）', () => {
    expect(C.insufficientMaterial(fromFen('4k3/8/8/8/8/8/8/4K3 w - -'))).toBe(true);
    expect(C.insufficientMaterial(fromFen('4k3/8/8/8/8/8/8/4KN2 w - -'))).toBe(true);
    expect(C.insufficientMaterial(fromFen('4k3/8/8/8/8/8/8/4KB2 w - -'))).toBe(true);
  });

  it('A4 双象/车等有杀局面不判和（反向锚）', () => {
    expect(C.insufficientMaterial(fromFen('4k3/8/8/8/8/8/8/2BBK3 w - -'))).toBe(false);
    expect(C.insufficientMaterial(fromFen('4k3/8/8/8/8/8/8/3RK3 w - -'))).toBe(false);
  });
});

// ==================== B. 指纹 ep 语义 ====================
describe('v11.24 #237 · B 局面指纹（ep 目标按合法吃法计入）', () => {
  it('B1 兵双步后无可吃 ep 的兵：指纹与 epTarget=null 等价（不再少报重复）', () => {
    const g = C.createGame();
    const r = C.makeMove(g, sq('e2'), sq('e4'));
    expect(r.ok).toBe(true);
    expect(g.epTarget).toBe(sq('e3'));
    expect(C.epCaptureAvailable(g)).toBe(false);
    const withEp = C.fingerprint(g);
    g.epTarget = null;
    expect(withEp).toBe(C.fingerprint(g));
  });

  it('B2 邻格有可吃 ep 的兵：指纹必须区分（ep 构成真实着法差异）', () => {
    const g = fromFen('4k3/8/8/8/3p4/8/4P3/4K3 w - -');
    const r = C.makeMove(g, sq('e2'), sq('e4'));
    expect(r.ok).toBe(true);
    expect(g.epTarget).toBe(sq('e3'));
    expect(C.epCaptureAvailable(g)).toBe(true);
    const withEp = C.fingerprint(g);
    g.epTarget = null;
    expect(withEp).not.toBe(C.fingerprint(g));
  });

  it('B3 被钉住的兵不能真吃 ep → 不计入指纹（合法性而非伪合法性）', () => {
    // 黑王 d8 / 黑兵 d4 / 白车 d1 同线：d4 兵被钉住，吃 e3（ep）会暴露 d 线将军 → 该 ep 不合法
    const g = fromFen('3k4/8/8/8/3p4/8/4P3/3RK3 w - -');
    expect(C.makeMove(g, sq('e2'), sq('e4')).ok).toBe(true);
    expect(g.epTarget).toBe(sq('e3'));
    expect(C.epCaptureAvailable(g)).toBe(false);   // 伪合法存在、合法不存在
    const withEp = C.fingerprint(g);
    g.epTarget = null;
    expect(withEp).toBe(C.fingerprint(g));
  });
});

// ==================== C. AI：确定性 / 随机扰动 / 时限 ====================
describe('v11.24 #237 · C AI 选步', () => {
  it('C1 不传 opts：同局面两次选步逐位一致（旧确定性语义零回退）', () => {
    const g = C.createGame();
    C.makeMove(g, sq('e2'), sq('e4'));
    C.makeMove(g, sq('e7'), sq('e5'));
    const a = C.bestMove(g, 2);
    const b = C.bestMove(g, 2);
    expect(a.from).toBe(b.from);
    expect(a.to).toBe(b.to);
    expect(a.promotion).toBe(b.promotion);
    expect(a.score).toBe(b.score);
  });

  it('C2 rng+jitter：同分候选随机取一 → 不同随机源不再恒等走子', () => {
    const g = C.createGame();
    const lo = C.bestMove(g, 1, { rng: () => 0, jitter: 80 });
    const hi = C.bestMove(g, 1, { rng: () => 0.999, jitter: 80 });
    expect(lo).not.toBeNull();
    expect(hi).not.toBeNull();
    expect(`${lo.from}-${lo.to}`).not.toBe(`${hi.from}-${hi.to}`);
  });

  it('C3 rng 路径仍返回合法走法（不因随机越界）', () => {
    const g = C.createGame();
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      const bm = C.bestMove(g, 2, { rng: () => r, jitter: 40 });
      const legal = C.legalMoves(g).some((m) => m.from === bm.from && m.to === bm.to);
      expect(legal).toBe(true);
    }
  });

  it('C4 时限：极小预算仍返回可用走法（迭代加深回退，不抛不空）', () => {
    const g = C.createGame();
    C.makeMove(g, sq('e2'), sq('e4'));
    const t0 = Date.now();
    const bm = C.bestMove(g, 3, { timeBudgetMs: 1 });
    const cost = Date.now() - t0;
    expect(bm).not.toBeNull();
    expect(C.legalMoves(g).some((m) => m.from === bm.from && m.to === bm.to)).toBe(true);
    expect(cost).toBeLessThan(1500); // 回退路径不得无界冻结（深度 3 全量约 500ms+）
  });

  it('C5 无步可走返回 null（将死/逼和）', () => {
    const g = fromFen('7k/6Q1/7K/8/8/8/8/8 b - -'); // 黑王 h8 被后 g7 将死（Kh6 护后）
    expect(C.gameStatus(g)).toBe('checkmate');
    expect(C.bestMove(g, 2)).toBeNull();
  });
});

// ==================== D. 接线静态锚（UI 侧，运行时不变量） ====================
describe('v11.24 #237 · D 页面接线静态锚', () => {
  it('D1 AI 回合代际令牌 + 在途定时器可撤销（cancelAi 清 setTimeout）', () => {
    expect(HTML).toMatch(/var gameSeq = 0;/);
    expect(HTML).toMatch(/function cancelAi\(\)/);
    expect(HTML).toMatch(/clearTimeout\(aiTimer\)/);
    expect(HTML).toMatch(/if \(seq !== gameSeq \|\| ref !== game\) return;/);
  });

  it('D2 「新局 / 切模式 / 悔棋」先作废代际再重置（三连竞态根因）', () => {
    const newGame = HTML.slice(HTML.indexOf("getElementById('chNew')"));
    expect(newGame.slice(0, 400)).toMatch(/gameSeq\+\+; cancelAi\(\);/);
    const modeBtn = HTML.slice(HTML.indexOf("getElementById('chMode')"));
    expect(modeBtn.slice(0, 400)).toMatch(/gameSeq\+\+; cancelAi\(\);/);
    const undoBtn = HTML.slice(HTML.indexOf("getElementById('chUndo')"));
    expect(undoBtn.slice(0, 400)).toMatch(/gameSeq\+\+; cancelAi\(\);/);
  });

  it('D3 人机死局自愈：切模式/悔棋后统一走 scheduleAi（不再依赖玩家白走子触发）', () => {
    expect(HTML).toMatch(/function scheduleAi\(\)/);
    const modeBtn = HTML.slice(HTML.indexOf("getElementById('chMode')"));
    expect(modeBtn.slice(0, 700)).toMatch(/scheduleAi\(\);/);
    const undoBtn = HTML.slice(HTML.indexOf("getElementById('chUndo')"));
    expect(undoBtn.slice(0, 700)).toMatch(/scheduleAi\(\);/);
  });

  it('D4 升变四选择弹层（旧写死 promo=\'q\' 必须消失）', () => {
    expect(HTML).not.toMatch(/m\.length > 1 \? 'q' : null/);
    expect(HTML).toMatch(/id="chPromo"/);
    expect(HTML).toMatch(/id="chPromoRow"/);
    expect(HTML).toMatch(/\['q', 'r', 'b', 'n'\]\.forEach/);
    expect(HTML).toMatch(/function pickPromotion\(t\)/);
    expect(HTML).toMatch(/C\.makeMove\(game, from, to, t\)/);
  });

  it('D5 AI 走子不再强行传 q（promotion 空值不得泄漏到普通走法）', () => {
    expect(HTML).not.toMatch(/bm\.promotion \|\| 'q'/);
    expect(HTML).toMatch(/C\.makeMove\(game, bm\.from, bm\.to, bm\.promotion \|\| null\)/);
  });

  it('D6 难度档随机扰动与时限只在 UI 侧开启（核默认确定性）', () => {
    expect(HTML).toMatch(/\{ rng: Math\.random, jitter: 24, timeBudgetMs: 400 \}/);
    expect(CORE_SRC).toMatch(/opts\.timeBudgetMs/);
    expect(CORE_SRC).toMatch(/opts\.rng/);
  });
});
