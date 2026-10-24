/**
 * shade/ShadeHeader.ts — 移植自 res/layout/combined_qs_header.xml
 *   结构：clock(左侧时间) / date / carrier_group / shade_header_system_icons(statusIcons) /
 *   privacy_container（隐私 chip）
 * 在通知面板顶部显示：日期 + 电池百分比 + 状态图标 + 隐私 chip
 */
import { div } from '../util/SysUI';
import { Theme } from '../../res/values/colors';

export class ShadeHeader {
  readonly root: HTMLDivElement;
  private dateEl: HTMLDivElement;
  private batteryEl: HTMLDivElement;
  private privacyEl: HTMLDivElement;
  private privacyVisible = false;

  constructor() {
    this.root = div('shade_header');
    this.dateEl = div('shade_header_date');
    this.batteryEl = div('shade_header_battery');
    this.privacyEl = div('shade_header_privacy');
    this.privacyEl.style.display = 'none';
    this.root.append(this.dateEl, this.batteryEl, this.privacyEl);
    this.render();
  }

  setNow() {
    this.render();
  }

  showPrivacy(visible: boolean, texts: string[] = ['相机', '麦克风']) {
    this.privacyVisible = visible;
    this.privacyEl.innerHTML = '';
    if (visible) {
      const chip = div('privacy_chip');
      chip.textContent = texts.join('、') + '正在使用';
      this.privacyEl.append(chip);
    }
    this.render();
  }

  render() {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    });
    const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    this.dateEl.textContent = `${fmt.format(now)} ${time.format(now)}`;
    this.batteryEl.textContent = '72%';
    this.privacyEl.style.display = this.privacyVisible ? '' : 'none';
    const c = Theme.colors;
    this.dateEl.style.color = c.onSurface;
    this.batteryEl.style.color = c.onSurfaceVariant;
  }
}
