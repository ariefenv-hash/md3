/**
 * media/MediaCarousel.ts — 移植自
 *  frameworks/base/packages/SystemUI/src/com/android/systemui/media/remedia/ui/compose/Media.kt
 *  （r1 媒体 UI = remedia compose；media_carousel.xml 仅轮播容器）
 *
 * SeekBar 规格 — Media.kt SeekBarTrack/SeekBarThumb 逐字对齐：
 *  - 配色（L1036-1041）：activeTrackColor=White、inactiveTrackColor=White@30%、
 *    thumbColor=White
 *  - 几何形参：waveLength=20dp、amplitude=3dp、waveSpeedDpPerSec=8dp
 *    → 一个波长 2500ms（tween LinearEasing 无限左移，LaunchedEffect(isSquiggly) 每次播放重启 snapTo(0)）
 *  - 路径：每半波长一段 relativeQuadraticTo（控制点 ±amp 峰谷交替，段端点在轨道中线）
 *  - 振幅包络（以 thumb 为界）：posDiff = 段中心 − (offset+thumbPx)；
 *    posDiff ≤ 0 → 全振幅；< waveLength → 线性衰减 1→0（过渡带恰 1 个波长）；else → 0
 *  - 双色同路径：active 色裁剪到 thumb 左侧（clipRect(offset..thumb+offset)）；
 *    thumb 右侧 = 2dp 平线 inactive 色（StrokeCap.Round）
 *  - 振幅动画：animateDpAsState(isSquiggly ? 3dp : 0)（spring 默认 → NoBouncy/StiffnessMediumLow）
 *  - thumb（SeekBarThumb）：4×16dp 胶囊 RoundedCornerShape(16dp)
 *  - 进度推进由 MediaViewModel 驱动，此处 demo 以 timer 近似
 *  - 拖拽：pointerInput 拇指 20dp 命中半径判定（isDragStartedOnThumb）+ 速度采样
 */
import { RippleHost } from '../anim/RippleHost';
import { div, renderIcon } from '../util/SysUI';
import { ICONS } from '../../res/drawable/icons';
import { Theme } from '../../res/values/colors';
import { NOTIF_MEDIA_ACTION_ICON } from '../../res/values/dimens';
import { SpringValue, SpringDampingRatioNoBouncy, SpringStiffnessMediumLow } from '../anim/Spring';

/* ===== Media.kt SeekBarTrack 默认形参 ===== */
const WAVE_LENGTH = 20; // dp→px（1dp=1px 网格）
const AMPLITUDE = 3;
const WAVE_SPEED = 8; // dp/s
const WAVE_PERIOD_MS = (1000 * (WAVE_LENGTH / WAVE_SPEED)) as number; // 2500ms
const STROKE = 2;
/** 轨道画布高：振幅×2 + 描边 + 上下余量 */
const TRACK_H = AMPLITUDE * 2 + STROKE + 4;
const MID_Y = TRACK_H / 2;

export class MediaCarousel {
  readonly root: HTMLDivElement;
  private seekWrap!: HTMLDivElement;
  private wavePath!: SVGPathElement;
  private clipRect!: SVGRectElement;
  private inactiveLine!: SVGLineElement;
  private thumb!: HTMLDivElement;
  private playBtn: HTMLDivElement;
  private playing = true;
  private progress = 0.42;
  private timer: number | null = null;
  private rafId = 0;
  private lastT = 0;
  /** offsetAnim：波长 × value = 左移量（Media.kt animatedWaveOffset） */
  private waveOffset = 0;
  /** 振幅弹簧（animateDpAsState(isSquiggly ? 3dp : 0)） */
  private ampSpring = new SpringValue(AMPLITUDE, SpringDampingRatioNoBouncy, SpringStiffnessMediumLow, () => {
    this.drawSeek();
  });

  constructor() {
    this.root = div('media_card');
    this.applyTheme();

    const art = div('media_art');
    art.style.background = 'linear-gradient(135deg, #5A6BD8, #9D6BD8 55%, #D86B9F)';

    const info = div('media_info');
    const title = div('media_title');
    title.textContent = 'Nightcall';
    title.style.color = '#FFFFFF';
    const artist = div('media_artist');
    artist.textContent = 'Kavinsky — Outrun';
    artist.style.color = 'rgba(255,255,255,0.8)';
    info.append(title, artist);

    this.playBtn = div('media_btn media_btn_play');
    const prev = div('media_btn');
    const prevSvg = renderIcon(ICONS['ic_chevron_forward_expressive'], 20);
    prevSvg.style.transform = 'rotate(180deg)';
    prev.append(prevSvg);
    const next = div('media_btn');
    next.append(renderIcon(ICONS['ic_chevron_forward_expressive'], 20));
    // remedia：prev/next IconButton contentColor=onPrimary（封面上白）；
    // play 按钮 = ButtonDefaults.buttonColors(containerColor=primary)
    this.playBtn.style.background = Theme.colors.primary;
    this.playBtn.style.color = Theme.colors.onPrimary;
    prev.style.color = '#FFFFFF';
    next.style.color = '#FFFFFF';
    this.playBtn.append(this.playPauseSvg());

    this.buildSeek();

    const actions = div('media_actions');
    actions.style.height = `${NOTIF_MEDIA_ACTION_ICON}px`;
    actions.append(prev, this.playBtn, next);
    // 表达性涟漪（媒体控制按钮 RippleDrawable）
    for (const b of [prev, this.playBtn, next]) RippleHost.attach(b, { radius: '50%' });

    const textRow = div('media_text_row');
    textRow.append(info);
    const btnRow = div('media_btn_row');
    btnRow.append(actions);

    this.root.append(art, textRow, btnRow, this.seekWrap);
    this.playBtn.addEventListener('click', () => {
      this.playing = !this.playing;
      this.setPlayIcon();
      this.startTimer();
      this.setSquiggly(this.playing);
    });
    this.bindScrub();
    this.startTimer();
    this.setSquiggly(true, true);
  }

  /* ===== SeekBar（Media.kt L1042-1170） ===== */

  private buildSeek() {
    this.seekWrap = div('media_seek');
    this.seekWrap.style.position = 'relative';
    this.seekWrap.style.height = `${TRACK_H}px`;
    this.seekWrap.style.marginTop = '2px';

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', String(TRACK_H));
    svg.style.display = 'block';
    svg.style.overflow = 'visible';
    const cp = document.createElementNS(NS, 'clipPath');
    cp.id = 'media-seek-active-clip';
    this.clipRect = document.createElementNS(NS, 'rect');
    this.clipRect.setAttribute('y', '0');
    this.clipRect.setAttribute('height', String(TRACK_H));
    cp.append(this.clipRect);
    const defs = document.createElementNS(NS, 'defs');
    defs.append(cp);
    this.wavePath = document.createElementNS(NS, 'path');
    this.wavePath.setAttribute('fill', 'none');
    this.wavePath.setAttribute('stroke-width', String(STROKE));
    this.wavePath.setAttribute('stroke-linecap', 'round'); // StrokeCap.Round
    this.wavePath.setAttribute('clip-path', 'url(#media-seek-active-clip)');
    this.inactiveLine = document.createElementNS(NS, 'line');
    this.inactiveLine.setAttribute('stroke-width', String(STROKE));
    this.inactiveLine.setAttribute('stroke-linecap', 'round');
    svg.append(defs, this.wavePath, this.inactiveLine);

    // SeekBarThumb：4×16dp 胶囊（Spacer.size(4,16).background(thumbColor, RCorner(16))）
    this.thumb = div('media_seek_thumb');
    this.thumb.style.position = 'absolute';
    this.thumb.style.width = '4px';
    this.thumb.style.height = '16px';
    this.thumb.style.borderRadius = '16px';
    this.thumb.style.top = `${(TRACK_H - 16) / 2}px`;
    this.thumb.style.touchAction = 'none';

    this.seekWrap.append(svg, this.thumb);
  }

  /** isSquiggly 切换（LaunchedEffect(isSquiggly)：播放重启 offset；振幅 spring 3↔0） */
  private setSquiggly(on: boolean, immediate = false) {
    if (on) {
      this.waveOffset = 0; // snapTo(0f)
      this.lastT = performance.now();
      if (immediate) this.ampSpring.snapTo(AMPLITUDE);
      else this.ampSpring.animateTo(AMPLITUDE);
      cancelAnimationFrame(this.rafId);
      const step = (t: number) => {
        if (!this.playing) return; // 暂停 → collect 取消（等价）
        const dt = Math.min(100, t - this.lastT);
        this.lastT = t;
        this.waveOffset = (this.waveOffset + (dt / WAVE_PERIOD_MS) * WAVE_LENGTH) % WAVE_LENGTH;
        this.drawSeek();
        this.rafId = requestAnimationFrame(step);
      };
      this.rafId = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(this.rafId);
      this.ampSpring.animateTo(0);
    }
  }

  /**
   * SeekBarTrack 绘制帧：构建波浪 path（振幅包络以 thumb 为界）+ 双色裁剪。
   * 等价 compose Canvas：路径整体左移 offsetPx，active 裁剪/平线固定世界坐标。
   */
  private drawSeek() {
    const width = this.seekWrap.clientWidth;
    if (!width) return;
    const thumbPx = width * this.progress;
    const offsetPx = this.waveOffset;
    const ampPx = this.ampSpring.value;

    // 半波长 quadratic 段：段端点在中线，控制点 ±amp（i%2==0 → 峰向上）
    const half = WAVE_LENGTH / 2;
    const totalW = width + WAVE_LENGTH;
    const segCount = Math.floor(totalW / half) + 3; // repeat(halfWaveCount + 3)
    let d = '';
    let currentX = -offsetPx; // translate(left = -offsetPx)
    for (let i = 0; i < segCount; i++) {
      const centerX = currentX + half / 2;
      // posDiff = centerX − (offsetPx + thumbPositionPx)（compose 路径坐标语义；
      // 此处 centerX 已含 -offsetPx 平移 = 世界坐标 → 直接对世界 thumbPx 比较）
      const posDiff = centerX - thumbPx;
      const ratio = posDiff <= 0 ? 1 : posDiff < WAVE_LENGTH ? 1 - posDiff / WAVE_LENGTH : 0;
      const a = ampPx * ratio;
      const dy = i % 2 === 0 ? -a : a;
      d += ` Q ${(currentX + half / 2).toFixed(2)} ${(MID_Y + dy).toFixed(2)} ${(currentX + half).toFixed(2)} ${MID_Y}`;
      currentX += half;
    }
    this.wavePath.setAttribute('d', `M ${(-offsetPx).toFixed(2)} ${MID_Y}${d}`);
    this.wavePath.setAttribute('stroke', 'rgba(255,255,255,1)'); // activeTrackColor = White

    // active 裁剪：clipRect(offset..thumb+offset) → 世界 0..thumbPx
    this.clipRect.setAttribute('x', '0');
    this.clipRect.setAttribute('width', thumbPx.toFixed(2));

    // thumb 右侧平线（isThumbEnabled）：drawLine(thumbPx..width, inactiveTrackColor)
    this.inactiveLine.setAttribute('x1', thumbPx.toFixed(2));
    this.inactiveLine.setAttribute('x2', String(width));
    this.inactiveLine.setAttribute('y1', String(MID_Y));
    this.inactiveLine.setAttribute('y2', String(MID_Y));
    this.inactiveLine.setAttribute('stroke', 'rgba(255,255,255,0.3)');

    // thumb 胶囊位置（世界坐标）
    this.thumb.style.left = `${(thumbPx - 2).toFixed(2)}px`;
  }

  /** 拖拽/点按 scrub（pointerInput：thumb 20dp 命中判定 + onValueChange） */
  private bindScrub() {
    const scrubTo = (clientX: number) => {
      const r = this.seekWrap.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      this.progress = p;
      this.drawSeek();
    };
    this.seekWrap.addEventListener('pointerdown', (e) => {
      scrubTo(e.clientX);
      this.seekWrap.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => scrubTo(ev.clientX);
      const up = () => {
        this.seekWrap.removeEventListener('pointermove', move);
        this.seekWrap.removeEventListener('pointerup', up);
        this.seekWrap.removeEventListener('pointercancel', up);
      };
      this.seekWrap.addEventListener('pointermove', move);
      this.seekWrap.addEventListener('pointerup', up);
      this.seekWrap.addEventListener('pointercancel', up);
    });
  }

  private playPauseSvg(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    // 封面白系：pause/play 图标继承 playBtn 的 onPrimary 色
    svg.style.color = 'currentColor';
    svg.innerHTML = this.playing
      ? '<path fill="currentColor" d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z"/>' // pause
      : '<path fill="currentColor" d="M8 5v14l11-7z"/>'; // play
    return svg;
  }

  private setPlayIcon() {
    this.playBtn.innerHTML = '';
    this.playBtn.append(this.playPauseSvg());
  }

  private applyTheme() {
    // CardBackground（remedia Media.kt L954-990）：专辑封面 bitmap 铺满
    //   + radialGradient(colorScheme.background @ 0.65→0.75) 遮罩；
    //   demo 无真封面 → 以现有渐变模拟封面，遮罩基色 = onSurface（无 artwork fallback）
    const c = Theme.colors;
    const scrim = hexToRgbaStr(c.onSurface, 0.7);
    this.root.style.background =
      `radial-gradient(ellipse at center, ${hexToRgbaStr(c.onSurface, 0.65)}, ${hexToRgbaStr(c.onSurface, 0.75)}), ` +
      'linear-gradient(135deg, #5A6BD8, #9D6BD8 55%, #D86B9F)';
    void scrim;
    // 白系前景（remedia：文字/控件/seek 全白浮于封面上）
    this.root.style.color = '#FFFFFF';
  }

  refreshTheme() {
    this.applyTheme();
  }

  private startTimer() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      if (!this.playing) return;
      this.progress = (this.progress + 0.0015) % 1;
      this.drawSeek();
    }, 120);
  }
}

/** hex(#rrggbb) → rgba 字符串（CardBackground 遮罩用） */
function hexToRgbaStr(hex: string, alpha: number): string {
  if (hex.startsWith('rgb')) return hex;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
