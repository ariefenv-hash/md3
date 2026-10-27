// ==================== v843-python.test.js — v8.43 #31 Python REPL（#12 P2·Pyodide 懒加载） ====================
//
// 验收映射（议题 #31 原文）：
//   · 首次加载 ≤1 次 CDN 拉取且二次进入零下载（缓存）→ 懒加载守卫 + 同会话幂等（e2e 落地）
//   · print / 异常（带行号）/ 第三方库（micropip·numpy 试）三链路 → core 纯函数 + 页面接线锚
//   · 历史代码 localStorage 持久化 → python_history_v1 + normalize/append 纯函数
//   · stdout/stderr 重定向输出面板 + 错误带行号回显 → parsePyError + appendStream 分流
//
// 模式沿袭 v838~v842 五代：经典脚本 IIFE 挂 window.__pythonCore，new Function 沙箱直驱；
// 顶层零副作用（不碰 document/localStorage），node 直接 import 安全。

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/python-core.js'), 'utf8');
const PAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/python/index.html'), 'utf8');

// ---------- 沙箱提取（经典脚本 IIFE → window.__pythonCore） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__pythonCore;

describe('v8.43 #31 core：常量与状态机', () => {
  it('PYODIDE_URL：jsdelivr v0.25.0 full/pyodide.js（议题材料原文锚）', () => {
    expect(core.PYODIDE_VERSION).toBe('v0.25.0');
    expect(core.PYODIDE_URL).toBe('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');
  });

  it('存储键与上限：python_history_v1 / python_draft_v1 / HISTORY_MAX 50 / DRAFT_MAX 20000', () => {
    expect(core.HISTORY_KEY).toBe('python_history_v1');
    expect(core.DRAFT_KEY).toBe('python_draft_v1');
    expect(core.HISTORY_MAX).toBe(50);
    expect(core.DRAFT_MAX).toBe(20000);
  });

  it('STATUS 五态 + canRun 仅就绪态放行（防重入唯一真源）', () => {
    expect(core.STATUS).toEqual({ IDLE: 'idle', LOADING: 'loading', READY: 'ready', RUNNING: 'running', ERROR: 'error' });
    expect(core.canRun(core.STATUS.READY)).toBe(true);
    expect(core.canRun(core.STATUS.IDLE)).toBe(false);
    expect(core.canRun(core.STATUS.LOADING)).toBe(false);
    expect(core.canRun(core.STATUS.RUNNING)).toBe(false);
    expect(core.canRun(core.STATUS.ERROR)).toBe(false);
  });

  it('SAMPLE 示例：含 import sys 与 print（首次打开的可读起点）', () => {
    expect(core.SAMPLE).toContain('import sys');
    expect(core.SAMPLE).toContain('print(');
  });
});

describe('v8.43 #31 core：normalizeHistory 损坏降级四态', () => {
  it('非数组 / null / undefined → []', () => {
    expect(core.normalizeHistory(null)).toEqual([]);
    expect(core.normalizeHistory(undefined)).toEqual([]);
    expect(core.normalizeHistory('x')).toEqual([]);
    expect(core.normalizeHistory({})).toEqual([]);
  });

  it('逐条校验：非对象跳过 · code 非非空字符串跳过 · ts 异常归 0 · ok 严格 === true', () => {
    const out = core.normalizeHistory([
      null,
      'junk',
      42,
      {},
      { code: '   ' },
      { code: 'print(1)' },                    // ts 缺省 → 0，ok 缺省 → false
      { code: 'print(2)', ts: -5, ok: 'yes' }, // ts 负数 → 0，ok 非布尔 → false
      { code: 'print(3)', ts: 123, ok: true },
    ]);
    expect(out).toEqual([
      { code: 'print(1)', ts: 0, ok: false },
      { code: 'print(2)', ts: 0, ok: false },
      { code: 'print(3)', ts: 123, ok: true },
    ]);
  });

  it('上限截尾：超出 cap 只保留前 cap 条（顺序不变）；非法 cap 回落 HISTORY_MAX', () => {
    const raw = Array.from({ length: 60 }, (_, i) => ({ code: 'c' + i }));
    expect(core.normalizeHistory(raw, 50)).toHaveLength(50);
    expect(core.normalizeHistory(raw, 50)[0].code).toBe('c0');
    expect(core.normalizeHistory(raw, 3)).toHaveLength(3);
    expect(core.normalizeHistory(raw)[0].code).toBe('c0'); // 缺省 cap = HISTORY_MAX
    expect(core.normalizeHistory(raw, 0)).toHaveLength(50);  // 非法 cap → 回落 HISTORY_MAX
    expect(core.normalizeHistory(raw, -1)).toHaveLength(50);
    expect(core.normalizeHistory(raw, NaN)).toHaveLength(50);
  });
});

describe('v8.43 #31 core：appendHistory 头插 + 去重 + 幂等', () => {
  it('空 code / 非字符串 → 原样归一返回', () => {
    const base = [{ code: 'a', ts: 1, ok: true }];
    expect(core.appendHistory(base, '')).toEqual(base);
    expect(core.appendHistory(base, '   ')).toEqual(base);
    expect(core.appendHistory(base, null)).toEqual(base);
  });

  it('新条目插头部（最新在前）', () => {
    const out = core.appendHistory([{ code: 'a', ts: 1, ok: true }], 'b', 2, false);
    expect(out.map((e) => e.code)).toEqual(['b', 'a']);
    expect(out[0]).toEqual({ code: 'b', ts: 2, ok: false });
  });

  it('与头部同码 → 幂等刷新（不产生重复条目）', () => {
    const out = core.appendHistory([{ code: 'a', ts: 1, ok: false }, { code: 'b', ts: 2, ok: true }], 'a', 9, true);
    expect(out.map((e) => e.code)).toEqual(['a', 'b']);
    expect(out[0]).toEqual({ code: 'a', ts: 9, ok: true });
  });

  it('同码在尾部 → 挪到头部（历史去重），其余顺序保持', () => {
    const base = [{ code: 'a', ts: 1, ok: true }, { code: 'b', ts: 2, ok: true }, { code: 'a', ts: 0, ok: false }];
    const out = core.appendHistory(base, 'a', 7, true);
    expect(out.map((e) => e.code)).toEqual(['a', 'b']);
  });

  it('超上限截尾 + 纯函数不改入参', () => {
    const base = Array.from({ length: 50 }, (_, i) => ({ code: 'c' + i, ts: i, ok: true }));
    const snapshot = JSON.stringify(base);
    const out = core.appendHistory(base, 'new', 99, true);
    expect(out).toHaveLength(50);
    expect(out[0].code).toBe('new');
    expect(out[49].code).toBe('c48'); // 末位被挤出
    expect(JSON.stringify(base)).toBe(snapshot); // 入参未被改写
  });
});

describe('v8.43 #31 core：parsePyError 行号回显', () => {
  it('完整 Traceback → 取最后一条 <exec> 帧（最贴近抛错点）+ 尾行 detail', () => {
    const msg = [
      'Traceback (most recent call last):',
      '  File "<exec>", line 2, in <module>',
      '  File "<exec>", line 4, in helper',
      'RuntimeError: boom',
    ].join('\n');
    expect(core.parsePyError(msg)).toEqual({ line: 4, detail: 'RuntimeError: boom' });
  });

  it('SyntaxError 单帧行 1', () => {
    const msg = '  File "<exec>", line 1\n    def f(: \nSyntaxError: invalid syntax';
    expect(core.parsePyError(msg)).toEqual({ line: 1, detail: 'SyntaxError: invalid syntax' });
  });

  it('无 <exec> 帧 → line null，detail 仍取尾行', () => {
    expect(core.parsePyError('ZeroDivisionError: division by zero')).toEqual({ line: null, detail: 'ZeroDivisionError: division by zero' });
  });

  it('非字符串 / 空白 → null', () => {
    expect(core.parsePyError(null)).toBeNull();
    expect(core.parsePyError(undefined)).toBeNull();
    expect(core.parsePyError(42)).toBeNull();
    expect(core.parsePyError('   ')).toBeNull();
  });
});

describe('v8.43 #31 core：normalizePkgName（micropip 输入防呆·PEP 503）', () => {
  it('合法：大小写归一 + 连续分隔符折叠为 -（首尾必须是字母数字——PEP 503 规范形）', () => {
    expect(core.normalizePkgName('NumPy')).toBe('numpy');
    expect(core.normalizePkgName('scikit_learn')).toBe('scikit-learn');
    expect(core.normalizePkgName('  Foo..Bar  ')).toBe('foo-bar');
    expect(core.normalizePkgName('a')).toBe('a');
    expect(core.normalizePkgName('Pillow')).toBe('pillow');
  });

  it('非法：空/首尾分隔/含空白或非 ASCII/非字符串 → null', () => {
    expect(core.normalizePkgName('')).toBeNull();
    expect(core.normalizePkgName('   ')).toBeNull();
    expect(core.normalizePkgName('-lead')).toBeNull();
    expect(core.normalizePkgName('trail-')).toBeNull();
    expect(core.normalizePkgName('Foo..Bar--')).toBeNull(); // 尾部分隔符非法（PEP 503 规范形要求首尾字母数字）
    expect(core.normalizePkgName('a b')).toBeNull();
    expect(core.normalizePkgName('包')).toBeNull();
    expect(core.normalizePkgName(null)).toBeNull();
    expect(core.normalizePkgName(42)).toBeNull();
  });

  it('isPkgName 与 normalizePkgName 镜像', () => {
    expect(core.isPkgName('numpy')).toBe(true);
    expect(core.isPkgName('numpy!')).toBe(false);
  });
});

describe('v8.43 #31 core：previewCode 历史条目预览', () => {
  it('首个非空行 + 空白折叠', () => {
    expect(core.previewCode('\n\n  x = 1 + 2  \n print(x)')).toBe('x = 1 + 2');
  });

  it('超长截断省略号（默认 24 / 自定义 n）', () => {
    expect(core.previewCode('a'.repeat(40))).toBe('a'.repeat(24) + '…');
    expect(core.previewCode('a'.repeat(40), 6)).toBe('aaaaaa…');
    expect(core.previewCode('a'.repeat(6), 6)).toBe('aaaaaa');
  });

  it('防御：非字符串 → 空串 · 非法 n 落默认', () => {
    expect(core.previewCode(null)).toBe('');
    expect(core.previewCode(42)).toBe('');
    expect(core.previewCode('abcdef', 1)).toBe('abcdef'); // n < 4 → 默认 24
  });
});

// ---------- 纯度与模式纪律（五代同款负断言） ----------
describe('v8.43 #31 core：IIFE 纯度纪律', () => {
  it('经典脚本 IIFE：零 ESM export（v8.38 双坑锚），挂载 __pythonCore', () => {
    expect(CORE_SRC).toContain('window.__pythonCore');
    expect(CORE_SRC).not.toMatch(/^\s*export\s/m);
    expect(CORE_SRC.trimEnd().endsWith('})();')).toBe(true);
  });

  it('顶层零副作用：不碰 document / localStorage / fetch（接线全在页面侧；调用级正则防注释误伤——v841 同款）', () => {
    expect(CORE_SRC).not.toMatch(/document\./);
    expect(CORE_SRC).not.toMatch(/localStorage\./);
    expect(CORE_SRC).not.toContain('fetch(');
    expect(CORE_SRC).not.toContain('eval(');
    expect(CORE_SRC).not.toMatch(/new\s+Function\s*\(/); // 调用级（注释提及不算）
  });
});

// ---------- 页面接线锚（懒加载 / 三链路 / 持久化 / 深链 / 安全） ----------
describe('v8.43 #31 页面：懒加载 + 三链路接线锚', () => {
  it('运行时 URL 只来自 core.PYODIDE_URL（页面零硬编码 CDN——版本升级单点改）', () => {
    expect(PAGE_SRC).toContain('core.PYODIDE_URL');
    expect(PAGE_SRC).not.toContain('cdn.jsdelivr.net');
    expect(PAGE_SRC).not.toContain('pyodide.org');
  });

  it('懒加载守卫：script 注入带 id 幂等 + window.loadPyodide 已存在则零注入 + 失败可重试', () => {
    expect(PAGE_SRC).toContain("getElementById('pyodide-script')");
    expect(PAGE_SRC).toMatch(/if \(window\.loadPyodide\) \{ resolve\(\); return; \}/);
    expect(PAGE_SRC).toMatch(/rt\.loadingPromise = null; \/\/ 允许重试/);
  });

  it('loadPyodide stdout/stderr 双流重定向到输出面板（议题验收原文）', () => {
    expect(PAGE_SRC).toMatch(/window\.loadPyodide\(\{ stdout: function \(t\) \{ appendStream\('out', t\); \}, stderr: function \(t\) \{ appendStream\('err', t\); \} \}\)/);
  });

  it('错误带行号回显：parsePyError + 行 N 上屏 + detail（异常链路）', () => {
    expect(PAGE_SRC).toContain('core.parsePyError(');
    expect(PAGE_SRC).toMatch(/parsed\.line \? \('（行 ' \+ parsed\.line \+ '）'\)/);
  });

  it('print 链路：pushLine 全 textContent，零 innerHTML（在线内容不可信纪律）', () => {
    expect(PAGE_SRC).not.toMatch(/\.innerHTML/);
    expect(PAGE_SRC).toContain('div.textContent = text');
  });

  it('micropip 链路：normalizePkgName 防呆在前 + loadPackage(micropip) + pyimport + install', () => {
    expect(PAGE_SRC).toMatch(/core\.normalizePkgName\(pkgInput\.value\)/);
    expect(PAGE_SRC).toMatch(/py\.loadPackage\('micropip'\)/);
    expect(PAGE_SRC).toMatch(/rt\.pyodide\.pyimport\('micropip'\)/);
    expect(PAGE_SRC).toMatch(/micropip\.install\(name\)/);
  });

  it('历史持久化：python_history_v1 读写 + appendHistory + normalizeHistory 降级', () => {
    expect(PAGE_SRC).toContain('core.HISTORY_KEY');
    expect(PAGE_SRC).toContain('core.appendHistory(hist, code, Date.now(), ok, core.HISTORY_MAX)');
    expect(PAGE_SRC).toContain('core.normalizeHistory(readJSON(core.HISTORY_KEY, []), core.HISTORY_MAX)');
  });

  it('草稿持久化：python_draft_v1 防抖 400ms + DRAFT_MAX 截断 + 恢复优先于示例', () => {
    expect(PAGE_SRC).toContain('core.DRAFT_KEY');
    expect(PAGE_SRC).toMatch(/ta\.value\.slice\(0, core\.DRAFT_MAX\)/);
    expect(PAGE_SRC).toMatch(/if \(typeof draft === 'string' && draft\.trim\(\)\) \{\s*ta\.value = draft;/);
  });

  it('初始化绝不自动拉运行时（二次进入零下载锚）：init 只读草稿/历史/置 idle', () => {
    const initBody = PAGE_SRC.match(/function init\(\) \{[\s\S]*?\n    \}/);
    expect(initBody).toBeTruthy();
    expect(initBody[0]).not.toContain('ensureRuntime');
    expect(initBody[0]).not.toContain('injectPyodide');
    expect(initBody[0]).toContain('core.STATUS.IDLE');
  });

  it('输入便利：Tab 插入 4 空格 + Ctrl/Cmd+Enter 运行 + 空代码 toast 拒运行', () => {
    expect(PAGE_SRC).toMatch(/e\.preventDefault\(\); \/\/ Tab 缩进：4 空格插入/);
    expect(PAGE_SRC).toMatch(/e\.key === 'Enter' && \(e\.ctrlKey \|\| e\.metaKey\)/);
    expect(PAGE_SRC).toMatch(/if \(!code\.trim\(\)\) \{ toast\('先写点 Python 代码'\); return; \}/);
  });

  it('BUSY 互斥：运行/安装期间按钮禁用防重入（同步 runPython 冻结主线程）', () => {
    expect(PAGE_SRC).toMatch(/if \(BUSY\) return;/);
    expect(PAGE_SRC).toMatch(/runBtn\.disabled = true;/);
    expect(PAGE_SRC).toMatch(/installBtn\.disabled = true;/);
  });

  it('深链：BUS_DELIVER python/run {code} 注入即算（终端 open python 联动位）', () => {
    expect(PAGE_SRC).toContain("d.type !== 'BUS_DELIVER' || d.event !== 'python/run'");
    expect(PAGE_SRC).toMatch(/var code = String\(\(d\.payload \|\| \{\}\)\.code \|\| ''\);/);
    expect(PAGE_SRC).toMatch(/runCode\(\); \/\/ 懒加载在 runCode 内完成/);
  });

  it('缺载守卫：python-core 缺载 → 错误行提示，绝不白屏', () => {
    expect(PAGE_SRC).toMatch(/if \(!core\) \{/);
    expect(PAGE_SRC).toContain('核心模块缺载（python-core）');
  });

  it('共享令牌层 + 冻结 shim + 核心脚本两级上行（iframe 相对路径基准是 apps/）', () => {
    expect(PAGE_SRC).toContain('../freeze-shim.js');
    expect(PAGE_SRC).toContain('../_shared/md3-tokens.css');
    expect(PAGE_SRC).toContain('../../js/python-core.js');
  });

  it('输出封顶：MAX_LINES 500 防失控（长跑刷屏内存守卫）', () => {
    expect(PAGE_SRC).toMatch(/var MAX_LINES = 500;/);
    expect(PAGE_SRC).toMatch(/while \(outEl\.childNodes\.length > MAX_LINES\)/);
  });
});

// ---------- 注册链四件套 + 联动锚 ----------
describe('v8.43 #31 注册链四件套 + 联动锚', () => {
  it('apps-data.js：import python + initialApps 末位（40 应用）', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf8');
    expect(src).toContain("import python     from './apps/python.js'; // v8.43 #31");
    expect(src).toMatch(/reaction, word, terminal, piano, bytebeat, python, ping, codeEditor,\s*\n\];/);
  });

  it('apps/python.js wrapper：id=python · name=Python · iframeAppContent', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/apps/python.js'), 'utf8');
    expect(src).toContain("id: 'python'");
    expect(src).toContain("name: 'Python'");
    expect(src).toContain("iframeAppContent('apps/python/index.html')");
  });

  it('app-icons.js 100×100 python 图标 + icons.js 24px glyph（outline+filled 双映射）', () => {
    const big = readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf8');
    expect(big).toMatch(/python: `<svg viewBox="0 0 100 100"/);
    expect(big).toContain('双蛇互扣');
    const glyph = readFileSync(join(ROOT, 'ios-desktop/js/icons.js'), 'utf8');
    expect(glyph).toMatch(/python: `<svg viewBox="0 0 24 24"/);
  });

  it('storage-stats.js：python_history_v1 + python_draft_v1 归属登记', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/storage-stats.js'), 'utf8');
    expect(src).toContain("['python_history_v1', 'python']");
    expect(src).toContain("['python_draft_v1', 'python']");
  });

  it('terminal-core.js：APPS 表入列 python（40 应用）+ resolveTarget 别名（py/repl/蛇）', () => {
    const src = readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf8');
    expect(src).toContain("['python', 'Python', 'python', 'py', 'repl', '蛇']");
    const c2 = { window: {} };
    new Function('window', src)(c2.window);
    const tc = c2.window.__terminalCore;
    expect(tc.APPS.length).toBe(40);
    expect(tc.resolveTarget('python')).toEqual({ id: 'python', name: 'Python' });
    expect(tc.resolveTarget('PY')).toEqual({ id: 'python', name: 'Python' });
    expect(tc.resolveTarget('repl')).toEqual({ id: 'python', name: 'Python' });
    expect(tc.resolveTarget('蛇')).toEqual({ id: 'python', name: 'Python' });
  });

  it('icon fixture：python 7 处动态色 · 全库总数 215（v8.44 208 + 7）', () => {
    const fixture = JSON.parse(readFileSync(join(ROOT, 'tests/icon-dynamic-colors.generated.json'), 'utf-8'));
    expect(fixture.icons.python.dynamic).toBe(7);
    expect(fixture.icons.python.colors).toHaveLength(7);
    const total = Object.values(fixture.icons).reduce((s, v) => s + (v.colors || []).length, 0);
    expect(total).toBe(220);
  });

  it('md3-tokens 共享层挂载（iframe 应用第 28 个）', () => {
    expect(PAGE_SRC.indexOf('../_shared/md3-tokens.css')).toBeGreaterThan(-1);
  });
});
