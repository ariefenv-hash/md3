/**
 * qs/TileGrid.ts — 移植自
 *  frameworks/base/packages/SystemUI/src/com/android/systemui/qs/panels/ui/compose/infinitegrid/InfiniteGridLayout.kt
 *  .../GridLayout.kt、TileGrid.kt、QuickQuickSettings.kt
 *  .../ui/compose/BounceableInfo.kt（行内邻居判定）
 *
 * 网格规则：
 *  - 基准 4 列（quick_settings_infinite_grid_num_columns=4；dual/split shade 同 4）
 *  - 大磁贴（icon+label）跨 2 列（largeSpan），一排 2 个；图标磁贴跨 1 列
 *  - QQS（QuickQuickSettings）：仅图标磁贴，取默认磁贴前 N 个（1 行 4 个）
 *  - squishiness：InfiniteGridLayout L97 / QuickQuickSettings L48 同源注入
 *    （TileSquishinessInteractor/Repository）
 *  - 容器 bounce 邻居编排：BounceableInfo.previousTile/nextTile（同行判定）
 */
import { div } from '../util/SysUI';
import { QSTileView } from './Tile';
import { TilesState, STATE_ACTIVE } from './TilesState';
import { QUICK_SETTINGS_INFINITE_GRID_NUM_COLUMNS as COLS, LARGE_TILE_SPAN } from '../../res/values/dimens';
import { Theme } from '../../res/values/colors';

export class TileGrid {
  readonly root: HTMLDivElement;
  private grid: HTMLDivElement;
  private views: QSTileView[] = [];
  private span: number;
  /** 当前容器弹跳者（同行邻居由其实时值驱动收缩） */
  private bouncer: { view: QSTileView; index: number } | null = null;

  constructor(
    private tiles: TilesState,
    private opts: { iconOnly: boolean; maxTiles?: number; onDarkToggle?: (dark: boolean) => void },
  ) {
    this.span = opts.iconOnly ? 1 : LARGE_TILE_SPAN;
    this.root = div('qs_tile_grid');
    this.grid = div('qs_tile_grid_inner');
    this.grid.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    this.root.append(this.grid);
    this.rebuild();
    tiles.subscribe(() => this.render());
  }

  private rebuild() {
    this.grid.innerHTML = '';
    this.views = [];
    // StockTilesRepository 顺序
    const all = this.allSpecs();
    const list = this.opts.maxTiles ? all.slice(0, this.opts.maxTiles) : all;
    for (const spec of list) {
      // 完整网格 = LargeTile（icon+label）；仅 QQS 行使用 iconOnly（QuickQuickSettings）
      const iconOnly = this.opts.iconOnly;
      const view = new QSTileView({
        spec,
        icon: this.tiles.iconFor(spec),
        state: () => this.tiles.get(spec),
        iconOnly,
        onClick: () => this.tiles.toggle(spec),
        onToggleClick: () => this.tiles.toggle(spec),
        secondaryClick: () => {
          /* Internet 详情对话框（双目标副目标）——demo 不展开 */
        },
      });
      view.root.style.gridColumn = `span ${iconOnly ? 1 : LARGE_TILE_SPAN}`;
      const index = this.views.length;
      // 容器 bounce 邻居编排（BounceableInfo：同行 previousTile/nextTile）
      view.onBounceChange = (b) => this.onBounceValue(index, b);
      this.views.push(view);
      this.grid.append(view.root);
    }
    this.render();
  }

  /** BounceableInfo 行内判定：colIndex = index×span；同行 = 同一 4 列行 */
  private rowNeighbors(index: number): { prev: number | null; next: number | null } {
    const col = index * this.span;
    const first = col % COLS === 0;
    const last = (col + this.span) % COLS === 0;
    const rowFirst = Math.floor(col / COLS) * this.span;
    const rowLen = COLS / this.span;
    const prev = !first && index - 1 >= rowFirst ? index - 1 : null;
    const next = !last && index + 1 < rowFirst + rowLen ? index + 1 : null;
    return { prev, next };
  }

  private onBounceValue(index: number, b: number) {
    if (b > 0.05) {
      this.bouncer = { view: this.views[index], index };
      const { prev, next } = this.rowNeighbors(index);
      this.views.forEach((v, i) => {
        if (i === index) return;
        if (i === prev) v.applyNeighbor(b, 'prev');
        else if (i === next) v.applyNeighbor(b, 'next');
        else v.applyNeighbor(0, null);
      });
    } else if (this.bouncer && this.bouncer.index === index) {
      this.bouncer = null;
      for (const v of this.views) v.applyNeighbor(0, null);
    }
  }

  /** verticalSquish 注入（InfiniteGridLayout/QuickQuickSettings 同源） */
  setSquishiness(s: number) {
    for (const v of this.views) v.setSquishiness(s);
  }

  private allSpecsCache: string[] = [];
  private allSpecs(): string[] {
    if (!this.allSpecsCache.length) {
      const t = this.tiles as unknown as { states: Map<string, unknown> };
      this.allSpecsCache = [...t.states.keys()];
    }
    return this.allSpecsCache;
  }

  render() {
    const c = Theme.colors;
    this.grid.style.gap = '6px';
    this.grid.style.color = c.onSurface;
    for (const v of this.views) v.render();
  }

  /** QQS 行（QuickQuickSettings.kt）：1 行 4 个图标磁贴 */
  static quickRow(tiles: TilesState, onDarkToggle?: (d: boolean) => void): TileGrid {
    void onDarkToggle;
    return new TileGrid(tiles, { iconOnly: true, maxTiles: 4 });
  }
}

export function isDndActive(tiles: TilesState): boolean {
  return tiles.get('dnd').state === STATE_ACTIVE;
}
