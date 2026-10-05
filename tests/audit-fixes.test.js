// ==================== tests/audit-fixes.test.js — v7.40 审计修复回归 ====================
//
// 覆盖本轮审计修复中最容易回退的数据层行为（vfs 与落盘的一致性契约）：
//   · write：文本 size 按字节而非字符数（CJK 低估修复）
//   · write：meta 落盘失败 → 整体失败，内存索引不得吸收该条目（内存/磁盘脱钩修复）
//   · del：内容落盘删除失败 → 对应条目保留（重载后文件诈尸修复）
//   · del：正常路径 removed 计数正确
//
// storage.js（IndexedDB 封装）以内存 Map 桩替：单测聚焦 vfs 自身的校验逻辑，
// 不依赖 happy-dom 是否提供 IDB 实现。

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 内存版 storage 桩：键值直存；可通过 failSet / failDel 注入指定键失败
const mem = new Map();
const failSetKeys = new Set();
const failDelKeys = new Set();

vi.mock('../ios-desktop/js/storage.js', () => ({
  idbAvailable: () => true,
  idbSet: vi.fn(async (key, value) => {
    if (failSetKeys.has(key)) return false;
    mem.set(key, value);
    return true;
  }),
  idbGet: vi.fn(async (key) => (mem.has(key) ? mem.get(key) : null)),
  idbDel: vi.fn(async (key) => {
    if (failDelKeys.has(key)) return false;
    mem.delete(key);
    return true;
  }),
  idbGetAllEntries: vi.fn(async () => Array.from(mem.entries()).map(([key, value]) => ({ key, value }))),
  idbBulkPut: vi.fn(async () => true),
  idbClearStore: vi.fn(async () => true),
}));

import { initVfs } from '../ios-desktop/js/vfs.js';

const vfs = initVfs();

beforeEach(() => {
  mem.clear();
  failSetKeys.clear();
  failDelKeys.clear();
});

describe('vfs write — size 语义（字节而非字符）', () => {
  it('纯 ASCII：字符数与字节数一致', async () => {
    const r = await vfs.write('/a.txt', 'hello');
    expect(r.ok).toBe(true);
    expect(r.entry.size).toBe(5);
  });

  it('CJK 文本：按 UTF-8 字节统计（旧实现按字符数会低估 2/3）', async () => {
    const r = await vfs.write('/中文.txt', '中文内容'); // 4 个汉字 = 12 字节
    expect(r.ok).toBe(true);
    expect(r.entry.size).toBe(12);
  });

  it('混合中英文本按字节数统计', async () => {
    const r = await vfs.write('/mix.md', '# 标题 abc'); // '#'1 + ' '1 + 标题6 + ' '1 + abc3 = 12
    expect(r.ok).toBe(true);
    expect(r.entry.size).toBe(12);
  });
});

describe('vfs write — 落盘失败不得污染内存索引', () => {
  it('meta 写入失败 → write 整体失败且 stat 查不到该条目', async () => {
    failSetKeys.add('vfs-meta:/doomed.txt'); // K_META + path，内容键正常
    const r = await vfs.write('/doomed.txt', 'data');
    expect(r.ok).toBe(false);
    expect(vfs.stat('/doomed.txt')).toBeNull();
  });
});

describe('vfs del — 落盘失败保留条目（不诈尸/不脱钩）', () => {
  it('正常删除：removed 计数正确且条目消失', async () => {
    await vfs.write('/ok.txt', 'x');
    const r = await vfs.del('/ok.txt');
    expect(r.ok).toBe(true);
    expect(r.removed).toBe(1);
    expect(vfs.stat('/ok.txt')).toBeNull();
  });

  it('meta 删除失败 → 条目保留在索引中', async () => {
    await vfs.write('/keep.txt', 'x');
    failDelKeys.add('vfs-meta:/keep.txt');
    const r = await vfs.del('/keep.txt');
    expect(r.ok).toBe(true);
    expect(r.removed).toBe(0);
    expect(vfs.stat('/keep.txt')).not.toBeNull();
  });

  it('文件内容删除失败 → 该文件条目保留（避免重载后诈尸）', async () => {
    await vfs.write('/stick.txt', 'x');
    failDelKeys.add('vfs:/stick.txt');
    const r = await vfs.del('/stick.txt');
    expect(r.removed).toBe(0);
    expect(vfs.stat('/stick.txt')).not.toBeNull();
  });

  it('目录递归删除：仅失败叶子保留，其余正常移除', async () => {
    await vfs.mkdir('/proj');
    await vfs.write('/proj/a.txt', 'a');
    await vfs.write('/proj/b.txt', 'b');
    failDelKeys.add('vfs-meta:/proj/b.txt');
    const r = await vfs.del('/proj');
    expect(r.removed).toBe(2); // '/proj' 目录 meta + a.txt 成功移除；b.txt 保留
    expect(vfs.stat('/proj/a.txt')).toBeNull();
    expect(vfs.stat('/proj/b.txt')).not.toBeNull();
  });
});

describe('vfs del — 根目录保护（既有语义回归）', () => {
  it('根目录不可删除', async () => {
    const r = await vfs.del('/');
    expect(r.ok).toBe(false);
  });
});
