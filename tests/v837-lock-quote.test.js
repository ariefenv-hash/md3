// ==================== v837-lock-quote.test.js — #26 锁屏一言守护 ====================
//
// #26 执行要点逐条落锚：
//   内置离线诗词库（100+ 条）按日期轮换——断网零依赖（超越 nightsky 断网空白）
//   在线增强模式（设置开关，默认关）：v1.hitokoto.cn 按句子类型过滤（c=d&c=e 诗词+文学）
//   渲染：诗词正文 + 作者出处小字；锁屏排版在时钟下方与 #20 表盘共存不冲突
//   数据落 localStorage 缓存，当日复用
//   验收：断网状态锁屏诗词正常显示且按日切换；缓存/轮换逻辑 vitest 锚
//
// 测试口径：
//   ① 纯函数沙箱——直接 import 模块（顶层零副作用，node 环境安全）：
//      dayKeyOf / pickByDate 确定性轮换 / parseCache 四态降级
//   ② 行为级——bootDesktop 真实启动链（ensureLockDOM → mountLockQuote）：
//      DOM 排版（时钟下一兄弟）、当日离线条确定性渲染、缓存写入、
//      fetch stub 双向驱动（断网回落 / 在线成功闭环）零真实网络
//   ③ 源码锚定——设置页开关行 + store 真源 + 事件广播 + PAGE_SCRIPT ⑤ 绑定

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ALL_QUOTES, dayKeyOf, pickByDate, pickIndex, parseCache, mountLockQuote }
  from '../ios-desktop/js/lock-quotes.js';
import { bootDesktop, sleep } from './scenario-helpers.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const settingsSrc = readFileSync(join(root, 'ios-desktop/js/apps/settings.js'), 'utf8');
const lockScreenSrc = readFileSync(join(root, 'ios-desktop/js/lock-screen.js'), 'utf8');
const cssSrc = readFileSync(join(root, 'ios-desktop/css/lock-screen.css'), 'utf8');
const CACHE_KEY = 'ios-desktop:lock-quote-cache';
const ONLINE_KEY = 'ios-desktop:lock-quote-online';

// ==================== ① 纯函数沙箱 ====================

describe('#26 离线诗词库：库量与字段纪律', () => {
  it('库量 ≥ 100 条（议题「精选 100+ 条」验收）', () => {
    expect(ALL_QUOTES.length).toBeGreaterThanOrEqual(100);
  });

  it('每条 t/a/s 三字段非空字符串；正文 ≤ 44 字（锁屏 78vw 两行内）', () => {
    for (const q of ALL_QUOTES) {
      expect(typeof q.t, JSON.stringify(q)).toBe('string');
      expect(q.t.length, JSON.stringify(q)).toBeGreaterThan(0);
      expect(q.t.length, JSON.stringify(q)).toBeLessThanOrEqual(44);
      expect(typeof q.a, JSON.stringify(q)).toBe('string');
      expect(q.a.length, JSON.stringify(q)).toBeGreaterThan(0);
      expect(typeof q.s, JSON.stringify(q)).toBe('string');
      expect(q.s.length, JSON.stringify(q)).toBeGreaterThan(0);
    }
  });

  it('正文全库无重复（避免轮换视觉重复）', () => {
    const set = new Set(ALL_QUOTES.map((q) => q.t));
    expect(set.size).toBe(ALL_QUOTES.length);
  });
});

describe('#26 按日轮换：确定性 + 覆盖度（vitest 锚：轮换逻辑）', () => {
  it('dayKeyOf 输出 YYYY-MM-DD 且补零（本地时区当日标识）', () => {
    expect(dayKeyOf(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dayKeyOf(new Date(2026, 9, 26))).toBe('2026-10-26'); // 月份 0 起：9 = 十月
    expect(dayKeyOf(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('同日恒同条（当日多次渲染幂等——刷新不换句）', () => {
    const k = '2026-10-26';
    const a = pickByDate(ALL_QUOTES, k);
    for (let i = 0; i < 5; i++) expect(pickByDate(ALL_QUOTES, k)).toBe(a);
    expect(pickIndex(ALL_QUOTES, k)).toBe(pickIndex(ALL_QUOTES, k));
  });

  it('索引恒在界内且跨日切换（连续 60 天采样存在多句切换）', () => {
    const base = new Date(2026, 0, 1);
    const seenTexts = new Set();
    for (let i = 0; i < 60; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      const idx = pickIndex(ALL_QUOTES, dayKeyOf(d));
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(ALL_QUOTES.length);
      seenTexts.add(pickByDate(ALL_QUOTES, dayKeyOf(d)).t);
    }
    expect(seenTexts.size).toBeGreaterThan(30);
  });

  it('hash 覆盖度：1000 个连续日命中 ≥ 85% 全库（轮换不出现死角）', () => {
    const base = new Date(2025, 0, 1);
    const seen = new Set();
    for (let i = 0; i < 1000; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      seen.add(pickIndex(ALL_QUOTES, dayKeyOf(d)));
    }
    expect(seen.size).toBeGreaterThanOrEqual(Math.floor(ALL_QUOTES.length * 0.85));
  });
});

describe('#26 缓存解析：当日复用 + 静默降级（vitest 锚：缓存逻辑）', () => {
  const K = '2026-10-26';
  const q = { t: '海内存知己，天涯若比邻。', a: '王勃', s: '送杜少府之任蜀州', src: 'offline' };

  it('当日命中 → 原样返回（含 src）', () => {
    const raw = JSON.stringify({ day: K, q });
    expect(parseCache(raw, K)).toEqual(q);
  });

  it('跨日缓存 → null（次日自然回离线轮换）', () => {
    const raw = JSON.stringify({ day: '2026-10-25', q });
    expect(parseCache(raw, K)).toBeNull();
  });

  it('损坏 JSON → null（reaction_stats_v1 静默降级同律，绝不抛错）', () => {
    expect(parseCache('garbage{{{', K)).toBeNull();
    expect(parseCache('{broken', K)).toBeNull();
  });

  it('非字符串/空输入 → null；缺 t 字段 → null', () => {
    expect(parseCache(null, K)).toBeNull();
    expect(parseCache(undefined, K)).toBeNull();
    expect(parseCache('', K)).toBeNull();
    expect(parseCache(12345, K)).toBeNull();
    expect(parseCache(JSON.stringify({ day: K, q: { a: 'x' } }), K)).toBeNull();
  });

  it('缺 a/s 字段 → 默认佚名/一言（在线 API 字段缺失防御）', () => {
    const out = parseCache(JSON.stringify({ day: K, q: { t: '测试句' } }), K);
    expect(out).toEqual({ t: '测试句', a: '佚名', s: '一言', src: 'offline' });
  });
});

// ==================== ② 行为级（bootDesktop 真实启动链） ====================

let W;
beforeAll(async () => {
  W = await bootDesktop();
});

describe('#26 锁屏 DOM：排版与时钟共存（#20 表盘联动验收）', () => {
  it('一言行存在且紧随时钟（.lock-clock 下一兄弟——时钟下方不遮挡）', () => {
    const clock = document.querySelector('#lockScreen .lock-clock');
    expect(clock).toBeTruthy();
    const quote = clock.nextElementSibling;
    expect(quote).toBeTruthy();
    expect(quote.classList.contains('lock-quote')).toBe(true);
  });

  it('当日离线条确定性渲染：DOM 文本 = pickByDate(全库, 今日) （断网正常显示验收）', () => {
    const today = dayKeyOf(new Date());
    const expected = pickByDate(ALL_QUOTES, today);
    const text = document.querySelector('#lockScreen .lock-quote-text');
    const src = document.querySelector('#lockScreen .lock-quote-src');
    expect(text).toBeTruthy();
    expect(text.textContent).toBe(expected.t);
    // 作者出处小字格式「——作者《出处》」
    expect(src).toBeTruthy();
    expect(src.textContent).toBe(`——${expected.a}《${expected.s}》`);
  });

  it('当日结果落 localStorage 缓存（议题：当日复用）', () => {
    const raw = localStorage.getItem(CACHE_KEY);
    expect(raw).toBeTruthy();
    const today = dayKeyOf(new Date());
    const cached = parseCache(raw, today);
    expect(cached).toBeTruthy();
    expect(cached.src).toBe('offline');
  });
});

describe('#26 挂载降级与在线增强（fetch stub 双向驱动，零真实网络）', () => {
  it('损坏缓存 → 重挂载静默降级离线条并重写缓存（绝白屏/绝抛错）', async () => {
    localStorage.setItem(CACHE_KEY, 'garbage{{{');
    const lockEl = document.getElementById('lockScreen');
    let threw = false;
    try {
      mountLockQuote(lockEl);
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(false);
    const text = document.querySelector('#lockScreen .lock-quote-text');
    expect(text.textContent.length).toBeGreaterThan(0); // 离线条立即在场
    expect(parseCache(localStorage.getItem(CACHE_KEY), dayKeyOf(new Date()))).toBeTruthy();
  });

  it('断网（fetch reject）+ 在线开关开 → 离线条保持（断网可用第一验收）', async () => {
    localStorage.setItem(ONLINE_KEY, '1');
    localStorage.removeItem(CACHE_KEY);
    const realFetch = window.fetch;
    window.fetch = () => Promise.reject(new TypeError('Failed to fetch'));
    try {
      document.dispatchEvent(new CustomEvent('lock-quote-online-changed', { detail: { on: true } }));
      await sleep(30);
      const text = document.querySelector('#lockScreen .lock-quote-text');
      const today = dayKeyOf(new Date());
      expect(text.textContent).toBe(pickByDate(ALL_QUOTES, today).t);
    } finally {
      window.fetch = realFetch;
      localStorage.setItem(ONLINE_KEY, '0');
    }
  });

  it('在线成功闭环：假 hitokoto 响应 → DOM 切换在线条 + 缓存 src=online（当日复用）', async () => {
    localStorage.setItem(ONLINE_KEY, '1');
    localStorage.removeItem(CACHE_KEY);
    const realFetch = window.fetch;
    window.fetch = () => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        hitokoto: '山中何事？松花酿酒，春水煎茶。',
        from_who: '张可久',
        from: '人月圆·山中书事',
      }),
    });
    try {
      document.dispatchEvent(new CustomEvent('lock-quote-online-changed', { detail: { on: true } }));
      await sleep(30);
      const text = document.querySelector('#lockScreen .lock-quote-text');
      const src = document.querySelector('#lockScreen .lock-quote-src');
      expect(text.textContent).toBe('山中何事？松花酿酒，春水煎茶。');
      expect(src.textContent).toBe('——张可久《人月圆·山中书事》');
      const cached = parseCache(localStorage.getItem(CACHE_KEY), dayKeyOf(new Date()));
      expect(cached).toBeTruthy();
      expect(cached.src).toBe('online');
      expect(cached.t).toBe('山中何事？松花酿酒，春水煎茶。');
    } finally {
      window.fetch = realFetch;
      localStorage.setItem(ONLINE_KEY, '0');
    }
  });

  it('在线开关关 + 当日离线缓存失效 → 广播回落离线轮换条', async () => {
    localStorage.setItem(ONLINE_KEY, '0');
    localStorage.removeItem(CACHE_KEY);
    document.dispatchEvent(new CustomEvent('lock-quote-online-changed', { detail: { on: false } }));
    await sleep(10);
    const today = dayKeyOf(new Date());
    const text = document.querySelector('#lockScreen .lock-quote-text');
    expect(text.textContent).toBe(pickByDate(ALL_QUOTES, today).t);
  });
});

// ==================== ③ 源码锚定（设置页开关 + 接线纪律） ====================

describe('#26 注册链与接线锚定', () => {
  it('lock-screen.js：一言容器在时钟后 + mount/refresh 双挂点 + 异常不阻塞锁屏', () => {
    expect(lockScreenSrc).toContain("import { mountLockQuote, refreshLockQuoteDay } from './lock-quotes.js'");
    // 容器与时钟的排版关系（时钟下方：lock-clock 块闭合后最近的 div 即 lock-quote）
    expect(lockScreenSrc).toMatch(/lock-clock">[\s\S]{0,60}?<\/div>[\s\S]{0,200}?class="lock-quote"/);
    // refreshClock tick 兼任跨午夜切换驱动
    expect(lockScreenSrc).toMatch(/refreshClock\(\)[\s\S]{0,400}?refreshLockQuoteDay\(\)/);
    // ensureLockDOM 挂载且 try/catch 包裹（一言异常绝不阻塞锁屏初始化）
    expect(lockScreenSrc).toMatch(/try \{ mountLockQuote\(lockEl\); \} catch/);
  });

  it('lock-quotes.js：在线开关默认关（store 缺省非 \'1\'）+ hitokoto 类型过滤锚', () => {
    const src = readFileSync(join(root, 'ios-desktop/js/lock-quotes.js'), 'utf8');
    expect(src).toContain("readStore(ONLINE_KEY) === '1'"); // 仅显式 '1' 才开——默认关
    expect(src).toContain('v1.hitokoto.cn');               // 议题指定官方 API
    expect(src).toContain('c=d&c=e');                      // 句子类型过滤：诗词+文学
    expect(src).toContain('max_length=42');                // 防超长破坏排版
  });

  it('settings.js：显示页「锁定显示屏」区开关行 + store 真源 + 事件广播 + #70 重同步', () => {
    expect(settingsSrc).toContain('data-test="dsp-quote-online"');
    expect(settingsSrc).toContain('id="dspQuoteOnlineToggle"');
    expect(settingsSrc).toContain("ios-desktop:lock-quote-online");
    expect(settingsSrc).toContain("new CustomEvent('lock-quote-online-changed'");
    // #70 纪律：app-page-active 重同步（syncQuote 在绑定外先行执行）
    expect(settingsSrc).toMatch(/var syncQuote = function\(\) \{[\s\S]{0,300}?\};\s*syncQuote\(\);/);
  });

  it('CSS：.lock-quote 衬线体与 :empty 不占位（数据异常零残留）', () => {
    expect(cssSrc).toMatch(/\.lock-quote \{[\s\S]*?Noto Serif SC/);
    expect(cssSrc).toContain('.lock-quote:empty');
    expect(cssSrc).toContain('.lock-quote-src');
  });
});
