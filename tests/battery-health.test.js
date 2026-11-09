// ==================== battery-health.test.js — #100 电池健康模拟模型 + 充电上限闸（v11.02 · R108） ====================
//
// 覆盖：
//   · aosp/battery-health.js 纯逻辑真跑：常量（CHARGE_LIMIT_PCT=80 A14+ BatteryChargeLimit
//     出厂档 / 0.025%·循环缓降 / 容量下限钳制）/ clampCycles·clampThroughput 归一 /
//     capacityAfterCycles（800 循环→恰好 80：整数运算防浮点）/ healthStatus 两档阈值 /
//     cyclesFromThroughput 等效满充派生 / recordChargeDelta（仅充电正增量累计）/ 
//     chargeHoldReached 限充闸 / chargingSuggestion 建议卡两态 / parse·serialize codec
//     （垃圾防御 + 严格 limitOn + 往返一致 + cycles 不落盘防双字段失同步）
//   · 接线锚：battery-service.js（吞吐累计在 applyState + 三处推进点限充闸 + 出口三件）/
//     settings-battery.js（健康卡渲染 + 限充开关链）/ settings.js（健康卡模板 + 模拟标注）
//   · 回归锚：battery-service 既有出口面零触碰 / charging-ripple 零改动（涟漪消费
//     充电沿事件不动——议题明示非重做涟漪）/ 速率测量层 computeRatesFromSamples 不受健康层影响

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHARGE_LIMIT_PCT, DEGRADE_PER_CYCLE, CAPACITY_FLOOR_PCT, HEALTH_GOOD_THRESHOLD,
  THROUGHPUT_CAP, BATTERY_HEALTH_KEY, HEALTH_STATUS, SUGGESTION, HEALTH_DEFAULTS,
  clampCycles, clampThroughput, capacityAfterCycles, healthStatus, cyclesFromThroughput,
  recordChargeDelta, chargeHoldReached, chargingSuggestion,
  parseHealthState, serializeHealthState,
} from '../ios-desktop/js/aosp/battery-health.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SVC = readFileSync(join(ROOT, 'ios-desktop/js/battery-service.js'), 'utf-8');
const SBAT = readFileSync(join(ROOT, 'ios-desktop/js/apps/settings-battery.js'), 'utf-8');
const SET = readFileSync(join(ROOT, 'ios-desktop/js/apps/settings.js'), 'utf-8');
const RIPPLE = readFileSync(join(ROOT, 'ios-desktop/js/charging-ripple.js'), 'utf-8');
const PKG = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));

describe('v11.02 #100 常量（A14+ BatteryChargeLimit + 模拟模型口径）', () => {
  it('CHARGE_LIMIT_PCT=80（A14+ 出厂档）/ HEALTH_GOOD_THRESHOLD=80 / 容量下限 70', () => {
    expect(CHARGE_LIMIT_PCT).toBe(80);
    expect(HEALTH_GOOD_THRESHOLD).toBe(80);
    expect(CAPACITY_FLOOR_PCT).toBe(70);
    expect(DEGRADE_PER_CYCLE).toBe(0.025);
  });
  it('吞吐上限 / 持久化键 / 默认值（limitOn 严格 false 兜底）', () => {
    expect(THROUGHPUT_CAP).toBe(9_999_900);
    expect(BATTERY_HEALTH_KEY).toBe('ios-desktop:battery-health-v1');
    expect(HEALTH_DEFAULTS).toEqual({ totalChargePct: 0, limitOn: false, ts: 0 });
  });
  it('HEALTH_STATUS / SUGGESTION 两档冻结形态', () => {
    expect(HEALTH_STATUS).toEqual({ GOOD: 'good', SERVICE: 'service' });
    expect(SUGGESTION).toEqual({ LIMIT: 'limit', SERVICE: 'service' });
    expect(Object.isFrozen(HEALTH_STATUS)).toBe(true);
    expect(Object.isFrozen(SUGGESTION)).toBe(true);
  });
});

describe('v11.02 #100 clampCycles / clampThroughput 归一', () => {
  it('垃圾/负数/布尔 → 0；小数 → floor；超大钳制', () => {
    expect(clampCycles(undefined)).toBe(0);
    expect(clampCycles(null)).toBe(0);
    expect(clampCycles('junk')).toBe(0);
    expect(clampCycles(-5)).toBe(0);
    expect(clampCycles(true)).toBe(0); // boolean 防御（Number(true)=1 不得漂移）
    expect(clampCycles(12.9)).toBe(12);
    expect(clampCycles(THROUGHPUT_CAP / 100 + 500)).toBe(THROUGHPUT_CAP / 100);
    expect(clampThroughput('junk')).toBe(0);
    expect(clampThroughput(-1)).toBe(0);
    expect(clampThroughput(THROUGHPUT_CAP + 1)).toBe(THROUGHPUT_CAP);
    expect(clampThroughput(250.7)).toBe(250);
  });
});

describe('v11.02 #100 capacityAfterCycles（0.025%/循环线性缓降）', () => {
  it('锚点：0→100 / 400→90 / 800→恰好 80（整数运算防浮点）/ 1000→75', () => {
    expect(capacityAfterCycles(0)).toBe(100);
    expect(capacityAfterCycles(400)).toBe(90);
    expect(capacityAfterCycles(800)).toBe(80); // 0.025×800=20 恰好（100-800×25/1000）
    expect(capacityAfterCycles(1000)).toBe(75);
  });
  it('下限钳制 70（1200 循环=70 / 1600 循环仍 70——模型边界防无限衰减）+ 垃圾→100', () => {
    expect(capacityAfterCycles(1200)).toBe(70);
    expect(capacityAfterCycles(1600)).toBe(70);
    expect(capacityAfterCycles(999999)).toBe(70);
    expect(capacityAfterCycles('junk')).toBe(100);
    expect(capacityAfterCycles(-3)).toBe(100);
  });
});

describe('v11.02 #100 healthStatus 两档（议题规格：良好/建议检修）', () => {
  it('≥80 → 良好（含恰 80 边界）/<80 → 建议检修', () => {
    expect(healthStatus(100)).toEqual({ key: 'good', label: '良好' });
    expect(healthStatus(80)).toEqual({ key: 'good', label: '良好' });
    expect(healthStatus(79.9)).toEqual({ key: 'service', label: '建议检修' });
    expect(healthStatus(70)).toEqual({ key: 'service', label: '建议检修' });
  });
  it('垃圾容量 → 保守落检修档（纯函数防御）', () => {
    expect(healthStatus(NaN).key).toBe(HEALTH_STATUS.SERVICE);
    expect(healthStatus(undefined).label).toBe('建议检修');
  });
});

describe('v11.02 #100 cyclesFromThroughput 等效满充派生', () => {
  it('99→0 / 100→1 / 250→2 / 垃圾→0（每充入 100% ≈ 1 循环）', () => {
    expect(cyclesFromThroughput(99)).toBe(0);
    expect(cyclesFromThroughput(100)).toBe(1);
    expect(cyclesFromThroughput(250)).toBe(2);
    expect(cyclesFromThroughput('junk')).toBe(0);
    expect(cyclesFromThroughput(-50)).toBe(0);
  });
});

describe('v11.02 #100 recordChargeDelta 吞吐累计（纯，不 mutation）', () => {
  it('仅充电正增量累计；放电/零/垃圾增量原样返回', () => {
    let st = { ...HEALTH_DEFAULTS };
    st = recordChargeDelta(st, 30, true);
    expect(st.totalChargePct).toBe(30);
    st = recordChargeDelta(st, -5, false); // 放电不累计
    expect(st.totalChargePct).toBe(30);
    st = recordChargeDelta(st, 10, false);
    expect(st.totalChargePct).toBe(30);
    st = recordChargeDelta(st, 0, true);
    expect(st.totalChargePct).toBe(30);
    st = recordChargeDelta(st, 'junk', true);
    expect(st.totalChargePct).toBe(30);
    st = recordChargeDelta(st, 70, true);
    expect(st.totalChargePct).toBe(100);
  });
  it('累计跨 100% 边界产生循环（1 次满充 = 1 循环）+ 限充开关字段透传', () => {
    let st = { totalChargePct: 90, limitOn: true, ts: 1 };
    st = recordChargeDelta(st, 20, true);
    expect(st.totalChargePct).toBe(110);
    expect(cyclesFromThroughput(st.totalChargePct)).toBe(1);
    expect(st.limitOn).toBe(true);
  });
  it('null 状态防御 + 超上限钳制', () => {
    expect(recordChargeDelta(null, 5, true).totalChargePct).toBe(5);
    const capped = recordChargeDelta({ totalChargePct: THROUGHPUT_CAP, limitOn: false, ts: 0 }, 500, true);
    expect(capped.totalChargePct).toBe(THROUGHPUT_CAP);
  });
});

describe('v11.02 #100 chargeHoldReached 限充闸（模拟引擎推进点消费）', () => {
  it('limitOn 且电量 ≥80 → hold；79 → 放行；limitOn 关 → 恒放行', () => {
    expect(chargeHoldReached(80, true)).toBe(true);
    expect(chargeHoldReached(96, true)).toBe(true);
    expect(chargeHoldReached(79, true)).toBe(false);
    expect(chargeHoldReached(80, false)).toBe(false);
    expect(chargeHoldReached(100, false)).toBe(false);
  });
  it('垃圾电量 → 不 hold（放行安全侧）', () => {
    expect(chargeHoldReached(NaN, true)).toBe(false);
    expect(chargeHoldReached(undefined, true)).toBe(false);
  });
});

describe('v11.02 #100 chargingSuggestion 建议卡两态', () => {
  it('充电中未开限充 → 限充建议；已开 → null', () => {
    expect(chargingSuggestion(100, false, true)).toEqual({ id: 'limit', text: '开启充电上限（80%）有助于延缓电池老化' });
    expect(chargingSuggestion(100, true, true)).toBe(null);
    expect(chargingSuggestion(100, false, false)).toBe(null);
  });
  it('健康偏低 → 送检建议（优先于限充建议）', () => {
    const s = chargingSuggestion(72, false, false);
    expect(s.id).toBe('service');
    expect(s.text).toBe('电池健康度偏低，建议送检更换电池');
    expect(chargingSuggestion(72, false, true).id).toBe('service');
  });
});

describe('v11.02 #100 parseHealthState / serializeHealthState codec', () => {
  it('合法档往返一致（serialize→parse 恒等）', () => {
    const st = { totalChargePct: 250, limitOn: true, ts: 1700000000000 };
    expect(parseHealthState(serializeHealthState(st))).toEqual(st);
    expect(parseHealthState({ ...st })).toEqual(st);
  });
  it('垃圾防御：坏 JSON / null / 数组 / 非法字段 → 默认（严格 limitOn 仅 true）', () => {
    expect(parseHealthState('not-json{{{')).toEqual(HEALTH_DEFAULTS);
    expect(parseHealthState(null)).toEqual(HEALTH_DEFAULTS);
    expect(parseHealthState([1, 2])).toEqual(HEALTH_DEFAULTS);
    expect(parseHealthState({ totalChargePct: 'junk', limitOn: 1, ts: 'x' })).toEqual({ totalChargePct: 0, limitOn: false, ts: 0 });
    expect(parseHealthState({ totalChargePct: -9, limitOn: 'yes', ts: -5 })).toEqual(HEALTH_DEFAULTS);
    expect(parseHealthState({ limitOn: true, totalChargePct: 50 })).toEqual({ totalChargePct: 50, limitOn: true, ts: 0 });
  });
  it('cycles 不落盘（单真源防双字段失同步——serialize 产物无 cycles 键）', () => {
    const s = serializeHealthState({ totalChargePct: 300, limitOn: false, ts: 0 });
    expect(JSON.parse(s)).not.toHaveProperty('cycles');
  });
});

describe('v11.02 #100 接线锚（battery-service / settings-battery / settings 模板）', () => {
  it('battery-service：纯模型 import + applyState 吞吐累计 + 三处推进点限充闸 + 出口三件', () => {
    expect(SVC).toContain("from './aosp/battery-health.js'");
    expect(SVC).toContain('recordChargeDelta(healthState, healthDelta, true)');
    expect(SVC).toContain('let healthArmed = false;'); // 首拍闸（防 fallback→真实档位跳变幻影吞吐）
    expect(SVC).toContain('healthArmed && nextCharging && healthDelta > 0');
    expect(SVC).toContain('const ceiling = chargeCeiling();');
    expect(SVC.match(/lvl >= ceiling/g).length).toBe(2); // simWake 追赶 + forceSteps 快进
    expect(SVC).toContain('export function getBatteryHealth()');
    expect(SVC).toContain('export function setChargeLimit(on)');
    expect(SVC).toContain('export function isChargeHoldReached()');
  });
  it('settings-battery：健康卡渲染五件 + 限充开关链（#70 统一入口）', () => {
    expect(SBAT).toContain("from '../aosp/battery-health.js'");
    expect(SBAT).toContain("getElementById('settingsBatteryHealthPct')");
    expect(SBAT).toContain("getElementById('settingsBatteryHealthBar')");
    expect(SBAT).toContain("getElementById('settingsBatteryHealthStatus')");
    expect(SBAT).toContain("getElementById('settingsBatteryHealthCycles')");
    expect(SBAT).toContain("getElementById('settingsBatteryHealthLimitSwitch')");
    expect(SBAT).toContain('setChargeLimit(on)');
    expect(SBAT).toContain('充至 ${CHARGE_LIMIT_PCT}% 后暂停'); // 模板字面量源码形态（非插值后文本）
  });
  it('settings 模板：健康卡 + 模拟数据明示标注（议题规格「明确标注为模拟」）', () => {
    expect(SET).toContain('data-test="battery-health"');
    expect(SET).toContain('data-test="battery-health-limit"');
    expect(SET).toContain('settingsBatteryHealthSuggestText');
    expect(SET).toContain('模拟数据：浏览器 Battery API 不提供健康度，按充电吞吐模型估算');
    expect(SET).toContain('充电上限');
    expect(SET).toContain('A14+ BatteryChargeLimit 语义');
  });
});

describe('v11.02 #100 回归锚（既有面零触碰）', () => {
  it('battery-service 既有出口全数在位（速率/估时/模拟充电器/低电阈值）', () => {
    expect(SVC).toContain('export function getBatteryState()');
    expect(SVC).toContain('export function subscribeBattery(fn)');
    expect(SVC).toContain('export function estimateDischargeSeconds(s)');
    expect(SVC).toContain('export function estimateChargeSeconds(s)');
    expect(SVC).toContain('export function isSimEngineActive()');
    expect(SVC).toContain('export function getSimCharging()');
    expect(SVC).toContain('export function setSimCharging(on)');
    expect(SVC).toContain('const LOW_BATTERY_WARNING_LEVEL = 15;'); // v9.94 #36 不动
  });
  it('charging-ripple 零改动契约（涟漪消费充电沿事件——议题明示非重做涟漪）', () => {
    expect(RIPPLE).not.toContain('battery-health');
    expect(RIPPLE).toContain('WiredChargingRippleController');
  });
  it('速率测量层 computeRatesFromSamples 不受健康层影响（样本窗口常量原值）', () => {
    expect(SVC).toContain('const RATE_WINDOW = 6;');
    expect(SVC).toContain('const DISCHARGE_MS_BOUNDS = [8_000, 6 * 3600_000];');
  });
});

describe('v11.02 版本账', () => {
  it('pkg 版本 11.2.0', () => {
    expect(PKG.version).toBe('11.2.0');
  });
});
