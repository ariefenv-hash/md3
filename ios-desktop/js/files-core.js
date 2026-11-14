// ==================== files-core.js — 文件应用纯函数核（#286 续 · ref-only 补提取首批 · v11.25） ====================
//
// 职责：files.js（js/apps/files.js，native 模块渲染型）内联脚本的纯逻辑真身——
//   路径工具 / 名称校验 / 分类目录 / 字节格式化 / 排序参数化核。
//   内联 <script>（实例创建期才执行，主文档全局作用域）经 window.__filesCore 桥消费同一份，
//   与 __fjIc 图标桥 / #240 escapeHtml 单源委托同构；vitest 侧用 new Function 沙箱提取
//   （fx-core.js 先例同范式）。
//
// ⚠ 模块形态：**经典脚本 IIFE（无 export）**——files.js 以副作用导入加载（data-backup.js
//   先例：加载即自注册 window.__filesCore），零依赖（不 import 任何模块），保证测试侧
//   new Function('window', SRC) 可直接执行提取。
//
// 车道：#286 ref-only 候补池首批（files/settings/messages 口径；矩阵实态 msg 已 core-full
//   不在池，同覆写二十 music 校正先例，本文件只覆盖 files 域）。零行为变化——内联原实现
//   整体搬移，调用点不变。

(function () {
  'use strict';

  // ==================== 分类目录（Files by Google 六分类；原 files.js 内联 CATS 原样上移） ====================
  var CATS = [
    { key: 'image', label: '图片', exts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic'], mime: 'image/', color: '#8ab4f8', icon: 'image' },
    { key: 'video', label: '视频', exts: ['mp4', 'mov', 'webm', 'avi', 'mkv'], mime: 'video/', color: '#f28b82', icon: 'video' },
    { key: 'audio', label: '音频', exts: ['mp3', 'wav', 'ogg', 'flac', 'm4a'], mime: 'audio/', color: '#81c995', icon: 'audio' },
    { key: 'doc', label: '文档', exts: ['txt', 'md', 'json', 'pdf', 'doc', 'docx', 'html', 'csv'], mime: 'text/', color: '#fdd663', icon: 'doc' },
    { key: 'zip', label: '压缩包', exts: ['zip', 'tar', 'gz', 'rar', '7z'], mime: 'application/zip', color: '#b39ddb', icon: 'zip' },
    { key: 'apk', label: '安装包', exts: ['apk'], mime: 'application/vnd.android.package-archive', color: '#5c6bc0', icon: 'apk' },
  ];

  // ==================== 路径工具（原内联实现整体搬移，逐字符等值） ====================
  /** 父目录：'/a/b' → '/a'；'/a' → '/'；'/' → '/'（lastIndexOf<=0 收根） */
  function parentOf(p) { var i = p.lastIndexOf('/'); return i <= 0 ? '/' : p.slice(0, i); }
  /** 末段名：'/a/b.txt' → 'b.txt'；'/' → '' */
  function baseName(p) { return p.slice(p.lastIndexOf('/') + 1); }
  /** 新建/重命名名称校验：空 / 点目录 / 含路径分隔符 → null（VFS 安全名闸） */
  function validName(name) {
    if (!name || name === '.' || name === '..' || name.indexOf('/') !== -1) return null;
    return name;
  }

  // ==================== 分类判定（原内联实现整体搬移） ====================
  /** 小写扩展名：无点 → ''（dot>-1 才取段） */
  function extOf(name) {
    var dot = name.lastIndexOf('.');
    return dot > -1 ? name.slice(dot + 1).toLowerCase() : '';
  }
  /** mime 前缀优先、扩展名兜底；未命中 → null（DocumentsUI 分类语义） */
  function catOf(entry) {
    var m = entry.mime || '', ext = extOf(entry.name || '');
    for (var i = 0; i < CATS.length; i++) {
      var c = CATS[i];
      if (c.mime && m.indexOf(c.mime) === 0) return c;
      if (c.exts.indexOf(ext) !== -1) return c;
    }
    return null;
  }

  // ==================== 字节格式化（原内联实现整体搬移；保留 storage-stats 单源委托链） ====================
  /** B/KB(1 位小数)/MB/GB(2 位小数)；非正数 → '0 B'；__storageStats 在位时单源委托 */
  function fmtBytes(b) {
    try { if (window.__storageStats) return window.__storageStats.formatBytes(b); } catch (e) {}
    if (!b || b < 0) return '0 B';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1073741824) return (b / 1048576).toFixed(2) + ' MB';
    return (b / 1073741824).toFixed(2) + ' GB';
  }

  // ==================== 排序参数化核（原内联 sorted(list) 读闭包 S → 参数化；调用方等值换算） ====================
  /**
   * 三键排序：name（zh-CN localeCompare）/ size / modified；dir 'asc' 升序否则降序。
   * 非变异：slice 后排序（原实现同律，调用方数组零污染）；默认键 modified（原 else 分支）。
   */
  function sortEntries(list, key, dir) {
    var arr = list.slice();
    var mul = dir === 'asc' ? 1 : -1;
    if (key === 'name') arr.sort(function(a, b) { return (a.name || '').localeCompare(b.name || '', 'zh-CN') * mul; });
    else if (key === 'size') arr.sort(function(a, b) { return ((a.size || 0) - (b.size || 0)) * mul; });
    else arr.sort(function(a, b) { return ((a.modified || 0) - (b.modified || 0)) * mul; });
    return arr;
  }

  // ==================== 出口（window 桥；Node 沙箱 / 浏览器双域零崩） ====================
  var core = {
    CATS: CATS,
    parentOf: parentOf,
    baseName: baseName,
    validName: validName,
    extOf: extOf,
    catOf: catOf,
    fmtBytes: fmtBytes,
    sortEntries: sortEntries,
  };
  if (typeof window !== 'undefined') window.__filesCore = core;
})();
