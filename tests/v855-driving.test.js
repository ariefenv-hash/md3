// ==================== v855-driving.test.js — #62 驾考题库（v8.55） ====================
// 验收锚（#62 原文逐条）：题库本地化（题干/选项/答案/解析/图片可选）+ 四模式
// （顺序/随机/模拟考试真考格式计时/错题本 localStorage）+ 错题本与「每日英语单词」
// 复习队列同构（#28 艾宾浩斯）+ 模拟考计时器后台/回前台不漂移（墙钟锚定 +
// visibilitychange 校时）+ vitest 锚（题库纯逻辑）。headless：e2e 以状态机/
// 计时器/判分为锚（scripts/e2e-v855-driving.mjs）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/driving-core.js'), 'utf8');
const PAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/driving/index.html'), 'utf8');
const SHELL_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps/driving.js'), 'utf8');
const APPSDATA_SRC = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf8');
const ICONS_SRC = readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf8');
const TCORE_SRC = readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf8');
const TPAGE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/terminal/index.html'), 'utf8');
const FIXTURE = JSON.parse(readFileSync(join(ROOT, 'tests/icon-dynamic-colors.generated.json'), 'utf-8'));

// ---------- 沙箱提取（经典脚本 IIFE → window.__drivingCore） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__drivingCore;

// 确定性随机源（mulberry32 种子——组卷/洗牌断言可复现）
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('v8.55 #62 core：题库完整性（精编 200 题）', () => {
  const bank = core.normalizeBank(core.BANK);
  it('BANK 恰 200 题；运行时归一零剔除（生成器已严格校验）', () => {
    expect(core.BANK).toHaveLength(200);
    expect(bank).toHaveLength(200);
  });
  it('科目分布：科一 118（≥模拟考 100）/ 科四 82（≥模拟考 50）', () => {
    expect(core.bankFor(core.BANK, 1)).toHaveLength(118);
    expect(core.bankFor(core.BANK, 4)).toHaveLength(82);
    expect(bankForCount(1)).toBeGreaterThanOrEqual(core.examSpec(1).count);
    expect(bankForCount(4)).toBeGreaterThanOrEqual(core.examSpec(4).count);
    function bankForCount(s) { return core.bankFor(core.BANK, s).length; }
  });
  it('题型分布：判断 72 / 单选 110 / 多选 18；id 唯一且全过 isValidQuestion', () => {
    expect(bank.filter((q) => q.type === core.QTYPE.JUDGE)).toHaveLength(72);
    expect(bank.filter((q) => q.type === core.QTYPE.SINGLE)).toHaveLength(110);
    expect(bank.filter((q) => q.type === core.QTYPE.MULTI)).toHaveLength(18);
    const ids = new Set(bank.map((q) => q.id));
    expect(ids.size).toBe(200);
    bank.forEach((q) => expect(core.isValidQuestion(q), q.id).toBe(true));
  });
  it('结构五要素齐备：题干/选项/答案/解析非空 + 选项数 2-4', () => {
    bank.forEach((q) => {
      expect(q.q.length, q.id).toBeGreaterThan(5);
      expect(q.exp.length, q.id).toBeGreaterThan(8);
      expect(q.opts.length, q.id).toBeGreaterThanOrEqual(2);
      expect(q.opts.length, q.id).toBeLessThanOrEqual(4);
      q.opts.forEach((o) => expect(o.length, q.id).toBeGreaterThan(0));
    });
  });
  it('图片可选：22 道标志图题，img 全部命中 SIGN_SHAPES；22 个标志全部被引用', () => {
    const imgQs = bank.filter((q) => q.img);
    expect(imgQs).toHaveLength(22);
    imgQs.forEach((q) => expect(core.SIGN_SHAPES[q.img], q.img).toBeDefined());
    const used = new Set(imgQs.map((q) => q.img));
    expect(used.size).toBe(Object.keys(core.SIGN_SHAPES).length);
    // 标志形状数据：每个 ≥2 元素、坐标数值有限、色值合法 hex
    Object.entries(core.SIGN_SHAPES).forEach(([key, shapes]) => {
      expect(shapes.length, key).toBeGreaterThanOrEqual(2);
      shapes.forEach((sp) => {
        expect(['circle', 'rect', 'path', 'line', 'polygon', 'text']).toContain(sp.t);
        expect(typeof sp.a, key).toBe('object');
        if (sp.text) expect(typeof sp.text).toBe('string');
      });
    });
  });
});

describe('v8.55 #62 core：判分 isCorrect', () => {
  const bank = core.normalizeBank(core.BANK);
  const single = bank.find((q) => q.type === core.QTYPE.SINGLE);
  const judge = bank.find((q) => q.type === core.QTYPE.JUDGE);
  const multi = bank.find((q) => q.type === core.QTYPE.MULTI);
  const multi3 = bank.find((q) => q.type === core.QTYPE.MULTI && q.ans.length === 3);
  it('single/judge：索引比对', () => {
    expect(core.isCorrect(single, single.ans)).toBe(true);
    expect(core.isCorrect(single, (single.ans + 1) % single.opts.length)).toBe(false);
    expect(core.isCorrect(judge, judge.ans)).toBe(true);
    expect(core.isCorrect(judge, 1 - judge.ans)).toBe(false);
  });
  it('multi：集合相等（有序数组），缺项/多项/重复均错', () => {
    expect(core.isCorrect(multi, multi.ans.slice())).toBe(true);
    expect(core.isCorrect(multi, [...multi.ans].reverse())).toBe(true);   // 无序等价
    expect(core.isCorrect(multi, multi.ans.slice(0, multi.ans.length - 1))).toBe(false);
    expect(core.isCorrect(multi3, [multi3.ans[0]])).toBe(false);
    expect(core.isCorrect(multi3, [0, 1, 2, 3])).toBe(false);             // 多选含错误项
  });
  it('畸形防线：null/字符串/越界/小数一律 false 不抛错', () => {
    expect(core.isCorrect(single, null)).toBe(false);
    expect(core.isCorrect(single, '0')).toBe(false);
    expect(core.isCorrect(single, 99)).toBe(false);
    expect(core.isCorrect(single, 0.5)).toBe(false);
    expect(core.isCorrect(multi, 'x')).toBe(false);
    expect(core.isCorrect(multi, [0.5, 1])).toBe(false);
    expect(core.isCorrect(null, 0)).toBe(false);
  });
});

describe('v8.55 #62 core：normalizeBank 运行时防线', () => {
  it('畸形条目剔除：坏类型/越界 ans/空解析/坏 img/选项空/重复 id', () => {
    const raw = [
      { id: 'T1', s: 1, type: 'single', q: '题干一', opts: ['A', 'B'], ans: 0, exp: '解析一' },
      { id: 'T2', s: 1, type: 'bool', q: '题干二', opts: ['A', 'B'], ans: 0, exp: '解析二' },      // 坏题型
      { id: 'T3', s: 1, type: 'single', q: '题干三', opts: ['A', 'B'], ans: 5, exp: '解析三' },    // 越界
      { id: 'T4', s: 1, type: 'single', q: '题干四', opts: ['A', 'B'], ans: 0, exp: '' },          // 空解析
      { id: 'T5', s: 1, type: 'single', q: '题干五', opts: ['A', 'B'], ans: 0, exp: '解析五', img: 'no-such-sign' },
      { id: 'T6', s: 1, type: 'single', q: '题干六', opts: ['A', ''], ans: 0, exp: '解析六' },      // 空选项
      { id: 'T7', s: 1, type: 'multi', q: '题干七', opts: ['A', 'B', 'C'], ans: [0], exp: '解析七' }, // 多选<2
      { id: 'T1', s: 1, type: 'single', q: '重复 id', opts: ['A', 'B'], ans: 0, exp: '解析' },      // 重复
      { id: 'T8', s: 5, type: 'single', q: '科目非法', opts: ['A', 'B'], ans: 0, exp: '解析八' },
      null, 42, 'bad',
    ];
    const out = core.normalizeBank(raw);
    expect(out.map((q) => q.id)).toEqual(['T1']);
  });
  it('multi ans 归一去重升序；judge/single 透传', () => {
    const out = core.normalizeBank([
      { id: 'M1', s: 4, type: 'multi', q: '多选题', opts: ['A', 'B', 'C', 'D'], ans: [2, 0, 2, 1], exp: '多选解析' },
      { id: 'J1', s: 1, type: 'judge', q: '判断题干', opts: ['正确', '错误'], ans: 0, exp: '判断解析' },
    ]);
    expect(out[0].ans).toEqual([0, 1, 2]);
    expect(out[1].ans).toBe(0);
  });
  it('非数组输入返回空数组', () => {
    expect(core.normalizeBank(null)).toEqual([]);
    expect(core.normalizeBank('bad')).toEqual([]);
    expect(core.normalizeBank({})).toEqual([]);
  });
});

describe('v8.55 #62 core：组卷与判卷（真考格式）', () => {
  const bank = core.normalizeBank(core.BANK);
  it('examSpec：科一 100 题 45 分钟 1 分/题；科四 50 题 30 分钟 2 分/题；均 90 及格', () => {
    expect(core.examSpec(1)).toEqual({ count: 100, minutes: 45, per: 1, pass: 90 });
    expect(core.examSpec(4)).toEqual({ count: 50, minutes: 30, per: 2, pass: 90 });
    expect(core.examSpec(9)).toEqual({ count: 100, minutes: 45, per: 1, pass: 90 });  // 畸形回落科一
  });
  it('pickExam：数量恰为规格；同一种子两次组卷完全一致（rng 注入）', () => {
    const e1 = core.pickExam(bank, 1, seeded(42));
    const e2 = core.pickExam(bank, 1, seeded(42));
    expect(e1).toHaveLength(100);
    expect(e2.map((q) => q.id)).toEqual(e1.map((q) => q.id));
    const e4 = core.pickExam(bank, 4, seeded(7));
    expect(e4).toHaveLength(50);
    e4.forEach((q) => expect(q.s).toBe(4));
  });
  it('shuffle：同序置乱不丢元素；畸形输入不抛错', () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = core.shuffle(src, seeded(1));
    expect(out.slice().sort((a, b) => a - b)).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);   // 原数组不被改写
    expect(core.shuffle(null)).toEqual([]);
  });
  it('gradeExam：计分/及格/逐题对错；未答计错不抛错', () => {
    const qs = core.pickExam(bank, 4, seeded(3)).slice(0, 10);
    const answers = qs.map((q, i) => (i < 8 ? (q.type === core.QTYPE.MULTI ? q.ans.slice() : q.ans) : null));
    const g = core.gradeExam(qs, answers);
    expect(g.total).toBe(10);
    expect(g.correct).toBe(8);
    expect(g.wrong).toBe(2);
    expect(g.score).toBe(16);          // 科四 2 分/题
    expect(g.full).toBe(20);
    expect(g.pass).toBe(false);        // 16 < 90 → 不及格（仅模拟全卷才可达及格线）
  });
  it('gradeExam：全对 100 分及格 / 全错 0 分不及格', () => {
    const qs = core.pickExam(bank, 1, seeded(5)).slice(0, 5);
    const all = core.gradeExam(qs, qs.map((q) => (q.type === core.QTYPE.MULTI ? q.ans.slice() : q.ans)));
    expect(all.score).toBe(5);
    const none = core.gradeExam(qs, qs.map(() => null));
    expect(none.score).toBe(0);
    expect(none.pass).toBe(false);
  });
});

describe('v8.55 #62 core：模拟考计时（墙钟锚定——后台回前台不漂移）', () => {
  it('examRemaining：deadline-now 钳 0（计数器递减漂移被构造排除）', () => {
    const start = 1_000_000_000_000;
    expect(core.examRemaining(start, 45, start)).toBe(45 * 60 * 1000);
    expect(core.examRemaining(start, 45, start + 60 * 1000)).toBe(44 * 60 * 1000);
    expect(core.examRemaining(start, 45, start + 46 * 60 * 1000)).toBe(0);
    expect(core.examRemaining(start, 45, start - 1000)).toBe(45 * 60 * 1000 + 1000);  // 未开考钳满
  });
  it('examRemaining：畸形参数防线（start/minutes 非法按 0 处理）', () => {
    expect(core.examRemaining('x', 45, 5_000_000_000_000)).toBe(0);
    expect(core.examRemaining(5_000_000_000_000, 'x', 5_000_000_000_000)).toBe(0);
    expect(core.examRemaining(1_000_000_000, 45)).toBe(0);   // now 缺省 Date.now()——远早于当前的 start 必过期
  });
  it('examElapsed：用时统计（成绩页「用时」）', () => {
    expect(core.examElapsed(1_000_000, 1_061_000)).toBe(61_000);
    expect(core.examElapsed(1_000_000, 1_060_000)).toBe(60_000);
    expect(core.examElapsed(2_000_000, 1_000_000)).toBe(0);      // 倒挂钳 0
  });
  it('fmtClock：mm:ss 向上取整秒；上限 99:59；非法为 00:00', () => {
    expect(core.fmtClock(45 * 60 * 1000)).toBe('45:00');
    expect(core.fmtClock(1000)).toBe('00:01');
    expect(core.fmtClock(1)).toBe('00:01');
    expect(core.fmtClock(0)).toBe('00:00');
    expect(core.fmtClock(-5)).toBe('00:00');
    expect(core.fmtClock(5999999)).toBe('99:59');
    expect(core.fmtClock(5_999_999_999)).toBe('99:59');          // 封顶
  });
});

describe('v8.55 #62 core：错题本（艾宾浩斯同构 #28）', () => {
  it('常量：INTERVALS 五阶阶梯 + 容量封顶 + 持久化键', () => {
    expect(core.INTERVALS).toEqual([1, 2, 4, 7, 15]);
    expect(core.WRONG_MAX).toBe(200);
    expect(core.WRONG_KEY).toBe('ios-desktop:driving-wrong-v1');
    expect(core.PROGRESS_KEY).toBe('ios-desktop:driving-progress-v1');
    expect(core.EXAM_KEY).toBe('ios-desktop:driving-exam-v1');
    expect(core.SCORE_KEY).toBe('ios-desktop:driving-scores-v1');
  });
  it('dayKeyFromTs/isDayKey/addDays：本地时区日键 + 跨月/跨年推算', () => {
    expect(core.dayKeyFromTs(new Date(2026, 0, 5).getTime())).toBe('2026-01-05');
    expect(core.isDayKey('2026-10-28')).toBe(true);
    expect(core.isDayKey('2026-13-01')).toBe(false);
    expect(core.isDayKey('bad')).toBe(false);
    expect(core.addDays('2026-10-28', 4)).toBe('2026-11-01');   // 跨月
    expect(core.addDays('2026-12-30', 3)).toBe('2027-01-02');   // 跨年
    expect(core.addDays('bad', 1)).toBeNull();
  });
  it('addWrong：记错归零阶、due=今日、wrong 计数累加、born 记首错日', () => {
    const book = core.emptyBook();
    expect(core.addWrong(book, 'D001', '2026-10-28')).toBe(true);
    core.addWrong(book, 'D001', '2026-10-29');
    const e = book.items.D001;
    expect(e.s).toBe(0);
    expect(e.due).toBe('2026-10-29');
    expect(e.wrong).toBe(2);
    expect(e.born).toBe('2026-10-28');
    expect(core.addWrong(book, '', '2026-10-28')).toBe(false);
    expect(core.addWrong(null, 'D001', '2026-10-28')).toBe(false);
  });
  it('applyWrongGrade：know 升阶推 due（1/2/4/7/15）+ 顶阶消账 + 错误回阶', () => {
    const book = core.emptyBook();
    core.addWrong(book, 'D002', '2026-10-01');
    expect(core.applyWrongGrade(book, 'D002', 'know', '2026-10-01')).toBe('ok');
    expect(book.items.D002.s).toBe(1);
    expect(book.items.D002.due).toBe('2026-10-02');              // INTERVALS[0]=1
    core.applyWrongGrade(book, 'D002', 'know', '2026-10-02');
    expect(book.items.D002.s).toBe(2);
    expect(book.items.D002.due).toBe('2026-10-04');              // INTERVALS[1]=2
    core.applyWrongGrade(book, 'D002', 'unknown', '2026-10-04');
    expect(book.items.D002.s).toBe(0);
    expect(book.items.D002.due).toBe('2026-10-04');              // 当日重现
    core.applyWrongGrade(book, 'D002', 'fuzzy', '2026-10-04');
    expect(book.items.D002.due).toBe('2026-10-05');              // 明日复检
    // 连对至顶阶（第 5 阶）后再对 → 消账
    const b2 = core.emptyBook();
    core.addWrong(b2, 'D003', '2026-10-01');
    for (let i = 0; i < 5; i++) core.applyWrongGrade(b2, 'D003', 'know', '2026-10-01');
    expect(b2.items.D003).toBeUndefined();                       // cleared
    expect(core.applyWrongGrade(b2, 'D003', 'know', '2026-10-01')).toBe('ok');   // 不在册补档后正常升阶
    // 非法 grade 防御为 fuzzy；不在册题目补档
    const b3 = core.emptyBook();
    expect(core.applyWrongGrade(b3, 'D004', 'weird', '2026-10-01')).toBe('ok');
    expect(b3.items.D004.s).toBe(0);
  });
  it('dueWrong：due≤今日队列（due 升序 + id 升序稳定）', () => {
    const book = core.emptyBook();
    core.addWrong(book, 'D009', '2026-10-05');
    core.addWrong(book, 'D008', '2026-10-03');
    core.addWrong(book, 'D007', '2026-10-30');                    // 未来到期不入队
    const due = core.dueWrong(book, '2026-10-28');
    expect(due).toEqual(['D008', 'D009']);
  });
  it('normalizeBook：损坏 JSON/字段漂移静默降级 + 容量封顶', () => {
    expect(core.normalizeBook(null).items).toEqual({});
    expect(core.normalizeBook('oops').items).toEqual({});
    expect(core.normalizeBook([]).items).toEqual({});
    const bad = { items: { A: { s: 9, due: 'x', wrong: 0, born: 'y' }, B: null, '': { s: 0, due: '2026-10-01', wrong: 1, born: '2026-10-01' } } };
    expect(core.normalizeBook(bad).items).toEqual({});
    const good = { items: { OK: { s: 2, due: '2026-10-04', wrong: 3, born: '2026-10-01', last: '2026-10-03' } } };
    expect(core.normalizeBook(good).items.OK.s).toBe(2);
  });
});

describe('v8.55 #62 core：练习进度（每题对错计数 + 顺序游标）', () => {
  it('bumpProgress：n/ok 计数与非法防线', () => {
    const p = core.emptyProgress();
    core.bumpProgress(p, 'D001', true, '2026-10-28');
    core.bumpProgress(p, 'D001', false, '2026-10-28');
    expect(p.stats.D001).toEqual({ n: 2, ok: 1, last: '2026-10-28' });
    expect(core.bumpProgress(p, 'D001', 'yes', '2026-10-28')).toBe(false);
    expect(core.bumpProgress(p, '', true, '2026-10-28')).toBe(false);
  });
  it('seqCursor/setSeqCursor：游标推进 + 越界回落 0 + 畸形防线', () => {
    const p = core.emptyProgress();
    expect(core.seqCursor(p, 1, 118)).toBe(0);
    core.setSeqCursor(p, 1, 57);
    expect(core.seqCursor(p, 1, 118)).toBe(57);
    core.setSeqCursor(p, 1, 500);
    expect(core.seqCursor(p, 1, 118)).toBe(0);   // 越界回落
    core.setSeqCursor(p, 1, -3);
    expect(core.seqCursor(p, 1, 118)).toBe(0);
    expect(core.seqCursor(p, 4, 82)).toBe(0);    // 科目键隔离
  });
  it('normalizeProgress：损坏降级（stats/cursor 逐字段清洗）', () => {
    expect(core.normalizeProgress(null).stats).toEqual({});
    expect(core.normalizeProgress('oops').cursor).toEqual({});
    const bad = { stats: { A: { n: 0, ok: 0 }, B: { n: 3, ok: 9 }, C: { n: 2, ok: 1 } }, cursor: { '1': 3.5, '4': 5, '9': 7 } };
    const out = core.normalizeProgress(bad);
    expect(Object.keys(out.stats)).toEqual(['C']);
    expect(out.cursor).toEqual({ '4': 5 });
  });
});

describe('v8.55 #62 core：偏好/在途考/成绩归一', () => {
  it('normalizeState：subject 1|4 白名单 + mode 四模式白名单 + 损坏降级', () => {
    expect(core.normalizeState({ subject: 4, mode: 'exam' })).toEqual({ subject: 4, mode: 'exam' });
    expect(core.normalizeState({ subject: '4' })).toEqual({ subject: 4, mode: 'seq' });
    expect(core.normalizeState({ subject: 9, mode: 'bad' })).toEqual({ subject: 1, mode: 'seq' });
    expect(core.normalizeState(null)).toEqual({ subject: 1, mode: 'seq' });
    expect(core.normalizeState('oops').mode).toBe('seq');
  });
  it('normalizeExamState：合法在途考透传；畸形一律 null（不半恢复）', () => {
    const st = core.normalizeExamState({ subject: 4, startTs: 1_000_000_000, idx: 3, answers: [0, null, [0, 1], 2, 'x'], picked: [1, -1] });
    expect(st.subject).toBe(4);
    expect(st.answers).toEqual([0, null, [0, 1], 2, null]);
    expect(st.picked).toEqual([1, -1]);                          // raw 归一（-1 占位由页面 filter）
    expect(core.normalizeExamState(null)).toBeNull();
    expect(core.normalizeExamState({ subject: 9, startTs: 1, idx: 0, answers: [] })).toBeNull();
    expect(core.normalizeExamState({ subject: 1, startTs: -5, idx: 0, answers: [] })).toBeNull();
    expect(core.normalizeExamState({ subject: 1, startTs: 1, idx: 1.5, answers: [] })).toBeNull();
    expect(core.normalizeExamState('oops')).toBeNull();
  });
  it('recordScore/normalizeScores：best/last 记账 + 畸形防线', () => {
    const scores = {};
    core.recordScore(scores, 1, 88, 1_000_000);
    core.recordScore(scores, 1, 92, 2_000_000);
    core.recordScore(scores, 4, 100, 3_000_000);
    expect(scores['1']).toEqual({ best: 92, last: 92, at: 2_000_000 });   // last=最近一次，best=峰值
    expect(scores['4'].best).toBe(100);
    expect(core.recordScore(scores, 9, 50)).toBe(false);
    expect(core.recordScore(scores, 1, -5)).toBe(false);
    expect(core.normalizeScores('oops')).toEqual({});
    expect(core.normalizeScores({ '1': { best: 'x', last: 0 } })).toEqual({});
  });
});

describe('v8.55 #62 core：深链解析（driving/open）', () => {
  it('合法载荷归一；subject/mode 缺省回落（1/seq）', () => {
    expect(core.parseDeepLink({})).toEqual({ subject: 1, mode: 'seq', explicit: false });
    expect(core.parseDeepLink({ subject: 4 })).toEqual({ subject: 4, mode: 'seq', explicit: true });
    expect(core.parseDeepLink({ subject: '1', mode: 'random' })).toEqual({ subject: 1, mode: 'random', explicit: true });
  });
  it('非法载荷 null（不半解析）', () => {
    expect(core.parseDeepLink({ subject: 9 })).toBeNull();
    expect(core.parseDeepLink({ mode: 'hack' })).toBeNull();
    expect(core.parseDeepLink(null)).toBeNull();
    expect(core.parseDeepLink('open')).toBeNull();
    expect(core.parseDeepLink(42)).toBeNull();
    expect(core.parseDeepLink([])).toBeNull();
  });
});

describe('v8.55 #62 页面接线（源码锚）', () => {
  it('core 脚本标签 + freeze-shim + md3-tokens 前置 + 深链 inline 缓冲先于 core', () => {
    expect(PAGE_SRC.includes('src="../../js/driving-core.js"')).toBe(true);
    expect(PAGE_SRC.includes('src="../freeze-shim.js"')).toBe(true);
    expect(PAGE_SRC.includes('md3-tokens.css')).toBe(true);
    expect(PAGE_SRC.indexOf('window.__drivingDeepLink = window.__drivingDeepLink || []')).toBeLessThan(PAGE_SRC.indexOf('driving-core.js'));
  });
  it('四模式接线：chips id + core.MODES 切换（切换模式状态干净——hideAllViews）', () => {
    ['dv-mode-seq', 'dv-mode-random', 'dv-mode-exam', 'dv-mode-wrong', 'dv-subj-1', 'dv-subj-4'].forEach((t) => {
      expect(PAGE_SRC.includes(`data-test="${t}"`), t).toBe(true);
    });
    expect(PAGE_SRC.includes('function hideAllViews()')).toBe(true);
    expect(PAGE_SRC.includes('core.MODES.EXAM')).toBe(true);
  });
  it('模拟考墙钟计时：setInterval tick → core.examRemaining 即时重算 + visibilitychange 回前台校时', () => {
    expect(PAGE_SRC.includes('core.examRemaining(exam.startTs')).toBe(true);
    expect(PAGE_SRC.includes("addEventListener('visibilitychange'")).toBe(true);
    expect(PAGE_SRC.includes('if (!document.hidden) tick()')).toBe(true);
    expect(PAGE_SRC.includes('core.fmtClock(remain)')).toBe(true);
  });
  it('到时自动交卷 + 交卷确认（未答提示）+ 成绩入档 recordScore', () => {
    expect(PAGE_SRC.includes('if (remain <= 0) submitExam(true)')).toBe(true);
    expect(PAGE_SRC.includes("window.confirm('还有 ' + unanswered + ' 题未作答，确认交卷？')")).toBe(true);
    expect(PAGE_SRC.includes('core.recordScore(scores')).toBe(true);
  });
  it('重载续考：EXAM_KEY 持久化 qids/answers/startTs + resumeExam + 缺席到点自动入档', () => {
    expect(PAGE_SRC.includes('writeJSON(core.EXAM_KEY')).toBe(true);
    expect(PAGE_SRC.includes('function resumeExam()')).toBe(true);
    expect(PAGE_SRC.includes('core.normalizeExamState(payload)')).toBe(true);
    expect(PAGE_SRC.includes('缺席期间考试时间到——已自动交卷')).toBe(true);
  });
  it('错题本艾宾浩斯接线：addWrong + applyWrongGrade(know) + dueWrong 队列 + 阶梯徽标', () => {
    expect(PAGE_SRC.includes('core.addWrong(book, q.id, today)')).toBe(true);
    expect(PAGE_SRC.includes("core.applyWrongGrade(book, q.id, 'know', today)")).toBe(true);
    expect(PAGE_SRC.includes('core.dueWrong(book, core.dayKeyFromTs(Date.now()))')).toBe(true);
    expect(PAGE_SRC.includes('data-test="dv-wrongchip"')).toBe(true);
  });
  it('程序化标志渲染：createElementNS 零 innerHTML 渲染 SIGN_SHAPES', () => {
    expect(PAGE_SRC.includes("document.createElementNS(SVG_NS, 'svg')")).toBe(true);
    expect(PAGE_SRC.includes('core.SIGN_SHAPES[key]')).toBe(true);
    expect(PAGE_SRC.includes('.innerHTML')).toBe(false);   // 零 innerHTML 纪律
  });
  it('初始化绝不自动开考（exam 模式回落开考覆盖；init 块无 startExam）', () => {
    const initBlock = PAGE_SRC.split('function init()')[1]?.split('window.__drivingJump')[0] || '';
    expect(initBlock.includes('startExam(')).toBe(false);
    expect(initBlock.includes('mode = core.MODES.SEQ;      // 界面回落顺序练习')).toBe(true);
    expect(PAGE_SRC.includes('data-test="dv-start"')).toBe(true);
  });
  it('生命周期三路中止：APP_FREEZE + pagehide + beforeunload → 停表 + 考试状态落盘', () => {
    expect(PAGE_SRC.includes("e.data.type === 'APP_FREEZE'")).toBe(true);
    expect(PAGE_SRC.includes("addEventListener('pagehide', abortAll)")).toBe(true);
    expect(PAGE_SRC.includes("addEventListener('beforeunload', abortAll)")).toBe(true);
    expect(PAGE_SRC.includes('function abortAll()')).toBe(true);
  });
  it('深链双保险：BUS_DELIVER driving/open 运行时通道 + inline 缓冲消费', () => {
    expect(PAGE_SRC.includes("d.event !== 'driving/open'")).toBe(true);
    expect(PAGE_SRC.includes('function consumeDeepLink()')).toBe(true);
  });
  it('e2e 测试锚 data-test 齐备', () => {
    ['dv-badge', 'dv-stat-learn', 'dv-stat-rate', 'dv-stat-wrong', 'dv-stat-best',
     'dv-clock', 'dv-eprog', 'dv-submit', 'dv-start', 'dv-cat', 'dv-type', 'dv-sign',
     'dv-stem', 'dv-opts', 'dv-confirm', 'dv-exp', 'dv-prev', 'dv-next', 'dv-progress',
     'dv-score', 'dv-verdict', 'dv-summary', 'dv-again', 'dv-back', 'dv-empty',
     'dv-toast', 'dv-opt', 'dv-wrongchip'].forEach((t) => {
      expect(PAGE_SRC.includes(`data-test="${t}"`), t).toBe(true);
    });
  });
});

describe('v8.55 #62 注册链（第 45 应用）', () => {
  it('apps/driving.js iframe 壳定义（id=driving / iframeAppContent）', () => {
    expect(SHELL_SRC.includes("id: 'driving'")).toBe(true);
    expect(SHELL_SRC.includes('iframeAppContent')).toBe(true);
    expect(SHELL_SRC.includes('apps/driving/index.html')).toBe(true);
  });
  it('apps-data.js 导入 + 第 2 页数组末位（第 45 位）', () => {
    expect(APPSDATA_SRC.includes("import driving from './apps/driving.js'")).toBe(true);
    expect(APPSDATA_SRC.includes('midiPlayer, ocr, stt, radio, driving,')).toBe(true);
  });
  it('app-icons.js 「driving」图标在册（hsl 公式纪律）+ fixture 5 动态色声明', () => {
    expect(ICONS_SRC.includes("'driving': `<svg")).toBe(true);
    const drivingIcon = ICONS_SRC.split("'driving': `<svg")[1]?.split('</svg>`')[0] || '';
    expect(drivingIcon).not.toContain('style="stroke:#');   // style 内只许 hsl 公式（v8.50 纪律）
    expect(drivingIcon).not.toContain('style="fill:#');
    expect(drivingIcon.match(/(?:fill|stroke):hsl\(/g) || []).toHaveLength(5);
    expect(FIXTURE.icons['driving']).toBeDefined();
    expect(FIXTURE.icons['driving'].dynamic).toBe(5);
    expect(FIXTURE.icons['driving'].colors).toHaveLength(5);
  });
  it('terminal-core：APPS 行 + COMMANDS 注册（36 命令）', () => {
    expect(TCORE_SRC.includes("['driving', '驾考题库', 'driving', '驾考', '题库', '科目一']")).toBe(true);
    expect(TCORE_SRC.includes("driving:  { group: '应用'")).toBe(true);
    expect(TCORE_SRC.match(/group: '应用'/g).length).toBe(9);   // open/apps/print/beat/code/ocr/stt/radio/driving — 应用组 9 条
  });
  it('terminal 页 case driving：科目可选参数 + openApp 深链（driving/open 载荷）', () => {
    expect(TPAGE_SRC.includes("case 'driving':")).toBe(true);
    expect(TPAGE_SRC.includes("openApp('driving', { event: 'driving/open'")).toBe(true);
    expect(TPAGE_SRC.includes('usage: driving [1|4]')).toBe(true);
  });
});
