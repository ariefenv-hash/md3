// ==================== tests/battery-rates.test.js — 电量速率测量层（v7.23）测试 ====================
//
// 覆盖 battery-service.js 纯逻辑层：
//   · computeRatesFromSamples：同模式相邻样本耗时/格数折算、跨模式边界排除、
//     多格跳变按格数均摊、脏区间剔除（过快/过慢）、滚动窗口截断
//   · estimateDischargeSeconds / estimateChargeSeconds：实测速率优先、系统值兜底、
//     线性 15h 氛围折算、未充电时充电估时恒 null
//   · formatPerPct / formatDuration：人话格式
//
// 关键业务规则（与设置 › 电池页 UI 一一对应）：
//   - 剩余可用时长 = 当前电量 × 实测每格耗时（用户需求「耗 1 格时间反推」）
//   - 充满时长 = (100 - 电量) × 实测充电每格耗时
//   - 速率未知时回退系统 dischargingTime/chargingTime，再未知回退线性折算

import { describe, it, expect } from 'vitest';
import {
  computeRatesFromSamples,
  estimateDischargeSeconds,
  estimateChargeSeconds,
  formatPerPct,
  formatDuration,
} from '../ios-desktop/js/battery-service.js';

const MIN = 60_000;

function seq(points, charging = false) {
  // points: [[tMin, level], ...] → 样本序列
  return points.map(([t, level]) => ({ t: t * MIN, level, charging }));
}

describe('速率测量 · computeRatesFromSamples', () => {
  it('空/单样本 → 全部未知', () => {
    const r = computeRatesFromSamples([]);
    expect(r.dischargeMsPerPct).toBeNull();
    expect(r.chargeMsPerPct).toBeNull();
    expect(r.dischargeSamples).toBe(0);
    const r1 = computeRatesFromSamples([{ t: 0, level: 80, charging: false }]);
    expect(r1.dischargeMsPerPct).toBeNull();
  });

  it('两样本掉 1 格 → 每格 = 间隔时长', () => {
    const r = computeRatesFromSamples(seq([[0, 80], [1.5, 79]]));
    expect(r.dischargeMsPerPct).toBe(90_000);
    expect(r.dischargeSamples).toBe(1);
    expect(r.chargeMsPerPct).toBeNull();
  });

  it('充电模式样本 → 计入充电速率而非放电', () => {
    const r = computeRatesFromSamples(seq([[0, 40], [1, 41]], true));
    expect(r.chargeMsPerPct).toBe(60_000);
    expect(r.chargeSamples).toBe(1);
    expect(r.dischargeMsPerPct).toBeNull();
  });

  it('多格跳变按格数均摊（3 格 / 6 分钟 = 2 分钟每格）', () => {
    const r = computeRatesFromSamples(seq([[0, 80], [6, 77]]));
    expect(r.dischargeMsPerPct).toBe(120_000);
  });

  it('跨模式边界（插拔充电器）的样本对不参与折算', () => {
    const r = computeRatesFromSamples([
      { t: 0, level: 80, charging: false },
      { t: 2 * MIN, level: 79, charging: false },
      { t: 3 * MIN, level: 79, charging: true },  // 边界标记
      { t: 4 * MIN, level: 80, charging: true },  // 充电首段正常折算
    ]);
    expect(r.dischargeMsPerPct).toBe(120_000);
    expect(r.chargeMsPerPct).toBe(60_000);
  });

  it('脏区间剔除：5 秒掉 1 格（页面刷新抖动）与 8 小时掉 1 格（跨天休眠）均丢弃', () => {
    const r = computeRatesFromSamples([
      { t: 0, level: 80, charging: false },
      { t: 5_000, level: 79, charging: false },        // 过快
      { t: 5_000 + 8 * 3600_000, level: 78, charging: false }, // 过慢
    ]);
    expect(r.dischargeMsPerPct).toBeNull();
  });

  it('滚动窗口：仅保留最近 6 段，早期样本出局', () => {
    const samples = [{ t: 0, level: 100, charging: false }];
    for (let i = 1; i <= 9; i++) {
      samples.push({ t: i * MIN, level: 100 - i, charging: false });
    }
    const r = computeRatesFromSamples(samples);
    expect(r.dischargeSamples).toBe(6);
    // 全部间隔均为 1 分钟/格 → 加权均值仍为 1 分钟
    expect(r.dischargeMsPerPct).toBe(60_000);
  });

  it('近期样本权重更高：慢段在前快段在后 → 均值偏向快段', () => {
    const r = computeRatesFromSamples(seq([[0, 80], [10, 79], [20, 78]]));
    // 旧段 10min、新段 10min 同速 → 10 分钟
    expect(r.dischargeMsPerPct).toBe(10 * MIN);
    const r2 = computeRatesFromSamples(seq([[0, 80], [20, 78], [21, 77]]));
    // 旧段 10min/格、新段 1min/格 → 加权偏向 1min（简单均值 5.5min）
    expect(r2.dischargeMsPerPct).toBeLessThan(5.5 * MIN);
  });
});

describe('估时反推 · estimateDischargeSeconds / estimateChargeSeconds', () => {
  it('放电：实测速率优先（80% × 1.5min = 2 小时）', () => {
    const s = {
      level: 80, charging: false, dischargingTime: Infinity, supported: true,
      rates: { dischargeMsPerPct: 1.5 * MIN, chargeMsPerPct: null, dischargeSamples: 2, chargeSamples: 0 },
    };
    expect(estimateDischargeSeconds(s)).toBe(80 * 90);
  });

  it('放电：速率未知回退系统 dischargingTime', () => {
    const s = {
      level: 80, charging: false, dischargingTime: 3600, supported: true,
      rates: { dischargeMsPerPct: null, chargeMsPerPct: null, dischargeSamples: 0, chargeSamples: 0 },
    };
    expect(estimateDischargeSeconds(s)).toBe(3600);
  });

  it('放电：两者皆无 → 满 15 小时线性折算（60% = 9 小时）', () => {
    const s = {
      level: 60, charging: false, dischargingTime: Infinity, supported: true,
      rates: { dischargeMsPerPct: null, chargeMsPerPct: null, dischargeSamples: 0, chargeSamples: 0 },
    };
    expect(estimateDischargeSeconds(s)).toBe(9 * 3600);
  });

  it('放电：充电中不给出可用时长（走线性氛围值，UI 层此时显示充电文案）', () => {
    const s = {
      level: 50, charging: true, dischargingTime: Infinity, supported: true,
      rates: { dischargeMsPerPct: MIN, chargeMsPerPct: null, dischargeSamples: 1, chargeSamples: 0 },
    };
    // 充电中不消费放电速率
    expect(estimateDischargeSeconds(s)).toBe(Math.round((50 / 100) * 15 * 3600));
  });

  it('充电：实测速率反推（(100-30) × 1min = 70 分钟）', () => {
    const s = {
      level: 30, charging: true, chargingTime: Infinity, supported: true,
      rates: { dischargeMsPerPct: null, chargeMsPerPct: MIN, dischargeSamples: 0, chargeSamples: 2 },
    };
    expect(estimateChargeSeconds(s)).toBe(70 * 60);
  });

  it('充电：速率未知回退系统 chargingTime', () => {
    const s = {
      level: 30, charging: true, chargingTime: 5400, supported: true,
      rates: { dischargeMsPerPct: null, chargeMsPerPct: null, dischargeSamples: 0, chargeSamples: 0 },
    };
    expect(estimateChargeSeconds(s)).toBe(5400);
  });

  it('充电：满电 → 0 秒；未充电 → 恒 null', () => {
    const full = {
      level: 100, charging: true, chargingTime: Infinity, supported: true,
      rates: { dischargeMsPerPct: null, chargeMsPerPct: MIN, dischargeSamples: 0, chargeSamples: 3 },
    };
    expect(estimateChargeSeconds(full)).toBe(0);
    const idle = {
      level: 50, charging: false, chargingTime: Infinity, supported: true,
      rates: { dischargeMsPerPct: null, chargeMsPerPct: MIN, dischargeSamples: 0, chargeSamples: 3 },
    };
    expect(estimateChargeSeconds(idle)).toBeNull();
  });

  it('充电：速率与系统值皆无 → null（UI 显示测量中）', () => {
    const s = {
      level: 50, charging: true, chargingTime: Infinity, supported: true,
      rates: { dischargeMsPerPct: null, chargeMsPerPct: null, dischargeSamples: 0, chargeSamples: 0 },
    };
    expect(estimateChargeSeconds(s)).toBeNull();
  });
});

describe('人话格式 · formatPerPct / formatDuration', () => {
  it('每格 < 1 分钟 → 约 N 秒', () => {
    expect(formatPerPct(42_000)).toBe('约 42 秒');
  });
  it('每格 ≥ 1 分钟 → 约 X 分钟 / X 小时 Y 分钟', () => {
    expect(formatPerPct(70_000)).toBe('约 1 分钟'); // 70s → 四舍五入 1 分钟
    expect(formatPerPct(90_000)).toBe('约 2 分钟'); // 90s → 四舍五入 2 分钟
    expect(formatPerPct(72 * MIN)).toBe('约 1 小时 12 分钟');
  });
  it('formatDuration：分钟 / 小时 / 小时+分钟 / 非法值', () => {
    expect(formatDuration(45 * 60)).toBe('45 分钟');
    expect(formatDuration(2 * 3600)).toBe('2 小时');
    expect(formatDuration(2 * 3600 + 30 * 60)).toBe('2 小时 30 分钟');
    expect(formatDuration(0)).toBe('—');
    expect(formatDuration(Infinity)).toBe('—');
  });
});
