// ==================== piano-core.js — 电子琴核心（v8.41 #57） ====================
//
// 电子琴纯函数核心。经典脚本 IIFE 挂 window.__pianoCore（fx-core/word-core/
// terminal-core 同款模式；ESM export 在经典 <script> 下整文件 SyntaxError，
// 顶层零副作用 —— node/new Function 沙箱直驱安全）。
// 议题 #57 验收锚：频率表/键位映射纯逻辑测试、AWSEDFTGYHUJK 键位、八度切换、
// ADSR 包络、复音上限（快速滑奏/和弦无爆音）、文本曲谱解析。
(function () {
  'use strict';

  // ---------- 十二平均律频率表（A4 = 440 Hz 锚） ----------
  // midi 60 = C4 ≈ 261.6256 Hz；midi 69 = A4 = 440 Hz。
  function noteFrequency(midi) {
    if (typeof midi !== 'number' || !isFinite(midi)) return 0;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  var NOTE_OFFSET = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  /** 音名 → midi（C4 = 60 基准；支持升号 #；非法 → null） */
  function noteToMidi(name) {
    if (typeof name !== 'string') return null;
    var m = /^([A-G])(#?)(-?\d)$/.exec(name.trim().toUpperCase());
    if (!m) return null;
    return (parseInt(m[3], 10) + 1) * 12 + NOTE_OFFSET[m[1]] + (m[2] ? 1 : 0);
  }

  /** midi → 音名（黑键一律升号记法；非法 → null） */
  function midiToNote(midi) {
    if (typeof midi !== 'number' || !isFinite(midi)) return null;
    var n = Math.round(midi);
    return NOTE_NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
  }

  // ---------- 物理键位映射（#57 执行要点原文：AWSEDFTGYHUJK） ----------
  // 标准 DAW 键位（Ableton 同款）：一组八度 13 键 C4..C5 —— 白键 A S D F G H J K，
  // 黑键 W E T Y U，顶键 K 补 C5。
  var KEY_MAP = {
    a: 'C4', w: 'C#4', s: 'D4', e: 'D#4', d: 'E4',
    f: 'F4', t: 'F#4', g: 'G4', y: 'G#4', h: 'A4',
    u: 'A#4', j: 'B4', k: 'C5',
  };

  /** 物理键 → midi；八度移调 shift ∈ [-2, 2]（越界钳制）；非法键 → null */
  function keyToMidi(key, shift) {
    var name = KEY_MAP[key == null ? '' : String(key).toLowerCase()];
    if (!name) return null;
    var s = typeof shift === 'number' && isFinite(shift) ? shift : 0;
    s = Math.max(-2, Math.min(2, Math.round(s)));
    return noteToMidi(name) + 12 * s;
  }

  // ---------- 键盘布局（真钢琴 UI：白键 + 黑键浮层） ----------
  // 白键序列 C D E F G A B；黑键紧贴 C-D、D-E、F-G、G-A、A-B 之间（E、B 后无）。
  // 返回 { whites: [{note, midi, bind}], blacks: [{note, midi, after}] }
  //   bind = 物理键位标签（仅 C4..C5 键位映射覆盖到的键有值）；
  //   after = 黑键左侧白键在 whites 数组中的下标（渲染侧据此定位）。
  function buildKeyboard(baseOctave, octaves) {
    var bo = typeof baseOctave === 'number' && isFinite(baseOctave) ? baseOctave : 4;
    var oc = typeof octaves === 'number' && isFinite(octaves)
      ? Math.max(1, Math.min(3, Math.round(octaves))) : 2;
    var whiteSeq = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    var blackAfter = { 0: 1, 1: 1, 3: 1, 4: 1, 5: 1 }; // 白键下标 0/1/3/4/5 后有黑键
    var keyByMidi = {};
    Object.keys(KEY_MAP).forEach(function (k) {
      keyByMidi[noteToMidi(KEY_MAP[k])] = k.toUpperCase();
    });
    var whites = [];
    var blacks = [];
    for (var i = 0; i < oc; i++) {
      for (var j = 0; j < 7; j++) {
        var note = whiteSeq[j] + (bo + i);
        var midi = noteToMidi(note);
        whites.push({ note: note, midi: midi, bind: keyByMidi[midi] || null });
        if (blackAfter[j]) {
          var bn = whiteSeq[j] + '#' + (bo + i);
          var bmidi = noteToMidi(bn);
          blacks.push({ note: bn, midi: bmidi, after: whites.length - 1, bind: keyByMidi[bmidi] || null });
        }
      }
    }
    return { whites: whites, blacks: blacks };
  }

  // ---------- ADSR 包络（纯计算，页面侧喂给 GainNode） ----------
  // attack 10ms / decay 220ms / sustain 62% / release 280ms
  // （P1 报告建议 attack 10ms decay 200ms 起步 —— 慢 attack 会吃掉打击感）
  var ADSR = { ATTACK: 0.01, DECAY: 0.22, SUSTAIN: 0.62, RELEASE: 0.28 };

  /**
   * 起音段时间线：0.0001 → 1（attack linear）→ sustain（decay linear）。
   * 返回 [{t, v}] 序列，页面按序 linearRampToValueAtTime。
   */
  function attackTimeline(t0) {
    if (typeof t0 !== 'number' || !isFinite(t0)) t0 = 0;
    return [
      { t: t0, v: 0.0001 },
      { t: t0 + ADSR.ATTACK, v: 1 },
      { t: t0 + ADSR.ATTACK + ADSR.DECAY, v: ADSR.SUSTAIN },
    ];
  }

  /** 释音段时间线：sustain → 0.0001（release linear；交互释放页面侧取当前实际值起坡） */
  function releaseTimeline(tOff) {
    if (typeof tOff !== 'number' || !isFinite(tOff)) tOff = 0;
    return [
      { t: tOff, v: ADSR.SUSTAIN },
      { t: tOff + ADSR.RELEASE, v: 0.0001 },
    ];
  }

  // ---------- 复音上限（快速滑奏/和弦无爆音保护） ----------
  // 超限时释放最旧声部 —— 16 复音 ≥ 真钢琴踏板外的实用极限。
  var VOICES_MAX = 16;

  // ---------- 文本曲谱解析（文本 → 音符事件；非法 token 跳过不抛错） ----------
  // 语法：空白分隔 token；`音名[/拍数]`（如 C4、C#4/2）；`R[/拍]` 休止；
  // `-`（或 `-/拍`）延音：前一音符追加拍数。默认每 token 1 拍，拍数钳 (0, 8]。
  function parseScore(text) {
    if (typeof text !== 'string') return [];
    var out = [];
    text.trim().split(/\s+/).forEach(function (tok) {
      if (!tok) return;
      var m = /^([^/]+)(?:\/(\d*\.?\d+))?$/.exec(tok);
      if (!m) return;
      var beats = m[2] ? parseFloat(m[2]) : 1;
      if (!isFinite(beats) || beats <= 0) beats = 1;
      beats = Math.min(8, beats);
      if (m[1] === '-') {
        if (out.length && out[out.length - 1].midi != null) {
          out[out.length - 1].beats += beats;
        }
        return;
      }
      if (/^R$/i.test(m[1])) { out.push({ midi: null, beats: beats }); return; }
      var midi = noteToMidi(m[1]);
      if (midi != null) out.push({ midi: midi, beats: beats });
    });
    return out;
  }

  /** 曲谱排程时间线：bpm → 秒（非法回落 90）；t0 默认 0；休止符占位不发声。 */
  function scoreTimeline(events, bpm, t0) {
    var list = Array.isArray(events) ? events : [];
    var tempo = typeof bpm === 'number' && isFinite(bpm) && bpm > 0 ? bpm : 90;
    var beat = 60 / tempo;
    var t = typeof t0 === 'number' && isFinite(t0) ? t0 : 0;
    var out = [];
    list.forEach(function (e) {
      var dur = (e && e.beats ? e.beats : 1) * beat;
      if (e && e.midi != null) out.push({ midi: e.midi, start: t, end: t + dur });
      t += dur;
    });
    return out;
  }

  window.__pianoCore = {
    noteFrequency: noteFrequency,
    noteToMidi: noteToMidi,
    midiToNote: midiToNote,
    KEY_MAP: KEY_MAP,
    keyToMidi: keyToMidi,
    buildKeyboard: buildKeyboard,
    ADSR: ADSR,
    attackTimeline: attackTimeline,
    releaseTimeline: releaseTimeline,
    VOICES_MAX: VOICES_MAX,
    parseScore: parseScore,
    scoreTimeline: scoreTimeline,
  };
})();
