/* ==================== lyric-core.js — 歌词打轴核（#121 v9.10 产出 · #180 v9.13 并入 music） ====================
 * v9.13 挂载位变更（#180 整改）：原 apps/lyricmaker/core.js 整体 git mv 至 music 内部模块，
 * 不删一行逻辑；歌词是播放器的附属能力（AOSP 无独立歌词应用），生产端从属于 music。
 * 纯函数 IIFE 双挂载（terminal-core 沙箱直驱范式 / v122-v124 同款）：顶层零副作用，
 * 浏览器挂 window.__lyricCore，vitest 经 new Function('window', SRC) 沙箱提取。
 *
 * 职责（#121：LRC 时间轴编辑 + 逐字对齐 + 导出，nightsky simul/lem.html 生产端对标）：
 *   · parseTime / fmtTime —— "mm:ss.xx"（兼容 .xxx 与 mm:ss）↔ 毫秒；非法返回 null
 *   · parseLrc —— LRC 文本解析：一行多时间标签 / [ti:][ar:][al:][by:][offset:] 元标签 /
 *     未定时行保留（time=null）沉底 / offset 正值=整体提前显示（LRC 社区惯例）
 *   · serializeLrc —— 行级 LRC 导出（时间升序，元标签头，未定时行按原序附尾）
 *   · splitWords —— 行内逐字对齐：[startMs,endMs) 按码点均分（Array.from，生僻字不劈裂）；
 *     最小步长 80ms（工程自定，末行可越界到曲尾，留痕非对标物）
 *   · clampMark —— 打点单调化：新点不得早于前点，快打钳 prev+1ms（防乱序）
 *   · karaokeAt —— 卡拉OK定位：时刻 → 当前行 idx + 逐字高亮进度（末行兜底 4s，工程自定）
 *   · parseEnhancedLrc —— 增强 LRC 解析（#173 v9.49 · 移植 retro-music-player lyrics.js 词级
 *     标签三件套之一）：行内 <mm:ss.xx> 词级标签剥离为每字起始时戳 words[{w,t}]
 *   · estimateWords —— 无词级标签时按字数均分估算（#173 v9.49 · retro lyrics.js estimateWords
 *     同名同语义移植）：纯均分无最小步长，渲染端跨行均匀推进
 *   · exportJson —— md3 逐字 JSON 导出（format:'md3-lyric'，供 #52 逐字歌词引擎消费端）
 * 格式注记（留痕）：LRC 无 RFC 权威，[mm:ss.xx] 行标签与逐字 <mm:ss.xx> 为社区事实标准；
 * md3-lyric JSON 为 md3 自有格式（#52 消费契约 v1）。
 * #173 裁剪留痕：retro lyrics.js 第三件 alignSyllables（MIDI 音符对齐音节）不移植——
 * md3 无 MIDI 音符数据源，硬凑即造无米之炊（诚实裁剪，非能力缺失）。
 */
(function () {
  'use strict';

  /** "mm:ss.xx" | "mm:ss.xxx" | "m:ss" → 毫秒；非法/秒>59 返回 null */
  function parseTime(s) {
    if (s == null) return null;
    var m = /^(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?$/.exec(String(s).trim());
    if (!m) return null;
    var min = parseInt(m[1], 10), sec = parseInt(m[2], 10);
    if (sec > 59) return null;
    var frac = m[3] ? parseInt(m[3], 10) : 0;
    var ms = frac * (m[3] && m[3].length === 3 ? 1 : 10);
    return min * 60000 + sec * 1000 + ms;
  }

  /** 毫秒 → "mm:ss.xx"（分不足 10 补零，超 99 自然进位） */
  function fmtTime(ms) {
    ms = Math.max(0, Math.round(ms));
    var min = Math.floor(ms / 60000);
    var sec = Math.floor((ms % 60000) / 1000);
    var cs = Math.floor((ms % 1000) / 10);
    return (min < 10 ? '0' + min : '' + min) + ':' + (sec < 10 ? '0' + sec : sec) +
      '.' + (cs < 10 ? '0' + cs : cs);
  }

  /** LRC 文本 → 行数组 [{time, text}]；一行多标签展开、元标签消费、未定时行沉底、时间稳定升序 */
  function parseLrc(text) {
    var src = String(text == null ? '' : text);
    var lines = [];
    var offset = 0;
    var rowRe = /\[(\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?)\]/g;
    var metaRe = /^\[(ti|ar|al|by|offset):([^\]]*)\]$/i;
    src.split(/\r\n|\n|\r/).forEach(function (raw) {
      var row = raw.trim();
      if (!row) return;
      var meta = metaRe.exec(row);
      if (meta) {
        if (meta[1].toLowerCase() === 'offset') {
          var v = parseInt(meta[2], 10);
          if (!isNaN(v)) offset = v;
        }
        return;
      }
      var times = [], m2;
      rowRe.lastIndex = 0;
      while ((m2 = rowRe.exec(row))) {
        var t = parseTime(m2[1]);
        if (t != null) times.push(t);
      }
      var textPart = row.replace(rowRe, '').trim();
      if (!times.length) {
        lines.push({ time: null, text: textPart || row });
        return;
      }
      times.forEach(function (t) { lines.push({ time: t, text: textPart }); });
    });
    if (offset) {
      lines.forEach(function (l) { if (l.time != null) l.time = Math.max(0, l.time - offset); });
    }
    var timed = lines.filter(function (l) { return l.time != null; });
    var untimed = lines.filter(function (l) { return l.time == null; });
    timed.sort(function (a, b) { return a.time - b.time; });
    return timed.concat(untimed);
  }

  /** 行数组 → LRC 文本（元标签头可选 {ti,ar,al,by}；定时行升序，未定时行原序附尾） */
  function serializeLrc(lines, meta) {
    var out = [];
    if (meta) {
      ['ti', 'ar', 'al', 'by'].forEach(function (k) {
        if (meta[k]) out.push('[' + k + ':' + meta[k] + ']');
      });
    }
    var arr = (lines || []).slice();
    arr.filter(function (l) { return l.time != null; })
      .sort(function (a, b) { return a.time - b.time; })
      .forEach(function (l) { out.push('[' + fmtTime(l.time) + ']' + l.text); });
    arr.filter(function (l) { return l.time == null; })
      .forEach(function (l) { out.push(l.text); });
    return out.join('\n');
  }

  /** 逐字对齐：[startMs,endMs) 按码点均分 → [{w, t}]（t=字起始 ms；最小步长 80ms 工程自定） */
  function splitWords(text, startMs, endMs) {
    var chars = Array.from(String(text == null ? '' : text));
    if (!chars.length) return [];
    var span = Math.max(0, (endMs == null ? startMs : endMs) - startMs);
    var step = Math.max(span / chars.length, 80);
    return chars.map(function (w, i) {
      return { w: w, t: Math.round(startMs + i * step) };
    });
  }

  /** 打点单调化：新点钳到 max(cur, prev+1)（非负）；prev 为 null 时仅钳非负 */
  function clampMark(curMs, prevMs) {
    var c = Math.round(Number(curMs) || 0);
    c = Math.max(0, c);
    if (prevMs == null) return c;
    return Math.max(c, prevMs + 1);
  }

  /** 卡拉OK定位：tMs → {idx, wordIdx, wordProgress, lineProgress, words, line}
   *  行区间 [time_i, time_{i+1})；开唱前 idx=0 进度 0；末行兜底 4s（工程自定留痕） */
  function karaokeAt(lines, tMs) {
    var timed = (lines || []).filter(function (l) { return l.time != null; });
    var t = Number(tMs) || 0;
    if (!timed.length) return { idx: -1, wordIdx: -1, wordProgress: 0, lineProgress: 0 };
    var idx = -1;
    for (var i = 0; i < timed.length; i++) {
      if (t >= timed[i].time) idx = i; else break;
    }
    if (idx < 0) return { idx: 0, wordIdx: -1, wordProgress: 0, lineProgress: 0 };
    var start = timed[idx].time;
    var end = idx + 1 < timed.length ? timed[idx + 1].time : start + 4000;
    var words = (timed[idx].words && timed[idx].words.length)
      ? timed[idx].words
      : splitWords(timed[idx].text, start, end);
    var lp = end > start ? Math.min(1, (t - start) / (end - start)) : 1;
    var wi = words.length, wp = 1;
    if (t < end) {
      wi = words.length; wp = 0;
      for (var j = 0; j < words.length; j++) {
        var wStart = words[j].t;
        var wEnd = j + 1 < words.length ? words[j + 1].t : end;
        if (t >= wEnd) { wi = j + 1; continue; }
        wi = j;
        wp = t >= wStart ? (wEnd > wStart ? (t - wStart) / (wEnd - wStart) : 1) : 0;
        break;
      }
    }
    return {
      idx: idx,
      wordIdx: Math.min(Math.max(0, wi), words.length),
      wordProgress: Math.min(1, Math.max(0, wp)),
      lineProgress: lp,
      words: words,
      line: timed[idx]
    };
  }

  /** 增强 LRC 解析（#173 v9.49 · retro-music-player lyrics.js 词级标签移植）：
   *  行级 [mm:ss.xx] 与 parseLrc 同构；行内 <mm:ss.xx> 语义为「其后文本自此始唱」，
   *  解析为每字起始时戳 words[{w,t}]（毫秒）：
   *    · 引导段（行头到首 <tag>）起始 = 行时间，止 = 首 tag 时间；
   *    · tag 段内多字：段起始已知、段止 = 下 tag 时间（已知则段内均分），末段无下界 →
   *      组内各字共享段起始（忠实反映稀疏标注，karaokeAt 末字以行区间兜底推进，留痕）；
   *    · 乱序防御：word.t 钳 max(前值+1, 行时间)；offset 与行时间同步平移（max(0,…)）。
   *  无词级标签的行 words=[]（渲染端 estimateWords 均分估算）；未定时行 words=[] 沉底。 */
  function parseEnhancedLrc(text) {
    var src = String(text == null ? '' : text);
    var lines = [];
    var offset = 0;
    var rowRe = /\[(\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?)\]/g;
    var wordTagRe = /<(\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?)>/g;
    var metaRe = /^\[(ti|ar|al|by|offset):([^\]]*)\]$/i;
    src.split(/\r\n|\n|\r/).forEach(function (raw) {
      var row = raw.trim();
      if (!row) return;
      var meta = metaRe.exec(row);
      if (meta) {
        if (meta[1].toLowerCase() === 'offset') {
          var v = parseInt(meta[2], 10);
          if (!isNaN(v)) offset = v;
        }
        return;
      }
      var times = [], m2;
      rowRe.lastIndex = 0;
      while ((m2 = rowRe.exec(row))) {
        var t = parseTime(m2[1]);
        if (t != null) times.push(t);
      }
      var body = row.replace(rowRe, '');
      var textPart = body.replace(wordTagRe, '').trim();
      if (!times.length) {
        lines.push({ time: null, text: textPart || row.replace(wordTagRe, '').trim() || row, words: [] });
        return;
      }
      // 词级锚点收集：cleanMap 状态机预计算「body 每字符 → 剥标签后干净文本索引」
      // （-1=标签内部）+ anchors「tag 起始位置 → 其后首字符干净索引」。不用
      // replace(wordTagRe,'') 做 idx 重映射——全局正则的 replace 会把 lastIndex 清零，
      // exec 循环体内调用即死循环（v9.49 首跑 OOM 实录，坑在录）
      var marks = [], m3;
      var cleanMap = new Array(body.length);
      var anchors = {};
      var ci = 0;
      for (var p = 0; p < body.length; p++) {
        if (body.charAt(p) === '<') {
          var close = body.indexOf('>', p);
          if (close > -1 && /^<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>$/.test(body.slice(p, close + 1))) {
            for (var q = p; q <= close; q++) cleanMap[q] = -1;
            anchors[p] = ci;   // 锚点 = 标签后首字符的干净索引（首 tag 前无字亦为 0）
            p = close;
            continue;
          }
        }
        cleanMap[p] = ci++;
      }
      wordTagRe.lastIndex = 0;
      while ((m3 = wordTagRe.exec(body))) {
        var wt = parseTime(m3[1]);
        if (wt != null) marks.push({ idx: anchors[m3.index], t: wt });
      }
      var chars = Array.from(textPart);
      var words = [];
      if (marks.length && chars.length) {
        var lineStart = times[0];
        var segs = [];
        var first = Math.max(marks[0].t, lineStart);
        if (marks[0].idx > 0) segs.push({ start: lineStart, end: first, from: 0, to: marks[0].idx });
        for (var s = 0; s < marks.length; s++) {
          // 乱序防御：段起始钳 max(本 tag 时戳, 前 tag 原始时戳+1, 行时间)。
          // 同刻退化（两 tag 同 ms / 钳制后重合）允许——words 宽零区间由 karaokeAt
          // 消费安全（wEnd ≤ t 继续前移，wp=0），忠实反映标注不二次造时戳
          var segStart = Math.max(marks[s].t, s ? marks[s - 1].t + 1 : lineStart);
          var segEnd = s + 1 < marks.length ? Math.max(marks[s + 1].t, segStart + 1) : null;
          segs.push({ start: segStart, end: segEnd, from: marks[s].idx, to: s + 1 < marks.length ? marks[s + 1].idx : chars.length });
        }
        segs.forEach(function (seg) {
          var n = Math.max(0, seg.to - seg.from);
          if (!n) return;
          var step = seg.end != null && n ? (seg.end - seg.start) / n : 0;
          for (var k = 0; k < n; k++) {
            words.push({ w: chars[seg.from + k], t: Math.round(seg.start + k * step) });
          }
        });
      }
      times.forEach(function (t0) {
        var shift = offset ? Math.max(0, t0 - offset) : t0;
        var wOut = words.map(function (w) {
          return { w: w.w, t: offset ? Math.max(0, w.t - offset) : w.t };
        });
        lines.push({ time: shift, text: textPart, words: wOut });
      });
    });
    // offset 已在行收集时与 words 同步平移（max(0,·)），此处不再二次平移（parseLrc 单点平移
    // 形态不适用：词级时戳必须与行时间同一参照系，双重平移会让行内推进错位）
    var timed = lines.filter(function (l) { return l.time != null; });
    var untimed = lines.filter(function (l) { return l.time == null; });
    timed.sort(function (a, b) { return a.time - b.time; });
    return timed.concat(untimed);
  }

  /** 无词级标签时按字数均分估算（#173 v9.49 · retro lyrics.js estimateWords 同名移植）：
   *  [startMs,endMs) 均分到每字符 → words[{w,t}]。与 splitWords（打轴端，80ms 最小步长
   *  工程自定）的差异：纯均分无下限——渲染端推进要求跨行均匀，短行不因最小步长越界拖尾。 */
  function estimateWords(text, startMs, endMs) {
    var chars = Array.from(String(text == null ? '' : text));
    if (!chars.length) return [];
    var span = Math.max(0, (endMs == null ? startMs : endMs) - startMs);
    var step = chars.length ? span / chars.length : 0;
    return chars.map(function (w, i) {
      return { w: w, t: Math.round(startMs + i * step) };
    });
  }

  /** md3 逐字 JSON 导出（#52 消费契约 v1）：定时行升序，逐字缺省即均分补齐 */
  function exportJson(lines, meta) {
    var timed = (lines || []).filter(function (l) { return l.time != null; })
      .sort(function (a, b) { return a.time - b.time; })
      .map(function (l, i, arr) {
        var end = i + 1 < arr.length ? arr[i + 1].time : l.time + 4000;
        return {
          time: l.time,
          text: l.text,
          words: (l.words && l.words.length) ? l.words : splitWords(l.text, l.time, end)
        };
      });
    return JSON.stringify({ format: 'md3-lyric', version: 1, meta: meta || {}, lines: timed }, null, 1);
  }

  /** 内置演示歌词（自写内容，工程自定留痕非对标物）：预打时间轴 6 行，无音频亦可体验逐字预览 */
  var DEMO = {
    title: '演示 · 星轨',
    lines: [
      { time: 8000, text: '夜色把路灯调成慢镜头' },
      { time: 14000, text: '风翻过第几页的温柔' },
      { time: 20000, text: '你数着星星往南走' },
      { time: 27000, text: '影子跟在身后不回头' },
      { time: 34000, text: '把心事折成一只纸舟' },
      { time: 41000, text: '放进时间的河流慢慢游' }
    ]
  };

  window.__lyricCore = {
    parseTime: parseTime,
    fmtTime: fmtTime,
    parseLrc: parseLrc,
    parseEnhancedLrc: parseEnhancedLrc,
    estimateWords: estimateWords,
    serializeLrc: serializeLrc,
    splitWords: splitWords,
    clampMark: clampMark,
    karaokeAt: karaokeAt,
    exportJson: exportJson,
    DEMO: DEMO
  };
})();
