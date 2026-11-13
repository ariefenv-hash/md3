// ==================== stt-core.js — 语音转文字纯函数核（v8.53 #59） ====================
// #12 P1 第四位：Web Speech API 原生实时听写（SpeechRecognition）。
// 纪律：零第三方 AI 修正（nightsky 反例：pollinations 外发依赖根除）——识别结果
// 只在本地加工，标点用本地停顿时长规则，绝无网络外发。
// 本文件 = 纯函数核（vitest 锚），顶层零副作用（fx/ping/ocr-core 八代同款 IIFE）；
// 页面侧 apps/stt/index.html 只做接线。
(function () {
  'use strict';

  // ---------- 常量 ----------
  /** 会话状态机（页面侧唯一状态来源） */
  var STATES = {
    IDLE: 'idle',               // 待开始
    LISTENING: 'listening',     // 聆听中（recognition 在途）
    DENIED: 'denied',           // 麦克风权限被拒
    UNSUPPORTED: 'unsupported', // 浏览器无 Web Speech
    ERROR: 'error',             // 致命错误（网络/服务不可用）
  };

  /** 语言档白名单（SpeechRecognition.lang 用 BCP-47 tag） */
  var LANGS = [
    { id: 'zh-CN', label: '中文（普通话）', short: '中', comma: '，', period: '。' },
    { id: 'en-US', label: 'English (US)', short: 'EN', comma: ',', period: '.' },
  ];
  var DEFAULT_LANG = 'zh-CN';

  /**
   * 本地标点停顿阈值（产品决策，毫秒）：
   * 语内微顿 <600ms 不打点；600~1399ms 语气停顿 → 逗号；≥1400ms 句读 → 句号。
   * 纯本地时钟比较，零外发。
   */
  var SHORT_PAUSE_MS = 600;
  var LONG_PAUSE_MS = 1400;

  /** localStorage 持久化键（语言档 + 分段转录恢复） */
  var STATE_KEY = 'ios-desktop:stt-state-v1';

  /** 分段卡封顶（防长会话内存无限增长；保留最新 N 段） */
  var SEGMENTS_MAX = 200;

  /** 单段文本长度钳制（超长 final 截断保护） */
  var SEGMENT_TEXT_MAX = 2000;

  /** 句末标点集合（已有句末标点的段不再追加，防双重标点） */
  var SENTENCE_END_RE = /[.。!?！？…；;，,]$/;

  // ---------- 语言档 ----------
  /** 白名单判定（非字符串/未知 id 一律 false） */
  function isLang(lang) {
    if (typeof lang !== 'string') return false;
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].id === lang) return true;
    return false;
  }

  /** 归一化到白名单（非法回落 DEFAULT_LANG）——持久化/深链唯一入口 */
  function resolveLang(raw) {
    return isLang(raw) ? raw : DEFAULT_LANG;
  }

  /** 语言档元数据（comma/period 标点符号取用） */
  function langMeta(lang) {
    var id = resolveLang(lang);
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].id === id) return LANGS[i];
    return LANGS[0];
  }

  // ---------- 能力检测 ----------
  /**
   * Web Speech 能力检测（注入 window 便于测试与独立打开场景）。
   * Chrome 用 webkitSpeechRecognition 前缀，标准 SpeechRecognition 为未来锚。
   */
  function hasSpeechSupport(w) {
    var win = w || (typeof window !== 'undefined' ? window : null);
    if (!win) return false;
    return typeof win.SpeechRecognition === 'function' ||
           typeof win.webkitSpeechRecognition === 'function';
  }

  /** 取识别构造器（无支持返回 null，页面侧不重复判断） */
  function getSpeechCtor(w) {
    var win = w || (typeof window !== 'undefined' ? window : null);
    if (!win) return null;
    if (typeof win.SpeechRecognition === 'function') return win.SpeechRecognition;
    if (typeof win.webkitSpeechRecognition === 'function') return win.webkitSpeechRecognition;
    return null;
  }

  // ---------- 本地标点规则 ----------
  /**
   * 停顿时长 → 标点（本段 before-pause 语义：本段到达距上一段最终结果的间隔）。
   * @returns {string} '' | 逗号 | 句号（非法输入一律 ''，绝不抛错）
   */
  function pauseToPunct(pauseMs, lang, isFirst) {
    if (isFirst) return '';                       // 首段无前导停顿
    if (typeof pauseMs !== 'number' || !isFinite(pauseMs) || pauseMs <= 0) return '';
    var meta = langMeta(lang);
    if (pauseMs >= LONG_PAUSE_MS) return meta.period;
    if (pauseMs >= SHORT_PAUSE_MS) return meta.comma;
    return '';
  }

  /** 文本是否以句末/分读标点收尾（命中则不再追加，防「。。」双标点） */
  function isSentenceEnd(text) {
    return typeof text === 'string' && SENTENCE_END_RE.test(text);
  }

  /**
   * 最终结果 → 分段卡数据（空文本拒绝；text 归一 trim；标点一律先空——
   * 由 withPausePunct 在下一段到达时回写本段尾部，中文听写标点属前段句尾）。
   * @returns {{text,punct,lang,at,conf}|null} null = 该段丢弃（空白/非法）
   */
  function assembleSegment(text, opts) {
    var o = opts || {};
    if (typeof text !== 'string') return null;
    var t = text.trim();
    if (!t) return null;
    if (t.length > SEGMENT_TEXT_MAX) t = t.slice(0, SEGMENT_TEXT_MAX);
    var conf = (typeof o.confidence === 'number' && isFinite(o.confidence) &&
                o.confidence >= 0 && o.confidence <= 1) ? o.confidence : null;
    var at = (typeof o.at === 'number' && isFinite(o.at) && o.at >= 0) ? o.at : 0;
    return { text: t, punct: '', lang: resolveLang(o.lang), at: at, conf: conf };
  }

  /**
   * 停顿回写前段标点（不可变：返回新对象；无变化返回原对象引用）。
   * 语义：本段到达距上段最终结果间隔 pauseMs → 该停顿属上段句尾标点
   * （「今天天气很好 [700ms] 我们出门吧」→「今天天气很好，我们出门吧」）。
   * 上段已句末标点则不追加（防双标点）；pauseMs 非法/≤0 不动。
   */
  function withPausePunct(prevSeg, pauseMs) {
    if (!prevSeg || typeof prevSeg.text !== 'string' || !prevSeg.text) return prevSeg;
    if (typeof pauseMs !== 'number' || !isFinite(pauseMs) || pauseMs <= 0) return prevSeg;
    if (isSentenceEnd(prevSeg.text)) return prevSeg;
    var punct = pauseToPunct(pauseMs, prevSeg.lang, false);
    if (!punct || punct === prevSeg.punct) return prevSeg;
    var next = {};
    for (var k in prevSeg) next[k] = prevSeg[k];
    next.punct = punct;
    return next;
  }

  /** 末段替换（不可变：返回新数组；空数组原样返回新拷贝） */
  function replaceLast(segments, seg) {
    var list = Array.isArray(segments) ? segments.slice() : [];
    if (!list.length || !seg) return list;
    list[list.length - 1] = seg;
    return list;
  }

  /**
   * 分段追加（不可变纪律：返回新数组；封顶 SEGMENTS_MAX 保尾）。
   * 非法段静默丢弃，绝不抛错。
   */
  function appendSegment(segments, seg) {
    var list = Array.isArray(segments) ? segments : [];
    if (!seg || typeof seg.text !== 'string' || !seg.text) return list.slice();
    var next = list.concat([seg]);
    if (next.length > SEGMENTS_MAX) next = next.slice(next.length - SEGMENTS_MAX);
    return next;
  }

  /**
   * 分段卡 → 完整转录文本（复制全部的唯一口径）。
   * 拼接规则：text+punct 直连；英文段与前文之间补空格（中文书写无空格语义）。
   */
  function buildTranscript(segments) {
    if (!Array.isArray(segments)) return '';
    var out = '';
    for (var i = 0; i < segments.length; i++) {
      var s = segments[i];
      if (!s || typeof s.text !== 'string' || !s.text) continue;
      var piece = s.text + (typeof s.punct === 'string' ? s.punct : '');
      if (!out) { out = piece; continue; }
      var lang = typeof s.lang === 'string' ? s.lang : '';
      out += (lang.indexOf('en') === 0 ? ' ' : '') + piece;
    }
    return out;
  }

  // ---------- 展示格式化 ----------
  /** 录音时长 mm:ss（负值/非法回落 00:00；≥100 分钟钳到 99:59） */
  function fmtDur(ms) {
    if (typeof ms !== 'number' || !isFinite(ms) || ms < 0) return '00:00';
    var total = Math.floor(ms / 1000);
    if (total > 99 * 60 + 59) total = 99 * 60 + 59;
    var m = Math.floor(total / 60);
    var s = total % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  /** 置信度 → '92%'（非 0-1 数字回落 ''，不误导） */
  function fmtConfidence(c) {
    return (typeof c === 'number' && isFinite(c) && c >= 0 && c <= 1)
      ? Math.round(c * 100) + '%' : '';
  }

  // ---------- 错误与状态文案 ----------
  /**
   * SpeechRecognitionErrorEvent.error → 中文提示（MDN 全枚举 + 未知码前向兼容）。
   * 提示文案 = 面板 banner 唯一来源。
   */
  var ERROR_LABELS = {
    'no-speech': '未检测到语音，请靠近麦克风再试',
    'network': '识别服务网络异常（Chrome 语音服务需联网，离线环境不可用）',
    'not-allowed': '麦克风权限被拒绝——可在 设置 › 应用权限管理 中开启',
    'service-not-allowed': '语音识别服务被系统拒绝',
    'audio-capture': '未检测到麦克风设备',
    'aborted': '已停止',
    'language-not-supported': '当前语言不被识别服务支持，请换语言档',
  };

  function errorLabel(code) {
    if (typeof code === 'string' && ERROR_LABELS[code]) return ERROR_LABELS[code];
    return '识别出错（' + String(code == null ? 'unknown' : code) + '）';
  }

  /** 状态机 → 徽章文案（页面侧渲染唯一来源） */
  function statusLabel(state) {
    switch (state) {
      case STATES.LISTENING: return '聆听中…';
      case STATES.DENIED: return '无麦克风权限';
      case STATES.UNSUPPORTED: return '浏览器不支持';
      case STATES.ERROR: return '识别出错';
      default: return '待开始';
    }
  }

  /**
   * 意外断流可重启的错误集合（60s 连续听写不断流的关键守卫）：
   * no-speech（静默超时）与 ''（无错误清洁 end——音频抖动等）触发自动重启；
   * 权限/服务/设备类致命错误不重启（防死循环），network 也停（外网依赖不因自旋恢复），
   * aborted 系用户/生命周期主动停止，重启守卫已在 userStop 层拦截。
   */
  var RESTARTABLE_ERRORS = { 'no-speech': true, '': true };

  // ---------- 持久化归一 ----------
  /**
   * 持久化状态归一（损坏 JSON/类型漂移静默降级——ocr normalizeState 同款纪律）。
   * @returns {{lang, segments}} lang 白名单内；segments 逐段白名单清洗 + 封顶
   */
  function normalizeState(raw) {
    var lang = DEFAULT_LANG;
    var segments = [];
    if (raw && typeof raw === 'object') {
      if (isLang(raw.lang)) lang = raw.lang;
      if (Array.isArray(raw.segments)) {
        var arr = raw.segments.slice(-SEGMENTS_MAX);   // 保尾（最新分段），与 appendSegment 同语义
        for (var i = 0; i < arr.length; i++) {
          var s = arr[i];
          if (!s || typeof s !== 'object') continue;
          if (typeof s.text !== 'string' || !s.text) continue;
          var t = s.text.length > SEGMENT_TEXT_MAX ? s.text.slice(0, SEGMENT_TEXT_MAX) : s.text;
          var p = (typeof s.punct === 'string' && (s.punct === '，' || s.punct === '。' ||
                   s.punct === ',' || s.punct === '.')) ? s.punct : '';
          segments.push({
            text: t,
            punct: p,
            lang: resolveLang(s.lang),
            at: (typeof s.at === 'number' && isFinite(s.at) && s.at >= 0) ? s.at : 0,
            conf: (typeof s.conf === 'number' && isFinite(s.conf) && s.conf >= 0 && s.conf <= 1) ? s.conf : null,
          });
        }
      }
    }
    return { lang: lang, segments: segments };
  }

  // ---------- 深链 ----------
  /**
   * 深链载荷解析（BUS_DELIVER stt/start）。
   * @returns {{action:'start', lang}|null} 非对象/未知 action 一律 null（不半解析）
   */
  function parseDeepLink(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    if (payload.action !== undefined && payload.action !== 'start') return null;
    return { action: 'start', lang: resolveLang(payload.lang) };
  }

  // ---------- 导出（IIFE 挂 window.__sttCore） ----------
  var core = {
    STATES: STATES,
    LANGS: LANGS,
    DEFAULT_LANG: DEFAULT_LANG,
    SHORT_PAUSE_MS: SHORT_PAUSE_MS,
    LONG_PAUSE_MS: LONG_PAUSE_MS,
    STATE_KEY: STATE_KEY,
    SEGMENTS_MAX: SEGMENTS_MAX,
    SEGMENT_TEXT_MAX: SEGMENT_TEXT_MAX,
    RESTARTABLE_ERRORS: RESTARTABLE_ERRORS,
    ERROR_LABELS: ERROR_LABELS,
    isLang: isLang,
    resolveLang: resolveLang,
    langMeta: langMeta,
    hasSpeechSupport: hasSpeechSupport,
    getSpeechCtor: getSpeechCtor,
    pauseToPunct: pauseToPunct,
    isSentenceEnd: isSentenceEnd,
    assembleSegment: assembleSegment,
    withPausePunct: withPausePunct,
    replaceLast: replaceLast,
    appendSegment: appendSegment,
    buildTranscript: buildTranscript,
    fmtDur: fmtDur,
    fmtConfidence: fmtConfidence,
    errorLabel: errorLabel,
    statusLabel: statusLabel,
    normalizeState: normalizeState,
    parseDeepLink: parseDeepLink,
  };

  if (typeof window !== 'undefined') window.__sttCore = core;
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
})();
