// ==================== error-hub.js — #281 全局错误捕获层（根壳统一错误层） ====================
//
// 背景与边界（#281）：#225/#226/#247 这类 P0 的发现全靠实测复现，真实设备上
// 错误发生多少、发生在哪个应用完全不可见（pageerror 计数只存在于 e2e 证据链）。
// 本层给根壳加统一错误汇聚：零后端、零上报服务，本地环形缓冲 + console 面板计数。
//
// 三源汇聚：
//   ① 根壳 window 'error' 事件（capture 阶段，同时覆盖 JS 运行时错误与资源加载错误）
//   ② 根壳 'unhandledrejection'（未接管的 Promise 拒绝）
//   ③ iframe 子应用转发：子应用经注入 SDK 段 postMessage { type:'APP_ERROR', payload }
//      （main.js 注入段挂转发；桌面侧按 e.source 反查 iframe src 推断 app 名）
//
// 铁律边界：
//   - 只 addEventListener 多播，零覆盖：不赋值 window.onerror，不动应用自挂捕获；
//   - 环形缓冲上限 200 条（同指纹去重合并计数，防长会话内存膨胀与 console 刷屏）；
//   - 零外部依赖：经典脚本（非 module），先于 main.js ESM 图谱求值挂载，最早捕获；
//   - 版本号与 SW 天然同源：fetch('../sw.js') 锚定 VERSION 常量赋值行提取
//     （settings.js fillSysVer 先例同律，fix(v7.45) 免疫注释与策略名；#223 占位符
//     → 'dev' 映射；异步就绪后新条目带版本快照，不回填旧条目——快照语义）。
//
// 消费面（本地面板语义，无后端）：
//   window.__md3ErrorHub = {
//     list(): 条目数组（副本）; count(): 总条数（含合并计数）;
//     byApp(): { app: 条数 } 映射; version(): 当前版本串（未知态 'unknown'）;
//     clear(): 清空缓冲
//   }
//   daily-brief/驾驶舱联动（#17/#234）：Actions 环境读不到浏览器态，本卡不接
//   workflow——消费方经 __md3ErrorHub 只读 API 自取，联动面留关联注记不阻塞本卡。
(function () {
  'use strict';
  if (window.__md3ErrorHub) return; // 幂等：重复加载零双挂

  var MAX_ENTRIES = 200;      // 环形缓冲上限
  var MAX_MSG = 500;          // 单条 message 截断（防超长栈串刷爆缓冲）
  var buf = [];               // 条目环形缓冲
  var versionValue = null;    // 版本快照（sw.js 提取就绪后填充）

  // ---------- 纯逻辑（internals 导出供 tests/v281 锚定；运行时零副作用） ----------

  /** 指纹：同 kind|app|message|source|line 合并计数 */
  function fingerprintOf(e) {
    return [e.kind || '-', e.app || '-', e.message || '-', e.source || '-', String(e.line || 0)].join('|');
  }

  /** 从 iframe src 提取应用名（apps/<id>/index.html → <id>；其余形态回退原文） */
  function appFromSrc(src) {
    if (!src) return null;
    var m = String(src).match(/apps\/([A-Za-z0-9_-]+)\//);
    return m ? m[1] : null;
  }

  /** sw.js 源码文本 → 版本串；__SW_VERSION__ 占位符 → 'dev'（#223 同律） */
  function extractVersion(swText) {
    if (!swText) return null;
    var m = String(swText).match(/const VERSION = '([^']+)'/);
    if (!m) return null;
    if (m[1].indexOf('__') === 0) return 'dev'; // 源树未构建态占位 → dev 展示
    return m[1];
  }

  /** e.source（iframe contentWindow）→ app 名；查不到回退 null（调用方定兜底） */
  function resolveAppFromWindow(source) {
    if (!source) return null;
    try {
      var frames = document.querySelectorAll('iframe');
      for (var i = 0; i < frames.length; i++) {
        try { if (frames[i].contentWindow === source) return appFromSrc(frames[i].getAttribute('src')); } catch (e) {}
      }
    } catch (e) { /* 文档态异常静默 */ }
    return null;
  }

  /** 入账（环形上限 + 同指纹合并计数；console.warn 仅首次，重复静默防刷屏） */
  function pushEntry(entry) {
    entry.t = Date.now();
    entry.version = versionValue || 'unknown';
    var fp = fingerprintOf(entry);
    for (var i = 0; i < buf.length; i++) {
      if (fingerprintOf(buf[i]) === fp) {
        buf[i].count = (buf[i].count || 1) + 1;
        buf[i].t = entry.t;
        return buf[i];
      }
    }
    entry.count = 1;
    buf.push(entry);
    if (buf.length > MAX_ENTRIES) buf.splice(0, buf.length - MAX_ENTRIES);
    try {
      console.warn('[md3-error-hub]', entry.app || 'shell', entry.kind + ':', (entry.message || '').slice(0, 160));
    } catch (e) {}
    return entry;
  }

  /** 归一化入参 → 条目（kind 缺省 'error'；message 截断 MAX_MSG） */
  function normalize(kind, message, source, line, col, app) {
    return {
      kind: kind || 'error',
      message: String(message == null ? '' : message).slice(0, MAX_MSG),
      source: String(source || ''),
      line: line || 0,
      col: col || 0,
      app: app || 'shell'
    };
  }

  // ---------- 三源挂载 ----------

  // ①/② 根壳错误（capture：资源错误 target 为元素、JS 错误 target 为 window）
  window.addEventListener('error', function (ev) {
    if (ev && ev.target && ev.target !== window && (ev.target.src || ev.target.href)) {
      pushEntry(normalize('resource', (ev.target.src || ev.target.href), '', 0, 0, 'shell'));
      return;
    }
    pushEntry(normalize('error', ev && ev.message, ev && ev.filename, ev && ev.lineno, ev && ev.colno, 'shell'));
  }, true);
  window.addEventListener('unhandledrejection', function (ev) {
    var r = ev && ev.reason;
    var m = r && (r.message || (typeof r === 'string' ? r : ''));
    pushEntry(normalize('promise', m || String(r || 'unhandled rejection'), '', 0, 0, 'shell'));
  });

  // ③ iframe 转发汇聚（APP_ERROR；main.js 注入段为转发源，此处为唯一根侧接收点）
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || d.type !== 'APP_ERROR' || !d.payload) return;
    var p = d.payload;
    var app = resolveAppFromWindow(ev.source) || 'iframe';
    pushEntry(normalize(p.kind, p.message, p.source, p.line, p.col, app));
  });

  // 版本号：与 SW 天然同源（构建期 package.json → sw.js VERSION；settings.js fillSysVer
  // 先例同律 '../sw.js' 相对根壳文档解析——sw.js 真源在仓库根（源码态 serve 根）
  // / dist 根（构建态），不在 ios-desktop/ 子目录；fetch 404 时 catch 静默维持 unknown）
  try {
    fetch('../sw.js', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      var v = extractVersion(t);
      if (v) versionValue = v;
    }).catch(function () { /* 版本不可用维持 unknown */ });
  } catch (e) {}

  // ---------- 消费 API（只读面板 + 清空；零写零上报） ----------
  window.__md3ErrorHub = {
    list: function () { return buf.slice(); },
    count: function () { return buf.length; },
    byApp: function () {
      var out = {};
      for (var i = 0; i < buf.length; i++) {
        var k = buf[i].app || 'shell';
        out[k] = (out[k] || buf[i].count || 1);
      }
      return out;
    },
    version: function () { return versionValue || 'unknown'; },
    clear: function () { buf.length = 0; }
  };

  // 纯逻辑测试锚（非公开 API 契约；运行时多挂零副作用）
  globalThis.__md3ErrorHubInternals = {
    MAX_ENTRIES: MAX_ENTRIES,
    fingerprintOf: fingerprintOf,
    appFromSrc: appFromSrc,
    extractVersion: extractVersion,
    resolveAppFromWindow: resolveAppFromWindow,
    normalize: normalize,
    pushEntry: pushEntry
  };
})();
