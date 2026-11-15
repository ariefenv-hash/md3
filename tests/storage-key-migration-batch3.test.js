// #283 处置②批次3：B 档后半 8 键收编的迁移回归锚（常青命名，#291 §1；批 1/2 同款范式）
// 守护：常量值为 ios-desktop: 新键 / 幂等迁移 IIFE 在位 / 旧键仅存回落引用 / 搬移链路语义。
// 本批 8 键全为 constant 形态（改值+IIFE，读写点零改动）；无既有 LS 专规则 → 沿批 1/2 壳层先例
// 走 generic `['ios-desktop:','__system']` 归 __system（批次 5 收口时统一复评）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

// 与 surgery-283-batch3.py 同源（7 键 / 7 处常量改值）
const CASES = [
  ['ios-desktop/apps/weather/index.html', 'LOC_KEY', 'md3_weather_loc_v1', 'ios-desktop:weather-loc-v1'],
  ['ios-desktop/apps/weather/index.html', 'REFRESH_KEY', 'md3_weather_relocate_min_v1', 'ios-desktop:weather-relocate-min-v1'],
  ['ios-desktop/js/taskbar-transient.js', 'EDU_KEY', 'md3.tbTransientEdu', 'ios-desktop:tb-transient-edu'],
  ['ios-desktop/js/volume-dialog.js', 'MO_ACTIVE_KEY', 'media-output:active', 'ios-desktop:media-output:active'],
  ['ios-desktop/js/volume-dialog.js', 'MO_SPATIAL_KEY', 'media-output:spatial', 'ios-desktop:media-output:spatial'],
  ['ios-desktop/apps/ocr/app.mjs', 'KEY', 'ocr-res-font-v1', 'ios-desktop:ocr-res-font-v1'],
  ['ios-desktop/js/one-handed.js', 'TIMEOUT_STORAGE_KEY', 'one_handed_timeout_v1', 'ios-desktop:one-handed-timeout-v1'],
  ['ios-desktop/apps/stt/index.html', 'ST_HIST_KEY', 'sttHistory', 'ios-desktop:stt-history'],
];

describe('#283 批次3 常量收编（B 档后半 8 键）', () => {
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

  it('生成器分档：140 = ios-desktop 94 / settings 6 / android17 1 / bare 39（v11.45 #283 批5 收编后快照演进；bare 不降系设计使然：旧键字面仅存迁移回落引用）', () => {
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

  it('双冒号子命名空间先例：media-output 两键落 ios-desktop:media-output:*（ref-map 注记建议形态；ownerOf 通用规则前缀匹配覆盖）', () => {
    const j = JSON.parse(read('docs/audits/storage-keys-registry.json'));
    const names = j.groups['ios-desktop'].map((x) => x.name);
    expect(names).toContain('ios-desktop:media-output:active');
    expect(names).toContain('ios-desktop:media-output:spatial');
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

describe('#283 批次3 迁移语义', () => {
  it('旧键存在：搬移到新键并清除旧键（weather 定位记录含 src 标记）', () => {
    const ls = makeLs({ md3_weather_loc_v1: '{"city":"北京","src":"manual"}' });
    migrate(ls, 'ios-desktop:weather-loc-v1', 'md3_weather_loc_v1');
    expect(ls._dump()).toEqual({ 'ios-desktop:weather-loc-v1': '{"city":"北京","src":"manual"}' });
  });

  it('幂等：重复执行不产生变化', () => {
    const ls = makeLs({ sttHistory: '[{"t":"x"}]' });
    migrate(ls, 'ios-desktop:stt-history', 'sttHistory');
    const a = ls._dump();
    migrate(ls, 'ios-desktop:stt-history', 'sttHistory');
    expect(ls._dump()).toEqual(a);
  });

  it('新键已存在：不覆盖、不动旧键（回落期双写安全）', () => {
    const ls = makeLs({ 'ios-desktop:media-output:spatial': '1', 'media-output:spatial': '0' });
    migrate(ls, 'ios-desktop:media-output:spatial', 'media-output:spatial');
    expect(ls.getItem('ios-desktop:media-output:spatial')).toBe('1');
    expect(ls.getItem('media-output:spatial')).toBe('0');
  });

  it('两者皆空 / Storage 抛异常：静默不抛', () => {
    expect(() => migrate(makeLs(), 'ios-desktop:x', 'x')).not.toThrow();
    const boom = { getItem() { throw new Error('SecurityError'); }, setItem() {}, removeItem() {} };
    expect(() => migrate(boom, 'ios-desktop:x', 'x')).not.toThrow();
  });
});
