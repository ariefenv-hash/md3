// ==================== v839-word-app.test.js — #28 每日单词守护 ====================
//
// #28 执行要点逐条落锚：
//   词库 JSON 内置（CET-4 核心 500 词起步，字段 word/pos/meaning）
//   Web Speech API 双声发音（en-US/en-GB，零音频文件）
//   艾宾浩斯复习队列：今日新词 + 到期复习词；localStorage 进度
//   卡片翻面动画（果冻手感基建）、认识/模糊/不认识三键
//   验收：断网全功能（词库+发音）；进度持久化；复习调度纯函数化可单测
//
// 测试口径：
//   ① 纯函数直驱——import ios-desktop/js/word-core.js（顶层零副作用 node 安全，
//      v8.38 fx-core 同款 new Function 沙箱提取 __wordCore）：词库纪律 / 日键 /
//      normalizeProgress 降级 / buildQueue 确定性 / applyGrade 阶梯 / statsOf
//   ② 源码锚定——IIFE 零 export / 两级上行 / freeze-shim / Web Speech 双声 /
//      三键 / 单一 LS 键 / 翻面动效 / 注册链四件套

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const coreSrc = readFileSync(join(root, 'ios-desktop/js/word-core.js'), 'utf8');
const page = readFileSync(join(root, 'ios-desktop/apps/word/index.html'), 'utf8');
const wrapper = readFileSync(join(root, 'ios-desktop/js/apps/word.js'), 'utf8');
const appsData = readFileSync(join(root, 'ios-desktop/js/apps-data.js'), 'utf8');
const appIcons = readFileSync(join(root, 'ios-desktop/js/app-icons.js'), 'utf8');
const icons = readFileSync(join(root, 'ios-desktop/js/icons.js'), 'utf8');
const storageStats = readFileSync(join(root, 'ios-desktop/js/storage-stats.js'), 'utf8');

// ---------- 沙箱：经典脚本 IIFE 无 export——new Function 注入 stub window 提取 ----------
function loadWordCore() {
  const sandboxWindow = {};
  const fn = new Function('window', `${coreSrc}\n;return window.__wordCore;`);
  return fn(sandboxWindow, undefined);
}

const {
  WORD_BANK, DAILY_NEW, DAILY_REVIEW_CAP, INTERVALS, GRADES,
  dayKeyOf, addDays, emptyProgress, normalizeProgress, buildQueue, applyGrade, statsOf,
} = loadWordCore();

const T = '2026-10-27';

// ==================== ① 纯函数直驱 ====================

describe('#28 内置词库：量与字段纪律（vitest 锚：断网词库数据源）', () => {
  it('CET-4 核心 500 词起步（实际 555）——#28 执行要点原文', () => {
    expect(WORD_BANK.length).toBeGreaterThanOrEqual(500);
    expect(WORD_BANK.length).toBe(555);
  });

  it('字段 word/pos/meaning 全非空 + 词形全库无重复 + 无首尾空白', () => {
    const seen = new Set();
    for (const e of WORD_BANK) {
      expect(typeof e.word, JSON.stringify(e)).toBe('string');
      expect(e.word.length).toBeGreaterThan(0);
      expect(e.word, e.word).toBe(e.word.trim());
      expect(e.pos.length).toBeGreaterThan(0);
      expect(e.meaning.length).toBeGreaterThan(0);
      expect(seen.has(e.word), `重复词: ${e.word}`).toBe(false);
      seen.add(e.word);
    }
  });

  it('词形纯 ASCII 小写字母（CET-4 词表纪律，排除混入词条）', () => {
    for (const e of WORD_BANK) {
      expect(/^[a-z]+$/.test(e.word), e.word).toBe(true);
    }
  });
});

describe('#28 日键与日期推进（纯函数）', () => {
  it('dayKeyOf 本地时区补零日键；月份 0 起（v8.37 三连教训锚定）', () => {
    expect(dayKeyOf(new Date(2026, 9, 26))).toBe('2026-10-26'); // 9 = 十月！
    expect(dayKeyOf(new Date(2026, 0, 3))).toBe('2026-01-03');
    expect(dayKeyOf(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('addDays 跨月/跨年进位 + 负数回退', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-27', -1)).toBe('2026-10-26');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01'); // 平年
  });

  it('艾宾浩斯间隔阶梯 = [1,2,4,7,15,30] 天；三键枚举', () => {
    expect(INTERVALS).toEqual([1, 2, 4, 7, 15, 30]);
    expect(GRADES).toEqual(['know', 'fuzzy', 'unknown']);
    expect(DAILY_NEW).toBe(10);
    expect(DAILY_REVIEW_CAP).toBe(30);
  });
});

describe('#28 normalizeProgress：损坏降级四态（parseCache / reaction_stats_v1 同律）', () => {
  it('null / 损坏 JSON / 非对象 → 全新进度，绝不抛错', () => {
    expect(normalizeProgress(null)).toEqual(emptyProgress());
    expect(normalizeProgress('{oops')).toEqual(emptyProgress());
    expect(normalizeProgress('garbage')).toEqual(emptyProgress());
    expect(normalizeProgress(42)).toEqual(emptyProgress());
    expect(normalizeProgress(undefined)).toEqual(emptyProgress());
  });

  it('字段越界条目丢弃：s 越阶 / due 非日键 / seen 负；合法条目原样保留', () => {
    const raw = JSON.stringify({
      v: 1,
      words: {
        good: { s: 2, due: '2026-10-30', seen: 5, born: '2026-10-20', last: '2026-10-26' },
        badS: { s: 9, due: '2026-10-30', seen: 1 },
        negS: { s: -1, due: '2026-10-30', seen: 1 },
        badDue: { s: 1, due: '2026/10/30', seen: 1 },
        negSeen: { s: 1, due: '2026-10-30', seen: -3 },
        notObj: 'oops',
      },
    });
    const out = normalizeProgress(raw);
    expect(Object.keys(out.words)).toEqual(['good']);
    expect(out.words.good).toEqual({ s: 2, due: '2026-10-30', seen: 5, born: '2026-10-20', last: '2026-10-26' });
    expect(out.v).toBe(1);
  });

  it('log 剪枝：非法日键/非正计数丢弃；>400 天只留最近 400 天', () => {
    const out = normalizeProgress(JSON.stringify({
      log: { '2026-10-26': { n: 3, r: 2 }, 'oops': { n: 5 }, '2026-10-25': { n: 0, r: 0 }, '2026-10-24': 'x' },
    }));
    expect(Object.keys(out.log)).toEqual(['2026-10-26']);
    const big = {};
    for (let i = 0; i < 500; i++) {
      big[`2025-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}-${i}`] = { n: 1, r: 0 };
    }
    // 500 个不同键（含非法四段式日键——被丢弃）+ 合法 400 天边界
    const legit = {};
    for (let i = 0; i < 450; i++) {
      const d = new Date(2025, 0, 1 + i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      legit[k] = { n: 1, r: 0 };
    }
    const out2 = normalizeProgress(JSON.stringify({ log: legit }));
    expect(Object.keys(out2.log).length).toBe(400);
    const keys = Object.keys(out2.log);
    expect(keys[keys.length - 1]).toBe('2026-03-26'); // 2025-01-01 + 449 天
  });
});

describe('#28 buildQueue：今日队列确定性（到期复习优先 + 新词补足）', () => {
  it('空进度 → 前 10 新词按词库序（同日重开稳定）', () => {
    const q = buildQueue(WORD_BANK, emptyProgress(), T);
    expect(q.length).toBe(DAILY_NEW);
    expect(q[0]).toBe('abandon');
    expect(q).toContain('ability');
    const q2 = buildQueue(WORD_BANK, emptyProgress(), T);
    expect(q2).toEqual(q); // 幂等
  });

  it('已学词出队，新词补足配额（bornToday 计入每日上限）', () => {
    let p = emptyProgress();
    applyGrade(p, 'abandon', 'know', T); // bornToday=1, due 明日
    const q = buildQueue(WORD_BANK, p, T);
    expect(q.length).toBe(9);
    expect(q).not.toContain('abandon'); // 明日到期今日不再见
    // 再学一个不认识 → 当日重现 + 配额继续消耗
    applyGrade(p, 'ability', 'unknown', T);
    const q2 = buildQueue(WORD_BANK, p, T);
    expect(q2.length).toBe(9); // 1 due + 8 fresh
    expect(q2[0]).toBe('ability');
    expect(q2).not.toContain('abandon');
    expect(q2).toContain('abnormal'); // 下一个新词按词库序补位
  });

  it('到期复习最逾期优先；同日 tie-break 词形 asc；未到期不入队', () => {
    const p = {
      v: 1,
      words: {
        zeta: { s: 1, due: '2026-10-25', seen: 3, born: null, last: null },
        alpha: { s: 0, due: '2026-10-25', seen: 1, born: null, last: null },
        early: { s: 2, due: '2026-10-20', seen: 2, born: null, last: null },
        future: { s: 1, due: '2026-10-28', seen: 4, born: null, last: null },
      },
      log: {},
    };
    const q = buildQueue(WORD_BANK, p, T);
    expect(q.slice(0, 3)).toEqual(['early', 'alpha', 'zeta']); // 20 < 25 同日 alpha<zeta
    expect(q).not.toContain('future');
  });

  it('复习封顶 30 + 新词配额独立（双配额并行，总负载 40 封顶）', () => {
    const words = {};
    for (let i = 0; i < 35; i++) {
      words[`w${String(i).padStart(2, '0')}`] = { s: 0, due: '2026-10-2' + (i % 8), seen: 2, born: null, last: null };
    }
    const q = buildQueue(WORD_BANK, { v: 1, words, log: {} }, T);
    expect(q.filter((w) => w.startsWith('w')).length).toBe(30); // 积压雪崩裁剪
    expect(q.length).toBe(40); // 30 复习 + 10 新词（双配额并行）
  });

  it('跨日补位：昨日学过的词今日以复习位回归，新词配额不受侵占', () => {
    const p = normalizeProgress(JSON.stringify({
      words: { abandon: { s: 1, due: '2026-10-27', seen: 1, born: '2026-10-26', last: '2026-10-26' } },
      log: { '2026-10-26': { n: 1, r: 0 } },
    }));
    const q = buildQueue(WORD_BANK, p, '2026-10-27');
    expect(q[0]).toBe('abandon'); // 昨日学今日到期 → 复习位
    expect(q.length).toBe(11); // 1 due + 10 fresh（新的一天空额，Anki 同款）
    expect(q.filter((w) => w === 'abandon').length).toBe(1); // 不重复入队
  });
});

describe('#28 applyGrade：三键艾宾浩斯阶梯（vitest 锚：复习调度纯函数）', () => {
  it('认识 → 走满级阶梯 1→2→4→7→15→30 天并封顶', () => {
    let p = emptyProgress();
    const seq = ['2026-10-28', '2026-10-30', '2026-11-03', '2026-11-10', '2026-11-25', '2026-12-25'];
    applyGrade(p, 'abandon', 'know', T);
    expect(p.words.abandon.s).toBe(1);
    expect(p.words.abandon.due).toBe('2026-10-28');
    for (let i = 0; i < seq.length - 1; i++) {
      applyGrade(p, 'abandon', 'know', seq[i]);
    }
    expect(p.words.abandon.s).toBe(5); // 封顶
    expect(p.words.abandon.due).toBe('2026-12-25'); // 30 天档
    // 继续认识维持 30 天档
    applyGrade(p, 'abandon', 'know', '2026-12-25');
    expect(p.words.abandon.s).toBe(5);
    expect(p.words.abandon.due).toBe('2027-01-24'); // 2026-12-25 + 30
  });

  it('模糊 → 阶不动明晨复检；不认识 → 阶归零当日重现', () => {
    let p = emptyProgress();
    applyGrade(p, 'abandon', 'know', T); // s=1
    applyGrade(p, 'abandon', 'fuzzy', '2026-10-28');
    expect(p.words.abandon.s).toBe(1); // 阶不动
    expect(p.words.abandon.due).toBe('2026-10-29'); // +1 天
    applyGrade(p, 'abandon', 'unknown', '2026-10-29');
    expect(p.words.abandon.s).toBe(0); // 阶归零
    expect(p.words.abandon.due).toBe('2026-10-29'); // 当日重现
    expect(buildQueue(WORD_BANK, p, '2026-10-29')).toContain('abandon');
  });

  it('非法 grade 防御降级为 fuzzy；seen/last 计账；log 新旧词分账 n/r', () => {
    let p = emptyProgress();
    applyGrade(p, 'abandon', 'hack', T); // 非法 → fuzzy
    expect(p.words.abandon.due).toBe('2026-10-28'); // +1 天
    expect(p.words.abandon.seen).toBe(1);
    expect(p.log[T].n).toBe(1);
    expect(p.log[T].r).toBe(0); // 新词首评算新学
    applyGrade(p, 'abandon', 'know', '2026-10-28');
    expect(p.log['2026-10-28'].r).toBe(1); // 复习算 r
    expect(p.log['2026-10-28'].n).toBe(0); // 对象字面量建账 n 归零
  });
});

describe('#28 statsOf：统计与连续打卡', () => {
  it('learned/dueToday/mastered 全对', () => {
    const p = {
      v: 1,
      words: {
        a: { s: 5, due: '2026-11-20', seen: 6, born: null, last: null },  // mastered
        b: { s: 1, due: T, seen: 2, born: null, last: null },             // dueToday
        c: { s: 0, due: '2026-10-26', seen: 1, born: null, last: null },  // dueToday(逾期)
        d: { s: 1, due: '2026-11-01', seen: 2, born: null, last: null },  // 未到期
      },
      log: {},
    };
    const s = statsOf(p, T);
    expect(s.learned).toBe(4);
    expect(s.dueToday).toBe(2);
    expect(s.mastered).toBe(1);
  });

  it('连续打卡：今日未学不断签（从昨日回溯）', () => {
    const p = normalizeProgress(JSON.stringify({
      log: {
        '2026-10-25': { n: 3, r: 1 },
        '2026-10-26': { n: 2, r: 0 },
      },
    }));
    expect(statsOf(p, '2026-10-27').streak).toBe(2);
    expect(statsOf(p, '2026-10-26').streak).toBe(2);
    // 断签：跳过一天
    const p2 = normalizeProgress(JSON.stringify({
      log: { '2026-10-24': { n: 1, r: 0 }, '2026-10-26': { n: 1, r: 0 } },
    }));
    expect(statsOf(p2, '2026-10-27').streak).toBe(1);
    // 空日志
    expect(statsOf(emptyProgress(), T).streak).toBe(0);
  });
});

// ==================== ② 源码锚定 ====================

describe('#28 源码锚定：工程纪律与注册链', () => {
  it('word-core.js：IIFE 零 export（经典 <script> 纪律）+ 顶层零 DOM/localStorage 调用', () => {
    expect(coreSrc).not.toMatch(/^\s*export\s/m);
    expect(coreSrc).toMatch(/window\.__wordCore/);
    expect(coreSrc).not.toMatch(/document\./);
    expect(coreSrc).not.toMatch(/localStorage\s*[.\[]/); // 注释提发不算，禁止实际调用
  });

  it('页面工程纪律：freeze-shim + md3-tokens + 两级上行引核心 + 纯离线零 fetch/eval/音频文件', () => {
    expect(page).toContain('freeze-shim.js');
    expect(page).toContain('../_shared/md3-tokens.css');
    expect(page).toContain('src="../../js/word-core.js"'); // v8.38 教训：iframe 相对路径两级上行
    expect(page).not.toMatch(/eval\(/);
    expect(page).not.toMatch(/fetch\(/);
    expect(page).not.toMatch(/\.mp3|\.wav|\.ogg/); // Web Speech 零音频文件
  });

  it('Web Speech 双声发音：en-US/en-GB chip + speechSynthesis 通道', () => {
    expect(page).toMatch(/speechSynthesis/);
    expect(page).toMatch(/SpeechSynthesisUtterance/);
    expect(page).toContain("data-lang=\"en-US\"");
    expect(page).toContain("data-lang=\"en-GB\"");
    expect(page).toMatch(/u\.lang = lang/);
  });

  it('三键 + 翻面动效 + 单一 LS 键', () => {
    expect(page).toContain('认识');
    expect(page).toContain('模糊');
    expect(page).toContain('不认识');
    expect(page).toMatch(/data-wd-grade="know"/);
    expect(page).toMatch(/data-wd-grade="fuzzy"/);
    expect(page).toMatch(/data-wd-grade="unknown"/);
    expect(page).toMatch(/rotateY\(180deg\)/); // 3D 翻面
    expect(page).toMatch(/@keyframes wd-pop/); // 新卡入场（果冻手感）
    expect(page).toMatch(/cubic-bezier\(\.34,1\.56,\.64,1\)/); // 回弹曲线
    expect(page).toContain("var LS_KEY = 'word_progress_v1'");
    expect((page.match(/localStorage/g) || []).length).toBe(1); // 单点获取（try 内），其余全走 store 单例
  });

  it('注册链四件套：wrapper / apps-data 末位 / 双图标 / storage-stats 归属', () => {
    expect(wrapper).toContain("id: 'word'");
    expect(wrapper).toContain("name: '每日单词'");
    expect(wrapper).toContain("iframeAppContent('apps/word/index.html')");
    expect(appsData).toContain("import word       from './apps/word.js'; // v8.39 #28");
    expect(appIcons).toMatch(/word: `<svg viewBox="0 0 100 100"/);
    expect(appIcons).toContain('v8.39 #28');
    expect(icons).toMatch(/word: `<svg viewBox="0 0 24 24"/);
    expect(storageStats).toContain("['word_progress_v1', 'word']");
  });

  it('缺核防御：__wordCore 缺载不白屏崩链（try/守卫纪律）', () => {
    expect(page).toMatch(/if \(!core \|\| !root\) return/);
  });
});
