// ==================== v173-word-karaoke.test.js — #173 逐字跟随歌词 v10.64 ====================
//
// 覆盖（#173 主路线：渲染层零模型零网络，移植 retro-music-player lyrics.js 词级三件套）：
//   · parseEnhancedLrc —— 行内 <mm:ss.xx> 词级标签剥离为每字起始时戳 words[{w,t}]
//     （引导段=行时间 / tag 段内均分 / 末段无下界共享起始 / 乱序钳制 / offset 行与字同步平移）
//   · estimateWords —— 无词级标签时按字数均分估算（retro 同名同语义：纯均分无最小步长，
//     与 splitWords 打轴端 80ms 下限的差异锚定）
//   · karaokeAt 词级协作回归（words 存在时直用，v9.10 行为锚不破）
//   · music 渲染端接线 —— renderLyrics 逐字 span 化 / updateLyricsHighlight 行内扫描 /
//     .wkw/.lw/.sung CSS / 打轴存入与 VFS pairing parseEnhancedLrc 双链路 /
//     行级语义零回归（active 切换 / 点击跳转 / 静态行回落）
//   · 裁剪留痕：alignSyllables（MIDI 对齐）不移植——md3 无 MIDI 数据源（注释锚）

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/music/lyric-core.js'), 'utf-8');
const MUSIC_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/music/index.html'), 'utf-8');

// ---------- 沙箱提取（经典脚本 IIFE → window.__lyricCore，v122/v123/v124/v180 同范式） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__lyricCore;

describe('v10.64 #173 parseEnhancedLrc：词级标签解析（retro lyrics.js L46 对应）', () => {
  it('逐字标注行：每字自带 <tag> → words 精确时戳，text 剥标签', () => {
    const rows = core.parseEnhancedLrc('[00:10.00]<00:10.00>这<00:10.20>是<00:10.80>词<00:11.00>级');
    expect(rows.length).toBe(1);
    expect(rows[0].time).toBe(10000);
    expect(rows[0].text).toBe('这是词级');
    expect(rows[0].words.map(w => w.w)).toEqual(['这', '是', '词', '级']);
    expect(rows[0].words.map(w => w.t)).toEqual([10000, 10200, 10800, 11000]);
  });
  it('引导段起始=行时间；词级段（下界已知）段内均分', () => {
    // 引导段 '春' 起始=行时间 20000、止=首 tag 20500；'风' 起 20500；末段 '起' 两字无下界共享 21000
    const rows = core.parseEnhancedLrc('[00:20.00]春<00:20.50>风<00:21.00>起');
    const w = rows[0].words;
    expect(w.map(x => x.w)).toEqual(['春', '风', '起']);
    expect(w[0].t).toBe(20000);
    expect(w[1].t).toBe(20500);
    expect(w[2].t).toBe(21000);
  });
  it('末段多字共享段起始（无下界忠实反映稀疏标注，karaokeAt 行区间兜底推进）', () => {
    const rows = core.parseEnhancedLrc('[00:30.00]<00:30.50>晚安');
    const w = rows[0].words;
    expect(w.map(x => x.w)).toEqual(['晚', '安']);
    expect(w.every(x => x.t === 30500)).toBe(true);
    expect(rows[0].text).toBe('晚安');
  });
  it('乱序防御：word.t 早于行时间钳行时间；钳后与前字同刻退化忠实（宽零区间 karaokeAt 安全）', () => {
    const rows = core.parseEnhancedLrc('[00:10.00]甲<00:09.00>乙<00:10.00>丙');
    const w = rows[0].words;
    expect(w[0].t).toBe(10000);            // 行时间
    expect(w[1].t).toBe(10000);            // 09.00 早于行时间 → 钳 max(前值+1, 行时间)=10000
    expect(w[2].t).toBe(10000);            // 丙 tag 10000 ≥ 乙原始 9000+1，不乱序 → 忠实保留 10000（与乙同刻退化）
  });
  it('[offset:500] 行时间与 words 同步平移且钳 0（同一参照系，无双重平移）', () => {
    const rows = core.parseEnhancedLrc('[offset:500]\n[00:10.00]<00:10.20>字');
    expect(rows[0].time).toBe(9500);
    expect(rows[0].words[0].t).toBe(9700);  // 10200-500
    const clamp = core.parseEnhancedLrc('[offset:20000]\n[00:10.00]<00:10.20>字');
    expect(clamp[0].time).toBe(0);
    expect(clamp[0].words[0].t).toBe(0);
  });
  it('纯行级 LRC 同构兼容：words=[]、行序/文本与 parseLrc 一致（渲染端 estimateWords 兜底）', () => {
    const src = '[ti:星轨]\n[00:20.00]副歌\n[00:10.00]主歌\n自由句';
    const enh = core.parseEnhancedLrc(src);
    const plain = core.parseLrc(src);
    expect(enh.map(r => [r.time, r.text])).toEqual(plain.map(r => [r.time, r.text]));
    expect(enh.every(r => Array.isArray(r.words) && r.words.length === 0)).toBe(true);
  });
  it('未定时行沉底 words=[]；一行多时间标签展开各自携带 words', () => {
    const rows = core.parseEnhancedLrc('自由句\n[00:05]<00:05.10>定\n[00:30]合[00:12]合');
    expect(rows[3].time).toBe(null);        // timed 3 行升序在前，untimed 沉底为 rows[3]
    expect(rows[3].words).toEqual([]);
    expect(rows[0].words.map(w => w.w)).toEqual(['定']);
    expect(rows[0].words[0].t).toBe(5100);
    const dups = rows.filter(r => r.text === '合合');   // 一行多标签 = 同一文本展开两次（LRC 语义）
    expect(dups.length).toBe(2);
    expect(dups.every(r => r.words.length === 0)).toBe(true);
  });
});

describe('v10.64 #173 estimateWords：均分估算（retro lyrics.js L105 对应）', () => {
  it('纯均分无最小步长：10 字 200ms → 每字 20ms（与 splitWords 80ms 下限的差异锚定）', () => {
    const w = core.estimateWords('一二三四五六七八九十', 10000, 10200);
    expect(w.length).toBe(10);
    expect(w[0].t).toBe(10000);
    expect(w[1].t).toBe(10020);
    expect(w[9].t).toBe(10180);
  });
  it('单字行退化自身起始；空文本空数组；endMs 缺省 span=0 全部共享起点', () => {
    expect(core.estimateWords('字', 5000, 6000)[0]).toEqual({ w: '字', t: 5000 });
    expect(core.estimateWords('', 0, 1000)).toEqual([]);
    const flat = core.estimateWords('双字', 3000, null);
    expect(flat.every(x => x.t === 3000)).toBe(true);
  });
  it('与 splitWords 并存互不覆盖：splitWords 80ms 下限行为保持（打轴端回归锚）', () => {
    const sw = core.splitWords('一二三四五六七八九十', 10000, 10200);
    expect(sw[1].t).toBe(10080);   // max(20, 80)=80ms 步长（打轴端语义不回归）
    expect(core.estimateWords('一二三四五六七八九十', 10000, 10200)[1].t).toBe(10020);
  });
});

describe('v10.64 #173 karaokeAt 词级协作回归（v9.10 行为锚）', () => {
  it('行带 words 时直用不再均分：词级进度按真实时戳推进', () => {
    const lines = [{ time: 10000, text: '这是词级', words: [
      { w: '这', t: 10000 }, { w: '是', t: 10200 }, { w: '词', t: 10800 }, { w: '级', t: 11000 }
    ] }];
    const k = core.karaokeAt(lines, 10900);
    expect(k.idx).toBe(0);
    expect(k.wordIdx).toBe(2);   // '词'（10800 起）进行中
    expect(k.wordProgress).toBeCloseTo(0.5, 5);  // (10900-10800)/(11000-10800)
  });
  it('行无 words 时行区间均分（缺省路径不回归）：两字行中点 → 第 1 字进行中', () => {
    const k = core.karaokeAt([{ time: 10000, text: '四字' }], 10500);
    expect(k.idx).toBe(0);
    expect(k.wordIdx).toBe(0);
    expect(k.wordProgress).toBeCloseTo(0.25, 5);  // splitWords 80ms 下限：步长 2000ms，(10500-10000)/2000
  });
});

describe('v10.64 #173 music 渲染端接线（消费端闭环）', () => {
  it('renderLyrics 逐字 span 化：词级 words 优先 / 缺省 estimateWords 行区间均分归一秒 / .wkw + .lw + dataset.t（秒，钳可听时长）', () => {
    expect(MUSIC_SRC).toMatch(/const nextT = \(i \+ 1 < lyrics\.length && lyrics\[i \+ 1\]\.t >= 0\) \? lyrics\[i \+ 1\]\.t : \(dur \|\| t \+ 4\);/);
    expect(MUSIC_SRC).toMatch(/const nt = dur \? Math\.min\(nextT, dur\) : nextT;/);
    expect(MUSIC_SRC).toMatch(/: core\.estimateWords\(l\.text, Math\.round\(t \* 1000\), Math\.round\(nt \* 1000\)\)\.map\(w => \(\{ w: w\.w, t: w\.t \/ 1000 \}\)\);/);
    expect(MUSIC_SRC).toMatch(/li\.classList\.add\('wkw'\);/);
    expect(MUSIC_SRC).toMatch(/sp\.className = 'lw';/);
    expect(MUSIC_SRC).toMatch(/sp\.dataset\.t = String\(wd\.t\);/);
  });
  it('updateLyricsHighlight 行内逐字扫描：换行清旧行已唱态 + .sung toggle 幂等（seek 回退安全）', () => {
    expect(MUSIC_SRC).toMatch(/if \(li !== this\._lyricWordLine\) \{/);
    expect(MUSIC_SRC).toMatch(/querySelectorAll\('\.lw\.sung'\)\.forEach\(s => s\.classList\.remove\('sung'\)\);/);
    expect(MUSIC_SRC).toMatch(/classList\.toggle\('sung', now >= \(parseFloat\(sp\.dataset\.t\) \|\| 0\)\);/);
    expect(MUSIC_SRC).toMatch(/this\._lyricWordLine = null;/);
  });
  it('CSS：span 化行行级色让位 + 已唱主色 + transition 平滑', () => {
    expect(MUSIC_SRC).toMatch(/#lyricsList li\.wkw\.active \{ color: var\(--c-ink-2\); \}/);
    expect(MUSIC_SRC).toMatch(/#lyricsList li\.wkw \.lw \{ transition: color \.16s ease; \}/);
    expect(MUSIC_SRC).toMatch(/#lyricsList li\.wkw\.active \.lw\.sung \{ color: var\(--c-primary\); \}/);
  });
  it('三链路 parseEnhancedLrc 接线：打轴存入曲库 + VFS pairing + 包内/内嵌同步歌词（words 毫秒→秒 map 统一）', () => {
    expect(MUSIC_SRC).toMatch(/core\.parseEnhancedLrc\(text\)\.map\(\(l\) => \(\{/);
    expect(MUSIC_SRC).toMatch(/window\.__lyricCore\.parseEnhancedLrc\(lrcRec\)/);
    expect(MUSIC_SRC).toMatch(/window\.__lyricCore\.parseEnhancedLrc\(lrcText \|\| embedded\)/);   // v10.64 四链路统一：media-meta 剥标签丢词级的缺口补齐
    expect(MUSIC_SRC.match(/l\.words\.map\(w => \(\{ w: w\.w, t: w\.t \/ 1000 \}\)\)/g).length).toBe(3);
  });
  it('行级语义零回归：active 切换 / 点击跳转 / 静态行整行文本回落（无核或无文本不 span 化）', () => {
    expect(MUSIC_SRC).toMatch(/li\.onclick = \(\) => \{ this\.audio\.currentTime = t; if \(this\.audio\.paused\) this\.togglePlay\(\); \};/);
    expect(MUSIC_SRC).toMatch(/li\.textContent = l\.text;/);
    expect(MUSIC_SRC).toMatch(/if \(core && l\.text\) \{/);
    expect(MUSIC_SRC).toMatch(/updateLyricsHighlight\(true\);/);   // 渲染末强制刷新一次（v7.61 语义）
  });
});

describe('v10.64 #173 归属与裁剪留痕', () => {
  it('alignSyllables（MIDI 对齐）诚实裁剪注释在录——md3 无 MIDI 数据源', () => {
    expect(CORE_SRC).toMatch(/#173 裁剪留痕：retro lyrics\.js 第三件 alignSyllables/);
    expect(CORE_SRC).not.toMatch(/function alignSyllables/);
  });
  it('导出面：parseEnhancedLrc / estimateWords 双挂载且既有导出面全量保留（v9.10/v9.13 契约）', () => {
    for (const k of ['parseTime', 'fmtTime', 'parseLrc', 'parseEnhancedLrc', 'estimateWords',
      'serializeLrc', 'splitWords', 'clampMark', 'karaokeAt', 'exportJson', 'DEMO']) {
      expect(core[k]).toBeDefined();
    }
  });
  it('版本真源 10.64.0（package.json）', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    expect(pkg.version).toBe('10.64.0');
  });
});
