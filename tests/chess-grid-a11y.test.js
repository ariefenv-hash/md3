// ==================== v241-chess-merge 测试 — 棋盘 a11y 合流增量锚（v11.24 #241 R123 窗） ====================
//
// 合流实录（R123 槽双实例同车道撞车）：
//   v10.51（Job 2932311）主批 = _shared/a11y.js 自动增强基建（[onclick] 形态收敛），
//     加餐二段独立实现 chess aria-grid（chess-a11y-core.js baseLabel/nextCell）；
//   v11.24（Job 2931605，97aa2309 先推）= 壳层 P0 组件 + chess aria-grid
//     （chess-core.js 扩展 cellA11yLabel/focusStep，tests/v241-shell-chess-a11y 22 例）。
//   按「内容 push 先者胜」惯例（v10.37/v10.38/#240 同律）：chess 车道取 v11.24
//     实现为基础，v10.51 加餐独有增量五项叠加合流（本文件守护）；
//     chess-a11y-core.js 双写让位删除（__chessA11yCore 全局退役，registry 240→239）。
//
// 增量锚断言面（v11.24 实现上叠加，防未来误删）：
//  M1 局况后缀（已选中/可走/可吃/上一步——读屏用户不点也能听出落点）
//  M2 字形 span aria-hidden（可访问名由 aria-label 提供，不重复朗读）
//  M3 click 更新游走锚（点过的格成为键盘步进起点）
//  M4 升变弹层 Esc 取消（建议 2 chess 面）
//  M5 __chessTest.a11y 无头观测钩子（__sttTest 先例）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const PAGE = readFileSync(join(ROOT, 'ios-desktop/apps/chess/index.html'), 'utf-8');

describe('v241-chess-merge：合流增量锚', () => {
  it('M1 局况后缀四件在案（选中/可走/可吃/上一步）', () => {
    expect(PAGE).toContain("'，已选中'");
    expect(PAGE).toContain("'，可走'");
    expect(PAGE).toContain("'，可吃'");
    expect(PAGE).toContain("'，上一步'");
    expect(PAGE).toContain('var isLegal = sel >= 0 && legalCache.some');
  });

  it('M2 棋子字形 aria-hidden（不重复朗读）', () => {
    expect(PAGE).toContain("s.setAttribute('aria-hidden', 'true')");
  });

  it('M3 click 更新游走锚 kbdIdx', () => {
    expect(PAGE).toContain('kbdIdx = idx; onCell(idx)');
  });

  it('M4 升变弹层 Esc 取消（closePromoSheet + render）', () => {
    expect(PAGE).toContain("if (e.key === 'Escape') { closePromoSheet(); render(); }");
  });

  it('M5 __chessTest.a11y 观测钩子在案（grid 结构 + roving + tabbables）', () => {
    expect(PAGE).toMatch(/a11y:\s*function/);
    expect(PAGE).toContain('gridcells: boardEl.querySelectorAll');
    expect(PAGE).toContain('tabbables: cells.filter');
  });

  it('M6 让位核验：chess-a11y-core.js 已退役（双写不复活），v11.24 核扩展在位', () => {
    const fs = require('node:fs');
    expect(fs.existsSync(join(ROOT, 'ios-desktop/apps/_shared/chess-a11y-core.js'))).toBe(false);
    const core = readFileSync(join(ROOT, 'ios-desktop/js/chess-core.js'), 'utf-8');
    expect(core).toContain('cellA11yLabel');
    expect(core).toContain('focusStep');
  });
});
