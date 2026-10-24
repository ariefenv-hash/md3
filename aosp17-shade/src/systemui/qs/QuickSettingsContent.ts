/**
 * qs/QuickSettingsContent.ts — QS 浮层面板内容
 * 移植自 QuickSettingsShade / QuickSettingsContainerViewModel 组成：
 *   toolbar（顶部右侧 编辑/设置/电源） + TileGrid + BrightnessSlider + 媒体卡
 * 面板内边距 = overlay_qs_layout_horizontal/vertical_padding = 16dp
 *
 * squish 链路（ShadeSceneContentViewModel.kt L199-203 / QSFragmentComposeViewModel）：
 *   面板 expansion → constrainSquishiness() = (0.1 + x*0.9).coerceIn(0,1)
 *   → TileSquishinessInteractor → InfiniteGridLayout/QuickQuickSettings 逐 Tile
 *     verticalSquish；split shade 下媒体卡同值（shouldApplySquishinessToMedia）。
 *   亮度滑条/工具栏不参与 squish（源码仅磁贴与媒体）。
 */
import { div } from '../util/SysUI';
import { TileGrid } from './TileGrid';
import { BrightnessSlider } from './BrightnessSlider';
import { FooterActions } from './FooterActions';
import { TilesState } from './TilesState';
import { OVERLAY_QS_LAYOUT_HORIZONTAL_PADDING as PAD_H, OVERLAY_QS_LAYOUT_VERTICAL_PADDING as PAD_V } from '../../res/values/dimens';
import { MediaCarousel } from '../media/MediaCarousel';
import { ShadeModeState } from '../../res/values/config';

export class QuickSettingsContent {
  readonly root: HTMLDivElement;
  private grid: TileGrid;
  private quickRow: TileGrid;
  private gridWrap: HTMLDivElement;
  private quickWrap: HTMLDivElement;
  private footer!: FooterActions;
  private brightness!: BrightnessSlider;
  private media!: MediaCarousel;
  private mediaWrap!: HTMLDivElement;
  private mediaNaturalH = 0;

  constructor(
    tiles: TilesState,
    media: MediaCarousel,
    hooks: { onEdit?: () => void; onSettings?: () => void; onPower?: () => void; onDark?: (d: boolean) => void },
  ) {
    this.root = div('qs_content');
    this.root.style.padding = `${PAD_V}px ${PAD_H}px`;
    this.root.style.display = 'flex';
    this.root.style.flexDirection = 'column';
    this.root.style.gap = '14px';

    // 顶部 toolbar（M3E：编辑/设置/电源 位于面板顶部）
    const toolbar = div('qs_toolbar');
    this.footer = new FooterActions(hooks.onEdit, hooks.onSettings, hooks.onPower);
    toolbar.style.display = 'flex';
    toolbar.style.justifyContent = 'flex-end';
    toolbar.append(this.footer.root);

    // 完整网格（4 列，大磁贴跨 2）
    this.gridWrap = div('qs_full_grid');
    this.grid = new TileGrid(tiles, { iconOnly: false });
    this.gridWrap.append(this.grid.root);

    // QQS 行（单模式折叠态）
    this.quickWrap = div('qs_quick_row');
    this.quickRow = TileGrid.quickRow(tiles);
    this.quickWrap.append(this.quickRow.root);

    const brightness = new BrightnessSlider();
    this.brightness = brightness;
    this.media = media;
    this.mediaWrap = div('qs_media_wrap');
    this.mediaWrap.append(this.media.root);

    this.root.append(toolbar, this.quickWrap, this.gridWrap, brightness.root, this.mediaWrap);
    // 内容子项不参与 flex 收缩：源码中 QS 内容按全尺寸测量、由面板 bounds 裁切
    // （setExpandedHeightInternal → clipChildren）；否则部分展开时 flex-shrink 会把
    // 底部磁贴/亮度/媒体压扁而非"露出多少裁多少"的源码行为。
    for (const child of Array.from(this.root.children)) {
      (child as HTMLElement).style.flexShrink = '0';
    }
    this.setCompact(false);
  }

  /** compact = 单模式折叠态（只显示 QQS 行）；false = 全网格 */
  setCompact(compact: boolean) {
    this.quickWrap.style.display = compact ? '' : 'none';
    this.gridWrap.style.display = compact ? 'none' : '';
  }

  refreshTheme() {
    this.grid.render();
    this.quickRow.render();
    this.brightness.render();
    this.footer.refreshTheme();
    this.media.refreshTheme();
    this.mediaNaturalH = 0; // 主题刷新后重测
  }

  /** verticalSquish 等价：布局高度 ×s，内容全尺寸垂直居中、overflow 裁切（SquishTile.kt） */
  private setMediaSquish(s: number) {
    const wrap = this.mediaWrap;
    if (s >= 0.999) {
      wrap.style.height = '';
      wrap.style.overflow = '';
      wrap.style.display = '';
      wrap.style.alignItems = '';
      this.mediaNaturalH = 0;
      return;
    }
    if (!this.mediaNaturalH) {
      this.mediaNaturalH = this.media.root.offsetHeight || this.media.root.scrollHeight || 0;
    }
    if (!this.mediaNaturalH) return;
    wrap.style.height = `${Math.round(this.mediaNaturalH * s)}px`;
    wrap.style.overflow = 'hidden';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
  }

  /** 面板 expansion → squishiness（ShadeSceneContentViewModel.constrainSquishiness） */
  onPanelExpansion(e: number) {
    const squish = (0.1 + e * 0.9) as number;
    this.grid.setSquishiness(squish);
    this.quickRow.setSquishiness(squish);
    // shouldApplySquishinessToMedia = isInSplitShade && SHADE（单模式不施加）
    this.setMediaSquish(ShadeModeState.current === 'Dual' ? squish : 1);
  }

  onQsPhase(phase: number) {
    this.setCompact(phase < 0.5);
  }
}
