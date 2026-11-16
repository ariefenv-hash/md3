// #283 处置②批次5：D 档 5 键收编 + LS_OWNER_RULES 前移收口（camera/terminal 死规则复活）回归锚
// （常青命名，#291 §1；批 4b 同款范式扩展）守护：直读形态常数化 + 迁移 IIFE 先于装载首读 /
//   LS 七条规则（5 新 + camera/terminal 复活）全部前移通用规则前 / 旧键仅存回落引用 /
//   vd.safety.confirmed 豁免在案（sessionStorage 语义，键名维持零改动）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const CASES = [
  // [文件, 常量, 旧键, 新键, 落点数描述]
  ['ios-desktop/apps/notes/index.html', 'MEMOS_KEY', 'memos', 'ios-desktop:notes-memos', '装载读/save 写/onRefresh 重读三落点'],
  ['ios-desktop/apps/reminders/index.html', 'GROUPS_KEY', 'md3_groups', 'ios-desktop:reminders-groups', '装载读/save 写/onRefresh 重读三落点'],
  ['ios-desktop/apps/reminders/index.html', 'TASKS_KEY', 'md3_tasks', 'ios-desktop:reminders-tasks', '装载读/save 写/onRefresh 重读三落点'],
  ['ios-desktop/apps/translate/index.html', 'HISTORY_KEY', 'translationHistory', 'ios-desktop:translate-history', '装载读/save/清空/onRefresh/VFS 回写五落点'],
  ['ios-desktop/apps/translate/index.html', 'VISITED_KEY', 'visited', 'ios-desktop:translate-visited', '首访判定+双写三落点'],
];

describe('#283 批次5 D 档 5 键收编（直读形态常数化）', () => {
  for (const [f, C, OLD, NEW, sites] of CASES) {
    it(`${f} · ${C} → ${NEW}（${sites}全走常量 + 迁移 IIFE）`, () => {
      const s = read(f);
      expect(s).toContain(`${C} = '${NEW}'`);
      expect(s).not.toContain(`${C} = '${OLD}'`);
      // 迁移 IIFE 三要素在位（写端拥有清除权）
      expect(s).toContain(`localStorage.getItem(${C}) === null`);
      expect(s).toContain(`localStorage.getItem('${OLD}')`);
      expect(s).toContain(`localStorage.setItem(${C}, o)`);
      expect(s).toContain(`localStorage.removeItem('${OLD}')`);
    });
    it(`旧键 ${OLD} 在 ${f} 仅存回落引用（引号字面 = IIFE 的 getItem+removeItem 两处；直读写清零残留）`, () => {
      const s = read(f);
      expect(s.split(`'${OLD}'`).length - 1).toBe(2);
      expect(s).not.toContain(`localStorage.setItem('${OLD}'`);
      expect(s).not.toContain(`= JSON.parse(localStorage.getItem('${OLD}')`);
    });
    it(`${C} 先于首读（时序防线）`, () => {
      const s = read(f);
      expect(s.indexOf(`const ${C} =`)).toBeLessThan(s.indexOf(`localStorage.getItem(${C})`));
    });
  }

  it('LS 七条规则全部前移通用规则前（5 新名 + camera/terminal 历史死规则复活）', () => {
    const s = read('ios-desktop/js/storage-stats.js');
    const iGen = s.indexOf("['ios-desktop:', '__system']");
    for (const rule of ["['ios-desktop:notes-memos', 'notes']", "['ios-desktop:reminders-groups', 'reminders']",
      "['ios-desktop:reminders-tasks', 'reminders']", "['ios-desktop:translate-history', 'translate']",
      "['ios-desktop:translate-visited', 'translate']", "['ios-desktop:camera-gallery', 'camera']",
      "['ios-desktop:terminal-history', 'terminal']"]) {
      const i = s.indexOf(rule);
      expect(i).toBeGreaterThan(-1);
      expect(i, rule).toBeLessThan(iGen);
      expect(s.split(rule).length - 1).toBe(1);
    }
    expect(s).not.toContain("['memos', 'notes']");
    expect(s).not.toContain("['md3_groups', 'reminders']");
    expect(s).not.toContain("['md3_tasks', 'reminders']");
    expect(s).not.toContain("['translationHistory', 'translate']");
    expect(s).not.toContain("['visited', 'translate']");
  });

  it('vd.safety.confirmed 豁免在案：registry.md 注记语义裁决（sessionStorage），代码零改动', () => {
    const md = read('docs/storage-keys-registry.md');
    expect(md).toContain('sessionStorage');
    const s = read('ios-desktop/js/volume-dialog.js');
    expect(s).toContain("const SAFETY_CONFIRMED_KEY = 'vd.safety.confirmed'");
    expect(s).toContain('sessionStorage.setItem(SAFETY_CONFIRMED_KEY');
    expect(s).toContain('sessionStorage.getItem(SAFETY_CONFIRMED_KEY');
  });

  it('e2e-v177-text-bridge 字面直灌新键零残留', () => {
    const s = read('scripts/e2e-v177-text-bridge.mjs');
    expect(s).toContain("'ios-desktop:translate-history'");
    expect(s).not.toContain("'translationHistory'");
  });

  it('测试锚同步在录（v219 归属语义全量换新键 + camera/terminal 复活断言 + m3e 三 needle + text-bridge 常数形态）', () => {
    const v219 = read('tests/v219-app-data-registry.test.js');
    expect(v219).toContain("ownerOfLs('ios-desktop:notes-memos')");
    expect(v219).toContain("ownerOfLs('ios-desktop:camera-gallery')");
    expect(v219).toContain("ownerOfLs('ios-desktop:terminal-history')");
    expect(v219).toContain("'ios-desktop:reminders-tasks': 't1'");
    expect(v219).not.toContain("makeLs({ memos:");
    const m3e = read('tests/m3e-theme-pull-stretch.test.js');
    expect(m3e).toContain('localStorage.getItem(MEMOS_KEY)');
    expect(m3e).toContain("'ios-desktop:reminders-groups'");
    expect(m3e).toContain("'ios-desktop:translate-history'");
    const tb = read('tests/text-bridge.test.js');
    expect(tb).toContain("toContain('localStorage.setItem(HISTORY_KEY'");
  });

  it('生成器分档：140 = ios-desktop 94 / settings 6 / android17 1 / bare 39（v11.36 #283 批5 收编+v11.48 #322 新增 icon-wave 后快照演进；bare 不降系设计使然：五旧键字面仅存回落引用）', () => {
    const j = JSON.parse(read('docs/audits/storage-keys-registry.json'));
    expect(j.totals).toMatchObject({ all: 140, 'ios-desktop': 94, settings: 6, android17: 1, bare: 39 });
    const names = j.groups['ios-desktop'].map((x) => x.name);
    for (const [, , , NEW] of CASES) expect(names).toContain(NEW);
  });

  it('bare 组如实保留五旧键 + vd.safety.confirmed 豁免维持在册（回落引用/豁免注记，非漏改）', () => {
    const j = JSON.parse(read('docs/audits/storage-keys-registry.json'));
    const bare = j.groups.bare.map((x) => x.name);
    for (const [, , OLD] of CASES) expect(bare).toContain(OLD);
    expect(bare).toContain('vd.safety.confirmed');
  });
});

// 迁移链路等价语义（mock Storage）：五键写端搬移同款
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

describe('#283 批次5 迁移语义（写端搬移）', () => {
  for (const [, C, OLD, NEW] of CASES) {
    it(`${OLD} → ${NEW} 搬移清旧（幂等：二跑不覆盖）`, () => {
      const ls = makeLs({ [OLD]: '{"seed":1}' });
      migrateWrite(ls, NEW, OLD);
      migrateWrite(ls, NEW, OLD);
      expect(ls.getItem(NEW)).toBe('{"seed":1}');
      expect(ls.getItem(OLD)).toBeNull();
    });
  }

  it('新键缺失且旧键缺失：静默无写入', () => {
    const ls = makeLs({});
    migrateWrite(ls, 'ios-desktop:notes-memos', 'memos');
    expect(ls.getItem('ios-desktop:notes-memos')).toBeNull();
  });

  it('异常静默：Storage 抛错不炸（五键同律）', () => {
    const boom = { getItem() { throw new Error('SecurityError'); }, setItem() {}, removeItem() {} };
    for (const [, C, OLD, NEW] of CASES) expect(() => migrateWrite(boom, NEW, OLD)).not.toThrow();
  });
});
