// ==================== word-books.test.js — #154 多词书 + 本地化守护 ====================
//
// #154 验收四条逐条落锚：
//   ① 词书 ≥2 新增（CET-6 + 考研），切换后进度独立持久化 —— BOOKS 注册表 +
//      progressKeyFor 命名空间隔离（cet4 存量键零迁移）+ 分册数据文件锚
//   ② 断网全功能不回退 —— cet4 内置 WORD_BANK 原样继承；分册 JSON 为仓库内
//      静态文件（构建期原样复制进 dist），且不进 SW 预缓存排除清单（离线首装可用）
//   ③ i18n 界面语言可切换且持久化 —— WD_I18N zh/en 键集平价 + UI 双持久化键
//   ④ vitest：词书加载/切换/进度隔离纯函数锚 —— normalizeBank 规整 + 隔离语义
//
// 测试口径：v839 同款 new Function 沙箱提取 __wordCore + fs 数据文件锚。

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const coreSrc = readFileSync(join(root, 'ios-desktop/js/word-core.js'), 'utf8');
const page = readFileSync(join(root, 'ios-desktop/apps/word/index.html'), 'utf8');
const viteCfg = readFileSync(join(root, 'vite.config.js'), 'utf8');
const booksDir = join(root, 'ios-desktop/apps/word/books');

function loadWordCore() {
  const sandboxWindow = {};
  const fn = new Function('window', `${coreSrc}\n;return window.__wordCore;`);
  return fn(sandboxWindow, undefined);
}

const { WORD_BANK, BOOKS, bookById, progressKeyFor, normalizeBank, WD_I18N, buildQueue, applyGrade, emptyProgress } =
  loadWordCore();

const T = '2026-11-06';

// ==================== ① 词书注册表（#154 验收①：词书体系） ====================

describe('#154 词书注册表：三册体系与元数据纪律', () => {
  it('三册注册：cet4 内置 + cet6/kaoyan 懒加载——#154 建议方向采纳', () => {
    expect(BOOKS.map((b) => b.id)).toEqual(['cet4', 'cet6', 'kaoyan']);
    expect(BOOKS.filter((b) => b.builtIn).map((b) => b.id)).toEqual(['cet4']); // 仅 cet4 内置
    for (const b of BOOKS) {
      expect(b.label).toBeTruthy();
      expect(b.nameZh).toBeTruthy();
      expect(b.nameEn).toBeTruthy();
    }
  });

  it('bookById 命中/未命中防御（null 不抛）', () => {
    expect(bookById('cet6').label).toBe('CET-6');
    expect(bookById('kaoyan').label).toBe('考研');
    expect(bookById('cet4').builtIn).toBe(true);
    expect(bookById('toefl')).toBeNull();
    expect(bookById('')).toBeNull();
    expect(bookById(undefined)).toBeNull();
  });

  it('CET-4 内置词库零回归（v8.39 555 词存量原样继承）', () => {
    expect(WORD_BANK.length).toBe(555);
    for (const e of WORD_BANK) {
      expect(typeof e.word).toBe('string');
      expect(e.word.length).toBeGreaterThan(0);
      expect(typeof e.pos).toBe('string');
      expect(typeof e.meaning).toBe('string');
    }
  });
});

// ==================== ② 进度命名空间隔离（#154 验收①：进度独立持久化） ====================

describe('#154 进度键命名空间隔离：cet4 存量键零迁移 + 词书家族键', () => {
  it('cet4 沿用 v8.39 存量单键（老进度原地生效，零迁移零回归）', () => {
    expect(progressKeyFor('cet4')).toBe('word_progress_v1');
    expect(progressKeyFor(undefined)).toBe('word_progress_v1'); // 缺省回落 cet4
    expect(progressKeyFor(null)).toBe('word_progress_v1');
  });

  it('cet6/kaoyan 走 word_progress_v1:<id> 家族键', () => {
    expect(progressKeyFor('cet6')).toBe('word_progress_v1:cet6');
    expect(progressKeyFor('kaoyan')).toBe('word_progress_v1:kaoyan');
  });

  it('三册进度键两两互异（隔离语义锚：切换后进度互不串扰）', () => {
    const keys = ['cet4', 'cet6', 'kaoyan'].map(progressKeyFor);
    expect(new Set(keys).size).toBe(3);
  });

  it('id 白名单外字符剥离（防键拼接漂移）', () => {
    expect(progressKeyFor('a b/c!')).toBe('word_progress_v1:abc');
    expect(progressKeyFor('..')).toBe('word_progress_v1:'); // 全剥离仍为家族键形态
  });

  it('隔离语义：A 册评分不污染 B 册队列（词书作参数注入——调度核零改动）', () => {
    const bankB = [
      { word: 'zealot', pos: 'n.', meaning: '狂热者' },
      { word: 'yearn', pos: 'v.', meaning: '渴望' },
      { word: 'wither', pos: 'v.', meaning: '枯萎' },
    ];
    const pA = emptyProgress();
    const pB = emptyProgress();
    applyGrade(pA, 'zealot', 'know', T); // A 册学 zealot
    const qBefore = buildQueue(bankB, pB, T);
    const qAfter = buildQueue(bankB, pB, T);
    expect(qBefore).toEqual(qAfter); // pB 未被触碰
    expect(qAfter[0]).toBe('zealot'); // B 册新词按库序（zealot 亦在 B 库，但进度独立）
    expect(pB.words.zealot).toBeUndefined(); // 评分只落在 pA
    expect(pA.words.zealot).toBeDefined();
  });
});

// ==================== ③ 分册规整纯函数（#154 验收④：词书加载锚） ====================

describe('#154 normalizeBank：分册 tuple 规整与防御', () => {
  it('tuple [word, pos, meaning, uk] → 词条对象', () => {
    const bank = normalizeBank([
      ['consistent', 'adj.', '一致的', "kən'sistənt"],
      ['battery', 'n.', '电池', "'bætəri"],
    ]);
    expect(bank).toEqual([
      { word: 'consistent', pos: 'adj.', meaning: '一致的', uk: "kən'sistənt" },
      { word: 'battery', pos: 'n.', meaning: '电池', uk: "'bætəri" },
    ]);
  });

  it('3-tuple 容错（uk 缺省空串——UI 按空串隐藏音标行）', () => {
    const bank = normalizeBank([['word', 'n.', '词']]);
    expect(bank[0].uk).toBe('');
  });

  it('word 主键去重（后者丢弃）+ 空 word 剔除 + 短 tuple 剔除', () => {
    const bank = normalizeBank([
      ['alpha', 'n.', '第一个', ''],
      ['alpha', 'n.', '重复丢弃', ''],
      ['', 'n.', '空词剔除', ''],
      ['beta', 'n.', '合法', ''],
      ['gamma'], // 短 tuple 剔除
    ]);
    expect(bank.map((e) => e.word)).toEqual(['alpha', 'beta']);
    expect(bank[0].meaning).toBe('第一个');
  });

  it('非数组/空输入零防御返回空数组（词书数据损坏降级不崩链）', () => {
    expect(normalizeBank(null)).toEqual([]);
    expect(normalizeBank(undefined)).toEqual([]);
    expect(normalizeBank('nope')).toEqual([]);
    expect(normalizeBank({})).toEqual([]);
    expect(normalizeBank([])).toEqual([]);
  });

  it('trim 纪律：word/pos/meaning/uk 全字段 trim', () => {
    const bank = normalizeBank([['  delta  ', ' n. ', ' 第四 ', ' del ']]);
    expect(bank[0]).toEqual({ word: 'delta', pos: 'n.', meaning: '第四', uk: 'del' });
  });
});

// ==================== ④ i18n 双语（#154 验收③：界面语言可切换且持久化） ====================

describe('#154 WD_I18N：zh/en 键集平价与模板纪律', () => {
  it('两语言键集恒等（平价锚：缺键即 UI 文案漂移）', () => {
    expect(Object.keys(WD_I18N.zh).sort()).toEqual(Object.keys(WD_I18N.en).sort());
  });

  it('全键值非空字符串', () => {
    for (const lang of ['zh', 'en']) {
      for (const [k, v] of Object.entries(WD_I18N[lang])) {
        expect(typeof v).toBe('string');
        expect(v.length).toBeGreaterThan(0);
      }
    }
  });

  it('模板占位符两语言同构（{x} 槽位一一对应，防渲染缺参）', () => {
    for (const k of ['statsQueue', 'statsLearned', 'doneSub']) {
      const zhSlots = String(WD_I18N.zh[k]).match(/\{(\w+)\}/g) || [];
      const enSlots = String(WD_I18N.en[k]).match(/\{(\w+)\}/g) || [];
      expect(enSlots).toEqual(zhSlots);
    }
  });

  it('UI 双持久化键在位：界面语言 word_ui_lang_v1 + 激活词书 word_book_v1', () => {
    expect(page).toContain("'word_ui_lang_v1'");
    expect(page).toContain("'word_book_v1'");
    expect(page).toMatch(/uiLang = uiLang === 'zh' \? 'en' : 'zh'/); // 切换语义
  });
});

// ==================== ⑤ 分册数据文件锚（#154 验收①②：词书落库 + 断网可用） ====================

describe('#154 分册数据文件：CET-6 + 考研真实落库（仓库内静态 JSON，断网可用）', () => {
  const files = readdirSync(booksDir).filter((f) => f.endsWith('.json'));
  const bookData = {};
  for (const f of files) {
    bookData[f.replace(/\.json$/, '')] = JSON.parse(readFileSync(join(booksDir, f), 'utf8'));
  }

  it('恰两册懒加载 JSON：cet6 + kaoyan（#154 建议方向采纳）', () => {
    expect(files.sort()).toEqual(['cet6.json', 'kaoyan.json']);
  });

  it('元数据纪律：id 与文件名一致 + label/name/source 在位（数据溯源）', () => {
    for (const [id, data] of Object.entries(bookData)) {
      expect(data.id).toBe(id);
      expect(data.label).toBeTruthy();
      expect(data.name.zh).toBeTruthy();
      expect(data.name.en).toBeTruthy();
      expect(data.source).toContain('KyleBing/english-vocabulary'); // 词表溯源
      expect(data.source).toContain('ECDICT'); // 音标溯源
    }
  });

  it('词量锚：CET-6 3992 词 + 考研 5057 词（去重后实数，#154 ≥2 册达标）', () => {
    expect(bookData.cet6.words.length).toBe(3992);
    expect(bookData.kaoyan.words.length).toBe(5057);
  });

  it('词条完整性：全词条 word 非空 + 全库无重复 + meaning 零缺失', () => {
    for (const [id, data] of Object.entries(bookData)) {
      const seen = new Set();
      for (const row of data.words) {
        expect(row.length).toBeGreaterThanOrEqual(3);
        const w = row[0];
        expect(typeof w).toBe('string');
        expect(w.length).toBeGreaterThan(0);
        expect(seen.has(w)).toBe(false); // 主键去重
        seen.add(w);
        expect(String(row[2]).length).toBeGreaterThan(0); // meaning 零缺失
      }
      expect(seen.size).toBe(data.words.length);
      void id;
    }
  });

  it('音标覆盖 ≥95% + 形态纪律（≤40 字符、无空格残缺串）', () => {
    for (const data of Object.values(bookData)) {
      const withUk = data.words.filter((row) => row[3] && String(row[3]).length > 0);
      expect(withUk.length / data.words.length).toBeGreaterThanOrEqual(0.95);
      for (const row of withUk) {
        expect(String(row[3]).length).toBeLessThanOrEqual(40);
        expect(String(row[3])).not.toMatch(/\s/);
      }
    }
  });

  it('学习序保真：分册保持源词表（乱序）顺序，不重排（乱序即学习法本身）', () => {
    // KyleBing 乱序表首词实证（CET-6 首词 consistent / 考研首词 revolt）
    expect(bookData.cet6.words[0][0]).toBe('consistent');
    expect(bookData.kaoyan.words[0][0]).toBe('revolt');
  });

  it('断网全功能不回退：分册 JSON 不进 SW 预缓存排除清单（离线首装即可用）', () => {
    // PRECACHE_EXCLUDE 仅收联机期资源（mqtt.min.js 先例）；词书必须离线可载
    expect(viteCfg).toContain('PRECACHE_EXCLUDE');
    expect(viteCfg).not.toMatch(/PRECACHE_EXCLUDE[^;]*books\//);
    expect(page).toContain("fetch('books/'"); // 懒加载走同源相对路径（dist 内静态文件）
  });
});

// ==================== ⑥ 源码锚：切换链与降级防御 ====================

describe('#154 源码锚：词书切换链 + 载入失败降级', () => {
  it('三册切换按钮 + 激活态 + 防连点禁用', () => {
    expect(page).toMatch(/data-book="cet4"/);
    expect(page).toMatch(/data-book="cet6"/);
    expect(page).toMatch(/data-book="kaoyan"/);
    expect(page).toMatch(/el\.classList\.toggle\('on', b === id\)/);
    expect(page).toMatch(/el\.disabled = !!loading/);
  });

  it('载入失败降级：提示可重试，绝不清空当前会话状态', () => {
    expect(page).toMatch(/catch\(function \(\) \{/);
    expect(page).toContain("elStats.innerHTML = L().loadFail");
    expect(page).not.toMatch(/catch[^}]*armBook\(\[\]\)/); // 失败不换库
  });

  it('懒加载期间切走不回渲染（竞态防御）', () => {
    expect(page).toMatch(/if \(activeBook !== id\) return; \/\/ 载入期间用户已切走/);
  });

  it('词书缓存：bookCache 首载后切换零延迟 + cet4 内置零网络预热', () => {
    expect(page).toMatch(/var bookCache = \{ cet4: core\.WORD_BANK \}/);
    expect(page).toMatch(/if \(bookCache\[id\]\) \{ armBook\(bookCache\[id\]\); return; \}/);
  });
});
