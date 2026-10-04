// ==================== tests/cal-sync.test.js — 通知中心 ↔ 日历同步（v7.25）测试 ====================
//
// 覆盖 cal-sync.js 纯函数层（宿主侧动态日历通知的数据底座）：
//   · readCalendarNotes：v2 主存储读取 / 脏数据清洗 / 空白笔记剔除 / 旧 note_* 键兼容 / JSON 损坏容错
//   · composeCalNotification：今日优先 / 无今日取最近更新日 / 标题提取（# 标题、首行、空内容）/ 全空返回 null
//   · calDigest 数据指纹：日期+数量+更新时间构成
//   · calDateKey / formatRelative 相对时间分档
//
// 关键业务规则（与 notifications.js 同步逻辑一一对应）：
//   - 日历应用（iframe）写入 calnotes_v2 → 宿主 storage 事件 → 通知中心 n2 条目刷新为真实摘要
//   - 通知点击深链 payload.date 即 compose 返回的 key
//   - 滑掉记忆按 digest 比对：数据不变不复现，变化后重新浮现

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CAL_DB_KEY,
  readCalendarNotes,
  composeCalNotification,
  calDigest,
  calDateKey,
  calNoteTitle,
  formatRelative,
} from '../ios-desktop/js/cal-sync.js';

function mockStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    key: (i) => Array.from(store.keys())[i] || null,
    get length() { return store.size; },
    _store: store,
  };
}

const todayKey = () => calDateKey(new Date());

describe('readCalendarNotes · 数据归一化', () => {
  let ls;
  beforeEach(() => { ls = mockStorage(); });

  it('v2 正常读取：多日多条全量返回', () => {
    const db = {
      '2026-10-01': [{ id: 'a', content: '# A', updated: 100 }],
      '2026-10-02': [
        { id: 'b', content: '笔记B', updated: 200 },
        { id: 'c', content: '# 笔记C\n正文', updated: 300 },
      ],
    };
    ls.setItem(CAL_DB_KEY, JSON.stringify(db));
    const out = readCalendarNotes(ls);
    expect(Object.keys(out).sort()).toEqual(['2026-10-01', '2026-10-02']);
    expect(out['2026-10-02'].length).toBe(2);
    expect(out['2026-10-02'][1].content).toContain('笔记C');
  });

  it('脏数据清洗：非法日期键 / 非数组日 / 空白内容条目被剔除', () => {
    const db = {
      'not-a-date': [{ id: 'x', content: 'bad' }],
      '2026-10-01': 'not-an-array',
      '2026-10-02': [{ id: 'a', content: '   ' }, { id: 'b', content: '有效' }, null],
    };
    ls.setItem(CAL_DB_KEY, JSON.stringify(db));
    const out = readCalendarNotes(ls);
    expect(Object.keys(out)).toEqual(['2026-10-02']);
    expect(out['2026-10-02'].length).toBe(1);
  });

  it('旧版 note_YYYY-MM-DD 单条键兼容读取（未迁移场景）', () => {
    ls.setItem('note_2026-09-30', '# 旧版笔记');
    ls.setItem('note_2026-10-02', '');
    const out = readCalendarNotes(ls);
    expect(Object.keys(out)).toEqual(['2026-09-30']);
    expect(out['2026-09-30'][0].content).toBe('# 旧版笔记');
  });

  it('v2 已覆盖的日期不被旧键覆盖；JSON 损坏时回退旧键', () => {
    ls.setItem(CAL_DB_KEY, JSON.stringify({ '2026-10-01': [{ id: 'a', content: 'v2内容', updated: 5 }] }));
    ls.setItem('note_2026-10-01', '旧内容');
    expect(readCalendarNotes(ls)['2026-10-01'][0].content).toBe('v2内容');

    ls.setItem(CAL_DB_KEY, '{broken json');
    ls.setItem('note_2026-10-02', '旧键兜底');
    const out2 = readCalendarNotes(ls);
    expect(out2['2026-10-02'][0].content).toBe('旧键兜底');
  });

  it('空存储 / null 返回空对象', () => {
    expect(readCalendarNotes(ls)).toEqual({});
    expect(readCalendarNotes(null)).toEqual({});
  });
});

describe('composeCalNotification · 摘要构造', () => {
  const now = new Date(2026, 9, 3, 15, 0, 0); // 2026-10-03

  it('今日有笔记 → 「今天 · N 篇」+ 最新一篇标题', () => {
    const days = {
      [todayKey() === '2026-10-03' ? '2026-10-03' : todayKey()]: [],
      '2026-09-01': [{ id: 'old', content: '旧', updated: 10 }],
    };
    // 直接构造（不依赖真实今天，用固定日期键）
    const fixed = {
      '2026-10-03': [
        { id: 'a', content: '# 晨间记录\n内容', updated: 100 },
        { id: 'b', content: '# 下午安排', updated: 500 },
      ],
      '2026-09-01': [{ id: 'old', content: '旧', updated: 900 }],
    };
    const info = composeCalNotification(fixed, now);
    expect(info.key).toBe('2026-10-03');
    expect(info.count).toBe(2);
    expect(info.title).toBe('今天 · 2 篇笔记');
    expect(info.desc).toContain('下午安排'); // updated 最大的一篇
    expect(info.dateLabel).toBe('今天');
    expect(info.digest).toBe(calDigest('2026-10-03', 2, 500));
    void days;
  });

  it('今日无笔记 → 取最近更新的一日（M月D日 · N 篇）', () => {
    const fixed = {
      '2026-09-28': [{ id: 'a', content: '九月末', updated: 100 }],
      '2026-10-01': [{ id: 'b', content: '# 假期计划', updated: 800 }],
    };
    const info = composeCalNotification(fixed, now);
    expect(info.key).toBe('2026-10-01');
    expect(info.title).toBe('10月1日 · 1 篇笔记');
    expect(info.desc).toBe('最新：假期计划');
    expect(info.dateLabel).toBe('10月1日');
  });

  it('标题提取：# 标题优先，无标题取首行，纯空白返回无标题', () => {
    expect(calNoteTitle('# 架构评审\n正文')).toBe('架构评审');
    expect(calNoteTitle('首行即标题\n第二行')).toBe('首行即标题');
    expect(calNoteTitle('   \n  \n')).toBe('无标题');
    expect(calNoteTitle('')).toBe('无标题');
  });

  it('全空数据 → null（通知中心回落演示文案）', () => {
    expect(composeCalNotification({}, now)).toBeNull();
    expect(composeCalNotification(null, now)).toBeNull();
    expect(composeCalNotification({ '2026-10-01': [] }, now)).toBeNull();
  });

  it('digest 任一要素变化即不同（复现判定依据）', () => {
    const d1 = calDigest('2026-10-03', 1, 100);
    expect(d1).not.toBe(calDigest('2026-10-04', 1, 100)); // 日期变
    expect(d1).not.toBe(calDigest('2026-10-03', 2, 100)); // 数量变
    expect(d1).not.toBe(calDigest('2026-10-03', 1, 200)); // 更新时间变
    expect(d1).toBe(calDigest('2026-10-03', 1, 100));
  });
});

describe('calDateKey / formatRelative · 格式化', () => {
  it('calDateKey 补零', () => {
    expect(calDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(calDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('formatRelative 分档：刚刚/分钟/小时/日期', () => {
    const now = new Date(2026, 9, 3, 15, 0, 0).getTime();
    expect(formatRelative(0, now)).toBe('刚刚');
    expect(formatRelative(now - 30 * 1000, now)).toBe('刚刚');
    expect(formatRelative(now - 5 * 60 * 1000, now)).toBe('5分钟前');
    expect(formatRelative(now - 3 * 3600 * 1000, now)).toBe('3小时前');
    expect(formatRelative(new Date(2026, 8, 28).getTime(), now)).toBe('9/28');
  });
});
