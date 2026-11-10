// ==================== notification-redaction.js — Notification.visibility 锁屏脱敏纯逻辑核（v11.16 #206） ====================
//
// AOSP 真源（#206 立题实证锚）：
//   - frameworks/base/core/java/android/app/Notification.java：
//     VISIBILITY_PUBLIC(1) / VISIBILITY_PRIVATE(0) / VISIBILITY_SECRET(-1) 三常量；
//     visibility 字段默认值 VISIBILITY_PRIVATE（`public int visibility = VISIBILITY_PRIVATE`）；
//     publicVersion 字段（Builder.setPublicVersion()）= 脱敏版概要的**独立 Notification 体**
//     （AOSP PublicInflationCallback 语义：锁屏脱敏时若声明了 publicVersion 则以它重渲染）。
//   - frameworks/base/packages/SystemUI/src/com/android/systemui/statusbar/LockscreenUserManager.kt：
//     needsRedaction(entry) 判定 —— userAllowsPrivateNotificationsInPublic
//       （= Settings.Secure.LOCK_SCREEN_ALLOW_PRIVATE_NOTIFICATIONS）
//       ? visibility == VISIBILITY_PRIVATE      // 用户「显示全部」：PRIVATE 脱敏（PUBLIC 明文）
//       : visibility != VISIBILITY_PUBLIC       // 用户「隐藏敏感」：PRIVATE + SECRET 脱敏
//     设置路径三 radio：显示全部通知内容 / 隐藏敏感内容 / 不显示通知
//     （Settings.Secure.LOCK_SCREEN_SHOW_NOTIFICATIONS + LOCK_SCREEN_ALLOW_PRIVATE_NOTIFICATIONS 双键）。
//   - KeyguardNotificationListProvider.java：VISIBILITY_SECRET 在锁屏**整条不渲染**
//     （shouldShowNotification false，应用声明的绝对隐私档）。
//
// 语义裁决（在录）：
//   ①SECRET 双语义差异：议题 #206 规格 = 一律脱敏卡（铁律#2 议题规格超越）；AOSP 真源
//     （KeyguardNotificationListProvider）= 锁屏整条不渲染。本工程取**议题规格（脱敏卡）**——
//     needsRedaction(SECRET) 恒 true 为两种语义共同判定；AOSP 整条隐藏差异诚实标注，
//     若后续对齐真机以 KeyguardNotificationListProvider 口径收编为整条不渲染分支。
//   ②脱敏形态：有 publicVersion 用之（独立 Notification 体：title/desc 概要）；无则通用
//     脱敏卡 = 应用名 + 应用图标 +「内容已隐藏」（AOSP fallback 形态，不泄露条数语义外
//     的任何内容）。**view 产物绝不携带原 item.title/item.desc**（信息面裁剪，单测断言）。
//   ③面边界：脱敏只作用**锁屏面**；解锁后的通知中心 Feed 与 QS 恒明文（AOSP 同语义，
//     已解锁语境无脱敏）——notifications.js 数据层/横幅层零脱敏分支。
//   ④设置三态真源：localStorage `settings:notifications-v1`（apps/settings.js
//     NOTIF_PAGE_SCRIPT 单一真源，lockScreenShow + allowPrivate 双键 → show/hide/disable
//     三态，__notifLockPick data-opt 同构）——本核**同源直读**避免 import 环
//     （settings.js 头注「真实通知数据同源直读」同法）。默认值 = 议题规格「隐藏敏感内容」
//     （allowPrivate:false；v801 默认值锚同步重锚——SystemUI getInt fallback 1 与
//     真机 Pixel 出厂「隐藏敏感内容」差异在录，本工程取真机语义）。
//   ⑤disable 整列不渲染：lockscreenGate('disable') → renderList:false → 锁屏列复用
//     zen NOTIFICATION_LIST 空列链路（feed=[] →「暂无新通知」+ 表盘回 LARGE），零新分支。

/** Notification.java visibility 三常量（1/0/-1 逐字实证） */
export const VISIBILITY = Object.freeze({ SECRET: -1, PRIVATE: 0, PUBLIC: 1 });

/** 通用脱敏卡文案（AOSP fallback 形态：应用名 + 图标 + 本文案） */
export const REDACT_FALLBACK_TEXT = '内容已隐藏';

/** 脱敏卡 DOM 类名（lock-screen.css 降档样式消费） */
export const REDACTED_CARD_CLASS = 'lock-noti-card--redacted';

/** 设置三态真源键（apps/settings.js NOTIF_PAGE_SCRIPT STORE_KEY 同值，同源直读） */
export const NOTIF_SETTINGS_KEY = 'settings:notifications-v1';

/** readLockMode 缺档/损坏兜底默认（议题 #206 规格：默认「隐藏敏感内容」=hide） */
export const LOCK_MODE_DEFAULTS = Object.freeze({ lockScreenShow: 1, allowPrivate: false });

/** visibility 归一：合法三值（含数字字符串）原样保留；其余一律落 PRIVATE
 *  （Notification.java visibility 字段默认值语义；boolean/null/undefined/NaN 均兜底） */
export function clampVisibility(v) {
  if (typeof v === 'boolean') return VISIBILITY.PRIVATE;
  const n = (typeof v === 'string') ? Number(v) : v;
  if (n === VISIBILITY.PUBLIC || n === VISIBILITY.PRIVATE || n === VISIBILITY.SECRET) return n;
  return VISIBILITY.PRIVATE;
}

/** 设置双键 → 语义三态（apps/settings.js lockSummary/getSummaryResource 同构裁决：
 *  !lockScreenShow → 'disable'；allowPrivate → 'show'；否则 'hide'）。
 *  lockScreenShow 缺省键 → 补 LOCK_MODE_DEFAULTS（空信息 ≠ 明确关闭，默认收敛 hide） */
export function resolveLockMode(prefs) {
  const p = (prefs && typeof prefs === 'object' && !Array.isArray(prefs)) ? prefs : {};
  const show = p.lockScreenShow !== undefined && p.lockScreenShow !== null
    ? p.lockScreenShow : LOCK_MODE_DEFAULTS.lockScreenShow;
  if (!show) return 'disable';
  return p.allowPrivate ? 'show' : 'hide';
}

/** 同源直读设置三态（storage 可注入——单测隔离；缺档/损坏/缺字段逐项兜底
 *  LOCK_MODE_DEFAULTS，settings.js load() 逐字段补默认同构） */
export function readLockMode(storage) {
  const st = storage || (typeof localStorage !== 'undefined' ? localStorage : undefined);
  let prefs = {};
  try {
    const raw = st && st.getItem(NOTIF_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) prefs = parsed;
    }
  } catch (e) { prefs = {}; /* 损坏存档走默认 */ }
  return resolveLockMode({
    lockScreenShow: prefs.lockScreenShow !== undefined ? prefs.lockScreenShow : LOCK_MODE_DEFAULTS.lockScreenShow,
    allowPrivate: prefs.allowPrivate !== undefined ? prefs.allowPrivate : LOCK_MODE_DEFAULTS.allowPrivate,
  });
}

/** 锁屏列总闸：disable → 整列不渲染（优先于逐条判定全部） */
export function lockscreenGate(mode) {
  return { renderList: mode !== 'disable' };
}

/** needsRedaction —— 3 visibility × 3 设置态矩阵（LockscreenUserManager.kt 同构）：
 *  - disable → true（整列已在上游不渲染；防御值不参与渲染）；
 *  - SECRET → 恒 true（议题规格①：一律脱敏卡；AOSP 真源=整条隐藏，差异在录）；
 *  - hide（隐藏敏感，默认）→ visibility !== PUBLIC（PRIVATE/SECRET 脱敏）；
 *  - show（显示全部）→ false（PUBLIC/PRIVATE 明文；SECRET 已在上拦脱敏）。
 *  visibility 非法值内部 clampVisibility 兜底（调用方 normalize 前置，此处防御双保险） */
export function needsRedaction(visibility, mode) {
  const m = (mode === 'disable' || mode === 'show' || mode === 'hide') ? mode : 'hide';
  if (m === 'disable') return true;
  const vis = clampVisibility(visibility);
  if (vis === VISIBILITY.SECRET) return true;
  if (m === 'hide') return vis !== VISIBILITY.PUBLIC;
  return false; // show：PRIVATE/PUBLIC 明文
}

/** 脱敏卡数据组装：有 publicVersion（独立 Notification 体形态）用之
 *  （AOSP PublicInflationCallback 语义）；无则 fallback（应用名+「内容已隐藏」+空正文）。
 *  **产物零携带原 title/desc/appId 之外的内容字段**（信息面裁剪——原 title/desc 绝不透出）。
 *  图标不走本核（渲染面 resolveNotiIcon(item) 原样消费——应用图标可见是 AOSP fallback 形态） */
export function redactedView(item) {
  const src = (item && typeof item === 'object' && !Array.isArray(item)) ? item : {};
  const pv = (src.publicVersion && typeof src.publicVersion === 'object' && !Array.isArray(src.publicVersion))
    ? src.publicVersion : null;
  const pvTitle = (pv && typeof pv.title === 'string') ? pv.title.slice(0, 64) : '';
  const pvDescRaw = pv && typeof pv.desc === 'string' ? pv.desc
    : pv && typeof pv.text === 'string' ? pv.text : '';
  const pvDesc = pvDescRaw.slice(0, 128);
  const hasPublic = !!(pv && (pvTitle || pvDesc));
  return {
    app: typeof src.app === 'string' ? src.app.slice(0, 64) : '',
    time: typeof src.time === 'string' ? src.time.slice(0, 24) : '',
    // publicVersion 卡 title 位空缺（仅 text/desc 概要）→ fallback 文案补位（desc 仍显概要）
    title: (hasPublic && pvTitle) ? pvTitle : REDACT_FALLBACK_TEXT,
    desc: hasPublic ? pvDesc : '',
    fromPublicVersion: hasPublic,
  };
}

/** 投递侧归一（notifications.js addSystemNotification 入口消费）：
 *  visibility 非法钳制 PRIVATE；publicVersion 非「独立 Notification 体」形态（对象且
 *  title/desc/text 至少一个非空字符串）→ 剔除（undefined）——防止把任意 junk 当概要渲染；
 *  合法则裁剪定型 { title, desc }（text 别名归并入 desc，Notification.text 同源）。 */
export function normalizeRedactionFields(item) {
  if (!item || typeof item !== 'object') return item;
  item.visibility = clampVisibility(item.visibility);
  const pv = item.publicVersion;
  const pvOk = !!(pv && typeof pv === 'object' && !Array.isArray(pv)
    && ((typeof pv.title === 'string' && pv.title)
      || (typeof pv.desc === 'string' && pv.desc)
      || (typeof pv.text === 'string' && pv.text)));
  if (!pvOk) delete item.publicVersion;
  else {
    item.publicVersion = {
      title: typeof pv.title === 'string' ? pv.title.slice(0, 64) : '',
      desc: typeof pv.desc === 'string' ? pv.desc.slice(0, 128)
        : typeof pv.text === 'string' ? pv.text.slice(0, 128) : '',
    };
  }
  return item;
}
