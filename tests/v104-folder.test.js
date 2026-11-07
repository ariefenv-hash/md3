// ==================== v104-folder.test.js — #104 文件夹完整行为（Launcher3 folder/ 对标） ====================
//
// 覆盖 v10.41 #104 三缺口：
//   ① 内联命名 commitFolderRename（FolderNameEditText 对标：trim / 非空守卫 / 空名不落盘 / 同名免写）
//   ② 自动排列 sortFolderAppsByName + compareAppName（FolderGridOrganizer 对标：zh-Hans-CN 拼音序
//      + id tiebreak + slot 重排 + 持久化；已排序/单元素不空转落盘）
//   ③ 「+」添加区 folderAddCandidates + addAppToFolder（候选排除文件夹成员与文件夹本体；
//      收编 = 从所在页剔除 + 尾插 slot 重排 + 持久化；重复加入拒绝）
//   ④ 源码锚：index.html 面板结构 / desktop.css 三组新类 / folder.js prompt 退役
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  isFolder,
  commitFolderRename,
  compareAppName,
  sortFolderAppsByName,
  folderAddCandidates,
  addAppToFolder,
} from '../ios-desktop/js/folder.js';
import { state } from '../ios-desktop/js/state.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const KEY = 'ios-desktop:pages-apps';

/** 测试夹具：页 0 = [文件夹(伽马,阿尔法), 天气, 音乐]，页 1 = [记事本] */
function seed() {
  state.pagesApps = [
    [
      {
        id: 'folder_t1', type: 'folder', name: '整理', slot: 0,
        apps: [
          { id: 'clock', name: '伽马', slot: 0 },
          { id: 'calculator', name: '阿尔法', slot: 1 },
        ],
      },
      { id: 'weather', name: '天气', slot: 1 },
      { id: 'music', name: '音乐', slot: 2 },
    ],
    [{ id: 'notes', name: '记事本', slot: 0 }],
  ];
  localStorage.removeItem(KEY);
}

const folderOf = () => state.pagesApps[0].find((a) => isFolder(a));

beforeEach(() => seed());

describe('#104① 内联命名 commitFolderRename（FolderNameEditText 对标）', () => {
  it('合法新名：写入 folder.name + 持久化（trim 生效）', () => {
    const folder = folderOf();
    const r = commitFolderRename(folder, '  工作集  ');
    expect(r.ok).toBe(true);
    expect(r.changed).toBe(true);
    expect(folder.name).toBe('工作集');
    expect(JSON.parse(localStorage.getItem(KEY))[0][0].name).toBe('工作集');
  });

  it('空名/纯空白：拒绝提交且不落盘（Launcher3 空输入恢复原名同律）', () => {
    const folder = folderOf();
    for (const bad of ['', '   ', null, undefined]) {
      const r = commitFolderRename(folder, bad);
      expect(r.ok).toBe(false);
      expect(r.reason).toBe('empty');
    }
    expect(folder.name).toBe('整理');
    expect(localStorage.getItem(KEY)).toBe(null);
  });

  it('同名提交：ok 但 changed=false 不重复落盘', () => {
    const folder = folderOf();
    const r = commitFolderRename(folder, '整理');
    expect(r.ok).toBe(true);
    expect(r.changed).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(null);
  });

  it('无 folder 入参：拒绝（防御性出口）', () => {
    expect(commitFolderRename(null, 'x').ok).toBe(false);
  });
});

describe('#104② 自动排列 sortFolderAppsByName（FolderGridOrganizer 对标）', () => {
  it('compareAppName：zh-Hans-CN 拼音序（阿尔法 a < 伽马 g < 音乐 y）', () => {
    const [a, g, y] = [{ id: '1', name: '阿尔法' }, { id: '2', name: '伽马' }, { id: '3', name: '音乐' }];
    expect(compareAppName(a, g)).toBeLessThan(0);
    expect(compareAppName(g, y)).toBeLessThan(0);
    expect(compareAppName(y, a)).toBeGreaterThan(0);
  });

  it('compareAppName：同名以 id 稳定 tiebreak（确定性次序）', () => {
    const x = { id: 'b2', name: '同' };
    const y = { id: 'a1', name: '同' };
    expect(compareAppName(x, y)).toBeGreaterThan(0);
    expect(compareAppName(y, x)).toBeLessThan(0);
    expect(compareAppName(x, { id: 'b2', name: '同' })).toBe(0);
  });

  it('按名称排序：重排 + slot 重编 + 持久化', () => {
    const folder = folderOf();
    expect(sortFolderAppsByName(folder)).toBe(true);
    expect(folder.apps.map((a) => a.name)).toEqual(['阿尔法', '伽马']);
    expect(folder.apps.map((a) => a.slot)).toEqual([0, 1]);
    const saved = JSON.parse(localStorage.getItem(KEY));
    expect(saved[0][0].apps.map((a) => a.name)).toEqual(['阿尔法', '伽马']);
  });

  it('已排序 / 单元素 / 无 folder：返回 false 且不落盘（不空转写档）', () => {
    const folder = folderOf();
    sortFolderAppsByName(folder);
    localStorage.removeItem(KEY);
    expect(sortFolderAppsByName(folder)).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(null);
    expect(sortFolderAppsByName({ apps: [{ id: 'x', name: '独', slot: 0 }] })).toBe(false);
    expect(sortFolderAppsByName(null)).toBe(false);
  });
});

describe('#104③ 「+」添加区（候选清单 + 收编）', () => {
  it('folderAddCandidates：桌面已放置条目全收录，排除文件夹成员与文件夹本体', () => {
    const cands = folderAddCandidates(folderOf());
    const ids = cands.map((c) => c.app.id);
    expect(ids).toContain('weather');
    expect(ids).toContain('music');
    expect(ids).toContain('notes');
    expect(ids).not.toContain('clock');
    expect(ids).not.toContain('calculator');
    expect(ids).not.toContain('folder_t1');
  });

  it('folderAddCandidates：携带所属页下标（跨页候选可收编）', () => {
    const cands = folderAddCandidates(folderOf());
    const notes = cands.find((c) => c.app.id === 'notes');
    expect(notes.pageIdx).toBe(1);
  });

  it('addAppToFolder：从所在页剔除 + 尾插 + slot 重编 + 持久化', () => {
    const folder = folderOf();
    const weather = state.pagesApps[0].find((a) => a.id === 'weather');
    expect(addAppToFolder(folder, weather, 0)).toBe(true);
    expect(state.pagesApps[0].some((a) => a.id === 'weather')).toBe(false);
    expect(folder.apps.map((a) => a.id)).toEqual(['clock', 'calculator', 'weather']);
    expect(weather.slot).toBe(2);
    const saved = JSON.parse(localStorage.getItem(KEY));
    expect(saved[0][0].apps.length).toBe(3);
  });

  it('addAppToFolder：跨页收编（页 1 记事本 → 文件夹）', () => {
    const folder = folderOf();
    const notes = state.pagesApps[1][0];
    expect(addAppToFolder(folder, notes, 1)).toBe(true);
    expect(state.pagesApps[1].length).toBe(0);
    expect(folder.apps.some((a) => a.id === 'notes')).toBe(true);
  });

  it('addAppToFolder：重复加入拒绝 + 非法入参拒绝', () => {
    const folder = folderOf();
    const weather = state.pagesApps[0].find((a) => a.id === 'weather');
    expect(addAppToFolder(folder, weather, 0)).toBe(true);
    const dup = { id: 'weather', name: '天气' };
    expect(addAppToFolder(folder, dup, 0)).toBe(false);
    expect(folder.apps.filter((a) => a.id === 'weather').length).toBe(1);
    expect(addAppToFolder(folder, null, 0)).toBe(false);
    expect(addAppToFolder(null, weather, 0)).toBe(false);
  });
});

describe('#104 源码锚（结构与退役回归）', () => {
  const html = readFileSync(join(ROOT, 'ios-desktop/index.html'), 'utf8');
  const css = readFileSync(join(ROOT, 'ios-desktop/css/desktop.css'), 'utf8');
  const js = readFileSync(join(ROOT, 'ios-desktop/js/folder.js'), 'utf8');

  it('index.html：标题行 + 排序按钮 + 添加面板结构齐备（aria 标注在案）', () => {
    expect(html).toContain('folder-title-row');
    expect(html).toContain('id="folderSortBtn"');
    expect(html).toContain('aria-label="按名称自动排列"');
    expect(html).toContain('id="folderAddSheet"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="添加应用到文件夹"');
    expect(html).toContain('id="folderAddClose"');
  });

  it('desktop.css：内联输入 / 排序按钮 / 添加面 / 清单二级面样式齐备', () => {
    for (const cls of ['.folder-title-input', '.folder-sort-btn', '.folder-add-tile', '.folder-add-sheet', '.folder-add-item', '.folder-add-empty']) {
      expect(css).toContain(cls);
    }
    expect(css).toMatch(/\.folder-add-sheet\[hidden\]/);
  });

  it('folder.js：prompt 对话框退役 + 新模块面在库', () => {
    expect(js).not.toMatch(/\bprompt\s*\(/);
    expect(js).toContain('folder-add-tile');
    expect(js).toContain('commitFolderRename');
    expect(js).toContain('sortFolderAppsByName');
    expect(js).toContain('folderAddCandidates');
    expect(js).toContain('addAppToFolder');
    expect(js).toContain('closeFolderAddSheet');
  });

  it('dom.js：四个新注册引用在案（#104 注册表纪律）', () => {
    const domjs = readFileSync(join(ROOT, 'ios-desktop/js/dom.js'), 'utf8');
    for (const id of ['folderSortBtn', 'folderAddSheet', 'folderAddGrid', 'folderAddClose']) {
      expect(domjs).toContain(id);
    }
  });
});
