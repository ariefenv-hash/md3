// ==================== ocr-core.js — OCR 文字识别纯函数核（v8.52 #58） ====================
// #12 P1 第三位：Tesseract.js 5（npm 引入全量离线化，nightsky「运行时拼 script 加载
// CDN」反例根除）。纯函数底座：语言 5 档/图片校验/降采样几何/VFS 过滤/进度与状态文案/
// 深链/状态钳制。页面侧 apps/ocr/ 只做接线；本文件零 DOM 依赖（vitest 直测）。
// 环境事实：vendor 14MB —— worker.min.js 0.12MB + SIMD/LSTM wasm core 双件 7.9MB
// （worker-script/browser/getCore.js 目录型 corePath 特性探测自动二选一，文件名硬编码
// 约定不可改）+ best_int 语言包三件 6.3MB（@tesseract.js-data npm 包 4.0.0_best_int 档，
// v5 LSTM_ONLY 默认精度，zlibjs 在 worker 内解压 + IndexedDB 缓存二次免载）。
(function () {
  'use strict';

  var MAX_IMAGE_BYTES = 12 * 1024 * 1024;   // 12MB 上限：本地 File 与 VFS 单图共用
  var MAX_IMAGE_PIXELS = 30 * 1000 * 1000;  // 30MP 解码上限：超巨图 canvas 解码内存防御
  var MAX_LONG_EDGE = 2000;                 // 识别前降采样长边（#58 验收：大图性能纪律）

  // ---------- 语言 5 档（nightsky 设计沿用，#58 执行要点①） ----------
  // langs 字符串直接传 createWorker（v5 '+' 连接多语言，各语言 .traineddata.gz 独立加载）。
  var LANG_MODES = [
    { id: 'chi_sim',     label: '简体中文',  langs: 'chi_sim' },
    { id: 'chi_sim+eng', label: '简中+英文', langs: 'chi_sim+eng' },
    { id: 'chi_tra',     label: '繁体中文',  langs: 'chi_tra' },
    { id: 'chi_tra+eng', label: '繁中+英文', langs: 'chi_tra+eng' },
    { id: 'eng',         label: 'English',   langs: 'eng' },
  ];

  var IMG_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'];

  // ---------- worker 进度状态文案（logger m.status → 中文） ----------
  // 键集 = tesseract.js v5 worker 上报全集（loading tesseract core / initializing
  // tesseract / loading language traineddata / initializing api / recognizing text）。
  // 未知 status 回落原文（前向兼容，不丢字）。
  var STATUS_TEXT = {
    'loading tesseract core': '加载识别内核…',
    'initializing tesseract': '初始化引擎…',
    'loading language traineddata': '加载语言模型…',
    'initializing api': '准备识别接口…',
    'recognizing text': '识别中…',
  };

  // ---------- 文件名/扩展名 ----------
  /** isImageName(name)：IMG_EXTS 不分大小写；点开头隐藏文件不算扩展名（isMidiName 同纪律） */
  function isImageName(name) {
    if (typeof name !== 'string' || !name) return false;
    var dot = name.lastIndexOf('.');
    if (dot <= 0) return false;
    var ext = name.slice(dot + 1).toLowerCase();
    return IMG_EXTS.indexOf(ext) >= 0;
  }

  /** filterImageEntries(entries)：VFS list 结果 → 图片行（path/name/size），按 path 排序。
   *  容错：非数组/缺字段一律过滤；dir 剔除；name 优先回退 path 基名。 */
  function filterImageEntries(entries) {
    if (!Array.isArray(entries)) return [];
    var out = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (!e || typeof e !== 'object') continue;
      if (e.type === 'dir') continue;
      var path = typeof e.path === 'string' ? e.path : '';
      var name = typeof e.name === 'string' ? e.name : (path.split('/').pop() || '');
      var size = typeof e.size === 'number' ? e.size : (e.meta && e.meta.size) || 0;
      if (!path && !name) continue;
      if (!isImageName(name) && !isImageName(path)) continue;
      out.push({ path: path, name: name || path, size: size });
    }
    out.sort(function (a, b) { return a.path < b.path ? -1 : a.path > b.path ? 1 : 0; });
    return out;
  }

  /** validateImage({ name, size })：扩展名 + 字节双门（返回 {ok,error}，不抛错） */
  function validateImage(f) {
    var name = f && typeof f.name === 'string' ? f.name : '';
    var size = f && typeof f.size === 'number' ? f.size : -1;
    if (!name) return { ok: false, error: '缺少文件名' };
    if (!isImageName(name)) return { ok: false, error: '仅支持图片文件（png/jpg/webp/bmp/gif）' };
    if (size < 0) return { ok: false, error: '无法读取文件大小' };
    if (size === 0) return { ok: false, error: '空文件（0 字节）' };
    if (size > MAX_IMAGE_BYTES) return { ok: false, error: '文件过大（' + fmtBytes(size) + ' > 12MB）' };
    return { ok: true };
  }

  // ---------- 降采样几何（#58 执行要点④：长边 2000 再识别） ----------
  /**
   * calcDownscale(w, h, maxLongEdge) → { w, h, scale, scaled } | null
   *  - w/h 合法正数才可算；非法输入 → null（防御位，调用方据此走错误提示）
   *  - 长边 ≤ max：原尺寸直过（scale=1, scaled=false，零重绘零画质损失）
   *  - 超限：等比缩到长边恰好 max（Math.round 取整、短边最少 1px）
   *  - 非整数尺寸向下容错：浮点输入按 Number 语义校验后参与运算
   */
  function calcDownscale(w, h, maxLongEdge) {
    var max = typeof maxLongEdge === 'number' && isFinite(maxLongEdge) && maxLongEdge > 0 ? maxLongEdge : MAX_LONG_EDGE;
    if (typeof w !== 'number' || typeof h !== 'number' || !isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return null;
    var longEdge = Math.max(w, h);
    if (longEdge <= max) return { w: Math.round(w), h: Math.round(h), scale: 1, scaled: false };
    var k = max / longEdge;
    var nw = Math.max(1, Math.round(w * k));
    var nh = Math.max(1, Math.round(h * k));
    return { w: nw, h: nh, scale: k, scaled: true };
  }

  // ---------- 展示格式 ----------
  /** fmtBytes：B/KB/MB 三档（1KB=1024），负数/异常 → '—' */
  function fmtBytes(n) {
    if (typeof n !== 'number' || !isFinite(n) || n < 0) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /** formatProgress(p)：0-1 → '0%'-'100%'（越界钳制/非法 → '0%'，进度条 UI 唯一口径） */
  function formatProgress(p) {
    if (typeof p !== 'number' || !isFinite(p) || p <= 0) return '0%';
    if (p >= 1) return '100%';
    return Math.round(p * 100) + '%';
  }

  /** fmtMs(ms)：识别耗时 → '1.2s'/'830ms'（负数/异常 → '—'） */
  function fmtMs(ms) {
    if (typeof ms !== 'number' || !isFinite(ms) || ms < 0) return '—';
    if (ms < 1000) return Math.round(ms) + 'ms';
    return (ms / 1000).toFixed(1) + 's';
  }

  /** statusLabel(status)：worker logger 状态 → 中文文案；未知 → 原文直显（前向兼容） */
  function statusLabel(status) {
    if (typeof status !== 'string' || !status) return '';
    return STATUS_TEXT[status] || status;
  }

  /** clampZoom(z)：缩放档位钳制（25-400 整数百分比；非法 → 100） */
  function clampZoom(z) {
    var n = typeof z === 'number' && isFinite(z) ? Math.round(z) : NaN;
    if (isNaN(n)) return 100;
    return Math.min(400, Math.max(25, n));
  }

  // ---------- 深链 ----------
  /** parseDeepLink(payload)：'ocr/open' 载荷 → { path }；非法 → null。
   *  path 白名单字符外（控制字符）拒绝；长度 ≤ 512（midi-player 同纪律）。 */
  function parseDeepLink(payload) {
    var path = payload && typeof payload.path === 'string' ? payload.path.trim() : '';
    if (!path || path.length > 512) return null;
    for (var i = 0; i < path.length; i++) {
      var c = path.charCodeAt(i);
      if (c < 0x20 || c === 0x7F) return null;
    }
    return { path: path };
  }

  // ---------- 状态（语言档 + 上次来源记忆） ----------
  /** source 形态：{ type:'file', name:'a.png' } | { type:'vfs', path:'/pictures/a.png' }。
   *  file 型仅记忆文件名（File 对象不可持久化，重载不恢复、仅展示语义）；vfs 型重载可恢复。 */
  function normalizeState(raw) {
    var s = raw && typeof raw === 'object' ? raw : {};
    var out = { lang: LANG_MODES[0].id, last: null };
    var ids = LANG_MODES.map(function (m) { return m.id; });
    out.lang = ids.indexOf(s.lang) >= 0 ? s.lang : LANG_MODES[0].id;
    if (s.last && typeof s.last === 'object') {
      if (s.last.type === 'file' && typeof s.last.name === 'string' && s.last.name.length <= 256) {
        out.last = { type: 'file', name: s.last.name };
      } else if (s.last.type === 'vfs' && typeof s.last.path === 'string' && s.last.path.length <= 512) {
        out.last = { type: 'vfs', path: s.last.path };
      }
    }
    return out;
  }

  var STATE_KEY = 'ios-desktop:ocr-state-v1';
  function loadState() {
    try { return normalizeState(JSON.parse(localStorage.getItem(STATE_KEY))); }
    catch (e) { return normalizeState(null); }
  }
  function saveState(state) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(normalizeState(state))); } catch (e) { /* 存储满静默 */ }
  }

  // ---------- 导出 ----------
  var core = {
    MAX_IMAGE_BYTES: MAX_IMAGE_BYTES,
    MAX_IMAGE_PIXELS: MAX_IMAGE_PIXELS,
    MAX_LONG_EDGE: MAX_LONG_EDGE,
    LANG_MODES: LANG_MODES,
    IMG_EXTS: IMG_EXTS,
    STATUS_TEXT: STATUS_TEXT,
    STATE_KEY: STATE_KEY,
    isImageName: isImageName,
    filterImageEntries: filterImageEntries,
    validateImage: validateImage,
    calcDownscale: calcDownscale,
    fmtBytes: fmtBytes,
    formatProgress: formatProgress,
    fmtMs: fmtMs,
    statusLabel: statusLabel,
    clampZoom: clampZoom,
    parseDeepLink: parseDeepLink,
    normalizeState: normalizeState,
    loadState: loadState,
    saveState: saveState,
  };
  window.__ocrCore = core;
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
})();
