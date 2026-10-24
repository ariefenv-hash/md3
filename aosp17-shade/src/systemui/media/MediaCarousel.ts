/**
 * media/MediaCarousel.ts — 移植自
 *  frameworks/base/packages/SystemUI/src/com/android/systemui/media/controls/ui/view/MediaViewHolder.kt
 *  .../res/layout/media_carousel.xml
 *  .../ui/drawable/SquigglyProgress.kt（播放中进度条为波浪线 → SVG path 动画近似）
 */
import { RippleHost } from '../anim/RippleHost';
import { div, renderIcon } from '../util/SysUI';
import { ICONS } from '../../res/drawable/icons';
import { Theme } from '../../res/values/colors';
import { NOTIF_MEDIA_ACTION_ICON } from '../../res/values/dimens';

export class MediaCarousel {
  readonly root: HTMLDivElement;
  private seekFill: HTMLDivElement;
  private playBtn: HTMLDivElement;
  private playing = true;
  private progress = 0.42;
  private timer: number | null = null;

  constructor() {
    this.root = div('media_card');
    this.applyTheme();

    const art = div('media_art');
    art.style.background = 'linear-gradient(135deg, #5A6BD8, #9D6BD8 55%, #D86B9F)';
    const artIcon = renderIcon(ICONS['ic_expand_less_rounded'], 0);
    artIcon.remove();

    const info = div('media_info');
    const title = div('media_title');
    title.textContent = 'Nightcall';
    const artist = div('media_artist');
    artist.textContent = 'Kavinsky — Outrun';
    info.append(title, artist);

    this.playBtn = div('media_btn media_btn_play');
    this.playBtn.append(renderIcon(ICONS['ic_expand_less_rounded'], 0));
    this.playBtn.innerHTML = '';
    this.setPlayIcon();

    const prev = div('media_btn');
    prev.append(renderIcon(ICONS['ic_expand_less_rounded'], 0));
    prev.innerHTML = '';
    prev.style.opacity = '0.9';
    // prev/next 用 chevron 旋转近似（AOSP 为 ic_media_previous/next，资源库中不存在时降级）
    const prevSvg = renderIcon(ICONS['ic_chevron_forward_expressive'], 20);
    prevSvg.style.transform = 'rotate(180deg)';
    prev.innerHTML = '';
    prev.append(prevSvg);
    const next = div('media_btn');
    next.append(renderIcon(ICONS['ic_chevron_forward_expressive'], 20));

    // 播放/暂停用 M3 图标近似：check_expressive 变体不适合，改用双竖条/三角 path
    this.playBtn.innerHTML = '';
    this.playBtn.append(this.playPauseSvg());

    const seek = div('media_seek');
    this.seekFill = div('media_seek_fill');
    seek.append(this.seekFill);

    const actions = div('media_actions');
    actions.style.height = `${NOTIF_MEDIA_ACTION_ICON}px`;
    actions.append(prev, this.playBtn, next);
    // 表达性涟漪（媒体控制按钮 RippleDrawable）
    for (const b of [prev, this.playBtn, next]) RippleHost.attach(b, { radius: '50%' });

    const textRow = div('media_text_row');
    textRow.append(info);
    const btnRow = div('media_btn_row');
    btnRow.append(actions);

    this.root.append(art, textRow, btnRow, seek);
    this.playBtn.addEventListener('click', () => {
      this.playing = !this.playing;
      this.setPlayIcon();
      this.startTimer();
    });
    this.startTimer();
    this.renderSeek();
  }

  private playPauseSvg(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
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
    const c = Theme.colors;
    this.root.style.background = c.notificationSurfaceEffect0;
  }

  refreshTheme() {
    this.applyTheme();
    this.renderSeek();
  }

  private startTimer() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      if (!this.playing) return;
      this.progress = (this.progress + 0.0015) % 1;
      this.renderSeek();
    }, 120);
  }

  /** SquigglyProgress：播放中为波浪进度条（此处以圆角条 + 流光近似，保持几何一致） */
  private renderSeek() {
    this.seekFill.style.width = `${this.progress * 100}%`;
    this.seekFill.style.background = Theme.colors.primary;
  }
}
