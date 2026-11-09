// ==================== destructive-guard.test.js — #238 破坏性操作保护一致性（photos/notes/reminders 三站） ====================
// 审计基线（docs/audits/2026-11-07-多维度评审报告.md）：全库破坏性操作三档并存（确认框/纯 toast/零反馈），
// 最重档落在 photos VFS 永久删（单击即删无 confirm 无撤销）。本文件锚定三站接入后的契约：
//   · photos deleteMedia（不可恢复类）：confirm 前置 + 取消返回 false 保持查看器 + clearAll confirm 回归锚；
//   · notes remove（可恢复类）：5s 软删除窗口（窗口期内不落盘）+ 撤销恢复原位 + 顶替场景防互吞落盘；
//   · reminders deleteTask（同应用双档矛盾）：对齐软删除 + 5s 撤销，deleteGroup confirm 保留为回归锚。
// 评分卡联动（#230 E 项「破坏性操作必有撤销或确认」断言）留待后续批次，交付帖在录。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

const photos = read('ios-desktop/apps/photos/index.html');
const notes = read('ios-desktop/apps/notes/index.html');
const reminders = read('ios-desktop/apps/reminders/index.html');

describe('v10.42 #238 · A. photos（VFS 不可恢复类 → confirm 前置）', () => {
  it('A1 deleteMedia confirm 前置于 fsDel（顺序锚：确认通过才触达 VFS）', () => {
    const fn = photos.match(/function deleteMedia\(i\) \{[\s\S]*?\n        \}/)[0];
    expect(fn).toContain("confirm('确定永久删除「' + item.name + '」吗？此操作不可撤销。')");
    expect(fn.indexOf('!confirm(')).toBeGreaterThan(-1);
    expect(fn.indexOf('fsDel(')).toBeGreaterThan(fn.indexOf('!confirm('));
  });

  it('A2 取消删除返回 false，查看器调用方按返回值决定是否 closeLightbox', () => {
    const fn = photos.match(/function deleteMedia\(i\) \{[\s\S]*?\n        \}/)[0];
    expect(fn).toContain('return false;');
    expect(fn).toContain('return true;');
    expect(photos).toContain("if (deleteMedia(i)) closeLightbox();");
    expect(photos).not.toContain('{ deleteMedia(i); closeLightbox(); }');
  });

  it('A3 clearAll 既有 confirm 回归锚（对照组实践不得回退）', () => {
    expect(photos).toContain("confirm('确定清空所有内容吗？')");
  });
});

describe('v10.42 #238 · B. notes（可恢复类 → 5s 软删除窗口 + 撤销）', () => {
  it('B1 toastUndo 撤销窗在册：5000ms 窗口 + 撤销按钮', () => {
    expect(notes).toContain('const toastUndo = (msg, onUndo) =>');
    expect(notes).toContain('}, 5000), flush: () => save() }');
    expect(notes).toContain("btn.textContent = '撤销'");
  });

  it('B2 软删除窗口期内不落盘（延迟 save 契约）', () => {
    const seg = notes.match(/window\.remove = id => \{[\s\S]*?\n  \};/)[0];
    expect(seg).toContain('memos.filter(x=>x.id!==id); render();');
    expect(seg).not.toMatch(/memos\.filter\(x=>x\.id!==id\); save\(\);/); // 窗口内 save 回归即红
    expect(seg).toContain('toastUndo(');
  });

  it('B3 撤销恢复原位 + 顶替场景防互吞（cancelUndo flush 落盘）', () => {
    expect(notes).toContain('const cancelUndo = flushOld =>');
    expect(notes).toContain("pendingUndo.flush(); // 顶替场景先落盘上一笔，防窗口互吞");
    const seg = notes.match(/window\.remove = id => \{[\s\S]*?\n  \};/)[0];
    expect(seg).toContain('memos.splice(Math.min(idx, memos.length), 0, m)');
  });
});

describe('v10.42 #238 · C. reminders（同应用双档矛盾消除）', () => {
  it('C1 deleteTask 对齐软删除：undoToast + 5000ms + 窗口期内不落盘', () => {
    const seg = reminders.match(/function deleteTask\(id\) \{[\s\S]*?\n    \}/)[0];
    expect(seg).toContain('undoToast(');
    expect(seg).toContain('state.tasks.filter(x=>x.id!==id); renderTasks();');
    expect(seg).not.toMatch(/state\.tasks\.filter\(x=>x\.id!==id\); save\(\);/); // 裸删回归即红
    expect(seg).toContain('state.tasks.splice(Math.min(idx, state.tasks.length), 0, t)');
  });

  it('C2 undoToast 助手：撤销与期满双通道落盘语义', () => {
    expect(reminders).toContain('function undoToast(msg, onUndo, onExpire)');
    expect(reminders).toContain('if (onExpire) onExpire(); }, 5000)');
    expect(reminders).toContain("b.innerText = '撤销'");
  });

  it('C3 deleteGroup 既有 confirm 回归锚（双档矛盾以「任务对齐」消除而非「分组降档」）', () => {
    expect(reminders).toContain("confirm('确定删除此分组吗？该分组下的任务也将被删除。')");
  });
});
