// ==================== v203-qs-paged-layout.test.js — #203 QS 磁贴分页布局 v10.20 ====================
//
// 覆盖（QS 三部曲之三·布局层；姊妹篇 #201 qs-tile-state.js / #202 qs-tile-view.js 已在库）：
//   · aosp/qs-paged-layout.js 纯逻辑真跑：
//     - maxTiles 容量公式（TileLayout.java L295-300 逐字：Math.max(columns*rows, 1)，
//       0×0/负数保底 1）
//     - distributeTiles 重分配（PagedTileLayout.java L399-411）：空队列保底一页 /
//       满页即封 / 溢出进下页 / 保序跨页连续 / 宽磁贴权重 2 格（页尾放不下整块进下页、
//       单块超页独占）/ 行列变化重分配 / 页数按需伸缩
//     - pageIndicatorState 浮点状态（PageIndicator.setLocation L156-173）：index1=floor、
//       offset、index2=index1+1（最后一页 null）、负值与越界钳制、单页
//     - selectedPageIndex（onPageSelected L690-697 四舍五入语义 + 钳制）
//     - stepPage（PageScrollActionListener LEFT/RIGHT L298-304 + 边界钳制）
//     - resolveRestorePage（mPageToRestore L68 恢复页钳制）
//   · 接线锚：quick-settings.js import 面 / renderQuickSettingsGrid 分页渲染
//     （distributeTiles + tileWeight wide=2 + .qs-page 保留 .qs-tiles-grid 类）/ 页指示器
//     （qs-page-dot + 点击 scrollTo + scroll 浮点联动）/ 键盘 ArrowLeft/Right → stepPage /
//     syncQsPagedViewport 恢复页导出 + openPullPanel 动态 import 展开/编辑器后恢复 /
//     __qsPageState 调试钩子 / QQS 双份渲染与编辑器既有链零触碰
//   · 结构锚：index.html 分页视口 + 指示器容器；CSS scroll-snap/flex 页/圆点令牌
//     （全 --md-* 变量零裸色，v817 纪律）
//   · 回归锚：#201 三态类 / #202 五通道消费 / tile-bounce :scope 直接子级零破坏

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  QS_PAGE_COLUMNS, QS_PAGE_ROWS, PAGE_SCROLL_DIRECTION,
  maxTiles, distributeTiles, pageIndicatorState, selectedPageIndex,
  stepPage, resolveRestorePage,
} from '../ios-desktop/js/aosp/qs-paged-layout.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LAYOUT_JS = readFileSync(join(ROOT, 'ios-desktop/js/aosp/qs-paged-layout.js'), 'utf-8');
const QS = readFileSync(join(ROOT, 'ios-desktop/js/quick-settings.js'), 'utf-8');
const HTML = readFileSync(join(ROOT, 'ios-desktop/index.html'), 'utf-8');
const CSS = readFileSync(join(ROOT, 'ios-desktop/css/pull-panels.css'), 'utf-8');
const GESTURE = readFileSync(join(ROOT, 'ios-desktop/js/pull-down-gesture.js'), 'utf-8');
const BOUNCE = readFileSync(join(ROOT, 'ios-desktop/js/tile-bounce.js'), 'utf-8');

// 磁贴桩（仅 id 参与，顺序即跨页连续序）
const T = (id) => ({ id });
const SMALL = (id) => ({ id, size: 'small' });
const WIDE = (id) => ({ id, size: 'wide' });
const ids = (pages) => pages.map((p) => p.map((t) => t.id));

describe('v203 maxTiles 容量公式（TileLayout.java L295-300 同源）', () => {
  it('4 列 × 2 行 = 8 格（QS_PAGE_COLUMNS/ROWS 契约常量同源）', () => {
    expect(QS_PAGE_COLUMNS).toBe(4);
    expect(QS_PAGE_ROWS).toBe(2);
    expect(maxTiles(4, 2)).toBe(8);
  });

  it('0×0 与负数保底 1（防初始化期 0 容量）', () => {
    expect(maxTiles(0, 0)).toBe(1);
    expect(maxTiles(-3, 5)).toBe(1);
    expect(maxTiles(3, -1)).toBe(1);
  });
});

describe('v203 distributeTiles 重分配（PagedTileLayout.java L399-411 同构）', () => {
  it('空队列保底一页（AOSP 无磁贴仍 inflate 一页）', () => {
    const pages = distributeTiles([], { columns: 4, rows: 2 });
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(0);
  });

  it('单枚磁贴一页；满 8 格恰好一页', () => {
    expect(distributeTiles([T('a')], { columns: 4, rows: 2 })).toHaveLength(1);
    const full = distributeTiles(Array.from({ length: 8 }, (_, i) => T(`t${i}`)), { columns: 4, rows: 2 });
    expect(full).toHaveLength(1);
    expect(full[0]).toHaveLength(8);
  });

  it('9 枚溢出进下页（2 页 8+1）；17 枚三页（8+8+1）', () => {
    const p9 = distributeTiles(Array.from({ length: 9 }, (_, i) => T(`s${i}`)), { columns: 4, rows: 2 });
    expect(p9).toHaveLength(2);
    expect(p9[0]).toHaveLength(8);
    expect(p9[1]).toHaveLength(1);
    const p17 = distributeTiles(Array.from({ length: 17 }, (_, i) => T(`s${i}`)), { columns: 4, rows: 2 });
    expect(p17).toHaveLength(3);
    expect(p17[2]).toHaveLength(1);
  });

  it('保序跨页连续（mTiles 总队列顺序唯一决定落页）', () => {
    const pages = distributeTiles(Array.from({ length: 10 }, (_, i) => T(`n${i}`)), { columns: 4, rows: 2 });
    expect(ids(pages)).toEqual([['n0','n1','n2','n3','n4','n5','n6','n7'], ['n8','n9']]);
  });

  it('宽磁贴权重 2：4 枚 wide 恰满一页；5 枚 wide 两页（页尾放不下整块进下页）', () => {
    const w = (i) => WIDE(`w${i}`);
    const wideOnly = (tiles) => distributeTiles(tiles, { columns: 4, rows: 2, tileWeight: (t) => (t.size === 'wide' ? 2 : 1) });
    expect(wideOnly([w(1), w(2), w(3), w(4)])).toHaveLength(1);
    const five = wideOnly([w(1), w(2), w(3), w(4), w(5)]);
    expect(five).toHaveLength(2);
    expect(five[0]).toHaveLength(4);
    expect(five[1]).toHaveLength(1);
  });

  it('wide 与 small 混排：wide 占 2 格后 6 枚 small 满页，第 7 枚进下页', () => {
    const pages = distributeTiles(
      [WIDE('big'), ...Array.from({ length: 7 }, (_, i) => SMALL(`s${i}`))],
      { columns: 4, rows: 2, tileWeight: (t) => (t.size === 'wide' ? 2 : 1) },
    );
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(7); // 1 wide(2 格) + 6 small(6 格) = 8 格满页
    expect(pages[1]).toHaveLength(1);
    expect(ids(pages)[1]).toEqual(['s6']);
  });

  it('单块权重超页容量独占一页（不切割，AOSP 磁贴不跨页）', () => {
    const pages = distributeTiles([T('a'), T('b')], { columns: 0, rows: 0, tileWeight: () => 3 });
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(1);
    expect(pages[1]).toHaveLength(1);
  });

  it('行列变化重分配：2×2 容量 4 → 同队列页数伸缩', () => {
    const tiles = Array.from({ length: 9 }, (_, i) => T(`r${i}`));
    expect(distributeTiles(tiles, { columns: 4, rows: 2 })).toHaveLength(2);
    expect(distributeTiles(tiles, { columns: 2, rows: 2 })).toHaveLength(3);
  });

  it('非法输入容错：null tiles / 缺 opts 不抛异常（保底一页）', () => {
    expect(distributeTiles(null, {})).toHaveLength(1);
    expect(distributeTiles(undefined)).toHaveLength(1);
  });
});

describe('v203 pageIndicatorState 浮点状态（PageIndicator.setLocation L156-173 同构）', () => {
  it('整数位置：index1=页、offset=0、index2=下一页', () => {
    expect(pageIndicatorState(3, 0)).toEqual({ index1: 0, index2: 1, offset: 0, position: 0 });
    expect(pageIndicatorState(3, 2)).toEqual({ index1: 2, index2: null, offset: 0, position: 2 });
  });

  it('浮点位置：1.5 → index1=1、index2=2、offset=0.5', () => {
    const s = pageIndicatorState(3, 1.5);
    expect(s.index1).toBe(1);
    expect(s.index2).toBe(2);
    expect(s.offset).toBeCloseTo(0.5, 10);
  });

  it('最后一页 index2=null（AOSP index2 超 mNumPages 不画过渡点）', () => {
    expect(pageIndicatorState(3, 2).index2).toBeNull();
    expect(pageIndicatorState(3, 2.4).index2).toBeNull();
  });

  it('负值与越界钳制到 [0, pageCount-1]', () => {
    expect(pageIndicatorState(3, -2).position).toBe(0);
    expect(pageIndicatorState(3, 99).position).toBe(2);
    expect(pageIndicatorState(3, NaN).position).toBe(0);
  });

  it('单页保底：pageCount<1 按 1（恒 index1=0、index2=null）', () => {
    expect(pageIndicatorState(0, 5)).toEqual({ index1: 0, index2: null, offset: 0, position: 0 });
    expect(pageIndicatorState(-1, 0).position).toBe(0);
  });

  it('selectedPageIndex 四舍五入语义（onPageSelected L690-697）+ 钳制', () => {
    expect(selectedPageIndex(3, 1.4)).toBe(1);
    expect(selectedPageIndex(3, 1.6)).toBe(2);
    expect(selectedPageIndex(3, 9)).toBe(2);
    expect(selectedPageIndex(3, -3)).toBe(0);
  });
});

describe('v203 stepPage 方向翻页 + resolveRestorePage 恢复页', () => {
  it('PAGE_SCROLL_DIRECTION LEFT=-1 / RIGHT=+1（PageScrollActionListener L298-304）', () => {
    expect(PAGE_SCROLL_DIRECTION.LEFT).toBe(-1);
    expect(PAGE_SCROLL_DIRECTION.RIGHT).toBe(1);
    expect(stepPage(0, 3, PAGE_SCROLL_DIRECTION.RIGHT)).toBe(1);
    expect(stepPage(2, 3, PAGE_SCROLL_DIRECTION.LEFT)).toBe(1);
  });

  it('边界钳制：首页向左停首页、末页向右停末页；非法方向 0 步', () => {
    expect(stepPage(0, 3, PAGE_SCROLL_DIRECTION.LEFT)).toBe(0);
    expect(stepPage(2, 3, PAGE_SCROLL_DIRECTION.RIGHT)).toBe(2);
    expect(stepPage(1, 3, 0)).toBe(1);
    expect(stepPage(99, 3, PAGE_SCROLL_DIRECTION.RIGHT)).toBe(2); // 越界 current 先钳制
  });

  it('resolveRestorePage：undefined/非数值 → 0；负 → 0；越界 → 末页；正常值保留', () => {
    expect(resolveRestorePage(undefined, 3)).toBe(0);
    expect(resolveRestorePage(NaN, 3)).toBe(0);
    expect(resolveRestorePage(-2, 3)).toBe(0);
    expect(resolveRestorePage(9, 3)).toBe(2);
    expect(resolveRestorePage(1.9, 3)).toBe(1); // floor 语义
    expect(resolveRestorePage(2, 3)).toBe(2);
    expect(resolveRestorePage(0, 1)).toBe(0);
  });
});

describe('v203 接线锚：quick-settings.js 分页渲染与联动', () => {
  it('import 面五件套（容量/重分配/浮点/方向/恢复页）', () => {
    expect(QS).toContain("from './aosp/qs-paged-layout.js'");
    for (const name of ['QS_PAGE_COLUMNS', 'QS_PAGE_ROWS', 'distributeTiles', 'pageIndicatorState', 'stepPage', 'resolveRestorePage', 'PAGE_SCROLL_DIRECTION']) {
      expect(QS).toContain(name);
    }
  });

  it('renderQuickSettingsGrid 走 distributeTiles：4×2 容量 + tileWeight 宽磁贴 2 格', () => {
    expect(QS).toContain('distributeTiles(activeTiles');
    expect(QS).toContain('columns: QS_PAGE_COLUMNS');
    expect(QS).toContain('rows: QS_PAGE_ROWS');
    expect(QS).toMatch(/tileWeight[^;]*QS_TILE_SIZES\.WIDE[^;]*\? 2 : 1/);
  });

  it('页 DOM：.qs-page 保留 .qs-tiles-grid 类（tile-bounce :scope 直接子级零破坏）+ pageTiles 计数', () => {
    expect(QS).toContain("className = 'qs-page qs-tiles-grid'");
    expect(QS).toContain('dataset.pageTiles');
    expect(QS).toContain('tilePage.get(tile)');
    // tile-bounce rowNeighbors 依赖 pill.parentElement + :scope > .qs-tile-pill（同页同语义）
    expect(BOUNCE).toContain(':scope > .qs-tile-pill');
  });

  it('页指示器：qs-page-dot 动态圆点 + 点击 scrollTo 翻页 + role=tab 无障碍', () => {
    expect(QS).toContain("qs-page-dot");
    expect(QS).toMatch(/scrollTo\(\{ left: pi \* vp\.clientWidth, behavior: 'smooth' \}\)/);
    expect(QS).toContain("setAttribute('role', 'tab')");
  });

  it('scroll 浮点联动：pageIndicatorState 消费 + onPageSelected 四舍五入 + --dot-alpha 两点插值', () => {
    expect(QS).toContain('pageIndicatorState(numPages, vp.scrollLeft / pageW)');
    expect(QS).toContain('Math.round(st.position)');
    expect(QS).toContain('--dot-alpha');
    expect(QS).toContain('st.index1');
    expect(QS).toContain('st.index2');
  });

  it('键盘 LEFT/RIGHT → stepPage 方向翻页（PageScrollActionListener 通道）', () => {
    expect(QS).toMatch(/ArrowLeft/);
    expect(QS).toMatch(/ArrowRight/);
    expect(QS).toMatch(/stepPage\(/);
    expect(QS).toContain('PAGE_SCROLL_DIRECTION.LEFT');
    expect(QS).toContain('PAGE_SCROLL_DIRECTION.RIGHT');
  });

  it('syncQsPagedViewport 导出 + openPullPanel 动态 import 展开恢复（mPageToRestore 落位）', () => {
    expect(QS).toContain('export function syncQsPagedViewport');
    expect(QS).toContain('resolveRestorePage(qsRestorePage');
    expect(GESTURE).toMatch(/openPullPanel[\s\S]*syncQsPagedViewport/);
    expect(GESTURE).toContain("import('./quick-settings.js')");
  });

  it('调试钩子 __qsPageState 零 import 惯例（同 __monetReroll）', () => {
    expect(QS).toContain('window.__qsPageState');
    expect(QS).toMatch(/pageCount: vp\.children\.length/);
    expect(QS).toMatch(/dots: indicator\.children\.length/);
  });

  it('QQS 双份渲染与磁贴编辑器既有链零触碰（范围纪律）', () => {
    expect(QS).toContain('qqsContainer.appendChild(clone)');
    expect(QS).toContain('qqsTiles.includes(tile)');
    expect(QS).toContain('applyTileOrder'); // v9.74 拖拽重排链路零触碰
    expect(QS).toContain('getTileViewColors'); // v10.20 #202 五通道消费零触碰
  });
});

describe('v203 结构锚：index.html 与 CSS', () => {
  it('index.html 分页视口 + 指示器容器（#qsTilesContainer 升级 ViewPager 语义）', () => {
    expect(HTML).toContain('class="qs-paged-viewport" id="qsTilesContainer"');
    expect(HTML).toContain('id="qsPageIndicator"');
  });

  it('CSS 三层：viewport scroll-snap / .qs-page flex 页 / .qs-page-dot 圆点', () => {
    expect(CSS).toMatch(/\.qs-paged-viewport \{[^}]*scroll-snap-type: x mandatory/);
    expect(CSS).toMatch(/\.qs-page \{[^}]*flex: 0 0 100%/);
    expect(CSS).toMatch(/\.qs-page \{[^}]*scroll-snap-align: start/);
    expect(CSS).toMatch(/\.qs-page-dot \{[^}]*--dot-alpha/);
    expect(CSS).toMatch(/\.qs-page-dot\.active \{[^}]*width: 18px/);
  });

  it('CSS 零裸色：分页新增段全 --md-* 令牌（v817 纪律，颜色仅 var() 形态）', () => {
    // 从首个样式定义起扫（R77 坑在录：段头注释含 #203 议题号字面会被 hex 正则误伤）
    const seg = CSS.slice(CSS.indexOf('.qs-paged-viewport {'));
    const colorUses = seg.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) || [];
    expect(colorUses).toHaveLength(0);
    expect(seg).toContain('var(--md-primary)');
    expect(seg).toContain('var(--md-on-surface-variant)');
  });

  it('纯逻辑层纪律：零 DOM / 零 window 调用 / 零随机源（aosp 区硬规，字面仅注内提及）', () => {
    // 剥注释后扫代码体（文件头策略注释含零 DOM 字样，R77 同款扫法修正）
    const code = LAYOUT_JS.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toContain('document.');
    expect(code).not.toContain('window.');
    expect(code).not.toContain('Math.random');
  });
});
