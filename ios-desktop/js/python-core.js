// ==================== python-core.js — Python REPL 核心纯函数（v8.43 #31） ====================
// 「网页里的真 Python」：运行时由 Pyodide (WebAssembly/CPython) 懒加载，本文件只承载
// 可离线验证的纯逻辑（历史队列 / 错误解析 / 包名规范化 / 状态机）。
//
// 模式沿袭 fx/word/terminal/piano/bytebeat-core（v8.38~v8.42 五代验证）：
//   · 经典脚本 IIFE 挂 window.__pythonCore —— ESM export 在经典 <script> 下整文件
//     SyntaxError（v8.38 双坑实录），顶层零副作用，node/vitest 直接 new Function 沙箱直驱；
//   · 页面侧只做接线，全部动态输出走 textContent（零 innerHTML，在线内容不可信面）；
//   · localStorage 损坏 JSON / 类型漂移一律静默降级（reaction_stats_v1 同律）。

(function () {
  'use strict';

  // ---------- 运行时（#31 材料原文锚：jsdelivr v0.25.0，nightsky 同源验证可用） ----------
  var PYODIDE_VERSION = 'v0.25.0';
  var PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/' + PYODIDE_VERSION + '/full/pyodide.js';

  // ---------- 存储键 ----------
  var HISTORY_KEY = 'python_history_v1';   // 运行历史 [{code, ts, ok}]
  var DRAFT_KEY = 'python_draft_v1';       // 编辑器草稿（字符串）
  var HISTORY_MAX = 50;                    // 历史条数上限
  var DRAFT_MAX = 20000;                   // 草稿字符上限（防巨型粘贴撑爆配额）

  // ---------- 运行时状态机（页面徽标/按钮可运行判定唯一真源） ----------
  var STATUS = {
    IDLE: 'idle',          // 未加载（打开应用绝不自动拉 CDN —— 懒加载验收锚）
    LOADING: 'loading',    // CDN/初始化进行中
    READY: 'ready',        // 运行时就绪，可运行/可安装
    RUNNING: 'running',    // runPython 执行中
    ERROR: 'error'         // 加载失败（可重试：loadingPromise 已清空）
  };

  /** 仅就绪态可运行（加载中/失败/空闲一律拒绝 —— 防重入） */
  function canRun(status) {
    return status === STATUS.READY;
  }

  // ---------- 历史队列（损坏 JSON / 类型漂移四态静默降级） ----------
  /**
   * normalizeHistory(raw, max) — 任意输入 → 合法历史数组。
   * 逐条校验：非对象跳过；code 非非空字符串跳过；ts 非有限非负数归 0；ok 严格 === true。
   * 顺序保持输入序，超出 cap 截尾。
   */
  function normalizeHistory(raw, max) {
    var cap = (typeof max === 'number' && isFinite(max) && max > 0) ? Math.floor(max) : HISTORY_MAX;
    if (!Array.isArray(raw)) return [];
    var out = [];
    for (var i = 0; i < raw.length && out.length < cap; i++) {
      var e = raw[i];
      if (!e || typeof e !== 'object') continue;
      var code = typeof e.code === 'string' ? e.code : '';
      if (!code.trim()) continue;
      var ts = (typeof e.ts === 'number' && isFinite(e.ts) && e.ts >= 0) ? e.ts : 0;
      out.push({ code: code, ts: ts, ok: e.ok === true });
    }
    return out;
  }

  /**
   * appendHistory(list, code, ts, ok, max) — 新条目插头部（最新在前）。
   * 空/非字符串 code → 原样归一返回；同码（无论位置）全部清理后插头部（历史去重：
   * 头部同码即幂等刷新，其余位置同码一律挪到头部）；超上限截尾。纯函数不改入参。
   */
  function appendHistory(list, code, ts, ok, max) {
    var cap = (typeof max === 'number' && isFinite(max) && max > 0) ? Math.floor(max) : HISTORY_MAX;
    if (typeof code !== 'string' || !code.trim()) return normalizeHistory(list, cap);
    var stamp = (typeof ts === 'number' && isFinite(ts) && ts >= 0) ? ts : 0;
    var entry = { code: code, ts: stamp, ok: ok === true };
    var base = normalizeHistory(list, cap);
    var out = [entry];
    for (var i = 0; i < base.length; i++) {
      if (base[i].code !== code) out.push(base[i]);
    }
    return out.slice(0, cap);
  }

  // ---------- 错误解析（PythonError 文本 → 行号 + 尾行） ----------
  /**
   * parsePyError(message) — 解析 Pyodide/CPython 的 PythonError 文本。
   * Traceback 中的用户代码帧形如：File "<exec>", line 4, in <module>
   * 取最后一条带行号的 <exec> 帧（最贴近抛错点的用户帧）；
   * detail 取文本最后一个非空行（异常类型: 消息）。
   * 非字符串/空白 → null。任何输入不抛错。
   */
  function parsePyError(message) {
    if (typeof message !== 'string' || !message.trim()) return null;
    var lines = message.split(/\r?\n/);
    var detail = '';
    for (var i = lines.length - 1; i >= 0; i--) {
      var t = lines[i].trim();
      if (t) { detail = t; break; }
    }
    var line = null;
    var re = /File\s+"<exec>"(?:,\s*line\s+(\d+))?/g;
    var m;
    while ((m = re.exec(message))) {
      if (m[1]) line = parseInt(m[1], 10);
    }
    return { line: line, detail: detail };
  }

  // ---------- 包名规范化（micropip 输入防呆，PEP 503） ----------
  /**
   * normalizePkgName(name) — 大小写归一 + 连续 [-_.] 折叠为 '-'（PEP 503 canonical）。
   * 非法（空/首尾非字母数字/含空白或非 ASCII）→ null。
   * 合法域：^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$，单字符合法。
   */
  function normalizePkgName(name) {
    if (typeof name !== 'string') return null;
    var s = name.trim().toLowerCase();
    if (!s || !/^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/.test(s)) return null;
    return s.replace(/[-_.]+/g, '-');
  }

  function isPkgName(name) {
    return normalizePkgName(name) !== null;
  }

  // ---------- 历史条目预览（chips 标签：首个非空行 + 省略号） ----------
  function previewCode(code, n) {
    if (typeof code !== 'string') return '';
    var cap = (typeof n === 'number' && isFinite(n) && n >= 4) ? Math.floor(n) : 24;
    var raw = code.split(/\r?\n/);
    var first = '';
    for (var i = 0; i < raw.length; i++) {
      var t = raw[i].trim().replace(/\s+/g, ' ');
      if (t) { first = t; break; }
    }
    if (first.length <= cap) return first;
    return first.slice(0, cap) + '…';
  }

  // ---------- 默认示例（首次打开 / 无草稿时） ----------
  var SAMPLE = [
    '# Python REPL · 运行时 = Pyodide（WebAssembly 版 CPython）',
    '# 懒加载：首次点「运行」才从 CDN 获取，二次进入走浏览器缓存',
    'import sys',
    "print('Hello from Python', sys.version.split()[0])",
    'print(sum(range(101)))',
  ].join('\n');

  window.__pythonCore = {
    PYODIDE_VERSION: PYODIDE_VERSION,
    PYODIDE_URL: PYODIDE_URL,
    HISTORY_KEY: HISTORY_KEY,
    DRAFT_KEY: DRAFT_KEY,
    HISTORY_MAX: HISTORY_MAX,
    DRAFT_MAX: DRAFT_MAX,
    STATUS: STATUS,
    SAMPLE: SAMPLE,
    canRun: canRun,
    normalizeHistory: normalizeHistory,
    appendHistory: appendHistory,
    parsePyError: parsePyError,
    normalizePkgName: normalizePkgName,
    isPkgName: isPkgName,
    previewCode: previewCode,
  };
})();
