/**
 * notifications/RowTemplates.ts — 移植自 frameworks/base/core/res/res/layout/notification_2025_*
 *   collapsed_base / expanded_base / messaging / media / progress + top_line_views / right_icon /
 *   expand_button
 * 视觉规则：
 *   - 行最小高 72dp（notification_2025_min_height）
 *   - 图标圆 40dp、内边距 8dp（notification_2025_icon_circle_size/padding）
 *   - 内容左缘 72dp（content_margin_start）；右侧留 60dp（content_margin_end）
 *   - 右上大图标 48dp、marginEnd 42dp、marginTop 12dp
 *   - 展开按钮胶囊 26×18dp、图标 16sp
 *   - 文本 14sp / 标题 14sp / 次级 12sp；单行省略 + 横向淡出
 */
import { div } from '../util/SysUI';
import {
  NOTIF_2025_ICON_CIRCLE_SIZE, NOTIF_2025_ICON_CIRCLE_PADDING,
  NOTIF_2025_CONTENT_MARGIN_START, NOTIF_2025_CONTENT_MARGIN_END,
  NOTIF_2025_MIN_HEIGHT, NOTIF_2025_MARGIN, NOTIF_2025_ADDITIONAL_MARGIN,
  NOTIF_2025_EXPAND_BUTTON_PILL_WIDTH, NOTIF_2025_EXPAND_BUTTON_PILL_HEIGHT,
  NOTIF_2025_EXPAND_BUTTON_ICON_SIZE, NOTIF_2025_RIGHT_ICON_MARGIN_END,
  NOTIF_2025_RIGHT_ICON_VERTICAL_MARGIN, NOTIF_2025_MESSAGING_SPACING,
  NOTIF_2025_ACTION_LIST_HEIGHT, NOTIF_2025_ACTION_LIST_MARGIN_BOTTOM, NOTIF_2025_ACTIONS_MARGIN_START,
  NOTIF_2025_FACE_PILE_AVATAR_SIZE,
} from '../../res/values/dimens';
import { Theme } from '../../res/values/colors';

export interface NotifAction {
  title: string;
  icon?: string;
}

export interface NotifMessage {
  sender: string;
  text: string;
  time: string;
  me?: boolean;
}

export interface NotifModel {
  key: string;
  app: string;
  appName: string;
  title: string;
  text: string;
  time: string;
  /** 40dp 圆内显示的字符/图标 */
  smallIconText: string;
  smallIconBg: string;
  /** 右上 48dp 大图标（字符串底） */
  rightIconText?: string;
  rightIconBg?: string;
  /** 联系人头像组（face pile） */
  facePile?: string[];
  expandedText?: string;
  messages?: NotifMessage[];
  actions?: NotifAction[];
  progress?: number;
  ongoing?: boolean;
  /** 媒体模板 */
  media?: { title: string; artist: string; gradient: string };
}

/** notification_2025_expand_button：胶囊 + chevron */
function expandPill(): HTMLElement {
  const pill = div('notif_expand_pill');
  pill.style.minWidth = `${NOTIF_2025_EXPAND_BUTTON_PILL_WIDTH}px`;
  pill.style.minHeight = `${NOTIF_2025_EXPAND_BUTTON_PILL_HEIGHT}px`;
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 16 16');
  icon.setAttribute('width', String(NOTIF_2025_EXPAND_BUTTON_ICON_SIZE));
  icon.setAttribute('height', String(NOTIF_2025_EXPAND_BUTTON_ICON_SIZE));
  icon.innerHTML = '<path fill="currentColor" d="M8 11L3 6l0.7-0.7L8 9.6l4.3-4.3L13 6z"/>';
  pill.append(icon);
  return pill;
}

function appIconCircle(model: NotifModel, size: number): HTMLElement {
  const c = div('notif_icon_circle');
  c.style.width = c.style.height = `${size}px`;
  c.style.padding = `${NOTIF_2025_ICON_CIRCLE_PADDING}px`;
  const inner = div('notif_icon_inner');
  inner.style.background = model.smallIconBg;
  inner.textContent = model.smallIconText;
  c.append(inner);
  return c;
}

/** 顶部行（NotificationTopLineView + top_line_views）：title · appname · time + expand pill */
function topLine(model: NotifModel): HTMLElement {
  const row = div('notif_top_line');
  const title = div('notif_title');
  title.textContent = model.title;
  const dot = div('notif_dot');
  const app = div('notif_app_name');
  app.textContent = model.appName;
  const time = div('notif_time');
  time.textContent = model.time;
  const spacer = div('notif_spacer');
  row.append(title, dot, app, spacer, time, expandPill());
  return row;
}

/** 右上大图标 */
function rightIcon(model: NotifModel): HTMLElement | null {
  if (!model.rightIconText) return null;
  const w = div('notif_right_icon');
  w.style.width = w.style.height = '48px';
  w.style.marginRight = `${NOTIF_2025_RIGHT_ICON_MARGIN_END}px`;
  w.style.marginTop = `${NOTIF_2025_RIGHT_ICON_VERTICAL_MARGIN}px`;
  w.style.background = model.rightIconBg ?? model.smallIconBg;
  w.textContent = model.rightIconText;
  return w;
}

/** 文本行（notification_2025_text） */
function textLine(model: NotifModel, expanded: boolean): HTMLElement {
  const t = div('notif_text');
  t.textContent = expanded ? model.expandedText ?? model.text : model.text;
  return t;
}

/** 动作列表（notification_2025_action_list：48dp 高按钮，左侧 56dp 起始边距） */
function actionList(actions: NotifAction[]): HTMLElement {
  const list = div('notif_actions');
  list.style.minHeight = `${NOTIF_2025_ACTION_LIST_HEIGHT}px`;
  list.style.marginBottom = `${NOTIF_2025_ACTION_LIST_MARGIN_BOTTOM}px`;
  for (const a of actions) {
    const b = div('notif_action');
    b.textContent = a.title;
    list.append(b);
  }
  return list;
}

/** 会话/消息布局（notification_2025_template_collapsed_conversation / expanded_messaging） */
function messagingBody(model: NotifModel, expanded: boolean): HTMLElement {
  const wrap = div('notif_messaging');
  const msgs = (model.messages ?? []).slice(0, expanded ? 99 : 1);
  for (const m of msgs) {
    const line = div('notif_message');
    const avatar = div('notif_message_avatar');
    avatar.textContent = m.sender.slice(0, 1);
    avatar.style.background = m.me ? Theme.colors.primary : '#7C93C4';
    const bubble = div('notif_message_bubble');
    if (!m.me) bubble.style.background = Theme.colors.surfaceContainerHigh;
    const sender = div('notif_message_sender');
    sender.textContent = m.sender;
    void sender;
    bubble.textContent = m.text;
    const time = div('notif_message_time');
    time.textContent = m.time;
    const col = div('notif_message_col');
    col.append(bubble, time);
    line.append(avatar, col);
    wrap.append(line);
  }
  wrap.style.gap = `${NOTIF_2025_MESSAGING_SPACING / 2}px`;
  return wrap;
}

/** face pile（notification_2025_conversation_face_pile_layout：24dp 头像叠加） */
function facePile(model: NotifModel): HTMLElement | null {
  if (!model.facePile?.length) return null;
  const fp = div('notif_face_pile');
  model.facePile.forEach((name, i) => {
    const a = div('notif_face_pile_avatar');
    a.style.width = a.style.height = `${NOTIF_2025_FACE_PILE_AVATAR_SIZE}px`;
    a.style.marginLeft = i === 0 ? '0' : '-8px';
    a.style.background = ['#7C93C4', '#C4A57C', '#7CC49B'][i % 3];
    a.textContent = name.slice(0, 1);
    fp.append(a);
  });
  return fp;
}

/**
 * 组装行内容（NotificationContentView 的 contracted/expanded 两态）
 */
export function buildRowContent(model: NotifModel, expanded: boolean): HTMLElement {
  const content = div('notif_row_content');
  content.style.minHeight = `${NOTIF_2025_MIN_HEIGHT}px`;

  // 左侧 40dp 图标圆
  content.append(appIconCircle(model, NOTIF_2025_ICON_CIRCLE_SIZE));

  // 主体（marginStart 72dp）
  const body = div('notif_row_body');
  body.style.paddingRight = `${NOTIF_2025_CONTENT_MARGIN_END / 3}px`;

  const top = topLine(model);
  body.append(top);

  if (model.media) {
    // 媒体通知（notification_2025_template_expanded_media 简化：标题/艺术家 + 大图）
    const mediaWrap = div('notif_media_inline');
    mediaWrap.style.background = model.media.gradient;
    const t = div('notif_media_title');
    t.textContent = model.media.title;
    const a = div('notif_media_artist');
    a.textContent = model.media.artist;
    mediaWrap.append(t, a);
    body.append(mediaWrap);
  } else if (model.messages) {
    const convo = div('notif_convo_head');
    const fp = facePile(model);
    if (fp) convo.append(fp);
    body.append(convo);
    body.append(messagingBody(model, expanded));
  } else {
    const textWrap = div('notif_text_wrap');
    textWrap.style.marginBottom = `${NOTIF_2025_ADDITIONAL_MARGIN}px`;
    textWrap.append(textLine(model, expanded));
    body.append(textWrap);
    if (model.progress !== undefined) {
      const pb = div('notif_progress');
      const fill = div('notif_progress_fill');
      fill.style.width = `${model.progress * 100}%`;
      pb.append(fill);
      body.append(pb);
    }
  }

  if (expanded && model.actions?.length) {
    body.append(actionList(model.actions));
  }

  content.append(body);

  const ri = rightIcon(model);
  if (ri) content.append(ri);

  return content;
}
