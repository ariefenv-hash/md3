// ==================== v850-code-editor.test.js — v8.50 #32 代码编辑器（CodeMirror 6） ====================
//
// 验收映射（议题 #32 原文）：
//   · 多语言高亮 js/html/css/python（python 供 Python REPL 共用）→ detectLang 四模式 + 未知回落
//   · 文件树=files 应用存储层（VFS）→ dirName/baseName/joinPath/sortEntries/buildTree 纯函数锚
//   · 编辑/保存/切换文件零丢失 → isDirty（空白归一）+ normalizeState（损坏 JSON 安全）+ drafts 接线锚
//   · 大文件（1MB）不卡 → BIG_FILE_BYTES 阈值 + shouldDisableWrap（256KB 关自动换行）+ countLines O(n)
//   · 终端 `code <file>` 联动入口 → parseDeepLink + DEEP_LINK_EVENT + terminal case 'code' 锚
//   · bundle 增量受控 → vendor 离线内嵌单文件（零 CDN）+ import 锚
//
// 模式沿袭 v840~v849：经典脚本 IIFE 挂 window.__codeEditorCore，new Function 沙箱直驱；
// 顶层零副作用（不碰 document/localStorage），node 直接 import 安全。

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/code-editor-core.js'), 'utf8');
const PAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/code-editor/index.html'), 'utf8');
const APP_MJS_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/code-editor/app.mjs'), 'utf8');
const SHELL_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps/code-editor.js'), 'utf8');
const APPSDATA_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf8');
const ICONS_SRC = readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf8');
const TCORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf8');
const TERM_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/terminal/index.html'), 'utf8');

// ---------- 沙箱提取（经典脚本 IIFE → window.__codeEditorCore） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__codeEditorCore;

describe('v8.50 #32 core：常量与联动入口', () => {
  it('存储键与常量：STATE_KEY / DEEP_LINK_EVENT / 1MB 大文件阈值 / 256KB 关换行阈值', () => {
    expect(core.STATE_KEY).toBe('ios-desktop:code-editor-v1');
    expect(core.DEEP_LINK_EVENT).toBe('code-editor/open');
    expect(core.BIG_FILE_BYTES).toBe(1024 * 1024);
    expect(core.BIG_WARN_BYTES).toBe(256 * 1024);
    expect(core.TREE_MAX_ENTRIES).toBe(500);
  });

  it('LANGS 四模式注册：javascript/html/css/python（python 供 REPL 共用）', () => {
    expect(Object.keys(core.LANGS).sort()).toEqual(['css', 'html', 'javascript', 'python']);
    expect(core.LANGS.python.exts).toContain('py');
    expect(core.LANGS.javascript.exts).toEqual(expect.arrayContaining(['js', 'mjs']));
  });
});

describe('v8.50 #32 core：detectLang 扩展名→语言', () => {
  it('四模式正向识别（大小写不敏感·多扩展名）', () => {
    expect(core.detectLang('/documents/notes.js')).toBe('javascript');
    expect(core.detectLang('/documents/app.mjs')).toBe('javascript');
    expect(core.detectLang('/downloads/index.HTML')).toBe('html');
    expect(core.detectLang('/documents/htm')).toBeNull();
    expect(core.detectLang('/documents/style.css')).toBe('css');
    expect(core.detectLang('/documents/main.py')).toBe('python');
    expect(core.detectLang('/documents/tool.pyw')).toBe('python');
  });

  it('未知/无扩展名/目录形态 → null（纯文本无高亮）', () => {
    expect(core.detectLang('/documents/readme.md')).toBeNull();
    expect(core.detectLang('/documents/data.json')).toBeNull();
    expect(core.detectLang('/documents/noext')).toBeNull();
    expect(core.detectLang('/documents/.gitignore')).toBeNull();   // 点开头=隐藏文件非扩展名
    expect(core.detectLang('')).toBeNull();
    expect(core.detectLang(null)).toBeNull();
    expect(core.detectLang('/documents/')).toBeNull();
  });

  it('langLabel：四语言标签 + 未知回落纯文本', () => {
    expect(core.langLabel('javascript')).toBe('JavaScript');
    expect(core.langLabel('html')).toBe('HTML');
    expect(core.langLabel('css')).toBe('CSS');
    expect(core.langLabel('python')).toBe('Python');
    expect(core.langLabel('unknown')).toBe('纯文本');
    expect(core.langLabel(null)).toBe('纯文本');
  });
});

describe('v8.50 #32 core：路径工具（VFS 口径）', () => {
  it('normalizePath：补根斜杠/消 //·.·.. / 非法入参 null', () => {
    expect(core.normalizePath('documents/a.txt')).toBe('/documents/a.txt');
    expect(core.normalizePath('/documents//b.txt')).toBe('/documents/b.txt');
    expect(core.normalizePath('/documents/./c.txt')).toBe('/documents/c.txt');
    expect(core.normalizePath('/documents/x/../d.txt')).toBe('/documents/d.txt');
    expect(core.normalizePath('/')).toBe('/');
    expect(core.normalizePath('')).toBeNull();
    expect(core.normalizePath(null)).toBeNull();
    expect(core.normalizePath(123)).toBeNull();
  });

  it('dirName/baseName：根/一级/深层边界', () => {
    expect(core.dirName('/documents/a.txt')).toBe('/documents');
    expect(core.dirName('/a.txt')).toBe('/');
    expect(core.dirName('/')).toBe('/');
    expect(core.baseName('/documents/a.txt')).toBe('a.txt');
    expect(core.baseName('/')).toBe('');
  });

  it('joinPath：拼接 + 非法名拒绝（含 / 或空）', () => {
    expect(core.joinPath('/documents', 'a.js')).toBe('/documents/a.js');
    expect(core.joinPath('/', 'a.js')).toBe('/a.js');
    expect(core.joinPath('/documents/', 'a.js')).toBe('/documents/a.js');
    expect(core.joinPath('/documents', 'a/b.js')).toBeNull();
    expect(core.joinPath('/documents', '')).toBeNull();
    expect(core.joinPath('/documents', null)).toBeNull();
  });
});

describe('v8.50 #32 core：文件树构建与排序', () => {
  it('sortEntries：目录在前 + 中文字典序', () => {
    const sorted = core.sortEntries([
      { name: 'z.js', type: 'file', path: '/z.js' },
      { name: '文档', type: 'dir', path: '/文档' },
      { name: 'a.js', type: 'file', path: '/a.js' },
      { name: '下载', type: 'dir', path: '/下载' },
    ]);
    expect(sorted.map((m) => m.type)).toEqual(['dir', 'dir', 'file', 'file']);
    expect(sorted[0].name).toBe('文档');   // zh-Hans-CN 拼音序 w(én) < x(ià)
    expect(sorted[1].name).toBe('下载');
    expect(sorted[2].name).toBe('a.js');
  });

  it('sortEntries 不改原数组（纯函数纪律）', () => {
    const input = [{ name: 'b', type: 'file', path: '/b' }, { name: 'a', type: 'file', path: '/a' }];
    core.sortEntries(input);
    expect(input[0].name).toBe('b');
  });

  it('buildTree：目录/文件分桶 + 超上限截断（TREE_MAX_ENTRIES 防爆库）', () => {
    const entries = [];
    for (let i = 0; i < core.TREE_MAX_ENTRIES + 50; i++) entries.push({ name: 'f' + i, type: 'file', path: '/f' + i });
    const t = core.buildTree(entries);
    expect(t.files.length).toBe(core.TREE_MAX_ENTRIES);
    expect(Object.keys(t.dirs).length).toBe(0);
  });

  it('buildTree：null/畸形项安全', () => {
    const t = core.buildTree(null);
    expect(t.files).toEqual([]);
    expect(t.dirs).toEqual({});
    const t2 = core.buildTree([null, {}, { name: 'ok', type: 'file', path: '/ok' }]);
    expect(t2.files.length).toBe(1);
  });
});

describe('v8.50 #32 core：状态持久化与 dirty 判定（切换零丢失锚）', () => {
  it('normalizeState：默认值 + 越界钳制 + 损坏对象安全', () => {
    expect(core.normalizeState(null)).toEqual({ path: null, dirty: false, wrap: true, fontSize: 14 });
    expect(core.normalizeState({ path: '/a.js', dirty: 1, wrap: 0, fontSize: 99 })).toEqual({ path: '/a.js', dirty: true, wrap: false, fontSize: 14 });
    expect(core.normalizeState({ fontSize: 12 }).fontSize).toBe(12);
    expect(core.normalizeState('junk')).toEqual({ path: null, dirty: false, wrap: true, fontSize: 14 });
  });

  it('isDirty：空白差异不算改动；实质差异必报', () => {
    expect(core.isDirty('abc', 'abc')).toBe(false);
    expect(core.isDirty('abc', 'abc   ')).toBe(false);          // 行尾空白
    expect(core.isDirty('a\r\nb', 'a\nb')).toBe(false);          // CRLF 归一
    expect(core.isDirty('abc', 'abd')).toBe(true);
    expect(core.isDirty('', 'a')).toBe(true);
    expect(core.isDirty(null, '')).toBe(false);
    expect(core.isDirty(null, 'x')).toBe(true);
  });
});

describe('v8.50 #32 core：大文件口径与工具', () => {
  it('fmtBytes：B/KB/MB 三档', () => {
    expect(core.fmtBytes(512)).toBe('512 B');
    expect(core.fmtBytes(2048)).toBe('2.0 KB');
    expect(core.fmtBytes(3 * 1024 * 1024)).toBe('3.00 MB');
    expect(core.fmtBytes(NaN)).toBe('0 B');
  });

  it('isBigFile/shouldDisableWrap 阈值边界', () => {
    expect(core.isBigFile(core.BIG_FILE_BYTES)).toBe(false);
    expect(core.isBigFile(core.BIG_FILE_BYTES + 1)).toBe(true);
    expect(core.shouldDisableWrap(core.BIG_WARN_BYTES)).toBe(false);
    expect(core.shouldDisableWrap(core.BIG_WARN_BYTES + 1)).toBe(true);
  });

  it('countLines：空串 1 行 / 换行计数（1MB 性能口径 O(n) 单趟）', () => {
    expect(core.countLines('')).toBe(1);
    expect(core.countLines('a')).toBe(1);
    expect(core.countLines('a\nb\nc')).toBe(3);
    const big = new Array(50000).fill('line').join('\n');
    const t0 = Date.now();
    expect(core.countLines(big)).toBe(50000);
    expect(Date.now() - t0).toBeLessThan(200);
  });

  it('formatLineNo：补零对齐 + 上限 8 位防溢出', () => {
    expect(core.formatLineNo(7, 3)).toBe('  7');
    expect(core.formatLineNo(123, 3)).toBe('123');
    expect(core.formatLineNo(123456789, 3)).toBe('123456789');   // 超宽不截断
    expect(core.formatLineNo(1, 0)).toBe('1');
  });
});

describe('v8.50 #32 core：终端深链解析（`code <file>` 联动入口）', () => {
  it('parseDeepLink：合法载荷归一化 path + 语言预判', () => {
    expect(core.parseDeepLink({ path: '/documents/notes.js' })).toEqual({ path: '/documents/notes.js', lang: 'javascript' });
    expect(core.parseDeepLink({ path: 'documents/notes.js' })).toEqual({ path: '/documents/notes.js', lang: 'javascript' });
    expect(core.parseDeepLink({ path: '/x/main.py' }).lang).toBe('python');
    expect(core.parseDeepLink({ path: '/x/readme.md' }).lang).toBeNull();
  });

  it('parseDeepLink：缺 path/根路径/畸形载荷全拒', () => {
    expect(core.parseDeepLink(null)).toBeNull();
    expect(core.parseDeepLink({})).toBeNull();
    expect(core.parseDeepLink({ path: '' })).toBeNull();
    expect(core.parseDeepLink({ path: '/' })).toBeNull();
    expect(core.parseDeepLink('junk')).toBeNull();
  });
});

describe('v8.50 #32 页面接线锚（index.html + app.mjs）', () => {
  it('CM6 vendor 离线内嵌 bundle 存在且体积受控（<700KB minified）', () => {
    const bundlePath = join(ROOT, 'ios-desktop/apps/_shared/vendor/codemirror-bundle.mjs');
    expect(existsSync(bundlePath)).toBe(true);
    const size = statSync(bundlePath).size;
    expect(size).toBeGreaterThan(100 * 1024);   // 完整 bundle 非空壳
    expect(size).toBeLessThan(700 * 1024);      // 增量受控（四语言+search+autocomplete）
  });

  it('页面引用 vendor bundle + core 纯函数层（零 CDN）', () => {
    expect(APP_MJS_SRC).toContain("from '../_shared/vendor/codemirror-bundle.mjs'");
    expect(PAGE_SRC).toContain('js/code-editor-core.js');
    expect(APP_MJS_SRC).not.toMatch(/https?:\/\//);   // 运行时零外链
  });

  it('四语言工厂接线：javascript/html/css/python 全注册', () => {
    expect(APP_MJS_SRC).toContain('javascript: function () { return javascript(); }');
    expect(APP_MJS_SRC).toContain('html: function () { return html(); }');
    expect(APP_MJS_SRC).toContain('css: function () { return css(); }');
    expect(APP_MJS_SRC).toContain('python: function () { return python(); }');
  });

  it('FS 桥接线：FS_REQUEST / FS_RESULT / 3s 超时兜底', () => {
    expect(APP_MJS_SRC).toContain("type: 'FS_REQUEST'");
    expect(APP_MJS_SRC).toContain("d.type !== 'FS_RESULT'");
    expect(APP_MJS_SRC).toContain('3000');
    // VFS 桥参数口径：read/list 用 path 键（非 dir），size 取 meta.size
    expect(APP_MJS_SRC).toContain("fsCall('read', { path: path })");
    expect(APP_MJS_SRC).toContain("fsCall('list', { path: dirPath })");
    expect(APP_MJS_SRC).toContain('entry.meta && entry.meta.size');
  });

  it('深链接收：BUS_DELIVER + code-editor/open + parseDeepLink', () => {
    expect(APP_MJS_SRC).toContain("d.type !== 'BUS_DELIVER'");
    expect(APP_MJS_SRC).toContain('core.DEEP_LINK_EVENT');
    expect(APP_MJS_SRC).toContain('core.parseDeepLink');
  });

  it('草稿缓存切换零丢失锚：drafts 映射 + 切回恢复', () => {
    expect(APP_MJS_SRC).toContain('var drafts = {}');
    expect(APP_MJS_SRC).toContain('drafts[cur.path] = text');
    expect(APP_MJS_SRC).toContain('hasOwnProperty.call(drafts, path)');
    expect(APP_MJS_SRC).toContain('delete drafts[cur.path]');   // 保存即清草稿
  });

  it('Ctrl+S 保存：Mod-s Prec.highest + preventDefault', () => {
    expect(APP_MJS_SRC).toContain("key: 'Mod-s'");
    expect(APP_MJS_SRC).toContain('Prec.highest');
    expect(APP_MJS_SRC).toContain('preventDefault: true');
  });

  it('大文件防御：shouldDisableWrap 自动关换行 + isBigFile 提示', () => {
    expect(APP_MJS_SRC).toContain('core.shouldDisableWrap');
    expect(APP_MJS_SRC).toContain('core.isBigFile');
  });

  it('零 innerHTML 纪律（树渲染 createElement+textContent）', () => {
    expect(APP_MJS_SRC).not.toContain('innerHTML');
    expect(APP_MJS_SRC).toContain("createElement('div')");
    expect(APP_MJS_SRC).toContain('textContent');
  });

  it('md3 主题接线：dark 声明 + HighlightStyle 语法高亮 + 等宽收尾字体链', () => {
    expect(APP_MJS_SRC).toContain('{ dark: true }');
    expect(APP_MJS_SRC).toContain('HighlightStyle.define');
    // v8.49 教训：等宽字体链必须 monospace 收尾
    expect(PAGE_SRC).toMatch(/--ce-mono: 'Roboto Mono'[^;]*monospace;/);
  });

  it('启停健壮：core 缺载守卫 + placeholder 空态', () => {
    expect(APP_MJS_SRC).toContain('if (!core) return;');
    expect(APP_MJS_SRC).toContain('placeholder(');
  });
});

describe('v8.50 #32 注册表锚（壳层/图标/应用表/终端联动）', () => {
  it('壳层 iframe 应用注册：id=code-editor + iframeAppContent', () => {
    expect(SHELL_SRC).toContain("id: 'code-editor'");
    expect(SHELL_SRC).toContain("iframeAppContent('apps/code-editor/index.html')");
  });

  it('apps-data 聚合注册：import + 第 2 页数组', () => {
    expect(APPSDATA_SRC).toContain("from './apps/code-editor.js'");
    expect(APPSDATA_SRC).toMatch(/ping, codeEditor, midiPlayer, ocr,\n\];/);
  });

  it('图标注册：APP_ICONS["code-editor"] 矢量方圆基底', () => {
    expect(ICONS_SRC).toContain("'code-editor': `<svg");
  });

  it('终端 APPS 表：code-editor 应用 + 别名（code/编辑器/editor）', () => {
    expect(TCORE_SRC).toContain("['code-editor', '代码编辑器', 'code', '编辑器', 'editor']");
  });

  it('终端 COMMANDS 表 + case 路由：code <path> 深链转发', () => {
    expect(TCORE_SRC).toMatch(/code:\s*\{ group: '应用',\s*desc: '用代码编辑器打开 VFS 文件（#32 联动）' \}/);
    expect(TERM_SRC).toContain("case 'code':");
    expect(TERM_SRC).toContain("event: 'code-editor/open'");
    expect(TERM_SRC).toContain("openApp('code-editor'");
    // 相对路径按 cwd 解析（终端 normalizePath 二参惯例）
    expect(TERM_SRC).toContain('core.normalizePath(fpath, cwd)');
  });
});
