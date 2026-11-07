// v216 · #216 chess Edge 空行偏窄修复——棋盘显式 8 行等轨（R119 窗 · 并行实例 B 加餐位）
// 根因：.ch-board 只有 grid-template-columns，8 行全为隐式轨道，行高靠内容撑
//（空格无内容 → 行塌陷 = Edge 下无棋子行显示偏窄），且隐式行分配依赖引擎
// align-content 语义跨引擎不稳。修法（议题建议方向）：grid-template-rows:
// repeat(8, 1fr) 显式 8 行等轨——空行与有子行同轨同尺寸，零内容依赖。
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(path.join(root, 'ios-desktop', 'apps', 'chess', 'index.html'), 'utf-8');
const boardBlock = (src.match(/\.ch-board\s*\{[\s\S]*?\n    \}/) || [null])[0];

describe('v216 · chess 棋盘显式行轨（#216 Edge 空行偏窄）', () => {
  test('A1 .ch-board 显式 8 行等轨：grid-template-rows: repeat(8, 1fr) 与列轨成对', () => {
    expect(boardBlock).toBeTruthy();
    expect(boardBlock).toMatch(/grid-template-rows\s*:\s*repeat\(8,\s*1fr\)/);
    expect(boardBlock).toMatch(/grid-template-columns\s*:\s*repeat\(8,\s*1fr\)/);
  });

  test('A2 根因注释锚 #216 在案（空行与有子行同轨零内容依赖）', () => {
    expect(boardBlock).toContain('#216');
    expect(boardBlock).toContain('空行塌陷');
  });

  test('A3 结构锚：棋盘 8 行容器 × 8 格全量重建（8×8 与显式行轨数恒等，v852 纪律承袭）', () => {
    // v10.50 #241 重锚：棋盘改 role=grid + 行容器 display:contents 构建
    //（ARIA grid 语义要求 row→gridcell 层级），64 格不变式由 r 外层 × f 内层
    // 双循环承载 —— 每格先入行、行入棋盘，布局轨道分配不变（display:contents）
    expect(src).toMatch(/for \(var r = 0; r < 8; r\+\+\)/);
    expect(src).toMatch(/for \(var f = 0; f < 8; f\+\+\)/);
    expect(src).toContain('row.appendChild(d)');
    expect(src).toContain('boardEl.appendChild(row)');
  });

  test('A4 跨引擎语义脱钩：.ch-board 不依赖隐式行分配（auto/min-content 不得回归）', () => {
    expect(boardBlock).toBeTruthy();
    expect(boardBlock).not.toMatch(/grid-auto-rows\s*:\s*(auto|min-content|max-content)/);
    expect(boardBlock).not.toMatch(/grid-template-rows\s*:\s*(auto|min-content)/);
  });
});
