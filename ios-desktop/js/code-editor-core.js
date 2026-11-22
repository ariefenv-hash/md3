// ==================== code-editor-core.js — 代码编辑器纯函数核（v8.50 #32） ====================
//
// 议题 #32 验收锚（vitest 直驱面）：
//   · 语言四模式 js/html/css/python（python 供 Python REPL 共用）→ detectLang
//   · 文件树=VFS files 存储层 → buildTree / dirName / baseName / joinPath
//   · 编辑/保存/切换文件零丢失 → dirty 状态机 + STATE 规范化
//   · 大文件（1MB）不卡 → BIG_FILE_BYTES 阈值 + fmtBytes 口径
//   · 终端 `code <file>` 联动入口 → DEEP_LINK_EVENT + parseDeepLink
//
// 模式沿袭 v840~v844：经典脚本 IIFE 挂 window.__codeEditorCore；
// 顶层零副作用（不碰 document/localStorage），node 直接 new Function 沙箱安全。

(function () {
  'use strict';

  // ---------- 常量 ----------
  var STATE_KEY = 'ios-desktop:code-editor-v1';
  var DEEP_LINK_EVENT = 'code-editor/open';
  var BIG_FILE_BYTES = 1024 * 1024;      // 1MB：超过走「只读提示+照常打开」口径（CM6 大文档引擎可承受）
  var BIG_WARN_BYTES = 256 * 1024;       // 256KB：软渲染环境 >此值关闭自动换行（长行换行计算 O(n) 卡顿源）
  var MAX_UNDO_STACK_HINT = 200;         // 提示值：CM6 内建历史，超限由引擎自行截断
  var TREE_MAX_ENTRIES = 500;            // 文件树单次渲染上限（防 VFS 爆库拖死 UI）

  var LANGS = {
    javascript: { id: 'javascript', label: 'JavaScript', exts: ['js', 'mjs', 'cjs', 'jsx'] },
    html:       { id: 'html',       label: 'HTML',       exts: ['html', 'htm'] },
    css:        { id: 'css',        label: 'CSS',        exts: ['css'] },
    python:     { id: 'python',     label: 'Python',     exts: ['py', 'pyw'] },
  };

  // ---------- 语言检测（按扩展名；未知 → null = 纯文本无高亮） ----------
  function extOf(path) {
    var base = baseName(String(path || ''));
    var i = base.lastIndexOf('.');
    if (i <= 0 || i === base.length - 1) return '';
    return base.slice(i + 1).toLowerCase();
  }

  function detectLang(path) {
    var ext = extOf(path);
    if (!ext) return null;
    var ids = Object.keys(LANGS);
    for (var i = 0; i < ids.length; i++) {
      if (LANGS[ids[i]].exts.indexOf(ext) >= 0) return LANGS[ids[i]].id;
    }
    return null;
  }

  function langLabel(id) {
    return (LANGS[id] && LANGS[id].label) || '纯文本';
  }

  // ---------- 路径工具（VFS 口径：以 / 开头；目录以 / 分隔） ----------
  function normalizePath(p) {
    if (typeof p !== 'string') return null;
    var s = p.trim();
    if (!s) return null;
    if (s[0] !== '/') s = '/' + s;
    var out = [];
    var segs = s.split('/');
    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i];
      if (!seg || seg === '.') continue;
      if (seg === '..') { out.pop(); continue; }
      out.push(seg);
    }
    return '/' + out.join('/');
  }

  function dirName(path) {
    var p = normalizePath(path);
    if (!p || p === '/') return '/';
    var i = p.lastIndexOf('/');
    return i === 0 ? '/' : p.slice(0, i);
  }

  function baseName(path) {
    var p = normalizePath(path);
    if (!p || p === '/') return '';
    return p.slice(p.lastIndexOf('/') + 1);
  }

  function joinPath(dir, name) {
    var d = normalizePath(dir || '/');
    var n = String(name || '').trim();
    if (!n || n === '/' || n.indexOf('/') >= 0) return null;
    if (d === '/') return '/' + n;
    return d + '/' + n;
  }

  // ---------- 树构建（VFS list 结果 [meta] → 目录在前、字典序） ----------
  // meta: { path, name, type: 'file'|'dir', size, mime, modified }
  function sortEntries(entries) {
    return (entries || []).slice().sort(function (a, b) {
      var ad = a.type === 'dir' ? 0 : 1;
      var bd = b.type === 'dir' ? 0 : 1;
      if (ad !== bd) return ad - bd;
      return String(a.name).localeCompare(String(b.name), 'zh-Hans-CN');
    });
  }

  // 扁平路径集 → 目录树（供懒展开；dirPath → 子项由 list(dir) 惰性拉取）
  function buildTree(entries) {
    var dirs = {};
    var files = [];
    (entries || []).slice(0, TREE_MAX_ENTRIES).forEach(function (m) {
      if (!m || !m.path) return;
      if (m.type === 'dir') dirs[m.path] = m;
      else files.push(m);
    });
    return { dirs: dirs, files: sortEntries(files) };
  }

  // ---------- 状态持久化（编辑/保存/切换零丢失锚） ----------
  // state: { path, dirty, wrap, fontSize }  — doc 内容不进 localStorage（大文件走 VFS 本体）
  function normalizeState(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    return {
      path: typeof r.path === 'string' && r.path ? r.path : null,
      dirty: !!r.dirty,
      wrap: !(r.wrap === false || r.wrap === 0),   // 仅显式 false/0 关闭（0 不被 !! 误判为开）
      fontSize: (typeof r.fontSize === 'number' && r.fontSize >= 10 && r.fontSize <= 24) ? r.fontSize : 14,
    };
  }

  // dirty 判定：空白差异不算改动（trim 后比对；零宽/行尾空白归一）
  function isDirty(a, b) {
    if (a === b) return false;
    var na = String(a == null ? '' : a).replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '');
    var nb = String(b == null ? '' : b).replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '');
    return na !== nb;
  }

  // ---------- 大小/行数口径 ----------
  function fmtBytes(n) {
    var v = +n || 0;
    if (v < 1024) return v + ' B';
    if (v < 1024 * 1024) return (v / 1024).toFixed(1) + ' KB';
    return (v / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function isBigFile(bytes) { return (+bytes || 0) > BIG_FILE_BYTES; }
  function shouldDisableWrap(bytes) { return (+bytes || 0) > BIG_WARN_BYTES; }

  function countLines(text) {
    var s = String(text == null ? '' : text);
    var n = 1;
    for (var i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++;
    return n;
  }

  // 行号补零对齐（等宽链口径：数字位宽一致零漂移——v8.49 秒表教训）
  function formatLineNo(n, width) {
    var s = String(n);
    var w = Math.max(1, Math.min(width || 1, 8));
    while (s.length < w) s = ' ' + s;
    return s;
  }

  // ---------- 终端联动入口（`code <file>` → 深链载荷解析） ----------
  function parseDeepLink(payload) {
    if (!payload || typeof payload !== 'object') return null;
    var p = normalizePath(payload.path);
    if (!p || p === '/') return null;
    if (payload.path && /[.\/]$/.test(payload.path) === false && !extOf(p)) {
      // 无扩展名允许（纯文本打开），仅拒绝明显目录尾斜杠形态——交由 FS 层 exists 兜底
    }
    return { path: p, lang: detectLang(p) };
  }

  // ---------- 导出 ----------
  window.__codeEditorCore = {
    STATE_KEY: STATE_KEY,
    DEEP_LINK_EVENT: DEEP_LINK_EVENT,
    BIG_FILE_BYTES: BIG_FILE_BYTES,
    BIG_WARN_BYTES: BIG_WARN_BYTES,
    MAX_UNDO_STACK_HINT: MAX_UNDO_STACK_HINT,
    TREE_MAX_ENTRIES: TREE_MAX_ENTRIES,
    LANGS: LANGS,
    extOf: extOf,
    detectLang: detectLang,
    langLabel: langLabel,
    normalizePath: normalizePath,
    dirName: dirName,
    baseName: baseName,
    joinPath: joinPath,
    sortEntries: sortEntries,
    buildTree: buildTree,
    normalizeState: normalizeState,
    isDirty: isDirty,
    fmtBytes: fmtBytes,
    isBigFile: isBigFile,
    shouldDisableWrap: shouldDisableWrap,
    countLines: countLines,
    formatLineNo: formatLineNo,
    parseDeepLink: parseDeepLink,
  };
})();
