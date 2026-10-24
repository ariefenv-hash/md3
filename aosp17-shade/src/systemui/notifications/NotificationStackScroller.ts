/**
 * notifications/NotificationStackScroller.ts — 移植自
 *  .../res/layout/notification_stack_scroll_layout.xml + status_bar_no_notifications.xml
 *  .../stack/NotificationStackScrollLayout.java（节/滚动/空态）
 *  Android 17 空态文案："You're all caught up"（奖杯图形，9to5google 证实）+
 *  DND 时空态由 EmptyShadeView 承载
 *
 * Single 模式面板内容 = ShadeHeader + QQS 行 + 通知列表 + 媒体卡（手风琴二段由外部控制）
 */
import { div } from '../util/SysUI';
import { ExpandableNotificationRow } from './ExpandableNotificationRow';
import { NotifModel } from './RowTemplates';
import { Theme } from '../../res/values/colors';

export class NotificationsContent {
  readonly root: HTMLDivElement;
  private headerEl: HTMLElement;
  private quickRowEl: HTMLElement;
  private listEl: HTMLDivElement;
  private emptyEl: HTMLElement;
  private rows: ExpandableNotificationRow[] = [];

  constructor(
    private models: NotifModel[],
    header: HTMLElement,
    quickRow: HTMLElement,
    private onRowsChanged?: (n: number) => void,
  ) {
    this.root = div('notifications_content');
    this.headerEl = header;
    this.quickRowEl = quickRow;

    this.listEl = div('notif_stack');
    this.emptyEl = this.buildEmpty();
    this.rebuild();
  }

  /** status_bar_no_notifications.xml → "全部已读" 奖杯空态 */
  private buildEmpty(): HTMLElement {
    const c = Theme.colors;
    const w = div('notif_empty');
    const trophy = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    trophy.setAttribute('viewBox', '0 0 24 24');
    trophy.setAttribute('width', '28');
    trophy.setAttribute('height', '28');
    trophy.innerHTML =
      '<path fill="currentColor" d="M5 4h14v2h3v3c0 2.2-1.8 4-4 4h-.3A6 6 0 0 1 13 16.9V19h3v2H8v-2h3v-2.1A6 6 0 0 1 6.3 13H6c-2.2 0-4-1.8-4-4V6h3V4zm0 4H4v1c0 1.1.9 2 2 2V8zm15 1V8h-1v3c1.1 0 2-.9 2-2V8h-1z" transform="translate(0,1) scale(0.9)"/>';
    const label = div('notif_empty_label');
    label.textContent = '全部已读';
    label.style.color = c.onSurfaceVariant;
    w.append(trophy, label);
    return w;
  }

  rebuild() {
    this.root.innerHTML = '';
    this.rows = [];
    this.root.append(this.headerEl);
    // Single 模式：QQS 行位于头部下方（QuickQuickSettings）
    this.root.append(this.quickRowEl);

    this.root.append(this.listEl);
    for (const m of this.models) {
      const row = new ExpandableNotificationRow(
        m,
        (r) => this.dismiss(r),
        () => void 0,
      );
      this.rows.push(row);
      this.listEl.append(row.root);
    }

    // 底部：清除全部（NotificationSectionsManager 清除区）
    const clear = div('notif_clear_all');
    clear.textContent = '清除全部';
    clear.addEventListener('click', () => {
      [...this.rows].forEach((r) => this.dismiss(r, true));
    });
    this.root.append(clear);
    this.root.append(this.emptyEl);
    this.updateEmpty();
  }

  private dismiss(r: ExpandableNotificationRow, instant = false) {
    const i = this.rows.indexOf(r);
    if (i >= 0) this.rows.splice(i, 1);
    r.root.remove();
    if (instant) {
      r.root.style.height = '0';
      r.root.style.margin = '0';
      r.root.style.opacity = '0';
    }
    this.updateEmpty();
    this.onRowsChanged?.(this.rows.length);
  }

  private updateEmpty() {
    const empty = this.rows.length === 0;
    this.emptyEl.style.display = empty ? '' : 'none';
    (this.listEl.querySelector('.notif_clear_all') as HTMLElement)?.remove();
    void 0;
  }

  /** 头部 QQS 行 squish 注入（main.ts 接线 QuickQuickSettings 同源） */
  onQuickRowSquish?: (s: number) => void;

  onPanelExpansion(e: number) {
    // 头部 QQS 行与 QS 网格同源（QuickQuickSettings L48：同一 squishiness）
    this.onQuickRowSquish?.((0.1 + e * 0.9) as number);
  }

  /** Single 模式：phase>0.5 时通知列表下沉（QS 网格占位），视觉上手风琴 */
  onQsPhase(phase: number) {
    this.listEl.style.opacity = String(Math.max(0, 1 - phase * 1.4));
    this.listEl.style.transform = `translateY(${phase * -12}px)`;
    this.quickRowEl.style.opacity = String(Math.max(0, 1 - phase * 1.6));
  }

  /** Dual 模式下通知面板不包含 QQS 行（QQS 属于合并面板） */
  setQuickRowVisible(visible: boolean) {
    this.quickRowEl.style.display = visible ? '' : 'none';
  }
}
