// #283 处置②批次1：9 裸键收编的迁移回归锚（常青命名，#291 §1）
// 守护：常量值为 ios-desktop: 新键 / 幂等迁移 IIFE 在位 / 旧键仅存回落引用 / 搬移链路语义。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

// 与 apply-batch16.py 的 EDITS 同源（9 键 / 10 处常量定义）
const CASES = [
  ['ios-desktop/apps/books/index.html', 'BOOKS_PROGRESS_KEY', 'md3_books_progress_v1', 'ios-desktop:books-progress-v1'],
  ['ios-desktop/apps/books/index.html', 'BOOKS_SETTINGS_KEY', 'md3_books_settings_v1', 'ios-desktop:books-settings-v1'],
  ['ios-desktop/apps/messages/index.html', 'ROOM_STATE_KEY', 'md3_messages_rooms_v1', 'ios-desktop:messages-rooms-v1'],
  ['ios-desktop/apps/messages/index.html', 'MSG_STATE_KEY', 'md3_messages_state_v1', 'ios-desktop:messages-state-v1'],
  ['ios-desktop/apps/music/index.html', 'MUSIC_PREFS_KEY', 'md3_music_prefs_v1', 'ios-desktop:music-prefs-v1'],
  ['ios-desktop/apps/safari/index.html', 'SESSION_KEY', 'md3_safari_session_v1', 'ios-desktop:safari-session-v1'],
  ['ios-desktop/apps/stocks/index.html', 'PREFS_KEY', 'md3_stocks_prefs_v1', 'ios-desktop:stocks-prefs-v1'],
  ['ios-desktop/apps/typing/index.html', 'FONT_KEY', 'typing.fontsize.v1', 'ios-desktop:typing-fontsize-v1'],
  ['ios-desktop/js/apps/settings-ripple.js', 'RIPPLE_CFG_KEY', 'rippleCfg_v1', 'ios-desktop:ripple-config-v1'],
  ['ios-desktop/js/charging-ripple.js', 'RIPPLE_CFG_KEY', 'rippleCfg_v1', 'ios-desktop:ripple-config-v1'],
];

describe('#283 批次1 常量收编', () => {
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

  it('生成器分档：113 = ios-desktop 67 / settings 6 / android17 1 / bare 39', () => {
    const j = JSON.parse(read('docs/audits/storage-keys-registry.json'));
    expect(j.totals).toMatchObject({ all: 113, 'ios-desktop': 67, settings: 6, android17: 1, bare: 39 });
    const names = j.groups['ios-desktop'].map((x) => x.name);
    for (const [, , , NEW] of CASES) expect(names).toContain(NEW);
  });

  it('bare 组如实保留旧键（迁移回落引用，非漏改）', () => {
    const j = JSON.parse(read('docs/audits/storage-keys-registry.json'));
    const bare = j.groups.bare.map((x) => x.name);
    for (const [, , OLD] of CASES) expect(bare).toContain(OLD);
  });
});

// 迁移链路的等价语义验证（mock Storage）：旧键存在→搬移→删旧→幂等→不覆盖新键
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

describe('#283 批次1 迁移语义', () => {
  it('旧键存在：搬移到新键并清除旧键', () => {
    const ls = makeLs({ 'md3_books_progress_v1': '{"p":42}' });
    migrate(ls, 'ios-desktop:books-progress-v1', 'md3_books_progress_v1');
    expect(ls._dump()).toEqual({ 'ios-desktop:books-progress-v1': '{"p":42}' });
  });

  it('幂等：重复执行不产生变化', () => {
    const ls = makeLs({ 'rippleCfg_v1': 'cfg' });
    migrate(ls, 'ios-desktop:ripple-config-v1', 'rippleCfg_v1');
    const a = ls._dump();
    migrate(ls, 'ios-desktop:ripple-config-v1', 'rippleCfg_v1');
    expect(ls._dump()).toEqual(a);
  });

  it('新键已存在：不覆盖、不动旧键（回落期双写安全）', () => {
    const ls = makeLs({ 'ios-desktop:typing-fontsize-v1': 'new', 'typing.fontsize.v1': 'old' });
    migrate(ls, 'ios-desktop:typing-fontsize-v1', 'typing.fontsize.v1');
    expect(ls.getItem('ios-desktop:typing-fontsize-v1')).toBe('new');
    expect(ls.getItem('typing.fontsize.v1')).toBe('old');
  });

  it('双文件同键（rippleCfg）：两次 IIFE 先后执行结果一致', () => {
    const ls = makeLs({ rippleCfg_v1: 'cfg' });
    migrate(ls, 'ios-desktop:ripple-config-v1', 'rippleCfg_v1');
    migrate(ls, 'ios-desktop:ripple-config-v1', 'rippleCfg_v1');
    expect(ls._dump()).toEqual({ 'ios-desktop:ripple-config-v1': 'cfg' });
  });

  it('两者皆空 / Storage 抛异常：静默不抛', () => {
    expect(() => migrate(makeLs(), 'ios-desktop:x', 'x')).not.toThrow();
    const boom = { getItem() { throw new Error('SecurityError'); }, setItem() {}, removeItem() {} };
    expect(() => migrate(boom, 'ios-desktop:x', 'x')).not.toThrow();
  });
});
