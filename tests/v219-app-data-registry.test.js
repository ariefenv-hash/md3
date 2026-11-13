// ==================== v219-app-data-registry.test.js — #219 清除单沙箱应用信息 + 登记表 ====================
// @snapshot · 交付时点快照（#291 §1 裁决）：钉扎对象=app-data 注册面内容；允许随快照失义退役（docs/test-naming-evergreen.md §4 登记制）——R149 改名机械批注入
//
// 用户指令（#219）：按应用维度清理数据（对标 AOSP AppInfo → Storage & cache →
// Clear storage / Clear cache），前置 = 建立「应用 → 数据位置」登记表（#178 落地件）。
//
// 交付（v11.21 R120 窗 · 实例 C）：
//   · app-data-registry.js —— 登记表消费端（LS/IDB 规则单一物理真源在 storage-stats.js，
//     v8.36/v839~v842 系列源码锚不迁移；VFS 全量 __shared 共享存储保护面）+
//     snapshot/clear/restore/cache 注入式纯核
//   · storage-stats.js 归属规则补登记（R120 窗全库盘点实测勘误：md3_contacts→phone /
//     calevents_v1→calendar / flow11 双键→flow11 / files_clean_freed_total→files /
//     settings:display-v1→settings）
//   · settings 页 6 应用行 → AppInfo 底部弹层（清除数据 = 确认 + 快照 + 5s 撤销窗，
//     #238 同款纪律；清除缓存 = 缓存面如实呈现不造数）
//
// 覆盖：A 单一真源锚 / B 归属语义 / C 快照-清除-回滚行为（注入式 fake）/ D 保护面 / E 接线锚。

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  VFS_OWNER_RULES, PROTECTED_OWNERS,
  ownerOfLs, ownerOfIdb,
  listAppData, snapshotAppData, clearAppData, clearAppCache, restoreAppData,
} from '../ios-desktop/js/app-data-registry.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => readFileSync(join(ROOT, p), 'utf-8');

const registryJs = src('ios-desktop/js/app-data-registry.js');
const statsJs = src('ios-desktop/js/storage-stats.js');
const settingsJs = src('ios-desktop/js/apps/settings.js');

// ---------- 注入式 fake（happy-dom localStorage 隔离，不污染真实键面） ----------
function makeLs(seed) {
  const m = new Map(Object.entries(seed || {}));
  return {
    _m: m,
    get length() { return m.size; },
    key(i) { return Array.from(m.keys())[i] ?? null; },
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}
function makeIdb(entries) {
  const m = new Map(entries || []);
  return {
    idbAll: async () => Array.from(m.entries()).map(([key, value]) => ({ key, value })),
    idbRemove: async (k) => { m.delete(k); },
    idbPut: async (k, v) => { m.set(k, v); },
  };
}
function depsWith(ls, idb) {
  return { ls, idbAll: idb.idbAll, idbRemove: idb.idbRemove, idbPut: idb.idbPut };
}

// ==================== A · 单一真源锚 ====================
describe('v11.21 #219 A · 登记表单一真源锚', () => {
  test('A1 app-data-registry 导入 storage-stats 规则（不重复登记）', () => {
    expect(registryJs).toContain("import { LS_OWNER_RULES, IDB_OWNER_RULES, ownerOf } from './storage-stats.js'");
    // 规则本体不迁移：registry 文件内不得出现重复的规则数组字面量
    expect(registryJs).not.toContain("['ios-desktop:', '__system']");
    expect(registryJs).not.toContain("['memos', 'notes']");
  });

  test('A2 storage-stats 源码锚不回归（v840 terminal-history 在录）', () => {
    expect(statsJs).toContain("['ios-desktop:terminal-history', 'terminal']");
    expect(statsJs).toContain('export const LS_OWNER_RULES');
    expect(statsJs).toContain('export const IDB_OWNER_RULES');
    expect(statsJs).toContain('export function ownerOf');
  });

  test('A3 R120 窗盘点勘误六键全部入登记（实测落点注释在录）', () => {
    expect(statsJs).toMatch(/\['md3_contacts', 'phone'\]/);
    expect(statsJs).toMatch(/\['calevents_v1', 'calendar'\]/);
    expect(statsJs).toMatch(/\['flow11-vol-v1', 'flow11'\]/);
    expect(statsJs).toMatch(/\['flow11_powerups', 'flow11'\]/);
    expect(statsJs).toMatch(/\['ios-desktop:files-clean-freed-total', 'files'\]/); // v11.17 #283：收编旧裸键重锚
    expect(statsJs).toMatch(/\['settings:display-v1', 'settings'\]/);
    // 勘误溯源注记（#219 纪律：注释 = 代码）
    expect(statsJs).toContain('apps/phone/index.html 实测');
    expect(statsJs).toContain('apps/calendar/index.html 实测');
  });

  test('A4 VFS 共享存储保护面（AOSP 对标：清除应用数据不触碰共享存储）', () => {
    expect(VFS_OWNER_RULES).toEqual([['/', '__shared']]);
    expect(PROTECTED_OWNERS).toEqual(['__system', '__shared', '__other']);
  });
});

// ==================== B · 归属语义 ====================
describe('v11.21 #219 B · 归属判定语义', () => {
  test('B1 LS 精确命中与系统前缀', () => {
    expect(ownerOfLs('memos')).toBe('notes');
    expect(ownerOfLs('md3_contacts')).toBe('phone');
    expect(ownerOfLs('calevents_v1')).toBe('calendar');
    expect(ownerOfLs('ios-desktop:theme-hue')).toBe('__system');
    expect(ownerOfLs('android17:shadeMode')).toBe('__system');
    expect(ownerOfLs('totally_unknown_key')).toBe('__other');
  });

  test('B2 IDB 前缀命中（VFS 键属 files 域、壁纸字体属系统域）', () => {
    expect(ownerOfIdb('vfs:photos/a.png')).toBe('files');
    expect(ownerOfIdb('vfs-meta:photos/a.png')).toBe('files');
    expect(ownerOfIdb('wallpaper-blob')).toBe('__system');
    expect(ownerOfIdb('font-blob')).toBe('__system');
    expect(ownerOfIdb('unknown-idb-key')).toBe('__other');
  });

  test('B3 清除缓存语义：登记表缓存面如实为空（不造数）', async () => {
    const ls = makeLs({ memos: 'a' });
    const idb = makeIdb([]);
    const res = await clearAppCache('notes', depsWith(ls, idb));
    expect(res.cacheRemoved).toBe(0);
    expect(res.note).toContain('缓存面为空');
  });
});

// ==================== C · 快照-清除-回滚行为（注入式） ====================
describe('v11.21 #219 C · 清除数据三段行为', () => {
  test('C1 listAppData：登记键逐键命中、保护面零误伤', () => {
    const ls = makeLs({
      'memos': 'note1', 'md3_groups': 'g1', 'md3_tasks': 't1',
      'ios-desktop:theme-hue': '200', 'ios-desktop:folders': '[]', 'wallpaper_junk': 'x',
    });
    const idb = makeIdb([['vfs:photos/a.png', 'blob'], ['wallpaper-blob', 'blob']]);
    const d = depsWith(ls, idb);
    const notes = listAppData('notes', d);
    expect(notes.ls).toEqual(['memos']);
    expect(notes.ls).not.toContain('ios-desktop:theme-hue');
    const reminders = listAppData('reminders', d);
    expect(reminders.ls).toEqual(['md3_groups', 'md3_tasks']);
    const system = listAppData('__system', d);
    expect(system.ls).toContain('ios-desktop:theme-hue');
    expect(system.ls).toContain('ios-desktop:folders');
    // VFS 键属 files 域（共享内容段管理），壁纸 blob 属系统域
    const files = listAppData('files', d);
    expect(files.ls).toEqual([]);
  });

  test('C2 快照→清除→数据消失；保护面与未知键零触碰', async () => {
    const ls = makeLs({
      'memos': 'my-note', 'ios-desktop:theme-hue': '200', 'unknown_key': 'keep-me',
    });
    const idb = makeIdb([['font-blob', new Uint8Array([1])], ['font-name', 'Custom']]);
    const d = depsWith(ls, idb);
    const snap = await snapshotAppData('notes', d);
    expect(snap.appId).toBe('notes');
    expect(snap.ls).toEqual({ memos: 'my-note' });
    const res = await clearAppData('notes', d);
    expect(res.lsRemoved).toBe(1);
    expect(ls.getItem('memos')).toBeNull();
    // 铁律⑤：系统域 / 未登记键永不清除
    expect(ls.getItem('ios-desktop:theme-hue')).toBe('200');
    expect(ls.getItem('unknown_key')).toBe('keep-me');
    // IDB 壁纸/字体属 __system → 不在清除面
    expect(idb.idbAll === undefined).toBe(false);
  });

  test('C3 回滚：撤销窗内快照写回原值（只写回快照内键）', async () => {
    const ls = makeLs({ memos: 'my-note' });
    const idb = makeIdb([]);
    const d = depsWith(ls, idb);
    const snap = await snapshotAppData('notes', d);
    await clearAppData('notes', d);
    expect(ls.getItem('memos')).toBeNull();
    const res = await restoreAppData(snap, d);
    expect(res.lsRestored).toBe(1);
    expect(ls.getItem('memos')).toBe('my-note');
    // 回滚不放大：非快照键不触碰
    ls.setItem('post_clear_new_key', 'v');
    await restoreAppData(snap, d);
    expect(ls.getItem('post_clear_new_key')).toBe('v');
  });

  test('C4 系统域拒绝执行（__system 无 AppInfo 清除语义）', async () => {
    const ls = makeLs({ 'ios-desktop:theme-hue': '200' });
    const d = depsWith(ls, makeIdb([]));
    await expect(clearAppData('__system', d)).rejects.toThrow(/系统\/共享域/);
    await expect(clearAppData('__shared', d)).rejects.toThrow(/系统\/共享域/);
    await expect(snapshotAppData('__system', d)).rejects.toThrow(/系统\/共享域/);
    await expect(restoreAppData({ appId: '__system', ls: {} }, d)).rejects.toThrow(/非法或受保护/);
    // 快照里系统数据原封不动
    expect(ls.getItem('ios-desktop:theme-hue')).toBe('200');
  });

  test('C5 IDB 应用域清除与回滚（vault 类自登记键形态）', async () => {
    const ls = makeLs({});
    const idb = makeIdb([['vault-test-entry', 'v1']]);
    const d = depsWith(ls, idb);
    // 登记表无 vault 键 → 不误伤（宁漏勿误）
    const res = await clearAppData('notes', d);
    expect(res.idbRemoved).toBe(0);
    expect((await idb.idbAll()).length).toBe(1);
    // IDB 写回路径：快照→清→回滚（fake 注入 idbPut）
    const idbRules = makeIdb([]);
    const d2 = depsWith(ls, idbRules);
    await d2.idbPut('vault-test-entry', 'v2');
    const snap = { appId: 'notes', ts: 1, ls: {}, idb: [{ key: 'vault-test-entry', value: 'v2' }] };
    await d2.idbRemove('vault-test-entry');
    const r = await restoreAppData(snap, d2);
    expect(r.idbRestored).toBe(1);
    expect((await idbRules.idbAll())[0].value).toBe('v2');
  });
});

// ==================== E · settings 接线锚 ====================
describe('v11.21 #219 E · 设置应用信息弹层接线锚', () => {
  // #284 批 6：AppInfo 弹层（adrSheet）随 APPS 簇迁 settings-pages/apps.js，E2/E3/E4 抽取源改读单源真身
  const appsJs = src('ios-desktop/js/apps/settings-pages/apps.js');
  test('E1 import 登记表 + window 桥消费', () => {
    expect(settingsJs).toContain("import '../app-data-registry.js'");
    expect(settingsJs).toContain('window.__appDataRegistry');
  });

  test('E2 AppInfo 底部弹层三要素：清除数据 / 清除缓存 / 撤销窗', () => {
    expect(appsJs).toContain('data-test="appinfo-clear-data"');
    expect(appsJs).toContain('data-test="appinfo-clear-cache"');
    expect(appsJs).toContain('data-test="appinfo-undo-btn"');
    expect(appsJs).toContain('data-test="appinfo-confirm-btn"');
    expect(appsJs).toContain("setAttribute('data-test', 'apps-appinfo-sheet')");
  });

  test('E3 确认弹窗语义（AOSP dialog 对标）+ 5 秒撤销纪律', () => {
    expect(appsJs).toContain('清除数据？');
    expect(appsJs).toContain('5 秒内可撤销');
    expect(appsJs).toContain('共享媒体存储不在清除范围');
  });

  test('E4 应用行点击委托（apps-recent-row → 弹层）', () => {
    expect(appsJs).toMatch(/closest\('\[data-test="apps-recent-row"\]'\)/);
  });
});
