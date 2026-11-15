// #283 处置②批次2：B 档游戏域 8 裸键收编的迁移回归锚（常青命名，#291 §1；批 1 同款范式）
// 守护：常量值为 ios-desktop: 新键 / 幂等迁移 IIFE 在位 / 旧键仅存回落引用 / 搬移链路语义 / LS_OWNER_RULES 专规则前移。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

// 与 surgery-283-batch2*.py 同源（8 键 / 8 处常量定义；typing 为既有常量改值）
const CASES = [
  ['ios-desktop/apps/dice/index.html', 'STATS_KEY', 'dice_lab_stats', 'ios-desktop:dice-lab-stats'],
  ['ios-desktop/apps/flow11/index.html', 'FLOW_BEST_KEY', 'flow11_best', 'ios-desktop:flow11-best'],
  ['ios-desktop/apps/flow11/index.html', 'FLOW_POWERUPS_KEY', 'flow11_powerups', 'ios-desktop:flow11-powerups'],
  ['ios-desktop/apps/flow11/index.html', 'FLOW_VOL_KEY', 'flow11-vol-v1', 'ios-desktop:flow11-vol-v1'],
  ['ios-desktop/apps/threes/index.html', 'HI_KEY', 'threes_hi', 'ios-desktop:threes-hi'],
  ['ios-desktop/apps/threes/index.html', 'RECORDS_KEY', 'threes_records', 'ios-desktop:threes-records'],
  ['ios-desktop/apps/typing/index.html', 'BEST_KEY', 'typing.best.v1', 'ios-desktop:typing-best-v1'],
  ['launch.html', 'SEED_HUE_KEY', 'launch-seed-hue', 'ios-desktop:launch-seed-hue'],
];

describe('#283 批次2 常量收编（B 档游戏域 8 键）', () => {
  for (const [f, C, OLD, NEW] of CASES) {
    it(`${f} · ${C} → ${NEW}`, () => {
      const s = read(f);
      expect(s).toContain(`${C} = '${NEW}'`);
      // 旧键不再作为常量值/主键出现（只允许迁移回落引用里的字面）
      expect(s).not.toContain(`${C} = '${OLD}'`);
      // 迁移 IIFE 三要素在位
      expect(s).toContain(`localStorage.getItem(${C}) === null`);
      expect(s).toContain(`localStorage.getItem('${OLD}')`);
      expect(s).toContain(`localStorage.setItem(${C}, o)`);
      expect(s).toContain(`localStorage.removeItem('${OLD}')`);
    });
  }

  it('dice 常量在 module 顶部（先于 init loadStats 调用执行——TDZ/时序防线）', () => {
    const s = read('ios-desktop/apps/dice/index.html');
    const iConst = s.indexOf("var STATS_KEY = 'ios-desktop:dice-lab-stats'");
    const iCall = s.indexOf('loadStats();');
    expect(iConst).toBeGreaterThan(-1);
    expect(iCall).toBeGreaterThan(iConst);
  });

  it('生成器分档：140 = ios-desktop 94 / settings 6 / android17 1 / bare 39（v11.38 #283 批5 D 档 5 键收编后快照演进；bare 不降系设计使然）', () => {
    const j = JSON.parse(read('docs/audits/storage-keys-registry.json'));
    expect(j.totals).toMatchObject({ all: 140, 'ios-desktop': 94, settings: 6, android17: 1, bare: 39 });
    const names = j.groups['ios-desktop'].map((x) => x.name);
    for (const [, , , NEW] of CASES) expect(names).toContain(NEW);
  });

  it('bare 组如实保留 8 旧键（迁移回落引用，非漏改）', () => {
    const j = JSON.parse(read('docs/audits/storage-keys-registry.json'));
    const bare = j.groups.bare.map((x) => x.name);
    for (const [, , OLD] of CASES) expect(bare).toContain(OLD);
  });

  it('LS_OWNER_RULES 专规则前移：6 条 ios-desktop 专规则在通用 ios-desktop: 规则之前（ownerOf 先匹配先返回——批 1 登记顺序陷阱兑现；typing/launch 沿批 1 壳层先例走 generic 归 __system）', () => {
    const s = read('ios-desktop/js/storage-stats.js');
    const iGeneric = s.indexOf("['ios-desktop:', '__system']");
    expect(iGeneric).toBeGreaterThan(-1);
    for (const k of ['ios-desktop:flow11-vol-v1', 'ios-desktop:flow11-powerups', 'ios-desktop:flow11-best', 'ios-desktop:threes-hi', 'ios-desktop:threes-records', 'ios-desktop:dice-lab-stats']) {
      const i = s.indexOf(`'${k}'`);
      expect(i).toBeGreaterThan(-1);
      expect(i, `${k} 必须在通用规则前`).toBeLessThan(iGeneric);
    }
    // 旧裸键规则位清零
    for (const k of ['flow11_best', 'flow11_powerups', 'flow11-vol-v1', 'threes_hi', 'threes_records', 'dice_lab_stats']) {
      expect(s).not.toContain(`['${k}',`);
    }
  });
});

// 迁移链路的等价语义验证（mock Storage）：旧键存在→搬移→删旧→幂等→不覆盖新键→异常静默
function makeLs(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _dump: () => Object.fromEntries(m),
  };
}
function migrate(ls, C, OLD) {
  try {
    if (ls.getItem(C) === null) {
      const o = ls.getItem(OLD);
      if (o !== null) { ls.setItem(C, o); ls.removeItem(OLD); }
    }
  } catch (e) { /* 绝不抛 */ }
}

describe('#283 批次2 迁移语义', () => {
  it('旧键存在：搬移到新键并清除旧键（threes_records 七处读写全走常量）', () => {
    const ls = makeLs({ threes_records: '[{"score":1024}]' });
    migrate(ls, 'ios-desktop:threes-records', 'threes_records');
    expect(ls._dump()).toEqual({ 'ios-desktop:threes-records': '[{"score":1024}]' });
  });

  it('幂等：重复执行不产生变化', () => {
    const ls = makeLs({ dice_lab_stats: '{"totalRolls":9}' });
    migrate(ls, 'ios-desktop:dice-lab-stats', 'dice_lab_stats');
    const a = ls._dump();
    migrate(ls, 'ios-desktop:dice-lab-stats', 'dice_lab_stats');
    expect(ls._dump()).toEqual(a);
  });

  it('新键已存在：不覆盖、不动旧键（回落期双写安全）', () => {
    const ls = makeLs({ 'ios-desktop:launch-seed-hue': '215', 'launch-seed-hue': '300' });
    migrate(ls, 'ios-desktop:launch-seed-hue', 'launch-seed-hue');
    expect(ls.getItem('ios-desktop:launch-seed-hue')).toBe('215');
    expect(ls.getItem('launch-seed-hue')).toBe('300');
  });

  it('两者皆空 / Storage 抛异常：静默不抛', () => {
    expect(() => migrate(makeLs(), 'ios-desktop:x', 'x')).not.toThrow();
    const boom = { getItem() { throw new Error('SecurityError'); }, setItem() {}, removeItem() {} };
    expect(() => migrate(boom, 'ios-desktop:x', 'x')).not.toThrow();
  });
});
