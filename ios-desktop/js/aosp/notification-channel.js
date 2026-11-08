// ==================== notification-channel.js — NotificationChannel 渠道语义纯逻辑核（v10.63 #207 一期） ====================
//
// AOSP 真源（#207 立题实证锚）：
//   - frameworks/base/core/java/android/app/NotificationChannel.java：渠道字段集（id/name/description/
//     importance/sound/lights/vibration/badge/showBadge）+ 删除后 tombstone 语义
//   - frameworks/base/core/java/android/app/NotificationManager.java：IMPORTANCE_NONE(0)/MIN(1)/
//     LOW(2)/DEFAULT(3)/HIGH(4) 五级与用户可见名（「无/最低/低/默认/高」）
//   - packages/apps/Settings/.../AppNotificationSettings.java：渠道清单页（#207 二期承载）
//
// 纯逻辑可单测（#147「优先纯逻辑、可逐字译」判据同款）；存储经注入 storage 工厂
// （zenStore 同款范式，persist 静默失败 v9.05 存储范式）。一期范围：注册/更新/删除
// tombstone/get/effectiveImportance/deliveryGate 五格矩阵；渠道清单 UI 与每渠道开关为二期。
//
// 语义裁决（在录）：
//   ①同 id 重注册 = 更新（AOSP NotificationManagerService 同语义）；
//   ②删除 = tombstone 保留（删后投递不复活仅静默——effectiveImportance 落 NONE 整条不进）；
//   ③删除后同 id 重注册 = 按 Android 官方文档语义恢复原渠道设置（用户决策保留，非全新建）；
//   ④无声明投递（无 channelId）→ 隐式 DEFAULT 渠道（存量旧档零迁移零破坏）。

export const IMPORTANCE = Object.freeze({
  NONE: 0,    // 用户可见名「无」：整条不进（数据/横幅/锁屏全无）
  MIN: 1,     // 「最低」：进 Feed 无横幅无声音
  LOW: 2,     // 「低」：进 Feed 无横幅（AOSP 低于 DEFAULT 不 HUN）
  DEFAULT: 3, // 「默认」：现状行为（横幅照弹）
  HIGH: 4,    // 「高」：横幅照弹（一期 ≡ DEFAULT 现状；Avalanche 插队/时序联动二期留点）
});

/** 用户可见名（NotificationManager.java IMPORTANCE_* 对照，二期渠道管理页消费） */
export const IMPORTANCE_LABELS = Object.freeze({
  0: '无', 1: '最低', 2: '低', 3: '默认', 4: '高',
});

/** 隐式渠道 id：无 channelId 声明的投递走此（存量零声明零破坏） */
export const DEFAULT_CHANNEL_ID = 'default';

export const CHANNEL_STORAGE_KEY = 'ios-desktop:notification-channels';
export const CHANNEL_SCHEMA_VERSION = 1;

/** 五格投递分流矩阵（纯函数，单测/接线双消费）：
 *  NONE → 整条不进；MIN/LOW → 进 Feed 不弹横幅；DEFAULT/HIGH → 现状（进 Feed + 横幅）
 *  （入参为 effectiveImportance 结果——tombstone 已在核内归 NONE，此处零特判） */
export function deliveryGate(importance) {
  const i = importance | 0;
  if (i === IMPORTANCE.NONE) return { enqueue: false, peek: false };
  if (i === IMPORTANCE.MIN || i === IMPORTANCE.LOW) return { enqueue: true, peek: false };
  return { enqueue: true, peek: true };
}

function clampImportance(v) {
  const n = v | 0;
  return (n >= IMPORTANCE.NONE && n <= IMPORTANCE.HIGH) ? n : IMPORTANCE.DEFAULT;
}

/** 渠道 store 工厂（heads-up-timing.createSnoozeStore / zen-mode.createZenStore 同款「工厂闭包内自有状态」） */
export function createChannelStore({ storage } = {}) {
  const st = storage
    || (typeof localStorage !== 'undefined' ? localStorage : undefined);
  let state = { version: CHANNEL_SCHEMA_VERSION, channels: {} };
  try {
    const raw = st && st.getItem(CHANNEL_STORAGE_KEY);
    if (raw) state = normalizeChannelState(JSON.parse(raw));
  } catch (e) { /* 损坏存档走默认 */ }
  function persist() {
    try { st && st.setItem(CHANNEL_STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 忽略 */ }
  }
  const key = (appId, channelId) => `${String(appId || '')}::${String(channelId || '')}`;
  function find(appId, channelId) {
    return state.channels[key(appId, channelId)] || null;
  }
  return {
    getState() { return state; },
    persist,
    /** 注册渠道（同 id = 更新；删除态重注册 = 恢复原设置——Android 官方语义②③） */
    createNotificationChannel({ appId, channelId, name, description, importance } = {}) {
      if (!appId || !channelId) return state;
      const k = key(appId, channelId);
      const prev = state.channels[k];
      // 删除态重注册：恢复 tombstone 前的用户设置（importance/name），不新建
      const base = prev && prev.deleted ? { importance: prev.importance, name: prev.name } : null;
      state.channels[k] = {
        appId: String(appId).slice(0, 64),
        channelId: String(channelId).slice(0, 64),
        name: String((base && base.name) || name || channelId).slice(0, 64),
        description: typeof description === 'string' ? description.slice(0, 128) : '',
        importance: clampImportance(base ? base.importance : importance),
        deleted: false,
      };
      persist();
      return state;
    },
    /** 更新渠道（AOSP 用户侧修改同语义：仅合并提供的字段） */
    updateNotificationChannel(appId, channelId, patch = {}) {
      const rec = find(appId, channelId);
      if (!rec) return state;
      if (typeof patch.name === 'string' && patch.name) rec.name = patch.name.slice(0, 64);
      if (typeof patch.description === 'string') rec.description = patch.description.slice(0, 128);
      if (patch.importance !== undefined) rec.importance = clampImportance(patch.importance);
      persist();
      return state;
    },
    /** 删除渠道：tombstone 保留（不物理删除——删后投递静默 + 同 id 重注册恢复设置） */
    deleteNotificationChannel(appId, channelId) {
      const rec = find(appId, channelId);
      if (!rec || rec.deleted) return state;
      rec.deleted = true;
      persist();
      return state;
    },
    /** 查询渠道（tombstone 返回 deleted:true 形态，二期清单页「已删除」分区消费） */
    getNotificationChannel(appId, channelId) {
      return find(appId, channelId);
    },
    /** v10.63 #207 二期：用户侧渠道开关（AOSP ChannelEditorDialog checkbox 同语义：
     *  关 = importance 置 NONE 并记忆原值 preBlockImportance；开 = 恢复原值，
     *  无记忆值/越界回 DEFAULT 3。blocked 渠道投递由 deliveryGate(NONE) 整条不进——
     *  一期矩阵零新闸；存量列表不追溯（AOSP 同语义，渠道开关不影响已入列通知）） */
    toggleChannelEnabled(appId, channelId) {
      const rec = find(appId, channelId);
      if (!rec || rec.deleted) return state;
      if (rec.importance !== IMPORTANCE.NONE) {
        rec.preBlockImportance = rec.importance;
        rec.importance = IMPORTANCE.NONE;
        rec.userBlocked = true;
      } else {
        const restore = Number.isInteger(rec.preBlockImportance)
          && rec.preBlockImportance >= IMPORTANCE.MIN && rec.preBlockImportance <= IMPORTANCE.HIGH
          ? rec.preBlockImportance : IMPORTANCE.DEFAULT;
        rec.importance = restore;
        rec.userBlocked = false;
        delete rec.preBlockImportance;
      }
      persist();
      return state;
    },
    /** 投递侧有效重要性：无声明（查无渠道）→ 隐式 DEFAULT；tombstone → NONE（静默丢弃） */
    effectiveImportance(appId, channelId) {
      const rec = find(appId, channelId);
      if (!rec) return IMPORTANCE.DEFAULT;
      if (rec.deleted) return IMPORTANCE.NONE;
      return rec.importance;
    },
    /** 供测试/恢复场景重置 */
    __reset(next) { state = next || { version: CHANNEL_SCHEMA_VERSION, channels: {} }; return state; },
  };
}

/** 存档归一化：损坏/缺字段逐项兜底（v9.05 存储范式；version 高于当前 → 丢弃走默认） */
export function normalizeChannelState(raw) {
  const def = { version: CHANNEL_SCHEMA_VERSION, channels: {} };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return def;
  if (typeof raw.version !== 'number' || raw.version > CHANNEL_SCHEMA_VERSION || raw.version < 1) return def;
  const out = def;
  if (raw.channels && typeof raw.channels === 'object') {
    for (const k of Object.keys(raw.channels)) {
      const r = raw.channels[k];
      if (!r || typeof r !== 'object' || typeof r.appId !== 'string' || typeof r.channelId !== 'string') continue;
      out.channels[k] = {
        appId: r.appId.slice(0, 64),
        channelId: r.channelId.slice(0, 64),
        name: typeof r.name === 'string' ? r.name.slice(0, 64) : r.channelId,
        description: typeof r.description === 'string' ? r.description.slice(0, 128) : '',
        importance: clampImportance(r.importance),
        deleted: r.deleted === true,
        // v10.63 #207 二期：开关记忆字段清洗（非合法区间丢弃，restore 兜底 DEFAULT）
        preBlockImportance: Number.isInteger(r.preBlockImportance)
          && r.preBlockImportance >= IMPORTANCE.MIN && r.preBlockImportance <= IMPORTANCE.HIGH
          ? r.preBlockImportance : undefined,
        userBlocked: r.userBlocked === true,
      };
    }
  }
  return out;
}

// —— 显式单例（消费端：notifications.js 投递闸 / 二期渠道管理页）——
export const channelStore = createChannelStore();
