/**
 * qs/BrightnessSlider.ts — 移植自
 *  frameworks/base/packages/SystemUI/src/com/android/systemui/brightness/ui/compose/BrightnessSlider.kt
 *  .../brightness/ui/viewmodel/BrightnessSliderViewModel.kt（getIconForPercentage）
 *
 * BrightnessSliderDimensions.Default：
 *   icon 28dp / thumb 52h×4w dp / track 40dp / verticalPadding 6dp / bg corner 24dp /
 *   backgroundFrame 10w×6h dp
 * InternalDimensions：SliderTrackRoundedCorner=12dp、IconPadding=6dp、ThumbTrackGapSize=6dp
 *   trackInsideCornerSize=2dp（轨道与 gap 相接的内圆角）、drawStopIndicator=null
 *
 * 轨道几何（SliderDefaults.Track drawWithContent，r1 实测语义）：
 *   activeTrackEnd   = width×fraction − ThumbTrackGapSize
 *   inactiveTrackStart = activeTrackEnd + 2×ThumbTrackGapSize（thumb 两侧各 6dp gap）
 *   图标画在轨内（DrawScope）：
 *   - 不活跃区放得下 → 锚在轨道右端（x = W − IconPadding − 28），inactiveTick 色
 *   - 否则活跃区放得下 → 锚在 thumb 左侧（x = activeTrackEnd − IconPadding − 28），activeTick 色
 *   - 双色交叉淡入淡出：appear tween(100ms, delay 33ms) / disappear tween(50ms)
 * 三档图标（getIconForPercentage）：percentage ≤ 20 → low；≥ 80 → full；其余 → mid
 * M3 Slider 颜色：active track=primary、thumb=primary、inactive track=surfaceContainerHighest、
 *   activeTick=onPrimary、inactiveTick=onSurfaceVariant
 */
import { div, renderIcon, clamp } from '../util/SysUI';
import { ICONS } from '../../res/drawable/icons';
import { Theme } from '../../res/values/colors';
import {
  OVERLAY_QS_BRIGHTNESS_TRACK_HEIGHT as TRACK_H,
  OVERLAY_QS_BRIGHTNESS_THUMB_HEIGHT as THUMB_H,
  OVERLAY_QS_BRIGHTNESS_THUMB_WIDTH as THUMB_W,
  OVERLAY_QS_BRIGHTNESS_ICON_SIZE as ICON_SIZE,
  OVERLAY_QS_BRIGHTNESS_CORNER as BG_CORNER,
} from '../../res/values/dimens';

/** InternalDimensions（BrightnessSlider.kt） */
const SLIDER_TRACK_ROUNDED_CORNER = 12;
const ICON_PADDING = 6;
const THUMB_TRACK_GAP = 6;
const TRACK_INSIDE_CORNER = 2;
/** AnimationSpecs（BrightnessSlider.kt） */
const ICON_APPEAR_MS = 100;
const ICON_APPEAR_DELAY_MS = 33;
const ICON_DISAPPEAR_MS = 50;

export class BrightnessSlider {
  readonly root: HTMLDivElement;
  private track!: HTMLDivElement;
  private activeTrack!: HTMLDivElement;
  private inactiveTrack!: HTMLDivElement;
  private thumb!: HTMLDivElement;
  private iconActive!: HTMLDivElement;
  private iconInactive!: HTMLDivElement;
  private value = 0.62; // gamma 归一化
  private showIconActive = true;
  private currentIconKey: string | null = null;

  constructor(private onChange?: (v: number) => void) {
    this.root = div('brightness_slider');
    this.root.style.padding = '6px 0px'; // verticalPadding
    this.build();
    this.bind();
    this.render();
    // 面板开合会改变轨道宽度（DrawScope 的 size 每次布局后可用）→ 重绘图标/轨道几何
    new ResizeObserver(() => this.render()).observe(this.track);
  }

  private build() {
    const c = Theme.colors;
    // sliderBackground：bg = slider bounds 外扩 backgroundFrame(10w×6h)，圆角 24dp
    const frame = div('brightness_frame');
    frame.style.borderRadius = `${BG_CORNER}px`;
    frame.style.padding = `6px 10px`;

    const row = div('brightness_row');
    row.style.height = `${TRACK_H}px`;

    // M3 Slider：track（40dp，圆角 12dp） + 竖条 thumb（4×52dp）
    this.track = div('brightness_track');
    this.track.style.borderRadius = `${SLIDER_TRACK_ROUNDED_CORNER}px`;
    this.track.style.position = 'relative';

    this.activeTrack = div('brightness_track_active');
    this.activeTrack.style.position = 'absolute';
    this.activeTrack.style.left = '0';
    this.activeTrack.style.top = '0';
    this.activeTrack.style.bottom = '0';

    // inactive track：thumb 右侧 6dp gap 起（SliderDefaults.Track 的 inactive 段）
    this.inactiveTrack = div('brightness_track_inactive');
    this.inactiveTrack.style.position = 'absolute';
    this.inactiveTrack.style.top = '0';
    this.inactiveTrack.style.bottom = '0';
    this.inactiveTrack.style.right = '0';

    this.thumb = div('brightness_thumb');
    this.thumb.style.position = 'absolute';
    this.thumb.style.width = `${THUMB_W}px`;
    this.thumb.style.height = `${THUMB_H}px`;
    this.thumb.style.borderRadius = `${THUMB_W / 2}px`;
    this.thumb.style.top = `${(TRACK_H - THUMB_H) / 2}px`; // thumb 高于轨道（52 > 40）

    // 轨内图标（DrawScope trackIcon）：active/inactive 双份交叉淡入淡出
    this.iconActive = div('brightness_icon');
    this.iconActive.style.opacity = '1'; // showIconActive 初始 = true
    this.iconInactive = div('brightness_icon');
    this.iconInactive.style.opacity = '0';

    this.track.append(this.activeTrack, this.inactiveTrack, this.thumb, this.iconActive, this.iconInactive);
    row.append(this.track);
    frame.append(row);
    this.root.append(frame);
  }

  private bind() {
    let dragging = false;
    const move = (clientX: number) => {
      const rect = this.track.getBoundingClientRect();
      const v = clamp((clientX - rect.left) / rect.width, 0, 1);
      this.value = v;
      this.onChange?.(v);
      this.render();
    };
    this.root.addEventListener('pointerdown', (e) => {
      dragging = true;
      this.root.setPointerCapture(e.pointerId);
      move(e.clientX);
    });
    this.root.addEventListener('pointermove', (e) => dragging && move(e.clientX));
    this.root.addEventListener('pointerup', () => (dragging = false));
    this.root.addEventListener('pointercancel', () => (dragging = false));
  }

  /** getIconForPercentage：percentage ≤ 20 → low；≥ 80 → full；其余 → mid */
  private iconKey(): string {
    const pct = this.value * 100;
    return pct <= 20 ? 'ic_brightness_low' : pct >= 80 ? 'ic_brightness_full' : 'ic_brightness_medium';
  }

  /** 轨内图标定位与双色切换（drawWithContent if/else 顺序与源码一致） */
  private layoutIcon(width: number) {
    const c = Theme.colors;
    const frac = this.value;
    const activeEnd = Math.max(0, width * frac - THUMB_TRACK_GAP); // activeTrackEnd
    const inactiveStart = activeEnd + THUMB_TRACK_GAP * 2; // inactiveTrackStart
    const inactiveWidth = width - inactiveStart;
    const activeWidth = activeEnd;
    const yOffset = (TRACK_H - ICON_SIZE) / 2;
    let showActive: boolean;
    let x: number;
    if (ICON_SIZE < inactiveWidth - ICON_PADDING * 2) {
      showActive = false; // 锚在轨道右端（inactiveTrackEnd）
      x = width - ICON_PADDING - ICON_SIZE;
    } else if (ICON_SIZE < activeWidth - ICON_PADDING * 2) {
      showActive = true; // 锚在 thumb 左侧（activeTrackEnd）
      x = activeEnd - ICON_PADDING - ICON_SIZE;
    } else {
      // 两区都放不下（源码：保持上一次状态，不绘制新位置）
      const keepX = this.showIconActive
        ? activeEnd - ICON_PADDING - ICON_SIZE
        : width - ICON_PADDING - ICON_SIZE;
      this.positionIcon(this.iconActive, keepX, yOffset);
      this.positionIcon(this.iconInactive, keepX, yOffset);
      return;
    }
    // 交叉淡入淡出（IconAppearSpec/IconDisappearSpec）
    if (showActive !== this.showIconActive) {
      this.showIconActive = showActive;
      this.iconActive.animate(
        [{ opacity: this.iconActive.style.opacity || '1' }, { opacity: showActive ? '1' : '0' }],
        showActive
          ? { duration: ICON_APPEAR_MS, delay: ICON_APPEAR_DELAY_MS, fill: 'forwards' }
          : { duration: ICON_DISAPPEAR_MS, fill: 'forwards' },
      );
      this.iconInactive.animate(
        [{ opacity: this.iconInactive.style.opacity || '0' }, { opacity: showActive ? '0' : '1' }],
        showActive
          ? { duration: ICON_DISAPPEAR_MS, fill: 'forwards' }
          : { duration: ICON_APPEAR_MS, delay: ICON_APPEAR_DELAY_MS, fill: 'forwards' },
      );
    }
    const cx = showActive ? activeEnd : width; // 源码锚点：activeTrackEnd / inactiveTrackEnd
    this.positionIcon(this.iconActive, cx - ICON_PADDING - ICON_SIZE, yOffset);
    this.positionIcon(this.iconInactive, cx - ICON_PADDING - ICON_SIZE, yOffset);
    this.iconActive.style.color = c.onPrimary; // activeTickColor
    this.iconInactive.style.color = c.onSurfaceVariant; // inactiveTickColor
  }

  private positionIcon(el: HTMLDivElement, x: number, y: number) {
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y)}px`;
  }

  render() {
    const c = Theme.colors;
    const frame = this.root.querySelector('.brightness_frame') as HTMLElement;
    if (frame) frame.style.background = c.surfaceContainer; // ContainerColors.defaultContainerColor
    this.track.style.background = c.surfaceContainerHighest; // inactiveTrackColor
    this.activeTrack.style.background = c.primary;
    this.inactiveTrack.style.background = c.surfaceContainerHighest;
    this.thumb.style.background = c.primary;
    const width = this.track.clientWidth || this.track.getBoundingClientRect().width;
    if (width < 2) return; // 面板未布局（隐藏/首帧）：等 ResizeObserver 触发
    const pct = `${this.value * 100}%`;
    // active 段：[0, frac×W − 6]；inactive 段：[frac×W + 6, W]
    this.activeTrack.style.width = `${Math.max(0, width * this.value - THUMB_TRACK_GAP)}px`;
    this.activeTrack.style.borderRadius = `${SLIDER_TRACK_ROUNDED_CORNER}px ${TRACK_INSIDE_CORNER}px ${TRACK_INSIDE_CORNER}px ${SLIDER_TRACK_ROUNDED_CORNER}px`;
    this.inactiveTrack.style.left = `${Math.min(width, width * this.value + THUMB_TRACK_GAP)}px`;
    this.inactiveTrack.style.borderRadius = `${TRACK_INSIDE_CORNER}px ${SLIDER_TRACK_ROUNDED_CORNER}px ${SLIDER_TRACK_ROUNDED_CORNER}px ${TRACK_INSIDE_CORNER}px`;
    this.thumb.style.left = `calc(${pct} - ${THUMB_W / 2}px)`;
    this.layoutIcon(width);
    // level-list 三档图标（getIconForPercentage）
    const key = this.iconKey();
    if (!this.currentIconKey || this.currentIconKey !== key) {
      this.currentIconKey = key;
      const def = ICONS[key];
      const svgA = renderIcon(def, ICON_SIZE);
      const svgI = renderIcon(def, ICON_SIZE);
      this.iconActive.innerHTML = '';
      this.iconInactive.innerHTML = '';
      this.iconActive.append(svgA);
      this.iconInactive.append(svgI);
    }
  }
}

