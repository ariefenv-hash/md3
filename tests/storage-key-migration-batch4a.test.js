// #283 处置②批次4a：C 档跨应用共享双键收编的迁移回归锚（常青命名，#291 §1；批 1/2/3 同款范式 + 双端同批）
// 守护：写端常量值为 ios-desktop: 新键 + 迁移 IIFE 在位 / 读端主读新键+旧键回落（不清除）/
//       旧键仅存回落引用 / LS 规则新名在录。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const CASES = [
  // [写端文件, 常量, 旧键, 新键, 读端文件]
  ['ios-desktop/apps/calendar/index.html', 'EV_DB_KEY', 'calevents_v1', 'ios-desktop:calevents-v1', 'ios-desktop/apps/clock-app/app.mjs'],
  ['ios-desktop/apps/calendar/index.html', 'DB_KEY', 'calnotes_v2', 'ios-desktop:calnotes-v2', 'ios-desktop/js/cal-sync.js'],
];

describe('#283 批次4a 共享双键收编（C 档双端同批）', () => {
  for (const [f, C, OLD, NEW, reader] of CASES) {
    it(`写端 ${f} · ${C} → ${NEW}（常量改值 + 迁移 IIFE）`, () => {
      const s = read(f);
      expect(s).toContain(`${C} = '${NEW}'`);
      expect(s).not.toContain(`${C} = '${OLD}'`);
      // 迁移 IIFE 三要素在位（写端拥有清除权）
      expect(s).toContain(`localStorage.getItem(${C}) === null`);
      expect(s).toContain(`localStorage.getItem('${OLD}')`);
      expect(s).toContain(`localStorage.setItem(${C}, o)`);
      expect(s).toContain(`localStorage.removeItem('${OLD}')`);
    });

    it(`读端 ${reader} · 主读 ${NEW} + 旧键回落（不清除——清除权在写端，v11.17 vfs.js 先例同律）`, () => {
      const r = read(reader);
      expect(r).toContain(`'${NEW}'`);
      expect(r).toContain(`'${OLD}'`);
      expect(r).not.toContain(`localStorage.removeItem('${OLD}')`);
      // cal-sync 读端回落走 readCalendarNotes 回落分支；clock-app 走 rawEv null 判定回落
    });
  }

  it('cal-sync 读端回落分支在 readCalendarNotes 内（新键缺失/解析空 → 旧裸键回落）', () => {
    const s = read('ios-desktop/js/cal-sync.js');
    expect(s).toContain("raw = JSON.parse(store.getItem('calnotes_v2') || 'null')");
  });

  it('clock-app 读端回落分支在 loadAgenda 内（rawEv null 判定 → 旧裸键回落）', () => {
    const s = read('ios-desktop/apps/clock-app/app.mjs');
    expect(s).toContain("rawEv = localStorage.getItem('ios-desktop:calevents-v1')");
    expect(s).toContain("rawEv = localStorage.getItem('calevents_v1')");
  });

  it('生成器分档：140 = ios-desktop 94 / settings 6 / android17 1 / bare 39（v11.42 #283 批5 收编后快照演进；bare 不降系设计使然：双旧键字面仅存回落引用）', () => {
    const j = JSON.parse(read('docs/audits/storage-keys-registry.json'));
    expect(j.totals).toMatchObject({ all: 140, 'ios-desktop': 94, settings: 6, android17: 1, bare: 39 });
    const names = j.groups['ios-desktop'].map((x) => x.name);
    for (const [, , , NEW] of CASES) expect(names).toContain(NEW);
  });

  it('bare 组如实保留双旧键（回落引用，非漏改）', () => {
    const j = JSON.parse(read('docs/audits/storage-keys-registry.json'));
    const bare = j.groups.bare.map((x) => x.name);
    expect(bare).toContain('calevents_v1');
    expect(bare).toContain('calnotes_v2');
  });

  it('LS 规则新名在录且 ownerOf 命中 calendar（专规则在通用规则前）', () => {
    const s = read('ios-desktop/js/storage-stats.js');
    const iGeneric = s.indexOf("['ios-desktop:', '__system']");
    const iRule = s.indexOf("['ios-desktop:calevents-v1', 'calendar']");
    expect(iRule).toBeGreaterThan(-1);
    expect(iRule).toBeLessThan(iGeneric);
  });
});

// 迁移链路等价语义（mock Storage）：写端搬移 + 读端回落两通道
function makeLs(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _dump: () => Object.fromEntries(m),
  };
}
function migrateWrite(ls, C, OLD) {
  try {
    if (ls.getItem(C) === null) {
      const o = ls.getItem(OLD);
      if (o !== null) { ls.setItem(C, o); ls.removeItem(OLD); }
    }
  } catch (e) { /* 绝不抛 */ }
}
function readDual(ls, NEW, OLD) {
  let raw = null;
  try { raw = ls.getItem(NEW); } catch (e) {}
  if (raw === null) { try { raw = ls.getItem(OLD); } catch (e) {} }
  return raw;
}

describe('#283 批次4a 迁移语义（写端搬移 + 读端回落）', () => {
  it('写端 IIFE：旧日程搬移新键并清旧键', () => {
    const ls = makeLs({ calevents_v1: '{"2026-01-01":[{"time":"09:00","title":"晨会"}]}' });
    migrateWrite(ls, 'ios-desktop:calevents-v1', 'calevents_v1');
    expect(ls.getItem('ios-desktop:calevents-v1')).toContain('晨会');
    expect(ls.getItem('calevents_v1')).toBeNull();
  });

  it('读端回落：未迁移会话（仅旧键）读端仍可见且旧键保留', () => {
    const ls = makeLs({ calevents_v1: '{"2026-01-01":[{"time":"09:00","title":"晨会"}]}' });
    expect(readDual(ls, 'ios-desktop:calevents-v1', 'calevents_v1')).toContain('晨会');
    expect(ls.getItem('calevents_v1')).not.toBeNull();
  });

  it('新键优先：两键并存读端以新键为准', () => {
    const ls = makeLs({ 'ios-desktop:calevents-v1': '{"new":1}', calevents_v1: '{"old":1}' });
    expect(readDual(ls, 'ios-desktop:calevents-v1', 'calevents_v1')).toBe('{"new":1}');
  });

  it('异常静默：Storage 抛错不炸', () => {
    const boom = { getItem() { throw new Error('SecurityError'); }, setItem() {}, removeItem() {} };
    expect(() => migrateWrite(boom, 'ios-desktop:x', 'x')).not.toThrow();
    expect(() => readDual(boom, 'ios-desktop:x', 'x')).not.toThrow();
  });
});
