// ==================== aosp/wellbeing-focus.js — 应用计时器 + 专注模式纯逻辑核（#96 三期 · v10.80） ====================
//
// 权威源与边界（诚实标注）：
//   - 对标面：AOSP Digital Wellbeing「应用计时器」（App timers——per-app 每日限时，
//     到限后应用暂停：图标置灰 + 打开弹「应用已暂停」）与「专注模式」（Focus mode——
//     选定干扰应用暂停/恢复，开关持久至手动关闭）。两能力真源都在 Wellbeing 应用
//     （Google 侧），AOSP 核心框架无对应 system_server 服务——移植判据取公开语义面；
//   - **Web 域边界**（铁律#2 超越边界写法，battery-health.js #100 同款惯例）：
//     限时口径 = 本机前台使用记录（aosp/app-usage.js usageStore days 日桶 ms——
//     单会话 4h 钳制 / 跨午夜归闭合日桶口径同源承袭），非系统级真实使用；
//     暂停拦截 = openApp 前置守卫（toast + 不开窗）；已开窗口不即时关闭、桌面图标
//     置灰、到期即时暂停弹窗——AOSP 完整形态超越项留点（注记在录）；
//
// 三模式合并裁决（#96 三期规格：与 focus.js / profiles.js 避免概念打架，裁决在录）：
//   - focus.js 番茄钟 = 会话级时间盒（25/5 循环 + 自动 DND，session-only）——保留不动；
//   - profiles.js 场景快照 = 外观域（壁纸/色相/图标布局 + dnd 记忆）——保留不动；
//   - 本模块专注模式 = **应用可用性域**（选定应用暂停/恢复，持久化）——AOSP Focus
//     mode 同语义。三概念分层：勿扰（zen-mode）/ 外观（profiles）/ 应用可用性
//     （本模块），互不覆写零耦合——专注模式不联动 DND（AOSP Focus mode 同语义，
//     勿扰是独立磁贴；判定顺序：focus 暂停优先于 timer 暂停，在录）。
//
// 纯逻辑模块：核函数零 DOM、零存储依赖、零 import（app-usage 判定面由调用方喂入
// usedMs——分层解耦，aosp 家族内单向数据流）；持久化落点 createWellbeingStore
// 工厂（storage 注入隔离单测，createUsageStore #96 一期同款范式）+ wellbeingStore 单例。

/** 持久化真源键 */
export const WELLBEING_FOCUS_KEY = 'ios-desktop:wellbeing-focus-v1';
/** schema 版本（normalize 兜底升级用） */
export const WELLBEING_FOCUS_SCHEMA_VERSION = 1;
/** 单应用每日限时上限（分钟）——1440 = 24h（AOSP 计时器 23h55m 档位近似取整，注记在录） */
export const APP_LIMIT_MAX_MIN = 1440;
/** 限时毫秒换算（判定面入参换算基） */
export const LIMIT_MIN_MS = 60 * 1000;
/** appId 截断上限（app-usage normAppId 同款 64） */
export const WB_APP_ID_MAX = 64;
/** 专注模式应用清单上限（持久化体积防爆炸） */
export const FOCUS_APPS_MAX = 64;

/** 空状态（冻结默认形态；limits = appId → 每日限时分钟（0/非法不入库）；focusApps = 去重保序清单） */
export const WELLBEING_FOCUS_DEFAULTS = Object.freeze({
  version: WELLBEING_FOCUS_SCHEMA_VERSION,
  limits: {},
  focusApps: [],
  focusActive: false,
});

/** usedMs 归一：垃圾/负数/布尔 → 0（Number(true)=1 不得漂移，clampUsageMs #96 一期同款纪律）；小数 floor */
function clampUsedMs(v) {
  if (typeof v === 'boolean') return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

/** 限时分钟归一：垃圾/负数/布尔 → 0（=清除）；小数 floor；上限 APP_LIMIT_MAX_MIN */
export function clampLimitMin(v) {
  if (typeof v === 'boolean') return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(APP_LIMIT_MAX_MIN, Math.floor(n));
}

/** appId 归一：截断 WB_APP_ID_MAX；垃圾 → ''（调用方零消费 no-op） */
function normAppId(appId) {
  if (typeof appId !== 'string' || !appId) return '';
  return appId.slice(0, WB_APP_ID_MAX);
}

/** 状态归一（parse/内部双用）：limits 逐项钳制（0/非法剔除）+ focusApps 去空去重保序截断 + focusActive 严格 true */
export function normalizeWellbeingState(raw) {
  let o = raw;
  if (typeof o === 'string') {
    try { o = JSON.parse(o); } catch (e) { return { ...WELLBEING_FOCUS_DEFAULTS, limits: {}, focusApps: [] }; }
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ...WELLBEING_FOCUS_DEFAULTS, limits: {}, focusApps: [] };
  const limits = {};
  const srcLimits = o.limits && typeof o.limits === 'object' && !Array.isArray(o.limits) ? o.limits : {};
  for (const appId of Object.keys(srcLimits)) {
    const id = normAppId(appId);
    if (!id) continue;
    const min = clampLimitMin(srcLimits[appId]);
    if (!min) continue; // 0 = 未限时，不入库
    limits[id] = min;
  }
  const srcList = Array.isArray(o.focusApps) ? o.focusApps : [];
  const seen = {};
  const focusApps = [];
  for (const item of srcList) {
    const id = normAppId(item);
    if (!id || seen[id]) continue;
    if (focusApps.length >= FOCUS_APPS_MAX) break; // 上限截断（体积防爆炸）
    seen[id] = true;
    focusApps.push(id);
  }
  return {
    version: WELLBEING_FOCUS_SCHEMA_VERSION,
    limits,
    focusApps,
    focusActive: o.focusActive === true,
  };
}

/** 设限时（纯函数，不 mutation）：minutes 0 = 清除该应用限时（AOSP「移除计时器」同语义） */
export function setAppLimit(state, appId, minutes) {
  const id = normAppId(appId);
  const min = clampLimitMin(minutes);
  const prev = normalizeWellbeingState(state);
  if (!id) return prev;
  const limits = { ...prev.limits };
  if (min > 0) limits[id] = min;
  else delete limits[id];
  return { version: WELLBEING_FOCUS_SCHEMA_VERSION, limits, focusApps: prev.focusApps, focusActive: prev.focusActive };
}

/** 设专注清单（纯函数，全量替换）：去空/去重保序/截断 FOCUS_APPS_MAX（AOSP 多选清单语义） */
export function setFocusApps(state, list) {
  const src = Array.isArray(list) ? list : [];
  const seen = {};
  const focusApps = [];
  for (const item of src) {
    const id = normAppId(item);
    if (!id || seen[id]) continue;
    if (focusApps.length >= FOCUS_APPS_MAX) break;
    seen[id] = true;
    focusApps.push(id);
  }
  const prev = normalizeWellbeingState(state);
  return { version: WELLBEING_FOCUS_SCHEMA_VERSION, limits: prev.limits, focusApps, focusActive: prev.focusActive };
}

/** 专注开关（纯函数）：严格 boolean 归一（truthy 不漂移——focusActive === true 才生效） */
export function setFocusActive(state, flag) {
  const prev = normalizeWellbeingState(state);
  return { version: WELLBEING_FOCUS_SCHEMA_VERSION, limits: prev.limits, focusApps: prev.focusApps, focusActive: flag === true };
}

/**
 * 暂停判定链（纯函数）：专注模式（开关开 + 清单命中）优先于计时器（限时用尽）——
 * 明确的模式暂停盖过计时器余量（判定顺序在录；两机制可并存于同一应用）。
 * @returns {null|'focus'|'timer'} null = 未暂停
 */
export function pausedReason(state, appId, usedMs) {
  const id = normAppId(appId);
  if (!id) return null;
  const prev = normalizeWellbeingState(state);
  if (prev.focusActive && prev.focusApps.indexOf(id) !== -1) return 'focus';
  const limit = prev.limits[id] || 0;
  if (limit > 0 && clampUsedMs(usedMs) >= limit * LIMIT_MIN_MS) return 'timer';
  return null;
}

/**
 * 限时剩余 ms：无限时 → -1 哨兵（UI 不渲染剩余行）；限时中 → max(0, 限-已用)；到限 → 0。
 */
export function remainingMs(state, appId, usedMs) {
  const id = normAppId(appId);
  if (!id) return -1;
  const prev = normalizeWellbeingState(state);
  const limit = prev.limits[id] || 0;
  if (limit <= 0) return -1;
  return Math.max(0, limit * LIMIT_MIN_MS - clampUsedMs(usedMs));
}

/** 持久化 codec —— 反序列化（normalize 全量兜底） */
export function parseWellbeingState(raw) {
  return normalizeWellbeingState(raw);
}

/** 持久化 codec —— 序列化（先归一再落盘） */
export function serializeWellbeingState(state) {
  return JSON.stringify(normalizeWellbeingState(state));
}

/**
 * store 工厂（storage 注入隔离单测——createUsageStore #96 一期同款范式）。
 * 消费面：app-window.js openApp 前置守卫 + 关窗到期沿；设置页 36 专注/计时器卡。
 */
export function createWellbeingStore({ storage } = {}) {
  const st = storage || (typeof localStorage !== 'undefined' ? localStorage : undefined);
  let state = { ...WELLBEING_FOCUS_DEFAULTS, limits: {}, focusApps: [] };
  try {
    const raw = st && st.getItem(WELLBEING_FOCUS_KEY);
    if (raw) state = normalizeWellbeingState(JSON.parse(raw));
  } catch (e) { /* 损坏存档走默认 */ }
  function persist() {
    try { st && st.setItem(WELLBEING_FOCUS_KEY, serializeWellbeingState(state)); } catch (e) { /* 忽略 */ }
  }
  function commit(next) {
    state = normalizeWellbeingState(next);
    persist();
    return state;
  }
  return {
    getState() { return state; },
    persist,
    /** 设每日限时（minutes 0 = 清除） */
    setLimit(appId, minutes) { return commit(setAppLimit(state, appId, minutes)); },
    /** 设专注清单（全量替换） */
    setFocusApps(list) { return commit(setFocusApps(state, list)); },
    /** 专注开关 */
    setFocusActive(flag) { return commit(setFocusActive(state, flag)); },
    /** 专注清单读面（快照副本，防外部 mutation 直改真源） */
    focusApps() { return state.focusApps.slice(); },
    /** 专注开关读面 */
    focusActive() { return state.focusActive === true; },
    /** 指定应用限时读面（0 = 未限时） */
    limitOf(appId) { return state.limits[normAppId(appId)] || 0; },
    /** 全量限时读面（快照副本——计时器卡渲染真源） */
    limits() { return { ...state.limits }; },
    /** 暂停判定（usedMs 由调用方从 usageStore 喂入——分层解耦单向数据流） */
    pausedReason(appId, usedMs) { return pausedReason(state, appId, usedMs); },
    /** 限时剩余（无限时 -1 哨兵） */
    remainingMs(appId, usedMs) { return remainingMs(state, appId, usedMs); },
  };
}

/** 单例（app-window.js 与设置页 36 共用同一持久化真源） */
export const wellbeingStore = createWellbeingStore();
