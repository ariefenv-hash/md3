// ==================== aosp/battery-health.js — 电池健康模拟模型 + 充电上限闸（#100 · v10.65） ====================
//
// 权威源与边界（诚实标注）：
//   - 对标面：AOSP Settings › Battery › BatteryInfoFragment 健康信息面 + A14+
//     Pixel「充电上限」BatteryChargeLimit（充至上限暂停充电以延缓电池老化，
//     出厂档 80%）；
//   - **Web 域边界**：navigator.getBattery()（Battery Status API）仅暴露
//     level/charging/充放电时间，**不提供健康度/设计容量/循环计数**——真机数据
//     真源在 fuel gauge BMS，Web 域不可得 → 本模块按议题规格建立**项目内模拟
//     模型**，消费 UI 必须明示「模拟数据」（铁律#2 超越边界写法）；
//
// 模型口径（模拟，非真源）：
//   - 循环计数 = 充电吞吐累计：每累计充入 100% 电量 ≈ 1 次充放循环
//     （等效满充循环，行业惯例口径；放电不累计——吞吐只在充电沿产生）；
//   - 容量缓降 = 0.025%/循环（= 25/1000，整数运算防浮点误差）：800 循环 → 80%
//     （锂离子「800 cycles ≈ 80% 设计容量」惯例），下限钳制 CAPACITY_FLOOR_PCT
//     （模型边界：防无限衰减到 0）；
//   - 健康状态：容量 ≥ HEALTH_GOOD_THRESHOLD → 「良好」；< → 「建议检修」
//     （议题规格两档：良好/建议检修）；
//   - 充电上限：CHARGE_LIMIT_PCT=80（A14+ BatteryChargeLimit 出厂档），开启后
//     模拟引擎充至 80% 冻结（真机由电源管理固件执行——Web 仅虚拟电池生效，
//     差异注记）。
//
// 纯逻辑模块：零 DOM、零 battery-service 依赖。持久化 codec 走
// serializeHealthState/parseHealthState（序列化形态），落点在 battery-service.js
// （与 rates/sim-level 同仓管理，单一真源纪律）。

/** A14+ BatteryChargeLimit 出厂限充档（%） */
export const CHARGE_LIMIT_PCT = 80;
/** 每循环容量缓降（百分点）：0.025 = 25/1000（文档常量；实际运算用整数形态） */
export const DEGRADE_PER_CYCLE = 0.025;
/** 容量下限钳制（%）：模型边界，防无限衰减 */
export const CAPACITY_FLOOR_PCT = 70;
/** 健康状态「良好」阈值（相对设计容量 %） */
export const HEALTH_GOOD_THRESHOLD = 80;
/** 吞吐/循环计数上限（防持久化无限增长；循环上限 = 99999 次） */
export const THROUGHPUT_CAP = 9_999_900;
/** 持久化真源键（battery-service.js 落盘） */
export const BATTERY_HEALTH_KEY = 'ios-desktop:battery-health-v1';

/** 健康状态两档 key（议题规格：良好/建议检修） */
export const HEALTH_STATUS = Object.freeze({ GOOD: 'good', SERVICE: 'service' });

/** 充电优化建议卡 id 两态 */
export const SUGGESTION = Object.freeze({ LIMIT: 'limit', SERVICE: 'service' });

/** 健康状态默认值（parse 兜底形态；limitOn 严格 true 才为开——与 #207 userBlocked 同纪律） */
export const HEALTH_DEFAULTS = Object.freeze({ totalChargePct: 0, limitOn: false, ts: 0 });

/** 循环计数归一：垃圾 → 0；负数 → 0；小数 → floor；布尔防御（Number(true)=1 不得漂移）；超上限钳制 */
export function clampCycles(v) {
  if (typeof v === 'boolean') return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(THROUGHPUT_CAP / 100, Math.floor(n));
}

/** 吞吐归一（%累计值）：垃圾 → 0；负数 → 0；布尔防御；超上限钳制 */
export function clampThroughput(v) {
  if (typeof v === 'boolean') return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(THROUGHPUT_CAP, Math.floor(n));
}

/**
 * 循环次数 → 相对设计容量（%）。
 * 线性缓降 0.025%/循环（25/1000 整数运算防浮点误差：800 循环 → 恰好 80），
 * 下限钳制 CAPACITY_FLOOR_PCT。
 * @param {number} cycles
 * @returns {number}
 */
export function capacityAfterCycles(cycles) {
  const c = clampCycles(cycles);
  const loss = (c * 25) / 1000;
  return Math.max(CAPACITY_FLOOR_PCT, 100 - loss);
}

/**
 * 容量（%）→ 健康状态两档。
 * ≥ HEALTH_GOOD_THRESHOLD → 「良好」；其余（含垃圾值）→ 「建议检修」
 * （垃圾容量视为未知损耗，保守落检修档——UI 侧不会用垃圾值渲染红字误导，
 * 因渲染前 capacityAfterCycles 恒产出合法值，本分支仅纯函数防御）。
 * @param {number} capacityPct
 * @returns {{ key: string, label: string }}
 */
export function healthStatus(capacityPct) {
  const v = Number(capacityPct);
  if (!Number.isFinite(v)) return { key: HEALTH_STATUS.SERVICE, label: '建议检修' };
  return v >= HEALTH_GOOD_THRESHOLD
    ? { key: HEALTH_STATUS.GOOD, label: '良好' }
    : { key: HEALTH_STATUS.SERVICE, label: '建议检修' };
}

/**
 * 累计吞吐 → 等效满充循环次数（每 100% ≈ 1 循环）。
 * @param {number} totalChargePct
 * @returns {number}
 */
export function cyclesFromThroughput(totalChargePct) {
  return Math.floor(clampThroughput(totalChargePct) / 100);
}

/**
 * 充电吞吐累计（纯函数，不 mutation）：仅充电且增量 > 0 时累计；
 * 放电/零增量/垃圾增量原样返回（放电不产生吞吐——循环口径在模块头注记）。
 * @param {{ totalChargePct: number, limitOn: boolean, ts: number }} state
 * @param {number} delta 本次电量增量（正百分点）
 * @param {boolean} charging 当前是否充电态
 * @returns {{ totalChargePct: number, limitOn: boolean, ts: number }}
 */
export function recordChargeDelta(state, delta, charging) {
  const prev = state && typeof state === 'object' ? state : { ...HEALTH_DEFAULTS };
  if (charging !== true || !Number.isFinite(delta) || delta <= 0) return prev;
  const total = clampThroughput((Number(prev.totalChargePct) || 0) + delta);
  return { ...prev, totalChargePct: total };
}

/**
 * 充电上限闸（模拟引擎推进点消费）：限充开启且电量已达 80% → true（冻结推进）。
 * @param {number} level 当前电量
 * @param {boolean} limitOn 限充开关
 * @returns {boolean}
 */
export function chargeHoldReached(level, limitOn) {
  if (limitOn !== true) return false;
  const l = Number(level);
  return Number.isFinite(l) && l >= CHARGE_LIMIT_PCT;
}

/**
 * 充电优化建议卡（议题规格「充电优化建议卡」）：
 *   1. 健康偏低（<80%）→ 建议送检（优先于限充建议——检修诉求高于优化诉求）；
 *   2. 充电中且未开限充 → 限充建议（AOSP BatteryDefender 同话语域）；
 *   3. 其余 → null（无建议）。
 * @param {number} capacityPct
 * @param {boolean} limitOn
 * @param {boolean} charging
 * @returns {{ id: string, text: string }|null}
 */
export function chargingSuggestion(capacityPct, limitOn, charging) {
  const st = healthStatus(capacityPct);
  if (st.key === HEALTH_STATUS.SERVICE) {
    return { id: SUGGESTION.SERVICE, text: '电池健康度偏低，建议送检更换电池' };
  }
  if (charging === true && limitOn !== true) {
    return { id: SUGGESTION.LIMIT, text: `开启充电上限（${CHARGE_LIMIT_PCT}%）有助于延缓电池老化` };
  }
  return null;
}

/**
 * 持久化 codec —— 反序列化（垃圾防御，严格 limitOn）：
 * 字符串 → JSON 解析失败落默认；非对象/数组落默认；字段逐项钳制。
 * cycles 不落盘（单一真源 = totalChargePct，循环恒派生，防双字段失同步）。
 * @param {string|object|null} raw
 * @returns {{ totalChargePct: number, limitOn: boolean, ts: number }}
 */
export function parseHealthState(raw) {
  let o = raw;
  if (typeof raw === 'string') {
    try { o = JSON.parse(raw); } catch (e) { return { ...HEALTH_DEFAULTS }; }
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { ...HEALTH_DEFAULTS };
  return {
    totalChargePct: clampThroughput(o.totalChargePct),
    limitOn: o.limitOn === true,
    ts: Number.isFinite(Number(o.ts)) ? Math.max(0, Math.floor(Number(o.ts))) : 0,
  };
}

/** 持久化 codec —— 序列化（先归一再落盘） */
export function serializeHealthState(state) {
  return JSON.stringify(parseHealthState(state));
}
