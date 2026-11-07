// ==================== v34-qs-tile-reorder.test.js — #34 磁贴拖拽重排（v10.34） ====================
//
// 覆盖（A17 QPR2 QS customizer 同构 + v7.62 磁贴尺寸表同款纯函数范式）：
//  A. 纯逻辑：loadTileOrder 容错（缺/坏 JSON/非数组/混类型）/ saveTileOrder 落盘 /
//     applyTileOrder（order 前置 + 缺失垫尾 + 脏 id 剔除 + 空 order 回退）/ reorderTiles splice 语义
//  B. 接线锚：initQuickSettings 启动恢复 / 拖拽落位 DOM 实序写回 + persistTileOrder /
//     增删 Reset 三处持久化 / qs-tile-dragging CSS 三面 / 子动作优先（resize/remove 不进拖拽）
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const R = (p) => readFileSync(resolve(__dirname, '..', p), 'utf-8');
import {
  QS_TILE_ORDER_KEY, loadTileOrder, saveTileOrder, applyTileOrder, reorderTiles,
} from '../ios-desktop/js/qs-tiles.js';

const T = (id) => ({ id, name: id.toUpperCase(), sub: '', iconKey: 'settings', active: true, size: 'small' });

describe('v10.34 #34 A — 纯逻辑四函数（零 DOM 直测）', () => {
  it('loadTileOrder：缺 key null / 坏 JSON null / 非数组 null / 混类型 null / 合法数组透传', () => {
    const mem = () => {
      const m = new Map();
      return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
    };
    expect(loadTileOrder(mem())).toBeNull();
    const bad = mem(); bad.setItem(QS_TILE_ORDER_KEY, '{oops');
    expect(loadTileOrder(bad)).toBeNull();
    const notArr = mem(); notArr.setItem(QS_TILE_ORDER_KEY, '"internet"');
    expect(loadTileOrder(notArr)).toBeNull();
    const mixed = mem(); mixed.setItem(QS_TILE_ORDER_KEY, '["internet",5]');
    expect(loadTileOrder(mixed)).toBeNull();
    const good = mem(); good.setItem(QS_TILE_ORDER_KEY, '["internet","bluetooth"]');
    expect(loadTileOrder(good)).toEqual(['internet', 'bluetooth']);
  });

  it('saveTileOrder：数组落盘 JSON 序列化；非数组静默；无 storage 不抛', () => {
    const m = new Map();
    const mem = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
    saveTileOrder(['a', 'b'], mem);
    expect(mem.getItem(QS_TILE_ORDER_KEY)).toBe('["a","b"]');
    expect(() => saveTileOrder('nope', mem)).not.toThrow();
    expect(() => saveTileOrder(['x'], null)).not.toThrow();
    expect(mem.getItem(QS_TILE_ORDER_KEY)).toBe('["a","b"]'); // 非数组未覆盖
  });

  it('applyTileOrder：order 前置 + 未覆盖垫尾（原相对序）+ 脏 id 剔除 + 空 order 回退原数组', () => {
    const tiles = [T('a'), T('b'), T('c'), T('d')];
    expect(applyTileOrder(tiles, ['c', 'a']).map((t) => t.id)).toEqual(['c', 'a', 'b', 'd']);
    expect(applyTileOrder(tiles, ['ghost', 'd', 'ghost2', 'a']).map((t) => t.id)).toEqual(['d', 'a', 'b', 'c']);
    expect(applyTileOrder(tiles, ['a', 'a', 'a']).map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']); // 去重
    expect(applyTileOrder(tiles, [])).toBe(tiles);
    expect(applyTileOrder(tiles, null)).toBe(tiles);
  });

  it('reorderTiles：splice 拔插语义 + 越界钳制 + 非法索引原样返回 + 不原地改', () => {
    const tiles = [T('a'), T('b'), T('c'), T('d')];
    const out = reorderTiles(tiles, 0, 2);
    expect(out.map((t) => t.id)).toEqual(['b', 'c', 'a', 'd']);
    expect(tiles.map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']); // 原数组不动
    expect(reorderTiles(tiles, 1, 99).map((t) => t.id)).toEqual(['a', 'c', 'd', 'b']); // 越界钳尾
    expect(reorderTiles(tiles, -5, 1).map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']); // 非法原样
    expect(reorderTiles(null, 0, 1)).toBeNull();
  });
});

describe('v10.34 #34 B — 接线锚（quick-settings 六面 + CSS 三面）', () => {
  const qs = R('ios-desktop/js/quick-settings.js');
  const qt = R('ios-desktop/js/qs-tiles.js');
  const css = R('ios-desktop/css/pull-panels.css');

  it('import 四函数 + init 启动恢复（applyTileOrder(loadTileOrder)）', () => {
    expect(qs).toContain('QS_TILE_ORDER_KEY, loadTileOrder, saveTileOrder, applyTileOrder, reorderTiles');
    expect(qs).toMatch(/initQuickSettings\(\) \{\s*\n\s*\/\/ v9\.94 #34[\s\S]*?activeTiles = applyTileOrder\(activeTiles, loadTileOrder\(/);
  });

  it('拖拽落位链：DOM 实序写回 + persistTileOrder + 重渲染 + pointercancel 同链', () => {
    expect(qs).toMatch(/const domOrder = \[\.\.\.grid\.children\]\.map\(\(c\) => c\.dataset\.tileId\)\.filter\(Boolean\);/);
    expect(qs).toMatch(/activeTiles = applyTileOrder\(activeTiles, domOrder\);\s*\n\s*persistTileOrder\(\);\s*\n\s*renderEditTilesLists\(\);/);
    expect(qs).toMatch(/document\.removeEventListener\('pointercancel', finish\);/);
    expect(qs).toContain('function bindTileDrag(el)');
    expect(qs).toMatch(/el\.dataset\.tileId = tile\.id;\s*\n\s*bindTileDrag\(el\);/);
  });

  it('阈值与子动作优先：7px 起拖阈值 / resize-remove pointerdown 直通 / 未过阈值零副作用', () => {
    expect(qs).toMatch(/if \(Math\.hypot\(dx, dy\) < 7\) return;/);
    expect(qs).toContain("if (e.target.closest('.edit-resize-handle, .edit-badge-remove')) return;");
    expect(qs).toMatch(/if \(!dragging\) return; \/\/ 未过阈值 = 误触，零副作用/);
  });

  it('增删 Reset 三处 persistTileOrder 落盘（remove/add badge + Reset）', () => {
    expect(qs).toMatch(/if \(fallbackCat\) fallbackCat\.tiles\.push\(removed\);\s*\n\s*persistTileOrder\(\);/);
    expect(qs).toMatch(/activeTiles\.push\(added\);\s*\n\s*persistTileOrder\(\);/);
    expect(qs).toMatch(/saveTileSizes\(tileSizes, typeof localStorage !== 'undefined' \? localStorage : null\);\s*\n\s*persistTileOrder\(\);/);
    expect(qs).toMatch(/function persistTileOrder\(\) \{\s*\n\s*saveTileOrder\(activeTiles\.map\(\(t\) => t\.id\)/);
  });

  it('qs-tiles.js 常量与四函数导出齐 + KEY 命名对齐 ios-desktop:qs-tile-order', () => {
    expect(qt).toContain("export const QS_TILE_ORDER_KEY = 'ios-desktop:qs-tile-order';");
    for (const fn of ['loadTileOrder', 'saveTileOrder', 'applyTileOrder', 'reorderTiles']) {
      expect(qt).toMatch(new RegExp(`export function ${fn}\\(`));
    }
  });

  it('CSS 三面：拖拽抓起态（阴影+outline+禁过渡+cursor）+ 图标微放大 + touch-action none', () => {
    expect(css).toMatch(/\.qs-tile-pill\.qs-tile-dragging \{[\s\S]*?transition: none;[\s\S]*?box-shadow: var\(--md-shadow-3\)/);
    expect(css).toMatch(/\.qs-tile-pill\.qs-tile-dragging \{[\s\S]*?outline: 2px solid var\(--md-primary/);
    expect(css).toMatch(/\.qs-tile-pill\.qs-tile-dragging \.qs-tile-icon-wrap \{\s*\n\s*transform: scale\(1\.06\);/);
    expect(css).toMatch(/#editActiveTilesGrid \.qs-tile-pill\.active \{\s*\n\s*touch-action: none;\s*\n\s*cursor: grab;/);
  });

  it('v7.62 既有锚保持：尺寸表 KEY 与 bindResizeHandle 未被破坏', () => {
    expect(qt).toContain("export const TILE_SIZE_KEY = 'ios-desktop:qs-tile-sizes';");
    expect(qs).toContain('function bindResizeHandle(handle, tileEl, tile)');
    expect(qs).toContain('saveTileSizes(tileSizes, typeof localStorage');
  });
});
