// ==================== ping-core.js — PING 网络诊断核心纯函数（v8.44 #60） ====================
// 「geek 桌面标配」：浏览器无 ICMP，fetch HEAD no-cors 计时模拟（HTTP TTFB 口径，
// 页面侧明示「非真 RTT」——#60 议题原文锚）。本文件只承载可离线验证的纯逻辑
// （目标校验 / cache-bust 拼接 / 统计计算 / 目标历史），计时与 AbortController
// 生命周期在页面侧接线。
//
// 模式沿袭 fx/word/terminal/piano/bytebeat/python-core（v8.38~v8.43 六代验证）：
//   · 经典脚本 IIFE 挂 window.__pingCore —— 顶层零副作用，node/vitest 直接
//     new Function 沙箱直驱（ESM export 在经典 <script> 下整文件 SyntaxError）；
//   · nightsky 反例勿复制：结果拼接 eval（md3 全链 textContent 防注入）；
//   · localStorage 损坏 JSON / 类型漂移一律静默降级（python_history_v1 同律）。

(function () {
  'use strict';

  // ---------- 存储键与常量（#60 议题验收锚） ----------
  var HISTORY_KEY = 'ping_history_v1';  // 目标历史 [{url, ts}]，最近 8 个
  var MAX_HISTORY = 8;                  // #60 原文「localStorage 最近 8 个」
  var MAX_SAMPLES = 60;                 // 迷你时序图 60 点滚动
  var PING_INTERVAL_MS = 1000;          // 1s 间隔（nightsky 同款节奏，但走 setTimeout 链）
  var TIMEOUT_MS = 5000;                // 单次请求超时（AbortController 兜底）

  // ---------- 结果三态（#60 原文「不可达（或 CORS 拒绝）」两种失败态 + 可达态） ----------
  var OUTCOME = {
    OK: 'ok',                  // opaque 响应：可达（no-cors 下状态码不可读）
    TIMEOUT: 'timeout',        // 超时（>5s 无响应）
    UNREACHABLE: 'unreachable' // 不可达（网络错误或 CORS 拒绝）
  };

  /**
   * normalizeTarget(input) — 输入校验 + 规范化（#60 原文「输入校验」锚）。
   * trim 后空 → null；无协议补 https://；URL 构造失败 → null；
   * 协议仅 http/https；hostname 空 → null。
   * 返回 { url, host }（hash 剥离——ping 目标不需要锚点）或 null。
   */
  function normalizeTarget(input) {
    if (typeof input !== 'string') return null;
    var s = input.trim();
    if (!s) return null;
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) s = 'https://' + s;
    var u;
    try { u = new URL(s); } catch (err) { return null; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (!u.hostname) return null;
    // 主机名严格校验（WHATWG 对 sub-delim 过宽：'https://ht!tp' 也能解析——
    // ping 目标限定 punycode 化后的常规域名/IPv4/IPv6 形态，防呆输入）
    if (!/^(\[[0-9a-fA-F:]+\]|[a-zA-Z0-9.\-]+)(:\d+)?$/.test(u.hostname)) return null;
    return { url: u.origin + u.pathname + u.search, host: u.hostname };
  }

  /**
   * buildPingUrl(url, seq, now) — cache-bust 拼接（#60 原文「+cache-bust 参数」锚）。
   * 保留原 query，追加/覆写 _ping=now-seq；URL 构造失败原样返回（防御）。
   * seq/now 参数化便于测试确定性（now 缺省 Date.now()）。
   */
  function buildPingUrl(url, seq, now) {
    try {
      var u = new URL(url);
      var stamp = (typeof now === 'number' && isFinite(now) ? now : Date.now());
      u.searchParams.set('_ping', String(stamp) + '-' + String(seq >>> 0));
      return u.toString();
    } catch (err) { return url; }
  }

  /**
   * computeStats(samples) — 统计纯函数（#60 验收「vitest 锚（统计计算纯函数）」）。
   * samples: [{ok:boolean, ms:number}]（ok 样本须带合法非负 ms 才计入成功集合）。
   * 返回 { sent, ok, lost, lossRate, min, avg, max, jitter, lastMs }：
   *   · sent 计全部合法样本；lost = sent - ok；lossRate 0~1，sent=0 时全 0；
   *   · min/avg/max 只统计成功样本；
   *   · jitter = 相邻成功样本 TTFB 差绝对值平均（RFC 3550 简化口径），成功样本 <2 时 0。
   * 非法样本（非对象/非布尔 ok）整体跳过不计 sent。
   */
  function computeStats(samples) {
    var sent = 0, ok = 0;
    var okMs = [];
    if (Array.isArray(samples)) {
      for (var i = 0; i < samples.length; i++) {
        var e = samples[i];
        if (!e || typeof e !== 'object') continue;
        if (typeof e.ok !== 'boolean') continue;
        sent++;
        if (e.ok && typeof e.ms === 'number' && isFinite(e.ms) && e.ms >= 0) { ok++; okMs.push(e.ms); }
      }
    }
    var lost = sent - ok;
    var stats = {
      sent: sent, ok: ok, lost: lost,
      lossRate: sent ? lost / sent : 0,
      min: 0, avg: 0, max: 0, jitter: 0, lastMs: 0
    };
    if (!ok) return stats;
    var sum = 0, min = Infinity, max = -Infinity;
    for (var j = 0; j < okMs.length; j++) {
      var m = okMs[j];
      sum += m;
      if (m < min) min = m;
      if (m > max) max = m;
    }
    stats.min = min;
    stats.avg = sum / ok;
    stats.max = max;
    stats.lastMs = okMs[okMs.length - 1];
    if (okMs.length >= 2) {
      var jd = 0;
      for (var k = 1; k < okMs.length; k++) jd += Math.abs(okMs[k] - okMs[k - 1]);
      stats.jitter = jd / (okMs.length - 1);
    }
    return stats;
  }

  /**
   * roundMs(ms) — 展示格式化：<1 显示 '<1'（亚毫秒精度不误导），其余四舍五入整数。
   * 非法输入（非有限数/负数）→ '?'。
   */
  function roundMs(ms) {
    if (typeof ms !== 'number' || !isFinite(ms) || ms < 0) return '?';
    if (ms < 1) return '<1';
    return String(Math.round(ms));
  }

  /**
   * normalizeHistory(raw, max) — 损坏 JSON / 类型漂移静默降级。
   * 非数组 → []；逐条非对象跳过；url 非非空字符串跳过；ts 非有限非负归 0；
   * 超 cap 截尾（保输入序）。max 非法回落 MAX_HISTORY。
   */
  function normalizeHistory(raw, max) {
    var cap = (typeof max === 'number' && isFinite(max) && max > 0) ? Math.floor(max) : MAX_HISTORY;
    if (!Array.isArray(raw)) return [];
    var out = [];
    for (var i = 0; i < raw.length && out.length < cap; i++) {
      var e = raw[i];
      if (!e || typeof e !== 'object') continue;
      var url = typeof e.url === 'string' ? e.url.trim() : '';
      if (!url) continue;
      var ts = (typeof e.ts === 'number' && isFinite(e.ts) && e.ts >= 0) ? e.ts : 0;
      out.push({ url: url, ts: ts });
    }
    return out;
  }

  /**
   * appendHistory(list, url, ts, max) — 同码全位置清理后头插（python-core v8.43
   * 同款语义：头部同码分支不清其余同码的历史缺口已根治——统一「同码无论位置
   * 全清理后头插」）。不 mutate 入参，返回新数组；cap 截尾。
   */
  function appendHistory(list, url, ts, max) {
    var cap = (typeof max === 'number' && isFinite(max) && max > 0) ? Math.floor(max) : MAX_HISTORY;
    var base = Array.isArray(list) ? list : []; // 防非数组入参（null/字符串静默视为空历史）
    var out = [{ url: url, ts: (typeof ts === 'number' && isFinite(ts) && ts >= 0) ? ts : 0 }];
    for (var i = 0; i < base.length && out.length < cap; i++) {
      var e = base[i];
      if (!e || typeof e !== 'object' || typeof e.url !== 'string' || !e.url.trim()) continue;
      if (e.url === url) continue; // 同 url 无论位置全清理（去重 + 提升到首）
      out.push({ url: e.url, ts: (typeof e.ts === 'number' && isFinite(e.ts) && e.ts >= 0) ? e.ts : 0 });
    }
    return out;
  }

  // ---------- 测试出口（唯一挂载点，顶层零其他副作用） ----------
  var core = {
    HISTORY_KEY: HISTORY_KEY,
    MAX_HISTORY: MAX_HISTORY,
    MAX_SAMPLES: MAX_SAMPLES,
    PING_INTERVAL_MS: PING_INTERVAL_MS,
    TIMEOUT_MS: TIMEOUT_MS,
    OUTCOME: OUTCOME,
    normalizeTarget: normalizeTarget,
    buildPingUrl: buildPingUrl,
    computeStats: computeStats,
    roundMs: roundMs,
    normalizeHistory: normalizeHistory,
    appendHistory: appendHistory
  };

  if (typeof window !== 'undefined') window.__pingCore = core;
})();
