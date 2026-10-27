// ==================== v8.40 #25 终端（msh）测试套件 ====================
//
// 三层结构（v838/v839 同款）：
//  1. core 沙箱直驱 —— new Function 提取 window.__terminalCore（IIFE 经典脚本，
//     ESM export 在经典 <script> 下整文件 SyntaxError 教训沿用）
//  2. 源码纪律锚 —— 无 eval/new Function/innerHTML（调用级正则，防注释误伤）
//  3. 注册链四件套 —— apps-data/app-icons/icons/storage-stats + open 映射对拍
//     （议题验收：30+ 命令带单测锚；open 可启动全部 35 内置应用；无状态残留）
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf8');
const PAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/terminal/index.html'), 'utf8');

// ---------- core 沙箱提取（IIFE 挂 window.__terminalCore） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__terminalCore;

describe('v8.40 #25 core：命令注册表（32 白名单 · 全带单测锚）', () => {
  it('注册表恰为 32 命令，每条有 group+desc（help 文案唯一来源）', () => {
    const names = Object.keys(core.COMMANDS);
    expect(names.length).toBe(32);
    names.forEach((k) => {
      expect(core.COMMANDS[k].group.length, `${k} 缺 group`).toBeGreaterThan(0);
      expect(core.COMMANDS[k].desc.length, `${k} 缺 desc`).toBeGreaterThan(0);
    });
  });
  it('32 命令名逐一锚定（议题列名 + 扩充全在册）', () => {
    const must = ['help', 'ls', 'cd', 'cat', 'echo', 'clear', 'date', 'whoami',
      'neofetch', 'open', 'print', 'ps', 'pwd', 'mkdir', 'touch', 'rm', 'tree',
      'stat', 'du', 'df', 'wc', 'head', 'tail', 'history', 'env', 'uptime',
      'uname', 'notify', 'exit', 'apps', 'beat', 'code'];
    must.forEach((k) => expect(core.COMMANDS[k], `${k} 不在注册表`).toBeTruthy());
    expect(must.length).toBe(32);
  });
  it('分组：文件系统 11 + 文本 4 + 系统 12 + 应用 5（v8.50 #32 code 入列）', () => {
    const byGroup = {};
    Object.values(core.COMMANDS).forEach((c) => { byGroup[c.group] = (byGroup[c.group] || 0) + 1; });
    expect(byGroup['文件系统']).toBe(11);
    expect(byGroup['文本']).toBe(4);
    expect(byGroup['系统']).toBe(12);
    expect(byGroup['应用']).toBe(5);
  });
});

describe('v8.40 #25 core：tokenize 与重定向解析', () => {
  it('空白分词 + 单双引号保护 + 多空白折叠', () => {
    expect(core.tokenize('echo "a b"  c')).toEqual(['echo', 'a b', 'c']);
    expect(core.tokenize("echo 'x  y'")).toEqual(['echo', 'x  y']);
    expect(core.tokenize('  a \t b \n c ')).toEqual(['a', 'b', 'c']);
    expect(core.tokenize('')).toEqual([]);
    expect(core.tokenize(null)).toEqual([]);
  });
  it('未闭合引号宽松容错（不抛错，引号段整体成 token）', () => {
    expect(core.tokenize('echo "ab')).toEqual(['echo', 'ab']);
    expect(core.tokenize("echo 'a")).toEqual(['echo', 'a']);
  });
  it('重定向：首个独立 > 拆分；>path 与末尾 > 不视为重定向', () => {
    expect(core.parseRedirect(['echo', 'hi', '>', '/a.txt'])).toEqual({ argv: ['echo', 'hi'], redirect: '/a.txt' });
    expect(core.parseRedirect(['echo', '>path'])).toEqual({ argv: ['echo', '>path'], redirect: null });
    expect(core.parseRedirect(['echo', 'x', '>'])).toEqual({ argv: ['echo', 'x', '>'], redirect: null });
    expect(core.parseRedirect(['ls', '-l'])).toEqual({ argv: ['ls', '-l'], redirect: null });
  });
});

describe('v8.40 #25 core：路径归一（与 VFS 同语义）', () => {
  it('绝对路径：. 消除 / .. 上行 / 多斜杠折叠 / 尾斜杠去除', () => {
    expect(core.normalizePath('/a/./b', '/')).toBe('/a/b');
    expect(core.normalizePath('/a/../b', '/')).toBe('/b');
    expect(core.normalizePath('//a///b//', '/')).toBe('/a/b');
    expect(core.normalizePath('/../../..', '/')).toBe('/');
  });
  it('相对路径基于 cwd；~ → HOME(/)；越过根止于 /', () => {
    expect(core.normalizePath('b/../c', '/documents')).toBe('/documents/c');
    expect(core.normalizePath('../x', '/documents')).toBe('/x');
    expect(core.normalizePath('../../x', '/documents')).toBe('/x');
    expect(core.normalizePath('~', '/documents')).toBe('/');
    expect(core.normalizePath('~/notes/a.txt', '/')).toBe('/notes/a.txt');
    expect(core.normalizePath('', '/documents')).toBe('/documents');
    expect(core.normalizePath(null, '/documents')).toBe('/documents');
  });
  it('cdTarget：无参回 HOME(/)；cwd 非法回落 /（防御位）', () => {
    expect(core.cdTarget(undefined, '/documents')).toBe('/');
    expect(core.cdTarget('  ', '/documents')).toBe('/');
    expect(core.cdTarget('..', '/documents')).toBe('/');
    expect(core.cdTarget('sub', '/documents')).toBe('/documents/sub');
  });
});

describe('v8.40 #25 core：open 深链映射（35 应用全覆盖验收锚）', () => {
  it('APPS 恰 41 项；APP_NAMES id→中文名全覆盖且非空（v8.51 #56 midi-player 入列）', () => {
    expect(core.APPS.length).toBe(41);
    core.APPS.forEach((row) => {
      expect(row[0].length).toBeGreaterThan(0);
      expect(core.APP_NAMES[row[0]], `${row[0]} 缺中文名`).toBeTruthy();
    });
  });
  it('映射对拍：apps/*.js 全部 41 个 id 都可被 open 启动（v8.51 #56 midi-player 入列）', () => {
    const dir = join(ROOT, 'ios-desktop/js/apps');
    const files = readdirSync(dir).filter((f) => f.endsWith('.js') && !f.startsWith('settings-'));
    const ids = [];
    for (const f of files) {
      const src = readFileSync(join(dir, f), 'utf8');
      const m = src.match(/^  id: '([^']+)'/m);
      if (m) ids.push(m[1]);
    }
    expect(ids.length).toBe(41);
    ids.forEach((id) => {
      expect(core.APP_NAMES[id], `open 无法启动 ${id}`).toBeTruthy();
      expect(core.resolveTarget(id), `resolveTarget(${id}) 失败`).toEqual({ id, name: core.APP_NAMES[id] });
    });
  });
  it('中英文别名：设置/safari/终端/word 大小写不敏感；未知返回 null', () => {
    expect(core.resolveTarget('设置')).toEqual({ id: 'settings', name: '设置' });
    expect(core.resolveTarget('SAFARI')).toEqual({ id: 'safari', name: '浏览器' });
    expect(core.resolveTarget('终端')).toEqual({ id: 'terminal', name: '终端' });
    expect(core.resolveTarget('Word')).toEqual({ id: 'word', name: '每日单词' });
    expect(core.resolveTarget('2048')).toEqual({ id: 'game2048', name: '2048 接龙' });
    expect(core.resolveTarget('nope')).toBeNull();
    expect(core.resolveTarget('')).toBeNull();
    expect(core.resolveTarget(null)).toBeNull();
    expect(core.resolveTarget(42)).toBeNull();
  });
});

describe('v8.40 #25 core：ls/tree/stat/df 格式化', () => {
  it('formatLs：目录后缀 /，空表空输出', () => {
    const es = [{ name: 'a', type: 'dir' }, { name: 'b.txt', type: 'file' }];
    expect(core.formatLs(es)).toEqual(['a/', 'b.txt']);
    expect(core.formatLs([])).toEqual([]);
    expect(core.formatLs(null)).toEqual([]);
  });
  it('formatLong：类型位 d/- + 大小人类可读 + 时间对齐', () => {
    const es = [{ name: 'd1', type: 'dir', modified: 0 },
      { name: 'f.txt', type: 'file', size: 2048, modified: new Date(2026, 8, 26, 10, 30).getTime() }];
    const lines = core.formatLong(es);
    expect(lines[0]).toMatch(/^d {2,}— {2,}\d{4}-\d{2}-\d{2} \d{2}:\d{2} {2}d1\/$/);
    expect(lines[1]).toMatch(/^- {2,}\s*2\.0 KB\s+2026-09-26 10:30\s+f\.txt$/);
  });
  it('fmtSize 边界：B/KB/MB/GB 逐点', () => {
    expect(core.fmtSize(0)).toBe('0 B');
    expect(core.fmtSize(1023)).toBe('1023 B');
    expect(core.fmtSize(1024)).toBe('1.0 KB');
    expect(core.fmtSize(1024 * 1024)).toBe('1.0 MB');
    expect(core.fmtSize(1.5 * 1024 * 1024 * 1024)).toBe('1.50 GB');
    expect(core.fmtSize(-1)).toBe('—');
  });
  it('formatTree：isLast 位图决定 ├─/└─ 前缀，root 无前缀', () => {
    const nodes = [
      { depth: 0, name: '/', isDir: true, root: true },
      { depth: 1, name: 'a', isDir: true, isLast: false, ancestors: {} },
      { depth: 2, name: 'x', isDir: false, isLast: true, ancestors: { 1: false } },
      { depth: 1, name: 'b', isDir: true, isLast: true, ancestors: {} },
    ];
    const lines = core.formatTree(nodes);
    expect(lines[0]).toBe('/');
    expect(lines[1]).toBe('├─ a/');
    expect(lines[2]).toBe('│  └─ x');
    expect(lines[3]).toBe('└─ b/');
  });
  it('formatStat/formatDf：元信息行与合计', () => {
    const st = core.formatStat({ path: '/a.txt', type: 'file', mime: 'text/plain', size: 12, modified: 0, owner: 'terminal' });
    expect(st.join('\n')).toContain('/a.txt').and.toContain('text/plain').and.toContain('terminal');
    expect(core.formatStat(null)[0]).toContain('无此路径');
    const df = core.formatDf([{ type: '/photos', size: 100 }, { type: '/notes', size: 28 }]);
    expect(df).toHaveLength(3);
    expect(df[2]).toContain('合计');
    expect(df[0]).toContain('/photos');
  });
});

describe('v8.40 #25 core：文本工具 wc/head/tail/splitLines', () => {
  it('splitLines：\r\n/\r 归一；空串零行', () => {
    expect(core.splitLines('a\r\nb\rc')).toEqual(['a', 'b', 'c']);
    expect(core.splitLines('')).toEqual([]);
    expect(core.splitLines('one')).toEqual(['one']);
    expect(core.splitLines('a\n')).toEqual(['a', '']);
  });
  it('head/tail：默认 10 行；负 n 与非法 n 回落 10；超额安全', () => {
    const t = '1\n2\n3\n4\n5';
    expect(core.headLines(t, 2)).toBe('1\n2');
    expect(core.tailLines(t, 2)).toBe('4\n5');
    expect(core.headLines(t)).toBe(t);
    expect(core.headLines(t, -5)).toBe(t);
    expect(core.headLines(t, 'x')).toBe(t);
    expect(core.tailLines(t, 99)).toBe(t);
  });
  it('wcCount：行/词/字节（CJK 多字节粗计）', () => {
    expect(core.wcCount('a b\nc')).toEqual({ lines: 2, words: 3, bytes: 5 });
    expect(core.wcCount('中文')).toEqual({ lines: 1, words: 1, bytes: 6 });
    expect(core.wcCount('')).toEqual({ lines: 0, words: 0, bytes: 0 });
    expect(core.formatWc({ lines: 2, words: 3, bytes: 5 })).toMatch(/^ *2 +3 +5 +$/); // 尾随 pad 属列对齐语义
  });
});

describe('v8.40 #25 core：系统面 neofetch/ps/env/history/apps + esc', () => {
  it('renderNeofetch：徽标行 + OS/Shell/Apps/FS Engine 信息行齐备', () => {
    const rows = core.renderNeofetch({ apps: 35, engine: 'vfs', storage: '1.0 KB（2 文件）', uptime: '3 分 2 秒' });
    const joined = rows.join('\n');
    expect(joined).toContain('arief@md3');
    expect(joined).toContain('md3 web');
    expect(joined).toContain('msh 1.0');
    expect(joined).toContain('35 installed');
    expect(joined).toContain('vfs');
  });
  it('formatPs/formatEnv/formatHistory：对齐与原文', () => {
    const ps = core.formatPs([{ pid: 1, name: 'init', note: '桌面启动链' }, { pid: 4, name: 'msh', note: '本会话' }]);
    expect(ps[0]).toContain('PID');
    expect(ps[1]).toContain('init');
    expect(core.formatEnv([['PWD', '/'], ['X', null]])).toEqual(['PWD=/', 'X=']);
    const h = core.formatHistory(['ls', 'cd /documents']);
    expect(h).toHaveLength(2);
    expect(h[1]).toContain('cd /documents');
  });
  it('formatApps：41 行两列（id + 中文名）', () => {
    const rows = core.formatApps();
    expect(rows).toHaveLength(41);
    expect(rows[0]).toContain('msg');
    expect(rows[0]).toContain('信息');
  });
  it('esc：& < > " \' 全转义（在线内容不可信纪律同源）', () => {
    expect(core.esc('<img src=x onerror="a">\'&'))
      .toBe('&lt;img src=x onerror=&quot;a&quot;&gt;&#39;&amp;');
    expect(core.esc(null)).toBe('');
  });
});

describe('v8.40 #25 源码纪律锚（无 eval / 无 innerHTML / FS 桥协议）', () => {
  // 调用级正则（v8.39 教训：注释提发会被简单 includes 误伤）
  const EVAL_CALL = /(^|[^.\w])eval\s*\(/;
  const NEWFN_CALL = /new\s+Function\s*\(/;
  it('terminal-core.js 零 eval / 零 new Function（白名单分支调度）', () => {
    expect(EVAL_CALL.test(CORE_SRC)).toBe(false);
    expect(NEWFN_CALL.test(CORE_SRC)).toBe(false);
  });
  it('terminal/index.html 零 eval / 零 innerHTML 赋值（textContent 全链防注入）', () => {
    expect(EVAL_CALL.test(PAGE_SRC)).toBe(false);
    expect(NEWFN_CALL.test(PAGE_SRC)).toBe(false);
    // 调用级正则：仅 innerHTML 赋值算违规（注释提发不算 —— v8.39 教训）
    expect(/(^|[^.\w])innerHTML\s*\+?=/.test(PAGE_SRC)).toBe(false);
  });
  it('FS 桥协议：FS_REQUEST/FS_RESULT + 3s 超时兜底', () => {
    expect(PAGE_SRC).toContain("type: 'FS_REQUEST'");
    expect(PAGE_SRC).toContain("'FS_RESULT'");
    expect(PAGE_SRC).toContain('FS 桥超时');
    expect(PAGE_SRC).toContain('3000');
  });
  it('core 缺载守卫（绝不白屏）+ textContent 输出主路径', () => {
    expect(PAGE_SRC).toContain('terminal-core 加载失败');
    expect(PAGE_SRC).toContain('textContent =');
  });
});

describe('v8.40 #25 页面行为锚（历史/补全/无状态残留/深链）', () => {
  it('历史：↑↓ 键 + localStorage 持久化 key + 100 上限 + 损坏静默降级', () => {
    expect(PAGE_SRC).toContain('ArrowUp');
    expect(PAGE_SRC).toContain('ArrowDown');
    expect(PAGE_SRC).toContain("'ios-desktop:terminal-history'");
    expect(PAGE_SRC).toContain('HIST_MAX = 100');
    expect(PAGE_SRC).toContain('JSON.parse');
    expect(PAGE_SRC).toMatch(/catch \(e\) \{[^}]*静默/);
  });
  it('Tab 补全 + Enter 提交', () => {
    expect(PAGE_SRC).toContain("e.key === 'Tab'");
    expect(PAGE_SRC).toContain("e.key === 'Enter'");
  });
  it('无状态残留（v7.11 教训）：cd 仅确认存在且为目录才落 cwd；exit 复位 cwd=/', () => {
    const cdIdx = PAGE_SRC.indexOf('case \'cd\'');
    const cdBlock = PAGE_SRC.slice(cdIdx, PAGE_SRC.indexOf('case \'pwd\''));
    expect(cdBlock).toContain('无此目录');
    expect(cdBlock).toContain('不是目录');
    expect(cdBlock.indexOf('cwd = dest')).toBeGreaterThan(cdBlock.indexOf('type !== \'dir\''));
    const exitIdx = PAGE_SRC.indexOf('case \'exit\'');
    expect(PAGE_SRC.slice(exitIdx, exitIdx + 200)).toContain("cwd = '/'");
  });
  it('open 深链走 __system.openApp(t.id)；未知应用报错引导 apps', () => {
    expect(PAGE_SRC).toContain('__system.openApp(t.id)');
    expect(PAGE_SRC).toContain('未知应用');
    expect(PAGE_SRC).toContain('apps 查看全部可启动应用');
  });
  it('beat 联动 #30：openApp 深链 bytebeat 打开即奏（v8.42 转正，不再是预留位）', () => {
    expect(PAGE_SRC).toContain("window.__system.openApp('bytebeat'");
    expect(PAGE_SRC).toContain("event: 'bytebeat/play'");
    expect(PAGE_SRC).toContain('usage: beat');
    expect(PAGE_SRC).toContain('白名单沙箱');
  });
  it('Roboto Mono 等宽 + AOSP 黑底质感（议题视觉验收）', () => {
    expect(PAGE_SRC).toContain('family=Roboto+Mono');
    expect(PAGE_SRC).toContain("font-family: 'Roboto Mono'");
    expect(PAGE_SRC).toContain('ui-monospace, Menlo, Consolas, monospace');
    expect(PAGE_SRC).toContain('--t-bg: #0d1112');
  });
  it('core 两级上行引用（iframe 相对路径基准是 apps/ —— v8.38 教训）', () => {
    expect(PAGE_SRC).toContain('src="../../js/terminal-core.js"');
  });
});

describe('v8.40 #25 注册链四件套', () => {
  it('apps-data.js：import terminal + initialApps 在册（v8.44 ping 入列末位）', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf8');
    expect(src).toContain("import terminal   from './apps/terminal.js'");
    expect(src).toMatch(/reaction, word, terminal, piano, bytebeat, python, ping, codeEditor, midiPlayer,\s*\n\];/);
  });
  it('apps/terminal.js 定义：id=terminal · name=终端 · iframeAppContent', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/apps/terminal.js'), 'utf8');
    expect(src).toContain("id: 'terminal'");
    expect(src).toContain("name: '终端'");
    expect(src).toContain("iframeAppContent('apps/terminal/index.html')");
  });
  it('app-icons.js 100×100 terminal 图标 + icons.js 24px glyph', () => {
    const big = readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf8');
    expect(big).toMatch(/terminal: `<svg viewBox="0 0 100 100"/);
    const glyph = readFileSync(join(ROOT, 'ios-desktop/js/icons.js'), 'utf8');
    expect(glyph).toMatch(/terminal: `<svg viewBox="0 0 24 24"/);
  });
  it('storage-stats.js：terminal-history 归属登记', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/storage-stats.js'), 'utf8');
    expect(src).toContain("['ios-desktop:terminal-history', 'terminal']");
  });
});
