// ==================== v121-lyricmaker.test.js — #121 歌词制作器一期 v9.10 ====================
//
// 覆盖（#121 验收原文逐条：LRC 时间轴编辑 + 逐字对齐 + 导出）：
//   · parseTime/fmtTime —— "mm:ss.xx"（兼容 .xxx）↔ 毫秒，非法防御
//   · parseLrc —— 一行多时间标签 / [ti:ar:al:by:offset:] 元标签 / 未定时行沉底 / offset 提前语义
//   · serializeLrc —— 往返一致性 + meta 头 + 未定时行附尾
//   · splitWords —— 码点均分（astral 不劈裂）+ 最小步长 80ms（工程自定留痕）
//   · clampMark —— 打点单调化（快打防乱序）
//   · karaokeAt —— 行区间归属 / 开唱前 / 末行 4s 兜底 / 逐字高亮进度
//   · exportJson —— md3-lyric v1（#52 消费契约）
//   · 注册链：apps-data 聚合 49 项 / 包装器 / 终端映射 / 图标在册 / 版本真源

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CORE_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/lyricmaker/core.js'), 'utf-8');
const UI_SRC = readFileSync(join(ROOT, 'ios-desktop/apps/lyricmaker/index.html'), 'utf-8');

// ---------- 沙箱提取（经典脚本 IIFE → window.__lyricCore，v122/v123/v124 同范式） ----------
const ctx = { window: {} };
new Function('window', CORE_SRC)(ctx.window);
const core = ctx.window.__lyricCore;

describe('v9.10 #121 core：时间解析与格式化', () => {
  it('parseTime 全形态：2 位百分秒 / 3 位毫秒 / 无小数 / 非法 null', () => {
    expect(core.parseTime('01:23.45')).toBe(83450);
    expect(core.parseTime('1:23.456')).toBe(83456);
    expect(core.parseTime('1:23')).toBe(83000);
    expect(core.parseTime('00:00.00')).toBe(0);
    expect(core.parseTime('01:75')).toBe(null);   // 秒 >59 非法
    expect(core.parseTime('abc')).toBe(null);
    expect(core.parseTime(null)).toBe(null);
  });
  it('fmtTime：补零 / 百分秒截断 / 负值钳 0 / 与 parseTime 往返一致', () => {
    expect(core.fmtTime(83450)).toBe('01:23.45');
    expect(core.fmtTime(60000)).toBe('01:00.00');
    expect(core.fmtTime(-5)).toBe('00:00.00');
    for (const ms of [0, 1250, 61234, 754321]) {
      expect(core.parseTime(core.fmtTime(ms))).toBe(Math.floor(ms / 10) * 10);
    }
  });
});

describe('v9.10 #121 core：parseLrc 解析语义', () => {
  it('行级解析 + 一行多时间标签展开 + 稳定升序', () => {
    const rows = core.parseLrc('[00:20.00]副歌\n[00:10.00]主歌');
    expect(rows.map((r) => r.time)).toEqual([10000, 20000]);
    expect(rows.map((r) => r.text)).toEqual(['主歌', '副歌']);
    const multi = core.parseLrc('[00:30]合[00:12]合');
    expect(multi.length).toBe(2);
    expect(multi[0].time).toBe(12000);
    expect(multi[1].time).toBe(30000);
  });
  it('元标签消费：[ti:] 不入行；[offset:500] 整体提前 500ms（LRC 社区惯例）且钳 0', () => {
    const rows = core.parseLrc('[ti:星轨]\n[offset:500]\n[00:10.00]句一\n[00:00.20]句二');
    expect(rows.every((r) => !/星轨/.test(r.text))).toBe(true);
    expect(rows.map((r) => r.time)).toEqual([0, 9500]); // 200-500 钳 0；10000-500=9500
  });
  it('未定时行保留（time=null）并沉底保持原序；空文本防御', () => {
    const rows = core.parseLrc('自由句\n[00:05]定时句\n另一句');
    expect(rows[0]).toEqual({ time: 5000, text: '定时句' });
    expect(rows[1]).toEqual({ time: null, text: '自由句' });
    expect(rows[2]).toEqual({ time: null, text: '另一句' });
    expect(core.parseLrc('')).toEqual([]);
    expect(core.parseLrc(null)).toEqual([]);
  });
});

describe('v9.10 #121 core：serializeLrc / exportJson 导出', () => {
  it('parse → serialize → parse 往返一致；[ti:] 元标签头在册', () => {
    const src = '[00:20]B句\n[00:10]A句\n[00:30]C句';
    const out = core.serializeLrc(core.parseLrc(src), { ti: '星轨', ar: 'md3' });
    expect(out.split('\n')[0]).toBe('[ti:星轨]');
    expect(out).toContain('[ar:md3]');
    const back = core.parseLrc(out);
    expect(back.map((r) => [r.time, r.text])).toEqual([[10000, 'A句'], [20000, 'B句'], [30000, 'C句']]);
  });
  it('未定时行按原序附尾（不丢内容）', () => {
    const out = core.serializeLrc([
      { time: null, text: '尾巴一' }, { time: 5000, text: '定时' }, { time: null, text: '尾巴二' },
    ]);
    expect(out.split('\n')).toEqual(['[00:05.00]定时', '尾巴一', '尾巴二']);
  });
  it('exportJson：md3-lyric v1 契约（#52 消费端）+ 逐字缺省均分补齐 + 字时间递增', () => {
    const lines = core.parseLrc('[00:10]一二三四五\n[00:20]你好');
    const json = JSON.parse(core.exportJson(lines, { ti: '星轨' }));
    expect(json.format).toBe('md3-lyric');
    expect(json.version).toBe(1);
    expect(json.meta.ti).toBe('星轨');
    expect(json.lines.length).toBe(2);
    expect(json.lines[0].words.length).toBe(5);
    for (let i = 1; i < 5; i++) expect(json.lines[0].words[i].t).toBeGreaterThan(json.lines[0].words[i - 1].t);
    expect(json.lines[0].words.map((w) => w.w).join('')).toBe('一二三四五');
  });
});

describe('v9.10 #121 core：逐字对齐 / 打点单调化 / 卡拉OK定位', () => {
  it('splitWords 码点均分：astral 𠮷 不劈裂；最小步长 80ms（工程自定）', () => {
    const ws = core.splitWords('𠮷ab', 1000, 4000);
    expect(ws.map((w) => w.w)).toEqual(['𠮷', 'a', 'b']);
    expect(ws[0].t).toBe(1000);
    expect(ws[2].t).toBeGreaterThan(ws[1].t);
    const short = core.splitWords('ab', 0, 40); // span 40 < 2×80 → 步长钳 80ms
    expect(short[1].t).toBe(80);
    expect(core.splitWords('', 0, 1000)).toEqual([]);
  });
  it('clampMark 打点单调化：快打钳 prev+1，负值钳 0', () => {
    expect(core.clampMark(3000, 5000)).toBe(5001);
    expect(core.clampMark(8000, 5000)).toBe(8000);
    expect(core.clampMark(-1, null)).toBe(0);
    expect(core.clampMark(250.6, null)).toBe(251);
  });
  it('karaokeAt 行区间归属 + 开唱前 idx0 + 逐字半程进度', () => {
    const lines = core.parseLrc('[00:10]一二三四五\n[00:20]你好吗');
    const mid = core.karaokeAt(lines, 13000); // 行 0 区间 [10s,20s) 内 3s/10s
    expect(mid.idx).toBe(0);
    expect(mid.line.text).toBe('一二三四五');
    expect(mid.wordIdx).toBe(1); // 3s 处第 1 字(1s-2s)已完、第 2 字进行中
    expect(mid.wordProgress).toBeGreaterThan(0);
    expect(mid.lineProgress).toBeCloseTo(0.3, 5);
    const before = core.karaokeAt(lines, 1000);
    expect(before.idx).toBe(0);
    expect(before.wordProgress).toBe(0);
    const last = core.karaokeAt(lines, 23000); // 末行兜底 4s：[20s,24s)
    expect(last.idx).toBe(1);
    expect(last.wordIdx).toBe(2); // 「你好吗」第 3 字
    expect(core.karaokeAt([], 1000).idx).toBe(-1);
  });
});

describe('v9.10 #121 DEMO 与 UI 面', () => {
  it('内置演示歌词：6 行预打轴、时间严格递增、文本非空', () => {
    expect(core.DEMO.lines.length).toBe(6);
    for (let i = 0; i < 6; i++) {
      expect(core.DEMO.lines[i].text.length).toBeGreaterThan(3);
      if (i) expect(core.DEMO.lines[i].time).toBeGreaterThan(core.DEMO.lines[i - 1].time);
    }
  });
  it('UI 面：音源/歌词源/打点/列表/卡拉OK预览/导出/草稿/桥/核 在册', () => {
    for (const id of ['id="audioFile"', 'id="simBtn"', 'id="src"', 'id="loadBtn"', 'id="demoBtn"',
      'id="markBtn"', 'id="remarkBtn"', 'id="wordsBtn"', 'id="list"', 'id="karaoke"',
      'id="dlLrc"', 'id="dlJson"', 'id="cpLrc"', 'id="toast"', '__lyricMakerUI',
      'lyricmaker.draft.v1', '__lyricCore', "code === 'Space'", 'code === \'KeyP\'']) {
      expect(UI_SRC).toContain(id);
    }
    expect(UI_SRC).toContain('md3-tokens.css');
    expect(UI_SRC).toContain('freeze-shim.js');
  });
});

describe('v9.10 #121 注册链与版本真源', () => {
  it('注册链：apps-data 聚合 49 项 + 包装器 + 终端映射 + 图标在册', () => {
    // v123 同范式：apps-data 聚合断言走源码读取（裸动态 import 会踩
    // state.js↔apps-data.js 初始化环，见 v861「boot 先于模块 import」教训）
    const appsDataSrc = readFileSync(join(ROOT, 'ios-desktop/js/apps-data.js'), 'utf-8');
    const importCount = (appsDataSrc.match(/from '\.\/apps\/[\w-]+\.js'/g) || []).length;
    expect(importCount).toBe(49);
    expect(appsDataSrc).toContain("import lyricmaker from './apps/lyricmaker.js'");
    expect(appsDataSrc).toContain('typing, lyricmaker,');

    expect(existsSync(join(ROOT, 'ios-desktop/apps/lyricmaker/index.html'))).toBe(true);
    expect(existsSync(join(ROOT, 'ios-desktop/apps/lyricmaker/core.js'))).toBe(true);
    expect(existsSync(join(ROOT, 'ios-desktop/js/apps/lyricmaker.js'))).toBe(true);

    const wrapper = readFileSync(join(ROOT, 'ios-desktop/js/apps/lyricmaker.js'), 'utf-8');
    expect(wrapper).toContain("id: 'lyricmaker'");
    expect(wrapper).toContain('iframeAppContent');

    const terminal = readFileSync(join(ROOT, 'ios-desktop/js/terminal-core.js'), 'utf-8');
    expect(terminal).toContain('歌词制作');
    expect(terminal).toContain("['lyricmaker', '歌词制作', 'lyricmaker', '歌词', 'LRC', '打轴']");

    const icons = readFileSync(join(ROOT, 'ios-desktop/js/app-icons.js'), 'utf-8');
    expect(icons).toContain('lyricmaker: `<svg');
  });
  it('版本真源与 README 同步（v150 同口径）', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    expect(pkg.version).toBe('9.10.0'); // v9.10 #121
    const readme = readFileSync(join(ROOT, 'README.md'), 'utf-8');
    expect(readme).toContain('49');
    expect(readme).toContain('v9.10');
  });
});
