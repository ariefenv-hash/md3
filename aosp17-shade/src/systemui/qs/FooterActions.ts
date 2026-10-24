/**
 * qs/FooterActions.ts — 移植自
 *  frameworks/base/packages/SystemUI/src/com/android/systemui/qs/FooterActionsController.kt
 *  frameworks/base/packages/SystemUI/src/com/android/systemui/qs/footer/ui/viewmodel/FooterActionsViewModel.kt
 *  shade_dimens.xml toolbar_*：button 48dp / colored bg 36dp / icon 24dp / bottom padding 8dp
 *
 * 按压反馈 = 表达性涟漪（RippleHost，pointerdown 即时触发，圆形遮罩），
 * 与真机一致；此前版本的 click 缩放动画非源码行为，已移除。
 */
import { div, renderIcon } from '../util/SysUI';
import { ICONS } from '../../res/drawable/icons';
import {
  TOOLBAR_BUTTON_SIZE as BTN,
  TOOLBAR_BUTTON_COLORED_BG_SIZE as BG,
  TOOLBAR_BUTTON_ICON_SIZE as ICON,
  TOOLBAR_BOTTOM_PADDING,
} from '../../res/values/dimens';
import { Theme } from '../../res/values/colors';
import { RippleHost } from '../anim/RippleHost';

export class FooterActions {
  readonly root: HTMLDivElement;
  private buttons: HTMLDivElement[] = [];

  constructor(onEdit?: () => void, onSettings?: () => void, onPower?: () => void) {
    this.root = div('footer_actions');
    this.root.style.paddingBottom = `${TOOLBAR_BOTTOM_PADDING}px`;

    const mk = (icon: string, label: string, fn?: () => void, coloredBg = false) => {
      const b = div('footer_button');
      b.title = label;
      b.style.width = `${BTN}px`;
      b.style.height = `${BTN}px`;
      const circle = div('footer_button_bg');
      circle.style.width = circle.style.height = `${BG}px`;
      circle.style.borderRadius = '50%';
      circle.style.display = 'flex';
      circle.style.alignItems = 'center';
      circle.style.justifyContent = 'center';
      const svg = renderIcon(ICONS[icon], ICON);
      circle.append(svg);
      b.append(circle);
      // 表达性涟漪（RippleDrawable，圆形边界遮罩）——pointerdown 立即响应
      RippleHost.attach(circle, { radius: '50%' });
      b.addEventListener('click', () => fn?.());
      this.buttons.push(circle);
      if (coloredBg) this.powerCircle = circle;
      return b;
    };

    this.root.append(
      mk('ic_edit', '修改', onEdit),
      mk('ic_settings', '设置', onSettings),
      mk('ic_qs_footer_power', '电源', onPower, true), // power：着色底（M3E toolbar）
    );
    this.refreshTheme();
  }

  private powerCircle: HTMLDivElement | null = null;

  refreshTheme() {
    const c = Theme.colors;
    for (const b of this.buttons) {
      b.style.background = c.surfaceContainerHigh;
      RippleHost.attach(b, { color: hexToRgba(c.onSurface, 0.12), radius: '50%' });
    }
    if (this.powerCircle) {
      this.powerCircle.style.background = c.primary;
      const svg = this.powerCircle.querySelector('svg');
      if (svg) svg.style.color = c.onPrimary;
      RippleHost.attach(this.powerCircle, { color: hexToRgba(c.onPrimary, 0.12), radius: '50%' });
    }
    this.buttons.forEach((b) => {
      const svg = b.querySelector('svg');
      if (svg && b !== this.powerCircle) svg.style.color = c.onSurface;
    });
  }
}

function hexToRgba(hex: string, alpha: number): string {
  if (hex.startsWith('rgba')) return hex;
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
