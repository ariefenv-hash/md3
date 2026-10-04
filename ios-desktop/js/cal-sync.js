// ==================== cal-sync.js — 通知中心 ↔ 日历应用 数据同步（v7.25） ====================
// 宿主与日历 iframe 同源共享 localStorage：这里只做「读数据 → 组通知」的纯计算，
// 不碰 DOM（notifications.js 负责渲染接线），方便 vitest 直测。
// 数据契约与 apps/calendar/index.html 保持一致：
//   calnotes_v2 = { 'YYYY-MM-DD': [{ id, content, created, updated }] }
//   旧版 note_YYYY-MM-DD = 纯文本单条（装载前兼容读取）

export const CAL_DB_KEY = 'calnotes_v2';
export const CAL_LEGACY_PREFIX = 'note_';
export const CAL_NOTI_ID = 'n2';            // 通知中心日历条目槽位（演示/动态同 id）
export const CAL_DISMISS_KEY = 'ios-desktop:noti-cal-dismissed';

const p2 = (n) => String(n).padStart(2, '0');
export function calDateKey(d) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/**
 * 归一化读取日历笔记数据。
 * @param {Storage} ls localStorage（测试可传 mock）
 * @returns {{}} { 'YYYY-MM-DD': [{ id, content, updated }] }（已清洗，仅保留合法条目）
 */
export function readCalendarNotes(ls) {
  const store = ls || (typeof localStorage !== 'undefined' ? localStorage : null);
  if (!store) return {};
  const out = {};
  // v2 主存储
  try {
    const raw = JSON.parse(store.getItem(CAL_DB_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      Object.keys(raw).forEach((k) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(raw[k])) return;
        const arr = raw[k].filter((n) => n && typeof n.content === 'string' && n.content.trim());
        if (arr.length) out[k] = arr.map((n) => ({ id: n.id, content: n.content, updated: n.updated || n.created || 0 }));
      });
    }
  } catch (e) { /* 脏 JSON → 忽略，继续走旧键兼容 */ }
  // 旧版单条键（v7.24 及更早，未打开过新版日历应用时的兜底可见性）
  try {
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (!k || k.indexOf(CAL_LEGACY_PREFIX) !== 0) continue;
      const m = /^note_(\d{4}-\d{2}-\d{2})$/.exec(k);
      if (!m) continue;
      const c = (store.getItem(k) || '').trim();
      if (!c || out[m[1]]) continue;
      out[m[1]] = [{ id: 'legacy-' + m[1], content: c, updated: 0 }];
    }
  } catch (e) {}
  return out;
}

/** 笔记标题提取：首个 Markdown 标题行 → 首个非空行 → 无标题（与日历应用一致） */
export function calNoteTitle(content) {
  const c = String(content || '');
  const m = c.match(/^#+\s*(.+)/m);
  const line = (m ? m[1] : (c.split('\n').find((l) => l.trim()) || '')).trim();
  return (line.slice(0, 40)) || '无标题';
}

/**
 * 构造日历摘要通知内容。
 * 优先级：今天有笔记 → 「今天 · N 篇」；否则取最近更新的一篇所在日 → 「M月D日 · N 篇」。
 * @returns {null | { key, count, title, desc, latestUpdated, digest, dateLabel }}
 */
export function composeCalNotification(days, now) {
  const nowDate = now instanceof Date ? now : new Date();
  const keys = Object.keys(days || {}).filter((k) => (days[k] || []).length);
  if (!keys.length) return null;

  const todayKey = calDateKey(nowDate);
  let targetKey = null;
  if (keys.indexOf(todayKey) !== -1) {
    targetKey = todayKey;
  } else {
    // 最近更新日：以当日最新一条笔记的 updated 排序
    let bestTs = -1;
    keys.forEach((k) => {
      const ts = Math.max.apply(null, days[k].map((n) => n.updated || 0));
      if (ts > bestTs) { bestTs = ts; targetKey = k; }
    });
  }
  const arr = days[targetKey];
  const latest = arr.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0))[0];
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(targetKey);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : nowDate;
  const dateLabel = targetKey === todayKey
    ? '今天'
    : `${d.getMonth() + 1}月${d.getDate()}日`;
  const latestUpdated = latest ? (latest.updated || 0) : 0;
  return {
    key: targetKey,
    count: arr.length,
    dateLabel,
    title: `${dateLabel} · ${arr.length} 篇笔记`,
    desc: `最新：${calNoteTitle(latest ? latest.content : '')}`,
    latestUpdated,
    digest: calDigest(targetKey, arr.length, latestUpdated),
  };
}

/** 数据指纹：日期 + 数量 + 最新更新时间 —— 任一变化即视为「新通知」重新浮现 */
export function calDigest(key, count, latestUpdated) {
  return `${key}:${count}:${latestUpdated}`;
}

/** 相对时间（通知卡片 time 字段）：刚刚 / N分钟前 / N小时前 / M/D */
export function formatRelative(ts, now) {
  const t = Number(ts) || 0;
  if (!t) return '刚刚';
  const nowTs = typeof now === 'number' ? now
    : (now instanceof Date ? now.getTime() : Date.now());
  const diff = Math.max(0, nowTs - t);
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}小时前`;
  const d = new Date(t);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
