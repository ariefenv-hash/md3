/**
 * qs/Tile.ts — 移植自
 *  frameworks/base/packages/SystemUI/src/com/android/systemui/qs/panels/ui/compose/infinitegrid/Tile.kt
 *  .../infinitegrid/CommonTile.kt（CommonTileDefaults）
 *  .../panels/ui/viewmodel/BounceableTileViewModel.kt（bounce 规格）
 *  compose/core/src/com/android/compose/animation/Bounceable.kt（容器弹性布局语义）
 *  .../infinitegrid/SquishTile.kt（verticalSquish）
 *
 * 视觉规则（全部照搬源码）：
 *  - TileHeight=72dp；iconOnly=SmallTileIconSize(32dp)；large=LargeTileIconSize(28dp)
 *  - 磁贴圆角动画：animateTileShapeAsState = animateDpAsState(spring(NoBouncy, MediumLow))
 *    → tile 24↔50dp、icon 16↔50dp（shade_dimens.xml common_tile_default_*）
 *  - 背景色动画：animateColorAsState(colors.background) = spring(StiffnessMediumLow)
 *  - verticalSquish（SquishTile.kt）：布局高度 × squishiness，内容按全尺寸垂直居中、
 *    由 clip(shape) 裁切 —— 非 transform 缩放；0.1 + 0.9×expansion
 *    （ShadeSceneContentViewModel.constrainSquishiness）
 *  - bounce（BounceableTileViewModel/Bounceable.kt）：
 *    · 容器（可切换磁贴）：宽度 += 2×8dp（水平居中外扩，槽位不变），前邻收缩对齐左、
 *      后邻收缩右移 8dp；spring() 默认（MediumBouncy, StiffnessMedium）
 *    · 内容：icon scale 1→1.1→1（334ms，BounceStartEasing(.05,0,0,1)/BounceEndEasing(1,0,.95,1)）；
 *      大磁贴文本 scale 1→1.06→1，transform-origin 左中（TransformOrigin(0f,.5f)）
 *  - 四态配色：active(primary/onPrimary)、inactive(surfaceEffect1/透明+onSurface)、
 *    unavailable(surface@18%/onSurfaceVariant@38%)
 *  - 双目标大磁贴：仅图标容器着 primary，磁贴底为 surfaceEffect1
 *  - 间距：StartPadding=8, TileEndPadding=12/DualTargetEndPadding=8, ArrangementPadding=6
 */
import { div, renderIcon, clamp } from '../util/SysUI';
import { ICONS } from '../../res/drawable/icons';
import { Theme } from '../../res/values/colors';
import {
  COMMON_TILE_TILE_HEIGHT as TILE_HEIGHT,
  COMMON_TILE_ICON_SIZE as SMALL_ICON,
  COMMON_TILE_LARGE_TILE_ICON_SIZE as LARGE_ICON,
  COMMON_TILE_TOGGLE_TARGET_SIZE as TOGGLE_TARGET,
  COMMON_TILE_START_PADDING as START_PAD,
  COMMON_TILE_ACTIVE_TILE_CORNER_RADIUS as ACTIVE_R,
  COMMON_TILE_INACTIVE_TILE_CORNER_RADIUS as INACTIVE_R,
  COMMON_TILE_ACTIVE_ICON_CORNER_RADIUS as ACTIVE_ICON_R,
  COMMON_TILE_INACTIVE_ICON_CORNER_RADIUS as INACTIVE_ICON_R,
  TILE_END_PADDING, TILE_ARRANGEMENT_PADDING, COMMON_TILE_DUAL_TARGET_END_PADDING as DT_END_PAD,
} from '../../res/values/dimens';
import {
  SpringValue, SpringColor,
  SpringDampingRatioNoBouncy, SpringStiffnessMediumLow,
  SpringDampingRatioMediumBouncy, SpringStiffnessMedium,
} from '../anim/Spring';
import { STATE_ACTIVE, STATE_INACTIVE, STATE_UNAVAILABLE } from './TilesState';
import { RippleHost } from '../anim/RippleHost';

export interface TileViewOptions {
  spec: string;
  icon: string;
  state: () => { state: number; label: string; secondaryLabel?: string; handlesToggleClick: boolean };
  onClick: () => void;
  onToggleClick?: () => void;
  iconOnly?: boolean;
  secondaryClick?: () => void;
}

/** BounceableTileViewModel.BounceSize=8dp；spring() 默认 = MediumBouncy/StiffnessMedium */
const BOUNCE_SIZE = 8;
/** BounceableImpl.MINIMUM_BOUNCE_RATIO：快点回弹前需达到的最小弹跳比 */
const MIN_BOUNCE = BOUNCE_SIZE * 0.75;
const MAX_WAIT = 1000;
/** BounceableTileViewModel：334ms 关键帧（167×2），两段 CubicBezierEasing */
const BOUNCE_MS = 167 * 2;
const BOUNCE_START_EASING = 'cubic-bezier(0.05, 0, 0, 1)'; // BounceStartEasing(.05,0,0,1)
const BOUNCE_END_EASING = 'cubic-bezier(1, 0, 0.95, 1)'; // BounceEndEasing(1,0,.95,1)
const ICON_BOUNCE_SCALE = 1.1;
const TEXT_BOUNCE_SCALE = 1.06;

export class QSTileView {
  readonly root: HTMLDivElement;
  private opts: TileViewOptions;
  private tileEl: HTMLDivElement;
  private iconBox: HTMLDivElement;
  private iconHost: HTMLDivElement;
  private labels: HTMLDivElement;

  /** animateDpAsState(spring(NoBouncy, StiffnessMediumLow)) — tile/icon 圆角 */
  private rSpring: SpringValue;
  private irSpring: SpringValue;
  /** animateColorAsState — 磁贴底色（spring(StiffnessMediumLow) 默认 damping） */
  private bgSpring: SpringColor;
  private iconBgSpring: SpringColor;
  private firstRender = true;
  /** 当前 squishiness（verticalSquish） */
  private squish = 1;
  /** 容器 bounce 弹簧（BounceOnPress：按压起，抬指收；正值=自身外扩，负值未用） */
  private bounceW = new SpringValue(0, SpringDampingRatioMediumBouncy, SpringStiffnessMedium, (v) => {
    this.applyBounce(v);
    this.onBounceChange?.(v);
  });
  /** 容器弹性值变化回调（TileGrid 用它同步收缩邻居，与 AOSP 邻居读同一动画值语义一致） */
  onBounceChange?: (b: number) => void;
  /** 按压开始/结束回调（TileGrid 记录当前弹跳者，用于邻居方向判定） */
  onBouncePress?: (pressed: boolean) => void;
  private containerBouncing = false;
  private waitFrame = 0;

  constructor(opts: TileViewOptions) {
    this.opts = opts;
    this.root = div('qs_tile');
    this.root.style.height = `${TILE_HEIGHT}px`;
    // 槽位稳定（Bounceable.kt：layout(idleWidth)）——收缩对齐左，bouncer 以负 margin 外扩
    this.root.style.display = 'flex';
    this.root.style.alignItems = 'center';
    this.root.style.justifyContent = 'flex-start';

    this.tileEl = div('qs_tile_container');
    this.rSpring = new SpringValue(INACTIVE_R, SpringDampingRatioNoBouncy, SpringStiffnessMediumLow, (v) => {
      this.tileEl.style.borderRadius = `${v}px`;
    });
    this.irSpring = new SpringValue(INACTIVE_ICON_R, SpringDampingRatioNoBouncy, SpringStiffnessMediumLow, (v) => {
      this.iconBox.style.borderRadius = `${v}px`;
    });
    this.bgSpring = new SpringColor('#00000000', SpringDampingRatioMediumBouncy, SpringStiffnessMediumLow, (css) => {
      this.tileEl.style.background = css;
    });
    this.iconBgSpring = new SpringColor('#00000000', SpringDampingRatioMediumBouncy, SpringStiffnessMediumLow, (css) => {
      this.iconBox.style.background = css;
    });
    this.tileEl.addEventListener('click', (e) => {
      if (opts.iconOnly && opts.state().handlesToggleClick) {
        opts.onToggleClick?.();
      } else {
        opts.onClick();
      }
      this.bounce();
    });
    // BounceOnPressElement：容器弹性按压驱动（pointerdown 起，pointerup/cancel 收）
    this.tileEl.addEventListener('pointerdown', () => {
      if (this.pressStart()) this.onBouncePress?.(true);
    });
    const release = () => {
      if (this.containerBouncing) {
        this.pressEnd();
        this.onBouncePress?.(false);
      }
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    this.root.append(this.tileEl);

    this.iconBox = div('qs_tile_icon_box'); // ToggleTargetSize 容器
    this.iconBox.addEventListener('click', (e) => {
      // 双目标大磁贴：图标区域独立点击（combinedClickable on icon box）
      if (this.opts.secondaryClick && !this.opts.iconOnly && this.opts.state().handlesToggleClick) {
        e.stopPropagation();
        this.opts.secondaryClick();
      }
    });
    this.iconHost = div('qs_tile_icon_host');
    this.iconBox.append(this.iconHost);

    this.labels = div('qs_tile_labels');

    this.render();
  }

  /** verticalSquish（SquishTile.kt）：布局高度压缩 ×s，内容全尺寸居中、形状裁切 */
  setSquishiness(s: number) {
    const v = clamp(s, 0, 1);
    if (v === this.squish) return;
    this.squish = v;
    this.applySquish();
  }

  private applySquish() {
    const squished = Math.round(TILE_HEIGHT * this.squish);
    this.tileEl.style.height = `${squished}px`;
    // 内容按全尺寸测量后垂直居中（approachLayout：place(0, (squished-expected)/2)）
    this.tileEl.style.overflow = 'hidden';
  }

  /**
   * BounceOnPressElement：按压开始 → animateTo(bounceSize)。
   * 返回该磁贴是否为容器弹性磁贴（grid 需收缩邻居）。
   */
  pressStart(): boolean {
    const s = this.opts.state();
    const iconOnly = !!this.opts.iconOnly;
    const isDualTarget = s.handlesToggleClick;
    const toggleable = s.state === STATE_ACTIVE || s.state === STATE_INACTIVE;
    const bounceContainer = toggleable && (iconOnly || !isDualTarget);
    if (!bounceContainer) return false;
    this.containerBouncing = true;
    this.bounceW.animateTo(BOUNCE_SIZE);
    return true;
  }

  /** 抬指 → animateToRest()：先等 bounce > 0.75×size（快点保底，≤1s），再弹回 */
  pressEnd() {
    if (!this.containerBouncing) return;
    this.containerBouncing = false;
    cancelAnimationFrame(this.waitFrame);
    const goRest = () => this.bounceW.animateTo(0);
    if (this.bounceW.value >= MIN_BOUNCE) {
      goRest();
    } else {
      const t0 = performance.now();
      const wait = () => {
        if (this.containerBouncing) return; // 再次按压
        if (this.bounceW.value >= MIN_BOUNCE || performance.now() - t0 > MAX_WAIT) {
          goRest();
          return;
        }
        this.waitFrame = requestAnimationFrame(wait);
      };
      this.waitFrame = requestAnimationFrame(wait);
    }
  }

  private applyBounce(b: number) {
    if (Math.abs(b) <= 0.05) {
      this.tileEl.style.width = '';
      this.tileEl.style.marginLeft = '';
      this.tileEl.style.zIndex = '';
      return;
    }
    if (b > 0) {
      // 弹跳者：width = idle + 2b 居中外扩，槽位不变（layout(idleWidth)）
      this.tileEl.style.width = `calc(100% + ${2 * b}px)`;
      this.tileEl.style.marginLeft = `${-b}px`;
      this.tileEl.style.zIndex = '1';
    }
  }

  /**
   * 邻居收缩（由 TileGrid 以弹跳者的实时值直接驱动，无独立弹簧）：
   * width = idle − b；prev 对齐左（原地收缩），next 右移 b（placeRelative(+b)）。
   */
  applyNeighbor(b: number, side: 'prev' | 'next' | null) {
    if (Math.abs(b) <= 0.05 || side === null) {
      this.tileEl.style.width = '';
      this.tileEl.style.marginLeft = '';
      return;
    }
    this.tileEl.style.width = `calc(100% - ${b}px)`;
    this.tileEl.style.marginLeft = side === 'next' ? `${b}px` : '';
  }

  /**
   * 点击内容弹性（Tile.kt onClick：非容器弹性磁贴 → animateContentBounce）。
   * 容器弹性磁贴的点击无内容动画（按压已触发容器弹性）。
   */
  bounce(): void {
    const s = this.opts.state();
    const iconOnly = !!this.opts.iconOnly;
    const isDualTarget = s.handlesToggleClick;
    const toggleable = s.state === STATE_ACTIVE || s.state === STATE_INACTIVE;
    const bounceContainer = toggleable && (iconOnly || !isDualTarget);
    if (bounceContainer) return;
    // animateContentBounce(iconOnly)
    if (iconOnly) {
      this.iconHost.animate(
        [
          { transform: 'scale(1)', easing: BOUNCE_START_EASING, offset: 0 },
          { transform: `scale(${ICON_BOUNCE_SCALE})`, easing: BOUNCE_END_EASING, offset: 0.5 },
          { transform: 'scale(1)', offset: 1 },
        ],
        { duration: BOUNCE_MS },
      );
    } else {
      this.labels.style.transformOrigin = 'left center'; // TransformOrigin(0f, .5f)
      this.labels.animate(
        [
          { transform: 'scale(1)', easing: BOUNCE_START_EASING, offset: 0 },
          { transform: `scale(${TEXT_BOUNCE_SCALE})`, easing: BOUNCE_END_EASING, offset: 0.5 },
          { transform: 'scale(1)', offset: 1 },
        ],
        { duration: BOUNCE_MS },
      );
    }
  }

  render() {
    const s = this.opts.state();
    const c = Theme.colors;
    const active = s.state === STATE_ACTIVE;
    const unavailable = s.state === STATE_UNAVAILABLE;
    const iconOnly = !!this.opts.iconOnly;
    const dualTargetLarge = s.handlesToggleClick && !iconOnly;

    // ===== TileDefaults.getColorForState =====
    let bg = 'transparent';
    let iconBg = 'transparent';
    let fg = c.onSurface;
    let labelFg = c.onSurface;
    if (unavailable) {
      bg = hexToRgba(c.surface, 0.18);
      iconBg = bg;
      fg = hexToRgba(c.onSurfaceVariant, 0.38);
      labelFg = fg;
    } else if (active) {
      if (dualTargetLarge) {
        bg = c.effect1; // surfaceEffect1
        iconBg = c.primary;
        fg = c.onPrimary;
        labelFg = c.onSurface;
      } else {
        bg = c.primary;
        fg = c.onPrimary;
        labelFg = c.onPrimary;
      }
    } else {
      if (dualTargetLarge) {
        bg = c.effect1;
        iconBg = c.effect2; // surfaceEffect2
      } else {
        bg = c.effect1;
        iconBg = 'transparent';
      }
    }

    // 形状动画目标：tileRadius / iconRadius（animateTileShapeAsState/animateIconShapeAsState）
    const tileR = active ? ACTIVE_R : INACTIVE_R;
    const iconR = active ? ACTIVE_ICON_R : INACTIVE_ICON_R;

    // 表达性涟漪：M3 ripple 色 = onSurface/onPrimary 12%，随状态换色（RippleDrawable tint）
    RippleHost.attach(this.tileEl, {
      color: unavailable
        ? hexToRgba(c.onSurfaceVariant, 0.12)
        : active
          ? hexToRgba(c.onPrimary, 0.12)
          : hexToRgba(c.onSurface, 0.12),
    });

    // 布局
    this.tileEl.innerHTML = '';
    const iconSize = iconOnly ? SMALL_ICON : LARGE_ICON;
    this.iconBox.style.width = `${iconOnly ? TILE_HEIGHT : TOGGLE_TARGET}px`;
    this.iconBox.style.height = `${iconOnly ? TILE_HEIGHT : TOGGLE_TARGET}px`;
    this.iconBox.style.flexShrink = '0';
    this.iconHost.innerHTML = '';
    this.iconHost.style.width = `${iconSize}px`;
    this.iconHost.style.height = `${iconSize}px`;
    this.iconHost.style.color = fg;
    this.iconHost.append(renderIcon(ICONS[this.opts.icon], iconSize));
    this.tileEl.append(this.iconBox);

    if (!iconOnly) {
      // LargeTileContent：icon + labels + sideDrawable，spacedBy(6dp)
      const label = div('qs_tile_label');
      label.textContent = s.label;
      label.style.color = labelFg;
      this.labels.innerHTML = '';
      this.labels.append(label);
      if (s.secondaryLabel) {
        const sub = div('qs_tile_secondary_label');
        sub.textContent = s.secondaryLabel;
        sub.style.color = unavailable ? labelFg : c.onSurfaceVariant;
        this.labels.append(sub);
      }
      this.labels.style.flex = '1';
      this.labels.style.minWidth = '0';
      this.tileEl.append(this.labels);

      // 双目标：图标区域独立点击（combinedClickable on icon box）——构造期一次性挂载由
      // 本方法内 iconBox 首建时完成，此处仅置样式避免监听器重复叠加
      if (dualTargetLarge && this.opts.secondaryClick) {
        this.iconBox.style.cursor = 'pointer';
      }

      const padEnd = dualTargetLarge ? DT_END_PAD : TILE_END_PADDING;
      this.tileEl.style.paddingLeft = `${START_PAD}px`;
      this.tileEl.style.paddingRight = `${padEnd}px`;
      this.tileEl.style.gap = `${TILE_ARRANGEMENT_PADDING}px`;
    }
    this.tileEl.style.display = 'flex';
    this.tileEl.style.alignItems = 'center';
    if (iconOnly) {
      this.tileEl.style.justifyContent = 'center';
      this.tileEl.style.cursor = 'pointer';
    }

    // 首帧直接落位（Animatable 首值），后续状态变化走 spring
    const anim = !this.firstRender;
    this.firstRender = false;
    if (anim) {
      this.rSpring.animateTo(tileR);
      this.irSpring.animateTo(iconR);
      this.bgSpring.animateTo(bg);
      this.iconBgSpring.animateTo(iconBg);
    } else {
      this.rSpring.snapTo(tileR);
      this.irSpring.snapTo(iconR);
      this.bgSpring.setImmediate(bg);
      this.iconBgSpring.setImmediate(iconBg);
    }
    this.applySquish();
  }
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgba')) return hex;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${clamp(alpha, 0, 1)})`;
}
