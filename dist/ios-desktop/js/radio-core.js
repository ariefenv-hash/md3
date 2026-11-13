// ==================== radio-core.js — 收音机纯函数核（v8.54 #61） ====================
// #12 P1 第五位：在线电台流播放（radio-browser.info 开源台库 + https 直流）。
// nightsky 双坑根除（#12 P1 报告⑦节实证）：
//   坑一 http 流被 https 站点 mixed content 拦截 → 台库/自定义 URL 一律只收 https；
//   坑二 m3u8 流 Chrome audio 原生不支持（需 hls.js）→ 台库 hls:1/.m3u8 一律剔除，
//        自定义 URL 校验拒绝 m3u8，只放 mp3/aac 直流。
// 本文件 = 纯函数核（vitest 锚），顶层零副作用（stt/ocr-core 九代同款 IIFE）；
// 页面侧 apps/radio/index.html 只做接线（audio 元素 + fetch 状态机 + 重连守卫）。
(function () {
  'use strict';

  // ---------- 常量 ----------
  /** 播放器状态机（页面侧唯一状态来源） */
  var STATES = {
    IDLE: 'idle',             // 待机（未选台/已停止）
    LOADING: 'loading',       // 台库拉取中
    CONNECTING: 'connecting', // 连接/缓冲中
    PLAYING: 'playing',       // 播放中
    ERROR: 'error',           // 出错（重连耗尽/致命/用户取消后残留）
  };

  /**
   * 断流自动重连（退避序列，毫秒）：第 1 次错后 1s、第 2 次 2s、第 3 次 4s，
   * 耗尽即 ERROR 落位（议题验收「断流自动重连（3 次退避）」）。
   */
  var RECONNECT_MAX = 3;
  var RECONNECT_STEPS_MS = [1000, 2000, 4000];

  /** 台库缓存 TTL（议题验收「台库缓存 24h」） */
  var CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  var CACHE_KEY = 'ios-desktop:radio-cache-v1';
  /** 播放偏好持久化键（音量/自动重连开关/上次电台——恢复选中绝不自动出声） */
  var STATE_KEY = 'ios-desktop:radio-state-v1';

  /** radio-browser.info 镜像（免费无 key；首达失败顺延下一个） */
  var API_MIRRORS = [
    'https://de1.api.radio-browser.info',
    'https://de2.api.radio-browser.info',
    'https://fi1.api.radio-browser.info',
  ];
  /** 单镜像 fetch 超时（台库拉取不卡 UI——验收「断网不卡死」） */
  var API_TIMEOUT_MS = 8000;
  /** 拉取池上限（一次请求；过滤后通常 60±台） */
  var API_LIMIT = 200;
  /** 台库展示封顶（防超长列表） */
  var STATIONS_MAX = 60;

  /** audio 原生可播容器白名单（议题：只收 mp3/aac 直流；M3U/未知容器一律不入库） */
  var ALLOWED_CODECS = { 'MP3': true, 'AAC': true, 'AACP': true };

  /** 音量钳制域 */
  var VOLUME_DEFAULT = 0.9;

  /** m3u/m3u8 播放列表文件（audio 原生不可播——坑二闸门） */
  var M3U_RE = /\.m3u8?(?:[?#]|$)/i;

  // ---------- 内置种子台库 ----------
  // radio-browser.info 实拉快照（2026-10-28 de1 镜像 language=chinese 过滤管线产物，
  // 票数降序前 26；https + mp3/aac 直流）。在线目录不可达时的离线兜底，
  // 保证「台库 20+ 中文台」验收不依赖网络（真机联网时在线目录优先）。
  var SEED_STATIONS = [
    { id: '24711f7f', name: '怀集音乐之声', url: 'https://lhttp.qingting.fm/live/4804/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: '835070cd', name: 'CNR-1 中国之声', url: 'https://lhttp.qtfm.cn/live/15318317/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: 'ab0cc7f6', name: '国际新闻', url: 'https://lhttp.qtfm.cn/live/20500172/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: '5b47e763', name: 'JESUS IS LORD Radio', url: 'https://s3.radio.co/s97f38db97/listen', bitrate: 48, codec: 'MP3' },
    { id: '815f20d0', name: '500首华语经典', url: 'https://lhttp.qtfm.cn/live/5022308/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: 'ba8cf3a2', name: '两广之声音乐台', url: 'https://lhttp.qtfm.cn/live/20500149/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: '72fa86ec', name: '雨声轻音乐', url: 'https://stream.zeno.fm/689zc32y4x8uv', bitrate: 128, codec: 'MP3' },
    { id: '0ab8efd5', name: '德云社相声合集', url: 'https://stream.zeno.fm/yqawwmweq8mtv', bitrate: 128, codec: 'MP3' },
    { id: 'f3638a83', name: 'AsiaFM 亚洲粤语台', url: 'https://lhttp.qtfm.cn/live/15318569/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: '3f6d52c1', name: '新闻联播', url: 'https://rfienchinois64k.ice.infomaniak.ch//rfienchinois-64.mp3', bitrate: 64, codec: 'MP3' },
    { id: '288d0219', name: '安徽小说评书广播', url: 'https://lhttp.qtfm.cn/live/1951/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: '9d7f295c', name: 'BBN 中文', url: 'https://streams.radiomast.io/ce298b32-8776-4192-9900-092f44b63e7f', bitrate: 64, codec: 'AAC' },
    { id: '2a196f5e', name: '广东音乐之声', url: 'https://lhttp.qtfm.cn/live/1260/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: '6420a400', name: '广东新闻广播', url: 'https://lhttp.qtfm.cn/live/1254/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: 'e87de336', name: '北京新闻广播', url: 'https://lhttp.qtfm.cn/live/339/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: '85cc79df', name: '故事广播-阿基米德故事会', url: 'https://lhttp.qtfm.cn/live/20500182/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: '1ae419ad', name: '广东股市广播', url: 'https://lhttp.qtfm.cn/live/4847/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: '502c4c90', name: '90.7mixfm', url: 'https://lhttp.qingting.fm/live/15318146/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: '9f746b61', name: 'AsiaFM亚洲经典台', url: 'https://lhttp.qingting.fm/live/5021912/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: '7bd359bf', name: 'Shanghai FM 101 上海动感101', url: 'https://lhttp.qingting.fm/live/274/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: '9fed76be', name: 'AsiaFM亚洲音乐台', url: 'https://lhttp.qingting.fm/live/4581/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: 'a5bffcf2', name: '雨声', url: 'https://stream.zeno.fm/ckptaagp6x8uv', bitrate: 128, codec: 'MP3' },
    { id: '53ec59f3', name: '济南故事广播', url: 'https://lhttp.qtfm.cn/live/1672/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: '446382be', name: 'AsiaFM亚洲天空台', url: 'https://lhttp.qingting.fm/live/20071/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: '6d83cb72', name: '北京交通广播', url: 'https://lhttp.qingting.fm/live/336/64k.mp3', bitrate: 0, codec: 'MP3' },
    { id: 'a6c46e5e', name: '台北古典廣播', url: 'https://stream.zeno.fm/w66d3dp6ynhvv', bitrate: 128, codec: 'MP3' },
  ];

  // ---------- URL 校验（双坑闸门） ----------
  /** 是否 m3u/m3u8 播放列表（坑二：Chrome audio 原生不可播） */
  function isM3uUrl(url) {
    return typeof url === 'string' && M3U_RE.test(url.trim());
  }

  /**
   * 可播流 URL 校验（唯一闸门——台库过滤与自定义输入共用）：
   * 必须 https:// 绝对地址（坑一 mixed content），非 m3u 播放列表（坑二），
   * 无空白/控制字符。http 自定义流给出专项错误文案（errorLabel）。
   * @returns {boolean}
   */
  function isValidStreamUrl(url) {
    if (typeof url !== 'string') return false;
    var u = url.trim();
    if (!u || u.length > 2048) return false;
    if (/[\s\u0000-\u001f]/.test(u)) return false;
    if (u.indexOf('https://') !== 0) return false;
    if (isM3uUrl(u)) return false;
    // 粗校验 host 段存在（https:// 后至少一个非斜杠字符 + 域名段）
    var rest = u.slice(8);
    var slash = rest.indexOf('/');
    var host = slash >= 0 ? rest.slice(0, slash) : rest;
    return !!host && host.indexOf('.') > 0;
  }

  /** http 明文流专项判定（给用户可理解的 mixed content 提示，而非笼统无效） */
  function isPlainHttpUrl(url) {
    return typeof url === 'string' && /^http:\/\//i.test(url.trim());
  }

  // ---------- 台库归一 / 过滤 ----------
  /**
   * radio-browser 条目 → 内部台对象（非法条目 null，绝不抛错）。
   * url 取 url_resolved（跟随重定向后的最终流地址）优先。
   */
  function normalizeStation(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    var name = typeof raw.name === 'string' ? raw.name.trim() : '';
    var url = (typeof raw.url_resolved === 'string' && raw.url_resolved.trim()) ||
              (typeof raw.url === 'string' ? raw.url.trim() : '') || '';
    if (!name || !url) return null;
    if (name.length > 120) name = name.slice(0, 120);
    var bitrate = typeof raw.bitrate === 'number' && isFinite(raw.bitrate) && raw.bitrate > 0
      ? Math.min(999, Math.round(raw.bitrate)) : 0;
    var codec = typeof raw.codec === 'string' ? raw.codec.trim().toUpperCase() : '';
    var votes = typeof raw.votes === 'number' && isFinite(raw.votes) && raw.votes > 0
      ? Math.round(raw.votes) : 0;
    var homepage = typeof raw.homepage === 'string' ? raw.homepage.trim() : '';
    return {
      id: typeof raw.stationuuid === 'string' ? raw.stationuuid : '',
      name: name,
      url: url,
      bitrate: bitrate,
      codec: codec,
      votes: votes,
      homepage: homepage.slice(0, 200),
    };
  }

  /**
   * 台库过滤管线（议题锚：https 流优先 + codec mp3/aac + 避开 m3u8 双坑）：
   * ① normalizeStation 归一 ② https 直流闸门（http/m3u/hls:1/未知容器剔除）
   * ③ 同名同址去重（保留票高者）④ 票数降序 ⑤ 封顶 STATIONS_MAX。
   * 纯函数：输入畸形数组不抛错，返回干净数组。
   */
  function filterStations(list, opts) {
    var o = opts || {};
    var cap = typeof o.max === 'number' && o.max > 0 ? o.max : STATIONS_MAX;
    if (!Array.isArray(list)) return [];
    var byKey = {};
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var s = normalizeStation(list[i]);
      if (!s) continue;
      if (s.url.indexOf('https://') !== 0) continue;      // 坑一：http 明文流剔除
      if (s.codec === 'HLS' || isM3uUrl(s.url)) continue; // 坑二：m3u8 播放列表剔除
      if (s.codec && !ALLOWED_CODECS[s.codec]) continue;  // 未知容器（UNKNOWN/FLV/…）剔除
      var key = s.name.toLowerCase() + '\u0000' + s.url;
      if (byKey[key]) {                                   // 去重保留票高者
        if (s.votes > byKey[key].votes) byKey[key] = s;
        continue;
      }
      byKey[key] = s;
      out.push(s);
    }
    out.sort(function (a, b) { return b.votes - a.votes; });
    return out.slice(0, cap);
  }

  /** 台库过滤 + 种子兜底合并（在线/缓存目录 20 台以下时以种子补足，同名种子让位于在线条目） */
  function mergeWithSeed(list, opts) {
    var filtered = filterStations(list, opts);
    if (filtered.length >= 20) return filtered;
    var seen = {};
    filtered.forEach(function (s) { seen[s.name.toLowerCase()] = true; });
    var merged = filtered.slice();
    SEED_STATIONS.forEach(function (s) {
      if (merged.length >= STATIONS_MAX) return;
      if (seen[s.name.toLowerCase()]) return;
      merged.push(s);
    });
    return merged;
  }

  /** 台库 API 请求地址（纯字符串拼装，镜像 + 参数集中一处） */
  function buildApiUrl(mirror) {
    return String(mirror || API_MIRRORS[0]).replace(/\/+$/, '') +
      '/json/stations/search?language=chinese&order=votes&reverse=true&hidebroken=true&limit=' + API_LIMIT;
  }

  // ---------- 缓存（24h TTL） ----------
  /** 写缓存载荷（页面侧持久化唯一口径） */
  function cacheWrite(stations, now) {
    return {
      at: (typeof now === 'number' && isFinite(now) && now >= 0) ? now : Date.now(),
      stations: Array.isArray(stations) ? stations.slice(0, STATIONS_MAX) : [],
    };
  }

  /**
   * 读缓存（新鲜度裁决）：载荷形态完整且未过 TTL → { fresh: true, stations }；
   * 过期/损坏 → { fresh: false, stations: [] }（过期台站仍透传，由页面决定是否兜底展示）。
   */
  function cacheRead(payload, now) {
    var empty = { fresh: false, stations: [] };
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return empty;
    if (!Array.isArray(payload.stations)) return empty;
    if (typeof payload.at !== 'number' || !isFinite(payload.at) || payload.at <= 0) return empty;
    var nowMs = (typeof now === 'number' && isFinite(now)) ? now : Date.now();
    var fresh = (nowMs - payload.at) < CACHE_TTL_MS && nowMs >= payload.at;
    var stations = [];
    for (var i = 0; i < payload.stations.length && stations.length < STATIONS_MAX; i++) {
      var s = normalizeStation(payload.stations[i]);
      if (s) stations.push(s);
    }
    return { fresh: fresh, stations: stations };
  }

  // ---------- 断流自动重连（3 次退避，可关） ----------
  /**
   * 重连裁决（纯函数）：出错时已重连 attempts 次 →
   *   { action: 'retry', attempt, delayMs } | { action: 'give-up' }。
   * autoReconnect=false（用户关闭，议题「重连可关」）或参数畸形一律 give-up。
   */
  function nextReconnect(attempts, autoReconnect) {
    if (autoReconnect !== true) return { action: 'give-up' };
    var n = (typeof attempts === 'number' && isFinite(attempts) && attempts >= 0)
      ? Math.floor(attempts) : 0;
    if (n >= RECONNECT_MAX) return { action: 'give-up' };
    return {
      action: 'retry',
      attempt: n + 1,
      delayMs: RECONNECT_STEPS_MS[n] || RECONNECT_STEPS_MS[RECONNECT_STEPS_MS.length - 1],
    };
  }

  // ---------- 展示格式化 ----------
  /** 码率展示：0/非法 → '—'（radio-browser 大量 0 码率条目，不误导为 0kbps） */
  function fmtBitrate(kbps) {
    return (typeof kbps === 'number' && isFinite(kbps) && kbps > 0)
      ? Math.round(kbps) + ' kbps' : '—';
  }

  /** 容器/码率元信息行：'MP3 · 128 kbps' / 'MP3'（无码率时不带哑元） */
  function fmtMeta(codec, kbps) {
    var c = typeof codec === 'string' && codec ? codec : '';
    var b = fmtBitrate(kbps);
    if (c && b !== '—') return c + ' · ' + b;
    if (c) return c;
    return b;
  }

  /** 状态机 → 徽章文案（页面侧渲染唯一来源） */
  function statusLabel(state) {
    switch (state) {
      case STATES.LOADING: return '台库加载中…';
      case STATES.CONNECTING: return '缓冲中…';
      case STATES.PLAYING: return '播放中';
      case STATES.ERROR: return '播放出错';
      default: return '待机';
    }
  }

  /** 流错误 → 中文提示（audio MediaError.code 全枚举 + 自定义码 + 未知前向兼容） */
  var ERROR_LABELS = {
    'http': '流地址不可达（服务器拒绝或 404）',
    'network': '网络异常——断流自动重连已就绪',
    'decode': '流编码不受支持（非 mp3/aac 直流）',
    'src-not-supported': '流格式不受此浏览器支持',
    'mixed-content': 'http 明文流被浏览器拦截（mixed content）——请改用 https 流',
    'hls': 'm3u8 播放列表流不受支持——请改用 mp3/aac 直流',
    'autoplay': '浏览器拦截了自动播放——请再点一次播放',
  };

  function errorLabel(code) {
    if (typeof code === 'string' && ERROR_LABELS[code]) return ERROR_LABELS[code];
    return '播放出错（' + String(code == null ? 'unknown' : code) + '）';
  }

  // ---------- 持久化归一 ----------
  /**
   * 播放偏好归一（损坏 JSON/类型漂移静默降级——stt normalizeState 同款纪律）。
   * last 电台逐字段清洗（url 必须过 isValidStreamUrl 闸门，防被改写的危险持久化）。
   */
  function normalizeState(raw) {
    var out = { volume: VOLUME_DEFAULT, autoReconnect: true, last: null };
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    if (typeof raw.volume === 'number' && isFinite(raw.volume)) {
      out.volume = Math.min(1, Math.max(0, raw.volume));
    }
    if (typeof raw.autoReconnect === 'boolean') out.autoReconnect = raw.autoReconnect;
    if (raw.last && typeof raw.last === 'object' && !Array.isArray(raw.last)) {
      var l = raw.last;
      var name = typeof l.name === 'string' ? l.name.trim().slice(0, 120) : '';
      var url = typeof l.url === 'string' ? l.url.trim() : '';
      if (name && url && isValidStreamUrl(url)) {
        out.last = {
          id: typeof l.id === 'string' ? l.id.slice(0, 64) : '',
          name: name,
          url: url,
          bitrate: (typeof l.bitrate === 'number' && isFinite(l.bitrate) && l.bitrate > 0)
            ? Math.min(999, Math.round(l.bitrate)) : 0,
          codec: (typeof l.codec === 'string' && l.codec) ? l.codec.slice(0, 8).toUpperCase() : '',
          custom: l.custom === true,
        };
      }
    }
    return out;
  }

  // ---------- 深链 ----------
  /**
   * 深链载荷解析（BUS_DELIVER radio/play）。
   * { url } 播放自定义流（过闸门）；{ action:'stop' } 停止。其余 null（不半解析）。
   */
  function parseDeepLink(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    if (payload.action === 'stop') return { action: 'stop' };
    var url = typeof payload.url === 'string' ? payload.url.trim() : '';
    if (!url) return null;
    if (!isValidStreamUrl(url)) {
      return { action: 'play', url: url, valid: false,
               reason: isPlainHttpUrl(url) ? 'mixed-content' : (isM3uUrl(url) ? 'hls' : 'invalid') };
    }
    return { action: 'play', url: url, valid: true, name: typeof payload.name === 'string' ? payload.name.trim().slice(0, 120) : '' };
  }

  // ---------- 导出（IIFE 挂 window.__radioCore） ----------
  var core = {
    STATES: STATES,
    RECONNECT_MAX: RECONNECT_MAX,
    RECONNECT_STEPS_MS: RECONNECT_STEPS_MS,
    CACHE_TTL_MS: CACHE_TTL_MS,
    CACHE_KEY: CACHE_KEY,
    STATE_KEY: STATE_KEY,
    API_MIRRORS: API_MIRRORS,
    API_TIMEOUT_MS: API_TIMEOUT_MS,
    API_LIMIT: API_LIMIT,
    STATIONS_MAX: STATIONS_MAX,
    ALLOWED_CODECS: ALLOWED_CODECS,
    VOLUME_DEFAULT: VOLUME_DEFAULT,
    SEED_STATIONS: SEED_STATIONS,
    ERROR_LABELS: ERROR_LABELS,
    isM3uUrl: isM3uUrl,
    isValidStreamUrl: isValidStreamUrl,
    isPlainHttpUrl: isPlainHttpUrl,
    normalizeStation: normalizeStation,
    filterStations: filterStations,
    mergeWithSeed: mergeWithSeed,
    buildApiUrl: buildApiUrl,
    cacheWrite: cacheWrite,
    cacheRead: cacheRead,
    nextReconnect: nextReconnect,
    fmtBitrate: fmtBitrate,
    fmtMeta: fmtMeta,
    statusLabel: statusLabel,
    errorLabel: errorLabel,
    normalizeState: normalizeState,
    parseDeepLink: parseDeepLink,
  };

  if (typeof window !== 'undefined') window.__radioCore = core;
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
})();
