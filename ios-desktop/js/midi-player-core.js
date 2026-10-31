// ==================== midi-player-core.js — MIDI 播放器纯函数核（v8.51 #56） ====================
// #12 P1 第二位：html-midi-player Web Component（<midi-player> + <midi-visualizer type="piano-roll">）
// 的纯函数底座。页面侧 apps/midi-player/ 只做接线；本文件零 DOM 依赖（vitest 直测）。
// 环境事实：vendor bundle 532KB（magenta shim 别名跳过 tfjs —— core barrel 的
// data/aux_inputs/chords/melodies/audio_utils 五模块静态 import @tensorflow/tfjs，
// 播放器/可视化零使用，纯增量 1.5MB 死重）；无 sound-font 属性 → mm.Player =
// Tone 振荡器合成器，离线可发声（零 CDN 纪律）。
(function () {
  'use strict';

  var MAX_MIDI_BYTES = 5 * 1024 * 1024;   // 5MB 上限：VFS 单文件上限同量级，防解析卡顿
  var MIN_MIDI_BYTES = 14;                // MThd 头最小长度

  // ---------- 内置示例（公有领域曲目，程序化生成 scripts/gen-sample-midis.py） ----------
  // 字节/音符数为 vitest 与 e2e 双锚（gen 脚本 count_notes 扫描口径一致）。
  var SAMPLES = [
    { id: 'ode', name: '欢乐颂', meta: '贝多芬 · Op.125（1824）', file: 'assets/ode-to-joy.mid', bytes: 562, notes: 62 },
    { id: 'twinkle', name: '小星星', meta: '法国民谣 · 1761', file: 'assets/twinkle.mid', bytes: 414, notes: 42 },
  ];

  var STATE_KEY = 'ios-desktop:midi-last-v1';

  // ---------- MIDI 头解析 ----------
  /**
   * parseMidiHeader(buf) → { ok, error?, format?, ntrks?, tpq?, size }
   * 校验 MThd 魔数 + 结构域（format 0-2 / ntrks ≥ 1 / division 非 0）。
   * 任何输入不抛错；SMPTE 时间格式（division 负数位）标记 smpte 供信息栏展示。
   */
  function parseMidiHeader(buf) {
    var size = 0;
    try {
      var u8 = buf instanceof Uint8Array ? buf
        : (buf && buf.buffer) ? new Uint8Array(buf.buffer, buf.byteOffset || 0, buf.byteLength)
        : new Uint8Array(buf || 0);
      size = u8.byteLength;
      if (size < MIN_MIDI_BYTES) return { ok: false, error: '文件过小（' + size + 'B < 14B）', size: size };
      if (!(u8[0] === 0x4D && u8[1] === 0x54 && u8[2] === 0x68 && u8[3] === 0x64)) {
        return { ok: false, error: '缺少 MThd 头（非 MIDI 文件）', size: size };
      }
      var headerLen = (u8[4] << 24) | (u8[5] << 16) | (u8[6] << 8) | u8[7];
      if (headerLen < 6) return { ok: false, error: 'MThd 长度非法（' + headerLen + ' < 6）', size: size };
      var format = (u8[8] << 8) | u8[9];
      var ntrks = (u8[10] << 8) | u8[11];
      var division = (u8[12] << 8) | u8[13];
      if (format > 2) return { ok: false, error: '不支持的 MIDI 格式 ' + format + '（仅 0-2）', size: size };
      if (ntrks < 1) return { ok: false, error: '轨道数为 0', size: size };
      var smpte = !!(division & 0x8000);
      if (!smpte && division === 0) return { ok: false, error: 'division 为 0', size: size };
      return {
        ok: true, size: size, format: format, ntrks: ntrks,
        tpq: smpte ? 0 : division, smpte: smpte,
        headerLen: headerLen,
      };
    } catch (e) {
      return { ok: false, error: '解析异常：' + (e && e.message || e), size: size };
    }
  }

  // ---------- note-on 计数（信息栏「音符数」锚） ----------
  /** scanNoteCount(buf) → 0x9n vel>0 事件数；MThd 不合法 → -1。逐轨 delta 流扫描，
   *  覆盖运行状态（running status）——重复事件可省略 status 字节。 */
  function scanNoteCount(buf) {
    try {
      var u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
      if (u8.byteLength < MIN_MIDI_BYTES) return -1;
      if (!(u8[0] === 0x4D && u8[1] === 0x54 && u8[2] === 0x68 && u8[3] === 0x64)) return -1;
      var headerLen = (u8[4] << 24) | (u8[5] << 16) | (u8[6] << 8) | u8[7];
      var count = 0;
      var i = 8 + headerLen;
      var running = 0;
      while (i < u8.byteLength) {
        if (i + 4 > u8.byteLength) break;
        if (!(u8[i] === 0x4D && u8[i + 1] === 0x54 && u8[i + 2] === 0x72 && u8[i + 3] === 0x6B)) return -1;
        var len = (u8[i + 4] << 24) | (u8[i + 5] << 16) | (u8[i + 6] << 8) | u8[i + 7];
        var end = i + 8 + len;
        var j = i + 8;
        while (j < end && j < u8.byteLength) {
          // delta time vlq
          while (j < end && (u8[j] & 0x80)) j++;
          j++;
          if (j >= end) break;
          var b0 = u8[j];
          if (b0 === 0xFF) {           // meta：type + len(VLQ) + data
            var mlen = 0, mk = j + 2;
            while (mk < end && mk < u8.byteLength && (u8[mk] & 0x80)) { mlen = (mlen << 7) | (u8[mk] & 0x7F); mk++; }
            if (mk < end && mk < u8.byteLength) { mlen = (mlen << 7) | (u8[mk] & 0x7F); mk++; }
            j = mk + mlen;
            running = 0;
          } else if (b0 === 0xF0 || b0 === 0xF7) {   // sysex：len(VLQ) + data
            var slen = 0, k = j + 1;
            while (k < end && (u8[k] & 0x80)) { slen = (slen << 7) | (u8[k] & 0x7F); k++; }
            if (k < end) { slen = (slen << 7) | (u8[k] & 0x7F); k++; }
            j = k + slen;
            running = 0;
          } else if (b0 & 0x80) {      // status byte
            running = b0;
            var hi = b0 & 0xF0;
            if (hi === 0x90) { if (u8[j + 2] > 0) count++; j += 3; }
            else if (hi === 0x80 || hi === 0xA0 || hi === 0xB0 || hi === 0xE0) j += 3;
            else if (hi === 0xC0 || hi === 0xD0) j += 2;
            else j += 1;               // 未知形态保守步进
          } else {                     // running status：沿用上一 status
            var rhi = running & 0xF0;
            if (running && rhi === 0x90) { if (u8[j + 1] > 0) count++; j += 2; }
            else if (running && (rhi === 0x80 || rhi === 0xA0 || rhi === 0xB0 || rhi === 0xE0)) j += 2;
            else if (running && (rhi === 0xC0 || rhi === 0xD0)) j += 1;
            else j += 1;
          }
        }
        i = end;
      }
      return count;
    } catch (e) {
      return -1;
    }
  }

  // ---------- 文件名/扩展名 ----------
  /** isMidiName(name)：.mid/.midi 不分大小写；点开头隐藏文件不算扩展名（detectLang 同纪律） */
  function isMidiName(name) {
    if (typeof name !== 'string' || !name) return false;
    var dot = name.lastIndexOf('.');
    if (dot <= 0) return false;                 // 无点 / 隐藏文件（.mid 起头）
    var ext = name.slice(dot + 1).toLowerCase();
    return ext === 'mid' || ext === 'midi';
  }

  /** filterMidiEntries(entries)：VFS list 结果 → MIDI 文件行（path/name/size），按 path 排序。
   *  容错：非数组/缺字段一律过滤；name 优先回退 path 基名。 */
  function filterMidiEntries(entries) {
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
      if (!isMidiName(name) && !isMidiName(path)) continue;
      out.push({ path: path, name: name || path, size: size });
    }
    out.sort(function (a, b) { return a.path < b.path ? -1 : a.path > b.path ? 1 : 0; });
    return out;
  }

  // ---------- 展示格式 ----------
  /** fmtBytes：B/KB/MB 三档（1KB=1024），负数/异常 → '—' */
  function fmtBytes(n) {
    if (typeof n !== 'number' || !isFinite(n) || n < 0) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /** formatTime(seconds) → m:ss（负数/NaN → 0:00） */
  function formatTime(sec) {
    if (typeof sec !== 'number' || !isFinite(sec) || sec < 0) sec = 0;
    var s = Math.floor(sec);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  // ---------- 深链 ----------
  /** parseDeepLink(payload)：'midi-player/open' 载荷 → { path }；非法 → null。
   *  path 白名单字符外（控制字符）拒绝；长度 ≤ 512。 */
  function parseDeepLink(payload) {
    var path = payload && typeof payload.path === 'string' ? payload.path.trim() : '';
    if (!path || path.length > 512) return null;
    for (var i = 0; i < path.length; i++) {
      var c = path.charCodeAt(i);
      if (c < 0x20 || c === 0x7F) return null;
    }
    return { path: path };
  }

  // ---------- 状态（上次来源记忆） ----------
  /** source 形态：{ type:'sample', id:'ode' } | { type:'vfs', path:'/music/x.mid' } */
  function normalizeState(raw) {
    var s = raw && typeof raw === 'object' ? raw : {};
    var out = { soundfont: false, last: null };
    out.soundfont = s.soundfont === true;
    if (s.last && typeof s.last === 'object') {
      if (s.last.type === 'sample' && typeof s.last.id === 'string' && s.last.id.length <= 64) {
        out.last = { type: 'sample', id: s.last.id };
      } else if (s.last.type === 'vfs' && typeof s.last.path === 'string' && s.last.path.length <= 512) {
        out.last = { type: 'vfs', path: s.last.path };
      }
    }
    return out;
  }
  function loadState() {
    try { return normalizeState(JSON.parse(localStorage.getItem(STATE_KEY))); }
    catch (e) { return normalizeState(null); }
  }
  function saveState(state) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(normalizeState(state))); } catch (e) { /* 存储满静默 */ }
  }

  // ---------- 导出 ----------
  var core = {
    MAX_MIDI_BYTES: MAX_MIDI_BYTES,
    MIN_MIDI_BYTES: MIN_MIDI_BYTES,
    SAMPLES: SAMPLES,
    STATE_KEY: STATE_KEY,
    parseMidiHeader: parseMidiHeader,
    scanNoteCount: scanNoteCount,
    isMidiName: isMidiName,
    filterMidiEntries: filterMidiEntries,
    fmtBytes: fmtBytes,
    formatTime: formatTime,
    parseDeepLink: parseDeepLink,
    normalizeState: normalizeState,
    loadState: loadState,
    saveState: saveState,
  };
  window.__midiPlayerCore = core;
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
})();
