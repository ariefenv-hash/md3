/**
 * statusbar/PhoneStatusBarView.ts — 移植自
 *  frameworks/base/packages/SystemUI/res/layout/status_bar.xml
 *  frameworks/base/packages/SystemUI/src/com/android/systemui/statusbar/phone/PhoneStatusBarViewController.kt
 *
 * 结构（status_bar.xml）：
 *  - right_container：status_bar_subtitle? clock 不在右侧…
 *  实际 17 布局：start = status_bar_title(clock) / end = statusIcons（网络组、电池、隐私 chip）
 */
import { div, renderIcon } from '../util/SysUI';
import { ICONS } from '../../res/drawable/icons';
import { STATUS_BAR_HEIGHT } from '../../res/values/dimens';

export interface StatusBarState {
  time: string;
  batteryLevel: number;
  charging: boolean;
  wifi: boolean;
  cell: boolean;
  airplane: boolean;
  dnd: boolean;
  screenRecord: boolean;
  mic: boolean;
  camera: boolean;
  dark: boolean;
}

export class PhoneStatusBarView {
  readonly root: HTMLDivElement;
  private clock: HTMLDivElement;
  private icons: HTMLDivElement;
  private battery: SVGSVGElement;
  private state: StatusBarState;

  constructor(state: StatusBarState) {
    this.state = state;
    this.root = div('status_bar');
    this.root.style.height = `${STATUS_BAR_HEIGHT}px`;

    // <TextView id=clock> — start
    this.clock = div('status_bar_clock');
    // end icons container — statusIcons: privacy chips / wifi group / battery
    this.icons = div('status_bar_icons');

    this.battery = renderIcon(ICONS['battery_unified_frame'], 16);
    this.root.append(this.clock, this.icons);
    this.render();
  }

  setState(patch: Partial<StatusBarState>) {
    Object.assign(this.state, patch);
    this.render();
  }

  private render() {
    const s = this.state;
    this.clock.textContent = s.time;
    this.icons.innerHTML = '';
    // 状态栏图标颜色由壁纸亮度决定（LightBarController）：demo 壁纸为深色 → 白色
    const fg = s.dark ? '#FFFFFF' : '#000000';
    this.root.style.color = fg;

    if (s.screenRecord) {
      this.icons.append(this.chipIcon('qs_screen_record_icon', 'screenrecord'));
    }
    if (s.mic) this.icons.append(this.chipIcon('ic_privacy_mic', 'privacy'));
    if (s.camera) this.icons.append(this.chipIcon('ic_privacy_camera', 'privacy'));
    if (s.dnd) this.icons.append(this.chipIcon('vd_dnd', 'dim'));
    if (s.airplane) {
      this.icons.append(this.chipIcon('stat_sys_airplane_mode', ''));
    } else {
      if (s.cell) this.icons.append(this.chipIcon('ic_cell_on', ''));
      if (s.wifi) this.icons.append(this.chipIcon('vd_wifi', ''));
    }
    this.icons.append(this.batteryIcon());
  }

  private chipIcon(name: string, cls: string): HTMLElement {
    const w = div('status_bar_icon_wrap ' + cls);
    w.append(renderIcon(ICONS[name], 16));
    return w;
  }

  /** BatteryMeterView：battery_unified_frame + 电量填充 + 充电图标 */
  private batteryIcon(): HTMLElement {
    const w = div('status_bar_icon_wrap battery');
    const level = this.state.batteryLevel;
    const fill = div('battery_fill');
    fill.style.width = `${level}%`;
    if (this.state.charging) fill.classList.add('charging');
    const frame = renderIcon(ICONS['battery_unified_frame'], 16);
    w.append(fill, frame);
    return w;
  }
}
