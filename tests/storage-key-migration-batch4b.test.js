// #283 处置②批次4b：C 档余 3 键双端同批收编的迁移回归锚（常青命名，#291 §1；批 4a 同款范式扩展）
// 守护：写端常量值为 ios-desktop: 新键 + 迁移 IIFE 在位 / contacts 读端主读新键+旧键回落（不清除）/
//       clock 直读形态常数化（常量先于首读=时序防线）/ e2e 12 脚本字面直灌新键零残留 /
//       LS 规则新名在录且前移 / 旧键仅存回落引用（bare 如实保留）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const CASES = [
  // [写端文件, 常量, 旧键, 新键, 读端文件（双端共享键；单端写读键 reader=写端文件）]
  ['ios-desktop/apps/contacts/index.html', 'KEY', 'md3_contacts', 'ios-desktop:contacts-v1', 'ios-desktop/apps/phone/index.html'],
  ['ios-desktop/apps/messages/index.html', 'BOT_STATE_KEY', 'md3_messages_bots_v1', 'ios-desktop:messages-bots-v1', 'ios-desktop/apps/messages/index.html'],
];

const MSG_E2E = ['scripts/e2e-v856-chatbot.mjs', 'scripts/probe-v856-burst.mjs', 'scripts/probe-v856-dispatch.mjs'];

describe('#283 批次4b C 档余 3 键收编（双端同批）', () => {
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
    it(`旧键 ${OLD} 在写端仅存回落引用（引号字面 = IIFE 的 getItem+removeItem 两处）`, () => {
      const s = read(f);
      expect(s.split(`'${OLD}'`).length - 1).toBe(2);
    });
  }

  it('contacts 读端 phone/index.html · 主读新键 + 旧键回落（不清除——清除权在写端，批4a loadAgenda 先例同款）', () => {
    const r = read('ios-desktop/apps/phone/index.html');
    expect(r).toContain("localStorage.getItem('ios-desktop:contacts-v1')");
    expect(r).toContain("localStorage.getItem('md3_contacts')");
    expect(r).not.toContain("localStorage.removeItem('md3_contacts')");
    // raw null 判定回落形态在位（loadAgenda rawEv 同款）
    expect(r).toContain("if (raw === null) { try { raw = localStorage.getItem('md3_contacts'); } catch (e) {} }");
  });






  it('e2e 三脚本 messages 字面直灌新键零残留（probe-v856-dispatch 为 ref-map 漏项自纠）', () => {
    for (const f of MSG_E2E) {
      const s = read(f);
      expect(s).toContain("'ios-desktop:messages-bots-v1'");
      expect(s).not.toContain("'md3_messages_bots_v1'");
    }
  });

  it('生成器分档：138 = ios-desktop 93 / settings 6 / android17 1 / bare 38（v11.50 #283 批5 收编后快照演进；bare 不降系设计使然：三旧键字面仅存回落引用）', () => {
    const j = JSON.parse(read('docs/audits/storage-keys-registry.json'));
    expect(j.totals).toMatchObject({ all: 138, 'ios-desktop': 93, settings: 6, android17: 1, bare: 38 });
    const names = j.groups['ios-desktop'].map((x) => x.name);
    for (const [, , , NEW] of CASES) expect(names).toContain(NEW);
  });

  it('bare 组如实保留两旧键（clock 写端随应用删除退役，非漏改）', () => {
    const j = JSON.parse(read('docs/audits/storage-keys-registry.json'));
    const bare = j.groups.bare.map((x) => x.name);
    expect(bare).toContain('md3_contacts');
    expect(bare).toContain('md3_messages_bots_v1');
    expect(bare).not.toContain('android_clock_state');
  });

  it('LS 规则新名在录且 ownerOf 命中（专规则在通用规则前——clock 规则前移=批2 顺序陷阱兑现）', () => {
    const s = read('ios-desktop/js/storage-stats.js');
    const iGeneric = s.indexOf("['ios-desktop:', '__system']");
    const iContacts = s.indexOf("['ios-desktop:contacts-v1', 'phone']");
    expect(iContacts).toBeGreaterThan(-1);
    expect(iContacts).toBeLessThan(iGeneric);
    expect(s).not.toContain("['md3_contacts', 'phone']");
    expect(s).not.toContain("['android_clock_state', 'clock_app']");
  });


});

// 迁移链路等价语义（mock Storage）：写端搬移 + contacts 读端回落两通道
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

describe('#283 批次4b 迁移语义（写端搬移 + 读端回落）', () => {
  it('contacts 写端 IIFE：旧通讯录搬移新键并清旧键', () => {
    const ls = makeLs({ md3_contacts: '[{"name":"张三","tel":"13800000000"}]' });
    migrateWrite(ls, 'ios-desktop:contacts-v1', 'md3_contacts');
    expect(ls.getItem('ios-desktop:contacts-v1')).toContain('张三');
    expect(ls.getItem('md3_contacts')).toBeNull();
  });

  it('messages 写端 IIFE：bot 会话搬移新键并清旧键（幂等：二跑不覆盖新键）', () => {
    const ls = makeLs({ md3_messages_bots_v1: '{"version":1,"chats":{}}' });
    migrateWrite(ls, 'ios-desktop:messages-bots-v1', 'md3_messages_bots_v1');
    migrateWrite(ls, 'ios-desktop:messages-bots-v1', 'md3_messages_bots_v1'); // 幂等
    expect(JSON.parse(ls.getItem('ios-desktop:messages-bots-v1')).version).toBe(1);
    expect(ls.getItem('md3_messages_bots_v1')).toBeNull();
  });

  it('clock 写端 IIFE：闹钟状态搬移新键并清旧键', () => {
    const ls = makeLs({ android_clock_state: '{"masterVolume":0.85}' });
    migrateWrite(ls, 'ios-desktop:clock-state-v1', 'android_clock_state');
    expect(JSON.parse(ls.getItem('ios-desktop:clock-state-v1')).masterVolume).toBe(0.85);
    expect(ls.getItem('android_clock_state')).toBeNull();
  });

  it('contacts 读端回落：未迁移会话（仅旧键）读端仍可见且旧键保留', () => {
    const ls = makeLs({ md3_contacts: '[{"name":"李四"}]' });
    expect(readDual(ls, 'ios-desktop:contacts-v1', 'md3_contacts')).toContain('李四');
    expect(ls.getItem('md3_contacts')).not.toBeNull();
  });

  it('新键优先：两键并存读端以新键为准', () => {
    const ls = makeLs({ 'ios-desktop:contacts-v1': '[{"name":"新"}]', md3_contacts: '[{"name":"旧"}]' });
    expect(readDual(ls, 'ios-desktop:contacts-v1', 'md3_contacts')).toBe('[{"name":"新"}]');
  });

  it('异常静默：Storage 抛错不炸（三键同律）', () => {
    const boom = { getItem() { throw new Error('SecurityError'); }, setItem() {}, removeItem() {} };
    expect(() => migrateWrite(boom, 'ios-desktop:contacts-v1', 'md3_contacts')).not.toThrow();
    expect(() => migrateWrite(boom, 'ios-desktop:messages-bots-v1', 'md3_messages_bots_v1')).not.toThrow();
    expect(() => migrateWrite(boom, 'ios-desktop:clock-state-v1', 'android_clock_state')).not.toThrow();
    expect(() => readDual(boom, 'ios-desktop:contacts-v1', 'md3_contacts')).not.toThrow();
  });
});
