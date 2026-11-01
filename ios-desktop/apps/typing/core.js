/* ==================== core.js — 打字练习核（#122 一期 v9.06 + 二期 v9.07） ====================
 * 纯函数 IIFE 双挂载（terminal-core 沙箱直驱范式 / v123/v124 同款）：顶层零副作用，
 * 浏览器挂 window.__typingCore，vitest 经 new Function('window', SRC) 沙箱提取。
 *
 * 指标（nightsky nstypepractise t_eftt 练习指示器对标：逐字比对 + 错字高亮 + 完成度）：
 *   · 逐字比对 —— 位置对位（typed[i] vs target[i]，严格区分大小写），
 *     状态四态 pending/ok/bad/extra（extra=超出目标长度的多打字符，一律记错）；
 *     v9.07 起按 code point 切分（Array.from），生僻字代理对（如 𠮷）不劈裂
 *   · WPM —— 净速度 = 正确字符数 / 5 / 分钟（标准 5 字符=1 词，净制剔除错字）
 *   · 准确率 —— 正确字符数 / 已打字符数（含 extra），未打键不计
 *   · 分级 —— 工程自定值（Human Benchmark 无打字分级常量可循，留痕非对标物）：
 *     键指如飞 ≥60wpm 且 acc≥97 / 熟练 ≥40 / 入门 ≥25 / 新手
 * 词库来源：英文单词模式复用 #28 word 应用 555 词 CET-4 词库（js/word-core.js
 * __wordCore.WORD_BANK，UI 侧 script 直载）；此处仅提供确定性采样（零随机，stride 选取）。
 * v9.07 二期题源（自写，工程自定内容留痕）：中文短句 20 / 文章段落 5 / 符号混打 12 /
 * 生僻字 48 字分六组（全部 BMP 单码位，展示与比对均按 code point）。
 */
(function () {
  'use strict';

  /** 逐字比对：返回与 target 等码点长的状态数组 + 尾部 extra 多打段
   *  （v9.07 起 Array.from 按 code point 切分， astral 生僻字不劈裂） */
  function compareChars(target, typed) {
    var out = [];
    var t = Array.from(String(target == null ? '' : target));
    var y = Array.from(String(typed == null ? '' : typed));
    for (var i = 0; i < t.length; i++) {
      out.push({ ch: t[i], status: i < y.length ? (y[i] === t[i] ? 'ok' : 'bad') : 'pending' });
    }
    for (var j = t.length; j < y.length; j++) {
      out.push({ ch: y[j], status: 'extra' });
    }
    return out;
  }

  /** 统计：净 WPM / 准确率 / 进度 / 完成态（elapsedMs 由调用方计时；code point 口径） */
  function stats(target, typed, elapsedMs) {
    var t = Array.from(String(target == null ? '' : target));
    var y = Array.from(String(typed == null ? '' : typed));
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

  /** ---------- v9.07 二期题源（自写，工程自定内容） ----------
   *  中文短句（20 句，含全角标点，≤30 字） */
  var CN_PHRASES = [
    '千里之行，始于足下。',
    '书山有路勤为径，学海无涯苦作舟。',
    '今天也要好好打字，慢慢来比较快。',
    '滴水穿石，不是力量大，而是功夫深。',
    '一年之计在于春，一日之计在于晨。',
    '少壮不努力，老大徒伤悲。',
    '世上无难事，只怕有心人。',
    '欲速则不达，见小利则大事不成。',
    '路遥知马力，日久见人心。',
    '宝剑锋从磨砺出，梅花香自苦寒来。',
    '不积跬步，无以至千里；不积小流，无以成江海。',
    '工欲善其事，必先利其器。',
    '三人行，必有我师焉。',
    '知之者不如好之者，好之者不如乐之者。',
    '博学之，审问之，慎思之，明辨之，笃行之。',
    '山重水复疑无路，柳暗花明又一村。',
    '纸上得来终觉浅，绝知此事要躬行。',
    '问渠那得清如许？为有源头活水来。',
    '海阔凭鱼跃，天高任鸟飞。',
    '长风破浪会有时，直挂云帆济沧海。'
  ];

  /** 文章段落（5 段，每段 50 码点以上） */
  var CN_PASSAGES = [
    '夜色渐渐深了，城市的灯火却依然明亮。写字楼的窗户里，有人还在修改明天的方案，有人在给远方的家人打电话。街角的面馆冒着热气，老板娘熟练地下一碗阳春面，撒上葱花，递给刚下夜班的出租车司机。',
    '春天来的时候，巷口的那棵老槐树先知道。它的枝头冒出嫩绿的芽，先是零星几点，然后是一整片。楼下的小朋友围着树干捉迷藏，老人们搬出竹椅晒太阳，谁家的猫趴在墙头，眯着眼睛看云慢慢飘过去。',
    '读书的意义，不在于记住每一句话，而在于它悄悄改变你看世界的眼光。你读过的书，走过的路，见过的人，最后都会沉淀成你说话的分寸、做事的底气，和面对困难时不慌不忙的从容。',
    '清晨的菜市场是最有烟火气的地方。露水还没干的青菜，活蹦乱跳的河虾，刚出炉的烧饼，摊主此起彼伏的吆喝声。讨价还价不是计较，而是一种生活的仪式感——最后拎着菜回家的人，脸上都带着平静的笑。',
    '键盘上每一个按键都有它自己的声音，敲得快了像下小雨，敲得慢了像数心跳。打字和写字一样，都是把脑子里的想法搬到纸上的过程，区别只是，一个留下墨迹，一个留下字符的光。'
  ];

  /** 符号混打（12 条：全半角标点/数字/货币/正则样式混排） */
  var SYMBOL_MIX = [
    'Wi-Fi 密码：a1b2#c3D4！（区分大小写）',
    '订单号 #2026-1101·共 3 件，合计 ¥128.50（含税）。',
    '快捷键 Ctrl+C / Ctrl+V，复制粘贴一步到位！',
    '邮箱格式：name@example.com；电话：+86 138-0000-0000。',
    '会议纪要【第 42 期】（周三 14:00）：①复盘 ②排期 ③答疑。',
    '链接：https://example.com/path?q="md3"&page=2&flag=true',
    '表达式：(3 + 5) * 2 - 12 / 4 = 13，心算一下对不对？',
    '标签 <div class="box">　——HTML 转义后是 &lt;div&gt;。',
    '汇率：1 USD ≈ 7.2 CNY；1 EUR ≈ 7.8 CNY（仅供参考）。',
    '进度条：[■■■■□□] 66%……预计剩余 8 分 30 秒。',
    '书名号《三体》、顿号、间隔号·、破折号——都在这一句里！',
    '正则 /^[a-z0-9_-]{3,16}$/ 匹配用户名，试一试？'
  ];

  /** 生僻字（48 字分六组，全部 BMP 单码位，空格分隔） */
  var RARE_GROUPS = [
    '魑 魅 魍 魉 饕 餮 貔 貅',
    '囹 圄 龌 龊 龃 龉 觊 觎',
    '龇 瞋 愆 悛 愣 憬 懵 懈',
    '戕 戮 殛 殇 殪 毖 泯 汩',
    '玦 珏 琮 璋 璇 玑 瑾 璞',
    '耄 耋 皴 皲 盥 磬 罄 縻'
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
    FALLBACK_WORDS: FALLBACK_WORDS,
    CN_PHRASES: CN_PHRASES,
    CN_PASSAGES: CN_PASSAGES,
    SYMBOL_MIX: SYMBOL_MIX,
    RARE_GROUPS: RARE_GROUPS
  };
})();
