// ==================== messages-rich-core.js — 信息应用联机房间富媒体 A 层纯函数核（v10.54 #214） ====================
// 议题 #214 三个子需求的 A 层（小载荷，MQTT 直接走）拆为纯函数核，页面只接线（chatbot-core v8.56 同构）：
//   · 正在输入指示器：节流广播（发送侧）+ TTL 自动过期（接收侧），公共代理无在线名单，尽力而为语义；
//   · 已读回执：房间可见即批量回执（防抖合并），断连丢弃（回执无离线补发语义，chat 包才有）；
//   · 引用回复：引用对象截断降级（文本/昵称上限），渲染由页面 escapeHtml 兜底；
//   · 入站规范化：type 白名单 + 字段截断（公共 broker 不可信来源，宁可丢包不放大）。
// 纪律：零 DOM 依赖 / 零网络调用 / 零全局可变状态（除挂载点）；B 层（图片/语音/文件）不在本核——
// 传输路线须先裁决（议题明示），落地前不写半成品代码。
(function () {
  'use strict';

  var LIMITS = {
    TEXT_MAX: 2000,            // chat 正文上限（与页面 handleRoomIncoming 既有截断一致）
    IDS_MAX: 50,               // 单条回执包最多确认的消息数（防公共代理包体放大）
    QUOTE_TEXT_MAX: 120,       // 引用摘要截断（气泡内一行摘要，不承载全文）
    NAME_MAX: 24,              // 昵称/发送者名上限（与房间弹窗 maxlength=16 同族，放宽到 24 容错）
    TYPING_TTL_MS: 4000,       // 正在输入指示器有效期：超时自动消失（无显式停止包）
    TYPING_SEND_INTERVAL_MS: 2200, // 发送侧节流：指示器持续输入期间每 2.2s 至多一包
    READ_DEBOUNCE_MS: 250,     // 回执防抖：连续到达的消息合并为一包
    RESTORED_BANNER_MS: 2600,  // 「已恢复」横幅驻留时长（自动消退）
    TYPING_LABEL_MAX: 2        // 指示器文案最多点名 2 人，其余并入「等 N 人」
  };

  function isStr(v) { return typeof v === 'string'; }

  /** 路由判定：'room:<hash>' 才是联机房间会话（bot:/c-sys 均无联机语义） */
  function isRoomRoute(chatId) {
    return typeof chatId === 'string' && chatId.indexOf('room:') === 0;
  }

  function clipName(name) {
    var s = isStr(name) ? name.trim() : '';
    if (!s) return '';
    return s.slice(0, LIMITS.NAME_MAX);
  }

  /** 正在输入包：room/name 合法才构造（缺 room 或名字为空 → null，宁可不发不发包） */
  function makeTypingPacket(room, name, ts) {
    var r = isStr(room) ? room : '';
    var n = clipName(name);
    if (!r || !n) return null;
    return { type: 'typing', room: r, user: { name: n }, ts: typeof ts === 'number' ? ts : Date.now() };
  }

  /** 发送节流：上次发包距今 ≥ TYPING_SEND_INTERVAL_MS 才允许再发（lastSent=0 视为从未发过，恒放行） */
  function shouldSendTyping(lastSent, now) {
    var last = typeof lastSent === 'number' ? lastSent : 0;
    if (!last) return true;
    var t = typeof now === 'number' ? now : Date.now();
    return t - last >= LIMITS.TYPING_SEND_INTERVAL_MS;
  }

  /** 过期裁剪：丢非法与超 TTL 项，返回 { map, names }（names 按最近活跃降序，供指示器文案点名） */
  function pruneTyping(map, now) {
    var out = {};
    var names = [];
    var t = typeof now === 'number' ? now : Date.now();
    if (map && typeof map === 'object') {
      Object.keys(map).forEach(function (k) {
        var ts = map[k];
        if (!isStr(k) || !k || typeof ts !== 'number' || !isFinite(ts)) return;
        if (t - ts > LIMITS.TYPING_TTL_MS) return;
        out[k] = ts;
        names.push({ name: k, ts: ts });
      });
    }
    names.sort(function (a, b) { return b.ts - a.ts; });
    return { map: out, names: names.map(function (x) { return x.name; }) };
  }

  /** 指示器文案：0 人空串；1~2 人逐个点名；更多并入「等 N 人」（N = 总人数，含已点名者） */
  function typingLabel(names) {
    if (!Array.isArray(names) || !names.length) return '';
    var safe = names.filter(isStr).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 6);
    if (!safe.length) return '';
    if (safe.length === 1) return safe[0] + ' 正在输入…';
    var shown = safe.slice(0, LIMITS.TYPING_LABEL_MAX);
    var rest = safe.length - shown.length;
    var head = shown.join('、');
    if (rest > 0) return head + ' 等 ' + safe.length + ' 人正在输入…';
    return head + ' 正在输入…';
  }

  /** 已读回执包：ids 去重截断（>IDS_MAX 丢弃超出部分），room/name/ids 任一非法 → null */
  function makeReadPacket(room, name, ids, ts) {
    var r = isStr(room) ? room : '';
    var n = clipName(name);
    if (!r || !n || !Array.isArray(ids)) return null;
    var seen = {};
    var out = [];
    for (var i = 0; i < ids.length && out.length < LIMITS.IDS_MAX; i++) {
      var id = ids[i];
      if (!isStr(id) || !id || seen[id]) continue;
      seen[id] = 1;
      out.push(id);
    }
    if (!out.length) return null;
    return { type: 'read', room: r, ids: out, user: { name: n }, ts: typeof ts === 'number' ? ts : Date.now() };
  }

  /** 回执落账：仅 self 且 id 命中且未读的条目置 read，其余原样（不可变风格，返回新数组） */
  function applyReads(list, ids) {
    var mark = {};
    if (Array.isArray(ids)) {
      ids.forEach(function (id) { if (isStr(id) && id) mark[id] = 1; });
    }
    var changed = false;
    var messages = (Array.isArray(list) ? list : []).map(function (m) {
      if (!m || typeof m !== 'object') return m;
      if (!m.self || !mark[m.id] || m.read) return m;
      changed = true;
      var copy = {};
      Object.keys(m).forEach(function (k) { copy[k] = m[k]; });
      copy.read = true;
      return copy;
    });
    return { changed: changed, messages: messages };
  }

  /** 引用对象构造（发送侧）：文本/昵称截断，id 必须非空 */
  function makeQuote(id, text, name) {
    if (!isStr(id) || !id) return null;
    var t = isStr(text) ? text.slice(0, LIMITS.QUOTE_TEXT_MAX) : '';
    if (!t.trim()) return null;
    return { id: id, text: t, name: clipName(name) };
  }

  /** 引用对象规范化（接收侧）：公共来源不可信，缺字段/超限一律降级（全空 → null 丢弃） */
  function normalizeQuote(q) {
    if (!q || typeof q !== 'object') return null;
    var id = isStr(q.id) ? q.id.slice(0, 64) : '';
    var text = isStr(q.text) ? q.text.slice(0, LIMITS.QUOTE_TEXT_MAX) : '';
    var name = clipName(q.name);
    if (!text.trim()) return null;
    return { id: id, text: text, name: name };
  }

  /**
   * 入站包规范化：type 白名单（chat/typing/read/sys）+ 字段截断。
   * 返回 { kind, room, text, name, ids, ts }，kind=null 表示整包丢弃（未知类型/缺 room）。
   * chat 包 text 截断到 TEXT_MAX；read 包 ids 过滤非字符串并截断；user 仅取 name（不透传对象）。
   */
  function normalizeRichIncoming(msg) {
    if (!msg || typeof msg !== 'object') return { kind: null };
    var type = msg.type;
    var room = isStr(msg.room) ? msg.room : '';
    if (!room || (type !== 'chat' && type !== 'typing' && type !== 'read' && type !== 'sys')) {
      return { kind: null };
    }
    var user = (msg.user && typeof msg.user === 'object') ? msg.user : {};
    var name = clipName(user.name);
    var ts = typeof msg.ts === 'number' && isFinite(msg.ts) ? msg.ts : 0;
    var out = { kind: type, room: room, text: '', name: name, ids: null, ts: ts };
    if (type === 'chat' || type === 'sys') {
      out.text = isStr(msg.text) ? msg.text.slice(0, LIMITS.TEXT_MAX) : '';
    }
    if (type === 'read') {
      var seen = {};
      var ids = [];
      if (Array.isArray(msg.ids)) {
        for (var i = 0; i < msg.ids.length && ids.length < LIMITS.IDS_MAX; i++) {
          var id = msg.ids[i];
          if (!isStr(id) || !id || seen[id]) continue;
          seen[id] = 1;
          ids.push(id);
        }
      }
      out.ids = ids;
    }
    return out;
  }

  var core = {
    LIMITS: LIMITS,
    isRoomRoute: isRoomRoute,
    makeTypingPacket: makeTypingPacket,
    shouldSendTyping: shouldSendTyping,
    pruneTyping: pruneTyping,
    typingLabel: typingLabel,
    makeReadPacket: makeReadPacket,
    applyReads: applyReads,
    makeQuote: makeQuote,
    normalizeQuote: normalizeQuote,
    normalizeRichIncoming: normalizeRichIncoming
  };

  if (typeof window !== 'undefined') window.__messagesRichCore = core;
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
})();
