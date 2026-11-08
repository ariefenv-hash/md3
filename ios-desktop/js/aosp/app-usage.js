// ==================== aosp/app-usage.js — 应用前台使用时长统计核（#96 一期 · v10.81） ====================
//
// 权威源与边界（诚实标注）：
//   - 对标面：AOSP Digital Wellbeing 主屏（UsageStatsManager.queryEvents 开/闭事件对
//     ACTIVITY_RESUMED / ACTIVITY_PAUSED → 前台时长累计 + 逐日归档；UsageStatsService
//     daily 滚动归档同构）+ 应用排行（PowerUsageSummary 应用分片话语域）；
//   - **Web 域边界**：真实 UsageStats 是系统服务级逐事件落库（frameworks/base
//     UsageStatsService，事件真源在 system_server），Web 域无系统级埋点 → 本模块为
//     **项目内埋点消费核**：开/闭事件对由 app-window 开窗/关窗链路喂入
//     （recordAppOpened 同源信号面），统计口径 = 本机使用记录，消费 UI 必须明示
//     （设置页注记在录——铁律#2 超越边界写法，同 battery-health.js #100 惯例）；
//
// 口径（模拟近似，逐条注记）：
//   - 前台时长 = open→close 墙钟差（**单前台模型**：appOpened 先闭合悬挂会话——
//     AOSP 单任务前台假设 Web 近似；分屏/小窗期记为最后打开的应用）；
//   - 悬挂兜底：会话时长钳制 SESSION_CAP_MS（close 事件丢失防无限累计——
//     UsageStats 查询超时语义同构近似）；
//   - 跨午夜会话：ms 整段归属**闭合时刻**日桶，opens 归属**打开时刻**日桶
//     （事件流归桶口径近似，注记在录）；
//   - 持久化：localStorage 版本化 normalize 兜底（channelStore #207 同款范式），
//     日桶滚动保留 USAGE_MAX_DAYS 天（UsageStatsService daily 归档同构）。
//
// 纯逻辑模块：核函数零 DOM、零存储依赖（纯函数入参 state 出参新 state）；
// 持久化落点 createUsageStore 工厂（storage 注入隔离单测，notification-channel.js
// #207 同款）+ usageStore 单例。

/** 持久化真源键 */
export const APP_USAGE_KEY = 'ios-desktop:app-usage-v1';
/** schema 版本（normalize 兜底升级用） */
export const USAGE_SCHEMA_VERSION = 1;
/** 日桶滚动保留天数（UsageStatsService daily 归档同构） */
export const USAGE_MAX_DAYS = 7;
/** 单会话时长钳制（悬挂兜底：close 丢失防无限累计） */
export const SESSION_CAP_MS = 4 * 60 * 60 * 1000;
/** 单应用单日累计上限（持久化体积防爆炸） */
export const DAY_MS_CAP = 24 * 60 * 60 * 1000;
/** appId 落盘截断上限（channelStore 同款 64） */
export const APP_ID_MAX = 64;
/** 排行默认条数 */
export const RANKING_LIMIT = 8;

/** 空状态（冻结默认形态；open = appId → 打开时刻 ts 的在途会话表；counters = 设备级日事件计数） */
export const USAGE_DEFAULTS = Object.freeze({ version: USAGE_SCHEMA_VERSION, days: {}, open: {}, counters: {} });

/** 设备级事件计数种类（#96 二期：解锁次数/通知接收数——AOSP Wellbeing 两个统计卡同源话语域） */
export const USAGE_COUNTER_KINDS = Object.freeze({ UNLOCK: 'unlock', NOTIFY: 'notify' });

/** ms 归一：垃圾/负数/布尔 → 0（Number(true)=1 不得漂移，clampCycles #100 同款）；小数 floor；超上限钳制 */
export function clampUsageMs(v, cap = DAY_MS_CAP) {
  if (typeof v === 'boolean') return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const c = Number(cap);
  return Math.min(Number.isFinite(c) && c > 0 ? c : DAY_MS_CAP, Math.floor(n));
}

/** 本地时区日键 YYYY-MM-DD（日桶真源；ts 非法 → 当日缺省兜底） */
export function usageDayKey(ts) {
  const n = Number(ts);
  const d = new Date(Number.isFinite(n) && n > 0 ? n : Date.now());
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** appId 归一：截断 APP_ID_MAX（channelStore 同款）；垃圾 → ''（调用方零消费 no-op） */
function normAppId(appId) {
  if (typeof appId !== 'string' || !appId) return '';
  return appId.slice(0, APP_ID_MAX);
}

/** 状态归一（parse/内部双用）：days 逐桶逐应用钳制 + open 逐项 ts 钳制 + 越界日桶剔除 */
export function normalizeUsageState(raw) {
  let o = raw;
  if (typeof o === 'string') {
    try { o = JSON.parse(o); } catch (e) { return { ...USAGE_DEFAULTS, days: {}, open: {} }; }
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ...USAGE_DEFAULTS, days: {}, open: {} };
  const days = {};
  const srcDays = o.days && typeof o.days === 'object' && !Array.isArray(o.days) ? o.days : {};
  for (const dk of Object.keys(srcDays)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dk)) continue; // 越界键剔除（防注入垃圾桶）
    const bucket = srcDays[dk];
    if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) continue;
    const nb = {};
    for (const appId of Object.keys(bucket)) {
      const rec = bucket[appId];
      if (!rec || typeof rec !== 'object') continue;
      const ms = clampUsageMs(rec.ms);
      const opens = clampUsageMs(rec.opens, 9999); // 打开次数同函数族钳制（上限 9999 防 json 爆炸）
      if (!ms && !opens) continue; // 全零记录不入库
      nb[normAppId(appId)] = { ms, opens };
    }
    if (Object.keys(nb).length) days[dk] = nb;
  }
  const open = {};
  const srcOpen = o.open && typeof o.open === 'object' && !Array.isArray(o.open) ? o.open : {};
  for (const appId of Object.keys(srcOpen)) {
    const ts = Number(srcOpen[appId]);
    if (!Number.isFinite(ts) || ts <= 0) continue;
    const id = normAppId(appId);
    if (!id) continue;
    open[id] = Math.floor(ts);
  }
  const counters = {};
  const srcCounters = o.counters && typeof o.counters === 'object' && !Array.isArray(o.counters) ? o.counters : {};
  for (const dk of Object.keys(srcCounters)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dk)) continue;
    const bucket = srcCounters[dk];
    if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) continue;
    const unlock = clampUsageMs(bucket.unlock, 9999);
    const notify = clampUsageMs(bucket.notify, 9999);
    if (!unlock && !notify) continue;
    counters[dk] = { unlock, notify };
  }
  return { version: USAGE_SCHEMA_VERSION, days, open, counters };
}

/**
 * 打开事件（纯函数，不 mutation）：开新会话记 opens+1（归属打开时刻日桶）；
 * 已有在途会话幂等 no-op（防重复 open 事件双计——AOSP ACTIVITY_RESUMED 去重同语义）。
 * @param {object} state normalizeUsageState 形态
 * @param {string} appId
 * @param {number} ts 打开时刻
 */
export function recordUsageOpen(state, appId, ts) {
  const id = normAppId(appId);
  const t = Number(ts);
  if (!id || !Number.isFinite(t) || t <= 0) return state || { ...USAGE_DEFAULTS, days: {}, open: {} };
  const prev = normalizeUsageState(state);
  if (prev.open[id] != null) return prev; // 幂等：在途会话不重开
  const dk = usageDayKey(t);
  const bucket = { ...(prev.days[dk] || {}) };
  const rec = bucket[id] ? { ...bucket[id] } : { ms: 0, opens: 0 };
  rec.opens = clampUsageMs(rec.opens + 1, 9999);
  bucket[id] = rec;
  const days = { ...prev.days, [dk]: bucket };
  return { version: USAGE_SCHEMA_VERSION, days, open: { ...prev.open, [id]: Math.floor(t) }, counters: prev.counters || {} };
}

/**
 * 关闭事件（纯函数，不 mutation）：闭合在途会话 → 时长累计进**闭合时刻**日桶；
 * 无在途会话 no-op（防重复 close/孤儿 close 双计——事件对配齐才计账）。
 * 时长钳制 SESSION_CAP_MS（悬挂兜底）+ 日桶 DAY_MS_CAP（体积防爆炸）。
 * @param {object} state
 * @param {string} appId
 * @param {number} ts 关闭时刻
 */
export function recordUsageClose(state, appId, ts) {
  const id = normAppId(appId);
  const t = Number(ts);
  if (!id || !Number.isFinite(t) || t <= 0) return normalizeUsageState(state);
  const prev = normalizeUsageState(state);
  const start = prev.open[id];
  if (start == null) return prev; // 无会话：孤儿 close 零计账
  const open = { ...prev.open };
  delete open[id];
  const dur = clampUsageMs(t - start, SESSION_CAP_MS);
  const dk = usageDayKey(t);
  const bucket = { ...(prev.days[dk] || {}) };
  const rec = bucket[id] ? { ...bucket[id] } : { ms: 0, opens: 0 };
  rec.ms = clampUsageMs(rec.ms + dur);
  bucket[id] = rec;
  const days = { ...prev.days, [dk]: bucket };
  return { version: USAGE_SCHEMA_VERSION, days, open, counters: prev.counters || {} };
}

/**
 * 设备级事件计数（#96 二期纯函数，不 mutation）：unlock（真实解锁沿喂入——
 * completeUnlock/unlockAndOpen 两条真实路径；instantUnlock 测试钩子零计账）/
 * notify（闸后投递计数——zen/渠道拦截不计，NotificationManagerService enqueue
 * 拦截语义同构）。垃圾 kind/ts no-op；单类单日上限 9999（体积防爆炸）。
 * @param {object} state
 * @param {string} kind USAGE_COUNTER_KINDS 之一
 * @param {number} ts 事件时刻
 */
export function recordDeviceEvent(state, kind, ts) {
  const t = Number(ts);
  if (kind !== USAGE_COUNTER_KINDS.UNLOCK && kind !== USAGE_COUNTER_KINDS.NOTIFY) return normalizeUsageState(state);
  if (!Number.isFinite(t) || t <= 0) return normalizeUsageState(state);
  const prev = normalizeUsageState(state);
  const dk = usageDayKey(t);
  const bucket = { ...((prev.counters || {})[dk] || {}) };
  bucket[kind] = clampUsageMs((bucket[kind] || 0) + 1, 9999);
  const counters = { ...(prev.counters || {}), [dk]: bucket };
  return { version: USAGE_SCHEMA_VERSION, days: prev.days, open: prev.open, counters };
}

/**
 * 前台切换（纯函数）：close fromId + open toId（单前台模型消费点——
 * openApp 链路喂入，防 fromId 悬挂 + toId 幂等双计一体裁决）。
 * fromId 空值/相同 → 退化为纯 open（幂等守卫在 recordUsageOpen 内）。
 */
export function usageAppSwitch(state, fromId, toId, ts) {
  const t = Number(ts);
  const from = normAppId(fromId);
  const to = normAppId(toId);
  if (!Number.isFinite(t) || t <= 0) return normalizeUsageState(state);
  let next = normalizeUsageState(state);
  if (from && from !== to) next = recordUsageClose(next, from, t);
  if (to) next = recordUsageOpen(next, to, t);
  return next;
}
/**
 * 日桶滚动归档：按日键倒序保留 keep 天（UsageStatsService daily 归档同构）；
 * 在途会话不随归档丢弃（open 表与 days 解耦）。
 */
export function pruneUsageDays(state, keep = USAGE_MAX_DAYS) {
  const prev = normalizeUsageState(state);
  const k = clampUsageMs(keep, 365) || USAGE_MAX_DAYS;
  const keys = Object.keys(prev.days).sort().reverse().slice(0, k);
  const days = {};
  for (const dk of keys) days[dk] = prev.days[dk];
  const ckeys = Object.keys(prev.counters || {}).sort().reverse().slice(0, k);
  const counters = {};
  for (const dk of ckeys) counters[dk] = prev.counters[dk];
  return { version: USAGE_SCHEMA_VERSION, days, open: prev.open, counters };
}

/**
 * 应用排行（纯函数）：指定日桶 → [{ appId, ms, opens }] 按 ms 降序（平序 opens 降序，
 * 再平序 appId 字典序稳定输出）；limit 钳制 RANKING_LIMIT 上限。
 */
export function topUsageApps(state, dayKey, limit = RANKING_LIMIT) {
  const prev = normalizeUsageState(state);
  const dk = typeof dayKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dayKey) ? dayKey : usageDayKey(Date.now());
  const bucket = prev.days[dk] || {};
  const rows = Object.keys(bucket).map((appId) => ({ appId, ms: bucket[appId].ms, opens: bucket[appId].opens }));
  rows.sort((a, b) => (b.ms - a.ms) || (b.opens - a.opens) || (a.appId < b.appId ? -1 : a.appId > b.appId ? 1 : 0));
  const n = clampUsageMs(limit, 64);
  return n > 0 ? rows.slice(0, n) : rows.slice(0, RANKING_LIMIT);
}

/** 排行汇总 ms（UI 合计真源；rows 形态来自 topUsageApps） */
export function usageTotalMs(rows) {
  if (!Array.isArray(rows)) return 0;
  let sum = 0;
  for (const r of rows) sum += clampUsageMs(r && r.ms);
  return Math.min(sum, DAY_MS_CAP);
}

/** 持久化 codec —— 反序列化（normalize 全量兜底） */
export function parseUsageState(raw) {
  return normalizeUsageState(raw);
}

/** 持久化 codec —— 序列化（先归一再落盘；滚动归档在 store 层消费） */
export function serializeUsageState(state) {
  return JSON.stringify(normalizeUsageState(state));
}

/**
 * 使用统计 store 工厂（storage 注入隔离单测——channelStore #207 同款范式）。
 * 消费面：app-window.js 开/关窗链路喂入 appOpened/appClosed；设置页 36 读 dayTotals。
 */
export function createUsageStore({ storage } = {}) {
  const st = storage || (typeof localStorage !== 'undefined' ? localStorage : undefined);
  let state = { ...USAGE_DEFAULTS, days: {}, open: {} };
  try {
    const raw = st && st.getItem(APP_USAGE_KEY);
    if (raw) state = normalizeUsageState(JSON.parse(raw));
  } catch (e) { /* 损坏存档走默认 */ }
  function persist() {
    try { st && st.setItem(APP_USAGE_KEY, serializeUsageState(state)); } catch (e) { /* 忽略 */ }
  }
  function commit(next) {
    state = pruneUsageDays(next, USAGE_MAX_DAYS); // 写路径统一滚动归档
    persist();
    return state;
  }
  return {
    getState() { return state; },
    persist,
    /** 设备级事件计数（#96 二期：unlock/notify——喂入点见 lock-screen.js/notifications.js 注记） */
    deviceEvent(kind, ts = Date.now()) { return commit(recordDeviceEvent(state, kind, ts)); },
    /** 指定日设备计数（缺省当日） */
    dayCounters(dayKey) {
      const dk = typeof dayKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dayKey) ? dayKey : usageDayKey(Date.now());
      const b = (state.counters || {})[dk];
      return { unlock: b && b.unlock || 0, notify: b && b.notify || 0 };
    },
    /**
     * 打开（单前台模型消费点）：先闭合**其他**在途会话再开新会话——openApp 直切
     * 不经过 closeApp 链路（app-window-closed 只在关窗完成广播），悬挂的其他会话
     * 必须在此兜底闭合（AOSP 单任务前台假设 Web 近似；分屏/小窗期记为最后打开
     * 应用，注记在录）。同 appId 幂等（核内 recordUsageOpen 去重）。
     */
    appOpened(appId, ts = Date.now()) {
      const t = Number(ts);
      const prev = normalizeUsageState(state);
      let next = prev;
      for (const openId of Object.keys(prev.open)) {
        if (openId !== appId) next = recordUsageClose(next, openId, t); // 非法 t 由核函数防御（no-op）
      }
      next = recordUsageOpen(next, appId, t);
      return commit(next);
    },
    /** 关闭（孤儿 close 零计账——核内 no-op 语义同源） */
    appClosed(appId, ts = Date.now()) { return commit(recordUsageClose(state, appId, ts)); },
    /** 显式前台切换（appOpened 单参路径已含；直调面供测试与未来手势桥消费） */
    appSwitch(fromId, toId, ts = Date.now()) { return commit(usageAppSwitch(state, fromId, toId, ts)); },
    /** 指定日排行（缺省当日） */
    dayTotals(dayKey) { return topUsageApps(state, dayKey); },
    /** 当日日键（UI 合计真源锚） */
    todayKey() { return usageDayKey(Date.now()); },
  };
}

/** 单例（app-window.js 与设置页共用同一持久化真源） */
export const usageStore = createUsageStore();
