/**
 * notifications/ExpandableNotificationRow.ts — 移植自
 *  frameworks/base/packages/SystemUI/res/layout/status_bar_notification_row.xml
 *  .../row/ExpandableNotificationRow.java、ActivatableNotificationView.java、NotificationBackgroundView.java
 *
 * 行为：
 *  - 点击展开/收起（NotificationContentView contracted↔expanded 切换）
 *  - 激活态涟漪（notification_ripple_untinted_color #28000000）
 *  - 横滑清除（NotificationSwipeHelper：跟手位移 + 松手判定）
 *  - 圆角连续性由 StackScroller 的 roundness 管理（这里行级 28dp）
 */
import { div, clamp } from '../util/SysUI';
import { buildRowContent, NotifModel } from './RowTemplates';
import { Theme } from '../../res/values/colors';
import { RippleHost } from '../anim/RippleHost';

// notification_ripple_untinted_color 0x28000000（浅色）/
// notification_ripple_tinted_color 0x30ffffff（深色）
const RIPPLE_UNTINTED = 'rgba(0,0,0,0.157)';
const RIPPLE_TINTED = 'rgba(255,255,255,0.188)';

export class ExpandableNotificationRow {
  readonly root: HTMLDivElement;
  private contentWrap: HTMLDivElement;
  private bgEl: HTMLDivElement;
  expanded = false;
  private removing = false;

  constructor(
    public model: NotifModel,
    private onDismiss: (row: ExpandableNotificationRow) => void,
    private onChanged: () => void,
  ) {
    this.root = div('notification_row');
    this.bgEl = div('notification_row_bg');
    this.contentWrap = div('notification_row_content_wrap');
    this.root.append(this.bgEl, this.contentWrap);
    // 表达性涟漪（ActivatableNotificationView 的 RippleDrawable，行边界+28dp 圆角遮罩）
    RippleHost.attach(this.root, {
      color: Theme.dark ? RIPPLE_TINTED : RIPPLE_UNTINTED,
      radius: '28px',
    });
    this.applyTheme();
    this.renderContent();
    this.bindTap();
    this.bindSwipe();
  }

  private applyTheme() {
    const c = Theme.colors;
    this.bgEl.style.background = c.notificationSurfaceEffect0;
    this.root.style.borderRadius = '28px';
  }

  private renderContent() {
    this.contentWrap.innerHTML = '';
    this.contentWrap.append(buildRowContent(this.model, this.expanded));
    // 展开箭头旋转
    const pill = this.contentWrap.querySelector('.notif_expand_pill');
    if (pill) (pill as HTMLElement).style.transform = this.expanded ? 'rotate(180deg)' : '';
  }

  private bindTap() {
    let downX = 0, downY = 0, downT = 0;
    this.root.addEventListener('pointerdown', (e) => {
      downX = e.clientX; downY = e.clientY; downT = performance.now();
      // 涟漪由 RippleHost（pointerdown 捕获）接手，此处不再闪变背景
    });
    this.root.addEventListener('pointerup', (e) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      const dt = performance.now() - downT;
      this.bgEl.style.background = Theme.colors.notificationSurfaceEffect0;
      if (moved < 12 && dt < 600 && !this.removing) {
        this.expanded = !this.expanded;
        this.renderContent();
        this.onChanged();
      }
    });
    this.root.addEventListener('pointerleave', () => {
      this.bgEl.style.background = Theme.colors.notificationSurfaceEffect0;
    });
  }

  /** NotificationSwipeHelper：横滑跟手 → 松手速度/距离判定清除 */
  private bindSwipe() {
    let startX = 0, startY = 0, dx = 0, swiping = false, active = false;
    this.root.addEventListener('pointerdown', (e) => {
      startX = e.clientX; startY = e.clientY; dx = 0; active = true; swiping = false;
    });
    this.root.addEventListener('pointermove', (e) => {
      if (!active) return;
      const mx = e.clientX - startX;
      const my = e.clientY - startY;
      if (!swiping && Math.abs(mx) > 18 && Math.abs(mx) > Math.abs(my)) {
        swiping = true;
        this.root.setPointerCapture(e.pointerId);
      }
      if (swiping) {
        dx = mx;
        // 仅位移 40% 阻尼（SWIPE_ESCAPE_VELOCITY 前的跟手感）
        const eased = dx * 0.9;
        this.root.style.transform = `translateX(${eased}px)`;
        this.root.style.opacity = String(clamp(1 - Math.abs(eased) / 500, 0.2, 1));
      }
    });
    const finish = () => {
      if (!active) return;
      active = false;
      if (!swiping) return;
      const shouldDismiss = Math.abs(dx) > this.root.offsetWidth * 0.42;
      if (shouldDismiss) {
        this.removing = true;
        this.root.style.transition = 'transform 180ms ease-out, opacity 180ms ease-out, height 180ms ease-out, margin 180ms ease-out';
        this.root.style.transform = `translateX(${dx > 0 ? 110 : -110}%)`;
        this.root.style.opacity = '0';
        this.root.style.height = '0px';
        this.root.style.marginBottom = '0px';
        window.setTimeout(() => this.onDismiss(this), 190);
      } else {
        this.root.style.transition = 'transform 220ms cubic-bezier(0.2,0,0,1), opacity 220ms';
        this.root.style.transform = '';
        this.root.style.opacity = '1';
        window.setTimeout(() => (this.root.style.transition = ''), 240);
      }
    };
    this.root.addEventListener('pointerup', finish);
    this.root.addEventListener('pointercancel', finish);
  }

  refreshTheme() {
    this.applyTheme();
    this.renderContent();
  }
}
