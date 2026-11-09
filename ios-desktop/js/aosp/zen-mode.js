// ==================== aosp/zen-mode.js — ZenModeConfig / ZenPolicy / ZenDeviceEffects 全规格（#198） ====================
//
// 源码锚（AOSP 16-QPR2 frameworks/base，议题 #198 实证值逐项 1:1；本窗 curl 直拉
// android.googlesource.com 遇 GnuTLS 网络坑，改经 raw.githubusercontent.com 16-QPR2 镜像实拉）：
//   core/java/android/service/notification/ZenPolicy.java：
//     PRIORITY_CATEGORY_REMINDERS=0 / EVENTS=1 / MESSAGES=2 / CALLS=3 / REPEAT_CALLERS=4 /
//     ALARMS=5 / MEDIA=6 / SYSTEM=7 / CONVERSATIONS=8（九类）
//     STATE_UNSET=0 / STATE_ALLOW=1 / STATE_DISALLOW=2（三态）
//     CONVERSATION_SENDERS_UNSET=0 / ANYONE=1 / IMPORTANT=2 / NONE=3
//     VISUAL_EFFECT_FULL_SCREEN_INTENT=0 / LIGHTS=1 / PEEK=2 / STATUS_BAR=3 / BADGE=4 /
//     AMBIENT=5 / NOTIFICATION_LIST=6（七位枚举序，位掩码 = 1 << ordinal）
//     PEOPLE_TYPE_UNSET=0 / ANYONE=1 / CONTACTS=2 / STARRED=3 / NONE=4
//   core/java/android/app/NotificationManager.java（Policy 内部类，位真值经
//     learn.microsoft.com Xamarin binding 交叉实证）：
//     SUPPRESSED_EFFECT_SCREEN_OFF = 1<<0 = 1 / SUPPRESSED_EFFECT_SCREEN_ON = 1<<1 = 2
//     （API 23 老位，弃用，不在默认集）/ FULL_SCREEN_INTENT = 1<<2 = 4 / LIGHTS = 1<<3 = 8 /
//     PEEK = 1<<4 = 16 / STATUS_BAR = 1<<5 = 32 / BADGE = 1<<6 = 64 / AMBIENT = 1<<7 = 128 /
//     NOTIFICATION_LIST = 1<<8 = 256
//   core/java/android/service/notification/ZenModeConfig.java：
//     L204 源码注释原文「Default setting here is 010011101 = 157」：
//     DEFAULT_SUPPRESSED_VISUAL_EFFECTS = SCREEN_OFF | FULL_SCREEN_INTENT | LIGHTS
//       | PEEK | AMBIENT = 1|4|8|16|128 = 157（010011101 逐位吻合）
//     ORIGIN_USER_IN_SYSTEMUI = 3 / XML_VERSION_MODES_UI = 12（schema 版本化迁移锚）
//     MANUAL_RULE_ID = "MANUAL_RULE" / EVERY_NIGHT_DEFAULT_RULE_ID =
//     出厂「睡觉」自动规则：days 全周七日 + 22:00→07:00 跨零点 + exitAtAlarm=true + enabled=false
//   core/java/android/service/notification/ZenDeviceEffects.java（16-QPR2）：
//     FIELD_GRAYSCALE=1<<0 / FIELD_SUPPRESS_AMBIENT_DISPLAY=1<<1 / FIELD_DIM_WALLPAPER=1<<2 /
//     FIELD_NIGHT_MODE=1<<3 / FIELD_DISABLE_AUTO_BRIGHTNESS=1<<4 / FIELD_DISABLE_TAP_TO_WAKE=1<<5 /
//     FIELD_DISABLE_TILT_TO_WAKE=1<<6 / FIELD_DISABLE_TOUCH=1<<7 / FIELD_MINIMIZE_RADIO_USAGE=1<<8 /
//     FIELD_MAXIMIZE_DOZE=1<<9 / FIELD_EXTRA_EFFECTS=1<<10 / FIELD_NIGHT_LIGHT=1<<11 /
//     FIELD_BRIGHTNESS_CAP=1<<12（13 位全量在录；议题 #198 所述「十项」为撰写时点计数，
//     以 16-QPR2 实拉 13 位为准——裁明更正）
//   core/java/android/service/notification/ScheduleCalendar.java：
//     ScheduleInfo.days 为 java.util.Calendar 常量（SUNDAY=1 … SATURDAY=7），
//     内部位掩码 = 1 << (day - 1)；isScheduleInRange 同日分支 minute ∈ [start, end)，
//     跨零点分支 end ≤ start → (当日 minute ≥ start) || (次日 minute < end)。
//     start == end 的规则 web 侧裁决为永不激活（AOSP 无全天生效歧义语义，防误开在录）
// 纯逻辑层纪律（v9.05 多文件范式同款）：除显式单例外零 DOM / 零共享状态副作用——
// 全部裁决为纯函数；单例仅 zenStore（#198 三方消费：notifications.js 第四/五闸、
// quick-settings.js 磁贴 manualRule + 设备效果 overlay、lock-screen.js 锁屏列视觉抑制），
// 测试经 createZenStore 工厂隔离实例（headsup-timing.js 同款「工厂 + 消费端持有」分工）。
// 快照：v9.94 · 2026-11-03

// —— ZenPolicy 九类（ZenPolicy.PRIORITY_CATEGORY_*，实证 0-8）——
export const PRIORITY_CATEGORY = Object.freeze({
  REMINDERS: 0, EVENTS: 1, MESSAGES: 2, CALLS: 3, REPEAT_CALLERS: 4,
  ALARMS: 5, MEDIA: 6, SYSTEM: 7, CONVERSATIONS: 8,
});
/** 索引 ↔ key 双向表（categoryFromNotification / 状态表落盘键序） */
export const PRIORITY_CATEGORY_KEYS = Object.freeze([
  'REMINDERS', 'EVENTS', 'MESSAGES', 'CALLS', 'REPEAT_CALLERS',
  'ALARMS', 'MEDIA', 'SYSTEM', 'CONVERSATIONS',
]);

// —— 三态（ZenPolicy.STATE_*，实证 0-2）——
export const ZEN_STATE = Object.freeze({ UNSET: 0, ALLOW: 1, DISALLOW: 2 });

// —— 会话发送者（ZenPolicy.CONVERSATION_SENDERS_*，实证 0-3）——
export const CONVERSATION_SENDERS = Object.freeze({ UNSET: 0, ANYONE: 1, IMPORTANT: 2, NONE: 3 });

// —— 人员类型（ZenPolicy.PEOPLE_TYPE_*，实证 0-4）——
export const PEOPLE_TYPE = Object.freeze({ UNSET: 0, ANYONE: 1, CONTACTS: 2, STARRED: 3, NONE: 4 });

// —— 视觉两体系 ——

/** ZenPolicy 七位（枚举序 0-6；policy 位掩码 = 1 << ordinal） */
export const ZEN_POLICY_VISUAL_EFFECT = Object.freeze({
  FULL_SCREEN_INTENT: 0, LIGHTS: 1, PEEK: 2, STATUS_BAR: 3, BADGE: 4, AMBIENT: 5, NOTIFICATION_LIST: 6,
});

/** Policy.SUPPRESSED_EFFECT_* 位真值（NotificationManager.Policy，SCREEN_ON 为弃用老位） */
export const SUPPRESSED_EFFECT = Object.freeze({
  SCREEN_OFF: 1, SCREEN_ON: 2, FULL_SCREEN_INTENT: 4, LIGHTS: 8, PEEK: 16,
  STATUS_BAR: 32, BADGE: 64, AMBIENT: 128, NOTIFICATION_LIST: 256,
});

/** ZenModeConfig 默认视觉抑制位掩码（源码注释原文「010011101 = 157」） */
export const DEFAULT_SUPPRESSED_VISUAL_EFFECTS = 157;

/** ZenPolicy 枚举序 → 位（1 << ordinal） */
export function zenPolicyEffectBit(ordinal) {
  return 1 << ordinal;
}

/** 视觉位是否被抑制 */
export function isVisualSuppressed(mask, effectBit) {
  return ((mask | 0) & (effectBit | 0)) !== 0;
}

/** 勿扰开启时生效的视觉抑制掩码：manual 开 → 自定义掩码（缺省 157）；关 → 0 */
export function suppressedVisualsFor(zenActive, customMask) {
  if (!zenActive) return 0;
  const m = typeof customMask === 'number' && customMask >= 0 ? customMask : DEFAULT_SUPPRESSED_VISUAL_EFFECTS;
  return m | 0;
}

// —— ZenDeviceEffects 十三位（ZenDeviceEffects.FIELD_*，16-QPR2 实证）——
export const ZEN_DEVICE_EFFECT = Object.freeze({
  GRAYSCALE: 1, SUPPRESS_AMBIENT_DISPLAY: 2, DIM_WALLPAPER: 4, NIGHT_MODE: 8,
  DISABLE_AUTO_BRIGHTNESS: 16, DISABLE_TAP_TO_WAKE: 32, DISABLE_TILT_TO_WAKE: 64,
  DISABLE_TOUCH: 128, MINIMIZE_RADIO_USAGE: 256, MAXIMIZE_DOZE: 512,
  EXTRA_EFFECTS: 1024, NIGHT_LIGHT: 2048, BRIGHTNESS_CAP: 4096,
});

/**
 * ZenDeviceEffects → Web 侧 overlay 合成样式（#198 验收「灰度 = 全屏 filter 级」）。
 * Web 无硬件面板语义：grayscale / night-light / night-mode / brightness-cap / dim-wallpaper
 * 五位可由 fixed 全屏 overlay（backdrop-filter + 暖色/暗色罩面）等效合成；
 * 其余八位为设备级语义（TapToWake/RadioUsage/Doze…web 无对应实体），位状态照常
 * 存储与查询（状态机完整），不产出样式（返回 null 贡献位）——真实消费不空转。
 * 叠加次序：灰度 → 夜灯 → 夜间模式 → 压暗壁纸 → 亮度帽（后写胜出语义与 AOSP 效果叠加次序对齐）。
 */
export function deviceEffectsOverlayStyle(effects) {
  const m = (effects | 0);
  if (!m) return null;
  const layers = [];
  const filters = [];
  const D = ZEN_DEVICE_EFFECT;
  if (m & D.GRAYSCALE) filters.push('grayscale(1)');
  if (m & D.NIGHT_LIGHT) layers.push({ background: 'rgba(255,147,41,0.14)' }); // 暖色罩（夜灯）
  if (m & D.NIGHT_MODE) layers.push({ background: 'rgba(0,0,0,0.22)' });        // 暗色罩（夜间模式）
  if (m & D.DIM_WALLPAPER) layers.push({ background: 'rgba(0,0,0,0.12)' });     // 壁纸压暗
  if (m & D.BRIGHTNESS_CAP) filters.push('brightness(0.55)');                    // 亮度帽（半亮度）
  if (!filters.length && !layers.length) return null;
  const style = { pointerEvents: 'none' };
  // 合成规则：同帧多罩面后写胜出（叠加次序头注在录：夜灯 → 夜间模式 → 压暗壁纸，
  // 单元素单背景；filter 位经 backdrop-filter 作用于下层全部像素）
  style.backdropFilter = filters.length ? filters.join(' ') : undefined;
  if (layers.length) style.background = layers[layers.length - 1].background;
  return style;
}

// —— ScheduleCalendar（AOSP 同构）——
export const DAY_MINUTES = 24 * 60;

/** ScheduleInfo.days（Calendar 1-7）→ 位掩码（1 << (day - 1)） */
export function daysToBitmask(days) {
  let mask = 0;
  for (const d of days || []) {
    const n = Number(d);
    if (Number.isInteger(n) && n >= 1 && n <= 7) mask |= 1 << (n - 1);
  }
  return mask;
}

/** 位掩码 → Calendar 天序数组（升序 1-7） */
export function bitmaskToDays(mask) {
  const out = [];
  for (let d = 1; d <= 7; d++) if ((mask | 0) & (1 << (d - 1))) out.push(d);
  return out;
}

/** 前一日（Calendar 1-7 循环） */
export function prevDay(day) {
  return ((day + 5) % 7) + 1;
}

/** 次日（Calendar 1-7 循环） */
export function nextDay(day) {
  return (day % 7) + 1;
}

/**
 * isInSchedule（ScheduleCalendar.isInSchedule 16-QPR2 同构，实拉源码）:
 *   end ≤ start（跨零点）→ end += 全天；isInSchedule(-1) || isInSchedule(0)：
 *   offset 0：今日 ∈ days && m ≥ start（今夜起效）；
 *   offset -1：昨日 ∈ days && m < end（昨夜延续至今晨）——
 *   即周五夜 22:00-07:00 规则周六晨 05:00 仍在区间（昨夜延续）。
 * start === end：web 侧裁决永不激活（AOSP end<=start 分支视为全天，歧义防误开在录）。
 */
export function isScheduleInRange(rule, now) {
  if (!rule || !now) return false;
  const mask = daysToBitmask(rule.days);
  const day = now.day | 0;
  const m = now.minuteOfDay | 0;
  if (day < 1 || day > 7 || m < 0 || m >= DAY_MINUTES) return false;
  const start = rule.startMinute | 0;
  const end = rule.endMinute | 0;
  if (start === end) return false;
  if (start < end) return !!(mask & (1 << (day - 1))) && m >= start && m < end;
  // 跨零点（ScheduleCalendar isInSchedule(-1) || isInSchedule(0) 同构）
  if ((mask & (1 << (day - 1))) && m >= start) return true;          // offset 0：今夜
  if ((mask & (1 << (prevDay(day) - 1))) && m < end) return true;    // offset -1：昨夜延续
  return false;
}

/** evalScheduleRules：返回当前到点的规则 id 数组（保持传入顺序） */
export function evalScheduleRules(rules, now) {
  const out = [];
  for (const r of rules || []) {
    if (r && r.enabled !== false && r.id && isScheduleInRange(r, now)) out.push(r.id);
  }
  return out;
}

// —— 通知裁决（ZenPolicy 九类 × 三态）——

/** 类别裁决：UNSET 继承全局（返回 true，由调用方按全局语义处理）/ ALLOW 放行 / DISALLOW 拦截 */
export function categoryAllows(priorityStates, category) {
  const key = PRIORITY_CATEGORY_KEYS[category];
  if (!key) return true;
  return (priorityStates || {})[key] !== ZEN_STATE.DISALLOW;
}

/** md3 通知 → 九类映射：item.zenCategory（'CALLS' 等九类 key，大小写不敏感）显式通道；
 *  回退 item.zenKind / item.kind 语义映射；未知 → SYSTEM（md3 通知流以应用/系统服务投递为主）。 */
const KIND_TO_CATEGORY = Object.freeze({
  call: 'CALLS', calls: 'CALLS', message: 'MESSAGES', messages: 'MESSAGES',
  chat: 'MESSAGES', conversation: 'CONVERSATIONS', alarm: 'ALARMS', alarms: 'ALARMS',
  timer: 'ALARMS', reminder: 'REMINDERS', event: 'EVENTS', calendar: 'EVENTS',
  media: 'MEDIA', music: 'MEDIA',
});
export function categoryFromNotification(item) {
  const zc = item && typeof item.zenCategory === 'string'
    ? PRIORITY_CATEGORY[item.zenCategory.toUpperCase()]
    : undefined;
  if (zc !== undefined) return zc;
  const k = item && (item.zenKind != null ? item.zenKind : item.kind);
  const hit = typeof k === 'string' ? KIND_TO_CATEGORY[k.toLowerCase()] : undefined;
  return hit ? PRIORITY_CATEGORY[hit] : PRIORITY_CATEGORY.SYSTEM;
}

/** 进 feed 裁决（AOSP：被 DND 拦截的通知不进 shade）：勿扰开且类别 DISALLOW → false */
export function shouldEnqueueNotification(state, item, zenActive) {
  if (!zenActive) return true;
  const s = state || {};
  return categoryAllows(s.priorityStates, categoryFromNotification(item));
}

/** 横幅（peek）裁决：勿扰开 → 仅 ALLOW 类放行横幅；UNSET 维持全局横幅禁（md3 既有语义）；勿扰关 → true */
export function shouldPeekNotification(state, item, zenActive) {
  if (!zenActive) return true;
  const s = state || {};
  const key = PRIORITY_CATEGORY_KEYS[categoryFromNotification(item)];
  return key ? (s.priorityStates || {})[key] === ZEN_STATE.ALLOW : false;
}

// —— 状态与持久化（schema 版本化：AOSP XML_VERSION_MODES_UI=12 迁移锚同构，升级按版本号走）——
export const ZEN_STORAGE_KEY = 'ios-desktop:zen-mode';
export const ZEN_SCHEMA_VERSION = 1;
export const MANUAL_RULE_ID = 'MANUAL_RULE'; // ZenModeConfig.MANUAL_RULE_ID 实证

/** 出厂默认态（ZenModeConfig.getDefaultZenPolicy 九类布尔语义映射为三态：
 *  allow=true → ALLOW；false → UNSET（md3 全局横幅语义接管）；映射在录） */
export function defaultZenState() {
  const priorityStates = {};
  for (const k of PRIORITY_CATEGORY_KEYS) priorityStates[k] = ZEN_STATE.UNSET;
  priorityStates.ALARMS = ZEN_STATE.ALLOW;   // DEFAULT_ALLOW_ALARMS = true
  priorityStates.MEDIA = ZEN_STATE.ALLOW;    // DEFAULT_ALLOW_MEDIA = true
  priorityStates.CALLS = ZEN_STATE.ALLOW;    // DEFAULT_ALLOW_CALLS = true
  priorityStates.MESSAGES = ZEN_STATE.ALLOW; // DEFAULT_ALLOW_MESSAGES = true
  priorityStates.REPEAT_CALLERS = ZEN_STATE.ALLOW; // DEFAULT_ALLOW_REPEAT_CALLERS = true
  priorityStates.CONVERSATIONS = ZEN_STATE.ALLOW;  // DEFAULT_ALLOW_CONV = true
  priorityStates.SYSTEM = ZEN_STATE.UNSET;   // DEFAULT_ALLOW_SYSTEM = false
  priorityStates.REMINDERS = ZEN_STATE.UNSET; // DEFAULT_ALLOW_REMINDERS = false
  priorityStates.EVENTS = ZEN_STATE.UNSET;    // DEFAULT_ALLOW_EVENTS = false
  return {
    version: ZEN_SCHEMA_VERSION,
    manualActive: false,               // manualRule（QS 磁贴直控）
    ruleDriven: false,                 // 当前激活由 schedule 规则驱动（自动关断判定）
    suppressedVisuals: DEFAULT_SUPPRESSED_VISUAL_EFFECTS,
    priorityStates,
    conversationSenders: CONVERSATION_SENDERS.IMPORTANT, // DEFAULT_ALLOW_CONV_FROM 实证
    deviceEffects: 0,                  // ZenDeviceEffects 位掩码
    rules: [],                         // 自动规则（ScheduleInfo 同构）
    externalSources: {},               // v10.97 #209 程序化外部来源登记表（session-only：normalize 载入即清洗，不持久化）
  };
}

/** 存档归一化：损坏/缺字段逐项兜底（v9.05 存储范式；version 高于当前 → 丢弃走默认，升级按版本号） */
export function normalizeZenState(raw) {
  const def = defaultZenState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return def;
  if (typeof raw.version !== 'number' || raw.version > ZEN_SCHEMA_VERSION || raw.version < 1) return def;
  const out = def;
  out.manualActive = raw.manualActive === true;
  out.ruleDriven = raw.ruleDriven === true;
  out.suppressedVisuals = typeof raw.suppressedVisuals === 'number' && raw.suppressedVisuals >= 0
    ? (raw.suppressedVisuals | 0) : def.suppressedVisuals;
  if (raw.priorityStates && typeof raw.priorityStates === 'object') {
    for (const k of PRIORITY_CATEGORY_KEYS) {
      const v = raw.priorityStates[k];
      if (v === ZEN_STATE.UNSET || v === ZEN_STATE.ALLOW || v === ZEN_STATE.DISALLOW) {
        out.priorityStates[k] = v;
      }
    }
  }
  if (Object.values(CONVERSATION_SENDERS).includes(raw.conversationSenders)) {
    out.conversationSenders = raw.conversationSenders;
  }
  out.deviceEffects = typeof raw.deviceEffects === 'number' && raw.deviceEffects >= 0
    ? (raw.deviceEffects | 0) : 0;
  // v10.97 #209：externalSources 不从存档恢复（session-only 设计：外部来源是运行时程序态，
  // 跨会话残留会悬挂一个「看不见的勿扰」——载入即清洗，与 focus.js 会话级纪律同源）
  if (Array.isArray(raw.rules)) {
    out.rules = raw.rules
      .filter((r) => r && typeof r === 'object' && typeof r.id === 'string')
      .map((r) => ({
        id: String(r.id).slice(0, 64),
        label: typeof r.label === 'string' ? r.label.slice(0, 64) : '',
        days: bitmaskToDays(daysToBitmask(r.days)),
        startMinute: Math.max(0, Math.min(DAY_MINUTES - 1, r.startMinute | 0)),
        endMinute: Math.max(0, Math.min(DAY_MINUTES - 1, r.endMinute | 0)),
        enabled: r.enabled !== false,
      }));
  }
  return out;
}

/**
 * zen store 工厂（heads-up-timing.createSnoozeStore 同款「工厂闭包内自有状态」）。
 * persist 静默失败（隐私模式等场景，v9.05 存储范式）。
 */
export function createZenStore({ storage } = {}) {
  const st = storage
    || (typeof localStorage !== 'undefined' ? localStorage : undefined);
  let state = defaultZenState();
  // —— load ——
  try {
    const raw = st && st.getItem(ZEN_STORAGE_KEY);
    if (raw) state = normalizeZenState(JSON.parse(raw));
  } catch (e) { /* 损坏存档走默认 */ }
  function persist() {
    try { st && st.setItem(ZEN_STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 忽略 */ }
  }
  return {
    getState() { return state; },
    persist,
    /** manualRule 直控（QS 磁贴）：开启时解除规则驱动标记 */
    setManual(active) {
      state.manualActive = !!active;
      if (active) state.ruleDriven = false;
      persist();
      return state;
    },
    setSuppressedVisuals(mask) {
      state.suppressedVisuals = (mask | 0);
      persist();
      return state;
    },
    setCategoryState(categoryKey, s) {
      if (PRIORITY_CATEGORY_KEYS.includes(categoryKey)
        && (s === ZEN_STATE.UNSET || s === ZEN_STATE.ALLOW || s === ZEN_STATE.DISALLOW)) {
        state.priorityStates[categoryKey] = s;
        persist();
      }
      return state;
    },
    setConversationSenders(v) {
      if (Object.values(CONVERSATION_SENDERS).includes(v)) {
        state.conversationSenders = v;
        persist();
      }
      return state;
    },
    setDeviceEffects(mask) {
      state.deviceEffects = (mask | 0);
      persist();
      return state;
    },
    /** upsert 自动规则（ScheduleInfo 同构；id 缺省自增 zen-rule-N） */
    upsertRule(rule) {
      if (!rule || !Array.isArray(rule.days)) return state;
      const id = typeof rule.id === 'string' && rule.id ? rule.id
        : `zen-rule-${state.rules.length + 1}`;
      const rec = {
        id,
        label: typeof rule.label === 'string' ? rule.label.slice(0, 64) : '',
        days: bitmaskToDays(daysToBitmask(rule.days)),
        startMinute: Math.max(0, Math.min(DAY_MINUTES - 1, rule.startMinute | 0)),
        endMinute: Math.max(0, Math.min(DAY_MINUTES - 1, rule.endMinute | 0)),
        enabled: rule.enabled !== false,
      };
      const idx = state.rules.findIndex((r) => r.id === id);
      if (idx === -1) state.rules.push(rec); else state.rules[idx] = rec;
      persist();
      return state;
    },
    removeRule(id) {
      const idx = state.rules.findIndex((r) => r.id === id);
      if (idx !== -1) { state.rules.splice(idx, 1); persist(); }
      return state;
    },
    setRuleEnabled(id, on) {
      const r = state.rules.find((x) => x.id === id);
      if (r) { r.enabled = !!on; persist(); }
      return state;
    },
    /** 规则 eval（消费端每分钟 tick 调用）：返回 { changed, active }；
     *  到点规则存在 → manualActive=ruleDriven=true；无到点且 ruleDriven → 自动关断 */
    evalRules(now) {
      const active = evalScheduleRules(state.rules, now);
      const wasActive = state.manualActive;
      if (active.length) {
        if (!state.manualActive || !state.ruleDriven) {
          state.manualActive = true;
          state.ruleDriven = true;
          persist();
          return { changed: true, active, activated: true };
        }
        return { changed: false, active, activated: false };
      }
      if (state.manualActive && state.ruleDriven) {
        state.manualActive = false;
        state.ruleDriven = false;
        persist();
        return { changed: true, active: [], activated: false, deactivated: true };
      }
      return { changed: false, active: [], activated: false };
    },
    /** v10.97 #209：程序化外部来源登记（bedtime 睡眠模式等——AOSP 各 ZenRule 独立请求 zen 同构）。
     *  entry = { effects: ZenDeviceEffects 位掩码 }；session-only：不 persist（载入即清洗，
     *  外部来源是运行时程序态，跨会话残留=「看不见的勿扰」）。 */
    setExternalSource(id, { active, effects = 0 } = {}) {
      const key = String(id == null ? '' : id).trim();
      if (!key) return state;
      if (active) state.externalSources[key] = { effects: Math.max(0, effects | 0) };
      else delete state.externalSources[key];
      return state;
    },
    /** 清空全部外部来源（v10.97 #209：手动 override 逃生通道——QS 手动关闭即全清，
     *  宿主程序中途失联不悬挂勿扰；下个进窗边沿重新登记） */
    clearExternalSources() {
      state.externalSources = {};
      return state;
    },
    /** 激活外部来源的 ZenDeviceEffects 位并集（叠加进 overlay 合成；session-only） */
    externalEffects() {
      let m = 0;
      for (const k in state.externalSources) m |= (state.externalSources[k].effects | 0);
      return m;
    },
    /** 供测试/恢复场景重置（不 persist——工厂内状态重新 load 由调用方决定） */
    __reset(next) { state = next || defaultZenState(); return state; },
  };
}

// —— 显式单例（三方消费：notifications.js / quick-settings.js / lock-screen.js）——
export const zenStore = createZenStore();

/** 当前勿扰是否激活（manual ∪ ruleDriven ∪ externalSources，消费端统一入口）。
 *  v10.97 #209：外部来源并入生效判定（bedtime 睡眠模式等程序化请求，AOSP 规则激活
 *  期 zen 保持语义）——manualActive 不被外部源写入，手动意图零覆盖。 */
export function isZenActive() {
  const s = zenStore.getState();
  return !!s.manualActive || Object.keys(s.externalSources || {}).length > 0;
}

/** 当前生效的视觉抑制掩码（消费端统一入口） */
export function currentSuppressedVisuals() {
  const s = zenStore.getState();
  return suppressedVisualsFor(s.manualActive, s.suppressedVisuals);
}
