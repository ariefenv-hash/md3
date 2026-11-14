// ==================== battery-service.js — 设备电量单一真源（状态栏 / 设置 / 查找共享） ====================
//
// 设计目标：
//   1. 全系统唯一的 Battery Status API 接入点：状态栏、设置「电池」页、查找应用等
//      全部从本模块读取，杜绝各处硬编码电量导致的数值不同步；
//   2. 订阅式广播：电量/充电状态变化时通知所有订阅者，页面无需轮询；
//   3. 浏览器不支持（Safari/Firefox）或权限拒绝时优雅降级：保持默认电量，
//      supported=false 供 UI 决定是否隐藏"预计可用时间"等真实设备才有意义的字段。
//
// v7.23 速率测量层（耗/充 1 格用时反推）：
//   - 每次电量或充电状态变化记录一条样本，同模式下相邻样本的耗时/格数
//     即为"耗 1 格 / 充 1 格"的实测速率（滚动加权，近期样本权重更高）；
//   - 放电：剩余可用时长 ≈ 当前电量 × 每格耗时；充电：充满时长 ≈ (100-电量) × 每格耗时；
//   - 速率持久化到 localStorage（14 天内有效），刷新后无需重新测量即可估时；
//   - 浏览器无 Battery API 时启动模拟电池引擎（virtual battery）：可真实观察的
//     耗/充电节律 + 壁钟追赶 + 省电模式联动 + E2E 加速钩子（window.__batterySim）。
//
// v11.27 #100 电池健康层：充电吞吐累计（等效满充循环口径）+ 充电上限闸
//   （A14+ BatteryChargeLimit 语义，限充开启时模拟引擎充至 80% 冻结——三处推进点
//   全覆盖）+ getBatteryHealth/setChargeLimit 出口。纯模型在 aosp/battery-health.js
//   （零 DOM 零依赖，循环恒派生防双字段失同步），落盘键 ios-desktop:battery-health-v1；
//   Web 域无 fuel gauge BMS → 健康度为模拟模型，UI 明示标注（消费点 settings-battery.js）。

import { BATTERY_HEALTH_KEY, parseHealthState, serializeHealthState, recordChargeDelta, chargeHoldReached, cyclesFromThroughput, CHARGE_LIMIT_PCT } from './aosp/battery-health.js';

/** @typedef {{ level: number, charging: boolean, chargingTime: number, dischargingTime: number, supported: boolean, rates: BatteryRates }} BatterySnapshot */

/** @typedef {{ dischargeMsPerPct: number|null, chargeMsPerPct: number|null, dischargeSamples: number, chargeSamples: number }} BatteryRates */

const FALLBACK_LEVEL = 85;

// v9.94 #36：低电警告阈值（AOSP BatteryService mLowBatteryWarningLevel = 15）
const LOW_BATTERY_WARNING_LEVEL = 15;
/** 低电警告激活态（迟滞标志，跨 applyState 调用保持） */
let lowWarningActive = false;

// ---------- 速率测量（纯逻辑，单测直测） ----------

/** 单条样本的时间戳与电量快照（charging 用于切分模式边界） */
/** @typedef {{ t: number, level: number, charging: boolean }} BatterySample */

/** 速率合理区间（毫秒/格）：过快（页面刷新抖动）/过慢（跨天休眠）都视为脏样本丢弃 */
const DISCHARGE_MS_BOUNDS = [8_000, 6 * 3600_000];
const CHARGE_MS_BOUNDS = [4_000, 6 * 3600_000];
/** 滚动窗口：每个模式最多保留最近 6 段间隔 */
const RATE_WINDOW = 6;

/**
 * 从样本序列推导「每 1 格电耗时」。
 * 纯函数：同模式相邻样本间 (耗时 ÷ |Δ格数|) 逐段折算，近期样本权重更高
 * （权重数组按窗口内新旧次序 1.0 → 2.4 递增），跨模式边界的样本对不参与计算。
 * @param {BatterySample[]} samples 时间升序样本
 * @returns {{ dischargeMsPerPct: number|null, chargeMsPerPct: number|null, dischargeSamples: number, chargeSamples: number }}
 */
export function computeRatesFromSamples(samples) {
  const drain = [];
  const charge = [];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (!a || !b || b.t <= a.t) continue;
    if (a.charging !== b.charging) continue; // 模式切换边界：耗/充不连续，跳过
    const dLevel = Math.abs(a.level - b.level);
    if (dLevel < 1) continue;
    const perPct = (b.t - a.t) / dLevel;
    if (a.charging) charge.push(perPct);
    else drain.push(perPct);
  }
  // 只保留最近 RATE_WINDOW 段
  const recentDrain = drain.slice(-RATE_WINDOW);
  const recentCharge = charge.slice(-RATE_WINDOW);
  return {
    dischargeMsPerPct: weightedRate(recentDrain, DISCHARGE_MS_BOUNDS),
    chargeMsPerPct: weightedRate(recentCharge, CHARGE_MS_BOUNDS),
    dischargeSamples: recentDrain.length,
    chargeSamples: recentCharge.length,
  };
}

/** 加权平均（越新权重越高）；区间外的脏段直接剔除 */
function weightedRate(list, bounds) {
  const clean = list.filter((v) => v >= bounds[0] && v <= bounds[1]);
  if (clean.length === 0) return null;
  let sum = 0;
  let wsum = 0;
  clean.forEach((v, i) => {
    const w = 1 + (i / Math.max(1, clean.length - 1)) * 1.4; // 1.0 → 2.4
    sum += v * w;
    wsum += w;
  });
  return Math.round(sum / wsum);
}

// ---------- 持久化 ----------

const RATES_KEY = 'ios-desktop:battery-rates';
const RATES_MAX_AGE_MS = 14 * 24 * 3600_000; // 速率两周内有效（太久远的节律不再可信）
const SIM_LEVEL_KEY = 'ios-desktop:battery-sim-level';
const SIM_CATCHUP_MAX = 3;                   // 壁钟追赶上限（页签休眠回来不瞬间大跳）

function loadPersistedRates() {
  try {
    const raw = JSON.parse(localStorage.getItem(RATES_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return null;
    if (!Number.isFinite(raw.ts) || Date.now() - raw.ts > RATES_MAX_AGE_MS) return null;
    const d = Number(raw.dischargeMsPerPct);
    const c = Number(raw.chargeMsPerPct);
    return {
      dischargeMsPerPct: (Number.isFinite(d) && d >= DISCHARGE_MS_BOUNDS[0] && d <= DISCHARGE_MS_BOUNDS[1]) ? d : null,
      chargeMsPerPct: (Number.isFinite(c) && c >= CHARGE_MS_BOUNDS[0] && c <= CHARGE_MS_BOUNDS[1]) ? c : null,
      dischargeSamples: Math.max(0, Math.min(RATE_WINDOW, Number(raw.dischargeSamples) || 0)),
      chargeSamples: Math.max(0, Math.min(RATE_WINDOW, Number(raw.chargeSamples) || 0)),
    };
  } catch (e) { return null; }
}

function persistRates() {
  try {
    localStorage.setItem(RATES_KEY, JSON.stringify({
      ...rateState.rates,
      ts: Date.now(),
    }));
  } catch (e) { /* 存储不可用：仅会话内可用 */ }
}

// ---------- 状态 ----------

/** 当前电量快照（level: 0~100 整数；chargingTime/dischargingTime: 秒，Infinity 表示未知） */
const batteryState = {
  level: FALLBACK_LEVEL,
  charging: false,
  chargingTime: Infinity,
  dischargingTime: Infinity,
  supported: false,
};

/** 速率测量状态（样本环形缓存 + 派生速率） */
const rateState = {
  /** @type {BatterySample[]} */ samples: [],
  /** @type {BatteryRates} */ rates: { dischargeMsPerPct: null, chargeMsPerPct: null, dischargeSamples: 0, chargeSamples: 0 },
  seeded: false, // 是否已有历史持久化速率（估时可先行展示）
};

const subscribers = new Set();
let initialized = false;

// ---------- v11.27 #100：电池健康状态（充电吞吐单真源 + 循环派生 + 限充开关） ----------

/** 健康状态（totalChargePct 为唯一落盘真源，cycles 恒派生——aosp/battery-health.js 口径） */
let healthState = { totalChargePct: 0, limitOn: false, ts: 0 };
/** v11.27 #100 首拍闸：首拍（fallback 回填 / 真实 API 首同步）不累计吞吐——
 *  防 FALLBACK_LEVEL(85)→真实档位跳变被记成幻影吞吐（真机插电冷启动实测 e2e 抓获） */
let healthArmed = false;

function loadPersistedHealth() {
  try {
    return parseHealthState(localStorage.getItem(BATTERY_HEALTH_KEY));
  } catch (e) { return parseHealthState(null); }
}

function persistHealth() {
  try {
    localStorage.setItem(BATTERY_HEALTH_KEY, serializeHealthState(healthState));
  } catch (e) { /* 存储不可用：仅会话内可用 */ }
}

/** 当前充电上限（%）：限充开启 → CHARGE_LIMIT_PCT(80)；关闭 → 100（无限制） */
function chargeCeiling() {
  return healthState.limitOn ? CHARGE_LIMIT_PCT : 100;
}

/** 记录一条样本并重算速率（level 或 charging 任一变化时调用）。
 *  样本时间戳 = 壁钟 + 合成偏移（E2E 快进时给同步推进的样本以真实间隔，
 *  否则间隔≈0 会被速率区间过滤当脏数据丢弃；自然节拍下偏移恒 0） */
const simSampleClock = { offset: 0 };

function pushSample(level, charging) {
  const t = Date.now() + simSampleClock.offset;
  const last = rateState.samples[rateState.samples.length - 1];
  if (last && last.level === level && last.charging === charging) return false; // 无变化
  rateState.samples.push({ t, level, charging });
  if (rateState.samples.length > RATE_WINDOW * 2 + 2) {
    rateState.samples.splice(0, rateState.samples.length - (RATE_WINDOW * 2 + 2));
  }
  rateState.rates = computeRatesFromSamples(rateState.samples);
  // 已有持久化底子且新窗口尚未攒够样本：保留旧速率/旧次数不被"测量中"覆盖
  // （刷新后估时无需从头再等一格；14 天龄期由 loadPersistedRates 统一约束）
  if (rateState.seeded) {
    const seed = loadPersistedRates();
    if (seed) {
      if (rateState.rates.dischargeMsPerPct === null && seed.dischargeMsPerPct !== null) {
        rateState.rates.dischargeMsPerPct = seed.dischargeMsPerPct;
        rateState.rates.dischargeSamples = seed.dischargeSamples;
      }
      if (rateState.rates.chargeMsPerPct === null && seed.chargeMsPerPct !== null) {
        rateState.rates.chargeMsPerPct = seed.chargeMsPerPct;
        rateState.rates.chargeSamples = seed.chargeSamples;
      }
    }
  }
  persistRates();
  return true;
}

/**
 * 将电量/充电态写入快照并广播（真实 API 与模拟引擎共用落点）。
 * @param {{ level: number, charging: boolean, chargingTime?: number, dischargingTime?: number, supported?: boolean }} next
 */
function applyState(next) {
  const nextLevel = Math.min(100, Math.max(0, Math.round(next.level)));
  const nextCharging = !!next.charging;
  const nextChargeT = Number.isFinite(next.chargingTime) ? next.chargingTime : Infinity;
  const nextDischargeT = Number.isFinite(next.dischargingTime) ? next.dischargingTime : Infinity;

  const changed =
    nextLevel !== batteryState.level ||
    nextCharging !== batteryState.charging ||
    nextChargeT !== batteryState.chargingTime ||
    nextDischargeT !== batteryState.dischargingTime;

  // v7.74（issue #9）：充电沿检测（真实 API 与模拟充电器共用）——
  // 供 charging-ripple.js 播放 SystemUI 充电涟漪；必须在赋值前采样旧值
  const chargingJustStarted = nextCharging && !batteryState.charging;

  // v9.94 #36：低电沿检测（BatteryService mLowBatteryWarningLevel=15 语义）——
  // 进入：电量跌破 15% 且非充电态（AOSP 低电警告在充电中不响）；解除：回升至
  // ≥16%（1% 迟滞防 14~16 抖动区间反复触发）或接入充电器。仅供 sound-haptics
  // 播放 LowBattery 提示音，通知面行为不在本模块范围（#99 渠道另案）。
  const prevLevelForLow = batteryState.level;
  const lowJustEntered = !lowWarningActive && !nextCharging && prevLevelForLow > LOW_BATTERY_WARNING_LEVEL && nextLevel <= LOW_BATTERY_WARNING_LEVEL;
  const lowJustCleared = lowWarningActive && (nextLevel > LOW_BATTERY_WARNING_LEVEL + 1 || nextCharging);

  batteryState.level = nextLevel;
  batteryState.charging = nextCharging;
  batteryState.chargingTime = nextChargeT;
  batteryState.dischargingTime = nextDischargeT;
  if (typeof next.supported === 'boolean') batteryState.supported = next.supported;

  // v11.27 #100：充电吞吐累计（充电且电量上升时；真实 API 与模拟充电器共用——
  // 等效满充循环口径，每充入 100% ≈ 1 循环；首拍闸放行后才开始累计）
  const healthDelta = nextLevel - prevLevelForLow;
  if (healthArmed && nextCharging && healthDelta > 0) {
    healthState = recordChargeDelta(healthState, healthDelta, true);
    persistHealth();
  }
  healthArmed = true;

  const sampleAdded = pushSample(nextLevel, nextCharging);
  if (changed || sampleAdded) notify();

  if (chargingJustStarted) {
    try {
      document.dispatchEvent(new CustomEvent('battery-charging-started', { detail: { level: nextLevel } }));
    } catch (e) { /* 事件派发失败不阻断状态广播 */ }
  }

  // v9.94 #36：低电沿状态翻转与事件派发（sound-haptics 消费播 LowBattery 音）
  if (lowJustEntered) lowWarningActive = true;
  if (lowJustCleared) lowWarningActive = false;
  if (lowJustEntered || lowJustCleared) {
    try {
      document.dispatchEvent(new CustomEvent('battery-low-warning', { detail: { level: nextLevel, active: lowWarningActive } }));
    } catch (e) { /* 事件派发失败不阻断状态广播 */ }
  }
}

function notify() {
  const snapshot = { ...batteryState, rates: { ...rateState.rates } };
  subscribers.forEach((fn) => {
    try { fn(snapshot); } catch (e) { /* 订阅者异常不阻断广播 */ }
  });
}

// ---------- 真实 Battery Status API ----------

/**
 * 将 BatteryManager 的原始状态同步进快照并广播。
 * @param {BatteryManager} bm
 */
function syncFromManager(bm) {
  const rawLevel = typeof bm.level === 'number' && Number.isFinite(bm.level) ? bm.level : FALLBACK_LEVEL / 100;
  applyState({
    level: rawLevel * 100,
    charging: bm.charging,
    chargingTime: typeof bm.chargingTime === 'number' ? bm.chargingTime : Infinity,
    dischargingTime: typeof bm.dischargingTime === 'number' ? bm.dischargingTime : Infinity,
    supported: true,
  });
}

// ---------- 模拟电池引擎（浏览器无 Battery API 时） ----------
//
// 节律设计：默认耗 1 格约 72s、充 1 格约 56s（含 ±12% 抖动），高电量段
// 模拟 CC/CV 恒压尾段降速（90%↑ ×1.5、96%↑ ×2.4）；省电模式耗电 ×1.4 减速。
// 全部走壁钟（setTimeout 节拍 + 唤醒追赶），页签休眠回来最多补 3 格。

const SIM_DISCHARGE_BASE_MS = 72_000;
const SIM_CHARGE_BASE_MS = 56_000;

const sim = {
  running: false,
  charging: false,
  timer: 0,
  nextAt: 0,       // 下一次变格的壁钟时刻
  tickScale: 1,    // E2E 加速倍率（1 = 真实节律）
  saverOn: false,  // 省电模式（耗电放缓）
};

function simSaverActive() {
  try { return document.body.classList.contains('battery-saver-mode'); } catch (e) { return false; }
}

/** 计算下一格的间隔（毫秒）—— 模式 / 电量段 / 省电 / 抖动 全量纳入 */
function simIntervalMs(level, charging) {
  let per;
  if (charging) {
    per = SIM_CHARGE_BASE_MS
      * (level >= 96 ? 2.4 : level >= 90 ? 1.5 : 1)
      * simTickJitter();
  } else {
    per = SIM_DISCHARGE_BASE_MS
      * (sim.saverOn || simSaverActive() ? 1.4 : 1)
      * (level <= 5 ? 1.15 : 1)
      * simTickJitter();
  }
  return Math.max(1000, Math.round(per * sim.tickScale));
}

function simTickJitter() {
  return 0.88 + Math.random() * 0.24; // ±12%
}

/** 推进一格并排下一拍（v11.27 #100：限充闸——充至 ceiling 冻结电量，充电态保持） */
function simAdvanceStep() {
  const lvl = batteryState.level;
  const ceiling = chargeCeiling();
  if (sim.charging) {
    if (lvl < ceiling) applyState({ level: lvl + 1, charging: true });
    else applyState({ level: lvl, charging: true });
  } else {
    if (lvl > 0) applyState({ level: lvl - 1, charging: false });
    else applyState({ level: 0, charging: false });
  }
  persistSimLevel();
  scheduleSimTick();
}

function scheduleSimTick() {
  if (!sim.running) return;
  clearTimeout(sim.timer);
  const interval = simIntervalMs(batteryState.level, sim.charging);
  sim.nextAt = Date.now() + interval;
  sim.timer = setTimeout(simWake, interval);
}

/** 壁钟唤醒：休眠追赶（最多 SIM_CATCHUP_MAX 格）后排下一拍 */
function simWake() {
  if (!sim.running) return;
  const drift = Date.now() - sim.nextAt;
  const per = simIntervalMs(batteryState.level, sim.charging);
  const missed = Math.floor(drift / per);
  if (missed >= 1) {
    const steps = Math.min(missed, SIM_CATCHUP_MAX);
    const ceiling = chargeCeiling(); // v11.27 #100：追赶推进同受限充闸约束
    for (let i = 0; i < steps; i++) {
      const lvl = batteryState.level;
      if (sim.charging && lvl >= ceiling) break;
      if (!sim.charging && lvl <= 0) break;
      applyState({
        level: sim.charging ? lvl + 1 : lvl - 1,
        charging: sim.charging,
      });
    }
    persistSimLevel();
  }
  simAdvanceStep(); // 本拍本体 + 排程
}

function persistSimLevel() {
  try {
    localStorage.setItem(SIM_LEVEL_KEY, JSON.stringify({ level: batteryState.level, ts: Date.now() }));
  } catch (e) {}
}

/** 恢复上次模拟电量：按壁钟流逝以默认节律快进（最多 5 格，防大跳） */
function restoreSimLevel() {
  try {
    const raw = JSON.parse(localStorage.getItem(SIM_LEVEL_KEY) || 'null');
    if (!raw || !Number.isFinite(raw.level)) return FALLBACK_LEVEL;
    let level = Math.min(100, Math.max(0, Math.round(raw.level)));
    const elapsed = Date.now() - (Number.isFinite(raw.ts) ? raw.ts : Date.now());
    if (elapsed > 0 && level > 0) {
      const drop = Math.min(5, Math.floor(elapsed / SIM_DISCHARGE_BASE_MS));
      level = Math.max(0, level - drop);
    }
    return level;
  } catch (e) { return FALLBACK_LEVEL; }
}

/** 启动模拟引擎（幂等；真实 API 可用时由调用方保证不启动） */
function startSimEngine() {
  if (sim.running) return;
  sim.running = true;
  applyState({ level: restoreSimLevel(), charging: false, supported: false });
  scheduleSimTick();
}

/** E2E / 调试钩子 */
function installSimHook() {
  if (typeof window === 'undefined' || window.__batterySim) return;
  window.__batterySim = {
    /** 是否模拟引擎在跑 */
    active: () => sim.running,
    /** 接入/拔出充电器（仅模拟模式有效） */
    setCharging(on) {
      if (!sim.running) return false;
      const next = !!on;
      if (sim.charging === next) return true;
      sim.charging = next;
      applyState({ level: batteryState.level, charging: next });
      scheduleSimTick(); // 立即按新模式重排节拍
      return true;
    },
    isCharging: () => sim.charging,
    /** 节拍倍率（<1 加速；0.02 → 72s/格 ≈ 1.4s/格） */
    setTickScale(scale) {
      const v = Number(scale);
      if (!Number.isFinite(v) || v <= 0) return false;
      sim.tickScale = Math.min(1, v);
      scheduleSimTick();
      return true;
    },
    /** 立即同步推进 n 格（走完整 applyState：样本/速率/广播全链路）。
     *  stepMs：可选的每格合成间隔 —— 给样本以真实耗时的时间戳，
     *  快进场景下速率测量依然成立（默认 0 = 同步连推，仅改电量不产生有效速率样本） */
    forceSteps(n, stepMs) {
      if (!sim.running) return batteryState.level;
      const steps = Math.max(1, Math.min(60, Math.round(n) || 1));
      const syn = Number.isFinite(stepMs) && stepMs > 0 ? stepMs : 0;
      const ceiling = chargeCeiling(); // v11.27 #100：快进推进同受限充闸约束
      simSampleClock.offset = 0;
      for (let i = 0; i < steps; i++) {
        const lvl = batteryState.level;
        if (sim.charging) { if (lvl >= ceiling) break; applyState({ level: lvl + 1, charging: true }); }
        else { if (lvl <= 0) break; applyState({ level: lvl - 1, charging: false }); }
        if (syn) simSampleClock.offset += syn;
      }
      simSampleClock.offset = 0; // 回归真实时钟（后续真实样本早于合成时间戳 → 计算侧安全跳过）
      persistSimLevel();
      scheduleSimTick();
      return batteryState.level;
    },
  };
}

// ---------- 初始化 ----------

/** 模块加载即尝试接入真实 API；不可用则启动模拟引擎（幂等） */
function ensureInit() {
  if (initialized) return;
  initialized = true;

  // 历史速率先回填（估时可先行展示，无需等新样本）
  const persisted = loadPersistedRates();
  if (persisted) {
    rateState.rates = { ...persisted };
    rateState.seeded = true;
  }

  // v11.27 #100：健康状态回填（垃圾档归一由 parseHealthState 统一兜底）
  healthState = loadPersistedHealth();

  let gotReal = false;
  if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
    navigator.getBattery()
      .then((bm) => {
        gotReal = true;
        syncFromManager(bm);
        bm.addEventListener('levelchange', () => syncFromManager(bm));
        bm.addEventListener('chargingchange', () => syncFromManager(bm));
        bm.addEventListener('chargingtimechange', () => syncFromManager(bm));
        bm.addEventListener('dischargingtimechange', () => syncFromManager(bm));
      })
      .catch(() => { /* 降级：保持默认快照 */ });
  }
  // getBattery 存在但 Promise 拒绝 / 返回不可用值 → 下一拍启动模拟；
  // 真实 API 接管成功则模拟永不启动（gotReal 置位先于该定时器触发）
  if (typeof navigator === 'undefined' || typeof navigator.getBattery !== 'function') {
    startSimEngine();
  } else {
    setTimeout(() => { if (!gotReal) startSimEngine(); }, 600);
  }
  installSimHook();
}

/** @returns {BatterySnapshot} 当前电量快照（副本，外部改动不影响内部状态） */
export function getBatteryState() {
  ensureInit();
  return { ...batteryState, rates: { ...rateState.rates } };
}

// v8.26 #48：window 桥 —— 设置「关于手机」电池信息行（页面 content 内联脚本，无 module
// import 能力）读取同一快照，保证与电池子页/状态栏单一真源一致（subscribeBattery 家族同律）。
if (typeof window !== 'undefined') {
  window.__batteryGetState = getBatteryState;
}

/**
 * 订阅电量变化；注册时立即回放一次当前快照（省去调用方手动初次渲染）。
 * @param {(s: BatterySnapshot) => void} fn
 * @returns {() => void} 取消订阅函数
 */
export function subscribeBattery(fn) {
  ensureInit();
  subscribers.add(fn);
  try { fn({ ...batteryState, rates: { ...rateState.rates } }); } catch (e) { /* 忽略订阅者首帧异常 */ }
  return () => subscribers.delete(fn);
}

/**
 * 依据电量估算"预计可用时间"（秒）。
 * 优先级：v7.23 实测耗电速率（每格耗时 × 剩余格数）> 系统给出的 dischargingTime
 * > "满电约 15 小时"线性折算（仅氛围展示）。
 * @param {BatterySnapshot} s
 * @returns {number} 秒
 */
export function estimateDischargeSeconds(s) {
  if (!s.charging) {
    const r = s.rates || {};
    if (Number.isFinite(r.dischargeMsPerPct) && r.dischargeMsPerPct > 0) {
      return Math.round((s.level * r.dischargeMsPerPct) / 1000);
    }
    if (Number.isFinite(s.dischargingTime) && s.dischargingTime > 0) {
      return s.dischargingTime;
    }
  }
  return Math.round((s.level / 100) * 15 * 3600);
}

/**
 * 估算"预计充满时间"（秒）。
 * 优先级：实测充电速率（每格耗时 × 剩余格数）> 系统 chargingTime > null（未知）。
 * @param {BatterySnapshot} s
 * @returns {number|null} 秒；null = 暂无法估算
 */
export function estimateChargeSeconds(s) {
  if (!s.charging) return null;
  if (s.level >= 100) return 0;
  const r = s.rates || {};
  if (Number.isFinite(r.chargeMsPerPct) && r.chargeMsPerPct > 0) {
    return Math.round(((100 - s.level) * r.chargeMsPerPct) / 1000);
  }
  if (Number.isFinite(s.chargingTime) && s.chargingTime > 0) {
    return s.chargingTime;
  }
  return null;
}

/**
 * 每格耗时 → "约 X 秒 / 约 Y 分钟 / X 小时 Y 分" 人话格式。
 * @param {number} msPerPct
 * @returns {string}
 */
export function formatPerPct(msPerPct) {
  if (!Number.isFinite(msPerPct) || msPerPct <= 0) return '—';
  const sec = msPerPct / 1000;
  if (sec < 60) return `约 ${Math.round(sec)} 秒`;
  return `约 ${formatDuration(sec)}`;
}

/**
 * 秒数 → "X 小时 Y 分钟" 人话格式。
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const totalMin = Math.round(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} 分钟`;
  if (m === 0) return `${h} 小时`;
  return `${h} 小时 ${m} 分钟`;
}

// ---------- 省电模式联动（耗电放缓，模拟模式生效） ----------

if (typeof document !== 'undefined') {
  document.addEventListener('battery-saver-changed', (e) => {
    sim.saverOn = !!(e.detail && e.detail.active);
    // 节拍即时重排（无需等待下一拍自然到期）
    if (sim.running) scheduleSimTick();
  });
}

// ---------- 模拟充电器控制面（设置 › 电池 页直连；仅模拟模式有意义） ----------

/** 模拟引擎是否在运行（浏览器无 Battery API） */
export function isSimEngineActive() {
  ensureInit();
  return sim.running;
}

/** 模拟充电器是否接入 */
export function getSimCharging() {
  return sim.running && sim.charging;
}

// ---------- v11.27 #100：电池健康出口（设置›电池 健康卡消费） ----------

/**
 * 电池健康快照（含纯模型派生：容量/状态由消费侧用 capacityAfterCycles/healthStatus
 * 二次派生，本出口只回原始状态 + 派生循环数）。
 * @returns {{ cycles: number, totalChargePct: number, limitOn: boolean, ts: number }}
 */
export function getBatteryHealth() {
  ensureInit();
  return { ...healthState, cycles: cyclesFromThroughput(healthState.totalChargePct) };
}

/**
 * 充电上限开关（A14+ BatteryChargeLimit 语义）：仅影响模拟引擎推进闸
 * （真实设备由电源管理固件执行——Web 域注记，差异在 aosp/battery-health.js 头注）。
 * @param {boolean} on
 * @returns {{ cycles: number, totalChargePct: number, limitOn: boolean, ts: number }} 开关后快照
 */
export function setChargeLimit(on) {
  ensureInit();
  healthState = { ...healthState, limitOn: on === true, ts: Date.now() };
  persistHealth();
  if (sim.running) scheduleSimTick(); // 上限变化立即按新模式重排节拍
  return getBatteryHealth();
}

/** 限充闸观测面（E2E/调试零行为面） */
export function isChargeHoldReached() {
  ensureInit();
  return chargeHoldReached(batteryState.level, healthState.limitOn);
}

/**
 * 接入/拔出模拟充电器（真实设备上恒返回 false —— 充电态跟随真实电源）。
 * @param {boolean} on
 * @returns {boolean} 是否生效
 */
export function setSimCharging(on) {
  ensureInit();
  if (!sim.running) return false;
  const next = !!on;
  if (sim.charging === next) return true;
  sim.charging = next;
  applyState({ level: batteryState.level, charging: next });
  scheduleSimTick();
  return true;
}
