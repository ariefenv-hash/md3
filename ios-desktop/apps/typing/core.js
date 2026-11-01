/* ==================== core.js — 打字练习核（#122 一期 · v9.06） ====================
 * 纯函数 IIFE 双挂载（terminal-core 沙箱直驱范式 / v123/v124 同款）：顶层零副作用，
 * 浏览器挂 window.__typingCore，vitest 经 new Function('window', SRC) 沙箱提取。
 *
 * 指标（nightsky nstypepractise t_eftt 练习指示器对标：逐字比对 + 错字高亮 + 完成度）：
 *   · 逐字比对 —— 位置对位（typed[i] vs target[i]，严格区分大小写），
 *     状态四态 pending/ok/bad/extra（extra=超出目标长度的多打字符，一律记错）
 *   · WPM —— 净速度 = 正确字符数 / 5 / 分钟（标准 5 字符=1 词，净制剔除错字）
 *   · 准确率 —— 正确字符数 / 已打字符数（含 extra），未打键不计
 *   · 分级 —— 工程自定值（Human Benchmark 无打字分级常量可循，留痕非对标物）：
 *     键指如飞 ≥60wpm 且 acc≥97 / 熟练 ≥40 / 入门 ≥25 / 新手
 * 词库来源：英文单词模式复用 #28 word 应用 555 词 CET-4 词库（js/word-core.js
 * __wordCore.WORD_BANK，UI 侧 script 直载）；此处仅提供确定性采样（零随机，stride 选取）。
 */
(function () {
  'use strict';

  /** 逐字比对：返回与 target 等长的状态数组 + 尾部 extra 多打段 */
  function compareChars(target, typed) {
    var out = [];
    var t = String(target == null ? '' : target);
    var y = String(typed == null ? '' : typed);
    for (var i = 0; i < t.length; i++) {
      out.push({ ch: t[i], status: i < y.length ? (y[i] === t[i] ? 'ok' : 'bad') : 'pending' });
    }
    for (var j = t.length; j < y.length; j++) {
      out.push({ ch: y[j], status: 'extra' });
    }
    return out;
  }

  /** 统计：净 WPM / 准确率 / 进度 / 完成态（elapsedMs 由调用方计时） */
  function stats(target, typed, elapsedMs) {
    var t = String(target == null ? '' : target);
    var y = String(typed == null ? '' : typed);
    var correct = 0, wrong = 0, i;
    var n = Math.min(t.length, y.length);
    for (i = 0; i < n; i++) { if (y[i] === t[i]) correct++; else wrong++; }
    var extra = Math.max(0, y.length - t.length);
    var typedAll = y.length;
    var acc = typedAll ? (correct / typedAll) * 100 : 100;
    var minutes = (elapsedMs || 0) / 60000;
    var wpm = (typedAll > 0 && minutes > 0) ? (correct / 5) / minutes : 0;
    var done = y.length >= t.length && t.length > 0;
    var progress = t.length ? Math.min(1, y.length / t.length) : 0;
    return {
      wpm: Math.round(wpm * 10) / 10,
      acc: Math.round(acc * 10) / 10,
      progress: progress,
      correct: correct,
      wrong: wrong + extra,
      extra: extra,
      done: done
    };
  }

  /** 分级（工程自定阈值，见头注留痕） */
  function grade(wpm, acc) {
    if (wpm >= 60 && acc >= 97) return '键指如飞';
    if (wpm >= 40) return '熟练';
    if (wpm >= 25) return '入门';
    return '新手';
  }

  /** 确定性词采样：stride 步进零随机可复现（seed 变更即换组），不放回 */
  function pickWords(bank, n, seed) {
    var src = (bank || []).map(function (e) { return (typeof e === 'string') ? e : e.word; })
      .filter(Boolean);
    if (!src.length || n <= 0) return [];
    var used = {}, out = [], i = 0, k = 0;
    while (out.length < Math.min(n, src.length) && k < src.length * 4) {
      var idx = ((seed || 1) * 7 + i * 13 + k * 31) % src.length;
      if (!used[idx]) { used[idx] = 1; out.push(src[idx]); i++; }
      k++;
    }
    return out;
  }

  /** 内置英文句库（自写，一期英文句子模式题源；全 ASCII、含大小写与标点） */
  var SENTENCES = [
    'The quick brown fox jumps over the lazy dog.',
    'Practice makes perfect, so keep typing every day.',
    'A journey of a thousand miles begins with a single step.',
    'Less is more when you write with care.',
    'The early bird catches the worm, but the second mouse gets the cheese.',
    'Type fast, but type true: accuracy comes first.',
    'Every good key deserves a gentle touch.',
    'Small steps each day beat a big plan someday.',
    'The keyboard is a piano; the words are the music.',
    'Do not count the days; make the days count.',
    'Coffee first, then the morning report.',
    'A calm mind is the best keyboard partner.',
    'Rain or shine, the train of thought moves on.',
    'Read more, write more, fear the blank page less.',
    'The best time to learn was yesterday; the next best is now.',
    'Keep your eyes on the text, not on your hands.'
  ];

  /** 兜底词库（word-core 缺载防御，50 常用词） */
  var FALLBACK_WORDS = ['time', 'year', 'people', 'way', 'day', 'man', 'thing', 'woman', 'life', 'child',
    'world', 'school', 'state', 'family', 'student', 'group', 'country', 'problem', 'hand', 'part',
    'place', 'case', 'week', 'company', 'system', 'program', 'question', 'work', 'government', 'number',
    'night', 'point', 'home', 'water', 'room', 'mother', 'area', 'money', 'story', 'fact',
    'month', 'lot', 'right', 'study', 'book', 'eye', 'job', 'word', 'business', 'issue'];

  window.__typingCore = {
    compareChars: compareChars,
    stats: stats,
    grade: grade,
    pickWords: pickWords,
    SENTENCES: SENTENCES,
    FALLBACK_WORDS: FALLBACK_WORDS
  };
})();
